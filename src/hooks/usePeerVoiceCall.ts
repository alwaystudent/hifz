import { useState, useRef, useCallback, useEffect } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { PeerParticipant, RiwayahId, RoomPassageState } from '../types/quran';

export type CallConnectionState =
  | 'idle'
  | 'connecting'
  | 'waiting_peer'
  | 'connected'
  | 'room_full'
  | 'error';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

const PEER_PREFIX = 'ratel-tasmee-room-';

function generatePeerId(): string {
  return `peer_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function generateClientRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function hasDedicatedWsBackend(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('/api/health', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return false;
    const data = await res.json();
    return Boolean(data?.ok === true && data?.service === 'ratel-tasmee');
  } catch {
    return false;
  }
}

export interface UsePeerVoiceCallOptions {
  initialPassage: RoomPassageState;
  onRemotePassageUpdate?: (passage: RoomPassageState) => void;
}

export function usePeerVoiceCall({
  initialPassage,
  onRemotePassageUpdate,
}: UsePeerVoiceCallOptions) {
  const [roomId, setRoomId] = useState<string>('');
  const [localPeerId] = useState<string>(() => generatePeerId());
  const [peers, setPeers] = useState<PeerParticipant[]>([]);
  const [reciterPeerId, setReciterPeerId] = useState<string | null>(null);
  const [focusedWordId, setFocusedWordId] = useState<string | null>(null);
  const [focusedAyahNumber, setFocusedAyahNumber] = useState<number | null>(null);
  const [passage, setPassage] = useState<RoomPassageState>(initialPassage);
  const [callState, setCallState] = useState<CallConnectionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Signaling mode: 'ws' when dedicated Node WS server is present, 'p2p' (PeerJS) on Vercel/serverless/static
  const transportModeRef = useRef<'ws' | 'p2p' | null>(null);

  // WS + Native WebRTC refs
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // PeerJS serverless refs
  const peerJsRef = useRef<Peer | null>(null);
  const p2pDataConnRef = useRef<DataConnection | null>(null);
  const p2pMediaCallRef = useRef<MediaConnection | null>(null);
  const isP2PHostRef = useRef<boolean>(false);
  const p2pTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shared Audio & Latest State Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const onRemotePassageUpdateRef = useRef(onRemotePassageUpdate);
  onRemotePassageUpdateRef.current = onRemotePassageUpdate;

  const passageRef = useRef(passage);
  passageRef.current = passage;
  const peersRef = useRef(peers);
  peersRef.current = peers;
  const reciterPeerIdRef = useRef(reciterPeerId);
  reciterPeerIdRef.current = reciterPeerId;
  const focusedWordIdRef = useRef(focusedWordId);
  focusedWordIdRef.current = focusedWordId;
  const focusedAyahNumberRef = useRef(focusedAyahNumber);
  focusedAyahNumberRef.current = focusedAyahNumber;
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  const stopAudioMeters = useCallback(() => {
    if (meterIntervalRef.current) {
      clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setLocalAudioLevel(0);
    setRemoteAudioLevel(0);
  }, []);

  const cleanupPeerConnection = useCallback(() => {
    pendingCandidatesRef.current = [];
    if (pcRef.current) {
      try {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }
    if (p2pMediaCallRef.current) {
      try {
        p2pMediaCallRef.current.close();
      } catch {
        // ignore
      }
      p2pMediaCallRef.current = null;
    }
    setRemoteStream(null);
  }, []);

  const cleanupAll = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (p2pTimeoutRef.current) {
      clearTimeout(p2pTimeoutRef.current);
      p2pTimeoutRef.current = null;
    }
    stopAudioMeters();
    cleanupPeerConnection();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    if (p2pDataConnRef.current) {
      try {
        p2pDataConnRef.current.close();
      } catch {
        // ignore
      }
      p2pDataConnRef.current = null;
    }
    if (peerJsRef.current) {
      try {
        peerJsRef.current.destroy();
      } catch {
        // ignore
      }
      peerJsRef.current = null;
    }
    isP2PHostRef.current = false;
    transportModeRef.current = null;
  }, [cleanupPeerConnection, stopAudioMeters]);

  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  const sendSignal = useCallback((payload: Record<string, unknown>) => {
    if (transportModeRef.current === 'p2p') {
      if (p2pDataConnRef.current && p2pDataConnRef.current.open) {
        p2pDataConnRef.current.send(payload);
      }
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const startVoiceMeters = useCallback(
    (localStr: MediaStream | null, remoteStr: MediaStream | null) => {
      stopAudioMeters();
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      try {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const setupAnalyser = (stream: MediaStream | null) => {
          if (!stream || stream.getAudioTracks().length === 0) return null;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          return analyser;
        };

        const localAnalyser = setupAnalyser(localStr);
        const remoteAnalyser = setupAnalyser(remoteStr);
        const buf = new Uint8Array(128);

        const computeLevel = (analyser: AnalyserNode | null) => {
          if (!analyser) return 0;
          analyser.getByteFrequencyData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i];
          return Math.min(100, Math.round((sum / buf.length) * 1.4));
        };

        meterIntervalRef.current = setInterval(() => {
          setLocalAudioLevel(isMutedRef.current ? 0 : computeLevel(localAnalyser));
          setRemoteAudioLevel(computeLevel(remoteAnalyser));
        }, 120);
      } catch {
        // AudioContext might require user gesture; ignore gracefully
      }
    },
    [stopAudioMeters]
  );

  const requestMicrophone = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMutedRef.current;
      });
      localStreamRef.current = stream;
      startVoiceMeters(stream, null);
      return stream;
    } catch {
      setErrorMessage('يرجى السماح بصلاحية الميكروفون لإجراء المكالمة الصوتية.');
      setCallState('error');
      return null;
    }
  }, [startVoiceMeters]);

  // ==========================================================
  // Native WebSocket + WebRTC Flow (Dedicated Node Server)
  // ==========================================================
  const createPeerConnection = useCallback(() => {
    cleanupPeerConnection();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        if (localStreamRef.current) {
          pc.addTrack(track, localStreamRef.current);
        }
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'webrtc:ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      const incoming = event.streams[0] || new MediaStream([event.track]);
      setRemoteStream(incoming);
      setCallState('connected');
      startVoiceMeters(localStreamRef.current, incoming);
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        setCallState('connected');
      } else if (st === 'failed' || st === 'disconnected') {
        setCallState((prev) => (prev === 'idle' ? 'idle' : 'waiting_peer'));
      }
    };

    pcRef.current = pc;
    return pc;
  }, [cleanupPeerConnection, sendSignal, startVoiceMeters]);

  const flushPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const queue = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch {
        // ignore stale ICE
      }
    }
  }, []);

  const initiateWebRTCOffer = useCallback(async () => {
    const pc = createPeerConnection();
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      sendSignal({
        type: 'webrtc:offer',
        sdp: pc.localDescription,
      });
    } catch {
      setErrorMessage('تعذر بدء الاتصال الصوتي مع الطرف الآخر.');
    }
  }, [createPeerConnection, sendSignal]);

  const joinViaWs = useCallback(
    async (
      cleanCode: string,
      displayName: string,
      initialRoomPassage?: RoomPassageState
    ) => {
      transportModeRef.current = 'ws';
      const stream = await requestMicrophone();
      if (!stream) return;

      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProto}//${window.location.host}/ws/tasmee`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'room:join',
            roomId: cleanCode,
            peerId: localPeerId,
            name: displayName.trim() || 'قارئ',
            isMuted: isMutedRef.current,
            initialPassage: initialRoomPassage || passageRef.current,
          })
        );

        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);
      };

      ws.onmessage = async (event) => {
        let msg: Record<string, any>;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (msg.type === 'room:full') {
          setCallState('room_full');
          setErrorMessage('الغرفة ممتلئة حالياً (الحد الأقصى شخصان للمكالمة).');
          cleanupAll();
          return;
        }

        if (msg.type === 'room:state') {
          const roomPeers: PeerParticipant[] = msg.peers || [];
          setPeers(roomPeers);
          setReciterPeerId(msg.reciterPeerId || null);
          setFocusedWordId(msg.focusedWordId || null);
          setFocusedAyahNumber(msg.focusedAyahNumber ?? null);
          if (msg.passage) {
            setPassage(msg.passage);
            onRemotePassageUpdateRef.current?.(msg.passage);
          }
          setCallState(roomPeers.length >= 2 ? 'connecting' : 'waiting_peer');
          return;
        }

        if (msg.type === 'peer:joined') {
          const updatedPeers: PeerParticipant[] = msg.peers || [];
          setPeers(updatedPeers);
          if (msg.reciterPeerId) setReciterPeerId(msg.reciterPeerId);
          await initiateWebRTCOffer();
          return;
        }

        if (msg.type === 'peer:left') {
          setPeers(msg.peers || []);
          setReciterPeerId(msg.reciterPeerId || null);
          cleanupPeerConnection();
          startVoiceMeters(localStreamRef.current, null);
          setCallState('waiting_peer');
          return;
        }

        if (msg.type === 'room:passage-updated' && msg.passage) {
          setPassage(msg.passage);
          setFocusedWordId(null);
          setFocusedAyahNumber(null);
          onRemotePassageUpdateRef.current?.(msg.passage);
          return;
        }

        if (msg.type === 'room:word-focused') {
          setFocusedWordId(msg.wordId || null);
          setFocusedAyahNumber(msg.ayahNumber ?? null);
          return;
        }

        if (msg.type === 'room:roles-updated') {
          setReciterPeerId(msg.reciterPeerId || null);
          return;
        }

        if (msg.type === 'peer:mute-updated') {
          setPeers((prev) =>
            prev.map((p) =>
              p.peerId === msg.peerId ? { ...p, isMuted: Boolean(msg.isMuted) } : p
            )
          );
          return;
        }

        if (msg.type === 'webrtc:offer' && msg.sdp) {
          const pc = createPeerConnection();
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            await flushPendingCandidates(pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal({
              type: 'webrtc:answer',
              sdp: pc.localDescription,
            });
          } catch {
            setErrorMessage('تعذر إتمام الربط الصوتي بين الطرفين.');
          }
          return;
        }

        if (msg.type === 'webrtc:answer' && msg.sdp && pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            await flushPendingCandidates(pcRef.current);
          } catch {
            // ignore duplicate answers
          }
          return;
        }

        if (msg.type === 'webrtc:ice-candidate' && msg.candidate) {
          if (pcRef.current && pcRef.current.remoteDescription) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch {
              // ignore invalid candidate
            }
          } else {
            pendingCandidatesRef.current.push(msg.candidate);
          }
        }
      };

      ws.onerror = () => {
        setErrorMessage('تعذر الاتصال بخادم الجلسات الصوتية.');
        setCallState('error');
      };

      ws.onclose = () => {
        setCallState((prev) => (prev === 'idle' || prev === 'room_full' ? prev : 'idle'));
      };
    },
    [
      cleanupAll,
      cleanupPeerConnection,
      createPeerConnection,
      flushPendingCandidates,
      initiateWebRTCOffer,
      localPeerId,
      requestMicrophone,
      sendSignal,
      startVoiceMeters,
    ]
  );

  // ==========================================================
  // PeerJS Serverless Signaling (Works on Vercel, Netlify, Static)
  // ==========================================================
  const handleP2PDataMessage = useCallback(
    (msg: Record<string, any>) => {
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'room:passage-updated' && msg.passage) {
        setPassage(msg.passage);
        setFocusedWordId(null);
        setFocusedAyahNumber(null);
        onRemotePassageUpdateRef.current?.(msg.passage);
        return;
      }

      if (msg.type === 'room:update-passage' && msg.passage) {
        const nextPassage: RoomPassageState = msg.passage;
        setPassage(nextPassage);
        setFocusedWordId(null);
        setFocusedAyahNumber(null);
        onRemotePassageUpdateRef.current?.(nextPassage);
        if (isP2PHostRef.current) {
          sendSignal({ type: 'room:passage-updated', passage: nextPassage });
        }
        return;
      }

      if (msg.type === 'room:word-focused' || msg.type === 'room:focus-word') {
        const wId = msg.wordId || null;
        const aNum = msg.ayahNumber ?? null;
        setFocusedWordId(wId);
        setFocusedAyahNumber(aNum);
        return;
      }

      if (msg.type === 'room:roles-updated' || msg.type === 'room:swap-roles') {
        const target = msg.reciterPeerId || null;
        setReciterPeerId(target);
        return;
      }

      if (msg.type === 'peer:mute-updated' || msg.type === 'peer:mute-state') {
        const targetPeerId = msg.peerId;
        const muted = Boolean(msg.isMuted);
        setPeers((prev) =>
          prev.map((p) => (p.peerId === targetPeerId ? { ...p, isMuted: muted } : p))
        );
      }
    },
    [sendSignal]
  );

  const attachMediaCall = useCallback(
    (call: MediaConnection) => {
      if (p2pMediaCallRef.current && p2pMediaCallRef.current !== call) {
        try {
          p2pMediaCallRef.current.close();
        } catch {
          // ignore
        }
      }
      p2pMediaCallRef.current = call;

      call.on('stream', (incomingStream) => {
        setRemoteStream(incomingStream);
        setCallState('connected');
        startVoiceMeters(localStreamRef.current, incomingStream);
      });

      call.on('close', () => {
        setRemoteStream(null);
        startVoiceMeters(localStreamRef.current, null);
        if (isP2PHostRef.current) {
          setCallState((prev) => (prev === 'idle' ? 'idle' : 'waiting_peer'));
        }
      });

      call.on('error', () => {
        if (isP2PHostRef.current) {
          setCallState((prev) => (prev === 'idle' ? 'idle' : 'waiting_peer'));
        }
      });
    },
    [startVoiceMeters]
  );

  const createRoomP2P = useCallback(
    async (
      displayName: string,
      initialRoomPassage: RoomPassageState,
      attempt = 0
    ): Promise<string | null> => {
      if (attempt === 0) {
        cleanupAll();
        setErrorMessage(null);
        setCallState('connecting');
        const stream = await requestMicrophone();
        if (!stream) return null;
      }

      transportModeRef.current = 'p2p';
      isP2PHostRef.current = true;

      const candidateCode = generateClientRoomCode();
      const hostPeerJsId = `${PEER_PREFIX}${candidateCode}`;
      const hostParticipant: PeerParticipant = {
        peerId: localPeerId,
        name: displayName.trim() || 'قارئ',
        isMuted: isMutedRef.current,
        joinedAt: Date.now(),
      };

      return new Promise((resolve) => {
        let settled = false;
        const peer = new Peer(hostPeerJsId, {
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          config: ICE_SERVERS,
          debug: 0,
        });
        peerJsRef.current = peer;

        peer.on('open', () => {
          if (settled) return;
          settled = true;
          setRoomId(candidateCode);
          setPassage(initialRoomPassage);
          setPeers([hostParticipant]);
          setReciterPeerId(localPeerId);
          setFocusedWordId(null);
          setFocusedAyahNumber(null);
          setCallState('waiting_peer');
          resolve(candidateCode);
        });

        peer.on('connection', (conn) => {
          conn.on('data', (raw: any) => {
            if (!raw || typeof raw !== 'object') return;

            if (raw.type === 'room:join') {
              // Enforce strict 2-person room capacity
              if (
                p2pDataConnRef.current &&
                p2pDataConnRef.current.open &&
                p2pDataConnRef.current.peer !== conn.peer
              ) {
                conn.send({ type: 'room:full' });
                setTimeout(() => {
                  try {
                    conn.close();
                  } catch {
                    // ignore
                  }
                }, 250);
                return;
              }

              p2pDataConnRef.current = conn;
              const guestParticipant: PeerParticipant = {
                peerId: String(raw.peerId || conn.peer),
                name: String(raw.name || 'الشريك').trim().slice(0, 40),
                isMuted: Boolean(raw.isMuted),
                joinedAt: Date.now(),
              };

              const updatedPeers = [hostParticipant, guestParticipant];
              setPeers(updatedPeers);
              const activeReciter = reciterPeerIdRef.current || localPeerId;
              setReciterPeerId(activeReciter);

              conn.send({
                type: 'room:state',
                roomId: candidateCode,
                passage: passageRef.current,
                reciterPeerId: activeReciter,
                focusedWordId: focusedWordIdRef.current,
                focusedAyahNumber: focusedAyahNumberRef.current,
                peers: updatedPeers,
              });

              if (localStreamRef.current) {
                const call = peer.call(conn.peer, localStreamRef.current);
                if (call) attachMediaCall(call);
              }
              return;
            }

            if (raw.type === 'peer:left') {
              if (p2pDataConnRef.current === conn) {
                p2pDataConnRef.current = null;
                cleanupPeerConnection();
                startVoiceMeters(localStreamRef.current, null);
                setPeers([hostParticipant]);
                setReciterPeerId(localPeerId);
                setCallState('waiting_peer');
              }
              return;
            }

            handleP2PDataMessage(raw);
          });

          conn.on('close', () => {
            if (p2pDataConnRef.current === conn) {
              p2pDataConnRef.current = null;
              cleanupPeerConnection();
              startVoiceMeters(localStreamRef.current, null);
              setPeers([hostParticipant]);
              setReciterPeerId(localPeerId);
              setCallState((prev) => (prev === 'idle' ? 'idle' : 'waiting_peer'));
            }
          });
        });

        // Safety fallback if guest initiates audio call directly
        peer.on('call', (incomingCall) => {
          if (
            p2pDataConnRef.current &&
            p2pDataConnRef.current.open &&
            p2pDataConnRef.current.peer !== incomingCall.peer
          ) {
            incomingCall.close();
            return;
          }
          if (localStreamRef.current) {
            incomingCall.answer(localStreamRef.current);
            attachMediaCall(incomingCall);
          }
        });

        peer.on('error', (err: any) => {
          if (!settled && err?.type === 'unavailable-id' && attempt < 3) {
            settled = true;
            try {
              peer.destroy();
            } catch {
              // ignore
            }
            createRoomP2P(displayName, initialRoomPassage, attempt + 1).then(resolve);
            return;
          }
          if (!settled) {
            settled = true;
            setErrorMessage('تعذر فتح غرفة الصوت عبر الشبكة. يرجى المحاولة مرة أخرى.');
            setCallState('error');
            resolve(null);
          }
        });
      });
    },
    [
      attachMediaCall,
      cleanupAll,
      cleanupPeerConnection,
      handleP2PDataMessage,
      localPeerId,
      requestMicrophone,
      startVoiceMeters,
    ]
  );

  const joinViaP2P = useCallback(
    async (cleanCode: string, displayName: string) => {
      cleanupAll();
      setErrorMessage(null);
      setCallState('connecting');
      setRoomId(cleanCode);

      const stream = await requestMicrophone();
      if (!stream) return;

      transportModeRef.current = 'p2p';
      isP2PHostRef.current = false;

      const guestPeerJsId = `${PEER_PREFIX}guest-${cleanCode}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const hostPeerJsId = `${PEER_PREFIX}${cleanCode}`;

      const peer = new Peer(guestPeerJsId, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        config: ICE_SERVERS,
        debug: 0,
      });
      peerJsRef.current = peer;

      p2pTimeoutRef.current = setTimeout(() => {
        if (!p2pDataConnRef.current || !p2pDataConnRef.current.open) {
          setErrorMessage('انتهت مهلة الاتصال بالغرفة. تأكد من صحة الرمز وأن المنشئ ما زال متصلاً.');
          setCallState('error');
          cleanupAll();
        }
      }, 12000);

      peer.on('call', (incomingCall) => {
        if (localStreamRef.current) {
          incomingCall.answer(localStreamRef.current);
          attachMediaCall(incomingCall);
        }
      });

      peer.on('open', () => {
        const conn = peer.connect(hostPeerJsId, { reliable: true });
        p2pDataConnRef.current = conn;

        conn.on('open', () => {
          if (p2pTimeoutRef.current) {
            clearTimeout(p2pTimeoutRef.current);
            p2pTimeoutRef.current = null;
          }
          conn.send({
            type: 'room:join',
            peerId: localPeerId,
            name: displayName.trim() || 'قارئ',
            isMuted: isMutedRef.current,
          });
        });

        conn.on('data', (raw: any) => {
          if (!raw || typeof raw !== 'object') return;

          if (raw.type === 'room:full') {
            setCallState('room_full');
            setErrorMessage('الغرفة ممتلئة حالياً (الحد الأقصى شخصان للمكالمة).');
            cleanupAll();
            return;
          }

          if (raw.type === 'room:state') {
            const roomPeers: PeerParticipant[] = raw.peers || [];
            setPeers(roomPeers);
            setReciterPeerId(raw.reciterPeerId || null);
            setFocusedWordId(raw.focusedWordId || null);
            setFocusedAyahNumber(raw.focusedAyahNumber ?? null);
            if (raw.passage) {
              setPassage(raw.passage);
              onRemotePassageUpdateRef.current?.(raw.passage);
            }
            setCallState(roomPeers.length >= 2 ? 'connected' : 'waiting_peer');
            return;
          }

          if (raw.type === 'room:closed') {
            setErrorMessage('أنهى الطرف الآخر الجلسة الصوتية.');
            cleanupAll();
            setCallState('idle');
            return;
          }

          handleP2PDataMessage(raw);
        });

        conn.on('close', () => {
          setCallState((prev) => (prev === 'idle' || prev === 'room_full' ? prev : 'idle'));
          cleanupPeerConnection();
          startVoiceMeters(localStreamRef.current, null);
        });

        conn.on('error', () => {
          setErrorMessage('تعذر الاتصال بصاحب الغرفة.');
          setCallState('error');
        });
      });

      peer.on('error', (err: any) => {
        if (p2pTimeoutRef.current) {
          clearTimeout(p2pTimeoutRef.current);
          p2pTimeoutRef.current = null;
        }
        if (err?.type === 'peer-unavailable') {
          setErrorMessage('لم يتم العثور على الغرفة أو أن منشئها أغلقها. اطلب رابط دعوة جديداً.');
        } else {
          setErrorMessage('تعذر الاتصال بخادم الربط الصوتي.');
        }
        setCallState('error');
        cleanupAll();
      });
    },
    [
      attachMediaCall,
      cleanupAll,
      cleanupPeerConnection,
      handleP2PDataMessage,
      localPeerId,
      requestMicrophone,
      startVoiceMeters,
    ]
  );

  // ==========================================================
  // Unified Public API (Auto-selects WS or Serverless P2P)
  // ==========================================================
  const joinRoom = useCallback(
    async (
      targetRoomId: string,
      displayName: string,
      initialRoomPassage?: RoomPassageState
    ) => {
      const cleanCode = targetRoomId.trim().toUpperCase();
      if (!cleanCode) return;

      cleanupAll();
      setErrorMessage(null);
      setCallState('connecting');
      setRoomId(cleanCode);

      const useWs = await hasDedicatedWsBackend();
      if (useWs) {
        await joinViaWs(cleanCode, displayName, initialRoomPassage);
      } else {
        await joinViaP2P(cleanCode, displayName);
      }
    },
    [cleanupAll, joinViaP2P, joinViaWs]
  );

  const createAndJoinRoom = useCallback(
    async (displayName: string, initialRoomPassage: RoomPassageState) => {
      cleanupAll();
      setErrorMessage(null);
      setCallState('connecting');

      const useWs = await hasDedicatedWsBackend();
      if (useWs) {
        try {
          const res = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initialRoomPassage),
          });
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('application/json')) {
            const data = await res.json();
            if (data?.roomId) {
              await joinViaWs(data.roomId, displayName, data.passage || initialRoomPassage);
              return data.roomId as string;
            }
          }
        } catch {
          // Fall back seamlessly to PeerJS P2P serverless mode below
        }
      }

      return createRoomP2P(displayName, initialRoomPassage);
    },
    [cleanupAll, createRoomP2P, joinViaWs]
  );

  const leaveCall = useCallback(() => {
    if (transportModeRef.current === 'p2p' && p2pDataConnRef.current?.open) {
      try {
        p2pDataConnRef.current.send({
          type: isP2PHostRef.current ? 'room:closed' : 'peer:left',
          peerId: localPeerId,
        });
      } catch {
        // ignore
      }
    }
    cleanupAll();
    setRoomId('');
    setPeers([]);
    setReciterPeerId(null);
    setFocusedWordId(null);
    setFocusedAyahNumber(null);
    setCallState('idle');
    setErrorMessage(null);
  }, [cleanupAll, localPeerId]);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMutedRef.current;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !nextMuted;
      });
    }
    setPeers((prev) =>
      prev.map((p) => (p.peerId === localPeerId ? { ...p, isMuted: nextMuted } : p))
    );
    sendSignal({
      type: transportModeRef.current === 'p2p' ? 'peer:mute-updated' : 'peer:mute-state',
      peerId: localPeerId,
      isMuted: nextMuted,
    });
  }, [localPeerId, sendSignal]);

  const updateRoomPassage = useCallback(
    (nextPassage: RoomPassageState) => {
      setPassage(nextPassage);
      sendSignal({
        type:
          transportModeRef.current === 'p2p' && isP2PHostRef.current
            ? 'room:passage-updated'
            : 'room:update-passage',
        passage: nextPassage,
      });
    },
    [sendSignal]
  );

  const syncFocusWord = useCallback(
    (wordId: string | null, ayahNumber: number | null) => {
      setFocusedWordId(wordId);
      setFocusedAyahNumber(ayahNumber);
      sendSignal({
        type:
          transportModeRef.current === 'p2p' ? 'room:word-focused' : 'room:focus-word',
        wordId,
        ayahNumber,
      });
    },
    [sendSignal]
  );

  const swapRoles = useCallback(
    (targetReciterPeerId: string) => {
      setReciterPeerId(targetReciterPeerId);
      sendSignal({
        type:
          transportModeRef.current === 'p2p' ? 'room:roles-updated' : 'room:swap-roles',
        reciterPeerId: targetReciterPeerId,
      });
    },
    [sendSignal]
  );

  const otherPeer = peers.find((p) => p.peerId !== localPeerId) || null;
  const isLocalReciter = reciterPeerId === localPeerId;

  return {
    roomId,
    localPeerId,
    peers,
    otherPeer,
    reciterPeerId,
    isLocalReciter,
    focusedWordId,
    focusedAyahNumber,
    passage,
    callState,
    errorMessage,
    isMuted,
    localAudioLevel,
    remoteAudioLevel,
    remoteStream,
    createAndJoinRoom,
    joinRoom,
    leaveCall,
    toggleMute,
    updateRoomPassage,
    syncFocusWord,
    swapRoles,
    setRiwayahLocal: (riwayah: RiwayahId) =>
      updateRoomPassage({ ...passageRef.current, riwayah }),
  };
}

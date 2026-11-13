import { useState, useRef, useCallback, useEffect } from 'react';
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

function generatePeerId(): string {
  return `peer_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
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

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const onRemotePassageUpdateRef = useRef(onRemotePassageUpdate);
  onRemotePassageUpdateRef.current = onRemotePassageUpdate;

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
    setRemoteStream(null);
  }, []);

  const cleanupAll = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
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
  }, [cleanupPeerConnection, stopAudioMeters]);

  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  const sendSignal = useCallback((payload: Record<string, unknown>) => {
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
      } catch {
        setErrorMessage('يرجى السماح بصلاحية الميكروفون لإجراء المكالمة الصوتية.');
        setCallState('error');
        return;
      }

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
            initialPassage: initialRoomPassage || passage,
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
          // Existing peer creates WebRTC offer for the newly joined peer
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
      passage,
      sendSignal,
      startVoiceMeters,
    ]
  );

  const createAndJoinRoom = useCallback(
    async (displayName: string, initialRoomPassage: RoomPassageState) => {
      setErrorMessage(null);
      setCallState('connecting');
      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initialRoomPassage),
        });
        if (!res.ok) throw new Error('Failed to create room');
        const data = await res.json();
        await joinRoom(data.roomId, displayName, data.passage || initialRoomPassage);
        return data.roomId as string;
      } catch {
        setErrorMessage('تعذر إنشاء غرفة الدعوة. حاول مرة أخرى.');
        setCallState('error');
        return null;
      }
    },
    [joinRoom]
  );

  const leaveCall = useCallback(() => {
    cleanupAll();
    setRoomId('');
    setPeers([]);
    setReciterPeerId(null);
    setFocusedWordId(null);
    setFocusedAyahNumber(null);
    setCallState('idle');
    setErrorMessage(null);
  }, [cleanupAll]);

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
    sendSignal({ type: 'peer:mute-state', isMuted: nextMuted });
  }, [localPeerId, sendSignal]);

  const updateRoomPassage = useCallback(
    (nextPassage: RoomPassageState) => {
      setPassage(nextPassage);
      sendSignal({ type: 'room:update-passage', passage: nextPassage });
    },
    [sendSignal]
  );

  const syncFocusWord = useCallback(
    (wordId: string | null, ayahNumber: number | null) => {
      setFocusedWordId(wordId);
      setFocusedAyahNumber(ayahNumber);
      sendSignal({ type: 'room:focus-word', wordId, ayahNumber });
    },
    [sendSignal]
  );

  const swapRoles = useCallback(
    (targetReciterPeerId: string) => {
      setReciterPeerId(targetReciterPeerId);
      sendSignal({ type: 'room:swap-roles', reciterPeerId: targetReciterPeerId });
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
      updateRoomPassage({ ...passage, riwayah }),
  };
}

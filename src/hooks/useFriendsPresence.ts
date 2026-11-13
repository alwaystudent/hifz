import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import { DirectCallInvite, FriendItem, RoomPassageState } from '../types/quran';
import {
  bindAudioUnlockOnce,
  startIncomingRingtone,
  startOutgoingRingback,
  stopAllRingtones,
} from '../utils/ringtone';

const PRESENCE_PREFIX = 'ratel-user-';
const STORAGE_MY_CODE = 'ratel_my_friend_code';
const STORAGE_MY_NAME = 'quran_peer_name';
const STORAGE_FRIENDS = 'ratel_friends_list';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

function generateFriendCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'RT';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function extractFriendInviteFromInput(
  input: string
): { code: string; name?: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.includes('http') || trimmed.includes('addFriend=')) {
      const url = new URL(
        trimmed.startsWith('http') ? trimmed : `https://x.local/${trimmed.replace(/^\?/, '?')}`
      );
      const code = url.searchParams.get('addFriend');
      const name = url.searchParams.get('name') || undefined;
      if (code) {
        return {
          code: code.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''),
          name: name?.trim() || undefined,
        };
      }
    }
  } catch {
    // fallback regex
  }

  const match = trimmed.match(/addFriend=([A-Za-z0-9]+)/i);
  if (match && match[1]) {
    return { code: match[1].toUpperCase() };
  }

  const clean = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length >= 4 && clean.length <= 16) {
    return { code: clean };
  }
  return null;
}

export type OutgoingCallPhase =
  | 'idle'
  | 'ringing'
  | 'accepted'
  | 'rejected'
  | 'offline';

export interface OutgoingCallState {
  phase: OutgoingCallPhase;
  targetFriend: FriendItem | null;
  roomId: string | null;
  message: string | null;
}

export function useFriendsPresence() {
  const [myCode] = useState<string>(() => {
    if (typeof window === 'undefined') return generateFriendCode();
    try {
      const saved = localStorage.getItem(STORAGE_MY_CODE);
      if (saved && saved.trim().length >= 6) return saved.trim().toUpperCase();
      const created = generateFriendCode();
      localStorage.setItem(STORAGE_MY_CODE, created);
      return created;
    } catch {
      return generateFriendCode();
    }
  });

  const [myName, setMyName] = useState<string>(() => {
    if (typeof window === 'undefined') return 'طالب علم';
    try {
      return localStorage.getItem(STORAGE_MY_NAME) || 'طالب علم';
    } catch {
      return 'طالب علم';
    }
  });

  const [friends, setFriends] = useState<FriendItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_FRIENDS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isPresenceReady, setIsPresenceReady] = useState(false);
  const [incomingCall, setIncomingCall] = useState<DirectCallInvite | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCallState>({
    phase: 'idle',
    targetFriend: null,
    roomId: null,
    message: null,
  });
  const [friendNotice, setFriendNotice] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const myNameRef = useRef(myName);
  myNameRef.current = myName;
  const incomingCallRef = useRef(incomingCall);
  incomingCallRef.current = incomingCall;
  const outgoingCallRef = useRef(outgoingCall);
  outgoingCallRef.current = outgoingCall;
  const outgoingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist friends list
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FRIENDS, JSON.stringify(friends));
    } catch {
      // ignore
    }
  }, [friends]);

  // Persist display name
  useEffect(() => {
    try {
      if (myName.trim()) {
        localStorage.setItem(STORAGE_MY_NAME, myName.trim());
      }
    } catch {
      // ignore
    }
  }, [myName]);

  const upsertFriendLocal = useCallback(
    (code: string, name?: string) => {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode || cleanCode === myCode) return false;

      setFriends((prev) => {
        const existingIdx = prev.findIndex((f) => f.code === cleanCode);
        const cleanName = name?.trim() || (existingIdx !== -1 ? prev[existingIdx].name : 'صديق');
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            name: name?.trim() ? cleanName : updated[existingIdx].name,
          };
          return updated;
        }
        return [
          {
            code: cleanCode,
            name: cleanName,
            addedAt: Date.now(),
          },
          ...prev,
        ];
      });
      return true;
    },
    [myCode]
  );

  const removeFriend = useCallback((code: string) => {
    setFriends((prev) => prev.filter((f) => f.code !== code));
  }, []);

  // Send a one-shot message to another user's presence PeerJS ID
  const sendPresenceMessage = useCallback(
    (targetCode: string, payload: Record<string, unknown>): Promise<boolean> => {
      return new Promise((resolve) => {
        const peer = peerRef.current;
        if (!peer || peer.destroyed || !peer.open) {
          resolve(false);
          return;
        }

        const cleanTarget = targetCode.trim().toUpperCase();
        if (!cleanTarget || cleanTarget === myCode) {
          resolve(false);
          return;
        }

        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(ok);
        };

        const conn = peer.connect(`${PRESENCE_PREFIX}${cleanTarget}`, {
          reliable: true,
        });

        const timer = setTimeout(() => {
          try {
            conn.close();
          } catch {
            // ignore
          }
          finish(false);
        }, 5500);

        conn.on('open', () => {
          try {
            conn.send(payload);
            setTimeout(() => {
              try {
                conn.close();
              } catch {
                // ignore
              }
              finish(true);
            }, 350);
          } catch {
            finish(false);
          }
        });

        conn.on('error', () => {
          finish(false);
        });
      });
    },
    [myCode]
  );

  // Add friend locally and attempt mutual handshake if friend is currently online
  const addFriendByInvite = useCallback(
    async (input: string, fallbackName?: string): Promise<{ added: boolean; synced: boolean; code?: string }> => {
      const parsed = extractFriendInviteFromInput(input);
      if (!parsed || !parsed.code) {
        return { added: false, synced: false };
      }
      if (parsed.code === myCode) {
        setFriendNotice('لا يمكنك إضافة رمز دعوتك الشخصي لنفسك.');
        return { added: false, synced: false };
      }

      const displayName = parsed.name || fallbackName || 'صديق';
      upsertFriendLocal(parsed.code, displayName);

      const synced = await sendPresenceMessage(parsed.code, {
        type: 'friend:handshake',
        fromCode: myCode,
        fromName: myNameRef.current.trim() || 'صديق',
      });

      setFriendNotice(
        synced
          ? `تمت إضافة «${displayName}» ومزامنة الصداقة بنجاح.`
          : `تمت إضافة «${displayName}» إلى قائمة أصدقائك.`
      );
      return { added: true, synced, code: parsed.code };
    },
    [myCode, sendPresenceMessage, upsertFriendLocal]
  );

  // Initialize global PeerJS presence listener across all stages (works on Vercel)
  useEffect(() => {
    bindAudioUnlockOnce();

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectPresence = () => {
      if (cancelled) return;
      const peer = new Peer(`${PRESENCE_PREFIX}${myCode}`, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        config: ICE_SERVERS,
        debug: 0,
      });
      peerRef.current = peer;

      peer.on('open', () => {
        if (!cancelled) setIsPresenceReady(true);
      });

      peer.on('connection', (conn) => {
        conn.on('data', (raw: any) => {
          if (!raw || typeof raw !== 'object') return;

          if (raw.type === 'friend:handshake' && raw.fromCode) {
            const fromCode = String(raw.fromCode).toUpperCase();
            const fromName = String(raw.fromName || 'صديق').trim();
            upsertFriendLocal(fromCode, fromName);
            setFriendNotice(`أضافك «${fromName}» إلى قائمة الأصدقاء.`);
            // Send ack back with our latest name
            sendPresenceMessage(fromCode, {
              type: 'friend:handshake-ack',
              fromCode: myCode,
              fromName: myNameRef.current.trim() || 'صديق',
            });
            return;
          }

          if (raw.type === 'friend:handshake-ack' && raw.fromCode) {
            const fromCode = String(raw.fromCode).toUpperCase();
            const fromName = String(raw.fromName || 'صديق').trim();
            upsertFriendLocal(fromCode, fromName);
            return;
          }

          if (raw.type === 'call:invite' && raw.roomId && raw.callerCode) {
            const callerCode = String(raw.callerCode).toUpperCase();
            const callerName = String(raw.callerName || 'صديق').trim();
            upsertFriendLocal(callerCode, callerName);

            const invite: DirectCallInvite = {
              roomId: String(raw.roomId).toUpperCase(),
              callerCode,
              callerName,
              passage: raw.passage || {
                surahNumber: 1,
                fromAyah: 1,
                toAyah: 7,
                riwayah: 'hafs',
              },
              receivedAt: Date.now(),
            };
            setIncomingCall(invite);
            startIncomingRingtone();
            return;
          }

          if (raw.type === 'call:cancelled' && raw.roomId) {
            const cur = incomingCallRef.current;
            if (cur && cur.roomId === String(raw.roomId).toUpperCase()) {
              stopAllRingtones();
              setIncomingCall(null);
            }
            return;
          }

          if (raw.type === 'call:accepted' && raw.roomId) {
            const curOut = outgoingCallRef.current;
            if (curOut.roomId === String(raw.roomId).toUpperCase()) {
              stopAllRingtones();
              if (outgoingTimeoutRef.current) {
                clearTimeout(outgoingTimeoutRef.current);
                outgoingTimeoutRef.current = null;
              }
              setOutgoingCall((prev) => ({
                ...prev,
                phase: 'accepted',
                message: 'وافق الصديق، جاري ربط الصوت...',
              }));
            }
            return;
          }

          if (raw.type === 'call:rejected' && raw.roomId) {
            const curOut = outgoingCallRef.current;
            if (curOut.roomId === String(raw.roomId).toUpperCase()) {
              stopAllRingtones();
              if (outgoingTimeoutRef.current) {
                clearTimeout(outgoingTimeoutRef.current);
                outgoingTimeoutRef.current = null;
              }
              setOutgoingCall((prev) => ({
                ...prev,
                phase: 'rejected',
                message: `اعتذر «${prev.targetFriend?.name || 'الصديق'}» عن استقبال المكالمة حالياً.`,
              }));
            }
          }
        });
      });

      peer.on('disconnected', () => {
        if (!cancelled && !peer.destroyed) {
          setIsPresenceReady(false);
          reconnectTimer = setTimeout(() => {
            try {
              peer.reconnect();
            } catch {
              // ignore
            }
          }, 3000);
        }
      });

      peer.on('error', (err: any) => {
        // Ignore transient peer-unavailable errors raised by outbound peer.connect() attempts
        if (err?.type === 'peer-unavailable') return;
        if (err?.type === 'network' || err?.type === 'server-error') {
          setIsPresenceReady(false);
        }
      });
    };

    connectPresence();

    return () => {
      cancelled = true;
      stopAllRingtones();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (outgoingTimeoutRef.current) clearTimeout(outgoingTimeoutRef.current);
      if (peerRef.current) {
        try {
          peerRef.current.destroy();
        } catch {
          // ignore
        }
        peerRef.current = null;
      }
    };
  }, [myCode, sendPresenceMessage, upsertFriendLocal]);

  // Initiate a direct call invite to a friend
  const sendDirectCallInvite = useCallback(
    async (friend: FriendItem, roomId: string, passage: RoomPassageState) => {
      if (outgoingTimeoutRef.current) {
        clearTimeout(outgoingTimeoutRef.current);
        outgoingTimeoutRef.current = null;
      }

      setOutgoingCall({
        phase: 'ringing',
        targetFriend: friend,
        roomId,
        message: `جاري الاتصال بـ «${friend.name}»...`,
      });
      startOutgoingRingback();

      const delivered = await sendPresenceMessage(friend.code, {
        type: 'call:invite',
        roomId,
        callerCode: myCode,
        callerName: myNameRef.current.trim() || 'صديق',
        passage,
      });

      if (!delivered) {
        stopAllRingtones();
        setOutgoingCall({
          phase: 'offline',
          targetFriend: friend,
          roomId,
          message: `«${friend.name}» غير فاتح للتطبيق حالياً. يمكنك إرسال رابط الغرفة له مباشرة للانضمام.`,
        });
        return false;
      }

      outgoingTimeoutRef.current = setTimeout(() => {
        stopAllRingtones();
        setOutgoingCall((prev) =>
          prev.phase === 'ringing'
            ? {
                ...prev,
                phase: 'offline',
                message: `لم يرد «${friend.name}» بعد. الغرفة مفتوحة ويمكنك مشاركة الرابط معه.`,
              }
            : prev
        );
      }, 30000);

      return true;
    },
    [myCode, sendPresenceMessage]
  );

  const cancelOutgoingCall = useCallback(async () => {
    stopAllRingtones();
    if (outgoingTimeoutRef.current) {
      clearTimeout(outgoingTimeoutRef.current);
      outgoingTimeoutRef.current = null;
    }
    const cur = outgoingCallRef.current;
    if (cur.targetFriend && cur.roomId && cur.phase === 'ringing') {
      await sendPresenceMessage(cur.targetFriend.code, {
        type: 'call:cancelled',
        roomId: cur.roomId,
      });
    }
    setOutgoingCall({
      phase: 'idle',
      targetFriend: null,
      roomId: null,
      message: null,
    });
  }, [sendPresenceMessage]);

  const clearOutgoingState = useCallback(() => {
    stopAllRingtones();
    if (outgoingTimeoutRef.current) {
      clearTimeout(outgoingTimeoutRef.current);
      outgoingTimeoutRef.current = null;
    }
    setOutgoingCall({
      phase: 'idle',
      targetFriend: null,
      roomId: null,
      message: null,
    });
  }, []);

  const acceptIncomingCall = useCallback(async () => {
    stopAllRingtones();
    const cur = incomingCallRef.current;
    setIncomingCall(null);
    if (!cur) return null;

    await sendPresenceMessage(cur.callerCode, {
      type: 'call:accepted',
      roomId: cur.roomId,
    });
    return cur;
  }, [sendPresenceMessage]);

  const rejectIncomingCall = useCallback(async () => {
    stopAllRingtones();
    const cur = incomingCallRef.current;
    setIncomingCall(null);
    if (!cur) return;

    await sendPresenceMessage(cur.callerCode, {
      type: 'call:rejected',
      roomId: cur.roomId,
    });
  }, [sendPresenceMessage]);

  const myFriendInviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?addFriend=${myCode}&name=${encodeURIComponent(
          myName.trim() || 'صديق'
        )}`
      : '';

  return {
    myCode,
    myName,
    setMyName,
    myFriendInviteUrl,
    friends,
    isPresenceReady,
    incomingCall,
    outgoingCall,
    friendNotice,
    setFriendNotice,
    addFriendByInvite,
    removeFriend,
    sendDirectCallInvite,
    cancelOutgoingCall,
    clearOutgoingState,
    acceptIncomingCall,
    rejectIncomingCall,
  };
}

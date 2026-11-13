import { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  DirectCallInvite,
  FriendItem,
  MemberProfile,
  RoomPassageState,
} from '../types/quran';
import {
  bindAudioUnlockOnce,
  startIncomingRingtone,
  startOutgoingRingback,
  stopAllRingtones,
} from '../utils/ringtone';

export function extractFriendInviteFromInput(
  input: string
): { code: string; name?: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.includes('http') || trimmed.includes('addFriend=')) {
      const url = new URL(
        trimmed.startsWith('http')
          ? trimmed
          : `https://x.local/${trimmed.replace(/^\?/, '?')}`
      );
      const code = url.searchParams.get('addFriend');
      const name = url.searchParams.get('name') || undefined;
      if (code) {
        const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (clean.length >= 6 && clean.length <= 16) {
          return {
            code: clean,
            name: name?.trim() || undefined,
          };
        }
      }
    }
  } catch {
    // fallback regex
  }

  const match = trimmed.match(/addFriend=([A-Za-z0-9]+)/i);
  if (match && match[1]) {
    const clean = match[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length >= 6 && clean.length <= 16) {
      return { code: clean };
    }
  }

  const clean = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length >= 6 && clean.length <= 16) {
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
  callId: string | null;
  targetFriend: FriendItem | null;
  roomId: string | null;
  message: string | null;
}

interface UseFriendsPresenceParams {
  user: User | null;
  memberProfile: MemberProfile | null;
  isAuthReady: boolean;
  onRequireAuth?: (reason?: string) => void;
}

export function useFriendsPresence({
  user,
  memberProfile,
  isAuthReady,
  onRequireAuth,
}: UseFriendsPresenceParams) {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [isPresenceReady, setIsPresenceReady] = useState(false);
  const [incomingCall, setIncomingCall] = useState<DirectCallInvite | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCallState>({
    phase: 'idle',
    callId: null,
    targetFriend: null,
    roomId: null,
    message: null,
  });
  const [friendNotice, setFriendNotice] = useState<string | null>(null);

  const incomingCallRef = useRef(incomingCall);
  incomingCallRef.current = incomingCall;
  const outgoingCallRef = useRef(outgoingCall);
  outgoingCallRef.current = outgoingCall;
  const activeCallIdRef = useRef(activeCallId);
  activeCallIdRef.current = activeCallId;

  const outgoingUnsubRef = useRef<Unsubscribe | null>(null);
  const outgoingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAuthenticated = Boolean(isAuthReady && user && memberProfile);
  const myCode = memberProfile?.friendCode || '';
  const myName = memberProfile?.displayName || '';

  const cleanupOutgoingListeners = useCallback(() => {
    if (outgoingTimeoutRef.current) {
      clearTimeout(outgoingTimeoutRef.current);
      outgoingTimeoutRef.current = null;
    }
    if (outgoingUnsubRef.current) {
      outgoingUnsubRef.current();
      outgoingUnsubRef.current = null;
    }
  }, []);

  // Unlock Web Audio playback on first user gesture
  useEffect(() => {
    bindAudioUnlockOnce();
  }, []);

  // Reset state when user signs out
  useEffect(() => {
    if (!isAuthenticated) {
      stopAllRingtones();
      cleanupOutgoingListeners();
      setFriends([]);
      setIncomingCall(null);
      setActiveCallId(null);
      setOutgoingCall({
        phase: 'idle',
        callId: null,
        targetFriend: null,
        roomId: null,
        message: null,
      });
      setIsPresenceReady(false);
    }
  }, [isAuthenticated, cleanupOutgoingListeners]);

  // 1) Real-time Firestore friends list listener (strictly after auth)
  useEffect(() => {
    if (!isAuthenticated || !user || !memberProfile) return;

    const friendsPath = `users/${user.uid}/friends`;
    const friendsQuery = query(
      collection(db, 'users', user.uid, 'friends'),
      where('ownerUid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      friendsQuery,
      (snapshot) => {
        const list: FriendItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            uid: String(data.friendUid || d.id),
            code: String(data.friendCode || ''),
            name: String(data.friendName || 'صديق'),
            addedAt:
              typeof data.createdAt?.toMillis === 'function'
                ? data.createdAt.toMillis()
                : Date.now(),
          };
        });
        list.sort((a, b) => b.addedAt - a.addedAt);
        setFriends(list);
        setIsPresenceReady(true);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, friendsPath);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, user, memberProfile]);

  // 2) Real-time listener for incoming friend requests -> auto-complete mutual friendship
  useEffect(() => {
    if (!isAuthenticated || !user || !memberProfile) return;

    const reqQuery = query(
      collection(db, 'friendRequests'),
      where('toUid', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      reqQuery,
      async (snapshot) => {
        for (const reqDoc of snapshot.docs) {
          const data = reqDoc.data();
          const fromUid = String(data.fromUid || '');
          const fromName = String(data.fromName || 'صديق').trim().slice(0, 80);
          const fromCode = String(data.fromCode || '').toUpperCase();
          if (!fromUid || !fromCode) continue;

          try {
            const friendRef = doc(db, 'users', user.uid, 'friends', fromUid);
            const existingFriend = await getDoc(friendRef);

            const batch = writeBatch(db);
            const now = serverTimestamp();

            if (!existingFriend.exists()) {
              batch.set(friendRef, {
                ownerUid: user.uid,
                friendUid: fromUid,
                friendCode: fromCode,
                friendName: fromName,
                createdAt: now,
              });
            }

            batch.update(doc(db, 'friendRequests', reqDoc.id), {
              status: 'accepted',
              updatedAt: now,
            });

            await batch.commit();
            setFriendNotice(`أضافك «${fromName}» إلى قائمة الأصدقاء بنجاح.`);
          } catch (err) {
            console.error('Failed to process incoming friend request:', err);
          }
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'friendRequests');
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, user, memberProfile]);

  // 3) Global Real-time Incoming Voice Call Listener (/calls where calleeUid == me && status == 'ringing')
  useEffect(() => {
    if (!isAuthenticated || !user || !memberProfile) return;

    const callsQuery = query(
      collection(db, 'calls'),
      where('calleeUid', '==', user.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(
      callsQuery,
      (snapshot) => {
        const nowMs = Date.now();
        // Filter out stale abandoned calls older than 2 minutes
        const activeDocs = snapshot.docs.filter((d) => {
          const data = d.data();
          const createdMs =
            typeof data.createdAt?.toMillis === 'function'
              ? data.createdAt.toMillis()
              : nowMs;
          return nowMs - createdMs < 120000;
        });

        if (activeDocs.length === 0) {
          if (incomingCallRef.current) {
            stopAllRingtones();
            setIncomingCall(null);
          }
          return;
        }

        // Pick latest ringing call
        const latestDoc = activeDocs.sort((a, b) => {
          const aTime =
            typeof a.data().createdAt?.toMillis === 'function'
              ? a.data().createdAt.toMillis()
              : nowMs;
          const bTime =
            typeof b.data().createdAt?.toMillis === 'function'
              ? b.data().createdAt.toMillis()
              : nowMs;
          return bTime - aTime;
        })[0];

        const data = latestDoc.data();
        const invite: DirectCallInvite = {
          callId: latestDoc.id,
          roomId: String(data.roomId || '').toUpperCase(),
          callerUid: String(data.callerUid || ''),
          callerCode: String(data.callerCode || '').toUpperCase(),
          callerName: String(data.callerName || 'صديق'),
          passage: {
            surahNumber: Number(data.surahNumber || 1),
            fromAyah: Number(data.fromAyah || 1),
            toAyah: Number(data.toAyah || 7),
            riwayah:
              data.riwayah === 'warsh' || data.riwayah === 'qalun'
                ? data.riwayah
                : 'hafs',
          },
          receivedAt: nowMs,
        };

        const prevId = incomingCallRef.current?.callId;
        setIncomingCall(invite);
        if (prevId !== invite.callId) {
          startIncomingRingtone();
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'calls');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user, memberProfile]);

  // 4) Add friend by invite link or code (STRICTLY gated on login)
  const addFriendByInvite = useCallback(
    async (
      input: string
    ): Promise<{ added: boolean; synced: boolean; code?: string; requiresAuth?: boolean }> => {
      if (!isAuthReady || !user || !memberProfile) {
        setFriendNotice('يرجى تسجيل الدخول أو إنشاء عضوية أولاً لإضافة الأصدقاء.');
        onRequireAuth?.('لإضافة الأصدقاء والتواصل معهم صوتياً، يرجى تسجيل الدخول أو إنشاء عضوية أولاً.');
        return { added: false, synced: false, requiresAuth: true };
      }

      const parsed = extractFriendInviteFromInput(input);
      if (!parsed || !parsed.code) {
        setFriendNotice('رمز الصديق أو رابط الدعوة غير صالح.');
        return { added: false, synced: false };
      }

      if (parsed.code === memberProfile.friendCode) {
        setFriendNotice('لا يمكنك إضافة رمز دعوتك الشخصي لنفسك.');
        return { added: false, synced: false };
      }

      const codePath = `inviteCodes/${parsed.code}`;
      let inviteSnap;
      try {
        inviteSnap = await getDoc(doc(db, 'inviteCodes', parsed.code));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, codePath);
      }

      if (!inviteSnap || !inviteSnap.exists()) {
        setFriendNotice('لم يتم العثور على عضو مسجل بهذا الرمز. تأكد من الرابط أو الرمز.');
        return { added: false, synced: false };
      }

      const inviteData = inviteSnap.data();
      const targetUid = String(inviteData.ownerUid || '');
      const targetName = String(inviteData.displayName || parsed.name || 'صديق')
        .trim()
        .slice(0, 80);

      if (!targetUid || targetUid === user.uid) {
        setFriendNotice('لا يمكنك إضافة نفسك إلى قائمة الأصدقاء.');
        return { added: false, synced: false };
      }

      // Verify target profile exists
      try {
        const targetProfileSnap = await getDoc(doc(db, 'profiles', targetUid));
        if (!targetProfileSnap.exists()) {
          setFriendNotice('تعذر التحقق من حساب الصديق.');
          return { added: false, synced: false };
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `profiles/${targetUid}`);
      }

      // Prevent duplicate friend write (update is disallowed by rules)
      const myFriendRef = doc(db, 'users', user.uid, 'friends', targetUid);
      try {
        const existingFriendSnap = await getDoc(myFriendRef);
        if (existingFriendSnap.exists()) {
          setFriendNotice(`«${targetName}» موجود بالفعل في قائمة أصدقائك.`);
          return { added: true, synced: true, code: parsed.code };
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}/friends/${targetUid}`);
      }

      // Add friend + send mutual friendRequest atomically
      const requestId = `${user.uid}_${targetUid}_${Date.now().toString(36)}`;
      try {
        const batch = writeBatch(db);
        const now = serverTimestamp();

        batch.set(myFriendRef, {
          ownerUid: user.uid,
          friendUid: targetUid,
          friendCode: parsed.code,
          friendName: targetName,
          createdAt: now,
        });

        batch.set(doc(db, 'friendRequests', requestId), {
          fromUid: user.uid,
          fromName: memberProfile.displayName,
          fromCode: memberProfile.friendCode,
          toUid: targetUid,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        });

        await batch.commit();
        setFriendNotice(`تمت إضافة «${targetName}» إلى قائمة أصدقائك بنجاح.`);
        return { added: true, synced: true, code: parsed.code };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/friends/${targetUid}`);
      }
    },
    [isAuthReady, user, memberProfile, onRequireAuth]
  );

  // 5) Remove friend from personal list
  const removeFriend = useCallback(
    async (friendUid: string) => {
      if (!user) return;
      const friendPath = `users/${user.uid}/friends/${friendUid}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'friends', friendUid));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, friendPath);
      }
    },
    [user]
  );

  // 6) Initiate a direct call with synchronized ringing window on both sides
  const sendDirectCallInvite = useCallback(
    async (friend: FriendItem, roomId: string, passage: RoomPassageState): Promise<boolean> => {
      if (!isAuthenticated || !user || !memberProfile) {
        onRequireAuth?.('يرجى تسجيل الدخول أولاً لإجراء اتصال مباشر بالأصدقاء.');
        return false;
      }

      cleanupOutgoingListeners();

      const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const callRef = doc(db, 'calls', callId);

      setOutgoingCall({
        phase: 'ringing',
        callId,
        targetFriend: friend,
        roomId,
        message: `جاري الاتصال بـ «${friend.name}»...`,
      });
      startOutgoingRingback();

      try {
        const now = serverTimestamp();
        await setDoc(callRef, {
          callerUid: user.uid,
          callerName: memberProfile.displayName,
          callerCode: memberProfile.friendCode,
          calleeUid: friend.uid,
          calleeName: friend.name,
          roomId,
          status: 'ringing',
          surahNumber: passage.surahNumber,
          fromAyah: passage.fromAyah,
          toAyah: passage.toAyah,
          riwayah: passage.riwayah,
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        stopAllRingtones();
        setOutgoingCall({
          phase: 'offline',
          callId: null,
          targetFriend: friend,
          roomId,
          message: `تعذر إرسال إشعار الاتصال إلى «${friend.name}».`,
        });
        handleFirestoreError(err, OperationType.CREATE, `calls/${callId}`);
      }

      // Subscribe to call status updates from callee (accepted / rejected)
      outgoingUnsubRef.current = onSnapshot(
        callRef,
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          const status = data.status;

          if (status === 'accepted') {
            stopAllRingtones();
            cleanupOutgoingListeners();
            setActiveCallId(callId);
            setOutgoingCall((prev) => ({
              ...prev,
              phase: 'accepted',
              message: 'تم الرد! جاري فتح المكالمة الصوتية...',
            }));
          } else if (status === 'rejected') {
            stopAllRingtones();
            cleanupOutgoingListeners();
            setOutgoingCall((prev) => ({
              ...prev,
              phase: 'rejected',
              message: `اعتذر «${friend.name}» عن استقبال المكالمة حالياً.`,
            }));
          } else if (status === 'cancelled' || status === 'ended') {
            stopAllRingtones();
            cleanupOutgoingListeners();
            setOutgoingCall({
              phase: 'idle',
              callId: null,
              targetFriend: null,
              roomId: null,
              message: null,
            });
          }
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, `calls/${callId}`);
        }
      );

      // Ring timeout after 45 seconds if no answer
      outgoingTimeoutRef.current = setTimeout(async () => {
        stopAllRingtones();
        cleanupOutgoingListeners();
        try {
          const snap = await getDoc(callRef);
          if (snap.exists() && snap.data().status === 'ringing') {
            await updateDoc(callRef, {
              status: 'cancelled',
              updatedAt: serverTimestamp(),
            });
          }
        } catch {
          // ignore cleanup errors on timeout
        }
        setOutgoingCall((prev) =>
          prev.phase === 'ringing'
            ? {
                ...prev,
                phase: 'offline',
                message: `لم يرد «${friend.name}» على الرنين. الغرفة مفتوحة ويمكنك مشاركة رابطها معه.`,
              }
            : prev
        );
      }, 45000);

      return true;
    },
    [isAuthenticated, user, memberProfile, onRequireAuth, cleanupOutgoingListeners]
  );

  // 7) Cancel an outgoing ringing call
  const cancelOutgoingCall = useCallback(async () => {
    stopAllRingtones();
    cleanupOutgoingListeners();

    const cur = outgoingCallRef.current;
    setOutgoingCall({
      phase: 'idle',
      callId: null,
      targetFriend: null,
      roomId: null,
      message: null,
    });

    if (cur.callId && cur.phase === 'ringing') {
      try {
        const callRef = doc(db, 'calls', cur.callId);
        const snap = await getDoc(callRef);
        if (snap.exists() && snap.data().status === 'ringing') {
          await updateDoc(callRef, {
            status: 'cancelled',
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.error('Failed to cancel outgoing call:', err);
      }
    }
  }, [cleanupOutgoingListeners]);

  const clearOutgoingState = useCallback(() => {
    stopAllRingtones();
    cleanupOutgoingListeners();
    setOutgoingCall({
      phase: 'idle',
      callId: null,
      targetFriend: null,
      roomId: null,
      message: null,
    });
  }, [cleanupOutgoingListeners]);

  // 8) Accept incoming call -> notifies caller immediately via Firestore
  const acceptIncomingCall = useCallback(async (): Promise<DirectCallInvite | null> => {
    stopAllRingtones();
    const cur = incomingCallRef.current;
    setIncomingCall(null);
    if (!cur) return null;

    const callRef = doc(db, 'calls', cur.callId);
    try {
      const snap = await getDoc(callRef);
      if (snap.exists() && snap.data().status === 'ringing') {
        await updateDoc(callRef, {
          status: 'accepted',
          updatedAt: serverTimestamp(),
        });
        setActiveCallId(cur.callId);
        return cur;
      }
      setFriendNotice('انتهى الرنين أو ألغى المتصل المكالمة قبل الرد.');
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `calls/${cur.callId}`);
    }
  }, []);

  // 9) Reject incoming call -> notifies caller immediately via Firestore
  const rejectIncomingCall = useCallback(async () => {
    stopAllRingtones();
    const cur = incomingCallRef.current;
    setIncomingCall(null);
    if (!cur) return;

    const callRef = doc(db, 'calls', cur.callId);
    try {
      const snap = await getDoc(callRef);
      if (snap.exists() && snap.data().status === 'ringing') {
        await updateDoc(callRef, {
          status: 'rejected',
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `calls/${cur.callId}`);
    }
  }, []);

  // 10) End an active accepted call cleanly on hangup
  const endActiveCall = useCallback(async (explicitCallId?: string | null) => {
    const targetId = explicitCallId || activeCallIdRef.current;
    setActiveCallId(null);
    if (!targetId) return;

    try {
      const callRef = doc(db, 'calls', targetId);
      const snap = await getDoc(callRef);
      if (!snap.exists()) return;
      const status = snap.data().status;
      if (status === 'accepted') {
        await updateDoc(callRef, {
          status: 'ended',
          updatedAt: serverTimestamp(),
        });
      } else if (status === 'ringing' && snap.data().callerUid === user?.uid) {
        await updateDoc(callRef, {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Failed to mark call ended:', err);
    }
  }, [user?.uid]);

  // Cleanup timers/listeners on unmount
  useEffect(() => {
    return () => {
      stopAllRingtones();
      cleanupOutgoingListeners();
    };
  }, [cleanupOutgoingListeners]);

  const myFriendInviteUrl =
    typeof window !== 'undefined' && myCode
      ? `${window.location.origin}${window.location.pathname}?addFriend=${myCode}&name=${encodeURIComponent(
          myName.trim() || 'صديق'
        )}`
      : '';

  return {
    myCode,
    myName,
    myFriendInviteUrl,
    friends,
    isPresenceReady,
    incomingCall,
    outgoingCall,
    activeCallId,
    friendNotice,
    setFriendNotice,
    addFriendByInvite,
    removeFriend,
    sendDirectCallInvite,
    cancelOutgoingCall,
    clearOutgoingState,
    acceptIncomingCall,
    rejectIncomingCall,
    endActiveCall,
  };
}

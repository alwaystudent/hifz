import { useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { MemberProfile } from '../types/quran';

function generateMemberFriendCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'RT';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useAuthMember() {
  const [user, setUser] = useState<User | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const pendingPreferredNameRef = useRef<string | null>(null);

  const ensureMemberRecords = useCallback(
    async (firebaseUser: User, preferredName?: string): Promise<MemberProfile | null> => {
      const profilePath = `profiles/${firebaseUser.uid}`;
      const profileRef = doc(db, 'profiles', firebaseUser.uid);

      try {
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const data = snap.data();
          const loaded: MemberProfile = {
            uid: firebaseUser.uid,
            displayName: String(data.displayName || firebaseUser.displayName || 'طالب علم'),
            friendCode: String(data.friendCode),
            email: firebaseUser.email,
          };
          setMemberProfile(loaded);
          return loaded;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, profilePath);
      }

      // Create new membership records atomically (Profile + Private PII + Unique InviteCode)
      const cleanName = (
        preferredName ||
        pendingPreferredNameRef.current ||
        firebaseUser.displayName ||
        'طالب علم'
      )
        .trim()
        .slice(0, 80);

      let friendCode = generateMemberFriendCode();
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const codeSnap = await getDoc(doc(db, 'inviteCodes', friendCode));
          if (!codeSnap.exists()) break;
          friendCode = generateMemberFriendCode();
        } catch {
          break;
        }
      }

      try {
        const batch = writeBatch(db);
        const now = serverTimestamp();

        batch.set(profileRef, {
          uid: firebaseUser.uid,
          displayName: cleanName,
          friendCode,
          createdAt: now,
          updatedAt: now,
        });

        batch.set(doc(db, 'users', firebaseUser.uid, 'private', 'info'), {
          uid: firebaseUser.uid,
          email: firebaseUser.email || `${firebaseUser.uid}@member.local`,
          createdAt: now,
          updatedAt: now,
        });

        batch.set(doc(db, 'inviteCodes', friendCode), {
          code: friendCode,
          ownerUid: firebaseUser.uid,
          displayName: cleanName,
          createdAt: now,
          updatedAt: now,
        });

        await batch.commit();
        pendingPreferredNameRef.current = null;

        const created: MemberProfile = {
          uid: firebaseUser.uid,
          displayName: cleanName,
          friendCode,
          email: firebaseUser.email,
        };
        setMemberProfile(created);
        return created;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, profilePath);
      }
    },
    []
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setMemberProfile(null);
        setIsAuthReady(true);
        return;
      }

      setIsLoadingProfile(true);
      try {
        await ensureMemberRecords(currentUser);
      } catch {
        setAuthError('تعذر تحميل بيانات العضوية. يرجى المحاولة مرة أخرى.');
      } finally {
        setIsLoadingProfile(false);
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [ensureMemberRecords]);

  const signInOrRegisterWithGoogle = useCallback(
    async (preferredDisplayName?: string): Promise<boolean> => {
      setAuthError(null);
      if (preferredDisplayName && preferredDisplayName.trim()) {
        pendingPreferredNameRef.current = preferredDisplayName.trim().slice(0, 80);
      }
      try {
        const result = await signInWithPopup(auth, googleProvider);
        if (preferredDisplayName && preferredDisplayName.trim() && result.user) {
          try {
            await updateProfile(result.user, {
              displayName: preferredDisplayName.trim().slice(0, 80),
            });
          } catch {
            // non-fatal
          }
        }
        await ensureMemberRecords(result.user, preferredDisplayName);
        return true;
      } catch (err: any) {
        if (err?.code === 'auth/popup-closed-by-user') {
          setAuthError('تم إغلاق نافذة تسجيل الدخول قبل الإتمام.');
        } else if (err?.code === 'auth/popup-blocked') {
          setAuthError('قام المتصفح بحظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
        } else {
          setAuthError('تعذر تسجيل الدخول حالياً. يرجى المحاولة مجدداً.');
        }
        return false;
      }
    },
    [ensureMemberRecords]
  );

  const updateMemberDisplayName = useCallback(
    async (nextName: string): Promise<boolean> => {
      if (!user || !memberProfile) return false;
      const cleanName = nextName.trim().slice(0, 80);
      if (!cleanName) return false;

      const profilePath = `profiles/${user.uid}`;
      try {
        const batch = writeBatch(db);
        const now = serverTimestamp();

        batch.update(doc(db, 'profiles', user.uid), {
          displayName: cleanName,
          updatedAt: now,
        });
        batch.update(doc(db, 'inviteCodes', memberProfile.friendCode), {
          displayName: cleanName,
          updatedAt: now,
        });

        await batch.commit();
        setMemberProfile((prev) => (prev ? { ...prev, displayName: cleanName } : prev));
        return true;
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, profilePath);
      }
    },
    [user, memberProfile]
  );

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
    setMemberProfile(null);
  }, []);

  return {
    user,
    memberProfile,
    isAuthenticated: Boolean(user && memberProfile),
    isAuthReady,
    isLoadingProfile,
    authError,
    setAuthError,
    signInOrRegisterWithGoogle,
    updateMemberDisplayName,
    logout,
  };
}

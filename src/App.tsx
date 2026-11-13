import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StageType,
  SurahMeta,
  AyahItem,
  Reciter,
  RepetitionSettings,
  StageProgressState,
  SessionReport,
  EvaluationRating,
  RiwayahId,
  RoomPassageState,
  PendingRoomAction,
} from './types/quran';
import { SURAHS_LIST, RECITERS, RIWAYAT_LIST, fetchSurahAyahs } from './data/quranData';
import { Header } from './components/Header';
import { SurahRangeSelector } from './components/SurahRangeSelector';
import { SettingsModal } from './components/SettingsModal';
import { ReportsModal } from './components/ReportsModal';
import { Stage1SheikRecitation } from './components/Stage1SheikRecitation';
import { Stage2GradualFading } from './components/Stage2GradualFading';
import { Stage3RealtimeReveal } from './components/Stage3RealtimeReveal';
import { PeerTasmeeView } from './components/PeerTasmeeView';
import { IncomingCallModal } from './components/IncomingCallModal';
import { AuthModal } from './components/AuthModal';
import { useAuthMember } from './hooks/useAuthMember';
import { useFriendsPresence } from './hooks/useFriendsPresence';
import { RefreshCw, AlertCircle, X } from 'lucide-react';

function getInitialInviteRoom(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('room');
  return code ? code.trim().toUpperCase() : null;
}

function getInitialAddFriendQuery(): { code: string; name?: string } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('addFriend');
  if (!code) return null;
  return {
    code: code.trim().toUpperCase(),
    name: params.get('name')?.trim() || undefined,
  };
}

export default function App() {
  const [initialInviteRoomId] = useState<string | null>(getInitialInviteRoom);
  const [initialAddFriend] = useState<{ code: string; name?: string } | null>(
    getInitialAddFriendQuery
  );
  const [currentStage, setCurrentStage] = useState<StageType>(
    initialInviteRoomId || initialAddFriend ? 'peer' : 'stage1'
  );
  const [pendingRoomAction, setPendingRoomAction] = useState<PendingRoomAction | null>(null);
  const [autoStartMic, setAutoStartMic] = useState<boolean>(false);
  const [stageNotice, setStageNotice] = useState<string | null>(null);

  // Membership & Google Auth state
  const {
    user,
    memberProfile,
    isAuthenticated,
    isAuthReady,
    isLoadingProfile,
    authError,
    setAuthError,
    signInOrRegisterWithGoogle,
    updateMemberDisplayName,
    logout,
  } = useAuthMember();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPromptReason, setAuthPromptReason] = useState<string | null>(null);

  const openAuthModal = useCallback(
    (reason?: string) => {
      setAuthError(null);
      setAuthPromptReason(reason || null);
      setIsAuthModalOpen(true);
    },
    [setAuthError]
  );

  // Global Friends & Direct Voice Call Presence (Firebase Auth + Firestore + PeerJS)
  const {
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
  } = useFriendsPresence({
    user,
    memberProfile,
    isAuthReady,
    onRequireAuth: openAuthModal,
  });

  const promptedInviteAuthRef = useRef(false);
  const processedAddFriendRef = useRef(false);

  // Process ?addFriend=CODE&name=... ONLY after user is authenticated
  useEffect(() => {
    if (!initialAddFriend || !isAuthReady || processedAddFriendRef.current) return;

    if (!isAuthenticated) {
      if (!promptedInviteAuthRef.current) {
        promptedInviteAuthRef.current = true;
        openAuthModal(
          `لإضافة «${initialAddFriend.name || 'صديقك'}» إلى قائمة أصدقائك، يرجى تسجيل الدخول أو إنشاء عضوية أولاً.`
        );
      }
      return;
    }

    processedAddFriendRef.current = true;
    const rawSearch = window.location.search;
    addFriendByInvite(rawSearch || initialAddFriend.code).then(() => {
      window.history.replaceState({}, '', window.location.pathname);
    });
  }, [initialAddFriend, isAuthReady, isAuthenticated, openAuthModal, addFriendByInvite]);

  // Selected Riwayah (Hafs | Warsh | Qalun)
  const [riwayah, setRiwayah] = useState<RiwayahId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quran_riwayah');
      if (saved === 'warsh' || saved === 'qalun' || saved === 'hafs') {
        return saved;
      }
    }
    return 'hafs';
  });

  // Sequential Stage Progress
  const [stageProgress, setStageProgress] = useState<StageProgressState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('quran_stage_progress');
        return saved ? JSON.parse(saved) : { stage1: false, stage2: false, stage3: false };
      } catch {
        return { stage1: false, stage2: false, stage3: false };
      }
    }
    return { stage1: false, stage2: false, stage3: false };
  });

  // Reports state persisted in localStorage
  const [reports, setReports] = useState<SessionReport[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('quran_session_reports');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Surah & Ayah range selection
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(1);
  const [fromAyah, setFromAyah] = useState<number>(1);
  const [toAyah, setToAyah] = useState<number>(7);

  // Ayahs data
  const [ayahs, setAyahs] = useState<AyahItem[]>([]);
  const [isLoadingAyahs, setIsLoadingAyahs] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reciter matching current Riwayah
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(() => {
    const initialRiwayah =
      (typeof window !== 'undefined' && localStorage.getItem('quran_riwayah')) || 'hafs';
    return RECITERS.find((r) => r.riwayah === initialRiwayah) || RECITERS[0];
  });

  const [settings, setSettings] = useState<RepetitionSettings>(() => {
    const defaults: RepetitionSettings = {
      singleAyahRepeats: 3,
      linkRepeats: 3,
      finalReviewRepeats: 3,
      autoAdvance: true,
      playbackSpeed: 1.0,
      pauseBetweenAyahsSec: 2,
      ayahFontSize: 'small',
      showTajweedCues: true,
    };
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('quran_settings');
        if (saved) {
          return { ...defaults, ...JSON.parse(saved) };
        }
      } catch {
        // ignore
      }
    }
    return defaults;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quran_settings', JSON.stringify(settings));
      } catch {
        // ignore
      }
    }
  }, [settings]);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('quran_theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }
    return false;
  });

  // Modals state
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  // Switch Riwayah & auto-select compatible reciter
  const handleSelectRiwayah = useCallback((nextRiwayah: RiwayahId) => {
    setRiwayah(nextRiwayah);
    try {
      localStorage.setItem('quran_riwayah', nextRiwayah);
    } catch {
      // ignore
    }
    setSelectedReciter((prev) => {
      if (prev.riwayah === nextRiwayah) return prev;
      return RECITERS.find((r) => r.riwayah === nextRiwayah) || RECITERS[0];
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quran_stage_progress', JSON.stringify(stageProgress));
      } catch {
        // ignore
      }
    }
  }, [stageProgress]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('quran_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('quran_theme', 'light');
    }
  }, [isDarkMode]);

  // Load Ayahs for current Surah + Riwayah
  const loadSurah = useCallback(async (surahNum: number, activeRiwayah: RiwayahId) => {
    setIsLoadingAyahs(true);
    setLoadError(null);
    try {
      const data = await fetchSurahAyahs(surahNum, activeRiwayah);
      setAyahs(data);
    } catch (err) {
      console.error('Failed to load surah ayahs:', err);
      setLoadError('تعذر تحميل نص السورة. يرجى التحقق من الاتصال بالإنترنت والمحاولة مجدداً.');
    } finally {
      setIsLoadingAyahs(false);
    }
  }, []);

  useEffect(() => {
    loadSurah(selectedSurahNumber, riwayah);
  }, [selectedSurahNumber, riwayah, loadSurah]);

  const currentSurahMeta: SurahMeta =
    SURAHS_LIST.find((s) => s.number === selectedSurahNumber) || SURAHS_LIST[0];

  useEffect(() => {
    if (ayahs.length > 0) {
      const maxAyahs = ayahs.length;
      setFromAyah((prevFrom) => Math.max(1, Math.min(prevFrom, maxAyahs)));
      setToAyah((prevTo) => Math.max(1, Math.min(prevTo, maxAyahs)));
    }
  }, [ayahs]);

  const handleSelectRange = (surahNum: number, from: number, to: number) => {
    setSelectedSurahNumber(surahNum);
    const validFrom = Math.min(from, to);
    const validTo = Math.max(from, to);
    setFromAyah(validFrom);
    setToAyah(validTo);

    setStageProgress({ stage1: false, stage2: false, stage3: false });
    if (currentStage !== 'peer') {
      setCurrentStage('stage1');
    }
    setAutoStartMic(false);
    setStageNotice(null);
  };

  const handleSyncPeerPassage = useCallback(
    (passage: RoomPassageState) => {
      setSelectedSurahNumber(passage.surahNumber);
      setFromAyah(passage.fromAyah);
      setToAyah(passage.toAyah);
      if (passage.riwayah !== riwayah) {
        handleSelectRiwayah(passage.riwayah);
      }
    },
    [riwayah, handleSelectRiwayah]
  );

  const handleAdvanceToStage2 = (options?: { autoStartMic?: boolean }) => {
    setStageProgress((prev) => ({ ...prev, stage1: true }));
    setCurrentStage('stage2');
    setAutoStartMic(!!options?.autoStartMic);
    setStageNotice(null);
  };

  const handleAdvanceToStage3 = (options?: { autoStartMic?: boolean }) => {
    setStageProgress((prev) => ({ ...prev, stage2: true }));
    setCurrentStage('stage3');
    setAutoStartMic(!!options?.autoStartMic);
    setStageNotice(null);
  };

  const handleSkipStage1 = () => {
    setStageProgress((prev) => ({ ...prev, stage1: true }));
    handleAdvanceToStage2({ autoStartMic: true });
  };

  const handleSkipStage2 = () => {
    setStageProgress((prev) => ({ ...prev, stage2: true }));
    handleAdvanceToStage3({ autoStartMic: true });
  };

  const handleSkipStage3 = () => {
    setStageProgress((prev) => ({ ...prev, stage3: true }));
  };

  const handleManualSelectStage = (stage: StageType) => {
    if (stage === 'stage2' && !stageProgress.stage1) {
      setStageNotice('يرجى إتمام المرحلة الأولى أو الضغط على "تخطي للمرحلة ٢" للانتقال.');
      return;
    }
    if (stage === 'stage3' && !stageProgress.stage2) {
      setStageNotice('يرجى إتمام المرحلة الثانية أو الضغط على "تخطي للمرحلة ٣" للانتقال.');
      return;
    }
    setStageNotice(null);
    setCurrentStage(stage);
    setAutoStartMic(false);
  };

  const handleSaveReport = (rating: EvaluationRating, errorsCount: number, totalWords: number) => {
    let intervalDays = 5;
    if (rating === 'mutqan') intervalDays = 5;
    else if (rating === 'mutaraddid') intervalDays = 3;
    else intervalDays = 1;

    const now = new Date();
    const nextDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    const newReport: SessionReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      surahNumber: selectedSurahNumber,
      surahName: currentSurahMeta.name,
      fromAyah,
      toAyah,
      date: now.toISOString(),
      rating,
      errorsCount,
      totalWords,
      accuracyPercent: 100,
      nextReviewDate: nextDate.toISOString(),
      reviewIntervalDays: intervalDays,
      status: 'pending',
    };

    setReports((prev) => {
      const updated = [newReport, ...prev];
      try {
        localStorage.setItem('quran_session_reports', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    setStageProgress((prev) => ({ ...prev, stage3: true }));
  };

  const handleStartReviewSession = (surahNum: number, from: number, to: number) => {
    setSelectedSurahNumber(surahNum);
    setFromAyah(from);
    setToAyah(to);
    setStageProgress({ stage1: true, stage2: true, stage3: false });
    setCurrentStage('stage3');
    setAutoStartMic(true);
  };

  const handleDeleteReport = (id: string) => {
    setReports((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem('quran_session_reports', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearAllReports = () => {
    setReports([]);
    try {
      localStorage.removeItem('quran_session_reports');
    } catch {
      // ignore
    }
  };

  const dueReportsCount = reports.filter((r) => new Date(r.nextReviewDate) <= new Date()).length;
  const activeRiwayahMeta = RIWAYAT_LIST.find((r) => r.id === riwayah) || RIWAYAT_LIST[0];

  return (
    <div className="h-dvh w-full max-w-full overflow-hidden bg-[#F9F6EE] dark:bg-[#111711] text-[#242D22] dark:text-[#F1F6F0] flex flex-col transition-colors selection:bg-[#52674B]/20 selection:text-[#1F271D] dark:selection:bg-[#738C6B]/40 dark:selection:text-white">
      {/* Stationary Top Bar Header */}
      <Header
        currentStage={currentStage}
        onSelectStage={handleManualSelectStage}
        completedStages={stageProgress}
        riwayah={riwayah}
        onSelectRiwayah={handleSelectRiwayah}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenRangeSelector={() => setIsRangeModalOpen(true)}
        onOpenReports={() => setIsReportsModalOpen(true)}
        dueReportsCount={dueReportsCount}
        friendsCount={friends.length}
        memberDisplayName={memberProfile?.displayName || null}
        onOpenAuth={() => openAuthModal()}
        surahName={currentSurahMeta.name}
        fromAyah={fromAyah}
        toAyah={toAyah}
      />

      {/* Non-blocking Stage Lock Notice */}
      {stageNotice && (
        <div className="shrink-0 w-full px-3 sm:px-6 md:px-10 pt-2">
          <div className="rounded-xl px-3 py-2 bg-[#ECE4D4] dark:bg-[#1F2A1E] border border-[#D5CABB] dark:border-[#2F3F2D] text-xs font-semibold text-[#3D4D38] dark:text-[#C5D8C1] flex items-center justify-between">
            <span>{stageNotice}</span>
            <button onClick={() => setStageNotice(null)} className="p-0.5 hover:opacity-75">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Stationary Viewport Main Area (Internal Mushaf Scroll) */}
      <main className="flex-1 min-h-0 w-full max-w-full overflow-hidden px-2 sm:px-3 md:px-4 py-1.5 flex flex-col">
        {isLoadingAyahs && (
          <div className="flex-1 w-full flex flex-col items-center justify-center p-10 space-y-3 rounded-2xl bg-[#F6F2EA] dark:bg-[#182117] border border-[#DDD3BF] dark:border-[#273525] shadow-xs">
            <RefreshCw className="h-7 w-7 text-[#52674B] dark:text-[#C5D8C1] animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-[#2B3527] dark:text-[#F1F6F0] font-scheherazade">
                جاري فتح سورة {currentSurahMeta.name} برواية {activeRiwayahMeta.name}...
              </h3>
              <p className="text-xs text-[#6F7D6C] dark:text-[#9FB19B]">
                تحميل النص الشريف بالرسم المعتمد
              </p>
            </div>
          </div>
        )}

        {!isLoadingAyahs && loadError && (
          <div className="flex-1 w-full flex flex-col items-center justify-center rounded-2xl p-5 bg-[#8C524B]/10 border border-[#8C524B]/30 text-center space-y-2">
            <AlertCircle className="h-7 w-7 text-[#8C524B] mx-auto" />
            <p className="text-xs text-[#8C524B] dark:text-[#F3C5C1] font-medium">{loadError}</p>
            <button
              onClick={() => loadSurah(selectedSurahNumber, riwayah)}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#52674B] text-white hover:bg-[#43553D]"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {!isLoadingAyahs && !loadError && (
          <div className="flex-1 min-h-0 w-full flex flex-col">
            {currentStage === 'stage1' && (
              <Stage1SheikRecitation
                surah={currentSurahMeta}
                ayahs={ayahs}
                fromAyah={fromAyah}
                toAyah={toAyah}
                reciter={selectedReciter}
                settings={settings}
                onAdvanceToStage2={handleAdvanceToStage2}
                onSkipStage={handleSkipStage1}
                onOpenRangeModal={() => setIsRangeModalOpen(true)}
              />
            )}

            {currentStage === 'stage2' && (
              <Stage2GradualFading
                surah={currentSurahMeta}
                ayahs={ayahs}
                fromAyah={fromAyah}
                toAyah={toAyah}
                reciter={selectedReciter}
                ayahFontSize={settings.ayahFontSize || 'small'}
                autoStartMic={autoStartMic}
                onAdvanceToStage3={handleAdvanceToStage3}
                onSkipStage={handleSkipStage2}
                onBackToStage1={() => handleManualSelectStage('stage1')}
              />
            )}

            {currentStage === 'stage3' && (
              <Stage3RealtimeReveal
                surah={currentSurahMeta}
                ayahs={ayahs}
                fromAyah={fromAyah}
                toAyah={toAyah}
                reciter={selectedReciter}
                ayahFontSize={settings.ayahFontSize || 'small'}
                showTajweedCues={settings.showTajweedCues ?? true}
                autoStartMic={autoStartMic}
                onBackToStage2={() => handleManualSelectStage('stage2')}
                onBackToStage1={() => handleManualSelectStage('stage1')}
                onSkipStage={handleSkipStage3}
                onSaveReport={handleSaveReport}
                onOpenReports={() => setIsReportsModalOpen(true)}
              />
            )}

            {currentStage === 'peer' && (
              <PeerTasmeeView
                surah={currentSurahMeta}
                ayahs={ayahs}
                fromAyah={fromAyah}
                toAyah={toAyah}
                riwayah={riwayah}
                ayahFontSize={settings.ayahFontSize || 'small'}
                initialInviteRoomId={initialInviteRoomId}
                pendingRoomAction={pendingRoomAction}
                onClearPendingRoomAction={() => setPendingRoomAction(null)}
                onSyncPassageToApp={handleSyncPeerPassage}
                onExitPeerMode={() => setCurrentStage('stage1')}
                isAuthenticated={isAuthenticated}
                onOpenAuth={openAuthModal}
                myCode={myCode}
                myName={myName}
                myFriendInviteUrl={myFriendInviteUrl}
                friends={friends}
                isPresenceReady={isPresenceReady}
                outgoingCall={outgoingCall}
                activeCallId={activeCallId}
                friendNotice={friendNotice}
                onClearFriendNotice={() => setFriendNotice(null)}
                onAddFriendByInvite={addFriendByInvite}
                onRemoveFriend={removeFriend}
                onSendDirectCallInvite={sendDirectCallInvite}
                onCancelOutgoingCall={cancelOutgoingCall}
                onClearOutgoingState={clearOutgoingState}
                onEndActiveCall={endActiveCall}
              />
            )}
          </div>
        )}
      </main>

      {/* Ultra-slim Stationary Footer */}
      <footer className="shrink-0 w-full max-w-full border-t border-[#DDD3BF] dark:border-[#273525] bg-[#F6F2EA] dark:bg-[#182117] py-1 text-[10px] text-[#6F7D6C] dark:text-[#9FB19B]">
        <div className="w-full max-w-full px-3 flex items-center justify-between gap-2">
          <span className="font-scheherazade text-xs font-bold text-[#2B3527] dark:text-[#F1F6F0]">
            رتّـــل
          </span>
          <span className="text-[#7F8C7C] dark:text-[#8FA18B] shrink-0">
            برواية {activeRiwayahMeta.name}
          </span>
        </div>
      </footer>

      {/* Modals */}
      <SurahRangeSelector
        currentSurah={currentSurahMeta}
        fromAyah={fromAyah}
        toAyah={toAyah}
        onSelectRange={handleSelectRange}
        isOpen={isRangeModalOpen}
        onClose={() => setIsRangeModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        riwayah={riwayah}
        onSelectRiwayah={handleSelectRiwayah}
        settings={settings}
        onUpdateSettings={setSettings}
        selectedReciter={selectedReciter}
        onSelectReciter={setSelectedReciter}
      />

      <ReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        reports={reports}
        onStartReviewSession={handleStartReviewSession}
        onDeleteReport={handleDeleteReport}
        onClearAllReports={handleClearAllReports}
      />

      {/* Membership Registration / Account Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthPromptReason(null);
        }}
        isAuthenticated={isAuthenticated}
        isLoadingProfile={isLoadingProfile}
        memberProfile={memberProfile}
        authError={authError}
        promptReason={authPromptReason}
        myFriendInviteUrl={myFriendInviteUrl}
        onSignInWithGoogle={signInOrRegisterWithGoogle}
        onUpdateDisplayName={updateMemberDisplayName}
        onLogout={logout}
      />

      {/* Global Incoming Direct Call Window with Ringtone */}
      <IncomingCallModal
        invite={incomingCall}
        onAccept={async () => {
          const accepted = await acceptIncomingCall();
          if (accepted) {
            handleSyncPeerPassage(accepted.passage);
            setPendingRoomAction({
              type: 'join',
              roomId: accepted.roomId,
              callId: accepted.callId,
              passage: accepted.passage,
              friendName: accepted.callerName,
            });
            setCurrentStage('peer');
          }
        }}
        onReject={() => {
          rejectIncomingCall();
        }}
      />
    </div>
  );
}

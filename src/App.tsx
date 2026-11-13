import React, { useState, useEffect, useCallback } from 'react';
import {
  StageType,
  SurahMeta,
  AyahItem,
  Reciter,
  RepetitionSettings,
  StageProgressState,
  SessionReport,
  EvaluationRating,
} from './types/quran';
import { SURAHS_LIST, RECITERS, fetchSurahAyahs } from './data/quranData';
import { Header } from './components/Header';
import { SurahRangeSelector } from './components/SurahRangeSelector';
import { SettingsModal } from './components/SettingsModal';
import { ReportsModal } from './components/ReportsModal';
import { Stage1SheikRecitation } from './components/Stage1SheikRecitation';
import { Stage2GradualFading } from './components/Stage2GradualFading';
import { Stage3RealtimeReveal } from './components/Stage3RealtimeReveal';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentStage, setCurrentStage] = useState<StageType>('stage1');
  const [autoStartMic, setAutoStartMic] = useState<boolean>(false);

  // Sequential Stage Progress (Stage 2 locked until Stage 1 completed; Stage 3 locked until Stage 2 completed)
  const [stageProgress, setStageProgress] = useState<StageProgressState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('quran_stage_progress');
        return saved ? JSON.parse(saved) : { stage1: false, stage2: false, stage3: false };
      } catch (e) {
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
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Surah & Ayah range selection (default: Al-Fatihah 1 to 7)
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(1);
  const [fromAyah, setFromAyah] = useState<number>(1);
  const [toAyah, setToAyah] = useState<number>(7);

  // Ayahs data
  const [ayahs, setAyahs] = useState<AyahItem[]>([]);
  const [isLoadingAyahs, setIsLoadingAyahs] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reciter & Repetition settings
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(RECITERS[0]);
  const [settings, setSettings] = useState<RepetitionSettings>({
    singleAyahRepeats: 3,
    linkRepeats: 3,
    finalReviewRepeats: 3,
    autoAdvance: true,
    playbackSpeed: 1.0,
    pauseBetweenAyahsSec: 2,
  });

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

  // Persist stage progress
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quran_stage_progress', JSON.stringify(stageProgress));
      } catch (e) {}
    }
  }, [stageProgress]);

  // Sync Dark Mode class with HTML element
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

  // Load Ayahs
  const loadSurah = useCallback(async (surahNum: number) => {
    setIsLoadingAyahs(true);
    setLoadError(null);
    try {
      const data = await fetchSurahAyahs(surahNum);
      setAyahs(data);
    } catch (err: any) {
      console.error('Failed to load surah ayahs:', err);
      setLoadError('تعذر تحميل نص السورة. يرجى التحقق من الاتصال بالإنترنت والمحاولة مجدداً.');
    } finally {
      setIsLoadingAyahs(false);
    }
  }, []);

  useEffect(() => {
    loadSurah(selectedSurahNumber);
  }, [selectedSurahNumber, loadSurah]);

  const currentSurahMeta: SurahMeta =
    SURAHS_LIST.find((s) => s.number === selectedSurahNumber) || SURAHS_LIST[0];

  // Safeguard: Clamp fromAyah and toAyah to surah bounds when ayahs load
  useEffect(() => {
    if (ayahs.length > 0) {
      const maxAyahs = ayahs.length;
      setFromAyah((prevFrom) => Math.max(1, Math.min(prevFrom, maxAyahs)));
      setToAyah((prevTo) => Math.max(1, Math.min(prevTo, maxAyahs)));
    }
  }, [ayahs]);

  // Handle Range Selection
  const handleSelectRange = (surahNum: number, from: number, to: number) => {
    setSelectedSurahNumber(surahNum);
    const validFrom = Math.min(from, to);
    const validTo = Math.max(from, to);
    setFromAyah(validFrom);
    setToAyah(validTo);

    // Reset progress for new range so the 3-stage sequence starts fresh
    setStageProgress({ stage1: false, stage2: false, stage3: false });
    setCurrentStage('stage1');
    setAutoStartMic(false);
  };

  // Stage transition handlers (automatic sequential progression)
  const handleAdvanceToStage2 = (options?: { autoStartMic?: boolean }) => {
    setStageProgress((prev) => ({ ...prev, stage1: true }));
    setCurrentStage('stage2');
    setAutoStartMic(!!options?.autoStartMic);
  };

  const handleAdvanceToStage3 = (options?: { autoStartMic?: boolean }) => {
    setStageProgress((prev) => ({ ...prev, stage2: true }));
    setCurrentStage('stage3');
    setAutoStartMic(!!options?.autoStartMic);
  };

  // Skip stage handlers
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
    // Prevent skipping ahead if previous stage is not completed
    if (stage === 'stage2' && !stageProgress.stage1) {
      alert('لا يمكنك الانتقال للمرحلة الثانية حتى تتم المرحلة الأولى أو تضغط على "تخطي المرحلة".');
      return;
    }
    if (stage === 'stage3' && !stageProgress.stage2) {
      alert('لا يمكنك الانتقال للمرحلة الثالثة حتى تتم المرحلة الثانية أو تضغط على "تخطي المرحلة".');
      return;
    }
    setCurrentStage(stage);
    setAutoStartMic(false);
  };

  // Save evaluation report and schedule spaced review
  const handleSaveReport = (rating: EvaluationRating, errorsCount: number, totalWords: number) => {
    let intervalDays = 5;
    if (rating === 'mutqan') intervalDays = 5;
    else if (rating === 'mutaraddid') intervalDays = 3;
    else intervalDays = 1; // mutafallit: reminder due next day

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
      accuracyPercent: totalWords > 0 ? Math.max(0, Math.round(((totalWords - errorsCount) / totalWords) * 100)) : 100,
      nextReviewDate: nextDate.toISOString(),
      reviewIntervalDays: intervalDays,
      status: 'pending',
    };

    setReports((prev) => {
      const updated = [newReport, ...prev];
      try {
        localStorage.setItem('quran_session_reports', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setStageProgress((prev) => ({ ...prev, stage3: true }));
  };

  // Launch a review test from the reports section
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
      } catch (e) {}
      return updated;
    });
  };

  const handleClearAllReports = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح جميع التقارير المسجلة؟')) {
      setReports([]);
      try {
        localStorage.removeItem('quran_session_reports');
      } catch (e) {}
    }
  };

  const dueReportsCount = reports.filter((r) => new Date(r.nextReviewDate) <= new Date()).length;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F9F6EE] dark:bg-[#111711] text-[#242D22] dark:text-[#F1F6F0] flex flex-col transition-colors selection:bg-[#52674B]/20 selection:text-[#1F271D] dark:selection:bg-[#738C6B]/40 dark:selection:text-white">
      {/* Top Bar Header with Full Screen Width & Zero Overflow */}
      <Header
        currentStage={currentStage}
        onSelectStage={handleManualSelectStage}
        completedStages={stageProgress}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenRangeSelector={() => setIsRangeModalOpen(true)}
        onOpenReports={() => setIsReportsModalOpen(true)}
        dueReportsCount={dueReportsCount}
        surahName={currentSurahMeta.name}
        fromAyah={fromAyah}
        toAyah={toAyah}
      />

      {/* Main Content Area - 100% Screen Width Responsive Canvas */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden px-3 sm:px-6 md:px-10 py-5 space-y-5">
        {/* Loading State */}
        {isLoadingAyahs && (
          <div className="w-full max-w-full flex flex-col items-center justify-center p-14 space-y-3 rounded-3xl bg-[#F6F2EA] dark:bg-[#182117] border border-[#DDD3BF] dark:border-[#273525] shadow-xs">
            <RefreshCw className="h-7 w-7 text-[#52674B] dark:text-[#C5D8C1] animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-[#2B3527] dark:text-[#F1F6F0] font-scheherazade">
                جاري فتح سورة {currentSurahMeta.name} في المصحف...
              </h3>
              <p className="text-xs text-[#6F7D6C] dark:text-[#9FB19B]">
                تحميل النص الشريف بالرسم العثماني
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoadingAyahs && loadError && (
          <div className="w-full max-w-full rounded-2xl p-5 bg-[#8C524B]/10 border border-[#8C524B]/30 text-center space-y-2">
            <AlertCircle className="h-7 w-7 text-[#8C524B] mx-auto" />
            <p className="text-xs text-[#8C524B] dark:text-[#F3C5C1] font-medium">
              {loadError}
            </p>
            <button
              onClick={() => loadSurah(selectedSurahNumber)}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#52674B] text-white hover:bg-[#43553D]"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Quran Stages */}
        {!isLoadingAyahs && !loadError && (
          <>
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
                autoStartMic={autoStartMic}
                onBackToStage2={() => handleManualSelectStage('stage2')}
                onBackToStage1={() => handleManualSelectStage('stage1')}
                onSkipStage={handleSkipStage3}
                onSaveReport={handleSaveReport}
                onOpenReports={() => setIsReportsModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-full border-t border-[#DDD3BF] dark:border-[#273525] bg-[#F6F2EA] dark:bg-[#182117] py-4 text-xs text-[#6F7D6C] dark:text-[#9FB19B] transition-colors">
        <div className="w-full max-w-full px-3 sm:px-6 md:px-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-right">
          <div className="flex items-center gap-2">
            <span className="font-scheherazade text-sm font-bold text-[#2B3527] dark:text-[#F1F6F0]">
              رتّـــل
            </span>
            <span>·</span>
            <span>طريقة التكرار المنهجي التراكمي للقرآن الكريم مع المتابعة الدورية</span>
          </div>

          <div className="flex items-center gap-3 text-[#7F8C7C] dark:text-[#8FA18B]">
            <span>برواية حفص عن عاصم</span>
            <span>·</span>
            <span>المصحف الشريف</span>
          </div>
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
    </div>
  );
}

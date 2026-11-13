import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { AyahFontSize, AyahItem, SurahMeta, WordToken, Reciter, StageMode, EvaluationRating, TajweedRuleInfo } from '../types/quran';
import { tokenizeAyah, toArabicDigits } from '../utils/arabic';
import { alignSpokenTranscript } from '../utils/alignment';
import { startReciterAyahPlayback } from '../utils/audioPlayback';
import { RECITERS } from '../data/quranData';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { MushafHeader } from './MushafHeader';
import {
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Trophy,
  Flame,
  Headphones,
  Target,
  Volume2,
  Eye,
  EyeOff,
  CheckCircle2,
  BookOpen,
  BarChart3,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface Stage3RealtimeRevealProps {
  surah: SurahMeta;
  ayahs: AyahItem[];
  fromAyah: number;
  toAyah: number;
  reciter?: Reciter;
  ayahFontSize?: AyahFontSize;
  showTajweedCues?: boolean;
  autoStartMic?: boolean;
  onBackToStage2: () => void;
  onBackToStage1: () => void;
  onSkipStage?: () => void;
  onSaveReport: (rating: EvaluationRating, errorsCount: number, totalWords: number) => void;
  onOpenReports: () => void;
}

interface ActiveTajweedCue {
  id: number;
  wordText: string;
  rule: TajweedRuleInfo;
}

function getTajweedCueStyles(category: TajweedRuleInfo['category']): {
  container: string;
  dot: string;
  label: string;
} {
  switch (category) {
    case 'madd':
      return {
        container:
          'bg-[#FBF6EA]/95 dark:bg-[#232015]/95 border-[#D8BE82]/70 text-[#7A5B18] dark:text-[#EAD092]',
        dot: 'bg-[#C89B3C]',
        label: 'مَدّ',
      };
    case 'ghunnah':
      return {
        container:
          'bg-[#EDF5EC]/95 dark:bg-[#172418]/95 border-[#7FA377]/70 text-[#2E522B] dark:text-[#AED4A8]',
        dot: 'bg-[#52824B]',
        label: 'غُنّة',
      };
    case 'qalqalah':
      return {
        container:
          'bg-[#EAF3F2]/95 dark:bg-[#142221]/95 border-[#6FA39E]/70 text-[#235450] dark:text-[#9FD3CE]',
        dot: 'bg-[#3F827B]',
        label: 'قَلْقَلة',
      };
    case 'idgham':
      return {
        container:
          'bg-[#EEF1F7]/95 dark:bg-[#191E29]/95 border-[#8B9AC2]/70 text-[#33416B] dark:text-[#B4C3EA]',
        dot: 'bg-[#566A9E]',
        label: 'إدْغام',
      };
    case 'ikhfa':
      return {
        container:
          'bg-[#F4EEF5]/95 dark:bg-[#221A24]/95 border-[#B28FB9]/70 text-[#5C3963] dark:text-[#D5B2DC]',
        dot: 'bg-[#875C90]',
        label: 'إخْفاء',
      };
    case 'iqlab':
      return {
        container:
          'bg-[#F8EFEA]/95 dark:bg-[#261C18]/95 border-[#C4967E]/70 text-[#6F412B] dark:text-[#E2B49D]',
        dot: 'bg-[#A3694D]',
        label: 'إقْلاب',
      };
    default:
      return {
        container:
          'bg-[#F6F2EA]/95 dark:bg-[#182117]/95 border-[#C5BAA5]/70 text-[#3D4D38] dark:text-[#C5D8C1]',
        dot: 'bg-[#52674B]',
        label: 'تَجْويد',
      };
  }
}

export const Stage3RealtimeReveal: React.FC<Stage3RealtimeRevealProps> = ({
  surah,
  ayahs,
  fromAyah,
  toAyah,
  reciter,
  ayahFontSize = 'small',
  showTajweedCues = true,
  autoStartMic = false,
  onBackToStage2,
  onBackToStage1,
  onSkipStage,
  onSaveReport,
  onOpenReports,
}) => {
  const [stageMode, setStageMode] = useState<StageMode>('test');
  const [activeWordIdx, setActiveWordIdx] = useState(0);
  const [revealedWordIds, setRevealedWordIds] = useState<Set<string>>(new Set());
  const [hintedWordIds, setHintedWordIds] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [playingAyahAudio, setPlayingAyahAudio] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<EvaluationRating | null>(null);
  const [activeTajweedCue, setActiveTajweedCue] = useState<ActiveTajweedCue | null>(null);

  const activeWordIdxRef = useRef(0);
  activeWordIdxRef.current = activeWordIdx;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const wordSpanRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const cancelAudioRef = useRef<(() => void) | null>(null);

  const selectedAyahs = useMemo(() => {
    return ayahs.filter((a) => a.numberInSurah >= fromAyah && a.numberInSurah <= toAyah);
  }, [ayahs, fromAyah, toAyah]);

  const allWords = useMemo(() => {
    const list: WordToken[] = [];
    selectedAyahs.forEach((ayah) => {
      const words = tokenizeAyah(ayah.text, ayah.numberInSurah);
      list.push(...words);
    });
    return list;
  }, [selectedAyahs]);

  const cueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cueCounterRef = useRef(0);

  const triggerTajweedCue = useCallback(
    (words: WordToken[]) => {
      if (!showTajweedCues) return;
      const withRule = [...words].reverse().find((w) => w.tajweedRule);
      if (!withRule || !withRule.tajweedRule) return;

      cueCounterRef.current += 1;
      setActiveTajweedCue({
        id: cueCounterRef.current,
        wordText: withRule.text,
        rule: withRule.tajweedRule,
      });

      if (cueTimerRef.current) {
        clearTimeout(cueTimerRef.current);
      }
      cueTimerRef.current = setTimeout(() => {
        setActiveTajweedCue(null);
      }, 2600);
    },
    [showTajweedCues]
  );

  useEffect(() => {
    if (!showTajweedCues) {
      setActiveTajweedCue(null);
      if (cueTimerRef.current) {
        clearTimeout(cueTimerRef.current);
        cueTimerRef.current = null;
      }
    }
  }, [showTajweedCues]);

  const resetRecitation = useCallback(() => {
    setActiveWordIdx(0);
    activeWordIdxRef.current = 0;
    setRevealedWordIds(new Set());
    setHintedWordIds(new Set());
    setStreak(0);
    setIsCompleted(false);
    setSelectedRating(null);
    setFeedback(null);
    setActiveTajweedCue(null);
    if (cueTimerRef.current) {
      clearTimeout(cueTimerRef.current);
      cueTimerRef.current = null;
    }
    if (cancelAudioRef.current) {
      cancelAudioRef.current();
      cancelAudioRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingAyahAudio(null);
    }
  }, []);

  useEffect(() => {
    resetRecitation();
  }, [surah.number, fromAyah, toAyah, resetRecitation]);

  useEffect(() => {
    return () => {
      if (cueTimerRef.current) {
        clearTimeout(cueTimerRef.current);
        cueTimerRef.current = null;
      }
      if (cancelAudioRef.current) {
        cancelAudioRef.current();
        cancelAudioRef.current = null;
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
      }
    };
  }, []);

  // Real-time stream alignment (multi-alternative, zero error alerting)
  const handleSpeechInput = useCallback(
    (spokenText: string, alternatives?: string[]) => {
      if (stageMode !== 'test' || allWords.length === 0 || isCompleted) return;

      const pointer = activeWordIdxRef.current;
      if (pointer >= allWords.length) return;

      const hypotheses = alternatives && alternatives.length > 0 ? alternatives : [spokenText];
      const { newPointer, matchedIds } = alignSpokenTranscript(allWords, pointer, hypotheses);

      if (matchedIds.length > 0 && newPointer > pointer) {
        const matchedSet = new Set(matchedIds);
        const matchedTokens = allWords.slice(pointer, newPointer).filter((w) => matchedSet.has(w.id));
        triggerTajweedCue(matchedTokens);

        setRevealedWordIds((prev) => {
          const next = new Set(prev);
          matchedIds.forEach((id) => next.add(id));
          return next;
        });
        setFeedback(null);

        activeWordIdxRef.current = newPointer;
        setActiveWordIdx(newPointer);
        setStreak((prev) => prev + matchedIds.length);

        if (newPointer < allWords.length) {
          const container = scrollContainerRef.current;
          const nextEl = wordSpanRefs.current[allWords[newPointer].id];
          if (container && nextEl) {
            const cRect = container.getBoundingClientRect();
            const eRect = nextEl.getBoundingClientRect();
            if (eRect.bottom > cRect.bottom - 24 || eRect.top < cRect.top + 16) {
              const targetTop = nextEl.offsetTop - container.offsetTop - container.clientHeight / 3;
              container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
            }
          }
        } else {
          setIsCompleted(true);
          setFeedback('اللهم بارك! أتممت التسميع الكامل عن ظهر قلب. حدد تقييم حفظك لجدولة المراجعة.');
        }
      }
    },
    [stageMode, allWords, isCompleted, triggerTajweedCue]
  );

  const {
    isListening,
    audioLevel,
    permissionError,
    interimTranscript,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: 'ar-SA',
    onTranscript: (text, _isFinal, alternatives) => handleSpeechInput(text, alternatives),
    onError: (err) => setFeedback(err),
  });

  const handleSwitchMode = (newMode: StageMode) => {
    if (newMode === stageMode) return;
    if (newMode === 'listen') {
      stopListening();
    }
    if (cancelAudioRef.current) {
      cancelAudioRef.current();
      cancelAudioRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingAyahAudio(null);
    }
    setStageMode(newMode);
    setFeedback(null);
  };

  useEffect(() => {
    if (stageMode === 'test' && autoStartMic && !isListening) {
      startListening();
    }
  }, [stageMode, autoStartMic]);

  const playAyahAudio = (ayahNum: number) => {
    if (cancelAudioRef.current) {
      cancelAudioRef.current();
      cancelAudioRef.current = null;
    }

    if (playingAyahAudio === ayahNum) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      setPlayingAyahAudio(null);
      return;
    }

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
    }

    const activeReciter = reciter || RECITERS[0];
    cancelAudioRef.current = startReciterAyahPlayback({
      audio: audioPlayerRef.current,
      reciter: activeReciter,
      surahNumber: surah.number,
      ayahNum,
      onStarted: () => setPlayingAyahAudio(ayahNum),
      onEnded: () => setPlayingAyahAudio(null),
      onError: () => {
        setPlayingAyahAudio(null);
        setFeedback('تعذر تشغيل تلاوة الآية');
      },
    });
  };

  const revealAllWords = () => {
    setRevealedWordIds(new Set(allWords.map((w) => w.id)));
  };

  const hideAllWords = () => {
    setRevealedWordIds(new Set());
  };

  const giveHint = () => {
    if (activeWordIdx < allWords.length) {
      const cur = allWords[activeWordIdx];
      setHintedWordIds((prev) => new Set(prev).add(cur.id));
      setRevealedWordIds((prev) => new Set(prev).add(cur.id));
      const next = activeWordIdx + 1;
      setActiveWordIdx(next);
      activeWordIdxRef.current = next;
      setFeedback(`تلميح: "${cur.text}"`);
      if (next >= allWords.length) {
        setIsCompleted(true);
      }
    }
  };

  const manualStepNext = () => {
    if (activeWordIdx < allWords.length) {
      const cur = allWords[activeWordIdx];
      setRevealedWordIds((prev) => new Set(prev).add(cur.id));
      const next = activeWordIdx + 1;
      setActiveWordIdx(next);
      activeWordIdxRef.current = next;
      if (next >= allWords.length) {
        setIsCompleted(true);
      }
    }
  };

  const handleRateSession = (rating: EvaluationRating) => {
    setSelectedRating(rating);
    onSaveReport(rating, 0, allWords.length);
    if (rating === 'mutqan') {
      setFeedback('ما شاء الله! تم تقييم الحفظ: متقن. تم تحديد موعد الاختبار القادم بعد 5 أيام.');
    } else if (rating === 'mutaraddid') {
      setFeedback('أحسنت! تم تقييم الحفظ: متردد. تم جدولة اختبارات دورية كل 3 أيام.');
    } else {
      setFeedback('تم تسجيل التذكير: متفلت. ينصح بإعادة القراءة مع الشيخ لتثبيت الحفظ.');
    }
  };

  const progressPercent = allWords.length > 0 ? Math.round((revealedWordIds.size / allWords.length) * 100) : 0;
  const currentActiveWord = activeWordIdx < allWords.length ? allWords[activeWordIdx] : null;
  const currentTajweedRule = currentActiveWord?.tajweedRule;

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-1.5">
      {/* Compact Stationary Top Status Bar */}
      <div className="shrink-0 w-full rounded-xl bg-[#F6F2EA] dark:bg-[#182117] border border-[#DDD3BF] dark:border-[#273525] px-2.5 py-1.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#52674B] text-white shrink-0">
              {stageMode === 'test' ? <Sparkles className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-xs font-bold text-[#2B3527] dark:text-[#F1F6F0] truncate">
                {stageMode === 'test' ? 'التسميع الغيبي' : 'استذكار ذاتي'}
              </span>
              {showTajweedCues && currentTajweedRule && stageMode === 'test' && currentActiveWord && (
                <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#52674B]/10 text-[10px] font-bold text-[#3D4D38] dark:text-[#C5D8C1]">
                  <BookOpen className="h-3 w-3 text-[#52674B]" />
                  <span>{currentTajweedRule.ruleName}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap justify-end">
            <div className="flex items-center gap-0.5 p-0.5 bg-[#EFE8D9] dark:bg-[#1C261B] rounded-lg border border-[#C7B99F] dark:border-[#384B36]">
              <button
                onClick={() => handleSwitchMode('listen')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  stageMode === 'listen'
                    ? 'bg-[#52674B] text-white shadow-xs'
                    : 'text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2]'
                }`}
              >
                <Headphones className="h-3 w-3" />
                <span>استذكار</span>
              </button>
              <button
                onClick={() => handleSwitchMode('test')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  stageMode === 'test'
                    ? 'bg-[#52674B] text-white shadow-xs'
                    : 'text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2]'
                }`}
              >
                <Target className="h-3 w-3" />
                <span>تسميع</span>
              </button>
            </div>

            {stageMode === 'test' && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#EFE8D9] dark:bg-[#1C261B] border border-[#C7B99F] dark:border-[#384B36] text-[11px]">
                <Flame className="h-3 w-3 text-[#52674B] dark:text-[#A4BA9E]" />
                <span className="font-bold text-[#2B3527] dark:text-[#F1F6F0] tabular-nums">
                  {toArabicDigits(streak)}
                </span>
              </div>
            )}

            <button
              onClick={() => {
                if (onSkipStage) onSkipStage();
                setIsCompleted(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#43553D] bg-[#52674B] text-white hover:bg-[#43553D] shadow-xs transition-colors"
            >
              <span>تقييم</span>
              <CheckCircle2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Slim Progress Bar */}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[10px] text-[#6F7D6C] dark:text-[#9FB19B] tabular-nums shrink-0">
            {revealedWordIds.size}/{allWords.length}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-[#E5DCCB] dark:bg-[#233021] overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-[#52674B] to-[#738C6B] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="tabular-nums text-[10px] font-bold text-[#52674B] dark:text-[#C5D8C1] shrink-0">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Permission warning */}
      {stageMode === 'test' && permissionError && (
        <div className="shrink-0 w-full rounded-xl p-2.5 bg-[#ECE4D4] dark:bg-[#1D271B] border border-[#D5CABB] dark:border-[#2F3F2D] text-xs text-[#3D4D38] dark:text-[#C5D8C1] flex items-center justify-between">
          <span>{permissionError}</span>
          <button
            onClick={startListening}
            className="px-3 py-1 rounded-lg bg-[#52674B] text-white font-bold"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Evaluation Card */}
      {isCompleted && (
        <div className="shrink-0 w-full rounded-2xl p-4 bg-[#EDF3EB] dark:bg-[#1C271A] border border-[#52674B]/40 text-center space-y-3 shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5 text-[#52674B] dark:text-[#C5D8C1]" />
            <h3 className="text-lg font-bold text-[#2B3527] dark:text-[#F1F6F0] font-scheherazade">
              هنيئاً لك! أتممت تسميع سورة {surah.name} ({fromAyah} - {toAyah})
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2.5 max-w-2xl mx-auto">
            <button
              onClick={() => handleRateSession('mutqan')}
              className={`p-3 rounded-xl border text-right transition-colors ${
                selectedRating === 'mutqan'
                  ? 'border-[#52674B] bg-[#52674B] text-white'
                  : 'border-[#52674B]/40 bg-white dark:bg-[#141C13] hover:border-[#52674B] text-[#2B3527] dark:text-[#F1F6F0]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">مُتْقَـن</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="text-[11px] opacity-85 mt-1">اختبار كل ٥ أيام</div>
            </button>

            <button
              onClick={() => handleRateSession('mutaraddid')}
              className={`p-3 rounded-xl border text-right transition-colors ${
                selectedRating === 'mutaraddid'
                  ? 'border-[#B58238] bg-[#B58238] text-white'
                  : 'border-[#E2B778]/50 bg-white dark:bg-[#141C13] hover:border-[#B58238] text-[#2B3527] dark:text-[#F1F6F0]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">مُتَـرَدِّد</span>
                <Clock className="h-4 w-4" />
              </div>
              <div className="text-[11px] opacity-85 mt-1">اختبار كل ٣ أيام</div>
            </button>

            <button
              onClick={() => handleRateSession('mutafallit')}
              className={`p-3 rounded-xl border text-right transition-colors ${
                selectedRating === 'mutafallit'
                  ? 'border-[#8C524B] bg-[#8C524B] text-white'
                  : 'border-[#8C524B]/40 bg-white dark:bg-[#141C13] hover:border-[#8C524B] text-[#2B3527] dark:text-[#F1F6F0]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">مُتَفَـلِّت</span>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="text-[11px] opacity-85 mt-1">تذكير لإعادة الحفظ</div>
            </button>
          </div>

          <div className="flex items-center justify-center gap-2.5 flex-wrap">
            <button
              onClick={onOpenReports}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#EFE8D9] dark:bg-[#1F2A1E] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#C7B99F] dark:border-[#384B36]"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>التقارير</span>
            </button>
            <button
              onClick={resetRecitation}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] text-[#3D4D38] dark:text-[#C5D8C1]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>إعادة التسميع</span>
            </button>
            <button
              onClick={onBackToStage1}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#52674B] text-white hover:bg-[#43553D]"
            >
              حفظ مقدار جديد
            </button>
          </div>
        </div>
      )}

      {/* Maximized Scrollable Mushaf Canvas inside Fixed Screen + Gentle Tajweed Visual Cue */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col">
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto w-full rounded-2xl mushaf-canvas p-3 sm:p-5 lg:p-6"
        >
        <MushafHeader
          surah={surah}
          ayahs={selectedAyahs}
          riwayah={reciter?.riwayah}
          ayahFontSize={ayahFontSize}
          onClickBasmalah={() => playAyahAudio(0)}
        />

        <div
          className={`font-quran text-center text-[#232B20] dark:text-[#F3F8F2] select-none ${
            ayahFontSize === 'large'
              ? 'text-2xl sm:text-3xl leading-[2.35]'
              : ayahFontSize === 'medium'
              ? 'text-xl sm:text-2xl leading-[2.25]'
              : 'text-lg sm:text-xl lg:text-[22px] leading-[2.15]'
          }`}
          dir="rtl"
        >
          {selectedAyahs.map((ayah, idx) => {
            const ayahWords = allWords.filter((w) => w.ayahNumber === ayah.numberInSurah);
            const isAyahFinished = ayahWords.every((w) => revealedWordIds.has(w.id));
            const isPlayingThis = playingAyahAudio === ayah.numberInSurah;
            const prevPage = idx > 0 ? selectedAyahs[idx - 1]?.pageNumber : ayah.pageNumber;
            const showPageDivider =
              idx > 0 && typeof ayah.pageNumber === 'number' && prevPage !== ayah.pageNumber;

            return (
              <React.Fragment key={ayah.numberInSurah}>
                {showPageDivider && (
                  <span className="block my-2 text-[10px] font-ui font-bold text-[#7B8877] dark:text-[#8DA08A]">
                    — صفحة {toArabicDigits(ayah.pageNumber!)} —
                  </span>
                )}
                <span className="inline">
                  {ayahWords.map((word) => {
                    const isRevealed = revealedWordIds.has(word.id);
                    const isHinted = hintedWordIds.has(word.id);
                    const isTargetNext = stageMode === 'test' && currentActiveWord?.id === word.id;

                    return (
                      <span
                        key={word.id}
                        ref={(el) => {
                          wordSpanRefs.current[word.id] = el;
                        }}
                        onClick={() => {
                          if (stageMode === 'listen') {
                            setRevealedWordIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(word.id)) next.delete(word.id);
                              else next.add(word.id);
                              return next;
                            });
                          } else if (stageMode === 'test' && !isRevealed) {
                            setRevealedWordIds((prev) => new Set(prev).add(word.id));
                            if (currentActiveWord?.id === word.id) {
                              const nextIdx = activeWordIdx + 1;
                              setActiveWordIdx(nextIdx);
                              activeWordIdxRef.current = nextIdx;
                              if (nextIdx >= allWords.length) {
                                setIsCompleted(true);
                              }
                            }
                          }
                        }}
                        className={`relative inline-block px-1 py-0 mx-0.5 rounded-lg transition-colors duration-200 ${
                          isRevealed
                            ? isHinted
                              ? 'bg-[#52674B]/15 text-[#52674B] dark:text-[#C5D8C1] ring-1 ring-[#52674B]/30'
                              : 'bg-[#52674B]/20 dark:bg-[#738C6B]/40 text-[#1F271D] dark:text-white font-bold ring-1 ring-[#52674B]/30'
                            : isTargetNext
                            ? 'bg-[#E2D8C3] dark:bg-[#2A3728] ring-2 ring-[#52674B] text-[#7F8C7C]'
                            : 'cursor-pointer hover:bg-[#D5CABB]/40'
                        }`}
                      >
                        <span
                          className={`transition-opacity duration-200 ${
                            isRevealed ? 'opacity-100' : 'opacity-0 select-none'
                          }`}
                        >
                          {word.text}
                        </span>

                        {!isRevealed && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="w-full border-b-2 border-dashed -mb-1.5 border-[#52674B]/40 dark:border-[#738C6B]/40" />
                          </span>
                        )}
                      </span>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => playAyahAudio(ayah.numberInSurah)}
                    className={`inline-flex items-center gap-1 mx-1 px-1.5 py-0 rounded-lg transition-colors cursor-pointer ayah-number font-normal ${
                      ayahFontSize === 'large'
                        ? 'text-xl sm:text-2xl'
                        : ayahFontSize === 'medium'
                        ? 'text-lg sm:text-xl'
                        : 'text-base sm:text-lg'
                    } ${
                      isPlayingThis
                        ? 'bg-[#52674B] text-white ring-2 ring-[#738C6B]/40'
                        : isAyahFinished
                        ? 'text-[#52674B] dark:text-[#A4BA9E] opacity-100 hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E]'
                        : 'text-[#B8C7B5] dark:text-[#384835] opacity-70 hover:opacity-100 hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E]'
                    }`}
                    title={`الآية ${toArabicDigits(ayah.numberInSurah)} (انقر للاستماع)`}
                  >
                    <span>۝{toArabicDigits(ayah.numberInSurah)}</span>
                    {isPlayingThis && <Volume2 className="h-3.5 w-3.5 inline" />}
                  </button>{' '}
                </span>
              </React.Fragment>
            );
          })}
          </div>
        </div>

        {/* Gentle Visual Tajweed Cue Widget (no layout shift, soft transition) */}
        {showTajweedCues && stageMode === 'test' && activeTajweedCue && (() => {
          const cueStyle = getTajweedCueStyles(activeTajweedCue.rule.category);
          return (
            <div
              key={activeTajweedCue.id}
              className={`pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 max-w-[92%] sm:max-w-md px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-sm transition-opacity duration-300 flex items-center gap-2 ${cueStyle.container}`}
              dir="rtl"
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${cueStyle.dot}`} />
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/5 dark:bg-white/10 shrink-0">
                {cueStyle.label}
              </span>
              <span className="text-[11px] font-bold truncate">
                {activeTajweedCue.rule.ruleName}
              </span>
              <span className="font-quran text-sm font-bold shrink-0 opacity-90">
                «{activeTajweedCue.wordText}»
              </span>
              <span className="hidden sm:inline text-[10px] opacity-80 truncate">
                · {activeTajweedCue.rule.tip}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Compact Stationary Bottom Microphone Bar */}
      <div className="shrink-0 w-full rounded-xl bg-[#F9F6EE] dark:bg-[#162015] border border-[#DDD4C1] dark:border-[#273525] px-2.5 py-1.5 shadow-xs">
        <div className="w-full flex flex-wrap items-center justify-between gap-1.5">
          {stageMode === 'test' ? (
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 transition-colors ${
                  isListening
                    ? 'bg-[#52674B] text-white ring-2 ring-[#738C6B]/40'
                    : 'bg-[#ECE4D4] dark:bg-[#202B1E] text-[#556450] dark:text-[#9FB19B]'
                }`}
              >
                <Mic className="h-3.5 w-3.5" />
              </div>

              <div className="min-w-0 flex items-center gap-2">
                {isListening && (
                  <div className="flex items-center gap-0.5 h-3">
                    {[1, 2, 3, 4].map((bar) => (
                      <div
                        key={bar}
                        className="w-0.5 bg-[#52674B] dark:bg-[#738C6B] rounded-full transition-all"
                        style={{
                          height: `${Math.max(3, (audioLevel / 100) * 12 * (bar * 0.35))}px`,
                        }}
                      />
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-[#6F7D6C] dark:text-[#9FB19B] truncate max-w-[180px] sm:max-w-[260px]">
                  {interimTranscript ? (
                    <span className="font-bold text-[#52674B] dark:text-[#C5D8C1]">
                      "{interimTranscript}"
                    </span>
                  ) : feedback ? (
                    feedback
                  ) : currentActiveWord ? (
                    <span>اقرأ الآيات غيباً</span>
                  ) : (
                    'اكتمل المقدار!'
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#52674B]/20 text-[#52674B] dark:text-[#C5D8C1]">
                <Headphones className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-semibold text-[#6F7D6C] dark:text-[#9FB19B]">
                {playingAyahAudio ? `الآية ${playingAyahAudio}` : 'انقر على الآية للاستماع'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 p-0.5 rounded-xl border border-[#C7B99F] dark:border-[#384B36] bg-[#EFE8D9]/80 dark:bg-[#1C261B] mx-auto flex-wrap">
            {stageMode === 'test' ? (
              <>
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors shadow-xs ${
                    isListening
                      ? 'bg-[#8C463F] hover:bg-[#7A3B35] border-[#7A3B35] text-white'
                      : 'bg-[#52674B] hover:bg-[#43553D] border-[#43553D] text-white'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-3.5 w-3.5" />
                      <span>إيقاف</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-3.5 w-3.5" />
                      <span>ابدأ</span>
                    </>
                  )}
                </button>

                <button
                  onClick={giveHint}
                  disabled={activeWordIdx >= allWords.length}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg border border-[#C7B99F] dark:border-[#384B36] bg-[#F9F6EE] dark:bg-[#141A13] hover:bg-[#E4DAC5] text-[#3D4D38] dark:text-[#C5D8C1] disabled:opacity-30"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>تلميح</span>
                </button>

                <button
                  onClick={manualStepNext}
                  disabled={activeWordIdx >= allWords.length}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg border border-[#C7B99F] dark:border-[#384B36] bg-[#F9F6EE] dark:bg-[#141A13] hover:bg-[#E4DAC5] text-[#3D4D38] dark:text-[#C5D8C1] disabled:opacity-30"
                >
                  <span>تخطي ⇥</span>
                </button>

                <button
                  onClick={resetRecitation}
                  className="p-1.5 rounded-lg border border-[#C7B99F] dark:border-[#384B36] bg-[#F9F6EE] dark:bg-[#141A13] text-[#485643] dark:text-[#B7C7B2] hover:bg-[#E4DAC5] dark:hover:bg-[#202B1E]"
                  title="إعادة"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={revealAllWords}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#F9F6EE] dark:bg-[#141A13] hover:bg-[#E4DAC5] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#C7B99F] dark:border-[#384B36]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>كشف</span>
                </button>
                <button
                  onClick={hideAllWords}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#F9F6EE] dark:bg-[#141A13] hover:bg-[#E4DAC5] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#C7B99F] dark:border-[#384B36]"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>إخفاء</span>
                </button>
              </>
            )}
          </div>

          <button
            onClick={onBackToStage2}
            className="text-[11px] font-bold text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2] dark:hover:text-white px-2.5 py-1 rounded-lg border border-[#C7B99F] dark:border-[#384B36] bg-[#EFE8D9] dark:bg-[#1C261B]"
          >
            ← للمرحلة ٢
          </button>
        </div>
      </div>
    </div>
  );
};

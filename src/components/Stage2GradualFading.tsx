import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { AyahItem, SurahMeta, WordToken, Reciter, StageMode } from '../types/quran';
import { tokenizeAyah, normalizeArabic, getAyahAudioUrl } from '../utils/arabic';
import { isTajweedSpeechMatch } from '../utils/tajweed';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import {
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  HelpCircle,
  CheckCircle,
  ChevronLeft,
  Headphones,
  Target,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

interface Stage2GradualFadingProps {
  surah: SurahMeta;
  ayahs: AyahItem[];
  fromAyah: number;
  toAyah: number;
  reciter?: Reciter;
  autoStartMic?: boolean;
  onAdvanceToStage3: (options?: { autoStartMic?: boolean }) => void;
  onSkipStage?: () => void;
  onBackToStage1: () => void;
}

const FADING_STEPS = [0, 20, 40, 60, 80];

export const Stage2GradualFading: React.FC<Stage2GradualFadingProps> = ({
  surah,
  ayahs,
  fromAyah,
  toAyah,
  reciter,
  autoStartMic = false,
  onAdvanceToStage3,
  onSkipStage,
  onBackToStage1,
}) => {
  const [stageMode, setStageMode] = useState<StageMode>('test'); // 'test' (اختبار بالميكروفون) | 'listen' (استماع ومراجعة)
  const [repetitionCount, setRepetitionCount] = useState(1);
  const [fadingPercent, setFadingPercent] = useState<number>(20);
  const [activeWordIdx, setActiveWordIdx] = useState(0);
  const [revealedWordIds, setRevealedWordIds] = useState<Set<string>>(new Set());
  const [matchedWordIds, setMatchedWordIds] = useState<Set<string>>(new Set());
  const [hintedWordIds, setHintedWordIds] = useState<Set<string>>(new Set());
  const [errorWordIds, setErrorWordIds] = useState<Set<string>>(new Set());
  const [errorDetails, setErrorDetails] = useState<{ wordId: string; expected: string; spoken: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isRoundCompleted, setIsRoundCompleted] = useState(false);
  const [autoTransitionCountdown, setAutoTransitionCountdown] = useState<number | null>(null);
  const [playingAyahAudio, setPlayingAyahAudio] = useState<number | null>(null);

  const autoTransitionTimerRef = useRef<any>(null);
  const advanceTimeoutRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const wordSpanRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const activeWordIdxRef = useRef(0);
  activeWordIdxRef.current = activeWordIdx;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoTransitionTimerRef.current) {
        clearInterval(autoTransitionTimerRef.current);
        autoTransitionTimerRef.current = null;
      }
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
      }
    };
  }, []);

  const selectedAyahs = useMemo(() => {
    return ayahs.filter(
      (a) => a.numberInSurah >= fromAyah && a.numberInSurah <= toAyah
    );
  }, [ayahs, fromAyah, toAyah]);

  const allWords = useMemo(() => {
    const list: WordToken[] = [];
    selectedAyahs.forEach((ayah) => {
      const words = tokenizeAyah(ayah.text, ayah.numberInSurah);
      list.push(...words);
    });
    return list;
  }, [selectedAyahs]);

  // Generate hidden word IDs based on fading percentage
  const hiddenWordIds = useMemo(() => {
    const set = new Set<string>();
    if (fadingPercent === 0 || allWords.length === 0) return set;

    const hideCount = Math.round((fadingPercent / 100) * allWords.length);
    if (hideCount <= 0) return set;

    const interval = allWords.length / hideCount;
    for (let i = 0; i < hideCount; i++) {
      const idx = Math.min(allWords.length - 1, Math.floor(i * interval + (i % 2 === 0 ? 0 : 0.5)));
      set.add(allWords[idx].id);
    }
    return set;
  }, [allWords, fadingPercent]);

  const resetRound = useCallback((newPercent?: number) => {
    setActiveWordIdx(0);
    setMatchedWordIds(new Set());
    setRevealedWordIds(new Set());
    setHintedWordIds(new Set());
    setErrorWordIds(new Set());
    setErrorDetails(null);
    setIsRoundCompleted(false);
    setAutoTransitionCountdown(null);
    if (autoTransitionTimerRef.current) {
      clearInterval(autoTransitionTimerRef.current);
      autoTransitionTimerRef.current = null;
    }
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingAyahAudio(null);
    }
    setFeedback(null);
    if (newPercent !== undefined) {
      setFadingPercent(newPercent);
    }
  }, []);

  const advanceToNextRepetition = useCallback(() => {
    const nextRep = repetitionCount + 1;
    setRepetitionCount(nextRep);
    const curIdx = FADING_STEPS.indexOf(fadingPercent);
    const nextIdx = Math.min(FADING_STEPS.length - 1, (curIdx !== -1 ? curIdx : 0) + 1);
    const nextPercent = FADING_STEPS[nextIdx];
    resetRound(nextPercent);
    setFeedback(`بدأت التكرار ${nextRep} بنسبة إخفاء ${nextPercent}%`);
  }, [repetitionCount, fadingPercent, resetRound]);

  // Real-Time Stream Speech Alignment (Instantly matches & reveals words without lookahead or false alarms)
  const handleSpeechInput = useCallback(
    (spokenText: string) => {
      if (stageMode !== 'test' || allWords.length === 0 || isRoundCompleted) return;

      const normSpoken = normalizeArabic(spokenText);
      const spokenTokens = normSpoken.split(/\s+/).filter(Boolean);
      if (spokenTokens.length === 0) return;

      let pointer = activeWordIdxRef.current;
      if (pointer >= allWords.length) return;

      // 1. Scan spokenTokens to see if the current expected word (allWords[pointer]) is matched
      let matchTokenIdx = -1;
      for (let i = 0; i < spokenTokens.length; i++) {
        const token = spokenTokens[i];
        const currentTarget = allWords[pointer];
        const nextTarget = pointer + 1 < allWords.length ? allWords[pointer + 1] : undefined;

        if (isTajweedSpeechMatch(currentTarget, token, nextTarget)) {
          matchTokenIdx = i;
          break;
        }
      }

      if (matchTokenIdx !== -1) {
        // Matched! Now greedily match all subsequent consecutive tokens
        let newlyMatchedCount = 0;
        let p = pointer;
        let t = matchTokenIdx;
        const newlyMatchedIds: string[] = [];

        while (p < allWords.length && t < spokenTokens.length) {
          const target = allWords[p];
          const nextTarget = p + 1 < allWords.length ? allWords[p + 1] : undefined;
          const token = spokenTokens[t];

          if (isTajweedSpeechMatch(target, token, nextTarget)) {
            newlyMatchedIds.push(target.id);

            // If token is a compound (e.g. "الحمدلله" or "بسمالله") that also matches nextTarget:
            if (nextTarget && token.startsWith(target.cleanText)) {
              const rem = token.slice(target.cleanText.length);
              if (rem === nextTarget.cleanText || rem === normalizeArabic(nextTarget.text)) {
                newlyMatchedIds.push(nextTarget.id);
                p++;
                newlyMatchedCount++;
              }
            }

            p++;
            t++;
            newlyMatchedCount++;
          } else {
            break;
          }
        }

        if (newlyMatchedCount > 0) {
          // Instantly reveal and mark matched words
          setMatchedWordIds((prev) => {
            const next = new Set(prev);
            newlyMatchedIds.forEach((id) => next.add(id));
            return next;
          });
          setRevealedWordIds((prev) => {
            const next = new Set(prev);
            newlyMatchedIds.forEach((id) => next.add(id));
            return next;
          });

          // Clear any errors on matched words
          setErrorWordIds((prev) => {
            const next = new Set(prev);
            newlyMatchedIds.forEach((id) => next.delete(id));
            return next;
          });
          setErrorDetails(null);
          setFeedback(null);

          pointer = p;
          activeWordIdxRef.current = pointer;
          setActiveWordIdx(pointer);

          // Scroll next target into view smoothly
          if (pointer < allWords.length) {
            const nextEl = wordSpanRefs.current[allWords[pointer].id];
            if (nextEl) {
              nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }

          if (pointer >= allWords.length) {
            setIsRoundCompleted(true);

            if (fadingPercent >= 80) {
              let count = 2;
              setAutoTransitionCountdown(count);
              autoTransitionTimerRef.current = setInterval(() => {
                count -= 1;
                if (count > 0) {
                  setAutoTransitionCountdown(count);
                } else {
                  clearInterval(autoTransitionTimerRef.current);
                  autoTransitionTimerRef.current = null;
                  setAutoTransitionCountdown(null);
                  onAdvanceToStage3({ autoStartMic: true });
                }
              }, 1000);
            } else {
              setFeedback(`أحسنت! أتممت هذا التكرار بنجاح. جاري رفع نسبة الإخفاء...`);
              if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
              advanceTimeoutRef.current = setTimeout(() => {
                advanceToNextRepetition();
              }, 1500);
            }
          }
        }
      } else {
        // Expected word was not matched in this speech chunk
        // Check if user spoke a distinct mismatched word (and not just an earlier word from the ongoing phrase)
        const lastSpoken = spokenTokens[spokenTokens.length - 1];
        if (lastSpoken && lastSpoken.length >= 2) {
          const isPriorWord =
            (pointer > 0 && isTajweedSpeechMatch(allWords[pointer - 1], lastSpoken)) ||
            (pointer > 1 && isTajweedSpeechMatch(allWords[pointer - 2], lastSpoken));

          const isIntroOrClosing = [
            'اعوذ', 'بالله', 'من', 'الشيطان', 'الرجيم', 'بسم', 'الله', 'الرحمن', 'الرحيم',
            'امين', 'صدق', 'العظيم'
          ].includes(lastSpoken);

          if (!isPriorWord && !isIntroOrClosing) {
            const currentTarget = allWords[pointer];
            setErrorWordIds((prev) => new Set(prev).add(currentTarget.id));
            setErrorDetails({
              wordId: currentTarget.id,
              expected: currentTarget.text,
              spoken: lastSpoken,
            });
            setFeedback(`خطأ في النطق: نُطِقَت "${lastSpoken}" والمطلوب: "${currentTarget.text}"`);
          }
        }
      }
    },
    [stageMode, allWords, isRoundCompleted, fadingPercent, onAdvanceToStage3, advanceToNextRepetition]
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
    onTranscript: (text) => handleSpeechInput(text),
    onError: (err) => setFeedback(err),
  });

  // Switch mode handler
  const handleSwitchMode = (newMode: StageMode) => {
    if (newMode === stageMode) return;
    if (newMode === 'listen') {
      stopListening();
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingAyahAudio(null);
    }
    setStageMode(newMode);
    setFeedback(null);
    setErrorDetails(null);
  };

  // Auto-start microphone if passed from previous stage in Test mode
  useEffect(() => {
    if (stageMode === 'test' && autoStartMic && !isListening) {
      startListening();
    }
  }, [stageMode, autoStartMic]);

  // Play Sheikh audio for a specific Ayah in Listen / Review mode
  const playAyahAudio = (ayahNum: number) => {
    const subfolder = reciter?.subfolder || 'Husary_Muallim_128kbps';

    if (playingAyahAudio === ayahNum) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAyahAudio(null);
      return;
    }

    const url = getAyahAudioUrl(subfolder, surah.number, ayahNum);
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
    }
    const audio = audioPlayerRef.current;
    audio.src = url;
    audio.onended = () => setPlayingAyahAudio(null);
    audio.onerror = () => {
      setPlayingAyahAudio(null);
      setFeedback('تعذر تشغيل تلاوة الآية');
    };
    audio
      .play()
      .then(() => setPlayingAyahAudio(ayahNum))
      .catch(() => setPlayingAyahAudio(null));
  };

  // Clear / Undo mistake for a specific word
  const clearErrorForWord = (wordId: string) => {
    setErrorWordIds((prev) => {
      const next = new Set(prev);
      next.delete(wordId);
      return next;
    });
    setErrorDetails(null);
    setFeedback(null);
  };

  // Reveal all words in Listen/Review mode
  const revealAllWords = () => {
    const allIds = new Set(allWords.map((w) => w.id));
    setRevealedWordIds(allIds);
    setFeedback('تم كشف جميع الكلمات للمراجعة');
  };

  // Hide words back according to fading level
  const hideAllWords = () => {
    setRevealedWordIds(new Set());
    setFeedback('تم تطبيق نسبة الإخفاء');
  };

  const giveHint = () => {
    if (activeWordIdx < allWords.length) {
      const cur = allWords[activeWordIdx];
      clearErrorForWord(cur.id);
      setHintedWordIds((prev) => new Set(prev).add(cur.id));
      setRevealedWordIds((prev) => new Set(prev).add(cur.id));
      setFeedback(`تلميح: "${cur.text}"`);
    }
  };

  const manualStepNext = () => {
    if (activeWordIdx < allWords.length) {
      const cur = allWords[activeWordIdx];
      clearErrorForWord(cur.id);
      setMatchedWordIds((prev) => new Set(prev).add(cur.id));
      setRevealedWordIds((prev) => new Set(prev).add(cur.id));
      const next = activeWordIdx + 1;
      setActiveWordIdx(next);

      if (next >= allWords.length) {
        setIsRoundCompleted(true);
      }
    }
  };

  const currentActiveWord = activeWordIdx < allWords.length ? allWords[activeWordIdx] : null;
  const matchPercent = allWords.length > 0 ? Math.round((matchedWordIds.size / allWords.length) * 100) : 0;
  const currentTajweedRule = currentActiveWord?.tajweedRule;

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Status Bar with Mode Switcher & Skip Button */}
      <div className="w-full max-w-full rounded-2xl bg-[#F6F2EA] dark:bg-[#182117] border border-[#DDD3BF] dark:border-[#273525] p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#52674B] text-white shadow-xs shrink-0">
              {stageMode === 'test' ? <Mic className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                  {stageMode === 'test'
                    ? `التكرار رقم ${repetitionCount} · نسبة الإخفاء: ${fadingPercent}%`
                    : `وضع الاستماع والمراجعة الذاتية · إخفاء ${fadingPercent}%`}
                </span>
                {fadingPercent >= 80 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#52674B] text-white">
                    الحد الأقصى للإخفاء
                  </span>
                )}
                {errorWordIds.size > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>تنبيه خطأ ({errorWordIds.size})</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6F7D6C] dark:text-[#9FB19B] mt-0.5">
                {stageMode === 'test'
                  ? 'اقرأ بالتجويد الدقيق؛ لن تظهر الكلمة إلا بنطقها الصحيح، ويُلوّن الخطأ بالأحمر مع إمكانية إلغائه.'
                  : 'استمع للتلاوة بالضغط على رقم الآية أو راجع الكلمات واكشفها بنفسك دون ميكروفون'}
              </p>
            </div>
          </div>

          {/* Mode Switcher, Fading & Skip Button */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            {/* Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-[#ECE4D4] dark:bg-[#202B1E] rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D]">
              <button
                onClick={() => handleSwitchMode('listen')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  stageMode === 'listen'
                    ? 'bg-[#52674B] text-white shadow-xs'
                    : 'text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2]'
                }`}
                title="مراجعة ذاتية واستماع دون الحاجة للميكروفون"
              >
                <Headphones className="h-3.5 w-3.5" />
                <span>الاستماع والمراجعة</span>
              </button>
              <button
                onClick={() => handleSwitchMode('test')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  stageMode === 'test'
                    ? 'bg-[#52674B] text-white shadow-xs'
                    : 'text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2]'
                }`}
                title="اختبار حقيقي بالميكروفون ومحاذاة صوتية لحظية"
              >
                <Target className="h-3.5 w-3.5" />
                <span>وضع الاختبار</span>
              </button>
            </div>

            {/* Quick Fading Selector */}
            <div className="flex items-center gap-1 p-1 bg-[#ECE4D4] dark:bg-[#202B1E] rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D]">
              <span className="text-xs px-1.5 text-[#6F7D6C] dark:text-[#9FB19B] font-semibold hidden md:inline">
                الإخفاء:
              </span>
              {FADING_STEPS.map((step) => (
                <button
                  key={step}
                  onClick={() => resetRound(step)}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors ${
                    fadingPercent === step
                      ? 'bg-[#52674B] text-white shadow-xs'
                      : 'text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2] dark:hover:text-white'
                  }`}
                >
                  {step}%
                </button>
              ))}
            </div>

            {/* Skip Stage Button */}
            <button
              onClick={() => {
                if (autoTransitionTimerRef.current) clearInterval(autoTransitionTimerRef.current);
                if (onSkipStage) onSkipStage();
                else onAdvanceToStage3({ autoStartMic: true });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#52674B] text-white hover:bg-[#43553D] shadow-xs transition-all"
              title="تخطي المرحلة ٢ والانتقال للمرحلة ٣ مباشرة"
            >
              <span>تخطي للمرحلة ٣</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 pt-3 border-t border-[#E5DCcb] dark:border-[#233021]">
          <div className="flex items-center justify-between text-xs text-[#6F7D6C] dark:text-[#9FB19B] mb-1">
            <span>
              {stageMode === 'test' ? 'الكلمات التي قرأتها بنجاح:' : 'الكلمات الظاهرة للمراجعة:'}{' '}
              <b className="text-[#52674B] dark:text-[#C5D8C1] tabular-nums">
                {stageMode === 'test' ? matchedWordIds.size : revealedWordIds.size}
              </b>{' '}
              من {allWords.length}
            </span>
            <span className="tabular-nums font-bold text-[#52674B] dark:text-[#C5D8C1]">
              {matchPercent}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E5DCCB] dark:bg-[#233021] overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-[#52674B] to-[#738C6B] transition-all duration-300 rounded-full"
              style={{ width: `${matchPercent}%` }}
            />
          </div>
        </div>

        {/* Tajweed & Error Alert Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-2.5">
          {currentTajweedRule && stageMode === 'test' && currentActiveWord && (
            <div className="px-3 py-1.5 rounded-xl bg-[#52674B]/10 dark:bg-[#738C6B]/20 border border-[#52674B]/30 text-xs flex items-center gap-2 animate-in fade-in">
              <BookOpen className="h-3.5 w-3.5 text-[#52674B] dark:text-[#C5D8C1] shrink-0" />
              <span className="font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                حكم تجويدي بكلمة "{currentActiveWord.text}": {currentTajweedRule.ruleName}
              </span>
              <span className="text-[11px] text-[#556450] dark:text-[#B7C7B2] hidden md:inline">
                ({currentTajweedRule.tip})
              </span>
            </div>
          )}

          {errorDetails && (
            <div className="px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>
                  خطأ: المطلوب <b>"{errorDetails.expected}"</b> ونطق <b>"{errorDetails.spoken}"</b>
                </span>
              </div>
              <button
                onClick={() => clearErrorForWord(errorDetails.wordId)}
                className="px-2.5 py-0.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                title="إلغاء تنبيه الخطأ والمحاولة مجدداً"
              >
                إلغاء الخطأ ↺
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Permission warning for test mode */}
      {stageMode === 'test' && permissionError && (
        <div className="w-full rounded-xl p-3 bg-[#8C524B]/15 border border-[#8C524B]/30 text-xs text-[#522B27] dark:text-[#F3C5C1] flex items-center justify-between">
          <span>{permissionError}</span>
          <button
            onClick={startListening}
            className="px-3 py-1 rounded-lg bg-[#52674B] text-white font-bold"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Completion Banner */}
      {isRoundCompleted && (
        <div className="w-full max-w-full rounded-2xl p-5 bg-[#EDF3EB] dark:bg-[#1C271A] border-2 border-[#738C6B]/40 text-center space-y-3 shadow-md animate-in fade-in duration-300">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#52674B]/15 text-[#52674B] dark:bg-[#738C6B]/25 dark:text-[#C5D8C1]">
            <CheckCircle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-[#2B3527] dark:text-[#F1F6F0] font-scheherazade">
            أحسنت! أتممت قراءة المقدار بنسبة إخفاء {fadingPercent}%
          </h3>
          <p className="text-xs text-[#52624D] dark:text-[#B7C7B2] max-w-md mx-auto">
            {fadingPercent >= 80 ? (
              autoTransitionCountdown !== null ? (
                <span className="font-bold text-[#52674B] dark:text-[#C5D8C1]">
                  أتممت نسبة 80%! جاري الانتقال التلقائي للمرحلة ٣ والتسميع الغيبي بعد ({autoTransitionCountdown}) ثوانٍ...
                </span>
              ) : (
                'أتقنت الإخفاء بنسبة 80%! حان وقت التسميع الغيبي التام في المرحلة ٣.'
              )
            ) : (
              'يمكنك الانتقال للتكرار التالي لرفع نسبة الإخفاء وتثبيت الحفظ.'
            )}
          </p>

          <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
            <button
              onClick={() => resetRound()}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] text-[#3D4D38] dark:text-[#C5D8C1] hover:bg-[#E2D8C3]"
            >
              إعادة نفس التكرار
            </button>
            {fadingPercent < 80 ? (
              <button
                onClick={advanceToNextRepetition}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-[#52674B] hover:bg-[#43553D] text-white shadow-md transition-all"
              >
                <span>الانتقال للتكرار التالي ({Math.min(80, fadingPercent + 20)}%)</span>
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (autoTransitionTimerRef.current) {
                    clearInterval(autoTransitionTimerRef.current);
                    autoTransitionTimerRef.current = null;
                  }
                  onAdvanceToStage3({ autoStartMic: true });
                }}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-[#52674B] hover:bg-[#43553D] text-white shadow-md transition-all"
              >
                <Sparkles className="h-4 w-4" />
                <span>الانتقال للمرحلة ٣ والتسميع الغيبي</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Unified Mushaf Canvas */}
      <div className="w-full max-w-full rounded-3xl mushaf-canvas p-6 sm:p-10 lg:p-14 transition-all">
        <div
          className="font-quran text-2xl sm:text-3xl lg:text-4xl leading-loose sm:leading-loose lg:leading-loose text-center text-[#232B20] dark:text-[#F3F8F2] select-none"
          dir="rtl"
        >
          {selectedAyahs.map((ayah) => {
            const ayahWords = allWords.filter((w) => w.ayahNumber === ayah.numberInSurah);
            const isPlayingThis = playingAyahAudio === ayah.numberInSurah;

            return (
              <span key={ayah.numberInSurah} className="inline">
                {ayahWords.map((word) => {
                  const isHiddenInitial = hiddenWordIds.has(word.id);
                  const isRevealed = revealedWordIds.has(word.id);
                  const isMatched = matchedWordIds.has(word.id);
                  const isHinted = hintedWordIds.has(word.id);
                  const hasError = errorWordIds.has(word.id);
                  const isTargetNext = stageMode === 'test' && currentActiveWord?.id === word.id;
                  const isWordVisible = !isHiddenInitial || isRevealed;

                  return (
                    <span
                      key={word.id}
                      ref={(el) => {
                        wordSpanRefs.current[word.id] = el;
                      }}
                      onClick={() => {
                        // In listen mode, clicking toggles word visibility
                        if (stageMode === 'listen') {
                          setRevealedWordIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(word.id)) next.delete(word.id);
                            else next.add(word.id);
                            return next;
                          });
                        } else if (hasError) {
                          // Clicking on an error word clears the error
                          clearErrorForWord(word.id);
                        } else if (isHiddenInitial && !isRevealed) {
                          setHintedWordIds((prev) => new Set(prev).add(word.id));
                          setRevealedWordIds((prev) => new Set(prev).add(word.id));
                          setMatchedWordIds((prev) => new Set(prev).add(word.id));
                          if (currentActiveWord?.id === word.id) {
                            const next = activeWordIdx + 1;
                            setActiveWordIdx(next);
                            activeWordIdxRef.current = next;
                            if (next >= allWords.length) {
                              setIsRoundCompleted(true);
                            }
                          }
                        }
                      }}
                      className={`relative inline-block px-1.5 py-0.5 mx-0.5 rounded-xl transition-all duration-300 ${
                        hasError
                          ? 'bg-red-500/20 text-red-700 dark:text-red-400 font-bold border-2 border-red-500/80 shadow-xs ring-2 ring-red-400/40 cursor-pointer animate-shake'
                          : isMatched
                          ? 'bg-[#52674B]/20 dark:bg-[#738C6B]/35 text-[#1F271D] dark:text-white font-bold ring-1 ring-[#52674B]/30 shadow-xs'
                          : isTargetNext
                          ? 'ring-2 ring-[#52674B] bg-[#E2D8C3] dark:bg-[#2A3728] text-[#1F271D] dark:text-white font-semibold animate-pulse'
                          : isHinted
                          ? 'bg-[#52674B]/15 text-[#52674B] dark:text-[#C5D8C1]'
                          : isWordVisible
                          ? 'text-[#232B20] dark:text-[#F3F8F2]'
                          : 'cursor-pointer hover:bg-[#D5CABB]/40'
                      }`}
                      title={
                        hasError
                          ? 'خطأ في النطق (انقر لإلغاء الخطأ)'
                          : stageMode === 'listen'
                          ? 'انقر لكشف أو إخفاء الكلمة'
                          : isHiddenInitial && !isRevealed
                          ? 'كلمة مخفية (انقر لتلميح)'
                          : ''
                      }
                    >
                      <span
                        className={`transition-all duration-300 ${
                          isWordVisible ? 'opacity-100 filter-none' : 'opacity-0 select-none'
                        }`}
                      >
                        {word.text}
                      </span>

                      {!isWordVisible && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span
                            className={`w-full border-b-2 border-dashed -mb-2 ${
                              hasError
                                ? 'border-red-500'
                                : 'border-[#52674B]/60 dark:border-[#738C6B]/60'
                            }`}
                          />
                        </span>
                      )}
                    </span>
                  );
                })}

                {/* Ayah End Marker with Click-to-Listen Audio Button */}
                <button
                  type="button"
                  onClick={() => playAyahAudio(ayah.numberInSurah)}
                  className={`inline-flex items-center gap-1 mx-1.5 px-2 py-0.5 rounded-xl transition-all cursor-pointer font-scheherazade text-2xl sm:text-3xl ayah-number font-normal ${
                    isPlayingThis
                      ? 'bg-[#52674B] text-white shadow-xs animate-pulse ring-2 ring-[#738C6B]/40'
                      : 'text-[#52674B] dark:text-[#A4BA9E] hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E]'
                  }`}
                  title={`الآية ${ayah.numberInSurah} (انقر للاستماع بصوت الشيخ)`}
                >
                  <span>۝{ayah.numberInSurah}</span>
                  {isPlayingThis ? (
                    <Volume2 className="h-4 w-4 inline animate-bounce" />
                  ) : (
                    <span className="text-[10px] font-sans opacity-0 hover:opacity-100 transition-opacity">
                      🎧
                    </span>
                  )}
                </button>{' '}
              </span>
            );
          })}
        </div>
      </div>

      {/* Floating Control Deck */}
      <div className="sticky bottom-3 z-30 w-full max-w-full rounded-2xl bg-[#F9F6EE]/95 dark:bg-[#162015]/95 backdrop-blur-md border border-[#DDD4C1] dark:border-[#273525] p-3.5 shadow-xl">
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          {stageMode === 'test' ? (
            /* Test Mode Voice Indicator */
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                  isListening
                    ? 'bg-[#52674B] text-white shadow-md ring-4 ring-[#738C6B]/30'
                    : 'bg-[#ECE4D4] dark:bg-[#202B1E] text-[#556450] dark:text-[#9FB19B]'
                }`}
              >
                <Mic className="h-5 w-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                    {isListening ? 'الميكروفون يستمع لقراءتك بالتجويد...' : 'الميكروفون متوقف'}
                  </span>
                  {isListening && (
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className="w-1 bg-[#52674B] dark:bg-[#738C6B] rounded-full transition-all"
                          style={{
                            height: `${Math.max(4, (audioLevel / 100) * 14 * (bar * 0.4))}px`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-[#6F7D6C] dark:text-[#9FB19B]">
                  {interimTranscript ? (
                    <span className="font-bold text-[#52674B] dark:text-[#C5D8C1]">
                      الميكروفون التقط: "{interimTranscript}"
                    </span>
                  ) : currentActiveWord ? (
                    <span>
                      الكلمة المطلوبة: <b className="text-[#52674B] dark:text-[#C5D8C1]">"{currentActiveWord.text}"</b> (أو انقر عليها لكشفها)
                    </span>
                  ) : (
                    'أتممت جميع كلمات المقدار بنجاح!'
                  )}
                </p>
              </div>
            </div>
          ) : (
            /* Listen & Review Mode Status */
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#52674B]/20 text-[#52674B] dark:text-[#C5D8C1]">
                <Headphones className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#2B3527] dark:text-[#F1F6F0] block">
                  وضع الاستماع والمراجعة الذاتية
                </span>
                <span className="text-[11px] text-[#6F7D6C] dark:text-[#9FB19B]">
                  {playingAyahAudio
                    ? `جاري الاستماع للآية ${playingAyahAudio} بصوت الشيخ...`
                    : 'انقر على أي آية لسماعها، أو انقر على الكلمات لكشفها'}
                </span>
              </div>
            </div>
          )}

          {/* Central Actions */}
          <div className="flex items-center gap-2 mx-auto flex-wrap">
            {stageMode === 'test' ? (
              <>
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-md ${
                    isListening
                      ? 'bg-[#8C463F] hover:bg-[#7A3B35] text-white animate-pulse'
                      : 'bg-[#52674B] hover:bg-[#43553D] text-white'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-4 w-4" />
                      <span>إيقاف الميكروفون</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      <span>فتح الميكروفون</span>
                    </>
                  )}
                </button>

                {/* Instant Test Word Recitation Button */}
                {currentActiveWord && (
                  <button
                    onClick={() => handleSpeechInput(currentActiveWord.text)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-[#52674B]/15 hover:bg-[#52674B]/25 text-[#3D4D38] dark:text-[#C5D8C1] border border-[#52674B]/30 transition-all"
                    title="تسميع تجريبي فوري للكلمة الحالية لفحص المحاذاة والظهور اللحظي"
                  >
                    <Sparkles className="h-4 w-4 text-[#52674B]" />
                    <span>تسميع تجريبي ("{currentActiveWord.text}")</span>
                  </button>
                )}

                {errorDetails && (
                  <button
                    onClick={() => clearErrorForWord(errorDetails.wordId)}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors"
                    title="إلغاء الخطأ المسجل"
                  >
                    <span>إلغاء الخطأ ↺</span>
                  </button>
                )}

                <button
                  onClick={giveHint}
                  disabled={activeWordIdx >= allWords.length}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] bg-[#F6F2EA] dark:bg-[#1D271B] hover:bg-[#EAE0D0] text-[#3D4D38] dark:text-[#C5D8C1] disabled:opacity-30 transition-colors"
                  title="كشف الكلمة كتلميح"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>تلميح</span>
                </button>

                <button
                  onClick={manualStepNext}
                  disabled={activeWordIdx >= allWords.length}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] bg-[#F6F2EA] dark:bg-[#1D271B] hover:bg-[#EAE0D0] text-[#3D4D38] dark:text-[#C5D8C1] disabled:opacity-30 transition-colors"
                  title="تخطي الكلمة يدوياً"
                >
                  <span>تخطي ⇥</span>
                </button>

                <button
                  onClick={() => resetRound()}
                  className="p-2 rounded-xl text-[#6F7D6C] hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E] transition-colors"
                  title="إعادة التكرار الحالي"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </>
            ) : (
              /* Review Mode Actions */
              <>
                <button
                  onClick={revealAllWords}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#ECE4D4] dark:bg-[#202B1E] hover:bg-[#E2D8C3] dark:hover:bg-[#283726] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D] transition-colors"
                  title="كشف جميع الكلمات"
                >
                  <Eye className="h-4 w-4" />
                  <span>كشف الكل</span>
                </button>

                <button
                  onClick={hideAllWords}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#ECE4D4] dark:bg-[#202B1E] hover:bg-[#E2D8C3] dark:hover:bg-[#283726] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D] transition-colors"
                  title="إعادة إخفاء الكلمات"
                >
                  <EyeOff className="h-4 w-4" />
                  <span>إعادة الإخفاء</span>
                </button>

                <button
                  onClick={() => resetRound()}
                  className="p-2 rounded-xl text-[#6F7D6C] hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E] transition-colors"
                  title="إعادة تعيين الحالة"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBackToStage1}
              className="text-xs text-[#6F7D6C] hover:text-[#2B3527] dark:text-[#9FB19B] dark:hover:text-white px-2 py-1"
            >
              ← رجوع للشيخ
            </button>
            <button
              onClick={() => {
                if (autoTransitionTimerRef.current) clearInterval(autoTransitionTimerRef.current);
                if (onSkipStage) onSkipStage();
                else onAdvanceToStage3({ autoStartMic: true });
              }}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#52674B] text-white hover:bg-[#43553D] transition-all flex items-center gap-1"
              title="تخطي والانتقال للمرحلة ٣"
            >
              <span>تخطي للمرحلة ٣</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

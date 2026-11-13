import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { AyahItem, SurahMeta, WordToken, Reciter, StageMode, EvaluationRating } from '../types/quran';
import { tokenizeAyah, normalizeArabic, getAyahAudioUrl } from '../utils/arabic';
import { isTajweedSpeechMatch } from '../utils/tajweed';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
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
  AlertCircle,
  CheckCircle2,
  Calendar,
  BookOpen,
  FileText,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface Stage3RealtimeRevealProps {
  surah: SurahMeta;
  ayahs: AyahItem[];
  fromAyah: number;
  toAyah: number;
  reciter?: Reciter;
  autoStartMic?: boolean;
  onBackToStage2: () => void;
  onBackToStage1: () => void;
  onSkipStage?: () => void;
  onSaveReport: (rating: EvaluationRating, errorsCount: number, totalWords: number) => void;
  onOpenReports: () => void;
}

export const Stage3RealtimeReveal: React.FC<Stage3RealtimeRevealProps> = ({
  surah,
  ayahs,
  fromAyah,
  toAyah,
  reciter,
  autoStartMic = false,
  onBackToStage2,
  onBackToStage1,
  onSkipStage,
  onSaveReport,
  onOpenReports,
}) => {
  const [stageMode, setStageMode] = useState<StageMode>('test'); // 'test' (اختبار غيبي بالميكروفون) | 'listen' (استماع واستذكار)
  const [activeWordIdx, setActiveWordIdx] = useState(0);
  const [revealedWordIds, setRevealedWordIds] = useState<Set<string>>(new Set());
  const [hintedWordIds, setHintedWordIds] = useState<Set<string>>(new Set());
  const [errorWordIds, setErrorWordIds] = useState<Set<string>>(new Set());
  const [totalErrorsCount, setTotalErrorsCount] = useState(0);
  const [errorDetails, setErrorDetails] = useState<{ wordId: string; expected: string; spoken: string } | null>(null);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [playingAyahAudio, setPlayingAyahAudio] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<EvaluationRating | null>(null);

  const activeWordIdxRef = useRef(0);
  activeWordIdxRef.current = activeWordIdx;
  const wordSpanRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

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

  const resetRecitation = useCallback(() => {
    setActiveWordIdx(0);
    setRevealedWordIds(new Set());
    setHintedWordIds(new Set());
    setErrorWordIds(new Set());
    setErrorDetails(null);
    setStreak(0);
    setIsCompleted(false);
    setSelectedRating(null);
    setFeedback(null);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingAyahAudio(null);
    }
  }, []);

  useEffect(() => {
    resetRecitation();
  }, [surah.number, fromAyah, toAyah, resetRecitation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
      }
    };
  }, []);

  // Strict Tajweed-Aware Speech Alignment (Never advances ahead; colors mistakes in red)
  // Real-Time Stream Speech Alignment (Instantly matches & reveals words without lookahead or false alarms)
  const handleSpeechInput = useCallback(
    (spokenText: string) => {
      if (stageMode !== 'test' || allWords.length === 0 || isCompleted) return;

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
        const newlyRevealedIds: string[] = [];

        while (p < allWords.length && t < spokenTokens.length) {
          const target = allWords[p];
          const nextTarget = p + 1 < allWords.length ? allWords[p + 1] : undefined;
          const token = spokenTokens[t];

          if (isTajweedSpeechMatch(target, token, nextTarget)) {
            newlyRevealedIds.push(target.id);

            // If token is a compound (e.g. "الحمدلله" or "بسمالله") that also matches nextTarget:
            if (nextTarget && token.startsWith(target.cleanText)) {
              const rem = token.slice(target.cleanText.length);
              if (rem === nextTarget.cleanText || rem === normalizeArabic(nextTarget.text)) {
                newlyRevealedIds.push(nextTarget.id);
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
          // Instantly reveal all matched words
          setRevealedWordIds((prev) => {
            const next = new Set(prev);
            newlyRevealedIds.forEach((id) => next.add(id));
            return next;
          });

          // Clear error state if any matched word had an error
          setErrorWordIds((prev) => {
            const next = new Set(prev);
            newlyRevealedIds.forEach((id) => next.delete(id));
            return next;
          });
          setErrorDetails(null);
          setFeedback(null);

          pointer = p;
          activeWordIdxRef.current = pointer;
          setActiveWordIdx(pointer);

          setStreak((prev) => {
            const updated = prev + newlyMatchedCount;
            setMaxStreak((m) => Math.max(m, updated));
            return updated;
          });

          // Scroll active target into view smoothly
          if (pointer < allWords.length) {
            const nextEl = wordSpanRefs.current[allWords[pointer].id];
            if (nextEl) {
              nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          } else {
            setIsCompleted(true);
            setFeedback('اللهم بارك! أتممت التسميع الكامل عن ظهر قلب. حدد تقييم حفظك لجدولة المراجعة.');
          }
        }
      } else {
        // Current expected word was not matched in this speech chunk
        // Check if user spoke a distinct mismatched word (and not just an earlier word from the ongoing phrase)
        const lastSpoken = spokenTokens[spokenTokens.length - 1];
        if (lastSpoken && lastSpoken.length >= 2) {
          // Check if lastSpoken is merely one of the preceding already-matched words (from ongoing utterance)
          const isPriorWord =
            (pointer > 0 && isTajweedSpeechMatch(allWords[pointer - 1], lastSpoken)) ||
            (pointer > 1 && isTajweedSpeechMatch(allWords[pointer - 2], lastSpoken));

          // Ignore common introductory or concluding formulas so they never register as errors
          const isIntroOrClosing = [
            'اعوذ', 'بالله', 'من', 'الشيطان', 'الرجيم', 'بسم', 'الله', 'الرحمن', 'الرحيم',
            'امين', 'صدق', 'العظيم'
          ].includes(lastSpoken);

          if (!isPriorWord && !isIntroOrClosing) {
            const currentTarget = allWords[pointer];
            setErrorWordIds((prev) => new Set(prev).add(currentTarget.id));
            setTotalErrorsCount((prev) => prev + 1);
            setStreak(0);
            setErrorDetails({
              wordId: currentTarget.id,
              expected: currentTarget.text,
              spoken: lastSpoken,
            });
            setFeedback(`خطأ في النطق أو التجويد: نُطِقَت "${lastSpoken}" والمطلوب: "${currentTarget.text}"`);
          }
        }
      }
    },
    [stageMode, allWords, isCompleted]
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

  // Switch between modes
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

  useEffect(() => {
    if (stageMode === 'test' && autoStartMic && !isListening) {
      startListening();
    }
  }, [stageMode, autoStartMic]);

  // Audio playback for verification in Listen / Review mode
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

  const revealAllWords = () => {
    const allIds = new Set(allWords.map((w) => w.id));
    setRevealedWordIds(allIds);
    setFeedback('تم كشف النص كاملاً للمطابقة والمراجعة');
  };

  const hideAllWords = () => {
    setRevealedWordIds(new Set());
    setFeedback('تمت إعادة إخفاء النص للتسميع الغيبي');
  };

  const giveHint = () => {
    if (activeWordIdx < allWords.length) {
      const cur = allWords[activeWordIdx];
      clearErrorForWord(cur.id);
      setHintedWordIds((prev) => new Set(prev).add(cur.id));
      setRevealedWordIds((prev) => new Set(prev).add(cur.id));
      setActiveWordIdx((prev) => prev + 1);
      setStreak(0);
      setFeedback(`تلميح: "${cur.text}"`);

      if (activeWordIdx + 1 >= allWords.length) {
        setIsCompleted(true);
      }
    }
  };

  const manualStepNext = () => {
    if (activeWordIdx < allWords.length) {
      const cur = allWords[activeWordIdx];
      clearErrorForWord(cur.id);
      setRevealedWordIds((prev) => new Set(prev).add(cur.id));
      const next = activeWordIdx + 1;
      setActiveWordIdx(next);

      if (next >= allWords.length) {
        setIsCompleted(true);
      }
    }
  };

  // Handle User Evaluation Selection
  const handleRateSession = (rating: EvaluationRating) => {
    setSelectedRating(rating);
    onSaveReport(rating, totalErrorsCount, allWords.length);
    if (rating === 'mutqan') {
      setFeedback('ما شاء الله! تم تقييم الحفظ: متقن. تم تحديد موعد الاختبار القادم بعد 5 أيام.');
    } else if (rating === 'mutaraddid') {
      setFeedback('أحسنت! تم تقييم الحفظ: متردد. تم جدولة اختبارات دورية كل 3 أيام لترسيخ الآيات.');
    } else {
      setFeedback('تم تسجيل التذكير: متفلت. ينصح بالعودة فوراً للمرحلة الأولى مع الشيخ لتثبيت الحفظ.');
    }
  };

  const progressPercent = allWords.length > 0 ? Math.round((revealedWordIds.size / allWords.length) * 100) : 0;
  const currentActiveWord = activeWordIdx < allWords.length ? allWords[activeWordIdx] : null;
  const currentTajweedRule = currentActiveWord?.tajweedRule;

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Status Bar with Mode Switcher & Skip Button */}
      <div className="w-full max-w-full rounded-2xl bg-[#F6F2EA] dark:bg-[#182117] border border-[#DDD3BF] dark:border-[#273525] p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#52674B] text-white shadow-xs shrink-0">
              {stageMode === 'test' ? <Sparkles className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                  {stageMode === 'test'
                    ? 'التسميع الغيبي اللحظي (الآيات تظهر بالتزامن مع قراءتك بالتجويد)'
                    : 'وضع الاستماع والاستذكار الذاتي (مطابقة الحفظ)'}
                </span>
                {errorWordIds.size > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>خطأ في النطق ({errorWordIds.size})</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6F7D6C] dark:text-[#9FB19B] mt-0.5">
                {stageMode === 'test'
                  ? 'الآيات مخفية تماماً؛ لن تظهر الكلمة إلا إذا نُطقت صحيحة بأحكام التجويد، ويُلوّن الخطأ بالأحمر.'
                  : 'استمع للتلاوة بصوت الشيخ أو اكشف الآيات بنفسك للمطابقة دون الحاجة للميكروفون'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
            {/* Mode Switcher Segmented Pills */}
            <div className="flex items-center gap-1 p-1 bg-[#ECE4D4] dark:bg-[#202B1E] rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D]">
              <button
                onClick={() => handleSwitchMode('listen')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  stageMode === 'listen'
                    ? 'bg-[#52674B] text-white shadow-xs'
                    : 'text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2]'
                }`}
                title="استذكار ومطابقة ذاتية مع الاستماع للشيخ"
              >
                <Headphones className="h-3.5 w-3.5" />
                <span>الاستماع والمطابقة</span>
              </button>
              <button
                onClick={() => handleSwitchMode('test')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  stageMode === 'test'
                    ? 'bg-[#52674B] text-white shadow-xs'
                    : 'text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2]'
                }`}
                title="تسميع غيبي بالميكروفون مع التحقق التلقائي"
              >
                <Target className="h-3.5 w-3.5" />
                <span>وضع الاختبار الغيبي</span>
              </button>
            </div>

            {stageMode === 'test' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#ECE4D4] dark:bg-[#202B1E] border border-[#D5CABB] dark:border-[#2F3F2D] text-xs">
                <Flame className="h-4 w-4 text-[#52674B] dark:text-[#A4BA9E]" />
                <span className="text-[#556450] dark:text-[#B7C7B2]">التتالي:</span>
                <span className="font-bold text-[#2B3527] dark:text-[#F1F6F0] tabular-nums">
                  {streak} كلمات
                </span>
              </div>
            )}

            {/* Skip / Finish Button */}
            <button
              onClick={() => {
                if (onSkipStage) onSkipStage();
                else setIsCompleted(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#52674B] text-white hover:bg-[#43553D] shadow-xs transition-all"
              title="تخطي أو إنهاء التسميع للانتقال لتقييم الحفظ"
            >
              <span>إنهاء / تخطي</span>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 pt-3 border-t border-[#E5DCcb] dark:border-[#233021]">
          <div className="flex items-center justify-between text-xs text-[#6F7D6C] dark:text-[#9FB19B] mb-1">
            <span>
              ظهرت حتى الآن: <b className="text-[#52674B] dark:text-[#C5D8C1] tabular-nums">{revealedWordIds.size}</b> من {allWords.length} كلمة
            </span>
            <span className="tabular-nums font-bold text-[#52674B] dark:text-[#C5D8C1]">
              {progressPercent}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E5DCCB] dark:bg-[#233021] overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-[#52674B] to-[#738C6B] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Tajweed Rule & Error Alert Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-2.5">
          {currentTajweedRule && stageMode === 'test' && currentActiveWord && (
            <div className="px-3 py-1.5 rounded-xl bg-[#52674B]/10 dark:bg-[#738C6B]/20 border border-[#52674B]/30 text-xs flex items-center gap-2 animate-in fade-in">
              <BookOpen className="h-3.5 w-3.5 text-[#52674B] dark:text-[#C5D8C1] shrink-0" />
              <span className="font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                حكم تجويد: {currentTajweedRule.ruleName} في كلمة "{currentActiveWord.text}"
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
                title="إلغاء الخطأ والمحاولة مجدداً"
              >
                إلغاء الخطأ ↺
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Permission warning */}
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

      {/* Evaluation & Completion Card (متقن - متردد - متفلت) */}
      {isCompleted && (
        <div className="w-full max-w-full rounded-3xl p-6 bg-[#EDF3EB] dark:bg-[#1C271A] border-2 border-[#52674B]/40 text-center space-y-4 shadow-lg animate-in fade-in duration-300">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#52674B]/15 text-[#52674B] dark:bg-[#738C6B]/25 dark:text-[#C5D8C1]">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#2B3527] dark:text-[#F1F6F0] font-scheherazade">
              هنيئاً لك! أتممت تسميع سورة {surah.name} ({fromAyah} - {toAyah})
            </h3>
            <p className="text-xs text-[#52624D] dark:text-[#B7C7B2] max-w-md mx-auto mt-1">
              كيف تُقيّم حفظك وتسميعك لهذا المقدار لتحديد جدول الاختبار والمراجعة الدورية؟
            </p>
          </div>

          {/* Evaluation Rating Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-1">
            {/* 1. متقن (كل 5 أيام) */}
            <button
              onClick={() => handleRateSession('mutqan')}
              className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between ${
                selectedRating === 'mutqan'
                  ? 'border-[#52674B] bg-[#52674B] text-white shadow-md scale-102'
                  : 'border-[#52674B]/40 bg-white dark:bg-[#141C13] hover:border-[#52674B] text-[#2B3527] dark:text-[#F1F6F0]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold flex items-center gap-1.5">
                  <span>🌟</span>
                  <span>مُتْقَـن</span>
                </span>
                <CheckCircle2 className="h-5 w-5 text-[#52674B]" />
              </div>
              <p className={`text-xs ${selectedRating === 'mutqan' ? 'text-white/90' : 'text-[#6F7D6C] dark:text-[#9FB19B]'}`}>
                حفظ راسخ دون أخطاء.
              </p>
              <div className="mt-2.5 pt-2 border-t border-[#52674B]/20 text-[11px] font-bold text-[#52674B] dark:text-[#C5D8C1]">
                جدولة اختبار كل ٥ أيام
              </div>
            </button>

            {/* 2. متردد (كل 3 أيام) */}
            <button
              onClick={() => handleRateSession('mutaraddid')}
              className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between ${
                selectedRating === 'mutaraddid'
                  ? 'border-[#B58238] bg-[#B58238] text-white shadow-md scale-102'
                  : 'border-[#E2B778]/50 bg-white dark:bg-[#141C13] hover:border-[#B58238] text-[#2B3527] dark:text-[#F1F6F0]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold flex items-center gap-1.5">
                  <span>⚖️</span>
                  <span>مُتَـرَدِّد</span>
                </span>
                <Clock className="h-5 w-5 text-[#B58238]" />
              </div>
              <p className={`text-xs ${selectedRating === 'mutaraddid' ? 'text-white/90' : 'text-[#6F7D6C] dark:text-[#9FB19B]'}`}>
                حفظ لا بأس به مع بعض التردد.
              </p>
              <div className="mt-2.5 pt-2 border-t border-[#E2B778]/30 text-[11px] font-bold text-[#A67832] dark:text-[#F3D7A4]">
                جدولة اختبار كل ٣ أيام
              </div>
            </button>

            {/* 3. متفلت (تذكير إعادة حفظ) */}
            <button
              onClick={() => handleRateSession('mutafallit')}
              className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between ${
                selectedRating === 'mutafallit'
                  ? 'border-[#8C524B] bg-[#8C524B] text-white shadow-md scale-102'
                  : 'border-[#8C524B]/40 bg-white dark:bg-[#141C13] hover:border-[#8C524B] text-[#2B3527] dark:text-[#F1F6F0]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold flex items-center gap-1.5">
                  <span>🔄</span>
                  <span>مُتَفَـلِّت</span>
                </span>
                <AlertTriangle className="h-5 w-5 text-[#8C524B]" />
              </div>
              <p className={`text-xs ${selectedRating === 'mutafallit' ? 'text-white/90' : 'text-[#6F7D6C] dark:text-[#9FB19B]'}`}>
                يحتاج لتثبيت وإعادة قراءة مع الشيخ.
              </p>
              <div className="mt-2.5 pt-2 border-t border-[#8C524B]/20 text-[11px] font-bold text-[#8C524B] dark:text-[#F3C5C1]">
                تذكير لإعادة الحفظ
              </div>
            </button>
          </div>

          {/* Action Links */}
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              onClick={onOpenReports}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#ECE4D4] dark:bg-[#1F2A1E] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D] hover:bg-[#E2D8C3] transition-all"
            >
              <FileText className="h-4 w-4" />
              <span>عرض سجل التقارير والمتابعة 📊</span>
            </button>

            <button
              onClick={resetRecitation}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] text-[#3D4D38] dark:text-[#C5D8C1] hover:bg-[#E2D8C3]"
            >
              <RotateCcw className="h-4 w-4" />
              <span>إعادة التسميع</span>
            </button>

            <button
              onClick={onBackToStage1}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#52674B] text-white hover:bg-[#43553D] shadow-md transition-all"
            >
              حفظ مقدار جديد مع الشيخ
            </button>
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
            const isAyahFinished = ayahWords.every((w) => revealedWordIds.has(w.id));
            const isPlayingThis = playingAyahAudio === ayah.numberInSurah;

            return (
              <span key={ayah.numberInSurah} className="inline">
                {ayahWords.map((word) => {
                  const isRevealed = revealedWordIds.has(word.id);
                  const isHinted = hintedWordIds.has(word.id);
                  const hasError = errorWordIds.has(word.id);
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
                        } else if (hasError) {
                          clearErrorForWord(word.id);
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
                      className={`relative inline-block px-1.5 py-0.5 mx-0.5 rounded-xl transition-all duration-300 ${
                        hasError
                          ? 'bg-red-500/20 text-red-700 dark:text-red-400 font-bold border-2 border-red-500/80 shadow-xs ring-2 ring-red-400/40 cursor-pointer animate-shake'
                          : isRevealed
                          ? isHinted
                            ? 'bg-[#52674B]/15 text-[#52674B] dark:text-[#C5D8C1] ring-1 ring-[#52674B]/30'
                            : 'bg-[#52674B]/20 dark:bg-[#738C6B]/40 text-[#1F271D] dark:text-white font-bold ring-1 ring-[#52674B]/30 shadow-xs'
                          : isTargetNext
                          ? 'bg-[#E2D8C3] dark:bg-[#2A3728] ring-2 ring-[#52674B] text-[#7F8C7C] animate-pulse'
                          : stageMode === 'listen'
                          ? 'cursor-pointer hover:bg-[#D5CABB]/40'
                          : 'cursor-default'
                      }`}
                      title={
                        hasError
                          ? 'خطأ في النطق (انقر لإلغاء الخطأ)'
                          : stageMode === 'listen'
                          ? 'انقر لكشف أو إخفاء الكلمة'
                          : ''
                      }
                    >
                      {/* Revealed text */}
                      <span
                        className={`transition-all duration-300 ${
                          isRevealed ? 'opacity-100 filter-none' : 'opacity-0 select-none'
                        }`}
                      >
                        {word.text}
                      </span>

                      {/* Hidden placeholder maintaining natural character width */}
                      {!isRevealed && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span
                            className={`w-full border-b-2 border-dashed -mb-2 ${
                              hasError
                                ? 'border-red-500'
                                : 'border-[#52674B]/40 dark:border-[#738C6B]/40'
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
                      : isAyahFinished
                      ? 'text-[#52674B] dark:text-[#A4BA9E] opacity-100 hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E]'
                      : 'text-[#B8C7B5] dark:text-[#384835] opacity-60 hover:opacity-100 hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E]'
                  }`}
                  title={`الآية ${ayah.numberInSurah} (انقر للاستماع بصوت الشيخ للمطابقة)`}
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

      {/* Floating Microphone Alignment Bar */}
      <div className="sticky bottom-3 z-30 w-full max-w-full rounded-2xl bg-[#F9F6EE]/95 dark:bg-[#162015]/95 backdrop-blur-md border border-[#DDD4C1] dark:border-[#273525] p-3.5 shadow-xl">
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          {stageMode === 'test' ? (
            /* Voice Mic Feedback */
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
                    {isListening ? 'الميكروفون يستمع للتسميع الغيبي...' : 'الميكروفون متوقف'}
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
                      انطق غيباً: <b className="text-[#52674B] dark:text-[#C5D8C1]">"{currentActiveWord.text}"</b> (أو انقر عليها لكشفها)
                    </span>
                  ) : (
                    'اكتملت جميع كلمات المقدار بالكامل!'
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
                  وضع الاستماع والمطابقة الذاتية
                </span>
                <span className="text-[11px] text-[#6F7D6C] dark:text-[#9FB19B]">
                  {playingAyahAudio
                    ? `جاري الاستماع للآية ${playingAyahAudio} بصوت الشيخ...`
                    : 'انقر على رقم الآية للاستماع، أو اكشف الكلمات ذاتياً'}
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
                      <span>بدء التسميع الصوتي</span>
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
                  title="كشف كلمة واحدة فقط كتلميح"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>تلميح</span>
                </button>

                <button
                  onClick={manualStepNext}
                  disabled={activeWordIdx >= allWords.length}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] bg-[#F6F2EA] dark:bg-[#1D271B] hover:bg-[#EAE0D0] text-[#3D4D38] dark:text-[#C5D8C1] disabled:opacity-30 transition-colors"
                  title="تخطي الكلمة"
                >
                  <span>تخطي ⇥</span>
                </button>

                <button
                  onClick={resetRecitation}
                  className="p-2 rounded-xl text-[#6F7D6C] hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E] transition-colors"
                  title="إعادة التسميع"
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
                  title="كشف النص بالكامل"
                >
                  <Eye className="h-4 w-4" />
                  <span>كشف الكل للمطابقة</span>
                </button>

                <button
                  onClick={hideAllWords}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#ECE4D4] dark:bg-[#202B1E] hover:bg-[#E2D8C3] dark:hover:bg-[#283726] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D] transition-colors"
                  title="إخفاء النص"
                >
                  <EyeOff className="h-4 w-4" />
                  <span>إعادة الإخفاء</span>
                </button>

                <button
                  onClick={resetRecitation}
                  className="p-2 rounded-xl text-[#6F7D6C] hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E] transition-colors"
                  title="إعادة تعيين"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBackToStage2}
              className="text-xs text-[#6F7D6C] hover:text-[#2B3527] dark:text-[#9FB19B] dark:hover:text-white px-2 py-1"
            >
              ← رجوع للمرحلة ٢
            </button>
            <button
              onClick={() => {
                if (onSkipStage) onSkipStage();
                else setIsCompleted(true);
              }}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#52674B] text-white hover:bg-[#43553D] shadow-xs transition-all flex items-center gap-1"
              title="تخطي التسميع والانتقال للتقييم"
            >
              <span>إنهاء / تخطي</span>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { AyahItem, SurahMeta, WordToken, Reciter, StageMode } from '../types/quran';
import { tokenizeAyah } from '../utils/arabic';
import { alignSpokenTranscript } from '../utils/alignment';
import { startReciterAyahPlayback } from '../utils/audioPlayback';
import { RECITERS } from '../data/quranData';
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
  Eye,
  EyeOff,
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
  const [stageMode, setStageMode] = useState<StageMode>('test');
  const [repetitionCount, setRepetitionCount] = useState(1);
  const [fadingPercent, setFadingPercent] = useState<number>(20);
  const [activeWordIdx, setActiveWordIdx] = useState(0);
  const [revealedWordIds, setRevealedWordIds] = useState<Set<string>>(new Set());
  const [matchedWordIds, setMatchedWordIds] = useState<Set<string>>(new Set());
  const [hintedWordIds, setHintedWordIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isRoundCompleted, setIsRoundCompleted] = useState(false);
  const [autoTransitionCountdown, setAutoTransitionCountdown] = useState<number | null>(null);
  const [playingAyahAudio, setPlayingAyahAudio] = useState<number | null>(null);

  const autoTransitionTimerRef = useRef<any>(null);
  const advanceTimeoutRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const cancelAudioRef = useRef<(() => void) | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const wordSpanRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const activeWordIdxRef = useRef(0);
  activeWordIdxRef.current = activeWordIdx;

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
    activeWordIdxRef.current = 0;
    setMatchedWordIds(new Set());
    setRevealedWordIds(new Set());
    setHintedWordIds(new Set());
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
    if (cancelAudioRef.current) {
      cancelAudioRef.current();
      cancelAudioRef.current = null;
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

  // Real-time stream alignment (multi-alternative, anti-stall, zero error alerting)
  const handleSpeechInput = useCallback(
    (spokenText: string, alternatives?: string[]) => {
      if (stageMode !== 'test' || allWords.length === 0 || isRoundCompleted) return;

      const pointer = activeWordIdxRef.current;
      if (pointer >= allWords.length) return;

      const hypotheses = alternatives && alternatives.length > 0 ? alternatives : [spokenText];
      const { newPointer, matchedIds } = alignSpokenTranscript(allWords, pointer, hypotheses);

      if (matchedIds.length > 0 && newPointer > pointer) {
        setMatchedWordIds((prev) => {
          const next = new Set(prev);
          matchedIds.forEach((id) => next.add(id));
          return next;
        });
        setRevealedWordIds((prev) => {
          const next = new Set(prev);
          matchedIds.forEach((id) => next.add(id));
          return next;
        });
        setFeedback(null);

        activeWordIdxRef.current = newPointer;
        setActiveWordIdx(newPointer);

        // Keep Mushaf stationary: gently scroll inside Mushaf container only when out of frame
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
        }

        if (newPointer >= allWords.length) {
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
            setFeedback('أحسنت! أتممت هذا التكرار بنجاح. جاري رفع نسبة الإخفاء...');
            if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
            advanceTimeoutRef.current = setTimeout(() => {
              advanceToNextRepetition();
            }, 1200);
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
      setFeedback(`تلميح: "${cur.text}"`);
    }
  };

  const manualStepNext = () => {
    if (activeWordIdx < allWords.length) {
      const cur = allWords[activeWordIdx];
      setMatchedWordIds((prev) => new Set(prev).add(cur.id));
      setRevealedWordIds((prev) => new Set(prev).add(cur.id));
      const next = activeWordIdx + 1;
      setActiveWordIdx(next);
      activeWordIdxRef.current = next;
      if (next >= allWords.length) {
        setIsRoundCompleted(true);
      }
    }
  };

  const currentActiveWord = activeWordIdx < allWords.length ? allWords[activeWordIdx] : null;
  const matchPercent = allWords.length > 0 ? Math.round((matchedWordIds.size / allWords.length) * 100) : 0;
  const currentTajweedRule = currentActiveWord?.tajweedRule;

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-1.5">
      {/* Compact Stationary Top Status Bar */}
      <div className="shrink-0 w-full rounded-xl bg-[#F6F2EA] dark:bg-[#182117] border border-[#DDD3BF] dark:border-[#273525] px-2.5 py-1.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#52674B] text-white shrink-0">
              {stageMode === 'test' ? <Mic className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-xs font-bold text-[#2B3527] dark:text-[#F1F6F0] truncate">
                {stageMode === 'test'
                  ? `التكرار ${repetitionCount} · إخفاء ${fadingPercent}%`
                  : `استماع ومراجعة · إخفاء ${fadingPercent}%`}
              </span>
              {currentTajweedRule && stageMode === 'test' && currentActiveWord && (
                <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#52674B]/10 text-[10px] font-bold text-[#3D4D38] dark:text-[#C5D8C1]">
                  <BookOpen className="h-3 w-3 text-[#52674B]" />
                  <span>{currentTajweedRule.ruleName}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap justify-end">
            <div className="flex items-center gap-0.5 p-0.5 bg-[#ECE4D4] dark:bg-[#202B1E] rounded-lg border border-[#D5CABB] dark:border-[#2F3F2D]">
              <button
                onClick={() => handleSwitchMode('listen')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  stageMode === 'listen'
                    ? 'bg-[#52674B] text-white shadow-xs'
                    : 'text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2]'
                }`}
              >
                <Headphones className="h-3 w-3" />
                <span>مراجعة</span>
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
                <span>اختبار</span>
              </button>
            </div>

            <div className="flex items-center gap-0.5 p-0.5 bg-[#ECE4D4] dark:bg-[#202B1E] rounded-lg border border-[#D5CABB] dark:border-[#2F3F2D]">
              {FADING_STEPS.map((step) => (
                <button
                  key={step}
                  onClick={() => resetRound(step)}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                    fadingPercent === step
                      ? 'bg-[#52674B] text-white shadow-xs'
                      : 'text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2] dark:hover:text-white'
                  }`}
                >
                  {step}%
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                if (autoTransitionTimerRef.current) clearInterval(autoTransitionTimerRef.current);
                if (onSkipStage) onSkipStage();
                else onAdvanceToStage3({ autoStartMic: true });
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#52674B] text-white hover:bg-[#43553D] shadow-xs transition-colors"
            >
              <span>تخطي للمرحلة ٣</span>
              <ChevronLeft className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Slim Progress Bar */}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[10px] text-[#6F7D6C] dark:text-[#9FB19B] tabular-nums shrink-0">
            {stageMode === 'test' ? matchedWordIds.size : revealedWordIds.size}/{allWords.length}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-[#E5DCCB] dark:bg-[#233021] overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-[#52674B] to-[#738C6B] transition-all duration-300 rounded-full"
              style={{ width: `${matchPercent}%` }}
            />
          </div>
          <span className="tabular-nums text-[10px] font-bold text-[#52674B] dark:text-[#C5D8C1] shrink-0">
            {matchPercent}%
          </span>
        </div>
      </div>

      {/* Permission warning for test mode */}
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

      {/* Completion Banner */}
      {isRoundCompleted && (
        <div className="shrink-0 w-full rounded-2xl p-4 bg-[#EDF3EB] dark:bg-[#1C271A] border border-[#738C6B]/40 text-center space-y-2 shadow-sm">
          <div className="flex items-center justify-center gap-2 text-[#2B3527] dark:text-[#F1F6F0]">
            <CheckCircle className="h-5 w-5 text-[#52674B] dark:text-[#C5D8C1]" />
            <h3 className="text-base font-bold font-scheherazade">
              أحسنت! أتممت قراءة المقدار بنسبة إخفاء {fadingPercent}%
            </h3>
          </div>
          {fadingPercent >= 80 && autoTransitionCountdown !== null && (
            <p className="text-xs font-bold text-[#52674B] dark:text-[#C5D8C1]">
              جاري الانتقال التلقائي للمرحلة ٣ والتسميع الغيبي بعد ({autoTransitionCountdown}) ثوانٍ...
            </p>
          )}
          <div className="flex items-center justify-center gap-2.5 flex-wrap">
            <button
              onClick={() => resetRound()}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] text-[#3D4D38] dark:text-[#C5D8C1] hover:bg-[#E2D8C3]"
            >
              إعادة نفس التكرار
            </button>
            {fadingPercent < 80 ? (
              <button
                onClick={advanceToNextRepetition}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-[#52674B] hover:bg-[#43553D] text-white shadow-xs"
              >
                <span>التكرار التالي ({Math.min(80, fadingPercent + 20)}%)</span>
                <ChevronLeft className="h-3.5 w-3.5" />
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
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-[#52674B] hover:bg-[#43553D] text-white shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>الانتقال للمرحلة ٣</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Maximized Scrollable Mushaf Canvas inside Fixed Screen */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto w-full rounded-2xl mushaf-canvas p-3 sm:p-5 lg:p-7"
      >
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
                  const isTargetNext = stageMode === 'test' && currentActiveWord?.id === word.id;
                  const isWordVisible = !isHiddenInitial || isRevealed;

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
                      className={`relative inline-block px-1.5 py-0.5 mx-0.5 rounded-xl transition-colors duration-200 ${
                        isMatched
                          ? 'bg-[#52674B]/20 dark:bg-[#738C6B]/35 text-[#1F271D] dark:text-white font-bold ring-1 ring-[#52674B]/30'
                          : isTargetNext
                          ? 'ring-2 ring-[#52674B] bg-[#E2D8C3] dark:bg-[#2A3728] text-[#1F271D] dark:text-white font-semibold'
                          : isHinted
                          ? 'bg-[#52674B]/15 text-[#52674B] dark:text-[#C5D8C1]'
                          : isWordVisible
                          ? 'text-[#232B20] dark:text-[#F3F8F2]'
                          : 'cursor-pointer hover:bg-[#D5CABB]/40'
                      }`}
                    >
                      <span
                        className={`transition-opacity duration-200 ${
                          isWordVisible ? 'opacity-100' : 'opacity-0 select-none'
                        }`}
                      >
                        {word.text}
                      </span>

                      {!isWordVisible && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="w-full border-b-2 border-dashed -mb-2 border-[#52674B]/60 dark:border-[#738C6B]/60" />
                        </span>
                      )}
                    </span>
                  );
                })}

                <button
                  type="button"
                  onClick={() => playAyahAudio(ayah.numberInSurah)}
                  className={`inline-flex items-center gap-1 mx-1.5 px-2 py-0.5 rounded-xl transition-colors cursor-pointer font-scheherazade text-2xl sm:text-3xl ayah-number font-normal ${
                    isPlayingThis
                      ? 'bg-[#52674B] text-white ring-2 ring-[#738C6B]/40'
                      : 'text-[#52674B] dark:text-[#A4BA9E] hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E]'
                  }`}
                  title={`الآية ${ayah.numberInSurah} (انقر للاستماع)`}
                >
                  <span>۝{ayah.numberInSurah}</span>
                  {isPlayingThis && <Volume2 className="h-4 w-4 inline" />}
                </button>{' '}
              </span>
            );
          })}
        </div>
      </div>

      {/* Compact Stationary Bottom Control Deck */}
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
                  ) : currentActiveWord ? (
                    <span>
                      التالية: <b className="text-[#52674B] dark:text-[#C5D8C1]">"{currentActiveWord.text}"</b>
                    </span>
                  ) : feedback ? (
                    feedback
                  ) : (
                    'اكتمل المقدار'
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

          <div className="flex items-center gap-1.5 mx-auto flex-wrap">
            {stageMode === 'test' ? (
              <>
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors shadow-xs ${
                    isListening
                      ? 'bg-[#8C463F] hover:bg-[#7A3B35] text-white'
                      : 'bg-[#52674B] hover:bg-[#43553D] text-white'
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
                      <span>فتح الميكروفون</span>
                    </>
                  )}
                </button>

                <button
                  onClick={giveHint}
                  disabled={activeWordIdx >= allWords.length}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg border border-[#D5CABB] dark:border-[#2F3F2D] bg-[#F6F2EA] dark:bg-[#1D271B] hover:bg-[#EAE0D0] text-[#3D4D38] dark:text-[#C5D8C1] disabled:opacity-30 transition-colors"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>تلميح</span>
                </button>

                <button
                  onClick={manualStepNext}
                  disabled={activeWordIdx >= allWords.length}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg border border-[#D5CABB] dark:border-[#2F3F2D] bg-[#F6F2EA] dark:bg-[#1D271B] hover:bg-[#EAE0D0] text-[#3D4D38] dark:text-[#C5D8C1] disabled:opacity-30 transition-colors"
                >
                  <span>تخطي ⇥</span>
                </button>

                <button
                  onClick={() => resetRound()}
                  className="p-1.5 rounded-lg text-[#6F7D6C] hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E] transition-colors"
                  title="إعادة التكرار الحالي"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={revealAllWords}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] hover:bg-[#E2D8C3] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>كشف الكل</span>
                </button>
                <button
                  onClick={hideAllWords}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] hover:bg-[#E2D8C3] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D]"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>إخفاء</span>
                </button>
              </>
            )}
          </div>

          <button
            onClick={onBackToStage1}
            className="text-[11px] text-[#6F7D6C] hover:text-[#2B3527] dark:text-[#9FB19B] dark:hover:text-white px-1.5 py-0.5"
          >
            ← للشيخ
          </button>
        </div>
      </div>
    </div>
  );
};

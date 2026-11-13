import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AyahItem, Reciter, RepetitionSettings, QueueItem, SurahMeta, StageMode } from '../types/quran';
import { buildRepetitionQueue } from '../utils/repetitionQueue';
import { getAyahAudioUrl } from '../utils/arabic';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  ListOrdered,
  Sparkles,
  CheckCircle2,
  Headphones,
  Target,
  Repeat,
} from 'lucide-react';

interface Stage1SheikRecitationProps {
  surah: SurahMeta;
  ayahs: AyahItem[];
  fromAyah: number;
  toAyah: number;
  reciter: Reciter;
  settings: RepetitionSettings;
  onAdvanceToStage2: (options?: { autoStartMic?: boolean }) => void;
  onSkipStage?: () => void;
  onOpenRangeModal: () => void;
}

export const Stage1SheikRecitation: React.FC<Stage1SheikRecitationProps> = ({
  surah,
  ayahs,
  fromAyah,
  toAyah,
  reciter,
  settings,
  onAdvanceToStage2,
  onSkipStage,
  onOpenRangeModal,
}) => {
  const [stageMode, setStageMode] = useState<StageMode>('listen'); // 'listen' (استماع فقط) | 'test' (اختبار وتكرار)
  const [listenIndex, setListenIndex] = useState(0);
  const [isLooping, setIsLooping] = useState(false);

  const filteredAyahs = useMemo(() => {
    return ayahs.filter((a) => a.numberInSurah >= fromAyah && a.numberInSurah <= toAyah);
  }, [ayahs, fromAyah, toAyah]);

  const queue = useMemo(() => {
    return buildRepetitionQueue({
      fromAyah,
      toAyah,
      singleAyahRepeats: settings.singleAyahRepeats,
      linkRepeats: settings.linkRepeats,
      finalReviewRepeats: settings.finalReviewRepeats,
    });
  }, [fromAyah, toAyah, settings.singleAyahRepeats, settings.linkRepeats, settings.finalReviewRepeats]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pauseCountdown, setPauseCountdown] = useState<number | null>(null);
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [autoTransitionCountdown, setAutoTransitionCountdown] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const pauseTimerRef = useRef<any>(null);
  const autoTransitionTimerRef = useRef<any>(null);
  const ayahSpanRefs = useRef<Record<number, HTMLSpanElement | null>>({});

  const currentItem: QueueItem | undefined = queue[currentIndex];
  const currentListenAyah = filteredAyahs[listenIndex];

  // Active ayah being played
  const activeAyahNumber = stageMode === 'listen'
    ? currentListenAyah?.numberInSurah || fromAyah
    : currentItem?.ayahNumberInSurah || fromAyah;

  // Active step description
  const activeDescription = stageMode === 'listen'
    ? `استماع الآية ${activeAyahNumber} (${listenIndex + 1} من ${filteredAyahs.length})`
    : currentItem?.stepDescription || 'جاهز للاستماع والتكرار';

  // Reset when surah, range or reciter changes
  useEffect(() => {
    setCurrentIndex(0);
    setListenIndex(0);
    setIsCompleted(false);
    setAutoTransitionCountdown(null);
    if (autoTransitionTimerRef.current) {
      clearInterval(autoTransitionTimerRef.current);
      autoTransitionTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, [surah.number, fromAyah, toAyah, reciter.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) {
        clearInterval(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      if (autoTransitionTimerRef.current) {
        clearInterval(autoTransitionTimerRef.current);
        autoTransitionTimerRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Switch between listen-only and test repetition modes
  const handleSwitchMode = (newMode: StageMode) => {
    if (newMode === stageMode) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (pauseTimerRef.current) {
      clearInterval(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (autoTransitionTimerRef.current) {
      clearInterval(autoTransitionTimerRef.current);
      autoTransitionTimerRef.current = null;
    }
    setIsPlaying(false);
    setIsCompleted(false);
    setAutoTransitionCountdown(null);
    setPauseCountdown(null);
    setStageMode(newMode);
    if (newMode === 'listen') {
      setListenIndex(0);
    } else {
      setCurrentIndex(0);
    }
  };

  // Preload next audio
  useEffect(() => {
    if (stageMode === 'test' && currentIndex + 1 < queue.length) {
      const nextItem = queue[currentIndex + 1];
      const nextUrl = getAyahAudioUrl(reciter.subfolder, surah.number, nextItem.ayahNumberInSurah);
      if (!preloadAudioRef.current) preloadAudioRef.current = new Audio();
      preloadAudioRef.current.src = nextUrl;
      preloadAudioRef.current.preload = 'auto';
    } else if (stageMode === 'listen' && listenIndex + 1 < filteredAyahs.length) {
      const nextAyah = filteredAyahs[listenIndex + 1];
      const nextUrl = getAyahAudioUrl(reciter.subfolder, surah.number, nextAyah.numberInSurah);
      if (!preloadAudioRef.current) preloadAudioRef.current = new Audio();
      preloadAudioRef.current.src = nextUrl;
      preloadAudioRef.current.preload = 'auto';
    }
  }, [stageMode, currentIndex, queue, listenIndex, filteredAyahs, reciter.subfolder, surah.number]);

  // Play audio for current active Ayah
  const playCurrentAudio = useCallback(() => {
    const ayahToPlay = stageMode === 'listen'
      ? filteredAyahs[listenIndex]?.numberInSurah
      : currentItem?.ayahNumberInSurah;

    if (!ayahToPlay) return;

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    setPauseCountdown(null);

    const url = getAyahAudioUrl(reciter.subfolder, surah.number, ayahToPlay);

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.src = url;
    audio.playbackRate = settings.playbackSpeed;
    audio.muted = isMuted;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    audio.onended = () => {
      if (stageMode === 'test') {
        if (settings.pauseBetweenAyahsSec > 0) {
          let remaining = settings.pauseBetweenAyahsSec;
          setPauseCountdown(remaining);

          const interval = setInterval(() => {
            remaining -= 1;
            if (remaining > 0) {
              setPauseCountdown(remaining);
            } else {
              clearInterval(interval);
              setPauseCountdown(null);
              handleTestItemEnded();
            }
          }, 1000);
          pauseTimerRef.current = interval;
        } else {
          handleTestItemEnded();
        }
      } else {
        // Listen Mode: smooth progression
        handleListenItemEnded();
      }
    };

    audio.onerror = (e) => {
      console.warn('Audio playback error, moving next:', e);
      setIsPlaying(false);
    };

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((err) => {
        console.warn('Playback prevented or interrupted:', err);
        setIsPlaying(false);
      });
  }, [stageMode, filteredAyahs, listenIndex, currentItem, reciter.subfolder, surah.number, settings.playbackSpeed, settings.pauseBetweenAyahsSec, isMuted]);

  const isLoopingRef = useRef(isLooping);
  isLoopingRef.current = isLooping;

  // When an item ends in Listen mode
  const handleListenItemEnded = () => {
    if (listenIndex + 1 < filteredAyahs.length) {
      setListenIndex((prev) => prev + 1);
    } else if (isLoopingRef.current) {
      if (listenIndex === 0) {
        // If single ayah selected in range, replay directly
        playCurrentAudio();
      } else {
        setListenIndex(0);
      }
    } else {
      setIsPlaying(false);
      setIsCompleted(true);
    }
  };

  // When an item ends in Test (Repetition) mode
  const handleTestItemEnded = () => {
    if (currentIndex + 1 < queue.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
      setIsCompleted(true);

      // Start automatic 3-second countdown to Stage 2 and auto-open microphone!
      let count = 3;
      setAutoTransitionCountdown(count);
      autoTransitionTimerRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setAutoTransitionCountdown(count);
        } else {
          clearInterval(autoTransitionTimerRef.current);
          autoTransitionTimerRef.current = null;
          setAutoTransitionCountdown(null);
          onAdvanceToStage2({ autoStartMic: true });
        }
      }, 1000);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      playCurrentAudio();
      const el = ayahSpanRefs.current[activeAyahNumber];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentIndex, listenIndex, stageMode, isPlaying]);

  const togglePlayPause = () => {
    if (isCompleted) {
      if (autoTransitionTimerRef.current) {
        clearInterval(autoTransitionTimerRef.current);
        autoTransitionTimerRef.current = null;
      }
      setAutoTransitionCountdown(null);
      if (stageMode === 'listen') {
        setListenIndex(0);
      } else {
        setCurrentIndex(0);
      }
      setIsCompleted(false);
      setIsPlaying(true);
      return;
    }

    if (isPlaying) {
      if (pauseTimerRef.current) {
        clearInterval(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      setPauseCountdown(null);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playCurrentAudio();
    }
  };

  const handleNext = () => {
    if (stageMode === 'listen') {
      if (listenIndex + 1 < filteredAyahs.length) {
        setListenIndex((prev) => prev + 1);
      }
    } else {
      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((prev) => prev + 1);
      }
    }
  };

  const handlePrev = () => {
    if (stageMode === 'listen') {
      if (listenIndex > 0) {
        setListenIndex((prev) => prev - 1);
      }
    } else {
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    }
  };

  const handleRestartCurrent = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const jumpToAyah = (ayahNum: number) => {
    if (stageMode === 'listen') {
      const idx = filteredAyahs.findIndex((a) => a.numberInSurah === ayahNum);
      if (idx !== -1) {
        setListenIndex(idx);
        if (!isPlaying) setIsPlaying(true);
      }
    } else {
      const targetIdx = queue.findIndex((q) => q.ayahNumberInSurah === ayahNum);
      if (targetIdx !== -1) {
        setCurrentIndex(targetIdx);
        if (!isPlaying) setIsPlaying(true);
      }
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = stageMode === 'listen'
    ? (filteredAyahs.length > 0 ? Math.round(((listenIndex + 1) / filteredAyahs.length) * 100) : 0)
    : (queue.length > 0 ? Math.round(((currentIndex + 1) / queue.length) * 100) : 0);

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Mode Switcher Banner (الاستماع فقط vs وضع الاختبار والتكرار) */}
      <div className="w-full max-w-full rounded-2xl bg-[#F6F2EA] dark:bg-[#182117] border border-[#DDD3BF] dark:border-[#273525] p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#52674B] text-white shadow-xs shrink-0">
              {stageMode === 'listen' ? <Headphones className="h-5 w-5" /> : <Target className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                  {activeDescription}
                </span>
                {stageMode === 'test' && pauseCountdown !== null && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#688260] text-white animate-bounce">
                    ترديد بعد الشيخ: {pauseCountdown}ث
                  </span>
                )}
                {stageMode === 'listen' && isLooping && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#52674B] text-white">
                    تكرار مستمر مفعل
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6F7D6C] dark:text-[#9FB19B] mt-0.5">
                القارئ: {reciter.name} ({reciter.edition})
              </p>
            </div>
          </div>

          {/* Mode Switcher Segmented Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-[#ECE4D4] dark:bg-[#202B1E] rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D]">
              <button
                onClick={() => handleSwitchMode('listen')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  stageMode === 'listen'
                    ? 'bg-[#52674B] text-white shadow-xs'
                    : 'text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2]'
                }`}
                title="استماع سلس متتابع للمقدار دون تقييد بالتكرارات أو مؤقتات الانتقال"
              >
                <Headphones className="h-3.5 w-3.5" />
                <span>الاستماع فقط</span>
              </button>
              <button
                onClick={() => handleSwitchMode('test')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  stageMode === 'test'
                    ? 'bg-[#52674B] text-white shadow-xs'
                    : 'text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2]'
                }`}
                title="تكرار الآيات والربط التراكمي المنهجي مع الانتقال للاختبار"
              >
                <Target className="h-3.5 w-3.5" />
                <span>وضع الاختبار</span>
              </button>
            </div>

            <button
              onClick={onOpenRangeModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-[#ECE4D4] dark:bg-[#202B1E] hover:bg-[#E2D8C3] dark:hover:bg-[#2A3928] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D] transition-colors"
              title="تحديد نطاق الآيات والسورة"
            >
              <span>الآيات ({fromAyah} - {toAyah})</span>
            </button>

            {/* Skip Stage Button */}
            <button
              onClick={() => {
                if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
                if (autoTransitionTimerRef.current) clearInterval(autoTransitionTimerRef.current);
                if (audioRef.current) audioRef.current.pause();
                if (onSkipStage) onSkipStage();
                else onAdvanceToStage2({ autoStartMic: true });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#52674B] text-white hover:bg-[#43553D] shadow-xs transition-all"
              title="تخطي المرحلة ١ والانتقال للمرحلة ٢ مباشرة"
            >
              <span>تخطي للمرحلة ٢</span>
              <SkipBack className="h-3.5 w-3.5" />
            </button>

            {stageMode === 'test' && (
              <button
                onClick={() => setShowQueueDrawer(!showQueueDrawer)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-[#ECE4D4] dark:bg-[#202B1E] hover:bg-[#E2D8C3] dark:hover:bg-[#2A3928] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D] transition-colors"
              >
                <ListOrdered className="h-4 w-4" />
                <span className="hidden md:inline">مخطط التكرار ({currentIndex + 1}/{queue.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 pt-3 border-t border-[#E5DCcb] dark:border-[#233021]">
          <div className="flex items-center justify-between text-xs text-[#6F7D6C] dark:text-[#9FB19B] mb-1">
            <span>
              {stageMode === 'listen' ? 'تقدم الاستماع للمقدار:' : 'تقدم التكرار التراكمي:'}
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
      </div>

      {/* Completion Banner (Adapted to Mode) */}
      {isCompleted && (
        <div className="w-full max-w-full rounded-2xl p-5 bg-[#EDF3EB] dark:bg-[#1C271A] border-2 border-[#738C6B]/40 text-center space-y-3 shadow-md animate-in fade-in duration-300">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#52674B]/15 text-[#52674B] dark:bg-[#738C6B]/25 dark:text-[#C5D8C1]">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-[#2B3527] dark:text-[#F1F6F0] font-scheherazade">
            {stageMode === 'listen'
              ? `أتممت الاستماع لتلاوة سورة ${surah.name} (الآيات ${fromAyah} - ${toAyah})`
              : 'تمت قراءة وتكرار الآيات مع الشيخ بالكامل!'}
          </h3>
          <p className="text-xs text-[#52624D] dark:text-[#B7C7B2] max-w-lg mx-auto">
            {stageMode === 'test' ? (
              autoTransitionCountdown !== null ? (
                <span className="font-bold text-[#52674B] dark:text-[#C5D8C1]">
                  جاري الانتقال التلقائي إلى المرحلة ٢ وفتح الميكروفون بعد ({autoTransitionCountdown}) ثوانٍ...
                </span>
              ) : (
                'أتممت جميع خطوات التكرار والربط التراكمي بنجاح.'
              )
            ) : (
              'يمكنك إعادة الاستماع بتكرار مستمر، أو بدء وضع الاختبار والتكرار، أو الانتقال للمرحلة التالية وقتما يناسبك.'
            )}
          </p>

          <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
            <button
              onClick={() => {
                if (autoTransitionTimerRef.current) {
                  clearInterval(autoTransitionTimerRef.current);
                  autoTransitionTimerRef.current = null;
                }
                setAutoTransitionCountdown(null);
                if (stageMode === 'listen') {
                  setListenIndex(0);
                } else {
                  setCurrentIndex(0);
                }
                setIsCompleted(false);
                setIsPlaying(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] text-[#3D4D38] dark:text-[#C5D8C1] hover:bg-[#E2D8C3]"
            >
              {stageMode === 'listen' ? 'إعادة الاستماع مجدداً' : 'إعادة تكرار الشيخ'}
            </button>

            {stageMode === 'listen' && (
              <button
                onClick={() => handleSwitchMode('test')}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[#52674B]/20 text-[#52674B] dark:text-[#C5D8C1] hover:bg-[#52674B]/30 transition-all"
              >
                <Target className="h-4 w-4" />
                <span>بدء وضع الاختبار والتكرار</span>
              </button>
            )}

            <button
              onClick={() => {
                if (autoTransitionTimerRef.current) {
                  clearInterval(autoTransitionTimerRef.current);
                  autoTransitionTimerRef.current = null;
                }
                onAdvanceToStage2({ autoStartMic: true });
              }}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-[#52674B] hover:bg-[#43553D] text-white shadow-md transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>الانتقال للمرحلة ٢ (الإخفاء والميكروفون)</span>
            </button>
          </div>
        </div>
      )}

      {/* Unified Mushaf Canvas (Single Space for All Verses) */}
      <div className="w-full max-w-full rounded-3xl mushaf-canvas p-6 sm:p-10 lg:p-14 transition-all">
        <div
          className="font-quran text-2xl sm:text-3xl lg:text-4xl leading-loose sm:leading-loose lg:leading-loose text-center text-[#232B20] dark:text-[#F3F8F2] select-none"
          dir="rtl"
        >
          {filteredAyahs.map((ayah) => {
            const isPlayingThisAyah = activeAyahNumber === ayah.numberInSurah;
            const isInCurrentLinkGroup = stageMode === 'test' && currentItem?.allAyahsInGroup?.includes(ayah.numberInSurah);

            return (
              <span
                key={ayah.numberInSurah}
                ref={(el) => {
                  ayahSpanRefs.current[ayah.numberInSurah] = el;
                }}
                onClick={() => jumpToAyah(ayah.numberInSurah)}
                className={`inline transition-all duration-300 cursor-pointer rounded-xl px-2 py-1 mx-0.5 ${
                  isPlayingThisAyah
                    ? 'bg-[#52674B]/20 dark:bg-[#738C6B]/35 text-[#1C2519] dark:text-white font-bold ring-2 ring-[#738C6B]/40 shadow-xs'
                    : isInCurrentLinkGroup
                    ? 'bg-[#E7DFCFA0] dark:bg-[#253223A0] text-[#2F3A2A] dark:text-[#C5D8C1]'
                    : 'hover:bg-[#EBE2D2]/60 dark:hover:bg-[#202B1E]/60'
                }`}
                title={`الآية ${ayah.numberInSurah} (انقر للاستماع)`}
              >
                <span>{ayah.text}</span>
                <span className="inline-block font-scheherazade text-[#52674B] dark:text-[#A4BA9E] mr-2 text-2xl sm:text-3xl ayah-number font-normal">
                  ۝{ayah.numberInSurah}
                </span>{' '}
              </span>
            );
          })}
        </div>
      </div>

      {/* Floating Audio Controller Bar */}
      <div className="sticky bottom-3 z-30 w-full max-w-full rounded-2xl bg-[#F9F6EE]/95 dark:bg-[#162015]/95 backdrop-blur-md border border-[#DDD4C1] dark:border-[#273525] p-3.5 shadow-xl">
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#2B3527] dark:text-[#F1F6F0]">
            <span>{activeDescription}</span>
          </div>

          {/* Central Controls */}
          <div className="flex items-center gap-2 sm:gap-3 mx-auto">
            <button
              onClick={handlePrev}
              disabled={stageMode === 'listen' ? listenIndex === 0 : currentIndex === 0}
              className="p-2 rounded-xl text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="السابق"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            <button
              onClick={togglePlayPause}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#52674B] hover:bg-[#43553D] text-white shadow-md active:scale-95 transition-all"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 mr-0.5" />}
            </button>

            <button
              onClick={handleRestartCurrent}
              className="p-2 rounded-xl text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E] transition-colors"
              title="إعادة الآية الحالية"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            <button
              onClick={handleNext}
              disabled={
                stageMode === 'listen'
                  ? listenIndex + 1 >= filteredAyahs.length
                  : currentIndex + 1 >= queue.length
              }
              className="p-2 rounded-xl text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="التالي"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            {stageMode === 'listen' && (
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`p-2 rounded-xl transition-colors ${
                  isLooping
                    ? 'bg-[#52674B] text-white'
                    : 'text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E]'
                }`}
                title={isLooping ? 'إيقاف التكرار المستمر للمقدار' : 'تفعيل التكرار المستمر للمقدار'}
              >
                <Repeat className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Time, Volume & Skip Stage */}
          <div className="flex items-center gap-2.5 text-xs text-[#6F7D6C] dark:text-[#9FB19B]">
            <span className="font-mono tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <button
              onClick={() => {
                const nextMute = !isMuted;
                setIsMuted(nextMute);
                if (audioRef.current) audioRef.current.muted = nextMute;
              }}
              className="p-1.5 rounded-lg hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E]"
              title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
                if (autoTransitionTimerRef.current) clearInterval(autoTransitionTimerRef.current);
                if (audioRef.current) audioRef.current.pause();
                if (onSkipStage) onSkipStage();
                else onAdvanceToStage2({ autoStartMic: true });
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#52674B] text-white hover:bg-[#43553D] font-bold text-xs shadow-xs transition-all"
              title="تخطي المرحلة ١ والانتقال للمرحلة ٢"
            >
              <span>تخطي</span>
              <SkipBack className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Queue Drawer Modal (for Test Mode) */}
      {showQueueDrawer && stageMode === 'test' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-[#F9F6EE] dark:bg-[#162015] border border-[#DDD3BF] dark:border-[#2A3728] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[#DDD3BF] dark:border-[#2A3728] px-5 py-4 bg-[#EDE5D5] dark:bg-[#1D271B]">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-[#52674B] dark:text-[#C5D8C1]" />
                <h3 className="font-bold text-base text-[#2B3527] dark:text-[#F1F6F0]">
                  خطة التكرار التراكمي ({queue.length} خطوة)
                </h3>
              </div>
              <button
                onClick={() => setShowQueueDrawer(false)}
                className="text-[#6F7D6C] hover:text-[#2B3527] dark:text-[#9FB19B] text-lg px-2"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-1.5 max-h-[60vh]">
              {queue.map((item, idx) => {
                const isItemActive = idx === currentIndex;
                const isPassed = idx < currentIndex;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowQueueDrawer(false);
                      if (!isPlaying) setIsPlaying(true);
                    }}
                    className={`w-full text-right p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isItemActive
                        ? 'border-[#52674B] bg-[#52674B]/15 font-bold text-[#2B3527] dark:text-[#F1F6F0] shadow-xs'
                        : isPassed
                        ? 'border-[#E2D8C3] dark:border-[#253223] bg-[#F5EFE3]/50 dark:bg-[#121911]/40 text-[#828F7F]'
                        : 'border-[#E2D8C3] dark:border-[#253223] hover:bg-[#EDE5D5] dark:hover:bg-[#1F2A1E] text-[#485643] dark:text-[#B7C7B2]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isItemActive
                            ? 'bg-[#52674B] text-white'
                            : isPassed
                            ? 'bg-[#688260]/20 text-[#688260]'
                            : 'bg-[#DDD3BF] dark:bg-[#2A3728] text-[#556450]'
                        }`}
                      >
                        {isPassed ? '✓' : idx + 1}
                      </span>
                      <span className="text-xs">{item.stepDescription}</span>
                    </div>

                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#ECE5D5] dark:bg-[#202B1E] text-[#3D4D38] dark:text-[#C5D8C1]">
                      {item.type === 'single_ayah'
                        ? 'تكرار آية'
                        : item.type === 'cumulative_link'
                        ? 'ربط تراكمي'
                        : 'مراجعة ختامية'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-[#DDD3BF] dark:border-[#2A3728] flex justify-end">
              <button
                onClick={() => setShowQueueDrawer(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#52674B] text-white hover:bg-[#43553D]"
              >
                إغلاق الخريطة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

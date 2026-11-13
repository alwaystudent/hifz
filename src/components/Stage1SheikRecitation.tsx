import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AyahItem, Reciter, RepetitionSettings, QueueItem, SurahMeta, StageMode } from '../types/quran';
import { buildRepetitionQueue } from '../utils/repetitionQueue';
import { startReciterAyahPlayback, preloadReciterAyah } from '../utils/audioPlayback';
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
  const [stageMode, setStageMode] = useState<StageMode>('listen');
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
  const cancelPlaybackRef = useRef<(() => void) | null>(null);
  const pauseTimerRef = useRef<any>(null);
  const autoTransitionTimerRef = useRef<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const ayahSpanRefs = useRef<Record<number, HTMLSpanElement | null>>({});

  const currentItem: QueueItem | undefined = queue[currentIndex];
  const currentListenAyah = filteredAyahs[listenIndex];

  const activeAyahNumber =
    stageMode === 'listen'
      ? currentListenAyah?.numberInSurah || fromAyah
      : currentItem?.ayahNumberInSurah || fromAyah;

  const activeDescription =
    stageMode === 'listen'
      ? `استماع الآية ${activeAyahNumber} (${listenIndex + 1} من ${filteredAyahs.length})`
      : currentItem?.stepDescription || 'جاهز للاستماع والتكرار';

  const stopActivePlayback = useCallback(() => {
    if (cancelPlaybackRef.current) {
      cancelPlaybackRef.current();
      cancelPlaybackRef.current = null;
    }
    if (pauseTimerRef.current) {
      clearInterval(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPauseCountdown(null);
  }, []);

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
    stopActivePlayback();
    setIsPlaying(false);
  }, [surah.number, fromAyah, toAyah, reciter.id, stopActivePlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopActivePlayback();
      if (autoTransitionTimerRef.current) {
        clearInterval(autoTransitionTimerRef.current);
        autoTransitionTimerRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [stopActivePlayback]);

  const handleSwitchMode = (newMode: StageMode) => {
    if (newMode === stageMode) return;
    stopActivePlayback();
    if (autoTransitionTimerRef.current) {
      clearInterval(autoTransitionTimerRef.current);
      autoTransitionTimerRef.current = null;
    }
    setIsPlaying(false);
    setIsCompleted(false);
    setAutoTransitionCountdown(null);
    setStageMode(newMode);
    if (newMode === 'listen') {
      setListenIndex(0);
    } else {
      setCurrentIndex(0);
    }
  };

  // Preload next audio
  useEffect(() => {
    if (!preloadAudioRef.current) preloadAudioRef.current = new Audio();
    if (stageMode === 'test' && currentIndex + 1 < queue.length) {
      const nextItem = queue[currentIndex + 1];
      preloadReciterAyah(preloadAudioRef.current, reciter, surah.number, nextItem.ayahNumberInSurah);
    } else if (stageMode === 'listen' && listenIndex + 1 < filteredAyahs.length) {
      const nextAyah = filteredAyahs[listenIndex + 1];
      preloadReciterAyah(preloadAudioRef.current, reciter, surah.number, nextAyah.numberInSurah);
    }
  }, [stageMode, currentIndex, queue, listenIndex, filteredAyahs, reciter, surah.number]);

  const isLoopingRef = useRef(isLooping);
  isLoopingRef.current = isLooping;

  const listenIndexRef = useRef(listenIndex);
  listenIndexRef.current = listenIndex;

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const playCurrentAudioRef = useRef<() => void>(() => {});

  const handleListenItemEnded = useCallback(() => {
    if (listenIndexRef.current + 1 < filteredAyahs.length) {
      setListenIndex((prev) => prev + 1);
    } else if (isLoopingRef.current) {
      if (listenIndexRef.current === 0) {
        playCurrentAudioRef.current();
      } else {
        setListenIndex(0);
      }
    } else {
      setIsPlaying(false);
      setIsCompleted(true);
    }
  }, [filteredAyahs.length]);

  const handleTestItemEnded = useCallback(() => {
    if (currentIndexRef.current + 1 < queue.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
      setIsCompleted(true);

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
  }, [queue.length, onAdvanceToStage2]);

  const playCurrentAudio = useCallback(() => {
    const ayahToPlay =
      stageMode === 'listen'
        ? filteredAyahs[listenIndex]?.numberInSurah
        : currentItem?.ayahNumberInSurah;

    if (!ayahToPlay) return;

    stopActivePlayback();

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    cancelPlaybackRef.current = startReciterAyahPlayback({
      audio: audioRef.current,
      reciter,
      surahNumber: surah.number,
      ayahNum: ayahToPlay,
      playbackRate: settings.playbackSpeed,
      isMuted,
      onStarted: () => {
        setIsPlaying(true);
      },
      onProgress: (elapsed, total) => {
        setCurrentTime(elapsed);
        setDuration(total);
      },
      onEnded: () => {
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
                pauseTimerRef.current = null;
                setPauseCountdown(null);
                handleTestItemEnded();
              }
            }, 1000);
            pauseTimerRef.current = interval;
          } else {
            handleTestItemEnded();
          }
        } else {
          handleListenItemEnded();
        }
      },
      onError: () => {
        setIsPlaying(false);
      },
    });
  }, [
    stageMode,
    filteredAyahs,
    listenIndex,
    currentItem,
    reciter,
    surah.number,
    settings.playbackSpeed,
    settings.pauseBetweenAyahsSec,
    isMuted,
    stopActivePlayback,
    handleTestItemEnded,
    handleListenItemEnded,
  ]);

  playCurrentAudioRef.current = playCurrentAudio;

  // Keep container steady: only scroll inside Mushaf container if the active Ayah is outside the visible area
  useEffect(() => {
    if (isPlaying) {
      playCurrentAudio();
      const container = scrollContainerRef.current;
      const el = ayahSpanRefs.current[activeAyahNumber];
      if (container && el) {
        const cRect = container.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        if (eRect.top < cRect.top + 20 || eRect.bottom > cRect.bottom - 20) {
          const offset = el.offsetTop - container.offsetTop - container.clientHeight / 3;
          container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
        }
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
      stopActivePlayback();
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
    playCurrentAudio();
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

  const progressPercent =
    stageMode === 'listen'
      ? filteredAyahs.length > 0
        ? Math.round(((listenIndex + 1) / filteredAyahs.length) * 100)
        : 0
      : queue.length > 0
      ? Math.round(((currentIndex + 1) / queue.length) * 100)
      : 0;

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-1.5">
      {/* Compact Stationary Top Status & Mode Bar */}
      <div className="shrink-0 w-full rounded-xl bg-[#F6F2EA] dark:bg-[#182117] border border-[#DDD3BF] dark:border-[#273525] px-2.5 py-1.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#52674B] text-white shrink-0">
              {stageMode === 'listen' ? <Headphones className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-xs font-bold text-[#2B3527] dark:text-[#F1F6F0] truncate">
                {activeDescription}
              </span>
              <span className="text-[11px] text-[#6F7D6C] dark:text-[#9FB19B] hidden md:inline">
                ({reciter.name})
              </span>
              {stageMode === 'test' && pauseCountdown !== null && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#688260] text-white">
                  ترديد: {pauseCountdown}ث
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
                <span>الاستماع</span>
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
                <span>الاختبار</span>
              </button>
            </div>

            <button
              onClick={onOpenRangeModal}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] hover:bg-[#E2D8C3] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D] transition-colors"
            >
              <span>({fromAyah}-{toAyah})</span>
            </button>

            <button
              onClick={() => {
                stopActivePlayback();
                if (autoTransitionTimerRef.current) clearInterval(autoTransitionTimerRef.current);
                if (onSkipStage) onSkipStage();
                else onAdvanceToStage2({ autoStartMic: true });
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#52674B] text-white hover:bg-[#43553D] shadow-xs transition-colors"
            >
              <span>تخطي للمرحلة ٢</span>
              <SkipBack className="h-3 w-3" />
            </button>

            {stageMode === 'test' && (
              <button
                onClick={() => setShowQueueDrawer(!showQueueDrawer)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] hover:bg-[#E2D8C3] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D] transition-colors"
              >
                <ListOrdered className="h-3 w-3" />
                <span className="hidden md:inline">({currentIndex + 1}/{queue.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Slim Progress Bar */}
        <div className="mt-1.5 flex items-center gap-2">
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

      {/* Completion Banner */}
      {isCompleted && (
        <div className="shrink-0 w-full rounded-2xl p-4 bg-[#EDF3EB] dark:bg-[#1C271A] border border-[#738C6B]/40 text-center space-y-2 shadow-sm">
          <div className="flex items-center justify-center gap-2 text-[#2B3527] dark:text-[#F1F6F0]">
            <CheckCircle2 className="h-5 w-5 text-[#52674B] dark:text-[#C5D8C1]" />
            <h3 className="text-base font-bold font-scheherazade">
              {stageMode === 'listen'
                ? `أتممت الاستماع لتلاوة سورة ${surah.name} (الآيات ${fromAyah} - ${toAyah})`
                : 'تمت قراءة وتكرار الآيات مع الشيخ بالكامل!'}
            </h3>
          </div>
          {stageMode === 'test' && autoTransitionCountdown !== null && (
            <p className="text-xs font-bold text-[#52674B] dark:text-[#C5D8C1]">
              جاري الانتقال التلقائي إلى المرحلة ٢ وفتح الميكروفون بعد ({autoTransitionCountdown}) ثوانٍ...
            </p>
          )}
          <div className="flex items-center justify-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                if (autoTransitionTimerRef.current) {
                  clearInterval(autoTransitionTimerRef.current);
                  autoTransitionTimerRef.current = null;
                }
                setAutoTransitionCountdown(null);
                if (stageMode === 'listen') setListenIndex(0);
                else setCurrentIndex(0);
                setIsCompleted(false);
                setIsPlaying(true);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] text-[#3D4D38] dark:text-[#C5D8C1] hover:bg-[#E2D8C3]"
            >
              إعادة الاستماع مجدداً
            </button>
            <button
              onClick={() => {
                if (autoTransitionTimerRef.current) {
                  clearInterval(autoTransitionTimerRef.current);
                  autoTransitionTimerRef.current = null;
                }
                onAdvanceToStage2({ autoStartMic: true });
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-[#52674B] hover:bg-[#43553D] text-white shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>الانتقال للمرحلة ٢</span>
            </button>
          </div>
        </div>
      )}

      {/* Maximized Scrollable Mushaf Canvas inside Fixed Screen */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto w-full rounded-2xl mushaf-canvas p-3 sm:p-5 lg:p-6"
      >
        <div
          className={`font-quran text-center text-[#232B20] dark:text-[#F3F8F2] select-none ${
            settings.ayahFontSize === 'large'
              ? 'text-2xl sm:text-3xl leading-[2.3]'
              : settings.ayahFontSize === 'medium'
              ? 'text-xl sm:text-2xl leading-[2.15]'
              : 'text-lg sm:text-xl lg:text-[22px] leading-[2.05]'
          }`}
          dir="rtl"
        >
          {filteredAyahs.map((ayah) => {
            const isPlayingThisAyah = activeAyahNumber === ayah.numberInSurah;
            const isInCurrentLinkGroup =
              stageMode === 'test' && currentItem?.allAyahsInGroup?.includes(ayah.numberInSurah);

            return (
              <span
                key={ayah.numberInSurah}
                ref={(el) => {
                  ayahSpanRefs.current[ayah.numberInSurah] = el;
                }}
                onClick={() => jumpToAyah(ayah.numberInSurah)}
                className={`inline transition-colors duration-200 cursor-pointer rounded-lg px-1 py-0.5 mx-0.5 ${
                  isPlayingThisAyah
                    ? 'bg-[#52674B]/20 dark:bg-[#738C6B]/35 text-[#1C2519] dark:text-white font-bold ring-1 ring-[#738C6B]/50'
                    : isInCurrentLinkGroup
                    ? 'bg-[#E7DFCFA0] dark:bg-[#253223A0] text-[#2F3A2A] dark:text-[#C5D8C1]'
                    : 'hover:bg-[#EBE2D2]/60 dark:hover:bg-[#202B1E]/60'
                }`}
                title={`الآية ${ayah.numberInSurah} (انقر للاستماع)`}
              >
                <span>{ayah.text}</span>
                <span
                  className={`inline-block font-scheherazade text-[#52674B] dark:text-[#A4BA9E] mr-1.5 ayah-number font-normal ${
                    settings.ayahFontSize === 'large'
                      ? 'text-xl sm:text-2xl'
                      : settings.ayahFontSize === 'medium'
                      ? 'text-lg sm:text-xl'
                      : 'text-base sm:text-lg'
                  }`}
                >
                  ۝{ayah.numberInSurah}
                </span>{' '}
              </span>
            );
          })}
        </div>
      </div>

      {/* Compact Stationary Bottom Audio Controller Bar */}
      <div className="shrink-0 w-full rounded-xl bg-[#F9F6EE] dark:bg-[#162015] border border-[#DDD4C1] dark:border-[#273525] px-3 py-1.5 shadow-xs">
        <div className="w-full flex flex-wrap items-center justify-between gap-1.5">
          <div className="text-[11px] font-bold text-[#2B3527] dark:text-[#F1F6F0] truncate max-w-[180px] hidden sm:block">
            {activeDescription}
          </div>

          <div className="flex items-center gap-1.5 mx-auto">
            <button
              onClick={handlePrev}
              disabled={stageMode === 'listen' ? listenIndex === 0 : currentIndex === 0}
              className="p-1.5 rounded-lg text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="السابق"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            <button
              onClick={togglePlayPause}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#52674B] hover:bg-[#43553D] text-white shadow-xs transition-colors"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 mr-0.5" />}
            </button>

            <button
              onClick={handleRestartCurrent}
              className="p-1.5 rounded-lg text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E] transition-colors"
              title="إعادة الآية الحالية"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={handleNext}
              disabled={
                stageMode === 'listen'
                  ? listenIndex + 1 >= filteredAyahs.length
                  : currentIndex + 1 >= queue.length
              }
              className="p-1.5 rounded-lg text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="التالي"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            {stageMode === 'listen' && (
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isLooping
                    ? 'bg-[#52674B] text-white'
                    : 'text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E]'
                }`}
                title={isLooping ? 'إيقاف التكرار المستمر' : 'تفعيل التكرار المستمر'}
              >
                <Repeat className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#6F7D6C] dark:text-[#9FB19B]">
            <span className="font-mono tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <button
              onClick={() => {
                const nextMute = !isMuted;
                setIsMuted(nextMute);
                if (audioRef.current) audioRef.current.muted = nextMute;
              }}
              className="p-1 rounded-lg hover:bg-[#ECE5D5] dark:hover:bg-[#202B1E]"
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Queue Drawer Modal */}
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
                    className={`w-full text-right p-3 rounded-xl border flex items-center justify-between transition-colors ${
                      isItemActive
                        ? 'border-[#52674B] bg-[#52674B]/15 font-bold text-[#2B3527] dark:text-[#F1F6F0]'
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
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

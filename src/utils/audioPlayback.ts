import { Reciter } from '../types/quran';
import { fetchAyahTimings } from '../data/quranData';
import { getAyahAudioUrl, pad3 } from './arabic';

export interface AyahPlaybackOptions {
  audio: HTMLAudioElement;
  reciter: Reciter;
  surahNumber: number;
  ayahNum: number;
  playbackRate?: number;
  isMuted?: boolean;
  onStarted?: () => void;
  onProgress?: (elapsedSec: number, totalSec: number) => void;
  onEnded: () => void;
  onError?: (err: unknown) => void;
}

/**
 * Plays a single Ayah cleanly for both:
 * 1) Direct Ayah MP3 reciters (EveryAyah Hafs & Warsh)
 * 2) Timed Full-Surah MP3 reciters (mp3quran Qalun & Warsh Husary)
 *
 * Returns a cancellation function to abort pending timing fetches or segment listeners.
 */
export function startReciterAyahPlayback({
  audio,
  reciter,
  surahNumber,
  ayahNum,
  playbackRate = 1.0,
  isMuted = false,
  onStarted,
  onProgress,
  onEnded,
  onError,
}: AyahPlaybackOptions): () => void {
  let cancelled = false;
  let endedDispatched = false;

  const clearListeners = () => {
    audio.onloadedmetadata = null;
    audio.ontimeupdate = null;
    audio.onended = null;
    audio.onerror = null;
  };

  const dispatchEnded = () => {
    if (cancelled || endedDispatched) return;
    endedDispatched = true;
    clearListeners();
    onEnded();
  };

  // Path A: Direct Ayah MP3 (EveryAyah)
  if (!reciter.mp3QuranReadId || !reciter.mp3QuranFolderUrl) {
    clearListeners();
    const url = getAyahAudioUrl(reciter.subfolder, surahNumber, ayahNum);
    audio.src = url;
    audio.playbackRate = playbackRate;
    audio.muted = isMuted;

    audio.onloadedmetadata = () => {
      if (!cancelled) onProgress?.(0, audio.duration || 0);
    };
    audio.ontimeupdate = () => {
      if (!cancelled) onProgress?.(audio.currentTime || 0, audio.duration || 0);
    };
    audio.onended = dispatchEnded;
    audio.onerror = (e) => {
      if (!cancelled) onError?.(e);
    };

    audio
      .play()
      .then(() => {
        if (!cancelled) onStarted?.();
      })
      .catch((err) => {
        if (!cancelled) onError?.(err);
      });

    return () => {
      cancelled = true;
      clearListeners();
      audio.pause();
    };
  }

  // Path B: Timed Surah MP3 (Qalun & Timed Warsh via mp3quran.net)
  const surahUrl = `${reciter.mp3QuranFolderUrl}${pad3(surahNumber)}.mp3`;

  fetchAyahTimings(reciter.mp3QuranReadId, surahNumber)
    .then((timings) => {
      if (cancelled) return;

      const segment = timings.find((t) => t.ayah === ayahNum);
      if (!segment) {
        // Fallback: if timing entry missing, play surah from start safely
        throw new Error(`No timing found for surah ${surahNumber} ayah ${ayahNum}`);
      }

      const startSec = Math.max(0, segment.start_time / 1000);
      const endSec = Math.max(startSec + 0.3, segment.end_time / 1000);
      const segDuration = Math.max(0.5, endSec - startSec);

      clearListeners();

      const needsNewSrc = audio.src !== surahUrl;
      if (needsNewSrc) {
        audio.src = surahUrl;
      }

      audio.playbackRate = playbackRate;
      audio.muted = isMuted;

      const beginSegmentPlayback = () => {
        if (cancelled) return;
        try {
          audio.currentTime = startSec;
        } catch {
          // Wait for seekable
        }
        onProgress?.(0, segDuration);

        audio.ontimeupdate = () => {
          if (cancelled || endedDispatched) return;
          const rel = Math.max(0, audio.currentTime - startSec);
          onProgress?.(Math.min(rel, segDuration), segDuration);
          if (audio.currentTime >= endSec - 0.04) {
            audio.pause();
            dispatchEnded();
          }
        };

        audio.onended = dispatchEnded;
        audio.onerror = (e) => {
          if (!cancelled) onError?.(e);
        };

        audio
          .play()
          .then(() => {
            if (!cancelled) onStarted?.();
          })
          .catch((err) => {
            if (!cancelled) onError?.(err);
          });
      };

      if (!needsNewSrc && audio.readyState >= 1) {
        beginSegmentPlayback();
      } else {
        audio.onloadedmetadata = beginSegmentPlayback;
        audio.load();
      }
    })
    .catch((err) => {
      if (!cancelled) onError?.(err);
    });

  return () => {
    cancelled = true;
    clearListeners();
    audio.pause();
  };
}

/**
 * Preloads the next audio file safely
 */
export function preloadReciterAyah(
  preloadAudio: HTMLAudioElement,
  reciter: Reciter,
  surahNumber: number,
  ayahNum: number
) {
  if (reciter.mp3QuranReadId && reciter.mp3QuranFolderUrl) {
    const surahUrl = `${reciter.mp3QuranFolderUrl}${pad3(surahNumber)}.mp3`;
    if (preloadAudio.src !== surahUrl) {
      preloadAudio.src = surahUrl;
      preloadAudio.preload = 'auto';
    }
    fetchAyahTimings(reciter.mp3QuranReadId, surahNumber).catch(() => {});
  } else {
    preloadAudio.src = getAyahAudioUrl(reciter.subfolder, surahNumber, ayahNum);
    preloadAudio.preload = 'auto';
  }
}

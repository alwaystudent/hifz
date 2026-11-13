/**
 * Gentle synthesized Web Audio ringtones for incoming and outgoing voice calls.
 * Requires zero external audio assets so it works reliably on Vercel & offline/static hosts.
 */

let sharedAudioCtx: AudioContext | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let isUnlockBound = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function bindAudioUnlockOnce() {
  if (typeof window === 'undefined' || isUnlockBound) return;
  isUnlockBound = true;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffsetSec: number,
  durationSec: number,
  volume: number,
  type: OscillatorType = 'sine'
) {
  const now = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

function playIncomingChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    // Gentle harmonious 3-note chime (E5 - G#5 - B5)
    playTone(ctx, 659.25, 0, 0.28, 0.14, 'sine');
    playTone(ctx, 830.61, 0.14, 0.28, 0.14, 'sine');
    playTone(ctx, 987.77, 0.28, 0.42, 0.12, 'triangle');
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([180, 100, 180]);
    }
  } catch {
    // ignore autoplay restriction errors gracefully
  }
}

function playOutgoingPulse() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    // Soft low-volume ringback tone
    playTone(ctx, 440, 0, 0.35, 0.06, 'sine');
    playTone(ctx, 480, 0, 0.35, 0.05, 'sine');
  } catch {
    // ignore
  }
}

export function startIncomingRingtone() {
  stopAllRingtones();
  playIncomingChime();
  ringInterval = setInterval(playIncomingChime, 2100);
}

export function startOutgoingRingback() {
  stopAllRingtones();
  playOutgoingPulse();
  ringInterval = setInterval(playOutgoingPulse, 2400);
}

export function stopAllRingtones() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      // ignore
    }
  }
}

import React, { useEffect, createContext, useState, useContext, useRef, useCallback } from 'react';

// ─── Haptic feedback helpers (lazy Capacitor import) ──────────────────────────
// We dynamically import Capacitor only when actually running natively to avoid
// registration conflicts and module-level initialization issues in the browser.

async function hapticsSuccess() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* noop — haptics unavailable on web */ }
}

async function hapticsFailure() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch { /* noop — haptics unavailable on web */ }
}

// ─── Shared Web Audio context ─────────────────────────────────────────────────
let sharedCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioContext();
  }
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
}

// ─── Low-level tone builder ───────────────────────────────────────────────────
function tone(
  type: OscillatorType,
  freq: number,
  durationSec: number,
  vol = 0.08,
  freqEnd?: number,
  startDelay = 0,
): void {
  try {
    const ctx = getCtx();
    const t0  = ctx.currentTime + startDelay;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, t0 + durationSec);
    }
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.linearRampToValueAtTime(vol * 0.6, t0 + durationSec * 0.6);
    gain.gain.linearRampToValueAtTime(0.001, t0 + durationSec * 0.95);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + durationSec + 0.01);
  } catch { /* Audio context may not be available */ }
}

// ─── Sound effect library ─────────────────────────────────────────────────────

// Selecting a urinal — very soft click ≤120ms
function sfxSelect() {
  tone('sine', 340, 0.10, 0.06);
}

// Correct choice — soft two-note sine chord C5 + E5, 150ms fade out
function sfxSuccess() {
  tone('sine', 523.25, 0.15, 0.08);          // C5
  tone('sine', 659.25, 0.15, 0.06, undefined, 0.01); // E5 slightly offset
  hapticsSuccess();
}

// Wrong choice — subtle descending low sawtooth 180Hz→120Hz
function sfxFailure() {
  tone('sawtooth', 180, 0.20, 0.06, 120);
  hapticsFailure();
}

function sfxPissing() {
  tone('sine', 800, 1.2, 0.06, 400);
  tone('sine', 620, 1.0, 0.05, 320, 0.20);
}

function sfxFlush() {
  tone('sawtooth', 540, 0.7, 0.06, 80);
  tone('sine',     380, 0.5, 0.05, 60, 0.18);
}

function sfxZipper() {
  tone('square', 200, 0.10, 0.06, 800);
  tone('square', 800, 0.10, 0.05, 200, 0.11);
}

// ─── 8-bit music engine ───────────────────────────────────────────────────────
const NOTE = {
  C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392.00,A4:440.00,B4:493.88,
  C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880.00,B5:987.77,C6:1046.50,R:0,
};

const MELODY: Array<{freq:number;dur:number}> = [
  {freq:NOTE.C5,dur:0.15},{freq:NOTE.E5,dur:0.15},{freq:NOTE.G5,dur:0.15},
  {freq:NOTE.C6,dur:0.30},{freq:NOTE.B5,dur:0.15},
  {freq:NOTE.G5,dur:0.15},{freq:NOTE.A5,dur:0.15},{freq:NOTE.F5,dur:0.15},
  {freq:NOTE.E5,dur:0.30},{freq:NOTE.R, dur:0.10},
  {freq:NOTE.D5,dur:0.15},{freq:NOTE.F5,dur:0.15},{freq:NOTE.A5,dur:0.15},
  {freq:NOTE.D5,dur:0.15},{freq:NOTE.E5,dur:0.15},{freq:NOTE.C5,dur:0.30},
  {freq:NOTE.R, dur:0.10},
  {freq:NOTE.G4,dur:0.15},{freq:NOTE.B4,dur:0.15},{freq:NOTE.D5,dur:0.15},
  {freq:NOTE.G5,dur:0.20},{freq:NOTE.F5,dur:0.15},{freq:NOTE.E5,dur:0.15},
  {freq:NOTE.D5,dur:0.15},{freq:NOTE.C5,dur:0.15},{freq:NOTE.B4,dur:0.15},
  {freq:NOTE.C5,dur:0.40},{freq:NOTE.R, dur:0.20},
];

const BASS: Array<{freq:number;dur:number}> = [
  {freq:NOTE.C4,dur:0.45},{freq:NOTE.G4,dur:0.45},
  {freq:NOTE.F4,dur:0.45},{freq:NOTE.G4,dur:0.45},
  {freq:NOTE.F4,dur:0.45},{freq:NOTE.G4,dur:0.45},
  {freq:NOTE.C4,dur:0.45},{freq:NOTE.G4,dur:0.45},
];

class MusicEngine {
  private mCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private playing = false;
  private loopTimeout: ReturnType<typeof setTimeout> | null = null;

  start() {
    if (this.playing) return;
    this.playing = true;
    this.mCtx = new AudioContext();
    this.gainNode = this.mCtx.createGain();
    this.gainNode.gain.value = 0.14;
    this.gainNode.connect(this.mCtx.destination);
    this.scheduleLoop();
  }

  stop() {
    this.playing = false;
    if (this.loopTimeout) clearTimeout(this.loopTimeout);
    try { this.mCtx?.close(); } catch { /* noop */ }
    this.mCtx = null;
    this.gainNode = null;
  }

  isPlaying() { return this.playing; }

  private scheduleLoop() {
    if (!this.playing || !this.mCtx || !this.gainNode) return;
    const ctx = this.mCtx;
    const gain = this.gainNode;
    const t0 = ctx.currentTime;

    const playLine = (notes: typeof MELODY, type: OscillatorType, vol: number) => {
      let t = t0;
      for (const n of notes) {
        if (n.freq > 0) {
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          osc.type = type;
          osc.frequency.value = n.freq;
          env.gain.setValueAtTime(0.001, t);
          env.gain.linearRampToValueAtTime(vol, t + 0.02);
          env.gain.linearRampToValueAtTime(vol * 0.7, t + n.dur * 0.6);
          env.gain.linearRampToValueAtTime(0.001, t + n.dur * 0.95);
          osc.connect(env); env.connect(gain);
          osc.start(t); osc.stop(t + n.dur);
        }
        t += n.dur;
      }
    };

    playLine(MELODY, 'square', 0.65);
    playLine(BASS,   'triangle', 0.38);

    const loopDur = MELODY.reduce((s, n) => s + n.dur, 0);
    this.loopTimeout = setTimeout(() => this.scheduleLoop(), (loopDur - 0.05) * 1000);
  }
}

const musicEngine = new MusicEngine();

// ─── Context ──────────────────────────────────────────────────────────────────
type AudioContextType = {
  playSound:      (soundId: string) => void;
  toggleBgMusic:  () => void;
  isMusicPlaying: boolean;
  startTimer:     (callback: () => void) => void;
  stopTimer:      () => void;
};

const AudioCtx = createContext<AudioContextType>({
  playSound:      () => {},
  toggleBgMusic:  () => {},
  isMusicPlaying: false,
  startTimer:     () => {},
  stopTimer:      () => {},
});

export const useAudio = () => useContext(AudioCtx);

const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playSound = useCallback((soundId: string) => {
    switch (soundId) {
      case 'select':   sfxSelect();  break;
      case 'success':  sfxSuccess(); break;
      case 'failure':  sfxFailure(); break;
      case 'pissing':  sfxPissing(); break;
      case 'flush':    sfxFlush();   break;
      case 'zipper':   sfxZipper();  break;
    }
  }, []);

  const toggleBgMusic = useCallback(() => {
    if (musicEngine.isPlaying()) {
      musicEngine.stop();
      setIsMusicPlaying(false);
    } else {
      musicEngine.start();
      setIsMusicPlaying(true);
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback((callback: () => void) => {
    stopTimer();
    let secondsLeft = 30;
    timerRef.current = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) { callback(); stopTimer(); }
    }, 1000);
  }, [stopTimer]);

  useEffect(() => () => {
    musicEngine.stop();
    stopTimer();
  }, [stopTimer]);

  return (
    <AudioCtx.Provider value={{
      playSound, toggleBgMusic, isMusicPlaying, startTimer, stopTimer,
    }}>
      {children}
    </AudioCtx.Provider>
  );
};

export default AudioProvider;

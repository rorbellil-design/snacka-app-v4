import { RingtoneType } from '../types';

export interface RingtoneOption {
  id: RingtoneType;
  name: string;
  emoji: string;
  description: string;
  genre: string;
  color: string;
}

export const RINGTONE_OPTIONS: RingtoneOption[] = [
  {
    id: 'marimba',
    name: 'Klassisk Marimba',
    emoji: '🎵',
    description: 'Varm och pigg marimbamelodi',
    genre: 'Klassisk',
    color: 'from-amber-400 to-orange-500',
  },
  {
    id: 'gaming',
    name: '8-Bit Arcade',
    emoji: '🕹️',
    description: 'Retro arkad-melodi i chiptune-stil',
    genre: 'Gaming',
    color: 'from-emerald-400 to-teal-500',
  },
  {
    id: 'synth',
    name: 'Synthwave Neon',
    emoji: '🎹',
    description: 'Cool elektronisk synth-slinga',
    genre: 'Synth',
    color: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'bells',
    name: 'Kristallklockor',
    emoji: '🔔',
    description: 'Ljusa och vackra klocktoner',
    genre: 'Mjuk',
    color: 'from-cyan-400 to-blue-500',
  },
  {
    id: 'space',
    name: 'Sci-Fi Kosmos',
    emoji: '🚀',
    description: 'Futuristisk signal med rymd-eko',
    genre: 'Sci-Fi',
    color: 'from-indigo-400 to-purple-500',
  },
  {
    id: 'playful',
    name: 'Lekfull Pop',
    emoji: '🎈',
    description: 'Glad och upplyftande melodi',
    genre: 'Pop',
    color: 'from-pink-400 to-rose-500',
  },
  {
    id: 'guitar',
    name: 'Akustisk Trall',
    emoji: '🎸',
    description: 'Mjuk och organisk gitarrmelodi',
    genre: 'Akustisk',
    color: 'from-amber-500 to-yellow-600',
  },
];

// Web Audio API based sound synthesizer for crystal clear sound effects
class SoundEngine {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  constructor() {
    this.setupGlobalUnlock();
  }

  // Auto-unlock AudioContext on first touch/click so mobile browsers allow ringing
  private setupGlobalUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.isUnlocked = true;
      ['click', 'touchstart', 'touchend', 'keydown'].forEach((event) => {
        window.removeEventListener(event, unlock, true);
        document.removeEventListener(event, unlock, true);
      });
    };

    ['click', 'touchstart', 'touchend', 'keydown'].forEach((event) => {
      window.addEventListener(event, unlock, { capture: true, passive: true });
      document.addEventListener(event, unlock, { capture: true, passive: true });
    });
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAudio() {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
  }

  // Play a dial / ringing tone loop based on selected ringtone
  playRingtone(ringtoneType: RingtoneType = 'marimba', volume = 0.8): () => void {
    const ctx = this.getContext();
    let isPlaying = true;
    let timerId: number | null = null;

    const playRingtonePhrase = () => {
      if (!isPlaying) return;
      const now = ctx.currentTime;
      const vol = Math.max(0.05, Math.min(1, volume));

      switch (ringtoneType) {
        case 'gaming': {
          // 8-bit chiptune square-wave arpeggio
          const notes = [
            { f: 659.25, d: 0.1 }, // E5
            { f: 830.61, d: 0.1 }, // G#5
            { f: 987.77, d: 0.1 }, // B5
            { f: 1318.51, d: 0.18 }, // E6
            { f: 1174.66, d: 0.1 }, // D6
            { f: 987.77, d: 0.1 }, // B5
            { f: 1318.51, d: 0.35 }, // E6
          ];

          notes.forEach((n, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            const start = now + idx * 0.11;

            osc.frequency.setValueAtTime(n.f, start);
            gain.gain.setValueAtTime(0.08 * vol, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + n.d + 0.05);
          });
          break;
        }

        case 'synth': {
          // 80s synthwave neon brassy chime
          const notes = [
            { f: 440.0, d: 0.2 }, // A4
            { f: 554.37, d: 0.2 }, // C#5
            { f: 659.25, d: 0.2 }, // E5
            { f: 880.0, d: 0.35 }, // A5
            { f: 830.61, d: 0.2 }, // G#5
            { f: 659.25, d: 0.4 }, // E5
          ];

          notes.forEach((n, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            const start = now + idx * 0.15;

            osc.frequency.setValueAtTime(n.f, start);
            gain.gain.setValueAtTime(0.09 * vol, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + n.d + 0.05);
          });
          break;
        }

        case 'bells': {
          // Crystal bells glockenspiel
          const notes = [
            { f: 783.99, d: 0.35 }, // G5
            { f: 987.77, d: 0.35 }, // B5
            { f: 1174.66, d: 0.35 }, // D6
            { f: 1567.98, d: 0.55 }, // G6
          ];

          notes.forEach((n, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const start = now + idx * 0.18;

            osc.frequency.setValueAtTime(n.f, start);
            gain.gain.setValueAtTime(0.18 * vol, start);
            gain.gain.exponentialRampToValueAtTime(0.0005, start + n.d);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + n.d + 0.05);
          });
          break;
        }

        case 'space': {
          // Sci-Fi space radar pulses
          const sweeps = [
            { f1: 523.25, f2: 1046.5, t: 0.14 },
            { f1: 659.25, f2: 1318.51, t: 0.14 },
            { f1: 783.99, f2: 1567.98, t: 0.3 },
          ];

          sweeps.forEach((sw, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const start = now + idx * 0.22;

            osc.frequency.setValueAtTime(sw.f1, start);
            osc.frequency.exponentialRampToValueAtTime(sw.f2, start + sw.t);

            gain.gain.setValueAtTime(0.15 * vol, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + sw.t + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + sw.t + 0.2);
          });
          break;
        }

        case 'playful': {
          // Playful energetic bounce
          const notes = [
            { f: 698.46, d: 0.15 }, // F5
            { f: 880.0, d: 0.15 }, // A5
            { f: 1046.5, d: 0.15 }, // C6
            { f: 1174.66, d: 0.18 }, // D6
            { f: 1046.5, d: 0.15 }, // C6
            { f: 880.0, d: 0.35 }, // A5
          ];

          notes.forEach((n, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const start = now + idx * 0.13;

            osc.frequency.setValueAtTime(n.f, start);
            gain.gain.setValueAtTime(0.18 * vol, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + n.d + 0.05);
          });
          break;
        }

        case 'guitar': {
          // Plucked acoustic folk tune
          const notes = [
            { f: 293.66, d: 0.25 }, // D4
            { f: 369.99, d: 0.25 }, // F#4
            { f: 440.0, d: 0.25 }, // A4
            { f: 587.33, d: 0.4 }, // D5
            { f: 440.0, d: 0.3 }, // A4
          ];

          notes.forEach((n, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const start = now + idx * 0.15;

            osc.frequency.setValueAtTime(n.f, start);
            gain.gain.setValueAtTime(0.2 * vol, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + n.d + 0.05);
          });
          break;
        }

        case 'marimba':
        default: {
          // Warm marimba chime
          const notes = [
            { f: 523.25, d: 0.3 }, // C5
            { f: 659.25, d: 0.3 }, // E5
            { f: 783.99, d: 0.3 }, // G5
            { f: 1046.5, d: 0.4 }, // C6
            { f: 783.99, d: 0.25 }, // G5
            { f: 659.25, d: 0.35 }, // E5
          ];

          notes.forEach((n, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const start = now + i * 0.12;

            osc.frequency.setValueAtTime(n.f, start);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.2 * vol, start + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + n.d + 0.05);
          });
          break;
        }
      }

      if (isPlaying) {
        timerId = window.setTimeout(playRingtonePhrase, 2200);
      }
    };

    playRingtonePhrase();

    return () => {
      isPlaying = false;
      if (timerId) clearTimeout(timerId);
    };
  }

  // Play a one-shot preview of a ringtone (plays 1 full phrase and auto stops)
  previewRingtone(ringtoneType: RingtoneType = 'marimba', volume = 0.8): () => void {
    const stopFn = this.playRingtone(ringtoneType, volume);
    const timeout = window.setTimeout(() => {
      stopFn();
    }, 2000);

    return () => {
      clearTimeout(timeout);
      stopFn();
    };
  }

  // Pickup tone when call connects
  playConnectTone() {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major chord upward
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.32);
    });
  }

  // Hangup tone when call ends
  playHangupTone() {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const notes = [659.25, 554.37, 440]; // descending
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      
      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.28);
    });
  }

  // Busy / Declined tone (short rhythmic beeps when caller is rejected)
  playBusyTone() {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const beeps = [0, 0.28, 0.56];
    
    beeps.forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(425, now + offset);
      
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.2, now + offset + 0.015);
      gain.gain.setValueAtTime(0.2, now + offset + 0.16);
      gain.gain.linearRampToValueAtTime(0.0001, now + offset + 0.18);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  }

  // Fun soundboard reactions for 8+ kids during call
  playReactionSound(
    type:
      | 'airhorn'
      | 'victory'
      | 'coin'
      | 'laser'
      | 'applause'
      | 'rimshot'
      | 'robot'
      | 'boom'
      | 'magic'
      | 'boing'
  ) {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    if (type === 'airhorn') {
      // Iconic synth airhorn blast pattern (brap-brap-brap)
      const playBlast = (startTime: number, dur = 0.12) => {
        [466.16, 466.16 * 1.5].forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, startTime);
          osc.frequency.linearRampToValueAtTime(freq * 1.02, startTime + dur);

          gain.gain.setValueAtTime(0.12, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + dur + 0.05);
        });
      };

      playBlast(now, 0.14);
      playBlast(now + 0.16, 0.14);
      playBlast(now + 0.32, 0.28);
    } else if (type === 'victory') {
      // Level-up / Victory Fanfare (C - E - G - B - C)
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.08;
        const dur = idx === notes.length - 1 ? 0.4 : 0.1;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur + 0.05);
      });
    } else if (type === 'coin') {
      // 8-bit Mario style coin sound (B5 to E6)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === 'laser') {
      // Retro sci-fi laser pew-pew
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'rimshot') {
      // Ba-dum-tss
      // Drum 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(180, now);
      osc1.frequency.exponentialRampToValueAtTime(50, now + 0.08);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.1);

      // Drum 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(220, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(60, now + 0.2);
      gain2.gain.setValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.22);

      // Cymbal tss (white noise-like high frequency cluster)
      [3200, 4800, 6400, 7200].forEach((freq) => {
        const oscC = ctx.createOscillator();
        const gainC = ctx.createGain();
        oscC.type = 'sawtooth';
        oscC.frequency.setValueAtTime(freq, now + 0.24);
        gainC.gain.setValueAtTime(0.04, now + 0.24);
        gainC.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
        oscC.connect(gainC);
        gainC.connect(ctx.destination);
        oscC.start(now + 0.24);
        oscC.stop(now + 0.58);
      });
    } else if (type === 'applause') {
      // Crowd clapping burst
      for (let i = 0; i < 14; i++) {
        const delay = Math.random() * 0.45;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800 + Math.random() * 600, now + delay);
        gain.gain.setValueAtTime(0.06, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.06);
      }
    } else if (type === 'robot') {
      // Robotic bleep modulation
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.08);
      osc.frequency.setValueAtTime(330, now + 0.16);
      osc.frequency.setValueAtTime(660, now + 0.24);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === 'boom') {
      // Deep bass drop / boom
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.5);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'boing') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.35);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.42);
    } else if (type === 'magic') {
      [880, 1108.73, 1318.51, 1760, 2093].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.06);
        gain.gain.setValueAtTime(0.1, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.32);
      });
    }
  }

  // Voice speech synthesis for simulated Swedish contact replies
  speakSwedish(text: string) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'sv-SE';
      utterance.rate = 0.95;
      utterance.pitch = 1.1; // Friendly warm pitch
      window.speechSynthesis.speak(utterance);
    } catch {
      // speech fallback
    }
  }
}

export const sounds = new SoundEngine();

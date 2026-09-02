// Web Audio API Sound Synthesizer & Notification Engine

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play pleasant chime on task completion
  playTaskDone() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.55);
      });
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // Play rich bell when Pomodoro completes
  playPomodoroComplete() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Major chord sequence
      const chords = [
        { freq: 440, time: 0 },
        { freq: 554.37, time: 0.15 },
        { freq: 659.25, time: 0.3 },
        { freq: 880, time: 0.45 },
      ];

      chords.forEach(({ freq, time }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.25, now + time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + 1.3);
      });
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // Play gentle bell when break completes
  playBreakComplete() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      [659.25, 587.33, 523.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0, now + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.15 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.85);
      });
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // Warm hourly chime (整点报时钟声)
  playHourlyChime() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Grandfather clock two-tone: Ding - Dong
      const tones = [
        { freq: 440, delay: 0, decay: 1.5 },
        { freq: 329.63, delay: 0.8, decay: 2.2 }
      ];

      tones.forEach(({ freq, delay, decay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.3, now + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + decay);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + decay + 0.1);
      });
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }
}

export const soundEngine = new SoundEngine();

// Desktop Notification helper
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

export function showDesktopNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
    } catch (e) {
      console.warn('Desktop notification error:', e);
    }
  }
}

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';

interface TimerContextType {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  timerTitle: string;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  // Actions
  startCountdown: (seconds: number, title?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  setCustomTime: (minutes: number, seconds?: number) => void;
  addSeconds: (seconds: number) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

// Web Audio API Sound Synthesizer for Apple-like gentle chime
function playTimerDoneChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const notes = [587.33, 880, 1174.66]; // D5, A5, D6 - pleasant major triad chime
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.14);
      gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + idx * 0.14 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.14 + 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.14);
      osc.stop(ctx.currentTime + idx * 0.14 + 0.9);
    });
  } catch (e) {
    console.warn('Audio chime playback failed:', e);
  }
}

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Countdown States (Default 3 minutes)
  const [totalSeconds, setTotalSeconds] = useState<number>(180);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(180);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timerTitle, setTimerTitle] = useState<string>('3分钟倒计时');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const timerIntervalRef = useRef<any>(null);

  // Format seconds to mm:ss
  const formatTimeStr = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Trigger Completion
  const handleCountdownFinished = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (soundEnabled) {
      playTimerDoneChime();
    }

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#0071E3', '#34C759', '#FF9500', '#AF52DE'],
      });
    } catch {
      // ignore
    }

    // Trigger custom event so Toast can pick it up
    window.dispatchEvent(
      new CustomEvent('workbench:timer-done', {
        detail: { title: timerTitle || '倒计时结束' },
      })
    );
  }, [soundEnabled, timerTitle]);

  // Countdown timer tick effect
  useEffect(() => {
    if (isRunning && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            handleCountdownFinished();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRunning, isPaused, handleCountdownFinished]);

  // Document Title update when running in background
  useEffect(() => {
    const originalTitle = document.title || '个人工作台';
    if (isRunning) {
      document.title = `(${formatTimeStr(remainingSeconds)}) 倒计时 · 个人工作台`;
    } else {
      document.title = '个人工作台';
    }

    return () => {
      document.title = originalTitle;
    };
  }, [isRunning, remainingSeconds]);

  // Countdown actions
  const startCountdown = useCallback((seconds: number, title?: string) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    setIsRunning(true);
    setIsPaused(false);
    if (title) setTimerTitle(title);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    setIsPaused(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setRemainingSeconds(totalSeconds);
  }, [totalSeconds]);

  const setCustomTime = useCallback((minutes: number, seconds: number = 0) => {
    const secs = Math.max(1, minutes * 60 + seconds);
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
    setIsRunning(false);
    setIsPaused(false);
    setTimerTitle(`${minutes}分钟倒计时`);
  }, []);

  const addSeconds = useCallback((secs: number) => {
    setRemainingSeconds((prev) => prev + secs);
    setTotalSeconds((prev) => Math.max(prev, prev + secs));
  }, []);

  return (
    <TimerContext.Provider
      value={{
        totalSeconds,
        remainingSeconds,
        isRunning,
        isPaused,
        timerTitle,
        soundEnabled,
        setSoundEnabled,
        startCountdown,
        pauseTimer,
        resumeTimer,
        resetTimer,
        setCustomTime,
        addSeconds,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

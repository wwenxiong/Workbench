import React from 'react';
import { Play, Pause, RotateCcw, Clock, Maximize2 } from 'lucide-react';
import { useTimer } from '../../contexts/TimerContext';
import { useTheme } from '../../contexts/ThemeContext';

interface FloatingTimerWidgetProps {
  currentView: string;
  onOpenTools: () => void;
}

export const FloatingTimerWidget: React.FC<FloatingTimerWidgetProps> = ({
  currentView,
  onOpenTools,
}) => {
  const { isOledTheme } = useTheme();
  const {
    remainingSeconds,
    totalSeconds,
    isRunning,
    isPaused,
    timerTitle,
    resumeTimer,
    pauseTimer,
    resetTimer,
  } = useTimer();

  // Only show when timer is running or paused, and not already on the tools page
  if ((!isRunning && !isPaused) || currentView === 'tools') {
    return null;
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

  return (
    <div className="fixed bottom-6 right-8 z-50 animate-scaleUp select-none">
      <div className={`flex items-center gap-3.5 px-4 py-2.5 rounded-2xl ${
        isOledTheme
          ? 'bg-[#080A0C]/95 backdrop-blur-2xl border border-white/[0.1] shadow-[0_12px_36px_rgba(0,0,0,0.6),0_0_20px_rgba(0,229,255,0.08)]'
          : 'bg-white/90 backdrop-blur-2xl border border-white/95 shadow-[0_12px_36px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)]'
      } hover:shadow-[0_16px_44px_rgba(0,0,0,0.16)] transition-all`}>
        {/* Pulsing indicator & icon */}
        <div
          onClick={onOpenTools}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="点击进入时钟与工具页面"
        >
          <div className={`relative flex items-center justify-center w-7 h-7 rounded-xl ${
            isOledTheme ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30' : 'bg-blue-50 text-[#0071E3] border border-blue-100/60'
          }`}>
            {isRunning && !isPaused && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-xl ${isOledTheme ? 'bg-[#00E5FF]' : 'bg-blue-400'} opacity-30`}></span>
            )}
            <Clock size={15} strokeWidth={2.2} />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={`text-base font-bold font-mono tracking-tight ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
                {timeFormatted}
              </span>
              <Maximize2 size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`} />
            </div>
            <span className={`text-[10px] truncate max-w-[90px] ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>
              {timerTitle || '倒计时进行中'}
            </span>
          </div>
        </div>

        {/* Mini progress bar */}
        <div className={`w-12 h-1.5 rounded-full overflow-hidden ${isOledTheme ? 'bg-white/10' : 'bg-slate-100'}`}>
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isOledTheme ? 'bg-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.8)]' : 'bg-[#0071E3]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Quick Actions */}
        <div className={`flex items-center gap-1 pl-1 border-l ${isOledTheme ? 'border-white/[0.08]' : 'border-slate-200/60'}`}>
          {isRunning && !isPaused ? (
            <button
              type="button"
              onClick={pauseTimer}
              title="暂停计时"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isOledTheme ? 'text-[#00E5FF] hover:bg-[#00E5FF]/10' : 'text-slate-600 hover:text-[#0071E3] hover:bg-blue-50'
              }`}
            >
              <Pause size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={resumeTimer}
              title="继续计时"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isOledTheme ? 'text-[#00E5FF] hover:bg-[#00E5FF]/10' : 'text-[#0071E3] hover:bg-blue-50'
              }`}
            >
              <Play size={14} fill="currentColor" />
            </button>
          )}

          <button
            type="button"
            onClick={resetTimer}
            title="重置计时"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isOledTheme ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

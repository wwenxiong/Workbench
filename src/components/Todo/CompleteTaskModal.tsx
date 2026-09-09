import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, 
  Clock, 
  X, 
  Check, 
  Flame, 
  FileText 
} from 'lucide-react';
import type { Task } from '../../types';

interface CompleteTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    taskId: string, 
    data: {
      completed: boolean;
      actualMinutes: number;
      timeSpan: string;
      startTime?: string;
      endTime?: string;
    }
  ) => Promise<void>;
  onDirectComplete?: (taskId: string) => Promise<void>;
}

export const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onConfirm,
  onDirectComplete,
}) => {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [focusDuration, setFocusDuration] = useState(60);
  const [timeSlotDesc, setTimeSlotDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTimeTarget, setActiveTimeTarget] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (isOpen && task) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      const endH = String(currentHour).padStart(2, '0');
      const endM = String(Math.floor(currentMin / 5) * 5).padStart(2, '0');
      const endStr = `${endH}:${endM}`;

      const startDate = new Date(now.getTime() - 45 * 60 * 1000);
      const startH = String(startDate.getHours()).padStart(2, '0');
      const startM = String(Math.floor(startDate.getMinutes() / 5) * 5).padStart(2, '0');
      const startStr = `${startH}:${startM}`;

      setStartTime(startStr);
      setEndTime(endStr);
      setFocusDuration(45);
      setTimeSlotDesc(`${startStr}-${endStr}`);
      setActiveTimeTarget('start');
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleTimeChange = (newStart: string, newEnd: string) => {
    setStartTime(newStart);
    setEndTime(newEnd);

    const [sh, sm] = newStart.split(':').map(Number);
    const [eh, em] = newEnd.split(':').map(Number);

    if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
      let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMinutes < 0) diffMinutes += 24 * 60;
      setFocusDuration(diffMinutes > 0 ? diffMinutes : 15);
      setTimeSlotDesc(`${newStart}-${newEnd}`);
    }
  };

  const handleSelectHour = (hour: number) => {
    const hourStr = String(hour).padStart(2, '0') + ':00';
    if (activeTimeTarget === 'start') {
      const [eh] = endTime.split(':').map(Number);
      let newEnd = endTime;
      if (isNaN(eh) || hour >= eh) {
        const nextHour = (hour + 1) % 24;
        newEnd = String(nextHour).padStart(2, '0') + ':00';
      }
      handleTimeChange(hourStr, newEnd);
      setActiveTimeTarget('end');
    } else {
      const [sh] = startTime.split(':').map(Number);
      let newStart = startTime;
      if (isNaN(sh) || hour <= sh) {
        const prevHour = (hour - 1 + 24) % 24;
        newStart = String(prevHour).padStart(2, '0') + ':00';
      }
      handleTimeChange(newStart, hourStr);
      setActiveTimeTarget('start');
    }
  };

  const handleQuickDuration = (minutes: number) => {
    setFocusDuration(minutes);
    const [sh, sm] = startTime.split(':').map(Number);
    if (!isNaN(sh) && !isNaN(sm)) {
      const totalMinutes = (sh * 60 + sm + minutes) % (24 * 60);
      const newEh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const newEm = String(totalMinutes % 60).padStart(2, '0');
      const newEnd = `${newEh}:${newEm}`;
      setEndTime(newEnd);
      setTimeSlotDesc(`${startTime}-${newEnd}`);
    }
  };

  const formattedDeliverableLine = timeSlotDesc 
    ? `${timeSlotDesc} ${task.title}` 
    : task.title;

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onConfirm(task.id, {
        completed: true,
        actualMinutes: focusDuration,
        timeSpan: timeSlotDesc.trim() || `${startTime}-${endTime}`,
        startTime,
        endTime,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectSubmit = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      if (onDirectComplete) {
        await onDirectComplete(task.id);
      } else {
        await onConfirm(task.id, {
          completed: true,
          actualMinutes: 0,
          timeSpan: '',
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn select-none">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-white/90 p-6 flex flex-col gap-4 relative animate-scaleUp text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <CheckCircle2 size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-[18px] font-semibold text-[#1D2129]">完成任务</h3>
              <p className="text-[13px] text-[#4E5969] mt-0.5">记录所用时间，将记入日报</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-[#4E5969] hover:text-[#1D2129] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Task Title Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
          <span className="text-[12px] font-medium text-[#4E5969] block mb-1">任务：</span>
          <p className="text-[15px] font-semibold text-[#1D2129] leading-[24px] break-words">
            {task.title}
          </p>
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              {task.tags.map((tg) => (
                <span key={tg} className="px-2 py-0.5 rounded-md text-[11px] bg-white border border-slate-200 text-[#4E5969] font-medium">
                  #{tg}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quick Time Selector */}
        <div className="space-y-3">
          <div>
            <label className="block text-[14px] font-medium text-[#1D2129] mb-1.5 flex items-center gap-1.5">
              <Clock size={14} className="text-[#1677FF]" />
              <span>快速选择用时</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '15分钟', mins: 15 },
                { label: '30分钟', mins: 30 },
                { label: '45分钟', mins: 45 },
                { label: '1小时', mins: 60 },
                { label: '1.5小时', mins: 90 },
                { label: '2小时', mins: 120 },
                { label: '3小时', mins: 180 },
                { label: '半天', mins: 240 },
              ].map((item) => (
                <button
                  key={item.mins}
                  type="button"
                  onClick={() => handleQuickDuration(item.mins)}
                  className={`py-1.5 px-2 text-[13px] rounded-xl font-medium border transition-all cursor-pointer ${
                    focusDuration === item.mins
                      ? 'bg-[#1677FF] text-white border-[#1677FF] shadow-xs'
                      : 'bg-slate-50 text-[#4E5969] border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 0-23 Hours Grid Selector */}
          <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[14px] font-medium text-[#1D2129] flex items-center gap-1.5">
                <Clock size={14} className="text-[#1677FF]" />
                <span>快速点选时间点 (0-23点)</span>
              </label>

              {/* Target Switcher: Start / End */}
              <div className="flex p-0.5 bg-slate-200/70 rounded-lg text-[12px] font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTimeTarget('start')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    activeTimeTarget === 'start'
                      ? 'bg-[#1677FF] text-white shadow-xs'
                      : 'text-[#4E5969] hover:text-slate-900'
                  }`}
                >
                  点选开始 ({startTime})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTimeTarget('end')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    activeTimeTarget === 'end'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-[#4E5969] hover:text-slate-900'
                  }`}
                >
                  点选结束 ({endTime})
                </button>
              </div>
            </div>

            {/* 0-23 Hours Grid (8 cols x 3 rows) */}
            <div className="grid grid-cols-8 gap-1.5">
              {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                const sh = parseInt(startTime.split(':')[0], 10);
                const eh = parseInt(endTime.split(':')[0], 10);

                const isStart = hour === sh;
                const isEnd = hour === eh;
                const isInRange = sh < eh && hour > sh && hour < eh;

                let btnStyle = 'bg-white hover:bg-slate-100 text-[#4E5969] border-slate-200/80';
                if (isStart) {
                  btnStyle = 'bg-[#1677FF] text-white border-[#1677FF] shadow-xs font-semibold';
                } else if (isEnd) {
                  btnStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold';
                } else if (isInRange) {
                  btnStyle = 'bg-blue-50 text-[#1677FF] border-blue-200 font-medium';
                }

                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => handleSelectHour(hour)}
                    className={`py-1.5 px-0.5 text-[12px] font-mono tabular-nums rounded-lg border text-center transition-all cursor-pointer relative ${btnStyle}`}
                    title={`设为${activeTimeTarget === 'start' ? '开始' : '结束'}时间：${String(hour).padStart(2, '0')}:00`}
                  >
                    <span>{hour}点</span>
                    {isStart && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-700 rounded-full border border-white" />
                    )}
                    {isEnd && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-700 rounded-full border border-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start & End Inputs */}
          <div className="grid grid-cols-2 gap-3 pt-0.5">
            <div>
              <label className="block text-[12px] font-medium text-[#4E5969] mb-1 flex items-center justify-between">
                <span>开始时间</span>
                <span className={`text-[11px] ${activeTimeTarget === 'start' ? 'text-[#1677FF] font-semibold' : 'text-[#86909C]'}`}>
                  {activeTimeTarget === 'start' ? '● 当前正在点选' : '点击激活点选'}
                </span>
              </label>
              <input
                type="time"
                value={startTime}
                onFocus={() => setActiveTimeTarget('start')}
                onChange={(e) => handleTimeChange(e.target.value, endTime)}
                className={`w-full px-3 py-2 text-[14px] bg-slate-50 border rounded-xl text-[#1D2129] font-mono tabular-nums focus:outline-none cursor-pointer shadow-2xs transition-colors ${
                  activeTimeTarget === 'start' ? 'border-[#1677FF] ring-2 ring-[#1677FF]/10' : 'border-slate-200'
                }`}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#4E5969] mb-1 flex items-center justify-between">
                <span>结束时间</span>
                <span className={`text-[11px] ${activeTimeTarget === 'end' ? 'text-emerald-600 font-semibold' : 'text-[#86909C]'}`}>
                  {activeTimeTarget === 'end' ? '● 当前正在点选' : '点击激活点选'}
                </span>
              </label>
              <input
                type="time"
                value={endTime}
                onFocus={() => setActiveTimeTarget('end')}
                onChange={(e) => handleTimeChange(startTime, e.target.value)}
                className={`w-full px-3 py-2 text-[14px] bg-slate-50 border rounded-xl text-[#1D2129] font-mono tabular-nums focus:outline-none cursor-pointer shadow-2xs transition-colors ${
                  activeTimeTarget === 'end' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200'
                }`}
              />
            </div>
          </div>

          {/* Time Slot Tag & Duration Display */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#4E5969] mb-1">
                时段描述
              </label>
              <input
                type="text"
                value={timeSlotDesc}
                onChange={(e) => setTimeSlotDesc(e.target.value)}
                placeholder="例如: 09:30-10:15"
                className="w-full px-3 py-2 text-[14px] bg-slate-50 border border-slate-200 rounded-xl text-[#1D2129] focus:outline-none focus:border-[#1677FF] shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#4E5969] mb-1">
                用时 (分钟)
              </label>
              <div className="flex items-center gap-1.5 px-3 py-2 text-[14px] bg-slate-50 border border-slate-200 rounded-xl text-[#1D2129] font-mono tabular-nums shadow-2xs">
                <Flame size={14} className="text-amber-500" />
                <span className="font-semibold text-[#1D2129]">{focusDuration}</span>
                <span className="text-[#86909C]">分钟</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deliverable Line Preview */}
        <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-800 mb-1">
            <FileText size={14} className="text-emerald-600" />
            <span>日报预览：</span>
          </div>
          <p className="text-[13px] text-emerald-900 font-mono tabular-nums leading-relaxed pl-1">
            {formattedDeliverableLine}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleDirectSubmit}
            disabled={isSubmitting}
            className="text-[13px] font-medium text-[#4E5969] hover:text-[#1D2129] hover:underline cursor-pointer disabled:opacity-50"
          >
            直接完成
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[14px] font-medium text-[#4E5969] hover:text-[#1D2129] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1 px-5 py-2 text-[14px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>{isSubmitting ? '保存中...' : '完成并记录'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CompleteTaskModal;

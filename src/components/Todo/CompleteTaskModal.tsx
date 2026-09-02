import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, 
  Clock, 
  X, 
  Sparkles
} from 'lucide-react';
import type { Task } from '../../types';

interface CompleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
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
}

export const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onConfirm,
}) => {
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [timeSpan, setTimeSpan] = useState('8-9点');
  const [actualMinutes, setActualMinutes] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to format hour range cleanly (e.g. 08:00 -> 09:00 becomes "8-9点")
  const computeTimeSpan = (start: string, end: string) => {
    if (!start || !end) return '';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (sm === 0 && em === 0) {
      return `${sh}-${eh}点`;
    }
    return `${start}-${end}`;
  };

  // Helper to compute minutes between two HH:MM strings
  const computeMinutes = (start: string, end: string) => {
    if (!start || !end) return 20;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60;
    return diff > 0 ? diff : 20;
  };

  // Initialize with smart default time
  useEffect(() => {
    if (isOpen && task) {
      const now = new Date();
      const currentHour = now.getHours();
      const prevHour = Math.max(0, currentHour - 1);
      
      const sH = String(prevHour).padStart(2, '0');
      const eH = String(currentHour).padStart(2, '0');
      const defaultStart = `${sH}:00`;
      const defaultEnd = `${eH}:00`;

      setStartTime(defaultStart);
      setEndTime(defaultEnd);
      setTimeSpan(`${prevHour}-${currentHour}点`);
      setActualMinutes(task.estimatedMinutes > 0 ? task.estimatedMinutes : 20);
      setIsSubmitting(false);
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  // Handle Preset Select
  const selectPreset = (startH: number, endH: number, mins: number) => {
    const sStr = `${String(startH).padStart(2, '0')}:00`;
    const eStr = `${String(endH).padStart(2, '0')}:00`;
    setStartTime(sStr);
    setEndTime(eStr);
    setTimeSpan(`${startH}-${endH}点`);
    setActualMinutes(mins);
  };

  const handleStartChange = (val: string) => {
    setStartTime(val);
    const span = computeTimeSpan(val, endTime);
    setTimeSpan(span);
    const mins = computeMinutes(val, endTime);
    setActualMinutes(mins);
  };

  const handleEndChange = (val: string) => {
    setEndTime(val);
    const span = computeTimeSpan(startTime, val);
    setTimeSpan(span);
    const mins = computeMinutes(startTime, val);
    setActualMinutes(mins);
  };

  // Submit with recorded duration
  const handleSubmit = async (recordTime: boolean) => {
    setIsSubmitting(true);
    try {
      if (recordTime) {
        await onConfirm(task.id, {
          completed: true,
          actualMinutes: Number(actualMinutes) || 0,
          timeSpan: timeSpan.trim(),
          startTime,
          endTime,
        });
      } else {
        await onConfirm(task.id, {
          completed: true,
          actualMinutes: 0,
          timeSpan: '',
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white/90 p-6 flex flex-col gap-4 relative animate-scaleUp text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <CheckCircle2 size={20} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">完成事项与耗时统计</h3>
              <p className="text-xs text-slate-400 mt-0.5">选择完成时段，自动沉淀至工作日报</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Task Preview Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
          <span className="text-[10px] font-semibold text-[#86868B] block mb-1">完成待办：</span>
          <p className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">
            {task.title}
          </p>
        </div>

        {/* Quick Time Range Presets */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <Sparkles size={13} className="text-[#0071E3]" />
            <span>快捷时段选择</span>
          </label>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => selectPreset(8, 9, 20)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                timeSpan === '8-9点' && actualMinutes === 20
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              8-9点(20m)
            </button>
            <button
              type="button"
              onClick={() => selectPreset(8, 9, 60)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                timeSpan === '8-9点' && actualMinutes === 60
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              8-9点(60m)
            </button>
            <button
              type="button"
              onClick={() => selectPreset(9, 10, 30)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                timeSpan === '9-10点' && actualMinutes === 30
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              9-10点(30m)
            </button>
            <button
              type="button"
              onClick={() => selectPreset(10, 11, 45)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                timeSpan === '10-11点' && actualMinutes === 45
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              10-11点(45m)
            </button>

            <button
              type="button"
              onClick={() => selectPreset(14, 15, 30)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                timeSpan === '14-15点' && actualMinutes === 30
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              14-15点(30m)
            </button>
            <button
              type="button"
              onClick={() => selectPreset(15, 16, 45)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                timeSpan === '15-16点' && actualMinutes === 45
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              15-16点(45m)
            </button>
            <button
              type="button"
              onClick={() => selectPreset(16, 17, 30)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                timeSpan === '16-17点' && actualMinutes === 30
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              16-17点(30m)
            </button>
            <button
              type="button"
              onClick={() => selectPreset(17, 18, 60)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                timeSpan === '17-18点' && actualMinutes === 60
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              17-18点(60m)
            </button>
          </div>
        </div>

        {/* Custom Start & End Time Controls */}
        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                起始时间戳 (Start)
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0071E3] font-mono shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                结束时间戳 (End)
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => handleEndChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0071E3] font-mono shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-200/60">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                时段描述文字
              </label>
              <input
                type="text"
                value={timeSpan}
                onChange={(e) => setTimeSpan(e.target.value)}
                placeholder="例如：8-9点"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0071E3]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                核算耗时 (分钟)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={actualMinutes}
                  onChange={(e) => setActualMinutes(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0071E3] font-mono pr-8"
                />
                <span className="absolute right-2.5 top-2 text-[11px] text-[#86868B]">分</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Report Preview Snippet */}
        <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-[#48484A]">
          <span className="font-semibold text-[#0071E3] block mb-0.5">日报呈现预览：</span>
          <span className="font-medium text-slate-800">
            1. {task.title}
            {timeSpan || actualMinutes ? `（完成时间：${timeSpan || '今天'}，${actualMinutes}分钟）` : ''}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            直接完成 (跳过耗时)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0071E3] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Clock size={13} strokeWidth={2} />
              <span>{isSubmitting ? '保存中...' : '确认完成并记录'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CompleteTaskModal;

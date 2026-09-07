import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Feather, 
  Calendar as CalendarIcon, 
  Tag, 
  Sparkles, 
  X, 
  FileText, 
  Users, 
  Target, 
  Zap, 
  Bookmark,
  CheckCircle2,
  Repeat,
  Plus
} from 'lucide-react';
import type { Note, NoteType } from '../../types';
import { api } from '../../services/api';
import { formatLocalDate, addDays } from '../../utils/date';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (noteData: Partial<Note>) => Promise<void>;
  noteToEdit?: Note | null;
  initialDate?: string;
  initialType?: NoteType;
  allowedTypes?: NoteType[];
}

const TYPE_CONFIGS: Record<NoteType, { label: string; icon: any; color: string; bg: string; activeColor: string }> = {
  daily_report: {
    label: '工作日报',
    icon: FileText,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    activeColor: 'bg-emerald-600 text-white shadow-emerald-500/25',
  },
  note: {
    label: '笔记',
    icon: Feather,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    activeColor: 'bg-blue-600 text-white shadow-blue-500/25',
  },
  meeting: {
    label: '会议',
    icon: Users,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    activeColor: 'bg-amber-600 text-white shadow-amber-500/25',
  },
  idea: {
    label: '灵感',
    icon: Sparkles,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    activeColor: 'bg-purple-600 text-white shadow-purple-500/25',
  },
  retrospective: {
    label: '复盘',
    icon: Target,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    activeColor: 'bg-rose-600 text-white shadow-rose-500/25',
  },
};

export const AddNoteModal: React.FC<AddNoteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  noteToEdit,
  initialDate,
  initialType = 'note',
  allowedTypes,
}) => {
  const todayStr = formatLocalDate(new Date());
  const yesterdayStr = addDays(todayStr, -1);

  const [type, setType] = useState<NoteType>(initialType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(initialDate || todayStr);
  const [time, setTime] = useState('18:00');
  const [selectedTag, setSelectedTag] = useState('日常');
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAuto, setIsLoadingAuto] = useState(false);

  // Daily report structured fields
  const [deliverables, setDeliverables] = useState('');
  const [blockers, setBlockers] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [stats, setStats] = useState({ completedCount: 0, focusMinutes: 0 });

  useEffect(() => {
    if (isOpen) {
      if (noteToEdit) {
        setType(noteToEdit.type || 'note');
        setDate(noteToEdit.date || todayStr);
        setTime(noteToEdit.time || '18:00');
        setTitle(noteToEdit.title || '');
        setContent(noteToEdit.content || '');
        setSelectedTag(noteToEdit.tags?.[0] || (noteToEdit.type === 'daily_report' ? '工作日报' : '日常'));
        setIsPinned(!!noteToEdit.isPinned);
        if (noteToEdit.dailyReportData) {
          setDeliverables(noteToEdit.dailyReportData.deliverables || '');
          setBlockers(noteToEdit.dailyReportData.blockers || '');
          setTomorrowPlan(noteToEdit.dailyReportData.tomorrowPlan || '');
          setStats({
            completedCount: noteToEdit.dailyReportData.completedCount || 0,
            focusMinutes: noteToEdit.dailyReportData.focusMinutes || 0,
          });
        }
      } else {
        const defaultT = initialType || (allowedTypes?.[0] || 'note');
        setType(defaultT);
        setDate(initialDate || todayStr);
        setTitle('');
        setContent('');
        setDeliverables('');
        setBlockers('');
        setTomorrowPlan('');
        setSelectedTag(defaultT === 'daily_report' ? '工作日报' : '日常');
        setIsPinned(false);

        const now = new Date();
        setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      }
      setIsSubmitting(false);
    }
  }, [isOpen, noteToEdit, initialDate, initialType, allowedTypes, todayStr]);

  if (!isOpen) return null;

  const typeKeys = (allowedTypes || (Object.keys(TYPE_CONFIGS) as NoteType[]));

  // Auto-aggregate today's tasks into daily report
  const handleAutoImportDaily = async () => {
    try {
      setIsLoadingAuto(true);
      const rep = await api.getDailyReport(date);
      setDeliverables(rep.chronologicalDeliverables || rep.deliverables || '');
      setBlockers(rep.blockers || '');
      setTomorrowPlan(rep.tomorrowPlan || '');
      setStats({
        completedCount: rep.completedTasksCount || 0,
        focusMinutes: rep.totalFocusMinutes || 0,
      });
      if (!title) {
        setTitle(`${date} 工作日报`);
      }
      if (!content) {
        setContent(`今日完成待办 ${rep.completedTasksCount} 项。`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAuto(false);
    }
  };

  const handleConfirm = async () => {
    const finalContent = type === 'daily_report'
      ? (content || deliverables || `${date} 日报记录`)
      : content;

    if (!finalContent.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const payload: Partial<Note> = {
        type,
        title: title.trim() || (type === 'daily_report' ? `${date} 工作日报` : undefined),
        content: finalContent.trim(),
        date,
        time,
        tags: [selectedTag],
        isPinned,
        bg: type === 'daily_report' ? 'bg-emerald-50/60 border-emerald-100' : 'bg-white',
        dailyReportData: type === 'daily_report' ? {
          deliverables: deliverables || finalContent,
          blockers: blockers || '无',
          tomorrowPlan: tomorrowPlan || '按计划推进',
          completedCount: stats.completedCount,
          focusMinutes: stats.focusMinutes,
        } : undefined,
      };

      await onConfirm(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn select-none"
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-white/90 p-6 flex flex-col gap-4 relative animate-scaleUp text-left max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Feather size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {noteToEdit ? '查看与修改记录' : '添加记录'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {noteToEdit ? '放大查看完整记录，支持直接编辑修改并保存' : '记录随手想法、会议或工作总结'}
              </p>
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

        {/* Type Selection Tabs */}
        {typeKeys.length > 1 && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">类型</label>
            <div className={`grid gap-2 ${typeKeys.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
              {typeKeys.map((tKey) => {
                const cfg = TYPE_CONFIGS[tKey];
                const IconComponent = cfg.icon;
                const isSelected = type === tKey;

                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => {
                      setType(tKey);
                      if (tKey === 'daily_report') {
                        setSelectedTag('工作日报');
                        if (!deliverables) handleAutoImportDaily();
                      } else if (tKey === 'meeting') {
                        setSelectedTag('会议');
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? `${cfg.activeColor} shadow-sm`
                        : `bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60`
                    }`}
                  >
                    <IconComponent size={14} />
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Date & Time Row */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <CalendarIcon size={14} className="text-blue-600" />
              <span>日期与时间</span>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDate(todayStr)}
                className={`px-2 py-0.5 text-[10px] rounded-md transition-colors cursor-pointer ${
                  date === todayStr ? 'bg-blue-600 text-white font-medium' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                今天
              </button>
              <button
                type="button"
                onClick={() => setDate(yesterdayStr)}
                className={`px-2 py-0.5 text-[10px] rounded-md transition-colors cursor-pointer ${
                  date === yesterdayStr ? 'bg-blue-600 text-white font-medium' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                昨天
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
            />
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            标题 <span className="text-slate-400 font-normal">(可选)</span>
          </label>
          <input
            type="text"
            placeholder={type === 'daily_report' ? `${date} 工作日报` : '例如: 讨论要点...'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 shadow-2xs"
          />
        </div>

        {/* Conditional Fields: Daily Report vs Standard Note */}
        {type === 'daily_report' ? (
          <div className="space-y-3 p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            {/* Auto Import Trigger Banner */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>已关联日历</span>
              </div>
              <button
                type="button"
                onClick={handleAutoImportDaily}
                disabled={isLoadingAuto}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-200 hover:border-emerald-300 rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <Zap size={12} className="text-amber-500" />
                <span>{isLoadingAuto ? '汇总中...' : '同步今天待办'}</span>
              </button>
            </div>

            {/* Deliverables */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  今日工作
                </label>
                <span className="text-[10px] text-slate-400">分行记录</span>
              </div>
              <textarea
                rows={8}
                placeholder="1. XXXXX&#10;2. XXXXX"
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs leading-relaxed bg-white border border-emerald-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 placeholder-slate-400 min-h-[180px] resize-y shadow-2xs"
              />
            </div>

            {/* Tomorrow & Blockers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    明日计划:
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const rep = await api.getDailyReport(date);
                        if (rep.tomorrowTasksList && rep.tomorrowTasksList.length > 0) {
                          setTomorrowPlan(rep.tomorrowTasksList.map((t, i) => `${i + 1}. ${t}`).join('\n'));
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="flex items-center gap-0.5 text-[10px] text-emerald-700 hover:underline font-medium cursor-pointer"
                    title="导入明日计划"
                  >
                    <Repeat size={11} strokeWidth={2} />
                    <span>导入计划</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder="1. xxx&#10;2. xxx"
                  value={tomorrowPlan}
                  onChange={(e) => setTomorrowPlan(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs leading-relaxed bg-white border border-emerald-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 placeholder-slate-400 min-h-[100px] resize-y shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  遇到问题 (可选)
                </label>
                <textarea
                  rows={4}
                  placeholder="无..."
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs leading-relaxed bg-white border border-emerald-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 placeholder-slate-400 min-h-[100px] resize-y shadow-2xs"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                内容 <span className="text-rose-500">*</span>
              </label>
              {content.length > 0 && (
                <span className="text-[11px] text-slate-400 font-mono">
                  {content.length} 字
                </span>
              )}
            </div>
            <textarea
              rows={8}
              placeholder={
                type === 'meeting'
                  ? '记录会议内容与结论...'
                  : type === 'idea'
                  ? '记下当下的想法...'
                  : '记点什么...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs leading-relaxed bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 shadow-2xs min-h-[200px] resize-y"
            />
          </div>
        )}

        {/* Tags & Options */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag size={13} className="text-slate-400" />
            {['工作', '日常', '会议', '灵感', '复盘', '学习'].map((tg) => (
              <button
                key={tg}
                type="button"
                onClick={() => setSelectedTag(tg)}
                className={`px-2 py-0.5 text-[10px] rounded-lg transition-colors cursor-pointer ${
                  selectedTag === tg ? 'bg-blue-600 text-white font-medium' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tg}
              </button>
            ))}
          </div>

          {/* Pin Toggle */}
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-xl border transition-all cursor-pointer ${
              isPinned
                ? 'bg-amber-50 text-amber-700 border-amber-300 font-semibold'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Bookmark size={13} className={isPinned ? 'fill-amber-600' : ''} />
            <span>置顶</span>
          </button>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={(!content.trim() && !deliverables.trim()) || isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            {noteToEdit ? (
              <CheckCircle2 size={14} strokeWidth={2} />
            ) : (
              <Plus size={14} strokeWidth={2} />
            )}
            <span>
              {isSubmitting
                ? noteToEdit
                  ? '保存修改中...'
                  : '保存中...'
                : noteToEdit
                ? '保存修改'
                : '保存'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddNoteModal;

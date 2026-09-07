import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  Tag, 
  Flag, 
  Repeat, 
  Sparkles, 
  Info,
  Plus
} from 'lucide-react';
import type { Task, Priority, RecurringFrequency } from '../../types';
import { formatLocalDate, addDays } from '../../utils/date';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (todoData: {
    title: string;
    dueDate: string;
    tags?: string[];
    priority?: Priority;
    isRecurring?: boolean;
    recurringConfig?: any;
    id?: string;
  }) => Promise<void>;
  initialDate?: string;
  initialTime?: string;
  taskToEdit?: Task | null;
  existingTasks?: Task[];
}

export const AddTodoModal: React.FC<AddTodoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialDate,
  initialTime,
  taskToEdit,
}) => {
  const todayStr = formatLocalDate(new Date());

  const [todoTitle, setTodoTitle] = useState('');
  const [todoDate, setTodoDate] = useState(initialDate || todayStr);
  const [todoTime, setTodoTime] = useState(initialTime || '10:00');
  const [todoTag, setTodoTag] = useState('工作');
  const [todoPriority, setTodoPriority] = useState<Priority>('p2');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recurring task state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<RecurringFrequency>('daily');
  const [recurringStartDate, setRecurringStartDate] = useState(todayStr);
  const [recurringEndDate, setRecurringEndDate] = useState(addDays(todayStr, 30));
  const [hasEndDate, setHasEndDate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        // 编辑时自动去除旧序号，展示干净的任务标题
        const cleanTitle = taskToEdit.title.replace(/^\s*\d+[\.、\s\-]\s*/, '').trim() || taskToEdit.title;
        setTodoTitle(cleanTitle);
        const [d, t] = (taskToEdit.dueDate || '').split('T');
        setTodoDate(d || todayStr);
        setTodoTime(t ? t.slice(0, 5) : '10:00');
        setTodoTag(taskToEdit.tags?.[0] || '工作');
        setTodoPriority((taskToEdit.priority as Priority) || 'p2');
        setIsRecurring(!!taskToEdit.isRecurring);
        if (taskToEdit.recurringConfig) {
          setRecurringFreq(taskToEdit.recurringConfig.frequency || 'daily');
          setRecurringStartDate(taskToEdit.recurringConfig.startDate || todayStr);
          if (taskToEdit.recurringConfig.endDate) {
            setHasEndDate(true);
            setRecurringEndDate(taskToEdit.recurringConfig.endDate);
          } else {
            setHasEndDate(false);
          }
        } else {
          setHasEndDate(false);
        }
      } else {
        // 新建时输入框保持纯净为空，用户直接输入内容即可
        setTodoTitle('');
        const targetD = initialDate || todayStr;
        setTodoDate(targetD);
        const now = new Date();
        const curH = String(now.getHours()).padStart(2, '0');
        const curM = String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, '0');
        setTodoTime(initialTime || `${curH}:${curM}`);
        setTodoTag('工作');
        setTodoPriority('p2');
        setIsRecurring(false);
        setRecurringFreq('daily');
        setRecurringStartDate(targetD);
        setRecurringEndDate(addDays(targetD, 30));
        setHasEndDate(false);
      }
      setIsSubmitting(false);
    }
  }, [isOpen, initialDate, initialTime, taskToEdit, todayStr]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const finalTitle = todoTitle.trim();
    if (!finalTitle || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const fullDueDate = `${todoDate}T${todoTime}:00`;

      let recurringConfig = undefined;
      if (isRecurring) {
        recurringConfig = {
          frequency: recurringFreq,
          startDate: recurringStartDate,
          endDate: hasEndDate ? recurringEndDate : null,
          timeOfDay: todoTime,
        };
      }

      await onConfirm({
        title: finalTitle,
        dueDate: fullDueDate,
        tags: [todoTag],
        priority: todoPriority,
        isRecurring,
        recurringConfig,
        id: taskToEdit?.id,
      });

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-white/90 p-6 flex flex-col gap-4 relative animate-scaleUp text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0071E3] flex items-center justify-center shadow-xs">
              <Sparkles size={20} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1D1D1F]">
                {taskToEdit ? '编辑待办' : '新建待办'}
              </h3>
              <p className="text-xs text-[#86868B] mt-0.5">
                {taskToEdit ? '修改待办内容与时间' : '输入待办内容与时间'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Input Fields */}
        <div className="flex flex-col gap-3.5">
          {/* Field 1: 待办标题 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#1D1D1F]">
                待办内容 <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-[#86868B]">可输入详细描述</span>
            </div>
            <textarea
              autoFocus
              rows={3}
              placeholder="例如：写周报、核对数据、发邮件..."
              value={todoTitle}
              onChange={(e) => setTodoTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50/80 border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:bg-white focus:border-[#0071E3] text-[#1D1D1F] placeholder-slate-400 transition-all resize-none"
            />
          </div>

          {/* Field 2: 日期与时间 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1 flex items-center gap-1">
                <CalendarIcon size={13} strokeWidth={1.75} className="text-[#0071E3]" />
                <span>日期</span>
              </label>
              <input
                type="date"
                value={todoDate}
                onChange={(e) => {
                  const newD = e.target.value;
                  setTodoDate(newD);
                  if (isRecurring) setRecurringStartDate(newD);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50/80 border border-slate-200/80 rounded-xl text-[#1D1D1F] focus:outline-none focus:border-[#0071E3] font-mono cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1 flex items-center gap-1">
                <Clock size={13} strokeWidth={1.75} className="text-[#0071E3]" />
                <span>时间</span>
              </label>
              <input
                type="time"
                value={todoTime}
                onChange={(e) => setTodoTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50/80 border border-slate-200/80 rounded-xl text-[#1D1D1F] focus:outline-none focus:border-[#0071E3] font-mono cursor-pointer"
              />
            </div>
          </div>

          {/* Field 3: 重复任务 */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 flex flex-col gap-2.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100/70 text-[#0071E3] flex items-center justify-center">
                  <Repeat size={13} strokeWidth={2} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#1D1D1F] block">设为重复任务</span>
                  <span className="text-[10px] text-[#86868B] block">每天或工作日自动生成该待办</span>
                </div>
              </div>

              {/* iOS style toggle switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0071E3]"></div>
              </label>
            </div>

            {/* Expanded Recurring Configuration */}
            {isRecurring && (
              <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-2.5 animate-fadeIn">
                {/* 循环频次 */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#1D1D1F] mb-1">
                    重复周期
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'daily', label: '每天' },
                      { id: 'workdays', label: '工作日 (周一至周五)' },
                      { id: 'weekly', label: '每周' },
                      { id: 'monthly', label: '每月' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRecurringFreq(opt.id as RecurringFrequency)}
                        className={`py-1.5 px-2 text-xs rounded-xl font-medium border text-center transition-all cursor-pointer ${
                          recurringFreq === opt.id
                            ? 'bg-[#0071E3] text-white border-[#0071E3] font-semibold shadow-xs'
                            : 'bg-white text-[#48484A] border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 日期范围 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-[#1D1D1F]">
                      日期范围
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setHasEndDate(false)}
                        className={`px-2 py-0.5 text-[10px] rounded-md transition-colors cursor-pointer ${
                          !hasEndDate ? 'bg-[#0071E3] text-white font-medium' : 'bg-slate-200/70 text-[#86868B]'
                        }`}
                      >
                        长期有效
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasEndDate(true)}
                        className={`px-2 py-0.5 text-[10px] rounded-md transition-colors cursor-pointer ${
                          hasEndDate ? 'bg-[#0071E3] text-white font-medium' : 'bg-slate-200/70 text-[#86868B]'
                        }`}
                      >
                        指定截止日
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] text-[#86868B] mb-0.5">开始日期</span>
                      <input
                        type="date"
                        value={recurringStartDate}
                        onChange={(e) => setRecurringStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200/80 rounded-xl text-[#1D1D1F] focus:outline-none focus:border-[#0071E3] font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#86868B] mb-0.5">
                        {hasEndDate ? '截止日期' : '截止状态'}
                      </span>
                      {hasEndDate ? (
                        <input
                          type="date"
                          value={recurringEndDate}
                          min={recurringStartDate}
                          onChange={(e) => setRecurringEndDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200/80 rounded-xl text-[#1D1D1F] focus:outline-none focus:border-[#0071E3] font-mono"
                        />
                      ) : (
                        <div className="w-full px-2.5 py-1.5 text-xs bg-white/60 border border-dashed border-slate-200 text-[#86868B] rounded-xl flex items-center">
                          无截止日 · 持续重复
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div className="flex items-start gap-1.5 text-[10px] text-[#86868B] bg-white/70 p-2 rounded-xl border border-slate-200/60">
                  <Info size={12} strokeWidth={1.75} className="text-[#0071E3] flex-shrink-0 mt-0.5" />
                  <span>
                    该任务会在指定周期自动生成，每天完成后不影响后面的日期。
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Field 4: 标签 */}
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5 flex items-center gap-1">
              <Tag size={13} strokeWidth={1.75} className="text-[#0071E3]" />
              <span>标签</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['工作', '学习', '个人', '生活', '日常', '会议', '规划'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTodoTag(t)}
                  className={`px-3 py-1 text-xs rounded-xl transition-all cursor-pointer ${
                    todoTag === t 
                      ? 'bg-[#0071E3] text-white font-semibold shadow-xs shadow-blue-500/25' 
                      : 'bg-slate-100 text-[#48484A] hover:bg-slate-200/70 border border-transparent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Field 5: 优先级选择 */}
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5 flex items-center gap-1">
              <Flag size={13} strokeWidth={1.75} className="text-[#0071E3]" />
              <span>优先级</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'p1', label: 'P1 重要紧急', color: 'text-rose-600 bg-rose-50/80 border-rose-200' },
                { id: 'p2', label: 'P2 重要不急', color: 'text-amber-600 bg-amber-50/80 border-amber-200' },
                { id: 'p3', label: 'P3 紧急不重', color: 'text-blue-600 bg-blue-50/80 border-blue-200' },
                { id: 'p4', label: 'P4 普通日常', color: 'text-slate-600 bg-slate-100 border-slate-200' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTodoPriority(p.id as Priority)}
                  className={`py-1.5 px-2 text-[11px] rounded-xl border text-center transition-all cursor-pointer ${
                    todoPriority === p.id 
                      ? 'ring-2 ring-[#0071E3] font-bold ' + p.color 
                      : 'border-slate-200/80 bg-white text-[#48484A] hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
          <span className="text-[11px] text-[#86868B]">
            按 <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[#1D1D1F] font-mono">Enter</kbd> 保存
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#86868B] hover:text-[#1D1D1F] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!todoTitle.trim() || isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#0071E3] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2} />
              <span>{isSubmitting ? '保存中...' : '保存'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddTodoModal;

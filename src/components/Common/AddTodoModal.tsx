import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Tag, 
  Flag, 
  Plus, 
  X,
  Repeat,
  Info
} from 'lucide-react';
import type { RecurringConfig, RecurringFrequency, Task } from '../../types';
import { formatLocalDate, addDays } from '../../utils/date';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (taskData: {
    title: string;
    dueDate: string;
    tags?: string[];
    priority?: string;
    isRecurring?: boolean;
    recurringConfig?: RecurringConfig;
    id?: string;
  }) => Promise<void>;
  initialDate?: string;
  taskToEdit?: Task | null;
}

export const AddTodoModal: React.FC<AddTodoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialDate,
  taskToEdit,
}) => {
  const todayStr = formatLocalDate(new Date());
  
  const [todoTitle, setTodoTitle] = useState('');
  const [todoDate, setTodoDate] = useState(initialDate || todayStr);
  const [todoTime, setTodoTime] = useState('10:00');
  const [todoTag, setTodoTag] = useState('工作');
  const [todoPriority, setTodoPriority] = useState('p2');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recurring Task States
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<RecurringFrequency>('daily');
  const [recurringStartDate, setRecurringStartDate] = useState(initialDate || todayStr);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [recurringEndDate, setRecurringEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return formatLocalDate(d);
  });

  // Sync initial date or edit task when modal opens
  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTodoTitle(taskToEdit.title);
        const dStr = taskToEdit.dueDate ? taskToEdit.dueDate.slice(0, 10) : (initialDate || todayStr);
        setTodoDate(dStr);
        const tStr = taskToEdit.dueDate && taskToEdit.dueDate.includes('T') ? taskToEdit.dueDate.split('T')[1].slice(0, 5) : '10:00';
        setTodoTime(tStr);
        setTodoTag(taskToEdit.tags?.[0] || '工作');
        setTodoPriority(taskToEdit.priority || 'p2');
        setIsRecurring(!!taskToEdit.isRecurring);
        setRecurringFreq(taskToEdit.recurringConfig?.frequency || 'daily');
        setRecurringStartDate(taskToEdit.recurringConfig?.startDate || dStr);
        setHasEndDate(!!taskToEdit.recurringConfig?.endDate);
        if (taskToEdit.recurringConfig?.endDate) {
          setRecurringEndDate(taskToEdit.recurringConfig.endDate);
        }
      } else {
        const cur = initialDate || todayStr;
        setTodoDate(cur);
        setRecurringStartDate(cur);
        setTodoTitle('');
        setTodoTime('10:00');
        setTodoTag('工作');
        setTodoPriority('p2');
        setIsRecurring(false);
        setRecurringFreq('daily');
        setHasEndDate(false);
      }
      setIsSubmitting(false);
    }
  }, [isOpen, initialDate, todayStr, taskToEdit]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!todoTitle.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const combinedDueDate = todoTime ? `${todoDate}T${todoTime}:00` : todoDate;
      
      const recurringConfig: RecurringConfig | undefined = isRecurring ? {
        frequency: recurringFreq,
        startDate: recurringStartDate || todoDate,
        endDate: hasEndDate ? recurringEndDate : null,
      } : undefined;

      await onConfirm({
        title: todoTitle.trim(),
        dueDate: combinedDueDate,
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

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-md animate-fadeIn select-none"
    >
      <div 
        className="w-full max-w-xl bg-white/95 backdrop-blur-2xl rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-white/90 p-6 flex flex-col gap-4.5 relative animate-scaleUp text-left max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50/80 text-[#0071E3] flex items-center justify-center shadow-xs border border-blue-100/60">
              <CheckSquare size={18} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1D1D1F]">
                {taskToEdit ? '修改待办事项' : '新建待办事项'}
              </h3>
              <p className="text-xs text-[#86868B] mt-0.5">
                {taskToEdit ? '调整待办事项内容、时间、优先级与循环规则' : '填写待办事项内容，支持设置每日固定循环工作'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            title="关闭窗口"
            className="w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200 text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-4">
          {/* Field 1: 待办内容 (加大输入框) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#1D1D1F]">
                待办事项内容 <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-[#86868B]">
                支持详尽任务描述与备注
              </span>
            </div>
            <textarea
              rows={3}
              placeholder="例如：两江区域异常小区监控通报、完成需求文档评审、核对每日核心数据……"
              value={todoTitle}
              onChange={(e) => setTodoTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleConfirm();
                }
                if (e.key === 'Escape') onClose();
              }}
              autoFocus
              className="w-full px-4 py-3 text-sm leading-relaxed bg-white border border-slate-200/90 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] text-[#1D1D1F] placeholder-[#AEAEB2] transition-all shadow-2xs resize-y min-h-[96px]"
            />
          </div>

          {/* Field 2: 关联日期与时间 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                <CalendarIcon size={14} strokeWidth={1.75} className="text-[#0071E3]" />
                <span>首次执行日期与时间</span>
              </label>
              {/* Quick Date Chips */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTodoDate(todayStr)}
                  className={`px-2 py-0.5 text-[10px] rounded-md transition-colors cursor-pointer ${
                    todoDate === todayStr ? 'bg-[#0071E3] text-white font-medium' : 'bg-slate-100 text-[#86868B] hover:bg-slate-200'
                  }`}
                >
                  今天
                </button>
                <button
                  type="button"
                  onClick={() => setTodoDate(addDays(todayStr, 1))}
                  className="px-2 py-0.5 text-[10px] rounded-md bg-slate-100 text-[#86868B] hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  明天
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={todoDate}
                onChange={(e) => {
                  setTodoDate(e.target.value);
                  if (!isRecurring) setRecurringStartDate(e.target.value);
                }}
                className="w-full px-3 py-2 text-xs bg-white/80 border border-slate-200/80 rounded-xl text-[#1D1D1F] focus:outline-none focus:border-[#0071E3] cursor-pointer shadow-2xs font-mono"
              />
              <input
                type="time"
                value={todoTime}
                onChange={(e) => setTodoTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white/80 border border-slate-200/80 rounded-xl text-[#1D1D1F] focus:outline-none focus:border-[#0071E3] cursor-pointer shadow-2xs font-mono"
              />
            </div>
          </div>

          {/* Field 3: 循环任务配置 (每日固定工作) */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#0071E3] flex items-center justify-center">
                  <Repeat size={14} strokeWidth={2} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#1D1D1F]">设为每日固定循环任务</div>
                  <div className="text-[10px] text-[#86868B]">设置有效日期后，系统将在每天待办中自动同步出现</div>
                </div>
              </div>

              {/* Apple-style iOS Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isRecurring}
                onClick={() => setIsRecurring(!isRecurring)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                  isRecurring ? 'bg-[#0071E3]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    isRecurring ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Expanded Recurring Settings */}
            {isRecurring && (
              <div className="mt-3.5 pt-3.5 border-t border-slate-200/70 space-y-3 animate-fadeIn">
                {/* 循环频率 */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#1D1D1F] mb-1.5">
                    循环频率
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'daily', label: '每天重复' },
                      { id: 'workday', label: '工作日 (周一至五)' },
                      { id: 'weekly', label: '每周固定' },
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

                {/* 有效日期范围 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-[#1D1D1F]">
                      有效日期范围
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
                        {hasEndDate ? '截止结束日期' : '结束状态'}
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
                          无截止期 · 持续循环
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div className="flex items-start gap-1.5 text-[10px] text-[#86868B] bg-white/70 p-2 rounded-xl border border-slate-200/60">
                  <Info size={12} strokeWidth={1.75} className="text-[#0071E3] flex-shrink-0 mt-0.5" />
                  <span>
                    在有效期内，工作台将自动在每天的待办列表中生成该项工作。当日勾选完成仅记录当日成果，不影响后续天数。
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Field 4: 分类标签 */}
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5 flex items-center gap-1">
              <Tag size={13} strokeWidth={1.75} className="text-[#0071E3]" />
              <span>分类标签</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['工作', '学习', '个人成长', '生活', '日常固定', '会议', '规划'].map((t) => (
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
                { id: 'p1', label: 'P1 重要且紧急', color: 'text-rose-600 bg-rose-50/80 border-rose-200' },
                { id: 'p2', label: 'P2 重要不紧急', color: 'text-amber-600 bg-amber-50/80 border-amber-200' },
                { id: 'p3', label: 'P3 紧急不重要', color: 'text-blue-600 bg-blue-50/80 border-blue-200' },
                { id: 'p4', label: 'P4 普通日常', color: 'text-slate-600 bg-slate-100 border-slate-200' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTodoPriority(p.id)}
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
            按 <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[#1D1D1F] font-mono">Enter</kbd> 快速保存，<kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[#1D1D1F] font-mono">Shift+Enter</kbd> 换行
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
              <span>{isSubmitting ? '保存中...' : (taskToEdit ? '保存修改' : (isRecurring ? '确认并开启循环' : '确认创建'))}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddTodoModal;

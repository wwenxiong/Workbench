import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Plus,
  Clock,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  ArrowUp,
  ArrowDown,
  Repeat,
  Edit3,
  ChevronDown,
  Calendar,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Task, Priority } from '../../types';
import { soundEngine } from '../../utils/audio';
import { useToast } from '../Common/Toast';
import { AddTodoModal } from '../Common/AddTodoModal';
import { CompleteTaskModal } from './CompleteTaskModal';
import { formatLocalDate, formatChineseDate, addDays } from '../../utils/date';
import { useTheme } from '../../contexts/ThemeContext';

interface TodoListProps {
  tasks: Task[];
  onAddTask: (task: Partial<Task>) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onReorderTasks: (taskIds: string[]) => Promise<void>;
  onStartFocusOnTask?: (taskId: string) => void;
  selectedDate: string;
}

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; desc: string; color: string; bg: string; badge: string; border: string }
> = {
  p1: {
    label: '重要且紧急',
    desc: '优先处理',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    border: 'border-rose-200',
  },
  p2: {
    label: '重要不紧急',
    desc: '计划安排',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    border: 'border-amber-200',
  },
  p3: {
    label: '紧急不重要',
    desc: '尽快处理',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    border: 'border-blue-200',
  },
  p4: {
    label: '普通日常',
    desc: '有空再做',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    border: 'border-slate-200',
  },
};

export const TodoList: React.FC<TodoListProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  selectedDate,
}) => {
  const { showToast } = useToast();
  const { isOledTheme } = useTheme();
  const todayStr = formatLocalDate(new Date());

  // Date-based filter: defaults to today, past goes to overdue, upcoming goes to future
  const [dateFilter, setDateFilter] = useState<'today' | 'overdue' | 'future' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'quadrant'>('list');

  // Unified Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Time-tracking modal state for task completion
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  // Group collapse state (manual toggle overrides)
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  // Completed items toggle state inside each date group (default: collapsed)
  const [expandedCompletedDates, setExpandedCompletedDates] = useState<Record<string, boolean>>({});
  // Expanded task IDs to view full content for long tasks
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Toggle complete: if completing -> open completion modal; if uncompleting -> directly unmark
  const handleToggleComplete = async (task: Task) => {
    if (!task.completed) {
      setCompletingTask(task);
    } else {
      await onUpdateTask(task.id, {
        completed: false,
        completedAt: undefined,
      });
      showToast('已标记为未完成', { type: 'info' });
    }
  };

  // Confirm task completion with recorded duration & timeSpan
  const handleConfirmCompleteWithDuration = async (
    taskId: string,
    data: { completed: boolean; actualMinutes: number; timeSpan: string; startTime?: string; endTime?: string }
  ) => {
    soundEngine.playTaskDone();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'],
    });

    await onUpdateTask(taskId, {
      completed: true,
      completedAt: new Date().toISOString(),
      actualMinutes: data.actualMinutes,
      timeSpan: data.timeSpan,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    showToast('任务已完成！', {
      type: 'success',
      message: data.timeSpan ? `用时：${data.timeSpan}，${data.actualMinutes}分钟 已自动记入日报` : '已完成',
    });
  };

  // Submit task from unified modal (handles both create and edit)
  const handleSaveTaskFromModal = async (taskData: {
    title: string;
    dueDate: string;
    tags?: string[];
    priority?: string;
    isRecurring?: boolean;
    recurringConfig?: any;
    id?: string;
  }) => {
    if (taskData.id) {
      await onUpdateTask(taskData.id, {
        title: taskData.title,
        dueDate: taskData.dueDate,
        tags: taskData.tags,
        priority: (taskData.priority as Priority) || 'p2',
        isRecurring: taskData.isRecurring,
        recurringConfig: taskData.recurringConfig,
      });
      showToast('待办已修改', { type: 'success' });
    } else {
      await onAddTask({
        title: taskData.title,
        priority: (taskData.priority as Priority) || 'p2',
        estimatedMinutes: 25,
        tags: taskData.tags || ['工作'],
        dueDate: taskData.dueDate || selectedDate,
        isRecurring: taskData.isRecurring,
        recurringConfig: taskData.recurringConfig,
      });
      showToast(taskData.isRecurring ? '重复待办已开启' : '新待办已创建', { type: 'success' });
    }
    setTaskToEdit(null);
  };

  // Move task up/down
  const handleMoveOrder = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= tasks.length) return;

    const reordered = [...tasks];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    await onReorderTasks(reordered.map((t) => t.id));
  };

  // Date-based count statistics (only counts uncompleted tasks; if all completed, count is 0)
  const dateCounts = useMemo(() => {
    let today = 0;
    let overdue = 0;
    let future = 0;
    let all = 0;

    tasks.forEach((t) => {
      // Only count uncompleted tasks
      if (!t.completed) {
        all++;
        const d = t.dueDate ? t.dueDate.slice(0, 10) : (t.createdAt ? t.createdAt.slice(0, 10) : 'nodate');
        if (d === todayStr || d === 'nodate') {
          today++;
        } else if (d < todayStr) {
          overdue++;
        } else if (d > todayStr) {
          future++;
        }
      }
    });

    return { today, overdue, future, all };
  }, [tasks, todayStr]);

  // Filter tasks by date category, status, and priority
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const d = t.dueDate ? t.dueDate.slice(0, 10) : (t.createdAt ? t.createdAt.slice(0, 10) : 'nodate');

      // 1. Date category filter (Default: today)
      if (dateFilter === 'today') {
        if (d !== todayStr && d !== 'nodate') return false;
      } else if (dateFilter === 'overdue') {
        if (d >= todayStr || d === 'nodate') return false;
      } else if (dateFilter === 'future') {
        if (d <= todayStr) return false;
      }
      // 'all' shows all dates

      // 2. Status filter
      if (statusFilter === 'active' && t.completed) return false;
      if (statusFilter === 'completed' && !t.completed) return false;

      // 3. Priority filter
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

      return true;
    });
  }, [tasks, dateFilter, statusFilter, priorityFilter, todayStr]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  // Group tasks by date & sort: current date (today) auto-pinned to top, older dates go down
  const groupedTasks = useMemo(() => {
    const groups: Record<
      string,
      { dateStr: string; tasks: Task[]; activeTasks: Task[]; completedTasks: Task[] }
    > = {};

    filteredTasks.forEach((t) => {
      const dKey = t.dueDate ? t.dueDate.slice(0, 10) : (t.createdAt ? t.createdAt.slice(0, 10) : 'nodate');
      if (!groups[dKey]) {
        groups[dKey] = {
          dateStr: dKey,
          tasks: [],
          activeTasks: [],
          completedTasks: [],
        };
      }
      groups[dKey].tasks.push(t);
      if (t.completed) {
        groups[dKey].completedTasks.push(t);
      } else {
        groups[dKey].activeTasks.push(t);
      }
    });

    // Sort dates:
    // 1. todayStr comes first (current date pinned to top)
    // 2. Future dates: sorted ascending (tomorrow, day after tomorrow)
    // 3. Past dates: sorted descending (yesterday, day before yesterday; older dates go down)
    // 4. 'nodate' comes last
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === todayStr) return -1;
      if (b === todayStr) return 1;
      if (a === 'nodate') return 1;
      if (b === 'nodate') return -1;

      const aIsFuture = a > todayStr;
      const bIsFuture = b > todayStr;

      if (aIsFuture && !bIsFuture) return -1;
      if (!aIsFuture && bIsFuture) return 1;

      if (aIsFuture && bIsFuture) {
        return a.localeCompare(b);
      }

      // Past historical dates: descending order (newer first, older go down)
      return b.localeCompare(a);
    });

    return sortedKeys.map((key) => groups[key]);
  }, [filteredTasks, todayStr]);

  // Check if date group is collapsed
  const isDateGroupCollapsed = (dateKey: string, allCompleted: boolean, isPast: boolean) => {
    if (collapsedDates[dateKey] !== undefined) {
      return collapsedDates[dateKey];
    }
    // Default: today is always expanded
    if (dateKey === todayStr) return false;
    // Historical past dates where all tasks are already completed -> default collapse
    if (isPast && allCompleted) return true;
    return false;
  };

  const toggleDateGroup = (dateKey: string, allCompleted: boolean, isPast: boolean) => {
    const current = isDateGroupCollapsed(dateKey, allCompleted, isPast);
    setCollapsedDates((prev) => ({
      ...prev,
      [dateKey]: !current,
    }));
  };

  const toggleCompletedGroup = (dateKey: string) => {
    setExpandedCompletedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  // Render quadrant card
  const renderQuadrantCard = (priorityKey: Priority) => {
    const cfg = PRIORITY_CONFIG[priorityKey];
    const quadrantTasks = tasks.filter((t) => t.priority === priorityKey);

    return (
      <div className={`flex flex-col h-full rounded-xl border ${
        isOledTheme ? 'bg-[#0C0F11] border-white/[0.08]' : `${cfg.border} ${cfg.bg}`
      } p-4 transition-all shadow-xs`}>
        <div className={`flex items-center justify-between pb-2 mb-3 border-b ${
          isOledTheme ? 'border-white/[0.06]' : 'border-slate-200/60'
        }`}>
          <div>
            <h3 className={`font-bold text-sm ${isOledTheme ? 'text-[#F2F5F5]' : cfg.color}`}>{cfg.label}</h3>
            <p className={`text-[10px] ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-500'} font-medium`}>{cfg.desc}</p>
          </div>
          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
            isOledTheme ? 'bg-[#111417] border border-white/[0.08] text-[#00E5FF]' : 'bg-white/80 border border-slate-200 text-slate-600'
          }`}>
            {quadrantTasks.length} 项
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-1 custom-scrollbar">
          {quadrantTasks.map((task, qIdx) => {
            const cleanTitle = task.title.replace(/^\s*\d+[\.、\s\-]\s*/, '').trim() || task.title;
            const displayTitle = `${qIdx + 1}. ${cleanTitle}`;

            return (
              <div
                key={task.id}
                className={`p-2.5 rounded-lg border shadow-2xs flex items-center justify-between gap-2 group transition-all ${
                  isOledTheme
                    ? `bg-[#111417] border-white/[0.06] hover:border-[#00E5FF]/40 ${task.completed ? 'opacity-50' : ''}`
                    : `bg-white border-slate-200/80 hover:border-slate-300 ${task.completed ? 'opacity-50' : ''}`
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleComplete(task);
                    }}
                    className="text-slate-400 hover:text-[#00E5FF] transition-transform active:scale-90 shrink-0 cursor-pointer"
                  >
                    {task.completed ? (
                      <div className={`w-4 h-4 rounded-full ${isOledTheme ? 'bg-[#B7FF3C] text-[#050607]' : 'bg-[#0071E3] text-white'} flex items-center justify-center transition-all duration-200`}>
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : (
                      <div className={`w-4 h-4 rounded-full border ${isOledTheme ? 'border-white/20 hover:border-[#00E5FF]' : 'border-slate-300 hover:border-[#0071E3]'} transition-all hover:scale-105`} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`block text-xs truncate ${
                        task.completed
                          ? (isOledTheme ? 'line-through text-[#52595E]' : 'line-through text-slate-400')
                          : (isOledTheme ? 'text-[#F2F5F5] font-medium' : 'text-slate-800 font-medium')
                      }`}
                    >
                      {displayTitle}
                    </span>
                    <div className={`flex items-center gap-2 mt-0.5 text-[10px] ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`}>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        <span>
                          {task.actualMinutes}/{task.estimatedMinutes}m
                        </span>
                      </span>

                      {task.tags &&
                        task.tags.map((tag) => (
                          <span key={tag} className={`px-1.5 py-0.2 rounded font-medium ${isOledTheme ? 'bg-white/5 text-[#7D858A]' : 'bg-slate-100 text-slate-600'}`}>
                            #{tag}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTaskToEdit(task);
                    setIsModalOpen(true);
                  }}
                  className={`opacity-0 group-hover:opacity-100 ${isOledTheme ? 'text-[#7D858A] hover:text-[#00E5FF]' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {quadrantTasks.length === 0 && (
            <div className={`flex-1 flex items-center justify-center text-xs ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'} py-6`}>
              暂无待办
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render individual task card
  const renderTaskRow = (task: Task, idx: number, isListGroup: boolean = true) => {
    const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.p2;
    const cleanTitle = task.title.replace(/^\s*\d+[\.、\s\-]\s*/, '').trim() || task.title;
    const displayTitle = `${idx + 1}. ${cleanTitle}`;
    const isExpanded = !!expandedTaskIds[task.id];
    // 字符数大于 22，或者包含换行，视为超长内容
    const isLongContent = cleanTitle.length > 22 || cleanTitle.includes('\n');

    return (
      <div
        key={task.id}
        className={`group rounded-xl border transition-all ${
          task.completed
            ? (isOledTheme ? 'bg-[#0C0F11]/60 border-white/[0.04] opacity-60 hover:opacity-90' : 'bg-slate-50/70 border-slate-200/60 opacity-70 hover:opacity-95')
            : (isOledTheme ? 'bg-[#0C0F11] border-white/[0.08] hover:border-[#00E5FF]/30 hover:shadow-[0_2px_12px_rgba(0,229,255,0.06)]' : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs')
        }`}
      >
        {/* Main Row - 始终只显示一行 */}
        <div className="flex items-center justify-between px-3 py-2.5 gap-2.5 min-w-0">
          {/* Left: Checkbox & Single-line Content */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggleComplete(task);
              }}
              className="text-slate-400 hover:text-[#00E5FF] transition-transform active:scale-90 cursor-pointer shrink-0"
              title={task.completed ? '标记为未完成' : '完成任务'}
            >
              {task.completed ? (
                <div className={`w-4 h-4 rounded-full ${isOledTheme ? 'bg-[#B7FF3C] text-[#050607]' : 'bg-[#0071E3] text-white'} flex items-center justify-center transition-all duration-200`}>
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : (
                <div className={`w-4 h-4 rounded-full border ${isOledTheme ? 'border-white/[0.2] hover:border-[#00E5FF]' : 'border-slate-300 hover:border-[#0071E3]'} transition-all hover:scale-105`} />
              )}
            </button>

            {/* Title (Always single-line truncated) */}
            <span
              className={`text-xs font-medium truncate shrink min-w-0 ${
                task.completed ? (isOledTheme ? 'line-through text-[#52595E]' : 'line-through text-slate-400') : (isOledTheme ? 'text-[#F2F5F5]' : 'text-slate-800')
              }`}
              title={cleanTitle}
            >
              {displayTitle}
            </span>

            {/* If content is long, show expand/collapse button */}
            {isLongContent && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleTaskExpand(task.id);
                }}
                className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-medium transition-colors shrink-0 cursor-pointer ${
                  isOledTheme
                    ? 'text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20'
                    : 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80'
                }`}
                title={isExpanded ? '收起完整内容' : '展开查看全部内容'}
              >
                <span>{isExpanded ? '收起' : '展开'}</span>
                <ChevronDown
                  size={11}
                  className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
            )}

            {/* Recurring Tag */}
            {task.isRecurring && (
              <span
                title="循环任务"
                className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded-md font-semibold shrink-0 ${
                  isOledTheme
                    ? 'text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/30'
                    : 'text-[#0071E3] bg-blue-50/90 border border-blue-200/70'
                }`}
              >
                <Repeat size={10} strokeWidth={2} />
                <span>循环</span>
              </span>
            )}

            {/* Priority pill */}
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold border shrink-0 ${
              isOledTheme ? 'bg-white/5 border-white/10 text-white/70' : pCfg.badge
            }`}>
              {pCfg.label}
            </span>

            {/* Tags */}
            {task.tags &&
              task.tags.map((tag) => (
                <span
                  key={tag}
                  className={`px-1.5 py-0.2 rounded text-[10px] font-medium shrink-0 ${
                    isOledTheme ? 'bg-white/5 text-[#7D858A]' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  #{tag}
                </span>
              ))}
          </div>

          {/* Right: Quick Meta & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick time display on single line */}
            {task.timeSpan ? (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded font-mono hidden md:inline-block ${
                isOledTheme ? 'text-[#B7FF3C] bg-[#B7FF3C]/10 border border-[#B7FF3C]/20' : 'text-emerald-700 bg-emerald-50 border border-emerald-100'
              }`}>
                {task.timeSpan}
              </span>
            ) : task.dueDate ? (
              <span className={`text-[10px] font-mono hidden md:inline-block ${isOledTheme ? 'text-white/40' : 'text-slate-400'}`}>
                {task.dueDate.includes('T') ? task.dueDate.split('T')[1].slice(0, 5) : ''}
              </span>
            ) : null}

            {/* Action buttons */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTaskToEdit(task);
                  setIsModalOpen(true);
                }}
                title="修改任务"
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isOledTheme ? 'text-white/40 hover:text-[#00E5FF] hover:bg-white/5' : 'text-slate-400 hover:text-[#0071E3] hover:bg-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              {!task.completed && isListGroup && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMoveOrder(idx, 'up');
                    }}
                    disabled={idx === 0}
                    title="上移"
                    className={`p-1 disabled:opacity-30 cursor-pointer ${
                      isOledTheme ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMoveOrder(idx, 'down');
                    }}
                    disabled={idx === filteredTasks.length - 1}
                    title="下移"
                    className={`p-1 disabled:opacity-30 cursor-pointer ${
                      isOledTheme ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDeleteTask(task.id);
                }}
                title="删除任务"
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isOledTheme ? 'text-white/40 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Drawer - 下拉查看全部内容 */}
        {isExpanded && (
          <div className={`px-3.5 pb-3 pt-2 border-t rounded-b-xl animate-fadeIn ${
            isOledTheme ? 'border-white/[0.06] bg-[#080A0C]' : 'border-slate-100/90 bg-slate-50/60'
          }`}>
            <div className={`text-xs leading-relaxed whitespace-pre-wrap break-words pl-6 font-normal select-text ${
              isOledTheme ? 'text-[#F2F5F5]' : 'text-slate-800'
            }`}>
              {displayTitle}
            </div>

            {/* Detailed metadata */}
            <div className={`flex items-center gap-3 text-[11px] mt-2 pl-6 flex-wrap font-mono ${
              isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'
            }`}>
              <span>预估: {task.estimatedMinutes}m</span>
              {task.actualMinutes > 0 && (
                <span className={isOledTheme ? 'text-[#00E5FF] font-semibold' : 'text-indigo-600 font-semibold'}>
                  实际用时: {task.actualMinutes}m
                </span>
              )}
              {task.timeSpan && (
                <span className={isOledTheme ? 'text-[#B7FF3C] font-medium' : 'text-emerald-600 font-medium'}>
                  打卡时段: {task.timeSpan}
                </span>
              )}
              {task.dueDate && (
                <span>排期: {task.dueDate.replace('T', ' ')}</span>
              )}
              {task.completedAt && (
                <span className={isOledTheme ? 'text-[#B7FF3C]' : 'text-emerald-600'}>
                  完成于 {new Date(task.completedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className={`flex flex-col h-full ${
      isOledTheme ? 'bg-[#080A0C] border-white/[0.08] text-[#F2F5F5]' : 'bg-white border-slate-200/80 shadow-xs'
    } rounded-2xl border overflow-hidden select-none transition-all duration-300`}>
      {/* 1. Header Toolbar */}
      <div className={`p-4 border-b ${
        isOledTheme ? 'bg-[#0C0F11] border-white/[0.06]' : 'bg-slate-50/50 border-slate-100'
      } flex items-center justify-between flex-wrap gap-3`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-base font-extrabold ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-slate-900'} tracking-tight`}>
              待办事项
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
              isOledTheme ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              已完成 {completedCount}/{totalCount}
            </span>
          </div>

          {/* Progress bar */}
          <div className={`w-48 h-1.5 ${isOledTheme ? 'bg-white/10' : 'bg-slate-200'} rounded-full mt-2 overflow-hidden`}>
            <div
              className={`h-full ${
                isOledTheme ? 'bg-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.6)]' : 'bg-blue-600'
              } transition-all duration-500 rounded-full`}
              style={{ width: `${totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Action & View Toggles */}
        <div className="flex items-center gap-2">
          {/* List vs Quadrant toggle */}
          <div className={`flex p-0.5 ${
            isOledTheme ? 'bg-[#111417] border border-white/[0.08]' : 'bg-slate-200/70'
          } rounded-lg text-xs font-medium`}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'list'
                  ? isOledTheme ? 'bg-[#00E5FF] text-[#050607] font-bold shadow-xs' : 'bg-white text-slate-900 font-bold shadow-xs'
                  : isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>清单</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('quadrant')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'quadrant'
                  ? isOledTheme ? 'bg-[#00E5FF] text-[#050607] font-bold shadow-xs' : 'bg-white text-slate-900 font-bold shadow-xs'
                  : isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>四象限</span>
            </button>
          </div>

          {/* Add Task Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl ${
              isOledTheme
                ? 'bg-[#00E5FF] hover:bg-[#00cce6] text-[#050607] shadow-sm shadow-[#00E5FF]/20 font-bold'
                : 'bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 text-white font-bold'
            } text-xs transition-all active:scale-95 cursor-pointer`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加待办</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar (List view only) */}
      {viewMode === 'list' && (
        <div className={`px-5 py-3 border-b flex items-center justify-between text-xs flex-wrap gap-3 ${
          isOledTheme ? 'bg-[#0C0F11]/90 border-white/[0.06] text-[#7D858A]' : 'bg-white/70 backdrop-blur-sm border-slate-100 text-slate-500'
        }`}>
          {/* Primary Date Tabs */}
          <div className={`flex items-center gap-1 ${
            isOledTheme ? 'bg-[#111417] border border-white/[0.08]' : 'bg-slate-100/90'
          } p-1 rounded-2xl`}>
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                dateFilter === 'today'
                  ? isOledTheme ? 'bg-[#00E5FF] text-[#050607] font-bold' : 'bg-white text-[#0071E3] shadow-xs'
                  : isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5] hover:bg-white/5' : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-white/40'
              }`}
            >
              <span>当日待办</span>
              {dateCounts.today > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                  dateFilter === 'today'
                    ? (isOledTheme ? 'bg-[#050607]/30 text-[#050607]' : 'bg-blue-50 text-[#0071E3]')
                    : (isOledTheme ? 'bg-white/10 text-white/70' : 'bg-slate-200/80 text-slate-600')
                }`}>
                  {dateCounts.today}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDateFilter('overdue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                dateFilter === 'overdue'
                  ? (isOledTheme ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-white text-rose-600 shadow-xs')
                  : (isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5] hover:bg-white/5' : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-white/40')
              }`}
            >
              <span>已到期</span>
              {dateCounts.overdue > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                  dateFilter === 'overdue' ? 'bg-rose-500/20 text-rose-400' : (isOledTheme ? 'bg-white/10 text-white/70' : 'bg-slate-200/80 text-slate-600')
                }`}>
                  {dateCounts.overdue}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDateFilter('future')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                dateFilter === 'future'
                  ? (isOledTheme ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 font-bold' : 'bg-white text-[#0071E3] shadow-xs')
                  : (isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5] hover:bg-white/5' : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-white/40')
              }`}
            >
              <span>未来</span>
              {dateCounts.future > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                  dateFilter === 'future'
                    ? (isOledTheme ? 'bg-[#00E5FF]/30 text-[#00E5FF]' : 'bg-blue-50 text-[#0071E3]')
                    : (isOledTheme ? 'bg-white/10 text-white/70' : 'bg-slate-200/80 text-slate-600')
                }`}>
                  {dateCounts.future}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                dateFilter === 'all'
                  ? (isOledTheme ? 'bg-white/10 text-white font-bold' : 'bg-white text-[#1D1D1F] shadow-xs')
                  : (isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5] hover:bg-white/5' : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-white/40')
              }`}
            >
              <span>全部</span>
              {dateCounts.all > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                  dateFilter === 'all'
                    ? (isOledTheme ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800')
                    : (isOledTheme ? 'bg-white/10 text-white/70' : 'bg-slate-200/80 text-slate-600')
                }`}>
                  {dateCounts.all}
                </span>
              )}
            </button>
          </div>

          {/* Secondary Sub-filters: Status and Priority */}
          <div className="flex items-center gap-2.5">
            {/* Status Segmented Pill */}
            <div className={`flex items-center p-0.5 ${
              isOledTheme ? 'bg-[#111417] border border-white/[0.08]' : 'bg-slate-100'
            } rounded-xl text-[11px]`}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? (isOledTheme ? 'bg-white/10 text-white font-bold' : 'bg-white text-[#1D1D1F] font-bold shadow-2xs')
                    : (isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5]' : 'text-[#6E6E73] hover:text-[#1D1D1F]')
                }`}
              >
                全部状态
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'active'
                    ? (isOledTheme ? 'bg-[#00E5FF]/20 text-[#00E5FF] font-bold border border-[#00E5FF]/40' : 'bg-white text-[#0071E3] font-bold shadow-2xs')
                    : (isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5]' : 'text-[#6E6E73] hover:text-[#1D1D1F]')
                }`}
              >
                进行中
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'completed'
                    ? (isOledTheme ? 'bg-[#B7FF3C]/20 text-[#B7FF3C] font-bold border border-[#B7FF3C]/40' : 'bg-white text-emerald-600 font-bold shadow-2xs')
                    : (isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5]' : 'text-[#6E6E73] hover:text-[#1D1D1F]')
                }`}
              >
                已完成
              </button>
            </div>

            {/* Priority Select */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={`${
                isOledTheme
                  ? 'bg-[#111417] border-white/[0.08] text-[#F2F5F5] hover:bg-[#161B20]'
                  : 'bg-slate-100/90 border-slate-200/80 text-[#48484A] hover:bg-slate-200/60'
              } border rounded-xl px-2.5 py-1 text-[11px] font-medium outline-none cursor-pointer transition-colors`}
            >
              <option value="all">所有优先级</option>
              <option value="p1">P1 重要且紧急</option>
              <option value="p2">P2 重要不紧急</option>
              <option value="p3">P3 紧急不重要</option>
              <option value="p4">P4 普通日常</option>
            </select>
          </div>
        </div>
      )}

      {/* 3. Main Display Area */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {viewMode === 'quadrant' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {renderQuadrantCard('p1')}
            {renderQuadrantCard('p2')}
            {renderQuadrantCard('p3')}
            {renderQuadrantCard('p4')}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedTasks.map((group) => {
              const isToday = group.dateStr === todayStr;
              const isPast = group.dateStr < todayStr;
              const allCompleted = group.activeTasks.length === 0 && group.completedTasks.length > 0;
              const isCollapsed = isDateGroupCollapsed(group.dateStr, allCompleted, isPast);
              const isCompletedExpanded = !!expandedCompletedDates[group.dateStr];

              // Friendly title for date header
              const yesterdayStr = addDays(todayStr, -1);
              const tomorrowStr = addDays(todayStr, 1);
              let dateTag = '';
              let tagStyle = '';
              if (isToday) {
                dateTag = '今天';
                tagStyle = isOledTheme
                  ? 'bg-[#00E5FF] text-[#050607] font-bold shadow-2xs'
                  : 'bg-[#0071E3] text-white shadow-2xs font-bold';
              } else if (group.dateStr === yesterdayStr) {
                dateTag = '昨天';
                tagStyle = isOledTheme
                  ? 'bg-white/10 text-white/80 font-semibold'
                  : 'bg-slate-200 text-slate-700 font-semibold';
              } else if (group.dateStr === tomorrowStr) {
                dateTag = '明天';
                tagStyle = isOledTheme
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                  : 'bg-purple-100 text-purple-700 border border-purple-200/80 font-semibold';
              } else if (isPast) {
                dateTag = '已到期';
                tagStyle = group.activeTasks.length > 0
                  ? isOledTheme ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold' : 'bg-rose-50 text-rose-600 border border-rose-200/80 font-bold'
                  : isOledTheme ? 'bg-white/10 text-white/60 font-medium' : 'bg-slate-100 text-slate-600 border border-slate-200 font-medium';
              } else {
                dateTag = '未来';
                tagStyle = isOledTheme
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 font-medium'
                  : 'bg-blue-50 text-[#0071E3] border border-blue-200/80 font-medium';
              }

              const formattedTitle = group.dateStr === 'nodate'
                ? '未排期事项'
                : formatChineseDate(group.dateStr);

              return (
                <div
                  key={group.dateStr}
                  className={`rounded-2xl border transition-all ${
                    isOledTheme
                      ? (isToday ? 'border-[#00E5FF]/30 bg-[#00E5FF]/[0.03] ring-1 ring-[#00E5FF]/20' : isPast && group.activeTasks.length > 0 ? 'border-rose-500/30 bg-rose-500/[0.03]' : 'border-white/[0.06] bg-[#0C0F11]')
                      : (isToday ? 'border-blue-200/90 bg-blue-50/20 shadow-2xs ring-1 ring-blue-100/80' : isPast && group.activeTasks.length > 0 ? 'border-rose-200/80 bg-rose-50/10 shadow-2xs' : 'border-slate-200/80 bg-white/90 shadow-2xs')
                  }`}
                >
                  {/* Date Group Header Banner */}
                  <div
                    onClick={() => toggleDateGroup(group.dateStr, allCompleted, isPast)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer select-none ${
                      isOledTheme ? 'hover:bg-white/[0.03]' : 'hover:bg-white/60'
                    } transition-colors rounded-2xl`}
                  >
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={15} className={isToday ? (isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]') : (isOledTheme ? 'text-[#7D858A]' : 'text-slate-500')} />
                        <span className={`text-xs font-bold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-slate-800'}`}>
                          {formattedTitle}
                        </span>
                        {dateTag && (
                          <span className={`px-2 py-0.2 rounded-full text-[10px] ${tagStyle}`}>
                            {dateTag}
                          </span>
                        )}
                      </div>

                      {/* Stats Pills */}
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {group.activeTasks.length > 0 ? (
                          <span className={`px-2 py-0.5 rounded-full ${
                            isOledTheme ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-amber-50 border border-amber-200 text-amber-700'
                          } font-semibold font-mono`}>
                            {group.activeTasks.length} 项进行中
                          </span>
                        ) : (
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                            isOledTheme ? 'bg-[#B7FF3C]/10 border border-[#B7FF3C]/30 text-[#B7FF3C]' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                          } font-semibold font-mono`}>
                            <Check size={11} strokeWidth={2.5} />
                            <span>已全部完成</span>
                          </span>
                        )}

                        {group.completedTasks.length > 0 && (
                          <span className={`px-2 py-0.5 rounded-full ${
                            isOledTheme ? 'bg-white/5 text-[#7D858A]' : 'bg-slate-100 text-slate-500'
                          } font-medium font-mono`}>
                            {group.completedTasks.length} 项已完成
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center gap-1 ${isOledTheme ? 'text-white/40' : 'text-slate-400'}`}>
                      <span className="text-[11px] font-medium hidden sm:inline">
                        {isCollapsed ? '展开' : '收起'}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${
                          isCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Date Group Body */}
                  {!isCollapsed && (
                    <div className={`px-3.5 pb-3.5 pt-1 space-y-2 border-t ${
                      isOledTheme ? 'border-white/[0.06]' : 'border-slate-100/90'
                    } animate-fadeIn`}>
                      {/* 1. Active Tasks (Uncompleted) */}
                      {group.activeTasks.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {group.activeTasks.map((t, idx) => renderTaskRow(t, idx, true))}
                        </div>
                      )}

                      {/* 2. Completed Tasks Section (Auto Collapsed by Default) */}
                      {group.completedTasks.length > 0 && (
                        <div className="pt-1.5">
                          {/* Toggle Capsule */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompletedGroup(group.dateStr);
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs ${
                              isOledTheme
                                ? 'text-[#7D858A] hover:text-[#F2F5F5] bg-[#111417] hover:bg-white/5 border border-white/[0.08]'
                                : 'text-slate-600 hover:text-slate-900 bg-white/90 hover:bg-white border border-slate-200/80'
                            } rounded-xl transition-all shadow-2xs cursor-pointer group/comp`}
                          >
                            <CheckCircle2 size={13} className={isOledTheme ? 'text-[#B7FF3C]' : 'text-emerald-600'} />
                            <span className="font-semibold text-[11px]">
                              已完成事项 ({group.completedTasks.length})
                            </span>
                            <span className={`text-[10px] ${isOledTheme ? 'text-white/40 group-hover/comp:text-white/70' : 'text-slate-400 group-hover/comp:text-slate-600'}`}>
                              {isCompletedExpanded ? '点击折叠' : '点击查看'}
                            </span>
                            <ChevronDown
                              size={13}
                              className={`${isOledTheme ? 'text-white/40' : 'text-slate-400'} transition-transform duration-200 ${
                                isCompletedExpanded ? 'rotate-180' : 'rotate-0'
                              }`}
                            />
                          </button>

                          {/* Expanded Completed Tasks List */}
                          {isCompletedExpanded && (
                            <div className={`mt-2 space-y-1.5 pl-3 border-l-2 ${
                              isOledTheme ? 'border-[#B7FF3C]/40' : 'border-emerald-200/80'
                            } animate-fadeIn`}>
                              {group.completedTasks.map((t, idx) => renderTaskRow(t, idx, false))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom Add Todo Link */}
            <div className={`pt-3 border-t ${isOledTheme ? 'border-white/[0.06]' : 'border-slate-100/80'} mt-2 flex items-center justify-between`}>
              <button
                type="button"
                onClick={() => {
                  setTaskToEdit(null);
                  setIsModalOpen(true);
                }}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer py-1 ${
                  isOledTheme ? 'text-[#7D858A] hover:text-[#00E5FF]' : 'text-slate-500 hover:text-blue-600'
                }`}
              >
                <Plus size={14} />
                <span>添加待办</span>
              </button>

              <span className={`text-[11px] ${isOledTheme ? 'text-white/40' : 'text-slate-400'}`}>
                当前日期自动置顶 · 已完成事项自动折叠
              </span>
            </div>

            {filteredTasks.length === 0 && (
              <div className={`py-14 px-4 flex flex-col items-center justify-center text-center rounded-3xl border border-dashed ${
                isOledTheme ? 'border-white/[0.08] bg-[#0C0F11]/40' : 'border-slate-200/80 bg-slate-50/40'
              } animate-fade-in my-2`}>
                <div className={`w-12 h-12 rounded-2xl ${
                  isOledTheme ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30' : 'bg-blue-50 text-[#0071E3] border border-blue-100/60'
                } flex items-center justify-center mb-3 shadow-2xs`}>
                  <Calendar size={22} strokeWidth={1.8} />
                </div>
                <div className={`text-sm font-bold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
                  {dateFilter === 'today'
                    ? '今日暂无待办事项'
                    : dateFilter === 'overdue'
                    ? '没有已到期或历史待办'
                    : dateFilter === 'future'
                    ? '未来暂无排期待办'
                    : '暂无符合条件的待办事项'}
                </div>
                <p className={`text-xs ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'} mt-1 max-w-sm leading-relaxed`}>
                  {dateFilter === 'today'
                    ? '今天所有任务已搞定，或点击下方按钮添加新待办 ✨'
                    : dateFilter === 'overdue'
                    ? '以往日期的待办均已处理完毕，保持得非常棒！🎉'
                    : dateFilter === 'future'
                    ? '随时添加后续工作规划与日程安排 📅'
                    : '可调整上方筛选条件或添加新待办开始规划工作'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTaskToEdit(null);
                    setIsModalOpen(true);
                  }}
                  className={`mt-4 px-4 py-2 rounded-xl ${
                    isOledTheme
                      ? 'bg-[#00E5FF] hover:bg-[#00cce6] text-[#050607]'
                      : 'bg-[#0071E3] hover:bg-[#0077ED] text-white'
                  } active:scale-95 text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5`}
                >
                  <Plus size={13} strokeWidth={2.2} />
                  <span>添加一条待办</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unified Add/Edit Todo Modal */}
      <AddTodoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        onConfirm={handleSaveTaskFromModal}
        initialDate={selectedDate}
      />

      {/* Complete Task Duration Modal */}
      <CompleteTaskModal
        isOpen={!!completingTask}
        task={completingTask}
        onClose={() => setCompletingTask(null)}
        onConfirm={handleConfirmCompleteWithDuration}
      />
    </section>
  );
};

export default TodoList;

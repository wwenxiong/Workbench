import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { 
  Search, 
  Bell, 
  Calendar as CalendarIcon, 
  ChevronDown, 
  MoreHorizontal, 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Circle, 
  Edit3, 
  CheckSquare, 
  FolderKanban, 
  FileText, 
  Box, 
  Layers, 
  Sparkles,
  Trash2,
  Repeat
} from 'lucide-react';
import type { Note, Task, RecurringConfig, LinkedFile } from '../../types';
import { api } from '../../services/api';
import { AddTodoModal } from '../Common/AddTodoModal';
import { AddNoteModal } from '../Common/AddNoteModal';
import { CompleteTaskModal } from '../Todo/CompleteTaskModal';
import { 
  formatLocalDate, 
  parseLocalDate, 
  formatChineseDate, 
  formatChineseDateShort, 
  addDays 
} from '../../utils/date';

interface MainDashboardProps {
  tasks: Task[];
  onToggleTask: (id: string, completed: boolean, extraUpdates?: Partial<Task>) => void;
  onAddTask: (taskData: { 
    title: string; 
    dueDate: string; 
    tags?: string[]; 
    priority?: string;
    isRecurring?: boolean;
    recurringConfig?: RecurringConfig;
  }) => Promise<void>;
  onUpdateTask?: (id: string, updates: Partial<Task>) => Promise<any>;
  onDeleteTask?: (id: string) => Promise<void>;
  selectedDate: string;
  onSelectDate?: (date: string) => void;
  focusHours: number;
  completedCount: number;
  totalNotes: number;
  notes?: Note[];
  onAddNote?: (note: Partial<Note>) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
  onViewAllNotes?: () => void;
  onViewAllFiles?: () => void;
}

const defaultDemoTasks = [
  { id: 't1', title: '完成产品需求文档评审', completed: false, time: '10:00', tag: '工作', dueDate: '', isRecurring: true },
  { id: 't2', title: '与设计团队同步界面方案', completed: false, time: '11:30', tag: '设计', dueDate: '', isRecurring: false },
  { id: 't3', title: '回复客户邮件并跟进反馈', completed: false, time: '14:00', tag: '沟通', dueDate: '', isRecurring: true },
  { id: 't4', title: '整理项目周报', completed: false, time: '16:00', tag: '周报', dueDate: '', isRecurring: false },
  { id: 't5', title: '阅读《深度工作》第3章', tag: '个人成长', completed: false, time: '20:00', dueDate: '', isRecurring: true },
];

const formatDateZh = (dStr: string) => formatChineseDate(dStr);

const formatDateShort = (dStr: string) => formatChineseDateShort(dStr);

const formatTaskTime = (dueDateStr: string, defaultTime = '14:00') => {
  if (!dueDateStr) return defaultTime;
  try {
    const today = formatLocalDate(new Date());
    const datePart = dueDateStr.slice(0, 10);
    
    let timePart = '';
    if (dueDateStr.includes('T')) {
      timePart = dueDateStr.split('T')[1]?.slice(0, 5);
    }

    if (datePart === today) {
      return timePart ? `${timePart}` : '今天';
    }

    const targetDate = parseLocalDate(datePart);
    const todayDate = parseLocalDate(today);
    const diffDays = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return timePart ? `明天 ${timePart}` : '明天';
    } else if (diffDays === -1) {
      return timePart ? `昨天 ${timePart}` : '昨天';
    } else {
      const monthDay = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
      return timePart ? `${monthDay} ${timePart}` : monthDay;
    }
  } catch {
    return defaultTime;
  }
};

export const MainDashboard: FC<MainDashboardProps> = ({
  tasks,
  onToggleTask,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  selectedDate,
  onSelectDate,
  notes = [],
  onAddNote,
  onDeleteNote,
  onViewAllNotes,
  onViewAllFiles,
}) => {
  const todayStr = formatLocalDate(new Date());
  
  // Modal States
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [todoFilter, setTodoFilter] = useState<'all' | 'today'>('all');
  const [noteFilter, setNoteFilter] = useState<string>('all');
  const [deletedDemoIds, setDeletedDemoIds] = useState<string[]>([]);
  const [quickNote, setQuickNote] = useState('');
  const [dashboardFiles, setDashboardFiles] = useState<LinkedFile[]>([]);

  useEffect(() => {
    api.getFiles()
      .then(res => setDashboardFiles(res.slice(0, 3)))
      .catch(() => {});
  }, []);

  // Handle Save Todo (handles both create and edit)
  const handleSaveTodo = async (todoData: {
    title: string;
    dueDate: string;
    tags?: string[];
    priority?: string;
    isRecurring?: boolean;
    recurringConfig?: any;
    id?: string;
  }) => {
    if (todoData.id && onUpdateTask) {
      await onUpdateTask(todoData.id, {
        title: todoData.title,
        dueDate: todoData.dueDate,
        tags: todoData.tags,
        priority: todoData.priority as any,
        isRecurring: todoData.isRecurring,
        recurringConfig: todoData.recurringConfig,
      });
    } else {
      await onAddTask({
        title: todoData.title,
        dueDate: todoData.dueDate,
        tags: todoData.tags,
        priority: todoData.priority,
        isRecurring: todoData.isRecurring,
        recurringConfig: todoData.recurringConfig,
      });
    }
    setTaskToEdit(null);
  };

  // Handle Task Completion with Duration
  const handleConfirmCompleteDuration = async (
    taskId: string,
    data: { completed: boolean; actualMinutes: number; timeSpan: string; startTime?: string; endTime?: string }
  ) => {
    if (onUpdateTask) {
      await onUpdateTask(taskId, {
        completed: true,
        completedAt: new Date().toISOString(),
        actualMinutes: data.actualMinutes,
        timeSpan: data.timeSpan,
        startTime: data.startTime,
        endTime: data.endTime,
      });
    } else {
      onToggleTask(taskId, true, {
        actualMinutes: data.actualMinutes,
        timeSpan: data.timeSpan,
        startTime: data.startTime,
        endTime: data.endTime,
      });
    }
    setCompletingTask(null);
  };

  // Handle Quick Note Submit on Enter
  const handleQuickNoteSubmit = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && quickNote.trim()) {
      if (onAddNote) {
        await onAddNote({
          type: 'note',
          content: quickNote.trim(),
          date: selectedDate || todayStr,
          tags: ['日常'],
        });
      }
      setQuickNote('');
    }
  };

  // Handle Delete Task Item
  const handleDeleteTaskItem = async (id: string) => {
    if (id.startsWith('t') && !tasks.some(t => t.id === id)) {
      setDeletedDemoIds(prev => [...prev, id]);
    } else if (onDeleteTask) {
      await onDeleteTask(id);
    }
  };

  // Determine tasks to display
  const rawList = tasks.length > 0 
    ? tasks
        .filter(t => !deletedDemoIds.includes(t.id))
        .map((t, idx) => ({
          id: t.id,
          title: t.title,
          completed: t.completed,
          time: formatTaskTime(t.dueDate, defaultDemoTasks[idx]?.time || '10:00'),
          tag: t.tags?.[0] || '待办',
          dueDate: t.dueDate,
          isRecurring: t.isRecurring,
        }))
    : defaultDemoTasks.filter(t => !deletedDemoIds.includes(t.id));

  const targetList = todoFilter === 'today'
    ? rawList.filter(t => !t.dueDate || t.dueDate.startsWith(todayStr))
    : rawList;

  const completedNum = targetList.filter(t => t.completed).length;
  const totalNum = targetList.length || 1;
  const progressPercent = Math.round((completedNum / totalNum) * 100);

  // 首页今日待办中不展示已完成的待办事项
  const displayTasks = targetList.filter(t => !t.completed);

  // Pure notes (工作日报已独立剥离至日报中心模块)
  const pureNotes = notes.filter(n => n.type !== 'daily_report');
  const displayNotes = pureNotes.filter(n => {
    if (noteFilter !== 'all' && n.type !== noteFilter) return false;
    return true;
  });

  // Navigate date
  const changeDateBy = (offset: number) => {
    if (!onSelectDate) return;
    onSelectDate(addDays(selectedDate || todayStr, offset));
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto px-8 py-6 custom-scrollbar select-none bg-[#F7F8FA]">
      {/* 1. Top Header Bar (Native Apple Restrained Quality) */}
      <div className="flex items-center justify-between gap-6 mb-6">
        {/* Search Bar with SF-style ⌘K badge */}
        <div className="flex-1 max-w-md relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#86868B]">
            <Search size={15} strokeWidth={1.75} />
          </div>
          <input
            type="text"
            placeholder="搜索任务、项目、文件或笔记……"
            className="block w-full pl-9 pr-14 py-2 text-xs rounded-full bg-white/70 backdrop-blur-md border border-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:bg-white placeholder-[#AEAEB2] text-[#1D1D1F] transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-[10px] font-semibold text-[#86868B] bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded-md font-mono">
              ⌘ K
            </span>
          </div>
        </div>

        {/* Right Info Section */}
        <div className="flex items-center gap-5">
          {/* Date Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-[#86868B] font-medium">
            <CalendarIcon size={14} strokeWidth={1.75} className="text-[#86868B]" />
            <span>{formatDateZh(selectedDate || todayStr)}</span>
          </div>

          {/* Notifications Bell */}
          <button 
            type="button"
            className="relative p-2 text-[#48484A] hover:text-[#1D1D1F] transition-colors rounded-full hover:bg-white/60 cursor-pointer"
            title="查看通知"
          >
            <Bell size={17} strokeWidth={1.75} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0071E3] rounded-full ring-2 ring-[#F7F8FA]"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2.5 cursor-pointer group pl-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white shadow-xs overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
                alt="Avatar" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span>张</span>
            </div>
            <span className="text-xs font-semibold text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors">
              张一鸣
            </span>
            <ChevronDown size={14} strokeWidth={1.75} className="text-[#86868B] group-hover:text-[#1D1D1F]" />
          </div>
        </div>
      </div>

      {/* 2. Hero Glass Card (Large Translucent Liquid Glass Surface) */}
      <div className="relative rounded-[28px] liquid-glass-hero p-8 mb-6 overflow-hidden flex items-center justify-between border border-white/95">
        {/* Left Typography */}
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#42A5F5] flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Sparkles size={20} strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1D1D1F] tracking-tight">
              个人工作台
            </h2>
          </div>
          <p className="text-sm font-semibold text-[#48484A] mt-1 tracking-tight">
            专注、记录与管理你的每一天
          </p>
          <p className="text-xs text-[#86868B] mt-2.5 font-medium tracking-wide">
            持续专注，积累点滴。
          </p>
        </div>

        {/* Right Optical Liquid Glass Geometry (Abstract, Subtle, Non-competing) */}
        <div className="absolute right-0 top-0 bottom-0 w-[420px] pointer-events-none flex items-center justify-end pr-10">
          <div className="relative w-72 h-48">
            {/* Primary Liquid Glass Sphere */}
            <div className="absolute right-10 top-4 w-32 h-32 rounded-full bg-gradient-to-br from-white/90 via-blue-100/40 to-slate-200/30 backdrop-blur-xl border border-white/90 shadow-[0_16px_40px_rgba(0,113,227,0.08),inset_0_4px_12px_rgba(255,255,255,1)]">
              <div className="absolute top-4 left-5 w-8 h-4 rounded-full bg-white/90 blur-[1px] transform -rotate-30"></div>
            </div>

            {/* Secondary Layered Optical Wave */}
            <div className="absolute right-0 top-0 w-80 h-44 bg-gradient-to-bl from-blue-200/20 via-sky-100/20 to-transparent rounded-[36px] blur-2xl transform rotate-6"></div>

            {/* Accent Refraction Ring */}
            <div className="absolute right-36 bottom-4 w-14 h-14 rounded-full bg-gradient-to-br from-white/95 via-sky-50/50 to-blue-200/30 backdrop-blur-md border border-white/90 shadow-[0_8px_20px_rgba(0,0,0,0.03),inset_0_2px_6px_rgba(255,255,255,0.9)]"></div>
          </div>
        </div>
      </div>

      {/* 3. Dashboard Professional 5-Card Grid (Strict 8px / 4px Spacing) */}
      <div className="grid grid-cols-3 gap-5 items-stretch pb-6">
        {/* CARD 1: 今日待办 (Col 1, Row 1) */}
        <div className="rounded-[24px] liquid-glass-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} strokeWidth={1.75} className="text-[#0071E3]" />
                <h3 className="text-sm font-bold text-[#1D1D1F]">今日待办</h3>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setTodoFilter('all')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    todoFilter === 'all' ? 'bg-white text-[#0071E3] shadow-xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  全部
                </button>
                <button
                  type="button"
                  onClick={() => setTodoFilter('today')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    todoFilter === 'today' ? 'bg-white text-[#0071E3] shadow-xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  今日
                </button>
              </div>
            </div>

            {/* Progress Bar & Counter (Apple Native Style) */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5 text-[11px]">
                <span className="text-[#86868B] font-medium">完成进度</span>
                <span className="font-semibold text-[#1D1D1F] font-mono">{completedNum} / {totalNum}</span>
              </div>
              <div className="w-full bg-slate-100/90 rounded-full h-1 overflow-hidden">
                <div 
                  className="bg-[#0071E3] h-1 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Todo Items List (Apple Checkbox UI) */}
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
              {displayTasks.length === 0 ? (
                <div className="text-center py-7 text-xs text-[#86868B] flex flex-col items-center gap-1">
                  {completedNum > 0 ? (
                    <>
                      <span className="text-emerald-600 font-semibold">待办已全部完成</span>
                      <span className="text-[11px] text-[#86868B]">已达成 {completedNum} 项事项，点击下方可添加新待办</span>
                    </>
                  ) : (
                    <span>当前暂无待办事项，点击下方添加</span>
                  )}
                </div>
              ) : (
                displayTasks.map((t) => (
                  <div 
                    key={t.id} 
                    className="flex items-center justify-between text-xs group py-1.5 hover:bg-white/90 px-2 -mx-1.5 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const fullTask = tasks.find(item => item.id === t.id);
                          if (fullTask && !fullTask.completed) {
                            setCompletingTask(fullTask);
                          } else {
                            onToggleTask(t.id, !t.completed);
                          }
                        }}
                        className="text-[#86868B] hover:text-[#0071E3] transition-colors flex-shrink-0 cursor-pointer"
                        title="标记完成"
                      >
                        <Circle size={15} strokeWidth={1.75} className="text-[#AEAEB2] hover:text-[#0071E3]" />
                      </button>
                      <span className="truncate font-medium text-[#1D1D1F]">
                        {t.title}
                      </span>
                      {t.isRecurring && (
                        <span title="每日固定循环任务" className="text-[#0071E3] shrink-0 inline-flex items-center">
                          <Repeat size={11} strokeWidth={2} />
                        </span>
                      )}
                      {t.tag && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#F0F6FF] text-[#0071E3] font-medium flex-shrink-0">
                          {t.tag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[11px] text-[#86868B] font-mono">{t.time}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const fullTask = tasks.find(item => item.id === t.id);
                          if (fullTask) {
                            setTaskToEdit(fullTask);
                            setIsTodoModalOpen(true);
                          }
                        }}
                        className="text-[#AEAEB2] hover:text-[#0071E3] hover:bg-blue-50 p-1 rounded-md transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="修改待办"
                      >
                        <Edit3 size={12} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTaskItem(t.id);
                        }}
                        className="text-[#AEAEB2] hover:text-rose-500 hover:bg-rose-50 p-1 rounded-md transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="删除该待办"
                      >
                        <Trash2 size={12} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Todo Button & Action Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100/90 flex items-center justify-between">
            <button 
              type="button"
              onClick={() => {
                setTaskToEdit(null);
                setIsTodoModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs text-[#86868B] hover:text-[#0071E3] font-medium transition-colors cursor-pointer py-1"
            >
              <Plus size={13} strokeWidth={2} />
              <span>添加待办</span>
            </button>

            {completedNum > 0 && (
              <span className="text-[11px] text-[#86868B] font-medium">
                已达成 <span className="text-emerald-600 font-semibold">{completedNum}</span> 项
              </span>
            )}
          </div>
        </div>

        {/* CARD 2: 快速记录 (Col 2, Row 1) */}
        <div className="rounded-[24px] liquid-glass-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={16} strokeWidth={1.75} className="text-[#0071E3]" />
                <h3 className="text-sm font-bold text-[#1D1D1F]">快速记录</h3>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setNoteFilter('all')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    noteFilter === 'all' ? 'bg-white text-[#0071E3] shadow-xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  全部
                </button>
                <button
                  type="button"
                  onClick={() => setNoteFilter('note')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    noteFilter === 'note' ? 'bg-white text-[#0071E3] shadow-xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  笔记
                </button>
                <button
                  type="button"
                  onClick={() => setNoteFilter('meeting')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    noteFilter === 'meeting' ? 'bg-white text-amber-600 shadow-xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  会议
                </button>
                <button
                  type="button"
                  onClick={() => setNoteFilter('idea')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    noteFilter === 'idea' ? 'bg-white text-purple-600 shadow-xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  灵感
                </button>
              </div>
            </div>

            {/* Input with Quick Add Button */}
            <div className="mb-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="随手记录你的想法……"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                onKeyDown={handleQuickNoteSubmit}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white/70 border border-slate-200/70 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:bg-white text-[#1D1D1F] placeholder-[#AEAEB2] transition-all"
              />
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(true)}
                className="p-2 rounded-xl bg-[#0071E3] hover:bg-blue-600 text-white shadow-xs transition-colors cursor-pointer"
                title="新建笔记"
              >
                <Plus size={13} strokeWidth={2} />
              </button>
            </div>

            {/* Note Cards List */}
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
              {displayNotes.length === 0 ? (
                <div className="text-center py-7 text-xs text-[#86868B]">
                  暂无记录，输入想法后按回车保存
                </div>
              ) : (
                displayNotes.map((n) => {
                  const isMeeting = n.type === 'meeting';
                  const isIdea = n.type === 'idea';
                  const badgeColor = isMeeting
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : isIdea
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-[#F0F6FF] text-[#0071E3] border-blue-200/60';
                  const label = isMeeting ? '会议纪要' : isIdea ? '灵感想法' : '随手笔记';

                  return (
                    <div 
                      key={n.id} 
                      className="p-3 rounded-2xl border border-slate-100/90 bg-white/80 hover:bg-white text-xs text-[#1D1D1F] flex flex-col justify-between group shadow-2xs transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-md border font-medium ${badgeColor}`}>
                              {label}
                            </span>
                            {n.title && (
                              <span className="font-bold text-[#1D1D1F] text-[11px] truncate">
                                {n.title}
                              </span>
                            )}
                          </div>
                          <p className="leading-relaxed line-clamp-2 text-[#48484A] font-normal">{n.content}</p>
                        </div>

                        {onDeleteNote && (
                          <button
                            type="button"
                            onClick={() => onDeleteNote(n.id)}
                            className="text-[#AEAEB2] hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                            title="删除记录"
                          >
                            <Trash2 size={12} strokeWidth={1.75} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#86868B] mt-2">
                        <span>{n.date} {n.time || ''}</span>
                        {n.tags?.[0] && <span>#{n.tags[0]}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-slate-100/90 flex items-center justify-between">
            <button 
              type="button"
              onClick={onViewAllNotes}
              className="flex items-center text-[11px] text-[#86868B] hover:text-[#0071E3] font-medium transition-colors cursor-pointer"
            >
              <span>查看全部笔记 ({pureNotes.length})</span>
              <ChevronRight size={13} strokeWidth={1.75} className="ml-0.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsNoteModalOpen(true)}
              className="flex items-center gap-1 text-[11px] text-[#0071E3] hover:underline font-semibold cursor-pointer"
            >
              <Plus size={12} strokeWidth={2} />
              <span>新建笔记</span>
            </button>
          </div>
        </div>

        {/* CARD 3: 日程安排 (Col 3, Row 1 & 2 -> Spans 2 Rows!) */}
        <div className="row-span-2 rounded-[24px] liquid-glass-card p-5 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} strokeWidth={1.75} className="text-[#0071E3]" />
                <h3 className="text-sm font-bold text-[#1D1D1F]">日程安排</h3>
              </div>
              <button className="text-[#86868B] hover:text-[#1D1D1F] p-1">
                <MoreHorizontal size={15} strokeWidth={1.75} />
              </button>
            </div>

            {/* Date Switcher Pill */}
            <div className="flex items-center justify-between bg-white/70 border border-slate-200/70 rounded-full px-3 py-1.5 mb-5 text-xs text-[#1D1D1F] font-semibold">
              <button 
                type="button"
                onClick={() => changeDateBy(-1)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-0.5 transition-colors cursor-pointer"
                title="前一天"
              >
                <ChevronLeft size={14} strokeWidth={1.75} />
              </button>
              <span className="tracking-tight text-[11px]">{formatDateShort(selectedDate || todayStr)}</span>
              <button 
                type="button"
                onClick={() => changeDateBy(1)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-0.5 transition-colors cursor-pointer"
                title="后一天"
              >
                <ChevronRight size={14} strokeWidth={1.75} />
              </button>
            </div>

            {/* Timeline Items (Native Minimal Hairline & Dots) */}
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200/80">
              {/* Event 1 */}
              <div className="relative group">
                <div className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-[#0071E3] ring-4 ring-blue-50"></div>
                <div className="text-[11px] font-semibold text-[#86868B] mb-1 font-mono">09:00</div>
                <div className="p-3 rounded-2xl bg-white/85 border border-slate-100 shadow-2xs transition-all hover:bg-white">
                  <div className="text-xs font-semibold text-[#1D1D1F]">产品需求评审会议</div>
                  <div className="text-[10px] text-[#86868B] mt-0.5">09:00 - 10:00 会议室 A</div>
                </div>
              </div>

              {/* Event 2 */}
              <div className="relative group">
                <div className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-slate-300"></div>
                <div className="text-[11px] font-semibold text-[#86868B] mb-1 font-mono">11:00</div>
                <div className="p-3 rounded-2xl bg-white/85 border border-slate-100 shadow-2xs transition-all hover:bg-white">
                  <div className="text-xs font-semibold text-[#1D1D1F]">与设计团队同步</div>
                  <div className="text-[10px] text-[#86868B] mt-0.5">11:00 - 12:00 会议室 B</div>
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative group">
                <div className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-slate-300"></div>
                <div className="text-[11px] font-semibold text-[#86868B] mb-1 font-mono">14:30</div>
                <div className="p-3 rounded-2xl bg-white/85 border border-slate-100 shadow-2xs transition-all hover:bg-white">
                  <div className="text-xs font-semibold text-[#1D1D1F]">客户沟通会</div>
                  <div className="text-[10px] text-[#86868B] mt-0.5">14:30 - 15:30 线上会议</div>
                </div>
              </div>

              {/* Event 4 */}
              <div className="relative group">
                <div className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-slate-300"></div>
                <div className="text-[11px] font-semibold text-[#86868B] mb-1 font-mono">16:00</div>
                <div className="p-3 rounded-2xl bg-white/85 border border-slate-100 shadow-2xs transition-all hover:bg-white">
                  <div className="text-xs font-semibold text-[#1D1D1F]">项目周会</div>
                  <div className="text-[10px] text-[#86868B] mt-0.5">16:00 - 17:00 会议室 A</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Link */}
          <div className="pt-4 border-t border-slate-100/90">
            <button 
              type="button"
              onClick={onViewAllNotes}
              className="flex items-center text-[11px] text-[#86868B] hover:text-[#0071E3] font-medium transition-colors cursor-pointer"
            >
              <span>查看全部日程</span>
              <ChevronRight size={13} strokeWidth={1.75} className="ml-0.5" />
            </button>
          </div>
        </div>

        {/* CARD 4: 项目进度 (Col 1, Row 2) */}
        <div className="rounded-[24px] liquid-glass-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderKanban size={16} strokeWidth={1.75} className="text-[#0071E3]" />
                <h3 className="text-sm font-bold text-[#1D1D1F]">项目进度</h3>
              </div>
              <button className="text-[#86868B] hover:text-[#1D1D1F] p-1">
                <MoreHorizontal size={15} strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Project 1 */}
              <div className="flex items-center justify-between gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50/80 flex items-center justify-center text-[#0071E3] flex-shrink-0">
                  <Box size={15} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#1D1D1F] truncate">个人工作台 2.0</div>
                  <div className="text-[10px] text-[#86868B]">产品迭代</div>
                </div>
                <div className="w-24">
                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden mb-1">
                    <div className="bg-[#0071E3] h-1 rounded-full" style={{ width: '68%' }}></div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[#1D1D1F] w-8 text-right font-mono">68%</span>
              </div>

              {/* Project 2 */}
              <div className="flex items-center justify-between gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50/80 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <Layers size={15} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#1D1D1F] truncate">营销活动设计</div>
                  <div className="text-[10px] text-[#86868B]">市场项目</div>
                </div>
                <div className="w-24">
                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden mb-1">
                    <div className="bg-emerald-500 h-1 rounded-full" style={{ width: '42%' }}></div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[#1D1D1F] w-8 text-right font-mono">42%</span>
              </div>

              {/* Project 3 */}
              <div className="flex items-center justify-between gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50/80 flex items-center justify-center text-purple-600 flex-shrink-0">
                  <Sparkles size={15} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#1D1D1F] truncate">团队知识库建设</div>
                  <div className="text-[10px] text-[#86868B]">内部工具</div>
                </div>
                <div className="w-24">
                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden mb-1">
                    <div className="bg-purple-600 h-1 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[#1D1D1F] w-8 text-right font-mono">75%</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100/90">
            <button 
              type="button"
              className="flex items-center text-[11px] text-[#86868B] hover:text-[#0071E3] font-medium transition-colors cursor-pointer"
            >
              <span>查看全部项目</span>
              <ChevronRight size={13} strokeWidth={1.75} className="ml-0.5" />
            </button>
          </div>
        </div>

        {/* CARD 5: 最近文件 / 最近动态 (Col 2, Row 2) */}
        <div className="rounded-[24px] liquid-glass-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText size={16} strokeWidth={1.75} className="text-[#0071E3]" />
                <h3 className="text-sm font-bold text-[#1D1D1F]">最近文件</h3>
              </div>
              <button className="text-[#86868B] hover:text-[#1D1D1F] p-1">
                <MoreHorizontal size={15} strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {dashboardFiles.length > 0 ? (
                dashboardFiles.map((f) => {
                  const ext = (f.fileType || 'file').toUpperCase();
                  const badgeColor = ext.includes('XLS') ? 'bg-emerald-50 text-emerald-700 border-emerald-100/80' :
                                    ext.includes('DOC') ? 'bg-blue-50 text-[#0071E3] border-blue-100/80' :
                                    ext.includes('PDF') ? 'bg-rose-50 text-rose-700 border-rose-100/80' :
                                    ext.includes('JSON') || ext.includes('MD') ? 'bg-indigo-50 text-indigo-700 border-indigo-100/80' :
                                    'bg-slate-50 text-slate-700 border-slate-200/80';
                  return (
                    <div 
                      key={f.id} 
                      onClick={async () => {
                        try {
                          await api.openFile(f.filePath, f.id);
                        } catch (err: any) {
                          console.error(err);
                        }
                      }}
                      className="flex items-center gap-3 group cursor-pointer"
                    >
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-[9px] font-extrabold tracking-tight flex-shrink-0 ${badgeColor}`}>
                        {ext.slice(0, 5)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#1D1D1F] truncate group-hover:text-[#0071E3] transition-colors">
                          {f.name}
                        </div>
                        <div className="text-[10px] text-[#86868B] mt-0.5">
                          {f.category || '本地文件'} · 点击快速打开
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  {/* File 1 */}
                  <div className="flex items-center gap-3 group cursor-pointer" onClick={onViewAllFiles}>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-[#0071E3] text-[9px] font-extrabold tracking-tight flex-shrink-0">
                      DOCX
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#1D1D1F] truncate group-hover:text-[#0071E3] transition-colors">
                        产品需求文档 v1.3
                      </div>
                      <div className="text-[10px] text-[#86868B] mt-0.5">文档 · 点击进入文件中心</div>
                    </div>
                  </div>

                  {/* File 2 */}
                  <div className="flex items-center gap-3 group cursor-pointer" onClick={onViewAllFiles}>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-700 text-[9px] font-extrabold tracking-tight flex-shrink-0">
                      SKETCH
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#1D1D1F] truncate group-hover:text-[#0071E3] transition-colors">
                        工作台界面设计稿
                      </div>
                      <div className="text-[10px] text-[#86868B] mt-0.5">设计稿 · 点击进入文件中心</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100/90">
            <button 
              type="button"
              onClick={onViewAllFiles}
              className="flex items-center text-[11px] text-[#86868B] hover:text-[#0071E3] font-medium transition-colors cursor-pointer"
            >
              <span>查看全部文件</span>
              <ChevronRight size={13} strokeWidth={1.75} className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* POPUP MODAL 1: 新建/修改待办事项对话框 */}
      <AddTodoModal
        isOpen={isTodoModalOpen}
        onClose={() => {
          setIsTodoModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        onConfirm={handleSaveTodo}
        initialDate={selectedDate || todayStr}
      />

      {/* POPUP MODAL 1.5: 任务完成记录耗时对话框 */}
      <CompleteTaskModal
        isOpen={!!completingTask}
        task={completingTask}
        onClose={() => setCompletingTask(null)}
        onConfirm={handleConfirmCompleteDuration}
      />

      {/* POPUP MODAL 2: 新建快速笔记/记录对话框 (工作日报已独立剥离) */}
      <AddNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onConfirm={async (noteData) => {
          if (onAddNote) await onAddNote(noteData);
        }}
        initialDate={selectedDate || todayStr}
        initialType="note"
        allowedTypes={['note', 'meeting', 'idea', 'retrospective']}
      />
    </div>
  );
};

export default MainDashboard;

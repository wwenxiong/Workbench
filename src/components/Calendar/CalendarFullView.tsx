import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowRight,
  Plus,
  Edit3,
  CheckCircle2,
  Square,
  Trash2,
  Briefcase,
  Bookmark
} from 'lucide-react';
import type { CalendarDaySummary, DailyReport, Note, Task, DateMemo } from '../../types';
import { api } from '../../services/api';
import { AddNoteModal } from '../Common/AddNoteModal';
import { AddTodoModal } from '../Common/AddTodoModal';
import { formatLocalDate, formatChineseDate } from '../../utils/date';
import { getLunarInfo } from '../../utils/lunar';
import { useTheme } from '../../contexts/ThemeContext';

interface CalendarFullViewProps {
  calendarSummaries: Record<string, CalendarDaySummary>;
  tasks?: Task[];
  onAddTask?: (taskData: {
    title: string;
    dueDate: string;
    tags?: string[];
    priority?: string;
    isRecurring?: boolean;
    recurringConfig?: any;
    id?: string;
  }) => Promise<void>;
  onToggleTask?: (id: string, completed: boolean, extraUpdates?: Partial<Task>) => void;
  onDeleteTask?: (id: string) => void;
  onSelectDateForDashboard: (date: string) => void;
  onRefreshSummaries?: () => void;
}

export const CalendarFullView: React.FC<CalendarFullViewProps> = ({
  calendarSummaries,
  tasks = [],
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onSelectDateForDashboard,
  onRefreshSummaries,
}) => {
  const { isOledTheme } = useTheme();
  const todayStr = formatLocalDate(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeDate, setActiveDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<'memos' | 'report' | 'tasks'>('memos');
  const [dayReport, setDayReport] = useState<DailyReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);

  // Dedicated Date Memos State
  const [memos, setMemos] = useState<DateMemo[]>([]);
  const [newMemoContent, setNewMemoContent] = useState('');
  const [newMemoTime, setNewMemoTime] = useState('全天');
  const [isAddingMemo, setIsAddingMemo] = useState(false);

  // Load Day Daily Report
  const loadDayDetail = useCallback(async (date: string) => {
    setIsLoadingReport(true);
    try {
      const rep = await api.getDailyReport(date);
      setDayReport(rep);
    } catch (e) {
      console.warn('Failed to load day report:', e);
    } finally {
      setIsLoadingReport(false);
    }
  }, []);

  // Load All Date Memos
  const loadMemos = useCallback(async () => {
    try {
      const memoList = await api.getMemos();
      setMemos(memoList);
    } catch (e) {
      console.warn('Failed to load memos:', e);
    }
  }, []);

  useEffect(() => {
    loadDayDetail(activeDate);
  }, [activeDate, loadDayDetail]);

  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  // Synchronize when reports or notes are updated/deleted elsewhere
  useEffect(() => {
    const handleSync = (e: any) => {
      const payload = e.detail;
      if (!payload || payload.entity === 'reports' || payload.entity === 'notes') {
        loadDayDetail(activeDate);
        if (onRefreshSummaries) onRefreshSummaries();
      }
    };
    window.addEventListener('workbench:sync', handleSync);
    return () => window.removeEventListener('workbench:sync', handleSync);
  }, [activeDate, loadDayDetail, onRefreshSummaries]);

  const handleDeleteDayReport = async () => {
    if (!window.confirm(`确定删除 ${activeDate} 的工作日报吗？`)) return;
    try {
      await api.deleteDailyReport(activeDate);
      await loadDayDetail(activeDate);
      if (onRefreshSummaries) onRefreshSummaries();
    } catch (e) {
      console.error('Failed to delete day report:', e);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // In Chinese / ISO work calendars, week starts on Monday (周一):
  const firstDayOfWeek = firstDay.getDay();
  const prevMonthDays = (firstDayOfWeek + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const gridDays: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDate - i;
    const d = new Date(year, month - 1, dayNum);
    gridDays.push({
      dateStr: formatLocalDate(d),
      dayNum,
      isCurrentMonth: false,
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    gridDays.push({
      dateStr: formatLocalDate(d),
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  const totalCells = gridDays.length <= 35 ? 35 : 42;
  const remaining = totalCells - gridDays.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    gridDays.push({
      dateStr: formatLocalDate(d),
      dayNum: i,
      isCurrentMonth: false,
    });
  }

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const handleSaveReportFromModal = async (noteData: Partial<Note>) => {
    await api.createNote(noteData);
    await loadDayDetail(activeDate);
    if (onRefreshSummaries) onRefreshSummaries();
  };

  // Memos specifically for activeDate
  const activeDayMemos = useMemo(() => {
    return memos.filter((m) => m.date === activeDate);
  }, [memos, activeDate]);

  const completedMemosCount = useMemo(() => {
    return activeDayMemos.filter((m) => m.completed).length;
  }, [activeDayMemos]);

  // Handle Adding a Date Memo (100% separate from work tasks)
  const handleAddMemoSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMemoContent.trim()) return;

    try {
      setIsAddingMemo(true);
      const created = await api.createMemo({
        date: activeDate,
        time: newMemoTime || '全天',
        content: newMemoContent.trim(),
        completed: false,
      });
      setMemos((prev) => [created, ...prev]);
      setNewMemoContent('');
    } catch (err) {
      console.error('Failed to add memo:', err);
    } finally {
      setIsAddingMemo(false);
    }
  };

  // Handle Toggling a Date Memo
  const handleToggleMemo = async (memo: DateMemo) => {
    try {
      const updated = await api.updateMemo(memo.id, { completed: !memo.completed });
      setMemos((prev) => prev.map((m) => (m.id === memo.id ? updated : m)));
    } catch (err) {
      console.error('Failed to toggle memo:', err);
    }
  };

  // Handle Deleting a Date Memo
  const handleDeleteMemo = async (id: string) => {
    try {
      await api.deleteMemo(id);
      setMemos((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Failed to delete memo:', err);
    }
  };

  // Work tasks for activeDate (from work dashboard)
  const activeDayTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate && t.dueDate.startsWith(activeDate));
  }, [tasks, activeDate]);

  const completedTasksCount = useMemo(() => {
    return activeDayTasks.filter((t) => t.completed).length;
  }, [activeDayTasks]);

  const activeLunar = useMemo(() => {
    return getLunarInfo(activeDate);
  }, [activeDate]);

  const hasActiveReport = !!(
    dayReport &&
    dayReport.isExisting &&
    (dayReport.deliverables || dayReport.tomorrowPlan || dayReport.customNotes)
  );

  return (
    <div className={`flex flex-col h-full ${isOledTheme ? 'bg-[#050607] text-[#F2F5F5]' : 'bg-[#F7F8FA]'} p-7 overflow-hidden select-none`}>
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs ${
            isOledTheme
              ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
              : 'bg-gradient-to-tr from-[#0071E3] to-[#42A5F5] text-white shadow-blue-500/20'
          }`}>
            <CalendarIcon size={18} strokeWidth={1.75} />
          </div>
          <div>
            <h1 className={`text-lg font-extrabold tracking-tight ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-[#1D1D1F]'}`}>
              日程管理
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className={`hidden md:flex items-center gap-3.5 px-3.5 py-1.5 rounded-2xl text-[11px] shadow-2xs border ${
            isOledTheme
              ? 'bg-[#111417] border-white/[0.08] text-[#7D858A]'
              : 'bg-white/75 backdrop-blur-md border-white/90 text-[#48484A]'
          }`}>
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-rose-500 text-white leading-none">休</span>
              <span>法定节假日</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-amber-500 text-white leading-none">班</span>
              <span>调休补班</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#B7FF3C]" />
              <span>有工作日报</span>
            </div>
          </div>

          {/* Month Switcher */}
          <div className={`flex items-center gap-1 rounded-2xl p-1 shadow-2xs border ${
            isOledTheme ? 'bg-[#111417] border-white/[0.08]' : 'bg-white/75 backdrop-blur-md border-white/90'
          }`}>
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5] hover:bg-white/5' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-slate-100'
              }`}
              title="上一月"
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
            </button>
            <span className={`px-3 text-xs font-bold font-mono ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
              {year}年 {month + 1}月
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5] hover:bg-white/5' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-slate-100'
              }`}
              title="下一月"
            >
              <ChevronRight size={16} strokeWidth={1.75} />
            </button>
          </div>

          {/* Back to Today Button */}
          <button
            type="button"
            onClick={() => {
              setCurrentDate(new Date());
              setActiveDate(todayStr);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-2xl transition-colors cursor-pointer border ${
              isOledTheme
                ? 'text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border-[#00E5FF]/30'
                : 'text-[#0071E3] bg-blue-50/80 hover:bg-blue-100/80 border-blue-200/50'
            }`}
          >
            返回今天
          </button>
        </div>
      </div>

      {/* 2. Main 2-Col Split Grid */}
      <div className="flex-1 grid grid-cols-12 gap-5 min-h-0">
        {/* Left 7 cols: Calendar Month Grid */}
        <div className={`col-span-7 liquid-glass-card p-5 rounded-[28px] flex flex-col ${
          isOledTheme ? 'bg-[#080A0C] border-white/[0.08]' : ''
        }`}>
          {/* Weekday headers */}
          <div className={`grid grid-cols-7 mb-2 text-center text-xs font-semibold ${
            isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'
          }`}>
            <div>周一</div>
            <div>周二</div>
            <div>周三</div>
            <div>周四</div>
            <div>周五</div>
            <div className={isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'}>周六</div>
            <div className={isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'}>周日</div>
          </div>

          {/* Day Cells */}
          <div className="flex-1 grid grid-cols-7 gap-2 min-h-0">
            {gridDays.map((item) => {
              const summary = calendarSummaries[item.dateStr];
              const isSelected = item.dateStr === activeDate;
              const isToday = item.dateStr === todayStr;
              const status = summary?.status;
              const hasReport = !!summary?.hasReport;
              
              // Calculate lunar & holiday info
              const lunar = getLunarInfo(item.dateStr);

              // Day memos count
              const dayMemosCount = memos.filter((m) => m.date === item.dateStr).length;

              // Day tasks count from work task store
              const cellTasks = tasks.filter(t => t.dueDate && t.dueDate.startsWith(item.dateStr));
              const taskCount = cellTasks.length;

              return (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => setActiveDate(item.dateStr)}
                  className={`flex flex-col justify-between p-2 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? isOledTheme
                        ? 'border-[#00E5FF] bg-[#00E5FF]/15 ring-2 ring-[#00E5FF]/30 shadow-xs'
                        : 'border-[#0071E3] bg-[#0071E3]/10 ring-2 ring-[#0071E3]/20 shadow-xs'
                      : isToday
                      ? isOledTheme
                        ? 'border-[#00E5FF]/40 bg-[#111417] ring-1 ring-[#00E5FF]/20 shadow-2xs'
                        : 'border-blue-300 bg-white/95 ring-1 ring-blue-200 shadow-2xs'
                      : item.isCurrentMonth
                      ? isOledTheme
                        ? 'border-white/[0.06] bg-[#0C0F11] hover:bg-[#111417] hover:border-white/[0.12] shadow-2xs'
                        : 'border-white/80 bg-white/75 hover:bg-white hover:border-slate-200 shadow-2xs'
                      : isOledTheme
                      ? 'border-transparent bg-white/[0.02] opacity-30'
                      : 'border-transparent bg-slate-100/40 opacity-40'
                  }`}
                >
                  {/* Top Row: Day Number & Badges */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold font-mono ${
                        isToday
                          ? isOledTheme
                            ? 'w-5 h-5 rounded-full bg-[#00E5FF] text-[#050607] flex items-center justify-center font-bold shadow-xs'
                            : 'w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center shadow-xs'
                          : isSelected
                          ? isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'
                          : item.isCurrentMonth
                          ? isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'
                          : isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'
                      }`}
                    >
                      {item.dayNum}
                    </span>

                    {/* Holiday badge / Status dot */}
                    <div className="flex items-center gap-1">
                      {lunar.holidayStatus === 'rest' && (
                        <span className="px-1 py-0.2 text-[9px] font-extrabold rounded bg-rose-500 text-white leading-none shadow-2xs">
                          休
                        </span>
                      )}
                      {lunar.holidayStatus === 'work' && (
                        <span className="px-1 py-0.2 text-[9px] font-extrabold rounded bg-amber-500 text-white leading-none shadow-2xs">
                          班
                        </span>
                      )}
                      {hasReport && (
                        <span title="该日已有关联工作日报">
                          <FileText size={10} strokeWidth={2} className="text-emerald-600" />
                        </span>
                      )}
                      {status && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            status === 'green'
                              ? 'bg-emerald-500'
                              : status === 'yellow'
                              ? 'bg-amber-400'
                              : status === 'red'
                              ? 'bg-rose-500'
                              : 'bg-slate-300'
                          }`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Middle: Lunar Day / Festival / Solar Term */}
                  <div className="my-0.5">
                    <span
                      className={`text-[10px] leading-tight truncate block ${
                        lunar.isFestival
                          ? 'text-rose-600 font-bold'
                          : lunar.term
                          ? 'text-[#0071E3] font-semibold'
                          : item.isCurrentMonth
                          ? 'text-[#86868B]'
                          : 'text-[#AEAEB2]'
                      }`}
                      title={lunar.fullLunarString}
                    >
                      {lunar.displayText}
                    </span>
                  </div>

                  {/* Bottom: Memo Count or Task Count */}
                  <div className="mt-auto">
                    {dayMemosCount > 0 ? (
                      <div className="text-[9px] text-[#0071E3] font-medium leading-tight truncate flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-[#0071E3]" />
                        <span>{dayMemosCount} 备忘</span>
                      </div>
                    ) : taskCount > 0 ? (
                      <div className="text-[9px] text-[#86868B] font-mono leading-tight truncate flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-400" />
                        <span>{taskCount} 待办</span>
                      </div>
                    ) : (
                      <div className="h-3"></div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 5 cols: Day Inspector (Liquid Glass Panel) */}
        <div className={`col-span-5 liquid-glass-card p-5 rounded-[28px] flex flex-col overflow-y-auto custom-scrollbar ${
          isOledTheme ? 'bg-[#080A0C] border-white/[0.08]' : ''
        }`}>
          {/* Header Card */}
          <div className={`pb-3 border-b mb-3.5 ${isOledTheme ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-base font-bold ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-[#1D1D1F]'}`}>
                  {formatChineseDate(activeDate)}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className={`text-xs font-medium ${isOledTheme ? 'text-[#7D858A]' : 'text-[#48484A]'}`}>
                    农历 {activeLunar.fullLunarString}
                  </span>
                  {activeLunar.holidayName && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      activeLunar.holidayStatus === 'rest' 
                        ? isOledTheme ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-rose-50 text-rose-600 border border-rose-200' 
                        : isOledTheme ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {activeLunar.holidayStatus === 'rest' ? '法定节假日' : '调休工作日'} · {activeLunar.holidayName}
                    </span>
                  )}
                  {activeLunar.term && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                      isOledTheme ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/40' : 'bg-blue-50 text-[#0071E3] border border-blue-200'
                    }`}>
                      节气 · {activeLunar.term}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectDateForDashboard(activeDate)}
                className={`flex items-center gap-1 text-xs hover:underline font-semibold cursor-pointer shrink-0 ${
                  isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'
                }`}
              >
                <span>工作台</span>
                <ArrowRight size={13} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* 3-Tab Switcher: 日程备忘 vs 工作日报 vs 工作待办 */}
          <div className={`flex rounded-xl p-1 mb-3.5 border ${
            isOledTheme ? 'bg-[#111417] border-white/[0.08]' : 'bg-slate-100/80 border-slate-200/60'
          }`}>
            {/* Tab 1: 日程备忘 */}
            <button
              type="button"
              onClick={() => setActiveTab('memos')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'memos'
                  ? isOledTheme ? 'bg-[#00E5FF] text-[#050607] shadow-xs font-bold' : 'bg-white text-[#0071E3] shadow-xs font-bold'
                  : isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5]' : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
              title="个人备忘、日程提醒与随手记录（不计入工作日报成果）"
            >
              <Bookmark size={13} strokeWidth={2} />
              <span>日程备忘 ({activeDayMemos.length})</span>
            </button>

            {/* Tab 2: 工作日报 */}
            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'report'
                  ? isOledTheme ? 'bg-[#00E5FF] text-[#050607] shadow-xs font-bold' : 'bg-white text-[#0071E3] shadow-xs font-bold'
                  : isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5]' : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
              title="工作日报、已交付成果与明日推进计划"
            >
              <FileText size={13} strokeWidth={2} />
              <span>工作日报</span>
              {hasActiveReport && <span className="w-1.5 h-1.5 rounded-full bg-[#B7FF3C] ml-0.5" />}
            </button>

            {/* Tab 3: 工作待办 */}
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'tasks'
                  ? isOledTheme ? 'bg-[#00E5FF] text-[#050607] shadow-xs font-bold' : 'bg-white text-[#0071E3] shadow-xs font-bold'
                  : isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5]' : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
              title="待办事项"
            >
              <Briefcase size={13} strokeWidth={2} />
              <span>待办 ({activeDayTasks.length})</span>
            </button>
          </div>

          {/* ================= Tab 1: 日程备忘 ================= */}
          {activeTab === 'memos' && (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xs font-bold flex items-center gap-1.5 ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
                    <Bookmark size={14} strokeWidth={2} className={isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'} />
                    <span>备忘 ({completedMemosCount}/{activeDayMemos.length})</span>
                  </h3>
                  <p className={`text-[10px] ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'} mt-0.5`}>
                    记录个人提醒与备忘
                  </p>
                </div>
              </div>

              {/* Quick Add Memo Input Form */}
              <form onSubmit={handleAddMemoSubmit} className={`flex items-center gap-2 p-2 rounded-2xl border ${
                isOledTheme ? 'bg-[#111417] border-white/[0.08]' : 'bg-white/90 border-slate-200/80 shadow-2xs'
              }`}>
                <input
                  type="text"
                  placeholder="添加一条备忘..."
                  value={newMemoContent}
                  onChange={(e) => setNewMemoContent(e.target.value)}
                  className={`flex-1 px-2.5 py-1.5 text-xs bg-transparent focus:outline-none ${
                    isOledTheme ? 'text-[#F2F5F5] placeholder-[#7D858A]' : 'text-[#1D1D1F] placeholder-slate-400'
                  }`}
                />
                <select
                  value={newMemoTime}
                  onChange={(e) => setNewMemoTime(e.target.value)}
                  className={`text-[11px] font-mono px-2 py-1.5 rounded-xl border focus:outline-none cursor-pointer ${
                    isOledTheme ? 'bg-[#0C0F11] border-white/[0.1] text-[#F2F5F5]' : 'bg-slate-100 border-slate-200 text-[#48484A]'
                  }`}
                >
                  <option value="全天">全天</option>
                  <option value="09:00">09:00</option>
                  <option value="10:00">10:00</option>
                  <option value="11:00">11:00</option>
                  <option value="14:00">14:00</option>
                  <option value="15:00">15:00</option>
                  <option value="16:00">16:00</option>
                  <option value="17:00">17:00</option>
                  <option value="18:00">18:00</option>
                  <option value="20:00">20:00</option>
                </select>
                <button
                  type="submit"
                  disabled={isAddingMemo || !newMemoContent.trim()}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer shrink-0 ${
                    isOledTheme
                      ? 'text-[#050607] bg-[#00E5FF] hover:bg-[#00cce6]'
                      : 'text-white bg-[#0071E3] hover:bg-blue-600'
                  }`}
                >
                  添加
                </button>
              </form>

              {/* Memos List */}
              {activeDayMemos.length > 0 ? (
                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
                  {activeDayMemos.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-2.5 ${
                        m.completed
                          ? isOledTheme ? 'bg-[#080A0C]/50 border-white/[0.04] opacity-50' : 'bg-slate-50/70 border-slate-200/60 opacity-60'
                          : isOledTheme ? 'bg-[#0C0F11] border-white/[0.08] hover:border-[#00E5FF]/40' : 'bg-white border-slate-100 shadow-2xs hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleMemo(m)}
                          className={`mt-0.5 transition-colors cursor-pointer ${
                            isOledTheme ? 'text-[#7D858A] hover:text-[#00E5FF]' : 'text-[#86868B] hover:text-[#0071E3]'
                          }`}
                          title={m.completed ? '标记为未完成' : '标记为已完成'}
                        >
                          {m.completed ? (
                            <CheckCircle2 size={16} strokeWidth={2} className={isOledTheme ? 'text-[#B7FF3C]' : 'text-emerald-500'} />
                          ) : (
                            <Square size={16} strokeWidth={1.75} />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                              isOledTheme ? 'bg-[#00E5FF]/10 text-[#00E5FF]' : 'bg-blue-50 text-[#0071E3]'
                            }`}>
                              {m.time || '全天'}
                            </span>
                            <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded ${
                              isOledTheme ? 'bg-white/5 text-[#7D858A]' : 'bg-slate-100 text-[#86868B]'
                            }`}>
                              备忘
                            </span>
                          </div>
                          <p className={`text-xs leading-relaxed whitespace-pre-wrap ${
                            m.completed 
                              ? isOledTheme ? 'line-through text-[#52595E]' : 'line-through text-[#86868B]'
                              : isOledTheme ? 'text-[#F2F5F5] font-medium' : 'text-[#1D1D1F] font-medium'
                          }`}>
                            {m.content}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteMemo(m.id)}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          isOledTheme ? 'text-white/20 hover:text-rose-400' : 'text-slate-300 hover:text-rose-500'
                        }`}
                        title="删除该备忘"
                      >
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`flex-1 border border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center ${
                  isOledTheme ? 'border-white/[0.08] bg-[#0C0F11]/30' : 'border-slate-200'
                }`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-2 ${
                    isOledTheme ? 'bg-[#00E5FF]/10 text-[#00E5FF]' : 'bg-blue-50 text-[#0071E3]'
                  }`}>
                    <Bookmark size={18} strokeWidth={1.75} />
                  </div>
                  <p className={`text-xs mb-1 ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>暂无备忘</p>
                  <p className={`text-[11px] ${isOledTheme ? 'text-white/30' : 'text-[#AEAEB2]'}`}>在上方输入后回车保存</p>
                </div>
              )}
            </div>
          )}

          {/* ================= Tab 2: 工作日报 ================= */}
          {activeTab === 'report' && (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xs font-bold flex items-center gap-1.5 ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
                    <FileText size={14} strokeWidth={2} className={isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'} />
                    <span>工作日报</span>
                  </h3>
                  <p className={`text-[10px] ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'} mt-0.5`}>
                    当天完成的工作与用时
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl font-semibold transition-colors cursor-pointer border ${
                      isOledTheme
                        ? 'text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border-[#00E5FF]/30'
                        : 'text-[#0071E3] hover:text-blue-700 bg-blue-50/80 border-blue-200/50'
                    }`}
                  >
                    {hasActiveReport ? <Edit3 size={12} strokeWidth={2} /> : <Plus size={12} strokeWidth={2} />}
                    <span>{hasActiveReport ? '编辑' : '新建日报'}</span>
                  </button>
                  {hasActiveReport && (
                    <button
                      type="button"
                      onClick={handleDeleteDayReport}
                      className={`p-1 rounded-lg transition-colors cursor-pointer ${
                        isOledTheme ? 'text-white/30 hover:text-rose-400' : 'text-slate-300 hover:text-rose-500'
                      }`}
                      title="删除该日工作日报"
                    >
                      <Trash2 size={13} strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              </div>

              {isLoadingReport ? (
                <div className={`flex-1 flex items-center justify-center py-10 text-xs ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>
                  加载中...
                </div>
              ) : hasActiveReport ? (
                <div className={`flex flex-col gap-3 p-4 rounded-2xl border text-xs overflow-y-auto custom-scrollbar flex-1 ${
                  isOledTheme ? 'bg-[#0C0F11] border-white/[0.08]' : 'bg-white/80 border-slate-100'
                }`}>
                  {dayReport?.deliverables && (
                    <div>
                      <span className={`font-semibold block mb-1 ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>今日工作：</span>
                      <p className={`whitespace-pre-line leading-relaxed pl-2 border-l-2 border-[#B7FF3C] ${isOledTheme ? 'text-[#AEB7BA]' : 'text-[#48484A]'}`}>
                        {dayReport.deliverables}
                      </p>
                    </div>
                  )}
                  {dayReport?.blockers && dayReport.blockers !== '无' && (
                    <div>
                      <span className="font-semibold text-rose-400 block mb-1">遇到问题：</span>
                      <p className={`whitespace-pre-line leading-relaxed pl-2 border-l-2 border-rose-500/60 ${isOledTheme ? 'text-[#AEB7BA]' : 'text-[#48484A]'}`}>
                        {dayReport.blockers}
                      </p>
                    </div>
                  )}
                  {dayReport?.tomorrowPlan && (
                    <div>
                      <span className={`font-semibold block mb-1 ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>明日计划：</span>
                      <p className={`whitespace-pre-line leading-relaxed pl-2 border-l-2 ${isOledTheme ? 'border-[#00E5FF] text-[#AEB7BA]' : 'border-[#0071E3] text-[#48484A]'}`}>
                        {dayReport.tomorrowPlan}
                      </p>
                    </div>
                  )}
                  {dayReport?.customNotes && (
                    <div>
                      <span className={`font-semibold block mb-1 ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>备注：</span>
                      <p className={`whitespace-pre-line leading-relaxed ${isOledTheme ? 'text-[#AEB7BA]' : 'text-[#48484A]'}`}>
                        {dayReport.customNotes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`flex-1 border border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center ${
                  isOledTheme ? 'border-white/[0.08] bg-[#0C0F11]/30' : 'border-slate-200'
                }`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-2 ${
                    isOledTheme ? 'bg-white/5 text-[#7D858A]' : 'bg-slate-100 text-[#86868B]'
                  }`}>
                    <FileText size={18} strokeWidth={1.75} />
                  </div>
                  <p className={`text-xs mb-2 ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>暂无日报</p>
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer ${
                      isOledTheme ? 'text-[#050607] bg-[#00E5FF] hover:bg-[#00cce6]' : 'text-white bg-[#0071E3] hover:bg-blue-600'
                    }`}
                  >
                    写日报
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= Tab 3: 工作待办 ================= */}
          {activeTab === 'tasks' && (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xs font-bold flex items-center gap-1.5 ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
                    <Briefcase size={14} strokeWidth={2} className={isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'} />
                    <span>待办事项 ({completedTasksCount}/{activeDayTasks.length})</span>
                  </h3>
                  <p className={`text-[10px] mt-0.5 ${isOledTheme ? 'text-[#B7FF3C]' : 'text-emerald-700'}`}>
                    完成的任务会自动记入日报
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTodoModalOpen(true)}
                  className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl font-semibold transition-all cursor-pointer border ${
                    isOledTheme ? 'text-[#00E5FF] bg-[#00E5FF]/10 border-[#00E5FF]/30' : 'text-[#0071E3] bg-blue-50 hover:bg-blue-100 border-blue-200/60'
                  }`}
                >
                  <Plus size={12} strokeWidth={2} />
                  <span>新建待办</span>
                </button>
              </div>

              {activeDayTasks.length > 0 ? (
                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
                  {activeDayTasks.map((t, tIdx) => {
                    const timePart = t.dueDate && t.dueDate.includes('T') ? t.dueDate.split('T')[1].slice(0, 5) : '全天';
                    const cleanTitle = t.title.replace(/^\s*\d+[\.、\s\-]\s*/, '').trim() || t.title;
                    const displayTitle = `${tIdx + 1}. ${cleanTitle}`;

                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-2.5 ${
                          t.completed 
                            ? isOledTheme ? 'bg-[#080A0C]/50 border-white/[0.04] opacity-50' : 'bg-slate-50/70 border-slate-200/60 opacity-60'
                            : isOledTheme ? 'bg-[#0C0F11] border-white/[0.08] hover:border-[#00E5FF]/40' : 'bg-white border-slate-100 shadow-2xs hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => onToggleTask && onToggleTask(t.id, !t.completed)}
                            className="mt-0.5 text-[#86868B] hover:text-[#0071E3] transition-colors cursor-pointer"
                          >
                            {t.completed ? (
                              <CheckCircle2 size={16} strokeWidth={2} className="text-emerald-500" />
                            ) : (
                              <Square size={16} strokeWidth={1.75} />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-[#86868B]">
                                {timePart}
                              </span>
                              {t.priority && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  t.priority === 'p1' ? 'bg-rose-50 text-rose-600' :
                                  t.priority === 'p2' ? 'bg-amber-50 text-amber-600' :
                                  t.priority === 'p3' ? 'bg-blue-50 text-[#0071E3]' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {t.priority.toUpperCase()}
                                </span>
                              )}
                              {t.tags && t.tags[0] && (
                                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-blue-50 text-[#0071E3]">
                                  {t.tags[0]}
                                </span>
                              )}
                            </div>
                            <p className={`text-xs leading-relaxed whitespace-pre-wrap ${
                              t.completed ? 'line-through text-[#86868B]' : 'text-[#1D1D1F] font-medium'
                            }`}>
                              {displayTitle}
                            </p>
                          </div>
                        </div>

                        {onDeleteTask && (
                          <button
                            type="button"
                            onClick={() => onDeleteTask(t.id)}
                            className="text-slate-300 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                            title="删除该工作待办"
                          >
                            <Trash2 size={13} strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 border border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-[#86868B] flex items-center justify-center mb-2">
                    <Briefcase size={18} strokeWidth={1.75} />
                  </div>
                  <p className="text-xs text-[#86868B] mb-2">该日暂未排定工作台待办任务</p>
                  <button
                    type="button"
                    onClick={() => setIsTodoModalOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0071E3] hover:bg-blue-600 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    + 新建工作待办
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal for creating/editing Daily Report */}
      <AddNoteModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onConfirm={handleSaveReportFromModal}
        initialDate={activeDate}
        initialType="daily_report"
      />

      {/* Modal for creating/editing Task on that date */}
      {onAddTask && (
        <AddTodoModal
          isOpen={isTodoModalOpen}
          onClose={() => setIsTodoModalOpen(false)}
          onConfirm={async (taskData) => {
            await onAddTask(taskData);
            if (onRefreshSummaries) onRefreshSummaries();
          }}
          initialDate={activeDate}
        />
      )}
    </div>
  );
};

export default CalendarFullView;

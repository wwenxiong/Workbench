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

  const hasActiveReport = !!(dayReport && (dayReport.deliverables || dayReport.tomorrowPlan || dayReport.customNotes));

  return (
    <div className="flex flex-col h-full bg-[#F7F8FA] p-7 overflow-hidden select-none">
      {/* 1. Header Toolbar (Apple Liquid Glass) */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#42A5F5] text-white flex items-center justify-center shadow-xs shadow-blue-500/20">
            <CalendarIcon size={18} strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-[#1D1D1F] tracking-tight">
              日程管理与全景日历
            </h1>
            <p className="text-xs text-[#86868B] mt-0.5">
              内置中国农历、法定节假日与调休标识；日程备忘与工作日报各自独立管理
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3.5 px-3.5 py-1.5 bg-white/75 backdrop-blur-md border border-white/90 rounded-2xl text-[11px] text-[#48484A] shadow-2xs">
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-rose-500 text-white leading-none">休</span>
              <span>法定节假日</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-amber-500 text-white leading-none">班</span>
              <span>调休补班</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>有工作日报</span>
            </div>
          </div>

          {/* Month Switcher */}
          <div className="flex items-center gap-1 bg-white/75 backdrop-blur-md border border-white/90 rounded-2xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
              title="上一月"
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
            </button>
            <span className="px-3 text-xs font-bold text-[#1D1D1F] font-mono">
              {year}年 {month + 1}月
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
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
            className="px-3 py-1.5 text-xs font-semibold text-[#0071E3] bg-blue-50/80 hover:bg-blue-100/80 rounded-2xl transition-colors cursor-pointer border border-blue-200/50"
          >
            返回今天
          </button>
        </div>
      </div>

      {/* 2. Main 2-Col Split Grid */}
      <div className="flex-1 grid grid-cols-12 gap-5 min-h-0">
        {/* Left 7 cols: Calendar Month Grid (Liquid Glass Panel) */}
        <div className="col-span-7 liquid-glass-card p-5 rounded-[28px] flex flex-col">
          {/* Weekday headers: 周一至周日精确对齐真实日历 */}
          <div className="grid grid-cols-7 mb-2 text-center text-xs font-semibold text-[#86868B]">
            <div>周一</div>
            <div>周二</div>
            <div>周三</div>
            <div>周四</div>
            <div>周五</div>
            <div className="text-[#0071E3]">周六</div>
            <div className="text-[#0071E3]">周日</div>
          </div>

          {/* Day Cells */}
          <div className="flex-1 grid grid-cols-7 gap-2 min-h-0">
            {gridDays.map((item) => {
              const summary = calendarSummaries[item.dateStr];
              const isSelected = item.dateStr === activeDate;
              const isToday = item.dateStr === todayStr;
              const status = summary?.status;
              const hasReport = summary?.hasReport || (summary && summary.focusMinutes > 0);
              
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
                      ? 'border-[#0071E3] bg-[#0071E3]/10 ring-2 ring-[#0071E3]/20 shadow-xs'
                      : isToday
                      ? 'border-blue-300 bg-white/95 ring-1 ring-blue-200 shadow-2xs'
                      : item.isCurrentMonth
                      ? 'border-white/80 bg-white/75 hover:bg-white hover:border-slate-200 shadow-2xs'
                      : 'border-transparent bg-slate-100/40 opacity-40'
                  }`}
                >
                  {/* Top Row: Day Number & Badges */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold font-mono ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center shadow-xs'
                          : isSelected
                          ? 'text-[#0071E3]'
                          : item.isCurrentMonth
                          ? 'text-[#1D1D1F]'
                          : 'text-[#86868B]'
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
        <div className="col-span-5 liquid-glass-card p-5 rounded-[28px] flex flex-col overflow-y-auto custom-scrollbar">
          {/* Header Card */}
          <div className="pb-3 border-b border-slate-100 mb-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1D1D1F]">
                  {formatChineseDate(activeDate)}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="text-xs text-[#48484A] font-medium">
                    农历 {activeLunar.fullLunarString}
                  </span>
                  {activeLunar.holidayName && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      activeLunar.holidayStatus === 'rest' 
                        ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {activeLunar.holidayStatus === 'rest' ? '法定节假日' : '调休工作日'} · {activeLunar.holidayName}
                    </span>
                  )}
                  {activeLunar.term && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-[#0071E3] border border-blue-200">
                      节气 · {activeLunar.term}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectDateForDashboard(activeDate)}
                className="flex items-center gap-1 text-xs text-[#0071E3] hover:underline font-semibold cursor-pointer shrink-0"
              >
                <span>工作台</span>
                <ArrowRight size={13} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* 3-Tab Switcher: 日程备忘 vs 工作日报 vs 工作待办 */}
          <div className="flex rounded-xl bg-slate-100/80 p-1 mb-3.5">
            {/* Tab 1: 日程备忘 */}
            <button
              type="button"
              onClick={() => setActiveTab('memos')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'memos'
                  ? 'bg-white text-[#0071E3] shadow-xs font-bold'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
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
                  ? 'bg-white text-[#0071E3] shadow-xs font-bold'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
              title="工作日报、已交付成果与明日推进计划"
            >
              <FileText size={13} strokeWidth={2} />
              <span>工作日报</span>
              {hasActiveReport && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />}
            </button>

            {/* Tab 3: 工作待办 */}
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-white text-[#0071E3] shadow-xs font-bold'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
              title="工作台日常待办任务（已完成项会自动同步计入工作日报成果中）"
            >
              <Briefcase size={13} strokeWidth={2} />
              <span>工作待办 ({activeDayTasks.length})</span>
            </button>
          </div>

          {/* ================= Tab 1: 日程备忘 (独立备忘录，绝不混入工作日报) ================= */}
          {activeTab === 'memos' && (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5">
                    <Bookmark size={14} strokeWidth={2} className="text-[#0071E3]" />
                    <span>当日日程与随手备忘 ({completedMemosCount}/{activeDayMemos.length})</span>
                  </h3>
                  <p className="text-[10px] text-[#86868B] mt-0.5">
                    仅用于日程与个人提醒，与工作台待办及工作日报完全解耦
                  </p>
                </div>
              </div>

              {/* Quick Add Memo Input Form */}
              <form onSubmit={handleAddMemoSubmit} className="flex items-center gap-2 p-2 bg-white/90 rounded-2xl border border-slate-200/80 shadow-2xs">
                <input
                  type="text"
                  placeholder="添加一条备忘（例如：下午取快递、带工牌、开会准备...）"
                  value={newMemoContent}
                  onChange={(e) => setNewMemoContent(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-transparent focus:outline-none text-[#1D1D1F] placeholder-slate-400"
                />
                <select
                  value={newMemoTime}
                  onChange={(e) => setNewMemoTime(e.target.value)}
                  className="text-[11px] font-mono text-[#48484A] bg-slate-100 px-2 py-1.5 rounded-xl border border-slate-200 focus:outline-none cursor-pointer"
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
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0071E3] hover:bg-blue-600 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                >
                  + 记备忘
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
                          ? 'bg-slate-50/70 border-slate-200/60 opacity-60'
                          : 'bg-white border-slate-100 shadow-2xs hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleMemo(m)}
                          className="mt-0.5 text-[#86868B] hover:text-[#0071E3] transition-colors cursor-pointer"
                          title={m.completed ? '标记为未完成' : '标记为已完成'}
                        >
                          {m.completed ? (
                            <CheckCircle2 size={16} strokeWidth={2} className="text-emerald-500" />
                          ) : (
                            <Square size={16} strokeWidth={1.75} />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-50 text-[#0071E3]">
                              {m.time || '全天'}
                            </span>
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-[#86868B]">
                              日程备忘
                            </span>
                          </div>
                          <p className={`text-xs leading-relaxed whitespace-pre-wrap ${
                            m.completed ? 'line-through text-[#86868B]' : 'text-[#1D1D1F] font-medium'
                          }`}>
                            {m.content}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteMemo(m.id)}
                        className="text-slate-300 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                        title="删除该备忘"
                      >
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 border border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0071E3] flex items-center justify-center mb-2">
                    <Bookmark size={18} strokeWidth={1.75} />
                  </div>
                  <p className="text-xs text-[#86868B] mb-1">该日暂无日程备忘记录</p>
                  <p className="text-[11px] text-[#AEAEB2]">在上方输入框直接敲回车即可添加一条随手备忘</p>
                </div>
              )}
            </div>
          )}

          {/* ================= Tab 2: 工作日报 (专注工作产出与台账) ================= */}
          {activeTab === 'report' && (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5">
                    <FileText size={14} strokeWidth={2} className="text-[#0071E3]" />
                    <span>当日工作日报台账</span>
                  </h3>
                  <p className="text-[10px] text-[#86868B] mt-0.5">
                    系统自动汇总当日完成的工作待办与工时成果
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-[#0071E3] hover:text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-xl font-semibold transition-colors cursor-pointer border border-blue-200/50"
                >
                  {dayReport?.deliverables ? <Edit3 size={12} strokeWidth={2} /> : <Plus size={12} strokeWidth={2} />}
                  <span>{dayReport?.deliverables ? '编辑日报' : '+ 编写该日日报'}</span>
                </button>
              </div>

              {isLoadingReport ? (
                <div className="flex-1 flex items-center justify-center py-10 text-xs text-[#86868B]">
                  加载中...
                </div>
              ) : hasActiveReport ? (
                <div className="flex flex-col gap-3 bg-white/80 p-4 rounded-2xl border border-slate-100 text-xs overflow-y-auto custom-scrollbar flex-1">
                  {dayReport?.deliverables && (
                    <div>
                      <span className="font-semibold text-[#1D1D1F] block mb-1">今日工作成果：</span>
                      <p className="text-[#48484A] whitespace-pre-line leading-relaxed pl-2 border-l-2 border-emerald-400">
                        {dayReport.deliverables}
                      </p>
                    </div>
                  )}
                  {dayReport?.blockers && dayReport.blockers !== '无' && (
                    <div>
                      <span className="font-semibold text-rose-600 block mb-1">遇到的阻碍：</span>
                      <p className="text-[#48484A] whitespace-pre-line leading-relaxed pl-2 border-l-2 border-rose-400">
                        {dayReport.blockers}
                      </p>
                    </div>
                  )}
                  {dayReport?.tomorrowPlan && (
                    <div>
                      <span className="font-semibold text-[#1D1D1F] block mb-1">明日推进规划：</span>
                      <p className="text-[#48484A] whitespace-pre-line leading-relaxed pl-2 border-l-2 border-[#0071E3]">
                        {dayReport.tomorrowPlan}
                      </p>
                    </div>
                  )}
                  {dayReport?.customNotes && (
                    <div>
                      <span className="font-semibold text-[#86868B] block mb-1">随手附注：</span>
                      <p className="text-[#48484A] whitespace-pre-line leading-relaxed">
                        {dayReport.customNotes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 border border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-[#86868B] flex items-center justify-center mb-2">
                    <FileText size={18} strokeWidth={1.75} />
                  </div>
                  <p className="text-xs text-[#86868B] mb-2">该日期尚未撰写工作日报</p>
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0071E3] hover:bg-blue-600 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    + 编写 {activeDate} 日报
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= Tab 3: 工作待办 (工作台任务，关联日报成果) ================= */}
          {activeTab === 'tasks' && (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5">
                    <Briefcase size={14} strokeWidth={2} className="text-[#0071E3]" />
                    <span>工作台日常待办 ({completedTasksCount}/{activeDayTasks.length})</span>
                  </h3>
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    已勾选完成项会自动汇总计入当日工作日报成果
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTodoModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-[#0071E3] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl font-semibold transition-all cursor-pointer border border-blue-200/60"
                >
                  <Plus size={12} strokeWidth={2} />
                  <span>+ 新建工作待办</span>
                </button>
              </div>

              {activeDayTasks.length > 0 ? (
                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
                  {activeDayTasks.map((t) => {
                    const timePart = t.dueDate && t.dueDate.includes('T') ? t.dueDate.split('T')[1].slice(0, 5) : '全天';
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-2.5 ${
                          t.completed 
                            ? 'bg-slate-50/70 border-slate-200/60 opacity-60' 
                            : 'bg-white border-slate-100 shadow-2xs hover:border-blue-200'
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
                              {t.title}
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

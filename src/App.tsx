import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './components/Common/Toast';
import { LeftSidebar } from './components/Sidebar/LeftSidebar';
import { MainDashboard } from './components/Dashboard/MainDashboard';
import { TodoList } from './components/Todo/TodoList';
import { NotesView } from './components/Notes/NotesView';
import { WeeklyReportView } from './components/Report/WeeklyReportView';
import { DailyReportView } from './components/Report/DailyReportView';
import { CalendarFullView } from './components/Calendar/CalendarFullView';
import { FilesView } from './components/Files/FilesView';
import type { Task, DailyReport, ExcelConfig, CalendarDaySummary, Note } from './types';
import { api } from './services/api';
import { formatLocalDate } from './utils/date';

const WorkbenchContent: React.FC = () => {
  const { showToast } = useToast();
  const todayStr = formatLocalDate(new Date());

  // Global States with localStorage persistence to prevent accidental resets
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeView, setActiveView] = useState<string>(() => {
    try {
      return localStorage.getItem('workbench_active_view') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const handleSetActiveView = (view: string) => {
    setActiveView(view);
    try {
      localStorage.setItem('workbench_active_view', view);
    } catch {
      // ignore
    }
  };

  // Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [, setDailyReport] = useState<DailyReport | null>(null);
  const [calendarSummaries, setCalendarSummaries] = useState<Record<string, CalendarDaySummary>>({});
  const [_excelConfigs, setExcelConfigs] = useState<ExcelConfig[]>([]);

  // Load all tasks
  const loadTasks = useCallback(async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }, []);

  // Load all notes / quick records
  const loadNotes = useCallback(async () => {
    try {
      const data = await api.getNotes();
      setNotes(data);
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  }, []);

  // Load daily report for selected date
  const loadDailyReport = useCallback(async (date: string) => {
    try {
      const rep = await api.getDailyReport(date);
      setDailyReport(rep);
    } catch (err) {
      console.error('Failed to load daily report:', err);
    }
  }, []);

  // Load calendar summaries
  const loadCalendarSummaries = useCallback(async () => {
    try {
      const summaries = await api.getCalendarSummary();
      setCalendarSummaries(summaries);
    } catch (err) {
      console.error('Failed to load calendar summaries:', err);
    }
  }, []);

  // Load excel configs
  const loadExcelConfigs = useCallback(async () => {
    try {
      const configs = await api.getExcelConfigs();
      setExcelConfigs(configs);
    } catch (err) {
      console.error('Failed to load excel configs:', err);
    }
  }, []);

  // Initialize
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        loadTasks(),
        loadNotes(),
        loadDailyReport(todayStr),
        loadCalendarSummaries(),
        loadExcelConfigs(),
      ]);
    };
    init();
  }, [loadTasks, loadNotes, loadDailyReport, loadCalendarSummaries, loadExcelConfigs, todayStr]);

  // Sync daily report when selectedDate changes
  useEffect(() => {
    loadDailyReport(selectedDate);
  }, [selectedDate, loadDailyReport]);

  // Task Mutations
  const handleToggleTask = async (id: string, completed: boolean, extraUpdates?: Partial<Task>) => {
    try {
      const updated = await api.updateTask(id, {
        completed,
        completedAt: completed ? new Date().toISOString() : null,
        ...(extraUpdates || {}),
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      loadDailyReport(selectedDate);
      loadCalendarSummaries();
      if (completed) {
        showToast('任务已完成！', { 
          type: 'success',
          message: extraUpdates?.timeSpan ? `耗时：${extraUpdates.timeSpan}，${extraUpdates.actualMinutes}分钟 已自动记入日报` : undefined,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const updated = await api.updateTask(id, updates);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      loadDailyReport(selectedDate);
      loadCalendarSummaries();
      return updated;
    } catch (err) {
      console.error(err);
      showToast('更新失败', { type: 'error' });
    }
  };

  const handleAddTask = async (taskData: {
    title: string;
    dueDate: string;
    tags?: string[];
    priority?: string;
    isRecurring?: boolean;
    recurringConfig?: any;
  }) => {
    try {
      const created = await api.createTask({
        title: taskData.title.trim(),
        priority: (taskData.priority as any) || 'p2',
        estimatedMinutes: 25,
        tags: taskData.tags || ['工作'],
        dueDate: taskData.dueDate || selectedDate,
        isRecurring: taskData.isRecurring,
        recurringConfig: taskData.recurringConfig,
      });
      setTasks((prev) => [created, ...prev]);
      loadDailyReport(selectedDate);
      loadCalendarSummaries();
      showToast(created.isRecurring ? '每日固定循环待办已开启' : '新待办已创建', {
        message: created.isRecurring ? '系统将根据设置的有效日期在每天自动同步' : `${created.title} · ${created.dueDate?.slice(0, 10)}`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      showToast('创建失败', { type: 'error' });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      loadDailyReport(selectedDate);
      loadCalendarSummaries();
      showToast('待办已删除', { type: 'info' });
    } catch (err) {
      console.error(err);
      showToast('删除失败', { type: 'error' });
    }
  };

  // Note Mutations
  const handleAddNote = async (noteData: Partial<Note>) => {
    try {
      const created = await api.createNote(noteData);
      setNotes((prev) => [created, ...prev.filter((n) => n.id !== created.id)]);
      if (created.type === 'daily_report') {
        loadDailyReport(created.date);
        loadCalendarSummaries();
        showToast('工作日报已归档', {
          message: `已自动关联 ${created.date} 日历时间管理与日报台账`,
          type: 'success',
        });
      } else {
        showToast('记录已保存', { type: 'success' });
      }
    } catch (err) {
      console.error(err);
      showToast('保存记录失败', { type: 'error' });
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    try {
      const updated = await api.updateNote(id, updates);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await api.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      loadCalendarSummaries();
      showToast('记录已删除', { type: 'info' });
    } catch (err) {
      console.error(err);
      showToast('删除记录失败', { type: 'error' });
    }
  };

  // Computed values
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalFocusMinutes = tasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);
  const focusHours = Number((totalFocusMinutes / 60).toFixed(1));

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-gradient-to-br from-[#F4F7FC] via-[#EEF3FA] to-[#F8FAFD] font-sans antialiased text-slate-800">
      {/* Soft Ambient Blurred Glows in Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-200/40 blur-[100px]"></div>
        <div className="absolute top-1/3 -right-24 w-[500px] h-[500px] rounded-full bg-indigo-200/30 blur-[120px]"></div>
        <div className="absolute -bottom-24 left-1/3 w-[600px] h-[600px] rounded-full bg-sky-200/35 blur-[110px]"></div>
      </div>

      {/* Left Floating Frosted Glass Sidebar */}
      <LeftSidebar
        activeView={activeView}
        setActiveView={handleSetActiveView}
        tasks={tasks}
        focusHours={focusHours}
        focusGoalHours={5}
      />

      {/* Center Main Work Area */}
      {activeView === 'dashboard' && (
        <MainDashboard
          tasks={tasks}
          onToggleTask={handleToggleTask}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          focusHours={focusHours}
          completedCount={completedCount}
          totalNotes={notes.filter(n => n.type !== 'daily_report').length}
          notes={notes}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          onViewAllNotes={() => handleSetActiveView('notes')}
          onViewAllFiles={() => handleSetActiveView('files')}
        />
      )}

      {activeView === 'todos' && (
        <main className="flex-1 p-8 overflow-y-auto z-10 custom-scrollbar">
          <div className="max-w-5xl mx-auto">
            <TodoList
              tasks={tasks}
              onAddTask={async (t) => {
                await handleAddTask({
                  title: t.title || '新待办',
                  dueDate: t.dueDate || selectedDate,
                  tags: t.tags,
                  priority: t.priority,
                  isRecurring: t.isRecurring,
                  recurringConfig: t.recurringConfig,
                });
              }}
              onUpdateTask={async (id, updates) => {
                const updated = await api.updateTask(id, updates);
                setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
                loadDailyReport(selectedDate);
                loadCalendarSummaries();
              }}
              onDeleteTask={handleDeleteTask}
              onReorderTasks={async (ids) => {
                await api.reorderTasks(ids);
                await loadTasks();
              }}
              onStartFocusOnTask={() => {
                handleSetActiveView('dashboard');
                showToast('已选中任务，可前往首页开始专注', { type: 'info' });
              }}
              selectedDate={selectedDate}
            />
          </div>
        </main>
      )}

      {activeView === 'reports' && (
        <main className="flex-1 p-8 overflow-y-auto z-10 custom-scrollbar">
          <DailyReportView
            onSelectDateForCalendar={(d) => {
              setSelectedDate(d);
              handleSetActiveView('calendar');
            }}
            onSelectDateForDashboard={(d) => {
              setSelectedDate(d);
              handleSetActiveView('dashboard');
            }}
          />
        </main>
      )}

      {activeView === 'notes' && (
        <main className="flex-1 p-8 overflow-y-auto z-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto h-[calc(100vh-64px)]">
            <NotesView
              notes={notes}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onSelectDateForCalendar={(d) => {
                setSelectedDate(d);
                handleSetActiveView('calendar');
              }}
            />
          </div>
        </main>
      )}

      {activeView === 'calendar' && (
        <div className="flex-1 z-10 overflow-y-auto">
          <CalendarFullView
            calendarSummaries={calendarSummaries}
            tasks={tasks}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onSelectDateForDashboard={(d) => {
              setSelectedDate(d);
              handleSetActiveView('dashboard');
              showToast('已载入该日工作台', { message: d, type: 'info' });
            }}
            onRefreshSummaries={loadCalendarSummaries}
          />
        </div>
      )}

      {activeView === 'statistics' && (
        <div className="flex-1 z-10 overflow-y-auto p-6">
          <WeeklyReportView />
        </div>
      )}

      {activeView === 'files' && (
        <div className="flex-1 z-10 overflow-y-auto p-6 custom-scrollbar">
          <FilesView />
        </div>
      )}

      {/* Fallback for other views */}
      {!['dashboard', 'todos', 'reports', 'notes', 'calendar', 'statistics', 'files'].includes(activeView) && (
        <main className="flex-1 flex items-center justify-center z-10">
          <div className="text-center p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-white/80 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0071E3] flex items-center justify-center mx-auto mb-4 border border-blue-100/60 shadow-2xs">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-[#1D1D1F]">模块规划中</h2>
            <p className="text-xs text-[#86868B] mt-1.5">该功能模块已在规划路线中，敬请期待。</p>
          </div>
        </main>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <WorkbenchContent />
    </ToastProvider>
  );
}

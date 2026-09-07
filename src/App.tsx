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
import { ToolsView } from './components/Tools/ToolsView';
import { SettingsView } from './components/Settings/SettingsView';
import { FloatingTimerWidget } from './components/Tools/FloatingTimerWidget';
import { TimerProvider } from './contexts/TimerContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthLockModal } from './components/Auth/AuthLockModal';
import type { Task, DailyReport, ExcelConfig, CalendarDaySummary, Note, UserProfile } from './types';
import { api, getStoredToken } from './services/api';
import { syncService, type SyncEventPayload } from './services/syncService';
import { formatLocalDate } from './utils/date';

const WorkbenchContent: React.FC = () => {
  const { showToast } = useToast();
  const todayStr = formatLocalDate(new Date());

  // Authentication & Security States
  const [isLocked, setIsLocked] = useState<boolean>(!getStoredToken());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [hasUsers, setHasUsers] = useState<boolean>(true);

  // Global View States
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeView, setActiveView] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('workbench_active_view') || 'dashboard';
      return saved === 'projects' ? 'dashboard' : saved;
    } catch {
      return 'dashboard';
    }
  });

  const handleSetActiveView = (view: string) => {
    const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isReduced && typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        setActiveView(view);
      });
    } else {
      setActiveView(view);
    }
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

  // Full Refresh
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      loadTasks(),
      loadNotes(),
      loadDailyReport(selectedDate),
      loadCalendarSummaries(),
      loadExcelConfigs(),
    ]);
  }, [loadTasks, loadNotes, loadDailyReport, selectedDate, loadCalendarSummaries, loadExcelConfigs]);

  // Auth Status check on launch
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.getAuthStatus();
        if (res.hasUsers !== undefined) {
          setHasUsers(res.hasUsers);
        }
        if (!res.authenticated || !res.user) {
          setIsLocked(true);
          setCurrentUser(null);
        } else {
          setIsLocked(false);
          setCurrentUser(res.user);
          syncService.connect();
          refreshAllData();
        }
      } catch {
        setIsLocked(true);
        setCurrentUser(null);
      }
    };
    checkAuth();
  }, [refreshAllData]);

  // Handle Unlocked / Logged in Event
  const handleUnlocked = (user: UserProfile) => {
    setIsLocked(false);
    setCurrentUser(user);
    setHasUsers(true);
    syncService.connect();
    refreshAllData();
    showToast(`欢迎回来，${user.username}`, { type: 'success' });
  };

  // Handle Logout Event
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      setIsLocked(true);
      setCurrentUser(null);
      syncService.disconnect();
      showToast('已安全退出登录', { type: 'info' });
    }
  };

  // Sync Service Event Listeners
  useEffect(() => {
    const handleUnauthorizedEvent = () => {
      setIsLocked(true);
      setCurrentUser(null);
      syncService.disconnect();
    };

    const handleSyncEvent = (e: any) => {
      const payload: SyncEventPayload = e.detail;
      if (!payload) {
        refreshAllData();
        return;
      }

      if (payload.entity === 'tasks') {
        loadTasks();
        loadDailyReport(selectedDate);
        loadCalendarSummaries();
      } else if (payload.entity === 'notes') {
        loadNotes();
      } else if (payload.entity === 'reports') {
        loadDailyReport(selectedDate);
        loadCalendarSummaries();
      } else if (payload.entity === 'focus_logs') {
        loadCalendarSummaries();
        loadDailyReport(selectedDate);
      } else {
        refreshAllData();
      }
    };

    window.addEventListener('workbench:unauthorized', handleUnauthorizedEvent);
    window.addEventListener('workbench:sync', handleSyncEvent);

    return () => {
      window.removeEventListener('workbench:unauthorized', handleUnauthorizedEvent);
      window.removeEventListener('workbench:sync', handleSyncEvent);
    };
  }, [refreshAllData, loadTasks, loadNotes, loadDailyReport, selectedDate, loadCalendarSummaries]);

  // Sync daily report when selectedDate changes
  useEffect(() => {
    if (!isLocked) {
      loadDailyReport(selectedDate);
    }
  }, [selectedDate, loadDailyReport, isLocked]);

  // Listen to timer countdown finished event
  useEffect(() => {
    const handleTimerDone = (e: any) => {
      showToast('倒计时已结束！', {
        type: 'success',
        message: e.detail?.title ? `${e.detail.title} 目标时间达成` : '您设定的倒计时已完成',
        duration: 6000,
      });
    };
    window.addEventListener('workbench:timer-done', handleTimerDone);
    return () => window.removeEventListener('workbench:timer-done', handleTimerDone);
  }, [showToast]);

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
      showToast('更新任务失败', { type: 'error' });
    }
  };

  const handleAddTask = async (taskData: {
    title: string;
    dueDate?: string;
    tags?: string[];
    priority?: string;
    isRecurring?: boolean;
    recurringConfig?: any;
  }) => {
    try {
      const cleanTitle = taskData.title.trim();
      const created = await api.createTask({
        title: cleanTitle,
        priority: (taskData.priority as any) || 'p2',
        estimatedMinutes: 25,
        tags: taskData.tags || ['工作'],
        dueDate: taskData.dueDate || selectedDate,
        isRecurring: taskData.isRecurring,
        recurringConfig: taskData.recurringConfig,
      });
      setTasks((prev) => [created, ...prev]);
      loadCalendarSummaries();
      showToast(created.isRecurring ? '每日固定循环待办已开启' : '新待办已创建', {
        message: created.isRecurring ? '系统将根据设置的有效日期在每天自动同步' : `${created.title} · ${created.dueDate?.slice(0, 10)}`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      showToast('创建任务失败', { type: 'error' });
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const updated = await api.updateTask(id, updates);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      loadDailyReport(selectedDate);
      loadCalendarSummaries();
    } catch (err) {
      console.error(err);
      showToast('更新任务失败', { type: 'error' });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      loadDailyReport(selectedDate);
      loadCalendarSummaries();
      showToast('任务已删除', { type: 'info' });
    } catch (err) {
      console.error(err);
      showToast('删除任务失败', { type: 'error' });
    }
  };

  // Quick Note Mutations
  const handleAddNote = async (data: Partial<Note>) => {
    try {
      const created = await api.createNote(data);
      setNotes((prev) => [created, ...prev]);
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
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#F4F6FB] text-slate-800 font-sans antialiased">
      {/* Soft Ambient Sky Light */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 right-1/4 w-[600px] h-[450px] rounded-full bg-blue-100/35 blur-[120px]" />
        <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] rounded-full bg-indigo-50/40 blur-[130px]" />
      </div>

      {/* Security Auth Lock Modal */}
      <AuthLockModal
        isOpen={isLocked}
        onUnlocked={handleUnlocked}
        currentUser={currentUser}
        onSwitchAccount={handleLogout}
        initialMode={hasUsers === false ? 'register' : 'login'}
      />

      {/* Left Floating Frosted Glass Sidebar */}
      <LeftSidebar
        activeView={activeView}
        setActiveView={handleSetActiveView}
        tasks={tasks}
        focusHours={focusHours}
        focusGoalHours={5}
        currentUser={currentUser}
        onOpenSettings={() => handleSetActiveView('settings')}
        onLogout={handleLogout}
        onLock={() => setIsLocked(true)}
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
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          onViewAllNotes={() => handleSetActiveView('notes')}
          onViewAllFiles={() => handleSetActiveView('files')}
          currentUser={currentUser}
          onOpenSettings={() => handleSetActiveView('settings')}
          onLogout={handleLogout}
          onNavigateView={(view, date) => {
            if (date) setSelectedDate(date);
            handleSetActiveView(view);
          }}
        />
      )}

      {activeView === 'todos' && (
        <main className="flex-1 p-8 overflow-y-auto z-10 custom-scrollbar ios-view-entrance">
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
        <main className="flex-1 p-8 overflow-y-auto z-10 custom-scrollbar ios-view-entrance">
          <DailyReportView
            onSelectDateForCalendar={(d) => {
              setSelectedDate(d);
              handleSetActiveView('calendar');
            }}
            onSelectDateForDashboard={(d) => {
              setSelectedDate(d);
              handleSetActiveView('dashboard');
            }}
            onRefreshSummaries={loadCalendarSummaries}
          />
        </main>
      )}

      {activeView === 'notes' && (
        <main className="flex-1 p-8 overflow-y-auto z-10 custom-scrollbar ios-view-entrance">
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
        <div className="flex-1 z-10 overflow-y-auto p-6 custom-scrollbar ios-view-entrance">
          <CalendarFullView
            calendarSummaries={calendarSummaries}
            tasks={tasks}
            onAddTask={(taskData) => handleAddTask(taskData)}
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
        <div className="flex-1 z-10 overflow-y-auto p-6 ios-view-entrance">
          <WeeklyReportView />
        </div>
      )}

      {activeView === 'files' && (
        <div className="flex-1 z-10 overflow-y-auto p-6 custom-scrollbar ios-view-entrance">
          <FilesView />
        </div>
      )}

      {activeView === 'tools' && (
        <div className="flex-1 overflow-y-auto z-10 custom-scrollbar ios-view-entrance">
          <ToolsView />
        </div>
      )}

      {activeView === 'settings' && (
        <div className="flex-1 overflow-hidden z-10 ios-view-entrance flex flex-col">
          <SettingsView
            currentUser={currentUser}
            onUserUpdated={(u) => setCurrentUser(u)}
            onLogout={handleLogout}
          />
        </div>
      )}

      {/* Floating mini timer widget when running in background */}
      <FloatingTimerWidget
        currentView={activeView}
        onOpenTools={() => handleSetActiveView('tools')}
      />

      {/* Fallback for other views */}
      {!['dashboard', 'todos', 'reports', 'notes', 'calendar', 'statistics', 'files', 'tools', 'settings'].includes(activeView) && (
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

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-[#F4F6FB] p-6">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/80 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-[#1D1D1F]">界面遇到了一个小问题</h2>
            <p className="text-xs text-[#86868B] leading-relaxed">
              系统已安全保护您的所有待办、日程与笔记数据。点击下方按钮即可一键恢复工作台。
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              重新恢复工作台
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <TimerProvider>
          <ThemeProvider>
            <WorkbenchContent />
          </ThemeProvider>
        </TimerProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FC } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronDown, 
  MoreHorizontal, 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Edit3, 
  CheckSquare, 
  FileText, 
  Sparkles, 
  Trash2, 
  Wrench, 
  SlidersHorizontal, 
  X, 
  Check, 
  Sun, 
  Languages,
  Copy,
  Calculator,
  ArrowRightLeft
} from 'lucide-react';
import type { Note, Task, RecurringConfig, LinkedFile, UserProfile, DateMemo } from '../../types';
import { api } from '../../services/api';
import { useTimer } from '../../contexts/TimerContext';
import { TOOL_ITEMS } from '../Tools/ToolsView';
import { AddTodoModal } from '../Common/AddTodoModal';
import { AddNoteModal } from '../Common/AddNoteModal';
import { CompleteTaskModal } from '../Todo/CompleteTaskModal';
import { NotificationPopover } from '../Common/NotificationPopover';
import { SmartNoteModal } from '../Common/SmartNoteModal';
import { ThinkingOrb } from 'thinking-orbs';
import { AgentThinking } from '../ui';
import snowMountainImg from '../../assets/snow_mountain.jpg';
import { 
  formatLocalDate, 
  parseLocalDate, 
  formatChineseDate, 
  addDays 
} from '../../utils/date';

interface DisplayNoteItem {
  id: string;
  type?: string;
  title: string;
  content?: string;
  subtitle: string;
  time: string;
  date?: string;
  iconType: string;
  rawNote?: Note;
}

interface ScheduleItem {
  id?: string;
  time: string;
  title: string;
  tag: string;
  completed?: boolean;
  rawMemo?: DateMemo;
}

// Helper to detect if text contains sensitive keys / credentials / passwords / IDs
function hasSensitiveData(text: string): boolean {
  if (!text) return false;
  return /(api[-_]?key|token|secret|password|pwd|apikey|appsecret|access_token|私钥|密码|密钥|秘钥|账号|设备id|设备ID|mac|sk-[a-zA-Z0-9_-]{4,}|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)/i.test(text);
}

// Helper to mask sensitive information (API Keys, Passwords, Device IDs, Account Credentials)
function maskSensitiveContent(text: string): string {
  if (!text) return '';
  
  // 1. API Keys (e.g. sk-..., key-..., ghp_..., eyJ...)
  let masked = text.replace(
    /\b(sk-[a-zA-Z0-9_-]{3})[a-zA-Z0-9_-]+([a-zA-Z0-9_-]{3})\b/g,
    '$1••••••••$2'
  );

  // 2. Common Key-Value assignments (Key / Token / Password / Secret / ID / 密码 / 账号 / 密钥)
  masked = masked.replace(
    /(api[-_]?key|token|secret|password|pwd|apikey|appsecret|access_token|私钥|密码|密钥|秘钥|账号|设备id|设备ID|mac)[\s:=：]+([^\s,;，；\n]+)/gi,
    (_match, prefix, secret) => {
      if (secret.length <= 3) {
        return `${prefix}: ***`;
      }
      const visibleStart = secret.slice(0, 1);
      const visibleEnd = secret.slice(-1);
      return `${prefix}: ${visibleStart}${'•'.repeat(Math.min(secret.length - 2, 8))}${visibleEnd}`;
    }
  );

  // 3. JWT / Long Hash Tokens (32+ chars)
  masked = masked.replace(/\b([a-f0-9]{32,64})\b/gi, (match) => {
    return `${match.slice(0, 3)}••••••••${match.slice(-3)}`;
  });

  // 4. IP Addresses with ports or standalone
  masked = masked.replace(/\b(\d{1,3}\.\d{1,3}\.)\d{1,3}\.\d{1,3}(:\d+)?\b/g, '$1•••.•••$2');

  return masked;
}

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
  onUpdateNote?: (id: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
  onViewAllNotes?: () => void;
  onViewAllFiles?: () => void;
  currentUser?: UserProfile | null;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  onNavigateView?: (view: string, date?: string) => void;
}



const SnowMountainArtwork: React.FC<{ className?: string; height?: number }> = ({ 
  className = '', 
  height = 80 
}) => (
  <div 
    className={`relative overflow-hidden flex-shrink-0 select-none pointer-events-none rounded-2xl ${className}`}
    style={{ 
      height: `${height}px`, 
      width: `${Math.round(height * 2.8)}px`,
    }}
  >
    <img
      src={snowMountainImg}
      alt="雪山"
      className="w-full h-full object-cover object-[right_center]"
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.06) 12%, rgba(0, 0, 0, 0.5) 30%, black 60%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.06) 12%, rgba(0, 0, 0, 0.5) 30%, black 60%)',
      }}
    />
  </div>
);

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
  onUpdateNote,
  onDeleteNote,
  onViewAllNotes,
  onViewAllFiles,
  currentUser,
  onOpenSettings,
  onNavigateView,
}) => {
  const todayStr = formatLocalDate(new Date());
  
  const { 
    isRunning, 
    isPaused 
  } = useTimer();

  // Modal States
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const todoFilter = 'today';
  const [noteFilter, setNoteFilter] = useState<string>('all');
  const [deletedDemoIds, setDeletedDemoIds] = useState<string[]>([]);
  const [quickNote, setQuickNote] = useState('');
  const [dashboardFiles, setDashboardFiles] = useState<LinkedFile[]>([]);
  const [smartNoteInput, setSmartNoteInput] = useState('');
  const [isSmartNoteOpen, setIsSmartNoteOpen] = useState(false);
  const isNotesMasked = true;
  const revealedNoteIds = useMemo(() => new Set<string>(), []);
  const [selectedWeekDay, setSelectedWeekDay] = useState<string | null>(null);

  // Custom Visible Tools in Dashboard State (支持用户自定义在首页显示哪些工具)
  const [visibleToolIds, setVisibleToolIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('workbench_dashboard_visible_tools');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((id) => TOOL_ITEMS.some((t) => t.id === id));
          if (valid.length >= 1) return valid;
        }
      }
    } catch {
      // ignore
    }
    return ['countdown', 'translate', 'calculator'];
  });
  const [isToolConfigModalOpen, setIsToolConfigModalOpen] = useState(false);
  const [isTranslateModalOpen, setIsTranslateModalOpen] = useState(false);
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);

  const visibleTools = useMemo(() => {
    const list = TOOL_ITEMS.filter((t) => visibleToolIds.includes(t.id));
    return list.length > 0 ? list : TOOL_ITEMS;
  }, [visibleToolIds]);

  const handleToggleToolVisibility = (toolId: string) => {
    setVisibleToolIds((prev) => {
      const next = prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId];
      try {
        localStorage.setItem('workbench_dashboard_visible_tools', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleDashboardToolClick = (toolId: string) => {
    if (toolId === 'countdown') {
      onNavigateView?.('tools');
    } else if (toolId === 'translate') {
      setIsTranslateModalOpen(true);
    } else if (toolId === 'calculator') {
      setIsCalculatorModalOpen(true);
    } else {
      onNavigateView?.('tools');
    }
  };

  // Quick Translate State & Logic
  const [translateInput, setTranslateInput] = useState('');
  const [translateOutput, setTranslateOutput] = useState('');
  const [translateLang, setTranslateLang] = useState<'zh-en' | 'en-zh'>('zh-en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copiedTranslate, setCopiedTranslate] = useState(false);

  const handleTranslate = async () => {
    const text = translateInput.trim();
    if (!text) {
      setTranslateOutput('');
      return;
    }
    setIsTranslating(true);
    try {
      const pair = translateLang === 'zh-en' ? 'zh|en' : 'en|zh';
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`);
      if (res.ok) {
        const data = await res.json();
        if (data.responseData && data.responseData.translatedText) {
          setTranslateOutput(data.responseData.translatedText);
          setIsTranslating(false);
          return;
        }
      }
      throw new Error('Fallback translation');
    } catch {
      if (translateLang === 'zh-en') {
        setTranslateOutput(`[翻译]: ${text}`);
      } else {
        setTranslateOutput(`[中文]: ${text}`);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyTranslateResult = () => {
    if (!translateOutput) return;
    navigator.clipboard.writeText(translateOutput);
    setCopiedTranslate(true);
    setTimeout(() => setCopiedTranslate(false), 2000);
  };

  // Quick Calculator State & Logic
  const [calcExpression, setCalcExpression] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const [copiedCalc, setCopiedCalc] = useState(false);

  const handleCalcInput = (val: string) => {
    if (val === 'C') {
      setCalcExpression('');
      setCalcResult('');
    } else if (val === 'DEL') {
      setCalcExpression((prev) => prev.slice(0, -1));
    } else if (val === '=') {
      if (!calcExpression) return;
      try {
        const sanitized = calcExpression.replace(/×/g, '*').replace(/÷/g, '/');
        if (/^[0-9+\-*/(). %]+$/.test(sanitized)) {
          // eslint-disable-next-line no-new-func
          const res = Function(`'use strict'; return (${sanitized})`)();
          setCalcResult(String(Number.isFinite(res) ? Math.round(res * 100000000) / 100000000 : 'Error'));
        } else {
          setCalcResult('Error');
        }
      } catch {
        setCalcResult('Error');
      }
    } else {
      setCalcExpression((prev) => prev + val);
    }
  };

  const handleCopyCalcResult = () => {
    const textToCopy = calcResult || calcExpression;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCalc(true);
    setTimeout(() => setCopiedCalc(false), 2000);
  };

  // 7-Day Schedule Memos State (支持展示最近7天日程安排速版排列)
  const [allMemos, setAllMemos] = useState<DateMemo[]>([]);
  const [isQuickAddMemo, setIsQuickAddMemo] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<string>('');
  const [newMemoContent, setNewMemoContent] = useState('');
  const [newMemoTime, setNewMemoTime] = useState('全天');

  // Load Real Memos for all dates
  const loadMemos = useCallback(async () => {
    try {
      const list = await api.getMemos();
      setAllMemos(list || []);
    } catch (e) {
      console.warn('Failed to load memos:', e);
      setAllMemos([]);
    }
  }, []);

  // Load Real Files
  const loadDashboardFiles = useCallback(async () => {
    try {
      const res = await api.getFiles();
      setDashboardFiles(res || []);
    } catch {
      setDashboardFiles([]);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsSmartNoteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    loadDashboardFiles();
  }, [loadDashboardFiles]);

  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  // Sync listener for real-time updates
  useEffect(() => {
    const handleSync = (e: any) => {
      const payload = e.detail;
      if (payload?.entity === 'files') {
        loadDashboardFiles();
      } else if (payload?.entity === 'memos') {
        loadMemos();
      }
    };
    window.addEventListener('workbench:sync', handleSync);
    return () => window.removeEventListener('workbench:sync', handleSync);
  }, [loadDashboardFiles, loadMemos]);

  // Memo actions
  const handleToggleMemoStatus = async (memo: DateMemo) => {
    try {
      const updated = await api.updateMemo(memo.id, { completed: !memo.completed });
      setAllMemos((prev) => prev.map((m) => (m.id === memo.id ? updated : m)));
    } catch (err) {
      console.error('Failed to toggle memo status:', err);
    }
  };

  const handleDeleteMemo = async (id: string) => {
    try {
      await api.deleteMemo(id);
      setAllMemos((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Failed to delete memo:', err);
    }
  };

  const handleQuickAddMemoSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMemoContent.trim()) return;
    try {
      const targetDate = quickAddDate || selectedDate || todayStr;
      const created = await api.createMemo({
        date: targetDate,
        time: newMemoTime || '全天',
        content: newMemoContent.trim(),
        completed: false,
      });
      setAllMemos((prev) => [created, ...prev]);
      setNewMemoContent('');
      setIsQuickAddMemo(false);
    } catch (err) {
      console.error('Failed to create memo:', err);
    }
  };

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

  // Handle Quick Note Save (点击 + 号或按 Enter 均保持默认直接存储)
  const handleSaveQuickNote = async () => {
    const trimmed = quickNote.trim();
    if (!trimmed) {
      setIsNoteModalOpen(true);
      return;
    }
    if (onAddNote) {
      const targetType = (noteFilter && noteFilter !== 'all' ? noteFilter : 'note') as any;
      await onAddNote({
        type: targetType,
        content: trimmed,
        date: selectedDate || todayStr,
        tags: ['日常'],
      });
      setQuickNote('');
    }
  };

  const handleQuickNoteKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleSaveQuickNote();
    }
  };

  const handlePickLocalFile = async () => {
    try {
      const res = await api.pickFile();
      if (res && res.success && res.filePath) {
        await api.addFile({
          name: res.fileName || res.filePath.split('\\').pop() || '未命名文件',
          filePath: res.filePath,
          fileType: res.fileType || 'file',
          size: res.size,
          category: '工作文档',
          notes: '本地选择关联文件'
        });
        await loadDashboardFiles();
      }
    } catch {
      // ignore
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

  // Handle Toggle Task Item: if completing -> open CompleteTaskModal to choose time and duration; if uncompleting -> directly unmark
  const handleToggleTaskItem = async (taskId: string, currentCompleted: boolean) => {
    if (!currentCompleted) {
      const fullTask = tasks.find((t) => t.id === taskId);
      if (fullTask) {
        setCompletingTask(fullTask);
      } else {
        setCompletingTask({
          id: taskId,
          title: '待办任务',
          completed: false,
          dueDate: todayStr,
        } as Task);
      }
    } else {
      if (onUpdateTask) {
        await onUpdateTask(taskId, {
          completed: false,
          completedAt: undefined,
        });
      } else {
        onToggleTask(taskId, false);
      }
    }
  };

  // Determine tasks to display (strictly real user tasks)
  const rawList = tasks
    .filter(t => !deletedDemoIds.includes(t.id))
    .map((t) => ({
      id: t.id,
      title: t.title,
      completed: t.completed,
      time: formatTaskTime(t.dueDate, '10:00'),
      tag: t.tags?.[0] || '工作',
      dueDate: t.dueDate,
      isRecurring: t.isRecurring,
    }));

  const targetList = todoFilter === 'today'
    ? rawList.filter(t => !t.dueDate || t.dueDate.startsWith(todayStr))
    : rawList;

  const completedNum = targetList.filter(t => t.completed).length;
  const totalNum = targetList.length || 1;
  const progressPercent = targetList.length > 0 ? Math.round((completedNum / totalNum) * 100) : 0;

  // 首页今日待办展示当前待办项
  const displayTasks = targetList;

  // Pure notes (strictly real user notes)
  const pureNotes = notes.filter(n => n.type !== 'daily_report');
  const filteredNotes = pureNotes.filter(n => {
    if (noteFilter !== 'all' && n.type !== noteFilter) return false;
    return true;
  });

  const displayNotesList: DisplayNoteItem[] = filteredNotes.slice(0, 3).map((n) => {
    const isSensitive = hasSensitiveData(n.content);
    const shouldMask = isNotesMasked && !revealedNoteIds.has(n.id);
    const displayText = shouldMask ? maskSensitiveContent(n.content) : n.content;
    return {
      id: n.id,
      title: n.title || displayText,
      subtitle: isSensitive && shouldMask 
        ? '识别为: 密钥 · 已脱敏' 
        : (n.type === 'meeting' ? `识别为: 会议 · ${n.date || '09-10'}` : `识别为: 笔记 · ${n.date || '09-08'}`),
      time: n.time || (n.date === todayStr ? '今天' : n.date || '最近'),
      iconType: n.type === 'meeting' ? 'calendar' : 'doc',
      rawNote: n,
    };
  });

  // Recent files (strictly real user linked files)
  const displayFilesList = dashboardFiles.slice(0, 4).map((f) => {
    const ext = (f.fileType || f.name.split('.').pop() || 'file').toLowerCase();
    let badgeText = 'DOC';
    let badgeColor = 'bg-blue-50 text-[#1677FF]';
    if (ext.includes('pdf')) {
      badgeText = 'PDF';
      badgeColor = 'bg-rose-50 text-rose-600';
    } else if (ext.includes('xls') || ext.includes('sheet')) {
      badgeText = 'XLS';
      badgeColor = 'bg-emerald-50 text-emerald-600';
    } else if (ext.includes('fig')) {
      badgeText = 'FIG';
      badgeColor = 'bg-purple-50 text-purple-600';
    } else if (ext.includes('md') || ext.includes('txt')) {
      badgeText = 'MD';
      badgeColor = 'bg-sky-50 text-sky-600';
    }
    return {
      id: f.id,
      name: f.name,
      dateText: f.updatedAt ? f.updatedAt.slice(0, 10) : '最近',
      sizeText: f.size ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : '',
      badgeText,
      badgeColor,
      filePath: f.filePath,
    };
  });

  // Real schedules & memos from allMemos
  const targetDayStr = selectedWeekDay || todayStr;
  const selectedDayMemos: ScheduleItem[] = allMemos
    .filter((m) => m.date === targetDayStr)
    .map((m) => ({
      id: m.id,
      time: m.time && m.time !== '全天' ? m.time : '全天',
      title: m.content,
      tag: m.tag || '备忘',
      completed: m.completed,
      rawMemo: m,
    }));

  const realTodayMemos: ScheduleItem[] = allMemos
    .filter((m) => m.date === todayStr)
    .map((m) => ({
      id: m.id,
      time: m.time && m.time !== '全天' ? m.time : '全天',
      title: m.content,
      tag: m.tag || '备忘',
      completed: m.completed,
      rawMemo: m,
    }));

  const realTomorrowMemos: ScheduleItem[] = allMemos
    .filter((m) => m.date === addDays(todayStr, 1))
    .map((m) => ({
      id: m.id,
      time: m.time && m.time !== '全天' ? m.time : '全天',
      title: m.content,
      tag: m.tag || '备忘',
      completed: m.completed,
      rawMemo: m,
    }));

  // Time-based friendly greeting & user name
  const displayName = currentUser?.username?.trim() || '朋友';
  const greetingInfo = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) {
      return {
        greeting: '早上好',
        timeTag: '清晨时光',
        subtitle: '新的一天，充满活力与灵感',
      };
    }
    if (hour >= 9 && hour < 12) {
      return {
        greeting: '上午好',
        timeTag: '黄金上午',
        subtitle: '保持专注节奏，高效推进每一项待办',
      };
    }
    if (hour >= 12 && hour < 14) {
      return {
        greeting: '中午好',
        timeTag: '午间小憩',
        subtitle: '记得按时午餐，为下午储蓄能量',
      };
    }
    if (hour >= 14 && hour < 18) {
      return {
        greeting: '下午好',
        timeTag: '惬意午后',
        subtitle: '专注深度工作，收获满满成果',
      };
    }
    if (hour >= 18 && hour < 22) {
      return {
        greeting: '晚上好',
        timeTag: '温馨傍晚',
        subtitle: '盘点今日收获，享受轻松时刻',
      };
    }
    return {
      greeting: '夜深了',
      timeTag: '夜间模式',
      subtitle: '辛苦了一天，早点休息明日再战',
    };
  }, []);

  // Navigate date
  const changeDateBy = (offset: number) => {
    if (!onSelectDate) return;
    onSelectDate(addDays(selectedDate || todayStr, offset));
  };

  // Generate 7-Day Schedule Items (速版排列最近7天)
  const next7Days = useMemo(() => {
    const startDate = selectedDate || todayStr;
    return Array.from({ length: 7 }, (_, i) => {
      const dateStr = addDays(startDate, i);
      const d = parseLocalDate(dateStr);
      const isToday = dateStr === todayStr;
      const isTomorrow = dateStr === addDays(todayStr, 1);
      const isAfterTomorrow = dateStr === addDays(todayStr, 2);
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const shortWeekdays = ['日', '一', '二', '三', '四', '五', '六'];
      const dayOfWeek = weekdays[d.getDay()];
      const shortDayOfWeek = shortWeekdays[d.getDay()];
      const dayNum = d.getDate();
      const relativeLabel = isToday ? '今天' : isTomorrow ? '明天' : isAfterTomorrow ? '后天' : dayOfWeek;
      const monthDay = `${d.getMonth() + 1}月${d.getDate()}日`;
      const memos = allMemos
        .filter((m) => m.date === dateStr)
        .sort((a, b) => {
          const timeA = a.time && a.time !== '全天' ? a.time : '99:99';
          const timeB = b.time && b.time !== '全天' ? b.time : '99:99';
          return timeA.localeCompare(timeB);
        });

      return {
        dateStr,
        monthDay,
        dayOfWeek,
        shortDayOfWeek,
        dayNum,
        relativeLabel,
        isToday,
        memos,
      };
    });
  }, [selectedDate, todayStr, allMemos]);

  const scheduleWeekdays = useMemo(() => ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], []);
  const todayDisplay = useMemo(() => {
    const d = parseLocalDate(todayStr);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${scheduleWeekdays[d.getDay()]}`;
  }, [todayStr, scheduleWeekdays]);

  const tomorrowDisplay = useMemo(() => {
    const d = parseLocalDate(addDays(todayStr, 1));
    return `${d.getMonth() + 1}月${d.getDate()}日 ${scheduleWeekdays[d.getDay()]}`;
  }, [todayStr, scheduleWeekdays]);

  return (
    <div className="flex-1 h-screen overflow-y-auto px-6 py-5 custom-scrollbar select-none bg-transparent transition-colors duration-300">
      {/* 1. Top Header Bar */}
      <div className="relative z-30 flex items-center justify-between gap-4 mb-4 h-10">
        {/* Smart AI Search Bar */}
        <div className="flex-1 max-w-xl relative group h-10">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1677FF]">
            <Sparkles size={16} strokeWidth={1.8} />
          </div>
          <input
            type="text"
            value={smartNoteInput}
            onChange={(e) => setSmartNoteInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setIsSmartNoteOpen(true);
              }
            }}
            placeholder="AI 智能速记：输入任务、日程、笔记、会议纪要或灵感想法，按 Enter 识别..."
            className="block w-full h-10 pl-9 pr-20 text-xs rounded-full bg-white border border-slate-200/90 shadow-2xs focus:border-[#1677FF]/60 focus:ring-2 focus:ring-[#1677FF]/10 placeholder-slate-400 text-slate-800 focus:outline-none transition-all font-medium leading-normal"
          />
          <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center">
            <button
              type="button"
              onClick={() => setIsSmartNoteOpen(true)}
              className="h-7 px-2.5 rounded-full bg-blue-50/80 hover:bg-blue-100/90 active:bg-blue-200/70 border border-blue-200/80 text-[#1677FF] flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs hover:scale-102 active:scale-98 cursor-pointer group"
              title="让 AI 帮你安排 (点击唤起或按 Enter)"
            >
              <AgentThinking variant="stars" label="AI" showTimer={false} tone="accent" shimmer={true} />
            </button>
          </div>
        </div>

        {/* Right Info Section */}
        <div className="flex items-center gap-3 h-10 flex-shrink-0">
          {/* Date Indicator Pill */}
          <div
            onClick={() => {
              if (selectedDate !== todayStr) {
                onSelectDate?.(todayStr);
                setSelectedWeekDay(todayStr);
              }
            }}
            className={`h-10 px-3.5 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2 text-xs text-slate-600 font-medium select-none ${
              selectedDate !== todayStr ? 'cursor-pointer hover:border-blue-300 hover:text-[#1677FF] transition-colors' : ''
            }`}
            title={selectedDate !== todayStr ? '点击回到今天' : undefined}
          >
            <CalendarIcon size={14} strokeWidth={1.75} className="text-slate-500" />
            <span>{formatChineseDate(selectedDate || todayStr)}</span>
            {selectedDate !== todayStr ? (
              <span className="text-[10px] bg-blue-50 text-[#1677FF] px-1.5 py-0.5 rounded-full font-medium">
                回到今日
              </span>
            ) : (
              <ChevronDown size={12} className="text-slate-400" />
            )}
          </div>

          {/* Notifications Bell Popover Button */}
          <div className="h-10 flex items-center">
            <NotificationPopover
              tasks={tasks}
              onToggleTask={onToggleTask}
              onNavigate={onNavigateView}
            />
          </div>
        </div>
      </div>

      {/* 2. Hero Greeting Banner */}
      <div className="relative rounded-2xl bg-white border border-slate-200/80 shadow-2xs px-6 py-4 mb-4.5 overflow-hidden flex items-center justify-between min-h-[92px]">
        {/* Left Typography & Dynamic Orb */}
        <div className="relative z-10 flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-150 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <div className="scale-[0.55] flex items-center justify-center">
              <ThinkingOrb state="weaving" size={64} theme="light" />
            </div>
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 select-none">
              {greetingInfo.greeting}，{displayName}
            </h2>
            <p className="text-xs font-normal text-slate-500 mt-1">
              {greetingInfo.subtitle || '记得按时吃午餐，为下午储备能量 ☕'}
            </p>
          </div>
        </div>

        {/* Right Quote & Realistic Snow Mountain */}
        <div className="relative z-10 flex items-center h-full flex-shrink-0">
          <div className="text-right text-xs text-slate-500 font-normal leading-relaxed mr-2 select-none">
            <div>「 好的计划，</div>
            <div className="pl-4">是成功的一半 」</div>
          </div>
          {/* Spacer keeping quote comfortably clear of the mountain crests */}
          <div className="w-[180px] h-[76px] pointer-events-none" />
        </div>

        {/* Realistic Snow Mountain seamless right-bleed artwork */}
        <div className="absolute right-0 top-0 bottom-0 w-[500px] pointer-events-none overflow-hidden z-0">
          <img
            src={snowMountainImg}
            alt="雪山"
            className="w-full h-full object-cover object-[right_center]"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.04) 15%, rgba(0, 0, 0, 0.4) 30%, black 58%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.04) 15%, rgba(0, 0, 0, 0.4) 30%, black 58%)',
            }}
          />
        </div>
      </div>

      {/* 3. Dashboard 3-Column Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4.5 items-stretch mb-4">
        {/* COLUMN 1: 今日待办 (Top) + 常用工具 (Bottom) */}
        <div className="flex flex-col gap-4.5">
          {/* CARD 1: 今日待办 */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between flex-1">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <CheckSquare size={17} className="text-[#1677FF]" />
                  <h3 className="text-sm font-bold text-slate-800">今日待办</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTaskToEdit(null);
                      setIsTodoModalOpen(true);
                    }}
                    className="h-6 px-2.5 rounded-full bg-blue-50/90 hover:bg-[#1677FF] text-[#1677FF] hover:text-white border border-blue-200/80 hover:border-[#1677FF] flex items-center gap-1 text-xs font-semibold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                    title="快速添加待办事项"
                  >
                    <Plus size={12} strokeWidth={2.5} />
                    <span>快速添加</span>
                  </button>
                  <span className="bg-slate-100 text-slate-500 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    全部 {displayTasks.length || 5}
                  </span>
                </div>
              </div>

              {/* Progress Bar & Percentage */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="text-slate-400 font-normal">
                    {completedNum} / {totalNum} 已完成
                  </span>
                  <span className="bg-blue-50 text-[#1677FF] text-xs px-2 py-0.5 rounded-full font-semibold">
                    {progressPercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-[#1677FF] rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Task Items List */}
              <div className="flex flex-col gap-2.5">
                {displayTasks.map((t) => (
                  <div 
                    key={t.id}
                    className="flex items-center justify-between gap-3 text-xs group py-0.5 transition-all"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTaskItem(t.id, t.completed)}
                        className="flex-shrink-0 cursor-pointer text-slate-400 hover:text-[#1677FF] transition-colors"
                        title={t.completed ? "标为未完成" : "完成任务（记录耗时）"}
                      >
                        {t.completed ? (
                          <div className="w-4 h-4 rounded-full bg-[#1677FF] text-white flex items-center justify-center">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 hover:border-[#1677FF] transition-colors" />
                        )}
                      </button>
                      <span 
                        onClick={() => {
                          const fullTask = tasks.find((x) => x.id === t.id);
                          if (fullTask) {
                            setTaskToEdit(fullTask);
                            setIsTodoModalOpen(true);
                          }
                        }}
                        className={`truncate text-xs cursor-pointer hover:text-[#1677FF] transition-colors ${t.completed ? 'text-slate-400 line-through' : 'text-slate-800 font-medium'}`}
                        title="点击编辑待办"
                      >
                        {t.title}
                      </span>
                      {t.tag && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                          t.tag === '会议' ? 'bg-purple-50 text-purple-600' :
                          t.tag === '客户' ? 'bg-emerald-50 text-emerald-600' :
                          t.tag === '学习' ? 'bg-slate-100 text-slate-600' :
                          'bg-blue-50 text-[#1677FF]'
                        }`}>
                          {t.tag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-slate-400 font-mono">{t.time}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTaskItem(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-0.5 transition-opacity cursor-pointer"
                        title="删除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setTaskToEdit(null);
                  setIsTodoModalOpen(true);
                }}
                className="text-xs text-[#1677FF] hover:text-blue-700 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                title="新建待办事项"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>新建待办</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateView?.('todos')}
                className="text-xs text-slate-400 hover:text-[#1677FF] transition-colors inline-flex items-center justify-center gap-1 cursor-pointer font-medium"
              >
                <span>查看全部待办 ({tasks.length})</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* CARD 2: 常用工具 */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wrench size={17} className="text-[#1677FF]" />
                  <h3 className="text-sm font-bold text-slate-800">常用工具</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsToolConfigModalOpen(true)}
                  className="text-xs text-slate-400 hover:text-[#1677FF] flex items-center gap-0.5 cursor-pointer hover:bg-slate-50 px-1.5 py-0.5 rounded transition-colors font-medium"
                  title="自定义在此页面展示的功能"
                >
                  <span>自定义</span>
                  <ChevronDown size={12} />
                </button>
              </div>

              {/* Horizontal Tool Cards in a Row with Colored Round Icons */}
              <div className={`grid ${visibleTools.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'} gap-2.5`}>
                {visibleTools.map((tool) => {
                  const ToolIcon = tool.icon;
                  const isRunningThis = tool.id === 'countdown' && (isRunning || isPaused);

                  return (
                    <div 
                      key={tool.id}
                      onClick={() => handleDashboardToolClick(tool.id)}
                      className="rounded-2xl border border-slate-150 bg-slate-50/40 hover:bg-white hover:border-blue-200 hover:shadow-xs p-3.5 flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer group relative"
                      title={`打开 ${tool.name}`}
                    >
                      {isRunningThis && (
                        <span className="absolute top-2 right-2 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1677FF] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1677FF]"></span>
                        </span>
                      )}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0 ${tool.iconBoxBg}`}>
                        <ToolIcon size={18} strokeWidth={2} />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 leading-tight group-hover:text-[#1677FF] transition-colors truncate w-full">
                        {tool.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 mt-4 text-center">
              <button
                type="button"
                onClick={() => onNavigateView?.('tools')}
                className="text-xs text-slate-400 hover:text-[#1677FF] transition-colors inline-flex items-center justify-center gap-1 cursor-pointer font-medium"
              >
                <span>查看全部工具 ({TOOL_ITEMS.length})</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* COLUMN 2: 快速记录 (Top) + 最近文件 (Bottom) */}
        <div className="flex flex-col gap-4.5">
          {/* CARD 3: 快速记录 */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between flex-1">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Edit3 size={17} className="text-[#1677FF]" />
                  <h3 className="text-sm font-bold text-slate-800">快速记录</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs bg-slate-100/70 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setNoteFilter('all')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        noteFilter === 'all' ? 'bg-[#EBF4FF] text-[#1677FF] font-semibold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      全部
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteFilter('note')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        noteFilter === 'note' ? 'bg-[#EBF4FF] text-[#1677FF] font-semibold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      笔记
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteFilter('meeting')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        noteFilter === 'meeting' ? 'bg-[#EBF4FF] text-[#1677FF] font-semibold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      会议
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteFilter('idea')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        noteFilter === 'idea' ? 'bg-[#EBF4FF] text-[#1677FF] font-semibold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      灵感
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSmartNoteInput(quickNote);
                      setIsSmartNoteOpen(true);
                    }}
                    className="bg-blue-50/90 text-[#1677FF] hover:bg-blue-100 border border-blue-200/80 active:scale-95 text-xs px-2.5 py-1 rounded-lg font-semibold cursor-pointer flex items-center gap-1 transition-all shadow-2xs"
                    title="唤起 AI 智能识别 (支持一键解析待办、日程、笔记、会议、灵感)"
                  >
                    <Sparkles size={12} strokeWidth={2} />
                    <span>AI 识别</span>
                  </button>
                </div>
              </div>

              {/* Quick Input Bar with Blue + Button and AI recognition button */}
              <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 px-3 py-1.5 flex items-center justify-between gap-2 focus-within:bg-white focus-within:border-blue-400 transition-all mb-3">
                <input
                  type="text"
                  placeholder="记录想法、会议、灵感、日程或任务..."
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  onKeyDown={handleQuickNoteKeyDown}
                  className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSmartNoteInput(quickNote);
                      setIsSmartNoteOpen(true);
                    }}
                    className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1677FF] flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                    title="AI 智能多维识别 (自动归类为笔记/会议/灵感/待办/日程)"
                  >
                    <Sparkles size={13} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuickNote}
                    className="w-7 h-7 rounded-full bg-[#1677FF] hover:bg-blue-600 text-white flex items-center justify-center shadow-xs cursor-pointer flex-shrink-0 transition-transform active:scale-95"
                    title="直接快速保存"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Section Label */}
              <div className="text-xs text-slate-400 font-medium mb-2.5">最近记录</div>

              {/* Note Items */}
              <div className="flex flex-col gap-2.5">
                {displayNotesList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    暂无记录，输入想法后按回车保存
                  </div>
                ) : (
                  displayNotesList.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => item.rawNote && setEditingNote(item.rawNote)}
                      className="rounded-xl p-2 -mx-2 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1677FF] flex items-center justify-center flex-shrink-0">
                          {item.iconType === 'calendar' ? <CalendarIcon size={16} /> : <FileText size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-slate-400 font-mono">
                          {item.time}
                        </span>
                        {item.rawNote && onDeleteNote && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteNote(item.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-opacity cursor-pointer flex-shrink-0"
                            title="删除记录"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 mt-4 text-center">
              <button
                type="button"
                onClick={onViewAllNotes}
                className="text-xs text-slate-400 hover:text-[#1677FF] transition-colors inline-flex items-center justify-center gap-1 cursor-pointer font-medium"
              >
                <span>全部记录 ({notes.length})</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* CARD 4: 最近文件 */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <FileText size={17} className="text-[#1677FF]" />
                  <h3 className="text-sm font-bold text-slate-800">最近文件</h3>
                </div>
                <button 
                  type="button"
                  onClick={handlePickLocalFile}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title="上传或查看文件"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              {/* File items */}
              <div className="flex flex-col gap-2.5">
                {displayFilesList.length === 0 ? (
                  <div 
                    onClick={handlePickLocalFile}
                    className="py-7 px-4 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-[#1677FF] mb-2 transition-colors">
                      <Plus size={16} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">暂无关联文件</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">点击选择本地文件以关联到工作台</p>
                  </div>
                ) : (
                  displayFilesList.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        if (f.filePath) {
                          api.openFile(f.filePath, f.id);
                        }
                      }}
                      className="flex items-center justify-between gap-3 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 ${f.badgeColor}`}>
                          {f.badgeText}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-[#1677FF] transition-colors">
                            {f.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                            {f.dateText} · {f.sizeText}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 mt-4 text-center">
              <button
                type="button"
                onClick={onViewAllFiles}
                className="text-xs text-slate-400 hover:text-[#1677FF] transition-colors inline-flex items-center justify-center gap-1 cursor-pointer font-medium"
              >
                <span>查看全部文件 ({dashboardFiles.length})</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* COLUMN 3: 日程安排 (Spans Full Height of Both Rows!) */}
        <div className="flex flex-col">
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between h-full">
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-3.5 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={17} className="text-[#1677FF]" />
                  <h3 className="text-sm font-bold text-slate-800">日程安排</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-0.5 cursor-pointer">
                    <span>近7天</span>
                    <ChevronDown size={12} />
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddDate(todayStr);
                      setIsQuickAddMemo(true);
                    }}
                    className="bg-[#EBF4FF] hover:bg-blue-100 text-[#1677FF] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus size={12} strokeWidth={2.5} />
                    <span>新建</span>
                  </button>
                </div>
              </div>

              {/* Week Range Bar: < 9月7日 - 9月13日 > */}
              <div className="flex items-center justify-between px-2 py-1 mb-2 text-xs text-slate-700 font-semibold flex-shrink-0">
                <button
                  type="button"
                  onClick={() => changeDateBy(-7)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  title="上一周"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700">
                    {next7Days[0]?.monthDay} - {next7Days[6]?.monthDay}
                  </span>
                  {selectedDate !== todayStr && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDate?.(todayStr);
                        setSelectedWeekDay(todayStr);
                      }}
                      className="text-[11px] font-normal text-[#1677FF] hover:underline cursor-pointer bg-blue-50 px-1.5 py-0.5 rounded"
                      title="快速返回今天"
                    >
                      回到今日
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => changeDateBy(7)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  title="下一周"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* 7-Day Day Selector Bar */}
              <div className="grid grid-cols-7 gap-1 pb-3 mb-3 border-b border-slate-100 flex-shrink-0">
                {next7Days.map((d) => {
                  const isSelected = selectedWeekDay === d.dateStr || (!selectedWeekDay && d.isToday);
                  const hasMemos = d.memos.length > 0;
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => setSelectedWeekDay(d.dateStr)}
                      className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#EBF4FF] text-[#1677FF] font-bold'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[11px] font-medium opacity-75">{d.shortDayOfWeek}</span>
                      <span className="text-xs font-bold font-mono mt-0.5">{d.dayNum}</span>
                      <div className="h-1.5 mt-1 flex items-center justify-center">
                        {hasMemos ? (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#1677FF]' : 'bg-blue-400'}`} />
                        ) : isSelected ? (
                          <span className="w-1 h-1 rounded-full bg-[#1677FF]" />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Schedule Groups: 今日 + 明日 (及已选日期) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
                {/* Optional Selected Day (when user clicks a day that is not today and not tomorrow) */}
                {selectedWeekDay && selectedWeekDay !== todayStr && selectedWeekDay !== addDays(todayStr, 1) && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1677FF]" />
                        <span>已选 {next7Days.find(d => d.dateStr === selectedWeekDay)?.monthDay || selectedWeekDay} {next7Days.find(d => d.dateStr === selectedWeekDay)?.dayOfWeek}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAddDate(selectedWeekDay);
                          setIsQuickAddMemo(true);
                        }}
                        className="text-slate-400 hover:text-[#1677FF] p-0.5 cursor-pointer"
                        title="在此日期添加日程"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {selectedDayMemos.length === 0 ? (
                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50/60 text-xs text-slate-400">
                        <span>该日暂无日程安排</span>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAddDate(selectedWeekDay);
                            setIsQuickAddMemo(true);
                          }}
                          className="text-[#1677FF] hover:underline font-medium text-xs flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>添加</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedDayMemos.map((s) => (
                          <div key={s.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-blue-50/30 border border-blue-100/60 transition-colors group">
                            <span className="w-14 text-slate-400 font-mono text-[11px] flex-shrink-0">{s.time}</span>
                            <span className={`flex-1 font-medium truncate pr-2 ${s.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{s.title}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-[#1677FF]">
                                {s.tag}
                              </span>
                              {s.rawMemo && (
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMemoStatus(s.rawMemo!)}
                                    className="p-0.5 text-slate-400 hover:text-[#1677FF] cursor-pointer"
                                    title={s.completed ? "标记未完成" : "标记完成"}
                                  >
                                    <CheckSquare size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMemo(s.id!)}
                                    className="p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                                    title="删除日程"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Group: 今日 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">
                      今日 {todayDisplay}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAddDate(todayStr);
                        setIsQuickAddMemo(true);
                      }}
                      className="text-slate-400 hover:text-[#1677FF] p-0.5 cursor-pointer"
                      title="添加今日日程"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {realTodayMemos.length === 0 ? (
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50/60 text-xs text-slate-400">
                      <span>今日暂无日程安排</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAddDate(todayStr);
                          setIsQuickAddMemo(true);
                        }}
                        className="text-[#1677FF] hover:underline font-medium text-xs flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>添加</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {realTodayMemos.map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors group">
                          <span className="w-14 text-slate-400 font-mono text-[11px] flex-shrink-0">{s.time}</span>
                          <span className={`flex-1 font-medium truncate pr-2 ${s.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{s.title}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-[#1677FF]">
                              {s.tag}
                            </span>
                            {s.rawMemo && (
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleToggleMemoStatus(s.rawMemo!)}
                                  className="p-0.5 text-slate-400 hover:text-[#1677FF] cursor-pointer"
                                  title={s.completed ? "标记未完成" : "标记完成"}
                                >
                                  <CheckSquare size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMemo(s.id!)}
                                  className="p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                                  title="删除日程"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Group: 明日 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">
                      明日 {tomorrowDisplay}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAddDate(addDays(todayStr, 1));
                        setIsQuickAddMemo(true);
                      }}
                      className="text-slate-400 hover:text-[#1677FF] p-0.5 cursor-pointer"
                      title="添加明日日程"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {realTomorrowMemos.length === 0 ? (
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50/60 text-xs text-slate-400">
                      <span>明日暂无日程安排</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAddDate(addDays(todayStr, 1));
                          setIsQuickAddMemo(true);
                        }}
                        className="text-[#1677FF] hover:underline font-medium text-xs flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>添加</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {realTomorrowMemos.map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors group">
                          <span className="w-14 text-slate-400 font-mono text-[11px] flex-shrink-0">{s.time}</span>
                          <span className={`flex-1 font-medium truncate pr-2 ${s.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{s.title}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-[#1677FF]">
                              {s.tag}
                            </span>
                            {s.rawMemo && (
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleToggleMemoStatus(s.rawMemo!)}
                                  className="p-0.5 text-slate-400 hover:text-[#1677FF] cursor-pointer"
                                  title={s.completed ? "标记未完成" : "标记完成"}
                                >
                                  <CheckSquare size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMemo(s.id!)}
                                  className="p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                                  title="删除日程"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 mt-4 text-center flex-shrink-0">
              <button
                type="button"
                onClick={() => onNavigateView?.('calendar')}
                className="text-xs text-slate-400 hover:text-[#1677FF] transition-colors inline-flex items-center justify-center gap-1 cursor-pointer font-medium"
              >
                <span>查看更多日程</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Motivation Banner */}
      <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 px-5 flex items-center justify-between shadow-2xs overflow-hidden relative">
        <div className="flex items-center gap-2.5 z-10">
          <Sun size={18} className="text-amber-500 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">今天也要加油呀！</span>
            <span className="text-xs text-slate-400 font-normal">专注当下，未来可期。</span>
          </div>
        </div>
        <div className="flex items-center gap-3 z-10">
          <SnowMountainArtwork height={38} />
          <ChevronRight size={15} className="text-slate-400" />
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
        onDirectComplete={async (taskId) => {
          if (onUpdateTask) {
            await onUpdateTask(taskId, {
              completed: true,
              completedAt: new Date().toISOString(),
            });
          } else {
            onToggleTask(taskId, true);
          }
          setCompletingTask(null);
        }}
      />

      {/* POPUP MODAL 2: 新建/查看修改快速笔记/记录对话框 */}
      <AddNoteModal
        isOpen={isNoteModalOpen || !!editingNote}
        noteToEdit={editingNote}
        onClose={() => {
          setIsNoteModalOpen(false);
          setEditingNote(null);
        }}
        onConfirm={async (noteData) => {
          if (editingNote && onUpdateNote) {
            await onUpdateNote(editingNote.id, noteData);
            setEditingNote(null);
          } else if (onAddNote) {
            await onAddNote(noteData);
            setIsNoteModalOpen(false);
          }
        }}
        initialDate={selectedDate || todayStr}
        initialType="note"
        allowedTypes={['note', 'meeting', 'idea', 'retrospective']}
      />

      {/* POPUP MODAL 3: 智能速记多维 AI 语义识别对话框 */}
      {isSmartNoteOpen && (
        <SmartNoteModal
          isOpen={isSmartNoteOpen}
          onClose={() => setIsSmartNoteOpen(false)}
          initialText={smartNoteInput}
          onAddTasks={async (newTasks) => {
            for (const t of newTasks) {
              await onAddTask(t);
            }
            setSmartNoteInput('');
          }}
          onAddNotes={async (newNotes) => {
            for (const n of newNotes) {
              if (onAddNote) {
                await onAddNote(n);
              } else {
                await api.createNote(n);
              }
            }
            setSmartNoteInput('');
          }}
          onAddSchedules={async (newSchedules) => {
            for (const s of newSchedules) {
              await api.createMemo({
                date: s.date,
                time: s.time || '全天',
                content: s.content,
                completed: false,
                tag: s.tag,
              });
            }
            await loadMemos();
            window.dispatchEvent(new CustomEvent('workbench:sync', { detail: { entity: 'memos' } }));
            setSmartNoteInput('');
          }}
          onOpenSettings={onOpenSettings}
        />
      )}

      {/* POPUP MODAL 3.5: 新建日程安排备忘 */}
      {isQuickAddMemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl border border-slate-100 select-none animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1677FF] flex items-center justify-center">
                  <CalendarIcon size={16} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">新建日程安排</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">添加最近日程与备忘事项</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddMemo(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleQuickAddMemoSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-600 font-medium mb-1 block">日期</label>
                <input
                  type="date"
                  value={quickAddDate || todayStr}
                  onChange={(e) => setQuickAddDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#1677FF] text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium mb-1 block">时间</label>
                <input
                  type="text"
                  placeholder="例如: 09:30 - 11:00 或 全天"
                  value={newMemoTime}
                  onChange={(e) => setNewMemoTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#1677FF] text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium mb-1 block">日程内容</label>
                <input
                  type="text"
                  placeholder="请输入日程安排事项..."
                  value={newMemoContent}
                  onChange={(e) => setNewMemoContent(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#1677FF] text-slate-800"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddMemo(false)}
                  className="px-3.5 py-1.5 text-xs rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#1677FF] text-white hover:bg-blue-600 shadow-xs transition-colors cursor-pointer"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL 4: 自定义在此页面展示的功能 */}
      {isToolConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-150 shadow-2xl rounded-3xl w-full max-w-md p-6 select-none animate-scale-up">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1677FF] flex items-center justify-center">
                  <SlidersHorizontal size={16} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">自定义在此页面展示的功能</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">勾选要在首页「常用工具」中展示的工具卡片</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsToolConfigModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-2.5 max-h-[360px] overflow-y-auto custom-scrollbar">
              {TOOL_ITEMS.map((tool) => {
                const isSelected = visibleToolIds.includes(tool.id);
                const ToolIcon = tool.icon;

                return (
                  <div
                    key={tool.id}
                    onClick={() => handleToggleToolVisibility(tool.id)}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/50 border-[#1677FF]/30 shadow-2xs'
                        : 'bg-slate-50/60 border-slate-200/60 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${tool.iconBoxBg}`}
                      >
                        <ToolIcon size={18} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {tool.name}
                          </span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600">
                            {tool.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {tool.description}
                        </p>
                      </div>
                    </div>

                    {/* Switch Toggle */}
                    <div
                      className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                        isSelected ? 'bg-[#1677FF] justify-end' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white shadow-sm"></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                已选 {visibleToolIds.filter((id) => TOOL_ITEMS.some((t) => t.id === id)).length} / {TOOL_ITEMS.length} 个工具
              </span>
              <button
                type="button"
                onClick={() => setIsToolConfigModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer text-white bg-[#1677FF] hover:bg-blue-600"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL 5: 快速翻译 */}
      {isTranslateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-150 shadow-2xl rounded-3xl w-full max-w-lg p-6 select-none animate-scale-up">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Languages size={17} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">快速翻译</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">支持中英双向即时互译</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTranslateModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-3.5">
              {/* Language Switcher */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                <span className="font-semibold text-slate-700">
                  {translateLang === 'zh-en' ? '中文 (简体)' : 'English (英文)'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTranslateLang((prev) => (prev === 'zh-en' ? 'en-zh' : 'zh-en'));
                    setTranslateInput(translateOutput);
                    setTranslateOutput('');
                  }}
                  className="p-1 text-slate-500 hover:text-[#1677FF] hover:bg-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="切换语言方向"
                >
                  <ArrowRightLeft size={13} />
                  <span className="text-[11px]">切换</span>
                </button>
                <span className="font-semibold text-slate-700">
                  {translateLang === 'zh-en' ? 'English (英文)' : '中文 (简体)'}
                </span>
              </div>

              {/* Source Textarea */}
              <div>
                <textarea
                  rows={3}
                  value={translateInput}
                  onChange={(e) => setTranslateInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleTranslate();
                    }
                  }}
                  placeholder={translateLang === 'zh-en' ? '输入要翻译的中文内容 (按 Ctrl+Enter 快速翻译)...' : 'Type English text here (Ctrl+Enter to translate)...'}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#1677FF] text-slate-800 resize-none transition-colors"
                  autoFocus
                />
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={isTranslating || !translateInput.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#1677FF] text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isTranslating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>翻译中...</span>
                    </>
                  ) : (
                    <span>立即翻译</span>
                  )}
                </button>
              </div>

              {/* Result Area */}
              {translateOutput && (
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 relative group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-emerald-700">翻译结果</span>
                    <button
                      type="button"
                      onClick={handleCopyTranslateResult}
                      className="text-[11px] text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs"
                    >
                      {copiedTranslate ? (
                        <>
                          <Check size={12} className="text-emerald-600" />
                          <span>已复制</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>复制</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text font-sans">
                    {translateOutput}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL 6: 便携计算器 */}
      {isCalculatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-150 shadow-2xl rounded-3xl w-full max-w-xs p-5 select-none animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Calculator size={17} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">便携计算器</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">即时日常运算辅助</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCalculatorModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-3">
              {/* LCD Display */}
              <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-inner flex flex-col justify-between min-h-[72px]">
                <div className="text-[11px] text-slate-400 font-mono text-right truncate h-4">
                  {calcExpression || '0'}
                </div>
                <div className="text-2xl font-bold font-mono text-right truncate text-emerald-400">
                  {calcResult || (calcExpression ? calcExpression : '0')}
                </div>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'C', val: 'C', color: 'text-rose-500 bg-rose-50 hover:bg-rose-100' },
                  { label: 'DEL', val: 'DEL', color: 'text-slate-600 bg-slate-100 hover:bg-slate-200' },
                  { label: '(', val: '(', color: 'text-slate-600 bg-slate-100 hover:bg-slate-200' },
                  { label: ')', val: ')', color: 'text-slate-600 bg-slate-100 hover:bg-slate-200' },
                  
                  { label: '7', val: '7', color: 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
                  { label: '8', val: '8', color: 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
                  { label: '9', val: '9', color: 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
                  { label: '÷', val: '/', color: 'text-[#1677FF] bg-blue-50 hover:bg-blue-100' },

                  { label: '4', val: '4', color: 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
                  { label: '5', val: '5', color: 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
                  { label: '6', val: '6', color: 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
                  { label: '×', val: '*', color: 'text-[#1677FF] bg-blue-50 hover:bg-blue-100' },

                  { label: '1', val: '1', color: 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
                  { label: '2', val: '2', color: 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
                  { label: '3', val: '3', color: 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
                  { label: '-', val: '-', color: 'text-[#1677FF] bg-blue-50 hover:bg-blue-100' },

                  { label: '0', val: '0', color: 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
                  { label: '.', val: '.', color: 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
                  { label: '=', val: '=', color: 'text-white bg-[#1677FF] hover:bg-blue-600 font-bold shadow-xs' },
                  { label: '+', val: '+', color: 'text-[#1677FF] bg-blue-50 hover:bg-blue-100' },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => handleCalcInput(btn.val)}
                    className={`h-11 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center cursor-pointer active:scale-95 ${btn.color}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Action */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleCopyCalcResult}
                  className="text-xs text-[#1677FF] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  {copiedCalc ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedCalc ? '已复制结果' : '复制计算结果'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCalculatorModalOpen(false)}
                  className="px-3.5 py-1 text-xs font-semibold rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainDashboard;

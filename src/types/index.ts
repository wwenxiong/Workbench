export type Priority = 'p1' | 'p2' | 'p3' | 'p4';

export type RecurringFrequency = 'daily' | 'workday' | 'weekly';

export interface RecurringConfig {
  frequency: RecurringFrequency;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD, optional/null for perpetual
}

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  estimatedMinutes: number;
  actualMinutes: number;
  tags: string[];
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  order?: number;
  isRecurring?: boolean;
  recurringConfig?: RecurringConfig;
  recurringParentId?: string;
  timeSpan?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export type TimerMode = 'pomodoro' | 'stopwatch';

export interface FocusLog {
  id: string;
  taskId: string | null;
  taskTitle: string;
  mode: TimerMode;
  durationSeconds: number;
  durationMinutes: number;
  timestamp: string;
  date: string;
  note?: string;
}

export interface DailyReport {
  date: string;
  deliverables: string;
  chronologicalDeliverables?: string;
  blockers: string;
  tomorrowPlan: string;
  customNotes?: string;
  completedTasksCount: number;
  totalFocusMinutes: number;
  completedTasks?: Task[];
  incompleteTasks?: Task[];
  tomorrowRecurringTasks?: Array<{ id: string; title: string; frequency?: string }>;
  tomorrowTasksList?: string[];
  syncedToExcel: boolean;
  syncedAt: string | null;
  updatedAt?: string | null;
}

export interface WeeklyReportData {
  startDate: string;
  endDate: string;
  workdayEndDate: string;
  totalCompletedTasks: number;
  totalFocusMinutes: number;
  completedTasks: Task[];
  weeklyDraft: string;
}

export interface MonitoredCell {
  label: string;
  sheet: string;
  cell: string;
  value?: string;
  error?: boolean;
}

export interface ExcelConfig {
  id: string;
  name: string;
  category: string;
  filePath: string;
  targetSheet: string;
  isAnnualLedger?: boolean;
  monitoredCells: MonitoredCell[];
}

export interface LinkedFile {
  id: string;
  name: string;
  filePath: string;
  fileType: string;
  size?: number;
  category?: string;
  createdAt: string;
  updatedAt?: string;
  lastOpenedAt?: string | null;
  isPinned?: boolean;
  notes?: string;
}

export interface CellSnapshotResult {
  lastModified: string;
  results: Array<{
    label: string;
    sheet: string;
    cell: string;
    value: string;
    error: boolean;
  }>;
}

export interface CalendarDaySummary {
  totalTasks: number;
  completedTasks: number;
  focusMinutes: number;
  hasReport: boolean;
  status: 'green' | 'yellow' | 'red' | 'gray';
}

// Quick Record / Notes
export type NoteType = 'daily_report' | 'note' | 'meeting' | 'idea' | 'retrospective';

export interface Note {
  id: string;
  type: NoteType;
  title?: string;
  content: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  tags: string[];
  isPinned?: boolean;
  bg?: string;
  createdAt: string;
  updatedAt: string;
  dailyReportData?: {
    deliverables: string;
    blockers: string;
    tomorrowPlan: string;
    completedCount: number;
    focusMinutes: number;
  };
}

// Calendar Date Memo (独立日程备忘，与工作日报彻底解耦)
export interface DateMemo {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "14:30" or "全天"
  content: string;
  completed: boolean;
  tag?: string;
  createdAt: string;
  updatedAt: string;
}

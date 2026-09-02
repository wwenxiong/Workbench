import type {
  Task,
  FocusLog,
  DailyReport,
  WeeklyReportData,
  ExcelConfig,
  CellSnapshotResult,
  CalendarDaySummary,
  MonitoredCell,
  Note,
  DateMemo,
  LinkedFile
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `请求失败: ${res.status}`);
  }
  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Tasks
  getTasks: (date?: string) => request<Task[]>(`/tasks${date ? `?date=${date}` : ''}`),
  createTask: (task: Partial<Task>) =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),
  updateTask: (id: string, updates: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deleteTask: (id: string) =>
    request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    }),
  reorderTasks: (taskIds: string[]) =>
    request<Task[]>('/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify({ taskIds }),
    }),

  // Focus logs
  getFocusLogs: (date?: string) =>
    request<FocusLog[]>(`/focus-logs${date ? `?date=${date}` : ''}`),
  createFocusLog: (data: {
    taskId?: string | null;
    mode: string;
    durationSeconds: number;
    note?: string;
  }) =>
    request<FocusLog>('/focus-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Quick Records & Notes
  getNotes: (params?: { type?: string; date?: string }) => {
    const query = new URLSearchParams();
    if (params?.type && params.type !== 'all') query.set('type', params.type);
    if (params?.date) query.set('date', params.date);
    const qs = query.toString();
    return request<Note[]>(`/notes${qs ? `?${qs}` : ''}`);
  },
  createNote: (data: Partial<Note>) =>
    request<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateNote: (id: string, data: Partial<Note>) =>
    request<Note>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteNote: (id: string) =>
    request<void>(`/notes/${id}`, {
      method: 'DELETE',
    }),

  // Calendar Date Memos (独立日程备忘)
  getMemos: (date?: string) =>
    request<DateMemo[]>(`/memos${date ? `?date=${date}` : ''}`),
  createMemo: (data: Partial<DateMemo>) =>
    request<DateMemo>('/memos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMemo: (id: string, data: Partial<DateMemo>) =>
    request<DateMemo>(`/memos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteMemo: (id: string) =>
    request<void>(`/memos/${id}`, {
      method: 'DELETE',
    }),

  // Reports
  getDailyReport: (date: string) => request<DailyReport>(`/reports/daily/${date}`),
  getAllDailyReports: () => request<DailyReport[]>('/reports/daily-list'),
  saveDailyReport: (date: string, report: Partial<DailyReport>) =>
    request<DailyReport>(`/reports/daily/${date}`, {
      method: 'POST',
      body: JSON.stringify(report),
    }),
  deleteDailyReport: (date: string) =>
    request<void>(`/reports/daily/${date}`, {
      method: 'DELETE',
    }),
  getExportExcelUrl: (params: { startDate?: string; endDate?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (params.date) q.set('date', params.date);
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    return `/api/reports/export/excel?${q.toString()}`;
  },
  getWeeklyReport: (date?: string) =>
    request<WeeklyReportData>(`/reports/weekly${date ? `?date=${date}` : ''}`),

  // Calendar summary
  getCalendarSummary: () =>
    request<Record<string, CalendarDaySummary>>('/calendar/summary'),

  // Excel Hub
  getExcelConfigs: () => request<ExcelConfig[]>('/excel/configs'),
  createExcelConfig: (config: Partial<ExcelConfig>) =>
    request<ExcelConfig>('/excel/configs', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  updateExcelConfig: (id: string, config: Partial<ExcelConfig>) =>
    request<ExcelConfig>(`/excel/configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  deleteExcelConfig: (id: string) =>
    request<void>(`/excel/configs/${id}`, {
      method: 'DELETE',
    }),
  openExcelFile: (filePath: string) =>
    request<{ message: string }>('/excel/open', {
      method: 'POST',
      body: JSON.stringify({ filePath }),
    }),
  readExcelSnapshot: (filePath: string, cells: MonitoredCell[]) =>
    request<CellSnapshotResult>('/excel/snapshot', {
      method: 'POST',
      body: JSON.stringify({ filePath, cells }),
    }),
  appendDailyToExcel: (payload: {
    configId?: string;
    date: string;
    deliverables: string;
    blockers: string;
    tomorrowPlan: string;
    totalFocusMinutes: number;
    completedCount: number;
  }) =>
    request<{ message: string; syncedAt: string }>('/excel/append-daily', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Linked Files Hub
  getFiles: () => request<LinkedFile[]>('/files'),
  addFile: (fileData: Partial<LinkedFile> & { fileData?: string }) =>
    request<LinkedFile>('/files', {
      method: 'POST',
      body: JSON.stringify(fileData),
    }),
  updateFile: (id: string, updates: Partial<LinkedFile>) =>
    request<LinkedFile>(`/files/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deleteFile: (id: string) =>
    request<void>(`/files/${id}`, {
      method: 'DELETE',
    }),
  openFile: (filePath: string, id?: string) =>
    request<{ message: string }>('/files/open', {
      method: 'POST',
      body: JSON.stringify({ filePath, id }),
    }),
  revealFile: (filePath: string) =>
    request<{ message: string }>('/files/reveal', {
      method: 'POST',
      body: JSON.stringify({ filePath }),
    }),
  pickFile: () =>
    request<{
      success: boolean;
      cancelled?: boolean;
      filePath?: string;
      fileName?: string;
      fileType?: string;
      size?: number;
      message?: string;
    }>('/files/pick', {
      method: 'POST',
    }),
};

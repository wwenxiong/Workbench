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
  LinkedFile,
  UserProfile,
  AiConfig,
  ParsedTaskItem,
  ParsedSmartItem
} from '../types';

const API_BASE = '/api';
const TOKEN_KEY = 'workbench_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string, remember: boolean = true) {
  try {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

export function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  // Do not set Content-Type for FormData uploads (browser will automatically set with boundary)
  if (!(options?.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    const isAuthEndpoint = url.startsWith('/auth/login') || url.startsWith('/auth/register');
    const errJson = await res.json().catch(() => ({}));
    if (!isAuthEndpoint) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('workbench:unauthorized'));
    }
    throw new Error(errJson.message || (isAuthEndpoint ? '密码错误，请重试' : '访问已受限，请登录'));
  }

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `请求失败: ${res.status}`);
  }
  return json.data !== undefined ? json.data : json;
}

export interface AuthStatus {
  authenticated: boolean;
  user: UserProfile | null;
  hasUsers?: boolean;
}

export const api = {
  // Authentication & Registration
  register: async (username: string, password: string, confirmPassword?: string) => {
    const data = await request<{ token: string; expiresAt: string; user: UserProfile }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ username, password, confirmPassword }),
      }
    );
    if (data.token) {
      setStoredToken(data.token, true);
    }
    return data;
  },

  login: async (username: string, password: string, rememberMe: boolean = true) => {
    const data = await request<{ token: string; expiresAt: string; user: UserProfile }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password, rememberMe }),
      }
    );
    if (data.token) {
      setStoredToken(data.token, rememberMe);
    }
    return data;
  },

  getAuthStatus: () => request<AuthStatus>('/auth/status'),

  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('workbench:unauthorized'));
    }
  },

  // User Profile & Settings
  updateUsername: (newUsername: string) =>
    request<UserProfile>('/user/username', {
      method: 'PUT',
      body: JSON.stringify({ newUsername }),
    }),

  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ message: string }>('/user/password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return request<{ avatarUrl: string }>('/user/avatar/upload', {
      method: 'POST',
      body: formData,
    });
  },

  setPresetAvatar: (avatarUrl: string) =>
    request<{ avatarUrl: string }>('/user/avatar/preset', {
      method: 'PUT',
      body: JSON.stringify({ avatarUrl }),
    }),

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

  // Calendar Date Memos
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
  saveDailyReport: (date: string, data: Partial<DailyReport>) =>
    request<DailyReport>(`/reports/daily/${date}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteDailyReport: (date: string) =>
    request<void>(`/reports/daily/${date}`, {
      method: 'DELETE',
    }),
  getDailyReportsList: () => request<DailyReport[]>('/reports/daily-list'),
  getAllDailyReports: () => request<DailyReport[]>('/reports/daily-list'),
  getWeeklyReport: (date?: string) =>
    request<WeeklyReportData>(`/reports/weekly${date ? `?date=${date}` : ''}`),
  getExportExcelUrl: (params?: { startDate?: string; endDate?: string; date?: string }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.date) query.set('date', params.date);
    const token = getStoredToken();
    if (token) query.set('token', token);
    const qs = query.toString();
    return `${API_BASE}/reports/export/excel${qs ? `?${qs}` : ''}`;
  },

  // Calendar Day Summaries
  getCalendarSummary: () =>
    request<Record<string, CalendarDaySummary>>('/calendar/summary'),

  // Excel Hub
  getExcelConfigs: () => request<ExcelConfig[]>('/excel/configs'),
  createExcelConfig: (config: Partial<ExcelConfig>) =>
    request<ExcelConfig>('/excel/configs', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  addExcelConfig: (config: Partial<ExcelConfig>) =>
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
    request<{ message: string; openedLocally?: boolean; downloadPath?: string }>('/excel/open', {
      method: 'POST',
      body: JSON.stringify({ filePath }),
    }),
  readExcelSnapshot: (filePath: string, cells: MonitoredCell[]) =>
    request<CellSnapshotResult>('/excel/snapshot', {
      method: 'POST',
      body: JSON.stringify({ filePath, cells }),
    }),
  getCellSnapshot: (filePath: string, cells: MonitoredCell[]) =>
    request<CellSnapshotResult>('/excel/snapshot', {
      method: 'POST',
      body: JSON.stringify({ filePath, cells }),
    }),
  appendDailyToExcel: (data: {
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
      body: JSON.stringify(data),
    }),

  // Linked Files Hub
  getFiles: () => request<LinkedFile[]>('/files'),
  addFile: (fileData: Partial<LinkedFile>) =>
    request<LinkedFile>('/files', {
      method: 'POST',
      body: JSON.stringify(fileData),
    }),
  uploadFile: (formData: FormData) =>
    request<LinkedFile>('/files/upload', {
      method: 'POST',
      body: formData,
    }),
  getFileDownloadUrl: (id: string) => {
    const token = getStoredToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_BASE}/files/download/${id}${tokenParam}`;
  },
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
    request<{
      message: string;
      openedLocally?: boolean;
      downloadUrl?: string;
    }>('/files/open', {
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

  // AI Configuration & NLU Task Parsing
  getAiConfig: () => request<AiConfig>('/ai/config'),
  saveAiConfig: (config: { baseUrl: string; apiKey?: string; model: string }) =>
    request<AiConfig>('/ai/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  testAiConnection: (config?: { baseUrl?: string; apiKey?: string; model?: string }) =>
    request<{ latencyMs: number; model: string; message: string; reply?: string }>('/ai/test', {
      method: 'POST',
      body: JSON.stringify(config || {}),
    }),
  parseTaskWithAi: (text: string) =>
    request<{ items?: ParsedSmartItem[]; tasks: ParsedTaskItem[]; rawContent?: string }>('/ai/parse-task', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};

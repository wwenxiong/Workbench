import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import ExcelJS from 'exceljs';
import multer from 'multer';
import db, {
  userRepo,
  authRepo,
  taskRepo,
  focusRepo,
  dailyReportRepo,
  noteRepo,
  memoRepo,
  excelConfigRepo,
  fileRepo,
  aiConfigRepo
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Directories
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

// Serve static uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer storage for cross-platform multi-device uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);
    cb(null, `${base}_${unique}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit

// Avatar upload configuration (2MB limit, JPG/PNG/WebP, anti-overwrite unique hash)
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATARS_DIR),
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'u';
    const rand = crypto.randomBytes(4).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `avatar_${userId}_${Date.now()}_${rand}${ext}`);
  }
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('头像格式仅支持 JPG、PNG 或 WebP'));
    }
  }
});

// ==================== MULTI-DEVICE REAL-TIME SYNC (SSE) ====================

const sseClients = new Set();

function broadcastSync(entity, action, data = null) {
  const payload = JSON.stringify({
    entity,
    action,
    timestamp: Date.now(),
    data
  });
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

// SSE Connection Endpoint (with token check support)
app.get('/api/sync/events', (req, res) => {
  const token = req.query.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (!authRepo.validateSession(token)) {
    return res.status(401).json({ success: false, message: 'SSE Unauthorized' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write('data: {"type":"connected","timestamp":' + Date.now() + '}\n\n');
  sseClients.add(res);

  // Heartbeat to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(':heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// ==================== AUTHENTICATION MIDDLEWARE & APIS ====================

// Public white-list endpoints (no token required)
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/status'
];

// Auth middleware for all /api routes
app.use('/api', (req, res, next) => {
  const currentPath = req.originalUrl.split('?')[0];
  if (PUBLIC_PATHS.includes(currentPath)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7)
    : (req.headers['x-access-token'] || req.query.token);

  const user = authRepo.validateSession(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: '未授权或登录已过期，请重新登录',
      code: 'UNAUTHORIZED'
    });
  }

  req.authToken = token;
  req.user = user;
  next();
});

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password, confirmPassword } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
  }
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 16) {
    return res.status(400).json({ success: false, message: '用户名长度需在 2 到 16 个字符之间' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: '密码长度至少需 6 个字符' });
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ success: false, message: '两次输入的密码不一致' });
  }

  const presetNum = Math.floor(Math.random() * 8) + 1;
  const defaultAvatar = `/uploads/avatars/presets/avatar-${presetNum}.svg`;

  const result = userRepo.createUser(trimmed, password, defaultAvatar);
  if (!result.success) {
    return res.status(400).json(result);
  }

  const session = authRepo.createSession(result.user.id, 30);
  res.json({
    success: true,
    message: '注册成功',
    data: {
      token: session.token,
      expiresAt: session.expiresAt,
      user: result.user
    }
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password, rememberMe = true } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ success: false, message: '用户名不能为空' });
  }
  if (!password) {
    return res.status(400).json({ success: false, message: '密码不能为空' });
  }

  const user = userRepo.verifyUser(username.trim(), password);
  if (!user) {
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  }

  const days = rememberMe ? 30 : 1;
  const session = authRepo.createSession(user.id, days);

  res.json({
    success: true,
    data: {
      token: session.token,
      expiresAt: session.expiresAt,
      user
    }
  });
});

// Auth Status check
app.get('/api/auth/status', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7)
    : (req.headers['x-access-token'] || req.query.token);

  const status = authRepo.getStatus(token);
  res.json({ success: true, data: status });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  if (req.authToken) {
    authRepo.revokeSession(req.authToken);
  }
  res.json({ success: true });
});

// ==================== USER PROFILE & SETTINGS APIS ====================

// Update Username
app.put('/api/user/username', (req, res) => {
  const { newUsername } = req.body;
  if (!newUsername || !newUsername.trim()) {
    return res.status(400).json({ success: false, message: '新用户名不能为空' });
  }
  const result = userRepo.updateUsername(req.user.id, newUsername);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json({ success: true, message: '用户名修改成功', data: result.user });
});

// Change Password
app.post('/api/user/password', (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: '原密码和新密码均不能为空' });
  }
  const result = userRepo.updatePassword(req.user.id, oldPassword, newPassword);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json({ success: true, message: '密码修改成功' });
});

// Legacy Change Password route compatibility
app.post('/api/auth/change-password', (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const result = userRepo.updatePassword(req.user.id, oldPassword, newPassword);
  if (!result.success) {
    return res.status(400).json(result);
  }
  const newSession = authRepo.createSession(req.user.id, 30);
  res.json({
    success: true,
    message: '密码修改成功',
    data: { token: newSession.token }
  });
});

// Custom Avatar Upload
app.post('/api/user/avatar/upload', (req, res) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || '头像上传失败' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的头像文件' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    userRepo.updateAvatar(req.user.id, avatarUrl);

    res.json({
      success: true,
      message: '头像上传成功',
      data: { avatarUrl }
    });
  });
});

// Set Preset Avatar
app.put('/api/user/avatar/preset', (req, res) => {
  const { avatarUrl } = req.body;
  if (!avatarUrl || typeof avatarUrl !== 'string') {
    return res.status(400).json({ success: false, message: '请选择预设头像' });
  }
  userRepo.updateAvatar(req.user.id, avatarUrl);
  res.json({
    success: true,
    message: '头像更换成功',
    data: { avatarUrl }
  });
});

// ==================== SAMPLE INITIALIZATION ====================

async function ensureSampleExcel(filePath) {
  if (fs.existsSync(filePath)) return;
  const workbook = new ExcelJS.Workbook();

  const kpiSheet = workbook.addWorksheet('指标看板');
  kpiSheet.columns = [
    { header: '指标名称', key: 'name', width: 22 },
    { header: '指标数值', key: 'value', width: 20 },
    { header: '单位/说明', key: 'desc', width: 25 },
  ];
  kpiSheet.addRow({ name: '年度累计已交付', value: '48 项', desc: '全年交付核心成果数' });
  kpiSheet.addRow({ name: '本月专注总学时(h)', value: '38.5', desc: '深度专注有效时长' });
  kpiSheet.addRow({ name: '待攻坚关键事项', value: '3 个', desc: '近期 P1 重点推进中' });

  kpiSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  kpiSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };

  const ledgerSheet = workbook.addWorksheet('工作日志台账');
  ledgerSheet.columns = [
    { header: '日期', key: 'date', width: 14 },
    { header: '今日交付成果', key: 'deliverables', width: 38 },
    { header: '未完成及阻塞项', key: 'blockers', width: 30 },
    { header: '明日计划', key: 'tomorrowPlan', width: 32 },
    { header: '专注耗时(分钟)', key: 'focusMinutes', width: 16 },
    { header: '完成待办数', key: 'completedCount', width: 14 },
    { header: '归档时间戳', key: 'syncedAt', width: 22 }
  ];
  ledgerSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ledgerSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }
  };

  ledgerSheet.addRow({
    date: '2026-09-01',
    deliverables: '1. 完成项目需求文档审阅与可行性分析；\n2. 确认工作台五大模块技术架构。',
    blockers: '无明显阻塞。',
    tomorrowPlan: '1. 搭建全栈开发环境；\n2. 联调待办与时钟联动。',
    focusMinutes: 125,
    completedCount: 4,
    syncedAt: '2026-09-01 18:30:00'
  });

  await workbook.xlsx.writeFile(filePath);
}

const demoExcelPath = path.join(DATA_DIR, 'demo_ledger.xlsx');
if (!fs.existsSync(demoExcelPath)) {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('工作日志台账');
    ws.columns = [
      { header: '日期', key: 'date', width: 14 },
      { header: '今日工作成果', key: 'deliverables', width: 40 },
      { header: '明日计划', key: 'tomorrowPlan', width: 30 },
      { header: '完成数', key: 'completedCount', width: 10 },
      { header: '归档时间', key: 'syncedAt', width: 22 }
    ];
    ws.addRow({
      date: '2026-09-02',
      deliverables: '两江区域异常小区监控通报（完成时间：8-9点，20分钟）',
      tomorrowPlan: '日常运维巡检',
      completedCount: 5,
      syncedAt: new Date().toLocaleString()
    });
    wb.xlsx.writeFile(demoExcelPath);
  } catch (e) {
    console.error('Failed to create demo Excel:', e);
  }
}

(async () => {
  const configs = excelConfigRepo.getAll();
  const sample = configs.find(c => c.id === 'cfg_sample_ledger');
  if (sample && sample.filePath) {
    await ensureSampleExcel(sample.filePath);
  }
})();

// ==================== TASK APIS ====================

// Get all tasks (auto syncs recurring tasks for current day / target date)
app.get('/api/tasks', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const changed = taskRepo.syncRecurringTasks(date);
  if (changed) {
    broadcastSync('tasks', 'sync_recurring');
  }
  res.json({ success: true, data: taskRepo.getAll() });
});

// Create task
app.post('/api/tasks', (req, res) => {
  const newTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: req.body.title || '新待办事项',
    priority: req.body.priority || 'p2',
    estimatedMinutes: Number(req.body.estimatedMinutes) || 25,
    actualMinutes: 0,
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    dueDate: req.body.dueDate || new Date().toISOString().slice(0, 10),
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    isRecurring: !!req.body.isRecurring,
    recurringConfig: req.body.recurringConfig || null,
    recurringParentId: req.body.recurringParentId || null,
    ...req.body
  };

  const created = taskRepo.create(newTask);

  if (newTask.isRecurring) {
    const today = new Date().toISOString().slice(0, 10);
    taskRepo.syncRecurringTasks(today);
  }

  broadcastSync('tasks', 'create', created);
  res.json({ success: true, data: created });
});

// Update task
app.put('/api/tasks/:id', (req, res) => {
  const existing = taskRepo.getById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: '任务不存在' });
  }

  const updates = { ...req.body };
  if (req.body.completed === true && !existing.completed) {
    updates.completedAt = req.body.completedAt || new Date().toISOString();
  } else if (req.body.completed === false) {
    updates.completedAt = null;
  }

  const updated = taskRepo.update(req.params.id, updates);
  broadcastSync('tasks', 'update', updated);
  res.json({ success: true, data: updated });
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  taskRepo.delete(req.params.id);
  broadcastSync('tasks', 'delete', { id: req.params.id });
  res.json({ success: true });
});

// Reorder tasks
app.post('/api/tasks/reorder', (req, res) => {
  const { taskIds } = req.body;
  if (!Array.isArray(taskIds)) {
    return res.status(400).json({ success: false, message: 'Invalid taskIds' });
  }
  const tasks = taskRepo.reorder(taskIds);
  broadcastSync('tasks', 'reorder', tasks);
  res.json({ success: true, data: tasks });
});

// ==================== FOCUS LOG APIS ====================

// Get focus logs
app.get('/api/focus-logs', (req, res) => {
  const { date } = req.query;
  const logs = focusRepo.getAll(date);
  res.json({ success: true, data: logs });
});

// Record focus log & link with task
app.post('/api/focus-logs', (req, res) => {
  const { taskId, mode, durationSeconds, note } = req.body;
  const durationSec = Number(durationSeconds) || 0;
  const durationMin = Math.round(durationSec / 60);

  let taskTitle = '';
  if (taskId) {
    const task = taskRepo.getById(taskId);
    if (task) {
      taskTitle = task.title;
      taskRepo.update(taskId, {
        actualMinutes: (task.actualMinutes || 0) + durationMin
      });
      broadcastSync('tasks', 'update');
    }
  }

  const newLog = focusRepo.create({
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    taskId: taskId || null,
    taskTitle: taskTitle || (mode === 'pomodoro' ? '番茄钟专注' : '正计时专注'),
    mode: mode || 'pomodoro',
    durationSeconds: durationSec,
    durationMinutes: durationMin,
    note: note || '',
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10)
  });

  broadcastSync('focus_logs', 'create', newLog);
  res.json({ success: true, data: newLog });
});

// ==================== QUICK RECORDS / NOTES APIS ====================

// Get notes (supports ?type= and ?date=)
app.get('/api/notes', (req, res) => {
  const { type, date } = req.query;
  const notes = noteRepo.getAll({ type, date });
  res.json({ success: true, data: notes });
});

// Create note
app.post('/api/notes', (req, res) => {
  const now = new Date();
  const noteDate = req.body.date || now.toISOString().slice(0, 10);
  const noteTime = req.body.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newNoteData = {
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: req.body.type || 'note',
    title: req.body.title || '',
    content: req.body.content || '',
    date: noteDate,
    time: noteTime,
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    isPinned: !!req.body.isPinned,
    bg: req.body.bg || 'bg-white',
    dailyReportData: req.body.dailyReportData || null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  const newNote = noteRepo.create(newNoteData);

  if (newNote.type === 'daily_report') {
    const prevRep = dailyReportRepo.getByDate(noteDate) || {};
    dailyReportRepo.save(noteDate, {
      date: noteDate,
      deliverables: newNote.dailyReportData?.deliverables || newNote.content || '工作成果已记录',
      blockers: newNote.dailyReportData?.blockers || '无明显阻塞',
      tomorrowPlan: newNote.dailyReportData?.tomorrowPlan || '按既定计划推进重点工作',
      customNotes: newNote.content,
      completedTasksCount: newNote.dailyReportData?.completedCount || 0,
      totalFocusMinutes: newNote.dailyReportData?.focusMinutes || 0,
      syncedToExcel: prevRep.syncedToExcel || false,
      syncedAt: prevRep.syncedAt || null,
      updatedAt: now.toISOString()
    });
    broadcastSync('reports', 'update');
  }

  broadcastSync('notes', 'create', newNote);
  res.json({ success: true, data: newNote });
});

// Update note
app.put('/api/notes/:id', (req, res) => {
  const existing = noteRepo.getById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }

  const updated = noteRepo.update(req.params.id, req.body);

  if (updated.type === 'daily_report') {
    dailyReportRepo.save(updated.date, {
      deliverables: updated.dailyReportData?.deliverables || updated.content,
      blockers: updated.dailyReportData?.blockers || '无明显阻塞',
      tomorrowPlan: updated.dailyReportData?.tomorrowPlan || '',
      customNotes: updated.content,
      updatedAt: new Date().toISOString()
    });
    broadcastSync('reports', 'update');
  }

  broadcastSync('notes', 'update', updated);
  res.json({ success: true, data: updated });
});

// Delete note
app.delete('/api/notes/:id', (req, res) => {
  const existing = noteRepo.getById(req.params.id);
  noteRepo.delete(req.params.id);
  if (existing && existing.type === 'daily_report' && existing.date) {
    dailyReportRepo.delete(existing.date);
    broadcastSync('reports', 'delete', { date: existing.date });
  }
  broadcastSync('notes', 'delete', { id: req.params.id });
  res.json({ success: true });
});

// ==================== CALENDAR DATE MEMO APIS ====================

// Get memos (supports ?date=YYYY-MM-DD)
app.get('/api/memos', (req, res) => {
  const { date } = req.query;
  const memos = memoRepo.getAll(date);
  res.json({ success: true, data: memos });
});

// Create memo
app.post('/api/memos', (req, res) => {
  const now = new Date();
  const newMemo = memoRepo.create({
    id: `memo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: req.body.date || now.toISOString().slice(0, 10),
    time: req.body.time || '',
    content: (req.body.content || '').trim(),
    completed: !!req.body.completed,
    tag: req.body.tag || '备忘',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  });
  broadcastSync('memos', 'create', newMemo);
  res.json({ success: true, data: newMemo });
});

// Update memo
app.put('/api/memos/:id', (req, res) => {
  const updated = memoRepo.update(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: '备忘不存在' });
  }
  broadcastSync('memos', 'update', updated);
  res.json({ success: true, data: updated });
});

// Delete memo
app.delete('/api/memos/:id', (req, res) => {
  memoRepo.delete(req.params.id);
  broadcastSync('memos', 'delete', { id: req.params.id });
  res.json({ success: true });
});

// ==================== AI CONFIGURATION & NLU PARSING APIS ====================

// Helper to safely extract JSON from LLM output
function extractJsonFromLlmOutput(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const textToParse = (codeBlockMatch ? codeBlockMatch[1] : rawText).trim();

  let parsed = null;
  try {
    parsed = JSON.parse(textToParse);
  } catch {
    const firstBrace = textToParse.indexOf('{');
    const firstBracket = textToParse.indexOf('[');

    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      const lastBracket = textToParse.lastIndexOf(']');
      if (lastBracket > firstBracket) {
        try {
          parsed = JSON.parse(textToParse.substring(firstBracket, lastBracket + 1));
        } catch {}
      }
    }

    if (!parsed && firstBrace !== -1) {
      const lastBrace = textToParse.lastIndexOf('}');
      if (lastBrace > firstBrace) {
        try {
          parsed = JSON.parse(textToParse.substring(firstBrace, lastBrace + 1));
        } catch {}
      }
    }

    if (!parsed && firstBracket !== -1) {
      const lastBracket = textToParse.lastIndexOf(']');
      if (lastBracket > firstBracket) {
        try {
          parsed = JSON.parse(textToParse.substring(firstBracket, lastBracket + 1));
        } catch {}
      }
    }
  }

  if (Array.isArray(parsed)) {
    return { items: parsed, tasks: parsed };
  }
  if (parsed && !parsed.tasks && !parsed.items && parsed.title) {
    return { items: [parsed], tasks: [parsed] };
  }
  return parsed;
}

// Get AI Config
app.get('/api/ai/config', (req, res) => {
  const config = aiConfigRepo.getConfig();
  let maskedKey = '';
  if (config.apiKey) {
    maskedKey = config.apiKey.length > 8
      ? `sk-***${config.apiKey.slice(-4)}`
      : 'sk-***';
  }
  res.json({
    success: true,
    data: {
      baseUrl: config.baseUrl,
      model: config.model,
      hasKey: config.hasKey,
      maskedKey
    }
  });
});

// Save AI Config
app.post('/api/ai/config', (req, res) => {
  const { baseUrl, apiKey, model } = req.body;
  const updated = aiConfigRepo.saveConfig({ baseUrl, apiKey, model });
  res.json({ success: true, data: updated });
});

// Test AI Connection
app.post('/api/ai/test', async (req, res) => {
  try {
    const savedConfig = aiConfigRepo.getConfig();
    const baseUrl = (req.body.baseUrl || savedConfig.baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
    let apiKey = req.body.apiKey !== undefined ? req.body.apiKey.trim() : savedConfig.apiKey;
    if (apiKey.startsWith('sk-***')) {
      apiKey = savedConfig.apiKey;
    }
    const model = (req.body.model || savedConfig.model || 'gpt-4o-mini').trim();

    if (!apiKey) {
      return res.status(400).json({ success: false, message: '请提供有效的 API Key' });
    }

    const endpointUrl = `${baseUrl}/chat/completions`;
    const startTime = Date.now();

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: 'Say "OK" in 1 word.' }
        ],
        max_tokens: 10,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(15000)
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      let errMsg = `上游接口响应错误 (${response.status})`;
      try {
        const errObj = JSON.parse(errText);
        if (errObj.error?.message) errMsg = errObj.error.message;
      } catch {
        if (errText) errMsg += `: ${errText.slice(0, 100)}`;
      }
      return res.status(response.status).json({ success: false, message: errMsg });
    }

    const json = await response.json();
    const reply = json.choices?.[0]?.message?.content || '';

    res.json({
      success: true,
      data: {
        latencyMs,
        model,
        reply: reply.trim(),
        message: `测试成功！延迟 ${latencyMs}ms，模型响应正常`
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.name === 'TimeoutError'
        ? '请求超时 (15s)，请检查 API Base URL 网络连通性'
        : (err.message || '连接测试失败')
    });
  }
});

// Helper: Local Intelligent Rule-Based Extractor (Fallback & Zero-Config Support)
function parseTextWithRules(text, todayStr, now = new Date()) {
  const lines = text
    .split(/[\n；;。]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  if (lines.length === 0 && text.trim()) {
    lines.push(text.trim());
  }

  const pad = (n) => String(n).padStart(2, '0');
  const formatD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return lines.map((raw, i) => {
    let cat = 'note';
    let priority = 'p3';
    let time = null;
    let targetDate = todayStr;
    const tags = [];

    // 1. Date extraction
    if (raw.includes('大后天')) {
      const d = new Date(now);
      d.setDate(d.getDate() + 3);
      targetDate = formatD(d);
    } else if (raw.includes('后天')) {
      const d = new Date(now);
      d.setDate(d.getDate() + 2);
      targetDate = formatD(d);
    } else if (raw.includes('明天')) {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      targetDate = formatD(d);
    } else if (raw.includes('今天') || raw.includes('今日')) {
      targetDate = todayStr;
    } else {
      const mMatch = raw.match(/(\d{1,2})月(\d{1,2})[日号]?/);
      if (mMatch) {
        const m = parseInt(mMatch[1], 10);
        const day = parseInt(mMatch[2], 10);
        const d = new Date(now.getFullYear(), m - 1, day);
        targetDate = formatD(d);
      } else {
        const weekMatch = raw.match(/(?:下周|本周|这周|周|星期)([一二三四五六日天])/);
        if (weekMatch) {
          const map = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
          const targetDay = map[weekMatch[1]];
          const curDay = now.getDay();
          let diff = targetDay - curDay;
          if (raw.includes('下周') || diff <= 0) diff += 7;
          const d = new Date(now);
          d.setDate(d.getDate() + diff);
          targetDate = formatD(d);
        }
      }
    }

    // 2. Time extraction
    const timeMatch = raw.match(/(?:(?:上午|中午|下午|晚上|今晚|明早)?\s*(\d{1,2})[:：](\d{2}))|(?:(上午|中午|下午|晚上|今晚|明早)?\s*(\d{1,2})点(?:半|(\d{1,2})分)?)/);
    if (timeMatch) {
      if (timeMatch[1] && timeMatch[2]) {
        let h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2];
        if ((raw.includes('下午') || raw.includes('晚上') || raw.includes('今晚')) && h < 12) h += 12;
        time = `${pad(h)}:${m}`;
      } else if (timeMatch[4]) {
        let h = parseInt(timeMatch[4], 10);
        let m = '00';
        if (raw.includes('半')) m = '30';
        else if (timeMatch[5]) m = pad(parseInt(timeMatch[5], 10));
        const period = timeMatch[3] || '';
        if ((period.includes('下午') || period.includes('晚上') || period.includes('今晚') || raw.includes('下午') || raw.includes('晚上')) && h < 12) h += 12;
        time = `${pad(h)}:${m}`;
      }
    }

    // 3. Priority extraction
    if (/紧急|极高|立刻|马上|严重|加急|p1/i.test(raw)) {
      priority = 'p1';
    } else if (/重要|尽快|优先|重点|p2/i.test(raw)) {
      priority = 'p2';
    } else if (/低|闲暇|有空|顺便|稍后|p4/i.test(raw)) {
      priority = 'p4';
    }

    // 4. Category determination (meeting | idea | schedule | task | note)
    if (/会议|开会|例会|评审会|讨论会|站会|复盘会|沟通纪要|会议纪要|对齐会/.test(raw)) {
      cat = 'meeting';
      tags.push('会议');
    } else if (/灵感|想法|创意|闪念|脑洞|构思|突发奇想|新功能思路|建议尝试/.test(raw)) {
      cat = 'idea';
      tags.push('灵感');
    } else if (/日程|拜访|约见|接待|来访|出差|团建|发布会|航班|高铁|看病|体检|培训/.test(raw) || (time && /参加|前往|到达|见客户/.test(raw))) {
      cat = 'schedule';
      tags.push('日程');
    } else if (/完成|提交|制作|修复|开发|审核|发布|撰写|编写|发送|优化|联系|购买|整理|核对|提醒/.test(raw)) {
      cat = 'task';
      tags.push('待办');
    } else if (/笔记|总结|记录|学习|阅读|摘录|心得|知识点|备忘|参考|链接/.test(raw)) {
      cat = 'note';
      tags.push('笔记');
    } else {
      if (time || raw.includes('提醒') || raw.includes('记得')) {
        cat = 'task';
        tags.push('待办');
      } else {
        cat = 'note';
        tags.push('速记');
      }
    }

    let title = raw.replace(/^(今天|明天|后天|大后天|下周[一二三四五六日天]|周[一二三四五六日天])[\s,，]*/, '').trim();
    if (!title) title = raw;
    if (title.length > 40) title = title.slice(0, 38) + '...';

    return {
      id: `item_${Date.now()}_${i}`,
      category: cat,
      title,
      content: raw,
      date: targetDate,
      time: time || (cat === 'schedule' ? '全天' : null),
      priority,
      tags: tags.length > 0 ? tags : ['速记'],
      estimatedMinutes: 30
    };
  });
}

// NLU Smart Quick Note Multi-Dimensional AI Recognition
app.post('/api/ai/parse-task', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ success: false, message: '请输入要解析的文字内容' });
  }

  const now = new Date();
  const weekDayMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const weekDayName = weekDayMap[now.getDay()];

  const config = aiConfigRepo.getConfig();
  const hasAiConfig = !!(config && config.hasKey && config.apiKey && config.apiKey.trim());

  // If no OpenAI config is set, seamlessly provide high-accuracy local rule parsing
  if (!hasAiConfig) {
    const localItems = parseTextWithRules(text.trim(), todayStr, now);
    const legacyTasks = localItems.map((item, idx) => ({
      id: `task_${Date.now()}_${idx}`,
      title: item.title,
      dueDate: item.date,
      startTime: item.time && /^\d{2}:\d{2}$/.test(item.time) ? item.time : null,
      priority: item.priority || 'p3',
      tags: item.tags,
      estimatedMinutes: item.estimatedMinutes || 30,
      note: item.content || '',
      category: item.category
    }));

    return res.json({
      success: true,
      data: {
        items: localItems,
        tasks: legacyTasks,
        isRuleFallback: true,
        noAiConfig: true,
        message: '已通过本地智能规则完成识别。配置 OpenAI API Key 可获得更深度的语义理解'
      }
    });
  }

  try {
    const systemPrompt = `你是一个专业的工作台多维自然语言理解（NLU）助理。
你的任务是将用户提供的杂乱文本（如聊天记录、会议纪要、随笔想法、口头备忘、待办列表等）智能识别并提取为一个或多个结构化条目。

【当前基准时间】
今天是：${todayStr} (${weekDayName})。
请严格以此日期为基准计算相对时间（例如“今天”、“明天”、“后天”、“周五”、“下周一”、“下午3点”等）。

【条目分类规则 (category)】
请根据文本语义将每个条目准确归类为以下 5 种类别之一：
1. "task" (待办任务)：具有具体待执行行动、截止时间或交付物的行动项（如“写PPT”、“提交周报”、“修复登录Bug”、“联系客户核对发票”）；
2. "schedule" (日程安排)：具有明确约定时刻的会议、拜访、预约、出行、活动或特定时间段事项（如“明天下午2点客户来访”、“周三上午10点部门例会”、“周五全天团建”）；
3. "note" (快速记录 - 笔记)：信息摘录、工作记录、备忘备查资料、技术总结、知识点等；
4. "meeting" (快速记录 - 会议)：会议纪要、沟通记录、评审意见、讨论结论与要点等；
5. "idea" (快速记录 - 灵感)：临时脑洞、产品构思、设计创意、改进点子、灵光一现的想法等。

【输出格式规范】
必须且仅返回标准 JSON 对象，不要输出任何 Markdown 外部文字或问候语：
{
  "items": [
    {
      "category": "task" | "schedule" | "note" | "meeting" | "idea",
      "title": "条目标题/核心概要（简洁有力，动宾短语或主题，10~30字）",
      "content": "详细内容/正文/要点说明（对笔记、会议、灵感保留丰富细节，任务可为备注说明）",
      "date": "YYYY-MM-DD（绝对日期，基于当前基准时间推导，未明确提及则默认为 ${todayStr}）",
      "time": "HH:mm（若文中提及明确时间如 14:30、09:00，没有则填 null 或在日程中填 '全天'）",
      "priority": "p1" | "p2" | "p3" | "p4"（p1极高/紧急，p2重要，p3普通，p4低。主要用于 task 和 schedule）,
      "tags": ["标签1", "标签2"]（自动提炼1~3个简明标签，如 会议、研发、设计、沟通、财务、灵感、生活等）,
      "estimatedMinutes": 30（仅在 task 时生效，预估耗时分钟数，数字）
    }
  ]
}

【解析准则】
1. 若输入包含多段内容或多个事项，必须拆分为多个独立 item；
2. 准确识别每项的最佳类别（笔记/会议/灵感/日程/待办）；
3. 准确推导相对日期与时间点；
4. 只能输出纯 JSON，禁止任何前言后语。`;

    const endpointUrl = `${config.baseUrl}/chat/completions`;

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text.trim() }
        ],
        temperature: 0.2
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      let errMsg = `AI 接口调用失败 (${response.status})`;
      try {
        const errObj = JSON.parse(errText);
        if (errObj.error?.message) errMsg = errObj.error.message;
      } catch {}

      // Fallback to local rule parsing so user is not blocked
      const localItems = parseTextWithRules(text.trim(), todayStr, now);
      const legacyTasks = localItems.map((item, idx) => ({
        id: `task_${Date.now()}_${idx}`,
        title: item.title,
        dueDate: item.date,
        startTime: item.time && /^\d{2}:\d{2}$/.test(item.time) ? item.time : null,
        priority: item.priority || 'p3',
        tags: item.tags,
        estimatedMinutes: item.estimatedMinutes || 30,
        note: item.content || '',
        category: item.category
      }));

      return res.json({
        success: true,
        data: {
          items: localItems,
          tasks: legacyTasks,
          isRuleFallback: true,
          message: `AI 接口临时不可用 (${errMsg})，已采用本地语义规则为您解析`
        }
      });
    }

    const resultJson = await response.json();
    const rawContent = resultJson.choices?.[0]?.message?.content || '';

    const parsed = extractJsonFromLlmOutput(rawContent);
    const rawList = (parsed && (parsed.items || parsed.tasks)) || [];

    if (!Array.isArray(rawList) || rawList.length === 0) {
      const fallbackItems = parseTextWithRules(text.trim(), todayStr, now);
      const legacyTasks = fallbackItems.map((item, idx) => ({
        id: `task_${Date.now()}_${idx}`,
        title: item.title,
        dueDate: item.date,
        startTime: item.time && /^\d{2}:\d{2}$/.test(item.time) ? item.time : null,
        priority: item.priority || 'p3',
        tags: item.tags,
        estimatedMinutes: item.estimatedMinutes || 30,
        note: item.content || '',
        category: item.category
      }));

      return res.json({
        success: true,
        data: {
          items: fallbackItems,
          tasks: legacyTasks,
          rawContent
        }
      });
    }

    // Sanitize Items
    const validCategories = ['task', 'schedule', 'note', 'meeting', 'idea'];
    const sanitizedItems = rawList.map((t, idx) => {
      let cat = t.category;
      if (!cat || !validCategories.includes(cat)) {
        if (/会议|开会|例会|纪要/.test(t.title || '')) cat = 'meeting';
        else if (/灵感|想法|创意|脑洞/.test(t.title || '')) cat = 'idea';
        else if (/日程|拜访|约见|活动/.test(t.title || '') || t.startTime) cat = 'schedule';
        else cat = 'task';
      }

      const validPriority = ['p1', 'p2', 'p3', 'p4'].includes(t.priority) ? t.priority : 'p3';
      let validDate = t.date || t.dueDate;
      if (!validDate || !/^\d{4}-\d{2}-\d{2}$/.test(validDate)) {
        validDate = todayStr;
      }

      const timeVal = t.time !== undefined ? t.time : t.startTime;
      let validTime = null;
      if (typeof timeVal === 'string') {
        if (timeVal === '全天' || /^\d{2}:\d{2}$/.test(timeVal)) {
          validTime = timeVal;
        }
      }

      return {
        id: `item_${Date.now()}_${idx}`,
        category: cat,
        title: (t.title || `智能记录 ${idx + 1}`).trim(),
        content: (t.content || t.note || t.title || '').trim(),
        date: validDate,
        time: validTime,
        priority: validPriority,
        tags: Array.isArray(t.tags) ? t.tags.filter(tag => typeof tag === 'string' && tag.trim()).slice(0, 4) : [cat === 'task' ? '待办' : cat === 'schedule' ? '日程' : cat === 'meeting' ? '会议' : cat === 'idea' ? '灵感' : '笔记'],
        estimatedMinutes: typeof t.estimatedMinutes === 'number' && t.estimatedMinutes > 0 ? t.estimatedMinutes : 30
      };
    });

    // Legacy tasks compatibility
    const sanitizedTasks = sanitizedItems.map((item, idx) => ({
      id: `parsed_${Date.now()}_${idx}`,
      title: item.title,
      dueDate: item.date,
      startTime: item.time && /^\d{2}:\d{2}$/.test(item.time) ? item.time : null,
      priority: item.priority,
      tags: item.tags,
      estimatedMinutes: item.estimatedMinutes,
      note: item.content,
      category: item.category
    }));

    res.json({
      success: true,
      data: {
        items: sanitizedItems,
        tasks: sanitizedTasks,
        rawContent
      }
    });
  } catch (err) {
    // If an error occurs (e.g. timeout), gracefully fallback to local rules
    const localItems = parseTextWithRules(text.trim(), todayStr, now);
    const legacyTasks = localItems.map((item, idx) => ({
      id: `task_${Date.now()}_${idx}`,
      title: item.title,
      dueDate: item.date,
      startTime: item.time && /^\d{2}:\d{2}$/.test(item.time) ? item.time : null,
      priority: item.priority || 'p3',
      tags: item.tags,
      estimatedMinutes: item.estimatedMinutes || 30,
      note: item.content || '',
      category: item.category
    }));

    res.json({
      success: true,
      data: {
        items: localItems,
        tasks: legacyTasks,
        isRuleFallback: true,
        message: `AI 接口调用超时或异常 (${err.message})，已采用本地语义规则为您解析`
      }
    });
  }
});

// ==================== DAILY & WEEKLY REPORT APIS ====================

// Get daily report for date (with auto aggregation)
app.get('/api/reports/daily/:date', (req, res) => {
  const { date } = req.params;
  const allTasks = taskRepo.getAll();

  const completedTasks = allTasks.filter(t => {
    if (!t.completed) return false;
    const completedDate = (t.completedAt || t.createdAt || '').slice(0, 10);
    return completedDate === date;
  });

  const getTaskTimestampValue = (t) => {
    if (t.startTime) return `${date}T${t.startTime}:00`;
    if (t.timeSpan) {
      const match = t.timeSpan.match(/^(\d{1,2})(?::(\d{1,2}))?/);
      if (match) {
        const hour = String(match[1]).padStart(2, '0');
        const min = match[2] ? String(match[2]).padStart(2, '0') : '00';
        return `${date}T${hour}:${min}:00`;
      }
    }
    if (t.completedAt) return t.completedAt;
    if (t.dueDate && t.dueDate.includes('T')) return t.dueDate;
    return t.createdAt || '';
  };

  completedTasks.sort((a, b) => getTaskTimestampValue(a).localeCompare(getTaskTimestampValue(b)));

  const incompleteTasks = allTasks.filter(t => {
    if (t.completed) return false;
    const dueDate = (t.dueDate || '').slice(0, 10);
    return dueDate <= date;
  });

  const dayLogs = focusRepo.getAll(date);
  const totalFocusMinutes = dayLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

  const existing = dailyReportRepo.getByDate(date);

  let defaultDeliverables = completedTasks.length > 0
    ? completedTasks.map((t, i) => {
        const timeParts = [];
        if (t.timeSpan) timeParts.push(`完成时间：${t.timeSpan}`);
        if (t.actualMinutes) timeParts.push(`${t.actualMinutes}分钟`);
        const suffix = timeParts.length > 0 ? `（${timeParts.join('，')}）` : '';
        return `${i + 1}. ${t.title}${suffix}`;
      }).join('\n')
    : '1. 推进重点任务交付\n2. 沟通各方需求与进展';

  let defaultBlockers = incompleteTasks.length > 0
    ? incompleteTasks.map((t, i) => `${i + 1}. [${t.priority.toUpperCase()}] ${t.title}`).join('\n')
    : '推进顺利，无明显阻塞项';

  const dParts = date.split('-').map(Number);
  const targetDateObj = new Date(dParts[0], dParts[1] - 1, dParts[2]);
  targetDateObj.setDate(targetDateObj.getDate() + 1);
  const tomorrowStr = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;
  const tomorrowDayOfWeek = targetDateObj.getDay();
  const isTomorrowWorkday = tomorrowDayOfWeek >= 1 && tomorrowDayOfWeek <= 5;

  const recurringParents = allTasks.filter(t => t.isRecurring && !t.recurringParentId && t.recurringConfig);
  const tomorrowRecurringTasks = recurringParents.filter(parent => {
    const { frequency, startDate, endDate } = parent.recurringConfig;
    if (!startDate || tomorrowStr < startDate) return false;
    if (endDate && tomorrowStr > endDate) return false;
    if (frequency === 'workday' && !isTomorrowWorkday) return false;
    if (frequency === 'weekly') {
      const startDayOfWeek = new Date(startDate + 'T00:00:00').getDay();
      if (tomorrowDayOfWeek !== startDayOfWeek) return false;
    }
    return true;
  });

  const tomorrowDueTasks = allTasks.filter(t => {
    if (t.completed) return false;
    if (t.isRecurring) return false;
    const due = (t.dueDate || '').slice(0, 10);
    return due === tomorrowStr;
  });

  const allTomorrowTitles = [
    ...tomorrowRecurringTasks.map(t => t.title),
    ...tomorrowDueTasks.map(t => t.title)
  ];

  let defaultTomorrow = allTomorrowTitles.length > 0
    ? allTomorrowTitles.map((title, i) => `${i + 1}. ${title}`).join('\n')
    : '1. 按计划推进重点工作\n2. 跟进日常事务协同';

  const isExisting = !!existing;

  const reportData = {
    date,
    isExisting,
    deliverables: existing ? existing.deliverables : '',
    chronologicalDeliverables: defaultDeliverables,
    suggestedDeliverables: defaultDeliverables,
    blockers: existing ? existing.blockers : '',
    suggestedBlockers: defaultBlockers,
    tomorrowPlan: existing ? existing.tomorrowPlan : '',
    suggestedTomorrowPlan: defaultTomorrow,
    customNotes: existing?.customNotes || '',
    completedTasksCount: completedTasks.length,
    totalFocusMinutes,
    completedTasks,
    incompleteTasks,
    tomorrowRecurringTasks: tomorrowRecurringTasks.map(t => ({
      id: t.id,
      title: t.title,
      frequency: t.recurringConfig?.frequency
    })),
    tomorrowTasksList: allTomorrowTitles,
    syncedToExcel: !!existing?.syncedToExcel,
    syncedAt: existing?.syncedAt || null,
    updatedAt: existing?.updatedAt || null
  };

  res.json({ success: true, data: reportData });
});

// Save or update daily report
app.post('/api/reports/daily/:date', (req, res) => {
  const { date } = req.params;
  const existing = dailyReportRepo.getByDate(date);

  const saved = dailyReportRepo.save(date, {
    deliverables: req.body.deliverables || '',
    blockers: req.body.blockers || '',
    tomorrowPlan: req.body.tomorrowPlan || '',
    customNotes: req.body.customNotes || '',
    syncedToExcel: req.body.syncedToExcel !== undefined ? req.body.syncedToExcel : (existing?.syncedToExcel || false),
    syncedAt: req.body.syncedAt || existing?.syncedAt || null
  });

  const matchingNotes = noteRepo.getAll({ type: 'daily_report', date });
  if (matchingNotes.length > 0) {
    noteRepo.update(matchingNotes[0].id, {
      content: req.body.deliverables || matchingNotes[0].content,
      dailyReportData: {
        deliverables: req.body.deliverables || '',
        blockers: req.body.blockers || '',
        tomorrowPlan: req.body.tomorrowPlan || '',
        completedCount: saved.completedTasksCount || 0,
        focusMinutes: saved.totalFocusMinutes || 0,
      }
    });
    broadcastSync('notes', 'update');
  }

  broadcastSync('reports', 'update', saved);
  res.json({ success: true, data: saved });
});

// Delete daily report
app.delete('/api/reports/daily/:date', (req, res) => {
  const { date } = req.params;
  dailyReportRepo.delete(date);

  const matchingNotes = noteRepo.getAll({ type: 'daily_report', date });
  matchingNotes.forEach(n => noteRepo.delete(n.id));

  broadcastSync('reports', 'delete', { date });
  res.json({ success: true });
});

// Get all daily reports sorted by date descending
app.get('/api/reports/daily-list', (req, res) => {
  const reports = dailyReportRepo.getAll();
  const list = Object.values(reports);
  list.sort((a, b) => b.date.localeCompare(a.date));
  res.json({ success: true, data: list });
});

// Export daily reports to Excel
app.get('/api/reports/export/excel', async (req, res) => {
  try {
    const { startDate, endDate, date } = req.query;
    const reports = dailyReportRepo.getAll();

    let targetDates = Object.keys(reports);
    if (date) {
      targetDates = targetDates.filter(d => d === date);
    } else {
      if (startDate) targetDates = targetDates.filter(d => d >= startDate);
      if (endDate) targetDates = targetDates.filter(d => d <= endDate);
    }
    targetDates.sort((a, b) => b.localeCompare(a));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Personal Workspace';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('工作日报台账', { views: [{ showGridLines: true }] });
    sheet.columns = [
      { header: '日期', key: 'date', width: 15 },
      { header: '星期', key: 'weekday', width: 12 },
      { header: '完成待办 (项)', key: 'tasks', width: 15 },
      { header: '专注时长 (分钟)', key: 'focus', width: 16 },
      { header: '今日工作', key: 'deliverables', width: 45 },
      { header: '明日计划', key: 'tomorrowPlan', width: 40 },
      { header: '遇到阻碍与未完成项', key: 'blockers', width: 35 },
      { header: '补充说明', key: 'notes', width: 25 },
      { header: '更新时间', key: 'updatedAt', width: 22 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.height = 30;
    headerRow.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0071E3' }
    };

    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

    targetDates.forEach(dStr => {
      const rep = reports[dStr];
      const parts = dStr.split('-');
      let weekdayStr = '';
      if (parts.length === 3) {
        const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        weekdayStr = weekdays[dObj.getDay()] || '';
      }

      const row = sheet.addRow({
        date: dStr,
        weekday: weekdayStr,
        tasks: rep.completedTasksCount || 0,
        focus: rep.totalFocusMinutes || 0,
        deliverables: rep.deliverables || '',
        blockers: rep.blockers || '',
        tomorrowPlan: rep.tomorrowPlan || '',
        notes: rep.customNotes || '',
        updatedAt: rep.updatedAt ? new Date(rep.updatedAt).toLocaleString('zh-CN') : ''
      });

      row.height = 42;
      row.alignment = { vertical: 'middle', wrapText: true };
      row.font = { name: 'Microsoft YaHei', size: 9 };
    });

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const rangeName = date ? date : (startDate && endDate ? `${startDate}_至_${endDate}` : (startDate ? `${startDate}_起` : '全量汇总'));
    const filename = encodeURIComponent(`工作日报_${rangeName}.xlsx`);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export excel error:', err);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

// Weekly report aggregation
app.get('/api/reports/weekly', (req, res) => {
  const targetDateStr = req.query.date ? String(req.query.date) : new Date().toISOString().slice(0, 10);
  const targetDate = new Date(targetDateStr);

  const day = targetDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(targetDate);
  monday.setDate(targetDate.getDate() + diffToMonday);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().slice(0, 10));
  }

  const mondayStr = weekDates[0];
  const fridayStr = weekDates[4];
  const sundayStr = weekDates[6];

  const allTasks = taskRepo.getAll();
  const weekTasks = allTasks.filter(t => {
    if (!t.completed || !t.completedAt) return false;
    const d = t.completedAt.slice(0, 10);
    return weekDates.includes(d);
  });

  const allLogs = focusRepo.getAll();
  const weekLogs = allLogs.filter(l => weekDates.includes(l.date));
  const totalWeekFocusMinutes = weekLogs.reduce((s, l) => s + (l.durationMinutes || 0), 0);

  const tagGroups = {};
  weekTasks.forEach(task => {
    const tag = (task.tags && task.tags[0]) || '综合交付';
    if (!tagGroups[tag]) tagGroups[tag] = [];
    tagGroups[tag].push(task);
  });

  let deliverablesSummary = '';
  Object.keys(tagGroups).forEach(tag => {
    deliverablesSummary += `### 【${tag}】\n`;
    tagGroups[tag].forEach((task, idx) => {
      deliverablesSummary += `${idx + 1}. ${task.title}（耗时约 ${task.actualMinutes || task.estimatedMinutes || 0} 分钟）\n`;
    });
    deliverablesSummary += '\n';
  });

  if (!deliverablesSummary) {
    deliverablesSummary = '本周暂无已完成的结构化待办交付。';
  }

  const generatedDraft = `# 本周工作总结 (${mondayStr} ~ ${fridayStr})

## 一、 本周完成工作
- **完成任务**：${weekTasks.length} 项
- **工作用时**：${(totalWeekFocusMinutes / 60).toFixed(1)} 小时

${deliverablesSummary.trim()}

## 二、 总结与体会
- 本周各项工作按计划完成，整体进展顺利。

## 三、 下周工作计划
1. 继续跟进未完成的工作；
2. 按计划推进下周重点事项；
3. 做好日常工作记录。
`;

  res.json({
    success: true,
    data: {
      startDate: mondayStr,
      endDate: sundayStr,
      workdayEndDate: fridayStr,
      totalCompletedTasks: weekTasks.length,
      totalFocusMinutes: totalWeekFocusMinutes,
      completedTasks: weekTasks,
      weeklyDraft: generatedDraft
    }
  });
});

// ==================== CALENDAR SUMMARY API ====================

app.get('/api/calendar/summary', (req, res) => {
  const tasks = taskRepo.getAll();
  const logs = focusRepo.getAll();
  const reports = dailyReportRepo.getAll();

  const summaryMap = {};

  tasks.forEach(t => {
    const date = (t.dueDate || t.createdAt || '').slice(0, 10);
    if (!summaryMap[date]) {
      summaryMap[date] = { totalTasks: 0, completedTasks: 0, focusMinutes: 0, hasReport: false, status: 'gray' };
    }
    summaryMap[date].totalTasks += 1;
    if (t.completed) {
      summaryMap[date].completedTasks += 1;
    }
  });

  logs.forEach(l => {
    const d = l.date;
    if (!summaryMap[d]) {
      summaryMap[d] = { totalTasks: 0, completedTasks: 0, focusMinutes: 0, hasReport: false, status: 'gray' };
    }
    summaryMap[d].focusMinutes += (l.durationMinutes || 0);
  });

  Object.keys(reports).forEach(d => {
    if (!summaryMap[d]) {
      summaryMap[d] = { totalTasks: 0, completedTasks: 0, focusMinutes: 0, hasReport: false, status: 'gray' };
    }
    summaryMap[d].hasReport = true;
  });

  Object.keys(summaryMap).forEach(d => {
    const item = summaryMap[d];
    if (item.totalTasks > 0 && item.completedTasks === item.totalTasks) {
      item.status = 'green';
    } else if (item.completedTasks > 0 && item.completedTasks < item.totalTasks) {
      item.status = 'yellow';
    } else if (item.totalTasks > 0 && item.completedTasks === 0) {
      item.status = 'red';
    } else if (item.hasReport || item.focusMinutes > 0) {
      item.status = 'green';
    }
  });

  res.json({ success: true, data: summaryMap });
});

// ==================== EXCEL HUB APIS ====================

// List Excel configs
app.get('/api/excel/configs', (req, res) => {
  res.json({ success: true, data: excelConfigRepo.getAll() });
});

// Add Excel config
app.post('/api/excel/configs', (req, res) => {
  const newConfig = excelConfigRepo.create({
    id: `cfg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: req.body.name || '新表格快捷跳板',
    category: req.body.category || '日常办公',
    filePath: req.body.filePath || '',
    targetSheet: req.body.targetSheet || 'Sheet1',
    isAnnualLedger: !!req.body.isAnnualLedger,
    monitoredCells: Array.isArray(req.body.monitoredCells) ? req.body.monitoredCells : []
  });
  broadcastSync('excel_configs', 'create', newConfig);
  res.json({ success: true, data: newConfig });
});

// Update Excel config
app.put('/api/excel/configs/:id', (req, res) => {
  const updated = excelConfigRepo.update(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: '配置不存在' });
  }
  broadcastSync('excel_configs', 'update', updated);
  res.json({ success: true, data: updated });
});

// Delete Excel config
app.delete('/api/excel/configs/:id', (req, res) => {
  excelConfigRepo.delete(req.params.id);
  broadcastSync('excel_configs', 'delete', { id: req.params.id });
  res.json({ success: true });
});

// Shared helper to open file with system default application on the interactive desktop (Windows only)
function openWithSystemDefault(filePath, res, successMsg, onOpened) {
  try {
    if (process.platform !== 'win32') {
      return res.json({
        success: true,
        openedLocally: false,
        message: '服务器运行在非 Windows 环境，建议直接通过浏览器下载或预览',
        downloadPath: filePath
      });
    }

    const vbsPath = path.join(__dirname, 'open_helper.vbs');
    const taskCmd = `schtasks /create /tn "OpenWorkbenchFile" /tr "wscript.exe \\"${vbsPath}\\" \\"${filePath}\\"" /sc ONCE /st 23:59 /it /f`;

    exec(taskCmd, (createErr) => {
      if (!createErr) {
        exec('schtasks /run /tn "OpenWorkbenchFile"', (runErr) => {
          if (runErr) {
            const fb = spawn('wscript.exe', [vbsPath, filePath], { detached: true, stdio: 'ignore' });
            fb.unref();
          }
        });
      } else {
        const fb = spawn('wscript.exe', [vbsPath, filePath], { detached: true, stdio: 'ignore' });
        fb.unref();
      }
    });

    if (onOpened) onOpened();

    return res.json({ success: true, openedLocally: true, message: successMsg || '已通过系统默认应用快速打开' });
  } catch (err) {
    return res.status(500).json({ success: false, message: `打开文件失败: ${err.message}` });
  }
}

// Open Excel file with Windows default application
app.post('/api/excel/open', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ success: false, message: '文件路径不能为空' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: `文件不存在: ${filePath}` });
  }

  return openWithSystemDefault(filePath, res, '已唤起系统应用打开表格');
});

// Read cell snapshot without opening file
app.post('/api/excel/snapshot', async (req, res) => {
  const { filePath, cells } = req.body;
  if (!filePath) {
    return res.status(400).json({ success: false, message: '未指定 Excel 文件路径' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: `文件不存在: ${filePath}` });
  }

  try {
    const stats = fs.statSync(filePath);
    const lastModified = stats.mtime.toLocaleString();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const results = [];
    const cellList = Array.isArray(cells) ? cells : [];

    for (const item of cellList) {
      const sheetName = item.sheet;
      const cellRef = item.cell;
      const label = item.label || `${sheetName}!${cellRef}`;

      const sheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
      if (!sheet) {
        results.push({ label, sheet: sheetName, cell: cellRef, value: '(工作表不存在)', error: true });
        continue;
      }

      const cell = sheet.getCell(cellRef);
      let val = cell.value;
      
      if (val && typeof val === 'object') {
        if (val.result !== undefined) {
          val = val.result;
        } else if (val.richText) {
          val = val.richText.map(t => t.text).join('');
        } else if (val.text) {
          val = val.text;
        }
      }

      results.push({
        label,
        sheet: sheet.name,
        cell: cellRef,
        value: val !== null && val !== undefined ? String(val) : '(空)',
        error: false
      });
    }

    res.json({
      success: true,
      lastModified,
      results
    });
  } catch (err) {
    console.error('Snapshot reading failed:', err);
    res.status(500).json({ success: false, message: `读取 Excel 失败: ${err.message}` });
  }
});

// Append daily summary row into target Excel ledger
app.post('/api/excel/append-daily', async (req, res) => {
  const { configId, date, deliverables, blockers, tomorrowPlan, totalFocusMinutes, completedCount } = req.body;
  const configs = excelConfigRepo.getAll();

  let targetConfig = null;
  if (configId) {
    targetConfig = configs.find(c => c.id === configId);
  }
  if (!targetConfig) {
    targetConfig = configs.find(c => c.isAnnualLedger) || configs[0];
  }

  if (!targetConfig || !targetConfig.filePath) {
    return res.status(400).json({ success: false, message: '未找到配置的年度工作总台账路径' });
  }

  const filePath = targetConfig.filePath;
  const targetSheetName = targetConfig.targetSheet || '工作日志台账';

  try {
    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(filePath)) {
      await workbook.xlsx.readFile(filePath);
    }

    let sheet = workbook.getWorksheet(targetSheetName);
    if (!sheet) {
      sheet = workbook.addWorksheet(targetSheetName);
      sheet.columns = [
        { header: '日期', key: 'date', width: 14 },
        { header: '今日交付成果', key: 'deliverables', width: 38 },
        { header: '未完成及阻塞项', key: 'blockers', width: 30 },
        { header: '明日计划', key: 'tomorrowPlan', width: 32 },
        { header: '专注耗时(分钟)', key: 'focusMinutes', width: 16 },
        { header: '完成待办数', key: 'completedCount', width: 14 },
        { header: '归档时间戳', key: 'syncedAt', width: 22 }
      ];
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }
      };
    }

    const nowStr = new Date().toLocaleString();
    sheet.addRow({
      date: date || new Date().toISOString().slice(0, 10),
      deliverables: deliverables || '无',
      blockers: blockers || '无',
      tomorrowPlan: tomorrowPlan || '无',
      focusMinutes: Number(totalFocusMinutes) || 0,
      completedCount: Number(completedCount) || 0,
      syncedAt: nowStr
    });

    await workbook.xlsx.writeFile(filePath);

    const reportDate = date || new Date().toISOString().slice(0, 10);
    dailyReportRepo.save(reportDate, {
      syncedToExcel: true,
      syncedAt: nowStr
    });

    broadcastSync('reports', 'update');

    res.json({
      success: true,
      message: `已成功将 ${reportDate} 工作日志追加写入至：${path.basename(filePath)} -> [${targetSheetName}]`,
      syncedAt: nowStr
    });
  } catch (err) {
    console.error('Append to Excel failed:', err);
    res.status(500).json({ success: false, message: `写入 Excel 失败: ${err.message}` });
  }
});

// ==================== CROSS-PLATFORM LINKED FILES APIS ====================

// Get all linked files
app.get('/api/files', (req, res) => {
  res.json({ success: true, data: fileRepo.getAll() });
});

// Multi-device file upload (Upload file from mobile / web browser to server)
app.post('/api/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '未接收到上传的文件' });
  }

  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const ext = path.extname(originalName).replace('.', '').toLowerCase();

  const newFile = fileRepo.create({
    id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: originalName,
    filePath: req.file.path,
    fileType: ext || 'file',
    size: req.file.size,
    category: req.body.category || '数据表格',
    isPinned: req.body.isPinned === 'true',
    notes: req.body.notes || '多端上传文件'
  });

  broadcastSync('files', 'create', newFile);
  res.json({ success: true, data: newFile });
});

// Download file directly to browser (for mobile or remote terminals)
app.get('/api/files/download/:id', (req, res) => {
  const file = fileRepo.getById(req.params.id);
  if (!file) {
    return res.status(404).json({ success: false, message: '文件记录不存在' });
  }

  if (!fs.existsSync(file.filePath)) {
    return res.status(404).json({ success: false, message: '服务器端物理文件不存在或已被移动' });
  }

  fileRepo.updateLastOpened(file.id);
  broadcastSync('files', 'open', { id: file.id });

  // Proper UTF-8 filename header
  res.download(file.filePath, file.name);
});

// Link local path manually
app.post('/api/files', (req, res) => {
  let { name, filePath, fileType, size, category, isPinned, notes } = req.body;

  if (!filePath) {
    return res.status(400).json({ success: false, message: '请提供本地文件路径' });
  }

  filePath = filePath.replace(/^["']|["']$/g, '').trim();

  if (!name || name === filePath) {
    name = path.basename(filePath);
  }

  if (!fileType && filePath) {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    fileType = ext || 'file';
  }

  if (!size && fs.existsSync(filePath)) {
    try {
      size = fs.statSync(filePath).size;
    } catch (e) {
      console.warn('Stat file failed:', e);
    }
  }

  const newFile = fileRepo.create({
    id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    filePath,
    fileType: (fileType || 'file').toLowerCase(),
    size: size || 0,
    category: category || '数据表格',
    isPinned: !!isPinned,
    notes: notes || ''
  });

  broadcastSync('files', 'create', newFile);
  res.json({ success: true, data: newFile });
});

// Update linked file
app.put('/api/files/:id', (req, res) => {
  const updated = fileRepo.update(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: '文件链接不存在' });
  }
  broadcastSync('files', 'update', updated);
  res.json({ success: true, data: updated });
});

// Delete linked file (with physical disk cleanup to free server storage)
app.delete('/api/files/:id', (req, res) => {
  const file = fileRepo.getById(req.params.id);
  if (!file) {
    return res.status(404).json({ success: false, message: '文件不存在' });
  }

  // 同步物理删除服务器存储中的文件，避免浪费磁盘空间
  if (file.filePath) {
    try {
      const normalizedPath = path.resolve(file.filePath);
      const normalizedUploads = path.resolve(UPLOADS_DIR);
      const rel = path.relative(normalizedUploads, normalizedPath);
      const isInsideUploads = !rel.startsWith('..') && !path.isAbsolute(rel);

      if (fs.existsSync(normalizedPath)) {
        // 如果文件位于服务器 uploads 目录下，或标记为多端上传文件，彻底删除磁盘物理文件
        if (isInsideUploads || (file.notes && file.notes.includes('上传')) || file.filePath.includes('uploads')) {
          fs.unlinkSync(normalizedPath);
          console.log(`[Storage Cleanup] 已同步从服务器磁盘删除文件: ${normalizedPath}`);
        }
      }
    } catch (err) {
      console.error(`[Storage Cleanup Error] 清理物理文件失败: ${file.filePath}`, err);
    }
  }

  fileRepo.delete(req.params.id);
  broadcastSync('files', 'delete', { id: req.params.id });
  res.json({ success: true, message: '文件及服务器存储已同步删除' });
});

// Smart open file: opens locally if on desktop Windows, or falls back to browser download
app.post('/api/files/open', (req, res) => {
  const { filePath, id } = req.body;
  if (!filePath && !id) {
    return res.status(400).json({ success: false, message: '文件路径不能为空' });
  }

  let file = null;
  if (id) {
    file = fileRepo.getById(id);
  }
  const targetPath = filePath || (file && file.filePath);

  if (!targetPath || !fs.existsSync(targetPath)) {
    return res.status(404).json({
      success: false,
      message: `服务端物理文件未找到: ${targetPath || '未知路径'}`
    });
  }

  const downloadUrl = id ? `/api/files/download/${id}` : null;

  // If on Windows and running interactively, attempt native open
  if (process.platform === 'win32') {
    return openWithSystemDefault(targetPath, res, '已通过系统默认应用快速打开', () => {
      if (id) {
        fileRepo.updateLastOpened(id);
        broadcastSync('files', 'open', { id });
      }
    });
  }

  // Non-Windows server: provide browser download url
  if (id) {
    fileRepo.updateLastOpened(id);
    broadcastSync('files', 'open', { id });
  }

  return res.json({
    success: true,
    openedLocally: false,
    downloadUrl,
    message: '已生成浏览器下载链接'
  });
});

// Reveal file in Windows Explorer (gracefully handled on other platforms)
app.post('/api/files/reveal', (req, res) => {
  const { filePath } = req.body;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: '文件不存在' });
  }

  if (process.platform === 'win32') {
    const taskCmd = `schtasks /create /tn "RevealWorkbenchFile" /tr "explorer.exe /select,\\"${filePath}\\"" /sc ONCE /st 23:59 /it /f`;
    exec(taskCmd, (taskErr) => {
      if (!taskErr) {
        exec('schtasks /run /tn "RevealWorkbenchFile"');
      } else {
        exec(`explorer /select,"${filePath}"`);
      }
    });
    return res.json({ success: true, message: '已在资源管理器中定位' });
  }

  return res.json({
    success: true,
    message: '非 Windows 系统环境，文件位于服务器本地存储'
  });
});

// Interactive File Picker (Legacy Windows Dialog fallback)
app.post('/api/files/pick', (req, res) => {
  if (process.platform !== 'win32') {
    return res.json({
      success: false,
      message: '服务器运行在非 Windows 桌面环境，请直接点击“上传文件”从手机或电脑中选择文件'
    });
  }

  const resultFile = path.join(DATA_DIR, 'picked_file.txt');
  const pickerExe = path.join(__dirname, 'picker.exe');

  if (fs.existsSync(resultFile)) {
    try { fs.unlinkSync(resultFile); } catch (e) {}
  }

  const runTask = () => {
    exec('schtasks /run /tn "PickWorkbenchFile"', (runErr) => {
      if (runErr) {
        console.warn('schtasks run failed, recreating task:', runErr);
        exec(`schtasks /create /tn "PickWorkbenchFile" /tr "${pickerExe}" /sc ONCE /st 23:59 /it /f`, (crErr) => {
          if (!crErr) {
            exec('schtasks /run /tn "PickWorkbenchFile"');
          }
        });
      }
    });
  };

  runTask();

  const startTime = Date.now();
  const interval = setInterval(() => {
    if (fs.existsSync(resultFile)) {
      clearInterval(interval);
      try {
        const rawContent = fs.readFileSync(resultFile, 'utf8').trim();
        try { fs.unlinkSync(resultFile); } catch (e) {}

        if (!rawContent || rawContent === 'CANCELLED') {
          return res.json({ success: true, cancelled: true });
        }

        if (rawContent.startsWith('ERROR:')) {
          return res.status(500).json({ success: false, message: rawContent });
        }

        const cleanPath = rawContent.replace(/^["']|["']$/g, '').trim();
        const fileName = path.basename(cleanPath);
        const ext = path.extname(cleanPath).toLowerCase().replace('.', '');
        let size = 0;
        if (fs.existsSync(cleanPath)) {
          try { size = fs.statSync(cleanPath).size; } catch (e) {}
        }

        return res.json({
          success: true,
          filePath: cleanPath,
          fileName: fileName,
          fileType: ext,
          size: size
        });
      } catch (readErr) {
        return res.status(500).json({ success: false, message: '读取选择结果失败' });
      }
    }

    if (Date.now() - startTime > 90000) {
      clearInterval(interval);
      return res.status(408).json({ success: false, message: '选择文件超时' });
    }
  }, 150);
});

// Serve frontend dist if available (SPA support for production)
const DIST_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Start listening
app.listen(PORT, () => {
  console.log(`Workbench Backend API Server running on http://localhost:${PORT}`);
});


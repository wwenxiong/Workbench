import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Data Directory & DB File
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial DB template
const defaultDb = {
  tasks: [
    {
      id: 'task_demo_1',
      title: '完成工作台 Excel Hub 单元格免打开读取功能联调',
      priority: 'p1', // p1: 紧急且重要, p2: 重要不紧急, p3: 紧急不重要, p4: 不重要不紧急
      estimatedMinutes: 45,
      actualMinutes: 30,
      tags: ['开发', 'Excel Hub'],
      dueDate: new Date().toISOString().slice(0, 10),
      completed: true,
      completedAt: new Date(Date.now() - 3600000).toISOString(),
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      order: 0,
    },
    {
      id: 'task_demo_2',
      title: '优化番茄钟整点报时与提示音体验',
      priority: 'p2',
      estimatedMinutes: 30,
      actualMinutes: 25,
      tags: ['交互', '时钟'],
      dueDate: new Date().toISOString().slice(0, 10),
      completed: true,
      completedAt: new Date(Date.now() - 1800000).toISOString(),
      createdAt: new Date(Date.now() - 7000000).toISOString(),
      order: 1,
    },
    {
      id: 'task_demo_3',
      title: '整理本周项目推进周报并同步至年度总台账',
      priority: 'p1',
      estimatedMinutes: 20,
      actualMinutes: 0,
      tags: ['周报', '归档'],
      dueDate: new Date().toISOString().slice(0, 10),
      completed: false,
      completedAt: null,
      createdAt: new Date(Date.now() - 5000000).toISOString(),
      order: 2,
    },
    {
      id: 'task_demo_4',
      title: '梳理下季度个人技术路线与关键业务指标',
      priority: 'p2',
      estimatedMinutes: 60,
      actualMinutes: 0,
      tags: ['规划'],
      dueDate: new Date().toISOString().slice(0, 10),
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      order: 3,
    }
  ],
  focusLogs: [
    {
      id: 'log_demo_1',
      taskId: 'task_demo_1',
      taskTitle: '完成工作台 Excel Hub 单元格免打开读取功能联调',
      mode: 'pomodoro',
      durationSeconds: 1800,
      durationMinutes: 30,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      date: new Date().toISOString().slice(0, 10)
    },
    {
      id: 'log_demo_2',
      taskId: 'task_demo_2',
      taskTitle: '优化番茄钟整点报时与提示音体验',
      mode: 'pomodoro',
      durationSeconds: 1500,
      durationMinutes: 25,
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      date: new Date().toISOString().slice(0, 10)
    }
  ],
  dailyReports: {},
  excelConfigs: [
    {
      id: 'cfg_sample_ledger',
      name: '年度工作总台账 (本地示例)',
      category: '个人台账',
      filePath: path.join(__dirname, 'data', '年度工作总台账.xlsx'),
      targetSheet: '工作日志台账',
      isAnnualLedger: true,
      monitoredCells: [
        { label: '年度累计已交付', sheet: '指标看板', cell: 'B2' },
        { label: '本月专注总学时(h)', sheet: '指标看板', cell: 'B3' },
        { label: '待攻坚关键事项', sheet: '指标看板', cell: 'B4' }
      ]
    }
  ]
};

// Database helper functions
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDb(defaultDb);
      return defaultDb;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read db:', err);
    return defaultDb;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db:', err);
  }
}

// Ensure sample Excel ledger exists
async function ensureSampleExcel(filePath) {
  if (fs.existsSync(filePath)) return;
  const workbook = new ExcelJS.Workbook();
  
  // Sheet 1: 指标看板
  const kpiSheet = workbook.addWorksheet('指标看板');
  kpiSheet.columns = [
    { header: '指标名称', key: 'name', width: 22 },
    { header: '指标数值', key: 'value', width: 20 },
    { header: '单位/说明', key: 'desc', width: 25 },
  ];
  kpiSheet.addRow({ name: '年度累计已交付', value: '48 项', desc: '全年交付核心成果数' });
  kpiSheet.addRow({ name: '本月专注总学时(h)', value: '38.5', desc: '深度专注有效时长' });
  kpiSheet.addRow({ name: '待攻坚关键事项', value: '3 个', desc: '近期 P1 重点推进中' });

  // Style header
  kpiSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  kpiSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };

  // Sheet 2: 工作日志台账
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

// Initialize on start
(async () => {
  const db = readDb();
  if (db.excelConfigs && db.excelConfigs.length > 0) {
    const sample = db.excelConfigs.find(c => c.id === 'cfg_sample_ledger');
    if (sample && sample.filePath) {
      await ensureSampleExcel(sample.filePath);
    }
  }

  // Initialize sample notes if empty
  if (!db.notes || db.notes.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    db.notes = [
      {
        id: 'note_demo_1',
        type: 'daily_report',
        title: '昨日工作日报归档',
        content: '完成个人工作台 2.0 架构升级，实现日常待办管理与时间统计全链路打通。',
        date: yesterday,
        time: '18:30',
        tags: ['工作日报', '产出'],
        isPinned: true,
        bg: 'bg-emerald-50/60 border-emerald-100',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        dailyReportData: {
          deliverables: '1. 完成个人工作台 2.0 架构升级；\n2. 联调待办与时钟统计。',
          blockers: '无明显阻塞。',
          tomorrowPlan: '继续完善快速记录与日历时间联动。',
          completedCount: 3,
          focusMinutes: 120
        }
      },
      {
        id: 'note_demo_2',
        type: 'note',
        title: '用户交互反馈',
        content: '希望增加深色模式和快捷键支持，优化弹窗动画性能。',
        date: today,
        time: '10:15',
        tags: ['体验', 'UI'],
        isPinned: true,
        bg: 'bg-white',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'note_demo_3',
        type: 'meeting',
        title: 'Q2 推广计划沟通纪要',
        content: '与市场团队深入沟通 Q2 推广计划细节，确认首期宣发物料进度。',
        date: today,
        time: '14:20',
        tags: ['市场', '会议'],
        isPinned: false,
        bg: 'bg-[#FFFBEB] border-amber-100',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    writeDb(db);
  }
})();

// ==================== TASK APIS ====================

// Helper: Sync recurring tasks for given date (e.g. daily, workday, weekly)
function syncRecurringTasks(db, targetDate) {
  if (!db.tasks || !Array.isArray(db.tasks)) return false;
  
  const today = new Date().toISOString().slice(0, 10);
  const checkDate = targetDate || today;
  const dObj = new Date(checkDate + 'T00:00:00');
  const dayOfWeek = dObj.getDay(); // 0: Sunday, 1..5: Mon..Fri, 6: Saturday
  const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;

  let changed = false;

  // Find all recurring parent tasks
  const recurringParents = db.tasks.filter(t => t.isRecurring && !t.recurringParentId && t.recurringConfig);

  recurringParents.forEach(parent => {
    const { frequency, startDate, endDate } = parent.recurringConfig;
    if (!startDate) return;

    // Check date bounds
    if (checkDate < startDate) return;
    if (endDate && checkDate > endDate) return;

    // Check frequency
    if (frequency === 'workday' && !isWorkday) return;
    if (frequency === 'weekly') {
      const startDayOfWeek = new Date(startDate + 'T00:00:00').getDay();
      if (dayOfWeek !== startDayOfWeek) return;
    }

    // Check if an instance already exists for checkDate
    const existingInstance = db.tasks.find(t => {
      const taskDate = (t.dueDate || '').slice(0, 10);
      return taskDate === checkDate && (t.recurringParentId === parent.id || t.id === parent.id);
    });

    if (!existingInstance) {
      // Auto generate daily instance
      const instance = {
        id: `task_rec_${parent.id}_${checkDate}`,
        title: parent.title,
        priority: parent.priority,
        estimatedMinutes: parent.estimatedMinutes,
        actualMinutes: 0,
        tags: parent.tags,
        dueDate: `${checkDate}${parent.dueDate?.includes('T') ? 'T' + parent.dueDate.split('T')[1] : ''}`,
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        order: db.tasks.length,
        isRecurring: true,
        recurringParentId: parent.id,
        recurringConfig: parent.recurringConfig
      };
      db.tasks.unshift(instance);
      changed = true;
    }
  });

  return changed;
}

// Get all tasks (auto syncs recurring tasks for current day / target date)
app.get('/api/tasks', (req, res) => {
  const db = readDb();
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (syncRecurringTasks(db, date)) {
    writeDb(db);
  }
  res.json({ success: true, data: db.tasks });
});

// Create task
app.post('/api/tasks', (req, res) => {
  const db = readDb();
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
    order: db.tasks.length,
    isRecurring: !!req.body.isRecurring,
    recurringConfig: req.body.recurringConfig || null,
    recurringParentId: req.body.recurringParentId || null,
    ...req.body
  };
  db.tasks.unshift(newTask);

  // If this is recurring, also ensure today's instance exists if within range
  const today = new Date().toISOString().slice(0, 10);
  syncRecurringTasks(db, today);

  writeDb(db);
  res.json({ success: true, data: newTask });
});

// Update task
app.put('/api/tasks/:id', (req, res) => {
  const db = readDb();
  const idx = db.tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: '任务不存在' });
  }

  const prev = db.tasks[idx];
  const updated = { ...prev, ...req.body };

  // If completed changed to true and no completedAt, auto set timestamp
  if (req.body.completed === true && !prev.completed) {
    updated.completedAt = req.body.completedAt || new Date().toISOString();
  } else if (req.body.completed === false) {
    updated.completedAt = null;
  }

  db.tasks[idx] = updated;
  writeDb(db);
  res.json({ success: true, data: updated });
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const db = readDb();
  db.tasks = db.tasks.filter(t => t.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// Reorder tasks
app.post('/api/tasks/reorder', (req, res) => {
  const { taskIds } = req.body;
  if (!Array.isArray(taskIds)) {
    return res.status(400).json({ success: false, message: 'Invalid taskIds' });
  }
  const db = readDb();
  const taskMap = new Map(db.tasks.map(t => [t.id, t]));
  const reordered = [];
  taskIds.forEach((id, idx) => {
    if (taskMap.has(id)) {
      const task = taskMap.get(id);
      task.order = idx;
      reordered.push(task);
      taskMap.delete(id);
    }
  });
  taskMap.forEach(task => reordered.push(task));
  db.tasks = reordered;
  writeDb(db);
  res.json({ success: true, data: db.tasks });
});

// ==================== FOCUS LOG APIS ====================

// Get focus logs
app.get('/api/focus-logs', (req, res) => {
  const db = readDb();
  const { date } = req.query;
  let logs = db.focusLogs || [];
  if (date) {
    logs = logs.filter(l => l.date === date);
  }
  res.json({ success: true, data: logs });
});

// Record focus log & link with task
app.post('/api/focus-logs', (req, res) => {
  const db = readDb();
  const { taskId, mode, durationSeconds, note } = req.body;
  const durationSec = Number(durationSeconds) || 0;
  const durationMin = Math.round(durationSec / 60);

  let taskTitle = '';
  if (taskId) {
    const task = db.tasks.find(t => t.id === taskId);
    if (task) {
      taskTitle = task.title;
      task.actualMinutes = (task.actualMinutes || 0) + durationMin;
    }
  }

  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    taskId: taskId || null,
    taskTitle: taskTitle || (mode === 'pomodoro' ? '番茄钟专注' : '正计时专注'),
    mode: mode || 'pomodoro',
    durationSeconds: durationSec,
    durationMinutes: durationMin,
    note: note || '',
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10)
  };

  db.focusLogs = db.focusLogs || [];
  db.focusLogs.unshift(newLog);
  writeDb(db);

  res.json({ success: true, data: newLog });
});

// ==================== QUICK RECORDS / NOTES APIS ====================

// Get notes (supports ?type= and ?date=)
app.get('/api/notes', (req, res) => {
  const db = readDb();
  let notes = db.notes || [];
  
  const { type, date } = req.query;
  if (type && type !== 'all') {
    notes = notes.filter(n => n.type === type);
  }
  if (date) {
    notes = notes.filter(n => n.date === date);
  }

  // Sort: pinned first, then newest first
  notes.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
  });

  res.json({ success: true, data: notes });
});

// Create note
app.post('/api/notes', (req, res) => {
  const db = readDb();
  db.notes = db.notes || [];

  const now = new Date();
  const noteDate = req.body.date || now.toISOString().slice(0, 10);
  const noteTime = req.body.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newNote = {
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

  // If this is a work daily report, link and sync with db.dailyReports[noteDate]
  if (newNote.type === 'daily_report') {
    db.dailyReports = db.dailyReports || {};
    const prevRep = db.dailyReports[noteDate] || {};
    db.dailyReports[noteDate] = {
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
    };
  }

  db.notes.unshift(newNote);
  writeDb(db);
  res.json({ success: true, data: newNote });
});

// Update note
app.put('/api/notes/:id', (req, res) => {
  const db = readDb();
  db.notes = db.notes || [];
  const idx = db.notes.findIndex(n => n.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }

  const prev = db.notes[idx];
  const updated = {
    ...prev,
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  db.notes[idx] = updated;

  // If daily_report, sync with dailyReports
  if (updated.type === 'daily_report') {
    db.dailyReports = db.dailyReports || {};
    db.dailyReports[updated.date] = {
      ...(db.dailyReports[updated.date] || {}),
      date: updated.date,
      deliverables: updated.dailyReportData?.deliverables || updated.content,
      blockers: updated.dailyReportData?.blockers || '无明显阻塞',
      tomorrowPlan: updated.dailyReportData?.tomorrowPlan || '',
      customNotes: updated.content,
      updatedAt: new Date().toISOString()
    };
  }

  writeDb(db);
  res.json({ success: true, data: updated });
});

// Delete note
app.delete('/api/notes/:id', (req, res) => {
  const db = readDb();
  db.notes = db.notes || [];
  db.notes = db.notes.filter(n => n.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// ==================== CALENDAR DATE MEMO APIS ====================

// Get memos (supports ?date=YYYY-MM-DD)
app.get('/api/memos', (req, res) => {
  const db = readDb();
  let memos = db.memos || [];
  const { date } = req.query;
  if (date) {
    memos = memos.filter(m => m.date === date);
  }
  res.json({ success: true, data: memos });
});

// Create memo
app.post('/api/memos', (req, res) => {
  const db = readDb();
  db.memos = db.memos || [];
  const now = new Date();
  const newMemo = {
    id: `memo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: req.body.date || now.toISOString().slice(0, 10),
    time: req.body.time || '',
    content: (req.body.content || '').trim(),
    completed: !!req.body.completed,
    tag: req.body.tag || '备忘',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
  db.memos.unshift(newMemo);
  writeDb(db);
  res.json({ success: true, data: newMemo });
});

// Update memo
app.put('/api/memos/:id', (req, res) => {
  const db = readDb();
  db.memos = db.memos || [];
  const idx = db.memos.findIndex(m => m.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: '备忘不存在' });
  }
  db.memos[idx] = {
    ...db.memos[idx],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  writeDb(db);
  res.json({ success: true, data: db.memos[idx] });
});

// Delete memo
app.delete('/api/memos/:id', (req, res) => {
  const db = readDb();
  db.memos = (db.memos || []).filter(m => m.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// ==================== DAILY & WEEKLY REPORT APIS ====================

// Get daily report for date (with auto aggregation)
app.get('/api/reports/daily/:date', (req, res) => {
  const { date } = req.params;
  const db = readDb();
  
  // Find completed tasks on this date
  const completedTasks = db.tasks.filter(t => {
    if (!t.completed) return false;
    const completedDate = (t.completedAt || t.createdAt || '').slice(0, 10);
    return completedDate === date;
  });

  // Helper to extract chronological sort key (earliest timestamp first)
  const getTaskTimestampValue = (t) => {
    // 1. If explicit startTime exists, e.g. "08:00" -> "2026-09-02T08:00:00"
    if (t.startTime) {
      return `${date}T${t.startTime}:00`;
    }
    // 2. If timeSpan exists, e.g. "8-9点", "08:00-09:00", "8:30-9:00"
    if (t.timeSpan) {
      const match = t.timeSpan.match(/^(\d{1,2})(?::(\d{1,2}))?/);
      if (match) {
        const hour = String(match[1]).padStart(2, '0');
        const min = match[2] ? String(match[2]).padStart(2, '0') : '00';
        return `${date}T${hour}:${min}:00`;
      }
    }
    // 3. Fallback to completedAt timestamp
    if (t.completedAt) {
      return t.completedAt;
    }
    // 4. Fallback to dueDate
    if (t.dueDate && t.dueDate.includes('T')) {
      return t.dueDate;
    }
    // 5. Fallback to createdAt timestamp
    return t.createdAt || '';
  };

  // Sort completed tasks by chronological timestamp (earliest to latest)
  completedTasks.sort((a, b) => {
    const timeA = getTaskTimestampValue(a);
    const timeB = getTaskTimestampValue(b);
    return timeA.localeCompare(timeB);
  });

  // Find incomplete tasks on this date
  const incompleteTasks = db.tasks.filter(t => {
    if (t.completed) return false;
    const dueDate = (t.dueDate || '').slice(0, 10);
    return dueDate <= date;
  });

  // Focus logs for this date
  const dayLogs = (db.focusLogs || []).filter(l => l.date === date);
  const totalFocusMinutes = dayLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

  // Existing saved report
  const existing = (db.dailyReports && db.dailyReports[date]) || null;

  // Auto generated summary draft
  let defaultDeliverables = completedTasks.length > 0 
    ? completedTasks.map((t, i) => {
        const timeParts = [];
        if (t.timeSpan) {
          timeParts.push(`完成时间：${t.timeSpan}`);
        }
        if (t.actualMinutes) {
          timeParts.push(`${t.actualMinutes}分钟`);
        }
        const suffix = timeParts.length > 0 ? `（${timeParts.join('，')}）` : '';
        return `${i + 1}. ${t.title}${suffix}`;
      }).join('\n')
    : '1. 推进重点任务交付\n2. 沟通各方需求与进展';

  let defaultBlockers = incompleteTasks.length > 0
    ? incompleteTasks.map((t, i) => `${i + 1}. [${t.priority.toUpperCase()}] ${t.title}`).join('\n')
    : '推进顺利，无明显阻塞项';

  // Calculate tomorrow's date for this report
  const dParts = date.split('-').map(Number);
  const targetDateObj = new Date(dParts[0], dParts[1] - 1, dParts[2]);
  targetDateObj.setDate(targetDateObj.getDate() + 1);
  const tomorrowStr = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;
  const tomorrowDayOfWeek = targetDateObj.getDay();
  const isTomorrowWorkday = tomorrowDayOfWeek >= 1 && tomorrowDayOfWeek <= 5;

  // Find recurring parent tasks applicable to tomorrow
  const recurringParents = (db.tasks || []).filter(t => t.isRecurring && !t.recurringParentId && t.recurringConfig);
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

  // Also any tasks whose dueDate is explicitly tomorrow
  const tomorrowDueTasks = (db.tasks || []).filter(t => {
    if (t.completed) return false;
    if (t.isRecurring) return false;
    const due = (t.dueDate || '').slice(0, 10);
    return due === tomorrowStr;
  });

  // Combine tomorrow items
  const allTomorrowTitles = [
    ...tomorrowRecurringTasks.map(t => t.title),
    ...tomorrowDueTasks.map(t => t.title)
  ];

  let defaultTomorrow = allTomorrowTitles.length > 0
    ? allTomorrowTitles.map((title, i) => `${i + 1}. ${title}`).join('\n')
    : '1. 按计划推进重点工作\n2. 跟进日常事务协同';

  const reportData = {
    date,
    deliverables: existing?.deliverables || defaultDeliverables,
    chronologicalDeliverables: defaultDeliverables,
    blockers: existing?.blockers || defaultBlockers,
    tomorrowPlan: existing?.tomorrowPlan || defaultTomorrow,
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
  const db = readDb();
  db.dailyReports = db.dailyReports || {};
  
  db.dailyReports[date] = {
    date,
    deliverables: req.body.deliverables || '',
    blockers: req.body.blockers || '',
    tomorrowPlan: req.body.tomorrowPlan || '',
    customNotes: req.body.customNotes || '',
    syncedToExcel: req.body.syncedToExcel !== undefined ? req.body.syncedToExcel : (db.dailyReports[date]?.syncedToExcel || false),
    syncedAt: req.body.syncedAt || db.dailyReports[date]?.syncedAt || null,
    updatedAt: new Date().toISOString()
  };

  // Also update or create corresponding note in db.notes
  if (db.notes && Array.isArray(db.notes)) {
    const noteIdx = db.notes.findIndex(n => n.type === 'daily_report' && n.date === date);
    if (noteIdx !== -1) {
      db.notes[noteIdx] = {
        ...db.notes[noteIdx],
        content: req.body.deliverables || db.notes[noteIdx].content,
        dailyReportData: {
          deliverables: req.body.deliverables || '',
          blockers: req.body.blockers || '',
          tomorrowPlan: req.body.tomorrowPlan || '',
          completedCount: db.dailyReports[date].completedTasksCount || 0,
          focusMinutes: db.dailyReports[date].totalFocusMinutes || 0,
        },
        updatedAt: new Date().toISOString()
      };
    }
  }

  writeDb(db);
  res.json({ success: true, data: db.dailyReports[date] });
});

// Delete daily report
app.delete('/api/reports/daily/:date', (req, res) => {
  const { date } = req.params;
  const db = readDb();
  if (db.dailyReports && db.dailyReports[date]) {
    delete db.dailyReports[date];
  }
  if (db.notes && Array.isArray(db.notes)) {
    db.notes = db.notes.filter(n => !(n.type === 'daily_report' && n.date === date));
  }
  writeDb(db);
  res.json({ success: true });
});

// Get all daily reports sorted by date descending
app.get('/api/reports/daily-list', (req, res) => {
  const db = readDb();
  const reports = db.dailyReports || {};
  const list = Object.keys(reports).map(dateKey => {
    const rep = reports[dateKey];
    return {
      ...rep,
      date: dateKey,
    };
  });
  list.sort((a, b) => b.date.localeCompare(a.date));
  res.json({ success: true, data: list });
});

// Export daily reports to Excel (.xlsx) by date or date range
app.get('/api/reports/export/excel', async (req, res) => {
  try {
    const { startDate, endDate, date } = req.query;
    const db = readDb();
    const reports = db.dailyReports || {};

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

    const sheet = workbook.addWorksheet('工作日报台账', {
      views: [{ showGridLines: true }]
    });

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

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.height = 30;
    headerRow.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0071E3' } // Apple Blue
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

    // Clean cell borders
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
  const db = readDb();
  const targetDateStr = req.query.date ? String(req.query.date) : new Date().toISOString().slice(0, 10);
  const targetDate = new Date(targetDateStr);

  // Compute Monday of current week
  const day = targetDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day; // 0 is Sunday
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

  // Aggregate daily reports & completed tasks
  const weekTasks = db.tasks.filter(t => {
    if (!t.completed || !t.completedAt) return false;
    const d = t.completedAt.slice(0, 10);
    return weekDates.includes(d);
  });

  const weekLogs = (db.focusLogs || []).filter(l => weekDates.includes(l.date));
  const totalWeekFocusMinutes = weekLogs.reduce((s, l) => s + (l.durationMinutes || 0), 0);

  // Group deliverables by tags
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

  const generatedDraft = `# 本周工作总结与下周规划 (${mondayStr} ~ ${fridayStr})

## 一、 本周核心工作交付成果
- **完成待办总数**：${weekTasks.length} 项
- **深度专注耗时**：${(totalWeekFocusMinutes / 60).toFixed(1)} 小时 (${totalWeekFocusMinutes} 分钟)

${deliverablesSummary.trim()}

## 二、 关键成效与复盘
- 各业务线按计划稳步推进，重点解决了关键功能链路与数据闭环。
- 深度专注时长保持稳定，待办清单流转顺畅。

## 三、 下周工作规划初稿
1. 持续跟踪未完结任务及待攻坚事项；
2. 推进下一阶段重点里程碑交付与台账归档；
3. 持续优化工作流，提升日常协同与研发效能。
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
  const db = readDb();
  const summaryMap = {};

  // Analyze tasks
  db.tasks.forEach(t => {
    const date = (t.dueDate || t.createdAt || '').slice(0, 10);
    if (!summaryMap[date]) {
      summaryMap[date] = { totalTasks: 0, completedTasks: 0, focusMinutes: 0, hasReport: false, status: 'gray' };
    }
    summaryMap[date].totalTasks += 1;
    if (t.completed) {
      summaryMap[date].completedTasks += 1;
    }
  });

  // Analyze focus logs
  (db.focusLogs || []).forEach(l => {
    const d = l.date;
    if (!summaryMap[d]) {
      summaryMap[d] = { totalTasks: 0, completedTasks: 0, focusMinutes: 0, hasReport: false, status: 'gray' };
    }
    summaryMap[d].focusMinutes += (l.durationMinutes || 0);
  });

  // Analyze reports
  if (db.dailyReports) {
    Object.keys(db.dailyReports).forEach(d => {
      if (!summaryMap[d]) {
        summaryMap[d] = { totalTasks: 0, completedTasks: 0, focusMinutes: 0, hasReport: false, status: 'gray' };
      }
      summaryMap[d].hasReport = true;
    });
  }

  // Calculate status:
  // green: hasReport && all tasks completed (totalTasks > 0 && completedTasks === totalTasks)
  // yellow: completedTasks > 0 but some incomplete or report not submitted
  // red: totalTasks > completedTasks
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
  const db = readDb();
  res.json({ success: true, data: db.excelConfigs || [] });
});

// Add Excel config
app.post('/api/excel/configs', (req, res) => {
  const db = readDb();
  const newConfig = {
    id: `cfg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: req.body.name || '新表格快捷跳板',
    category: req.body.category || '日常办公',
    filePath: req.body.filePath || '',
    targetSheet: req.body.targetSheet || 'Sheet1',
    isAnnualLedger: !!req.body.isAnnualLedger,
    monitoredCells: Array.isArray(req.body.monitoredCells) ? req.body.monitoredCells : []
  };

  db.excelConfigs = db.excelConfigs || [];
  db.excelConfigs.push(newConfig);
  writeDb(db);
  res.json({ success: true, data: newConfig });
});

// Update Excel config
app.put('/api/excel/configs/:id', (req, res) => {
  const db = readDb();
  const idx = (db.excelConfigs || []).findIndex(c => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: '配置不存在' });
  }
  db.excelConfigs[idx] = { ...db.excelConfigs[idx], ...req.body };
  writeDb(db);
  res.json({ success: true, data: db.excelConfigs[idx] });
});

// Delete Excel config
app.delete('/api/excel/configs/:id', (req, res) => {
  const db = readDb();
  db.excelConfigs = (db.excelConfigs || []).filter(c => c.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// Shared helper to open file with system default application on the interactive desktop
function openWithSystemDefault(filePath, res, successMsg, onOpened) {
  try {
    const vbsPath = path.join(__dirname, 'open_helper.vbs');

    // schtasks with /it flag runs the task in Session 1 on the interactive desktop
    // This solves the Windows background daemon GUI suppression
    const taskCmd = `schtasks /create /tn "OpenWorkbenchFile" /tr "wscript.exe \\"${vbsPath}\\" \\"${filePath}\\"" /sc ONCE /st 23:59 /it /f`;

    exec(taskCmd, (createErr) => {
      if (!createErr) {
        exec('schtasks /run /tn "OpenWorkbenchFile"', (runErr) => {
          if (runErr) {
            console.warn('schtasks run failed, falling back to direct wscript:', runErr);
            const fb = spawn('wscript.exe', [vbsPath, filePath], { detached: true, stdio: 'ignore' });
            fb.unref();
          }
        });
      } else {
        console.warn('schtasks create failed, falling back to direct wscript:', createErr);
        const fb = spawn('wscript.exe', [vbsPath, filePath], { detached: true, stdio: 'ignore' });
        fb.unref();
      }
    });

    if (onOpened) {
      onOpened();
    }

    return res.json({ success: true, message: successMsg || '已通过系统默认应用快速打开' });
  } catch (err) {
    console.error('Failed to launch application:', err);
    return res.status(500).json({ success: false, message: `打开文件失败: ${err.message}` });
  }
}

// Open Excel file with Windows default application
app.post('/api/excel/open', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ success: false, message: '文件路径不能为空' });
  }

  // Check file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: `本地文件不存在: ${filePath}` });
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
      
      // Handle exceljs formula results or rich text
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
  const db = readDb();

  let targetConfig = null;
  if (configId) {
    targetConfig = (db.excelConfigs || []).find(c => c.id === configId);
  }
  if (!targetConfig) {
    targetConfig = (db.excelConfigs || []).find(c => c.isAnnualLedger) || (db.excelConfigs || [])[0];
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

    // Update daily report synced status
    const reportDate = date || new Date().toISOString().slice(0, 10);
    db.dailyReports = db.dailyReports || {};
    if (!db.dailyReports[reportDate]) {
      db.dailyReports[reportDate] = { date: reportDate };
    }
    db.dailyReports[reportDate].syncedToExcel = true;
    db.dailyReports[reportDate].syncedAt = nowStr;
    writeDb(db);

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

// ==================== LINKED FILES HUB APIS ====================

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure demo Excel exists for quick testing
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

// Get all linked files
app.get('/api/files', (req, res) => {
  const db = readDb();
  if (!db.linkedFiles || db.linkedFiles.length === 0) {
    db.linkedFiles = [
      {
        id: 'file_demo_1',
        name: '工作日志与日常台账.xlsx',
        filePath: demoExcelPath,
        fileType: 'xlsx',
        size: 14520,
        category: '数据表格',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastOpenedAt: null,
        isPinned: true,
        notes: '团队核心工作台账'
      },
      {
        id: 'file_demo_2',
        name: '工作台设计规划与架构说明.md',
        filePath: path.join(__dirname, '..', 'package.json'),
        fileType: 'json',
        size: 1049,
        category: '工作文档',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastOpenedAt: null,
        isPinned: true,
        notes: '产品工程与依赖配置'
      },
      {
        id: 'file_demo_3',
        name: '本地持久化数据.json',
        filePath: DB_FILE,
        fileType: 'json',
        size: 24500,
        category: '开发配置',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastOpenedAt: null,
        isPinned: false,
        notes: '个人工作台本地数据'
      }
    ];
    writeDb(db);
  }
  res.json({ success: true, data: db.linkedFiles });
});

// Link new local file as a pure hyperlink to the user's actual original file
app.post('/api/files', (req, res) => {
  const db = readDb();
  let { name, filePath, fileType, size, category, isPinned, notes } = req.body;

  if (!filePath) {
    return res.status(400).json({ success: false, message: '请提供本地文件路径' });
  }

  // Strip surrounding quotes if pasted with quotes (e.g. from Windows "Copy as path")
  filePath = filePath.replace(/^["']|["']$/g, '').trim();

  // If name not provided or matches a path, take the real base filename
  if (!name || name === filePath) {
    name = path.basename(filePath);
  }

  // Derive fileType from extension if needed
  if (!fileType && filePath) {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    fileType = ext || 'file';
  }

  // Get real file size if not provided
  if (!size && fs.existsSync(filePath)) {
    try {
      size = fs.statSync(filePath).size;
    } catch (e) {
      console.warn('Stat file failed:', e);
    }
  }

  const newFile = {
    id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name,
    filePath: filePath,
    fileType: (fileType || 'file').toLowerCase(),
    size: size || 0,
    category: category || '数据表格',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastOpenedAt: null,
    isPinned: !!isPinned,
    notes: notes || ''
  };

  db.linkedFiles = db.linkedFiles || [];
  db.linkedFiles.unshift(newFile);
  writeDb(db);

  res.json({ success: true, data: newFile });
});

// Update linked file
app.put('/api/files/:id', (req, res) => {
  const db = readDb();
  const idx = (db.linkedFiles || []).findIndex(f => f.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: '文件链接不存在' });
  }

  db.linkedFiles[idx] = {
    ...db.linkedFiles[idx],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  writeDb(db);
  res.json({ success: true, data: db.linkedFiles[idx] });
});

// Delete linked file
app.delete('/api/files/:id', (req, res) => {
  const db = readDb();
  db.linkedFiles = (db.linkedFiles || []).filter(f => f.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// Quick open file with Windows default application
app.post('/api/files/open', (req, res) => {
  const { filePath, id } = req.body;
  if (!filePath) {
    return res.status(400).json({ success: false, message: '文件路径不能为空' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: `本地文件不存在: ${filePath}` });
  }

  return openWithSystemDefault(filePath, res, '已通过系统默认应用快速打开', () => {
    if (id) {
      const db = readDb();
      const file = (db.linkedFiles || []).find(f => f.id === id);
      if (file) {
        file.lastOpenedAt = new Date().toISOString();
        writeDb(db);
      }
    }
  });
});

// Reveal file in Windows Explorer
app.post('/api/files/reveal', (req, res) => {
  const { filePath } = req.body;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: '文件不存在' });
  }
  const taskCmd = `schtasks /create /tn "RevealWorkbenchFile" /tr "explorer.exe /select,\\"${filePath}\\"" /sc ONCE /st 23:59 /it /f`;
  exec(taskCmd, (taskErr) => {
    if (!taskErr) {
      exec('schtasks /run /tn "RevealWorkbenchFile"');
    } else {
      exec(`explorer /select,"${filePath}"`);
    }
  });
  res.json({ success: true, message: '已在资源管理器中定位' });
});

// Interactive File Picker Dialog via Windows OpenFileDialog
app.post('/api/files/pick', (req, res) => {
  const resultFile = 'C:\\Users\\Admin\\OneDrive\\2304~1\\work\\server\\data\\picked_file.txt';
  const pickerExe = 'C:\\Users\\Admin\\OneDrive\\2304~1\\work\\server\\picker.exe';

  if (fs.existsSync(resultFile)) {
    try { fs.unlinkSync(resultFile); } catch (e) {}
  }

  // Pre-ensure scheduled task points to fast native picker.exe
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

// Start listening
app.listen(PORT, () => {
  console.log(`Workbench Backend API Server running on http://localhost:${PORT}`);
});

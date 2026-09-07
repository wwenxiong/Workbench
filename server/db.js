import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'workbench.db');
const OLD_JSON_PATH = path.join(DATA_DIR, 'db.json');

// Initialize SQLite database instance
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency and write performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 1. Initialize Tables
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER,
      created_at TEXT,
      expires_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth_sessions(token);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      priority TEXT DEFAULT 'p2',
      estimated_minutes INTEGER DEFAULT 25,
      actual_minutes INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      due_date TEXT,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT,
      sort_order INTEGER DEFAULT 0,
      is_recurring INTEGER DEFAULT 0,
      recurring_config TEXT,
      recurring_parent_id TEXT,
      time_span TEXT,
      start_time TEXT,
      end_time TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(sort_order);

    CREATE TABLE IF NOT EXISTS focus_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      task_title TEXT,
      mode TEXT,
      duration_seconds INTEGER DEFAULT 0,
      duration_minutes INTEGER DEFAULT 0,
      timestamp TEXT,
      date TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_focus_logs_date ON focus_logs(date);

    CREATE TABLE IF NOT EXISTS daily_reports (
      date TEXT PRIMARY KEY,
      deliverables TEXT,
      blockers TEXT,
      tomorrow_plan TEXT,
      custom_notes TEXT,
      completed_tasks_count INTEGER DEFAULT 0,
      total_focus_minutes INTEGER DEFAULT 0,
      synced_to_excel INTEGER DEFAULT 0,
      synced_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS excel_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      file_path TEXT,
      target_sheet TEXT,
      is_annual_ledger INTEGER DEFAULT 0,
      monitored_cells TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'note',
      title TEXT,
      content TEXT,
      date TEXT,
      time TEXT,
      tags TEXT DEFAULT '[]',
      is_pinned INTEGER DEFAULT 0,
      bg TEXT,
      daily_report_data TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(date);
    CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);

    CREATE TABLE IF NOT EXISTS memos (
      id TEXT PRIMARY KEY,
      date TEXT,
      time TEXT,
      content TEXT,
      completed INTEGER DEFAULT 0,
      tag TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_memos_date ON memos(date);

    CREATE TABLE IF NOT EXISTS linked_files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      size INTEGER DEFAULT 0,
      category TEXT,
      created_at TEXT,
      updated_at TEXT,
      last_opened_at TEXT,
      is_pinned INTEGER DEFAULT 0,
      notes TEXT
    );
  `);

  try {
    const tableInfo = db.prepare("PRAGMA table_info(auth_sessions)").all();
    const hasUserId = tableInfo.some(col => col.name === 'user_id');
    if (!hasUserId) {
      db.exec("ALTER TABLE auth_sessions ADD COLUMN user_id INTEGER;");
    }
  } catch (e) {
    // ignore
  }
}

// 2. Data Mapping Helpers
function formatTaskFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    priority: row.priority,
    estimatedMinutes: row.estimated_minutes,
    actualMinutes: row.actual_minutes,
    tags: safeJsonParse(row.tags, []),
    dueDate: row.due_date,
    completed: Boolean(row.completed),
    completedAt: row.completed_at,
    createdAt: row.created_at,
    order: row.sort_order,
    isRecurring: Boolean(row.is_recurring),
    recurringConfig: safeJsonParse(row.recurring_config, null),
    recurringParentId: row.recurring_parent_id,
    timeSpan: row.time_span,
    startTime: row.start_time,
    endTime: row.end_time
  };
}

function formatFocusLogFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    taskId: row.task_id,
    taskTitle: row.task_title,
    mode: row.mode,
    durationSeconds: row.duration_seconds,
    durationMinutes: row.duration_minutes,
    timestamp: row.timestamp,
    date: row.date
  };
}

function formatDailyReportFromDb(row) {
  if (!row) return null;
  return {
    date: row.date,
    deliverables: row.deliverables || '',
    blockers: row.blockers || '',
    tomorrowPlan: row.tomorrow_plan || '',
    customNotes: row.custom_notes || '',
    completedTasksCount: row.completed_tasks_count || 0,
    totalFocusMinutes: row.total_focus_minutes || 0,
    syncedToExcel: Boolean(row.synced_to_excel),
    syncedAt: row.synced_at,
    updatedAt: row.updated_at
  };
}

function formatExcelConfigFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    filePath: row.file_path,
    targetSheet: row.target_sheet,
    isAnnualLedger: Boolean(row.is_annual_ledger),
    monitoredCells: safeJsonParse(row.monitored_cells, [])
  };
}

function formatNoteFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    date: row.date,
    time: row.time,
    tags: safeJsonParse(row.tags, []),
    isPinned: Boolean(row.is_pinned),
    bg: row.bg,
    dailyReportData: safeJsonParse(row.daily_report_data, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function formatMemoFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    content: row.content,
    completed: Boolean(row.completed),
    tag: row.tag,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function formatLinkedFileFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    filePath: row.file_path,
    fileType: row.file_type,
    size: row.size,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastOpenedAt: row.last_opened_at,
    isPinned: Boolean(row.is_pinned),
    notes: row.notes || ''
  };
}

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// 3. Migration: Auto import from legacy db.json if exists
function migrateFromLegacyJson() {
  const taskCount = db.prepare('SELECT count(*) as count FROM tasks').get().count;
  if (taskCount > 0) {
    return;
  }

  if (!fs.existsSync(OLD_JSON_PATH)) {
    initDefaultData();
    return;
  }

  console.log('🔄 检测到已有的 db.json，正在无缝迁移数据至 SQLite (workbench.db)...');
  try {
    const raw = fs.readFileSync(OLD_JSON_PATH, 'utf-8');
    const legacy = JSON.parse(raw);

    const migrateTx = db.transaction(() => {
      // 1. Tasks
      if (Array.isArray(legacy.tasks)) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO tasks (
            id, title, priority, estimated_minutes, actual_minutes, tags,
            due_date, completed, completed_at, created_at, sort_order,
            is_recurring, recurring_config, recurring_parent_id,
            time_span, start_time, end_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        legacy.tasks.forEach((t, index) => {
          stmt.run(
            t.id,
            t.title || '新待办事项',
            t.priority || 'p2',
            t.estimatedMinutes || 25,
            t.actualMinutes || 0,
            JSON.stringify(Array.isArray(t.tags) ? t.tags : []),
            t.dueDate || null,
            t.completed ? 1 : 0,
            t.completedAt || null,
            t.createdAt || new Date().toISOString(),
            typeof t.order === 'number' ? t.order : index,
            t.isRecurring ? 1 : 0,
            t.recurringConfig ? JSON.stringify(t.recurringConfig) : null,
            t.recurringParentId || null,
            t.timeSpan || null,
            t.startTime || null,
            t.endTime || null
          );
        });
      }

      // 2. Focus logs
      if (Array.isArray(legacy.focusLogs)) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO focus_logs (
            id, task_id, task_title, mode, duration_seconds, duration_minutes, timestamp, date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        legacy.focusLogs.forEach(f => {
          stmt.run(
            f.id,
            f.taskId || null,
            f.taskTitle || null,
            f.mode || 'pomodoro',
            f.durationSeconds || 0,
            f.durationMinutes || 0,
            f.timestamp || new Date().toISOString(),
            f.date || new Date().toISOString().slice(0, 10)
          );
        });
      }

      // 3. Daily reports
      if (legacy.dailyReports && typeof legacy.dailyReports === 'object') {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO daily_reports (
            date, deliverables, blockers, tomorrow_plan, custom_notes,
            completed_tasks_count, total_focus_minutes, synced_to_excel, synced_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        Object.values(legacy.dailyReports).forEach(r => {
          if (!r || !r.date) return;
          stmt.run(
            r.date,
            r.deliverables || '',
            r.blockers || '',
            r.tomorrowPlan || '',
            r.customNotes || '',
            r.completedTasksCount || 0,
            r.totalFocusMinutes || 0,
            r.syncedToExcel ? 1 : 0,
            r.syncedAt || null,
            r.updatedAt || new Date().toISOString()
          );
        });
      }

      // 4. Excel configs
      if (Array.isArray(legacy.excelConfigs)) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO excel_configs (
            id, name, category, file_path, target_sheet, is_annual_ledger, monitored_cells
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        legacy.excelConfigs.forEach(c => {
          stmt.run(
            c.id,
            c.name || '',
            c.category || '',
            c.filePath || '',
            c.targetSheet || '',
            c.isAnnualLedger ? 1 : 0,
            JSON.stringify(c.monitoredCells || [])
          );
        });
      }

      // 5. Notes
      if (Array.isArray(legacy.notes)) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO notes (
            id, type, title, content, date, time, tags, is_pinned, bg, daily_report_data, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        legacy.notes.forEach(n => {
          stmt.run(
            n.id,
            n.type || 'note',
            n.title || '',
            n.content || '',
            n.date || '',
            n.time || '',
            JSON.stringify(Array.isArray(n.tags) ? n.tags : []),
            n.isPinned ? 1 : 0,
            n.bg || '',
            n.dailyReportData ? JSON.stringify(n.dailyReportData) : null,
            n.createdAt || new Date().toISOString(),
            n.updatedAt || new Date().toISOString()
          );
        });
      }

      // 6. Memos
      if (Array.isArray(legacy.memos)) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO memos (
            id, date, time, content, completed, tag, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        legacy.memos.forEach(m => {
          stmt.run(
            m.id,
            m.date || '',
            m.time || '',
            m.content || '',
            m.completed ? 1 : 0,
            m.tag || '备忘',
            m.createdAt || new Date().toISOString(),
            m.updatedAt || new Date().toISOString()
          );
        });
      }

      // 7. Linked files
      if (Array.isArray(legacy.linkedFiles)) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO linked_files (
            id, name, file_path, file_type, size, category, created_at, updated_at, last_opened_at, is_pinned, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        legacy.linkedFiles.forEach(f => {
          stmt.run(
            f.id,
            f.name || '',
            f.filePath || '',
            f.fileType || '',
            f.size || 0,
            f.category || '',
            f.createdAt || new Date().toISOString(),
            f.updatedAt || new Date().toISOString(),
            f.lastOpenedAt || null,
            f.isPinned ? 1 : 0,
            f.notes || ''
          );
        });
      }
    });

    migrateTx();
    console.log('✅ 数据平滑迁移成功！已完成向 SQLite 导入全部历史数据。');

    // Backup legacy file
    const backupPath = `${OLD_JSON_PATH}.bak`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(OLD_JSON_PATH, backupPath);
      console.log(`📦 历史 db.json 已安全备份至 ${backupPath}`);
    }
  } catch (err) {
    console.error('❌ 迁移 db.json 失败:', err);
  }
}

function initDefaultData() {
  const insertTask = db.prepare(`
    INSERT INTO tasks (
      id, title, priority, estimated_minutes, actual_minutes, tags,
      due_date, completed, completed_at, created_at, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTask.run(
    'task_demo_1',
    '完成工作台 Excel Hub 单元格免打开读取功能联调',
    'p1',
    45,
    30,
    JSON.stringify(['开发', 'Excel Hub']),
    new Date().toISOString().slice(0, 10),
    1,
    new Date(Date.now() - 3600000).toISOString(),
    new Date(Date.now() - 7200000).toISOString(),
    0
  );

  insertTask.run(
    'task_demo_2',
    '优化番茄钟整点报时与提示音体验',
    'p2',
    30,
    25,
    JSON.stringify(['交互', '时钟']),
    new Date().toISOString().slice(0, 10),
    1,
    new Date(Date.now() - 1800000).toISOString(),
    new Date(Date.now() - 7000000).toISOString(),
    1
  );

  const insertExcel = db.prepare(`
    INSERT INTO excel_configs (
      id, name, category, file_path, target_sheet, is_annual_ledger, monitored_cells
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertExcel.run(
    'cfg_sample_ledger',
    '年度工作总台账 (本地示例)',
    '个人台账',
    path.join(__dirname, 'data', '年度工作总台账.xlsx'),
    '工作日志台账',
    1,
    JSON.stringify([
      { label: '年度累计已交付', sheet: '指标看板', cell: 'B2' },
      { label: '本月专注总学时(h)', sheet: '指标看板', cell: 'B3' },
      { label: '待攻坚关键事项', sheet: '指标看板', cell: 'B4' }
    ])
  );
}

// Run schema setup & migration on load
initSchema();
migrateFromLegacyJson();

// ==================== REPOSITORIES ====================

export const taskRepo = {
  getAll() {
    const rows = db.prepare('SELECT * FROM tasks ORDER BY sort_order ASC, created_at DESC').all();
    return rows.map(formatTaskFromDb);
  },

  getById(id) {
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    return formatTaskFromDb(row);
  },

  create(task) {
    const countRow = db.prepare('SELECT count(*) as c FROM tasks').get();
    const order = typeof task.order === 'number' ? task.order : countRow.c;

    const stmt = db.prepare(`
      INSERT INTO tasks (
        id, title, priority, estimated_minutes, actual_minutes, tags,
        due_date, completed, completed_at, created_at, sort_order,
        is_recurring, recurring_config, recurring_parent_id,
        time_span, start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      task.id,
      task.title || '新待办事项',
      task.priority || 'p2',
      task.estimatedMinutes || 25,
      task.actualMinutes || 0,
      JSON.stringify(Array.isArray(task.tags) ? task.tags : []),
      task.dueDate || null,
      task.completed ? 1 : 0,
      task.completedAt || null,
      task.createdAt || new Date().toISOString(),
      order,
      task.isRecurring ? 1 : 0,
      task.recurringConfig ? JSON.stringify(task.recurringConfig) : null,
      task.recurringParentId || null,
      task.timeSpan || null,
      task.startTime || null,
      task.endTime || null
    );

    return this.getById(task.id);
  },

  update(id, updates) {
    const existing = this.getById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates };

    const stmt = db.prepare(`
      UPDATE tasks SET
        title = ?,
        priority = ?,
        estimated_minutes = ?,
        actual_minutes = ?,
        tags = ?,
        due_date = ?,
        completed = ?,
        completed_at = ?,
        sort_order = ?,
        is_recurring = ?,
        recurring_config = ?,
        recurring_parent_id = ?,
        time_span = ?,
        start_time = ?,
        end_time = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.title,
      merged.priority,
      merged.estimatedMinutes,
      merged.actualMinutes,
      JSON.stringify(merged.tags || []),
      merged.dueDate,
      merged.completed ? 1 : 0,
      merged.completedAt,
      merged.order,
      merged.isRecurring ? 1 : 0,
      merged.recurringConfig ? JSON.stringify(merged.recurringConfig) : null,
      merged.recurringParentId,
      merged.timeSpan,
      merged.startTime,
      merged.endTime,
      id
    );

    return this.getById(id);
  },

  delete(id) {
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    const res = stmt.run(id);
    return res.changes > 0;
  },

  reorder(taskIds) {
    if (!Array.isArray(taskIds)) return [];
    const reorderTx = db.transaction(() => {
      const stmt = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ?');
      taskIds.forEach((id, index) => {
        stmt.run(index, id);
      });
    });
    reorderTx();
    return this.getAll();
  },

  syncRecurringTasks(targetDate) {
    const today = new Date().toISOString().slice(0, 10);
    const checkDate = targetDate || today;
    const dObj = new Date(checkDate + 'T00:00:00');
    const dayOfWeek = dObj.getDay();
    const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;

    // Find all recurring parent tasks
    const recurringParents = db.prepare(`
      SELECT * FROM tasks WHERE is_recurring = 1 AND recurring_parent_id IS NULL AND recurring_config IS NOT NULL
    `).all().map(formatTaskFromDb);

    if (recurringParents.length === 0) return false;

    let changed = false;

    const syncTx = db.transaction(() => {
      const checkInstanceStmt = db.prepare(`
        SELECT count(*) as c FROM tasks
        WHERE substr(due_date, 1, 10) = ? AND (recurring_parent_id = ? OR id = ?)
      `);

      const insertInstanceStmt = db.prepare(`
        INSERT INTO tasks (
          id, title, priority, estimated_minutes, actual_minutes, tags,
          due_date, completed, completed_at, created_at, sort_order,
          is_recurring, recurring_config, recurring_parent_id,
          time_span, start_time, end_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      recurringParents.forEach(parent => {
        const config = parent.recurringConfig;
        if (!config || !config.startDate) return;

        const { frequency, startDate, endDate } = config;
        if (checkDate < startDate) return;
        if (endDate && checkDate > endDate) return;

        if (frequency === 'workday' && !isWorkday) return;
        if (frequency === 'weekly') {
          const startDayOfWeek = new Date(startDate + 'T00:00:00').getDay();
          if (dayOfWeek !== startDayOfWeek) return;
        }

        const exists = checkInstanceStmt.get(checkDate, parent.id, parent.id).c > 0;
        if (!exists) {
          const instanceId = `task_rec_${parent.id}_${checkDate}`;
          const dueDateTime = `${checkDate}${parent.dueDate?.includes('T') ? 'T' + parent.dueDate.split('T')[1] : ''}`;

          insertInstanceStmt.run(
            instanceId,
            parent.title,
            parent.priority,
            parent.estimatedMinutes,
            0,
            JSON.stringify(parent.tags || []),
            dueDateTime,
            0,
            null,
            new Date().toISOString(),
            0,
            1,
            JSON.stringify(parent.recurringConfig),
            parent.id,
            parent.timeSpan,
            parent.startTime,
            parent.endTime
          );
          changed = true;
        }
      });
    });

    syncTx();
    return changed;
  }
};

export const focusRepo = {
  getAll(date) {
    if (date) {
      const rows = db.prepare('SELECT * FROM focus_logs WHERE date = ? ORDER BY timestamp DESC').all(date);
      return rows.map(formatFocusLogFromDb);
    }
    const rows = db.prepare('SELECT * FROM focus_logs ORDER BY timestamp DESC').all();
    return rows.map(formatFocusLogFromDb);
  },

  create(log) {
    const stmt = db.prepare(`
      INSERT INTO focus_logs (
        id, task_id, task_title, mode, duration_seconds, duration_minutes, timestamp, date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      log.id,
      log.taskId || null,
      log.taskTitle || null,
      log.mode || 'pomodoro',
      log.durationSeconds || 0,
      log.durationMinutes || 0,
      log.timestamp || new Date().toISOString(),
      log.date || new Date().toISOString().slice(0, 10)
    );

    const row = db.prepare('SELECT * FROM focus_logs WHERE id = ?').get(log.id);
    return formatFocusLogFromDb(row);
  }
};

export const dailyReportRepo = {
  getByDate(date) {
    const row = db.prepare('SELECT * FROM daily_reports WHERE date = ?').get(date);
    return formatDailyReportFromDb(row);
  },

  getAll() {
    const rows = db.prepare('SELECT * FROM daily_reports ORDER BY date DESC').all();
    const result = {};
    rows.forEach(r => {
      result[r.date] = formatDailyReportFromDb(r);
    });
    return result;
  },

  save(date, data) {
    const existing = this.getByDate(date);
    const now = new Date().toISOString();
    const merged = {
      deliverables: '',
      blockers: '',
      tomorrowPlan: '',
      customNotes: '',
      completedTasksCount: 0,
      totalFocusMinutes: 0,
      syncedToExcel: false,
      syncedAt: null,
      ...(existing || {}),
      ...data,
      date,
      updatedAt: now
    };

    const stmt = db.prepare(`
      INSERT INTO daily_reports (
        date, deliverables, blockers, tomorrow_plan, custom_notes,
        completed_tasks_count, total_focus_minutes, synced_to_excel, synced_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        deliverables = excluded.deliverables,
        blockers = excluded.blockers,
        tomorrow_plan = excluded.tomorrow_plan,
        custom_notes = excluded.custom_notes,
        completed_tasks_count = excluded.completed_tasks_count,
        total_focus_minutes = excluded.total_focus_minutes,
        synced_to_excel = excluded.synced_to_excel,
        synced_at = excluded.synced_at,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      date,
      merged.deliverables,
      merged.blockers,
      merged.tomorrowPlan,
      merged.customNotes,
      merged.completedTasksCount,
      merged.totalFocusMinutes,
      merged.syncedToExcel ? 1 : 0,
      merged.syncedAt,
      merged.updatedAt
    );

    return this.getByDate(date);
  },

  delete(date) {
    const stmt = db.prepare('DELETE FROM daily_reports WHERE date = ?');
    const res = stmt.run(date);
    return res.changes > 0;
  }
};

export const noteRepo = {
  getAll({ type, date } = {}) {
    let query = 'SELECT * FROM notes WHERE 1=1';
    const params = [];

    if (type && type !== 'all') {
      query += ' AND type = ?';
      params.push(type);
    }
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    query += ' ORDER BY is_pinned DESC, created_at DESC';
    const rows = db.prepare(query).all(...params);
    return rows.map(formatNoteFromDb);
  },

  getById(id) {
    const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    return formatNoteFromDb(row);
  },

  create(note) {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO notes (
        id, type, title, content, date, time, tags, is_pinned, bg, daily_report_data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      note.id,
      note.type || 'note',
      note.title || '',
      note.content || '',
      note.date || '',
      note.time || '',
      JSON.stringify(Array.isArray(note.tags) ? note.tags : []),
      note.isPinned ? 1 : 0,
      note.bg || '',
      note.dailyReportData ? JSON.stringify(note.dailyReportData) : null,
      note.createdAt || now,
      note.updatedAt || now
    );

    return this.getById(note.id);
  },

  update(id, updates) {
    const existing = this.getById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    const stmt = db.prepare(`
      UPDATE notes SET
        type = ?,
        title = ?,
        content = ?,
        date = ?,
        time = ?,
        tags = ?,
        is_pinned = ?,
        bg = ?,
        daily_report_data = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.type,
      merged.title,
      merged.content,
      merged.date,
      merged.time,
      JSON.stringify(merged.tags || []),
      merged.isPinned ? 1 : 0,
      merged.bg,
      merged.dailyReportData ? JSON.stringify(merged.dailyReportData) : null,
      merged.updatedAt,
      id
    );

    return this.getById(id);
  },

  delete(id) {
    const res = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    return res.changes > 0;
  }
};

export const memoRepo = {
  getAll(date) {
    if (date) {
      const rows = db.prepare('SELECT * FROM memos WHERE date = ? ORDER BY created_at DESC').all(date);
      return rows.map(formatMemoFromDb);
    }
    const rows = db.prepare('SELECT * FROM memos ORDER BY created_at DESC').all();
    return rows.map(formatMemoFromDb);
  },

  getById(id) {
    const row = db.prepare('SELECT * FROM memos WHERE id = ?').get(id);
    return formatMemoFromDb(row);
  },

  create(memo) {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO memos (
        id, date, time, content, completed, tag, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memo.id,
      memo.date || '',
      memo.time || '',
      memo.content || '',
      memo.completed ? 1 : 0,
      memo.tag || '备忘',
      memo.createdAt || now,
      memo.updatedAt || now
    );

    return this.getById(memo.id);
  },

  update(id, updates) {
    const existing = this.getById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    const stmt = db.prepare(`
      UPDATE memos SET
        date = ?,
        time = ?,
        content = ?,
        completed = ?,
        tag = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.date,
      merged.time,
      merged.content,
      merged.completed ? 1 : 0,
      merged.tag,
      merged.updatedAt,
      id
    );

    return this.getById(id);
  },

  delete(id) {
    const res = db.prepare('DELETE FROM memos WHERE id = ?').run(id);
    return res.changes > 0;
  }
};

export const excelConfigRepo = {
  getAll() {
    const rows = db.prepare('SELECT * FROM excel_configs').all();
    return rows.map(formatExcelConfigFromDb);
  },

  getById(id) {
    const row = db.prepare('SELECT * FROM excel_configs WHERE id = ?').get(id);
    return formatExcelConfigFromDb(row);
  },

  create(config) {
    const stmt = db.prepare(`
      INSERT INTO excel_configs (
        id, name, category, file_path, target_sheet, is_annual_ledger, monitored_cells
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      config.id,
      config.name || '',
      config.category || '',
      config.filePath || '',
      config.targetSheet || '',
      config.isAnnualLedger ? 1 : 0,
      JSON.stringify(config.monitoredCells || [])
    );

    return this.getById(config.id);
  },

  update(id, updates) {
    const existing = this.getById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates };

    const stmt = db.prepare(`
      UPDATE excel_configs SET
        name = ?,
        category = ?,
        file_path = ?,
        target_sheet = ?,
        is_annual_ledger = ?,
        monitored_cells = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.name,
      merged.category,
      merged.filePath,
      merged.targetSheet,
      merged.isAnnualLedger ? 1 : 0,
      JSON.stringify(merged.monitoredCells || []),
      id
    );

    return this.getById(id);
  },

  delete(id) {
    const res = db.prepare('DELETE FROM excel_configs WHERE id = ?').run(id);
    return res.changes > 0;
  }
};

export const fileRepo = {
  getAll() {
    const rows = db.prepare('SELECT * FROM linked_files ORDER BY is_pinned DESC, updated_at DESC').all();
    return rows.map(formatLinkedFileFromDb);
  },

  getById(id) {
    const row = db.prepare('SELECT * FROM linked_files WHERE id = ?').get(id);
    return formatLinkedFileFromDb(row);
  },

  create(file) {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO linked_files (
        id, name, file_path, file_type, size, category, created_at, updated_at, last_opened_at, is_pinned, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      file.id,
      file.name || '',
      file.filePath || '',
      file.fileType || '',
      file.size || 0,
      file.category || '',
      file.createdAt || now,
      file.updatedAt || now,
      file.lastOpenedAt || null,
      file.isPinned ? 1 : 0,
      file.notes || ''
    );

    return this.getById(file.id);
  },

  update(id, updates) {
    const existing = this.getById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    const stmt = db.prepare(`
      UPDATE linked_files SET
        name = ?,
        file_path = ?,
        file_type = ?,
        size = ?,
        category = ?,
        last_opened_at = ?,
        is_pinned = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.name,
      merged.filePath,
      merged.fileType,
      merged.size,
      merged.category,
      merged.lastOpenedAt,
      merged.isPinned ? 1 : 0,
      merged.notes,
      merged.updatedAt,
      id
    );

    return this.getById(id);
  },

  delete(id) {
    const res = db.prepare('DELETE FROM linked_files WHERE id = ?').run(id);
    return res.changes > 0;
  },

  updateLastOpened(id) {
    const now = new Date().toISOString();
    db.prepare('UPDATE linked_files SET last_opened_at = ? WHERE id = ?').run(now, id);
  }
};

// ==================== USER & AUTHENTICATION REPOSITORY ====================

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export const userRepo = {
  createUser(username, password, avatarUrl = '/uploads/avatars/presets/avatar-1.svg') {
    const trimmed = (username || '').trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 16) {
      return { success: false, message: '用户名长度需在 2 到 16 个字符之间' };
    }
    if (!password || password.length < 6) {
      return { success: false, message: '密码长度至少需 6 个字符' };
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(trimmed);
    if (existing) {
      return { success: false, message: '该用户名已被使用' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    const now = new Date().toISOString();

    const info = db.prepare(`
      INSERT INTO users (username, password_hash, salt, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(trimmed, hash, salt, avatarUrl, now);

    return {
      success: true,
      user: {
        id: Number(info.lastInsertRowid),
        username: trimmed,
        avatar_url: avatarUrl,
        created_at: now
      }
    };
  },

  verifyUser(username, password) {
    const trimmed = (username || '').trim();
    if (!trimmed || !password) return null;

    const row = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(trimmed);
    if (!row) return null;

    const calcHash = hashPassword(password, row.salt);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(calcHash, 'hex'),
      Buffer.from(row.password_hash, 'hex')
    );
    if (!isMatch) return null;

    return {
      id: row.id,
      username: row.username,
      avatar_url: row.avatar_url,
      created_at: row.created_at
    };
  },

  getUserById(id) {
    if (!id) return null;
    return db.prepare('SELECT id, username, avatar_url, created_at FROM users WHERE id = ?').get(id) || null;
  },

  getUserByUsername(username) {
    const trimmed = (username || '').trim();
    if (!trimmed) return null;
    return db.prepare('SELECT id, username, avatar_url, created_at FROM users WHERE LOWER(username) = LOWER(?)').get(trimmed) || null;
  },

  updateUsername(userId, newUsername) {
    const trimmed = (newUsername || '').trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 16) {
      return { success: false, message: '用户名长度需在 2 到 16 个字符之间' };
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?').get(trimmed, userId);
    if (existing) {
      return { success: false, message: '该用户名已被使用' };
    }

    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(trimmed, userId);
    return {
      success: true,
      user: this.getUserById(userId)
    };
  },

  updatePassword(userId, oldPassword, newPassword) {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!row) {
      return { success: false, message: '用户不存在' };
    }

    const calcOldHash = hashPassword(oldPassword, row.salt);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(calcOldHash, 'hex'),
      Buffer.from(row.password_hash, 'hex')
    );
    if (!isMatch) {
      return { success: false, message: '原密码错误' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: '新密码长度至少需 6 个字符' };
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = hashPassword(newPassword, newSalt);

    db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(newHash, newSalt, userId);

    return { success: true, message: '密码修改成功' };
  },

  updateAvatar(userId, avatarUrl) {
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, userId);
    return {
      success: true,
      avatarUrl
    };
  },

  countUsers() {
    const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
    return row ? row.count : 0;
  }
};

export const authRepo = {
  createSession(userId, days = 30) {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    db.prepare('INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
      token,
      userId,
      now.toISOString(),
      expiresAt
    );

    return { token, expiresAt };
  },

  validateSession(token) {
    if (!token || typeof token !== 'string') return null;

    // Periodically clean up expired sessions
    if (Math.random() < 0.1) {
      db.prepare('DELETE FROM auth_sessions WHERE expires_at < ?').run(new Date().toISOString());
    }

    const row = db.prepare('SELECT * FROM auth_sessions WHERE token = ?').get(token);
    if (!row) return null;

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
      return null;
    }

    if (row.user_id) {
      const user = userRepo.getUserById(row.user_id);
      if (user) return user;
    }

    return null;
  },

  revokeSession(token) {
    if (!token) return;
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
  },

  getStatus(token) {
    const user = token ? this.validateSession(token) : null;
    return {
      authenticated: !!user,
      user: user || null,
      hasUsers: userRepo.countUsers() > 0
    };
  }
};

export const aiConfigRepo = {
  getConfig() {
    const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('ai_config');
    if (!row || !row.value) {
      return {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
        hasKey: false
      };
    }
    try {
      const parsed = JSON.parse(row.value);
      return {
        baseUrl: parsed.baseUrl || 'https://api.openai.com/v1',
        apiKey: parsed.apiKey || '',
        model: parsed.model || 'gpt-4o-mini',
        hasKey: !!(parsed.apiKey && parsed.apiKey.trim())
      };
    } catch {
      return {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
        hasKey: false
      };
    }
  },

  saveConfig({ baseUrl, apiKey, model }) {
    const current = this.getConfig();
    let finalApiKey = apiKey !== undefined ? apiKey.trim() : current.apiKey;
    if (finalApiKey.startsWith('sk-***')) {
      finalApiKey = current.apiKey;
    }

    const payload = {
      baseUrl: (baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, ''),
      apiKey: finalApiKey,
      model: (model || 'gpt-4o-mini').trim(),
      updatedAt: new Date().toISOString()
    };

    const existing = db.prepare('SELECT key FROM system_settings WHERE key = ?').get('ai_config');
    if (existing) {
      db.prepare('UPDATE system_settings SET value = ?, updated_at = ? WHERE key = ?').run(
        JSON.stringify(payload),
        payload.updatedAt,
        'ai_config'
      );
    } else {
      db.prepare('INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)').run(
        'ai_config',
        JSON.stringify(payload),
        payload.updatedAt
      );
    }

    return {
      baseUrl: payload.baseUrl,
      model: payload.model,
      hasKey: !!payload.apiKey
    };
  }
};

export default db;

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Bell, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCheck, 
  Check, 
  ChevronRight, 
  Sparkles
} from 'lucide-react';
import type { Task, DateMemo } from '../../types';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

export type AlertTier = 'overdue' | '1hour' | '5hours' | '12hours' | '1day' | '3days';
export type UrgencyLevel = 'critical' | 'urgent' | 'warning' | 'info' | 'notice';

export interface NotificationAlert {
  id: string; // e.g. 'task:123' or 'memo:456'
  type: 'task' | 'memo';
  rawId: string;
  title: string;
  targetDateTime: Date;
  tier: AlertTier;
  tierLabel: string;
  tierWeight: number; // 0 (overdue), 1 (1h), 2 (5h), 3 (12h), 4 (1d), 5 (3d)
  urgencyLevel: UrgencyLevel;
  timeRemainingText: string;
  formattedTarget: string;
  dateStr: string;
  isRead: boolean;
  priority?: string;
  timeStr?: string;
}

interface NotificationPopoverProps {
  tasks: Task[];
  onToggleTask?: (id: string, completed: boolean) => void;
  onNavigate?: (view: string, date?: string) => void;
}

const READ_STORAGE_KEY = 'workbench_notifications_read_v1';

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  tasks,
  onToggleTask,
  onNavigate,
}) => {
  const { isOledTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [memos, setMemos] = useState<DateMemo[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'task' | 'memo'>('all');
  const [readState, setReadState] = useState<Record<string, AlertTier>>(() => {
    try {
      const saved = localStorage.getItem(READ_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  // Load memos
  const loadMemos = async () => {
    try {
      const res = await api.getMemos();
      setMemos(res || []);
    } catch (err) {
      console.warn('Failed to load memos for notifications:', err);
    }
  };

  useEffect(() => {
    loadMemos();
  }, []);

  // Sync listener & periodic 60s timer to recalculate alerts
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);

    const handleSync = () => {
      loadMemos();
      setTick((t) => t + 1);
    };
    window.addEventListener('workbench:sync', handleSync);

    return () => {
      clearInterval(timer);
      window.removeEventListener('workbench:sync', handleSync);
    };
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && popoverRef.current && !popoverRef.current.contains(e.target as HTMLElement)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  // Parse task due date
  const parseTaskDate = (task: Task): Date | null => {
    if (!task.dueDate) return null;
    try {
      if (task.dueDate.includes('T')) {
        const d = new Date(task.dueDate);
        if (!isNaN(d.getTime())) return d;
      }
      const parts = task.dueDate.slice(0, 10).split('-');
      if (parts.length < 3) return null;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);

      let hour = 18;
      let minute = 0;
      if (task.startTime && task.startTime.includes(':')) {
        const [h, min] = task.startTime.split(':').map(Number);
        if (!isNaN(h)) hour = h;
        if (!isNaN(min)) minute = min;
      }
      return new Date(y, m, d, hour, minute, 0);
    } catch {
      return null;
    }
  };

  // Parse memo date
  const parseMemoDate = (memo: DateMemo): Date | null => {
    if (!memo.date) return null;
    try {
      const parts = memo.date.slice(0, 10).split('-');
      if (parts.length < 3) return null;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);

      let hour = 9;
      let minute = 0;
      if (memo.time && memo.time !== '全天' && memo.time.includes(':')) {
        const [h, min] = memo.time.split(':').map(Number);
        if (!isNaN(h)) hour = h;
        if (!isNaN(min)) minute = min;
      }
      return new Date(y, m, d, hour, minute, 0);
    } catch {
      return null;
    }
  };

  // Calculate alerts based on 3-day, 1-day, 12-hour, 5-hour, 1-hour ladders
  const alerts = useMemo<NotificationAlert[]>(() => {
    // Reference tick to trigger recalculation
    void tick;
    const now = new Date();
    const result: NotificationAlert[] = [];

    // Helper to process an item
    const processItem = (
      rawId: string,
      type: 'task' | 'memo',
      title: string,
      targetDate: Date | null,
      dateStr: string,
      timeStr?: string,
      priority?: string
    ) => {
      if (!targetDate) return;
      const diffMs = targetDate.getTime() - now.getTime();

      // Beyond 3 days (72 hours), do not notify
      const threeDaysMs = 72 * 60 * 60 * 1000;
      if (diffMs > threeDaysMs) return;

      let tier: AlertTier;
      let tierLabel: string;
      let tierWeight: number;
      let urgencyLevel: UrgencyLevel;
      let timeRemainingText: string;

      const diffMinutes = Math.floor(diffMs / (60 * 1000));
      const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

      if (diffMs <= 0) {
        tier = 'overdue';
        tierLabel = '已逾期';
        tierWeight = 0;
        urgencyLevel = 'critical';
        const absMinutes = Math.abs(diffMinutes);
        const absHours = Math.abs(diffHours);
        const absDays = Math.abs(diffDays);
        if (absDays >= 1) {
          timeRemainingText = `已逾期 ${absDays} 天`;
        } else if (absHours >= 1) {
          timeRemainingText = `已逾期 ${absHours} 小时`;
        } else {
          timeRemainingText = `已逾期 ${Math.max(1, absMinutes)} 分钟`;
        }
      } else if (diffMs <= 1 * 60 * 60 * 1000) {
        tier = '1hour';
        tierLabel = '1小时内到期';
        tierWeight = 1;
        urgencyLevel = 'critical';
        timeRemainingText = `仅剩 ${Math.max(1, diffMinutes)} 分钟`;
      } else if (diffMs <= 5 * 60 * 60 * 1000) {
        tier = '5hours';
        tierLabel = '5小时内到期';
        tierWeight = 2;
        urgencyLevel = 'urgent';
        const remMin = diffMinutes % 60;
        timeRemainingText = remMin > 0 ? `还有 ${diffHours} 小时 ${remMin} 分` : `还有 ${diffHours} 小时`;
      } else if (diffMs <= 12 * 60 * 60 * 1000) {
        tier = '12hours';
        tierLabel = '12小时内到期';
        tierWeight = 3;
        urgencyLevel = 'warning';
        timeRemainingText = `还有 ${diffHours} 小时`;
      } else if (diffMs <= 24 * 60 * 60 * 1000) {
        tier = '1day';
        tierLabel = '1天内到期';
        tierWeight = 4;
        urgencyLevel = 'info';
        timeRemainingText = `还有 ${diffHours} 小时`;
      } else {
        tier = '3days';
        tierLabel = '3天内到期';
        tierWeight = 5;
        urgencyLevel = 'notice';
        const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
        timeRemainingText = `还有 ${daysLeft} 天`;
      }

      // Format target display
      const month = targetDate.getMonth() + 1;
      const day = targetDate.getDate();
      const hours = String(targetDate.getHours()).padStart(2, '0');
      const minutes = String(targetDate.getMinutes()).padStart(2, '0');
      const formattedTarget = `${month}月${day}日 ${hours}:${minutes}`;

      const alertId = `${type}:${rawId}`;
      const savedReadTier = readState[alertId];
      // If previously read at the SAME tier, consider read;
      // If urgency has escalated (e.g. from 3days to 1hour), re-mark as unread!
      const isRead = savedReadTier !== undefined && savedReadTier === tier;

      result.push({
        id: alertId,
        type,
        rawId,
        title,
        targetDateTime: targetDate,
        tier,
        tierLabel,
        tierWeight,
        urgencyLevel,
        timeRemainingText,
        formattedTarget,
        dateStr,
        isRead,
        priority,
        timeStr,
      });
    };

    // 1. Process uncompleted Tasks
    tasks.forEach((t) => {
      if (!t.completed) {
        const d = parseTaskDate(t);
        processItem(t.id, 'task', t.title, d, t.dueDate || '', t.startTime || undefined, t.priority);
      }
    });

    // 2. Process uncompleted Memos
    memos.forEach((m) => {
      if (!m.completed) {
        const d = parseMemoDate(m);
        processItem(m.id, 'memo', m.content, d, m.date, m.time);
      }
    });

    // Sort: highest urgency first (tierWeight ASC), then targetDateTime ASC
    result.sort((a, b) => {
      if (a.tierWeight !== b.tierWeight) {
        return a.tierWeight - b.tierWeight;
      }
      return a.targetDateTime.getTime() - b.targetDateTime.getTime();
    });

    return result;
  }, [tasks, memos, readState, tick]);

  // Unread alerts count
  const unreadAlerts = useMemo(() => {
    return alerts.filter((a) => !a.isRead);
  }, [alerts]);

  const unreadCount = unreadAlerts.length;

  // Most severe urgency among unread alerts
  const highestUrgency = useMemo<UrgencyLevel | null>(() => {
    if (unreadCount === 0) return null;
    if (unreadAlerts.some((a) => a.urgencyLevel === 'critical')) return 'critical';
    if (unreadAlerts.some((a) => a.urgencyLevel === 'urgent')) return 'urgent';
    if (unreadAlerts.some((a) => a.urgencyLevel === 'warning')) return 'warning';
    if (unreadAlerts.some((a) => a.urgencyLevel === 'info')) return 'info';
    return 'notice';
  }, [unreadAlerts, unreadCount]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'task') {
      return alerts.filter((a) => a.type === 'task');
    }
    if (activeFilter === 'memo') {
      return alerts.filter((a) => a.type === 'memo');
    }
    return alerts;
  }, [alerts, activeFilter]);

  // Mark all as read
  const handleMarkAllRead = () => {
    const updated: Record<string, AlertTier> = { ...readState };
    alerts.forEach((a) => {
      updated[a.id] = a.tier;
    });
    setReadState(updated);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Mark single as read
  const handleMarkSingleRead = (alert: NotificationAlert) => {
    const updated = { ...readState, [alert.id]: alert.tier };
    setReadState(updated);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Complete item immediately from notification
  const handleQuickComplete = async (e: React.MouseEvent, alert: NotificationAlert) => {
    e.stopPropagation();
    if (alert.type === 'task') {
      if (onToggleTask) {
        onToggleTask(alert.rawId, true);
      }
    } else {
      try {
        await api.updateMemo(alert.rawId, { completed: true });
        setMemos((prev) => prev.map((m) => (m.id === alert.rawId ? { ...m, completed: true } : m)));
      } catch (err) {
        console.error('Failed to complete memo from alert:', err);
      }
    }
  };

  // Click card to navigate
  const handleItemClick = (alert: NotificationAlert) => {
    handleMarkSingleRead(alert);
    setIsOpen(false);
    if (!onNavigate) return;

    if (alert.type === 'task') {
      onNavigate('todos', alert.dateStr);
    } else {
      onNavigate('calendar', alert.dateStr);
    }
  };

  // Visual helper for tier badges
  const getTierBadgeStyle = (tier: AlertTier) => {
    switch (tier) {
      case 'overdue':
        return 'bg-rose-50 text-rose-600 border-rose-200/80 font-bold';
      case '1hour':
        return 'bg-red-50 text-red-600 border-red-200/80 font-bold animate-pulse';
      case '5hours':
        return 'bg-orange-50 text-orange-600 border-orange-200/80 font-semibold';
      case '12hours':
        return 'bg-amber-50 text-amber-600 border-amber-200/80 font-semibold';
      case '1day':
        return 'bg-blue-50 text-blue-600 border-blue-200/80 font-medium';
      case '3days':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200/80 font-medium';
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          loadMemos();
        }}
        className={`relative h-10 w-10 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-center ${
          isOpen
            ? (isOledTheme ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/40' : 'bg-blue-50 text-[#0071E3] border-blue-200/70')
            : (isOledTheme 
                ? 'bg-white/[0.04] text-[#F2F5F5] hover:text-[#00E5FF] border-white/[0.08] hover:bg-white/[0.08]' 
                : 'bg-white text-[#48484A] hover:text-[#0071E3] border-black/[0.06] hover:border-[#0071E3]/30 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-xs active:scale-95')
        }`}
        title="查看临近到期待办与日程"
      >
        <Bell size={16} strokeWidth={1.8} />

        {/* Unread Indicator Badge */}
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center text-white ring-2 ring-white shadow-xs leading-none transition-all ${
              highestUrgency === 'critical'
                ? 'bg-rose-500 animate-pulse'
                : highestUrgency === 'urgent'
                ? 'bg-orange-500'
                : highestUrgency === 'warning'
                ? 'bg-amber-500'
                : 'bg-[#0071E3]'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card & Outside-Click Barrier */}
      {isOpen && (
        <>
          {/* Transparent full-screen click-outside barrier */}
          <div 
            className="fixed inset-0 z-40 bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div 
            className={`absolute right-0 top-full mt-2 w-[360px] sm:w-[390px] max-h-[540px] ${
              isOledTheme 
                ? 'bg-[#0C0F11]/95 border-white/[0.08] text-[#F2F5F5] shadow-[0_25px_50px_rgba(0,0,0,0.85)]' 
                : 'bg-white/95 border-white/80 shadow-2xl text-[#1D1D1F]'
            } backdrop-blur-2xl border rounded-3xl p-4 z-50 flex flex-col animate-fade-in text-left select-none`}
            style={{
              boxShadow: isOledTheme
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08) inset'
                : '0 20px 45px -10px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
            }}
          >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1D1D1F] tracking-tight">
                提醒与通知
              </h3>
              {alerts.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                  {unreadCount > 0 ? `${unreadCount} 项待处理` : '已全部标为已读'}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-medium text-[#0071E3] hover:text-[#005bb5] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                title="将所有当前提醒设为已读"
              >
                <CheckCheck size={13} />
                <span>全部已读</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 pt-2.5 pb-2">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#0071E3] text-white font-semibold shadow-2xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-slate-100'
              }`}
            >
              全部 ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('task')}
              className={`px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1 ${
                activeFilter === 'task'
                  ? 'bg-[#0071E3] text-white font-semibold shadow-2xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-slate-100'
              }`}
            >
              <CheckSquare size={12} />
              <span>待办 ({alerts.filter((a) => a.type === 'task').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('memo')}
              className={`px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1 ${
                activeFilter === 'memo'
                  ? 'bg-[#0071E3] text-white font-semibold shadow-2xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-slate-100'
              }`}
            >
              <CalendarIcon size={12} />
              <span>日程 ({alerts.filter((a) => a.type === 'memo').length})</span>
            </button>
          </div>

          {/* Alert List */}
          <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1 custom-scrollbar max-h-[380px]">
            {filteredAlerts.length === 0 ? (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3 shadow-2xs border border-emerald-100/60">
                  <Sparkles size={22} />
                </div>
                <div className="text-xs font-bold text-[#1D1D1F]">
                  暂无临近待办或日程
                </div>
                <p className="text-[11px] text-[#86868B] mt-1 max-w-[220px]">
                  未来 3 天内没有即将到期的任务，放松一下吧 ☕️
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => handleItemClick(alert)}
                  className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                    alert.isRead
                      ? 'bg-white/60 border-slate-200/50 hover:bg-white/90 hover:border-slate-300/80 opacity-75 hover:opacity-100'
                      : alert.urgencyLevel === 'critical'
                      ? 'bg-rose-50/70 border-rose-200/80 hover:bg-rose-50 shadow-2xs'
                      : alert.urgencyLevel === 'urgent'
                      ? 'bg-orange-50/70 border-orange-200/80 hover:bg-orange-50 shadow-2xs'
                      : alert.urgencyLevel === 'warning'
                      ? 'bg-amber-50/70 border-amber-200/80 hover:bg-amber-50 shadow-2xs'
                      : 'bg-blue-50/40 border-blue-200/60 hover:bg-blue-50/70 shadow-2xs'
                  }`}
                >
                  {/* Left Type Icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-2xs border ${
                        alert.type === 'task'
                          ? 'bg-blue-100/80 text-[#0071E3] border-blue-200/80'
                          : 'bg-purple-100/80 text-purple-600 border-purple-200/80'
                      }`}
                    >
                      {alert.type === 'task' ? (
                        <CheckSquare size={13} strokeWidth={2.2} />
                      ) : (
                        <CalendarIcon size={13} strokeWidth={2.2} />
                      )}
                    </div>
                  </div>

                  {/* Center Content */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[10px] font-semibold text-[#86868B]">
                        {alert.type === 'task' ? '待办任务' : '日程备忘'}
                      </span>

                      {/* Tier Badge */}
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-md border ${getTierBadgeStyle(
                          alert.tier
                        )}`}
                      >
                        {alert.tierLabel}
                      </span>

                      {/* Time Remaining Pill */}
                      <span className="text-[10px] font-mono text-slate-500 bg-black/5 px-1.5 py-0.2 rounded-md">
                        {alert.timeRemainingText}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#1D1D1F] line-clamp-2 group-hover:text-[#0071E3] transition-colors">
                      {alert.title}
                    </div>

                    <div className="text-[10px] text-[#86868B] mt-1 flex items-center gap-1">
                      <Clock size={11} className="flex-shrink-0" />
                      <span>截止时间：{alert.formattedTarget}</span>
                    </div>
                  </div>

                  {/* Right Action: Quick Complete Button */}
                  <div className="flex flex-col items-center gap-1 mt-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleQuickComplete(e, alert)}
                      className="p-1.5 rounded-xl bg-white hover:bg-emerald-500 text-slate-400 hover:text-white border border-slate-200/80 shadow-2xs hover:shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                      title="快速标记为已完成"
                    >
                      <Check size={13} strokeWidth={2.5} />
                    </button>
                    <ChevronRight
                      size={13}
                      className="text-slate-300 group-hover:text-[#0071E3] transition-colors mt-0.5"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Explanation */}
          <div className="pt-2.5 mt-1 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between text-[10px] text-[#86868B]">
            <span>智能梯级：到期前 3天 / 1天 / 12h / 5h / 1h</span>
            <span>点击直达详情</span>
          </div>
        </div>
      </>
    )}
    </div>
  );
};
export default NotificationPopover;

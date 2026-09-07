import React, { useState, useEffect } from 'react';
import { 
  Home, 
  CheckSquare, 
  Edit3, 
  Calendar, 
  FileText, 
  FileSpreadsheet, 
  Wrench, 
  Settings, 
  Lock,
  ChevronDown,
  LogOut
} from 'lucide-react';
import { useTimer } from '../../contexts/TimerContext';
import type { UserProfile } from '../../types';

interface LeftSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  tasks?: Array<{ id: string; completed: boolean }>;
  focusHours?: number;
  focusGoalHours?: number;
  onLock?: () => void;
  currentUser?: UserProfile | null;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeView,
  setActiveView,
  tasks = [],
  onLock,
  currentUser,
  onOpenSettings,
  onLogout,
}) => {
  const { remainingSeconds, isRunning } = useTimer();
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showUserMenu && !(e.target as HTMLElement).closest('.left-sidebar-user-menu-container')) {
        setShowUserMenu(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showUserMenu]);

  const pendingCount = tasks.filter((t) => !t.completed).length;

  const timerBadge = isRunning
    ? `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`
    : undefined;

  const menuItems = [
    { id: 'dashboard', label: '首页', icon: Home },
    { id: 'todos', label: '待办事项', icon: CheckSquare, badge: pendingCount > 0 ? String(pendingCount) : undefined },
    { id: 'reports', label: '工作日报', icon: FileText },
    { id: 'notes', label: '快速记录', icon: Edit3 },
    { id: 'calendar', label: '日程', icon: Calendar },
    { id: 'files', label: '文件', icon: FileSpreadsheet },
    { id: 'tools', label: '工具', icon: Wrench, badge: timerBadge },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <aside className="w-[230px] h-[calc(100vh-24px)] m-3 mr-0 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between flex-shrink-0 select-none p-4 z-20 transition-all duration-300">
      <div>
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 px-1.5 py-1.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#1677FF] flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0">
            Ai
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-slate-800 truncate">个人工作台</div>
            <div className="text-[11px] text-slate-400 font-normal mt-0.5 truncate">专注 · 高效 · 成长</div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'bg-[#EBF4FF] text-[#1677FF] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon 
                    size={16} 
                    strokeWidth={isActive ? 2.2 : 1.8} 
                    className={isActive ? 'text-[#1677FF]' : 'text-slate-500'}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-xs font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'text-[#1677FF] font-semibold' : 'text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile Card & Quick Lock (Integrated) */}
      <div className="pt-2 relative left-sidebar-user-menu-container">
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50/90 p-2 flex items-center justify-between gap-2 shadow-2xs transition-colors">
          {/* User Info Section */}
          <div 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer group select-none"
            title="个人选项"
          >
            <div className="w-7 h-7 rounded-full bg-[#1677FF] flex items-center justify-center text-white text-xs font-semibold ring-1.5 ring-white shadow-xs overflow-hidden flex-shrink-0">
              {currentUser?.avatar_url ? (
                <img 
                  src={currentUser.avatar_url} 
                  alt={currentUser.username} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{currentUser?.username ? currentUser.username.slice(0, 1) : '邬'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 group-hover:text-[#1677FF] transition-colors truncate">
                {currentUser?.username || '邬文雄'}
              </div>
            </div>
            <ChevronDown 
              size={12} 
              className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-200 flex-shrink-0 ${showUserMenu ? 'rotate-180' : ''}`} 
            />
          </div>

          {/* Vertical Divider "|" */}
          <div className="h-3.5 w-px bg-slate-300 flex-shrink-0" />

          {/* Quick Lock Button */}
          {onLock && (
            <button
              type="button"
              onClick={onLock}
              className="flex items-center gap-1 py-1 px-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors cursor-pointer flex-shrink-0"
              title="锁定工作台"
            >
              <Lock size={12} className="text-slate-400 flex-shrink-0" />
              <span>锁定</span>
            </button>
          )}
        </div>

        {/* Upward Dropdown Menu */}
        {showUserMenu && (
          <div className="absolute left-0 bottom-full mb-2 w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl py-1.5 z-50 animate-fade-in">
            <div className="px-3.5 py-2 border-b border-slate-100 mb-1">
              <div className="text-xs font-bold text-slate-800 truncate">
                {currentUser?.username || '未登录'}
              </div>
              <div className="text-[10px] text-slate-400">个人空间</div>
            </div>
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenSettings();
                }}
                className="w-full px-3.5 py-2 text-xs text-left text-slate-700 hover:bg-blue-50 hover:text-[#1677FF] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Settings size={14} />
                <span>个人设置</span>
              </button>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  onLogout();
                }}
                className="w-full px-3.5 py-2 text-xs text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>退出登录</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar;


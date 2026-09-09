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
  LogOut,
  Download
} from 'lucide-react';
import { useTimer } from '../../contexts/TimerContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from '../Common/PWAInstallModal';
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
  const { isInstallable, isStandalone, isIOS, showGuideModal, setShowGuideModal, installApp } = usePWAInstall();

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
          <div className="w-10 h-10 rounded-xl bg-[#1677FF] flex items-center justify-center text-white font-bold text-[16px] shadow-xs flex-shrink-0">
            Ai
          </div>
          <div className="min-w-0">
            <div className="text-[16px] font-semibold tracking-tight text-[#1D2129] truncate">个人工作台</div>
            <div className="text-[13px] text-[#4E5969] font-normal mt-0.5 truncate">专注 · 高效 · 成长</div>
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
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] leading-normal cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'bg-[#EBF4FF] text-[#1677FF] font-semibold'
                    : 'text-[#1D2129] hover:text-blue-600 hover:bg-slate-100/70 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon 
                    size={17} 
                    strokeWidth={isActive ? 2.2 : 1.8} 
                    className={isActive ? 'text-[#1677FF]' : 'text-[#4E5969]'}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span 
                    className={`text-[13px] font-mono px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-blue-100/60 text-[#1677FF] font-semibold' : 'bg-slate-100 text-[#4E5969]'
                    }`}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* PWA Install Button (Shown when not already running in standalone mode) */}
      {!isStandalone && (
        <div className="pt-2">
          <button
            type="button"
            onClick={installApp}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-blue-50/80 hover:bg-blue-100/90 text-[#1677FF] border border-blue-200/80 font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs group active:scale-98"
            title="将工作台安装为独立桌面/手机应用"
          >
            <div className="flex items-center gap-2">
              <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
              <span>安装为桌面应用</span>
            </div>
            <span className="text-[10px] bg-white text-[#1677FF] px-1.5 py-0.5 rounded font-mono font-bold shadow-2xs">
              PWA
            </span>
          </button>
        </div>
      )}

      {/* Bottom Profile Card & Quick Lock (Integrated) */}
      <div className="pt-2 relative left-sidebar-user-menu-container">
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50/90 p-2 flex items-center justify-between gap-2 shadow-2xs transition-colors">
          {/* User Info Section */}
          <div 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group select-none"
            title="个人选项"
          >
            <div className="w-8 h-8 rounded-full bg-[#1677FF] flex items-center justify-center text-white text-[13px] font-semibold ring-1.5 ring-white shadow-xs overflow-hidden flex-shrink-0">
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
              <div className="text-[14px] font-semibold text-[#1D2129] group-hover:text-[#1677FF] transition-colors truncate">
                {currentUser?.username || '邬文雄'}
              </div>
            </div>
            <ChevronDown 
              size={13} 
              className={`text-[#4E5969] group-hover:text-slate-800 transition-transform duration-200 flex-shrink-0 ${showUserMenu ? 'rotate-180' : ''}`} 
            />
          </div>

          {/* Vertical Divider "|" */}
          <div className="h-4 w-px bg-slate-200 flex-shrink-0" />

          {/* Quick Lock Button */}
          {onLock && (
            <button
              type="button"
              onClick={onLock}
              className="flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-slate-200/60 text-[#4E5969] hover:text-[#1D2129] text-[13px] font-medium transition-colors cursor-pointer flex-shrink-0"
              title="锁定工作台"
            >
              <Lock size={13} className="text-[#4E5969] flex-shrink-0" />
              <span>锁定</span>
            </button>
          )}
        </div>

        {/* Upward Dropdown Menu */}
        {showUserMenu && (
          <div className="absolute left-0 bottom-full mb-2 w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl py-2 z-50 animate-fade-in">
            <div className="px-3.5 py-2 border-b border-slate-100 mb-1">
              <div className="text-[14px] font-semibold text-[#1D2129] truncate">
                {currentUser?.username || '未登录'}
              </div>
              <div className="text-[12px] text-[#4E5969]">个人空间</div>
            </div>
            {!isStandalone && (
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  installApp();
                }}
                className="w-full px-3.5 py-2 text-[14px] text-left text-[#1677FF] hover:bg-blue-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
              >
                <Download size={15} />
                <span>安装为独立应用</span>
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenSettings();
                }}
                className="w-full px-3.5 py-2 text-[14px] text-left text-[#1D2129] hover:bg-blue-50 hover:text-[#1677FF] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Settings size={15} />
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
                className="w-full px-3.5 py-2 text-[14px] text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <LogOut size={15} />
                <span>退出登录</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* PWA Installation Guidance Modal */}
      <PWAInstallModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        isIOS={isIOS}
        onNativeInstall={installApp}
        isInstallable={isInstallable}
      />
    </aside>
  );
};

export default LeftSidebar;


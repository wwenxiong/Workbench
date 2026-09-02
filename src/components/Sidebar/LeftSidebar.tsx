import React from 'react';
import { 
  Home, 
  CheckSquare, 
  Edit3, 
  Calendar, 
  FolderKanban, 
  FileText, 
  FileSpreadsheet,
  Settings
} from 'lucide-react';

interface LeftSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  tasks?: Array<{ id: string; completed: boolean }>;
  focusHours?: number;
  focusGoalHours?: number;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeView,
  setActiveView,
  tasks = [],
}) => {
  const pendingCount = tasks.filter((t) => !t.completed).length;

  const menuItems = [
    { id: 'dashboard', label: '首页', icon: Home },
    { id: 'todos', label: '待办事项', icon: CheckSquare, badge: pendingCount > 0 ? String(pendingCount) : undefined },
    { id: 'reports', label: '工作日报', icon: FileText },
    { id: 'notes', label: '快速记录', icon: Edit3 },
    { id: 'calendar', label: '日程', icon: Calendar },
    { id: 'projects', label: '项目', icon: FolderKanban },
    { id: 'files', label: '文件', icon: FileSpreadsheet },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <aside className="w-[240px] h-[calc(100vh-28px)] m-3.5 mr-0 liquid-glass-sidebar rounded-[28px] flex flex-col justify-between flex-shrink-0 select-none p-5 z-10">
      <div>
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 px-1 py-2 mb-6">
          {/* Apple-style Minimal Geometric Logo (Refined SVG) */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#42A5F5] p-[1px] shadow-sm shadow-blue-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center">
              <svg 
                className="w-5 h-5 text-white" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="8" opacity="0.4" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </div>
          </div>

          <div>
            <h1 className="text-sm font-bold text-[#1D1D1F] tracking-tight leading-tight">
              个人工作台
            </h1>
            <p className="text-[11px] font-medium text-[#86868B] tracking-wide mt-0.5">
              My Workspace
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'liquid-glass-capsule-active font-semibold'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-white/60 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon 
                    size={16} 
                    strokeWidth={isActive ? 2 : 1.75} 
                    className={isActive ? 'text-[#0071E3]' : 'text-[#86868B] group-hover:text-[#1D1D1F]'}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                    isActive 
                      ? 'bg-[#0071E3] text-white' 
                      : 'bg-slate-200/70 text-[#6E6E73]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default LeftSidebar;

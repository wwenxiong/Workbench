import type { FC } from 'react';
import { Camera, Mic, Type, Pen, ChevronLeft, ChevronRight } from 'lucide-react';

interface RightSidebarProps {
  selectedDate: string;
}

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '2026年8月19日，星期二';
  try {
    const d = new Date(dateStr);
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日，${weekdays[d.getDay()]}`;
  } catch {
    return '2026年8月19日，星期二';
  }
};

export const RightSidebar: FC<RightSidebarProps> = ({ selectedDate }) => {
  return (
    <aside className="w-[320px] bg-white h-screen flex flex-col border-l border-[#F0F0F5] overflow-y-auto p-5 gap-5 shrink-0">
      {/* Quick Notes Section */}
      <div className="bg-white rounded-2xl flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-slate-800">快速记录</h2>
          <button className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            全部记录 &gt;
          </button>
        </div>
        
        <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-2">
          <p className="italic text-slate-600 text-sm leading-relaxed">
            "设计的本质是解决问题，而非追求形式的美。"
          </p>
          <p className="text-xs text-slate-400 self-end">
            —— 刚刚
          </p>
        </div>
        
        <div className="flex justify-between items-center mt-1">
          <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
            <Camera size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
            <Mic size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
            <Type size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
            <Pen size={18} />
          </button>
        </div>
      </div>

      {/* Daily Schedule Section */}
      <div className="bg-white rounded-2xl flex flex-col gap-4 mt-2">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-slate-800">日程安排</h2>
          <div className="flex items-center gap-2">
            <button className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full">今日</button>
            <div className="flex text-slate-400 gap-1">
              <button className="hover:text-slate-600 p-1"><ChevronLeft size={16} /></button>
              <button className="hover:text-slate-600 p-1"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-slate-400 font-medium">
          {formatDateDisplay(selectedDate)}
        </div>
        
        <div className="flex flex-col gap-5 mt-2">
          {/* Schedule items */}
          <div className="flex items-start gap-3">
            <span className="text-sm font-mono text-slate-400 w-10 shrink-0 text-right">全天</span>
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
            <span className="text-sm text-slate-700 font-medium">团队建设活动</span>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="text-sm font-mono text-slate-400 w-10 shrink-0 text-right">10:00</span>
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
            <span className="text-sm text-slate-700 font-medium">项目讨论会议</span>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="text-sm font-mono text-slate-400 w-10 shrink-0 text-right">14:00</span>
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
            <span className="text-sm text-slate-700 font-medium">设计评审</span>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="text-sm font-mono text-slate-400 w-10 shrink-0 text-right">16:00</span>
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
            <span className="text-sm text-slate-700 font-medium">撰写需求文档</span>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="text-sm font-mono text-slate-400 w-10 shrink-0 text-right">19:00</span>
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
            <span className="text-sm text-slate-700 font-medium">阅读与学习</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Calendar,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import type { WeeklyReportData } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Common/Toast';
import { useTheme } from '../../contexts/ThemeContext';

export const WeeklyReportView: React.FC = () => {
  const { showToast } = useToast();
  const { isOledTheme } = useTheme();
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [weeklyData, setWeeklyData] = useState<WeeklyReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editableDraft, setEditableDraft] = useState('');

  const loadWeeklyReport = useCallback(async (date: string) => {
    setIsLoading(true);
    try {
      const data = await api.getWeeklyReport(date);
      setWeeklyData(data);
      setEditableDraft(data.weeklyDraft);
    } catch (err: unknown) {
      const error = err as Error;
      showToast('周报汇总失败', { type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadWeeklyReport(targetDate);
  }, [targetDate, loadWeeklyReport]);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(editableDraft);
      setCopied(true);
      showToast('周报已复制到剪贴板', { type: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('复制失败', { type: 'error' });
    }
  };

  const handleDownloadFile = () => {
    if (!weeklyData) return;
    const blob = new Blob([editableDraft], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `工作周报_${weeklyData.startDate}_${weeklyData.workdayEndDate}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('已下载周报文件', { type: 'success' });
  };

  return (
    <div className={`flex-1 p-6 overflow-y-auto ${isOledTheme ? 'bg-[#050607]' : 'bg-slate-50'} flex flex-col gap-5 transition-colors duration-300`}>
      {/* 1. Header with Week Selector & Stats */}
      <div className={`p-5 rounded-2xl border ${
        isOledTheme ? 'border-white/[0.08] bg-[#080A0C]' : 'border-slate-200 bg-white shadow-xs'
      } flex items-center justify-between flex-wrap gap-4`}>
        <div>
          <div className="flex items-center gap-2">
            <FileText className={`w-5 h-5 ${isOledTheme ? 'text-[#00E5FF]' : 'text-blue-600'}`} />
            <h1 className={`text-xl font-black ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-slate-900'} tracking-tight`}>
              周报汇总
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full ${
              isOledTheme ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30' : 'bg-blue-50 text-blue-700 border border-blue-200/60'
            } font-bold text-xs flex items-center gap-1`}>
              <Sparkles className="w-3 h-3" />
              <span>按周汇总</span>
            </span>
          </div>
        </div>

        {/* Date / Week Range Picker */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs ${
            isOledTheme ? 'bg-[#111417] border-white/[0.08] text-[#F2F5F5]' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            <Calendar className={`w-3.5 h-3.5 ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-500'}`} />
            <span className={`font-medium ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-600'}`}>日期:</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className={`border rounded px-2 py-0.5 font-mono ${
                isOledTheme ? 'bg-[#0C0F11] border-white/[0.1] text-[#F2F5F5]' : 'bg-white border-slate-300 text-slate-800'
              }`}
            />
          </div>

          <button
            onClick={() => loadWeeklyReport(targetDate)}
            disabled={isLoading}
            className={`p-2 rounded-xl border transition-all shadow-xs cursor-pointer ${
              isOledTheme
                ? 'bg-[#111417] border-white/[0.08] text-[#7D858A] hover:text-[#00E5FF]'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
            title="重新汇总"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#00E5FF]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Key Weekly Metrics Banner */}
      {weeklyData && (
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-2xl border ${
            isOledTheme ? 'border-white/[0.08] bg-[#080A0C]' : 'border-slate-200 bg-white shadow-xs'
          } flex items-center gap-3.5`}>
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              isOledTheme ? 'bg-[#B7FF3C]/10 border-[#B7FF3C]/30 text-[#B7FF3C]' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-xs font-medium ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-500'}`}>本周完成</div>
              <div className={`text-2xl font-black font-mono ${isOledTheme ? 'text-[#B7FF3C]' : 'text-slate-900'}`}>
                {weeklyData.totalCompletedTasks} <span className={`text-xs font-normal ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`}>项</span>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border ${
            isOledTheme ? 'border-white/[0.08] bg-[#080A0C]' : 'border-slate-200 bg-white shadow-xs'
          } flex items-center gap-3.5`}>
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              isOledTheme ? 'bg-[#00E5FF]/10 border-[#00E5FF]/30 text-[#00E5FF]' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-xs font-medium ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-500'}`}>本周周期</div>
              <div className={`text-sm font-bold font-mono mt-1 ${isOledTheme ? 'text-[#F2F5F5]' : 'text-slate-900'}`}>
                {weeklyData.startDate} ~ {weeklyData.workdayEndDate}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Generated Weekly Report Content */}
      <div className={`flex-1 rounded-2xl border shadow-xs flex flex-col overflow-hidden min-h-[420px] ${
        isOledTheme ? 'bg-[#080A0C] border-white/[0.08]' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isOledTheme ? 'border-white/[0.06] bg-[#0C0F11]' : 'border-slate-100 bg-slate-50/50'
        }`}>
          <span className={`text-xs font-bold ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-slate-700'}`}>周报内容</span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer ${
                isOledTheme ? 'bg-[#00E5FF] hover:bg-[#00cce6] text-[#050607]' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制内容'}</span>
            </button>

            <button
              onClick={handleDownloadFile}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer ${
                isOledTheme
                  ? 'border-white/[0.08] bg-[#111417] hover:bg-white/5 text-[#F2F5F5]'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载文件</span>
            </button>
          </div>
        </div>

        <div className="flex-1 p-4">
          <textarea
            value={editableDraft}
            onChange={(e) => setEditableDraft(e.target.value)}
            className={`w-full h-full min-h-[380px] p-4 border rounded-xl font-mono text-xs leading-relaxed focus:outline-none ${
              isOledTheme
                ? 'bg-[#050607] border-white/[0.08] text-[#F2F5F5] focus:border-[#00E5FF]/40'
                : 'bg-slate-50/60 border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

export default WeeklyReportView;

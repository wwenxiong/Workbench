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

export const WeeklyReportView: React.FC = () => {
  const { showToast } = useToast();
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
      showToast('周报聚合失败', { type: 'error', message: error.message });
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
      showToast('周报 Markdown 内容已复制到剪贴板', { type: 'success' });
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
    showToast('已导出周报 Markdown 文件', { type: 'success' });
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-slate-50 flex flex-col gap-5">
      {/* 1. Header with Week Selector & Stats */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              周报自动生成器
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>智能去重与分类聚合</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            自动抓取本周一至周五的日报及完成事项，进行分类整理并生成周报成果初稿。
          </p>
        </div>

        {/* Date / Week Range Picker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">基准日期:</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 font-mono text-slate-800"
            />
          </div>

          <button
            onClick={() => loadWeeklyReport(targetDate)}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all shadow-xs"
            title="重新聚合"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Key Weekly Metrics Banner */}
      {weeklyData && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">本周完成交付事项</div>
              <div className="text-2xl font-black font-mono text-slate-900">
                {weeklyData.totalCompletedTasks} <span className="text-xs font-normal text-slate-400">项</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">周期跨度</div>
              <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                {weeklyData.startDate} ~ {weeklyData.workdayEndDate}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Generated Weekly Report Content */}
      <div className="flex-1 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col overflow-hidden min-h-[420px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">周报内容编辑与预览 (Markdown)</span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制周报 Markdown'}</span>
            </button>

            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 .md 文件</span>
            </button>
          </div>
        </div>

        <div className="flex-1 p-4">
          <textarea
            value={editableDraft}
            onChange={(e) => setEditableDraft(e.target.value)}
            className="w-full h-full min-h-[380px] p-4 bg-slate-50/60 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>
    </div>
  );
};

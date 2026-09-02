import React, { useState, useEffect } from 'react';
import {
  FileText,
  Copy,
  Check,
  Save,
  FileSpreadsheet,
  Eye,
  Edit3,
  CheckCircle2
} from 'lucide-react';
import type { DailyReport, ExcelConfig } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Common/Toast';

interface DailyReportBoxProps {
  selectedDate: string;
  dailyReport: DailyReport | null;
  excelConfigs: ExcelConfig[];
  onReportUpdated: () => void;
}

export const DailyReportBox: React.FC<DailyReportBoxProps> = ({
  selectedDate,
  dailyReport,
  excelConfigs,
  onReportUpdated,
}) => {
  const { showToast } = useToast();

  const [deliverables, setDeliverables] = useState('');
  const [blockers, setBlockers] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [isAppendingExcel, setIsAppendingExcel] = useState(false);
  const [copiedType, setCopiedType] = useState<'markdown' | 'text' | null>(null);

  // Sync state with incoming dailyReport
  useEffect(() => {
    if (dailyReport) {
      setDeliverables(dailyReport.deliverables || '');
      setBlockers(dailyReport.blockers || '');
      setTomorrowPlan(dailyReport.tomorrowPlan || '');
      setCustomNotes(dailyReport.customNotes || '');
    }
  }, [dailyReport]);

  // Construct Markdown text
  const getMarkdownContent = () => {
    return `# 个人工作日报 (${selectedDate})

## 一、 今日已交付成果 (${dailyReport?.completedTasksCount || 0}项)
${deliverables.trim() || '无'}

## 二、 今日未完成及阻塞项
${blockers.trim() || '无阻塞'}

## 三、 明日计划
${tomorrowPlan.trim() || '按计划推进各项待办'}
${customNotes ? `\n## 四、 补充备忘与总结\n${customNotes.trim()}` : ''}
`;
  };

  // Construct Plain Text
  const getPlainTextContent = () => {
    return `【个人工作日报】${selectedDate}
1. 今日交付成果 (${dailyReport?.completedTasksCount || 0}项):
${deliverables.trim() || '无'}

2. 未完成及阻塞项:
${blockers.trim() || '无'}

3. 明日规划:
${tomorrowPlan.trim() || '按计划推进'}
${customNotes ? `\n4. 补充说明:\n${customNotes.trim()}` : ''}
`;
  };

  // Save report
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.saveDailyReport(selectedDate, {
        deliverables,
        blockers,
        tomorrowPlan,
        customNotes,
      });
      showToast('日报草稿已保存', { type: 'success' });
      onReportUpdated();
    } catch (err: unknown) {
      const error = err as Error;
      showToast('保存失败', { type: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Copy helpers
  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(getMarkdownContent());
      setCopiedType('markdown');
      showToast('Markdown 格式已复制到剪贴板', { type: 'success' });
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      showToast('复制失败，请手动选取', { type: 'error' });
    }
  };

  const handleCopyPlainText = async () => {
    try {
      await navigator.clipboard.writeText(getPlainTextContent());
      setCopiedType('text');
      showToast('纯文本已复制到剪贴板', { type: 'success' });
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      showToast('复制失败，请手动选取', { type: 'error' });
    }
  };

  // Append to Excel Ledger
  const handleAppendToExcel = async () => {
    setIsAppendingExcel(true);
    try {
      const annualConfig = excelConfigs.find((c) => c.isAnnualLedger) || excelConfigs[0];
      const res = await api.appendDailyToExcel({
        configId: annualConfig?.id,
        date: selectedDate,
        deliverables,
        blockers,
        tomorrowPlan,
        totalFocusMinutes: dailyReport?.totalFocusMinutes || 0,
        completedCount: dailyReport?.completedTasksCount || 0,
      });

      showToast('已追加归档至本地 Excel 台账！', {
        type: 'success',
        message: res.message,
      });
      onReportUpdated();
    } catch (err: unknown) {
      const error = err as Error;
      showToast('追加失败', {
        type: 'error',
        message: error.message || '请确认本地 Excel 未被以独占方式锁定',
      });
    } finally {
      setIsAppendingExcel(false);
    }
  };

  return (
    <section className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              实时日报草稿箱
            </h2>
          </div>

          {/* Aggregated badge */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              <CheckCircle2 className="w-3 h-3" />
              已交付 {dailyReport?.completedTasksCount || 0} 项
            </span>

            {dailyReport?.syncedToExcel && (
              <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-800 font-semibold text-[10px]">
                已归档至 Excel
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Edit vs Preview Toggle */}
          <div className="flex p-0.5 bg-slate-200/70 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-all ${
                activeTab === 'edit'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>编辑</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-all ${
                activeTab === 'preview'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>预览</span>
            </button>
          </div>

          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-95"
            title="复制标准 Markdown"
          >
            {copiedType === 'markdown' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>复制 Markdown</span>
          </button>

          <button
            onClick={handleCopyPlainText}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-95"
            title="复制纯文本格式 (便于直接粘贴至企业微信/钉钉/飞书)"
          >
            {copiedType === 'text' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>复制纯文本</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? '保存中...' : '保存'}</span>
          </button>

          <button
            onClick={handleAppendToExcel}
            disabled={isAppendingExcel}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
            title="自动将今日工作日志追加写入本地年度工作总台账.xlsx"
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${isAppendingExcel ? 'animate-spin' : ''}`} />
            <span>{isAppendingExcel ? '追加写入中...' : '追加至总台账'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'edit' ? (
          <div className="space-y-3.5 text-xs">
            {/* 1. 今日已交付成果 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>今日已交付成果 (勾选待办后自动实时抽取)：</span>
                </label>
                <span className="text-[10px] text-slate-400">支持自由补充微调</span>
              </div>
              <textarea
                rows={8}
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
                placeholder="勾选完成待办事项后自动汇总至此处..."
                className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-sans leading-relaxed min-h-[180px] resize-y"
              />
            </div>

            {/* 2. 今日未完成及阻塞项 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>今日未完成及阻塞项：</span>
                </label>
                <span className="text-[10px] text-slate-400">列出遗留/阻塞原因</span>
              </div>
              <textarea
                rows={3}
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="记录推进中的阻碍或待协调事项..."
                className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-sans leading-relaxed min-h-[75px] resize-y"
              />
            </div>

            {/* 3. 明日计划 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>明日计划：</span>
                </label>
                <span className="text-[10px] text-slate-400">次日关键推进目标</span>
              </div>
              <textarea
                rows={4}
                value={tomorrowPlan}
                onChange={(e) => setTomorrowPlan(e.target.value)}
                placeholder="1. 继续推进...&#10;2. 组织..."
                className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-sans leading-relaxed min-h-[95px] resize-y"
              />
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed select-text">
            {getMarkdownContent()}
          </div>
        )}
      </div>
    </section>
  );
};

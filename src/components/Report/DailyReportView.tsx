import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Plus, 
  Edit3, 
  Clock, 
  CheckCircle2, 
  Save, 
  X, 
  ChevronDown, 
  ChevronUp,
  Download,
  Copy,
  Check,
  Trash2,
  Repeat
} from 'lucide-react';
import type { DailyReport } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Common/Toast';
import { AddNoteModal } from '../Common/AddNoteModal';
import { formatLocalDate, formatChineseDate, addDays } from '../../utils/date';

interface DailyReportViewProps {
  onSelectDateForCalendar?: (date: string) => void;
  onSelectDateForDashboard?: (date: string) => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  onSelectDateForCalendar,
}) => {
  const { showToast } = useToast();
  const todayStr = formatLocalDate(new Date());

  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [copiedDate, setCopiedDate] = useState<string | null>(null);

  // Editing state for a specific date
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editDeliverables, setEditDeliverables] = useState('');
  const [editBlockers, setEditBlockers] = useState('');
  const [editTomorrowPlan, setEditTomorrowPlan] = useState('');
  const [editCustomNotes, setEditCustomNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // New report modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Excel export controls
  const [exportMode, setExportMode] = useState<'range' | 'single' | 'all'>('range');
  const [exportStartDate, setExportStartDate] = useState(() => addDays(todayStr, -7));
  const [exportEndDate, setExportEndDate] = useState(todayStr);
  const [exportSingleDate, setExportSingleDate] = useState(todayStr);
  const [isExporting, setIsExporting] = useState(false);

  // Load all daily reports
  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getAllDailyReports();
      setReports(data || []);
      
      // Auto expand the most recent 3 dates
      const initExpanded: Record<string, boolean> = {};
      (data || []).slice(0, 3).forEach((r) => {
        initExpanded[r.date] = true;
      });
      setExpandedDates(prev => ({ ...initExpanded, ...prev }));
    } catch (err) {
      console.error('Failed to load daily reports:', err);
      showToast('获取日报列表失败', { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Toggle card expansion
  const toggleExpand = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // Start editing a specific report
  const startEdit = async (report: DailyReport) => {
    setEditingDate(report.date);
    setEditDeliverables(report.deliverables || '');
    setEditBlockers(report.blockers || '');
    setEditCustomNotes(report.customNotes || '');
    setExpandedDates(prev => ({ ...prev, [report.date]: true }));

    // If tomorrow plan is empty, auto-fetch tomorrow recurring tasks
    if (!report.tomorrowPlan) {
      try {
        const rep = await api.getDailyReport(report.date);
        if (rep.tomorrowTasksList && rep.tomorrowTasksList.length > 0) {
          setEditTomorrowPlan(rep.tomorrowTasksList.map((title, i) => `${i + 1}. ${title}`).join('\n'));
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    setEditTomorrowPlan(report.tomorrowPlan || '');
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingDate(null);
  };

  // Save report updates
  const handleSaveEdit = async (date: string) => {
    setIsSaving(true);
    try {
      await api.saveDailyReport(date, {
        deliverables: editDeliverables,
        blockers: editBlockers,
        tomorrowPlan: editTomorrowPlan,
        customNotes: editCustomNotes,
      });
      showToast(`${date} 日报修改已保存`, { type: 'success' });
      setEditingDate(null);
      await loadReports();
    } catch (err) {
      console.error(err);
      showToast('保存修改失败', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete daily report
  const handleDeleteReport = async (date: string) => {
    const ok = window.confirm(`确定要删除 ${date} 的工作日报吗？此操作无法撤销。`);
    if (!ok) return;

    try {
      await api.deleteDailyReport(date);
      showToast(`已删除 ${date} 工作日报`, { type: 'success' });
      if (editingDate === date) {
        setEditingDate(null);
      }
      await loadReports();
    } catch (err) {
      console.error('Delete daily report failed:', err);
      showToast('删除失败', { type: 'error' });
    }
  };

  // One-click copy formatted daily report content
  const handleCopyReport = async (rep: DailyReport) => {
    const text = `【工作日报】${formatChineseDate(rep.date)}

今日工作
${rep.deliverables?.trim() || '1. XXXXX\n2. XXXXX'}

明日计划:
${rep.tomorrowPlan?.trim() || '1. xxx\n2. xxx'}
`.trim();

    try {
      await navigator.clipboard.writeText(text);
      setCopiedDate(rep.date);
      showToast(`已复制 ${rep.date} 日报到剪贴板`, { type: 'success' });
      setTimeout(() => setCopiedDate(null), 2000);
    } catch {
      showToast('复制失败，请手动选取内容', { type: 'error' });
    }
  };

  // Auto-link tomorrow's recurring tasks
  const handleAutoLinkTomorrow = async (date: string) => {
    try {
      const rep = await api.getDailyReport(date);
      if (rep.tomorrowTasksList && rep.tomorrowTasksList.length > 0) {
        const planText = rep.tomorrowTasksList.map((title, i) => `${i + 1}. ${title}`).join('\n');
        setEditTomorrowPlan(planText);
        showToast(`已自动联动明日 ${rep.tomorrowTasksList.length} 项循环任务`, { type: 'success' });
      } else {
        showToast('明日暂无循环任务安排', { type: 'info' });
      }
    } catch {
      showToast('获取明日任务失败', { type: 'error' });
    }
  };

  // Sync today's completed deliverables in chronological order
  const handleSyncTodayDeliverables = async (date: string) => {
    try {
      const rep = await api.getDailyReport(date);
      const text = rep.chronologicalDeliverables || rep.deliverables;
      if (text) {
        setEditDeliverables(text);
        showToast('已按时间戳先后顺序重新排列当日待办', { type: 'success' });
      }
    } catch {
      showToast('同步待办失败', { type: 'error' });
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      let exportUrl = '';
      if (exportMode === 'single') {
        exportUrl = api.getExportExcelUrl({ date: exportSingleDate });
      } else if (exportMode === 'range') {
        exportUrl = api.getExportExcelUrl({ startDate: exportStartDate, endDate: exportEndDate });
      } else {
        exportUrl = api.getExportExcelUrl({});
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = exportUrl;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('工作日报 Excel 导出已就绪', { 
        message: exportMode === 'range' ? `${exportStartDate} 至 ${exportEndDate}` : (exportMode === 'single' ? exportSingleDate : '全量汇总'),
        type: 'success' 
      });
    } catch (err) {
      console.error(err);
      showToast('导出失败', { type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto h-[calc(100vh-64px)] liquid-glass-card rounded-[28px] border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden select-none">
      {/* 1. Header Toolbar of the Container */}
      <div className="p-6 border-b border-slate-100/90 bg-white/70 backdrop-blur-md flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#42A5F5] text-white flex items-center justify-center shadow-xs shadow-blue-500/20">
              <FileText size={18} strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-bold text-[#1D1D1F]">工作日报中心</h1>
                <span className="text-[11px] font-semibold text-[#0071E3] bg-blue-50/90 border border-blue-200/60 px-2 py-0.5 rounded-full">
                  共 {reports.length} 篇归档
                </span>
              </div>
              <p className="text-xs text-[#86868B] mt-0.5">
                统一容器集中管理每日工作交付、阻塞项与明日规划，支持按日期快速修改与灵活导出
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus size={14} strokeWidth={2} />
            <span>+ 编写新日报</span>
          </button>
        </div>

        {/* Excel Export Toolbar inside the Container */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-100/80">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] font-semibold text-[#86868B] flex items-center gap-1">
              <FileSpreadsheet size={13} strokeWidth={1.75} className="text-[#0071E3]" />
              <span>导出设置：</span>
            </span>

            {/* Mode selection pills */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-xl text-[11px]">
              <button
                type="button"
                onClick={() => setExportMode('range')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  exportMode === 'range' ? 'bg-white text-[#0071E3] font-semibold shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                按日期范围
              </button>
              <button
                type="button"
                onClick={() => setExportMode('single')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  exportMode === 'single' ? 'bg-white text-[#0071E3] font-semibold shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                按单日
              </button>
              <button
                type="button"
                onClick={() => setExportMode('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  exportMode === 'all' ? 'bg-white text-[#0071E3] font-semibold shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                全部导出
              </button>
            </div>

            {/* Range pickers */}
            {exportMode === 'range' && (
              <div className="flex items-center gap-1.5 text-xs text-[#86868B]">
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200/80 rounded-xl text-[#1D1D1F] focus:outline-none focus:border-[#0071E3] font-mono text-[11px]"
                />
                <span>至</span>
                <input
                  type="date"
                  value={exportEndDate}
                  min={exportStartDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200/80 rounded-xl text-[#1D1D1F] focus:outline-none focus:border-[#0071E3] font-mono text-[11px]"
                />
              </div>
            )}

            {/* Single picker */}
            {exportMode === 'single' && (
              <div className="flex items-center gap-1.5 text-xs text-[#86868B]">
                <input
                  type="date"
                  value={exportSingleDate}
                  onChange={(e) => setExportSingleDate(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200/80 rounded-xl text-[#1D1D1F] focus:outline-none focus:border-[#0071E3] font-mono text-[11px]"
                />
              </div>
            )}
          </div>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download size={13} strokeWidth={2} />
            <span>{isExporting ? '导出中...' : '导出到 Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Body of Container: Chronological Daily Reports Cascade */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-[#86868B]">
            正在加载工作日报列表...
          </div>
        ) : reports.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-[#86868B] flex items-center justify-center mb-3">
              <FileText size={20} strokeWidth={1.75} />
            </div>
            <h3 className="text-sm font-bold text-[#1D1D1F]">当前暂无已归档的工作日报</h3>
            <p className="text-xs text-[#86868B] mt-1 max-w-sm">
              点击上方「+ 编写新日报」即可开启今日日报记录，或在首页与日历中一键聚合生成
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#0071E3] text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              编写今日日报
            </button>
          </div>
        ) : (
          reports.map((rep) => {
            const isEditing = editingDate === rep.date;
            const isExpanded = isEditing || !!expandedDates[rep.date];
            const isToday = rep.date === todayStr;

            return (
              <div
                key={rep.date}
                className={`rounded-2xl border transition-all ${
                  isToday
                    ? 'border-blue-200/90 bg-white/95 shadow-sm'
                    : 'border-slate-200/70 bg-white/80 hover:bg-white hover:border-slate-300/80 shadow-2xs'
                }`}
              >
                {/* Date Header Row (Clickable to toggle expansion) */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer flex-wrap gap-2"
                  onClick={() => !isEditing && toggleExpand(rep.date)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1D1D1F]">
                        {formatChineseDate(rep.date)}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-semibold text-[#0071E3] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                          今天
                        </span>
                      )}
                    </div>

                    {/* Stats pills */}
                    <div className="flex items-center gap-2 text-[11px] text-[#86868B]">
                      <span className="flex items-center gap-1 font-medium font-mono">
                        <CheckCircle2 size={12} strokeWidth={2} className="text-emerald-600" />
                        <span>{rep.completedTasksCount || 0} 项完成</span>
                      </span>
                    </div>
                  </div>

                  {/* Header Action Buttons */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* 1. One-click Copy button */}
                    <button
                      type="button"
                      onClick={() => handleCopyReport(rep)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-[#86868B] hover:text-[#0071E3] hover:bg-blue-50/80 transition-colors cursor-pointer"
                      title="一键复制工作日报内容"
                    >
                      {copiedDate === rep.date ? (
                        <>
                          <Check size={13} strokeWidth={2} className="text-emerald-600" />
                          <span className="text-emerald-600 font-medium">已复制</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} strokeWidth={1.75} />
                          <span>复制</span>
                        </>
                      )}
                    </button>

                    {/* 2. Edit button */}
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(rep)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-[#0071E3] hover:text-blue-700 hover:bg-blue-50/80 transition-colors cursor-pointer"
                        title="修改该日日报"
                      >
                        <Edit3 size={13} strokeWidth={1.75} />
                        <span>修改</span>
                      </button>
                    )}

                    {/* 3. Export to Excel button */}
                    <button
                      type="button"
                      onClick={() => {
                        const url = api.getExportExcelUrl({ date: rep.date });
                        window.open(url, '_blank');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/80 transition-colors cursor-pointer"
                      title="单独导出此篇日报到 Excel"
                    >
                      <Download size={13} strokeWidth={1.75} />
                      <span>导出</span>
                    </button>

                    {/* 4. Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteReport(rep.date)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-[#86868B] hover:text-rose-600 hover:bg-rose-50/80 transition-colors cursor-pointer"
                      title="删除该篇工作日报"
                    >
                      <Trash2 size={13} strokeWidth={1.75} />
                      <span>删除</span>
                    </button>

                    {/* 5. Chevron toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(rep.date)}
                      className="p-1 rounded-lg text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Content Detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100/90 animate-fadeIn">
                    {isEditing ? (
                      /* Editing Form Mode */
                      <div className="flex flex-col gap-3.5 pt-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-[#1D1D1F]">
                              今日工作
                            </label>
                            <button
                              type="button"
                              onClick={() => handleSyncTodayDeliverables(rep.date)}
                              className="flex items-center gap-1 text-[11px] text-[#0071E3] hover:underline font-semibold cursor-pointer"
                              title="按时间戳先后顺序重新排列当日待办"
                            >
                              <Clock size={11} strokeWidth={2} />
                              <span>按时间序同步待办</span>
                            </button>
                          </div>
                          <textarea
                            rows={4}
                            value={editDeliverables}
                            onChange={(e) => setEditDeliverables(e.target.value)}
                            placeholder="1. XXXXX&#10;2. XXXXX"
                            className="w-full px-3.5 py-2 text-xs bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-[#1D1D1F]"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-[#1D1D1F]">
                              明日计划:
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAutoLinkTomorrow(rep.date)}
                              className="flex items-center gap-1 text-[11px] text-[#0071E3] hover:underline font-semibold cursor-pointer"
                              title="一键读取并填充明日循环任务"
                            >
                              <Repeat size={11} strokeWidth={2} />
                              <span>联动明日循环任务</span>
                            </button>
                          </div>
                          <textarea
                            rows={3}
                            value={editTomorrowPlan}
                            onChange={(e) => setEditTomorrowPlan(e.target.value)}
                            placeholder="1. xxx&#10;2. xxx"
                            className="w-full px-3.5 py-2 text-xs bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 text-[#1D1D1F]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#1D1D1F] mb-1">
                            遇到阻碍与未完成项 (可选)
                          </label>
                          <textarea
                            rows={2}
                            value={editBlockers}
                            onChange={(e) => setEditBlockers(e.target.value)}
                            placeholder="无明显阻塞项..."
                            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-[#1D1D1F]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#1D1D1F] mb-1">
                            补充说明 (可选)
                          </label>
                          <input
                            type="text"
                            value={editCustomNotes}
                            onChange={(e) => setEditCustomNotes(e.target.value)}
                            placeholder="备忘或随手记..."
                            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 text-[#1D1D1F]"
                          />
                        </div>

                        {/* Save & Cancel Bar with Delete option */}
                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(rep.date)}
                            disabled={isSaving}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} strokeWidth={1.75} />
                            <span>删除此篇日报</span>
                          </button>

                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className="flex items-center gap-1 px-4 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-[#86868B] hover:text-[#1D1D1F] hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <X size={13} strokeWidth={2} />
                              <span>取消</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(rep.date)}
                              disabled={isSaving}
                              className="flex items-center gap-1.5 px-5 py-1.5 rounded-xl bg-[#0071E3] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Save size={13} strokeWidth={2} />
                              <span>{isSaving ? '保存中...' : '保存修改'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Display Detail Mode */
                      <div className="flex flex-col gap-3 pt-2 text-xs">
                        {/* 今日工作 */}
                        <div>
                          <span className="font-bold text-[#1D1D1F] block mb-1">
                            今日工作
                          </span>
                          <div className="text-[#48484A] whitespace-pre-line leading-relaxed pl-3 border-l-2 border-emerald-500 bg-emerald-50/40 p-2.5 rounded-r-xl">
                            {rep.deliverables || '1. XXXXX\n2. XXXXX'}
                          </div>
                        </div>

                        {/* 明日计划: */}
                        <div>
                          <span className="font-bold text-[#1D1D1F] block mb-1">
                            明日计划:
                          </span>
                          <div className="text-[#48484A] whitespace-pre-line leading-relaxed pl-3 border-l-2 border-[#0071E3] bg-blue-50/40 p-2.5 rounded-r-xl">
                            {rep.tomorrowPlan || '1. xxx\n2. xxx'}
                          </div>
                        </div>

                        {/* Custom Notes */}
                        {rep.customNotes && (
                          <div className="text-[11px] text-[#86868B] pt-1">
                            <span className="font-semibold text-[#1D1D1F]">随手附注：</span>
                            <span>{rep.customNotes}</span>
                          </div>
                        )}

                        {/* Footer info */}
                        <div className="flex items-center justify-between text-[10px] text-[#86868B] pt-2 border-t border-slate-100">
                          <span>
                            更新时间：{rep.updatedAt ? new Date(rep.updatedAt).toLocaleString('zh-CN') : '暂无'}
                          </span>
                          {onSelectDateForCalendar && (
                            <button
                              type="button"
                              onClick={() => onSelectDateForCalendar(rep.date)}
                              className="text-[#0071E3] hover:underline font-medium cursor-pointer"
                            >
                              在日历中查看此日 →
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add New Report Modal */}
      <AddNoteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onConfirm={async (noteData) => {
          await api.createNote(noteData);
          await loadReports();
        }}
        initialDate={todayStr}
        initialType="daily_report"
      />
    </div>
  );
};

export default DailyReportView;

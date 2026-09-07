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
import { useTheme } from '../../contexts/ThemeContext';
import { formatLocalDate, formatChineseDate, addDays } from '../../utils/date';

interface DailyReportViewProps {
  onSelectDateForCalendar?: (date: string) => void;
  onSelectDateForDashboard?: (date: string) => void;
  onRefreshSummaries?: () => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  onSelectDateForCalendar,
  onRefreshSummaries,
}) => {
  const { showToast } = useToast();
  const { isOledTheme } = useTheme();
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
      showToast('获取日报失败', { type: 'error' });
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
    if (report.tomorrowPlan) {
      setEditTomorrowPlan(report.tomorrowPlan);
    } else {
      try {
        const fullRep = await api.getDailyReport(report.date);
        if (fullRep.tomorrowTasksList && fullRep.tomorrowTasksList.length > 0) {
          const autoPlan = fullRep.tomorrowTasksList.map((t, idx) => `${idx + 1}. ${t}`).join('\n');
          setEditTomorrowPlan(autoPlan);
        } else {
          setEditTomorrowPlan('');
        }
      } catch {
        setEditTomorrowPlan('');
      }
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingDate(null);
    setEditDeliverables('');
    setEditBlockers('');
    setEditTomorrowPlan('');
    setEditCustomNotes('');
  };

  // Save edit
  const handleSaveEdit = async (date: string) => {
    try {
      setIsSaving(true);
      await api.saveDailyReport(date, {
        deliverables: editDeliverables.trim(),
        blockers: editBlockers.trim(),
        tomorrowPlan: editTomorrowPlan.trim(),
        customNotes: editCustomNotes.trim(),
      });
      showToast('日报已保存', { type: 'success' });
      setEditingDate(null);
      await loadReports();
      if (onRefreshSummaries) onRefreshSummaries();
    } catch (err) {
      console.error(err);
      showToast('保存失败', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a report
  const handleDeleteReport = async (date: string) => {
    if (!window.confirm(`确定删除 ${date} 的工作日报吗？`)) return;

    try {
      await api.deleteDailyReport(date);
      showToast('已删除日报', { type: 'success' });
      if (editingDate === date) {
        cancelEdit();
      }
      await loadReports();
      if (onRefreshSummaries) onRefreshSummaries();
    } catch (err) {
      console.error(err);
      showToast('删除失败', { type: 'error' });
    }
  };

  // One-click copy markdown report
  const handleCopyReport = async (report: DailyReport) => {
    const lines: string[] = [
      `# ${report.date} 工作日报`,
      '',
      '## 今日工作',
      report.deliverables || '无',
      '',
      '## 明日计划',
      report.tomorrowPlan || '无',
    ];

    if (report.blockers && report.blockers !== '无') {
      lines.push('', '## 遇到问题', report.blockers);
    }
    if (report.customNotes) {
      lines.push('', '## 备注', report.customNotes);
    }

    const textToCopy = lines.join('\n');

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedDate(report.date);
      showToast('日报已复制到剪贴板', { type: 'success' });
      setTimeout(() => setCopiedDate(null), 2000);
    } catch {
      showToast('复制失败', { type: 'error' });
    }
  };

  // Auto link tomorrow recurring tasks
  const handleAutoLinkTomorrow = async (date: string) => {
    try {
      const rep = await api.getDailyReport(date);
      if (rep.tomorrowTasksList && rep.tomorrowTasksList.length > 0) {
        const text = rep.tomorrowTasksList.map((t, i) => `${i + 1}. ${t}`).join('\n');
        setEditTomorrowPlan(text);
        showToast('已导入明日计划', { type: 'success' });
      } else {
        showToast('暂无计划', { type: 'info' });
      }
    } catch {
      showToast('读取失败', { type: 'error' });
    }
  };

  // Synchronize today's deliverables
  const handleSyncTodayDeliverables = async (date: string) => {
    try {
      const rep = await api.getDailyReport(date);
      const text = rep.chronologicalDeliverables || rep.deliverables;
      if (text) {
        setEditDeliverables(text);
        showToast('已同步当日待办', { type: 'success' });
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

      showToast('工作日报已导出', { 
        message: exportMode === 'range' ? `${exportStartDate} 至 ${exportEndDate}` : (exportMode === 'single' ? exportSingleDate : '全部'),
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
    <div className={`w-full max-w-5xl mx-auto h-[calc(100vh-64px)] rounded-[28px] border flex flex-col overflow-hidden select-none ${
      isOledTheme
        ? 'bg-[#080A0C] border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]'
        : 'liquid-glass-card border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.03)]'
    }`}>
      {/* 1. Header Toolbar of the Container */}
      <div className={`p-6 border-b flex flex-col gap-4 backdrop-blur-md ${
        isOledTheme ? 'border-white/10 bg-[#0C0F11]/90' : 'border-slate-100/90 bg-white/70'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isOledTheme
                ? 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30 shadow-none'
                : 'bg-gradient-to-tr from-[#0071E3] to-[#42A5F5] text-white shadow-xs shadow-blue-500/20'
            }`}>
              <FileText size={18} strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className={`text-base font-bold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>工作日报</h1>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  isOledTheme
                    ? 'text-[#00E5FF] bg-[#00E5FF]/10 border-[#00E5FF]/30'
                    : 'text-[#0071E3] bg-blue-50/90 border-blue-200/60'
                }`}>
                  共 {reports.length} 篇
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
              isOledTheme
                ? 'bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050607] shadow-[#00E5FF]/20'
                : 'bg-[#0071E3] hover:bg-blue-600 text-white shadow-blue-500/20'
            }`}
          >
            <Plus size={14} strokeWidth={2} />
            <span>新建日报</span>
          </button>
        </div>

        {/* Excel Export Toolbar */}
        <div className={`flex items-center justify-between flex-wrap gap-3 pt-3 border-t ${
          isOledTheme ? 'border-white/10' : 'border-slate-100/80'
        }`}>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className={`text-[11px] font-semibold flex items-center gap-1 ${
              isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'
            }`}>
              <FileSpreadsheet size={13} strokeWidth={1.75} className={isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'} />
              <span>导出：</span>
            </span>

            {/* Mode selection pills */}
            <div className={`flex items-center gap-1 p-0.5 rounded-xl text-[11px] border ${
              isOledTheme ? 'bg-[#111417] border-white/10' : 'bg-slate-100/80 border-transparent'
            }`}>
              <button
                type="button"
                onClick={() => setExportMode('range')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  exportMode === 'range'
                    ? isOledTheme
                      ? 'bg-[#00E5FF]/15 text-[#00E5FF] font-semibold border border-[#00E5FF]/30 shadow-xs'
                      : 'bg-white text-[#0071E3] font-semibold shadow-xs'
                    : isOledTheme
                      ? 'text-[#7D858A] hover:text-[#F2F5F5]'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                按日期范围
              </button>
              <button
                type="button"
                onClick={() => setExportMode('single')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  exportMode === 'single'
                    ? isOledTheme
                      ? 'bg-[#00E5FF]/15 text-[#00E5FF] font-semibold border border-[#00E5FF]/30 shadow-xs'
                      : 'bg-white text-[#0071E3] font-semibold shadow-xs'
                    : isOledTheme
                      ? 'text-[#7D858A] hover:text-[#F2F5F5]'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                按单日
              </button>
              <button
                type="button"
                onClick={() => setExportMode('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  exportMode === 'all'
                    ? isOledTheme
                      ? 'bg-[#00E5FF]/15 text-[#00E5FF] font-semibold border border-[#00E5FF]/30 shadow-xs'
                      : 'bg-white text-[#0071E3] font-semibold shadow-xs'
                    : isOledTheme
                      ? 'text-[#7D858A] hover:text-[#F2F5F5]'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                全部导出
              </button>
            </div>

            {/* Range pickers */}
            {exportMode === 'range' && (
              <div className={`flex items-center gap-1.5 text-xs ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className={`px-2.5 py-1 rounded-xl focus:outline-none font-mono text-[11px] border ${
                    isOledTheme
                      ? 'bg-[#080A0C] border-white/10 text-[#F2F5F5] focus:border-[#00E5FF]'
                      : 'bg-white border-slate-200/80 text-[#1D1D1F] focus:border-[#0071E3]'
                  }`}
                />
                <span>至</span>
                <input
                  type="date"
                  value={exportEndDate}
                  min={exportStartDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className={`px-2.5 py-1 rounded-xl focus:outline-none font-mono text-[11px] border ${
                    isOledTheme
                      ? 'bg-[#080A0C] border-white/10 text-[#F2F5F5] focus:border-[#00E5FF]'
                      : 'bg-white border-slate-200/80 text-[#1D1D1F] focus:border-[#0071E3]'
                  }`}
                />
              </div>
            )}

            {/* Single picker */}
            {exportMode === 'single' && (
              <div className={`flex items-center gap-1.5 text-xs ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>
                <input
                  type="date"
                  value={exportSingleDate}
                  onChange={(e) => setExportSingleDate(e.target.value)}
                  className={`px-2.5 py-1 rounded-xl focus:outline-none font-mono text-[11px] border ${
                    isOledTheme
                      ? 'bg-[#080A0C] border-white/10 text-[#F2F5F5] focus:border-[#00E5FF]'
                      : 'bg-white border-slate-200/80 text-[#1D1D1F] focus:border-[#0071E3]'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
              isOledTheme
                ? 'bg-[#B7FF3C] hover:bg-[#c9ff6a] text-[#050607] shadow-[#B7FF3C]/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            <Download size={13} strokeWidth={2} />
            <span>{isExporting ? '导出中...' : '导出 Excel'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Body of Container: Chronological Daily Reports Cascade */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
        {isLoading ? (
          <div className={`py-20 text-center text-xs ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>
            加载中...
          </div>
        ) : reports.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
              isOledTheme ? 'bg-[#111417] text-[#7D858A] border border-white/10' : 'bg-slate-100 text-[#86868B]'
            }`}>
              <FileText size={20} strokeWidth={1.75} />
            </div>
            <h3 className={`text-sm font-bold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>暂无日报</h3>
            <p className={`text-xs mt-1 max-w-sm ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>
              点击上方按钮新建今日日报
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className={`mt-4 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer ${
                isOledTheme
                  ? 'bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050607]'
                  : 'bg-[#0071E3] text-white'
              }`}
            >
              写日报
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
                  isOledTheme
                    ? isToday
                      ? 'border-[#00E5FF]/40 bg-[#0C0F11] shadow-[0_0_20px_rgba(0,229,255,0.06)]'
                      : 'border-white/10 bg-[#0C0F11]/80 hover:bg-[#0C0F11] hover:border-white/20'
                    : isToday
                      ? 'border-blue-200/90 bg-white/95 shadow-sm'
                      : 'border-slate-200/70 bg-white/80 hover:bg-white hover:border-slate-300/80 shadow-2xs'
                }`}
              >
                {/* Date Header Row */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer flex-wrap gap-2"
                  onClick={() => !isEditing && toggleExpand(rep.date)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
                        {formatChineseDate(rep.date)}
                      </span>
                      {isToday && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isOledTheme
                            ? 'text-[#00E5FF] bg-[#00E5FF]/10 border-[#00E5FF]/30'
                            : 'text-[#0071E3] bg-blue-50 border-blue-200/60'
                        }`}>
                          今天
                        </span>
                      )}
                    </div>

                    {/* Stats pills */}
                    <div className={`flex items-center gap-2 text-[11px] ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>
                      <span className="flex items-center gap-1 font-medium font-mono">
                        <CheckCircle2 size={12} strokeWidth={2} className={isOledTheme ? 'text-[#B7FF3C]' : 'text-emerald-600'} />
                        <span>{rep.completedTasksCount || 0} 项完成</span>
                      </span>
                    </div>
                  </div>

                  {/* Header Action Buttons */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Copy button */}
                    <button
                      type="button"
                      onClick={() => handleCopyReport(rep)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isOledTheme
                          ? 'text-[#7D858A] hover:text-[#00E5FF] hover:bg-[#00E5FF]/10'
                          : 'text-[#86868B] hover:text-[#0071E3] hover:bg-blue-50/80'
                      }`}
                      title="复制内容"
                    >
                      {copiedDate === rep.date ? (
                        <>
                          <Check size={13} strokeWidth={2} className={isOledTheme ? 'text-[#B7FF3C]' : 'text-emerald-600'} />
                          <span className={`font-medium ${isOledTheme ? 'text-[#B7FF3C]' : 'text-emerald-600'}`}>已复制</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} strokeWidth={1.75} />
                          <span>复制</span>
                        </>
                      )}
                    </button>

                    {/* Edit button */}
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(rep)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          isOledTheme
                            ? 'text-[#00E5FF] hover:text-[#33EAFF] hover:bg-[#00E5FF]/10'
                            : 'text-[#0071E3] hover:text-blue-700 hover:bg-blue-50/80'
                        }`}
                        title="编辑"
                      >
                        <Edit3 size={13} strokeWidth={1.75} />
                        <span>编辑</span>
                      </button>
                    )}

                    {/* Export to Excel button */}
                    <button
                      type="button"
                      onClick={() => {
                        const url = api.getExportExcelUrl({ date: rep.date });
                        window.open(url, '_blank');
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isOledTheme
                          ? 'text-[#B7FF3C] hover:text-[#c9ff6a] hover:bg-[#B7FF3C]/10'
                          : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/80'
                      }`}
                      title="导出 Excel"
                    >
                      <Download size={13} strokeWidth={1.75} />
                      <span>导出</span>
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteReport(rep.date)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isOledTheme
                          ? 'text-[#7D858A] hover:text-rose-400 hover:bg-rose-500/10'
                          : 'text-[#86868B] hover:text-rose-600 hover:bg-rose-50/80'
                      }`}
                      title="删除日报"
                    >
                      <Trash2 size={13} strokeWidth={1.75} />
                      <span>删除</span>
                    </button>

                    {/* Chevron toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(rep.date)}
                      className={`p-1 rounded-lg transition-colors cursor-pointer ${
                        isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5]' : 'text-[#86868B] hover:text-[#1D1D1F]'
                      }`}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Content Detail */}
                {isExpanded && (
                  <div className={`px-5 pb-5 pt-1 border-t animate-fadeIn ${
                    isOledTheme ? 'border-white/10' : 'border-slate-100/90'
                  }`}>
                    {isEditing ? (
                      /* Editing Form Mode */
                      <div className="flex flex-col gap-3.5 pt-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className={`block text-xs font-bold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
                              今日工作
                            </label>
                            <button
                              type="button"
                              onClick={() => handleSyncTodayDeliverables(rep.date)}
                              className={`flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                                isOledTheme ? 'text-[#00E5FF] hover:text-[#33EAFF]' : 'text-[#0071E3] hover:underline'
                              }`}
                              title="同步待办"
                            >
                              <Clock size={11} strokeWidth={2} />
                              <span>同步待办</span>
                            </button>
                          </div>
                          <textarea
                            rows={4}
                            value={editDeliverables}
                            onChange={(e) => setEditDeliverables(e.target.value)}
                            placeholder="1. XXXXX&#10;2. XXXXX"
                            className={`w-full px-3.5 py-2 text-xs rounded-xl focus:outline-none border ${
                              isOledTheme
                                ? 'bg-[#080A0C] border-white/15 text-[#F2F5F5] focus:border-[#B7FF3C] focus:ring-2 focus:ring-[#B7FF3C]/20'
                                : 'bg-white border-emerald-300 text-[#1D1D1F] focus:ring-2 focus:ring-emerald-500/20'
                            }`}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className={`block text-xs font-bold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
                              明日计划:
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAutoLinkTomorrow(rep.date)}
                              className={`flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                                isOledTheme ? 'text-[#00E5FF] hover:text-[#33EAFF]' : 'text-[#0071E3] hover:underline'
                              }`}
                              title="导入明日计划"
                            >
                              <Repeat size={11} strokeWidth={2} />
                              <span>导入明日计划</span>
                            </button>
                          </div>
                          <textarea
                            rows={3}
                            value={editTomorrowPlan}
                            onChange={(e) => setEditTomorrowPlan(e.target.value)}
                            placeholder="1. xxx&#10;2. xxx"
                            className={`w-full px-3.5 py-2 text-xs rounded-xl focus:outline-none border ${
                              isOledTheme
                                ? 'bg-[#080A0C] border-white/15 text-[#F2F5F5] focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20'
                                : 'bg-white border-blue-300 text-[#1D1D1F] focus:ring-2 focus:ring-[#0071E3]/20'
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`block text-xs font-bold mb-1 ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
                            遇到问题 (可选)
                          </label>
                          <textarea
                            rows={2}
                            value={editBlockers}
                            onChange={(e) => setEditBlockers(e.target.value)}
                            placeholder="无..."
                            className={`w-full px-3.5 py-2 text-xs rounded-xl focus:outline-none border ${
                              isOledTheme
                                ? 'bg-[#080A0C] border-white/15 text-[#F2F5F5] focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                                : 'bg-white border-slate-200 text-[#1D1D1F] focus:ring-2 focus:ring-rose-500/20'
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`block text-xs font-bold mb-1 ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
                            备注 (可选)
                          </label>
                          <input
                            type="text"
                            value={editCustomNotes}
                            onChange={(e) => setEditCustomNotes(e.target.value)}
                            placeholder="其他说明..."
                            className={`w-full px-3.5 py-2 text-xs rounded-xl focus:outline-none border ${
                              isOledTheme
                                ? 'bg-[#080A0C] border-white/15 text-[#F2F5F5] focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20'
                                : 'bg-white border-slate-200 text-[#1D1D1F] focus:ring-2 focus:ring-[#0071E3]/20'
                            }`}
                          />
                        </div>

                        {/* Save & Cancel Bar with Delete option */}
                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(rep.date)}
                            disabled={isSaving}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                              isOledTheme
                                ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                                : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                          >
                            <Trash2 size={13} strokeWidth={1.75} />
                            <span>删除日报</span>
                          </button>

                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                                isOledTheme
                                  ? 'border-white/10 bg-[#111417] text-[#7D858A] hover:text-[#F2F5F5] hover:border-white/20'
                                  : 'border-slate-200 text-[#86868B] hover:text-[#1D1D1F] hover:bg-slate-50'
                              }`}
                            >
                              <X size={13} strokeWidth={2} />
                              <span>取消</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(rep.date)}
                              disabled={isSaving}
                              className={`flex items-center gap-1.5 px-5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                                isOledTheme
                                  ? 'bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050607] shadow-[#00E5FF]/20'
                                  : 'bg-[#0071E3] hover:bg-blue-600 text-white shadow-blue-500/20'
                              }`}
                            >
                              <Save size={13} strokeWidth={2} />
                              <span>{isSaving ? '保存中...' : '保存'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Display Detail Mode */
                      <div className="flex flex-col gap-3 pt-2 text-xs">
                        {/* 今日工作 */}
                        <div>
                          <span className={`font-bold block mb-1 ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
                            今日工作
                          </span>
                          <div className={`whitespace-pre-line leading-relaxed pl-3 border-l-2 p-2.5 rounded-r-xl ${
                            isOledTheme
                              ? 'border-[#B7FF3C] bg-[#B7FF3C]/5 text-[#F2F5F5]'
                              : 'border-emerald-500 bg-emerald-50/40 text-[#48484A]'
                          }`}>
                            {rep.deliverables || '1. XXXXX\n2. XXXXX'}
                          </div>
                        </div>

                        {/* 明日计划: */}
                        <div>
                          <span className={`font-bold block mb-1 ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
                            明日计划:
                          </span>
                          <div className={`whitespace-pre-line leading-relaxed pl-3 border-l-2 p-2.5 rounded-r-xl ${
                            isOledTheme
                              ? 'border-[#00E5FF] bg-[#00E5FF]/5 text-[#F2F5F5]'
                              : 'border-[#0071E3] bg-blue-50/40 text-[#48484A]'
                          }`}>
                            {rep.tomorrowPlan || '1. xxx\n2. xxx'}
                          </div>
                        </div>

                        {/* Custom Notes */}
                        {rep.customNotes && (
                          <div className={`text-[11px] pt-1 ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>
                            <span className={`font-semibold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>备注：</span>
                            <span>{rep.customNotes}</span>
                          </div>
                        )}

                        {/* Footer info */}
                        <div className={`flex items-center justify-between text-[10px] pt-2 border-t ${
                          isOledTheme ? 'border-white/10 text-[#7D858A]' : 'border-slate-100 text-[#86868B]'
                        }`}>
                          <span>
                            更新时间：{rep.updatedAt ? new Date(rep.updatedAt).toLocaleString('zh-CN') : '暂无'}
                          </span>
                          {onSelectDateForCalendar && (
                            <button
                              type="button"
                              onClick={() => onSelectDateForCalendar(rep.date)}
                              className={`font-medium cursor-pointer ${
                                isOledTheme ? 'text-[#00E5FF] hover:text-[#33EAFF]' : 'text-[#0071E3] hover:underline'
                              }`}
                            >
                              查看日历 →
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

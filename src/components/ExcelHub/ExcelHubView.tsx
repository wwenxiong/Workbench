import React, { useState } from 'react';
import {
  Sheet,
  Plus,
  ExternalLink,
  RefreshCw,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Database,
  Eye,
  Sliders,
  FolderOpen
} from 'lucide-react';
import type { ExcelConfig, MonitoredCell } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Common/Toast';

interface ExcelHubViewProps {
  excelConfigs: ExcelConfig[];
  onConfigsUpdated: () => void;
}

export const ExcelHubView: React.FC<ExcelHubViewProps> = ({
  excelConfigs,
  onConfigsUpdated,
}) => {
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('日常办公');
  const [filePath, setFilePath] = useState('');
  const [targetSheet, setTargetSheet] = useState('工作日志台账');
  const [isAnnualLedger, setIsAnnualLedger] = useState(false);

  // Monitored cells list
  const [monitoredCells, setMonitoredCells] = useState<MonitoredCell[]>([]);
  const [cellLabel, setCellLabel] = useState('');
  const [cellSheet, setCellSheet] = useState('Sheet1');
  const [cellRef, setCellRef] = useState('B2');

  // Test reading state
  const [readingId, setReadingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, Array<{ label: string; value: string }>>>({});

  const handleOpenEdit = (config?: ExcelConfig) => {
    if (config) {
      setEditingId(config.id);
      setName(config.name);
      setCategory(config.category || '日常办公');
      setFilePath(config.filePath);
      setTargetSheet(config.targetSheet || '工作日志台账');
      setIsAnnualLedger(!!config.isAnnualLedger);
      setMonitoredCells(config.monitoredCells || []);
    } else {
      setEditingId(null);
      setName('');
      setCategory('日常办公');
      setFilePath('');
      setTargetSheet('工作日志台账');
      setIsAnnualLedger(false);
      setMonitoredCells([]);
    }
    setIsEditing(true);
  };

  const handleAddMonitoredCell = () => {
    if (!cellRef.trim()) return;
    const newCell: MonitoredCell = {
      label: cellLabel.trim() || `${cellSheet}!${cellRef.trim()}`,
      sheet: cellSheet.trim() || 'Sheet1',
      cell: cellRef.trim().toUpperCase(),
    };
    setMonitoredCells((prev) => [...prev, newCell]);
    setCellLabel('');
    setCellRef('');
  };

  const handleRemoveMonitoredCell = (idx: number) => {
    setMonitoredCells((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !filePath.trim()) {
      showToast('请完整填写名称与本地文件路径', { type: 'error' });
      return;
    }

    try {
      if (editingId) {
        await api.updateExcelConfig(editingId, {
          name,
          category,
          filePath,
          targetSheet,
          isAnnualLedger,
          monitoredCells,
        });
        showToast('表格配置已更新', { type: 'success' });
      } else {
        await api.createExcelConfig({
          name,
          category,
          filePath,
          targetSheet,
          isAnnualLedger,
          monitoredCells,
        });
        showToast('新表格配置已添加', { type: 'success' });
      }

      setIsEditing(false);
      onConfigsUpdated();
    } catch (err: unknown) {
      const error = err as Error;
      showToast('保存失败', { type: 'error', message: error.message });
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!window.confirm('确认移除此表格配置？')) return;
    try {
      await api.deleteExcelConfig(id);
      showToast('已移除配置', { type: 'info' });
      onConfigsUpdated();
    } catch (err: unknown) {
      const error = err as Error;
      showToast('删除失败', { type: 'error', message: error.message });
    }
  };

  // Test Open File
  const handleOpenFile = async (pathStr: string) => {
    try {
      const res = await api.openExcelFile(pathStr);
      if (res.openedLocally === false) {
        showToast('服务器运行在非桌面环境', { type: 'info', message: res.message || '建议通过常用文件跳板直接下载表格' });
      } else {
        showToast('已唤起系统应用打开', { type: 'success', message: pathStr });
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast('无法打开文件', { type: 'error', message: error.message });
    }
  };

  // Test Read Snapshot
  const handleTestRead = async (config: ExcelConfig) => {
    setReadingId(config.id);
    try {
      const res = await api.readExcelSnapshot(config.filePath, config.monitoredCells);
      setTestResults((prev) => ({
        ...prev,
        [config.id]: res.results.map((r) => ({ label: r.label, value: r.value })),
      }));
      showToast('轻量读取成功！', {
        type: 'success',
        message: `成功读取 ${res.results.length} 个单元格指标`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      showToast('读取失败', { type: 'error', message: error.message });
    } finally {
      setReadingId(null);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-slate-50 flex flex-col gap-5">
      {/* 1. Header */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sheet className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Excel 表格
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1">
              <Database className="w-3 h-3" />
              <span>表格工具</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            管理常用表格，可查看单元格数值或追加日报。
          </p>
        </div>

        <button
          onClick={() => handleOpenEdit()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>添加表格</span>
        </button>
      </div>

      {/* 2. Config Modal Form */}
      {isEditing && (
        <form
          onSubmit={handleSaveConfig}
          className="p-5 rounded-2xl bg-white border-2 border-emerald-500/50 shadow-md flex flex-col gap-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>{editingId ? '编辑表格' : '添加表格'}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              关闭
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">名称：</label>
              <input
                type="text"
                required
                placeholder="例如：销售统计表"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">分类：</label>
              <input
                type="text"
                placeholder="日常办公 / 业务报表"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>

            <div className="col-span-2">
              <label className="font-bold text-slate-700 block mb-1">文件路径：</label>
              <input
                type="text"
                required
                placeholder="例如：D:\文档\销售表.xlsx"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                支持 .xlsx 与 .xlsm 格式
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">目标工作表 (Sheet)：</label>
              <input
                type="text"
                value={targetSheet}
                onChange={(e) => setTargetSheet(e.target.value)}
                placeholder="例如：Sheet1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="annual_ledger_cb"
                checked={isAnnualLedger}
                onChange={(e) => setIsAnnualLedger(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <label htmlFor="annual_ledger_cb" className="font-bold text-slate-700 select-none cursor-pointer">
                设为常用日报表格
              </label>
            </div>
          </div>

          {/* Monitored Cells Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
            <span className="font-bold text-xs text-slate-700">
              添加要查看的单元格 (直接在页面显示数值)
            </span>

            <div className="flex items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="名称 (如: 销售额)"
                value={cellLabel}
                onChange={(e) => setCellLabel(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                placeholder="工作表 (默认 Sheet1)"
                value={cellSheet}
                onChange={(e) => setCellSheet(e.target.value)}
                className="w-36 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                placeholder="单元格 (如 B2)"
                value={cellRef}
                onChange={(e) => setCellRef(e.target.value)}
                className="w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg uppercase font-mono"
              />
              <button
                type="button"
                onClick={handleAddMonitoredCell}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                + 添加
              </button>
            </div>

            {/* List of configured cells */}
            <div className="flex flex-wrap gap-2 mt-1">
              {monitoredCells.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <span className="font-semibold text-slate-700">{c.label}:</span>
                  <span className="font-mono text-emerald-700">
                    [{c.sheet}!{c.cell}]
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMonitoredCell(i)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              {monitoredCells.length === 0 && (
                <span className="text-[11px] text-slate-400">暂未配置监控单元格</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              保存
            </button>
          </div>
        </form>
      )}

      {/* 3. Registered Excel Workbooks List */}
      <div className="grid grid-cols-1 gap-4">
        {excelConfigs.map((config) => (
          <div
            key={config.id}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3.5 hover:border-emerald-300 transition-all"
          >
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">{config.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                      {config.category}
                    </span>
                    {config.isAnnualLedger && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ⭐ 日报表格
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 font-mono mt-1 break-all flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{config.filePath}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenFile(config.filePath)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="打开"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  <span>打开</span>
                </button>

                <button
                  onClick={() => handleTestRead(config)}
                  disabled={readingId === config.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${readingId === config.id ? 'animate-spin' : ''}`} />
                  <span>读取数值</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(config)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                  title="编辑"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteConfig(config.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Monitored Cells & Live Values */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs flex flex-col gap-2">
              <span className="font-bold text-slate-600 text-[11px] flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>监控单元格 ({config.monitoredCells?.length || 0})</span>
              </span>

              <div className="grid grid-cols-3 gap-2">
                {config.monitoredCells && config.monitoredCells.length > 0 ? (
                  config.monitoredCells.map((c, i) => {
                    const testVal = testResults[config.id]?.find((r) => r.label === c.label)?.value;

                    return (
                      <div
                        key={i}
                        className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-slate-600">{c.label}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {c.sheet}!{c.cell}
                          </div>
                        </div>

                        <div className="font-mono font-extrabold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded">
                          {testVal !== undefined ? testVal : '点击读取'}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-3 text-slate-400 text-[11px] py-1">
                    暂无监控单元格
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {excelConfigs.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 text-xs flex flex-col items-center justify-center">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mb-2" />
            <p className="font-bold text-slate-600">暂无表格</p>
            <p className="mt-1">点击右上角“添加表格”，添加常用表格文件。</p>
          </div>
        )}
      </div>
    </div>
  );
};

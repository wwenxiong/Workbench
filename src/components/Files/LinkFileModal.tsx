import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Check, 
  Link, 
  ClipboardCopy, 
  FolderOpen
} from 'lucide-react';
import type { LinkedFile } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Common/Toast';

interface LinkFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileLinked: (newFile: LinkedFile) => void;
  fileToEdit?: LinkedFile | null;
}

const CATEGORY_OPTIONS = [
  '数据表格',
  '工作文档',
  '日常办公',
  '设计资产',
  '开发配置',
  '重要资料'
];

export const LinkFileModal: React.FC<LinkFileModalProps> = ({
  isOpen,
  onClose,
  onFileLinked,
  fileToEdit = null,
}) => {
  const { showToast } = useToast();

  const [filePath, setFilePath] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('数据表格');
  const [isPinned, setIsPinned] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (fileToEdit) {
        setFilePath(fileToEdit.filePath);
        setName(fileToEdit.name);
        setCategory(fileToEdit.category || '数据表格');
        setIsPinned(!!fileToEdit.isPinned);
        setNotes(fileToEdit.notes || '');
      } else {
        setFilePath('');
        setName('');
        setCategory('数据表格');
        setIsPinned(false);
        setNotes('');
      }
    }
  }, [isOpen, fileToEdit]);

  if (!isOpen) return null;

  // Process Path input to clean quotes and extract real filename
  const handlePathChange = (rawVal: string) => {
    const cleanPath = rawVal.replace(/^["']|["']$/g, '').trim();
    setFilePath(cleanPath);

    if (cleanPath) {
      const parts = cleanPath.split(/[\\/]/);
      const fileName = parts[parts.length - 1] || '';
      
      // Auto-set name if empty or previously matching path
      if (!name || name === parts[parts.length - 2] || name.includes('\\')) {
        setName(fileName);
      }

      // Auto-categorize based on extension
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      if (['xlsx', 'xlsm', 'xls', 'csv'].includes(ext)) {
        setCategory('数据表格');
      } else if (['doc', 'docx', 'pdf', 'md', 'txt'].includes(ext)) {
        setCategory('工作文档');
      } else if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'psd', 'ai'].includes(ext)) {
        setCategory('设计资产');
      } else if (['json', 'ts', 'js', 'html', 'css', 'py', 'yml', 'yaml'].includes(ext)) {
        setCategory('开发配置');
      }
    }
  };

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handlePathChange(text);
        showToast('已从剪贴板粘贴路径', { type: 'success' });
      } else {
        showToast('剪贴板为空', { type: 'info' });
      }
    } catch {
      showToast('请直接在路径输入框按 Ctrl+V 粘贴', { type: 'info' });
    }
  };

  // Pop up native Windows File Picker Dialog
  const handlePickFile = async () => {
    try {
      setIsPicking(true);
      showToast('正在打开 Windows 文件选择窗口...', { type: 'info' });
      const res = await api.pickFile();
      if (res.success && res.filePath) {
        handlePathChange(res.filePath);
        if (res.fileName) {
          setName(res.fileName);
        }
        showToast('已成功选取本地文件', { 
          type: 'success',
          message: res.fileName 
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || '打开系统文件选择器失败', { type: 'error' });
    } finally {
      setIsPicking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPath = filePath.replace(/^["']|["']$/g, '').trim();
    if (!cleanPath) {
      showToast('请输入本地文件路径', { type: 'error' });
      return;
    }

    const finalName = name.trim() || cleanPath.split(/[\\/]/).pop() || '未命名表格';
    const ext = finalName.split('.').pop()?.toLowerCase() || 'file';

    try {
      setIsSubmitting(true);

      if (fileToEdit) {
        const updated = await api.updateFile(fileToEdit.id, {
          name: finalName,
          filePath: cleanPath,
          fileType: ext,
          category,
          isPinned,
          notes: notes.trim(),
        });
        onFileLinked(updated);
        showToast('超链接已更新', { type: 'success' });
      } else {
        const created = await api.addFile({
          name: finalName,
          filePath: cleanPath,
          fileType: ext,
          category,
          isPinned,
          notes: notes.trim(),
        });
        onFileLinked(created);
        showToast('本地原表超链接已添加', { 
          type: 'success',
          message: `点击卡片即可直接唤起打开【${finalName}】` 
        });
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || '保存超链接失败', { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/90 shadow-[0_24px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Link size={17} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1D1D1F]">
                {fileToEdit ? '修改本地文件超链接' : '添加本地文件超链接'}
              </h2>
              <p className="text-[11px] text-[#86868B] mt-0.5">
                直接关联电脑原表，点击后直接打开，不修改文件名，不生成副本
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 rounded-full transition-colors cursor-pointer"
          >
            <X size={17} strokeWidth={2} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* 1. Native Windows File Picker Button (弹窗选择文件) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white border border-blue-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5">
                <FolderOpen size={16} strokeWidth={2} className="text-[#0071E3]" />
                <span>直接在电脑中选择文件</span>
              </div>
              <div className="text-[11px] text-[#86868B] mt-0.5">
                一键唤起 Windows 官方文件浏览器，选中表格即可自动关联原表路径
              </div>
            </div>

            <button
              type="button"
              onClick={handlePickFile}
              disabled={isPicking}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <FolderOpen size={14} strokeWidth={2} className={isPicking ? 'animate-bounce' : ''} />
              <span>{isPicking ? '请在弹出窗口中选择...' : '弹窗浏览电脑文件'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 my-0.5">
            <div className="h-[1px] flex-1 bg-slate-100" />
            <span className="text-[10px] text-[#86868B] font-medium">或手动输入/粘贴路径</span>
            <div className="h-[1px] flex-1 bg-slate-100" />
          </div>

          {/* File Path Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#1D1D1F]">
                本地文件绝对路径 <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#0071E3] hover:underline cursor-pointer"
              >
                <ClipboardCopy size={12} strokeWidth={1.75} />
                <span>一键粘贴剪贴板</span>
              </button>
            </div>
            <input
              type="text"
              value={filePath}
              onChange={(e) => handlePathChange(e.target.value)}
              placeholder="例如: C:\Users\Admin\Desktop\两江VIP指标监控.xlsm"
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 font-mono text-[#1D1D1F] shadow-2xs"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
              显示名称 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 两江VIP指标监控.xlsm"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 text-[#1D1D1F]"
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
              分类标签
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 text-xs rounded-xl font-medium transition-colors cursor-pointer ${
                    category === cat
                      ? 'bg-[#0071E3] text-white'
                      : 'bg-slate-100 text-[#48484A] hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Pin to Quick Access */}
          <div className="flex items-center justify-between p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <div>
              <div className="text-xs font-bold text-[#1D1D1F]">置顶至快速跳板</div>
              <div className="text-[10px] text-[#86868B]">将在首页与文件中心优先醒目展示</div>
            </div>
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded text-[#0071E3] focus:ring-[#0071E3] cursor-pointer"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
              备注说明 (可选)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如: 每日早8点复核核心指标"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 text-[#1D1D1F]"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Check size={14} strokeWidth={2} />
              <span>{isSubmitting ? '正在保存...' : fileToEdit ? '保存修改' : '确认创建超链接'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

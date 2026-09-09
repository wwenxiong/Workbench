import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Check, 
  Link, 
  ClipboardCopy, 
  FolderOpen,
  UploadCloud,
  FileUp
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [filePath, setFilePath] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('数据表格');
  const [isPinned, setIsPinned] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

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

  const handlePathChange = (rawVal: string) => {
    const cleanPath = rawVal.replace(/^["']|["']$/g, '').trim();
    setFilePath(cleanPath);

    if (cleanPath) {
      const parts = cleanPath.split(/[\\/]/);
      const fileName = parts[parts.length - 1] || '';
      
      if (!name || name === parts[parts.length - 2] || name.includes('\\')) {
        setName(fileName);
      }

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

  const handleUploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      showToast(`正在上传 ${file.name}...`, { type: 'info' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('notes', notes);
      formData.append('isPinned', String(isPinned));

      const res = await api.uploadFile(formData);
      onFileLinked(res);
      showToast('文件已上传', {
        type: 'success',
        message: res.name
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || '上传失败', { type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handlePathChange(text);
        showToast('已粘贴路径', { type: 'success' });
      } else {
        showToast('剪贴板为空', { type: 'info' });
      }
    } catch {
      showToast('请直接在输入框按 Ctrl+V 粘贴', { type: 'info' });
    }
  };

  const handlePickFile = async () => {
    try {
      setIsPicking(true);
      const res = await api.pickFile();
      if (res.success && res.filePath) {
        handlePathChange(res.filePath);
        if (res.fileName) {
          setName(res.fileName);
        }
        showToast('已选择文件', { 
          type: 'success',
          message: res.fileName 
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || '选择失败，建议直接上传', { type: 'error' });
    } finally {
      setIsPicking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPath = filePath.replace(/^["']|["']$/g, '').trim();
    if (!cleanPath) {
      showToast('请输入路径或上传文件', { type: 'error' });
      return;
    }

    const finalName = name.trim() || cleanPath.split(/[\\/]/).pop() || '未命名文件';
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
        showToast('已更新', { type: 'success' });
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
        showToast('已添加', { type: 'success' });
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || '保存失败', { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-md animate-fade-in">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div 
        className="w-full max-w-lg bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-up"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
        }}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1677FF] flex items-center justify-center border border-blue-100/60 shadow-2xs">
              <Link size={16} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-[18px] font-semibold text-[#1D2129]">
                {fileToEdit ? '编辑文件' : '添加文件'}
              </h3>
              <p className="text-[13px] text-[#4E5969]">
                可上传文件或输入文件路径
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#4E5969] hover:text-[#1D2129] hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Direct Upload Area */}
          {!fileToEdit && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`p-5 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                isDragOver
                  ? 'border-[#1677FF] bg-blue-50/60'
                  : 'border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-blue-50/30'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-11 h-11 rounded-2xl bg-blue-100/70 text-[#1677FF] flex items-center justify-center mb-2 shadow-2xs">
                {isUploading ? (
                  <UploadCloud size={22} className="animate-bounce" />
                ) : (
                  <FileUp size={22} />
                )}
              </div>
              <div className="text-[15px] font-semibold text-[#1D2129]">
                {isUploading ? '上传中...' : '点击或拖拽文件上传'}
              </div>
              <div className="text-[13px] text-[#4E5969] mt-0.5">
                支持各类文档、图片、表格（最大 100MB）
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 my-0.5">
            <div className="h-[1px] flex-1 bg-slate-100" />
            <span className="text-[12px] text-[#86909C] font-medium">或直接输入文件路径</span>
            <div className="h-[1px] flex-1 bg-slate-100" />
          </div>

          {/* Windows Local Native Picker Option */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3">
            <div className="text-[13px] text-[#4E5969] flex items-center gap-1.5 font-medium">
              <FolderOpen size={15} className="text-[#1677FF]" />
              <span>本地电脑：直接打开文件选择窗口</span>
            </div>
            <button
              type="button"
              onClick={handlePickFile}
              disabled={isPicking}
              className="px-3 py-1.5 text-[13px] font-medium text-[#1D2129] bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              {isPicking ? '选择中...' : '浏览文件'}
            </button>
          </div>

          {/* File Path Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[14px] font-medium text-[#1D2129]">
                文件路径 <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[12px] font-medium text-[#1677FF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ClipboardCopy size={13} />
                <span>粘贴路径</span>
              </button>
            </div>
            <input
              type="text"
              value={filePath}
              onChange={(e) => handlePathChange(e.target.value)}
              placeholder="例如: D:\文档\销售表.xlsx"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[14px] text-[#1D2129] focus:bg-white focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all outline-none font-mono tabular-nums"
            />
          </div>

          {/* File Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[14px] font-medium text-[#1D2129] mb-1.5">
                名称
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如: 销售表"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[14px] text-[#1D2129] focus:bg-white focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#1D2129] mb-1.5">
                分类
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[14px] text-[#1D2129] focus:bg-white focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all outline-none cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[14px] font-medium text-[#1D2129] mb-1.5">
              备注 (可选)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如: 每天下班核对"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[14px] text-[#1D2129] focus:bg-white focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all outline-none"
            />
          </div>

          {/* Pin to Top Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded text-[#1677FF] focus:ring-[#1677FF] cursor-pointer accent-[#1677FF]"
            />
            <label htmlFor="isPinned" className="text-[14px] text-[#1D2129] font-medium cursor-pointer">
              置顶显示
            </label>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[14px] font-medium text-[#4E5969] hover:text-[#1D2129] hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-[14px] font-medium text-white bg-[#1677FF] hover:bg-blue-600 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>保存</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

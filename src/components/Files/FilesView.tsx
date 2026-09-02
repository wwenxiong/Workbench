import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Plus,
  Search,
  ExternalLink,
  Trash2,
  Edit3,
  Copy,
  Check,
  Pin,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  FileCode,
  Image as ImageIcon,
  Archive,
  File as FileGeneric,
  FolderSearch
} from 'lucide-react';
import type { LinkedFile } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Common/Toast';
import { LinkFileModal } from './LinkFileModal';

const CATEGORIES = [
  '全部',
  '工作文档',
  '数据表格',
  '设计资产',
  '开发配置',
  '日常办公',
  '重要资料'
];

// Helper to get specialized color and icon by file extension
function getFileTypeConfig(fileType: string) {
  const type = (fileType || '').toLowerCase();
  if (['xlsx', 'xls', 'csv'].includes(type)) {
    return {
      label: 'EXCEL',
      icon: FileSpreadsheet,
      badgeBg: 'bg-emerald-500',
      cardBg: 'bg-gradient-to-b from-emerald-50/50 to-white',
      borderHover: 'hover:border-emerald-300',
      textAccent: 'text-emerald-700',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    };
  }
  if (['doc', 'docx', 'wps'].includes(type)) {
    return {
      label: 'WORD',
      icon: FileText,
      badgeBg: 'bg-blue-600',
      cardBg: 'bg-gradient-to-b from-blue-50/50 to-white',
      borderHover: 'hover:border-blue-300',
      textAccent: 'text-blue-700',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
    };
  }
  if (['pdf'].includes(type)) {
    return {
      label: 'PDF',
      icon: FileText,
      badgeBg: 'bg-rose-500',
      cardBg: 'bg-gradient-to-b from-rose-50/50 to-white',
      borderHover: 'hover:border-rose-300',
      textAccent: 'text-rose-700',
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
    };
  }
  if (['ppt', 'pptx'].includes(type)) {
    return {
      label: 'PPT',
      icon: FileText,
      badgeBg: 'bg-amber-500',
      cardBg: 'bg-gradient-to-b from-amber-50/50 to-white',
      borderHover: 'hover:border-amber-300',
      textAccent: 'text-amber-700',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
    };
  }
  if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'psd', 'ai'].includes(type)) {
    return {
      label: 'IMAGE',
      icon: ImageIcon,
      badgeBg: 'bg-purple-500',
      cardBg: 'bg-gradient-to-b from-purple-50/50 to-white',
      borderHover: 'hover:border-purple-300',
      textAccent: 'text-purple-700',
      iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
    };
  }
  if (['json', 'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'go', 'html', 'css', 'sql', 'sh'].includes(type)) {
    return {
      label: 'CODE',
      icon: FileCode,
      badgeBg: 'bg-indigo-500',
      cardBg: 'bg-gradient-to-b from-indigo-50/50 to-white',
      borderHover: 'hover:border-indigo-300',
      textAccent: 'text-indigo-700',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(type)) {
    return {
      label: 'ZIP',
      icon: Archive,
      badgeBg: 'bg-orange-500',
      cardBg: 'bg-gradient-to-b from-orange-50/50 to-white',
      borderHover: 'hover:border-orange-300',
      textAccent: 'text-orange-700',
      iconBg: 'bg-orange-50 text-orange-600 border-orange-100',
    };
  }
  if (['md', 'txt', 'log'].includes(type)) {
    return {
      label: 'TEXT',
      icon: FileText,
      badgeBg: 'bg-slate-600',
      cardBg: 'bg-gradient-to-b from-slate-50/50 to-white',
      borderHover: 'hover:border-slate-300',
      textAccent: 'text-slate-700',
      iconBg: 'bg-slate-50 text-slate-600 border-slate-200',
    };
  }
  return {
    label: (type || 'FILE').toUpperCase(),
    icon: FileGeneric,
    badgeBg: 'bg-[#0071E3]',
    cardBg: 'bg-gradient-to-b from-blue-50/30 to-white',
    borderHover: 'hover:border-blue-300',
    textAccent: 'text-slate-700',
    iconBg: 'bg-slate-50 text-[#0071E3] border-slate-100',
  };
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes === 0) return '未知大小';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export const FilesView: React.FC = () => {
  const { showToast } = useToast();

  const [files, setFiles] = useState<LinkedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileToEdit, setFileToEdit] = useState<LinkedFile | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load files list
  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getFiles();
      setFiles(data);
    } catch (err) {
      console.error(err);
      showToast('加载文件列表失败', { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Quick Open File
  const handleOpenFile = async (file: LinkedFile) => {
    try {
      setOpeningId(file.id);
      await api.openFile(file.filePath, file.id);
      showToast('已唤起系统应用打开', { 
        message: file.name,
        type: 'success' 
      });
      // Refresh to update lastOpenedAt
      loadFiles();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || '打开失败，请检查本地路径是否存在', { type: 'error' });
    } finally {
      setOpeningId(null);
    }
  };

  // Reveal in Explorer
  const handleRevealFile = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.revealFile(filePath);
      showToast('已在文件管理器中定位', { type: 'info' });
    } catch {
      showToast('无法定位本地文件', { type: 'error' });
    }
  };

  // Copy File Path
  const handleCopyPath = (filePath: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(filePath);
    setCopiedId(id);
    showToast('本地文件路径已复制到剪贴板', { type: 'success' });
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Delete Linked File
  const handleDeleteFile = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确定解除对「${name}」的链接吗？（不会删除电脑本地源文件）`)) {
      return;
    }
    try {
      await api.deleteFile(id);
      setFiles(prev => prev.filter(f => f.id !== id));
      showToast('已移除文件快捷链接', { type: 'success' });
    } catch {
      showToast('删除失败', { type: 'error' });
    }
  };

  // Filtered List
  const filteredFiles = files.filter((f) => {
    if (selectedCategory !== '全部' && f.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (f.name || '').toLowerCase().includes(q);
      const matchPath = (f.filePath || '').toLowerCase().includes(q);
      const matchCategory = (f.category || '').toLowerCase().includes(q);
      const matchNotes = (f.notes || '').toLowerCase().includes(q);
      if (!matchName && !matchPath && !matchCategory && !matchNotes) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-fadeIn pb-12">
      {/* 1. Header Banner (Apple Liquid Glass) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-[28px] liquid-glass-hero border border-white/95">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
              <FolderOpen size={18} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-extrabold text-[#1D1D1F] tracking-tight">
              文件中心与快捷跳板
            </h1>
          </div>
          <p className="text-xs text-[#86868B] max-w-xl">
            链接本地常用文件至工作台，以栅格大图标直观呈现，支持系统原生应用一键极速秒开。
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadFiles}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] bg-white/80 hover:bg-white rounded-xl border border-slate-200/80 shadow-2xs transition-all cursor-pointer"
            title="刷新文件列表"
          >
            <RefreshCw size={13} strokeWidth={1.75} className={isLoading ? 'animate-spin' : ''} />
            <span>刷新</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFileToEdit(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} strokeWidth={2} />
            <span>链接本地文件</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0071E3] text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-[#86868B] hover:text-[#1D1D1F] border border-slate-200/60'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search size={14} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索已链接的文件..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-white/90 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 text-[#1D1D1F]"
          />
        </div>
      </div>

      {/* 3. Core Grid Section (栅格图标形式展示) */}
      {filteredFiles.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-white/80 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0071E3] flex items-center justify-center mb-3.5 border border-blue-100">
            <FolderSearch size={26} strokeWidth={1.75} />
          </div>
          <h3 className="text-sm font-bold text-[#1D1D1F]">暂无已链接的本地文件</h3>
          <p className="text-xs text-[#86868B] max-w-sm mt-1 mb-5">
            点击上方「链接本地文件」，选取您电脑上的常用 Excel、Word、PDF 或代码工程即可在此形成便捷跳板。
          </p>
          <button
            type="button"
            onClick={() => {
              setFileToEdit(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus size={14} strokeWidth={2} />
            <span>立即链接第一份文件</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredFiles.map((file) => {
            const typeConfig = getFileTypeConfig(file.fileType);
            const IconComponent = typeConfig.icon;
            const isOpening = openingId === file.id;

            return (
              <div
                key={file.id}
                onClick={() => handleOpenFile(file)}
                className={`group relative rounded-2xl p-4 transition-all duration-300 cursor-pointer flex flex-col justify-between border border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,113,227,0.12)] hover:-translate-y-1 select-none backdrop-blur-md bg-white/85 ${typeConfig.cardBg} ${typeConfig.borderHover}`}
              >
                {/* Top Row: Format Chip & Pinned Indicator */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-md text-white ${typeConfig.badgeBg} shadow-2xs`}>
                    {typeConfig.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {file.isPinned && (
                      <span title="置顶文件" className="text-amber-500">
                        <Pin size={12} strokeWidth={2.5} className="fill-amber-500" />
                      </span>
                    )}
                    <span className="text-[10px] text-[#86868B] font-medium">
                      {file.category || '日常'}
                    </span>
                  </div>
                </div>

                {/* Center Big Icon (Apple Finder Aesthetics) */}
                <div className="flex flex-col items-center justify-center my-2.5">
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-108 ${typeConfig.iconBg}`}>
                    <IconComponent size={28} strokeWidth={1.75} />
                  </div>
                </div>

                {/* File Info */}
                <div className="mt-1 text-center">
                  <div 
                    className="text-xs font-bold text-[#1D1D1F] line-clamp-2 leading-snug group-hover:text-[#0071E3] transition-colors"
                    title={file.name}
                  >
                    {file.name}
                  </div>
                  <div className="text-[10px] text-[#86868B] font-mono mt-1 truncate" title={file.filePath}>
                    {formatBytes(file.size)}
                  </div>
                </div>

                {/* Bottom Quick Action Overlay Bar (Visible on Hover) */}
                <div 
                  className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenFile(file)}
                    disabled={isOpening}
                    className="flex-1 flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-semibold text-[#0071E3] hover:bg-blue-50/80 rounded-lg transition-colors cursor-pointer"
                    title="使用系统默认程序快速打开"
                  >
                    <ExternalLink size={12} strokeWidth={2} />
                    <span>{isOpening ? '打开中...' : '打开'}</span>
                  </button>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => handleCopyPath(file.filePath, file.id, e)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      title="复制本地绝对路径"
                    >
                      {copiedId === file.id ? (
                        <Check size={12} strokeWidth={2.5} className="text-emerald-600" />
                      ) : (
                        <Copy size={12} strokeWidth={1.75} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleRevealFile(file.filePath, e)}
                      className="p-1 text-slate-400 hover:text-[#0071E3] hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                      title="在文件夹中显示"
                    >
                      <FolderSearch size={12} strokeWidth={1.75} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileToEdit(file);
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-[#0071E3] hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                      title="修改配置"
                    >
                      <Edit3 size={12} strokeWidth={1.75} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteFile(file.id, file.name, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      title="解除链接"
                    >
                      <Trash2 size={12} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Link File Modal */}
      <LinkFileModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFileToEdit(null);
        }}
        fileToEdit={fileToEdit}
        onFileLinked={(savedFile) => {
          setFiles((prev) => {
            const idx = prev.findIndex((f) => f.id === savedFile.id);
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = savedFile;
              return clone;
            }
            return [savedFile, ...prev];
          });
        }}
      />
    </div>
  );
};

export default FilesView;

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  PinOff,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  FileCode,
  Image as ImageIcon,
  Archive,
  File as FileGeneric,
  Download,
  MoreHorizontal,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Presentation
} from 'lucide-react';
import type { LinkedFile } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Common/Toast';
import { LinkFileModal } from './LinkFileModal';
import { useTheme } from '../../contexts/ThemeContext';

const CATEGORIES = [
  '全部',
  '工作文档',
  '数据表格',
  '设计资产',
  '开发配置',
  '日常办公',
  '重要资料'
];

function getFileTypeConfig(fileType: string) {
  const type = (fileType || '').toLowerCase();
  if (['xlsx', 'xls', 'csv', 'xlsm'].includes(type)) {
    return {
      label: 'EXCEL',
      badgeBg: 'bg-emerald-600',
      icon: FileSpreadsheet,
      cardBg: 'hover:border-emerald-300/80',
      iconBoxBg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/70 border-emerald-200/80 text-emerald-700 shadow-emerald-500/10',
      accentColor: 'text-emerald-600',
    };
  }
  if (['ppt', 'pptx', 'key'].includes(type)) {
    return {
      label: 'PPT',
      badgeBg: 'bg-amber-600',
      icon: Presentation,
      cardBg: 'hover:border-amber-300/80',
      iconBoxBg: 'bg-gradient-to-br from-amber-50 to-amber-100/70 border-amber-200/80 text-amber-700 shadow-amber-500/10',
      accentColor: 'text-amber-600',
    };
  }
  if (['pdf'].includes(type)) {
    return {
      label: 'PDF',
      badgeBg: 'bg-rose-600',
      icon: FileText,
      cardBg: 'hover:border-rose-300/80',
      iconBoxBg: 'bg-gradient-to-br from-rose-50 to-rose-100/70 border-rose-200/80 text-rose-700 shadow-rose-500/10',
      accentColor: 'text-rose-600',
    };
  }
  if (['doc', 'docx', 'txt', 'md', 'wps'].includes(type)) {
    return {
      label: type === 'md' ? 'MARKDOWN' : 'WORD',
      badgeBg: 'bg-blue-600',
      icon: FileText,
      cardBg: 'hover:border-blue-300/80',
      iconBoxBg: 'bg-gradient-to-br from-blue-50 to-blue-100/70 border-blue-200/80 text-[#0071E3] shadow-blue-500/10',
      accentColor: 'text-[#0071E3]',
    };
  }
  if (['json', 'js', 'ts', 'tsx', 'html', 'css', 'py', 'sh', 'sql', 'yml', 'yaml'].includes(type)) {
    return {
      label: type.toUpperCase(),
      badgeBg: 'bg-indigo-600',
      icon: FileCode,
      cardBg: 'hover:border-indigo-300/80',
      iconBoxBg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/70 border-indigo-200/80 text-indigo-700 shadow-indigo-500/10',
      accentColor: 'text-indigo-600',
    };
  }
  if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'bmp', 'ico'].includes(type)) {
    return {
      label: 'IMG',
      badgeBg: 'bg-purple-600',
      icon: ImageIcon,
      cardBg: 'hover:border-purple-300/80',
      iconBoxBg: 'bg-gradient-to-br from-purple-50 to-purple-100/70 border-purple-200/80 text-purple-700 shadow-purple-500/10',
      accentColor: 'text-purple-600',
    };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(type)) {
    return {
      label: 'ZIP',
      badgeBg: 'bg-orange-600',
      icon: Archive,
      cardBg: 'hover:border-orange-300/80',
      iconBoxBg: 'bg-gradient-to-br from-orange-50 to-orange-100/70 border-orange-200/80 text-orange-700 shadow-orange-500/10',
      accentColor: 'text-orange-600',
    };
  }
  return {
    label: (fileType || 'FILE').toUpperCase().slice(0, 6),
    badgeBg: 'bg-slate-600',
    icon: FileGeneric,
    cardBg: 'hover:border-slate-300/80',
    iconBoxBg: 'bg-gradient-to-br from-slate-50 to-slate-100/70 border-slate-200 text-slate-700 shadow-slate-500/10',
    accentColor: 'text-slate-600',
  };
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '未知大小';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const FilesView: React.FC = () => {
  const { isOledTheme } = useTheme();
  const { showToast } = useToast();

  const [files, setFiles] = useState<LinkedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileToEdit, setFileToEdit] = useState<LinkedFile | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getFiles();
      setFiles(data);
    } catch (err: any) {
      console.error('Failed to load files:', err);
      showToast(err.message || '加载失败', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenFile = async (file: LinkedFile) => {
    try {
      setOpeningId(file.id);
      await api.openFile(file.id);
    } catch (err: any) {
      showToast(err.message || '打开文件失败', { type: 'error' });
    } finally {
      setOpeningId(null);
    }
  };

  const handleDownloadFile = (file: LinkedFile, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const downloadUrl = api.getFileDownloadUrl(file.id);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`已开始下载: ${file.name}`, { type: 'success' });
    } catch (err: any) {
      showToast(err.message || '下载失败', { type: 'error' });
    }
  };

  const handleCopyPath = async (file: LinkedFile, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(file.filePath);
      setCopiedId(file.id);
      showToast('路径已复制到剪贴板', { type: 'success' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('复制失败，请手动复制', { type: 'error' });
    }
    setActiveMenuId(null);
  };

  const handleTogglePin = async (file: LinkedFile, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await api.updateFile(file.id, { isPinned: !file.isPinned });
      setFiles((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
      showToast(file.isPinned ? '已取消置顶' : '已成功置顶', { type: 'success' });
    } catch (err: any) {
      showToast(err.message || '操作失败', { type: 'error' });
    }
    setActiveMenuId(null);
  };

  const handleDeleteFile = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确定要移除快捷文件 "${name}" 吗？\n（注：仅从工作台移除快捷索引，不会删除磁盘实际文件）`)) {
      return;
    }
    try {
      await api.deleteFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      showToast('文件索引已移除', { type: 'success' });
    } catch (err: any) {
      showToast(err.message || '删除失败', { type: 'error' });
    }
    setActiveMenuId(null);
  };

  const filteredFiles = files
    .filter((f) => {
      const matchCat = selectedCategory === '全部' || f.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        f.name.toLowerCase().includes(query) ||
        f.filePath.toLowerCase().includes(query) ||
        (f.notes && f.notes.toLowerCase().includes(query));
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* 1. Header Toolbar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 shadow-xs ${
        isOledTheme
          ? 'bg-[#080A0C] border border-white/[0.08] rounded-3xl'
          : 'bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl'
      }`}>
        <div>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 flex items-center justify-center shadow-md ${
              isOledTheme
                ? 'rounded-2xl bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                : 'rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#409CFF] text-white shadow-blue-500/20'
            }`}>
              <FolderOpen size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-bold tracking-tight ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-[#1D1D1F]'}`}>
                  文件管理
                </h1>
                <span className={`px-2.5 py-0.5 text-[11px] font-semibold font-mono rounded-full ${
                  isOledTheme
                    ? 'text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/30'
                    : 'text-[#0071E3] bg-blue-50 border border-blue-200/60'
                }`}>
                  {files.length} 个文件
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Switch */}
          <div className={`flex items-center p-1 border ${
            isOledTheme ? 'bg-[#111417] border-white/[0.08] rounded-xl' : 'bg-slate-100/90 border-slate-200/60 rounded-xl'
          }`}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-all cursor-pointer rounded-lg ${
                viewMode === 'grid'
                  ? isOledTheme ? 'bg-[#00E5FF] text-[#050607] shadow-xs font-bold' : 'bg-white text-[#0071E3] shadow-2xs font-bold'
                  : isOledTheme ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="网格视图"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-all cursor-pointer rounded-lg ${
                viewMode === 'list'
                  ? isOledTheme ? 'bg-[#00E5FF] text-[#050607] shadow-xs font-bold' : 'bg-white text-[#0071E3] shadow-2xs font-bold'
                  : isOledTheme ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="列表视图"
            >
              <ListIcon size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={loadFiles}
            className={`p-2.5 border rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 ${
              isOledTheme
                ? 'bg-[#111417] border-white/[0.08] text-[#7D858A] hover:text-[#00E5FF]'
                : 'border-slate-200/80 bg-white/80 hover:bg-white text-slate-500 hover:text-[#1D1D1F]'
            }`}
            title="刷新文件列表"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => {
              setFileToEdit(null);
              setIsModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl active:scale-98 transition-all cursor-pointer ${
              isOledTheme
                ? 'bg-[#00E5FF] hover:bg-[#00cce6] text-[#050607] font-bold shadow-sm shadow-[#00E5FF]/20'
                : 'bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-sm shadow-blue-500/25'
            }`}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>添加文件</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? isOledTheme
                    ? 'bg-[#00E5FF] text-[#050607] font-bold shadow-xs'
                    : 'bg-[#1D1D1F] text-white shadow-xs font-semibold'
                  : isOledTheme
                    ? 'bg-[#0C0F11] hover:bg-[#111417] text-[#7D858A] hover:text-[#F2F5F5] border border-white/[0.06]'
                    : 'bg-white/70 hover:bg-white text-[#6E6E73] hover:text-[#1D1D1F] border border-slate-200/70'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索文件名称、备注或路径..."
            className={`w-full pl-9 pr-3.5 py-2 text-xs border rounded-xl transition-all outline-none shadow-2xs ${
              isOledTheme
                ? 'bg-[#0C0F11] border-white/[0.08] text-[#F2F5F5] placeholder-[#7D858A] focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20'
                : 'bg-white/80 border-slate-200/80 text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20'
            }`}
          />
        </div>
      </div>

      {/* 3. Files Display */}
      {filteredFiles.length === 0 ? (
        <div className={`p-16 text-center rounded-3xl border shadow-xs flex flex-col items-center justify-center ${
          isOledTheme ? 'bg-[#080A0C] border-white/[0.08]' : 'bg-white/60 border-slate-200/70'
        }`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3.5 shadow-2xs border ${
            isOledTheme ? 'bg-[#0C0F11] text-[#00E5FF] border-[#00E5FF]/30' : 'bg-gradient-to-b from-slate-50 to-slate-100 text-slate-400 border-slate-200/60'
          }`}>
            <FolderOpen size={30} strokeWidth={1.5} />
          </div>
          <div className={`text-sm font-bold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
            {searchQuery || selectedCategory !== '全部' ? '未找到符合条件的文件' : '暂无管理文件'}
          </div>
          <p className="text-xs text-[#86868B] mt-1 max-w-sm mb-5 leading-relaxed">
            {searchQuery || selectedCategory !== '全部'
              ? '请尝试清除搜索关键字或切换其他分类'
              : '一键关联本地常用 Excel、Word、文档或配置，方便随时在系统中直达与下载。'}
          </p>
          <button
            type="button"
            onClick={() => {
              if (searchQuery || selectedCategory !== '全部') {
                setSearchQuery('');
                setSelectedCategory('全部');
              } else {
                setFileToEdit(null);
                setIsModalOpen(true);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {searchQuery || selectedCategory !== '全部' ? (
              <span>重置筛选条件</span>
            ) : (
              <>
                <Plus size={14} strokeWidth={2.5} />
                <span>立即添加</span>
              </>
            )}
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5">
          {filteredFiles.map((file) => {
            const typeConfig = getFileTypeConfig(file.fileType);
            const IconComponent = typeConfig.icon;
            const isOpening = openingId === file.id;
            const isMenuOpen = activeMenuId === file.id;

            return (
              <div
                key={file.id}
                onClick={() => handleOpenFile(file)}
                className={`group relative p-4 transition-all duration-300 cursor-pointer flex flex-col justify-between select-none rounded-2xl border ${
                  isOledTheme
                    ? 'bg-[#0C0F11] border-white/[0.08] hover:border-[#00E5FF]/40 hover:shadow-[0_4px_20px_rgba(0,229,255,0.08)]'
                    : 'bg-white/90 border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,113,227,0.12)] hover:-translate-y-1 backdrop-blur-md'
                }`}
              >
                {/* Top Badge & Category */}
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md ${
                    isOledTheme ? 'text-[#050607] bg-[#00E5FF]' : `text-white shadow-2xs ${typeConfig.badgeBg}`
                  }`}>
                    {typeConfig.label}
                  </span>

                  <div className="flex items-center gap-1.5 min-w-0">
                    {file.isPinned && (
                      <span
                        title="已置顶"
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                          isOledTheme ? 'bg-[#B7FF3C]/10 border border-[#B7FF3C]/30 text-[#B7FF3C]' : 'bg-amber-50 border border-amber-200/80 text-amber-600'
                        }`}
                      >
                        <Pin size={11} strokeWidth={2.5} className={isOledTheme ? 'fill-[#B7FF3C] text-[#B7FF3C]' : 'fill-amber-500 text-amber-500'} />
                        <span className="hidden sm:inline">置顶</span>
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate max-w-[80px] ${
                        isOledTheme ? 'bg-white/5 text-[#7D858A]' : 'bg-slate-100/80 text-[#86868B]'
                      }`}
                      title={file.category || '未分类'}
                    >
                      {file.category || '日常'}
                    </span>
                  </div>
                </div>

                {/* Center Big File Icon */}
                <div className="flex flex-col items-center justify-center my-3">
                  <div
                    className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-108 ${
                      isOledTheme ? 'bg-[#111417] border-white/[0.08] text-[#00E5FF]' : `${typeConfig.iconBoxBg}`
                    }`}
                  >
                    <IconComponent size={28} strokeWidth={1.8} />
                  </div>
                </div>

                {/* File Title & Size Info */}
                <div className="text-center w-full px-0.5">
                  <div
                    className={`text-xs font-bold line-clamp-2 h-9 flex items-center justify-center leading-snug break-all transition-colors ${
                      isOledTheme ? 'text-[#F2F5F5] group-hover:text-[#00E5FF]' : 'text-[#1D1D1F] group-hover:text-[#0071E3]'
                    }`}
                    title={file.name}
                  >
                    {file.name}
                  </div>
                  <div className={`text-[10px] font-mono mt-1 truncate ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`} title={file.filePath}>
                    {formatBytes(file.size)}
                  </div>
                </div>

                {/* Bottom Refined Action Bar */}
                <div
                  className={`mt-3.5 pt-2.5 border-t flex items-center gap-1.5 relative ${
                    isOledTheme ? 'border-white/[0.06]' : 'border-slate-100'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Primary "Open" Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenFile(file)}
                    disabled={isOpening}
                    className={`flex-1 min-w-0 h-8 flex items-center justify-center gap-1.5 px-2.5 text-xs font-semibold whitespace-nowrap active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-60 rounded-xl ${
                      isOledTheme
                        ? 'bg-[#00E5FF]/10 hover:bg-[#00E5FF] text-[#00E5FF] hover:text-[#050607] font-bold border border-[#00E5FF]/30'
                        : 'bg-[#0071E3]/10 hover:bg-[#0071E3] text-[#0071E3] hover:text-white shadow-2xs'
                    }`}
                    title="立即打开文件"
                  >
                    {isOpening ? (
                      <Loader2 size={13} className="animate-spin shrink-0" />
                    ) : (
                      <ExternalLink size={13} strokeWidth={2} className="shrink-0" />
                    )}
                    <span className="truncate">{isOpening ? '打开中' : '打开'}</span>
                  </button>

                  {/* Quick Download Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDownloadFile(file, e)}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl active:scale-95 transition-colors cursor-pointer shrink-0 border ${
                      isOledTheme
                        ? 'text-white/40 hover:text-[#00E5FF] hover:bg-white/5 border-white/[0.08]'
                        : 'text-slate-500 hover:text-[#0071E3] hover:bg-blue-50/80 border-slate-200/50 hover:border-blue-200/70'
                    }`}
                    title="下载文件"
                  >
                    <Download size={13} strokeWidth={2} />
                  </button>

                  {/* More Options Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : file.id);
                      }}
                      className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors cursor-pointer shrink-0 border ${
                        isMenuOpen
                          ? isOledTheme ? 'bg-white/10 text-white border-white/20' : 'bg-slate-200 text-slate-900 border-slate-300'
                          : isOledTheme ? 'text-white/40 hover:text-white hover:bg-white/5 border-white/[0.08]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-slate-200/50'
                      }`}
                      title="更多操作"
                    >
                      <MoreHorizontal size={14} strokeWidth={2} />
                    </button>

                    {/* Popover Dropdown Menu */}
                    {isMenuOpen && (
                      <div
                        ref={menuRef}
                        className={`absolute right-0 bottom-10 z-30 w-44 rounded-2xl border p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 ${
                          isOledTheme
                            ? 'bg-[#111417] border-white/[0.12] shadow-2xl shadow-black/80'
                            : 'bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-xl shadow-slate-400/20'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(file, e)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-xl transition-colors text-left cursor-pointer ${
                            isOledTheme ? 'text-[#F2F5F5] hover:bg-white/5' : 'text-slate-700 hover:text-[#1D1D1F] hover:bg-slate-100'
                          }`}
                        >
                          {file.isPinned ? (
                            <>
                              <PinOff size={13} className={isOledTheme ? 'text-[#B7FF3C]' : 'text-amber-500'} />
                              <span>取消置顶</span>
                            </>
                          ) : (
                            <>
                              <Pin size={13} className={isOledTheme ? 'text-[#B7FF3C]' : 'text-amber-500'} />
                              <span>置顶文件</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleCopyPath(file, e)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-xl transition-colors text-left cursor-pointer ${
                            isOledTheme ? 'text-[#F2F5F5] hover:bg-white/5' : 'text-slate-700 hover:text-[#1D1D1F] hover:bg-slate-100'
                          }`}
                        >
                          {copiedId === file.id ? (
                            <>
                              <Check size={13} className={isOledTheme ? 'text-[#B7FF3C]' : 'text-emerald-600'} />
                              <span className={isOledTheme ? 'text-[#B7FF3C] font-medium' : 'text-emerald-600 font-medium'}>已复制路径</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} className={isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'} />
                              <span>复制文件路径</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            setFileToEdit(file);
                            setIsModalOpen(true);
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-xl transition-colors text-left cursor-pointer ${
                            isOledTheme ? 'text-[#F2F5F5] hover:bg-white/5 hover:text-[#00E5FF]' : 'text-slate-700 hover:text-[#0071E3] hover:bg-blue-50/70'
                          }`}
                        >
                          <Edit3 size={13} className={isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'} />
                          <span>编辑文件属性</span>
                        </button>

                        <div className={`h-px my-0.5 ${isOledTheme ? 'bg-white/[0.06]' : 'bg-slate-100'}`} />

                        <button
                          type="button"
                          onClick={(e) => handleDeleteFile(file.id, file.name, e)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-xl transition-colors text-left cursor-pointer font-medium ${
                            isOledTheme ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          <Trash2 size={13} />
                          <span>移除此文件</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Table View */
        <div className={`rounded-3xl overflow-hidden border shadow-xs ${
          isOledTheme ? 'bg-[#080A0C] border-white/[0.08]' : 'bg-white/90 backdrop-blur-xl border-slate-200/70'
        }`}>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-semibold ${
                  isOledTheme ? 'border-white/[0.06] text-[#7D858A] bg-[#0C0F11]' : 'border-slate-100 text-slate-400 bg-slate-50/50'
                }`}>
                  <th className="py-3 px-4 font-medium">文件名称</th>
                  <th className="py-3 px-4 font-medium w-28">分类</th>
                  <th className="py-3 px-4 font-medium w-24">格式</th>
                  <th className="py-3 px-4 font-medium w-28">大小</th>
                  <th className="py-3 px-4 font-medium">本地路径</th>
                  <th className="py-3 px-4 font-medium text-right w-48">操作</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                isOledTheme ? 'divide-white/[0.04]' : 'divide-slate-100'
              }`}>
                {filteredFiles.map((file) => {
                  const typeConfig = getFileTypeConfig(file.fileType);
                  const IconComponent = typeConfig.icon;
                  const isOpening = openingId === file.id;

                  return (
                    <tr
                      key={file.id}
                      className={`transition-colors group cursor-pointer ${
                        isOledTheme ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80'
                      }`}
                      onClick={() => handleOpenFile(file)}
                    >
                      {/* Name & Icon */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            isOledTheme ? 'bg-[#111417] border-white/[0.08] text-[#00E5FF]' : typeConfig.iconBoxBg
                          }`}>
                            <IconComponent size={16} strokeWidth={2} />
                          </div>
                          <div className="min-w-0">
                            <div className={`font-bold transition-colors flex items-center gap-1.5 ${
                              isOledTheme ? 'text-[#F2F5F5] group-hover:text-[#00E5FF]' : 'text-[#1D1D1F] group-hover:text-[#0071E3]'
                            }`}>
                              <span className="truncate" title={file.name}>{file.name}</span>
                              {file.isPinned && (
                                <span title="置顶" className={`shrink-0 ${isOledTheme ? 'text-[#B7FF3C]' : 'text-amber-500'}`}>
                                  <Pin size={12} className={isOledTheme ? 'fill-[#B7FF3C]' : 'fill-amber-500'} />
                                </span>
                              )}
                            </div>
                            {file.notes && (
                              <div className={`text-[10px] truncate max-w-sm ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`}>
                                {file.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          isOledTheme ? 'bg-white/5 text-[#7D858A]' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {file.category || '未分类'}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isOledTheme ? 'bg-[#00E5FF] text-[#050607]' : `text-white ${typeConfig.badgeBg}`
                        }`}>
                          {typeConfig.label}
                        </span>
                      </td>

                      {/* Size */}
                      <td className={`py-3 px-4 font-mono text-[11px] ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-500'}`}>
                        {formatBytes(file.size)}
                      </td>

                      {/* Path */}
                      <td className={`py-3 px-4 font-mono text-[11px] max-w-xs truncate ${isOledTheme ? 'text-white/40' : 'text-slate-400'}`} title={file.filePath}>
                        {file.filePath}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenFile(file)}
                            disabled={isOpening}
                            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                              isOledTheme ? 'text-[#00E5FF] hover:bg-[#00E5FF]/10' : 'text-[#0071E3] hover:bg-blue-50'
                            }`}
                            title="打开"
                          >
                            {isOpening ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                            <span>打开</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDownloadFile(file, e)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isOledTheme ? 'text-white/40 hover:text-[#00E5FF] hover:bg-white/5' : 'text-slate-400 hover:text-[#0071E3] hover:bg-blue-50'
                            }`}
                            title="下载"
                          >
                            <Download size={13} strokeWidth={2} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleCopyPath(file, e)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isOledTheme ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                            title="复制路径"
                          >
                            {copiedId === file.id ? (
                              <Check size={13} className={isOledTheme ? 'text-[#B7FF3C]' : 'text-emerald-600'} />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFileToEdit(file);
                              setIsModalOpen(true);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isOledTheme ? 'text-white/40 hover:text-[#00E5FF] hover:bg-white/5' : 'text-slate-400 hover:text-[#0071E3] hover:bg-blue-50'
                            }`}
                            title="编辑"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteFile(file.id, file.name, e)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isOledTheme ? 'text-white/40 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title="删除"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

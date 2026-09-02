import React, { useState } from 'react';
import { 
  Feather, 
  Search, 
  Plus, 
  Calendar as CalendarIcon, 
  Bookmark, 
  Trash2, 
  Users, 
  Sparkles, 
  Target, 
  Filter
} from 'lucide-react';
import type { Note, NoteType } from '../../types';
import { AddNoteModal } from '../Common/AddNoteModal';

interface NotesViewProps {
  notes: Note[];
  onAddNote: (note: Partial<Note>) => Promise<void>;
  onUpdateNote?: (id: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onSelectDateForCalendar?: (date: string) => void;
}

const NOTE_TYPE_CONFIGS: Record<string, { label: string; icon: any; color: string; badge: string; border: string }> = {
  note: {
    label: '随手笔记',
    icon: Feather,
    color: 'text-blue-700',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    border: 'hover:border-blue-300',
  },
  meeting: {
    label: '会议纪要',
    icon: Users,
    color: 'text-amber-700',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    border: 'hover:border-amber-300',
  },
  idea: {
    label: '灵感想法',
    icon: Sparkles,
    color: 'text-purple-700',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    border: 'hover:border-purple-300',
  },
  retrospective: {
    label: '项目复盘',
    icon: Target,
    color: 'text-rose-700',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    border: 'hover:border-rose-300',
  },
};

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onSelectDateForCalendar,
}) => {
  const [activeType, setActiveType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<NoteType>('note');

  // Strip daily_report: NotesView purely manages quick notes, meetings, ideas & retros
  const pureNotes = notes.filter((n) => n.type !== 'daily_report');

  // Filter notes
  const filteredNotes = pureNotes.filter((n) => {
    if (activeType !== 'all' && n.type !== activeType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchContent = n.content.toLowerCase().includes(q);
      const matchTags = n.tags?.some((t) => t.toLowerCase().includes(q));
      const matchDate = n.date.includes(q);
      if (!matchTitle && !matchContent && !matchTags && !matchDate) return false;
    }
    return true;
  });

  const noteCount = pureNotes.filter((n) => n.type === 'note').length;
  const meetingCount = pureNotes.filter((n) => n.type === 'meeting').length;
  const ideaCount = pureNotes.filter((n) => n.type === 'idea').length;
  const retroCount = pureNotes.filter((n) => n.type === 'retrospective').length;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden select-none">
      {/* 1. Top Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Feather size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                快速记录
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                随手记录灵感思考、会议纪要与项目复盘，轻量快捷
              </p>
            </div>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200/80 text-slate-600 font-medium">
              总计 <strong className="text-slate-900">{pureNotes.length}</strong> 条
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-medium">
              笔记 <strong className="text-blue-800">{noteCount}</strong> 条
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-medium">
              会议 <strong className="text-amber-800">{meetingCount}</strong> 场
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setModalDefaultType('note');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-blue-600 text-white font-semibold text-xs shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus size={14} strokeWidth={2} />
            <span>新建记录</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-white">
        {/* Type Switcher Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeType === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            全部 ({pureNotes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveType('note')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeType === 'note'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100/70 border border-blue-200/60'
            }`}
          >
            <Feather size={13} />
            <span>随手笔记 ({noteCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('meeting')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeType === 'meeting'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100/70 border border-amber-200/60'
            }`}
          >
            <Users size={13} />
            <span>会议纪要 ({meetingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('idea')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeType === 'idea'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100/70 border border-purple-200/60'
            }`}
          >
            <Sparkles size={13} />
            <span>灵感想法 ({ideaCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('retrospective')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeType === 'retrospective'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100/70 border border-rose-200/60'
            }`}
          >
            <Target size={13} />
            <span>项目复盘 ({retroCount})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={14} />
          </div>
          <input
            type="text"
            placeholder="搜索记录内容、日期或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* 3. Cards Grid Area */}
      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
        {filteredNotes.length === 0 ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2">
            <Filter size={32} className="text-slate-300" />
            <p className="text-xs">暂无符合条件的记录</p>
            <button
              type="button"
              onClick={() => {
                setModalDefaultType('note');
                setIsModalOpen(true);
              }}
              className="mt-1 text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
            >
              立即新建一条记录
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const cfg = NOTE_TYPE_CONFIGS[note.type] || NOTE_TYPE_CONFIGS.note;
              const IconComp = cfg.icon;

              return (
                <div
                  key={note.id}
                  className={`p-4 rounded-2xl border border-slate-200/80 bg-white hover:shadow-md transition-all flex flex-col justify-between group ${cfg.border} ${
                    note.isPinned ? 'ring-1 ring-amber-300' : ''
                  }`}
                >
                  <div>
                    {/* Card Top: Type badge & Date/Actions */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badge}`}>
                          <IconComp size={11} />
                          <span>{cfg.label}</span>
                        </span>

                        {note.isPinned && (
                          <span className="p-0.5 text-amber-500" title="已置顶">
                            <Bookmark size={12} className="fill-amber-500" />
                          </span>
                        )}
                      </div>

                      {/* Top Right Action buttons */}
                      <div className="flex items-center gap-1">
                        {onUpdateNote && (
                          <button
                            type="button"
                            onClick={() => onUpdateNote(note.id, { isPinned: !note.isPinned })}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              note.isPinned
                                ? 'text-amber-500 hover:bg-amber-50'
                                : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                            }`}
                            title={note.isPinned ? '取消置顶' : '置顶'}
                          >
                            <Bookmark size={13} className={note.isPinned ? 'fill-amber-500' : ''} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onDeleteNote(note.id)}
                          className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    {note.title && (
                      <h4 className="text-sm font-bold text-slate-800 mb-1.5 leading-snug">
                        {note.title}
                      </h4>
                    )}

                    {/* Content */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon size={12} />
                      <span>{note.date} {note.time || ''}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {note.tags && note.tags.length > 0 && (
                        <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">
                          #{note.tags[0]}
                        </span>
                      )}
                      {onSelectDateForCalendar && (
                        <button
                          type="button"
                          onClick={() => onSelectDateForCalendar(note.date)}
                          className="ml-1 text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
                        >
                          日历查看 →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Note Modal (Restricted to pure note types) */}
      <AddNoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={onAddNote}
        initialType={modalDefaultType}
        allowedTypes={['note', 'meeting', 'idea', 'retrospective']}
      />
    </div>
  );
};

export default NotesView;

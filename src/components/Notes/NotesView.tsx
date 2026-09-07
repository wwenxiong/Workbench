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
  Filter,
  Edit3
} from 'lucide-react';
import type { Note, NoteType } from '../../types';
import { AddNoteModal } from '../Common/AddNoteModal';
import { useTheme } from '../../contexts/ThemeContext';

interface NotesViewProps {
  notes: Note[];
  onAddNote: (note: Partial<Note>) => Promise<void>;
  onUpdateNote?: (id: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onSelectDateForCalendar?: (date: string) => void;
}

const NOTE_TYPE_CONFIGS: Record<string, { label: string; icon: any; color: string; badge: string; border: string }> = {
  note: {
    label: '笔记',
    icon: Feather,
    color: 'text-blue-700',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    border: 'hover:border-blue-300',
  },
  meeting: {
    label: '会议',
    icon: Users,
    color: 'text-amber-700',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    border: 'hover:border-amber-300',
  },
  idea: {
    label: '灵感',
    icon: Sparkles,
    color: 'text-purple-700',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    border: 'hover:border-purple-300',
  },
  retrospective: {
    label: '复盘',
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
  const { isOledTheme } = useTheme();
  const [activeType, setActiveType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<NoteType>('note');

  // Pure notes
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
    <div className={`flex flex-col h-full ${
      isOledTheme ? 'bg-[#080A0C] border border-white/[0.08] text-[#F2F5F5]' : 'bg-white border border-slate-200/80 shadow-xs'
    } rounded-2xl overflow-hidden select-none`}>
      {/* 1. Top Header */}
      <div className={`p-5 border-b flex items-center justify-between flex-wrap gap-4 ${
        isOledTheme ? 'border-white/[0.08] bg-[#0C0F11]' : 'border-slate-100 bg-slate-50/50'
      }`}>
        <div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center rounded-2xl ${
              isOledTheme ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20' : 'bg-blue-600 text-white shadow-blue-500/25'
            }`}>
              <Feather size={20} />
            </div>
            <div>
              <h2 className={`text-base font-extrabold ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-slate-900'} tracking-tight`}>
                快速记录
              </h2>
            </div>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className={`px-2.5 py-1 rounded-xl ${
              isOledTheme ? 'bg-white/[0.04] border border-white/[0.08] text-[#AEB7BA] font-mono' : 'bg-white border border-slate-200/80 text-slate-600'
            } font-medium`}>
              共 <strong className={isOledTheme ? 'text-[#F2F5F5]' : 'text-slate-900'}>{pureNotes.length}</strong> 条
            </span>
            <span className={`px-2.5 py-1 rounded-xl ${
              isOledTheme ? 'bg-[#00E5FF]/10 border border-[#00E5FF]/25 text-[#00E5FF] font-mono' : 'bg-blue-50 border border-blue-200 text-blue-700'
            } font-medium`}>
              笔记 <strong>{noteCount}</strong>
            </span>
            <span className={`px-2.5 py-1 rounded-xl ${
              isOledTheme ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400 font-mono' : 'bg-amber-50 border border-amber-200 text-amber-700'
            } font-medium`}>
              会议 <strong>{meetingCount}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setModalDefaultType('note');
              setIsModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer ${
              isOledTheme
                ? 'bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050607] font-mono'
                : 'bg-[#0071E3] hover:bg-blue-600 text-white shadow-blue-500/20'
            }`}
          >
            <Plus size={14} strokeWidth={2} />
            <span>新建</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className={`px-5 py-3 border-b flex items-center justify-between flex-wrap gap-3 ${
        isOledTheme ? 'border-white/[0.08] bg-[#0C0F11]' : 'border-slate-100 bg-white'
      }`}>
        {/* Type Switcher Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveType('all')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeType === 'all'
                ? (isOledTheme ? 'bg-[#00E5FF] text-[#050607] font-mono font-bold shadow-xs' : 'bg-slate-900 text-white shadow-xs')
                : (isOledTheme ? 'bg-white/[0.04] text-[#7D858A] hover:text-[#F2F5F5]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80')
            }`}
          >
            全部 ({pureNotes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveType('note')}
            className={`flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeType === 'note'
                ? (isOledTheme ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 font-mono shadow-xs' : 'bg-blue-600 text-white shadow-xs')
                : (isOledTheme ? 'bg-white/[0.03] text-[#7D858A] hover:text-[#00E5FF]' : 'bg-blue-50 text-blue-700 hover:bg-blue-100/70 border border-blue-200/60')
            }`}
          >
            <Feather size={13} />
            <span>笔记 ({noteCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('meeting')}
            className={`flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeType === 'meeting'
                ? (isOledTheme ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono shadow-xs' : 'bg-amber-600 text-white shadow-xs')
                : (isOledTheme ? 'bg-white/[0.03] text-[#7D858A] hover:text-amber-400' : 'bg-amber-50 text-amber-700 hover:bg-amber-100/70 border border-amber-200/60')
            }`}
          >
            <Users size={13} />
            <span>会议 ({meetingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('idea')}
            className={`flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeType === 'idea'
                ? (isOledTheme ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono shadow-xs' : 'bg-purple-600 text-white shadow-xs')
                : (isOledTheme ? 'bg-white/[0.03] text-[#7D858A] hover:text-purple-400' : 'bg-purple-50 text-purple-700 hover:bg-purple-100/70 border border-purple-200/60')
            }`}
          >
            <Sparkles size={13} />
            <span>灵感 ({ideaCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('retrospective')}
            className={`flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeType === 'retrospective'
                ? (isOledTheme ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono shadow-xs' : 'bg-rose-600 text-white shadow-xs')
                : (isOledTheme ? 'bg-white/[0.03] text-[#7D858A] hover:text-rose-400' : 'bg-rose-50 text-rose-700 hover:bg-rose-100/70 border border-rose-200/60')
            }`}
          >
            <Target size={13} />
            <span>复盘 ({retroCount})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-64">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={14} />
          </div>
          <input
            type="text"
            placeholder="搜索笔记..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl focus:outline-none ${
              isOledTheme 
                ? 'bg-[#111417] border border-white/[0.08] text-[#F2F5F5] placeholder-[#52595E] focus:border-[#00E5FF]' 
                : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder-slate-400'
            }`}
          />
        </div>
      </div>

      {/* 3. Cards Grid Area */}
      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
        {filteredNotes.length === 0 ? (
          <div className={`py-20 text-center ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'} flex flex-col items-center gap-2`}>
            <Filter size={32} className={isOledTheme ? 'text-[#52595E]' : 'text-slate-300'} />
            <p className="text-xs">暂无记录</p>
            <button
              type="button"
              onClick={() => {
                setModalDefaultType('note');
                setIsModalOpen(true);
              }}
              className={`mt-1 text-xs font-semibold hover:underline cursor-pointer ${
                isOledTheme ? 'text-[#00E5FF]' : 'text-blue-600'
              }`}
            >
              新建记录
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
                  onClick={() => setEditingNote(note)}
                  className={`p-4 ${
                    isOledTheme 
                      ? 'bg-[#0C0F11] border border-white/[0.08] hover:border-[#00E5FF]/30 hover:shadow-[0_4px_20px_rgba(0,229,255,0.06)]' 
                      : `bg-white border border-slate-200/80 shadow-2xs hover:shadow-md ${cfg.border}`
                  } rounded-2xl transition-all flex flex-col justify-between group relative cursor-pointer`}
                >
                  <div>
                    {/* Card Top: Type Badge & Pin */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                          isOledTheme ? 'bg-white/[0.04] border-white/[0.08] text-[#AEB7BA]' : cfg.badge
                        }`}>
                          <IconComp size={11} />
                          <span>{cfg.label}</span>
                        </span>
                        {note.tags?.map((tg) => (
                          <span key={tg} className={`text-[10px] ${
                            isOledTheme ? 'text-[#7D858A] bg-white/[0.04]' : 'text-slate-400 bg-slate-100'
                          } px-1.5 py-0.2 rounded-md font-medium`}>
                            #{tg}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1">
                        {note.isPinned && (
                          <span title="置顶" className="text-amber-500">
                            <Bookmark size={13} className="fill-amber-500" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNote(note);
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1 ${
                            isOledTheme ? 'text-[#7D858A] hover:text-[#00E5FF] hover:bg-white/[0.05]' : 'text-slate-400 hover:text-[#0071E3] hover:bg-blue-50'
                          } rounded-lg transition-all cursor-pointer`}
                          title="放大查看与修改"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(note.id);
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1 ${
                            isOledTheme ? 'text-[#7D858A] hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'
                          } rounded-lg transition-all cursor-pointer`}
                          title="删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Title if any */}
                    {note.title && (
                      <h4 className={`text-xs font-bold ${
                        isOledTheme ? 'text-[#F2F5F5] group-hover:text-[#00E5FF]' : 'text-slate-800 group-hover:text-[#0071E3]'
                      } mb-1.5 line-clamp-1 transition-colors`}>
                        {note.title}
                      </h4>
                    )}

                    {/* Content */}
                    <p className={`text-xs ${
                      isOledTheme ? 'text-[#AEB7BA]' : 'text-slate-600'
                    } leading-relaxed whitespace-pre-wrap line-clamp-6 font-normal`}>
                      {note.content}
                    </p>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className={`pt-3 mt-3 border-t ${
                    isOledTheme ? 'border-white/[0.08] text-[#7D858A] font-mono' : 'border-slate-100 text-slate-400'
                  } flex items-center justify-between text-[10px]`}>
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon size={11} />
                      <span>{note.date} {note.time || ''}</span>
                    </div>

                    {onSelectDateForCalendar && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDateForCalendar(note.date);
                        }}
                        className={`${isOledTheme ? 'text-[#00E5FF]' : 'text-blue-600'} hover:underline font-medium cursor-pointer`}
                      >
                        查看日历 →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <AddNoteModal
        isOpen={isModalOpen || !!editingNote}
        noteToEdit={editingNote}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNote(null);
        }}
        onConfirm={async (data) => {
          if (editingNote && onUpdateNote) {
            await onUpdateNote(editingNote.id, data);
            setEditingNote(null);
          } else {
            await onAddNote(data);
            setIsModalOpen(false);
          }
        }}
        initialType={modalDefaultType}
        allowedTypes={['note', 'meeting', 'idea', 'retrospective']}
      />
    </div>
  );
};

export default NotesView;

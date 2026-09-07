import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  X, 
  Calendar, 
  Clock, 
  Check, 
  Trash2, 
  Plus, 
  AlertCircle, 
  CheckSquare,
  Users,
  Feather,
  Lightbulb,
  ChevronDown
} from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';
import { api } from '../../services/api';
import type { ParsedSmartItem, SmartItemCategory, Priority } from '../../types';
import { useToast } from './Toast';

interface SmartNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  onAddTasks?: (tasks: Array<{
    title: string;
    dueDate: string;
    startTime?: string | null;
    priority?: string;
    tags?: string[];
    estimatedMinutes?: number;
  }>) => Promise<void>;
  onAddNotes?: (notes: Array<{
    type: 'note' | 'meeting' | 'idea';
    title?: string;
    content: string;
    date: string;
    tags: string[];
    time?: string;
  }>) => Promise<void>;
  onAddSchedules?: (schedules: Array<{
    date: string;
    time?: string;
    content: string;
    tag?: string;
  }>) => Promise<void>;
  onOpenSettings?: () => void;
}

const CATEGORY_CONFIGS: Record<SmartItemCategory, {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  badgeClass: string;
  dotClass: string;
  ringClass: string;
  bgColor: string;
  color: string;
}> = {
  task: {
    label: '待办任务',
    icon: CheckSquare,
    badgeClass: 'bg-blue-50 text-[#1677FF] border-blue-200',
    dotClass: 'bg-[#1677FF]',
    ringClass: 'ring-blue-100 border-blue-200',
    bgColor: 'bg-blue-50',
    color: 'text-[#1677FF]',
  },
  schedule: {
    label: '日程安排',
    icon: Calendar,
    badgeClass: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    dotClass: 'bg-indigo-600',
    ringClass: 'ring-indigo-100 border-indigo-200',
    bgColor: 'bg-indigo-50',
    color: 'text-indigo-600',
  },
  note: {
    label: '笔记',
    icon: Feather,
    badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    dotClass: 'bg-emerald-600',
    ringClass: 'ring-emerald-100 border-emerald-200',
    bgColor: 'bg-emerald-50',
    color: 'text-emerald-600',
  },
  meeting: {
    label: '会议',
    icon: Users,
    badgeClass: 'bg-amber-50 text-amber-600 border-amber-200',
    dotClass: 'bg-amber-600',
    ringClass: 'ring-amber-100 border-amber-200',
    bgColor: 'bg-amber-50',
    color: 'text-amber-600',
  },
  idea: {
    label: '灵感',
    icon: Lightbulb,
    badgeClass: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
    dotClass: 'bg-fuchsia-600',
    ringClass: 'ring-fuchsia-100 border-fuchsia-200',
    bgColor: 'bg-fuchsia-50',
    color: 'text-fuchsia-600',
  },
};

const QUICK_EXAMPLES = [
  '明天下午3点在2号会议室跟产品部开需求评审会，讨论AI语义识别优化；记得整理会议要点并发布；周五前提交测试报告',
  '突然想到一个灵感：给快捷记录加一个悬浮灵感球；查阅资料：React 19 Server Components使用心得；下周一上午9点半客户来访'
];

export const SmartNoteModal: React.FC<SmartNoteModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
  onAddTasks,
  onAddNotes,
  onAddSchedules,
  onOpenSettings,
}) => {
  const { showToast } = useToast();
  const [inputText, setInputText] = useState(initialText);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedSmartItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ruleFallbackTip, setRuleFallbackTip] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | SmartItemCategory>('all');

  // Sync initialText when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputText(initialText);
      setParsedItems([]);
      setErrorMsg(null);
      setRuleFallbackTip(null);
      setActiveCategoryFilter('all');

      if (initialText.trim()) {
        triggerParse(initialText.trim());
      }
    }
  }, [isOpen, initialText]);

  // Trigger AI Parse
  const triggerParse = async (textToParse?: string) => {
    const text = (textToParse !== undefined ? textToParse : inputText).trim();
    if (!text) {
      setErrorMsg('请输入杂乱的文字内容（如聊天记录、会议备忘、想法灵感或待办列表）');
      return;
    }

    try {
      setIsParsing(true);
      setErrorMsg(null);
      setRuleFallbackTip(null);

      const res = await api.parseTaskWithAi(text);
      let items: ParsedSmartItem[] = [];

      if (res.items && Array.isArray(res.items) && res.items.length > 0) {
        items = res.items;
      } else if (res.tasks && Array.isArray(res.tasks)) {
        items = res.tasks.map((t, idx) => ({
          id: t.id || `task_${idx}`,
          category: (t.category as SmartItemCategory) || 'task',
          title: t.title,
          content: t.note || t.title,
          date: t.dueDate,
          time: t.startTime,
          priority: t.priority,
          tags: t.tags || [],
          estimatedMinutes: t.estimatedMinutes || 30,
        }));
      }

      setParsedItems(items);

      // Select all by default
      const defaultSelected: Record<string, boolean> = {};
      items.forEach((it) => {
        defaultSelected[it.id] = true;
      });
      setSelectedIds(defaultSelected);

      if (items.length === 0) {
        setErrorMsg('未能从文本中提炼出有效条目，请尝试更清晰地输入内容');
      }

      const anyData = res as any;
      if (anyData.isRuleFallback || anyData.noAiConfig) {
        setRuleFallbackTip(anyData.message || '已采用本地语义规则为您智能分类。');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '解析失败，请检查网络或设置');
    } finally {
      setIsParsing(false);
    }
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Update field of an item
  const handleUpdateItemField = (id: string, field: keyof ParsedSmartItem, value: any) => {
    setParsedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  // Switch item category
  const handleSwitchCategory = (id: string, newCategory: SmartItemCategory) => {
    setParsedItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const currentTags = it.tags.filter(
          (t) => !['待办', '日程', '笔记', '会议', '灵感'].includes(t)
        );
        const tagForNewCat = CATEGORY_CONFIGS[newCategory].label;
        return {
          ...it,
          category: newCategory,
          tags: [tagForNewCat, ...currentTags],
        };
      })
    );
  };

  // Delete an item
  const handleDeleteItem = (id: string) => {
    setParsedItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Add an empty manual item to the list
  const handleAddManualItem = (category: SmartItemCategory = 'task') => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const newItem: ParsedSmartItem = {
      id: `manual_${Date.now()}`,
      category,
      title: '',
      content: '',
      date: todayStr,
      time: category === 'schedule' ? '全天' : null,
      priority: 'p3',
      tags: [CATEGORY_CONFIGS[category].label],
      estimatedMinutes: 30,
    };
    setParsedItems((prev) => [...prev, newItem]);
    setSelectedIds((prev) => ({ ...prev, [newItem.id]: true }));
  };

  // Submit selected items according to their respective categories
  const handleConfirmAdd = async () => {
    const selectedItems = parsedItems.filter((it) => selectedIds[it.id] && it.title.trim());
    if (selectedItems.length === 0) {
      showToast('请至少勾选一项有效条目', { type: 'info' });
      return;
    }

    try {
      setIsSubmitting(true);
      const tasksToCreate = selectedItems.filter((i) => i.category === 'task');
      const schedulesToCreate = selectedItems.filter((i) => i.category === 'schedule');
      const notesToCreate = selectedItems.filter((i) => ['note', 'meeting', 'idea'].includes(i.category));

      // 1. Create Tasks
      if (tasksToCreate.length > 0 && onAddTasks) {
        await onAddTasks(
          tasksToCreate.map((t) => ({
            title: t.title.trim(),
            dueDate: t.date,
            startTime: t.time,
            priority: t.priority,
            tags: t.tags,
            estimatedMinutes: t.estimatedMinutes,
          }))
        );
      }

      // 2. Create Schedules
      if (schedulesToCreate.length > 0 && onAddSchedules) {
        await onAddSchedules(
          schedulesToCreate.map((s) => ({
            date: s.date,
            time: s.time || '全天',
            content: s.title.trim(),
            tag: s.tags?.[0] || '日程',
          }))
        );
      }

      // 3. Create Notes / Meetings / Ideas
      if (notesToCreate.length > 0 && onAddNotes) {
        await onAddNotes(
          notesToCreate.map((n) => ({
            type: n.category as 'note' | 'meeting' | 'idea',
            title: n.title.trim(),
            content: n.content ? `${n.title}\n${n.content}` : n.title.trim(),
            date: n.date,
            time: n.time || undefined,
            tags: n.tags,
          }))
        );
      }

      // Generate success breakdown toast
      const summaryParts: string[] = [];
      if (tasksToCreate.length > 0) summaryParts.push(`${tasksToCreate.length} 项待办`);
      if (schedulesToCreate.length > 0) summaryParts.push(`${schedulesToCreate.length} 项日程`);
      const meetingCount = notesToCreate.filter((n) => n.category === 'meeting').length;
      const ideaCount = notesToCreate.filter((n) => n.category === 'idea').length;
      const noteCount = notesToCreate.filter((n) => n.category === 'note').length;
      if (meetingCount > 0) summaryParts.push(`${meetingCount} 篇会议`);
      if (ideaCount > 0) summaryParts.push(`${ideaCount} 条灵感`);
      if (noteCount > 0) summaryParts.push(`${noteCount} 篇笔记`);

      showToast(`已成功识别创建：${summaryParts.join('、')}`, { type: 'success' });
      onClose();
    } catch (err: any) {
      showToast(err.message || '创建条目失败', { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (activeCategoryFilter === 'all') return parsedItems;
    return parsedItems.filter((it) => it.category === activeCategoryFilter);
  }, [parsedItems, activeCategoryFilter]);

  const selectedCount = parsedItems.filter((t) => selectedIds[t.id] && t.title.trim()).length;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: parsedItems.length,
      task: 0,
      schedule: 0,
      note: 0,
      meeting: 0,
      idea: 0,
    };
    parsedItems.forEach((it) => {
      if (counts[it.category] !== undefined) {
        counts[it.category]++;
      }
    });
    return counts;
  }, [parsedItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xl animate-fade-in select-none">
      <div 
        className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[32px] shadow-2xl p-6 sm:p-7 flex flex-col max-h-[90vh] overflow-hidden"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071E3] via-[#42A5F5] to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Sparkles size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2">
                <span>AI 智能速记</span>
              </h2>
              <p className="text-xs text-[#86868B] mt-0.5">
                支持智能识别为 待办任务、日程安排、快速记录（笔记 / 会议 / 灵感）
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 custom-scrollbar">
          {/* Input Textarea Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wider">
                原始文字内容
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#86868B]">填入示例:</span>
                {QUICK_EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInputText(ex);
                      triggerParse(ex);
                    }}
                    className="text-[10px] text-[#0071E3] hover:underline bg-blue-50 px-2 py-0.5 rounded-md cursor-pointer"
                  >
                    示例 {i + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    if (!isParsing && inputText.trim()) {
                      triggerParse(inputText);
                    }
                  }
                }}
                placeholder="在此粘贴聊天记录、会议纪要、临时想法、日程或待办... 例如：明天下午3点在A会议室开产品评审会，讨论AI速记；灵感：做个悬浮录音球；周五前提交周报"
                rows={parsedItems.length > 0 ? 3 : 5}
                className="w-full px-4 py-3 text-xs rounded-2xl bg-slate-100/80 border border-slate-200/80 focus:bg-white focus:border-[#0071E3] focus:ring-3 focus:ring-[#0071E3]/15 transition-all outline-none text-[#1D1D1F] placeholder:text-slate-400 resize-none font-medium leading-relaxed"
              />
              <button
                type="button"
                onClick={() => triggerParse()}
                disabled={isParsing || !inputText.trim()}
                className="absolute right-3 bottom-3 px-3.5 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isParsing ? (
                  <>
                    <ThinkingOrb state="searching" size={20} theme="dark" />
                    <span>AI 分析中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>AI 识别解析</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Rule Fallback Banner */}
          {ruleFallbackTip && (
            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/70 text-xs text-blue-800 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#0071E3] flex-shrink-0" />
                <span className="text-[11px] leading-relaxed">{ruleFallbackTip}</span>
              </div>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-blue-200 text-[#0071E3] rounded-lg hover:bg-blue-100/50 transition-colors flex-shrink-0 cursor-pointer"
                >
                  配置 AI 模型
                </button>
              )}
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs text-rose-600 flex items-center gap-2 animate-fade-in">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Loading Animation Shimmer with ThinkingOrb */}
          {isParsing && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
              <div className="p-2 rounded-3xl bg-blue-50/80 border border-blue-100 shadow-xs flex items-center justify-center">
                <ThinkingOrb state="searching" size={64} theme="light" />
              </div>
              <div className="text-xs font-bold text-[#1D1D1F]">
                正在进行多维自然语言理解 (NLU) 分类识别...
              </div>
              <p className="text-[11px] text-[#86868B] max-w-xs">
                正在智能推导相对时间、提取关键主题并分别归类为待办、日程、笔记、会议或灵感
              </p>
            </div>
          )}

          {/* Parsed Results List */}
          {!isParsing && parsedItems.length > 0 && (
            <div className="space-y-3 animate-fade-in">
              {/* Category Filter Tabs & Add Button */}
              <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeCategoryFilter === 'all'
                        ? 'bg-white text-slate-800 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    全部 ({categoryCounts.all})
                  </button>
                  {(['task', 'schedule', 'note', 'meeting', 'idea'] as SmartItemCategory[]).map((cat) => {
                    const cfg = CATEGORY_CONFIGS[cat];
                    const count = categoryCounts[cat] || 0;
                    if (count === 0 && activeCategoryFilter !== cat) return null;
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                          activeCategoryFilter === cat
                            ? 'bg-white text-slate-800 font-semibold shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Icon size={12} />
                        <span>{cfg.label}</span>
                        <span className="text-[10px] opacity-75 font-mono">({count})</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddManualItem('task')}
                    className="text-xs font-semibold text-[#0071E3] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>手动补充</span>
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                {filteredItems.map((item) => {
                  const isChecked = !!selectedIds[item.id];
                  const cfg = CATEGORY_CONFIGS[item.category] || CATEGORY_CONFIGS.task;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 select-none ${
                        isChecked
                          ? `bg-white ${cfg.ringClass} shadow-sm ring-1`
                          : 'bg-slate-50/70 border-slate-200/70 opacity-65'
                      }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelect(item.id)}
                        className="w-4 h-4 mt-1 rounded border-slate-300 text-[#0071E3] focus:ring-[#0071E3] cursor-pointer accent-[#0071E3]"
                      />

                      {/* Main Content Area */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Header: Category Badge Switcher + Title */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Category Switcher Dropdown */}
                          <div className="relative group/cat">
                            <select
                              value={item.category}
                              onChange={(e) =>
                                handleSwitchCategory(item.id, e.target.value as SmartItemCategory)
                              }
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border outline-none cursor-pointer appearance-none pr-5 transition-colors ${cfg.badgeClass}`}
                            >
                              <option value="task">待办任务</option>
                              <option value="schedule">日程安排</option>
                              <option value="note">笔记记录</option>
                              <option value="meeting">会议纪要</option>
                              <option value="idea">灵感想法</option>
                            </select>
                            <ChevronDown
                              size={10}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
                            />
                          </div>

                          {/* Editable Title */}
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateItemField(item.id, 'title', e.target.value)}
                            placeholder={
                              item.category === 'meeting'
                                ? '会议主题...'
                                : item.category === 'idea'
                                ? '灵感概要...'
                                : item.category === 'note'
                                ? '笔记标题...'
                                : item.category === 'schedule'
                                ? '日程事项...'
                                : '任务名称...'
                            }
                            className="flex-1 min-w-[140px] text-xs font-bold text-[#1D1D1F] bg-transparent border-b border-transparent focus:border-blue-400 outline-none pb-0.5 transition-colors"
                          />
                        </div>

                        {/* Detail / Content for Notes, Meetings, Ideas, or Optional Task Note */}
                        {(['note', 'meeting', 'idea'].includes(item.category) || item.content) && (
                          <div className="pt-0.5">
                            <textarea
                              rows={['note', 'meeting', 'idea'].includes(item.category) ? 2 : 1}
                              value={item.content || ''}
                              onChange={(e) =>
                                handleUpdateItemField(item.id, 'content', e.target.value)
                              }
                              placeholder={
                                item.category === 'meeting'
                                  ? '记录会议要点、结论与参会人员...'
                                  : item.category === 'idea'
                                  ? '记录具体想法细节、应用场景或设计构思...'
                                  : item.category === 'note'
                                  ? '记录详细知识点、备忘资料或随笔正文...'
                                  : '补充任务备注信息 (可选)...'
                              }
                              className="w-full text-[11px] text-slate-600 bg-slate-50/80 rounded-xl px-2.5 py-1.5 border border-slate-200/60 focus:bg-white focus:border-blue-400 outline-none resize-none font-medium leading-relaxed"
                            />
                          </div>
                        )}

                        {/* Controls: Date, Time, Priority, Tags */}
                        <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                          {/* Date */}
                          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200/80">
                            <Calendar size={12} className="text-[#86868B]" />
                            <input
                              type="date"
                              value={item.date}
                              onChange={(e) => handleUpdateItemField(item.id, 'date', e.target.value)}
                              className="text-[11px] font-mono bg-transparent outline-none cursor-pointer text-[#1D1D1F]"
                            />
                          </div>

                          {/* Time (for task & schedule) */}
                          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200/80">
                            <Clock size={12} className="text-[#86868B]" />
                            <input
                              type="text"
                              value={item.time || ''}
                              onChange={(e) =>
                                handleUpdateItemField(item.id, 'time', e.target.value || null)
                              }
                              placeholder={item.category === 'schedule' ? '全天或 14:00' : '开始时间'}
                              className="text-[11px] font-mono bg-transparent outline-none cursor-pointer text-[#1D1D1F] w-20"
                            />
                          </div>

                          {/* Priority Pill (shown for task) */}
                          {item.category === 'task' && (
                            <select
                              value={item.priority || 'p3'}
                              onChange={(e) =>
                                handleUpdateItemField(item.id, 'priority', e.target.value as Priority)
                              }
                              className={`text-[11px] font-semibold px-2 py-1 rounded-xl border outline-none cursor-pointer ${
                                item.priority === 'p1'
                                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                                  : item.priority === 'p2'
                                  ? 'bg-orange-50 text-orange-600 border-orange-200'
                                  : item.priority === 'p3'
                                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              <option value="p1">P1 紧急</option>
                              <option value="p2">P2 重要</option>
                              <option value="p3">P3 普通</option>
                              <option value="p4">P4 低</option>
                            </select>
                          )}

                          {/* Tags */}
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              {item.tags.map((tag, tagIdx) => (
                                <span
                                  key={tagIdx}
                                  className="text-[10px] font-medium bg-slate-100 border border-slate-200/60 text-[#6E6E73] px-2 py-0.5 rounded-lg flex items-center gap-0.5"
                                >
                                  <span>#{tag}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="移除该项"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-[#86868B]">
            {parsedItems.length > 0 ? (
              <span>
                已选 <strong className="text-[#0071E3]">{selectedCount}</strong> / {parsedItems.length} 项
              </span>
            ) : (
              <span>智能识别速记并归类保存</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#48484A] hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmAdd}
              disabled={isSubmitting || selectedCount === 0}
              className="px-5 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>{isSubmitting ? '正在归类创建...' : `一键归类创建 (${selectedCount})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartNoteModal;

import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  ArrowUp,
  ArrowDown,
  Repeat,
  Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Task, Priority } from '../../types';
import { soundEngine } from '../../utils/audio';
import { useToast } from '../Common/Toast';
import { AddTodoModal } from '../Common/AddTodoModal';
import { CompleteTaskModal } from './CompleteTaskModal';

interface TodoListProps {
  tasks: Task[];
  onAddTask: (task: Partial<Task>) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onReorderTasks: (taskIds: string[]) => Promise<void>;
  onStartFocusOnTask?: (taskId: string) => void;
  selectedDate: string;
}

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; desc: string; color: string; bg: string; badge: string; border: string }
> = {
  p1: {
    label: '重要且紧急',
    desc: '第一象限 · 立即攻坚',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    border: 'border-rose-200',
  },
  p2: {
    label: '重要不紧急',
    desc: '第二象限 · 深度规划',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    border: 'border-amber-200',
  },
  p3: {
    label: '紧急不重要',
    desc: '第三象限 · 快速交付',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    border: 'border-blue-200',
  },
  p4: {
    label: '不重要不紧急',
    desc: '第四象限 · 减少消耗',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    border: 'border-slate-200',
  },
};

export const TodoList: React.FC<TodoListProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onStartFocusOnTask: _onStartFocusOnTask,
  selectedDate,
}) => {
  const { showToast } = useToast();

  // View & Filter States
  const [viewMode, setViewMode] = useState<'list' | 'quadrant'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  // Trigger completion effects or duration modal
  const handleToggleComplete = async (task: Task) => {
    if (!task.completed) {
      setCompletingTask(task);
    } else {
      await onUpdateTask(task.id, {
        completed: false,
        completedAt: null,
        timeSpan: null,
      });
      showToast('已重新开启待办', { type: 'info' });
    }
  };

  // Confirm task completion with recorded duration & timeSpan
  const handleConfirmCompleteWithDuration = async (
    taskId: string,
    data: { completed: boolean; actualMinutes: number; timeSpan: string; startTime?: string; endTime?: string }
  ) => {
    soundEngine.playTaskDone();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'],
    });

    await onUpdateTask(taskId, {
      completed: true,
      completedAt: new Date().toISOString(),
      actualMinutes: data.actualMinutes,
      timeSpan: data.timeSpan,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    showToast('任务已完成！', {
      type: 'success',
      message: data.timeSpan ? `耗时：${data.timeSpan}，${data.actualMinutes}分钟 已自动记入日报` : '已完成',
    });
  };

  // Submit task from unified modal (handles both create and edit)
  const handleSaveTaskFromModal = async (taskData: {
    title: string;
    dueDate: string;
    tags?: string[];
    priority?: string;
    isRecurring?: boolean;
    recurringConfig?: any;
    id?: string;
  }) => {
    if (taskData.id) {
      await onUpdateTask(taskData.id, {
        title: taskData.title,
        dueDate: taskData.dueDate,
        tags: taskData.tags,
        priority: (taskData.priority as Priority) || 'p2',
        isRecurring: taskData.isRecurring,
        recurringConfig: taskData.recurringConfig,
      });
      showToast('待办事项已修改', { type: 'success' });
    } else {
      await onAddTask({
        title: taskData.title,
        priority: (taskData.priority as Priority) || 'p2',
        estimatedMinutes: 25,
        tags: taskData.tags || ['工作'],
        dueDate: taskData.dueDate || selectedDate,
        isRecurring: taskData.isRecurring,
        recurringConfig: taskData.recurringConfig,
      });
      showToast(taskData.isRecurring ? '每日固定循环待办已开启' : '新待办已创建', { type: 'success' });
    }
    setTaskToEdit(null);
  };

  // Move task up/down
  const handleMoveOrder = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= tasks.length) return;

    const reordered = [...tasks];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    await onReorderTasks(reordered.map((t) => t.id));
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'active' && t.completed) return false;
    if (statusFilter === 'completed' && !t.completed) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Render quadrant card
  const renderQuadrantCard = (priorityKey: Priority) => {
    const cfg = PRIORITY_CONFIG[priorityKey];
    const quadrantTasks = tasks.filter((t) => t.priority === priorityKey);

    return (
      <div className={`flex flex-col h-full rounded-xl border ${cfg.border} ${cfg.bg} p-4 transition-all shadow-xs`}>
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/60">
          <div>
            <h3 className={`font-bold text-sm ${cfg.color}`}>{cfg.label}</h3>
            <p className="text-[10px] text-slate-500 font-medium">{cfg.desc}</p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-600">
            {quadrantTasks.length} 项
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-1 custom-scrollbar">
          {quadrantTasks.map((task) => (
            <div
              key={task.id}
              className={`p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2 group hover:border-slate-300 transition-all ${
                task.completed ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleComplete(task);
                  }}
                  className="text-slate-400 hover:text-blue-600 shrink-0 cursor-pointer"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-600 text-white" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 hover:text-blue-500" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <span
                    className={`block text-xs truncate ${
                      task.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                    }`}
                  >
                    {task.title}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>
                        {task.actualMinutes}/{task.estimatedMinutes}m
                      </span>
                    </span>

                    {task.tags &&
                      task.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                          #{tag}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTaskToEdit(task);
                    setIsModalOpen(true);
                  }}
                  title="修改任务"
                  className="p-1 text-slate-400 hover:text-[#0071E3] transition-colors cursor-pointer shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteTask(task.id);
                  }}
                  title="删除任务"
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {quadrantTasks.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-6">
              暂无此象限事项
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden select-none">
      {/* 1. Header Toolbar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              待办事项清单
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
              {completedCount}/{totalCount} 已完成 ({progressPercent}%)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-48 h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action & View Toggles */}
        <div className="flex items-center gap-2">
          {/* List vs Quadrant toggle */}
          <div className="flex p-0.5 bg-slate-200/70 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>清单</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('quadrant')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'quadrant'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>四象限</span>
            </button>
          </div>

          {/* Add Task Button (Consistent with Dashboard) */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加待办</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar (List view only) */}
      {viewMode === 'list' && (
        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-100'
              }`}
            >
              全部 ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'active' ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-100'
              }`}
            >
              进行中 ({totalCount - completedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'completed' ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-100'
              }`}
            >
              已完成 ({completedCount})
            </button>
          </div>

          {/* Priority Filters */}
          <div className="flex items-center gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-600 cursor-pointer"
            >
              <option value="all">所有优先级</option>
              <option value="p1">P1 重要且紧急</option>
              <option value="p2">P2 重要不紧急</option>
              <option value="p3">P3 紧急不重要</option>
              <option value="p4">P4 不重要不紧急</option>
            </select>
          </div>
        </div>
      )}

      {/* 3. Main Display Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {viewMode === 'quadrant' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {renderQuadrantCard('p1')}
            {renderQuadrantCard('p2')}
            {renderQuadrantCard('p3')}
            {renderQuadrantCard('p4')}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task, idx) => {
              const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.p2;

              return (
                <div
                  key={task.id}
                  className={`group flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs transition-all ${
                    task.completed ? 'bg-slate-50/50' : ''
                  }`}
                >
                  {/* Left: Checkbox & Info */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleComplete(task);
                        }}
                        className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-600 text-white" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 hover:text-blue-500" />
                        )}
                      </button>

                      <span
                        className={`text-sm font-medium leading-normal ${
                          task.completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </span>

                      {task.isRecurring && (
                        <span 
                          title="每日固定循环任务"
                          className="inline-flex items-center gap-0.5 text-[10px] text-[#0071E3] bg-blue-50/90 border border-blue-200/70 px-1.5 py-0.2 rounded-md font-semibold"
                        >
                          <Repeat size={10} strokeWidth={2} />
                          <span>每日循环</span>
                        </span>
                      )}

                      {/* Priority pill */}
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${pCfg.badge}`}>
                        {pCfg.label}
                      </span>

                      {/* Tags */}
                      {task.tags &&
                        task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 ml-7">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>预估: {task.estimatedMinutes}m</span>
                        <span className="text-slate-300">|</span>
                        <span className={task.actualMinutes > 0 ? 'text-indigo-600 font-semibold' : ''}>
                          实际耗时: {task.actualMinutes}m
                        </span>
                      </span>

                      {task.timeSpan && (
                        <span className="text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                          时段: {task.timeSpan}
                        </span>
                      )}

                      {task.dueDate && (
                        <span className="text-slate-500 font-medium">
                          排期: {task.dueDate.replace('T', ' ')}
                        </span>
                      )}

                      {task.completedAt && (
                        <span className="text-emerald-600 font-medium">
                          完成于 {new Date(task.completedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTaskToEdit(task);
                        setIsModalOpen(true);
                      }}
                      title="修改任务"
                      className="p-1 text-slate-400 hover:text-[#0071E3] transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMoveOrder(idx, 'up');
                      }}
                      disabled={idx === 0}
                      title="上移"
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMoveOrder(idx, 'down');
                      }}
                      disabled={idx === filteredTasks.length - 1}
                      title="下移"
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteTask(task.id);
                      }}
                      title="删除任务"
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Bottom Add Todo Link (Consistent with Homepage Card) */}
            <div className="pt-3 border-t border-slate-100/80 mt-2">
              <button
                type="button"
                onClick={() => {
                  setTaskToEdit(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors cursor-pointer py-1"
              >
                <Plus size={14} />
                <span>添加待办</span>
              </button>
            </div>

            {filteredTasks.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                <p>暂无符合条件的待办事项</p>
                <button
                  type="button"
                  onClick={() => {
                    setTaskToEdit(null);
                    setIsModalOpen(true);
                  }}
                  className="mt-2 text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  点击添加一条待办
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unified Add/Edit Todo Modal */}
      <AddTodoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        onConfirm={handleSaveTaskFromModal}
        initialDate={selectedDate}
      />

      {/* Complete Task Duration Modal */}
      <CompleteTaskModal
        isOpen={!!completingTask}
        task={completingTask}
        onClose={() => setCompletingTask(null)}
        onConfirm={handleConfirmCompleteWithDuration}
      />
    </section>
  );
};

export default TodoList;

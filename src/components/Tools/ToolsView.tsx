import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Search,
  LayoutGrid,
  List as ListIcon,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Info,
  ChevronLeft,
  ArrowRight,
  Languages,
  Calculator,
  Copy,
  Check,
  ArrowRightLeft
} from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';
import { useTimer } from '../../contexts/TimerContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatChineseDate, formatLocalDate } from '../../utils/date';

export type ToolCategory = '全部' | '计时效率' | '办公辅助';

export interface ToolItem {
  id: string;
  name: string;
  category: ToolCategory;
  tag: string;
  description: string;
  icon: any;
  badgeBg: string;
  iconBoxBg: string;
  accentColor: string;
  cardBg: string;
}

export const TOOL_ITEMS: ToolItem[] = [
  {
    id: 'countdown',
    name: '时钟与倒计时',
    category: '计时效率',
    tag: '核心',
    description: '快捷倒计时与全屏时钟看板',
    icon: Clock,
    badgeBg: 'bg-[#1677FF]',
    iconBoxBg: 'bg-blue-50 text-[#1677FF]',
    accentColor: 'text-[#1677FF]',
    cardBg: 'hover:border-blue-300',
  },
  {
    id: 'translate',
    name: '翻译',
    category: '办公辅助',
    tag: '实用',
    description: '中英多语言快速翻译与词句解析',
    icon: Languages,
    badgeBg: 'bg-sky-500',
    iconBoxBg: 'bg-sky-50 text-sky-600',
    accentColor: 'text-sky-600',
    cardBg: 'hover:border-sky-300',
  },
  {
    id: 'calculator',
    name: '计算器',
    category: '办公辅助',
    tag: '工具',
    description: '快捷数学计算与财务统计汇总',
    icon: Calculator,
    badgeBg: 'bg-emerald-500',
    iconBoxBg: 'bg-emerald-50 text-emerald-600',
    accentColor: 'text-emerald-600',
    cardBg: 'hover:border-emerald-300',
  },
];

export const CATEGORIES: ToolCategory[] = [
  '全部',
  '计时效率',
  '办公辅助',
];

export const ToolsView: React.FC = () => {
  const { isOledTheme } = useTheme();

  // Navigation: activeToolId determines if we are in list view or inside the clock tool
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  // View presentation state (grid vs list)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('全部');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    totalSeconds,
    remainingSeconds,
    isRunning,
    isPaused,
    soundEnabled,
    setSoundEnabled,
    startCountdown,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setCustomTime,
    addSeconds,
  } = useTimer();

  // Current real-time clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Custom countdown inputs
  const [customMinutes, setCustomMinutes] = useState('10');
  const [customSeconds, setCustomSeconds] = useState('0');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Digital clock strings
  const hoursStr = String(currentTime.getHours()).padStart(2, '0');
  const minutesStr = String(currentTime.getMinutes()).padStart(2, '0');
  const secondsStr = String(currentTime.getSeconds()).padStart(2, '0');

  // Countdown calculations
  const countMinutes = Math.floor(remainingSeconds / 60);
  const countSeconds = remainingSeconds % 60;
  const countFormatted = `${String(countMinutes).padStart(2, '0')}:${String(countSeconds).padStart(2, '0')}`;
  const strokeDashoffset = 565.48 - (565.48 * (totalSeconds - remainingSeconds)) / (totalSeconds || 1);

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const m = Math.max(0, parseInt(customMinutes, 10) || 0);
    const s = Math.max(0, Math.min(59, parseInt(customSeconds, 10) || 0));
    if (m === 0 && s === 0) return;
    setCustomTime(m, s);
  };

  // Filter tools
  const filteredTools = useMemo(() => {
    return TOOL_ITEMS.filter((tool) => {
      const matchCat = selectedCategory === '全部' || tool.category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.tag.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  // ToolsView Translate State
  const [transInput, setTransInput] = useState('');
  const [transOutput, setTransOutput] = useState('');
  const [transLang, setTransLang] = useState<'zh-en' | 'en-zh'>('zh-en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copiedTrans, setCopiedTrans] = useState(false);

  const handleRunTranslate = async () => {
    const text = transInput.trim();
    if (!text) {
      setTransOutput('');
      return;
    }
    setIsTranslating(true);
    try {
      const pair = transLang === 'zh-en' ? 'zh|en' : 'en|zh';
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`);
      if (res.ok) {
        const data = await res.json();
        if (data.responseData && data.responseData.translatedText) {
          setTransOutput(data.responseData.translatedText);
          setIsTranslating(false);
          return;
        }
      }
      throw new Error('fallback');
    } catch {
      if (transLang === 'zh-en') {
        setTransOutput(`[翻译结果]: ${text}`);
      } else {
        setTransOutput(`[中文释义]: ${text}`);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyTrans = () => {
    if (!transOutput) return;
    navigator.clipboard.writeText(transOutput);
    setCopiedTrans(true);
    setTimeout(() => setCopiedTrans(false), 2000);
  };

  // ToolsView Calculator State
  const [calcExpr, setCalcExpr] = useState('');
  const [calcRes, setCalcRes] = useState('');
  const [copiedCalc, setCopiedCalc] = useState(false);

  const handleCalcPress = (val: string) => {
    if (val === 'C') {
      setCalcExpr('');
      setCalcRes('');
    } else if (val === 'DEL') {
      setCalcExpr((prev) => prev.slice(0, -1));
    } else if (val === '=') {
      if (!calcExpr) return;
      try {
        const sanitized = calcExpr.replace(/×/g, '*').replace(/÷/g, '/');
        if (/^[0-9+\-*/(). %]+$/.test(sanitized)) {
          // eslint-disable-next-line no-new-func
          const res = Function(`'use strict'; return (${sanitized})`)();
          setCalcRes(String(Number.isFinite(res) ? Math.round(res * 100000000) / 100000000 : 'Error'));
        } else {
          setCalcRes('Error');
        }
      } catch {
        setCalcRes('Error');
      }
    } else {
      setCalcExpr((prev) => prev + val);
    }
  };

  const handleCopyCalc = () => {
    const val = calcRes || calcExpr;
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedCalc(true);
    setTimeout(() => setCopiedCalc(false), 2000);
  };

  // ==================== SUB-VIEW: 时钟与倒计时 WORKSPACE ====================
  if (activeToolId === 'countdown') {
    return (
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12 animate-fadeIn select-none text-left">
        {/* Top Breadcrumb Navigation */}
        <div className={`flex items-center justify-between p-4 rounded-3xl shadow-xs backdrop-blur-xl border ${
          isOledTheme ? 'bg-[#0C0F11]/90 border-white/10' : 'bg-white/80 border-white/80'
        }`}>
          <button
            type="button"
            onClick={() => setActiveToolId(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs border ${
              isOledTheme
                ? 'bg-[#111417] text-[#7D858A] border-white/10 hover:text-[#00E5FF] hover:border-[#00E5FF]/40'
                : 'bg-white text-slate-600 border-slate-200/60 hover:text-[#0071E3] hover:bg-slate-100'
            }`}
          >
            <ChevronLeft size={16} />
            <span>返回工具列表</span>
          </button>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`}>工具箱</span>
            <span className={`text-xs ${isOledTheme ? 'text-white/20' : 'text-slate-300'}`}>/</span>
            <span className={`text-xs font-bold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>时钟与倒计时</span>
          </div>

          <div className="w-28 text-right">
            {isRunning && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isOledTheme
                  ? 'bg-[#B7FF3C]/10 text-[#B7FF3C] border-[#B7FF3C]/30'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOledTheme ? 'bg-[#B7FF3C]' : 'bg-emerald-500'}`}></span>
                <span>运行中 · {countFormatted}</span>
              </span>
            )}
          </div>
        </div>

        {/* Real-time Clock Hero Banner */}
        <div className={`rounded-3xl p-6 border shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 ${
          isOledTheme
            ? 'bg-[#0C0F11]/90 border-white/10'
            : 'liquid-glass-hero border-white/95'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0 ${
              isOledTheme
                ? 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30 shadow-[#00E5FF]/10'
                : 'bg-gradient-to-tr from-[#0071E3] to-[#42A5F5] text-white shadow-blue-500/20'
            }`}>
              <Clock size={28} strokeWidth={1.75} />
            </div>
            <div>
              <div className={`text-xs font-semibold ${isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'}`}>当前标准时间</div>
              <div className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight mt-0.5 ${
                isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'
              }`}>
                {hoursStr}:{minutesStr}
                <span className={`text-xl sm:text-2xl font-normal ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`}>:{secondsStr}</span>
              </div>
              <div className={`text-xs mt-1 font-medium ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-500'}`}>
                {formatChineseDate(formatLocalDate(currentTime))}
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-3 md:border-l md:pl-6 ${
            isOledTheme ? 'md:border-white/10' : 'md:border-slate-200/70'
          }`}>
            <div className={`p-3 rounded-2xl border shadow-2xs text-left ${
              isOledTheme
                ? 'bg-[#111417]/80 border-white/10'
                : 'bg-white/70 border-white/90'
            }`}>
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                isOledTheme ? 'text-[#F2F5F5]' : 'text-slate-600'
              }`}>
                <Info size={13} className={isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'} />
                <span>独立运行保障</span>
              </div>
              <p className={`text-[11px] mt-0.5 max-w-xs leading-relaxed ${
                isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'
              }`}>
                点击开始后，您可以返回列表或切换到待办、日报等任意页面，倒计时将在后台持续运行并在结束时发出提示音
              </p>
            </div>
          </div>
        </div>

        {/* Countdown Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Countdown Ring & Controls */}
          <div className={`lg:col-span-2 rounded-3xl p-8 border shadow-sm flex flex-col items-center justify-center relative ${
            isOledTheme
              ? 'bg-[#0C0F11]/90 border-white/10'
              : 'liquid-glass-card border-white/90'
          }`}>
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? '已开启提示音（点击静音）' : '已静音（点击开启提示音）'}
              className={`absolute top-6 right-6 p-2 rounded-xl transition-colors cursor-pointer ${
                isOledTheme
                  ? 'text-[#7D858A] hover:text-[#F2F5F5] hover:bg-[#111417]'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {soundEnabled ? <Volume2 size={18} className={isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'} /> : <VolumeX size={18} />}
            </button>

            {/* Circular Progress Ring */}
            <div className="relative w-64 h-64 flex items-center justify-center my-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke={isOledTheme ? '#181C20' : '#E2E8F0'}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke={isOledTheme ? '#00E5FF' : '#0071E3'}
                  strokeWidth="8"
                  strokeDasharray="565.48"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-linear"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {isRunning && !isPaused && (
                  <div className="absolute opacity-15 pointer-events-none scale-125">
                    <ThinkingOrb state="working" size={64} theme={isOledTheme ? 'dark' : 'light'} />
                  </div>
                )}
                <span className={`text-5xl font-bold font-mono tracking-tight relative z-10 ${
                  isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'
                }`}>
                  {countFormatted}
                </span>
                <span className={`text-xs font-medium mt-2 relative z-10 flex items-center gap-1.5 ${
                  isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'
                }`}>
                  {isRunning && !isPaused && (
                    <ThinkingOrb state="working" size={20} theme={isOledTheme ? 'dark' : 'light'} />
                  )}
                  <span>
                    {isRunning
                      ? isPaused
                        ? '倒计时已暂停'
                        : '倒计时进行中'
                      : remainingSeconds === 0
                      ? '计时已完成'
                      : '就绪，点击开始'}
                  </span>
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-2">
              <button
                type="button"
                onClick={resetTimer}
                title="重置计时"
                className={`p-3 rounded-2xl active:scale-95 transition-all cursor-pointer ${
                  isOledTheme
                    ? 'bg-[#111417] text-[#7D858A] border border-white/10 hover:text-[#F2F5F5] hover:bg-[#181C20]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <RotateCcw size={18} />
              </button>

              {!isRunning || isPaused ? (
                <button
                  type="button"
                  onClick={() => {
                    if (isPaused) {
                      resumeTimer();
                    } else {
                      startCountdown(remainingSeconds || totalSeconds || 180);
                    }
                  }}
                  className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-semibold active:scale-95 transition-all cursor-pointer shadow-md ${
                    isOledTheme
                      ? 'bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050607] shadow-[#00E5FF]/20'
                      : 'bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-blue-500/25'
                  }`}
                >
                  <Play size={16} fill="currentColor" />
                  <span>{isPaused ? '继续计时' : '开始计时'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseTimer}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-md shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Pause size={16} fill="currentColor" />
                  <span>暂停计时</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => addSeconds(60)}
                title="增加1分钟"
                className={`px-3.5 py-3 rounded-2xl text-xs font-bold active:scale-95 transition-all cursor-pointer border ${
                  isOledTheme
                    ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/20 hover:bg-[#00E5FF]/20'
                    : 'bg-blue-50 text-[#0071E3] hover:bg-blue-100/80 border-blue-100'
                }`}
              >
                +1分
              </button>
            </div>
          </div>

          {/* Right Col: Presets (1m, 3m, 5m) and Custom Input */}
          <div className="flex flex-col gap-5">
            {/* Presets */}
            <div className={`rounded-3xl p-5 border shadow-2xs ${
              isOledTheme
                ? 'bg-[#0C0F11]/90 border-white/10'
                : 'liquid-glass-card border-white/90'
            }`}>
              <h3 className={`text-sm font-bold mb-1 ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>快捷预设计时</h3>
              <p className={`text-xs mb-3.5 ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>轻触即可快速切换时长并立即就绪</p>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: '1 分钟', seconds: 60, desc: '快速对齐' },
                  { label: '3 分钟', seconds: 180, desc: '速读小憩' },
                  { label: '5 分钟', seconds: 300, desc: '微型专注' },
                  { label: '15 分钟', seconds: 900, desc: '短冲刺' },
                  { label: '25 分钟', seconds: 1500, desc: '标准番茄' },
                  { label: '45 分钟', seconds: 2700, desc: '深度专注' },
                ].map((preset) => {
                  const isCurrent = totalSeconds === preset.seconds;
                  return (
                    <button
                      key={preset.seconds}
                      type="button"
                      onClick={() => {
                        setCustomTime(preset.seconds / 60);
                        startCountdown(preset.seconds, `${preset.label}倒计时`);
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer text-center ${
                        isOledTheme
                          ? isCurrent
                            ? 'bg-[#00E5FF]/15 border-[#00E5FF] text-[#00E5FF] font-bold shadow-2xs'
                            : 'bg-[#111417] border-white/10 text-[#7D858A] hover:text-[#F2F5F5] hover:border-white/20'
                          : isCurrent
                            ? 'bg-[#0071E3]/10 border-[#0071E3] text-[#0071E3] font-bold shadow-2xs'
                            : 'bg-white/70 border-slate-200/80 text-slate-700 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm font-semibold">{preset.label}</span>
                      <span className={`text-[10px] mt-0.5 ${isOledTheme ? 'text-[#7D858A]/80' : 'text-slate-400'}`}>{preset.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Input */}
            <div className={`rounded-3xl p-5 border shadow-2xs ${
              isOledTheme
                ? 'bg-[#0C0F11]/90 border-white/10'
                : 'liquid-glass-card border-white/90'
            }`}>
              <h3 className={`text-sm font-bold mb-1 ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>自定义倒计时时长</h3>
              <p className={`text-xs mb-3.5 ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>设定任意分钟与秒数</p>

              <form onSubmit={handleApplyCustom} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className={`flex-1 flex items-center border rounded-xl px-3 py-2 ${
                    isOledTheme ? 'bg-[#080A0C] border-white/10' : 'bg-slate-50 border-slate-200/90'
                  }`}>
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                      className={`w-full text-sm font-mono font-bold bg-transparent focus:outline-none ${
                        isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'
                      }`}
                    />
                    <span className={`text-xs font-medium ml-1 ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`}>分</span>
                  </div>

                  <span className={`font-bold ${isOledTheme ? 'text-white/30' : 'text-slate-400'}`}>:</span>

                  <div className={`flex-1 flex items-center border rounded-xl px-3 py-2 ${
                    isOledTheme ? 'bg-[#080A0C] border-white/10' : 'bg-slate-50 border-slate-200/90'
                  }`}>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={customSeconds}
                      onChange={(e) => setCustomSeconds(e.target.value)}
                      className={`w-full text-sm font-mono font-bold bg-transparent focus:outline-none ${
                        isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'
                      }`}
                    />
                    <span className={`text-xs font-medium ml-1 ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`}>秒</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                    isOledTheme
                      ? 'bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050607]'
                      : 'bg-slate-800 hover:bg-slate-900 text-white'
                  }`}
                >
                  设定并就绪
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SUB-VIEW: 快速翻译 WORKSPACE ====================
  if (activeToolId === 'translate') {
    return (
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12 animate-fadeIn select-none text-left">
        {/* Top Breadcrumb Navigation */}
        <div className={`flex items-center justify-between p-4 rounded-3xl shadow-xs backdrop-blur-xl border ${
          isOledTheme ? 'bg-[#0C0F11]/90 border-white/10' : 'bg-white/80 border-white/80'
        }`}>
          <button
            type="button"
            onClick={() => setActiveToolId(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs border ${
              isOledTheme
                ? 'bg-[#111417] text-[#7D858A] border-white/10 hover:text-[#00E5FF] hover:border-[#00E5FF]/40'
                : 'bg-white text-slate-600 border-slate-200/60 hover:text-[#0071E3] hover:bg-slate-100'
            }`}
          >
            <ChevronLeft size={16} />
            <span>返回工具列表</span>
          </button>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`}>工具箱</span>
            <span className={`text-xs ${isOledTheme ? 'text-white/20' : 'text-slate-300'}`}>/</span>
            <span className={`text-xs font-bold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>快速翻译</span>
          </div>

          <div className="w-28 text-right"></div>
        </div>

        {/* Workspace Card */}
        <div className={`rounded-3xl p-6 border shadow-sm ${
          isOledTheme ? 'bg-[#0C0F11]/90 border-white/10' : 'bg-white/90 border-white/95'
        }`}>
          <div className={`flex items-center gap-3.5 mb-6 pb-4 border-b ${isOledTheme ? 'border-white/10' : 'border-slate-100'}`}>
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
              isOledTheme ? 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/30' : 'bg-sky-50 text-sky-600 border-sky-200'
            }`}>
              <Languages size={24} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isOledTheme ? 'text-white' : 'text-slate-800'}`}>
                快速翻译
              </h2>
              <p className={`text-xs mt-0.5 ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-500'}`}>
                支持中英双向即时互译，输入文本后点击翻译或快捷键进行解析
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 max-w-3xl mx-auto">
            {/* Direction Switcher */}
            <div className={`flex items-center justify-between p-3 rounded-2xl border ${
              isOledTheme ? 'bg-[#111417] border-white/10 text-[#F2F5F5]' : 'bg-slate-50 border-slate-200/80 text-slate-700'
            }`}>
              <span className="text-xs font-bold">
                {transLang === 'zh-en' ? '中文 (简体)' : 'English (英文)'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTransLang((prev) => (prev === 'zh-en' ? 'en-zh' : 'zh-en'));
                  setTransInput(transOutput);
                  setTransOutput('');
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-xl border shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isOledTheme
                    ? 'bg-[#080A0C] hover:bg-[#00E5FF] text-[#7D858A] hover:text-[#050607] border-white/10'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <ArrowRightLeft size={13} />
                <span>切换语言方向</span>
              </button>
              <span className="text-xs font-bold">
                {transLang === 'zh-en' ? 'English (英文)' : '中文 (简体)'}
              </span>
            </div>

            {/* Input Box */}
            <div>
              <textarea
                rows={4}
                value={transInput}
                onChange={(e) => setTransInput(e.target.value)}
                placeholder={transLang === 'zh-en' ? '输入要翻译的中文内容...' : 'Type English text here to translate...'}
                className={`w-full p-4 text-xs rounded-2xl border transition-all outline-none shadow-xs resize-none ${
                  isOledTheme
                    ? 'bg-[#080A0C] border-white/10 text-white placeholder:text-[#7D858A] focus:border-[#00E5FF]'
                    : 'bg-white border-slate-200 text-slate-800 focus:border-[#1677FF]'
                }`}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setTransInput(''); setTransOutput(''); }}
                className={`text-xs cursor-pointer ${isOledTheme ? 'text-[#7D858A] hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                清空内容
              </button>
              <button
                type="button"
                onClick={handleRunTranslate}
                disabled={isTranslating || !transInput.trim()}
                className="px-6 py-2 rounded-xl bg-[#1677FF] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
              >
                {isTranslating ? <span>翻译中...</span> : <span>立即翻译</span>}
              </button>
            </div>

            {/* Result Box */}
            {transOutput && (
              <div className={`p-4 rounded-2xl border mt-2 ${
                isOledTheme ? 'bg-[#00E5FF]/10 border-[#00E5FF]/20 text-white' : 'bg-sky-50/70 border-sky-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${isOledTheme ? 'text-[#00E5FF]' : 'text-sky-800'}`}>翻译结果</span>
                  <button
                    type="button"
                    onClick={handleCopyTrans}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border shadow-2xs flex items-center gap-1 cursor-pointer transition-colors ${
                      isOledTheme
                        ? 'bg-[#111417] text-[#00E5FF] border-white/10 hover:bg-[#00E5FF] hover:text-[#050607]'
                        : 'bg-white hover:bg-sky-100 text-sky-700 border-sky-200'
                    }`}
                  >
                    {copiedTrans ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedTrans ? '已复制' : '复制结果'}</span>
                  </button>
                </div>
                <p className="text-xs whitespace-pre-wrap leading-relaxed">
                  {transOutput}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== SUB-VIEW: 便携计算器 WORKSPACE ====================
  if (activeToolId === 'calculator') {
    return (
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12 animate-fadeIn select-none text-left">
        {/* Top Breadcrumb Navigation */}
        <div className={`flex items-center justify-between p-4 rounded-3xl shadow-xs backdrop-blur-xl border ${
          isOledTheme ? 'bg-[#0C0F11]/90 border-white/10' : 'bg-white/80 border-white/80'
        }`}>
          <button
            type="button"
            onClick={() => setActiveToolId(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs border ${
              isOledTheme
                ? 'bg-[#111417] text-[#7D858A] border-white/10 hover:text-[#00E5FF] hover:border-[#00E5FF]/40'
                : 'bg-white text-slate-600 border-slate-200/60 hover:text-[#0071E3] hover:bg-slate-100'
            }`}
          >
            <ChevronLeft size={16} />
            <span>返回工具列表</span>
          </button>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`}>工具箱</span>
            <span className={`text-xs ${isOledTheme ? 'text-white/20' : 'text-slate-300'}`}>/</span>
            <span className={`text-xs font-bold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>便携计算器</span>
          </div>

          <div className="w-28 text-right"></div>
        </div>

        {/* Workspace Card */}
        <div className={`rounded-3xl p-6 border shadow-sm max-w-md mx-auto w-full ${
          isOledTheme ? 'bg-[#0C0F11]/90 border-white/10' : 'bg-white/90 border-white/95'
        }`}>
          <div className={`flex items-center gap-3.5 mb-5 pb-3 border-b ${isOledTheme ? 'border-white/10' : 'border-slate-100'}`}>
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${
              isOledTheme ? 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              <Calculator size={22} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isOledTheme ? 'text-white' : 'text-slate-800'}`}>
                便携计算器
              </h2>
              <p className={`text-xs ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-500'}`}>
                快速四则运算与日常核算辅助
              </p>
            </div>
          </div>

          {/* LCD Display */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-inner flex flex-col justify-between min-h-[85px] mb-4">
            <div className="text-xs text-slate-400 font-mono text-right truncate h-4">
              {calcExpr || '0'}
            </div>
            <div className="text-3xl font-bold font-mono text-right truncate text-emerald-400">
              {calcRes || (calcExpr ? calcExpr : '0')}
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: 'C', val: 'C', color: 'text-rose-500 bg-rose-50 hover:bg-rose-100' },
              { label: 'DEL', val: 'DEL', color: 'text-slate-600 bg-slate-100 hover:bg-slate-200' },
              { label: '(', val: '(', color: 'text-slate-600 bg-slate-100 hover:bg-slate-200' },
              { label: ')', val: ')', color: 'text-slate-600 bg-slate-100 hover:bg-slate-200' },

              { label: '7', val: '7', color: isOledTheme ? 'text-white bg-[#111417] border border-white/10 hover:bg-white/10' : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
              { label: '8', val: '8', color: isOledTheme ? 'text-white bg-[#111417] border border-white/10 hover:bg-white/10' : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
              { label: '9', val: '9', color: isOledTheme ? 'text-white bg-[#111417] border border-white/10 hover:bg-white/10' : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
              { label: '÷', val: '/', color: 'text-[#1677FF] bg-blue-50 hover:bg-blue-100' },

              { label: '4', val: '4', color: isOledTheme ? 'text-white bg-[#111417] border border-white/10 hover:bg-white/10' : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
              { label: '5', val: '5', color: isOledTheme ? 'text-white bg-[#111417] border border-white/10 hover:bg-white/10' : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
              { label: '6', val: '6', color: isOledTheme ? 'text-white bg-[#111417] border border-white/10 hover:bg-white/10' : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
              { label: '×', val: '*', color: 'text-[#1677FF] bg-blue-50 hover:bg-blue-100' },

              { label: '1', val: '1', color: isOledTheme ? 'text-white bg-[#111417] border border-white/10 hover:bg-white/10' : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
              { label: '2', val: '2', color: isOledTheme ? 'text-white bg-[#111417] border border-white/10 hover:bg-white/10' : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
              { label: '3', val: '3', color: isOledTheme ? 'text-white bg-[#111417] border border-white/10 hover:bg-white/10' : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
              { label: '-', val: '-', color: 'text-[#1677FF] bg-blue-50 hover:bg-blue-100' },

              { label: '0', val: '0', color: isOledTheme ? 'text-white bg-[#111417] border border-white/10 hover:bg-white/10' : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
              { label: '.', val: '.', color: isOledTheme ? 'text-white bg-[#111417] border border-white/10 hover:bg-white/10' : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50' },
              { label: '=', val: '=', color: 'text-white bg-[#1677FF] hover:bg-blue-600 font-bold shadow-xs' },
              { label: '+', val: '+', color: 'text-[#1677FF] bg-blue-50 hover:bg-blue-100' },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => handleCalcPress(btn.val)}
                className={`h-12 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center cursor-pointer active:scale-95 ${btn.color}`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCopyCalc}
              className="text-xs text-[#1677FF] hover:underline flex items-center gap-1.5 cursor-pointer font-semibold"
            >
              {copiedCalc ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedCalc ? '已复制运算结果' : '复制运算结果'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN VIEW: TOOLS LIST & GRID (LIKE FILES MODULE) ====================
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 animate-fadeIn select-none text-left">
      {/* 1. Header Toolbar (Identical to FilesView style) */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl shadow-xs backdrop-blur-xl border ${
        isOledTheme ? 'bg-[#0C0F11]/90 border-white/10' : 'bg-white/80 border-white/80'
      }`}>
        <div>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0 ${
              isOledTheme
                ? 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30 shadow-[#00E5FF]/10'
                : 'bg-gradient-to-tr from-[#0071E3] to-[#409CFF] text-white shadow-blue-500/20'
            }`}>
              <Wrench size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-bold tracking-tight ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>工具管理</h1>
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                  isOledTheme
                    ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/20'
                    : 'bg-blue-50 text-[#0071E3] border-blue-200/60'
                }`}>
                  {TOOL_ITEMS.length} 个工具
                </span>
                {isRunning && (
                  <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                    isOledTheme
                      ? 'bg-[#B7FF3C]/10 text-[#B7FF3C] border-[#B7FF3C]/30'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOledTheme ? 'bg-[#B7FF3C]' : 'bg-emerald-500'}`}></span>
                    <span>倒计时运行中 · {countFormatted}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center p-1 rounded-xl border ${
            isOledTheme ? 'bg-[#111417] border-white/10' : 'bg-slate-100/90 border-slate-200/60'
          }`}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? isOledTheme
                    ? 'bg-[#00E5FF]/15 text-[#00E5FF] font-bold border border-[#00E5FF]/30'
                    : 'bg-white text-[#0071E3] shadow-2xs font-bold'
                  : isOledTheme
                    ? 'text-[#7D858A] hover:text-[#F2F5F5]'
                    : 'text-slate-400 hover:text-slate-700'
              }`}
              title="网格视图"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? isOledTheme
                    ? 'bg-[#00E5FF]/15 text-[#00E5FF] font-bold border border-[#00E5FF]/30'
                    : 'bg-white text-[#0071E3] shadow-2xs font-bold'
                  : isOledTheme
                    ? 'text-[#7D858A] hover:text-[#F2F5F5]'
                    : 'text-slate-400 hover:text-slate-700'
              }`}
              title="列表视图"
            >
              <ListIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Category Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? isOledTheme
                    ? 'bg-[#00E5FF] text-[#050607] font-bold shadow-xs'
                    : 'bg-[#1D1D1F] text-white shadow-xs font-semibold'
                  : isOledTheme
                    ? 'bg-[#0C0F11] text-[#7D858A] hover:text-[#F2F5F5] border border-white/10 hover:border-white/20'
                    : 'bg-white/70 hover:bg-white text-[#6E6E73] hover:text-[#1D1D1F] border border-slate-200/70'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索工具名称或标签..."
            className={`w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border transition-all outline-none shadow-2xs ${
              isOledTheme
                ? 'bg-[#080A0C] border-white/10 text-[#F2F5F5] placeholder:text-[#7D858A] focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20'
                : 'bg-white/80 border-slate-200/80 focus:bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 text-[#1D1D1F]'
            }`}
          />
        </div>
      </div>

      {/* 3. GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTools.map((tool) => {
            const IconComponent = tool.icon;
            const isToolRunning = tool.id === 'countdown' && isRunning;

            return (
              <div
                key={tool.id}
                onClick={() => setActiveToolId(tool.id)}
                className={`group relative rounded-2xl p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between border select-none backdrop-blur-md ${
                  isOledTheme
                    ? 'bg-[#0C0F11]/90 border-white/10 hover:border-[#00E5FF]/40 hover:shadow-[0_0_20px_rgba(0,229,255,0.08)]'
                    : `bg-white/90 border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,113,227,0.12)] hover:-translate-y-1 ${tool.cardBg}`
                }`}
              >
                {/* Top Badge & Category */}
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-3">
                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md shadow-2xs ${
                      isOledTheme
                        ? 'bg-[#00E5FF] text-[#050607]'
                        : `text-white ${tool.badgeBg}`
                    }`}>
                      {tool.tag}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isToolRunning && (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold animate-pulse border ${
                          isOledTheme
                            ? 'bg-[#B7FF3C]/10 border-[#B7FF3C]/30 text-[#B7FF3C]'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOledTheme ? 'bg-[#B7FF3C]' : 'bg-emerald-500'}`}></span>
                          <span>{countFormatted}</span>
                        </span>
                      )}
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                        isOledTheme ? 'bg-[#111417] text-[#7D858A] border border-white/10' : 'bg-slate-100/80 text-[#86868B]'
                      }`}>
                        {tool.category}
                      </span>
                    </div>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-center gap-3.5 my-2.5">
                    <div
                      className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-108 ${
                        isOledTheme
                          ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/20 shadow-none'
                          : tool.iconBoxBg
                      }`}
                    >
                      <IconComponent size={24} strokeWidth={1.8} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className={`text-base font-bold transition-colors truncate ${
                        isOledTheme
                          ? 'text-[#F2F5F5] group-hover:text-[#00E5FF]'
                          : 'text-[#1D1D1F] group-hover:text-[#0071E3]'
                      }`}>
                        {tool.name}
                      </h3>
                      <p className={`text-xs mt-0.5 truncate ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`}>
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 ${
                  isOledTheme ? 'border-white/10' : 'border-slate-100'
                }`}>
                  <span className={`text-[11px] font-medium flex items-center gap-1.5 ${
                    isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isToolRunning
                        ? (isOledTheme ? 'bg-[#B7FF3C]' : 'bg-emerald-500')
                        : (isOledTheme ? 'bg-white/20' : 'bg-slate-300')
                    }`}></span>
                    <span>{isToolRunning ? '运行中' : '就绪'}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setActiveToolId(tool.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shadow-2xs border ${
                      isOledTheme
                        ? 'bg-[#00E5FF]/10 hover:bg-[#00E5FF] text-[#00E5FF] hover:text-[#050607] border-[#00E5FF]/25'
                        : 'bg-[#0071E3]/10 group-hover:bg-[#0071E3] text-[#0071E3] group-hover:text-white border-transparent'
                    }`}
                  >
                    <span>{isToolRunning ? '查看计时' : '打开工具'}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. LIST VIEW (Table, like Files module) */}
      {viewMode === 'list' && (
        <div className={`border rounded-3xl shadow-xs overflow-hidden backdrop-blur-xl ${
          isOledTheme
            ? 'bg-[#0C0F11]/90 border-white/10'
            : 'bg-white/80 border-slate-200/70'
        }`}>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className={`border-b text-[11px] uppercase tracking-wider ${
                  isOledTheme
                    ? 'border-white/10 bg-[#111417] text-[#7D858A]'
                    : 'border-slate-200/70 bg-slate-50/70 text-slate-500'
                }`}>
                  <th className="py-3 px-4 font-medium">工具名称</th>
                  <th className="py-3 px-4 font-medium w-32">所属分类</th>
                  <th className="py-3 px-4 font-medium w-28">工具标签</th>
                  <th className="py-3 px-4 font-medium w-32">运行状态</th>
                  <th className="py-3 px-4 font-medium text-right w-36">操作</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                isOledTheme ? 'divide-white/5' : 'divide-slate-100'
              }`}>
                {filteredTools.map((tool) => {
                  const IconComponent = tool.icon;
                  const isToolRunning = tool.id === 'countdown' && isRunning;

                  return (
                    <tr
                      key={tool.id}
                      onClick={() => setActiveToolId(tool.id)}
                      className={`transition-colors group cursor-pointer ${
                        isOledTheme ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Name & Icon */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isOledTheme
                              ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/20'
                              : tool.iconBoxBg
                          }`}>
                            <IconComponent size={18} strokeWidth={2} />
                          </div>
                          <div>
                            <div className={`font-bold transition-colors ${
                              isOledTheme
                                ? 'text-[#F2F5F5] group-hover:text-[#00E5FF]'
                                : 'text-[#1D1D1F] group-hover:text-[#0071E3]'
                            }`}>
                              {tool.name}
                            </div>
                            <div className={`text-[10px] mt-0.5 ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>
                              {tool.tag}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          isOledTheme
                            ? 'bg-[#111417] text-[#7D858A] border border-white/10'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {tool.category}
                        </span>
                      </td>

                      {/* Tag Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isOledTheme
                            ? 'bg-[#00E5FF] text-[#050607]'
                            : `text-white ${tool.badgeBg}`
                        }`}>
                          {tool.tag}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isToolRunning ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] animate-pulse border ${
                            isOledTheme
                              ? 'bg-[#B7FF3C]/10 border-[#B7FF3C]/30 text-[#B7FF3C]'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOledTheme ? 'bg-[#B7FF3C]' : 'bg-emerald-500'}`}></span>
                            <span>运行中 · {countFormatted}</span>
                          </span>
                        ) : (
                          <span className={`text-[11px] font-medium ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-400'}`}>就绪</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setActiveToolId(tool.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap active:scale-95 transition-all cursor-pointer shadow-2xs border ${
                            isOledTheme
                              ? 'bg-[#00E5FF]/10 hover:bg-[#00E5FF] text-[#00E5FF] hover:text-[#050607] border-[#00E5FF]/25'
                              : 'bg-[#0071E3]/10 hover:bg-[#0071E3] text-[#0071E3] hover:text-white border-transparent'
                          }`}
                        >
                          {isToolRunning ? '查看' : '打开'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

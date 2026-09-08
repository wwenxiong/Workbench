import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Upload, 
  Check, 
  AlertCircle, 
  LogOut, 
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Bot,
  Eye,
  EyeOff,
  Activity,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  Info,
  Database,
  Download
} from 'lucide-react';
import { api } from '../../services/api';
import type { UserProfile } from '../../types';
import { useToast } from '../Common/Toast';
import { useTheme } from '../../contexts/ThemeContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from '../Common/PWAInstallModal';

interface SettingsViewProps {
  currentUser: UserProfile | null;
  onUserUpdated: (user: UserProfile) => void;
  onLogout: () => void;
}

type SettingSection = 'profile' | 'security' | 'ai' | 'about';

const PRESET_AVATARS = [
  { id: 1, title: '灵动小猫', url: '/uploads/avatars/presets/avatar-1.svg' },
  { id: 2, title: '暖心柴犬', url: '/uploads/avatars/presets/avatar-2.svg' },
  { id: 3, title: '憨态熊猫', url: '/uploads/avatars/presets/avatar-3.svg' },
  { id: 4, title: '聪慧小狐', url: '/uploads/avatars/presets/avatar-4.svg' },
  { id: 5, title: '乖巧白兔', url: '/uploads/avatars/presets/avatar-5.svg' },
  { id: 6, title: '悠闲考拉', url: '/uploads/avatars/presets/avatar-6.svg' },
  { id: 7, title: '活力小狮', url: '/uploads/avatars/presets/avatar-7.svg' },
  { id: 8, title: '暖心小熊', url: '/uploads/avatars/presets/avatar-8.svg' },
];

const AI_PRESETS = [
  { name: 'OpenAI 官方', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'DeepSeek', url: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { name: '月之暗面 Kimi', url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: '通义千问', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
  { name: '本地 Ollama', url: 'http://localhost:11434/v1', model: 'qwen2.5:7b' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onUserUpdated,
  onLogout,
}) => {
  const { showToast } = useToast();
  const { isOledTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isInstallable, isStandalone, isIOS, showGuideModal, setShowGuideModal, installApp } = usePWAInstall();

  // Active sub-page navigation state
  const [activeSection, setActiveSection] = useState<SettingSection | null>(null);

  // AI Large Model Settings State
  const [aiBaseUrl, setAiBaseUrl] = useState('https://api.openai.com/v1');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [hasAiKey, setHasAiKey] = useState(false);
  const [showAiKey, setShowAiKey] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    api.getAiConfig().then((cfg) => {
      setAiBaseUrl(cfg.baseUrl || 'https://api.openai.com/v1');
      setAiModel(cfg.model || 'gpt-4o-mini');
      setHasAiKey(!!cfg.hasKey);
      if (cfg.hasKey && cfg.maskedKey) {
        setAiApiKey(cfg.maskedKey);
      }
    }).catch(() => {});
  }, []);

  const handleSelectAiPreset = (preset: typeof AI_PRESETS[0]) => {
    setAiBaseUrl(preset.url);
    setAiModel(preset.model);
    setTestResult(null);
  };

  const handleTestAiConnection = async () => {
    try {
      setIsTestingAi(true);
      setTestResult(null);
      const res = await api.testAiConnection({
        baseUrl: aiBaseUrl,
        apiKey: aiApiKey,
        model: aiModel,
      });
      setTestResult({
        success: true,
        message: res.message || `连接成功，延迟 ${res.latencyMs}ms`,
      });
      showToast('接口连接成功', { type: 'success' });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || '连接失败，请检查地址与密钥',
      });
      showToast('接口连接失败', { type: 'error' });
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingAi(true);
      const res = await api.saveAiConfig({
        baseUrl: aiBaseUrl,
        apiKey: aiApiKey,
        model: aiModel,
      });
      setHasAiKey(!!res.hasKey);
      showToast('配置已保存', { type: 'success' });
    } catch (err: any) {
      showToast(err.message || '保存配置失败', { type: 'error' });
    } finally {
      setIsSavingAi(false);
    }
  };

  // Username change state
  const [newUsername, setNewUsername] = useState(currentUser?.username || '');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle Preset Avatar Selection
  const handleSelectPreset = async (presetUrl: string) => {
    try {
      setAvatarMsg(null);
      const res = await api.setPresetAvatar(presetUrl);
      if (currentUser) {
        onUserUpdated({ ...currentUser, avatar_url: res.avatarUrl });
      }
      showToast('头像已更新', { type: 'success' });
    } catch (err: any) {
      setAvatarMsg({ type: 'error', text: err.message || '更新头像失败' });
    }
  };

  // Handle Local Custom File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size: 2MB
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setAvatarMsg({ type: 'error', text: '头像图片大小不能超过 2MB' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate format: JPG, PNG, WebP
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setAvatarMsg({ type: 'error', text: '仅支持 JPG、PNG 或 WebP 格式图片' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setAvatarMsg(null);
      const res = await api.uploadAvatar(file);
      if (currentUser) {
        onUserUpdated({ ...currentUser, avatar_url: res.avatarUrl });
      }
      showToast('自定义头像上传成功', { type: 'success' });
    } catch (err: any) {
      setAvatarMsg({ type: 'error', text: err.message || '上传头像失败' });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Update Username
  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newUsername.trim();
    if (!clean) {
      setUsernameMsg({ type: 'error', text: '用户名不能为空' });
      return;
    }
    if (clean.length < 2 || clean.length > 16) {
      setUsernameMsg({ type: 'error', text: '用户名长度需在 2 到 16 个字符之间' });
      return;
    }
    if (clean === currentUser?.username) {
      setUsernameMsg({ type: 'error', text: '新用户名与当前用户名相同' });
      return;
    }

    try {
      setIsUpdatingUsername(true);
      setUsernameMsg(null);
      const updatedUser = await api.updateUsername(clean);
      onUserUpdated(updatedUser);
      setUsernameMsg({ type: 'success', text: '昵称已保存' });
      showToast('昵称已保存', { type: 'success' });
    } catch (err: any) {
      setUsernameMsg({ type: 'error', text: err.message || '保存失败' });
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  // Handle Update Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      setPasswordMsg({ type: 'error', text: '请输入原密码' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: '新密码长度至少需 6 位' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }

    try {
      setIsUpdatingPassword(true);
      setPasswordMsg(null);
      await api.changePassword(oldPassword, newPassword);
      setPasswordMsg({ type: 'success', text: '密码已更新' });
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('密码已更新', { type: 'success' });
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || '更新失败' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <main className="flex-1 h-screen overflow-y-auto z-10 p-6 md:p-8 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* =========================================================
            1. Settings Hub: Overview List View (When activeSection === null)
        ========================================================= */}
        {activeSection === null ? (
          <div className="space-y-6 animate-fade-in">
            {/* Top Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-2xl font-bold tracking-tight ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-[#1D1D1F]'}`}>
                  设置
                </h1>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className={`px-4 py-2 rounded-2xl ${
                  isOledTheme 
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                    : 'bg-rose-50 hover:bg-rose-100/80 text-rose-600 border border-rose-200/60'
                } text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all active:scale-95 cursor-pointer`}
              >
                <LogOut size={15} />
                <span>退出登录</span>
              </button>
            </div>

            {/* Profile Overview Banner */}
            <div className={`${
              isOledTheme 
                ? 'bg-[#0C0F11] border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)]' 
                : 'liquid-glass bg-white/80 border border-white/80 shadow-sm'
            } rounded-3xl p-5 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4`}>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl overflow-hidden shadow-md border-2 ${
                  isOledTheme ? 'border-white/[0.1] bg-[#111417]' : 'border-white bg-slate-100'
                } flex items-center justify-center flex-shrink-0`}>
                  {currentUser?.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={28} className={isOledTheme ? 'text-[#52595E]' : 'text-slate-400'} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-lg font-bold ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-[#1D1D1F]'}`}>
                      {currentUser?.username || '未登录'}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full ${
                      isOledTheme 
                        ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 font-mono' 
                        : 'bg-blue-50 text-[#0071E3] border border-blue-200/60'
                    } text-[10px] font-bold`}>
                      个人版
                    </span>
                  </div>
                  <p className={`text-xs ${isOledTheme ? 'text-[#7D858A] font-mono' : 'text-[#86868B]'} mt-0.5`}>
                    创建于 {currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.') : '2026.09.03'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSection('profile')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl ${
                  isOledTheme 
                    ? 'bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050607] font-mono' 
                    : 'bg-[#0071E3] hover:opacity-90 text-white'
                } text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer`}
              >
                <User size={14} />
                <span>编辑资料</span>
              </button>
            </div>

            {/* Settings Categories Grid (Click button to enter each) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Category 1: 个人资料 (Profile & Avatar) */}
              <div
                onClick={() => setActiveSection('profile')}
                className={`p-5 rounded-2xl border ${
                  isOledTheme 
                    ? 'bg-[#0C0F11] hover:bg-[#111417] border-white/[0.08] hover:border-[#00E5FF]/30 shadow-[0_8px_30px_rgba(0,0,0,0.5)]' 
                    : 'bg-white/80 border-white/90 shadow-xs hover:shadow-md'
                } backdrop-blur-xl transition-all group cursor-pointer flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${
                        isOledTheme ? 'bg-[#B7FF3C]/10 text-[#B7FF3C] border border-[#B7FF3C]/20' : 'bg-amber-50 text-amber-600'
                      } flex items-center justify-center shadow-2xs`}>
                        <Sparkles size={20} />
                      </div>
                      <h3 className={`text-sm font-bold ${isOledTheme ? 'text-[#F2F5F5] group-hover:text-[#00E5FF]' : 'text-[#1D1D1F] group-hover:text-[#0071E3]'} transition-colors`}>
                        个人资料
                      </h3>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      isOledTheme ? 'bg-white/[0.06] text-[#AEB7BA] font-mono' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {currentUser?.avatar_url ? '已同步' : '默认预设'}
                    </span>
                  </div>
                </div>
                <div className={`pt-3 border-t ${isOledTheme ? 'border-white/[0.08]' : 'border-slate-100'} flex items-center justify-between`}>
                  <span className={`text-[11px] ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'} font-medium`}>
                    8 款预设 · 本地导入
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSection('profile');
                    }}
                    className={`flex items-center gap-1 text-xs font-semibold ${
                      isOledTheme ? 'text-[#00E5FF] font-mono' : 'text-[#0071E3]'
                    } group-hover:translate-x-0.5 transition-transform`}
                  >
                    <span>进入设置</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Category 3: 模型服务 (AI Universal API) */}
              <div
                onClick={() => setActiveSection('ai')}
                className={`p-5 rounded-2xl border ${
                  isOledTheme 
                    ? 'bg-[#0C0F11] hover:bg-[#111417] border-white/[0.08] hover:border-[#00E5FF]/30 shadow-[0_8px_30px_rgba(0,0,0,0.5)]' 
                    : 'bg-white/80 border-white/90 shadow-xs hover:shadow-md'
                } backdrop-blur-xl transition-all group cursor-pointer flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${
                        isOledTheme 
                          ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20' 
                          : 'bg-gradient-to-tr from-[#0071E3] to-[#42A5F5] text-white'
                      } flex items-center justify-center shadow-2xs`}>
                        <Bot size={20} />
                      </div>
                      <h3 className={`text-sm font-bold ${isOledTheme ? 'text-[#F2F5F5] group-hover:text-[#00E5FF]' : 'text-[#1D1D1F] group-hover:text-[#0071E3]'} transition-colors`}>
                        模型服务
                      </h3>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      hasAiKey 
                        ? (isOledTheme ? 'bg-[#B7FF3C]/10 text-[#B7FF3C] border border-[#B7FF3C]/30 font-mono' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80') 
                        : (isOledTheme ? 'bg-white/[0.06] text-[#7D858A]' : 'bg-slate-100 text-slate-500')
                    }`}>
                      {hasAiKey ? (aiModel || '已连接') : '未连接'}
                    </span>
                  </div>
                </div>
                <div className={`pt-3 border-t ${isOledTheme ? 'border-white/[0.08]' : 'border-slate-100'} flex items-center justify-between`}>
                  <span className={`text-[11px] ${isOledTheme ? 'text-[#7D858A] font-mono' : 'text-[#86868B]'} font-medium`}>
                    模型：{aiModel || '未配置'} · 语义解析
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSection('ai');
                    }}
                    className={`flex items-center gap-1 text-xs font-semibold ${
                      isOledTheme ? 'text-[#00E5FF] font-mono' : 'text-[#0071E3]'
                    } group-hover:translate-x-0.5 transition-transform`}
                  >
                    <span>进入设置</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Category 4: 账号与安全 (Security & Password) */}
              <div
                onClick={() => setActiveSection('security')}
                className={`p-5 rounded-2xl border ${
                  isOledTheme 
                    ? 'bg-[#0C0F11] hover:bg-[#111417] border-white/[0.08] hover:border-[#00E5FF]/30 shadow-[0_8px_30px_rgba(0,0,0,0.5)]' 
                    : 'bg-white/80 border-white/90 shadow-xs hover:shadow-md'
                } backdrop-blur-xl transition-all group cursor-pointer flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${
                        isOledTheme 
                          ? 'bg-[#B7FF3C]/10 text-[#B7FF3C] border border-[#B7FF3C]/20' 
                          : 'bg-emerald-50 text-emerald-600'
                      } flex items-center justify-center shadow-2xs`}>
                        <ShieldCheck size={20} />
                      </div>
                      <h3 className={`text-sm font-bold ${isOledTheme ? 'text-[#F2F5F5] group-hover:text-[#00E5FF]' : 'text-[#1D1D1F] group-hover:text-[#0071E3]'} transition-colors`}>
                        账号与安全
                      </h3>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      isOledTheme 
                        ? 'bg-[#B7FF3C]/10 text-[#B7FF3C] border border-[#B7FF3C]/30 font-mono' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    }`}>
                      已保护
                    </span>
                  </div>
                </div>
                <div className={`pt-3 border-t ${isOledTheme ? 'border-white/[0.08]' : 'border-slate-100'} flex items-center justify-between`}>
                  <span className={`text-[11px] ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'} font-medium`}>
                    会话锁屏 · 本地加密
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSection('security');
                    }}
                    className={`flex items-center gap-1 text-xs font-semibold ${
                      isOledTheme ? 'text-[#00E5FF] font-mono' : 'text-[#0071E3]'
                    } group-hover:translate-x-0.5 transition-transform`}
                  >
                    <span>进入设置</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Category 4: 关于与存储 (About & System Info) */}
              <div
                onClick={() => setActiveSection('about')}
                className={`p-5 rounded-2xl border ${
                  isOledTheme 
                    ? 'bg-[#0C0F11] hover:bg-[#111417] border-white/[0.08] hover:border-[#00E5FF]/30 shadow-[0_8px_30px_rgba(0,0,0,0.5)]' 
                    : 'bg-white/80 border-white/90 shadow-xs hover:shadow-md'
                } backdrop-blur-xl transition-all group cursor-pointer flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${
                        isOledTheme ? 'bg-white/[0.04] text-[#AEB7BA] border border-white/[0.08]' : 'bg-slate-100 text-slate-700'
                      } flex items-center justify-center shadow-2xs`}>
                        <Info size={20} />
                      </div>
                      <h3 className={`text-sm font-bold ${isOledTheme ? 'text-[#F2F5F5] group-hover:text-[#00E5FF]' : 'text-[#1D1D1F] group-hover:text-[#0071E3]'} transition-colors`}>
                        关于与存储
                      </h3>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      isOledTheme ? 'bg-white/[0.06] text-[#AEB7BA] font-mono' : 'bg-slate-100 text-slate-700'
                    }`}>
                      v2.0
                    </span>
                  </div>
                </div>
                <div className={`pt-3 border-t ${isOledTheme ? 'border-white/[0.08]' : 'border-slate-100'} flex items-center justify-between`}>
                  <span className={`text-[11px] ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'} font-medium`}>
                    数据存储 · 缓存清理
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSection('about');
                    }}
                    className={`flex items-center gap-1 text-xs font-semibold ${
                      isOledTheme ? 'text-[#00E5FF] font-mono' : 'text-[#0071E3]'
                    } group-hover:translate-x-0.5 transition-transform`}
                  >
                    <span>查看详情</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Top Navigation Bar with Back Button */}
            <div className={`flex items-center justify-between border-b ${isOledTheme ? 'border-white/[0.08]' : 'border-slate-200/60'} pb-4`}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSection(null)}
                  className={`p-2 rounded-xl ${
                    isOledTheme 
                      ? 'bg-[#111417] hover:bg-[#161B1E] border border-white/[0.08] text-[#F2F5F5]' 
                      : 'bg-white/80 hover:bg-white border border-slate-200/80 text-[#1D1D1F]'
                  } shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-semibold`}
                  title="返回设置列表"
                >
                  <ArrowLeft size={16} />
                  <span>返回</span>
                </button>
                <div className={`h-4 w-px ${isOledTheme ? 'bg-white/[0.1]' : 'bg-slate-200'}`} />
                <div className={`flex items-center gap-1.5 text-xs ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>
                  <span className={`${isOledTheme ? 'hover:text-[#00E5FF]' : 'hover:text-[#1D1D1F]'} cursor-pointer`} onClick={() => setActiveSection(null)}>
                    设置
                  </span>
                  <span>/</span>
                  <span className={`font-semibold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-[#1D1D1F]'}`}>
                    {activeSection === 'profile' && '个人资料'}
                    {activeSection === 'ai' && '模型服务'}
                    {activeSection === 'security' && '账号与安全'}
                    {activeSection === 'about' && '关于与存储'}
                  </span>
                </div>
              </div>

              {/* Quick Tab Switcher */}
              <div className={`hidden sm:flex items-center gap-1 ${isOledTheme ? 'bg-[#111417] border border-white/[0.08]' : 'bg-slate-100/80'} p-1 rounded-xl`}>
                {[
                  { id: 'profile', label: '资料' },
                  { id: 'ai', label: '模型' },
                  { id: 'security', label: '安全' },
                  { id: 'about', label: '关于' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id as SettingSection)}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                      activeSection === tab.id
                        ? (isOledTheme ? 'bg-[#00E5FF] text-[#050607] font-bold shadow-xs' : 'bg-white text-[#1D1D1F] shadow-2xs font-bold')
                        : (isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5]' : 'text-[#86868B] hover:text-[#1D1D1F]')
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Section 1: 个人资料 */}
            {activeSection === 'profile' && (
              <div className="space-y-6 animate-fade-in">
                {/* Avatar Selection & Upload Section */}
                <div className={`${
                  isOledTheme 
                    ? 'bg-[#0C0F11] border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)]' 
                    : 'liquid-glass bg-white/80 border border-white/80 shadow-sm'
                } rounded-3xl p-6 space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className={isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'} />
                      <h3 className={`text-sm font-bold ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-[#1D1D1F]'}`}>
                        用户头像
                      </h3>
                    </div>
                  </div>

                  {avatarMsg && (
                    <div
                      className={`p-3 rounded-2xl text-xs flex items-center gap-2 animate-fade-in ${
                        avatarMsg.type === 'success'
                          ? (isOledTheme ? 'bg-[#B7FF3C]/10 text-[#B7FF3C] border border-[#B7FF3C]/30 font-mono' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80')
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {avatarMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      <span>{avatarMsg.text}</span>
                    </div>
                  )}

                  {/* Preset Avatars Grid */}
                  <div>
                    <div className={`text-[11px] font-semibold ${isOledTheme ? 'text-[#7D858A] font-mono' : 'text-[#86868B]'} mb-2.5`}>
                      预设图库
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                      {PRESET_AVATARS.map((preset) => {
                        const isSelected = currentUser?.avatar_url === preset.url;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectPreset(preset.url)}
                            className={`group relative p-1.5 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col items-center gap-1 ${
                              isSelected
                                ? (isOledTheme ? 'bg-[#00E5FF]/10 ring-2 ring-[#00E5FF] shadow-sm' : 'bg-blue-50 ring-2 ring-[#0071E3] shadow-sm')
                                : (isOledTheme ? 'hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08]' : 'hover:bg-slate-100/80 border border-transparent hover:border-slate-200/60')
                            }`}
                            title={preset.title}
                          >
                            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-2xs group-hover:scale-105 transition-transform duration-200">
                              <img src={preset.url} alt={preset.title} className="w-full h-full object-cover" />
                            </div>
                            <span className={`text-[10px] ${isOledTheme ? 'text-[#7D858A] group-hover:text-[#F2F5F5]' : 'text-[#86868B] group-hover:text-[#1D1D1F]'} truncate w-full text-center`}>
                              {preset.title}
                            </span>
                            {isSelected && (
                              <div className={`absolute top-1 right-1 w-4 h-4 rounded-full ${isOledTheme ? 'bg-[#00E5FF] text-[#050607]' : 'bg-[#0071E3] text-white'} flex items-center justify-center shadow-xs`}>
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Upload Trigger */}
                  <div className={`pt-3 flex items-center justify-end border-t ${isOledTheme ? 'border-white/[0.08]' : 'border-slate-200/60'}`}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className={`px-4 py-2 rounded-xl ${
                        isOledTheme 
                          ? 'bg-[#111417] hover:bg-[#161B1E] text-[#F2F5F5] border border-white/[0.08]' 
                          : 'bg-slate-100 hover:bg-slate-200/80 text-[#1D1D1F] border border-slate-200/80'
                      } active:scale-98 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60`}
                    >
                      <Upload size={14} />
                      <span>{isUploadingAvatar ? '上传中...' : '上传图片'}</span>
                    </button>
                  </div>
                </div>

                {/* Modify Username Section */}
                <div className={`${
                  isOledTheme 
                    ? 'bg-[#0C0F11] border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)]' 
                    : 'liquid-glass bg-white/80 border border-white/80 shadow-sm'
                } rounded-3xl p-6 space-y-4`}>
                  <div className="flex items-center gap-2">
                    <User size={18} className={isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'} />
                    <h3 className={`text-sm font-bold ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-[#1D1D1F]'}`}>
                      修改昵称
                    </h3>
                  </div>

                  {usernameMsg && (
                    <div
                      className={`p-3 rounded-2xl text-xs flex items-center gap-2 animate-fade-in ${
                        usernameMsg.type === 'success'
                          ? (isOledTheme ? 'bg-[#B7FF3C]/10 text-[#B7FF3C] border border-[#B7FF3C]/30 font-mono' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80')
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {usernameMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      <span>{usernameMsg.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveUsername} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="输入新昵称 (2-16 位)"
                        className={`w-full px-4 py-2.5 text-xs rounded-xl ${
                          isOledTheme 
                            ? 'bg-[#111417] border-white/[0.08] text-[#F2F5F5] placeholder-[#52595E] focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20' 
                            : 'bg-slate-100/80 border-slate-200/80 text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:ring-3 focus:ring-[#0071E3]/15'
                        } border outline-none transition-all`}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isUpdatingUsername}
                      className={`px-5 py-2.5 rounded-xl ${
                        isOledTheme 
                          ? 'bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050607] font-mono' 
                          : 'bg-[#0071E3] hover:opacity-90 text-white'
                      } text-xs font-semibold shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-60 flex-shrink-0 flex items-center justify-center gap-1.5`}
                    >
                      <Check size={14} />
                      <span>{isUpdatingUsername ? '保存中...' : '保存'}</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Sub-Section 3: 模型服务 */}
            {activeSection === 'ai' && (
              <div className={`${
                isOledTheme 
                  ? 'bg-[#0C0F11] border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)]' 
                  : 'liquid-glass bg-white/80 border border-white/80 shadow-sm'
              } rounded-3xl p-6 space-y-5 animate-fade-in`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl ${
                      isOledTheme 
                        ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30' 
                        : 'bg-gradient-to-tr from-[#0071E3] to-[#42A5F5] text-white'
                    } flex items-center justify-center shadow-2xs`}>
                      <Bot size={18} />
                    </div>
                    <h3 className={`text-sm font-bold ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-[#1D1D1F]'} flex items-center gap-2`}>
                      <span>模型服务</span>
                      {hasAiKey && (
                        <span className={`px-2 py-0.5 rounded-full ${
                          isOledTheme 
                            ? 'bg-[#B7FF3C]/10 border border-[#B7FF3C]/30 text-[#B7FF3C] font-mono' 
                            : 'bg-emerald-50 border border-emerald-200/80 text-emerald-600'
                        } text-[10px] font-semibold`}>
                          已连接
                        </span>
                      )}
                    </h3>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <label className={`block text-[11px] font-semibold ${isOledTheme ? 'text-[#7D858A] font-mono' : 'text-[#6E6E73]'} mb-2 tracking-wider`}>
                    常用预设
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AI_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => handleSelectAiPreset(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                          aiBaseUrl === p.url
                            ? (isOledTheme ? 'bg-[#00E5FF]/15 border-[#00E5FF]/40 text-[#00E5FF] font-mono shadow-xs' : 'bg-blue-50 border-blue-200 text-[#0071E3] shadow-2xs')
                            : (isOledTheme ? 'bg-[#111417] border-white/[0.08] text-[#AEB7BA] hover:border-white/[0.2]' : 'bg-white/80 border-slate-200/80 text-slate-600 hover:bg-slate-100')
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSaveAiConfig} className="space-y-4">
                  {/* API Base URL */}
                  <div>
                    <label className={`block text-[11px] font-semibold ${isOledTheme ? 'text-[#7D858A] font-mono' : 'text-[#6E6E73]'} mb-1.5`}>
                      接口地址 (Base URL)
                    </label>
                    <input
                      type="text"
                      value={aiBaseUrl}
                      onChange={(e) => setAiBaseUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className={`w-full px-4 py-2.5 text-xs font-mono rounded-xl ${
                        isOledTheme 
                          ? 'bg-[#111417] border-white/[0.08] text-[#F2F5F5] placeholder-[#52595E] focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20' 
                          : 'bg-slate-100/80 border-slate-200/80 text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:ring-3 focus:ring-[#0071E3]/15'
                      } border outline-none transition-all`}
                    />
                  </div>

                  {/* API Key */}
                  <div>
                    <label className={`block text-[11px] font-semibold ${isOledTheme ? 'text-[#7D858A] font-mono' : 'text-[#6E6E73]'} mb-1.5`}>
                      API 密钥 (API Key)
                    </label>
                    <div className="relative">
                      <input
                        type={showAiKey ? 'text' : 'password'}
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        placeholder="sk-..."
                        className={`w-full pl-4 pr-11 py-2.5 text-xs font-mono rounded-xl ${
                          isOledTheme 
                            ? 'bg-[#111417] border-white/[0.08] text-[#F2F5F5] placeholder-[#52595E] focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20' 
                            : 'bg-slate-100/80 border-slate-200/80 text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:ring-3 focus:ring-[#0071E3]/15'
                        } border outline-none transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAiKey(!showAiKey)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${isOledTheme ? 'text-[#7D858A] hover:text-[#F2F5F5]' : 'text-slate-400 hover:text-slate-600'} transition-colors p-1 cursor-pointer`}
                        title={showAiKey ? '隐藏密钥' : '显示密钥'}
                      >
                        {showAiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Model Name */}
                  <div>
                    <label className={`block text-[11px] font-semibold ${isOledTheme ? 'text-[#7D858A] font-mono' : 'text-[#6E6E73]'} mb-1.5`}>
                      模型标识 (Model)
                    </label>
                    <input
                      type="text"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      placeholder="例如 gpt-4o-mini 或 deepseek-chat"
                      className={`w-full px-4 py-2.5 text-xs font-mono rounded-xl ${
                        isOledTheme 
                          ? 'bg-[#111417] border-white/[0.08] text-[#F2F5F5] placeholder-[#52595E] focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20' 
                          : 'bg-slate-100/80 border-slate-200/80 text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:ring-3 focus:ring-[#0071E3]/15'
                      } border outline-none transition-all`}
                    />
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[10px] ${isOledTheme ? 'text-[#7D858A]' : 'text-[#86868B]'}`}>推荐模型:</span>
                      {['gpt-4o-mini', 'gpt-4o', 'deepseek-chat', 'moonshot-v1-8k', 'qwen-turbo'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setAiModel(m)}
                          className={`text-[10px] font-mono ${
                            isOledTheme ? 'text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/30' : 'text-[#0071E3] bg-blue-50/80'
                          } hover:underline px-1.5 py-0.5 rounded cursor-pointer`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Test Feedback */}
                  {testResult && (
                    <div
                      className={`p-3 rounded-2xl text-xs flex items-center gap-2 animate-fade-in ${
                        testResult.success
                          ? (isOledTheme ? 'bg-[#B7FF3C]/10 text-[#B7FF3C] border border-[#B7FF3C]/30 font-mono' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80')
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestAiConnection}
                      disabled={isTestingAi || !aiApiKey}
                      className={`px-4 py-2.5 rounded-xl ${
                        isOledTheme 
                          ? 'bg-[#111417] hover:bg-[#161B1E] text-[#F2F5F5] border border-white/[0.08]' 
                          : 'bg-slate-100 hover:bg-slate-200/80 text-[#1D1D1F] border border-slate-200/80'
                      } text-xs font-semibold transition-all active:scale-98 cursor-pointer disabled:opacity-50 flex items-center gap-1.5`}
                    >
                      {isTestingAi ? (
                        <>
                          <RefreshCw size={13} className={`animate-spin ${isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'}`} />
                          <span>测试中...</span>
                        </>
                      ) : (
                        <>
                          <Activity size={13} className={isOledTheme ? 'text-[#00E5FF]' : 'text-[#0071E3]'} />
                          <span>测试连接</span>
                        </>
                      )}
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingAi}
                      className={`px-5 py-2.5 rounded-xl ${
                        isOledTheme 
                          ? 'bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050607] font-mono' 
                          : 'bg-[#0071E3] hover:opacity-90 text-white'
                      } text-xs font-semibold shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-60 flex items-center gap-1.5`}
                    >
                      <Check size={14} />
                      <span>{isSavingAi ? '保存中...' : '保存配置'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sub-Section 4: 账号与安全 */}
            {activeSection === 'security' && (
              <div className={`${
                isOledTheme 
                  ? 'bg-[#0C0F11] border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)]' 
                  : 'liquid-glass bg-white/80 border border-white/80 shadow-sm'
              } rounded-3xl p-6 space-y-5 animate-fade-in`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl ${
                    isOledTheme ? 'bg-[#B7FF3C]/10 text-[#B7FF3C] border border-[#B7FF3C]/30' : 'bg-emerald-50 text-emerald-600'
                  } flex items-center justify-center shadow-2xs`}>
                    <KeyRound size={18} />
                  </div>
                  <h3 className={`text-sm font-bold ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-[#1D1D1F]'}`}>
                    修改密码
                  </h3>
                </div>

                {passwordMsg && (
                  <div
                    className={`p-3 rounded-2xl text-xs flex items-center gap-2 animate-fade-in ${
                      passwordMsg.type === 'success'
                        ? (isOledTheme ? 'bg-[#B7FF3C]/10 text-[#B7FF3C] border border-[#B7FF3C]/30 font-mono' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80')
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {passwordMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleSavePassword} className="space-y-3 max-w-lg">
                  <div>
                    <label className={`block text-[11px] font-semibold ${isOledTheme ? 'text-[#7D858A] font-mono' : 'text-[#6E6E73]'} mb-1`}>
                      原密码
                    </label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="输入当前原密码"
                      className={`w-full px-4 py-2.5 text-xs rounded-xl ${
                        isOledTheme 
                          ? 'bg-[#111417] border-white/[0.08] text-[#F2F5F5] placeholder-[#52595E] focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20' 
                          : 'bg-slate-100/80 border-slate-200/80 text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:ring-3 focus:ring-[#0071E3]/15'
                      } border outline-none transition-all`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[11px] font-semibold ${isOledTheme ? 'text-[#7D858A] font-mono' : 'text-[#6E6E73]'} mb-1`}>
                        新密码（至少 6 位）
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="输入新密码"
                        className={`w-full px-4 py-2.5 text-xs rounded-xl ${
                          isOledTheme 
                            ? 'bg-[#111417] border-white/[0.08] text-[#F2F5F5] placeholder-[#52595E] focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20' 
                            : 'bg-slate-100/80 border-slate-200/80 text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:ring-3 focus:ring-[#0071E3]/15'
                        } border outline-none transition-all`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold ${isOledTheme ? 'text-[#7D858A] font-mono' : 'text-[#6E6E73]'} mb-1`}>
                        确认新密码
                      </label>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="再次输入新密码"
                        className={`w-full px-4 py-2.5 text-xs rounded-xl ${
                          isOledTheme 
                            ? 'bg-[#111417] border-white/[0.08] text-[#F2F5F5] placeholder-[#52595E] focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20' 
                            : 'bg-slate-100/80 border-slate-200/80 text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:ring-3 focus:ring-[#0071E3]/15'
                        } border outline-none transition-all`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className={`mt-2 px-5 py-2.5 rounded-xl ${
                      isOledTheme 
                        ? 'bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050607] font-mono' 
                        : 'bg-[#0071E3] hover:opacity-90 text-white'
                    } text-xs font-semibold shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-60 flex items-center gap-1.5`}
                  >
                    <ShieldCheck size={14} />
                    <span>{isUpdatingPassword ? '保存中...' : '更新密码'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* Sub-Section 5: 关于与存储 */}
            {activeSection === 'about' && (
              <div className={`${
                isOledTheme 
                  ? 'bg-[#0C0F11] border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)]' 
                  : 'liquid-glass bg-white/80 border border-white/80 shadow-sm'
              } rounded-3xl p-6 space-y-5 animate-fade-in`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl ${
                    isOledTheme ? 'bg-white/[0.04] text-[#AEB7BA] border border-white/[0.08]' : 'bg-slate-100 text-slate-700'
                  } flex items-center justify-center shadow-2xs`}>
                    <Database size={18} />
                  </div>
                  <h3 className={`text-sm font-bold ${isOledTheme ? 'text-[#F2F5F5] font-mono' : 'text-[#1D1D1F]'}`}>
                    系统与存储
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className={`p-3.5 rounded-2xl ${
                    isOledTheme ? 'bg-[#111417] border border-white/[0.08] text-[#F2F5F5]' : 'bg-white/70 border border-slate-200/60 text-slate-700'
                  } flex items-center justify-between`}>
                    <span className={isOledTheme ? 'text-[#7D858A]' : 'text-slate-500 font-medium'}>应用版本</span>
                    <span className={`font-mono font-bold ${isOledTheme ? 'text-[#00E5FF]' : 'text-slate-800'}`}>Workbench v2.5.0</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl ${
                    isOledTheme ? 'bg-[#111417] border border-white/[0.08] text-[#F2F5F5]' : 'bg-white/70 border border-slate-200/60 text-slate-700'
                  } flex items-center justify-between`}>
                    <span className={isOledTheme ? 'text-[#7D858A]' : 'text-slate-500 font-medium'}>存储引擎</span>
                    <span className={`font-mono font-bold ${isOledTheme ? 'text-[#B7FF3C]' : 'text-slate-800'}`}>SQLite 3 (WAL 模式)</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl ${
                    isOledTheme ? 'bg-[#111417] border border-white/[0.08] text-[#F2F5F5]' : 'bg-white/70 border border-slate-200/60 text-slate-700'
                  } flex items-center justify-between`}>
                    <span className={isOledTheme ? 'text-[#7D858A]' : 'text-slate-500 font-medium'}>数据库路径</span>
                    <span className={`font-mono text-[11px] ${isOledTheme ? 'text-[#AEB7BA]' : 'text-slate-600'}`}>server/data/workbench.db</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl ${
                    isOledTheme ? 'bg-[#111417] border border-white/[0.08] text-[#F2F5F5]' : 'bg-white/70 border border-slate-200/60 text-slate-700'
                  } flex items-center justify-between`}>
                    <span className={isOledTheme ? 'text-[#7D858A]' : 'text-slate-500 font-medium'}>前端架构</span>
                    <span className={`font-mono ${isOledTheme ? 'text-[#F2F5F5]' : 'text-slate-800'}`}>React 19 · Tailwind · Vite</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl ${
                    isOledTheme 
                      ? 'bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF]' 
                      : 'bg-blue-50/70 border border-blue-200/60 text-[#0071E3]'
                  } flex items-center gap-2 text-[11px]`}>
                    <Info size={15} className="shrink-0" />
                    <span>
                      本地 SQLite 离线保护 · 备份目录 <code className={`font-mono px-1 py-0.5 ${isOledTheme ? 'bg-[#050607] text-[#00E5FF]' : 'bg-white/90 text-slate-800'} rounded`}>server/data/workbench.db</code>
                    </span>
                  </div>

                  {/* PWA Desktop & Mobile App Card */}
                  <div className={`p-4 rounded-2xl ${
                    isOledTheme ? 'bg-[#111417] border border-white/[0.08]' : 'bg-white/70 border border-slate-200/60'
                  } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isOledTheme ? 'text-[#F2F5F5]' : 'text-slate-800'}`}>
                          桌面/手机应用 (PWA)
                        </span>
                        {isStandalone ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200/60 px-2 py-0.5 rounded-full font-semibold">
                            已安装独立运行
                          </span>
                        ) : (
                          <span className="text-[10px] bg-blue-50 text-[#0071E3] border border-blue-200/60 px-2 py-0.5 rounded-full font-semibold">
                            可免安装直装
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${isOledTheme ? 'text-[#7D858A]' : 'text-slate-500'} mt-1 leading-relaxed`}>
                        脱离浏览器标签页以独立原生窗口运行，拥有专属图标、桌面快捷方式与启动加速
                      </p>
                    </div>

                    {!isStandalone && (
                      <button
                        type="button"
                        onClick={installApp}
                        className={`px-4 py-2 rounded-xl ${
                          isOledTheme 
                            ? 'bg-[#00E5FF] hover:bg-[#33EAFF] text-[#050607] font-mono' 
                            : 'bg-[#0071E3] hover:opacity-90 text-white'
                        } text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer active:scale-95`}
                      >
                        <Download size={14} />
                        <span>安装为桌面端</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PWA Guidance Modal */}
      <PWAInstallModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        isIOS={isIOS}
        onNativeInstall={installApp}
        isInstallable={isInstallable}
      />
    </main>
  );
};

export default SettingsView;

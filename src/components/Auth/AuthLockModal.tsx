import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, UserPlus, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import type { UserProfile } from '../../types';

interface AuthLockModalProps {
  isOpen: boolean;
  onUnlocked: (user: UserProfile) => void;
  currentUser?: UserProfile | null;
  onSwitchAccount?: () => void;
  initialMode?: 'login' | 'register' | 'locked';
}

export const AuthLockModal: React.FC<AuthLockModalProps> = ({
  isOpen,
  onUnlocked,
  currentUser,
  onSwitchAccount,
  initialMode = 'login',
}) => {
  // Mode: 'locked' | 'login' | 'register'
  const [mode, setMode] = useState<'locked' | 'login' | 'register'>(() => {
    if (currentUser) return 'locked';
    return initialMode;
  });

  // Sync mode when currentUser or initialMode changes
  useEffect(() => {
    if (currentUser) {
      setMode('locked');
    } else {
      setMode(initialMode === 'locked' ? 'login' : initialMode);
    }
    setPassword('');
    setErrorMsg('');
    setSuccessMsg('');
  }, [currentUser, initialMode]);

  // Form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // States
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [shake, setShake] = useState(false);

  if (!isOpen) return null;

  const triggerShake = (msg: string) => {
    setErrorMsg(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // 1. Quick Unlock (Only requires password for current user)
  const handleQuickUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      triggerShake('请输入密码以解锁');
      return;
    }
    if (!currentUser) return;

    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await api.login(currentUser.username, password, true);
      setSuccessMsg('工作台已恢复');
      setTimeout(() => {
        setSuccessMsg('');
        setPassword('');
        onUnlocked(res.user);
      }, 350);
    } catch (err: any) {
      triggerShake(err.message || '密码错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Standard Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      triggerShake('请输入用户名');
      return;
    }
    if (!password) {
      triggerShake('请输入密码');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await api.login(cleanUsername, password, rememberMe);
      setSuccessMsg('登录成功，欢迎回来！');
      setTimeout(() => {
        setSuccessMsg('');
        setPassword('');
        onUnlocked(res.user);
      }, 400);
    } catch (err: any) {
      triggerShake(err.message || '登录失败，请检查用户名或密码');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      triggerShake('请输入用户名');
      return;
    }
    if (cleanUsername.length < 2 || cleanUsername.length > 16) {
      triggerShake('用户名长度需在 2 到 16 个字符之间');
      return;
    }
    if (!password) {
      triggerShake('请输入密码');
      return;
    }
    if (password.length < 6) {
      triggerShake('密码长度至少需 6 位');
      return;
    }
    if (password !== confirmPassword) {
      triggerShake('两次输入的密码不一致，请核对');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await api.register(cleanUsername, password, confirmPassword);
      setSuccessMsg('注册成功！已为您自动登录');
      setTimeout(() => {
        setSuccessMsg('');
        setPassword('');
        onUnlocked(res.user);
      }, 600);
    } catch (err: any) {
      triggerShake(err.message || '注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setErrorMsg('');
    setSuccessMsg('');
    setConfirmPassword('');
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xl animate-fade-in select-none">
      <div
        className={`w-full max-w-[400px] bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[32px] shadow-2xl p-8 sm:p-9 transition-all duration-300 ${
          shake ? 'animate-shake' : ''
        }`}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
        }}
      >
        {/* ==================== 1. LOCKED MODE (Single password quick unlock) ==================== */}
        {mode === 'locked' && currentUser ? (
          <div>
            <div className="flex flex-col items-center text-center">
              {/* User Avatar with lock indicator */}
              <div className="relative mb-3.5">
                <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-lg border-2 border-white bg-slate-100 flex items-center justify-center">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-slate-700">
                      {currentUser.username.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#0071E3] text-white flex items-center justify-center shadow-md border-2 border-white">
                  <Lock size={13} strokeWidth={2.5} />
                </div>
              </div>

              <h2 className="text-xl font-bold text-[#1D1D1F] tracking-tight">
                {currentUser.username}
              </h2>
              <p className="text-xs text-[#86868B] mt-1 font-medium">
                工作台已锁定 · 输入密码即可恢复
              </p>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs text-rose-600 flex items-center gap-2 animate-fade-in">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Alert */}
            {successMsg && (
              <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-600 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 size={15} className="flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Single Password Form */}
            <form onSubmit={handleQuickUnlock} className="mt-5 flex flex-col gap-3.5">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码恢复解锁"
                  className="w-full pl-10 pr-11 py-3 text-sm rounded-2xl bg-slate-100/80 border border-slate-200/80 focus:bg-white focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/15 transition-all outline-none text-[#1D1D1F] placeholder:text-slate-400 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                  title={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <ShieldCheck size={18} />
                <span>{isLoading ? '验证中...' : '解锁恢复'}</span>
              </button>

              {/* Switch Account link */}
              <div className="flex items-center justify-center mt-2 pt-2 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    if (onSwitchAccount) {
                      onSwitchAccount();
                    } else {
                      switchMode('login');
                    }
                  }}
                  className="text-xs text-[#6E6E73] hover:text-[#0071E3] hover:underline cursor-pointer font-medium transition-colors flex items-center gap-1"
                >
                  <span>切换账号登录</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ==================== 2. LOGIN / REGISTER MODE ==================== */
          <div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0071E3] via-[#0077ED] to-[#409CFF] text-white flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4 animate-bounce-subtle">
                {mode === 'login' ? (
                  <Lock size={28} strokeWidth={2.2} />
                ) : (
                  <UserPlus size={28} strokeWidth={2.2} />
                )}
              </div>

              <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
                {mode === 'login' ? '欢迎回来' : '新用户注册'}
              </h2>
              <p className="text-xs text-[#86868B] mt-1.5 max-w-xs font-normal">
                {mode === 'login'
                  ? '请输入您的用户名与密码登录工作台'
                  : '创建属于您的个人工作空间（无需手机邮箱）'}
              </p>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs text-rose-600 flex items-center gap-2 animate-fade-in">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Alert */}
            {successMsg && (
              <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-600 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 size={15} className="flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="mt-6 flex flex-col gap-3.5">
              {/* Username */}
              <div>
                <label className="block text-[11px] font-semibold text-[#6E6E73] mb-1.5 uppercase tracking-wider">
                  用户名
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={mode === 'login' ? '请输入用户名' : '请输入用户名 (2~16位)'}
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl bg-slate-100/80 border border-slate-200/80 focus:bg-white focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/15 transition-all outline-none text-[#1D1D1F] placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold text-[#6E6E73] mb-1.5 uppercase tracking-wider">
                  密码
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'login' ? '请输入密码' : '请设置密码 (至少6位)'}
                    className="w-full pl-10 pr-11 py-3 text-sm rounded-2xl bg-slate-100/80 border border-slate-200/80 focus:bg-white focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/15 transition-all outline-none text-[#1D1D1F] placeholder:text-slate-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                    title={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Register mode only) */}
              {mode === 'register' && (
                <div className="animate-fade-in">
                  <label className="block text-[11px] font-semibold text-[#6E6E73] mb-1.5 uppercase tracking-wider">
                    确认密码
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <ShieldCheck size={16} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="请再次输入密码以防手抖"
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl bg-slate-100/80 border border-slate-200/80 focus:bg-white focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/15 transition-all outline-none text-[#1D1D1F] placeholder:text-slate-400 font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Remember Me checkbox (Login mode only) */}
              {mode === 'login' && (
                <div className="flex items-center justify-between mt-1 px-1">
                  <label className="flex items-center gap-2 text-xs text-[#424245] cursor-pointer hover:text-[#1D1D1F] transition-colors">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#0071E3] focus:ring-[#0071E3] cursor-pointer accent-[#0071E3]"
                    />
                    <span className="font-medium">记住我（保持登录 30 天）</span>
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-3.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {mode === 'login' ? (
                  <>
                    <ShieldCheck size={18} />
                    <span>{isLoading ? '登录中...' : '登录'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>{isLoading ? '注册中...' : '立即注册'}</span>
                  </>
                )}
              </button>

              {/* Toggle Login / Register Switch */}
              <div className="flex items-center justify-center mt-3 pt-3 border-t border-slate-200/60">
                {mode === 'login' ? (
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="text-xs text-[#0071E3] hover:text-[#005bb5] hover:underline cursor-pointer font-medium transition-colors"
                  >
                    没有账号？<span className="font-semibold">新用户注册</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-xs text-[#0071E3] hover:text-[#005bb5] hover:underline cursor-pointer font-medium transition-colors"
                  >
                    已有账号？<span className="font-semibold">直接登录</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.45s ease-in-out;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

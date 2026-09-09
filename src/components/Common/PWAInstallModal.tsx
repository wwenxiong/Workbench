import React from 'react';
import { Download, Monitor, Smartphone, Share2, PlusSquare, X, CheckCircle2, Sparkles } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS?: boolean;
  onNativeInstall?: () => void;
  isInstallable?: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isIOS = false,
  onNativeInstall,
  isInstallable = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-[#4E5969] hover:text-[#1D2129] hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header with App Icon */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#1677FF] to-[#5E5CE6] p-0.5 shadow-md flex items-center justify-center flex-shrink-0">
            <img src="/pwa-192x192.png" alt="工作台图标" className="w-full h-full rounded-2xl object-cover" />
          </div>
          <div>
            <h3 className="text-[18px] font-semibold text-[#1D2129] flex items-center gap-1.5">
              <span>安装个人效率工作台</span>
              <span className="text-[12px] px-2 py-0.5 rounded-full bg-blue-50 text-[#1677FF] font-medium">PWA</span>
            </h3>
            <p className="text-[13px] text-[#4E5969] mt-0.5">像原生桌面 / 手机 App 一样流畅使用</p>
          </div>
        </div>

        {/* App Advantages */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-[#1677FF] shrink-0 mt-0.5" />
            <div className="text-[13px]">
              <div className="font-medium text-[#1D2129]">独立窗口运行</div>
              <div className="text-[12px] text-[#86909C] mt-0.5">无浏览器边框与多余地址栏</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
            <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[13px]">
              <div className="font-medium text-[#1D2129]">桌面快捷直达</div>
              <div className="text-[12px] text-[#86909C] mt-0.5">一键固定在任务栏或桌面</div>
            </div>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-4 mb-5 text-[13px] space-y-3">
          <div className="font-medium text-[#1D2129] flex items-center gap-1.5">
            {isIOS ? <Smartphone size={15} className="text-[#1677FF]" /> : <Monitor size={15} className="text-[#1677FF]" />}
            <span>{isIOS ? '苹果 iOS / iPad 安装指引' : '桌面浏览器安装步骤'}</span>
          </div>

          {isIOS ? (
            <ol className="list-decimal list-inside space-y-2 text-[#4E5969] leading-relaxed pl-0.5">
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-[#1677FF]">1.</span>
                <span>点击 Safari 浏览器底部的 <strong className="text-[#1D2129] inline-flex items-center gap-1"><Share2 size={13} className="inline" /> 分享</strong> 按钮。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-[#1677FF]">2.</span>
                <span>在弹出的选项菜单中向下滚动，找到并选择 <strong className="text-[#1D2129] inline-flex items-center gap-1"><PlusSquare size={13} className="inline" /> 添加到主屏幕</strong>。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-[#1677FF]">3.</span>
                <span>点击右上角的 <strong className="text-[#1677FF]">“添加”</strong>，即可在手机桌面生成专属应用图标。</span>
              </li>
            </ol>
          ) : (
            <div className="space-y-2 text-[#4E5969] leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-[#1677FF]">A.</span>
                <span>
                  <strong>快捷一键安装</strong>：若浏览器已支持，点击下方按钮将直接弹出系统安装确认。
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-[#1677FF]">B.</span>
                <span>
                  <strong>手动安装</strong>：请查看当前浏览器<strong>地址栏最右侧</strong>（通常有一个形如 <Download size={13} className="inline text-[#1677FF]" /> 的“安装应用”小图标），点击即可一键保存到桌面。
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {onNativeInstall && isInstallable ? (
            <button
              type="button"
              onClick={() => {
                onNativeInstall();
                onClose();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#1677FF] hover:bg-blue-600 active:scale-98 text-white text-[14px] font-medium shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download size={15} />
              <span>立即安装到桌面</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#1677FF] hover:bg-blue-600 active:scale-98 text-white text-[14px] font-medium shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>我知道了</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

interface PWAPromptProps {
  deferredPrompt: any;
  onInstall: () => void;
  onDismiss: () => void;
}

export const PWAPrompt: React.FC<PWAPromptProps> = ({ deferredPrompt, onInstall, onDismiss }) => {
  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-[#2e211d] text-[#f4efe8] p-4 rounded-3xl border border-[#a19284]/40 shadow-2xl flex items-start gap-3 relative">
        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 text-[#a19284] hover:text-[#f4efe8] p-1 rounded-full bg-[#1b1311]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-10 h-10 rounded-2xl bg-[#8c3a27] flex items-center justify-center shrink-0 shadow-md">
          <Smartphone className="w-5 h-5 text-[#f4efe8]" />
        </div>

        <div className="flex-1 pr-6">
          <div className="flex items-center gap-1 text-[10px] font-bold text-[#e2d7c9] uppercase tracking-widest font-['Cinzel']">
            <Sparkles className="w-3 h-3 fill-[#e2d7c9]" />
            <span>Official PWA App</span>
          </div>
          <h4 className="font-['Playfair_Display'] font-black text-sm text-[#f4efe8] mt-0.5">
            Install THE PUFF CO.
          </h4>
          <p className="text-[11px] text-[#e2d7c9] mt-0.5 leading-tight">
            Install on your device home screen for offline access & instant POS billing!
          </p>

          <button
            onClick={onInstall}
            className="mt-3 w-full py-2 bg-[#8c3a27] hover:bg-[#732f1f] text-[#f4efe8] font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>INSTALL APP NOW</span>
          </button>
        </div>
      </div>
    </div>
  );
};

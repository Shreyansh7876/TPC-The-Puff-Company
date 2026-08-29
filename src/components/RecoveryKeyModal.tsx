import React, { useState } from 'react';
import { Key, Copy, Check, Download, AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface RecoveryKeyModalProps {
  isOpen: boolean;
  recoveryKey: string;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  requireConfirmation?: boolean;
}

export const RecoveryKeyModal: React.FC<RecoveryKeyModalProps> = ({
  isOpen,
  recoveryKey,
  onClose,
  title = 'Your New Recovery Key',
  subtitle = 'Please save this key in a secure location. You will need it to recover access if you forget your password.',
  requireConfirmation = true,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [hasConfirmed, setHasConfirmed] = useState<boolean>(!requireConfirmation);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = () => {
    const textContent = `========================================
THE PUFF CO. POS - RECOVERY KEY
========================================
Key: ${recoveryKey}
Generated: ${new Date().toLocaleString()}
Store: The Puff Co. Smart POS System

IMPORTANT INSTRUCTIONS:
- Store this file safely (e.g., in password manager, offline USB, or print it).
- If you forget your POS password, you can reset it on the login screen using this key.
- Each time a password is reset, a new recovery key is generated and this one will become invalid.
========================================`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TPC_POS_RECOVERY_KEY_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#f4efe8] rounded-3xl border border-[#a19284]/40 shadow-2xl max-w-lg w-full p-5 sm:p-7 space-y-5 text-[#2e211d] relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#8c3a27] text-[#f4efe8] flex items-center justify-center shadow-md shrink-0">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-['Playfair_Display'] font-black text-lg text-[#2e211d] leading-tight">
                {title}
              </h3>
              <p className="text-xs text-[#a19284] mt-0.5">
                Master Emergency Access Key
              </p>
            </div>
          </div>

          {!requireConfirmation && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[#e2d7c9] text-[#a19284] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-xs text-[#2e211d]/90 leading-relaxed">
          {subtitle}
        </p>

        {/* The Key Box */}
        <div className="p-4 bg-white rounded-2xl border-2 border-[#8c3a27]/40 shadow-inner space-y-2.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#a19284] uppercase tracking-wider">
            <span>Recovery Key Code</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">ACTIVE</span>
          </div>

          <div className="p-3 bg-[#f4efe8]/60 rounded-xl border border-[#a19284]/30 flex items-center justify-between gap-2">
            <code className="font-mono font-black text-base sm:text-lg text-[#8c3a27] tracking-wider select-all break-all">
              {recoveryKey}
            </code>
          </div>

          {/* Action buttons for key */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#2e211d] text-[#f4efe8] hover:bg-[#1f1614]'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Key Copied!' : 'Copy Key'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="py-2 px-3 rounded-xl text-xs font-bold bg-[#e2d7c9] hover:bg-[#d6c9b8] text-[#2e211d] border border-[#a19284]/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#8c3a27]" />
              <span>Download .txt</span>
            </button>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px] leading-relaxed">
            <p className="font-bold text-amber-900">Important Security Notice:</p>
            <p className="text-amber-800/90">
              Anyone with this recovery key can reset the master POS password. Keep it confidential.
              If you reset your password in the future, this key will be automatically invalidated and replaced.
            </p>
          </div>
        </div>

        {/* Confirmation Checkbox if required */}
        {requireConfirmation && (
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/70 border border-[#a19284]/30 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasConfirmed}
              onChange={(e) => setHasConfirmed(e.target.checked)}
              className="w-4 h-4 accent-[#8c3a27] rounded shrink-0 cursor-pointer"
            />
            <span className="text-xs font-bold text-[#2e211d]">
              I have safely copied or downloaded my Recovery Key.
            </span>
          </label>
        )}

        {/* Footer Button */}
        <div>
          <button
            type="button"
            onClick={onClose}
            disabled={requireConfirmation && !hasConfirmed}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
              requireConfirmation && !hasConfirmed
                ? 'bg-[#a19284]/40 text-[#f4efe8]/70 cursor-not-allowed'
                : 'bg-[#8c3a27] hover:bg-[#722f1f] text-[#f4efe8] cursor-pointer active:scale-[0.99]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Continue to POS Terminal</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck, 
  HelpCircle, 
  RotateCcw,
  Sparkles,
  Store,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { securityService } from '../services/securityService';
import { settingsStore } from '../services/settingsStore';
import { RecoveryKeyModal } from './RecoveryKeyModal';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Forgot Password / Recovery Flow State
  const [isForgotMode, setIsForgotMode] = useState<boolean>(false);
  const [recoveryKeyInput, setRecoveryKeyInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [recoveryError, setRecoveryError] = useState<string>('');
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState<string>('');

  // Newly Generated Recovery Key Modal State
  const [newRecoveryKey, setNewRecoveryKey] = useState<string>('');
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState<boolean>(false);

  // Store Brand Details
  const settings = settingsStore.getSettings();
  const storeName = settings.storeProfile.storeName || 'THE PUFF CO.';
  const storeLogoUrl = settings.storeProfile.storeLogoUrl || settings.storeProfile.headerLogoUrl;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await securityService.login(password);
      if (res.success) {
        onLoginSuccess();
      } else {
        setErrorMessage(res.message || 'Incorrect password.');
        setPassword('');
      }
    } catch (err: any) {
      setErrorMessage('Authentication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccessMessage('');

    const cleanKey = recoveryKeyInput.trim();
    if (!cleanKey) {
      setRecoveryError('Please enter your Recovery Key.');
      return;
    }

    if (!newPasswordInput.trim()) {
      setRecoveryError('Please enter a new password.');
      return;
    }

    if (newPasswordInput.length < 3) {
      setRecoveryError('New password must be at least 3 characters.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setRecoveryError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await securityService.resetPasswordWithRecoveryKey(cleanKey, newPasswordInput);
      if (res.success) {
        setNewRecoveryKey(res.newRecoveryKey);
        setIsRecoveryModalOpen(true);
      } else {
        setRecoveryError(res.message || 'Invalid Recovery Key.');
      }
    } catch (err: any) {
      setRecoveryError('Error resetting password. Please check your Recovery Key.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecoveryModalDismiss = () => {
    setIsRecoveryModalOpen(false);
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-[#231916] text-[#f4efe8] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Subtle Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#f4efe8 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Card Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center">
            {storeLogoUrl ? (
              <img
                src={storeLogoUrl}
                alt={storeName}
                className="h-16 w-auto max-w-[200px] object-contain rounded-2xl bg-[#2e211d] p-1.5 border border-[#a19284]/30 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#8c3a27] text-[#f4efe8] flex items-center justify-center font-black font-['Playfair_Display'] text-2xl shadow-xl border border-[#a19284]/40">
                TPC
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-['Playfair_Display'] font-black text-[#f4efe8] tracking-wide uppercase">
              {storeName}
            </h1>
            <p className="text-xs text-[#a19284] tracking-widest uppercase font-bold mt-1">
              Commercial POS System Terminal
            </p>
          </div>
        </div>

        {/* Main Authentication Card */}
        <div className="bg-[#2e211d] rounded-3xl border border-[#a19284]/30 shadow-2xl p-6 sm:p-8 space-y-6">
          {!isForgotMode ? (
            /* STANDARD LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#a19284]/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#8c3a27]/20 text-[#8c3a27] border border-[#8c3a27]/40">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#f4efe8]">Terminal Access Lock</h2>
                    <p className="text-[10px] text-[#a19284]">Enter password to unlock billing & operations</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                  PROTECTED
                </span>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-950/60 rounded-xl border border-rose-800/60 text-xs text-rose-200 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#e2d7c9] block">
                  POS Master Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (default: 1234)"
                    autoFocus
                    className="w-full pl-4 pr-11 py-3.5 bg-[#231916] border border-[#a19284]/40 rounded-xl text-base font-semibold text-[#f4efe8] placeholder:text-[#a19284]/50 focus:outline-none focus:border-[#8c3a27] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a19284] hover:text-[#f4efe8] transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-[#8c3a27] hover:bg-[#722f1f] active:scale-[0.99] text-[#f4efe8] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#8c3a27]/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmitting ? 'Verifying...' : 'Unlock POS Terminal'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <div className="pt-2 flex items-center justify-between text-xs text-[#a19284]">
                <span className="text-[11px]">Initial default: <code className="bg-[#231916] px-1.5 py-0.5 rounded text-[#e2d7c9] font-bold">1234</code></span>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(true);
                    setErrorMessage('');
                  }}
                  className="font-bold text-[#e2d7c9] hover:text-[#f4efe8] hover:underline cursor-pointer transition-all"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          ) : (
            /* FORGOT PASSWORD / RECOVERY FORM */
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#a19284]/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/40">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#f4efe8]">Password Recovery</h2>
                    <p className="text-[10px] text-[#a19284]">Reset your password using your Recovery Key</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(false);
                    setRecoveryError('');
                  }}
                  className="text-xs font-bold text-[#a19284] hover:text-[#f4efe8] transition-colors cursor-pointer"
                >
                  Back to Login
                </button>
              </div>

              {recoveryError && (
                <div className="p-3 bg-rose-950/60 rounded-xl border border-rose-800/60 text-xs text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{recoveryError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#e2d7c9] block">
                  Your Recovery Key
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={recoveryKeyInput}
                    onChange={(e) => setRecoveryKeyInput(e.target.value.toUpperCase())}
                    placeholder="e.g. TPC-XXXX-XXXX-XXXX"
                    autoFocus
                    className="w-full pl-3.5 pr-4 py-3 bg-[#231916] border border-[#a19284]/40 rounded-xl text-sm font-mono font-bold text-[#f4efe8] placeholder:text-[#a19284]/40 focus:outline-none focus:border-amber-500 transition-all uppercase"
                  />
                </div>
                <p className="text-[10px] text-[#a19284]">
                  Enter the master recovery code generated when your POS was set up.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#e2d7c9] block">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Min. 3 characters"
                      className="w-full pl-3 pr-9 py-2.5 bg-[#231916] border border-[#a19284]/40 rounded-xl text-sm font-semibold text-[#f4efe8] placeholder:text-[#a19284]/40 focus:outline-none focus:border-[#8c3a27]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a19284] hover:text-[#f4efe8]"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#e2d7c9] block">
                    Confirm Password
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3 py-2.5 bg-[#231916] border border-[#a19284]/40 rounded-xl text-sm font-semibold text-[#f4efe8] placeholder:text-[#a19284]/40 focus:outline-none focus:border-[#8c3a27]"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#231916] rounded-xl border border-[#a19284]/30 text-[11px] text-[#a19284] space-y-1">
                <p className="font-bold text-[#e2d7c9] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Safe Reset Guarantee:</span>
                </p>
                <p className="text-[10px] text-[#a19284] leading-relaxed">
                  Resetting the password will generate a fresh Recovery Key and will NOT affect your orders, customers, inventory, sales, or settings.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(false);
                    setRecoveryError('');
                  }}
                  className="w-1/3 py-3 px-3 bg-[#231916] hover:bg-[#3d2c27] text-[#e2d7c9] rounded-xl font-bold text-xs border border-[#a19284]/30 transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-3 px-4 bg-amber-700 hover:bg-amber-600 active:scale-[0.99] text-[#f4efe8] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Verifying...' : 'Reset & Generate Key'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security Info & Footer */}
        <div className="text-center space-y-1">
          <p className="text-[11px] text-[#a19284]">
            End-to-End Encrypted Terminal • Dual-Shield Offline Database Protection
          </p>
          <p className="text-[10px] text-[#a19284]/60">
            The Puff Co. POS v2.4.0
          </p>
        </div>
      </div>

      {/* Recovery Key Modal for New Key Display */}
      <RecoveryKeyModal
        isOpen={isRecoveryModalOpen}
        recoveryKey={newRecoveryKey}
        onClose={handleRecoveryModalDismiss}
        title="New Recovery Key Generated"
        subtitle="Your password has been successfully reset! A new recovery key has been generated and your previous key is now permanently invalidated. Please save this new key safely."
        requireConfirmation={true}
      />
    </div>
  );
};

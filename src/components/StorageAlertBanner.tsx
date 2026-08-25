import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { persistentDb } from '../services/persistentDb';

export const StorageAlertBanner: React.FC = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsub = persistentDb.subscribeErrors((msg) => {
      setErrorMessage(msg);
    });
    return () => unsub();
  }, []);

  if (!errorMessage && !successNotice) return null;

  return (
    <div className="bg-[#b93826] text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-medium z-50 animate-in slide-in-from-top duration-200">
      <div className="flex items-center gap-2 max-w-4xl">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-200" />
        <span>{errorMessage || successNotice}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setErrorMessage(null);
            setSuccessNotice('Retrying persistent storage write...');
            setTimeout(() => setSuccessNotice(null), 3000);
          }}
          className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
        <button
          onClick={() => {
            setErrorMessage(null);
            setSuccessNotice(null);
          }}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

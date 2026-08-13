import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Key, 
  ShieldCheck, 
  Copy, 
  Check, 
  Database
} from 'lucide-react';
import { SyncStatus } from '../types';
import { livePuffStore } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
}

export const GoogleSheetsSyncModal: React.FC<Props> = ({ isOpen, onClose, syncStatus }) => {
  const [customSheetId, setCustomSheetId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  const handleConnectSheet = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await livePuffStore.connectGoogleSheets(customSheetId.trim() || undefined);
      if (res.spreadsheetId) {
        setMessage({
          type: 'success',
          text: `Connected to Google Sheet! Spreadsheet ID: ${res.spreadsheetId}`
        });
      } else {
        setMessage({
          type: 'error',
          text: res.error || 'Failed to connect to Google Sheets API.'
        });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error initializing Google Sheet' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySampleKey = () => {
    navigator.clipboard.writeText(syncStatus.spreadsheetId || '');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2e211d]/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#f4efe8] text-[#2e211d] border border-[#a19284]/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#a19284]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8c3a27]/10 border border-[#8c3a27]/30 text-[#8c3a27] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Playfair_Display'] font-black text-xl text-[#2e211d]">
                Google Sheets Database & Cloud Sync
              </h3>
              <p className="text-xs text-[#a19284] font-medium">
                Bills, KOTs, Inventory & Menu read/write directly to Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#a19284] hover:text-[#2e211d] bg-[#e2d7c9] hover:bg-[#a19284]/20 w-8 h-8 rounded-full flex items-center justify-center font-black transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="space-y-6 pt-4 text-sm">
          {/* Connection Status Card */}
          <div className="p-4 rounded-xl bg-[#e2d7c9]/40 border border-[#a19284]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#8c3a27]" />
                <span className="font-bold text-[#2e211d]">Database Connection Status</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                syncStatus.googleSheetsConnected 
                  ? 'bg-[#8c3a27]/10 text-[#8c3a27] border border-[#8c3a27]/30' 
                  : 'bg-[#a19284]/20 text-[#817366] border border-[#a19284]/30'
              }`}>
                {syncStatus.googleSheetsConnected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Google Sheets Active
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    Local Memory Mode
                  </>
                )}
              </span>
            </div>

            {syncStatus.spreadsheetId ? (
              <div className="space-y-2 pt-2 border-t border-[#a19284]/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#a19284]">Spreadsheet ID:</span>
                  <div className="flex items-center gap-2 font-mono text-[#2e211d] bg-[#f4efe8] px-2.5 py-1 rounded border border-[#a19284]/40">
                    <span>{syncStatus.spreadsheetId}</span>
                    <button onClick={handleCopySampleKey} className="text-[#a19284] hover:text-[#2e211d]" title="Copy ID">
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-[#8c3a27]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[#a19284]">View Spreadsheet Online:</span>
                  <a
                    href={syncStatus.spreadsheetUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8c3a27] hover:underline"
                  >
                    <span>Open in Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#a19284]">
                No spreadsheet ID linked yet. Click "Authorize Google Account" or paste a spreadsheet ID below to sync real-time.
              </p>
            )}
          </div>

          {/* User Action Controls */}
          <div className="p-4 rounded-xl bg-[#e2d7c9]/40 border border-[#a19284]/30 space-y-4">
            <h4 className="font-bold text-[#2e211d] text-xs uppercase tracking-wider">Connect or Switch Google Sheet</h4>
            
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <a
                href="/api/auth/google"
                className="flex-1 bg-[#2e211d] hover:bg-[#1b1311] text-[#f4efe8] font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all text-center"
              >
                <ShieldCheck className="w-4 h-4 text-[#e2d7c9]" />
                <span>Authorize Google Account (OAuth)</span>
              </a>

              <button
                onClick={handleConnectSheet}
                disabled={isLoading}
                className="bg-[#8c3a27] hover:bg-[#732f1f] disabled:opacity-50 text-[#f4efe8] font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Auto-Create POS Sheet</span>
              </button>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-[#a19284] mb-1">
                Or Attach Existing Google Sheet ID:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSheetId}
                  onChange={(e) => setCustomSheetId(e.target.value)}
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="flex-1 bg-[#f4efe8] border border-[#a19284]/50 rounded-xl px-3 py-2 text-xs text-[#2e211d] focus:outline-none focus:border-[#8c3a27] font-mono"
                />
                <button
                  onClick={handleConnectSheet}
                  disabled={!customSheetId.trim() || isLoading}
                  className="bg-[#2e211d] hover:bg-[#1b1311] disabled:opacity-40 text-[#f4efe8] font-bold px-3 py-2 rounded-xl text-xs transition-colors"
                >
                  Link Sheet
                </button>
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-xs font-medium ${
                message.type === 'success' ? 'bg-[#8c3a27]/10 border border-[#8c3a27]/30 text-[#8c3a27]' : 'bg-red-100 border border-red-300 text-red-800'
              }`}>
                {message.text}
              </div>
            )}
          </div>

          {/* Setup Instructions Guide */}
          <div className="p-4 rounded-xl bg-[#e2d7c9]/40 border border-[#a19284]/30 space-y-3">
            <div className="flex items-center gap-2 text-[#8c3a27]">
              <Key className="w-4 h-4" />
              <h4 className="font-extrabold text-[#2e211d] text-xs uppercase tracking-wider">
                Setup Guide: Google Sheets Credentials
              </h4>
            </div>

            <p className="text-xs text-[#2e211d] leading-relaxed">
              To connect your own Google Sheet directly, follow these 3 quick steps:
            </p>

            <div className="space-y-2.5 pt-1 text-xs">
              <div className="p-3 bg-[#f4efe8] rounded-lg border border-[#a19284]/30 space-y-1">
                <div className="font-bold text-[#2e211d] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#8c3a27]/20 text-[#8c3a27] text-[10px] flex items-center justify-center font-black">1</span>
                  <span>Create a Google Cloud Project</span>
                </div>
                <p className="text-[#a19284] pl-6 leading-relaxed">
                  Go to Google Cloud Console &gt; Create a project named <em>THE PUFF CO. POS</em>.
                </p>
              </div>

              <div className="p-3 bg-[#f4efe8] rounded-lg border border-[#a19284]/30 space-y-1">
                <div className="font-bold text-[#2e211d] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#8c3a27]/20 text-[#8c3a27] text-[10px] flex items-center justify-center font-black">2</span>
                  <span>Enable Google Sheets API</span>
                </div>
                <p className="text-[#a19284] pl-6 leading-relaxed">
                  In APIs & Services &gt; Library, enable <strong>Google Sheets API</strong> & <strong>Google Drive API</strong>.
                </p>
              </div>

              <div className="p-3 bg-[#f4efe8] rounded-lg border border-[#a19284]/30 space-y-1">
                <div className="font-bold text-[#2e211d] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#8c3a27]/20 text-[#8c3a27] text-[10px] flex items-center justify-center font-black">3</span>
                  <span>Authorize & Link</span>
                </div>
                <p className="text-[#a19284] pl-6 leading-relaxed">
                  Click <strong>Authorize Google Account</strong> above to sync your menu, inventory, and orders safely.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-5 border-t border-[#a19284]/30 mt-6 flex items-center justify-between">
          <span className="text-xs text-[#a19284]">
            Last Synced: {syncStatus.lastSyncedAt || 'Just now'}
          </span>
          <button
            onClick={onClose}
            className="bg-[#2e211d] hover:bg-[#1b1311] text-[#f4efe8] font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};

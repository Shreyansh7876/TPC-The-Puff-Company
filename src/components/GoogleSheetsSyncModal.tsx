import React, { useState, useEffect } from 'react';
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
  Database,
  Mail
} from 'lucide-react';
import { SyncStatus } from '../types';
import { livePuffStore } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
}

export function extractGoogleSheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  // 1. Matches standard Google Sheet URLs: /spreadsheets/d/([a-zA-Z0-9-_]+)
  const sheetMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch && sheetMatch[1]) {
    return sheetMatch[1];
  }

  // 2. Matches raw ID string directly (alphanumeric, dashes, underscores >= 20 chars)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

export function isGoogleAppsScriptUrl(input: string): boolean {
  if (!input) return false;
  return input.trim().includes('script.google.com/macros/s/');
}

export const GoogleSheetsSyncModal: React.FC<Props> = ({ isOpen, onClose, syncStatus }) => {
  const [customSheetInput, setCustomSheetInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean;
    mode?: string;
    email?: string;
    spreadsheetId?: string | null;
    spreadsheetUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/auth/google/status')
        .then((r) => r.json())
        .then((data) => setAuthStatus(data))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectSheet = async () => {
    setIsLoading(true);
    setMessage(null);

    const input = customSheetInput.trim();

    if (isGoogleAppsScriptUrl(input)) {
      setMessage({
        type: 'error',
        text: 'You entered a Google Apps Script URL (/macros/s/.../exec). Please paste your Google Sheet link instead (e.g., https://docs.google.com/spreadsheets/d/your-sheet-id/edit).'
      });
      setIsLoading(false);
      return;
    }

    const cleanSpreadsheetId = extractGoogleSheetId(input);

    try {
      const res = await livePuffStore.connectGoogleSheets(cleanSpreadsheetId || undefined);
      if (res && res.spreadsheetId) {
        if (res.authenticated) {
          setMessage({
            type: 'success',
            text: `Successfully connected to Google Sheet via Service Account! (ID: ${res.spreadsheetId})`
          });
        } else {
          setMessage({
            type: 'info',
            text: `Connected to Google Sheet: ${res.spreadsheetId}. POS data synchronized.`
          });
        }
      } else {
        setMessage({
          type: 'error',
          text: res?.error || 'Failed to connect to Google Sheets API.'
        });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error initializing Google Sheet' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySampleKey = () => {
    navigator.clipboard.writeText(syncStatus.spreadsheetId || authStatus?.spreadsheetId || '');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyEmail = () => {
    if (authStatus?.email) {
      navigator.clipboard.writeText(authStatus.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const isServiceAccount = authStatus?.mode === 'service_account' || Boolean(authStatus?.email?.includes('gserviceaccount.com'));

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
        <div className="space-y-5 pt-4 text-sm">
          {/* Service Account Banner */}
          {isServiceAccount && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-800">
                    Service Account Mode (No OAuth Required)
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                  Server Authenticated
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-emerald-200 text-xs">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <Mail className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="font-mono text-[11px] truncate">{authStatus?.email}</span>
                </div>
                <button
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors"
                >
                  {copiedEmail ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedEmail ? 'Copied!' : 'Copy Email'}</span>
                </button>
              </div>
              <p className="text-[11px] text-emerald-800 leading-tight">
                <strong>Important:</strong> Ensure your Google Sheet is shared with this service account email as an <strong>Editor</strong>.
              </p>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="p-4 rounded-xl bg-[#e2d7c9]/40 border border-[#a19284]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#8c3a27]" />
                <span className="font-bold text-[#2e211d]">Database Connection Status</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                syncStatus.googleSheetsConnected 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {syncStatus.googleSheetsConnected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Google Sheets Active (Live Sync)
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Pending Connection
                  </>
                )}
              </span>
            </div>

            {(syncStatus.spreadsheetId || authStatus?.spreadsheetId) ? (
              <div className="space-y-2 pt-2 border-t border-[#a19284]/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#a19284]">Connected Spreadsheet ID:</span>
                  <div className="flex items-center gap-2 font-mono text-[#2e211d] bg-[#f4efe8] px-2.5 py-1 rounded border border-[#a19284]/40">
                    <span className="truncate max-w-[280px]">
                      {syncStatus.spreadsheetId || authStatus?.spreadsheetId}
                    </span>
                    <button onClick={handleCopySampleKey} className="text-[#a19284] hover:text-[#2e211d]" title="Copy ID">
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-[#8c3a27]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[#a19284]">Master Sheet in Google Drive:</span>
                  <a
                    href={syncStatus.spreadsheetUrl || authStatus?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${syncStatus.spreadsheetId || authStatus?.spreadsheetId}/edit`}
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
                No spreadsheet ID linked yet. Paste your Google Sheet URL or ID below and click &quot;Sync &amp; Initialize Sheet&quot;.
              </p>
            )}
          </div>

          {/* User Action Controls */}
          <div className="p-4 rounded-xl bg-[#e2d7c9]/40 border border-[#a19284]/30 space-y-4">
            <h4 className="font-bold text-[#2e211d] text-xs uppercase tracking-wider">Sync &amp; Manage Database</h4>
            
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <button
                onClick={handleConnectSheet}
                disabled={isLoading}
                className="flex-1 bg-[#8c3a27] hover:bg-[#732f1f] disabled:opacity-50 text-[#f4efe8] font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{syncStatus.googleSheetsConnected ? 'Force Refresh Sync' : 'Sync & Initialize POS Sheet'}</span>
              </button>

              {!isServiceAccount && (
                <a
                  href="/api/auth/google"
                  className="bg-[#2e211d] hover:bg-[#1b1311] text-[#f4efe8] font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all text-center"
                >
                  <ShieldCheck className="w-4 h-4 text-[#e2d7c9]" />
                  <span>Authorize Google Account</span>
                </a>
              )}
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-[#a19284] mb-1">
                Paste Custom Google Sheet Link or ID:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSheetInput}
                  onChange={(e) => setCustomSheetInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/your-id/edit"
                  className="flex-1 bg-[#f4efe8] border border-[#a19284]/50 rounded-xl px-3 py-2 text-xs text-[#2e211d] focus:outline-none focus:border-[#8c3a27] font-mono"
                />
                <button
                  onClick={handleConnectSheet}
                  disabled={!customSheetInput.trim() || isLoading}
                  className="bg-[#2e211d] hover:bg-[#1b1311] disabled:opacity-40 text-[#f4efe8] font-bold px-3.5 py-2 rounded-xl text-xs transition-colors shrink-0"
                >
                  Link Sheet
                </button>
              </div>
              <p className="text-[11px] text-[#a19284] mt-1">
                Tip: You can paste the complete URL directly from your browser.
              </p>
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-xs font-medium ${
                message.type === 'success' 
                  ? 'bg-emerald-100 border border-emerald-300 text-emerald-900' 
                  : message.type === 'info'
                  ? 'bg-amber-50 border border-amber-300 text-amber-900'
                  : 'bg-red-100 border border-red-300 text-red-800'
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
                Service Account Quick Setup Guide
              </h4>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div className="p-3 bg-[#f4efe8] rounded-lg border border-[#a19284]/30 space-y-1">
                <div className="font-bold text-[#2e211d] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#8c3a27]/20 text-[#8c3a27] text-[10px] flex items-center justify-center font-black">1</span>
                  <span>Create a Google Sheet</span>
                </div>
                <p className="text-[#a19284] pl-6 leading-relaxed">
                  Open <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-[#8c3a27] underline">sheets.new</a> to create a blank Google Sheet in your personal Google Drive.
                </p>
              </div>

              <div className="p-3 bg-[#f4efe8] rounded-lg border border-[#a19284]/30 space-y-1">
                <div className="font-bold text-[#2e211d] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#8c3a27]/20 text-[#8c3a27] text-[10px] flex items-center justify-center font-black">2</span>
                  <span>Share with Service Account</span>
                </div>
                <p className="text-[#a19284] pl-6 leading-relaxed">
                  Click <strong>Share</strong> in your Google Sheet, paste your Service Account email, and assign it as <strong>Editor</strong>.
                </p>
              </div>

              <div className="p-3 bg-[#f4efe8] rounded-lg border border-[#a19284]/30 space-y-1">
                <div className="font-bold text-[#2e211d] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#8c3a27]/20 text-[#8c3a27] text-[10px] flex items-center justify-center font-black">3</span>
                  <span>Link or Set Environment Variable</span>
                </div>
                <p className="text-[#a19284] pl-6 leading-relaxed">
                  Set <code>SPREADSHEET_ID</code> in your Vercel environment variables, or paste the link into the field above and click <strong>Link Sheet</strong>.
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

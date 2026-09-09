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
    <div className="fixed inset-0 z-50 bg-[#2e211d]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#f4efe8] text-[#2e211d] border border-[#a19284]/40 rounded-2xl max-w-lg sm:max-w-xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-[#a19284]/20 flex items-center justify-between shrink-0 bg-[#ede5db]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8c3a27]/10 border border-[#8c3a27]/30 text-[#8c3a27] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Playfair_Display'] font-black text-base sm:text-lg text-[#2e211d] leading-tight">
                Google Sheets Cloud Database
              </h3>
              <p className="text-[11px] text-[#a19284] font-medium leading-none mt-0.5">
                Orders, KOTs, Inventory & Menu synced in real-time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#a19284] hover:text-[#2e211d] bg-[#e2d7c9] hover:bg-[#a19284]/30 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors shrink-0"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3 text-xs">
          {/* Service Account Banner */}
          {isServiceAccount && (
            <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-300 text-emerald-950 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-800">
                    Service Account Connected
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                  Ready (No OAuth needed)
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-200/70">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <Mail className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span className="font-mono text-[11px] text-emerald-900 truncate select-all">{authStatus?.email}</span>
                </div>
                <button
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 transition-colors"
                >
                  {copiedEmail ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[10px] text-emerald-800 leading-tight">
                Share your Google Sheet with this email as <strong>Editor</strong>.
              </p>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="p-3 rounded-xl bg-[#e2d7c9]/40 border border-[#a19284]/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#8c3a27]" />
                <span className="font-bold text-xs text-[#2e211d]">Status:</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                syncStatus.googleSheetsConnected 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {syncStatus.googleSheetsConnected ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Google Sheets Active (Live Sync)
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Pending Connection
                  </>
                )}
              </span>
            </div>

            {(syncStatus.spreadsheetId || authStatus?.spreadsheetId) ? (
              <div className="space-y-1.5 pt-1.5 border-t border-[#a19284]/20 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#a19284] shrink-0">Spreadsheet ID:</span>
                  <div className="flex items-center gap-1.5 font-mono text-[#2e211d] bg-[#f4efe8] px-2 py-0.5 rounded border border-[#a19284]/40 max-w-[280px]">
                    <span className="truncate">
                      {syncStatus.spreadsheetId || authStatus?.spreadsheetId}
                    </span>
                    <button onClick={handleCopySampleKey} className="text-[#a19284] hover:text-[#2e211d] shrink-0" title="Copy ID">
                      {copiedKey ? <Check className="w-3 h-3 text-[#8c3a27]" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[#a19284]">Master Sheet in Drive:</span>
                  <a
                    href={syncStatus.spreadsheetUrl || authStatus?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${syncStatus.spreadsheetId || authStatus?.spreadsheetId}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#8c3a27] hover:underline"
                  >
                    <span>Open in Google Sheets</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[#a19284]">
                No spreadsheet linked yet. Paste your Google Sheet URL or ID below and click Link Sheet.
              </p>
            )}
          </div>

          {/* User Action Controls */}
          <div className="p-3 rounded-xl bg-[#e2d7c9]/40 border border-[#a19284]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#2e211d] text-[11px] uppercase tracking-wider">Sync &amp; Link Sheet</h4>
              {syncStatus.lastSyncedAt && (
                <span className="text-[10px] text-[#a19284]">
                  Synced: {syncStatus.lastSyncedAt}
                </span>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <button
                onClick={handleConnectSheet}
                disabled={isLoading}
                className="flex-1 bg-[#8c3a27] hover:bg-[#732f1f] disabled:opacity-50 text-[#f4efe8] font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{syncStatus.googleSheetsConnected ? 'Force Refresh Sync' : 'Sync & Initialize POS Sheet'}</span>
              </button>

              {!isServiceAccount && (
                <a
                  href="/api/auth/google"
                  className="bg-[#2e211d] hover:bg-[#1b1311] text-[#f4efe8] font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all text-center"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#e2d7c9]" />
                  <span>Authorize Google</span>
                </a>
              )}
            </div>

            <div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customSheetInput}
                  onChange={(e) => setCustomSheetInput(e.target.value)}
                  placeholder="Paste Google Sheet URL or ID here..."
                  className="flex-1 bg-[#f4efe8] border border-[#a19284]/50 rounded-xl px-2.5 py-1.5 text-xs text-[#2e211d] focus:outline-none focus:border-[#8c3a27] font-mono"
                />
                <button
                  onClick={handleConnectSheet}
                  disabled={!customSheetInput.trim() || isLoading}
                  className="bg-[#2e211d] hover:bg-[#1b1311] disabled:opacity-40 text-[#f4efe8] font-bold px-3 py-1.5 rounded-xl text-xs transition-colors shrink-0"
                >
                  Link Sheet
                </button>
              </div>
            </div>

            {message && (
              <div className={`p-2.5 rounded-lg text-xs font-medium ${
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

          {/* Compact 3-Step Setup Instructions Guide */}
          <div className="p-3 rounded-xl bg-[#e2d7c9]/40 border border-[#a19284]/30 space-y-2">
            <div className="flex items-center gap-1.5 text-[#8c3a27]">
              <Key className="w-3.5 h-3.5" />
              <h4 className="font-extrabold text-[#2e211d] text-[11px] uppercase tracking-wider">
                Quick Setup (3 Simple Steps)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5 text-[11px]">
              <div className="p-2 bg-[#f4efe8] rounded-lg border border-[#a19284]/20 space-y-0.5">
                <div className="font-bold text-[#2e211d] flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-[#8c3a27]/20 text-[#8c3a27] text-[9px] flex items-center justify-center font-black">1</span>
                  <span>Create Sheet</span>
                </div>
                <p className="text-[#a19284] text-[10px] leading-snug">
                  Open <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-[#8c3a27] underline">sheets.new</a> in Google Drive.
                </p>
              </div>

              <div className="p-2 bg-[#f4efe8] rounded-lg border border-[#a19284]/20 space-y-0.5">
                <div className="font-bold text-[#2e211d] flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-[#8c3a27]/20 text-[#8c3a27] text-[9px] flex items-center justify-center font-black">2</span>
                  <span>Share Editor</span>
                </div>
                <p className="text-[#a19284] text-[10px] leading-snug">
                  Share sheet with the Service Account email above.
                </p>
              </div>

              <div className="p-2 bg-[#f4efe8] rounded-lg border border-[#a19284]/20 space-y-0.5">
                <div className="font-bold text-[#2e211d] flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-[#8c3a27]/20 text-[#8c3a27] text-[9px] flex items-center justify-center font-black">3</span>
                  <span>Link &amp; Sync</span>
                </div>
                <p className="text-[#a19284] text-[10px] leading-snug">
                  Paste the URL above or set <code>SPREADSHEET_ID</code>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#a19284]/20 bg-[#ede5db]/60 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#a19284]">
            {syncStatus.googleSheetsConnected ? '✓ Sync Active' : 'Offline / Standalone Mode'}
          </span>
          <button
            onClick={onClose}
            className="bg-[#2e211d] hover:bg-[#1b1311] text-[#f4efe8] font-bold text-xs px-4 py-1.5 rounded-xl transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};

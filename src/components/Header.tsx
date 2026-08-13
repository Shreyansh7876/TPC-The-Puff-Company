import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, 
  ChefHat, 
  Package, 
  BarChart3, 
  Download,
  Settings,
  FileSpreadsheet,
  Users,
  Upload,
  Trash2,
  Store
} from 'lucide-react';
import { SyncStatus } from '../types';
import { settingsStore } from '../services/settingsStore';

export type AppViewMode = 'mobile_pos' | 'laptop_pos' | 'kot_display' | 'inventory' | 'sales' | 'customers' | 'setup';

interface HeaderProps {
  currentView: AppViewMode;
  onViewChange: (view: AppViewMode) => void;
  syncStatus: SyncStatus;
  deferredPrompt: any;
  onInstallPWA: () => void;
  onOpenSheetsSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  syncStatus,
  deferredPrompt,
  onInstallPWA,
  onOpenSheetsSync,
}) => {
  const [storeName, setStoreName] = useState<string>(
    settingsStore.getSettings().storeProfile.storeName || 'THE PUFF CO.'
  );
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string>(
    settingsStore.getSettings().storeProfile.headerLogoUrl || ''
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return settingsStore.subscribeSettings((settings) => {
      setStoreName(settings.storeProfile.storeName || 'THE PUFF CO.');
      setHeaderLogoUrl(settings.storeProfile.headerLogoUrl || '');
    });
  }, []);

  const handleHeaderLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;

      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const pngDataUrl = canvas.toDataURL('image/png');
          settingsStore.updateSection('storeProfile', { headerLogoUrl: pngDataUrl });
        } else {
          settingsStore.updateSection('storeProfile', { headerLogoUrl: rawDataUrl });
        }
      };

      img.onerror = () => {
        settingsStore.updateSection('storeProfile', { headerLogoUrl: rawDataUrl });
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveHeaderLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    settingsStore.updateSection('storeProfile', { headerLogoUrl: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#2e211d] text-[#f4efe8] border-b border-[#a19284]/30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Logo & Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div 
            onClick={() => onViewChange('laptop_pos')}
            className="cursor-pointer group flex items-center gap-2.5"
          >
            {headerLogoUrl ? (
              <img 
                src={headerLogoUrl} 
                alt={storeName} 
                className="h-9 w-auto max-w-[130px] object-contain rounded-xl bg-[#231916] p-0.5 border border-[#a19284]/30 shadow-sm" 
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#8c3a27] text-[#f4efe8] flex items-center justify-center font-black font-['Playfair_Display'] text-sm shadow-md border border-[#a19284]/30 shrink-0">
                TPC
              </div>
            )}

            <div className="flex flex-col leading-none">
              <span className="font-['Playfair_Display'] font-black text-base sm:text-lg text-[#f4efe8] tracking-wider uppercase">
                {storeName}
              </span>
              <span className="text-[9px] font-bold text-[#e2d7c9]/60 tracking-widest uppercase mt-0.5 hidden sm:block">
                Smart POS System
              </span>
            </div>
          </div>

          {/* Direct Header Logo Management Controls */}
          <div className="flex items-center gap-1 border-l border-[#a19284]/30 pl-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleHeaderLogoUpload} 
              accept="image/*" 
              className="hidden" 
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 rounded-lg bg-[#231916] hover:bg-[#3d2c27] text-[#e2d7c9] hover:text-white border border-[#a19284]/30 text-[10px] font-bold flex items-center gap-1 transition-all"
              title={headerLogoUrl ? "Change Header Logo" : "Upload Header Logo"}
            >
              <Upload className="w-3 h-3 text-[#e2d7c9]" />
              <span className="hidden lg:inline">{headerLogoUrl ? "Change Logo" : "Upload Logo"}</span>
            </button>

            {headerLogoUrl && (
              <button
                type="button"
                onClick={handleRemoveHeaderLogo}
                className="p-1 rounded-lg bg-[#231916] hover:bg-rose-950/60 text-[#a19284] hover:text-rose-300 border border-[#a19284]/30 transition-all"
                title="Remove Header Logo"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Tabs - Desktop */}
        <nav className="hidden md:flex items-center gap-1.5 bg-[#231916] p-1.5 rounded-xl border border-[#a19284]/30">
          <button
            onClick={() => onViewChange('laptop_pos')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'laptop_pos' || currentView === 'mobile_pos'
                ? 'bg-[#8c3a27] text-[#f4efe8] shadow-sm font-bold'
                : 'text-[#e2d7c9] hover:text-[#f4efe8] hover:bg-[#2e211d]'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Billing</span>
          </button>

          <button
            onClick={() => onViewChange('kot_display')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'kot_display'
                ? 'bg-[#8c3a27] text-[#f4efe8] shadow-sm font-bold'
                : 'text-[#e2d7c9] hover:text-[#f4efe8] hover:bg-[#2e211d]'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>KOT Kitchen</span>
          </button>

          <button
            onClick={() => onViewChange('inventory')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'inventory'
                ? 'bg-[#8c3a27] text-[#f4efe8] shadow-sm font-bold'
                : 'text-[#e2d7c9] hover:text-[#f4efe8] hover:bg-[#2e211d]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventory</span>
          </button>

          <button
            onClick={() => onViewChange('sales')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'sales'
                ? 'bg-[#8c3a27] text-[#f4efe8] shadow-sm font-bold'
                : 'text-[#e2d7c9] hover:text-[#f4efe8] hover:bg-[#2e211d]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Reports</span>
          </button>

          <button
            onClick={() => onViewChange('customers')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'customers'
                ? 'bg-[#8c3a27] text-[#f4efe8] shadow-sm font-bold'
                : 'text-[#e2d7c9] hover:text-[#f4efe8] hover:bg-[#2e211d]'
            }`}
            title="Customer Database & CRM"
          >
            <Users className="w-4 h-4" />
            <span>Customers</span>
          </button>

          <button
            onClick={() => onViewChange('setup')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'setup'
                ? 'bg-[#8c3a27] text-[#f4efe8] font-bold'
                : 'text-[#e2d7c9] hover:text-[#f4efe8] hover:bg-[#2e211d]'
            }`}
            title="System Settings & Control Center"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2">
          {/* Google Sheets Sync Button */}
          <button
            onClick={onOpenSheetsSync}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              syncStatus.googleSheetsConnected
                ? 'bg-[#e2d7c9]/20 border-[#a19284]/50 text-[#f4efe8] hover:bg-[#e2d7c9]/30'
                : 'bg-[#8c3a27]/30 border-[#8c3a27]/60 text-[#f4efe8] hover:bg-[#8c3a27]/50'
            }`}
            title="Google Sheets Database Connection"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#e2d7c9]" />
            <span className="hidden lg:inline">
              {syncStatus.googleSheetsConnected ? 'Sheets Sync' : 'Connect Sheet'}
            </span>
          </button>

          {/* PWA Install Button */}
          {deferredPrompt && (
            <button
              onClick={onInstallPWA}
              className="flex items-center gap-1.5 bg-[#8c3a27] hover:bg-[#732f1f] text-[#f4efe8] px-3 py-1.5 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around bg-[#231916] border-t border-[#a19284]/30 px-2 py-1.5 overflow-x-auto text-[11px]">
        <button
          onClick={() => onViewChange('laptop_pos')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg font-bold whitespace-nowrap ${
            currentView === 'laptop_pos' || currentView === 'mobile_pos' ? 'text-[#f4efe8] bg-[#8c3a27]' : 'text-[#a19284]'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Billing</span>
        </button>

        <button
          onClick={() => onViewChange('kot_display')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg font-bold whitespace-nowrap ${
            currentView === 'kot_display' ? 'text-[#f4efe8] bg-[#8c3a27]' : 'text-[#a19284]'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span>Kitchen</span>
        </button>

        <button
          onClick={() => onViewChange('inventory')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg font-bold whitespace-nowrap ${
            currentView === 'inventory' ? 'text-[#f4efe8] bg-[#8c3a27]' : 'text-[#a19284]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Stock</span>
        </button>

        <button
          onClick={() => onViewChange('sales')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg font-bold whitespace-nowrap ${
            currentView === 'sales' ? 'text-[#f4efe8] bg-[#8c3a27]' : 'text-[#a19284]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Reports</span>
        </button>

        <button
          onClick={() => onViewChange('customers')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg font-bold whitespace-nowrap ${
            currentView === 'customers' ? 'text-[#f4efe8] bg-[#8c3a27]' : 'text-[#a19284]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customers</span>
        </button>

        <button
          onClick={() => onViewChange('setup')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg font-bold whitespace-nowrap ${
            currentView === 'setup' ? 'text-[#f4efe8] bg-[#8c3a27]' : 'text-[#a19284]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
};

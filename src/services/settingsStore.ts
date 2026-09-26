import { 
  AppMasterSettings, 
  ActivityLogEntry, 
  InventoryAuditLog
} from '../types';
import { persistentDb } from './persistentDb';

const INITIAL_SETTINGS: AppMasterSettings = {
  storeProfile: {
    storeName: 'The Puff Co.',
    storeTagline: 'Pure Veg Gourmet Puffs & Fast Food',
    storeLogoUrl: '',
    headerLogoUrl: '',
    address: 'Shop #12, Gourmet Food Court, High Street Mall, Ahmedabad, Gujarat',
    contactNumber: '+91 98765 43210',
    email: 'orders@thepuffco.com',
    gstNumber: '24AAACT1234F1Z5',
    fssaiNumber: '10721001000456',
    currencySymbol: '₹',
    businessHours: '10:00 AM - 11:00 PM (Mon-Sun)',
  },
  billing: {
    invoicePrefix: 'TPC-',
    nextInvoiceNumber: 1001,
    gstRatePercent: 5,
    enableSplitTax: true,
    roundOffRule: 'NEAREST',
    receiptFooterText: 'Thank you for visiting The Puff Co.! Visit again for fresh hot gourmet puffs.',
    printLogoOnReceipt: true,
    printUpiQrOnReceipt: true,
  },
  printing: {
    paperWidth: '58mm',
    autoPrintInvoice: false,
    autoPrintKOT: false,
    printCustomerDetails: true,
    printCustomerNotes: true,
    printKitchenNotesOnKOT: true,
    printItemNotesOnKOT: true,
    fontSize: 'STANDARD',
    feedLines: 2,
    enableBeepOnPrint: true,
  },
  inventory: {
    lowStockAlertThreshold: 150,
    autoDeductOnSale: true,
    requireManagerPermissionForAdjustment: true,
    enableAuditTracking: true,
  },
  menu: {
    categories: [
      'Classic & Single Flavor Puffs',
      'Flavored Combo Puffs',
      'Chatni, Tandoori & Loaded Puffs',
      'Supreme Garlic & Double Cheese Puffs',
      'Company Signature Specials'
    ],
    productSorting: 'DEFAULT',
    quickAccessProductIds: [],
  },
  kot: {
    autoSendKOT: true,
    numberFormat: 'TOKEN_ONLY',
    soundNotifications: true,
    orderPriority: 'FIFO',
    tokenStartNumber: 101,
  },
  pos: {
    defaultViewMode: 'laptop_pos',
    defaultCategory: 'Classic & Single Flavor Puffs',
    defaultPaymentMethod: 'UPI',
    requireOrderConfirmation: true,
    soundAlerts: true,
    enableBillPreview: true,
    touchFriendlyMode: false,
  },
  payments: {
    enabledMethods: {
      CASH: true,
      UPI: true,
      CARD: true,
      SPLIT: true,
    },
    defaultMethod: 'UPI',
    upiId: 'thepuffcompany@upi',
  },
  pwa: {
    autoSync: true,
    syncFrequencySeconds: 4,
    appVersion: 'v2.5.0-Enterprise',
    buildVersion: '2026.07.30',
    lastUpdateDate: '2026-07-30',
  },
  analytics: {
    showWidgets: {
      revenue: true,
      orders: true,
      avgOrderValue: true,
      grossProfit: true,
      inventoryValue: true,
      peakHours: true,
      topProducts: true,
      categoryPerformance: true,
    },
    defaultDateRange: 'last30',
  }
};

type Listener<T> = (data: T) => void;

class SettingsStore {
  private settings: AppMasterSettings = { ...INITIAL_SETTINGS };
  private activityLogs: ActivityLogEntry[] = [];
  private auditLogs: InventoryAuditLog[] = [];
  private deletedCategories: Set<string> = new Set();

  private settingsListeners: Set<Listener<AppMasterSettings>> = new Set();
  private activityLogListeners: Set<Listener<ActivityLogEntry[]>> = new Set();
  private auditLogListeners: Set<Listener<InventoryAuditLog[]>> = new Set();

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    if (typeof window === 'undefined') return;

    try {
      const rawDel = localStorage.getItem('tpc_deleted_categories');
      if (rawDel) {
        const parsed = JSON.parse(rawDel);
        if (Array.isArray(parsed)) {
          this.deletedCategories = new Set(parsed);
        }
      }

      const savedSettings = localStorage.getItem('tpc_app_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed?.storeProfile) {
          if (parsed.storeProfile.storeLogoUrl === '/logo.png') {
            parsed.storeProfile.storeLogoUrl = '';
          }
          if (parsed.storeProfile.storeName === 'The Puff Company' || parsed.storeProfile.storeName === 'THE PUFF COMPANY') {
            parsed.storeProfile.storeName = 'The Puff Co.';
          }
          if (parsed.storeProfile.storeTagline?.includes('CRISPY')) {
            parsed.storeProfile.storeTagline = 'Pure Veg Gourmet Puffs & Fast Food';
          }
        }
        if (parsed?.billing?.receiptFooterText?.includes('The Puff Company')) {
          parsed.billing.receiptFooterText = parsed.billing.receiptFooterText.replace('The Puff Company', 'The Puff Co.');
        }

        const rawCategories = Array.isArray(parsed.menu?.categories)
          ? parsed.menu.categories
          : INITIAL_SETTINGS.menu.categories;
        const cleanCategories = rawCategories.filter((c: string) => !this.deletedCategories.has(c));

        this.settings = { 
          ...INITIAL_SETTINGS, 
          ...parsed,
          menu: {
            ...INITIAL_SETTINGS.menu,
            ...(parsed.menu || {}),
            categories: cleanCategories.length > 0 ? cleanCategories : (rawCategories.length > 0 ? cleanCategories : ['General'])
          },
          inventory: {
            ...INITIAL_SETTINGS.inventory,
            ...(parsed.inventory || {})
          },
          storeProfile: {
            ...INITIAL_SETTINGS.storeProfile,
            ...(parsed.storeProfile || {})
          },
          printing: {
            ...INITIAL_SETTINGS.printing,
            ...(parsed.printing || {})
          },
          kot: {
            ...INITIAL_SETTINGS.kot,
            ...(parsed.kot || {})
          }
        };
      } else {
        this.settings.menu.categories = this.settings.menu.categories.filter((c) => !this.deletedCategories.has(c));
      }

      const savedActivityLogs = localStorage.getItem('tpc_activity_logs');
      if (savedActivityLogs) {
        this.activityLogs = JSON.parse(savedActivityLogs);
      }

      const savedAuditLogs = localStorage.getItem('tpc_audit_logs');
      if (savedAuditLogs) {
        this.auditLogs = JSON.parse(savedAuditLogs);
      }
    } catch (err) {
      console.warn('Failed to load settings from localStorage:', err);
    }
  }

  private saveToLocalStorage(syncRemote: boolean = true) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('tpc_app_settings', JSON.stringify(this.settings));
      localStorage.setItem('tpc_activity_logs', JSON.stringify(this.activityLogs.slice(0, 100)));
      localStorage.setItem('tpc_audit_logs', JSON.stringify(this.auditLogs.slice(0, 200)));

      if (syncRemote) {
        this.syncSettingsToGoogleSheets();
      }
    } catch (e) {
      console.error('Failed to write settings to localStorage:', e);
    }
  }

  public getActiveSpreadsheetId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('tpc_active_spreadsheet_id') || null;
  }

  public syncSettingsToGoogleSheets() {
    const spreadsheetId = this.getActiveSpreadsheetId();
    // 1. Write to Sheets Settings_Config tab
    fetch('/api/sheets/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: this.settings, spreadsheetId })
    }).catch(() => {
      persistentDb.enqueueMutation({
        type: 'SETTINGS_UPDATE',
        payload: { settings: this.settings }
      });
    });

    // 2. Mirror in backend memory cache
    fetch('/api/store/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: this.settings, spreadsheetId })
    }).catch(() => {});
  }

  public syncCategoriesToGoogleSheets(categories: string[], categoryName?: string, action?: 'add' | 'delete') {
    const spreadsheetId = this.getActiveSpreadsheetId();
    fetch('/api/sheets/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        categories, 
        category: categoryName ? { name: categoryName } : undefined, 
        action, 
        spreadsheetId 
      })
    }).catch(() => {
      persistentDb.enqueueMutation({
        type: 'CATEGORIES_UPDATE',
        payload: { 
          categories, 
          category: categoryName ? { name: categoryName } : undefined, 
          action 
        }
      });
    });
  }

  public isCategoryDeleted(name: string): boolean {
    return this.deletedCategories.has(name);
  }

  public deleteCategoryPermanently(categoryName: string): void {
    const trimmed = categoryName.trim();
    this.deletedCategories.add(trimmed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tpc_deleted_categories', JSON.stringify(Array.from(this.deletedCategories)));
    }

    const updated = this.settings.menu.categories.filter((c) => c !== trimmed);
    this.settings.menu.categories = updated;

    if (this.settings.pos.defaultCategory === trimmed) {
      this.settings.pos.defaultCategory = updated[0] || 'General';
    }

    this.saveToLocalStorage(true);
    this.syncCategoriesToGoogleSheets(updated, trimmed, 'delete');
    this.notifySettings();
    this.logActivity('Category Deleted', `Permanently deleted category "${trimmed}"`);
  }

  public addCategory(categoryName: string): boolean {
    const trimmed = categoryName.trim();
    if (!trimmed) return false;

    // Un-tombstone if previously deleted
    this.deletedCategories.delete(trimmed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tpc_deleted_categories', JSON.stringify(Array.from(this.deletedCategories)));
    }

    if (this.settings.menu.categories.includes(trimmed)) return false;

    const updated = [...this.settings.menu.categories, trimmed];
    this.settings.menu.categories = updated;

    this.saveToLocalStorage(true);
    this.syncCategoriesToGoogleSheets(updated, trimmed, 'add');
    this.notifySettings();
    this.logActivity('Category Added', `Added new category "${trimmed}"`);
    return true;
  }

  public renameCategory(oldName: string, newName: string): boolean {
    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();
    if (!trimmedNew || trimmedOld === trimmedNew) return false;

    this.deletedCategories.add(trimmedOld);
    this.deletedCategories.delete(trimmedNew);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tpc_deleted_categories', JSON.stringify(Array.from(this.deletedCategories)));
    }

    const updated = this.settings.menu.categories.map((c) => (c === trimmedOld ? trimmedNew : c));
    this.settings.menu.categories = updated;

    if (this.settings.pos.defaultCategory === trimmedOld) {
      this.settings.pos.defaultCategory = trimmedNew;
    }

    this.saveToLocalStorage(true);
    this.syncCategoriesToGoogleSheets(updated);
    this.notifySettings();
    this.logActivity('Category Renamed', `Renamed category "${trimmedOld}" to "${trimmedNew}"`);
    return true;
  }

  public updateCategoriesFromRemote(remoteCategories: string[]): void {
    if (!Array.isArray(remoteCategories)) return;
    const clean = remoteCategories
      .map((c) => (typeof c === 'string' ? c.trim() : ''))
      .filter((c) => Boolean(c) && !this.deletedCategories.has(c));

    if (clean.length === 0) return;

    // Check if distinct from current
    const currentStr = JSON.stringify(this.settings.menu.categories);
    const newStr = JSON.stringify(clean);
    if (currentStr !== newStr) {
      this.settings.menu.categories = clean;
      this.saveToLocalStorage(false);
      this.notifySettings();
    }
  }

  public getSettings(): AppMasterSettings {
    return { ...this.settings };
  }

  public subscribeSettings(listener: Listener<AppMasterSettings>): () => void {
    this.settingsListeners.add(listener);
    listener({ ...this.settings });
    return () => this.settingsListeners.delete(listener);
  }

  public updateSettings(partial: Partial<AppMasterSettings>, fromRemote: boolean = false) {
    let cleanMenu = partial.menu ? { ...this.settings.menu, ...partial.menu } : this.settings.menu;
    if (cleanMenu.categories) {
      cleanMenu.categories = cleanMenu.categories.filter((c) => !this.deletedCategories.has(c));
    }

    this.settings = {
      ...this.settings,
      ...partial,
      menu: cleanMenu,
      inventory: partial.inventory ? { ...this.settings.inventory, ...partial.inventory } : this.settings.inventory,
    };
    this.saveToLocalStorage(!fromRemote);
    this.notifySettings();
    if (!fromRemote) {
      this.logActivity('Settings Update', 'Updated application settings');
    }
  }

  public updateSection<K extends keyof AppMasterSettings>(section: K, value: Partial<AppMasterSettings[K]>, fromRemote: boolean = false) {
    if (section === 'menu' && (value as any).categories) {
      (value as any).categories = ((value as any).categories as string[]).filter((c: string) => !this.deletedCategories.has(c));
    }

    this.settings[section] = {
      ...this.settings[section],
      ...value,
    };
    this.saveToLocalStorage(!fromRemote);
    this.notifySettings();
    if (!fromRemote) {
      this.logActivity('Settings Update', `Updated ${String(section)} configuration`);
      if (section === 'menu' && (value as any).categories) {
        this.syncCategoriesToGoogleSheets((value as any).categories);
      }
    }
  }

  private notifySettings() {
    this.settingsListeners.forEach((fn) => fn({ ...this.settings }));
  }

  // --- INVOICE GENERATOR & COUNTER INCREMENT ---

  public getAndIncrementInvoiceNumber(): string {
    const prefix = this.settings.billing.invoicePrefix || 'TPC-';
    const num = this.settings.billing.nextInvoiceNumber || 1001;

    // Increment for next
    this.settings.billing.nextInvoiceNumber = num + 1;
    this.saveToLocalStorage();
    this.notifySettings();

    return `${prefix}${num}`;
  }

  // --- LOGGING ---

  public logActivity(action: string, details: string) {
    const entry: ActivityLogEntry = {
      id: 'act_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleString(),
      staffName: 'Admin',
      role: 'Owner',
      action,
      details,
    };
    this.activityLogs.unshift(entry);
    this.saveToLocalStorage();
    this.notifyActivityLogs();
  }

  public getActivityLogs(): ActivityLogEntry[] {
    return [...this.activityLogs];
  }

  public subscribeActivityLogs(listener: Listener<ActivityLogEntry[]>): () => void {
    this.activityLogListeners.add(listener);
    listener([...this.activityLogs]);
    return () => this.activityLogListeners.delete(listener);
  }

  public logInventoryAudit(log: Omit<InventoryAuditLog, 'id' | 'timestamp' | 'adjustedBy'>) {
    if (!this.settings.inventory.enableAuditTracking) return;

    const entry: InventoryAuditLog = {
      ...log,
      id: 'audit_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleString(),
      adjustedBy: 'Admin',
    };
    this.auditLogs.unshift(entry);
    this.saveToLocalStorage();
    this.notifyAuditLogs();
  }

  public getAuditLogs(): InventoryAuditLog[] {
    return [...this.auditLogs];
  }

  public subscribeAuditLogs(listener: Listener<InventoryAuditLog[]>): () => void {
    this.auditLogListeners.add(listener);
    listener([...this.auditLogs]);
    return () => this.auditLogListeners.delete(listener);
  }

  private notifyActivityLogs() {
    this.activityLogListeners.forEach((fn) => fn([...this.activityLogs]));
  }

  private notifyAuditLogs() {
    this.auditLogListeners.forEach((fn) => fn([...this.auditLogs]));
  }

  // --- BACKUP & RESTORE JSON ---

  public exportBackupJSON(): string {
    const backupData = {
      settings: this.settings,
      activityLogs: this.activityLogs,
      auditLogs: this.auditLogs,
      backupTimestamp: new Date().toISOString(),
    };
    return JSON.stringify(backupData, null, 2);
  }

  public restoreBackupJSON(jsonStr: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.settings) {
        this.settings = { ...INITIAL_SETTINGS, ...parsed.settings };
      }
      if (Array.isArray(parsed.activityLogs)) {
        this.activityLogs = parsed.activityLogs;
      }
      if (Array.isArray(parsed.auditLogs)) {
        this.auditLogs = parsed.auditLogs;
      }

      this.saveToLocalStorage();
      this.notifySettings();
      this.notifyActivityLogs();
      this.notifyAuditLogs();

      this.logActivity('Backup Restored', 'Successfully restored system state from JSON file');
      return { success: true, message: 'System configuration and settings restored successfully!' };
    } catch (e: any) {
      return { success: false, message: `Failed to restore backup: ${e.message}` };
    }
  }

  // --- PERMISSION CHECKER ---

  public hasPermission(_requiredRole?: any): boolean {
    // All features freely accessible without authentication checks
    return true;
  }
}

export const settingsStore = new SettingsStore();

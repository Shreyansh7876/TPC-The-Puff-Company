import { 
  AppMasterSettings, 
  ActivityLogEntry, 
  InventoryAuditLog
} from '../types';

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

  private settingsListeners: Set<Listener<AppMasterSettings>> = new Set();
  private activityLogListeners: Set<Listener<ActivityLogEntry[]>> = new Set();
  private auditLogListeners: Set<Listener<InventoryAuditLog[]>> = new Set();

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    if (typeof window === 'undefined') return;

    try {
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
        this.settings = { 
          ...INITIAL_SETTINGS, 
          ...parsed,
          storeProfile: {
            ...INITIAL_SETTINGS.storeProfile,
            ...(parsed.storeProfile || {})
          }
        };
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

  private saveToLocalStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('tpc_app_settings', JSON.stringify(this.settings));
      localStorage.setItem('tpc_activity_logs', JSON.stringify(this.activityLogs.slice(0, 100)));
      localStorage.setItem('tpc_audit_logs', JSON.stringify(this.auditLogs.slice(0, 200)));
    } catch (e) {
      console.error('Failed to write settings to localStorage:', e);
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

  public updateSettings(partial: Partial<AppMasterSettings>) {
    this.settings = {
      ...this.settings,
      ...partial,
    };
    this.saveToLocalStorage();
    this.notifySettings();
    this.logActivity('Settings Update', 'Updated application settings');
  }

  public updateSection<K extends keyof AppMasterSettings>(section: K, value: Partial<AppMasterSettings[K]>) {
    this.settings[section] = {
      ...this.settings[section],
      ...value,
    };
    this.saveToLocalStorage();
    this.notifySettings();
    this.logActivity('Settings Update', `Updated ${String(section)} configuration`);
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

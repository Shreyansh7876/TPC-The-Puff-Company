export type Category = 
  | 'Classic & Single Flavor Puffs' 
  | 'Flavored Combo Puffs' 
  | 'Chatni, Tandoori & Loaded Puffs' 
  | 'Supreme Garlic & Double Cheese Puffs' 
  | 'Company Signature Specials'
  | string;

export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'SPLIT';

export type OrderType = 'Dine In' | 'Takeaway' | 'Delivery';

export interface IngredientRequirement {
  ingredientId: string;
  quantityNeeded: number; // e.g. 1 puff sheet, 30g cheese
}

export interface PuffItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isVeg: boolean;
  description: string;
  isAvailable: boolean;
  image: string;
  recipe: IngredientRequirement[];
  isFeatured?: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string; // 'pcs', 'grams', 'ml'
  currentStock: number;
  minStockAlert: number;
  costPerUnit: number;
  category: 'Dry Goods' | 'Dairy & Cheese' | 'Produce' | 'Sauces & Spices' | 'Packaging';
}

export interface CartItem {
  item: PuffItem;
  quantity: number;
  notes?: string;
}

export interface OrderItem {
  id: string;
  itemId: string;
  itemName: string;
  price: number;
  quantity: number;
  notes?: string;
  category: string;
}

export interface Order {
  id: string;
  tokenNo: number;
  invoiceNo?: string;
  orderType: OrderType;
  customerName?: string;
  customerMobile?: string;
  tableOrName?: string; // Legacy fallback
  items: OrderItem[];
  subtotal: number;
  gstAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  gstEnabled: boolean;
  discount: number;
  total: number;
  roundedTotal?: number;
  paymentMode: PaymentMode;
  splitDetails?: { cash: number; upi: number; card: number };
  status: OrderStatus;
  createdAt: string; // ISO string
  customerNotes?: string;
  staffName?: string;
  deviceType: 'mobile' | 'laptop';
}

export interface DailySalesSummary {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  cashTotal: number; // Pure cash + cash portion of split
  upiTotal: number;  // Pure UPI + UPI portion of split
  cardTotal: number; // Pure Card + Card portion of split
  splitTotal: number; // Sum of orders paid via split
  pureCashTotal?: number;
  pureUpiTotal?: number;
  pureCardTotal?: number;
  splitBreakdown?: { cash: number; upi: number; card: number };
  topSellingItems: { name: string; count: number; revenue: number }[];
  grossProfit?: number;
  totalCostOfGoods?: number;
}

export interface SyncStatus {
  isOnline: boolean;
  firebaseConnected: boolean;
  googleSheetsConnected: boolean;
  spreadsheetId?: string | null;
  spreadsheetUrl?: string | null;
  lastSyncedAt: string | null;
  pendingQueueCount: number;
}

// --- STAFF & SECURITY MANAGEMENT ---

export type StaffRole = 'Owner' | 'Manager' | 'Cashier' | 'Kitchen Staff';

export interface StaffUser {
  id: string;
  name: string;
  role: StaffRole;
  pin: string; // 4-digit PIN for quick login
  phone?: string;
  email?: string;
  active: boolean;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  staffName: string;
  role: StaffRole;
  action: string;
  details: string;
}

// --- INVENTORY AUDIT ---

export interface InventoryAuditLog {
  id: string;
  timestamp: string;
  ingredientId: string;
  ingredientName: string;
  changeType: 'SALE_DEDUCTION' | 'REFILL' | 'MANUAL_ADJUSTMENT' | 'WASTAGE' | 'INITIAL_STOCK';
  amount: number;
  resultingStock: number;
  adjustedBy: string;
  reason?: string;
}

// --- APP & STORE SETTINGS MODEL ---

export interface StoreProfileSettings {
  storeName: string;
  storeTagline: string;
  storeLogoUrl: string; // Receipt Logo (Used for Receipts and Invoices only)
  headerLogoUrl?: string; // App / Navigation Header Logo (Used for Header only)
  address: string;
  contactNumber: string;
  email: string;
  gstNumber: string;
  fssaiNumber: string;
  currencySymbol: string;
  businessHours: string;
}

export interface BillingInvoiceSettings {
  invoicePrefix: string;
  nextInvoiceNumber: number;
  gstRatePercent: number; // e.g. 5
  enableSplitTax: boolean; // CGST 2.5% + SGST 2.5%
  roundOffRule: 'NONE' | 'NEAREST' | 'ROUND_UP';
  receiptFooterText: string;
  printLogoOnReceipt: boolean;
  printUpiQrOnReceipt: boolean;
}

export interface InventorySettings {
  lowStockAlertThreshold: number;
  autoDeductOnSale: boolean;
  requireManagerPermissionForAdjustment: boolean;
  enableAuditTracking: boolean;
}

export interface MenuSettings {
  categories: string[];
  productSorting: 'DEFAULT' | 'NAME_ASC' | 'PRICE_LOW_HIGH' | 'PRICE_HIGH_LOW';
  quickAccessProductIds: string[];
}

export interface KOTSettings {
  autoSendKOT: boolean;
  numberFormat: 'TOKEN_ONLY' | 'KOT_PREFIX';
  soundNotifications: boolean;
  orderPriority: 'FIFO' | 'DINE_IN_FIRST';
}

export interface POSSettings {
  defaultViewMode: 'laptop_pos' | 'mobile_pos' | 'kot';
  defaultCategory: string;
  defaultPaymentMethod: PaymentMode;
  requireOrderConfirmation: boolean;
  soundAlerts: boolean;
  enableBillPreview: boolean;
  touchFriendlyMode: boolean;
}

export interface PaymentSettings {
  enabledMethods: {
    CASH: boolean;
    UPI: boolean;
    CARD: boolean;
    SPLIT: boolean;
  };
  defaultMethod: PaymentMode;
  upiId: string;
}

export interface PWASystemSettings {
  autoSync: boolean;
  syncFrequencySeconds: number;
  appVersion: string;
  buildVersion: string;
  lastUpdateDate: string;
}

export interface AnalyticsSettings {
  showWidgets: {
    revenue: boolean;
    orders: boolean;
    avgOrderValue: boolean;
    grossProfit: boolean;
    inventoryValue: boolean;
    peakHours: boolean;
    topProducts: boolean;
    categoryPerformance: boolean;
  };
  defaultDateRange: 'today' | 'last7' | 'last30' | 'thisMonth';
}

export interface AppMasterSettings {
  storeProfile: StoreProfileSettings;
  billing: BillingInvoiceSettings;
  inventory: InventorySettings;
  menu: MenuSettings;
  kot: KOTSettings;
  pos: POSSettings;
  payments: PaymentSettings;
  pwa: PWASystemSettings;
  analytics: AnalyticsSettings;
}

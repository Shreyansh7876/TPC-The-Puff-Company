import { PuffItem, Ingredient, Order, OrderStatus, PaymentMode, OrderType, CartItem, DailySalesSummary, SyncStatus } from '../types';
import { INITIAL_MENU_ITEMS, INITIAL_INGREDIENTS } from '../data/initialData';
import { settingsStore } from './settingsStore';
import { customerStore } from './customerStore';

type Listener<T> = (data: T) => void;

class LivePuffStore {
  private menuItems: PuffItem[] = [...INITIAL_MENU_ITEMS];
  private ingredients: Ingredient[] = [...INITIAL_INGREDIENTS];
  private orders: Order[] = [];
  private tokenCounter: number = 101;

  private spreadsheetId: string | null = null;
  private googleSheetsConnected: boolean = false;
  private lastSyncedAt: string | null = null;

  private menuListeners: Set<Listener<PuffItem[]>> = new Set();
  private ingredientListeners: Set<Listener<Ingredient[]>> = new Set();
  private orderListeners: Set<Listener<Order[]>> = new Set();
  private syncStatusListeners: Set<Listener<SyncStatus>> = new Set();

  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private pollInterval: any = null;

  constructor() {
    this.initStore();
    this.setupListeners();
  }

  public async initStore() {
    if (typeof window === 'undefined') return;

    try {
      // 1. Check Auth & Google Sheet Connection
      const authRes = await fetch('/api/auth/google/status').then((r) => r.json()).catch(() => ({ authenticated: false }));
      if (authRes.spreadsheetId) {
        this.spreadsheetId = authRes.spreadsheetId;
      }

      // 2. Initialize / Sync Google Sheets Database
      const initRes = await fetch('/api/sheets/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: this.spreadsheetId })
      }).then((r) => r.json()).catch(() => null);

      if (initRes && initRes.success) {
        this.spreadsheetId = initRes.spreadsheetId;
        this.googleSheetsConnected = true;
      }

      // 3. Fetch Data from Google Sheets API
      await this.fetchAllFromGoogleSheets();
    } catch (err) {
      console.warn('Initial Google Sheets sync notice:', err);
    }

    // Start live auto-polling every 4 seconds to sync Google Sheets across terminals
    if (!this.pollInterval && typeof window !== 'undefined') {
      this.pollInterval = setInterval(() => {
        this.fetchAllFromGoogleSheets();
      }, 4000);
    }
  }

  private setupListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifySyncStatus();
      this.fetchAllFromGoogleSheets();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifySyncStatus();
    });
  }

  public async fetchAllFromGoogleSheets() {
    try {
      const spIdParam = this.spreadsheetId ? `?spreadsheetId=${encodeURIComponent(this.spreadsheetId)}` : '';

      const [menuData, inventoryData, ordersData] = await Promise.all([
        fetch(`/api/sheets/menu${spIdParam}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/sheets/inventory${spIdParam}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/sheets/orders${spIdParam}`).then((r) => r.json()).catch(() => null)
      ]);

      if (menuData && Array.isArray(menuData.menu) && menuData.menu.length > 0) {
        this.menuItems = menuData.menu;
        this.notifyMenu();
      }

      if (inventoryData && Array.isArray(inventoryData.inventory) && inventoryData.inventory.length > 0) {
        this.ingredients = inventoryData.inventory;
        this.notifyIngredients();
      }

      if (ordersData && Array.isArray(ordersData.orders)) {
        this.orders = ordersData.orders;
        if (this.orders.length > 0) {
          const maxToken = Math.max(...this.orders.map((o) => o.tokenNo || 0));
          if (maxToken >= this.tokenCounter) {
            this.tokenCounter = maxToken + 1;
          }
        }
        this.notifyOrders();
      }

      this.lastSyncedAt = new Date().toLocaleTimeString();
      this.notifySyncStatus();
    } catch (e) {
      console.error('Error fetching data from Google Sheets API:', e);
    }
  }

  public async connectGoogleSheets(customId?: string) {
    try {
      const res = await fetch('/api/sheets/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: customId || this.spreadsheetId })
      }).then((r) => r.json());

      if (res.spreadsheetId) {
        this.spreadsheetId = res.spreadsheetId;
        this.googleSheetsConnected = true;
        await this.fetchAllFromGoogleSheets();
      }
      return res;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  private notifyMenu() {
    this.menuListeners.forEach((fn) => fn([...this.menuItems]));
  }

  private notifyIngredients() {
    this.ingredientListeners.forEach((fn) => fn([...this.ingredients]));
  }

  private notifyOrders() {
    this.orderListeners.forEach((fn) => fn([...this.orders]));
  }

  private notifySyncStatus() {
    const status: SyncStatus = {
      isOnline: this.isOnline,
      firebaseConnected: true,
      googleSheetsConnected: this.googleSheetsConnected,
      spreadsheetId: this.spreadsheetId,
      spreadsheetUrl: this.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit` : null,
      lastSyncedAt: this.lastSyncedAt || new Date().toLocaleTimeString(),
      pendingQueueCount: 0,
    };
    this.syncStatusListeners.forEach((fn) => fn(status));
  }

  // --- PUBLIC GETTERS & SUBSCRIBERS ---

  public getMenuItems(): PuffItem[] {
    return [...this.menuItems];
  }

  public subscribeMenu(listener: Listener<PuffItem[]>): () => void {
    this.menuListeners.add(listener);
    listener([...this.menuItems]);
    return () => this.menuListeners.delete(listener);
  }

  public getIngredients(): Ingredient[] {
    return [...this.ingredients];
  }

  public subscribeIngredients(listener: Listener<Ingredient[]>): () => void {
    this.ingredientListeners.add(listener);
    listener([...this.ingredients]);
    return () => this.ingredientListeners.delete(listener);
  }

  public getOrders(): Order[] {
    return [...this.orders];
  }

  public subscribeOrders(listener: Listener<Order[]>): () => void {
    this.orderListeners.add(listener);
    listener([...this.orders]);
    return () => this.orderListeners.delete(listener);
  }

  public subscribeSyncStatus(listener: Listener<SyncStatus>): () => void {
    this.syncStatusListeners.add(listener);
    this.notifySyncStatus();
    return () => this.syncStatusListeners.delete(listener);
  }

  // --- CORE POS & INVENTORY ACTIONS (Direct to Google Sheets API) ---

  public placeOrder(params: {
    cart: CartItem[];
    paymentMode: PaymentMode;
    orderType: OrderType;
    customerNotes?: string;
    customerName?: string;
    customerMobile?: string;
    tableOrName?: string;
    deviceType?: 'mobile' | 'laptop';
    gstEnabled?: boolean;
    discount?: number;
    staffName?: string;
    splitDetails?: { cash: number; upi: number; card: number };
  }): Order {
    const settings = settingsStore.getSettings();
    const subtotal = params.cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);

    // Dynamic GST Calculation from settings
    const gstPercent = settings.billing.gstRatePercent || 5;
    const gstAmount = params.gstEnabled !== false ? Math.round(subtotal * (gstPercent / 100) * 100) / 100 : 0;
    const cgstAmount = settings.billing.enableSplitTax ? Math.round((gstAmount / 2) * 100) / 100 : undefined;
    const sgstAmount = settings.billing.enableSplitTax ? Math.round((gstAmount / 2) * 100) / 100 : undefined;

    const discount = params.discount || 0;
    let rawTotal = Math.max(0, subtotal + gstAmount - discount);

    // Apply Round-Off Rule
    let roundedTotal = rawTotal;
    if (settings.billing.roundOffRule === 'NEAREST') {
      roundedTotal = Math.round(rawTotal);
    } else if (settings.billing.roundOffRule === 'ROUND_UP') {
      roundedTotal = Math.ceil(rawTotal);
    }

    const tokenNo = this.tokenCounter++;
    const invoiceNo = settingsStore.getAndIncrementInvoiceNumber();

    const cleanName = params.customerName?.trim() || undefined;
    const cleanMobile = params.customerMobile?.trim() || undefined;

    if (cleanMobile) {
      customerStore.updateCustomerInfo(cleanMobile, cleanName);
    }

    const newOrder: Order = {
      id: 'ORD_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      tokenNo,
      invoiceNo,
      orderType: params.orderType,
      customerName: cleanName,
      customerMobile: cleanMobile,
      tableOrName: params.tableOrName,
      items: params.cart.map((ci) => ({
        id: 'ITEM_' + Math.random().toString(36).substr(2, 9),
        itemId: ci.item.id,
        itemName: ci.item.name,
        price: ci.item.price,
        quantity: ci.quantity,
        notes: ci.notes,
        category: ci.item.category,
      })),
      subtotal,
      gstAmount,
      cgstAmount,
      sgstAmount,
      gstEnabled: params.gstEnabled !== false,
      discount,
      total: rawTotal,
      roundedTotal,
      paymentMode: params.paymentMode,
      splitDetails: params.splitDetails,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      customerNotes: params.customerNotes,
      staffName: params.staffName || (params.deviceType === 'mobile' ? 'Mobile Pos Staff' : 'Counter Cashier'),
      deviceType: params.deviceType || 'mobile',
    };

    // Auto-deduct raw materials from inventory if setting enabled
    if (settings.inventory.autoDeductOnSale) {
      this.deductInventoryForOrder(params.cart);
    }

    // Save order locally and send POST to Google Sheets API
    this.orders.unshift(newOrder);
    this.notifyOrders();

    settingsStore.logActivity('New Order Created', `Invoice #${invoiceNo} (${newOrder.orderType}) placed for ₹${roundedTotal.toFixed(2)} via ${newOrder.paymentMode}`);

    fetch('/api/sheets/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newOrder, spreadsheetId: this.spreadsheetId })
    }).catch((e) => console.error('Failed to post order to Google Sheets:', e));

    return newOrder;
  }

  private deductInventoryForOrder(cart: CartItem[]) {
    let inventoryUpdated = false;

    cart.forEach((cartItem) => {
      if (!cartItem.item.recipe || cartItem.item.recipe.length === 0) return;

      cartItem.item.recipe.forEach((req) => {
        const ingredientIndex = this.ingredients.findIndex((ing) => ing.id === req.ingredientId);
        if (ingredientIndex !== -1) {
          const ing = this.ingredients[ingredientIndex];
          const totalDeduction = req.quantityNeeded * cartItem.quantity;
          const resultingStock = Math.max(0, ing.currentStock - totalDeduction);

          const updatedIng = {
            ...ing,
            currentStock: resultingStock,
          };
          this.ingredients[ingredientIndex] = updatedIng;
          inventoryUpdated = true;

          settingsStore.logInventoryAudit({
            ingredientId: ing.id,
            ingredientName: ing.name,
            changeType: 'SALE_DEDUCTION',
            amount: -totalDeduction,
            resultingStock,
            reason: `Auto deduction for ${cartItem.quantity}x ${cartItem.item.name}`,
          });

          fetch('/api/sheets/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item: updatedIng, action: 'update', spreadsheetId: this.spreadsheetId })
          }).catch((e) => console.error('Failed to sync stock deduction to Google Sheets:', e));
        }
      });
    });

    if (inventoryUpdated) {
      this.notifyIngredients();
    }
  }

  private restoreInventoryForOrder(order: Order) {
    if (!order.items || order.items.length === 0) return;

    let inventoryUpdated = false;

    order.items.forEach((orderItem) => {
      // Find matching menu item or use recipe if available
      const menuItem = this.menuItems.find((m) => m.id === orderItem.itemId || m.name === orderItem.itemName);
      if (!menuItem || !menuItem.recipe || menuItem.recipe.length === 0) return;

      menuItem.recipe.forEach((req) => {
        const ingredientIndex = this.ingredients.findIndex((ing) => ing.id === req.ingredientId);
        if (ingredientIndex !== -1) {
          const ing = this.ingredients[ingredientIndex];
          const totalRestoration = req.quantityNeeded * orderItem.quantity;
          const resultingStock = ing.currentStock + totalRestoration;

          const updatedIng = {
            ...ing,
            currentStock: resultingStock,
          };
          this.ingredients[ingredientIndex] = updatedIng;
          inventoryUpdated = true;

          settingsStore.logInventoryAudit({
            ingredientId: ing.id,
            ingredientName: ing.name,
            changeType: 'REFILL',
            amount: totalRestoration,
            resultingStock,
            reason: `Stock restored due to ${order.status} Order #${order.invoiceNo || order.tokenNo}`,
          });

          fetch('/api/sheets/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item: updatedIng, action: 'update', spreadsheetId: this.spreadsheetId })
          }).catch((e) => console.error('Failed to sync restored stock to Google Sheets:', e));
        }
      });
    });

    if (inventoryUpdated) {
      this.notifyIngredients();
    }
  }

  public updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      const order = this.orders[idx];
      const oldStatus = order.status;

      this.orders[idx] = {
        ...order,
        status: newStatus,
      };

      const wasActive = oldStatus !== 'CANCELLED' && oldStatus !== 'REFUNDED';
      const isNowCancelled = newStatus === 'CANCELLED' || newStatus === 'REFUNDED';

      if (wasActive && isNowCancelled) {
        this.restoreInventoryForOrder({ ...order, status: newStatus });
      } else if (!wasActive && !isNowCancelled) {
        // Re-deduct if un-cancelled
        const cartForOrder: CartItem[] = (order.items || []).map((item) => {
          const matchedPuff = this.menuItems.find((m) => m.id === item.itemId || m.name === item.itemName);
          return {
            item: matchedPuff || {
              id: item.itemId,
              name: item.itemName,
              price: item.price,
              category: item.category || 'General',
              isVeg: true,
              description: '',
              isAvailable: true,
              image: '',
              recipe: [],
            },
            quantity: item.quantity,
          };
        });
        this.deductInventoryForOrder(cartForOrder);
      }

      this.notifyOrders();

      fetch('/api/sheets/orders/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus, spreadsheetId: this.spreadsheetId })
      }).catch((e) => console.error('Failed to update status on Google Sheets:', e));
    }
  }

  // --- MENU MANAGEMENT ---

  public addMenuItem(item: Omit<PuffItem, 'id'>) {
    const newItem: PuffItem = {
      ...item,
      id: 'puff_' + Date.now(),
    };
    this.menuItems.push(newItem);
    this.notifyMenu();

    fetch('/api/sheets/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: newItem, action: 'add', spreadsheetId: this.spreadsheetId })
    }).catch((e) => console.error('Failed to add menu item to Google Sheets:', e));
  }

  public updateMenuItem(id: string, updated: Partial<PuffItem>) {
    const idx = this.menuItems.findIndex((m) => m.id === id);
    if (idx !== -1) {
      this.menuItems[idx] = { ...this.menuItems[idx], ...updated };
      this.notifyMenu();

      fetch('/api/sheets/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: this.menuItems[idx], action: 'update', spreadsheetId: this.spreadsheetId })
      }).catch((e) => console.error('Failed to update menu item on Google Sheets:', e));
    }
  }

  public toggleItemAvailability(id: string) {
    const idx = this.menuItems.findIndex((m) => m.id === id);
    if (idx !== -1) {
      this.menuItems[idx].isAvailable = !this.menuItems[idx].isAvailable;
      this.notifyMenu();

      fetch('/api/sheets/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: this.menuItems[idx], action: 'update', spreadsheetId: this.spreadsheetId })
      }).catch((e) => console.error('Failed to toggle availability on Google Sheets:', e));
    }
  }

  public deleteMenuItem(id: string) {
    const itemToDelete = this.menuItems.find((m) => m.id === id);
    this.menuItems = this.menuItems.filter((m) => m.id !== id);
    this.notifyMenu();

    if (itemToDelete) {
      fetch('/api/sheets/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: itemToDelete, action: 'delete', spreadsheetId: this.spreadsheetId })
      }).catch((e) => console.error('Failed to delete menu item from Google Sheets:', e));
    }
  }

  // --- INVENTORY MANAGEMENT ---

  public updateIngredient(id: string, updated: Partial<Ingredient>) {
    const idx = this.ingredients.findIndex((ing) => ing.id === id);
    if (idx !== -1) {
      const oldIng = this.ingredients[idx];
      const newIng = { ...oldIng, ...updated };
      this.ingredients[idx] = newIng;
      this.notifyIngredients();

      if (updated.currentStock !== undefined && updated.currentStock !== oldIng.currentStock) {
        const diff = updated.currentStock - oldIng.currentStock;
        settingsStore.logInventoryAudit({
          ingredientId: newIng.id,
          ingredientName: newIng.name,
          changeType: diff >= 0 ? 'REFILL' : 'MANUAL_ADJUSTMENT',
          amount: diff,
          resultingStock: newIng.currentStock,
          reason: 'Manual stock adjustment',
        });
      }

      fetch('/api/sheets/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: newIng, action: 'update', spreadsheetId: this.spreadsheetId })
      }).catch((e) => console.error('Failed to update ingredient on Google Sheets:', e));
    }
  }

  public updateIngredientStock(id: string, newStock: number, reason?: string) {
    const idx = this.ingredients.findIndex((ing) => ing.id === id);
    if (idx !== -1) {
      const ing = this.ingredients[idx];
      const diff = newStock - ing.currentStock;
      const resultingStock = Math.max(0, newStock);

      const updatedIng = { ...ing, currentStock: resultingStock };
      this.ingredients[idx] = updatedIng;
      this.notifyIngredients();

      settingsStore.logInventoryAudit({
        ingredientId: ing.id,
        ingredientName: ing.name,
        changeType: diff >= 0 ? 'REFILL' : 'MANUAL_ADJUSTMENT',
        amount: diff,
        resultingStock,
        reason: reason || (diff >= 0 ? 'Manual stock refill' : 'Manual stock adjustment'),
      });

      fetch('/api/sheets/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: updatedIng, action: 'update', spreadsheetId: this.spreadsheetId })
      }).catch((e) => console.error('Failed to update ingredient stock on Google Sheets:', e));
    }
  }

  public addIngredient(ingredient: Omit<Ingredient, 'id'>) {
    const newIng: Ingredient = {
      ...ingredient,
      id: 'ing_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    };
    this.ingredients.push(newIng);
    this.notifyIngredients();

    settingsStore.logInventoryAudit({
      ingredientId: newIng.id,
      ingredientName: newIng.name,
      changeType: 'INITIAL_STOCK',
      amount: newIng.currentStock,
      resultingStock: newIng.currentStock,
      reason: 'New raw ingredient added to store inventory',
    });

    fetch('/api/sheets/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: newIng, action: 'add', spreadsheetId: this.spreadsheetId })
    }).catch((e) => console.error('Failed to add ingredient to Google Sheets:', e));
  }

  public deleteIngredient(id: string) {
    const ingToDelete = this.ingredients.find((ing) => ing.id === id);
    this.ingredients = this.ingredients.filter((ing) => ing.id !== id);
    this.notifyIngredients();

    if (ingToDelete) {
      settingsStore.logInventoryAudit({
        ingredientId: ingToDelete.id,
        ingredientName: ingToDelete.name,
        changeType: 'MANUAL_ADJUSTMENT',
        amount: -ingToDelete.currentStock,
        resultingStock: 0,
        reason: 'Raw ingredient deleted from system',
      });

      fetch('/api/sheets/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: ingToDelete, action: 'delete', spreadsheetId: this.spreadsheetId })
      }).catch((e) => console.error('Failed to delete ingredient from Google Sheets:', e));
    }
  }

  // --- SALES REPORTING & ANALYTICS ---

  public getSalesSummary(filterDateIso?: string): DailySalesSummary {
    let filteredOrders = this.orders;

    if (filterDateIso) {
      const targetDate = new Date(filterDateIso).toDateString();
      filteredOrders = this.orders.filter((o) => new Date(o.createdAt).toDateString() === targetDate);
    } else {
      const todayStr = new Date().toDateString();
      filteredOrders = this.orders.filter((o) => new Date(o.createdAt).toDateString() === todayStr);
    }

    const activeOrders = filteredOrders.filter((o) => o.status !== 'CANCELLED');

    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = activeOrders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    let pureCashTotal = 0;
    let pureUpiTotal = 0;
    let pureCardTotal = 0;
    let splitTotal = 0;
    let splitCashPortion = 0;
    let splitUpiPortion = 0;
    let splitCardPortion = 0;

    const itemCounts: { [name: string]: { count: number; revenue: number } } = {};

    activeOrders.forEach((order) => {
      if (order.paymentMode === 'CASH') {
        pureCashTotal += order.total;
      } else if (order.paymentMode === 'UPI') {
        pureUpiTotal += order.total;
      } else if (order.paymentMode === 'CARD') {
        pureCardTotal += order.total;
      } else if (order.paymentMode === 'SPLIT') {
        splitTotal += order.total;
        if (order.splitDetails) {
          splitCashPortion += order.splitDetails.cash || 0;
          splitUpiPortion += order.splitDetails.upi || 0;
          splitCardPortion += order.splitDetails.card || 0;
        }
      }

      if (Array.isArray(order.items)) {
        order.items.forEach((item) => {
          if (!itemCounts[item.itemName]) {
            itemCounts[item.itemName] = { count: 0, revenue: 0 };
          }
          itemCounts[item.itemName].count += item.quantity;
          itemCounts[item.itemName].revenue += item.price * item.quantity;
        });
      }
    });

    const cashTotal = pureCashTotal + splitCashPortion;
    const upiTotal = pureUpiTotal + splitUpiPortion;
    const cardTotal = pureCardTotal + splitCardPortion;

    const topSellingItems = Object.entries(itemCounts)
      .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      cashTotal,
      upiTotal,
      cardTotal,
      splitTotal,
      pureCashTotal,
      pureUpiTotal,
      pureCardTotal,
      splitBreakdown: {
        cash: splitCashPortion,
        upi: splitUpiPortion,
        card: splitCardPortion,
      },
      topSellingItems,
    };
  }
  // --- RESET SEED DATA ---

  public resetToDefaultSeedData() {
    this.menuItems = [...INITIAL_MENU_ITEMS];
    this.ingredients = [...INITIAL_INGREDIENTS];
    this.orders = [];
    this.notifyMenu();
    this.notifyIngredients();
    this.notifyOrders();
  }
}

export const livePuffStore = new LivePuffStore();

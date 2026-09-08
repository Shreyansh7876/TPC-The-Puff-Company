import { PuffItem, Ingredient, Order, OrderStatus, PaymentMode, OrderType, CartItem, DailySalesSummary, SyncStatus } from '../types';
import { INITIAL_MENU_ITEMS, INITIAL_INGREDIENTS } from '../config/defaultSeed';
import { settingsStore } from './settingsStore';
import { customerStore } from './customerStore';
import { persistentDb } from './persistentDb';

type Listener<T> = (data: T) => void;

class LivePuffStore {
  // Synchronous instant boot from Persistent Database
  private menuItems: PuffItem[] = persistentDb.getSyncMenu();
  private ingredients: Ingredient[] = persistentDb.getSyncInventory();
  private orders: Order[] = persistentDb.getSyncOrders();
  private tokenCounter: number = 101;

  private spreadsheetId: string | null = null;
  private googleSheetsConnected: boolean = false;
  private lastSyncedAt: string | null = null;
  private isSyncing: boolean = false;

  private menuListeners: Set<Listener<PuffItem[]>> = new Set();
  private ingredientListeners: Set<Listener<Ingredient[]>> = new Set();
  private orderListeners: Set<Listener<Order[]>> = new Set();
  private syncStatusListeners: Set<Listener<SyncStatus>> = new Set();

  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private pollInterval: any = null;

  constructor() {
    this.recalculateTokenCounter();
    this.initStore();
    this.setupListeners();
  }

  private recalculateTokenCounter() {
    const savedTokenCounter = persistentDb.getSyncTokenCounter();
    if (savedTokenCounter !== null && !isNaN(savedTokenCounter) && savedTokenCounter > 0) {
      this.tokenCounter = savedTokenCounter;
      return;
    }
    const settings = settingsStore.getSettings();
    const startNum = settings.kot?.tokenStartNumber || 101;
    if (this.orders.length > 0) {
      const maxToken = this.orders.reduce((max, o) => Math.max(max, o.tokenNo || 0), startNum - 1);
      this.tokenCounter = maxToken + 1;
    } else {
      this.tokenCounter = startNum;
    }
    persistentDb.saveTokenCounter(this.tokenCounter);
  }

  public resetTokenSequence(customStart?: number): number {
    const settings = settingsStore.getSettings();
    const startNum = typeof customStart === 'number' && !isNaN(customStart) && customStart > 0
      ? Math.floor(customStart)
      : (settings.kot?.tokenStartNumber || 101);

    this.tokenCounter = startNum;
    persistentDb.saveTokenCounter(this.tokenCounter);
    settingsStore.updateSection('kot', { tokenStartNumber: startNum });
    return this.tokenCounter;
  }

  public setTokenCounter(counter: number): void {
    if (counter > 0) {
      this.tokenCounter = Math.floor(counter);
      persistentDb.saveTokenCounter(this.tokenCounter);
    }
  }

  public getNextTokenNumber(): number {
    return this.tokenCounter;
  }

  public async initStore() {
    if (typeof window === 'undefined') return;

    try {
      // 1. Deep load from IndexedDB to ensure full history is present
      const indexedData = await persistentDb.loadAllFromIndexedDB();
      if (indexedData) {
        let updated = false;
        if (indexedData.orders.length > this.orders.length) {
          // Merge by ID
          const orderMap = new Map<string, Order>();
          indexedData.orders.forEach((o) => orderMap.set(o.id, o));
          this.orders.forEach((o) => orderMap.set(o.id, o));
          this.orders = Array.from(orderMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          persistentDb.saveOrders(this.orders);
          this.recalculateTokenCounter();
          updated = true;
        }

        if (indexedData.inventory.length > 0 && this.ingredients.length === 0) {
          this.ingredients = indexedData.inventory;
          persistentDb.saveInventory(this.ingredients);
          this.notifyIngredients();
        }

        if (indexedData.menu.length > 0 && this.menuItems.length === 0) {
          this.menuItems = indexedData.menu;
          persistentDb.saveMenu(this.menuItems);
          this.notifyMenu();
        }

        if (updated) {
          this.notifyOrders();
        }
      }

      // 2. Check Auth & Google Sheet Connection
      const authRes = await fetch('/api/auth/google/status').then((r) => r.json()).catch(() => ({ authenticated: false }));
      if (authRes.spreadsheetId) {
        this.spreadsheetId = authRes.spreadsheetId;
      }
      if (authRes.authenticated) {
        this.googleSheetsConnected = true;
      }

      // 3. Fetch all master data from Google Sheets
      await this.fetchAllFromGoogleSheets();

      // 4. Two-Way Sync with Backend Server Cache
      await this.syncWithServerBackend();

      // 5. Flush any pending offline mutations
      await this.flushOfflineQueue();
    } catch (err) {
      console.warn('Initial store synchronization notice:', err);
    }

    // Start live auto-polling every 5 seconds to sync across terminals from Google Sheets
    if (!this.pollInterval && typeof window !== 'undefined') {
      this.pollInterval = setInterval(() => {
        if (this.isOnline) {
          this.flushOfflineQueue();
          this.fetchAllFromGoogleSheets();
        }
      }, 5000);
    }
  }

  private setupListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifySyncStatus();
      this.flushOfflineQueue();
      this.syncWithServerBackend();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifySyncStatus();
    });
  }

  // --- TWO-WAY BACKEND DATABASE SYNC ---

  public async syncWithServerBackend() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const payload = {
        orders: this.orders,
        inventory: this.ingredients,
        menu: this.menuItems,
        spreadsheetId: this.spreadsheetId,
      };

      const res = await fetch('/api/store/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(async (r) => {
        const text = await r.text();
        try { return JSON.parse(text); } catch { return null; }
      }).catch(() => null);

      if (res && res.success) {
        // Merge merged orders from server
        if (Array.isArray(res.orders)) {
          const serverOrders: Order[] = res.orders;
          const orderMap = new Map<string, Order>();
          serverOrders.forEach((o) => orderMap.set(o.id, o));
          this.orders.forEach((o) => orderMap.set(o.id, o));

          this.orders = Array.from(orderMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          persistentDb.saveOrders(this.orders);
          this.recalculateTokenCounter();
          this.notifyOrders();
        }

        if (Array.isArray(res.inventory) && res.inventory.length > 0) {
          this.ingredients = res.inventory;
          persistentDb.saveInventory(this.ingredients);
          this.notifyIngredients();
        }

        if (Array.isArray(res.menu) && res.menu.length > 0) {
          this.menuItems = res.menu;
          persistentDb.saveMenu(this.menuItems);
          this.notifyMenu();
        }

        if (res.spreadsheetId) {
          this.spreadsheetId = res.spreadsheetId;
        }

        this.lastSyncedAt = new Date().toLocaleTimeString();
        this.notifySyncStatus();
      }
    } catch (e) {
      console.warn('Background server sync notice:', e);
    } finally {
      this.isSyncing = false;
    }
  }

  // --- OFFLINE RETRY QUEUE ---

  public async flushOfflineQueue() {
    const queue = persistentDb.getSyncOfflineQueue();
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        if (item.type === 'ORDER_CREATE') {
          const res = await fetch('/api/sheets/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: item.payload, spreadsheetId: this.spreadsheetId })
          });
          if (res.ok) {
            persistentDb.dequeueMutation(item.id);
          }
        } else if (item.type === 'ORDER_STATUS') {
          const res = await fetch('/api/sheets/orders/status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item.payload, spreadsheetId: this.spreadsheetId })
          });
          if (res.ok) {
            persistentDb.dequeueMutation(item.id);
          }
        } else if (item.type === 'INVENTORY_UPDATE') {
          const res = await fetch('/api/sheets/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item.payload, spreadsheetId: this.spreadsheetId })
          });
          if (res.ok) {
            persistentDb.dequeueMutation(item.id);
          }
        } else if (item.type === 'MENU_UPDATE') {
          const res = await fetch('/api/sheets/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item.payload, spreadsheetId: this.spreadsheetId })
          });
          if (res.ok) {
            persistentDb.dequeueMutation(item.id);
          }
        }
      } catch (err) {
        console.warn(`Failed to flush queue item ${item.id}:`, err);
        break; // Retry next cycle
      }
    }

    this.notifySyncStatus();
  }

  // --- GOOGLE SHEETS FETCH ---

  public async fetchAllFromGoogleSheets() {
    try {
      const spIdParam = this.spreadsheetId ? `?spreadsheetId=${encodeURIComponent(this.spreadsheetId)}` : '';
      const allRes = await fetch(`/api/sheets/all${spIdParam}`)
        .then(async (r) => {
          const text = await r.text();
          try { return JSON.parse(text); } catch { return null; }
        })
        .catch(() => null);

      if (allRes && allRes.success) {
        // 1. Menu Items
        if (Array.isArray(allRes.menu) && allRes.menu.length > 0) {
          this.menuItems = allRes.menu;
          persistentDb.saveMenu(this.menuItems);
          this.notifyMenu();
        }

        // 2. Categories
        if (Array.isArray(allRes.categories) && allRes.categories.length > 0) {
          const catNames = allRes.categories.map((c: any) => c.name || c);
          settingsStore.updateSection('menu', { categories: catNames });
        }

        // 3. Raw Inventory
        if (Array.isArray(allRes.inventory) && allRes.inventory.length > 0) {
          this.ingredients = allRes.inventory;
          persistentDb.saveInventory(this.ingredients);
          this.notifyIngredients();
        }

        // 4. Orders History
        if (Array.isArray(allRes.orders) && allRes.orders.length > 0) {
          const orderMap = new Map<string, Order>();
          allRes.orders.forEach((o: Order) => orderMap.set(o.id, o));
          this.orders.forEach((o) => {
            if (!orderMap.has(o.id)) orderMap.set(o.id, o);
          });

          this.orders = Array.from(orderMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          persistentDb.saveOrders(this.orders);
          this.recalculateTokenCounter();
          this.notifyOrders();
        }

        // 5. Customers
        if (allRes.customers) {
          customerStore.loadFromGoogleSheets(allRes.customers);
        }

        // 6. Settings
        if (allRes.settings) {
          settingsStore.updateSettings(allRes.settings);
        }

        if (allRes.spreadsheetId) {
          this.spreadsheetId = allRes.spreadsheetId;
        }

        this.googleSheetsConnected = true;
        this.lastSyncedAt = new Date().toLocaleTimeString();
        this.notifySyncStatus();
      }
    } catch (e) {
      console.error('Error fetching data from Google Sheets API:', e);
    }
  }

  public async connectGoogleSheets(customId?: string) {
    try {
      const response = await fetch('/api/sheets/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: customId || this.spreadsheetId })
      });

      const responseText = await response.text();
      let res: any;
      try {
        res = JSON.parse(responseText);
      } catch (parseErr) {
        return {
          success: false,
          error: 'Server returned an HTML response instead of JSON. Please authorize Google Account (OAuth) first, or check the server logs.'
        };
      }

      if (res.spreadsheetId) {
        this.spreadsheetId = res.spreadsheetId;
        this.googleSheetsConnected = res.success && res.authenticated;
        await this.fetchAllFromGoogleSheets();
      }
      return res;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error connecting to Google Sheets' };
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
    const queue = persistentDb.getSyncOfflineQueue();
    const status: SyncStatus = {
      isOnline: this.isOnline,
      firebaseConnected: true,
      googleSheetsConnected: this.googleSheetsConnected,
      spreadsheetId: this.spreadsheetId,
      spreadsheetUrl: this.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit` : null,
      lastSyncedAt: this.lastSyncedAt || new Date().toLocaleTimeString(),
      pendingQueueCount: queue.length,
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

  // --- CORE POS & INVENTORY ACTIONS (Dual-shield Persistent Saves) ---

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
    persistentDb.saveTokenCounter(this.tokenCounter);
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

    // 1. Update in-memory state
    this.orders.unshift(newOrder);

    // 2. Immediate Dual-Tier Persistence (LocalStorage + IndexedDB)
    persistentDb.saveOrders(this.orders);
    this.notifyOrders();

    settingsStore.logActivity(
      'New Order Created',
      `Invoice #${invoiceNo} (${newOrder.orderType}) placed for ₹${roundedTotal.toFixed(2)} via ${newOrder.paymentMode}`
    );

    // 3. Dispatch sync to backend server & Google Sheets
    fetch('/api/sheets/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newOrder, spreadsheetId: this.spreadsheetId })
    }).catch((e) => {
      console.warn('Network sync failed, enqueued for automatic retry:', e);
      persistentDb.enqueueMutation({
        type: 'ORDER_CREATE',
        payload: newOrder,
      });
      this.notifySyncStatus();
    });

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
          }).catch((e) => {
            persistentDb.enqueueMutation({
              type: 'INVENTORY_UPDATE',
              payload: { item: updatedIng, action: 'update' }
            });
          });
        }
      });
    });

    if (inventoryUpdated) {
      persistentDb.saveInventory(this.ingredients);
      this.notifyIngredients();
    }
  }

  private restoreInventoryForOrder(order: Order) {
    if (!order.items || order.items.length === 0) return;

    let inventoryUpdated = false;

    order.items.forEach((orderItem) => {
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
          }).catch((e) => {
            persistentDb.enqueueMutation({
              type: 'INVENTORY_UPDATE',
              payload: { item: updatedIng, action: 'update' }
            });
          });
        }
      });
    });

    if (inventoryUpdated) {
      persistentDb.saveInventory(this.ingredients);
      this.notifyIngredients();
    }
  }

  public updateOrderStatus(orderId: string, newStatus: OrderStatus, reason?: string, staffName?: string) {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      const order = this.orders[idx];
      const oldStatus = order.status;

      const updatedOrder: Order = {
        ...order,
        status: newStatus,
        ...(newStatus === 'CANCELLED' || newStatus === 'REFUNDED' ? {
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason || order.cancellationReason || 'Cancelled by staff',
          cancelledBy: staffName || order.cancelledBy || 'Staff Cashier',
        } : {})
      };

      this.orders[idx] = updatedOrder;

      const wasActive = oldStatus !== 'CANCELLED' && oldStatus !== 'REFUNDED';
      const isNowCancelled = newStatus === 'CANCELLED' || newStatus === 'REFUNDED';

      if (wasActive && isNowCancelled) {
        this.restoreInventoryForOrder(updatedOrder);
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

      // Immediately write to persistent storage
      persistentDb.saveOrders(this.orders);
      this.notifyOrders();

      fetch('/api/sheets/orders/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          status: newStatus, 
          cancellationReason: updatedOrder.cancellationReason,
          cancelledBy: updatedOrder.cancelledBy,
          spreadsheetId: this.spreadsheetId 
        })
      }).catch((e) => {
        persistentDb.enqueueMutation({
          type: 'ORDER_STATUS',
          payload: { 
            orderId, 
            status: newStatus, 
            cancellationReason: updatedOrder.cancellationReason,
            cancelledBy: updatedOrder.cancelledBy 
          }
        });
        this.notifySyncStatus();
      });
    }
  }

  public cancelOrder(orderId: string, reason: string = 'Customer Request / Cancelled', staffName: string = 'Counter Cashier'): boolean {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return false;

    this.updateOrderStatus(orderId, 'CANCELLED', reason, staffName);
    return true;
  }

  // --- MENU MANAGEMENT ---

  public addMenuItem(item: Omit<PuffItem, 'id'>) {
    const newItem: PuffItem = {
      ...item,
      id: 'puff_' + Date.now(),
    };
    this.menuItems.push(newItem);
    persistentDb.saveMenu(this.menuItems);
    this.notifyMenu();

    fetch('/api/sheets/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: newItem, action: 'add', spreadsheetId: this.spreadsheetId })
    }).catch((e) => {
      persistentDb.enqueueMutation({
        type: 'MENU_UPDATE',
        payload: { item: newItem, action: 'add' }
      });
      this.notifySyncStatus();
    });
  }

  public updateMenuItem(id: string, updated: Partial<PuffItem>) {
    const idx = this.menuItems.findIndex((m) => m.id === id);
    if (idx !== -1) {
      this.menuItems[idx] = { ...this.menuItems[idx], ...updated };
      persistentDb.saveMenu(this.menuItems);
      this.notifyMenu();

      fetch('/api/sheets/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: this.menuItems[idx], action: 'update', spreadsheetId: this.spreadsheetId })
      }).catch((e) => {
        persistentDb.enqueueMutation({
          type: 'MENU_UPDATE',
          payload: { item: this.menuItems[idx], action: 'update' }
        });
        this.notifySyncStatus();
      });
    }
  }

  public toggleItemAvailability(id: string) {
    const idx = this.menuItems.findIndex((m) => m.id === id);
    if (idx !== -1) {
      this.menuItems[idx].isAvailable = !this.menuItems[idx].isAvailable;
      persistentDb.saveMenu(this.menuItems);
      this.notifyMenu();

      fetch('/api/sheets/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: this.menuItems[idx], action: 'update', spreadsheetId: this.spreadsheetId })
      }).catch((e) => {
        persistentDb.enqueueMutation({
          type: 'MENU_UPDATE',
          payload: { item: this.menuItems[idx], action: 'update' }
        });
        this.notifySyncStatus();
      });
    }
  }

  public deleteMenuItem(id: string) {
    const itemToDelete = this.menuItems.find((m) => m.id === id);
    this.menuItems = this.menuItems.filter((m) => m.id !== id);
    persistentDb.saveMenu(this.menuItems);
    this.notifyMenu();

    if (itemToDelete) {
      fetch('/api/sheets/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: itemToDelete, action: 'delete', spreadsheetId: this.spreadsheetId })
      }).catch((e) => {
        persistentDb.enqueueMutation({
          type: 'MENU_UPDATE',
          payload: { item: itemToDelete, action: 'delete' }
        });
        this.notifySyncStatus();
      });
    }
  }

  // --- INVENTORY MANAGEMENT ---

  public updateIngredient(id: string, updated: Partial<Ingredient>) {
    const idx = this.ingredients.findIndex((ing) => ing.id === id);
    if (idx !== -1) {
      const oldIng = this.ingredients[idx];
      const newIng = { ...oldIng, ...updated };
      this.ingredients[idx] = newIng;
      persistentDb.saveInventory(this.ingredients);
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
      }).catch((e) => {
        persistentDb.enqueueMutation({
          type: 'INVENTORY_UPDATE',
          payload: { item: newIng, action: 'update' }
        });
        this.notifySyncStatus();
      });
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
      persistentDb.saveInventory(this.ingredients);
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
      }).catch((e) => {
        persistentDb.enqueueMutation({
          type: 'INVENTORY_UPDATE',
          payload: { item: updatedIng, action: 'update' }
        });
        this.notifySyncStatus();
      });
    }
  }

  public addIngredient(ingredient: Omit<Ingredient, 'id'>) {
    const newIng: Ingredient = {
      ...ingredient,
      id: 'ing_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    };
    this.ingredients.push(newIng);
    persistentDb.saveInventory(this.ingredients);
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
    }).catch((e) => {
      persistentDb.enqueueMutation({
        type: 'INVENTORY_UPDATE',
        payload: { item: newIng, action: 'add' }
      });
      this.notifySyncStatus();
    });
  }

  public deleteIngredient(id: string) {
    const ingToDelete = this.ingredients.find((ing) => ing.id === id);
    this.ingredients = this.ingredients.filter((ing) => ing.id !== id);
    persistentDb.saveInventory(this.ingredients);
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
      }).catch((e) => {
        persistentDb.enqueueMutation({
          type: 'INVENTORY_UPDATE',
          payload: { item: ingToDelete, action: 'delete' }
        });
        this.notifySyncStatus();
      });
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

    const activeOrders = filteredOrders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
    const cancelledOrders = filteredOrders.filter((o) => o.status === 'CANCELLED' || o.status === 'REFUNDED');

    const totalRevenue = activeOrders.reduce((sum, o) => sum + (o.roundedTotal || o.total), 0);
    const totalOrders = activeOrders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const cancelledOrdersCount = cancelledOrders.length;
    const cancelledRevenueTotal = cancelledOrders.reduce((sum, o) => sum + (o.roundedTotal || o.total), 0);

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
      cancelledOrdersCount,
      cancelledRevenueTotal,
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
    persistentDb.saveMenu(this.menuItems);
    persistentDb.saveInventory(this.ingredients);
    persistentDb.saveOrders(this.orders);
    this.notifyMenu();
    this.notifyIngredients();
    this.notifyOrders();
  }
}

export const livePuffStore = new LivePuffStore();

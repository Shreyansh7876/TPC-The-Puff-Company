import { Order, Ingredient, PuffItem, AppMasterSettings } from '../types';
import { INITIAL_MENU_ITEMS, INITIAL_INGREDIENTS } from '../data/initialData';

const DB_NAME = 'ThePuffCoPOS_DB_v2';
const DB_VERSION = 1;

const KEYS = {
  ORDERS: 'tpc_persistent_orders_v2',
  INVENTORY: 'tpc_persistent_inventory_v2',
  MENU: 'tpc_persistent_menu_v2',
  CUSTOMERS: 'tpc_persistent_customers_v2',
  SETTINGS: 'tpc_persistent_settings_v2',
  ACTIVITY_LOGS: 'tpc_persistent_activity_logs_v2',
  AUDIT_LOGS: 'tpc_persistent_audit_logs_v2',
  OFFLINE_QUEUE: 'tpc_persistent_offline_queue_v2',
  LAST_SYNC: 'tpc_persistent_last_sync_v2',
  TOKEN_COUNTER: 'tpc_persistent_token_counter_v2',
};

export interface SyncQueueItem {
  id: string;
  type: 'ORDER_CREATE' | 'ORDER_STATUS' | 'INVENTORY_UPDATE' | 'MENU_UPDATE' | 'SETTINGS_UPDATE';
  payload: any;
  timestamp: string;
  retryCount: number;
}

export type StorageErrorCallback = (error: { title: string; message: string; fatal: boolean }) => void;

class PersistentDatabaseService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private errorListeners: Set<StorageErrorCallback> = new Set();
  private isIndexedDBAvailable: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.isIndexedDBAvailable = true;
      this.initIndexedDB();
    }
  }

  public subscribeErrors(listener: StorageErrorCallback): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private notifyError(title: string, message: string, fatal: boolean = false) {
    console.error(`[TPC Storage Error] ${title}: ${message}`);
    this.errorListeners.forEach((fn) => fn({ title, message, fatal }));
  }

  // --- INDEXED DB INITIALIZATION ---
  private initIndexedDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
          const db: IDBDatabase = event.target.result;
          if (!db.objectStoreNames.contains('orders')) {
            const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
            orderStore.createIndex('createdAt', 'createdAt', { unique: false });
            orderStore.createIndex('status', 'status', { unique: false });
            orderStore.createIndex('tokenNo', 'tokenNo', { unique: false });
          }
          if (!db.objectStoreNames.contains('inventory')) {
            db.createObjectStore('inventory', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('menu')) {
            db.createObjectStore('menu', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('kv_store')) {
            db.createObjectStore('kv_store', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('sync_queue')) {
            db.createObjectStore('sync_queue', { keyPath: 'id' });
          }
        };

        request.onsuccess = (event: any) => {
          resolve(event.target.result);
        };

        request.onerror = (event: any) => {
          console.warn('IndexedDB open error, falling back to LocalStorage:', event.target.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB not supported or permission denied, using LocalStorage:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  // --- SYNCHRONOUS LOCALSTORAGE READERS (Instant 0ms boot) ---

  public getSyncOrders(): Order[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(KEYS.ORDERS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse orders from LocalStorage:', e);
    }
    return [];
  }

  public getSyncInventory(): Ingredient[] {
    if (typeof window === 'undefined') return [...INITIAL_INGREDIENTS];
    try {
      const data = localStorage.getItem(KEYS.INVENTORY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse inventory from LocalStorage:', e);
    }
    return [...INITIAL_INGREDIENTS];
  }

  public getSyncMenu(): PuffItem[] {
    if (typeof window === 'undefined') return [...INITIAL_MENU_ITEMS];
    try {
      const data = localStorage.getItem(KEYS.MENU);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse menu from LocalStorage:', e);
    }
    return [...INITIAL_MENU_ITEMS];
  }

  public getSyncCustomers(): Record<string, { name?: string; notes?: string }> {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(KEYS.CUSTOMERS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to parse customers from LocalStorage:', e);
    }
    return {};
  }

  public getSyncOfflineQueue(): SyncQueueItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(KEYS.OFFLINE_QUEUE);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse offline queue from LocalStorage:', e);
    }
    return [];
  }

  public getSyncTokenCounter(): number | null {
    if (typeof window === 'undefined') return null;
    try {
      const val = localStorage.getItem(KEYS.TOKEN_COUNTER);
      if (val !== null) {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) return num;
      }
    } catch (e) {
      console.warn('Failed to get token counter from LocalStorage:', e);
    }
    return null;
  }

  public saveTokenCounter(counter: number): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(KEYS.TOKEN_COUNTER, String(counter));
    } catch (e) {
      console.warn('Failed to save token counter to LocalStorage:', e);
    }
  }

  // --- DUAL-SHIELD IMMEDIATE WRITERS (LocalStorage + IndexedDB) ---

  public saveOrders(orders: Order[]): boolean {
    if (typeof window === 'undefined') return false;

    // 1. Immediate LocalStorage Snapshot
    try {
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError' || e?.code === 22) {
        this.notifyError(
          'LocalStorage Limit Exceeded',
          'Orders are safely saving to IndexedDB, but local storage quota is full. Historical orders remain intact.'
        );
        // Save at least recent 300 orders in localStorage
        try {
          localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders.slice(0, 300)));
        } catch (_) {}
      } else {
        this.notifyError('Storage Write Warning', 'Unable to write orders to browser localStorage.');
      }
    }

    // 2. Deep IndexedDB Persistence
    this.saveOrdersToIndexedDB(orders);
    return true;
  }

  private async saveOrdersToIndexedDB(orders: Order[]) {
    try {
      const db = await this.initIndexedDB();
      if (!db) return;

      const tx = db.transaction('orders', 'readwrite');
      const store = tx.objectStore('orders');

      // Clear and bulk add for consistency
      store.clear();
      orders.forEach((o) => store.put(o));
    } catch (e) {
      console.warn('IndexedDB orders write warning:', e);
    }
  }

  public saveInventory(inventory: Ingredient[]): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.setItem(KEYS.INVENTORY, JSON.stringify(inventory));
    } catch (e) {
      this.notifyError('Storage Write Warning', 'Unable to write inventory to browser storage.');
    }

    this.saveInventoryToIndexedDB(inventory);
    return true;
  }

  private async saveInventoryToIndexedDB(inventory: Ingredient[]) {
    try {
      const db = await this.initIndexedDB();
      if (!db) return;

      const tx = db.transaction('inventory', 'readwrite');
      const store = tx.objectStore('inventory');
      store.clear();
      inventory.forEach((item) => store.put(item));
    } catch (e) {
      console.warn('IndexedDB inventory write warning:', e);
    }
  }

  public saveMenu(menu: PuffItem[]): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.setItem(KEYS.MENU, JSON.stringify(menu));
    } catch (e) {
      this.notifyError('Storage Write Warning', 'Unable to write menu to browser storage.');
    }

    this.saveMenuToIndexedDB(menu);
    return true;
  }

  private async saveMenuToIndexedDB(menu: PuffItem[]) {
    try {
      const db = await this.initIndexedDB();
      if (!db) return;

      const tx = db.transaction('menu', 'readwrite');
      const store = tx.objectStore('menu');
      store.clear();
      menu.forEach((item) => store.put(item));
    } catch (e) {
      console.warn('IndexedDB menu write warning:', e);
    }
  }

  public saveCustomers(customers: Record<string, { name?: string; notes?: string }>): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
      return true;
    } catch (e) {
      console.warn('Failed to save customers to storage:', e);
      return false;
    }
  }

  public saveOfflineQueue(queue: SyncQueueItem[]): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
      return true;
    } catch (e) {
      console.warn('Failed to save offline queue to storage:', e);
      return false;
    }
  }

  public enqueueMutation(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) {
    const queue = this.getSyncOfflineQueue();
    const queueItem: SyncQueueItem = {
      ...item,
      id: 'QUEUE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 7),
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(queueItem);
    this.saveOfflineQueue(queue);
    return queueItem;
  }

  public dequeueMutation(id: string) {
    const queue = this.getSyncOfflineQueue();
    const filtered = queue.filter((q) => q.id !== id);
    this.saveOfflineQueue(filtered);
  }

  // --- ASYNC DEEP LOAD FROM INDEXED DB (reconciliation) ---

  public async loadAllFromIndexedDB(): Promise<{
    orders: Order[];
    inventory: Ingredient[];
    menu: PuffItem[];
  } | null> {
    try {
      const db = await this.initIndexedDB();
      if (!db) return null;

      const [orders, inventory, menu] = await Promise.all([
        new Promise<Order[]>((resolve) => {
          const tx = db.transaction('orders', 'readonly');
          const store = tx.objectStore('orders');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        }),
        new Promise<Ingredient[]>((resolve) => {
          const tx = db.transaction('inventory', 'readonly');
          const store = tx.objectStore('inventory');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        }),
        new Promise<PuffItem[]>((resolve) => {
          const tx = db.transaction('menu', 'readonly');
          const store = tx.objectStore('menu');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        }),
      ]);

      return { orders, inventory, menu };
    } catch (e) {
      console.warn('IndexedDB full load warning:', e);
      return null;
    }
  }
}

export const persistentDb = new PersistentDatabaseService();

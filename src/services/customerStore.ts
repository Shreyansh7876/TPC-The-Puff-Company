import { Order, PaymentMode } from '../types';

export interface CustomerRecord {
  id: string;
  mobileNumber: string;
  customerName: string;
  totalVisits: number;
  totalAmountSpent: number;
  lastOrderDate: string; // ISO String
  orderCount: number;
  frequentItems: { name: string; count: number; totalSpent: number }[];
  paymentModesUsed: PaymentMode[];
  orderIds: string[];
}

const STORAGE_KEY = 'tpc_customer_database';

class CustomerStore {
  private manualNotes: Record<string, { name?: string; notes?: string }> = {};

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.manualNotes = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load customer database from storage:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.manualNotes));
    } catch (e) {
      console.error('Failed to save customer database to storage:', e);
    }
  }

  public updateCustomerInfo(mobile: string, name?: string, notes?: string) {
    if (!mobile) return;
    const cleanMobile = mobile.trim();
    if (!this.manualNotes[cleanMobile]) {
      this.manualNotes[cleanMobile] = {};
    }
    if (name && name.trim()) {
      this.manualNotes[cleanMobile].name = name.trim();
    }
    if (notes !== undefined) {
      this.manualNotes[cleanMobile].notes = notes;
    }
    this.saveToStorage();
  }

  public getCustomerByMobile(mobile: string, orders: Order[]): CustomerRecord | null {
    if (!mobile || !mobile.trim()) return null;
    const all = this.getAllCustomers(orders);
    const clean = mobile.trim();
    return all.find((c) => c.mobileNumber === clean) || null;
  }

  public getCustomerByName(name: string, orders: Order[]): CustomerRecord | null {
    if (!name || !name.trim()) return null;
    const all = this.getAllCustomers(orders);
    const clean = name.trim().toLowerCase();
    return all.find((c) => c.customerName.toLowerCase() === clean) || null;
  }

  public searchCustomers(query: string, orders: Order[]): CustomerRecord[] {
    if (!query || !query.trim()) return [];
    const term = query.trim().toLowerCase();
    const all = this.getAllCustomers(orders);
    return all.filter((c) => 
      c.mobileNumber.toLowerCase().includes(term) ||
      c.customerName.toLowerCase().includes(term)
    ).slice(0, 6);
  }

  public getAllCustomers(orders: Order[]): CustomerRecord[] {
    const customerMap: Record<string, {
      mobileNumber: string;
      customerName: string;
      orders: Order[];
      frequentMap: Record<string, { count: number; totalSpent: number }>;
      paymentModes: Set<PaymentMode>;
    }> = {};

    orders.forEach((order) => {
      const mobile = order.customerMobile ? order.customerMobile.trim() : '';
      if (!mobile) return; // Customer Mobile is unique identifier

      if (!customerMap[mobile]) {
        customerMap[mobile] = {
          mobileNumber: mobile,
          customerName: order.customerName ? order.customerName.trim() : (this.manualNotes[mobile]?.name || 'Guest Customer'),
          orders: [],
          frequentMap: {},
          paymentModes: new Set<PaymentMode>(),
        };
      }

      // Update name if a clearer name is provided
      if (order.customerName && order.customerName.trim() && order.customerName.trim() !== 'Guest Customer') {
        customerMap[mobile].customerName = order.customerName.trim();
      }

      if (order.status !== 'CANCELLED') {
        customerMap[mobile].orders.push(order);
        customerMap[mobile].paymentModes.add(order.paymentMode);

        if (Array.isArray(order.items)) {
          order.items.forEach((item) => {
            if (!customerMap[mobile].frequentMap[item.itemName]) {
              customerMap[mobile].frequentMap[item.itemName] = { count: 0, totalSpent: 0 };
            }
            customerMap[mobile].frequentMap[item.itemName].count += item.quantity;
            customerMap[mobile].frequentMap[item.itemName].totalSpent += item.price * item.quantity;
          });
        }
      }
    });

    const results: CustomerRecord[] = Object.values(customerMap).map((entry) => {
      // Sort orders by date desc
      entry.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const totalAmountSpent = entry.orders.reduce((sum, o) => sum + (o.roundedTotal || o.total), 0);
      const lastOrderDate = entry.orders.length > 0 ? entry.orders[0].createdAt : new Date().toISOString();

      const frequentItems = Object.entries(entry.frequentMap)
        .map(([name, data]) => ({ name, count: data.count, totalSpent: data.totalSpent }))
        .sort((a, b) => b.count - a.count);

      const storedName = this.manualNotes[entry.mobileNumber]?.name;
      const finalName = storedName || entry.customerName || 'Customer ' + entry.mobileNumber.slice(-4);

      return {
        id: 'CUST_' + entry.mobileNumber,
        mobileNumber: entry.mobileNumber,
        customerName: finalName,
        totalVisits: entry.orders.length,
        totalAmountSpent,
        lastOrderDate,
        orderCount: entry.orders.length,
        frequentItems,
        paymentModesUsed: Array.from(entry.paymentModes),
        orderIds: entry.orders.map((o) => o.id),
      };
    });

    // Also include any manually added customers that haven't placed orders yet or were stored
    Object.entries(this.manualNotes).forEach(([mobile, info]) => {
      if (!customerMap[mobile]) {
        results.push({
          id: 'CUST_' + mobile,
          mobileNumber: mobile,
          customerName: info.name || 'Customer ' + mobile.slice(-4),
          totalVisits: 0,
          totalAmountSpent: 0,
          lastOrderDate: new Date().toISOString(),
          orderCount: 0,
          frequentItems: [],
          paymentModesUsed: [],
          orderIds: [],
        });
      }
    });

    return results.sort((a, b) => b.totalAmountSpent - a.totalAmountSpent);
  }

  public exportCustomersToCSV(customers: CustomerRecord[]) {
    if (customers.length === 0) {
      alert('No customer records available to export.');
      return;
    }

    let csvContent = 'Customer Name,Mobile Number,Total Visits,Total Spending (INR),Last Visit Date,Order Count,Payment Methods Used,Top Purchased Items\n';

    customers.forEach((c) => {
      const topItems = c.frequentItems.slice(0, 3).map((i) => `${i.name} (x${i.count})`).join('; ') || 'N/A';
      const payModes = c.paymentModesUsed.join(' / ') || 'N/A';
      const lastDate = new Date(c.lastOrderDate).toLocaleDateString() + ' ' + new Date(c.lastOrderDate).toLocaleTimeString();

      csvContent += `"${c.customerName.replace(/"/g, '""')}","${c.mobileNumber}",${c.totalVisits},${c.totalAmountSpent.toFixed(2)},"${lastDate}",${c.orderCount},"${payModes}","${topItems.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `THE_PUFF_CO_Customer_Database_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const customerStore = new CustomerStore();

import React, { useState, useEffect } from 'react';
import { 
  PuffItem, 
  Ingredient, 
  Order, 
  CartItem, 
  PaymentMode, 
  OrderType,
  Category,
  AppMasterSettings
} from '../types';
import { livePuffStore } from '../services/store';
import { 
  Monitor, 
  Package, 
  BarChart3, 
  Plus, 
  Minus, 
  Trash2, 
  AlertTriangle, 
  Printer, 
  QrCode, 
  Download, 
  RotateCcw, 
  Flame, 
  Search,
  BookOpen,
  Smartphone
} from 'lucide-react';
import { ExportDataPanel } from './ExportDataPanel';
import { SettingsPanel } from './SettingsPanel';
import { settingsStore } from '../services/settingsStore';
import { customerStore } from '../services/customerStore';
import { CustomerInput } from './CustomerInput';

interface LaptopDashboardProps {
  activeTab: 'laptop_pos' | 'inventory' | 'sales' | 'setup';
  menuItems: PuffItem[];
  ingredients: Ingredient[];
  orders: Order[];
  onRequestReceiptPrint: (order: Order) => void;
  onRequestUPIQR: (amount: number, tokenNo: number, order?: Order) => void;
}

export const LaptopDashboard: React.FC<LaptopDashboardProps> = ({
  activeTab,
  menuItems,
  ingredients,
  orders,
  onRequestReceiptPrint,
  onRequestUPIQR,
}) => {
  const [settings, setSettings] = useState<AppMasterSettings>(settingsStore.getSettings());
  // --- COUNTER POS STATE ---
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    return settingsStore.subscribeSettings(setSettings);
  }, []);

  const categories = ['ALL', ...(settings.menu.categories || [])];

  useEffect(() => {
    if (selectedCategory !== 'ALL' && !settings.menu.categories.includes(selectedCategory)) {
      setSelectedCategory('ALL');
    }
  }, [settings.menu.categories, selectedCategory]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('Dine In');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [splitCash, setSplitCash] = useState<number | ''>(0);
  const [splitUpi, setSplitUpi] = useState<number | ''>(0);
  const [splitCard, setSplitCard] = useState<number | ''>(0);
  const [gstEnabled, setGstEnabled] = useState<boolean>(false);
  const [customerNotes, setCustomerNotes] = useState<string>('');

  // --- INVENTORY MODALS ---
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [editingIngForm, setEditingIngForm] = useState<{
    name: string;
    category: string;
    unit: string;
    currentStock: number | '';
    minStockAlert: number | '';
    costPerUnit: number | '';
  }>({
    name: '',
    category: 'Dry Goods',
    unit: 'grams',
    currentStock: 1000,
    minStockAlert: 200,
    costPerUnit: 0.2,
  });

  const [refillingIngredient, setRefillingIngredient] = useState<Ingredient | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);

  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState<boolean>(false);
  const [newIngForm, setNewIngForm] = useState<{
    name: string;
    category: string;
    unit: string;
    currentStock: number | '';
    minStockAlert: number | '';
    costPerUnit: number | '';
  }>({
    name: '',
    category: 'Dry Goods',
    unit: 'grams',
    currentStock: 1000,
    minStockAlert: 200,
    costPerUnit: 0.2,
  });

  // --- SALES FILTER ---
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // --- POS CART HELPERS ---
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getItemQty = (id: string) => {
    const found = cart.find((ci) => ci.item.id === id);
    return found ? found.quantity : 0;
  };

  const handleAddToCart = (item: PuffItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((ci) => ci.item.id === item.id);
      if (idx !== -1) {
        return prev.map((ci, i) =>
          i === idx ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item, quantity: 1, notes: '' }];
    });
  };

  const handleRemoveFromCart = (id: string) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === id);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter((ci) => ci.item.id !== id);
      return prev.map((ci) => (ci.item.id === id ? { ...ci, quantity: ci.quantity - 1 } : ci));
    });
  };

  const subtotal = cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);
  const gstAmount = gstEnabled ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
  const grandTotal = Math.max(0, subtotal + gstAmount);
  const roundedGrandTotal = Math.round(grandTotal);

  const numSplitCash = Number(splitCash) || 0;
  const numSplitUpi = Number(splitUpi) || 0;
  const numSplitCard = Number(splitCard) || 0;
  const splitSum = numSplitCash + numSplitUpi + numSplitCard;
  const isSplitValid = paymentMode !== 'SPLIT' || splitSum === roundedGrandTotal;

  const handleAutoBalanceSplit = () => {
    const remaining = Math.max(0, roundedGrandTotal - numSplitUpi - numSplitCard);
    setSplitCash(remaining);
  };

  const handleCounterCheckout = () => {
    if (cart.length === 0) return;

    if (paymentMode === 'SPLIT' && !isSplitValid) {
      alert(`Split payment sum (₹${splitSum}) does not equal total bill (₹${roundedGrandTotal}). Please adjust payments.`);
      return;
    }

    const newOrder = livePuffStore.placeOrder({
      cart,
      paymentMode,
      orderType,
      customerNotes,
      customerName: customerName.trim() || undefined,
      customerMobile: customerMobile.trim() || undefined,
      splitDetails: paymentMode === 'SPLIT' ? {
        cash: numSplitCash,
        upi: numSplitUpi,
        card: numSplitCard,
      } : undefined,
      deviceType: 'laptop',
      gstEnabled,
      staffName: 'Main Counter Cashier',
    });

    if (paymentMode === 'UPI') {
      onRequestUPIQR(newOrder.total, newOrder.tokenNo, newOrder);
    } else if (paymentMode === 'SPLIT') {
      if (numSplitUpi > 0) {
        onRequestUPIQR(numSplitUpi, newOrder.tokenNo, newOrder);
      } else {
        onRequestReceiptPrint(newOrder);
      }
    } else {
      onRequestReceiptPrint(newOrder);
    }

    setCart([]);
    setCustomerNotes('');
    setCustomerName('');
    setCustomerMobile('');
    setSplitCash(0);
    setSplitUpi(0);
    setSplitCard(0);
  };

  // --- SALES ANALYTICS ---
  const salesSummary = livePuffStore.getSalesSummary(filterDate);

  const handleExportCSV = () => {
    const todayOrders = orders.filter((o) => new Date(o.createdAt).toISOString().split('T')[0] === filterDate);
    if (todayOrders.length === 0) {
      alert('No sales records found for ' + filterDate);
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Token No,Date Time,Order Type,Table/Ref,Payment Mode,Subtotal,GST,Total,Status\n';

    todayOrders.forEach((o) => {
      csvContent += `${o.tokenNo},"${new Date(o.createdAt).toLocaleString()}",${o.orderType},"${o.tableOrName}",${o.paymentMode},${o.subtotal},${o.gstAmount},${o.total},${o.status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `The_Puff_Company_Sales_${filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto min-h-[calc(100vh-80px)]">
      {/* ----------------- TAB 1: COUNTER POS & BILLING ----------------- */}
      {activeTab === 'laptop_pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Grid: Menu Selector */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search & Categories */}
            <div className="bg-white p-4 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#a19284]" />
                  <input
                    type="text"
                    placeholder="Search puffs, beverages, extras..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#f4efe8]/50 border border-[#a19284]/30 rounded-2xl text-xs text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#8c3a27] text-[#f4efe8] shadow-sm'
                        : 'bg-[#e2d7c9]/40 text-[#2e211d] hover:bg-[#e2d7c9]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredMenuItems.map((item) => {
                const qty = getItemQty(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => item.isAvailable && handleAddToCart(item)}
                    disabled={!item.isAvailable}
                    className={`p-3.5 bg-white rounded-2xl border text-left flex flex-col justify-between transition-all shadow-xs hover:shadow-md relative overflow-hidden group ${
                      qty > 0 ? 'border-[#8c3a27] ring-2 ring-[#8c3a27]/20 bg-[#f4efe8]/60' : 'border-[#a19284]/30 hover:border-[#8c3a27]'
                    } ${!item.isAvailable ? 'opacity-50 cursor-not-allowed bg-[#e2d7c9]/20' : ''}`}
                  >
                    {qty > 0 && (
                      <span className="absolute top-2.5 right-2.5 bg-[#8c3a27] text-[#f4efe8] text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md z-10">
                        {qty}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] text-[#a19284] font-bold uppercase tracking-wider truncate font-['Cinzel']">
                          {item.category}
                        </span>
                      </div>
                      <h5 className="font-['Playfair_Display'] font-black text-[#2e211d] text-sm leading-snug line-clamp-2 pr-4">{item.name}</h5>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#a19284]/20">
                      <span className="font-bold text-[#8c3a27] text-base">₹{item.price}</span>
                      {!item.isAvailable ? (
                        <span className="text-[10px] text-[#8c3a27] font-bold">Unavailable</span>
                      ) : (
                        <span className="text-[10px] bg-[#e2d7c9]/50 group-hover:bg-[#8c3a27] group-hover:text-[#f4efe8] text-[#2e211d] font-bold px-2 py-1 rounded-md transition-colors">
                          + ADD
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Billing Counter Cart & Checkout */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-[#a19284]/30 p-5 shadow-xl flex flex-col justify-between h-fit sticky top-20 text-[#2e211d]">
            <div>
              <div className="flex items-center justify-between border-b border-[#a19284]/30 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-[#8c3a27]" />
                  <div>
                    <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">Counter POS Invoice</h3>
                    <p className="text-[10px] text-[#a19284]">Live Puff Billing Station</p>
                  </div>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-[#8c3a27] hover:underline font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
              </div>

              {/* Order Options */}
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-2 bg-[#e2d7c9]/40 p-1 rounded-xl">
                  <button
                    onClick={() => setOrderType('Dine In')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      orderType === 'Dine In' ? 'bg-[#8c3a27] text-[#f4efe8] shadow-xs' : 'text-[#2e211d]'
                    }`}
                  >
                    Dine In
                  </button>
                  <button
                    onClick={() => setOrderType('Takeaway')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      orderType === 'Takeaway' ? 'bg-[#8c3a27] text-[#f4efe8] shadow-xs' : 'text-[#2e211d]'
                    }`}
                  >
                    Takeaway / Parcel
                  </button>
                </div>

                <CustomerInput
                  customerName={customerName}
                  customerMobile={customerMobile}
                  onChangeName={setCustomerName}
                  onChangeMobile={setCustomerMobile}
                  orders={orders}
                  onRequestReceiptPrint={onRequestReceiptPrint}
                />
              </div>

              {/* Cart Items List */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 mb-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-[#a19284] text-xs italic border border-dashed border-[#a19284]/40 rounded-2xl">
                    Select menu items on the left to build order
                  </div>
                ) : (
                  cart.map((ci) => (
                    <div key={ci.item.id} className="flex items-center justify-between p-2.5 bg-[#f4efe8]/50 rounded-xl border border-[#a19284]/20 text-xs">
                      <div className="truncate pr-2">
                        <p className="font-['Playfair_Display'] font-bold text-[#2e211d] truncate">{ci.item.name}</p>
                        <p className="text-[10px] text-[#a19284]">₹{ci.item.price} x {ci.quantity}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-[#a19284]/30">
                          <button onClick={() => handleRemoveFromCart(ci.item.id)} className="text-[#a19284] hover:text-[#2e211d]">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold px-1 text-[#2e211d]">{ci.quantity}</span>
                          <button onClick={() => handleAddToCart(ci.item)} className="text-[#8c3a27]">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-bold text-[#8c3a27] min-w-[48px] text-right">
                          ₹{ci.item.price * ci.quantity}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-2 mb-4">
                <label className="text-[11px] font-bold text-[#a19284]">Payment Method</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => setPaymentMode('CASH')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      paymentMode === 'CASH' ? 'bg-[#8c3a27] text-[#f4efe8] border-[#8c3a27]' : 'bg-[#f4efe8]/50 text-[#2e211d] border-[#a19284]/30'
                    }`}
                  >
                    💵 Cash
                  </button>
                  <button
                    onClick={() => setPaymentMode('UPI')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      paymentMode === 'UPI' ? 'bg-[#8c3a27] text-[#f4efe8] border-[#8c3a27]' : 'bg-[#f4efe8]/50 text-[#2e211d] border-[#a19284]/30'
                    }`}
                  >
                    📱 UPI
                  </button>
                  <button
                    onClick={() => setPaymentMode('CARD')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      paymentMode === 'CARD' ? 'bg-[#8c3a27] text-[#f4efe8] border-[#8c3a27]' : 'bg-[#f4efe8]/50 text-[#2e211d] border-[#a19284]/30'
                    }`}
                  >
                    💳 Card
                  </button>
                  <button
                    onClick={() => {
                      setPaymentMode('SPLIT');
                      setSplitCash(roundedGrandTotal);
                      setSplitUpi(0);
                      setSplitCard(0);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      paymentMode === 'SPLIT' ? 'bg-[#8c3a27] text-[#f4efe8] border-[#8c3a27]' : 'bg-[#f4efe8]/50 text-[#2e211d] border-[#a19284]/30'
                    }`}
                  >
                    🔀 Split
                  </button>
                </div>

                {paymentMode === 'SPLIT' && (
                  <div className="p-3 bg-[#f4efe8]/80 border border-[#8c3a27]/30 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#8c3a27]">
                      <span>Split Payment Breakdown</span>
                      <button
                        onClick={handleAutoBalanceSplit}
                        className="text-[10px] underline hover:text-[#732f1f]"
                      >
                        Auto-Balance Cash
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-[#a19284] block">Cash (₹)</label>
                        <input
                          type="number"
                          value={splitCash}
                          onChange={(e) => setSplitCash(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white border border-[#a19284]/40 rounded-lg text-xs font-bold focus:outline-none focus:border-[#8c3a27]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#a19284] block">UPI (₹)</label>
                        <input
                          type="number"
                          value={splitUpi}
                          onChange={(e) => setSplitUpi(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white border border-[#a19284]/40 rounded-lg text-xs font-bold focus:outline-none focus:border-[#8c3a27]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#a19284] block">Card (₹)</label>
                        <input
                          type="number"
                          value={splitCard}
                          onChange={(e) => setSplitCard(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white border border-[#a19284]/40 rounded-lg text-xs font-bold focus:outline-none focus:border-[#8c3a27]"
                        />
                      </div>
                    </div>

                    {!isSplitValid && (
                      <div className="text-[10px] font-bold text-rose-700 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                        ⚠ Total split (₹{splitSum}) ≠ Bill total (₹{roundedGrandTotal}). Difference: ₹{roundedGrandTotal - splitSum}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bill Totals */}
              <div className="bg-[#e2d7c9]/30 p-3 rounded-2xl border border-[#a19284]/30 space-y-1.5 text-xs text-[#2e211d] mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#2e211d]">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={gstEnabled} onChange={(e) => setGstEnabled(e.target.checked)} className="rounded text-[#8c3a27]" />
                    <span>Add Extra 5% GST</span>
                  </label>
                  <span className="font-semibold text-[#2e211d]">₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-[#2e211d] pt-1 border-t border-[#a19284]/30">
                  <span>Grand Total</span>
                  <span className="text-[#8c3a27]">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCounterCheckout}
              disabled={cart.length === 0}
              className="w-full py-3.5 bg-[#8c3a27] hover:bg-[#732f1f] disabled:opacity-50 text-[#f4efe8] font-bold text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>BILL ORDER & PRINT INVOICE</span>
            </button>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: MASTER INVENTORY & RECIPES ----------------- */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#2e211d] text-[#f4efe8] p-5 rounded-3xl border border-[#a19284]/30 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <Package className="w-6 h-6 text-[#e2d7c9]" />
                <h2 className="text-xl font-['Playfair_Display'] font-black text-[#f4efe8]">Master Raw Material Inventory</h2>
              </div>
              <p className="text-xs text-[#e2d7c9] mt-1">
                Real-time stock deduction: Every billed puff automatically deducts mapped raw ingredients.
              </p>
            </div>

            <button
              onClick={() => setIsAddIngredientOpen(true)}
              className="px-4 py-2.5 bg-[#8c3a27] hover:bg-[#732f1f] text-[#f4efe8] font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Ingredient</span>
            </button>
          </div>

          {/* Raw Ingredients Stock Table */}
          <div className="bg-white rounded-3xl border border-[#a19284]/30 shadow-sm overflow-hidden text-[#2e211d]">
            <div className="p-4 border-b border-[#a19284]/30 font-bold text-[#2e211d] text-sm flex items-center justify-between">
              <span className="font-['Playfair_Display']">Ingredient Stock Tracking</span>
              <span className="text-xs font-semibold text-[#a19284]">{ingredients.length} Items</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#2e211d]">
                <thead className="bg-[#f4efe8] text-[#a19284] font-bold uppercase tracking-wider text-[10px] border-b border-[#a19284]/30">
                  <tr>
                    <th className="p-3.5">Ingredient Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Current Stock</th>
                    <th className="p-3.5">Alert Level</th>
                    <th className="p-3.5">Stock Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a19284]/20 font-medium">
                  {ingredients.map((ing) => {
                    const isLow = ing.currentStock <= ing.minStockAlert;
                    const stockPercentage = Math.min(100, Math.round((ing.currentStock / (ing.minStockAlert * 3)) * 100));

                    return (
                      <tr key={ing.id} className="hover:bg-[#f4efe8]/50 transition-colors">
                        <td className="p-3.5 font-bold text-[#2e211d]">
                          {ing.name}
                        </td>
                        <td className="p-3.5">
                          <span className="bg-[#e2d7c9]/40 text-[#2e211d] px-2 py-0.5 rounded text-[10px] font-semibold">
                            {ing.category}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-[#8c3a27] text-sm">
                          {ing.currentStock} {ing.unit}
                        </td>
                        <td className="p-3.5 text-[#a19284]">
                          {ing.minStockAlert} {ing.unit}
                        </td>
                        <td className="p-3.5">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 bg-[#8c3a27]/10 text-[#8c3a27] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#8c3a27]/30">
                              <AlertTriangle className="w-3 h-3 text-[#8c3a27]" />
                              LOW STOCK ALERT
                            </span>
                          ) : (
                            <div className="w-32 bg-[#e2d7c9]/40 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#8c3a27] h-full rounded-full transition-all"
                                style={{ width: `${stockPercentage}%` }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setRefillingIngredient(ing);
                              setNewStockVal(ing.currentStock);
                            }}
                            className="px-2.5 py-1 bg-[#8c3a27] hover:bg-[#722f1f] text-[#f4efe8] rounded-lg text-[11px] font-bold transition-all shadow-sm"
                          >
                            Refill
                          </button>
                          <button
                            onClick={() => {
                              setEditingIngredient(ing);
                              setEditingIngForm({
                                name: ing.name,
                                category: ing.category || 'Dry Goods',
                                unit: ing.unit || 'grams',
                                currentStock: ing.currentStock,
                                minStockAlert: ing.minStockAlert,
                                costPerUnit: ing.costPerUnit || 0.2,
                              });
                            }}
                            className="px-2.5 py-1 bg-[#2e211d] hover:bg-[#1b1311] text-[#f4efe8] rounded-lg text-[11px] font-bold transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ingredient "${ing.name}"? This will remove it from inventory and recipe mappings.`)) {
                                livePuffStore.deleteIngredient(ing.id);
                              }
                            }}
                            className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-[11px] font-bold transition-all"
                            title="Delete Ingredient"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recipe Mapping Matrix */}
          <div className="bg-[#2e211d] text-[#f4efe8] p-6 rounded-3xl border border-[#a19284]/30 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#e2d7c9]" />
              <h3 className="text-lg font-['Playfair_Display'] font-black text-[#f4efe8]">Live Puff Recipe Mapping Matrix</h3>
            </div>
            <p className="text-xs text-[#e2d7c9]">
              Links menu items to raw ingredient quantities for precise real-time inventory deduction.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {menuItems.map((item) => (
                <div key={item.id} className="p-3.5 bg-[#231916] rounded-2xl border border-[#a19284]/30">
                  <h5 className="font-['Playfair_Display'] font-bold text-[#e2d7c9] text-xs mb-1.5 flex items-center justify-between">
                    <span>{item.name}</span>
                    <span className="text-[#a19284] font-mono">₹{item.price}</span>
                  </h5>
                  <div className="space-y-1 text-[11px] text-[#e2d7c9]">
                    {item.recipe && item.recipe.length > 0 ? (
                      item.recipe.map((req, i) => {
                        const ing = ingredients.find((g) => g.id === req.ingredientId);
                        return (
                          <div key={i} className="flex justify-between border-b border-[#a19284]/20 pb-0.5">
                            <span>• {ing ? ing.name : req.ingredientId}</span>
                            <span className="font-bold text-[#f4efe8]">{req.quantityNeeded} {ing ? ing.unit : ''}</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-[#a19284] italic">No raw ingredients mapped</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: DAILY SALES ANALYTICS & REPORTING ----------------- */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Advanced Export & Date Range Filter Panel */}
          <ExportDataPanel orders={orders} />

          {/* Header & Single Day Picker for Quick Dashboard View */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#2e211d] text-[#f4efe8] p-5 rounded-3xl border border-[#a19284]/30 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-[#e2d7c9]" />
                <h2 className="text-xl font-['Playfair_Display'] font-black text-[#f4efe8]">Daily Revenue Overview</h2>
              </div>
              <p className="text-xs text-[#e2d7c9] mt-1">
                Real-time financial breakdown and top-selling items for quick daily inspection.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#a19284] font-bold">Select Day:</span>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-[#231916] text-[#e2d7c9] text-xs font-bold px-3 py-2 rounded-xl border border-[#a19284]/30 focus:outline-none"
              />
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-[#2e211d]">
            <div className="p-4 bg-white rounded-2xl border border-[#a19284]/30 shadow-xs">
              <span className="text-[10px] font-bold text-[#a19284] uppercase tracking-wider block font-['Cinzel']">Total Revenue</span>
              <p className="text-2xl font-['Playfair_Display'] font-black text-[#2e211d] mt-1">₹{salesSummary.totalRevenue.toFixed(2)}</p>
              <span className="text-[10px] font-bold text-[#8c3a27] bg-[#e2d7c9]/40 px-2 py-0.5 rounded mt-1.5 inline-block">
                {salesSummary.totalOrders} Orders
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#a19284]/30 shadow-xs">
              <span className="text-[10px] font-bold text-[#a19284] uppercase tracking-wider block font-['Cinzel']">Cash Sales</span>
              <p className="text-2xl font-['Playfair_Display'] font-black text-[#8c3a27] mt-1">₹{salesSummary.cashTotal.toFixed(2)}</p>
              <span className="text-[10px] text-[#a19284] mt-1 block">
                Pure: ₹{salesSummary.pureCashTotal} | Split: ₹{salesSummary.splitBreakdown.cash}
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#a19284]/30 shadow-xs">
              <span className="text-[10px] font-bold text-[#a19284] uppercase tracking-wider block font-['Cinzel']">UPI Sales</span>
              <p className="text-2xl font-['Playfair_Display'] font-black text-[#8c3a27] mt-1">₹{salesSummary.upiTotal.toFixed(2)}</p>
              <span className="text-[10px] text-[#a19284] mt-1 block">
                Pure: ₹{salesSummary.pureUpiTotal} | Split: ₹{salesSummary.splitBreakdown.upi}
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#a19284]/30 shadow-xs">
              <span className="text-[10px] font-bold text-[#a19284] uppercase tracking-wider block font-['Cinzel']">Card Sales</span>
              <p className="text-2xl font-['Playfair_Display'] font-black text-[#2e211d] mt-1">₹{salesSummary.cardTotal.toFixed(2)}</p>
              <span className="text-[10px] text-[#a19284] mt-1 block">
                Pure: ₹{salesSummary.pureCardTotal} | Split: ₹{salesSummary.splitBreakdown.card}
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#a19284]/30 shadow-xs">
              <span className="text-[10px] font-bold text-[#a19284] uppercase tracking-wider block font-['Cinzel']">Split Bills Total</span>
              <p className="text-2xl font-['Playfair_Display'] font-black text-[#8c3a27] mt-1">₹{salesSummary.splitTotal.toFixed(2)}</p>
              <span className="text-[10px] text-[#a19284] mt-1 block truncate">
                C: ₹{salesSummary.splitBreakdown.cash} | U: ₹{salesSummary.splitBreakdown.upi} | K: ₹{salesSummary.splitBreakdown.card}
              </span>
            </div>
          </div>

          {/* Top Selling Items Table */}
          <div className="bg-white rounded-3xl border border-[#a19284]/30 shadow-sm p-5 space-y-3 text-[#2e211d]">
            <h3 className="font-['Playfair_Display'] font-extrabold text-[#2e211d] text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#8c3a27]" />
              <span>Top-Selling Puffs for {filterDate}</span>
            </h3>

            {salesSummary.topSellingItems.length === 0 ? (
              <p className="text-xs text-[#a19284] italic py-4">No sales recorded for this date yet.</p>
            ) : (
              <div className="space-y-2">
                {salesSummary.topSellingItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#f4efe8]/50 rounded-2xl border border-[#a19284]/30 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#8c3a27] text-[#f4efe8] font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-['Playfair_Display'] font-bold text-[#2e211d]">{item.name}</span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-[#2e211d] block">{item.count} Sold</span>
                      <span className="text-[10px] text-[#a19284]">Revenue: ₹{item.revenue}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB 4: MASTER POS SETTINGS & CONTROL CENTER ----------------- */}
      {activeTab === 'setup' && (
        <div className="max-w-6xl mx-auto">
          <SettingsPanel />
        </div>
      )}

      {/* QUICK REFILL INGREDIENT STOCK MODAL */}
      {refillingIngredient && (
        <div className="fixed inset-0 z-50 bg-[#2e211d]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f4efe8] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#a19284]/40 text-[#2e211d] space-y-4">
            <h3 className="font-['Playfair_Display'] font-extrabold text-base text-[#2e211d]">
              Refill {refillingIngredient.name} Stock
            </h3>

            <div>
              <label className="text-xs font-bold text-[#a19284] block mb-1">
                New Stock Quantity ({refillingIngredient.unit})
              </label>
              <input
                type="number"
                value={newStockVal}
                onChange={(e) => setNewStockVal(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-sm font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  livePuffStore.updateIngredientStock(refillingIngredient.id, newStockVal);
                  setRefillingIngredient(null);
                }}
                className="flex-1 py-2.5 bg-[#8c3a27] text-[#f4efe8] font-bold text-xs rounded-xl shadow-md"
              >
                Save Stock
              </button>
              <button
                onClick={() => setRefillingIngredient(null)}
                className="px-4 py-2.5 bg-[#e2d7c9] text-[#2e211d] font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT INGREDIENT MODAL */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 bg-[#2e211d]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f4efe8] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#a19284]/40 text-[#2e211d] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#a19284]/30 pb-2">
              <h3 className="font-['Playfair_Display'] font-extrabold text-base text-[#2e211d]">
                Edit Raw Ingredient
              </h3>
              <span className="text-xs text-[#a19284] font-mono">{editingIngredient.id}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Ingredient Name</label>
                <input
                  type="text"
                  value={editingIngForm.name}
                  onChange={(e) => setEditingIngForm({ ...editingIngForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#a19284] block mb-1">Category</label>
                  <select
                    value={editingIngForm.category}
                    onChange={(e) => setEditingIngForm({ ...editingIngForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
                  >
                    <option value="Dairy & Cheese">Dairy & Cheese</option>
                    <option value="Produce">Produce</option>
                    <option value="Sauces & Spices">Sauces & Spices</option>
                    <option value="Dry Goods">Dry Goods</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#a19284] block mb-1">Measurement Unit</label>
                  <select
                    value={editingIngForm.unit}
                    onChange={(e) => setEditingIngForm({ ...editingIngForm, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
                  >
                    <option value="grams">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="liters">Liters (L)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#a19284] block mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={editingIngForm.currentStock}
                    onChange={(e) => setEditingIngForm({ ...editingIngForm, currentStock: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#a19284] block mb-1">Alert Level</label>
                  <input
                    type="number"
                    value={editingIngForm.minStockAlert}
                    onChange={(e) => setEditingIngForm({ ...editingIngForm, minStockAlert: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#a19284] block mb-1">Cost / Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingIngForm.costPerUnit}
                    onChange={(e) => setEditingIngForm({ ...editingIngForm, costPerUnit: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  if (!editingIngForm.name.trim()) {
                    alert('Ingredient name cannot be empty.');
                    return;
                  }
                  livePuffStore.updateIngredient(editingIngredient.id, {
                    name: editingIngForm.name.trim(),
                    category: editingIngForm.category,
                    unit: editingIngForm.unit,
                    currentStock: Number(editingIngForm.currentStock) || 0,
                    minStockAlert: Number(editingIngForm.minStockAlert) || 50,
                    costPerUnit: Number(editingIngForm.costPerUnit) || 0.1,
                  });
                  setEditingIngredient(null);
                }}
                className="flex-1 py-2.5 bg-[#8c3a27] text-[#f4efe8] font-bold text-xs rounded-xl shadow-md"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingIngredient(null)}
                className="px-4 py-2.5 bg-[#e2d7c9] text-[#2e211d] font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW INGREDIENT MODAL */}
      {isAddIngredientOpen && (
        <div className="fixed inset-0 z-50 bg-[#2e211d]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f4efe8] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#a19284]/40 text-[#2e211d] space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-['Playfair_Display'] font-extrabold text-base text-[#2e211d]">Add New Raw Ingredient</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Ingredient Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Fresh Malai Paneer Cubes"
                  value={newIngForm.name}
                  onChange={(e) => setNewIngForm({ ...newIngForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#a19284] block mb-1">Category</label>
                  <select
                    value={newIngForm.category}
                    onChange={(e) => setNewIngForm({ ...newIngForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
                  >
                    <option value="Dairy & Cheese">Dairy & Cheese</option>
                    <option value="Produce">Produce</option>
                    <option value="Sauces & Spices">Sauces & Spices</option>
                    <option value="Dry Goods">Dry Goods</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#a19284] block mb-1">Measurement Unit</label>
                  <select
                    value={newIngForm.unit}
                    onChange={(e) => setNewIngForm({ ...newIngForm, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
                  >
                    <option value="grams">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="liters">Liters (L)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#a19284] block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newIngForm.currentStock}
                    onChange={(e) => setNewIngForm({ ...newIngForm, currentStock: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#a19284] block mb-1">Alert Level</label>
                  <input
                    type="number"
                    value={newIngForm.minStockAlert}
                    onChange={(e) => setNewIngForm({ ...newIngForm, minStockAlert: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#a19284] block mb-1">Cost / Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newIngForm.costPerUnit}
                    onChange={(e) => setNewIngForm({ ...newIngForm, costPerUnit: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  if (!newIngForm.name.trim()) {
                    alert('Please enter an ingredient name.');
                    return;
                  }
                  livePuffStore.addIngredient({
                    name: newIngForm.name.trim(),
                    category: newIngForm.category,
                    unit: newIngForm.unit,
                    currentStock: Number(newIngForm.currentStock) || 0,
                    minStockAlert: Number(newIngForm.minStockAlert) || 50,
                    costPerUnit: Number(newIngForm.costPerUnit) || 0.1,
                  });
                  setIsAddIngredientOpen(false);
                  setNewIngForm({
                    name: '',
                    category: 'Dry Goods',
                    unit: 'grams',
                    currentStock: 1000,
                    minStockAlert: 200,
                    costPerUnit: 0.2,
                  });
                }}
                className="flex-1 py-2.5 bg-[#8c3a27] text-[#f4efe8] font-bold text-xs rounded-xl shadow-md"
              >
                Save Ingredient
              </button>
              <button
                onClick={() => setIsAddIngredientOpen(false)}
                className="px-4 py-2.5 bg-[#e2d7c9] text-[#2e211d] font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Flame, 
  FileText, 
  QrCode, 
  X,
  Sparkles
} from 'lucide-react';
import { PuffItem, CartItem, PaymentMode, OrderType, Order, AppMasterSettings } from '../types';
import { livePuffStore } from '../services/store';
import { settingsStore } from '../services/settingsStore';
import { customerStore } from '../services/customerStore';
import { CustomerInput } from './CustomerInput';

interface MobilePOSProps {
  menuItems: PuffItem[];
  onOrderPlaced: (order: Order) => void;
  onRequestUPIQR: (amount: number, tokenNo: number, order?: Order) => void;
}

export const MobilePOS: React.FC<MobilePOSProps> = ({
  menuItems,
  onOrderPlaced,
  onRequestUPIQR,
}) => {
  const [settings, setSettings] = useState<AppMasterSettings>(settingsStore.getSettings());
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Cart & Order Form State
  const [orderType, setOrderType] = useState<OrderType>('Dine In');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [splitCash, setSplitCash] = useState<number | ''>(0);
  const [splitUpi, setSplitUpi] = useState<number | ''>(0);
  const [splitCard, setSplitCard] = useState<number | ''>(0);
  const [gstEnabled, setGstEnabled] = useState<boolean>(false);
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [staffName, setStaffName] = useState<string>('Mobile Order Staff');

  useEffect(() => {
    return settingsStore.subscribeSettings(setSettings);
  }, []);

  const categories: string[] = ['ALL', ...(settings.menu.categories || [])];

  useEffect(() => {
    if (selectedCategory !== 'ALL' && !settings.menu.categories.includes(selectedCategory)) {
      setSelectedCategory('ALL');
    }
  }, [settings.menu.categories, selectedCategory]);

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getItemQuantityInCart = (itemId: string): number => {
    const found = cart.find((ci) => ci.item.id === itemId);
    return found ? found.quantity : 0;
  };

  const handleAddToCart = (item: PuffItem) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((ci) => ci.item.id === item.id);
      if (existingIdx !== -1) {
        return prev.map((ci, i) =>
          i === existingIdx ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item, quantity: 1, notes: '' }];
    });
  };

  const handleRemoveOneFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((ci) => ci.item.id !== itemId);
      }
      return prev.map((ci) =>
        ci.item.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci
      );
    });
  };

  const handleUpdateItemNotes = (itemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((ci) => (ci.item.id === itemId ? { ...ci, notes } : ci))
    );
  };

  const totalItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const subtotal = cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);
  const gstAmount = gstEnabled ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
  const grandTotal = Math.max(0, subtotal + gstAmount);
  const roundedGrandTotal = Math.round(grandTotal);

  const numSplitCash = Number(splitCash) || 0;
  const numSplitUpi = Number(splitUpi) || 0;
  const numSplitCard = Number(splitCard) || 0;
  const splitSum = numSplitCash + numSplitUpi + numSplitCard;
  const isSplitValid = paymentMode !== 'SPLIT' || splitSum === roundedGrandTotal;

  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (paymentMode === 'SPLIT' && !isSplitValid) {
      alert(`Split total (₹${splitSum}) must equal bill total (₹${roundedGrandTotal}).`);
      return;
    }

    // Place Order
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
      deviceType: 'mobile',
      gstEnabled,
      staffName,
    });

    onOrderPlaced(newOrder);

    if (paymentMode === 'UPI') {
      onRequestUPIQR(newOrder.total, newOrder.tokenNo, newOrder);
    } else if (paymentMode === 'SPLIT' && numSplitUpi > 0) {
      onRequestUPIQR(numSplitUpi, newOrder.tokenNo, newOrder);
    }

    setCart([]);
    setIsCartOpen(false);
    setCustomerNotes('');
    setCustomerName('');
    setCustomerMobile('');
    setSplitCash(0);
    setSplitUpi(0);
    setSplitCard(0);
  };

  return (
    <div className="pb-24 pt-3 px-3 sm:px-6 max-w-5xl mx-auto">
      {/* Mobile Search & Filters */}
      <div className="space-y-3 mb-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3 text-[#a19284]" />
          <input
            type="text"
            placeholder="Search Makhani, Cheese, Paneer, Chaas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#a19284]/40 rounded-2xl text-[#2e211d] placeholder:text-[#a19284] text-sm focus:outline-none focus:border-[#8c3a27] shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-[#a19284] hover:text-[#2e211d] text-xs font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#8c3a27] text-[#f4efe8] shadow-md scale-105'
                  : 'bg-white text-[#2e211d] hover:bg-[#e2d7c9]/30 border border-[#a19284]/30'
              }`}
            >
              {cat === 'ALL' ? '🔥 All Items' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Item Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredItems.map((item) => {
          const qty = getItemQuantityInCart(item.id);
          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl p-3.5 border transition-all flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-md ${
                qty > 0 ? 'border-[#8c3a27] ring-2 ring-[#8c3a27]/20 bg-[#f4efe8]/50' : 'border-[#a19284]/30'
              } ${!item.isAvailable ? 'opacity-60 bg-[#e2d7c9]/20' : ''}`}
            >
              <div>
                <div className="flex flex-col gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] text-[#a19284] font-bold uppercase tracking-wider truncate font-['Cinzel']">
                      {item.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-['Playfair_Display'] font-black text-[#2e211d] text-sm leading-snug truncate">
                      {item.name}
                    </h4>
                    <span className="font-bold text-[#8c3a27] text-base shrink-0">
                      ₹{item.price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="mt-2 pt-2 border-t border-[#a19284]/20 flex items-center justify-between">
                {!item.isAvailable ? (
                  <span className="text-xs font-bold text-[#8c3a27] bg-[#e2d7c9]/50 px-2.5 py-1 rounded-lg">
                    Out of Stock
                  </span>
                ) : qty > 0 ? (
                  <div className="flex items-center justify-between w-full bg-[#e2d7c9]/40 p-1 rounded-xl border border-[#a19284]/40">
                    <button
                      onClick={() => handleRemoveOneFromCart(item.id)}
                      className="w-8 h-8 rounded-lg bg-white text-[#8c3a27] font-black shadow-sm flex items-center justify-center active:scale-90"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-black text-[#2e211d] text-sm px-3">
                      {qty}
                    </span>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="w-8 h-8 rounded-lg bg-[#8c3a27] text-[#f4efe8] font-black shadow-sm flex items-center justify-center active:scale-90"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="w-full py-2 bg-[#2e211d] hover:bg-[#8c3a27] text-[#f4efe8] font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#e2d7c9]" />
                    <span>ADD TO CART</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Cart Bar */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-4 left-3 right-3 z-30 max-w-lg mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#8c3a27] hover:bg-[#732f1f] text-[#f4efe8] p-3.5 rounded-2xl shadow-2xl border border-[#a19284]/40 flex items-center justify-between active:scale-98 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#2e211d]/40 p-2 rounded-xl text-[#f4efe8] font-bold text-xs flex items-center gap-1 border border-[#f4efe8]/20">
                <ShoppingBag className="w-4 h-4" />
                <span>{totalItemCount} ITEMS</span>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-[#e2d7c9] uppercase tracking-wide font-bold">Current Order</p>
                <p className="text-sm font-black text-[#f4efe8]">₹{subtotal} + Tax</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-xs bg-[#f4efe8] text-[#2e211d] px-3.5 py-2 rounded-xl shadow-md">
              <span>VIEW CART</span>
              <Sparkles className="w-3.5 h-3.5 text-[#8c3a27]" />
            </div>
          </button>
        </div>
      )}

      {/* Slide-Up Mobile Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-[#2e211d]/70 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-[#f4efe8] rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border-t border-[#a19284]/40 text-[#2e211d]">
            {/* Modal Header */}
            <div className="p-4 bg-[#2e211d] text-[#f4efe8] flex items-center justify-between border-b border-[#a19284]/30">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#e2d7c9]" />
                <div>
                  <h3 className="font-['Playfair_Display'] font-black text-base">Current Cart & Billing</h3>
                  <p className="text-[11px] text-[#a19284]">Live Order Taker POS</p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-[#a19284] hover:text-[#f4efe8] bg-[#1b1311] rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Order Items */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {/* Order Type Selector */}
              <div className="flex items-center gap-2 bg-[#e2d7c9] p-1 rounded-xl">
                <button
                  onClick={() => setOrderType('Dine In')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    orderType === 'Dine In' ? 'bg-[#8c3a27] text-[#f4efe8] shadow-sm' : 'text-[#2e211d]'
                  }`}
                >
                  Dine In (Table)
                </button>
                <button
                  onClick={() => setOrderType('Takeaway')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    orderType === 'Takeaway' ? 'bg-[#8c3a27] text-[#f4efe8] shadow-sm' : 'text-[#2e211d]'
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
                orders={livePuffStore.getOrders()}
                layout="compact"
              />

              {/* Cart Items */}
              <div className="space-y-2.5 my-2">
                {cart.map((ci) => (
                  <div key={ci.item.id} className="p-3 bg-white rounded-xl border border-[#a19284]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-['Playfair_Display'] font-bold text-[#2e211d] text-xs">{ci.item.name}</h5>
                        <p className="text-[11px] text-[#a19284]">₹{ci.item.price} x {ci.quantity} = <strong className="text-[#8c3a27]">₹{ci.item.price * ci.quantity}</strong></p>
                      </div>

                      <div className="flex items-center gap-2 bg-[#f4efe8] px-2 py-1 rounded-lg border border-[#a19284]/30">
                        <button
                          onClick={() => handleRemoveOneFromCart(ci.item.id)}
                          className="text-[#a19284] hover:text-[#2e211d] p-0.5"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black text-xs min-w-[16px] text-center text-[#2e211d]">{ci.quantity}</span>
                        <button
                          onClick={() => handleAddToCart(ci.item)}
                          className="text-[#8c3a27] p-0.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Kitchen Note */}
                    <div className="flex items-center gap-1.5 bg-[#e2d7c9]/40 px-2 py-1 rounded-lg border border-[#a19284]/30">
                      <FileText className="w-3 h-3 text-[#8c3a27] shrink-0" />
                      <input
                        type="text"
                        placeholder="Note e.g. Extra crispy, less spicy..."
                        value={ci.notes || ''}
                        onChange={(e) => handleUpdateItemNotes(ci.item.id, e.target.value)}
                        className="w-full bg-transparent text-[11px] text-[#2e211d] placeholder:text-[#a19284] focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Kitchen Request */}
              <div>
                <label className="text-[11px] font-bold text-[#a19284] block mb-1">Kitchen Special Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Serve hot, chutney separately"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs text-[#2e211d] placeholder:text-[#a19284] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#a19284] block">Payment Mode</label>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => setPaymentMode('CASH')}
                    className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                      paymentMode === 'CASH'
                        ? 'bg-[#8c3a27] text-[#f4efe8] border-[#8c3a27]'
                        : 'bg-white text-[#2e211d] border-[#a19284]/30'
                    }`}
                  >
                    💵 Cash
                  </button>
                  <button
                    onClick={() => setPaymentMode('UPI')}
                    className={`py-2 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-0.5 transition-all ${
                      paymentMode === 'UPI'
                        ? 'bg-[#8c3a27] text-[#f4efe8] border-[#8c3a27]'
                        : 'bg-white text-[#2e211d] border-[#a19284]/30'
                    }`}
                  >
                    <QrCode className="w-3 h-3" />
                    <span>UPI</span>
                  </button>
                  <button
                    onClick={() => setPaymentMode('CARD')}
                    className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                      paymentMode === 'CARD'
                        ? 'bg-[#8c3a27] text-[#f4efe8] border-[#8c3a27]'
                        : 'bg-white text-[#2e211d] border-[#a19284]/30'
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
                    className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                      paymentMode === 'SPLIT'
                        ? 'bg-[#8c3a27] text-[#f4efe8] border-[#8c3a27]'
                        : 'bg-white text-[#2e211d] border-[#a19284]/30'
                    }`}
                  >
                    🔀 Split
                  </button>
                </div>

                {paymentMode === 'SPLIT' && (
                  <div className="p-3 bg-white border border-[#8c3a27]/30 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#8c3a27]">
                      <span>Split Payment Breakdown</span>
                      <button
                        onClick={() => {
                          const remaining = Math.max(0, roundedGrandTotal - (Number(splitUpi)||0) - (Number(splitCard)||0));
                          setSplitCash(remaining);
                        }}
                        className="text-[10px] underline hover:text-[#732f1f]"
                      >
                        Auto-Balance
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className="text-[10px] font-bold text-[#a19284] block">Cash (₹)</label>
                        <input
                          type="number"
                          value={splitCash}
                          onChange={(e) => setSplitCash(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2 py-1 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-lg text-xs font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#a19284] block">UPI (₹)</label>
                        <input
                          type="number"
                          value={splitUpi}
                          onChange={(e) => setSplitUpi(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2 py-1 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-lg text-xs font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#a19284] block">Card (₹)</label>
                        <input
                          type="number"
                          value={splitCard}
                          onChange={(e) => setSplitCard(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2 py-1 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-lg text-xs font-bold focus:outline-none"
                        />
                      </div>
                    </div>

                    {!isSplitValid && (
                      <div className="text-[10px] font-bold text-rose-700 bg-rose-50 p-1 rounded border border-rose-200">
                        ⚠ Split (₹{splitSum}) ≠ Total (₹{roundedGrandTotal})
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bill Summary */}
              <div className="bg-white p-3 rounded-2xl border border-[#a19284]/30 space-y-1.5 text-xs text-[#2e211d]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#2e211d]">₹{subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gstEnabled}
                      onChange={(e) => setGstEnabled(e.target.checked)}
                      className="rounded text-[#8c3a27] focus:ring-[#8c3a27]"
                    />
                    <span>Add Extra 5% GST</span>
                  </label>
                  <span className="font-semibold text-[#2e211d]">₹{gstAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-black text-sm text-[#2e211d] pt-1 border-t border-[#a19284]/30">
                  <span>Total Amount</span>
                  <span className="text-[#8c3a27]">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Checkout Button */}
            <div className="p-4 bg-white border-t border-[#a19284]/30">
              <button
                onClick={handleCheckout}
                className="w-full py-3.5 bg-[#8c3a27] hover:bg-[#732f1f] active:scale-98 text-[#f4efe8] font-bold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Flame className="w-5 h-5" />
                <span>PLACE ORDER & SEND KOT</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

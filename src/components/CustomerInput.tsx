import React, { useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import { customerStore, CustomerRecord } from '../services/customerStore';
import { 
  User, 
  Phone, 
  Search, 
  Sparkles, 
  Clock, 
  ShoppingBag, 
  IndianRupee, 
  ChevronDown, 
  X, 
  CheckCircle,
  FileText,
  UserCheck,
  UserPlus
} from 'lucide-react';

interface CustomerInputProps {
  customerName: string;
  customerMobile: string;
  onChangeName: (name: string) => void;
  onChangeMobile: (mobile: string) => void;
  orders: Order[];
  onRequestReceiptPrint?: (order: Order) => void;
  layout?: 'compact' | 'standard';
}

export const CustomerInput: React.FC<CustomerInputProps> = ({
  customerName,
  customerMobile,
  onChangeName,
  onChangeMobile,
  orders,
  onRequestReceiptPrint,
  layout = 'standard',
}) => {
  const [suggestions, setSuggestions] = useState<CustomerRecord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFocus, setActiveFocus] = useState<'name' | 'mobile' | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<CustomerRecord | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update selected customer record whenever mobile number or orders change
  useEffect(() => {
    const cleanMobile = customerMobile.trim();
    if (cleanMobile.length >= 7) {
      const rec = customerStore.getCustomerByMobile(cleanMobile, orders);
      setSelectedRecord(rec);

      // Auto-fill customer name if customer exists and name input is currently empty or generic
      if (rec && rec.customerName && rec.customerName !== 'Guest Customer') {
        if (!customerName || customerName.startsWith('Customer ')) {
          onChangeName(rec.customerName);
        }
      }
    } else {
      setSelectedRecord(null);
    }
  }, [customerMobile, orders]);

  // Handle typing in Name field
  const handleNameChange = (val: string) => {
    onChangeName(val);
    if (val.trim().length >= 2) {
      const results = customerStore.searchCustomers(val, orders);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    // If mobile number is present and user updates name, keep customerStore synced
    const cleanMobile = customerMobile.trim();
    if (cleanMobile.length >= 10 && val.trim()) {
      customerStore.updateCustomerInfo(cleanMobile, val.trim());
    }
  };

  // Handle typing in Mobile field
  const handleMobileChange = (val: string) => {
    // Only allow numeric characters, max 10
    const cleanVal = val.replace(/\D/g, '').slice(0, 10);
    onChangeMobile(cleanVal);

    if (cleanVal.length >= 3) {
      const results = customerStore.searchCustomers(cleanVal, orders);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    // Auto lookup when 10 digits completed
    if (cleanVal.length >= 10) {
      const match = customerStore.getCustomerByMobile(cleanVal, orders);
      if (match && match.customerName && match.customerName !== 'Guest Customer') {
        onChangeName(match.customerName);
      }
      if (customerName && customerName.trim()) {
        customerStore.updateCustomerInfo(cleanVal, customerName.trim());
      }
    }
  };

  // Select customer from suggestion dropdown
  const handleSelectCustomer = (c: CustomerRecord) => {
    onChangeName(c.customerName);
    onChangeMobile(c.mobileNumber);
    setSelectedRecord(c);
    setShowSuggestions(false);
    if (c.mobileNumber && c.customerName) {
      customerStore.updateCustomerInfo(c.mobileNumber, c.customerName);
    }
  };

  // Orders for the selected customer history modal
  const customerOrders = selectedRecord 
    ? orders.filter(o => o.customerMobile?.trim() === selectedRecord.mobileNumber) 
    : [];

  return (
    <div ref={containerRef} className="relative space-y-2">
      {/* Label Bar */}
      <div className="flex items-center justify-between text-[10px] font-bold text-[#a19284] uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3 text-[#8c3a27]" />
          <span>Customer Identification</span>
        </span>
        {selectedRecord ? (
          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 text-[9px]">
            <UserCheck className="w-2.5 h-2.5" />
            Existing Customer ({selectedRecord.totalVisits} visits)
          </span>
        ) : customerMobile.length >= 10 ? (
          <span className="text-[#8c3a27] bg-[#8c3a27]/10 px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 text-[9px]">
            <UserPlus className="w-2.5 h-2.5" />
            New Customer Profile
          </span>
        ) : null}
      </div>

      {/* Input Fields Grid */}
      <div className={`grid ${layout === 'compact' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-2`}>
        {/* Mobile Input */}
        <div className="relative">
          <div className="absolute left-2.5 top-2.5 text-[#a19284] flex items-center gap-1 text-xs font-mono font-bold">
            <Phone className="w-3.5 h-3.5 text-[#8c3a27]" />
            <span className="text-[10px] text-[#a19284]">+91</span>
          </div>
          <input
            type="tel"
            placeholder="Mobile Number (Primary)"
            value={customerMobile}
            onChange={(e) => handleMobileChange(e.target.value)}
            onFocus={() => setActiveFocus('mobile')}
            maxLength={10}
            className="w-full pl-14 pr-3 py-2 bg-white border border-[#a19284]/30 rounded-xl text-xs font-mono font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27] focus:ring-1 focus:ring-[#8c3a27]"
          />
        </div>

        {/* Name Input */}
        <div className="relative">
          <User className="w-3.5 h-3.5 absolute left-3 top-3 text-[#a19284]" />
          <input
            type="text"
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => setActiveFocus('name')}
            className="w-full pl-8 pr-3 py-2 bg-white border border-[#a19284]/30 rounded-xl text-xs font-semibold text-[#2e211d] focus:outline-none focus:border-[#8c3a27] focus:ring-1 focus:ring-[#8c3a27]"
          />
        </div>
      </div>

      {/* Autocomplete Suggestions Popup */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white border border-[#a19284]/30 rounded-2xl shadow-xl overflow-hidden divide-y divide-[#a19284]/10 max-h-56 overflow-y-auto">
          <div className="bg-[#2e211d] text-[#f4efe8] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Matching Customer Records ({suggestions.length})</span>
            <span className="text-[#a19284]">Click to auto-fill</span>
          </div>
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelectCustomer(c)}
              className="w-full px-3 py-2 text-left hover:bg-[#f4efe8] transition-colors flex items-center justify-between gap-2"
            >
              <div>
                <div className="text-xs font-extrabold text-[#2e211d] flex items-center gap-1.5">
                  <span>{c.customerName}</span>
                  <span className="text-[10px] font-mono text-[#8c3a27] font-bold">({c.mobileNumber})</span>
                </div>
                <div className="text-[10px] text-[#a19284] flex items-center gap-2 mt-0.5">
                  <span>{c.totalVisits} {c.totalVisits === 1 ? 'visit' : 'visits'}</span>
                  <span>•</span>
                  <span>Total Spent: ₹{c.totalAmountSpent.toFixed(0)}</span>
                </div>
              </div>

              {c.frequentItems[0] && (
                <div className="text-right text-[10px] text-[#8c3a27] font-semibold hidden sm:block">
                  Fav: {c.frequentItems[0].name} ({c.frequentItems[0].count}x)
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Returning Customer Insight Card */}
      {selectedRecord && (
        <div className="bg-[#f4efe8]/90 border border-[#8c3a27]/30 rounded-xl p-2.5 text-xs text-[#2e211d] space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8c3a27]" />
              <span className="font-extrabold text-[#8c3a27]">{selectedRecord.customerName}</span>
              <span className="text-[10px] font-bold text-[#a19284] font-mono">({selectedRecord.mobileNumber})</span>
            </div>

            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="text-[10px] font-bold text-[#8c3a27] hover:underline flex items-center gap-0.5 bg-white px-2 py-0.5 rounded border border-[#8c3a27]/20"
            >
              <Clock className="w-3 h-3" />
              <span>History ({selectedRecord.totalVisits})</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center bg-white p-1.5 rounded-lg border border-[#a19284]/20 text-[10px]">
            <div>
              <span className="text-[#a19284] font-bold uppercase block text-[9px]">Total Visits</span>
              <span className="font-extrabold text-[#2e211d] text-xs">{selectedRecord.totalVisits}</span>
            </div>
            <div>
              <span className="text-[#a19284] font-bold uppercase block text-[9px]">Lifetime Spend</span>
              <span className="font-extrabold text-[#8c3a27] text-xs">₹{selectedRecord.totalAmountSpent.toFixed(0)}</span>
            </div>
            <div>
              <span className="text-[#a19284] font-bold uppercase block text-[9px]">Last Visit</span>
              <span className="font-bold text-[#2e211d] text-[10px]">
                {new Date(selectedRecord.lastOrderDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          {selectedRecord.frequentItems.length > 0 && (
            <div className="text-[10px] text-[#2e211d] flex items-center gap-1 font-medium truncate">
              <ShoppingBag className="w-3 h-3 text-[#8c3a27] shrink-0" />
              <span className="font-bold text-[#a19284]">Favorite:</span>
              <span className="truncate">
                {selectedRecord.frequentItems.slice(0, 2).map((i) => `${i.name} (${i.count}x)`).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Customer History Modal */}
      {showHistoryModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl overflow-hidden border border-[#a19284]/30 flex flex-col max-h-[85vh]">
            <div className="bg-[#2e211d] text-[#f4efe8] p-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-[#8c3a27]" />
                  <span>{selectedRecord.customerName}</span>
                </h3>
                <p className="text-[11px] text-[#e2d7c9] font-mono mt-0.5">{selectedRecord.mobileNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-[#e2d7c9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div className="text-xs font-bold text-[#2e211d]">Recent Orders ({customerOrders.length})</div>

              {customerOrders.length === 0 ? (
                <div className="text-center py-6 text-[#a19284]">No previous orders found.</div>
              ) : (
                customerOrders.map((ord) => (
                  <div key={ord.id} className="p-3 bg-[#f4efe8]/40 border border-[#a19284]/20 rounded-xl space-y-1">
                    <div className="flex items-center justify-between font-bold text-[#2e211d]">
                      <span>Invoice #{ord.invoiceNo || ord.id.slice(-6)} (Token #{ord.tokenNo})</span>
                      <span className="text-[#8c3a27] font-extrabold">₹{(ord.roundedTotal || ord.total).toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-[#a19284] flex items-center justify-between">
                      <span>{new Date(ord.createdAt).toLocaleString()} • {ord.paymentMode}</span>
                      <span className="text-green-700 font-bold">{ord.status}</span>
                    </div>
                    <div className="text-[11px] text-[#2e211d]">
                      {ord.items.map((i) => `${i.quantity}x ${i.itemName}`).join(', ')}
                    </div>
                    {onRequestReceiptPrint && (
                      <div className="text-right pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowHistoryModal(false);
                            onRequestReceiptPrint(ord);
                          }}
                          className="px-2.5 py-1 bg-[#2e211d] text-white rounded text-[10px] font-bold"
                        >
                          Print Receipt
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

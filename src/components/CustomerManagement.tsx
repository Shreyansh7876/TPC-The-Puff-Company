import React, { useState, useMemo } from 'react';
import { Order } from '../types';
import { customerStore, CustomerRecord } from '../services/customerStore';
import { 
  Users, 
  Search, 
  Download, 
  Calendar, 
  IndianRupee, 
  ShoppingBag, 
  Phone, 
  User, 
  CreditCard, 
  Sparkles,
  ArrowUpDown,
  FileText,
  Clock,
  X,
  Edit2,
  Check
} from 'lucide-react';

interface CustomerManagementProps {
  orders: Order[];
  onRequestReceiptPrint: (order: Order) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  orders,
  onRequestReceiptPrint,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [editingMobile, setEditingMobile] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [sortBy, setSortBy] = useState<'spent' | 'visits' | 'lastDate'>('spent');

  // Compute all customer records from live orders + stored customer database
  const customers = useMemo(() => {
    return customerStore.getAllCustomers(orders);
  }, [orders]);

  // Filtered & Sorted Customer List
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;
        return (
          c.customerName.toLowerCase().includes(term) ||
          c.mobileNumber.includes(term)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'spent') return b.totalAmountSpent - a.totalAmountSpent;
        if (sortBy === 'visits') return b.totalVisits - a.totalVisits;
        if (sortBy === 'lastDate') return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
        return 0;
      });
  }, [customers, searchTerm, sortBy]);

  // Aggregate Customer Stats
  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter((c) => c.totalVisits > 1).length;
  const totalCustomerRevenue = customers.reduce((sum, c) => sum + c.totalAmountSpent, 0);
  const avgLifetimeValue = totalCustomers > 0 ? Math.round(totalCustomerRevenue / totalCustomers) : 0;

  const handleStartEdit = (c: CustomerRecord) => {
    setEditingMobile(c.mobileNumber);
    setEditNameInput(c.customerName);
  };

  const handleSaveEdit = (mobile: string) => {
    if (editNameInput.trim()) {
      customerStore.updateCustomerInfo(mobile, editNameInput.trim());
    }
    setEditingMobile(null);
  };

  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter((o) => o.customerMobile?.trim() === selectedCustomer.mobileNumber);
  }, [orders, selectedCustomer]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-[#2e211d] text-[#f4efe8] p-5 sm:p-6 rounded-2xl border border-[#a19284]/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#e2d7c9] text-xs font-bold tracking-wider uppercase mb-1">
            <Users className="w-4 h-4 text-[#8c3a27]" />
            <span>Customer Database & Marketing Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Customer Management</h1>
          <p className="text-xs sm:text-sm text-[#e2d7c9]/80 mt-1">
            Track customer spend, order frequency, favorite items, and export CRM data for WhatsApp marketing.
          </p>
        </div>

        <button
          onClick={() => customerStore.exportCustomersToCSV(filteredCustomers)}
          className="flex items-center justify-center gap-2 bg-[#8c3a27] hover:bg-[#732f1f] text-[#f4efe8] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Export Customer CSV</span>
        </button>
      </div>

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#a19284]/20 shadow-sm">
          <div className="flex items-center justify-between text-[#a19284] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Customers</span>
            <Users className="w-4 h-4 text-[#8c3a27]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#2e211d]">{totalCustomers}</div>
          <div className="text-[11px] text-[#a19284] mt-1">Registered Phone Identifiers</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#a19284]/20 shadow-sm">
          <div className="flex items-center justify-between text-[#a19284] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Loyal Repeaters</span>
            <Sparkles className="w-4 h-4 text-[#8c3a27]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#2e211d]">{repeatCustomers}</div>
          <div className="text-[11px] text-[#a19284] mt-1">
            {totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0}% Repeat Rate
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#a19284]/20 shadow-sm">
          <div className="flex items-center justify-between text-[#a19284] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Customer Revenue</span>
            <IndianRupee className="w-4 h-4 text-[#8c3a27]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#2e211d]">₹{totalCustomerRevenue.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-[#a19284] mt-1">Tracked Customer Orders</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#a19284]/20 shadow-sm">
          <div className="flex items-center justify-between text-[#a19284] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Spend / Customer</span>
            <ShoppingBag className="w-4 h-4 text-[#8c3a27]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#2e211d]">₹{avgLifetimeValue}</div>
          <div className="text-[11px] text-[#a19284] mt-1">Lifetime Value (LTV)</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#a19284]/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#a19284]" />
          <input
            type="text"
            placeholder="Search by Name or Mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f4efe8]/50 border border-[#a19284]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8c3a27] text-[#2e211d]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
          <span className="text-[#a19284] font-bold flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort by:
          </span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-[#f4efe8] border border-[#a19284]/30 rounded-lg px-3 py-2 text-xs font-bold text-[#2e211d] focus:outline-none"
          >
            <option value="spent">Highest Total Spend (₹)</option>
            <option value="visits">Most Visits / Orders</option>
            <option value="lastDate">Most Recent Visit</option>
          </select>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-xl border border-[#a19284]/20 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#2e211d] text-[#f4efe8] uppercase text-[10px] tracking-wider">
                <th className="p-3.5 font-bold">Customer Name</th>
                <th className="p-3.5 font-bold">Mobile Number</th>
                <th className="p-3.5 font-bold text-center">Visits</th>
                <th className="p-3.5 font-bold text-right">Total Spent</th>
                <th className="p-3.5 font-bold">Last Visit</th>
                <th className="p-3.5 font-bold">Top Bought Item</th>
                <th className="p-3.5 font-bold">Payment Methods</th>
                <th className="p-3.5 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#a19284]/15 text-[#2e211d]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#a19284]">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-bold">No customers found.</p>
                    <p className="text-[11px] text-[#a19284]/80 mt-0.5">
                      Enter optional Customer Mobile numbers during POS Billing to automatically build customer profiles.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const isEditing = editingMobile === c.mobileNumber;
                  const topItem = c.frequentItems[0];
                  return (
                    <tr key={c.id} className="hover:bg-[#f4efe8]/50 transition-colors">
                      <td className="p-3.5 font-bold">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editNameInput}
                              onChange={(e) => setEditNameInput(e.target.value)}
                              className="px-2 py-1 border border-[#8c3a27] rounded text-xs focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(c.mobileNumber)}
                              className="p-1 bg-[#8c3a27] text-white rounded hover:bg-[#732f1f]"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#8c3a27]" />
                            <span>{c.customerName}</span>
                            <button
                              onClick={() => handleStartEdit(c)}
                              className="text-[#a19284] hover:text-[#2e211d] p-0.5"
                              title="Edit Customer Name"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-[#8c3a27]">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#a19284]" />
                          <span>{c.mobileNumber}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${c.totalVisits > 1 ? 'bg-[#8c3a27]/10 text-[#8c3a27]' : 'bg-gray-100 text-gray-700'}`}>
                          {c.totalVisits} {c.totalVisits === 1 ? 'visit' : 'visits'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-[#2e211d]">
                        ₹{c.totalAmountSpent.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-[#a19284] font-medium text-[11px]">
                        {new Date(c.lastOrderDate).toLocaleDateString()}{' '}
                        {new Date(c.lastOrderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3.5">
                        {topItem ? (
                          <span className="font-semibold text-[#2e211d]">
                            {topItem.name} <span className="text-[#8c3a27]">({topItem.count}x)</span>
                          </span>
                        ) : (
                          <span className="text-[#a19284] italic">None</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {c.paymentModesUsed.map((m) => (
                            <span key={m} className="px-1.5 py-0.5 bg-[#231916] text-[#f4efe8] rounded text-[9px] font-bold">
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedCustomer(c)}
                          className="px-2.5 py-1 bg-[#2e211d] hover:bg-[#8c3a27] text-[#f4efe8] rounded-lg font-bold text-[11px] transition-all"
                        >
                          History
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden border border-[#a19284]/30 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#2e211d] text-[#f4efe8] p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8c3a27] flex items-center justify-center text-white font-extrabold text-lg">
                  {selectedCustomer.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg leading-tight">{selectedCustomer.customerName}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#e2d7c9]">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{selectedCustomer.mobileNumber}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-[#e2d7c9] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Customer Summary Bar */}
            <div className="bg-[#f4efe8] p-4 border-b border-[#a19284]/20 grid grid-cols-3 text-center">
              <div>
                <div className="text-[10px] uppercase font-bold text-[#a19284]">Total Orders</div>
                <div className="text-lg font-extrabold text-[#2e211d]">{selectedCustomer.orderCount}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#a19284]">Total Lifetime Spend</div>
                <div className="text-lg font-extrabold text-[#8c3a27]">₹{selectedCustomer.totalAmountSpent.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[#a19284]">Last Order</div>
                <div className="text-xs font-bold text-[#2e211d] mt-1">
                  {new Date(selectedCustomer.lastOrderDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Modal Body: Order History */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              <h4 className="font-bold text-sm text-[#2e211d] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#8c3a27]" /> Order History
              </h4>

              {customerOrders.length === 0 ? (
                <div className="text-center py-6 text-[#a19284] text-xs font-semibold">
                  No orders found for this customer.
                </div>
              ) : (
                <div className="space-y-3">
                  {customerOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-xl border border-[#a19284]/20 bg-[#f4efe8]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-[#2e211d]">
                            Invoice #{ord.invoiceNo || ord.id.slice(-6)}
                          </span>
                          <span className="px-2 py-0.5 bg-[#8c3a27]/10 text-[#8c3a27] font-bold text-[10px] rounded">
                            Token #{ord.tokenNo}
                          </span>
                          <span className="px-2 py-0.5 bg-[#231916] text-[#f4efe8] font-bold text-[10px] rounded">
                            {ord.paymentMode}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#a19284]">
                          {new Date(ord.createdAt).toLocaleString()} • {ord.orderType}
                        </div>
                        <div className="text-xs text-[#2e211d] font-medium">
                          {ord.items.map((i) => `${i.quantity}x ${i.itemName}`).join(', ')}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-[#2e211d]">
                            ₹{(ord.roundedTotal || ord.total).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-green-700 font-bold uppercase">{ord.status}</div>
                        </div>

                        <button
                          onClick={() => onRequestReceiptPrint(ord)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#2e211d] hover:bg-[#8c3a27] text-white rounded-lg text-xs font-bold transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

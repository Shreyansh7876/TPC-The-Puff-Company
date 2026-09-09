import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Play, 
  Utensils, 
  Flame, 
  AlertCircle,
  BellRing,
  Ban,
  RotateCcw,
  Printer
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { livePuffStore } from '../services/store';
import { CancelOrderModal } from './CancelOrderModal';
import { PrintKOTModal } from './PrintKOTModal';

interface KOTDisplayProps {
  orders: Order[];
}

export const KOTDisplay: React.FC<KOTDisplayProps> = ({ orders }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE');
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  // Strict deduplication by unique Order ID
  const uniqueOrders = React.useMemo(() => {
    const seen = new Set<string>();
    const list: Order[] = [];
    for (const ord of orders) {
      if (!ord || !ord.id) continue;
      if (!seen.has(ord.id)) {
        seen.add(ord.id);
        list.push(ord);
      } else {
        console.warn(`[KOT Display] Deduplicated repeated order instance: ${ord.id} (Token #${ord.tokenNo})`);
      }
    }
    return list;
  }, [orders]);

  const activeOrders = React.useMemo(() => {
    return uniqueOrders.filter(
      (o) => o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY'
    );
  }, [uniqueOrders]);

  useEffect(() => {
    const pendingCount = activeOrders.filter((o) => o.status === 'PENDING').length;
    if (pendingCount > 0 && typeof window !== 'undefined') {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {
        // silent fallback
      }
    }
  }, [activeOrders.length]);

  const filteredOrders = React.useMemo(() => {
    if (filterStatus === 'ACTIVE') {
      // Completed, Cancelled, and Refunded MUST NEVER appear in ACTIVE queue
      return activeOrders;
    }
    if (filterStatus === 'CANCELLED') {
      return uniqueOrders.filter((o) => o.status === 'CANCELLED' || o.status === 'REFUNDED');
    }
    return uniqueOrders.filter((o) => o.status === filterStatus);
  }, [filterStatus, activeOrders, uniqueOrders]);

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return {
          border: 'border-[#8c3a27] ring-2 ring-[#8c3a27]/20 bg-[#f4efe8]',
          badge: 'bg-[#8c3a27] text-[#f4efe8]',
          title: 'NEW ORDER',
        };
      case 'PREPARING':
        return {
          border: 'border-[#2e211d] ring-2 ring-[#2e211d]/20 bg-[#e2d7c9]/40',
          badge: 'bg-[#2e211d] text-[#f4efe8]',
          title: 'PREPARING',
        };
      case 'READY':
        return {
          border: 'border-[#8c3a27] bg-[#f4efe8]',
          badge: 'bg-[#8c3a27] text-[#f4efe8]',
          title: 'READY FOR SERVING',
        };
      case 'COMPLETED':
        return {
          border: 'border-[#a19284]/40 bg-[#e2d7c9]/30 opacity-80',
          badge: 'bg-[#a19284] text-[#f4efe8]',
          title: 'COMPLETED',
        };
      case 'CANCELLED':
      case 'REFUNDED':
        return {
          border: 'border-red-300 bg-red-50/70',
          badge: 'bg-red-700 text-white',
          title: 'CANCELLED',
        };
      default:
        return {
          border: 'border-[#a19284]/30 bg-white',
          badge: 'bg-[#2e211d] text-[#f4efe8]',
          title: status,
        };
    }
  };

  const handleStatusChange = (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus = 'PREPARING';
    if (currentStatus === 'PENDING') nextStatus = 'PREPARING';
    else if (currentStatus === 'PREPARING') nextStatus = 'READY';
    else if (currentStatus === 'READY') nextStatus = 'COMPLETED';

    livePuffStore.updateOrderStatus(orderId, nextStatus);
  };

  const getTimeAgoMinutes = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto min-h-[calc(100vh-80px)]">
      {/* Top Banner & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-[#2e211d] text-[#f4efe8] p-5 rounded-2xl border border-[#a19284]/30 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#8c3a27] flex items-center justify-center text-[#f4efe8] font-bold shadow-md">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-['Playfair_Display'] font-black tracking-tight text-[#f4efe8]">
                THE PUFF CO. — Kitchen KOT
              </h2>
              <span className="bg-[#8c3a27] text-[#f4efe8] text-xs font-bold px-2.5 py-0.5 rounded-md border border-[#f4efe8]/20">
                {activeOrders.length} ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#e2d7c9] mt-0.5">
              Live Kitchen Display System • Real-time synchronization with counter & mobile POS
            </p>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'ACTIVE', label: 'ACTIVE', count: activeOrders.length },
            { id: 'PENDING', label: 'PENDING', count: uniqueOrders.filter((o) => o.status === 'PENDING').length },
            { id: 'PREPARING', label: 'PREPARING', count: uniqueOrders.filter((o) => o.status === 'PREPARING').length },
            { id: 'READY', label: 'READY', count: uniqueOrders.filter((o) => o.status === 'READY').length },
            { id: 'COMPLETED', label: 'COMPLETED', count: uniqueOrders.filter((o) => o.status === 'COMPLETED').length },
            { id: 'CANCELLED', label: 'CANCELLED', count: uniqueOrders.filter((o) => o.status === 'CANCELLED' || o.status === 'REFUNDED').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? 'bg-[#8c3a27] text-[#f4efe8] shadow-md font-extrabold'
                  : 'bg-[#231916] text-[#e2d7c9] hover:text-[#f4efe8] hover:bg-[#2e211d]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filterStatus === tab.id ? 'bg-white/20 text-white' : 'bg-black/30 text-[#e2d7c9]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-16 bg-[#e2d7c9]/30 rounded-3xl border border-dashed border-[#a19284]/40 my-6 p-6">
          <div className="w-16 h-16 bg-[#8c3a27]/10 text-[#8c3a27] rounded-full flex items-center justify-center mx-auto mb-3">
            <Utensils className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-['Playfair_Display'] font-bold text-[#2e211d]">
            {filterStatus === 'CANCELLED' ? 'No Cancelled Orders' : 'No Orders in Kitchen Queue'}
          </h3>
          <p className="text-xs text-[#a19284] mt-1 max-w-sm mx-auto">
            {filterStatus === 'CANCELLED' 
              ? 'Cancelled orders will appear here for audit logging and kitchen tracking.'
              : 'When staff place orders on mobile or laptop counter POS, live KOT tickets will automatically appear here.'}
          </p>
        </div>
      )}

      {/* KOT Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map((order) => {
          const style = getStatusStyle(order.status);
          const timeAgo = getTimeAgoMinutes(order.createdAt);
          const isDelayed = Date.now() - new Date(order.createdAt).getTime() > 10 * 60000 && order.status !== 'COMPLETED' && order.status !== 'CANCELLED';
          const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';

          return (
            <div
              key={order.id}
              className={`rounded-3xl p-5 border transition-all shadow-md flex flex-col justify-between relative overflow-hidden bg-white ${style.border}`}
            >
              {/* Delayed warning flag */}
              {isDelayed && (
                <div className="bg-[#8c3a27] text-[#f4efe8] text-[10px] font-bold tracking-wider uppercase px-3 py-1 text-center -mx-5 -mt-5 mb-3 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>KITCHEN DELAY WARNING (&gt; 10 MINS)</span>
                </div>
              )}

              {/* Cancelled Banner */}
              {isCancelled && (
                <div className="bg-red-700 text-white text-[10px] font-bold tracking-wider uppercase px-3 py-1 text-center -mx-5 -mt-5 mb-3 flex items-center justify-center gap-1">
                  <Ban className="w-3.5 h-3.5" />
                  <span>CANCELLED ORDER • VOIDED BILL</span>
                </div>
              )}

              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-[#a19284]/30 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#a19284] uppercase tracking-widest block font-['Cinzel']">
                      TOKEN NO.
                    </span>
                    <span className={`text-3xl font-['Playfair_Display'] font-black tracking-tight ${isCancelled ? 'text-red-700 line-through' : 'text-[#2e211d]'}`}>
                      #{order.tokenNo}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide mb-1 ${style.badge}`}>
                      {order.status}
                    </span>
                    <div className="flex items-center justify-end gap-1 text-[11px] font-medium text-[#a19284]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{timeAgo}</span>
                    </div>
                  </div>
                </div>

                {/* Table & Staff Info & Print KOT */}
                <div className="flex items-center justify-between text-xs bg-[#f4efe8] p-2 rounded-xl border border-[#a19284]/30 mb-3 font-semibold text-[#2e211d]">
                  <div className="flex items-center gap-2">
                    <span>Type: <strong className="text-[#8c3a27]">{order.orderType}</strong></span>
                    <span>•</span>
                    <span>Ref: <strong className="text-[#2e211d]">{order.tableOrName}</strong></span>
                  </div>
                  <button
                    onClick={() => setPrintingOrder(order)}
                    className="px-2.5 py-1 bg-[#e2d7c9] hover:bg-[#8c3a27] hover:text-[#f4efe8] text-[#2e211d] text-[11px] font-bold rounded-lg border border-[#a19284]/40 flex items-center gap-1 transition-all shadow-xs active:scale-95 shrink-0"
                    title="Print Kitchen Order Ticket"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#8c3a27] group-hover:text-white" />
                    <span>Print KOT</span>
                  </button>
                </div>

                {/* Cancelled Audit Info Box */}
                {isCancelled && (
                  <div className="bg-red-100/80 border border-red-200 p-2.5 rounded-xl mb-3 text-red-900 text-xs space-y-1">
                    <div className="flex items-center gap-1 font-bold">
                      <Ban className="w-3.5 h-3.5 text-red-700" />
                      <span>Reason: {order.cancellationReason || 'Cancelled by staff'}</span>
                    </div>
                    <div className="text-[10px] text-red-700 flex items-center justify-between">
                      <span>By: {order.cancelledBy || 'Cashier'}</span>
                      <span>Stock Restored ✓</span>
                    </div>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-2 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="bg-[#f4efe8]/50 p-2.5 rounded-xl border border-[#a19284]/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`font-extrabold flex items-center gap-1.5 ${isCancelled ? 'text-gray-500 line-through' : 'text-[#2e211d]'}`}>
                          <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${isCancelled ? 'bg-gray-400 text-white' : 'bg-[#8c3a27] text-[#f4efe8]'}`}>
                            {item.quantity}x
                          </span>
                          {item.itemName}
                        </span>
                        <span className="text-xs font-bold text-[#a19284]">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>

                      {/* Custom Item Kitchen Notes */}
                      {item.notes && (
                        <div className="mt-1 bg-[#e2d7c9] text-[#2e211d] text-xs px-2 py-1 rounded-lg font-semibold flex items-center gap-1 border border-[#a19284]/30">
                          <Flame className="w-3.5 h-3.5 text-[#8c3a27] shrink-0" />
                          <span>Note: {item.notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Special Kitchen Request */}
                {order.customerNotes && (
                  <div className="mb-4 bg-[#e2d7c9]/60 text-[#2e211d] p-2.5 rounded-xl border border-[#a19284]/30 text-xs">
                    <strong className="font-bold block text-[#8c3a27] text-[11px] uppercase tracking-wide">Special Request:</strong>
                    <p className="mt-0.5">{order.customerNotes}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons for Kitchen Staff */}
              <div className="pt-2 space-y-2">
                {order.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(order.id, 'PENDING')}
                      className="flex-1 py-3 bg-[#2e211d] hover:bg-[#1b1311] text-[#f4efe8] font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all"
                    >
                      <Play className="w-4 h-4 fill-[#f4efe8]" />
                      <span>START PREPARING</span>
                    </button>
                    <button
                      onClick={() => setCancellingOrder(order)}
                      title="Cancel Order"
                      className="p-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-2xl transition-all flex items-center justify-center"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {order.status === 'PREPARING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(order.id, 'PREPARING')}
                      className="flex-1 py-3 bg-[#8c3a27] hover:bg-[#732f1f] text-[#f4efe8] font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all"
                    >
                      <BellRing className="w-4 h-4" />
                      <span>MARK READY</span>
                    </button>
                    <button
                      onClick={() => setCancellingOrder(order)}
                      title="Cancel Order"
                      className="p-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-2xl transition-all flex items-center justify-center"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {order.status === 'READY' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(order.id, 'READY')}
                      className="flex-1 py-3 bg-[#2e211d] hover:bg-[#1b1311] text-[#f4efe8] font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#e2d7c9]" />
                      <span>COMPLETE & CLEAR</span>
                    </button>
                    <button
                      onClick={() => setCancellingOrder(order)}
                      title="Cancel Order"
                      className="p-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-2xl transition-all flex items-center justify-center"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {order.status === 'COMPLETED' && (
                  <div className="flex items-center justify-between bg-[#e2d7c9]/30 rounded-xl p-2">
                    <span className="text-xs font-bold text-[#a19284]">
                      ✓ Completed & Served
                    </span>
                    <button
                      onClick={() => setCancellingOrder(order)}
                      className="text-[10px] text-red-700 hover:text-red-900 font-bold flex items-center gap-1 hover:underline"
                    >
                      <Ban className="w-3 h-3" />
                      <span>Void / Cancel</span>
                    </button>
                  </div>
                )}

                {isCancelled && (
                  <div className="text-center py-2 text-xs font-bold text-red-700 bg-red-100/50 rounded-xl border border-red-200">
                    ✕ Order Cancelled • Not in Finance Totals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancel Order Confirmation Modal */}
      {cancellingOrder && (
        <CancelOrderModal
          order={cancellingOrder}
          isOpen={Boolean(cancellingOrder)}
          onClose={() => setCancellingOrder(null)}
          onSuccess={() => setCancellingOrder(null)}
          staffName="Kitchen Staff"
        />
      )}

      {/* Print KOT Modal */}
      {printingOrder && (
        <PrintKOTModal
          order={printingOrder}
          isOpen={Boolean(printingOrder)}
          onClose={() => setPrintingOrder(null)}
        />
      )}
    </div>
  );
};


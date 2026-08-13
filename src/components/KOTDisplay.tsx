import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Play, 
  Utensils, 
  Flame, 
  AlertCircle,
  BellRing
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { livePuffStore } from '../services/store';

interface KOTDisplayProps {
  orders: Order[];
}

export const KOTDisplay: React.FC<KOTDisplayProps> = ({ orders }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE');

  useEffect(() => {
    const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
    if (pendingCount > 0 && typeof window !== 'undefined') {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {
        // silent fallback
      }
    }
  }, [orders.length]);

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === 'ACTIVE') {
      return order.status === 'PENDING' || order.status === 'PREPARING' || order.status === 'READY';
    }
    return order.status === filterStatus;
  });

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
                {orders.filter((o) => o.status !== 'COMPLETED').length} ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#e2d7c9] mt-0.5">
              Live Kitchen Display System • Real-time synchronization with counter & mobile POS
            </p>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {['ACTIVE', 'PENDING', 'PREPARING', 'READY', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterStatus === st
                  ? 'bg-[#8c3a27] text-[#f4efe8] shadow-md font-extrabold'
                  : 'bg-[#231916] text-[#e2d7c9] hover:text-[#f4efe8] hover:bg-[#2e211d]'
              }`}
            >
              {st}
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
          <h3 className="text-lg font-['Playfair_Display'] font-bold text-[#2e211d]">No Orders in Kitchen Queue</h3>
          <p className="text-xs text-[#a19284] mt-1 max-w-sm mx-auto">
            When staff place orders on mobile or laptop counter POS, live KOT tickets will automatically appear here.
          </p>
        </div>
      )}

      {/* KOT Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map((order) => {
          const style = getStatusStyle(order.status);
          const timeAgo = getTimeAgoMinutes(order.createdAt);
          const isDelayed = Date.now() - new Date(order.createdAt).getTime() > 10 * 60000 && order.status !== 'COMPLETED';

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

              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-[#a19284]/30 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#a19284] uppercase tracking-widest block font-['Cinzel']">
                      TOKEN NO.
                    </span>
                    <span className="text-3xl font-['Playfair_Display'] font-black text-[#2e211d] tracking-tight">
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

                {/* Table & Staff Info */}
                <div className="flex items-center justify-between text-xs bg-[#f4efe8] p-2 rounded-xl border border-[#a19284]/30 mb-3 font-semibold text-[#2e211d]">
                  <span>Type: <strong className="text-[#8c3a27]">{order.orderType}</strong></span>
                  <span>Ref: <strong className="text-[#2e211d]">{order.tableOrName}</strong></span>
                </div>

                {/* Items List */}
                <div className="space-y-2 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="bg-[#f4efe8]/50 p-2.5 rounded-xl border border-[#a19284]/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-extrabold text-[#2e211d] flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-lg bg-[#8c3a27] text-[#f4efe8] text-xs font-bold flex items-center justify-center shrink-0">
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
              <div className="pt-2">
                {order.status === 'PENDING' && (
                  <button
                    onClick={() => handleStatusChange(order.id, 'PENDING')}
                    className="w-full py-3 bg-[#2e211d] hover:bg-[#1b1311] text-[#f4efe8] font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <Play className="w-4 h-4 fill-[#f4efe8]" />
                    <span>START PREPARING ORDER</span>
                  </button>
                )}

                {order.status === 'PREPARING' && (
                  <button
                    onClick={() => handleStatusChange(order.id, 'PREPARING')}
                    className="w-full py-3 bg-[#8c3a27] hover:bg-[#732f1f] text-[#f4efe8] font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <BellRing className="w-4 h-4" />
                    <span>MARK READY FOR SERVING</span>
                  </button>
                )}

                {order.status === 'READY' && (
                  <button
                    onClick={() => handleStatusChange(order.id, 'READY')}
                    className="w-full py-3 bg-[#2e211d] hover:bg-[#1b1311] text-[#f4efe8] font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#e2d7c9]" />
                    <span>COMPLETE & CLEAR TICKET</span>
                  </button>
                )}

                {order.status === 'COMPLETED' && (
                  <div className="text-center py-1.5 text-xs font-bold text-[#a19284] bg-[#e2d7c9]/30 rounded-xl">
                    ✓ Completed & Served
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

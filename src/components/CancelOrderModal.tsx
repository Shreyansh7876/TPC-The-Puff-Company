import React, { useState } from 'react';
import { 
  AlertTriangle, 
  X, 
  RotateCcw, 
  FileText, 
  CheckCircle2, 
  UserCheck, 
  Ban,
  PackageCheck
} from 'lucide-react';
import { Order } from '../types';
import { livePuffStore } from '../services/store';

interface CancelOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  staffName?: string;
}

const CANCELLATION_REASONS = [
  'Customer changed mind / Left counter',
  'Incorrect item / Wrong bill punched',
  'Customer requested modification / Re-punch',
  'Kitchen out of ingredients / Stock unavailable',
  'Payment declined / Split payment failed',
  'Duplicate punch / Testing order',
  'Other / Custom reason'
];

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
  staffName = 'Counter Cashier'
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [staff, setStaff] = useState<string>(staffName);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  const totalAmount = order.roundedTotal || order.total;

  const handleConfirmCancellation = async () => {
    setIsSubmitting(true);
    const finalReason = selectedReason === 'Other / Custom reason'
      ? (customReason.trim() || 'Other reason')
      : (customReason.trim() ? `${selectedReason} - ${customReason.trim()}` : selectedReason);

    livePuffStore.cancelOrder(order.id, finalReason, staff.trim() || 'Cashier');
    
    setIsSubmitting(false);
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2e211d]/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#f4efe8] max-w-lg w-full rounded-3xl shadow-2xl border border-[#a19284]/40 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#8c3a27] text-[#f4efe8] p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center font-bold">
              <Ban className="w-5 h-5 text-[#f4efe8]" />
            </div>
            <div>
              <h3 className="font-['Playfair_Display'] font-black text-base tracking-wide">
                Cancel Order #{order.tokenNo}
              </h3>
              <p className="text-[11px] text-[#e2d7c9] font-medium">
                Invoice: {order.invoiceNo || order.id.slice(-6)} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-black/10 hover:bg-black/20 text-[#f4efe8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-[#2e211d]">
          
          {/* Order Summary Capsule */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#a19284]/30 space-y-2">
            <div className="flex items-center justify-between font-bold">
              <span className="text-[#a19284] uppercase tracking-wider text-[10px]">Order Value:</span>
              <span className="text-base font-black text-[#8c3a27]">₹{totalAmount.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#a19284] border-t border-[#a19284]/20 pt-1.5">
              <span>Type: <strong>{order.orderType}</strong></span>
              <span>Mode: <strong>{order.paymentMode}</strong></span>
              <span>Current Status: <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">{order.status}</span></span>
            </div>

            <div className="bg-[#f4efe8]/70 p-2 rounded-xl text-[11px] font-medium border border-[#a19284]/20 space-y-1">
              <div className="text-[10px] font-bold text-[#a19284] uppercase">Items in this bill:</div>
              <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span>{it.quantity}x {it.itemName}</span>
                    <span className="font-bold text-[#2e211d]">₹{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Notice Box */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 space-y-1.5 text-red-900">
            <div className="flex items-center gap-2 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
              <span>Financial & Inventory Impact:</span>
            </div>
            <ul className="list-disc pl-5 text-[11px] space-y-1 text-red-800">
              <li>
                <strong>Excluded from Revenue:</strong> ₹{totalAmount.toFixed(2)} will be removed from today's net sales, cash drawer totals, and tax summaries.
              </li>
              <li>
                <strong>Stock Auto-Restoration:</strong> Recipe ingredients for all items will be automatically restocked into inventory.
              </li>
              <li>
                <strong>Audit Logging:</strong> Logged under <em>"Cancelled Orders"</em> report with reason, staff ID, and timestamp for audit inspection.
              </li>
            </ul>
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#2e211d]">
              Reason for Cancellation <span className="text-[#8c3a27]">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full bg-white border border-[#a19284]/40 rounded-xl px-3 py-2 text-xs font-semibold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
            >
              {CANCELLATION_REASONS.map((r, i) => (
                <option key={i} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Custom Note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#2e211d]">
              Additional Remarks / Notes <span className="text-[#a19284] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="e.g. Customer changed mind after bill was printed"
              className="w-full bg-white border border-[#a19284]/40 rounded-xl px-3 py-2 text-xs text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
            />
          </div>

          {/* Staff Authorizing */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#2e211d]">
              Authorized Cashier / Staff Name
            </label>
            <input
              type="text"
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
              placeholder="Cashier name"
              className="w-full bg-white border border-[#a19284]/40 rounded-xl px-3 py-2 text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-white p-4 border-t border-[#a19284]/30 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 bg-[#e2d7c9] hover:bg-[#d8ccbe] text-[#2e211d] font-bold text-xs rounded-xl transition-colors"
          >
            Keep Order Active
          </button>
          <button
            type="button"
            onClick={handleConfirmCancellation}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Ban className="w-4 h-4" />
            <span>{isSubmitting ? 'Cancelling...' : 'Confirm Cancellation & Void Bill'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

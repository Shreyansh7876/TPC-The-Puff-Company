import React from 'react';
import { Order } from '../types';
import { Printer, X, QrCode } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { settingsStore } from '../services/settingsStore';

interface PrintReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const settings = settingsStore.getSettings();
  const store = settings.storeProfile;
  const billing = settings.billing;

  const handlePrint = () => {
    window.print();
  };

  const roundedAmount = order.roundedTotal ?? order.total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2e211d]/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#f4efe8] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#a19284]/40 text-[#2e211d] relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#a19284] hover:text-[#2e211d] bg-[#e2d7c9] p-2 rounded-full transition-colors print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Printable Thermal Receipt Card */}
        <div id="thermal-receipt" className="p-4 bg-white border border-[#a19284]/30 rounded-2xl font-mono text-xs shadow-inner">
          {/* Header with Brand Identity */}
          <div className="text-center pb-3 border-b border-dashed border-[#a19284]/50 flex flex-col items-center">
            {billing.printLogoOnReceipt && store.storeLogoUrl ? (
              <div className="mb-2 flex justify-center">
                <img 
                  src={store.storeLogoUrl} 
                  alt={store.storeName} 
                  className="max-h-14 max-w-[150px] object-contain" 
                />
              </div>
            ) : null}
            <h2 className="text-sm font-black text-[#2e211d] font-['Playfair_Display'] uppercase">{store.storeName}</h2>
            <p className="text-[10px] text-[#8c3a27] font-['Cinzel'] tracking-wider uppercase font-bold mt-0.5">
              {store.storeTagline}
            </p>
            <p className="text-[10px] text-[#a19284] mt-0.5 text-center leading-tight max-w-[240px]">
              {store.address}
            </p>
            <p className="text-[10px] text-[#a19284]">Ph: {store.contactNumber}</p>
            {store.gstNumber && <p className="text-[9px] text-[#2e211d] font-bold">GSTIN: {store.gstNumber}</p>}
            {store.fssaiNumber && <p className="text-[9px] text-[#a19284]">FSSAI Lic #: {store.fssaiNumber}</p>}
          </div>

          {/* Ticket & Invoice Metadata */}
          <div className="py-2.5 border-b border-dashed border-[#a19284]/50 space-y-1 text-[#2e211d]">
            <div className="flex justify-between font-bold text-[#8c3a27] text-sm">
              <span>TOKEN #{order.tokenNo}</span>
              <span className="uppercase text-[#2e211d]">{order.orderType}</span>
            </div>
            {order.invoiceNo && (
              <div className="flex justify-between text-[11px] font-bold text-[#2e211d]">
                <span>Invoice No:</span>
                <span>{order.invoiceNo}</span>
              </div>
            )}
            <div className="flex justify-between text-[11px]">
              <span className="text-[#a19284]">Table / Ref:</span>
              <span className="font-bold text-[#2e211d]">{order.tableOrName}</span>
            </div>
            <div className="flex justify-between text-[10px] text-[#a19284]">
              <span>Date: {new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
              <span>Time: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between text-[10px] text-[#a19284]">
              <span>Staff: {order.staffName || 'Counter'}</span>
              <span>Pay: <strong className="text-[#2e211d]">{order.paymentMode}</strong></span>
            </div>
          </div>

          {/* Item List */}
          <div className="py-3 border-b border-dashed border-[#a19284]/50 space-y-1.5">
            <div className="flex justify-between font-bold text-[10px] text-[#a19284] uppercase tracking-wider pb-1">
              <span>ITEM</span>
              <span>QTY x PRICE</span>
              <span>AMT</span>
            </div>
            {order.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-semibold text-[#2e211d]">
                  <span className="truncate pr-2">{item.itemName}</span>
                  <span className="text-[#a19284] whitespace-nowrap">{item.quantity} x {store.currencySymbol}{item.price}</span>
                  <span className="font-bold text-[#2e211d] pl-2">{store.currencySymbol}{item.quantity * item.price}</span>
                </div>
                {item.notes && (
                  <p className="text-[10px] text-[#8c3a27] bg-[#e2d7c9]/50 px-1.5 py-0.5 rounded italic">
                    Note: {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Totals & Tax Split */}
          <div className="py-2.5 border-b border-dashed border-[#a19284]/50 space-y-1">
            <div className="flex justify-between text-[#a19284]">
              <span>Subtotal:</span>
              <span>{store.currencySymbol}{order.subtotal.toFixed(2)}</span>
            </div>

            {order.gstEnabled && billing.enableSplitTax ? (
              <>
                <div className="flex justify-between text-[#a19284] text-[10px]">
                  <span>CGST ({(billing.gstRatePercent / 2).toFixed(1)}%):</span>
                  <span>{store.currencySymbol}{(order.cgstAmount || order.gstAmount / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#a19284] text-[10px]">
                  <span>SGST ({(billing.gstRatePercent / 2).toFixed(1)}%):</span>
                  <span>{store.currencySymbol}{(order.sgstAmount || order.gstAmount / 2).toFixed(2)}</span>
                </div>
              </>
            ) : order.gstEnabled ? (
              <div className="flex justify-between text-[#a19284]">
                <span>GST ({billing.gstRatePercent}%):</span>
                <span>{store.currencySymbol}{order.gstAmount.toFixed(2)}</span>
              </div>
            ) : (
              <p className="text-[9px] text-[#a19284] italic text-right">
                (Prices Incl. of all Taxes)
              </p>
            )}

            {order.discount > 0 && (
              <div className="flex justify-between text-[#8c3a27] font-semibold">
                <span>Discount:</span>
                <span>-{store.currencySymbol}{order.discount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between font-black text-sm text-[#2e211d] pt-1 border-t border-[#a19284]/30">
              <span>GRAND TOTAL:</span>
              <span className="text-[#8c3a27]">{store.currencySymbol}{roundedAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* QR Code Placeholder if enabled */}
          {billing.printUpiQrOnReceipt && (
            <div className="my-2.5 p-2 bg-[#f4efe8] rounded-xl border border-[#a19284]/30 flex items-center justify-between">
              <div className="text-[10px] text-[#2e211d]">
                <span className="font-bold block text-[#8c3a27]">Scan to Pay via UPI</span>
                <span className="text-[9px] text-[#a19284]">{settings.payments.upiId}</span>
              </div>
              <div className="w-8 h-8 bg-white border border-[#a19284]/40 rounded flex items-center justify-center">
                <QrCode className="w-6 h-6 text-[#8c3a27]" />
              </div>
            </div>
          )}

          {/* Customer Notes */}
          {order.customerNotes && (
            <div className="py-2 text-[10px] text-[#2e211d] bg-[#e2d7c9]/40 p-2 rounded-lg border border-[#a19284]/30 mt-2">
              <strong className="text-[#8c3a27]">Customer Note:</strong> {order.customerNotes}
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-3 text-[10px] text-[#a19284] font-sans space-y-0.5 leading-tight">
            <p className="font-bold text-[#2e211d]">{billing.receiptFooterText}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-5 space-y-2 print:hidden">
          <button
            onClick={handlePrint}
            className="w-full py-3 bg-[#8c3a27] hover:bg-[#732f1f] active:scale-98 text-[#f4efe8] font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            <Printer className="w-5 h-5" />
            <span>Print Thermal Invoice</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-[#a19284] hover:text-[#2e211d] text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

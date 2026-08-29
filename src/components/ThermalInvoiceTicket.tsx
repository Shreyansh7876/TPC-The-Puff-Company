import React from 'react';
import { Order, ThermalPaperWidth } from '../types';
import { settingsStore } from '../services/settingsStore';

interface ThermalInvoiceTicketProps {
  order: Order;
  paperWidth?: ThermalPaperWidth;
}

export const ThermalInvoiceTicket: React.FC<ThermalInvoiceTicketProps> = ({
  order,
  paperWidth,
}) => {
  const settings = settingsStore.getSettings();
  const activePaperWidth = paperWidth || settings.printing?.paperWidth || '58mm';
  const is58mm = activePaperWidth === '58mm';
  const store = settings.storeProfile;
  const billing = settings.billing;
  const printing = settings.printing || {
    paperWidth: '58mm',
    autoPrintInvoice: false,
    autoPrintKOT: false,
    printCustomerDetails: true,
    printCustomerNotes: true,
    printKitchenNotesOnKOT: true,
    fontSize: 'STANDARD',
    feedLines: 2,
    enableBeepOnPrint: true,
  };

  const roundedAmount = order.roundedTotal ?? order.total;
  const currency = store.currencySymbol || 'Rs.';

  // Format date and time
  const orderDate = new Date(order.createdAt);
  const dateStr = orderDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = orderDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const shouldPrintLogo = Boolean(billing.printLogoOnReceipt && store.storeLogoUrl?.trim());
  const hasCustomerInfo = Boolean(
    printing.printCustomerDetails && (order.customerName?.trim() || order.customerMobile?.trim())
  );

  return (
    <div
      className={`thermal-ticket bg-white text-black font-mono leading-tight mx-auto ${
        is58mm ? 'w-[48mm] max-w-[48mm] text-[11px]' : 'w-[72mm] max-w-[72mm] text-xs'
      }`}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        backgroundColor: '#ffffff',
        color: '#000000',
        lineHeight: 1.25,
      }}
    >
      {/* Store Header */}
      <div className="text-center pb-1 border-b border-dashed border-black">
        {shouldPrintLogo && (
          <div className="mb-1 flex justify-center">
            <img
              src={store.storeLogoUrl}
              alt={store.storeName}
              className="max-h-10 max-w-[110px] object-contain filter grayscale contrast-200"
            />
          </div>
        )}
        <h1 className="font-black text-sm uppercase tracking-tight leading-snug">
          {store.storeName || 'THE PUFF COMPANY'}
        </h1>
        {store.address && (
          <p className="text-[9px] leading-tight text-center mt-0.5">{store.address}</p>
        )}
        {store.contactNumber && (
          <p className="text-[9px] font-bold">Ph: {store.contactNumber}</p>
        )}
        {store.gstNumber && (
          <p className="text-[9px] font-black">GSTIN: {store.gstNumber}</p>
        )}
        {store.fssaiNumber && (
          <p className="text-[9px]">FSSAI: {store.fssaiNumber}</p>
        )}
      </div>

      {/* Bill & Token Information */}
      <div className="py-1 border-b border-dashed border-black text-[10px] space-y-0.5">
        <div className="flex justify-between font-black text-xs">
          <span>TOKEN #{order.tokenNo}</span>
          <span className="uppercase">[{order.orderType || 'DINE IN'}]</span>
        </div>
        {order.invoiceNo && (
          <div className="flex justify-between font-bold">
            <span>INV NO:</span>
            <span>{order.invoiceNo}</span>
          </div>
        )}
        {order.tableOrName && (
          <div className="flex justify-between">
            <span>REF/TABLE:</span>
            <span className="font-bold uppercase">{order.tableOrName}</span>
          </div>
        )}
        <div className="flex justify-between text-[9px]">
          <span>DATE: {dateStr}</span>
          <span>TIME: {timeStr}</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span>CASHIER: {order.staffName || 'Counter'}</span>
          <span>PAY: <strong className="uppercase">{order.paymentMode}</strong></span>
        </div>

        {/* Customer Details */}
        {hasCustomerInfo && (
          <div className="pt-0.5 border-t border-dotted border-black/60 text-[9px] space-y-0.5">
            {order.customerName && (
              <div className="flex justify-between">
                <span>CUST:</span>
                <span className="font-bold uppercase truncate max-w-[28mm]">{order.customerName}</span>
              </div>
            )}
            {order.customerMobile && (
              <div className="flex justify-between">
                <span>MOB:</span>
                <span className="font-bold">{order.customerMobile}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Item Table Header */}
      <div className="py-1 border-b border-black font-black text-[10px] flex justify-between uppercase">
        <span>ITEM (QTY x RATE)</span>
        <span>AMT</span>
      </div>

      {/* Item Rows */}
      <div className="py-1 border-b border-dashed border-black space-y-1 text-[11px]">
        {order.items.map((item, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="flex justify-between font-bold leading-tight">
              <span className="truncate pr-1">{item.itemName}</span>
              <span className="shrink-0 font-black">
                {currency}{(item.quantity * item.price).toFixed(2)}
              </span>
            </div>
            <div className="text-[9px] pl-2 text-black/80 flex justify-between">
              <span>{item.quantity} x {currency}{item.price.toFixed(2)}</span>
            </div>
            {item.notes && (
              <div className="text-[9px] italic pl-2 text-black/90">
                * Note: {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Financials & Totals */}
      <div className="py-1 border-b border-dashed border-black space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-bold">{currency}{order.subtotal.toFixed(2)}</span>
        </div>

        {order.gstEnabled && billing.enableSplitTax ? (
          <>
            <div className="flex justify-between text-[9px]">
              <span>CGST ({(billing.gstRatePercent / 2).toFixed(1)}%):</span>
              <span>{currency}{(order.cgstAmount || order.gstAmount / 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span>SGST ({(billing.gstRatePercent / 2).toFixed(1)}%):</span>
              <span>{currency}{(order.sgstAmount || order.gstAmount / 2).toFixed(2)}</span>
            </div>
          </>
        ) : order.gstEnabled ? (
          <div className="flex justify-between text-[9px]">
            <span>GST ({billing.gstRatePercent}%):</span>
            <span>{currency}{order.gstAmount.toFixed(2)}</span>
          </div>
        ) : (
          <div className="text-[9px] text-right italic">(Taxes Included)</div>
        )}

        {order.discount > 0 && (
          <div className="flex justify-between font-bold">
            <span>Discount:</span>
            <span>-{currency}{order.discount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between font-black text-xs pt-1 border-t-2 border-black">
          <span>GRAND TOTAL:</span>
          <span>{currency}{roundedAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="py-0.5 border-b border-dashed border-black text-[9px]">
        <div className="flex justify-between font-bold">
          <span>PAYMENT METHOD:</span>
          <span className="uppercase">{order.paymentMode}</span>
        </div>
        {order.paymentMode === 'SPLIT' && order.splitDetails && (
          <div className="pt-0.5 pl-2 space-y-0.5 text-[8.5px]">
            {order.splitDetails.cash > 0 && (
              <div className="flex justify-between">
                <span>Cash:</span>
                <span>{currency}{order.splitDetails.cash}</span>
              </div>
            )}
            {order.splitDetails.upi > 0 && (
              <div className="flex justify-between">
                <span>UPI:</span>
                <span>{currency}{order.splitDetails.upi}</span>
              </div>
            )}
            {order.splitDetails.card > 0 && (
              <div className="flex justify-between">
                <span>Card:</span>
                <span>{currency}{order.splitDetails.card}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Notes */}
      {printing.printCustomerNotes && order.customerNotes && (
        <div className="py-0.5 border-b border-dashed border-black text-[9px]">
          <span className="font-bold">Note: </span>
          <span>{order.customerNotes}</span>
        </div>
      )}

      {/* Footer Note */}
      <div className="pt-1.5 text-center text-[9px] space-y-0.5 leading-tight">
        {billing.receiptFooterText && (
          <p className="font-bold">{billing.receiptFooterText}</p>
        )}
        <p className="font-bold uppercase tracking-wider">*** THANK YOU! VISIT AGAIN ***</p>
      </div>

      {/* Minimal Thermal Feed Spacing */}
      <div className="h-4" />
    </div>
  );
};

import React from 'react';
import { Order, AppMasterSettings, ThermalPaperWidth } from '../types';
import { settingsStore } from '../services/settingsStore';
import { QrCode } from 'lucide-react';

interface ThermalInvoiceTicketProps {
  order: Order;
  paperWidth?: ThermalPaperWidth;
  isPrintOnly?: boolean;
}

export const ThermalInvoiceTicket: React.FC<ThermalInvoiceTicketProps> = ({
  order,
  paperWidth,
  isPrintOnly = false,
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

  const widthStyle = is58mm ? 'max-w-[48mm] w-[48mm] text-[11px]' : 'max-w-[72mm] w-[72mm] text-xs';
  const roundedAmount = order.roundedTotal ?? order.total;

  return (
    <div
      id="thermal-invoice-ticket"
      className={`bg-white text-black font-mono leading-tight p-2 mx-auto ${widthStyle} ${
        isPrintOnly ? 'print:block' : ''
      }`}
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* Store Header */}
      <div className="text-center pb-2 border-b-2 border-dashed border-black space-y-0.5">
        {billing.printLogoOnReceipt && store.storeLogoUrl && (
          <div className="mb-1 flex justify-center">
            <img
              src={store.storeLogoUrl}
              alt={store.storeName}
              className="max-h-10 max-w-[120px] object-contain filter grayscale contrast-200"
            />
          </div>
        )}
        <h1 className="font-black text-sm uppercase tracking-tight">{store.storeName}</h1>
        {store.storeTagline && (
          <p className="text-[10px] uppercase font-bold tracking-wider">{store.storeTagline}</p>
        )}
        {store.address && (
          <p className="text-[9px] leading-tight text-center">{store.address}</p>
        )}
        {store.contactNumber && (
          <p className="text-[9px] font-bold">Ph: {store.contactNumber}</p>
        )}
        {store.gstNumber && (
          <p className="text-[9px] font-black">GSTIN: {store.gstNumber}</p>
        )}
        {store.fssaiNumber && (
          <p className="text-[9px]">FSSAI Lic: {store.fssaiNumber}</p>
        )}
      </div>

      {/* Bill & Token Metadata */}
      <div className="py-1.5 border-b border-dashed border-black text-[10px] space-y-0.5">
        <div className="flex justify-between font-black text-xs">
          <span>TOKEN #{order.tokenNo}</span>
          <span className="uppercase">[{order.orderType}]</span>
        </div>
        {order.invoiceNo && (
          <div className="flex justify-between font-bold">
            <span>INV NO:</span>
            <span>{order.invoiceNo}</span>
          </div>
        )}
        {order.tableOrName && (
          <div className="flex justify-between">
            <span>TABLE/REF:</span>
            <span className="font-bold uppercase">{order.tableOrName}</span>
          </div>
        )}
        <div className="flex justify-between text-[9px]">
          <span>DATE: {new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
          <span>TIME: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span>CASHIER: {order.staffName || 'Counter'}</span>
          <span>PAY: <strong className="uppercase">{order.paymentMode}</strong></span>
        </div>

        {/* Customer Info (Toggled via settings) */}
        {printing.printCustomerDetails && (order.customerName || order.customerMobile) && (
          <div className="pt-1 border-t border-dotted border-black/40 text-[9px]">
            {order.customerName && (
              <div className="flex justify-between">
                <span>CUST:</span>
                <span className="font-bold uppercase">{order.customerName}</span>
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

      {/* Items List */}
      <div className="py-1.5 border-b border-dashed border-black space-y-1 text-[11px]">
        {order.items.map((item, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="flex justify-between font-bold leading-snug">
              <span className="truncate pr-1">{item.itemName}</span>
              <span className="shrink-0 font-black">
                {store.currencySymbol}{item.quantity * item.price}
              </span>
            </div>
            <div className="text-[9px] text-gray-700 pl-2">
              {item.quantity} x {store.currencySymbol}{item.price}
            </div>
            {item.notes && (
              <div className="text-[9px] italic pl-2">
                * Note: {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bill Totals & Taxes */}
      <div className="py-1.5 border-b border-dashed border-black space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-bold">{store.currencySymbol}{order.subtotal.toFixed(2)}</span>
        </div>

        {order.gstEnabled && billing.enableSplitTax ? (
          <>
            <div className="flex justify-between text-[9px]">
              <span>CGST ({(billing.gstRatePercent / 2).toFixed(1)}%):</span>
              <span>{store.currencySymbol}{(order.cgstAmount || order.gstAmount / 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span>SGST ({(billing.gstRatePercent / 2).toFixed(1)}%):</span>
              <span>{store.currencySymbol}{(order.sgstAmount || order.gstAmount / 2).toFixed(2)}</span>
            </div>
          </>
        ) : order.gstEnabled ? (
          <div className="flex justify-between text-[9px]">
            <span>GST ({billing.gstRatePercent}%):</span>
            <span>{store.currencySymbol}{order.gstAmount.toFixed(2)}</span>
          </div>
        ) : (
          <div className="text-[9px] text-right italic">(Taxes Included)</div>
        )}

        {order.discount > 0 && (
          <div className="flex justify-between text-black font-bold">
            <span>Discount:</span>
            <span>-{store.currencySymbol}{order.discount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between font-black text-xs pt-1 border-t-2 border-black">
          <span>GRAND TOTAL:</span>
          <span>{store.currencySymbol}{roundedAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Breakdown (if Split) */}
      {order.paymentMode === 'SPLIT' && order.splitDetails && (
        <div className="py-1 border-b border-dashed border-black text-[9px] space-y-0.5">
          <span className="font-bold block">SPLIT PAYMENT DETAILS:</span>
          {order.splitDetails.cash > 0 && (
            <div className="flex justify-between">
              <span>Cash:</span>
              <span>{store.currencySymbol}{order.splitDetails.cash}</span>
            </div>
          )}
          {order.splitDetails.upi > 0 && (
            <div className="flex justify-between">
              <span>UPI:</span>
              <span>{store.currencySymbol}{order.splitDetails.upi}</span>
            </div>
          )}
          {order.splitDetails.card > 0 && (
            <div className="flex justify-between">
              <span>Card:</span>
              <span>{store.currencySymbol}{order.splitDetails.card}</span>
            </div>
          )}
        </div>
      )}

      {/* UPI QR Code (if enabled) */}
      {billing.printUpiQrOnReceipt && (
        <div className="my-1.5 p-1 border border-dashed border-black text-center space-y-0.5">
          <span className="text-[9px] font-bold block uppercase">Pay via UPI</span>
          <div className="flex justify-center my-0.5">
            <QrCode className="w-8 h-8 text-black" />
          </div>
          <span className="text-[8px] font-mono block">{settings.payments?.upiId || 'merchant@upi'}</span>
        </div>
      )}

      {/* Customer Notes */}
      {printing.printCustomerNotes && order.customerNotes && (
        <div className="py-1 border-b border-dashed border-black text-[9px]">
          <span className="font-bold">Note: </span>
          <span>{order.customerNotes}</span>
        </div>
      )}

      {/* Receipt Footer */}
      <div className="pt-2 text-center text-[9px] space-y-0.5 leading-tight">
        {billing.receiptFooterText && (
          <p className="font-bold">{billing.receiptFooterText}</p>
        )}
        <p className="font-bold uppercase tracking-wider">*** THANK YOU! VISIT AGAIN ***</p>
      </div>

      {/* Feed Blank Lines */}
      <div className="h-6" />
    </div>
  );
};

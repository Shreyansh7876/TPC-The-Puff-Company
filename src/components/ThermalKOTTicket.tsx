import React from 'react';
import { Order, AppMasterSettings, ThermalPaperWidth } from '../types';
import { settingsStore } from '../services/settingsStore';

interface ThermalKOTTicketProps {
  order: Order;
  paperWidth?: ThermalPaperWidth;
  isPrintOnly?: boolean;
}

export const ThermalKOTTicket: React.FC<ThermalKOTTicketProps> = ({
  order,
  paperWidth,
  isPrintOnly = false,
}) => {
  const settings = settingsStore.getSettings();
  const activePaperWidth = paperWidth || settings.printing?.paperWidth || '58mm';
  const is58mm = activePaperWidth === '58mm';

  const widthStyle = is58mm ? 'max-w-[48mm] w-[48mm] text-[11px]' : 'max-w-[72mm] w-[72mm] text-xs';

  const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
  const timeStr = new Date(order.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="thermal-kot-ticket"
      className={`bg-white text-black font-mono leading-tight p-2 mx-auto ${widthStyle} ${
        isPrintOnly ? 'print:block' : ''
      }`}
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* Simple KOT Header */}
      <div className="text-center pb-1 border-b-2 border-dashed border-black">
        <h1 className="font-black text-sm uppercase tracking-widest">K.O.T</h1>
      </div>

      {/* Token & Order Info */}
      <div className="py-1.5 text-center border-b-2 border-dashed border-black space-y-0.5">
        <div className="text-xl font-black tracking-tight">
          TOKEN #{order.tokenNo}
        </div>
        <div className="font-black text-xs uppercase">
          {order.orderType} {order.tableOrName ? `• ${order.tableOrName}` : ''}
        </div>
      </div>

      {/* Date & Time */}
      <div className="py-1 border-b border-dashed border-black text-[10px] font-bold flex justify-between">
        <span>{dateStr} {timeStr}</span>
        {order.invoiceNo && <span>INV: {order.invoiceNo}</span>}
      </div>

      {/* Item List Header */}
      <div className="py-1 border-b border-black font-black text-[10px] flex justify-between uppercase">
        <span>QTY  ITEM</span>
      </div>

      {/* Clean Items List - STRICTLY NO PRICES / TOTALS / CHECKBOXES */}
      <div className="py-1.5 border-b-2 border-dashed border-black space-y-1">
        {order.items.map((item, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="font-black text-[13px] leading-snug">
              <strong className="text-sm">[{item.quantity}x]</strong> {item.itemName}
            </div>
            {item.notes && settings.printing?.printItemNotesOnKOT !== false && (
              <div className="text-[10px] font-bold pl-3 uppercase">
                &gt;&gt; {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Special Kitchen Notes */}
      {order.customerNotes && settings.printing?.printCustomerNotes !== false && (
        <div className="py-1 border-b border-dashed border-black text-[10px]">
          <span className="font-black uppercase block">NOTE: {order.customerNotes}</span>
        </div>
      )}

      {/* Minimal Tear-Off Space */}
      <div className="h-4" />
    </div>
  );
};

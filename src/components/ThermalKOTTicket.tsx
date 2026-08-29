import React from 'react';
import { Order, ThermalPaperWidth } from '../types';
import { settingsStore } from '../services/settingsStore';

interface ThermalKOTTicketProps {
  order: Order;
  paperWidth?: ThermalPaperWidth;
}

export const ThermalKOTTicket: React.FC<ThermalKOTTicketProps> = ({
  order,
  paperWidth,
}) => {
  const settings = settingsStore.getSettings();
  const activePaperWidth = paperWidth || settings.printing?.paperWidth || '58mm';
  const is58mm = activePaperWidth === '58mm';

  return (
    <div
      className={`thermal-ticket bg-white text-black font-mono leading-tight mx-auto ${
        is58mm ? 'w-[48mm] max-w-[48mm] text-[11px]' : 'w-[72mm] max-w-[72mm] text-xs'
      }`}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        backgroundColor: '#ffffff',
        color: '#000000',
        lineHeight: 1.2,
      }}
    >
      {/* 1. KOT Header */}
      <div className="text-center pb-1 border-b-2 border-black">
        <h1 className="font-black text-sm uppercase tracking-widest leading-none py-0.5">
          THE PUFF CO.
        </h1>
      </div>

      {/* 2. Token & Order Type / Table */}
      <div className="py-1 text-center border-b-2 border-dashed border-black space-y-0.5">
        <div className="text-xl font-black tracking-tight leading-none">
          TOKEN #{order.tokenNo}
        </div>
        <div className="font-black text-xs uppercase tracking-wide">
          [{order.orderType || 'DINE IN'}{order.tableOrName ? ` - ${order.tableOrName}` : ''}]
        </div>
      </div>

      {/* 3. Customer Name (if available) */}
      {order.customerName && (
        <div className="py-0.5 border-b border-dashed border-black text-[10px] font-bold">
          <span>CUST: </span>
          <span className="uppercase">{order.customerName}</span>
        </div>
      )}

      {/* 4. Item List Header */}
      <div className="py-0.5 border-b border-black font-black text-[10px] flex justify-between uppercase">
        <span>QTY  ITEM</span>
      </div>

      {/* 5. Clean Items List - STRICTLY NO PRICES, TOTALS, DATES OR PAYMENT INFO */}
      <div className="py-1 border-b-2 border-black space-y-1">
        {order.items.map((item, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="font-black text-xs leading-snug">
              <span className="text-sm font-black">[{item.quantity}x]</span> {item.itemName}
            </div>
            {item.notes && (
              <div className="text-[10px] font-bold pl-3 uppercase text-black/90">
                &gt;&gt; {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 6. Special Kitchen Order Notes */}
      {order.customerNotes && (
        <div className="py-1 border-b border-dashed border-black text-[10px]">
          <span className="font-black uppercase block">* NOTE: {order.customerNotes}</span>
        </div>
      )}

      {/* Minimal Tear-off Space */}
      <div className="h-3" />
    </div>
  );
};

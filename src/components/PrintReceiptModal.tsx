import React, { useState } from 'react';
import { Order, ThermalPaperWidth } from '../types';
import { Printer, X, Copy, Check, Receipt, ChefHat, FileText, Sparkles } from 'lucide-react';
import { settingsStore } from '../services/settingsStore';
import { thermalPrintService } from '../services/thermalPrintService';
import { ThermalInvoiceTicket } from './ThermalInvoiceTicket';
import { ThermalKOTTicket } from './ThermalKOTTicket';
import { generateInvoicePlainText, generateKOTPlainText } from '../utils/thermalPrinter';

interface PrintReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  defaultTab?: 'invoice' | 'kot';
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  order,
  onClose,
  defaultTab = 'invoice',
}) => {
  if (!order) return null;

  const settings = settingsStore.getSettings();
  const [activeTab, setActiveTab] = useState<'invoice' | 'kot'>(defaultTab);
  const [selectedWidth, setSelectedWidth] = useState<ThermalPaperWidth>(
    settings.printing?.paperWidth || '58mm'
  );
  const [copied, setCopied] = useState(false);

  const handlePrint = (mode: 'invoice' | 'kot' = activeTab) => {
    if (mode === 'invoice') {
      thermalPrintService.printInvoice(order, { paperWidth: selectedWidth });
    } else {
      thermalPrintService.printKOT(order, { paperWidth: selectedWidth });
    }
  };

  const handleCopyESC = () => {
    const rawText =
      activeTab === 'invoice'
        ? generateInvoicePlainText(order, settings)
        : generateKOTPlainText(order, settings);

    navigator.clipboard.writeText(rawText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2e211d]/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#f4efe8] rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-[#a19284]/40 text-[#2e211d] relative max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#a19284]/30 print:hidden">
          <div>
            <h3 className="text-sm font-black font-['Playfair_Display'] text-[#2e211d]">
              Thermal Print Manager
            </h3>
            <p className="text-[11px] text-[#8c3a27] font-bold">
              Token #{order.tokenNo} {order.invoiceNo ? `• ${order.invoiceNo}` : ''}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-[#a19284] hover:text-[#2e211d] bg-[#e2d7c9] p-1.5 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Tax Invoice vs Kitchen KOT */}
        <div className="pt-3 pb-2 flex items-center justify-between gap-2 print:hidden">
          <div className="flex bg-[#e2d7c9] p-1 rounded-2xl border border-[#a19284]/30 flex-1">
            <button
              onClick={() => setActiveTab('invoice')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'invoice'
                  ? 'bg-[#8c3a27] text-white shadow-sm'
                  : 'text-[#2e211d] hover:text-[#8c3a27]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Tax Invoice</span>
            </button>
            <button
              onClick={() => setActiveTab('kot')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'kot'
                  ? 'bg-[#2e211d] text-white shadow-sm'
                  : 'text-[#2e211d] hover:text-[#8c3a27]'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Kitchen KOT</span>
            </button>
          </div>

          {/* Paper Width Toggle */}
          <div className="flex bg-[#e2d7c9] p-1 rounded-2xl border border-[#a19284]/30">
            {(['58mm', '80mm'] as ThermalPaperWidth[]).map((w) => (
              <button
                key={w}
                onClick={() => setSelectedWidth(w)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                  selectedWidth === w
                    ? 'bg-white text-[#8c3a27] font-black shadow-sm'
                    : 'text-[#2e211d] hover:text-[#8c3a27]'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Live Thermal Receipt Preview Box */}
        <div className="flex-1 overflow-y-auto my-2 p-3 bg-[#e2d7c9]/40 rounded-2xl border border-[#a19284]/30 flex justify-center shadow-inner">
          <div className="bg-white p-3 rounded-xl shadow-md border border-[#a19284]/40 print:shadow-none print:border-none print:p-0">
            {activeTab === 'invoice' ? (
              <ThermalInvoiceTicket order={order} paperWidth={selectedWidth} />
            ) : (
              <ThermalKOTTicket order={order} paperWidth={selectedWidth} />
            )}
          </div>
        </div>

        {/* Print & Action Controls */}
        <div className="pt-3 border-t border-[#a19284]/30 space-y-2 print:hidden">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handlePrint('invoice')}
              className={`py-3 font-black rounded-2xl shadow-md flex items-center justify-center gap-1.5 transition-all text-xs ${
                activeTab === 'invoice'
                  ? 'bg-[#8c3a27] hover:bg-[#732f1f] text-white active:scale-98'
                  : 'bg-[#2e211d] hover:bg-[#1b1311] text-white'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice ({selectedWidth})</span>
            </button>

            <button
              onClick={() => handlePrint('kot')}
              className={`py-3 font-black rounded-2xl shadow-md flex items-center justify-center gap-1.5 transition-all text-xs ${
                activeTab === 'kot'
                  ? 'bg-[#8c3a27] hover:bg-[#732f1f] text-white active:scale-98'
                  : 'bg-[#2e211d] hover:bg-[#1b1311] text-white'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>Print KOT Ticket</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyESC}
              className="flex-1 py-2 bg-[#e2d7c9] hover:bg-[#d6c6b3] text-[#2e211d] font-bold rounded-xl border border-[#a19284]/40 text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Raw Text!' : `Copy Raw ${activeTab === 'invoice' ? 'Invoice' : 'KOT'} Text`}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-transparent text-[#a19284] hover:text-[#2e211d] font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

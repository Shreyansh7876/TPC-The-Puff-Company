import React, { useState } from 'react';
import { Order, ThermalPaperWidth } from '../types';
import { Printer, X, Copy, Check, ChefHat, Eye } from 'lucide-react';
import { settingsStore } from '../services/settingsStore';
import { ThermalKOTTicket } from './ThermalKOTTicket';
import { generateKOTPlainText } from '../utils/thermalPrinter';

interface PrintKOTModalProps {
  order: Order | null;
  isOpen?: boolean;
  onClose: () => void;
}

export const PrintKOTModal: React.FC<PrintKOTModalProps> = ({ order, isOpen = true, onClose }) => {
  if (!order || !isOpen) return null;

  const settings = settingsStore.getSettings();
  const [selectedWidth, setSelectedWidth] = useState<ThermalPaperWidth>(
    settings.printing?.paperWidth || '58mm'
  );
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    // Add print attribute for targeted CSS print styling
    document.body.setAttribute('data-print-mode', 'kot');
    window.print();
    setTimeout(() => {
      document.body.removeAttribute('data-print-mode');
    }, 1000);
  };

  const handleCopyESC = () => {
    const rawText = generateKOTPlainText(order, settings);
    navigator.clipboard.writeText(rawText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2e211d]/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#f4efe8] rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#a19284]/40 text-[#2e211d] relative max-h-[90vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#a19284]/30 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#8c3a27] text-[#f4efe8] flex items-center justify-center font-bold">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black font-['Playfair_Display'] text-[#2e211d]">
                Kitchen Order Ticket (KOT)
              </h3>
              <p className="text-[10px] text-[#8c3a27] font-bold">
                Token #{order.tokenNo} • No Prices / Payment Info
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#a19284] hover:text-[#2e211d] bg-[#e2d7c9] p-1.5 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper Width Selector Pill */}
        <div className="py-2.5 flex items-center justify-between print:hidden text-xs">
          <span className="font-bold text-[#2e211d] text-[11px]">Printer Paper Width:</span>
          <div className="flex bg-[#e2d7c9] p-0.5 rounded-xl border border-[#a19284]/30">
            {(['58mm', '80mm'] as ThermalPaperWidth[]).map((w) => (
              <button
                key={w}
                onClick={() => setSelectedWidth(w)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedWidth === w
                    ? 'bg-[#8c3a27] text-white shadow-sm'
                    : 'text-[#2e211d] hover:text-[#8c3a27]'
                }`}
              >
                {w} {w === '58mm' ? '(2-inch Mini)' : '(3-inch Wide)'}
              </button>
            ))}
          </div>
        </div>

        {/* Live Thermal Ticket Preview Container */}
        <div className="flex-1 overflow-y-auto my-2 p-3 bg-[#e2d7c9]/40 rounded-2xl border border-[#a19284]/30 flex justify-center shadow-inner">
          <div className="bg-white p-3 rounded-xl shadow-md border border-[#a19284]/40 print:shadow-none print:border-none print:p-0">
            <ThermalKOTTicket order={order} paperWidth={selectedWidth} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#a19284]/30 space-y-2 print:hidden">
          <button
            onClick={handlePrint}
            className="w-full py-3 bg-[#8c3a27] hover:bg-[#732f1f] active:scale-98 text-[#f4efe8] font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all text-sm"
          >
            <Printer className="w-5 h-5" />
            <span>Print KOT Ticket ({selectedWidth})</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleCopyESC}
              className="flex-1 py-2 bg-[#e2d7c9] hover:bg-[#d6c6b3] text-[#2e211d] font-bold rounded-xl border border-[#a19284]/40 text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied ESC/POS Text!' : 'Copy Raw Text (Bluetooth Apps)'}</span>
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

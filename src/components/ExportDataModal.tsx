import React from 'react';
import { X } from 'lucide-react';
import { Order } from '../types';
import { ExportDataPanel } from './ExportDataPanel';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({
  isOpen,
  onClose,
  orders,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#2e211d]/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl my-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 w-8 h-8 bg-[#231916] text-[#e2d7c9] hover:text-[#f4efe8] hover:bg-[#8c3a27] rounded-full flex items-center justify-center shadow-lg transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <ExportDataPanel orders={orders} onClose={onClose} isModal={true} />
      </div>
    </div>
  );
};

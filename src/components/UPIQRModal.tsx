import React from 'react';
import { QrCode, X, CheckCircle, ShieldCheck } from 'lucide-react';

interface UPIQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  tokenNo: number;
  upiId?: string;
  onPaymentConfirm: () => void;
}

export const UPIQRModal: React.FC<UPIQRModalProps> = ({
  isOpen,
  onClose,
  amount,
  tokenNo,
  upiId = 'thepuffcompany@upi',
  onPaymentConfirm,
}) => {
  if (!isOpen) return null;

  // Standard UPI Intent URL format
  const upiIntent = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    'THE PUFF CO.'
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Token #${tokenNo} THE PUFF CO.`)}`;

  // SVG QR Code generator URL with Rust Velvet color #8c3a27
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    upiIntent
  )}&color=8c3a27&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2e211d]/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#f4efe8] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#a19284]/40 text-center relative overflow-hidden text-[#2e211d]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#a19284] hover:text-[#2e211d] bg-[#e2d7c9] p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center gap-2 bg-[#8c3a27]/10 text-[#8c3a27] text-xs font-bold px-3.5 py-1.5 rounded-full mb-3 border border-[#8c3a27]/30">
          <QrCode className="w-4 h-4 text-[#8c3a27]" />
          <span>INSTANT UPI PAYMENT</span>
        </div>

        <h3 className="text-xl font-['Playfair_Display'] font-black text-[#2e211d] tracking-tight">
          Scan to Pay ₹{amount.toFixed(2)}
        </h3>
        <p className="text-xs text-[#a19284] mt-1 font-medium">
          Order Token <span className="font-bold text-[#8c3a27]">#{tokenNo}</span> • THE PUFF CO.
        </p>

        {/* QR Display */}
        <div className="my-5 p-4 bg-white rounded-2xl border-2 border-dashed border-[#a19284]/50 inline-block shadow-inner">
          <img
            src={qrCodeUrl}
            alt="UPI QR Code"
            className="w-48 h-48 mx-auto rounded-xl shadow-sm border border-[#e2d7c9]"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <p className="text-[11px] font-mono text-[#2e211d] mt-2 font-semibold">
            UPI ID: <span className="font-bold text-[#8c3a27]">{upiId}</span>
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 text-[#2e211d] text-xs mb-6">
          <span className="flex items-center gap-1 font-semibold text-[#8c3a27] bg-[#e2d7c9]/50 px-3 py-1 rounded-lg border border-[#a19284]/30">
            <ShieldCheck className="w-4 h-4 text-[#8c3a27]" /> GPay / PhonePe / Paytm / BHIM
          </span>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => {
              onPaymentConfirm();
              onClose();
            }}
            className="w-full py-3.5 bg-[#8c3a27] hover:bg-[#732f1f] active:scale-98 text-[#f4efe8] font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Confirm Payment Received</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-[#a19284] hover:text-[#2e211d] text-xs font-bold"
          >
            Cancel / Change Payment Method
          </button>
        </div>
      </div>
    </div>
  );
};

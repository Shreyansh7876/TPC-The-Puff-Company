import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Calendar, 
  FileSpreadsheet, 
  FileCode, 
  Printer, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  Loader2, 
  Filter,
  Layers,
  Sparkles,
  DollarSign,
  ShoppingCart
} from 'lucide-react';
import { Order } from '../types';
import { 
  getDatePresetRanges, 
  filterOrdersByDateRange, 
  exportData, 
  ExportFormat,
  DateRangeFilter
} from '../utils/exportUtils';

interface ExportDataPanelProps {
  orders: Order[];
  onClose?: () => void;
  isModal?: boolean;
}

export const ExportDataPanel: React.FC<ExportDataPanelProps> = ({
  orders,
  onClose,
  isModal = false,
}) => {
  const datePresets = getDatePresetRanges();

  // Filter State
  const [activePreset, setActivePreset] = useState<DateRangeFilter['preset']>('last30');
  const [fromDate, setFromDate] = useState<string>(datePresets.last30.fromDate);
  const [toDate, setToDate] = useState<string>(datePresets.last30.toDate);
  
  // Scope State: 'filtered' or 'all'
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');

  // Format Dropdown Open State
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Loading & Notification State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Preset Selection Handler
  const handleSelectPreset = (presetKey: DateRangeFilter['preset']) => {
    setActivePreset(presetKey);
    if (presetKey !== 'custom') {
      const preset = datePresets[presetKey];
      setFromDate(preset.fromDate);
      setToDate(preset.toDate);
    }
  };

  // Custom Date Change Handler
  const handleDateChange = (field: 'from' | 'to', value: string) => {
    setActivePreset('custom');
    if (field === 'from') {
      setFromDate(value);
    } else {
      setToDate(value);
    }
  };

  // Date Range Validation
  const isValidRange = Boolean(fromDate && toDate && new Date(fromDate) <= new Date(toDate));
  const isInvalidDateOrder = Boolean(fromDate && toDate && new Date(fromDate) > new Date(toDate));

  // Filtered Orders Calculation
  const filteredOrders = isValidRange ? filterOrdersByDateRange(orders, fromDate, toDate) : [];
  const targetOrders = exportScope === 'all' ? orders : filteredOrders;

  const totalRevenue = targetOrders.reduce((sum, o) => sum + o.total, 0);

  // Handle Export Action
  const handleTriggerExport = async (format: ExportFormat) => {
    setIsDropdownOpen(false);
    setNotification(null);

    if (!isValidRange && exportScope === 'filtered') {
      setNotification({
        type: 'error',
        message: 'Invalid date range. Please ensure "To Date" is not earlier than "From Date".',
      });
      return;
    }

    if (targetOrders.length === 0) {
      setNotification({
        type: 'error',
        message: 'No records found matching the selected export filter criteria.',
      });
      return;
    }

    setIsExporting(true);
    setProgressMsg('Initiating export...');

    // Small delay to allow UI to render spinner smoothly
    await new Promise((r) => setTimeout(r, 200));

    const result = await exportData(
      format,
      targetOrders,
      fromDate,
      toDate,
      (msg) => setProgressMsg(msg)
    );

    setIsExporting(false);
    setProgressMsg('');

    if (result.success) {
      setNotification({ type: 'success', message: result.message });
      // Auto-dismiss notification after 6 seconds
      setTimeout(() => {
        setNotification((prev) => (prev?.message === result.message ? null : prev));
      }, 6000);
    } else {
      setNotification({ type: 'error', message: result.message });
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-[#a19284]/30 shadow-xl p-5 sm:p-6 text-[#2e211d] ${isModal ? 'max-w-3xl w-full mx-auto' : ''}`}>
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#a19284]/30 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#8c3a27] text-[#f4efe8] flex items-center justify-center font-bold shadow-md shrink-0">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-['Playfair_Display'] font-black text-[#2e211d] flex items-center gap-2">
              <span>Export Reports & Analytics</span>
              <span className="text-[10px] bg-[#8c3a27] text-[#f4efe8] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-['Cinzel']">
                PRO
              </span>
            </h3>
            <p className="text-xs text-[#a19284] mt-0.5">
              Custom date range filter & multi-format data exporter for operational reporting.
            </p>
          </div>
        </div>

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[#e2d7c9]/40 hover:bg-[#e2d7c9] text-[#2e211d] font-bold text-xs rounded-xl self-end sm:self-center transition-all"
          >
            Close
          </button>
        )}
      </div>

      {/* Notification Toast Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold mb-5 flex items-center justify-between gap-2 transition-all animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-[#8c3a27]/10 text-[#8c3a27] border border-[#8c3a27]/30'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#8c3a27]" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: Quick Date Range Preset Buttons */}
      <div className="space-y-2 mb-5">
        <label className="text-xs font-bold text-[#a19284] flex items-center gap-1.5 uppercase tracking-wider font-['Cinzel']">
          <Filter className="w-3.5 h-3.5 text-[#8c3a27]" />
          <span>Quick Date Range Filters</span>
        </label>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'last7', label: 'Last 7 Days' },
            { id: 'last30', label: 'Last 30 Days' },
            { id: 'thisMonth', label: 'This Month' },
            { id: 'lastMonth', label: 'Last Month' },
            { id: 'custom', label: 'Custom Range' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectPreset(item.id as DateRangeFilter['preset'])}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activePreset === item.id
                  ? 'bg-[#8c3a27] text-[#f4efe8] shadow-sm font-extrabold scale-102'
                  : 'bg-[#f4efe8] text-[#2e211d] hover:bg-[#e2d7c9] border border-[#a19284]/30'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 2: Custom Date Range Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#f4efe8]/60 p-4 rounded-2xl border border-[#a19284]/30 mb-5">
        <div>
          <label className="text-xs font-bold text-[#2e211d] block mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#8c3a27]" />
            <span>From Date</span>
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => handleDateChange('from', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27] shadow-xs"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#2e211d] block mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#8c3a27]" />
            <span>To Date</span>
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => handleDateChange('to', e.target.value)}
            className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none shadow-xs ${
              isInvalidDateOrder ? 'border-red-500 ring-2 ring-red-200' : 'border-[#a19284]/40 focus:border-[#8c3a27]'
            }`}
          />
        </div>

        {/* Validation Warning */}
        {isInvalidDateOrder && (
          <div className="sm:col-span-2 text-xs font-bold text-red-600 flex items-center gap-1 bg-red-50 p-2 rounded-xl border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Validation Error: "To Date" cannot be earlier than "From Date". Please correct the dates.</span>
          </div>
        )}
      </div>

      {/* SECTION 3: Export Scope Selection */}
      <div className="space-y-2 mb-5">
        <label className="text-xs font-bold text-[#a19284] flex items-center gap-1.5 uppercase tracking-wider font-['Cinzel']">
          <Layers className="w-3.5 h-3.5 text-[#8c3a27]" />
          <span>Export Dataset Scope</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setExportScope('filtered')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              exportScope === 'filtered'
                ? 'bg-[#8c3a27]/10 border-[#8c3a27] ring-2 ring-[#8c3a27]/20'
                : 'bg-white border-[#a19284]/30 hover:bg-[#f4efe8]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-[#2e211d]">Filtered Records Only</span>
              <span className="text-[10px] font-extrabold bg-[#8c3a27] text-[#f4efe8] px-2 py-0.5 rounded-full">
                {filteredOrders.length} Orders
              </span>
            </div>
            <p className="text-[11px] text-[#a19284]">
              Export orders matching date range ({fromDate} to {toDate})
            </p>
          </button>

          <button
            onClick={() => setExportScope('all')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              exportScope === 'all'
                ? 'bg-[#8c3a27]/10 border-[#8c3a27] ring-2 ring-[#8c3a27]/20'
                : 'bg-white border-[#a19284]/30 hover:bg-[#f4efe8]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-[#2e211d]">All Store History Records</span>
              <span className="text-[10px] font-extrabold bg-[#2e211d] text-[#f4efe8] px-2 py-0.5 rounded-full">
                {orders.length} Total
              </span>
            </div>
            <p className="text-[11px] text-[#a19284]">
              Export entire sales history regardless of date filter
            </p>
          </button>
        </div>
      </div>

      {/* SECTION 4: Live Summary Metric Preview Card */}
      <div className="bg-[#2e211d] text-[#f4efe8] p-4 rounded-2xl border border-[#a19284]/30 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8c3a27] text-[#f4efe8] flex items-center justify-center font-bold shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#a19284] font-bold uppercase tracking-wider block font-['Cinzel']">
              Records Selected for Export
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-['Playfair_Display'] font-black text-[#f4efe8]">
                {targetOrders.length} Order Tickets
              </span>
              <span className="text-xs text-[#e2d7c9] font-medium">
                ({exportScope === 'filtered' ? `${fromDate} to ${toDate}` : 'All Time'})
              </span>
            </div>
          </div>
        </div>

        <div className="sm:text-right border-t sm:border-t-0 border-[#a19284]/30 pt-2 sm:pt-0 w-full sm:w-auto">
          <span className="text-[10px] text-[#a19284] font-bold uppercase tracking-wider block font-['Cinzel']">
            Total Revenue Value
          </span>
          <span className="text-xl font-['Playfair_Display'] font-black text-[#e2d7c9]">
            ₹{totalRevenue.toFixed(2)}
          </span>
        </div>
      </div>

      {/* SECTION 5: Primary "Export Data" Dropdown & Format Action Grid */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#a19284] uppercase tracking-wider font-['Cinzel']">
            Choose Export Output Format
          </span>

          {/* Main Dropdown Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={isExporting || isInvalidDateOrder || targetOrders.length === 0}
              className="w-full sm:w-auto px-5 py-3 bg-[#8c3a27] hover:bg-[#732f1f] disabled:opacity-50 text-[#f4efe8] font-bold text-xs rounded-2xl shadow-lg flex items-center justify-between sm:justify-center gap-2 transition-all active:scale-98"
            >
              <div className="flex items-center gap-2">
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Export Data ({targetOrders.length} Records)</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-[#a19284]/30 z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="text-[10px] font-bold text-[#a19284] px-3 py-1 uppercase tracking-wider font-['Cinzel']">
                  Select Format
                </div>

                <button
                  onClick={() => handleTriggerExport('csv')}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-[#2e211d] hover:bg-[#f4efe8] hover:text-[#8c3a27] transition-all text-left"
                >
                  <FileText className="w-4 h-4 text-[#8c3a27]" />
                  <div>
                    <span>CSV File (.csv)</span>
                    <p className="text-[10px] text-[#a19284] font-normal">Standard comma-separated format</p>
                  </div>
                </button>

                <button
                  onClick={() => handleTriggerExport('xlsx')}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-[#2e211d] hover:bg-[#f4efe8] hover:text-[#8c3a27] transition-all text-left"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#8c3a27]" />
                  <div>
                    <span>Excel Workbook (.xlsx)</span>
                    <p className="text-[10px] text-[#a19284] font-normal">Formatted spreadsheet with totals</p>
                  </div>
                </button>

                <button
                  onClick={() => handleTriggerExport('pdf')}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-[#2e211d] hover:bg-[#f4efe8] hover:text-[#8c3a27] transition-all text-left"
                >
                  <Download className="w-4 h-4 text-[#8c3a27]" />
                  <div>
                    <span>PDF Document (.pdf)</span>
                    <p className="text-[10px] text-[#a19284] font-normal">Official printable executive report</p>
                  </div>
                </button>

                <button
                  onClick={() => handleTriggerExport('json')}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-[#2e211d] hover:bg-[#f4efe8] hover:text-[#8c3a27] transition-all text-left"
                >
                  <FileCode className="w-4 h-4 text-[#8c3a27]" />
                  <div>
                    <span>JSON Raw Data (.json)</span>
                    <p className="text-[10px] text-[#a19284] font-normal">Machine-readable full payload</p>
                  </div>
                </button>

                <button
                  onClick={() => handleTriggerExport('print')}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-[#2e211d] hover:bg-[#f4efe8] hover:text-[#8c3a27] transition-all text-left border-t border-[#a19284]/20 pt-2"
                >
                  <Printer className="w-4 h-4 text-[#8c3a27]" />
                  <div>
                    <span>Print-Friendly Report</span>
                    <p className="text-[10px] text-[#a19284] font-normal">Open clean printable window</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading / Progress Bar */}
        {isExporting && (
          <div className="bg-[#f4efe8] p-3.5 rounded-2xl border border-[#a19284]/30 flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 text-[#8c3a27] animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-[#2e211d] block truncate">{progressMsg}</span>
              <div className="w-full bg-[#e2d7c9] h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-[#8c3a27] h-full rounded-full w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* Quick Format Action Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
          <button
            onClick={() => handleTriggerExport('csv')}
            disabled={isExporting || isInvalidDateOrder || targetOrders.length === 0}
            className="p-3 rounded-2xl border border-[#a19284]/30 bg-white hover:bg-[#f4efe8] hover:border-[#8c3a27] disabled:opacity-50 transition-all flex flex-col items-center text-center gap-1.5 group"
          >
            <FileText className="w-5 h-5 text-[#8c3a27] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-[#2e211d]">CSV (.csv)</span>
          </button>

          <button
            onClick={() => handleTriggerExport('xlsx')}
            disabled={isExporting || isInvalidDateOrder || targetOrders.length === 0}
            className="p-3 rounded-2xl border border-[#a19284]/30 bg-white hover:bg-[#f4efe8] hover:border-[#8c3a27] disabled:opacity-50 transition-all flex flex-col items-center text-center gap-1.5 group"
          >
            <FileSpreadsheet className="w-5 h-5 text-[#8c3a27] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-[#2e211d]">Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => handleTriggerExport('pdf')}
            disabled={isExporting || isInvalidDateOrder || targetOrders.length === 0}
            className="p-3 rounded-2xl border border-[#a19284]/30 bg-white hover:bg-[#f4efe8] hover:border-[#8c3a27] disabled:opacity-50 transition-all flex flex-col items-center text-center gap-1.5 group"
          >
            <Download className="w-5 h-5 text-[#8c3a27] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-[#2e211d]">PDF (.pdf)</span>
          </button>

          <button
            onClick={() => handleTriggerExport('json')}
            disabled={isExporting || isInvalidDateOrder || targetOrders.length === 0}
            className="p-3 rounded-2xl border border-[#a19284]/30 bg-white hover:bg-[#f4efe8] hover:border-[#8c3a27] disabled:opacity-50 transition-all flex flex-col items-center text-center gap-1.5 group"
          >
            <FileCode className="w-5 h-5 text-[#8c3a27] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-[#2e211d]">JSON (.json)</span>
          </button>

          <button
            onClick={() => handleTriggerExport('print')}
            disabled={isExporting || isInvalidDateOrder || targetOrders.length === 0}
            className="p-3 rounded-2xl border border-[#a19284]/30 bg-white hover:bg-[#f4efe8] hover:border-[#8c3a27] disabled:opacity-50 transition-all flex flex-col items-center text-center gap-1.5 col-span-2 sm:col-span-1 group"
          >
            <Printer className="w-5 h-5 text-[#8c3a27] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-[#2e211d]">Print View</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import { Order, AppMasterSettings, ThermalPaperWidth } from '../types';

/**
 * Pure ESC/POS & Text-based Thermal Printer Formatting Utility
 * Generates exact-width monospaced output for 58mm (32 chars) and 80mm (48 chars).
 */

export const getLineWidth = (paperWidth: ThermalPaperWidth = '58mm'): number => {
  if (paperWidth === '80mm') return 48;
  if (paperWidth === '72mm') return 42;
  return 32; // Default 58mm
};

/**
 * Center aligns text within the line width
 */
export const centerText = (text: string, width: number): string => {
  if (text.length >= width) return text.substring(0, width);
  const leftPadding = Math.floor((width - text.length) / 2);
  return ' '.repeat(leftPadding) + text;
};

/**
 * Creates a two-column row with left and right alignment
 */
export const justifyRow = (left: string, right: string, width: number): string => {
  const spaceNeeded = width - left.length - right.length;
  if (spaceNeeded <= 0) {
    // Truncate left if overflow
    const maxLeft = Math.max(1, width - right.length - 1);
    return left.substring(0, maxLeft) + ' ' + right;
  }
  return left + ' '.repeat(spaceNeeded) + right;
};

/**
 * Creates a 3-column row for Item, Qty, Amount
 */
export const formatItemRow = (name: string, qty: number, price: number, total: number, width: number, currency: string = 'Rs.'): string[] => {
  const lines: string[] = [];
  const qtyPrice = `${qty}x${price}`;
  const totalStr = `${currency}${total.toFixed(0)}`;
  
  if (width === 32) {
    // 58mm: Max 32 chars
    // Line 1: Item Name (wrap if long)
    // Line 2: Qty x Price ........... Total
    if (name.length > 20) {
      lines.push(name.substring(0, 32));
      lines.push(justifyRow(`  ${qtyPrice}`, totalStr, 32));
    } else {
      lines.push(justifyRow(`${name} (${qtyPrice})`, totalStr, 32));
    }
  } else {
    // 80mm: Max 48 chars
    // Single line: Item Name (24)   Qty x Price (12)   Total (10)
    const namePart = name.length > 24 ? name.substring(0, 23) + '.' : name.padEnd(24);
    const qtyPart = qtyPrice.padStart(10);
    const totalPart = totalStr.padStart(12);
    lines.push(namePart + qtyPart + totalPart);
  }
  return lines;
};

/**
 * Generates standard plain-text KOT formatted specifically for thermal printers
 * (WITHOUT ANY PRICES, TAXES, DATE/TIME, LOGOS, OR PAYMENT METHODS)
 */
export const generateKOTPlainText = (order: Order, settings: AppMasterSettings): string => {
  const width = getLineWidth(settings.printing?.paperWidth || '58mm');
  const divider = '-'.repeat(width);
  const doubleDivider = '='.repeat(width);
  const lines: string[] = [];

  // 1. Simple KOT Header
  lines.push(doubleDivider);
  lines.push(centerText('THE PUFF CO.', width));
  lines.push(doubleDivider);

  // 2. Token & Order Type / Table
  lines.push(centerText(`TOKEN #${order.tokenNo}`, width));
  const orderRef = `[${(order.orderType || 'DINE IN').toUpperCase()}${order.tableOrName ? ' - ' + order.tableOrName.toUpperCase() : ''}]`;
  lines.push(centerText(orderRef, width));

  // 3. Customer Name (if available)
  if (order.customerName) {
    lines.push(divider);
    lines.push(`CUST: ${order.customerName.toUpperCase()}`);
  }

  lines.push(divider);

  // 4. Items Header
  lines.push('QTY  ITEM');
  lines.push(divider);

  // 5. Items List (STRICTLY NO PRICES / TOTALS / DATES)
  order.items.forEach((item) => {
    lines.push(`[${item.quantity}x] ${item.itemName}`);
    if (item.notes && settings.printing?.printItemNotesOnKOT !== false) {
      lines.push(`   >> ${item.notes}`);
    }
  });

  // 6. Special Kitchen Notes
  if (order.customerNotes && settings.printing?.printCustomerNotes !== false) {
    lines.push(divider);
    lines.push(`* NOTE: ${order.customerNotes}`);
  }

  lines.push(doubleDivider);

  // Minimal feed lines for tear-off
  lines.push('');
  lines.push('');

  return lines.join('\n');
};

/**
 * Generates standard plain-text Tax Invoice formatted for thermal printers
 */
export const generateInvoicePlainText = (order: Order, settings: AppMasterSettings): string => {
  const width = getLineWidth(settings.printing?.paperWidth || '58mm');
  const divider = '-'.repeat(width);
  const doubleDivider = '='.repeat(width);
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

  const lines: string[] = [];

  // Store Header
  lines.push(doubleDivider);
  lines.push(centerText(store.storeName.toUpperCase(), width));
  if (store.storeTagline) {
    lines.push(centerText(store.storeTagline, width));
  }
  if (store.address) {
    lines.push(centerText(store.address.substring(0, width), width));
  }
  if (store.contactNumber) {
    lines.push(centerText(`Ph: ${store.contactNumber}`, width));
  }
  if (store.gstNumber) {
    lines.push(centerText(`GSTIN: ${store.gstNumber}`, width));
  }
  if (store.fssaiNumber) {
    lines.push(centerText(`FSSAI Lic: ${store.fssaiNumber}`, width));
  }
  lines.push(doubleDivider);

  // Bill Info
  lines.push(justifyRow(`TOKEN #${order.tokenNo}`, `[${order.orderType}]`, width));
  if (order.invoiceNo) {
    lines.push(justifyRow('Invoice No:', order.invoiceNo, width));
  }
  
  const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = new Date(order.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  lines.push(justifyRow('Date: ' + dateStr, timeStr, width));
  lines.push(justifyRow('Cashier: ' + (order.staffName || 'Counter'), 'Pay: ' + order.paymentMode, width));

  // Customer Details (if enabled)
  if (printing.printCustomerDetails) {
    if (order.customerName || order.customerMobile) {
      lines.push(divider);
      if (order.customerName) {
        lines.push(justifyRow('Customer:', order.customerName, width));
      }
      if (order.customerMobile) {
        lines.push(justifyRow('Mobile:', order.customerMobile, width));
      }
    }
  }

  lines.push(divider);
  lines.push(justifyRow('ITEM (QTY x RATE)', 'AMOUNT', width));
  lines.push(divider);

  // Items
  order.items.forEach((item) => {
    const itemRows = formatItemRow(item.itemName, item.quantity, item.price, item.quantity * item.price, width, store.currencySymbol);
    lines.push(...itemRows);
    if (item.notes) {
      lines.push(`  * ${item.notes}`);
    }
  });

  lines.push(divider);

  // Calculations
  lines.push(justifyRow('Subtotal:', `${store.currencySymbol}${order.subtotal.toFixed(2)}`, width));

  if (order.gstEnabled && billing.enableSplitTax) {
    const halfRate = (billing.gstRatePercent / 2).toFixed(1);
    const halfGst = (order.cgstAmount || order.gstAmount / 2).toFixed(2);
    lines.push(justifyRow(`CGST (${halfRate}%):`, `${store.currencySymbol}${halfGst}`, width));
    lines.push(justifyRow(`SGST (${halfRate}%):`, `${store.currencySymbol}${halfGst}`, width));
  } else if (order.gstEnabled) {
    lines.push(justifyRow(`GST (${billing.gstRatePercent}%):`, `${store.currencySymbol}${order.gstAmount.toFixed(2)}`, width));
  }

  if (order.discount > 0) {
    lines.push(justifyRow('Discount:', `-${store.currencySymbol}${order.discount.toFixed(2)}`, width));
  }

  const rounded = order.roundedTotal ?? order.total;
  lines.push(doubleDivider);
  lines.push(justifyRow('GRAND TOTAL:', `${store.currencySymbol}${rounded.toFixed(2)}`, width));
  lines.push(doubleDivider);

  // Payment Breakdown
  if (order.paymentMode === 'SPLIT' && order.splitDetails) {
    lines.push('Payment Split:');
    if (order.splitDetails.cash) lines.push(` - Cash: ${store.currencySymbol}${order.splitDetails.cash}`);
    if (order.splitDetails.upi) lines.push(` - UPI:  ${store.currencySymbol}${order.splitDetails.upi}`);
    if (order.splitDetails.card) lines.push(` - Card: ${store.currencySymbol}${order.splitDetails.card}`);
    lines.push(divider);
  }

  // Customer Notes
  if (printing.printCustomerNotes && order.customerNotes) {
    lines.push(`Note: ${order.customerNotes}`);
    lines.push(divider);
  }

  // Footer
  if (billing.receiptFooterText) {
    lines.push(centerText(billing.receiptFooterText, width));
  }
  lines.push(centerText('*** VISIT AGAIN ***', width));

  // Tear-off feed lines
  const feedCount = printing.feedLines ?? 2;
  for (let i = 0; i < feedCount; i++) {
    lines.push('');
  }

  return lines.join('\n');
};

/**
 * Triggers native system printing with proper thermal printer formatting
 */
export const triggerThermalPrint = () => {
  if (typeof window === 'undefined') return;
  window.print();
};

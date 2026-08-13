import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order } from '../types';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json' | 'print';

export interface DateRangeFilter {
  preset: 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
}

export function getDatePresetRanges(): Record<string, { fromDate: string; toDate: string; label: string }> {
  const now = new Date();

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Today
  const todayStr = formatDate(now);

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  // Last 7 days
  const last7 = new Date(now);
  last7.setDate(now.getDate() - 6);
  const last7Str = formatDate(last7);

  // Last 30 days
  const last30 = new Date(now);
  last30.setDate(now.getDate() - 29);
  const last30Str = formatDate(last30);

  // This Month
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthStartStr = formatDate(firstDayThisMonth);

  // Last Month
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastMonthStartStr = formatDate(firstDayLastMonth);
  const lastMonthEndStr = formatDate(lastDayLastMonth);

  return {
    today: { fromDate: todayStr, toDate: todayStr, label: 'Today' },
    yesterday: { fromDate: yesterdayStr, toDate: yesterdayStr, label: 'Yesterday' },
    last7: { fromDate: last7Str, toDate: todayStr, label: 'Last 7 Days' },
    last30: { fromDate: last30Str, toDate: todayStr, label: 'Last 30 Days' },
    thisMonth: { fromDate: thisMonthStartStr, toDate: todayStr, label: 'This Month' },
    lastMonth: { fromDate: lastMonthStartStr, toDate: lastMonthEndStr, label: 'Last Month' },
    custom: { fromDate: todayStr, toDate: todayStr, label: 'Custom Range' },
  };
}

export function filterOrdersByDateRange(orders: Order[], fromDate: string, toDate: string): Order[] {
  if (!fromDate || !toDate) return orders;

  const startMs = new Date(`${fromDate}T00:00:00`).getTime();
  const endMs = new Date(`${toDate}T23:59:59.999`).getTime();

  return orders.filter((order) => {
    const orderMs = new Date(order.createdAt).getTime();
    return orderMs >= startMs && orderMs <= endMs;
  });
}

export function formatOrdersForExport(orders: Order[]) {
  return orders.map((o) => {
    const itemNames = o.items.map((i) => `${i.quantity}x ${i.itemName}`).join('; ');
    return {
      'Token No': `#${o.tokenNo}`,
      'Date & Time': new Date(o.createdAt).toLocaleString(),
      'Order Type': o.orderType,
      'Table / Reference': o.tableOrName || '-',
      'Items Ordered': itemNames,
      'Payment Mode': o.paymentMode,
      'Subtotal (₹)': o.subtotal,
      'GST (₹)': o.gstAmount,
      'Total Amount (₹)': o.total,
      'Status': o.status,
      'Staff Name': o.staffName || 'Counter Cashier',
      'Device': o.deviceType,
      'Customer Notes': o.customerNotes || '-',
    };
  });
}

export async function exportData(
  format: ExportFormat,
  orders: Order[],
  fromDate: string,
  toDate: string,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string }> {
  if (orders.length === 0) {
    return { success: false, message: 'No orders available to export for the selected criteria.' };
  }

  const filename = `The_Puff_Company_Sales_${fromDate}_to_${toDate}`;
  const formattedData = formatOrdersForExport(orders);

  // Calculate totals
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalSubtotal = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalGst = orders.reduce((sum, o) => sum + o.gstAmount, 0);

  if (onProgress) onProgress('Preparing data export...');

  try {
    switch (format) {
      case 'csv': {
        if (onProgress) onProgress('Generating CSV file...');
        let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // UTF-8 BOM for Excel compatibility
        
        // Headers
        const headers = Object.keys(formattedData[0]);
        csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';

        // Rows
        formattedData.forEach((row) => {
          const values = headers.map((h) => {
            const val = String((row as any)[h] ?? '').replace(/"/g, '""');
            return `"${val}"`;
          });
          csvContent += values.join(',') + '\n';
        });

        // Summary row
        csvContent += `\n"TOTALS","${orders.length} Orders","","","","","${totalSubtotal.toFixed(2)}","${totalGst.toFixed(2)}","${totalRevenue.toFixed(2)}","","","",""\n`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        break;
      }

      case 'xlsx': {
        if (onProgress) onProgress('Building Excel workbook...');
        const worksheet = XLSX.utils.json_to_sheet(formattedData);

        // Add summary row at bottom
        XLSX.utils.sheet_add_aoa(worksheet, [
          [],
          ['TOTALS', `${orders.length} Orders`, '', '', '', '', totalSubtotal, totalGst, totalRevenue]
        ], { origin: -1 });

        // Auto-fit column widths
        const colWidths = Object.keys(formattedData[0]).map((key) => {
          const maxLen = Math.max(
            key.length,
            ...formattedData.map((row) => String((row as any)[key] ?? '').length)
          );
          return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
        });
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');
        XLSX.writeFile(workbook, `${filename}.xlsx`);
        break;
      }

      case 'pdf': {
        if (onProgress) onProgress('Generating PDF document...');
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        // Header
        doc.setFillColor(46, 33, 29); // #2e211d
        doc.rect(0, 0, 297, 24, 'F');

        doc.setTextColor(244, 239, 232); // #f4efe8
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('THE PUFF CO. — OFFICIAL SALES REPORT', 14, 12);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date Range: ${fromDate} to ${toDate} | Exported: ${new Date().toLocaleString()}`, 14, 18);

        // Metrics Bar
        doc.setFillColor(226, 215, 201); // #e2d7c9
        doc.rect(14, 28, 269, 14, 'F');

        doc.setTextColor(46, 33, 29);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Orders: ${orders.length}`, 20, 36);
        doc.text(`Subtotal: Rs. ${totalSubtotal.toFixed(2)}`, 80, 36);
        doc.text(`GST Total: Rs. ${totalGst.toFixed(2)}`, 140, 36);
        doc.setTextColor(140, 58, 39); // #8c3a27
        doc.text(`Grand Total Revenue: Rs. ${totalRevenue.toFixed(2)}`, 200, 36);

        // Table Rows
        const rows = orders.map((o) => [
          `#${o.tokenNo}`,
          new Date(o.createdAt).toLocaleDateString() + ' ' + new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          o.orderType,
          o.tableOrName || '-',
          o.items.map((i) => `${i.quantity}x ${i.itemName}`).join(', '),
          o.paymentMode,
          `Rs. ${o.subtotal.toFixed(2)}`,
          `Rs. ${o.gstAmount.toFixed(2)}`,
          `Rs. ${o.total.toFixed(2)}`,
          o.status,
        ]);

        autoTable(doc, {
          startY: 46,
          head: [['Token', 'Date/Time', 'Type', 'Table/Ref', 'Items', 'Pay Mode', 'Subtotal', 'GST', 'Total', 'Status']],
          body: rows,
          theme: 'grid',
          headStyles: {
            fillColor: [140, 58, 39], // #8c3a27
            textColor: [244, 239, 232],
            fontStyle: 'bold',
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [46, 33, 29],
          },
          alternateRowStyles: {
            fillColor: [244, 239, 232],
          },
          margin: { left: 14, right: 14 },
        });

        doc.save(`${filename}.pdf`);
        break;
      }

      case 'json': {
        if (onProgress) onProgress('Preparing JSON payload...');
        const jsonContent = JSON.stringify(
          {
            reportName: 'The Puff Co. Sales Report',
            generatedAt: new Date().toISOString(),
            dateRange: { fromDate, toDate },
            summary: {
              totalOrders: orders.length,
              totalSubtotal,
              totalGst,
              totalRevenue,
            },
            records: orders,
          },
          null,
          2
        );

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonContent);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `${filename}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        break;
      }

      case 'print': {
        if (onProgress) onProgress('Opening printable view...');
        generatePrintableReport(orders, fromDate, toDate, totalSubtotal, totalGst, totalRevenue);
        break;
      }
    }

    return { success: true, message: `Successfully exported ${orders.length} record(s) in ${format.toUpperCase()} format.` };
  } catch (err: any) {
    console.error('Export error:', err);
    return { success: false, message: `Failed to export data: ${err.message || 'Unknown error'}` };
  }
}

function generatePrintableReport(
  orders: Order[],
  fromDate: string,
  toDate: string,
  subtotal: number,
  gst: number,
  total: number
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to view the print-friendly report.');
    return;
  }

  const rowsHtml = orders
    .map(
      (o, i) => `
    <tr class="${i % 2 === 0 ? 'bg-even' : ''}">
      <td>#${o.tokenNo}</td>
      <td>${new Date(o.createdAt).toLocaleString()}</td>
      <td>${o.orderType}</td>
      <td>${o.tableOrName || '-'}</td>
      <td>${o.items.map((it) => `${it.quantity}x ${it.itemName}`).join(', ')}</td>
      <td><span class="badge badge-${o.paymentMode.toLowerCase()}">${o.paymentMode}</span></td>
      <td class="text-right">₹${o.subtotal.toFixed(2)}</td>
      <td class="text-right">₹${o.gstAmount.toFixed(2)}</td>
      <td class="text-right bold">₹${o.total.toFixed(2)}</td>
      <td><span class="status status-${o.status.toLowerCase()}">${o.status}</span></td>
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>The Puff Co. - Print Report (${fromDate} to ${toDate})</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #2e211d;
            background: #fff;
            margin: 0;
            padding: 24px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #8c3a27;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .brand-title {
            font-size: 22px;
            font-weight: 900;
            color: #8c3a27;
            margin: 0;
          }
          .brand-sub {
            font-size: 12px;
            color: #a19284;
            margin-top: 2px;
          }
          .meta {
            text-align: right;
            font-size: 12px;
            color: #555;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .card {
            background: #f4efe8;
            border: 1px solid #e2d7c9;
            border-radius: 8px;
            padding: 12px;
          }
          .card-label {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
            color: #a19284;
          }
          .card-val {
            font-size: 18px;
            font-weight: 800;
            color: #2e211d;
            margin-top: 4px;
          }
          .card-val.highlight {
            color: #8c3a27;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th {
            background: #8c3a27;
            color: #f4efe8;
            text-align: left;
            padding: 10px;
            font-size: 11px;
            text-transform: uppercase;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2d7c9;
          }
          tr.bg-even {
            background: #fdfbf7;
          }
          .text-right { text-align: right; }
          .bold { font-weight: 700; }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
          }
          .badge-cash { background: #e2d7c9; color: #2e211d; }
          .badge-upi { background: #8c3a27; color: #f4efe8; }
          .badge-card { background: #2e211d; color: #f4efe8; }
          .status { font-weight: 700; font-size: 10px; }
          .status-completed { color: #276749; }
          .status-pending { color: #d69e2e; }
          .status-preparing { color: #dd6b20; }
          .footer {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #e2d7c9;
            text-align: center;
            font-size: 11px;
            color: #a19284;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; text-align: right;">
          <button onclick="window.print()" style="background: #8c3a27; color: #fff; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer;">
            🖨️ Print Now / Save PDF
          </button>
        </div>

        <div class="header">
          <div>
            <h1 class="brand-title">THE PUFF CO.</h1>
            <div class="brand-sub">Pure Veg Gourmet Puffs • Executive Sales & Analytics Report</div>
          </div>
          <div class="meta">
            <div><strong>Date Range:</strong> ${fromDate} to ${toDate}</div>
            <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div class="summary-cards">
          <div class="card">
            <div class="card-label">Total Orders</div>
            <div class="card-val">${orders.length}</div>
          </div>
          <div class="card">
            <div class="card-label">Subtotal</div>
            <div class="card-val">₹${subtotal.toFixed(2)}</div>
          </div>
          <div class="card">
            <div class="card-label">GST Tax Collected</div>
            <div class="card-val">₹${gst.toFixed(2)}</div>
          </div>
          <div class="card">
            <div class="card-label">Grand Total Revenue</div>
            <div class="card-val highlight">₹${total.toFixed(2)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Date / Time</th>
              <th>Type</th>
              <th>Table/Ref</th>
              <th>Items Ordered</th>
              <th>Payment</th>
              <th class="text-right">Subtotal</th>
              <th class="text-right">GST</th>
              <th class="text-right">Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          Report generated automatically by The Puff Co. POS Billing System • Confidential Operational Data
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

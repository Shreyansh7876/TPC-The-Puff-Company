import { Order, ThermalPaperWidth } from '../types';

export interface PrintJob {
  type: 'invoice' | 'kot';
  order: Order;
  paperWidth: ThermalPaperWidth;
}

type PrintJobListener = (job: PrintJob | null) => void;

class ThermalPrintService {
  private activeJob: PrintJob | null = null;
  private listeners: Set<PrintJobListener> = new Set();
  private printCleanupTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('afterprint', () => {
        this.cleanupAfterPrint();
      });
    }
  }

  public getActiveJob(): PrintJob | null {
    return this.activeJob;
  }

  public subscribe(listener: PrintJobListener): () => void {
    this.listeners.add(listener);
    listener(this.activeJob);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.activeJob));
  }

  public setJob(job: PrintJob | null) {
    this.activeJob = job;
    this.notify();
  }

  public printInvoice(order: Order, options?: { paperWidth?: ThermalPaperWidth }) {
    const paperWidth = options?.paperWidth || '58mm';
    this.executePrint({
      type: 'invoice',
      order,
      paperWidth,
    });
  }

  public printKOT(order: Order, options?: { paperWidth?: ThermalPaperWidth }) {
    const paperWidth = options?.paperWidth || '58mm';
    this.executePrint({
      type: 'kot',
      order,
      paperWidth,
    });
  }

  private executePrint(job: PrintJob) {
    if (typeof window === 'undefined') return;

    if (this.printCleanupTimeout) {
      clearTimeout(this.printCleanupTimeout);
      this.printCleanupTimeout = null;
    }

    // Set active print payload
    this.activeJob = job;
    this.notify();

    // Set print metadata attributes on document body
    document.body.setAttribute('data-print-active', 'true');
    document.body.setAttribute('data-print-mode', job.type);
    document.body.setAttribute('data-paper-width', job.paperWidth);

    // Allow React Portal to mount and layout to settle before opening print dialog
    setTimeout(() => {
      requestAnimationFrame(() => {
        try {
          window.print();
        } catch (e) {
          console.warn('[ThermalPrintService] Print execution error:', e);
        }

        // Fallback cleanup timer in case afterprint event does not fire (some mobile browsers)
        this.printCleanupTimeout = setTimeout(() => {
          this.cleanupAfterPrint();
        }, 1500);
      });
    }, 50);
  }

  private cleanupAfterPrint() {
    if (typeof window !== 'undefined') {
      document.body.removeAttribute('data-print-active');
      document.body.removeAttribute('data-print-mode');
      document.body.removeAttribute('data-paper-width');
    }
    // Keep activeJob around briefly for screen preview, but safe to clear
    setTimeout(() => {
      this.activeJob = null;
      this.notify();
    }, 300);
  }
}

export const thermalPrintService = new ThermalPrintService();

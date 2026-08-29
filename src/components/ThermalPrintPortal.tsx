import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { thermalPrintService, PrintJob } from '../services/thermalPrintService';
import { ThermalInvoiceTicket } from './ThermalInvoiceTicket';
import { ThermalKOTTicket } from './ThermalKOTTicket';

export const ThermalPrintPortal: React.FC = () => {
  const [printJob, setPrintJob] = useState<PrintJob | null>(thermalPrintService.getActiveJob());
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById('thermal-print-portal');
    if (el) {
      setPortalElement(el);
    }
    return thermalPrintService.subscribe((job) => {
      setPrintJob(job);
    });
  }, []);

  if (!portalElement || !printJob) {
    return null;
  }

  return createPortal(
    <div
      id="thermal-print-container"
      data-paper-width={printJob.paperWidth}
      data-print-mode={printJob.type}
      className="thermal-print-wrapper"
    >
      {printJob.type === 'invoice' ? (
        <ThermalInvoiceTicket order={printJob.order} paperWidth={printJob.paperWidth} />
      ) : (
        <ThermalKOTTicket order={printJob.order} paperWidth={printJob.paperWidth} />
      )}
    </div>,
    portalElement
  );
};

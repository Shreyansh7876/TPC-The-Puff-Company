/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PuffItem, Ingredient, Order, SyncStatus } from './types';
import { livePuffStore } from './services/store';
import { Header, AppViewMode } from './components/Header';
import { MobilePOS } from './components/MobilePOS';
import { KOTDisplay } from './components/KOTDisplay';
import { LaptopDashboard } from './components/LaptopDashboard';
import { UPIQRModal } from './components/UPIQRModal';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { PWAPrompt } from './components/PWAPrompt';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { ExportDataModal } from './components/ExportDataModal';
import { CustomerManagement } from './components/CustomerManagement';

export default function App() {
  // Default view is the single unified POS module ('laptop_pos' / Billing) which auto-adapts
  const [currentView, setCurrentView] = useState<AppViewMode>('laptop_pos');
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Real-time store state
  const [menuItems, setMenuItems] = useState<PuffItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    firebaseConnected: true,
    lastSyncedAt: new Date().toLocaleTimeString(),
    pendingQueueCount: 0,
  });

  // Modal States
  const [upiModalState, setUpiModalState] = useState<{
    isOpen: boolean;
    amount: number;
    tokenNo: number;
    pendingOrder?: Order;
  }>({
    isOpen: false,
    amount: 0,
    tokenNo: 0,
  });

  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaBanner, setShowPwaBanner] = useState<boolean>(true);

  // Register PWA Service Worker & Install Prompt Listener
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Subscribe to store real-time data
  useEffect(() => {
    const unsubMenu = livePuffStore.subscribeMenu(setMenuItems);
    const unsubIngredients = livePuffStore.subscribeIngredients(setIngredients);
    const unsubOrders = livePuffStore.subscribeOrders(setOrders);
    const unsubSync = livePuffStore.subscribeSyncStatus(setSyncStatus);

    return () => {
      unsubMenu();
      unsubIngredients();
      unsubOrders();
      unsubSync();
    };
  }, []);

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] User accepted install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  const handleRequestUPIQR = (amount: number, tokenNo: number, order?: Order) => {
    setUpiModalState({
      isOpen: true,
      amount,
      tokenNo,
      pendingOrder: order,
    });
  };

  return (
    <div className="min-h-screen bg-[#f4efe8] text-[#2e211d] font-sans flex flex-col selection:bg-[#8c3a27] selection:text-[#f4efe8]">
      {/* App Navigation Header */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        syncStatus={syncStatus}
        deferredPrompt={deferredPrompt}
        onInstallPWA={handleInstallPWA}
        onOpenSheetsSync={() => setIsSheetsModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'kot_display' && <KOTDisplay orders={orders} />}

        {currentView === 'customers' && (
          <CustomerManagement
            orders={orders}
            onRequestReceiptPrint={(order) => setReceiptOrder(order)}
          />
        )}

        {(currentView === 'laptop_pos' ||
          currentView === 'mobile_pos' ||
          currentView === 'inventory' ||
          currentView === 'sales' ||
          currentView === 'setup') && (
          <LaptopDashboard
            activeTab={currentView === 'mobile_pos' ? 'laptop_pos' : currentView}
            menuItems={menuItems}
            ingredients={ingredients}
            orders={orders}
            onRequestReceiptPrint={(order) => setReceiptOrder(order)}
            onRequestUPIQR={handleRequestUPIQR}
          />
        )}
      </main>

      {/* UPI QR Code Modal */}
      <UPIQRModal
        isOpen={upiModalState.isOpen}
        onClose={() => setUpiModalState({ isOpen: false, amount: 0, tokenNo: 0, pendingOrder: undefined })}
        amount={upiModalState.amount}
        tokenNo={upiModalState.tokenNo}
        onPaymentConfirm={() => {
          const targetOrder = upiModalState.pendingOrder;
          setUpiModalState({ isOpen: false, amount: 0, tokenNo: 0, pendingOrder: undefined });
          if (targetOrder) {
            setReceiptOrder(targetOrder);
          }
        }}
      />

      {/* Thermal Receipt Print Modal */}
      <PrintReceiptModal
        order={receiptOrder}
        onClose={() => setReceiptOrder(null)}
      />

      {/* Google Sheets Sync & Setup Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        syncStatus={syncStatus}
      />

      {/* Advanced Export Data Modal */}
      <ExportDataModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        orders={orders}
      />

      {/* PWA Installation Prompt Toast */}
      {showPwaBanner && (
        <PWAPrompt
          deferredPrompt={deferredPrompt}
          onInstall={handleInstallPWA}
          onDismiss={() => setShowPwaBanner(false)}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { 
  Store, 
  Receipt, 
  Package, 
  Utensils, 
  ChefHat, 
  CreditCard, 
  Users, 
  Cloud, 
  ShieldCheck, 
  BarChart3, 
  Save, 
  RefreshCw, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle, 
  Key, 
  FileText, 
  Activity, 
  Sliders,
  DollarSign,
  Smartphone,
  Info,
  CheckCircle2,
  Lock,
  UserPlus,
  X,
  FolderPlus,
  MoveRight,
  Layers,
  Sparkles,
  Tag,
  ChevronRight,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Printer,
  Copy,
  Bluetooth,
  Flame,
  RotateCcw,
  Hash
} from 'lucide-react';
import { settingsStore } from '../services/settingsStore';
import { livePuffStore } from '../services/store';
import { securityService } from '../services/securityService';
import { RecoveryKeyModal } from './RecoveryKeyModal';
import { 
  AppMasterSettings, 
  ActivityLogEntry, 
  InventoryAuditLog,
  PuffItem,
  Ingredient,
  IngredientRequirement,
  ThermalPaperWidth,
  ThermalFontSize,
  Order
} from '../types';
import { ThermalInvoiceTicket } from './ThermalInvoiceTicket';
import { ThermalKOTTicket } from './ThermalKOTTicket';
import { generateInvoicePlainText, generateKOTPlainText } from '../utils/thermalPrinter';

export const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<AppMasterSettings>(settingsStore.getSettings());
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(settingsStore.getActivityLogs());
  const [auditLogs, setAuditLogs] = useState<InventoryAuditLog[]>(settingsStore.getAuditLogs());

  // Real-time Store State
  const [menuItems, setMenuItems] = useState<PuffItem[]>(livePuffStore.getMenuItems());
  const [ingredients, setIngredients] = useState<Ingredient[]>(livePuffStore.getIngredients());

  // Active Settings Tab
  const [activeTab, setActiveTab] = useState<
    'store' | 'security' | 'billing' | 'printing' | 'inventory' | 'menu' | 'kot' | 'pos' | 'payments' | 'backup' | 'analytics'
  >('store');

  // Security & Password Management State
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showCurrentPass, setShowCurrentPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [securityError, setSecurityError] = useState<string>('');
  const [securitySuccess, setSecuritySuccess] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [activeRecoveryKey, setActiveRecoveryKey] = useState<string>(securityService.getRecoveryKey());
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState<boolean>(false);
  const [isRecoveryKeyRevealed, setIsRecoveryKeyRevealed] = useState<boolean>(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(securityService.getSecurityConfig().autoLockMinutes);

  // Thermal Simulator State
  const [simulatorTab, setSimulatorTab] = useState<'invoice' | 'kot'>('invoice');
  const [copiedRawText, setCopiedRawText] = useState<boolean>(false);

  // Save Banner Notification
  const [saveBanner, setSaveBanner] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });

  // Logo Upload & Preview States
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [isLogoPreviewModalOpen, setIsLogoPreviewModalOpen] = useState<boolean>(false);

  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Category Edit & Delete Modal States
  const [editingCategory, setEditingCategory] = useState<{ oldName: string; newName: string } | null>(null);
  const [deletingCategoryInfo, setDeletingCategoryInfo] = useState<{
    categoryName: string;
    itemCount: number;
    targetCategory: string;
  } | null>(null);

  // Menu Item Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<PuffItem | null>(null);
  const [itemFormData, setItemFormData] = useState<{
    name: string;
    category: string;
    price: number | '';
    isAvailable: boolean;
    recipe: IngredientRequirement[];
  }>({
    name: '',
    category: '',
    price: '',
    isAvailable: true,
    recipe: [],
  });

  const [selectedRecipeIngId, setSelectedRecipeIngId] = useState<string>('');
  const [selectedRecipeQty, setSelectedRecipeQty] = useState<number | ''>(1);

  // KOT Token Sequence State
  const [tokenStartInput, setTokenStartInput] = useState<number>(
    settingsStore.getSettings().kot?.tokenStartNumber || 101
  );
  const [nextTokenNumber, setNextTokenNumber] = useState<number>(
    livePuffStore.getNextTokenNumber()
  );

  // Subscribe to settings & store updates
  useEffect(() => {
    const unsubSettings = settingsStore.subscribeSettings((newSettings) => {
      setSettings(newSettings);
      if (newSettings.kot?.tokenStartNumber) {
        setTokenStartInput(newSettings.kot.tokenStartNumber);
      }
    });
    const unsubActivity = settingsStore.subscribeActivityLogs(setActivityLogs);
    const unsubAudit = settingsStore.subscribeAuditLogs(setAuditLogs);

    const unsubMenu = livePuffStore.subscribeMenu(setMenuItems);
    const unsubIngredients = livePuffStore.subscribeIngredients(setIngredients);
    const unsubOrders = livePuffStore.subscribeOrders(() => {
      setNextTokenNumber(livePuffStore.getNextTokenNumber());
    });

    return () => {
      unsubSettings();
      unsubActivity();
      unsubAudit();
      unsubMenu();
      unsubIngredients();
      unsubOrders();
    };
  }, []);

  const triggerSaveNotification = (msg: string) => {
    setSaveBanner({ show: true, message: msg });
    setTimeout(() => {
      setSaveBanner({ show: false, message: '' });
    }, 4000);
  };

  // Section Handlers
  const handleUpdateStoreProfile = (field: string, val: string) => {
    settingsStore.updateSection('storeProfile', { [field]: val });
    triggerSaveNotification('Store Profile updated successfully!');
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerSaveNotification('Invalid file format. Please select an image file (PNG with transparent background recommended).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;

      const img = new Image();
      img.onload = () => {
        const maxDim = 400; // Optimize dimensions to keep localStorage fast
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const pngDataUrl = canvas.toDataURL('image/png');
          handleUpdateStoreProfile('storeLogoUrl', pngDataUrl);
          triggerSaveNotification('Store Logo uploaded and saved permanently in local storage!');
        } else {
          handleUpdateStoreProfile('storeLogoUrl', rawDataUrl);
          triggerSaveNotification('Store Logo uploaded and saved permanently in local storage!');
        }
      };

      img.onerror = () => {
        handleUpdateStoreProfile('storeLogoUrl', rawDataUrl);
        triggerSaveNotification('Store Logo saved permanently in local storage!');
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveStoreLogo = () => {
    handleUpdateStoreProfile('storeLogoUrl', '');
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = '';
    }
    setIsLogoPreviewModalOpen(false);
    triggerSaveNotification('Store Logo removed successfully.');
  };

  const handleUpdateBilling = (field: string, val: any) => {
    settingsStore.updateSection('billing', { [field]: val });
    triggerSaveNotification('Billing & Invoice settings updated!');
  };

  const handleUpdatePrinting = (field: string, val: any) => {
    settingsStore.updateSection('printing', { [field]: val });
    triggerSaveNotification('Thermal Printing settings updated!');
  };

  const sampleTestOrder: Order = {
    id: 'ORD_TEST_58MM',
    tokenNo: 101,
    invoiceNo: `${settings.billing.invoicePrefix}1001`,
    orderType: 'Dine In',
    tableOrName: 'Table #4',
    customerName: 'Rahul Sharma',
    customerMobile: '+91 98765 43210',
    items: [
      {
        id: 'puff_01',
        itemId: 'puff_01',
        itemName: 'Classic Gujarati Puff',
        category: 'Signature Puffs',
        price: 45,
        quantity: 2,
        notes: 'Extra crispy, less spicy'
      },
      {
        id: 'puff_02',
        itemId: 'puff_02',
        itemName: 'Cheese Corn Burst Puff',
        category: 'Signature Puffs',
        price: 75,
        quantity: 1,
      },
      {
        id: 'chaas_01',
        itemId: 'chaas_01',
        itemName: 'Masala Chaas (Cold)',
        category: 'Beverages',
        price: 20,
        quantity: 2,
      }
    ],
    subtotal: 205,
    discount: 0,
    gstEnabled: true,
    gstAmount: 10.25,
    cgstAmount: 5.13,
    sgstAmount: 5.12,
    total: 215.25,
    roundedTotal: 215,
    paymentMode: 'UPI',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    deviceType: 'laptop',
    staffName: 'Main Cashier',
    customerNotes: 'Please serve cold chaas first with ice.',
  };

  const handleTestPrint = (mode: 'invoice' | 'kot') => {
    document.body.setAttribute('data-print-mode', mode);
    window.print();
    setTimeout(() => {
      document.body.removeAttribute('data-print-mode');
    }, 1000);
  };

  const handleCopySimulatorText = () => {
    const rawText =
      simulatorTab === 'invoice'
        ? generateInvoicePlainText(sampleTestOrder, settings)
        : generateKOTPlainText(sampleTestOrder, settings);

    navigator.clipboard.writeText(rawText).then(() => {
      setCopiedRawText(true);
      setTimeout(() => setCopiedRawText(false), 2000);
    });
  };

  const handleUpdateInventory = (field: string, val: any) => {
    settingsStore.updateSection('inventory', { [field]: val });
    triggerSaveNotification('Inventory settings updated!');
  };

  const handleUpdateKOT = (field: string, val: any) => {
    settingsStore.updateSection('kot', { [field]: val });
    triggerSaveNotification('Kitchen (KOT) settings updated!');
  };

  const handleUpdateTokenStartNumber = (val: number) => {
    setTokenStartInput(val);
    if (!isNaN(val) && val > 0) {
      settingsStore.updateSection('kot', { tokenStartNumber: Math.floor(val) });
      triggerSaveNotification(`Starting token number saved as #${Math.floor(val)}`);
    }
  };

  const handleResetTokenSequence = () => {
    const startNum = Number(tokenStartInput);
    if (isNaN(startNum) || startNum <= 0) {
      alert('Please enter a valid starting token number (greater than 0).');
      return;
    }
    const validatedNum = Math.floor(startNum);
    const newNext = livePuffStore.resetTokenSequence(validatedNum);
    setNextTokenNumber(newNext);
    triggerSaveNotification(`Token sequence reset! Next order will issue Token #${newNext}.`);
  };

  const handleUpdatePOS = (field: string, val: any) => {
    settingsStore.updateSection('pos', { [field]: val });
    triggerSaveNotification('POS configuration updated!');
  };

  const handleUpdatePayments = (field: string, val: any) => {
    settingsStore.updateSection('payments', { [field]: val });
    triggerSaveNotification('Payment method settings updated!');
  };

  // Security Handlers
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');

    const cleanCurrent = currentPasswordInput.trim();
    const cleanNew = newPasswordInput.trim();

    if (!cleanCurrent) {
      setSecurityError('Please enter your current password.');
      return;
    }
    if (!cleanNew) {
      setSecurityError('Please enter a new password.');
      return;
    }
    if (cleanNew.length < 3) {
      setSecurityError('Password must be at least 3 characters.');
      return;
    }
    if (cleanNew !== confirmPasswordInput.trim()) {
      setSecurityError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await securityService.changePassword(cleanCurrent, cleanNew);
      if (res.success && res.newRecoveryKey) {
        setActiveRecoveryKey(res.newRecoveryKey);
        setIsRecoveryModalOpen(true);
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        setSecuritySuccess('Password updated successfully! Please save your new recovery key.');
        triggerSaveNotification('Master Password updated successfully!');
      } else {
        setSecurityError(res.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setSecurityError('Failed to change password. Please check your credentials.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateAutoLock = (mins: number) => {
    setAutoLockMinutes(mins);
    securityService.updateSecurityConfig({ autoLockMinutes: mins });
    triggerSaveNotification(mins === 0 ? 'Inactivity Auto-Lock disabled.' : `Auto-lock set to ${mins} minutes.`);
  };

  const handleTogglePaymentMethod = (method: 'CASH' | 'UPI' | 'CARD' | 'SPLIT') => {
    const updated = {
      ...settings.payments.enabledMethods,
      [method]: !settings.payments.enabledMethods[method],
    };
    settingsStore.updateSection('payments', { enabledMethods: updated });
    triggerSaveNotification(`Payment method ${method} updated!`);
  };

  // --- CATEGORY MANAGEMENT HANDLERS ---
  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (settings.menu.categories.includes(trimmed)) {
      alert('Category already exists.');
      return;
    }
    const updated = [...settings.menu.categories, trimmed];
    settingsStore.updateSection('menu', { categories: updated });
    setNewCategoryName('');
    triggerSaveNotification(`Added category "${trimmed}"`);
  };

  const handleStartEditCategory = (catName: string) => {
    setEditingCategory({ oldName: catName, newName: catName });
  };

  const handleSaveRenameCategory = () => {
    if (!editingCategory) return;
    const { oldName, newName } = editingCategory;
    const trimmedNew = newName.trim();
    if (!trimmedNew) {
      alert('Category name cannot be empty.');
      return;
    }
    if (oldName !== trimmedNew && settings.menu.categories.includes(trimmedNew)) {
      alert('A category with this name already exists.');
      return;
    }

    // Update settings categories list
    const updatedCategories = settings.menu.categories.map((c) => (c === oldName ? trimmedNew : c));
    settingsStore.updateSection('menu', { categories: updatedCategories });

    // Update default POS category if it matched oldName
    if (settings.pos.defaultCategory === oldName) {
      settingsStore.updateSection('pos', { defaultCategory: trimmedNew });
    }

    // Update all menu items in livePuffStore belonging to oldName
    const itemsToUpdate = livePuffStore.getMenuItems().filter((item) => item.category === oldName);
    itemsToUpdate.forEach((item) => {
      livePuffStore.updateMenuItem(item.id, { category: trimmedNew });
    });

    setEditingCategory(null);
    triggerSaveNotification(`Renamed category "${oldName}" to "${trimmedNew}"`);
  };

  const handleRequestDeleteCategory = (catName: string) => {
    if (settings.menu.categories.length <= 1) {
      alert('Cannot delete the last category. At least one category must exist in the store system.');
      return;
    }

    const itemsInCat = livePuffStore.getMenuItems().filter((item) => item.category === catName);
    const remainingCats = settings.menu.categories.filter((c) => c !== catName);
    const defaultTarget = remainingCats[0] || 'General';

    setDeletingCategoryInfo({
      categoryName: catName,
      itemCount: itemsInCat.length,
      targetCategory: defaultTarget,
    });
  };

  const handleConfirmDeleteCategory = (action: 'MOVE' | 'DELETE_ITEMS') => {
    if (!deletingCategoryInfo) return;
    const { categoryName, itemCount, targetCategory } = deletingCategoryInfo;

    const itemsInCat = livePuffStore.getMenuItems().filter((item) => item.category === categoryName);

    if (action === 'MOVE') {
      itemsInCat.forEach((item) => {
        livePuffStore.updateMenuItem(item.id, { category: targetCategory });
      });
    } else {
      itemsInCat.forEach((item) => {
        livePuffStore.deleteMenuItem(item.id);
      });
    }

    // Update settings categories
    const updatedCategories = settings.menu.categories.filter((c) => c !== categoryName);
    settingsStore.updateSection('menu', { categories: updatedCategories });

    // Reset default POS category if needed
    if (settings.pos.defaultCategory === categoryName) {
      settingsStore.updateSection('pos', { defaultCategory: updatedCategories[0] || 'General' });
    }

    setDeletingCategoryInfo(null);
    triggerSaveNotification(
      action === 'MOVE'
        ? `Deleted category "${categoryName}" & reassigned ${itemCount} item(s) to "${targetCategory}"`
        : `Deleted category "${categoryName}" & removed ${itemCount} item(s)`
    );
  };

  // --- MENU ITEM MANAGEMENT HANDLERS ---
  const handleOpenAddItemModal = (presetCategory?: string) => {
    const defaultCat = presetCategory || settings.menu.categories[0] || 'General';
    setEditingItem(null);
    setItemFormData({
      name: '',
      category: defaultCat,
      price: '',
      isAvailable: true,
      recipe: [],
    });
    setSelectedRecipeIngId('');
    setSelectedRecipeQty(1);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItemModal = (item: PuffItem) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name,
      category: item.category || settings.menu.categories[0] || 'General',
      price: item.price,
      isAvailable: item.isAvailable !== false,
      recipe: item.recipe ? [...item.recipe] : [],
    });
    setSelectedRecipeIngId('');
    setSelectedRecipeQty(1);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!itemFormData.name.trim()) {
      alert('Please enter a valid item name.');
      return;
    }
    const numPrice = Number(itemFormData.price);
    if (isNaN(numPrice) || numPrice <= 0) {
      alert('Please enter a valid positive price.');
      return;
    }
    const targetCategory = itemFormData.category.trim();
    if (!targetCategory) {
      alert('Please select or enter a category.');
      return;
    }

    // Auto add category to settings if new
    if (!settings.menu.categories.includes(targetCategory)) {
      const updatedCats = [...settings.menu.categories, targetCategory];
      settingsStore.updateSection('menu', { categories: updatedCats });
    }

    const payload = {
      name: itemFormData.name.trim(),
      category: targetCategory,
      price: numPrice,
      isVeg: true,
      description: '',
      isAvailable: itemFormData.isAvailable,
      image: '',
      recipe: itemFormData.recipe,
    };

    if (editingItem) {
      livePuffStore.updateMenuItem(editingItem.id, payload);
      triggerSaveNotification(`Updated menu item "${payload.name}"`);
    } else {
      livePuffStore.addMenuItem(payload);
      triggerSaveNotification(`Created new menu item "${payload.name}"`);
    }

    setIsItemModalOpen(false);
  };

  const handleMoveItemCategory = (itemId: string, newCategory: string) => {
    if (!newCategory) return;
    livePuffStore.updateMenuItem(itemId, { category: newCategory });
    triggerSaveNotification(`Moved item to "${newCategory}"`);
  };

  const handleToggleItemStock = (item: PuffItem) => {
    livePuffStore.toggleItemAvailability(item.id);
    triggerSaveNotification(`Updated availability for "${item.name}"`);
  };

  const handleDeleteItem = (item: PuffItem) => {
    livePuffStore.deleteMenuItem(item.id);
    triggerSaveNotification(`Deleted menu item "${item.name}"`);
  };

  const handleAddRecipeIngredient = () => {
    if (!selectedRecipeIngId) {
      triggerSaveNotification('Please select an ingredient.');
      return;
    }
    const qty = Number(selectedRecipeQty);
    if (isNaN(qty) || qty <= 0) {
      triggerSaveNotification('Please enter a valid quantity.');
      return;
    }

    const existingIdx = itemFormData.recipe.findIndex((r) => r.ingredientId === selectedRecipeIngId);
    let updatedRecipe = [...itemFormData.recipe];
    if (existingIdx !== -1) {
      updatedRecipe[existingIdx] = { ...updatedRecipe[existingIdx], quantityNeeded: qty };
    } else {
      updatedRecipe.push({ ingredientId: selectedRecipeIngId, quantityNeeded: qty });
    }

    setItemFormData({ ...itemFormData, recipe: updatedRecipe });
    setSelectedRecipeIngId('');
    setSelectedRecipeQty(1);
  };

  const handleRemoveRecipeIngredient = (ingId: string) => {
    const updatedRecipe = itemFormData.recipe.filter((r) => r.ingredientId !== ingId);
    setItemFormData({ ...itemFormData, recipe: updatedRecipe });
  };

  // JSON Backup Export / Import
  const handleDownloadBackup = () => {
    const jsonStr = settingsStore.exportBackupJSON();
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataUri);
    downloadAnchor.setAttribute('download', `TPC_POS_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerSaveNotification('System backup downloaded successfully!');
  };

  const handleRestoreBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = settingsStore.restoreBackupJSON(content);
      if (res.success) {
        triggerSaveNotification('Backup restored successfully!');
      } else {
        alert(res.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-[#f4efe8] rounded-3xl border border-[#a19284]/30 shadow-xl p-4 sm:p-6 text-[#2e211d] space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#a19284]/30 pb-4">
        <div>
          <h2 className="text-xl font-['Playfair_Display'] font-black text-[#2e211d] flex items-center gap-2">
            <span>Commercial POS Settings & Control Center</span>
            <span className="text-[10px] bg-[#8c3a27] text-[#f4efe8] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-['Cinzel']">
              ENTERPRISE
            </span>
          </h2>
          <p className="text-xs text-[#a19284] mt-0.5">
            Configure store profile, billing rules, inventory alerts, kitchen routing, and payment gateways.
          </p>
        </div>
      </div>

      {/* Save Notification Toast */}
      {saveBanner.show && (
        <div className="bg-[#8c3a27] text-[#f4efe8] p-3.5 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#e2d7c9]" />
            <span>{saveBanner.message}</span>
          </div>
          <span className="text-[10px] opacity-80 uppercase font-bold tracking-wider">Saved</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-[#a19284]/20">
        {[
          { id: 'store', label: 'Store Profile', icon: Store },
          { id: 'security', label: 'Security & Access', icon: Lock },
          { id: 'billing', label: 'Billing & Invoice', icon: Receipt },
          { id: 'printing', label: 'Thermal Printing', icon: Printer },
          { id: 'inventory', label: 'Inventory & Audit', icon: Package },
          { id: 'menu', label: 'Menu & Categories', icon: Utensils },
          { id: 'kot', label: 'Kitchen KOT', icon: ChefHat },
          { id: 'pos', label: 'POS & Display', icon: Sliders },
          { id: 'payments', label: 'Payments', icon: CreditCard },
          { id: 'backup', label: 'Backup & PWA', icon: Cloud },
          { id: 'analytics', label: 'Analytics Config', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-[#8c3a27] text-[#f4efe8] shadow-md scale-102 font-extrabold'
                  : 'bg-white text-[#2e211d] hover:bg-[#e2d7c9] border border-[#a19284]/30'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: STORE PROFILE */}
      {activeTab === 'store' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* STORE LOGO & RECEIPT BRANDING CARD */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#a19284]/20 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#8c3a27]" />
                <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">
                  Store Logo & Receipt Branding
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#8c3a27] bg-[#f4efe8] px-2.5 py-1 rounded-lg border border-[#a19284]/30 self-start sm:self-auto">
                Permanent Storage Active
              </span>
            </div>

            <p className="text-xs text-[#a19284] leading-relaxed">
              Upload your official store logo (PNG format with transparent background recommended). Once uploaded, the logo is permanently saved in browser storage across sessions and automatically prints on customer receipts when enabled.
            </p>

            <input
              type="file"
              ref={logoFileInputRef}
              onChange={handleLogoFileUpload}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
            />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
              {/* Logo Preview Box */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-[#a19284]/40 bg-[#f4efe8]/40 min-h-[160px] relative group overflow-hidden">
                {settings.storeProfile.storeLogoUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-white rounded-2xl border border-[#a19284]/30 shadow-sm flex items-center justify-center min-w-[140px] max-w-[220px] max-h-[120px] overflow-hidden bg-[radial-gradient(#a19284_1.2px,transparent_1.2px)] [background-size:8px_8px]">
                      <img
                        src={settings.storeProfile.storeLogoUrl}
                        alt="Store Logo Preview"
                        className="max-h-[90px] max-w-full object-contain drop-shadow-sm"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#2e211d] bg-[#e2d7c9] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      PNG Transparent Active
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center gap-2 p-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#e2d7c9] text-[#8c3a27] flex items-center justify-center shadow-inner">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#2e211d]">No Store Logo Uploaded</p>
                      <p className="text-[10px] text-[#a19284] max-w-[200px] mt-0.5">
                        Placeholder icon will be shown on app headers and receipts will print text only.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Controls & Options */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all ${
                      settings.storeProfile.storeLogoUrl
                        ? 'bg-[#2e211d] text-[#f4efe8] hover:bg-[#1b1311]'
                        : 'bg-[#8c3a27] text-[#f4efe8] hover:bg-[#722f1f]'
                    }`}
                  >
                    {settings.storeProfile.storeLogoUrl ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Replace Logo</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload Store Logo (PNG)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLogoPreviewModalOpen(true)}
                    disabled={!settings.storeProfile.storeLogoUrl}
                    className="px-4 py-2.5 bg-white border border-[#a19284]/40 text-[#2e211d] hover:bg-[#e2d7c9] rounded-xl font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  >
                    <Eye className="w-4 h-4 text-[#8c3a27]" />
                    <span>Preview Logo</span>
                  </button>

                  {settings.storeProfile.storeLogoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveStoreLogo}
                      className="px-3.5 py-2.5 bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove Logo</span>
                    </button>
                  )}
                </div>

                <div className="bg-[#f4efe8]/60 p-3 rounded-2xl border border-[#a19284]/20 space-y-1.5 text-[11px] text-[#2e211d]">
                  <div className="flex items-center gap-1.5 font-bold text-[#8c3a27]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Branding & Local Storage Features</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[#2e211d]/80 pl-1">
                    <li>Recommended: <strong>PNG transparent background</strong></li>
                    <li>Saved permanently in local storage across browser reloads and app restarts</li>
                    <li>Printed on receipts when "Print Store Logo on Receipt" is enabled</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#a19284]/20 pb-3">
              <Store className="w-5 h-5 text-[#8c3a27]" />
              <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">Business Identity & Location</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Store Legal Name</label>
                <input
                  type="text"
                  value={settings.storeProfile.storeName}
                  onChange={(e) => handleUpdateStoreProfile('storeName', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Store Slogan / Tagline</label>
                <input
                  type="text"
                  value={settings.storeProfile.storeTagline}
                  onChange={(e) => handleUpdateStoreProfile('storeTagline', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-[#a19284] block mb-1">Physical Outlet Address (Printed on Receipts)</label>
                <textarea
                  rows={2}
                  value={settings.storeProfile.address}
                  onChange={(e) => handleUpdateStoreProfile('address', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  value={settings.storeProfile.contactNumber}
                  onChange={(e) => handleUpdateStoreProfile('contactNumber', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Official Support Email</label>
                <input
                  type="email"
                  value={settings.storeProfile.email}
                  onChange={(e) => handleUpdateStoreProfile('email', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#a19284]/20 pb-3">
              <FileText className="w-5 h-5 text-[#8c3a27]" />
              <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">Taxation & License Compliance</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">GSTIN Tax Registration Number</label>
                <input
                  type="text"
                  value={settings.storeProfile.gstNumber}
                  onChange={(e) => handleUpdateStoreProfile('gstNumber', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">FSSAI Food Safety License Number</label>
                <input
                  type="text"
                  value={settings.storeProfile.fssaiNumber}
                  onChange={(e) => handleUpdateStoreProfile('fssaiNumber', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={settings.storeProfile.currencySymbol}
                  onChange={(e) => handleUpdateStoreProfile('currencySymbol', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={settings.storeProfile.businessHours}
                  onChange={(e) => handleUpdateStoreProfile('businessHours', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SECURITY & ACCESS */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* SECTION 1: MASTER PASSWORD CHANGE */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#a19284]/20 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#8c3a27]" />
                <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">
                  POS Master Password & Access Lock
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SHA-256 Encrypted</span>
              </span>
            </div>

            <p className="text-xs text-[#a19284] leading-relaxed">
              Set or update your master password to prevent unauthorized staff or visitors from opening billing, reports, settings, or inventory. Your password is securely encrypted with cryptographic salting and permanently saved across all future sessions.
            </p>

            {securityError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{securityError}</span>
              </div>
            )}

            {securitySuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{securitySuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#2e211d] block mb-1">
                    Current Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full pl-3.5 pr-9 py-2.5 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a19284] hover:text-[#2e211d]"
                      tabIndex={-1}
                    >
                      {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#2e211d] block mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Min. 3 characters"
                      className="w-full pl-3.5 pr-9 py-2.5 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a19284] hover:text-[#2e211d]"
                      tabIndex={-1}
                    >
                      {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#2e211d] block mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-[11px] text-[#a19284]">
                  Last password update: <strong>{securityService.getLastPasswordChangeDate()}</strong>
                </span>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2.5 bg-[#8c3a27] hover:bg-[#722f1f] active:scale-[0.99] text-[#f4efe8] rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isChangingPassword ? 'Updating Password...' : 'Save New Password'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 2: EMERGENCY RECOVERY KEY SYSTEM */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#a19284]/20 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-[#8c3a27]" />
                <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">
                  Emergency Recovery Key
                </h3>
              </div>
              <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 self-start sm:self-auto">
                Owner Emergency Key
              </span>
            </div>

            <p className="text-xs text-[#a19284] leading-relaxed">
              If you ever forget the master POS password, you can immediately reset it using this secret Recovery Key directly from the login screen. Every time your password is changed, a new Recovery Key is generated and the old one is permanently deactivated.
            </p>

            <div className="p-4 bg-[#f4efe8]/70 rounded-2xl border border-[#a19284]/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#a19284] tracking-wider block">
                    Active Recovery Key
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="font-mono font-black text-sm sm:text-base text-[#8c3a27] bg-white px-3 py-1.5 rounded-xl border border-[#a19284]/30 select-all">
                      {isRecoveryKeyRevealed ? activeRecoveryKey : 'TPC-••••-••••-••••'}
                    </code>
                    <button
                      type="button"
                      onClick={() => setIsRecoveryKeyRevealed(!isRecoveryKeyRevealed)}
                      className="p-2 rounded-xl bg-white border border-[#a19284]/30 text-[#a19284] hover:text-[#2e211d] transition-colors cursor-pointer"
                      title={isRecoveryKeyRevealed ? "Hide Recovery Key" : "Reveal Recovery Key"}
                    >
                      {isRecoveryKeyRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeRecoveryKey);
                      triggerSaveNotification('Recovery key copied to clipboard!');
                    }}
                    className="px-3.5 py-2 bg-[#2e211d] text-[#f4efe8] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#1b1311] transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Key</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRecoveryModalOpen(true)}
                    className="px-3.5 py-2 bg-[#e2d7c9] text-[#2e211d] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#d6c9b8] border border-[#a19284]/40 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#8c3a27]" />
                    <span>View & Download</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: AUTO-LOCK & PROTECTION POLICIES */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
            <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d] border-b border-[#a19284]/20 pb-2">
              Terminal Protection & Auto-Lock Preferences
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="text-xs font-bold text-[#2e211d] block mb-1">
                  Inactivity Auto-Lock Timer
                </label>
                <p className="text-[10px] text-[#a19284] mb-2">
                  Automatically lock the POS terminal if no touch or clicks occur for a period of time
                </p>
                <select
                  value={autoLockMinutes}
                  onChange={(e) => handleUpdateAutoLock(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                >
                  <option value={0}>Disabled (Only lock on manual action or app launch)</option>
                  <option value={5}>5 Minutes of Inactivity</option>
                  <option value={15}>15 Minutes of Inactivity</option>
                  <option value={30}>30 Minutes of Inactivity</option>
                  <option value={60}>60 Minutes of Inactivity</option>
                </select>
              </div>

              <div className="flex flex-col justify-end space-y-2">
                <label className="text-xs font-bold text-[#2e211d] block">
                  Quick Lock Terminal
                </label>
                <button
                  type="button"
                  onClick={() => securityService.logout()}
                  className="w-full py-2.5 px-4 bg-[#2e211d] hover:bg-[#1b1311] text-[#f4efe8] rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-[#e2d7c9]" />
                  <span>Lock Terminal Now</span>
                </button>
              </div>
            </div>

            {/* Business Data Safety Guarantee Note */}
            <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Data Isolation Guarantee:</span>
              </div>
              <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                Password changes, session locks, and recovery resets are strictly access safeguards. They do NOT modify or erase any orders, customer profiles, inventory stocks, recipes, reports, or cloud synchronization records.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BILLING & INVOICE */}
      {activeTab === 'billing' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#a19284]/20 pb-3">
              <Receipt className="w-5 h-5 text-[#8c3a27]" />
              <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">Invoice & Tax Calculation Rules</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={settings.billing.invoicePrefix}
                  onChange={(e) => handleUpdateBilling('invoicePrefix', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Next Sequential Invoice Number</label>
                <input
                  type="number"
                  value={settings.billing.nextInvoiceNumber}
                  onChange={(e) => handleUpdateBilling('nextInvoiceNumber', Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">GST Tax Rate (%)</label>
                <input
                  type="number"
                  value={settings.billing.gstRatePercent}
                  onChange={(e) => handleUpdateBilling('gstRatePercent', Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Bill Total Round-off Rule</label>
                <select
                  value={settings.billing.roundOffRule}
                  onChange={(e) => handleUpdateBilling('roundOffRule', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
                >
                  <option value="NONE">Exact Decimal Value (No Round-off)</option>
                  <option value="NEAREST">Round to Nearest Whole Rupee (e.g. ₹104.40 → ₹104)</option>
                  <option value="ROUND_UP">Always Round Up to Next Rupee (e.g. ₹104.10 → ₹105)</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
                <div>
                  <span className="text-xs font-bold text-[#2e211d] block">CGST + SGST Split Breakdown</span>
                  <span className="text-[11px] text-[#a19284]">Print CGST ({settings.billing.gstRatePercent / 2}%) and SGST ({settings.billing.gstRatePercent / 2}%) lines on bill receipts.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.billing.enableSplitTax}
                  onChange={(e) => handleUpdateBilling('enableSplitTax', e.target.checked)}
                  className="w-5 h-5 accent-[#8c3a27]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#a19284]/20 pb-3">
              <Receipt className="w-5 h-5 text-[#8c3a27]" />
              <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">Receipt Print Layout</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Receipt Footer Note</label>
                <input
                  type="text"
                  value={settings.billing.receiptFooterText}
                  onChange={(e) => handleUpdateBilling('receiptFooterText', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
                  <span className="text-xs font-bold text-[#2e211d]">Print Store Logo on Receipt</span>
                  <input
                    type="checkbox"
                    checked={settings.billing.printLogoOnReceipt}
                    onChange={(e) => handleUpdateBilling('printLogoOnReceipt', e.target.checked)}
                    className="w-5 h-5 accent-[#8c3a27]"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
                  <span className="text-xs font-bold text-[#2e211d]">Print UPI QR Code on Bill</span>
                  <input
                    type="checkbox"
                    checked={settings.billing.printUpiQrOnReceipt}
                    onChange={(e) => handleUpdateBilling('printUpiQrOnReceipt', e.target.checked)}
                    className="w-5 h-5 accent-[#8c3a27]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: THERMAL PRINTING & KOT */}
      {activeTab === 'printing' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Banner */}
          <div className="bg-[#2e211d] text-[#f4efe8] p-5 rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#e2d7c9]" />
                <h3 className="font-['Playfair_Display'] font-black text-lg text-[#f4efe8]">
                  Thermal Printer & Kitchen KOT Engine
                </h3>
              </div>
              <p className="text-xs text-[#a19284] max-w-2xl leading-relaxed">
                Configure 58mm (2-inch) mini Bluetooth thermal printers and 80mm (3-inch) POS desktop printers. Text wrapping, ESC/POS alignment, and font sizes are mathematically calibrated to eliminate horizontal cutoff.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleTestPrint('invoice')}
                className="px-3.5 py-2 bg-[#8c3a27] hover:bg-[#732f1f] text-[#f4efe8] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Test Print Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => handleTestPrint('kot')}
                className="px-3.5 py-2 bg-[#e2d7c9] hover:bg-[#d6c6b3] text-[#2e211d] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <ChefHat className="w-3.5 h-3.5 text-[#8c3a27]" />
                <span>Test Print KOT</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Settings Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. Paper Width & Dimension */}
              <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#a19284]/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#8c3a27]" />
                    <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">
                      1. Paper Roll Width & Format
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-[#8c3a27] bg-[#f4efe8] px-2.5 py-0.5 rounded-lg border border-[#a19284]/30">
                    Active: {settings.printing?.paperWidth || '58mm'}
                  </span>
                </div>

                <p className="text-xs text-[#a19284]">
                  Select the physical thermal paper roll width installed in your printer.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* 58mm Option */}
                  <label
                    onClick={() => handleUpdatePrinting('paperWidth', '58mm')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      (settings.printing?.paperWidth || '58mm') === '58mm'
                        ? 'border-[#8c3a27] bg-[#8c3a27]/5 shadow-sm'
                        : 'border-[#a19284]/30 bg-[#f4efe8]/30 hover:border-[#8c3a27]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-[#8c3a27]" />
                        <span className="font-bold text-sm text-[#2e211d]">58mm (2-Inch)</span>
                      </div>
                      <input
                        type="radio"
                        name="paperWidth"
                        checked={(settings.printing?.paperWidth || '58mm') === '58mm'}
                        onChange={() => handleUpdatePrinting('paperWidth', '58mm')}
                        className="accent-[#8c3a27] w-4 h-4"
                      />
                    </div>
                    <p className="text-[11px] text-[#a19284] leading-relaxed">
                      Recommended for portable Bluetooth mini receipt printers, battery printers, and compact billing counters (32 chars/line).
                    </p>
                    <div className="flex items-center gap-1.5 pt-1 text-[10px] font-bold text-[#8c3a27]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Zero-Margin Cutoff Protection</span>
                    </div>
                  </label>

                  {/* 80mm Option */}
                  <label
                    onClick={() => handleUpdatePrinting('paperWidth', '80mm')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      settings.printing?.paperWidth === '80mm'
                        ? 'border-[#8c3a27] bg-[#8c3a27]/5 shadow-sm'
                        : 'border-[#a19284]/30 bg-[#f4efe8]/30 hover:border-[#8c3a27]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#8c3a27]" />
                        <span className="font-bold text-sm text-[#2e211d]">80mm (3-Inch)</span>
                      </div>
                      <input
                        type="radio"
                        name="paperWidth"
                        checked={settings.printing?.paperWidth === '80mm'}
                        onChange={() => handleUpdatePrinting('paperWidth', '80mm')}
                        className="accent-[#8c3a27] w-4 h-4"
                      />
                    </div>
                    <p className="text-[11px] text-[#a19284] leading-relaxed">
                      Recommended for heavy-duty desktop USB/LAN POS printers, commercial billing desks, and high-speed kitchen printers (48 chars/line).
                    </p>
                    <div className="flex items-center gap-1.5 pt-1 text-[10px] font-bold text-[#2e211d]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#8c3a27]" />
                      <span>High Density Layout</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. Automated Printing Rules */}
              <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-[#a19284]/20 pb-3">
                  <Sparkles className="w-5 h-5 text-[#8c3a27]" />
                  <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">
                    2. Automated Print Triggers
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
                    <div className="pr-2">
                      <span className="text-xs font-bold text-[#2e211d] block">Auto-Print Invoice</span>
                      <span className="text-[10px] text-[#a19284] block mt-0.5">
                        Instantly pop up receipt print dialog upon completing checkout
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.printing?.autoPrintInvoice ?? false}
                      onChange={(e) => handleUpdatePrinting('autoPrintInvoice', e.target.checked)}
                      className="w-5 h-5 accent-[#8c3a27] shrink-0"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
                    <div className="pr-2">
                      <span className="text-xs font-bold text-[#2e211d] block">Auto-Print Kitchen KOT</span>
                      <span className="text-[10px] text-[#a19284] block mt-0.5">
                        Immediately route kitchen order ticket to thermal printer
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.printing?.autoPrintKOT ?? false}
                      onChange={(e) => handleUpdatePrinting('autoPrintKOT', e.target.checked)}
                      className="w-5 h-5 accent-[#8c3a27] shrink-0"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Invoice Ticket Details & Visibility */}
              <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-[#a19284]/20 pb-3">
                  <Receipt className="w-5 h-5 text-[#8c3a27]" />
                  <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">
                    3. Invoice Print Layout & Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
                    <div className="pr-2">
                      <span className="text-xs font-bold text-[#2e211d] block">Print Customer Details</span>
                      <span className="text-[10px] text-[#a19284] block mt-0.5">
                        Include customer name & mobile number on invoice
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.printing?.printCustomerDetails ?? true}
                      onChange={(e) => handleUpdatePrinting('printCustomerDetails', e.target.checked)}
                      className="w-5 h-5 accent-[#8c3a27] shrink-0"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
                    <div className="pr-2">
                      <span className="text-xs font-bold text-[#2e211d] block">Print Customer Notes</span>
                      <span className="text-[10px] text-[#a19284] block mt-0.5">
                        Include special delivery or table instructions on bill
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.printing?.printCustomerNotes ?? true}
                      onChange={(e) => handleUpdatePrinting('printCustomerNotes', e.target.checked)}
                      className="w-5 h-5 accent-[#8c3a27] shrink-0"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
                    <div className="pr-2">
                      <span className="text-xs font-bold text-[#2e211d] block">Print Store Logo on Bill</span>
                      <span className="text-[10px] text-[#a19284] block mt-0.5">
                        Render store branding logo at the top of receipt
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.billing?.printLogoOnReceipt ?? true}
                      onChange={(e) => handleUpdateBilling('printLogoOnReceipt', e.target.checked)}
                      className="w-5 h-5 accent-[#8c3a27] shrink-0"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
                    <div className="pr-2">
                      <span className="text-xs font-bold text-[#2e211d] block">Print UPI QR Code on Bill</span>
                      <span className="text-[10px] text-[#a19284] block mt-0.5">
                        Render dynamic or static UPI QR code on printed receipt
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.billing?.printUpiQrOnReceipt ?? true}
                      onChange={(e) => handleUpdateBilling('printUpiQrOnReceipt', e.target.checked)}
                      className="w-5 h-5 accent-[#8c3a27] shrink-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#a19284] block mb-1">Receipt Footer Note</label>
                  <input
                    type="text"
                    value={settings.billing?.receiptFooterText || ''}
                    onChange={(e) => handleUpdateBilling('receiptFooterText', e.target.value)}
                    placeholder="e.g. Thank you for dining with us! Visit again."
                    className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                  />
                </div>
              </div>

              {/* 4. Kitchen Order Ticket (KOT) Rules */}
              <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#a19284]/20 pb-3">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-[#8c3a27]" />
                    <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">
                      4. Kitchen Order Ticket (KOT) Rules
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    Simple & Clean KOT
                  </span>
                </div>

                {/* KOT Strict Minimal Standards Notice */}
                <div className="p-3.5 bg-[#f4efe8] rounded-2xl border border-[#a19284]/30 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#2e211d]">
                    <ShieldCheck className="w-4 h-4 text-[#8c3a27]" />
                    <span>Simple KOT Operational Layout:</span>
                  </div>
                  <ul className="text-[11px] text-[#2e211d]/80 space-y-1 list-disc pl-5">
                    <li><strong className="text-[#8c3a27]">Essential Info:</strong> Clean &quot;K.O.T&quot; heading, Token #, Order Type, Table #, Date & Time, and [Qty x] Item names.</li>
                    <li><strong className="text-emerald-700">Clutter-Free:</strong> Store branding, customer PII, staff/device IDs, checkbox columns, slogan footers, and all pricing are eliminated so kitchen staff reads tickets instantly.</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
                    <div className="pr-2">
                      <span className="text-xs font-bold text-[#2e211d] block">Print Item Preparation Notes</span>
                      <span className="text-[10px] text-[#a19284] block mt-0.5">
                        Show item customization notes (e.g. &quot;Less spicy&quot;) on KOT
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.printing?.printItemNotesOnKOT ?? true}
                      onChange={(e) => handleUpdatePrinting('printItemNotesOnKOT', e.target.checked)}
                      className="w-5 h-5 accent-[#8c3a27] shrink-0"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
                    <div className="pr-2">
                      <span className="text-xs font-bold text-[#2e211d] block">Print Special Order Notes</span>
                      <span className="text-[10px] text-[#a19284] block mt-0.5">
                        Show customer special order instructions on KOT
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.printing?.printCustomerNotes ?? true}
                      onChange={(e) => handleUpdatePrinting('printCustomerNotes', e.target.checked)}
                      className="w-5 h-5 accent-[#8c3a27] shrink-0"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Thermal Physical Feed & Font Tuning */}
              <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-[#a19284]/20 pb-3">
                  <Sliders className="w-5 h-5 text-[#8c3a27]" />
                  <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">
                    5. Physical Paper Feed & Tear-Off Tuning
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#a19284] block mb-1">
                      Thermal Text Density / Font Size
                    </label>
                    <select
                      value={settings.printing?.fontSize || 'STANDARD'}
                      onChange={(e) => handleUpdatePrinting('fontSize', e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                    >
                      <option value="COMPACT">Compact (Maximum text fitting)</option>
                      <option value="STANDARD">Standard (Recommended balance)</option>
                      <option value="LARGE">Large (High legibility for distance)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#a19284] block mb-1">
                      Tear-Off Blank Feed Lines (After Ticket)
                    </label>
                    <select
                      value={settings.printing?.feedLines ?? 2}
                      onChange={(e) => handleUpdatePrinting('feedLines', Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                    >
                      <option value={0}>0 lines (Immediate stop)</option>
                      <option value={1}>1 line</option>
                      <option value={2}>2 lines (Standard tear-off gap)</option>
                      <option value={3}>3 lines (Generous tear-off margin)</option>
                      <option value={4}>4 lines</option>
                      <option value={5}>5 lines</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Thermal Simulator & Bluetooth Guide (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Simulator Card */}
              <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4 sticky top-6">
                <div className="flex items-center justify-between border-b border-[#a19284]/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[#8c3a27]" />
                    <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">
                      Live Thermal Roll Preview
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#2e211d] bg-[#e2d7c9] px-2 py-0.5 rounded-full">
                    {settings.printing?.paperWidth || '58mm'} Roll
                  </span>
                </div>

                {/* Simulator Tab Buttons */}
                <div className="flex items-center gap-1.5 p-1 bg-[#f4efe8] rounded-xl border border-[#a19284]/30">
                  <button
                    type="button"
                    onClick={() => setSimulatorTab('invoice')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      simulatorTab === 'invoice'
                        ? 'bg-[#8c3a27] text-[#f4efe8] shadow-sm'
                        : 'text-[#2e211d] hover:bg-[#e2d7c9]'
                    }`}
                  >
                    Customer Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatorTab('kot')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      simulatorTab === 'kot'
                        ? 'bg-[#8c3a27] text-[#f4efe8] shadow-sm'
                        : 'text-[#2e211d] hover:bg-[#e2d7c9]'
                    }`}
                  >
                    Kitchen KOT
                  </button>
                </div>

                {/* Simulated Paper Roll Display */}
                <div className="flex justify-center bg-[#2e211d]/5 p-4 rounded-2xl border-2 border-dashed border-[#a19284]/40 max-h-[500px] overflow-y-auto">
                  {simulatorTab === 'invoice' ? (
                    <ThermalInvoiceTicket
                      order={sampleTestOrder}
                      settings={settings}
                      paperWidth={settings.printing?.paperWidth || '58mm'}
                    />
                  ) : (
                    <ThermalKOTTicket
                      order={sampleTestOrder}
                      settings={settings}
                      paperWidth={settings.printing?.paperWidth || '58mm'}
                    />
                  )}
                </div>

                {/* Simulator Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleTestPrint(simulatorTab)}
                    className="w-full py-2.5 bg-[#8c3a27] hover:bg-[#732f1f] text-[#f4efe8] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print This Sample</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySimulatorText}
                    className="w-full py-2.5 bg-[#e2d7c9] hover:bg-[#d6c6b3] text-[#2e211d] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    {copiedRawText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-emerald-800">Copied Text!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy ESC/POS</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Bluetooth Thermal Printer Hardware Guide */}
                <div className="p-4 bg-[#f4efe8] rounded-2xl border border-[#a19284]/30 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2e211d]">
                    <Bluetooth className="w-4 h-4 text-[#8c3a27]" />
                    <span>Bluetooth Printer Setup Instructions:</span>
                  </div>
                  <ol className="text-[11px] text-[#2e211d]/80 space-y-1.5 list-decimal pl-4 leading-relaxed">
                    <li>
                      <strong>Android Devices:</strong> Pair your Bluetooth printer via Android Settings. Download the free <em>RawBT</em> or <em>ESC POS Print Service</em> app to enable system-wide instant printing.
                    </li>
                    <li>
                      <strong>Windows / Mac:</strong> Pair via Bluetooth or plug USB cable. In Windows Printer Properties, select paper size <strong>58mm x Continuous</strong> or <strong>80mm x Continuous</strong> and set margins to 0.
                    </li>
                    <li>
                      <strong>Browser Print Setting:</strong> In the browser print dialog, uncheck &quot;Headers and Footers&quot; and set Margins to <strong>None / Minimum</strong> for clean roll printing.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY & AUDIT */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#a19284]/20 pb-3">
              <Package className="w-5 h-5 text-[#8c3a27]" />
              <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">Automated Stock Control</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Global Low Stock Alert Threshold</label>
                <input
                  type="number"
                  value={settings.inventory.lowStockAlertThreshold}
                  onChange={(e) => handleUpdateInventory('lowStockAlertThreshold', Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
                <span className="text-[10px] text-[#a19284] mt-1 block">Highlight ingredients falling below this stock level</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
                  <div>
                    <span className="text-xs font-bold text-[#2e211d] block">Auto Stock Deduction</span>
                    <span className="text-[10px] text-[#a19284]">Deduct ingredients from inventory automatically upon order sale</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.inventory.autoDeductOnSale}
                    onChange={(e) => handleUpdateInventory('autoDeductOnSale', e.target.checked)}
                    className="w-5 h-5 accent-[#8c3a27]"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
                  <div>
                    <span className="text-xs font-bold text-[#2e211d] block">Enable Inventory Audit Log</span>
                    <span className="text-[10px] text-[#a19284]">Track every stock deduction, refill, and manual adjustment</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.inventory.enableAuditTracking}
                    onChange={(e) => handleUpdateInventory('enableAuditTracking', e.target.checked)}
                    className="w-5 h-5 accent-[#8c3a27]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Audit Trail Viewer */}
          <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#a19284]/20 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#8c3a27]" />
                <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">Inventory Audit Trail History</h3>
              </div>
              <span className="text-xs font-bold bg-[#8c3a27]/10 text-[#8c3a27] px-2.5 py-1 rounded-full">
                {auditLogs.length} Records
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-[#a19284] text-center py-6">No inventory audit logs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f4efe8] text-[#8c3a27] font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5 rounded-l-xl">Timestamp</th>
                      <th className="p-2.5">Ingredient</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5 text-right">Change</th>
                      <th className="p-2.5 text-right">Result Stock</th>
                      <th className="p-2.5 rounded-r-xl">Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#a19284]/10 font-medium">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#f4efe8]/50">
                        <td className="p-2.5 text-[#a19284] font-mono text-[11px]">{log.timestamp}</td>
                        <td className="p-2.5 font-bold text-[#2e211d]">{log.ingredientName}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            log.changeType === 'REFILL' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {log.changeType}
                          </span>
                        </td>
                        <td className={`p-2.5 text-right font-bold ${log.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {log.amount >= 0 ? `+${log.amount}` : log.amount}
                        </td>
                        <td className="p-2.5 text-right font-bold text-[#2e211d]">{log.resultingStock}</td>
                        <td className="p-2.5 text-[#a19284]">{log.adjustedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MENU & CATEGORIES */}
      {activeTab === 'menu' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Banner & Quick Add Actions */}
          <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#a19284]/20 pb-4">
              <div>
                <h3 className="font-['Playfair_Display'] font-black text-lg text-[#2e211d] flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-[#8c3a27]" />
                  <span>Menu Architecture & Category Master</span>
                </h3>
                <p className="text-xs text-[#a19284] mt-0.5">
                  Organize categories, create/edit menu offerings, update pricing, reassign categories, and link ingredients for automatic stock deduction.
                </p>
              </div>

              <button
                onClick={() => handleOpenAddItemModal()}
                className="px-5 py-2.5 bg-[#8c3a27] hover:bg-[#722e1f] text-[#f4efe8] font-bold text-xs rounded-2xl shadow-md flex items-center gap-2 self-start sm:self-center transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Menu Item</span>
              </button>
            </div>

            {/* Quick Add Category Bar */}
            <div className="bg-[#f4efe8]/50 p-3.5 rounded-2xl border border-[#a19284]/20 space-y-2">
              <label className="text-xs font-bold text-[#a19284] block">Create New Category</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter category name (e.g. Special Drinks, Dessert Puffs)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-[#8c3a27] text-[#f4efe8] font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grouped Categories and Items Display */}
          {(() => {
            const allItemCats = Array.from(new Set(menuItems.map((i) => i.category || 'General')));
            const extraCats = allItemCats.filter((c) => !settings.menu.categories.includes(c));
            const displayCats = Array.from(new Set([...settings.menu.categories, ...extraCats]));

            return (
              <div className="space-y-6">
                {displayCats.map((cat) => {
                  const categoryItems = menuItems.filter((i) => i.category === cat);

                  return (
                    <div key={cat} className="bg-white rounded-3xl border border-[#a19284]/30 shadow-sm overflow-hidden">
                      {/* Category Header Bar */}
                      <div className="bg-[#f4efe8]/80 p-4 border-b border-[#a19284]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <FolderPlus className="w-5 h-5 text-[#8c3a27]" />
                          <div>
                            <h4 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">
                              {cat}
                            </h4>
                            <span className="text-[10px] font-bold text-[#8c3a27] uppercase tracking-wider font-['Cinzel']">
                              {categoryItems.length} {categoryItems.length === 1 ? 'Item' : 'Items'} Listed
                            </span>
                          </div>
                        </div>

                        {/* Category Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenAddItemModal(cat)}
                            className="px-3 py-1.5 bg-[#8c3a27] text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs hover:bg-[#722e1f]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Item</span>
                          </button>

                          <button
                            onClick={() => handleStartEditCategory(cat)}
                            className="p-1.5 bg-white hover:bg-amber-100 text-amber-800 rounded-xl border border-[#a19284]/30 transition-all"
                            title="Rename Category"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleRequestDeleteCategory(cat)}
                            className="p-1.5 bg-white hover:bg-red-100 text-red-700 rounded-xl border border-[#a19284]/30 transition-all"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Items Grid inside Category */}
                      <div className="p-4 sm:p-5">
                        {categoryItems.length === 0 ? (
                          <div className="text-center py-6 border-2 border-dashed border-[#a19284]/20 rounded-2xl">
                            <p className="text-xs text-[#a19284] font-medium mb-2">No menu items currently listed in this category.</p>
                            <button
                              onClick={() => handleOpenAddItemModal(cat)}
                              className="px-3.5 py-1.5 bg-[#8c3a27]/10 text-[#8c3a27] font-bold text-xs rounded-xl hover:bg-[#8c3a27]/20 transition-all inline-flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Create First Item</span>
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categoryItems.map((item) => (
                              <div
                                key={item.id}
                                className={`bg-[#f4efe8]/40 rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3 ${
                                  item.isAvailable ? 'border-[#a19284]/30 hover:border-[#8c3a27]/50' : 'border-red-300/60 bg-red-50/30 opacity-75'
                                }`}
                              >
                                {/* Top Item Row */}
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <h5 className="font-bold text-sm text-[#2e211d] truncate" title={item.name}>
                                        {item.name}
                                      </h5>
                                      <span className="text-[10px] text-[#a19284] font-bold uppercase tracking-wider block">
                                        {item.category}
                                      </span>
                                    </div>

                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                      <span className="font-bold text-sm text-[#8c3a27]">
                                        ₹{item.price}
                                      </span>
                                      <button
                                        onClick={() => handleToggleItemStock(item)}
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${
                                          item.isAvailable ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                        }`}
                                        title="Click to toggle stock status"
                                      >
                                        {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Recipe indicator */}
                                  <div className="text-[10px] font-bold text-[#2e211d] bg-white px-2.5 py-1 rounded-lg border border-[#a19284]/20 flex items-center justify-between mt-2">
                                    <span className="text-[#a19284]">Recipe Deductions:</span>
                                    <span>{item.recipe && item.recipe.length > 0 ? `${item.recipe.length} Ingredients Linked` : 'None'}</span>
                                  </div>
                                </div>

                                {/* Bottom Item Action Controls */}
                                <div className="pt-2 border-t border-[#a19284]/20 flex items-center justify-between gap-2">
                                  {/* Quick Move Category Dropdown */}
                                  <div className="flex-1">
                                    <select
                                      value={item.category}
                                      onChange={(e) => handleMoveItemCategory(item.id, e.target.value)}
                                      className="w-full px-2 py-1 bg-white border border-[#a19284]/30 rounded-lg text-[11px] font-bold text-[#2e211d] focus:outline-none"
                                      title="Move Item to another Category"
                                    >
                                      {displayCats.map((c) => (
                                        <option key={c} value={c}>
                                          Move to: {c}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Edit & Delete Buttons */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleOpenEditItemModal(item)}
                                      className="p-1.5 bg-white hover:bg-amber-100 text-amber-800 rounded-lg border border-[#a19284]/30 transition-all"
                                      title="Edit Menu Item"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => handleDeleteItem(item)}
                                      className="p-1.5 bg-white hover:bg-red-100 text-red-700 rounded-lg border border-[#a19284]/30 transition-all"
                                      title="Delete Item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 5: KITCHEN (KOT) */}
      {activeTab === 'kot' && (
        <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 border-b border-[#a19284]/20 pb-3">
            <ChefHat className="w-5 h-5 text-[#8c3a27]" />
            <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">Kitchen Display System Configuration</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
              <div>
                <span className="text-xs font-bold text-[#2e211d] block">Auto Send Order to KOT</span>
                <span className="text-[10px] text-[#a19284]">Route new POS orders to kitchen screen automatically</span>
              </div>
              <input
                type="checkbox"
                checked={settings.kot.autoSendKOT}
                onChange={(e) => handleUpdateKOT('autoSendKOT', e.target.checked)}
                className="w-5 h-5 accent-[#8c3a27]"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
              <div>
                <span className="text-xs font-bold text-[#2e211d] block">KOT Sound Notifications</span>
                <span className="text-[10px] text-[#a19284]">Play chime when new order arrives in kitchen</span>
              </div>
              <input
                type="checkbox"
                checked={settings.kot.soundNotifications}
                onChange={(e) => handleUpdateKOT('soundNotifications', e.target.checked)}
                className="w-5 h-5 accent-[#8c3a27]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#a19284] block mb-1">KOT Number Display Format</label>
              <select
                value={settings.kot.numberFormat}
                onChange={(e) => handleUpdateKOT('numberFormat', e.target.value)}
                className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
              >
                <option value="TOKEN_ONLY">Token Number Only (#101)</option>
                <option value="KOT_PREFIX">KOT Prefix Format (KOT-101)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#a19284] block mb-1">Kitchen Queue Sorting Priority</label>
              <select
                value={settings.kot.orderPriority}
                onChange={(e) => handleUpdateKOT('orderPriority', e.target.value)}
                className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
              >
                <option value="FIFO">First In, First Out (Chronological)</option>
                <option value="DINE_IN_FIRST">Prioritize Dine In Orders First</option>
              </select>
            </div>
          </div>

          {/* Token Sequence Reset Section */}
          <div className="pt-4 border-t border-[#a19284]/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#8c3a27]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#2e211d]">
                  Token Sequence & Counter Reset
                </h4>
              </div>
              <span className="text-[11px] font-black text-[#8c3a27] bg-[#8c3a27]/10 px-2.5 py-0.5 rounded-full border border-[#8c3a27]/20">
                Next Token to Issue: #{nextTokenNumber}
              </span>
            </div>

            <div className="p-4 bg-[#f4efe8]/70 rounded-2xl border border-[#a19284]/30 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label htmlFor="token-start-from-input" className="text-xs font-bold text-[#2e211d] block mb-1">
                    Token Number Starts From
                  </label>
                  <p className="text-[10px] text-[#a19284] mb-2">
                    Set the starting token sequence number (e.g. 101, 1, 501)
                  </p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-[#a19284]">
                      #
                    </span>
                    <input
                      id="token-start-from-input"
                      type="number"
                      min={1}
                      step={1}
                      value={tokenStartInput}
                      onChange={(e) => handleUpdateTokenStartNumber(parseInt(e.target.value, 10) || 0)}
                      placeholder="101"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-[#a19284]/40 rounded-xl text-sm font-black text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    id="reset-token-sequence-btn"
                    type="button"
                    onClick={handleResetTokenSequence}
                    className="w-full py-2.5 px-4 bg-[#8c3a27] hover:bg-[#732f1f] active:scale-[0.98] text-[#f4efe8] rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Token Sequence</span>
                  </button>
                  <p className="text-[10px] text-[#a19284] text-center mt-2">
                    Next new order will immediately start from Token #{tokenStartInput || 101}
                  </p>
                </div>
              </div>

              {/* Notice / Sequence Rules */}
              <div className="p-3 bg-white/80 rounded-xl border border-[#a19284]/20 text-[11px] text-[#2e211d]/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#8c3a27]">
                  <Info className="w-3.5 h-3.5" />
                  <span>Sequence Rules:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[10px] text-[#2e211d]/70">
                  <li>Existing order history and past token numbers remain completely unchanged.</li>
                  <li>Only newly generated tokens from this point forward will follow the new sequence.</li>
                  <li>The configured starting number is saved permanently for future sessions and sequence resets.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: POS & DISPLAY */}
      {activeTab === 'pos' && (
        <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 border-b border-[#a19284]/20 pb-3">
            <Sliders className="w-5 h-5 text-[#8c3a27]" />
            <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">POS Counter Interface Settings</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#a19284] block mb-1">Default POS Layout View</label>
              <select
                value={settings.pos.defaultViewMode}
                onChange={(e) => handleUpdatePOS('defaultViewMode', e.target.value)}
                className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
              >
                <option value="laptop_pos">Counter POS (Desktop / Tablet Dashboard)</option>
                <option value="mobile_pos">Mobile Handheld POS</option>
                <option value="kot">Kitchen KOT Display Screen</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
              <div>
                <span className="text-xs font-bold text-[#2e211d] block">Touch-Friendly Large Buttons</span>
                <span className="text-[10px] text-[#a19284]">Enlarge menu card targets for fast touchscreen tapping</span>
              </div>
              <input
                type="checkbox"
                checked={settings.pos.touchFriendlyMode}
                onChange={(e) => handleUpdatePOS('touchFriendlyMode', e.target.checked)}
                className="w-5 h-5 accent-[#8c3a27]"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
              <div>
                <span className="text-xs font-bold text-[#2e211d] block">Bill Instant Preview</span>
                <span className="text-[10px] text-[#a19284]">Show bill preview popover before submitting payment</span>
              </div>
              <input
                type="checkbox"
                checked={settings.pos.enableBillPreview}
                onChange={(e) => handleUpdatePOS('enableBillPreview', e.target.checked)}
                className="w-5 h-5 accent-[#8c3a27]"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30">
              <div>
                <span className="text-xs font-bold text-[#2e211d] block">Audio Sound Effects</span>
                <span className="text-[10px] text-[#a19284]">Play click sound when adding items to cart</span>
              </div>
              <input
                type="checkbox"
                checked={settings.pos.soundAlerts}
                onChange={(e) => handleUpdatePOS('soundAlerts', e.target.checked)}
                className="w-5 h-5 accent-[#8c3a27]"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 border-b border-[#a19284]/20 pb-3">
            <CreditCard className="w-5 h-5 text-[#8c3a27]" />
            <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">Payment Gateway & Methods</h3>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-[#a19284] block">Enabled Payment Modes on POS</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'CASH', label: 'Cash Payment' },
                { id: 'UPI', label: 'UPI / QR Code' },
                { id: 'CARD', label: 'Credit/Debit Card' },
                { id: 'SPLIT', label: 'Split Payment' },
              ].map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => handleTogglePaymentMethod(pm.id as any)}
                  className={`p-3.5 rounded-2xl border font-bold text-xs flex flex-col items-center gap-2 transition-all ${
                    (settings.payments.enabledMethods as any)[pm.id]
                      ? 'bg-[#8c3a27] text-[#f4efe8] border-[#8c3a27] shadow-sm'
                      : 'bg-[#f4efe8] text-[#a19284] border-[#a19284]/30'
                  }`}
                >
                  <DollarSign className="w-5 h-5" />
                  <span>{pm.label}</span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold">
                    {(settings.payments.enabledMethods as any)[pm.id] ? 'ENABLED' : 'DISABLED'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-bold text-[#a19284] block mb-1">Default Payment Method</label>
              <select
                value={settings.payments.defaultMethod}
                onChange={(e) => handleUpdatePayments('defaultMethod', e.target.value)}
                className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none"
              >
                <option value="UPI">UPI Payment (QR Code)</option>
                <option value="CASH">Cash Payment</option>
                <option value="CARD">Card Payment</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#a19284] block mb-1">Store VPA UPI Handle (for Dynamic QR Code)</label>
              <input
                type="text"
                value={settings.payments.upiId}
                onChange={(e) => handleUpdatePayments('upiId', e.target.value)}
                className="w-full px-3.5 py-2 bg-[#f4efe8]/50 border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: BACKUP & PWA */}
      {activeTab === 'backup' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#a19284]/20 pb-3">
              <Cloud className="w-5 h-5 text-[#8c3a27]" />
              <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">JSON System Backup & Data Restore</h3>
            </div>

            <p className="text-xs text-[#a19284]">
              Export entire application configuration, settings, and logs into a JSON file, or restore from a previous backup.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleDownloadBackup}
                className="px-4 py-2.5 bg-[#8c3a27] text-[#f4efe8] font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Export System Backup (.json)</span>
              </button>

              <label className="px-4 py-2.5 bg-[#2e211d] text-[#f4efe8] font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer hover:bg-[#1b1311]">
                <Upload className="w-4 h-4" />
                <span>Restore From Backup File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackupFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-3">
            <h3 className="font-['Playfair_Display'] font-black text-sm text-[#2e211d]">PWA System Telemetry & Version</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#f4efe8] p-3 rounded-2xl border border-[#a19284]/20">
                <span className="text-[10px] text-[#a19284] block font-bold">App Version</span>
                <span className="font-bold text-[#2e211d]">{settings.pwa.appVersion}</span>
              </div>

              <div className="bg-[#f4efe8] p-3 rounded-2xl border border-[#a19284]/20">
                <span className="text-[10px] text-[#a19284] block font-bold">Build Release</span>
                <span className="font-bold text-[#2e211d]">{settings.pwa.buildVersion}</span>
              </div>

              <div className="bg-[#f4efe8] p-3 rounded-2xl border border-[#a19284]/20">
                <span className="text-[10px] text-[#a19284] block font-bold">Last Update</span>
                <span className="font-bold text-[#2e211d]">{settings.pwa.lastUpdateDate}</span>
              </div>

              <div className="bg-[#f4efe8] p-3 rounded-2xl border border-[#a19284]/20">
                <span className="text-[10px] text-[#a19284] block font-bold">Offline Service Worker</span>
                <span className="font-bold text-green-700">Active & Ready</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: ANALYTICS CONFIG */}
      {activeTab === 'analytics' && (
        <div className="bg-white p-5 rounded-3xl border border-[#a19284]/30 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 border-b border-[#a19284]/20 pb-3">
            <BarChart3 className="w-5 h-5 text-[#8c3a27]" />
            <h3 className="font-['Playfair_Display'] font-black text-base text-[#2e211d]">Executive Analytics Widgets</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'revenue', label: 'Total Revenue Card' },
              { id: 'orders', label: 'Order Volume Count' },
              { id: 'avgOrderValue', label: 'Average Order Value (AOV)' },
              { id: 'grossProfit', label: 'Gross Profit Margin Analysis' },
              { id: 'inventoryValue', label: 'Inventory Total Value' },
              { id: 'topProducts', label: 'Top Selling Products Table' },
              { id: 'categoryPerformance', label: 'Category Revenue Breakdown' },
            ].map((widget) => (
              <div
                key={widget.id}
                className="flex items-center justify-between p-3.5 bg-[#f4efe8]/60 rounded-2xl border border-[#a19284]/30"
              >
                <span className="text-xs font-bold text-[#2e211d]">{widget.label}</span>
                <input
                  type="checkbox"
                  checked={(settings.analytics.showWidgets as any)[widget.id] ?? true}
                  onChange={(e) => {
                    const updated = {
                      ...settings.analytics.showWidgets,
                      [widget.id]: e.target.checked,
                    };
                    settingsStore.updateSection('analytics', { showWidgets: updated });
                    triggerSaveNotification(`Widget ${widget.label} toggled!`);
                  }}
                  className="w-5 h-5 accent-[#8c3a27]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT CATEGORY NAME */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#f4efe8] w-full max-w-md rounded-3xl p-6 border border-[#a19284]/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#a19284]/30 pb-3">
              <h3 className="font-['Playfair_Display'] font-black text-lg text-[#2e211d] flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#8c3a27]" />
                <span>Rename Category</span>
              </h3>
              <button onClick={() => setEditingCategory(null)} className="p-1 text-[#a19284] hover:text-[#2e211d]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-[#a19284] block mb-1">Category Name *</label>
              <input
                type="text"
                value={editingCategory.newName}
                onChange={(e) => setEditingCategory({ ...editingCategory, newName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
              />
              <p className="text-[11px] text-[#a19284] mt-1.5">
                Renaming will automatically update all menu items currently listed under this category.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveRenameCategory}
                className="flex-1 py-2.5 bg-[#8c3a27] text-[#f4efe8] font-bold text-xs rounded-xl shadow-md"
              >
                Save Category Name
              </button>
              <button
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2.5 bg-[#e2d7c9] text-[#2e211d] font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DELETE CATEGORY & REASSIGNMENT */}
      {deletingCategoryInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#f4efe8] w-full max-w-md rounded-3xl p-6 border border-[#a19284]/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#a19284]/30 pb-3">
              <h3 className="font-['Playfair_Display'] font-black text-lg text-red-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-700" />
                <span>Delete Category "{deletingCategoryInfo.categoryName}"</span>
              </h3>
              <button onClick={() => setDeletingCategoryInfo(null)} className="p-1 text-[#a19284] hover:text-[#2e211d]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {deletingCategoryInfo.itemCount > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium">
                  This category contains <strong>{deletingCategoryInfo.itemCount} menu item(s)</strong>. Select what to do with these items:
                </div>

                <div>
                  <label className="text-xs font-bold text-[#a19284] block mb-1">Reassign items to:</label>
                  <select
                    value={deletingCategoryInfo.targetCategory}
                    onChange={(e) => setDeletingCategoryInfo({ ...deletingCategoryInfo, targetCategory: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d]"
                  >
                    {settings.menu.categories
                      .filter((c) => c !== deletingCategoryInfo.categoryName)
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => handleConfirmDeleteCategory('MOVE')}
                    className="w-full py-2.5 bg-[#8c3a27] text-[#f4efe8] font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
                  >
                    <MoveRight className="w-4 h-4" />
                    <span>Move Items & Delete Category</span>
                  </button>
                  <button
                    onClick={() => handleConfirmDeleteCategory('DELETE_ITEMS')}
                    className="w-full py-2.5 bg-red-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Items & Category</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-[#2e211d]">
                  Are you sure you want to delete the empty category <strong>"{deletingCategoryInfo.categoryName}"</strong>?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmDeleteCategory('MOVE')}
                    className="flex-1 py-2.5 bg-red-800 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Delete Category
                  </button>
                  <button
                    onClick={() => setDeletingCategoryInfo(null)}
                    className="px-4 py-2.5 bg-[#e2d7c9] text-[#2e211d] font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT MENU ITEM */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[#f4efe8] w-full max-w-xl rounded-3xl p-6 border border-[#a19284]/40 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#a19284]/30 pb-3">
              <h3 className="font-['Playfair_Display'] font-black text-lg text-[#2e211d] flex items-center gap-2">
                <Utensils className="w-5 h-5 text-[#8c3a27]" />
                <span>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</span>
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="p-1 text-[#a19284] hover:text-[#2e211d]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Item Name */}
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-[#a19284] block mb-1">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Supreme Double Cheese Puff"
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Category *</label>
                <select
                  value={itemFormData.category}
                  onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                >
                  {settings.menu.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">Price (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 70"
                  value={itemFormData.price}
                  onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#a19284]/40 rounded-xl text-xs font-bold text-[#2e211d] focus:outline-none focus:border-[#8c3a27]"
                />
              </div>

              {/* Availability Status */}
              <div>
                <label className="text-xs font-bold text-[#a19284] block mb-1">In Stock Status</label>
                <button
                  type="button"
                  onClick={() => setItemFormData({ ...itemFormData, isAvailable: !itemFormData.isAvailable })}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-between transition-all ${
                    itemFormData.isAvailable ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
                  }`}
                >
                  <span>{itemFormData.isAvailable ? 'In Stock (Available on POS)' : 'Out of Stock (Disabled)'}</span>
                  {itemFormData.isAvailable ? <Check className="w-4 h-4 text-emerald-700" /> : <X className="w-4 h-4 text-rose-700" />}
                </button>
              </div>

              {/* Ingredient Recipe Deductions */}
              <div className="sm:col-span-2 bg-white p-4 rounded-2xl border border-[#a19284]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#2e211d] flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#8c3a27]" />
                    <span>Raw Material Recipe Deductions</span>
                  </label>
                  <span className="text-[10px] text-[#a19284] font-medium">Auto-deduct stock on order</span>
                </div>

                {/* Existing Recipe Ingredients */}
                {itemFormData.recipe.length > 0 ? (
                  <div className="space-y-1.5">
                    {itemFormData.recipe.map((rec) => {
                      const ing = ingredients.find((i) => i.id === rec.ingredientId);
                      return (
                        <div key={rec.ingredientId} className="flex items-center justify-between p-2 bg-[#f4efe8]/70 rounded-xl text-xs font-bold text-[#2e211d]">
                          <span>{ing ? ing.name : rec.ingredientId}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[#8c3a27] font-mono">{rec.quantityNeeded} {ing?.unit || 'units'}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRecipeIngredient(rec.ingredientId)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#a19284]">No ingredients linked yet.</p>
                )}

                {/* Add Ingredient Row */}
                <div className="flex items-center gap-2 pt-1 border-t border-[#a19284]/20">
                  <select
                    value={selectedRecipeIngId}
                    onChange={(e) => setSelectedRecipeIngId(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-[#f4efe8]/50 border border-[#a19284]/30 rounded-xl text-xs font-bold text-[#2e211d]"
                  >
                    <option value="">-- Select Raw Ingredient --</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="Qty"
                    value={selectedRecipeQty}
                    onChange={(e) => setSelectedRecipeQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-20 px-3 py-1.5 bg-[#f4efe8]/50 border border-[#a19284]/30 rounded-xl text-xs font-bold text-[#2e211d]"
                  />

                  <button
                    type="button"
                    onClick={handleAddRecipeIngredient}
                    className="px-3 py-1.5 bg-[#8c3a27] text-white font-bold text-xs rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Link</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-3 border-t border-[#a19284]/30">
              <button
                type="button"
                onClick={handleSaveItem}
                className="flex-1 py-2.5 bg-[#8c3a27] text-[#f4efe8] font-bold text-xs rounded-xl shadow-md"
              >
                {editingItem ? 'Save Item Changes' : 'Create Menu Item'}
              </button>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="px-4 py-2.5 bg-[#e2d7c9] text-[#2e211d] font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGO PREVIEW MODAL */}
      {isLogoPreviewModalOpen && settings.storeProfile.storeLogoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2e211d]/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#f4efe8] rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#a19284]/40 text-[#2e211d] relative space-y-5">
            <button
              onClick={() => setIsLogoPreviewModalOpen(false)}
              className="absolute top-4 right-4 text-[#a19284] hover:text-[#2e211d] bg-[#e2d7c9] p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-['Playfair_Display'] font-black text-lg text-[#2e211d] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#8c3a27]" />
                <span>Store Logo Preview & Transparency Inspection</span>
              </h3>
              <p className="text-xs text-[#a19284] mt-0.5">
                Verify how your uploaded logo renders across light, dark, and thermal receipt backgrounds.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Checkerboard Transparency */}
              <div className="p-4 rounded-2xl border border-[#a19284]/30 bg-white flex flex-col items-center justify-center gap-2 bg-[radial-gradient(#a19284_1.2px,transparent_1.2px)] [background-size:10px_10px]">
                <img
                  src={settings.storeProfile.storeLogoUrl}
                  alt="Transparent Preview"
                  className="max-h-24 max-w-full object-contain"
                />
                <span className="text-[10px] font-bold text-[#2e211d] bg-[#e2d7c9] px-2 py-0.5 rounded-md mt-2">
                  Transparency Grid
                </span>
              </div>

              {/* Thermal Receipt Paper Style */}
              <div className="p-4 rounded-2xl border border-[#a19284]/30 bg-white text-center flex flex-col items-center justify-center gap-2 shadow-inner font-mono text-[10px]">
                <img
                  src={settings.storeProfile.storeLogoUrl}
                  alt="Receipt Preview"
                  className="max-h-20 max-w-full object-contain"
                />
                <div className="border-t border-dashed border-[#a19284]/50 w-full pt-1.5 mt-1">
                  <span className="font-bold block text-[#2e211d]">{settings.storeProfile.storeName}</span>
                  <span className="text-[#a19284] text-[9px]">Receipt Thermal Print</span>
                </div>
              </div>

              {/* Dark App Header Style */}
              <div className="p-4 rounded-2xl border border-[#a19284]/30 bg-[#2e211d] text-[#f4efe8] flex flex-col items-center justify-center gap-2 shadow-md">
                <img
                  src={settings.storeProfile.storeLogoUrl}
                  alt="Dark Theme Preview"
                  className="max-h-20 max-w-full object-contain"
                />
                <span className="text-[10px] font-bold text-[#e2d7c9] bg-[#8c3a27] px-2 py-0.5 rounded-md mt-2">
                  App Dark Header
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#a19284]/30">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogoPreviewModalOpen(false);
                    logoFileInputRef.current?.click();
                  }}
                  className="px-3.5 py-2 bg-[#2e211d] text-[#f4efe8] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#1b1311] transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Replace Logo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogoPreviewModalOpen(false);
                    handleRemoveStoreLogo();
                  }}
                  className="px-3.5 py-2 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-rose-200 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Logo</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsLogoPreviewModalOpen(false)}
                className="px-5 py-2 bg-[#8c3a27] text-[#f4efe8] rounded-xl text-xs font-bold shadow-md hover:bg-[#722f1f] transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Key Viewer & Export Modal */}
      <RecoveryKeyModal
        isOpen={isRecoveryModalOpen}
        recoveryKey={activeRecoveryKey}
        onClose={() => setIsRecoveryModalOpen(false)}
        title="POS Emergency Recovery Key"
        subtitle="This master key allows you to reset the POS password directly from the login screen in an emergency. Store it in a secure place."
        requireConfirmation={false}
      />
    </div>
  );
};

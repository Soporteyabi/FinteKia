import React, { useState, useEffect, useRef } from 'react';
import { toast } from "./context/ToastContext";
import { getInitialState, saveStateToLocalStorage } from './store';
import { AppState, Company, Voucher, ProductionOrder, QualityInspection, Product, InventoryItem, Tercero, Warehouse, Asset, BankAccount, BankTransaction, Budget, PayrollLog, UserProfile, TechServiceOrder } from './types';
import { useAuth } from './context/AuthContext.tsx';

// Importing sub components
import Sidebar, { THEMES_MAP } from './components/Sidebar';
import KPICards from './components/KPICards';
import DashboardView from './components/DashboardView';
import InvoicingView from './components/InvoicingView';
import ManufacturingView from './components/ManufacturingView';
import PurchasesView from './components/PurchasesView';
import TercerosView from './components/TercerosView';
import VouchersView from './components/VouchersView';
import AIAdvisorView from './components/AIAdvisorView';
import KioskView from './components/KioskView';
import ProductsView from './components/ProductsView';
import WarehousesAndPlantView from './components/WarehousesAndPlantView';
import PlanningView from './components/PlanningView';
import QualityView from './components/QualityView';
import BanksView from './components/BanksView';
import TaxesView from './components/TaxesView';
import BudgetsView from './components/BudgetsView';
import PortfolioView from './components/PortfolioView';
import PayrollView from './components/PayrollView';
import UsersView from './components/UsersView';
import CompanyView from './components/CompanyView';
import TechServicesView from './components/TechServicesView';
import AlanubeConfigView from './components/AlanubeConfigView';
import DatabaseView from './components/DatabaseView';
import SecurityBackupView from './components/SecurityBackupView';
import LoginView from './components/LoginView';

export default function App() {
  const [state, setState] = useState<AppState>(getInitialState());
  const { 
    user: firebaseUser, 
    erpUser, 
    isAuthenticated, 
    signInWithGoogle, 
    signOutUser, 
    loading: authLoading 
  } = useAuth();
  const [isCloudSqlSyncing, setIsCloudSqlSyncing] = useState(false);
  const [cloudSqlConnected, setCloudSqlConnected] = useState(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state with Cloud SQL on initial load
  useEffect(() => {
    let isMounted = true;
    const fetchCloudSqlData = async () => {
      try {
        setIsCloudSqlSyncing(true);
        const res = await fetch('/api/erp/data');
        if (!res.ok) throw new Error('Failed to query Cloud SQL');
        const data = await res.json();
        
        if (isMounted) {
          if (data && data.companies && data.companies.length > 0) {
            setState(prev => {
              const extra = data.extraState || {};
              return {
                ...prev,
                companies: data.companies,
                terceros: data.terceros?.length ? data.terceros : prev.terceros,
                products: data.products?.length ? data.products : prev.products,
                vouchers: data.vouchers?.length ? data.vouchers : (extra.vouchers || prev.vouchers),
                inventory: data.inventory?.length ? data.inventory : (extra.inventory || prev.inventory),
                bankAccounts: data.bankAccounts?.length ? data.bankAccounts : (extra.bankAccounts || prev.bankAccounts),
                ...extra,
              };
            });
          } else {
            // First time initialization: seed current initial data to Cloud SQL
            await fetch('/api/erp/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                companiesList: state.companies,
                tercerosList: state.terceros,
                productsList: state.products,
                extraState: {
                  vouchers: state.vouchers,
                  inventory: state.inventory,
                  bankAccounts: state.bankAccounts,
                  budgets: state.budgets,
                  payrollLogs: state.payrollLogs,
                  productionOrders: state.productionOrders,
                  techServiceOrders: state.techServiceOrders,
                }
              })
            });
          }
          setCloudSqlConnected(true);
        }
      } catch (err) {
        console.warn('Cloud SQL fetch notice:', err);
      } finally {
        if (isMounted) setIsCloudSqlSyncing(false);
      }
    };

    fetchCloudSqlData();
    return () => { isMounted = false; };
  }, []);

  // Update currentUser if Firebase User or ERP User logs in
  useEffect(() => {
    if (erpUser) {
      setState(prev => ({
        ...prev,
        currentUser: {
          name: erpUser.name,
          role: erpUser.role,
          email: erpUser.email
        }
      }));
    } else if (firebaseUser) {
      setState(prev => ({
        ...prev,
        currentUser: {
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario DIAN',
          role: prev.currentUser.role || 'Admin',
          email: firebaseUser.email || prev.currentUser.email,
        }
      }));
    }
  }, [erpUser, firebaseUser]);

  // Company creation wizard states
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [newCompDataMode, setNewCompDataMode] = useState<'clean' | 'demo'>('clean'); // Default: 0 datos limpios desde cero
  const [newCompName, setNewCompName] = useState('');
  const [newCompNit, setNewCompNit] = useState('');
  const [newCompSlogan, setNewCompSlogan] = useState('Línea o Sucursal Industrial Nueva');
  const [newCompAddress, setNewCompAddress] = useState('Calle 100 # 15-22, Bogotá D.C., Colombia');
  const [newCompRegimen, setNewCompRegimen] = useState<Company['regimen']>('responsable');
  const [newCompCurrency, setNewCompCurrency] = useState<'COP' | 'USD' | 'EUR'>('COP');
  const [newCompPeriod, setNewCompPeriod] = useState(2026);
  const [newCompSmmlv, setNewCompSmmlv] = useState(1423500); // Standard Colombian 2026 params
  const [newCompAuxTransporte, setNewCompAuxTransporte] = useState(172000);
  const [newCompBusinessType, setNewCompBusinessType] = useState<Company['businessType']>('comercial');
  const [newCompEnableProduction, setNewCompEnableProduction] = useState(false);
  const [newCompEnableTechServices, setNewCompEnableTechServices] = useState(true);

  // Security: Company switch protection states
  const [showSwitchConfirmModal, setShowSwitchConfirmModal] = useState(false);
  const [pendingTargetCompany, setPendingTargetCompany] = useState<Company | null>(null);
  const [switchAdminPin, setSwitchAdminPin] = useState('');
  const [switchPinError, setSwitchPinError] = useState('');
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Save state immediately on modifications to local storage and debounce to Cloud SQL
  useEffect(() => {
    saveStateToLocalStorage(state);

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        setIsCloudSqlSyncing(true);
        await fetch('/api/erp/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companiesList: state.companies,
            tercerosList: state.terceros,
            productsList: state.products,
            extraState: {
              vouchers: state.vouchers,
              inventory: state.inventory,
              bankAccounts: state.bankAccounts,
              budgets: state.budgets,
              payrollLogs: state.payrollLogs,
              productionOrders: state.productionOrders,
              techServiceOrders: state.techServiceOrders,
              users: state.users,
            }
          })
        });
        setCloudSqlConnected(true);
      } catch (err) {
        console.warn('Sync to Cloud SQL background error:', err);
      } finally {
        setIsCloudSqlSyncing(false);
      }
    }, 2000);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [state]);

  const activeCompany = state.companies.find((co) => co.id === state.currentCompanyId) || state.companies[0];

  // Helper selectors filtered by active company context to isolate data
  // Even if we store them globally, we've filtered them safely
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // State manipulation triggers (actions) with security authorization & confirmation
  const handleRequestSwitchCompany = (targetId: string) => {
    const target = state.companies.find((co) => co.id === targetId);
    if (!target) return;
    if (target.id === activeCompany.id) {
      toast.info(`Ya estás operando en la empresa "${target.name}".`, 'Empresa Actual');
      return;
    }
    
    // Check user profile restrictions if any
    const profile = state.users?.find(u => u.email === state.currentUser.email);
    if (profile?.allowedCompanyIds && profile.allowedCompanyIds.length > 0 && !profile.allowedCompanyIds.includes(target.id) && state.currentUser.role !== 'Admin') {
      toast.error(`Acceso restringido: No tienes permisos asignados para acceder a "${target.name}". Contacta al Administrador.`, 'Permiso Denegado');
      return;
    }

    setPendingTargetCompany(target);
    setSwitchAdminPin('');
    setSwitchPinError('');
    setShowSwitchConfirmModal(true);
    setShowCompanyDropdown(false);
  };

  const handleConfirmSwitchCompany = () => {
    if (!pendingTargetCompany) return;
    
    // Non-admin roles require admin PIN (default: 1234)
    if (state.currentUser.role !== 'Admin') {
      if (switchAdminPin.trim() !== '1234') {
        setSwitchPinError('PIN de Administrador incorrecto (PIN predeterminado: 1234).');
        return;
      }
    }

    setState((prev) => ({
      ...prev,
      currentCompanyId: pendingTargetCompany.id
    }));

    toast.success(`Entorno empresarial cambiado con éxito a "${pendingTargetCompany.name}".`, 'Entorno Activo');
    setShowSwitchConfirmModal(false);
    setPendingTargetCompany(null);
  };

  // Backwards compatibility alias
  const handleSwitchCompany = (id: string) => {
    handleRequestSwitchCompany(id);
  };

  const handleCreateCompany = () => {
    if (state.currentUser.role !== 'Admin') {
      toast.error('Solo los usuarios con rol de Administrador pueden crear nuevas organizaciones.', 'Acceso Restringido');
      return;
    }
    setNewCompName('');
    setNewCompNit('');
    setNewCompSlogan('Línea o Sucursal Industrial Nueva');
    setNewCompAddress('Calle 100 # 15-22, Bogotá D.C., Colombia');
    setNewCompRegimen('responsable');
    setNewCompCurrency('COP');
    setNewCompPeriod(2026);
    setNewCompSmmlv(1423500);
    setNewCompAuxTransporte(172000);
    setNewCompDataMode('clean'); // By default: completely clean from scratch!
    setNewCompBusinessType('comercial');
    setNewCompEnableProduction(false);
    setNewCompEnableTechServices(true);
    
    setShowCreateCompanyModal(true);
  };

  const handleSaveNewCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim() || !newCompNit.trim()) {
      toast.warning("Por favor ingrese la Razón Social y el NIT de la organización.", "Datos Obligatorios");
      return;
    }

    const companyId = `co-${Date.now()}`;
    const newCompany: Company = {
      id: companyId,
      name: newCompName.trim(),
      nit: newCompNit.trim(),
      slogan: newCompSlogan.trim(),
      address: newCompAddress.trim(),
      regimen: newCompRegimen,
      currency: newCompCurrency,
      period: newCompPeriod,
      businessType: newCompBusinessType,
      enableProduction: newCompEnableProduction,
      enableTechServices: newCompEnableTechServices,
      billingConfig: {
        providerType: 'tercero_proveedor',
        providerName: 'Alanube',
        providerNit: '901.464.305-6',
        environment: 'produccion',
        prefix: 'FE',
        resolutionNumber: '187640000099',
        resolutionDate: '2026-01-15',
        authorizedRangeFrom: 1,
        authorizedRangeTo: 5000,
        clientId: 'ala_cli_live_98a72b4c8102',
        clientSecret: 'ala_sec_f9823be800e2194ad9b3c4f',
        apiToken: 'ala_live_sec_98f7e2a4d3_auth_key',
        autoSendEmail: true
      },
      invoiceDesign: {
        logoPosition: 'left',
        logoSize: 'md',
        logoStyle: 'rounded',
        accentColor: '#2563eb',
        showSlogan: true,
        showResolutionBox: true,
        showBankAccounts: true,
        bankAccountDetails: `Bancolombia Cta Ahorros (NIT ${newCompNit.trim()})`,
        termsAndNotes: 'Esta factura de venta se asimila en sus efectos legales a una letra de cambio según la ley 1231 de 2008.'
      },
      payrollParameters: {
        smmlv: Number(newCompSmmlv) || 1423500,
        auxTransporte: Number(newCompAuxTransporte) || 172000
      }
    };

    if (newCompDataMode === 'clean') {
      // 100% CLEAN ENVIRONMENT: 0 products, 0 inventory, 0 vouchers, 0 production orders
      // Only 1 empty initial warehouse and 1 empty starting cash account
      const cleanWarehouse: Warehouse = {
        id: `wh-${companyId}-1`,
        name: `Bodega Principal - ${newCompany.name.split(' ')[0]}`,
        address: newCompany.address,
        companyId: companyId,
        manager: 'Administrador General'
      };

      const cleanBankAccount: BankAccount = {
        id: `ba-${companyId}-1`,
        name: `Caja General (${newCompany.name.split(' ')[0]})`,
        bankName: 'Caja General / Efectivo',
        accountNumber: `CAJA-${newCompany.nit.replace(/[^0-9]/g, '').slice(-4) || '0001'}`,
        balance: 0,
        companyId: companyId
      };

      setState((prev) => ({
        ...prev,
        companies: [...prev.companies, newCompany],
        warehouses: [...prev.warehouses, cleanWarehouse],
        bankAccounts: [...prev.bankAccounts, cleanBankAccount],
        currentCompanyId: newCompany.id,
        activeView: 'dashboard'
      }));

      toast.success(`Organización "${newCompany.name}" creada desde cero (ambiente 100% limpio sin datos demo).`, 'Empresa Creada');
    } else {
      // Demo template mode: add demo items specifically for this company
      const demoWarehouse: Warehouse = {
        id: `wh-${companyId}-1`,
        name: `Bodega Principal - ${newCompany.name.split(' ')[0]}`,
        address: newCompany.address,
        companyId: companyId,
        manager: 'Administrador'
      };

      const demoProduct: Product = {
        id: `p-${companyId}-1`,
        name: newCompBusinessType === 'produccion' ? 'Producto Fabricado Estándar' : 'Servicio / Producto Comercial',
        sku: 'ITEM-DEMO-01',
        cost: 15000,
        price: 35000,
        tax: 19,
        type: newCompBusinessType === 'produccion' ? 'terminado' : 'tecnologia',
        lotTracking: false,
        unitOfMeasure: 'UND',
        companyId: companyId
      };

      setState((prev) => ({
        ...prev,
        companies: [...prev.companies, newCompany],
        warehouses: [...prev.warehouses, demoWarehouse],
        products: [...prev.products, demoProduct],
        currentCompanyId: newCompany.id,
        activeView: 'dashboard'
      }));

      toast.success(`Organización "${newCompany.name}" creada con plantilla de prueba.`, 'Empresa Creada');
    }

    setShowCreateCompanyModal(false);
  };

  const handleUpdateCompany = (updated: Company) => {
    setState((prev) => ({
      ...prev,
      companies: prev.companies.map((co) => co.id === updated.id ? updated : co)
    }));
  };

  const handleAddVoucher = (p: { 
    number: string; 
    type: Voucher['type']; 
    concept: string; 
    thirdPartyId: string; 
    total: number; 
    lines: any[]; 
    items?: any[];
    companyId?: string;
    paymentTerm?: 'contado' | 'credito';
    dueDate?: string;
    discountTotal?: number;
    retenciones?: { retefuente?: number; reteiva?: number; reteica?: number };
    billingProviderData?: any;
    notes?: string;
  }) => {
    const newVoucher: Voucher = {
      id: `v-${Date.now()}`,
      number: p.number,
      type: p.type,
      date: new Date().toISOString().substring(0, 10),
      concept: p.concept,
      thirdPartyId: p.thirdPartyId,
      status: 'procesado',
      total: p.total,
      lines: p.lines,
      items: p.items,
      companyId: p.companyId || state.currentCompanyId,
      paymentTerm: p.paymentTerm,
      dueDate: p.dueDate,
      discountTotal: p.discountTotal,
      retenciones: p.retenciones,
      billingProviderData: p.billingProviderData,
      notes: p.notes
    };

    setState((prev) => ({
      ...prev,
      vouchers: [...prev.vouchers, newVoucher]
    }));
  };

  const handleAddTechOrder = (order: Omit<TechServiceOrder, 'id'>) => {
    const newOrder: TechServiceOrder = {
      id: `ot-${Date.now()}`,
      ...order,
      companyId: order.companyId || activeCompany.id
    };
    setState((prev) => ({
      ...prev,
      techServiceOrders: [newOrder, ...(prev.techServiceOrders || [])]
    }));
  };

  const handleUpdateTechOrderStatus = (id: string, status: TechServiceOrder['status']) => {
    setState((prev) => ({
      ...prev,
      techServiceOrders: (prev.techServiceOrders || []).map(o => o.id === id ? { ...o, status } : o)
    }));
  };

  const handleUpdateTechOrder = (updatedOrder: TechServiceOrder) => {
    setState((prev) => ({
      ...prev,
      techServiceOrders: (prev.techServiceOrders || []).map(o => o.id === updatedOrder.id ? updatedOrder : o)
    }));
  };

  const handleAddBankAccount = (ba: Omit<BankAccount, 'id'>) => {
    const newAccount: BankAccount = {
      id: `ba-${Date.now()}`,
      ...ba,
      companyId: ba.companyId || activeCompany.id
    };
    setState((prev) => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, newAccount]
    }));
  };

  const handleAddBankTransaction = (tx: Omit<BankTransaction, 'id'>) => {
    const newTx: BankTransaction = {
      id: `bt-${Date.now()}`,
      ...tx
    };
    setState((prev) => {
      // update starting account balance as well 
      const factor = tx.type === 'Ingreso' ? 1 : -1;
      const updatedAccounts = prev.bankAccounts.map((acc) => {
        if (acc.id === tx.bankAccountId) {
          return {
            ...acc,
            balance: acc.balance + (tx.amount * factor)
          };
        }
        return acc;
      });
      return {
        ...prev,
        bankAccounts: updatedAccounts,
        bankTransactions: [...prev.bankTransactions, newTx]
      };
    });
  };

  const handleReconcileTransaction = (transactionId: string, voucherId: string | null) => {
    setState((prev) => ({
      ...prev,
      bankTransactions: prev.bankTransactions.map((bt) => {
        if (bt.id === transactionId) {
          return { 
            ...bt, 
            reconciled: voucherId !== null, 
            voucherId: voucherId || undefined 
          };
        }
        return bt;
      })
    }));
  };

  const handleAddInventoryMovement = (mov: any) => {
    setState((prev) => {
      const newMov = {
        id: `mov-${Date.now()}`,
        userId: prev.currentUser.name || 'Admin',
        ...mov
      };
      return {
        ...prev,
        inventoryMovements: [...prev.inventoryMovements, newMov]
      };
    });
  };

  // Dedicated inventory controller with PEPS auto-allocation and Expiration Date support
  const handleUpdateInventory = (prodId: string, lotNum: string | undefined, diffQty: number, warehouseId?: string, expirationDate?: string) => {
    setState((prev) => {
      let updatedInv = prev.inventory.map(item => ({ ...item }));
      const isFinished = prev.products.find(p => p.id === prodId)?.type === 'terminado';
      const defaultWh = isFinished ? 'wh-2' : 'wh-1';
      const whId = warehouseId || defaultWh;

      if (diffQty < 0) {
        // Deduction / Consumption (PEPS)
        let amountToDeduct = Math.abs(diffQty);
        
        if (lotNum && lotNum !== 'S/L' && lotNum !== 'No aplica lote') {
          // Explicit lot specified
          const idx = updatedInv.findIndex(
            (item) => item.productId === prodId && item.lotNumber === lotNum && item.warehouseId === whId
          );
          if (idx !== -1) {
            const available = updatedInv[idx].quantity;
            if (available >= amountToDeduct) {
              updatedInv[idx].quantity -= amountToDeduct;
              amountToDeduct = 0;
            } else {
              updatedInv[idx].quantity = 0;
              amountToDeduct -= available;
            }
          }
        } else {
          // No explicit lot (automatic PEPS allocation)
          // Find all lots that have positive stock
          const matchLots = updatedInv.filter(
            (item) => item.productId === prodId && item.warehouseId === whId && item.quantity > 0
          );
          
          // Sort according to PEPS (First Expiring first)
          matchLots.sort((a, b) => {
            if (!a.expirationDate) return 1;
            if (!b.expirationDate) return -1;
            return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
          });

          for (const lotItem of matchLots) {
            if (amountToDeduct <= 0) break;
            const targetIdx = updatedInv.findIndex(item => item.id === lotItem.id);
            if (targetIdx !== -1) {
              const available = updatedInv[targetIdx].quantity;
              if (available >= amountToDeduct) {
                updatedInv[targetIdx].quantity -= amountToDeduct;
                amountToDeduct = 0;
              } else {
                updatedInv[targetIdx].quantity = 0;
                amountToDeduct -= available;
              }
            }
          }
        }

        // If there's still leftover amount, deduct from any matching or first item of that product
        if (amountToDeduct > 0) {
          const idx = updatedInv.findIndex(
            (item) => item.productId === prodId && item.warehouseId === whId
          );
          if (idx !== -1) {
            updatedInv[idx].quantity = Math.max(0, updatedInv[idx].quantity - amountToDeduct);
          }
        }
      } else {
        // Addition / Entry of inventory (Purchase or Production entry)
        const matchIdx = updatedInv.findIndex(
          (item) => item.productId === prodId && item.lotNumber === lotNum && item.warehouseId === whId
        );

        if (matchIdx !== -1) {
          updatedInv[matchIdx].quantity += diffQty;
          if (expirationDate) {
            updatedInv[matchIdx].expirationDate = expirationDate;
          }
        } else {
          const prod = prev.products.find(p => p.id === prodId);
          updatedInv.push({
            id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            productId: prodId,
            lotNumber: lotNum,
            expirationDate: expirationDate,
            warehouseId: whId,
            quantity: diffQty,
            avgCost: prod ? prod.cost : 5000,
            companyId: activeCompany.id
          });
        }
      }

      return {
        ...prev,
        inventory: updatedInv
      };
    });
  };

  // Add Production Order
  const handleAddProductionOrder = (p: Omit<ProductionOrder, 'id' | 'orderNumber'>) => {
    setState((prev) => {
      const nextId = `OP-${1001 + prev.productionOrders.length}`;
      const newOrder: ProductionOrder = {
        id: `po-${Date.now()}`,
        orderNumber: nextId,
        bomId: p.bomId,
        quantity: p.quantity,
        startDate: p.startDate,
        dueDate: p.dueDate,
        status: 'pendiente',
        costEstimates: p.costEstimates,
        generatedLot: `LOT-2606-${nextId.substring(3)}`,
        rawWarehouseId: p.rawWarehouseId,
        finishedWarehouseId: p.finishedWarehouseId,
        productionHours: p.productionHours,
        laborHourlyRate: p.laborHourlyRate,
        overheadHourlyRate: p.overheadHourlyRate,
        companyId: p.companyId || activeCompany.id
      };

      return {
        ...prev,
        productionOrders: [...prev.productionOrders, newOrder]
      };
    });
  };

  // Update Production Order status
  const handleUpdateOrderStatus = (id: string, newStatus: ProductionOrder['status']) => {
    setState((prev) => {
      let updatedInv = prev.inventory.map(item => ({ ...item }));
      let updatedMovements = [...prev.inventoryMovements];
      let updatedProducts = prev.products.map(p => ({ ...p }));

      const orders = prev.productionOrders.map((o) => {
        if (o.id === id) {
          return { 
            ...o, 
            status: newStatus,
            completedDate: newStatus === 'completada' ? new Date().toISOString().substring(0, 10) : o.completedDate
          };
        }
        return o;
      });

      const completedOrder = prev.productionOrders.find((o) => o.id === id);
      if (newStatus === 'completada' && completedOrder) {
        const targetBOM = prev.boms.find((b) => b.id === completedOrder.bomId);
        if (targetBOM) {
          const fId = targetBOM.finishedProductId;
          const rawWh = completedOrder.rawWarehouseId || 'wh-1';
          const finWh = completedOrder.finishedWarehouseId || 'wh-2';

          // 1. Calculate Core Material Real Costs based on weighted average stock cost
          let actualMaterialsCost = 0;
          
          targetBOM.items.forEach((bomItem) => {
            const consumedQty = bomItem.quantity * completedOrder.quantity;
            
            // Look for matching lot records with stock first, otherwise fallback to the first slot or catalog unit cost
            const invItemsInWh = updatedInv.filter(item => item.productId === bomItem.productId && item.warehouseId === rawWh);
            const activeStockSlot = invItemsInWh.find(item => item.quantity > 0) || invItemsInWh[0];
            const materialUnitCost = activeStockSlot ? activeStockSlot.avgCost : (prev.products.find(p => p.id === bomItem.productId)?.cost || 0);
            
            actualMaterialsCost += (consumedQty * materialUnitCost);
          });

          // Labor and Overhead estimates or configuration
          const pHours = completedOrder.productionHours ?? 2;
          const lHourly = completedOrder.laborHourlyRate ?? 15000;
          const oHourly = completedOrder.overheadHourlyRate ?? 8000;

          const laborRealCost = pHours * lHourly;
          const overheadRealCost = pHours * oHourly;
          const totalRealCost = actualMaterialsCost + laborRealCost + overheadRealCost;
          const unitRealCost = completedOrder.quantity > 0 ? (totalRealCost / completedOrder.quantity) : 0;

          // Mutate the completed order in our orders map with actual cost calculations
          const mappedOrderIdx = orders.findIndex(o => o.id === id);
          if (mappedOrderIdx !== -1) {
            orders[mappedOrderIdx].costsReal = {
              materials: Math.round(actualMaterialsCost),
              labor: laborRealCost,
              overhead: overheadRealCost
            };
          }

          // Dynamically adjust the catalog cost of the finished product to reflect raw + hours updates
          updatedProducts = updatedProducts.map(p => {
            if (p.id === fId) {
              return { ...p, cost: Math.round(unitRealCost) };
            }
            return p;
          });

          // 2. Perform proportional deduction from raw material warehouse following PEPS
          targetBOM.items.forEach((bomItem) => {
            const consumedQty = bomItem.quantity * completedOrder.quantity;
            let amountToDeduct = consumedQty;

            // Sort lots based on expiration date (earlier dates first) to guarantee PEPS/FIFO consistency
            const matchLots = updatedInv.filter(
              (item) => item.productId === bomItem.productId && item.warehouseId === rawWh && item.quantity > 0
            );
            matchLots.sort((a, b) => {
              if (!a.expirationDate) return 1;
              if (!b.expirationDate) return -1;
              return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
            });

            if (matchLots.length === 0) {
              // Fallback if no positive slots, deduct directly from first matching slot
              const fallbackIdx = updatedInv.findIndex(
                (item) => item.productId === bomItem.productId && item.warehouseId === rawWh
              );
              if (fallbackIdx !== -1) {
                updatedInv[fallbackIdx].quantity = Math.max(0, updatedInv[fallbackIdx].quantity - amountToDeduct);
                amountToDeduct = 0;
              }
            } else {
              for (const lotItem of matchLots) {
                if (amountToDeduct <= 0) break;
                const targetIdx = updatedInv.findIndex(item => item.id === lotItem.id);
                if (targetIdx !== -1) {
                  const available = updatedInv[targetIdx].quantity;
                  if (available >= amountToDeduct) {
                    updatedInv[targetIdx].quantity -= amountToDeduct;
                    amountToDeduct = 0;
                  } else {
                    updatedInv[targetIdx].quantity = 0;
                    amountToDeduct -= available;
                  }
                }
              }
            }

            // Fallback for residual deduction
            if (amountToDeduct > 0) {
              const idx = updatedInv.findIndex(
                (item) => item.productId === bomItem.productId && item.warehouseId === rawWh
              );
              if (idx !== -1) {
                updatedInv[idx].quantity = Math.max(0, updatedInv[idx].quantity - amountToDeduct);
              }
            }

            // Register raw consumption in our inventory movements log (Kardex)
            const matObj = prev.products.find(p => p.id === bomItem.productId);
            updatedMovements.push({
              id: `mov-cons-${Date.now()}-${bomItem.productId}`,
              date: new Date().toISOString().substring(0, 10),
              productId: bomItem.productId,
              type: 'consumo_materia_prima',
              originWarehouseId: rawWh,
              quantity: consumedQty,
              cost: matObj ? matObj.cost : 3000,
              userId: prev.currentUser.name || 'Admin',
              notes: `Consumo Receta OP ${completedOrder.orderNumber}`
            });
          });

          // 3. Deposit finished production units with integrated shelf-life tracking
          const fProdObj = prev.products.find(p => p.id === fId);
          let expirationDateStr = undefined;
          if (fProdObj && fProdObj.shelfLifeDays) {
            expirationDateStr = new Date(Date.now() + fProdObj.shelfLifeDays * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
          }

          const existingFinishedIdx = updatedInv.findIndex(
            (item) => item.productId === fId && item.lotNumber === completedOrder.generatedLot && item.warehouseId === finWh
          );

          if (existingFinishedIdx !== -1) {
            updatedInv[existingFinishedIdx].quantity += completedOrder.quantity;
            updatedInv[existingFinishedIdx].avgCost = Math.round(unitRealCost);
          } else {
            updatedInv.push({
              id: `inv-fin-${Date.now()}`,
              productId: fId,
              lotNumber: completedOrder.generatedLot,
              expirationDate: expirationDateStr,
              warehouseId: finWh,
              quantity: completedOrder.quantity,
              avgCost: Math.round(unitRealCost)
            });
          }

          // Register finished product entry log
          updatedMovements.push({
            id: `mov-entry-${Date.now()}`,
            date: new Date().toISOString().substring(0, 10),
            productId: fId,
            lotNumber: completedOrder.generatedLot,
            type: 'produccion_entrada',
            destWarehouseId: finWh,
            quantity: completedOrder.quantity,
            cost: Math.round(unitRealCost),
            userId: prev.currentUser.name || 'Admin',
            notes: `Entrada Producción OP ${completedOrder.orderNumber}`
          });
        }
      }

      return {
        ...prev,
        productionOrders: orders,
        inventory: updatedInv,
        inventoryMovements: updatedMovements,
        products: updatedProducts
      };
    });
  };

  // Add Quality Inspection
  const handleAddQualityInspection = (qi: Omit<QualityInspection, 'id'>) => {
    const newInspect: QualityInspection = {
      id: `qi-${Date.now()}`,
      ...qi
    };
    setState((prev) => ({
      ...prev,
      qualityInspections: [...prev.qualityInspections, newInspect]
    }));
  };

  const handleAddTercero = (newTerData: Omit<Tercero, 'id'>) => {
    const newTercero: Tercero = {
      id: `ter-${Date.now()}`,
      ...newTerData,
      companyId: newTerData.companyId || activeCompany.id
    };
    setState((prev) => ({
      ...prev,
      terceros: [...prev.terceros, newTercero]
    }));
  };

  const handleUpdateTercero = (updatedTer: Tercero) => {
    setState((prev) => ({
      ...prev,
      terceros: prev.terceros.map((t) => t.id === updatedTer.id ? updatedTer : t)
    }));
  };

  const handleDeleteTercero = (id: string) => {
    setState((prev) => ({
      ...prev,
      terceros: prev.terceros.filter((t) => t.id !== id)
    }));
  };

  const handleAddUser = (newUser: UserProfile) => {
    setState((prev) => ({
      ...prev,
      users: [...(prev.users || []), newUser]
    }));
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setState((prev) => ({
      ...prev,
      users: (prev.users || []).map((u) => u.id === updatedUser.id ? updatedUser : u)
    }));
  };

  const handleDeleteUser = (id: string) => {
    setState((prev) => ({
      ...prev,
      users: (prev.users || []).filter((u) => u.id !== id)
    }));
  };

  const handleUpdateCurrentUserFull = (fullUser: { name: string; role: 'Admin' | 'Contador' | 'Vendedor' | 'Operario'; email: string }) => {
    setState((prev) => ({
      ...prev,
      currentUser: fullUser
    }));
  };

  const handleAddPayrollLog = (newLog: PayrollLog) => {
    setState((prev) => ({
      ...prev,
      payrollLogs: [
        ...prev.payrollLogs.filter((p) => !(p.employeeId === newLog.employeeId && p.period === newLog.period)),
        newLog
      ]
    }));
  };

  const handleUpdatePayrollLogStatus = (
    id: string,
    status: 'calculado' | 'pagado',
    bankAccountId?: string,
    consignedDate?: string
  ) => {
    setState((prev) => ({
      ...prev,
      payrollLogs: prev.payrollLogs.map((log) => {
        if (log.id === id) {
          return {
            ...log,
            status,
            consignedBankAccountId: bankAccountId,
            consignedDate
          };
        }
        return log;
      })
    }));
  };

  const handleAddProduct = (payload: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...payload,
      id: `p-${Date.now()}`,
      companyId: payload.companyId || activeCompany.id
    };

    setState((prev) => ({
      ...prev,
      products: [...prev.products, newProduct]
    }));
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => p.id === updatedProd.id ? updatedProd : p)
    }));
  };

  const handleDeleteProduct = (id: string) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id)
    }));
  };

  const handleAddWarehouse = (payload: Omit<Warehouse, 'id'>) => {
    const newWh: Warehouse = {
      ...payload,
      id: `wh-${Date.now()}`,
      companyId: payload.companyId || activeCompany.id
    };
    setState((prev) => ({
      ...prev,
      warehouses: [...prev.warehouses, newWh]
    }));
  };

  const handleUpdateWarehouse = (updatedWh: Warehouse) => {
    setState((prev) => ({
      ...prev,
      warehouses: prev.warehouses.map((w) => w.id === updatedWh.id ? updatedWh : w)
    }));
  };

  const handleDeleteWarehouse = (id: string) => {
    setState((prev) => ({
      ...prev,
      warehouses: prev.warehouses.filter((w) => w.id !== id)
    }));
  };

  const handleAddAsset = (payload: Omit<Asset, 'id'>) => {
    const newAsset: Asset = {
      ...payload,
      id: `as-${Date.now()}`
    };
    setState((prev) => ({
      ...prev,
      assets: [...prev.assets, newAsset]
    }));
  };

  const handleUpdateAsset = (updatedAsset: Asset) => {
    setState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => a.id === updatedAsset.id ? updatedAsset : a)
    }));
  };

  const handleDeleteAsset = (id: string) => {
    setState((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== id)
    }));
  };

  const handleTransferStock = (productId: string, lotNum: string | undefined, originWhId: string, destWhId: string, qty: number) => {
    setState((prev) => {
      const updatedInv = [...prev.inventory];
      const prod = prev.products.find(p => p.id === productId);
      const cost = prod ? prod.cost : 5000;

      // 1. Subtract from origin with high-precision matching
      const originMatchIdx = updatedInv.findIndex(
        (item) => item.productId === productId && item.lotNumber === lotNum && item.warehouseId === originWhId
      );
      if (originMatchIdx !== -1) {
        updatedInv[originMatchIdx].quantity = Math.max(0, updatedInv[originMatchIdx].quantity - qty);
      }

      // 2. Add to destination with high-precision matching
      const destMatchIdx = updatedInv.findIndex(
        (item) => item.productId === productId && item.lotNumber === lotNum && item.warehouseId === destWhId
      );
      if (destMatchIdx !== -1) {
        updatedInv[destMatchIdx].quantity += qty;
      } else {
        updatedInv.push({
          id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId,
          lotNumber: lotNum,
          warehouseId: destWhId,
          quantity: qty,
          avgCost: cost,
          companyId: activeCompany.id
        });
      }

      // 3. Register traslado movement
      const newMovement = {
        id: `m-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        productId,
        lotNumber: lotNum,
        type: 'traslado_traslado' as const,
        originWarehouseId: originWhId,
        destWarehouseId: destWhId,
        quantity: qty,
        cost,
        userId: 'Admin Contable',
        companyId: activeCompany.id
      };

      return {
        ...prev,
        inventory: updatedInv,
        inventoryMovements: [...prev.inventoryMovements, newMovement]
      };
    });
  };

  const handleAddBudget = (b: Omit<Budget, 'id'>) => {
    setState((prev) => ({
      ...prev,
      budgets: [
        ...prev.budgets,
        {
          id: `bu-${Date.now()}`,
          ...b
        }
      ]
    }));
  };

  const handleDeleteBudget = (id: string) => {
    setState((prev) => ({
      ...prev,
      budgets: prev.budgets.filter((b) => b.id !== id)
    }));
  };

  const handleUpdateBudget = (id: string, amount: number) => {
    setState((prev) => ({
      ...prev,
      budgets: prev.budgets.map((b) => b.id === id ? { ...b, amount } : b)
    }));
  };

  const handleTransferBudget = (fromId: string, toId: string, amount: number) => {
    setState((prev) => ({
      ...prev,
      budgets: prev.budgets.map((b) => {
        if (b.id === fromId) {
          return { ...b, amount: Math.max(0, b.amount - amount) };
        }
        if (b.id === toId) {
          return { ...b, amount: b.amount + amount };
        }
        return b;
      })
    }));
  };

  // Strictly isolate company data:
  // If an entity has companyId === activeCompany.id, it belongs to this company.
  // Legacy fallback: if companyId is unset, only treat as co-1 if activeCompany is co-1.
  const activeProducts = React.useMemo(() => 
    state.products.filter(p => p.companyId === activeCompany.id || (!p.companyId && activeCompany.id === 'co-1')),
    [state.products, activeCompany.id]
  );

  const activeInventory = React.useMemo(() => 
    state.inventory.filter(i => i.companyId === activeCompany.id || (!i.companyId && activeCompany.id === 'co-1')),
    [state.inventory, activeCompany.id]
  );

  const activeWarehouses = React.useMemo(() => 
    state.warehouses.filter(w => w.companyId === activeCompany.id || (!w.companyId && activeCompany.id === 'co-1')),
    [state.warehouses, activeCompany.id]
  );

  const activeVouchers = React.useMemo(() => 
    state.vouchers.filter(v => v.companyId === activeCompany.id || (!v.companyId && activeCompany.id === 'co-1')),
    [state.vouchers, activeCompany.id]
  );

  const activeBankAccounts = React.useMemo(() => 
    state.bankAccounts.filter(b => b.companyId === activeCompany.id || (!b.companyId && activeCompany.id === 'co-1')),
    [state.bankAccounts, activeCompany.id]
  );

  const activeProductionOrders = React.useMemo(() => 
    state.productionOrders.filter(o => o.companyId === activeCompany.id || (!o.companyId && activeCompany.id === 'co-2')),
    [state.productionOrders, activeCompany.id]
  );

  const activeTechServiceOrders = React.useMemo(() => 
    (state.techServiceOrders || []).filter(t => t.companyId === activeCompany.id || (!t.companyId && activeCompany.id === 'co-1')),
    [state.techServiceOrders, activeCompany.id]
  );

  const activeTerceros = React.useMemo(() => 
    state.terceros.filter(t => t.companyId === activeCompany.id || (!t.companyId && activeCompany.id === 'co-1')),
    [state.terceros, activeCompany.id]
  );

  const activeBoms = React.useMemo(() => 
    state.boms.filter(b => activeProducts.some(p => p.id === b.finishedProductId)),
    [state.boms, activeProducts]
  );

  // Active company metrics calculations (Purely isolated to the current company)
  const salesVouchersArr = activeVouchers.filter((v) => v.type === 'venta');
  const salesSum = salesVouchersArr.reduce((acc, v) => acc + v.total, 0);

  const purchaseVouchersArr = activeVouchers.filter((v) => v.type === 'compra');
  const expensesSum = purchaseVouchersArr.reduce((acc, v) => acc + v.total, 0);

  const netOperacionProfit = salesSum - expensesSum;
  const netMarginVal = salesSum > 0 ? `${Math.round((netOperacionProfit / salesSum) * 100)}%` : '0%';

  const clientsList = activeTerceros.filter((t) => t.roles.includes('cliente'));

  const currentThemeId = state.theme || 'light_gray';
  const activeThemeObj = THEMES_MAP[currentThemeId] || THEMES_MAP.light_gray;
  const isLight = currentThemeId === 'light_gray';

  // Real-time synchronization of document classes and background for high contrast theme
  useEffect(() => {
    if (currentThemeId === 'light_gray') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.style.backgroundColor = '#f1f5f9';
      document.body.style.color = '#0f172a';
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      const darkBgs: Record<string, string> = {
        navy_dark: '#070b14',
        slate_gray: '#0b1120',
        zinc_classic: '#09090b',
        steel_sage: '#08100e'
      };
      document.body.style.backgroundColor = darkBgs[currentThemeId] || '#070b14';
      document.body.style.color = '#f8fafc';
    }
  }, [currentThemeId]);

  const [globalSearch, setGlobalSearch] = useState('');
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [liveDate, setLiveDate] = useState(() => {
    try {
      const nowStr = new Intl.DateTimeFormat('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(new Date());
      return nowStr.charAt(0).toUpperCase() + nowStr.slice(1).replace(',', ' -');
    } catch (e) {
      return 'Lun, 16 Jun 2025 - 10:24 a.m.';
    }
  });

  useEffect(() => {
    const updateTime = () => {
      try {
        const nowStr = new Intl.DateTimeFormat('es-CO', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).format(new Date());
        setLiveDate(nowStr.charAt(0).toUpperCase() + nowStr.slice(1).replace(',', ' -'));
      } catch (e) {}
    };
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Authentication Gate for Render deployment
  if (authLoading && !erpUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center animate-pulse shadow-lg shadow-blue-500/30">
          <i className="ri-building-4-line text-2xl"></i>
        </div>
        <div className="text-center space-y-1">
          <p className="font-extrabold text-sm tracking-wide">FinteKia ERP Cloud</p>
          <p className="text-xs text-slate-400">Verificando sesión en Render...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onSuccessLogin={() => setState(prev => ({ ...prev, activeView: 'dashboard' }))} />;
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${activeThemeObj.mainBg} font-sans`}>
      
      {/* Header App bar: Clean, Organized Enterprise Top Navigation */}
      <header className={`no-print border-b flex items-center justify-between px-3 sm:px-6 py-2 shrink-0 gap-3 shadow-xs z-30 relative ${
        isLight ? 'bg-white border-slate-300 text-slate-950' : 'bg-white dark:bg-[#090e1a] border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-white'
      }`}>
        
        {/* Left Section: Brand & Context */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Logo & Brand Title */}
          <button
            onClick={() => setState((prev) => ({ ...prev, activeView: 'dashboard' }))}
            className="flex items-center gap-2.5 text-left cursor-pointer group transition-all"
            title="Ir al Menú Principal de Tarjetas"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <i className="ri-pulse-fill text-lg"></i>
            </div>
            <div className="hidden sm:block leading-tight">
              <span className={`font-black text-sm sm:text-base tracking-tight transition-colors ${
                isLight ? 'text-slate-950 font-black' : 'text-slate-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-cyan-400'
              }`}>
                FinteKia
              </span>
              <p className={`text-[10px] font-bold leading-none ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                ERP Empresarial
              </p>
            </div>
          </button>

          {/* Quick 'Volver al Menú' Button (when in sub-views) */}
          {state.activeView !== 'dashboard' && (
            <button
              onClick={() => setState((prev) => ({ ...prev, activeView: 'dashboard' }))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
                isLight 
                  ? 'bg-blue-50 hover:bg-blue-600 text-blue-900 hover:text-white border-blue-300' 
                  : 'bg-blue-600/10 hover:bg-blue-600 text-blue-600 dark:text-cyan-400 hover:text-white border-blue-500/25 hover:border-blue-500'
              }`}
              title="Regresar al menú principal"
            >
              <i className="ri-arrow-left-line text-xs"></i>
              <span className="hidden md:inline">Menú</span>
            </button>
          )}

          {/* Organization Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowCompanyDropdown(!showCompanyDropdown);
                setShowNotifMenu(false);
                setShowUserMenu(false);
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl border text-xs cursor-pointer transition-all max-w-[180px] sm:max-w-[230px] ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-950 font-black' 
                  : 'bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-semibold'
              }`}
              title="Organización activa (clic para cambiar o configurar)"
            >
              {activeCompany.logoUrl ? (
                <img 
                  src={activeCompany.logoUrl} 
                  alt="Logo" 
                  className="w-4 h-4 object-contain rounded shrink-0 bg-white dark:bg-slate-800 p-0.5" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <i className="ri-building-2-line text-blue-500 shrink-0 text-sm"></i>
              )}
              <span className={`truncate text-xs ${isLight ? 'font-black text-slate-950' : 'font-bold text-slate-800 dark:text-white'}`}>{activeCompany.name}</span>
              <i className={`ri-arrow-down-s-line text-xs shrink-0 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}></i>
            </button>

            {showCompanyDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowCompanyDropdown(false)}
                />
                <div className={`absolute left-0 mt-2 w-84 rounded-2xl border shadow-2xl p-2.5 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150 ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-white dark:bg-[#0d1424] border-slate-200 dark:border-slate-800'
                }`}>
                  <div className={`flex items-center justify-between px-2.5 py-1.5 border-b font-bold text-[10px] uppercase ${
                    isLight ? 'border-slate-200 text-slate-700' : 'border-slate-100 dark:border-slate-850 text-slate-500 dark:text-slate-400'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      <i className="ri-shield-keyhole-line text-amber-500"></i>
                      <span>Entornos Empresariales</span>
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isLight ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {state.companies.length} org.
                    </span>
                  </div>

                  {/* Security notice banner */}
                  <div className={`px-2 py-1.5 my-1 rounded-xl text-[10px] flex items-center gap-1.5 border ${
                    isLight ? 'bg-amber-100/70 border-amber-300 text-amber-950 font-medium' : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    <i className="ri-lock-password-line shrink-0 text-xs"></i>
                    <span>Cambio protegido: Requiere confirmación y autorización de administrador.</span>
                  </div>

                  <div className="max-h-56 overflow-y-auto mt-1 space-y-1">
                    {state.companies.map((co) => (
                      <button
                        key={co.id}
                        onClick={() => {
                          handleRequestSwitchCompany(co.id);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                          co.id === activeCompany.id
                            ? 'bg-blue-600 text-white font-black shadow-sm'
                            : isLight
                              ? 'hover:bg-slate-100 text-slate-900 font-bold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center overflow-hidden shrink-0 p-0.5 ${
                            isLight ? 'bg-slate-100 border-slate-300' : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750'
                          }`}>
                            {co.logoUrl ? (
                              <img src={co.logoUrl} alt={co.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <span className={`text-[10px] font-black ${isLight ? 'text-slate-800' : 'text-slate-600 dark:text-slate-300'}`}>
                                {co.name.substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="truncate">
                            <span className="block truncate font-black leading-tight">{co.name}</span>
                            <span className="text-[9.5px] font-mono opacity-80">NIT: {co.nit}</span>
                          </div>
                        </div>
                        {co.id === activeCompany.id ? (
                          <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded text-white flex items-center gap-0.5 shrink-0">
                            <i className="ri-check-line"></i> Activa
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 group-hover:text-slate-200 flex items-center gap-0.5 shrink-0">
                            <i className="ri-arrow-right-s-line"></i>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {state.currentUser.role === 'Admin' && (
                    <div className={`pt-2 mt-1.5 border-t space-y-1 ${isLight ? 'border-slate-200' : 'border-slate-100 dark:border-slate-800'}`}>
                      <button
                        onClick={() => {
                          handleCreateCompany();
                          setShowCompanyDropdown(false);
                        }}
                        className={`w-full py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isLight 
                            ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200' 
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                        }`}
                      >
                        <i className="ri-add-line"></i> Crear Nueva Organización (Desde Cero)
                      </button>
                      <button
                        onClick={() => {
                          setState(prev => ({ ...prev, activeView: 'empresa' }));
                          setShowCompanyDropdown(false);
                        }}
                        className={`w-full py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isLight 
                            ? 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200' 
                            : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60'
                        }`}
                      >
                        <i className="ri-palette-line"></i> Diseñar Factura & Logotipo
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md mx-2 relative hidden md:block">
          <div className="relative flex items-center">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
            <input
              ref={searchInputRef}
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Buscar módulos, clientes, facturas o cuentas..."
              className={`w-full pl-9 pr-14 py-1.5 rounded-xl border text-xs focus:outline-none transition-all shadow-inner ${
                isLight 
                  ? 'bg-slate-100 border-slate-300 text-slate-950 placeholder-slate-500 font-bold focus:border-blue-500' 
                  : 'bg-slate-100 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40'
              }`}
            />
            {globalSearch ? (
              <button
                onClick={() => setGlobalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                title="Limpiar búsqueda"
              >
                <i className="ri-close-line text-sm"></i>
              </button>
            ) : (
              <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded border pointer-events-none ${
                isLight ? 'text-slate-600 bg-slate-200/80 border-slate-300 font-bold' : 'text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800 border-slate-300 dark:border-slate-700/60'
              }`}>
                ⌘K
              </span>
            )}
          </div>
        </div>

        {/* Right Section: System Status & User Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          
          {/* Sub-group: Utilities (Database, Theme, Notifications, Date) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Cloud SQL / Postgres DB Status */}
            <button
              onClick={() => setState(prev => ({ ...prev, activeView: 'database' }))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all active:scale-95 ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-950' 
                  : 'bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title="Base de datos Cloud SQL PostgreSQL (clic para ver tablas e inspector)"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isCloudSqlSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'}`}></span>
              <i className="ri-database-2-line text-emerald-500 text-xs"></i>
              <span className={`font-black text-[10.5px] hidden xl:inline ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                {isCloudSqlSyncing ? 'Sincronizando' : 'Postgres DB'}
              </span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu);
                  setShowCompanyDropdown(false);
                  setShowUserMenu(false);
                }}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center relative transition-all cursor-pointer ${
                  isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900' 
                    : 'bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
                title="Notificaciones del sistema"
              >
                <i className="ri-notification-3-line text-sm"></i>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                  3
                </span>
              </button>

              {/* Notification Popover */}
              {showNotifMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)} />
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 font-bold">
                      <span>Notificaciones</span>
                      <span className="text-[10px] text-blue-500 font-mono bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">3 nuevas</span>
                    </div>
                    <div className="mt-2 space-y-2">
                      <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                        <p className="font-bold text-blue-900 dark:text-blue-300 text-[11px] flex items-center gap-1.5">
                          <i className="ri-checkbox-circle-fill text-blue-500"></i> Factura DIAN Aprobada
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">FE-1020 firmada exitosamente vía Alanube.</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                        <p className="font-bold text-emerald-900 dark:text-emerald-300 text-[11px] flex items-center gap-1.5">
                          <i className="ri-user-star-line text-emerald-500"></i> Nómina Electrónica
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Periodo actual listo para liquidación.</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40">
                        <p className="font-bold text-amber-900 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
                          <i className="ri-alert-line text-amber-500"></i> Inventario Mínimo
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Materia prima bajo stock de reorden.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Theme Selector Popover */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowThemeMenu(!showThemeMenu);
                  setShowCompanyDropdown(false);
                  setShowNotifMenu(false);
                  setShowUserMenu(false);
                }}
                className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer text-xs font-bold ${
                  currentThemeId === 'light_gray'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title={`Tema actual: ${activeThemeObj.label}. Clic para cambiar`}
              >
                <i className="ri-palette-line text-sm text-blue-500"></i>
                <span className="hidden xl:inline text-[11px] font-semibold">
                  {currentThemeId === 'light_gray' ? 'Gris Claro' : activeThemeObj.label.split(' ')[0]}
                </span>
                <i className="ri-arrow-down-s-line text-slate-400 text-xs"></i>
              </button>

              {showThemeMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowThemeMenu(false)} />
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase">
                      <span>Paleta Visual & Contraste</span>
                      <i className="ri-contrast-drop-2-line text-blue-500"></i>
                    </div>

                    <div className="mt-1.5 space-y-1">
                      {/* 1. GRIS CLARO ALTO CONTRASTE (DESTACADO) */}
                      <button
                        onClick={() => {
                          setState(prev => ({ ...prev, theme: 'light_gray' }));
                          setShowThemeMenu(false);
                          toast.success('Tema Gris Claro (Alto Contraste) activado.', 'Tema Visual');
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                          currentThemeId === 'light_gray'
                            ? 'bg-blue-600 text-white font-bold shadow-md'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#f1f5f9] border border-slate-300 flex items-center justify-center text-slate-900 font-black text-xs shrink-0 shadow-xs">
                            ☀️
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs">Gris Claro (Alto Contraste)</span>
                              <span className={`text-[8.5px] px-1 rounded uppercase font-black ${
                                currentThemeId === 'light_gray' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                              }`}>
                                Recomendado
                              </span>
                            </div>
                            <span className={`text-[9.5px] block leading-tight ${currentThemeId === 'light_gray' ? 'text-white/80' : 'text-slate-600'}`}>
                              Fondo claro limpio y textos nítidos de máxima legibilidad
                            </span>
                          </div>
                        </div>
                        {currentThemeId === 'light_gray' && <i className="ri-check-line text-base font-bold shrink-0"></i>}
                      </button>

                      {/* 2. AZUL NEON NAVY DARK */}
                      <button
                        onClick={() => {
                          setState(prev => ({ ...prev, theme: 'navy_dark' }));
                          setShowThemeMenu(false);
                          toast.info('Tema Azul Neón activado.', 'Tema Visual');
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                          currentThemeId === 'navy_dark'
                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#070b14] border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs shrink-0">
                            🌙
                          </div>
                          <div>
                            <span className="font-bold text-xs block">Azul Neón (Navy Dark)</span>
                            <span className="text-[9.5px] opacity-70 block">Estilo oscuro con acentos cian y azul</span>
                          </div>
                        </div>
                        {currentThemeId === 'navy_dark' && <i className="ri-check-line text-base shrink-0"></i>}
                      </button>

                      {/* 3. GRIS SLATE CONTABLE */}
                      <button
                        onClick={() => {
                          setState(prev => ({ ...prev, theme: 'slate_gray' }));
                          setShowThemeMenu(false);
                          toast.info('Tema Gris Slate activado.', 'Tema Visual');
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                          currentThemeId === 'slate_gray'
                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#0f172a] border border-slate-700 flex items-center justify-center text-blue-400 text-xs shrink-0">
                            🌑
                          </div>
                          <div>
                            <span className="font-bold text-xs block">Gris Slate Contable</span>
                            <span className="text-[9.5px] opacity-70 block">Tonalidad grafito oscuro corporativo</span>
                          </div>
                        </div>
                        {currentThemeId === 'slate_gray' && <i className="ri-check-line text-base shrink-0"></i>}
                      </button>

                      {/* 4. ZINC CLASICO */}
                      <button
                        onClick={() => {
                          setState(prev => ({ ...prev, theme: 'zinc_classic' }));
                          setShowThemeMenu(false);
                          toast.info('Tema Zinc Clásico activado.', 'Tema Visual');
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                          currentThemeId === 'zinc_classic'
                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#18181b] border border-zinc-700 flex items-center justify-center text-zinc-300 text-xs shrink-0">
                            🏢
                          </div>
                          <div>
                            <span className="font-bold text-xs block">Zinc Puro Oficina</span>
                            <span className="text-[9.5px] opacity-70 block">Escala de grises minimalista</span>
                          </div>
                        </div>
                        {currentThemeId === 'zinc_classic' && <i className="ri-check-line text-base shrink-0"></i>}
                      </button>

                      {/* 5. VERDE SABIO CONTABLE */}
                      <button
                        onClick={() => {
                          setState(prev => ({ ...prev, theme: 'steel_sage' }));
                          setShowThemeMenu(false);
                          toast.info('Tema Verde Sabio activado.', 'Tema Visual');
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                          currentThemeId === 'steel_sage'
                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#0d1715] border border-emerald-900 flex items-center justify-center text-emerald-400 text-xs shrink-0">
                            🌲
                          </div>
                          <div>
                            <span className="font-bold text-xs block">Verde Sabio Contable</span>
                            <span className="text-[9.5px] opacity-70 block">Tono esmeralda descansado para la vista</span>
                          </div>
                        </div>
                        {currentThemeId === 'steel_sage' && <i className="ri-check-line text-base shrink-0"></i>}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Live Date / Time Widget */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 text-[11px] font-mono border border-slate-200 dark:border-slate-800">
              <i className="ri-calendar-line text-blue-500 text-xs"></i>
              <span>{liveDate}</span>
            </div>
          </div>

          {/* Vertical Separator */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block"></div>

          {/* Unified Professional User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowCompanyDropdown(false);
                setShowNotifMenu(false);
              }}
              className="flex items-center gap-2 p-1 sm:px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer text-left group"
              title="Perfil de Usuario y Configuración de Sesión"
              id="header-user-menu-trigger"
            >
              {/* User Avatar with status dot */}
              <div className="relative shrink-0">
                {firebaseUser?.photoURL ? (
                  <img src={firebaseUser.photoURL} alt={firebaseUser.displayName || 'User'} className="w-7 h-7 rounded-lg border border-cyan-400 shadow-sm" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 text-white font-black flex items-center justify-center text-xs shadow-sm select-none">
                    {(erpUser?.name || firebaseUser?.displayName || state.currentUser.name || 'W')[0].toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950"></span>
              </div>

              {/* Name & Role Badge (Visible on sm/md and above) */}
              <div className="hidden sm:block leading-tight pr-1">
                <span className="font-bold text-xs text-slate-800 dark:text-white block truncate max-w-[130px] group-hover:text-blue-500 dark:group-hover:text-cyan-400 transition-colors">
                  {erpUser?.name || firebaseUser?.displayName || state.currentUser.name}
                </span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-cyan-400">
                  {state.currentUser.role}
                </span>
              </div>

              <i className="ri-arrow-down-s-line text-slate-400 text-xs shrink-0"></i>
            </button>

            {/* Premium User Menu Popover */}
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#0c1324] border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 text-xs space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  
                  {/* User Profile Card Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 text-white font-black flex items-center justify-center text-sm shadow-md shrink-0">
                      {(erpUser?.name || firebaseUser?.displayName || state.currentUser.name || 'W')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {erpUser?.name || firebaseUser?.displayName || state.currentUser.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        {erpUser?.email || firebaseUser?.email || state.currentUser.email}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-cyan-400 border border-blue-500/20">
                        {state.currentUser.role} · Activo
                      </span>
                    </div>
                  </div>

                  {/* Role Selector Section */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Cambiar Rol Activo:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['Admin', 'Contador', 'Vendedor', 'Operario'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setState(prev => ({ ...prev, currentUser: { ...prev.currentUser, role: r } }));
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-left font-bold text-[11px] flex items-center justify-between transition-all cursor-pointer ${
                            state.currentUser.role === r
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <span>{r}</span>
                          {state.currentUser.role === r && <i className="ri-check-line text-xs"></i>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Shortcuts */}
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => {
                        setState(prev => ({ ...prev, activeView: 'usuarios' }));
                        setShowUserMenu(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-2 cursor-pointer transition-colors"
                      id="menu-btn-gestion-usuarios"
                    >
                      <i className="ri-team-line text-blue-500"></i>
                      <span>Gestión de Usuarios</span>
                    </button>
                    <button
                      onClick={() => {
                        setState(prev => ({ ...prev, activeView: 'alanube_config' }));
                        setShowUserMenu(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-2 cursor-pointer transition-colors"
                      id="menu-btn-config-alanube"
                    >
                      <i className="ri-cloud-line text-cyan-400"></i>
                      <span>Configuración Alanube DIAN</span>
                    </button>
                  </div>

                  {/* Sign Out Button */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOutUser();
                      }}
                      className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                      id="btn-header-signout"
                    >
                      <i className="ri-logout-box-r-line"></i>
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>

                </div>
              </>
            )}
          </div>

        </div>
      </header>

      {/* Main Workspace (Full width, no sidebar!) */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* Breadcrumb back to menu bar when viewing any module */}
          {state.activeView !== 'dashboard' && !state.kioskMode && (
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <button
                onClick={() => setState((prev) => ({ ...prev, activeView: 'dashboard' }))}
                className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors cursor-pointer group"
              >
                <i className="ri-arrow-left-line group-hover:-translate-x-1 transition-transform"></i>
                <i className="ri-layout-grid-line"></i>
                <span>Volver al Menú Principal (Portal)</span>
              </button>
              
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span>FinteKia</span>
                <span>/</span>
                <span className="text-slate-800 dark:text-white font-bold uppercase">{state.activeView.replace('_', ' ')}</span>
              </div>
            </div>
          )}
          
          {state.kioskMode ? (
            <KioskView
              productionOrders={state.productionOrders}
              products={state.products}
              boms={state.boms}
              updateOrderStatus={handleUpdateOrderStatus}
              onExitKiosk={() => setState(prev => ({ ...prev, kioskMode: false }))}
            />
          ) : (
            <>
              {/* Modular Views Router: Purely isolated data per active company */}
              {state.activeView === 'dashboard' && (
                <DashboardView
                  vouchers={activeVouchers}
                  terceros={activeTerceros}
                  products={activeProducts}
                  setActiveView={(v) => setState((prev) => ({ ...prev, activeView: v }))}
                  onQuickAction={() => {}}
                  formatCOP={formatCOP}
                  theme={currentThemeId}
                  boms={activeBoms}
                  inventory={activeInventory}
                  sales={salesSum}
                  expenses={expensesSum}
                  profit={netOperacionProfit}
                  margin={netMarginVal}
                  clientsCount={clientsList.length}
                  suppliersCount={activeTerceros.filter(t => t.roles.includes('proveedor')).length}
                  currentUser={state.currentUser}
                  searchQuery={globalSearch}
                  currentCompany={activeCompany}
                  onUpdateCompany={handleUpdateCompany}
                  techServiceOrders={activeTechServiceOrders}
                />
              )}

              {state.activeView === 'servicios_tech' && (
                <TechServicesView
                  products={activeProducts}
                  terceros={activeTerceros}
                  techServiceOrders={activeTechServiceOrders}
                  onAddServiceOrder={handleAddTechOrder}
                  onUpdateServiceOrder={handleUpdateTechOrder}
                  onUpdateServiceOrderStatus={handleUpdateTechOrderStatus}
                  onAddProduct={handleAddProduct}
                  setActiveView={(v) => setState((prev) => ({ ...prev, activeView: v }))}
                  currentCompany={activeCompany}
                  onUpdateCompany={handleUpdateCompany}
                  theme={currentThemeId}
                  formatCOP={formatCOP}
                />
              )}

              {state.activeView === 'terceros' && (
                <TercerosView
                  currentCompany={activeCompany}
                  terceros={activeTerceros}
                  addTercero={handleAddTercero}
                  updateTercero={handleUpdateTercero}
                  deleteTercero={handleDeleteTercero}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'productos' && (
                <ProductsView
                  products={activeProducts}
                  inventory={activeInventory}
                  warehouses={activeWarehouses}
                  addProduct={handleAddProduct}
                  updateProduct={handleUpdateProduct}
                  deleteProduct={handleDeleteProduct}
                  setActiveView={(v) => setState((prev) => ({ ...prev, activeView: v }))}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'bodegas' && (
                <WarehousesAndPlantView
                  warehouses={activeWarehouses}
                  assets={state.assets}
                  inventory={activeInventory}
                  products={activeProducts}
                  inventoryMovements={state.inventoryMovements}
                  addWarehouse={handleAddWarehouse}
                  updateWarehouse={handleUpdateWarehouse}
                  deleteWarehouse={handleDeleteWarehouse}
                  addAsset={handleAddAsset}
                  updateAsset={handleUpdateAsset}
                  deleteAsset={handleDeleteAsset}
                  transferStock={handleTransferStock}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'facturacion' && (
                <InvoicingView
                  currentCompany={activeCompany}
                  vouchers={activeVouchers}
                  terceros={activeTerceros}
                  products={activeProducts}
                  inventory={activeInventory}
                  addVoucher={handleAddVoucher}
                  updateInventory={handleUpdateInventory}
                  puc={state.puc}
                  addInventoryMovement={handleAddInventoryMovement}
                  theme={currentThemeId}
                  updateCompany={handleUpdateCompany}
                  onOpenAlanubeConfig={() => setState((prev) => ({ ...prev, activeView: 'alanube_config' }))}
                  addTercero={handleAddTercero}
                  currentUser={state.currentUser}
                  onReturnToMenu={() => setState((prev) => ({ ...prev, activeView: 'dashboard' }))}
                  setActiveView={(v) => setState((prev) => ({ ...prev, activeView: v }))}
                />
              )}

              {state.activeView === 'compras' && (
                <PurchasesView
                  currentCompany={activeCompany}
                  vouchers={activeVouchers}
                  terceros={activeTerceros}
                  products={activeProducts}
                  inventory={activeInventory}
                  warehouses={activeWarehouses}
                  puc={state.puc}
                  addVoucher={handleAddVoucher}
                  updateInventory={handleUpdateInventory}
                  addInventoryMovement={handleAddInventoryMovement}
                  updateProduct={handleUpdateProduct}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'ordenes_prod' && (
                activeCompany.enableProduction === false ? (
                  <div className="p-8 max-w-xl mx-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl my-8">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-400/20 flex items-center justify-center text-2xl mx-auto">
                      <i className="ri-tools-fill"></i>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Módulo de Producción Industrial (MRP) Desactivado</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      La empresa <strong>{activeCompany.name}</strong> está configurada en giro <strong>{activeCompany.businessType?.replace('_', ' ') || 'Comercial / Servicios'}</strong>. Cada empresa activa o desactiva su módulo de producción de forma independiente.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
                      <button
                        onClick={() => setState(prev => ({ ...prev, activeView: 'empresa' }))}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <i className="ri-settings-4-line"></i> Configurar Módulos en Empresa
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Desea activar de forma confirmada el módulo de producción industrial (MRP) para "${activeCompany.name}"?`)) {
                            handleUpdateCompany({ ...activeCompany, enableProduction: true });
                            toast.success(`Módulo de Producción habilitado para "${activeCompany.name}".`, 'Configuración Guardada');
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <i className="ri-check-line"></i> Habilitar para esta Empresa (Confirmar)
                      </button>
                    </div>
                  </div>
                ) : (
                  <ManufacturingView
                    boms={activeBoms}
                    products={activeProducts}
                    productionOrders={activeProductionOrders}
                    inventory={activeInventory}
                    warehouses={activeWarehouses}
                    addProductionOrder={handleAddProductionOrder}
                    updateOrderStatus={handleUpdateOrderStatus}
                    addQualityInspection={handleAddQualityInspection}
                    onOpenKiosk={() => setState(prev => ({ ...prev, kioskMode: true }))}
                  />
                )
              )}

              {state.activeView === 'mrp' && (
                activeCompany.enableProduction === false ? (
                  <div className="p-8 max-w-xl mx-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl my-8">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-400/20 flex items-center justify-center text-2xl mx-auto">
                      <i className="ri-cpu-line"></i>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Planificación de Requerimientos (MRP) en Pausa</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      El módulo de cálculo de materiales está desactivado para <strong>{activeCompany.name}</strong> según su actividad configurada.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
                      <button
                        onClick={() => setState(prev => ({ ...prev, activeView: 'empresa' }))}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all"
                      >
                        Gestionar en Datos de Empresa
                      </button>
                    </div>
                  </div>
                ) : (
                  <PlanningView
                    boms={activeBoms}
                    products={activeProducts}
                    productionOrders={activeProductionOrders}
                    inventory={activeInventory}
                    terceros={activeTerceros}
                    warehouses={activeWarehouses}
                    addProductionOrder={handleAddProductionOrder}
                    addVoucher={handleAddVoucher}
                    updateInventory={handleUpdateInventory}
                    theme={currentThemeId}
                  />
                )
              )}

              {state.activeView === 'calidad' && (
                activeCompany.enableProduction === false ? (
                  <div className="p-8 max-w-xl mx-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl my-8">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-400/20 flex items-center justify-center text-2xl mx-auto">
                      <i className="ri-shield-check-line"></i>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Inspección de Calidad de Producción</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Este módulo audita lotes de manufactura industrial. Para servicios y garantías técnicas, utilice el módulo de Servicios TI.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
                      <button
                        onClick={() => setState(prev => ({ ...prev, activeView: 'empresa' }))}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer transition-all"
                      >
                        Gestionar en Datos de Empresa
                      </button>
                    </div>
                  </div>
                ) : (
                  <QualityView
                    qualityInspections={state.qualityInspections}
                    productionOrders={activeProductionOrders}
                    boms={activeBoms}
                    products={activeProducts}
                    addQualityInspection={handleAddQualityInspection}
                    updateOrderStatus={handleUpdateOrderStatus}
                    theme={currentThemeId}
                  />
                )
              )}

              {state.activeView === 'comprobantes' && (
                <VouchersView
                  currentCompany={activeCompany}
                  vouchers={activeVouchers}
                  puc={state.puc}
                  costCenters={state.costCenters}
                  terceros={activeTerceros}
                  addVoucher={handleAddVoucher}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'bancos' && (
                <BanksView
                  bankAccounts={activeBankAccounts}
                  bankTransactions={state.bankTransactions}
                  vouchers={activeVouchers}
                  puc={state.puc}
                  terceros={activeTerceros}
                  addVoucher={handleAddVoucher}
                  addBankAccount={handleAddBankAccount}
                  addBankTransaction={handleAddBankTransaction}
                  reconcileTransaction={handleReconcileTransaction}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'impuestos' && (
                <TaxesView
                  vouchers={activeVouchers}
                  puc={state.puc}
                  terceros={activeTerceros}
                  companies={state.companies}
                  currentCompanyId={state.currentCompanyId}
                  addVoucher={handleAddVoucher}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'presupuestos' && (
                <BudgetsView
                  budgets={state.budgets}
                  costCenters={state.costCenters}
                  puc={state.puc}
                  vouchers={activeVouchers}
                  addBudget={handleAddBudget}
                  deleteBudget={handleDeleteBudget}
                  updateBudget={handleUpdateBudget}
                  transferBudget={handleTransferBudget}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'cartera' && (
                <PortfolioView
                  vouchers={activeVouchers}
                  terceros={activeTerceros}
                  bankAccounts={activeBankAccounts}
                  puc={state.puc}
                  addVoucher={handleAddVoucher}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'nomina' && (
                <PayrollView
                  companies={state.companies}
                  currentCompanyId={state.currentCompanyId}
                  terceros={activeTerceros}
                  bankAccounts={activeBankAccounts}
                  puc={state.puc}
                  payrollLogs={state.payrollLogs || []}
                  onAddTercero={handleAddTercero}
                  onUpdateTercero={handleUpdateTercero}
                  onDeleteTercero={handleDeleteTercero}
                  onAddPayrollLog={handleAddPayrollLog}
                  onUpdatePayrollLogStatus={handleUpdatePayrollLogStatus}
                  addVoucher={handleAddVoucher}
                  addBankTransaction={handleAddBankTransaction}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'ai_advisor' && (
                <AIAdvisorView
                  currentCompany={activeCompany}
                  vouchers={activeVouchers}
                  inventory={activeInventory}
                  products={activeProducts}
                />
              )}

              {(state.activeView === 'usuarios' || state.activeView === 'users') && (
                <UsersView
                  currentUser={state.currentUser}
                  switchCurrentUser={(role) => setState((prev) => ({ ...prev, currentUser: { ...prev.currentUser, role } }))}
                  onUpdateCurrentUserFull={handleUpdateCurrentUserFull}
                  theme={currentThemeId}
                  usersList={state.users || []}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                />
              )}

              {state.activeView === 'empresa' && (
                <CompanyView
                  currentCompany={activeCompany}
                  updateCompany={handleUpdateCompany}
                  theme={currentThemeId}
                  companies={state.companies}
                  onSwitchCompany={handleRequestSwitchCompany}
                  onCreateCompany={handleCreateCompany}
                />
              )}

              {(state.activeView === 'alanube_config' || state.activeView === 'alanube' || state.activeView === 'dian_habilitacion' || state.activeView === 'habilitacion') && (
                <AlanubeConfigView
                  currentCompany={activeCompany}
                  updateCompany={handleUpdateCompany}
                  theme={currentThemeId}
                  initialTab={(state.activeView === 'dian_habilitacion' || state.activeView === 'habilitacion') ? 'habilitation' : 'credentials'}
                  onNavigateToInvoicing={() => setState((prev) => ({ ...prev, activeView: 'facturacion' }))}
                  onReturnToMenu={() => setState((prev) => ({ ...prev, activeView: 'dashboard' }))}
                />
              )}

              {state.activeView === 'database' && (
                <DatabaseView theme={currentThemeId} />
              )}

              {(state.activeView === 'seguridad' || state.activeView === 'respaldos') && (
                <SecurityBackupView
                  state={state}
                  setState={setState}
                  theme={currentThemeId}
                  onNavigateToView={(view) => setState(prev => ({ ...prev, activeView: view }))}
                />
              )}
            </>
          )}

        </main>

      {showCreateCompanyModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-display font-extrabold text-sm flex items-center gap-2 text-slate-900">
                <i className="ri-building-2-line text-lg text-amber-500"></i> Registrar Nueva Empresa / Organización
              </h3>
              <button 
                type="button" 
                onClick={() => setShowCreateCompanyModal(false)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
                id="close-create-company-modal"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveNewCompany} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              <p className="text-slate-500 leading-relaxed">
                Configure los parámetros e información legal de la nueva organización. Al confirmarse, se habilitará un ambiente contable, tributario y de facturación independiente para esta empresa.
              </p>

              {/* 1. MODO DE DATOS INICIALES (DESDE CERO O DEMO) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1.5">
                  <i className="ri-database-2-line text-blue-600"></i> Carga de Datos Iniciales:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCompDataMode('clean')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      newCompDataMode === 'clean'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">✨</span>
                      <div>
                        <p className="font-bold text-xs text-slate-900">Desde CERO (Limpio)</p>
                        <p className="text-[10px] text-slate-500 font-normal mt-0.5">0 productos, 0 comprobantes, sin datos demo.</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewCompDataMode('demo')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      newCompDataMode === 'demo'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">📦</span>
                      <div>
                        <p className="font-bold text-xs text-slate-900">Plantilla de Demostración</p>
                        <p className="text-[10px] text-slate-500 font-normal mt-0.5">Carga catálogo base para pruebas.</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. GIRO & ACTIVACIÓN DEL MÓDULO DE PRODUCCIÓN (MRP) */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-amber-900 uppercase flex items-center gap-1.5">
                    <i className="ri-settings-4-line text-amber-600"></i> Giro & Activación de Módulos Operativos:
                  </label>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    newCompEnableProduction ? 'bg-amber-500/20 text-amber-900 border border-amber-300' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {newCompEnableProduction ? 'MRP Activo' : 'Sin Producción'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setNewCompBusinessType('comercial');
                      setNewCompEnableProduction(false);
                      setNewCompEnableTechServices(false);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      newCompBusinessType === 'comercial' ? 'bg-amber-600 text-white font-bold border-amber-600' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Comercial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCompBusinessType('tecnologia_servicios');
                      setNewCompEnableProduction(false);
                      setNewCompEnableTechServices(true);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      newCompBusinessType === 'tecnologia_servicios' ? 'bg-amber-600 text-white font-bold border-amber-600' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Servicios TI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCompBusinessType('produccion');
                      setNewCompEnableProduction(true);
                      setNewCompEnableTechServices(false);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      newCompBusinessType === 'produccion' ? 'bg-amber-600 text-white font-bold border-amber-600' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Manufactura MRP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCompBusinessType('mixto');
                      setNewCompEnableProduction(true);
                      setNewCompEnableTechServices(true);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      newCompBusinessType === 'mixto' ? 'bg-amber-600 text-white font-bold border-amber-600' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Mixta (Todo)
                  </button>
                </div>

                <div className="pt-2 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white border border-amber-100">
                    <input
                      type="checkbox"
                      checked={newCompEnableProduction}
                      onChange={(e) => setNewCompEnableProduction(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800 text-[11px]">Habilitar Módulo Producción (MRP)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white border border-amber-100">
                    <input
                      type="checkbox"
                      checked={newCompEnableTechServices}
                      onChange={(e) => setNewCompEnableTechServices(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800 text-[11px]">Habilitar Servicios Técnicos (OT)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase">Razón Social *</label>
                  <input
                    type="text"
                    required
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    placeholder="Ej. Industrias Colombia S.A.S."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500"
                    id="new-company-name-input"
                  />
                </div>

                {/* NIT */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase">NIT (Con Dígito de Verificación) *</label>
                  <input
                    type="text"
                    required
                    value={newCompNit}
                    onChange={(e) => setNewCompNit(e.target.value)}
                    placeholder="Ej. 901.444.020-5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500"
                    id="new-company-nit-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Slogan */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-455 uppercase">Slogan / Sucursal</label>
                  <input
                    type="text"
                    value={newCompSlogan}
                    onChange={(e) => setNewCompSlogan(e.target.value)}
                    placeholder="Ej. Línea Industrial Principal"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none text-slate-800 text-xs focus:bg-white focus:border-indigo-500"
                    id="new-company-slogan-input"
                  />
                </div>

                {/* Dirección */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-455 uppercase">Dirección Comercial</label>
                  <input
                    type="text"
                    value={newCompAddress}
                    onChange={(e) => setNewCompAddress(e.target.value)}
                    placeholder="Ej. Calle 100 # 15-22, Bogotá"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none text-slate-800 text-xs focus:bg-white focus:border-indigo-500"
                    id="new-company-address-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Régimen */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-455 uppercase">Régimen DIAN</label>
                  <select
                    value={newCompRegimen}
                    onChange={(e) => setNewCompRegimen(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500"
                    id="new-company-regimen-select"
                  >
                    <option value="responsable">Responsable de IVA</option>
                    <option value="no_responsable">No Responsable</option>
                    <option value="gran_contribuyente">Gran Contribuyente</option>
                    <option value="simple">Simple de Tributación</option>
                  </select>
                </div>

                {/* Moneda */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-455 uppercase">Moneda Base</label>
                  <select
                    value={newCompCurrency}
                    onChange={(e) => setNewCompCurrency(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500"
                    id="new-company-currency-select"
                  >
                    <option value="COP">COP ($ - Col)</option>
                    <option value="USD">USD ($ - Amer)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                  </select>
                </div>

                {/* Año Fiscal */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-455 uppercase">Año Fiscal</label>
                  <input
                    type="number"
                    value={newCompPeriod}
                    onChange={(e) => setNewCompPeriod(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500"
                    id="new-company-period-input"
                  />
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-3">
                <h4 className="font-bold text-xs text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                  <i className="ri-user-heart-line text-amber-600"></i> Configuración de Nómina Colombiana
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-amber-800 uppercase">SMMLV Vigente (COP)</label>
                    <input
                      type="number"
                      value={newCompSmmlv}
                      onChange={(e) => setNewCompSmmlv(Number(e.target.value))}
                      placeholder="Ej. 1423500"
                      className="w-full bg-white border border-amber-200 rounded-lg p-2 font-mono font-bold text-slate-800 outline-none focus:border-amber-400"
                      id="new-company-smmlv-input"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-amber-800 uppercase">Auxilio de Transporte (COP)</label>
                    <input
                      type="number"
                      value={newCompAuxTransporte}
                      onChange={(e) => setNewCompAuxTransporte(Number(e.target.value))}
                      placeholder="Ej. 172000"
                      className="w-full bg-white border border-amber-200 rounded-lg p-2 font-mono font-bold text-slate-800 outline-none focus:border-amber-400"
                      id="new-company-auxtrans-input"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-amber-700 italic leading-snug">
                  * Estos parámetros se calcularán de forma proporcional para el personal según el salario devengado e ingresado en su ficha contractual en este ambiente.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t shrink-0">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-5 py-2.5 rounded-xl cursor-pointer shadow flex items-center gap-1.5 transition-all"
                  id="confirm-create-company-btn"
                >
                  <i className="ri-checkbox-circle-line"></i> Guardar Empresa y Activar
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowCreateCompanyModal(false)}
                  className="bg-white border rounded-xl px-4 py-2.5 cursor-pointer text-slate-500 hover:text-slate-800 font-semibold transition-all"
                  id="cancel-create-company-btn"
                >
                  Cancelar
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* SECURITY MODAL: CONTROL DE ACCESO Y CONFIRMACIÓN DE CAMBIO DE EMPRESA */}
      {showSwitchConfirmModal && pendingTargetCompany && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0d1424] text-slate-800 dark:text-slate-100 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                  <i className="ri-shield-keyhole-line text-lg"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Confirmar Cambio de Organización</h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400">Control de Acceso Multiempresa</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSwitchConfirmModal(false);
                  setPendingTargetCompany(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Empresa Actual:</span>
                  <span className="font-bold text-slate-800 dark:text-white truncate max-w-[200px]">{activeCompany.name}</span>
                </div>
                <div className="flex items-center justify-center text-slate-400">
                  <i className="ri-arrow-down-line text-sm"></i>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Empresa Destino:</span>
                  <span className="font-black text-blue-600 dark:text-cyan-400 truncate max-w-[200px]">{pendingTargetCompany.name}</span>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px]">
                <strong>ADVERTENCIA:</strong> Esta acción cambiará el contexto de trabajo en todas las pantallas. Las facturas emitidas, inventarios, bodegas y cuentas bancarias pertenecerán exclusivamente a <strong>{pendingTargetCompany.name}</strong>.
              </p>

              {/* Role authorization check */}
              {state.currentUser.role !== 'Admin' && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold text-xs">
                    <i className="ri-lock-2-line"></i>
                    <span>Autorización de Administrador Requerida</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug">
                    Su perfil actual es <strong>{state.currentUser.role}</strong>. Para alternar entre empresas debe ingresar el PIN de autorización de Administrador.
                  </p>
                  <div>
                    <input
                      type="password"
                      maxLength={6}
                      value={switchAdminPin}
                      onChange={(e) => {
                        setSwitchAdminPin(e.target.value);
                        setSwitchPinError('');
                      }}
                      placeholder="Ingrese PIN (Predeterminado: 1234)"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center font-mono font-bold text-sm tracking-widest text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                    {switchPinError && (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1 text-center">
                        {switchPinError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowSwitchConfirmModal(false);
                  setPendingTargetCompany(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitchCompany}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5"
              >
                <i className="ri-check-line"></i> Confirmar y Cambiar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

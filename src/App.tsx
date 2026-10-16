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
  const [newCompName, setNewCompName] = useState('');
  const [newCompNit, setNewCompNit] = useState('');
  const [newCompSlogan, setNewCompSlogan] = useState('Línea o Sucursal Industrial Nueva');
  const [newCompAddress, setNewCompAddress] = useState('Calle 100 # 15-22, Bogotá D.C., Colombia');
  const [newCompRegimen, setNewCompRegimen] = useState<Company['regimen']>('responsable');
  const [newCompCurrency, setNewCompCurrency] = useState<'COP' | 'USD' | 'EUR'>('COP');
  const [newCompPeriod, setNewCompPeriod] = useState(2026);
  const [newCompSmmlv, setNewCompSmmlv] = useState(1423500); // Standard Colombian 2026 params
  const [newCompAuxTransporte, setNewCompAuxTransporte] = useState(172000);

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

  // State manipulation triggers (actions)
  const handleSwitchCompany = (id: string) => {
    setState((prev) => ({
      ...prev,
      currentCompanyId: id
    }));
  };

  const handleCreateCompany = () => {
    setNewCompName('');
    setNewCompNit('');
    setNewCompSlogan('Línea o Sucursal Industrial Nueva');
    setNewCompAddress('Calle 100 # 15-22, Bogotá D.C., Colombia');
    setNewCompRegimen('responsable');
    setNewCompCurrency('COP');
    setNewCompPeriod(2026);
    setNewCompSmmlv(1423500);
    setNewCompAuxTransporte(172000);
    
    setShowCreateCompanyModal(true);
  };

  const handleSaveNewCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim() || !newCompNit.trim()) {
      toast.warning("Por favor ingrese la Razón Social y el NIT de la organización.", "Datos Obligatorios");
      return;
    }

    const newCompany: Company = {
      id: `co-${Date.now()}`,
      name: newCompName.trim(),
      nit: newCompNit.trim(),
      slogan: newCompSlogan.trim(),
      address: newCompAddress.trim(),
      regimen: newCompRegimen,
      currency: newCompCurrency,
      period: newCompPeriod,
      payrollParameters: {
        smmlv: Number(newCompSmmlv) || 1423500,
        auxTransporte: Number(newCompAuxTransporte) || 172000
      }
    };

    setState((prev) => ({
      ...prev,
      companies: [...prev.companies, newCompany],
      currentCompanyId: newCompany.id,
      activeView: 'dashboard'
    }));

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
      items: p.items
    };

    setState((prev) => ({
      ...prev,
      vouchers: [...prev.vouchers, newVoucher]
    }));
  };

  const handleAddTechOrder = (order: Omit<TechServiceOrder, 'id'>) => {
    const newOrder: TechServiceOrder = {
      id: `ot-${Date.now()}`,
      ...order
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
      ...ba
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
            avgCost: prod ? prod.cost : 5000
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
        overheadHourlyRate: p.overheadHourlyRate
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
      ...newTerData
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
      id: `p-${Date.now()}`
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
      id: `wh-${Date.now()}`
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
          avgCost: cost
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
        userId: 'Admin Contable'
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

  // Calculations for active metrics totals
  const salesVouchersArr = state.vouchers.filter((v) => v.type === 'venta');
  const salesSum = salesVouchersArr.reduce((acc, v) => acc + v.total, 0);

  const purchaseVouchersArr = state.vouchers.filter((v) => v.type === 'compra');
  const expensesSum = purchaseVouchersArr.reduce((acc, v) => acc + v.total, 0);

  const netOperacionProfit = salesSum - expensesSum;
  const netMarginVal = salesSum > 0 ? `${Math.round((netOperacionProfit / salesSum) * 100)}%` : '100%';

  const clientsList = state.terceros.filter((t) => t.roles.includes('cliente'));

  const currentThemeId = state.theme || 'navy_dark';
  const activeThemeObj = THEMES_MAP[currentThemeId] || THEMES_MAP.navy_dark;

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
      <header className="no-print border-b flex items-center justify-between px-3 sm:px-6 py-2 shrink-0 gap-3 shadow-xs bg-white dark:bg-[#090e1a] border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-white z-30 relative">
        
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
              <span className="font-black text-sm sm:text-base tracking-tight text-slate-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-cyan-400 transition-colors">
                FinteKia
              </span>
              <p className="text-[10px] text-slate-400 font-medium leading-none">
                ERP Empresarial
              </p>
            </div>
          </button>

          {/* Quick 'Volver al Menú' Button (when in sub-views) */}
          {state.activeView !== 'dashboard' && (
            <button
              onClick={() => setState((prev) => ({ ...prev, activeView: 'dashboard' }))}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-600 dark:text-cyan-400 hover:text-white border border-blue-500/25 hover:border-blue-500 text-xs font-bold transition-all cursor-pointer active:scale-95"
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
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer transition-all max-w-[170px] sm:max-w-[210px]"
              title="Organización activa (clic para cambiar)"
            >
              <i className="ri-building-2-line text-blue-500 shrink-0 text-sm"></i>
              <span className="truncate font-bold text-slate-800 dark:text-white text-xs">{activeCompany.name}</span>
              <i className="ri-arrow-down-s-line text-slate-400 text-xs shrink-0"></i>
            </button>

            {showCompanyDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowCompanyDropdown(false)}
                />
                <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-400 text-[10px] uppercase">
                    <span>Organizaciones</span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono">{state.companies.length}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto mt-1 space-y-1">
                    {state.companies.map((co) => (
                      <button
                        key={co.id}
                        onClick={() => {
                          handleSwitchCompany(co.id);
                          setShowCompanyDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                          co.id === activeCompany.id
                            ? 'bg-blue-600 text-white font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="truncate">
                          <span className="block truncate font-semibold">{co.name}</span>
                          <span className="text-[10px] font-mono opacity-70">NIT: {co.nit}</span>
                        </div>
                        {co.id === activeCompany.id && <i className="ri-check-line text-sm shrink-0"></i>}
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        handleCreateCompany();
                        setShowCompanyDropdown(false);
                      }}
                      className="w-full py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                    >
                      <i className="ri-add-line"></i> Crear Organización
                    </button>
                  </div>
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
              className="w-full pl-9 pr-14 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all shadow-inner"
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
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700/60 pointer-events-none">
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer transition-all active:scale-95"
              title="Base de datos Cloud SQL PostgreSQL (clic para ver tablas e inspector)"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isCloudSqlSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'}`}></span>
              <i className="ri-database-2-line text-emerald-400 text-xs"></i>
              <span className="font-bold text-[10.5px] text-emerald-400 hidden xl:inline">
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
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center relative transition-all cursor-pointer"
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

            {/* Theme Quick Toggle */}
            <button
              onClick={() => {
                const themes: Array<keyof typeof THEMES_MAP> = ['navy_dark', 'slate_gray', 'zinc_classic', 'steel_sage', 'light_gray'];
                const nextIdx = (themes.indexOf(currentThemeId) + 1) % themes.length;
                setState(prev => ({ ...prev, theme: themes[nextIdx] }));
              }}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              title={`Tema: ${activeThemeObj.label}. Clic para cambiar`}
            >
              <i className="ri-palette-line text-sm"></i>
            </button>

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
                        setState(prev => ({ ...prev, activeView: 'users' }));
                        setShowUserMenu(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <i className="ri-team-line text-blue-500"></i>
                      <span>Gestión de Usuarios</span>
                    </button>
                    <button
                      onClick={() => {
                        setState(prev => ({ ...prev, activeView: 'alanube' }));
                        setShowUserMenu(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-2 cursor-pointer transition-colors"
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
              {/* Modular Views Router: DashboardView now has the complete Portal Menu and Privacy Shield! */}
              {state.activeView === 'dashboard' && (
                <DashboardView
                  vouchers={state.vouchers}
                  terceros={state.terceros}
                  products={state.products}
                  setActiveView={(v) => setState((prev) => ({ ...prev, activeView: v }))}
                  onQuickAction={() => {}}
                  formatCOP={formatCOP}
                  theme={currentThemeId}
                  boms={state.boms}
                  inventory={state.inventory}
                  sales={salesSum}
                  expenses={expensesSum}
                  profit={netOperacionProfit}
                  margin={netMarginVal}
                  clientsCount={clientsList.length}
                  suppliersCount={state.terceros.filter(t => t.roles.includes('proveedor')).length}
                  currentUser={state.currentUser}
                  searchQuery={globalSearch}
                  currentCompany={activeCompany}
                  onUpdateCompany={handleUpdateCompany}
                  techServiceOrders={state.techServiceOrders}
                />
              )}

              {state.activeView === 'servicios_tech' && (
                <TechServicesView
                  products={state.products}
                  terceros={state.terceros}
                  techServiceOrders={state.techServiceOrders}
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
                  terceros={state.terceros}
                  addTercero={handleAddTercero}
                  updateTercero={handleUpdateTercero}
                  deleteTercero={handleDeleteTercero}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'productos' && (
                <ProductsView
                  products={state.products}
                  inventory={state.inventory}
                  warehouses={state.warehouses}
                  addProduct={handleAddProduct}
                  updateProduct={handleUpdateProduct}
                  deleteProduct={handleDeleteProduct}
                  setActiveView={(v) => setState((prev) => ({ ...prev, activeView: v }))}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'bodegas' && (
                <WarehousesAndPlantView
                  warehouses={state.warehouses}
                  assets={state.assets}
                  inventory={state.inventory}
                  products={state.products}
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
                  vouchers={state.vouchers}
                  terceros={state.terceros}
                  products={state.products}
                  inventory={state.inventory}
                  addVoucher={handleAddVoucher}
                  updateInventory={handleUpdateInventory}
                  puc={state.puc}
                  addInventoryMovement={handleAddInventoryMovement}
                  theme={currentThemeId}
                  updateCompany={handleUpdateCompany}
                  onOpenAlanubeConfig={() => setState((prev) => ({ ...prev, activeView: 'alanube_config' }))}
                  addTercero={handleAddTercero}
                />
              )}

              {state.activeView === 'compras' && (
                <PurchasesView
                  currentCompany={activeCompany}
                  vouchers={state.vouchers}
                  terceros={state.terceros}
                  products={state.products}
                  inventory={state.inventory}
                  warehouses={state.warehouses}
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
                  <div className="p-8 max-w-xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-xl my-8">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-400/20 flex items-center justify-center text-2xl mx-auto">
                      <i className="ri-tools-fill"></i>
                    </div>
                    <h3 className="text-lg font-bold text-white">Módulo de Producción Industrial (MRP) Desactivado</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Esta empresa está operando en <strong>Modo Tecnología, Hardware & Servicios</strong>. Las recetas BOM y órdenes de producción están en pausa.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
                      <button
                        onClick={() => handleUpdateCompany({ ...activeCompany, enableProduction: true })}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all"
                      >
                        Activar Módulo de Producción
                      </button>
                      <button
                        onClick={() => setState(prev => ({ ...prev, activeView: 'servicios_tech' }))}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer transition-all"
                      >
                        Ir a Servicios Tecnológicos & OT
                      </button>
                    </div>
                  </div>
                ) : (
                  <ManufacturingView
                    boms={state.boms}
                    products={state.products}
                    productionOrders={state.productionOrders}
                    inventory={state.inventory}
                    warehouses={state.warehouses}
                    addProductionOrder={handleAddProductionOrder}
                    updateOrderStatus={handleUpdateOrderStatus}
                    addQualityInspection={handleAddQualityInspection}
                    onOpenKiosk={() => setState(prev => ({ ...prev, kioskMode: true }))}
                  />
                )
              )}

              {state.activeView === 'mrp' && (
                activeCompany.enableProduction === false ? (
                  <div className="p-8 max-w-xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-xl my-8">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-400/20 flex items-center justify-center text-2xl mx-auto">
                      <i className="ri-cpu-line"></i>
                    </div>
                    <h3 className="text-lg font-bold text-white">Planificación de Requerimientos (MRP) en Pausa</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      El módulo de cálculo de necesidades de materiales está desactivado porque la empresa está configurada para <strong>Tecnología & Servicios</strong>.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
                      <button
                        onClick={() => handleUpdateCompany({ ...activeCompany, enableProduction: true })}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all"
                      >
                        Activar Módulo MRP
                      </button>
                      <button
                        onClick={() => setState(prev => ({ ...prev, activeView: 'servicios_tech' }))}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer transition-all"
                      >
                        Ir a Servicios Tecnológicos & OT
                      </button>
                    </div>
                  </div>
                ) : (
                  <PlanningView
                    boms={state.boms}
                    products={state.products}
                    productionOrders={state.productionOrders}
                    inventory={state.inventory}
                    terceros={state.terceros}
                    warehouses={state.warehouses}
                    addProductionOrder={handleAddProductionOrder}
                    addVoucher={handleAddVoucher}
                    updateInventory={handleUpdateInventory}
                    theme={currentThemeId}
                  />
                )
              )}

              {state.activeView === 'calidad' && (
                activeCompany.enableProduction === false ? (
                  <div className="p-8 max-w-xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-xl my-8">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-400/20 flex items-center justify-center text-2xl mx-auto">
                      <i className="ri-shield-check-line"></i>
                    </div>
                    <h3 className="text-lg font-bold text-white">Inspección de Calidad de Producción</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Este módulo audita lotes de manufactura industrial. Para control de garantías de hardware, use el módulo de Tecnología.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
                      <button
                        onClick={() => handleUpdateCompany({ ...activeCompany, enableProduction: true })}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all"
                      >
                        Activar Módulo de Calidad & MRP
                      </button>
                      <button
                        onClick={() => setState(prev => ({ ...prev, activeView: 'servicios_tech' }))}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer transition-all"
                      >
                        Ir a Servicios Tecnológicos & OT
                      </button>
                    </div>
                  </div>
                ) : (
                  <QualityView
                    qualityInspections={state.qualityInspections}
                    productionOrders={state.productionOrders}
                    boms={state.boms}
                    products={state.products}
                    addQualityInspection={handleAddQualityInspection}
                    updateOrderStatus={handleUpdateOrderStatus}
                    theme={currentThemeId}
                  />
                )
              )}

              {state.activeView === 'comprobantes' && (
                <VouchersView
                  currentCompany={activeCompany}
                  vouchers={state.vouchers}
                  puc={state.puc}
                  costCenters={state.costCenters}
                  terceros={state.terceros}
                  addVoucher={handleAddVoucher}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'bancos' && (
                <BanksView
                  bankAccounts={state.bankAccounts}
                  bankTransactions={state.bankTransactions}
                  vouchers={state.vouchers}
                  puc={state.puc}
                  terceros={state.terceros}
                  addVoucher={handleAddVoucher}
                  addBankAccount={handleAddBankAccount}
                  addBankTransaction={handleAddBankTransaction}
                  reconcileTransaction={handleReconcileTransaction}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'impuestos' && (
                <TaxesView
                  vouchers={state.vouchers}
                  puc={state.puc}
                  terceros={state.terceros}
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
                  vouchers={state.vouchers}
                  addBudget={handleAddBudget}
                  deleteBudget={handleDeleteBudget}
                  updateBudget={handleUpdateBudget}
                  transferBudget={handleTransferBudget}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'cartera' && (
                <PortfolioView
                  vouchers={state.vouchers}
                  terceros={state.terceros}
                  bankAccounts={state.bankAccounts}
                  puc={state.puc}
                  addVoucher={handleAddVoucher}
                  theme={currentThemeId}
                />
              )}

              {state.activeView === 'nomina' && (
                <PayrollView
                  companies={state.companies}
                  currentCompanyId={state.currentCompanyId}
                  terceros={state.terceros}
                  bankAccounts={state.bankAccounts}
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
                  vouchers={state.vouchers}
                  inventory={state.inventory}
                  products={state.products}
                />
              )}

              {state.activeView === 'usuarios' && (
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
                  onSwitchCompany={handleSwitchCompany}
                  onCreateCompany={handleCreateCompany}
                />
              )}

              {state.activeView === 'alanube_config' && (
                <AlanubeConfigView
                  currentCompany={activeCompany}
                  updateCompany={handleUpdateCompany}
                  theme={currentThemeId}
                  onNavigateToInvoicing={() => setState((prev) => ({ ...prev, activeView: 'facturacion' }))}
                />
              )}

              {state.activeView === 'database' && (
                <DatabaseView theme={currentThemeId} />
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
                Configure los parámetros e información legal de la nueva organización. Al confirmarse, se habilitará un ambiente contable, tributario y de nómina independiente para esta empresa.
              </p>

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

    </div>
  );
}

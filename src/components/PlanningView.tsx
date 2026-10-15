import React, { useState } from 'react';
import { toast } from "../context/ToastContext";
import { BOM, Product, ProductionOrder, InventoryItem, Tercero, Warehouse } from '../types';
import { THEMES_MAP } from './Sidebar';

interface PlanningViewProps {
  boms: BOM[];
  products: Product[];
  productionOrders: ProductionOrder[];
  inventory: InventoryItem[];
  terceros: Tercero[];
  warehouses: Warehouse[];
  addProductionOrder: (po: Omit<ProductionOrder, 'id' | 'orderNumber'>) => void;
  addVoucher: (p: { number: string; type: 'compra'; concept: string; thirdPartyId: string; total: number; lines: any[]; items?: any[] }) => void;
  updateInventory: (prodId: string, lotNum: string | undefined, diffQty: number) => void;
  theme?: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
}

export default function PlanningView({
  boms,
  products,
  productionOrders,
  inventory,
  terceros,
  warehouses,
  addProductionOrder,
  addVoucher,
  updateInventory,
  theme = 'slate_gray'
}: PlanningViewProps) {
  const [activeTab, setActiveTab] = useState<'mps' | 'backlog' | 'bakers' | 'gantt'>('mps');
  
  // Theme styling definitions
  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;
  const isDark = theme === 'navy_dark' || theme === 'light_gray';

  // --- MPS State ---
  const [mpsBomId, setMpsBomId] = useState<string>(boms[0]?.id || '');
  const [mpsBatchQty, setMpsBatchQty] = useState<number>(500); // 500 units default
  
  // --- Baker's Percent State ---
  const [bakersBomId, setBakersBomId] = useState<string>(boms[0]?.id || '');
  const [targetDoughWeight, setTargetDoughWeight] = useState<number>(100); // 100 Kg dough default

  // --- Purchase suggestion modal states ---
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState(warehouses[0]?.id || 'wh-1');
  const [suggestedItemsToBuy, setSuggestedItemsToBuy] = useState<Array<{ productId: string; qty: number; unitCost: number }>>([]);

  // --- Quick Launch OP Modal ---
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchBomId, setLaunchBomId] = useState('');
  const [launchQty, setLaunchQty] = useState(100);
  const [launchDueDate, setLaunchDueDate] = useState(new Date(Date.now() + 4 * 24 * 60 * 60 * 1055).toISOString().split('T')[0]);

  // Utilities
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getProduct = (id: string) => products.find(p => p.id === id);

  // Calculates combined available stock for a product across all warehouses
  const getProductTotalStock = (productId: string) => {
    return inventory
      .filter(item => item.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // ----------------------------------------------------
  // BACKLOG DEMAND CALCULATIONS
  // ----------------------------------------------------
  const pendingOrders = productionOrders.filter(
    po => po.status === 'pendiente' || po.status === 'proceso'
  );

  // Aggregate requirements of active production orders
  const activeBacklogRequirements: Array<{
    productId: string;
    requiredQty: number;
    availableStock: number;
    deficit: number;
    unitCost: number;
    demandedByOrders: string[];
  }> = [];

  pendingOrders.forEach(po => {
    const activeBOM = boms.find(b => b.id === po.bomId);
    if (activeBOM) {
      activeBOM.items.forEach(bomItem => {
        const product = getProduct(bomItem.productId);
        if (product) {
          const runQty = bomItem.quantity * po.quantity;
          const availableStock = getProductTotalStock(product.id);
          const existing = activeBacklogRequirements.find(r => r.productId === product.id);

          if (existing) {
            existing.requiredQty += runQty;
            existing.deficit = Math.max(0, existing.requiredQty - availableStock);
            if (!existing.demandedByOrders.includes(po.orderNumber)) {
              existing.demandedByOrders.push(po.orderNumber);
            }
          } else {
            activeBacklogRequirements.push({
              productId: product.id,
              requiredQty: runQty,
              availableStock,
              deficit: Math.max(0, runQty - availableStock),
              unitCost: product.cost,
              demandedByOrders: [po.orderNumber]
            });
          }
        }
      });
    }
  });

  const totalBacklogDeficitValue = activeBacklogRequirements.reduce(
    (sum, req) => sum + (req.deficit * req.unitCost), 0
  );

  // ----------------------------------------------------
  // MPS SIMULATION CALCULATIONS (Master Production Schedule)
  // ----------------------------------------------------
  const selectedMpsBOM = boms.find(b => b.id === mpsBomId);
  const mpsFinishedProduct = selectedMpsBOM ? getProduct(selectedMpsBOM.finishedProductId) : null;

  const mpsIngredientsCalculated = selectedMpsBOM
    ? selectedMpsBOM.items.map(bItem => {
        const material = getProduct(bItem.productId);
        const requiredQty = bItem.quantity * mpsBatchQty;
        const availableStock = getProductTotalStock(bItem.productId);
        const deficit = Math.max(0, requiredQty - availableStock);
        const cost = material ? material.cost : 2000;
        
        return {
          productId: bItem.productId,
          name: material?.name || 'Desconocido',
          sku: material?.sku || 'REF-N/A',
          neededPerUnit: bItem.quantity,
          totalNeeded: requiredQty,
          availableStock,
          deficit,
          unitCost: cost,
          extendedCost: requiredQty * cost
        };
      })
    : [];

  const mpsTotalIngredientsCost = mpsIngredientsCalculated.reduce((acc, x) => acc + x.extendedCost, 0);
  const mpsEstimatedLabor = mpsBatchQty * 1200; // Standard labor allocation
  const mpsEstimatedOverhead = mpsBatchQty * 800; // Overhead standard
  const mpsBatchTotalEstimatedCost = mpsTotalIngredientsCost + mpsEstimatedLabor + mpsEstimatedOverhead;
  const mpsBatchUnitCost = mpsBatchQty > 0 ? mpsBatchTotalEstimatedCost / mpsBatchQty : 0;

  // ----------------------------------------------------
  // BAKER'S PERCENTAGE SCALING SYSTEM
  // ----------------------------------------------------
  // In bakery formula planning, wheat flour is always the 100% benchmark baseline weight.
  // We identify the flour ingredient (p-1) or choose the first ingredient as the 100% baseline.
  const selectedBakersBOM = boms.find(b => b.id === bakersBomId);
  const bakersFinishedProduct = selectedBakersBOM ? getProduct(selectedBakersBOM.finishedProductId) : null;

  const calculateBakersFlourPercentage = () => {
    if (!selectedBakersBOM) return [];
    
    // Bakers base ingredient represents flour (usually p-1 "Harina de Trigo")
    // If not found, use the item with largest standard weight in the recipe as the 100% base
    const baseItemIndex = selectedBakersBOM.items.findIndex(item => item.productId === 'p-1');
    const baseItem = baseItemIndex !== -1 ? selectedBakersBOM.items[baseItemIndex] : selectedBakersBOM.items[0];

    if (!baseItem) return [];

    // Flour units sum or relative ratios. Total recipe parts sum:
    const totalRecipeIngredientsQtySum = selectedBakersBOM.items.reduce((sum, item) => sum + item.quantity, 0);

    // Let's calculate parts relative to the base ingredient (baseItem = 100%)
    const baseStdWeight = baseItem.quantity;

    // Multiply components to match the objective complete target bulk mix weight (Kg)
    // Formula weight of mixture = sum of weights.
    // If total mixture = targetDoughWeight, and proportion of each ingredient is item.quantity / totalRecipeIngredientsQtySum:
    const scaledIngredients = selectedBakersBOM.items.map(bItem => {
      const ingredient = getProduct(bItem.productId);
      const relativeBakersPercentage = (bItem.quantity / baseStdWeight) * 100;
      
      // Actual scaled weight in kilograms
      const scaledWeight = (bItem.quantity / totalRecipeIngredientsQtySum) * targetDoughWeight;
      const currentStock = getProductTotalStock(bItem.productId);

      return {
        productId: bItem.productId,
        name: ingredient?.name || 'Insumo',
        sku: ingredient?.sku || 'MP-N/A',
        isBase: bItem.id === baseItem.id,
        bakersPercentage: relativeBakersPercentage,
        recipeFactor: bItem.quantity,
        scaledWeightKg: scaledWeight,
        currentStockKg: currentStock
      };
    });

    return scaledIngredients;
  };

  const bakersScaledList = calculateBakersFlourPercentage();

  // ----------------------------------------------------
  // PURCHASING INTEGRATION HANDLERS
  // ----------------------------------------------------
  const handleOpenPurchaseSuggestions = (itemsList: Array<{ productId: string; qty: number; unitCost: number }>) => {
    setSuggestedItemsToBuy(itemsList.filter(item => item.qty > 0));
    const firstProvider = terceros.find(t => t.roles.includes('proveedor'))?.id || '';
    setSelectedProviderId(firstProvider);
    setShowPurchaseModal(true);
  };

  const handleExecuteSuggestedPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderId || !targetWarehouseId || suggestedItemsToBuy.length === 0) {
      toast.warning("Por favor complete los datos obligatorios.", "Datos Requeridos");
      return;
    }

    const providerName = terceros.find(t => t.id === selectedProviderId)?.name || 'Proveedor';
    const subtotal = suggestedItemsToBuy.reduce((sum, item) => sum + (item.qty * item.unitCost), 0);
    const totalTax = subtotal * 0.19; // Standard 19% IVA
    const totalWithTax = subtotal + totalTax;

    // Build posting items
    const voucherItems = suggestedItemsToBuy.map(s => ({
      productId: s.productId,
      qty: s.qty,
      unitPrice: s.unitCost,
      lotNumber: 'LOTE-MRP-' + new Date().toISOString().substring(2,4) + Math.floor(Math.random() * 900 + 100)
    }));

    // Generate credit/debit posting accounting lines
    const accountingLines = [
      { accountCode: '143505', description: `Inventario MP Compra MRP - ${providerName}`, debit: subtotal, credit: 0 },
      { accountCode: '240805', description: `Soporte IVA Descontable 19% MRP`, debit: totalTax, credit: 0 },
      { accountCode: '220505', description: `Proveedores Cuentas por Pagar - ${providerName}`, debit: 0, credit: totalWithTax }
    ];

    // Submit purchase voucher inside the system!
    addVoucher({
      number: 'COM-MRP-' + Math.floor(Math.random() * 9000 + 1000),
      type: 'compra',
      concept: `Abastecimiento sugerido de materia prima por Planificador MRP`,
      thirdPartyId: selectedProviderId,
      total: totalWithTax,
      lines: accountingLines,
      items: voucherItems
    });

    // Auto-update virtual stock quantities to simulate inventory arrival instantly
    suggestedItemsToBuy.forEach(item => {
      const generatedLot = voucherItems.find(v => v.productId === item.productId)?.lotNumber;
      updateInventory(item.productId, generatedLot, item.qty);
    });

    toast.success(`¡Requisición Procesada! Se ingresaron ${suggestedItemsToBuy.length} materias primas a bodega.`, "Requisición Abastecida");
    setShowPurchaseModal(false);
  };

  // ----------------------------------------------------
  // SCHEDULING & PRODUCTION LINE PIPELINE (Timeline)
  // ----------------------------------------------------
  const handleLaunchProductionOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!launchBomId) {
      toast.warning("Por favor elija una receta para planificar.", "Receta Requerida");
      return;
    }
    const targetBOM = boms.find(b => b.id === launchBomId);
    if (!targetBOM) return;

    addProductionOrder({
      bomId: launchBomId,
      quantity: Number(launchQty) || 100,
      startDate: new Date().toISOString().split('T')[0],
      dueDate: launchDueDate,
      status: 'pendiente',
      costEstimates: {
        materials: launchQty * 3200,
        labor: launchQty * 1200,
        overhead: launchQty * 900
      }
    });

    toast.success("Orden de producción planificada con éxito.", "Planificación MPS");
    setShowLaunchModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Header Banner */}
      <div className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-100'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-wider uppercase opacity-70">Planificación, Abastecimiento & Amasado</span>
          </div>
          <h2 className="font-display font-extrabold text-xl tracking-tight">Planificador Industrial MRP & Pronósticos</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Modulo avanzado para el cálculo matemático de demandas de ingredientes, simulación de lotes terminados, escalado mecánico por porcentaje e integración directa con compras contables.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => {
              setLaunchBomId(boms[0]?.id || '');
              setShowLaunchModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <i className="ri-calendar-event-line"></i> Planificar Nueva OP
          </button>
        </div>
      </div>

      {/* Visual Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
            <i className="ri-task-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Backlog OPs Activas</p>
            <p className="text-lg font-bold font-mono">{pendingOrders.length} Órdenes</p>
          </div>
        </div>
        
        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 shrink-0">
            <i className="ri-error-warning-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Materias Primas Críticas</p>
            <p className="text-lg font-bold font-mono text-orange-500">
              {activeBacklogRequirements.filter(r => r.deficit > 0).length} de {products.filter(p => p.type !== 'terminado').length}
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-red-500/10 text-red-400 shrink-0">
            <i className="ri-money-dollar-circle-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Costo Defícit de Stock</p>
            <p className="text-lg font-bold font-mono text-rose-500">{formatCOP(totalBacklogDeficitValue)}</p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 shrink-0">
            <i className="ri-database-2-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fórmulas BOM Cargadas</p>
            <p className="text-lg font-bold font-mono">{boms.length} Recetas</p>
          </div>
        </div>
      </div>

      {/* Primary Tab Bar */}
      <div className="flex border-b border-black/5 dark:border-white/5 pb-0.5 scrollbar-thin overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('mps')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'mps'
              ? 'border-blue-500 text-blue-500 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-lightbulb-line mr-1.5 text-sm align-middle"></i>
          MPS: Simulador de Lotes
        </button>

        <button
          onClick={() => setActiveTab('backlog')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'backlog'
              ? 'border-blue-500 text-blue-500 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-line-chart-line mr-1.5 text-sm align-middle"></i>
          Déficits por OPs en Cola
        </button>

        <button
          onClick={() => setActiveTab('bakers')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'bakers'
              ? 'border-blue-500 text-blue-500 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-compass-3-line mr-1.5 text-sm align-middle"></i>
          Cálculo del Panadero (Flour Scaling)
        </button>

        <button
          onClick={() => setActiveTab('gantt')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'gantt'
              ? 'border-blue-500 text-blue-500 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-time-line mr-1.5 text-sm align-middle"></i>
          Líneas de Producción & Gantt
        </button>
      </div>

      {/* TAB 1: MPS SIMULATOR */}
      {activeTab === 'mps' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-xs">
          
          {/* Simulation setup card */}
          <div className={`lg:col-span-1 p-5 border rounded-2xl shadow-sm space-y-4 h-fit ${activeTheme.cardStyles}`}>
            <h3 className="font-display font-bold text-sm tracking-tight border-b pb-2">Configurar Simulación MPS</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Producto Terminado Objetivo</label>
              <select
                value={mpsBomId}
                onChange={(e) => setMpsBomId(e.target.value)}
                className={`w-full font-semibold rounded-xl px-3 py-2.5 border outline-none ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-700'
                }`}
              >
                {boms.map(b => {
                  const prod = getProduct(b.finishedProductId);
                  return (
                    <option key={b.id} value={b.id}>
                      {prod?.name || 'Receta'} ({b.version})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lote Simulado (Unidades Terminadas)</label>
              <input
                type="number"
                min="10"
                max="50000"
                value={mpsBatchQty}
                onChange={(e) => setMpsBatchQty(Math.max(1, Number(e.target.value)))}
                className={`w-full font-mono font-bold rounded-xl px-3 py-2.5 border outline-none ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-800'
                }`}
              />
            </div>

            <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-2">
              <h4 className="font-bold text-[10px] text-blue-400 uppercase tracking-wider">Estructura Presupuestada del Lote</h4>
              
              <div className="divide-y divide-black/5 dark:divide-white/5 text-xs font-medium space-y-1">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-semibold">Costo Ingredientes (Materia Prima):</span>
                  <span className="font-mono">{formatCOP(mpsTotalIngredientsCost)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-semibold">Mano de Obra Directa Estimada:</span>
                  <span className="font-mono">{formatCOP(mpsEstimatedLabor)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-semibold">Costos Indirectos (CIF) Estimados:</span>
                  <span className="font-mono">{formatCOP(mpsEstimatedOverhead)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-t font-black text-slate-200">
                  <span className="text-blue-400 font-black">COSTO TOTAL DEL LOTE MP:</span>
                  <span className="font-mono text-emerald-500 text-sm">{formatCOP(mpsBatchTotalEstimatedCost)}</span>
                </div>
                <div className="flex justify-between py-1 text-[11px] font-black text-rose-400">
                  <span>Costo Unitario Presupuestado:</span>
                  <span className="font-mono">{formatCOP(mpsBatchUnitCost)} / Unidad</span>
                </div>
              </div>
            </div>

            {/* Launch Production button */}
            <button
              onClick={() => {
                addProductionOrder({
                  bomId: mpsBomId,
                  quantity: mpsBatchQty,
                  startDate: new Date().toISOString().split('T')[0],
                  dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  status: 'pendiente',
                  costEstimates: {
                    materials: mpsTotalIngredientsCost,
                    labor: mpsEstimatedLabor,
                    overhead: mpsEstimatedOverhead
                  }
                });
                toast.success(`Orden de producción OP planificada con ${mpsBatchQty} unidades.`, "Simulador MPS");
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="ri-play-circle-line text-lg"></i> Aprobar & Programar OP Real
            </button>
          </div>

          {/* Results table breakdown */}
          <div className={`lg:col-span-2 p-5 border rounded-2xl shadow-sm space-y-4 ${activeTheme.cardStyles}`}>
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-display font-semibold text-base">Requerimientos de Ingredientes del Lote</h3>
                <p className="text-[11px] text-slate-400">Cálculo exacto para producir {mpsBatchQty} unidades de {mpsFinishedProduct?.name || 'Receta'}</p>
              </div>

              {mpsIngredientsCalculated.some(x => x.deficit > 0) && (
                <button
                  onClick={() => {
                    const toBuy = mpsIngredientsCalculated
                      .filter(x => x.deficit > 0)
                      .map(x => ({ productId: x.productId, qty: x.deficit * 1.15, unitCost: x.unitCost })); // add 15% safety buffer
                    handleOpenPurchaseSuggestions(toBuy);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all shadow flex items-center gap-1 cursor-pointer"
                >
                  <i className="ri-shopping-cart-2-line"></i> Comprar Faltantes
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[9px] font-bold uppercase tracking-wider ${
                    isDark ? 'border-zinc-850 text-slate-400' : 'border-slate-100 text-slate-400'
                  }`}>
                    <th className="py-2.5 px-3">Ingrediente</th>
                    <th className="py-2.5 px-3 text-right">Dosis x Und</th>
                    <th className="py-2.5 px-3 text-right">Peso Req. Total</th>
                    <th className="py-2.5 px-3 text-right">Stock Planta</th>
                    <th className="py-2.5 px-3 text-right">Déficit</th>
                    <th className="py-2.5 px-3 text-right">V. Extendido</th>
                    <th className="py-2.5 px-3 text-center">Estatus</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-[11px] ${
                  isDark ? 'divide-zinc-850 text-slate-300' : 'divide-slate-100 text-slate-700'
                }`}>
                  {mpsIngredientsCalculated.map(ingredient => (
                    <tr key={ingredient.productId} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-bold block">{ingredient.name}</span>
                        <span className="text-[9px] font-mono opacity-65">{ingredient.sku}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-450">{ingredient.neededPerUnit} Kg/L</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">{ingredient.totalNeeded.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{ingredient.availableStock.toFixed(2)}</td>
                      <td className={`py-2.5 px-3 text-right font-mono ${ingredient.deficit > 0 ? 'text-red-400 font-bold' : 'text-slate-450'}`}>
                        {ingredient.deficit > 0 ? ingredient.deficit.toFixed(2) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-500 font-bold">{formatCOP(ingredient.extendedCost)}</td>
                      <td className="py-2.5 px-3 text-center">
                        {ingredient.deficit > 0 ? (
                          <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider">
                            Insuficiente
                          </span>
                        ) : (
                          <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider">
                            Suficiente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: ACTIVE DEMANDS & DEFICITS */}
      {activeTab === 'backlog' && (
        <div className="space-y-6 animate-fade-in text-xs">
          
          <div className={`p-5 border rounded-2xl shadow-sm space-y-4 ${activeTheme.cardStyles}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="font-display font-semibold text-base">Análisis de Desabastecimiento Técnico MRP</h3>
                <p className="text-xs text-slate-400">Calculado en tiempo real sumando los ingredientes del BOM de todas las OPs pendientes o en proceso en la cola</p>
              </div>

              {activeBacklogRequirements.some(r => r.deficit > 0) && (
                <button
                  onClick={() => {
                    const buyList = activeBacklogRequirements
                      .filter(r => r.deficit > 0)
                      .map(r => ({ productId: r.productId, qty: r.deficit * 1.15, unitCost: r.unitCost }));
                    handleOpenPurchaseSuggestions(buyList);
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow flex items-center justify-center gap-1 cursor-pointer self-end sm:self-auto"
                >
                  <i className="ri-shopping-cart-line"></i> Crear Sugerencia de Compra MRP
                </button>
              )}
            </div>

            {pendingOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium">
                <i className="ri-calendar-todo-line text-3xl block mb-2 opacity-50"></i>
                No hay órdenes de producción pendientes de amasar ni de hornear en el sistema.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[9px] font-bold uppercase tracking-wider ${
                      isDark ? 'border-zinc-850 text-slate-400' : 'border-slate-100 text-slate-400'
                    }`}>
                      <th className="py-3 px-4">Ingrediente Planificador</th>
                      <th className="py-3 px-4 text-right">Demanda Total Backlog</th>
                      <th className="py-3 px-4 text-right">Saldos en Bodegas</th>
                      <th className="py-3 px-4 text-right">Faltante Neto (Déficit)</th>
                      <th className="py-3 px-4">Demandado por OPs</th>
                      <th className="py-3 px-4 text-right">Costo Faltante</th>
                      <th className="py-3 px-4 text-center">Estado de Flujo</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isDark ? 'divide-zinc-850 text-slate-300' : 'divide-slate-100 text-slate-700'
                  }`}>
                    {activeBacklogRequirements.map((req) => {
                      const ingredient = getProduct(req.productId);
                      const isDeficit = req.deficit > 0;

                      return (
                        <tr key={req.productId} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-sans">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-100 block">{ingredient?.name}</span>
                            <span className="text-[10px] font-mono opacity-65">{ingredient?.sku}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                            {req.requiredQty.toFixed(2)} Kg/L
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-450">
                            {req.availableStock.toFixed(2)} Kg/L
                          </td>
                          <td className={`py-3 px-4 text-right font-mono ${isDeficit ? 'text-rose-500 font-bold' : 'text-slate-450'}`}>
                            {isDeficit ? req.deficit.toFixed(2) : '0.00'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {req.demandedByOrders.map(opNo => (
                                <span key={opNo} className="bg-slate-400/10 text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-bold border border-slate-500/10">
                                  {opNo}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-bold ${isDeficit ? 'text-rose-400' : 'text-slate-450'}`}>
                            {formatCOP(req.deficit * req.unitCost)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isDeficit ? (
                              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider">
                                ⚠️ Requiere Compra
                              </span>
                            ) : (
                              <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider">
                                ✓ Stock Asegurado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: BAKER'S WEIGHT SCALING SYSTEM */}
      {activeTab === 'bakers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-xs">
          
          <div className={`lg:col-span-1 p-5 border rounded-2xl shadow-sm space-y-4 h-fit ${activeTheme.cardStyles}`}>
            <div className="border-b pb-2">
              <h3 className="font-display font-bold text-sm tracking-tight flex items-center gap-1.5">
                <i className="ri-compass-3-line text-blue-500"></i> Dosificador Industrial de Masa
              </h3>
              <p className="text-[10px] text-slate-400">Escale las recetas del BOM usando la base del 100% de Harina</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receta Panificadora Base</label>
              <select
                value={bakersBomId}
                onChange={(e) => setBakersBomId(e.target.value)}
                className={`w-full font-semibold rounded-xl px-3 py-2.5 border outline-none ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-700'
                }`}
              >
                {boms.map(b => (
                  <option key={b.id} value={b.id}>
                    {getProduct(b.finishedProductId)?.name || b.id} (Ref. {b.version})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Masa Total Objetivo de la Mezcla (Kg)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={targetDoughWeight}
                  onChange={(e) => setTargetDoughWeight(Math.max(1, Number(e.target.value)))}
                  className={`w-full font-mono font-bold rounded-xl pl-3 pr-10 py-2.5 border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-800'
                  }`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold font-mono text-slate-450">KG</span>
              </div>
            </div>

            <div className="p-4 bg-indigo-505/10 rounded-xl border border-indigo-505/20 text-[11px] leading-relaxed">
              <span className="font-black text-blue-400 uppercase text-[9px] tracking-wider block mb-1">Mecánica del Panadero:</span>
              En la panificación industrial, la harina de trigo se define como el <strong className="font-bold">100%</strong> de los ingredientes secos. El resto (agua, azúcar, levadura, mantequilla) se expresa como un porcentaje de la masa de la harina. El sistema amortiza los porcentajes para dar las cargas de tolva exactas.
            </div>
          </div>

          <div className={`lg:col-span-2 p-5 border rounded-2xl shadow-sm space-y-4 ${activeTheme.cardStyles}`}>
            <h3 className="font-display font-semibold text-base border-b pb-2">Prescripción de Carga por Tolva en Amasadora</h3>

            <div className="text-[11px] font-semibold text-slate-400 mb-2">
              Pesos dosificados para una masa total de <span className="font-mono text-slate-100 font-bold">{targetDoughWeight} Kg</span>:
            </div>

            <div className="overflow-x-auto rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[9px] font-bold uppercase tracking-wider ${
                    isDark ? 'border-zinc-850 text-slate-400' : 'border-slate-100 text-slate-400'
                  }`}>
                    <th className="py-2.5 px-3">Ingrediente Seco / Húmedo</th>
                    <th className="py-2.5 px-3 text-right">Porcentaje del Panadero</th>
                    <th className="py-2.5 px-3 text-right">BOM Estándar (Factor)</th>
                    <th className="py-2.5 px-3 text-right text-blue-400">Peso Amasado (Kg / Tolva)</th>
                    <th className="py-2.5 px-3 text-right">Stock Disponible</th>
                    <th className="py-2.5 px-3 text-center">Estatus Mezcla</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-[11px] ${
                  isDark ? 'divide-zinc-850 text-slate-300' : 'divide-slate-100 text-slate-700'
                }`}>
                  {bakersScaledList.map((item) => (
                    <tr key={item.productId} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-bold block text-slate-200">{item.name}</span>
                        {item.isBase && (
                          <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase px-1 py-0.1 select-none rounded">
                            Ingrediente Base
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-100 font-extrabold">
                        {item.bakersPercentage.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {item.recipeFactor.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-400 font-black text-xs">
                        {item.scaledWeightKg.toFixed(3)} Kg
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {item.currentStockKg.toFixed(2)} Kg
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.currentStockKg >= item.scaledWeightKg ? (
                          <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1 rounded font-bold text-[9px]">
                            ✓ Listo
                          </span>
                        ) : (
                          <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1 rounded font-bold text-[9px]">
                            ⚠️ Faltan {(item.scaledWeightKg - item.currentStockKg).toFixed(1)} Kg
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* TAB 4: PRODUCTION LINE TIMELINE */}
      {activeTab === 'gantt' && (
        <div className="space-y-6 animate-fade-in text-xs">
          
          <div className={`p-5 border rounded-2xl shadow-sm space-y-4 ${activeTheme.cardStyles}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="font-display font-semibold text-base">Cronograma y Programación de Capacidad de Planta</h3>
                <p className="text-xs text-slate-400">Ordene, programe y asigne prioridades horarias a sus lotes industriales en hilera de producción</p>
              </div>

              <button
                onClick={() => {
                  setLaunchBomId(boms[0]?.id || '');
                  setShowLaunchModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow flex items-center justify-center gap-1 cursor-pointer self-end sm:self-auto"
              >
                <i className="ri-add-line"></i> Programar Nueva Orden
              </button>
            </div>

            {/* List timeline cards */}
            <div className="space-y-3">
              {productionOrders.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  No hay órdenes programadas. Registre una nueva para visualizar el programador.
                </div>
              ) : (
                productionOrders.map((po) => {
                  const targetBOM = boms.find(b => b.id === po.bomId);
                  const finishedProductImage = getProduct(targetBOM?.finishedProductId || '');
                  
                  let statusColor = '';
                  let statusBg = '';
                  switch (po.status) {
                    case 'pendiente':
                      statusColor = 'text-amber-500';
                      statusBg = 'bg-amber-500/10 border-amber-500/20';
                      break;
                    case 'proceso':
                      statusColor = 'text-blue-500 animate-pulse';
                      statusBg = 'bg-blue-500/10 border-blue-500/20';
                      break;
                    case 'calidad':
                      statusColor = 'text-purple-500';
                      statusBg = 'bg-purple-500/10 border-purple-500/20';
                      break;
                    case 'empaque':
                      statusColor = 'text-indigo-505';
                      statusBg = 'bg-indigo-505/10 border-indigo-505/20';
                      break;
                    case 'completada':
                      statusColor = 'text-emerald-500';
                      statusBg = 'bg-emerald-500/10 border-emerald-500/20';
                      break;
                    default:
                      statusColor = 'text-slate-400';
                      statusBg = 'bg-slate-500/10';
                  }

                  // Simulated progress percentages
                  let progressPercent = 0;
                  if (po.status === 'pendiente') progressPercent = 5;
                  else if (po.status === 'proceso') progressPercent = 50;
                  else if (po.status === 'calidad') progressPercent = 75;
                  else if (po.status === 'empaque') progressPercent = 90;
                  else if (po.status === 'completada') progressPercent = 100;

                  return (
                    <div key={po.id} className={`p-4 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans ${
                      isDark ? 'bg-zinc-950/40 border-zinc-801/60' : 'bg-slate-50/50 border-slate-150'
                    }`}>
                      <div className="flex items-start gap-3.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ${
                          po.status === 'completada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-505/10 text-blue-500'
                        }`}>
                          <i className="ri-cpu-line"></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm tracking-tight">{po.orderNumber}</h4>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${statusBg} ${statusColor}`}>
                              {po.status}
                            </span>
                          </div>
                          
                          <p className="font-semibold text-xs mt-0.5">{finishedProductImage?.name || 'Receta de Panadería'}</p>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                            <span>Lote Objetivo: <strong className="font-mono text-slate-300 font-bold">{po.quantity} Unds</strong></span>
                            <span>Inicio: <span className="font-mono text-slate-400">{po.startDate}</span></span>
                            <span>Vencimiento: <span className="font-mono text-slate-400">{po.dueDate}</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Display Progress Bar */}
                      <div className="w-full md:w-64 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                          <span>PROGRESO INDUSTRIAL:</span>
                          <span className="font-mono">{progressPercent}%</span>
                        </div>
                        <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-slate-150'}`}>
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              po.status === 'completada' ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* MODAL: CREATE SUGGESTED PURCHASE INTEGRATED */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`relative w-full max-w-lg p-6 rounded-2xl shadow-xl border overflow-auto max-h-[90vh] text-xs font-sans ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            
            <button
              onClick={() => setShowPurchaseModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg cursor-pointer"
            >
              <i className="ri-close-line"></i>
            </button>

            <form onSubmit={handleExecuteSuggestedPurchase} className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="ri-shopping-cart-2-line text-lg text-amber-500"></i>
                <h3 className="font-display font-semibold text-base">Asistente de Abastecimiento MRP</h3>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                Genere y apruebe un comprobante de compra para balancear de forma inmediata los inventarios en la planta. Se ha añadido un margen de seguridad del de +15%.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proveedor Seleccionado</label>
                <select
                  required
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className={`w-full font-semibold rounded-xl px-3 py-2.5 border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-700'
                  }`}
                >
                  <option value="">Seleccione un Proveedor...</option>
                  {terceros.filter(t => t.roles.includes('proveedor')).map(t => (
                    <option key={t.id} value={t.id}>{t.name} (NIT {t.nit})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bodega de Ingreso</label>
                <select
                  required
                  value={targetWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  className={`w-full font-semibold rounded-xl px-3 py-2.5 border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-700'
                  }`}
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Items Summary list */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Materias Primas a Adquirir</label>
                <div className={`p-3 rounded-xl border space-y-2 max-h-[220px] overflow-auto ${
                  isDark ? 'bg-zinc-950/60 border-zinc-801' : 'bg-slate-50 border-slate-200'
                }`}>
                  {suggestedItemsToBuy.map((item, index) => {
                    const prod = getProduct(item.productId);
                    return (
                      <div key={item.productId} className="flex justify-between items-center text-[11px] font-semibold py-1 border-b border-black/5 dark:border-white/5 last:border-0">
                        <div>
                          <span>{prod?.name || 'Insumo'}</span>
                          <span className="block text-[9px] font-mono text-slate-450">{prod?.sku}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-blue-400 font-black">{item.qty.toFixed(2)} Kg/L</span>
                          <span className="block text-[9px] font-mono text-slate-450">A: {formatCOP(item.unitCost)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 border font-semibold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Confirmar & Postear Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK LAUNCH OP */}
      {showLaunchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`relative w-full max-w-md p-6 rounded-2xl shadow-xl border overflow-auto max-h-[90vh] text-xs font-sans ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            
            <button
              onClick={() => setShowLaunchModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg cursor-pointer"
            >
              <i className="ri-close-line"></i>
            </button>

            <form onSubmit={handleLaunchProductionOrder} className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="ri-calendar-event-line text-lg text-blue-500"></i>
                <h3 className="font-display font-semibold text-base">Planificar Nueva Corrida (OP)</h3>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receta / BOM a Producir</label>
                <select
                  required
                  value={launchBomId}
                  onChange={(e) => setLaunchBomId(e.target.value)}
                  className={`w-full font-semibold rounded-xl px-3 py-2.5 border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-700'
                  }`}
                >
                  {boms.map(b => (
                    <option key={b.id} value={b.id}>
                      {getProduct(b.finishedProductId)?.name || b.id} (Ref. {b.version})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cantidad de Unidades</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={launchQty}
                  onChange={(e) => setLaunchQty(Math.max(1, Number(e.target.value)))}
                  className={`w-full font-mono font-bold rounded-xl px-3 py-2.5 border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-800'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha de Vencimiento / Despacho</label>
                <input
                  type="date"
                  required
                  value={launchDueDate}
                  onChange={(e) => setLaunchDueDate(e.target.value)}
                  className={`w-full font-mono font-bold rounded-xl px-3 py-2.5 border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLaunchModal(false)}
                  className="flex-1 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 border font-semibold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Planificar en Planta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

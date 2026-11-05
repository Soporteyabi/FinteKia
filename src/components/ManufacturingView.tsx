import React, { useState, useEffect } from 'react';
import { toast } from "../context/ToastContext";
import { BOM, Product, ProductionOrder, InventoryItem, QualityInspection, Warehouse } from '../types';
import Pagination from './Pagination';
import { 
  PlusCircle, 
  Layers, 
  TrendingUp, 
  UserCheck, 
  Settings, 
  Warehouse as WhIcon, 
  Clock, 
  Coins, 
  CheckCircle, 
  AlertTriangle, 
  FileSpreadsheet,
  FlaskConical,
  Edit3,
  Trash2,
  AlertCircle,
  Plus,
  Package,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { exportManufacturingToExcel } from '../utils/excelExport';
import { formatCOP, parseDecimal, formatQuantity } from '../utils/currencyUtils';
import { DecimalInput } from './common/DecimalInput';
import { BOMModal } from './manufacturing/BOMModal';

interface ManufacturingViewProps {
  boms: BOM[];
  products: Product[];
  productionOrders: ProductionOrder[];
  inventory: InventoryItem[];
  warehouses: Warehouse[];
  addProductionOrder: (po: Omit<ProductionOrder, 'id' | 'orderNumber'>) => void;
  updateOrderStatus: (id: string, newStatus: ProductionOrder['status']) => void;
  addQualityInspection: (qi: Omit<QualityInspection, 'id'>) => void;
  onOpenKiosk?: () => void;
  addBOM?: (bomData: Omit<BOM, 'id'>) => void;
  updateBOM?: (bom: BOM) => void;
  deleteBOM?: (id: string) => void;
  addProduct?: (prod: Omit<Product, 'id'>) => void;
  currentCompanyId?: string;
}

export default function ManufacturingView({
  boms,
  products,
  productionOrders,
  inventory,
  warehouses,
  addProductionOrder,
  updateOrderStatus,
  addQualityInspection,
  onOpenKiosk,
  addBOM,
  updateBOM,
  deleteBOM,
  addProduct,
  currentCompanyId = 'co-1'
}: ManufacturingViewProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'recipes'>('orders');
  const [selectedBOMId, setSelectedBOMId] = useState('');
  const [prodQty, setProdQty] = useState<number>(10);
  const [dueDate, setDueDate] = useState('');

  // Routing and Cost configurations
  const [rawWhId, setRawWhId] = useState(warehouses[0]?.id || 'wh-1');
  const [finWhId, setFinWhId] = useState(warehouses[1]?.id || warehouses[0]?.id || 'wh-2');
  const [productionHours, setProductionHours] = useState(2);
  const [laborHourlyRate, setLaborHourlyRate] = useState(15000);
  const [overheadHourlyRate, setOverheadHourlyRate] = useState(8000);

  // QC logs state
  const [qcTargetOrderId, setQcTargetOrderId] = useState('');
  const [qcValue, setQcValue] = useState(4.5);
  const [qcResult, setQcResult] = useState<'Aprobado' | 'Rechazado'>('Aprobado');
  const [qcNotes, setQcNotes] = useState('');

  // BOM Modal State
  const [isBOMModalOpen, setIsBOMModalOpen] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);

  // Auto-select first BOM if none selected and boms exist
  useEffect(() => {
    if ((!selectedBOMId || !boms.some(b => b.id === selectedBOMId)) && boms.length > 0) {
      setSelectedBOMId(boms[0].id);
    }
  }, [boms, selectedBOMId]);

  // Pagination for manufacturing orders (15 per page)
  const [prodOrdersPage, setProdOrdersPage] = useState(1);
  const PROD_ORDERS_PER_PAGE = 15;

  const totalProdOrdersPages = Math.max(1, Math.ceil(productionOrders.length / PROD_ORDERS_PER_PAGE));
  const safeProdOrdersPage = Math.min(prodOrdersPage, totalProdOrdersPages);
  const paginatedProdOrders = productionOrders.slice(
    (safeProdOrdersPage - 1) * PROD_ORDERS_PER_PAGE,
    safeProdOrdersPage * PROD_ORDERS_PER_PAGE
  );

  // Live BOM ingredients and cost calculations for the selected recipe and quantity
  const bomIngredientsDetails: Array<{
    material: Product;
    qtyRequired: number;
    unitCost: number;
    subtotal: number;
    stockAvailable: number;
  }> = [];

  let estimatedMaterialsCost = 0;
  const activeBOM = boms.find((b) => b.id === selectedBOMId);

  if (activeBOM) {
    activeBOM.items.forEach((bomItem) => {
      const material = products.find((p) => p.id === bomItem.productId);
      if (material) {
        const qtyRequired = bomItem.quantity * (prodQty || 0);
        // Check current stock available in selected warehouse
        const matchingStock = inventory.filter(
          (item) => item.productId === material.id && item.warehouseId === rawWhId
        );
        const totalStock = matchingStock.reduce((sum, item) => sum + item.quantity, 0);
        // Take weighted average cost of matching inventory stock, or fallback to standard product cost
        const activeStockSlot = matchingStock.find((item) => item.quantity > 0) || matchingStock[0];
        const unitCost = activeStockSlot ? activeStockSlot.avgCost : material.cost;
        const subtotal = qtyRequired * unitCost;

        estimatedMaterialsCost += subtotal;
        bomIngredientsDetails.push({
          material,
          qtyRequired,
          unitCost,
          subtotal,
          stockAvailable: totalStock
        });
      }
    });
  }

  const estimatedLaborCost = productionHours * laborHourlyRate;
  const estimatedOverheadCost = productionHours * overheadHourlyRate;
  const totalEstimatedCost = estimatedMaterialsCost + estimatedLaborCost + estimatedOverheadCost;
  const unitEstimatedCost = prodQty > 0 ? (totalEstimatedCost / prodQty) : 0;

  // Process MRP Analysis Forecast for active and pending orders
  const pendingOrders = productionOrders.filter((po) => po.status === 'pendiente' || po.status === 'proceso');

  const rawMaterialsDeficits: Array<{
    material: Product;
    requiredQty: number;
    availableStock: number;
    deficit: number;
    rawWarehouseName: string;
  }> = [];

  pendingOrders.forEach((po) => {
    const orderBOM = boms.find((b) => b.id === po.bomId);
    if (orderBOM) {
      const specificRawWh = po.rawWarehouseId || warehouses[0]?.id || 'wh-1';
      const rawWhObj = warehouses.find(w => w.id === specificRawWh);
      const rawWhName = rawWhObj ? rawWhObj.name : 'Bodega General';

      orderBOM.items.forEach((bomItem) => {
        const material = products.find((p) => p.id === bomItem.productId);
        if (material) {
          const totalRequired = bomItem.quantity * po.quantity;
          const availableStock = inventory
            .filter((item) => item.productId === material.id && item.warehouseId === specificRawWh)
            .reduce((sum, item) => sum + item.quantity, 0);

          const existingDeficitRow = rawMaterialsDeficits.find(
            (d) => d.material.id === material.id && d.rawWarehouseName === rawWhName
          );
          if (existingDeficitRow) {
            existingDeficitRow.requiredQty += totalRequired;
            existingDeficitRow.deficit = Math.max(0, existingDeficitRow.requiredQty - availableStock);
          } else {
            rawMaterialsDeficits.push({
              material,
              requiredQty: totalRequired,
              availableStock,
              deficit: Math.max(0, totalRequired - availableStock),
              rawWarehouseName: rawWhName
            });
          }
        }
      });
    }
  });

  const launchOrder = () => {
    if (!selectedBOMId) {
      toast.warning("Seleccione una Ficha Técnica / Receta BOM para iniciar.", "Receta Requerida");
      return;
    }
    const targetBOM = boms.find((b) => b.id === selectedBOMId);
    if (!targetBOM) {
      toast.warning("La receta seleccionada no es válida.", "Receta Inválida");
      return;
    }

    if (!prodQty || prodQty <= 0) {
      toast.warning("Ingrese una cantidad válida mayor a cero a producir.", "Cantidad Requerida");
      return;
    }

    // Trigger state changes
    addProductionOrder({
      bomId: selectedBOMId,
      quantity: prodQty,
      startDate: new Date().toISOString().substring(0, 10),
      dueDate: dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      status: 'pendiente',
      costEstimates: { 
        materials: Math.round(estimatedMaterialsCost), 
        labor: estimatedLaborCost, 
        overhead: estimatedOverheadCost 
      },
      rawWarehouseId: rawWhId,
      finishedWarehouseId: finWhId,
      productionHours,
      laborHourlyRate,
      overheadHourlyRate,
      companyId: currentCompanyId
    });

    const finishedProd = products.find(p => p.id === targetBOM.finishedProductId);
    toast.success(`Orden de producción lanzada exitosamente para ${prodQty} unidades de "${finishedProd?.name || 'Producto'}".`, "Orden Lanzada");
  };

  const handleCreateQC = () => {
    if (!qcTargetOrderId) {
      toast.warning("Seleccione la orden de lote técnica.", "Lote Requerido");
      return;
    }
    const targetOrder = productionOrders.find((o) => o.id === qcTargetOrderId);
    if (!targetOrder) return;

    addQualityInspection({
      date: new Date().toISOString().substring(0, 10),
      productionOrderId: qcTargetOrderId,
      loteNumber: targetOrder.generatedLot || 'LOTE-TEMPORAL',
      inspector: 'Supervisor Técnico',
      paramInspected: 'Parámetros sensoriales / Humedad',
      valueMeasured: qcValue,
      result: qcResult,
      notes: qcNotes
    });

    // Automatically update order status with calculated actual costs
    updateOrderStatus(qcTargetOrderId, qcResult === 'Aprobado' ? 'completada' : 'rechazada');
    toast.success(`Control de Calidad guardado. Estado: ${qcResult}.`, "Calidad Guardada");
    setQcTargetOrderId('');
    setQcNotes('');
  };

  const handleSaveBOM = (bomData: Omit<BOM, 'id'>) => {
    if (editingBOM && updateBOM) {
      updateBOM({ ...editingBOM, ...bomData });
      toast.success("Ficha Técnica actualizada correctamente.", "Receta Actualizada");
    } else if (addBOM) {
      addBOM(bomData);
      setActiveTab('orders');
    }
    setIsBOMModalOpen(false);
    setEditingBOM(null);
  };

  const handleDeleteBOMClick = (id: string, name: string) => {
    if (window.confirm(`¿Está seguro de eliminar la receta "${name}"?`)) {
      if (deleteBOM) {
        deleteBOM(id);
        if (selectedBOMId === id) setSelectedBOMId('');
        toast.info("Ficha técnica eliminada.", "Eliminada");
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* TOP HEADER & TAB BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/5 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Órdenes de Fabricación (OP)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {productionOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recipes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'recipes'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <FlaskConical className="w-4 h-4 text-amber-500" />
            <span>Fichas Técnicas / Recetas (BOM)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'recipes' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {boms.length}
            </span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingBOM(null);
              setIsBOMModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Crear una nueva receta o ficha técnica con insumos y materias primas"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Ficha Técnica / Receta</span>
          </button>

          {onOpenKiosk && (
            <button
              type="button"
              onClick={onOpenKiosk}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Abrir terminal táctil para operarios de planta"
            >
              <i className="ri-computer-line text-sm"></i>
              <span>Terminal Kiosco</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => exportManufacturingToExcel(productionOrders, boms, products, warehouses)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            title="Descargar órdenes de producción y costos en Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
            <span>Excel</span>
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* TAB 1: CATÁLOGO DE FICHAS TÉCNICAS / RECETAS (BOM)       */}
      {/* ======================================================== */}
      {activeTab === 'recipes' && (
        <div className="space-y-4 animate-fade-in">
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/5 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-4">
              <div>
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-amber-500" />
                  Catálogo de Fichas Técnicas & Recetas de Fabricación (BOM)
                </h3>
                <p className="text-xs text-slate-400">
                  Estructura de materiales requeridos para elaborar cada producto terminado (etiquetas, envases, químicos, etc.)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingBOM(null);
                  setIsBOMModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Crear Ficha Técnica (BOM)</span>
              </button>
            </div>

            {boms.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <FlaskConical className="w-12 h-12 text-amber-500/50 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  No hay Fichas Técnicas / Recetas registradas para esta empresa
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Crea una receta para asociar tus productos terminados (ej. <em>Detergente Líquido Potásico 1L</em>) con sus insumos registrados (como la <em>Etiqueta Adhesiva 10x15cm</em> y materias primas).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBOM(null);
                    setIsBOMModalOpen(true);
                  }}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  + Crear Primera Ficha Técnica / Receta
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {boms.map((bom) => {
                  const finProd = products.find(p => p.id === bom.finishedProductId);
                  const totalMaterialsCost = bom.items.reduce((sum, item) => {
                    const mat = products.find(p => p.id === item.productId);
                    return sum + (item.quantity * (mat ? mat.cost : 0));
                  }, 0);

                  return (
                    <div
                      key={bom.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-5 space-y-4 shadow-sm hover:border-blue-500/40 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Header card */}
                        <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                              {bom.version}
                            </span>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white mt-1">
                              {finProd ? finProd.name : (bom.name || 'Receta de Fabricación')}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-mono">
                              SKU: {finProd?.sku || 'S/SKU'} · UDM: {finProd?.unitOfMeasure || 'UND'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBOM(bom);
                                setIsBOMModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer"
                              title="Editar receta"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBOMClick(bom.id, finProd?.name || bom.name || 'Receta')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Eliminar receta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Ingredients list */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Insumos Requeridos (x 1 {finProd?.unitOfMeasure || 'Unidad'}):
                          </span>
                          <div className="space-y-1 max-h-40 overflow-y-auto pr-1 text-xs">
                            {bom.items.map((item, idx) => {
                              const mat = products.find(p => p.id === item.productId);
                              const lineCost = item.quantity * (mat ? mat.cost : 0);
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px]"
                                >
                                  <div className="truncate mr-2">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                      {mat ? mat.name : 'Insumo'}
                                    </span>
                                    <span className="block text-[9.5px] text-slate-400 font-mono">
                                      {item.quantity} {mat?.unitOfMeasure || 'UND'}
                                    </span>
                                  </div>
                                  <span className="font-mono text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                                    {formatCOP(lineCost)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Cost summary badge */}
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-500 text-[11px]">Costo Directo Insumos:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCOP(totalMaterialsCost)}
                          </span>
                        </div>
                      </div>

                      {/* Launch order shortcut */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBOMId(bom.id);
                          setActiveTab('orders');
                          toast.info(`Receta "${finProd?.name || 'Producto'}" seleccionada en el lanzador.`, "Receta Seleccionada");
                        }}
                        className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-2"
                      >
                        <span>Lanzar Producción con esta Receta</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ÓRDENES DE FABRICACIÓN (LANZADOR + REGISTRO OP)   */}
      {/* ======================================================== */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in">
          
          {/* LEFT COLUMN: Launch Form & Cost Estimates Card */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* Production Launcher */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/5 p-6 shadow-sm space-y-5">
              
              <div className="border-b border-black/5 dark:border-white/5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white text-lg">
                    Lanzador de Órdenes de Producción (OP)
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Asigne recetas, bodegas de insumos y calcule costos estimados de materias primas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBOM(null);
                    setIsBOMModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors self-start sm:self-auto"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>+ Nueva Ficha Técnica / Receta</span>
                </button>
              </div>

              {/* Notice if no recipes registered */}
              {boms.length === 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs">No hay Recetas / Fichas Técnicas registradas para esta empresa</h4>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Para elaborar un producto (por ejemplo <em>Detergente Líquido Potásico 1L</em> consumiendo su <em>Etiqueta Adhesiva</em> y químicos), primero debes crear la receta con sus insumos requeridos.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEditingBOM(null); setIsBOMModalOpen(true); }}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>+ Crear Ficha Técnica / Receta Ahora</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* BOM Selector */}
                <div className="space-y-1.5" id="form-bom-field">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plan Receta BOM *</label>
                    <button
                      type="button"
                      onClick={() => { setEditingBOM(null); setIsBOMModalOpen(true); }}
                      className="text-[10px] text-blue-500 hover:underline font-bold"
                    >
                      + Nueva
                    </button>
                  </div>
                  <select
                    value={selectedBOMId}
                    onChange={(e) => setSelectedBOMId(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-2 font-medium"
                  >
                    <option value="">Seleccione Receta...</option>
                    {boms.map((b) => {
                      const p = products.find((prod) => prod.id === b.finishedProductId);
                      return (
                        <option key={b.id} value={b.id}>
                          {p ? p.name : (b.name || 'Receta')} ({b.version})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Target Quantity */}
                <div className="space-y-1.5" id="form-qty-field">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-semibold">
                    Cantidad a Producir (Unds/Litros) *
                  </label>
                  <DecimalInput
                    min={0.01}
                    value={prodQty}
                    onChange={(val) => setProdQty(val)}
                    placeholder="10"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-2 font-mono font-bold"
                  />
                </div>

                {/* Target Date */}
                <div className="space-y-1.5" id="form-date-field">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha de Entrega</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-black/5 dark:border-white/5 pt-4">
                {/* Raw Warehouse Selector */}
                <div className="space-y-1.5" id="form-wh-raw-field">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <WhIcon className="w-3.5 h-3.5 text-blue-500" /> Bodega de Insumos (Materia Prima)
                  </label>
                  <select
                    value={rawWhId}
                    onChange={(e) => setRawWhId(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-2"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                {/* Finished Warehouse Selector */}
                <div className="space-y-1.5" id="form-wh-fin-field">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <WhIcon className="w-3.5 h-3.5 text-emerald-500" /> Bodega Destino (Producto Terminado)
                  </label>
                  <select
                    value={finWhId}
                    onChange={(e) => setFinWhId(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-2"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-black/5 dark:border-white/5 pt-4">
                {/* Hours configurable */}
                <div className="space-y-1.5" id="form-hours-field">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Horas Estimadas
                  </label>
                  <DecimalInput
                    min={0.1}
                    value={productionHours}
                    onChange={(val) => setProductionHours(val || 0.5)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-2 font-mono"
                  />
                </div>

                {/* Labor rate */}
                <div className="space-y-1.5" id="form-labor-field">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-slate-400" /> Tarifa Mano de Obra / Hr
                  </label>
                  <DecimalInput
                    min={0}
                    prefix="$"
                    value={laborHourlyRate}
                    onChange={(val) => setLaborHourlyRate(val)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-2 font-mono"
                  />
                </div>

                {/* Overhead rate */}
                <div className="space-y-1.5" id="form-overhead-field">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Settings className="w-3.5 h-3.5 text-slate-400" /> Costos Fijos Planta / Hr
                  </label>
                  <DecimalInput
                    min={0}
                    prefix="$"
                    value={overheadHourlyRate}
                    onChange={(val) => setOverheadHourlyRate(val)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-2 font-mono"
                  />
                </div>
              </div>

              {/* Real-time BOM simulation Cost Card */}
              {activeBOM && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Layers className="w-4 h-4 text-blue-500" />
                      Análisis de Consumo de Insumos (Receta: {activeBOM.version} · {products.find(p => p.id === activeBOM.finishedProductId)?.name})
                    </h4>
                    <span className="font-mono text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      {prodQty} Unds Meta
                    </span>
                  </div>

                  {/* Ingredients breakdown list */}
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-1">
                      Insumos Requeridos para este Lote ({warehouses.find(w => w.id === rawWhId)?.name}):
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {bomIngredientsDetails.map(({ material, qtyRequired, unitCost, subtotal, stockAvailable }, idx) => {
                        const isDeficit = qtyRequired > stockAvailable;
                        return (
                          <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-black/5 dark:border-white/5">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {material.name}
                              </span>
                              <span className="block text-[9.5px] text-slate-400 font-mono">
                                Demanda Lote: <strong className="text-slate-600 dark:text-slate-300">{qtyRequired.toFixed(2)} {material.unitOfMeasure || 'UND'}</strong> | Disponible en Bodega: <strong className={isDeficit ? 'text-rose-500' : 'text-emerald-500'}>{stockAvailable.toFixed(1)} {material.unitOfMeasure || 'UND'}</strong>
                              </span>
                            </div>
                            <div className="text-right font-mono font-semibold">
                              <span className={`${isDeficit ? 'text-rose-500 font-black' : 'text-slate-700 dark:text-slate-300'}`}>
                                {formatCOP(subtotal)}
                              </span>
                              <span className="block text-[9px] text-slate-400">@ {formatCOP(unitCost)}/u</span>
                              {isDeficit && (
                                <span className="inline-block text-[9px] text-rose-500 bg-rose-500/10 px-1 rounded">
                                  Déficit: {(qtyRequired - stockAvailable).toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subtotal cost table */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded border border-black/5">
                      <span className="block text-[9px] text-slate-400 uppercase">Costos Insumos</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{formatCOP(estimatedMaterialsCost)}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded border border-black/5">
                      <span className="block text-[9px] text-slate-400 uppercase">Mano de Obra</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300">{formatCOP(estimatedLaborCost)}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded border border-black/5">
                      <span className="block text-[9px] text-slate-400 uppercase">Costos Indirectos (CIF)</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300">{formatCOP(estimatedOverheadCost)}</span>
                    </div>
                    <div className="p-2 bg-blue-500/5 dark:bg-blue-500/10 rounded border border-blue-500/20">
                      <span className="block text-[9px] text-blue-500 uppercase font-bold">Costo Unitario Estimado</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{formatCOP(unitEstimatedCost)}</span>
                    </div>
                  </div>

                  {rawMaterialsDeficits.some(d => d.deficit > 0 && products.find(p => p.id === d.material.id)?.type === 'materia_prima') && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-1.5 text-[10px] font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 animate-bounce shrink-0" />
                      Alerta: Existen insumos con déficit para completar este lote. Puedes realizar una compra en el módulo de compras para abastecer la bodega.
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={launchOrder}
                className="w-full py-2.5 text-center bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white shadow-md transition-all rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Lanzar Orden de Fabricación en Planta
              </button>
            </div>

            {/* Manufacturing Active Orders Register Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/5 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-4">
                <div>
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white text-base">
                    Registro Operativo de Planta (Kardex-OP)
                  </h3>
                  <p className="text-[11px] text-slate-400">Control de órdenes de fabricación, lotes, bodegas y costos reales</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                    {productionOrders.length} OP
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Código/Orden</th>
                      <th className="py-2.5 px-3">Receta / Producto</th>
                      <th className="py-2.5 px-3">Bodegas (In & Exit)</th>
                      <th className="py-2.5 px-3 text-right">Cantidad</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      <th className="py-2.5 px-3 text-right">Costo Unitario</th>
                      <th className="py-2.5 px-3 text-right">Total Costos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5 text-slate-700">
                    {paginatedProdOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                          No hay órdenes de producción registradas aún.
                        </td>
                      </tr>
                    ) : (
                      paginatedProdOrders.map((po) => {
                        const bom = boms.find((b) => b.id === po.bomId);
                        const p = products.find((prod) => prod.id === bom?.finishedProductId);
                        const rawWhObj = warehouses.find(w => w.id === po.rawWarehouseId);
                        const finWhObj = warehouses.find(w => w.id === po.finishedWarehouseId);

                        // Calculate Unit costs
                        const totalEst = (po.costEstimates.materials + po.costEstimates.labor + po.costEstimates.overhead);
                        const unitEst = po.quantity > 0 ? (totalEst / po.quantity) : 0;

                        const totalReal = po.costsReal ? (po.costsReal.materials + po.costsReal.labor + po.costsReal.overhead) : 0;
                        const unitReal = po.quantity > 0 ? (totalReal / po.quantity) : 0;

                        return (
                          <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                            <td className="py-3 px-3">
                              <span className="block font-mono font-bold text-slate-800 dark:text-white">{po.orderNumber}</span>
                              <span className="block text-[9px] text-slate-400 font-mono">{po.generatedLot || 'Sin lote'}</span>
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                              <span className="font-semibold text-slate-800 dark:text-white">{p ? p.name : 'Producto Terminado'}</span>
                              <span className="block text-[9px] text-slate-400">Receta: {bom?.version || 'N/A'}</span>
                            </td>
                            <td className="py-3 px-3 font-medium">
                              <span className="block text-[10px] text-blue-500">📥 {rawWhObj ? rawWhObj.name : 'Bodega Insumos'}</span>
                              <span className="block text-[10px] text-emerald-500">📤 {finWhObj ? finWhObj.name : 'Bodega Terminados'}</span>
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {po.quantity} {p?.unitOfMeasure || 'Unds'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                po.status === 'pendiente' ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400' :
                                po.status === 'proceso' ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400' :
                                po.status === 'completada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {po.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-medium">
                              <span className="block text-slate-800 dark:text-white">{formatCOP(po.status === 'completada' ? unitReal : unitEst)}</span>
                              <span className="block text-[9px] text-slate-400">
                                {po.status === 'completada' ? 'Real' : 'Estimado'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-white">
                              {formatCOP(po.status === 'completada' ? totalReal : totalEst)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {totalProdOrdersPages > 1 && (
                <div className="pt-2">
                  <Pagination
                    currentPage={safeProdOrdersPage}
                    onPageChange={setProdOrdersPage}
                    totalItems={productionOrders.length}
                    pageSize={PROD_ORDERS_PER_PAGE}
                    itemLabel="órdenes"
                  />
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: MRP Engine & QC release form */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Real-time MRP widget bar */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md text-slate-100 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="font-display font-semibold text-base tracking-wide text-amber-400 flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5 text-amber-400" /> Planificador Inteligente MRP
                </h3>
                <p className="text-xs text-slate-400">Proyección y análisis de consumo de insumos para OP activas</p>
              </div>

              <div className="space-y-4">
                {rawMaterialsDeficits.map((def, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>{def.material.name}</span>
                      <span className="font-mono text-xs">{def.material.sku}</span>
                    </div>
                    
                    <div className="text-[10px] text-slate-400 border-t border-slate-900 pt-1.5">
                      <span className="text-slate-500">Bodega Origen:</span> <span className="font-bold text-blue-400">{def.rawWarehouseName}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase">Fórmula Requerida:</span>
                        <span className="font-bold text-slate-300">{def.requiredQty.toFixed(2)} {def.material.unitOfMeasure || 'Unid'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase">Saldo Almacén:</span>
                        <span className="font-bold text-slate-300">{def.availableStock.toFixed(1)} {def.material.unitOfMeasure || 'Unid'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase">Déficit:</span>
                        <span className={`font-bold ${def.deficit > 0 ? 'text-rose-400 animate-pulse font-black' : 'text-emerald-400'}`}>
                          {def.deficit > 0 ? `${def.deficit.toFixed(1)} Falta` : 'Completo ✓'}
                        </span>
                      </div>
                    </div>

                    {def.deficit > 0 && (
                      <div className="text-[10px] bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded text-rose-300 flex items-center gap-1 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Requiere abastecer insumo por orden de compra.
                      </div>
                    )}
                  </div>
                ))}

                {rawMaterialsDeficits.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs font-semibold">
                    No existen OPs activas que demanden materia prima en este almacén.
                  </div>
                )}
              </div>
            </div>

            {/* Quality control report & Batch Release */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/5 p-6 shadow-sm space-y-4">
              <div className="border-b border-black/5 dark:border-white/5 pb-4">
                <h3 className="font-display font-semibold text-slate-800 dark:text-white text-base flex items-center gap-1.5">
                  <UserCheck className="w-5 h-5 text-indigo-500" /> Inspección de Lotes y Liberación
                </h3>
                <p className="text-[11px] text-slate-400">Apruebe la liberación de lotes para ingresar existencias al almacén de terminados</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Select batch order to inspect */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plan Orden / Lote Activo</label>
                  <select
                    value={qcTargetOrderId}
                    onChange={(e) => setQcTargetOrderId(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-2 font-medium"
                  >
                    <option value="">Seleccione Lote...</option>
                    {productionOrders
                      .filter((o) => o.status === 'pendiente' || o.status === 'proceso')
                      .map((o) => {
                        const bom = boms.find(b => b.id === o.bomId);
                        const prod = products.find(p => p.id === bom?.finishedProductId);
                        return (
                          <option key={o.id} value={o.id}>
                            {o.orderNumber} - Lote: {o.generatedLot} ({prod?.name})
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* inspected value */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medición (% Humedad, pH o Temp)</label>
                  <DecimalInput
                    value={qcValue}
                    onChange={(val) => setQcValue(val)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>

                {/* result */}
                <div className="space-y-1 text-xs">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dictamen de Calidad</label>
                  <div className="flex gap-4 pt-1 font-semibold text-xs">
                    <label className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 cursor-pointer">
                      <input
                        type="radio"
                        name="qc_res"
                        checked={qcResult === 'Aprobado'}
                        onChange={() => setQcResult('Aprobado')}
                        className="text-emerald-600 focus:ring-0"
                      />
                      Aprobado (Entrada a Stock)
                    </label>
                    <label className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 cursor-pointer">
                      <input
                        type="radio"
                        name="qc_res"
                        checked={qcResult === 'Rechazado'}
                        onChange={() => setQcResult('Rechazado')}
                        className="text-rose-600 focus:ring-0"
                      />
                      Rechazado (Merma / Cuarentena)
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observaciones Técnicas</label>
                  <textarea
                    value={qcNotes}
                    onChange={(e) => setQcNotes(e.target.value)}
                    placeholder="Cumple con viscosidad, sellado hermético y etiquetado correcto..."
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-1.5 h-16"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateQC}
                className="w-full py-2.5 text-center bg-slate-800 hover:bg-slate-750 text-amber-400 font-semibold text-xs tracking-wider uppercase rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <CheckCircle className="w-4 h-4 text-amber-400" /> Registrar Pruebas de Calidad
              </button>
            </div>

          </div>

        </div>
      )}

      {/* BOM CREATION / EDITING MODAL */}
      {isBOMModalOpen && (
        <BOMModal
          isOpen={isBOMModalOpen}
          onClose={() => {
            setIsBOMModalOpen(false);
            setEditingBOM(null);
          }}
          onSave={handleSaveBOM}
          existingBOM={editingBOM}
          products={products}
          currentCompanyId={currentCompanyId}
          addProduct={addProduct}
        />
      )}

    </div>
  );
}

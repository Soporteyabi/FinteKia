import React, { useState } from 'react';
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
  FileSpreadsheet
} from 'lucide-react';
import { exportManufacturingToExcel } from '../utils/excelExport';

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
  onOpenKiosk
}: ManufacturingViewProps) {
  const [selectedBOMId, setSelectedBOMId] = useState('');
  const [prodQty, setProdQty] = useState(10);
  const [dueDate, setDueDate] = useState('');

  // Routing and Cost configurations
  const [rawWhId, setRawWhId] = useState('wh-1');
  const [finWhId, setFinWhId] = useState('wh-2');
  const [productionHours, setProductionHours] = useState(2);
  const [laborHourlyRate, setLaborHourlyRate] = useState(15000);
  const [overheadHourlyRate, setOverheadHourlyRate] = useState(8000);

  // QC logs state
  const [qcTargetOrderId, setQcTargetOrderId] = useState('');
  const [qcValue, setQcValue] = useState(4.5);
  const [qcResult, setQcResult] = useState<'Aprobado' | 'Rechazado'>('Aprobado');
  const [qcNotes, setQcNotes] = useState('');

  // Sub-filter for raw materials list in recipe preview
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'critical' | 'expired'>('all');

  // Pagination for manufacturing orders (15 per page)
  const [prodOrdersPage, setProdOrdersPage] = useState(1);
  const PROD_ORDERS_PER_PAGE = 15;

  const totalProdOrdersPages = Math.max(1, Math.ceil(productionOrders.length / PROD_ORDERS_PER_PAGE));
  const safeProdOrdersPage = Math.min(prodOrdersPage, totalProdOrdersPages);
  const paginatedProdOrders = productionOrders.slice(
    (safeProdOrdersPage - 1) * PROD_ORDERS_PER_PAGE,
    safeProdOrdersPage * PROD_ORDERS_PER_PAGE
  );

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Live BOM ingredients and cost calculations
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
        const qtyRequired = bomItem.quantity * prodQty;
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

  // 1. Process MRP Analysis Forecast for active and pending orders
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
      const specificRawWh = po.rawWarehouseId || 'wh-1';
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
      toast.warning("Seleccione una receta BOM para iniciar.", "Receta Requerida");
      return;
    }
    const targetBOM = boms.find((b) => b.id === selectedBOMId);
    if (!targetBOM) return;

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
      overheadHourlyRate
    });

    toast.success("Se ha lanzado la orden de producción de forma exitosa.", "Orden Lanzada");
    setSelectedBOMId('');
    setProdQty(10);
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Launch Form & Cost Estimates Card (7 Cohorts) */}
      <div className="xl:col-span-8 space-y-6">
        
        {/* Production Launcher */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/5 p-6 shadow-sm space-y-5">
          <div className="border-b border-black/5 dark:border-white/5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-lg">Lanzador de Órdenes de Producción (OP)</h3>
              <p className="text-xs text-slate-400 font-medium">Asigne recetas, bodegas y configure costos de Mano de Obra y Planta</p>
            </div>
            {onOpenKiosk && (
              <button
                type="button"
                onClick={onOpenKiosk}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
                title="Abrir terminal táctil para operarios de planta"
              >
                <i className="ri-computer-line text-sm"></i>
                <span>Terminal Kiosco Planta</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* BOM Selector */}
            <div className="space-y-1.5" id="form-bom-field">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plan Receta BOM</label>
              <select
                value={selectedBOMId}
                onChange={(e) => setSelectedBOMId(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-2 font-medium"
              >
                <option value="">Seleccione Receta...</option>
                {boms.map((b) => {
                  const p = products.find((prod) => prod.id === b.finishedProductId);
                  return (
                    <option key={b.id} value={b.id}>{p ? p.name : 'Receta'} ({b.version})</option>
                  );
                })}
              </select>
            </div>

            {/* Target Quantity */}
            <div className="space-y-1.5" id="form-qty-field">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-semibold">Cantidad a Producir (Unds)</label>
              <input
                type="number"
                min="1"
                value={prodQty}
                onChange={(e) => setProdQty(Math.max(1, parseInt(e.target.value) || 0))}
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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wilder flex items-center gap-1">
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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wilder flex items-center gap-1">
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
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={productionHours}
                onChange={(e) => setProductionHours(parseFloat(e.target.value) || 0.5)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-2 font-mono"
              />
            </div>

            {/* Labor rate */}
            <div className="space-y-1.5" id="form-labor-field">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-slate-400" /> Tarifa Mano de Obra / Hr
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2.5 text-xs text-slate-400">$</span>
                <input
                  type="number"
                  value={laborHourlyRate}
                  onChange={(e) => setLaborHourlyRate(parseInt(e.target.value) || 0)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg pl-6 pr-2.5 py-2 font-mono"
                />
              </div>
            </div>

            {/* Overhead rate */}
            <div className="space-y-1.5" id="form-overhead-field">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Settings className="w-3.5 h-3.5 text-slate-400" /> Costos Fijos Planta / Hr
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2.5 text-xs text-slate-400">$</span>
                <input
                  type="number"
                  value={overheadHourlyRate}
                  onChange={(e) => setOverheadHourlyRate(parseInt(e.target.value) || 0)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg pl-6 pr-2.5 py-2 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Real-time BOM simulation Cost Card */}
          {activeBOM && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Layers className="w-4 h-4 text-slate-400" /> Análisis de Costo Estimado (Receta: {activeBOM.version})
                </h4>
                <span className="font-mono text-[10px] uppercase font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {prodQty} Unds Meta
                </span>
              </div>

              {/* Ingredients breakdown list */}
              <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Materia Prima Requerida (Saldos Bodega Seleccionada):</span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {bomIngredientsDetails.map(({ material, qtyRequired, unitCost, subtotal, stockAvailable }, idx) => {
                    const isDeficit = qtyRequired > stockAvailable;
                    return (
                      <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded border border-black/5 dark:border-white/5">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{material.name}</span>
                          <span className="block text-[9px] text-slate-400 font-mono">
                            Requerido: {qtyRequired.toFixed(3)} Kg/Unds | En Stock: {stockAvailable.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-right font-mono font-semibold">
                          <span className={`${isDeficit ? 'text-rose-500 font-black' : 'text-slate-600 dark:text-slate-300'}`}>
                            {formatCOP(subtotal)}
                          </span>
                          <span className="block text-[9px] text-slate-400">@ {formatCOP(unitCost)}</span>
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
                  <span className="block text-[9px] text-slate-400 uppercase">He. Mano Obra</span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">{formatCOP(estimatedLaborCost)}</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded border border-black/5">
                  <span className="block text-[9px] text-slate-400 uppercase">C. Fijos Fijos</span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">{formatCOP(estimatedOverheadCost)}</span>
                </div>
                <div className="p-2 bg-blue-500/5 dark:bg-blue-500/10 rounded border border-blue-500/20">
                  <span className="block text-[9px] text-blue-500 uppercase font-bold">Costo Unitario</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{formatCOP(unitEstimatedCost)}</span>
                </div>
              </div>

              {rawMaterialsDeficits.some(d => d.deficit > 0 && products.find(p => p.id === d.material.id)?.type === 'materia_prima') && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-1.5 text-[10px] font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                  Alerta: Existen insumos con déficit para completar este lote. Considere abastecer el almacén.
                </div>
              )}
            </div>
          )}

          <button
            onClick={launchOrder}
            className="w-full py-2.5 text-center bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white shadow-md transition-all rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> Lanzar Lote en Planta
          </button>
        </div>

        {/* Manufacturing Active Orders Register Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/5 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-4">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-base">Registro Operativo de Planta (Kardex-OP)</h3>
              <p className="text-[11px] text-slate-400">Control de órdenes de fabricación, lotes, bodegas y costos reales</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportManufacturingToExcel(productionOrders, boms, products, warehouses)}
                className="bg-emerald-600 hover:bg-emerald-550 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="Descargar órdenes de producción y costos en Excel (.xlsx)"
                id="export-manufacturing-excel-btn"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" /> Exportar a Excel
              </button>
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
                  <th className="py-2.5 px-3">Receta / Meta</th>
                  <th className="py-2.5 px-3">Bodegas (In & Exit)</th>
                  <th className="py-2.5 px-3 text-right">Muestra</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-right">Costo Unitario</th>
                  <th className="py-2.5 px-3 text-right">Insumos/MO/Indirectos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5 text-slate-700">
                {paginatedProdOrders.map((po) => {
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
                        <span className="font-semibold text-slate-800 dark:text-white">{p ? p.name : 'Vainilla Caja'}</span>
                        <span className="block text-[9px] text-slate-400">Receta: {bom?.version || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-3 font-medium">
                        <span className="block text-[10px] text-blue-500">📥 {rawWhObj ? rawWhObj.name : 'Bodega Insumos'}</span>
                        <span className="block text-[10px] text-emerald-500">📤 {finWhObj ? finWhObj.name : 'Bodega Terminados'}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {po.quantity} Unds
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          po.status === 'pendiente' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          po.status === 'proceso' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          po.status === 'completada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      {/* Unit Production Cost */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {po.status === 'completada' ? (
                          <span>{formatCOP(unitReal)}</span>
                        ) : (
                          <span className="text-slate-400">{formatCOP(unitEst)} <span className="text-[9px] font-normal block italic">(Est.)</span></span>
                        )}
                      </td>
                      {/* Detailed Costs Breakdown */}
                      <td className="py-3 px-3 text-right text-[10px] font-mono text-slate-500">
                        {po.status === 'completada' && po.costsReal ? (
                          <div className="space-y-0.5">
                            <span className="block font-bold text-slate-800 dark:text-white">Mat: {formatCOP(po.costsReal.materials)}</span>
                            <span className="block">MO: {formatCOP(po.costsReal.labor)} | CF: {formatCOP(po.costsReal.overhead)}</span>
                            <span className="block font-semibold text-emerald-600">Total: {formatCOP(totalReal)}</span>
                          </div>
                        ) : (
                          <div className="space-y-0.5 opacity-60">
                            <span className="block">Mat: {formatCOP(po.costEstimates.materials)}</span>
                            <span className="block">MO: {formatCOP(po.costEstimates.labor)} | CF: {formatCOP(po.costEstimates.overhead)}</span>
                            <span className="block font-semibold">Total: {formatCOP(totalEst)}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {productionOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No hay órdenes de producción cargadas. ¡Someter una receta arriba para iniciar!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {productionOrders.length > 0 && (
            <Pagination
              currentPage={safeProdOrdersPage}
              totalItems={productionOrders.length}
              pageSize={PROD_ORDERS_PER_PAGE}
              onPageChange={(page) => setProdOrdersPage(page)}
              isDark={false}
              itemLabel="órdenes de producción"
            />
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: MRP Engine & QC release form (4 Cohorts) */}
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
                    <span className="font-bold text-slate-300">{def.requiredQty.toFixed(2)} Kg/Unid</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase">Saldo Almacén:</span>
                    <span className="font-bold text-slate-300">{def.availableStock.toFixed(1)} Kg/Unid</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase">Déficit:</span>
                    <span className={`font-bold ${def.deficit > 0 ? 'text-rose-400 animate-pulse font-black' : 'text-emerald-400'}`}>
                      {def.deficit > 0 ? `${def.deficit.toFixed(1)} Falta` : 'Completo'}
                    </span>
                  </div>
                </div>

                {def.deficit > 0 && (
                  <div className="text-[10px] bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded text-rose-300 flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" /> Requiere orden de Compra por déficit.
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
            <p className="text-[11px] text-slate-400">Apruebe la liberación de lotes, causando existencias en la bodega de terminados</p>
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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medición (% Humedad o Temp)</label>
              <input
                type="number"
                step="0.1"
                value={qcValue}
                onChange={(e) => setQcValue(parseFloat(e.target.value) || 0)}
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
                placeholder="Humedad ideal, textura suave, color dorado..."
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-1.5 h-16"
              />
            </div>
          </div>

          <button
            onClick={handleCreateQC}
            className="w-full py-2.5 text-center bg-slate-800 hover:bg-slate-750 text-amber-400 font-semibold text-xs tracking-wider uppercase rounded-lg border border-slate-700 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-amber-400" /> Registrar Pruebas de Calidad
          </button>
        </div>

      </div>

    </div>
  );
}

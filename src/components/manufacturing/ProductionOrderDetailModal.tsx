import React, { useState } from 'react';
import { ProductionOrder, BOM, Product, Warehouse } from '../../types';
import { formatCOP, formatQuantity } from '../../utils/currencyUtils';
import { DecimalInput } from '../common/DecimalInput';
import { toast } from '../../context/ToastContext';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  FlaskConical, 
  Package, 
  Clock, 
  Scale, 
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Percent,
  Trash2,
  Ban
} from 'lucide-react';
import { calculatePricingAndProfitability } from '../../utils/pricingEngine';

interface ProductionOrderDetailModalProps {
  order: ProductionOrder;
  bom: BOM | undefined;
  products: Product[];
  warehouses: Warehouse[];
  onClose: () => void;
  onUpdateOrder: (updated: ProductionOrder) => void;
  onUpdateStatus: (id: string, status: ProductionOrder['status']) => void;
  onDeleteOrder?: (id: string) => void;
}

export const ProductionOrderDetailModal: React.FC<ProductionOrderDetailModalProps> = ({
  order,
  bom,
  products,
  warehouses,
  onClose,
  onUpdateOrder,
  onUpdateStatus,
  onDeleteOrder,
}) => {
  const finProd = products.find(p => p.id === bom?.finishedProductId);
  const rawWh = warehouses.find(w => w.id === order.rawWarehouseId);
  const finWh = warehouses.find(w => w.id === order.finishedWarehouseId);

  // Base batch logic: if potassium soap 30L, base is 30. Otherwise 1 or order.baseBatchLiters
  const baseBatchLiters = order.baseBatchLiters || (bom?.id === 'bom-jabon-potasico-30l' ? 30 : 1);
  const scaleFactor = order.scaleFactor || (baseBatchLiters > 0 ? (order.quantity / baseBatchLiters) : 1);

  // Local state for editable real output and inputs
  const [actualProducedQty, setActualProducedQty] = useState<number>(order.actualProducedQuantity ?? order.quantity);
  const [status, setStatus] = useState<ProductionOrder['status']>(order.status);
  const [responsible, setResponsible] = useState<string>(order.responsible || 'WASHINGTON');
  const [lotNumber, setLotNumber] = useState<string>(order.generatedLot || 'L-202610-01');
  const [precioVentaComercial, setPrecioVentaComercial] = useState<number>(6450.0);
  const [margenEsperadoPct, setMargenEsperadoPct] = useState<number>(46.0);

  // Real items overrides (e.g. if entered in real testing)
  const [realValues, setRealValues] = useState<Record<string, number>>(() => {
    // If it's po-dy-0001, seed with the real test numbers from user's Excel sheet!
    if (order.id === 'po-dy-0001') {
      return {
        'mp-aceite-girasol': 506.0,
        'mp-koh-comercial': 104.0,
        'mp-agua-destilada': 243.0,
        'mp-alcohol-etanol-96': 101.0,
        'mp-agua-dilucion': 1000.0,
        'mp-agua-adicional': 2220.0,
        'mp-bicarbonato': 11.0,
        'mp-sal': 22.0,
        'mp-fragancia': 9.0,
        'mp-color': 12.0,
      };
    }
    return {};
  });

  // Calculate scaled items
  const chemicalItems: Array<{
    bomItemId: string;
    product: Product;
    plannedQty: number; // in g
    realQty: number;
    costPerKg: number;
    subtotalCost: number;
    observations?: string;
  }> = [];

  const packagingItems: Array<{
    bomItemId: string;
    product: Product;
    plannedQty: number;
    realQty: number;
    costPerUnit: number;
    subtotalCost: number;
  }> = [];

  let totalChemicalCost = 0;
  let totalPackagingCost = 0;

  if (bom) {
    bom.items.forEach((item) => {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) return;

      const isEmpaque = prod.category?.toLowerCase().includes('empaque') || 
                        prod.category?.toLowerCase().includes('etiqueta') ||
                        prod.category?.toLowerCase().includes('envase') ||
                        prod.unitOfMeasure === 'UND' ||
                        item.productId.startsWith('emp-');

      // Planned quantity scaled by production order quantity (liters)
      const plannedQty = item.quantity * order.quantity;
      const realQty = realValues[prod.id] !== undefined ? realValues[prod.id] : plannedQty;

      if (isEmpaque) {
        const costPerUnit = prod.cost;
        const subtotal = plannedQty * costPerUnit;
        totalPackagingCost += subtotal;

        packagingItems.push({
          bomItemId: item.id,
          product: prod,
          plannedQty,
          realQty,
          costPerUnit,
          subtotalCost: subtotal
        });
      } else {
        // Chemical formulation: unit is 'g'. Product cost in store is $/kg.
        const costPerKg = prod.cost;
        // In the Excel, subtotal cost = (quantity in g / 1000) * costPerKg
        const qtyToCharge = realQty > 0 ? realQty : plannedQty;
        const subtotal = Number(((qtyToCharge / 1000) * costPerKg).toFixed(2));
        totalChemicalCost += subtotal;

        let observations = '';
        if (prod.id === 'mp-aceite-girasol') observations = 'Costo tomado de la hoja Aceites';
        if (prod.id === 'mp-alcohol-etanol-96') observations = 'antes de diluir.';

        chemicalItems.push({
          bomItemId: item.id,
          product: prod,
          plannedQty,
          realQty,
          costPerKg,
          subtotalCost: subtotal,
          observations
        });
      }
    });
  }

  const laborCost = (order.productionHours || 0) * (order.laborHourlyRate || 0);
  const overheadCost = (order.productionHours || 0) * (order.overheadHourlyRate || 0);
  const totalLotCost = totalChemicalCost + totalPackagingCost + laborCost + overheadCost;

  // Closing metrics
  const estimatedLiters = order.quantity;
  const yieldPercentage = estimatedLiters > 0 ? ((actualProducedQty / estimatedLiters) * 100) : 100;
  const wasteLiters = Math.max(0, estimatedLiters - actualProducedQty);
  const costPerLiter = actualProducedQty > 0 ? (totalLotCost / actualProducedQty) : (estimatedLiters > 0 ? (totalLotCost / estimatedLiters) : 0);

  // Módulo de Fijación de Precios y Utilidades (Pricing & Margen Comercial del Lote)
  const batchUnitsCount = actualProducedQty > 0 ? actualProducedQty : (estimatedLiters > 0 ? estimatedLiters : 15);
  const unitProductionCost = costPerLiter > 0 ? costPerLiter : 4397.0;

  const pricingResult = calculatePricingAndProfitability({
    costo_unitario_produccion: unitProductionCost,
    unidades_lote: batchUnitsCount,
    precio_venta_comercial: precioVentaComercial,
    margen_esperado_porcentaje: margenEsperadoPct
  });

  const handleSave = () => {
    const updated: ProductionOrder = {
      ...order,
      actualProducedQuantity: actualProducedQty,
      yieldPercentage: Number(yieldPercentage.toFixed(1)),
      wasteLiters: Number(wasteLiters.toFixed(1)),
      status,
      responsible,
      generatedLot: lotNumber,
      costsReal: {
        materials: Number((totalChemicalCost + totalPackagingCost).toFixed(2)),
        labor: laborCost,
        overhead: overheadCost
      }
    };
    onUpdateOrder(updated);
    if (status !== order.status) {
      onUpdateStatus(order.id, status);
    }
    toast.success("Orden de producción actualizada correctamente.", "OP Actualizada");
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-6">
        
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Orden de Producción – {finProd?.name || 'Jabón Líquido Potásico'}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {order.orderNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Lote base {baseBatchLiters} L · Factor de Escala: <strong className="text-emerald-400 font-mono">{scaleFactor.toFixed(3)}</strong> (Litros a producir ÷ {baseBatchLiters})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer text-xs flex items-center gap-1.5"
              title="Imprimir Orden de Fabricación"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          {/* Yellow/Blue Excel Header Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-800 dark:text-slate-200">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">N° de Orden:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Fecha:</span>
                <span className="font-mono text-slate-900 dark:text-white">{order.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Producto:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{finProd?.name || 'Jabón Líquido'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Lote:</span>
                <input
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  className="font-mono font-bold text-xs bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded px-2 py-0.5 text-amber-950 dark:text-amber-200"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Responsable:</span>
                <input
                  type="text"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  className="font-bold text-xs bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded px-2 py-0.5 text-amber-950 dark:text-amber-200 uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Aceite base:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Aceite de girasol</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Litros a producir:</span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                  {order.quantity.toFixed(1)} L
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Versión de fórmula:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{bom?.version || 'v7 lote base 30 L'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Factor de escala:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {scaleFactor.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Control Superfat:</span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[10.5px]">
                  0.0% (Hogar / Lavaloza)
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Bodega origen:</span>
                <span className="text-slate-900 dark:text-white font-medium text-[11px] truncate">{rawWh?.name || 'Insumos'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Bodega destino:</span>
                <span className="text-slate-900 dark:text-white font-medium text-[11px] truncate">{finWh?.name || 'Terminados'}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Estado OP:</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="text-xs font-bold rounded-lg px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                >
                  <option value="pendiente">Abierta / Pendiente</option>
                  <option value="proceso">En Proceso</option>
                  <option value="calidad">Control Calidad</option>
                  <option value="completada">Completada / Cerrada</option>
                  <option value="cancelada">🚫 Cancelada (No va)</option>
                  <option value="rechazada">Rechazada</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE 1: Formulación Química */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-amber-500" />
                1. Insumos Químicos & Materias Primas de Formulación
              </h3>
              <span className="text-[11px] text-slate-400">
                Cantidades en gramos (g) · Costos en $/kg
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold text-[10px] uppercase">
                    <th className="py-2.5 px-3">Insumo</th>
                    <th className="py-2.5 px-2 text-center">Unidad</th>
                    <th className="py-2.5 px-3 text-right">Planificado</th>
                    <th className="py-2.5 px-3 text-right bg-amber-600/30">Real (g)</th>
                    <th className="py-2.5 px-3 text-right">Costo unit. ($/kg)</th>
                    <th className="py-2.5 px-3 text-right">Costo ($)</th>
                    <th className="py-2.5 px-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {chemicalItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-white">
                        {item.product.name}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400">g</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                        {item.plannedQty.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-3 text-right bg-amber-500/10">
                        <input
                          type="number"
                          value={item.realQty}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setRealValues(prev => ({ ...prev, [item.product.id]: val }));
                          }}
                          className="w-20 text-right bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-amber-900 dark:text-amber-200"
                        />
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                        {formatCOP(item.costPerKg)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {formatCOP(item.subtotalCost)}
                      </td>
                      <td className="py-2 px-3 text-[11px] font-sans text-slate-400 italic">
                        {item.observations || '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-white">
                    <td className="py-2.5 px-3 font-sans uppercase">Total Insumos Químicos</td>
                    <td className="py-2.5 px-2 text-center">g</td>
                    <td className="py-2.5 px-3 text-right">
                      {chemicalItems.reduce((acc, i) => acc + i.plannedQty, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2.5 px-3 text-right bg-amber-500/20 text-amber-900 dark:text-amber-300">
                      {chemicalItems.reduce((acc, i) => acc + i.realQty, 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2.5 px-3 text-right">-</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                      {formatCOP(totalChemicalCost)}
                    </td>
                    <td className="py-2.5 px-3">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLE 2: Empaque, Mano de Obra y CIF */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-500" />
              2. Materiales de Empaque, Mano de Obra & Costos Indirectos (CIF)
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold text-[10px] uppercase">
                    <th className="py-2.5 px-3">Empaque / Concepto</th>
                    <th className="py-2.5 px-2 text-center">Unidad</th>
                    <th className="py-2.5 px-3 text-right">Planificado</th>
                    <th className="py-2.5 px-3 text-right bg-amber-600/30">Real</th>
                    <th className="py-2.5 px-3 text-right">Costo unit. ($/u)</th>
                    <th className="py-2.5 px-3 text-right">Costo ($)</th>
                    <th className="py-2.5 px-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {packagingItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-white">
                        {item.product.name}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400">u</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                        {item.plannedQty.toFixed(0)}
                      </td>
                      <td className="py-2 px-3 text-right bg-amber-500/10">
                        <span className="font-bold text-amber-900 dark:text-amber-200">{item.realQty.toFixed(0)}</span>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                        {formatCOP(item.costPerUnit)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {formatCOP(item.subtotalCost)}
                      </td>
                      <td className="py-2 px-3 text-[11px] font-sans text-slate-400 italic">
                        {item.product.id === 'emp-etiqueta-potasico' ? '10x15cm Det liquido Potasico 1L' : '-'}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Labor */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-white">Mano de obra</td>
                    <td className="py-2 px-2 text-center text-slate-400">horas</td>
                    <td className="py-2 px-3 text-right">{order.productionHours || 0}</td>
                    <td className="py-2 px-3 text-right bg-amber-500/10">-</td>
                    <td className="py-2 px-3 text-right">{formatCOP(order.laborHourlyRate || 0)}</td>
                    <td className="py-2 px-3 text-right font-bold">{formatCOP(laborCost)}</td>
                    <td className="py-2 px-3 text-[11px] font-sans text-slate-400 italic">-</td>
                  </tr>

                  {/* CIF */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-white">Energía / gas (CIF)</td>
                    <td className="py-2 px-2 text-center text-slate-400">global</td>
                    <td className="py-2 px-3 text-right">{order.productionHours || 0}</td>
                    <td className="py-2 px-3 text-right bg-amber-500/10">-</td>
                    <td className="py-2 px-3 text-right">{formatCOP(order.overheadHourlyRate || 0)}</td>
                    <td className="py-2 px-3 text-right font-bold">{formatCOP(overheadCost)}</td>
                    <td className="py-2 px-3 text-[11px] font-sans text-slate-400 italic">-</td>
                  </tr>

                  <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-white">
                    <td className="py-2.5 px-3 font-sans uppercase">Total Empaque, MO y CIF</td>
                    <td className="py-2.5 px-2 text-center">-</td>
                    <td className="py-2.5 px-3 text-right">-</td>
                    <td className="py-2.5 px-3 text-right bg-amber-500/20">-</td>
                    <td className="py-2.5 px-3 text-right">-</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                      {formatCOP(totalPackagingCost + laborCost + overheadCost)}
                    </td>
                    <td className="py-2.5 px-3">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLE 3: Cierre de la OP (Excel exact replica) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-500" />
              3. Cierre de la OP & Rendimiento Real
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-800 text-white font-bold text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3" colSpan={2}>Indicador de Cierre</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3">Observaciones / Reglas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-slate-800 dark:text-slate-200">
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold" colSpan={2}>Producción estimada (L)</td>
                    <td className="py-2.5 px-3 text-right font-bold">{estimatedLiters.toFixed(1)}</td>
                    <td className="py-2.5 px-3 text-[11px] font-sans text-slate-400">Meta programada del lote</td>
                  </tr>
                  <tr className="bg-amber-500/10">
                    <td className="py-2.5 px-3 font-sans font-semibold text-amber-950 dark:text-amber-200" colSpan={2}>
                      Producción real (L)
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={actualProducedQty}
                        onChange={(e) => setActualProducedQty(parseFloat(e.target.value) || 0)}
                        className="w-24 text-right bg-white dark:bg-slate-900 border border-amber-400 rounded px-2 py-1 font-bold text-amber-900 dark:text-amber-200 text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-sans text-amber-800 dark:text-amber-300">
                      Litros reales obtenidos tras dilución y envasado
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold" colSpan={2}>Rendimiento real vs. estimado</td>
                    <td className="py-2.5 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                      {yieldPercentage.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-sans text-slate-400">
                      (Producción real ÷ Producción estimada) * 100
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold" colSpan={2}>Merma (L)</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-500">
                      {wasteLiters.toFixed(1)} L
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-sans text-slate-400">
                      Litros no recuperados / mermas en pailas o tuberías
                    </td>
                  </tr>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold">
                    <td className="py-2.5 px-3 font-sans uppercase" colSpan={2}>Costo total del lote ($)</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCOP(totalLotCost)}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-sans text-slate-400">
                      Suma de insumos químicos, empaque, mano de obra y CIF
                    </td>
                  </tr>
                  <tr className="bg-blue-500/10 text-blue-900 dark:text-blue-200 font-bold">
                    <td className="py-2.5 px-3 font-sans uppercase" colSpan={2}>Costo por litro ($/L)</td>
                    <td className="py-2.5 px-3 text-right text-sm">
                      {formatCOP(costPerLiter)}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-sans italic opacity-80">
                      Usa la producción real si está cargada; si no, la estimada
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold" colSpan={2}>Firma del responsable</td>
                    <td className="py-2.5 px-3 text-right font-bold font-sans uppercase text-slate-900 dark:text-white">
                      {responsible}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-sans text-slate-400">
                      Aprobación técnica de liberación de lote
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Módulo de Fijación de Precios y Utilidades (Pricing & Margen Comercial del Lote) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                4. Fijación de Precios y Utilidades (Pricing & Rentabilidad del Lote)
              </span>
              <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Fórmulas Validadas Excel
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/40 dark:from-slate-900 dark:to-slate-950 border border-blue-200/80 dark:border-blue-900/50 space-y-4">
              {/* Input row: Margen Esperado & Precio Comercial Real */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Precio Costo x Und
                  </span>
                  <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-100">
                    {formatCOP(pricingResult.costo_unitario_produccion)}
                  </div>
                  <span className="text-[9.5px] text-slate-400">Costo unit. de producción</span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Unidades Totales del Lote
                  </span>
                  <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-100">
                    {pricingResult.unidades_lote} unds
                  </div>
                  <span className="text-[9.5px] text-slate-400">Volumen del lote actual</span>
                </div>

                <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-300 dark:border-blue-800 shadow-xs">
                  <label className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase block mb-1">
                    Margen Esperado (%)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      value={margenEsperadoPct}
                      onChange={(e) => setMargenEsperadoPct(parseFloat(e.target.value) || 0)}
                      className="w-full text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-blue-400 dark:border-blue-700 rounded-lg px-2 py-1 text-blue-950 dark:text-blue-200"
                    />
                    <span className="font-bold text-blue-700 dark:text-blue-300 text-xs">%</span>
                  </div>
                  <span className="text-[9.5px] text-blue-600 dark:text-blue-400 block mt-1">
                    Sugerido: {pricingResult.formato.precio_venta_sugerido}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-xs">
                  <label className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block mb-1">
                    Precio Venta Comercial ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={precioVentaComercial}
                    onChange={(e) => setPrecioVentaComercial(parseFloat(e.target.value) || 0)}
                    className="w-full text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-700 rounded-lg px-2 py-1 text-emerald-950 dark:text-emerald-200"
                  />
                  <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 block mt-1">
                    Precio real definido al cliente
                  </span>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Costo Total Lote</span>
                  <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                    {pricingResult.formato.costo_total_lote}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Costo Unit × Unds</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Utilidad Bruta Lote</span>
                  <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                    {pricingResult.formato.utilidad_bruta_lote}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Precio Comercial × Unds</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Utilidad Neta x Und</span>
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {pricingResult.formato.utilidad_neta_unitaria}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Precio Com. - Costo Unit</span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-bold block">Utilidad Neta del Lote</span>
                  <div className="text-sm font-mono font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {pricingResult.formato.utilidad_neta_lote}
                  </div>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono">Util. Bruta - Costo Total</span>
                </div>
              </div>

              {/* Block of Percentage Commercial Indicators */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-3 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Bloque de Indicadores Porcentuales Comerciales:
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">Margen Costo:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {pricingResult.formato.margen_costo_porcentaje}
                      </span>
                    </div>
                    <span className="text-[8.5px] text-slate-400 block font-mono mt-0.5">(Costo / Precio Com.) × 100</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">Base Comercial:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {pricingResult.formato.porcentaje_precio_comercial_base}
                      </span>
                    </div>
                    <span className="text-[8.5px] text-slate-400 block font-mono mt-0.5">Siempre 100.00%</span>
                  </div>

                  <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-blue-700 dark:text-blue-300">Margen Sugerido:</span>
                      <span className="font-mono font-bold text-blue-800 dark:text-blue-200">
                        {pricingResult.formato.margen_sugerido_porcentaje}
                      </span>
                    </div>
                    <span className="text-[8.5px] text-blue-500 dark:text-blue-400 block font-mono mt-0.5">(Sugerido / Comercial) × 100</span>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">Margen Real:</span>
                      <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200">
                        {pricingResult.formato.margen_utilidad_real_porcentaje}
                      </span>
                    </div>
                    <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 block font-mono mt-0.5">(Utilidad Neta / Comercial) × 100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 mr-1">
              Estado: <strong className="uppercase text-slate-800 dark:text-white">{status}</strong>
            </span>
            {status !== 'cancelada' && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Deseas marcar la orden ${order.orderNumber} como CANCELADA (no va)?`)) {
                    setStatus('cancelada');
                    onUpdateStatus(order.id, 'cancelada');
                    toast.warning(`Orden ${order.orderNumber} marcada como cancelada.`, "Orden Cancelada");
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Cancelar orden de producción"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancelar Orden (No va)</span>
              </button>
            )}
            {onDeleteOrder && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Estás seguro de ELIMINAR permanentemente la orden ${order.orderNumber}? Esta acción retirará la orden del sistema.`)) {
                    onDeleteOrder(order.id);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Eliminar orden por completo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Orden</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Cierre & Cambios</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

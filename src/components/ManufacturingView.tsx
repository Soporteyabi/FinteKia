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
  ArrowRight,
  Eye,
  Scale,
  FileText,
  RotateCcw,
  Sparkles,
  Ban
} from 'lucide-react';
import { exportManufacturingToExcel } from '../utils/excelExport';
import { formatCOP, parseDecimal, formatQuantity } from '../utils/currencyUtils';
import { DecimalInput } from './common/DecimalInput';
import { BOMModal } from './manufacturing/BOMModal';
import { ProductionOrderDetailModal } from './manufacturing/ProductionOrderDetailModal';
import { UnitCostFloatingTag } from './common/UnitCostFloatingTag';
import { PricingCalculator } from './pricing/PricingCalculator';
import { ChemicalFormulationCalculator } from './manufacturing/ChemicalFormulationCalculator';

interface ManufacturingViewProps {
  boms: BOM[];
  products: Product[];
  productionOrders: ProductionOrder[];
  inventory: InventoryItem[];
  warehouses: Warehouse[];
  addProductionOrder: (po: Omit<ProductionOrder, 'id' | 'orderNumber'>) => void;
  updateOrderStatus: (id: string, newStatus: ProductionOrder['status']) => void;
  updateProductionOrder?: (updated: ProductionOrder) => void;
  deleteProductionOrder?: (id: string) => void;
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
  updateProductionOrder,
  deleteProductionOrder,
  addQualityInspection,
  onOpenKiosk,
  addBOM,
  updateBOM,
  deleteBOM,
  addProduct,
  currentCompanyId = 'co-1'
}: ManufacturingViewProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'recipes' | 'formulation' | 'pricing'>('orders');
  
  // Clean default warehouses (Bodega de Materia Prima / Bodega de Despachos)
  const defaultRawWh = warehouses.find(w => w.id === 'wh-1')?.id || warehouses[0]?.id || 'wh-1';
  const defaultFinWh = warehouses.find(w => w.id === 'wh-2')?.id || warehouses[1]?.id || warehouses[0]?.id || 'wh-2';
  const defaultBOM = boms.find(b => b.id === 'bom-jabon-potasico-30l')?.id || boms[0]?.id || '';

  const [selectedBOMId, setSelectedBOMId] = useState(defaultBOM);
  const [prodQty, setProdQty] = useState<number>(defaultBOM === 'bom-jabon-potasico-30l' ? 20 : 10);
  const [dueDate, setDueDate] = useState('');
  const [customLot, setCustomLot] = useState<string>('L-202610-01');
  const [responsiblePerson, setResponsiblePerson] = useState<string>('WASHINGTON');

  // Routing and Cost configurations
  const [rawWhId, setRawWhId] = useState(defaultRawWh);
  const [finWhId, setFinWhId] = useState(defaultFinWh);
  const [productionHours, setProductionHours] = useState(2);
  const [laborHourlyRate, setLaborHourlyRate] = useState(0);
  const [overheadHourlyRate, setOverheadHourlyRate] = useState(0);

  // Lógica matemática para cálculo de subtotal de insumos:
  // Si la U.M. es gramos ('g', 'gr'), el costo unitario ingresado está expresado en $/kg.
  // Regla: Subtotal ($) = (Cantidad en gramos ÷ 1000) × Costo Unitario por Kilo.
  // Para unidades ('UND', 'u', frascos, tapas, etiquetas) o litros ('L'): Subtotal ($) = Cantidad × Costo Unitario.
  const calculateMaterialSubtotal = (qty: number, unitCost: number, unitOfMeasure?: string): number => {
    const uom = (unitOfMeasure || '').trim().toLowerCase();
    if (uom === 'g' || uom === 'gr' || uom === 'gramos' || uom === 'gramo') {
      return Number(((qty / 1000) * unitCost).toFixed(2));
    }
    return Number((qty * unitCost).toFixed(2));
  };

  // Editable batch ingredients state for this specific order
  interface OrderLauncherItem {
    id: string;
    productId: string;
    name: string;
    unitOfMeasure: string;
    plannedQty: number;
    requiredQty: number; // Editable per batch!
    unitCost: number;     // Editable per batch ($/kg para químicos o $/u para empaques)!
    isCustom?: boolean;
    category?: string;
  }

  const [customOrderItems, setCustomOrderItems] = useState<OrderLauncherItem[]>([]);
  const [isMaterialsCustomized, setIsMaterialsCustomized] = useState<boolean>(false);
  const [showAddExtraItem, setShowAddExtraItem] = useState<boolean>(false);
  const [extraItemProductId, setExtraItemProductId] = useState<string>('');
  const [extraItemQty, setExtraItemQty] = useState<number>(1);
  const [extraItemCost, setExtraItemCost] = useState<number>(0);
  const [focusedCostItemId, setFocusedCostItemId] = useState<string | null>(null);
  const [isExtraCostFocused, setIsExtraCostFocused] = useState<boolean>(false);

  // QC logs state
  const [qcTargetOrderId, setQcTargetOrderId] = useState('');
  const [qcValue, setQcValue] = useState(4.5);
  const [qcResult, setQcResult] = useState<'Aprobado' | 'Rechazado'>('Aprobado');
  const [qcNotes, setQcNotes] = useState('');

  // BOM Modal State & Order Detail Modal State
  const [isBOMModalOpen, setIsBOMModalOpen] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);
  const [viewingOrder, setViewingOrder] = useState<ProductionOrder | null>(null);

  // Cancel order handler
  const handleCancelOrder = (order: ProductionOrder) => {
    if (order.status === 'cancelada') {
      toast.info(`La orden ${order.orderNumber} ya se encuentra cancelada.`, "Orden Cancelada");
      return;
    }
    if (window.confirm(`¿Estás seguro de cancelar la orden ${order.orderNumber}? Su estado pasará a "CANCELADA" y no consumirá materiales.`)) {
      updateOrderStatus(order.id, 'cancelada');
      toast.warning(`Orden ${order.orderNumber} cancelada correctamente.`, "Orden Cancelada");
    }
  };

  // Delete order handler
  const handleDeleteOrder = (order: ProductionOrder) => {
    if (window.confirm(`¿Estás seguro de ELIMINAR permanentemente la orden ${order.orderNumber}? Esta acción no se puede deshacer.`)) {
      if (deleteProductionOrder) {
        deleteProductionOrder(order.id);
      } else {
        updateOrderStatus(order.id, 'cancelada');
        toast.warning(`Orden ${order.orderNumber} cancelada.`, "Orden Cancelada");
      }
    }
  };

  // Auto-select first BOM if none selected and boms exist
  useEffect(() => {
    if ((!selectedBOMId || !boms.some(b => b.id === selectedBOMId)) && boms.length > 0) {
      const potBom = boms.find(b => b.id === 'bom-jabon-potasico-30l');
      setSelectedBOMId(potBom ? potBom.id : boms[0].id);
    }
  }, [boms, selectedBOMId]);

  // Keep warehouses valid
  useEffect(() => {
    if (!warehouses.some(w => w.id === rawWhId)) {
      setRawWhId(warehouses.find(w => w.id === 'wh-1')?.id || warehouses[0]?.id || 'wh-1');
    }
    if (!warehouses.some(w => w.id === finWhId)) {
      setFinWhId(warehouses.find(w => w.id === 'wh-2')?.id || warehouses[1]?.id || warehouses[0]?.id || 'wh-2');
    }
  }, [warehouses, rawWhId, finWhId]);

  // Synchronize batch ingredients when recipe, quantity, or raw warehouse changes
  useEffect(() => {
    const activeBOM = boms.find(b => b.id === selectedBOMId);
    if (!activeBOM) {
      setCustomOrderItems([]);
      return;
    }
    const initialItems: OrderLauncherItem[] = activeBOM.items.map((bomItem, idx) => {
      const mat = products.find(p => p.id === bomItem.productId);
      const matchingStock = inventory.filter(
        (item) => item.productId === bomItem.productId && item.warehouseId === rawWhId
      );
      const activeStockSlot = matchingStock.find((item) => item.quantity > 0) || matchingStock[0];
      const unitCost = activeStockSlot ? activeStockSlot.avgCost : (mat ? mat.cost : 0);
      const planned = bomItem.quantity * (prodQty || 0);

      return {
        id: `oi-${idx}-${bomItem.productId}`,
        productId: bomItem.productId,
        name: mat ? mat.name : 'Insumo',
        unitOfMeasure: mat ? (mat.unitOfMeasure || 'UND') : 'UND',
        plannedQty: Number(planned.toFixed(3)),
        requiredQty: Number(planned.toFixed(3)),
        unitCost: unitCost,
        category: mat?.category,
        isCustom: false
      };
    });
    setCustomOrderItems(initialItems);
    setIsMaterialsCustomized(false);
  }, [selectedBOMId, prodQty, rawWhId, boms, products]);

  // Handlers for modifying batch insumos
  const handleUpdateItemQty = (index: number, newQty: number) => {
    setIsMaterialsCustomized(true);
    setCustomOrderItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], requiredQty: newQty };
      return next;
    });
  };

  const handleUpdateItemCost = (index: number, newCost: number) => {
    setIsMaterialsCustomized(true);
    setCustomOrderItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], unitCost: newCost };
      return next;
    });
  };

  const handleRemoveLauncherItem = (index: number) => {
    setIsMaterialsCustomized(true);
    setCustomOrderItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleResetMaterialsToBOM = () => {
    const activeBOM = boms.find(b => b.id === selectedBOMId);
    if (!activeBOM) return;
    const initialItems: OrderLauncherItem[] = activeBOM.items.map((bomItem, idx) => {
      const mat = products.find(p => p.id === bomItem.productId);
      const matchingStock = inventory.filter(
        (item) => item.productId === bomItem.productId && item.warehouseId === rawWhId
      );
      const activeStockSlot = matchingStock.find((item) => item.quantity > 0) || matchingStock[0];
      const unitCost = activeStockSlot ? activeStockSlot.avgCost : (mat ? mat.cost : 0);
      const planned = bomItem.quantity * (prodQty || 0);

      return {
        id: `oi-${idx}-${bomItem.productId}`,
        productId: bomItem.productId,
        name: mat ? mat.name : 'Insumo',
        unitOfMeasure: mat ? (mat.unitOfMeasure || 'UND') : 'UND',
        plannedQty: Number(planned.toFixed(3)),
        requiredQty: Number(planned.toFixed(3)),
        unitCost: unitCost,
        category: mat?.category,
        isCustom: false
      };
    });
    setCustomOrderItems(initialItems);
    setIsMaterialsCustomized(false);
    toast.info("Insumos restablecidos según la ficha técnica original.", "Insumos Restablecidos");
  };

  const handleAddExtraLauncherItem = () => {
    if (!extraItemProductId) {
      toast.warning("Seleccione un insumo del catálogo.", "Insumo Requerido");
      return;
    }
    const mat = products.find(p => p.id === extraItemProductId);
    if (!mat) return;
    const matchingStock = inventory.filter(
      (item) => item.productId === mat.id && item.warehouseId === rawWhId
    );
    const activeStockSlot = matchingStock.find((item) => item.quantity > 0) || matchingStock[0];
    const unitCost = extraItemCost > 0 ? extraItemCost : (activeStockSlot ? activeStockSlot.avgCost : mat.cost);

    setCustomOrderItems(prev => [
      ...prev,
      {
        id: `extra-${Date.now()}`,
        productId: mat.id,
        name: mat.name,
        unitOfMeasure: mat.unitOfMeasure || 'UND',
        plannedQty: extraItemQty,
        requiredQty: extraItemQty,
        unitCost: unitCost,
        category: mat.category,
        isCustom: true
      }
    ]);
    setIsMaterialsCustomized(true);
    setShowAddExtraItem(false);
    setExtraItemProductId('');
    setExtraItemQty(1);
    setExtraItemCost(0);
    toast.success(`Insumo adicional "${mat.name}" añadido a esta orden.`, "Insumo Añadido");
  };

  // Pagination for manufacturing orders (15 per page)
  const [prodOrdersPage, setProdOrdersPage] = useState(1);
  const PROD_ORDERS_PER_PAGE = 15;

  const totalProdOrdersPages = Math.max(1, Math.ceil(productionOrders.length / PROD_ORDERS_PER_PAGE));
  const safeProdOrdersPage = Math.min(prodOrdersPage, totalProdOrdersPages);
  const paginatedProdOrders = productionOrders.slice(
    (safeProdOrdersPage - 1) * PROD_ORDERS_PER_PAGE,
    safeProdOrdersPage * PROD_ORDERS_PER_PAGE
  );

  // Active BOM
  const activeBOM = boms.find((b) => b.id === selectedBOMId);

  // Calculate live costs based on user's editable materials (handling g vs kg properly)
  const estimatedMaterialsCost = customOrderItems.reduce((sum, item) => {
    return sum + calculateMaterialSubtotal(item.requiredQty, item.unitCost, item.unitOfMeasure);
  }, 0);
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

    const is30L = targetBOM.id === 'bom-jabon-potasico-30l' || targetBOM.version?.toLowerCase().includes('30 l') || targetBOM.version?.toLowerCase().includes('30l');
    const calculatedScaleFactor = is30L ? Number(((prodQty || 0) / 30).toFixed(3)) : 1;

    // Trigger state changes
    addProductionOrder({
      bomId: selectedBOMId,
      quantity: prodQty,
      startDate: new Date().toISOString().substring(0, 10),
      dueDate: dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      status: 'proceso',
      costEstimates: { 
        materials: Number(estimatedMaterialsCost.toFixed(2)), 
        labor: estimatedLaborCost, 
        overhead: estimatedOverheadCost 
      },
      costsReal: {
        materials: Number(estimatedMaterialsCost.toFixed(2)), 
        labor: estimatedLaborCost, 
        overhead: estimatedOverheadCost 
      },
      generatedLot: customLot || `L-${new Date().toISOString().substring(0, 7).replace('-', '')}-01`,
      responsible: responsiblePerson || 'WASHINGTON',
      scaleFactor: calculatedScaleFactor,
      baseBatchLiters: is30L ? 30 : 1,
      actualProducedQuantity: prodQty,
      yieldPercentage: 100,
      wasteLiters: 0,
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

          <button
            type="button"
            onClick={() => setActiveTab('formulation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'formulation'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <FlaskConical className="w-4 h-4 text-amber-400" />
            <span>Formulación Química (Superfat & KOH)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
              0.0% / 3.0%
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pricing'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Fijación de Precios & Utilidades</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold">
              Excel
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
      {/* TAB 3: MÓDULO DE FIJACIÓN DE PRECIOS Y UTILIDADES        */}
      {/* ======================================================== */}
      {activeTab === 'pricing' && (
        <div className="animate-fade-in">
          <PricingCalculator />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: MÓDULO DE FORMULACIÓN QUÍMICA (SUPERFAT & KOH)     */}
      {/* ======================================================== */}
      {activeTab === 'formulation' && (
        <div className="animate-fade-in">
          <ChemicalFormulationCalculator />
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

              {/* Compact Inline Recipe & Scale Badge */}
              {activeBOM && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Fórmula: {products.find(p => p.id === activeBOM.finishedProductId)?.name || activeBOM.name || 'Producto'}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1.5 font-mono">
                        ({activeBOM.version})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(activeBOM.id === 'bom-jabon-potasico-30l' || activeBOM.version?.toLowerCase().includes('30l') || activeBOM.version?.toLowerCase().includes('30 l')) && (
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold">
                        Lote Base: 30 L · Factor Escala: <strong>{((prodQty || 0) / 30).toFixed(3)}</strong>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBOM(activeBOM);
                        setIsBOMModalOpen(true);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Editar fórmula maestra base para todos los lotes"
                    >
                      <Edit3 className="w-3 h-3 text-blue-500" />
                      <span>Editar Receta Base</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Superfat Chemical Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Variable de Control Superfat:
                    </span>
                    <span className="text-slate-500 text-[11px] ml-1.5 font-medium">
                      Hogar (0.0% s/ ropa/vajilla) · Cuidado Personal (3.0% humectante)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('formulation')}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    title="Abrir la calculadora química estequiométrica de Superfat y KOH"
                  >
                    <span>Abrir Simulador de Superfat</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Compact Form Grid: 2 Clean Rows */}
              <div className="space-y-2.5">
                {/* Row 1: Recipe, Quantity, Lot, Due Date, Responsible */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Receta / Ficha *
                    </label>
                    <select
                      value={selectedBOMId}
                      onChange={(e) => setSelectedBOMId(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2 py-1.5 font-medium truncate"
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

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-semibold">
                      Litros / Unds *
                    </label>
                    <DecimalInput
                      min={0.01}
                      value={prodQty}
                      onChange={(val) => setProdQty(val)}
                      placeholder="20"
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2 py-1.5 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      N° Lote OP
                    </label>
                    <input
                      type="text"
                      value={customLot}
                      onChange={(e) => setCustomLot(e.target.value)}
                      placeholder="L-202610-01"
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2 py-1.5 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Fecha Entrega
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2 py-1.5 font-mono"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Responsable
                    </label>
                    <input
                      type="text"
                      value={responsiblePerson}
                      onChange={(e) => setResponsiblePerson(e.target.value)}
                      placeholder="WASHINGTON"
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2 py-1.5 font-bold uppercase"
                    />
                  </div>
                </div>

                {/* Row 2: Origin Warehouse, Destination Warehouse, Hours, MO Rate, CIF Rate */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1 truncate">
                      <WhIcon className="w-3 h-3 text-blue-500 shrink-0" /> Bodega Insumos
                    </label>
                    <select
                      value={rawWhId}
                      onChange={(e) => setRawWhId(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2 py-1.5 truncate"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1 truncate">
                      <WhIcon className="w-3 h-3 text-emerald-500 shrink-0" /> Bodega Destino
                    </label>
                    <select
                      value={finWhId}
                      onChange={(e) => setFinWhId(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2 py-1.5 truncate"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Clock className="w-3 h-3 text-slate-400" /> Horas Fab.
                    </label>
                    <DecimalInput
                      min={0.1}
                      value={productionHours}
                      onChange={(val) => setProductionHours(val || 0.5)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Coins className="w-3 h-3 text-slate-400" /> M.O. ($/Hr)
                    </label>
                    <DecimalInput
                      min={0}
                      prefix="$"
                      value={laborHourlyRate}
                      onChange={(val) => setLaborHourlyRate(val)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Settings className="w-3 h-3 text-slate-400" /> CIF ($/Hr)
                    </label>
                    <DecimalInput
                      min={0}
                      prefix="$"
                      value={overheadHourlyRate}
                      onChange={(val) => setOverheadHourlyRate(val)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2 py-1.5 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Compact & Fully Editable Insumos / Materias Primas Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/40 space-y-0">
                {/* Table Header Bar */}
                <div className="bg-slate-100 dark:bg-slate-800/80 px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Insumos Requeridos para esta Orden ({customOrderItems.length})
                    </span>
                    {isMaterialsCustomized && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                        Ajustado manualmente
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddExtraItem(!showAddExtraItem)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Insumo Extra</span>
                    </button>
                    {isMaterialsCustomized && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={handleResetMaterialsToBOM}
                          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                          title="Restablecer cantidades y costos a la receta original"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restablecer</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Sub-panel to add extra product or raw material */}
                {showAddExtraItem && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900/40 flex flex-wrap items-end gap-2 text-xs">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                        Seleccionar Insumo del Catálogo:
                      </label>
                      <select
                        value={extraItemProductId}
                        onChange={(e) => {
                          setExtraItemProductId(e.target.value);
                          const p = products.find(prod => prod.id === e.target.value);
                          if (p) setExtraItemCost(p.cost);
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
                      >
                        <option value="">Seleccionar insumo / producto...</option>
                        {products
                          .filter(p => p.type !== 'terminado' && p.type !== 'servicio')
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unitOfMeasure || 'UND'}) - Costo Ref: {formatCOP(p.cost)}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                        Cantidad:
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={extraItemQty}
                        onChange={(e) => setExtraItemQty(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 font-mono font-bold"
                      />
                    </div>

                    <div className="w-32 relative">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                          Costo Unit ($):
                        </label>
                        <span className="text-[9px] font-bold font-mono text-amber-600 dark:text-amber-400">
                          {products.find(p => p.id === extraItemProductId)?.unitOfMeasure === 'g' ? '$/kg' : '$/u'}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={extraItemCost}
                        onChange={(e) => setExtraItemCost(parseFloat(e.target.value) || 0)}
                        onFocus={() => setIsExtraCostFocused(true)}
                        onBlur={() => setIsExtraCostFocused(false)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 font-mono font-bold"
                      />
                      <UnitCostFloatingTag
                        unitOfMeasure={products.find(p => p.id === extraItemProductId)?.unitOfMeasure || 'g'}
                        unitCost={extraItemCost}
                        quantity={extraItemQty}
                        show={isExtraCostFocused}
                        position="top"
                      />
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleAddExtraLauncherItem}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                      >
                        Añadir
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddExtraItem(false)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Banner de Validación de Unidades de Costo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      <strong>Control de Unidades:</strong> Químicos/Líquidos en gramos (<code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded text-amber-900 dark:text-amber-100 font-bold">g</code>) requieren costo por KILO (<strong className="text-amber-800 dark:text-amber-300">$/kg</strong>). El sistema divide automáticamente entre 1.000.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 shrink-0">
                    Subtotal = (g ÷ 1.000) × $/kg
                  </span>
                </div>

                {/* Table Rows */}
                <div className="max-h-80 overflow-y-auto overflow-x-visible pb-12">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-200/60 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold sticky top-0 backdrop-blur-sm z-10">
                        <th className="py-2 px-3">Insumo / Materia Prima</th>
                        <th className="py-2 px-2 text-center">U.M.</th>
                        <th className="py-2 px-2.5 text-right">Planif.</th>
                        <th className="py-2 px-2.5 text-right bg-blue-500/10 text-blue-700 dark:text-blue-300">
                          Cant. Requerida (Editable)
                        </th>
                        <th className="py-2 px-2.5 text-right bg-amber-500/10 text-amber-800 dark:text-amber-200">
                          Costo Unit. ($/kg o $/u)
                        </th>
                        <th className="py-2 px-3 text-right">Stock en Bodega</th>
                        <th className="py-2 px-3 text-right">Subtotal ($)</th>
                        <th className="py-2 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {customOrderItems.map((item, idx) => {
                        const matchingStock = inventory.filter(
                          (inv) => inv.productId === item.productId && inv.warehouseId === rawWhId
                        );
                        const stockAvailable = matchingStock.reduce((sum, inv) => sum + inv.quantity, 0);
                        const isDeficit = item.requiredQty > stockAvailable;
                        const subtotal = calculateMaterialSubtotal(item.requiredQty, item.unitCost, item.unitOfMeasure);
                        const isEmpaque = item.category?.toLowerCase().includes('empaque') ||
                                          item.category?.toLowerCase().includes('etiqueta') ||
                                          item.unitOfMeasure === 'UND';

                        return (
                          <tr key={item.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40">
                            <td className="py-1.5 px-3">
                              <div className="flex items-center gap-1.5">
                                {isEmpaque ? (
                                  <Package className="w-3 h-3 text-blue-500 shrink-0" />
                                ) : (
                                  <FlaskConical className="w-3 h-3 text-amber-500 shrink-0" />
                                )}
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {item.name}
                                </span>
                                {item.isCustom && (
                                  <span className="text-[9px] px-1 rounded bg-blue-500/20 text-blue-600 font-bold">
                                    Extra
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-1.5 px-2 text-center text-[10px] text-slate-400 font-mono">
                              {item.unitOfMeasure}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-slate-500">
                              {item.plannedQty.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
                            </td>
                            <td className="py-1.5 px-2.5 text-right bg-blue-500/5">
                              <input
                                type="number"
                                step="any"
                                value={item.requiredQty}
                                onChange={(e) => handleUpdateItemQty(idx, parseFloat(e.target.value) || 0)}
                                className="w-20 text-right bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-blue-900 dark:text-blue-200"
                              />
                            </td>
                            <td className="py-1.5 px-2.5 text-right bg-amber-500/5 relative">
                              <div className="relative inline-flex items-center">
                                <input
                                  type="number"
                                  step="any"
                                  value={item.unitCost}
                                  onChange={(e) => handleUpdateItemCost(idx, parseFloat(e.target.value) || 0)}
                                  onFocus={() => setFocusedCostItemId(item.id)}
                                  onBlur={() => setFocusedCostItemId(null)}
                                  className="w-24 text-right bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-amber-900 dark:text-amber-200 focus:ring-2 focus:ring-amber-500 pr-9"
                                />
                                <span className={`absolute right-1 text-[8.5px] font-bold font-mono px-1 py-0.5 rounded pointer-events-none ${
                                  item.unitOfMeasure === 'g' 
                                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/40' 
                                    : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300/40'
                                }`}>
                                  {item.unitOfMeasure === 'g' ? '$/kg' : '$/u'}
                                </span>
                              </div>

                              <UnitCostFloatingTag
                                unitOfMeasure={item.unitOfMeasure}
                                unitCost={item.unitCost}
                                quantity={item.requiredQty}
                                show={focusedCostItemId === item.id}
                                position="top"
                              />
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono">
                              <span className={`text-[11px] font-bold ${isDeficit ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {stockAvailable.toLocaleString('es-CO', { maximumFractionDigits: 1 })} {item.unitOfMeasure}
                              </span>
                              {isDeficit && (
                                <span className="block text-[9px] text-rose-500 font-bold">
                                  Déficit: {(item.requiredQty - stockAvailable).toFixed(1)}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {formatCOP(subtotal)}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLauncherItem(idx)}
                                className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                title="Quitar de este lote"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {customOrderItems.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-4 text-center text-xs text-slate-400">
                            No hay insumos cargados. Seleccione una receta o añada un insumo manual.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals & Launch Button Bar */}
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                    <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-sans">Costo Insumos</span>
                      <strong className="text-slate-800 dark:text-slate-100 font-bold">
                        {formatCOP(estimatedMaterialsCost)}
                      </strong>
                    </div>

                    {(estimatedLaborCost > 0 || estimatedOverheadCost > 0) && (
                      <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase block font-sans">M.O. + CIF</span>
                        <strong className="text-slate-800 dark:text-slate-100 font-bold">
                          {formatCOP(estimatedLaborCost + estimatedOverheadCost)}
                        </strong>
                      </div>
                    )}

                    <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase block font-sans font-bold">
                        Costo Total Lote
                      </span>
                      <strong className="text-blue-600 dark:text-blue-400 font-black text-sm">
                        {formatCOP(totalEstimatedCost)}
                      </strong>
                    </div>

                    <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase block font-sans font-bold">
                        Costo Unit. Estimado
                      </span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                        {formatCOP(unitEstimatedCost)}
                      </strong>
                    </div>
                  </div>

                  <button
                    onClick={launchOrder}
                    className="px-5 py-2.5 text-center bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white shadow-md transition-all rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer ml-auto"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Lanzar Orden de Fabricación</span>
                  </button>
                </div>
              </div>
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
                      <th className="py-2.5 px-3 text-center">Acciones / Cierre OP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5 text-slate-700">
                    {paginatedProdOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
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
                                po.status === 'cancelada' ? 'bg-slate-100 text-slate-500 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 line-through' :
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
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewingOrder(po)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                  title="Abrir ficha técnica, proporciones escaladas y cierre de OP"
                                >
                                  <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>Ficha</span>
                                </button>

                                {po.status !== 'cancelada' && po.status !== 'completada' && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelOrder(po)}
                                    className="px-2 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                                    title="Cancelar orden si no se va a producir"
                                  >
                                    <Ban className="w-3 h-3 text-amber-600" />
                                    <span className="hidden sm:inline">Cancelar</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrder(po)}
                                  className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-900 transition-all cursor-pointer"
                                  title="Eliminar permanentemente esta orden"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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

      {/* PRODUCTION ORDER DETAIL & CLOSE MODAL (Excel Formulation Replica) */}
      {viewingOrder && (
        <ProductionOrderDetailModal
          order={viewingOrder}
          bom={boms.find(b => b.id === viewingOrder.bomId)}
          products={products}
          warehouses={warehouses}
          onClose={() => setViewingOrder(null)}
          onUpdateOrder={(updated) => {
            if (updateProductionOrder) {
              updateProductionOrder(updated);
            }
            setViewingOrder(null);
          }}
          onUpdateStatus={updateOrderStatus}
          onDeleteOrder={(orderId) => {
            if (deleteProductionOrder) {
              deleteProductionOrder(orderId);
            } else {
              updateOrderStatus(orderId, 'cancelada');
            }
            setViewingOrder(null);
          }}
        />
      )}

    </div>
  );
}

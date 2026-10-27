import React, { useState } from 'react';
import { toast } from "../context/ToastContext";
import { Warehouse, Asset, InventoryItem, Product, InventoryMovement } from '../types';
import { THEMES_MAP } from './Sidebar';
import { ConfirmModal } from './ConfirmModal';
import Pagination from './Pagination';
import { exportWarehouseStockToExcel } from '../utils/excelExport';

interface WarehousesAndPlantViewProps {
  warehouses: Warehouse[];
  assets: Asset[];
  inventory: InventoryItem[];
  products: Product[];
  inventoryMovements: InventoryMovement[];
  addWarehouse: (w: Omit<Warehouse, 'id'>) => void;
  updateWarehouse: (w: Warehouse) => void;
  deleteWarehouse: (id: string) => void;
  addAsset: (a: Omit<Asset, 'id'>) => void;
  updateAsset: (a: Asset) => void;
  deleteAsset: (id: string) => void;
  transferStock: (productId: string, lotNumber: string | undefined, originWhId: string, destWhId: string, qty: number) => void;
  updateInventory?: (prodId: string, lotNum: string | undefined, diffQty: number, warehouseId?: string, expirationDate?: string) => void;
  addInventoryMovement?: (mov: any) => void;
  addVoucher?: (v: any) => void;
  theme: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
}

export default function WarehousesAndPlantView({
  warehouses,
  assets,
  inventory,
  products,
  inventoryMovements,
  addWarehouse,
  updateWarehouse,
  deleteWarehouse,
  addAsset,
  updateAsset,
  deleteAsset,
  transferStock,
  updateInventory,
  addInventoryMovement,
  addVoucher,
  theme
}: WarehousesAndPlantViewProps) {
  const [activeTab, setActiveTab] = useState<'bodegas' | 'plantas' | 'kardex'>('bodegas');
  const isDark = theme !== 'light_gray';
  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;

  // Search & Filter State
  const [warehouseSearchQuery, setWarehouseSearchQuery] = useState('');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [selectedWhFilter, setSelectedWhFilter] = useState<string>('all');
  const [selectedProductTypeFilter, setSelectedProductTypeFilter] = useState<'all' | 'materia_prima' | 'wip' | 'terminado'>('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'critical' | 'expired'>('all');

  // Kardex Log filters
  const [kardexSearchQuery, setKardexSearchQuery] = useState('');
  const [selectedKardexTypeFilter, setSelectedKardexTypeFilter] = useState<string>('all');
  const [selectedKardexWhFilter, setSelectedKardexWhFilter] = useState<string>('all');

  // Pagination states (15 per page)
  const [kardexCurrentPage, setKardexCurrentPage] = useState(1);
  const [inventoryCurrentPage, setInventoryCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Modal displays
  const [isWhFormOpen, setIsWhFormOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isTransferFormOpen, setIsTransferFormOpen] = useState(false);
  const [deleteWhConfirm, setDeleteWhConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteAssetConfirm, setDeleteAssetConfirm] = useState<{ id: string; name: string } | null>(null);

  // Inventory Adjustment states (Saldo Inicial / Sin Factura)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjWarehouseId, setAdjWarehouseId] = useState('');
  const [adjType, setAdjType] = useState<'saldo_inicial' | 'sobrante' | 'ajuste_general'>('saldo_inicial');
  const [adjDate, setAdjDate] = useState(new Date().toISOString().substring(0, 10));
  const [adjConcept, setAdjConcept] = useState('Inventario inicial y carga de existencias físicas sin factura previa');
  const [adjLines, setAdjLines] = useState<Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitCost: number;
    lotNumber?: string;
    expirationDate?: string;
  }>>([]);
  const [adjSelectedProdId, setAdjSelectedProdId] = useState('');
  const [adjQty, setAdjQty] = useState<number>(1);
  const [adjCost, setAdjCost] = useState<number>(0);
  const [adjLot, setAdjLot] = useState<string>('');
  const [adjExpiry, setAdjExpiry] = useState<string>('');

  // Warehouse Form states
  const [whName, setWhName] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whManager, setWhManager] = useState('');

  // Asset Form states
  const [assetName, setAssetName] = useState('');
  const [assetSerial, setAssetSerial] = useState('');
  const [assetType, setAssetType] = useState<'Maquinaria' | 'Muebles' | 'Vehículo' | 'Computo'>('Maquinaria');
  const [assetValue, setAssetValue] = useState<number>(0);
  const [assetLocation, setAssetLocation] = useState('');
  const [assetPurchaseDate, setAssetPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [assetDepreciationPeriod, setAssetDepreciationPeriod] = useState<number>(120);

  // Transfer Form states
  const [selectedTransProdId, setSelectedTransProdId] = useState('');
  const [selectedTransLot, setSelectedTransLot] = useState('');
  const [transOriginWhId, setTransOriginWhId] = useState('');
  const [transDestWhId, setTransDestWhId] = useState('');
  const [transQty, setTransQty] = useState<number>(0);

  // Formatting utilities
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getProductName = (id: string) => {
    return products.find(p => p.id === id)?.name || 'Producto Desconocido';
  };

  const getProductSku = (id: string) => {
    return products.find(p => p.id === id)?.sku || 'REF-N/A';
  };

  const getProductTypeLabel = (type: Product['type'] | string) => {
    switch (type) {
      case 'tecnologia': return '💻 Tecnología';
      case 'servicio': return '🛠️ Servicio TI';
      case 'materia_prima': return 'Materia Prima';
      case 'wip': return 'En Proceso (WIP)';
      case 'terminado': return 'Prod. Terminado';
      default: return 'No especificado';
    }
  };

  const getProductTypeClass = (type: Product['type'] | string) => {
    switch (type) {
      case 'tecnologia':
        return isDark ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-sky-50 text-sky-700 border border-sky-200';
      case 'servicio':
        return isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border border-cyan-200';
      case 'materia_prima':
        return isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'wip':
        return isDark ? 'bg-indigo-505/10 text-indigo-400 border border-indigo-505/20' : 'bg-indigo-50 text-indigo-700 border border-indigo-205';
      case 'terminado':
        return isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-300';
    }
  };

  // Warehouse-specific capacity tracker
  const getWarehouseCapacity = (id: string) => {
    if (id === 'wh-1') return 5000;
    if (id === 'wh-2') return 3000;
    return 4000;
  };

  // Calculations
  const calculateWarehouseStockValue = (whId: string) => {
    const whObj = warehouses.find(w => w.id === whId);
    return inventory
      .filter(item => item.warehouseId === whId || (whObj && item.warehouseId === whObj.name))
      .reduce((acc, item) => acc + (item.quantity * item.avgCost), 0);
  };

  const calculateWarehouseTotalUnits = (whId: string) => {
    const whObj = warehouses.find(w => w.id === whId);
    return inventory
      .filter(item => item.warehouseId === whId || (whObj && item.warehouseId === whObj.name))
      .reduce((acc, item) => acc + item.quantity, 0);
  };

  // General stock stats
  const totalStockValuation = inventory.reduce((acc, item) => acc + (item.quantity * item.avgCost), 0);
  const totalStockUnits = inventory.reduce((acc, item) => acc + item.quantity, 0);
  const activeControlLotsCount = inventory.filter(item => item.quantity > 0).length;

  // General Assets stats
  const totalAssetsValuation = assets.reduce((acc, a) => acc + a.value, 0);

  // Helper to calculate elapsed assets depreciation
  const getAssetFinancials = (asset: Asset) => {
    const buyDate = new Date(asset.purchaseDate);
    const now = new Date();
    
    // Difference in months
    const diffMonths = (now.getFullYear() - buyDate.getFullYear()) * 12 + (now.getMonth() - buyDate.getMonth());
    const elapsedMonths = Math.max(0, diffMonths);
    const depPerMonth = asset.value / asset.depreciationPeriodMonths;
    const computedDep = Math.min(asset.value, elapsedMonths * depPerMonth);
    const bookValue = Math.max(0, asset.value - computedDep);

    return {
      elapsedMonths,
      computedDep,
      bookValue
    };
  };

  const totalAccumulatedDepreciation = assets.reduce((acc, asset) => {
    const financials = getAssetFinancials(asset);
    return acc + financials.computedDep;
  }, 0);

  const getAssetStatus = (serial: string) => {
    const code = serial.charCodeAt(serial.length - 1) % 3;
    if (code === 0) return { label: 'En Operación', color: 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' };
    if (code === 1) return { label: 'Pasivo / Standby', color: 'text-blue-500 bg-blue-500/10 border border-blue-500/20' };
    return { label: 'Mapeado Calibración', color: 'text-amber-500 bg-amber-500/10 border border-amber-500/20' };
  };

  // Filter Warehouse Inventory items
  const filteredInventoryItems = inventory.filter(item => {
    const parentProd = products.find(p => p.id === item.productId);
    const prodName = parentProd?.name || '';
    const prodSku = parentProd?.sku || '';
    const lotStr = item.lotNumber || 'directo';
    
    const matchesSearch = prodName.toLowerCase().includes(warehouseSearchQuery.toLowerCase()) ||
                          prodSku.toLowerCase().includes(warehouseSearchQuery.toLowerCase()) ||
                          lotStr.toLowerCase().includes(warehouseSearchQuery.toLowerCase());
    
    const matchesWh = selectedWhFilter === 'all' || 
                      item.warehouseId === selectedWhFilter || 
                      warehouses.find(w => w.id === selectedWhFilter)?.name === item.warehouseId;
    const matchesType = selectedProductTypeFilter === 'all' || parentProd?.type === selectedProductTypeFilter;

    let matchesExpiry = true;
    if (expiryFilter !== 'all') {
      if (!item.expirationDate) {
        matchesExpiry = false;
      } else {
        const itemDate = new Date(item.expirationDate);
        const now = new Date();
        const timeDiff = itemDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (expiryFilter === 'expired') {
          matchesExpiry = daysDiff < 0;
        } else if (expiryFilter === 'critical') {
          matchesExpiry = daysDiff >= 0 && daysDiff <= 30;
        }
      }
    }

    return matchesSearch && matchesWh && matchesType && matchesExpiry && item.quantity > 0;
  });

  // Filter Plant Assets
  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
                          a.serial.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
                          a.location.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
                          a.type.toLowerCase().includes(assetSearchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filter Kardex Historical movements
  const filteredMovements = [...inventoryMovements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id))
    .filter(m => {
      const prodName = getProductName(m.productId);
      const prodSku = getProductSku(m.productId);
      const lotStr = m.lotNumber || '';
      const notesStr = m.notes || '';

      const matchesSearch = prodName.toLowerCase().includes(kardexSearchQuery.toLowerCase()) ||
                            prodSku.toLowerCase().includes(kardexSearchQuery.toLowerCase()) ||
                            lotStr.toLowerCase().includes(kardexSearchQuery.toLowerCase()) ||
                            notesStr.toLowerCase().includes(kardexSearchQuery.toLowerCase());

      const matchesType = selectedKardexTypeFilter === 'all' || m.type === selectedKardexTypeFilter;
      const matchesWh = selectedKardexWhFilter === 'all' || 
                        m.originWarehouseId === selectedKardexWhFilter || 
                        m.destWarehouseId === selectedKardexWhFilter;

      return matchesSearch && matchesType && matchesWh;
    });

  // Paginated Kardex Movements (15 per page)
  const kardexTotalPages = Math.max(1, Math.ceil(filteredMovements.length / ITEMS_PER_PAGE));
  const safeKardexPage = Math.min(kardexCurrentPage, kardexTotalPages);
  const paginatedMovements = filteredMovements.slice(
    (safeKardexPage - 1) * ITEMS_PER_PAGE,
    safeKardexPage * ITEMS_PER_PAGE
  );

  // Paginated Inventory Items (15 per page)
  const inventoryTotalPages = Math.max(1, Math.ceil(filteredInventoryItems.length / ITEMS_PER_PAGE));
  const safeInventoryPage = Math.min(inventoryCurrentPage, inventoryTotalPages);
  const paginatedInventoryItems = filteredInventoryItems.slice(
    (safeInventoryPage - 1) * ITEMS_PER_PAGE,
    safeInventoryPage * ITEMS_PER_PAGE
  );

  // --- Handlers ---
  const handleOpenCreateWh = () => {
    setEditingWh(null);
    setWhName('');
    setWhAddress('');
    setWhManager('');
    setIsWhFormOpen(true);
  };

  const handleOpenEditWh = (w: Warehouse, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWh(w);
    setWhName(w.name);
    setWhAddress(w.address);
    setWhManager(w.manager || '');
    setIsWhFormOpen(true);
  };

  const handleWhSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName.trim() || !whAddress.trim()) {
      toast.warning("Por favor complete los campos de nombre y dirección.", "Campos Requeridos");
      return;
    }

    const payload = {
      name: whName.trim(),
      address: whAddress.trim(),
      manager: whManager.trim() || undefined
    };

    if (editingWh) {
      updateWarehouse({
        ...editingWh,
        ...payload,
        id: editingWh.id,
        companyId: editingWh.companyId
      });
      toast.success(`Bodega "${whName}" actualizada con éxito.`, "Bodega Actualizada");
    } else {
      addWarehouse(payload);
      toast.success(`Bodega "${whName}" creada con éxito.`, "Bodega Creada");
    }
    setIsWhFormOpen(false);
    setEditingWh(null);
  };

  const handleWhDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const totalUnits = calculateWarehouseTotalUnits(id);
    if (totalUnits > 0) {
      toast.error(`No se puede eliminar la bodega "${name}" porque contiene ${totalUnits} unidades en inventario.`, "Bodega con Stock");
      return;
    }

    setDeleteWhConfirm({ id, name });
  };

  // --- Asset Handlers ---
  const handleOpenCreateAsset = () => {
    setEditingAsset(null);
    setAssetName('');
    setAssetSerial('');
    setAssetType('Maquinaria');
    setAssetValue(0);
    setAssetLocation('');
    setAssetPurchaseDate(new Date().toISOString().split('T')[0]);
    setAssetDepreciationPeriod(120);
    setIsAssetFormOpen(true);
  };

  const handleOpenEditAsset = (a: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAsset(a);
    setAssetName(a.name);
    setAssetSerial(a.serial);
    setAssetType(a.type);
    setAssetValue(a.value);
    setAssetLocation(a.location);
    setAssetPurchaseDate(a.purchaseDate);
    setAssetDepreciationPeriod(a.depreciationPeriodMonths);
    setIsAssetFormOpen(true);
  };

  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim() || !assetSerial.trim() || !assetLocation.trim()) {
      toast.warning("Por favor complete todos los datos obligatorios del activo.", "Datos Requeridos");
      return;
    }

    const payload = {
      name: assetName.trim(),
      serial: assetSerial.trim().toUpperCase(),
      type: assetType,
      value: Number(assetValue) || 0,
      location: assetLocation.trim(),
      purchaseDate: assetPurchaseDate,
      depreciationPeriodMonths: Number(assetDepreciationPeriod) || 120
    };

    if (editingAsset) {
      updateAsset({
        ...editingAsset,
        ...payload,
        id: editingAsset.id
      });
      toast.success(`Activo "${assetName}" actualizado con éxito.`, "Activo Actualizado");
    } else {
      addAsset(payload);
      toast.success(`Activo "${assetName}" registrado con éxito.`, "Activo Creado");
    }
    setIsAssetFormOpen(false);
    setEditingAsset(null);
  };

  const handleAssetDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteAssetConfirm({ id, name });
  };

  // --- Transfer Form Handlers ---
  const handleOpenTransfer = () => {
    setSelectedTransProdId('');
    setSelectedTransLot('');
    setTransOriginWhId('');
    setTransDestWhId('');
    setTransQty(0);
    setIsTransferFormOpen(true);
  };

  const handleOriginWhChange = (originId: string) => {
    setTransOriginWhId(originId);
    const itemsInWh = inventory.filter(item => item.warehouseId === originId && item.quantity > 0);
    if (itemsInWh.length > 0) {
      setSelectedTransProdId(itemsInWh[0].productId);
      setSelectedTransLot(itemsInWh[0].lotNumber || '');
      setTransQty(Math.min(1, itemsInWh[0].quantity));
    } else {
      setSelectedTransProdId('');
      setSelectedTransLot('');
      setTransQty(0);
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransProdId || !transOriginWhId || !transDestWhId || transQty <= 0) {
      toast.warning("Por favor complete todos los datos del traslado.", "Datos Requeridos");
      return;
    }

    if (transOriginWhId === transDestWhId) {
      toast.warning("La bodega de origen debe ser diferente a la de destino.", "Bodegas Iguales");
      return;
    }

    const lotMatch = selectedTransLot ? selectedTransLot : undefined;
    const originItem = inventory.find(
      item => item.productId === selectedTransProdId && 
              item.lotNumber === lotMatch && 
              item.warehouseId === transOriginWhId
    );

    if (!originItem || originItem.quantity < transQty) {
      const available = originItem ? originItem.quantity : 0;
      toast.error(`Inventario insuficiente. Disponible en bodega de origen: ${available} unidades.`, "Stock Insuficiente");
      return;
    }

    transferStock(
      selectedTransProdId,
      lotMatch,
      transOriginWhId,
      transDestWhId,
      transQty
    );

    setIsTransferFormOpen(false);
    toast.success(`Traslado interno de ${transQty} unidades efectuado con éxito.`, "Traslado Exitoso");
  };

  // List of available products in the selected origin warehouse for transfer
  const productsAvailableForTransfer = inventory
    .filter(item => item.warehouseId === transOriginWhId && item.quantity > 0)
    .map(item => {
      const prod = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        lotNumber: item.lotNumber || '',
        name: prod?.name || 'N/A',
        sku: prod?.sku || 'N/A',
        availableQty: item.quantity
      };
    });

  const selectedTransItemAvailable = productsAvailableForTransfer.find(
    p => p.productId === selectedTransProdId && p.lotNumber === selectedTransLot
  );

  // --- Inventory Adjustment Handlers (Saldos Iniciales / Sin Factura) ---
  const handleOpenAdjustmentModal = () => {
    setAdjWarehouseId(warehouses[0]?.id || '');
    setAdjLines([]);
    const firstProd = products[0];
    setAdjSelectedProdId(firstProd?.id || '');
    setAdjCost(firstProd?.cost || 0);
    setAdjQty(1);
    setAdjLot('');
    setAdjExpiry('');
    setAdjConcept('Inventario inicial y carga de existencias físicas sin factura previa');
    setIsAdjustmentModalOpen(true);
  };

  const handleAddAdjLine = () => {
    if (!adjSelectedProdId) {
      toast.warning('Por favor seleccione un artículo o insumo.', 'Artículo Requerido');
      return;
    }
    if (adjQty <= 0) {
      toast.warning('Por favor ingrese una cantidad mayor a cero.', 'Cantidad Inválida');
      return;
    }
    const prod = products.find(p => p.id === adjSelectedProdId);
    if (!prod) return;

    setAdjLines(prev => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        quantity: adjQty,
        unitCost: adjCost >= 0 ? adjCost : (prod.cost || 0),
        lotNumber: adjLot.trim() || undefined,
        expirationDate: adjExpiry || undefined
      }
    ]);

    setAdjQty(1);
    setAdjLot('');
    setAdjExpiry('');
    toast.info(`Artículo "${prod.name}" añadido a la lista del ajuste.`, 'Artículo Añadido');
  };

  const handleRemoveAdjLine = (idx: number) => {
    setAdjLines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjWarehouseId) {
      toast.warning('Por favor seleccione la bodega destino para el ingreso.', 'Bodega Requerida');
      return;
    }
    if (adjLines.length === 0) {
      toast.warning('Debe agregar al menos un artículo a la lista del ajuste.', 'Sin Artículos');
      return;
    }

    const targetWh = warehouses.find(w => w.id === adjWarehouseId);
    const whName = targetWh ? targetWh.name : adjWarehouseId;
    const totalQty = adjLines.reduce((acc, l) => acc + l.quantity, 0);
    const totalValuation = adjLines.reduce((acc, l) => acc + (l.quantity * l.unitCost), 0);
    const voucherNumber = `CA-${Date.now().toString().slice(-4)}`;

    // 1. Update real inventory storage slots
    if (updateInventory) {
      adjLines.forEach(line => {
        updateInventory(line.productId, line.lotNumber, line.quantity, adjWarehouseId, line.expirationDate);
      });
    }

    // 2. Register Kardex logs
    if (addInventoryMovement) {
      adjLines.forEach(line => {
        addInventoryMovement({
          date: adjDate,
          productId: line.productId,
          lotNumber: line.lotNumber,
          type: 'entrada_compra',
          destWarehouseId: adjWarehouseId,
          quantity: line.quantity,
          cost: line.unitCost,
          notes: `Ajuste (${adjType === 'saldo_inicial' ? 'Saldo Inicial' : 'Sobrante Físico'}) a ${whName}: ${adjConcept}`
        });
      });
    }

    // 3. Post Double-Entry Accounting Voucher (CA - Comprobante de Ajuste)
    if (addVoucher) {
      const creditAccount = adjType === 'saldo_inicial' ? '311505' : '429505';
      const creditName = adjType === 'saldo_inicial' ? 'Aportes Sociales / Saldo Inicial' : 'Aprovechamientos / Ajuste Inventario';

      addVoucher({
        number: voucherNumber,
        type: 'ajuste',
        date: adjDate,
        concept: `${adjConcept} - Bodega: ${whName}`,
        thirdPartyId: 'ter-1',
        total: Math.round(totalValuation),
        lines: [
          {
            accountCode: '143501',
            description: `Ingreso físico mercancías ajuste ${voucherNumber} a ${whName}`,
            debit: Math.round(totalValuation),
            credit: 0
          },
          {
            accountCode: creditAccount,
            description: `Contrapartida ajuste ${creditName} (${voucherNumber})`,
            debit: 0,
            credit: Math.round(totalValuation)
          }
        ],
        items: adjLines.map(l => ({
          productId: l.productId,
          qty: l.quantity,
          unitCost: l.unitCost,
          lotNumber: l.lotNumber || 'S/L',
          expirationDate: l.expirationDate
        }))
      });
    }

    toast.success(`¡Ajuste procesado con éxito! Se cargaron ${totalQty} unidades (${formatCOP(totalValuation)}) a "${whName}".`, 'Inventario Cargado');
    setIsAdjustmentModalOpen(false);
    setAdjLines([]);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Upper Presentation Banner */}
      <div className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-100'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-wider uppercase opacity-70">Ubicaciones y Kardex Planta</span>
          </div>
          <h2 className="font-display font-extrabold text-xl tracking-tight">Estructuras de Almacenamiento & Activos Fijos</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Modulo unificado para controlar bodegas físicas del MRP, traslados de insumos controlados por lote y amortización contable de depreciación en maquinaria industrial de panificación.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenAdjustmentModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            title="Cargar saldo inicial o ajuste de inventario físico sin factura"
          >
            <i className="ri-add-box-line text-sm"></i>
            <span>+ Ajuste / Saldo Inicial</span>
          </button>

          <button
            type="button"
            onClick={() => exportWarehouseStockToExcel(inventory, products, warehouses)}
            className="bg-teal-600 hover:bg-teal-550 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            title="Descargar stock valorizado de bodegas y almacenes en Excel (.xlsx)"
            id="export-warehouses-excel-btn"
          >
            <i className="ri-file-excel-2-line text-emerald-200"></i> Exportar a Excel
          </button>
          
          <button
            onClick={handleOpenTransfer}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <i className="ri-arrow-left-right-line"></i> Traslado de Stock
          </button>
          
          <button
            onClick={handleOpenCreateWh}
            className={`border font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-slate-100' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
            }`}
          >
            <i className="ri-store-2-line"></i> + Crear Bodega
          </button>
        </div>
      </div>

      {/* Primary Module Tab Selectors */}
      <div className="flex border-b border-black/5 dark:border-white/5 pb-0.5 scrollbar-thin overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('bodegas')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'bodegas'
              ? 'border-blue-500 text-blue-500 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-community-line mr-1.5 text-sm align-middle"></i>
          Ubicaciones & Inventario Físico
        </button>
        
        <button
          onClick={() => setActiveTab('kardex')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'kardex'
              ? 'border-blue-500 text-blue-500 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-history-line mr-1.5 text-sm align-middle"></i>
          Historial del Kardex (Movimientos)
        </button>

        <button
          onClick={() => setActiveTab('plantas')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'plantas'
              ? 'border-blue-500 text-blue-500 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-cpu-line mr-1.5 text-sm align-middle"></i>
          Activos de Planta & Depreciación
        </button>
      </div>

      {/* TAB 1: BODEGAS & INVENTARIOS */}
      {activeTab === 'bodegas' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Warehouse Tab Overview Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                <i className="ri-copper-coin-line text-lg"></i>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inversión en Bodega</p>
                <p className="text-lg font-bold font-mono tracking-tight text-emerald-500">{formatCOP(totalStockValuation)}</p>
              </div>
            </div>
            
            <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
              <div className="p-3 rounded-xl bg-indigo-505/10 text-indigo-400 shrink-0">
                <i className="ri-archive-line text-lg"></i>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unidades Físicas</p>
                <p className="text-lg font-bold font-mono">{totalStockUnits} Unds</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <i className="ri-list-check-3 text-lg"></i>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lotes de Control Activos</p>
                <p className="text-lg font-bold font-mono">{activeControlLotsCount} lotes</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
              <div className="p-3 rounded-xl bg-teal-500/10 text-teal-500 shrink-0">
                <i className="ri-community-line text-lg"></i>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bodegas Operativas</p>
                <p className="text-lg font-bold font-mono">{warehouses.length} Centros</p>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-400">Depósitos e Instalaciones Físicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {warehouses.map((w) => {
                const totalVal = calculateWarehouseStockValue(w.id);
                const totalUnits = calculateWarehouseTotalUnits(w.id);
                const whCapacity = getWarehouseCapacity(w.id);
                const occupancyPct = Math.min(100, Math.round((totalUnits / whCapacity) * 100));

                return (
                  <div key={w.id} className={`p-5 border rounded-2xl shadow-sm transition-all relative overflow-hidden group hover:shadow-md ${activeTheme.cardStyles}`}>
                    
                    <div className="absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 bg-blue-500/5 group-hover:bg-blue-500/10 rounded-full transition-all"></div>
                    
                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isDark ? 'bg-zinc-801 text-zinc-300' : 'bg-slate-100 text-slate-700'}`}>
                        <i className="ri-store-3-line"></i>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => handleOpenEditWh(w, e)}
                          className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-slate-400`}
                          title="Editar bodega"
                        >
                          <i className="ri-pencil-fill text-xs"></i>
                        </button>
                        
                        {w.id !== 'wh-1' && w.id !== 'wh-2' && (
                          <button
                            onClick={(e) => handleWhDelete(w.id, w.name, e)}
                            className={`p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer text-slate-400`}
                            title="Eliminar bodega"
                          >
                            <i className="ri-delete-bin-line text-xs"></i>
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-display font-bold text-base tracking-tight mb-0.5">{w.name}</h4>
                    <p className="text-xs text-slate-400 leading-normal mb-3 min-h-[32px]">{w.address}</p>

                    {w.manager && (
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-3 block">
                        Encargado: <span className={`${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{w.manager}</span>
                      </p>
                    )}

                    {/* Warehouse internal capacity simulation progress bar */}
                    <div className="space-y-1 mb-4 pt-1 border-t border-dashed border-black/5 dark:border-white/5">
                      <div className="flex justify-between items-print text-[9px] font-bold text-slate-400">
                        <span>OCUPACIÓN FÍSICA ESTIMADA</span>
                        <span>{occupancyPct}% ({totalUnits} / {whCapacity} Unds)</span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            occupancyPct > 90 ? 'bg-rose-500' : occupancyPct > 75 ? 'bg-amber-400' : 'bg-blue-500'
                          }`}
                          style={{ width: `${occupancyPct}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className={`grid grid-cols-2 gap-2 pt-3 border-t border-black/5 dark:border-white/5 text-xs`}>
                      <div>
                        <span className="text-slate-400 text-[9px] block uppercase font-semibold">Salidas Activas</span>
                        <strong className="font-mono text-sm font-bold">{totalUnits} Unds</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[9px] block uppercase font-semibold">Valuación Libro</span>
                        <strong className="font-mono text-xs font-bold text-emerald-500">{formatCOP(totalVal)}</strong>
                      </div>
                    </div>

                  </div>
                );
              })}

              <div 
                onClick={handleOpenCreateWh}
                className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5 ${
                  isDark ? 'border-zinc-800 text-zinc-450 hover:border-zinc-700' : 'border-slate-200 text-slate-450 hover:border-slate-350'
                }`}
              >
                <div className="w-10 h-10 rounded-full border border-dashed flex items-center justify-center text-lg mb-2">
                  <i className="ri-add-line"></i>
                </div>
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-300">Crear Nueva Bodega</h5>
                <p className="text-[10px] max-w-[180px] text-slate-400 mt-0.5">Defina muelle de recibo, cuartos fríos u otra locación de mermas.</p>
              </div>
            </div>
          </div>

          {/* Consolidated Stocks LEDGER Table */}
          <div className={`p-6 shadow-sm border ${activeTheme.cardStyles}`}>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 mb-4">
              <div>
                <h3 className="font-display font-semibold text-base">Saldos de Stock Consolidado</h3>
                <p className="text-xs text-slate-400">Verifique dónde están alojadas sus materias primas e insumos productivos en la planta</p>
              </div>

              <button
                id="transfer-inventory-trigger"
                onClick={handleOpenTransfer}
                className="bg-indigo-600 hover:bg-indigo-554 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer max-w-max self-end sm:self-auto"
              >
                <i className="ri-arrow-left-right-line"></i> Traslado entre Bodegas
              </button>
            </div>

            {/* ALARMAS DE VENCIMIENTO PEPS */}
            {(() => {
              const now = new Date();
              const expiredList = inventory.filter(item => {
                if (!item.expirationDate || item.quantity <= 0) return false;
                return new Date(item.expirationDate) < now;
              });
              
              const criticalList = inventory.filter(item => {
                if (!item.expirationDate || item.quantity <= 0) return false;
                const itemDate = new Date(item.expirationDate);
                const days = Math.ceil((itemDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
                return days >= 0 && days <= 30;
              });
              
              if (expiredList.length === 0 && criticalList.length === 0) return null;
              
              return (
                <div className="w-full mb-4 p-4 rounded-xl border border-rose-500/10 bg-rose-500/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {expiredList.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
                        <i className="ri-error-warning-line text-lg animate-bounce"></i>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-rose-500">Lotes Vencidos Detectados ({expiredList.length})</h4>
                        <p className="text-[11px] text-slate-400">Existen materias primas o insumos que han superado su vida útil y no deben utilizarse en órdenes de producción.</p>
                        <button
                          onClick={() => setExpiryFilter(expiryFilter === 'expired' ? 'all' : 'expired')}
                          className={`mt-2 font-mono text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border border-rose-500/30 ${expiryFilter === 'expired' ? 'bg-rose-500 text-white' : 'text-rose-400 hover:bg-rose-500/20'}`}
                        >
                          {expiryFilter === 'expired' ? '✓ Filtrando Vencidos' : '🔎 Ver Lotes Vencidos'}
                        </button>
                      </div>
                    </div>
                  )}
                  {criticalList.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
                        <i className="ri-alarm-warning-line text-lg animate-pulse"></i>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-amber-500">Alerta de Lotes Próximos a Vencer ({criticalList.length})</h4>
                        <p className="text-[11px] text-slate-400">Hay insumos próximos a caducar (30 días o menos). Priorice su consumo por método PEPS (FIFO).</p>
                        <button
                          onClick={() => setExpiryFilter(expiryFilter === 'critical' ? 'all' : 'critical')}
                          className={`mt-2 font-mono text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border border-amber-500/30 ${expiryFilter === 'critical' ? 'bg-amber-500 text-white' : 'text-amber-400 hover:bg-amber-500/20'}`}
                        >
                          {expiryFilter === 'critical' ? '✓ Filtrando Críticos' : '🔎 Ver Lotes Próximos a Vencer'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Sub Filter Segment Pill Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-3 mb-4">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mr-2">Filtrar por Tipo:</span>
              {[
                { id: 'all', label: 'Todos los Stocks' },
                { id: 'tecnologia', label: '💻 Hardware / Tech' },
                { id: 'materia_prima', label: 'Materias Primas' },
                { id: 'wip', label: 'En Proceso (WIP)' },
                { id: 'terminado', label: 'Producto Terminado' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedProductTypeFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedProductTypeFilter === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark ? 'bg-zinc-800 text-slate-300 hover:bg-zinc-750' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
              <div className="relative w-full sm:flex-1">
                <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="Buscar saldos por SKU, descripción, o lote..."
                  value={warehouseSearchQuery}
                  onChange={(e) => setWarehouseSearchQuery(e.target.value)}
                  className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border focus:ring-1 focus:ring-blue-500 outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto shrink-0 font-medium">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider shrink-0">Bodega:</span>
                <select
                  value={selectedWhFilter}
                  onChange={(e) => setSelectedWhFilter(e.target.value)}
                  className={`text-xs font-bold rounded-xl px-3 py-2 border outline-none w-full sm:w-auto ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-700'
                  }`}
                >
                  <option value="all font-semibold">Todas las bodegas</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data table */}
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'border-zinc-850 text-slate-400' : 'border-slate-100 text-slate-400'
                  }`}>
                    <th className="py-3 px-4">Insumo / Producto</th>
                    <th className="py-3 px-4">Clasificación</th>
                    <th className="py-3 px-4">Ubicadora Bodega</th>
                    <th className="py-3 px-4">Lote Control</th>
                    <th className="py-3 px-4 text-center">F. Vencimiento (PEPS)</th>
                    <th className="py-3 px-4 text-right">Cant. Actual</th>
                    <th className="py-3 px-4 text-right">Costo Promedio</th>
                    <th className="py-3 px-4 text-emerald-500 text-right">Valor Contable</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  isDark ? 'divide-zinc-850 text-slate-300' : 'divide-slate-100 text-slate-700'
                }`}>
                  {filteredInventoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                        <i className="ri-inbox-line text-2xl block mb-2 opacity-50"></i>
                        No hay saldos de inventario que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    paginatedInventoryItems.map((item) => {
                      const value = item.quantity * item.avgCost;
                      const whNameStr = warehouses.find(w => w.id === item.warehouseId || w.name === item.warehouseId)?.name || item.warehouseId || 'Desconocido';
                      const prod = products.find(p => p.id === item.productId);
                      const prodType = prod?.type || 'materia_prima';

                      let exponentBadgeClass = '';
                      let exponentTextLabel = '';
                      if (item.expirationDate) {
                        const expDate = new Date(item.expirationDate);
                        const now = new Date();
                        const timeDiff = expDate.getTime() - now.getTime();
                        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                        
                        if (daysDiff < 0) {
                          exponentBadgeClass = 'bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold';
                          exponentTextLabel = `${item.expirationDate} (Vencido 🚨)`;
                        } else if (daysDiff <= 30) {
                          exponentBadgeClass = 'bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold animate-pulse';
                          exponentTextLabel = `${item.expirationDate} (${daysDiff} d. ⚠️)`;
                        } else {
                          exponentBadgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                          exponentTextLabel = `${item.expirationDate} (${daysDiff} d.)`;
                        }
                      } else {
                        exponentBadgeClass = 'text-slate-400 font-medium';
                        exponentTextLabel = 'Sin Vencimiento';
                      }

                      return (
                        <tr key={item.id} className={`transition-colors font-sans hover:bg-black/5 dark:hover:bg-white/5`}>
                          <td className="py-3 px-4">
                            <p className="font-bold">{getProductName(item.productId)}</p>
                            <span className="text-[10px] opacity-60 font-mono mt-0.5">{getProductSku(item.productId)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded ${getProductTypeClass(prodType)}`}>
                              {getProductTypeLabel(prodType)}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold">{whNameStr}</td>
                          <td className="py-3 px-4 font-mono">
                            {item.lotNumber ? (
                              <span className="bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded border border-blue-500/20 text-[10px]">
                                {item.lotNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium text-[10px]">Sin lote (Directo)</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded ${exponentBadgeClass}`}>
                              {exponentTextLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-blue-500">{item.quantity} Unds</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">{formatCOP(item.avgCost)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-500">{formatCOP(value)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredInventoryItems.length > 0 && (
              <Pagination
                currentPage={safeInventoryPage}
                totalItems={filteredInventoryItems.length}
                pageSize={ITEMS_PER_PAGE}
                onPageChange={(page) => setInventoryCurrentPage(page)}
                isDark={isDark}
                itemLabel="artículos de inventario"
              />
            )}

          </div>

        </div>
      )}

      {/* TAB 2: HISTORIAL DE KARDEX (MOVIMIENTOS) */}
      {activeTab === 'kardex' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className={`p-6 shadow-sm border ${activeTheme.cardStyles}`}>
            
            <div className="border-b pb-4 mb-4">
              <h3 className="font-display font-semibold text-base">Libro de Movimientos de Kardex (Trazabilidad)</h3>
              <p className="text-xs text-slate-400">Audite las entradas por compra, mermas de producción, consumos de materias primas de la receta (BOM) y traslados internos de planta</p>
            </div>

            {/* Kardex Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="relative w-full">
                <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="Buscar movimientos por producto, sku, lote o notas..."
                  value={kardexSearchQuery}
                  onChange={(e) => {
                    setKardexSearchQuery(e.target.value);
                    setKardexCurrentPage(1);
                  }}
                  className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border focus:ring-1 focus:ring-blue-500 outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <select
                  value={selectedKardexTypeFilter}
                  onChange={(e) => {
                    setSelectedKardexTypeFilter(e.target.value);
                    setKardexCurrentPage(1);
                  }}
                  className={`w-full text-xs font-semibold rounded-xl px-3 py-2.5 border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-700'
                  }`}
                >
                  <option value="all">Todos los Tipos de Operación</option>
                  <option value="entrada_compra">Entradas por Compra o Proveedor</option>
                  <option value="salida_venta">Salidas por Facturación o Venta</option>
                  <option value="produccion_entrada">Ingresos por Orden de Producción</option>
                  <option value="consumo_materia_prima">Consumos de Materias Primas</option>
                  <option value="traslado_traslado">Traslados Internos de Bodega</option>
                </select>
              </div>

              <div>
                <select
                  value={selectedKardexWhFilter}
                  onChange={(e) => {
                    setSelectedKardexWhFilter(e.target.value);
                    setKardexCurrentPage(1);
                  }}
                  className={`w-full text-xs font-semibold rounded-xl px-3 py-2.5 border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-700'
                  }`}
                >
                  <option value="all">Todas las Bodegas (Origen/Destino)</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Kardex Table */}
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'border-zinc-850 text-slate-400' : 'border-slate-100 text-slate-400'
                  }`}>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Producto / Insumo</th>
                    <th className="py-3 px-4">Origen / Destino</th>
                    <th className="py-3 px-4">Concepto Operación</th>
                    <th className="py-3 px-4 text-right">Cant. Operada</th>
                    <th className="py-3 px-4 text-right">Costo U.</th>
                    <th className="py-3 px-4 text-right text-indigo-400">Valor Total</th>
                    <th className="py-3 px-4">Usuario</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  isDark ? 'divide-zinc-850 text-slate-300' : 'divide-slate-100 text-slate-700'
                }`}>
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        <i className="ri-history-line text-2xl block mb-2 opacity-50"></i>
                        No se han registrado movimientos de inventario que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    paginatedMovements.map((m) => {
                      const totalMovVal = m.quantity * m.cost;
                      
                      // Identify warehouses
                      const originWh = warehouses.find(w => w.id === m.originWarehouseId)?.name;
                      const destWh = warehouses.find(w => w.id === m.destWarehouseId)?.name;

                      // Operation tags
                      let opLabel = '';
                      let opClass = '';
                      let opIcon = '';
                      let whLabel = '';

                      switch (m.type) {
                        case 'entrada_compra':
                          opLabel = 'Compra (Entrada)';
                          opClass = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
                          opIcon = 'ri-arrow-left-down-line';
                          whLabel = destWh ? `Hacia: ${destWh}` : 'Proveedor';
                          break;
                        case 'salida_venta':
                          opLabel = 'Venta (Salida)';
                          opClass = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
                          opIcon = 'ri-arrow-right-up-line';
                          whLabel = originWh ? `Desde: ${originWh}` : 'Ventas';
                          break;
                        case 'produccion_entrada':
                          opLabel = 'Ingreso Prod.';
                          opClass = 'text-green-500 bg-green-500/10 border-green-505/20';
                          opIcon = 'ri-box-3-line';
                          whLabel = destWh ? `Hacia: ${destWh}` : 'Planta';
                          break;
                        case 'consumo_materia_prima':
                          opLabel = 'Consumo MP (Amasadora)';
                          opClass = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                          opIcon = 'ri-tools-line';
                          whLabel = originWh ? `Desde: ${originWh}` : 'Receta / BOM';
                          break;
                        case 'traslado_traslado':
                          opLabel = 'Traslado Interno';
                          opClass = 'text-indigo-505 bg-indigo-505/10 border-indigo-505/20';
                          opIcon = 'ri-arrow-left-right-line';
                          whLabel = `${originWh || 'De'} ➜ ${destWh || 'A'}`;
                          break;
                        default:
                          opLabel = m.type;
                          opClass = 'text-slate-500 bg-slate-500/10';
                          opIcon = 'ri-checkbox-blank-circle-line';
                          whLabel = 'N/A';
                      }

                      return (
                        <tr key={m.id} className="transition-colors hover:bg-black/5 dark:hover:bg-white/5 font-sans">
                          <td className="py-3 px-4 font-mono font-medium">{m.date}</td>
                          <td className="py-3 px-4">
                            <p className="font-bold">{getProductName(m.productId)}</p>
                            <span className="text-[10px] opacity-65 font-mono">
                              {getProductSku(m.productId)} {m.lotNumber ? `| Lote: ${m.lotNumber}` : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-400">
                            <span className="text-xs text-slate-300 font-semibold">{whLabel}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${opClass}`}>
                              <i className={`${opIcon} text-xs`}></i> {opLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                            {m.quantity} Unds
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-450">{formatCOP(m.cost)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-indigo-400">{formatCOP(totalMovVal)}</td>
                          <td className="py-3 px-4 text-slate-400 font-medium">{m.userId}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredMovements.length > 0 && (
              <Pagination
                currentPage={safeKardexPage}
                totalItems={filteredMovements.length}
                pageSize={ITEMS_PER_PAGE}
                onPageChange={(page) => setKardexCurrentPage(page)}
                isDark={isDark}
                itemLabel="movimientos de kardex"
              />
            )}

          </div>

        </div>
      )}

      {/* TAB 3: PLANT CAPACITY / ASSETS */}
      {activeTab === 'plantas' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Top Asset Stats card block */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                <i className="ri-cpu-fill text-lg"></i>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Equipos Registrados</p>
                <p className="text-xl font-bold font-display">{assets.length}</p>
              </div>
            </div>
            
            <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <i className="ri-safe-fill text-lg"></i>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valuación Original</p>
                <p className="text-xl font-bold font-display text-emerald-500">{formatCOP(totalAssetsValuation)}</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-554 shrink-0">
                <i className="ri-donut-chart-fill text-lg"></i>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Depreciación Fiscal</p>
                <p className="text-xl font-bold font-display text-rose-500">-{formatCOP(totalAccumulatedDepreciation)}</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
              <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 shrink-0">
                <i className="ri-heart-pulse-fill text-lg animate-pulse"></i>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor Neto en Libros</p>
                <p className="text-xl font-bold font-display text-blue-400">{formatCOP(totalAssetsValuation - totalAccumulatedDepreciation)}</p>
              </div>
            </div>
          </div>

          {/* Plant & Assets list grid */}
          <div className={`p-6 shadow-sm border ${activeTheme.cardStyles}`}>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 mb-4">
              <div>
                <h4 className="font-display font-semibold text-base">Maquinaria y Líneas de Producción activa</h4>
                <p className="text-xs text-slate-400 font-sans">Gestione los activos fijos, controle el valor neto en libros y localice maquinarias en la planta física</p>
              </div>

              <button
                id="add-asset-btn"
                onClick={handleOpenCreateAsset}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer self-end sm:self-auto"
              >
                <i className="ri-add-line"></i> Registrar Equipo o Activo
              </button>
            </div>

            {/* Asset search */}
            <div className="mb-4">
              <div className="relative w-full">
                <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="Buscar activo por nombre, serial, ubicación de planta..."
                  value={assetSearchQuery}
                  onChange={(e) => setAssetSearchQuery(e.target.value)}
                  className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border focus:ring-1 focus:ring-blue-500 outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredAssets.length === 0 ? (
                <div className="col-span-1 md:col-span-2 py-12 text-center text-slate-400 font-medium">
                  <i className="ri-tools-line text-3xl opacity-50 block mb-2"></i>
                  No se encontraron activos o máquinas registradas en la planta que coincidan.
                </div>
              ) : (
                filteredAssets.map(asset => {
                  const financials = getAssetFinancials(asset);
                  const statusInfo = getAssetStatus(asset.serial);
                  
                  // Calculate depreciation lifetime progress bar
                  const remainingMonths = Math.max(0, asset.depreciationPeriodMonths - financials.elapsedMonths);
                  const lifePct = Math.min(100, Math.round((remainingMonths / asset.depreciationPeriodMonths) * 100));

                  return (
                    <div 
                      key={asset.id} 
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between hover:shadow-md ${
                        isDark ? 'bg-zinc-950/75 border-zinc-850' : 'bg-slate-50/55 border-slate-150'
                      }`}
                    >
                      <div>
                        {/* Upper Asset Info */}
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <div className="flex gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                              isDark ? 'bg-zinc-801 text-zinc-300 border border-zinc-800' : 'bg-white border border-slate-200 text-slate-505'
                            }`}>
                              <i className={
                                asset.type === 'Vehículo' ? "ri-truck-fill" : 
                                asset.type === 'Muebles' ? "ri-armchair-fill" : 
                                asset.type === 'Computo' ? "ri-computer-fill" : 
                                "ri-settings-5-fill text-blue-400"
                              }></i>
                            </div>
                            <div>
                              <h4 className="font-bold text-sm leading-tight tracking-tight">{asset.name}</h4>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">SERIAL: {asset.serial}</p>
                            </div>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={(e) => handleOpenEditAsset(asset, e)}
                              className={`p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-slate-400`}
                              title="Editar activo"
                            >
                              <i className="ri-pencil-fill text-xs"></i>
                            </button>
                            <button
                              onClick={(e) => handleAssetDelete(asset.id, asset.name, e)}
                              className={`p-1 hover:bg-rose-500/10 hover:text-rose-500 rounded text-slate-400`}
                              title="Eliminar activo"
                            >
                              <i className="ri-delete-bin-line text-xs"></i>
                            </button>
                          </div>
                        </div>

                        {/* Specs */}
                        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-black/5 dark:border-white/5 text-[11px] font-medium leading-normal mb-3">
                          <div>
                            <span className="text-slate-400 text-[10px] block font-bold uppercase">Ubicación Física</span>
                            <strong className="text-xs font-semibold">{asset.location}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block font-bold uppercase">Status Operación</span>
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded mt-0.5 ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>

                        {/* Fiscal Lifetime progress bar */}
                        <div className="space-y-1 my-3">
                          <div className="flex justify-between items-print text-[9px] font-bold text-slate-400">
                            <span>VIDA FISCAL REMANENTE</span>
                            <span>{lifePct}% ({remainingMonths} / {asset.depreciationPeriodMonths} Meses)</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                lifePct < 20 ? 'bg-rose-554' : lifePct < 50 ? 'bg-amber-400' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${lifePct}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Depreciation & Value spec */}
                      <div className="space-y-1.5 text-xs pt-2 border-t border-black/5 dark:border-white/5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-450 font-medium font-sans">Inversión Adquisición:</span>
                          <strong className="font-mono text-slate-300 font-bold">{formatCOP(asset.value)}</strong>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-450 font-medium font-sans">Depreciación Acumulada:</span>
                          <span className="font-semibold text-rose-500 block font-mono">-{formatCOP(financials.computedDep)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-dashed border-black/5 dark:border-white/5">
                          <span className="text-slate-400 uppercase font-black text-[9px] tracking-wider">Valor Contable Neto:</span>
                          <strong className="font-mono text-emerald-500 font-extrabold text-sm">{formatCOP(financials.bookValue)}</strong>
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

      {/* 1. Modal Dialog for Warehouse Create & Edit */}
      {isWhFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border shadow-xl flex flex-col overflow-hidden max-h-[95vh] ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-slate-100' : 'bg-white border-slate-150 text-slate-800'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div>
                <h3 className="text-base font-display font-bold tracking-tight">
                  {editingWh ? `Editar Bodega: ${editingWh.name}` : 'Registrar Nueva Bodega / Depósito'}
                </h3>
                <p className="text-xs text-slate-400 font-display">Defina ubicaciones de stock dedicadas para el Kardex</p>
              </div>
              <button onClick={() => setIsWhFormOpen(false)} className="p-1.5 rounded-lg text-slate-400 cursor-pointer">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleWhSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre de la Bodega</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Bodega Auxiliar Trigo"
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  className={`w-full text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dirección Física / Ubicación Interna</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Muelle Norte, Pasillo A, Estantería 3"
                  value={whAddress}
                  onChange={(e) => setWhAddress(e.target.value)}
                  className={`w-full text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Encargado de Bodega (Opcional)</label>
                <input
                  type="text"
                  placeholder="ej. Ing. Fernando Gómez"
                  value={whManager}
                  onChange={(e) => setWhManager(e.target.value)}
                  className={`w-full text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className={`flex justify-end gap-3 pt-6 border-t ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => setIsWhFormOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isDark ? 'bg-zinc-801 hover:bg-zinc-700 text-slate-200 animate-none' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingWh ? 'Guardar Cambios' : 'Registrar Ubicación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Dialog for Internal Stock Transfer */}
      {isTransferFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border shadow-xl flex flex-col overflow-hidden max-h-[95vh] ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-slate-100' : 'bg-white border-slate-150 text-slate-800'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div>
                <h3 className="text-base font-display font-bold tracking-tight">Efectuar Traslado Interno de Inventario</h3>
                <p className="text-xs text-slate-400 font-display">Genere un movimiento de reubicación física de insumos en el Kardex</p>
              </div>
              <button onClick={() => setIsTransferFormOpen(false)} className="p-1.5 rounded-lg text-slate-400 cursor-pointer">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bodega de Origen</label>
                  <select
                    required
                    value={transOriginWhId}
                    onChange={(e) => handleOriginWhChange(e.target.value)}
                    className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">Seleccione origen...</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bodega de Destino</label>
                  <select
                    required
                    value={transDestWhId}
                    onChange={(e) => setTransDestWhId(e.target.value)}
                    className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">Seleccione destino...</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {transOriginWhId && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Producto y Lote a Mover</label>
                    {productsAvailableForTransfer.length === 0 ? (
                      <div className="p-3 text-xs text-center border rounded-xl font-medium bg-red-500/5 text-rose-454 border-rose-500/10">
                        No hay materias primas o productos con stock positivo en esta bodega origen.
                      </div>
                    ) : (
                      <select
                        required
                        value={`${selectedTransProdId}::${selectedTransLot}`}
                        onChange={(e) => {
                          const [pId, lot] = e.target.value.split('::');
                          setSelectedTransProdId(pId);
                          setSelectedTransLot(lot);
                          const chosen = productsAvailableForTransfer.find(item => item.productId === pId && item.lotNumber === lot);
                          setTransQty(chosen ? Math.min(1, chosen.availableQty) : 0);
                        }}
                        className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                          isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        {productsAvailableForTransfer.map((item, i) => (
                          <option key={i} value={`${item.productId}::${item.lotNumber}`}>
                            {item.name} ({item.sku}) - Lote: {item.lotNumber || 'Directo'} [Dispo: {item.availableQty} Unds]
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cantidad a Trasladar</label>
                      {selectedTransItemAvailable && (
                        <span className="text-[10px] font-bold text-blue-400">
                          Límite: {selectedTransItemAvailable.availableQty} unidades
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      required
                      min="1"
                      max={selectedTransItemAvailable ? selectedTransItemAvailable.availableQty : undefined}
                      placeholder="Cantidad"
                      value={transQty || ''}
                      onChange={(e) => setTransQty(Math.max(1, Number(e.target.value)))}
                      className={`w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </>
              )}

              <div className={`flex justify-end gap-3 pt-6 border-t ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => setIsTransferFormOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isDark ? 'bg-zinc-801 hover:bg-zinc-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!transDestWhId || transQty <= 0 || productsAvailableForTransfer.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-505 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-45 disabled:pointer-events-none"
                >
                  Efectuar Traslado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Dialog for Plant Assets Create & Edit */}
      {isAssetFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print animate-fade-in">
          <div className={`w-full max-w-lg rounded-2xl border shadow-xl flex flex-col overflow-hidden max-h-[95vh] ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-slate-100' : 'bg-white border-slate-150 text-slate-800'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div>
                <h3 className="text-base font-display font-bold tracking-tight">
                  {editingAsset ? `Ficha de Activo: ${editingAsset.name}` : 'Registrar Equipo Contable y de Planta'}
                </h3>
                <p className="text-xs text-slate-400 font-display">Controle depreciaciones y ubicación de equipos industriales</p>
              </div>
              <button onClick={() => setIsAssetFormOpen(false)} className="p-1.5 rounded-lg text-slate-400 cursor-pointer">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleAssetSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(95vh-140px)]">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Equipo / Activo Fijo</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Horno Rotativo Industrial de Panificación"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className={`w-full text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Número de Serial o Plaqueta</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. S/N HRM-240-BOG"
                    value={assetSerial}
                    onChange={(e) => setAssetSerial(e.target.value)}
                    className={`w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Activo</label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value as any)}
                    className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Maquinaria">Maquinaria y Equipo Industrial</option>
                    <option value="Muebles">Muebles y Enseres de Planta</option>
                    <option value="Vehículo">Vehículo de Reparto / Logística</option>
                    <option value="Computo">Equipo de Computo e IT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Área / Sección en Planta Física</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Planta de Mezclado o Amasado"
                    value={assetLocation}
                    onChange={(e) => setAssetLocation(e.target.value)}
                    className={`w-full text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha de Compra</label>
                  <input
                    type="date"
                    required
                    value={assetPurchaseDate}
                    onChange={(e) => setAssetPurchaseDate(e.target.value)}
                    className={`w-full text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Costo Adquisición ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={assetValue || ''}
                    onChange={(e) => setAssetValue(Number(e.target.value))}
                    className={`w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vida útil fiscal (en Meses)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 120 para 10 años"
                    value={assetDepreciationPeriod || ''}
                    onChange={(e) => setAssetDepreciationPeriod(Number(e.target.value))}
                    className={`w-full text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className={`flex justify-end gap-3 pt-6 border-t ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => setIsAssetFormOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isDark ? 'bg-zinc-801 hover:bg-zinc-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingAsset ? 'Guardar Cambios' : 'Registrar Activo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog: Carga de Inventario Inicial & Ajuste de Existencias Físicas */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 no-print animate-fade-in overflow-y-auto">
          <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden ${
            isDark ? 'bg-zinc-900 border-zinc-700/80 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b flex items-start justify-between gap-3 ${isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl shrink-0">
                  <i className="ri-inbox-archive-line"></i>
                </div>
                <div>
                  <h3 className="text-base font-display font-extrabold tracking-tight flex items-center gap-2">
                    Ajuste de Inventario / Saldo Inicial (Sin Factura)
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Entrada Directa
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cargue mercancía existente a sus bodegas sin requerir factura de compra comercial.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleConfirmAdjustment} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              
              {/* Warehouse & Header Parameters */}
              <div className={`p-3.5 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-3 ${
                isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                {/* Destination Warehouse */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Bodega Destino <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={adjWarehouseId}
                    onChange={(e) => setAdjWarehouseId(e.target.value)}
                    className={`w-full text-xs font-bold rounded-xl px-3 py-2 border outline-none ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="">-- Seleccione Bodega --</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.address ? `(${w.address})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Adjustment Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tipo de Movimiento
                  </label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as any)}
                    className={`w-full text-xs font-semibold rounded-xl px-3 py-2 border outline-none ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="saldo_inicial">Inventario Inicial / Apertura (Patrimonio)</option>
                    <option value="sobrante">Sobrante de Conteo Físico (Aprovechamiento)</option>
                    <option value="ajuste_general">Ajuste Operativo General</option>
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Fecha del Ajuste
                  </label>
                  <input
                    type="date"
                    required
                    value={adjDate}
                    onChange={(e) => setAdjDate(e.target.value)}
                    className={`w-full text-xs font-semibold rounded-xl px-3 py-2 border outline-none ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                {/* Concept Notes */}
                <div className="space-y-1 sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Justificación / Concepto Contable
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Mercancía antigua en mostrador sin factura de soporte / Conteo inicial"
                    value={adjConcept}
                    onChange={(e) => setAdjConcept(e.target.value)}
                    className={`w-full text-xs rounded-xl px-3 py-2 border outline-none ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Sub-Card: Add Product Lines */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                    <i className="ri-add-circle-line text-sm"></i>
                    Agregar Artículo a la Lista
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {products.length} productos registrados en catálogo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  {/* Product selector */}
                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Producto / Insumo
                    </label>
                    <select
                      value={adjSelectedProdId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setAdjSelectedProdId(id);
                        const p = products.find(prod => prod.id === id);
                        if (p) {
                          setAdjCost(p.cost || 0);
                        }
                      }}
                      className={`w-full text-xs rounded-xl px-3 py-2 border outline-none font-medium ${
                        isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      <option value="">Seleccione producto...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) - Costo ref: {formatCOP(p.cost || 0)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Unds"
                      value={adjQty || ''}
                      onChange={(e) => setAdjQty(Math.max(1, Number(e.target.value)))}
                      className={`w-full text-xs font-mono font-bold rounded-xl px-3 py-2 border outline-none text-center ${
                        isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>

                  {/* Estimated Cost */}
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Costo Unitario ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Costo unitario"
                      value={adjCost || ''}
                      onChange={(e) => setAdjCost(Math.max(0, Number(e.target.value)))}
                      className={`w-full text-xs font-mono font-bold rounded-xl px-3 py-2 border outline-none ${
                        isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>

                  {/* Add button */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddAdjLine}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                    >
                      <i className="ri-add-line text-sm"></i>
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>

                {/* Optional: Lot and Expiration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Lote / Serie (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="ej. LOT-INICIAL-01 o S/L"
                      value={adjLot}
                      onChange={(e) => setAdjLot(e.target.value)}
                      className={`w-full text-xs font-mono rounded-xl px-3 py-1.5 border outline-none ${
                        isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Fecha de Vencimiento (Opcional)
                    </label>
                    <input
                      type="date"
                      value={adjExpiry}
                      onChange={(e) => setAdjExpiry(e.target.value)}
                      className={`w-full text-xs rounded-xl px-3 py-1.5 border outline-none ${
                        isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Table of items to be loaded */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Artículos a ingresar al inventario ({adjLines.length}):
                  </span>
                  {adjLines.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAdjLines([])}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Limpiar lista
                    </button>
                  )}
                </div>

                {adjLines.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 rounded-xl border border-dashed border-slate-700 bg-black/10">
                    <i className="ri-inbox-line text-2xl block mb-1 opacity-60"></i>
                    <p className="text-xs">No hay artículos añadidos a la lista todavía.</p>
                    <p className="text-[11px] text-slate-400">Seleccione un producto arriba, coloque la cantidad y haga clic en "Agregar".</p>
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden overflow-x-auto max-h-56 scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className={`text-[10px] font-bold uppercase ${
                        isDark ? 'bg-zinc-950 text-slate-400 border-b border-zinc-800' : 'bg-slate-100 text-slate-600 border-b border-slate-200'
                      }`}>
                        <tr>
                          <th className="py-2 px-3">Producto / Insumo</th>
                          <th className="py-2 px-3">Lote / Vence</th>
                          <th className="py-2 px-3 text-right">Cantidad</th>
                          <th className="py-2 px-3 text-right">Costo Unit.</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
                          <th className="py-2 px-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-zinc-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                        {adjLines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5">
                            <td className="py-2 px-3">
                              <p className="font-bold text-xs">{line.productName}</p>
                              <span className="text-[10px] text-slate-400 font-mono">{line.sku}</span>
                            </td>
                            <td className="py-2 px-3 text-[11px] font-mono">
                              {line.lotNumber || 'S/L'}
                              {line.expirationDate && (
                                <span className="block text-[10px] text-amber-400">Vence: {line.expirationDate}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-400">
                              {line.quantity} Unds
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-400">
                              {formatCOP(line.unitCost)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                              {formatCOP(line.quantity * line.unitCost)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveAdjLine(idx)}
                                className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Eliminar fila"
                              >
                                <i className="ri-delete-bin-line text-sm"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Financial Totals Banner */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Resumen del Ajuste de Entrada
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    {adjLines.reduce((acc, l) => acc + l.quantity, 0)} unidades físicas totales
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Valor Total Contable
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    {formatCOP(adjLines.reduce((acc, l) => acc + (l.quantity * l.unitCost), 0))}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`flex justify-end gap-3 pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adjLines.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <i className="ri-checkbox-circle-line text-sm"></i>
                  <span>Confirmar Ingreso a Bodega</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación de bodegas */}
      <ConfirmModal
        isOpen={deleteWhConfirm !== null}
        title="Eliminar Bodega"
        message={`¿Está seguro de querer eliminar la bodega "${deleteWhConfirm?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (deleteWhConfirm) {
            deleteWarehouse(deleteWhConfirm.id);
            setDeleteWhConfirm(null);
          }
        }}
        onCancel={() => setDeleteWhConfirm(null)}
      />

      {/* Confirmación de retiro de activos */}
      <ConfirmModal
        isOpen={deleteAssetConfirm !== null}
        title="Retirar Activo Industrial"
        message={`¿Está seguro de retirar el activo / equipo industrial "${deleteAssetConfirm?.name}" de la planta?`}
        confirmText="Retirar de planta"
        cancelText="Cancelar"
        onConfirm={() => {
          if (deleteAssetConfirm) {
            deleteAsset(deleteAssetConfirm.id);
            setDeleteAssetConfirm(null);
          }
        }}
        onCancel={() => setDeleteAssetConfirm(null)}
      />

    </div>
  );
}

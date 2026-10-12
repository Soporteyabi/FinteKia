import React, { useState, useMemo } from 'react';
import { Product, InventoryItem, Warehouse } from '../types';
import { THEMES_MAP } from './Sidebar';
import { ConfirmModal } from './ConfirmModal';
import Pagination from './Pagination';

interface ProductsViewProps {
  products: Product[];
  inventory?: InventoryItem[];
  warehouses?: Warehouse[];
  addProduct: (p: Omit<Product, 'id'>) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  setActiveView?: (view: string) => void;
  theme: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
}

export default function ProductsView({
  products,
  inventory = [],
  warehouses = [],
  addProduct,
  updateProduct,
  deleteProduct,
  setActiveView,
  theme
}: ProductsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'critical' | 'tecnologia' | 'servicio' | 'terminado' | 'materia_prima'>('all');
  const isDark = theme === 'navy_dark' || theme === 'light_gray';

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);

  // Form Field States
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCost, setFormCost] = useState<number>(0);
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formTax, setFormTax] = useState<0 | 5 | 19>(19);
  const [formType, setFormType] = useState<Product['type']>('tecnologia');
  const [formLotTracking, setFormLotTracking] = useState<boolean>(true);
  const [formShelfLifeDays, setFormShelfLifeDays] = useState<number>(90);
  const [formMinStock, setFormMinStock] = useState<number>(5);
  const [formCategory, setFormCategory] = useState<string>('Laptops & Cómputo');
  const [formUnitOfMeasure, setFormUnitOfMeasure] = useState<string>('UND');
  const [skuSeed, setSkuSeed] = useState<number>(1000);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;

  // Format utility
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Stock mapping per product across all warehouses
  const productStocksMap = useMemo(() => {
    const map = new Map<string, { total: number; byWarehouse: Array<{ warehouseName: string; quantity: number; lotNumber?: string; expirationDate?: string; avgCost: number }> }>();
    
    inventory.forEach(item => {
      const curr = map.get(item.productId) || { total: 0, byWarehouse: [] };
      const wh = warehouses.find(w => w.id === item.warehouseId);
      curr.total += item.quantity;
      curr.byWarehouse.push({
        warehouseName: wh ? wh.name : 'Bodega Principal',
        quantity: item.quantity,
        lotNumber: item.lotNumber,
        expirationDate: item.expirationDate,
        avgCost: item.avgCost
      });
      map.set(item.productId, curr);
    });

    return map;
  }, [inventory, warehouses]);

  // Valuation metrics
  const inventoryValuation = useMemo(() => {
    let totalCostVal = 0;
    let totalSaleVal = 0;
    let lowStockCount = 0;

    products.forEach(p => {
      const stockInfo = productStocksMap.get(p.id);
      const stock = stockInfo ? stockInfo.total : 0;
      
      if (p.type !== 'servicio') {
        totalCostVal += stock * p.cost;
        totalSaleVal += stock * p.price;
        const threshold = p.minStock !== undefined ? p.minStock : 5;
        if (stock <= threshold) {
          lowStockCount++;
        }
      }
    });

    const projectedProfit = Math.max(0, totalSaleVal - totalCostVal);
    const avgProfitMargin = totalSaleVal > 0 ? ((projectedProfit / totalSaleVal) * 100).toFixed(1) : '0.0';

    return {
      totalCostVal,
      totalSaleVal,
      projectedProfit,
      avgProfitMargin,
      lowStockCount
    };
  }, [products, productStocksMap]);

  // Open Form for Create
  const handleOpenCreateForm = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku('');
    setFormBarcode('');
    setFormCost(0);
    setFormPrice(0);
    setFormTax(19);
    setFormType('tecnologia');
    setFormLotTracking(false);
    setFormShelfLifeDays(90);
    setFormMinStock(5);
    setFormCategory('Laptops & Cómputo');
    setFormUnitOfMeasure('UND');
    setSkuSeed(Math.floor(1000 + Math.random() * 9000));
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEditForm = (prod: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormSku(prod.sku);
    setFormBarcode(prod.barcode || '');
    setFormCost(prod.cost);
    setFormPrice(prod.price);
    setFormTax(prod.tax);
    setFormType(prod.type);
    setFormLotTracking(prod.lotTracking);
    setFormShelfLifeDays(prod.shelfLifeDays || 90);
    setFormMinStock(prod.minStock !== undefined ? prod.minStock : 5);
    setFormCategory(prod.category || 'General');
    setFormUnitOfMeasure(prod.unitOfMeasure || 'UND');
    setIsFormOpen(true);
  };

  // Generate Suggested SKU using a stable seed
  const suggestSku = (name: string, type: string) => {
    if (!name) return '';
    const prefixMap = {
      tecnologia: 'TECH',
      servicio: 'SRV',
      materia_prima: 'MP',
      wip: 'PP',
      terminado: 'PT'
    };
    const prefix = prefixMap[type as keyof typeof prefixMap] || 'PR';
    const sanitName = name.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
    return `${prefix}-${sanitName}-${skuSeed}`;
  };

  // Auto-generate SKU
  React.useEffect(() => {
    if (!editingProduct && (formType === 'terminado' || formType === 'tecnologia') && formName.trim()) {
      setFormSku(suggestSku(formName, formType));
    }
  }, [formName, formType, editingProduct, skuSeed]);

  const handleFillSuggestedSku = () => {
    if (!formName) {
      alert("Por favor ingrese el nombre primero para generar el SKU.");
      return;
    }
    setFormSku(suggestSku(formName, formType));
  };

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Por favor ingrese el nombre del producto o insumo.");
      return;
    }

    const skuToUse = formSku.trim() || suggestSku(formName, formType);

    const payload = {
      name: formName.trim(),
      sku: skuToUse,
      barcode: formBarcode ? formBarcode.trim() : undefined,
      cost: Number(formCost) || 0,
      price: Number(formPrice) || 0,
      tax: formTax,
      type: formType,
      lotTracking: formLotTracking,
      shelfLifeDays: formShelfLifeDays ? Number(formShelfLifeDays) : undefined,
      minStock: Number(formMinStock) || 0,
      category: formCategory.trim() || undefined,
      unitOfMeasure: formUnitOfMeasure.trim() || 'UND'
    };

    if (editingProduct) {
      updateProduct({
        ...payload,
        id: editingProduct.id
      });
    } else {
      addProduct(payload);
    }

    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ id, name });
  };

  // Filter products based on search query and type filter
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));
    
    if (selectedTypeFilter === 'critical') {
      const stock = productStocksMap.get(p.id)?.total || 0;
      const threshold = p.minStock !== undefined ? p.minStock : 5;
      return matchesSearch && p.type !== 'servicio' && stock <= threshold;
    }

    const matchesType = selectedTypeFilter === 'all' || p.type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  // Pagination for catalog records (15 per page)
  const [productsPage, setProductsPage] = useState(1);
  const PRODUCTS_PER_PAGE = 15;
  const totalProductsPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const safeProductsPage = Math.min(productsPage, totalProductsPages);
  const paginatedProducts = filteredProducts.slice(
    (safeProductsPage - 1) * PRODUCTS_PER_PAGE,
    safeProductsPage * PRODUCTS_PER_PAGE
  );

  // Stats for badges
  const totalTech = products.filter(p => p.type === 'tecnologia').length;
  const totalServices = products.filter(p => p.type === 'servicio').length;
  const totalFinished = products.filter(p => p.type === 'terminado').length;
  const totalRawMaterials = products.filter(p => p.type === 'materia_prima').length;

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* INVENTORY VALUATION & REPLENISHMENT KPI CARDS             */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Catalog Items */}
        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'}`}>
            <i className="ri-archive-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total en Catálogo</p>
            <p className="text-xl font-bold font-display">{products.length} Ítems</p>
            <p className="text-[10.5px] text-slate-400 font-medium">Hardware, repuestos y servicios</p>
          </div>
        </div>

        {/* Total Cost Valuation (CPP) */}
        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-400/20">
            <i className="ri-database-2-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valoración al Costo (CPP)</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-sky-400">
              {formatCOP(inventoryValuation.totalCostVal)}
            </p>
            <p className="text-[10.5px] text-slate-400 font-medium">Inversión en bodegas físicas</p>
          </div>
        </div>

        {/* Projected Commercial Value & Profit Margin */}
        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-400/20">
            <i className="ri-line-chart-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valoración Comercial (PVP)</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
              {formatCOP(inventoryValuation.totalSaleVal)}
            </p>
            <p className="text-[10.5px] text-emerald-300 font-medium">
              Margen Proyectado: <strong>+{inventoryValuation.avgProfitMargin}%</strong>
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div 
          onClick={() => {
            setSelectedTypeFilter('critical');
            setProductsPage(1);
          }}
          className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] ${activeTheme.cardStyles} ${
            inventoryValuation.lowStockCount > 0 ? 'ring-1 ring-amber-500/30' : ''
          }`}
          title="Clic para ver productos que requieren reabastecimiento urgente"
        >
          <div className={`p-3 rounded-xl ${
            inventoryValuation.lowStockCount > 0 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30 animate-pulse' 
              : 'bg-slate-500/10 text-slate-400'
          }`}>
            <i className="ri-alarm-warning-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alertas de Stock Mínimo</p>
            <p className={`text-xl font-bold font-mono ${inventoryValuation.lowStockCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {inventoryValuation.lowStockCount} Alertas
            </p>
            <p className="text-[10.5px] text-amber-300 font-medium">
              {inventoryValuation.lowStockCount > 0 ? 'Requieren compra o reposición' : 'Niveles de stock óptimos'}
            </p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Products List Table (spanning 2 columns on lg) */}
        <div className={`lg:col-span-2 p-6 shadow-sm rounded-2xl ${activeTheme.cardStyles}`}>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 mb-5">
            <div>
              <h2 className="text-lg font-display font-bold tracking-tight">Catálogo de Productos, Repuestos e Inventario</h2>
              <p className="text-xs text-slate-400 font-medium font-display">
                Control de existencias multi-bodega, márgenes de ganancia y stock de seguridad
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {setActiveView && (
                <button
                  onClick={() => setActiveView('compras')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Ir al módulo de compras a proveedores"
                >
                  <i className="ri-shopping-cart-2-line text-xs text-sky-400"></i>
                  <span>Registrar Compra</span>
                </button>
              )}

              <button
                id="new-product-btn"
                onClick={handleOpenCreateForm}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="ri-add-line text-sm"></i>
                <span>Nuevo Producto / Repuesto</span>
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
            <div className="relative w-full sm:flex-1">
              <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                placeholder="Buscar por descripción, SKU, categoría o código de barras..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setProductsPage(1);
                }}
                className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border focus:ring-1 focus:ring-blue-500 outline-none ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
            
            {/* Filter Pills */}
            <div className={`flex flex-wrap items-center p-1 rounded-xl w-full sm:w-auto gap-1 ${isDark ? 'bg-zinc-950/60' : 'bg-slate-50'}`}>
              {(['all', 'critical', 'tecnologia', 'servicio', 'terminado', 'materia_prima'] as const).map((tFilter) => {
                const isSelected = selectedTypeFilter === tFilter;
                const labelMap = {
                  all: `Todos (${products.length})`,
                  critical: `⚠️ Stock Bajo (${inventoryValuation.lowStockCount})`,
                  tecnologia: `💻 Hardware (${totalTech})`,
                  servicio: `🛠️ Servicios (${totalServices})`,
                  terminado: `Terminados (${totalFinished})`,
                  materia_prima: `Insumos (${totalRawMaterials})`
                };
                return (
                  <button
                    key={tFilter}
                    onClick={() => {
                      setSelectedTypeFilter(tFilter);
                      setProductsPage(1);
                    }}
                    className={`text-[10px] uppercase font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-all select-none ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : (isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
                    }`}
                  >
                    {labelMap[tFilter]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                  isDark ? 'border-zinc-800 text-slate-400' : 'border-slate-100 text-slate-400'
                }`}>
                  <th className="py-3 px-4">Descripción / Categoría</th>
                  <th className="py-3 px-4">REF SKU</th>
                  <th className="py-3 px-4 text-center">Stock en Bodega</th>
                  <th className="py-3 px-4 text-right">Costo CPP</th>
                  <th className="py-3 px-4 text-right">Precio Venta</th>
                  <th className="py-3 px-4 text-center">Margen %</th>
                  <th className="py-3 px-4 text-center">IVA</th>
                  <th className="py-3 px-4 text-right no-print">Acciones</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDark ? 'divide-zinc-800/80 text-slate-300' : 'divide-slate-100 text-slate-700'
              }`}>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                      <i className="ri-folder-open-line text-2xl block mb-2 opacity-60"></i>
                      No se encontraron productos o repuestos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((p) => {
                    const isSelected = selectedProductDetail?.id === p.id;
                    const stockInfo = productStocksMap.get(p.id);
                    const stock = stockInfo ? stockInfo.total : 0;
                    const threshold = p.minStock !== undefined ? p.minStock : 5;
                    const isService = p.type === 'servicio';

                    // Profit Margin Calculation
                    const margin = p.price > 0 && p.cost > 0 
                      ? (((p.price - p.cost) / p.price) * 100).toFixed(1)
                      : null;

                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => setSelectedProductDetail(isSelected ? null : p)}
                        className={`transition-all font-sans cursor-pointer ${
                          isSelected 
                            ? (isDark ? 'bg-zinc-800/60' : 'bg-blue-50/50') 
                            : (isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50')
                        }`}
                      >
                        {/* Description & Category */}
                        <td className="py-3 px-4">
                          <p className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[9.5px] font-black uppercase tracking-wider ${
                              p.type === 'tecnologia' ? 'text-sky-400' : p.type === 'servicio' ? 'text-emerald-400' : p.type === 'materia_prima' ? 'text-orange-400' : p.type === 'wip' ? 'text-indigo-400' : 'text-blue-400'
                            }`}>
                              {p.type === 'tecnologia' ? '💻 Hardware' : p.type === 'servicio' ? '🛠️ Servicio TI' : p.type.replace('_', ' ')}
                            </span>
                            {p.category && (
                              <span className="text-[9.5px] text-slate-400 font-medium">
                                • {p.category}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="py-3 px-4 font-mono font-medium text-slate-300">
                          {p.sku}
                        </td>

                        {/* Real Stock Status Badge */}
                        <td className="py-3 px-4 text-center">
                          {isService ? (
                            <span className="text-[10px] text-slate-500 font-mono">N/A</span>
                          ) : stock <= 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              ❌ Agotado
                            </span>
                          ) : stock <= threshold ? (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1 font-mono">
                              <span>⚠️ {stock}</span>
                              <span className="text-[8px] text-amber-400/80">(Bajo)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                              ✓ {stock} {p.unitOfMeasure || 'UND'}
                            </span>
                          )}
                        </td>

                        {/* Cost */}
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {formatCOP(p.cost)}
                        </td>

                        {/* Sale Price */}
                        <td className={`py-3 px-4 text-right font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-slate-800'}`}>
                          {p.price > 0 ? formatCOP(p.price) : <span className="text-slate-400 font-normal">N/A</span>}
                        </td>

                        {/* Profit Margin */}
                        <td className="py-3 px-4 text-center font-mono">
                          {margin !== null ? (
                            <span className={`text-[10px] font-bold ${
                              Number(margin) >= 30 ? 'text-emerald-400' : Number(margin) >= 15 ? 'text-sky-300' : 'text-amber-400'
                            }`}>
                              {margin}%
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">N/A</span>
                          )}
                        </td>

                        {/* Tax */}
                        <td className="py-3 px-4 text-center font-bold text-slate-300">{p.tax}%</td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right no-print" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1.5 justify-end">
                            <button
                              title="Editar Ficha"
                              onClick={(e) => handleOpenEditForm(p, e)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
                              }`}
                            >
                              <i className="ri-pencil-fill"></i>
                            </button>
                            <button
                              title="Eliminar de catálogo"
                              onClick={(e) => handleDelete(p.id, p.name, e)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark ? 'text-zinc-400 hover:text-rose-400 hover:bg-zinc-800' : 'text-slate-500 hover:text-rose-500 hover:bg-slate-100'
                              }`}
                            >
                              <i className="ri-delete-bin-fill"></i>
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

          {filteredProducts.length > 0 && (
            <Pagination
              currentPage={safeProductsPage}
              totalItems={filteredProducts.length}
              pageSize={PRODUCTS_PER_PAGE}
              onPageChange={(page) => setProductsPage(page)}
              isDark={isDark}
              itemLabel="productos e insumos"
            />
          )}
        </div>

        {/* Detail Panel & Multi-Warehouse Stock Breakdown (1 column on lg) */}
        <div className="space-y-6">
          <div className={`p-6 shadow-sm rounded-2xl ${activeTheme.cardStyles}`}>
            <h3 className={`font-display font-semibold text-base border-b pb-4 mb-4 flex items-center justify-between ${
              isDark ? 'text-white border-zinc-800' : 'text-slate-800 border-slate-100'
            }`}>
              <span>Ficha Técnica & Ubicación</span>
              {selectedProductDetail && (
                <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                  {selectedProductDetail.sku}
                </span>
              )}
            </h3>
            
            {selectedProductDetail ? (
              <div className="space-y-4">
                
                {/* Header card of selected item */}
                <div className="flex items-center gap-3 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                    selectedProductDetail.type === 'tecnologia' ? 'bg-sky-500/10 text-sky-400' : selectedProductDetail.type === 'servicio' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    <i className={selectedProductDetail.type === 'tecnologia' ? "ri-macbook-line" : selectedProductDetail.type === 'servicio' ? "ri-tools-line" : "ri-box-3-fill"}></i>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs truncate">{selectedProductDetail.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Categoría: {selectedProductDetail.category || 'General'}
                    </p>
                  </div>
                </div>

                {/* Stock Breakdown across Warehouses */}
                <div className={`p-4 rounded-xl space-y-2.5 text-xs ${isDark ? 'bg-zinc-950/70 border border-zinc-800' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                      Disponibilidad en Bodegas
                    </span>
                    <span className="font-mono font-black text-sm text-emerald-400">
                      {productStocksMap.get(selectedProductDetail.id)?.total || 0} {selectedProductDetail.unitOfMeasure || 'UND'}
                    </span>
                  </div>

                  {/* List of storage locations */}
                  <div className="space-y-1.5 pt-1">
                    {(productStocksMap.get(selectedProductDetail.id)?.byWarehouse || []).map((whStock, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-black/20">
                        <div>
                          <span className="font-bold text-slate-200 block">{whStock.warehouseName}</span>
                          {whStock.lotNumber && (
                            <span className="text-[9.5px] text-slate-400 font-mono">Lote: {whStock.lotNumber}</span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-sky-400 text-xs">
                          {whStock.quantity} {selectedProductDetail.unitOfMeasure || 'UND'}
                        </span>
                      </div>
                    ))}

                    {(!productStocksMap.get(selectedProductDetail.id) || productStocksMap.get(selectedProductDetail.id)?.byWarehouse.length === 0) && (
                      <p className="text-slate-500 italic text-[11px] py-1 text-center">
                        {selectedProductDetail.type === 'servicio' ? 'No aplica inventario físico para servicios' : 'Sin existencias en bodegas actualmente'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Commercial Margins and Profitability */}
                <div className={`p-4 rounded-xl space-y-2 text-xs ${isDark ? 'bg-zinc-950/70 border border-zinc-800' : 'bg-slate-50 border border-slate-200'}`}>
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block pb-1 border-b border-white/5">
                    Rentabilidad & Márgenes
                  </span>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-400">Costo Unitario (CPP):</span>
                    <span className="font-mono font-bold text-slate-300">{formatCOP(selectedProductDetail.cost)}</span>
                  </div>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-400">Precio de Venta al Público:</span>
                    <span className="font-mono font-bold text-emerald-400">{formatCOP(selectedProductDetail.price)}</span>
                  </div>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-400">Ganancia Neta Unitaria:</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {formatCOP(Math.max(0, selectedProductDetail.price - selectedProductDetail.cost))}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/5 font-bold">
                    <span className="text-slate-300">Margen Bruto Comercial:</span>
                    <span className="font-mono text-emerald-400">
                      {selectedProductDetail.price > 0 && selectedProductDetail.cost > 0
                        ? `${(((selectedProductDetail.price - selectedProductDetail.cost) / selectedProductDetail.price) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Quick actions for this product */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {setActiveView && (
                    <button
                      onClick={() => setActiveView('compras')}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <i className="ri-shopping-bag-3-line text-sky-400"></i>
                      <span>Comprar</span>
                    </button>
                  )}

                  {setActiveView && (
                    <button
                      onClick={() => setActiveView('facturacion')}
                      className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <i className="ri-file-text-line"></i>
                      <span>Facturar</span>
                    </button>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <i className="ri-information-line text-3xl opacity-50 block mb-1"></i>
                <p className="text-xs font-semibold text-slate-300">Selecciona un producto del catálogo</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Podrás ver su stock desglosado por bodega física, márgenes de ganancia y opciones de compra rápida.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* MODAL: REGISTRAR / EDITAR PRODUCTO EN MAESTRO            */}
      {/* ======================================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 no-print animate-fade-in">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col overflow-hidden max-h-[92vh] ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-slate-100' : 'bg-white border-slate-150 text-slate-800'
          }`}>
            
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div>
                <h3 className="text-base font-display font-extrabold tracking-tight">
                  {editingProduct ? `Editar Ítem: ${editingProduct.name}` : 'Registrar Nuevo Ítem en Maestro'}
                </h3>
                <p className="text-xs text-slate-400">Configura valores, stock mínimo de seguridad y clasificación fiscal DIAN</p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 max-h-[calc(92vh-140px)] text-xs">
              
              <div className="space-y-1 block">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Producto / Insumo / Servicio *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Laptop Lenovo ThinkPad T14 o SSD NVMe 1TB"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={`w-full text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* SKU */}
                <div className="space-y-1 block">
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Código SKU *
                    </label>
                    <button
                      type="button"
                      onClick={handleFillSuggestedSku}
                      className="text-[9px] text-blue-400 hover:text-blue-300 font-bold uppercase transition-colors cursor-pointer"
                    >
                      Generar sugerido
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="ej. TECH-LAP-01"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className={`w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Barcode */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código de Barras (Opcional)</label>
                  <input
                    type="text"
                    placeholder="EAN-13 o código de barras comercial"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className={`w-full text-xs font-mono rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Type Selection */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Ítem *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="tecnologia">💻 Hardware / Equipo Tecnológico</option>
                    <option value="servicio">🛠️ Servicio Profesional / Soporte TI</option>
                    <option value="terminado">📦 Producto Terminado</option>
                    <option value="materia_prima">🧪 Materia Prima / Insumo</option>
                    <option value="wip">🔄 En Proceso (WIP)</option>
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoría</label>
                  <input
                    type="text"
                    placeholder="ej. Laptops, Redes, Repuestos"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className={`w-full text-xs font-medium rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Unit of measure */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unidad de Medida</label>
                  <select
                    value={formUnitOfMeasure}
                    onChange={(e) => setFormUnitOfMeasure(e.target.value)}
                    className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="UND">UND (Unidades)</option>
                    <option value="SRV">SRV (Servicios)</option>
                    <option value="KG">KG (Kilogramos)</option>
                    <option value="MTS">MTS (Metros)</option>
                    <option value="L">L (Litros)</option>
                    <option value="CAJA">CAJA (Cajas)</option>
                  </select>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Cost */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Costo de Adquisición ($)</label>
                  <input
                    type="number"
                    min="0"
                    disabled={formType === 'servicio'}
                    placeholder="0"
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className={`w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border disabled:opacity-50 ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Price */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precio de Venta ($) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className={`w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Min Stock */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock Mínimo (Alerta)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="5"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className={`w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tax level */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasa de IVA DIAN %</label>
                  <select
                    value={formTax}
                    onChange={(e) => setFormTax(Number(e.target.value) as any)}
                    className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="19">IVA General (19%)</option>
                    <option value="5">IVA Reducido (5%)</option>
                    <option value="0">Exento de IVA (0%)</option>
                  </select>
                </div>

                {/* Lot tracking */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Control de Lotes / Seriales</label>
                  <select
                    value={formLotTracking ? "si" : "no"}
                    onChange={(e) => setFormLotTracking(e.target.value === "si")}
                    className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="no">No, control de stock estándar</option>
                    <option value="si">Sí, rastreo por lote y vencimiento</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`flex justify-end gap-3 pt-6 border-t ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="submit-product-btn"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Registrar en Catálogo'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Confirmación de eliminación */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="Eliminar de catálogo"
        message={`¿Está seguro de eliminar "${deleteConfirm?.name}" del catálogo comercial de productos e insumos? Esta acción es irreversible.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (deleteConfirm) {
            deleteProduct(deleteConfirm.id);
            if (selectedProductDetail?.id === deleteConfirm.id) {
              setSelectedProductDetail(null);
            }
            setDeleteConfirm(null);
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />

    </div>
  );
}

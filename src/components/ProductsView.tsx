import React, { useState } from 'react';
import { Product } from '../types';
import { THEMES_MAP } from './Sidebar';
import { ConfirmModal } from './ConfirmModal';
import Pagination from './Pagination';

interface ProductsViewProps {
  products: Product[];
  addProduct: (p: Omit<Product, 'id'>) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  theme: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
}

export default function ProductsView({
  products,
  addProduct,
  updateProduct,
  deleteProduct,
  theme
}: ProductsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'tecnologia' | 'servicio' | 'terminado' | 'materia_prima' | 'wip'>('all');
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

  // Open Form for Create
  const handleOpenCreateForm = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku('');
    setFormBarcode('');
    setFormCost(0);
    setFormPrice(0);
    setFormTax(19);
    setFormType('terminado');
    setFormLotTracking(true);
    setFormShelfLifeDays(90);
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
    setIsFormOpen(true);
  };

  // Generate Suggested SKU using a stable seed to avoid frantic flashing on each keystroke
  const suggestSku = (name: string, type: string) => {
    if (!name) return '';
    const prefixMap = {
      materia_prima: 'MP',
      wip: 'PP',
      terminado: 'PT'
    };
    const prefix = prefixMap[type as keyof typeof prefixMap] || 'PR';
    const sanitName = name.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
    return `${prefix}-${sanitName}-${skuSeed}`;
  };

  // Auto-generate SKU for newly created Finished Products in real time
  React.useEffect(() => {
    if (!editingProduct && formType === 'terminado' && formName.trim()) {
      setFormSku(suggestSku(formName, 'terminado'));
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
      name: formName,
      sku: skuToUse,
      barcode: formBarcode ? formBarcode.trim() : undefined,
      cost: Number(formCost) || 0,
      price: Number(formPrice) || 0,
      tax: formTax,
      type: formType,
      lotTracking: formLotTracking,
      shelfLifeDays: formShelfLifeDays ? Number(formShelfLifeDays) : undefined
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
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    
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

  // Calculate stats for badges
  const totalTech = products.filter(p => p.type === 'tecnologia').length;
  const totalServices = products.filter(p => p.type === 'servicio').length;
  const totalFinished = products.filter(p => p.type === 'terminado').length;
  const totalRawMaterials = products.filter(p => p.type === 'materia_prima').length;

  return (
    <div className="space-y-6">
      
      {/* Header and Stats view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-zinc-805 text-zinc-300' : 'bg-slate-100 text-slate-700'}`}>
            <i className="ri-archive-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Catálogo</p>
            <p className="text-xl font-bold font-display">{products.length}</p>
          </div>
        </div>
        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-400/20">
            <i className="ri-macbook-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hardware & Tech</p>
            <p className="text-xl font-bold font-display text-sky-400">{totalTech}</p>
          </div>
        </div>
        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-400/20">
            <i className="ri-tools-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Servicios TI</p>
            <p className="text-xl font-bold font-display text-cyan-400">{totalServices}</p>
          </div>
        </div>
        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-400/20">
            <i className="ri-box-3-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Terminados / Insumos</p>
            <p className="text-xl font-bold font-display">{totalFinished + totalRawMaterials}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Products List Table (spanning 2 columns on lg) */}
        <div className={`lg:col-span-2 p-6 shadow-sm ${activeTheme.cardStyles}`}>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 mb-5">
            <div>
              <h2 className="text-lg font-display font-bold tracking-tight">Catálogo de Productos e Insumos</h2>
              <p className="text-xs text-slate-400 font-medium font-display">Maestro central de insumos, materias primas y productos DIAN</p>
            </div>
            
            <button
              id="new-product-btn"
              onClick={handleOpenCreateForm}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <i className="ri-add-line text-sm"></i> Nuevo Producto / Insumo
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
            <div className="relative w-full sm:flex-1">
              <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                placeholder="Buscar por descripción, SKU o Código de Barras..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setProductsPage(1);
                }}
                className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border focus:ring-1 focus:ring-blue-500 outline-none ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-800'
                }`}
              />
            </div>
            
            <div className={`flex flex-wrap items-center p-1 rounded-xl w-full sm:w-auto gap-1 ${isDark ? 'bg-zinc-950/60' : 'bg-slate-50'}`}>
              {(['all', 'tecnologia', 'servicio', 'terminado', 'materia_prima'] as const).map((tFilter) => {
                const isSelected = selectedTypeFilter === tFilter;
                const labelMap = {
                  all: 'Todos',
                  tecnologia: '💻 Tecnología',
                  servicio: '🛠️ Servicios',
                  terminado: 'Terminados',
                  materia_prima: 'Insumos / MP'
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
                        ? (isDark ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm')
                        : (isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-850')
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
                  isDark ? 'border-zinc-850 text-slate-400' : 'border-slate-100 text-slate-400'
                }`}>
                  <th className="py-3 px-4">Descripción / Tipo</th>
                  <th className="py-3 px-4">REF SKU</th>
                  <th className="py-3 px-4 text-right">Costo Estimado</th>
                  <th className="py-3 px-4 text-right">P. Venta</th>
                  <th className="py-3 px-4 text-center">IVA</th>
                  <th className="py-3 px-4 text-center">Lote</th>
                  <th className="py-3 px-4 text-right no-print">Acciones</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDark ? 'divide-zinc-850 text-slate-300' : 'divide-slate-100 text-slate-700'
              }`}>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                      <i className="ri-folder-open-line text-2xl block mb-2 opacity-60"></i>
                      No se encontraron productos o insumos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((p) => {
                    const isSelected = selectedProductDetail?.id === p.id;
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => setSelectedProductDetail(isSelected ? null : p)}
                        className={`transition-all font-sans cursor-pointer ${
                          isSelected 
                            ? (isDark ? 'bg-zinc-850/50' : 'bg-blue-50/40') 
                            : (isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-55/60')
                        }`}
                      >
                        <td className="py-3 px-4">
                          <p className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-850'}`}>{p.name}</p>
                          <span className={`text-[9px] font-black uppercase tracking-wider block mt-0.5 ${
                            p.type === 'tecnologia' ? 'text-sky-400' : p.type === 'servicio' ? 'text-emerald-400' : p.type === 'materia_prima' ? 'text-orange-400' : p.type === 'wip' ? 'text-indigo-400' : 'text-blue-400'
                          }`}>
                            {p.type === 'tecnologia' ? '💻 Hardware / Tecnología' : p.type === 'servicio' ? '🛠️ Servicio Profesional' : p.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">{p.sku}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">{formatCOP(p.cost)}</td>
                        <td className={`py-3 px-4 text-right font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-slate-800'}`}>
                          {p.price > 0 ? formatCOP(p.price) : <span className="text-slate-400 font-normal">N/A</span>}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">{p.tax}%</td>
                        <td className="py-3 px-4 text-center">
                          {p.lotTracking ? (
                            <span className="bg-emerald-500/10 text-emerald-400 font-extrabold uppercase tracking-wider text-[8px] border border-emerald-500/20 px-1.5 py-0.5 rounded">SI</span>
                          ) : (
                            <span className={`font-bold uppercase tracking-wider text-[8px] px-1.5 py-0.5 rounded ${
                              isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-slate-100 text-slate-400'
                            }`}>NO</span>
                          )}
                        </td>
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

        {/* Detail Panel & Fact sheet (1 column on lg) */}
        <div className="space-y-6">
          <div className={`p-6 shadow-sm ${activeTheme.cardStyles}`}>
            <h3 className={`font-display font-semibold text-base border-b pb-4 mb-4 ${
              isDark ? 'text-white border-zinc-850' : 'text-slate-800 border-slate-100'
            }`}>Detalle del Ítem Selección</h3>
            
            {selectedProductDetail ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    selectedProductDetail.type === 'materia_prima' ? 'bg-orange-500/10 text-orange-400' : selectedProductDetail.type === 'wip' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    <i className={selectedProductDetail.type === 'materia_prima' ? "ri-flask-fill" : selectedProductDetail.type === 'wip' ? "ri-refresh-line" : "ri-box-3-fill"}></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">{selectedProductDetail.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">REF: {selectedProductDetail.sku}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl space-y-2.5 text-xs ${isDark ? 'bg-zinc-950/60' : 'bg-slate-50'}`}>
                  <div className="flex justify-between items-center py-1 border-b border-black/5 dark:border-white/5">
                    <span className="text-slate-400 font-medium">Costo de Listas ($):</span>
                    <span className="font-bold font-mono">{formatCOP(selectedProductDetail.cost)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-black/5 dark:border-white/5">
                    <span className="text-slate-400 font-medium">Precio de Venta ($):</span>
                    <span className="font-bold font-mono text-emerald-500">
                      {selectedProductDetail.price > 0 ? formatCOP(selectedProductDetail.price) : 'N/A (Sólo Insumo)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-black/5 dark:border-white/5">
                    <span className="text-slate-400 font-medium">Porcentaje IVA DIAN:</span>
                    <span className="font-bold">{selectedProductDetail.tax}% (Gravable)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-black/5 dark:border-white/5">
                    <span className="text-slate-400 font-medium">Control de Trazabilidad:</span>
                    <span className="font-bold uppercase text-[10px]">
                      {selectedProductDetail.lotTracking ? 'Por Lotes Contable' : 'Peps Directo'}
                    </span>
                  </div>
                  {selectedProductDetail.shelfLifeDays && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400 font-medium">Vida Útil Estimada:</span>
                      <span className="font-bold">{selectedProductDetail.shelfLifeDays} días</span>
                    </div>
                  )}
                </div>

                <div className={`p-4 rounded-xl text-center text-[10px] text-slate-400 border border-slate-200/50 ${isDark ? 'bg-zinc-950/45' : 'bg-slate-50/50'}`}>
                  Este ítem está conectado al MRP, facturación oficial electrónica DIAN y compras con asfalto fiscal PUC.
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <i className="ri-information-line text-3xl opacity-50 block mb-2"></i>
                <p className="text-xs">Seleccione un producto del catálogo para ver la ficha detallada.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modern Dialog Modal form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print animate-fade-in">
          <div className={`w-full max-w-xl rounded-2xl border shadow-xl flex flex-col overflow-hidden max-h-[90vh] ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-slate-100' : 'bg-white border-slate-150 text-slate-800'
          }`}>
            
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div>
                <h3 className="text-base font-display font-bold tracking-tight">
                  {editingProduct ? `Editar Ítem: ${editingProduct.name}` : 'Registrar Nuevo Item en Maestro'}
                </h3>
                <p className="text-xs text-slate-400">Complete los campos de valor y clasificación DIAN</p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-slate-400`}
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 max-h-[calc(90vh-140px)]">
              
              <div className="space-y-1 block">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Producto / Insumo</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Harina de Trigo Extra Fina"
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
                      Código SKU {formType === 'terminado' && !editingProduct && <span className="text-emerald-500 font-black normal-case font-sans">(Autogenerado)</span>}
                    </label>
                    {formType === 'terminado' && !editingProduct ? (
                      <span className="text-[9px] text-emerald-500 font-black uppercase tracking-wider">
                        Automático ✔️
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleFillSuggestedSku}
                        className="text-[9px] text-blue-500 hover:text-blue-400 font-bold uppercase transition-colors"
                      >
                        Generar sugerido
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="ej. MP-HARI-01"
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
                    placeholder="EAN-13 o similar"
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Ítem</label>
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
                    <option value="materia_prima">🧪 Materia Prima (Insumo)</option>
                    <option value="wip">🔄 En Proceso (WIP)</option>
                  </select>
                </div>

                {/* Tax level */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasa de IVA %</label>
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

                {/* Control de Lote */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trazabilidad por Lote</label>
                  <select
                    value={formLotTracking ? "si" : "no"}
                    onChange={(e) => setFormLotTracking(e.target.value === "si")}
                    className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="si">Sí, auditar por lotes y stock</option>
                    <option value="no">No, manejo continuo directo</option>
                  </select>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Cost */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Costo Industrial ($)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Price */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precio de Venta ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5">Dejar en 0 si es sólo para consumo</p>
                </div>

                {/* Shelf life days */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vida útil (Días)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 90"
                    value={formShelfLifeDays}
                    onChange={(e) => setFormShelfLifeDays(Number(e.target.value))}
                    className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 border ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
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
                  {editingProduct ? 'Guardar Cambios' : 'Registrar en Maestro'}
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

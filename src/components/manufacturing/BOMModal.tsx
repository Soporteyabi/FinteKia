import React, { useState } from 'react';
import { BOM, BOMItem, Product } from '../../types';
import { formatCOP, parseDecimal } from '../../utils/currencyUtils';
import { DecimalInput } from '../common/DecimalInput';
import { toast } from '../../context/ToastContext';
import { Plus, Trash2, Layers, AlertCircle, CheckCircle2, FlaskConical, PackagePlus, Scale } from 'lucide-react';
import { UnitCostFloatingTag } from '../common/UnitCostFloatingTag';

interface BOMModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bomData: Omit<BOM, 'id'>) => void;
  existingBOM?: BOM | null;
  products: Product[];
  currentCompanyId: string;
  addProduct?: (prod: Omit<Product, 'id'>) => void;
}

export const BOMModal: React.FC<BOMModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingBOM,
  products,
  currentCompanyId,
  addProduct
}) => {
  if (!isOpen) return null;

  // Filter finished products (or all products for flexibility)
  const finishedProducts = products.filter(
    (p) => p.type === 'terminado' || p.type === 'tecnologia' || !p.type
  );
  
  // Raw materials and ingredients
  const rawMaterials = products.filter(
    (p) => p.type === 'materia_prima' || p.type === 'wip' || p.type !== 'servicio'
  );

  const [finishedProductId, setFinishedProductId] = useState<string>(
    existingBOM?.finishedProductId || (finishedProducts[0]?.id || '')
  );
  const [version, setVersion] = useState<string>(existingBOM?.version || 'V1.0');
  const [name, setName] = useState<string>(existingBOM?.name || '');
  const [description, setDescription] = useState<string>(existingBOM?.description || '');

  // Quick product creation modal toggle
  const [showQuickCreateProduct, setShowQuickCreateProduct] = useState(false);
  const [quickProdName, setQuickProdName] = useState('');
  const [quickProdSku, setQuickProdSku] = useState('');
  const [quickProdUom, setQuickProdUom] = useState('L');
  const [quickProdPrice, setQuickProdPrice] = useState<number | string>(12000);

  // Quick raw material creation toggle
  const [showQuickCreateRaw, setShowQuickCreateRaw] = useState(false);
  const [quickRawName, setQuickRawName] = useState('');
  const [quickRawSku, setQuickRawSku] = useState('');
  const [quickRawUom, setQuickRawUom] = useState('g');
  const [quickRawCategory, setQuickRawCategory] = useState('Materia Prima');
  const [quickRawCost, setQuickRawCost] = useState<number | string>(5000);
  const [focusedItemIdx, setFocusedItemIdx] = useState<number | null>(null);
  const [isQuickRawCostFocused, setIsQuickRawCostFocused] = useState<boolean>(false);

  // Items in recipe with editable cost
  const [items, setItems] = useState<Array<{
    productId: string;
    quantity: number | string;
    customCost?: number | string;
  }>>(() => {
    if (existingBOM && existingBOM.items.length > 0) {
      return existingBOM.items.map((it) => {
        const prod = products.find(p => p.id === it.productId);
        return {
          productId: it.productId,
          quantity: it.quantity,
          customCost: prod ? prod.cost : undefined
        };
      });
    }
    // Default with first available raw material or empty
    return rawMaterials.length > 0
      ? [{ productId: rawMaterials[0].id, quantity: 1, customCost: rawMaterials[0].cost }]
      : [];
  });

  // Quality Standard
  const [hasQualityStandard, setHasQualityStandard] = useState<boolean>(!!existingBOM?.standards);
  const [standardParam, setStandardParam] = useState<string>(existingBOM?.standards?.param || 'pH / Concentración');
  const [standardTarget, setStandardTarget] = useState<number | string>(existingBOM?.standards?.target || 7.0);
  const [standardTolerance, setStandardTolerance] = useState<number | string>(existingBOM?.standards?.tolerance || 0.5);

  const handleAddItem = () => {
    const nextProd = rawMaterials.find(rm => !items.some(it => it.productId === rm.id)) || rawMaterials[0];
    setItems(prev => [
      ...prev,
      { productId: nextProd ? nextProd.id : '', quantity: 1, customCost: nextProd ? nextProd.cost : 0 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItem = (index: number, field: 'productId' | 'quantity' | 'customCost', val: any) => {
    setItems(prev => {
      const copy = [...prev];
      if (field === 'productId') {
        const p = products.find(prod => prod.id === val);
        copy[index] = { ...copy[index], productId: val, customCost: p ? p.cost : 0 };
      } else {
        copy[index] = { ...copy[index], [field]: val };
      }
      return copy;
    });
  };

  // Quick create raw material (chemical, essence, container, label, etc.)
  const handleQuickCreateRawMaterial = () => {
    if (!quickRawName.trim()) {
      toast.warning("Por favor ingrese el nombre del insumo o materia prima.", "Nombre Requerido");
      return;
    }
    if (!addProduct) {
      toast.error("Función para crear productos no disponible.");
      return;
    }

    const skuToUse = quickRawSku.trim() || `MP-${quickRawName.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedCost = parseDecimal(quickRawCost);
    const newId = `mp-${Date.now()}`;

    addProduct({
      name: quickRawName.trim(),
      sku: skuToUse,
      type: 'materia_prima',
      cost: parsedCost,
      price: 0,
      tax: 0,
      lotTracking: false,
      unitOfMeasure: quickRawUom,
      category: quickRawCategory,
      minStock: 10,
      companyId: currentCompanyId
    });

    setItems(prev => [
      ...prev,
      { productId: newId, quantity: 1, customCost: parsedCost }
    ]);

    toast.success(`Insumo "${quickRawName}" creado y añadido a la receta.`, "Insumo Creado");
    setShowQuickCreateRaw(false);
    setQuickRawName('');
    setQuickRawSku('');
  };

  // Quick create finished product if not yet in catalog
  const handleQuickCreateFinishedProduct = () => {
    if (!quickProdName.trim()) {
      toast.warning("Por favor ingrese el nombre del producto terminado.", "Nombre Requerido");
      return;
    }
    if (!addProduct) {
      toast.error("Función para crear productos no disponible.");
      return;
    }

    const skuToUse = quickProdSku.trim() || `PT-${quickProdName.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedPrice = parseDecimal(quickProdPrice);

    addProduct({
      name: quickProdName.trim(),
      sku: skuToUse,
      type: 'terminado',
      cost: 0,
      price: parsedPrice,
      tax: 19,
      lotTracking: true,
      unitOfMeasure: quickProdUom,
      category: 'Producto Terminado',
      minStock: 10,
      companyId: currentCompanyId
    });

    toast.success(`Producto "${quickProdName}" creado con éxito. Ahora puedes seleccionarlo en la receta.`, "Producto Creado");
    setShowQuickCreateProduct(false);
    setQuickProdName('');
  };

  // Calculate total materials cost using customCost if provided (handling g vs kg)
  const totalDirectCost = items.reduce((acc, it) => {
    const prod = products.find(p => p.id === it.productId);
    const qty = parseDecimal(it.quantity);
    const unitCost = it.customCost !== undefined ? parseDecimal(it.customCost) : (prod ? prod.cost : 0);
    const isGrams = prod?.unitOfMeasure === 'g' || prod?.unitOfMeasure === 'gr';
    const lineCost = isGrams ? (qty / 1000) * unitCost : (qty * unitCost);
    return acc + lineCost;
  }, 0);

  const selectedFinishedProduct = products.find(p => p.id === finishedProductId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!finishedProductId) {
      toast.warning("Por favor seleccione el producto terminado a elaborar.", "Producto Requerido");
      return;
    }

    if (items.length === 0) {
      toast.warning("La receta debe tener al menos un insumo o materia prima.", "Insumos Requeridos");
      return;
    }

    // Validate valid items
    const validItems: BOMItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        toast.warning(`La fila #${i + 1} no tiene un insumo seleccionado.`, "Fila Incompleta");
        return;
      }
      const qtyNum = parseDecimal(it.quantity);
      if (qtyNum <= 0) {
        toast.warning(`La cantidad en la fila #${i + 1} debe ser mayor a 0.`, "Cantidad Inválida");
        return;
      }
      validItems.push({
        id: `bi-${Date.now()}-${i}`,
        productId: it.productId,
        quantity: qtyNum
      });
    }

    const payload: Omit<BOM, 'id'> = {
      finishedProductId,
      version: version.trim() || 'V1.0',
      name: name.trim() || (selectedFinishedProduct ? `Receta ${selectedFinishedProduct.name}` : 'Receta de Fabricación'),
      description: description.trim() || undefined,
      companyId: currentCompanyId,
      items: validItems,
      standards: hasQualityStandard ? {
        param: standardParam.trim() || 'Control de Calidad',
        target: parseDecimal(standardTarget),
        tolerance: parseDecimal(standardTolerance)
      } : undefined
    };

    onSave(payload);
    toast.success(`Ficha técnica / Receta guardada con éxito para "${selectedFinishedProduct?.name || 'Producto'}".`, "Receta Guardada");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {existingBOM ? 'Editar Ficha Técnica / Receta BOM' : 'Nueva Ficha Técnica / Receta BOM'}
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-medium">
                  {version || 'V1.0'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define qué insumos, materias primas (químicos, etiquetas, envases) consume 1 unidad de producto elaborado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Section 1: Finished Product Selection & Recipe Details */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                1. Producto Terminado a Elaborar
              </span>
              {addProduct && (
                <button
                  type="button"
                  onClick={() => setShowQuickCreateProduct(prev => !prev)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  {showQuickCreateProduct ? 'Ocultar Creador Rápido' : '+ Crear Nuevo Producto Terminado (ej: Detergente)'}
                </button>
              )}
            </div>

            {/* Quick Create Product Sub-Panel */}
            {showQuickCreateProduct && (
              <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-3 animate-fade-in">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                  Crear Producto Terminado en el Catálogo:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre del Producto</label>
                    <input
                      type="text"
                      placeholder="ej. Detergente Líquido Potásico 1L"
                      value={quickProdName}
                      onChange={(e) => setQuickProdName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Unidad de Medida</label>
                    <select
                      value={quickProdUom}
                      onChange={(e) => setQuickProdUom(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="L">L (Litros)</option>
                      <option value="UND">UND (Unidades)</option>
                      <option value="KG">KG (Kilogramos)</option>
                      <option value="GAL">GAL (Galones)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Precio Venta ($)</label>
                    <DecimalInput
                      value={quickProdPrice}
                      onChange={(_num, raw) => setQuickProdPrice(raw)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleQuickCreateFinishedProduct}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                  >
                    Guardar Producto en Catálogo
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Seleccionar Producto del Catálogo *
                </label>
                <select
                  value={finishedProductId}
                  onChange={(e) => {
                    setFinishedProductId(e.target.value);
                    const prod = products.find(p => p.id === e.target.value);
                    if (prod && !name) {
                      setName(`Receta Estándar ${prod.name}`);
                    }
                  }}
                  required
                  className="w-full text-xs font-semibold rounded-xl px-3 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Seleccione el producto terminado...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — {p.type === 'terminado' ? 'Producto Terminado' : p.type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Código de Versión *
                </label>
                <input
                  type="text"
                  placeholder="ej. V1.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  required
                  className="w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Nombre Descriptivo de la Receta
                </label>
                <input
                  type="text"
                  placeholder="ej. Fórmula Detergente Líquido Potásico 1L"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs rounded-xl px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Notas de Fabricación / Instrucciones
                </label>
                <input
                  type="text"
                  placeholder="ej. Mezclar a 40°C y etiquetar después del enfriado"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs rounded-xl px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Bill of Materials Ingredients Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  2. Insumos y Materias Primas Requeridas (Para Elaborar 1 Unidad)
                </span>
                <p className="text-[11px] text-slate-500">
                  Agrega y edita aquí las materias primas (químicos, aceites, esencias, solventes), envases y etiquetas adhesivas. Puedes modificar cantidades y costos de cada insumo.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {addProduct && (
                  <button
                    type="button"
                    onClick={() => setShowQuickCreateRaw(prev => !prev)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <PackagePlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{showQuickCreateRaw ? 'Ocultar Creador' : '+ Nuevo Insumo / Materia Prima'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Fila</span>
                </button>
              </div>
            </div>

            {/* Quick Create Raw Material Sub-Panel */}
            {showQuickCreateRaw && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-3 animate-fade-in">
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Registrar Nuevo Insumo o Materia Prima para cualquier producto:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Nombre del Insumo *</label>
                    <input
                      type="text"
                      placeholder="ej. Ácido Cítrico, Fragancia Limón, Envase 500ml"
                      value={quickRawName}
                      onChange={(e) => setQuickRawName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Categoría</label>
                    <input
                      type="text"
                      placeholder="Materia Prima, Aditivo, Empaque"
                      value={quickRawCategory}
                      onChange={(e) => setQuickRawCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Unidad de Medida</label>
                    <select
                      value={quickRawUom}
                      onChange={(e) => setQuickRawUom(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    >
                      <option value="g">g (Gramos)</option>
                      <option value="KG">KG (Kilogramos)</option>
                      <option value="L">L (Litros)</option>
                      <option value="ml">ml (Mililitros)</option>
                      <option value="UND">UND (Unidades)</option>
                    </select>
                  </div>
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                        Costo Unitario ($)
                      </label>
                      <span className="text-[9px] font-bold font-mono text-amber-600 dark:text-amber-400">
                        {quickRawUom === 'g' ? '$/kg' : '$/u'}
                      </span>
                    </div>
                    <DecimalInput
                      value={quickRawCost}
                      onChange={(_num, raw) => setQuickRawCost(raw)}
                      onFocus={() => setIsQuickRawCostFocused(true)}
                      onBlur={() => setIsQuickRawCostFocused(false)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                    <UnitCostFloatingTag
                      unitOfMeasure={quickRawUom}
                      unitCost={parseDecimal(quickRawCost)}
                      show={isQuickRawCostFocused}
                      position="top"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowQuickCreateRaw(false)}
                    className="px-3 py-1 rounded-lg text-slate-500 hover:text-slate-700 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickCreateRawMaterial}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                  >
                    + Guardar Insumo y Añadir a Receta
                  </button>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <Layers className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No hay insumos añadidos a esta receta
                </p>
                <p className="text-[11px] text-slate-400">
                  Haz clic en "Agregar Fila" o "+ Nuevo Insumo" para armar la formulación.
                </p>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  + Agregar Primer Insumo
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Banner de Validación de Unidades de Costo en Receta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      <strong>Control de Unidades:</strong> Para insumos en gramos (<code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded text-amber-900 dark:text-amber-100 font-bold">g</code>), ingresa el costo por KILO (<strong className="text-amber-800 dark:text-amber-300">$/kg</strong>). El software divide automáticamente entre 1.000.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 shrink-0">
                    Subtotal = (g ÷ 1.000) × $/kg
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-visible shadow-xs pb-10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Insumo / Materia Prima</th>
                        <th className="py-2.5 px-3 text-center w-36">Cant. x 1 Unidad</th>
                        <th className="py-2.5 px-3 text-center w-24">U. Medida</th>
                        <th className="py-2.5 px-3 text-right w-36">Costo Unit. ($/kg o $/u)</th>
                        <th className="py-2.5 px-3 text-right w-28">Subtotal</th>
                        <th className="py-2.5 px-2 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {items.map((item, idx) => {
                        const matProd = products.find(p => p.id === item.productId);
                        const qtyVal = parseDecimal(item.quantity);
                        const unitCost = item.customCost !== undefined ? parseDecimal(item.customCost) : (matProd ? matProd.cost : 0);
                        const isGrams = matProd?.unitOfMeasure === 'g' || matProd?.unitOfMeasure === 'gr';
                        const lineCost = isGrams ? (qtyVal / 1000) * unitCost : (qtyVal * unitCost);

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            {/* Raw material select */}
                            <td className="py-2 px-3">
                              <select
                                value={item.productId}
                                onChange={(e) => handleUpdateItem(idx, 'productId', e.target.value)}
                                className="w-full text-xs font-medium rounded-lg px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Seleccione insumo...</option>
                                {rawMaterials.map((rm) => (
                                  <option key={rm.id} value={rm.id}>
                                    {rm.name} ({rm.sku}) — {formatCOP(rm.cost)}
                                  </option>
                                ))}
                              </select>
                              {matProd && (
                                <span className="text-[10px] text-slate-400 block pt-0.5">
                                  Categoría: {matProd.category || 'Materia Prima'} · Tipo: {matProd.type === 'materia_prima' ? 'Insumo' : matProd.type}
                                </span>
                              )}
                            </td>

                            {/* Quantity per 1 unit (Editable) */}
                            <td className="py-2 px-3">
                              <DecimalInput
                                min={0.0001}
                                placeholder="1"
                                value={item.quantity}
                                onChange={(_num, raw) => handleUpdateItem(idx, 'quantity', raw)}
                                className="w-full text-center text-xs font-mono font-bold rounded-lg px-2 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                              />
                            </td>

                            {/* UOM */}
                            <td className="py-2 px-3 text-center font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {matProd?.unitOfMeasure || 'UND'}
                            </td>

                            {/* Unit cost (Editable!) */}
                            <td className="py-2 px-3 text-right relative">
                              <div className="relative inline-flex items-center w-full">
                                <DecimalInput
                                  min={0}
                                  value={item.customCost !== undefined ? item.customCost : unitCost}
                                  onChange={(_num, raw) => handleUpdateItem(idx, 'customCost', raw)}
                                  onFocus={() => setFocusedItemIdx(idx)}
                                  onBlur={() => setFocusedItemIdx(null)}
                                  className="w-full text-right text-xs font-mono rounded-lg px-2 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white pr-9 focus:ring-1 focus:ring-amber-500"
                                />
                                <span className={`absolute right-1.5 text-[8.5px] font-bold font-mono px-1 py-0.5 rounded pointer-events-none ${
                                  isGrams 
                                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/40' 
                                    : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300/40'
                                }`}>
                                  {isGrams ? '$/kg' : (matProd?.unitOfMeasure === 'L' ? '$/L' : '$/u')}
                                </span>
                              </div>

                              <UnitCostFloatingTag
                                unitOfMeasure={matProd?.unitOfMeasure || 'g'}
                                unitCost={unitCost}
                                quantity={qtyVal}
                                show={focusedItemIdx === idx}
                                position="top"
                              />
                            </td>

                          {/* Subtotal */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                            {formatCOP(lineCost)}
                          </td>

                          {/* Delete row */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer mx-auto"
                              title="Quitar este insumo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Footer with summary */}
                  <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t border-slate-200 dark:border-slate-800">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-[10px] text-slate-500">
                        Costo Directo Total de Insumos (Por 1 Unidad):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCOP(totalDirectCost)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

          {/* Section 3: Optional Quality Standards */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                3. Estándar de Control de Calidad en Planta (Opcional)
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={hasQualityStandard}
                  onChange={(e) => setHasQualityStandard(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                Activar parámetro de calidad para este producto
              </label>
            </div>

            {hasQualityStandard && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Parámetro</label>
                  <input
                    type="text"
                    placeholder="ej. pH, Viscosidad, Humedad, Adherencia"
                    value={standardParam}
                    onChange={(e) => setStandardParam(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Valor Objetivo</label>
                  <DecimalInput
                    value={standardTarget}
                    onChange={(_num, raw) => setStandardTarget(raw)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tolerancia (+/-)</label>
                  <DecimalInput
                    value={standardTolerance}
                    onChange={(_num, raw) => setStandardTolerance(raw)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Ficha Técnica / Receta</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default BOMModal;

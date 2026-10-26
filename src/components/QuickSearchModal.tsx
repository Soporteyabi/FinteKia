import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tercero, Product, Voucher, InventoryItem } from '../types';

export interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  terceros: Tercero[];
  products: Product[];
  vouchers: Voucher[];
  inventory: InventoryItem[];
  onNavigateToView: (view: string, extra?: any) => void;
  theme?: string;
}

type SearchCategory = 'all' | 'terceros' | 'productos' | 'documentos' | 'modulos';

interface SearchItem {
  id: string;
  category: 'tercero' | 'producto' | 'documento' | 'modulo';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  details?: string;
  meta?: string;
  icon: string;
  action: () => void;
}

export default function QuickSearchModal({
  isOpen,
  onClose,
  terceros,
  products,
  vouchers,
  inventory,
  onNavigateToView,
  theme = 'navy_dark'
}: QuickSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light_gray';

  // Format currency in COP
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Stock lookup map by productId
  const stockMap = useMemo(() => {
    const map: Record<string, number> = {};
    inventory.forEach((inv) => {
      map[inv.productId] = (map[inv.productId] || 0) + (inv.quantity || 0);
    });
    return map;
  }, [inventory]);

  // Tercero lookup map by id or nit
  const terceroMap = useMemo(() => {
    const map: Record<string, string> = {};
    terceros.forEach((t) => {
      map[t.id] = t.name;
      map[t.nit] = t.name;
    });
    return map;
  }, [terceros]);

  // System Modules Registry
  const systemModules = useMemo(() => [
    { id: 'dashboard', name: 'Panel Principal / Dashboard', icon: 'ri-dashboard-3-line', section: 'General', keywords: 'inicio metricas kpis resumen' },
    { id: 'facturacion', name: 'Facturación Electrónica DIAN', icon: 'ri-file-text-line', section: 'Ventas', keywords: 'facturas fe clientes dian venta emitir' },
    { id: 'pos', name: 'Punto de Venta (POS)', icon: 'ri-shopping-cart-2-line', section: 'Ventas', keywords: 'pos caja ticket venta rapida codigo de barras' },
    { id: 'compras', name: 'Facturas de Compra & Gastos', icon: 'ri-shopping-bag-3-line', section: 'Compras', keywords: 'proveedores compras egresos facturas compras gastos' },
    { id: 'productos', name: 'Catálogo de Productos e Insumos', icon: 'ri-archive-2-line', section: 'Inventario', keywords: 'productos sku precios insumos catalogo items' },
    { id: 'inventario', name: 'Inventario & Bodegas', icon: 'ri-box-3-line', section: 'Inventario', keywords: 'stock almacenes bodegas kardex movimientos' },
    { id: 'bodegas', name: 'Bodegas & Plantas Operativas', icon: 'ri-building-line', section: 'Inventario', keywords: 'bodegas almacenes ubicaciones sucursales' },
    { id: 'terceros', name: 'Directorio de Terceros (Clientes / Prov.)', icon: 'ri-contacts-book-2-line', section: 'Terceros', keywords: 'clientes proveedores empleados nit rut dv personas' },
    { id: 'cartera', name: 'Cartera & Cobranzas (CxC / CxP)', icon: 'ri-hand-coin-line', section: 'Finanzas', keywords: 'cxc cxp cuentas por cobrar pagar vencimientos' },
    { id: 'comprobantes', name: 'Libro Diario & Asientos PUC', icon: 'ri-booklet-line', section: 'Contabilidad', keywords: 'contabilidad puc asientos debito credito balance' },
    { id: 'bancos', name: 'Cuentas Bancarias & Conciliación', icon: 'ri-bank-card-line', section: 'Tesorería', keywords: 'bancos cuentas bancolombia caja conciliacion' },
    { id: 'impuestos', name: 'Impuestos & Retenciones DIAN', icon: 'ri-scales-3-line', section: 'Tributario', keywords: 'iva retefuente reteica reteiva impuestos dian declaracion' },
    { id: 'nomina', name: 'Nómina Electrónica & Colaboradores', icon: 'ri-user-heart-line', section: 'Nómina', keywords: 'nomina smmlv empleados sueldos salarios horas extras' },
    { id: 'servicios_tech', name: 'Servicios Técnicos & Órdenes OT', icon: 'ri-macbook-line', section: 'Tecnología', keywords: 'servicio tecnico reparaciones ordenes ot garantia' },
    { id: 'ordenes_prod', name: 'Producción & Recetas BOM (MRP)', icon: 'ri-settings-4-line', section: 'Producción', keywords: 'produccion mrp fabricacion recetas bom ordenes' },
    { id: 'database', name: 'Base de Datos PostgreSQL (Cloud SQL)', icon: 'ri-database-2-line', section: 'Sistema', keywords: 'sql postgres database tablas sync nube' },
    { id: 'alanube_config', name: 'Configuración API DIAN (Alanube)', icon: 'ri-cloud-line', section: 'Sistema', keywords: 'alanube dian api token certificado resolucion' },
    { id: 'empresa', name: 'Configuración de la Empresa', icon: 'ri-building-4-line', section: 'Sistema', keywords: 'empresa nit logo razon social datos organizacion' }
  ], []);

  // Normalize string for accents & case-insensitive matching
  const normalize = (str: string) => {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Compile search results
  const searchResults = useMemo(() => {
    const q = normalize(query.trim());
    const items: SearchItem[] = [];

    // 1. Modulos matching
    if (selectedCategory === 'all' || selectedCategory === 'modulos') {
      systemModules.forEach((mod) => {
        const matches = !q || 
          normalize(mod.name).includes(q) || 
          normalize(mod.section).includes(q) || 
          normalize(mod.keywords).includes(q);

        if (matches) {
          items.push({
            id: `mod-${mod.id}`,
            category: 'modulo',
            title: mod.name,
            subtitle: `Módulo del Sistema • ${mod.section}`,
            badge: 'Módulo',
            badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
            icon: mod.icon,
            action: () => {
              onNavigateToView(mod.id);
              onClose();
            }
          });
        }
      });
    }

    // 2. Terceros matching (Clientes, Proveedores, Empleados)
    if (selectedCategory === 'all' || selectedCategory === 'terceros') {
      terceros.forEach((t) => {
        const matches = !q ||
          normalize(t.name).includes(q) ||
          normalize(t.nit).includes(q) ||
          normalize(t.city).includes(q) ||
          (t.email && normalize(t.email).includes(q)) ||
          (t.phone && normalize(t.phone).includes(q)) ||
          t.roles.some((r) => normalize(r).includes(q));

        if (matches) {
          const roleBadge = t.roles.includes('cliente')
            ? 'Cliente'
            : t.roles.includes('proveedor')
            ? 'Proveedor'
            : 'Empleado';
          
          const roleColor = t.roles.includes('cliente')
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            : t.roles.includes('proveedor')
            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
            : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

          items.push({
            id: `ter-${t.id}`,
            category: 'tercero',
            title: t.name,
            subtitle: `NIT: ${t.nit}${t.dv ? `-${t.dv}` : ''} • ${t.city || 'Colombia'}${t.phone ? ` • Tel: ${t.phone}` : ''}`,
            badge: roleBadge,
            badgeColor: roleColor,
            meta: t.email || undefined,
            details: t.address || undefined,
            icon: 'ri-user-smile-line',
            action: () => {
              onNavigateToView('terceros');
              onClose();
            }
          });
        }
      });
    }

    // 3. Productos matching
    if (selectedCategory === 'all' || selectedCategory === 'productos') {
      products.forEach((p) => {
        const matches = !q ||
          normalize(p.name).includes(q) ||
          normalize(p.sku).includes(q) ||
          (p.barcode && normalize(p.barcode).includes(q)) ||
          (p.category && normalize(p.category).includes(q)) ||
          (p.brand && normalize(p.brand).includes(q)) ||
          (p.model && normalize(p.model).includes(q));

        if (matches) {
          const stock = stockMap[p.id] || 0;
          items.push({
            id: `prod-${p.id}`,
            category: 'producto',
            title: p.name,
            subtitle: `SKU: ${p.sku}${p.barcode ? ` • Barra: ${p.barcode}` : ''}${p.category ? ` • ${p.category}` : ''}`,
            badge: formatCOP(p.price),
            badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            details: `Disponible: ${stock} und. | IVA: ${p.tax}%`,
            icon: 'ri-box-3-line',
            action: () => {
              onNavigateToView('productos');
              onClose();
            }
          });
        }
      });
    }

    // 4. Documentos / Vouchers matching
    if (selectedCategory === 'all' || selectedCategory === 'documentos') {
      vouchers.forEach((v) => {
        const clientName = terceroMap[v.thirdPartyId] || v.thirdPartyId;
        const totalAmount = v.lines?.reduce((sum, l) => sum + (l.debit || 0), 0) || 0;

        const matches = !q ||
          normalize(v.number).includes(q) ||
          normalize(v.concept || '').includes(q) ||
          normalize(clientName).includes(q) ||
          normalize(v.thirdPartyId).includes(q) ||
          normalize(v.date).includes(q) ||
          normalize(v.type).includes(q);

        if (matches) {
          const typeLabel = 
            v.type === 'venta' ? 'Factura Venta' :
            v.type === 'compra' ? 'Factura Compra' :
            v.type === 'egreso' ? 'Comprobante Egreso' :
            v.type === 'ingreso' ? 'Recibo Caja' :
            v.type === 'ajuste' ? 'Nota Ajuste' : 'Comprobante Diario';

          const badgeColor =
            v.type === 'venta' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
            v.type === 'compra' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
            v.type === 'egreso' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
            'bg-slate-500/15 text-slate-300 border-slate-500/30';

          items.push({
            id: `vouch-${v.id}`,
            category: 'documento',
            title: `${v.number} - ${typeLabel}`,
            subtitle: `${clientName} • ${v.date} • ${v.concept || 'Sin concepto'}`,
            badge: formatCOP(totalAmount),
            badgeColor,
            details: `Estado: ${v.status?.toUpperCase() || 'APROBADO'}`,
            icon: 'ri-file-list-3-line',
            action: () => {
              if (v.type === 'venta') {
                onNavigateToView('facturacion');
              } else if (v.type === 'compra') {
                onNavigateToView('compras');
              } else {
                onNavigateToView('comprobantes');
              }
              onClose();
            }
          });
        }
      });
    }

    // Limit to top 50 items for speed
    return items.slice(0, 50);
  }, [query, selectedCategory, systemModules, terceros, products, vouchers, stockMap, terceroMap, onNavigateToView, onClose]);

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Clamp selection on list changes
  useEffect(() => {
    if (selectedIndex >= searchResults.length) {
      setSelectedIndex(Math.max(0, searchResults.length - 1));
    }
  }, [searchResults.length, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const activeItem = listEl.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < searchResults.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        searchResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const categories: SearchCategory[] = ['all', 'terceros', 'productos', 'documentos', 'modulos'];
      const currentIndex = categories.indexOf(selectedCategory);
      const nextIndex = e.shiftKey
        ? (currentIndex - 1 + categories.length) % categories.length
        : (currentIndex + 1) % categories.length;
      setSelectedCategory(categories[nextIndex]);
      setSelectedIndex(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-12 sm:pt-20 px-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border transition-all duration-200 animate-scale-in max-h-[85vh] ${
          isLight
            ? 'bg-white border-slate-300 text-slate-900 shadow-slate-300/50'
            : 'bg-slate-900 border-slate-700/80 text-white shadow-black/70'
        }`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className={`p-4 border-b flex items-center gap-3 relative shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800'
        }`}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-blue-500 bg-blue-500/10 border border-blue-500/20 shrink-0">
            <i className="ri-search-2-line text-lg"></i>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Buscar clientes por NIT, productos por SKU, facturas, documentos..."
            className={`flex-1 text-sm bg-transparent outline-none font-medium placeholder-slate-400 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          />

          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              title="Borrar búsqueda"
            >
              <i className="ri-close-circle-fill text-lg"></i>
            </button>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              ESC
            </kbd>
          </div>
        </div>

        {/* Filter Category Chips */}
        <div className={`px-4 py-2 border-b flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/50 border-slate-800/80'
        }`}>
          {[
            { id: 'all', label: 'Todos', icon: 'ri-apps-2-line' },
            { id: 'terceros', label: 'Clientes / Terceros', icon: 'ri-contacts-book-2-line', count: terceros.length },
            { id: 'productos', label: 'Productos / Catálogo', icon: 'ri-box-3-line', count: products.length },
            { id: 'documentos', label: 'Documentos / Facturas', icon: 'ri-file-list-3-line', count: vouchers.length },
            { id: 'modulos', label: 'Módulos', icon: 'ri-compass-3-line', count: systemModules.length },
          ].map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id as SearchCategory);
                  setSelectedIndex(0);
                  inputRef.current?.focus();
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : isLight
                    ? 'bg-white text-slate-700 hover:bg-slate-200/80 border-slate-200'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border-slate-700/60'
                }`}
              >
                <i className={`${cat.icon} text-xs`}></i>
                <span>{cat.label}</span>
                {cat.count !== undefined && (
                  <span className={`text-[10px] font-mono opacity-75`}>({cat.count})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/30 min-h-[220px]"
        >
          {searchResults.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mb-3">
                <i className="ri-search-eye-line"></i>
              </div>
              <p className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                {query ? `Sin resultados para "${query}"` : 'Comienza a escribir para buscar'}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Puedes buscar clientes por nombre o NIT, productos por SKU o código de barra, facturas electrónicas por número (ej. FE-101) o cualquier módulo del sistema.
              </p>
            </div>
          ) : (
            searchResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-index={index}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 border ${
                    isSelected
                      ? isLight
                        ? 'bg-blue-50 border-blue-400 text-slate-900 shadow-xs'
                        : 'bg-blue-600/20 border-blue-500/40 text-white shadow-sm'
                      : isLight
                      ? 'bg-transparent border-transparent hover:bg-slate-100 text-slate-800'
                      : 'bg-transparent border-transparent hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      item.category === 'tercero'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : item.category === 'producto'
                        ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                        : item.category === 'documento'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                    }`}>
                      <i className={`${item.icon} text-base`}></i>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-xs truncate ${
                          isSelected ? (isLight ? 'text-blue-900 font-extrabold' : 'text-white font-extrabold') : (isLight ? 'text-slate-900' : 'text-slate-100')
                        }`}>
                          {item.title}
                        </span>

                        {item.badge && (
                          <span className={`text-[9.5px] font-mono px-2 py-0.2 rounded-full border font-bold shrink-0 ${item.badgeColor || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>

                      <p className={`text-[11px] truncate mt-0.5 ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}>
                        {item.subtitle}
                      </p>

                      {item.details && (
                        <p className={`text-[10px] font-mono mt-0.5 ${
                          isLight ? 'text-slate-500' : 'text-slate-500'
                        }`}>
                          {item.details}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Action Hint */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.meta && (
                      <span className={`text-[10px] font-mono hidden sm:inline ${
                        isLight ? 'text-slate-500' : 'text-slate-500'
                      }`}>
                        {item.meta}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-lg border flex items-center gap-1 font-bold ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500'
                        : isLight
                        ? 'bg-slate-200/60 text-slate-600 border-slate-300'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <i className="ri-arrow-right-line text-xs"></i>
                      <span className="hidden sm:inline">Abrir</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Keyboard Hints */}
        <div className={`p-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 ${
          isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>↑↓</kbd> Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>↵</kbd> Seleccionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>Tab</kbd> Filtrar tipo
            </span>
          </div>

          <div className="text-[11px] font-mono flex items-center gap-1 text-slate-400">
            <span>{searchResults.length} resultados</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { Product, Tercero, TechServiceOrder, Company } from '../types';
import { THEMES_MAP } from './Sidebar';
import Pagination from './Pagination';
import { 
  Laptop, 
  Wrench, 
  ShieldCheck, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowUpRight, 
  FileText, 
  Cpu, 
  Smartphone, 
  Wifi, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Tag,
  Hash,
  Boxes,
  Factory
} from 'lucide-react';

interface TechServicesViewProps {
  products: Product[];
  terceros: Tercero[];
  techServiceOrders?: TechServiceOrder[];
  onAddServiceOrder?: (order: Omit<TechServiceOrder, 'id'>) => void;
  onUpdateServiceOrderStatus?: (id: string, status: TechServiceOrder['status']) => void;
  onAddProduct?: (p: Omit<Product, 'id'>) => void;
  setActiveView: (view: string) => void;
  currentCompany: Company;
  onUpdateCompany: (co: Company) => void;
  theme?: string;
  formatCOP: (val: number) => string;
}

export default function TechServicesView({
  products,
  terceros,
  techServiceOrders: initialOrders = [],
  onAddServiceOrder,
  onUpdateServiceOrderStatus,
  onAddProduct,
  setActiveView,
  currentCompany,
  onUpdateCompany,
  theme = 'navy_dark',
  formatCOP
}: TechServicesViewProps) {
  const activeTheme = THEMES_MAP[theme as keyof typeof THEMES_MAP] || THEMES_MAP.navy_dark;

  // Internal local state fallback for orders
  const [localOrders, setLocalOrders] = useState<TechServiceOrder[]>(() => {
    if (initialOrders && initialOrders.length > 0) return initialOrders;
    return [
      {
        id: 'ot-1',
        code: 'OT-101',
        clientId: 'ter-2',
        clientName: 'Supermercados Éxito S.A.',
        device: 'Laptop Lenovo ThinkPad T14 Gen 3 (Core i7 / 16GB)',
        serial: 'PF-28XYZ90',
        reportedIssue: 'Recalentamiento severo y apagados intermitentes. Solicita mantenimiento preventivo y ampliación a SSD 1TB.',
        diagnosis: 'Pasta térmica degradada y ventilador bloqueado con polvo. Requiere cambio de pasta térmica e instalación de SSD NVMe.',
        status: 'en_proceso',
        priority: 'alta',
        estimatedCost: 280000,
        createdAt: '2026-10-02',
        deliveryDate: '2026-10-08',
        technician: 'Washington Quiñones',
        notes: 'Cliente requiere copia de seguridad previa de documentos.'
      },
      {
        id: 'ot-2',
        code: 'OT-102',
        clientId: 'ter-4',
        clientName: 'Distribuidora Granel Co',
        device: 'Servidor Torre Dell PowerEdge T150 Xeon 32GB RAM',
        serial: 'SVC-TAG-88J20',
        reportedIssue: 'Configuración de arreglo RAID 1, servidor VPN corporativo y sistema de copias de seguridad en nube.',
        diagnosis: 'Configuración de controlador PERC, aprovisionamiento de 2 discos SAS de 4TB en espejo y parametrización de OpenVPN.',
        status: 'completado',
        priority: 'urgente',
        estimatedCost: 650000,
        createdAt: '2026-09-28',
        deliveryDate: '2026-10-05',
        technician: 'Washington Quiñones',
        notes: 'Servicio entregado a entera satisfacción y firmado.'
      },
      {
        id: 'ot-3',
        code: 'OT-103',
        clientId: 'ter-1',
        clientName: 'Harineras del Valle S.A.',
        device: 'Infraestructura de Red Wi-Fi 6 (3 Access Points UniFi U6 Pro)',
        serial: 'NET-U6-0922',
        reportedIssue: 'Baja cobertura y caídas de señal en áreas de bodega y despachos. Requiere certificación y balanceo.',
        diagnosis: 'Interferencia electromagnética en 2.4GHz y cableado defectuoso. Se cotiza recableado a Cat6A y segmentación de VLAN.',
        status: 'en_diagnostico',
        priority: 'media',
        estimatedCost: 450000,
        createdAt: '2026-10-04',
        technician: 'Andrés Felipe Gómez',
        notes: 'Esperando confirmación de presupuesto.'
      }
    ];
  });

  // Current active subtab
  const [activeTab, setActiveTab] = useState<'ordenes' | 'catalogo' | 'garantias'>('ordenes');

  // Search & Status filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TechServiceOrder['status']>('all');

  // New OT Modal state
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newSelectedClientId, setNewSelectedClientId] = useState('');
  const [newDevice, setNewDevice] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newReportedIssue, setNewReportedIssue] = useState('');
  const [newPriority, setNewPriority] = useState<TechServiceOrder['priority']>('media');
  const [newEstimatedCost, setNewEstimatedCost] = useState(150000);
  const [newTechnician, setNewTechnician] = useState('Washington Quiñones');

  // New Tech Product / Service Modal
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdType, setNewProdType] = useState<'servicio' | 'tecnologia'>('tecnologia');
  const [newProdPrice, setNewProdPrice] = useState(250000);
  const [newProdCost, setNewProdCost] = useState(180000);
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdWarranty, setNewProdWarranty] = useState(12);

  // Pagination states (15 per page)
  const [ordersPage, setOrdersPage] = useState(1);
  const ORDERS_PER_PAGE = 15;
  const [techProdPage, setTechProdPage] = useState(1);
  const PRODS_PER_PAGE = 15;

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return localOrders.filter(order => {
      const matchSearch = 
        order.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.device.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.serial && order.serial.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [localOrders, searchQuery, statusFilter]);

  // Paginated orders (15 per page)
  const totalOrdersPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const safeOrdersPage = Math.min(ordersPage, totalOrdersPages);
  const paginatedOrders = filteredOrders.slice(
    (safeOrdersPage - 1) * ORDERS_PER_PAGE,
    safeOrdersPage * ORDERS_PER_PAGE
  );

  // Tech products & services in inventory
  const techProducts = useMemo(() => {
    return products.filter(p => p.type === 'tecnologia' || p.type === 'servicio');
  }, [products]);

  // Paginated tech products (15 per page)
  const totalTechProdPages = Math.max(1, Math.ceil(techProducts.length / PRODS_PER_PAGE));
  const safeTechProdPage = Math.min(techProdPage, totalTechProdPages);
  const paginatedTechProducts = techProducts.slice(
    (safeTechProdPage - 1) * PRODS_PER_PAGE,
    safeTechProdPage * PRODS_PER_PAGE
  );

  // Clients list
  const clientsList = useMemo(() => {
    return terceros.filter(t => t.roles.includes('cliente'));
  }, [terceros]);

  // Create Service Order handler
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clientsList.find(c => c.id === newSelectedClientId);
    const clientFinalName = client ? client.name : (newClientName.trim() || 'Cliente Mostrador');
    const nextCode = `OT-${100 + localOrders.length + 1}`;

    const newOrder: TechServiceOrder = {
      id: `ot-${Date.now()}`,
      code: nextCode,
      clientId: newSelectedClientId || 'ter-new',
      clientName: clientFinalName,
      device: newDevice.trim(),
      serial: newSerial.trim() || undefined,
      reportedIssue: newReportedIssue.trim(),
      diagnosis: 'En espera de revisión técnica.',
      status: 'recibido',
      priority: newPriority,
      estimatedCost: Number(newEstimatedCost) || 0,
      createdAt: new Date().toISOString().substring(0, 10),
      technician: newTechnician,
      notes: ''
    };

    setLocalOrders(prev => [newOrder, ...prev]);
    if (onAddServiceOrder) {
      onAddServiceOrder(newOrder);
    }

    // Reset and close
    setShowNewOrderModal(false);
    setNewDevice('');
    setNewSerial('');
    setNewReportedIssue('');
    setNewEstimatedCost(150000);
  };

  // Update status handler
  const handleUpdateStatus = (id: string, nextStatus: TechServiceOrder['status']) => {
    setLocalOrders(prev => prev.map(o => o.id === id ? { ...o, status: nextStatus } : o));
    if (onUpdateServiceOrderStatus) {
      onUpdateServiceOrderStatus(id, nextStatus);
    }
  };

  // Add product handler
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdSku.trim()) return;

    const newP: Omit<Product, 'id'> = {
      name: newProdName.trim(),
      sku: newProdSku.trim().toUpperCase(),
      price: Number(newProdPrice) || 0,
      cost: newProdType === 'servicio' ? 0 : (Number(newProdCost) || 0),
      tax: 19,
      type: newProdType,
      lotTracking: false,
      brand: newProdBrand.trim() || undefined,
      warrantyMonths: Number(newProdWarranty) || 12
    };

    if (onAddProduct) {
      onAddProduct(newP);
    }
    setShowNewProductModal(false);
    setNewProdName('');
    setNewProdSku('');
    setNewProdBrand('');
  };

  // Toggle production module state
  const isProductionActive = currentCompany.enableProduction !== false;

  const handleToggleProduction = () => {
    const next = !isProductionActive;
    onUpdateCompany({
      ...currentCompany,
      enableProduction: next
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full select-none">
      
      {/* ======================================================== */}
      {/* TOP HEADER & MODULE ACTIVATION CONTROLLER BANNER         */}
      {/* ======================================================== */}
      <div 
        className="rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-xl"
        style={{
          background: 'linear-gradient(135deg, #071936 0%, #0d284f 50%, #0a1b38 100%)',
          border: '1.5px solid rgba(226, 232, 240, 0.4)',
          boxShadow: 'inset 0 1.5px 2px rgba(255, 255, 255, 0.3), 0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 25px rgba(56, 189, 248, 0.2)'
        }}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-400/40 uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Laptop className="w-3 h-3 text-sky-300" />
                <span>Emprendimiento en Tecnología & Servicios</span>
              </span>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1.5 ${
                isProductionActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
              }`}>
                <Factory className="w-3 h-3" />
                <span>Módulo Producción: {isProductionActive ? 'Activado (MRP)' : 'Desactivado (Enfoque Servicios/Tech)'}</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Gestión de Servicios TI & Venta de Tecnología</span>
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-normal">
              Control integral de soporte técnico, órdenes de servicio (OT), garantías de equipos, licencias y facturación electrónica delegada vía Proveedor Tecnológico adaptada a tu emprendimiento.
            </p>
          </div>

          {/* Right Action: Production Toggle Switch Card */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center justify-between gap-4">
              <div className="text-left">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-300 block">
                  Producción / Fabricación
                </span>
                <span className="text-xs font-semibold text-white">
                  {isProductionActive ? 'Habilitada para esta empresa' : 'Desactivada (Solo Servicios)'}
                </span>
              </div>

              <button
                onClick={handleToggleProduction}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                  isProductionActive
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
                title="Activar o desactivar el módulo de producción industrial (MRP/BOM) para esta empresa"
              >
                <Factory className="w-3.5 h-3.5" />
                <span>{isProductionActive ? 'Desactivar MRP' : 'Activar MRP'}</span>
              </button>
            </div>

            <button
              onClick={() => setShowNewOrderModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-white hover:to-sky-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Nueva Orden de Servicio (OT)</span>
            </button>
          </div>
        </div>

        {/* Ambient subtle glow background */}
        <div className="absolute -top-12 -right-12 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ======================================================== */}
      {/* KPI METRIC CARDS FOR TECH ENTREPRENEURSHIP               */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-mono font-bold text-sky-400 uppercase tracking-wider">
              Órdenes de Servicio
            </span>
            <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs">
              <Wrench className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">
            {localOrders.length} OT
          </p>
          <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>{localOrders.filter(o => o.status === 'en_proceso' || o.status === 'recibido').length} activas en taller</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
              Servicios Completados
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
            {localOrders.filter(o => o.status === 'completado' || o.status === 'entregado').length}
          </p>
          <p className="text-[11px] text-slate-300 mt-1 font-medium">
            Listos para entrega y facturación
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
              Catálogo Tecnológico
            </span>
            <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">
              <Boxes className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">
            {techProducts.length} Ítems
          </p>
          <p className="text-[11px] text-slate-300 mt-1 font-medium">
            Hardware, repuestos y servicios
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              Valor en Servicios
            </span>
            <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-300 mt-2 font-mono">
            {formatCOP(localOrders.reduce((sum, o) => sum + o.estimatedCost, 0))}
          </p>
          <p className="text-[11px] text-slate-300 mt-1 font-medium">
            Presupuesto total en órdenes
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUBTABS CONTROLLER: OT / CATÁLOGO TECH / GARANTÍAS       */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ordenes')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'ordenes'
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-sky-400/40'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Órdenes de Servicio Técnico (OT)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
              {localOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('catalogo')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'catalogo'
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-sky-400/40'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Productos & Servicios Tech</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
              {techProducts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('garantias')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'garantias'
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-sky-400/40'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Garantías & Seriales</span>
          </button>
        </div>

        {/* Action Button for Current Tab */}
        <div>
          {activeTab === 'catalogo' && (
            <button
              onClick={() => setShowNewProductModal(true)}
              className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Ítem Tecnológico</span>
            </button>
          )}

          {activeTab === 'ordenes' && (
            <button
              onClick={() => setActiveView('facturacion')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Ir a Facturación Electrónica vía Proveedor Tecnológico (Tercero)"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Facturación (Tercero)</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ÓRDENES DE SERVICIO TÉCNICO (OT)                  */}
      {/* ======================================================== */}
      {activeTab === 'ordenes' && (
        <div className="space-y-4">
          {/* Search & Status Pills Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código OT, cliente, equipo o número de serie..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setOrdersPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            {/* Status pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'recibido', 'en_diagnostico', 'en_proceso', 'completado', 'entregado'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setOrdersPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer capitalize ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {status === 'all' ? 'Todos los Estados' : status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Service Orders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedOrders.map(order => {
              const statusStyles = {
                recibido: { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/40', label: 'Recibido' },
                en_diagnostico: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40', label: 'En Diagnóstico' },
                en_proceso: { bg: 'bg-sky-500/20', text: 'text-sky-300', border: 'border-sky-500/40', label: 'En Proceso / Taller' },
                completado: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', label: 'Completado' },
                entregado: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40', label: 'Entregado' }
              }[order.status] || { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/40', label: order.status };

              const priorityBadge = {
                urgente: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                alta: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                media: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                baja: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
              }[order.priority];

              return (
                <div 
                  key={order.id}
                  className="rounded-2xl p-4.5 bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                          {order.code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${priorityBadge}`}>
                          {order.priority}
                        </span>
                      </div>
                      
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}>
                        {statusStyles.label}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-white line-clamp-1">
                        {order.device}
                      </h4>
                      <p className="text-xs text-cyan-300 font-medium line-clamp-1 mt-0.5">
                        {order.clientName}
                      </p>
                    </div>

                    {order.serial && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                        <Tag className="w-3 h-3 text-slate-500" />
                        <span>S/N: <strong className="text-slate-200">{order.serial}</strong></span>
                      </div>
                    )}

                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1">
                      <p className="text-slate-300 text-[11.5px] line-clamp-2">
                        <strong className="text-slate-400">Falla:</strong> {order.reportedIssue}
                      </p>
                      {order.diagnosis && (
                        <p className="text-sky-300/90 text-[11px] line-clamp-2 border-t border-slate-800/60 pt-1">
                          <strong className="text-slate-400">Diagnóstico:</strong> {order.diagnosis}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Presupuesto Estimado:</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {formatCOP(order.estimatedCost)}
                      </span>
                    </div>

                    {/* Status Step advancement buttons */}
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value as any)}
                        className="text-[10.5px] font-semibold bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 cursor-pointer flex-1"
                        aria-label="Actualizar estado de orden"
                      >
                        <option value="recibido">1. Recibido</option>
                        <option value="en_diagnostico">2. En Diagnóstico</option>
                        <option value="en_proceso">3. En Taller / Proceso</option>
                        <option value="completado">4. Completado</option>
                        <option value="entregado">5. Entregado</option>
                      </select>

                      <button
                        onClick={() => setActiveView('facturacion')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10.5px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        title="Facturar este servicio mediante Facturación Electrónica vía Proveedor Tecnológico (Tercero)"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Facturar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredOrders.length > 0 && (
            <Pagination
              currentPage={safeOrdersPage}
              totalItems={filteredOrders.length}
              pageSize={ORDERS_PER_PAGE}
              onPageChange={(page) => setOrdersPage(page)}
              isDark={true}
              itemLabel="órdenes de servicio técnico"
            />
          )}

          {filteredOrders.length === 0 && (
            <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 space-y-3">
              <Wrench className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No se encontraron órdenes de servicio técnico con ese criterio.</p>
              <button
                onClick={() => setShowNewOrderModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear la primera orden de servicio</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CATÁLOGO DE HARDWARE, EQUIPOS & SERVICIOS         */}
      {/* ======================================================== */}
      {activeTab === 'catalogo' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-sky-400" />
                  <span>Catálogo de Productos Tecnológicos y Servicios Profesionales</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Artículos configurados para facturación DIAN, venta al público o prestación de servicios de soporte.
                </p>
              </div>

              <button
                onClick={() => setShowNewProductModal(true)}
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Producto o Servicio</span>
              </button>
            </div>

            {/* Tech Products Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="py-2 px-3">Código / SKU</th>
                    <th className="py-2 px-3">Nombre del Producto o Servicio</th>
                    <th className="py-2 px-3">Tipo</th>
                    <th className="py-2 px-3">Garantía</th>
                    <th className="py-2 px-3 text-right">Costo Estimado</th>
                    <th className="py-2 px-3 text-right">Precio Venta (COP)</th>
                    <th className="py-2 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {paginatedTechProducts.map(prod => (
                    <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                        {prod.sku}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-200 block">{prod.name}</span>
                        {prod.brand && (
                          <span className="text-[10.5px] text-slate-400 font-mono">Marca: {prod.brand}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {prod.type === 'servicio' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Servicio Profesional
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Hardware / Producto
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                        {prod.warrantyMonths ? `${prod.warrantyMonths} Meses` : 'No aplica'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {prod.cost > 0 ? formatCOP(prod.cost) : 'N/A (Mano de obra)'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {formatCOP(prod.price)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setActiveView('facturacion')}
                          className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600 text-sky-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Facturar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {techProducts.length > 0 && (
              <Pagination
                currentPage={safeTechProdPage}
                totalItems={techProducts.length}
                pageSize={PRODS_PER_PAGE}
                onPageChange={(page) => setTechProdPage(page)}
                isDark={true}
                itemLabel="productos y servicios"
              />
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: GARANTÍAS & SERIALES                              */}
      {/* ======================================================== */}
      {activeTab === 'garantias' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Control de Garantías, Seriales y Soporte Postventa</span>
            </h3>
            <p className="text-xs text-slate-400">
              Registra los números de serie entregados a clientes para validar vigencia de garantía y hoja de vida de soporte.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-sky-400 font-bold">
                  <span>Laptop ThinkPad T14</span>
                  <span className="font-mono text-[10px]">PF-28XYZ90</span>
                </div>
                <p className="text-xs text-slate-300">Cliente: Supermercados Éxito S.A.</p>
                <div className="flex items-center justify-between text-[11px] text-emerald-400 pt-1 border-t border-slate-800">
                  <span>Garantía Vigente: 12 Meses</span>
                  <span className="font-mono">Vence: Oct 2027</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-sky-400 font-bold">
                  <span>Servidor Dell PowerEdge</span>
                  <span className="font-mono text-[10px]">SVC-TAG-88J20</span>
                </div>
                <p className="text-xs text-slate-300">Cliente: Distribuidora Granel Co</p>
                <div className="flex items-center justify-between text-[11px] text-emerald-400 pt-1 border-t border-slate-800">
                  <span>Garantía Vigente: 36 Meses</span>
                  <span className="font-mono">Vence: Oct 2029</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-sky-400 font-bold">
                  <span>Router Mikrotik hEX S</span>
                  <span className="font-mono text-[10px]">MK-9002-BOG</span>
                </div>
                <p className="text-xs text-slate-300">Cliente: Harineras del Valle</p>
                <div className="flex items-center justify-between text-[11px] text-emerald-400 pt-1 border-t border-slate-800">
                  <span>Garantía Vigente: 12 Meses</span>
                  <span className="font-mono">Vence: Sep 2027</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NUEVA ORDEN DE SERVICIO (OT)                      */}
      {/* ======================================================== */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-sm">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-white">Nueva Orden de Servicio Técnico (OT)</h3>
              </div>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cliente</label>
                <select
                  value={newSelectedClientId}
                  onChange={(e) => setNewSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:border-sky-400 outline-none"
                >
                  <option value="">-- Seleccionar de clientes registrados o ingresar nuevo --</option>
                  {clientsList.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.nit})</option>
                  ))}
                </select>
                {!newSelectedClientId && (
                  <input
                    type="text"
                    placeholder="O escribe el nombre del cliente / empresa..."
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full px-3 py-2 mt-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Dispositivo / Equipo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Laptop HP Pavilion 15"
                    value={newDevice}
                    onChange={(e) => setNewDevice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Número de Serie (S/N)</label>
                  <input
                    type="text"
                    placeholder="Ej. 5CD1234XYZ"
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Problema Reportado / Servicio Solicitado *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Detalla la falla técnica o el requerimiento del cliente..."
                  value={newReportedIssue}
                  onChange={(e) => setNewReportedIssue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Prioridad</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:border-sky-400 outline-none"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Técnico Asignado</label>
                  <input
                    type="text"
                    value={newTechnician}
                    onChange={(e) => setNewTechnician(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-sky-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Costo Estimado (COP)</label>
                  <input
                    type="number"
                    value={newEstimatedCost}
                    onChange={(e) => setNewEstimatedCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-sky-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-white hover:to-sky-400 text-slate-950 font-black transition-all cursor-pointer"
                >
                  Registrar Orden OT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NUEVO PRODUCTO O SERVICIO TECNOLÓGICO             */}
      {/* ======================================================== */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm">
                  <Laptop className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-white">Agregar Producto o Servicio Tecnológico</h3>
              </div>
              <button
                onClick={() => setShowNewProductModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Ítem *</label>
                  <select
                    value={newProdType}
                    onChange={(e) => setNewProdType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:border-sky-400 outline-none"
                  >
                    <option value="tecnologia">Hardware / Equipo Tecnológico</option>
                    <option value="servicio">Servicio Profesional / Soporte TI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Código / SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. TECH-ROU-05 o SRV-MANT"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre o Descripción *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Router Wi-Fi 6 Doble Banda o Mantenimiento Servidor"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Marca / Fabricante</label>
                  <input
                    type="text"
                    placeholder="Ej. Lenovo, Dell, MikroTik"
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Garantía (Meses)</label>
                  <input
                    type="number"
                    value={newProdWarranty}
                    onChange={(e) => setNewProdWarranty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-sky-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Costo de Adquisición (COP)</label>
                  <input
                    type="number"
                    disabled={newProdType === 'servicio'}
                    value={newProdType === 'servicio' ? 0 : newProdCost}
                    onChange={(e) => setNewProdCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-sky-400 outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Precio de Venta (COP) *</label>
                  <input
                    type="number"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-sky-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-white hover:to-cyan-400 text-slate-950 font-black transition-all cursor-pointer"
                >
                  Guardar en Catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

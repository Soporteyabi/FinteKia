import React, { useState, useMemo } from 'react';
import { Product, Tercero, TechServiceOrder, Company } from '../types';
import { THEMES_MAP } from './Sidebar';
import Pagination from './Pagination';
import TechServicePrintModal from './TechServicePrintModal';
import TechOrderDetailModal from './TechOrderDetailModal';
import { 
  WORKSHOP_STATUS_CONFIG, 
  buildWhatsAppServiceNotification, 
  getWhatsAppPhoneLink 
} from '../lib/techServiceUtils';
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
  Factory,
  Printer,
  LayoutGrid,
  Columns3,
  Table as TableIcon,
  ChevronLeft,
  Calendar,
  User,
  Shield,
  Layers
} from 'lucide-react';

interface TechServicesViewProps {
  products: Product[];
  terceros: Tercero[];
  techServiceOrders?: TechServiceOrder[];
  onAddServiceOrder?: (order: Omit<TechServiceOrder, 'id'>) => void;
  onUpdateServiceOrder?: (order: TechServiceOrder) => void;
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
  onUpdateServiceOrder,
  onUpdateServiceOrderStatus,
  onAddProduct,
  setActiveView,
  currentCompany,
  onUpdateCompany,
  theme = 'navy_dark',
  formatCOP
}: TechServicesViewProps) {
  const activeTheme = THEMES_MAP[theme as keyof typeof THEMES_MAP] || THEMES_MAP.navy_dark;

  // Local state for orders
  const [localOrders, setLocalOrders] = useState<TechServiceOrder[]>(() => {
    if (initialOrders && initialOrders.length > 0) return initialOrders;
    return [];
  });

  // Sync when initialOrders prop changes
  React.useEffect(() => {
    if (initialOrders && initialOrders.length > 0) {
      setLocalOrders(initialOrders);
    }
  }, [initialOrders]);

  // Current active main subtab: ordenes, catalogo, garantias
  const [activeTab, setActiveTab] = useState<'ordenes' | 'catalogo' | 'garantias'>('ordenes');

  // View mode inside 'ordenes': cards, kanban, table
  const [ordersViewMode, setOrdersViewMode] = useState<'cards' | 'kanban' | 'table'>('cards');

  // Search & Status filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TechServiceOrder['status']>('all');

  // Modals for Detail & Printing
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<TechServiceOrder | null>(null);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<TechServiceOrder | null>(null);

  // New OT Modal state
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newSelectedClientId, setNewSelectedClientId] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newDevice, setNewDevice] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newAccessories, setNewAccessories] = useState('');
  const [newPhysicalCondition, setNewPhysicalCondition] = useState('');
  const [newDevicePassword, setNewDevicePassword] = useState('');
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

  // Serial Search State in Warranties tab
  const [serialQuery, setSerialQuery] = useState('');

  // Pagination states (15 per page)
  const [ordersPage, setOrdersPage] = useState(1);
  const ORDERS_PER_PAGE = 12;
  const [techProdPage, setTechProdPage] = useState(1);
  const PRODS_PER_PAGE = 15;

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return localOrders.filter(order => {
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        order.code.toLowerCase().includes(q) ||
        order.clientName.toLowerCase().includes(q) ||
        order.device.toLowerCase().includes(q) ||
        (order.serial && order.serial.toLowerCase().includes(q)) ||
        (order.technician && order.technician.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [localOrders, searchQuery, statusFilter]);

  // Paginated orders
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

  // Paginated tech products
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

  // When client changes in New Order modal, auto-fill phone & email
  const handleClientSelectChange = (clientId: string) => {
    setNewSelectedClientId(clientId);
    if (clientId) {
      const client = clientsList.find(c => c.id === clientId);
      if (client) {
        setNewClientName(client.name);
        setNewClientPhone(client.phone || '');
        setNewClientEmail(client.email || '');
      }
    } else {
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
    }
  };

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
      clientPhone: newClientPhone.trim() || (client?.phone || undefined),
      clientEmail: newClientEmail.trim() || (client?.email || undefined),
      device: newDevice.trim(),
      brand: newBrand.trim() || undefined,
      model: newModel.trim() || undefined,
      serial: newSerial.trim() || undefined,
      accessoriesReceived: newAccessories.trim() || 'Únicamente el equipo principal.',
      physicalCondition: newPhysicalCondition.trim() || 'Condiciones normales de uso.',
      devicePassword: newDevicePassword.trim() || undefined,
      reportedIssue: newReportedIssue.trim(),
      diagnosis: 'En espera de revisión técnica.',
      status: 'recibido',
      priority: newPriority,
      estimatedCost: Number(newEstimatedCost) || 0,
      createdAt: new Date().toISOString().substring(0, 10),
      technician: newTechnician,
      receivedBy: newTechnician,
      notes: '',
      timeline: [
        {
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          status: 'Recibido',
          note: 'Equipo ingresado al taller para diagnóstico.',
          user: newTechnician
        }
      ]
    };

    setLocalOrders(prev => [newOrder, ...prev]);
    if (onAddServiceOrder) {
      onAddServiceOrder(newOrder);
    }

    // Reset and close
    setShowNewOrderModal(false);
    setNewSelectedClientId('');
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmail('');
    setNewDevice('');
    setNewBrand('');
    setNewModel('');
    setNewSerial('');
    setNewAccessories('');
    setNewPhysicalCondition('');
    setNewDevicePassword('');
    setNewReportedIssue('');
    setNewEstimatedCost(150000);
  };

  // Full Order Update handler
  const handleSaveUpdatedOrder = (updated: TechServiceOrder) => {
    setLocalOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    if (onUpdateServiceOrder) {
      onUpdateServiceOrder(updated);
    } else if (onUpdateServiceOrderStatus) {
      onUpdateServiceOrderStatus(updated.id, updated.status);
    }
    setSelectedOrderForDetail(null);
  };

  // Update status handler
  const handleUpdateStatus = (id: string, nextStatus: TechServiceOrder['status']) => {
    const target = localOrders.find(o => o.id === id);
    const timelineEntry = {
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: WORKSHOP_STATUS_CONFIG[nextStatus]?.label || nextStatus,
      note: `Estado cambiado a ${WORKSHOP_STATUS_CONFIG[nextStatus]?.label || nextStatus}`,
      user: target?.technician || 'Washington Quiñones'
    };

    const updated = localOrders.map(o => {
      if (o.id === id) {
        return {
          ...o,
          status: nextStatus,
          timeline: [timelineEntry, ...(o.timeline || [])],
          deliveryDate: (nextStatus === 'completado' || nextStatus === 'entregado') && !o.deliveryDate 
            ? new Date().toISOString().substring(0, 10) 
            : o.deliveryDate
        };
      }
      return o;
    });

    setLocalOrders(updated);
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

  // Serial lookup for Warranties tab
  const serialLookupResults = useMemo(() => {
    if (!serialQuery.trim()) return [];
    const q = serialQuery.toLowerCase().trim();
    return localOrders.filter(o => o.serial && o.serial.toLowerCase().includes(q));
  }, [localOrders, serialQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full select-none pb-12">
      
      {/* ======================================================== */}
      {/* TOP HEADER & MODULE CONTROLLER BANNER                     */}
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
                <span>Gestión de Servicios TI & Taller de Soporte Técnico</span>
              </span>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1.5 ${
                isProductionActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
              }`}>
                <Factory className="w-3 h-3" />
                <span>Módulo Producción: {isProductionActive ? 'Activado (MRP)' : 'Desactivado (Enfoque Taller/Tech)'}</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Órdenes de Trabajo (OT) & Taller Profesional</span>
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-normal">
              Flujo de reparación y mantenimiento de equipos, asignación de repuestos, checklist de ingreso físico, actas de entrega, garantías y notificaciones automáticas por WhatsApp para clientes.
            </p>
          </div>

          {/* Right Action: Production Toggle & New OT Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center justify-between gap-4">
              <div className="text-left">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-300 block">
                  Producción Industrial
                </span>
                <span className="text-xs font-semibold text-white">
                  {isProductionActive ? 'Habilitada (BOM/MRP)' : 'Desactivada (Solo Taller TI)'}
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
      {/* KPI METRIC CARDS FOR WORKSHOP & HARDWARE                 */}
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
            <span>{localOrders.filter(o => o.status === 'en_proceso' || o.status === 'recibido' || o.status === 'en_diagnostico').length} activas en taller</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
              Listos para Entrega
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
            {localOrders.filter(o => o.status === 'completado').length}
          </p>
          <p className="text-[11px] text-slate-300 mt-1 font-medium">
            {localOrders.filter(o => o.status === 'entregado').length} ya entregados a satisfacción
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
            Hardware, repuestos e insumos de taller
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              Valor Total Liquidado
            </span>
            <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-300 mt-2 font-mono">
            {formatCOP(localOrders.reduce((sum, o) => sum + (o.finalCost || o.estimatedCost), 0))}
          </p>
          <p className="text-[11px] text-slate-300 mt-1 font-medium">
            Repuestos + Mano de obra facturable
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
            <span>Productos & Repuestos Tech</span>
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
            <span>Garantías & Seriales (S/N)</span>
          </button>
        </div>

        {/* Action Button for Current Tab */}
        <div className="flex items-center gap-2">
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
              <span>Facturación DIAN</span>
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
          
          {/* Search, Filter Pills & View Mode Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código OT, cliente, equipo, técnico o serial..."
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
              {(['all', 'recibido', 'en_diagnostico', 'esperando_repuesto', 'en_proceso', 'completado', 'entregado'] as const).map(status => {
                const isSelected = statusFilter === status;
                const label = status === 'all' ? 'Todos' : (WORKSHOP_STATUS_CONFIG[status]?.label || status);
                return (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setOrdersPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* View Mode Toggle: Cards, Kanban, Table */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setOrdersViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  ordersViewMode === 'cards'
                    ? 'bg-slate-800 text-sky-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vista de Tarjetas / Mosaico"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOrdersViewMode('kanban')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  ordersViewMode === 'kanban'
                    ? 'bg-slate-800 text-sky-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vista Flujo Kanban de Taller"
              >
                <Columns3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOrdersViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  ordersViewMode === 'table'
                    ? 'bg-slate-800 text-sky-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vista Tabla Detallada"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* VIEW MODE 1: CARDS / MOSAICO                             */}
          {/* ======================================================== */}
          {ordersViewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedOrders.map(order => {
                const statusStyles = WORKSHOP_STATUS_CONFIG[order.status] || {
                  label: order.status,
                  color: 'text-slate-300',
                  bg: 'bg-slate-500/20',
                  border: 'border-slate-500/40'
                };

                const priorityBadge = {
                  urgente: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                  alta: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                  media: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                  baja: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                }[order.priority];

                const whatsappText = buildWhatsAppServiceNotification(order, currentCompany, formatCOP);
                const whatsappUrl = getWhatsAppPhoneLink(order.clientPhone, whatsappText);
                const grandTotal = order.finalCost || order.estimatedCost;

                return (
                  <div 
                    key={order.id}
                    className="rounded-2xl p-4.5 bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 shadow-md group"
                  >
                    <div className="space-y-2.5">
                      {/* Top Header of Card */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedOrderForDetail(order)}
                            className="font-mono font-black text-sm text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60 hover:bg-sky-900 transition-colors cursor-pointer"
                            title="Ver Ficha Técnica Completa"
                          >
                            {order.code}
                          </button>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${priorityBadge}`}>
                            {order.priority}
                          </span>
                        </div>
                        
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${statusStyles.bg} ${statusStyles.color} ${statusStyles.border}`}>
                          {statusStyles.label}
                        </span>
                      </div>

                      {/* Device & Client */}
                      <div>
                        <h4 
                          onClick={() => setSelectedOrderForDetail(order)}
                          className="font-bold text-sm text-white line-clamp-1 group-hover:text-sky-300 transition-colors cursor-pointer"
                        >
                          {order.device}
                        </h4>
                        <div className="flex items-center justify-between text-xs mt-0.5">
                          <span className="text-cyan-300 font-medium truncate">
                            {order.clientName}
                          </span>
                          {order.clientPhone && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10.5px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono shrink-0 ml-1"
                              title="Contactar vía WhatsApp"
                            >
                              <Smartphone className="w-3 h-3" />
                              <span>{order.clientPhone}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Serial Tag */}
                      {order.serial && (
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                          <span className="flex items-center gap-1.5">
                            <Tag className="w-3 h-3 text-slate-500" />
                            <span>S/N: <strong className="text-slate-200">{order.serial}</strong></span>
                          </span>
                          {order.brand && <span className="text-slate-500">{order.brand}</span>}
                        </div>
                      )}

                      {/* Issues and Diagnosis */}
                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1">
                        <p className="text-slate-300 text-[11.5px] line-clamp-2">
                          <strong className="text-slate-400">Falla:</strong> {order.reportedIssue}
                        </p>
                        {order.diagnosis && (
                          <p className="text-sky-300/90 text-[11px] line-clamp-2 border-t border-slate-800/60 pt-1">
                            <strong className="text-slate-400">Diagnóstico:</strong> {order.diagnosis}
                          </p>
                        )}
                        {order.solutionApplied && (
                          <p className="text-emerald-400/90 text-[11px] line-clamp-2 border-t border-slate-800/60 pt-1">
                            <strong className="text-slate-400">Solución:</strong> {order.solutionApplied}
                          </p>
                        )}
                      </div>

                      {/* Parts badge if any */}
                      {order.partsUsed && order.partsUsed.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10.5px] text-purple-300 bg-purple-950/40 border border-purple-800/50 px-2 py-0.5 rounded-lg">
                          <Cpu className="w-3 h-3 text-purple-400" />
                          <span>{order.partsUsed.length} Repuesto(s) instalado(s)</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Section: Total & Quick Actions */}
                    <div className="pt-2 border-t border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {order.finalCost ? 'Total Liquidado:' : 'Presupuesto Estimado:'}
                        </span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {formatCOP(grandTotal)}
                        </span>
                      </div>

                      {/* Quick Status advancement and actions */}
                      <div className="flex items-center justify-between gap-1.5 pt-1">
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value as any)}
                          className="text-[10.5px] font-semibold bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 cursor-pointer flex-1"
                          aria-label="Actualizar estado de orden"
                        >
                          <option value="recibido">1. Recibido</option>
                          <option value="en_diagnostico">2. En Diagnóstico</option>
                          <option value="esperando_repuesto">3. Esperando Repuesto</option>
                          <option value="en_proceso">4. En Taller / Proceso</option>
                          <option value="completado">5. Listo para Entrega</option>
                          <option value="entregado">6. Entregado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>

                        {/* Print Button */}
                        <button
                          onClick={() => setSelectedOrderForPrint(order)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10.5px] transition-all cursor-pointer"
                          title="Imprimir Comprobante de Entrada o Acta de Entrega"
                        >
                          <Printer className="w-3.5 h-3.5 text-sky-400" />
                        </button>

                        {/* Detail Modal Button */}
                        <button
                          onClick={() => setSelectedOrderForDetail(order)}
                          className="px-2 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-sky-300 hover:text-white border border-blue-500/40 text-[10.5px] font-bold transition-all cursor-pointer"
                          title="Abrir Ficha Técnica y Bitácora"
                        >
                          Ficha
                        </button>

                        {/* Bill Button */}
                        <button
                          onClick={() => setActiveView('facturacion')}
                          className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10.5px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                          title="Facturar este servicio mediante Facturación Electrónica DIAN"
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
          )}

          {/* ======================================================== */}
          {/* VIEW MODE 2: KANBAN COLUMNS (WORKSHOP PIPELINE)          */}
          {/* ======================================================== */}
          {ordersViewMode === 'kanban' && (
            <div className="flex gap-3.5 overflow-x-auto pb-4">
              {(['recibido', 'en_diagnostico', 'esperando_repuesto', 'en_proceso', 'completado', 'entregado'] as const).map(colStatus => {
                const colOrders = filteredOrders.filter(o => o.status === colStatus);
                const colInfo = WORKSHOP_STATUS_CONFIG[colStatus];

                return (
                  <div 
                    key={colStatus}
                    className="w-72 shrink-0 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col max-h-[750px]"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${colInfo.bg} ${colInfo.border} border`} />
                        <h4 className="font-bold text-xs text-white">{colInfo.label}</h4>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 font-bold border border-slate-800">
                        {colOrders.length}
                      </span>
                    </div>

                    {/* Column Cards */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pt-2.5 pr-1">
                      {colOrders.map(order => (
                        <div
                          key={order.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 transition-all space-y-2 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-xs text-sky-400">
                              {order.code}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">
                              {formatCOP(order.finalCost || order.estimatedCost)}
                            </span>
                          </div>

                          <div 
                            onClick={() => setSelectedOrderForDetail(order)}
                            className="cursor-pointer"
                          >
                            <p className="text-xs font-bold text-white line-clamp-1 hover:text-sky-300">
                              {order.device}
                            </p>
                            <p className="text-[11px] text-cyan-300 line-clamp-1 mt-0.5">
                              {order.clientName}
                            </p>
                          </div>

                          <p className="text-[10.5px] text-slate-400 line-clamp-2 bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                            {order.reportedIssue}
                          </p>

                          {/* Quick movement controls */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                            <button
                              onClick={() => setSelectedOrderForDetail(order)}
                              className="text-sky-400 hover:underline font-bold"
                            >
                              Ver Ficha
                            </button>

                            <button
                              onClick={() => setSelectedOrderForPrint(order)}
                              className="text-slate-400 hover:text-white"
                              title="Imprimir"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateStatus(order.id, e.target.value as any)}
                              className="bg-slate-900 text-slate-300 rounded px-1.5 py-0.5 border border-slate-700 text-[10px]"
                            >
                              <option value="recibido">1. Recibido</option>
                              <option value="en_diagnostico">2. Diagnóstico</option>
                              <option value="esperando_repuesto">3. Repuesto</option>
                              <option value="en_proceso">4. En Taller</option>
                              <option value="completado">5. Listo</option>
                              <option value="entregado">6. Entregado</option>
                            </select>
                          </div>
                        </div>
                      ))}

                      {colOrders.length === 0 && (
                        <div className="py-8 text-center text-slate-500 text-xs italic">
                          Sin órdenes en esta etapa
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW MODE 3: TABLA DETALLADA                             */}
          {/* ======================================================== */}
          {ordersViewMode === 'table' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Código OT</th>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Cliente / Contacto</th>
                      <th className="py-2.5 px-3">Dispositivo & Serial</th>
                      <th className="py-2.5 px-3">Falla / Diagnóstico</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3 text-right">Valor Final</th>
                      <th className="py-2.5 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-sans">
                    {paginatedOrders.map(order => {
                      const statusStyles = WORKSHOP_STATUS_CONFIG[order.status] || {
                        label: order.status,
                        color: 'text-slate-300',
                        bg: 'bg-slate-500/20',
                        border: 'border-slate-500/40'
                      };

                      return (
                        <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                            {order.code}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">
                            {order.createdAt}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-white block">{order.clientName}</span>
                            {order.clientPhone && (
                              <span className="text-[10px] text-slate-400 font-mono">{order.clientPhone}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-slate-200 block">{order.device}</span>
                            {order.serial && (
                              <span className="text-[10px] text-sky-400 font-mono">S/N: {order.serial}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 max-w-xs">
                            <p className="truncate text-slate-300">{order.reportedIssue}</p>
                            {order.diagnosis && (
                              <p className="text-[10.5px] text-slate-400 truncate">Diag: {order.diagnosis}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusStyles.bg} ${statusStyles.color} ${statusStyles.border}`}>
                              {statusStyles.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                            {formatCOP(order.finalCost || order.estimatedCost)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setSelectedOrderForDetail(order)}
                                className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600 text-sky-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                                title="Ver Ficha Técnica"
                              >
                                Ficha
                              </button>
                              <button
                                onClick={() => setSelectedOrderForPrint(order)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] transition-all cursor-pointer"
                                title="Imprimir"
                              >
                                <Printer className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination for Cards & Table */}
          {ordersViewMode !== 'kanban' && filteredOrders.length > 0 && (
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
                  <span>Catálogo de Productos Tecnológicos y Repuestos de Taller</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Artículos configurados para facturación DIAN, repuestos instalados en órdenes de trabajo o venta directa al público.
                </p>
              </div>

              <button
                onClick={() => setShowNewProductModal(true)}
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Producto o Repuesto</span>
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
                            Hardware / Repuesto
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
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Trazabilidad de Seriales (S/N) & Consulta de Garantías</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consulta el historial completo de intervenciones técnicas y vigencia de garantía por número de serie.
                </p>
              </div>

              {/* Serial Search Input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar serial (ej. PF-28XYZ90)..."
                  value={serialQuery}
                  onChange={(e) => setSerialQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 font-mono"
                />
              </div>
            </div>

            {/* If searched, display matching orders */}
            {serialQuery.trim() && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-xs text-sky-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Historial de Intervenciones para Serial: "{serialQuery}" ({serialLookupResults.length} registros)</span>
                </span>

                {serialLookupResults.map(order => (
                  <div key={order.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sky-400">{order.code}</span>
                        <span className="text-xs font-bold text-white">{order.device}</span>
                      </div>
                      <p className="text-xs text-slate-400">Cliente: {order.clientName} | Fecha: {order.createdAt}</p>
                      <p className="text-[11px] text-slate-300">Trabajo: {order.solutionApplied || order.diagnosis}</p>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-xs font-mono font-bold text-emerald-400 block">
                        Garantía: {order.warrantyDays || 30} Días
                      </span>
                      <button
                        onClick={() => setSelectedOrderForDetail(order)}
                        className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600 text-sky-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        Ver Detalle
                      </button>
                    </div>
                  </div>
                ))}

                {serialLookupResults.length === 0 && (
                  <p className="text-xs text-slate-500 py-3 text-center italic">
                    No se encontraron órdenes previas registradas con ese número de serie.
                  </p>
                )}
              </div>
            )}

            {/* Static Highlighted Warranties */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-sky-400 font-bold">
                  <span>Laptop ThinkPad T14</span>
                  <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    PF-28XYZ90
                  </span>
                </div>
                <p className="text-xs text-slate-300">Cliente: Supermercados Éxito S.A.</p>
                <div className="flex items-center justify-between text-[11px] text-emerald-400 pt-1.5 border-t border-slate-800 font-medium">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Garantía Vigente: 90 Días</span>
                  </span>
                  <span className="font-mono">Vence: Ene 2027</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-sky-400 font-bold">
                  <span>Servidor Dell PowerEdge T150</span>
                  <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    SVC-TAG-88J20
                  </span>
                </div>
                <p className="text-xs text-slate-300">Cliente: Distribuidora Granel Co</p>
                <div className="flex items-center justify-between text-[11px] text-emerald-400 pt-1.5 border-t border-slate-800 font-medium">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Garantía Vigente: 180 Días</span>
                  </span>
                  <span className="font-mono">Vence: Abr 2027</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-sky-400 font-bold">
                  <span>UniFi U6 Pro Access Points</span>
                  <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    NET-U6-0922
                  </span>
                </div>
                <p className="text-xs text-slate-300">Cliente: Harineras del Valle</p>
                <div className="flex items-center justify-between text-[11px] text-emerald-400 pt-1.5 border-t border-slate-800 font-medium">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Garantía Vigente: 60 Días</span>
                  </span>
                  <span className="font-mono">Vence: Dic 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NUEVA ORDEN DE SERVICIO TÉCNICO (OT)              */}
      {/* ======================================================== */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-sm shadow-inner">
                  <Wrench className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Nueva Orden de Servicio Técnico (OT)</h3>
                  <p className="text-[11px] text-slate-400">Ingreso de equipo a taller y registro de cliente</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3.5 text-xs">
              
              {/* Cliente */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <label className="block text-slate-300 font-bold">Datos del Propietario / Cliente *</label>
                <select
                  value={newSelectedClientId}
                  onChange={(e) => handleClientSelectChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:border-sky-400 outline-none"
                >
                  <option value="">-- Seleccionar de clientes registrados o ingresar nuevo mostrador --</option>
                  {clientsList.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.nit}) {c.phone ? ` - Tel: ${c.phone}` : ''}</option>
                  ))}
                </select>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[10.5px] text-slate-400 mb-0.5">Nombre / Razón Social</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre del cliente..."
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-400 mb-0.5">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="Ej. 3101234567"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-sky-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-400 mb-0.5">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="cliente@email.com"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-sky-400"
                    />
                  </div>
                </div>
              </div>

              {/* Dispositivo */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <label className="block text-slate-300 font-bold">Datos del Equipo o Dispositivo *</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[10.5px] text-slate-400 mb-0.5">Descripción del Dispositivo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Laptop Lenovo ThinkPad T14 o Servidor Dell T150"
                      value={newDevice}
                      onChange={(e) => setNewDevice(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-sky-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-400 mb-0.5">Número de Serie (S/N)</label>
                    <input
                      type="text"
                      placeholder="Ej. PF-28XYZ90"
                      value={newSerial}
                      onChange={(e) => setNewSerial(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-sky-400 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[10.5px] text-slate-400 mb-0.5">Marca</label>
                    <input
                      type="text"
                      placeholder="Ej. Lenovo, Dell, Apple, HP"
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-400 mb-0.5">Modelo</label>
                    <input
                      type="text"
                      placeholder="Ej. T14 Gen 3"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-400 mb-0.5">Clave / PIN (Opcional pruebas)</label>
                    <input
                      type="text"
                      placeholder="Ej. 1234"
                      value={newDevicePassword}
                      onChange={(e) => setNewDevicePassword(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Accesorios & Estado Físico */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Accesorios Dejados en Taller</label>
                  <input
                    type="text"
                    placeholder="Ej. Cargador 65W, estuche, cable USB..."
                    value={newAccessories}
                    onChange={(e) => setNewAccessories(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estado Físico / Estético</label>
                  <input
                    type="text"
                    placeholder="Ej. Buen estado, rayones en tapa, pantalla intacta..."
                    value={newPhysicalCondition}
                    onChange={(e) => setNewPhysicalCondition(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none"
                  />
                </div>
              </div>

              {/* Falla Reportada */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Problema Reportado por el Cliente *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Detalla la falla técnica o el requerimiento del cliente..."
                  value={newReportedIssue}
                  onChange={(e) => setNewReportedIssue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none resize-none"
                />
              </div>

              {/* Prioridad, Técnico y Presupuesto */}
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-white hover:to-sky-400 text-slate-950 font-black transition-all cursor-pointer shadow-lg shadow-sky-500/20"
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
                    <option value="tecnologia">Hardware / Repuesto Tecnológico</option>
                    <option value="servicio">Servicio Profesional / Mano de Obra TI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Código / SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. TECH-REP-01 o SRV-MANT"
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
                  placeholder="Ej. Pantalla LED 15.6 FHD o Mantenimiento Térmico"
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
                    placeholder="Ej. Lenovo, Dell, Kingston"
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

      {/* ======================================================== */}
      {/* MODAL: FICHA TÉCNICA DETALLADA & BITÁCORA                */}
      {/* ======================================================== */}
      {selectedOrderForDetail && (
        <TechOrderDetailModal
          order={selectedOrderForDetail}
          products={products}
          company={currentCompany}
          onClose={() => setSelectedOrderForDetail(null)}
          onSave={handleSaveUpdatedOrder}
          onPrint={(orderToPrint) => {
            setSelectedOrderForPrint(orderToPrint);
          }}
          onInvoice={(orderToInvoice) => {
            setSelectedOrderForDetail(null);
            setActiveView('facturacion');
          }}
          formatCOP={formatCOP}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: IMPRESIÓN COMPROBANTE RECEPCIÓN / ACTA ENTREGA    */}
      {/* ======================================================== */}
      {selectedOrderForPrint && (
        <TechServicePrintModal
          order={selectedOrderForPrint}
          company={currentCompany}
          onClose={() => setSelectedOrderForPrint(null)}
          formatCOP={formatCOP}
        />
      )}

    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { Voucher, Tercero, Product, BOM, InventoryItem, Company, TechServiceOrder } from '../types';
import { THEMES_MAP } from './Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import CashFlowTrendChart from './CashFlowTrendChart';
import Pagination from './Pagination';
import { 
  TrendingUp, 
  AlertTriangle, 
  Mail, 
  ChevronRight, 
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  LayoutGrid,
  BarChart3,
  Layers,
  Sparkles,
  ShoppingBag,
  Package,
  Calculator,
  Settings,
  Store,
  Building2,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Laptop,
  Clock,
  Wrench,
  ShieldCheck,
  FileText,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import SalesReportModal from './SalesReportModal';
import { exportDashboardSalesToExcel } from '../utils/excelExport';

interface DashboardViewProps {
  vouchers: Voucher[];
  terceros: Tercero[];
  products: Product[];
  setActiveView: (view: string) => void;
  onQuickAction: (actionId: string) => void;
  formatCOP?: (val: number) => string;
  theme?: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
  boms: BOM[];
  inventory: InventoryItem[];
  sales?: number;
  expenses?: number;
  profit?: number;
  margin?: string;
  clientsCount?: number;
  suppliersCount?: number;
  currentUser?: { name: string; role: string; email?: string };
  searchQuery?: string;
  currentCompany?: Company;
  onUpdateCompany?: (co: Company) => void;
  techServiceOrders?: TechServiceOrder[];
}

export default function DashboardView({
  vouchers,
  terceros,
  products,
  setActiveView,
  onQuickAction,
  theme = 'navy_dark',
  boms = [],
  inventory = [],
  sales,
  expenses,
  profit,
  margin,
  clientsCount,
  suppliersCount,
  currentUser = { name: 'Washington Quiñones', role: 'Administrador' },
  searchQuery = '',
  currentCompany,
  onUpdateCompany,
  techServiceOrders = []
}: DashboardViewProps) {
  
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.navy_dark;
  const isLight = theme === 'light_gray';

  // View mode: 'menu' (the FinteKia portal menu) vs 'cashflow' (Data Visualization) vs 'analytics' (stock alerts & MRP)
  const [viewMode, setViewMode] = useState<'menu' | 'cashflow' | 'analytics'>('menu');

  // Toggle inline cash flow recharts line chart inside menu view
  const [showInlineCashFlow, setShowInlineCashFlow] = useState<boolean>(false);

  // Sales & Operating Margins PDF Report Modal
  const [isSalesReportModalOpen, setIsSalesReportModalOpen] = useState<boolean>(false);

  // Category filter state: starts on 'comercial' so the menu is compact/recogido on app start (Screenshot 2), and clicking 'Todas' unfolds all cards
  const [selectedCategory, setSelectedCategory] = useState<string>('comercial');

  // Card density state: 'mini' (super compact 48px mini-card) or 'normal' (compact tile 64px)
  // Preserved in localStorage as requested
  const [cardDensity, setCardDensity] = useState<'mini' | 'normal'>(() => {
    const saved = localStorage.getItem('fintekia_card_density');
    return (saved === 'normal' || saved === 'mini') ? saved : 'mini';
  });

  const handleSetCardDensity = (density: 'mini' | 'normal') => {
    setCardDensity(density);
    localStorage.setItem('fintekia_card_density', density);
  };

  // CRITICAL PRIVACY CONTROL:
  // "solo una cosa que las tarjetas no quede visibles a primera vista, es decir a la vista de todos"
  // Default to false so cards are NEVER visible at first sight on screen load!
  const [isMetricsVisible, setIsMetricsVisible] = useState<boolean>(() => {
    const saved = localStorage.getItem('fintekia_show_cards_at_first_sight');
    return saved === 'true'; // Defaults to false
  });

  // Individual mask for each card amount ($ ••••••••)
  const [maskAmounts, setMaskAmounts] = useState<boolean>(true);

  // Floating popover state for shortcuts (prevents stretching the grid)
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  // Close popover on document click
  useEffect(() => {
    const handleClickOutside = () => setOpenPopoverId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleMetricsVisibility = () => {
    const next = !isMetricsVisible;
    setIsMetricsVisible(next);
    localStorage.setItem('fintekia_show_cards_at_first_sight', String(next));
  };

  // Reorder limits for raw material alerts
  const [reorderLimits, setReorderLimits] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('reorder_limits_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      'p-1': 500,
      'p-2': 200,
      'p-3': 100,
      'p-4': 20,
      'p-5': 400
    };
  });

  const handleUpdateLimit = (productId: string, val: number) => {
    const next = { ...reorderLimits, [productId]: Math.max(0, val) };
    setReorderLimits(next);
    localStorage.setItem('reorder_limits_v1', JSON.stringify(next));
  };

  // Real-time stock calculator
  const rawMaterials = products.filter((p) => p.type === 'materia_prima');
  const materialsWithStock = rawMaterials.map((mat) => {
    const currentStock = inventory
      .filter((inv) => inv.productId === mat.id)
      .reduce((sum, inv) => sum + inv.quantity, 0);
    const limit = reorderLimits[mat.id] ?? 100;
    const isBelow = currentStock < limit;
    return {
      ...mat,
      currentStock,
      limit,
      isBelow
    };
  });

  const criticalMaterials = materialsWithStock.filter((m) => m.isBelow);

  // Pagination for MRP Reorder thresholds (15 per page)
  const [mrpPage, setMrpPage] = useState(1);
  const MRP_ITEMS_PER_PAGE = 15;
  const totalMrpPages = Math.max(1, Math.ceil(materialsWithStock.length / MRP_ITEMS_PER_PAGE));
  const safeMrpPage = Math.min(mrpPage, totalMrpPages);
  const paginatedMaterialsWithStock = materialsWithStock.slice(
    (safeMrpPage - 1) * MRP_ITEMS_PER_PAGE,
    safeMrpPage * MRP_ITEMS_PER_PAGE
  );

  // Email simulation states
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [destEmail, setDestEmail] = useState('quinoneswash70@gmail.com');
  const [emailLogs, setEmailLogs] = useState<string[]>([]);

  const handleSendEmailAlert = () => {
    if (criticalMaterials.length === 0) return;
    setEmailStatus('sending');
    setTimeout(() => {
      setEmailStatus('sent');
      const time = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const itemsList = criticalMaterials.map(m => `${m.name} (${m.currentStock.toFixed(1)} / Mín: ${m.limit})`).join(', ');
      setEmailLogs(prev => [
        `[${time}] FES-Alert: Hilo de notificación enviado de forma exitosa a ${destEmail} por bajo stock de: ${itemsList}`,
        ...prev
      ]);
      setTimeout(() => setEmailStatus('idle'), 3500);
    }, 1500);
  };

  // Safe fallback metrics if not passed from parent
  const salesVal = sales !== undefined ? sales : 12580000;
  const purchasesVal = expenses !== undefined ? expenses : 8450000;
  const invCount = products.length > 0 ? products.length : 248;
  const clientsVal = clientsCount !== undefined ? clientsCount : terceros.filter(t => t.roles.includes('cliente')).length || 156;
  const suppliersVal = suppliersCount !== undefined ? suppliersCount : terceros.filter(t => t.roles.includes('proveedor')).length || 24;

  // The 5 Hero Metric Cards (Compact & Slim)
  const metricCards = [
    {
      id: 'ventas',
      title: 'Total Ventas',
      value: formatCOP(salesVal),
      trend: '↑ 12%',
      trendColor: 'text-emerald-500',
      icon: 'ri-file-text-line',
      iconColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      sparklineColor: '#2563eb'
    },
    {
      id: 'compras',
      title: 'Compras',
      value: formatCOP(purchasesVal),
      trend: '↑ 8%',
      trendColor: 'text-emerald-500',
      icon: 'ri-shopping-cart-2-line',
      iconColor: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
      sparklineColor: '#0d9488'
    },
    {
      id: 'inventario',
      title: 'Inventario',
      value: `${invCount} Ref.`,
      trend: '↑ 5%',
      trendColor: 'text-emerald-500',
      icon: 'ri-archive-line',
      iconColor: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      sparklineColor: '#6366f1'
    },
    {
      id: 'clientes',
      title: 'Clientes',
      value: `${clientsVal}`,
      trend: '↑ 10%',
      trendColor: 'text-emerald-500',
      icon: 'ri-group-line',
      iconColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      sparklineColor: '#d97706'
    },
    {
      id: 'proveedores',
      title: 'Proveedores',
      value: `${suppliersVal}`,
      trend: '↑ 6%',
      trendColor: 'text-emerald-500',
      icon: 'ri-truck-line',
      iconColor: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      sparklineColor: '#0891b2'
    }
  ];

  // Key Metrics for Technology and Services mode (active when production MRP is disabled)
  const techMetrics = useMemo(() => {
    const list: TechServiceOrder[] = (techServiceOrders && techServiceOrders.length > 0)
      ? techServiceOrders
      : [
          {
            id: 'ot-1',
            code: 'OT-101',
            clientId: 'ter-2',
            clientName: 'Supermercados Éxito S.A.',
            device: 'Laptop Lenovo ThinkPad T14 Gen 3 (Core i7 / 16GB)',
            reportedIssue: 'Recalentamiento severo y ampliación SSD 1TB',
            status: 'en_proceso',
            priority: 'alta',
            estimatedCost: 280000,
            createdAt: '2026-10-02',
            deliveryDate: '2026-10-08',
            technician: 'Washington Quiñones'
          },
          {
            id: 'ot-2',
            code: 'OT-102',
            clientId: 'ter-4',
            clientName: 'Distribuidora Granel Co',
            device: 'Servidor Dell PowerEdge T150 Xeon 32GB',
            reportedIssue: 'Configuración RAID 1 y VPN corporativa',
            status: 'completado',
            priority: 'urgente',
            estimatedCost: 650000,
            createdAt: '2026-09-28',
            deliveryDate: '2026-10-05',
            technician: 'Washington Quiñones'
          },
          {
            id: 'ot-3',
            code: 'OT-103',
            clientId: 'ter-1',
            clientName: 'Harineras del Valle S.A.',
            device: 'Infraestructura Wi-Fi 6 (UniFi U6 Pro)',
            reportedIssue: 'Baja cobertura y certificación de red',
            status: 'en_diagnostico',
            priority: 'media',
            estimatedCost: 450000,
            createdAt: '2026-10-04',
            technician: 'Andrés Felipe Gómez'
          },
          {
            id: 'ot-4',
            code: 'OT-104',
            clientId: 'ter-3',
            clientName: 'Panadería La Aurora',
            device: 'Terminal Punto de Venta POS Touch',
            reportedIssue: 'Cambio de disco y configuración de factura',
            status: 'recibido',
            priority: 'media',
            estimatedCost: 190000,
            createdAt: '2026-10-06',
            technician: 'Washington Quiñones'
          }
        ];

    const openOrders = list.filter(o => o.status === 'recibido' || o.status === 'en_diagnostico' || o.status === 'en_proceso');
    const inProcessOrders = list.filter(o => o.status === 'en_proceso');
    const inDiagnosisOrders = list.filter(o => o.status === 'en_diagnostico');
    const receivedOrders = list.filter(o => o.status === 'recibido');
    const completedOrders = list.filter(o => o.status === 'completado' || o.status === 'entregado');
    const urgentOrders = openOrders.filter(o => o.priority === 'urgente' || o.priority === 'alta');

    // Total estimated value in open repair/maintenance orders
    const pendingVal = openOrders.reduce((sum, o) => sum + (o.estimatedCost || 0), 0);

    // Calculate Average Response & Turnaround Time
    const ordersWithDates = list.filter(o => o.createdAt && o.deliveryDate);
    let avgDays = 2.1;
    if (ordersWithDates.length > 0) {
      const sumDays = ordersWithDates.reduce((acc, o) => {
        const d1 = new Date(o.createdAt).getTime();
        const d2 = new Date(o.deliveryDate!).getTime();
        const diff = Math.max(1, Math.round((d2 - d1) / (1000 * 3600 * 24)));
        return acc + diff;
      }, 0);
      avgDays = Number((sumDays / ordersWithDates.length).toFixed(1));
    }

    const techProductsCount = products.filter(p => p.type === 'tecnologia').length;
    const techServicesCount = products.filter(p => p.type === 'servicio').length;

    return {
      allOrders: list,
      openCount: openOrders.length,
      inProcessCount: inProcessOrders.length,
      inDiagnosisCount: inDiagnosisOrders.length,
      receivedCount: receivedOrders.length,
      completedCount: completedOrders.length,
      urgentCount: urgentOrders.length,
      pendingVal,
      avgDaysNumber: avgDays,
      avgDaysStr: `${avgDays} Días`,
      avgHoursStr: `~${Math.round(avgDays * 24)}h turnaround`,
      techProductsCount,
      techServicesCount,
      fulfillmentRate: '98.5%'
    };
  }, [techServiceOrders, products]);

  // CATEGORIZED MODULE CARDS:
  // Defined with explicit category color (--cat-color):
  // Tecnología = #0EA5E9 | Comercial = #3B82F6 | Inventario = #8B5CF6 | Contabilidad = #06B6D4 | Nómina = #10B981 | Inteligencia = #D946EF
  const isProductionActive = currentCompany?.enableProduction !== false;

  const categories = useMemo(() => [
    {
      id: 'tecnologia',
      name: 'Tecnología, Hardware & Servicios TI',
      catColor: '#0EA5E9', // Azul Cielo Eléctrico
      icon: 'ri-macbook-line',
      accentColor: 'text-sky-500',
      badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      tagColor: 'bg-sky-500',
      cards: [
        {
          id: 'servicios_tech',
          title: 'Servicios Técnicos & OT',
          subtitle: 'Órdenes de servicio, soporte y mantenimiento',
          icon: 'ri-macbook-fill',
          mainAction: () => setActiveView('servicios_tech'),
          links: [
            { label: 'Nueva Orden de Servicio (OT)', icon: 'ri-add-line', action: () => setActiveView('servicios_tech') },
            { label: 'Taller y Diagnóstico', icon: 'ri-tools-line', action: () => setActiveView('servicios_tech') },
            { label: 'Servicios Completados', icon: 'ri-checkbox-circle-line', action: () => setActiveView('servicios_tech') },
            { label: 'Facturar Servicio (Tercero)', icon: 'ri-file-text-line', action: () => setActiveView('facturacion') },
          ]
        },
        {
          id: 'productos_tech',
          title: 'Venta de Equipos & Tecnología',
          subtitle: 'Laptops, routers, periféricos y partes',
          icon: 'ri-computer-fill',
          mainAction: () => setActiveView('servicios_tech'),
          links: [
            { label: 'Catálogo de Tecnología', icon: 'ri-list-check', action: () => setActiveView('servicios_tech') },
            { label: 'Nueva Factura de Equipos', icon: 'ri-shopping-cart-line', action: () => setActiveView('facturacion') },
            { label: 'Control de Garantías', icon: 'ri-shield-check-line', action: () => setActiveView('servicios_tech') },
          ]
        },
        {
          id: 'garantias_tech',
          title: 'Garantías & Seriales',
          subtitle: 'Trazabilidad por S/N y soporte postventa',
          icon: 'ri-shield-check-fill',
          mainAction: () => setActiveView('servicios_tech'),
          links: [
            { label: 'Consultar Seriales S/N', icon: 'ri-search-line', action: () => setActiveView('servicios_tech') },
            { label: 'Historial de Soporte', icon: 'ri-history-line', action: () => setActiveView('servicios_tech') },
          ]
        }
      ]
    },
    {
      id: 'comercial',
      name: 'Comercial & Clientes',
      catColor: '#3B82F6', // Azul
      icon: 'ri-store-2-line',
      accentColor: 'text-blue-500',
      badgeBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      tagColor: 'bg-blue-500',
      cards: [
        {
          id: 'ventas',
          title: 'Ventas & Facturación',
          subtitle: 'Facturación vía Proveedor Tecnológico (Tercero)',
          icon: 'ri-shopping-cart-2-fill',
          mainAction: () => setActiveView('facturacion'),
          links: [
            { label: 'Nueva Factura Electrónica', icon: 'ri-file-add-line', action: () => setActiveView('facturacion') },
            { label: 'Cotización / Pedido', icon: 'ri-file-list-3-line', action: () => setActiveView('facturacion') },
            { label: 'Reporte PDF Ventas & Márgenes', icon: 'ri-file-pdf-line', action: () => setIsSalesReportModalOpen(true) },
            { label: 'Historial de Facturación', icon: 'ri-bar-chart-fill', action: () => setActiveView('facturacion') },
          ]
        },
        {
          id: 'compras',
          title: 'Compras & Gastos',
          subtitle: 'Proveedores, OC y adquisiciones',
          icon: 'ri-truck-fill',
          mainAction: () => setActiveView('compras'),
          links: [
            { label: 'Registrar Compra', icon: 'ri-file-add-line', action: () => setActiveView('compras') },
            { label: 'Órdenes de Compra', icon: 'ri-file-paper-2-line', action: () => setActiveView('compras') },
            { label: 'Directorio Proveedores', icon: 'ri-group-line', action: () => setActiveView('terceros') },
            { label: 'Gastos y Adquisiciones', icon: 'ri-file-chart-line', action: () => setActiveView('compras') },
          ]
        },
        {
          id: 'clientes',
          title: 'Directorio Clientes',
          subtitle: 'Cartera CxC, cupos y contactos',
          icon: 'ri-team-fill',
          mainAction: () => setActiveView('terceros'),
          links: [
            { label: 'Nuevo Cliente', icon: 'ri-user-add-line', action: () => setActiveView('terceros') },
            { label: 'Directorio y Contactos', icon: 'ri-contacts-line', action: () => setActiveView('terceros') },
            { label: 'Cartera de Crédito CxC', icon: 'ri-wallet-3-line', action: () => setActiveView('cartera') },
          ]
        },
        {
          id: 'proveedores',
          title: 'Proveedores & CxP',
          subtitle: 'Cuentas por pagar y pagos',
          icon: 'ri-shake-hands-fill',
          mainAction: () => setActiveView('terceros'),
          links: [
            { label: 'Nuevo Proveedor', icon: 'ri-user-add-line', action: () => setActiveView('terceros') },
            { label: 'Listado Proveedores', icon: 'ri-contacts-book-line', action: () => setActiveView('terceros') },
            { label: 'Pagos y Tesorería', icon: 'ri-bank-card-line', action: () => setActiveView('bancos') },
          ]
        }
      ]
    },
    {
      id: 'operaciones',
      name: 'Inventario, Bodegas & Producción',
      catColor: '#8B5CF6', // Violeta
      icon: 'ri-archive-line',
      accentColor: 'text-purple-500',
      badgeBg: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      tagColor: 'bg-purple-500',
      cards: [
        {
          id: 'productos',
          title: 'Productos & Kardex',
          subtitle: 'Catálogo de equipos, insumos y stock',
          icon: 'ri-box-3-fill',
          mainAction: () => setActiveView('productos'),
          links: [
            { label: 'Catálogo de Productos', icon: 'ri-box-3-line', action: () => setActiveView('productos') },
            { label: 'Kardex y Movimientos', icon: 'ri-arrow-left-right-line', action: () => setActiveView('bodegas') },
            { label: 'Ajustes de Inventario', icon: 'ri-equalizer-line', action: () => setActiveView('bodegas') },
          ]
        },
        {
          id: 'bodegas',
          title: 'Bodegas & Almacenes',
          subtitle: 'Sedes, bodegas y transferencias',
          icon: 'ri-store-3-fill',
          mainAction: () => setActiveView('bodegas'),
          links: [
            { label: 'Gestionar Bodegas', icon: 'ri-building-line', action: () => setActiveView('bodegas') },
            { label: 'Traslados entre Bodegas', icon: 'ri-exchange-line', action: () => setActiveView('bodegas') },
            { label: 'Activos de Planta', icon: 'ri-dashboard-2-line', action: () => setActiveView('bodegas') },
          ]
        },
        {
          id: 'produccion',
          title: 'Producción & Recetas',
          subtitle: 'Órdenes de fabricación y BOM',
          icon: 'ri-flask-fill',
          mainAction: () => setActiveView('ordenes_prod'),
          links: [
            { label: 'Órdenes de Fabricación', icon: 'ri-file-settings-line', action: () => setActiveView('ordenes_prod') },
            { label: 'Fórmulas y Recetas BOM', icon: 'ri-flask-line', action: () => setActiveView('ordenes_prod') },
            { label: 'Kiosco Operario', icon: 'ri-computer-line', action: () => setActiveView('ordenes_prod') },
          ]
        },
        {
          id: 'mrp',
          title: 'MRP & Control Calidad',
          subtitle: 'Cálculo de insumos e inspección',
          icon: 'ri-cpu-fill',
          mainAction: () => setActiveView('mrp'),
          links: [
            { label: 'Planificación MRP', icon: 'ri-cpu-line', action: () => setActiveView('mrp') },
            { label: 'Control de Calidad', icon: 'ri-shield-check-line', action: () => setActiveView('calidad') },
          ]
        }
      ]
    },
    {
      id: 'finanzas',
      name: 'Contabilidad, Tesorería & DIAN',
      catColor: '#06B6D4', // Cian
      icon: 'ri-calculator-line',
      accentColor: 'text-indigo-500',
      badgeBg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      tagColor: 'bg-indigo-500',
      cards: [
        {
          id: 'contabilidad',
          title: 'Contabilidad & PUC',
          subtitle: 'Libro diario, balances y asientos',
          icon: 'ri-calculator-fill',
          mainAction: () => setActiveView('comprobantes'),
          links: [
            { label: 'Plan de Cuentas (PUC)', icon: 'ri-list-check', action: () => setActiveView('comprobantes') },
            { label: 'Comprobantes de Diario', icon: 'ri-file-text-line', action: () => setActiveView('comprobantes') },
            { label: 'Libro Mayor y Balance', icon: 'ri-booklet-line', action: () => setActiveView('comprobantes') },
            { label: 'Cierre de Periodo', icon: 'ri-calendar-check-line', action: () => setActiveView('comprobantes') },
          ]
        },
        {
          id: 'bancos',
          title: 'Bancos & Tesorería',
          subtitle: 'Cuentas bancarias y conciliación',
          icon: 'ri-bank-card-fill',
          mainAction: () => setActiveView('bancos'),
          links: [
            { label: 'Cuentas Bancarias', icon: 'ri-bank-line', action: () => setActiveView('bancos') },
            { label: 'Extractos y Movimientos', icon: 'ri-exchange-dollar-line', action: () => setActiveView('bancos') },
            { label: 'Conciliación Bancaria', icon: 'ri-checkbox-circle-line', action: () => setActiveView('bancos') },
          ]
        },
        {
          id: 'cartera',
          title: 'Cartera & Cobranzas',
          subtitle: 'Cuentas por cobrar y vencimiento',
          icon: 'ri-wallet-3-fill',
          mainAction: () => setActiveView('cartera'),
          links: [
            { label: 'Cuentas por Cobrar', icon: 'ri-hand-coin-line', action: () => setActiveView('cartera') },
            { label: 'Antigüedad de Saldos', icon: 'ri-time-line', action: () => setActiveView('cartera') },
          ]
        },
        {
          id: 'reportes',
          title: 'Reportes & Impuestos DIAN',
          subtitle: 'IVA, retenciones y estado PyG',
          icon: 'ri-bar-chart-2-fill',
          mainAction: () => setActiveView('impuestos'),
          links: [
            { label: 'Reporte PDF Ventas & Rentabilidad', icon: 'ri-file-pdf-line', action: () => setIsSalesReportModalOpen(true) },
            { label: 'Declaración Impuestos DIAN', icon: 'ri-government-line', action: () => setActiveView('impuestos') },
            { label: 'Balance General', icon: 'ri-scales-3-line', action: () => setActiveView('comprobantes') },
            { label: 'Estado de Resultados (PyG)', icon: 'ri-line-chart-line', action: () => setActiveView('presupuestos') },
            { label: 'Presupuestos de Operación', icon: 'ri-pie-chart-line', action: () => setActiveView('presupuestos') },
          ]
        },
        {
          id: 'flujo_caja',
          title: 'Flujo de Caja & Tendencias',
          subtitle: 'Gráficos comparativos y proyección financiera',
          icon: 'ri-line-chart-fill',
          mainAction: () => setViewMode('cashflow'),
          links: [
            { label: 'Ver Gráfica Diaria / Semanal', icon: 'ri-line-chart-line', action: () => setViewMode('cashflow') },
            { label: 'Bancos y Conciliación', icon: 'ri-bank-card-line', action: () => setActiveView('bancos') },
          ]
        }
      ]
    },
    {
      id: 'rrhh',
      name: 'Nómina & Talento Humano',
      catColor: '#10B981', // Verde
      icon: 'ri-user-heart-line',
      accentColor: 'text-rose-500',
      badgeBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      tagColor: 'bg-rose-500',
      cards: [
        {
          id: 'nomina',
          title: 'Nómina Electrónica & RRHH',
          subtitle: 'Liquidación quincenal, SMMLV y pila',
          icon: 'ri-user-heart-fill',
          mainAction: () => setActiveView('nomina'),
          links: [
            { label: 'Liquidación de Nómina', icon: 'ri-money-dollar-circle-line', action: () => setActiveView('nomina') },
            { label: 'Empleados y Contratos', icon: 'ri-user-star-line', action: () => setActiveView('nomina') },
            { label: 'Novedades y Horas Extra', icon: 'ri-time-line', action: () => setActiveView('nomina') },
            { label: 'Seguridad Social (PILA)', icon: 'ri-shield-user-line', action: () => setActiveView('nomina') },
          ]
        }
      ]
    },
    {
      id: 'gestion',
      name: 'Inteligencia AI & Configuración',
      catColor: '#D946EF', // Magenta
      icon: 'ri-settings-4-line',
      accentColor: 'text-fuchsia-500',
      badgeBg: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20',
      tagColor: 'bg-fuchsia-500',
      cards: [
        {
          id: 'ai_advisor',
          title: 'AI Asesor Financiero',
          subtitle: 'Diagnóstico contable con IA',
          icon: 'ri-sparkling-fill',
          mainAction: () => setActiveView('ai_advisor'),
          links: [
            { label: 'Diagnóstico Financiero', icon: 'ri-pulse-line', action: () => setActiveView('ai_advisor') },
            { label: 'Proyección Flujo de Caja', icon: 'ri-line-chart-line', action: () => setActiveView('ai_advisor') },
          ]
        },
        {
          id: 'configuracion',
          title: 'Configuración & Usuarios',
          subtitle: 'Empresa, permisos y seguridad',
          icon: 'ri-settings-4-fill',
          mainAction: () => setActiveView('empresa'),
          links: [
            { label: 'Datos de Empresa', icon: 'ri-building-line', action: () => setActiveView('empresa') },
            { label: 'Usuarios y Roles', icon: 'ri-user-settings-line', action: () => setActiveView('usuarios') },
            { label: 'Parámetros e Impuestos', icon: 'ri-percent-line', action: () => setActiveView('impuestos') },
          ]
        }
      ]
    }
  ], [isProductionActive, setActiveView]);

  // Filter categories according to selected category tab and search query
  const displayedCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    
    let base = categories;
    if (selectedCategory !== 'all') {
      base = base.filter(c => c.id === selectedCategory);
    }

    if (!q) return base;

    return base.map(category => {
      const filteredCards = category.cards.filter(card => {
        const matchTitle = card.title.toLowerCase().includes(q);
        const matchSub = card.subtitle.toLowerCase().includes(q);
        const matchLinks = card.links?.some(l => l.label.toLowerCase().includes(q));
        const matchCat = category.name.toLowerCase().includes(q);
        return matchTitle || matchSub || matchLinks || matchCat;
      });
      return {
        ...category,
        cards: filteredCards
      };
    }).filter(category => category.cards.length > 0);
  }, [categories, selectedCategory, searchQuery]);

  const totalCardsCount = useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.cards.length, 0);
  }, [categories]);

  return (
    <div className="space-y-4 select-none max-w-7xl mx-auto w-full">
      
      {/* Top Controller Bar: View Switcher & Stock Alert Badge */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b ${
        isLight ? 'border-slate-300' : 'border-black/5 dark:border-white/5'
      }`}>
        <div className="flex flex-wrap items-center gap-1.5">
          {viewMode === 'menu' ? (
            <div className="flex items-center gap-2 px-1">
              <span className={`w-2 h-2 rounded-full ${isLight ? 'bg-blue-600 shadow-[0_0_8px_#2563eb]' : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'}`}></span>
              <span className={`text-xs uppercase tracking-wider font-mono ${
                isLight ? 'text-slate-950 font-black' : 'text-slate-300 font-bold'
              }`}>
                Módulos de Gestión Empresarial
              </span>
            </div>
          ) : (
            <button
              onClick={() => setViewMode('menu')}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <i className="ri-arrow-left-line text-xs"></i>
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Volver al Menú Principal</span>
            </button>
          )}
        </div>

        {/* Actions: PDF Sales Report & Global Privacy Toggle */}
        <div className="flex items-center gap-2">
          {/* PDF Sales & Operating Margins Report Button */}
          <button
            onClick={() => setIsSalesReportModalOpen(true)}
            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isLight
                ? 'bg-white text-slate-950 border border-slate-300 hover:bg-slate-100 shadow-xs'
                : 'bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 hover:border-sky-500/50 shadow-sm'
            }`}
            title="Generar y exportar reporte en PDF de ventas y márgenes operativos (jsPDF)"
          >
            <FileText className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-sky-400'}`} />
            <span>Reporte PDF Ventas</span>
          </button>

          {/* Excel Sales & Operating Margins Report Button */}
          <button
            onClick={() => exportDashboardSalesToExcel(vouchers, terceros, products, currentCompany)}
            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isLight
                ? 'bg-white text-emerald-950 border border-slate-300 hover:bg-slate-100 shadow-xs'
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 shadow-sm'
            }`}
            title="Exportar reporte ejecutivo de ventas, márgenes y KPIs a Excel (.xlsx)"
            id="export-dashboard-excel-btn"
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
            <span>Reporte Excel Ventas</span>
          </button>

          <button
            onClick={toggleMetricsVisibility}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isLight
                ? 'bg-white text-slate-950 border-slate-300 hover:bg-slate-100 shadow-xs'
                : isMetricsVisible
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-blue-500/10 text-cyan-300 border-blue-500/30 hover:bg-blue-500/20'
            }`}
            title="Activar o desactivar visibilidad de las tarjetas de cifras financieras"
          >
            {isMetricsVisible ? (
              <>
                <Eye className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                <span>Cifras Visibles</span>
              </>
            ) : (
              <>
                <EyeOff className={`w-3 h-3 ${isLight ? 'text-slate-700' : 'text-cyan-300'}`} />
                <span>Cifras Protegidas</span>
              </>
            )}
          </button>
        </div>
      </div>

      {viewMode === 'menu' ? (
        <>
          {/* ======================================================== */}
          {/* GRAND HERO PORTAL BANNER: "Bienvenido a FinteKia"        */}
          {/* Royal Sapphire Blue + 3D Metallic Silver Chrome Finish    */}
          {/* ======================================================== */}
          <div 
            className={`relative rounded-3xl overflow-hidden shadow-2xl p-7 sm:p-9 lg:p-10 select-none ${
              isLight ? 'border-2' : ''
            }`}
            style={isLight ? {
              background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 45%, #f1f5f9 100%)',
              border: '2px solid #cbd5e1',
              boxShadow: 'inset 0 2px 3px rgba(255, 255, 255, 0.95), 0 10px 25px -5px rgba(15, 23, 42, 0.12)'
            } : {
              background: 'radial-gradient(ellipse 120% 90% at 50% 10%, #0d3b6f 0%, #07254b 38%, #031633 72%, #010c1c 100%)',
              border: '2px solid rgba(226, 232, 240, 0.5)',
              boxShadow: 'inset 0 2px 3px rgba(255, 255, 255, 0.5), inset 0 -2px 3px rgba(0, 0, 0, 0.8), 0 25px 50px -10px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.2)'
            }}
          >
            {/* Ambient Reflections (Attenuated in Light Gray) */}
            {!isLight && (
              <>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sky-400/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -top-10 left-10 w-72 h-72 bg-slate-100/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-10 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
              </>
            )}

            {/* Top Specular Silver Hairline */}
            <div className={`absolute inset-x-0 top-0 h-px pointer-events-none ${
              isLight ? 'bg-gradient-to-r from-transparent via-white to-transparent' : 'bg-gradient-to-r from-transparent via-white/80 to-transparent'
            }`} />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Column: Greeting & Grand Identity with 3D Chrome Text Effect */}
              <div className="max-w-2xl">
                <span 
                  className={`text-xs font-black tracking-[0.2em] uppercase font-mono block ${
                    isLight ? 'text-slate-700' : 'text-slate-300 drop-shadow-sm'
                  }`}
                >
                  Bienvenido a
                </span>
                
                {/* FINTEKIA: High-contrast title that never gets covered by unclipped background boxes */}
                <h2 
                  className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mt-1 font-sans select-none ${
                    isLight 
                      ? 'text-slate-950' 
                      : 'text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)]'
                  }`}
                >
                  FinteKia
                </h2>

                <p 
                  className={`text-sm sm:text-base mt-2 leading-relaxed ${
                    isLight 
                      ? 'text-slate-900 font-bold' 
                      : 'text-slate-200/90 font-medium'
                  }`}
                  style={isLight ? {} : { textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                >
                  Control total de tu negocio, en un solo lugar. Módulos de gestión organizados por categorías.
                </p>
              </div>

              {/* Right Column: Laptop Widget */}
              <div className="hidden lg:flex items-center justify-center shrink-0">
                <div 
                  className="relative w-72 h-40 rounded-2xl p-3.5 backdrop-blur-md overflow-hidden flex flex-col justify-between"
                  style={isLight ? {
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
                  } : {
                    background: 'radial-gradient(ellipse at 50% 20%, #0d2c52 0%, #061933 65%, #020c1a 100%)',
                    border: '1.5px solid rgba(226, 232, 240, 0.45)',
                    boxShadow: 'inset 0 1.5px 2px rgba(255, 255, 255, 0.4), inset 0 -1.5px 2px rgba(0, 0, 0, 0.8), 0 20px 35px -10px rgba(0, 0, 0, 0.85)'
                  }}
                >
                  <div className={`flex items-center justify-between pb-1.5 ${isLight ? 'border-b border-slate-200' : 'border-b border-slate-600/50'}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500/80 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                      <span className="w-2 h-2 rounded-full bg-amber-500/80 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                      <span className="w-2 h-2 rounded-full bg-emerald-500/80 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                    </div>
                    <span 
                      className={`text-[9.5px] font-mono font-black tracking-widest ${
                        isLight ? 'text-slate-950 font-black' : 'text-slate-200 drop-shadow-sm'
                      }`}
                    >
                      FINTEKIA LIVE
                    </span>
                  </div>

                  {/* Attenuated decorative bars */}
                  <div className="flex items-end justify-between h-16 px-1.5 pt-1.5 gap-2 opacity-85">
                    <div className={`w-full rounded-t h-[40%] relative overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-700/40'}`}>
                      <div className="absolute inset-x-0 bottom-0 bg-sky-500/70 h-full rounded-t" />
                    </div>
                    <div className={`w-full rounded-t h-[65%] relative overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-700/40'}`}>
                      <div className="absolute inset-x-0 bottom-0 bg-sky-400/80 h-full rounded-t" />
                    </div>
                    <div className={`w-full rounded-t h-[50%] relative overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-700/40'}`}>
                      <div className="absolute inset-x-0 bottom-0 bg-indigo-500/70 h-full rounded-t" />
                    </div>
                    <div className={`w-full rounded-t h-[85%] relative overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-700/40'}`}>
                      <div className="absolute inset-x-0 bottom-0 bg-emerald-500/80 h-full rounded-t" />
                    </div>
                    <div className={`w-full rounded-t h-[100%] relative overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-700/40'}`}>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-blue-600 via-sky-400 to-sky-200 h-full rounded-t shadow-[0_0_12px_rgba(37,99,235,0.5)]" />
                    </div>
                  </div>

                  {/* Discrete status */}
                  <div className={`flex items-center justify-between text-[8px] font-mono pt-1 ${isLight ? 'border-t border-slate-200 text-slate-700' : 'border-t border-slate-700/60 text-slate-300'}`}>
                    <span className="font-bold tracking-wider">DIAN 2026</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                      <span className={isLight ? "text-emerald-800 font-black" : "text-emerald-300 font-bold"}>Sistema Activo</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* 5 METRIC CARDS WITH PRIVACY / CONFIDENTIALITY SHIELD    */}
            {/* ======================================================== */}
            <div className={`mt-5 pt-4 border-t ${isLight ? 'border-slate-300' : 'border-slate-700/60'}`}>
              
              {!isMetricsVisible ? (
                /* PRIVACY SHIELD: Compact Single-line Bar */
                <div 
                  className="px-3.5 py-2 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  style={isLight ? {
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)'
                  } : {
                    background: 'linear-gradient(90deg, rgba(7, 24, 51, 0.85) 0%, rgba(13, 38, 77, 0.75) 50%, rgba(7, 24, 51, 0.85) 100%)',
                    border: '1.5px solid rgba(203, 213, 225, 0.4)',
                    boxShadow: 'inset 0 1.5px 2px rgba(255, 255, 255, 0.35), inset 0 -1.5px 2px rgba(0, 0, 0, 0.7), 0 8px 20px rgba(0, 0, 0, 0.6)'
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 ${
                        isLight ? 'bg-slate-100 border border-slate-300 text-slate-800' : ''
                      }`}
                      style={isLight ? {} : {
                        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(14, 165, 233, 0.15) 100%)',
                        border: '1px solid rgba(226, 232, 240, 0.4)',
                        boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)'
                      }}
                    >
                      <EyeOff className={`w-3.5 h-3.5 ${isLight ? 'text-slate-800' : 'text-sky-200'}`} />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span 
                        className={`text-xs tracking-tight truncate ${
                          isLight ? 'text-slate-950 font-black' : 'text-slate-100 font-bold'
                        }`}
                      >
                        Tarjetas Financieras Protegidas
                      </span>
                      <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        isLight 
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-black'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                      }`}>
                        Modo Privado
                      </span>
                      <span className={`hidden md:inline text-[11px] truncate ${
                        isLight ? 'text-slate-700 font-semibold' : 'text-slate-300/80'
                      }`}>
                        — Cifras confidenciales ocultas a terceros
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsMetricsVisible(true)}
                    id="reveal-metric-cards-btn"
                    style={isLight ? {} : {
                      border: '1.5px solid rgba(255, 255, 255, 0.6)',
                      boxShadow: 'inset 0 1.5px 2px rgba(255, 255, 255, 0.6), 0 0 20px rgba(56, 189, 248, 0.5)'
                    }}
                    className={`px-3.5 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 self-end sm:self-auto ${
                      isLight 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        : 'bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 hover:from-white hover:to-sky-400 text-slate-950'
                    }`}
                  >
                    <Eye className={`w-3.5 h-3.5 ${isLight ? 'text-white' : 'text-slate-950'}`} />
                    <span>Revelar tarjetas de métricas</span>
                  </button>
                </div>
              ) : (
                /* REVEALED STATE: Rich grid of 5 metric cards */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 text-xs font-bold ${
                      isLight ? 'text-slate-950 font-black' : 'text-blue-200'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Métricas de Negocio en Tiempo Real</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => setShowInlineCashFlow(!showInlineCashFlow)}
                        className={`text-[10px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all border cursor-pointer font-bold ${
                          showInlineCashFlow
                            ? isLight 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-sky-500/25 text-white border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.3)] font-bold'
                            : isLight
                              ? 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300'
                              : 'bg-black/20 hover:bg-black/30 text-blue-200 border-white/10'
                        }`}
                        title="Ver gráfico de líneas de tendencia y flujo de caja con recharts"
                      >
                        <TrendingUp className={`w-3 h-3 ${isLight ? (showInlineCashFlow ? 'text-white' : 'text-blue-600') : 'text-cyan-300'}`} />
                        <span>{showInlineCashFlow ? "Ocultar Gráfico" : "Gráfico Flujo de Caja"}</span>
                      </button>

                      <button
                        onClick={() => setMaskAmounts(!maskAmounts)}
                        className={`text-[10px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all border cursor-pointer font-bold ${
                          isLight
                            ? 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300'
                            : 'bg-black/20 hover:bg-black/30 text-blue-200 hover:text-white border-white/10'
                        }`}
                        title={maskAmounts ? "Mostrar cifras reales" : "Ocultar cifras con puntos"}
                      >
                        {maskAmounts ? <Eye className={`w-3 h-3 ${isLight ? 'text-blue-600' : 'text-cyan-300'}`} /> : <EyeOff className={`w-3 h-3 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} />}
                        <span>{maskAmounts ? "Revelar Números" : "Enmascarar"}</span>
                      </button>

                      <button
                        onClick={() => setIsMetricsVisible(false)}
                        className={`text-[10px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all border cursor-pointer font-bold ${
                          isLight
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/30'
                        }`}
                        title="Ocultar las tarjetas de nuevo para proteger la privacidad"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Ocultar Tarjetas</span>
                      </button>
                    </div>
                  </div>

                  {/* 5 Cards Row with Metallic Borders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {metricCards.map((card) => (
                      <div
                        key={card.id}
                        className="rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl text-slate-800"
                        style={{
                          background: 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)',
                          border: '1.5px solid rgba(203, 213, 225, 0.8)',
                          boxShadow: 'inset 0 1.5px 2px rgba(255, 255, 255, 0.9), 0 8px 20px -6px rgba(15, 23, 42, 0.3)'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 border ${card.iconColor}`}>
                            <i className={card.icon}></i>
                          </div>
                          <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                            {card.trend}
                          </span>
                        </div>

                        <div className="mt-2.5">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                            {card.title}
                          </p>
                          <p className="text-base font-black text-slate-900 tracking-tight mt-0.5 truncate font-sans">
                            {maskAmounts && card.id !== 'inventario' && card.id !== 'clientes' && card.id !== 'proveedores'
                              ? '$ ••••••••'
                              : card.value}
                          </p>
                        </div>

                        {/* Sparkline trend curve representation */}
                        <div className="mt-2 h-4 flex items-end">
                          <svg className="w-full h-3.5 overflow-visible" viewBox="0 0 100 25" preserveAspectRatio="none">
                            <path
                              d="M0,20 Q20,15 35,18 T70,8 T100,4"
                              fill="none"
                              stroke={card.sparklineColor}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Inline Recharts Data Visualization Line Chart */}
                  <AnimatePresence>
                    {showInlineCashFlow && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="pt-2 overflow-hidden"
                      >
                        <CashFlowTrendChart
                          vouchers={vouchers}
                          salesVal={salesVal}
                          purchasesVal={purchasesVal}
                          formatCOP={formatCOP}
                          onNavigateToFacturacion={() => setActiveView('facturacion')}
                          onNavigateToCompras={() => setActiveView('compras')}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* CATEGORY SELECTOR & DENSITY BAR (UNIFORM & ALIGNED)       */}
          {/* Sleek single-height bar, concise badges, no awkward wraps  */}
          {/* ======================================================== */}
          <div className={`flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 p-2 rounded-2xl shadow-sm ${
            isLight ? 'bg-slate-200/90 border border-slate-300' : 'bg-slate-900/90 border border-slate-700/80'
          }`}>
            
            {/* Filter Pills with Uniform Height & Clean Concise Labels */}
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`h-8 px-3 rounded-xl text-xs transition-all cursor-pointer font-bold border flex items-center gap-1.5 shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-1 ring-blue-500/30'
                    : isLight
                      ? 'bg-white text-slate-950 hover:bg-slate-100 border-slate-300 font-bold'
                      : 'bg-slate-950/60 text-slate-300 hover:text-white border-slate-700/70 hover:border-slate-500'
                }`}
              >
                <i className="ri-apps-2-line text-xs"></i>
                <span>Todas</span>
                <span className="text-[10.5px] font-mono opacity-85">({totalCardsCount})</span>
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const shortLabel = 
                  cat.id === 'tecnologia' ? 'Tecnología' :
                  cat.id === 'comercial' ? 'Comercial' :
                  cat.id === 'operaciones' ? 'Inventario' :
                  cat.id === 'finanzas' ? 'Contabilidad' :
                  cat.id === 'nomina' ? 'Nómina' :
                  cat.id === 'gestion' ? 'Inteligencia' :
                  cat.name.split(',')[0].split('&')[0].trim();

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={
                      isSelected
                        ? {
                            backgroundColor: cat.catColor,
                            borderColor: '#FFFFFF',
                            color: '#FFFFFF'
                          }
                        : undefined
                    }
                    className={`h-8 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border shrink-0 ${
                      isSelected
                        ? 'text-white shadow-md ring-1 ring-white/30'
                        : isLight
                          ? 'bg-white text-slate-950 hover:bg-slate-100 border-slate-300 font-bold'
                          : 'bg-slate-950/60 text-slate-300 hover:text-white border-slate-700/70 hover:border-slate-500'
                    }`}
                  >
                    <i className={`${cat.icon} text-xs`}></i>
                    <span>{shortLabel}</span>
                    <span className="text-[10.5px] font-mono opacity-85">({cat.cards.length})</span>
                  </button>
                );
              })}
            </div>

            {/* Density Selector & Desplegar / Recoger Button (Always 1 single horizontal row) */}
            <div className="flex items-center gap-2 shrink-0 self-end xl:self-center">
              {/* Desplegar Todos (all categories) vs Recoger Todos (compact single category) */}
              <button
                onClick={() => setSelectedCategory(selectedCategory === 'all' ? 'comercial' : 'all')}
                className={`h-8 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0 ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-950 hover:bg-slate-100'
                    : selectedCategory === 'all'
                      ? 'bg-slate-950/80 border-slate-700 text-amber-300 hover:text-white hover:border-slate-500'
                      : 'bg-slate-950/80 border-slate-700 text-cyan-300 hover:text-white hover:border-slate-500'
                }`}
                title={selectedCategory === 'all' ? "Recoger menú (mostrar solo una categoría compacta)" : "Desplegar todos los módulos de todas las categorías"}
              >
                <i className={selectedCategory === 'all' ? "ri-arrow-up-s-line text-sm" : "ri-arrow-down-s-line text-sm"}></i>
                <span>{selectedCategory === 'all' ? 'Recoger Todos' : 'Desplegar Todos'}</span>
              </button>

              {/* Density Toggle Group */}
              <div className={`h-8 flex items-center gap-1 p-0.5 px-1.5 rounded-xl border text-xs shadow-xs shrink-0 ${
                isLight ? 'bg-white border-slate-300' : 'bg-slate-950/80 border-slate-700/80'
              }`}>
                <span className={`text-[10px] font-mono font-medium px-1 ${isLight ? 'text-slate-600 font-bold' : 'text-slate-400'}`}>Tamaño:</span>
                <button
                  onClick={() => handleSetCardDensity('mini')}
                  className={`h-6.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    cardDensity === 'mini'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                        ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Tarjetas ultra compactas (48px de alto)"
                >
                  <i className="ri-layout-grid-line text-xs"></i>
                  <span>Mini</span>
                </button>
                <button
                  onClick={() => handleSetCardDensity('normal')}
                  className={`h-6.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    cardDensity === 'normal'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                        ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Tarjetas cuadrícula mediana"
                >
                  <i className="ri-grid-fill text-xs"></i>
                  <span>Mediana</span>
                </button>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* CATEGORIZED MODULES (HIGH-CONTRAST MODERN CARDS)        */}
          {/* Crisp pure black titles, dark legible subtitles          */}
          {/* ======================================================== */}
          <div className="space-y-4 pt-1">
            {displayedCategories.map((category) => (
              <div key={category.id} className="space-y-2">
                
                {/* Section Header with High Contrast */}
                <div className={`flex items-center justify-between pb-1.5 border-b ${
                  isLight ? 'border-slate-300' : 'border-slate-700/60'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_var(--cat-color)] shrink-0" 
                      style={{ backgroundColor: category.catColor }} 
                    />
                    <h4 
                      className={`text-xs uppercase font-mono tracking-[0.1em] ${
                        isLight ? 'text-slate-950 font-black' : 'text-white font-black drop-shadow-xs'
                      }`}
                    >
                      {category.name}
                    </h4>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                    isLight 
                      ? 'text-slate-950 bg-slate-200 border-slate-300 font-black'
                      : 'text-sky-200/90 bg-sky-950/70 border-sky-700/40'
                  }`}>
                    {category.cards.length} {category.cards.length === 1 ? 'módulo' : 'módulos'}
                    <i className="ri-arrow-down-s-line text-xs"></i>
                  </span>
                </div>

                {/* Cards Grid: Mini/Small (48-50px) vs Normal (64px) */}
                <div className={
                  cardDensity === 'mini'
                    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2.5"
                    : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3"
                }>
                  {category.cards.map((mod) => {
                    const isPopoverOpen = openPopoverId === mod.id;

                    return (
                      <div 
                        key={mod.id} 
                        className="relative group/card"
                        style={{ '--cat-color': category.catColor } as React.CSSProperties}
                      >
                        
                        {/* Entire card is clickable with High-Contrast Typography */}
                        <button
                          type="button"
                          onClick={mod.mainAction}
                          style={isLight ? {
                            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                            border: '1.5px solid #cbd5e1',
                            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
                          } : {
                            background: 'radial-gradient(ellipse 130% 100% at 50% 0%, #0d315f 0%, #072042 60%, #041226 100%)',
                            border: '1.5px solid rgba(203, 213, 225, 0.5)',
                            boxShadow: 'inset 0 1.5px 1.5px rgba(255, 255, 255, 0.5), inset 0 -1.5px 1.5px rgba(0, 0, 0, 0.75), 0 4px 14px rgba(0, 0, 0, 0.65)',
                          }}
                          className={`w-full ${
                            cardDensity === 'mini' ? 'px-3 py-2 min-h-[50px] sm:min-h-[52px]' : 'p-3.5 min-h-[66px]'
                          } rounded-[12px] text-left flex items-center justify-between gap-2.5 cursor-pointer select-none transition-all duration-150 ${
                            isLight
                              ? 'hover:-translate-y-[2px] hover:border-blue-600 hover:shadow-md hover:bg-slate-50'
                              : 'hover:-translate-y-[2px] hover:border-white hover:shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.8),0_0_22px_rgba(56,189,248,0.45),0_8px_25px_-4px_rgba(0,0,0,0.85)]'
                          } focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2`}
                          title={`Abrir módulo de ${mod.title}`}
                        >
                          {/* Left: Icon Box + High-Contrast Black Title & Dark Subtitle */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div 
                              className={`${
                                cardDensity === 'mini' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm'
                              } rounded-lg flex items-center justify-center shrink-0 transition-transform duration-150`}
                              style={isLight ? {
                                background: 'linear-gradient(145deg, #f1f5f9 0%, #e2e8f0 100%)',
                                border: '1px solid #cbd5e1',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                color: category.catColor
                              } : {
                                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.2) 0%, rgba(148, 163, 184, 0.1) 100%)',
                                border: '1px solid rgba(226, 232, 240, 0.55)',
                                boxShadow: 'inset 0 1px 1.5px rgba(255, 255, 255, 0.45), 0 2px 6px rgba(0, 0, 0, 0.5)',
                                color: category.catColor
                              }}
                            >
                              <i className={mod.icon}></i>
                            </div>
                            
                            <div className="min-w-0">
                              {/* High-Contrast Title: Pure black in Light mode */}
                              <h5 
                                className={`font-black text-xs sm:text-[12.5px] tracking-tight truncate leading-snug ${
                                  isLight ? 'text-slate-950 font-black' : 'text-white font-bold drop-shadow-xs'
                                }`}
                              >
                                {mod.title}
                              </h5>
                              {/* Subtitle with High Legibility */}
                              <p 
                                className={`text-[11px] sm:text-[11.5px] font-bold truncate block leading-tight mt-0.5 ${
                                  isLight ? 'text-slate-700' : 'text-sky-200/90'
                                }`}
                              >
                                {mod.subtitle}
                              </p>
                            </div>
                          </div>

                          {/* Right: Controls (3-dots button & arrow) */}
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 [@media(hover:none)]:opacity-60 transition-opacity duration-150">
                            {mod.links && mod.links.length > 0 && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenPopoverId(isPopoverOpen ? null : mod.id);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setOpenPopoverId(isPopoverOpen ? null : mod.id);
                                  }
                                }}
                                className={`${
                                  cardDensity === 'mini' ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs'
                                } rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                                  isLight 
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                    : 'bg-white/15 hover:bg-white/30 text-white'
                                }`}
                                style={isLight ? {} : {
                                  border: '1px solid rgba(226, 232, 240, 0.4)',
                                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.3)'
                                }}
                                title="Ver accesos rápidos de este módulo"
                              >
                                <i className="ri-more-2-fill"></i>
                              </span>
                            )}
                            <i 
                              className={`ri-arrow-right-s-line transition-colors ${
                                cardDensity === 'mini' ? 'text-sm' : 'text-base'
                              } ${
                                isLight 
                                  ? 'text-slate-600 group-hover/card:text-blue-600' 
                                  : 'text-sky-200 group-hover/card:text-white'
                              }`}
                              style={isLight ? {} : { filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.8))' }}
                            ></i>
                          </div>
                        </button>

                        {/* Floating Popover Menu for Sub-links */}
                        <AnimatePresence>
                          {isPopoverOpen && mod.links && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              transition={{ duration: 0.12 }}
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute right-0 top-full mt-1 w-52 p-1.5 rounded-xl shadow-2xl space-y-0.5 z-40 border ${
                                isLight 
                                  ? 'bg-white border-slate-300 text-slate-900 shadow-xl' 
                                  : 'bg-[#0c1424] border-white/10 text-white'
                              }`}
                            >
                              <div className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider border-b ${
                                isLight ? 'text-slate-500 border-slate-200 font-bold' : 'text-white/40 border-white/5'
                              }`}>
                                Atajos de {mod.title}
                              </div>
                              {mod.links.map((link, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    link.action();
                                    setOpenPopoverId(null);
                                  }}
                                  className={`w-full flex items-center justify-between p-1.5 rounded-lg text-[10.5px] font-medium transition-colors cursor-pointer text-left ${
                                    isLight
                                      ? 'hover:bg-slate-100 text-slate-800 hover:text-slate-950 font-bold'
                                      : 'hover:bg-white/10 text-white/80 hover:text-white'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    <i className={`${link.icon} text-xs ${isLight ? 'text-slate-500' : 'text-white/40'}`}></i>
                                    <span className="truncate">{link.label}</span>
                                  </span>
                                  <i className={`ri-arrow-right-s-line text-[9px] ${isLight ? 'text-slate-400' : 'text-white/40'}`}></i>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ======================================================== */}
          {/* THE 3 BOTTOM TRUST & STATUS BANNERS                      */}
          {/* Compact, slim, horizontal cards                          */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
            
            {/* Banner 1: Cumple con la DIAN */}
            <div className={`rounded-xl p-3 border shadow-xs flex items-center justify-between gap-3 ${
              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900/90 border-white/10 text-white'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-sm shrink-0 shadow-xs">
                  <i className="ri-check-line font-bold"></i>
                </div>
                <div className="min-w-0">
                  <h4 className={`font-black text-xs leading-tight ${isLight ? 'text-slate-950' : 'text-white'}`}>
                    Cumple con la DIAN
                  </h4>
                  <p className={`text-[10px] truncate leading-tight mt-0.5 ${isLight ? 'text-slate-700 font-semibold' : 'text-white/55'}`}>
                    Facturas electrónicas vigentes 2026
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveView('facturacion')}
                className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                  isLight 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' 
                    : 'bg-blue-900/80 hover:bg-blue-800 text-white border border-blue-700/50'
                }`}
              >
                <span>Configurar</span>
                <i className="ri-arrow-right-line text-[9px]"></i>
              </button>
            </div>

            {/* Banner 2: Tu negocio en crecimiento */}
            <div className={`rounded-xl p-3 border shadow-xs flex items-center justify-between gap-3 ${
              isLight 
                ? 'bg-white border-slate-300 text-slate-900' 
                : 'bg-gradient-to-r from-blue-950 to-slate-900 text-white border-blue-900/50'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                  isLight ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-white/10 text-white border border-white/10'
                }`}>
                  <i className="ri-bar-chart-grouped-line"></i>
                </div>
                <div className="min-w-0">
                  <h4 className={`font-black text-xs leading-tight ${isLight ? 'text-slate-950' : 'text-white'}`}>
                    Negocio en Crecimiento
                  </h4>
                  <p className={`text-[10px] truncate leading-tight mt-0.5 ${isLight ? 'text-slate-700 font-semibold' : 'text-white/55'}`}>
                    Información financiera al instante
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewMode('cashflow')}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[9.5px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Flujo de Caja</span>
                <i className="ri-arrow-right-line text-[9px]"></i>
              </button>
            </div>

            {/* Banner 3: Respaldo en la nube */}
            <div className={`rounded-xl p-3 border shadow-xs flex items-center justify-between gap-3 ${
              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900/90 border-white/10 text-white'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm shrink-0 shadow-xs">
                  <i className="ri-cloud-line"></i>
                </div>
                <div className="min-w-0">
                  <h4 className={`font-black text-xs leading-tight ${isLight ? 'text-slate-950' : 'text-white'}`}>
                    Respaldo en la Nube
                  </h4>
                  <p className={`text-[10px] truncate leading-tight mt-0.5 ${isLight ? 'text-slate-700 font-semibold' : 'text-white/55'}`}>
                    Sincronización segura continua
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                isLight 
                  ? 'text-emerald-900 bg-emerald-100 border-emerald-300 font-black'
                  : 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
              }`}>
                <i className="ri-checkbox-circle-fill text-[10px]"></i>
                <span>En línea</span>
              </div>
            </div>
          </div>
        </>
      ) : viewMode === 'cashflow' ? (
        /* ======================================================== */
        /* DEDICATED DATA VISUALIZATION TAB (RECHARTS LINE CHART)   */
        /* ======================================================== */
        <div className="space-y-4">
          <CashFlowTrendChart
            vouchers={vouchers}
            salesVal={salesVal}
            purchasesVal={purchasesVal}
            formatCOP={formatCOP}
            onNavigateToFacturacion={() => setActiveView('facturacion')}
            onNavigateToCompras={() => setActiveView('compras')}
          />

          {/* Quick Summary Cards & Operations Direct Access */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`p-4 rounded-xl border shadow-xs space-y-2 ${
              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900/90 border-slate-700/80'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400">
                <span className="flex items-center gap-1.5">
                  <i className="ri-file-text-line"></i>
                  <span>Facturación Electrónica (Tercero)</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${
                  isLight ? 'bg-sky-50 text-sky-800 border-sky-300 font-bold' : 'bg-sky-500/10 text-sky-300 border-sky-400/20'
                }`}>
                  Operativo
                </span>
              </div>
              <p className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                Total Facturado: <strong className={`font-mono ${isLight ? 'text-slate-950 font-black' : 'text-white'}`}>{formatCOP(salesVal)}</strong>
              </p>
              <p className={`text-[11px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                Comprobantes de venta sincronizados con el calendario del mes.
              </p>
              <button
                onClick={() => setActiveView('facturacion')}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 mt-1 ${
                  isLight 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' 
                    : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/30'
                }`}
              >
                <span>Ir al Módulo de Facturación</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className={`p-4 rounded-xl border shadow-xs space-y-2 ${
              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900/90 border-slate-700/80'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400">
                <span className="flex items-center gap-1.5">
                  <i className="ri-truck-line"></i>
                  <span>Compras & Egresos</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${
                  isLight ? 'bg-rose-50 text-rose-800 border-rose-300 font-bold' : 'bg-rose-500/10 text-rose-300 border-rose-400/20'
                }`}>
                  Controlado
                </span>
              </div>
              <p className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                Total Gastos: <strong className={`font-mono ${isLight ? 'text-slate-950 font-black' : 'text-white'}`}>{formatCOP(purchasesVal)}</strong>
              </p>
              <p className={`text-[11px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                Adquisiciones de materias primas y pagos a proveedores nacionales.
              </p>
              <button
                onClick={() => setActiveView('compras')}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 mt-1 ${
                  isLight 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs' 
                    : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30'
                }`}
              >
                <span>Ir al Módulo de Compras</span>
                <ArrowDownRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className={`p-4 rounded-xl border shadow-xs space-y-2 ${
              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900/90 border-slate-700/80'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <i className="ri-wallet-3-line"></i>
                  <span>Tesorería & Bancos</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${
                  isLight ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold' : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20'
                }`}>
                  Disponible
                </span>
              </div>
              <p className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                Flujo Neto: <strong className={`font-mono ${isLight ? 'text-emerald-800 font-black' : 'text-emerald-300'}`}>+{formatCOP(salesVal - purchasesVal)}</strong>
              </p>
              <p className={`text-[11px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                Superávit operacional positivo para reinversión en inventario.
              </p>
              <button
                onClick={() => setActiveView('bancos')}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 mt-1 ${
                  isLight 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' 
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                }`}
              >
                <span>Conciliación Bancaria</span>
                <i className="ri-arrow-right-line text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* ANALYTICS & STOCK ALERT TAB VIEW                         */
        /* ======================================================== */
        <div className="space-y-4">
          {/* Recharts Cash Flow Trend Chart also shown in analytics view */}
          <CashFlowTrendChart
            vouchers={vouchers}
            salesVal={salesVal}
            purchasesVal={purchasesVal}
            formatCOP={formatCOP}
            onNavigateToFacturacion={() => setActiveView('facturacion')}
            onNavigateToCompras={() => setActiveView('compras')}
          />
          {/* Critical stock alert banner */}
          {criticalMaterials.length > 0 && (
            <div className={`p-3.5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm border ${
              isLight 
                ? 'bg-amber-50 border-amber-300 text-amber-950' 
                : 'bg-gradient-to-r from-amber-600/10 via-rose-600/10 to-amber-600/10 border-amber-500/30'
            }`}>
              <div className="flex items-start gap-2.5">
                <div className={`p-1.5 rounded-lg mt-0.5 ${isLight ? 'bg-amber-200 text-amber-900' : 'bg-amber-500/20 text-amber-400'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-black text-xs uppercase tracking-wider ${isLight ? 'text-amber-950' : 'text-white'}`}>
                    Alerta de Inventario: Stock Crítico Bajo Reorden
                  </h4>
                  <p className={`text-[11px] mt-0.5 ${isLight ? 'text-amber-900 font-semibold' : 'text-slate-300'}`}>
                    Existen <strong className={isLight ? "text-amber-950 font-black" : "text-amber-400"}>{criticalMaterials.length}</strong> insumos por debajo del umbral mínimo de seguridad.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendEmailAlert}
                  disabled={emailStatus === 'sending'}
                  className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{emailStatus === 'sending' ? 'Enviando...' : emailStatus === 'sent' ? '¡Enviado!' : 'Enviar Notificación'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Critical Materials Reorder Table */}
          <div className={`p-4 rounded-xl border shadow-xs space-y-2.5 ${
            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-white/10 text-white'
          }`}>
            <h4 className={`text-xs uppercase tracking-wider ${isLight ? 'text-slate-950 font-black' : 'text-white font-bold'}`}>
              Control de Umbrales de Reorden (MRP)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b font-mono ${isLight ? 'border-slate-200 text-slate-600 font-bold' : 'border-white/10 text-slate-400'}`}>
                    <th className="py-1.5">Insumo</th>
                    <th className="py-1.5">Stock Actual</th>
                    <th className="py-1.5">Punto de Reorden</th>
                    <th className="py-1.5">Estado</th>
                    <th className="py-1.5 text-right">Ajustar Límite</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
                  {paginatedMaterialsWithStock.map((mat) => (
                    <tr key={mat.id} className={isLight ? "hover:bg-slate-100" : "hover:bg-white/5"}>
                      <td className={`py-2 font-bold ${isLight ? 'text-slate-950' : 'text-slate-200'}`}>{mat.name}</td>
                      <td className={`py-2 font-mono font-bold ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>{mat.currentStock.toFixed(1)} und</td>
                      <td className={`py-2 font-mono ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-500'}`}>{mat.limit} und</td>
                      <td className="py-2">
                        {mat.isBelow ? (
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9.5px] border ${
                            isLight ? 'bg-rose-100 text-rose-800 border-rose-300 font-black' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}>
                            Bajo Mínimo
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9.5px] border ${
                            isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}>
                            Óptimo
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <input
                          type="number"
                          value={mat.limit}
                          onChange={(e) => handleUpdateLimit(mat.id, Number(e.target.value))}
                          className={`w-20 px-2 py-0.5 rounded border text-right font-mono text-xs font-bold ${
                            isLight 
                              ? 'bg-slate-50 border-slate-300 text-slate-950 focus:bg-white' 
                              : 'bg-slate-800 border-slate-700 text-white'
                          }`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {materialsWithStock.length > 0 && (
              <Pagination
                currentPage={safeMrpPage}
                totalItems={materialsWithStock.length}
                pageSize={MRP_ITEMS_PER_PAGE}
                onPageChange={(page) => setMrpPage(page)}
                isDark={!isLight}
                itemLabel="insumos y materiales"
              />
            )}
          </div>
        </div>
      )}

      {/* Sales & Operating Margins Client-Side PDF Report Modal */}
      <SalesReportModal
        isOpen={isSalesReportModalOpen}
        onClose={() => setIsSalesReportModalOpen(false)}
        vouchers={vouchers}
        terceros={terceros}
        products={products}
        company={currentCompany}
        currentUser={currentUser}
      />

    </div>
  );
}

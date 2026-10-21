import React, { useState, useMemo, useEffect } from 'react';
import { Company } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  currentCompany: Company;
  companies: Company[];
  activeView: string;
  setActiveView: (view: string) => void;
  currentUser: { name: string; role: 'Admin' | 'Contador' | 'Vendedor' | 'Operario'; email?: string };
  switchCurrentUser: (role: 'Admin' | 'Contador' | 'Vendedor' | 'Operario') => void;
  onSwitchCompany: (id: string) => void;
  onCreateCompany: () => void;
  kioskMode: boolean;
  setKioskMode: (val: boolean) => void;
  theme: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
  setTheme: (t: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray') => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
}

export const THEMES_MAP = {
  navy_dark: {
    sidebarBg: 'bg-[#0a0f1d] border-slate-800/80 text-slate-100',
    sidebarActive: 'bg-gradient-to-r from-cyan-500/20 via-blue-600/10 to-transparent text-white border-l-4 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    sidebarHover: 'hover:bg-slate-800/60 hover:text-slate-100',
    sidebarCategoryText: 'text-slate-400',
    topBarBg: 'bg-[#0c1324] border-slate-800/90 text-white',
    topBarTextMuted: 'text-slate-400',
    mainBg: 'bg-[#070b14] text-slate-100',
    buttonAccent: 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]',
    cardStyles: 'bg-[#0d1424]/90 border border-slate-800/80 shadow-xl rounded-2xl text-slate-100 backdrop-blur-sm',
    headerTitleText: 'text-white',
    headerSubTitleText: 'text-slate-400',
    titlePrimary: 'text-white',
    badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60',
    accentText: 'text-cyan-400',
    label: 'Contaby Azul Neón'
  },
  slate_gray: {
    sidebarBg: 'bg-[#0f172a] border-slate-800 text-slate-100',
    sidebarActive: 'bg-gradient-to-r from-blue-600/25 via-slate-800/40 to-transparent text-white border-l-4 border-blue-500',
    sidebarHover: 'hover:bg-slate-800/70 hover:text-slate-100',
    sidebarCategoryText: 'text-slate-400',
    topBarBg: 'bg-[#1e293b] border-slate-700/80 text-slate-100',
    topBarTextMuted: 'text-slate-400',
    mainBg: 'bg-[#0b1120] text-slate-100',
    buttonAccent: 'bg-blue-600 hover:bg-blue-500 text-white shadow-md',
    cardStyles: 'bg-[#1e293b]/90 border border-slate-700/70 shadow-lg rounded-2xl text-slate-100',
    headerTitleText: 'text-slate-100',
    headerSubTitleText: 'text-slate-400',
    titlePrimary: 'text-slate-100',
    badgeColor: 'bg-slate-800 text-slate-200 border-slate-700',
    accentText: 'text-blue-400',
    label: 'Gris Slate Contable'
  },
  zinc_classic: {
    sidebarBg: 'bg-[#18181b] border-zinc-800 text-zinc-100',
    sidebarActive: 'bg-gradient-to-r from-zinc-700/30 to-transparent text-white border-l-4 border-zinc-400',
    sidebarHover: 'hover:bg-zinc-800 hover:text-zinc-100',
    sidebarCategoryText: 'text-zinc-400',
    topBarBg: 'bg-[#27272a] border-zinc-700 text-zinc-100',
    topBarTextMuted: 'text-zinc-400',
    mainBg: 'bg-[#09090b] text-zinc-100',
    buttonAccent: 'bg-zinc-700 hover:bg-zinc-600 text-white',
    cardStyles: 'bg-[#18181b] border border-zinc-800 shadow-md rounded-2xl text-zinc-100',
    headerTitleText: 'text-zinc-100',
    headerSubTitleText: 'text-zinc-400',
    titlePrimary: 'text-zinc-100',
    badgeColor: 'bg-zinc-800 text-zinc-200 border-zinc-700',
    accentText: 'text-zinc-300',
    label: 'Zinc Puro Oficina'
  },
  steel_sage: {
    sidebarBg: 'bg-[#0d1715] border-emerald-950 text-emerald-50',
    sidebarActive: 'bg-gradient-to-r from-emerald-600/25 to-transparent text-white border-l-4 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    sidebarHover: 'hover:bg-[#152421] hover:text-emerald-100',
    sidebarCategoryText: 'text-emerald-400/80',
    topBarBg: 'bg-[#13201d] border-emerald-900/60 text-emerald-50',
    topBarTextMuted: 'text-emerald-300/70',
    mainBg: 'bg-[#08100e] text-emerald-50',
    buttonAccent: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md',
    cardStyles: 'bg-[#13201d] border border-emerald-900/50 shadow-md rounded-2xl text-emerald-50',
    headerTitleText: 'text-emerald-50',
    headerSubTitleText: 'text-emerald-400/80',
    titlePrimary: 'text-emerald-50',
    badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    accentText: 'text-emerald-400',
    label: 'Verde Sabio Contable'
  },
  light_gray: {
    sidebarBg: 'bg-[#f8fafc] border-slate-300 text-slate-900 shadow-xs',
    sidebarActive: 'bg-blue-600 text-white font-bold shadow-md',
    sidebarHover: 'hover:bg-slate-200 hover:text-slate-950',
    sidebarCategoryText: 'text-slate-700 font-bold uppercase tracking-wider',
    topBarBg: 'bg-white border-slate-300 text-slate-950 shadow-xs',
    topBarTextMuted: 'text-slate-700 font-medium',
    mainBg: 'bg-[#f1f5f9] text-slate-950',
    buttonAccent: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md font-bold',
    cardStyles: 'bg-white border border-slate-300 shadow-sm rounded-2xl text-slate-900',
    headerTitleText: 'text-slate-950 font-black',
    headerSubTitleText: 'text-slate-700 font-semibold',
    titlePrimary: 'text-slate-950 font-black',
    badgeColor: 'bg-slate-200 text-slate-900 border-slate-300 font-bold',
    accentText: 'text-blue-700 font-black',
    label: 'Gris Claro Contable (Alto Contraste)'
  },
};

// Styling profiles for different functional modules to make navigation instantly recognizable
const CATEGORY_STYLE: Record<string, {
  color: string;
  glow: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  activeBorder: string;
  activeBg: string;
  activeGlow: string;
  activeText: string;
}> = {
  general: {
    color: 'text-cyan-400',
    glow: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]',
    badge: 'GENERAL',
    badgeBg: 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/50',
    badgeText: 'CORE',
    activeBorder: 'border-cyan-500/30',
    activeBg: 'bg-gradient-to-r from-cyan-500/15 via-blue-600/10 to-transparent',
    activeGlow: 'after:content-[""] after:absolute after:right-2.5 after:top-[43%] after:w-1.5 after:h-1.5 after:bg-cyan-400 after:rounded-full after:shadow-[0_0_8px_#22d3ee]',
    activeText: 'text-cyan-100'
  },
  ventas: {
    color: 'text-emerald-400',
    glow: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
    badge: 'VENTAS',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50',
    badgeText: 'DIAN',
    activeBorder: 'border-emerald-500/30',
    activeBg: 'bg-gradient-to-r from-emerald-500/15 via-teal-600/10 to-transparent',
    activeGlow: 'after:content-[""] after:absolute after:right-2.5 after:top-[43%] after:w-1.5 after:h-1.5 after:bg-emerald-400 after:rounded-full after:shadow-[0_0_8px_#34d399]',
    activeText: 'text-emerald-100'
  },
  compras: {
    color: 'text-amber-400',
    glow: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
    badge: 'COMPRAS',
    badgeBg: 'bg-amber-950/80 text-amber-300 border border-amber-800/50',
    badgeText: 'GASTOS',
    activeBorder: 'border-amber-500/30',
    activeBg: 'bg-gradient-to-r from-amber-500/15 via-orange-600/10 to-transparent',
    activeGlow: 'after:content-[""] after:absolute after:right-2.5 after:top-[43%] after:w-1.5 after:h-1.5 after:bg-amber-400 after:rounded-full after:shadow-[0_0_8px_#fbbf24]',
    activeText: 'text-amber-100'
  },
  inventario: {
    color: 'text-blue-400',
    glow: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]',
    badge: 'INVENTARIO',
    badgeBg: 'bg-blue-950/80 text-blue-300 border border-blue-800/50',
    badgeText: 'STOCK',
    activeBorder: 'border-blue-500/30',
    activeBg: 'bg-gradient-to-r from-blue-500/15 via-indigo-600/10 to-transparent',
    activeGlow: 'after:content-[""] after:absolute after:right-2.5 after:top-[43%] after:w-1.5 after:h-1.5 after:bg-blue-400 after:rounded-full after:shadow-[0_0_8px_#60a5fa]',
    activeText: 'text-blue-100'
  },
  nomina: {
    color: 'text-rose-400',
    glow: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
    badge: 'NÓMINA',
    badgeBg: 'bg-rose-950/80 text-rose-300 border border-rose-800/50',
    badgeText: 'RRHH',
    activeBorder: 'border-rose-500/30',
    activeBg: 'bg-gradient-to-r from-rose-500/15 via-pink-600/10 to-transparent',
    activeGlow: 'after:content-[""] after:absolute after:right-2.5 after:top-[43%] after:w-1.5 after:h-1.5 after:bg-rose-400 after:rounded-full after:shadow-[0_0_8px_#fb7185]',
    activeText: 'text-rose-100'
  },
  contabilidad: {
    color: 'text-indigo-400',
    glow: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]',
    badge: 'CONTABILIDAD',
    badgeBg: 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/50',
    badgeText: 'PUC',
    activeBorder: 'border-indigo-500/30',
    activeBg: 'bg-gradient-to-r from-indigo-500/15 via-blue-600/10 to-transparent',
    activeGlow: 'after:content-[""] after:absolute after:right-2.5 after:top-[43%] after:w-1.5 after:h-1.5 after:bg-indigo-400 after:rounded-full after:shadow-[0_0_8px_#818cf8]',
    activeText: 'text-indigo-100'
  },
  tecnologia: {
    color: 'text-sky-400',
    glow: 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]',
    badge: 'TECNOLOGÍA',
    badgeBg: 'bg-sky-950/80 text-sky-300 border border-sky-800/50',
    badgeText: 'TECH',
    activeBorder: 'border-sky-500/30',
    activeBg: 'bg-gradient-to-r from-sky-500/15 via-blue-600/10 to-transparent',
    activeGlow: 'after:content-[""] after:absolute after:right-2.5 after:top-[43%] after:w-1.5 after:h-1.5 after:bg-sky-400 after:rounded-full after:shadow-[0_0_8px_#38bdf8]',
    activeText: 'text-sky-100'
  },
  operaciones: {
    color: 'text-amber-400',
    glow: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
    badge: 'MRP / PLANTA',
    badgeBg: 'bg-amber-950/80 text-amber-300 border border-amber-800/50',
    badgeText: 'PLANTA',
    activeBorder: 'border-amber-500/30',
    activeBg: 'bg-gradient-to-r from-amber-500/15 via-yellow-600/10 to-transparent',
    activeGlow: 'after:content-[""] after:absolute after:right-2.5 after:top-[43%] after:w-1.5 after:h-1.5 after:bg-amber-400 after:rounded-full after:shadow-[0_0_8px_#f59e0b]',
    activeText: 'text-amber-100'
  },
  inteligencia: {
    color: 'text-fuchsia-400',
    glow: 'bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.9)] animate-pulse',
    badge: 'INTELIGENCIA',
    badgeBg: 'bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-800/50',
    badgeText: 'IA BOT',
    activeBorder: 'border-fuchsia-500/30',
    activeBg: 'bg-gradient-to-r from-fuchsia-500/15 via-purple-600/10 to-transparent',
    activeGlow: 'after:content-[""] after:absolute after:right-2.5 after:top-[43%] after:w-1.5 after:h-1.5 after:bg-fuchsia-400 after:rounded-full after:shadow-[0_0_8px_#e879f9]',
    activeText: 'text-fuchsia-100'
  },
  sistema: {
    color: 'text-slate-400',
    glow: 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.6)]',
    badge: 'SISTEMA',
    badgeBg: 'bg-slate-800 text-slate-300 border border-slate-700',
    badgeText: 'CONFIG',
    activeBorder: 'border-slate-500/30',
    activeBg: 'bg-gradient-to-r from-slate-500/15 via-slate-700/10 to-transparent',
    activeGlow: 'after:content-[""] after:absolute after:right-2.5 after:top-[43%] after:w-1.5 after:h-1.5 after:bg-slate-300 after:rounded-full',
    activeText: 'text-slate-100'
  }
};

export default function Sidebar({
  currentCompany,
  companies,
  activeView,
  setActiveView,
  currentUser,
  switchCurrentUser,
  onSwitchCompany,
  onCreateCompany,
  kioskMode,
  setKioskMode,
  theme,
  setTheme,
  isCollapsed: externalIsCollapsed,
  setIsCollapsed: externalSetIsCollapsed
}: SidebarProps) {
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  
  // Menu starts and remains collapsed (recogido) by default ("el menu conservar recogido solo se despliega si se le da clic")
  const [internalIsCollapsed, setInternalIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('fintekia_menu_collapsed');
    return saved !== null ? saved === 'true' : true;
  });

  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  const setIsCollapsed = (val: boolean) => {
    if (externalSetIsCollapsed) {
      externalSetIsCollapsed(val);
    } else {
      setInternalIsCollapsed(val);
    }
    localStorage.setItem('fintekia_menu_collapsed', String(val));
  };

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Accordion Expand/Collapse Categories states - categories inside menu also start collapsed / tidy
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    general: false,
    tecnologia: false,
    ventas: true,
    compras: true,
    inventario: true,
    nomina: true,
    contabilidad: true,
    operaciones: true,
    inteligencia: true,
    sistema: true
  });

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.navy_dark;

  // Modern structured menu categories matching Contaby design system
  const menuCategories = useMemo(() => [
    {
      id: 'general',
      label: 'PRINCIPAL',
      items: [
        { id: 'dashboard', label: 'Inicio / Panel General', icon: 'ri-layout-grid-line', roles: ['Admin', 'Contador', 'Vendedor'] },
      ]
    },
    {
      id: 'ventas',
      label: 'VENTAS & FACTURACIÓN',
      items: [
        { id: 'facturacion', label: 'Facturación Ventas', icon: 'ri-file-text-line', badge: 'Prov. Tec', roles: ['Admin', 'Contador', 'Vendedor'] },
        { id: 'alanube_config', label: 'Integración Alanube', icon: 'ri-cloud-line', badge: 'DIAN API', roles: ['Admin', 'Contador'] },
        { id: 'terceros', label: 'Clientes & Contactos', icon: 'ri-contacts-book-2-line', roles: ['Admin', 'Contador', 'Vendedor'] },
        { id: 'cartera', label: 'Cartera & Cobranzas (CxC)', icon: 'ri-hand-coin-line', roles: ['Admin', 'Contador'] },
      ]
    },
    {
      id: 'compras',
      label: 'COMPRAS & PROVEEDORES',
      items: [
        { id: 'compras', label: 'Facturas de Compra', icon: 'ri-shopping-bag-3-line', roles: ['Admin', 'Contador'] },
      ]
    },
    {
      id: 'inventario',
      label: 'INVENTARIO & ALMACÉN',
      items: [
        { id: 'productos', label: 'Catálogo de Insumos', icon: 'ri-archive-2-line', roles: ['Admin', 'Contador', 'Vendedor'] },
        { id: 'bodegas', label: 'Bodegas & Plantas', icon: 'ri-building-line', roles: ['Admin', 'Contador'] },
      ]
    },
    {
      id: 'tecnologia',
      label: 'TECNOLOGÍA & SERVICIOS',
      items: [
        { id: 'servicios_tech', label: 'Servicios Técnicos & OT', icon: 'ri-macbook-line', badge: 'OT TI', roles: ['Admin', 'Contador', 'Vendedor'] },
        { id: 'productos', label: 'Catálogo de Equipos & Tech', icon: 'ri-archive-2-line', roles: ['Admin', 'Contador', 'Vendedor'] },
        { id: 'bodegas', label: 'Bodegas & Almacén', icon: 'ri-building-line', roles: ['Admin', 'Contador'] },
      ]
    },
    {
      id: 'nomina',
      label: 'GESTIÓN DE NÓMINA',
      items: [
        { id: 'nomina', label: 'Nómina & SMMLV', icon: 'ri-user-heart-line', badge: 'RRHH', roles: ['Admin', 'Contador'] },
      ]
    },
    {
      id: 'contabilidad',
      label: 'CONTABILIDAD & PUC',
      items: [
        { id: 'comprobantes', label: 'Libro Diario PUC', icon: 'ri-booklet-line', badge: 'PUC', roles: ['Admin', 'Contador'] },
        { id: 'bancos', label: 'Bancos & Conciliación', icon: 'ri-bank-card-line', roles: ['Admin', 'Contador'] },
        { id: 'impuestos', label: 'Impuestos & Retenciones', icon: 'ri-scales-3-line', roles: ['Admin', 'Contador'] },
        { id: 'presupuestos', label: 'Presupuestos Activos', icon: 'ri-pie-chart-2-line', roles: ['Admin', 'Contador'] },
      ]
    },
    ...(currentCompany.enableProduction !== false ? [{
      id: 'operaciones',
      label: 'PRODUCCIÓN & MRP',
      items: [
        { id: 'ordenes_prod', label: 'Producción & BOM', icon: 'ri-settings-4-line', roles: ['Admin', 'Contador', 'Operario'] },
        { id: 'mrp', label: 'Planificación MRP', icon: 'ri-cpu-line', roles: ['Admin', 'Contador'] },
        { id: 'calidad', label: 'Control de Calidad', icon: 'ri-shield-check-line', roles: ['Admin', 'Contador', 'Operario'] },
      ]
    }] : []),
    {
      id: 'inteligencia',
      label: 'INTELIGENCIA ARTIFICIAL',
      items: [
        { id: 'ai_advisor', label: 'AI Asesor Financiero', icon: 'ri-sparkling-fill', badge: 'IA', roles: ['Admin', 'Contador'] },
      ]
    },
    {
      id: 'sistema',
      label: 'CONFIGURACIÓN',
      items: [
        { id: 'empresa', label: 'Datos de la Empresa', icon: 'ri-building-4-line', roles: ['Admin', 'Contador'] },
        { id: 'database', label: 'Base de Datos & Supabase', icon: 'ri-database-2-line', badge: 'SQL', roles: ['Admin', 'Contador'] },
        { id: 'alanube_config', label: 'API Alanube & DIAN', icon: 'ri-cloud-line', badge: 'DIAN API', roles: ['Admin', 'Contador'] },
        { id: 'usuarios', label: 'Control de Usuarios', icon: 'ri-user-settings-line', roles: ['Admin', 'Contador'] },
      ]
    }
  ], [currentCompany.enableProduction]);

  // Filter items if searching
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return menuCategories;
    const term = searchTerm.toLowerCase();

    return menuCategories
      .map(cat => {
        const matchingItems = cat.items.filter(
          item =>
            item.label.toLowerCase().includes(term) ||
            cat.label.toLowerCase().includes(term) ||
            (item.badge && item.badge.toLowerCase().includes(term))
        );
        return {
          ...cat,
          items: matchingItems
        };
      })
      .filter(cat => cat.items.length > 0);
  }, [menuCategories, searchTerm]);

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Keyboard shortcut for search (Ctrl+K or ⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('sidebar-quick-search');
        if (searchInput) {
          if (isCollapsed) setIsCollapsed(false);
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

  return (
    <motion.aside
      id="main-sidebar"
      className={`no-print shrink-0 ${activeTheme.sidebarBg} transition-all duration-300 border-r flex flex-col h-screen relative select-none z-20`}
      style={{ width: isCollapsed ? '76px' : '268px' }}
      animate={{ width: isCollapsed ? 76 : 268 }}
    >
      {/* Brand Header with Contaby Neon Aesthetic */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between min-h-[72px] bg-black/20">
        {!isCollapsed ? (
          <button
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-3 overflow-hidden text-left cursor-pointer group transition-all"
            title="Ir al Menú Principal (Inicio)"
          >
            {/* Contaby Glowing Hexagon/Square Icon */}
            <div className="relative group shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.45)] border border-cyan-300/30 group-hover:scale-105 transition-transform">
                <i className="ri-pulse-fill text-xl text-white"></i>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0f1d] shadow-[0_0_6px_#34d399]" />
            </div>

            <div className="leading-none overflow-hidden">
              <div className="flex items-center gap-1.5">
                <h1 className="font-sans font-extrabold text-base tracking-wider text-white group-hover:text-cyan-300 transition-colors">
                  CONTABY
                </h1>
                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  PRO
                </span>
              </div>
              <p className="text-[9.5px] font-mono text-slate-400 tracking-wider mt-1 flex items-center gap-1">
                <span>ERP & DIAN</span>
                <span className="text-cyan-400">·</span>
                <span className="text-emerald-400 font-semibold">2026</span>
              </p>
            </div>
          </button>
        ) : (
          <div className="flex flex-col items-center justify-center w-full">
            <button
              onClick={handleToggleCollapse}
              id="sidebar-toggle-btn-collapsed-top"
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-700 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-300/30 cursor-pointer hover:scale-105 transition-transform"
              title="Desplegar menú (clic)"
            >
              <i className="ri-menu-unfold-line text-white text-lg"></i>
            </button>
          </div>
        )}

        {/* Sidebar Collapse Toggle Button */}
        {!isCollapsed && (
          <button
            onClick={handleToggleCollapse}
            id="sidebar-collapse-btn-wide"
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/5 shrink-0"
            title="Recoger menú (clic)"
          >
            <i className="ri-menu-fold-line text-sm"></i>
          </button>
        )}
      </div>

      {/* Organization / Company Selector Card */}
      <div className="px-3 py-2.5 border-b border-white/[0.06] bg-black/10">
        {!isCollapsed ? (
          <div className="relative">
            <button
              onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
              id="company-toggle-btn"
              className="w-full flex items-center justify-between text-left p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white transition-all text-xs border border-white/[0.06] group shadow-inner"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
                  {currentCompany.logoUrl ? (
                    <img 
                      src={currentCompany.logoUrl} 
                      alt="Logo" 
                      className="w-5 h-5 object-contain rounded" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <i className="ri-building-line text-xs"></i>
                  )}
                </div>
                <div className="truncate min-w-0">
                  <span className="font-bold text-white text-xs block truncate leading-tight group-hover:text-cyan-300 transition-colors">
                    {currentCompany.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block truncate leading-tight mt-0.5">
                    NIT: {currentCompany.nit}
                  </span>
                </div>
              </div>
              <i className={`ri-arrow-down-s-line text-slate-400 transition-transform ${showCompanyDropdown ? 'rotate-180 text-cyan-400' : ''}`}></i>
            </button>

            {/* Dropdown with all registered companies */}
            {showCompanyDropdown && (
              <div className="absolute left-0 right-0 mt-1.5 p-1.5 rounded-xl bg-[#0d1424] border border-cyan-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 backdrop-blur-md">
                <div className="flex items-center justify-between px-2 py-1 border-b border-white/5">
                  <span className="text-[9px] text-cyan-400 uppercase font-mono font-bold tracking-wider">Organizaciones</span>
                  <span className="text-[9px] font-mono text-slate-400">{companies.length} disp.</span>
                </div>
                <div className="max-h-48 overflow-y-auto mt-1 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
                  {companies.map((co) => {
                    const isCompanyActive = co.isActive !== false;
                    const isSelected = co.id === currentCompany.id;
                    return (
                      <button
                        key={co.id}
                        onClick={() => {
                          onSwitchCompany(co.id);
                          setShowCompanyDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-white font-bold border border-cyan-500/30'
                            : isCompanyActive
                              ? 'text-slate-300 hover:text-white hover:bg-white/5'
                              : 'text-slate-500 hover:text-slate-400 hover:bg-white/5 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <i className={`ri-building-line text-xs ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`}></i>
                          <div className="truncate">
                            <span className="block truncate">{co.name}</span>
                            <span className="text-[9px] font-mono opacity-60 block truncate">NIT: {co.nit}</span>
                          </div>
                        </div>
                        {isSelected && <i className="ri-check-line text-xs text-cyan-400 font-bold"></i>}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-white/5">
                  <button
                    onClick={() => {
                      onCreateCompany();
                      setShowCompanyDropdown(false);
                    }}
                    className="w-full py-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <i className="ri-add-circle-line"></i> Crear Organización
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              setIsCollapsed(false);
              setShowCompanyDropdown(true);
            }}
            id="company-toggle-btn-collapsed"
            className="w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white flex items-center justify-center mx-auto cursor-pointer border border-white/5 p-1"
            title={`${currentCompany.name} (NIT: ${currentCompany.nit})`}
          >
            {currentCompany.logoUrl ? (
              <img 
                src={currentCompany.logoUrl} 
                alt="Logo" 
                className="w-7 h-7 object-contain rounded" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <i className="ri-building-line text-base text-cyan-400"></i>
            )}
          </button>
        )}
      </div>

      {/* Quick Search & Filter in Menu (Only when Expanded) */}
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input
              id="sidebar-quick-search"
              type="text"
              placeholder="Buscar módulo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-12 py-1.5 rounded-xl bg-black/30 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 transition-all"
            />
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                <i className="ri-close-line"></i>
              </button>
            ) : (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-500 border border-white/10 px-1 rounded">
                ⌘K
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Categorized Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
        {filteredCategories.map((category) => {
          // Verify if user role has access to any item in this category
          const visibleItems = category.items.filter((item) => item.roles.includes(currentUser.role));
          if (visibleItems.length === 0) return null;

          const isCatCollapsed = collapsedCategories[category.id] && !searchTerm;
          const catStyle = CATEGORY_STYLE[category.id] || CATEGORY_STYLE.general;

          return (
            <div key={category.id} className="space-y-1 block">
              {/* Category Header (When Expanded) */}
              {!isCollapsed ? (
                <div
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center justify-between px-2.5 py-1 text-[9px] font-extrabold tracking-wider text-slate-400 hover:text-white cursor-pointer select-none transition-colors border-b border-white/[0.04] pb-1 w-full group"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${catStyle.glow} shrink-0`} />
                    <span className="uppercase font-mono tracking-wider">{category.label}</span>
                  </div>
                  <i className={`ri-arrow-down-s-line text-[11px] text-slate-500 group-hover:text-slate-300 transition-transform ${isCatCollapsed ? '-rotate-90' : ''}`} />
                </div>
              ) : (
                <div className="border-t border-white/5 my-2 mx-2" />
              )}

              {/* Items row list */}
              <AnimatePresence initial={false}>
                {(!isCatCollapsed || isCollapsed) && (
                  <motion.div
                    className="space-y-1 overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {visibleItems.map((item) => {
                      const isActive = activeView === item.id;
                      return (
                        <div
                          key={item.id}
                          className="relative group px-1"
                          onMouseEnter={() => setHoveredItem(item.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <button
                            onClick={() => {
                              setKioskMode(false);
                              setActiveView(item.id);
                            }}
                            id={`sidebar-item-${item.id}`}
                            className={`w-full flex items-center rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 text-left relative overflow-hidden ${
                              isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                            } ${
                              isActive && !kioskMode
                                ? `${catStyle.activeBg} ${catStyle.activeText} border ${catStyle.activeBorder} shadow-[0_0_15px_rgba(6,182,212,0.12)] font-bold`
                                : `text-slate-400 bg-transparent hover:bg-white/[0.04] hover:text-white ${
                                    hoveredItem === item.id && !isCollapsed ? 'translate-x-1' : ''
                                  }`
                            }`}
                          >
                            {/* Glowing Left Indicator Bar for Active State */}
                            {isActive && !kioskMode && !isCollapsed && (
                              <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                            )}

                            {/* Crisp Icon with Luminous Backplate */}
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                              isActive && !kioskMode
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.35)]'
                                : 'bg-slate-800/50 text-slate-400 group-hover:bg-slate-800 group-hover:text-cyan-400 group-hover:shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                            }`}>
                              <i className={`${item.icon} text-base transition-transform duration-200 ${hoveredItem === item.id ? 'scale-110' : ''}`} />
                            </div>
                            
                            {!isCollapsed && (
                              <div className="flex-1 flex items-center justify-between truncate min-w-0">
                                <span className={`truncate text-xs ${isActive ? 'text-white font-bold' : 'text-slate-300 group-hover:text-white'}`}>
                                  {item.label}
                                </span>
                                
                                {item.badge && (
                                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ml-2 shrink-0 ${
                                    isActive 
                                      ? 'bg-cyan-400/20 text-cyan-200 border border-cyan-400/30'
                                      : 'bg-white/5 text-slate-400 border border-white/5'
                                  }`}>
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Active Right Glow Dot */}
                            {isActive && !isCollapsed && (
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] shrink-0" />
                            )}
                          </button>

                          {/* Float hovering tooltip for Collapsed menu mode */}
                          {isCollapsed && hoveredItem === item.id && (
                            <div className="absolute left-[78px] top-1/2 -translate-y-1/2 bg-[#0d1424] text-white text-xs px-3.5 py-2.5 rounded-xl border border-cyan-500/30 shadow-[0_10px_25px_rgba(0,0,0,0.8)] z-50 min-w-[150px] pointer-events-none">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${catStyle.glow}`} />
                                <p className="font-bold text-white text-xs">{item.label}</p>
                              </div>
                              <p className="text-[8px] font-mono text-cyan-400 uppercase tracking-wider mt-0.5">
                                {category.label}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Bottom Area: Kiosk Mode Trigger & User Profile Card */}
      <div className="p-3 border-t border-white/[0.08] bg-black/25 space-y-2.5 mt-auto">
        
        {/* Expanded UI elements */}
        {!isCollapsed ? (
          <>
            {/* Profile widget card details with glassmorphism */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 font-bold text-white flex items-center justify-center text-xs shrink-0 select-none shadow-md">
                  {currentUser.name[0]}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0a0f1d] shadow-[0_0_4px_#34d399]" />
              </div>
              <div className="min-w-0 flex-1 leading-normal">
                <h4 className="text-xs font-bold text-white truncate leading-tight">{currentUser.name}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <select
                    value={currentUser.role}
                    onChange={(e) => switchCurrentUser(e.target.value as any)}
                    id="user-role-select"
                    aria-label="Rol de usuario actual"
                    className="bg-transparent border-0 text-[10px] font-mono font-bold text-cyan-400 hover:text-cyan-300 focus:ring-0 p-0 cursor-pointer uppercase tracking-wider block"
                  >
                    <option value="Admin" className="bg-[#0d1424] text-white">Admin</option>
                    <option value="Contador" className="bg-[#0d1424] text-white">Contador</option>
                    <option value="Vendedor" className="bg-[#0d1424] text-white">Vendedor</option>
                    <option value="Operario" className="bg-[#0d1424] text-white">Operario</option>
                  </select>
                </div>
              </div>

              {/* Theme quick cycle icon */}
              <button
                onClick={() => {
                  const themes: Array<keyof typeof THEMES_MAP> = ['navy_dark', 'slate_gray', 'zinc_classic', 'steel_sage', 'light_gray'];
                  const nextIdx = (themes.indexOf(theme) + 1) % themes.length;
                  setTheme(themes[nextIdx]);
                }}
                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300 flex items-center justify-center text-xs transition-colors"
                title={`Tema actual: ${activeTheme.label}. Clic para cambiar`}
              >
                <i className="ri-palette-line"></i>
              </button>
            </div>
          </>
        ) : (
          /* Collapsed bottom shortcuts icons */
          <div className="flex flex-col gap-2.5 items-center">
            {/* Collapsed trigger sidebar expand */}
            <button
              onClick={handleToggleCollapse}
              id="sidebar-expand-btn-collapsed"
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 flex items-center justify-center cursor-pointer border border-white/5"
              title="Expandir menú"
            >
              <i className="ri-arrow-right-double-line text-base"></i>
            </button>

            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 font-bold text-white flex items-center justify-center text-xs select-none shadow-md">
              {currentUser.name[0]}
            </div>
          </div>
        )}

      </div>
    </motion.aside>
  );
}

import React, { useState, useRef } from 'react';
import { Company, InvoiceDesignConfig } from '../../types';
import { toast } from '../../context/ToastContext';

interface InvoiceDesignModalProps {
  company: Company;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCompany: Company) => void;
  formatCOP?: (val: number) => string;
}

export const DEFAULT_INVOICE_DESIGN: InvoiceDesignConfig = {
  logoPosition: 'left',
  logoSize: 'md',
  logoStyle: 'rounded',
  accentColor: '#2563eb',
  showSlogan: true,
  showResolutionBox: true,
  showBankAccounts: true,
  bankAccountDetails: 'Bancolombia Cta Corriente No. 245-098712-88 (NIT 901.455.120-3)',
  termsAndNotes: 'Esta factura de venta se asimila en sus efectos legales a una letra de cambio según la Ley 1231 de 2008. Autorizo el tratamiento de datos personales para fines contables y comerciales.',
  watermarkText: '',
  headerLayout: 'classic',
  showSignatures: true
};

const PRESET_LOGOS = [
  {
    name: 'FinteKia Tech Hexagon',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%232563eb"/><stop offset="100%" stop-color="%234f46e5"/></linearGradient></defs><rect width="200" height="200" rx="44" fill="url(%23g1)"/><path d="M60 55 L140 55 L140 80 L95 80 L95 95 L130 95 L130 120 L95 120 L95 145 L60 145 Z" fill="%23ffffff"/><circle cx="150" cy="140" r="14" fill="%2338bdf8"/></svg>'
  },
  {
    name: 'Alimentos del Norte / Trigo',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23d97706"/><stop offset="100%" stop-color="%23b45309"/></linearGradient></defs><rect width="200" height="200" rx="44" fill="url(%23g2)"/><path d="M100 40 C75 70 70 110 100 150 C130 110 125 70 100 40 Z" fill="%23fef3c7"/><path d="M100 65 C85 85 85 110 100 135 C115 110 115 85 100 65 Z" fill="%23d97706"/><circle cx="100" cy="98" r="8" fill="%23fef3c7"/></svg>'
  },
  {
    name: 'Servicios & Redes TI',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" rx="44" fill="%230f172a"/><path d="M45 100 L85 60 L125 100 L165 60" stroke="%2338bdf8" stroke-width="14" fill="none" stroke-linecap="round"/><circle cx="85" cy="140" r="18" fill="%2322c55e"/><circle cx="140" cy="140" r="14" fill="%2338bdf8"/></svg>'
  },
  {
    name: 'Panadería Artesanal',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&auto=format&fit=crop&q=60'
  },
  {
    name: 'Corporativo Minimalista',
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=160&auto=format&fit=crop&q=60'
  }
];

const ACCENT_COLORS = [
  { name: 'Azul FinteKia', hex: '#2563eb' },
  { name: 'Índigo DIAN', hex: '#4f46e5' },
  { name: 'Verde Esmeralda', hex: '#059669' },
  { name: 'Slate Ejecutivo', hex: '#0f172a' },
  { name: 'Ámbar Industrial', hex: '#d97706' },
  { name: 'Púrpura Moderno', hex: '#7c3aed' },
  { name: 'Rojo Carmesí', hex: '#dc2626' }
];

export default function InvoiceDesignModal({
  company,
  isOpen,
  onClose,
  onSave,
  formatCOP = (val) => `$ ${val.toLocaleString('es-CO')}`
}: InvoiceDesignModalProps) {
  if (!isOpen) return null;

  const currentDesign: InvoiceDesignConfig = {
    ...DEFAULT_INVOICE_DESIGN,
    ...(company.invoiceDesign || {})
  };

  const [logoUrl, setLogoUrl] = useState<string | undefined>(company.logoUrl);
  const [logoPosition, setLogoPosition] = useState<InvoiceDesignConfig['logoPosition']>(currentDesign.logoPosition);
  const [logoSize, setLogoSize] = useState<InvoiceDesignConfig['logoSize']>(currentDesign.logoSize);
  const [logoStyle, setLogoStyle] = useState<InvoiceDesignConfig['logoStyle']>(currentDesign.logoStyle);
  const [accentColor, setAccentColor] = useState<string>(currentDesign.accentColor);
  const [showSlogan, setShowSlogan] = useState<boolean>(currentDesign.showSlogan);
  const [showResolutionBox, setShowResolutionBox] = useState<boolean>(currentDesign.showResolutionBox);
  const [showBankAccounts, setShowBankAccounts] = useState<boolean>(currentDesign.showBankAccounts);
  const [showSignatures, setShowSignatures] = useState<boolean>(currentDesign.showSignatures !== false);
  const [bankAccountDetails, setBankAccountDetails] = useState<string>(currentDesign.bankAccountDetails || '');
  const [termsAndNotes, setTermsAndNotes] = useState<string>(currentDesign.termsAndNotes || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.warning('Por favor seleccione un archivo de imagen (PNG, JPG, SVG o WEBP).', 'Formato Inválido');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setLogoUrl(event.target.result);
        toast.success('Logotipo cargado exitosamente.', 'Logo Actualizado');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const updatedCompany: Company = {
      ...company,
      logoUrl,
      invoiceDesign: {
        logoPosition,
        logoSize,
        logoStyle,
        accentColor,
        showSlogan,
        showResolutionBox,
        showBankAccounts,
        showSignatures,
        bankAccountDetails,
        termsAndNotes
      }
    };
    onSave(updatedCompany);
    toast.success('Diseño de factura y posición de logotipo guardados.', 'Diseño Actualizado');
    onClose();
  };

  // Helper for size classes in preview
  const getLogoSizeClass = (sz: InvoiceDesignConfig['logoSize']) => {
    switch (sz) {
      case 'sm': return 'h-10 w-10';
      case 'lg': return 'h-20 w-20';
      case 'xl': return 'h-24 w-24';
      case 'md':
      default: return 'h-14 w-14';
    }
  };

  // Helper for logo container style
  const getLogoStyleClass = (st: InvoiceDesignConfig['logoStyle']) => {
    switch (st) {
      case 'circle': return 'rounded-full border border-slate-200 shadow-sm';
      case 'card': return 'rounded-xl border border-slate-200 bg-white p-1.5 shadow-md';
      case 'rounded': return 'rounded-xl border border-slate-200';
      case 'none':
      default: return 'rounded-none';
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up text-slate-800 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md font-bold"
              style={{ backgroundColor: accentColor }}
            >
              <i className="ri-layout-masonry-line text-xl"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                  Diseño de Factura & Ubicación del Logotipo
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {company.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Personaliza la posición del logo, tamaño, membrete institucional y colores oficiales de impresión DIAN.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200/60 dark:bg-slate-800 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Modal Body: Left Controls & Right Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          
          {/* Controls Column (7 cols) */}
          <div className="lg:col-span-7 p-6 overflow-y-auto space-y-6 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 text-xs">
            
            {/* 1. Logotipo de la Empresa */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-850/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-extrabold uppercase text-[11px] tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <i className="ri-image-line text-blue-500"></i> 1. Logotipo Corporativo de la Empresa
                </span>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(undefined)}
                    className="text-rose-500 hover:text-rose-700 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <i className="ri-delete-bin-line"></i> Quitar Logo
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo Empresa"
                      className="w-full h-full object-contain p-1"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <i className="ri-image-add-line text-2xl"></i>
                      <p className="text-[8px] leading-tight mt-1 font-bold">Sin Logo</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    >
                      <i className="ri-upload-cloud-line"></i> Subir Mi Logo
                    </button>
                    <span className="text-[10px] text-slate-400">PNG, SVG, JPG transparente recomendado</span>
                  </div>

                  {/* Presets */}
                  <div>
                    <p className="text-[9.5px] text-slate-400 font-semibold mb-1">O selecciona un logo predeterminado:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_LOGOS.map((pr, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setLogoUrl(pr.url)}
                          className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-[10px] text-slate-600 dark:text-slate-300 font-medium cursor-pointer transition-all truncate max-w-[130px]"
                          title={pr.name}
                        >
                          {pr.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Ubicación / Posición del Logotipo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold uppercase text-[11px] tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <i className="ri-layout-column-line text-indigo-500"></i> 2. Ubicación del Logo en el Encabezado
                </span>
                <span className="text-[10px] text-slate-400">Selecciona dónde se ubicará</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Left */}
                <button
                  type="button"
                  onClick={() => setLogoPosition('left')}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    logoPosition === 'left'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-5 h-5 rounded bg-blue-500 text-white flex items-center justify-center font-bold text-[9px]">L</div>
                    <div className="flex-1 space-y-0.5">
                      <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded w-full"></div>
                      <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Izquierda Clásica</p>
                    <p className="text-[9px] text-slate-400">Estándar DIAN tradicional</p>
                  </div>
                </button>

                {/* Center */}
                <button
                  type="button"
                  onClick={() => setLogoPosition('center')}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    logoPosition === 'center'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex flex-col items-center mb-2">
                    <div className="w-5 h-5 rounded bg-indigo-500 text-white flex items-center justify-center font-bold text-[9px] mb-1">C</div>
                    <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded w-3/4"></div>
                  </div>
                  <div>
                    <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Centro Moderno</p>
                    <p className="text-[9px] text-slate-400">Membrete centrado de lujo</p>
                  </div>
                </button>

                {/* Right */}
                <button
                  type="button"
                  onClick={() => setLogoPosition('right')}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    logoPosition === 'right'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex-1 space-y-0.5">
                      <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded w-full"></div>
                      <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                    </div>
                    <div className="w-5 h-5 rounded bg-emerald-500 text-white flex items-center justify-center font-bold text-[9px]">R</div>
                  </div>
                  <div>
                    <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Ejecutivo Derecha</p>
                    <p className="text-[9px] text-slate-400">Logo al lado del folio</p>
                  </div>
                </button>

                {/* Banner */}
                <button
                  type="button"
                  onClick={() => setLogoPosition('banner')}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    logoPosition === 'banner'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="mb-2">
                    <div 
                      className="h-4 rounded flex items-center px-1 text-white text-[8px] font-bold"
                      style={{ backgroundColor: accentColor }}
                    >
                      Banda de Marca
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Banda Superior</p>
                    <p className="text-[9px] text-slate-400">Franja corporativa llena</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Tamaño y Estilo del Marco */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Tamaño */}
              <div className="space-y-2">
                <span className="font-extrabold uppercase text-[10.5px] tracking-wider text-slate-700 dark:text-slate-300">
                  Tamaño del Logotipo
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setLogoSize(sz)}
                      className={`py-1.5 rounded-xl border text-center font-bold text-[11px] cursor-pointer transition-all ${
                        logoSize === sz
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {sz === 'sm' ? 'Pequeño (40px)' : sz === 'md' ? 'Medio (56px)' : sz === 'lg' ? 'Grande (80px)' : 'Extra (96px)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estilo de Marco */}
              <div className="space-y-2">
                <span className="font-extrabold uppercase text-[10.5px] tracking-wider text-slate-700 dark:text-slate-300">
                  Estilo de Contorno
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['none', 'rounded', 'card', 'circle'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setLogoStyle(st)}
                      className={`py-1.5 rounded-xl border text-center font-bold text-[11px] cursor-pointer transition-all ${
                        logoStyle === st
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {st === 'none' ? 'Plano' : st === 'rounded' ? 'Redondeado' : st === 'card' ? 'Tarjeta' : 'Circular'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Color de Acento de la Factura */}
            <div className="space-y-2">
              <span className="font-extrabold uppercase text-[10.5px] tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <i className="ri-palette-line text-amber-500"></i> 3. Color de Acento Institucional
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setAccentColor(c.hex)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer text-[10.5px] font-semibold ${
                      accentColor === c.hex
                        ? 'border-slate-900 dark:border-white shadow-sm ring-2 ring-slate-400/30'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.hex }}></span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Opciones Adicionales de Factura */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="font-extrabold uppercase text-[10.5px] tracking-wider text-slate-700 dark:text-slate-300">
                4. Opciones de Contenido en la Factura
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showSlogan}
                    onChange={(e) => setShowSlogan(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[11px] font-semibold">Mostrar Eslogan</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showResolutionBox}
                    onChange={(e) => setShowResolutionBox(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[11px] font-semibold">Caja Resolución DIAN</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showBankAccounts}
                    onChange={(e) => setShowBankAccounts(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[11px] font-semibold">Datos Cta Bancaria</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showSignatures}
                    onChange={(e) => setShowSignatures(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[11px] font-semibold">Firmas al Pie (Emisor / Recibí)</span>
                </label>
              </div>

              {showBankAccounts && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">
                    Cuentas Bancarias para Recaudo (aparecen al pie de la factura):
                  </label>
                  <input
                    type="text"
                    value={bankAccountDetails}
                    onChange={(e) => setBankAccountDetails(e.target.value)}
                    placeholder="ej: Bancolombia Cta Ahorros No. 123-456789-01 a nombre de la empresa"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">
                  Notas / Leyenda de Título Valor (Ley 1231 de 2008):
                </label>
                <textarea
                  rows={2}
                  value={termsAndNotes}
                  onChange={(e) => setTermsAndNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

          </div>

          {/* Right Live Preview Column (5 cols) */}
          <div className="lg:col-span-5 p-5 bg-slate-100 dark:bg-slate-950 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Vista Previa Interactiva en Vivo
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Formato Carta A4</span>
              </div>

              {/* Miniature Simulated Invoice Sheet */}
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 text-slate-800 text-[10px] space-y-3 overflow-hidden select-none">
                
                {/* Banner layout if selected */}
                {logoPosition === 'banner' && (
                  <div 
                    className="p-3 -mx-4 -mt-4 text-white rounded-t-xl flex items-center justify-between"
                    style={{ backgroundColor: accentColor }}
                  >
                    <div className="flex items-center gap-2">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt="Logo" 
                          className={`${getLogoSizeClass(logoSize)} object-contain bg-white/90 p-1 rounded-lg`} 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">FK</div>
                      )}
                      <div>
                        <h4 className="font-extrabold text-xs uppercase leading-tight">{company.name}</h4>
                        <p className="text-[9px] text-white/80">NIT: {company.nit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-white/20 text-[8.5px] font-bold">FACTURA ELECTRÓNICA</span>
                      <p className="font-mono font-bold text-xs mt-0.5">FE-101</p>
                    </div>
                  </div>
                )}

                {/* Left layout */}
                {logoPosition === 'left' && (
                  <div className="flex items-start justify-between border-b pb-3 border-slate-100">
                    <div className="flex items-start gap-2.5">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt="Logo" 
                          className={`${getLogoSizeClass(logoSize)} ${getLogoStyleClass(logoStyle)} object-contain shrink-0`} 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold">Logo</div>
                      )}
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-xs text-slate-900 uppercase leading-tight">{company.name}</h4>
                        <p className="text-slate-500 text-[9px]">NIT: {company.nit}</p>
                        {showSlogan && company.slogan && (
                          <p className="text-slate-400 text-[8px] italic">{company.slogan}</p>
                        )}
                        <p className="text-slate-500 text-[8px]">{company.address}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span 
                        className="inline-block px-2 py-0.5 rounded font-bold text-[8px] uppercase tracking-wider mb-1"
                        style={{ color: accentColor, backgroundColor: `${accentColor}18` }}
                      >
                        Factura Electrónica
                      </span>
                      <p className="font-mono font-bold text-xs text-slate-900">FE-101</p>
                      <p className="text-slate-400 text-[8px]">Fecha: 2026-10-16</p>
                    </div>
                  </div>
                )}

                {/* Center layout */}
                {logoPosition === 'center' && (
                  <div className="text-center border-b pb-3 border-slate-100 space-y-1">
                    <div className="flex justify-center">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt="Logo" 
                          className={`${getLogoSizeClass(logoSize)} ${getLogoStyleClass(logoStyle)} object-contain mx-auto`} 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold mx-auto">Logo</div>
                      )}
                    </div>
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase leading-tight">{company.name}</h4>
                    <p className="text-slate-500 text-[9px]">NIT: {company.nit} · {company.address}</p>
                    {showSlogan && company.slogan && (
                      <p className="text-slate-400 text-[8px] italic">{company.slogan}</p>
                    )}
                    <div className="pt-1 flex items-center justify-center gap-3 text-[9px]">
                      <span className="font-mono font-bold" style={{ color: accentColor }}>FE-101</span>
                      <span className="text-slate-400">|</span>
                      <span>Fecha: 2026-10-16</span>
                    </div>
                  </div>
                )}

                {/* Right layout */}
                {logoPosition === 'right' && (
                  <div className="flex items-start justify-between border-b pb-3 border-slate-100">
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-xs text-slate-900 uppercase leading-tight">{company.name}</h4>
                      <p className="text-slate-500 text-[9px]">NIT: {company.nit}</p>
                      {showSlogan && company.slogan && (
                        <p className="text-slate-400 text-[8px] italic">{company.slogan}</p>
                      )}
                      <p className="text-slate-500 text-[8px]">{company.address}</p>
                      <p className="font-mono font-bold text-xs pt-1" style={{ color: accentColor }}>FE-101</p>
                    </div>
                    <div>
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt="Logo" 
                          className={`${getLogoSizeClass(logoSize)} ${getLogoStyleClass(logoStyle)} object-contain shrink-0`} 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold">Logo</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Resolution snippet if enabled */}
                {showResolutionBox && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-[8px] text-slate-500 leading-snug">
                    Resolución DIAN No. 187640000099 del 2026-01-15 · Prefijo FE (101 al 10000) · Validación Alanube Cloud
                  </div>
                )}

                {/* Client Box */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg text-[8.5px]">
                  <div>
                    <span className="text-slate-400 uppercase text-[7px] font-bold">Cliente</span>
                    <p className="font-bold text-slate-800">Supermercados Éxito S.A.</p>
                    <p className="text-slate-500">NIT: 890.900.608-9</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[7px] font-bold">Condición</span>
                    <p className="font-bold text-slate-800">Contado (Transferencia)</p>
                    <p className="text-slate-500">Moneda: COP</p>
                  </div>
                </div>

                {/* Table with custom accent color header */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[8px]">
                    <thead style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                      <tr className="font-bold">
                        <th className="p-1.5">Descripción</th>
                        <th className="p-1.5 text-center">Cant</th>
                        <th className="p-1.5 text-right">Precio</th>
                        <th className="p-1.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-1.5 font-medium">Servidor Rack Dell PowerEdge</td>
                        <td className="p-1.5 text-center">1</td>
                        <td className="p-1.5 text-right font-mono">$ 8.500.000</td>
                        <td className="p-1.5 text-right font-mono font-bold">$ 8.500.000</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-medium">Póliza Mantenimiento TI Anual</td>
                        <td className="p-1.5 text-center">1</td>
                        <td className="p-1.5 text-right font-mono">$ 1.200.000</td>
                        <td className="p-1.5 text-right font-mono font-bold">$ 1.200.000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end text-[8.5px]">
                  <div className="w-40 space-y-0.5">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span className="font-mono">$ 9.700.000</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>IVA (19%):</span>
                      <span className="font-mono">$ 1.843.000</span>
                    </div>
                    <div 
                      className="flex justify-between font-bold text-[10px] pt-1 border-t border-slate-200"
                      style={{ color: accentColor }}
                    >
                      <span>TOTAL:</span>
                      <span className="font-mono">$ 11.543.000</span>
                    </div>
                  </div>
                </div>

                {/* Bank Account snippet */}
                {showBankAccounts && bankAccountDetails && (
                  <div className="p-2 rounded bg-blue-50/60 border border-blue-100 text-[8px] text-blue-800">
                    <span className="font-bold">Información de Pago:</span> {bankAccountDetails}
                  </div>
                )}

                {/* Signatures Simulation */}
                {showSignatures && (
                  <div className="border-t border-slate-200 pt-1.5 grid grid-cols-2 gap-3 text-[7.5px] text-slate-600">
                    <div className="border-t border-slate-300 pt-0.5">
                      <p className="font-bold text-slate-800 uppercase text-[7px]">Firma Emisor</p>
                      <p className="truncate text-slate-500 text-[6.5px]">{company.name}</p>
                    </div>
                    <div className="border-t border-slate-300 pt-0.5">
                      <p className="font-bold text-slate-800 uppercase text-[7px]">Recibí Conforme</p>
                      <p className="text-slate-500 text-[6.5px]">Nombre, C.C. / Sello</p>
                    </div>
                  </div>
                )}

                {/* CUFE simulation */}
                <div className="border-t pt-2 flex items-center justify-between text-[7px] text-slate-400">
                  <div className="truncate max-w-[200px]">
                    <span className="font-bold">CUFE:</span> 6b2d189f299f43188f81591741ac4e82...
                  </div>
                  <div className="w-6 h-6 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-slate-600">
                    <i className="ri-qr-code-line text-sm"></i>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                <i className="ri-save-line text-sm"></i> Guardar Diseño de Factura
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

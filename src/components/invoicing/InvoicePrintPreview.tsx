import React, { useState } from 'react';
import { Voucher, Tercero, Product, ElectronicBillingConfig, Company, InvoiceDesignConfig } from '../../types';
import { buildWhatsAppInvoiceShareText } from '../../lib/dianUtils';
import { toast } from '../../context/ToastContext';
import InvoiceDesignModal, { DEFAULT_INVOICE_DESIGN } from './InvoiceDesignModal';

interface InvoicePrintPreviewProps {
  invoice: Voucher;
  onClose: () => void;
  currentCompany: Company;
  terceros: Tercero[];
  products: Product[];
  activeBillingConfig: ElectronicBillingConfig;
  getCUFESample: (invoiceNumber: string) => string;
  formatCOP: (val: number) => string;
  onUpdateCompany?: (co: Company) => void;
}

export default function InvoicePrintPreview({
  invoice,
  onClose,
  currentCompany,
  terceros,
  products,
  activeBillingConfig,
  getCUFESample,
  formatCOP,
  onUpdateCompany
}: InvoicePrintPreviewProps) {
  const [printFormat, setPrintFormat] = useState<'carta' | 'pos'>('carta');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showDesignModal, setShowDesignModal] = useState(false);

  // Density mode: True by default ensures up to 15 items fit strictly within a single page
  const [isCompactMode, setIsCompactMode] = useState<boolean>(true);

  // Number of items in invoice
  const itemCount = invoice.items && invoice.items.length > 0 ? invoice.items.length : 1;
  const fitsOnSinglePage = itemCount <= 15;

  // Read design settings from company or fallback
  const companyDesign: InvoiceDesignConfig = {
    ...DEFAULT_INVOICE_DESIGN,
    ...(currentCompany.invoiceDesign || {})
  };

  // Local interactive overrides for fast instant testing
  const [localLogoPosition, setLocalLogoPosition] = useState<InvoiceDesignConfig['logoPosition']>(companyDesign.logoPosition);
  const [localLogoSize, setLocalLogoSize] = useState<InvoiceDesignConfig['logoSize']>(companyDesign.logoSize);
  const [localLogoStyle, setLocalLogoStyle] = useState<InvoiceDesignConfig['logoStyle']>(companyDesign.logoStyle);
  const [localAccentColor, setLocalAccentColor] = useState<string>(companyDesign.accentColor);
  const [localShowSignatures, setLocalShowSignatures] = useState<boolean>(companyDesign.showSignatures !== false);

  const client = terceros.find((t) => t.id === invoice.thirdPartyId);

  // Quick save current in-preview tweaks as the permanent company default
  const handleSaveAsDefault = () => {
    if (!onUpdateCompany) return;
    const updatedCompany: Company = {
      ...currentCompany,
      invoiceDesign: {
        ...companyDesign,
        logoPosition: localLogoPosition,
        logoSize: localLogoSize,
        logoStyle: localLogoStyle,
        accentColor: localAccentColor,
        showSignatures: localShowSignatures
      }
    };
    onUpdateCompany(updatedCompany);
    toast.success('Posición del logo, firmas y diseño guardados como predeterminados para esta empresa.', 'Diseño Guardado');
  };

  const handleCopySummary = () => {
    const linesSummary = invoice.items && invoice.items.length > 0
      ? invoice.items.map(i => {
          const prod = products.find(p => p.id === i.productId);
          return `• ${i.qty}x ${prod?.name || 'Ítem'} (${formatCOP(i.unitPrice)}) = ${formatCOP(i.qty * i.unitPrice)}`;
        }).join('\n')
      : `• 1x ${invoice.concept || 'Mercancías'} = ${formatCOP(invoice.total)}`;

    const text = `*FACTURA ELECTRÓNICA DIAN*
*Empresa:* ${currentCompany.name} (NIT: ${currentCompany.nit})
*No. Factura:* ${invoice.number}
*Fecha:* ${invoice.date}
*Cliente:* ${client?.name || 'Cliente Mostrador'}
*NIT:* ${client?.nit || 'N/A'}
*Condición:* ${invoice.paymentTerm === 'credito' ? `Crédito (Vence: ${invoice.dueDate || 'N/A'})` : 'Contado'}

*Líneas:*
${linesSummary}

*TOTAL A PAGAR:* ${formatCOP(invoice.total)}
*CUFE:* ${invoice.billingProviderData?.cufe || getCUFESample(invoice.number)}`;

    navigator.clipboard.writeText(text);
    setCopyFeedback('¡Copiado!');
    toast.success('Resumen de la factura copiado al portapapeles.', 'Copiado');
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleShareWhatsApp = () => {
    const rawPhone = client?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const clientName = client?.name || 'Cliente';
    const cufe = invoice.billingProviderData?.cufe || getCUFESample(invoice.number);

    const waText = buildWhatsAppInvoiceShareText({
      companyName: currentCompany.name,
      invoiceNumber: invoice.number,
      clientName,
      totalCOP: formatCOP(invoice.total),
      date: invoice.date,
      cufe
    });

    const encoded = encodeURIComponent(waText);
    const targetUrl = cleanPhone.length >= 7
      ? `https://wa.me/${cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    toast.info('Abriendo ventana para compartir por WhatsApp.', 'WhatsApp');
  };

  // Helper size classes optimized for printing without spilling to page 2
  const getLogoSizeClass = (sz: InvoiceDesignConfig['logoSize']) => {
    if (isCompactMode) {
      switch (sz) {
        case 'sm': return 'h-10 w-10 max-h-10';
        case 'lg': return 'h-16 w-16 max-h-16';
        case 'xl': return 'h-20 w-20 max-h-20';
        case 'md':
        default: return 'h-12 w-12 max-h-12';
      }
    }
    switch (sz) {
      case 'sm': return 'h-12 w-12 max-h-12';
      case 'lg': return 'h-20 w-20 max-h-20';
      case 'xl': return 'h-24 w-24 max-h-24';
      case 'md':
      default: return 'h-16 w-16 max-h-16';
    }
  };

  const getLogoStyleClass = (st: InvoiceDesignConfig['logoStyle']) => {
    switch (st) {
      case 'circle': return 'rounded-full border border-slate-200 shadow-xs';
      case 'card': return 'rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs';
      case 'rounded': return 'rounded-xl border border-slate-200';
      case 'none':
      default: return 'rounded-none';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Navigation Bar: Return to Main Menu / Invoicing */}
      <div className="no-print bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-indigo-500/25 transition-all transform active:scale-95 shrink-0"
            id="btn-return-to-menu-top"
          >
            <i className="ri-arrow-left-line text-base"></i>
            <span>Volver a Facturación / Menú</span>
          </button>
          
          <div className="border-l border-slate-700/80 pl-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
              <span>Menú Principal</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-200">Facturación Electrónica</span>
              <span className="text-slate-500">/</span>
              <span className="text-indigo-400 font-bold font-mono">Factura {invoice.number}</span>
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2 mt-0.5">
              <span>Vista Previa & Impresión Fiscal: {invoice.number}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ✓ Validada DIAN
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <i className="ri-printer-line"></i>
            <span>Imprimir / PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-slate-700"
            title="Cerrar vista previa y regresar al formulario"
          >
            <i className="ri-close-line text-sm"></i>
            <span>Cerrar</span>
          </button>
        </div>
      </div>

      {/* Action Toolbar on Screen (Organized into 2 clear functional tiers) */}
      <div className="no-print bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 space-y-3 text-xs shadow-2xl backdrop-blur-md">
        
        {/* Tier 1: Document Info, Output Format & Primary Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          
          {/* Left: Document details & Format switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                <i className="ri-file-text-line text-base"></i>
              </div>
              <div>
                <h4 className="font-bold text-white text-xs leading-none">
                  Factura {invoice.number}
                </h4>
                <p className="text-[10.5px] text-slate-400 truncate max-w-[180px] leading-tight mt-0.5">
                  {client?.name || 'Cliente Mostrador'}
                </p>
              </div>
            </div>

            {/* Segmented Format Selector */}
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setPrintFormat('carta')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                  printFormat === 'carta' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <i className="ri-article-line"></i> Formato Carta (DIAN)
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('pos')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                  printFormat === 'pos' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <i className="ri-receipt-line"></i> Tirilla POS (80mm)
              </button>
            </div>
          </div>

          {/* Right: Output Actions (Copy, WhatsApp, Designer, Print, Close) */}
          <div className="flex items-center gap-2">
            {copyFeedback && (
              <span className="text-emerald-400 font-semibold text-[11px] animate-fade-in mr-1">
                ✓ {copyFeedback}
              </span>
            )}
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all flex items-center gap-1 cursor-pointer border border-slate-700/60"
              title="Copiar texto resumen al portapapeles"
            >
              <i className="ri-file-copy-line text-indigo-400"></i> Copiar
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              title="Compartir por WhatsApp"
            >
              <i className="ri-whatsapp-line"></i> WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setShowDesignModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              title="Abrir Diseñador Completo"
            >
              <i className="ri-palette-line"></i> Diseñador
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              title="Imprimir o guardar en PDF"
            >
              <i className="ri-printer-line"></i> Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700/60 ml-1"
              title="Cerrar vista previa"
            >
              <i className="ri-close-line text-base"></i>
            </button>
          </div>
        </div>

        {/* Tier 2: Print Settings Strip (Segmented Groups for Logo, Page Density, Signatures, and Status) */}
        {printFormat === 'carta' && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
            
            {/* Functional Group 1: Logo Placement & Size */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <i className="ri-image-line text-blue-400"></i> Logo:
              </span>
              
              {/* Position Segmented Pill */}
              <div className="inline-flex rounded-xl bg-slate-950 p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLocalLogoPosition('left')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    localLogoPosition === 'left' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Alinear logo a la izquierda"
                >
                  Izquierda
                </button>
                <button
                  type="button"
                  onClick={() => setLocalLogoPosition('center')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    localLogoPosition === 'center' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Centrar logo en el encabezado"
                >
                  Centro
                </button>
                <button
                  type="button"
                  onClick={() => setLocalLogoPosition('right')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    localLogoPosition === 'right' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Alinear logo a la derecha"
                >
                  Derecha
                </button>
                <button
                  type="button"
                  onClick={() => setLocalLogoPosition('banner')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    localLogoPosition === 'banner' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Fondo tipo banner de marca"
                >
                  Banda
                </button>
              </div>

              {/* Size Segmented Pill */}
              <div className="inline-flex rounded-xl bg-slate-950 p-0.5 border border-slate-800">
                {(['sm', 'md', 'lg', 'xl'] as const).map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setLocalLogoSize(sz)}
                    className={`px-2 py-1 rounded-lg font-bold uppercase text-[10px] transition-all cursor-pointer ${
                      localLogoSize === sz ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                    title={`Tamaño ${sz.toUpperCase()}`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Functional Group 2: Page Density & Signatures */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <i className="ri-settings-4-line text-indigo-400"></i> Opciones:
              </span>

              {/* Density Toggle */}
              <div className="inline-flex rounded-xl bg-slate-950 p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCompactMode(true)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer text-[10.5px] ${
                    isCompactMode ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ajuste optimizado para caber en una sola página (hasta 15 ítems)"
                >
                  <i className="ri-file-reduce-line"></i> 1 Hoja
                </button>
                <button
                  type="button"
                  onClick={() => setIsCompactMode(false)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer text-[10.5px] ${
                    !isCompactMode ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Espaciado estándar"
                >
                  Estándar
                </button>
              </div>

              {/* Signatures Toggle */}
              <button
                type="button"
                onClick={() => setLocalShowSignatures(!localShowSignatures)}
                className={`px-2.5 py-1 rounded-xl font-bold text-[10.5px] transition-all flex items-center gap-1.5 cursor-pointer border ${
                  localShowSignatures 
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/40' 
                    : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
                title="Mostrar u ocultar casillas de firma del emisor y recibí conforme"
              >
                <i className="ri-quill-pen-line"></i> Firmas: {localShowSignatures ? 'Sí' : 'No'}
              </button>
            </div>

            {/* Functional Group 3: Status Badge & Save Default */}
            <div className="flex items-center gap-2.5">
              <div className={`px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1.5 border ${
                fitsOnSinglePage
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${fitsOnSinglePage ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span>
                  {fitsOnSinglePage 
                    ? `1 Hoja (${itemCount} art.)`
                    : `Multi-hoja (${itemCount} art.)`}
                </span>
              </div>

              {onUpdateCompany && (
                <button
                  type="button"
                  onClick={handleSaveAsDefault}
                  className="text-amber-400 hover:text-amber-300 font-bold text-[10.5px] flex items-center gap-1 transition-all cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/30"
                  title="Guardar la configuración actual de logo, tamaño y firmas para esta empresa"
                >
                  <i className="ri-save-line"></i> Guardar Predeterminado
                </button>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Render Formato Carta (DIAN) */}
      {printFormat === 'carta' && (
        <div 
          id="print-section" 
          className={`bg-white rounded-2xl border border-slate-200 shadow-xl text-slate-800 max-w-4xl mx-auto transition-all ${
            isCompactMode 
              ? 'p-5 sm:p-7 space-y-2.5 print:p-0 print:border-none print:shadow-none print:space-y-2' 
              : 'p-7 sm:p-9 space-y-4 print:p-0 print:border-none print:shadow-none print:space-y-3'
          }`}
        >
          
          {/* 1. HEADER SECTION (with avoid-break class) */}
          <div id="print-section-header" className="print-avoid-break">
            {/* BANNER LAYOUT */}
            {localLogoPosition === 'banner' && (
              <div 
                className={`${isCompactMode ? '-mx-5 sm:-mx-7 -mt-5 sm:-mt-7 p-4 sm:p-5' : '-mx-7 sm:-mx-9 -mt-7 sm:-mt-9 p-5 sm:p-6'} rounded-t-2xl text-white shadow-inner flex flex-wrap items-center justify-between gap-3`}
                style={{ backgroundColor: localAccentColor }}
              >
                <div className="flex items-center gap-3">
                  {currentCompany.logoUrl ? (
                    <img 
                      src={currentCompany.logoUrl} 
                      alt="Logo Empresa" 
                      className={`${getLogoSizeClass(localLogoSize)} object-contain bg-white/95 p-1 rounded-lg shadow-sm shrink-0`} 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center font-black text-xl">
                      FK
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <h1 className="font-display font-black text-xl sm:text-2xl tracking-tight leading-tight">{currentCompany.name}</h1>
                    <p className="text-[11px] text-white/90 font-mono">NIT: {currentCompany.nit} · {currentCompany.address}</p>
                    {companyDesign.showSlogan && currentCompany.slogan && (
                      <p className="text-[10px] text-white/80 italic font-medium leading-none">{currentCompany.slogan}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-0.5 bg-white/20 border border-white/30 rounded-full text-[10px] font-black tracking-wider mb-0.5">
                    FACTURA ELECTRÓNICA DE VENTA
                  </span>
                  <h2 className="text-xl font-mono font-black text-white leading-tight">{invoice.number}</h2>
                  <p className="text-[10.5px] text-white/90">Emisión: {invoice.date}</p>
                  {invoice.dueDate && (
                    <p className="text-[10.5px] font-bold text-amber-200">Vence: {invoice.dueDate}</p>
                  )}
                </div>
              </div>
            )}

            {/* LEFT LAYOUT (Clásico) */}
            {localLogoPosition === 'left' && (
              <div className={`flex justify-between items-start border-b border-slate-200 ${isCompactMode ? 'pb-2.5' : 'pb-4'}`}>
                <div className="flex items-start gap-3">
                  {currentCompany.logoUrl ? (
                    <img 
                      src={currentCompany.logoUrl} 
                      alt="Logo Empresa" 
                      className={`${getLogoSizeClass(localLogoSize)} ${getLogoStyleClass(localLogoStyle)} object-contain shrink-0`} 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold shrink-0">
                      <i className="ri-building-2-line text-xl"></i>
                    </div>
                  )}
                  <div>
                    <h1 className="font-display font-bold text-lg sm:text-xl text-slate-900 tracking-tight leading-tight">{currentCompany.name}</h1>
                    <p className="text-[11px] text-slate-600 font-mono">NIT: {currentCompany.nit} · {currentCompany.address}</p>
                    {companyDesign.showSlogan && currentCompany.slogan && (
                      <p className="text-[10px] text-slate-500 italic">{currentCompany.slogan}</p>
                    )}
                    
                    {companyDesign.showResolutionBox && (
                      <div className="mt-1 text-[9px] text-slate-600 bg-slate-50 py-1 px-2 rounded-md border border-slate-200 leading-tight inline-block">
                        <span>Res. DIAN <strong>{activeBillingConfig.resolutionNumber}</strong> ({activeBillingConfig.resolutionDate}) · Prefijo <strong>{activeBillingConfig.prefix}</strong> ({activeBillingConfig.authorizedRangeFrom || 101}-{activeBillingConfig.authorizedRangeTo || 10000}) · {invoice.billingProviderData?.providerName || activeBillingConfig.providerName}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span 
                    className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider mb-1"
                    style={{ color: localAccentColor, backgroundColor: `${localAccentColor}18`, border: `1px solid ${localAccentColor}40` }}
                  >
                    FACTURA ELECTRÓNICA DE VENTA
                  </span>
                  <h2 className="text-xl font-bold font-mono text-slate-900 leading-tight">{invoice.number}</h2>
                  <p className="text-[10.5px] text-slate-500">Fecha: {invoice.date}</p>
                  {invoice.dueDate && (
                    <p className="text-[10.5px] font-semibold text-amber-700">Vence: {invoice.dueDate}</p>
                  )}
                </div>
              </div>
            )}

            {/* CENTER LAYOUT (Moderno Centrado) */}
            {localLogoPosition === 'center' && (
              <div className={`border-b border-slate-200 text-center space-y-1.5 ${isCompactMode ? 'pb-2.5' : 'pb-4'}`}>
                {currentCompany.logoUrl ? (
                  <img 
                    src={currentCompany.logoUrl} 
                    alt="Logo Empresa" 
                    className={`${getLogoSizeClass(localLogoSize)} ${getLogoStyleClass(localLogoStyle)} object-contain mx-auto shadow-xs`} 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold mx-auto">
                    <i className="ri-building-2-line text-xl"></i>
                  </div>
                )}
                <div>
                  <h1 className="font-display font-black text-xl text-slate-900 tracking-tight leading-tight">{currentCompany.name}</h1>
                  <p className="text-[11px] text-slate-600 font-mono">NIT: {currentCompany.nit} · {currentCompany.address}</p>
                  {companyDesign.showSlogan && currentCompany.slogan && (
                    <p className="text-[10px] text-slate-500 italic">{currentCompany.slogan}</p>
                  )}
                </div>

                {/* Centered meta strip */}
                <div className="flex flex-wrap items-center justify-between py-1 px-3 rounded-lg bg-slate-50 border border-slate-200 text-[10.5px]">
                  <div>
                    <span className="font-bold uppercase text-[9px] text-slate-400 mr-1.5">DOCUMENTO:</span>
                    <span className="font-bold text-slate-900">FACTURA ELECTRÓNICA DE VENTA</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="font-bold uppercase text-[9px] text-slate-400 mr-1">No.:</span>
                      <span className="font-mono font-bold text-sm" style={{ color: localAccentColor }}>{invoice.number}</span>
                    </div>
                    <div>
                      <span className="font-bold uppercase text-[9px] text-slate-400 mr-1">FECHA:</span>
                      <span className="font-mono font-semibold text-slate-700">{invoice.date}</span>
                    </div>
                    {invoice.dueDate && (
                      <div>
                        <span className="font-bold uppercase text-[9px] text-amber-600 mr-1">VENCE:</span>
                        <span className="font-mono font-bold text-amber-700">{invoice.dueDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {companyDesign.showResolutionBox && (
                  <div className="text-[9px] text-slate-500 text-center leading-tight">
                    Resolución DIAN No. <strong>{activeBillingConfig.resolutionNumber}</strong> ({activeBillingConfig.resolutionDate}) · Prefijo <strong>{activeBillingConfig.prefix}</strong> ({activeBillingConfig.authorizedRangeFrom || 101} al {activeBillingConfig.authorizedRangeTo || 10000}) · Validación {invoice.billingProviderData?.providerName || activeBillingConfig.providerName}
                  </div>
                )}
              </div>
            )}

            {/* RIGHT LAYOUT (Ejecutivo Derecha) */}
            {localLogoPosition === 'right' && (
              <div className={`flex justify-between items-start border-b border-slate-200 ${isCompactMode ? 'pb-2.5' : 'pb-4'}`}>
                <div className="space-y-0.5 max-w-lg">
                  <span 
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider mb-0.5"
                    style={{ color: localAccentColor, backgroundColor: `${localAccentColor}18`, border: `1px solid ${localAccentColor}40` }}
                  >
                    FACTURA ELECTRÓNICA DE VENTA
                  </span>
                  <h1 className="font-display font-black text-lg sm:text-xl text-slate-900 tracking-tight leading-tight">{currentCompany.name}</h1>
                  <p className="text-[11px] text-slate-600 font-mono">NIT: {currentCompany.nit} · {currentCompany.address}</p>
                  {companyDesign.showSlogan && currentCompany.slogan && (
                    <p className="text-[10px] text-slate-500 italic">{currentCompany.slogan}</p>
                  )}
                  <div className="pt-0.5 flex items-center gap-2 text-[10.5px]">
                    <span className="font-mono font-bold text-base" style={{ color: localAccentColor }}>{invoice.number}</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600">Fecha: {invoice.date}</span>
                    {invoice.dueDate && (
                      <>
                        <span className="text-slate-400">|</span>
                        <span className="text-amber-700 font-semibold">Vence: {invoice.dueDate}</span>
                      </>
                    )}
                  </div>
                  {companyDesign.showResolutionBox && (
                    <p className="text-[9px] text-slate-400 leading-tight">
                      Res. DIAN {activeBillingConfig.resolutionNumber} · Prefijo {activeBillingConfig.prefix} ({activeBillingConfig.authorizedRangeFrom || 101}-{activeBillingConfig.authorizedRangeTo || 10000})
                    </p>
                  )}
                </div>

                <div>
                  {currentCompany.logoUrl ? (
                    <img 
                      src={currentCompany.logoUrl} 
                      alt="Logo Empresa" 
                      className={`${getLogoSizeClass(localLogoSize)} ${getLogoStyleClass(localLogoStyle)} object-contain shrink-0`} 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold shrink-0">
                      <i className="ri-building-2-line text-xl"></i>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. CLIENT & FISCAL DETAILS (Compact 2-col with avoid-break) */}
          <div id="print-section-client" className="print-avoid-break grid grid-cols-2 gap-3 bg-slate-50 py-2 px-3 rounded-xl border border-slate-200 text-[10px] leading-snug">
            <div>
              <p className="font-bold text-slate-400 uppercase text-[8.5px] tracking-wider mb-0.5">Adquiriente / Cliente</p>
              <p className="font-bold text-slate-800 text-xs truncate">{client?.name || 'Consumidor Final'}</p>
              <p className="text-slate-600">NIT / C.C.: <strong className="font-mono">{client?.nit || '222222222222'}</strong></p>
              <p className="text-slate-600 truncate">Dirección: {client?.address || 'No registrada'}</p>
              <p className="text-slate-600">Tel: {client?.phone || 'N/A'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="font-bold text-slate-400 uppercase text-[8.5px] tracking-wider mb-0.5">Detalles de Operación Fiscal</p>
              <p className="text-slate-600">Forma de Pago: <strong className="uppercase">{invoice.paymentTerm === 'credito' ? 'Crédito' : 'Contado'}</strong></p>
              <p className="text-slate-600">Medio de Pago: <strong className="uppercase">Transferencia Bancaria / Efectivo</strong></p>
              <p className="text-slate-600">Moneda: <strong>COP - Peso Colombiano</strong></p>
              <p className="text-slate-600">Ambiente DIAN: <strong className="uppercase">{activeBillingConfig.environment}</strong></p>
            </div>
          </div>

          {/* 3. ITEMS TABLE (Ultra-Compact: each row is tight, 15 items take ~330px) */}
          <div id="print-section-table" className="overflow-hidden border border-slate-200 rounded-lg">
            <table className="w-full text-left text-slate-700 border-collapse">
              <thead>
                <tr 
                  className="border-b text-white font-bold uppercase text-[9px] tracking-wider"
                  style={{ backgroundColor: localAccentColor }}
                >
                  <th className="py-1 px-2.5">Código/SKU</th>
                  <th className="py-1 px-2">Descripción</th>
                  <th className="py-1 px-2">Lote/Vence</th>
                  <th className="py-1 px-2 text-center">Cant.</th>
                  <th className="py-1 px-2 text-right">Precio Unit.</th>
                  <th className="py-1 px-2 text-center">IVA</th>
                  <th className="py-1 px-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10px]">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, index) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const lineSubtotal = item.qty * item.unitPrice;
                    return (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="py-1 px-2.5 font-mono text-[9.5px] text-slate-500 whitespace-nowrap">{prod?.sku || `IT-${index + 1}`}</td>
                        <td className="py-1 px-2 font-semibold text-slate-800 leading-tight">{prod?.name || 'Mercancía General'}</td>
                        <td className="py-1 px-2 font-mono text-[9px] text-slate-500 whitespace-nowrap">
                          {item.lotNumber ? `${item.lotNumber}` : 'S/L'}
                        </td>
                        <td className="py-1 px-2 text-center font-bold text-slate-900">{item.qty}</td>
                        <td className="py-1 px-2 text-right font-mono">{formatCOP(item.unitPrice)}</td>
                        <td className="py-1 px-2 text-center font-mono text-[9.5px]">{prod?.tax ?? 19}%</td>
                        <td className="py-1 px-2.5 text-right font-mono font-bold text-slate-900">{formatCOP(lineSubtotal)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-2.5 px-3 text-center text-slate-500 italic">
                      Concepto: {invoice.concept || 'Venta de productos y servicios'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 4. TOTALS & BANK PAYMENT INFO (With 2cm space after table requested by user) */}
          <div 
            id="print-section-totals" 
            className={`print-avoid-break flex flex-col sm:flex-row justify-between items-start gap-3 ${
              itemCount <= 8 
                ? 'mt-8 sm:mt-9 print:mt-[20mm]' 
                : itemCount <= 12 
                  ? 'mt-5 sm:mt-6 print:mt-[14mm]' 
                  : 'mt-3 sm:mt-4 print:mt-[8mm]'
            }`}
          >
            
            {/* Left: Bank Account Payment Info and Legal Terms */}
            <div className="space-y-1.5 flex-1 max-w-sm">
              {companyDesign.showBankAccounts && companyDesign.bankAccountDetails && (
                <div className="bg-slate-50 py-1.5 px-2.5 rounded-lg border border-slate-200 text-[9.5px]">
                  <p className="font-bold text-slate-700 text-[9px] uppercase flex items-center gap-1 mb-0.5">
                    <i className="ri-bank-card-line text-blue-600"></i> Información Bancaria para Pagos:
                  </p>
                  <p className="font-semibold text-slate-800 leading-tight">{companyDesign.bankAccountDetails}</p>
                </div>
              )}
              {companyDesign.termsAndNotes && (
                <p className="text-[8px] text-slate-500 leading-tight italic">
                  {companyDesign.termsAndNotes}
                </p>
              )}
            </div>

            {/* Right: Calculations Summary Box */}
            <div className="w-full sm:w-72 space-y-0.5 text-[10px] text-slate-600 bg-slate-50 py-2 px-3 rounded-lg border border-slate-200 shrink-0">
              <div className="flex justify-between">
                <span>Subtotal Gravable:</span>
                <span className="font-mono">
                  {invoice.items && invoice.items.length > 0 
                    ? formatCOP(invoice.items.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0))
                    : formatCOP(invoice.total / 1.19)}
                </span>
              </div>
              {invoice.discountTotal && invoice.discountTotal > 0 ? (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Descuento Comercial:</span>
                  <span className="font-mono">-{formatCOP(invoice.discountTotal)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span>IVA Estimado:</span>
                <span className="font-mono">
                  {invoice.items && invoice.items.length > 0 
                    ? formatCOP(invoice.items.reduce((acc, item) => {
                        const prod = products.find(p => p.id === item.productId);
                        const taxFactor = prod ? (prod.tax / 100) : 0.19;
                        return acc + (item.qty * item.unitPrice * taxFactor);
                      }, 0))
                    : formatCOP(invoice.total - (invoice.total / 1.19))}
                </span>
              </div>
              {invoice.retenciones?.retefuente && invoice.retenciones.retefuente > 0 ? (
                <div className="flex justify-between text-rose-700 font-semibold">
                  <span>ReteFuente:</span>
                  <span className="font-mono">-{formatCOP(invoice.retenciones.retefuente)}</span>
                </div>
              ) : null}
              <div 
                className="flex justify-between pt-1 mt-0.5 font-black text-sm border-t border-slate-300"
                style={{ color: localAccentColor }}
              >
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono">{formatCOP(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* 5. SIGNATURES SECTION (Ubicadas más abajo con espacio amplio de 2cm para firmar) */}
          {localShowSignatures && (
            <div 
              id="print-section-signatures" 
              className={`print-avoid-break border-t border-slate-200 ${
                itemCount <= 8
                  ? 'mt-7 sm:mt-9 print:mt-[18mm] pt-3'
                  : itemCount <= 12
                    ? 'mt-5 sm:mt-6 print:mt-[12mm] pt-2.5'
                    : 'mt-3 sm:mt-4 print:mt-[8mm] pt-2'
              }`}
            >
              <div className="grid grid-cols-2 gap-8 text-[9px] text-slate-700">
                
                {/* Firma Autorizada Emisor */}
                <div className="flex flex-col justify-end pt-9 sm:pt-11 print:pt-9">
                  <div className="border-t-2 border-slate-400 pt-1.5 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-slate-900 text-[8.5px]">
                        Firma Autorizada / Emisor
                      </span>
                      <span className="text-[7.5px] text-slate-400 font-mono">Sello de Despacho</span>
                    </div>
                    <p className="font-semibold text-slate-700 text-[8px] truncate leading-tight">
                      {currentCompany.name}
                    </p>
                    <p className="text-[7.5px] text-slate-500 font-mono leading-none">
                      NIT: {currentCompany.nit}
                    </p>
                  </div>
                </div>

                {/* Recibí Conforme (Aceptación del Comprador) */}
                <div className="flex flex-col justify-end pt-9 sm:pt-11 print:pt-9">
                  <div className="border-t-2 border-slate-400 pt-1.5 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-slate-900 text-[8.5px]">
                        Recibí Conforme (Aceptación)
                      </span>
                      <span className="text-[7.5px] text-slate-400 font-mono">Fecha: ___/___/2026</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[7.5px] text-slate-600 leading-tight">
                      <p className="truncate">Nombre: ____________________</p>
                      <p className="truncate">C.C. / NIT: ________________</p>
                    </div>
                    <p className="text-[7px] text-slate-400 italic leading-none pt-0.5">
                      Constancia de recibo a satisfacción y entrega real y material de mercancías o servicios prestados (Art. 773 C.Co. / Ley 1231 de 2008).
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 6. CUFE & QR VALIDATION FOOTER (Compact strip with avoid-break) */}
          <div id="print-section-footer" className="print-avoid-break border-t border-slate-200 pt-2 flex items-center justify-between gap-3 text-[9px] text-slate-500">
            <div className="space-y-0.5 flex-1 pr-2">
              <p className="font-mono break-all font-semibold text-slate-700 text-[8px] leading-tight">
                <span className="text-slate-400 font-bold">CUFE:</span> {invoice.billingProviderData?.cufe || getCUFESample(invoice.number)}
              </p>
              <p className="text-[8.5px] leading-tight text-slate-600">Representación gráfica de Factura Electrónica de Venta según resoluciones vigentes de la DIAN.</p>
              <p className="text-[8px] text-slate-400 leading-none">Software FinteKia Cloud ERP · Validado por Proveedor Tecnológico Autorizado</p>
            </div>
            <div className="w-14 h-14 bg-slate-100 rounded flex items-center justify-center border border-slate-200 text-slate-800 shrink-0">
              <i className="ri-qr-code-line text-3xl"></i>
            </div>
          </div>
        </div>
      )}

      {/* Render Formato Tirilla POS (80mm) */}
      {printFormat === 'pos' && (
        <div id="print-section-pos" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xl text-slate-900 max-w-[340px] mx-auto font-mono text-[11px] leading-tight space-y-3">
          <div className="text-center space-y-1 pb-2 border-b border-dashed border-slate-400">
            {currentCompany.logoUrl && (
              <img 
                src={currentCompany.logoUrl} 
                alt="Logo" 
                className="w-12 h-12 mx-auto object-contain mb-1" 
                referrerPolicy="no-referrer"
              />
            )}
            <h2 className="font-bold text-sm uppercase">{currentCompany.name}</h2>
            <p>NIT: {currentCompany.nit}</p>
            <p>{currentCompany.address}</p>
            <p>Régimen: {currentCompany.regimen || 'Responsable de IVA'}</p>
            <div className="pt-1 text-[9.5px] text-slate-600">
              <p>RESOLUCIÓN DIAN No. {activeBillingConfig.resolutionNumber}</p>
              <p>Prefijo {activeBillingConfig.prefix} ({activeBillingConfig.authorizedRangeFrom || 101} al {activeBillingConfig.authorizedRangeTo || 10000})</p>
            </div>
          </div>

          <div className="space-y-1 pb-2 border-b border-dashed border-slate-400 text-[10.5px]">
            <div className="flex justify-between font-bold">
              <span>FACTURA ELECTRÓNICA:</span>
              <span>{invoice.number}</span>
            </div>
            <div className="flex justify-between">
              <span>FECHA:</span>
              <span>{invoice.date}</span>
            </div>
            <div className="flex justify-between">
              <span>ADQUIRIENTE:</span>
              <span className="truncate max-w-[160px] text-right font-semibold">
                {client?.name || 'Cliente'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>NIT/CC:</span>
              <span>{client?.nit || 'N/A'}</span>
            </div>
          </div>

          {/* POS Items list */}
          <div className="space-y-1 pb-2 border-b border-dashed border-slate-400">
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((it, idx) => {
                const prod = products.find((p) => p.id === it.productId);
                return (
                  <div key={idx} className="space-y-0.5">
                    <p className="font-bold truncate">{prod?.name || 'Ítem'}</p>
                    <div className="flex justify-between text-slate-700">
                      <span>{it.qty} x {formatCOP(it.unitPrice)}</span>
                      <span className="font-bold">{formatCOP(it.qty * it.unitPrice)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p>{invoice.concept}</p>
            )}
          </div>

          <div className="space-y-1 text-right font-bold text-xs">
            <div className="flex justify-between text-sm pt-1 border-t border-slate-800">
              <span>TOTAL A PAGAR:</span>
              <span>{formatCOP(invoice.total)}</span>
            </div>
          </div>

          {/* CUFE on ticket */}
          <div className="pt-2 text-center text-[8.5px] text-slate-500 space-y-1">
            <p className="break-all font-mono">CUFE: {invoice.billingProviderData?.cufe || getCUFESample(invoice.number).slice(0, 32)}...</p>
            <div className="w-14 h-14 mx-auto bg-slate-100 flex items-center justify-center border border-slate-300">
              <i className="ri-qr-code-line text-3xl"></i>
            </div>
            <p className="pt-1">¡Gracias por su compra!</p>
          </div>
        </div>
      )}

      {/* Bottom Navigation Footer (no-print) */}
      <div className="no-print pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 text-xs text-slate-300">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 border border-slate-700"
          id="btn-return-to-menu-bottom"
        >
          <i className="ri-arrow-left-line text-sm"></i>
          <span>Volver al Menú de Facturación</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <i className="ri-whatsapp-line"></i>
            <span>Compartir WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black flex items-center gap-2 cursor-pointer shadow-xl transition-all"
          >
            <i className="ri-printer-line text-sm"></i>
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Invoice Design Full Modal */}
      {showDesignModal && (
        <InvoiceDesignModal
          company={currentCompany}
          isOpen={showDesignModal}
          onClose={() => setShowDesignModal(false)}
          onSave={(updated) => {
            if (onUpdateCompany) onUpdateCompany(updated);
            if (updated.invoiceDesign) {
              setLocalLogoPosition(updated.invoiceDesign.logoPosition);
              setLocalLogoSize(updated.invoiceDesign.logoSize);
              setLocalLogoStyle(updated.invoiceDesign.logoStyle);
              setLocalAccentColor(updated.invoiceDesign.accentColor);
            }
          }}
          formatCOP={formatCOP}
        />
      )}
    </div>
  );
}

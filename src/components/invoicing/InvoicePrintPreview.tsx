import React, { useState } from 'react';
import { Voucher, Tercero, Product, ElectronicBillingConfig } from '../../types';
import { buildWhatsAppInvoiceShareText } from '../../lib/dianUtils';
import { toast } from '../../context/ToastContext';

interface InvoicePrintPreviewProps {
  invoice: Voucher;
  onClose: () => void;
  currentCompany: any;
  terceros: Tercero[];
  products: Product[];
  activeBillingConfig: ElectronicBillingConfig;
  getCUFESample: (invoiceNumber: string) => string;
  formatCOP: (val: number) => string;
}

export default function InvoicePrintPreview({
  invoice,
  onClose,
  currentCompany,
  terceros,
  products,
  activeBillingConfig,
  getCUFESample,
  formatCOP
}: InvoicePrintPreviewProps) {
  const [printFormat, setPrintFormat] = useState<'carta' | 'pos'>('carta');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const client = terceros.find((t) => t.id === invoice.thirdPartyId);

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

  return (
    <div className="space-y-4">
      {/* Action Toolbar on Screen (hidden when printed) */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold mr-1">Formato de Impresión:</span>
          <button
            type="button"
            onClick={() => setPrintFormat('carta')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              printFormat === 'carta' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <i className="ri-file-text-line"></i> Formato Carta (DIAN)
          </button>
          <button
            type="button"
            onClick={() => setPrintFormat('pos')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              printFormat === 'pos' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <i className="ri-receipt-line"></i> Tirilla Térmica POS (80mm)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {copyFeedback && (
            <span className="text-emerald-400 font-semibold text-[11px] animate-fade-in mr-2">
              ✓ {copyFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all flex items-center gap-1 cursor-pointer"
            title="Copiar texto resumen de la factura al portapapeles"
          >
            <i className="ri-file-copy-line text-indigo-400"></i> Copiar Resumen
          </button>
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-md"
            title="Compartir enlace y datos de factura por WhatsApp"
          >
            <i className="ri-whatsapp-line"></i> Enviar por WhatsApp
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <i className="ri-printer-line"></i> Imprimir / PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Cerrar vista previa"
          >
            <i className="ri-close-line text-base"></i>
          </button>
        </div>
      </div>

      {/* Render Formato Carta */}
      {printFormat === 'carta' && (
        <div id="print-section" className="bg-white p-8 rounded-2xl border border-slate-100 shadow-lg text-slate-800 max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-start border-b pb-6">
            <div className="flex items-start gap-4">
              {currentCompany.logoUrl && (
                <img 
                  src={currentCompany.logoUrl} 
                  alt="Logo" 
                  className="w-16 h-16 object-contain rounded-lg border border-slate-200 shrink-0" 
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight">{currentCompany.name}</h1>
                <p className="text-xs text-slate-500 mt-1">NIT: {currentCompany.nit}</p>
                <p className="text-xs text-slate-500">{currentCompany.address}</p>
                <div className="mt-2 text-[10px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-0.5">
                  <p>Resolución DIAN No. <strong>{activeBillingConfig.resolutionNumber}</strong> del {activeBillingConfig.resolutionDate}</p>
                  <p>Prefijo <strong>{activeBillingConfig.prefix}</strong> ({activeBillingConfig.authorizedRangeFrom || 101} al {activeBillingConfig.authorizedRangeTo || 10000})</p>
                  <p className="text-emerald-700 font-semibold">Validación Automática DIAN vía {invoice.billingProviderData?.providerName || activeBillingConfig.providerName}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold font-mono tracking-wider mb-2">
                FACTURA ELECTRÓNICA DE VENTA
              </span>
              <h2 className="text-xl font-bold font-mono text-slate-900">{invoice.number}</h2>
              <p className="text-xs text-slate-500 mt-1">Fecha Emisión: {invoice.date}</p>
              {invoice.dueDate && (
                <p className="text-xs font-semibold text-amber-700">Vence: {invoice.dueDate}</p>
              )}
            </div>
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Adquiriente / Cliente</p>
              <p className="font-bold text-slate-800 text-sm">{client?.name || 'Consumidor Final'}</p>
              <p className="text-slate-600">NIT / C.C.: {client?.nit || '222222222222'}</p>
              <p className="text-slate-600">Dirección: {client?.address || 'No registrada'}</p>
              <p className="text-slate-600">Tel: {client?.phone || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Detalles de Operación Fiscal</p>
              <p className="text-slate-600">Forma de Pago: <strong className="uppercase">{invoice.paymentTerm === 'credito' ? 'Crédito' : 'Contado'}</strong></p>
              <p className="text-slate-600">Medio de Pago: <strong className="uppercase">Transferencia Bancaria / Efectivo</strong></p>
              <p className="text-slate-600">Moneda: <strong>COP - Peso Colombiano</strong></p>
              <p className="text-slate-600">Ambiente DIAN: <strong className="uppercase">{activeBillingConfig.environment}</strong></p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-800 font-bold uppercase text-[9.5px] tracking-wider">
                  <th className="py-2.5 px-3">Código/SKU</th>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-3">Lote/Vence</th>
                  <th className="py-2.5 px-3 text-center">Cant.</th>
                  <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                  <th className="py-2.5 px-3 text-center">IVA</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, index) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const lineSubtotal = item.qty * item.unitPrice;
                    return (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{prod?.sku || `ITEM-${index + 1}`}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{prod?.name || 'Mercancía General'}</td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                          {item.lotNumber ? `${item.lotNumber} (${item.expirationDate || 'N/A'})` : 'S/L'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">{item.qty}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCOP(item.unitPrice)}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-[10px]">{prod?.tax || 19}%</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCOP(lineSubtotal)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-3 px-3 text-center text-slate-400">
                      Concepto: {invoice.concept}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Subtotals & Taxes */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
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
              <div className="flex justify-between pt-1.5 font-bold text-sm text-blue-600 border-t border-slate-300">
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono">{formatCOP(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* CUFE & QR Validation Footer */}
          <div className="border-t pt-4 flex items-center justify-between gap-4 text-[10px] text-slate-500">
            <div className="space-y-1 flex-1">
              <p className="font-mono break-all font-semibold text-slate-700">
                <span className="text-slate-400 font-bold">CUFE:</span> {invoice.billingProviderData?.cufe || getCUFESample(invoice.number)}
              </p>
              <p>Representación gráfica de Factura Electrónica de Venta según resoluciones vigentes de la DIAN.</p>
              <p className="text-[9px] text-slate-400">Software FinteKia Cloud ERP · Validado por Proveedor Tecnológico Autorizado</p>
            </div>
            <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 text-slate-800 shrink-0">
              <i className="ri-qr-code-line text-5xl"></i>
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
            <div className="flex justify-between">
              <span>CONDICIÓN:</span>
              <span className="uppercase font-bold">{invoice.paymentTerm === 'credito' ? 'Crédito' : 'Contado'}</span>
            </div>
            {invoice.dueDate && invoice.paymentTerm === 'credito' && (
              <div className="flex justify-between text-amber-800 font-bold">
                <span>VENCE:</span>
                <span>{invoice.dueDate}</span>
              </div>
            )}
          </div>

          {/* POS Items */}
          <div className="space-y-1.5 pb-2 border-b border-dashed border-slate-400">
            <div className="font-bold text-[10px] text-slate-500 flex justify-between uppercase">
              <span>Cant. / Detalle</span>
              <span>Total</span>
            </div>
            <div className="space-y-1">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, idx) => {
                  const prod = products.find((p) => p.id === item.productId);
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between">
                        <span className="truncate max-w-[210px]">{item.qty}x {prod?.name || 'Ítem'}</span>
                        <span className="font-semibold">{formatCOP(item.qty * item.unitPrice)}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 pl-4">
                        Unit: {formatCOP(item.unitPrice)} {item.lotNumber && item.lotNumber !== 'S/L' ? `· Lt: ${item.lotNumber}` : ''}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex justify-between">
                  <span>1x Venta de mercancías</span>
                  <span>{formatCOP(invoice.total)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1 pb-2 border-b border-dashed border-slate-400 text-right">
            <div className="flex justify-between">
              <span>SUBTOTAL:</span>
              <span>
                {invoice.items && invoice.items.length > 0
                  ? formatCOP(invoice.items.reduce((acc, item) => acc + item.qty * item.unitPrice, 0))
                  : formatCOP(invoice.total / 1.19)}
              </span>
            </div>
            {invoice.discountTotal && invoice.discountTotal > 0 ? (
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>DESCUENTO:</span>
                <span>-{formatCOP(invoice.discountTotal)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span>IVA ESTIMADO:</span>
              <span>
                {invoice.items && invoice.items.length > 0
                  ? formatCOP(invoice.items.reduce((acc, item) => {
                      const prod = products.find((p) => p.id === item.productId);
                      const taxFactor = prod ? prod.tax / 100 : 0.19;
                      return acc + item.qty * item.unitPrice * taxFactor;
                    }, 0))
                  : formatCOP(invoice.total - (invoice.total / 1.19))}
              </span>
            </div>
            {invoice.retenciones?.retefuente && invoice.retenciones.retefuente > 0 ? (
              <div className="flex justify-between text-rose-800 font-semibold">
                <span>RETEFUENTE:</span>
                <span>-{formatCOP(invoice.retenciones.retefuente)}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
              <span>TOTAL A PAGAR:</span>
              <span>{formatCOP(invoice.total)}</span>
            </div>
          </div>

          {/* CUFE & QR */}
          <div className="text-center space-y-1.5 pt-1 text-[9px] text-slate-600">
            <div className="p-1 bg-slate-50 border border-slate-200 rounded break-all font-mono text-[8px] leading-tight">
              <span className="font-bold block text-slate-800">CUFE:</span>
              {invoice.billingProviderData?.cufe || getCUFESample(invoice.number)}
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <i className="ri-qr-code-line text-3xl text-slate-800"></i>
              <span className="text-[8.5px] text-left text-slate-500 max-w-[190px]">
                Documento validado por la DIAN a través del Proveedor Tecnológico {invoice.billingProviderData?.providerName || activeBillingConfig.providerName}
              </span>
            </div>
            <p className="font-bold pt-2 text-[10.5px] text-slate-900">¡GRACIAS POR SU COMPRA!</p>
            <p className="text-[8px] text-slate-400">Software FinteKia Cloud ERP</p>
          </div>
        </div>
      )}
    </div>
  );
}

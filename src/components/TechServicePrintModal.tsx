import React, { useState } from 'react';
import { TechServiceOrder, Company } from '../types';
import { 
  Printer, 
  Share2, 
  X, 
  Wrench, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  QrCode, 
  Clock, 
  Smartphone, 
  Tag,
  AlertTriangle
} from 'lucide-react';
import { WORKSHOP_STATUS_CONFIG, buildWhatsAppServiceNotification, getWhatsAppPhoneLink } from '../lib/techServiceUtils';

interface TechServicePrintModalProps {
  order: TechServiceOrder;
  company: Company;
  onClose: () => void;
  formatCOP: (v: number) => string;
}

export default function TechServicePrintModal({
  order,
  company,
  onClose,
  formatCOP
}: TechServicePrintModalProps) {
  // Document Type: 'recepcion' (Entrada de equipo) or 'entrega' (Acta de entrega y garantía)
  const [docType, setDocType] = useState<'recepcion' | 'entrega'>(
    order.status === 'completado' || order.status === 'entregado' ? 'entrega' : 'recepcion'
  );

  // Print paper format: 'pos' (80mm térmica) or 'carta' (A4/Carta)
  const [paperFormat, setPaperFormat] = useState<'pos' | 'carta'>('carta');

  const statusInfo = WORKSHOP_STATUS_CONFIG[order.status] || { label: order.status };
  const totalParts = (order.partsUsed || []).reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
  const labor = order.laborCost || 0;
  const grandTotal = order.finalCost || (totalParts + labor) || order.estimatedCost;

  const handlePrint = () => {
    window.print();
  };

  const whatsappMessage = buildWhatsAppServiceNotification(order, company, formatCOP);
  const whatsappUrl = getWhatsAppPhoneLink(order.clientPhone, whatsappMessage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none print:max-h-none print:bg-white">
        
        {/* MODAL CONTROLS BAR (Hidden during printing) */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Impresión de Documento de Taller</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  {order.code}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Selecciona el tipo de comprobante y el formato de salida deseado.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Document Type Selector */}
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDocType('recepcion')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  docType === 'recepcion'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Comprobante Recepción
              </button>
              <button
                type="button"
                onClick={() => setDocType('entrega')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  docType === 'entrega'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Acta de Entrega & Garantía
              </button>
            </div>

            {/* Paper Format Selector */}
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPaperFormat('carta')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  paperFormat === 'carta'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hoja Carta / A4
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('pos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  paperFormat === 'pos'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tirilla POS 80mm
              </button>
            </div>

            {/* WhatsApp Share Button */}
            {order.clientPhone && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                title="Compartir notificación de orden por WhatsApp"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-sky-500/20 cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CANVAS CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/70 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          
          {/* ======================================================== */}
          {/* FORMAT 1: HOJA CARTA / MEDIA CARTA PROFESIONAL           */}
          {/* ======================================================== */}
          {paperFormat === 'carta' && (
            <div className="w-full max-w-3xl bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-xl print:shadow-none print:rounded-none print:p-6 print:w-full space-y-6 border border-slate-200">
              
              {/* Header: Company & Order Code */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-slate-900 text-white font-mono font-black text-sm">
                      FK
                    </span>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                      {company.name}
                    </h1>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    NIT: {company.nit} | Régimen Comercial
                  </p>
                  <p className="text-xs text-slate-600">
                    {company.address} {company.city ? `- ${company.city}` : ''}
                  </p>
                  <p className="text-xs text-slate-600">
                    PBX / WhatsApp: {company.phone || '(+57) 300 000 0000'} | {company.email || 'contacto@empresa.com'}
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    docType === 'recepcion' 
                      ? 'bg-sky-100 text-sky-900 border border-sky-300' 
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}>
                    {docType === 'recepcion' ? 'ORDEN DE ENTRADA AL TALLER' : 'ACTA DE ENTREGA & GARANTÍA'}
                  </span>

                  <p className="font-mono text-2xl font-black text-slate-950 pt-1">
                    {order.code}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    Fecha: {order.createdAt}
                  </p>
                  <div className="flex items-center justify-end gap-1.5 text-xs text-slate-600 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Técnico: <strong>{order.technician || 'Laboratorio TI'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Client & Device Box Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Client Info */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <span className="font-mono font-bold text-[10px] text-slate-500 uppercase tracking-wider block">
                    DATOS DEL PROPIETARIO / CLIENTE
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    {order.clientName}
                  </p>
                  <p className="text-slate-600">
                    Teléfono / WhatsApp: <strong className="text-slate-900">{order.clientPhone || 'No registrado'}</strong>
                  </p>
                  {order.clientEmail && (
                    <p className="text-slate-600">
                      Email: <strong className="text-slate-900">{order.clientEmail}</strong>
                    </p>
                  )}
                  <p className="text-slate-600 font-mono text-[11px]">
                    ID Tercero: {order.clientId}
                  </p>
                </div>

                {/* Device Info */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <span className="font-mono font-bold text-[10px] text-slate-500 uppercase tracking-wider block">
                    DATOS DEL EQUIPO O DISPOSITIVO
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    {order.device}
                  </p>
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-700">
                    <span>Serial (S/N): <strong className="text-slate-950">{order.serial || 'N/A'}</strong></span>
                    {order.brand && <span>Marca: {order.brand}</span>}
                  </div>
                  {order.devicePassword && (
                    <p className="text-slate-700 bg-amber-50 p-1 rounded border border-amber-200 text-[10.5px]">
                      Clave / PIN de Acceso: <strong>{order.devicePassword}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Accessories and Physical state (Crucial for repair shops) */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <span className="font-bold text-slate-700 block mb-0.5">
                    Accesorios Dejados en Custodia:
                  </span>
                  <p className="text-slate-600 italic">
                    {order.accessoriesReceived || 'Únicamente el equipo principal (Sin cargador ni cables adicionales).'}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <span className="font-bold text-slate-700 block mb-0.5">
                    Estado Físico al Recibir (Checklist):
                  </span>
                  <p className="text-slate-600 italic">
                    {order.physicalCondition || 'Se recibe equipo en condiciones normales de uso. Sin golpes visibles.'}
                  </p>
                </div>
              </div>

              {/* Reported Issue & Diagnosis */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">
                    Falla Reportada por el Cliente:
                  </span>
                  <p className="text-slate-700 leading-relaxed">
                    {order.reportedIssue}
                  </p>
                </div>

                {order.diagnosis && (
                  <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200">
                    <span className="font-bold text-sky-950 block mb-1">
                      Diagnóstico Técnico de Laboratorio:
                    </span>
                    <p className="text-slate-800 leading-relaxed">
                      {order.diagnosis}
                    </p>
                  </div>
                )}

                {docType === 'entrega' && order.solutionApplied && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                    <span className="font-bold text-emerald-950 block mb-1">
                      Trabajo Efectuado / Solución Aplicada:
                    </span>
                    <p className="text-slate-800 leading-relaxed">
                      {order.solutionApplied}
                    </p>
                  </div>
                )}
              </div>

              {/* Parts & Labor Table (Shown in Entrega or when items exist) */}
              {docType === 'entrega' && (order.partsUsed && order.partsUsed.length > 0) && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-mono">
                    Repuestos y Materiales Instalados
                  </h4>
                  <table className="w-full text-xs text-left border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-mono">
                      <tr>
                        <th className="py-1.5 px-3">Descripción de Parte / Repuesto</th>
                        <th className="py-1.5 px-3 text-center">Cant.</th>
                        <th className="py-1.5 px-3 text-right">V. Unitario</th>
                        <th className="py-1.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {order.partsUsed.map((part, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-3 font-medium text-slate-800">{part.name}</td>
                          <td className="py-1.5 px-3 text-center font-mono">{part.quantity}</td>
                          <td className="py-1.5 px-3 text-right font-mono">{formatCOP(part.unitPrice)}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCOP(part.quantity * part.unitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Economic Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-72 p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-xs space-y-1.5">
                  {docType === 'entrega' && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal Repuestos:</span>
                        <span className="font-mono">{formatCOP(totalParts)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Mano de Obra / Servicios:</span>
                        <span className="font-mono">{formatCOP(labor)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-950 pt-1 border-t border-slate-300">
                    <span>{docType === 'recepcion' ? 'Presupuesto Estimado:' : 'Total Liquidado:'}</span>
                    <span className="font-mono text-emerald-700">{formatCOP(grandTotal)}</span>
                  </div>
                  {docType === 'entrega' && (
                    <div className="pt-1 border-t border-slate-300 text-[11px] text-emerald-800 flex items-center justify-between font-semibold">
                      <span>Garantía Otorgada:</span>
                      <span>{order.warrantyDays || 30} Días Calendario</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Legal Clauses & Custody Terms (Colombian Consumer Law Ley 1480 / 2011) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[9.5px] text-slate-500 leading-tight space-y-1">
                <p className="font-bold text-slate-700 uppercase">
                  Términos y Condiciones del Servicio Técnico:
                </p>
                <p>
                  1. <strong>Copia de Seguridad:</strong> El cliente declara haber realizado respaldo previo de su información confidencial. El taller no responde por pérdida de datos preexistentes o software no licenciado.
                </p>
                <p>
                  2. <strong>Custodia y Abandono (Ley 1480 de 2011):</strong> Pasados treinta (30) días calendario a partir de la notificación de retiro del equipo sin ser reclamado, se generará cargo por bodegaje de $5.000 COP diarios. A los sesenta (60) días el equipo se considerará en estado de abandono legal.
                </p>
                <p>
                  3. <strong>Garantía:</strong> La garantía ampara únicamente la falla y repuestos intervenidos expresamente en esta orden, caducando si se violan los sellos de seguridad o por sobrevoltajes eléctricos.
                </p>
              </div>

              {/* Signatures Box */}
              <div className="grid grid-cols-2 gap-12 pt-8 text-xs text-center border-t border-slate-300">
                <div className="space-y-1">
                  <div className="border-b border-slate-400 w-3/4 mx-auto pb-6" />
                  <p className="font-bold text-slate-800">Firma del Técnico Responsable</p>
                  <p className="text-[11px] text-slate-500">{order.technician || company.name}</p>
                </div>

                <div className="space-y-1">
                  <div className="border-b border-slate-400 w-3/4 mx-auto pb-6" />
                  <p className="font-bold text-slate-800">
                    {docType === 'recepcion' ? 'Firma Cliente (Autoriza Revisión)' : 'Firma Cliente (Recibe a Satisfacción)'}
                  </p>
                  <p className="text-[11px] text-slate-500">C.C. / NIT: {order.clientName}</p>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* FORMAT 2: TIRILLA TÉRMICA POS 80MM                       */}
          {/* ======================================================== */}
          {paperFormat === 'pos' && (
            <div className="w-[340px] bg-white text-slate-900 p-4 font-mono text-[11px] leading-tight rounded shadow-xl print:shadow-none print:rounded-none print:w-[80mm] space-y-2 border border-slate-200">
              
              {/* Header */}
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                <p className="font-black text-sm uppercase">{company.name}</p>
                <p className="text-[10px]">NIT: {company.nit}</p>
                <p className="text-[10px]">{company.address} {company.city ? `- ${company.city}` : ''}</p>
                <p className="text-[10px]">Tel: {company.phone || 'Soporte TI'}</p>
                <p className="font-bold text-xs uppercase pt-1">
                  {docType === 'recepcion' ? '*** INGRESO TALLER ***' : '*** ACTA DE ENTREGA ***'}
                </p>
                <p className="text-sm font-black text-slate-950 pt-0.5">{order.code}</p>
                <p className="text-[10px]">Fecha: {order.createdAt}</p>
              </div>

              {/* Client & Device */}
              <div className="space-y-1 border-b border-dashed border-slate-400 pb-2">
                <p><strong>CLIENTE:</strong> {order.clientName}</p>
                {order.clientPhone && <p><strong>TEL:</strong> {order.clientPhone}</p>}
                <p><strong>EQUIPO:</strong> {order.device}</p>
                {order.serial && <p><strong>S/N:</strong> {order.serial}</p>}
                {order.accessoriesReceived && (
                  <p><strong>ACCESORIOS:</strong> {order.accessoriesReceived}</p>
                )}
                {order.physicalCondition && (
                  <p><strong>ESTADO:</strong> {order.physicalCondition}</p>
                )}
              </div>

              {/* Issue & Solution */}
              <div className="space-y-1 border-b border-dashed border-slate-400 pb-2">
                <p><strong>FALLA REPORTADA:</strong></p>
                <p className="italic">{order.reportedIssue}</p>
                {docType === 'entrega' && order.solutionApplied && (
                  <>
                    <p className="pt-1"><strong>TRABAJO REALIZADO:</strong></p>
                    <p className="italic">{order.solutionApplied}</p>
                  </>
                )}
              </div>

              {/* Total & Warranty */}
              <div className="space-y-1 border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between font-bold text-xs">
                  <span>TOTAL {docType === 'recepcion' ? 'ESTIMADO' : 'LIQUIDADO'}:</span>
                  <span>{formatCOP(grandTotal)}</span>
                </div>
                {docType === 'entrega' && (
                  <p className="text-center font-bold text-[10px] pt-1">
                    GARANTÍA: {order.warrantyDays || 30} DÍAS
                  </p>
                )}
              </div>

              {/* Short legal note */}
              <div className="text-[9px] text-center leading-snug space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                <p>El cliente autoriza revisión técnica.</p>
                <p>Equipos no reclamados en 60 días se considerarán en abandono (Ley 1480 de 2011).</p>
                <p>Conserve este ticket para retirar su equipo.</p>
              </div>

              {/* Signature lines */}
              <div className="pt-4 text-center space-y-4">
                <div>
                  <div className="border-b border-slate-400 w-3/4 mx-auto" />
                  <p className="text-[10px] pt-1">Firma del Cliente</p>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

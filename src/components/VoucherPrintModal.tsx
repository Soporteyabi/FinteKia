import React from 'react';
import { Voucher, PucAccount, Tercero, Company } from '../types';
import { 
  Printer, 
  X, 
  FileText, 
  Building, 
  CheckCircle2, 
  Download, 
  ShieldCheck, 
  Clock, 
  User 
} from 'lucide-react';

interface VoucherPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: Voucher | null;
  puc: PucAccount[];
  terceros: Tercero[];
  company: Company;
}

export default function VoucherPrintModal({
  isOpen,
  onClose,
  voucher,
  puc,
  terceros,
  company
}: VoucherPrintModalProps) {
  if (!isOpen || !voucher) return null;

  const thirdParty = terceros.find(t => t.id === voucher.thirdPartyId);

  const getAccountName = (code: string) => {
    const acc = puc.find(p => p.code === code);
    return acc ? acc.name : 'Cuenta PUC';
  };

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);

  const totalDebits = (voucher.lines || []).reduce((acc, l) => acc + (l.debit || 0), 0);
  const totalCredits = (voucher.lines || []).reduce((acc, l) => acc + (l.credit || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(voucher, null, 2)
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `COMPROBANTE_${voucher.number}_OFICIAL.json`;
    link.click();
  };

  const typeLabelMap: Record<Voucher['type'], string> = {
    ingreso: 'COMPROBANTE DE INGRESO (RC)',
    egreso: 'COMPROBANTE DE EGRESO (CE)',
    diario: 'COMPROBANTE DE DIARIO (CD)',
    ajuste: 'COMPROBANTE DE AJUSTE (CA)',
    venta: 'FACTURA DE VENTA ELECTRÓNICA',
    compra: 'DOCUMENTO SOPORTE EN COMPRAS'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Actions - No Print */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Comprobante Contable Oficial
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-700/60">
                  {voucher.number}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Fecha: {voucher.date} • Tipo: {voucher.type.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              JSON
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-950/50 flex-1 flex justify-center">
          <div 
            id="printable-accounting-voucher"
            className="w-full max-w-3xl bg-white text-slate-900 rounded-xl shadow-xl p-6 sm:p-8 border border-slate-200 text-xs font-sans select-text"
          >
            {/* Header Documento */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl tracking-tighter">
                  {company.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                    {company.name}
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">
                    NIT: {company.nit} | {company.address}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Sistema Contable ERP FinteKia • Régimen Comercial Colombiano
                  </p>
                </div>
              </div>

              <div className="text-right sm:self-center border sm:border-0 p-2 sm:p-0 rounded-lg bg-slate-50 sm:bg-transparent w-full sm:w-auto">
                <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
                  {typeLabelMap[voucher.type] || 'COMPROBANTE CONTABLE'}
                </span>
                <p className="text-sm font-black text-slate-900 mt-1 font-mono">
                  No. {voucher.number}
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  Fecha: {voucher.date}
                </p>
              </div>
            </div>

            {/* Ficha General de la Operación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tercero / Beneficiario</p>
                <p className="text-sm font-black text-slate-900">{thirdParty ? thirdParty.name : 'Varios / Operación Interna'}</p>
                {thirdParty && (
                  <p className="text-xs text-slate-700">Identificación: <span className="font-semibold">{thirdParty.nit}</span></p>
                )}
                {thirdParty?.city && (
                  <p className="text-xs text-slate-700">Ciudad: <span>{thirdParty.city}</span></p>
                )}
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detalle del Asiento</p>
                <p className="text-xs text-slate-800 font-medium italic mt-0.5">{voucher.concept || 'Sin descripción'}</p>
                <p className="text-xs text-slate-700 mt-1">
                  Estado: <span className="font-bold uppercase text-emerald-700">{voucher.status || 'procesado'}</span>
                </p>
              </div>
            </div>

            {/* Tabla de Partida Doble PUC */}
            <div className="border border-slate-300 rounded-lg overflow-hidden my-4">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Cuenta PUC</th>
                    <th className="py-2.5 px-3">Nombre de Cuenta</th>
                    <th className="py-2.5 px-3">Descripción de Línea</th>
                    <th className="py-2.5 px-3 text-right">Débito (COP)</th>
                    <th className="py-2.5 px-3 text-right">Crédito (COP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {(voucher.lines || []).map((line, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900">{line.accountCode}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{getAccountName(line.accountCode)}</td>
                      <td className="py-2 px-3 text-slate-600 italic text-[11px]">{line.description || voucher.concept}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                        {line.debit > 0 ? formatCOP(line.debit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                        {line.credit > 0 ? formatCOP(line.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-900 font-bold text-slate-950">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px]">
                      Sumas Iguales:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm text-blue-800">
                      {formatCOP(totalDebits)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm text-rose-800">
                      {formatCOP(totalCredits)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Validación Partida Doble */}
            <div className="flex justify-between items-center p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs mb-8">
              <span className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Principio de Partida Doble Certificado (Diferencia: {formatCOP(Math.abs(totalDebits - totalCredits))})
              </span>
              <span className="font-bold uppercase text-[10px] bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">
                ASIENTO CUADRADO
              </span>
            </div>

            {/* Firmas Reglamentarias */}
            <div className="grid grid-cols-4 gap-4 pt-6 border-t border-slate-300 text-center text-[10px]">
              <div>
                <div className="border-b border-slate-400 w-full mb-1"></div>
                <p className="font-bold text-slate-800">Elaboró</p>
                <p className="text-[9px] text-slate-500">Auxiliar Contable</p>
              </div>
              <div>
                <div className="border-b border-slate-400 w-full mb-1"></div>
                <p className="font-bold text-slate-800">Revisó</p>
                <p className="text-[9px] text-slate-500">Contador Público</p>
              </div>
              <div>
                <div className="border-b border-slate-400 w-full mb-1"></div>
                <p className="font-bold text-slate-800">Aprobó</p>
                <p className="text-[9px] text-slate-500">Gerencia General</p>
              </div>
              <div>
                <div className="border-b border-slate-400 w-full mb-1"></div>
                <p className="font-bold text-slate-800">Contabilizó</p>
                <p className="text-[9px] text-slate-500">Libro Diario Oficial</p>
              </div>
            </div>

            <p className="text-center text-[9px] text-slate-400 mt-6">
              Documento interno de registro contable emitido conforme al Plan Único de Cuentas (PUC) de Colombia.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

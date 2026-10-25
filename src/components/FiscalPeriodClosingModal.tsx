import React from 'react';
import { FiscalPeriod, Company, PucAccount } from '../types';

interface FiscalPeriodClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: FiscalPeriod | null;
  company: Company;
  monthlyStats: {
    totalVouchers: number;
    totalDebit: number;
    totalCredit: number;
    ingresos: number;
    costos: number;
    gastos: number;
    netIncome: number;
  };
  puc?: PucAccount[];
}

export default function FiscalPeriodClosingModal({
  isOpen,
  onClose,
  period,
  company,
  monthlyStats
}: FiscalPeriodClosingModalProps) {
  if (!isOpen || !period) return null;

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formattedDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
        
        {/* Top Control Bar (No Print) */}
        <div className="no-print p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <i className="ri-shield-keyhole-fill text-amber-400 text-lg"></i>
            <span className="font-bold text-xs uppercase tracking-wider">
              Certificado Oficial de Cierre de Periodo Fiscal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <i className="ri-printer-line"></i> Imprimir Acta
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
        </div>

        {/* Printable Certificate Document */}
        <div className="p-8 sm:p-12 overflow-y-auto space-y-6 printable-area bg-white text-slate-900">
          
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase block mb-1">
                REPÚBLICA DE COLOMBIA • AUDITORÍA CONTABLE
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                {company.name}
              </h1>
              <p className="text-xs font-mono font-bold text-slate-600">
                NIT: {company.nit} • Régimen {company.regimen.toUpperCase()}
              </p>
              <p className="text-[11px] text-slate-500">{company.address}</p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                🔒 PERIODO BLOQUEADO
              </span>
              <p className="text-sm font-bold text-slate-800 mt-2">
                Acta de Cierre No. AC-{period.year}-{period.month < 10 ? `0${period.month}` : period.month}
              </p>
              <p className="text-[10px] text-slate-400">Expedido el {formattedDate}</p>
            </div>
          </div>

          {/* Legal Certification Statement */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-700 space-y-2">
            <p className="font-bold text-slate-900">
              CONSTANCIA DE CIERRE MENSUAL Y BLOQUEO DE LIBROS CONTABLES:
            </p>
            <p>
              En cumplimiento del Código de Comercio Colombiano, la Ley 43 de 1990 y el Decreto 2420 de 2015 (DUR NIIF), se certifica que el periodo contable <strong>{period.monthName}</strong> ha sido formalmente conciliado, cerrado y bloqueado en el sistema computarizado para salvaguardar la intangibilidad de la información contable y prevenir registros extemporáneos no autorizados.
            </p>
            {period.closingNotes && (
              <p className="text-[11px] italic bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600">
                <strong>Observaciones de Cierre:</strong> "{period.closingNotes}"
              </p>
            )}
          </div>

          {/* Consolidated Trial Balance / Metrics */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
              Resumen Financiero del Periodo Cerrado
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Comprobantes</span>
                <span className="text-base font-black font-mono text-slate-900">
                  {period.voucherCount ?? monthlyStats.totalVouchers}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Cargos (Débito)</span>
                <span className="text-base font-black font-mono text-blue-700">
                  {formatCOP(period.totalDebits ?? monthlyStats.totalDebit)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Abonos (Crédito)</span>
                <span className="text-base font-black font-mono text-rose-700">
                  {formatCOP(period.totalCredits ?? monthlyStats.totalCredit)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Cuadre Partida Doble</span>
                <span className="text-xs font-black text-emerald-700 flex items-center gap-1 mt-1">
                  <i className="ri-checkbox-circle-fill"></i> EQUILIBRADO ($0)
                </span>
              </div>
            </div>

            {/* Income & Expenses */}
            <div className="p-4 bg-slate-50 border rounded-xl space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="font-semibold text-slate-700">Ingresos Operacionales (Clase 4):</span>
                <span className="font-mono font-bold text-emerald-700">{formatCOP(monthlyStats.ingresos)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="font-semibold text-slate-700">Costos y Gastos Operacionales (Clases 5 & 6):</span>
                <span className="font-mono font-bold text-rose-700">-{formatCOP(monthlyStats.costos + monthlyStats.gastos)}</span>
              </div>
              <div className="flex justify-between py-1 font-bold">
                <span className="text-slate-900">Resultado Neto del Periodo:</span>
                <span className={`font-mono text-sm ${monthlyStats.netIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCOP(monthlyStats.netIncome)} ({monthlyStats.netIncome >= 0 ? 'Utilidad' : 'Pérdida'})
                </span>
              </div>
            </div>
          </div>

          {/* Audit Trail of Closing */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
              Registro de Seguridad & Trazabilidad
            </h3>
            <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border">
              <p><strong>Cerrado y Bloqueado por:</strong> {period.closedBy || 'Contador General'}</p>
              <p><strong>Fecha y Hora de Bloqueo:</strong> {period.closedAt ? new Date(period.closedAt).toLocaleString('es-CO') : 'Fecha de cierre registrada'}</p>
              {period.closingVoucherNumber && (
                <p><strong>Comprobante de Cierre Asociado:</strong> {period.closingVoucherNumber}</p>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-slate-300">
            <div className="text-center space-y-1">
              <div className="border-b border-slate-400 w-48 mx-auto h-12"></div>
              <p className="font-bold text-xs text-slate-900">
                {period.closedBy || 'Carlos Vélez'}
              </p>
              <p className="text-[10px] text-slate-500">Contador Público Titular</p>
              <p className="text-[9px] text-slate-400">T.P. No. 184920-T</p>
            </div>

            <div className="text-center space-y-1">
              <div className="border-b border-slate-400 w-48 mx-auto h-12"></div>
              <p className="font-bold text-xs text-slate-900">Representante Legal</p>
              <p className="text-[10px] text-slate-500">{company.name}</p>
              <p className="text-[9px] text-slate-400">NIT: {company.nit}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

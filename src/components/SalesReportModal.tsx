import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Printer, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  PieChart, 
  Users, 
  Building2, 
  Layers,
  ArrowUpRight,
  FileSpreadsheet
} from 'lucide-react';
import { Voucher, Tercero, Product, Company } from '../types';
import { 
  generateSalesAndMarginPdfReport, 
  computeSalesReportData, 
  formatCOPNumber 
} from '../utils/salesPdfReport';
import { exportDashboardSalesToExcel } from '../utils/excelExport';

interface SalesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: Voucher[];
  terceros: Tercero[];
  products: Product[];
  company?: Company;
  currentUser?: { name: string; role: string; email?: string };
}

export default function SalesReportModal({
  isOpen,
  onClose,
  vouchers,
  terceros,
  products,
  company,
  currentUser,
}: SalesReportModalProps) {
  const [period, setPeriod] = useState<'all' | 'current_month' | 'last_30_days' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'aprobados'>('all');

  const [includeCategories, setIncludeCategories] = useState<boolean>(true);
  const [includeTopClients, setIncludeTopClients] = useState<boolean>(true);
  const [includeVouchers, setIncludeVouchers] = useState<boolean>(true);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Compute actual date bounds based on period
  const effectiveDates = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (period === 'all') {
      return { start: undefined, end: undefined, label: 'Año Fiscal Completo 2026' };
    }
    if (period === 'current_month') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      return {
        start: `${year}-${month}-01`,
        end: todayStr,
        label: `Mes Actual (${today.toLocaleString('es-CO', { month: 'long', year: 'numeric' })})`,
      };
    }
    if (period === 'last_30_days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      return {
        start: past.toISOString().split('T')[0],
        end: todayStr,
        label: 'Últimos 30 Días',
      };
    }
    return {
      start: startDate,
      end: endDate,
      label: `Personalizado (${startDate} al ${endDate})`,
    };
  }, [period, startDate, endDate]);

  // Real-time Preview computation
  const previewData = useMemo(() => {
    return computeSalesReportData({
      vouchers,
      terceros,
      products,
      startDate: effectiveDates.start,
      endDate: effectiveDates.end,
      filterStatus,
    });
  }, [vouchers, terceros, products, effectiveDates, filterStatus]);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    setDownloadSuccess(false);

    setTimeout(() => {
      try {
        const report = generateSalesAndMarginPdfReport({
          vouchers,
          terceros,
          products,
          company,
          currentUser,
          periodLabel: effectiveDates.label,
          startDate: effectiveDates.start,
          endDate: effectiveDates.end,
          filterStatus,
          includeCategoriesTable: includeCategories,
          includeTopClientsTable: includeTopClients,
          includeVouchersTable: includeVouchers,
        });

        report.download();
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      } catch (err) {
        console.error('Error al generar el reporte en PDF:', err);
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  };

  const handlePreviewPdf = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const report = generateSalesAndMarginPdfReport({
          vouchers,
          terceros,
          products,
          company,
          currentUser,
          periodLabel: effectiveDates.label,
          startDate: effectiveDates.start,
          endDate: effectiveDates.end,
          filterStatus,
          includeCategoriesTable: includeCategories,
          includeTopClientsTable: includeTopClients,
          includeVouchersTable: includeVouchers,
        });

        report.openPreview();
      } catch (err) {
        console.error('Error al previsualizar el PDF:', err);
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  };

  const handleDownloadExcel = () => {
    try {
      exportDashboardSalesToExcel(previewData.filteredVouchers, terceros, products, company, effectiveDates.label);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Error al exportar a Excel:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(14, 165, 233, 0.15)'
        }}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Generador de Reportes PDF · Ventas & Márgenes
              </h2>
              <p className="text-xs text-slate-400">
                {company?.name || 'FinteKia Solutions S.A.S.'} · Motor de reportes contables en el cliente (jsPDF)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Quick Metrics Bar: Real-time calculation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Ventas Facturadas</span>
              <span className="text-base font-bold text-white tracking-tight">
                {formatCOPNumber(previewData.totalSales)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {previewData.totalVouchersCount} comprobantes
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Costos Estimados</span>
              <span className="text-base font-bold text-slate-300 tracking-tight">
                {formatCOPNumber(previewData.totalCosts)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Costo mercancía & servicios
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-emerald-400 block">Utilidad Operativa</span>
              <span className="text-base font-bold text-emerald-400 tracking-tight">
                {formatCOPNumber(previewData.grossProfit)}
              </span>
              <span className="text-[10px] text-emerald-500/80 block mt-0.5">
                Ganancia neta antes de imp.
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-sky-400 block">Margen Operativo</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-lg font-extrabold text-sky-300">
                  {previewData.operatingMarginPercent.toFixed(1)}%
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center font-medium">
                  <ArrowUpRight className="w-3 h-3" />
                  Saludable
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Ticket prom: {formatCOPNumber(previewData.averageTicket)}
              </span>
            </div>
          </div>

          {/* Configuration Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Left: Period & Status Filter */}
            <div className="space-y-4 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                <span>1. Período y Filtro de Datos</span>
              </div>

              {/* Segmented Period Selector */}
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-2">
                  Rango de Fechas para el Reporte:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPeriod('all')}
                    className={`py-2 px-3 rounded-lg font-medium text-left border transition-all cursor-pointer ${
                      period === 'all'
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 shadow-sm'
                        : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    Todo el Período 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('current_month')}
                    className={`py-2 px-3 rounded-lg font-medium text-left border transition-all cursor-pointer ${
                      period === 'current_month'
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 shadow-sm'
                        : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    Mes Actual (Octubre)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('last_30_days')}
                    className={`py-2 px-3 rounded-lg font-medium text-left border transition-all cursor-pointer ${
                      period === 'last_30_days'
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 shadow-sm'
                        : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    Últimos 30 Días
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('custom')}
                    className={`py-2 px-3 rounded-lg font-medium text-left border transition-all cursor-pointer ${
                      period === 'custom'
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 shadow-sm'
                        : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    Personalizado...
                  </button>
                </div>

                {period === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-700/60">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Fecha Inicial</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Fecha Final</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status filter */}
              <div className="pt-2">
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Estado de Facturas & Comprobantes:
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="filterStatus"
                      checked={filterStatus === 'all'}
                      onChange={() => setFilterStatus('all')}
                      className="accent-sky-500"
                    />
                    <span>Todos (Borrador + Aprobados)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 ml-3">
                    <input
                      type="radio"
                      name="filterStatus"
                      checked={filterStatus === 'aprobados'}
                      onChange={() => setFilterStatus('aprobados')}
                      className="accent-sky-500"
                    />
                    <span>Solo Aprobados / Procesados</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Sections to Include */}
            <div className="space-y-4 p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider mb-3">
                  <Layers className="w-3.5 h-3.5" />
                  <span>2. Secciones del Documento PDF</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="accent-sky-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-white block">Encabezado Oficial & KPIs Ejecutivos</span>
                      <span className="text-[11px] text-slate-400">Datos de la empresa, NIT, ventas totales, costos y margen %</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCategories}
                      onChange={(e) => setIncludeCategories(e.target.checked)}
                      className="accent-sky-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-white block">Márgenes por Línea de Negocio</span>
                      <span className="text-[11px] text-slate-400">Tecnología, servicios TI, licencias y productos</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTopClients}
                      onChange={(e) => setIncludeTopClients(e.target.checked)}
                      className="accent-sky-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-white block">Top 5 Clientes en Ventas y Rentabilidad</span>
                      <span className="text-[11px] text-slate-400">Clientes con mayor volumen e impacto en margen</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeVouchers}
                      onChange={(e) => setIncludeVouchers(e.target.checked)}
                      className="accent-sky-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-white block">Detalle de Comprobantes de Venta</span>
                      <span className="text-[11px] text-slate-400">Listado con fecha, tercero, concepto y margen por factura</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Legal & Standards Notice */}
              <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-800">
                Formatos estandarizados en tamaño Carta / A4 listos para auditorías financieras, gerencia y reportes tributarios.
              </div>
            </div>

          </div>

          {/* Quick Preview Table of Transactions */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <PieChart className="w-3.5 h-3.5 text-sky-400" />
                <span>Vista Previa de Comprobantes a Exportar ({previewData.voucherRows.length})</span>
              </span>
              <span className="text-xs text-slate-400">
                Período: <strong className="text-slate-200">{effectiveDates.label}</strong>
              </span>
            </div>

            <div className="overflow-x-auto max-h-48 border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase font-semibold text-[10px] sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Comprobante</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Cliente / Tercero</th>
                    <th className="px-3 py-2 text-right">Venta</th>
                    <th className="px-3 py-2 text-right">Costo Est.</th>
                    <th className="px-3 py-2 text-right">Utilidad</th>
                    <th className="px-3 py-2 text-right">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {previewData.voucherRows.slice(0, 8).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="px-3 py-1.5 font-mono font-medium text-sky-400">{row.number}</td>
                      <td className="px-3 py-1.5 text-slate-400">{row.date}</td>
                      <td className="px-3 py-1.5 text-slate-200 truncate max-w-[150px]">{row.clientName}</td>
                      <td className="px-3 py-1.5 text-right font-medium">{formatCOPNumber(row.sale)}</td>
                      <td className="px-3 py-1.5 text-right text-slate-400">{formatCOPNumber(row.cost)}</td>
                      <td className="px-3 py-1.5 text-right text-emerald-400 font-medium">{formatCOPNumber(row.profit)}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-sky-400">{row.marginPercent.toFixed(0)}%</td>
                    </tr>
                  ))}
                  {previewData.voucherRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-500">
                        No se encontraron comprobantes de venta en el rango seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {previewData.voucherRows.length > 8 && (
              <p className="text-[11px] text-slate-500 text-right">
                * Mostrando 8 de {previewData.voucherRows.length} comprobantes en la vista previa. El PDF incluirá el detalle completo.
              </p>
            )}
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {downloadSuccess && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Reporte descargado con éxito!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handlePreviewPdf}
              disabled={isGenerating || previewData.totalVouchersCount === 0}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              title="Abrir vista previa del PDF en nueva pestaña"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Ver / Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isGenerating || previewData.totalVouchersCount === 0}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-550 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              title="Exportar datos analíticos de ventas y márgenes a Excel (.xlsx)"
              id="export-sales-report-excel-modal-btn"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating || previewData.totalVouchersCount === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Generando PDF...' : 'Descargar Reporte PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

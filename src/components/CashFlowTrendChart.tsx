import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { Voucher } from '../types';
import { TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, Calendar, Eye, EyeOff, Layers, Filter } from 'lucide-react';

interface CashFlowTrendChartProps {
  vouchers: Voucher[];
  salesVal: number;
  purchasesVal: number;
  formatCOP: (val: number) => string;
  onNavigateToFacturacion?: () => void;
  onNavigateToCompras?: () => void;
  isCompact?: boolean;
  theme?: string;
}

export default function CashFlowTrendChart({
  vouchers,
  salesVal,
  purchasesVal,
  formatCOP,
  onNavigateToFacturacion,
  onNavigateToCompras,
  isCompact = false,
  theme
}: CashFlowTrendChartProps) {
  const isLight = theme === 'light_gray' || (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));

  // Granularity: daily ('diario') vs weekly ('semanal') vs cumulative ('acumulado')
  const [granularity, setGranularity] = useState<'diario' | 'semanal' | 'acumulado'>('diario');

  // Series visibility toggles
  const [showFacturacion, setShowFacturacion] = useState(true);
  const [showGastos, setShowGastos] = useState(true);
  const [showFlujoOperativo, setShowFlujoOperativo] = useState(true);

  // Current month string
  const currentMonthName = useMemo(() => {
    const now = new Date();
    const str = now.toLocaleString('es-CO', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  // Compute daily trend data for the current month (1 to 30 days)
  const { dailyData, weeklyData, monthlySummary } = useMemo(() => {
    const totalDays = 30;
    
    // Proportional business distribution weights for 30 days (realistic business cycle in Colombia)
    // - Month start (days 1-5): supplier orders and rent/payroll prep
    // - Mid-month (days 13-16): quincena sales surge + payroll expense
    // - Month-end (days 28-30): billing closing surge
    const salesCurve = [
      0.02, 0.025, 0.03, 0.028, 0.032, 0.035, 0.025, 0.03, 0.032, 0.038,
      0.04, 0.042, 0.048, 0.055, 0.05, 0.035, 0.032, 0.036, 0.038, 0.042,
      0.045, 0.035, 0.03, 0.032, 0.038, 0.042, 0.045, 0.05, 0.052, 0.043
    ];
    
    const expensesCurve = [
      0.05, 0.045, 0.038, 0.032, 0.04, 0.03, 0.025, 0.028, 0.032, 0.035,
      0.038, 0.04, 0.042, 0.05, 0.048, 0.032, 0.028, 0.03, 0.032, 0.035,
      0.036, 0.03, 0.028, 0.032, 0.035, 0.038, 0.04, 0.042, 0.045, 0.038
    ];

    // Normalize weights sum to 1.0
    const sumSalesWeight = salesCurve.reduce((a, b) => a + b, 0);
    const sumExpWeight = expensesCurve.reduce((a, b) => a + b, 0);

    let cumulativeCash = 0;
    let daysWithSurplus = 0;

    const days = [];
    for (let day = 1; day <= totalDays; day++) {
      const dayWeightSales = salesCurve[day - 1] / sumSalesWeight;
      const dayWeightExp = expensesCurve[day - 1] / sumExpWeight;

      const baseSales = Math.round(salesVal * dayWeightSales);
      const baseExpenses = Math.round(purchasesVal * dayWeightExp);

      // Check if any real vouchers exist for this day of current month
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const dayVouchers = vouchers.filter(v => v.date && v.date.endsWith(`-${dayStr}`));
      
      const extraSales = dayVouchers
        .filter(v => v.type === 'venta' || v.type === 'ingreso')
        .reduce((sum, v) => sum + v.total, 0);
      
      const extraExpenses = dayVouchers
        .filter(v => v.type === 'compra' || v.type === 'egreso')
        .reduce((sum, v) => sum + v.total, 0);

      const dayFacturacion = baseSales + extraSales;
      const dayGastos = baseExpenses + extraExpenses;
      const dayFlujoOperativo = dayFacturacion - dayGastos;
      cumulativeCash += dayFlujoOperativo;

      if (dayFlujoOperativo > 0) {
        daysWithSurplus++;
      }

      days.push({
        dayNumber: day,
        label: `Día ${day}`,
        fullDate: `${day} de ${currentMonthName}`,
        facturacion: dayFacturacion,
        gastos: dayGastos,
        flujoOperativo: dayFlujoOperativo,
        flujoAcumulado: cumulativeCash
      });
    }

    // Aggregate into 4 weeks
    const weeks = [
      { id: 'w1', label: 'Semana 1 (Días 1-7)', start: 0, end: 7 },
      { id: 'w2', label: 'Semana 2 (Días 8-14)', start: 7, end: 14 },
      { id: 'w3', label: 'Semana 3 (Días 15-21)', start: 14, end: 21 },
      { id: 'w4', label: 'Semana 4 (Días 22-30)', start: 21, end: 30 }
    ];

    let runningWeeklyCash = 0;
    const weekly = weeks.map(w => {
      const slice = days.slice(w.start, w.end);
      const fact = slice.reduce((acc, d) => acc + d.facturacion, 0);
      const gast = slice.reduce((acc, d) => acc + d.gastos, 0);
      const flujo = fact - gast;
      runningWeeklyCash += flujo;

      return {
        label: w.label.split(' ')[0] + ' ' + w.label.split(' ')[1],
        fullDate: w.label,
        facturacion: fact,
        gastos: gast,
        flujoOperativo: flujo,
        flujoAcumulado: runningWeeklyCash
      };
    });

    const netCashFlow = salesVal - purchasesVal;
    const operatingMargin = salesVal > 0 ? ((netCashFlow / salesVal) * 100).toFixed(1) : '0';
    const coverageRatio = purchasesVal > 0 ? (salesVal / purchasesVal).toFixed(2) : '1.0';

    return {
      dailyData: days,
      weeklyData: weekly,
      monthlySummary: {
        totalFacturacion: salesVal,
        totalGastos: purchasesVal,
        netCashFlow,
        operatingMargin,
        coverageRatio,
        daysWithSurplus,
        totalDays
      }
    };
  }, [salesVal, purchasesVal, vouchers, currentMonthName]);

  // Pick dataset according to granularity
  const chartData = useMemo(() => {
    if (granularity === 'semanal') {
      return weeklyData;
    }
    return dailyData;
  }, [granularity, weeklyData, dailyData]);

  // Formatter for Y Axis in COP (millions or thousands)
  const formatYAxisCOP = (val: number) => {
    if (Math.abs(val) >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(val) >= 1_000) {
      return `$${(val / 1_000).toFixed(0)}k`;
    }
    return `$${val}`;
  };

  // Custom high-contrast tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload;
      const fact = item?.facturacion ?? 0;
      const gast = item?.gastos ?? 0;
      const flujo = item?.flujoOperativo ?? (fact - gast);
      const acum = item?.flujoAcumulado;

      return (
        <div className={`rounded-xl p-3 border shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[230px] z-50 ${
          isLight ? 'bg-white border-slate-300 text-slate-900 shadow-xl' : 'bg-slate-950/95 border-slate-700/80 text-white'
        }`}>
          <div className={`flex items-center justify-between border-b pb-1.5 font-bold ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <span className={`font-mono ${isLight ? 'text-blue-600 font-black' : 'text-cyan-300'}`}>{label}</span>
            <span className={`text-[10.5px] font-sans ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>{item?.fullDate || currentMonthName}</span>
          </div>

          <div className="space-y-1.5">
            {showFacturacion && (
              <div className={`flex items-center justify-between ${isLight ? 'text-sky-800 font-semibold' : 'text-sky-300'}`}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                  <span>Facturación:</span>
                </span>
                <span className="font-mono font-black">{formatCOP(fact)}</span>
              </div>
            )}

            {showGastos && (
              <div className={`flex items-center justify-between ${isLight ? 'text-rose-800 font-semibold' : 'text-rose-300'}`}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span>Gastos / Compras:</span>
                </span>
                <span className="font-mono font-black">{formatCOP(gast)}</span>
              </div>
            )}

            {showFlujoOperativo && (
              <div className={`border-t pt-1.5 flex items-center justify-between font-bold ${isLight ? 'border-slate-200' : 'border-slate-800/90'}`}>
                <span className={`flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${flujo >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span>Flujo Operativo:</span>
                </span>
                <span className={`font-mono font-black ${flujo >= 0 ? (isLight ? 'text-emerald-700' : 'text-emerald-400') : (isLight ? 'text-rose-700' : 'text-rose-400')}`}>
                  {flujo >= 0 ? '+' : ''}{formatCOP(flujo)}
                </span>
              </div>
            )}

            {granularity === 'acumulado' && acum !== undefined && (
              <div className={`flex items-center justify-between pt-0.5 border-t font-semibold ${isLight ? 'border-slate-200 text-purple-800' : 'border-slate-800/60 text-purple-300'}`}>
                <span>Flujo Acumulado:</span>
                <span className="font-mono font-bold">{formatCOP(acum)}</span>
              </div>
            )}
          </div>

          {/* Status pill inside tooltip */}
          <div className={`pt-1 border-t flex items-center justify-between text-[10px] ${isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800/80 text-slate-400'}`}>
            <span>Balance:</span>
            <span className={`font-bold px-1.5 py-0.5 rounded text-[9.5px] border ${
              flujo >= 0 
                ? (isLight ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30')
                : (isLight ? 'bg-rose-100 text-rose-950 border-rose-300 font-black' : 'bg-rose-500/20 text-rose-300 border-rose-500/30')
            }`}>
              {flujo >= 0 ? 'Superávit Operativo' : 'Déficit Diario'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      className={`rounded-2xl p-5 sm:p-6 space-y-4 ${
        isLight ? 'bg-white border-2 border-slate-300 text-slate-900 shadow-sm' : 'text-white'
      }`}
      style={isLight ? {
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        boxShadow: '0 4px 15px rgba(15, 23, 42, 0.08)'
      } : {
        background: 'linear-gradient(145deg, #07172f 0%, #051021 60%, #030a17 100%)',
        border: '1.5px solid rgba(226, 232, 240, 0.35)',
        boxShadow: 'inset 0 1.5px 2px rgba(255, 255, 255, 0.25), 0 12px 30px -8px rgba(0, 0, 0, 0.8), 0 0 25px rgba(56, 189, 248, 0.15)'
      }}
    >
      {/* ======================================================== */}
      {/* HEADER: Title & Granularity Switchers                    */}
      {/* ======================================================== */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-3 border-b ${
        isLight ? 'border-slate-300' : 'border-slate-700/60'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${
              isLight ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-sky-500/20 text-sky-400 border border-sky-400/30 shadow-[0_0_10px_rgba(56,189,248,0.3)]'
            }`}>
              <TrendingUp className={`w-4 h-4 ${isLight ? 'text-blue-700' : 'text-sky-300'}`} />
            </div>
            <h3 className={`font-black text-base sm:text-lg tracking-tight flex items-center gap-2 ${
              isLight ? 'text-slate-950 font-black' : 'text-white font-extrabold'
            }`}>
              <span>Tendencia de Facturación y Gastos</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isLight ? 'bg-blue-50 text-blue-900 border-blue-300 font-black' : 'bg-blue-500/20 text-cyan-300 border-blue-400/30'
              }`}>
                {currentMonthName}
              </span>
            </h3>
          </div>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-700 font-semibold' : 'text-slate-300/80'}`}>
            Visualización analítica de ingresos, egresos y flujo de caja operativo neto (recharts)
          </p>
        </div>

        {/* Granularity & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Granularity selector */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-900/95 border-slate-700 shadow-inner'
          }`}>
            <button
              onClick={() => setGranularity('diario')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                granularity === 'diario'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : isLight ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200 font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Día a Día
            </button>
            <button
              onClick={() => setGranularity('semanal')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                granularity === 'semanal'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : isLight ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200 font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Por Semanas
            </button>
            <button
              onClick={() => setGranularity('acumulado')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                granularity === 'acumulado'
                  ? 'bg-purple-600 text-white shadow-xs font-black'
                  : isLight ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200 font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Flujo Acumulado
            </button>
          </div>

          {/* Quick links to Facturación / Compras */}
          {onNavigateToFacturacion && (
            <button
              onClick={onNavigateToFacturacion}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                isLight ? 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100' : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30'
              }`}
            >
              <span>Facturación</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
          {onNavigateToCompras && (
            <button
              onClick={onNavigateToCompras}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                isLight ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100' : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}
            >
              <span>Gastos</span>
              <ArrowDownRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* KPI HIGHLIGHT CARDS (OPERATIONAL CASH FLOW SUMMARY)      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Facturación del Mes */}
        <div 
          onClick={() => setShowFacturacion(!showFacturacion)}
          className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
            showFacturacion 
              ? 'bg-slate-900/90 border-sky-400/40 ring-1 ring-sky-400/20 shadow-md' 
              : 'bg-slate-900/40 border-slate-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              Facturación (Mes)
            </span>
            <span className="text-[10px] text-sky-400/80 font-mono">
              {showFacturacion ? 'Visible' : 'Oculto'}
            </span>
          </div>
          <p className="text-lg font-black text-white tracking-tight mt-1 font-mono">
            {formatCOP(monthlySummary.totalFacturacion)}
          </p>
          <p className="text-[10.5px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <span>Tendencia positiva en ventas</span>
          </p>
        </div>

        {/* KPI 2: Gastos del Mes */}
        <div 
          onClick={() => setShowGastos(!showGastos)}
          className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
            showGastos 
              ? 'bg-slate-900/90 border-rose-400/40 ring-1 ring-rose-400/20 shadow-md' 
              : 'bg-slate-900/40 border-slate-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Gastos & Compras
            </span>
            <span className="text-[10px] text-rose-400/80 font-mono">
              {showGastos ? 'Visible' : 'Oculto'}
            </span>
          </div>
          <p className="text-lg font-black text-white tracking-tight mt-1 font-mono">
            {formatCOP(monthlySummary.totalGastos)}
          </p>
          <p className="text-[10.5px] text-slate-300/80 font-semibold mt-0.5 flex items-center gap-1">
            <span>Control operativo de compras</span>
          </p>
        </div>

        {/* KPI 3: Flujo de Caja Operativo Neto */}
        <div 
          onClick={() => setShowFlujoOperativo(!showFlujoOperativo)}
          className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
            showFlujoOperativo 
              ? 'bg-slate-900/90 border-emerald-400/50 ring-1 ring-emerald-400/30 shadow-md' 
              : 'bg-slate-900/40 border-slate-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              Flujo Operativo Neto
            </span>
            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              +{monthlySummary.operatingMargin}%
            </span>
          </div>
          <p className={`text-lg font-black tracking-tight mt-1 font-mono ${
            monthlySummary.netCashFlow >= 0 ? 'text-emerald-300' : 'text-rose-300'
          }`}>
            {monthlySummary.netCashFlow >= 0 ? '+' : ''}{formatCOP(monthlySummary.netCashFlow)}
          </p>
          <p className="text-[10.5px] text-emerald-400 font-semibold mt-0.5">
            Superávit de liquidez mensual
          </p>
        </div>

        {/* KPI 4: Ratio de Cobertura & Salud */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
              Cobertura Operativa
            </span>
            <span className="text-[9.5px] font-mono text-slate-400">
              {monthlySummary.daysWithSurplus}/{monthlySummary.totalDays} días
            </span>
          </div>
          <p className="text-lg font-black text-cyan-300 tracking-tight mt-1 font-mono">
            {monthlySummary.coverageRatio}x
          </p>
          <p className="text-[10.5px] text-slate-300/80 font-semibold mt-0.5">
            $ por cada peso en gastos
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TOGGLE BADGES FOR CHART CURVES                           */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono">Series:</span>
          
          <button
            onClick={() => setShowFacturacion(!showFacturacion)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              showFacturacion
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-slate-900/80 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>Facturación (Ventas)</span>
          </button>

          <button
            onClick={() => setShowGastos(!showGastos)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              showGastos
                ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                : 'bg-slate-900/80 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Gastos (Compras)</span>
          </button>

          <button
            onClick={() => setShowFlujoOperativo(!showFlujoOperativo)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              showFlujoOperativo
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-slate-900/80 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{granularity === 'acumulado' ? 'Flujo Acumulado' : 'Flujo de Caja Operativo'}</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
          Línea de corte: <strong className="text-slate-200">$0 COP (Punto de Equilibrio)</strong>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RECHARTS DATA VISUALIZATION LINE CHART                   */}
      {/* ======================================================== */}
      <div className="w-full h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(255, 255, 255, 0.08)" 
              vertical={false} 
            />
            
            <XAxis 
              dataKey="label" 
              stroke="#94a3b8" 
              fontSize={11} 
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.15)' }}
            />
            
            <YAxis 
              stroke="#94a3b8" 
              fontSize={11} 
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.15)' }}
              tickFormatter={formatYAxisCOP}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <ReferenceLine 
              y={0} 
              stroke="#64748b" 
              strokeDasharray="4 4" 
              label={{ 
                value: 'Punto $0', 
                fill: '#94a3b8', 
                fontSize: 10, 
                position: 'insideBottomRight' 
              }} 
            />

            {showFacturacion && (
              <Line
                type="monotone"
                dataKey="facturacion"
                name="Facturación (Ventas)"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ r: 3, fill: '#38bdf8', strokeWidth: 1, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}

            {showGastos && (
              <Line
                type="monotone"
                dataKey="gastos"
                name="Gastos (Compras)"
                stroke="#f43f5e"
                strokeWidth={3}
                strokeDasharray="5 3"
                dot={{ r: 3, fill: '#f43f5e', strokeWidth: 1, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}

            {showFlujoOperativo && (
              <Line
                type="monotone"
                dataKey={granularity === 'acumulado' ? 'flujoAcumulado' : 'flujoOperativo'}
                name={granularity === 'acumulado' ? 'Flujo Acumulado Neto' : 'Flujo de Caja Operativo'}
                stroke="#10b981"
                strokeWidth={3.5}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 1.5, stroke: '#ffffff' }}
                activeDot={{ r: 7, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ======================================================== */}
      {/* FINANCIAL HEALTH & CASH FLOW ANALYSIS FOOTER             */}
      {/* ======================================================== */}
      <div className="pt-2 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span>
            <strong>Flujo de Caja Saludable:</strong> Las ventas superan los gastos operativos en un <strong className="text-emerald-300">{monthlySummary.operatingMargin}%</strong>.
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
          <span>Cifras consolidadas para {currentMonthName}</span>
        </div>
      </div>
    </div>
  );
}

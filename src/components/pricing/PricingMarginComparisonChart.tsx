import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import { PricingScenario } from './PricingCalculator';
import { formatCOP } from '../../utils/currencyUtils';
import { formatPercentage } from '../../utils/pricingEngine';
import { 
  Scale, 
  TrendingUp, 
  BarChart3, 
  DollarSign, 
  ShieldCheck, 
  AlertTriangle,
  Award,
  Layers,
  Info,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export interface PricingMarginComparisonChartProps {
  scenarios: PricingScenario[];
  costo_unitario_produccion?: number;
  unidades_lote?: number;
  activeScenarioId?: string;
  onSelectScenario?: (scen: PricingScenario) => void;
}

export const PricingMarginComparisonChart: React.FC<PricingMarginComparisonChartProps> = ({
  scenarios,
  costo_unitario_produccion,
  unidades_lote,
  activeScenarioId,
  onSelectScenario
}) => {
  const [chartView, setChartView] = useState<'margins_and_prices' | 'batch_profit' | 'break_even_gap'>('margins_and_prices');

  // Cálculo automático del Punto de Equilibrio basado en costo_unitario_produccion
  const breakEvenUnitCost = useMemo(() => {
    if (costo_unitario_produccion !== undefined && !isNaN(costo_unitario_produccion) && costo_unitario_produccion > 0) {
      return Number(costo_unitario_produccion);
    }
    if (scenarios.length > 0 && scenarios[0]?.costoUnitario > 0) {
      return scenarios[0].costoUnitario;
    }
    return 4397.0; // Valor base calibrado de taller
  }, [costo_unitario_produccion, scenarios]);

  // Cálculo automático del Punto de Equilibrio del lote completo (costo total de manufactura)
  const breakEvenBatchCost = useMemo(() => {
    const units = (unidades_lote !== undefined && !isNaN(unidades_lote) && unidades_lote > 0)
      ? Number(unidades_lote)
      : (scenarios[0]?.unidadesLote || 15);
    return breakEvenUnitCost * units;
  }, [breakEvenUnitCost, unidades_lote, scenarios]);

  // Preparar dataset para los gráficos de Recharts
  const chartData = useMemo(() => {
    return scenarios.map((s, idx) => {
      const costoUnit = s.costoUnitario;
      const precioComercial = s.precioComercial;
      const utilidadUnitaria = s.output.utilidad_neta_unitaria;
      const margenRealPct = s.output.indicadores.margen_utilidad_real_porcentaje;
      const margenEsperadoPct = s.output.margen_esperado_porcentaje * 100;
      const precioSugerido = s.output.precio_venta_sugerido;
      const costoTotalLote = s.output.costo_total_lote;
      const utilidadNetaLote = s.output.utilidad_neta_lote;
      const ingresosTotales = s.output.utilidad_bruta_lote;

      // Brecha sobre el punto de equilibrio calculado
      const brechaEquilibrioUnitario = precioComercial - breakEvenUnitCost;
      const porcentajeSeguridadEquilibrio = breakEvenUnitCost > 0 
        ? Number(((brechaEquilibrioUnitario / breakEvenUnitCost) * 100).toFixed(2))
        : 0;

      // Nombre amigable para el eje X
      const shortName = s.name.length > 20 ? `${s.name.slice(0, 18)}...` : s.name;

      return {
        id: s.id,
        rawScenario: s,
        name: shortName,
        fullName: s.name,
        index: idx + 1,
        costoUnitario: costoUnit,
        precioComercial: precioComercial,
        precioSugerido: precioSugerido,
        utilidadUnitaria: utilidadUnitaria,
        margenRealPct: margenRealPct,
        margenEsperadoPct: margenEsperadoPct,
        costoTotalLote: costoTotalLote,
        utilidadNetaLote: utilidadNetaLote,
        ingresosTotales: ingresosTotales,
        brechaEquilibrioUnitario: brechaEquilibrioUnitario,
        porcentajeSeguridadEquilibrio: porcentajeSeguridadEquilibrio,
        unidadesLote: s.unidadesLote,
        puntoEquilibrioReferencia: breakEvenUnitCost
      };
    });
  }, [scenarios, breakEvenUnitCost]);

  // Estadísticas del punto de equilibrio y ranking
  const breakEvenStats = useMemo(() => {
    if (scenarios.length === 0) return null;

    const sortedByProfit = [...scenarios].sort((a, b) => b.output.utilidad_neta_lote - a.output.utilidad_neta_lote);
    const sortedByMargin = [...scenarios].sort((a, b) => 
      b.output.indicadores.margen_utilidad_real_porcentaje - a.output.indicadores.margen_utilidad_real_porcentaje
    );

    const optimalScenario = sortedByProfit[0] || scenarios[0];
    const topMarginScenario = sortedByMargin[0] || scenarios[0];

    return {
      optimalScenario,
      topMarginScenario
    };
  }, [scenarios]);

  if (scenarios.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
        <Scale className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          No hay escenarios suficientes para generar la comparativa gráfica con la línea de punto de equilibrio.
        </p>
        <p className="text-xs text-slate-400">
          Guarda o restablece escenarios de prueba en la calculadora para visualizar la gráfica Recharts.
        </p>
      </div>
    );
  }

  // Custom tooltip para Recharts
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isAboveBreakEven = data.precioComercial >= breakEvenUnitCost;

      return (
        <div className="p-3.5 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700 shadow-2xl text-white text-xs space-y-2 min-w-[260px] z-50">
          <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-200 block text-sm">{data.fullName}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                Lote: {data.unidadesLote} unidades · {data.rawScenario.timestamp}
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              isAboveBreakEven ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
            }`}>
              {isAboveBreakEven ? 'Rentable' : 'Pérdida'}
            </span>
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            {/* Punto de Equilibrio */}
            <div className="flex justify-between items-center text-red-400 font-bold bg-red-950/40 px-2 py-1 rounded-lg border border-red-900/50">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                Punto de Equilibrio:
              </span>
              <span>{formatCOP(breakEvenUnitCost)}</span>
            </div>

            {/* Precio Comercial Real */}
            <div className="flex justify-between items-center text-blue-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                Precio Comercial Real:
              </span>
              <span className="font-bold">{formatCOP(data.precioComercial)}</span>
            </div>

            {/* Precio Sugerido */}
            <div className="flex justify-between items-center text-purple-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
                Precio Sugerido ({data.margenEsperadoPct}%):
              </span>
              <span>{formatCOP(data.precioSugerido)}</span>
            </div>

            {/* Utilidad Unitaria */}
            <div className="flex justify-between items-center text-emerald-400 pt-1 border-t border-slate-800">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                Utilidad Neta / Und:
              </span>
              <span className="font-black">{formatCOP(data.utilidadUnitaria)}</span>
            </div>

            {/* Margen Real % */}
            <div className="flex justify-between items-center text-emerald-300 font-bold">
              <span>Margen Utilidad Real:</span>
              <span>{formatPercentage(data.margenRealPct)}</span>
            </div>

            {/* Utilidad Total del Lote */}
            <div className="flex justify-between items-center text-indigo-300 pt-1 border-t border-slate-800">
              <span>Utilidad Neta Lote:</span>
              <span className="font-black text-xs">{formatCOP(data.utilidadNetaLote)}</span>
            </div>

            {/* Brecha y Seguridad sobre el Equilibrio */}
            <div className="flex justify-between items-center text-amber-300 text-[10.5px]">
              <span>Holgura s/ Equilibrio:</span>
              <span className="font-bold">+{formatCOP(data.brechaEquilibrioUnitario)} (+{data.porcentajeSeguridadEquilibrio}%)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-5">
      
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            <Scale className="w-3 h-3 text-red-600 dark:text-red-400" />
            <span>Línea Visual de Punto de Equilibrio Activa: {formatCOP(breakEvenUnitCost)}</span>
          </div>
          <h4 className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Comparativa de Precios y Márgenes frente al Punto de Equilibrio</span>
          </h4>
          <p className="text-xs text-slate-500">
            La línea roja en el gráfico representa el <strong className="text-red-600 dark:text-red-400">Punto de Equilibrio Unitario ({formatCOP(breakEvenUnitCost)})</strong> calculado de forma automática sobre el costo unitario de producción.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold self-start lg:self-auto shadow-xs">
          <button
            type="button"
            onClick={() => setChartView('margins_and_prices')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              chartView === 'margins_and_prices'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Precios & Equilibrio</span>
          </button>

          <button
            type="button"
            onClick={() => setChartView('batch_profit')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              chartView === 'batch_profit'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Equilibrio de Lote ($)</span>
          </button>

          <button
            type="button"
            onClick={() => setChartView('break_even_gap')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              chartView === 'break_even_gap'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Holgura s/ Equilibrio</span>
          </button>
        </div>
      </div>

      {/* Break-even Diagnostic Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Card 1: Punto de Equilibrio Unitario Dinámico */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-red-700 dark:text-red-400 block tracking-wider">
                Punto de Equilibrio Unitario
              </span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            </div>
            <span className="text-base font-mono font-black text-red-600 dark:text-red-400">
              {formatCOP(breakEvenUnitCost)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              = costo_unitario_produccion (Margen 0%)
            </span>
          </div>
        </div>

        {/* Card 2: Escenario con Mayor Rentabilidad */}
        {breakEvenStats && (
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block tracking-wider">
                Mayor Margen Real (%)
              </span>
              <span className="text-base font-mono font-black text-emerald-600 dark:text-emerald-400">
                {breakEvenStats.topMarginScenario.output.formato.margen_utilidad_real_porcentaje}
              </span>
              <span className="text-[10px] text-slate-500 block truncate max-w-[200px]" title={breakEvenStats.topMarginScenario.name}>
                {breakEvenStats.topMarginScenario.name}
              </span>
            </div>
          </div>
        )}

        {/* Card 3: Escenario de Mayor Utilidad de Lote */}
        {breakEvenStats && (
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block tracking-wider">
                Mayor Utilidad Neta Lote
              </span>
              <span className="text-base font-mono font-black text-blue-600 dark:text-blue-400">
                {breakEvenStats.optimalScenario.output.formato.utilidad_neta_lote}
              </span>
              <span className="text-[10px] text-slate-500 block truncate max-w-[200px]" title={breakEvenStats.optimalScenario.name}>
                {breakEvenStats.optimalScenario.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Recharts Container */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        
        {/* CHART 1: Precios vs Punto de Equilibrio y Margen Real % */}
        {chartView === 'margins_and_prices' && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Precio Comercial vs. Línea Visual de Punto de Equilibrio
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900">
                  Línea Roja = {formatCOP(breakEvenUnitCost)}
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                Zona superior a la línea = Ganancia neta positiva
              </span>
            </div>

            <div className="h-84 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 25, right: 30, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  
                  {/* Eje X: Escenarios */}
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    interval={0}
                    angle={-10}
                    textAnchor="end"
                  />

                  {/* Eje Y Izquierdo: Precios en COP */}
                  <YAxis 
                    yAxisId="left" 
                    orientation="left"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`}
                    domain={[0, 'auto']}
                  />

                  {/* Eje Y Derecho: Porcentaje de Margen */}
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#10b981' }}
                    tickFormatter={(val) => `${val}%`}
                    domain={[0, 60]}
                  />

                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                  />

                  {/* LÍNEA VISUAL DE PUNTO DE EQUILIBRIO (Calculada automáticamente basándose en costo_unitario_produccion) */}
                  <ReferenceLine 
                    yAxisId="left"
                    y={breakEvenUnitCost} 
                    stroke="#dc2626" 
                    strokeDasharray="6 3" 
                    strokeWidth={2.5}
                    label={{
                      value: `⚖️ Punto de Equilibrio: ${formatCOP(breakEvenUnitCost)} (0% ganancia)`,
                      fill: '#dc2626',
                      fontSize: 11,
                      fontWeight: 'bold',
                      position: 'top',
                      offset: 6
                    }}
                  />

                  {/* Barras: Costo Unitario Base */}
                  <Bar 
                    yAxisId="left" 
                    dataKey="costoUnitario" 
                    name="Costo Base Manufactura" 
                    fill="#f59e0b" 
                    radius={[0, 0, 0, 0]}
                    maxBarSize={40}
                  />

                  {/* Barras: Ganancia Neta Unitaria */}
                  <Bar 
                    yAxisId="left" 
                    dataKey="utilidadUnitaria" 
                    name="Utilidad Neta / Und" 
                    fill="#10b981" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={40}
                  />

                  {/* Línea: Precio Sugerido */}
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="precioSugerido" 
                    name="Precio Sugerido" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#8b5cf6' }} 
                  />

                  {/* Línea: Margen Real % */}
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="margenRealPct" 
                    name="Margen Real (%)" 
                    stroke="#059669" 
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 2: Utilidad Neta de Lote ($ COP) con Línea de Costo Total de Equilibrio */}
        {chartView === 'batch_profit' && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Rendimiento Financiero del Lote vs. Costo Total de Equilibrio
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900">
                  Equilibrio Lote = {formatCOP(breakEvenBatchCost)}
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                Línea roja = Costo total que debe cubrirse para no perder
              </span>
            </div>

            <div className="h-84 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 25, right: 30, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    interval={0}
                    angle={-10}
                    textAnchor="end"
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  {/* LÍNEA DE EQUILIBRIO DE LOTE */}
                  <ReferenceLine 
                    y={breakEvenBatchCost} 
                    stroke="#dc2626" 
                    strokeDasharray="6 3" 
                    strokeWidth={2.5}
                    label={{
                      value: `⚖️ Costo de Equilibrio Lote: ${formatCOP(breakEvenBatchCost)}`,
                      fill: '#dc2626',
                      fontSize: 11,
                      fontWeight: 'bold',
                      position: 'top',
                      offset: 6
                    }}
                  />

                  {/* Barra Costo Total Lote */}
                  <Bar 
                    dataKey="costoTotalLote" 
                    name="Costo Total Lote" 
                    fill="#f59e0b" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={45}
                  />

                  {/* Barra Utilidad Neta Lote */}
                  <Bar 
                    dataKey="utilidadNetaLote" 
                    name="Utilidad Neta Lote" 
                    fill="#2563eb" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={45}
                  >
                    {chartData.map((entry, index) => {
                      const isTop = entry.id === breakEvenStats?.optimalScenario.id;
                      return (
                        <Cell 
                          key={`cell-profit-${index}`} 
                          fill={isTop ? '#10b981' : '#3b82f6'} 
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 3: Holgura sobre el Punto de Equilibrio (Margen de Seguridad %) */}
        {chartView === 'break_even_gap' && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pb-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Holgura de Seguridad sobre el Punto de Equilibrio (%)
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                Línea 0% = Punto de equilibrio (umbral de pérdida)
              </span>
            </div>

            <div className="h-84 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 25, right: 30, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    interval={0}
                    angle={-10}
                    textAnchor="end"
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => `+${val}%`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  {/* Línea de Referencia 0%: Equilibrio puro */}
                  <ReferenceLine 
                    y={0} 
                    stroke="#dc2626" 
                    strokeWidth={2.5}
                    strokeDasharray="6 3"
                    label={{
                      value: '⚖️ Umbral de Equilibrio (0% margen / $4.397)',
                      fill: '#dc2626',
                      fontSize: 11,
                      fontWeight: 'bold',
                      position: 'insideTopLeft'
                    }}
                  />

                  <Bar 
                    dataKey="porcentajeSeguridadEquilibrio" 
                    name="% Seguridad sobre Costo de Manufactura" 
                    fill="#059669" 
                    radius={[8, 8, 0, 0]} 
                    maxBarSize={45}
                  >
                    {chartData.map((entry, index) => {
                      const isTop = entry.id === breakEvenStats?.topMarginScenario.id;
                      return (
                        <Cell 
                          key={`cell-gap-${index}`} 
                          fill={isTop ? '#10b981' : '#6366f1'} 
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

      {/* Interactive Scenario Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
        <span className="text-slate-500 font-semibold flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          <span>Haz clic en un escenario para cargarlo en la calculadora activa:</span>
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {scenarios.map((scen) => (
            <button
              key={scen.id}
              type="button"
              onClick={() => onSelectScenario && onSelectScenario(scen)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold font-mono transition-all cursor-pointer border ${
                activeScenarioId === scen.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
              }`}
            >
              <span>{scen.name}</span>
              <span className="ml-1 text-[10px] opacity-75">
                ({scen.output.formato.margen_utilidad_real_porcentaje})
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default PricingMarginComparisonChart;

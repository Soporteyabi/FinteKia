import React, { useState, useMemo } from 'react';
import { calculatePricingLogic, PricingOutput } from '../../utils/pricingEngine';
import { formatCOP } from '../../utils/currencyUtils';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Boxes, 
  Coins, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  RotateCcw,
  BarChart3,
  ArrowRight
} from 'lucide-react';

export interface PricingCalculatorProps {
  initialCostoUnitario?: number;
  initialUnidadesLote?: number;
  initialPrecioComercial?: number;
  initialMargenEsperado?: number;
  title?: string;
  className?: string;
  onValuesChange?: (output: PricingOutput) => void;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  initialCostoUnitario = 4397.0,
  initialUnidadesLote = 15,
  initialPrecioComercial = 6450.0,
  initialMargenEsperado = 46.0,
  title = "Módulo de Fijación de Precios y Utilidades",
  className = "",
  onValuesChange
}) => {
  // Input state
  const [costoUnitario, setCostoUnitario] = useState<number | string>(initialCostoUnitario);
  const [unidadesLote, setUnidadesLote] = useState<number | string>(initialUnidadesLote);
  const [precioComercial, setPrecioComercial] = useState<number | string>(initialPrecioComercial);
  const [margenEsperado, setMargenEsperado] = useState<number | string>(initialMargenEsperado);

  // Compute live output using the imported calculatePricingLogic engine
  const results: PricingOutput = useMemo(() => {
    const output = calculatePricingLogic({
      costo_unitario_produccion: Number(costoUnitario) || 0,
      unidades_lote: Number(unidadesLote) || 0,
      precio_venta_comercial: Number(precioComercial) || 0,
      margen_esperado_porcentaje: Number(margenEsperado) || 0
    });

    if (onValuesChange) {
      onValuesChange(output);
    }

    return output;
  }, [costoUnitario, unidadesLote, precioComercial, margenEsperado, onValuesChange]);

  const handleReset = () => {
    setCostoUnitario(4397.0);
    setUnidadesLote(15);
    setPrecioComercial(6450.0);
    setMargenEsperado(46.0);
  };

  const handlePresetMargin = (pct: number) => {
    setMargenEsperado(pct);
  };

  return (
    <div className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden ${className}`}>
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 backdrop-blur-md border border-white/20 text-blue-100">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Fórmulas Validadas en Excel · Base Comercial 100%</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-300" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-blue-100/80">
            Fijación matemática de márgenes, precios sugeridos y rentabilidad de lote comercial
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Restablecer valores de prueba de taller (15 unds / $4.397 / 46%)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Lote Base</span>
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Section 1: Variables de Entrada (Inputs) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              1. Variables de Entrada de la Orden / Producto
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>Márgenes rápidos:</span>
              {[30, 40, 46, 50].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handlePresetMargin(m)}
                  className={`px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
                    Number(margenEsperado) === m
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {m}%
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Costo Unitario de Producción */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Precio Costo x Und</span>
                <Coins className="w-3.5 h-3.5 text-amber-500" />
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                <input
                  type="number"
                  step="any"
                  value={costoUnitario}
                  onChange={(e) => setCostoUnitario(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="4397.00"
                />
              </div>
              <span className="text-[9.5px] text-slate-400 block">Costo unit. de manufactura</span>
            </div>

            {/* Unidades Totales del Lote */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Ingresos Unds Totales</span>
                <Boxes className="w-3.5 h-3.5 text-blue-500" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={unidadesLote}
                  onChange={(e) => setUnidadesLote(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="15"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 font-mono">unds</span>
              </div>
              <span className="text-[9.5px] text-slate-400 block">Cantidad a producir / envasar</span>
            </div>

            {/* Margen de Utilidad Esperado (%) */}
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1.5">
              <label className="text-[10.5px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center justify-between">
                <span>Margen Esperado (%)</span>
                <Percent className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={margenEsperado}
                  onChange={(e) => setMargenEsperado(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-blue-950 dark:text-blue-200 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="46.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">%</span>
              </div>
              <span className="text-[9.5px] text-blue-600 dark:text-blue-400 block">Sugerido: {results.formato.precio_venta_sugerido}</span>
            </div>

            {/* Precio de Venta Comercial Real */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
              <label className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                <span>Precio Venta Comercial</span>
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 dark:text-emerald-400">$</span>
                <input
                  type="number"
                  step="any"
                  value={precioComercial}
                  onChange={(e) => setPrecioComercial(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="6450.00"
                />
              </div>
              <span className="text-[9.5px] text-emerald-700 dark:text-emerald-400 block">Precio real definido al cliente</span>
            </div>
          </div>
        </div>

        {/* Section 2: Resultados Financieros del Lote */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            2. Resultados Financieros y Utilidades Calculadas
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Precio Venta Sugerido */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Precio Venta Sugerido</span>
              <div className="text-base font-mono font-bold text-slate-900 dark:text-white mt-1">
                {results.formato.precio_venta_sugerido}
              </div>
              <span className="text-[9px] text-slate-400 font-mono block mt-1">
                Costo × (1 + {results.margen_esperado_porcentaje * 100}%)
              </span>
            </div>

            {/* Utilidad Neta Unitaria */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Utilidad Neta x Und</span>
              <div className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {results.formato.utilidad_neta_unitaria}
              </div>
              <span className="text-[9px] text-slate-400 font-mono block mt-1">
                Precio Com. - Costo Unit.
              </span>
            </div>

            {/* Costo Total del Lote */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Costo Total del Lote</span>
              <div className="text-base font-mono font-bold text-slate-900 dark:text-white mt-1">
                {results.formato.costo_total_lote}
              </div>
              <span className="text-[9px] text-slate-400 font-mono block mt-1">
                {formatCOP(results.costo_unitario_produccion)} × {results.unidades_lote} unds
              </span>
            </div>

            {/* Utilidad Bruta del Lote */}
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
              <span className="text-[10px] text-blue-800 dark:text-blue-300 uppercase font-bold block">
                Utilidad Bruta Lote (Ingresos)
              </span>
              <div className="text-base font-mono font-black text-blue-900 dark:text-blue-200 mt-1">
                {results.formato.utilidad_bruta_lote}
              </div>
              <span className="text-[9px] text-blue-700 dark:text-blue-400 font-mono block mt-1">
                {formatCOP(results.precio_venta_comercial)} × {results.unidades_lote} unds
              </span>
            </div>

            {/* Utilidad Neta del Lote */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 shadow-sm">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-black block">
                Utilidad Neta del Lote
              </span>
              <div className="text-lg font-mono font-black text-emerald-700 dark:text-emerald-300 mt-1">
                {results.formato.utilidad_neta_lote}
              </div>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono block mt-1">
                Util. Bruta - Costo Total
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Bloque de Indicadores Porcentuales Comerciales */}
        <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/60 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <span>3. Bloque de Indicadores Porcentuales Comerciales</span>
            </span>
            <span className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
              Costo ({results.formato.margen_costo_porcentaje}) + Utilidad Real ({results.formato.margen_utilidad_real_porcentaje}) = 100%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Margen Costo Porcentaje */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10.5px] text-slate-500">Margen de Costo:</span>
                <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                  {results.formato.margen_costo_porcentaje}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, results.indicadores.margen_costo_porcentaje))}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-400 font-mono block mt-1.5">
                (Costo Unit. / Precio Com.) × 100
              </span>
            </div>

            {/* Base Precio Comercial Base */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10.5px] text-slate-500">Base Precio Comercial:</span>
                <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                  {results.formato.porcentaje_precio_comercial_base}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-600 h-1.5 rounded-full w-full" />
              </div>
              <span className="text-[9px] text-slate-400 font-mono block mt-1.5">
                Precio Com. / Precio Com. (Siempre 100%)
              </span>
            </div>

            {/* Margen Sugerido Porcentaje */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10.5px] text-slate-500">Margen Sugerido:</span>
                <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                  {results.formato.margen_sugerido_porcentaje}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, results.indicadores.margen_sugerido_porcentaje))}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-400 font-mono block mt-1.5">
                (Precio Sugerido / Precio Com.) × 100
              </span>
            </div>

            {/* Margen Utilidad Real Porcentaje */}
            <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10.5px] text-emerald-800 dark:text-emerald-300 font-bold">
                  Margen Utilidad Real:
                </span>
                <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300">
                  {results.formato.margen_utilidad_real_porcentaje}
                </span>
              </div>
              <div className="w-full bg-emerald-200 dark:bg-emerald-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, results.indicadores.margen_utilidad_real_porcentaje))}%` }}
                />
              </div>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono block mt-1.5">
                (Utilidad Neta / Precio Com.) × 100
              </span>
            </div>
          </div>

          {/* Visual split bar */}
          <div className="pt-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
              Descomposición del Precio Comercial ($6.450,00 = 100%):
            </span>
            <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex text-[8.5px] font-bold text-white font-mono">
              <div 
                style={{ width: `${results.indicadores.margen_costo_porcentaje}%` }} 
                className="bg-amber-500 flex items-center justify-center overflow-hidden transition-all duration-300"
                title={`Costo: ${results.formato.margen_costo_porcentaje}`}
              >
                {results.indicadores.margen_costo_porcentaje >= 15 ? `Costo ${results.formato.margen_costo_porcentaje}` : ''}
              </div>
              <div 
                style={{ width: `${results.indicadores.margen_utilidad_real_porcentaje}%` }} 
                className="bg-emerald-500 flex items-center justify-center overflow-hidden transition-all duration-300"
                title={`Utilidad Real: ${results.formato.margen_utilidad_real_porcentaje}`}
              >
                {results.indicadores.margen_utilidad_real_porcentaje >= 15 ? `Utilidad ${results.formato.margen_utilidad_real_porcentaje}` : ''}
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                Costo: {formatCOP(results.costo_unitario_produccion)} ({results.formato.margen_costo_porcentaje})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Ganancia Neta: {formatCOP(results.utilidad_neta_unitaria)} ({results.formato.margen_utilidad_real_porcentaje})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingCalculator;

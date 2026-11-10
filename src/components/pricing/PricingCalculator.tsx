import React, { useState, useMemo, useEffect } from 'react';
import { calculatePricingLogic, PricingOutput } from '../../utils/pricingEngine';
import { formatCOP } from '../../utils/currencyUtils';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Boxes, 
  Coins, 
  Sparkles, 
  RotateCcw,
  BarChart3,
  Save,
  History,
  Trash2,
  Copy,
  Check,
  Award,
  Layers,
  ArrowRight,
  Plus,
  RefreshCw,
  Scale
} from 'lucide-react';
import { PricingMarginComparisonChart } from './PricingMarginComparisonChart';

export interface PricingScenario {
  id: string;
  name: string;
  timestamp: string;
  costoUnitario: number;
  unidadesLote: number;
  precioComercial: number;
  margenEsperado: number;
  output: PricingOutput;
}

export interface PricingCalculatorProps {
  initialCostoUnitario?: number;
  initialUnidadesLote?: number;
  initialPrecioComercial?: number;
  initialMargenEsperado?: number;
  title?: string;
  className?: string;
  onValuesChange?: (output: PricingOutput) => void;
}

const STORAGE_KEY = 'fintekia_pricing_scenarios_history';

// Escenarios predeterminados calibrados para comparación inmediata
const DEFAULT_SCENARIOS: PricingScenario[] = [
  {
    id: 'esc-base-excel',
    name: 'Lote Base Taller (Excel Validado)',
    timestamp: 'Calibrado Excel',
    costoUnitario: 4397.0,
    unidadesLote: 15,
    precioComercial: 6450.0,
    margenEsperado: 46.0,
    output: calculatePricingLogic({
      costo_unitario_produccion: 4397.0,
      unidades_lote: 15,
      precio_venta_comercial: 6450.0,
      margen_esperado_porcentaje: 46.0
    })
  },
  {
    id: 'esc-mayorista',
    name: 'Canal Mayorista / Distribuidores (30%)',
    timestamp: 'Estrategia Volumen',
    costoUnitario: 4397.0,
    unidadesLote: 30,
    precioComercial: 5750.0,
    margenEsperado: 30.0,
    output: calculatePricingLogic({
      costo_unitario_produccion: 4397.0,
      unidades_lote: 30,
      precio_venta_comercial: 5750.0,
      margen_esperado_porcentaje: 30.0
    })
  },
  {
    id: 'esc-premium-retail',
    name: 'Precio Retail Premium (55%)',
    timestamp: 'Venta Directa',
    costoUnitario: 4397.0,
    unidadesLote: 15,
    precioComercial: 6850.0,
    margenEsperado: 55.0,
    output: calculatePricingLogic({
      costo_unitario_produccion: 4397.0,
      unidades_lote: 15,
      precio_venta_comercial: 6850.0,
      margen_esperado_porcentaje: 55.0
    })
  }
];

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

  // Scenario management state
  const [scenarioName, setScenarioName] = useState<string>('');
  const [scenarios, setScenarios] = useState<PricingScenario[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Re-calculate outputs with engine to ensure consistency
          return parsed.map((item: any) => ({
            ...item,
            output: calculatePricingLogic({
              costo_unitario_produccion: Number(item.costoUnitario) || 0,
              unidades_lote: Number(item.unidadesLote) || 0,
              precio_venta_comercial: Number(item.precioComercial) || 0,
              margen_esperado_porcentaje: Number(item.margenEsperado) || 0
            })
          }));
        }
      }
    } catch (e) {
      console.warn('Error reading scenarios from localStorage:', e);
    }
    return DEFAULT_SCENARIOS;
  });

  const [activeTab, setActiveTab] = useState<'calculator' | 'comparison' | 'all'>('all');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
    } catch (e) {
      console.warn('Error saving scenarios to localStorage:', e);
    }
  }, [scenarios]);

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

  // Guardar escenario actual en el historial
  const handleSaveScenario = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const nameToSave = scenarioName.trim() || 
      `Escenario Margen ${margenEsperado}% ($${formatCOP(Number(precioComercial) || 0)})`;

    const newScenario: PricingScenario = {
      id: `scen-${Date.now()}`,
      name: nameToSave,
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      costoUnitario: Number(costoUnitario) || 0,
      unidadesLote: Number(unidadesLote) || 0,
      precioComercial: Number(precioComercial) || 0,
      margenEsperado: Number(margenEsperado) || 0,
      output: results
    };

    setScenarios(prev => [newScenario, ...prev]);
    setScenarioName('');
    setSaveSuccessMsg(`¡Escenario "${nameToSave}" guardado en el historial!`);

    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 3500);
  };

  // Cargar escenario del historial a los campos editables
  const handleLoadScenario = (scen: PricingScenario) => {
    setCostoUnitario(scen.costoUnitario);
    setUnidadesLote(scen.unidadesLote);
    setPrecioComercial(scen.precioComercial);
    setMargenEsperado(scen.margenEsperado);

    setSaveSuccessMsg(`Valores de "${scen.name}" cargados en la calculadora.`);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 3000);
  };

  // Eliminar un escenario
  const handleDeleteScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  };

  // Restaurar escenarios por defecto
  const handleResetDefaultScenarios = () => {
    setScenarios(DEFAULT_SCENARIOS);
    setSaveSuccessMsg('Escenarios restaurados a los 3 modelos base predeterminados.');
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 3000);
  };

  // Limpiar todos los escenarios
  const handleClearAllScenarios = () => {
    if (window.confirm('¿Deseas vaciar todo el historial de escenarios guardados?')) {
      setScenarios([]);
    }
  };

  // Copiar resumen comparativo en formato texto
  const handleCopySummary = () => {
    if (scenarios.length === 0) return;

    let text = `=== COMPARATIVA DE ESCENARIOS DE PRECIOS Y MÁRGENES (ERP FINTEKIA) ===\n\n`;
    scenarios.forEach((s, idx) => {
      text += `${idx + 1}. ${s.name} (${s.timestamp})\n`;
      text += `   - Costo Unit: ${formatCOP(s.costoUnitario)} | Lote: ${s.unidadesLote} unds\n`;
      text += `   - Margen Esp: ${s.margenEsperado}% | Precio Sugerido: ${s.output.formato.precio_venta_sugerido}\n`;
      text += `   - Precio Comercial Real: ${formatCOP(s.precioComercial)}\n`;
      text += `   - Utilidad Neta / Und: ${s.output.formato.utilidad_neta_unitaria}\n`;
      text += `   - Utilidad Neta Lote: ${s.output.formato.utilidad_neta_lote}\n`;
      text += `   - Margen Real: ${s.output.formato.margen_utilidad_real_porcentaje} | Margen Costo: ${s.output.formato.margen_costo_porcentaje}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Indicadores de comparación destacados
  const bestMarginScenario = useMemo(() => {
    if (scenarios.length === 0) return null;
    return [...scenarios].sort((a, b) => 
      b.output.indicadores.margen_utilidad_real_porcentaje - a.output.indicadores.margen_utilidad_real_porcentaje
    )[0];
  }, [scenarios]);

  const bestNetProfitScenario = useMemo(() => {
    if (scenarios.length === 0) return null;
    return [...scenarios].sort((a, b) => b.output.utilidad_neta_lote - a.output.utilidad_neta_lote)[0];
  }, [scenarios]);

  return (
    <div className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden ${className}`}>
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 backdrop-blur-md border border-white/20 text-blue-100">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Fórmulas Validadas en Excel · Base Comercial 100% · Historial de Escenarios</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-300" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-blue-100/80">
            Fijación matemática de márgenes, precios sugeridos, utilidades de lote y comparativas multiescenario
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-black/20 p-1 rounded-xl border border-white/15 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              Vista Completa
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'calculator' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              Calculadora
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'comparison' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5 text-blue-500" />
              <span>Comparativa ({scenarios.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Restablecer valores de prueba de taller (15 unds / $4.397 / 46%)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Lote Base</span>
          </button>
        </div>
      </div>

      {/* Floating Status Notification */}
      {saveSuccessMsg && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button 
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      <div className="p-5 sm:p-6 space-y-6">
        
        {/* ======================================================== */}
        {/* SECCIÓN 1: CALCULADORA Y ENTRADA DE VARIABLES           */}
        {/* ======================================================== */}
        {(activeTab === 'all' || activeTab === 'calculator') && (
          <div className="space-y-6">
            {/* Variables de Entrada */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  1. Variables de Entrada de la Orden / Producto
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>Márgenes sugeridos:</span>
                  {[25, 30, 40, 46, 50, 55].map((m) => (
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
                  <span className="text-[9.5px] text-blue-600 dark:text-blue-400 block">
                    Sugerido: {results.formato.precio_venta_sugerido}
                  </span>
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
                  <span className="text-[9.5px] text-emerald-700 dark:text-emerald-400 block">
                    Precio real definido al cliente
                  </span>
                </div>
              </div>
            </div>

            {/* Guardar Escenario Bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/60 to-purple-50/40 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                  <Save className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Guardar este Cálculo como Escenario
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Almacena esta combinación de precio, margen y volumen para compararla con otras alternativas.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder={`Ej: Minorista ${margenEsperado}% ($${formatCOP(Number(precioComercial) || 0)})`}
                  className="px-3 py-1.5 text-xs rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 min-w-[240px]"
                />
                <button
                  type="button"
                  onClick={() => handleSaveScenario()}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Guardar Escenario</span>
                </button>
              </div>
            </div>

            {/* Resultados Financieros del Lote */}
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

            {/* Bloque de Indicadores Porcentuales Comerciales */}
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
                  Descomposición del Precio Comercial (${formatCOP(Number(precioComercial) || 0)} = 100%):
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
        )}

        {/* ======================================================== */}
        {/* SECCIÓN 2: HISTORIAL Y COMPARATIVA DE ESCENARIOS         */}
        {/* ======================================================== */}
        {(activeTab === 'all' || activeTab === 'comparison') && (
          <div className="space-y-5 pt-2">
            {/* Header de la sección de Comparativa */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-6">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                    Historial y Matriz Comparativa de Márgenes
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    {scenarios.length} {scenarios.length === 1 ? 'Escenario' : 'Escenarios'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Evalúa cómo cambian las utilidades netas y márgenes reales al modificar volumen, porcentaje y precio comercial.
                </p>
              </div>

              {/* Botones de acción general */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  disabled={scenarios.length === 0}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
                  title="Copiar texto resumen de todos los escenarios al portapapeles"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedSummary ? '¡Copiado!' : 'Copiar Resumen'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetDefaultScenarios}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  title="Restaurar los 3 escenarios predeterminados de taller"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                  <span>Restaurar Base</span>
                </button>

                {scenarios.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllScenarios}
                    className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-red-100/60 transition-all cursor-pointer"
                    title="Vaciar todo el historial"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tarjetas de Insights y Campeones de Rentabilidad */}
            {scenarios.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Mayor Margen Real % */}
                {bestMarginScenario && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-300 dark:border-emerald-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mayor Margen Real (%)</span>
                      </span>
                      <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-300">
                        {bestMarginScenario.output.formato.margen_utilidad_real_porcentaje}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {bestMarginScenario.name}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      <span>Precio: {formatCOP(bestMarginScenario.precioComercial)}</span>
                      <span>Ganancia/Und: {bestMarginScenario.output.formato.utilidad_neta_unitaria}</span>
                    </div>
                  </div>
                )}

                {/* Mayor Utilidad Neta de Lote */}
                {bestNetProfitScenario && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-300 dark:border-blue-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                        <span>Mayor Utilidad Neta Lote</span>
                      </span>
                      <span className="text-xs font-mono font-black text-blue-700 dark:text-blue-300">
                        {bestNetProfitScenario.output.formato.utilidad_neta_lote}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {bestNetProfitScenario.name}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      <span>Volumen: {bestNetProfitScenario.unidadesLote} unds</span>
                      <span>Margen Real: {bestNetProfitScenario.output.formato.margen_utilidad_real_porcentaje}</span>
                    </div>
                  </div>
                )}

                {/* Balance & Comparativa Actual vs Escenarios */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Cálculo Actual en Vivo</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      {results.formato.margen_utilidad_real_porcentaje}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    Lote Actual ({unidadesLote} unds @ {margenEsperado}%)
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                    <span>Precio: {formatCOP(Number(precioComercial) || 0)}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {results.formato.utilidad_neta_lote}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Componente Gráfico Recharts: Comparativa de Márgenes y Punto de Equilibrio */}
            {scenarios.length > 0 && (
              <PricingMarginComparisonChart
                scenarios={scenarios}
                costo_unitario_produccion={Number(costoUnitario) || 0}
                unidades_lote={Number(unidadesLote) || 0}
                onSelectScenario={handleLoadScenario}
              />
            )}

            {/* Gráfico Comparativo de Barras: Margen Real % y Utilidad Neta del Lote */}
            {scenarios.length > 0 && (

              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    <span>Comparativa Visual de Rentabilidad por Escenario</span>
                  </span>
                  <span className="text-[10.5px] text-slate-400 font-mono">
                    Márgenes Reales y Utilidad del Lote
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  {scenarios.map((scen) => {
                    const isBestMargin = bestMarginScenario?.id === scen.id;
                    const isBestProfit = bestNetProfitScenario?.id === scen.id;
                    const maxProfit = Math.max(...scenarios.map(s => s.output.utilidad_neta_lote), 1);
                    const profitWidthPct = Math.min(100, Math.max(10, (scen.output.utilidad_neta_lote / maxProfit) * 100));

                    return (
                      <div 
                        key={scen.id} 
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 space-y-2 hover:border-blue-400 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {scen.name}
                            </span>
                            {isBestMargin && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-0.5">
                                <Award className="w-3 h-3" />
                                Top Margen
                              </span>
                            )}
                            {isBestProfit && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-0.5">
                                <DollarSign className="w-3 h-3" />
                                Top Ganancia Lote
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="text-slate-500">
                              P. Com: <b className="text-slate-800 dark:text-slate-200">{formatCOP(scen.precioComercial)}</b>
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Margen Real: {scen.output.formato.margen_utilidad_real_porcentaje}
                            </span>
                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                              Lote: {scen.output.formato.utilidad_neta_lote}
                            </span>
                          </div>
                        </div>

                        {/* Barra dual: Margen Real % arriba, Utilidad Neta Lote abajo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
                          <div>
                            <div className="flex justify-between text-slate-500 mb-0.5">
                              <span>Margen Real vs Costo:</span>
                              <span>{scen.output.formato.margen_utilidad_real_porcentaje}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                              <div 
                                style={{ width: `${scen.output.indicadores.margen_costo_porcentaje}%` }} 
                                className="bg-amber-400 h-full"
                                title={`Costo: ${scen.output.formato.margen_costo_porcentaje}`}
                              />
                              <div 
                                style={{ width: `${scen.output.indicadores.margen_utilidad_real_porcentaje}%` }} 
                                className="bg-emerald-500 h-full"
                                title={`Utilidad Real: ${scen.output.formato.margen_utilidad_real_porcentaje}`}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-slate-500 mb-0.5">
                              <span>Utilidad Total Lote:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{scen.output.formato.utilidad_neta_lote}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${profitWidthPct}%` }} 
                                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TABLA MATRIZ DE ESCENARIOS */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>Matriz Detallada de Escenarios Guardados</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Valores expresados en Pesos Colombianos (COP)
                </span>
              </div>

              {scenarios.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <p className="text-sm text-slate-500">
                    No tienes escenarios guardados aún en el historial.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetDefaultScenarios}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm hover:bg-blue-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cargar Escenarios de Ejemplo</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/40 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-3">Escenario</th>
                        <th className="py-3 px-3 text-right">Costo Und</th>
                        <th className="py-3 px-3 text-center">Unds</th>
                        <th className="py-3 px-3 text-right">Margen Esp.</th>
                        <th className="py-3 px-3 text-right">P. Sugerido</th>
                        <th className="py-3 px-3 text-right">P. Comercial</th>
                        <th className="py-3 px-3 text-right">Util. / Und</th>
                        <th className="py-3 px-3 text-right">Utilidad Lote</th>
                        <th className="py-3 px-3 text-center">Margen Real %</th>
                        <th className="py-3 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                      {scenarios.map((scen) => {
                        const isBestMargin = bestMarginScenario?.id === scen.id;
                        const isBestProfit = bestNetProfitScenario?.id === scen.id;

                        return (
                          <tr 
                            key={scen.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Nombre & Marca */}
                            <td className="py-3 px-3 font-sans">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{scen.name}</span>
                                {isBestMargin && (
                                  <span title="Mayor margen de utilidad real" className="text-emerald-600">
                                    ★
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {scen.timestamp}
                              </span>
                            </td>

                            {/* Costo Unitario */}
                            <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                              {formatCOP(scen.costoUnitario)}
                            </td>

                            {/* Unidades Lote */}
                            <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                              {scen.unidadesLote}
                            </td>

                            {/* Margen Esperado */}
                            <td className="py-3 px-3 text-right text-blue-600 dark:text-blue-400 font-bold">
                              {scen.margenEsperado}%
                            </td>

                            {/* Precio Sugerido */}
                            <td className="py-3 px-3 text-right text-slate-500">
                              {scen.output.formato.precio_venta_sugerido}
                            </td>

                            {/* Precio Comercial Real */}
                            <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                              {formatCOP(scen.precioComercial)}
                            </td>

                            {/* Utilidad Unitaria */}
                            <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {scen.output.formato.utilidad_neta_unitaria}
                            </td>

                            {/* Utilidad Neta Lote */}
                            <td className="py-3 px-3 text-right font-black text-emerald-700 dark:text-emerald-300">
                              <span className={`px-2 py-0.5 rounded-lg ${isBestProfit ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200' : ''}`}>
                                {scen.output.formato.utilidad_neta_lote}
                              </span>
                            </td>

                            {/* Margen Real % */}
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                                isBestMargin
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              }`}>
                                {scen.output.formato.margen_utilidad_real_porcentaje}
                              </span>
                            </td>

                            {/* Acciones */}
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 font-sans">
                                <button
                                  type="button"
                                  onClick={() => handleLoadScenario(scen)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                  title="Cargar estos parámetros en las casillas editables"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                  <span>Cargar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteScenario(scen.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                                  title="Eliminar este escenario del historial"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PricingCalculator;

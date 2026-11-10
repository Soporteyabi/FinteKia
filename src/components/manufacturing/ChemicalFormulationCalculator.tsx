import React, { useState, useMemo } from 'react';
import { 
  calculateKohComercial, 
  SUPERFAT_PRESETS, 
  ProductTargetCategory, 
  FormulationOutput 
} from '../../utils/saponificationEngine';
import { 
  FlaskConical, 
  Sparkles, 
  Scale, 
  Droplets, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight, 
  RotateCcw, 
  ShieldCheck, 
  Heart, 
  Home, 
  Sliders, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

interface ChemicalFormulationCalculatorProps {
  initialAceiteG?: number;
  initialSap?: number;
  initialCategoria?: ProductTargetCategory;
  onApplyToOrder?: (kohComercialG: number, superfatPct: number) => void;
  className?: string;
}

// Aceites y grasas comunes con sus índices SAP KOH (g KOH / g aceite)
const OILS_DATABASE = [
  { name: 'Aceite de Girasol (Excel Taller)', sap: 0.189, defaultG: 5046.0, desc: 'Aceite insaturado base para lote de 30L' },
  { name: 'Mezcla Específica de Taller', sap: 0.228, defaultG: 1000.0, desc: 'Fórmula de prueba 1.000g' },
  { name: 'Aceite de Coco', sap: 0.257, defaultG: 1000.0, desc: 'Alto espumado y dureza' },
  { name: 'Aceite de Palma / Sebo', sap: 0.199, defaultG: 1000.0, desc: 'Detergencia pesada' },
  { name: 'Aceite de Oliva', sap: 0.190, defaultG: 1000.0, desc: 'Suavidad extrema para piel' },
  { name: 'Aceite de Ricino (Castor)', sap: 0.180, defaultG: 500.0, desc: 'Estabilizador de espuma' }
];

export const ChemicalFormulationCalculator: React.FC<ChemicalFormulationCalculatorProps> = ({
  initialAceiteG = 5046.0, // 5.046g del Excel del usuario
  initialSap = 0.189,     // Girasol del Excel del usuario
  initialCategoria = 'hogar',
  onApplyToOrder,
  className = ''
}) => {
  const [categoria, setCategoria] = useState<ProductTargetCategory>(initialCategoria);
  const [customSuperfat, setCustomSuperfat] = useState<number>(0.0);
  const [cantidadAceite, setCantidadAceite] = useState<number | string>(initialAceiteG);
  const [indiceSap, setIndiceSap] = useState<number | string>(initialSap);
  const [purezaKoh] = useState<number>(0.90); // 90% fijo por especificación técnica

  // Determinar superfat activo
  const activeSuperfat = useMemo(() => {
    if (categoria === 'personalizado') {
      return Number(customSuperfat) || 0;
    }
    return SUPERFAT_PRESETS[categoria] ?? 0.00;
  }, [categoria, customSuperfat]);

  // Ejecutar motor de formulación
  const formulation: FormulationOutput = useMemo(() => {
    return calculateKohComercial({
      cantidad_aceite_g: Number(cantidadAceite) || 0,
      indice_sap: Number(indiceSap) || 0,
      pureza_koh: purezaKoh,
      superfat_porcentaje: activeSuperfat,
      categoria_producto: categoria
    });
  }, [cantidadAceite, indiceSap, purezaKoh, activeSuperfat, categoria]);

  // Selección rápida de aceite
  const handleSelectOil = (oil: typeof OILS_DATABASE[0]) => {
    setIndiceSap(oil.sap);
    setCantidadAceite(oil.defaultG);
  };

  // Botón para cargar el caso de prueba 1000g @ SAP 0.228
  const handleLoadTestCase = (superfatTarget: 0.0 | 0.03) => {
    setCantidadAceite(1000.0);
    setIndiceSap(0.228);
    if (superfatTarget === 0.0) {
      setCategoria('hogar');
    } else {
      setCategoria('cuidado_personal');
    }
  };

  // Restablecer valores de la hoja de Excel (5.046g Girasol / 30L)
  const handleResetExcel = () => {
    setCantidadAceite(5046.0);
    setIndiceSap(0.189);
    setCategoria('hogar');
  };

  return (
    <div className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden ${className}`}>
      
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 backdrop-blur-md border border-white/20 text-amber-100">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Módulo Químico · Control de Superfat & Saponificación KOH</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-300" />
            <span>Calculadora de Superfat y Potasa Comercial (KOH)</span>
          </h3>
          <p className="text-xs text-amber-100/80">
            Automatiza la potasa a pesar en báscula descontando el sobreengrasado y ajustando la pureza comercial del 90%.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetExcel}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Cargar valores del Excel base (5.046g Aceite de Girasol / 30 Litros)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-200" />
            <span>Lote Excel 30L (5.046g)</span>
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">

        {/* ======================================================== */}
        {/* SECCIÓN 1: SELECTOR DE CONTROL DE SUPERFAT (DROPDOWN)     */}
        {/* ======================================================== */}
        <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
                <Sliders className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>1. Variable de Control: «Superfat» (Exceso de Aceite)</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 font-mono">
                    Activo: {formulation.superfat_visual_porcentaje}%
                  </span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Selecciona el destino del producto para calibrar la grasa libre de forma automatizada.
                </p>
              </div>
            </div>

            {/* Quick Test Cases */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] text-slate-500 font-semibold">Test Rápido (1.000g / SAP 0.228):</span>
              <button
                type="button"
                onClick={() => handleLoadTestCase(0.0)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold hover:bg-slate-100 cursor-pointer"
                title="Superfat 0.0% -> 253.3g KOH"
              >
                0.0% (253.3g)
              </button>
              <button
                type="button"
                onClick={() => handleLoadTestCase(0.03)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold hover:bg-slate-100 cursor-pointer"
                title="Superfat 3.0% -> 245.7g KOH"
              >
                3.0% (245.7g)
              </button>
            </div>
          </div>

          {/* Menú de Selección Visual de Superfat */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Opción 1: Hogar (0.0%) */}
            <div 
              onClick={() => setCategoria('hogar')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                categoria === 'hogar'
                  ? 'bg-white dark:bg-slate-900 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                  <Home className="w-4 h-4" />
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black font-mono bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
                  0.0% Superfat
                </span>
              </div>
              <div>
                <h5 className="text-xs font-black text-slate-900 dark:text-white">
                  Hogar (Detergente / Lavaloza)
                </h5>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Saponificación completa al 100%. Sin aceite residual para evitar que manche telas o se vuelva rancio con el tiempo.
                </p>
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold font-mono">
                Formula: superfat = 0.00 (Máximo Desengrase)
              </div>
            </div>

            {/* Opción 2: Cuidado Personal (3.0%) */}
            <div 
              onClick={() => setCategoria('cuidado_personal')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                categoria === 'cuidado_personal'
                  ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300">
                  <Heart className="w-4 h-4" />
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200">
                  3.0% Superfat
                </span>
              </div>
              <div>
                <h5 className="text-xs font-black text-slate-900 dark:text-white">
                  Cuidado Personal (Lavamanos)
                </h5>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Reduce el álcali para dejar un 3% de aceites vegetales sin reaccionar como humectante natural para la piel.
                </p>
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                Formula: superfat = 0.03 (Suavidad Dérmica)
              </div>
            </div>

            {/* Opción 3: Personalizado */}
            <div 
              onClick={() => setCategoria('personalizado')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                categoria === 'personalizado'
                  ? 'bg-white dark:bg-slate-900 border-purple-500 shadow-md ring-2 ring-purple-500/20'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300">
                  <Sliders className="w-4 h-4" />
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="15"
                    value={customSuperfat}
                    onChange={(e) => {
                      setCategoria('personalizado');
                      setCustomSuperfat(Number(e.target.value) || 0);
                    }}
                    className="w-14 px-1.5 py-0.5 text-xs font-mono font-bold text-center rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800"
                    placeholder="0.0"
                  />
                  <span className="text-xs font-bold text-purple-600 font-mono">%</span>
                </div>
              </div>
              <div>
                <h5 className="text-xs font-black text-slate-900 dark:text-white">
                  Personalizado (Ensayos de Taller)
                </h5>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Define un porcentaje de sobreengrasado libre (ej. 1% a 5%) para pruebas de laboratorio o lotes experimentales.
                </p>
              </div>
              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold font-mono">
                Ajustable manualmente
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECCIÓN 2: VARIABLES DE ENTRADA QUÍMICA                  */}
        {/* ======================================================== */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              2. Parámetros de la Grasa / Aceite a Procesar
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span className="text-[10.5px]">Aceites comunes:</span>
              {OILS_DATABASE.slice(0, 3).map((oil) => (
                <button
                  key={oil.name}
                  type="button"
                  onClick={() => handleSelectOil(oil)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
                    Number(indiceSap) === oil.sap
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {oil.name.split(' ')[2] || oil.name.split(' ')[0]} (SAP {oil.sap})
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Cantidad de Aceite en Gramos */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Gramos de Aceite (g)</span>
                <Droplets className="w-3.5 h-3.5 text-amber-500" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={cantidadAceite}
                  onChange={(e) => setCantidadAceite(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono font-black rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="5046.0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">g</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{(Number(cantidadAceite) / 1000).toFixed(3)} Kilos netos</span>
                <button
                  type="button"
                  onClick={() => setCantidadAceite(5046.0)}
                  className="text-amber-600 hover:underline cursor-pointer"
                >
                  Excel: 5.046g
                </button>
              </div>
            </div>

            {/* Índice SAP KOH */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Índice SAP KOH (g KOH / g aceite)</span>
                <FlaskConical className="w-3.5 h-3.5 text-blue-500" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  value={indiceSap}
                  onChange={(e) => setIndiceSap(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono font-black rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.189"
                />
              </div>
              <span className="text-[10px] text-slate-400 block font-mono">
                Girasol = 0.189 · Mezcla = 0.228 · Coco = 0.257
              </span>
            </div>

            {/* Pureza del KOH Comercial */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Pureza KOH Comercial</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value="90.0%"
                  className="w-full px-3 py-2 text-sm font-mono font-black rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-not-allowed"
                />
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono">
                Constante: 0.90 (Potasa comercial Proquimpi / Cali)
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECCIÓN 3: RESULTADOS DE SAPONIFICACIÓN ESTEQUIOMÉTRICA  */}
        {/* ======================================================== */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            3. Cálculos de Potasa Comercial y Estequiometría de la Reacción
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* KOH Puro Teórico */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                KOH Puro Teórico (0% Exceso)
              </span>
              <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                {formulation.koh_puro_teorico.toFixed(1)} g
              </div>
              <span className="text-[9.5px] text-slate-400 font-mono block mt-1">
                {cantidadAceite}g × {indiceSap} (SAP)
              </span>
            </div>

            {/* Descuento por Superfat */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                KOH Puro con Superfat ({formulation.superfat_visual_porcentaje}%)
              </span>
              <div className="text-xl font-mono font-black text-amber-600 dark:text-amber-400 mt-1">
                {formulation.koh_puro_con_descuento.toFixed(1)} g
              </div>
              <span className="text-[9.5px] text-slate-400 font-mono block mt-1">
                KOH Puro × (1 - {formulation.superfat_porcentaje})
              </span>
            </div>

            {/* KOH COMERCIAL A PESAR EN BÁSCULA (EL RESULTADO CLAVE) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/30 border-2 border-amber-400 dark:border-amber-600 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-900 dark:text-amber-300 uppercase font-black tracking-wider block">
                  KOH Comercial a Pesar (Báscula)
                </span>
                <Scale className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-mono font-black text-amber-700 dark:text-amber-300 mt-1">
                {formulation.koh_comercial_final.toFixed(1)} g
              </div>
              <span className="text-[10px] text-amber-800 dark:text-amber-400 font-mono font-bold block mt-1">
                (KOH Puro c/ Descuento) ÷ 0.90
              </span>
            </div>

            {/* Agua Destilada de Lejía Recomendada (Concentración 30%) */}
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
              <span className="text-[10px] text-blue-800 dark:text-blue-300 uppercase font-bold block">
                Agua de Lejía (Conc. 30%)
              </span>
              <div className="text-xl font-mono font-black text-blue-900 dark:text-blue-200 mt-1">
                {(formulation.koh_comercial_final * ((1 - 0.30) / 0.30)).toFixed(1)} g
              </div>
              <span className="text-[9.5px] text-blue-700 dark:text-blue-400 font-mono block mt-1">
                2.333g agua / g de KOH comercial
              </span>
            </div>
          </div>
        </div>

        {/* Resumen del Comportamiento Químico */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h5 className="font-bold text-slate-800 dark:text-slate-200">
              Diagnóstico de Calidad Quimico-Física
            </h5>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {formulation.descripcion_seguridad} Para un lote de <strong>{cantidadAceite}g</strong> de aceite con SAP <strong>{indiceSap}</strong> y Superfat al <strong>{formulation.superfat_visual_porcentaje}%</strong>, se deben pesar con exactitud <strong>{formulation.koh_comercial_final.toFixed(1)}g de KOH comercial (90%)</strong> en la balanza de taller.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChemicalFormulationCalculator;

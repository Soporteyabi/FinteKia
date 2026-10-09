import React, { useState } from 'react';
import { QualityInspection, ProductionOrder, BOM, Product } from '../types';
import { THEMES_MAP } from './Sidebar';
import Pagination from './Pagination';

interface QualityViewProps {
  qualityInspections: QualityInspection[];
  productionOrders: ProductionOrder[];
  boms: BOM[];
  products: Product[];
  addQualityInspection: (qi: Omit<QualityInspection, 'id'>) => void;
  updateOrderStatus: (id: string, status: ProductionOrder['status']) => void;
  theme?: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
}

export default function QualityView({
  qualityInspections,
  productionOrders,
  boms,
  products,
  addQualityInspection,
  updateOrderStatus,
  theme = 'slate_gray'
}: QualityViewProps) {
  const [activeTab, setActiveTab] = useState<'log' | 'audit' | 'analytics'>('log');
  
  // Theme coloring config
  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;
  const isDark = theme === 'navy_dark' || theme === 'light_gray';

  // --- Search & Filter State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Aprobado' | 'Rechazado' | 'Observación' | 'Pendiente'>('Todos');

  // --- Audit Form State ---
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [inspectorName, setInspectorName] = useState('Ing. de Calidad');
  const [measuredValue, setMeasuredValue] = useState<number>(0);
  const [auditNotes, setAuditNotes] = useState('');
  const [afterAuditStatus, setAfterAuditStatus] = useState<ProductionOrder['status']>('completada');

  // Utility helpers
  const getProductByBomId = (bomId: string) => {
    const bom = boms.find(b => b.id === bomId);
    if (!bom) return null;
    return products.find(p => p.id === bom.finishedProductId);
  };

  const getOrderName = (orderId: string) => {
    const order = productionOrders.find(o => o.id === orderId);
    if (!order) return 'Orden de Producción';
    const prod = getProductByBomId(order.bomId);
    return `${order.orderNumber} - ${prod?.name || 'Producto'}`;
  };

  // Find standards of the currently selected order to audit
  const targetOrder = productionOrders.find(o => o.id === selectedOrderId);
  const selectedBOM = targetOrder ? boms.find(b => b.id === targetOrder.bomId) : null;
  const standards = selectedBOM?.standards || null;

  // Real-time calculation of quality status based on the selected target's standards and input
  const calculateLiveResult = (val: number): QualityInspection['result'] => {
    if (!standards) return 'Pendiente';
    const minVal = standards.target - standards.tolerance;
    const maxVal = standards.target + standards.tolerance;
    
    if (val >= minVal && val <= maxVal) {
      return 'Aprobado';
    } else if (val >= minVal - (standards.tolerance * 0.5) && val <= maxVal + (standards.tolerance * 0.5)) {
      return 'Observación';
    } else {
      return 'Rechazado';
    }
  };

  const liveResult = targetOrder ? calculateLiveResult(measuredValue) : 'Pendiente';

  // Auto-fill form values when order selection changes
  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = productionOrders.find(o => o.id === orderId);
    if (order) {
      const bom = boms.find(b => b.id === order.bomId);
      if (bom?.standards) {
        setMeasuredValue(bom.standards.target); // default to target
      } else {
        setMeasuredValue(0);
      }
      setAuditNotes('');
    }
  };

  // Submit audit form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      alert("Por favor seleccione un lote o número de OP para auditar.");
      return;
    }

    const order = productionOrders.find(o => o.id === selectedOrderId);
    if (!order || !standards) return;

    // Register inspection in log
    addQualityInspection({
      date: new Date().toISOString().split('T')[0],
      productionOrderId: order.id,
      loteNumber: order.generatedLot || `LOTE-${order.orderNumber}`,
      inspector: inspectorName,
      paramInspected: standards.param,
      valueMeasured: measuredValue,
      result: liveResult,
      notes: auditNotes || `Inspección de rutina. Parámetro: ${standards.param}. Valor medido: ${measuredValue}.`
    });

    // Automatically trigger OP status transition to the user's choosing (or calculated result)
    // If the audit is rejected, suggest setting status to 'rechazada' or 'calidad' (under quarantine status)
    const proposedStatus = liveResult === 'Rechazado' ? 'rechazada' : afterAuditStatus;
    updateOrderStatus(order.id, proposedStatus);

    alert(`¡Inspección técnica registrada! El lote se ha clasificado como [${liveResult}] y la OP se actualizó a estado [${proposedStatus}].`);
    
    // Reset selection and revert tab back to log list
    setSelectedOrderId('');
    setAuditNotes('');
    setActiveTab('log');
  };

  // --- FILTERED LOGS ---
  const filteredInspections = qualityInspections.filter(item => {
    // Search filter
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch = 
      item.loteNumber.toLowerCase().includes(lowerSearch) ||
      item.inspector.toLowerCase().includes(lowerSearch) ||
      item.paramInspected.toLowerCase().includes(lowerSearch) ||
      (item.notes || '').toLowerCase().includes(lowerSearch);

    // Status filter
    const matchesStatus = statusFilter === 'Todos' || item.result === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination for quality audits (15 per page)
  const [qualityPage, setQualityPage] = useState(1);
  const QUALITY_PER_PAGE = 15;
  const totalQualityPages = Math.max(1, Math.ceil(filteredInspections.length / QUALITY_PER_PAGE));
  const safeQualityPage = Math.min(qualityPage, totalQualityPages);
  const paginatedInspections = filteredInspections.slice(
    (safeQualityPage - 1) * QUALITY_PER_PAGE,
    safeQualityPage * QUALITY_PER_PAGE
  );

  // --- STATS CALCULATIONS ---
  const totalInspected = qualityInspections.length;
  const approvedCount = qualityInspections.filter(q => q.result === 'Aprobado').length;
  const rejectedCount = qualityInspections.filter(q => q.result === 'Rechazado').length;
  const warnCount = qualityInspections.filter(q => q.result === 'Observación').length;

  const successRate = totalInspected > 0 ? (approvedCount / totalInspected) * 100 : 100;
  
  // Pending orders waiting for inspection (e.g. status 'calidad' or status 'proceso')
  const pendingInspectionOrders = productionOrders.filter(
    po => po.status === 'proceso' || po.status === 'calidad'
  );

  return (
    <div className="space-y-6">
      
      {/* Banner de Cabecera */}
      <div className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-100'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-wider uppercase opacity-70">Aseguramiento & Inocuidad Alimentaria</span>
          </div>
          <h2 className="font-display font-extrabold text-xl tracking-tight text-slate-800">Control de Calidad e Inspecciones</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Monitoree la adherencia a estándares de horneado, niveles de humedad, temperatura de miga y tome decisiones inmediatas de retención en cuarentena o aprobación comercial.
          </p>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('audit')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <i className="ri-shield-user-line"></i> Evaluar Nueva Muestra
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Calidad */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
            <i className="ri-microscope-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inspecciones Totales</p>
            <p className="text-lg font-bold font-mono">{totalInspected} Muestras</p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <i className="ri-checkbox-circle-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tasa de Conformidad</p>
            <p className="text-lg font-bold font-mono text-emerald-500">{successRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-red-500/10 text-red-400 shrink-0">
            <i className="ri-close-circle-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lotes Rechazados</p>
            <p className="text-lg font-bold font-mono text-rose-500">{rejectedCount} No Conformes</p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
            <i className="ri-pause-circle-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">En Cola De Calidad</p>
            <p className="text-lg font-bold font-mono text-amber-400">{pendingInspectionOrders.length} OPs pendientes</p>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo */}
      <div className="flex border-b border-black/5 dark:border-white/5 pb-0.5 scrollbar-thin overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('log')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'log'
              ? 'border-blue-500 text-blue-500 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-survey-line mr-1.5 text-sm align-middle"></i>
          Registros y Bitácora
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'audit'
              ? 'border-blue-500 text-blue-500 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-test-tube-line mr-1.5 text-sm align-middle"></i>
          Laboratorio de Tolva / Nuevos Ensayos
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'analytics'
              ? 'border-blue-500 text-blue-500 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-pulse-line mr-1.5 text-sm align-middle"></i>
          Monitoreo de Desviación & Rango
        </button>
      </div>

      {/* TAB 1: LOGS AND HISTORY */}
      {activeTab === 'log' && (
        <div className="space-y-4 animate-fade-in text-xs font-sans">
          
          <div className={`p-5 border rounded-2xl shadow-sm space-y-4 ${activeTheme.cardStyles}`}>
            
            {/* Buscador y selectores de filtrado */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <i className="ri-search-line"></i>
                </span>
                <input
                  type="text"
                  placeholder="Buscar por lote, inspector o notas..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setQualityPage(1);
                  }}
                  className={`w-full font-semibold rounded-xl pl-9 pr-3 py-2 border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-700'
                  }`}
                />
              </div>

              <div className="flex gap-2 items-center w-full md:w-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Historial de:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setQualityPage(1);
                  }}
                  className={`border rounded-xl px-3 py-2 outline-none font-bold text-xs ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-150 text-slate-700'
                  }`}
                >
                  <option value="Todos">Todos los lotes</option>
                  <option value="Aprobado">Aprobado (Inocuo)</option>
                  <option value="Rechazado">Rechazado (No-Conforme)</option>
                  <option value="Observación">Observación técnica</option>
                </select>
              </div>
            </div>

            {/* TABLA DE AUDITORÍAS */}
            {filteredInspections.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium">
                <i className="ri-shield-line text-3xl block mb-2 opacity-55"></i>
                No se encontraron muestreos de calidad que apliquen al filtro activo.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[9px] font-bold uppercase tracking-wider ${
                      isDark ? 'border-zinc-850 text-slate-400' : 'border-slate-100 text-slate-400'
                    }`}>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Número Lote</th>
                      <th className="py-3 px-4">Parámetro Comprobado</th>
                      <th className="py-3 px-4 text-right">Resultado Medición</th>
                      <th className="py-3 px-4">Inspector a Cargo</th>
                      <th className="py-3 px-4">Detalles / Notas de Laboratorio</th>
                      <th className="py-3 px-4 text-center">Dictamen</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-[11px] ${
                    isDark ? 'divide-zinc-850 text-slate-300' : 'divide-slate-100 text-slate-700'
                  }`}>
                    {paginatedInspections.map((item) => {
                      let tagBg = '';
                      let tagText = '';
                      
                      if (item.result === 'Aprobado') {
                        tagBg = 'bg-emerald-500/10 border-emerald-500/20';
                        tagText = 'text-emerald-400';
                      } else if (item.result === 'Rechazado') {
                        tagBg = 'bg-rose-500/10 border-rose-500/20';
                        tagText = 'text-rose-400';
                      } else {
                        tagBg = 'bg-amber-500/10 border-amber-500/20';
                        tagText = 'text-amber-400';
                      }

                      return (
                        <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 font-mono">{item.date}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-100 block">{item.loteNumber}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-200 font-medium">{item.paramInspected}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-100 text-xs">{item.valueMeasured}</td>
                          <td className="py-3 px-4 font-bold text-slate-300">{item.inspector}</td>
                          <td className="py-3 px-4 text-slate-450 max-w-sm truncate" title={item.notes}>
                            {item.notes}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block border font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded ${tagBg} ${tagText}`}>
                              {item.result}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredInspections.length > 0 && (
              <Pagination
                currentPage={safeQualityPage}
                totalItems={filteredInspections.length}
                pageSize={QUALITY_PER_PAGE}
                onPageChange={(page) => setQualityPage(page)}
                isDark={isDark}
                itemLabel="muestreos de calidad"
              />
            )}

          </div>

        </div>
      )}

      {/* TAB 2: AUDIT / MEASURE REGISTRATION LAB */}
      {activeTab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-xs font-sans">
          
          {/* Audit setup and execution form */}
          <div className={`lg:col-span-1 p-5 border rounded-2xl shadow-sm space-y-4 h-fit ${activeTheme.cardStyles}`}>
            <h3 className="font-display font-bold text-sm tracking-tight border-b pb-2 flex items-center gap-1.5">
              <i className="ri-microscope-line text-blue-500"></i> Ensayo Técnico de Muestra
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orden para Auditar</label>
                <select
                  required
                  value={selectedOrderId}
                  onChange={(e) => handleOrderChange(e.target.value)}
                  className={`w-full font-semibold rounded-xl px-3 py-2.5 border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-700'
                  }`}
                >
                  <option value="">-- Elija una OP en proceso --</option>
                  {pendingInspectionOrders.map(po => {
                    const prod = getProductByBomId(po.bomId);
                    return (
                      <option key={po.id} value={po.id}>
                        {po.orderNumber} - {prod?.name} (Lote: {po.generatedLot || 'S/N'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {targetOrder && standards && (
                <>
                  <div className="space-y-1 bg-black/10 dark:bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Estándar de Receta BOM:</p>
                    <p className="font-bold text-xs text-blue-400">{standards.param}</p>
                    
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-semibold mt-2 pt-2 border-t border-white/5">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-medium">Mín. Tolerable</span>
                        <span className="font-mono text-slate-200">{(standards.target - standards.tolerance).toFixed(2)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-slate-400 text-[10px] block font-medium">Ideal Objetivo</span>
                        <span className="font-mono text-emerald-400 font-bold">{standards.target.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block font-medium">Máx. Tolerable</span>
                        <span className="font-mono text-slate-200">{(standards.target + standards.tolerance).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Measured Value Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Valor Medido por el Instrumento
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={measuredValue}
                        onChange={(e) => setMeasuredValue(Number(e.target.value))}
                        className={`w-full font-mono font-bold rounded-xl pl-3 pr-10 py-2.5 border outline-none ${
                          isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-800'
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold opacity-60">UN</span>
                    </div>

                    {/* Quick increment buttons */}
                    <div className="flex gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => setMeasuredValue(prev => Number((prev - 0.1).toFixed(2)))}
                        className="bg-black/20 text-slate-300 hover:bg-black/30 font-bold px-2 py-1 rounded font-mono text-[10px]"
                      >
                        -0.1
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeasuredValue(standards.target)}
                        className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold px-2.5 py-1 rounded text-[10px]"
                      >
                        Ideal ({standards.target})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeasuredValue(prev => Number((prev + 0.1).toFixed(2)))}
                        className="bg-black/20 text-slate-300 hover:bg-black/30 font-bold px-2 py-1 rounded font-mono text-[10px]"
                      >
                        +0.1
                      </button>
                    </div>
                  </div>

                  {/* Real-time assessment warning display */}
                  <div className={`p-3 rounded-xl border font-semibold flex items-center gap-2 ${
                    liveResult === 'Aprobado' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : liveResult === 'Observación'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-red-500/10 border-red-500/20 text-rose-400 animate-pulse'
                  }`}>
                    <i className={liveResult === 'Aprobado' ? 'ri-checkbox-circle-line text-lg' : 'ri-alert-line text-lg'}></i>
                    <div>
                      <p className="text-[10px] uppercase font-black">Dictamen Estimado:</p>
                      <p className="text-xs font-bold leading-none">{liveResult} {liveResult === 'Aprobado' ? '(Conforme)' : '(Fuera de Rango Estándar)'}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inspector Analista</label>
                    <input
                      type="text"
                      required
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      className={`w-full font-bold rounded-xl px-3 py-2 border outline-none ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-800'
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notas de Desviación o Conformidad</label>
                    <textarea
                      rows={2}
                      value={auditNotes}
                      placeholder="Indique detalles de textura, color, aroma u observaciones técnicas..."
                      onChange={(e) => setAuditNotes(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 border outline-none ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-700'
                      }`}
                    />
                  </div>

                  {/* Transition order option */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Siguiente Estado de la OP</label>
                    <select
                      value={afterAuditStatus}
                      onChange={(e) => setAfterAuditStatus(e.target.value as any)}
                      className={`w-full font-semibold rounded-xl px-3 py-2.5 border outline-none ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-700'
                      }`}
                    >
                      <option value="completada">Liberar Lote (Completada & Enviar Almacén)</option>
                      <option value="empaque">Enviar a Empaque Final (Fase Empaque)</option>
                      <option value="calidad">Retener Inspección en Cuarentena (Fase Calidad)</option>
                      <option value="rechazada">Descartar Lote Inmediato (Rechazada / Scrap)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 italic">Si el dictamen es Rechazado, el sistema forzará el estado como Rechazada para evitar contaminar la bodega.</p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <i className="ri-save-line"></i> Guardar Dictamen en Bitácora
                  </button>
                </>
              )}

              {!targetOrder && (
                <div className="py-12 border border-dashed rounded-xl text-center text-slate-400 font-semibold space-y-2">
                  <i className="ri-inbox-line text-2xl block opacity-40"></i>
                  <span>Elija una OP de la lista superior para cargar la receta y configurar la muestra.</span>
                </div>
              )}

            </form>
          </div>

          {/* Visual reference gauge information for operator instructions */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Visual simulation of the active gauge */}
            {targetOrder && standards && (
              <div className={`p-6 border rounded-2xl shadow-sm space-y-5 ${activeTheme.cardStyles}`}>
                <div>
                  <h3 className="font-display font-semibold text-base text-slate-100">Indicador Gráfico de Tolerancia</h3>
                  <p className="text-xs text-slate-400">Posición de la muestra actual respecto a los límites de control superior e inferior (SPC)</p>
                </div>

                {/* Range Bar */}
                <div className="space-y-3 pt-4">
                  <div className="relative w-full h-4 rounded-full bg-gradient-to-r from-red-500 via-amber-500 via-emerald-500 via-amber-505 via-red-500 p-0.5">
                    
                    {/* Tick for Measured Value */}
                    {(() => {
                      // Calculate percentage placement
                      // Say left limit is target - 4*tolerance, right is target + 4*tolerance
                      const delta = standards.tolerance * 2.5;
                      const min = standards.target - delta;
                      const max = standards.target + delta;
                      const percent = Math.min(100, Math.max(0, ((measuredValue - min) / (max - min)) * 100));

                      return (
                        <div 
                          className="absolute -top-3 h-8 w-1.5 bg-white border border-slate-900 rounded shadow-md group transition-all duration-300"
                          style={{ left: `${percent}%` }}
                        >
                          <div className="absolute bottom-9 left-1/2 -translate-x-1/2 bg-slate-950 text-white font-bold px-2 py-1 rounded text-[10px] shadow-lg whitespace-nowrap opacity-100">
                            Medición: {measuredValue}
                          </div>
                        </div>
                      );
                    })()}

                  </div>

                  <div className="flex justify-between text-[11px] font-bold text-slate-400">
                    <span>Rechazo (Bajo)</span>
                    <span>Tolerancia (Mín)</span>
                    <span className="text-emerald-400 font-black">Ideal ({standards.target})</span>
                    <span>Tolerancia (Máx)</span>
                    <span>Rechazo (Alto)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 rounded-xl bg-orange-400/5 border border-orange-400/10 space-y-1.5">
                    <span className="font-black text-amber-500 uppercase text-[9px] tracking-wider block">Acciones Correctivas (Rechazo):</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Si la medición del lote sale de la banda de tolerancia:
                      <br/>1. Notificar inmediatamente al supervisor de planta.
                      <br/>2. Detener la tolva de alimentación o ajustar la temperatura de los hornos.
                      <br/>3. Almacenar el lote con etiqueta roja física de NO CONFORME en zona aislada.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-1.5">
                    <span className="font-black text-blue-400 uppercase text-[9px] tracking-wider block">Estándares Técnicos Pre-Cargados:</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      El sistema ERP toma en tiempo real el BOM formulado. Cada lote conserva la trazabilidad completa del operario supervisor, la fecha horaria de horneo y los resultados de laboratorio para auditorías del INVIMA / HACCP.
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* List of orders pending quality control */}
            <div className={`p-5 border rounded-2xl shadow-sm space-y-4 ${activeTheme.cardStyles}`}>
              <h3 className="font-display font-semibold text-base">Lotes en Espera de Dictamen de Calidad</h3>
              
              {pendingInspectionOrders.length === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  No hay lotes acumulados esperando inspección. Toda la planta está al día.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingInspectionOrders.map(po => {
                    const prod = getProductByBomId(po.bomId);
                    const isUrgent = po.status === 'calidad';

                    return (
                      <div 
                        key={po.id}
                        onClick={() => handleOrderChange(po.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] ${
                          selectedOrderId === po.id
                            ? 'bg-blue-600/10 border-blue-500/40 text-blue-400'
                            : isUrgent
                              ? 'bg-amber-500/5 border-amber-500/20 text-amber-500'
                              : 'bg-zinc-950/20 border-zinc-800/60 text-slate-300'
                        }`}
                      >
                        <div>
                          <strong className="text-xs font-bold block">{po.orderNumber}</strong>
                          <span className="text-[11px] block truncate font-medium text-slate-300">{prod?.name || 'Receta de Pan'}</span>
                          <span className="text-[9px] font-mono block opacity-60">ID OP: {po.id.substring(3,8)}.. | {po.quantity} Unds</span>
                        </div>

                        <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                          isUrgent ? 'bg-amber-500/12 text-amber-500' : 'bg-blue-500/10 text-blue-450'
                        }`}>
                          {isUrgent ? 'Analizar OP' : po.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: SPC ANALYTICS & RANGE DEVIATION */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in text-xs font-sans">
          
          <div className={`p-5 border rounded-2xl shadow-sm space-y-4 ${activeTheme.cardStyles}`}>
            <h3 className="font-display font-semibold text-base border-b pb-2">Estadísticas e Histograma de Control de Calidad</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-black/10 p-4 border border-white/5 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tasa de Aprobación Global</span>
                <p className="text-3xl font-bold font-mono text-emerald-400">{successRate.toFixed(1)}%</p>
                <p className="text-[10px] text-slate-450">Meta industrial: Mayor al 98.5% en turnos rotativos continuos.</p>
              </div>

              <div className="bg-black/10 p-4 border border-white/5 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Muestreos de Lote Totales</span>
                <p className="text-3xl font-bold font-mono text-blue-400">{totalInspected}</p>
                <p className="text-[10px] text-slate-455">Inspecciones de laboratorio registradas en Kardex.</p>
              </div>

              <div className="bg-black/10 p-4 border border-white/5 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">No-Conformidades Activas</span>
                <p className="text-3xl font-bold font-mono text-rose-500">{rejectedCount + warnCount}</p>
                <p className="text-[10px] text-slate-450">Lotes descartados o con observaciones técnicas en cuarentena.</p>
              </div>

            </div>

            {/* List devations */}
            <div>
              <h4 className="font-display font-semibold text-sm mb-3">Análisis de Desviación Estándar de Últimos Lotes</h4>
              
              {qualityInspections.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  No hay inspecciones previas para analizar tendencias de desviación.
                </div>
              ) : (
                <div className="space-y-2">
                  {qualityInspections.slice(-8).reverse().map((qi) => {
                    // Find standard to check distance
                    const matchingOrder = productionOrders.find(o => o.id === qi.productionOrderId);
                    const matchingBOM = matchingOrder ? boms.find(b => b.id === matchingOrder.bomId) : null;
                    const stdValue = matchingBOM?.standards?.target || 0;
                    const distance = qi.valueMeasured - stdValue;

                    let barColor = 'bg-slate-400';
                    if (qi.result === 'Aprobado') barColor = 'bg-emerald-500';
                    else if (qi.result === 'Observación') barColor = 'bg-amber-500';
                    else if (qi.result === 'Rechazado') barColor = 'bg-rose-500';

                    return (
                      <div key={qi.id} className="p-3 bg-black/10 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                        <div>
                          <strong className="block text-slate-200">{qi.loteNumber} ({qi.paramInspected})</strong>
                          <span className="text-[10px] text-slate-400">Inspector: {qi.inspector} | Fecha: {qi.date}</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-450 block font-bold">DESVIACIÓN NETO</span>
                            <span className={`font-mono font-black ${distance === 0 ? 'text-slate-400' : distance > 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                              {distance === 0 ? 'Óptimo' : (distance > 0 ? `+${distance.toFixed(2)}` : distance.toFixed(2))}
                            </span>
                          </div>

                          <span className={`font-bold text-[9px] uppercase px-2 py-0.5 rounded ${
                            qi.result === 'Aprobado' ? 'bg-emerald-500/10 text-emerald-450' : 'bg-rose-500/12 text-rose-450'
                          }`}>
                            {qi.result}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

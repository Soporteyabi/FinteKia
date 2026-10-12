import React, { useState } from 'react';
import { TechServiceOrder, Product, Company, TechServicePartItem, TechServiceTimelineEvent } from '../types';
import { 
  X, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Smartphone, 
  FileText, 
  Save, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Tag, 
  Laptop, 
  User, 
  AlertCircle,
  Cpu,
  Boxes
} from 'lucide-react';
import { WORKSHOP_STATUS_CONFIG, buildWhatsAppServiceNotification, getWhatsAppPhoneLink } from '../lib/techServiceUtils';

interface TechOrderDetailModalProps {
  order: TechServiceOrder;
  products: Product[];
  company: Company;
  onClose: () => void;
  onSave: (updatedOrder: TechServiceOrder) => void;
  onPrint: (order: TechServiceOrder) => void;
  onInvoice: (order: TechServiceOrder) => void;
  formatCOP: (v: number) => string;
}

export default function TechOrderDetailModal({
  order,
  products,
  company,
  onClose,
  onSave,
  onPrint,
  onInvoice,
  formatCOP
}: TechOrderDetailModalProps) {
  // Local state for editing order fields
  const [status, setStatus] = useState<TechServiceOrder['status']>(order.status);
  const [priority, setPriority] = useState<TechServiceOrder['priority']>(order.priority);
  const [technician, setTechnician] = useState(order.technician || 'Washington Quiñones');
  const [diagnosis, setDiagnosis] = useState(order.diagnosis || '');
  const [solutionApplied, setSolutionApplied] = useState(order.solutionApplied || '');
  const [reportedIssue, setReportedIssue] = useState(order.reportedIssue || '');
  const [accessoriesReceived, setAccessoriesReceived] = useState(order.accessoriesReceived || '');
  const [physicalCondition, setPhysicalCondition] = useState(order.physicalCondition || '');
  const [devicePassword, setDevicePassword] = useState(order.devicePassword || '');
  const [warrantyDays, setWarrantyDays] = useState(order.warrantyDays || 30);
  const [notes, setNotes] = useState(order.notes || '');
  const [deliveryNotes, setDeliveryNotes] = useState(order.deliveryNotes || '');

  // Costs and Parts
  const [laborCost, setLaborCost] = useState(order.laborCost || 0);
  const [partsUsed, setPartsUsed] = useState<TechServicePartItem[]>(order.partsUsed || []);

  // New part inputs
  const [selectedProductId, setSelectedProductId] = useState('');
  const [manualPartName, setManualPartName] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partPrice, setPartPrice] = useState(0);

  // Timeline
  const [timeline, setTimeline] = useState<TechServiceTimelineEvent[]>(order.timeline || []);
  const [newLogNote, setNewLogNote] = useState('');

  // Active sub-tab inside the modal
  const [tab, setTab] = useState<'general' | 'diagnostico' | 'repuestos' | 'bitacora'>('general');

  // Repuestos / Hardware products available in catalog
  const catalogParts = products.filter(p => p.type === 'tecnologia' || p.type === 'materia_prima');

  // Calculate totals
  const partsSubtotal = partsUsed.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
  const finalCalculatedCost = partsSubtotal + laborCost;

  // Add Part
  const handleAddPart = () => {
    let name = manualPartName.trim();
    let unitPrice = Number(partPrice) || 0;
    let prodId: string | undefined = undefined;

    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) {
        name = prod.name;
        unitPrice = prod.price || unitPrice;
        prodId = prod.id;
      }
    }

    if (!name) return;

    const newPart: TechServicePartItem = {
      id: `part-${Date.now()}`,
      productId: prodId,
      name,
      quantity: Number(partQty) || 1,
      unitPrice
    };

    setPartsUsed(prev => [...prev, newPart]);
    setSelectedProductId('');
    setManualPartName('');
    setPartQty(1);
    setPartPrice(0);
  };

  // Remove Part
  const handleRemovePart = (partId: string) => {
    setPartsUsed(prev => prev.filter(p => p.id !== partId));
  };

  // Add Timeline Entry
  const handleAddTimelineEntry = () => {
    if (!newLogNote.trim()) return;

    const newEntry: TechServiceTimelineEvent = {
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: WORKSHOP_STATUS_CONFIG[status]?.label || status,
      note: newLogNote.trim(),
      user: technician || 'Washington Quiñones'
    };

    setTimeline(prev => [newEntry, ...prev]);
    setNewLogNote('');
  };

  // Save handler
  const handleSave = () => {
    const updatedOrder: TechServiceOrder = {
      ...order,
      status,
      priority,
      technician,
      diagnosis,
      solutionApplied,
      reportedIssue,
      accessoriesReceived,
      physicalCondition,
      devicePassword,
      warrantyDays,
      laborCost,
      partsUsed,
      finalCost: finalCalculatedCost > 0 ? finalCalculatedCost : order.estimatedCost,
      notes,
      deliveryNotes,
      timeline,
      deliveryDate: (status === 'completado' || status === 'entregado') && !order.deliveryDate 
        ? new Date().toISOString().substring(0, 10) 
        : order.deliveryDate
    };

    onSave(updatedOrder);
  };

  const statusInfo = WORKSHOP_STATUS_CONFIG[status] || { label: status, color: 'text-slate-300' };
  const whatsappMessage = buildWhatsAppServiceNotification({ ...order, status, finalCost: finalCalculatedCost }, company, formatCOP);
  const whatsappUrl = getWhatsAppPhoneLink(order.clientPhone, whatsappMessage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* HEADER BAR */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shadow-inner">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                  {order.code}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                  {statusInfo.label}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">
                {order.device}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrint({ ...order, status, diagnosis, solutionApplied, partsUsed, laborCost, finalCost: finalCalculatedCost })}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Imprimir Comprobante de Entrada o Acta de Entrega"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {order.clientPhone && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                title="Notificar por WhatsApp"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}

            <button
              onClick={() => onInvoice(order)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Facturar orden en Facturación Electrónica"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Facturar</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WORKSHOP STATUS PROGRESS STEPPER */}
        <div className="bg-slate-950/60 px-4 sm:px-6 py-2.5 border-b border-slate-800 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[580px] gap-2 text-[11px]">
            {(['recibido', 'en_diagnostico', 'esperando_repuesto', 'en_proceso', 'completado', 'entregado'] as const).map((st, idx) => {
              const cfg = WORKSHOP_STATUS_CONFIG[st];
              const isCurrent = status === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all font-semibold cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-sky-400/50'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-black/40 text-[9.5px] font-mono flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SUBTABS BAR */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-slate-800 bg-slate-900">
          <button
            onClick={() => setTab('general')}
            className={`px-3 py-1.5 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'general'
                ? 'border-sky-400 text-sky-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Datos del Equipo & Cliente
          </button>
          <button
            onClick={() => setTab('diagnostico')}
            className={`px-3 py-1.5 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'diagnostico'
                ? 'border-sky-400 text-sky-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Diagnóstico & Solución
          </button>
          <button
            onClick={() => setTab('repuestos')}
            className={`px-3 py-1.5 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'repuestos'
                ? 'border-sky-400 text-sky-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>3. Repuestos & Costos</span>
            {partsUsed.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-300 font-mono">
                {partsUsed.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('bitacora')}
            className={`px-3 py-1.5 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'bitacora'
                ? 'border-sky-400 text-sky-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>4. Bitácora de Taller</span>
            {timeline.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-mono">
                {timeline.length}
              </span>
            )}
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {/* ======================================================== */}
          {/* TAB 1: GENERAL INFO                                      */}
          {/* ======================================================== */}
          {tab === 'general' && (
            <div className="space-y-4">
              {/* Client & Device Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
                    <span className="flex items-center gap-1 font-bold uppercase text-sky-400">
                      <User className="w-3.5 h-3.5" />
                      <span>Propietario / Cliente</span>
                    </span>
                    <span>ID: {order.clientId}</span>
                  </div>
                  <p className="text-sm font-bold text-white">{order.clientName}</p>
                  <div className="text-slate-300 space-y-0.5 text-[11.5px]">
                    <p>Teléfono: <strong>{order.clientPhone || 'No registrado'}</strong></p>
                    {order.clientEmail && <p>Email: {order.clientEmail}</p>}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
                    <span className="flex items-center gap-1 font-bold uppercase text-sky-400">
                      <Laptop className="w-3.5 h-3.5" />
                      <span>Dispositivo en Taller</span>
                    </span>
                    {order.serial && <span>S/N: {order.serial}</span>}
                  </div>
                  <p className="text-sm font-bold text-white">{order.device}</p>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11.5px]">
                    <p>Marca: <strong>{order.brand || 'N/A'}</strong></p>
                    <p>Modelo: <strong>{order.model || 'N/A'}</strong></p>
                  </div>
                </div>
              </div>

              {/* Editable Reception Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Accesorios Dejados en Custodia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Cargador original 65W, estuche, cable de poder..."
                    value={accessoriesReceived}
                    onChange={(e) => setAccessoriesReceived(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Estado Físico / Estético al Recibir
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Pantalla intacta, leves rayones en tapa, tornillos completos..."
                    value={physicalCondition}
                    onChange={(e) => setPhysicalCondition(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Clave / PIN de Acceso para Pruebas
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. PIN: 1234 o Sin clave"
                    value={devicePassword}
                    onChange={(e) => setDevicePassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Técnico Responsable
                  </label>
                  <input
                    type="text"
                    value={technician}
                    onChange={(e) => setTechnician(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-sky-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Prioridad de Atención
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-sky-400 outline-none"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Falla Reportada por el Cliente
                </label>
                <textarea
                  rows={2}
                  value={reportedIssue}
                  onChange={(e) => setReportedIssue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: DIAGNÓSTICO & SOLUCIÓN                            */}
          {/* ======================================================== */}
          {tab === 'diagnostico' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                  <span>Diagnóstico Técnico de Laboratorio</span>
                  <span className="text-[10px] text-slate-400">Describe hallazgos de hardware/software</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalla las pruebas realizadas, voltajes medidos, estado de memoria, disco o placa..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                  <span>Trabajo Efectuado / Solución Aplicada</span>
                  <span className="text-[10px] text-slate-400">Se imprimirá en el Acta de Entrega</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe la reparación ejecutada, pasta térmica aplicada, piezas sustituidas o reinstalaciones..."
                  value={solutionApplied}
                  onChange={(e) => setSolutionApplied(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Garantía del Servicio (Días Calendario)
                  </label>
                  <select
                    value={warrantyDays}
                    onChange={(e) => setWarrantyDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-sky-400 outline-none font-mono"
                  >
                    <option value={15}>15 Días</option>
                    <option value={30}>30 Días (1 Mes)</option>
                    <option value={60}>60 Días (2 Meses)</option>
                    <option value={90}>90 Días (3 Meses)</option>
                    <option value={180}>180 Días (6 Meses)</option>
                    <option value={365}>365 Días (1 Año)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Observaciones y Recomendaciones al Cliente
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Usar regulador de voltaje, evitar líquidos cerca del teclado..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-sky-400 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: REPUESTOS & COSTOS                                */}
          {/* ======================================================== */}
          {tab === 'repuestos' && (
            <div className="space-y-4">
              {/* Add Part Form */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 block">
                  Agregar Repuesto o Insumo Instalado
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[10.5px] text-slate-400 mb-1">Seleccionar de Catálogo o Ingresar Nombre</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedProductId(val);
                        if (val) {
                          const p = products.find(item => item.id === val);
                          if (p) {
                            setManualPartName(p.name);
                            setPartPrice(p.price);
                          }
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-sky-400"
                    >
                      <option value="">-- Repuestos disponibles en inventario --</option>
                      {catalogParts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({formatCOP(p.price)})</option>
                      ))}
                    </select>
                    {!selectedProductId && (
                      <input
                        type="text"
                        placeholder="O escribe el repuesto manualmente..."
                        value={manualPartName}
                        onChange={(e) => setManualPartName(e.target.value)}
                        className="w-full px-2.5 py-1.5 mt-1 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-400 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={partQty}
                      onChange={(e) => setPartQty(Math.max(1, Number(e.target.value)))}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-400 mb-1">Precio Unitario (COP)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        value={partPrice}
                        onChange={(e) => setPartPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddPart}
                        className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition-all cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parts Table */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-mono">
                    <tr>
                      <th className="py-2 px-3">Repuesto / Insumo</th>
                      <th className="py-2 px-3 text-center">Cant.</th>
                      <th className="py-2 px-3 text-right">V. Unitario</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                      <th className="py-2 px-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-sans">
                    {partsUsed.map(p => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 text-white font-medium">{p.name}</td>
                        <td className="py-2 px-3 text-center font-mono text-slate-300">{p.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">{formatCOP(p.unitPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                          {formatCOP(p.quantity * p.unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePart(p.id)}
                            className="text-rose-400 hover:text-rose-300 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {partsUsed.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-500 italic">
                          No se han registrado repuestos instalados para esta orden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Cost liquidation card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="block text-slate-300 font-bold">
                    Costo de Mano de Obra / Honorarios Técnicos (COP)
                  </label>
                  <input
                    type="number"
                    value={laborCost}
                    onChange={(e) => setLaborCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm outline-none focus:border-sky-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    Tarifa de diagnóstico, mantenimiento preventivo o correctivo.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal Repuestos:</span>
                      <span className="font-mono text-white">{formatCOP(partsSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Mano de Obra:</span>
                      <span className="font-mono text-white">{formatCOP(laborCost)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="font-bold text-white text-sm">TOTAL LIQUIDADO:</span>
                    <span className="font-mono font-black text-lg text-emerald-400">
                      {formatCOP(finalCalculatedCost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: BITÁCORA DE TALLER                                */}
          {/* ======================================================== */}
          {tab === 'bitacora' && (
            <div className="space-y-4">
              {/* Add Note Bar */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Escribe una observación de avance para la bitácora (ej. Pruebas térmicas OK, cambio de flex)..."
                  value={newLogNote}
                  onChange={(e) => setNewLogNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTimelineEntry()}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:border-sky-400 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTimelineEntry}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Registro</span>
                </button>
              </div>

              {/* Timeline List */}
              <div className="space-y-2.5">
                {timeline.map((event, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-sky-300">{event.status}</span>
                        <span className="font-mono text-slate-500">{event.date}</span>
                      </div>
                      <p className="text-slate-200 text-xs leading-relaxed">{event.note}</p>
                      {event.user && (
                        <p className="text-[10px] text-slate-500 font-medium">Por: {event.user}</p>
                      )}
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && (
                  <div className="p-6 text-center text-slate-500 italic bg-slate-950/40 rounded-xl border border-slate-800">
                    No hay entradas registradas en la bitácora de esta orden aún.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Total Estimado/Final: <strong className="text-emerald-400 font-mono">{formatCOP(finalCalculatedCost || order.estimatedCost)}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-white hover:to-sky-400 text-slate-950 font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

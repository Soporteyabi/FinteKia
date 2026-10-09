import React, { useState, useEffect } from 'react';
import { ProductionOrder, Product, BOM, BOMItem } from '../types';
import { 
  CheckCircle2, 
  Play, 
  Hourglass, 
  Gauge, 
  Layers, 
  Scale, 
  ClipboardCheck, 
  PlusCircle, 
  Clock, 
  Thermometer, 
  FileText, 
  Activity, 
  Wrench,
  AlertTriangle
} from 'lucide-react';

interface KioskViewProps {
  productionOrders: ProductionOrder[];
  products: Product[];
  boms: BOM[];
  updateOrderStatus: (id: string, newStatus: ProductionOrder['status']) => void;
}

interface InteractiveNote {
  id: string;
  timestamp: string;
  category: 'Sistema' | 'Avería' | 'Mantenimiento' | 'Ajuste';
  message: string;
  operator: string;
}

export default function KioskView({ productionOrders, products, boms, updateOrderStatus }: KioskViewProps) {
  // State
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<ProductionOrder | null>(null);
  const [systemTime, setSystemTime] = useState(new Date());
  
  // Interactive recipe scaling checkmarks
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  
  // Interactive plant measurements (HACCP)
  const [measuredTemp, setMeasuredTemp] = useState<number>(24.8);
  const [measuredMoisture, setMeasuredMoisture] = useState<number>(79);
  const [runDurationMin, setRunDurationMin] = useState<number>(12);
  const [yieldObserved, setYieldObserved] = useState<number>(100);
  const [lotLogText, setLotLogText] = useState<string>('');

  // Local state for operator industrial notifications
  const [localNotes, setLocalNotes] = useState<InteractiveNote[]>([
    { id: '1', timestamp: '13:02', category: 'Sistema', message: 'Limpieza de tolva B completada por sanidad.', operator: 'Carlos Mario Bedoya' },
    { id: '2', timestamp: '11:45', category: 'Mantenimiento', message: 'Calibración de báscula digital de precisión ±1g efectuada.', operator: 'Supervisor de Turno' },
  ]);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteCat, setNewNoteCat] = useState<'Ajuste' | 'Avería' | 'Mantenimiento'>('Ajuste');

  // Simulated Timer state for the physical mixing process
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Sync state if any order gets updated or selected
  const activeOrdersInPlanta = productionOrders.filter(
    (o) => o.status === 'pendiente' || o.status === 'proceso'
  );

  // Auto ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mixing stopwatch simulation
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Handle active status switching
  const handleStartTask = (order: ProductionOrder) => {
    updateOrderStatus(order.id, 'proceso');
    
    // Set active states
    const enhancedOrder = { ...order, status: 'proceso' as const };
    setActiveTaskId(order.id);
    setActiveTask(enhancedOrder);
    
    // Reset wizard values for new production run
    setCheckedIngredients({});
    setIsTimerRunning(true);
    setElapsedSeconds(0);
    setYieldObserved(order.quantity);
    setLotLogText('');
    
    // Default temperature targets on mount selection
    setMeasuredTemp(23.5 + Math.random() * 3);
    setMeasuredMoisture(76 + Math.floor(Math.random() * 8));
  };

  const handleCompleteTask = (order: ProductionOrder) => {
    // Validate ingredients dosage checklist
    const currentBOM = boms.find((b) => b.id === order.bomId);
    const bItems = currentBOM?.items || [];
    const allChecked = bItems.every((item) => checkedIngredients[item.id]);

    if (bItems.length > 0 && !allChecked) {
      const confirmIncomplete = confirm(
        '⚠️ ATENCIÓN: No se han marcado todos los ingredientes como "Pesados/Dosificados".\n\n¿Desea registrar de todas formas el envío a Control de Calidad?'
      );
      if (!confirmIncomplete) return;
    }

    // Call state update
    updateOrderStatus(order.id, 'calidad');
    
    // Log final observation to the local monitor
    const timestampStr = new Date().toTimeString().substring(0, 5);
    const finishedProduct = products.find((p) => p.id === currentBOM?.finishedProductId);
    const prodName = finishedProduct ? finishedProduct.name : 'Producto No Registrado';
    
    const finishLog: InteractiveNote = {
      id: `sys-${Date.now()}`,
      timestamp: timestampStr,
      category: 'Sistema',
      message: `Lote ${order.generatedLot || order.orderNumber} (${prodName}) de ${yieldObserved} Unid. enviado a Calidad con Temp: ${measuredTemp.toFixed(1)}°C, Humedad: ${measuredMoisture}%`,
      operator: 'Carlos Bedoya'
    };
    
    setLocalNotes((prev) => [finishLog, ...prev]);
    setIsTimerRunning(false);
    setActiveTaskId(null);
    setActiveTask(null);

    alert(`¡PROCESO COMPLETADO EXCELENTE!\n\nEl Lote ${order.generatedLot || order.orderNumber} ha sido reportado en el software de producción y bloqueado temporalmente. Se encuentra en cola de Control de Calidad (HACCP) para inspección física y posterior empaque.`);
  };

  const toggleIngredientCheck = (itemId: string) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleAddLocalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const timeStr = new Date().toTimeString().substring(0, 5);
    const newNote: InteractiveNote = {
      id: `usr-note-${Date.now()}`,
      timestamp: timeStr,
      category: newNoteCat,
      message: newNoteText.trim(),
      operator: 'Carlos Mario Bedoya (Planta)'
    };

    setLocalNotes((prev) => [newNote, ...prev]);
    setNewNoteText('');
  };

  // Safe search and match definitions
  const activeBOM = activeTask ? boms.find((b) => b.id === activeTask.bomId) : null;
  const activeFinishedProduct = activeBOM ? products.find((p) => p.id === activeBOM.finishedProductId) : null;
  const activeBOMItems = activeBOM?.items || [];

  // Percentage calculations
  const totalWeightItems = activeBOMItems.length;
  const weightedCount = Object.values(checkedIngredients).filter(Boolean).length;
  const dosagePercent = totalWeightItems > 0 ? Math.round((weightedCount / totalWeightItems) * 100) : 0;

  // Format COP Helper
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Kiosk Mode Header: Premium dark tactile look with dynamic indicators */}
      <div className="bg-slate-950 border-2 border-amber-500 rounded-2xl shadow-xl overflow-hidden text-white">
        <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-slate-100 tracking-wider text-base uppercase">Terminal de Planta (Kiosco Operario)</h2>
                <span className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black tracking-widest px-2 py-0.5 rounded uppercase">
                  Modo Industrial Estricto
                </span>
              </div>
              <p className="text-[10px] text-amber-400 font-bold tracking-widest uppercase flex items-center gap-1.5 mt-0.5">
                <span>Planta Mezclas & Horneado A01</span>
                <span>•</span>
                <span>Fórmula Digitalizada HACCP</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 self-end md:self-auto">
            {/* Clock */}
            <div className="text-right font-mono bg-zinc-900/80 border border-slate-800 px-3.5 py-1.5 rounded-xl">
              <p className="text-amber-500 font-bold text-xs tracking-wider flex items-center gap-1.5 justify-end">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                {systemTime.toLocaleTimeString()}
              </p>
              <p className="text-[8px] text-slate-450 uppercase font-bold mt-0.5">
                {systemTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg uppercase tracking-wider inline-block">
                Operario: Carlos Bedoya
              </span>
              <p className="text-[9px] text-slate-400 font-medium italic mt-1">Jefe de Panificación Industrial</p>
            </div>
          </div>
        </div>

        {/* Real-time plant metrics banner */}
        <div className="px-6 py-2.5 bg-zinc-900/60 border-t border-slate-800 flex flex-wrap gap-x-8 gap-y-1.5 text-[11px] font-bold text-slate-350">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Cola de Trabajo: <strong className="text-white font-black">{activeOrdersInPlanta.length} Lotes</strong></span>
          </div>
          <div>
            <span>Consumo Proyectado Harina: <span className="text-amber-400">124.5 kg</span> en Cola</span>
          </div>
          <div>
            <span>Estado Reciclaje Agua: <span className="text-emerald-400">98.2% Óptimo</span></span>
          </div>
          <div className="ml-auto hidden lg:block text-slate-550 text-[10px]">
            Servicio de Control de Batch: v2.8 (Conectado a PLC de Amasadora #1)
          </div>
        </div>
      </div>

      {/* Main Terminal Grid: Queues vs Operator console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Tasks queue sidebar (5 columns) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-755 rounded-2xl p-5 text-white space-y-4">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" /> Cola de Lotes Asignados ({activeOrdersInPlanta.length})
              </h3>
              <span className="text-[9px] text-slate-450 uppercase font-black font-mono">PRIORIDAD DE ORDEN</span>
            </div>

            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {activeOrdersInPlanta.map((order) => {
                const p = products.find((prod) => prod.id === boms.find((b) => b.id === order.bomId)?.finishedProductId);
                const isCurrent = activeTaskId === order.id;
                const isProcessing = order.status === 'proceso';
                
                return (
                  <div 
                    key={order.id} 
                    className={`p-3.5 rounded-xl border relative transition-all ${
                      isCurrent
                        ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/5 text-white'
                        : isProcessing
                        ? 'bg-emerald-950/10 border-emerald-500/40 text-slate-200'
                        : 'bg-zinc-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    {/* Corner Tag */}
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-[10px] font-extrabold text-amber-400/90 bg-amber-400/5 px-2 py-0.5 rounded-md border border-amber-400/10">
                        {order.orderNumber}
                      </span>
                      
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950'
                          : isProcessing
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-350'
                      }`}>
                        {isCurrent ? 'Estación Activa' : isProcessing ? 'En Proceso' : 'Pendiente'}
                      </span>
                    </div>

                    <h4 className="font-display font-black text-xs text-slate-100 uppercase tracking-tight">
                      {p ? p.name : 'Ingrediente No Asignado'}
                    </h4>

                    {/* Meta row */}
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                      <div>
                        <span className="text-slate-500 uppercase block font-bold text-[8px]">Cantidad Lote:</span>
                        <span className="font-bold text-slate-200">{order.quantity} Unidades</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase block font-bold text-[8px]">Límite Línea:</span>
                        <span className="font-bold text-slate-250">{order.dueDate}</span>
                      </div>
                    </div>

                    {/* Interactive Button */}
                    <div className="mt-3 flex justify-end gap-2 text-xs">
                      {isCurrent ? (
                        <div className="text-[10px] font-black text-amber-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                          En Pantalla Principal
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartTask(order)}
                          className={`w-full text-center py-2.5 rounded-lg text-[10px] font-black tracking-wider uppercase cursor-pointer transition-all ${
                            isProcessing
                              ? 'bg-zinc-800 text-slate-200 hover:bg-zinc-700'
                              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
                          }`}
                        >
                          <i className="ri-play-circle-line mr-1 text-xs"></i> Iniciar Lote en Consola
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {activeOrdersInPlanta.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs italic">
                  <Activity className="w-8 h-8 mx-auto opacity-10 mb-2" />
                  No existen lotes asignados para producción en este turno.
                </div>
              )}
            </div>

            {/* Quick action: Create mock manual OP to test kiosk */}
            <div className="pt-3 border-t border-slate-800">
              <p className="text-[10px] text-slate-550 leading-relaxed italic">
                * Para enlistar nuevas órdenes de fabricación, configúrelas primero en la pestaña principal de <strong>Suministro & Órdenes de Producción (MRP)</strong>.
              </p>
            </div>

          </div>
        </div>

        {/* Right Side: Tactile Operator Console (8 columns) */}
        <div className="lg:col-span-8 space-y-4">
          
          {activeTask ? (
            <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-xl overflow-hidden self-start">
              
              {/* Task Header: Visual Active status banner */}
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 flex justify-between items-center text-slate-950">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black bg-slate-950 text-amber-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    OPERACIÓN INTENSIVA ACTIVA
                  </span>
                  <h3 className="font-display font-black text-sm uppercase tracking-tight text-slate-950 mt-1">
                    Lote Proyectado: {activeTask.generatedLot || 'L_AUTO_M1'} ({activeTask.orderNumber})
                  </h3>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-black bg-slate-950 text-white px-3 py-1 rounded-xl">
                    Meta: {activeTask.quantity} Unidades
                  </span>
                </div>
              </div>

              {/* Console Body */}
              <div className="p-5 space-y-6 text-white text-xs">

                {/* Product Name Display Card */}
                <div className="bg-zinc-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block">Receta de Producto Terminado</span>
                    <h4 className="text-base font-black text-white uppercase tracking-tight">
                      {activeFinishedProduct ? activeFinishedProduct.name : 'Industrial Standard Batch'}
                    </h4>
                    <p className="text-[10px] text-slate-450">
                      ID Fórmula: <strong className="font-mono text-slate-300">{activeTask.bomId}</strong> (Versión {activeBOM?.version || 'V-1.0'})
                    </p>
                  </div>
                  
                  <div className="h-10 w-px bg-slate-800"></div>

                  <div className="text-right space-y-1">
                    <span className="text-[8px] font-black text-slate-450 uppercase tracking-widest block">Tiempo de Mezcla Objetivo</span>
                    <span className="font-mono text-base font-bold text-amber-400">{runDurationMin} Minutos</span>
                  </div>
                </div>

                {/* STEP 1: INTERACTIVE MATERIAL DOSAGE SCALE */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                    <div>
                      <h4 className="font-black text-xs text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-amber-500" /> PASO 1: Control de Pesaje, Dosificación y Alimentación de Tolva
                      </h4>
                      <p className="text-[10px] text-slate-450">
                        Pese y verifique con el sensor de la báscula los insumos para {activeTask.quantity} unidades.
                      </p>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-[10.5px] font-bold text-amber-400">{dosagePercent}% Pesado</span>
                    </div>
                  </div>

                  {/* Progress Bar for Ingredients Dosage Checkboxes */}
                  <div className="w-full h-2.5 bg-zinc-950 border border-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full transition-all duration-300" 
                      style={{ width: `${dosagePercent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1.5">
                    {activeBOMItems.map((item) => {
                      // Lookup raw material info
                      const rawMat = products.find((p) => p.id === item.productId);
                      const isChecked = !!checkedIngredients[item.id];
                      
                      // Calculate proportional quantity based on dynamic order batch sizing
                      // If target quantity is not specified, assume 1
                      const rawQtyUnit = item.quantity;
                      const calculatedTotalRequired = rawQtyUnit * activeTask.quantity;

                      // Decide units: typically kg, g, cc etc
                      const defaultUnit = rawMat?.type === 'terminado' ? 'unidades' : 'kg';

                      return (
                        <div 
                          key={item.id}
                          onClick={() => toggleIngredientCheck(item.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                            isChecked
                              ? 'bg-emerald-950/20 border-emerald-500/80'
                              : 'bg-zinc-950/60 border-slate-850 hover:bg-zinc-900'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-[10px] text-slate-100 block truncate max-w-[200px]">
                              {rawMat ? rawMat.name : `Ingrediente-ID: ${item.productId.substring(0,6)}`}
                            </span>
                            <p className="text-[10px] text-slate-450 font-medium">
                              Pesaje Requerido: <strong className="font-mono text-amber-400 text-[10.5px]">{calculatedTotalRequired.toFixed(3)} {defaultUnit}</strong>
                            </p>
                            <p className="text-[8px] text-slate-500">
                              (Base: {rawQtyUnit} por unidad)
                            </p>
                          </div>

                          {/* Big tactile check */}
                          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'border-slate-800 text-transparent'
                          }`}>
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        </div>
                      );
                    })}

                    {activeBOMItems.length === 0 && (
                      <div className="p-4 bg-zinc-950 border border-dashed border-slate-800 rounded-xl text-center col-span-2 text-slate-450">
                        Esta fórmula no contiene ingredientes materias primas anexadas. Presione completar directamente.
                      </div>
                    )}
                  </div>
                </div>

                {/* SIMULATION TIMER PROCESS */}
                <div className="bg-zinc-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-slate-200 uppercase tracking-wide flex items-center gap-1">
                      <Hourglass className="w-4 h-4 text-amber-500" /> Cronómetro de Amasadora / Horneor
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        type="button"
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase cursor-pointer transition-all ${
                          isTimerRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
                        }`}
                      >
                        {isTimerRunning ? 'Pausar Mixing' : 'Reanudar Mixing'}
                      </button>
                    </div>
                  </div>

                  {/* Mixing Progress timer */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end text-[10px] text-slate-400">
                      <span>Ciclo de Mezcladora en curso...</span>
                      <span className="font-mono text-amber-400 font-extrabold">
                        {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s / {runDurationMin}m 00s
                      </span>
                    </div>

                    <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
                      <div 
                        className="bg-sky-500 h-full transition-all duration-1000 animate-pulse"
                        style={{ width: `${Math.min(100, (elapsedSeconds / (runDurationMin * 60)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-500 italic block">
                    * El PLC envía señales de agitación cada 10 segundos. Si el cronómetro llega al objetivo, sonará el timbre de descarga de tolva física.
                  </p>
                </div>

                {/* STEP 2: HACCP PHYSICAL PLANT PARAMETERS */}
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-2">
                    <h4 className="font-black text-xs text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                      <ClipboardCheck className="w-4 h-4 text-amber-500" /> PASO 2: Control Crítico de Calidad DIAN & HACCP (Mediciones en Línea)
                    </h4>
                    <p className="text-[10px] text-slate-450">
                      Configure y certifique las mediciones de los sensores de planta física recopiladas durante esta molienda.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    
                    {/* Temperature slider */}
                    <div className="bg-zinc-950/60 p-3.5 border border-slate-850 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 uppercase font-bold flex items-center gap-1">
                          <Thermometer className="w-3.5 h-3.5 text-amber-550" /> Temp Masa
                        </span>
                        <span className="font-mono font-black text-amber-400 text-[11px]">{measuredTemp.toFixed(1)} °C</span>
                      </div>
                      
                      <input 
                        type="range" 
                        min="20" 
                        max="30" 
                        step="0.1"
                        value={measuredTemp}
                        onChange={(e) => setMeasuredTemp(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-1 rounded-lg bg-slate-800"
                      />
                      
                      <div className="flex justify-between items-center text-[8px] text-slate-550">
                        <span>Min: 20°C</span>
                        <span className="text-emerald-500 font-bold">Ideal: 24.5°C</span>
                        <span>Max: 30°C</span>
                      </div>
                    </div>

                    {/* Moisture relative slider */}
                    <div className="bg-zinc-950/60 p-3.5 border border-slate-850 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 uppercase font-bold">💧 Humedad Cámara</span>
                        <span className="font-mono font-black text-amber-400 text-[11px]">{measuredMoisture} %</span>
                      </div>
                      
                      <input 
                        type="range" 
                        min="60" 
                        max="95" 
                        step="1"
                        value={measuredMoisture}
                        onChange={(e) => setMeasuredMoisture(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-1 rounded-lg bg-slate-800"
                      />
                      
                      <div className="flex justify-between items-center text-[8px] text-slate-550">
                        <span>Seco: 60%</span>
                        <span className="text-emerald-500 font-bold">Rango: 75-85%</span>
                        <span>Saturado: 95%</span>
                      </div>
                    </div>

                    {/* Dynamic realized yield units */}
                    <div className="bg-zinc-950/60 p-3.5 border border-slate-850 rounded-xl space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        📦 Rendimiento Logrado
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={yieldObserved}
                          onChange={(e) => setYieldObserved(Math.max(1, Number(e.target.value)))}
                          placeholder="Unidades"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono font-bold text-white outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] font-bold text-slate-450 uppercase shrink-0">unid.</span>
                      </div>

                      <p className="text-[8px] text-slate-500">
                        (Ajuste si hubo mermas, pérdidas o desperdicios)
                      </p>
                    </div>

                  </div>
                </div>

                {/* Lote notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase">Observación Interna del Lote (Incidencias Planta)</label>
                  <textarea
                    rows={2}
                    value={lotLogText}
                    onChange={(e) => setLotLogText(e.target.value)}
                    placeholder="Escriba aquí observaciones de gluten, consistencia de la mezcla, novedades del extrusor, etc..."
                    className="w-full bg-zinc-950 border border-slate-850 rounded-xl p-2.5 font-sans text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                {/* Action button */}
                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="leading-tight">
                      Confirmar el lote cambiará su estado a <strong className="text-indigo-400">Control de Calidad (Inspección)</strong> y descontará los insumos de inventario automáticamente.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCompleteTask(activeTask)}
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-550 hover:to-emerald-650 text-slate-950 font-black px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/20 transition-all shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Registrar Log Contable y Enviar a Calidad
                  </button>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-755 rounded-2xl p-12 text-center text-white space-y-6 flex flex-col items-center justify-center min-h-[480px]">
              
              <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-amber-500/30 flex items-center justify-center shadow-inner">
                <Layers className="w-8 h-8 text-amber-500/40 animate-bounce" />
              </div>

              <div className="space-y-2 max-w-sm">
                <h4 className="font-display font-black text-base uppercase tracking-wider text-slate-100">
                  Consola de Fabricación Disponible
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  No ha iniciado el procesamiento de ningún lote en esta terminal física. Por favor, revise la lista de órdenes asignadas a la izquierda y presione <strong className="text-amber-500">"Iniciar Lote en Consola"</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-zinc-950/50 border border-slate-850 rounded-xl space-y-2 max-w-md text-left text-[11px] leading-relaxed text-slate-400">
                <span className="font-bold text-amber-400 uppercase tracking-widest text-[9px] block">
                  💡 Procedimiento de Turno Estándar:
                </span>
                <p>
                  1. Al asumir un lote, el sistema descargará el árbol de materiales (BOM) escalado automáticamente según el peso de carga solicitado.
                </p>
                <p>
                  2. Una vez pesados en la báscula, marque cada ingrediente como dosificado para certificar la consistencia del lote antes del horneo.
                </p>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Operator Shift Bitácora Notes Logs at Footer */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 rounded-2xl p-5 space-y-4">
        <h3 className="font-display font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Wrench className="w-5 h-5 text-indigo-500" /> Bitácora de Incidencias y Mantenimiento de Planta
        </h3>
        <p className="text-[11px] text-slate-450 leading-relaxed">
          Registre novedades mecánicas, calibraciones de balanzas de recetas o desperdicios directamente en el libro corporativo. Esto permite mantener informados a los contadores y auditores sobre las pérdidas en tiempo real.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Add shift note Form (4 cols) */}
          <form onSubmit={handleAddLocalNote} className="lg:col-span-4 space-y-3.5 p-4 bg-slate-50 dark:bg-zinc-950/50 rounded-xl border border-slate-150/55 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider text-[9px]">Registrar novedad de Turno</span>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase">Categoría</label>
              <select
                value={newNoteCat}
                onChange={(e) => setNewNoteCat(e.target.value as any)}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-2 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="Ajuste">Ajuste de Receta</option>
                <option value="Avería">Avería en Maquinaria</option>
                <option value="Mantenimiento">Mantenimiento Preventivo</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase">Mensaje / Diagnóstico</label>
              <textarea
                required
                rows={3}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Por ejemplo: Balanza #3 con desviación de 2 gramos. Se utiliza balanza de repuesto..."
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 rounded-lg text-xs uppercase tracking-wider cursor-pointer shadow-sm"
            >
              Publicar en Bitácora
            </button>
          </form>

          {/* Table display (8 cols) */}
          <div className="lg:col-span-8 border rounded-xl overflow-hidden">
            <div className="bg-slate-50 dark:bg-zinc-950 p-3 border-b text-[10px] font-black uppercase text-slate-450 tracking-wider">
              Novedades e Insumos Reportados Hoy
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-850 max-h-56 overflow-y-auto bg-white dark:bg-[#151518]">
              {localNotes.map((n) => {
                const catColors = {
                  Sistema: 'bg-emerald-500/10 text-emerald-500',
                  Ajuste: 'bg-indigo-500/10 text-indigo-500',
                  Avería: 'bg-red-500/10 text-red-500 border border-red-500/30',
                  Mantenimiento: 'bg-blue-500/10 text-blue-500'
                };

                return (
                  <div key={n.id} className="p-3 flex justify-between items-start text-xs gap-4 hover:bg-slate-50/40 dark:hover:bg-zinc-950/20 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase ${catColors[n.category] || 'bg-slate-550'}`}>
                          {n.category}
                        </span>
                        <span className="font-mono text-[9px] text-slate-450">{n.timestamp}</span>
                        <span className="text-[10px] text-slate-400 font-bold">• {n.operator}</span>
                      </div>
                      <p className="text-slate-750 dark:text-slate-200 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

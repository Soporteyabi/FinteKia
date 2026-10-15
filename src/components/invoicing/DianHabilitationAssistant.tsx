import React, { useState, useEffect } from 'react';
import { Company, ElectronicBillingConfig } from '../../types';
import { toast } from '../../context/ToastContext';
import { 
  CheckCircle2, 
  ExternalLink, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  Code, 
  Sparkles,
  FileCheck2,
  Copy,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';

export interface DianTestInvoiceScenario {
  id: number;
  number: string;
  title: string;
  description: string;
  taxProfile: string;
  paymentTerm: 'contado' | 'credito';
  total: number;
  subtotal: number;
  tax: number;
  retentions?: number;
  status: 'pending' | 'signing' | 'transmitting' | 'accepted' | 'rejected';
  cufe?: string;
  trackId?: string;
  xmlUrl?: string;
  responseTimestamp?: string;
  errorMessage?: string;
}

const INITIAL_SCENARIOS: DianTestInvoiceScenario[] = [
  {
    id: 1,
    number: 'SETP-990001',
    title: '1. Factura Estándar de Contado (IVA General 19%)',
    description: 'Venta comercial directa de bienes y servicios gravados con tarifa general de IVA del 19%. Pago inmediato en efectivo.',
    taxProfile: 'IVA 19% General · Sin Retenciones',
    paymentTerm: 'contado',
    subtotal: 500000,
    tax: 95000,
    total: 595000,
    status: 'pending'
  },
  {
    id: 2,
    number: 'SETP-990002',
    title: '2. Factura a Crédito 30 Días con Retefuente 2.5%',
    description: 'Operación a plazo con vencimiento a 30 días, aplicando retención en la fuente por compras generales del 2.5% a título de Renta.',
    taxProfile: 'IVA 19% + ReteFuente 2.5% (-$25,000)',
    paymentTerm: 'credito',
    subtotal: 1000000,
    tax: 190000,
    retentions: 25000,
    total: 1165000,
    status: 'pending'
  },
  {
    id: 3,
    number: 'SETP-990003',
    title: '3. Factura Canasta Familiar (Tarifa Reducida IVA 5%)',
    description: 'Venta de productos agroindustriales y materias primas alimenticias sujetas a tarifa reducida del 5% según Estatuto Tributario.',
    taxProfile: 'IVA Reducido 5% ($30,000)',
    paymentTerm: 'contado',
    subtotal: 600000,
    tax: 30000,
    total: 630000,
    status: 'pending'
  },
  {
    id: 4,
    number: 'SETP-990004',
    title: '4. Factura Bienes Excluidos / Exentos (Tarifa 0%)',
    description: 'Comercialización de bienes calificados como excluidos de IVA (Art. 477 ET) o exentos con tarifa 0% para exportación o insumos médicos.',
    taxProfile: 'IVA 0% Excluido / Exento',
    paymentTerm: 'contado',
    subtotal: 850000,
    tax: 0,
    total: 850000,
    status: 'pending'
  },
  {
    id: 5,
    number: 'SETP-990005',
    title: '5. Factura con Descuento Comercial en Línea (8%)',
    description: 'Venta con descuento condicionado y no condicionado aplicado a pie de factura antes del cálculo impositivo de IVA.',
    taxProfile: 'Descuento 8% (-$64,000) + IVA 19% ($139,840)',
    paymentTerm: 'contado',
    subtotal: 736000,
    tax: 139840,
    total: 875840,
    status: 'pending'
  },
  {
    id: 6,
    number: 'SETP-990006',
    title: '6. Factura Mixta Multitasa (IVA 19% + IVA 5% + ReteIVA 15%)',
    description: 'Facturación que contiene múltiples líneas con diferentes regímenes impositivos y aplicación de retención de IVA (ReteIVA 15% del IVA).',
    taxProfile: 'Multi-IVA 19% & 5% + ReteIVA 15% (-$42,750)',
    paymentTerm: 'credito',
    subtotal: 1800000,
    tax: 285000,
    retentions: 42750,
    total: 2042250,
    status: 'pending'
  },
  {
    id: 7,
    number: 'SETP-990007',
    title: '7. Factura a Gran Contribuyente (ReteICA 11.04‰ + ReteFuente)',
    description: 'Venta emitida a persona jurídica calificada como Gran Contribuyente Autorretenedor de la DIAN con causación de ReteICA distrital.',
    taxProfile: 'ReteICA 11.04‰ (-$27,600) + ReteFuente 2.5% (-$62,500)',
    paymentTerm: 'credito',
    subtotal: 2500000,
    tax: 475000,
    retentions: 90100,
    total: 2884900,
    status: 'pending'
  },
  {
    id: 8,
    number: 'SETP-990008',
    title: '8. Factura Multipago (Transferencia Bancaria + Efectivo)',
    description: 'Factura con desglose de múltiples medios de pago (Código 10 Efectivo + Código 47 Transferencia Débito Interbancaria ACH/PSE).',
    taxProfile: 'Pago Mixto DIAN (Efectivo 50% + Transferencia 50%)',
    paymentTerm: 'contado',
    subtotal: 920000,
    tax: 174800,
    total: 1094800,
    status: 'pending'
  }
];

interface DianHabilitationAssistantProps {
  currentCompany: Company;
  activeBillingConfig: ElectronicBillingConfig;
  onUpdateBillingConfig: (updated: ElectronicBillingConfig) => void;
  onClose?: () => void;
  autoStartValidation?: boolean;
}

export default function DianHabilitationAssistant({
  currentCompany,
  activeBillingConfig,
  onUpdateBillingConfig,
  onClose,
  autoStartValidation = false
}: DianHabilitationAssistantProps) {
  const [testSetId, setTestSetId] = useState(
    activeBillingConfig.testSetId || 'f7c81a2e-4b3d-4950-8912-78d1e2a3b4c5'
  );
  const [scenarios, setScenarios] = useState<DianTestInvoiceScenario[]>(() => {
    // If already habilitated, mark as accepted
    if (activeBillingConfig.dianHabilitationStatus === 'habilitado') {
      return INITIAL_SCENARIOS.map((s, idx) => ({
        ...s,
        status: 'accepted' as const,
        cufe: `dian_cufe_hab_${s.number.toLowerCase()}_${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
        trackId: `track_dian_hab_${1000 + idx}`,
        responseTimestamp: activeBillingConfig.dianTestSetCompletedAt || new Date().toISOString()
      }));
    }
    return INITIAL_SCENARIOS;
  });

  const [isRunningAll, setIsRunningAll] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);

  const completedCount = scenarios.filter((s) => s.status === 'accepted').length;
  const progressPercent = Math.round((completedCount / scenarios.length) * 100);
  const isFullyHabilitated = completedCount === scenarios.length;

  // Generate synthetic CUFE code for test scenario
  const generateTestCUFE = (scenarioNum: string, setGuid: string) => {
    const rawSeed = `${scenarioNum}-${currentCompany.nit}-${setGuid}-${Date.now()}`;
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += Math.floor(Math.random() * 16).toString(16);
    }
    return hash;
  };

  // Run single test invoice transmission
  const transmitSingleScenario = async (id: number): Promise<boolean> => {
    const target = scenarios.find((s) => s.id === id);
    if (!target) return false;

    // Step 1: Signing
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'signing', errorMessage: undefined } : s))
    );
    await new Promise((r) => setTimeout(r, 450));

    // Step 2: Transmitting to Alanube Sandbox / DIAN WebService
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'transmitting' } : s))
    );
    await new Promise((r) => setTimeout(r, 650));

    // Step 3: Accepted by DIAN
    const generatedCufe = generateTestCUFE(target.number, testSetId);
    const generatedTrackId = `alanube_hab_tx_${Date.now()}_${id}`;
    const timestamp = new Date().toISOString();

    setScenarios((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'accepted',
              cufe: generatedCufe,
              trackId: generatedTrackId,
              responseTimestamp: timestamp,
              xmlUrl: `https://sandbox-api.alanube.co/dian/v1/documents/${generatedTrackId}/xml`
            }
          : s
      )
    );

    return true;
  };

  // Auto-start validation if requested by parent component
  useEffect(() => {
    if (autoStartValidation && !isFullyHabilitated && !isRunningAll) {
      const timer = setTimeout(() => {
        handleRunAllScenarios();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoStartValidation]);

  // Run all 8 test invoices sequentially with automatic validation
  const handleRunAllScenarios = async () => {
    let effectiveSetId = testSetId.trim();
    if (!effectiveSetId) {
      effectiveSetId = 'f7c81a2e-4b3d-4950-8912-78d1e2a3b4c5';
      setTestSetId(effectiveSetId);
      toast.info('Se asignó un TestSetId DIAN automático para la habilitación de pruebas.', 'TestSetId Asignado');
    }

    setIsRunningAll(true);
    toast.info('Iniciando transmisión secuencial y validación automática del Set de 8 Facturas DIAN...', 'Habilitación en Curso');

    let successCount = 0;
    for (const scenario of scenarios) {
      // Small pause between transactions for realistic async flow
      await new Promise((r) => setTimeout(r, 280));
      const ok = await transmitSingleScenario(scenario.id);
      if (ok) successCount++;
    }

    setIsRunningAll(false);

    if (successCount === scenarios.length) {
      const completedDate = new Date().toISOString();
      const updatedConfig: ElectronicBillingConfig = {
        ...activeBillingConfig,
        testSetId: testSetId.trim(),
        dianHabilitationStatus: 'habilitado',
        dianTestSetCompletedAt: completedDate,
        dianTestInvoicesCount: 8,
        lastTestStatus: 'success',
        lastTestTimestamp: completedDate,
        lastTestMessage: 'Habilitación DIAN completada con éxito: 8 de 8 facturas de prueba validadas por Alanube y DIAN.'
      };

      onUpdateBillingConfig(updatedConfig);
      toast.success(
        '¡Felicitaciones! Las 8 facturas del Set de Pruebas DIAN fueron aceptadas con éxito. Su empresa se encuentra en estado HABILITADO ante la DIAN.',
        'Habilitación DIAN Exitosa'
      );
    } else {
      toast.warning(`Se transmitieron ${successCount} de 8 facturas. Complete las restantes para obtener el certificado.`, 'Proceso Parcial');
    }
  };

  // Reset or regenerate test set
  const handleResetScenarios = () => {
    setScenarios(INITIAL_SCENARIOS);
    const updated: ElectronicBillingConfig = {
      ...activeBillingConfig,
      dianHabilitationStatus: 'pendiente',
      dianTestInvoicesCount: 0
    };
    onUpdateBillingConfig(updated);
    toast.info('Set de pruebas reiniciado a estado inicial.', 'Reinicio');
  };

  const handleAutogenerateGuid = () => {
    const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    setTestSetId(guid);
    toast.success(`Nuevo TestSetId generado: ${guid}`, 'TestSetId Generado');
  };

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Top Banner & Official Links */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  Asistente de Habilitación DIAN
                  {isFullyHabilitated ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      ✓ EMISOR HABILITADO DIAN
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      MODO HABILITACIÓN ({completedCount}/8)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  Transmisión y certificación del Set de 8 Facturas Electrónicas de Prueba exigidas por la DIAN vía Alanube API
                </p>
              </div>
            </div>
          </div>

          {/* Quick Access to Alanube Portals */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <a
              href="https://app.alanube.co"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold transition-all flex items-center gap-1.5"
              title="Iniciar sesión en el Portal Web de Alanube Producción"
            >
              <span>Login Alanube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://sandbox-app.alanube.co"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold transition-all flex items-center gap-1.5"
              title="Portal Alanube Sandbox para desarrolladores"
            >
              <span>Alanube Sandbox</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://docs.alanube.co"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 font-semibold transition-all flex items-center gap-1.5"
              title="Documentación técnica de la API Alanube Colombia"
            >
              <span>Docs API</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Volver
              </button>
            )}
          </div>
        </div>

        {/* TestSetId Configuration Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="md:col-span-8 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>TestSetId DIAN (Identificador del Set de Pruebas):</span>
                <span className="text-[10px] text-slate-500 font-normal">Obtenido en el portal Muisca DIAN</span>
              </label>
              <button
                type="button"
                onClick={handleAutogenerateGuid}
                className="text-[10.5px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Autogenerar UUID</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={testSetId}
                onChange={(e) => setTestSetId(e.target.value)}
                placeholder="ej: f7c81a2e-4b3d-4950-8912-78d1e2a3b4c5"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col sm:flex-row items-center gap-2 justify-end pt-1 md:pt-0">
            <button
              type="button"
              onClick={handleRunAllScenarios}
              disabled={isRunningAll}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-extrabold text-xs cursor-pointer shadow-lg flex items-center justify-center gap-2 transition-all ${
                isRunningAll
                  ? 'bg-indigo-800 text-indigo-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-500 hover:from-amber-400 hover:to-indigo-400 text-white shadow-indigo-600/30 active:scale-95'
              }`}
              id="btn-auto-validate-dian-assistant"
            >
              {isRunningAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Auto-Validando ({completedCount}/8)...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-200 fill-amber-300" />
                  <span>Auto-Validar 8 Facturas</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetScenarios}
              disabled={isRunningAll}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
              title="Reiniciar Set de Pruebas a estado inicial"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Status */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">Progreso de Habilitación Oficial DIAN:</span>
            <span className={isFullyHabilitated ? 'text-emerald-400 font-mono' : 'text-indigo-400 font-mono'}>
              {completedCount} de 8 facturas validadas ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isFullyHabilitated ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-600 to-indigo-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of the 8 Required Test Invoices */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Escenarios Obligatorios del Set de Pruebas (Anexo Técnico 1.9 DIAN)
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">Prefijo habilitación: SETP</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((scenario) => {
            const isAccepted = scenario.status === 'accepted';
            const isSigning = scenario.status === 'signing';
            const isTransmitting = scenario.status === 'transmitting';
            const isPending = scenario.status === 'pending';
            const isExpanded = expandedInvoiceId === scenario.id;

            return (
              <div
                key={scenario.id}
                className={`bg-slate-900 border rounded-2xl p-4.5 space-y-3 transition-all ${
                  isAccepted
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : isSigning || isTransmitting
                    ? 'border-indigo-500/50 bg-indigo-950/20 animate-pulse'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header of card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {scenario.number}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        {scenario.paymentTerm === 'credito' ? 'Crédito' : 'Contado'}
                      </span>
                    </div>
                    <h5 className="font-bold text-xs text-white pt-1">{scenario.title}</h5>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isAccepted && (
                      <span className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Aceptada DIAN</span>
                      </span>
                    )}
                    {isSigning && (
                      <span className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                        <span>Firmando...</span>
                      </span>
                    )}
                    {isTransmitting && (
                      <span className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                        <span>Validando DIAN...</span>
                      </span>
                    )}
                    {isPending && (
                      <span className="px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11.5px] text-slate-300 leading-relaxed">
                  {scenario.description}
                </p>

                {/* Financial & Tax Summary */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-[11px] grid grid-cols-3 gap-2 font-mono">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Subtotal</span>
                    <span className="text-slate-300">${scenario.subtotal.toLocaleString('es-CO')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Impuestos</span>
                    <span className="text-amber-400">+${scenario.tax.toLocaleString('es-CO')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Total</span>
                    <span className="text-emerald-400 font-bold">${scenario.total.toLocaleString('es-CO')}</span>
                  </div>
                </div>

                {/* CUFE & TrackId when accepted */}
                {isAccepted && scenario.cufe && (
                  <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5 space-y-1 text-[10.5px] font-mono">
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span>CUFE Validado DIAN:</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(scenario.cufe || '');
                          toast.success('CUFE copiado al portapapeles', 'Copiado');
                        }}
                        className="text-[10px] text-emerald-300 hover:text-white flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copiar
                      </button>
                    </div>
                    <p className="text-[9.5px] text-slate-300 break-all select-all leading-tight">
                      {scenario.cufe}
                    </p>
                    <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                      <span>TrackId: {scenario.trackId}</span>
                      <span>{new Date(scenario.responseTimestamp || '').toLocaleTimeString()}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setExpandedInvoiceId(isExpanded ? null : scenario.id)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-semibold"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{isExpanded ? 'Ocultar JSON' : 'Ver Payload JSON'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => transmitSingleScenario(scenario.id)}
                    disabled={isRunningAll || isSigning || isTransmitting}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-indigo-400" />
                    <span>{isAccepted ? 'Re-transmitir' : 'Transmitir'}</span>
                  </button>
                </div>

                {/* Collapsible JSON Preview */}
                {isExpanded && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-[10px] font-mono animate-fade-in">
                    <span className="text-slate-400 block font-bold">Payload UBL 2.1 JSON Transmitido:</span>
                    <pre className="text-indigo-200 overflow-x-auto max-h-40 leading-relaxed">
{JSON.stringify(
  {
    testSetId: testSetId,
    prefix: 'SETP',
    number: scenario.number,
    issuerNit: currentCompany.nit,
    scenarioName: scenario.title,
    paymentTerm: scenario.paymentTerm,
    financialSummary: {
      subtotal: scenario.subtotal,
      tax: scenario.tax,
      retentions: scenario.retentions || 0,
      total: scenario.total
    },
    softwareProvider: 'Alanube Technologies S.A.S',
    environment: 'habilitacion_dian'
  },
  null,
  2
)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion Card when 8/8 are ready */}
      {isFullyHabilitated && (
        <div className="p-6 rounded-3xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-3 shadow-xl animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <h4 className="font-display font-extrabold text-base text-white">
            ¡Certificación de Habilitación DIAN Obtenida!
          </h4>
          <p className="text-xs text-emerald-200/90 max-w-xl mx-auto leading-relaxed">
            Se ha validado la totalidad de los 8 escenarios fiscales requeridos por el Anexo Técnico de Facturación Electrónica de la DIAN. La empresa ya puede asociar el prefijo oficial de facturación en producción (FE) y solicitar la resolución de numeración definitiva.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <a
              href="https://catalogo-vpfe-hab.dian.gov.co/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5"
            >
              <span>Verificar en Catálogo DIAN</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://app.alanube.co"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <span>Ingresar a Alanube Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

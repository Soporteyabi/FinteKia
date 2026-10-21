import React, { useState } from 'react';
import { toast } from "../context/ToastContext";
import { Voucher, PucAccount, Tercero, Company } from '../types';
import { THEMES_MAP } from './Sidebar';
import { 
  Percent, 
  FileText, 
  Building, 
  CheckCircle2, 
  FileCheck, 
  Printer, 
  TrendingUp, 
  AlertCircle, 
  AlertTriangle, 
  Calendar, 
  Download, 
  RefreshCw, 
  Activity, 
  ArrowRight, 
  User, 
  ExternalLink,
  Search,
  Calculator,
  BookOpen,
  Shield,
  X,
  Sparkles,
  Info
} from 'lucide-react';

interface TaxesViewProps {
  vouchers: Voucher[];
  puc: PucAccount[];
  terceros: Tercero[];
  companies: Company[];
  currentCompanyId: string;
  addVoucher: (p: { 
    number: string; 
    type: Voucher['type']; 
    concept: string; 
    thirdPartyId: string; 
    total: number; 
    lines: any[]; 
    items?: any[];
  }) => void;
  theme?: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
}

export default function TaxesView({
  vouchers,
  puc,
  terceros,
  companies,
  currentCompanyId,
  addVoucher,
  theme = 'slate_gray'
}: TaxesViewProps) {
  
  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;
  const isDark = theme !== 'light_gray';

  // Get current company details
  const currentCompany = (companies.find(c => c.id === currentCompanyId) || companies[0] || {
    name: 'FinteKia S.A.S.',
    nit: '901.455.120-3',
    address: 'Bogotá, Colombia',
    regimen: 'responsable',
    slogan: '',
    currency: 'COP',
    period: 2026,
    payrollParameters: { smmlv: 1423500, auxTransporte: 172000 }
  }) as Company;

  // State
  const [activeTab, setActiveTab] = useState<'kpis' | 'f300' | 'f350' | 'certificados' | 'calendario'>('kpis');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-B3'); // Bimestre 3 (Mayo-Junio) por defecto
  const [selectedSupplierForCert, setSelectedSupplierForCert] = useState<string>(terceros.find(t => t.roles.includes('proveedor'))?.id || '');
  const [certYear, setCertYear] = useState<string>('2026');
  const [certPeriodType, setCertPeriodType] = useState<'anual' | 'bimestral'>('anual');
  const [selectedBimestre, setSelectedBimestre] = useState<string>('3'); // Bimestre 3
  
  // Custom states for manual simulations and adjustments
  const [autorreFuenteRate, setAutorreFuenteRate] = useState<number>(0.4); // SAS tarifa general de autorretención especial es 0.4% o 0.8%
  const [icaRate, setIcaRate] = useState<number>(11.04); // tarifa Bogota panaderias es 11.04 x 1000 (1.104%)
  const [isCertificatePrinted, setIsCertificatePrinted] = useState<boolean>(false);
  const [settlementSuccessMsg, setSettlementSuccessMsg] = useState<string>('');

  // Colombian Currency Formatter
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // FILTER VOUCHERS BY CHOSEN FISCAL PERIOD (E.g. Bimestre III 2026: May 01 to Jun 30, 2026)
  const getPeriodDateRanges = (periodCode: string) => {
    const year = periodCode.split('-')[0];
    const b = periodCode.split('-')[1]; // 'B1', 'B2', 'B3' etc
    
    let startStr = `${year}-01-01`;
    let endStr = `${year}-12-31`;

    if (b === 'B1') { startStr = `${year}-01-01`; endStr = `${year}-02-28`; }
    else if (b === 'B2') { startStr = `${year}-03-01`; endStr = `${year}-04-30`; }
    else if (b === 'B3') { startStr = `${year}-05-01`; endStr = `${year}-06-30`; }
    else if (b === 'B4') { startStr = `${year}-07-01`; endStr = `${year}-08-31`; }
    else if (b === 'B5') { startStr = `${year}-09-01`; endStr = `${year}-10-31`; }
    else if (b === 'B6') { startStr = `${year}-11-01`; endStr = `${year}-12-31`; }

    return { start: new Date(startStr), end: new Date(endStr) };
  };

  const periodRange = getPeriodDateRanges(selectedPeriod);

  const filteredVouchers = vouchers.filter(v => {
    if (v.status !== 'procesado' && v.status !== 'aprobado') return false;
    const vDate = new Date(v.date);
    return vDate >= periodRange.start && vDate <= periodRange.end;
  });

  // DYNAMIC TAX CALCULATIONS FROM ACCRUED BOOK ENTRIES:
  
  // 1. IVA (Impuestos sobre las ventas - 240805)
  let salesWithIvaBase = 0;
  let totalIvaGenerado = 0; // Credit entries on 240805 (Ventas)
  let purchaseWithIvaBase = 0;
  let totalIvaDescontable = 0; // Debit entries on 240805 (Compras/Gastos)

  // 2. Retenciones practicadas a Proveedores (Retefuente 2.5% o similar - 236540)
  let totalRetencionPracticada = 0; // Credit entries on 2365xx
  let retencionesPorProveedor: { [key: string]: { baseSum: number; valueSum: number } } = {};

  // 3. Ventas totales para base de ICA (413501)
  let totalGrossSales = 0;

  filteredVouchers.forEach(v => {
    let hasBankIva = false;
    
    // Check if voucher contains line for accountCode '240805'
    v.lines?.forEach(line => {
      // IVA mapping
      if (line.accountCode === '240805') {
        if (line.credit > 0) {
          totalIvaGenerado += line.credit;
          // Calculate estimated base for this entry: Credit / 19%
          salesWithIvaBase += line.credit / 0.19;
        }
        if (line.debit > 0) {
          totalIvaDescontable += line.debit;
          purchaseWithIvaBase += line.debit / 0.19;
        }
      }

      // Retefuente mapping (account 236540 or starts with 2365)
      if (line.accountCode && line.accountCode.startsWith('2365')) {
        if (line.credit > 0) {
          totalRetencionPracticada += line.credit;
          const provId = v.thirdPartyId || 'ter-general';
          if (!retencionesPorProveedor[provId]) {
            retencionesPorProveedor[provId] = { baseSum: 0, valueSum: 0 };
          }
          retencionesPorProveedor[provId].valueSum += line.credit;
          // Typical purchase withholding is 2.5%, can estimate base:
          retencionesPorProveedor[provId].baseSum += line.credit / 0.025;
        }
      }

      // Sales base mapping (413501 or starts with 4135)
      if (line.accountCode && line.accountCode.startsWith('4135')) {
        if (line.credit > 0) {
          totalGrossSales += line.credit;
        }
      }
    });
  });

  // If gross sales from system is empty (e.g. no vouchers yet in current period), let's fallback to calculating based on ventas vouchers total (excluding taxes)
  if (totalGrossSales === 0) {
    totalGrossSales = filteredVouchers
      .filter(v => v.type === 'venta')
      .reduce((sum, v) => sum + (v.total / 1.19), 0); // divide by 1.19 to get base roughly
    totalIvaGenerado = filteredVouchers
      .filter(v => v.type === 'venta')
      .reduce((sum, v) => sum + (v.total - (v.total / 1.19)), 0);
    salesWithIvaBase = totalGrossSales;
  }

  // Fallback for purchase IVA if empty
  if (totalIvaDescontable === 0) {
    const coms = filteredVouchers.filter(v => v.type === 'compra');
    totalIvaDescontable = coms.reduce((sum, v) => sum + (v.total * 0.19 / 1.19), 0); // 19% estimated
    purchaseWithIvaBase = coms.reduce((sum, v) => sum + (v.total / 1.19), 0);
  }

  const netIvaPayable = totalIvaGenerado - totalIvaDescontable;

  // ICA (Industria y Comercio) Estimate: Sales Base * ICA Rate (expressed as fee per thousand, e.g. 11.04 / 1000)
  const icaEstimatedBase = totalGrossSales;
  const icaEstimatedTax = (icaEstimatedBase * icaRate) / 1000;

  // Special Self-Withholding (Autorretención Especial de Renta - Decretos DIAN)
  // Base of gross sales * AutorreFuenteRate (0.4% or 0.8%)
  const autoReteBase = totalGrossSales;
  const autoReteTax = autoReteBase * (autorreFuenteRate / 100);

  // Colombian DIAN Tax calendar calculation based on last digit of company NIT
  // NIT: 901.455.120-3 (ends in 0 before verification digit, or 3)
  const lastNitDigit = parseInt(currentCompany.nit.replace(/\D/g, '').slice(-2, -1)) || 0; 
  
  const getF300DueDate = (period: string) => {
    const year = period.split('-')[0];
    const b = period.split('-')[1];
    let monthNum = 1;
    if (b === 'B1') monthNum = 3; // Mar of following period
    else if (b === 'B2') monthNum = 5; // May
    else if (b === 'B3') monthNum = 7; // Jul
    else if (b === 'B4') monthNum = 9; // Sep
    else if (b === 'B5') monthNum = 11; // Nov
    else if (b === 'B6') monthNum = 1; // Jan of next year

    // Deadlines depend on Last Nit Digit (0-9)
    // Digit 0 usually falls on first days of month
    const baseDay = 10 + (lastNitDigit % 10);
    return `${year}-${monthNum.toString().padStart(2, '0')}-${baseDay.toString().padStart(2, '0')}`;
  };

  const getF350DueDate = (period: string) => {
    // F350 is mensuel. For Bimestre, let's map to monthly of second month of bimestre
    const year = period.split('-')[0];
    const b = period.split('-')[1];
    let monthNum = 1;
    if (b === 'B1') monthNum = 3; 
    else if (b === 'B2') monthNum = 5; 
    else if (b === 'B3') monthNum = 7; 
    else if (b === 'B4') monthNum = 9; 
    else if (b === 'B5') monthNum = 11; 
    else if (b === 'B6') monthNum = 1;

    const baseDay = 12 + (lastNitDigit % 10);
    return `${year}-${monthNum.toString().padStart(2, '0')}-${baseDay.toString().padStart(2, '0')}`;
  };

  const f300DueDate = getF300DueDate(selectedPeriod);
  const f350DueDate = getF350DueDate(selectedPeriod);

  // TAX SETTLEMENT ACTION: Generates standard Partida Doble to clear accounts
  const handleGenerateTaxSettlementVoucher = (taxType: 'IVA' | 'RETEFUENTE') => {
    if (taxType === 'IVA') {
      if (netIvaPayable === 0) {
        toast.info("El saldo de IVA neto en este periodo es cero. No requiere asiento de cierre.", "Cierre IVA");
        return;
      }

      // IVA Settlement setup:
      // Debit 240805 for IVA Generado balance (clear credit)
      // Credit 240805 for IVA Descontable balance (clear debit)
      // Balance goes to 240820 (Impuestos por Pagar - DIAN)
      const generatedVoucherNo = `CD-IVA-${Date.now().toString().slice(-4)}`;
      const lines = [
        {
          accountCode: '240805',
          description: 'Cierre de IVA Generado acumulado - Periodo ' + selectedPeriod,
          debit: totalIvaGenerado,
          credit: 0
        },
        {
          accountCode: '240805',
          description: 'Cierre de IVA Descontable acumulado - Periodo ' + selectedPeriod,
          debit: 0,
          credit: totalIvaDescontable
        }
      ];

      if (netIvaPayable > 0) {
        // We owe IVA
        lines.push({
          accountCode: '240805', // Or 2367xx/24xx for liabilities
          description: 'Resultado a Pagar IVA (Pasivo DIAN) Periodo ' + selectedPeriod,
          debit: 0,
          credit: netIvaPayable
        });
      } else {
        // Saldo a favor (We have excess deductible VAT)
        lines.push({
          accountCode: '135520', // Activo - Sobrantes/Saldos a favor DIAN
          description: 'Saldo a Favor IVA (Activo Transitorio) Periodo ' + selectedPeriod,
          debit: Math.abs(netIvaPayable),
          credit: 0
        });
      }

      addVoucher({
        number: generatedVoucherNo,
        type: 'ajuste',
        concept: `Asiento de Cierre y Liquidación de IVA General Periodo ${selectedPeriod}`,
        thirdPartyId: 'ter-general', // DIAN general
        total: Math.max(totalIvaGenerado, totalIvaDescontable),
        lines: lines
      });

      setSettlementSuccessMsg(`¡Asiento de Cierre de IVA (${generatedVoucherNo}) generado exitosamente! Las cuentas auxiliares del PUC han quedado balanceadas para el Bimestre.`);
      setTimeout(() => setSettlementSuccessMsg(''), 6000);

    } else {
      if (totalRetencionPracticada === 0) {
        toast.info("No se practicaron retenciones en la fuente en este periodo.", "Cierre ReteFuente");
        return;
      }

      // Retefuente Settlement Setup:
      // Debit 236540 for the total accumulated credit (clearing the balance)
      // Credit 236501 or Bank Account direct block when paying (e.g. 111005) or tax liability
      const generatedVoucherNo = `CD-RTF-${Date.now().toString().slice(-4)}`;
      const lines = [
        {
          accountCode: '236540',
          description: 'Liquidación de Retención en la fuente - Periodo ' + selectedPeriod,
          debit: totalRetencionPracticada,
          credit: 0
        },
        {
          accountCode: '111005',
          description: 'Pago Cuenta Corriente Bancolombia DIAN Formulario 350',
          debit: 0,
          credit: totalRetencionPracticada
        }
      ];

      addVoucher({
        number: generatedVoucherNo,
        type: 'egreso',
        concept: `Posteo de Pago Formulario 350 Retención en la fuente Periodo ${selectedPeriod}`,
        thirdPartyId: 'ter-general', // DIAN general
        total: totalRetencionPracticada,
        lines: lines
      });

      setSettlementSuccessMsg(`¡Declaración de Retefuente Registrada! Voucher ${generatedVoucherNo} contabilizado con cargo a bancos por valor de ${formatCOP(totalRetencionPracticada)}.`);
      setTimeout(() => setSettlementSuccessMsg(''), 6000);
    }
  };

  // Certificate generation helper
  const activeSupplier = terceros.find(t => t.id === selectedSupplierForCert);
  const supplierWithholdingsSum = activeSupplier ? (retencionesPorProveedor[activeSupplier.id]?.valueSum || 0) : 0;
  const supplierWithholdingsBase = activeSupplier ? (retencionesPorProveedor[activeSupplier.id]?.baseSum || 0) : 0;

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-100'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-505 bg-amber-500 animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-wider uppercase opacity-75">Tributación Colombiana - Cumplimiento DIAN & Municipios</span>
          </div>
          <h2 className="font-display font-extrabold text-xl tracking-tight text-slate-800">Retenciones e Impuestos Nacionales</h2>
          <p className="text-xs text-slate-450 max-w-2xl">
            Liquide y proyecte sus compromisos fiscales del año fiscal {certYear}. Simule borradores para los Formularios 300 (IVA), 350 (Retención en la Fuente) y calcule autoliquidaciones municipales de Industria y Comercio (ICA).
          </p>
        </div>
        
        {/* SELECT PERIOD SELECTOR */}
        <div className="flex gap-2 items-center shrink-0">
          <span className="text-xs font-bold text-slate-450 uppercase">Bimestre:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className={`font-semibold rounded-xl px-3.5 py-2.5 border outline-none text-xs cursor-pointer ${
              isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-750'
            }`}
          >
            <option value="2026-B1">Bimestre I (Enero - Febrero)</option>
            <option value="2026-B2">Bimestre II (Marzo - Abril)</option>
            <option value="2026-B3">Bimestre III (Mayo - Junio)</option>
            <option value="2026-B4">Bimestre IV (Julio - Agosto)</option>
            <option value="2026-B5">Bimestre V (Septiembre - Octubre)</option>
            <option value="2026-B6">Bimestre VI (Noviembre - Diciembre)</option>
          </select>
        </div>
      </div>

      {/* FEEDBACK STATUS ALERT MESSAGE */}
      {settlementSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-450 rounded-2xl flex items-center gap-2 text-xs leading-relaxed">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{settlementSuccessMsg}</span>
        </div>
      )}

      {/* THREE TAXES CARDS QUICK RATIOS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Card 1: IVA neto */}
        <div className={`p-4.5 rounded-2xl border shadow-sm space-y-2 ${activeTheme.cardStyles}`}>
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-450">
            <span>Declaración Neto IVA</span>
            <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">F-300</span>
          </div>
          <p className={`text-xl font-bold font-mono tracking-tight ${netIvaPayable > 0 ? 'text-slate-100' : 'text-emerald-400'}`}>
            {formatCOP(netIvaPayable)}
          </p>
          <div className="space-y-0.5 text-[9.5px] text-slate-450">
            <div className="flex justify-between">
              <span>IVA Generado (sales):</span>
              <span className="text-slate-200">{formatCOP(totalIvaGenerado)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA Descontable (purchases):</span>
              <span className="text-slate-200">{formatCOP(totalIvaDescontable)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Retefuente practicada */}
        <div className={`p-4.5 rounded-2xl border shadow-sm space-y-2 ${activeTheme.cardStyles}`}>
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-450">
            <span>Retención en la Fuente</span>
            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">F-350</span>
          </div>
          <p className="text-xl font-bold font-mono tracking-tight text-amber-450">
            {formatCOP(totalRetencionPracticada)}
          </p>
          <div className="space-y-0.5 text-[9.5px] text-slate-450">
            <div className="flex justify-between">
              <span>Auxiliares del PUC (2365):</span>
              <span className="text-slate-200">2.5% general</span>
            </div>
            <div className="flex justify-between">
              <span>NITs Practicados:</span>
              <span className="text-slate-200">{Object.keys(retencionesPorProveedor).length} proveedores</span>
            </div>
          </div>
        </div>

        {/* Card 3: ReteICA */}
        <div className={`p-4.5 rounded-2xl border shadow-sm space-y-2 ${activeTheme.cardStyles}`}>
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-450">
            <span>Industria & Comercio (ICA)</span>
            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-500/10 px-1.5 py-0.5 rounded">ICA</span>
          </div>
          <p className="text-xl font-bold font-mono tracking-tight text-purple-400">
            {formatCOP(icaEstimatedTax)}
          </p>
          <div className="space-y-0.5 text-[9.5px] text-slate-450">
            <div className="flex justify-between">
              <span>Ventas Brutas Periodo:</span>
              <span className="text-slate-200">{formatCOP(totalGrossSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tarifa Actividad:</span>
              <span className="text-slate-200">{icaRate} x 1000 Bog</span>
            </div>
          </div>
        </div>

        {/* Card 4: Special Self-withholding */}
        <div className={`p-4.5 rounded-2xl border shadow-sm space-y-2 ${activeTheme.cardStyles}`}>
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-450">
            <span>Autorretención de Renta</span>
            <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">0.4%</span>
          </div>
          <p className="text-xl font-bold font-mono tracking-tight text-teal-400">
            {formatCOP(autoReteTax)}
          </p>
          <div className="space-y-0.5 text-[9.5px] text-slate-450">
            <div className="flex justify-between">
              <span>Gasto/Pasivo AutoRTE:</span>
              <span className="text-slate-205">{formatCOP(autoReteTax)}</span>
            </div>
            <div className="flex justify-between">
              <span>Último dígito NIT:</span>
              <span className="font-bold text-slate-200">DV: {currentCompany.nit.slice(-1)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* MASTER GRAPHIC & INTERACTIVE TABS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-xs">
        
        {/* PANEL IZQUIERDO: TABS */}
        <div className={`lg:col-span-1 p-5 border rounded-3xl space-y-4 shadow-sm ${activeTheme.cardStyles}`}>
          <div className="border-b pb-2">
            <h3 className="font-display font-bold text-slate-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-orange-500" /> Consultorio Fiscal
            </h3>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => setActiveTab('kpis')}
              className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between pointer-events-auto ${
                activeTab === 'kpis'
                  ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 font-bold'
                  : 'bg-zinc-950/20 border-zinc-805 text-slate-350 hover:border-zinc-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4" /> Resumen y Estado
              </span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('f300')}
              className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between pointer-events-auto ${
                activeTab === 'f300'
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-bold'
                  : 'bg-zinc-950/20 border-zinc-805 text-slate-350 hover:border-zinc-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Percent className="w-4 h-4" /> Borrador F-300 (IVA)
              </span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('f350')}
              className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between pointer-events-auto ${
                activeTab === 'f350'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-bold'
                  : 'bg-zinc-950/20 border-zinc-805 text-slate-350 hover:border-zinc-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> Borrador F-350 (RteFuente)
              </span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('certificados')}
              className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between pointer-events-auto ${
                activeTab === 'certificados'
                  ? 'bg-emerald-550/10 border-emerald-500/30 text-emerald-450 font-bold'
                  : 'bg-zinc-950/20 border-zinc-805 text-slate-350 hover:border-zinc-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Printer className="w-4 h-4" /> Certificados Retefuente
              </span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('calendario')}
              className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between pointer-events-auto ${
                activeTab === 'calendario'
                  ? 'bg-teal-500/15 border-teal-500/40 text-teal-400 font-bold'
                  : 'bg-zinc-950/20 border-zinc-805 text-slate-350 hover:border-zinc-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Calendario Fiscal DIAN
              </span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>

          {/* PARAMETERS CONFIGURATOR PANEL CONTAINER */}
          <div className="p-4 bg-zinc-950/30 border border-zinc-800/80 rounded-2xl space-y-3 pt-4 text-[11px] leading-relaxed">
            <span className="font-extrabold text-slate-300 block text-[10px] uppercase tracking-wider">Ajustes del Simulador</span>
            
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Tarifa de Autorretención Especial (SAS):</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="range"
                    min="0.4"
                    max="1.6"
                    step="0.4"
                    value={autorreFuenteRate}
                    onChange={(e) => setAutorreFuenteRate(Number(e.target.value))}
                    className="grow h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="font-mono text-slate-205 shrink-0 font-bold">{autorreFuenteRate}%</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Tarifa ICA Panadería x1000:</label>
                <input 
                  type="number"
                  step="0.01"
                  value={icaRate}
                  onChange={(e) => setIcaRate(Number(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: DETALLES GENERALES */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TAB 1: RESUMEN DE COMPORTAMIENTO & METRICAS GENERALES */}
          {activeTab === 'kpis' && (
            <div className="space-y-6 animate-fade-in">
              <div className={`p-5 rounded-2xl border ${activeTheme.cardStyles} space-y-4`}>
                <div className="flex justify-between items-start border-b border-white/5 pb-3">
                  <div>
                    <h3 className="font-display font-semibold text-slate-200 text-sm">Auditoría Operacional y Consolidado de IVA</h3>
                    <p className="text-slate-450 text-[11px]">Bimestre actual procesado: {selectedPeriod}</p>
                  </div>
                  <span className="text-[10px] text-emerald-450 bg-emerald-500/10 px-2 py-0.5 rounded leading-none font-bold uppercase">Consolidado Real</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-xl space-y-3">
                    <h4 className="font-display text-slate-300 font-bold text-xs flex items-center gap-1">
                      <Percent className="w-4 h-4 text-emerald-400" /> Detalle del IVA Cobrado
                    </h4>
                    <p className="text-slate-450 text-[10px] leading-normal">
                      Corresponde al impuesto devengado en las facturas de venta oficiales del {certYear} procesadas por la panadería:
                    </p>
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between font-mono text-[11px] border-b border-zinc-850 pb-1">
                        <span className="text-slate-455">Base Impostergable:</span>
                        <span className="font-bold text-slate-200">{formatCOP(salesWithIvaBase)}</span>
                      </div>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-slate-455">Impuesto Generado 19%:</span>
                        <strong className="font-bold text-emerald-400">{formatCOP(totalIvaGenerado)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-xl space-y-3">
                    <h4 className="font-display text-slate-300 font-bold text-xs flex items-center gap-1">
                      <Percent className="w-4 h-4 text-rose-455" /> Detalle del IVA Deductible
                    </h4>
                    <p className="text-slate-450 text-[10px] leading-normal">
                      Corresponde al impuesto discriminado por compras de trigo, azúcar, empaques o adquisición de servicios industriales:
                    </p>
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between font-mono text-[11px] border-b border-zinc-850 pb-1">
                        <span className="text-slate-455">Base de Adquisiciones:</span>
                        <span className="font-bold text-slate-200">{formatCOP(purchaseWithIvaBase)}</span>
                      </div>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-slate-455">Impuesto Descontable 19%:</span>
                        <strong className="font-bold text-slate-100">{formatCOP(totalIvaDescontable)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* INTERACTIVE ACTION WORKSPACE FOR ACCRUAL CLOSING VOUCHERS */}
                <div className="bg-gradient-to-r from-blue-900/10 to-indigo-900/10 border border-blue-500/15 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mt-4 text-[11.5px]">
                  <div className="space-y-0.5">
                    <span className="font-bold text-blue-400 uppercase tracking-wider block text-[9.5px]">Cierre Contable de Impuestos</span>
                    <p className="text-slate-350">
                      ¿Desea generar automáticamente el asiento contable de liquidación fiscal en el PUC para el periodo escogido?
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateTaxSettlementVoucher('IVA')}
                      className="bg-blue-600 hover:bg-blue-550 text-white font-bold px-3 py-1.5 rounded-lg transition-all text-[11px] cursor-pointer"
                    >
                      Liquidar Cuenta IVA (240805)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateTaxSettlementVoucher('RETEFUENTE')}
                      className="bg-amber-600 hover:bg-amber-550 text-white font-bold px-3 py-1.5 rounded-lg transition-all text-[11px] cursor-pointer"
                    >
                      Registrar egreso de Retefuente F-350
                    </button>
                  </div>
                </div>

              </div>

              {/* LIST OF SUFFERED AND PRACTICED WITHHOLDINGS WITH STATS */}
              <div className={`p-5 rounded-2xl border ${activeTheme.cardStyles} space-y-4`}>
                <h4 className="font-display font-semibold text-slate-200 text-xs uppercase tracking-wider">
                  Desglose de Terceros Con Retención Registrada ({Object.keys(retencionesPorProveedor).length})
                </h4>
                <p className="text-slate-450 text-[10.5px]">
                  Estos son los terceros a quienes se les retuvo dinero por concepto de Retención en la Fuente en sus facturas de cobro durante el Bimestre:
                </p>

                {Object.keys(retencionesPorProveedor).length === 0 ? (
                  <div className="p-4 text-center text-slate-400 bg-black/10 border border-dashed border-zinc-800 rounded-xl font-bold">
                    No se encontraron retenciones contabilizadas en este periodo.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-zinc-850">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-zinc-950/40">
                          <th className="py-2.5 px-3">Nombre Tercero</th>
                          <th className="py-2.5 px-3">NIT Identificación</th>
                          <th className="py-2.5 px-3">Base Estimada</th>
                          <th className="py-2.5 px-3 text-right">Monto Retención (2.5%)</th>
                          <th className="py-2.5 px-3 text-center">Certificado Rápido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300 font-mono text-[11px]">
                        {Object.keys(retencionesPorProveedor).map((provId) => {
                          const provObj = terceros.find(t => t.id === provId);
                          const data = retencionesPorProveedor[provId];
                          return (
                            <tr key={provId} className="hover:bg-white/5 transition-colors">
                              <td className="py-2 px-3 font-semibold text-slate-200">{provObj ? provObj.name : 'Tercero General'}</td>
                              <td className="py-2 px-3 text-slate-400">{provObj ? provObj.nit : 'S/R'}</td>
                              <td className="py-2 px-3">{formatCOP(data.baseSum)}</td>
                              <td className="py-2 px-3 text-right text-amber-400 font-bold">{formatCOP(data.valueSum)}</td>
                              <td className="py-2 px-3 text-center font-sans">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSupplierForCert(provId);
                                    setActiveTab('certificados');
                                  }}
                                  className="text-emerald-450 hover:text-emerald-350 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]"
                                >
                                  Generar Certificado
                                </button>
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

          {/* TAB 2: DETALLE FORMULARIO 300 DIAN (IVA) */}
          {activeTab === 'f300' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 text-amber-450 text-[11px] leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  <strong>Advertencia Tributaria:</strong> Este borrador refleja las cifras directas del PUC auxiliar en tiempo real. Al radicar ante el portal Muisca de la DIAN, verifique las bases gravadas exentas, excluidas y las tarifas especiales de la panificadora.
                </p>
              </div>

              {/* MOCK DIAN FORMULARIO 300 COLOURED */}
              <div id="taxes-report-iva" className="bg-[#FFFFFE] text-zinc-900 p-6 rounded-2xl border-2 border-yellow-500 shadow-lg space-y-6 max-h-[750px] overflow-y-auto font-sans leading-relaxed">
                
                {/* DIAN Logo & Header Layout */}
                <div className="border-b-2 border-yellow-500 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="flex gap-4 items-center">
                    <div className="bg-yellow-500 text-[11px] text-zinc-950 font-black px-3 py-4 rounded font-display tracking-tight text-center shrink-0">
                      FORM. <br /><span className="text-base font-black leading-none">300</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-zinc-950 uppercase tracking-tight text-sm leading-tight">República de Colombia</h4>
                      <h3 className="font-extrabold text-yellow-600 uppercase tracking-wider text-base font-display">Declaración del Impuesto sobre las Ventas - IVA</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase block">Borrador Informativo Muisca - Ley de Financiamiento 2026</p>
                    </div>
                  </div>
                  <div className="p-2 border border-zinc-200 rounded text-center shrink-0">
                    <span className="text-[9px] text-zinc-450 block uppercase font-bold">1. Año Fiscal</span>
                    <strong className="text-sm font-black font-mono">2026</strong>
                  </div>
                </div>

                {/* DECLARANTE IDENTIFICATION */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-zinc-50 p-3 rounded text-[11px]">
                  <div className="md:col-span-1">
                    <span className="text-[9px] text-zinc-400 block font-bold">5. NIT del contribuyente</span>
                    <span className="font-mono font-bold text-zinc-800 text-[12px]">{currentCompany.nit}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[9px] text-zinc-400 block font-bold">12. Apellidos y Nombres o Razón Social de la Panificadora</span>
                    <span className="font-bold text-zinc-800 text-[12px] uppercase">{currentCompany.name}</span>
                  </div>
                  <div className="md:col-span-1 border-l pl-3">
                    <span className="text-[9px] text-zinc-400 block font-bold">Periodo Declarado</span>
                    <span className="font-bold text-zinc-800 text-[12px] uppercase">
                      Bimestre {selectedPeriod.split('B')[1]} ({selectedPeriod})
                    </span>
                  </div>
                </div>

                {/* FORM FIELDS SECTIONS */}
                <div className="space-y-4">
                  
                  {/* SECCION INGRESOS (SALES) */}
                  <div className="space-y-1.5">
                    <div className="bg-yellow-500/10 text-yellow-750 font-black text-[10px] px-2.5 py-1 rounded uppercase tracking-wider">
                      Sección Ingresos por Ventas (Bases Gravadas)
                    </div>
                    
                    <div className="flex justify-between items-center p-1.5 border-b text-[11px] hover:bg-zinc-50 transition-colors">
                      <span className="text-zinc-600"><strong className="font-mono text-zinc-500 mr-2">27</strong> Ingresos por operaciones gravadas a la tarifa general (19%)</span>
                      <span className="font-mono font-bold text-zinc-800">{formatCOP(salesWithIvaBase)}</span>
                    </div>

                    <div className="flex justify-between items-center p-1.5 border-b text-[11px] hover:bg-zinc-50 transition-colors">
                      <span className="text-zinc-600"><strong className="font-mono text-zinc-500 mr-2">35</strong> Ingresos de exportación exentos de panadería</span>
                      <span className="font-mono font-bold text-zinc-800">{formatCOP(0)}</span>
                    </div>

                    <div className="flex justify-between items-center p-1.5 bg-zinc-100 rounded text-zinc-950 font-bold text-[11.5px]">
                      <span><strong className="font-mono text-zinc-500 mr-2">40</strong> TOTAL INGRESOS BRUTOS EXIGIBLES</span>
                      <span className="font-mono text-zinc-950 font-black">{formatCOP(salesWithIvaBase)}</span>
                    </div>
                  </div>

                  {/* SECCION COMPRAS (ACQUISITIONS) */}
                  <div className="space-y-1.5">
                    <div className="bg-yellow-500/10 text-yellow-750 font-black text-[10px] px-2.5 py-1 rounded uppercase tracking-wider">
                      Sección Compras y Adquisiciones (Base Deductible)
                    </div>
                    
                    <div className="flex justify-between items-center p-1.5 border-b text-[11px] hover:bg-zinc-50 transition-colors">
                      <span className="text-zinc-600"><strong className="font-mono text-zinc-500 mr-2">41</strong> Importación de materias primas e insumos (19%)</span>
                      <span className="font-mono font-bold text-zinc-800">{formatCOP(0)}</span>
                    </div>

                    <div className="flex justify-between items-center p-1.5 border-b text-[11px] hover:bg-zinc-50 transition-colors">
                      <span className="text-zinc-600"><strong className="font-mono text-zinc-500 mr-2">48</strong> Compras nacionales de bienes gravados a la tarifa general</span>
                      <span className="font-mono font-bold text-zinc-800">{formatCOP(purchaseWithIvaBase)}</span>
                    </div>

                    <div className="flex justify-between items-center p-1.5 bg-zinc-100 rounded text-zinc-950 font-bold text-[11.5px]">
                      <span><strong className="font-mono text-zinc-500 mr-2">55</strong> TOTAL COMPRAS BRUTAS ADQUIRIDAS</span>
                      <span className="font-mono text-zinc-950 font-black">{formatCOP(purchaseWithIvaBase)}</span>
                    </div>
                  </div>

                  {/* LIQUIDACION PRIVADA IMPUESTO GENERADO Y DESCONTABLE */}
                  <div className="space-y-1.5">
                    <div className="bg-yellow-500/10 text-yellow-750 font-black text-[10px] px-2.5 py-1 rounded uppercase tracking-wider">
                      Sección Liquidación Privada de IVA (Cálculo del Impuesto)
                    </div>
                    
                    <div className="flex justify-between items-center p-1.5 border-b text-[11px] hover:bg-zinc-50 transition-colors">
                      <span className="text-zinc-600"><strong className="font-mono text-zinc-500 mr-2">58</strong> Impuesto Generado del 19% en Ventas</span>
                      <span className="font-mono font-bold text-emerald-600">{formatCOP(totalIvaGenerado)}</span>
                    </div>

                    <div className="flex justify-between items-center p-1.5 border-b text-[11px] hover:bg-zinc-50 transition-colors">
                      <span className="text-zinc-600"><strong className="font-mono text-zinc-500 mr-2">72</strong> Impuesto Descontable compras nacionales Tarifa General</span>
                      <span className="font-mono font-bold text-zinc-800">{formatCOP(totalIvaDescontable)}</span>
                    </div>

                    <div className="flex justify-between items-center p-1.5 bg-zinc-900 text-white rounded p-2 text-[12px] font-black">
                      {netIvaPayable >= 0 ? (
                        <>
                          <span><strong className="font-mono text-amber-450 mr-2">82</strong> SALDO TOTAL A PAGAR POR ESTE BIMESTRE</span>
                          <span className="font-mono text-yellow-400">{formatCOP(netIvaPayable)}</span>
                        </>
                      ) : (
                        <>
                          <span><strong className="font-mono text-emerald-400 mr-2">83</strong> SALDO A FAVOR COMPUESTO (DEDUCIBLE)</span>
                          <span className="font-mono text-emerald-400">{formatCOP(Math.abs(netIvaPayable))}</span>
                        </>
                      )}
                    </div>
                  </div>

                </div>

                {/* SIGNATURE AND APPROVAL BOX FOR DIAN CO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t-2 border-yellow-500 pt-4 text-[10px] text-zinc-500 leading-normal">
                  <div className="p-3 border rounded text-center bg-zinc-50 space-y-4">
                    <p className="font-bold uppercase">981. Firma del Declarante o Representante Legal</p>
                    <div className="font-mono italic font-bold text-zinc-400 py-2 border-b border-dashed border-zinc-300">
                      Firmado Digitalmente por Edgar Quiñones
                    </div>
                    <span>C.C. 79.452.110 de Bogotá D.C.</span>
                  </div>

                  <div className="p-3 border rounded text-center bg-zinc-50 space-y-4">
                    <p className="font-bold uppercase">982. Firma del Contador Público / Revisor Fiscal</p>
                    <div className="font-mono italic font-bold text-zinc-400 py-2 border-b border-dashed border-zinc-300">
                      Tarjeta Profesional TP. 184541-T
                    </div>
                    <span>Dictinado por Revisor Externo Autorizado</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    className="bg-zinc-800 hover:bg-zinc-750 text-white font-bold text-[11px] px-3.5 py-2.5 rounded-lg flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimir Borrador F-300
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateTaxSettlementVoucher('IVA')}
                    className="bg-yellow-600 hover:bg-yellow-550 text-zinc-950 font-black text-[11px] px-4 py-2.5 rounded-lg flex items-center justify-center gap-1 shadow cursor-pointer font-sans"
                  >
                    <FileCheck className="w-4 h-4" /> Registrar Presentación y Recaudo
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: DETALLE FORMULARIO 350 DIAN (RETENCIONES) */}
          {activeTab === 'f350' && (
            <div className="space-y-4 animate-fade-in">
              <div id="taxes-report-rtf" className="bg-[#FFFFFE] text-zinc-900 p-6 rounded-2xl border-2 border-red-500 shadow-lg space-y-6 max-h-[750px] overflow-y-auto font-sans leading-relaxed">
                
                {/* Form header */}
                <div className="border-b-2 border-red-500 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="flex gap-4 items-center">
                    <div className="bg-red-500 text-[11px] text-white font-black px-3 py-4 rounded font-display tracking-tight text-center shrink-0">
                      FORM. <br /><span className="text-base font-black leading-none text-white">350</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-zinc-950 uppercase tracking-tight text-sm leading-tight">República de Colombia</h4>
                      <h3 className="font-extrabold text-red-600 uppercase tracking-wider text-base font-display">Declaración de Retenciones en la Fuente No. 350</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase block">Borrador de Auditoría Auxiliar en Doble Asiento</p>
                    </div>
                  </div>
                  <div className="p-2 border border-zinc-200 rounded text-center shrink-0">
                    <span className="text-[9px] text-zinc-450 block uppercase font-bold">1. Año Fiscal</span>
                    <strong className="text-sm font-black font-mono text-zinc-900">2026</strong>
                  </div>
                </div>

                {/* Contribution details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-zinc-50 p-3 rounded text-[11px]">
                  <div className="md:col-span-1">
                    <span className="text-[9px] text-zinc-450 block font-bold">5. NIT del agente retenedor</span>
                    <span className="font-mono font-bold text-zinc-900 text-[12px]">{currentCompany.nit}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[9px] text-zinc-450 block font-bold">12. Empresa o Razón Social del declarante</span>
                    <span className="font-bold text-zinc-900 text-[12px] uppercase">{currentCompany.name}</span>
                  </div>
                  <div className="md:col-span-1 border-l pl-3">
                    <span className="text-[9px] text-zinc-450 block font-bold">Concepto Tributo</span>
                    <span className="font-bold text-zinc-900 text-[12px] uppercase">Renta y Autoretención SAS</span>
                  </div>
                </div>

                {/* MAIN FIELDS TABLE WITH DYNAMIC CALCULATED AMOUNTS */}
                <div className="space-y-4">
                  
                  <div className="space-y-1.5">
                    <div className="bg-red-500/10 text-red-750 font-black text-[10px] px-2.5 py-1 rounded uppercase tracking-wider">
                      Retenciones a Título de Impuesto sobre la Renta
                    </div>

                    <div className="flex justify-between items-center p-1.5 border-b text-[11px] hover:bg-zinc-50 transition-colors">
                      <span className="text-zinc-650"><strong className="font-mono text-zinc-450 mr-2">34</strong> Rendimientos Financieros o Dividendos</span>
                      <span className="font-mono font-semibold text-zinc-700">{formatCOP(0)}</span>
                    </div>

                    <div className="flex justify-between items-center p-1.5 border-b text-[11px] hover:bg-zinc-50 transition-colors">
                      <span className="text-zinc-655"><strong className="font-mono text-zinc-450 mr-2">42</strong> Servicios Prestados por Honorarios o Consultorías</span>
                      <span className="font-mono font-semibold text-zinc-700">{formatCOP(0)}</span>
                    </div>

                    <div className="flex justify-between items-center p-1.5 border-b text-[11px] hover:bg-zinc-50 transition-colors">
                      <span className="text-zinc-650"><strong className="font-mono text-zinc-455 mr-2">62</strong> Retenciones efectivas por Compras Generales (2.5%)</span>
                      <span className="font-mono font-bold text-zinc-900">{formatCOP(totalRetencionPracticada)}</span>
                    </div>

                    <div className="flex justify-between items-center p-1.5 border-b text-[11px] hover:bg-zinc-50 transition-colors">
                      <span className="text-zinc-650"><strong className="font-mono text-zinc-450 mr-2">74</strong> Autorretención Especial de Renta (Decreto 2201 SAS)</span>
                      <span className="font-mono font-bold text-red-650">{formatCOP(autoReteTax)}</span>
                    </div>

                    <div className="flex justify-between items-center p-1.5 bg-zinc-900 text-white rounded p-2 text-[12px] font-black">
                      <span><strong className="font-mono text-amber-450 mr-2">85</strong> TOTAL RETENCIONES DEL PERIODO A CONSIGNAR</span>
                      <span className="font-mono text-yellow-450">{formatCOP(totalRetencionPracticada + autoReteTax)}</span>
                    </div>
                  </div>

                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { window.print(); }}
                    className="bg-zinc-850 hover:bg-zinc-800 text-white font-bold text-[11px] px-3.5 py-2.5 rounded-lg flex items-center justify-center gap-1 font-sans cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimir F-350
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateTaxSettlementVoucher('RETEFUENTE')}
                    className="bg-red-600 hover:bg-red-550 text-white font-black text-[11px] px-4 py-2.5 rounded-lg flex items-center justify-center gap-1 shadow-md font-sans cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4" /> Postear Pago de Retenidos en Diario
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: GENERADOR DE CERTIFICADOS FISCALES ART. 381 */}
          {activeTab === 'certificados' && (
            <div className="space-y-4 animate-fade-in text-xs font-sans">
              
              {/* Selector panels for active suppliers */}
              <div className={`p-4 rounded-xl border ${activeTheme.cardStyles} flex flex-col md:flex-row gap-4 items-end justify-between`}>
                <div className="space-y-1.5 grow max-w-sm">
                  <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                    Seleccione Proveedor Beneficiario
                  </label>
                  <select
                    value={selectedSupplierForCert}
                    onChange={(e) => {
                      setSelectedSupplierForCert(e.target.value);
                      setIsCertificatePrinted(false);
                    }}
                    className={`font-semibold rounded-xl w-full px-3 py-2 border outline-none text-xs cursor-pointer ${
                      isDark ? 'bg-zinc-950 border-zinc-805 text-white' : 'bg-slate-50 border-slate-150 text-slate-750'
                    }`}
                  >
                    <option value="">-- Seleccione un proveedor o tercero --</option>
                    {terceros.map(t => (
                      <option key={t.id} value={t.id}>{t.name} (NIT: {t.nit})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 shrink-0">
                  <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Año Certificado</label>
                  <input 
                    type="number"
                    value={certYear}
                    onChange={(e) => setCertYear(e.target.value)}
                    className={`font-mono font-bold text-center w-24 rounded-xl px-3 py-2 border outline-none text-xs ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-150 text-slate-750'
                    }`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!supplierWithholdingsSum) {
                      toast.warning("Este proveedor no presenta retenciones practicadas en el periodo seleccionado.", "Certificado Tributario");
                      return;
                    }
                    setIsCertificatePrinted(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1 text-[11px] leading-none shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" /> Generar Certificado DIAN
                </button>
              </div>

              {/* PRINTABLE LEGAL CERTIFICATE SHEET ACCORDING TO ART 381 E.T. COLOMBIA */}
              {activeSupplier && supplierWithholdingsSum > 0 ? (
                <div id="taxes-certificate" className="bg-[#FFFFFE] text-zinc-900 p-8 rounded-2xl border border-zinc-350 shadow-md space-y-6 font-serif max-w-2xl mx-auto text-[11.5px] leading-relaxed">
                  
                  {/* Formal Certificate Header */}
                  <div className="text-center space-y-1 border-b pb-4">
                    {currentCompany.logoUrl && (
                      <img 
                        src={currentCompany.logoUrl} 
                        alt="Logo" 
                        className="w-16 h-16 object-contain rounded-lg mx-auto mb-2 border border-zinc-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-wide">{currentCompany.name}</h3>
                    <p className="text-[10px] font-sans text-zinc-500 uppercase tracking-wider font-bold">Nit: {currentCompany.nit}</p>
                    <p className="text-[9.5px] font-sans text-zinc-500 leading-none">{currentCompany.address}</p>
                    <div className="pt-3 uppercase font-sans font-black text-zinc-950 text-xs tracking-widest text-center">
                      Certificado de Retención en la Fuente a Título de Renta
                    </div>
                    <p className="text-[9px] font-sans text-zinc-450 italic">
                      Expedido bajo los lineamientos del Artículo 381 del Estatuto Tributario
                    </p>
                  </div>

                  {/* Legal affirmation statement */}
                  <p className="text-justify indent-8 text-xs leading-relaxed">
                    <strong>{currentCompany.name}</strong>, legalmente constituida e identificada tributariamente bajo el Número de Identificación Tributaria <strong>{currentCompany.nit}</strong>, en su calidad de Agente Retenedor del Impuesto sobre la Renta y Complementarios, certifica que practicó retención por concepto de compras generales y/o adquisición de servicios durante el año gravable <strong>{certYear}</strong> al siguiente contribuyente:
                  </p>

                  {/* Beneficiary Identification details */}
                  <div className="bg-zinc-50 p-4 rounded-lg font-sans text-[11px] grid grid-cols-1 md:grid-cols-2 gap-2 border border-zinc-200">
                    <div>
                      <span className="text-[9px] text-zinc-450 block uppercase font-bold">Razón Social del Beneficiario</span>
                      <strong className="text-zinc-900 text-xs uppercase">{activeSupplier.name}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-455 block uppercase font-bold">NIT Identificación</span>
                      <strong className="text-zinc-900 text-xs font-mono">{activeSupplier.nit}</strong>
                    </div>
                    <div className="md:col-span-2 border-t pt-2 mt-1 flex justify-between">
                      <div>
                        <span className="text-[9px] text-zinc-450 block uppercase font-bold">Ciudad Prestación</span>
                        <strong className="text-zinc-900 text-xs uppercase">{activeSupplier.city || 'Colombia'}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-450 block uppercase font-bold">Régimen Contribuyente</span>
                        <strong className="text-zinc-900 text-xs uppercase">{activeSupplier.regimen || 'Responsable de IVA'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Quantitative numbers of base and withheld taxes */}
                  <div className="space-y-2">
                    <span className="font-sans font-bold text-zinc-950 uppercase tracking-wider text-[10px] block">
                      Valores Retenidos Acumulados
                    </span>
                    
                    <div className="border border-zinc-200 rounded-lg overflow-hidden font-sans">
                      <div className="grid grid-cols-12 bg-zinc-100 p-2 text-[9px] font-bold uppercase tracking-wider border-b">
                        <div className="col-span-6">Concepto Retención</div>
                        <div className="col-span-2 text-center">Tarifa %</div>
                        <div className="col-span-2 text-right">Monto Base COP</div>
                        <div className="col-span-2 text-right">Valor Retenido</div>
                      </div>

                      <div className="grid grid-cols-12 p-3 text-[11px] hover:bg-zinc-50 border-b">
                        <div className="col-span-6 font-bold text-zinc-800">
                          Retención por Compras Generales (Art 381) - Panificadora
                        </div>
                        <div className="col-span-2 text-center font-mono">2.5%</div>
                        <div className="col-span-2 text-right font-mono">{formatCOP(supplierWithholdingsBase)}</div>
                        <div className="col-span-2 text-right font-mono font-bold text-zinc-950">{formatCOP(supplierWithholdingsSum)}</div>
                      </div>

                      <div className="grid grid-cols-12 bg-zinc-50 p-2.5 text-[11px] font-extrabold text-zinc-950">
                        <div className="col-span-10 text-right">TOTAL RETENCIÓN CERTIFICADA COMPLETA:</div>
                        <div className="col-span-2 text-right font-mono text-xs">{formatCOP(supplierWithholdingsSum)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Certification footer info disclaimer */}
                  <div className="space-y-4 pt-4 border-t">
                    <p className="text-[10px] text-zinc-500 text-justify tracking-tight font-sans italic">
                      Se expide este borrador informacional en la ciudad de {currentCompany.address.split(',')[1] || 'Bogotá D.C.'}, a los {new Date().getDate()} días del mes de {new Date().toLocaleDateString('es-CO', { month: 'long' })} del año {new Date().getFullYear()}. No requiere firma manuscrita según lo establecido en el Decreto 836 de 1991 Artículo 10.
                    </p>

                    <div className="flex justify-between items-end font-sans pt-4 text-[10px]">
                      <div className="w-1/2">
                        <div className="h-0.5 bg-zinc-350 w-44 mb-1"></div>
                        <strong>Depto de Contabilidad y Tesorería</strong>
                        <span className="block text-zinc-450">{currentCompany.name}</span>
                      </div>
                      <div className="text-right">
                        <strong>Certificado No. RTF-{certYear}-{activeSupplier.nit.slice(0, 4)}</strong>
                        <span className="block text-emerald-600 font-bold">✓ Expedido y verificado en linea</span>
                      </div>
                    </div>
                  </div>

                  {/* Print trigger simulated inside the view */}
                  <div className="flex justify-end p-2 shrink-0 font-sans border-t pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        window.print();
                      }}
                      className="bg-zinc-900 text-slate-100 hover:bg-zinc-800 font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer font-semibold text-xs shadow"
                    >
                      <Download className="w-4 h-4 text-emerald-450" /> Guardar PDF / Imprimir Certificado
                    </button>
                  </div>

                </div>
              ) : (
                <div className={`py-12 border rounded-2xl text-center space-y-2 max-w-lg mx-auto ${activeTheme.cardStyles}`}>
                  <Calculator className="w-8 h-8 mx-auto text-slate-500 opacity-60" />
                  <h4 className="font-bold text-slate-200">No se detectaron retenciones</h4>
                  <p className="text-slate-450 text-[11px] px-12 leading-relaxed">
                    Escoja un tercero válido (ej. Proveedor) en el menú superior para calcular y renderizar el borrador de su Certificado DIAN del impuesto bajo el Artículo 381.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* TAB 5: CALENDARIO EXTRA CTOS Y VENCIMIENTOS DIAN CO */}
          {activeTab === 'calendario' && (
            <div className="space-y-4 animate-fade-in text-xs leading-normal">
              <div className={`p-5 rounded-2xl border ${activeTheme.cardStyles} space-y-4`}>
                <div className="border-b border-white/5 pb-2">
                  <h3 className="font-display font-semibold text-slate-205 text-sm">Cronograma y Vencimientos Tributarios DIAN 2026</h3>
                  <p className="text-slate-450 text-[10.5px]">Basado en el último dígito del NIT del declarante: <strong className="text-slate-200">"{lastNitDigit}"</strong></p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="p-4 bg-zinc-950/45 border border-zinc-800/80 rounded-xl space-y-3">
                    <span className="text-[10px] uppercase font-bold text-blue-400 block tracking-wider">Cronograma del IVA (Formulario 300)</span>
                    <p className="text-[10.5px] text-slate-450 leading-relaxed">
                      La declaración bimestral de IVA vence según el calendario fijado en el Decreto de plazos anuales. Próximas fechas límite estimadas:
                    </p>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 rounded bg-black/20 text-[11px]">
                        <span>Bimestre I (Ene-Feb):</span>
                        <span className="font-mono font-bold text-slate-350">Venció Mar 15, 2026</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-black/20 text-[11px]">
                        <span>Bimestre II (Mar-Abr):</span>
                        <span className="font-mono font-bold text-slate-350">Venció May 18, 2026</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-blue-500/10 border border-blue-500/20 text-[11px]">
                        <span className="text-blue-300 font-bold">Bimestre III (May-Jun):</span>
                        <span className="font-mono font-black text-blue-400">Vence {f300DueDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-950/45 border border-zinc-800/80 rounded-xl space-y-3">
                    <span className="text-[10px] uppercase font-bold text-amber-500 block tracking-wider">Cronograma de Retención (Formulario 350)</span>
                    <p className="text-[10.5px] text-slate-450 leading-relaxed">
                      La declaración mensual de retenciones en la fuente es obligatoria aún si no hay retenciones recaudadas (en ceros). Fechas límite:
                    </p>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 rounded bg-black/20 text-[11px]">
                        <span>Declaración mensual Mayo:</span>
                        <span className="font-mono font-bold text-slate-350">Venció Jun 12, 2026</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px]">
                        <span className="text-amber-300 font-bold">Declaración mensual Junio:</span>
                        <span className="font-mono font-black text-amber-450">Vence {f350DueDate}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-black/20 text-[11px]">
                        <span>Declaración mensual Julio:</span>
                        <span className="font-mono font-bold text-slate-300">Vence Ago 14, 2026</span>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="p-3.5 bg-yellow-500/5 border border-yellow-500/10 rounded-xl leading-normal text-slate-400 text-[11px]">
                  <h4 className="font-bold text-yellow-405 text-[10px] uppercase block mb-1">Régimen de sanciones DIAN</h4>
                  <p>La sanción mínima extemporánea fijada por la ley para el año gravable 2026 asciende a 10 UVT (aprox. $470,000 COP). Recuerde presentar y realizar los pagos electrónicos de impuestos correspondientes para evitar cobros coactivos.</p>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

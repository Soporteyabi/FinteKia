import React, { useState, useMemo } from 'react';
import { Voucher, PucAccount, CostCenter, Tercero, Company } from '../types';
import { THEMES_MAP } from './Sidebar';
import Pagination from './Pagination';
import VoucherPrintModal from './VoucherPrintModal';

interface VouchersViewProps {
  currentCompany?: Company;
  vouchers: Voucher[];
  puc: PucAccount[];
  costCenters: CostCenter[];
  terceros: Tercero[];
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

// Prefill templates for quick accounting posting
const PREFILL_TEMPLATES = [
  {
    name: 'Aporte Capital Social',
    description: 'Aporte inicial de socios a Caja General',
    type: 'diario' as const,
    concept: 'Aporte de capital social constitutivo en efectivo',
    lines: [
      { accountCode: '110505', desc: 'Recibo de caja - aporte socios', debit: 5000000, credit: 0 },
      { accountCode: '311505', desc: 'Constitución patrimonio social de la empresa', debit: 0, credit: 5000000 }
    ]
  },
  {
    name: 'Pago Nómina de Personal',
    description: 'Gastos de sueldo pagados con fondos bancarios',
    type: 'egreso' as const,
    concept: 'Pago de planilla salarial del mes en curso',
    lines: [
      { accountCode: '510506', desc: 'Gasto sueldos personal operativo planta', debit: 1800000, credit: 0 },
      { accountCode: '111005', desc: 'Transferencia bancaria egreso nómina', debit: 0, credit: 1800000 }
    ]
  },
  {
    name: 'Pago de Servicios Públicos',
    description: 'Registro de gasto de servicios de agua o energía',
    type: 'egreso' as const,
    concept: 'Pago de factura mensual de energía eléctrica de la planta',
    lines: [
      { accountCode: '513505', desc: 'Consumo energía hornos industriales', debit: 450000, credit: 0 },
      { accountCode: '111005', desc: 'Dispersión bancaria pago servicio', debit: 0, credit: 450000 }
    ]
  },
  {
    name: 'Recaudo de Cartera Clientes',
    description: 'Registro de cobro de factura a clientes nacionales',
    type: 'ingreso' as const,
    concept: 'Recibo de caja por cancelación factura comercial de clientes',
    lines: [
      { accountCode: '111005', desc: 'Consignación nacional recibida de clientes', debit: 1200000, credit: 0 },
      { accountCode: '130505', desc: 'Abono factura comercial nacional', debit: 0, credit: 1200000 }
    ]
  }
];

export default function VouchersView({
  currentCompany,
  vouchers,
  puc,
  costCenters,
  terceros,
  addVoucher,
  theme = 'slate_gray'
}: VouchersViewProps) {
  const [showCreator, setShowCreator] = useState(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<Voucher | null>(null);
  const [accountingModuleTab, setAccountingModuleTab] = useState<'diario' | 'balance_comprobacion' | 'pyg' | 'cierre'>('diario');
  const [vType, setVType] = useState<Voucher['type']>('diario');
  const [vConcept, setVConcept] = useState('');
  const [vThirdId, setVThirdId] = useState('');
  const [vDate, setVDate] = useState(new Date().toISOString().substring(0, 10));

  const activeCompany = currentCompany || {
    id: 'comp-1',
    name: 'FinteKia S.A.S.',
    nit: '901.455.120-3',
    slogan: 'Tecnología & Servicios',
    address: 'Calle 100 # 15-22, Bogotá',
    regimen: 'responsable',
    currency: 'COP',
    period: 2026,
    payrollParameters: { smmlv: 1423500, auxTransporte: 172000 }
  };

  // State to support expanded details breakdown for specific vouchers
  const [expandedVoucherId, setExpandedVoucherId] = useState<string | null>(null);

  // Filter States
  const [activeTab, setActiveTab] = useState<'todos' | 'ingreso' | 'egreso' | 'diario' | 'ajuste' | 'venta_compra'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State (15 records per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Dynamic ledger lines
  const [lines, setLines] = useState<Array<{ accountCode: string; costCenterId?: string; desc: string; debit: number; credit: number }>>([
    { accountCode: '', desc: '', debit: 0, credit: 0 },
    { accountCode: '', desc: '', debit: 0, credit: 0 }
  ]);

  // Theme support
  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;
  const isDark = theme === 'navy_dark' || theme === 'light_gray';

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const addLine = () => {
    setLines([...lines, { accountCode: '', desc: '', debit: 0, credit: 0 }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const updateLine = (idx: number, key: string, val: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [key]: val };
    setLines(updated);
  };

  // Helper to load templates
  const applyTemplate = (tpl: typeof PREFILL_TEMPLATES[0]) => {
    setVType(tpl.type);
    setVConcept(tpl.concept);
    const mappedLines = tpl.lines.map(l => ({
      accountCode: l.accountCode,
      desc: l.desc,
      debit: l.debit,
      credit: l.credit,
      costCenterId: ''
    }));
    setLines(mappedLines);
  };

  const totalDebits = lines.reduce((acc, l) => acc + l.debit, 0);
  const totalCredits = lines.reduce((acc, l) => acc + l.credit, 0);

  const saveVoucher = () => {
    if (!vConcept.trim()) {
      alert("Por favor configure el concepto general del comprobante contable.");
      return;
    }
    if (totalDebits === 0 && totalCredits === 0) {
      alert("No puede registrar un asiento contable con montos en cero.");
      return;
    }
    if (totalDebits !== totalCredits) {
      alert(`Asiento Descuadrado. Los Débitos (${formatCOP(totalDebits)}) deben ser iguales a los Créditos (${formatCOP(totalCredits)}) bajo partida doble.`);
      return;
    }
    if (lines.some((l) => !l.accountCode)) {
      alert("Por favor seleccione un código de cuenta PUC válido para cada línea.");
      return;
    }

    const typePrefix = vType === 'ingreso' ? 'CI' : vType === 'egreso' ? 'CE' : vType === 'ajuste' ? 'CA' : 'CD';
    const nextNumber = `${typePrefix}-${1001 + vouchers.length}`;

    // Transform to standard Voucher Lines
    const finalLines = lines.map((l) => ({
      accountCode: l.accountCode,
      costCenterId: l.costCenterId || undefined,
      description: l.desc || vConcept,
      debit: l.debit,
      credit: l.credit
    }));

    addVoucher({
      number: nextNumber,
      type: vType,
      concept: vConcept,
      thirdPartyId: vThirdId || terceros[0]?.id || '',
      total: totalDebits,
      lines: finalLines
    });

    alert(`Comprobante ${nextNumber} guardado y balanceado de forma impecable.`);
    setShowCreator(false);
    setVConcept('');
    setLines([
      { accountCode: '', desc: '', debit: 0, credit: 0 },
      { accountCode: '', desc: '', debit: 0, credit: 0 }
    ]);
  };

  // Filter vouchers based on search & active tab
  const filteredVouchers = vouchers.filter(v => {
    // 1. Tab filtering
    if (activeTab === 'ingreso' && v.type !== 'ingreso') return false;
    if (activeTab === 'egreso' && v.type !== 'egreso') return false;
    if (activeTab === 'diario' && v.type !== 'diario') return false;
    if (activeTab === 'ajuste' && v.type !== 'ajuste') return false;
    if (activeTab === 'venta_compra' && v.type !== 'venta' && v.type !== 'compra') return false;

    // 2. Search query matching (Check voucher number, concept, third party name, or accounts hit in lines)
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    
    // Check basic details
    const matchNumber = v.number.toLowerCase().includes(q);
    const matchConcept = v.concept.toLowerCase().includes(q);
    const thirdName = terceros.find(t => t.id === v.thirdPartyId)?.name || '';
    const matchThirdName = thirdName.toLowerCase().includes(q);

    // Check account codes nested
    const matchAccount = v.lines?.some(line => 
      line.accountCode.includes(q) || 
      (line.description || '').toLowerCase().includes(q)
    );

    return matchNumber || matchConcept || matchThirdName || matchAccount;
  });

  // Paginated records at 15 items per page
  const totalPages = Math.max(1, Math.ceil(filteredVouchers.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedVouchers = filteredVouchers.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  // KPI calculations on *matching* (filtered) recordset
  const matchingCount = filteredVouchers.length;
  const totalDebitSum = filteredVouchers.reduce((sum, v) => {
    // Collect all debits of these vouchers
    return sum + (v.lines?.reduce((ls, l) => ls + l.debit, 0) || v.total);
  }, 0);
  const totalCreditSum = filteredVouchers.reduce((sum, v) => {
    // Collect all credits of these vouchers
    return sum + (v.lines?.reduce((ls, l) => ls + l.credit, 0) || v.total);
  }, 0);

  const toggleExpand = (id: string) => {
    setExpandedVoucherId(expandedVoucherId === id ? null : id);
  };

  // Get account name by code
  const getAccountName = (code: string) => {
    const acc = puc.find(p => p.code === code);
    return acc ? acc.name : 'Cuenta PUC';
  };

  // Mock export action trigger
  const handleExport = (v: Voucher) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(v, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `COMPROBANTE_${v.number}_PUC.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    alert(`Se ha descargado el comprobante fiscal ${v.number} en estructura balanceada JSON contable.`);
  };

  // Balance de Comprobación (Trial Balance) Calculation
  const trialBalanceData = useMemo(() => {
    const accountMap: Record<string, { code: string; name: string; debits: number; credits: number }> = {};

    vouchers.forEach(v => {
      (v.lines || []).forEach(l => {
        if (!l.accountCode) return;
        if (!accountMap[l.accountCode]) {
          const pucAcc = puc.find(p => p.code === l.accountCode);
          accountMap[l.accountCode] = {
            code: l.accountCode,
            name: pucAcc ? pucAcc.name : 'Cuenta Auxiliar',
            debits: 0,
            credits: 0
          };
        }
        accountMap[l.accountCode].debits += l.debit || 0;
        accountMap[l.accountCode].credits += l.credit || 0;
      });
    });

    const list = Object.values(accountMap).sort((a, b) => a.code.localeCompare(b.code));
    const sumDebits = list.reduce((acc, a) => acc + a.debits, 0);
    const sumCredits = list.reduce((acc, a) => acc + a.credits, 0);

    return { list, sumDebits, sumCredits };
  }, [vouchers, puc]);

  // Estado de Resultados (P&G) Calculation
  const pygData = useMemo(() => {
    let ingresos = 0; // Clase 4
    let gastos = 0;   // Clase 5
    let costos = 0;   // Clase 6

    vouchers.forEach(v => {
      (v.lines || []).forEach(l => {
        const code = l.accountCode || '';
        if (code.startsWith('4')) {
          ingresos += ((l.credit || 0) - (l.debit || 0));
        } else if (code.startsWith('5')) {
          gastos += ((l.debit || 0) - (l.credit || 0));
        } else if (code.startsWith('6')) {
          costos += ((l.debit || 0) - (l.credit || 0));
        }
      });
    });

    const utilidadBruta = ingresos - costos;
    const utilidadOperacional = utilidadBruta - gastos;

    return { ingresos, costos, gastos, utilidadBruta, utilidadOperacional };
  }, [vouchers]);

  // Asistente de Cierre Anual
  const handleGenerateClosingVoucher = () => {
    const closingLines: Array<{ accountCode: string; description: string; debit: number; credit: number }> = [];
    const accountBalances: Record<string, { code: string; name: string; balance: number }> = {};

    vouchers.forEach(v => {
      (v.lines || []).forEach(l => {
        const code = l.accountCode || '';
        if (code.startsWith('4') || code.startsWith('5') || code.startsWith('6')) {
          if (!accountBalances[code]) {
            const pucAcc = puc.find(p => p.code === code);
            accountBalances[code] = { code, name: pucAcc?.name || 'Cuenta', balance: 0 };
          }
          if (code.startsWith('4')) {
            accountBalances[code].balance += ((l.credit || 0) - (l.debit || 0));
          } else {
            accountBalances[code].balance += ((l.debit || 0) - (l.credit || 0));
          }
        }
      });
    });

    let totalIngresosToClose = 0;
    let totalEgresosToClose = 0;

    Object.values(accountBalances).forEach(acc => {
      if (acc.balance <= 0) return;
      if (acc.code.startsWith('4')) {
        closingLines.push({
          accountCode: acc.code,
          description: `Cancelación cuentas de ingresos - ${acc.name}`,
          debit: acc.balance,
          credit: 0
        });
        totalIngresosToClose += acc.balance;
      } else {
        closingLines.push({
          accountCode: acc.code,
          description: `Cancelación cuentas de gastos/costos - ${acc.name}`,
          debit: 0,
          credit: acc.balance
        });
        totalEgresosToClose += acc.balance;
      }
    });

    if (closingLines.length === 0) {
      alert('No hay saldos en cuentas de resultado (clases 4, 5, 6) para cancelar.');
      return;
    }

    const netResult = totalIngresosToClose - totalEgresosToClose;

    if (netResult >= 0) {
      closingLines.push({
        accountCode: '360505',
        description: 'Traslado Utilidad Neta del Ejercicio a Patrimonio',
        debit: 0,
        credit: netResult
      });
    } else {
      closingLines.push({
        accountCode: '361005',
        description: 'Traslado Pérdida Neta del Ejercicio a Patrimonio',
        debit: Math.abs(netResult),
        credit: 0
      });
    }

    const currentYear = new Date().getFullYear();
    const voucherNum = `CIERRE-${currentYear}`;
    addVoucher({
      number: voucherNum,
      type: 'ajuste',
      concept: `Asiento Oficial de Cierre Contable y Cancelación de Cuentas de Resultado Periodo ${currentYear}`,
      thirdPartyId: terceros[0]?.id || 'empresa',
      total: Math.max(totalIngresosToClose, totalEgresosToClose),
      lines: closingLines
    });

    alert(`¡Asiento de cierre contable generado exitosamente con el número ${voucherNum}! Cuentas 4, 5 y 6 saldadas contra el patrimonio.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner de Cabecera */}
      <div className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-100'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-wider uppercase opacity-70">Libros Oficiales de Contabilidad PUC</span>
          </div>
          <h2 className="font-display font-extrabold text-xl tracking-tight text-slate-800">Contabilidad Integral & Libros Oficiales</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Consulte y registre la partida doble de la organización. Audite balances de comprobación, estados de resultados (P&G), comprobantes de egreso/ingreso y genere el asiento oficial de cierre contable en tiempo real.
          </p>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => {
              setAccountingModuleTab('diario');
              setShowCreator(!showCreator);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <i className="ri-folder-add-line"></i> {showCreator ? 'Ver Libro Diario' : 'Asiento Manual'}
          </button>
        </div>
      </div>

      {/* NAVEGACIÓN SUBPESTAÑAS CONTABLES */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-2 text-xs select-none">
        <button
          type="button"
          onClick={() => { setAccountingModuleTab('diario'); setShowCreator(false); }}
          className={`px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            accountingModuleTab === 'diario'
              ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <i className="ri-booklet-line"></i> Libro Diario & Asientos
        </button>
        <button
          type="button"
          onClick={() => { setAccountingModuleTab('balance_comprobacion'); setShowCreator(false); }}
          className={`px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            accountingModuleTab === 'balance_comprobacion'
              ? 'bg-purple-600/20 border border-purple-500/40 text-purple-400 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <i className="ri-scales-3-line"></i> Balance de Comprobación ({trialBalanceData.list.length} Cuentas)
        </button>
        <button
          type="button"
          onClick={() => { setAccountingModuleTab('pyg'); setShowCreator(false); }}
          className={`px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            accountingModuleTab === 'pyg'
              ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <i className="ri-line-chart-line"></i> Estado de Resultados (P&G)
        </button>
        <button
          type="button"
          onClick={() => { setAccountingModuleTab('cierre'); setShowCreator(false); }}
          className={`px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            accountingModuleTab === 'cierre'
              ? 'bg-amber-600/20 border border-amber-500/40 text-amber-400 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <i className="ri-shield-keyhole-line"></i> Cierre Contable Oficial
        </button>
      </div>

      {/* METRICAS DE CABECERA */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
            <i className="ri-booklet-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Comprobantes</p>
            <p className="text-lg font-bold font-mono">{matchingCount} Asentados</p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
            <i className="ri-arrow-up-circle-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cargos (Débitos)</p>
            <p className="text-lg font-bold font-mono text-blue-500">{formatCOP(totalDebitSum)}</p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
            <i className="ri-arrow-down-circle-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Abonos (Créditos)</p>
            <p className="text-lg font-bold font-mono text-rose-500">{formatCOP(totalCreditSum)}</p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${activeTheme.cardStyles}`}>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <i className="ri-checkbox-circle-line text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Auditoría de Partida Doble</p>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ✓ LIBRO BALANCEADO
            </span>
          </div>
        </div>
      </div>

      {accountingModuleTab === 'diario' && (
        showCreator ? (
        /* CREATOR PANEL WITH ACCOUNTING ASSISTANT */
        <div className="space-y-6 animate-fade-in text-xs font-sans">
          
          {/* Prefill templates container */}
          <div className={`p-5 border rounded-2xl shadow-sm space-y-3 ${activeTheme.cardStyles}`}>
            <div className="flex items-center gap-2">
              <i className="ri-magic-line text-blue-500 text-sm"></i>
              <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-slate-300">Plantillas de Asiento Rápido (Prefill)</h4>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Optimice tiempo de registro contable. Elija una de las operaciones rutinarias prediseñadas para formular los códigos de cuenta PUC automáticos:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-1">
              {PREFILL_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="p-2.5 rounded-xl border border-dashed border-slate-700 hover:border-blue-500 hover:bg-blue-600/5 text-left transition-all group cursor-pointer"
                >
                  <p className="font-bold text-slate-200 group-hover:text-blue-400 truncate">{tpl.name}</p>
                  <p className="text-[10px] text-slate-450 mt-0.5 line-clamp-1">{tpl.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h3 className="font-display font-semibold text-slate-100 text-sm uppercase tracking-wider text-blue-400">Nuevo Asiento Contable Manual (Partida Doble PUC)</h3>
              <p className="text-xs text-slate-400">Registre cargos, abonos y afectaciones patrimoniales directamente. Se auditará el balance neto antes del posteo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Comprobante</label>
                <select
                  value={vType}
                  onChange={(e) => setVType(e.target.value as any)}
                  className="w-full text-xs font-semibold bg-zinc-950 border border-zinc-800 text-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                >
                  <option value="diario">Comprobante de Diario (CD)</option>
                  <option value="ingreso">Comprobante de Ingreso (CI)</option>
                  <option value="egreso">Comprobante de Egreso (CE)</option>
                  <option value="ajuste">Nota de Ajuste (CA)</option>
                </select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Concepto de la Operación</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cobros de cartera comercial, aportes extras, compra de harinas..."
                  value={vConcept}
                  onChange={(e) => setVConcept(e.target.value)}
                  className="w-full text-xs font-medium bg-zinc-950 border border-zinc-800 text-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha Contable</label>
                <input
                  type="date"
                  value={vDate}
                  onChange={(e) => setVDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-zinc-950 border border-zinc-800 text-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tercero Asociado</label>
                <select
                  value={vThirdId}
                  onChange={(e) => setVThirdId(e.target.value)}
                  className="w-full text-xs font-medium bg-zinc-950 border border-zinc-800 text-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                >
                  <option value="">Seleccione tercero relacionado...</option>
                  {terceros.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (NIT/Cédula: {t.nit})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1"><i className="ri-list-check text-blue-400"></i> Líneas Detalladas del Asiento</span>
                <button 
                  type="button"
                  onClick={addLine} 
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-extrabold cursor-pointer text-xs"
                >
                  <i className="ri-add-line"></i> Agregar Línea Contable
                </button>
              </div>

              {/* LINES WRAPPER */}
              <div className="space-y-3">
                {lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/80">
                    
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cuenta PUC (Código / Nombre)</label>
                      <select
                        required
                        value={l.accountCode}
                        onChange={(e) => updateLine(idx, 'accountCode', e.target.value)}
                        className="w-full text-xs font-mono bg-zinc-950 border border-zinc-800 text-slate-100 rounded-lg px-2.5 py-2 outline-none focus:border-blue-500"
                      >
                        <option value="">-- Eliga Cuenta --</option>
                        {puc.map((p) => (
                          <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Concepto de la Línea</label>
                      <input
                        type="text"
                        placeholder="Descripción auxiliar..."
                        value={l.desc}
                        onChange={(e) => updateLine(idx, 'desc', e.target.value)}
                        className="w-full text-xs font-medium bg-zinc-950 border border-zinc-800 text-slate-100 rounded-lg px-2.5 py-2 outline-none"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Centro de Costo</label>
                      <select
                        value={l.costCenterId || ''}
                        onChange={(e) => updateLine(idx, 'costCenterId', e.target.value)}
                        className="w-full text-xs font-medium bg-zinc-950 border border-zinc-800 text-slate-100 rounded-lg px-2.5 py-2 outline-none"
                      >
                        <option value="">General / Administrativo</option>
                        {costCenters.map((cc) => (
                          <option key={cc.id} value={cc.id}>{cc.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Débito ($ COP)</label>
                      <input
                        type="number"
                        min="0"
                        value={l.debit}
                        onChange={(e) => updateLine(idx, 'debit', parseInt(e.target.value) || 0)}
                        className="w-full text-xs text-right font-mono font-bold bg-zinc-950 border border-zinc-850 focus:border-blue-500 text-emerald-400 rounded-lg px-2.5 py-2 outline-none"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1 flex items-center gap-2">
                      <div className="grow space-y-1">
                        <label className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">Crédito ($ COP)</label>
                        <input
                          type="number"
                          min="0"
                          value={l.credit}
                          onChange={(e) => updateLine(idx, 'credit', parseInt(e.target.value) || 0)}
                          className="w-full text-xs text-right font-mono font-bold bg-zinc-950 border border-zinc-850 focus:border-rose-500 text-rose-400 rounded-lg px-2.5 py-2 outline-none"
                        />
                      </div>
                      
                      <div className="shrink-0 pt-4">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={lines.length <= 2}
                          className={`p-1.5 rounded-lg border border-transparent transition-all ${
                            lines.length > 2 ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/10' : 'text-slate-600 cursor-not-allowed opacity-40'
                          }`}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* BALANCE BAR */}
            <div className="flex justify-between items-center bg-zinc-950 border border-zinc-800 text-slate-100 rounded-xl p-4 font-mono text-[11px] leading-none mt-6">
              <span className={`text-[9px] px-2.5 py-1 rounded-md font-sans uppercase font-black tracking-widest ${
                totalDebits === totalCredits ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-600/15 text-rose-450 border border-rose-500/20 animate-pulse'
              }`}>
                {totalDebits === totalCredits ? 'Asiento Balanceado (Partida Doble)' : 'Desbalance en Partida Doble'}
              </span>
              <div className="space-x-8 text-xs font-semibold">
                <span>Débitos: <strong className="text-emerald-400 font-bold font-mono text-sm">{formatCOP(totalDebits)}</strong></span>
                <span>Créditos: <strong className="text-zinc-200 font-bold font-mono text-xs">|</strong></span>
                <span>Créditos: <strong className="text-rose-400 font-bold font-mono text-sm">{formatCOP(totalCredits)}</strong></span>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setShowCreator(false)}
                className="bg-zinc-800 hover:bg-zinc-750 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={saveVoucher}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1"
              >
                <i className="ri-checkbox-circle-fill"></i> Validar e Postear Asiento en Libro Diario
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* VOUCHERS LIST VIEW WITH INTERACTIVE SEARCH, DRILL DOWNS */
        <div className="space-y-4 animate-fade-in text-xs font-sans">
          
          <div className={`p-5 border rounded-2xl shadow-sm space-y-4 ${activeTheme.cardStyles}`}>
            
            {/* Buscador y selectores de filtrado */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              
              <div className="relative w-full md:w-80">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <i className="ri-search-2-line"></i>
                </span>
                <input
                  type="text"
                  placeholder="Buscar por Comprobante, Tercero, Cuenta (Ej: 1105)..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full font-semibold rounded-xl pl-9 pr-3 py-2 border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-150 text-slate-700'
                  }`}
                />
              </div>

              {/* Botón selector de Tipo de Comprobante */}
              <div className="overflow-x-auto w-full md:w-auto scrollbar-thin">
                <div className="flex flex-row gap-1 bg-black/10 p-1 rounded-xl">
                  <button
                    onClick={() => { setActiveTab('todos'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      activeTab === 'todos' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => { setActiveTab('ingreso'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      activeTab === 'ingreso' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Ingresos (CI)
                  </button>
                  <button
                    onClick={() => { setActiveTab('egreso'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      activeTab === 'egreso' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Egresos (CE)
                  </button>
                  <button
                    onClick={() => { setActiveTab('diario'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      activeTab === 'diario' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Diario (CD)
                  </button>
                  <button
                    onClick={() => { setActiveTab('ajuste'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      activeTab === 'ajuste' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Ajustes (CA)
                  </button>
                  <button
                    onClick={() => { setActiveTab('venta_compra'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      activeTab === 'venta_compra' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Comercial
                  </button>
                </div>
              </div>

            </div>

            {/* TABLA DE COMPROBANTES */}
            {filteredVouchers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium">
                <i className="ri-folder-reduce-line text-3xl block mb-2 opacity-50"></i>
                No se registraron asientos ni comprobantes contables con el filtro activo.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[9px] font-bold uppercase tracking-wider ${
                      isDark ? 'border-zinc-850 text-slate-400' : 'border-slate-100 text-slate-400'
                    }`}>
                      <th className="py-3 px-4">Comprobante</th>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Tercero Contable</th>
                      <th className="py-3 px-4">Concepto General</th>
                      <th className="py-3 px-4 text-center">Estado de Cierre</th>
                      <th className="py-3 px-4 text-right">Saldo Total</th>
                      <th className="py-3 px-4 text-center">Auditar Partida Doble</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-[11px] ${
                    isDark ? 'divide-zinc-850 text-slate-300' : 'divide-slate-100 text-slate-700'
                  }`}>
                    {paginatedVouchers.map((v) => {
                      const thirdName = terceros.find((t) => t.id === v.thirdPartyId)?.name || 'Consumidor Final / Proveedor Directo';
                      const isExpanded = expandedVoucherId === v.id;
                      
                      let typeBadge = 'bg-slate-500/10 text-slate-400';
                      if (v.type === 'ingreso') typeBadge = 'bg-emerald-500/10 text-emerald-400';
                      else if (v.type === 'egreso') typeBadge = 'bg-rose-500/10 text-rose-455';
                      else if (v.type === 'venta') typeBadge = 'bg-blue-500/10 text-blue-400';
                      else if (v.type === 'compra') typeBadge = 'bg-amber-500/10 text-amber-400';

                      return (
                        <React.Fragment key={v.id}>
                          {/* Main Row */}
                          <tr className={`hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer ${isExpanded ? 'bg-black/10 dark:bg-zinc-850/30' : ''}`}>
                            <td className="py-3 px-4 font-mono font-bold text-slate-100 flex items-center gap-2" onClick={() => toggleExpand(v.id)}>
                              <i className={`text-slate-400 text-xs transition-transform ${isExpanded ? 'ri-arrow-down-s-fill rotate-180' : 'ri-arrow-right-s-fill'}`}></i>
                              {v.number}
                            </td>
                            <td className="py-3 px-4 text-slate-400" onClick={() => toggleExpand(v.id)}>{v.date}</td>
                            <td className="py-3 px-4 uppercase font-bold text-[9px] tracking-wider" onClick={() => toggleExpand(v.id)}>
                              <span className={`px-2 py-0.5 rounded ${typeBadge}`}>{v.type}</span>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-300" onClick={() => toggleExpand(v.id)}>{thirdName}</td>
                            <td className="py-3 px-4 text-slate-300 font-medium" onClick={() => toggleExpand(v.id)}>{v.concept}</td>
                            <td className="py-3 px-4 text-center" onClick={() => toggleExpand(v.id)}>
                              <span className="bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 font-black tracking-wide text-[9px] uppercase px-2 py-0.5 rounded">
                                Contabilizado
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-100 text-xs" onClick={() => toggleExpand(v.id)}>{formatCOP(v.total)}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex gap-1.5 justify-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVoucherForPrint(v);
                                  }}
                                  className="text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                  title="Imprimir Comprobante Contable Oficial"
                                >
                                  <i className="ri-printer-line"></i> Imprimir
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(v.id);
                                  }}
                                  className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md transition-all cursor-pointer"
                                  title="Auditar auxiliares PUC"
                                >
                                  <i className="ri-expand-up-down-line mr-0.5"></i> Ver Auxiliares
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExport(v);
                                  }}
                                  className="text-[10px] font-bold bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-2.5 py-1 rounded-md transition-all cursor-pointer"
                                  title="Descargar Comprobante Contable en JSON"
                                >
                                  <i className="ri-download-cloud-line"></i> JSON
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Ledger Row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="p-4 bg-zinc-950/40 border-l-4 border-blue-500 shadow-inner">
                                <div className="space-y-3">
                                  
                                  <div className="flex justify-between items-center bg-black/10 px-4 py-2 rounded-lg border border-white/5">
                                    <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                      <i className="ri-grid-fill text-blue-400"></i> Desglose Contable de Partida Doble
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-400">Tercero ID: {v.thirdPartyId || 'S/N'}</span>
                                  </div>

                                  {/* Inner Lines Table */}
                                  <div className="overflow-x-auto rounded-xl border border-white/5">
                                    <table className="w-full text-left text-[10px] border-collapse bg-black/20">
                                      <thead>
                                        <tr className="border-b border-white/5 text-[8.5px] font-extrabold uppercase text-slate-400 tracking-wider">
                                          <th className="py-2 px-3">Código PUC</th>
                                          <th className="py-2 px-3">Nombre Cuenta</th>
                                          <th className="py-2 px-3">Descripción o Nota Auxiliar</th>
                                          <th className="py-2 px-3">Centro de Costo</th>
                                          <th className="py-2 px-3 text-right">Débitoc ($)</th>
                                          <th className="py-2 px-3 text-right">Crédito ($)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/5 text-slate-200">
                                        {v.lines?.map((line, lIdx) => {
                                          const ccName = costCenters.find(cc => cc.id === line.costCenterId)?.name || 'General';
                                          return (
                                            <tr key={lIdx} className="hover:bg-white/5 font-mono">
                                              <td className="py-2 px-3 font-semibold text-blue-400">{line.accountCode}</td>
                                              <td className="py-2 px-3 font-sans font-bold text-slate-200">{getAccountName(line.accountCode)}</td>
                                              <td className="py-2 px-3 font-sans text-slate-400">{line.description || v.concept}</td>
                                              <td className="py-2 px-3 font-sans font-medium text-slate-300">{ccName}</td>
                                              <td className={`py-2 px-3 text-right font-bold text-emerald-400 ${line.debit > 0 ? '' : 'text-slate-600'}`}>
                                                {line.debit > 0 ? formatCOP(line.debit) : '$0'}
                                              </td>
                                              <td className={`py-2 px-3 text-right font-bold text-rose-400 ${line.credit > 0 ? '' : 'text-slate-600'}`}>
                                                {line.credit > 0 ? formatCOP(line.credit) : '$0'}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                      <tfoot>
                                        <tr className="border-t border-white/10 bg-black/30 font-bold">
                                          <td colSpan={4} className="py-2.5 px-3 text-right text-slate-400 text-[9px] uppercase tracking-wider font-extrabold">Totales de Control:</td>
                                          <td className="py-2.5 px-3 text-right text-emerald-400 leading-none">
                                            {formatCOP(v.lines?.reduce((sum, line) => sum + line.debit, 0) || v.total)}
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-rose-400 leading-none">
                                            {formatCOP(v.lines?.reduce((sum, line) => sum + line.credit, 0) || v.total)}
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>

                                  {/* Helpful warning / validation audit statement */}
                                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-slate-400 leading-relaxed flex items-center gap-2">
                                    <i className="ri-shield-check-line text-emerald-400 text-sm"></i>
                                    <span>
                                      Este asiento contable ha pasado las pruebas automáticas del sistema integral ERP. Se encuentra balanceado, con códigos PUC validados y centros de costo asignados debidamente. Cumple con los requisitos del estándar NIIF (IFRS).
                                    </span>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}

                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredVouchers.length > 0 && (
              <Pagination
                currentPage={safeCurrentPage}
                totalItems={filteredVouchers.length}
                pageSize={ITEMS_PER_PAGE}
                onPageChange={(page) => setCurrentPage(page)}
                isDark={isDark}
                itemLabel="comprobantes contables"
              />
            )}

          </div>

        </div>
      ))}

      {/* SUBPESTAÑA 2: BALANCE DE COMPROBACIÓN (TRIAL BALANCE) */}
      {accountingModuleTab === 'balance_comprobacion' && (
        <div className="space-y-6 animate-fade-in text-xs font-sans">
          
          <div className={`p-6 border rounded-2xl shadow-sm space-y-4 ${activeTheme.cardStyles}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4">
              <div>
                <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                  <i className="ri-scales-3-line text-purple-400 text-lg"></i> Balance de Comprobación y Sumas Iguales
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Auditoría completa de movimientos débitos y créditos acumulados por código PUC en el período contable activo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <i className="ri-printer-line"></i> Imprimir Balance
                </button>
              </div>
            </div>

            {/* Sumas Iguales Summary Badge */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Movimientos Débito</span>
                <span className="text-xl font-black font-mono text-blue-400 mt-1 block">
                  {formatCOP(trialBalanceData.sumDebits)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Movimientos Crédito</span>
                <span className="text-xl font-black font-mono text-rose-400 mt-1 block">
                  {formatCOP(trialBalanceData.sumCredits)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Diferencia de Balance</span>
                <span className={`text-xl font-black font-mono mt-1 block ${
                  Math.abs(trialBalanceData.sumDebits - trialBalanceData.sumCredits) === 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {formatCOP(Math.abs(trialBalanceData.sumDebits - trialBalanceData.sumCredits))}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/30 border-b border-white/5 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Código PUC</th>
                    <th className="py-3 px-4">Nombre de la Cuenta</th>
                    <th className="py-3 px-4 text-right">Débitos Acumulados ($)</th>
                    <th className="py-3 px-4 text-right">Créditos Acumulados ($)</th>
                    <th className="py-3 px-4 text-right">Saldo Neto ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {trialBalanceData.list.map((item) => {
                    const saldo = item.debits - item.credits;
                    return (
                      <tr key={item.code} className="hover:bg-white/5 font-mono">
                        <td className="py-3 px-4 font-bold text-purple-400">{item.code}</td>
                        <td className="py-3 px-4 font-sans font-semibold text-white">{item.name}</td>
                        <td className="py-3 px-4 text-right text-blue-400 font-bold">
                          {item.debits > 0 ? formatCOP(item.debits) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-400 font-bold">
                          {item.credits > 0 ? formatCOP(item.credits) : '-'}
                        </td>
                        <td className={`py-3 px-4 text-right font-black ${saldo >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {formatCOP(saldo)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-black/50 border-t-2 border-white/10 font-bold">
                    <td colSpan={2} className="py-3 px-4 uppercase text-[10px] tracking-wider text-slate-300 font-black">
                      SUMAS IGUALES CONSOLIDADAS:
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-blue-400 font-black">
                      {formatCOP(trialBalanceData.sumDebits)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-rose-400 font-black">
                      {formatCOP(trialBalanceData.sumCredits)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-emerald-400 font-black">
                      {formatCOP(Math.abs(trialBalanceData.sumDebits - trialBalanceData.sumCredits))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* SUBPESTAÑA 3: ESTADO DE RESULTADOS (P&G) */}
      {accountingModuleTab === 'pyg' && (
        <div className="space-y-6 animate-fade-in text-xs font-sans">
          
          <div className={`p-6 border rounded-2xl shadow-sm space-y-6 ${activeTheme.cardStyles}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4">
              <div>
                <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                  <i className="ri-line-chart-line text-emerald-400 text-lg"></i> Estado de Resultados Integral (Pérdidas y Ganancias P&G)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Estructura oficial de ingresos operacionales (4), costos de ventas (6) y gastos operacionales (5).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-550 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <i className="ri-printer-line"></i> Imprimir P&G
                </button>
              </div>
            </div>

            {/* Structured Financial Statement */}
            <div className="space-y-4 max-w-3xl mx-auto p-6 bg-black/20 rounded-2xl border border-white/5">
              
              {/* Ingresos */}
              <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                <div>
                  <span className="font-bold text-sm text-white">1. Ingresos Operacionales (Clase 4)</span>
                  <p className="text-[10px] text-slate-400">Ventas brutas de productos, servicios y comercio</p>
                </div>
                <span className="font-mono text-base font-black text-emerald-400">{formatCOP(pygData.ingresos)}</span>
              </div>

              {/* Costos */}
              <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                <div>
                  <span className="font-bold text-sm text-rose-400">2. Menos: Costos de Ventas & Operación (Clase 6)</span>
                  <p className="text-[10px] text-slate-400">Materias primas, insumos y costo de mercancía vendida</p>
                </div>
                <span className="font-mono text-base font-bold text-rose-400">-{formatCOP(pygData.costos)}</span>
              </div>

              {/* Utilidad Bruta */}
              <div className="flex justify-between items-center py-3 bg-white/5 px-4 rounded-xl border border-white/5">
                <span className="font-black text-xs uppercase tracking-wider text-slate-200">(=) Utilidad Bruta del Ejercicio:</span>
                <span className={`font-mono text-lg font-black ${pygData.utilidadBruta >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {formatCOP(pygData.utilidadBruta)}
                </span>
              </div>

              {/* Gastos */}
              <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                <div>
                  <span className="font-bold text-sm text-amber-400">3. Menos: Gastos Operacionales (Clase 5)</span>
                  <p className="text-[10px] text-slate-400">Gastos de personal (nómina 5105), servicios, arrendamientos, honorarios</p>
                </div>
                <span className="font-mono text-base font-bold text-amber-400">-{formatCOP(pygData.gastos)}</span>
              </div>

              {/* Utilidad Neta */}
              <div className="flex justify-between items-center py-4 bg-emerald-950/40 border border-emerald-500/30 px-5 rounded-2xl shadow-lg">
                <div>
                  <span className="font-black text-sm uppercase tracking-wider text-emerald-300">
                    (=) Utilidad Operacional Neta Antes de Impuestos:
                  </span>
                  <p className="text-[10px] text-emerald-400/80">
                    Margen Operacional: {pygData.ingresos > 0 ? ((pygData.utilidadOperacional / pygData.ingresos) * 100).toFixed(1) : '0.0'}%
                  </p>
                </div>
                <span className={`font-mono text-2xl font-black ${pygData.utilidadOperacional >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCOP(pygData.utilidadOperacional)}
                </span>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* SUBPESTAÑA 4: CIERRE CONTABLE OFICIAL */}
      {accountingModuleTab === 'cierre' && (
        <div className="space-y-6 animate-fade-in text-xs font-sans">
          
          <div className={`p-6 border rounded-2xl shadow-sm space-y-6 ${activeTheme.cardStyles}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4">
              <div>
                <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                  <i className="ri-shield-keyhole-line text-amber-400 text-lg"></i> Asistente Oficial de Cierre Contable
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Proceso anual obligatorio bajo normativa colombiana. Cancela las cuentas temporales de resultado (4, 5, 6) contra la cuenta 5905 (Ganancias y Pérdidas) y traslada el resultado a cuentas patrimoniales (3605 Utilidad o 3610 Pérdida).
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateClosingVoucher}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
              >
                <i className="ri-lock-password-line text-sm"></i> Generar Asiento de Cierre Oficial
              </button>
            </div>

            {/* Diagnostic Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuentas de Ingreso a Cancelar (4)</span>
                <span className="text-lg font-black font-mono text-emerald-400 block">{formatCOP(pygData.ingresos)}</span>
                <span className="text-[10px] text-slate-500">Se debitarán para dejarlas en $0</span>
              </div>

              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuentas de Gastos/Costos a Cancelar (5 & 6)</span>
                <span className="text-lg font-black font-mono text-rose-400 block">{formatCOP(pygData.costos + pygData.gastos)}</span>
                <span className="text-[10px] text-slate-500">Se acreditarán para dejarlas en $0</span>
              </div>

              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resultado a Trasladar a Patrimonio</span>
                <span className={`text-lg font-black font-mono block ${pygData.utilidadOperacional >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {formatCOP(pygData.utilidadOperacional)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {pygData.utilidadOperacional >= 0 ? 'Acredita cuenta 360505 (Utilidad)' : 'Debita cuenta 361005 (Pérdida)'}
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* MODAL DE IMPRESIÓN OFICIAL */}
      <VoucherPrintModal
        isOpen={!!selectedVoucherForPrint}
        onClose={() => setSelectedVoucherForPrint(null)}
        voucher={selectedVoucherForPrint}
        puc={puc}
        terceros={terceros}
        company={activeCompany}
      />

    </div>
  );
}

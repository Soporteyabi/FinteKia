import React, { useState, useMemo } from 'react';
import { Company, Tercero, Voucher } from '../types';
import { 
  X, 
  Calculator, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck, 
  Briefcase, 
  User, 
  Calendar,
  DollarSign,
  ShieldAlert
} from 'lucide-react';
import { calculateContractSettlement, SettlementResult } from '../lib/payrollUtils';

interface ContractSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  terceros: Tercero[];
  addVoucher: (p: { 
    number: string; 
    type: Voucher['type']; 
    concept: string; 
    thirdPartyId: string; 
    total: number; 
    lines: any[]; 
  }) => void;
}

export default function ContractSettlementModal({
  isOpen,
  onClose,
  company,
  terceros,
  addVoucher
}: ContractSettlementModalProps) {
  if (!isOpen) return null;

  const employees = terceros.filter(t => t.roles.includes('empleado'));

  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [startDate, setStartDate] = useState<string>('2025-01-15');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [dismissalType, setDismissalType] = useState<'renuncia' | 'justa_causa' | 'injustificada'>('renuncia');
  const [contractType, setContractType] = useState<'termino_indefinido' | 'termino_fijo'>('termino_indefinido');
  const [pendingVacationDays, setPendingVacationDays] = useState<number>(15);
  const [customSalary, setCustomSalary] = useState<number>(0);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [voucherCreated, setVoucherCreated] = useState<string | null>(null);

  const selectedEmployee = employees.find(e => e.id === selectedEmpId) || employees[0];

  const currentSalary = customSalary > 0 
    ? customSalary 
    : (selectedEmployee?.employeeSalary || company.payrollParameters.smmlv || 1423500);

  // Compute days between dates
  const daysWorked = useMemo(() => {
    try {
      const d1 = new Date(startDate).getTime();
      const d2 = new Date(endDate).getTime();
      const diffDays = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
      return diffDays;
    } catch {
      return 360;
    }
  }, [startDate, endDate]);

  const hasAuxTransport = currentSalary <= (company.payrollParameters.smmlv * 2);

  const settlement: SettlementResult = useMemo(() => {
    return calculateContractSettlement({
      salary: currentSalary,
      hasAuxTransporte: hasAuxTransport,
      auxTransporte: company.payrollParameters.auxTransporte || 172000,
      daysWorkedYear: daysWorked,
      pendingVacationDays,
      isUnjustifiedDismissal: dismissalType === 'injustificada',
      contractType
    });
  }, [currentSalary, hasAuxTransport, company.payrollParameters, daysWorked, pendingVacationDays, dismissalType, contractType]);

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);

  const handlePostVoucher = () => {
    if (!selectedEmployee) return;

    const voucherNum = `LIQ-${Date.now().toString().substring(8)}`;
    
    // Colombian Accounting for contract termination:
    // Debit 510530 (Cesantías): settlement.cesantias
    // Debit 510533 (Intereses sobre cesantías): settlement.interesesCesantias
    // Debit 510536 (Prima de servicios): settlement.primaServicios
    // Debit 510539 (Vacaciones): settlement.vacaciones
    // Debit 510542 (Indemnizaciones laborales): settlement.indemnizacion (si aplica)
    // Credit 250505 (Salarios y prestaciones por pagar): settlement.totalLiquidacion
    const lines = [
      {
        accountCode: '510530',
        description: `Cesantías definitivas - ${selectedEmployee.name}`,
        debit: settlement.cesantias,
        credit: 0
      },
      {
        accountCode: '510533',
        description: `Intereses cesantías definitivas - ${selectedEmployee.name}`,
        debit: settlement.interesesCesantias,
        credit: 0
      },
      {
        accountCode: '510536',
        description: `Prima de servicios finiquito - ${selectedEmployee.name}`,
        debit: settlement.primaServicios,
        credit: 0
      },
      {
        accountCode: '510539',
        description: `Vacaciones compensadas en dinero - ${selectedEmployee.name}`,
        debit: settlement.vacaciones,
        credit: 0
      }
    ];

    if (settlement.indemnizacion > 0) {
      lines.push({
        accountCode: '510542',
        description: `Indemnización laboral Art. 64 CST - ${selectedEmployee.name}`,
        debit: settlement.indemnizacion,
        credit: 0
      });
    }

    lines.push({
      accountCode: '250505',
      description: `Obligaciones laborales por liquidación definitiva - ${selectedEmployee.name}`,
      debit: 0,
      credit: settlement.totalLiquidacion
    });

    addVoucher({
      number: voucherNum,
      type: 'diario',
      concept: `Liquidación definitiva de contrato de trabajo - ${selectedEmployee.name} (${dismissalType})`,
      thirdPartyId: selectedEmployee.id,
      total: settlement.totalLiquidacion,
      lines
    });

    setVoucherCreated(voucherNum);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Liquidación Definitiva de Contrato Laboral
              </h2>
              <p className="text-xs text-slate-400">
                Cálculo conforme al Código Sustantivo del Trabajo de Colombia (CST)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Acta
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form and Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Inputs Section - No Print */}
          <div className="no-print bg-slate-950/70 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Colaborador a Liquidar:
              </label>
              <select
                value={selectedEmpId}
                onChange={e => {
                  setSelectedEmpId(e.target.value);
                  setVoucherCreated(null);
                }}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.nit}) - {emp.employeeCargo || 'Empleado'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fecha de Ingreso:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fecha de Retiro:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Motivo de Terminación:
              </label>
              <select
                value={dismissalType}
                onChange={e => setDismissalType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500"
              >
                <option value="renuncia">Renuncia Voluntaria</option>
                <option value="justa_causa">Despido con Justa Causa (Art. 62)</option>
                <option value="injustificada">Despido Sin Justa Causa (Art. 64 - Con Indemnización)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tipo de Contrato:
              </label>
              <select
                value={contractType}
                onChange={e => setContractType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500"
              >
                <option value="termino_indefinido">Término Indefinido</option>
                <option value="termino_fijo">Término Fijo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Días de Vacaciones Pendientes:
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={pendingVacationDays}
                onChange={e => setPendingVacationDays(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Action to Post Voucher - No Print */}
          <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700">
            <div>
              <p className="text-xs text-white font-semibold">
                ¿Desea registrar esta liquidación en la contabilidad oficial?
              </p>
              <p className="text-[11px] text-slate-400">
                Se causarán los débitos a gastos de personal (5105) y el crédito a obligaciones laborales (250505).
              </p>
            </div>
            <div>
              {voucherCreated ? (
                <span className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-700/60 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Causado en Comprobante {voucherCreated}
                </span>
              ) : (
                <button
                  onClick={handlePostVoucher}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  Contabilizar en PUC
                </button>
              )}
            </div>
          </div>

          {/* Printable Settlement Sheet */}
          <div className="flex justify-center">
            <div 
              id="printable-contract-settlement"
              className="w-full max-w-3xl bg-white text-slate-900 rounded-xl shadow-xl p-6 sm:p-8 border border-slate-200 text-xs select-text font-sans"
            >
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-4 text-center">
                <h1 className="text-base font-black uppercase tracking-tight text-slate-950">
                  {company.name}
                </h1>
                <p className="text-[11px] text-slate-600 font-medium">
                  NIT: {company.nit} | {company.address}
                </p>
                <h2 className="text-sm font-bold text-slate-900 mt-2 uppercase tracking-wider bg-slate-100 py-1 rounded">
                  ACTA DE LIQUIDACIÓN DEFINITIVA DE CONTRATO DE TRABAJO Y PAZ Y SALVO LABORAL
                </h2>
              </div>

              {/* Employee Data */}
              <div className="grid grid-cols-2 gap-4 my-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
                <div>
                  <p><span className="font-bold">Colaborador:</span> {selectedEmployee?.name}</p>
                  <p><span className="font-bold">Documento de Identidad:</span> CC {selectedEmployee?.nit}</p>
                  <p><span className="font-bold">Cargo:</span> {selectedEmployee?.employeeCargo || 'Operativo'}</p>
                  <p><span className="font-bold">Salario Básico:</span> {formatCOP(currentSalary)}</p>
                </div>
                <div>
                  <p><span className="font-bold">Fecha de Inicio:</span> {startDate}</p>
                  <p><span className="font-bold">Fecha de Terminación:</span> {endDate}</p>
                  <p><span className="font-bold">Tiempo Total:</span> {daysWorked} días laborados</p>
                  <p><span className="font-bold">Motivo:</span> <span className="uppercase font-semibold">{dismissalType.replace('_', ' ')}</span></p>
                </div>
              </div>

              {/* Table of Benefits */}
              <div className="border border-slate-300 rounded-lg overflow-hidden my-4">
                <table className="w-full text-left">
                  <thead className="bg-slate-800 text-white text-[11px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Concepto Prestacional (CST)</th>
                      <th className="py-2 px-3">Base de Cálculo</th>
                      <th className="py-2 px-3 text-right">Valor Liquidado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr>
                      <td className="py-2 px-3 font-semibold">1. Cesantías Definitivas</td>
                      <td className="py-2 px-3">{formatCOP(settlement.basePrestaciones)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCOP(settlement.cesantias)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">2. Intereses sobre Cesantías (12% anual)</td>
                      <td className="py-2 px-3">{formatCOP(settlement.cesantias)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCOP(settlement.interesesCesantias)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">3. Prima de Servicios Proporcional</td>
                      <td className="py-2 px-3">{formatCOP(settlement.basePrestaciones)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCOP(settlement.primaServicios)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">4. Compensación de Vacaciones en Dinero ({pendingVacationDays} d)</td>
                      <td className="py-2 px-3">{formatCOP(currentSalary)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCOP(settlement.vacaciones)}</td>
                    </tr>
                    {settlement.indemnizacion > 0 && (
                      <tr className="bg-amber-50">
                        <td className="py-2 px-3 font-semibold text-amber-900">
                          5. Indemnización por Despido Sin Justa Causa (Art. 64 CST)
                        </td>
                        <td className="py-2 px-3 text-amber-800">{settlement.indemnizacionReason}</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-900">{formatCOP(settlement.indemnizacion)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-bold">
                    <tr>
                      <td colSpan={2} className="py-3 px-3 uppercase tracking-wider text-xs">
                        Total Liquidación Definitiva a Pagar:
                      </td>
                      <td className="py-3 px-3 text-right text-base text-cyan-400">
                        {formatCOP(settlement.totalLiquidacion)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Paz y salvo statement */}
              <p className="text-[10px] text-slate-600 text-justify leading-relaxed my-4 p-3 bg-slate-50 border border-slate-200 rounded">
                Manifiesto libre y espontáneamente que con la presente suma recibida a entera satisfacción, la empresa <strong>{company.name}</strong> queda al día en el pago de todos mis salarios, horas extras, prestaciones sociales, vacaciones, indemnizaciones y cualquier otra acreencia de carácter laboral nacida de la relación contractual, declarándola a paz y salvo por todo concepto.
              </p>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-300 text-center">
                <div>
                  <div className="border-b border-slate-400 w-48 mx-auto mb-2"></div>
                  <p className="font-bold text-slate-800">{company.name}</p>
                  <p className="text-[10px] text-slate-500">Empleador</p>
                </div>
                <div>
                  <div className="border-b border-slate-400 w-48 mx-auto mb-2"></div>
                  <p className="font-bold text-slate-800">{selectedEmployee?.name}</p>
                  <p className="text-[10px] text-slate-500">Trabajador • CC {selectedEmployee?.nit}</p>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

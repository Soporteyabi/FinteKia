import React from 'react';
import { Company, Tercero, PayrollLog } from '../types';
import { 
  Printer, 
  Share2, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Download, 
  User, 
  Building, 
  Briefcase, 
  CreditCard,
  QrCode
} from 'lucide-react';
import { generateDianPayrollXML, buildPayrollWhatsAppMessage } from '../lib/payrollUtils';

interface PayrollPayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  employee: Tercero;
  payroll: PayrollLog;
}

export default function PayrollPayslipModal({
  isOpen,
  onClose,
  company,
  employee,
  payroll
}: PayrollPayslipModalProps) {
  if (!isOpen) return null;

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadXML = () => {
    const xmlContent = generateDianPayrollXML({
      company,
      employee,
      payroll,
      consecutive: payroll.electronicConsecutive || 'NIE-001',
      cune: payroll.cune || '0000000000000000000000000000000000000000000000000000000000000000'
    });
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NominaElectronica_${payroll.electronicConsecutive || payroll.id}_${employee.nit}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleWhatsApp = () => {
    const phone = employee.phone ? employee.phone.replace(/\D/g, '') : '';
    const text = buildPayrollWhatsAppMessage(company, employee, payroll);
    const url = phone
      ? `https://wa.me/57${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const basicWageAccrued = Math.round((payroll.baseSalary * payroll.daysWorked) / 30);
  const totalDevengados = basicWageAccrued + payroll.auxTransporte + payroll.overtimePay + payroll.bonusPay;
  const totalDeducciones = payroll.deduccionesSalud + payroll.deduccionesPension + (payroll.fspDeduction || 0) + (payroll.otherDeductionsPay || 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Actions - No Print */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Volante Oficial de Nómina
                {payroll.dianStatus === 'aprobado_dian' && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-700/60 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    DIAN Aprobada ({payroll.electronicConsecutive || 'NIE'})
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Periodo {payroll.period} • {employee.name} (CC {employee.nit})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Enviar colilla por WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handleDownloadXML}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Descargar XML DIAN UBL 2.1"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">XML DIAN</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Viewport */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-950/50 flex-1 flex justify-center">
          <div 
            id="printable-payroll-payslip"
            className="w-full max-w-3xl bg-white text-slate-900 rounded-xl shadow-xl p-6 sm:p-8 border border-slate-200 text-xs font-sans select-text"
          >
            {/* Header Documento */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl tracking-tighter">
                  {company.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                    {company.name}
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">
                    NIT: {company.nit} | {company.address}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Software Contable Certificado FinteKia • Doc. Soporte Nómina Electrónica
                  </p>
                </div>
              </div>

              <div className="text-right sm:self-center border sm:border-0 p-2 sm:p-0 rounded-lg bg-slate-50 sm:bg-transparent w-full sm:w-auto">
                <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
                  COLILLA DE PAGO
                </span>
                <p className="text-xs font-bold text-slate-800 mt-1">
                  Consecutivo: {payroll.electronicConsecutive || `NOM-${payroll.id.substring(payroll.id.length - 6)}`}
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  Periodo: {payroll.period} ({payroll.daysWorked} días)
                </p>
              </div>
            </div>

            {/* Ficha del Colaborador */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Colaborador</p>
                <p className="text-sm font-black text-slate-900">{employee.name}</p>
                <p className="text-xs text-slate-700">Cédula: <span className="font-semibold">{employee.nit}</span></p>
                <p className="text-xs text-slate-700">Cargo: <span className="font-semibold">{employee.employeeCargo || 'Colaborador de Planta'}</span></p>
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detalles de Contrato</p>
                <p className="text-xs text-slate-700">Salario Mensual: <span className="font-bold">{formatCOP(payroll.baseSalary)}</span></p>
                <p className="text-xs text-slate-700">
                  Abono: <span className="font-semibold">{employee.employeeBank || 'Banco Nacional'} {employee.employeeAccountType || 'Ahorros'} {employee.employeeAccountNumber ? `No. ${employee.employeeAccountNumber}` : ''}</span>
                </p>
                <p className="text-xs text-slate-700">Estado: <span className="font-bold text-emerald-700 uppercase">{payroll.status}</span></p>
              </div>
            </div>

            {/* Tabla Comparativa: Devengados vs Deducciones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
              
              {/* Columna Devengados */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-emerald-50 border-b border-emerald-200 px-3 py-2 flex justify-between items-center">
                  <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px]">
                    Conceptos Devengados
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Valor (COP)</span>
                </div>
                <div className="p-3 space-y-1.5 min-h-[140px]">
                  <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                    <span className="text-slate-700">Sueldo Básico ({payroll.daysWorked} d):</span>
                    <span className="font-semibold text-slate-900">{formatCOP(basicWageAccrued)}</span>
                  </div>
                  {payroll.auxTransporte > 0 && (
                    <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                      <span className="text-slate-700">Auxilio de Transporte:</span>
                      <span className="font-semibold text-slate-900">{formatCOP(payroll.auxTransporte)}</span>
                    </div>
                  )}
                  {payroll.overtimePay > 0 && (
                    <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                      <span className="text-slate-700">Horas Extras y Recargos:</span>
                      <span className="font-semibold text-slate-900">{formatCOP(payroll.overtimePay)}</span>
                    </div>
                  )}
                  {payroll.bonusPay > 0 && (
                    <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                      <span className="text-slate-700">Bonificación / Comisiones:</span>
                      <span className="font-semibold text-slate-900">{formatCOP(payroll.bonusPay)}</span>
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 flex justify-between font-bold text-slate-900">
                  <span>Total Devengados:</span>
                  <span className="text-emerald-700">{formatCOP(totalDevengados)}</span>
                </div>
              </div>

              {/* Columna Deducciones */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-rose-50 border-b border-rose-200 px-3 py-2 flex justify-between items-center">
                  <span className="font-bold text-rose-900 uppercase tracking-wider text-[11px]">
                    Conceptos Deducidos
                  </span>
                  <span className="text-[10px] text-rose-700 font-semibold">Valor (COP)</span>
                </div>
                <div className="p-3 space-y-1.5 min-h-[140px]">
                  <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                    <span className="text-slate-700">Aporte Salud Empleado (4%):</span>
                    <span className="font-semibold text-rose-700">-{formatCOP(payroll.deduccionesSalud)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                    <span className="text-slate-700">Aporte Pensión Empleado (4%):</span>
                    <span className="font-semibold text-rose-700">-{formatCOP(payroll.deduccionesPension)}</span>
                  </div>
                  {(payroll.fspDeduction || 0) > 0 && (
                    <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                      <span className="text-slate-700">Fondo Solidaridad Pensional:</span>
                      <span className="font-semibold text-rose-700">-{formatCOP(payroll.fspDeduction || 0)}</span>
                    </div>
                  )}
                  {(payroll.otherDeductionsPay || 0) > 0 && (
                    <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                      <span className="text-slate-700">Otras Deducciones / Préstamo:</span>
                      <span className="font-semibold text-rose-700">-{formatCOP(payroll.otherDeductionsPay || 0)}</span>
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 flex justify-between font-bold text-slate-900">
                  <span>Total Deducciones:</span>
                  <span className="text-rose-700">-{formatCOP(totalDeducciones)}</span>
                </div>
              </div>

            </div>

            {/* Total Neto a Recibir */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
              <div>
                <p className="text-xs uppercase font-medium text-slate-300">Neto Pagado al Colaborador</p>
                <p className="text-[11px] text-slate-400">Total Devengado menos Deducciones de Ley</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-cyan-400 tracking-tight">
                  {formatCOP(payroll.netPay)}
                </span>
              </div>
            </div>

            {/* DIAN Electronic Payroll CUNE and QR */}
            {payroll.cune && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-[10px] text-slate-600 mb-6">
                <div className="flex items-center gap-2 overflow-hidden">
                  <QrCode className="w-10 h-10 text-slate-800 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-bold text-slate-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Documento Soporte de Pago de Nómina Electrónica
                    </p>
                    <p className="font-mono truncate text-[9px] text-slate-500">
                      CUNE: {payroll.cune}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      Emitido bajo Resolución DIAN 000013. Verificable en el servicio web DIAN.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    VALIDADA DIAN
                  </span>
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center">
              <div>
                <div className="border-b border-slate-400 w-48 mx-auto mb-2"></div>
                <p className="font-bold text-slate-800">{company.name}</p>
                <p className="text-[10px] text-slate-500">Empleador / Pagaduría</p>
              </div>
              <div>
                <div className="border-b border-slate-400 w-48 mx-auto mb-2"></div>
                <p className="font-bold text-slate-800">{employee.name}</p>
                <p className="text-[10px] text-slate-500">Recibí a Satisfacción • CC: {employee.nit}</p>
              </div>
            </div>

            <p className="text-center text-[9px] text-slate-400 mt-6">
              Este comprobante certifica la dispersión y acreditación de los emolumentos laborales del período.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

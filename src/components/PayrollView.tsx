import React, { useState } from 'react';
import { toast } from "../context/ToastContext";
import { Company, Tercero, BankAccount, PucAccount, PayrollLog, Voucher, BankTransaction } from '../types';
import { THEMES_MAP } from './Sidebar';
import Pagination from './Pagination';
import { exportPayrollToExcel } from '../utils/excelExport';
import {
  User,
  Users,
  Briefcase,
  IdCard,
  Phone,
  Mail,
  HeartPulse,
  DollarSign,
  TrendingUp,
  Percent,
  Calculator,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  FileSpreadsheet,
  Download,
  Calendar,
  X,
  Printer,
  ChevronRight,
  ShieldAlert,
  MapPin,
  Building,
  CreditCard,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import PayrollPayslipModal from './PayrollPayslipModal';
import ContractSettlementModal from './ContractSettlementModal';
import { generateCUNE } from '../lib/payrollUtils';

interface PayrollViewProps {
  companies: Company[];
  currentCompanyId: string;
  terceros: Tercero[];
  bankAccounts: BankAccount[];
  puc: PucAccount[];
  payrollLogs: PayrollLog[];
  onAddTercero: (newTer: Omit<Tercero, 'id'>) => void;
  onUpdateTercero: (updatedTer: Tercero) => void;
  onDeleteTercero: (id: string) => void;
  onAddPayrollLog: (log: PayrollLog) => void;
  onUpdatePayrollLogStatus: (id: string, status: 'calculado' | 'pagado', bankAccountId?: string, consignedDate?: string) => void;
  addVoucher: (p: { 
    number: string; 
    type: Voucher['type']; 
    concept: string; 
    thirdPartyId: string; 
    total: number; 
    lines: any[]; 
    items?: any[];
  }) => void;
  addBankTransaction: (tx: Omit<BankTransaction, 'id'>) => void;
  theme?: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
}

export default function PayrollView({
  companies,
  currentCompanyId,
  terceros,
  bankAccounts,
  puc,
  payrollLogs,
  onAddTercero,
  onUpdateTercero,
  onDeleteTercero,
  onAddPayrollLog,
  onUpdatePayrollLogStatus,
  addVoucher,
  addBankTransaction,
  theme = 'slate_gray'
}: PayrollViewProps) {
  
  const activeCompany = companies.find(c => c.id === currentCompanyId) || companies[0];
  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;
  const isDark = theme === 'navy_dark' || theme === 'light_gray';

  // State
  const [activeTab, setActiveTab] = useState<'planilla' | 'colaboradores' | 'calculadora' | 'prestaciones'>('planilla');
  const [frequency, setFrequency] = useState<'mensual' | 'quincenal'>('mensual');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-06');
  const [notification, setNotification] = useState<string>('');

  // Handle changing between mensual & quincenal
  const handleFrequencyChange = (newFreq: 'mensual' | 'quincenal') => {
    setFrequency(newFreq);
    if (newFreq === 'quincenal') {
      if (!selectedPeriod.includes('-Q')) {
        setSelectedPeriod(selectedPeriod + '-Q1');
      }
    } else {
      if (selectedPeriod.includes('-Q')) {
        setSelectedPeriod(selectedPeriod.split('-Q')[0]);
      }
    }
  };

  // Adjust starting days in interactive calculator based on payment frequency
  React.useEffect(() => {
    setCalcDays(frequency === 'quincenal' ? 15 : 30);
  }, [frequency]);

  // Roster Filter Search
  const [searchEmployee, setSearchEmployee] = useState('');
  
  // Interactive Calculator State
  const [calcEmployeeId, setCalcEmployeeId] = useState<string>('');
  const [calcDays, setCalcDays] = useState<number>(30);
  const [calcHE_Diurna, setCalcHE_Diurna] = useState<number>(0); // 1.25x
  const [calcHE_Nocturna, setCalcHE_Nocturna] = useState<number>(0); // 1.75x
  const [calcHE_Festiva, setCalcHE_Festiva] = useState<number>(0); // 2.10x (Extra Diurna dominical/festiva: 110% surcharge)
  const [calcRecargoNocturno, setCalcRecargoNocturno] = useState<number>(0); // 0.35x (Recargo Nocturno Ordinario)
  const [calcHE_FestivaNocturna, setCalcHE_FestivaNocturna] = useState<number>(0); // 2.50x (Extra Nocturna dominical/festiva: 150% surcharge)
  const [calcRecargoFestivo, setCalcRecargoFestivo] = useState<number>(0); // 1.75x (Recargo dominical/festivo diurno ordinario: 75% surcharge)
  const [calcBonus, setCalcBonus] = useState<number>(0);
  const [calcBonusNonWage, setCalcBonusNonWage] = useState<number>(0); // No constitutiva de salario
  const [calcOtherDeductions, setCalcOtherDeductions] = useState<number>(0);

  // Employee Edit / Add modal
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Tercero | null>(null);
  
  // New employee form state
  const [empName, setEmpName] = useState('');
  const [empNit, setEmpNit] = useState('');
  const [empCargo, setEmpCargo] = useState('');
  const [empSalary, setEmpSalary] = useState<number>(1423500);
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empCity, setEmpCity] = useState('Bogotá');
  const [empAddress, setEmpAddress] = useState('');
  const [empEmergency, setEmpEmergency] = useState('');

  // Payslip preview printable modal
  const [viewingPayslip, setViewingPayslip] = useState<PayrollLog | null>(null);

  // Contract termination settlement modal
  const [showContractSettlementModal, setShowContractSettlementModal] = useState(false);

  // Bank payout intermediate state
  const [payingLog, setPayingLog] = useState<PayrollLog | null>(null);
  const [selectedPayingBankAccountId, setSelectedPayingBankAccountId] = useState<string>('');

  // State for mass payment and calculations
  const [showMassPayModal, setShowMassPayModal] = useState(false);
  const [selectedMassPayingBankAccountId, setSelectedMassPayingBankAccountId] = useState<string>('');

  // Colombian Parameters values (loaded from company context)
  const smmlv = activeCompany.payrollParameters?.smmlv || 1423500;
  const auxTransporteFull = activeCompany.payrollParameters?.auxTransporte || 172000;

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 6000);
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // List of employees (terceros with role employee)
  const employeesList = terceros.filter(t => t.roles.includes('empleado'));

  // Calculate parameters base
  const selectedEmployee = employeesList.find(e => e.id === calcEmployeeId);
  const employeeSalaryBase = selectedEmployee?.employeeSalary || smmlv;

  // Real-time calculation formula matching Colombian legislation
  const calculatePayslipValues = (
    salary: number,
    days: number,
    heDiurna: number,
    heNocturna: number,
    heFestiva: number,
    wageBonus: number,
    nonWageBonus: number,
    extraDeductions: number,
    recargoNocturno = 0,
    heFestivaNocturna = 0,
    recargoFestivo = 0
  ) => {
    // Pro-rated base accrued
    const baseAccrued = Math.round((salary * days) / 30);
    
    // Hourly rate base (According to Colombian standard: 240 hours per month)
    const hourlyBase = salary / 240;

    // Overtime pay calculations
    const valueHED = Math.round(hourlyBase * 1.25 * heDiurna); // H.E. Diurna (25% surcharge, i.e., 1.25x)
    const valueHEN = Math.round(hourlyBase * 1.75 * heNocturna); // H.E. Nocturna (75% surcharge, i.e., 1.75x)
    const valueHEDF = Math.round(hourlyBase * 2.10 * heFestiva); // H.E. Dominical/Festiva Diurna (110% surcharge, i.e., 2.10x)
    const valueRN = Math.round(hourlyBase * 0.35 * recargoNocturno); // Recargo Nocturno Ordinario (35% surcharge, i.e., 0.35x)
    const valueHENF = Math.round(hourlyBase * 2.50 * heFestivaNocturna); // H.E. Dominical/Festiva Nocturna (150% surcharge, i.e., 2.50x)
    const valueRDF = Math.round(hourlyBase * 1.75 * recargoFestivo); // Recargo Dominical/Festivo Diurno Ordinario (75% surcharge, i.e., 1.75x)
    
    const totalOvertime = valueHED + valueHEN + valueHEDF + valueRN + valueHENF + valueRDF;

    // Total taxable income (IBC)
    // IBC includes Base Salary prorated + wage bonuses + overtime. (Excludes aux. transporte and non-wage bonuses)
    const ibc = baseAccrued + totalOvertime + wageBonus;

    // Auxilio de transporte eligibility criteria: If IBC <= 2 * SMMLV (prorated by days)
    const twoSmmlvLimit = Math.round((smmlv * 2 * days) / 30);
    const eligibleForAux = ibc <= twoSmmlvLimit;
    const computedAux = eligibleForAux ? Math.round((auxTransporteFull * days) / 30) : 0;

    // Social Security employee contributions (withheld from wage)
    // 4% for Salud
    const deductionHealth = Math.round(ibc * 0.04);
    // 4% for Pensión
    const deductionPension = Math.round(ibc * 0.04);

    const totalEarning = ibc + computedAux + nonWageBonus;
    const totalDeduction = deductionHealth + deductionPension + extraDeductions;
    const netPayment = Math.max(0, totalEarning - totalDeduction);

    return {
      baseAccrued,
      hourlyBase,
      valueHED,
      valueHEN,
      valueHEDF,
      valueRN,
      valueHENF,
      valueRDF,
      totalOvertime,
      ibc,
      computedAux,
      deductionHealth,
      deductionPension,
      totalEarning,
      totalDeduction,
      netPayment
    };
  };

  // Active inputs math compilation
  const currentCalcBreakdown = calculatePayslipValues(
    employeeSalaryBase,
    calcDays,
    calcHE_Diurna,
    calcHE_Nocturna,
    calcHE_Festiva,
    calcBonus,
    calcBonusNonWage,
    calcOtherDeductions,
    calcRecargoNocturno,
    calcHE_FestivaNocturna,
    calcRecargoFestivo
  );

  // Payroll active logs calculations
  const activePeriodLogs = payrollLogs.filter(l => l.period === selectedPeriod);

  // Pagination for payroll entries (15 per page)
  const [payrollPage, setPayrollPage] = useState(1);
  const [provisionsPage, setProvisionsPage] = useState(1);
  const PAYROLL_PER_PAGE = 15;

  const totalPayrollPages = Math.max(1, Math.ceil(activePeriodLogs.length / PAYROLL_PER_PAGE));
  const safePayrollPage = Math.min(payrollPage, totalPayrollPages);
  const paginatedPeriodLogs = activePeriodLogs.slice(
    (safePayrollPage - 1) * PAYROLL_PER_PAGE,
    safePayrollPage * PAYROLL_PER_PAGE
  );

  const totalProvisionsPages = Math.max(1, Math.ceil(activePeriodLogs.length / PAYROLL_PER_PAGE));
  const safeProvisionsPage = Math.min(provisionsPage, totalProvisionsPages);
  const paginatedProvisionsLogs = activePeriodLogs.slice(
    (safeProvisionsPage - 1) * PAYROLL_PER_PAGE,
    safeProvisionsPage * PAYROLL_PER_PAGE
  );

  // Reset pagination on period change
  React.useEffect(() => {
    setPayrollPage(1);
    setProvisionsPage(1);
  }, [selectedPeriod]);

  // Compute metrics summaries
  const totalAccruedCostGlobal = activePeriodLogs.reduce((acc, curr) => acc + (curr.baseSalary * curr.daysWorked / 30) + curr.overtimePay + curr.bonusPay + curr.auxTransporte, 0);
  const totalSaludDeductionsGlobal = activePeriodLogs.reduce((acc, curr) => acc + curr.deduccionesSalud, 0);
  const totalPensionDeductionsGlobal = activePeriodLogs.reduce((acc, curr) => acc + curr.deduccionesPension, 0);
  const totalNetPayGlobal = activePeriodLogs.reduce((acc, curr) => acc + curr.netPay, 0);
  const totalPaidCount = activePeriodLogs.filter(l => l.status === 'pagado').reduce((acc, curr) => acc + curr.netPay, 0);
  const totalPendingCount = activePeriodLogs.filter(l => l.status === 'calculado').reduce((acc, curr) => acc + curr.netPay, 0);

  // Form handlers
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empNit || !empCargo || empSalary <= 0) {
      toast.warning('Por favor complete los campos obligatorios del Colaborador.', 'Datos Requeridos');
      return;
    }

    if (editingEmployee) {
      onUpdateTercero({
        ...editingEmployee,
        name: empName,
        nit: empNit,
        roles: ['empleado'],
        employeeCargo: empCargo,
        employeeSalary: empSalary,
        phone: empPhone,
        email: empEmail,
        city: empCity,
        address: empAddress,
        employeeEmergencyContact: empEmergency
      });
      triggerNotification(`¡Información del colaborador ${empName} modificada correctamente!`);
    } else {
      onAddTercero({
        name: empName,
        nit: empNit,
        type: 'natural',
        roles: ['empleado'],
        city: empCity,
        address: empAddress,
        phone: empPhone,
        email: empEmail,
        employeeCargo: empCargo,
        employeeSalary: empSalary,
        employeeEmergencyContact: empEmergency
      });
      triggerNotification(`¡Colaborador ${empName} creado e inscrito en el escalafón de nómina!`);
    }

    // Reset Form
    setShowEmployeeModal(false);
    setEditingEmployee(null);
    clearEmployeeForm();
  };

  const clearEmployeeForm = () => {
    setEmpName('');
    setEmpNit('');
    setEmpCargo('');
    setEmpSalary(1423500);
    setEmpPhone('');
    setEmpEmail('');
    setEmpCity('Bogotá');
    setEmpAddress('');
    setEmpEmergency('');
  };

  const handleEditEmployeeClick = (emp: Tercero) => {
    setEditingEmployee(emp);
    setEmpName(emp.name);
    setEmpNit(emp.nit);
    setEmpCargo(emp.employeeCargo || '');
    setEmpSalary(emp.employeeSalary || 1423500);
    setEmpPhone(emp.phone || '');
    setEmpEmail(emp.email || '');
    setEmpCity(emp.city || 'Bogotá');
    setEmpAddress(emp.address || '');
    setEmpEmergency(emp.employeeEmergencyContact || '');
    setShowEmployeeModal(true);
  };

  // Calculator record creation
  const handleSaveCalculatedRow = () => {
    if (!calcEmployeeId) {
      toast.warning('Por favor elija un colaborador primero.', 'Colaborador Requerido');
      return;
    }

    const {
      totalOvertime,
      computedAux,
      deductionHealth,
      deductionPension,
      netPayment
    } = currentCalcBreakdown;

    const newLog: PayrollLog = {
      id: `paylog-${calcEmployeeId}-${selectedPeriod}`,
      employeeId: calcEmployeeId,
      period: selectedPeriod,
      daysWorked: calcDays,
      baseSalary: employeeSalaryBase,
      overtimePay: totalOvertime,
      bonusPay: calcBonus + calcBonusNonWage,
      auxTransporte: computedAux,
      deduccionesSalud: deductionHealth,
      deduccionesPension: deductionPension,
      netPay: netPayment,
      status: 'calculado',
      hedHours: calcHE_Diurna,
      henHours: calcHE_Nocturna,
      rnHours: calcRecargoNocturno,
      hedfHours: calcHE_Festiva,
      henfHours: calcHE_FestivaNocturna,
      rdfHours: calcRecargoFestivo,
      bonusNonWagePay: calcBonusNonWage,
      otherDeductionsPay: calcOtherDeductions
    };

    onAddPayrollLog(newLog);
    triggerNotification(`Nómina para ${selectedEmployee?.name} correspondiente al periodo ${selectedPeriod} calculada y guardada en planilla con éxito.`);
    
    // Reset calculator inputs
    setCalcHE_Diurna(0);
    setCalcHE_Nocturna(0);
    setCalcHE_Festiva(0);
    setCalcRecargoNocturno(0);
    setCalcHE_FestivaNocturna(0);
    setCalcRecargoFestivo(0);
    setCalcBonus(0);
    setCalcBonusNonWage(0);
    setCalcOtherDeductions(0);
    setActiveTab('planilla');
  };

  // Contabilizar y pagar action
  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingLog || !selectedPayingBankAccountId) return;

    const bankAcc = bankAccounts.find(ba => ba.id === selectedPayingBankAccountId);
    if (!bankAcc) return;

    if (bankAcc.balance < payingLog.netPay) {
      const confirmProceed = confirm(`El saldo de la cuenta (${formatCOP(bankAcc.balance)}) es inferior al valor de la nómina líquida (${formatCOP(payingLog.netPay)}). ¿Desea registrar de todos modos el egreso de nómina?`);
      if (!confirmProceed) return;
    }

    const employee = terceros.find(t => t.id === payingLog.employeeId);
    const empNameStr = employee ? employee.name : 'Colaborador';

    const voucherNo = `NOM-${Date.now().toString().substring(8)}`;

    // Colombian Double Entry Mapping for Payroll Payout:
    // 1. Debit: 510506 (Sueldos) = Accrued Base + Overtime + Taxable bonus
    const valueSueldosGasto = Math.round((payingLog.baseSalary * payingLog.daysWorked) / 30) + payingLog.overtimePay;
    const line1 = {
      accountCode: '510506', // Gastos de Personal - Sueldos
      description: `Gasto sueldo y extras pto ${payingLog.period} - ${empNameStr}`,
      debit: valueSueldosGasto,
      credit: 0
    };

    // 2. Debit: 510527 (Auxilio de transporte)
    const line2 = {
      accountCode: '510527', // Gastos - Auxilio de Transporte
      description: `Auxilio de transporte pto ${payingLog.period} - ${empNameStr}`,
      debit: payingLog.auxTransporte,
      credit: 0
    };

    // 3. Credit Withholding: Saúde 220505 (using or general third party credit accounts)
    const line3 = {
      accountCode: '220505', // Pasivo acreedores/salud de nómina
      description: `Retención Salud (4%) empleado ${empNameStr}`,
      debit: 0,
      credit: payingLog.deduccionesSalud
    };

    // 4. Credit Withholding: Pensión 220505
    const line4 = {
      accountCode: '220505', // Pasivo acreedores/pensión de nómina
      description: `Retención Pensión (4%) empleado ${empNameStr}`,
      debit: 0,
      credit: payingLog.deduccionesPension
    };

    // 5. Credit: 111005 (Bancos Ppal) = Net pay payout
    const line5 = {
      accountCode: '111005', // Bancolombia / Cash
      description: `Pago neto nómina y desprendible ${voucherNo} - ${empNameStr}`,
      debit: 0,
      credit: payingLog.netPay
    };

    // Send Accounting entries
    addVoucher({
      number: voucherNo,
      type: 'egreso',
      concept: `Consignación electrónica de salarios del mes ${payingLog.period} - Colaborador: ${empNameStr}`,
      thirdPartyId: payingLog.employeeId,
      total: valueSueldosGasto + payingLog.auxTransporte,
      lines: [line1, line2, line3, line4, line5]
    });

    // Send Bank transaction to deduct money and list records
    addBankTransaction({
      bankAccountId: selectedPayingBankAccountId,
      date: new Date().toISOString().substring(0, 10),
      type: 'Egreso',
      amount: payingLog.netPay,
      concept: `Pago de Nómina Periodo ${payingLog.period} a ${empNameStr}`,
      voucherId: `v-${voucherNo}`,
      reconciled: true
    });

    // Update log status to pagado
    onUpdatePayrollLogStatus(
      payingLog.id,
      'pagado',
      selectedPayingBankAccountId,
      new Date().toISOString().substring(0, 10)
    );

    setPayingLog(null);
    triggerNotification(`¡Nómina de ${empNameStr} procesada, consignada y contabilizada! Se descontó ${formatCOP(payingLog.netPay)} del banco.`);
  };

  // PrintablePayslip component
  const handlePrintPayslip = () => {
    window.print();
  };

  // Mass payroll calculation for all employees not yet processed in activePeriod
  const handleMassCalculate = () => {
    // List all employees not yet calculated for this period
    const pendingEmployees = employeesList.filter(
      emp => !payrollLogs.some(log => log.employeeId === emp.id && log.period === selectedPeriod)
    );

    if (pendingEmployees.length === 0) {
      toast.info(`Todos los colaboradores ya han sido liquidados para el periodo ${selectedPeriod}.`, 'Nómina al Día');
      return;
    }

    const defaultDays = frequency === 'quincenal' ? 15 : 30;
    const confirmCalc = confirm(
      `¿Desea liquidar de forma masiva a los ${pendingEmployees.length} colaboradores pendientes para el período ${selectedPeriod}?\n\n` +
      `Se calcularán con un estándar de ${defaultDays} días laborados, salario base contractual, 0 horas extras, deducciones estándar de ley y auxilio de transporte correspondiente.`
    );

    if (!confirmCalc) return;

    let count = 0;
    pendingEmployees.forEach(emp => {
      const salary = emp.employeeSalary || smmlv;
      const values = calculatePayslipValues(
        salary,
        defaultDays, // Dynamic based on frequency
        0,  // heDiurna
        0,  // heNocturna
        0,  // heFestiva
        0,  // wageBonus
        0,  // nonWageBonus
        0   // otherDeductions
      );

      const newLog: PayrollLog = {
        id: `paylog-${emp.id}-${selectedPeriod}`,
        employeeId: emp.id,
        period: selectedPeriod,
        daysWorked: defaultDays,
        baseSalary: salary,
        overtimePay: 0,
        bonusPay: 0,
        auxTransporte: values.computedAux,
        deduccionesSalud: values.deductionHealth,
        deduccionesPension: values.deductionPension,
        netPay: values.netPayment,
        status: 'calculado'
      };

      onAddPayrollLog(newLog);
      count++;
    });

    triggerNotification(`¡Éxito! Se han calculado y guardado ${count} nóminas en la planilla para el período ${selectedPeriod}.`);
  };

  // Process payment and accounting entries for all calculated rows in the selectedPeriod
  const handleProcessMassPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const pendingLogs = activePeriodLogs.filter(l => l.status === 'calculado');
    if (pendingLogs.length === 0 || !selectedMassPayingBankAccountId) return;

    const bankAcc = bankAccounts.find(ba => ba.id === selectedMassPayingBankAccountId);
    if (!bankAcc) return;

    const totalNetPayout = pendingLogs.reduce((sum, log) => sum + log.netPay, 0);

    if (bankAcc.balance < totalNetPayout) {
      const confirmProceed = confirm(
        `El saldo consolidado de la cuenta seleccionada (${formatCOP(bankAcc.balance)}) es inferior al valor total por pagar de la nómina completa (${formatCOP(totalNetPayout)}).\n\n` +
        `¿Desea registrar de todos modos el egreso masivo de nóminas en su contabilidad?`
      );
      if (!confirmProceed) return;
    }

    let processedCount = 0;

    pendingLogs.forEach(log => {
      const employee = terceros.find(t => t.id === log.employeeId);
      const empNameStr = employee ? employee.name : 'Colaborador';
      const voucherNo = `NOM-M-${Date.now().toString().substring(7)}-${processedCount}`;

      // Colombian Double Entry Mapping for each payroll log:
      const valueSueldosGasto = Math.round((log.baseSalary * log.daysWorked) / 30) + log.overtimePay;
      const line1 = {
        accountCode: '510506', // Gastos de Personal - Sueldos
        description: `Gasto sueldo masivo pto ${log.period} - ${empNameStr}`,
        debit: valueSueldosGasto,
        credit: 0
      };

      const line2 = {
        accountCode: '510527', // Gastos - Auxilio de Transporte
        description: `Auxilio de transporte masivo pto ${log.period} - ${empNameStr}`,
        debit: log.auxTransporte,
        credit: 0
      };

      const line3 = {
        accountCode: '220505', // Pasivo acreedores/salud de nómina
        description: `Retención Salud (4%) masivo - ${empNameStr}`,
        debit: 0,
        credit: log.deduccionesSalud
      };

      const line4 = {
        accountCode: '220505', // Pasivo acreedores/pensión de nómina
        description: `Retención Pensión (4%) masivo - ${empNameStr}`,
        debit: 0,
        credit: log.deduccionesPension
      };

      const line5 = {
        accountCode: '111005', // Bancolombia / Cash
        description: `Pago neto nómina masiva ${voucherNo} - ${empNameStr}`,
        debit: 0,
        credit: log.netPay
      };

      // Add voucher
      addVoucher({
        number: voucherNo,
        type: 'egreso',
        concept: `Pago electrónico masivo salarios Periodo ${log.period} - Colaborador: ${empNameStr}`,
        thirdPartyId: log.employeeId,
        total: valueSueldosGasto + log.auxTransporte,
        lines: [line1, line2, line3, line4, line5]
      });

      // Add bank transactions
      addBankTransaction({
        bankAccountId: selectedMassPayingBankAccountId,
        date: new Date().toISOString().substring(0, 10),
        type: 'Egreso',
        amount: log.netPay,
        concept: `Pago Masivo Nómina Periodo ${log.period} a ${empNameStr}`,
        voucherId: `v-${voucherNo}`,
        reconciled: true
      });

      // Mark as paid
      onUpdatePayrollLogStatus(
        log.id,
        'pagado',
        selectedMassPayingBankAccountId,
        new Date().toISOString().substring(0, 10)
      );

      processedCount++;
    });

    setShowMassPayModal(false);
    triggerNotification(`¡PAGADAS MASIVAMENTE: ${processedCount} nóminas! Se autorizaron desembolsos por ${formatCOP(totalNetPayout)} desde la cuenta seleccionada.`);
  };

  // DIAN Electronic Payroll Transmission Handlers
  const handleEmitDianPayroll = (log: PayrollLog) => {
    const employee = terceros.find(t => t.id === log.employeeId);
    if (!employee) return;

    const consecutiveNum = Math.floor(100 + Math.random() * 900);
    const consecutive = `NIE-${consecutiveNum}`;
    const cune = generateCUNE(activeCompany.nit, employee.nit, log.period, log.netPay, consecutive);

    const updatedLog: PayrollLog = {
      ...log,
      cune,
      electronicConsecutive: consecutive,
      dianStatus: 'aprobado_dian',
      dianIssuedAt: new Date().toISOString()
    };

    onAddPayrollLog(updatedLog);
    triggerNotification(`¡Nómina Electrónica transmitida a la DIAN con éxito! Consecutivo: ${consecutive} • CUNE: ${cune.substring(0, 16)}...`);
  };

  const handleMassEmitDianPayroll = () => {
    const pendingLogs = activePeriodLogs.filter(l => l.dianStatus !== 'aprobado_dian');
    if (pendingLogs.length === 0) {
      toast.info('Todas las nóminas de este período ya cuentan con validación y CUNE de la DIAN.', 'Validación DIAN');
      return;
    }

    let count = 0;
    pendingLogs.forEach((log, index) => {
      const employee = terceros.find(t => t.id === log.employeeId);
      if (!employee) return;

      const consecutive = `NIE-${100 + index + 1}`;
      const cune = generateCUNE(activeCompany.nit, employee.nit, log.period, log.netPay, consecutive);

      const updatedLog: PayrollLog = {
        ...log,
        cune,
        electronicConsecutive: consecutive,
        dianStatus: 'aprobado_dian',
        dianIssuedAt: new Date().toISOString()
      };

      onAddPayrollLog(updatedLog);
      count++;
    });

    triggerNotification(`¡Éxito! Se transmitieron ${count} nóminas electrónicas a la DIAN. Documentos soporte NIE generados.`);
  };

  // Post provisions voucher to PUC
  const handlePostProvisionsVoucher = () => {
    if (activePeriodLogs.length === 0) {
      toast.warning('No hay nóminas registradas para este período para calcular provisiones.', 'Sin Registros');
      return;
    }

    const voucherNum = `PROV-${Date.now().toString().substring(8)}`;
    
    const totalCesantias = Math.round(activePeriodLogs.reduce((acc, curr) => {
      const baseWithAux = curr.baseSalary + curr.overtimePay + curr.auxTransporte;
      return acc + (baseWithAux * 0.08333);
    }, 0));

    const totalIntereses = Math.round(totalCesantias * 0.12 * (1 / 12));
    const totalPrima = totalCesantias;
    const totalVacaciones = Math.round(activePeriodLogs.reduce((acc, curr) => {
      const baseNoAux = curr.baseSalary + curr.overtimePay;
      return acc + (baseNoAux * 0.04167);
    }, 0));

    const totalProvision = totalCesantias + totalIntereses + totalPrima + totalVacaciones;

    const lines = [
      { accountCode: '510530', description: `Gasto Provisión Cesantías pto ${selectedPeriod}`, debit: totalCesantias, credit: 0 },
      { accountCode: '510533', description: `Gasto Provisión Intereses Cesantías pto ${selectedPeriod}`, debit: totalIntereses, credit: 0 },
      { accountCode: '510536', description: `Gasto Provisión Prima de Servicios pto ${selectedPeriod}`, debit: totalPrima, credit: 0 },
      { accountCode: '510539', description: `Gasto Provisión Vacaciones pto ${selectedPeriod}`, debit: totalVacaciones, credit: 0 },
      { accountCode: '261005', description: `Pasivo Provisión Cesantías pto ${selectedPeriod}`, debit: 0, credit: totalCesantias },
      { accountCode: '261010', description: `Pasivo Provisión Intereses Cesantías pto ${selectedPeriod}`, debit: 0, credit: totalIntereses },
      { accountCode: '261020', description: `Pasivo Provisión Prima de Servicios pto ${selectedPeriod}`, debit: 0, credit: totalPrima },
      { accountCode: '261015', description: `Pasivo Provisión Vacaciones pto ${selectedPeriod}`, debit: 0, credit: totalVacaciones }
    ];

    addVoucher({
      number: voucherNum,
      type: 'diario',
      concept: `Causación de Provisiones de Prestaciones Sociales Periodo ${selectedPeriod}`,
      thirdPartyId: terceros.find(t => t.roles.includes('empleado'))?.id || activeCompany.id,
      total: totalProvision,
      lines
    });

    triggerNotification(`¡Provisiones laborales contabilizadas en el comprobante ${voucherNum}! Total causado: ${formatCOP(totalProvision)}.`);
  };

  return (
    <div className="space-y-6">

      {/* TOP HEADER SECTION Banner */}
      <div className={`p-6 rounded-3xl border shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
        isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-100'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-550 animate-ping"></span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-550">Nómina Eléctronica y Liquidación UGPP</span>
          </div>
          <h2 className="font-display font-extrabold text-xl tracking-tight text-slate-800">Recurso Humano & Nómina Colombiana</h2>
          <p className="text-xs text-slate-450 max-w-3xl">
            Liquide nóminas del personal laboral de Fintekia de acuerdo con la legislación vigente. Calcule horas extras, transporte de ley y deduzca aportes de salud y pensión vigentes (4% c/u). Contabilice los egresos directamente en el libro diario.
          </p>
        </div>

        {/* Global Period Selector */}
        <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-900 border border-slate-755 p-1.5 rounded-2xl shrink-0">
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleFrequencyChange('mensual')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                frequency === 'mensual'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => handleFrequencyChange('quincenal')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                frequency === 'quincenal'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Quincenal
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase font-black text-slate-400 pl-1">Período:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-zinc-950 text-white font-mono font-bold text-xs p-1.5 rounded-xl border border-slate-800 outline-none cursor-pointer"
            >
              {frequency === 'mensual' ? (
                <>
                  <option value="2026-05">Mayo 2026 (30d)</option>
                  <option value="2026-06">Junio 2026 (30d)</option>
                  <option value="2026-07">Julio 2026 (30d)</option>
                  <option value="2026-08">Agosto 2026 (30d)</option>
                </>
              ) : (
                <>
                  <option value="2026-05-Q1">Mayo 2026 - 1ª Quincena (1-15)</option>
                  <option value="2026-05-Q2">Mayo 2026 - 2ª Quincena (16-30)</option>
                  <option value="2026-06-Q1">Junio 2026 - 1ª Quincena (1-15)</option>
                  <option value="2026-06-Q2">Junio 2026 - 2ª Quincena (16-30)</option>
                  <option value="2026-07-Q1">Julio 2026 - 1ª Quincena (1-15)</option>
                  <option value="2026-07-Q2">Julio 2026 - 2ª Quincena (16-30)</option>
                  <option value="2026-08-Q1">Agosto 2026 - 1ª Quincena (1-15)</option>
                  <option value="2026-08-Q2">Agosto 2026 - 2ª Quincena (16-30)</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* FLASH FEEDBACK NOTICE */}
      {notification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center gap-2.5 text-xs font-semibold leading-relaxed shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* MINI STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Costo total personal */}
        <div className={`p-4 rounded-2xl border shadow-sm space-y-1.5 ${activeTheme.cardStyles}`}>
          <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-slate-450">
            <span>Devengado Total Gastos (Personal)</span>
            <Users className="w-4 h-4 text-emerald-450" />
          </div>
          <p className="text-xl font-bold font-display tracking-tight text-white leading-none">
            {formatCOP(totalAccruedCostGlobal)}
          </p>
          <div className="text-[9.5px] text-slate-400">
            IBC de cotización consolidado en el periodo.
          </div>
        </div>

        {/* Retenciones Salud y pension */}
        <div className={`p-4 rounded-2xl border shadow-sm space-y-1.5 ${activeTheme.cardStyles}`}>
          <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-slate-450">
            <span>Aportes Retenidos (Salud/Pensión)</span>
            <HeartPulse className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-bold font-display tracking-tight text-amber-400 leading-none">
            {formatCOP(totalSaludDeductionsGlobal + totalPensionDeductionsGlobal)}
          </p>
          <div className="text-[9.5px] text-slate-455 flex items-center gap-1">
            Salud: {formatCOP(totalSaludDeductionsGlobal)} | Pensión: {formatCOP(totalPensionDeductionsGlobal)}
          </div>
        </div>

        {/* Total pagado neto */}
        <div className={`p-4 rounded-2xl border shadow-sm space-y-1.5 ${activeTheme.cardStyles}`}>
          <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-slate-450">
            <span>Nómina Pagada (Consignada)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <p className="text-xl font-bold font-display tracking-tight text-emerald-400 leading-none">
            {formatCOP(totalPaidCount)}
          </p>
          <div className="text-[9.5px] text-slate-400">
            Egresos bancarios autorizados y debitados.
          </div>
        </div>

        {/* Pendientes de pago */}
        <div className={`p-4 rounded-2xl border shadow-sm space-y-1.5 ${activeTheme.cardStyles}`}>
          <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-slate-450">
            <span>Nómina Pendiente (Calculado)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold font-display tracking-tight text-rose-410 leading-none text-rose-400">
            {formatCOP(totalPendingCount)}
          </p>
          <div className="text-[9.5px] text-slate-400">
            Provisiones salariales líquidas por pagar.
          </div>
        </div>

      </div>

      {/* MAIN MODULE NAVIGATION WRAPPER TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-2 gap-4">
        
        {/* TAB LIST */}
        <div className="flex gap-2 text-xs select-none">
          <button
            onClick={() => setActiveTab('planilla')}
            className={`px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs border cursor-pointer ${
              activeTab === 'planilla'
                ? 'bg-emerald-600/10 border-emerald-500/40 text-emerald-400'
                : 'bg-zinc-950/20 border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Planilla {frequency === 'quincenal' ? 'Quincenal' : 'Mensual'} de Nómina ({activePeriodLogs.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('calculadora');
              if (employeesList.length > 0 && !calcEmployeeId) {
                setCalcEmployeeId(employeesList[0].id);
              }
            }}
            className={`px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs border cursor-pointer ${
              activeTab === 'calculadora'
                ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-400'
                : 'bg-zinc-950/20 border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" /> Liquidar Individualmente (Calculadora)
          </button>

          <button
            onClick={() => setActiveTab('colaboradores')}
            className={`px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs border cursor-pointer ${
              activeTab === 'colaboradores'
                ? 'bg-slate-300/10 border-slate-600/30 text-white'
                : 'bg-zinc-950/20 border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Escalafón de Operarios / Empleados ({employeesList.length})
          </button>

          <button
            onClick={() => setActiveTab('prestaciones')}
            className={`px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs border cursor-pointer ${
              activeTab === 'prestaciones'
                ? 'bg-amber-600/10 border-amber-500/40 text-amber-500'
                : 'bg-zinc-950/20 border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4 text-amber-500" /> Prestaciones Sociales (Pasivos)
          </button>

          <button
            onClick={() => setShowContractSettlementModal(true)}
            className="px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs border border-rose-500/30 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 cursor-pointer shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" /> Liquidación Definitiva (Retiro)
          </button>
        </div>

        {/* Action triggers of current tabs */}
        <div className="flex gap-2">
          {activeTab === 'colaboradores' && (
            <button
              onClick={() => {
                setEditingEmployee(null);
                clearEmployeeForm();
                setShowEmployeeModal(true);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" /> Registrar Empleado
            </button>
          )}

          {activeTab === 'planilla' && (
            <div className="flex flex-wrap gap-2">
              {employeesList.length > activePeriodLogs.length && (
                <button
                  type="button"
                  onClick={handleMassCalculate}
                  className="bg-indigo-600 hover:bg-indigo-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all uppercase tracking-wider"
                >
                  <Calculator className="w-4 h-4 text-indigo-200" /> Liquidar Todo Masivamente
                </button>
              )}

              {activePeriodLogs.some(l => l.dianStatus !== 'aprobado_dian') && (
                <button
                  type="button"
                  onClick={handleMassEmitDianPayroll}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all uppercase tracking-wider shadow"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200" /> Transmitir DIAN Masivo ({activePeriodLogs.filter(l => l.dianStatus !== 'aprobado_dian').length})
                </button>
              )}

              {activePeriodLogs.some(l => l.status === 'calculado') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMassPayingBankAccountId(bankAccounts[0]?.id || '');
                    setShowMassPayModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all uppercase tracking-wider"
                >
                  <CreditCard className="w-4 h-4 text-emerald-100" /> Pago Masivo Directo ({activePeriodLogs.filter(l => l.status === 'calculado').length})
                </button>
              )}

              {activePeriodLogs.length > 0 && (
                <button
                  onClick={() => exportPayrollToExcel(payrollLogs, terceros, selectedPeriod, activeCompany?.name)}
                  className="bg-emerald-600 hover:bg-emerald-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                  title="Exportar planilla consolidada y provisiones patronales a Excel (.xlsx)"
                  id="export-payroll-excel-btn"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-100" /> Exportar Planilla (Excel)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CORE VIEWPORT CARDS */}
      <div className="text-xs">
        
        {/* TAB 1: PLANILLA MENSUAL DE NOMINA */}
        {activeTab === 'planilla' && (
          <div className={`border rounded-3xl overflow-hidden shadow-sm ${activeTheme.cardStyles}`}>
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-950/20">
              <span className="font-bold text-slate-201 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Planilla General de Devengos y Retenciones - Periodo {selectedPeriod}
              </span>
              <span className="text-[10px] text-slate-450">Filtre arriba para cambiar de mes de liquidación</span>
            </div>

            {activePeriodLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-455 select-none space-y-4">
                <Calculator className="w-12 h-12 text-zinc-500 mx-auto mb-1 animate-pulse" />
                <div>
                  <h4 className="font-display font-medium text-slate-200">Planilla de nómina vacía</h4>
                  <p className="max-w-md mx-auto text-[11px] mt-1 text-slate-450">
                    No se han liquidado devengos para este periodo. Use la pestaña <strong className="text-indigo-400 cursor-pointer hover:underline" onClick={() => setActiveTab('calculadora')}>Liquidar Individualmente</strong> si desea agregar novedades personalizadas de horas extras, u oprima el botón para cargarlos masivamente.
                  </p>
                </div>
                
                {employeesList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMassCalculate}
                    className="mx-auto bg-indigo-600 hover:bg-indigo-550 text-white font-bold px-4.5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer uppercase transition-all tracking-wider shadow"
                  >
                    <Plus className="w-4.5 h-4.5 text-indigo-300" /> Liquidar {employeesList.length} Colaboradores Masivamente
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-zinc-950/40 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Operario / Empleado</th>
                      <th className="py-3 px-4 text-center">Días Lab.</th>
                      <th className="py-3 px-4 text-right">Sueldo Base</th>
                      <th className="py-3 px-4 text-right">Extras/Horas</th>
                      <th className="py-3 px-4 text-right">Bonos/Comis</th>
                      <th className="py-3 px-4 text-right">Aux. Transp.</th>
                      <th className="py-3 px-4 text-right">Reten. Salud (4%)</th>
                      <th className="py-3 px-4 text-right">Reten. Pens. (4%)</th>
                      <th className="py-3 px-4 text-right">Pago Neto</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-center">Nómina DIAN</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                    {paginatedPeriodLogs.map((log) => {
                      const employee = terceros.find(t => t.id === log.employeeId);
                      return (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-201 block">{employee ? employee.name : 'Colaborador'}</span>
                            <span className="text-[10px] text-slate-450 font-mono italic">{employee?.employeeCargo || 'Operario'} • CC {employee?.nit}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">{log.daysWorked}d</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-350">{formatCOP(log.baseSalary)}</td>
                          <td className="py-3 px-4 text-right font-mono text-indigo-400">
                            {log.overtimePay > 0 ? formatCOP(log.overtimePay) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-400">
                            {log.bonusPay > 0 ? formatCOP(log.bonusPay) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-500">
                            {log.auxTransporte > 0 ? formatCOP(log.auxTransporte) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-500">-{formatCOP(log.deduccionesSalud)}</td>
                          <td className="py-3 px-4 text-right font-mono text-rose-500">-{formatCOP(log.deduccionesPension)}</td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-450 text-xs">
                            {formatCOP(log.netPay)}
                          </td>
                          <td className="py-3 px-4 text-center select-none">
                            {log.status === 'pagado' ? (
                              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-2.5 py-0.5 rounded-full font-bold">
                                PAGADO
                              </span>
                            ) : (
                              <span className="bg-amber-500/10 text-amber-400 text-[9px] px-2.5 py-0.5 rounded-full font-bold">
                                PENDIENTE
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center select-none">
                            {log.dianStatus === 'aprobado_dian' ? (
                              <div className="flex flex-col items-center">
                                <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> {log.electronicConsecutive || 'NIE'}
                                </span>
                                <span className="text-[8px] text-slate-500 font-mono mt-0.5 truncate max-w-[75px]" title={log.cune}>
                                  {log.cune?.substring(0, 8)}...
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleEmitDianPayroll(log)}
                                className="bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-400 border border-cyan-800/60 p-1 px-2 rounded-lg cursor-pointer text-[9px] font-bold flex items-center gap-1 transition-all"
                                title="Transmitir Nómina Electrónica a la DIAN"
                              >
                                <Sparkles className="w-3 h-3 text-cyan-300" /> Transmitir
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Open printable desprendible */}
                              <button
                                type="button"
                                onClick={() => setViewingPayslip(log)}
                                className="bg-zinc-900 hover:bg-zinc-800 text-slate-200 border border-zinc-750 p-1.5 px-2 rounded-lg cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                title="Ver Desprendible y Colilla Oficial"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-400" /> Colilla
                              </button>

                              {/* Trigger direct bank payout mapping */}
                              {log.status === 'calculado' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPayingLog(log);
                                    setSelectedPayingBankAccountId(bankAccounts[0]?.id || '');
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-550 text-white font-bold p-1.5 px-2 rounded-lg cursor-pointer text-[10px] uppercase tracking-wider"
                                >
                                  Pagar
                                </button>
                              ) : (
                                <span className="text-[10px] text-zinc-500 italic block font-semibold">Consignado</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activePeriodLogs.length > 0 && (
              <Pagination
                currentPage={safePayrollPage}
                totalItems={activePeriodLogs.length}
                pageSize={PAYROLL_PER_PAGE}
                onPageChange={(page) => setPayrollPage(page)}
                isDark={true}
                itemLabel="liquidaciones de nómina"
              />
            )}
          </div>
        )}

        {/* TAB 2: INTERACTIVE CALCULATION WORKSHEET (CALCULADORA) */}
        {activeTab === 'calculadora' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left selector and parameters (5 cols) */}
            <div className={`lg:col-span-5 p-5 rounded-3xl border shadow-sm space-y-4 ${activeTheme.cardStyles}`}>
              <h3 className="font-display font-bold text-sm text-slate-100 flex items-center gap-2 border-b border-white/5 pb-2">
                <Calculator className="w-4.5 h-4.5 text-indigo-400" /> Parámetros de Liquidación Laboral
              </h3>

              <div className="space-y-4 text-xs select-none">
                
                {/* Employee choice */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase">1. Colaborador a Liquidar</label>
                  <select
                    value={calcEmployeeId}
                    onChange={(e) => {
                      setCalcEmployeeId(e.target.value);
                      const emp = employeesList.find(x => x.id === e.target.value);
                      // load custom fields or leave defaults
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 outline-none font-bold text-slate-100"
                    required
                  >
                    <option value="">-- Elija un colaborador --</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeCargo} - {formatCOP(emp.employeeSalary || smmlv)})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedEmployee && (
                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1 text-[10.5px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cargo:</span>
                      <strong className="text-white">{selectedEmployee.employeeCargo}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Salario de Contrato:</span>
                      <strong className="text-white font-mono">{formatCOP(selectedEmployee.employeeSalary || smmlv)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Límite Aux. Transporte (2 SMMLV):</span>
                      <strong className="text-slate-400 font-mono">{formatCOP(smmlv * 2)}</strong>
                    </div>
                  </div>
                )}

                {/* Days Worked Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-455">
                    <span>2. Días Trabajados del Período</span>
                    <span className="text-indigo-400 font-mono text-xs">{calcDays} Días</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={calcDays}
                    onChange={(e) => setCalcDays(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1 rounded-full bg-zinc-850 select-none outline-none focus:outline-none"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500">
                    <span>1 día</span>
                    <span>15 días (Quincena)</span>
                    <span>30 días (Mes completo)</span>
                  </div>
                </div>

                {/* Overtime Inputs (Horas Extras) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-450 uppercase block">3. Horas Extras y Recargos Laborados (Mes)</span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 font-semibold block leading-tight">H.E. Diurna (1.25x)</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={calcHE_Diurna || ''}
                        onChange={(e) => setCalcHE_Diurna(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-mono font-bold text-center text-white"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 font-semibold block leading-tight">H.E. Nocturna (1.75x)</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={calcHE_Nocturna || ''}
                        onChange={(e) => setCalcHE_Nocturna(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-mono font-bold text-center text-white"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 font-semibold block leading-tight">Recg. Nocturno (0.35x)</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={calcRecargoNocturno || ''}
                        onChange={(e) => setCalcRecargoNocturno(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-zinc-950 border border-zinc-805 rounded-lg p-2 font-mono font-bold text-center text-white"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 font-semibold block leading-tight">H.E. Festiva D. (2.10x)</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={calcHE_Festiva || ''}
                        onChange={(e) => setCalcHE_Festiva(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-mono font-bold text-center text-white"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 font-semibold block leading-tight">H.E. Festiva N. (2.50x)</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={calcHE_FestivaNocturna || ''}
                        onChange={(e) => setCalcHE_FestivaNocturna(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-mono font-bold text-center text-white"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 font-semibold block leading-tight">Recg. Festivo (1.75x)</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={calcRecargoFestivo || ''}
                        onChange={(e) => setCalcRecargoFestivo(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-mono font-bold text-center text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Wage and Non-Wage Earnings */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-450 uppercase">4. Bonificaciones Salariales</label>
                    <input
                      type="number"
                      min="0"
                      value={calcBonus || ''}
                      onChange={(e) => setCalcBonus(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-mono text-emerald-400 font-bold"
                      placeholder="COP Valor"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-450 uppercase">5. Bonos No Salariales</label>
                    <input
                      type="number"
                      min="0"
                      value={calcBonusNonWage || ''}
                      onChange={(e) => setCalcBonusNonWage(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-mono text-emerald-500 text-xs"
                      placeholder="Ej: Aux Alimentos"
                    />
                  </div>
                </div>

                {/* Co-op deductions */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-455 uppercase text-slate-450">6. Deducciones Especiales (Ej: Libranzas/Cooperativa)</label>
                  <input
                    type="number"
                    min="0"
                    value={calcOtherDeductions || ''}
                    onChange={(e) => setCalcOtherDeductions(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-mono text-rose-450"
                    placeholder="COP Deducción"
                  />
                </div>

              </div>
            </div>

            {/* Live Accrued details / Payslip Breakdown Preview (7 cols) */}
            <div className={`lg:col-span-7 p-6 rounded-3xl border shadow-sm flex flex-col justify-between ${
              isDark ? 'bg-zinc-950 border-zinc-805 text-white' : 'bg-white border-slate-100 text-slate-800'
            }`}>
              
              <div>
                <h3 className="font-display font-bold text-sm text-slate-800 border-b pb-3 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-indigo-500" /> Liquidación Detallada del Colaborador</span>
                  <span className="font-mono text-[10px] bg-slate-900 text-slate-300 border border-slate-750 px-2 py-0.5 rounded-full uppercase">Pre-Borrador</span>
                </h3>

                {selectedEmployee ? (
                  <div className="space-y-5 text-xs">
                    
                    {/* ACCRUED EARNINGS (Deveganddos) */}
                    <div className="space-y-2">
                      <span className="font-bold text-[10px] uppercase text-indigo-500 block tracking-wider font-display">I. Ingresos Devengados (Salarios y Beneficios)</span>
                      
                      <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl space-y-2 font-medium">
                        
                        {/* Base Salary prorated */}
                        <div className="flex justify-between items-center text-slate-700">
                          <span>Sueldo Básico prorrata ({calcDays}/30 días):</span>
                          <span className="font-mono text-slate-850 font-bold">{formatCOP(currentCalcBreakdown.baseAccrued)}</span>
                        </div>

                        {/* Overtime detailed calculations */}
                        {currentCalcBreakdown.totalOvertime > 0 && (
                          <div className="border-t border-dashed border-slate-200 pt-2 space-y-1 text-slate-600 text-[11px]">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ajuste de Horas Extras y Recargos:</div>
                            {calcHE_Diurna > 0 && (
                              <div className="flex justify-between">
                                <span className="italic pl-2">- Extras Diurnas (x1.25) * {calcHE_Diurna}h:</span>
                                <span className="font-mono">{formatCOP(currentCalcBreakdown.valueHED)}</span>
                              </div>
                            )}
                            {calcHE_Nocturna > 0 && (
                              <div className="flex justify-between">
                                <span className="italic pl-2">- Extras Nocturnas (x1.75) * {calcHE_Nocturna}h:</span>
                                <span className="font-mono">{formatCOP(currentCalcBreakdown.valueHEN)}</span>
                              </div>
                            )}
                            {calcRecargoNocturno > 0 && (
                              <div className="flex justify-between">
                                <span className="italic pl-2">- Recargo Nocturno Ordinario (x0.35) * {calcRecargoNocturno}h:</span>
                                <span className="font-mono">{formatCOP(currentCalcBreakdown.valueRN)}</span>
                              </div>
                            )}
                            {calcHE_Festiva > 0 && (
                              <div className="flex justify-between">
                                <span className="italic pl-2">- Extras Dom/Fest Diurnas (x2.10) * {calcHE_Festiva}h:</span>
                                <span className="font-mono">{formatCOP(currentCalcBreakdown.valueHEDF)}</span>
                              </div>
                            )}
                            {calcHE_FestivaNocturna > 0 && (
                              <div className="flex justify-between">
                                <span className="italic pl-2">- Extras Dom/Fest Nocturnas (x2.50) * {calcHE_FestivaNocturna}h:</span>
                                <span className="font-mono">{formatCOP(currentCalcBreakdown.valueHENF)}</span>
                              </div>
                            )}
                            {calcRecargoFestivo > 0 && (
                              <div className="flex justify-between">
                                <span className="italic pl-2">- Recargo Dom/Fest Diurno (x1.75) * {calcRecargoFestivo}h:</span>
                                <span className="font-mono">{formatCOP(currentCalcBreakdown.valueRDF)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Auxilio Transporte */}
                        <div className="flex justify-between items-center text-slate-700">
                          <span className="flex items-center gap-1">
                            Auxilio de Transporte:
                            {currentCalcBreakdown.computedAux > 0 ? (
                              <span className="bg-emerald-50 text-emerald-600 text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase">Elegible (IBC &le; 2 SMMLV)</span>
                            ) : (
                              <span className="bg-rose-50 text-rose-500 text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase">No elegible (&gt; 2 SMMLV)</span>
                            )}
                          </span>
                          <span className="font-mono text-slate-850 font-bold">{formatCOP(currentCalcBreakdown.computedAux)}</span>
                        </div>

                        {/* Bonuses */}
                        {(calcBonus > 0 || calcBonusNonWage > 0) && (
                          <div className="flex justify-between items-center text-slate-700">
                            <span>Bonificaciones y Viáticos asignados:</span>
                            <span className="font-mono text-slate-850 font-bold">{formatCOP(calcBonus + calcBonusNonWage)}</span>
                          </div>
                        )}

                        {/* SUB TOTAL ACCRUED */}
                        <div className="flex justify-between items-center text-emerald-600 font-bold border-t pt-2 mt-1">
                          <span>Total Devengos Brutos:</span>
                          <span className="font-mono text-base">{formatCOP(currentCalcBreakdown.totalEarning)}</span>
                        </div>
                      </div>
                    </div>

                    {/* DEDUCTIONS (Retenciones) */}
                    <div className="space-y-2">
                      <span className="font-bold text-[10px] uppercase text-rose-500 block tracking-wider font-display">II. Retenciones y Deducciones de Nómina</span>
                      
                      <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl space-y-2 font-medium">
                        
                        {/* Health contribution */}
                        <div className="flex justify-between items-center text-slate-700">
                          <span>Aporte de Salud Empleado (4% del IBC):</span>
                          <span className="font-mono text-rose-600 text-xs font-bold">-{formatCOP(currentCalcBreakdown.deductionHealth)}</span>
                        </div>

                        {/* Pension contribution */}
                        <div className="flex justify-between items-center text-slate-700">
                          <span>Aporte de Pensión Empleado (4% del IBC):</span>
                          <span className="font-mono text-rose-600 text-xs font-bold">-{formatCOP(currentCalcBreakdown.deductionPension)}</span>
                        </div>

                        {/* Custom deductions */}
                        {calcOtherDeductions > 0 && (
                          <div className="flex justify-between items-center text-slate-700">
                            <span>Otras deducciones autorizadas / Libranzas:</span>
                            <span className="font-mono text-rose-600 font-bold">-{formatCOP(calcOtherDeductions)}</span>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 font-bold italic pt-1 border-t">
                          IBC (Ingreso Base de Cotización): <strong className="font-mono">{formatCOP(currentCalcBreakdown.ibc)}</strong>
                        </div>

                        {/* SUB TOTAL DEDUCTIONS */}
                        <div className="flex justify-between items-center text-rose-600 font-bold border-t pt-2 mt-1">
                          <span>Total Retenciones:</span>
                          <span className="font-mono">-{formatCOP(currentCalcBreakdown.totalDeduction)}</span>
                        </div>
                      </div>
                    </div>

                    {/* NET PAYABLE HIGHLIGHT */}
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex justify-between items-center font-display">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold uppercase text-emerald-700">Nómina Líquida a Pagar (Neto)</span>
                        <p className="text-[9.5px] text-emerald-600">A consignar al colaborador en su cuenta bancaria de contrato.</p>
                      </div>
                      <span className="text-xl font-black font-mono text-emerald-600">
                        {formatCOP(currentCalcBreakdown.netPayment)}
                      </span>
                    </div>

                  </div>
                ) : (
                  <div className="p-16 text-center text-slate-400 select-none">
                    <User className="w-12 h-12 text-slate-350 mx-auto mb-2" />
                    <span>Seleccione un colaborador en la columna izquierda para visualizar su desfragmentación y liquidar detalladamente.</span>
                  </div>
                )}
              </div>

              {selectedEmployee && (
                <button
                  type="button"
                  onClick={handleSaveCalculatedRow}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-550 text-white font-bold p-3 rounded-xl text-xs cursor-pointer tracking-wider uppercase shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-indigo-200" /> Grabar e Inscribir en Planilla de {selectedPeriod}
                </button>
              )}

            </div>
          </div>
        )}

        {/* TAB 3: ESCALAFON DE OPERARIOS (EMPLOYEES ROSTER) */}
        {activeTab === 'colaboradores' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employeesList.map((emp) => (
              <div 
                key={emp.id} 
                className={`p-5 rounded-2xl border shadow-sm space-y-4 relative flex flex-col justify-between ${
                  activeTheme.cardStyles
                }`}
              >
                
                {/* Employee Info Header */}
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-slate-850 border border-slate-700 text-indigo-400 flex items-center justify-center font-black">
                        <User className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-white text-sm">{emp.name}</h4>
                        <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full inline-block mt-0.5 uppercase tracking-wider font-bold">
                          {emp.employeeCargo || 'Cargo no asignado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  {/* Salary and Contract Info */}
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-450 font-bold uppercase text-[9px]">Sueldo de Contrato:</span>
                      <strong className="text-emerald-400 font-mono">{formatCOP(emp.employeeSalary || 1423500)}</strong>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-450 font-bold uppercase text-[9px]">Cédula (NIT):</span>
                      <strong className="text-white font-mono">{emp.nit}</strong>
                    </div>

                    {emp.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-450 font-bold uppercase text-[9px]">Celular/Contacto:</span>
                        <strong className="text-white font-mono">{emp.phone}</strong>
                      </div>
                    )}

                    {emp.email && (
                      <div className="flex justify-between">
                        <span className="text-slate-450 font-bold uppercase text-[9px]">Email Corporativo:</span>
                        <strong className="text-slate-300 font-mono text-[11px] truncate max-w-[150px]">{emp.email}</strong>
                      </div>
                    )}

                    {emp.employeeEmergencyContact && (
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-amber-400 font-bold uppercase text-[8.5px] block">Contacto de Emergencia:</span>
                        <p className="text-[10px] text-slate-400 italic mt-0.5">{emp.employeeEmergencyContact}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit & Delete CTA Actions */}
                <div className="pt-3 border-t border-white/5 flex gap-2 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => handleEditEmployeeClick(emp)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-slate-205 p-2 rounded-lg text-center cursor-pointer font-bold select-none text-[10.5px]"
                  >
                    Editar Ficha
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿De verdad desea desvincular de la empresa a ${emp.name}? Se eliminarán sus registros históricos del escalafón.`)) {
                        onDeleteTercero(emp.id);
                        triggerNotification(`Se ha retirado de los registros a ${emp.name}.`);
                      }
                    }}
                    className="bg-rose-550/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 p-2 rounded-lg cursor-pointer flex items-center justify-center.5"
                    title="Liquidar / Retirar Colaborador"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* TAB 4: PRESTACIONES Y PASIVOS LABORALES (SOCIAL SECURITY PROVISIONS) */}
        {activeTab === 'prestaciones' && (
          <div className="space-y-6">
            {/* Top overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-white flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">Total Pasivo de Cesantías (12%)</span>
                  <p className="text-2xl font-black font-mono text-amber-400 mt-2">
                    {formatCOP(
                      activePeriodLogs.reduce((acc, curr) => {
                        const base = curr.baseSalary + curr.overtimePay + curr.auxTransporte;
                        return acc + base * 0.12;
                      }, 0)
                    )}
                  </p>
                </div>
                <div className="text-[9.5px] text-zinc-500 mt-4 border-t border-zinc-900 pt-2 flex justify-between">
                  <span>Provisión Período Actual</span>
                  <span>Factor: 12.0%</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-white flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">Total Pasivo Intereses (1%)</span>
                  <p className="text-2xl font-black font-mono text-orange-400 mt-2">
                    {formatCOP(
                      activePeriodLogs.reduce((acc, curr) => {
                        const base = curr.baseSalary + curr.overtimePay + curr.auxTransporte;
                        return acc + base * 0.01;
                      }, 0)
                    )}
                  </p>
                </div>
                <div className="text-[9.5px] text-zinc-500 mt-4 border-t border-zinc-900 pt-2 flex justify-between">
                  <span>Intereses sobre Cesantías</span>
                  <span>Factor: 1.0%</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-white flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">Total Pasivo de Primas (8.33%)</span>
                  <p className="text-2xl font-black font-mono text-teal-400 mt-2">
                    {formatCOP(
                      activePeriodLogs.reduce((acc, curr) => {
                        const base = curr.baseSalary + curr.overtimePay + curr.auxTransporte;
                        return acc + base * 0.0833;
                      }, 0)
                    )}
                  </p>
                </div>
                <div className="text-[9.5px] text-zinc-500 mt-4 border-t border-zinc-900 pt-2 flex justify-between">
                  <span>Prima de Servicios</span>
                  <span>Factor: 8.33%</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-white flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">Total Pasivo Vacaciones (4.17%)</span>
                  <p className="text-2xl font-black font-mono text-indigo-400 mt-2">
                    {formatCOP(
                      activePeriodLogs.reduce((acc, curr) => {
                        // Vacaciones baseline excludes aux. transporte
                        const base = curr.baseSalary + curr.overtimePay;
                        return acc + base * 0.0417;
                      }, 0)
                    )}
                  </p>
                </div>
                <div className="text-[9.5px] text-zinc-500 mt-4 border-t border-zinc-900 pt-2 flex justify-between">
                  <span>Vacaciones operarios</span>
                  <span>Factor: 4.17%</span>
                </div>
              </div>
            </div>

            {/* General Description Card */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-slate-300 space-y-4">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-500" />
                <h3 className="font-display font-bold text-sm text-slate-100">Autoliquidación Consolidada de Pasivos Laborales y Prestacionales</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Este panel consolida en tiempo real las provisiones obligatorias de la legislación colombiana que la empresa debe reservar por cada uno de los colaboradores activos. Los cálculos toman como referencia la base prestacional de acuerdo al Código Sustantivo del Trabajo (CST).
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-850 space-y-2 text-xs">
                  <span className="font-bold text-indigo-400 text-[11px] uppercase block">Bases de Cálculo Prestacional</span>
                  <ul className="space-y-1 text-slate-300">
                    <li>● <strong>Cesantías (12%):</strong> Incluye Sueldo Básico + Horas Extras + Auxilio de Transporte.</li>
                    <li>● <strong>Intereses de Cesantías (1%):</strong> Calculado mensualmente sobre la base prestacional pro-rata.</li>
                    <li>● <strong>Prima de Servicios (8.33%):</strong> Incluye Sueldo Básico + Horas Extras + Auxilio de Transporte.</li>
                    <li>● <strong>Vacaciones (4.17%):</strong> Incluye únicamente Sueldo Básico + Horas Extras (Excluye Aux. de Transporte).</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-850 text-xs flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-amber-400 text-[11px] uppercase block">Total Pasivo Prestacional Acumulado Período</span>
                    <p className="text-3xl font-black font-mono text-white mt-1">
                      {formatCOP(
                        activePeriodLogs.reduce((acc, curr) => {
                          const baseWithAux = curr.baseSalary + curr.overtimePay + curr.auxTransporte;
                          const baseNoAux = curr.baseSalary + curr.overtimePay;
                          
                          const ces = baseWithAux * 0.12;
                          const int = baseWithAux * 0.01;
                          const pri = baseWithAux * 0.0833;
                          const vac = baseNoAux * 0.0417;
                          
                          return acc + (ces + int + pri + vac);
                        }, 0)
                      )}
                    </p>
                  </div>
                  <p className="text-[9.5px] text-slate-400 mt-4 italic">
                    * Correspondiente a {activePeriodLogs.length} colaboradores con liquidación grabada de nómina para el periodo {selectedPeriod}.
                  </p>
                </div>
              </div>
            </div>

            {/* Individual Breakdown Table */}
            <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">Desglose Detallado por Operario ({selectedPeriod})</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      window.print();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-slate-300 flex items-center gap-1 hover:text-white"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimir Reporte
                  </button>
                </div>
              </div>

              {activePeriodLogs.length === 0 ? (
                <div className="text-center p-12 text-slate-500">
                  <Briefcase className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs">No hay nóminas liquidadas para el período {selectedPeriod}.</p>
                  <p className="text-[10px] text-slate-600 mt-2">Para ver las provisiones, primero calcule e inscriba la nómina de los colaboradores en la pestaña "Liquidar Individualmente".</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-850 text-slate-400 font-bold uppercase text-[9.5px]">
                          <th className="py-2.5">Operario / Cargo</th>
                          <th className="py-2.5 text-right font-mono">Contrato Base</th>
                          <th className="py-2.5 text-right font-mono">Cesantías (12%)</th>
                          <th className="py-2.5 text-right font-mono">Int. Cesantías (1%)</th>
                          <th className="py-2.5 text-right font-mono">Prima (8.32%)</th>
                          <th className="py-2.5 text-right font-mono">Vacaciones (4.17%)</th>
                          <th className="py-2.5 text-right font-mono text-white">Total Provisión</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedProvisionsLogs.map((log) => {
                          const emp = employeesList.find(x => x.id === log.employeeId);
                          const baseWithAux = log.baseSalary + log.overtimePay + log.auxTransporte;
                          const baseNoAux = log.baseSalary + log.overtimePay;
                          
                          const ces = baseWithAux * 0.12;
                          const int = baseWithAux * 0.01;
                          const pri = baseWithAux * 0.0833;
                          const vac = baseNoAux * 0.0417;
                          const total = ces + int + pri + vac;

                          return (
                            <tr key={log.id} className="border-b border-zinc-900 text-slate-300 hover:bg-zinc-900/40">
                              <td className="py-3">
                                <span className="font-bold text-white block">{emp?.name || 'Operario'}</span>
                                <span className="text-[10px] text-slate-400 block">{emp?.employeeCargo || 'Sin Cargo'}</span>
                              </td>
                              <td className="py-3 text-right font-mono">{formatCOP(log.baseSalary)}</td>
                              <td className="py-3 text-right font-mono text-amber-405 font-bold">{formatCOP(ces)}</td>
                              <td className="py-3 text-right font-mono text-orange-405 font-bold">{formatCOP(int)}</td>
                              <td className="py-3 text-right font-mono text-teal-405 font-bold">{formatCOP(pri)}</td>
                              <td className="py-3 text-right font-mono text-indigo-405 font-bold">{formatCOP(vac)}</td>
                              <td className="py-3 text-right font-mono font-black text-white text-sm bg-zinc-900/20">{formatCOP(total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {activePeriodLogs.length > 0 && (
                    <Pagination
                      currentPage={safeProvisionsPage}
                      totalItems={activePeriodLogs.length}
                      pageSize={PAYROLL_PER_PAGE}
                      onPageChange={(page) => setProvisionsPage(page)}
                      isDark={true}
                      itemLabel="provisiones de colaboradores"
                    />
                  )}
                </>
              )}
            </div>

            {/* CUT-OFF ANNUAL SECTION (CORTE ANUAL) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-5 pointer-events-none p-4 w-32 h-32">
                  <Calculator className="w-full h-full text-amber-500" />
                </div>
                <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 font-display">
                  <Calendar className="w-4 h-4 text-amber-500" /> Corte Anual Proyectado (360 Días)
                </h4>
                <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                  Calcule y proyecte el cierre anual consolidado de prestaciones sociales para toda la fuerza laboral registrada.
                </p>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex justify-between border-b border-dashed border-zinc-900 pb-2">
                    <span className="text-slate-450">Colaboradores Totales:</span>
                    <strong className="text-white font-mono">{employeesList.length}</strong>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-zinc-900 pb-2">
                    <span className="text-slate-450">Nómina Mensual Base:</span>
                    <strong className="text-white font-mono">
                      {formatCOP(employeesList.reduce((acc, curr) => acc + (curr.employeeSalary || smmlv), 0))}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-zinc-900 pb-2">
                    <span className="text-slate-450">Cesantías Anuales Proyectadas (12%):</span>
                    <strong className="text-amber-400 font-bold font-mono">
                      {formatCOP(
                        employeesList.reduce((acc, curr) => {
                          const base = (curr.employeeSalary || smmlv) * 12; // Base 1 año
                          return acc + base * 0.12;
                        }, 0)
                      )}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-zinc-900 pb-2">
                    <span className="text-slate-450">Intereses Cesantías Proyectados (1%):</span>
                    <strong className="text-orange-400 font-bold font-mono">
                      {formatCOP(
                        employeesList.reduce((acc, curr) => {
                          const base = (curr.employeeSalary || smmlv) * 12;
                          return acc + base * 0.01;
                        }, 0)
                      )}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-zinc-900 pb-2">
                    <span className="text-slate-450">Prima Servicios Proyectada (8.33%):</span>
                    <strong className="text-teal-400 font-bold font-mono">
                      {formatCOP(
                        employeesList.reduce((acc, curr) => {
                          const base = (curr.employeeSalary || smmlv) * 12;
                          return acc + base * 0.0833;
                        }, 0)
                      )}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-zinc-900 pb-2">
                    <span className="text-slate-450">Vacaciones Proyectadas (4.17%):</span>
                    <strong className="text-indigo-400 font-bold font-mono">
                      {formatCOP(
                        employeesList.reduce((acc, curr) => {
                          const base = (curr.employeeSalary || smmlv) * 12;
                          return acc + base * 0.417 / 10; // 4.17%
                        }, 0)
                      )}
                    </strong>
                  </div>
                  <div className="flex justify-between border-t border-zinc-800 pt-3 text-xs bg-zinc-900/30 p-2.5 rounded-lg mt-2">
                    <span className="font-bold text-white uppercase tracking-wide">Total Pasivo Proyectado (Cierre):</span>
                    <strong className="text-emerald-450 font-black font-mono text-sm">
                      {formatCOP(
                        employeesList.reduce((acc, curr) => {
                          const base = (curr.employeeSalary || smmlv) * 12;
                          const ces = base * 0.12;
                          const int = base * 0.01;
                          const pri = base * 0.0833;
                          const vac = base * 0.0417;
                          return acc + (ces + int + pri + vac);
                        }, 0)
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 font-display">
                    <Percent className="w-4 h-4 text-emerald-500" /> Contabilidad y Provisiones Cruzadas (PUC Colombia)
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    Al liquidar el período, el sistema causa los créditos correspondientes a las provisiones para mantener los balances financieros actualizados en tiempo real:
                  </p>

                  <div className="space-y-2 text-[10.5px]">
                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-850 flex items-start gap-2.5">
                      <div className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[8.5px] font-bold font-mono">DÉBITO</div>
                      <div className="space-y-0.5">
                        <strong className="text-white font-mono block text-xs">Clase 5105 (Gasto Personal)</strong>
                        <span className="text-slate-400 text-[9.5px]">Causa el valor mensual total estimado del gasto de provisiones por prestaciones.</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-850 flex items-start gap-2.5">
                      <div className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8.5px] font-bold font-mono">CRÉDITO</div>
                      <div className="space-y-0.5">
                        <strong className="text-white font-mono block text-xs">Clase 2610 (Obligaciones Laborales - Provisiones)</strong>
                        <span className="text-slate-400 text-[9.5px]">Acredita la cuenta de balance para reflejar el pasivo por pagar a final de año o término de contrato.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-[10.5px] text-emerald-400 mt-4 leading-relaxed font-semibold">
                  * El módulo de contabilidad general lee este pasivo de forma automática para estructurar en tiempo real el <strong>Balance de Prueba</strong> e informes financieros trimestrales.
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* MODAL OFICIAL: COLILLA / VOLANTE DE PAGO DE NÓMINA ELECTRÓNICA DIAN */}
      {viewingPayslip && (
        <PayrollPayslipModal
          isOpen={!!viewingPayslip}
          onClose={() => setViewingPayslip(null)}
          company={activeCompany}
          employee={terceros.find(t => t.id === viewingPayslip.employeeId) || {
            id: viewingPayslip.employeeId,
            name: 'Colaborador',
            nit: '00000000',
            type: 'natural',
            roles: ['empleado'],
            city: 'Bogotá',
            address: ''
          }}
          payroll={viewingPayslip}
        />
      )}

      {/* MODAL: LIQUIDACIÓN DEFINITIVA DE CONTRATO LABORAL CST */}
      {showContractSettlementModal && (
        <ContractSettlementModal
          isOpen={showContractSettlementModal}
          onClose={() => setShowContractSettlementModal(false)}
          company={activeCompany}
          terceros={terceros}
          addVoucher={addVoucher}
        />
      )}

      {/* MODAL: DIRECT BANK CONSIGNATION & ACCOUNTING ROUTE */}
      {payingLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-display font-extrabold text-sm flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" /> Confirmar Desembolso y Contabilización
              </h3>
              <button onClick={() => setPayingLog(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="p-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3.5 rounded-xl text-xs space-y-1">
                <div>Consignando Salario Neto a: <strong>{terceros.find(t => t.id === payingLog.employeeId)?.name || 'Colaborador'}</strong></div>
                <div>Período: <strong>{payingLog.period}</strong></div>
                <div>Importe a Debitarse: <strong className="font-mono text-base">{formatCOP(payingLog.netPay)}</strong></div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[10px] font-black text-slate-450 uppercase">Elegir Cuenta Bancaria de Destilación</label>
                <select
                  value={selectedPayingBankAccountId}
                  onChange={(e) => setSelectedPayingBankAccountId(e.target.value)}
                  className="w-full bg-slate-100 border rounded-xl p-2.5 outline-none font-bold text-slate-800 text-xs"
                  required
                >
                  <option value="">-- Elija la cuenta de origen --</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.name} (Saldo: {formatCOP(b.balance)})
                    </option>
                  ))}
                </select>
                <span className="text-[9.5px] text-slate-450 italic mt-0.5 block">Al grabar, se creará un comprobante NOM y se restará el saldo en el módulo de Bancos.</span>
              </div>

              <div className="flex gap-2 justify-end pt-3 text-xs">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-550 text-white font-black px-4.5 py-2.5 rounded-xl cursor-pointer shadow flex items-center gap-1.5 pr-5"
                >
                  <CheckCircle2 className="w-4.5 h-4.5" /> Confirmar Pago de Nómina
                </button>
                
                <button
                  type="button"
                  onClick={() => setPayingLog(null)}
                  className="bg-white border rounded-xl px-4 py-2.5 cursor-pointer text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Regresar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL: DIRECT MASS BANK CONSIGNATION & ACCOUNTING ROUTE */}
      {showMassPayModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-display font-extrabold text-sm flex items-center gap-2 text-slate-900">
                <CreditCard className="w-5 h-5 text-emerald-600" /> Desembolso y Contabilización Masiva de Nómina
              </h3>
              <button type="button" onClick={() => setShowMassPayModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessMassPayment} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-850 p-4 rounded-xl space-y-1.5 shadow-xs">
                <div className="text-[10px] uppercase font-black tracking-wider text-emerald-800">Resumen de Ejecución de Nómina Masiva</div>
                <div className="grid grid-cols-2 text-xs font-medium">
                  <div>Período de nómina: <strong className="font-bold">{selectedPeriod}</strong></div>
                  <div>Colaboradores a pagar: <strong className="font-bold">{activePeriodLogs.filter(l => l.status === 'calculado').length} operario(s)</strong></div>
                </div>
                <div className="pt-1.5 border-t border-emerald-200 flex justify-between items-center">
                  <span className="font-semibold text-emerald-800 text-[11px] uppercase">Giro total de nómina:</span>
                  <span className="font-mono text-lg font-black text-emerald-700">
                    {formatCOP(activePeriodLogs.filter(l => l.status === 'calculado').reduce((sum, l) => sum + l.netPay, 0))}
                  </span>
                </div>
              </div>

              {/* List of calculated employees to show who gets paid */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-455 uppercase">Detalle del Giro Masivo</label>
                <div className="border border-slate-100 rounded-xl max-h-40 overflow-y-auto divide-y divide-slate-50 bg-slate-50/50">
                  {activePeriodLogs.filter(l => l.status === 'calculado').map(log => {
                    const employee = terceros.find(t => t.id === log.employeeId);
                    return (
                      <div key={log.id} className="p-2.5 flex justify-between items-center text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">{employee?.name || 'Colaborador'}</p>
                          <p className="font-mono text-[9px] text-slate-450 uppercase tracking-widest">{employee?.employeeCargo || 'Operario'}</p>
                        </div>
                        <div className="text-right space-y-0.5">
                          <p className="font-mono font-bold text-slate-800">{formatCOP(log.netPay)}</p>
                          <p className="font-medium text-[9px] text-indigo-650 uppercase">{log.daysWorked} días corr.</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bank Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-455 uppercase">Elegir Cuenta de Pago (Fintekia)</label>
                <select
                  value={selectedMassPayingBankAccountId}
                  onChange={(e) => setSelectedMassPayingBankAccountId(e.target.value)}
                  className="w-full bg-slate-100 border rounded-xl p-2.5 outline-none font-bold text-slate-800 text-xs focus:bg-white"
                  required
                >
                  <option value="">-- Elija la cuenta de origen --</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.name} (Saldo: {formatCOP(b.balance)})
                    </option>
                  ))}
                </select>
                <span className="text-[9px] text-slate-450 italic mt-0.5 block">
                  El sistema generará automáticamente un Comprobante de Egreso (tipo egreso, código NOM-M-*) y asientos contables de partida doble para registrar los débitos del gasto/aux transporte y créditos a la cuenta bancaria para todos los colaboradores del listado en un proceso electrónico inmediato.
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t shrink-0">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4.5 py-2.5 rounded-xl cursor-pointer shadow flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-100" /> Autorizar Pago Masivo
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowMassPayModal(false)}
                  className="bg-white border rounded-xl px-4 py-2.5 cursor-pointer text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Regresar
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EMPLOYEE */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-fade-in flex flex-col justify-between max-h-[90vh]">
            
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-display font-extrabold text-sm flex items-center gap-1 text-slate-850">
                <Plus className="w-4.5 h-4.5 text-indigo-505 text-indigo-600" /> {editingEmployee ? 'Editar Ficha del Colaborador' : 'Inscribir Colaborador en Escalafón'}
              </h3>
              <button onClick={() => setShowEmployeeModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-5 space-y-4 overflow-y-auto text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="w-full bg-slate-100 border p-2.5 rounded-xl focus:bg-white outline-none"
                    placeholder="Ej: Carlos Mario Ruiz"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-455 uppercase text-slate-450">Cédula / Documento Identidad *</label>
                  <input
                    type="text"
                    required
                    value={empNit}
                    onChange={(e) => setEmpNit(e.target.value)}
                    className="w-full bg-slate-100 border p-2.5 rounded-xl focus:bg-white outline-none font-mono"
                    placeholder="Ej: 1.020.455.789"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase">Cargo / Roles de Planta *</label>
                  <input
                    type="text"
                    required
                    value={empCargo}
                    onChange={(e) => setEmpCargo(e.target.value)}
                    className="w-full bg-slate-100 border p-2.5 rounded-xl focus:bg-white outline-none"
                    placeholder="Ej: Auxiliar Panadero, Jefe Operativo"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase">Sueldo Base Mensual de Contrato (COP) *</label>
                  <input
                    type="number"
                    required
                    min="10000"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(parseInt(e.target.value) || 1423500)}
                    className="w-full bg-slate-100 border p-2.5 rounded-xl focus:bg-white outline-none font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase">Celular de Contacto</label>
                  <input
                    type="tel"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full bg-slate-100 border p-2.5 rounded-xl focus:bg-white outline-none"
                    placeholder="Celular"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase">Email</label>
                  <input
                    type="email"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full bg-slate-100 border p-2.5 rounded-xl focus:bg-white outline-none"
                    placeholder="Email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase">Ciudad</label>
                  <input
                    type="text"
                    value={empCity}
                    onChange={(e) => setEmpCity(e.target.value)}
                    className="w-full bg-slate-100 border p-2.5 rounded-xl focus:bg-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-455 uppercase text-slate-450">Dirección Domicilio</label>
                  <input
                    type="text"
                    value={empAddress}
                    onChange={(e) => setEmpAddress(e.target.value)}
                    className="w-full bg-slate-100 border p-2.5 rounded-xl focus:bg-white outline-none"
                    placeholder="Calle, Barrio, Apt"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase">Contacto y Teléfono de Emergencia</label>
                <textarea
                  value={empEmergency}
                  onChange={(e) => setEmpEmergency(e.target.value)}
                  className="w-full bg-slate-100 border p-2.5 rounded-xl focus:bg-white outline-none"
                  placeholder="Ej: Nohora Salazar (Esposa) 3125004030"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-550 text-white font-bold p-2.5 rounded-xl text-xs cursor-pointer px-5"
                >
                  Grabar Registro
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="bg-white border rounded-xl px-5 text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Regresar
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

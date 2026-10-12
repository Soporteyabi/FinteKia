/**
 * Utilidades de Nómina Electrónica, Legislación Laboral Colombiana y Provisiones
 * FinteKia ERP - Contaby
 */
import { Company, Tercero, PayrollLog, PayrollProvisions } from '../types';

export const ARL_RISK_RATES: Record<number, { label: string; rate: number }> = {
  1: { label: 'Clase I - Riesgo Mínimo (Oficina, Administrativo, TI)', rate: 0.00522 },
  2: { label: 'Clase II - Riesgo Bajo (Comercio, Ventas, Almacén ligero)', rate: 0.01044 },
  3: { label: 'Clase III - Riesgo Medio (Procesamiento, Laboratorio, Reparaciones)', rate: 0.02436 },
  4: { label: 'Clase IV - Riesgo Alto (Manufactura pesada, Operación de máquinas)', rate: 0.04350 },
  5: { label: 'Clase V - Riesgo Máximo (Construcción, Trabajo en alturas, Químicos)', rate: 0.06960 },
};

export interface SettlementResult {
  daysWorkedYear: number;
  baseSalary: number;
  hasAuxTransport: boolean;
  auxTransport: number;
  basePrestaciones: number; // Salario + Auxilio de transporte
  cesantias: number;
  interesesCesantias: number;
  primaServicios: number;
  vacaciones: number;
  indemnizacion: number;
  totalLiquidacion: number;
  indemnizacionReason?: string;
}

/**
 * Calcula de forma exhaustiva una nómina individual colombiana
 */
export function calculateColombianPayroll({
  salary,
  daysWorked = 30,
  smmlv = 1423500,
  auxTransporteFull = 172000,
  hedHours = 0,
  henHours = 0,
  hedfHours = 0,
  henfHours = 0,
  rnHours = 0,
  rdfHours = 0,
  wageBonus = 0,
  nonWageBonus = 0,
  otherDeductions = 0,
  arlRiskLevel = 1,
  exoneradoParafiscales = true // Art 114-1 E.T. aplica a sociedades y personas jurídicas para empleados < 10 SMMLV
}: {
  salary: number;
  daysWorked?: number;
  smmlv?: number;
  auxTransporteFull?: number;
  hedHours?: number;
  henHours?: number;
  hedfHours?: number;
  henfHours?: number;
  rnHours?: number;
  rdfHours?: number;
  wageBonus?: number;
  nonWageBonus?: number;
  otherDeductions?: number;
  arlRiskLevel?: 1 | 2 | 3 | 4 | 5;
  exoneradoParafiscales?: boolean;
}) {
  const hourlyBase = salary / 240; // 240 horas mensuales estándar
  const baseAccrued = Math.round((salary * daysWorked) / 30);

  // Horas extras y recargos
  const valueHED = Math.round(hourlyBase * 1.25 * hedHours); // Diurna 1.25x
  const valueHEN = Math.round(hourlyBase * 1.75 * henHours); // Nocturna 1.75x
  const valueHEDF = Math.round(hourlyBase * 2.10 * hedfHours); // Dominical/Festiva Diurna 2.10x
  const valueHENF = Math.round(hourlyBase * 2.50 * henfHours); // Dominical/Festiva Nocturna 2.50x
  const valueRN = Math.round(hourlyBase * 0.35 * rnHours); // Recargo Nocturno Ordinario 0.35x
  const valueRDF = Math.round(hourlyBase * 1.75 * rdfHours); // Recargo Dominical Ordinario 0.75x recargo + ordinario
  const totalOvertime = valueHED + valueHEN + valueHEDF + valueHENF + valueRN + valueRDF;

  // IBC (Ingreso Base de Cotización)
  const ibc = baseAccrued + totalOvertime + wageBonus;

  // Auxilio de Transporte (Si IBC <= 2 * SMMLV prorrateado)
  const twoSmmlvLimit = Math.round((smmlv * 2 * daysWorked) / 30);
  const eligibleAux = ibc <= twoSmmlvLimit;
  const auxTransporte = eligibleAux ? Math.round((auxTransporteFull * daysWorked) / 30) : 0;

  // Deducciones del trabajador (4% Salud, 4% Pensión)
  const deduccionSalud = Math.round(ibc * 0.04);
  const deduccionPension = Math.round(ibc * 0.04);

  // Fondo de Solidaridad Pensional (FSP: 1% si salario mensual >= 4 SMMLV)
  const fspDeduction = salary >= smmlv * 4 ? Math.round(ibc * 0.01) : 0;

  const totalDevengado = ibc + auxTransporte + nonWageBonus;
  const totalDeducciones = deduccionSalud + deduccionPension + fspDeduction + otherDeductions;
  const netPay = Math.max(0, totalDevengado - totalDeducciones);

  // Provisiones Patronales
  // Base Prestacional = IBC + Auxilio de Transporte (Vacaciones sin auxilio)
  const basePrestacional = ibc + auxTransporte;

  const cesantias = Math.round(basePrestacional * 0.08333); // 8.33%
  const interesesCesantias = Math.round(cesantias * 0.12 * (daysWorked / 360)); // 1% mensual (12% anual prorrateado)
  const primaServicios = Math.round(basePrestacional * 0.08333); // 8.33%
  const vacaciones = Math.round(baseAccrued * 0.04167); // 4.17% (solo salario básico proporcional)

  // Seguridad Social Patronal
  const pensionPatronal = Math.round(ibc * 0.12); // 12%
  // Salud Patronal 8.5% (Exonerado si < 10 SMMLV bajo Art 114-1 E.T.)
  const saludPatronal = exoneradoParafiscales && salary < smmlv * 10 ? 0 : Math.round(ibc * 0.085);

  // ARL según clase de riesgo
  const arlRate = ARL_RISK_RATES[arlRiskLevel]?.rate || 0.00522;
  const arl = Math.round(ibc * arlRate);

  // Parafiscales
  const cajaCompensacion = Math.round(ibc * 0.04); // 4% (siempre obligatorio)
  const sena = exoneradoParafiscales && salary < smmlv * 10 ? 0 : Math.round(ibc * 0.02); // 2%
  const icbf = exoneradoParafiscales && salary < smmlv * 10 ? 0 : Math.round(ibc * 0.03); // 3%

  const totalProvisiones =
    cesantias +
    interesesCesantias +
    primaServicios +
    vacaciones +
    pensionPatronal +
    saludPatronal +
    arl +
    cajaCompensacion +
    sena +
    icbf;

  const provisions: PayrollProvisions = {
    cesantias,
    interesesCesantias,
    primaServicios,
    vacaciones,
    saludPatronal,
    pensionPatronal,
    arl,
    sena,
    icbf,
    cajaCompensacion,
    totalProvisiones
  };

  return {
    baseAccrued,
    hourlyBase,
    valueHED,
    valueHEN,
    valueHEDF,
    valueHENF,
    valueRN,
    valueRDF,
    totalOvertime,
    ibc,
    auxTransporte,
    deduccionSalud,
    deduccionPension,
    fspDeduction,
    totalDevengado,
    totalDeducciones,
    netPay,
    provisions
  };
}

/**
 * Generador de CUNE (Código Único de Nómina Electrónica) simula el estándar SHA-384 de la DIAN
 */
export function generateCUNE(
  companyNit: string,
  employeeNit: string,
  period: string,
  netPay: number,
  consecutive: string
): string {
  const rawString = `${companyNit}|${employeeNit}|${period}|${netPay}|${consecutive}|fintekia-dian-seed-2026`;
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
  const hex2 = (Math.abs(hash * 31 + 17) >>> 0).toString(16).padStart(8, 'a');
  const hex3 = (Math.abs(hash * 97 + 53) >>> 0).toString(16).padStart(8, 'f');
  const hex4 = (Math.abs(hash * 131 + 71) >>> 0).toString(16).padStart(8, 'c');
  const hex5 = (Math.abs(hash * 199 + 99) >>> 0).toString(16).padStart(8, 'e');
  const hex6 = (Math.abs(hash * 257 + 101) >>> 0).toString(16).padStart(8, 'b');

  return `${hex1}${hex2}${hex3}${hex4}${hex5}${hex6}`.toLowerCase();
}

/**
 * Generador de XML Estructurado de Nómina Electrónica DIAN (UBL 2.1)
 */
export function generateDianPayrollXML({
  company,
  employee,
  payroll,
  consecutive,
  cune
}: {
  company: Company;
  employee: Tercero;
  payroll: PayrollLog;
  consecutive: string;
  cune: string;
}): string {
  const issueDate = new Date().toISOString().substring(0, 10);
  const issueTime = new Date().toTimeString().substring(0, 8);

  return `<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual"
  xmlns:xs="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  SchemaVersion="1.0">
  <Novedad CUNENov="">false</Novedad>
  <Periodo FechaIngreso="${employee.employeeStartDate || '2024-01-01'}" FechaLiquidacionInicio="${payroll.period}-01" FechaLiquidacionFin="${payroll.period}-30" TiempoLaborado="${payroll.daysWorked}.00" FechaGen="${issueDate}"/>
  <NumeroSecuenciaXML Prefijo="NIE" Consecutivo="${consecutive}"/>
  <LugarGeneracionXML Pais="CO" DepartamentoEstado="11" MunicipioCiudad="11001" Idioma="es"/>
  <InformacionGeneral Version="V1.0: Documento Soporte de Pago de Nómina Electrónica" Ambiente="1" TipoXML="102" CUNE="${cune}" EncripCUNE="CUNE-SHA384" FechaGen="${issueDate}" HoraGen="${issueTime}-05:00" PeriodoNomina="4" TipoMoneda="COP"/>
  <Empleador RazonSocial="${company.name}" NIT="${company.nit}" DV="3" Pais="CO" DepartamentoEstado="11" MunicipioCiudad="11001" Direccion="${company.address}"/>
  <Trabajador PrimerNombre="${employee.name.split(' ')[0]}" PrimerApellido="${employee.name.split(' ')[1] || 'Empleado'}" NumeroDocumento="${employee.nit}" TipoDocumento="13" TipoContrato="1" Sueldo="${payroll.baseSalary}.00" Cargo="${employee.employeeCargo || 'Operativo'}"/>
  <Devengados>
    <Basico DiasTrabajados="${payroll.daysWorked}" SueldoTrabajado="${Math.round((payroll.baseSalary * payroll.daysWorked) / 30)}.00"/>
    ${payroll.auxTransporte > 0 ? `<Transporte AuxilioTransporte="${payroll.auxTransporte}.00"/>` : ''}
    ${payroll.overtimePay > 0 ? `<HorasExtras TotalExtras="${payroll.overtimePay}.00"/>` : ''}
    ${payroll.bonusPay > 0 ? `<Bonificaciones TotalBonificacion="${payroll.bonusPay}.00"/>` : ''}
  </Devengados>
  <Deducciones>
    <Salud Porcentaje="4.00" Deduccion="${payroll.deduccionesSalud}.00"/>
    <Pension Porcentaje="4.00" Deduccion="${payroll.deduccionesPension}.00"/>
    ${(payroll.fspDeduction || 0) > 0 ? `<FondoSP Porcentaje="1.00" Deduccion="${payroll.fspDeduction}.00"/>` : ''}
    ${(payroll.otherDeductionsPay || 0) > 0 ? `<OtrasDeducciones Deduccion="${payroll.otherDeductionsPay}.00"/>` : ''}
  </Deducciones>
  <Redondeo>0.00</Redondeo>
  <DevengadosTotal>${payroll.baseSalary + payroll.overtimePay + payroll.bonusPay + payroll.auxTransporte}.00</DevengadosTotal>
  <DeduccionesTotal>${payroll.deduccionesSalud + payroll.deduccionesPension + (payroll.fspDeduction || 0) + (payroll.otherDeductionsPay || 0)}.00</DeduccionesTotal>
  <ComprobanteTotal>${payroll.netPay}.00</ComprobanteTotal>
</NominaIndividual>`;
}

/**
 * Calculadora oficial de Liquidación Definitiva de Contrato (CST)
 */
export function calculateContractSettlement({
  salary,
  hasAuxTransporte = true,
  auxTransporte = 172000,
  daysWorkedYear = 360,
  pendingVacationDays = 15,
  isUnjustifiedDismissal = false,
  contractType = 'termino_indefinido'
}: {
  salary: number;
  hasAuxTransporte?: boolean;
  auxTransporte?: number;
  daysWorkedYear?: number;
  pendingVacationDays?: number;
  isUnjustifiedDismissal?: boolean;
  contractType?: 'termino_indefinido' | 'termino_fijo' | 'obra_labor';
}): SettlementResult {
  const basePrestaciones = hasAuxTransporte ? salary + auxTransporte : salary;

  // 1. Cesantías: (Salario base con auxilio * días trabajados en el año) / 360
  const cesantias = Math.round((basePrestaciones * daysWorkedYear) / 360);

  // 2. Intereses sobre cesantías: (Cesantías * días trabajados * 0.12) / 360
  const interesesCesantias = Math.round((cesantias * daysWorkedYear * 0.12) / 360);

  // 3. Prima de Servicios: (Salario base con auxilio * días trabajados en el semestre) / 360
  const primaServicios = Math.round((basePrestaciones * (daysWorkedYear % 180 || daysWorkedYear)) / 360);

  // 4. Vacaciones compensadas: (Salario básico sin auxilio * días pendientes) / 30
  const vacaciones = Math.round((salary * pendingVacationDays) / 30);

  // 5. Indemnización por despido sin justa causa (Art. 64 CST)
  let indemnizacion = 0;
  let indemnizacionReason = 'Terminación voluntaria o con justa causa (sin indemnización)';

  if (isUnjustifiedDismissal) {
    if (contractType === 'termino_indefinido') {
      // Menos de 10 SMMLV: 30 días de salario por el primer año, 20 días por los siguientes
      const years = Math.max(1, Math.ceil(daysWorkedYear / 360));
      const firstYearCompensation = salary; // 30 días = 1 mes
      const nextYearsCompensation = (years - 1) * Math.round((salary * 20) / 30);
      indemnizacion = firstYearCompensation + nextYearsCompensation;
      indemnizacionReason = `Indemnización Art. 64 CST (${years} año(s) de servicio)`;
    } else {
      // Término fijo: Salarios restantes del contrato (mínimo 15 días)
      indemnizacion = Math.round((salary * 30) / 30);
      indemnizacionReason = 'Indemnización contrato a término fijo (tiempo faltante)';
    }
  }

  const totalLiquidacion = cesantias + interesesCesantias + primaServicios + vacaciones + indemnizacion;

  return {
    daysWorkedYear,
    baseSalary: salary,
    hasAuxTransport: hasAuxTransporte,
    auxTransport: auxTransporte,
    basePrestaciones,
    cesantias,
    interesesCesantias,
    primaServicios,
    vacaciones,
    indemnizacion,
    indemnizacionReason,
    totalLiquidacion
  };
}

/**
 * Genera el texto estructurado para enviar la colilla de nómina por WhatsApp
 */
export function buildPayrollWhatsAppMessage(
  company: Company,
  employee: Tercero,
  payroll: PayrollLog
): string {
  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);

  let text = `📄 *COMPROBANTE DE PAGO DE NÓMINA*\n`;
  text += `🏛️ *${company.name.toUpperCase()}*\n`;
  text += `NIT: ${company.nit}\n`;
  text += `----------------------------------------\n`;
  text += `👤 *Colaborador:* ${employee.name}\n`;
  text += `🪪 *Cédula:* ${employee.nit}\n`;
  text += `💼 *Cargo:* ${employee.employeeCargo || 'Colaborador'}\n`;
  text += `📅 *Periodo:* ${payroll.period} (${payroll.daysWorked} días)\n`;
  if (payroll.electronicConsecutive) {
    text += `⚡ *Nómina DIAN:* ${payroll.electronicConsecutive} (Aprobada)\n`;
  }
  text += `----------------------------------------\n`;
  text += `💰 *DEVENGADOS:*\n`;
  text += `  • Salario Básico Proporcional: ${formatCOP(Math.round((payroll.baseSalary * payroll.daysWorked) / 30))}\n`;
  if (payroll.auxTransporte > 0) {
    text += `  • Auxilio de Transporte: ${formatCOP(payroll.auxTransporte)}\n`;
  }
  if (payroll.overtimePay > 0) {
    text += `  • Horas Extras y Recargos: ${formatCOP(payroll.overtimePay)}\n`;
  }
  if (payroll.bonusPay > 0) {
    text += `  • Bonificaciones / Otros: ${formatCOP(payroll.bonusPay)}\n`;
  }
  text += `\n📉 *DEDUCCIONES:*\n`;
  text += `  • Salud (4%): -${formatCOP(payroll.deduccionesSalud)}\n`;
  text += `  • Pensión (4%): -${formatCOP(payroll.deduccionesPension)}\n`;
  if ((payroll.fspDeduction || 0) > 0) {
    text += `  • Fondo Solidaridad Pensional: -${formatCOP(payroll.fspDeduction || 0)}\n`;
  }
  if ((payroll.otherDeductionsPay || 0) > 0) {
    text += `  • Otras Deducciones / Libranza: -${formatCOP(payroll.otherDeductionsPay || 0)}\n`;
  }
  text += `----------------------------------------\n`;
  text += `💵 *NETO PAGADO A CUENTA:* *${formatCOP(payroll.netPay)}*\n`;
  if (employee.employeeBank && employee.employeeAccountNumber) {
    text += `🏦 *Abono:* ${employee.employeeBank} ${employee.employeeAccountType || 'Ahorros'} No. ${employee.employeeAccountNumber}\n`;
  }
  if (payroll.cune) {
    text += `\n🔒 *CUNE DIAN:* \`${payroll.cune.substring(0, 24)}...\`\n`;
  }
  text += `\n_Emitido electrónicamente conforme a la Resolución DIAN 000013._`;

  return encodeURIComponent(text);
}

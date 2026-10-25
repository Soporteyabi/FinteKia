import { FiscalPeriod, FiscalPeriodAuditLog } from '../types';

const STORAGE_KEY_PREFIX = 'fintekia_fiscal_periods_';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Generate default 12 fiscal periods for a specific year and company.
 */
export function generateDefaultPeriods(companyId: string, year: number): FiscalPeriod[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const id = `${year}-${monthStr}`;
    const monthName = `${MONTH_NAMES[index]} ${year}`;

    // For demo purposes, previous months can be closed or open based on current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    let status: FiscalPeriod['status'] = 'abierto';
    let closedAt: string | undefined = undefined;
    let closedBy: string | undefined = undefined;
    let closingNotes: string | undefined = undefined;
    const auditLogs: FiscalPeriodAuditLog[] = [];

    // If it's a past year, mark as locked by default
    if (year < currentYear) {
      status = 'cerrado_bloqueado';
      closedAt = `${year}-12-31T23:59:59Z`;
      closedBy = 'Contador General (Carlos Vélez - T.P. 184920-T)';
      closingNotes = `Cierre formal y consolidación fiscal del ejercicio ${year}.`;
      auditLogs.push({
        id: `log-${Date.now()}-${index}`,
        action: 'cierre_definitivo',
        timestamp: closedAt,
        user: closedBy,
        reason: closingNotes
      });
    } else if (year === currentYear && month < currentMonth - 1) {
      // Past months can be set as closed by default
      status = 'cerrado_bloqueado';
      closedAt = `${year}-${monthStr}-28T18:00:00Z`;
      closedBy = 'Contador General (Carlos Vélez - T.P. 184920-T)';
      closingNotes = `Cierre contable mensual ordinario y validación de balances.`;
      auditLogs.push({
        id: `log-${Date.now()}-${index}`,
        action: 'cierre_definitivo',
        timestamp: closedAt,
        user: closedBy,
        reason: closingNotes
      });
    }

    return {
      id,
      year,
      month,
      monthName,
      status,
      companyId,
      closedAt,
      closedBy,
      closingNotes,
      auditLogs
    };
  });
}

/**
 * Retrieve fiscal periods for a company and year.
 */
export function getFiscalPeriods(companyId: string = 'default', year: number = new Date().getFullYear()): FiscalPeriod[] {
  const key = `${STORAGE_KEY_PREFIX}${companyId}_${year}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 12) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading fiscal periods from localStorage', e);
  }

  // Generate and save defaults if not found
  const defaults = generateDefaultPeriods(companyId, year);
  saveFiscalPeriods(companyId, year, defaults);
  return defaults;
}

/**
 * Persist fiscal periods for a company and year.
 */
export function saveFiscalPeriods(companyId: string = 'default', year: number, periods: FiscalPeriod[]): void {
  const key = `${STORAGE_KEY_PREFIX}${companyId}_${year}`;
  try {
    localStorage.setItem(key, JSON.stringify(periods));
  } catch (e) {
    console.error('Error saving fiscal periods to localStorage', e);
  }
}

/**
 * Check if a specific ISO date string (YYYY-MM-DD) falls in a locked/closed period.
 */
export function isDateInLockedPeriod(
  dateStr: string,
  companyId: string = 'default'
): { isLocked: boolean; period?: FiscalPeriod; reason?: string } {
  if (!dateStr) return { isLocked: false };

  try {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const periodId = `${year}-${parts[1]}`;

      const periods = getFiscalPeriods(companyId, year);
      const period = periods.find(p => p.id === periodId);

      if (period && period.status === 'cerrado_bloqueado') {
        return {
          isLocked: true,
          period,
          reason: `El periodo ${period.monthName} está cerrado y bloqueado por auditoría contable (Cerrado por: ${period.closedBy || 'Contador'}). No se permiten modificaciones ni asientos extemporáneos.`
        };
      }
    }
  } catch (e) {
    console.error('Error checking date locked period', e);
  }

  return { isLocked: false };
}

/**
 * Lock and close a fiscal period.
 */
export function lockFiscalPeriod(
  companyId: string,
  year: number,
  periodId: string,
  user: string,
  notes?: string,
  metrics?: { totalVouchers: number; totalDebit: number; totalCredit: number; netIncome: number; closingVoucherNumber?: string }
): FiscalPeriod[] {
  const periods = getFiscalPeriods(companyId, year);
  const now = new Date().toISOString();

  const updatedPeriods = periods.map(p => {
    if (p.id === periodId) {
      const newLog: FiscalPeriodAuditLog = {
        id: `log-${Date.now()}`,
        action: 'cierre_definitivo',
        timestamp: now,
        user,
        reason: notes || 'Cierre contable mensual y bloqueo preventivo de periodo.',
        metricsSnapshot: metrics ? {
          totalVouchers: metrics.totalVouchers,
          totalDebit: metrics.totalDebit,
          totalCredit: metrics.totalCredit,
          netIncome: metrics.netIncome
        } : undefined
      };

      return {
        ...p,
        status: 'cerrado_bloqueado' as const,
        closedAt: now,
        closedBy: user,
        closingNotes: notes,
        voucherCount: metrics?.totalVouchers,
        totalDebits: metrics?.totalDebit,
        totalCredits: metrics?.totalCredit,
        netResult: metrics?.netIncome,
        closingVoucherNumber: metrics?.closingVoucherNumber,
        auditLogs: [newLog, ...(p.auditLogs || [])]
      };
    }
    return p;
  });

  saveFiscalPeriods(companyId, year, updatedPeriods);
  return updatedPeriods;
}

/**
 * Unlock and reopen a previously locked fiscal period with formal audit reason.
 */
export function unlockFiscalPeriod(
  companyId: string,
  year: number,
  periodId: string,
  user: string,
  reason: string
): FiscalPeriod[] {
  const periods = getFiscalPeriods(companyId, year);
  const now = new Date().toISOString();

  const updatedPeriods = periods.map(p => {
    if (p.id === periodId) {
      const newLog: FiscalPeriodAuditLog = {
        id: `log-${Date.now()}`,
        action: 'desbloqueo',
        timestamp: now,
        user,
        reason: reason || 'Reapertura autorizada para ajustes contables extemporáneos.'
      };

      return {
        ...p,
        status: 'abierto' as const,
        unlockedAt: now,
        unlockedBy: user,
        unlockReason: reason,
        auditLogs: [newLog, ...(p.auditLogs || [])]
      };
    }
    return p;
  });

  saveFiscalPeriods(companyId, year, updatedPeriods);
  return updatedPeriods;
}

/**
 * Toggle pre-close status for a period.
 */
export function setPeriodPreClose(
  companyId: string,
  year: number,
  periodId: string,
  user: string
): FiscalPeriod[] {
  const periods = getFiscalPeriods(companyId, year);
  const now = new Date().toISOString();

  const updatedPeriods = periods.map(p => {
    if (p.id === periodId) {
      const nextStatus = p.status === 'pre-cierre' ? 'abierto' : 'pre-cierre';
      const newLog: FiscalPeriodAuditLog = {
        id: `log-${Date.now()}`,
        action: nextStatus === 'pre-cierre' ? 'pre_cierre' : 'desbloqueo',
        timestamp: now,
        user,
        reason: nextStatus === 'pre-cierre' ? 'Periodo puesto en fase de pre-cierre para auditoría' : 'Periodo retornado a estado abierto ordinario'
      };

      return {
        ...p,
        status: nextStatus as 'abierto' | 'pre-cierre',
        auditLogs: [newLog, ...(p.auditLogs || [])]
      };
    }
    return p;
  });

  saveFiscalPeriods(companyId, year, updatedPeriods);
  return updatedPeriods;
}

import React from 'react';
import { THEMES_MAP } from './Sidebar';

interface KPICardsProps {
  sales: number;
  expenses: number;
  profit: number;
  margin: string;
  clientsCount: number;
  theme?: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
}

export default function KPICards({ sales, expenses, profit, margin, clientsCount, theme = 'slate_gray' }: KPICardsProps) {
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const isProfitPositive = profit >= 0;
  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;
  const isDark = theme === 'navy_dark' || theme === 'light_gray';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* 1. SALES */}
      <div className={`${activeTheme.cardStyles} p-6 flex items-center gap-5 transition-transform hover:-translate-y-1 duration-200`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${
          isDark ? 'bg-blue-950/50 text-blue-400' : 'bg-blue-100 text-blue-600'
        }`}>
          <i className="ri-money-dollar-circle-fill text-2xl"></i>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ventas Totales</p>
          <p className={`text-2xl font-bold font-display tracking-tight mt-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCOP(sales)}</p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-500 mt-1">
            <i className="ri-arrow-up-line"></i>
            <span>Ingreso bruto facturado</span>
          </div>
        </div>
      </div>

      {/* 2. EXPENSES */}
      <div className={`${activeTheme.cardStyles} p-6 flex items-center gap-5 transition-transform hover:-translate-y-1 duration-200`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${
          isDark ? 'bg-rose-950/50 text-rose-400' : 'bg-rose-100 text-rose-600'
        }`}>
          <i className="ri-arrow-down-circle-fill text-2xl"></i>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gastos de Operación</p>
          <p className={`text-2xl font-bold font-display tracking-tight mt-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCOP(expenses)}</p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mt-1">
            <i className="ri-information-line text-xs"></i>
            <span>Materia prima + Costo</span>
          </div>
        </div>
      </div>

      {/* 3. PROFIT */}
      <div className={`${activeTheme.cardStyles} p-6 flex items-center gap-5 transition-transform hover:-translate-y-1 duration-200`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${
          isProfitPositive 
            ? (isDark ? 'bg-emerald-950/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600') 
            : (isDark ? 'bg-amber-950/50 text-amber-400' : 'bg-amber-100 text-amber-600')
        }`}>
          <i className={`${isProfitPositive ? 'ri-wallet-3-fill' : 'ri-coupon-3-fill'} text-2xl`}></i>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Utilidad Neta</p>
          <p className={`text-2xl font-bold font-display tracking-tight mt-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCOP(profit)}</p>
          <div className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${
            isProfitPositive ? 'text-emerald-500' : 'text-amber-500'
          }`}>
            <span>Margen Neto: {margin}</span>
          </div>
        </div>
      </div>

      {/* 4. CLIENTS */}
      <div className={`${activeTheme.cardStyles} p-6 flex items-center gap-5 transition-transform hover:-translate-y-1 duration-200`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${
          isDark ? 'bg-purple-950/50 text-purple-400' : 'bg-purple-100 text-purple-600'
        }`}>
          <i className="ri-user-star-fill text-2xl"></i>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clientes Activos</p>
          <p className={`text-2xl font-bold font-display tracking-tight mt-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{clientsCount}</p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-purple-400 mt-1">
            <i className="ri-shield-user-fill"></i>
            <span>Terceros autorizados</span>
          </div>
        </div>
      </div>
    </div>
  );
}

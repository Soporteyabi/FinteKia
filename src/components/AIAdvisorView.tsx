import React, { useState } from 'react';
import { Company, Voucher, InventoryItem, Product } from '../types';

interface AIAdvisorViewProps {
  currentCompany: Company;
  vouchers: Voucher[];
  inventory: InventoryItem[];
  products: Product[];
}

export default function AIAdvisorView({ currentCompany, vouchers, inventory, products }: AIAdvisorViewProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [errorMsg, setErrorMessage] = useState<string | null>(null);

  const requestAnalysis = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Calculate totals
      const salesInvs = vouchers.filter((v) => v.type === 'venta');
      const purchaseInvs = vouchers.filter((v) => v.type === 'compra');
      const salesSum = salesInvs.reduce((acc, v) => acc + v.total, 0);
      const purchaseSum = purchaseInvs.reduce((acc, v) => acc + v.total, 0);
      const netProfit = salesSum - purchaseSum;
      const margin = salesSum > 0 ? `${Math.round((netProfit / salesSum) * 100)}%` : '0%';

      // Stocks List
      const stockList = inventory.map((item) => {
        const p = products.find((prod) => prod.id === item.productId);
        return {
          productName: p ? p.name : 'Unknown',
          sku: p ? p.sku : '',
          qty: item.quantity,
          type: p ? p.type : ''
        };
      });

      // deficits list
      const deficitsList = stockList.filter((s) => s.type === 'materia_prima' && s.qty < 50);

      const payload = {
        companyName: currentCompany.name,
        totals: {
          sales: salesSum,
          expenses: purchaseSum,
          profit: netProfit,
          margin: margin
        },
        productsCount: products.length,
        stockList: stockList.slice(0, 10),
        deficitsList: deficitsList,
        payrollSummary: []
      };

      const response = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fallo de Sincronización Contable con la IA.');
      }

      const resData = await response.json();
      setReport(resData.analysis);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'La clave Gemini API no se encuentra asignada en los secretos de la plataforma.');
    } finally {
      setLoading(false);
    }
  };

  // Ultra raw markdown formatter to avoid bulky imports
  const formatMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-bold text-slate-800 mt-4 mb-2 tracking-tight uppercase border-b pb-1 border-slate-100">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-base font-bold text-blue-600 mt-6 mb-3 tracking-tight font-display uppercase border-l-4 border-blue-600 pl-2">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="text-lg font-bold text-slate-900 mt-8 mb-4 border-b pb-2 font-display">{line.replace('# ', '')}</h2>;
      }
      // Lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <div key={idx} className="flex gap-2 items-start text-xs text-slate-600 pl-4 py-0.5">
            <span className="text-blue-500 font-bold">•</span>
            <span className="leading-relaxed">{line.replace(/^[\s-*]+/, '')}</span>
          </div>
        );
      }
      // Standard Paragraphs with bold parsing
      const parts = line.split('**');
      const formattedLine = parts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          return <strong key={pIdx} className="font-bold text-slate-900">{part}</strong>;
        }
        return part;
      });

      return <p key={idx} className="text-xs leading-relaxed text-slate-600 my-1">{formattedLine}</p>;
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="font-display font-semibold text-lg text-slate-800 tracking-tight">FinteKia AI Advisor</h2>
          <p className="text-xs text-slate-400">Auditoría contable y consultoría predictiva por Inteligencia Artificial</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
          <i className="ri-shining-fill text-indigo-600"></i>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        <div className="lg:col-span-1 text-center bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white text-3xl font-bold flex items-center justify-center shadow-lg shadow-indigo-600/10 mx-auto">
            <i className="ri-sparkling-fill animate-pulse"></i>
          </div>
          <div>
            <h4 className="font-display font-bold text-slate-800 text-sm">Consultoría Total</h4>
            <p className="text-[10px] text-slate-400 mt-1">Sincroniza balances contables, Kardex de materias primas y estimación DIAN en la IA.</p>
          </div>
          <button
            onClick={requestAnalysis}
            disabled={loading}
            className="w-full py-2 bg-indigo-600 text-white font-semibold text-xs tracking-wider rounded-lg uppercase shadow-md hover:bg-indigo-500 hover:shadow-lg disabled:opacity-40 transition-all flex items-center justify-center gap-1"
          >
            {loading ? (
              <>
                <i className="ri-loader-2-line animate-spin text-sm"></i>
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <i className="ri-sparkle-fill"></i>
                <span>Auditar balances</span>
              </>
            )}
          </button>
        </div>

        <div className="lg:col-span-3 min-h-[220px] bg-slate-950 text-slate-300 rounded-2xl border border-slate-850 p-6 font-mono text-xs flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-4 text-slate-500 text-[10px]">
            <span>SHELL AI PROMPT OUTPUT</span>
            <span className="font-bold text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> CONECTADO
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 max-h-96 pr-2 scrollbar-thin">
            {report ? (
              <div className="space-y-2 font-sans text-slate-300 antialiased p-2 bg-slate-900 border border-slate-800 rounded-xl leading-relaxed">
                {formatMarkdown(report)}
              </div>
            ) : errorMsg ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-sans leading-normal">
                <p className="font-bold uppercase tracking-wider text-[10px] text-rose-400">ALERTA REQUERIDA DE CONEXIÓN</p>
                <p className="text-xs mt-1.5 leading-relaxed">{errorMsg}</p>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 flex flex-col items-center justify-center space-y-3 font-sans">
                <i className="ri-mind-map text-4xl opacity-20"></i>
                <p className="text-xs">Haga clic en 'Auditar balances' para permitir que Gemini AI compile diagnósticos financieros en tiempo real.</p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 pt-3 mt-4 text-[9px] text-slate-600 flex justify-between uppercase">
            <span>Powered by Gemini 3.5 Flash Latest</span>
            <span>DIAN Colombia Compliant v1.2</span>
          </div>
        </div>
      </div>

    </div>
  );
}

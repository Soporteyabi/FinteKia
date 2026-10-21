import React, { useState } from 'react';
import { Company, Voucher, InventoryItem, Product } from '../types';

interface AIAdvisorViewProps {
  currentCompany: Company;
  vouchers: Voucher[];
  inventory: InventoryItem[];
  products: Product[];
  theme?: string;
}

export default function AIAdvisorView({ 
  currentCompany, 
  vouchers, 
  inventory, 
  products,
  theme = 'light_gray'
}: AIAdvisorViewProps) {
  const isLight = theme === 'light_gray';

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [reportSource, setReportSource] = useState<string | null>(null);
  const [errorMsg, setErrorMessage] = useState<string | null>(null);

  // Optional Custom Gemini API Key configuration
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [customKey, setCustomKey] = useState<string>(() => {
    return localStorage.getItem('fintekia_custom_gemini_key') || '';
  });
  const [tempKeyInput, setTempKeyInput] = useState<string>('');

  const handleSaveKey = () => {
    const trimmed = tempKeyInput.trim();
    setCustomKey(trimmed);
    if (trimmed) {
      localStorage.setItem('fintekia_custom_gemini_key', trimmed);
    } else {
      localStorage.removeItem('fintekia_custom_gemini_key');
    }
    setShowKeyModal(false);
  };

  const requestAnalysis = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Calculate totals
      const salesInvs = vouchers.filter((v) => v.type === 'venta');
      const purchaseInvs = vouchers.filter((v) => v.type === 'compra');
      const salesSum = salesInvs.reduce((acc, v) => acc + (v.total || 0), 0);
      const purchaseSum = purchaseInvs.reduce((acc, v) => acc + (v.total || 0), 0);
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

      // Deficits list
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
        payrollSummary: [],
        userApiKey: customKey || undefined
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
      setReportSource(resData.source || 'fintekia-core-engine');
    } catch (e: any) {
      console.error('Advisor request error:', e);
      setErrorMessage(e.message || 'Error al conectar con el servicio de análisis contable.');
    } finally {
      setLoading(false);
    }
  };

  // Ultra-clean Markdown Formatter
  const formatMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      // Horizontal Rule
      if (line.trim() === '---') {
        return <hr key={idx} className="my-4 border-slate-700/60" />;
      }
      // Blockquote
      if (line.startsWith('> ')) {
        return (
          <div key={idx} className="p-2.5 rounded-lg bg-blue-500/10 border-l-4 border-blue-500 text-blue-200 text-xs my-2 italic">
            {line.replace(/^>\s*/, '')}
          </div>
        );
      }
      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-bold text-white mt-4 mb-2 tracking-tight uppercase border-b pb-1 border-slate-800 flex items-center gap-1.5">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-base font-black text-cyan-400 mt-6 mb-3 tracking-tight uppercase border-l-4 border-cyan-500 pl-2">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="text-lg font-black text-white mt-8 mb-4 border-b pb-2">{line.replace('# ', '')}</h2>;
      }
      // Lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const content = line.replace(/^[\s-*]+/, '');
        const parts = content.split('**');
        return (
          <div key={idx} className="flex gap-2 items-start text-xs text-slate-300 pl-3 py-1">
            <span className="text-cyan-400 font-bold shrink-0">•</span>
            <span className="leading-relaxed">
              {parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="font-bold text-white">{p}</strong> : p)}
            </span>
          </div>
        );
      }
      // Standard Paragraphs with bold parsing
      const parts = line.split('**');
      const formattedLine = parts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          return <strong key={pIdx} className="font-bold text-white">{part}</strong>;
        }
        return part;
      });

      return <p key={idx} className="text-xs leading-relaxed text-slate-300 my-1">{formattedLine}</p>;
    });
  };

  return (
    <div className={`rounded-3xl border p-6 sm:p-8 shadow-xl space-y-6 select-none ${
      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900/90 border-slate-800 text-slate-100'
    }`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[10.5px] font-bold mb-1.5 border bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Inteligencia Financiera & Control MRP</span>
          </div>
          <h2 className={`font-black text-xl tracking-tight ${isLight ? 'text-slate-950' : 'text-white'}`}>
            FinteKia AI Advisor
          </h2>
          <p className="text-xs text-slate-500">
            Auditoría contable experta, estimación de márgenes DIAN y diagnóstico predictivo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTempKeyInput(customKey);
              setShowKeyModal(true);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              customKey
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' 
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Configurar clave Gemini API"
          >
            <i className={`ri-key-2-line ${customKey ? 'text-emerald-500' : ''}`}></i>
            <span>{customKey ? 'API Key Configurada' : 'Configurar Gemini API'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Action Box */}
        <div className={`lg:col-span-1 p-6 rounded-2xl border text-center space-y-4 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-800'
        }`}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-2xl font-bold flex items-center justify-center shadow-md mx-auto">
            <i className="ri-sparkling-fill animate-pulse"></i>
          </div>

          <div>
            <h4 className={`font-black text-sm ${isLight ? 'text-slate-950' : 'text-white'}`}>
              Consultoría Total
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Sincroniza balances contables, Kardex de materias primas y estimación DIAN en la IA.
            </p>
          </div>

          <div className={`p-3 rounded-xl border text-left text-[11px] space-y-1 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}>
            <div className="flex justify-between">
              <span className="text-slate-500">Empresa:</span>
              <strong className="truncate max-w-[120px] font-black">{currentCompany.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Comprobantes:</span>
              <strong className="font-mono">{vouchers.length}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Artículos:</span>
              <strong className="font-mono">{products.length}</strong>
            </div>
          </div>

          <button
            onClick={requestAnalysis}
            disabled={loading}
            id="audit-balances-btn"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs tracking-wider rounded-xl uppercase shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <i className="ri-loader-4-line animate-spin text-base"></i>
                <span>Compilando Auditoría...</span>
              </>
            ) : (
              <>
                <i className="ri-sparkle-fill"></i>
                <span>Auditar Balances</span>
              </>
            )}
          </button>
        </div>

        {/* Right Output Terminal */}
        <div className="lg:col-span-3 min-h-[380px] bg-slate-950 text-slate-300 rounded-2xl border border-slate-800 p-6 font-mono text-xs flex flex-col justify-between shadow-2xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 text-slate-500 text-[10.5px]">
            <span className="flex items-center gap-2 font-mono">
              <i className="ri-terminal-box-line text-blue-400"></i>
              <span>FINTEKIA ADVISOR PROMPT OUTPUT</span>
            </span>
            <span className="font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{reportSource === 'gemini-3.8-flash' ? 'GEMINI 3.8 FLASH CLOUD' : 'SISTEMA ACTIVO'}</span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 max-h-[500px] pr-2 scrollbar-thin">
            {report ? (
              <div className="space-y-2 font-sans text-slate-300 antialiased p-4 bg-slate-900/90 border border-slate-800 rounded-xl leading-relaxed">
                {formatMarkdown(report)}
              </div>
            ) : errorMsg ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-sans leading-normal space-y-2">
                <p className="font-bold uppercase tracking-wider text-[11px] text-rose-400 flex items-center gap-1.5">
                  <i className="ri-error-warning-line text-sm"></i>
                  <span>Alerta de Conexión</span>
                </p>
                <p className="text-xs leading-relaxed">{errorMsg}</p>
                <p className="text-[11px] text-slate-400">
                  Puedes configurar tu clave en el botón superior <strong>"Configurar Gemini API"</strong> o continuar con el motor contable determinístico.
                </p>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center space-y-3 font-sans">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                  <i className="ri-mind-map text-2xl"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-400">Listo para generar diagnóstico</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Haz clic en <strong>'Auditar Balances'</strong> para evaluar la salud contable, rentabilidad de ventas, insumos críticos y provisiones de tu empresa.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800/80 pt-3 mt-4 text-[9.5px] text-slate-500 flex flex-wrap justify-between gap-2 uppercase font-mono">
            <span>Motor: {reportSource === 'gemini-3.8-flash' ? 'Google Gemini 3.8 Flash' : 'FinteKia Core Engine'}</span>
            <span>DIAN Colombia Compliant v2026.2</span>
          </div>
        </div>

      </div>

      {/* GEMINI API KEY MODAL */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0d1424] border-slate-800 text-white'
          }`}>
            <div className="p-5 border-b flex items-center justify-between bg-blue-500/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center">
                  <i className="ri-key-2-line text-lg"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Clave de API Google Gemini</h3>
                  <p className="text-[10px] text-slate-500">Conexión con Inteligencia Artificial</p>
                </div>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px]">
                Puedes ingresar tu clave de <strong>Google AI Studio</strong> para que los informes de auditoría sean procesados con <strong>Gemini 3.8 Flash</strong>.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-black uppercase text-slate-700 dark:text-slate-300">
                  GEMINI_API_KEY (Ej: AIzaSy...):
                </label>
                <input
                  type="password"
                  value={tempKeyInput}
                  onChange={(e) => setTempKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className={`w-full border rounded-xl p-2.5 font-mono text-xs outline-none focus:border-blue-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className={`p-3 rounded-xl border text-[10.5px] space-y-1.5 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <strong className="block font-bold text-slate-900 dark:text-white">¿Cómo obtenerla gratis?</strong>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Entra a <strong>aistudio.google.com/app/apikey</strong></li>
                  <li>Inicia sesión con tu cuenta de Google</li>
                  <li>Haz clic en <strong>'Create API Key'</strong> y pégala aquí</li>
                </ol>
                <p className="pt-1 text-[10px] text-slate-500 italic">
                  * En Render también puedes añadirla como Variable de Entorno con el nombre <strong>GEMINI_API_KEY</strong>.
                </p>
              </div>
            </div>

            <div className="p-4 border-t flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveKey}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-sm"
              >
                Guardar Clave
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

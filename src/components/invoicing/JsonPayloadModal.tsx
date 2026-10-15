import React from 'react';
import { toast } from '../../context/ToastContext';
import { Voucher } from '../../types';

interface JsonPayloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoice: Voucher | null;
  activeBillingConfig: {
    providerName: string;
    apiEndpoint?: string;
    prefix?: string;
  };
  defaultPayload: any;
}

export default function JsonPayloadModal({
  isOpen,
  onClose,
  selectedInvoice,
  activeBillingConfig,
  defaultPayload
}: JsonPayloadModalProps) {
  if (!isOpen) return null;

  const currentPayload = selectedInvoice?.billingProviderData?.rawPayloadSent || defaultPayload;
  const jsonString = JSON.stringify(currentPayload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    toast.success('Estructura JSON copiada al portapapeles con éxito.', 'Copiado');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-3xl w-full space-y-4 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              <i className="ri-code-s-slash-line text-lg"></i>
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Estructura JSON transmitida al Proveedor ({activeBillingConfig.providerName})
              </h3>
              <p className="text-[11px] text-slate-400">
                Payload estándar generado por FinteKia ERP para validación de CUFE y emisión DIAN
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-[11px] text-indigo-200">
          <pre className="whitespace-pre-wrap leading-relaxed">
            {jsonString}
          </pre>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
          <span className="text-[11px] text-slate-500 font-mono truncate max-w-md">
            Endpoint: POST {activeBillingConfig.apiEndpoint || (activeBillingConfig.providerName === 'Alanube' ? 'https://api.alanube.co/dian/v1/invoices' : 'https://api.factus.com.co/v1/bills')}
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <i className="ri-file-copy-line text-indigo-400"></i> Copiar JSON
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

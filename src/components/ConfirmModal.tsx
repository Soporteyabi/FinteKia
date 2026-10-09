import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDangerous = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs no-print animate-fade-in">
      <div 
        id="confirm-modal-container"
        className="relative w-full max-w-md overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-6 animate-scale-up"
      >
        {/* Border accent */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${isDangerous ? 'bg-rose-500' : 'bg-blue-500'}`} />

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${isDangerous ? 'bg-rose-500/10 text-rose-450' : 'bg-blue-500/10 text-blue-400'}`}>
            <i className={`text-xl ${isDangerous ? 'ri-alert-fill' : 'ri-question-line'}`}></i>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-display font-extrabold text-[15px] text-zinc-100 tracking-tight">{title}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex md:flex-row flex-col justify-end gap-2.5 pt-2">
          <button
            type="button"
            id="confirm-modal-cancel"
            onClick={onCancel}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            id="confirm-modal-confirm"
            onClick={onConfirm}
            className={`w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all text-white cursor-pointer ${
              isDangerous 
                ? 'bg-rose-600 hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-650/15' 
                : 'bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-650/15'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  X 
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global event bus for non-hook callers (e.g., utility functions)
type GlobalToastListener = (toast: Omit<ToastItem, 'id'>) => void;
const globalListeners: Set<GlobalToastListener> = new Set();

export const showGlobalToast = (
  type: ToastType, 
  message: string, 
  title?: string, 
  duration: number = 4000
) => {
  globalListeners.forEach((listener) => listener({ type, message, title, duration }));
};

export const toast = {
  success: (message: string, title?: string) => showGlobalToast('success', message, title),
  error: (message: string, title?: string) => showGlobalToast('error', message, title),
  warning: (message: string, title?: string) => showGlobalToast('warning', message, title),
  info: (message: string, title?: string) => showGlobalToast('info', message, title),
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((
    type: ToastType, 
    message: string, 
    title?: string, 
    duration: number = 4200
  ) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItem = { id, type, message, title, duration };

    setToasts((prev) => [...prev.slice(-4), newToast]); // Keep maximum 5 at a time

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  useEffect(() => {
    const handleGlobalToast: GlobalToastListener = (t) => {
      addToast(t.type, t.message, t.title, t.duration);
    };
    globalListeners.add(handleGlobalToast);
    return () => {
      globalListeners.delete(handleGlobalToast);
    };
  }, [addToast]);

  const success = useCallback((msg: string, title?: string) => addToast('success', msg, title), [addToast]);
  const error = useCallback((msg: string, title?: string) => addToast('error', msg, title), [addToast]);
  const warning = useCallback((msg: string, title?: string) => addToast('warning', msg, title), [addToast]);
  const info = useCallback((msg: string, title?: string) => addToast('info', msg, title), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      {/* Floating Toast Notification Container */}
      <div 
        aria-live="polite" 
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none"
      >
        {toasts.map((item) => {
          const config = {
            success: {
              border: 'border-emerald-500/40 bg-slate-900/95 text-emerald-300',
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
              badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
              defaultTitle: 'Éxito'
            },
            error: {
              border: 'border-rose-500/40 bg-slate-900/95 text-rose-300',
              icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
              badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
              defaultTitle: 'Error'
            },
            warning: {
              border: 'border-amber-500/40 bg-slate-900/95 text-amber-300',
              icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
              badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
              defaultTitle: 'Atención'
            },
            info: {
              border: 'border-sky-500/40 bg-slate-900/95 text-sky-300',
              icon: <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />,
              badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
              defaultTitle: 'Información'
            }
          }[item.type];

          return (
            <div
              key={item.id}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${config.border}`}
              style={{
                boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 0, 0, 0.4)'
              }}
            >
              {config.icon}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${config.badge}`}>
                    {item.title || config.defaultTitle}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium leading-relaxed break-words whitespace-pre-line">
                  {item.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

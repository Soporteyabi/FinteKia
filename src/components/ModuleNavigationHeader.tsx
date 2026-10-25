import React from 'react';
import { VIEW_METADATA_MAP, CONNECTED_MODULES_MAP } from '../utils/navigationConfig';

interface ModuleNavigationHeaderProps {
  activeView: string;
  previousView: string | null;
  onGoBack: () => void;
  onNavigateToView: (view: string) => void;
  activeCompanyName?: string;
  theme?: string;
}

export default function ModuleNavigationHeader({
  activeView,
  previousView,
  onGoBack,
  onNavigateToView,
  activeCompanyName,
  theme = 'slate_gray'
}: ModuleNavigationHeaderProps) {
  const currentMeta = VIEW_METADATA_MAP[activeView] || {
    title: activeView.replace('_', ' ').toUpperCase(),
    shortTitle: activeView.replace('_', ' '),
    icon: 'ri-apps-line',
    category: 'General'
  };

  const prevMeta = previousView ? VIEW_METADATA_MAP[previousView] : null;
  const connectedModules = CONNECTED_MODULES_MAP[activeView] || [];
  const isLight = theme === 'light_gray';

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 mb-2 border-b text-xs transition-colors ${
      isLight ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-200'
    }`}>
      {/* Left: Exactly ONE clean Back button + slim breadcrumb path */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={onGoBack}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
            isLight
              ? 'bg-white hover:bg-slate-100 text-slate-800 hover:text-blue-600 border-slate-300 shadow-2xs'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-700/80'
          }`}
          title={prevMeta ? `Volver a ${prevMeta.title}` : 'Volver al Menú Principal'}
          id="nav-btn-single-back"
        >
          <i className="ri-arrow-left-line text-xs font-bold text-blue-500"></i>
          <span>
            {prevMeta ? `Volver a ${prevMeta.shortTitle}` : 'Volver al Menú Principal'}
          </span>
        </button>

        {/* Discreet Home Icon (only if we have previous history, to jump directly to home if desired) */}
        {previousView && (
          <button
            type="button"
            onClick={() => onNavigateToView('dashboard')}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Ir directo al Portal de Inicio"
          >
            <i className="ri-layout-grid-line text-xs"></i>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          <span>FinteKia</span>
          <span>/</span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {currentMeta.shortTitle}
          </span>
        </div>
      </div>

      {/* Right: Compact, subtle connected module shortcuts */}
      {connectedModules.length > 0 && (
        <div className="flex items-center gap-1 text-[11px] overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[10px] font-mono text-slate-400 mr-1 hidden md:inline">
            Conexión:
          </span>
          {connectedModules.slice(0, 4).map((conn) => (
            <button
              key={conn.view}
              type="button"
              onClick={() => onNavigateToView(conn.view)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
                isLight
                  ? 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200 hover:border-blue-300'
                  : 'bg-slate-900/50 hover:bg-blue-500/10 text-slate-300 hover:text-blue-400 border-slate-800 hover:border-blue-500/30'
              }`}
              title={`Saltar directamente a ${conn.label}`}
            >
              <i className={`${conn.icon} text-[11px] text-blue-500`}></i>
              <span>{conn.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

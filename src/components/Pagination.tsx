import React, { useState, useMemo, useCallback } from 'react';

/**
 * Generic and versatile Pagination Props
 * Supports both English ('currentPage', 'totalItems', 'pageSize')
 * and direct Spanish aliases ('paginaActual', 'itemsTotales', 'itemsPorPagina')
 * as requested to make reuse effortless across all modules.
 */
export interface PaginationProps {
  /** Página actual / Current active page (1-based) */
  currentPage?: number;
  paginaActual?: number;

  /** Total de registros / Total items count */
  totalItems?: number;
  itemsTotales?: number;

  /** Cantidad de registros por página (default 15) */
  pageSize?: number;
  itemsPorPagina?: number;

  /** Función para cambiar de página / Page change handler */
  onPageChange?: (page: number) => void;
  cambiarPagina?: (page: number) => void;

  /** Opciones disponibles para cambiar items por página (ej: [10, 15, 25, 50, 100]) */
  pageSizeOptions?: number[];

  /** Función para cambiar el tamaño de página / Page size change handler */
  onPageSizeChange?: (newPageSize: number) => void;
  cambiarItemsPorPagina?: (nuevoTamano: number) => void;

  /** Habilitar selector de tamaño de página */
  showPageSizeSelector?: boolean;

  /** Mostrar botones de ir a Primera / Última página */
  showFirstLast?: boolean;

  /** Modo visual oscuro / Dark mode flag */
  isDark?: boolean;

  /** Mostrar texto descriptivo informativo */
  showInfo?: boolean;

  /** Etiqueta descriptiva para los ítems (ej: "comprobantes", "productos", "terceros") */
  itemLabel?: string;

  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Custom Hook genérico para manejar paginación de arrays en cualquier componente
 */
export function usePagination<T>(items: T[], initialPageSize = 15) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const resetPage = useCallback(() => setCurrentPage(1), []);

  return {
    currentPage: safePage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems,
    resetPage,
    totalItems: items.length
  };
}

/**
 * Componente genérico y robusto de Paginación
 */
export default function Pagination({
  currentPage,
  paginaActual,
  totalItems,
  itemsTotales,
  pageSize,
  itemsPorPagina,
  onPageChange,
  cambiarPagina,
  pageSizeOptions = [10, 15, 25, 50, 100],
  onPageSizeChange,
  cambiarItemsPorPagina,
  showPageSizeSelector = false,
  showFirstLast = true,
  isDark = true,
  showInfo = true,
  itemLabel = 'registros',
  className = ''
}: PaginationProps) {
  // Resolve dual-language props (fallback chain)
  const activePage = Math.max(1, currentPage ?? paginaActual ?? 1);
  const totalCount = Math.max(0, totalItems ?? itemsTotales ?? 0);
  const currentSize = Math.max(1, pageSize ?? itemsPorPagina ?? 15);
  
  const handlePageChange = onPageChange || cambiarPagina || (() => {});
  const handleSizeChange = onPageSizeChange || cambiarItemsPorPagina;

  const totalPages = Math.max(1, Math.ceil(totalCount / currentSize));
  const safeCurrentPage = Math.min(activePage, totalPages);

  // Jump input state for direct page navigation on large data
  const [jumpPage, setJumpPage] = useState('');

  // If there are no items or only 1 page with total items <= page size
  if (totalCount <= currentSize && totalPages <= 1) {
    if (!showInfo || totalCount === 0) return null;
    return (
      <div className={`flex flex-wrap items-center justify-between text-xs py-2.5 px-3 border-t transition-colors ${
        isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
      } ${className}`}>
        <span className="text-[11px]">
          Total: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{totalCount}</strong> {itemLabel}
          <span className="ml-1 opacity-60 font-mono text-[10px]">(Página 1 de 1 · Límite por pág: {currentSize})</span>
        </span>

        {/* Optional Page Size Selector even for single page */}
        {showPageSizeSelector && handleSizeChange && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="opacity-70">Por página:</span>
            <select
              value={currentSize}
              onChange={(e) => handleSizeChange(Number(e.target.value))}
              className={`rounded px-1.5 py-0.5 text-xs font-mono outline-none border cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-200' 
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  const startItem = (safeCurrentPage - 1) * currentSize + 1;
  const endItem = Math.min(safeCurrentPage * currentSize, totalCount);

  // Generate numbered pages with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('...');
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPage, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      handlePageChange(p);
      setJumpPage('');
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-3 text-xs border-t select-none transition-colors ${
      isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'
    } ${className}`}>
      
      {/* Informative Stats & Optional Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3">
        {showInfo && (
          <div className="text-[11px] font-medium text-slate-400">
            Mostrando <strong className={isDark ? 'text-white' : 'text-slate-900'}>{startItem}</strong> - <strong className={isDark ? 'text-white' : 'text-slate-900'}>{endItem}</strong> de <strong className={isDark ? 'text-white' : 'text-slate-900'}>{totalCount}</strong> {itemLabel}
            <span className="ml-1.5 opacity-60 font-mono text-[10px]">({currentSize} por pág · Pág {safeCurrentPage} de {totalPages})</span>
          </div>
        )}

        {showPageSizeSelector && handleSizeChange && (
          <div className="flex items-center gap-1.5 text-[11px] border-l pl-3 border-white/10">
            <span className="opacity-70 text-[10px]">Mostrar:</span>
            <select
              value={currentSize}
              onChange={(e) => handleSizeChange(Number(e.target.value))}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-mono outline-none border cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-200' 
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex flex-wrap items-center gap-1.5">
        
        {/* First Page Button */}
        {showFirstLast && totalPages > 2 && (
          <button
            type="button"
            onClick={() => handlePageChange(1)}
            disabled={safeCurrentPage === 1}
            className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
              safeCurrentPage === 1
                ? 'opacity-30 cursor-not-allowed bg-transparent text-slate-500'
                : isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
            }`}
            title="Primera Página"
          >
            <i className="ri-skip-back-line text-xs"></i>
          </button>
        )}

        {/* Previous Button */}
        <button
          type="button"
          onClick={() => handlePageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage === 1}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
            safeCurrentPage === 1
              ? 'opacity-30 cursor-not-allowed bg-transparent text-slate-500'
              : isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
          }`}
          title="Página Anterior"
        >
          <i className="ri-arrow-left-s-line text-sm"></i>
          <span>Anterior</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 mx-0.5">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1 text-slate-500 text-xs select-none font-bold">
                  ...
                </span>
              );
            }
            const isCurrent = p === safeCurrentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => handlePageChange(Number(p))}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                    : isDark
                      ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => handlePageChange(Math.min(totalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage >= totalPages}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
            safeCurrentPage >= totalPages
              ? 'opacity-30 cursor-not-allowed bg-transparent text-slate-500'
              : isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
          }`}
          title="Página Siguiente"
        >
          <span>Siguiente</span>
          <i className="ri-arrow-right-s-line text-sm"></i>
        </button>

        {/* Last Page Button */}
        {showFirstLast && totalPages > 2 && (
          <button
            type="button"
            onClick={() => handlePageChange(totalPages)}
            disabled={safeCurrentPage >= totalPages}
            className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
              safeCurrentPage >= totalPages
                ? 'opacity-30 cursor-not-allowed bg-transparent text-slate-500'
                : isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
            }`}
            title="Última Página"
          >
            <i className="ri-skip-forward-line text-xs"></i>
          </button>
        )}

        {/* Quick jump to page input for very large datasets */}
        {totalPages > 7 && (
          <form onSubmit={handleJumpSubmit} className="hidden md:flex items-center gap-1 ml-2 pl-2 border-l border-white/10">
            <span className="text-[10px] opacity-70">Ir:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPage}
              placeholder={`${safeCurrentPage}`}
              onChange={(e) => setJumpPage(e.target.value)}
              className={`w-11 px-1.5 py-0.5 rounded text-center text-xs font-mono outline-none border ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                  : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
              }`}
            />
            <button
              type="submit"
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              OK
            </button>
          </form>
        )}

      </div>

    </div>
  );
}

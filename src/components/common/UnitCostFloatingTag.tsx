import React from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, Scale, Package } from 'lucide-react';
import { formatCOP } from '../../utils/currencyUtils';

interface UnitCostFloatingTagProps {
  unitOfMeasure?: string;
  unitCost: number;
  quantity?: number;
  show: boolean;
  className?: string;
  position?: 'top' | 'bottom';
}

/**
 * Etiqueta Flotante Inteligente para Costos Unitarios de Insumos y Materias Primas.
 * 
 * Evita la confusión crítica entre Kilo ($/kg) y Gramo ($/g):
 * - Para gramos ('g'): aclara que el costo se debe ingresar por KILO, y que el software
 *   aplica la fórmula: Subtotal = (Cantidad en g / 1000) * CostoUnitarioPorKilo.
 * - Detecta advertencias si el usuario ingresó un costo diminuto creyendo que debía ser por gramo.
 * - Para unidades ('u', 'UND'): indica costo por pieza/unidad.
 */
export const UnitCostFloatingTag: React.FC<UnitCostFloatingTagProps> = ({
  unitOfMeasure = 'g',
  unitCost = 0,
  quantity,
  show,
  className = '',
  position = 'top'
}) => {
  if (!show) return null;

  const uom = (unitOfMeasure || '').trim().toLowerCase();
  const isGrams = uom === 'g' || uom === 'gr' || uom === 'gramos' || uom === 'gramo';
  const isUnit = uom === 'und' || uom === 'u' || uom === 'unidades' || uom === 'unidad' || uom === 'pieza';
  const isLiters = uom === 'l' || uom === 'lt' || uom === 'litros' || uom === 'litro';

  // Warnings / Hints for user input
  const isLowCostInGrams = isGrams && unitCost > 0 && unitCost < 50;
  const effectiveCostPerGram = isGrams ? unitCost / 1000 : unitCost;
  const calculatedSubtotal = quantity !== undefined 
    ? (isGrams ? (quantity / 1000) * unitCost : quantity * unitCost)
    : null;

  const positionClasses = position === 'top'
    ? 'bottom-full mb-2 -translate-x-1/2 left-1/2'
    : 'top-full mt-2 -translate-x-1/2 left-1/2';

  const arrowClasses = position === 'top'
    ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent border-t-[6px] border-x-[6px]'
    : 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent border-b-[6px] border-x-[6px]';

  return (
    <div
      role="tooltip"
      className={`absolute ${positionClasses} z-50 w-72 pointer-events-none select-none animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-3 border border-slate-700/80 backdrop-blur-md text-left">
        {/* Header */}
        <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-800">
          {isGrams ? (
            <Scale className="w-4 h-4 text-amber-400 shrink-0" />
          ) : isUnit ? (
            <Package className="w-4 h-4 text-blue-400 shrink-0" />
          ) : (
            <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}

          <span className="font-bold text-xs tracking-wide">
            {isGrams ? (
              <span className="text-amber-300">⚠️ Costo Requerido: Por KILO ($/kg)</span>
            ) : isUnit ? (
              <span className="text-blue-300">📦 Costo Requerido: Por UNIDAD ($/u)</span>
            ) : isLiters ? (
              <span className="text-emerald-300">🧴 Costo Requerido: Por LITRO ($/L)</span>
            ) : (
              <span className="text-slate-200">Costo Unitario ({unitOfMeasure})</span>
            )}
          </span>
        </div>

        {/* Body Description */}
        <div className="pt-1.5 text-[11px] leading-tight text-slate-300 space-y-1">
          {isGrams ? (
            <>
              <p>
                Este insumo se pesa en <strong className="text-white">Gramos (g)</strong>, pero su costo de adquisición se debe ingresar <strong className="text-amber-300 underline underline-offset-2">POR KILOGRAMO ($/kg)</strong>.
              </p>
              <div className="bg-slate-800/80 rounded-lg p-2 font-mono text-[10px] space-y-1 text-slate-200 border border-slate-700/50">
                <div className="flex justify-between">
                  <span className="text-slate-400">Fórmula aplicada:</span>
                  <span className="text-amber-400 font-bold">(g ÷ 1.000) × $/kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Equiv. por gramo:</span>
                  <span className="text-white font-bold">{formatCOP(effectiveCostPerGram)} / g</span>
                </div>
                {quantity !== undefined && (
                  <div className="flex justify-between pt-1 border-t border-slate-700/60">
                    <span className="text-slate-400">Subtotal para {quantity}g:</span>
                    <span className="text-emerald-400 font-bold">{formatCOP(calculatedSubtotal || 0)}</span>
                  </div>
                )}
              </div>

              {/* Validation Warning if number looks like it was entered per gram */}
              {isLowCostInGrams && (
                <div className="flex items-start gap-1.5 bg-amber-500/20 text-amber-300 p-1.5 rounded-md text-[10px] border border-amber-500/30">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong>¿Ingresaste costo por gramo?</strong> Si el kilo cuesta p.ej. $6.633, escribe <strong>6633.33</strong>. El sistema se encarga de dividirlo entre 1.000.
                  </span>
                </div>
              )}

              {!isLowCostInGrams && unitCost > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Costo por Kilo registrado correctamente.</span>
                </div>
              )}
            </>
          ) : isUnit ? (
            <>
              <p>
                Material de empaque o pieza. Ingresa el precio individual por cada <strong className="text-blue-300">unidad física</strong> (ej. envase, tapa, etiqueta).
              </p>
              {quantity !== undefined && (
                <div className="bg-slate-800/80 rounded-lg p-2 font-mono text-[10px] flex justify-between text-slate-200">
                  <span className="text-slate-400">Subtotal ({quantity} u):</span>
                  <span className="text-blue-300 font-bold">{formatCOP(calculatedSubtotal || 0)}</span>
                </div>
              )}
            </>
          ) : (
            <p>
              Ingresa el costo de adquisición unitario correspondiente a 1 {unitOfMeasure}.
            </p>
          )}
        </div>
      </div>

      {/* Triangle arrow */}
      <div className={`absolute w-0 h-0 ${arrowClasses}`} />
    </div>
  );
};

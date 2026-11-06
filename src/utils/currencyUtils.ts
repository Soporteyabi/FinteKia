/**
 * Utilidades de precisión numérica y formateo de moneda / cantidades para Colombia
 * Permite manejar precios unitarios con decimales (ej. materia prima $0.916, químicos $12.50)
 * y formatear según necesidad sin truncar decimales significativos.
 */

/**
 * Formatea un valor monetario en COP (Pesos Colombianos).
 * Si el número tiene decimales significativos (como materias primas de $0.916),
 * los preserva mostrando hasta 4 decimales. Si es un entero exacto (como $50.000),
 * se muestra sin decimales para mantener una presentación limpia.
 * 
 * @param val Valor numérico o texto numérico
 * @param forcedDecimals Número fijo de decimales (opcional)
 */
export function formatCOP(val: number | string | undefined | null, forcedDecimals?: number): string {
  if (val === undefined || val === null || val === '') return '$ 0';
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  if (isNaN(num)) return '$ 0';

  let minDecimals = 0;
  let maxDecimals = 0;

  if (forcedDecimals !== undefined) {
    minDecimals = forcedDecimals;
    maxDecimals = forcedDecimals;
  } else {
    // Detectar si el número tiene parte decimal no nula
    const absRemainder = Math.abs(num % 1);
    if (absRemainder > 0.00001) {
      // Tiene decimales: máximo 2 decimales para mantener formato limpio y exacto
      minDecimals = 2;
      maxDecimals = 2;
    } else {
      minDecimals = 0;
      maxDecimals = 0;
    }
  }

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals
  }).format(num);
}

/**
 * Normaliza y analiza un valor numérico ingresado por el usuario permitiendo tanto punto como coma.
 * Permite mantener la entrada fluida durante la digitación.
 * 
 * @param raw Entrada de texto o número
 * @returns Número válido o NaN si no es convertible
 */
export function parseDecimal(raw: string | number | undefined | null): number {
  if (raw === undefined || raw === null || raw === '') return 0;
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  const clean = raw.trim().replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formatea cantidades con unidades de medida (ej. 1.5 KG, 0.25 L, 10 UND)
 */
export function formatQuantity(qty: number | string, uom?: string): string {
  const num = typeof qty === 'string' ? parseFloat(qty.replace(',', '.')) : qty;
  if (isNaN(num)) return `0 ${uom || ''}`.trim();
  
  const hasDecimals = Math.abs(num % 1) > 0.0001;
  const formattedNum = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: 3
  }).format(num);

  return uom ? `${formattedNum} ${uom}` : formattedNum;
}

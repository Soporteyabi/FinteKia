/**
 * Módulo de Fijación de Precios y Utilidades (Pricing & Profitability Engine)
 * ERP FinteKia - Arquitectura Financiera y de Costos de Manufactura
 * 
 * Basado en el modelo validado de hoja de cálculo:
 * - Costo Unitario de Producción (Precio de costo x Und)
 * - Unidades Totales del Lote
 * - Precio de Venta Comercial Real definido por el usuario
 * - Margen de Utilidad Esperado (%)
 */

export interface PricingInput {
  costo_unitario_produccion: number;    // Ej: 4397.00
  unidades_lote: number;                 // Ej: 15
  precio_venta_comercial: number;        // Ej: 6450.00
  margen_esperado_porcentaje: number;    // Ej: 46 (si se pasa 46) o 0.46 (como decimal)
}

export interface PricingOutput {
  // Valores Monetarios
  costo_unitario_produccion: number;
  unidades_lote: number;
  precio_venta_comercial: number;
  margen_esperado_porcentaje: number;     // Almacenado como decimal (0.46 para 46%)
  
  precio_venta_sugerido: number;         // costo_unitario_produccion * (1 + margen_esperado)
  utilidad_neta_unitaria: number;        // precio_venta_comercial - costo_unitario_produccion
  costo_total_lote: number;              // costo_unitario_produccion * unidades_lote
  utilidad_bruta_lote: number;           // precio_venta_comercial * unidades_lote (REGLA: precio comercial real)
  utilidad_neta_lote: number;            // utilidad_bruta_lote - costo_total_lote
  
  // Indicadores Porcentuales Flotantes (0 - 100)
  indicadores: {
    margen_costo_porcentaje: number;           // (costo_unitario / precio_comercial) * 100
    porcentaje_precio_comercial_base: number;  // (precio_comercial / precio_comercial) * 100 = 100%
    margen_sugerido_porcentaje: number;        // (precio_sugerido / precio_comercial) * 100
    margen_utilidad_real_porcentaje: number;   // (utilidad_neta_unitaria / precio_comercial) * 100
  };

  // Representaciones Formateadas para Frontend
  formato: {
    precio_venta_sugerido: string;
    utilidad_neta_unitaria: string;
    costo_total_lote: string;
    utilidad_bruta_lote: string;
    utilidad_neta_lote: string;
    margen_costo_porcentaje: string;          // Ej: "68,17%"
    porcentaje_precio_comercial_base: string; // Ej: "100,00%"
    margen_sugerido_porcentaje: string;       // Ej: "99,53%"
    margen_utilidad_real_porcentaje: string;  // Ej: "31,83%"
  };
}

/**
 * Normaliza cualquier entrada de porcentaje a fracción decimal (ej: 46 -> 0.46, 0.46 -> 0.46).
 */
export function normalizeMarginPercent(value: number): number {
  if (value > 1) {
    return value / 100;
  }
  return value;
}

/**
 * Formatea un número flotante como porcentaje con máximo 2 decimales y símbolo "%".
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  const safeVal = Number.isFinite(value) ? value : 0;
  return `${safeVal.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}%`;
}

/**
 * Motor central de cálculo de fijación de precios y utilidades de lote.
 */
export function calculatePricingAndProfitability(input: PricingInput): PricingOutput {
  const costoUnit = Math.max(0, Number(input.costo_unitario_produccion) || 0);
  const unidades = Math.max(0, Number(input.unidades_lote) || 0);
  const precioComercial = Math.max(0, Number(input.precio_venta_comercial) || 0);
  const margenEsperadoDecimal = normalizeMarginPercent(Number(input.margen_esperado_porcentaje) || 0);

  // 1. precio_venta_sugerido = costo_unitario_produccion * (1 + margen_esperado_porcentaje)
  const precioVentaSugerido = Number((costoUnit * (1 + margenEsperadoDecimal)).toFixed(2));

  // 2. utilidad_neta_unitaria = precio_venta_comercial - costo_unitario_produccion
  const utilidadNetaUnitaria = Number((precioComercial - costoUnit).toFixed(2));

  // 3. costo_total_lote = costo_unitario_produccion * unidades_lote
  const costoTotalLote = Number((costoUnit * unidades).toFixed(2));

  // 4. utilidad_bruta_lote = precio_venta_comercial * unidades_lote (Regla: Real comercial, nunca por el sugerido)
  const utilidadBrutaLote = Number((precioComercial * unidades).toFixed(2));

  // 5. utilidad_neta_lote = utilidad_bruta_lote - costo_total_lote
  const utilidadNetaLote = Number((utilidadBrutaLote - costoTotalLote).toFixed(2));

  // Indicadores Porcentuales Flotantes (0 - 100)
  // Protección contra división por cero si el precio comercial es 0
  const tienePrecioComercial = precioComercial > 0;

  const margenCostoPorcentaje = tienePrecioComercial
    ? Number(((costoUnit / precioComercial) * 100).toFixed(2))
    : 0;

  const porcentajePrecioComercialBase = tienePrecioComercial
    ? Number(((precioComercial / precioComercial) * 100).toFixed(2))
    : 100;

  const margenSugeridoPorcentaje = tienePrecioComercial
    ? Number(((precioVentaSugerido / precioComercial) * 100).toFixed(2))
    : 0;

  const margenUtilidadRealPorcentaje = tienePrecioComercial
    ? Number(((utilidadNetaUnitaria / precioComercial) * 100).toFixed(2))
    : 0;

  const formatCurrency = (val: number) => {
    return val.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return {
    costo_unitario_produccion: costoUnit,
    unidades_lote: unidades,
    precio_venta_comercial: precioComercial,
    margen_esperado_porcentaje: margenEsperadoDecimal,

    precio_venta_sugerido: precioVentaSugerido,
    utilidad_neta_unitaria: utilidadNetaUnitaria,
    costo_total_lote: costoTotalLote,
    utilidad_bruta_lote: utilidadBrutaLote,
    utilidad_neta_lote: utilidadNetaLote,

    indicadores: {
      margen_costo_porcentaje: margenCostoPorcentaje,
      porcentaje_precio_comercial_base: porcentajePrecioComercialBase,
      margen_sugerido_porcentaje: margenSugeridoPorcentaje,
      margen_utilidad_real_porcentaje: margenUtilidadRealPorcentaje
    },

    formato: {
      precio_venta_sugerido: formatCurrency(precioVentaSugerido),
      utilidad_neta_unitaria: formatCurrency(utilidadNetaUnitaria),
      costo_total_lote: formatCurrency(costoTotalLote),
      utilidad_bruta_lote: formatCurrency(utilidadBrutaLote),
      utilidad_neta_lote: formatCurrency(utilidadNetaLote),
      margen_costo_porcentaje: formatPercentage(margenCostoPorcentaje),
      porcentaje_precio_comercial_base: formatPercentage(porcentajePrecioComercialBase),
      margen_sugerido_porcentaje: formatPercentage(margenSugeridoPorcentaje),
      margen_utilidad_real_porcentaje: formatPercentage(margenUtilidadRealPorcentaje)
    }
  };
}

/**
 * Módulo de Formulación Química y Saponificación
 * ERP FinteKia - Arquitectura de Manufactura de Jabones Líquidos
 * 
 * Reglas de negocio:
 * 1. koh_puro_teorico = cantidad_aceite_g * indice_sap
 * 2. koh_comercial_final = (koh_puro_teorico * (1.0 - superfat_porcentaje)) / pureza_koh
 */

export type ProductTargetCategory = 'hogar' | 'cuidado_personal' | 'personalizado';

export interface FormulationInput {
  cantidad_aceite_g: number;       // Gramos de aceite a procesar (ej. 1000.0)
  indice_sap: number;              // Índice SAP KOH (ej. 0.228 para mezcla / 0.189 para girasol / 0.257 coco)
  pureza_koh?: number;             // Pureza de la potasa comercial (default: 0.90 = 90%)
  superfat_porcentaje?: number;    // Exceso de grasa como decimal (ej. 0.00 para Hogar, 0.03 para Cuidado Personal)
  categoria_producto?: ProductTargetCategory;
}

export interface FormulationOutput {
  cantidad_aceite_g: number;
  indice_sap: number;
  pureza_koh: number;
  superfat_porcentaje: number;
  superfat_visual_porcentaje: number; // Ej: 0.0 ó 3.0
  koh_puro_teorico: number;           // Saponificación completa al 100% puro
  koh_puro_con_descuento: number;     // KOH puro tras aplicar sobreengrasado
  koh_comercial_final: number;        // Gramos comerciales a pesar (redondeado a 1 decimal)
  categoria: ProductTargetCategory;
  descripcion_seguridad: string;
}

// Preset de superfat según categoría de producto
export const SUPERFAT_PRESETS: Record<ProductTargetCategory, number> = {
  hogar: 0.00,             // 0.0% - Sin grasa libre para evitar rancidez o manchas en ropa/vajilla
  cuidado_personal: 0.03,  // 3.0% - Grasa libre para humectación y cuidado dérmico
  personalizado: 0.00
};

/**
 * Calcula el KOH Comercial a pesar según la formulación química y el Superfat.
 * Devuelve el valor redondeado a 1 solo decimal (float).
 */
export function calculateKohComercial(input: FormulationInput): FormulationOutput {
  const cantidadAceite = Math.max(0, Number(input.cantidad_aceite_g) || 0);
  const indiceSap = Math.max(0, Number(input.indice_sap) || 0);
  const purezaKoh = input.pureza_koh !== undefined && input.pureza_koh > 0 
    ? Number(input.pureza_koh) 
    : 0.90; // 90% fijo por defecto (Potasa comercial de Cali)

  // Si se pasa categoría, asigna automáticamente el superfat correspondiente si no viene explícito
  let superfat = 0.00;
  let categoria: ProductTargetCategory = input.categoria_producto || 'personalizado';

  if (input.superfat_porcentaje !== undefined) {
    // Si el usuario ingresó por ejemplo 3 en lugar de 0.03, normalizar
    superfat = input.superfat_porcentaje > 1 
      ? input.superfat_porcentaje / 100 
      : input.superfat_porcentaje;
  } else if (input.categoria_producto && SUPERFAT_PRESETS[input.categoria_producto] !== undefined) {
    superfat = SUPERFAT_PRESETS[input.categoria_producto];
  }

  // 1. KOH Puro Teórico para saponificación completa (al 0% de exceso)
  const kohPuroTeorico = cantidadAceite * indiceSap;

  // 2. Aplicar descuento de superfat y ajuste por pureza comercial en una sola ecuación
  // koh_comercial_final = (koh_puro_teorico * (1.0 - superfat_porcentaje)) / pureza_koh
  const kohPuroConDescuento = kohPuroTeorico * (1.0 - superfat);
  const kohComercialCalculado = kohPuroConDescuento / purezaKoh;

  // Redondeo estricto a 1 solo decimal como float
  const kohComercialFinal = Math.round(kohComercialCalculado * 10) / 10;

  const descripcion = superfat === 0
    ? 'Hogar (0.0% Superfat): Saponificación completa sin aceite libre (máximo desengrase).'
    : `Cuidado Personal (${(superfat * 100).toFixed(1)}% Superfat): Exceso de aceite para suavidad dérmica.`;

  return {
    cantidad_aceite_g: cantidadAceite,
    indice_sap: indiceSap,
    pureza_koh: purezaKoh,
    superfat_porcentaje: superfat,
    superfat_visual_porcentaje: Number((superfat * 100).toFixed(1)),
    koh_puro_teorico: Math.round(kohPuroTeorico * 10) / 10,
    koh_puro_con_descuento: Math.round(kohPuroConDescuento * 10) / 10,
    koh_comercial_final: kohComercialFinal,
    categoria,
    descripcion_seguridad: descripcion
  };
}

/**
 * Función limpia solicitada para backend directo
 */
export function calcularKohComercialBackend(
  cantidad_aceite_g: number,
  indice_sap: number,
  pureza_koh: number = 0.90,
  superfat_porcentaje: number = 0.00
): number {
  // Normalizar porcentaje si entra como entero (ej. 3 -> 0.03)
  const superfat = superfat_porcentaje > 1 ? superfat_porcentaje / 100 : superfat_porcentaje;
  
  // 1. KOH Puro Teórico
  const koh_puro_teorico = cantidad_aceite_g * indice_sap;
  
  // 2. KOH Comercial Final
  const koh_comercial_final = (koh_puro_teorico * (1.0 - superfat)) / pureza_koh;
  
  // Retornar redondeado a 1 solo decimal (float)
  return Math.round(koh_comercial_final * 10) / 10;
}

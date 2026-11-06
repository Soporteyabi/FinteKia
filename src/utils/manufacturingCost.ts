/**
 * Motor de Cálculo de Costos de Manufactura y Fórmulas Químicas
 * 
 * Regla:
 * Si la Cantidad Requerida está almacenada en gramos ('g'), el Costo Unitario ingresado
 * por el usuario (expresado en $/kg) se divide entre 1000 antes de multiplicarlo por
 * la Cantidad Requerida, o se aplica la fórmula exacta:
 * 
 *   Subtotal = (Cantidad / 1000) * CostoUnitarioPorKilo
 * 
 * Para unidades de empaque ('UND', 'u', piezas) o litros ('L'):
 *   Subtotal = Cantidad * CostoUnitario
 */

export interface MaterialCostItem {
  productId?: string;
  name?: string;
  quantity: number;
  unitCost: number;
  unitOfMeasure?: string;
}

/**
 * Calcula el subtotal exacto de un insumo según su Unidad de Medida.
 * - Si es gramos ('g', 'gr', 'gramos'): divide entre 1000 y multiplica por el costo por kilo.
 * - Si es otra unidad: multiplica cantidad por costo unitario.
 */
export function calculateMaterialSubtotal(
  quantity: number,
  unitCostPorKilo: number,
  unitOfMeasure?: string
): number {
  const uom = (unitOfMeasure || '').trim().toLowerCase();
  
  if (uom === 'g' || uom === 'gr' || uom === 'gramos' || uom === 'gramo') {
    // Fórmula requerida: Subtotal = (Cantidad / 1000) * CostoUnitarioPorKilo
    const subtotal = (quantity / 1000) * unitCostPorKilo;
    return Number(subtotal.toFixed(2));
  }
  
  const subtotal = quantity * unitCostPorKilo;
  return Number(subtotal.toFixed(2));
}

/**
 * Calcula la suma total de materiales de un lote.
 */
export function calculateTotalMaterialsCost(items: MaterialCostItem[]): number {
  const total = items.reduce((sum, item) => {
    return sum + calculateMaterialSubtotal(item.quantity, item.unitCost, item.unitOfMeasure);
  }, 0);
  return Number(total.toFixed(2));
}

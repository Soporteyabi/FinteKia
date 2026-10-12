/**
 * Utilidades DIAN para Facturación Electrónica y Terceros en Colombia
 */

const DIAN_FACTORS = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3];

/**
 * Calcula el Dígito de Verificación (DV) oficial según el algoritmo de la DIAN (Art. 555-2 E.T.)
 * @param nit Número de Identificación Tributaria (solo dígitos o con puntuación)
 * @returns Dígito de verificación entre 0 y 9
 */
export function calculateDIANDV(nit: string): number {
  if (!nit) return 0;
  // Extraer solo los números del NIT inicial (ignorar guión existente o puntos)
  const cleanNit = nit.split('-')[0].replace(/\D/g, '');
  if (!cleanNit) return 0;

  let sum = 0;
  const len = cleanNit.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(cleanNit.charAt(len - 1 - i), 10);
    const factor = DIAN_FACTORS[DIAN_FACTORS.length - 1 - i] || 0;
    sum += digit * factor;
  }

  const remainder = sum % 11;
  if (remainder === 0) return 0;
  if (remainder === 1) return 1;
  return 11 - remainder;
}

/**
 * Formatea un NIT agregando o actualizando su Dígito de Verificación
 */
export function formatNITWithDV(nit: string): string {
  if (!nit) return '';
  const baseNit = nit.split('-')[0].replace(/\D/g, '');
  if (!baseNit) return nit;
  const dv = calculateDIANDV(baseNit);
  return `${baseNit}-${dv}`;
}

/**
 * Genera el texto para compartir el comprobante / factura por WhatsApp
 */
export function buildWhatsAppInvoiceShareText(options: {
  companyName: string;
  invoiceNumber: string;
  clientName: string;
  totalCOP: string;
  date: string;
  cufe?: string;
}): string {
  const { companyName, invoiceNumber, clientName, totalCOP, date, cufe } = options;
  let text = `📄 *FACTURA ELECTRÓNICA DE VENTA - ${companyName}*\n\n`;
  text += `Estimado(a) *${clientName}*,\n`;
  text += `Le compartimos los datos de su factura electrónica emitida el ${date}:\n\n`;
  text += `• *No. Factura:* ${invoiceNumber}\n`;
  text += `• *Total a Pagar:* ${totalCOP}\n`;
  if (cufe) {
    text += `• *CUFE DIAN:* ${cufe.substring(0, 24)}...\n`;
    text += `• *Verificación DIAN:* https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}\n`;
  }
  text += `\nGracias por su confianza. Si tiene dudas o requiere soporte, estamos a su disposición.`;
  return text;
}

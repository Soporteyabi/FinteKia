/**
 * Utilidades para Taller de Servicio Técnico, Órdenes de Trabajo y Formatos
 * FinteKia ERP
 */
import { TechServiceOrder, Company } from '../types';

export const WORKSHOP_STATUS_CONFIG: Record<
  TechServiceOrder['status'],
  { label: string; color: string; bg: string; border: string; step: number; description: string }
> = {
  recibido: {
    label: 'Recibido',
    color: 'text-slate-300',
    bg: 'bg-slate-500/20',
    border: 'border-slate-500/40',
    step: 1,
    description: 'Equipo ingresado al taller, esperando asignación para diagnóstico inicial.'
  },
  en_diagnostico: {
    label: 'En Diagnóstico',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/40',
    step: 2,
    description: 'Técnico realizando pruebas de hardware, software y chequeo de componentes.'
  },
  esperando_repuesto: {
    label: 'Esperando Repuesto',
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/40',
    step: 3,
    description: 'Diagnóstico listo. A la espera de repuesto o aprobación del cliente.'
  },
  en_proceso: {
    label: 'En Taller / Reparación',
    color: 'text-sky-300',
    bg: 'bg-sky-500/20',
    border: 'border-sky-500/40',
    step: 4,
    description: 'En proceso de ensamble, mantenimiento, microsoldadura o instalación.'
  },
  completado: {
    label: 'Listo para Entrega',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/40',
    step: 5,
    description: 'Pruebas de calidad superadas. Notificado al cliente para retiro.'
  },
  entregado: {
    label: 'Entregado al Cliente',
    color: 'text-purple-300',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/40',
    step: 6,
    description: 'Equipo entregado con acta de satisfacción y garantía activa.'
  },
  cancelado: {
    label: 'Cancelado / No Aprobado',
    color: 'text-rose-400',
    bg: 'bg-rose-500/20',
    border: 'border-rose-500/40',
    step: 0,
    description: 'Servicio cancelado por el cliente o equipo sin reparación viable.'
  }
};

/**
 * Genera el texto con formato para compartir el estado de la OT al cliente vía WhatsApp
 */
export function buildWhatsAppServiceNotification(
  order: TechServiceOrder,
  company: Company,
  formatCOP: (v: number) => string
): string {
  const statusInfo = WORKSHOP_STATUS_CONFIG[order.status] || { label: order.status };
  const cost = order.finalCost || order.estimatedCost;

  let text = `🛠️ *${company.name.toUpperCase()} - SERVICIO TÉCNICO*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Estimado(a) *${order.clientName}*,\n\n`;
  text += `Le informamos el estado actual de su orden de servicio:\n`;
  text += `📋 *Orden:* ${order.code}\n`;
  text += `💻 *Equipo:* ${order.device}\n`;
  if (order.serial) text += `🔢 *Serial / S/N:* ${order.serial}\n`;
  text += `⚡ *Estado:* ${statusInfo.label.toUpperCase()}\n`;
  text += `📅 *Fecha Ingreso:* ${order.createdAt}\n`;

  if (order.status === 'completado') {
    text += `\n🎉 *¡Su equipo ya está listo para ser retirado!*\n`;
    text += `💰 *Total a Cancelar:* ${formatCOP(cost)}\n`;
    if (order.warrantyDays) {
      text += `🛡️ *Garantía de Reparación:* ${order.warrantyDays} días\n`;
    }
  } else if (order.status === 'en_diagnostico' || order.status === 'esperando_repuesto') {
    if (order.diagnosis) {
      text += `\n🔍 *Diagnóstico preliminar:* ${order.diagnosis}\n`;
    }
    text += `💰 *Presupuesto estimado:* ${formatCOP(cost)}\n`;
  } else if (order.status === 'recibido') {
    text += `\nSu equipo ha ingresado a nuestro laboratorio técnico y se encuentra en cola de revisión.\n`;
  }

  text += `\n📍 *Ubicación:* ${company.address}${company.city ? ', ' + company.city : ''}\n`;
  if (company.phone) {
    text += `📞 *Contacto:* ${company.phone}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `_Mensaje generado automáticamente por FinteKia ERP_`;

  return text;
}

/**
 * Limpia y normaliza el número de teléfono para enlace directo a WhatsApp (Colombia +57)
 */
export function getWhatsAppPhoneLink(phone: string | undefined, message: string): string {
  if (!phone) return '#';
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 10 && clean.startsWith('3')) {
    clean = '57' + clean;
  }
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

import { WompiConfig } from '../types';

export const WOMPI_SANDBOX_DEFAULTS: WompiConfig = {
  enabled: true,
  environment: 'sandbox',
  publicKey: 'pub_test_Q5yDA9xoKdePzhSGeVe9HAez7HgGObCi',
  privateKey: 'prv_test_54938a1b029384726182948291038294',
  integritySecret: 'test_integrity_4XG9Nsm2j1Qz8hP54gH6xL7zK1a',
  eventsUrl: '/api/wompi/webhook',
  acceptedPaymentMethods: ['CARD', 'NEQUI', 'BANCOLOMBIA_TRANSFER', 'PSE'],
  autoCreateReceipt: true,
  pasarelaAccountCode: '111005', // Bancos / Wompi Pasarela
  commissionAccountCode: '530515' // Comisiones Bancarias / Pasarela
};

export interface WompiTestCard {
  brand: string;
  number: string;
  cvv: string;
  exp: string;
  expectedResult: 'APROBADA' | 'DECLINADA' | 'ERROR';
  description: string;
}

export const WOMPI_TEST_CARDS: WompiTestCard[] = [
  {
    brand: 'Visa',
    number: '4242 4242 4242 4242',
    cvv: '123',
    exp: '12/28',
    expectedResult: 'APROBADA',
    description: 'Transacción aprobada estándar (Sin cuotas / 1-36 cuotas)'
  },
  {
    brand: 'Mastercard',
    number: '5555 5555 5555 4444',
    cvv: '888',
    exp: '09/27',
    expectedResult: 'APROBADA',
    description: 'Mastercard débito / crédito aprobada sin restricciones'
  },
  {
    brand: 'Visa Declinada',
    number: '4000 0000 0000 0002',
    cvv: '123',
    exp: '12/28',
    expectedResult: 'DECLINADA',
    description: 'Declinada por fondos insuficientes'
  },
  {
    brand: 'Mastercard Error',
    number: '5105 1051 0510 5100',
    cvv: '123',
    exp: '12/28',
    expectedResult: 'ERROR',
    description: 'Error técnico / Tarjeta no autorizada para comercio electrónico'
  }
];

/**
 * Genera la firma de integridad SHA-256 requerida por Wompi
 * Cadena: {referencia}{monto_en_centavos}{moneda}{secreto_integridad}
 */
export async function generateWompiIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string = 'COP',
  integritySecret?: string
): Promise<string> {
  const secret = integritySecret || WOMPI_SANDBOX_DEFAULTS.integritySecret || '';
  const message = `${reference}${amountInCents}${currency}${secret}`;
  
  // Utilizar Web Crypto API nativa del navegador
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('Error calculando firma SHA-256 Wompi:', err);
    return 'sig_' + Math.random().toString(36).substring(2);
  }
}

/**
 * Construye la URL del Widget Checkout Oficial de Wompi
 */
export function buildWompiCheckoutUrl(
  config: WompiConfig,
  reference: string,
  amountInCOP: number,
  signature: string,
  redirectUrl?: string
): string {
  const publicKey = config.publicKey || WOMPI_SANDBOX_DEFAULTS.publicKey;
  const amountInCents = Math.round(amountInCOP * 100);
  const baseUrl = 'https://checkout.wompi.co/p/';

  const params = new URLSearchParams({
    'public-key': publicKey,
    'currency': 'COP',
    'amount-in-cents': String(amountInCents),
    'reference': reference,
    'signature:integrity': signature
  });

  if (redirectUrl) {
    params.set('redirect-url', redirectUrl);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Calcula la comisión estimada de Wompi en Colombia
 * Tarifa estándar: 2.65% + $700 COP + IVA de la comisión (19%)
 */
export function calculateWompiEstimatedFee(amountInCOP: number) {
  const percentageFee = amountInCOP * 0.0265;
  const fixedFee = 700;
  const subtotalFee = percentageFee + fixedFee;
  const ivaFee = subtotalFee * 0.19;
  const totalFee = Math.round(subtotalFee + ivaFee);
  const netAmount = Math.max(0, amountInCOP - totalFee);

  return {
    percentageFee: Math.round(percentageFee),
    fixedFee,
    ivaFee: Math.round(ivaFee),
    totalFee,
    netAmount
  };
}

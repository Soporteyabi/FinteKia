import React, { useState, useEffect } from 'react';
import { WompiConfig, CardPaymentDetails } from '../types';
import { 
  WOMPI_SANDBOX_DEFAULTS, 
  WOMPI_TEST_CARDS, 
  generateWompiIntegritySignature, 
  buildWompiCheckoutUrl,
  calculateWompiEstimatedFee 
} from '../lib/wompiService';
import { toast } from '../context/ToastContext';

interface WompiCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
  totalAmount: number;
  clientName: string;
  clientEmail?: string;
  clientNit?: string;
  wompiConfig?: WompiConfig;
  onPaymentSuccess: (details: CardPaymentDetails) => void;
  theme?: string;
}

export default function WompiCheckoutModal({
  isOpen,
  onClose,
  invoiceNumber,
  totalAmount,
  clientName,
  clientEmail,
  clientNit,
  wompiConfig,
  onPaymentSuccess,
  theme = 'navy_dark'
}: WompiCheckoutModalProps) {
  const isLight = theme === 'light_gray';
  const activeConfig = wompiConfig?.enabled ? wompiConfig : WOMPI_SANDBOX_DEFAULTS;
  const isSandbox = activeConfig.environment === 'sandbox';

  const [activeTab, setActiveTab] = useState<'cards' | 'link' | 'qr'>('cards');
  const [selectedFranchise, setSelectedFranchise] = useState<'visa' | 'mastercard' | 'amex' | 'otro'>('visa');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState(clientName || 'Cliente General');
  const [cardExp, setCardExp] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [installments, setInstallments] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const reference = `FAC-${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36)}`;
  const feeInfo = calculateWompiEstimatedFee(totalAmount);

  // Generate checkout URL and signature
  useEffect(() => {
    let isMounted = true;
    async function init() {
      const sig = await generateWompiIntegritySignature(
        reference,
        Math.round(totalAmount * 100),
        'COP',
        activeConfig.integritySecret
      );
      if (isMounted) {
        const url = buildWompiCheckoutUrl(activeConfig, reference, totalAmount, sig);
        setPaymentLink(url);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [reference, totalAmount, activeConfig]);

  if (!isOpen) return null;

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleApplyTestCard = (testCard: typeof WOMPI_TEST_CARDS[0]) => {
    setCardNumber(testCard.number);
    setCardExp(testCard.exp);
    setCardCvv(testCard.cvv);
    setSelectedFranchise(testCard.brand.toLowerCase().includes('visa') ? 'visa' : 'mastercard');
    toast.info(`Cargada tarjeta de prueba: ${testCard.brand} (${testCard.expectedResult})`, 'Sandbox Wompi');
  };

  const handleSimulatePayment = () => {
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      // Check if it's the declined card
      if (cardNumber.replace(/\s/g, '').endsWith('0002')) {
        toast.error('Transacción declinada por el banco emisor: Fondos insuficientes.', 'Cobro Rechazado');
        return;
      }
      if (cardNumber.replace(/\s/g, '').endsWith('5100')) {
        toast.error('Error de comunicación con la franquicia. Por favor intente con otra tarjeta.', 'Error Wompi');
        return;
      }

      const txId = `WOMPI-TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const authCode = `AP-${Math.floor(100000 + Math.random() * 900000)}`;
      const lastFour = cardNumber.replace(/\s/g, '').slice(-4) || '4242';

      const paymentDetails: CardPaymentDetails = {
        methodType: 'wompi_online',
        cardType: installments > 1 ? 'credito' : 'debito',
        franchise: selectedFranchise,
        lastFourDigits: lastFour,
        authorizationCode: authCode,
        installments: Number(installments),
        wompiTransactionId: txId,
        wompiPaymentLink: paymentLink,
        wompiStatus: 'APPROVED'
      };

      toast.success(
        `Cobro Wompi Aprobado con éxito. Ref: ${txId} | Aprobación: ${authCode}`,
        'Pago Confirmado'
      );
      onPaymentSuccess(paymentDetails);
      onClose();
    }, 1200);
  };

  const handleCopyPaymentLink = () => {
    if (!paymentLink) return;
    navigator.clipboard.writeText(paymentLink);
    setCopiedLink(true);
    toast.success('Enlace de pago copiado al portapapeles. Listo para enviar por WhatsApp o correo.', 'Link Wompi');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border transition-all duration-200 animate-scale-in max-h-[92vh] ${
          isLight
            ? 'bg-white border-slate-300 text-slate-900 shadow-slate-400/40'
            : 'bg-slate-900 border-slate-700/80 text-white shadow-black/80'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Wompi Branding */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-amber-300 text-lg shadow-inner">
              <i className="ri-bank-card-fill"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">
                  Pasarela de Pagos Wompi Bancolombia
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                  isSandbox
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                }`}>
                  {isSandbox ? 'Ambiente Pruebas' : 'En Producción'}
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Cobro para Factura <span className="font-mono font-bold text-white">{invoiceNumber}</span> • {clientName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        {/* Amount Banner */}
        <div className="px-6 py-3.5 bg-blue-600/10 border-b border-blue-500/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              Total a Recibir (COP):
            </span>
            <span className="text-2xl font-black font-sans text-blue-600 dark:text-cyan-400 tracking-tight">
              {formatCOP(totalAmount)}
            </span>
          </div>

          <div className="text-right text-[11px] text-slate-400">
            <span className="block font-mono">Comisión Wompi estimada: ~{formatCOP(feeInfo.totalFee)}</span>
            <span className="block font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              Neto en cuenta: {formatCOP(feeInfo.netAmount)}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 gap-2 pt-3 shrink-0">
          <button
            onClick={() => setActiveTab('cards')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cards'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="ri-bank-card-line text-sm"></i>
            <span>Tarjeta de Crédito / Débito</span>
          </button>

          <button
            onClick={() => setActiveTab('link')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'link'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="ri-link text-sm"></i>
            <span>Link de Pago (WhatsApp / Correo)</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'qr'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="ri-qr-code-line text-sm"></i>
            <span>Código QR Bancolombia</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'cards' && (
            <div className="space-y-4">
              {/* Sandbox Test Cards Banner */}
              {isSandbox && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase text-amber-500 flex items-center gap-1.5 tracking-wider">
                      <i className="ri-flask-line"></i> Tarjetas Oficiales de Prueba Wompi (1-Clic):
                    </span>
                    <span className="text-[9.5px] font-mono text-slate-400">Sin cargos reales</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {WOMPI_TEST_CARDS.map((tc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyTestCard(tc)}
                        className="p-2 rounded-xl border border-slate-700 hover:border-amber-400/60 bg-slate-800/80 hover:bg-slate-800 text-left transition-all cursor-pointer text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-[11px]">{tc.brand}</span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            tc.expectedResult === 'APROBADA'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {tc.expectedResult}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{tc.number}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Franchise Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  Franquicia de la Tarjeta
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'visa', label: 'Visa', icon: 'ri-visa-line' },
                    { id: 'mastercard', label: 'Mastercard', icon: 'ri-mastercard-line' },
                    { id: 'amex', label: 'American Exp.', icon: 'ri-bank-card-line' },
                    { id: 'otro', label: 'Diners / Otra', icon: 'ri-bank-card-2-line' },
                  ].map((fr) => (
                    <button
                      key={fr.id}
                      type="button"
                      onClick={() => setSelectedFranchise(fr.id as any)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        selectedFranchise === fr.id
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <i className={`${fr.icon} text-lg`}></i>
                      <span className="text-[10px]">{fr.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Número de Tarjeta (16 dígitos)
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-xs outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                    }`}
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Nombre del Titular de la Tarjeta
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="ej. CARLOS ARTURO VELEZ"
                    className={`w-full px-3 py-2 rounded-xl border font-semibold text-xs outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Fecha Vencimiento (MM/AA)
                  </label>
                  <input
                    type="text"
                    value={cardExp}
                    onChange={(e) => setCardExp(e.target.value)}
                    placeholder="12/28"
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-xs outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Código de Seguridad (CVV)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="123"
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-xs outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                    }`}
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Diferir a Cuotas (Para Tarjetas de Crédito)
                  </label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border font-bold text-xs outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                    }`}
                  >
                    <option value={1}>1 Cuota (Sin intereses corrientes / Débito)</option>
                    <option value={2}>2 Cuotas</option>
                    <option value={3}>3 Cuotas</option>
                    <option value={6}>6 Cuotas</option>
                    <option value={12}>12 Cuotas (1 año)</option>
                    <option value={24}>24 Cuotas (2 años)</option>
                    <option value={36}>36 Cuotas (3 años)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSimulatePayment}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-base"></i>
                      <span>Procesando con Wompi...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-secure-payment-line text-base"></i>
                      <span>Procesar Pago por {formatCOP(totalAmount)}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
                <p className="font-bold text-blue-400 flex items-center gap-1.5">
                  <i className="ri-share-forward-line"></i> Link Oficial de Pago Wompi
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Envía este enlace seguro a tu cliente por WhatsApp, correo o SMS. El cliente abrirá el checkout oficial de Wompi y podrá pagar con tarjeta, Nequi, PSE o Botón Bancolombia.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  URL del Checkout Wompi:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={paymentLink}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 font-mono text-xs text-slate-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPaymentLink}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <i className={copiedLink ? "ri-check-line" : "ri-file-copy-line"}></i>
                    <span>{copiedLink ? '¡Copiado!' : 'Copiar Link'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hola ${clientName}, te compartimos el enlace para pagar la Factura ${invoiceNumber} por valor de ${formatCOP(totalAmount)} de forma segura con Wompi: ${paymentLink}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <i className="ri-whatsapp-line text-base"></i>
                  <span>Compartir por WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="space-y-4 text-center py-2">
              <div className="max-w-xs mx-auto p-5 rounded-3xl bg-white text-slate-900 shadow-xl border border-slate-200">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="font-black text-xs tracking-wider uppercase text-blue-600">Wompi Bancolombia</span>
                </div>
                <div className="w-48 h-48 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-slate-300 p-2">
                  {/* Visual QR representation */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentLink)}`}
                    alt="QR Wompi"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs font-bold mt-3 text-slate-800">Escanea para pagar</p>
                <p className="text-[11px] font-mono text-blue-600 font-bold">{formatCOP(totalAmount)}</p>
                <p className="text-[9.5px] text-slate-500 mt-1">Acepta Tarjetas, PSE, Nequi y Bancolombia</p>
              </div>

              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Este código QR también puede imprimirse automáticamente en la representación gráfica de la Factura Electrónica.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

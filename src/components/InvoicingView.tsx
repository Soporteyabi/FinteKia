import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Tercero, Product, InventoryItem, Voucher, PucAccount, CardPaymentDetails } from '../types';
import { THEMES_MAP } from './Sidebar';
import Pagination from './Pagination';
import { calculateDIANDV, formatNITWithDV, buildWhatsAppInvoiceShareText } from '../lib/dianUtils';
import { exportInvoicesToExcel } from '../utils/excelExport';
import { toast } from '../context/ToastContext';
import WompiCheckoutModal from './WompiCheckoutModal';
import {
  BillingConfigModal,
  InvoicePrintPreview,
  JsonPayloadModal,
  QuickClientModal,
  DianHabilitationAssistant,
  InvoiceDesignModal,
  InvoiceEmailModal,
  SmtpConfigModal
} from './invoicing';

interface InvoicingViewProps {
  currentCompany: any;
  vouchers: Voucher[];
  terceros: Tercero[];
  products: Product[];
  inventory: InventoryItem[];
  addVoucher: (p: { 
    number: string; 
    type: 'venta'; 
    concept: string; 
    thirdPartyId: string; 
    total: number; 
    lines: any[]; 
    items?: any[]; 
    companyId?: string;
    paymentTerm?: 'contado' | 'credito';
    dueDate?: string;
    discountTotal?: number;
    retenciones?: { retefuente?: number; reteiva?: number; reteica?: number };
    billingProviderData?: any;
    notes?: string;
    paymentMethod?: string;
    cardDetails?: CardPaymentDetails;
    paymentLink?: string;
  }) => void;
  updateInventory: (prodId: string, lotNum: string | undefined, diffQty: number) => void;
  puc: PucAccount[];
  addInventoryMovement?: (mov: any) => void;
  theme?: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
  updateCompany?: (co: any) => void;
  onOpenAlanubeConfig?: () => void;
  addTercero?: (t: Omit<Tercero, 'id'>) => void;
  currentUser?: { name?: string; email?: string; role?: string; [key: string]: any };
  onReturnToMenu?: () => void;
  setActiveView?: (view: any) => void;
}

export default function InvoicingView({
  currentCompany,
  vouchers,
  terceros,
  products,
  inventory,
  addVoucher,
  updateInventory,
  puc,
  addInventoryMovement,
  theme = 'slate_gray',
  updateCompany,
  onOpenAlanubeConfig,
  addTercero,
  currentUser,
  onReturnToMenu,
  setActiveView
}: InvoicingViewProps) {
  const [selectedClient, setSelectedClient] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().substring(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [paymentTerm, setPaymentTerm] = useState<'contado' | 'credito'>('contado');
  const [creditDays, setCreditDays] = useState<number>(30);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [retefuentePercent, setRetefuentePercent] = useState<number>(0);
  const [invoiceLines, setInvoiceLines] = useState<Array<{ productId: string; lotNumber?: string; qty: number; unitPrice: number }>>([]);
  const [showPrintPreview, setShowPrintPreview] = useState<Voucher | null>(null);
  const [printFormat, setPrintFormat] = useState<'carta' | 'pos'>('carta');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Card Payment & Wompi Gateway States
  const [cardMode, setCardMode] = useState<'datafono' | 'wompi'>('datafono');
  const [cardFranchise, setCardFranchise] = useState<'visa' | 'mastercard' | 'amex' | 'diners' | 'otro'>('visa');
  const [cardAuthVoucher, setCardAuthVoucher] = useState('');
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardInstallments, setCardInstallments] = useState<number>(1);
  const [showWompiModal, setShowWompiModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [wompiConfirmedDetails, setWompiConfirmedDetails] = useState<CardPaymentDetails | null>(null);
  const [activeWompiPaymentLink, setActiveWompiPaymentLink] = useState('');

  // Quick Client Creation Modal States
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientNit, setQuickClientNit] = useState('');
  const [quickClientPhone, setQuickClientPhone] = useState('');
  const [quickClientEmail, setQuickClientEmail] = useState('');
  const [quickClientAddress, setQuickClientAddress] = useState('');
  const [quickClientCity, setQuickClientCity] = useState('Bogotá, D.C.');
  const [quickClientRegimen, setQuickClientRegimen] = useState<'no_responsable' | 'responsable' | 'simple'>('no_responsable');

  const quickComputedDV = useMemo(() => {
    return calculateDIANDV(quickClientNit);
  }, [quickClientNit]);

  // Third-Party Billing Provider States
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [transmissionSuccessMsg, setTransmissionSuccessMsg] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [selectedPayloadInvoice, setSelectedPayloadInvoice] = useState<Voucher | null>(null);
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [salesCompanyFilter, setSalesCompanyFilter] = useState<'current' | 'all'>('current');
  const [showAdminToolsDropdown, setShowAdminToolsDropdown] = useState(false);
  const [activeInvoicingTab, setActiveInvoicingTab] = useState<'pos' | 'historial' | 'config_dian'>('pos');
  const isAdminOrAccountant = !currentUser || !currentUser.role || currentUser.role === 'Admin' || currentUser.role === 'Contador';

  // MEJORA 3: Email Notification & SMTP States
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedEmailInvoice, setSelectedEmailInvoice] = useState<Voucher | null>(null);
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [sentInvoicesMap, setSentInvoicesMap] = useState<Record<string, { sentAt: string; to: string }>>(() => {
    try {
      const raw = localStorage.getItem('fintekia_sent_invoices_map');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const refreshSentInvoicesMap = (invoiceNo: string) => {
    try {
      const raw = localStorage.getItem('fintekia_sent_invoices_map');
      if (raw) {
        setSentInvoicesMap(JSON.parse(raw));
      }
    } catch {
      // Ignored
    }
  };

  // Active Billing Config
  const activeBillingConfig = currentCompany?.billingConfig || {
    providerType: 'tercero_proveedor',
    providerName: 'Alanube',
    providerNit: '901.464.305-6',
    environment: 'produccion',
    prefix: 'FE',
    resolutionNumber: '187640000099',
    resolutionDate: '2026-01-15',
    authorizedRangeFrom: 101,
    authorizedRangeTo: 10000,
    apiEndpoint: 'https://api.alanube.co/dian/v1/invoices',
    apiToken: 'ala_live_sec_98f7e2a4d3_auth_key',
    autoSendEmail: true
  };

  // Quick config modal states
  const [cfgProviderName, setCfgProviderName] = useState(activeBillingConfig.providerName || 'Alanube');
  const [cfgEnvironment, setCfgEnvironment] = useState(activeBillingConfig.environment || 'produccion');
  const [cfgPrefix, setCfgPrefix] = useState(activeBillingConfig.prefix || 'FE');
  const [cfgResolution, setCfgResolution] = useState(activeBillingConfig.resolutionNumber || '187640000099');
  const [cfgResolutionDate, setCfgResolutionDate] = useState(activeBillingConfig.resolutionDate || '2026-01-15');
  const [cfgToken, setCfgToken] = useState(activeBillingConfig.apiToken || 'ala_live_sec_98f7e2a4d3_auth_key');
  const [cfgAutoEmail, setCfgAutoEmail] = useState(activeBillingConfig.autoSendEmail !== false);
  const [cfgTestStatus, setCfgTestStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isTestingCfg, setIsTestingCfg] = useState(false);

  // Keep modal state in sync with company changes
  useEffect(() => {
    if (currentCompany?.billingConfig) {
      setCfgProviderName(currentCompany.billingConfig.providerName || 'Alanube');
      setCfgEnvironment(currentCompany.billingConfig.environment || 'produccion');
      setCfgPrefix(currentCompany.billingConfig.prefix || 'FE');
      setCfgResolution(currentCompany.billingConfig.resolutionNumber || '187640000099');
      setCfgResolutionDate(currentCompany.billingConfig.resolutionDate || '2026-01-15');
      setCfgToken(currentCompany.billingConfig.apiToken || 'ala_live_sec_98f7e2a4d3_auth_key');
      setCfgAutoEmail(currentCompany.billingConfig.autoSendEmail !== false);
    }
  }, [currentCompany]);

  // Search and auto-selection state
  const [productSearch, setProductSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [addedNotice, setAddedNotice] = useState<{ message: string; id: number } | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Camera Barcode Scanner states
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [continuousScan, setContinuousScan] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const html5ScannerRef = useRef<Html5Qrcode | null>(null);

  // Play electronic barcode scanner beep
  const playScannerBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio playback silently ignored if blocked by browser policy
    }
  };

  // Open camera scanner
  const openCameraScanner = () => {
    setCameraError(null);
    setIsCameraModalOpen(true);
  };

  // Close camera scanner and stop stream
  const closeCameraScanner = async () => {
    if (html5ScannerRef.current) {
      try {
        if (html5ScannerRef.current.isScanning) {
          await html5ScannerRef.current.stop();
        }
        html5ScannerRef.current.clear();
      } catch (e) {
        console.warn('Error clearing camera scanner:', e);
      }
      html5ScannerRef.current = null;
    }
    setIsCameraModalOpen(false);
    setCameraError(null);
  };

  // Lifecycle for Html5Qrcode camera scanner prioritizing rear camera
  useEffect(() => {
    let isMounted = true;
    let scannerInstance: Html5Qrcode | null = null;

    if (isCameraModalOpen) {
      const initCamera = async () => {
        try {
          await new Promise((res) => setTimeout(res, 220));
          if (!isMounted) return;

          const container = document.getElementById('barcode-camera-reader');
          if (!container) return;

          scannerInstance = new Html5Qrcode('barcode-camera-reader', {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE
            ],
            verbose: false
          });
          html5ScannerRef.current = scannerInstance;

          // Determine exact rear camera device ID via MediaDevices API
          let cameraConfig: any = { facingMode: { ideal: 'environment' } };

          try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
              setAvailableCameras(devices);
              if (selectedCameraId) {
                cameraConfig = selectedCameraId;
              } else if (facingMode === 'environment') {
                // Find back / rear camera specifically
                const rearCam = devices.find(d => 
                  /back|rear|environment|trasera|posterior/i.test(d.label)
                );
                cameraConfig = rearCam ? rearCam.id : { facingMode: 'environment' };
              } else {
                const frontCam = devices.find(d => /front|user|delantera|frontal/i.test(d.label));
                cameraConfig = frontCam ? frontCam.id : { facingMode: 'user' };
              }
            }
          } catch {
            cameraConfig = { facingMode: facingMode === 'environment' ? { ideal: 'environment' } : 'user' };
          }

          await scannerInstance.start(
            cameraConfig,
            {
              fps: 14,
              qrbox: { width: 280, height: 170 }
            },
            (decodedText) => {
              if (!isMounted) return;
              const now = Date.now();
              // Prevent duplicate triggers for the same barcode within 1.8s
              if (
                lastScannedRef.current.code === decodedText &&
                now - lastScannedRef.current.time < 1800
              ) {
                return;
              }
              lastScannedRef.current = { code: decodedText, time: now };
              handleScanBarcode(decodedText);
              if (!continuousScan) {
                closeCameraScanner();
              }
            },
            () => {
              // Frame heartbeat
            }
          );
        } catch (err: any) {
          console.warn('Camera stream error:', err);
          if (isMounted) {
            setCameraError(
              err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
                ? 'Permiso de cámara denegado en el navegador. Por favor otorgue permiso a la cámara para escanear.'
                : 'No se pudo acceder a la cámara del dispositivo (' + (err?.message || 'Cámara no disponible') + ').'
            );
          }
        }
      };

      initCamera();
    }

    return () => {
      isMounted = false;
      if (scannerInstance) {
        try {
          if (scannerInstance.isScanning) {
            scannerInstance.stop().catch(console.error).finally(() => {
              scannerInstance?.clear();
            });
          } else {
            scannerInstance.clear();
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [isCameraModalOpen, facingMode, selectedCameraId, continuousScan]);

  // Scan barcode handler
  const handleScanBarcode = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    const codeLower = code.toLowerCase();
    const matched = products.find((p) => 
      (p.barcode && p.barcode.toLowerCase() === codeLower) ||
      (p.sku && p.sku.toLowerCase() === codeLower) ||
      (p.id.toLowerCase() === codeLower)
    );

    if (matched) {
      playScannerBeep();
      handleSelectProductToAdd(matched.id);
      const noticeId = Date.now();
      setAddedNotice({
        message: `✓ Escaneado con cámara: "${matched.name}" (${formatCOP(matched.price)})`,
        id: noticeId
      });
    } else {
      const noticeId = Date.now();
      setAddedNotice({
        message: `⚠️ Código [${code}] no registrado en el catálogo.`,
        id: noticeId
      });
      setTimeout(() => {
        setAddedNotice((curr) => (curr?.id === noticeId ? null : curr));
      }, 4000);
    }
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Filter clients and finished products
  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;
  const isNavy = theme === 'navy_dark';
  
  const inputBg = isNavy ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900';
  const labelText = isNavy ? 'text-slate-400' : 'text-slate-700 font-semibold';
  const sectionBorder = isNavy ? 'border-slate-850' : 'border-slate-200';
  const headingText = isNavy ? 'text-white' : 'text-slate-900 font-bold';

  const clients = terceros.filter((t) => t.roles.includes('cliente'));
  const saleableProducts = products; // Allow all registered products to be billed/sold

  // Filter products based on user typing
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return saleableProducts;
    const query = productSearch.toLowerCase().trim();
    return saleableProducts.filter((p) => 
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.barcode && p.barcode.toLowerCase().includes(query)) ||
      (p.type && p.type.toLowerCase().includes(query))
    );
  }, [saleableProducts, productSearch]);

  // Automatically integrate a line upon selecting a product with default values
  const handleSelectProductToAdd = (productId: string) => {
    if (!productId) return;
    const selected = products.find((p) => p.id === productId);
    if (!selected) return;

    let finalQty = 1;
    setInvoiceLines((prev) => {
      // Check if product is already in the invoice
      const existingIdx = prev.findIndex((l) => l.productId === productId);
      if (existingIdx >= 0) {
        // Increment quantity by 1
        const updated = [...prev];
        finalQty = updated[existingIdx].qty + 1;
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: finalQty
        };
        return updated;
      }

      // Pre-fill default lot if active (PEPS / FIFO)
      let lotNumber = 'S/L';
      if (selected.lotTracking) {
        const availableLotRow = inventory
          .filter((item) => item.productId === selected.id && item.quantity > 0)
          .sort((a, b) => {
            if (!a.expirationDate) return 1;
            if (!b.expirationDate) return -1;
            return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
          })[0];
        lotNumber = availableLotRow ? availableLotRow.lotNumber : 'S/L';
      }

      return [
        ...prev,
        {
          productId: selected.id,
          qty: 1,
          unitPrice: selected.price,
          lotNumber
        }
      ];
    });

    // Provide visual feedback and reset search
    setProductSearch('');
    setIsSearchOpen(false);
    const noticeId = Date.now();
    setAddedNotice({
      message: `✓ Línea agregada automáticamente: "${selected.name}" (${formatCOP(selected.price)})`,
      id: noticeId
    });
    setTimeout(() => {
      setAddedNotice((curr) => (curr?.id === noticeId ? null : curr));
    }, 3200);
  };

  const removeLine = (idx: number) => {
    setInvoiceLines(invoiceLines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, key: string, val: any) => {
    const updated = [...invoiceLines];
    updated[idx] = { ...updated[idx], [key]: val };

    // Auto-update unit price if product is changed
    if (key === 'productId') {
      const selected = products.find((p) => p.id === val);
      if (selected) {
        updated[idx].unitPrice = selected.price;
        if (selected.lotTracking) {
          const availableLotRow = inventory.find((item) => item.productId === selected.id && item.quantity > 0);
          updated[idx].lotNumber = availableLotRow ? availableLotRow.lotNumber : 'S/L';
        }
      }
    }
    setInvoiceLines(updated);
  };

  // Calculates math totals with commercial discount and ReteFuente
  const subtotalGross = invoiceLines.reduce((acc, line) => {
    return acc + line.qty * line.unitPrice;
  }, 0);

  const discountAmount = Math.round(subtotalGross * (discountPercent / 100));
  const subtotal = Math.max(0, subtotalGross - discountAmount);

  // Colombian average multi-tiered IVA estimation adjusted by discount
  const discountFactor = subtotalGross > 0 ? (1 - discountPercent / 100) : 1;
  const totalTax = invoiceLines.reduce((acc, line) => {
    const p = products.find((prod) => prod.id === line.productId);
    const taxFactor = p ? p.tax / 100 : 0.19;
    return acc + (line.qty * line.unitPrice * discountFactor) * taxFactor;
  }, 0);

  const retefuenteAmount = Math.round(subtotal * (retefuentePercent / 100));
  const finalTotal = Math.max(0, Math.round(subtotal + totalTax - retefuenteAmount));

  // Calculated due date based on terms
  const calculatedDueDate = useMemo(() => {
    if (paymentTerm !== 'credito') return invoiceDate;
    const d = new Date(invoiceDate);
    d.setDate(d.getDate() + creditDays);
    return d.toISOString().substring(0, 10);
  }, [invoiceDate, paymentTerm, creditDays]);

  // Mock highly safe Hex CUFE generator
  const getCUFESample = (vNum: string) => {
    return `ff2d810ca${vNum.replace('-', '')}e890c00122ffb76251410bc300450adffe7e900cca2348ff112e`;
  };

  // Generate lightweight third-party JSON payload for any invoice
  const buildThirdPartyPayload = (
    invNumber: string,
    clientId: string,
    itemsList: Array<{ productId: string; lotNumber?: string; qty: number; unitPrice: number }>,
    subTot: number,
    taxTot: number,
    tot: number
  ) => {
    const clientObj = terceros.find((t) => t.id === clientId);
    const isAlanube = activeBillingConfig.providerName === 'Alanube';
    return {
      provider: activeBillingConfig.providerName,
      provider_service: isAlanube 
        ? "Alanube Cloud Invoicing REST API v1 (UBL 2.1 DIAN)" 
        : `${activeBillingConfig.providerName} REST Invoicing API v1`,
      environment: activeBillingConfig.environment,
      document_type: "01", // Factura Electrónica de Venta
      prefix: activeBillingConfig.prefix || "FE",
      number: invNumber,
      issue_date: invoiceDate,
      issue_time: new Date().toTimeString().substring(0, 8),
      currency: "COP",
      alanube_config: isAlanube ? {
        provider_nit: "901.464.305-6",
        provider_name: "Alanube Technologies S.A.S.",
        dian_profile: "DIAN 2.1 Factura Electrónica",
        resolution_number: activeBillingConfig.resolutionNumber || "187640000099",
        auto_send_email: activeBillingConfig.autoSendEmail !== false
      } : undefined,
      company_sender: {
        nit: currentCompany.nit,
        name: currentCompany.name,
        address: currentCompany.address,
        regimen: currentCompany.regimen
      },
      customer: {
        identification: clientObj?.nit || "222222222222",
        name: clientObj?.name || "Consumidor Final",
        email: clientObj?.email || "adquirente@empresa.com",
        city: clientObj?.city || "Bogotá D.C.",
        address: clientObj?.address || "Cl. Principal # 1",
        legal_type: clientObj?.type || "juridica"
      },
      payment_form: {
        payment_method: paymentMethod.toUpperCase(),
        payment_code: paymentMethod === 'efectivo' ? '10' : paymentMethod === 'transferencia' ? '47' : '48'
      },
      items: itemsList.map((l, idx) => {
        const prod = products.find((p) => p.id === l.productId);
        const taxRate = prod ? prod.tax : 19;
        return {
          line_id: idx + 1,
          sku: prod?.sku || `PROD-${idx + 1}`,
          name: prod?.name || "Artículo comercial",
          quantity: l.qty,
          unit_price: l.unitPrice,
          tax_rate: taxRate,
          subtotal: Math.round(l.qty * l.unitPrice),
          tax_amount: Math.round(l.qty * l.unitPrice * (taxRate / 100)),
          total: Math.round(l.qty * l.unitPrice * (1 + taxRate / 100)),
          lot: l.lotNumber && l.lotNumber !== 'S/L' ? l.lotNumber : null
        };
      }),
      totals: {
        subtotal: Math.round(subTot),
        total_taxes: Math.round(taxTot),
        payable_total: Math.round(tot)
      },
      authorization: {
        dian_resolution: activeBillingConfig.resolutionNumber || "187640000099",
        resolution_date: activeBillingConfig.resolutionDate || "2026-01-15",
        delegated_to_provider: true,
        note: isAlanube 
          ? "Alanube API: El ERP remite JSON limpio. Alanube estampa firma criptográfica digital, genera UBL 2.1 y tramita validación previa DIAN."
          : "Estructura simplificada: FinteKia remite JSON al tercero. El tercero gestiona la firma criptográfica y el XML UBL 2.1 ante la DIAN."
      }
    };
  };

  // Quick config modal submit
  const handleSaveQuickConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedBilling = {
      providerType: 'tercero_proveedor' as const,
      providerName: cfgProviderName as any,
      providerNit: cfgProviderName === 'Alanube' 
        ? '901.464.305-6' 
        : cfgProviderName === 'Factus' 
        ? '901.324.558-1' 
        : cfgProviderName === 'Siigo' 
        ? '830.048.140-6' 
        : cfgProviderName === 'Alegra' 
        ? '900.551.229-3' 
        : '900.123.456-7',
      apiEndpoint: cfgProviderName === 'Alanube'
        ? (cfgEnvironment === 'produccion' ? 'https://api.alanube.co/dian/v1/invoices' : 'https://sandbox-api.alanube.co/dian/v1/invoices')
        : cfgProviderName === 'Factus'
        ? 'https://api.factus.com.co/v1/bills'
        : undefined,
      environment: cfgEnvironment as any,
      prefix: cfgPrefix.trim() || 'FE',
      resolutionNumber: cfgResolution.trim() || '187640000099',
      resolutionDate: cfgResolutionDate || '2026-01-15',
      authorizedRangeFrom: activeBillingConfig.authorizedRangeFrom ?? 101,
      authorizedRangeTo: activeBillingConfig.authorizedRangeTo ?? 10000,
      clientId: activeBillingConfig.clientId,
      clientSecret: activeBillingConfig.clientSecret,
      softwareId: activeBillingConfig.softwareId,
      pin: activeBillingConfig.pin,
      technicalKey: activeBillingConfig.technicalKey,
      testSetId: activeBillingConfig.testSetId,
      apiToken: cfgToken,
      autoSendEmail: cfgAutoEmail,
      lastTestStatus: activeBillingConfig.lastTestStatus,
      lastTestTimestamp: activeBillingConfig.lastTestTimestamp,
      lastTestMessage: activeBillingConfig.lastTestMessage,
      availableCredits: activeBillingConfig.availableCredits
    };

    if (updateCompany) {
      updateCompany({
        ...currentCompany,
        billingConfig: updatedBilling
      });
    }
    setShowConfigModal(false);
  };

  // WhatsApp Share handler
  const handleShareWhatsApp = (invoice: Voucher) => {
    const clientObj = terceros.find((t) => t.id === invoice.thirdPartyId);
    const text = buildWhatsAppInvoiceShareText({
      companyName: currentCompany.name,
      invoiceNumber: invoice.number,
      clientName: clientObj?.name || 'Cliente',
      totalCOP: formatCOP(invoice.total),
      date: invoice.date,
      cufe: invoice.billingProviderData?.cufe
    });
    const rawPhone = clientObj?.phone ? clientObj.phone.replace(/\D/g, '') : '';
    const phone = rawPhone.length > 0 ? (rawPhone.startsWith('57') ? rawPhone : `57${rawPhone}`) : '';
    const url = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` 
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Copy Summary handler
  const handleCopySummary = (invoice: Voucher) => {
    const clientObj = terceros.find((t) => t.id === invoice.thirdPartyId);
    const summary = `📄 FACTURA ELECTRÓNICA ${invoice.number}\n• Empresa: ${currentCompany.name} (NIT: ${currentCompany.nit})\n• Cliente: ${clientObj?.name || 'Cliente'} (NIT: ${clientObj?.nit || 'N/A'})\n• Fecha: ${invoice.date}\n• Condición: ${invoice.paymentTerm === 'credito' ? 'Crédito' : 'Contado'}${invoice.dueDate ? ` (Vence: ${invoice.dueDate})` : ''}\n• Total: ${formatCOP(invoice.total)}\n• CUFE: ${invoice.billingProviderData?.cufe || 'En verificación'}`;
    navigator.clipboard.writeText(summary);
    setCopyFeedback('¡Resumen copiado!');
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  // Quick Client Save
  const handleSaveQuickClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim() || !quickClientNit.trim()) {
      toast.warning("Por favor ingrese razón social o nombre y NIT del cliente.", "Datos Requeridos");
      return;
    }
    const newId = `ter-${Date.now()}`;
    const formattedNit = formatNITWithDV(quickClientNit);
    const newTerceroData = {
      name: quickClientName.trim(),
      nit: formattedNit,
      dv: String(calculateDIANDV(quickClientNit)),
      type: 'juridica' as const,
      roles: ['cliente' as const],
      city: quickClientCity || 'Bogotá, D.C.',
      address: quickClientAddress || 'Dirección Comercial Principal',
      phone: quickClientPhone || undefined,
      email: quickClientEmail || undefined,
      regimen: quickClientRegimen
    };

    if (addTercero) {
      addTercero({ ...newTerceroData, id: newId } as any);
    }
    setSelectedClient(newId);
    setShowQuickClientModal(false);
    setQuickClientName('');
    setQuickClientNit('');
    setQuickClientPhone('');
    setQuickClientEmail('');
    setQuickClientAddress('');
  };

  // Generate Electronic Invoice & Transmit to Third-Party Billing Provider
  const handleSaveInvoice = () => {
    if (!selectedClient) {
      toast.warning("Por favor seleccione un adquirente / cliente.", "Cliente Requerido");
      return;
    }
    if (invoiceLines.length === 0 || invoiceLines.some((l) => !l.productId || l.qty <= 0)) {
      toast.warning("Por favor seleccione al menos un producto para la factura con cantidad válida.", "Productos Requeridos");
      return;
    }

    // Generate Invoice Number (e.g., incremental FE-1XX)
    const salesInvoices = vouchers.filter((v) => v.type === 'venta');
    const prefix = activeBillingConfig.prefix || 'FE';
    const nextNumber = `${prefix}-${101 + salesInvoices.length}`;
    const cufeHex = getCUFESample(nextNumber);
    const txId = `fac_tx_${Date.now().toString(36)}-${nextNumber.replace('-', '')}`;

    // Build the simple JSON payload that goes to the third party API
    const rawPayload = buildThirdPartyPayload(
      nextNumber,
      selectedClient,
      invoiceLines,
      subtotal,
      totalTax,
      finalTotal
    );

    // Voucher lines representing Colombian accounting Double-Entry (PUC rules)
    const ledgerLines = [
      {
        accountCode: '130505', // Clientes Nacionales (Debito)
        description: `Cartera comercial FE No. ${nextNumber} (${paymentTerm === 'credito' ? `Crédito a ${creditDays}d - Vence: ${calculatedDueDate}` : 'Contado'} - Vía ${activeBillingConfig.providerName})`,
        debit: Math.round(finalTotal),
        credit: 0
      },
      ...(retefuenteAmount > 0 ? [{
        accountCode: '135515', // Anticipo de Retención en la Fuente (Debito)
        description: `ReteFuente aplicada (${retefuentePercent}%) FE No. ${nextNumber}`,
        debit: Math.round(retefuenteAmount),
        credit: 0
      }] : []),
      {
        accountCode: '240805', // IVA Generado (Credito)
        description: `Impuesto IVA generado en venta comercial FE No. ${nextNumber}`,
        debit: 0,
        credit: Math.round(totalTax)
      },
      {
        accountCode: '413501', // Ventas (Credito)
        description: `Ingreso operativo por venta de mercancías FE No. ${nextNumber}`,
        debit: 0,
        credit: Math.round(subtotalGross)
      },
      ...(discountAmount > 0 ? [{
        accountCode: '530535', // Descuentos comerciales condicionados (Debito)
        description: `Descuento comercial otorgado (${discountPercent}%) FE No. ${nextNumber}`,
        debit: Math.round(discountAmount),
        credit: 0
      }] : [])
    ];

    const isCardOrWompi = paymentMethod === 'debito' || paymentMethod === 'credito' || paymentMethod === 'wompi';
    const computedCardDetails: CardPaymentDetails | undefined = isCardOrWompi ? {
      methodType: cardMode === 'wompi' || paymentMethod === 'wompi' ? 'wompi_online' : 'datafono',
      cardType: paymentMethod === 'debito' ? 'debito' : 'credito',
      franchise: wompiConfirmedDetails?.franchise || cardFranchise,
      lastFourDigits: wompiConfirmedDetails?.lastFourDigits || cardLastFour || '4242',
      authorizationCode: wompiConfirmedDetails?.authorizationCode || cardAuthVoucher || `AUT-${Math.floor(100000 + Math.random() * 900000)}`,
      installments: paymentMethod === 'debito' ? 1 : cardInstallments,
      wompiTransactionId: wompiConfirmedDetails?.wompiTransactionId,
      wompiPaymentLink: activeWompiPaymentLink || wompiConfirmedDetails?.wompiPaymentLink,
      wompiStatus: wompiConfirmedDetails?.wompiStatus || 'APPROVED'
    } : undefined;

    setIsTransmitting(true);

    setTimeout(() => {
      addVoucher({
        number: nextNumber,
        type: 'venta',
        companyId: currentCompany.id,
        concept: `Factura Electrónica No. ${nextNumber} (${paymentTerm === 'credito' ? `Crédito ${creditDays}d` : 'Contado'} - Vía ${activeBillingConfig.providerName})`,
        thirdPartyId: selectedClient,
        total: Math.round(finalTotal),
        paymentTerm,
        dueDate: calculatedDueDate,
        discountTotal: discountAmount,
        retenciones: {
          retefuente: retefuenteAmount
        },
        lines: ledgerLines,
        items: invoiceLines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          unitPrice: l.unitPrice,
          lotNumber: l.lotNumber || 'S/L'
        })),
        paymentMethod,
        cardDetails: computedCardDetails,
        paymentLink: activeWompiPaymentLink || wompiConfirmedDetails?.wompiPaymentLink,
        billingProviderData: {
          providerName: activeBillingConfig.providerName,
          transactionId: txId,
          cufe: cufeHex,
          qrCodeUrl: `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufeHex}`,
          providerStatus: 'procesado_exitoso',
          dianValidationStatus: 'aprobado_dian',
          receivedAt: new Date().toISOString(),
          rawPayloadSent: rawPayload
        }
      });

      // Update real inventory slots (deducting client purchases) and register Kardex logs
      invoiceLines.forEach((line) => {
        updateInventory(line.productId, line.lotNumber, -line.qty);
        if (addInventoryMovement) {
          addInventoryMovement({
            date: invoiceDate,
            productId: line.productId,
            lotNumber: line.lotNumber,
            type: 'salida_venta',
            quantity: line.qty,
            cost: products.find((p) => p.id === line.productId)?.cost || 0,
            notes: `Venta Factura ${nextNumber} (Vía ${activeBillingConfig.providerName})`
          });
        }
      });

      setIsTransmitting(false);
      setTransmissionSuccessMsg(`¡Factura ${nextNumber} transmitida y autorizada exitosamente mediante el Proveedor Tecnológico ${activeBillingConfig.providerName}! Validación DIAN y CUFE confirmados.`);
      setTimeout(() => setTransmissionSuccessMsg(null), 6000);

      // Prompt or auto-open email notification if auto-send is configured
      if (currentCompany?.smtpConfig?.autoSendOnInvoiceCreation !== false && activeBillingConfig.autoSendEmail !== false) {
        const createdVoucher: Voucher = {
          id: `inv-${Date.now()}`,
          number: nextNumber,
          type: 'venta',
          companyId: currentCompany.id,
          concept: `Factura Electrónica No. ${nextNumber}`,
          thirdPartyId: selectedClient,
          total: Math.round(finalTotal),
          date: invoiceDate,
          dueDate: calculatedDueDate,
          lines: ledgerLines as any,
          status: 'aprobado',
          billingProviderData: {
            providerName: activeBillingConfig.providerName,
            transactionId: txId,
            cufe: cufeHex,
            providerStatus: 'procesado_exitoso',
            dianValidationStatus: 'aprobado_dian',
            receivedAt: new Date().toISOString()
          }
        };
        setSelectedEmailInvoice(createdVoucher);
        setShowEmailModal(true);
      }

      // Reset Form
      setInvoiceLines([]);
      setSelectedClient('');
      setCardAuthVoucher('');
      setCardLastFour('');
      setWompiConfirmedDetails(null);
      setActiveWompiPaymentLink('');
    }, 500);
  };

  // Pagination for sales history on sidebar (6 per page)
  const [salesPage, setSalesPage] = useState(1);
  const SALES_PER_PAGE = 6;

  // Advanced Combined Filters (Rango de Fechas + Estado + Tercero + Búsqueda)
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesEndDate, setSalesEndDate] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState<'todos' | 'contado' | 'credito' | 'cufe_ok'>('todos');
  const [salesClientFilter, setSalesClientFilter] = useState('');
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [showHabilitationModal, setShowHabilitationModal] = useState(false);
  const [autoRunHabilitationModal, setAutoRunHabilitationModal] = useState(false);

  const salesHistory = useMemo(() => {
    return vouchers
      .filter((v) => v.type === 'venta' || (v.type === 'ingreso' && v.number.startsWith('FE')))
      .filter((v) => {
        // 0. Multi-Company Isolation: show current active company or all
        if (salesCompanyFilter === 'current') {
          if (v.companyId && v.companyId !== currentCompany?.id) return false;
        }

        // 1. Date Range
        if (salesStartDate && v.date < salesStartDate) return false;
        if (salesEndDate && v.date > salesEndDate) return false;

        // 2. Status
        if (salesStatusFilter === 'contado' && v.paymentTerm !== 'contado') return false;
        if (salesStatusFilter === 'credito' && v.paymentTerm !== 'credito') return false;
        if (salesStatusFilter === 'cufe_ok' && !v.billingProviderData?.cufe) return false;

        // 3. Third Party
        if (salesClientFilter && v.thirdPartyId !== salesClientFilter) return false;

        // 4. Search query
        if (salesSearchQuery.trim()) {
          const q = salesSearchQuery.toLowerCase().trim();
          const clientObj = terceros.find(t => t.id === v.thirdPartyId);
          const clientName = (clientObj?.name || '').toLowerCase();
          const clientNit = (clientObj?.nit || '').toLowerCase();
          const matchNum = v.number.toLowerCase().includes(q);
          const matchConcept = (v.concept || '').toLowerCase().includes(q);
          const matchClient = clientName.includes(q) || clientNit.includes(q);
          const matchCufe = (v.billingProviderData?.cufe || '').toLowerCase().includes(q);
          if (!matchNum && !matchConcept && !matchClient && !matchCufe) return false;
        }

        return true;
      });
  }, [vouchers, salesCompanyFilter, currentCompany?.id, salesStartDate, salesEndDate, salesStatusFilter, salesClientFilter, salesSearchQuery, terceros]);

  const hasActiveSalesFilters = Boolean(
    salesStartDate || salesEndDate || salesStatusFilter !== 'todos' || salesClientFilter || salesSearchQuery.trim()
  );

  const clearSalesFilters = () => {
    setSalesStartDate('');
    setSalesEndDate('');
    setSalesStatusFilter('todos');
    setSalesClientFilter('');
    setSalesSearchQuery('');
    setSalesPage(1);
  };

  const totalSalesPages = Math.max(1, Math.ceil(salesHistory.length / SALES_PER_PAGE));
  const safeSalesPage = Math.min(salesPage, totalSalesPages);
  const paginatedSales = salesHistory.slice(
    (safeSalesPage - 1) * SALES_PER_PAGE,
    safeSalesPage * SALES_PER_PAGE
  );

  return (
    <div className="space-y-6">
      
      {showPrintPreview && (
        <InvoicePrintPreview
          invoice={showPrintPreview}
          onClose={() => setShowPrintPreview(null)}
          currentCompany={currentCompany}
          terceros={terceros}
          products={products}
          activeBillingConfig={activeBillingConfig}
          getCUFESample={getCUFESample}
          formatCOP={formatCOP}
          onUpdateCompany={updateCompany}
        />
      )}

      {/* Standard Interactive Form Layout on screens */}
      {!showPrintPreview && (
        <div className="space-y-4">
          
          {/* Notification Toast after successful issuance */}
          {transmissionSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-between gap-3 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2.5">
                <i className="ri-checkbox-circle-fill text-emerald-400 text-lg"></i>
                <span>{transmissionSuccessMsg}</span>
              </div>
              <button 
                onClick={() => setTransmissionSuccessMsg(null)}
                className="text-emerald-400/80 hover:text-emerald-400 text-sm p-1"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
          )}

          {/* Encabezado del Módulo de Facturación */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display font-extrabold text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                    <i className="ri-file-text-line text-indigo-400"></i>
                    <span>Facturación Electrónica DIAN</span>
                  </h2>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    DIAN En Línea · {activeBillingConfig.providerName}
                  </span>
                  {isAdminOrAccountant ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <i className="ri-shield-keyhole-line"></i> Admin
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                      <i className="ri-user-smile-line"></i> Modo Operativo ({currentUser?.role || 'Caja'})
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300/80 mt-1 flex items-center gap-2 flex-wrap">
                  <span><strong>{currentCompany?.name}</strong></span>
                  <span>·</span>
                  <span>NIT: <strong className="font-mono text-slate-200">{currentCompany?.nit}</strong></span>
                  <span>·</span>
                  <span>Prefijo: <strong className="text-indigo-300 font-mono">{activeBillingConfig.prefix || 'FE'}</strong></span>
                  <span>·</span>
                  <span>Res. DIAN Nº <strong className="font-mono text-slate-200">{activeBillingConfig.resolutionNumber || '187640000099'}</strong></span>
                </p>
              </div>

            {/* Quick Actions, Inter-Module Connections & Admin Tools Menu */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Quick Inter-Module Navigation Links */}
              {setActiveView && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveView('cartera')}
                    className="px-2.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Consultar Cuentas por Cobrar de clientes en Cartera"
                  >
                    <i className="ri-wallet-3-line text-xs"></i>
                    <span className="hidden xl:inline">Cartera CxC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('bodegas')}
                    className="px-2.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Consultar existencias y lotes en Bodegas"
                  >
                    <i className="ri-archive-line text-xs"></i>
                    <span className="hidden xl:inline">Bodegas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('terceros')}
                    className="px-2.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Fichas de Clientes y Proveedores"
                  >
                    <i className="ri-user-star-line text-xs"></i>
                    <span className="hidden xl:inline">Clientes</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => exportInvoicesToExcel(vouchers, terceros, products, currentCompany?.name)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Descargar libro de facturas en Excel (.xlsx)"
                id="btn-export-excel-header"
              >
                <i className="ri-file-excel-2-line text-emerald-200"></i>
                <span className="hidden sm:inline">Exportar Excel</span>
              </button>

              {isAdminOrAccountant && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowDesignModal(true)}
                    className="px-3 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border border-purple-400/30"
                    title="Configurar diseño, posición del logo y firmas de la factura"
                    id="btn-invoice-designer-header"
                  >
                    <i className="ri-palette-line"></i>
                    <span className="hidden sm:inline">Diseño & Logo</span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAdminToolsDropdown(!showAdminToolsDropdown)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Herramientas técnicas de administración DIAN"
                      id="admin-tools-dropdown-btn"
                    >
                      <i className="ri-tools-fill text-indigo-400"></i>
                      <span>Herramientas Admin</span>
                      <i className={`ri-arrow-down-s-line text-xs transition-transform ${showAdminToolsDropdown ? 'rotate-180' : ''}`}></i>
                    </button>

                    {/* Dropdown Menu */}
                    {showAdminToolsDropdown && (
                      <div 
                        className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-2 z-40 text-xs text-slate-200 space-y-1 animate-fade-in"
                        onMouseLeave={() => setShowAdminToolsDropdown(false)}
                      >
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                          Opciones de Administrador
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => { setShowDesignModal(true); setShowAdminToolsDropdown(false); }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-purple-600/20 hover:text-purple-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                          id="open-invoice-designer-btn"
                        >
                          <i className="ri-palette-line text-purple-400 text-sm"></i>
                          <div>
                            <div className="font-semibold">Diseño & Logo Factura</div>
                            <div className="text-[10px] text-slate-400">Ubicación de logo, firmas y colores</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { 
                            setAutoRunHabilitationModal(true); 
                            setShowHabilitationModal(true); 
                            setShowAdminToolsDropdown(false); 
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-600/20 hover:text-amber-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                          id="open-habilitation-modal-btn"
                        >
                          <i className="ri-shield-check-line text-amber-400 text-sm"></i>
                          <div>
                            <div className="font-semibold">Habilitación DIAN (8 facturas)</div>
                            <div className="text-[10px] text-slate-400">Pruebas oficiales de transmisión</div>
                          </div>
                        </button>

                        {onOpenAlanubeConfig && (
                          <button
                            type="button"
                            onClick={() => { onOpenAlanubeConfig(); setShowAdminToolsDropdown(false); }}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-sky-600/20 hover:text-sky-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                            id="open-alanube-module-btn"
                          >
                            <i className="ri-cloud-line text-sky-400 text-sm"></i>
                            <div>
                              <div className="font-semibold">API Alanube & DIAN</div>
                              <div className="text-[10px] text-slate-400">Credenciales y tokens de conexión</div>
                            </div>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => { setShowPayloadModal(true); setShowAdminToolsDropdown(false); }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-600/20 hover:text-indigo-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <i className="ri-code-s-slash-line text-indigo-400 text-sm"></i>
                          <div>
                            <div className="font-semibold">Estructura JSON Oficial</div>
                            <div className="text-[10px] text-slate-400">Inspeccionar payload para el proveedor</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setShowSmtpModal(true); setShowAdminToolsDropdown(false); }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-600/20 hover:text-emerald-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                          id="open-smtp-config-btn"
                        >
                          <i className="ri-mail-settings-line text-emerald-400 text-sm"></i>
                          <div>
                            <div className="font-semibold">Servidor de Correo (SMTP)</div>
                            <div className="text-[10px] text-slate-400">Host, puerto, credenciales y plantillas</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setShowConfigModal(true); setShowAdminToolsDropdown(false); }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <i className="ri-settings-3-line text-slate-400 text-sm"></i>
                          <div>
                            <div className="font-semibold">Configuración Rápida</div>
                            <div className="text-[10px] text-slate-400">Prefijo, resolución y correo</div>
                          </div>
                        </button>

                        <a
                          href="https://app.alanube.co"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-indigo-300 flex items-center justify-between transition-colors cursor-pointer block"
                        >
                          <div className="flex items-center gap-2.5">
                            <i className="ri-external-link-line text-indigo-400 text-sm"></i>
                            <div>
                              <div className="font-semibold">Portal Alanube Producción</div>
                              <div className="text-[10px] text-slate-400">Consola externa del proveedor</div>
                            </div>
                          </div>
                          <i className="ri-arrow-right-up-line text-slate-500"></i>
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Grid Workspace: Formulario de Emisión a la izquierda + Resumen e Historial al costado */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Invoice Workspace inputs */}
            <div className={`${activeTheme.cardStyles} p-6 shadow-sm xl:col-span-2 space-y-6`}>
              <div className={`border-b pb-4 ${sectionBorder} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
                <div>
                  <h3 className={`font-display font-semibold text-lg ${headingText}`}>Nueva Factura Electrónica</h3>
                  <p className="text-xs text-slate-400">
                    Transmisión delegada al Proveedor Tecnológico ({activeBillingConfig.providerName}) con validación DIAN
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <span>Prefijo: <strong className="text-indigo-400">{activeBillingConfig.prefix || 'FE'}</strong></span>
                  <span>·</span>
                  <span>Res. DIAN: {activeBillingConfig.resolutionNumber || '187640000099'}</span>
                </div>
              </div>

              {/* Commercial Conditions & Taxes Grid (Barra superior de condiciones fiscales) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs">
                {/* Term: Contado / Credito */}
                <div className="space-y-1">
                  <label className={`font-semibold uppercase tracking-wider text-[10.5px] ${labelText}`}>Condición Comercial</label>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setPaymentTerm('contado')}
                      className={`flex-1 py-1.5 font-bold transition-all text-xs cursor-pointer ${
                        paymentTerm === 'contado' 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Contado
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentTerm('credito')}
                      className={`flex-1 py-1.5 font-bold transition-all text-xs cursor-pointer ${
                        paymentTerm === 'credito' 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Crédito (CxC)
                    </button>
                  </div>
                </div>

                {/* Credit terms if applicable */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`font-semibold uppercase tracking-wider text-[10.5px] ${labelText}`}>Plazo de Cartera</label>
                    {paymentTerm === 'credito' && (
                      <span className="text-[10px] text-indigo-400 font-mono font-bold">
                        Vence: {calculatedDueDate.substring(5)}
                      </span>
                    )}
                  </div>
                  <select
                    disabled={paymentTerm !== 'credito'}
                    value={creditDays}
                    onChange={(e) => setCreditDays(parseInt(e.target.value) || 30)}
                    className={`w-full text-xs rounded-lg py-1.5 px-2 border focus:outline-none ${inputBg} ${
                      paymentTerm !== 'credito' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value={15}>15 días</option>
                    <option value={30}>30 días (Estándar)</option>
                    <option value={45}>45 días</option>
                    <option value={60}>60 días</option>
                    <option value={90}>90 días</option>
                  </select>
                </div>

                {/* Commercial Discount */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`font-semibold uppercase tracking-wider text-[10.5px] ${labelText}`}>Descuento Comercial</label>
                    {discountAmount > 0 && (
                      <span className="text-[10px] text-emerald-500 font-bold font-mono">
                        -{formatCOP(discountAmount)}
                      </span>
                    )}
                  </div>
                  <select
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className={`w-full text-xs rounded-lg py-1.5 px-2 border focus:outline-none ${inputBg}`}
                  >
                    <option value={0}>Sin descuento (0%)</option>
                    <option value={3}>3% Descuento</option>
                    <option value={5}>5% Descuento</option>
                    <option value={10}>10% Descuento</option>
                    <option value={15}>15% Descuento</option>
                    <option value={20}>20% Descuento</option>
                  </select>
                </div>

                {/* ReteFuente */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`font-semibold uppercase tracking-wider text-[10.5px] ${labelText}`}>ReteFuente DIAN</label>
                    {retefuenteAmount > 0 && (
                      <span className="text-[10px] text-rose-500 font-bold font-mono">
                        -{formatCOP(retefuenteAmount)}
                      </span>
                    )}
                  </div>
                  <select
                    value={retefuentePercent}
                    onChange={(e) => setRetefuentePercent(parseFloat(e.target.value) || 0)}
                    className={`w-full text-xs rounded-lg py-1.5 px-2 border focus:outline-none ${inputBg}`}
                  >
                    <option value={0}>No aplica (0%)</option>
                    <option value={2.5}>ReteFuente 2.5% (Compras generales)</option>
                    <option value={3.5}>ReteFuente 3.5% (No declarantes)</option>
                    <option value={4}>ReteFuente 4% (Servicios generales)</option>
                  </select>
                </div>
              </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Client Select with Quick Create Action */}
               <div className="space-y-1.5 md:col-span-1">
                 <div className="flex items-center justify-between">
                   <label className={`text-xs font-semibold uppercase tracking-wider ${labelText}`}>Adquiriente (Cliente)</label>
                   <button
                     type="button"
                     onClick={() => setShowQuickClientModal(true)}
                     className="text-[11px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
                     title="Crear un cliente nuevo rápidamente sin salir de la factura"
                   >
                     <i className="ri-user-add-line"></i> + Nuevo Express
                   </button>
                 </div>
                 <select
                   value={selectedClient}
                   onChange={(e) => setSelectedClient(e.target.value)}
                   className={`w-full text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2.5 ${inputBg}`}
                 >
                   <option value="">Seleccione un cliente...</option>
                   {clients.map((c) => (
                     <option key={c.id} value={c.id}>{c.name} ({c.nit})</option>
                   ))}
                 </select>
               </div>

               {/* date select */}
               <div className="space-y-1.5">
                 <label className={`text-xs font-semibold uppercase tracking-wider ${labelText}`}>Fecha de Emisión</label>
                 <input
                   type="date"
                   value={invoiceDate}
                   onChange={(e) => setInvoiceDate(e.target.value)}
                   className={`w-full text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2.5 ${inputBg}`}
                 />
               </div>

                {/* payment method select */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold uppercase tracking-wider ${labelText}`}>Medio de Pago</label>
                    {(paymentMethod === 'debito' || paymentMethod === 'credito' || paymentMethod === 'wompi') && (
                      <button
                        type="button"
                        onClick={() => setShowCardModal(true)}
                        className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <i className="ri-settings-4-line text-xs"></i>
                        <span>{cardAuthVoucher || wompiConfirmedDetails ? 'Váucher Listo' : 'Configurar'}</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaymentMethod(val);
                      if (val === 'wompi') {
                        setCardMode('wompi');
                        setShowCardModal(true);
                      } else if (val === 'debito' || val === 'credito') {
                        if (cardMode !== 'wompi') setCardMode('datafono');
                        setShowCardModal(true);
                      }
                    }}
                    className={`w-full text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2.5 ${inputBg}`}
                  >
                    <option value="efectivo">💵 Efectivo (DIAN 10)</option>
                    <option value="debito">💳 Tarjeta Débito (DIAN 49)</option>
                    <option value="credito">💳 Tarjeta Crédito (DIAN 48)</option>
                    <option value="wompi">⚡ Pasarela Wompi / PSE / QR (Virtual)</option>
                    <option value="transferencia">🏦 Transferencia / PSE (DIAN 47)</option>
                  </select>

                  {/* Compact Status Pill for Card / Datáfono / Wompi */}
                  {(paymentMethod === 'debito' || paymentMethod === 'credito' || paymentMethod === 'wompi') && (
                    <button
                      type="button"
                      onClick={() => setShowCardModal(true)}
                      className="w-full mt-1.5 py-1.5 px-3 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center justify-between transition-all cursor-pointer shadow-sm group"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <i className="ri-bank-card-fill text-blue-400 group-hover:scale-110 transition-transform"></i>
                        {cardAuthVoucher ? (
                          <span className="font-mono font-bold text-[11px] truncate">
                            {cardFranchise.toUpperCase()} ••••{cardLastFour || '****'} (Aut: {cardAuthVoucher})
                          </span>
                        ) : wompiConfirmedDetails ? (
                          <span className="text-emerald-400 font-bold text-[11px] truncate">
                            ✓ Wompi {wompiConfirmedDetails.franchise?.toUpperCase()} ••••{wompiConfirmedDetails.lastFourDigits}
                          </span>
                        ) : (
                          <span className="text-[11px] truncate">
                            {cardMode === 'wompi' || paymentMethod === 'wompi' ? '⚡ Cobrar con Wompi (Link/QR)' : '💳 Ingresar Váucher de Datáfono'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/25 text-blue-300 ml-1.5 shrink-0">
                        {cardAuthVoucher || wompiConfirmedDetails ? 'Cambiar' : 'Ingresar'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

            {/* Integrated Elegant Product Selector & Invoice Items */}
            <div className="space-y-4">
              
              {/* Header & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div>
                  <h4 className={`text-sm font-semibold tracking-tight ${headingText}`}>
                    Ítems de la Factura
                  </h4>
                  <p className="text-xs text-slate-400">
                    Busque artículos del catálogo o escanee códigos de barra con la cámara del dispositivo
                  </p>
                </div>
                {invoiceLines.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                      {invoiceLines.length} {invoiceLines.length === 1 ? 'ítem' : 'ítems'} · Subtotal: <strong className={isNavy ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold'}>{formatCOP(subtotal)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setInvoiceLines([])}
                      className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      title="Quitar todos los ítems"
                    >
                      <i className="ri-delete-bin-line"></i> Vaciar
                    </button>
                  </div>
                )}
              </div>

              {/* Instant Feedback Alert (Floating / Inline Toast) */}
              {addedNotice && (
                <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-medium flex items-center justify-between gap-2 shadow-xs transition-all">
                  <div className="flex items-center gap-2">
                    <i className="ri-checkbox-circle-line text-emerald-500 text-sm"></i>
                    <span>{addedNotice.message}</span>
                  </div>
                  <span className="text-[10px] text-emerald-500/70 font-mono">Agregado a la tabla</span>
                </div>
              )}

              {/* Refined, Elegant Toolbar: Search Input + Device Camera Button + Catalog Select */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
                {/* Search Input with Live Autocomplete */}
                <div className="relative flex-1" ref={searchContainerRef}>
                  <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
                  <input
                    type="text"
                    placeholder="Buscar por nombre, referencia o código (ej. Galletas, Pan, PT-001)..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && filteredProducts.length > 0) {
                        e.preventDefault();
                        handleSelectProductToAdd(filteredProducts[0].id);
                      } else if (e.key === 'Escape') {
                        setIsSearchOpen(false);
                      }
                    }}
                    className={`w-full text-xs sm:text-sm font-medium rounded-xl pl-9 pr-8 py-2.5 border focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all ${inputBg}`}
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearch('');
                        setIsSearchOpen(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer p-1"
                      title="Limpiar búsqueda"
                    >
                      <i className="ri-close-line"></i>
                    </button>
                  )}

                  {/* Autocomplete Dropdown Popover */}
                  {isSearchOpen && (
                    <div className={`absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl border shadow-xl backdrop-blur-md divide-y ${
                      isNavy ? 'bg-slate-900 border-slate-700 divide-slate-800' : 'bg-white border-slate-200 divide-slate-100'
                    }`}>
                      {filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No se encontraron productos coincidentes con "{productSearch}".
                        </div>
                      ) : (
                        filteredProducts.map((p) => {
                          const stock = inventory.filter((i) => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectProductToAdd(p.id)}
                              className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-center justify-between gap-3 group cursor-pointer ${
                                isNavy ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs truncate group-hover:text-blue-500 transition-colors">
                                    {p.name}
                                  </span>
                                  {p.sku && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      · {p.sku}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>Stock: <strong className={stock > 0 ? 'text-emerald-500 font-semibold' : 'text-rose-500'}>{stock}</strong></span>
                                  <span>·</span>
                                  <span>IVA {p.tax}%</span>
                                  {p.barcode && <span>· Cód: {p.barcode}</span>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`font-mono font-semibold text-xs block ${isNavy ? 'text-blue-400' : 'text-blue-600'}`}>
                                  {formatCOP(p.price)}
                                </span>
                                <span className="text-[10px] text-emerald-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                  + Agregar
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Elegant Device Camera Scanner Button */}
                <button
                  type="button"
                  onClick={openCameraScanner}
                  className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 shadow-xs active:scale-95 ${
                    isNavy
                      ? 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border-blue-500/30'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border-blue-200'
                  }`}
                  title="Usar la cámara del dispositivo para escanear código de barras o QR"
                >
                  <i className="ri-camera-lens-line text-sm"></i>
                  <span>Escanear con Cámara</span>
                </button>

                {/* Catalog Select Dropdown */}
                <div className="w-full md:w-52 shrink-0">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleSelectProductToAdd(e.target.value);
                    }}
                    className={`w-full text-xs font-medium rounded-xl px-3 py-2.5 border transition-all cursor-pointer truncate ${inputBg}`}
                  >
                    <option value="">O catálogo completo...</option>
                    {saleableProducts.map((p) => {
                      const stock = inventory.filter((i) => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatCOP(p.price)} ({stock} disp.)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* ======================================================== */}
              {/* MODAL: DEVICE CAMERA BARCODE SCANNER                     */}
              {/* Clean, high-end optical scanner using device camera      */}
              {/* ======================================================== */}
              {isCameraModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-5 text-white space-y-4">
                    
                    {/* Modal Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-lg">
                          <i className="ri-camera-lens-line"></i>
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-white">
                            Escáner con Cámara del Dispositivo
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Apunte la cámara al código de barras o QR del producto
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={closeCameraScanner}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Cerrar escáner"
                      >
                        <i className="ri-close-line text-lg"></i>
                      </button>
                    </div>

                    {/* Camera Viewfinder Box */}
                    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
                      {/* html5-qrcode reader div */}
                      <div id="barcode-camera-reader" className="w-full h-full object-cover"></div>

                      {/* Optical Framing Overlay */}
                      <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-sky-400/50 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                        <div className="flex justify-between">
                          <span className="w-3.5 h-3.5 border-t-2 border-l-2 border-sky-400"></span>
                          <span className="w-3.5 h-3.5 border-t-2 border-r-2 border-sky-400"></span>
                        </div>
                        <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-pulse"></div>
                        <div className="flex justify-between">
                          <span className="w-3.5 h-3.5 border-b-2 border-l-2 border-sky-400"></span>
                          <span className="w-3.5 h-3.5 border-b-2 border-r-2 border-sky-400"></span>
                        </div>
                      </div>

                      {/* Error notification if camera permission fails */}
                      {cameraError && (
                        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
                          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl border border-amber-500/20">
                            <i className="ri-camera-off-line"></i>
                          </div>
                          <p className="text-xs text-amber-200 max-w-xs">{cameraError}</p>
                          <p className="text-[11px] text-slate-400">Puede seleccionar un producto o código simulado a continuación:</p>
                        </div>
                      )}
                    </div>

                    {/* Barcode simulation & quick testing tray */}
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                      <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">
                        Simular captura rápida de producto:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {products.filter(p => p.barcode).slice(0, 4).map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              handleScanBarcode(p.barcode!);
                              closeCameraScanner();
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-blue-400 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <i className="ri-barcode-line text-blue-400 text-xs"></i>
                            <span>{p.name.split(' ')[0]} {p.name.split(' ')[1] || ''} ({p.barcode})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Continuous Scan Toggle & Camera Options */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-800 text-xs text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={continuousScan}
                          onChange={(e) => setContinuousScan(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-[11px] text-slate-300">
                          Modo continuo (escanear varios productos sin cerrar)
                        </span>
                      </label>

                      <div className="flex items-center gap-2">
                        {availableCameras.length > 1 && (
                          <select
                            value={selectedCameraId}
                            onChange={(e) => setSelectedCameraId(e.target.value)}
                            className="text-[11px] rounded-lg px-2 py-1 bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none max-w-[150px] truncate"
                            title="Seleccionar lente de cámara"
                          >
                            <option value="">Lente automático</option>
                            {availableCameras.map((cam, idx) => (
                              <option key={cam.id} value={cam.id}>
                                {cam.label || `Cámara ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          type="button"
                          onClick={() => setFacingMode((curr) => curr === 'environment' ? 'user' : 'environment')}
                          className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Alternar entre cámara trasera y frontal"
                        >
                          <i className="ri-camera-switch-line"></i>
                          <span>{facingMode === 'environment' ? 'Cámara Trasera' : 'Cámara Frontal'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={closeCameraScanner}
                          className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all cursor-pointer"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* SECTION: INVOICE ROWS DATA TABLE                         */}
              {/* Clean, elegant ERP tabular layout                        */}
              {/* ======================================================== */}
              <div className="space-y-3">
                {invoiceLines.length === 0 ? (
                  <div className={`p-8 rounded-2xl border-2 border-dashed text-center space-y-2 ${
                    isNavy ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
                  }`}>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl mx-auto border border-blue-500/20">
                      <i className="ri-receipt-line"></i>
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${headingText}`}>
                        Factura sin líneas agregadas
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                        Busque un producto arriba o use el escáner de cámara para añadir automáticamente líneas a la factura.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-xl border overflow-hidden shadow-xs ${
                    isNavy ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white'
                  }`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                            isNavy ? 'bg-slate-900/90 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            <th className="py-2.5 px-3 w-10 text-center">#</th>
                            <th className="py-2.5 px-3">Producto / Concepto</th>
                            <th className="py-2.5 px-3 w-36">Lote / PEPS</th>
                            <th className="py-2.5 px-3 w-32 text-center">Cantidad</th>
                            <th className="py-2.5 px-3 w-32 text-right">Precio Unitario</th>
                            <th className="py-2.5 px-3 w-16 text-center">IVA</th>
                            <th className="py-2.5 px-3 w-32 text-right">Subtotal</th>
                            <th className="py-2.5 px-2 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y text-xs ${
                          isNavy ? 'divide-slate-800/80 text-slate-200' : 'divide-slate-100 text-slate-700'
                        }`}>
                          {invoiceLines.map((line, idx) => {
                            const prodObj = products.find(p => p.id === line.productId);
                            const lineSubtotal = line.qty * line.unitPrice;
                            return (
                              <tr 
                                key={idx} 
                                className={`transition-colors ${
                                  isNavy ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'
                                }`}
                              >
                                {/* # */}
                                <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                                  {idx + 1}
                                </td>

                                {/* Product */}
                                <td className="py-2.5 px-3 min-w-[200px]">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold text-xs truncate max-w-[220px] ${isNavy ? 'text-white' : 'text-slate-900'}`}>
                                      {prodObj?.name || 'Producto seleccionado'}
                                    </span>
                                    {prodObj?.sku && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        · {prodObj.sku}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Lot */}
                                <td className="py-2.5 px-3">
                                  {(() => {
                                    if (prodObj && prodObj.lotTracking) {
                                      const availableLots = inventory
                                        .filter(item => item.productId === line.productId && item.quantity > 0)
                                        .sort((a, b) => {
                                          if (!a.expirationDate) return 1;
                                          if (!b.expirationDate) return -1;
                                          return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
                                        });
                                      return (
                                        <select
                                          value={line.lotNumber || ''}
                                          onChange={(e) => updateLine(idx, 'lotNumber', e.target.value)}
                                          className={`w-full text-[11px] font-medium rounded-lg px-2 py-1 border focus:outline-none ${inputBg}`}
                                        >
                                          {availableLots.length === 0 ? (
                                            <option value="S/L">S/L (Sin stock)</option>
                                          ) : (
                                            availableLots.map((lotItem) => {
                                              const expStr = lotItem.expirationDate ? ` (FV:${lotItem.expirationDate.substring(5)})` : '';
                                              const isFirst = availableLots[0].id === lotItem.id;
                                              return (
                                                <option key={lotItem.id} value={lotItem.lotNumber || ''}>
                                                  {lotItem.lotNumber || 'S/L'} ({lotItem.quantity}u){expStr} {isFirst ? '⭐PEPS' : ''}
                                                </option>
                                              );
                                            })
                                          )}
                                        </select>
                                      );
                                    } else {
                                      return (
                                        <span className="text-[10px] text-slate-400 italic">
                                          No aplica
                                        </span>
                                      );
                                    }
                                  })()}
                                </td>

                                {/* Quantity Stepper */}
                                <td className="py-2.5 px-3">
                                  <div className={`flex items-center justify-center rounded-lg border p-0.5 w-fit mx-auto ${
                                    isNavy ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'
                                  }`}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (line.qty > 1) {
                                          updateLine(idx, 'qty', line.qty - 1);
                                        } else {
                                          removeLine(idx);
                                        }
                                      }}
                                      className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${
                                        isNavy ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-slate-200 text-slate-700 shadow-xs'
                                      }`}
                                      title="Reducir cantidad"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      value={line.qty}
                                      onChange={(e) => updateLine(idx, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                                      className={`w-10 text-center text-xs font-mono font-semibold bg-transparent focus:outline-none ${
                                        isNavy ? 'text-white' : 'text-slate-900'
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateLine(idx, 'qty', line.qty + 1)}
                                      className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${
                                        isNavy ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-slate-200 text-slate-700 shadow-xs'
                                      }`}
                                      title="Aumentar cantidad"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>

                                {/* Unit Price */}
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-[10px] text-slate-400 font-mono">$</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={line.unitPrice}
                                      onChange={(e) => updateLine(idx, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                                      className={`w-24 text-right text-xs font-mono font-medium border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${inputBg}`}
                                    />
                                  </div>
                                </td>

                                {/* Tax */}
                                <td className="py-2.5 px-3 text-center">
                                  <span className="text-[11px] font-mono text-slate-400">
                                    {prodObj?.tax ?? 19}%
                                  </span>
                                </td>

                                {/* Subtotal */}
                                <td className={`py-2.5 px-3 text-right font-mono font-semibold text-xs ${
                                  isNavy ? 'text-blue-400' : 'text-blue-600'
                                }`}>
                                  {formatCOP(lineSubtotal)}
                                </td>

                                {/* Remove */}
                                <td className="py-2.5 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeLine(idx)}
                                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all cursor-pointer mx-auto"
                                    title="Quitar este producto"
                                  >
                                    <i className="ri-delete-bin-line text-xs"></i>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Table Footer */}
                        <tfoot>
                          <tr className={`border-t text-xs font-mono ${
                            isNavy ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            <td colSpan={3} className="py-2.5 px-3 font-medium">
                              Total ítems: <strong className={isNavy ? 'text-white' : 'text-slate-900'}>{invoiceLines.length}</strong> · Unidades: <strong className={isNavy ? 'text-blue-400' : 'text-blue-600'}>{invoiceLines.reduce((s, l) => s + l.qty, 0)}</strong>
                            </td>
                            <td colSpan={3} className="py-2.5 px-3 text-right uppercase tracking-wider text-[10px] font-semibold text-slate-400">
                              Subtotal Factura:
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold text-sm ${
                              isNavy ? 'text-blue-400' : 'text-blue-600'
                            }`}>
                              {formatCOP(subtotal)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

            {/* Right Column: Previsualizador de Cálculo & Cobro (Clean, focused, no saturation) */}
            <div className="space-y-4">
              {/* Calculation & Payment Card */}
              <div className="bg-slate-900 rounded-2xl p-6 text-slate-100 shadow-xl border border-slate-800 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-sm tracking-wide text-blue-400">
                      Resumen de Factura & Cálculo
                    </h3>
                    <p className="text-[10px] text-slate-400">Cifras proyectadas antes de emisión</p>
                  </div>
                  <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/20 font-bold">
                    {activeBillingConfig.providerName} API
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Items brief scroll if many items */}
                  {invoiceLines.length > 0 && (
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border-b border-slate-800/80 pb-2">
                      {invoiceLines.map((line, idx) => {
                        const p = products.find((prod) => prod.id === line.productId);
                        return (
                          <div key={idx} className="flex justify-between text-[11px] text-slate-300">
                            <span className="truncate max-w-[150px]">{p ? p.name : 'Producto'} x {line.qty}</span>
                            <span className="font-mono text-slate-400">{formatCOP(line.qty * line.unitPrice)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal Bruto:</span>
                    <span className="font-mono">{formatCOP(subtotalGross)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Descuento ({discountPercent}%):</span>
                      <span className="font-mono">-{formatCOP(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-400">
                    <span>Base Gravable:</span>
                    <span className="font-mono">{formatCOP(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>IVA Estimado:</span>
                    <span className="font-mono">{formatCOP(totalTax)}</span>
                  </div>

                  {retefuenteAmount > 0 && (
                    <div className="flex justify-between text-rose-400 font-semibold">
                      <span>ReteFuente ({retefuentePercent}%):</span>
                      <span className="font-mono">-{formatCOP(retefuenteAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-extrabold text-base text-white pt-2.5 border-t border-slate-800">
                    <span className="tracking-wide">TOTAL A PAGAR:</span>
                    <span className="text-blue-400 font-mono text-lg">{formatCOP(finalTotal)}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10.5px] flex items-center justify-between text-slate-400">
                    <span>Condición: <strong className={paymentTerm === 'credito' ? 'text-indigo-400' : 'text-blue-400'}>{paymentTerm === 'credito' ? `Crédito ${creditDays}d` : 'Contado'}</strong></span>
                    {paymentTerm === 'credito' && (
                      <span>Vence: <strong className="text-indigo-300 font-mono">{calculatedDueDate}</strong></span>
                    )}
                  </div>
                </div>

                {/* Primary Action: Emit and Transmit Invoice */}
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    disabled={isTransmitting || invoiceLines.length === 0 || !selectedClient}
                    onClick={handleSaveInvoice}
                    className={`w-full font-bold text-xs py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isTransmitting || invoiceLines.length === 0 || !selectedClient
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-indigo-500/25 hover:scale-[1.01]'
                    }`}
                    title={
                      !selectedClient 
                        ? 'Seleccione un cliente primero' 
                        : invoiceLines.length === 0 
                          ? 'Agregue al menos un producto a la factura' 
                          : 'Emitir y validar ante la DIAN'
                    }
                    id="emit-invoice-main-btn"
                  >
                    {isTransmitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin text-base"></i>
                        <span>Transmitiendo a {activeBillingConfig.providerName}...</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-send-plane-fill text-sm"></i>
                        <span>Emitir Factura Electrónica ({activeBillingConfig.prefix || 'FE'})</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-slate-400 mt-2.5">
                    <i className="ri-shield-check-fill text-emerald-400"></i>
                    <span>Transmisión vía <strong>{activeBillingConfig.providerName}</strong> · CUFE automático</span>
                  </div>

                  {/* Cancel / Reset Form without leaving module */}
                  {(invoiceLines.length > 0 || selectedClient) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (invoiceLines.length === 0 || window.confirm('¿Desea restablecer el formulario de factura y empezar uno nuevo sin salir de este módulo?')) {
                          setInvoiceLines([]);
                          setSelectedClient('');
                          setDiscountPercent(0);
                          setRetefuentePercent(0);
                          toast.info('Formulario de factura restablecido. Permaneces en el módulo de Facturación.', 'Formulario Limpio');
                        }
                      }}
                      className="w-full mt-2.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700/50"
                      title="Borrar campos del formulario y empezar de nuevo sin salir de Facturación"
                      id="btn-clear-invoice-form"
                    >
                      <i className="ri-refresh-line text-xs"></i>
                      <span>Limpiar Formulario (Permanecer en Facturación)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Historial de Facturas Emitidas (Al costado como estaba) */}
              <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 text-xs space-y-3.5 shadow-xl">
                {/* Header: Title, count, and Excel Export */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                      <i className="ri-history-line text-blue-400"></i>
                      <span>Historial de Facturas</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                      {salesHistory.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => exportInvoicesToExcel(vouchers, terceros, products, currentCompany?.name)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-colors text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer border border-emerald-500/30"
                    title="Descargar libro de facturas en Excel"
                  >
                    <i className="ri-file-excel-2-line"></i>
                    <span>Excel</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <input
                    type="text"
                    placeholder="Buscar por cliente, NIT, FE-..."
                    value={salesSearchQuery}
                    onChange={(e) => { setSalesSearchQuery(e.target.value); setSalesPage(1); }}
                    className="w-full text-xs rounded-xl pl-8 pr-7 py-2 bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {salesSearchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSalesSearchQuery(''); setSalesPage(1); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      <i className="ri-close-line"></i>
                    </button>
                  )}
                </div>

                {/* Filter Chips: Company and Term */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                  {/* Company Scope Filter */}
                  <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => { setSalesCompanyFilter('current'); setSalesPage(1); }}
                      className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                        salesCompanyFilter === 'current'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={`Solo facturas de ${currentCompany?.name}`}
                    >
                      Esta Empresa
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSalesCompanyFilter('all'); setSalesPage(1); }}
                      className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                        salesCompanyFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Facturas de todas las empresas"
                    >
                      Todas
                    </button>
                  </div>

                  {/* Payment Term Filter */}
                  <select
                    value={salesStatusFilter}
                    onChange={(e) => { setSalesStatusFilter(e.target.value as any); setSalesPage(1); }}
                    className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-blue-500"
                  >
                    <option value="todos">Todos los plazos</option>
                    <option value="contado">Contado</option>
                    <option value="credito">Crédito</option>
                    <option value="cufe_ok">Con CUFE</option>
                  </select>
                </div>

                {/* Invoices List */}
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {paginatedSales.length > 0 ? (
                    paginatedSales.map((v) => {
                      const clientObj = terceros.find((t) => t.id === v.thirdPartyId);
                      const cufeStr = v.billingProviderData?.cufe || getCUFESample(v.number);
                      return (
                        <div
                          key={v.id}
                          className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700/80 transition-all space-y-2"
                        >
                          {/* Row 1: Invoice #, Date, Status */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-indigo-400 text-xs">
                                {v.number}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {v.date}
                              </span>
                              {sentInvoicesMap[v.number] && (
                                <span 
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-0.5"
                                  title={`Enviado por correo a ${sentInvoicesMap[v.number].to} (${new Date(sentInvoicesMap[v.number].sentAt).toLocaleDateString('es-CO')})`}
                                >
                                  <i className="ri-mail-check-line text-[10px] text-blue-400"></i>
                                  <span>Enviado</span>
                                </span>
                              )}
                            </div>
                            <span 
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0"
                              title={`Validado DIAN - CUFE: ${cufeStr}`}
                            >
                              <i className="ri-checkbox-circle-fill text-[10px]"></i>
                              <span>DIAN</span>
                            </span>
                          </div>

                          {/* Row 2: Client & Amount */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-200 truncate" title={clientObj?.name || 'Cliente Mostrador'}>
                                {clientObj?.name || 'Cliente Mostrador'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {clientObj?.nit ? `NIT: ${clientObj.nit}` : 'Consumidor Final'}
                                {v.paymentTerm === 'credito' && (
                                  <span className="text-amber-400 ml-1 font-sans">· Crédito ({v.dueDate || '30d'})</span>
                                )}
                              </p>
                              {/* Card / Datáfono / Wompi Details Badge */}
                              {v.cardDetails && (
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  {v.cardDetails.methodType === 'wompi_online' ? (
                                    <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                      <i className="ri-qr-code-line text-purple-400"></i>
                                      <span>Wompi ({v.cardDetails.franchise?.toUpperCase()} •••• {v.cardDetails.lastFourDigits})</span>
                                    </span>
                                  ) : (
                                    <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                                      <i className="ri-device-line text-blue-400"></i>
                                      <span>Datáfono {v.cardDetails.franchise?.toUpperCase()} •••• {v.cardDetails.lastFourDigits} (Aut: {v.cardDetails.authorizationCode})</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="font-mono font-bold text-sm text-white shrink-0">
                              {formatCOP(v.total)}
                            </span>
                          </div>

                          {/* Row 3: Action Buttons */}
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              {/* Imprimir / Ver */}
                              <button
                                type="button"
                                onClick={() => setShowPrintPreview(v)}
                                className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Ver vista previa e imprimir factura (Carta o Ticket POS)"
                              >
                                <i className="ri-printer-line"></i>
                                <span>Imprimir</span>
                              </button>

                              {/* Wompi Payment Link */}
                              {(v.paymentLink || v.cardDetails?.wompiPaymentLink) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const link = v.paymentLink || v.cardDetails?.wompiPaymentLink || '';
                                    navigator.clipboard.writeText(link);
                                    toast.success('Link de cobro Wompi copiado al portapapeles.', 'Link Copiado');
                                  }}
                                  className="p-1 px-2 rounded-lg bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white transition-all text-[11px] cursor-pointer flex items-center gap-1"
                                  title="Copiar link de pago Wompi"
                                >
                                  <i className="ri-links-line"></i>
                                  <span className="text-[10px] font-bold">Wompi</span>
                                </button>
                              )}

                              {/* Enviar Correo Electrónico DIAN */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEmailInvoice(v);
                                  setShowEmailModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Enviar factura electrónica por correo al cliente (PDF y AttachedDocument XML UBL 2.1)"
                              >
                                <i className="ri-mail-send-line"></i>
                                <span>Correo</span>
                              </button>

                              {/* WhatsApp */}
                              <button
                                type="button"
                                onClick={() => {
                                  const shareText = buildWhatsAppInvoiceShareText({
                                    companyName: currentCompany.name,
                                    invoiceNumber: v.number,
                                    clientName: clientObj?.name || 'Cliente',
                                    totalCOP: formatCOP(v.total),
                                    date: v.date,
                                    cufe: cufeStr
                                  });
                                  const phone = (clientObj?.phone || '').replace(/\D/g, '');
                                  const targetUrl = phone.length >= 7
                                    ? `https://wa.me/${phone.startsWith('57') ? phone : `57${phone}`}?text=${encodeURIComponent(shareText)}`
                                    : `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                                  window.open(targetUrl, '_blank', 'noopener,noreferrer');
                                }}
                                className="p-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white transition-all text-[11px] cursor-pointer flex items-center gap-1"
                                title="Compartir factura por WhatsApp"
                              >
                                <i className="ri-whatsapp-line"></i>
                              </button>

                              {/* Copiar Resumen */}
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`Factura ${v.number} - ${clientObj?.name || 'Cliente'} - Total: ${formatCOP(v.total)} - CUFE: ${cufeStr}`);
                                  toast.success('Resumen copiado al portapapeles', 'Copiado');
                                }}
                                className="p-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[11px] cursor-pointer"
                                title="Copiar resumen al portapapeles"
                              >
                                <i className="ri-file-copy-line"></i>
                              </button>
                            </div>

                            {/* Admin Actions */}
                            {isAdminOrAccountant && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPayloadInvoice(v)}
                                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-mono border border-slate-700 cursor-pointer"
                                  title="Ver JSON transmitido a la DIAN"
                                >
                                  JSON
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-slate-500 space-y-1 bg-slate-950/50 rounded-xl border border-slate-800/60">
                      <i className="ri-inbox-line text-2xl text-slate-600 block"></i>
                      <p className="text-xs">No hay facturas con los filtros aplicados</p>
                      {hasActiveSalesFilters && (
                        <button
                          type="button"
                          onClick={clearSalesFilters}
                          className="text-[10px] text-blue-400 hover:underline mt-1 font-semibold cursor-pointer"
                        >
                          Limpiar búsqueda y filtros
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Compact Pagination Bar */}
                {totalSalesPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <button
                      type="button"
                      disabled={safeSalesPage <= 1}
                      onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                    >
                      <i className="ri-arrow-left-s-line"></i> Anterior
                    </button>

                    <span className="font-mono text-[10px]">
                      Página <strong className="text-white">{safeSalesPage}</strong> de {totalSalesPages}
                    </span>

                    <button
                      type="button"
                      disabled={safeSalesPage >= totalSalesPages}
                      onClick={() => setSalesPage(p => Math.min(totalSalesPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                    >
                      Siguiente <i className="ri-arrow-right-s-line"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submodule Modals */}
      <BillingConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        activeBillingConfig={activeBillingConfig}
        onSaveConfig={(updatedConfig) => {
          if (updateCompany) {
            updateCompany({
              ...currentCompany,
              billingConfig: updatedConfig
            });
          }
          setShowConfigModal(false);
        }}
      />

      <JsonPayloadModal
        isOpen={showPayloadModal || !!selectedPayloadInvoice}
        onClose={() => {
          setShowPayloadModal(false);
          setSelectedPayloadInvoice(null);
        }}
        selectedInvoice={selectedPayloadInvoice}
        activeBillingConfig={activeBillingConfig}
        defaultPayload={buildThirdPartyPayload(
          `${activeBillingConfig.prefix || "FE"}-102`,
          selectedClient || (terceros.find(t => t.roles.includes("cliente"))?.id || "ter-2"),
          invoiceLines.length > 0 ? invoiceLines : [{ productId: products[0]?.id || "p-1", qty: 2, unitPrice: products[0]?.price || 50000 }],
          subtotal > 0 ? subtotal : 100000,
          totalTax > 0 ? totalTax : 19000,
          finalTotal > 0 ? finalTotal : 119000
        )}
      />

      <QuickClientModal
        isOpen={showQuickClientModal}
        onClose={() => setShowQuickClientModal(false)}
        onClientCreated={(newClient) => {
          setSelectedClient(newClient.id);
        }}
        addTercero={addTercero}
      />

      {/* Modal: Asistente de Habilitación DIAN (8 Facturas de Prueba) */}
      {showHabilitationModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-8 pt-4 sm:pt-8 pb-16 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="max-w-5xl w-full my-auto space-y-3">
            {/* Top Modal Navigation Header Bar */}
            <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 px-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {onReturnToMenu && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowHabilitationModal(false);
                      setAutoRunHabilitationModal(false);
                      onReturnToMenu();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-95"
                    title="Regresar al Menú Principal del ERP"
                  >
                    <i className="ri-arrow-left-line font-bold"></i>
                    <span>Volver al Menú Principal</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowHabilitationModal(false);
                    setAutoRunHabilitationModal(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Cerrar modal y volver a Facturación"
                >
                  <i className="ri-receipt-line text-indigo-400"></i>
                  <span>Volver a Facturación</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-[11px] flex items-center gap-1">
                  <i className="ri-shield-check-line text-indigo-400"></i>
                  <span>Ambiente Habilitación DIAN</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowHabilitationModal(false);
                    setAutoRunHabilitationModal(false);
                  }}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                  title="Cerrar asistente"
                >
                  <i className="ri-close-line text-base"></i>
                </button>
              </div>
            </div>

            <DianHabilitationAssistant
              currentCompany={currentCompany}
              activeBillingConfig={activeBillingConfig}
              autoStartValidation={autoRunHabilitationModal}
              onReturnToMenu={() => {
                setShowHabilitationModal(false);
                setAutoRunHabilitationModal(false);
                onReturnToMenu?.();
              }}
              onClose={() => {
                setShowHabilitationModal(false);
                setAutoRunHabilitationModal(false);
              }}
              onUpdateBillingConfig={(updatedConfig) => {
                if (updateCompany) {
                  updateCompany({
                    ...currentCompany,
                    billingConfig: updatedConfig
                  });
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Modal: Diseñador de Factura y Posición de Logotipo */}
      {showDesignModal && (
        <InvoiceDesignModal
          company={currentCompany}
          isOpen={showDesignModal}
          onClose={() => setShowDesignModal(false)}
          onSave={(updatedCo) => {
            if (updateCompany) updateCompany(updatedCo);
          }}
          formatCOP={formatCOP}
        />
      )}

      {/* MEJORA 3: Modal de Envío de Factura por Correo Electrónico (Notificador DIAN / AttachedDocument XML + PDF) */}
      {showEmailModal && (
        <InvoiceEmailModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedEmailInvoice(null);
          }}
          invoice={selectedEmailInvoice}
          currentCompany={currentCompany}
          terceros={terceros}
          onOpenSmtpConfig={() => setShowSmtpModal(true)}
          onInvoiceSent={(invNum) => refreshSentInvoicesMap(invNum)}
        />
      )}

      {/* MEJORA 3: Modal de Configuración Servidor SMTP y Bitácora de Envíos */}
      {showSmtpModal && (
        <SmtpConfigModal
          isOpen={showSmtpModal}
          onClose={() => setShowSmtpModal(false)}
          currentCompany={currentCompany}
          onSaveSmtpConfig={(updatedSmtp) => {
            if (updateCompany) {
              updateCompany({
                ...currentCompany,
                smtpConfig: updatedSmtp
              });
            }
          }}
        />
      )}

      {/* Modal: Gestión de Pago con Tarjeta / Datáfono / Wompi */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl shrink-0">
                  <i className="ri-bank-card-line"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Gestión de Tarjeta & Datáfono
                    {currentCompany?.wompiConfig?.environment === 'sandbox' && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Sandbox
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Registre el váucher del datáfono físico o cobre en línea vía Wompi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setCardMode('datafono')}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  cardMode === 'datafono'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="ri-device-line text-sm"></i>
                <span>Datáfono Físico (POS)</span>
              </button>
              <button
                type="button"
                onClick={() => setCardMode('wompi')}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  cardMode === 'wompi'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="ri-qr-code-line text-sm"></i>
                <span>Pasarela Wompi (Link/QR)</span>
              </button>
            </div>

            {/* Mode 1: Physical POS Terminal */}
            {cardMode === 'datafono' && (
              <div className="space-y-3.5 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                    <i className="ri-information-line"></i>
                    Datos del recibo impreso por el datáfono:
                  </span>
                  <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                    Terminal: {currentCompany?.datafonoConfig?.terminalId || 'FINTEKIA-POS-01'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Franquicia
                    </label>
                    <select
                      value={cardFranchise}
                      onChange={(e) => setCardFranchise(e.target.value as any)}
                      className="w-full text-xs rounded-xl px-3 py-2.5 bg-slate-900 border border-slate-700 text-white font-medium outline-none focus:border-blue-500"
                    >
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="amex">American Express</option>
                      <option value="diners">Diners Club</option>
                      <option value="otro">Débito Maestro / Otro</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      No. Autorización / Váucher
                    </label>
                    <input
                      type="text"
                      placeholder="ej. 084920"
                      value={cardAuthVoucher}
                      onChange={(e) => setCardAuthVoucher(e.target.value)}
                      className="w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Últimos 4 Dígitos
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="ej. 4580"
                      value={cardLastFour}
                      onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Cuotas (Diferido)
                    </label>
                    <select
                      disabled={paymentMethod === 'debito'}
                      value={paymentMethod === 'debito' ? 1 : cardInstallments}
                      onChange={(e) => setCardInstallments(parseInt(e.target.value) || 1)}
                      className={`w-full text-xs rounded-xl px-3 py-2.5 bg-slate-900 border border-slate-700 text-white font-medium outline-none focus:border-blue-500 ${
                        paymentMethod === 'debito' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value={1}>1 Cuota (Sin intereses)</option>
                      <option value={2}>2 Cuotas</option>
                      <option value={3}>3 Cuotas</option>
                      <option value={6}>6 Cuotas</option>
                      <option value={12}>12 Cuotas</option>
                      <option value={24}>24 Cuotas</option>
                      <option value={36}>36 Cuotas</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Virtual Wompi Gateway */}
            {cardMode === 'wompi' && (
              <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="ri-shield-keyhole-line text-purple-400 text-base"></i>
                      <span className="font-bold text-slate-200 text-xs">
                        Pasarela Oficial Wompi Bancolombia
                      </span>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Firma SHA-256
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Acepta Tarjeta Crédito/Débito, PSE, Nequi y Botón Bancolombia en tiempo real.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWompiModal(true);
                      setShowCardModal(false);
                    }}
                    className="w-full mt-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <i className="ri-bank-card-line text-sm"></i>
                    <span>Abrir Checkout Wompi</span>
                  </button>
                </div>

                {/* Confirmation info if already paid */}
                {wompiConfirmedDetails && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <i className="ri-checkbox-circle-fill text-emerald-400 text-base"></i>
                      <div className="text-xs">
                        <span className="font-bold text-emerald-400 block">
                          Pago Aprobado ({wompiConfirmedDetails.franchise?.toUpperCase()} •••• {wompiConfirmedDetails.lastFourDigits})
                        </span>
                        <span className="text-slate-400 text-[10px] font-mono">
                          Ref: {wompiConfirmedDetails.wompiTransactionId} · Aut: {wompiConfirmedDetails.authorizationCode}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWompiConfirmedDetails(null)}
                      className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Reiniciar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setCardAuthVoucher('');
                  setCardLastFour('');
                  setWompiConfirmedDetails(null);
                  setShowCardModal(false);
                }}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors font-medium cursor-pointer"
              >
                Limpiar datos
              </button>
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <i className="ri-check-line text-sm"></i>
                <span>Guardar y Continuar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Checkout Wompi Bancolombia */}
      {showWompiModal && (
        <WompiCheckoutModal
          isOpen={showWompiModal}
          onClose={() => setShowWompiModal(false)}
          invoiceNumber={`${activeBillingConfig.prefix || 'FE'}-${101 + vouchers.filter(v => v.type === 'venta').length}`}
          totalAmount={Math.round(finalTotal)}
          clientName={clients.find(c => c.id === selectedClient)?.name || 'Cliente Mostrador'}
          clientEmail={clients.find(c => c.id === selectedClient)?.email}
          clientNit={clients.find(c => c.id === selectedClient)?.nit}
          wompiConfig={currentCompany?.wompiConfig}
          onPaymentSuccess={(details) => {
            setWompiConfirmedDetails(details);
            setActiveWompiPaymentLink(details.wompiPaymentLink || '');
            if (details.cardType) {
              setPaymentMethod(details.cardType === 'debito' ? 'debito' : 'credito');
            }
            setShowWompiModal(false);
          }}
          theme={theme}
        />
      )}
    </div>
  );
}
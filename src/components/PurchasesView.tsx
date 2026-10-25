import React, { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from "../context/ToastContext";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Tercero, Product, InventoryItem, Voucher, PucAccount, Warehouse } from '../types';
import { THEMES_MAP } from './Sidebar';
import Pagination from './Pagination';
import { exportPurchasesToExcel } from '../utils/excelExport';

interface PurchasesViewProps {
  currentCompany: any;
  vouchers: Voucher[];
  terceros: Tercero[];
  products: Product[];
  inventory: InventoryItem[];
  warehouses: Warehouse[];
  puc: PucAccount[];
  addVoucher: (p: { number: string; type: 'compra'; concept: string; thirdPartyId: string; total: number; lines: any[]; items?: any[]; paymentTerm?: 'contado' | 'credito'; dueDate?: string; retenciones?: any }) => void;
  updateInventory: (prodId: string, lotNum: string | undefined, diffQty: number, warehouseId?: string, expirationDate?: string) => void;
  addInventoryMovement?: (mov: any) => void;
  updateProduct?: (p: Product) => void;
  theme?: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
}

export default function PurchasesView({
  currentCompany,
  vouchers,
  terceros,
  products,
  inventory,
  warehouses,
  puc,
  addVoucher,
  addInventoryMovement,
  updateInventory,
  updateProduct,
  theme = 'slate_gray'
}: PurchasesViewProps) {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().substring(0, 10));
  const [referenceInvoice, setReferenceInvoice] = useState('');

  // Commercial terms and withholdings
  const [paymentCondition, setPaymentCondition] = useState<'contado' | 'credito'>('contado');
  const [creditDays, setCreditDays] = useState<number>(30);
  const [retefuentePercent, setRetefuentePercent] = useState<number>(2.5);
  const [reteIvaActive, setReteIvaActive] = useState<boolean>(false);
  const [reteIcaRate, setReteIcaRate] = useState<number>(0);
  
  const [purchaseLines, setPurchaseLines] = useState<Array<{ productId: string; lotNumber?: string; qty: number; unitCost: number; expirationDate?: string }>>([]);

  // Search and auto-selection state
  const [itemSearch, setItemSearch] = useState('');
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
      // Audio playback silently ignored
    }
  };

  const openCameraScanner = () => {
    setCameraError(null);
    setIsCameraModalOpen(true);
  };

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

  // Lifecycle for Html5Qrcode camera scanner in Purchases prioritizing rear camera
  useEffect(() => {
    let isMounted = true;
    let scannerInstance: Html5Qrcode | null = null;

    if (isCameraModalOpen) {
      const initCamera = async () => {
        try {
          await new Promise((res) => setTimeout(res, 220));
          if (!isMounted) return;

          const container = document.getElementById('purchase-barcode-camera-reader');
          if (!container) return;

          scannerInstance = new Html5Qrcode('purchase-barcode-camera-reader', {
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
                ? 'Permiso de cámara denegado en el navegador. Por favor active el permiso para usar la cámara.'
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

  const handleScanBarcode = (manualCode?: string) => {
    const rawCode = (manualCode !== undefined ? manualCode : '').trim();
    if (!rawCode) return;

    const codeLower = rawCode.toLowerCase();
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
        message: `✓ Insumo escaneado: "${matched.name}" (Costo: ${formatCOP(matched.cost || 0)})`,
        id: noticeId
      });
    } else {
      const noticeId = Date.now();
      setAddedNotice({
        message: `⚠️ Código [${rawCode}] no coincide con ningún insumo registrado.`,
        id: noticeId
      });
      setTimeout(() => {
        setAddedNotice((curr) => (curr?.id === noticeId ? null : curr));
      }, 4000);
    }
  };

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

  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;
  const isNavy = theme === 'navy_dark';
  
  const inputBg = isNavy ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900';
  const labelText = isNavy ? 'text-slate-400' : 'text-slate-700 font-semibold';
  const sectionBorder = isNavy ? 'border-slate-850' : 'border-slate-200';
  const headingText = isNavy ? 'text-white' : 'text-slate-900 font-bold';

  // Filter providers and buyable raw materials
  const providers = terceros.filter((t) => t.roles.includes('proveedor'));
  const rawMaterialsAndOther = products; // Allow all registered products to be selected for purchases

  const filteredMaterials = useMemo(() => {
    if (!itemSearch.trim()) return rawMaterialsAndOther;
    const q = itemSearch.toLowerCase().trim();
    return rawMaterialsAndOther.filter((p) => 
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.type && p.type.toLowerCase().includes(q))
    );
  }, [rawMaterialsAndOther, itemSearch]);

  const handleSelectProductToAdd = (productId: string) => {
    if (!productId) return;
    const selected = products.find((p) => p.id === productId);
    if (!selected) return;

    setPurchaseLines((prev) => {
      const existingIdx = prev.findIndex((l) => l.productId === productId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: updated[existingIdx].qty + 1
        };
        return updated;
      }

      const defaultLotNum = 'LOTE-' + new Date().toISOString().substring(2, 4) + '0' + (prev.length + 1);
      const defaultExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

      return [
        ...prev,
        {
          productId: selected.id,
          lotNumber: defaultLotNum,
          qty: 1,
          unitCost: selected.cost || 0,
          expirationDate: defaultExpiry
        }
      ];
    });

    setItemSearch('');
    setIsSearchOpen(false);
    const noticeId = Date.now();
    setAddedNotice({
      message: `✓ Insumo ingresado automáticamente: "${selected.name}" (Costo: ${formatCOP(selected.cost || 0)})`,
      id: noticeId
    });
    setTimeout(() => {
      setAddedNotice((curr) => (curr?.id === noticeId ? null : curr));
    }, 3200);
  };

  const removeLine = (idx: number) => {
    setPurchaseLines(purchaseLines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, key: string, val: any) => {
    const updated = [...purchaseLines];
    updated[idx] = { ...updated[idx], [key]: val };

    if (key === 'productId') {
      const selected = products.find((p) => p.id === val);
      if (selected) {
        updated[idx].unitCost = selected.cost;
      }
    }
    setPurchaseLines(updated);
  };

  // Calculates subtotal sum
  const subtotal = purchaseLines.reduce((acc, line) => {
    return acc + line.qty * line.unitCost;
  }, 0);

  // Colombian IVA estimation (Purchases have descontable tax)
  const totalTax = purchaseLines.reduce((acc, line) => {
    const p = products.find((p) => p.id === line.productId);
    const taxFactor = p ? p.tax / 100 : 0.19;
    return acc + line.qty * line.unitCost * taxFactor;
  }, 0);

  // Withholdings calculation (DIAN Colombia)
  const retefuenteAmount = subtotal * (retefuentePercent / 100);
  const reteIvaAmount = reteIvaActive ? totalTax * 0.15 : 0;
  const reteIcaAmount = subtotal * reteIcaRate;
  const totalWithholdings = retefuenteAmount + reteIvaAmount + reteIcaAmount;
  const netPayable = Math.max(0, subtotal + totalTax - totalWithholdings);
  const finalTotal = subtotal + totalTax;

  // Due Date calculation for credit purchases
  const calculatedDueDate = useMemo(() => {
    if (paymentCondition === 'contado') return purchaseDate;
    const d = new Date(purchaseDate);
    d.setDate(d.getDate() + creditDays);
    return d.toISOString().substring(0, 10);
  }, [purchaseDate, paymentCondition, creditDays]);

  // Generate Purchase Voucher Posting (COM-xxx)
  const handleSavePurchase = () => {
    if (!selectedProvider) {
      toast.warning("Por favor seleccione un Proveedor logístico.", "Proveedor Requerido");
      return;
    }
    if (!selectedWarehouse) {
      toast.warning("Por favor seleccione la planta o bodega destino para el ingreso.", "Bodega Requerida");
      return;
    }
    if (purchaseLines.length === 0 || purchaseLines.some((l) => !l.productId || l.qty <= 0 || l.unitCost <= 0)) {
      toast.warning("Por favor agregue al menos un insumo o producto con cantidad y costo válidos.", "Productos Requeridos");
      return;
    }

    // Generate Voucher Number
    const purchaseRecords = vouchers.filter((v) => v.type === 'compra');
    const nextNumber = `COM-${201 + purchaseRecords.length}`;

    // Voucher lines representing Colombian accounting Double-Entry
    const ledgerLines = [
      {
        accountCode: '140501', // Materias Primas / Mercancías (Débito)
        description: `Ingreso mercancía COM No. ${nextNumber} - Fac. Prov: ${referenceInvoice || 'S/R'}`,
        debit: Math.round(subtotal),
        credit: 0
      },
      {
        accountCode: '240810', // IVA Descontable en Compras (Débito)
        description: `IVA descontable compras COM ${nextNumber}`,
        debit: Math.round(totalTax),
        credit: 0
      }
    ];

    if (retefuenteAmount > 0) {
      ledgerLines.push({
        accountCode: '236540', // Retención en la fuente compras (Crédito)
        description: `ReteFuente ${retefuentePercent}% en compras COM ${nextNumber}`,
        debit: 0,
        credit: Math.round(retefuenteAmount)
      });
    }

    if (reteIvaAmount > 0) {
      ledgerLines.push({
        accountCode: '236701', // ReteIVA por pagar (Crédito)
        description: `ReteIVA 15% s/ IVA compras COM ${nextNumber}`,
        debit: 0,
        credit: Math.round(reteIvaAmount)
      });
    }

    if (reteIcaAmount > 0) {
      ledgerLines.push({
        accountCode: '236801', // ReteICA por pagar (Crédito)
        description: `ReteICA ${(reteIcaRate * 1000).toFixed(2)}‰ compras COM ${nextNumber}`,
        debit: 0,
        credit: Math.round(reteIcaAmount)
      });
    }

    ledgerLines.push({
      accountCode: '220505', // Proveedores Nacionales (Crédito / Neto a pagar)
      description: `Obligación comercial proveedor neto COM ${nextNumber} (${paymentCondition.toUpperCase()})`,
      debit: 0,
      credit: Math.round(netPayable)
    });

    addVoucher({
      number: nextNumber,
      type: 'compra',
      concept: `Registro Compra Directa No. ${nextNumber} (Factura Prov. ${referenceInvoice || 'S/N'}${paymentCondition === 'credito' ? ` - Crédito ${creditDays}d` : ' - Contado'})`,
      thirdPartyId: selectedProvider,
      total: Math.round(netPayable),
      paymentTerm: paymentCondition,
      dueDate: calculatedDueDate,
      retenciones: {
        retefuente: Math.round(retefuenteAmount),
        reteiva: Math.round(reteIvaAmount),
        reteica: Math.round(reteIcaAmount)
      },
      lines: ledgerLines,
      items: purchaseLines.map((l) => ({
        productId: l.productId,
        qty: l.qty,
        unitCost: l.unitCost,
        lotNumber: l.lotNumber || 'S/L',
        expirationDate: l.expirationDate
      })) as any
    });

    // Update real inventory storage slots (Adding cost / materials)
    purchaseLines.forEach((line) => {
      // For purchases, add inventory (Positive value!)
      updateInventory(line.productId, line.lotNumber, line.qty, selectedWarehouse, line.expirationDate);
      
      if (addInventoryMovement) {
        addInventoryMovement({
          date: purchaseDate,
          productId: line.productId,
          lotNumber: line.lotNumber,
          type: 'entrada_compra',
          quantity: line.qty,
          cost: line.unitCost,
          notes: `Ingreso de Insumo por Compra ${nextNumber} a ${selectedWarehouse}`
        });
      }
    });

    // Recalculate Weighted Average Cost (CPP) for purchased items
    if (updateProduct) {
      purchaseLines.forEach((line) => {
        const prod = products.find((p) => p.id === line.productId);
        if (prod) {
          const currentStock = inventory
            .filter((item) => item.productId === prod.id)
            .reduce((sum, item) => sum + item.quantity, 0);
          
          const newTotalStock = currentStock + line.qty;
          if (newTotalStock > 0 && prod.cost !== line.unitCost) {
            const weightedCost = Math.round(
              ((currentStock * prod.cost) + (line.qty * line.unitCost)) / newTotalStock
            );
            updateProduct({
              ...prod,
              cost: weightedCost
            });
          }
        }
      });
    }

    toast.success(`Compra de Mercancía asentada bajo Comprobante ${nextNumber}. Neto: ${formatCOP(netPayable)}`, "Compra Registrada");
    
    // Clear / Reset form status
    setPurchaseLines([]);
    setSelectedProvider('');
    setSelectedWarehouse('');
    setReferenceInvoice('');
  };

  // Pagination for purchases history (15 records per page)
  const [purchasesPage, setPurchasesPage] = useState(1);
  const PURCHASES_PER_PAGE = 15;

  // Advanced Combined Filters (Rango de Fechas + Estado + Proveedor + Búsqueda)
  const [purchasesStartDate, setPurchasesStartDate] = useState('');
  const [purchasesEndDate, setPurchasesEndDate] = useState('');
  const [purchasesStatusFilter, setPurchasesStatusFilter] = useState<'todos' | 'contado' | 'credito' | 'con_retencion'>('todos');
  const [purchasesSupplierFilter, setPurchasesSupplierFilter] = useState('');
  const [purchasesSearchQuery, setPurchasesSearchQuery] = useState('');

  const purchasesHistory = useMemo(() => {
    return vouchers
      .filter((v) => v.type === 'compra')
      .filter((v) => {
        // 1. Date range
        if (purchasesStartDate && v.date < purchasesStartDate) return false;
        if (purchasesEndDate && v.date > purchasesEndDate) return false;

        // 2. Status
        if (purchasesStatusFilter === 'contado' && v.paymentTerm !== 'contado') return false;
        if (purchasesStatusFilter === 'credito' && v.paymentTerm !== 'credito') return false;
        if (purchasesStatusFilter === 'con_retencion' && !(v.retenciones && (v.retenciones.retefuente || v.retenciones.reteiva || v.retenciones.reteica))) return false;

        // 3. Supplier
        if (purchasesSupplierFilter && v.thirdPartyId !== purchasesSupplierFilter) return false;

        // 4. Search query
        if (purchasesSearchQuery.trim()) {
          const q = purchasesSearchQuery.toLowerCase().trim();
          const supp = terceros.find(t => t.id === v.thirdPartyId);
          const suppName = (supp?.name || '').toLowerCase();
          const suppNit = (supp?.nit || '').toLowerCase();
          const matchNum = v.number.toLowerCase().includes(q);
          const matchConcept = (v.concept || '').toLowerCase().includes(q);
          const matchSupp = suppName.includes(q) || suppNit.includes(q);
          if (!matchNum && !matchConcept && !matchSupp) return false;
        }

        return true;
      });
  }, [vouchers, purchasesStartDate, purchasesEndDate, purchasesStatusFilter, purchasesSupplierFilter, purchasesSearchQuery, terceros]);

  const hasActivePurchasesFilters = Boolean(
    purchasesStartDate || purchasesEndDate || purchasesStatusFilter !== 'todos' || purchasesSupplierFilter || purchasesSearchQuery.trim()
  );

  const clearPurchasesFilters = () => {
    setPurchasesStartDate('');
    setPurchasesEndDate('');
    setPurchasesStatusFilter('todos');
    setPurchasesSupplierFilter('');
    setPurchasesSearchQuery('');
    setPurchasesPage(1);
  };

  const totalPurchasesPages = Math.max(1, Math.ceil(purchasesHistory.length / PURCHASES_PER_PAGE));
  const safePurchasesPage = Math.min(purchasesPage, totalPurchasesPages);
  const paginatedPurchases = purchasesHistory.slice(
    (safePurchasesPage - 1) * PURCHASES_PER_PAGE,
    safePurchasesPage * PURCHASES_PER_PAGE
  );

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left main: Register purchase receipt card form */}
        <div className={`${activeTheme.cardStyles} p-6 shadow-sm space-y-6 lg:col-span-2`}>
          <div className={`border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${sectionBorder}`}>
            <div>
              <h3 className={`font-display font-semibold text-lg ${headingText}`}>Inscribir Compra y Abastecimiento</h3>
              <p className="text-xs text-slate-400 font-medium font-display">Asiente facturas de proveedores logísticos de trigo, esencias y empaques</p>
            </div>
            <button
              type="button"
              onClick={() => exportPurchasesToExcel(vouchers, terceros, products, currentCompany?.name)}
              className="bg-emerald-600 hover:bg-emerald-550 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
              title="Descargar historial de compras e insumos en Excel (.xlsx)"
              id="export-purchases-excel-btn"
            >
              <i className="ri-file-excel-2-line text-emerald-200"></i> Exportar Compras (Excel)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier Select */}
            <div className="space-y-1 block">
              <label className={`text-[10px] font-bold uppercase tracking-widest block ${labelText}`}>Proveedor de Insumos</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className={`w-full text-xs focus:border-blue-500 rounded-xl px-3 py-2.5 font-semibold ${inputBg}`}
              >
                <option value="">-- Seleccione un proveedor registrado --</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - NIT {p.nit}
                  </option>
                ))}
              </select>
            </div>

            {/* Warehouse Select */}
            <div className="space-y-1 block">
              <label className={`text-[10px] font-bold uppercase tracking-widest block font-sans ${labelText}`}>Bodega / Planta de Entrada</label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className={`w-full text-xs focus:border-blue-500 rounded-xl px-3 py-2.5 font-semibold ${inputBg}`}
              >
                <option value="">-- Seleccione Bodega Destino --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name} - {w.address}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-1 block">
              <label className={`text-[10px] font-bold uppercase tracking-widest block ${labelText}`}>Fecha Operación Contable</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className={`w-full text-xs focus:border-blue-500 rounded-xl px-3 py-2.5 font-semibold ${inputBg}`}
              />
            </div>

            {/* Invoice Reference Code */}
            <div className="space-y-1 block">
              <label className={`text-[10px] font-bold uppercase tracking-widest block ${labelText}`}>Factura Soporte Proveedor (No. Física)</label>
              <input
                type="text"
                placeholder="ej. F-993A o FAC-482"
                value={referenceInvoice}
                onChange={(e) => setReferenceInvoice(e.target.value)}
                className={`w-full text-xs focus:border-blue-500 rounded-xl px-3 py-2.5 font-mono font-bold ${inputBg}`}
              />
            </div>
          </div>

          {/* Condición Comercial & Retenciones DIAN */}
          <div className={`p-4 rounded-2xl border space-y-3 ${isNavy ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-mono">
                <i className="ri-scales-3-line text-xs"></i>
                <span>Condición Comercial & Retenciones en la Fuente (Compras Colombia)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {paymentCondition === 'credito' ? `Vence: ${calculatedDueDate}` : 'Pago Inmediato'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Payment Condition */}
              <div className="space-y-1 block">
                <label className={`text-[10px] font-bold uppercase tracking-wider block ${labelText}`}>
                  Forma de Pago
                </label>
                <div className="flex rounded-xl p-0.5 bg-black/20 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentCondition('contado')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      paymentCondition === 'contado' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Contado
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentCondition('credito')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      paymentCondition === 'credito' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Crédito
                  </button>
                </div>
              </div>

              {/* Credit Days (if credit) */}
              <div className="space-y-1 block">
                <label className={`text-[10px] font-bold uppercase tracking-wider block ${labelText}`}>
                  Plazo / Vencimiento
                </label>
                <select
                  disabled={paymentCondition === 'contado'}
                  value={creditDays}
                  onChange={(e) => setCreditDays(Number(e.target.value))}
                  className={`w-full text-xs font-semibold rounded-xl px-3 py-2 outline-none border disabled:opacity-50 ${inputBg}`}
                >
                  <option value={15}>15 Días</option>
                  <option value={30}>30 Días (1 Mes)</option>
                  <option value={45}>45 Días</option>
                  <option value={60}>60 Días (2 Meses)</option>
                  <option value={90}>90 Días</option>
                </select>
              </div>

              {/* ReteFuente Rate */}
              <div className="space-y-1 block">
                <label className={`text-[10px] font-bold uppercase tracking-wider block ${labelText}`}>
                  ReteFuente Compras
                </label>
                <select
                  value={retefuentePercent}
                  onChange={(e) => setRetefuentePercent(Number(e.target.value))}
                  className={`w-full text-xs font-semibold rounded-xl px-3 py-2 outline-none border ${inputBg}`}
                >
                  <option value={0}>0% (No Retener)</option>
                  <option value={2.5}>2.5% (Declarantes General)</option>
                  <option value={3.5}>3.5% (No Declarantes)</option>
                  <option value={1.0}>1.0% (Bienes Específicos)</option>
                </select>
              </div>

              {/* ReteIVA and ReteICA */}
              <div className="space-y-1 block">
                <label className={`text-[10px] font-bold uppercase tracking-wider block ${labelText}`}>
                  ReteIVA & ReteICA
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reteIvaActive}
                      onChange={(e) => setReteIvaActive(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                    <span>ReteIVA 15%</span>
                  </label>

                  <select
                    value={reteIcaRate}
                    onChange={(e) => setReteIcaRate(Number(e.target.value))}
                    className={`flex-1 text-[11px] font-semibold rounded-lg px-2 py-1 outline-none border ${inputBg}`}
                  >
                    <option value={0}>Sin ReteICA</option>
                    <option value={0.00414}>4.14‰ ICA</option>
                    <option value={0.00966}>9.66‰ ICA</option>
                    <option value={0.01104}>11.04‰ ICA</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Integrated Elegant Product Selector & Items Table */}
          <div className="space-y-4 pt-2">
            
            {/* Header & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div>
                <h4 className={`text-sm font-semibold tracking-tight ${headingText}`}>
                  Insumos & Artículos de la Compra
                </h4>
                <p className="text-xs text-slate-400">
                  Busque insumos del catálogo o escanee códigos de barra con la cámara del dispositivo
                </p>
              </div>
              {purchaseLines.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                    {purchaseLines.length} {purchaseLines.length === 1 ? 'ítem' : 'ítems'} · Subtotal: <strong className={isNavy ? 'text-teal-400 font-bold' : 'text-teal-600 font-bold'}>{formatCOP(subtotal)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPurchaseLines([])}
                    className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    title="Quitar todos los ítems"
                  >
                    <i className="ri-delete-bin-line"></i> Vaciar
                  </button>
                </div>
              )}
            </div>

            {/* Instant Feedback Alert */}
            {addedNotice && (
              <div className="px-3.5 py-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-300 text-xs font-medium flex items-center justify-between gap-2 shadow-xs transition-all">
                <div className="flex items-center gap-2">
                  <i className="ri-checkbox-circle-line text-teal-500 text-sm"></i>
                  <span>{addedNotice.message}</span>
                </div>
                <span className="text-[10px] text-teal-500/70 font-mono">Agregado al comprobante</span>
              </div>
            )}

            {/* Refined, Elegant Toolbar: Search Input + Device Camera Button + Catalog Select */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
              {/* Search Input with Live Autocomplete */}
              <div className="relative flex-1" ref={searchContainerRef}>
                <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
                <input
                  type="text"
                  placeholder="Buscar insumo por nombre, referencia o código (ej. Harina, Azúcar, MP-001)..."
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredMaterials.length > 0) {
                      e.preventDefault();
                      handleSelectProductToAdd(filteredMaterials[0].id);
                    } else if (e.key === 'Escape') {
                      setIsSearchOpen(false);
                    }
                  }}
                  className={`w-full text-xs sm:text-sm font-medium rounded-xl pl-9 pr-8 py-2.5 border focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all ${inputBg}`}
                />
                {itemSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setItemSearch('');
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
                    {filteredMaterials.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No se encontraron insumos coincidentes con "{itemSearch}".
                      </div>
                    ) : (
                      filteredMaterials.map((p) => (
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
                              <span className="font-semibold text-xs truncate group-hover:text-teal-500 transition-colors">
                                {p.name}
                              </span>
                              {p.sku && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  · {p.sku}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Tipo: <strong className="text-teal-500 font-medium">{p.type === 'materia_prima' ? 'Materia Prima' : 'Producto'}</strong></span>
                              <span>·</span>
                              <span>IVA {p.tax}%</span>
                              {p.barcode && <span>· Cód: {p.barcode}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-mono font-semibold text-xs block ${isNavy ? 'text-teal-400' : 'text-teal-600'}`}>
                              {formatCOP(p.cost || 0)}
                            </span>
                            <span className="text-[10px] text-emerald-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              + Agregar
                            </span>
                          </div>
                        </button>
                      ))
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
                    ? 'bg-teal-600/10 hover:bg-teal-600/20 text-teal-400 hover:text-teal-300 border-teal-500/30'
                    : 'bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-800 border-teal-200'
                }`}
                title="Usar la cámara del dispositivo para escanear código de barras o QR de insumos"
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
                  {rawMaterialsAndOther.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Costo: {formatCOP(p.cost || 0)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ======================================================== */}
            {/* MODAL: DEVICE CAMERA BARCODE SCANNER (PURCHASES)         */}
            {/* Clean, high-end optical scanner using device camera      */}
            {/* ======================================================== */}
            {isCameraModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-5 text-white space-y-4">
                  
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center text-lg">
                        <i className="ri-camera-lens-line"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-white">
                          Escáner con Cámara del Dispositivo
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Apunte la cámara al código de barras o QR del insumo
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
                    <div id="purchase-barcode-camera-reader" className="w-full h-full object-cover"></div>

                    {/* Optical Framing Overlay */}
                    <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-teal-400/50 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                      <div className="flex justify-between">
                        <span className="w-3.5 h-3.5 border-t-2 border-l-2 border-teal-400"></span>
                        <span className="w-3.5 h-3.5 border-t-2 border-r-2 border-teal-400"></span>
                      </div>
                      <div className="w-full h-0.5 bg-teal-400 shadow-[0_0_10px_#2dd4bf] animate-pulse"></div>
                      <div className="flex justify-between">
                        <span className="w-3.5 h-3.5 border-b-2 border-l-2 border-teal-400"></span>
                        <span className="w-3.5 h-3.5 border-b-2 border-r-2 border-teal-400"></span>
                      </div>
                    </div>

                    {/* Error notification if camera permission fails */}
                    {cameraError && (
                      <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl border border-amber-500/20">
                          <i className="ri-camera-off-line"></i>
                        </div>
                        <p className="text-xs text-amber-200 max-w-xs">{cameraError}</p>
                        <p className="text-[11px] text-slate-400">Puede seleccionar un insumo o código simulado a continuación:</p>
                      </div>
                    )}
                  </div>

                  {/* Barcode simulation & quick testing tray */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">
                      Simular captura rápida de insumo:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {products.filter(p => p.barcode).slice(0, 5).map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            handleScanBarcode(p.barcode!);
                            closeCameraScanner();
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-teal-400 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <i className="ri-barcode-line text-teal-400 text-xs"></i>
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
                        className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-[11px] text-slate-300">
                        Modo continuo (escanear varios insumos sin cerrar)
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
            {/* SECTION: PURCHASE ROWS DATA TABLE                        */}
            {/* Clean, compact, professional ERP tabular layout          */}
            {/* ======================================================== */}
            <div className="space-y-3">
              {purchaseLines.length === 0 ? (
                <div className={`p-8 rounded-2xl border-2 border-dashed text-center space-y-2 ${
                  isNavy ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
                }`}>
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center text-xl mx-auto border border-teal-500/20">
                    <i className="ri-inbox-archive-line"></i>
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${headingText}`}>
                      Comprobante sin insumos agregados
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                      Busque un insumo arriba o use el escáner de cámara para añadir automáticamente líneas al registro de compra.
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
                          <th className="py-2.5 px-3">Insumo / Descripción</th>
                          <th className="py-2.5 px-3 w-36">Lote asignado</th>
                          <th className="py-2.5 px-3 w-36">Vencimiento</th>
                          <th className="py-2.5 px-3 w-32 text-center">Cantidad</th>
                          <th className="py-2.5 px-3 w-32 text-right">Costo Unitario</th>
                          <th className="py-2.5 px-3 w-32 text-right">Subtotal</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y text-xs ${
                        isNavy ? 'divide-slate-800/80 text-slate-200' : 'divide-slate-100 text-slate-700'
                      }`}>
                        {purchaseLines.map((line, idx) => {
                          const prodObj = products.find(p => p.id === line.productId);
                          const lineSubtotal = line.qty * line.unitCost;
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
                                    {prodObj?.name || 'Insumo seleccionado'}
                                  </span>
                                  {prodObj?.sku && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      · {prodObj.sku}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                  {prodObj?.type === 'materia_prima' ? 'Materia Prima' : 'Producto'}
                                </span>
                              </td>

                              {/* Lot Number */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  placeholder="LOTE-01"
                                  value={line.lotNumber || ''}
                                  onChange={(e) => updateLine(idx, 'lotNumber', e.target.value)}
                                  className={`w-full text-xs font-mono font-medium rounded-lg px-2 py-1 border focus:outline-none ${inputBg}`}
                                />
                              </td>

                              {/* Expiration Date */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="date"
                                  value={line.expirationDate || ''}
                                  onChange={(e) => updateLine(idx, 'expirationDate', e.target.value)}
                                  className={`w-full text-xs font-mono rounded-lg px-2 py-1 border focus:outline-none ${inputBg}`}
                                />
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

                              {/* Unit Cost */}
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[10px] text-slate-400 font-mono">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={line.unitCost}
                                    onChange={(e) => updateLine(idx, 'unitCost', Math.max(0, parseInt(e.target.value) || 0))}
                                    className={`w-24 text-right text-xs font-mono font-medium border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors ${inputBg}`}
                                  />
                                </div>
                              </td>

                              {/* Subtotal */}
                              <td className={`py-2.5 px-3 text-right font-mono font-semibold text-xs ${
                                isNavy ? 'text-teal-400' : 'text-teal-600'
                              }`}>
                                {formatCOP(lineSubtotal)}
                              </td>

                              {/* Remove */}
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeLine(idx)}
                                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all cursor-pointer mx-auto"
                                  title="Quitar este insumo"
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
                          <td colSpan={4} className="py-2.5 px-3 font-medium">
                            Total insumos: <strong className={isNavy ? 'text-white' : 'text-slate-900'}>{purchaseLines.length}</strong> · Unidades totales: <strong className={isNavy ? 'text-teal-400' : 'text-teal-600'}>{purchaseLines.reduce((s, l) => s + l.qty, 0)}</strong>
                          </td>
                          <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider text-[10px] font-semibold text-slate-400">
                            Subtotal Compra:
                          </td>
                          <td className={`py-2.5 px-3 text-right font-bold text-sm ${
                            isNavy ? 'text-teal-400' : 'text-teal-600'
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

          {/* Submits buttons footer */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            {(purchaseLines.length > 0 || selectedProvider) ? (
              <button
                type="button"
                onClick={() => {
                  if (purchaseLines.length === 0 || window.confirm('¿Desea limpiar el formulario de compra actual y permanecer en este módulo?')) {
                    setPurchaseLines([]);
                    setSelectedProvider('');
                    setSelectedWarehouse('');
                    setReferenceInvoice('');
                    toast.info('Formulario de compra restablecido. Permaneces en el módulo de Compras.', 'Formulario Limpio');
                  }
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Limpiar campos y permanecer en el módulo de Compras"
              >
                <i className="ri-refresh-line text-xs"></i>
                <span>Limpiar Formulario</span>
              </button>
            ) : <div />}

            <button
              onClick={handleSavePurchase}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <i className="ri-save-line text-xs"></i>
              Asentar Registro de Compra
            </button>
          </div>
        </div>

        {/* Right column: Accounting totals & vouchers logs history list */}
        <div className="space-y-6">
          
          {/* Totals Summary */}
          <div className="bg-slate-900 border border-slate-850 text-white p-6 rounded-2xl shadow-sm space-y-4">
            <h4 className="font-display font-bold text-sm tracking-widest text-slate-400 uppercase">Resumen de Asiento Contable</h4>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Total Bruto Mercancía:</span>
                <span className="font-bold font-mono text-slate-200">{formatCOP(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>IVA Descontable:</span>
                <span className="font-bold font-mono text-slate-200">{formatCOP(totalTax)}</span>
              </div>

              {/* Withholdings deductions */}
              {retefuenteAmount > 0 && (
                <div className="flex justify-between items-center text-amber-400/90">
                  <span>(-) ReteFuente ({retefuentePercent}%):</span>
                  <span className="font-mono font-bold">-{formatCOP(retefuenteAmount)}</span>
                </div>
              )}

              {reteIvaAmount > 0 && (
                <div className="flex justify-between items-center text-amber-400/90">
                  <span>(-) ReteIVA (15% del IVA):</span>
                  <span className="font-mono font-bold">-{formatCOP(reteIvaAmount)}</span>
                </div>
              )}

              {reteIcaAmount > 0 && (
                <div className="flex justify-between items-center text-amber-400/90">
                  <span>(-) ReteICA ({(reteIcaRate * 1000).toFixed(2)}‰):</span>
                  <span className="font-mono font-bold">-{formatCOP(reteIcaAmount)}</span>
                </div>
              )}

              <div className="border-t border-slate-700/60 my-2 pt-3 flex justify-between items-center text-white text-base">
                <span className="font-bold">NETO A PAGAR:</span>
                <span className="font-black font-mono text-emerald-400">{formatCOP(netPayable)}</span>
              </div>
              {totalWithholdings > 0 && (
                <p className="text-[10px] text-slate-400 text-right">
                  Total Retenido en la Fuente: <strong className="text-amber-400 font-mono">{formatCOP(totalWithholdings)}</strong>
                </p>
              )}
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2 text-[10px]">
              <span className="font-bold text-white/40 block">Distribución de Cuentas PUC (Partida Doble)</span>
              <div className="flex justify-between text-slate-400">
                <span>Débito (140501 / 143501 Inventarios):</span>
                <span className="font-mono text-emerald-400">+{formatCOP(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Débito (240810 IVA Descontable):</span>
                <span className="font-mono text-emerald-400">+{formatCOP(totalTax)}</span>
              </div>
              {retefuenteAmount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Crédito (236540 ReteFuente Compras):</span>
                  <span className="font-mono">-{formatCOP(retefuenteAmount)}</span>
                </div>
              )}
              {reteIvaAmount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Crédito (236701 ReteIVA por Pagar):</span>
                  <span className="font-mono">-{formatCOP(reteIvaAmount)}</span>
                </div>
              )}
              {reteIcaAmount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Crédito (236801 ReteICA por Pagar):</span>
                  <span className="font-mono">-{formatCOP(reteIcaAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 border-t border-white/5 pt-1 font-bold">
                <span>Crédito (220505 Proveedores Nal.):</span>
                <span className="font-mono text-rose-400">-{formatCOP(netPayable)}</span>
              </div>
            </div>
          </div>

          {/* Historical purchases receipts log list */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-semibold text-slate-800 text-sm">Historial Compra Directa</h4>
                <p className="text-[10px] text-slate-400 font-medium">Últimos registros sentados ({purchasesHistory.length})</p>
              </div>
              <button
                type="button"
                onClick={() => exportPurchasesToExcel(vouchers, terceros, products, currentCompany?.name)}
                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer transition-all"
                title="Exportar a Excel"
              >
                <i className="ri-file-excel-2-line text-emerald-600"></i> Excel (.xlsx)
              </button>
            </div>

            {/* Filtros Avanzados Combinados (Rango de Fechas + Estado + Proveedor + Búsqueda) */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-1.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <i className="ri-filter-3-line text-blue-600"></i>
                  Filtros Combinados
                </span>
                {hasActivePurchasesFilters && (
                  <button
                    type="button"
                    onClick={clearPurchasesFilters}
                    className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <i className="ri-restart-line"></i> Limpiar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Desde:</label>
                  <input
                    type="date"
                    value={purchasesStartDate}
                    onChange={(e) => {
                      setPurchasesStartDate(e.target.value);
                      setPurchasesPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Hasta:</label>
                  <input
                    type="date"
                    value={purchasesEndDate}
                    onChange={(e) => {
                      setPurchasesEndDate(e.target.value);
                      setPurchasesPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Estado:</label>
                  <select
                    value={purchasesStatusFilter}
                    onChange={(e) => {
                      setPurchasesStatusFilter(e.target.value as any);
                      setPurchasesPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
                  >
                    <option value="todos">Todos los Estados</option>
                    <option value="contado">Contado</option>
                    <option value="credito">Crédito</option>
                    <option value="con_retencion">Con Retenciones</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Proveedor:</label>
                  <select
                    value={purchasesSupplierFilter}
                    onChange={(e) => {
                      setPurchasesSupplierFilter(e.target.value);
                      setPurchasesPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 truncate"
                  >
                    <option value="">Todos ({terceros.filter(t => t.roles.includes('proveedor')).length})</option>
                    {terceros
                      .filter((t) => t.roles.includes('proveedor'))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="relative">
                <i className="ri-search-line absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Buscar compra o factura..."
                  value={purchasesSearchQuery}
                  onChange={(e) => {
                    setPurchasesSearchQuery(e.target.value);
                    setPurchasesPage(1);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-2 py-1 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {purchasesHistory.length > 0 ? (
                paginatedPurchases.map((v) => (
                  <div key={v.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 flex flex-col hover:bg-slate-100/50 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-[11px] text-slate-800">{v.number}</span>
                      <span className="text-[9px] text-slate-400 font-medium">{v.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-1">{v.concept}</p>
                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className="text-[10px] text-slate-400 font-bold">Total:</span>
                      <span className="font-mono font-black text-slate-800">{formatCOP(v.total)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <i className="ri-shopping-cart-2-line text-2xl block opacity-40 mb-1"></i>
                  <span>No hay compras en el periodo.</span>
                </div>
              )}
            </div>

            {purchasesHistory.length > 0 && (
              <Pagination
                currentPage={safePurchasesPage}
                totalItems={purchasesHistory.length}
                pageSize={PURCHASES_PER_PAGE}
                onPageChange={(page) => setPurchasesPage(page)}
                isDark={false}
                itemLabel="compras registradas"
              />
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

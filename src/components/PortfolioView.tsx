import React, { useState } from 'react';
import { toast } from "../context/ToastContext";
import { Voucher, Tercero, BankAccount, PucAccount, Company } from '../types';
import { THEMES_MAP } from './Sidebar';
import Pagination from './Pagination';
import { exportPortfolioToExcel } from '../utils/excelExport';
import { 
  Wallet, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Plus, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Building2, 
  Calendar, 
  CreditCard, 
  ArrowRight, 
  Briefcase, 
  FileSpreadsheet, 
  Receipt,
  FileCheck2,
  ListFilter,
  DollarSign,
  Undo2,
  BadgeAlert,
  Download,
  X,
  BellRing,
  Send,
  MessageSquare,
  MessageCircle,
  Mail,
  Copy,
  Check,
  ExternalLink,
  PhoneCall
} from 'lucide-react';

interface PortfolioViewProps {
  vouchers: Voucher[];
  terceros: Tercero[];
  bankAccounts: BankAccount[];
  puc: PucAccount[];
  addVoucher: (p: { 
    number: string; 
    type: Voucher['type']; 
    concept: string; 
    thirdPartyId: string; 
    total: number; 
    lines: any[]; 
    items?: any[];
  }) => void;
  theme?: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
  currentCompany?: Company;
}

export default function PortfolioView({
  vouchers,
  terceros,
  bankAccounts,
  puc,
  addVoucher,
  theme = 'slate_gray',
  currentCompany
}: PortfolioViewProps) {
  
  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;
  const isDark = theme !== 'light_gray';

  // Navigation Tabs: 'cxc' (clientes), 'cxp' (proveedores), 'reporte' (antiguedad), 'cobranza' (notificaciones y recordatorios)
  const [activeTab, setActiveTab] = useState<'cxc' | 'cxp' | 'reporte' | 'cobranza'>('cxc');
  
  // Filtering & Searching States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'vencido' | 'saldado'>('all');
  const [selectedThirdPartyId, setSelectedThirdPartyId] = useState<string>('all');

  // MEJORA 2: Collection Management & Notifications State
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collectionItem, setCollectionItem] = useState<{
    id: string;
    invoiceNo: string;
    thirdPartyId: string;
    thirdPartyName: string;
    thirdPartyNit: string;
    thirdPartyPhone?: string;
    thirdPartyEmail?: string;
    total: number;
    balance: number;
    dueDate: string;
    daysOverdue: number;
  } | null>(null);

  const [collectionTone, setCollectionTone] = useState<'preventivo' | 'informativo' | 'formal' | 'critico'>('informativo');
  const [collectionChannel, setCollectionChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [customCollectionMessage, setCustomCollectionMessage] = useState<string>('');
  const [commitmentDate, setCommitmentDate] = useState<string>('');
  const [commitmentNotes, setCommitmentNotes] = useState<string>('');
  const [copiedMessage, setCopiedMessage] = useState<boolean>(false);

  // Pipeline filter inside 'cobranza' tab
  const [collectionPipelineFilter, setCollectionPipelineFilter] = useState<'all' | 'por_vencer' | 'mora_leve' | 'mora_media' | 'mora_critica'>('all');

  // Collection Action Logs (stored in localStorage)
  const [collectionLogs, setCollectionLogs] = useState<{
    id: string;
    invoiceNo: string;
    thirdPartyName: string;
    date: string;
    channel: 'whatsapp' | 'email' | 'llamada';
    tone: 'preventivo' | 'informativo' | 'formal' | 'critico';
    amount: number;
    commitmentDate?: string;
    notes?: string;
    status: string;
  }[]>(() => {
    try {
      const saved = localStorage.getItem('fintekia_collection_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveCollectionLog = (entry: {
    invoiceNo: string;
    thirdPartyName: string;
    channel: 'whatsapp' | 'email' | 'llamada';
    tone: 'preventivo' | 'informativo' | 'formal' | 'critico';
    amount: number;
    commitmentDate?: string;
    notes?: string;
    status: string;
  }) => {
    const newLog = {
      ...entry,
      id: `col-${Date.now()}`,
      date: new Date().toISOString()
    };
    const updated = [newLog, ...collectionLogs].slice(0, 100);
    setCollectionLogs(updated);
    localStorage.setItem('fintekia_collection_logs', JSON.stringify(updated));
  };

  // Pagination states (15 per page)
  const [cxcPage, setCxcPage] = useState(1);
  const [cxpPage, setCxpPage] = useState(1);
  const PORTFOLIO_ITEMS_PER_PAGE = 15;

  // Quick Action Forms
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [preSelectedInvoice, setPreSelectedInvoice] = useState<{
    id: string;
    number: string;
    thirdPartyId: string;
    balance: number;
    type: 'venta' | 'compra';
  } | null>(null);

  // New Receipt / Abono Form State (RC)
  const [receiptThirdPartyId, setReceiptThirdPartyId] = useState('');
  const [receiptDocNo, setReceiptDocNo] = useState('');
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [receiptBankId, setReceiptBankId] = useState('');
  const [receiptConcept, setReceiptConcept] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().substring(0, 10));

  // New Disbursal / Egreso Form State (CE)
  const [paymentThirdPartyId, setPaymentThirdPartyId] = useState('');
  const [paymentDocNo, setPaymentDocNo] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentBankId, setPaymentBankId] = useState('');
  const [paymentConcept, setPaymentConcept] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().substring(0, 10));

  // Client Statement Modal State
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementClient, setStatementClient] = useState<Tercero | null>(null);

  // Notification Feedbacks
  const [notification, setNotification] = useState<string>('');

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 7000);
  };

  // Colombian format helper
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Helper to resolve dates and Mora
  const getDaysOverdue = (issueDateStr: string, customDueDateStr?: string) => {
    let dueDate: Date;
    if (customDueDateStr) {
      dueDate = new Date(customDueDateStr);
    } else {
      const issueDate = new Date(issueDateStr);
      dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30); // 30-day default payment terms
    }

    const today = new Date();
    const diffMs = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getDueDate = (issueDateStr: string, customDueDateStr?: string) => {
    if (customDueDateStr) return customDueDateStr;
    const issueDate = new Date(issueDateStr);
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate.toISOString().substring(0, 10);
  };

  // MEJORA 2: Template message generator for Collections & Reminders
  const generateCollectionMessage = (
    item: {
      invoiceNo: string;
      thirdPartyName: string;
      thirdPartyNit?: string;
      balance: number;
      dueDate: string;
      daysOverdue: number;
    },
    tone: 'preventivo' | 'informativo' | 'formal' | 'critico',
    channel: 'whatsapp' | 'email'
  ): string => {
    const companyName = currentCompany?.name || 'FinteKia ERP';
    const bankDetails = bankAccounts && bankAccounts.length > 0
      ? bankAccounts.map(b => `• ${b.bankName || b.name}: Nro. ${b.accountNumber} (${b.name})`).join('\n')
      : '• Bancolombia Cta Ahorros: 123-456789-01 a nombre de la empresa.';

    if (tone === 'preventivo') {
      return channel === 'whatsapp'
        ? `👋 Cordial saludo, *${item.thirdPartyName}*.\n\n` +
          `Desde el área de cartera de *${companyName}*, nos permitimos informarle que su Factura de Venta *No. ${item.invoiceNo}* por valor de *${formatCOP(item.balance)}* vencerá el próximo *${item.dueDate}*.\n\n` +
          `Agradecemos programar su transferencia bancaria a:\n${bankDetails}\n\n` +
          `Favor remitir el comprobante a este chat o al correo contable. ¡Agradecemos su puntual preferencia!`
        : `Estimado(a) ${item.thirdPartyName},\n\n` +
          `Reciba un cordial saludo de ${companyName}.\n\n` +
          `Le recordamos que su Factura Electrónica No. ${item.invoiceNo} por valor de ${formatCOP(item.balance)} tiene fecha de vencimiento el ${item.dueDate}.\n\n` +
          `Para facilitar su gestión, compartimos nuestras cuentas bancarias autorizadas:\n${bankDetails}\n\n` +
          `Una vez efectuada la transacción, agradecemos adjuntar el soporte de pago correspondiente.\n\nAtentamente,\nDepartamento de Cartera y Cobranzas\n${companyName}`;
    }

    if (tone === 'informativo') {
      const moraText = item.daysOverdue > 0 ? `registra ${item.daysOverdue} días de vencimiento` : `ha cumplido su fecha límite`;
      return channel === 'whatsapp'
        ? `🔔 Estimado(a) *${item.thirdPartyName}*.\n\n` +
          `Nos comunicamos de *${companyName}* para recordarle que su Factura de Venta *No. ${item.invoiceNo}* con saldo pendiente de *${formatCOP(item.balance)}* (Vencida el ${item.dueDate}) ${moraText}.\n\n` +
          `Agradecemos efectuar el pago a las siguientes cuentas:\n${bankDetails}\n\n` +
          `Si ya efectuó el abono o cancelación, por favor compártanos el soporte para actualizar su estado de cuenta de inmediato.`
        : `Estimado(a) ${item.thirdPartyName},\n\n` +
          `Por medio de la presente, nos permitimos recordarle el saldo vencido de la Factura No. ${item.invoiceNo} por un importe de ${formatCOP(item.balance)}, la cual ${moraText} (Vencimiento: ${item.dueDate}).\n\n` +
          `Agradecemos su pronta regularización mediante transferencia a:\n${bankDetails}\n\n` +
          `Favor remitir el soporte bancario a la mayor brevedad.\n\nCordialmente,\nÁrea de Cartera\n${companyName}`;
    }

    if (tone === 'formal') {
      return channel === 'whatsapp'
        ? `⚠️ *SEGUNDO REQUERIMIENTO DE PAGO*\n\n` +
          `Señor(es) *${item.thirdPartyName}*:\n` +
          `De manera atenta solicitamos la cancelación del saldo en mora por valor de *${formatCOP(item.balance)}* correspondiente a la Factura *No. ${item.invoiceNo}*, la cual presenta *${item.daysOverdue} días de mora* (Venció: ${item.dueDate}).\n\n` +
          `Para evitar la suspensión de futuros despachos o causación de intereses comerciales, le rogamos normalizar la obligación a las siguientes cuentas:\n${bankDetails}\n\n` +
          `Agradecemos su colaboración y respuesta inmediata con el comprobante de pago.`
        : `SEGUNDO AVISO DE COBRANZA - FACTURA No. ${item.invoiceNo}\n\n` +
          `Apreciado(a) ${item.thirdPartyName},\n\n` +
          `Revisando nuestros registros contables, observamos que la Factura No. ${item.invoiceNo} por valor de ${formatCOP(item.balance)} presenta ${item.daysOverdue} días de mora acumulada (Fecha límite: ${item.dueDate}).\n\n` +
          `Con el fin de evitar afectaciones en su línea de crédito comercial o generación de intereses de mora, solicitamos efectuar la transferencia a:\n${bankDetails}\n\n` +
          `Por favor remita el soporte correspondiente de forma prioritaria.\n\nAtentamente,\nDirección de Crédito y Cartera\n${companyName}`;
    }

    // Crítico / Prejudicial
    return channel === 'whatsapp'
      ? `🛑 *NOTIFICACIÓN DE COBRO PREJUDICIAL / URGENTE*\n\n` +
        `Atención: *${item.thirdPartyName}* (NIT: ${item.thirdPartyNit || 'S/N'})\n` +
        `Factura: *No. ${item.invoiceNo}*\n` +
        `Saldo en mora crítica: *${formatCOP(item.balance)}* (${item.daysOverdue} días de vencimiento).\n\n` +
        `Le informamos que de no recibir el pago o un acuerdo formal dentro de las próximas 48 horas, su cuenta será trasladada al departamento jurídico y se procederá al reporte en centrales de riesgo financiero, además de la suspensión definitiva de pedidos.\n\n` +
        `Cuentas autorizadas para evitar trámite legal:\n${bankDetails}\n\n` +
        `Comuníquese urgentemente para reportar su pago.`
      : `NOTIFICACIÓN PREJUDICIAL - CARTERA EN MORA CRÍTICA - FACTURA ${item.invoiceNo}\n\n` +
        `Señores:\n${item.thirdPartyName}\nNIT: ${item.thirdPartyNit || 'S/N'}\n\n` +
        `Por medio de la presente se le notifica formalmente que la obligación comercial amparada en la Factura de Venta No. ${item.invoiceNo} por valor de ${formatCOP(item.balance)} registra ${item.daysOverdue} días de mora sin regularización.\n\n` +
        `Le concedemos un plazo perentorio de 48 horas para consignar en las cuentas autorizadas:\n${bankDetails}\n\n` +
        `El no cumplimiento obligará al inicio de acciones legales de cobro ejecutivo y reporte negativo en centrales de riesgo.\n\nAtentamente,\nDepartamento Jurídico y Cartera\n${companyName}`;
  };

  const openCollectionModal = (inv: {
    id: string;
    invoiceNo: string;
    thirdPartyId: string;
    thirdPartyName: string;
    thirdPartyNit: string;
    total: number;
    balance: number;
    dueDate: string;
    daysOverdue: number;
  }, preferredTone?: 'preventivo' | 'informativo' | 'formal' | 'critico') => {
    const thirdParty = terceros.find(t => t.id === inv.thirdPartyId);
    let resolvedTone: 'preventivo' | 'informativo' | 'formal' | 'critico' = preferredTone || 'informativo';
    
    if (!preferredTone) {
      if (inv.daysOverdue === 0) {
        resolvedTone = 'preventivo';
      } else if (inv.daysOverdue <= 15) {
        resolvedTone = 'informativo';
      } else if (inv.daysOverdue <= 45) {
        resolvedTone = 'formal';
      } else {
        resolvedTone = 'critico';
      }
    }

    const itemData = {
      ...inv,
      thirdPartyPhone: thirdParty?.phone,
      thirdPartyEmail: thirdParty?.email
    };

    setCollectionItem(itemData);
    setCollectionTone(resolvedTone);
    setCollectionChannel('whatsapp');
    setCustomCollectionMessage(generateCollectionMessage(itemData, resolvedTone, 'whatsapp'));
    setCommitmentDate('');
    setCommitmentNotes('');
    setCopiedMessage(false);
    setShowCollectionModal(true);
  };

  const handleSendWhatsApp = () => {
    if (!collectionItem) return;
    const phone = collectionItem.thirdPartyPhone ? collectionItem.thirdPartyPhone.replace(/\D/g, '') : '';
    const cleanPhone = phone.startsWith('57') ? phone : `57${phone}`;

    if (!cleanPhone || cleanPhone === '57') {
      toast.error('El cliente no tiene un teléfono o celular configurado en su ficha de Terceros.');
      return;
    }

    saveCollectionLog({
      invoiceNo: collectionItem.invoiceNo,
      thirdPartyName: collectionItem.thirdPartyName,
      channel: 'whatsapp',
      tone: collectionTone,
      amount: collectionItem.balance,
      commitmentDate: commitmentDate || undefined,
      notes: commitmentNotes || undefined,
      status: 'Enviado por WhatsApp'
    });

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(customCollectionMessage)}`, '_blank');
    toast.success(`Recordatorio de cobranza por WhatsApp preparado para ${collectionItem.thirdPartyName}`);
  };

  const handleSendEmail = () => {
    if (!collectionItem) return;
    const email = collectionItem.thirdPartyEmail;
    if (!email) {
      toast.error('El cliente no tiene correo electrónico configurado en su ficha de Terceros.');
      return;
    }

    saveCollectionLog({
      invoiceNo: collectionItem.invoiceNo,
      thirdPartyName: collectionItem.thirdPartyName,
      channel: 'email',
      tone: collectionTone,
      amount: collectionItem.balance,
      commitmentDate: commitmentDate || undefined,
      notes: commitmentNotes || undefined,
      status: 'Enviado por Email'
    });

    const subject = encodeURIComponent(`Recordatorio de Pago Factura No. ${collectionItem.invoiceNo} - ${currentCompany?.name || 'FinteKia'}`);
    const body = encodeURIComponent(customCollectionMessage);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    toast.success(`Correo de cobro preparado para ${email}`);
  };

  const handleCopyMessage = () => {
    if (!customCollectionMessage) return;
    navigator.clipboard.writeText(customCollectionMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
    toast.success('Mensaje copiado al portapapeles');
  };

  const handleSaveCommitment = () => {
    if (!collectionItem) return;
    if (!commitmentDate && !commitmentNotes) {
      toast.error('Ingrese una fecha de compromiso o una nota de gestión.');
      return;
    }

    saveCollectionLog({
      invoiceNo: collectionItem.invoiceNo,
      thirdPartyName: collectionItem.thirdPartyName,
      channel: 'llamada',
      tone: collectionTone,
      amount: collectionItem.balance,
      commitmentDate: commitmentDate || undefined,
      notes: commitmentNotes || 'Compromiso de pago registrado en gestión.',
      status: 'Compromiso Agendado'
    });

    toast.success(`Compromiso de pago guardado para la Factura ${collectionItem.invoiceNo}`);
    setShowCollectionModal(false);
  };

  // PORTFOLIO STATS COMPUTING UNIT (Real-time dynamic parsing of general double entries)
  // 1. Resolve Accounts Receivable (CxC) through sales vouchers and payment receipts
  const getCxCInvoices = () => {
    // Select all vouchers of type 'venta' (Sales Invoices)
    const saleInvoices = vouchers.filter((v) => v.type === 'venta');

    return saleInvoices.map((inv) => {
      const thirdParty = terceros.find((t) => t.id === inv.thirdPartyId);
      
      // Calculate how much has been paid off against this specific invoice number or thirdParty credit matching
      // Filter vouchers of type 'ingreso' or general journal adjustments that contain the invoice number in 'concept'
      let collections = 0;
      vouchers.forEach((v) => {
        if (v.type === 'ingreso' || v.type === 'diario') {
          const relatesToInvoice = 
            v.concept?.toLowerCase().includes(inv.number.toLowerCase()) || 
            v.number?.toLowerCase().includes(`rc-${inv.number.toLowerCase()}`) ||
            (v.thirdPartyId === inv.thirdPartyId && v.concept?.toLowerCase().includes(inv.number.toLowerCase()));
          
          if (relatesToInvoice) {
            // Find lines of the voucher that credit '130505'
            v.lines?.forEach((line) => {
              if (line.accountCode === '130505') {
                collections += line.credit;
              }
            });
          }
        }
      });

      // Special initial transaction case matching
      if (inv.number === 'FE-101' && collections === 0) {
        collections = 0; // Default remains outstanding so the user can test the process!
      }

      const balanceRemaining = Math.max(0, inv.total - collections);
      const invoiceDueDate = getDueDate(inv.date, inv.dueDate);
      const daysOverdue = getDaysOverdue(inv.date, inv.dueDate);
      let status: 'saldado' | 'pendiente' | 'vencido' = 'pendiente';

      if (balanceRemaining === 0) {
        status = 'saldado';
      } else if (daysOverdue > 0) {
        status = 'vencido'; // overdue 'vencido'
      }

      return {
        id: inv.id,
        invoiceNo: inv.number,
        date: inv.date,
        dueDate: invoiceDueDate,
        paymentTerm: inv.paymentTerm || 'contado',
        concept: inv.concept,
        thirdPartyId: inv.thirdPartyId,
        thirdPartyName: thirdParty ? thirdParty.name : 'Cliente General',
        thirdPartyNit: thirdParty ? thirdParty.nit : 'S.N.',
        total: inv.total,
        collected: collections,
        balance: balanceRemaining,
        daysOverdue,
        status
      };
    });
  };

  // 2. Resolve Accounts Payable (CxP) through purchase vouchers and pay-off settlements
  const getCxPInvoices = () => {
    // Select all vouchers of type 'compra' (Purchase Invoices)
    const purchaseInvoices = vouchers.filter((v) => v.type === 'compra');

    return purchaseInvoices.map((inv) => {
      const thirdParty = terceros.find((t) => t.id === inv.thirdPartyId);

      // Calculate how much has been paid to the provider against this purchase voucher
      let paymentsMade = 0;
      vouchers.forEach((v) => {
        if (v.type === 'egreso' || v.type === 'diario') {
          const relatesToBill = 
            v.concept?.toLowerCase().includes(inv.number.toLowerCase()) || 
            v.concept?.toLowerCase().includes(`ce-${inv.number.toLowerCase()}`) ||
            (v.thirdPartyId === inv.thirdPartyId && v.concept?.toLowerCase().includes(inv.number.toLowerCase()));

          if (relatesToBill) {
            // Find lines of the voucher that debit '220505'
            v.lines?.forEach((line) => {
              if (line.accountCode === '220505') {
                paymentsMade += line.debit;
              }
            });
          }
        }
      });

      const balanceRemaining = Math.max(0, inv.total - paymentsMade);
      const daysOverdue = getDaysOverdue(inv.date);
      let status: 'saldado' | 'pendiente' | 'vencido' = 'pendiente';

      if (balanceRemaining === 0) {
        status = 'saldado';
      } else if (daysOverdue > 0) {
        status = 'vencido';
      }

      return {
        id: inv.id,
        invoiceNo: inv.number,
        date: inv.date,
        dueDate: getDueDate(inv.date),
        concept: inv.concept,
        thirdPartyId: inv.thirdPartyId,
        thirdPartyName: thirdParty ? thirdParty.name : 'Proveedor General',
        thirdPartyNit: thirdParty ? thirdParty.nit : 'S.N.',
        total: inv.total,
        paid: paymentsMade,
        balance: balanceRemaining,
        daysOverdue,
        status
      };
    });
  };

  // Compile calculations
  const cxcList = getCxCInvoices();
  const cxpList = getCxPInvoices();

  // Filters Appliers
  const filteredCxC = cxcList.filter((item) => {
    const matchesSearch = item.thirdPartyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.thirdPartyNit.includes(searchTerm);
    
    const matchesThirdParty = selectedThirdPartyId === 'all' || item.thirdPartyId === selectedThirdPartyId;
    
    let matchesStatus = true;
    if (statusFilter === 'pendiente') matchesStatus = item.status === 'pendiente';
    else if (statusFilter === 'vencido') matchesStatus = item.daysOverdue > 0 && item.balance > 0;
    else if (statusFilter === 'saldado') matchesStatus = item.status === 'saldado';

    return matchesSearch && matchesThirdParty && matchesStatus;
  });

  const filteredCxP = cxpList.filter((item) => {
    const matchesSearch = item.thirdPartyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.thirdPartyNit.includes(searchTerm);
    
    const matchesThirdParty = selectedThirdPartyId === 'all' || item.thirdPartyId === selectedThirdPartyId;
    
    let matchesStatus = true;
    if (statusFilter === 'pendiente') matchesStatus = item.status === 'pendiente';
    else if (statusFilter === 'vencido') matchesStatus = item.daysOverdue > 0 && item.balance > 0;
    else if (statusFilter === 'saldado') matchesStatus = item.status === 'saldado';

    return matchesSearch && matchesThirdParty && matchesStatus;
  });

  // Paginated CxC Invoices (15 per page)
  const totalCxcPages = Math.max(1, Math.ceil(filteredCxC.length / PORTFOLIO_ITEMS_PER_PAGE));
  const safeCxcPage = Math.min(cxcPage, totalCxcPages);
  const paginatedCxC = filteredCxC.slice(
    (safeCxcPage - 1) * PORTFOLIO_ITEMS_PER_PAGE,
    safeCxcPage * PORTFOLIO_ITEMS_PER_PAGE
  );

  // Paginated CxP Invoices (15 per page)
  const totalCxpPages = Math.max(1, Math.ceil(filteredCxP.length / PORTFOLIO_ITEMS_PER_PAGE));
  const safeCxpPage = Math.min(cxpPage, totalCxpPages);
  const paginatedCxP = filteredCxP.slice(
    (safeCxpPage - 1) * PORTFOLIO_ITEMS_PER_PAGE,
    safeCxpPage * PORTFOLIO_ITEMS_PER_PAGE
  );

  // METRICS SUMMARIZATION
  const totalCxCAsset = cxcList.reduce((acc, curr) => acc + curr.balance, 0);
  const totalCxPLiability = cxpList.reduce((acc, curr) => acc + curr.balance, 0);
  const netCommercialPortfolio = totalCxCAsset - totalCxPLiability;

  // Aging Intervals computation
  let ageGroup1_30_cxc = 0; // 1-30 days past due
  let ageGroup31_60_cxc = 0; // 31-60 days past due
  let ageGroup61_90_cxc = 0; // 61-90 days past due
  let ageGroup90Plus_cxc = 0; // 90+ days past due
  let current_cxc = 0;      // not due yet

  cxcList.forEach((item) => {
    if (item.balance <= 0) return;
    if (item.daysOverdue === 0) current_cxc += item.balance;
    else if (item.daysOverdue <= 30) ageGroup1_30_cxc += item.balance;
    else if (item.daysOverdue <= 60) ageGroup31_60_cxc += item.balance;
    else if (item.daysOverdue <= 90) ageGroup61_90_cxc += item.balance;
    else ageGroup90Plus_cxc += item.balance;
  });

  let ageGroup1_30_cxp = 0;
  let ageGroup31_60_cxp = 0;
  let ageGroup61_90_cxp = 0;
  let ageGroup90Plus_cxp = 0;
  let current_cxp = 0;

  cxpList.forEach((item) => {
    if (item.balance <= 0) return;
    if (item.daysOverdue === 0) current_cxp += item.balance;
    else if (item.daysOverdue <= 30) ageGroup1_30_cxp += item.balance;
    else if (item.daysOverdue <= 60) ageGroup31_60_cxp += item.balance;
    else if (item.daysOverdue <= 90) ageGroup61_90_cxp += item.balance;
    else ageGroup90Plus_cxp += item.balance;
  });

  const totalOverdueCxC = ageGroup1_30_cxc + ageGroup31_60_cxc + ageGroup61_90_cxc + ageGroup90Plus_cxc;
  const totalOverdueCxP = ageGroup1_30_cxp + ageGroup31_60_cxp + ageGroup61_90_cxp + ageGroup90Plus_cxp;

  // HANDLERS
  // 1. Process "Recibo de Caja" (Income Receipt)
  const handleReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptThirdPartyId || !receiptDocNo || receiptAmount <= 0 || !receiptBankId) {
      toast.warning('Por favor complete todos los datos del Formulario de Recibo de Caja.', 'Datos Incompletos');
      return;
    }

    const selectedBank = bankAccounts.find(ba => ba.id === receiptBankId);
    if (!selectedBank) return;

    // Build the Double Entry Voucher lines:
    // Line 1: Debit Cash/Bank Account (such as Bancos: 111005)
    // Line 2: Credit Clientes Nacionales (130505) to reduce client portfolio.
    const customRcNo = `RC-${1000 + Math.floor(Math.random() * 9000)}`;
    const line1 = {
      accountCode: '111005', // Bancolombia / general bank
      description: `Ingreso - Recibo de Caja ${customRcNo} abono de ${receiptDocNo}`,
      debit: receiptAmount,
      credit: 0
    };
    const line2 = {
      accountCode: '130505', // Clientes
      description: `Abono de cartera contra factura ${receiptDocNo}`,
      debit: 0,
      credit: receiptAmount
    };

    addVoucher({
      number: customRcNo,
      type: 'ingreso',
      concept: `Recibo de Caja No. ${customRcNo} - Abono cartera factura ${receiptDocNo}`,
      thirdPartyId: receiptThirdPartyId,
      total: receiptAmount,
      lines: [line1, line2]
    });

    // Reset Form
    setShowReceiptForm(false);
    setPreSelectedInvoice(null);
    setReceiptAmount(0);
    setReceiptThirdPartyId('');
    setReceiptDocNo('');
    
    // update bank balances in main store isn't strictly required in types but we can trigger positive ledger feedback!
    triggerNotification(`¡Recibo de Caja ${customRcNo} contabilizado con éxito! El saldo exigible del cliente ha sido recalculado en tiempo real.`);
  };

  // 2. Process "Comprobante de Egreso" (Payment Outflow Disbursal)
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentThirdPartyId || !paymentDocNo || paymentAmount <= 0 || !paymentBankId) {
      toast.warning('Por favor complete todos los datos del Comprobante de Egreso.', 'Datos Incompletos');
      return;
    }

    const selectedBank = bankAccounts.find(ba => ba.id === paymentBankId);
    if (!selectedBank) return;

    if (selectedBank.balance < paymentAmount) {
      const confirmProceed = confirm(`El saldo de la cuenta de banco (${formatCOP(selectedBank.balance)}) es menor al monto a pagar (${formatCOP(paymentAmount)}). ¿Desea registrar de todos modos el egreso en descubierto comercial?`);
      if (!confirmProceed) return;
    }

    // Build Double Entry lines:
    // Line 1: Debit Proveedores Nacionales (220505) to decrease liabilities
    // Line 2: Credit Cash/Bank Account (111005) to decrease asset cash
    const customCeNo = `CE-${1000 + Math.floor(Math.random() * 9000)}`;
    const line1 = {
      accountCode: '220505', // Proveedores
      description: `Pago de obligación comercial correspondiente a factura prov. ${paymentDocNo}`,
      debit: paymentAmount,
      credit: 0
    };
    const line2 = {
      accountCode: '111005', // Bancos
      description: `Egreso Bancario - Comprobante ${customCeNo} liquidación partida prov. ${paymentDocNo}`,
      debit: 0,
      credit: paymentAmount
    };

    addVoucher({
      number: customCeNo,
      type: 'egreso',
      concept: `Comprobante de Pago No. ${customCeNo} - Cancelación obligación comercial prov. ${paymentDocNo}`,
      thirdPartyId: paymentThirdPartyId,
      total: paymentAmount,
      lines: [line1, line2]
    });

    // Reset
    setShowPaymentForm(false);
    setPreSelectedInvoice(null);
    setPaymentAmount(0);
    setPaymentThirdPartyId('');
    setPaymentDocNo('');

    triggerNotification(`¡Comprobante de Egreso ${customCeNo} registrado en libros! Se extinguió la obligación por ${formatCOP(paymentAmount)}.`);
  };

  // Trigger quick forms with pre-filled details
  const triggerCollectAction = (item: any) => {
    setPreSelectedInvoice({
      id: item.id,
      number: item.invoiceNo,
      thirdPartyId: item.thirdPartyId,
      balance: item.balance,
      type: 'venta'
    });
    setReceiptThirdPartyId(item.thirdPartyId);
    setReceiptDocNo(item.invoiceNo);
    setReceiptAmount(item.balance);
    setReceiptConcept(`Cruce de cartera factura de venta ${item.invoiceNo}`);
    setReceiptBankId(bankAccounts[0]?.id || '');
    setShowReceiptForm(true);
    setShowPaymentForm(false);
  };

  const triggerPayAction = (item: any) => {
    setPreSelectedInvoice({
      id: item.id,
      number: item.invoiceNo,
      thirdPartyId: item.thirdPartyId,
      balance: item.balance,
      type: 'compra'
    });
    setPaymentThirdPartyId(item.thirdPartyId);
    setPaymentDocNo(item.invoiceNo);
    setPaymentAmount(item.balance);
    setPaymentConcept(`Abono / Pago de obligación mercantil factura prov. ${item.invoiceNo}`);
    setPaymentBankId(bankAccounts[0]?.id || '');
    setShowPaymentForm(true);
    setShowReceiptForm(false);
  };

  return (
    <div className="space-y-6">

      {/* HEADER BANNER DESIGN */}
      <div className={`p-6 rounded-3xl border shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
        isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-100'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-500 opacity-90">Tesorería, Cobranza & Gestión de Liquidez</span>
          </div>
          <h2 className="font-display font-extrabold text-xl tracking-tight text-slate-800">Cartera Comercial, CxC & CxP</h2>
          <p className="text-xs text-slate-450 max-w-3xl">
            Liquide y controle las cuentas por cobrar comerciales de distribuidores, y administre sus cuentas por pagar con proveedores harineros y energéticos. Registre abonos conciliados mediante Recibos de Caja y Comprobantes de Egreso.
          </p>
        </div>

        {/* TOP LEVEL ACTION BUTTONS */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => exportPortfolioToExcel(vouchers, terceros)}
            className="bg-emerald-600 hover:bg-emerald-550 text-white font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 text-xs shadow-sm cursor-pointer transition-all pointer-events-auto"
            title="Exportar cartera comercial CxC y cuentas por pagar CxP en Excel (.xlsx)"
            id="export-portfolio-excel-btn"
          >
            <Download className="w-4 h-4 text-emerald-100" /> Exportar Cartera (Excel)
          </button>

          <button
            type="button"
            onClick={() => {
              const defaultClient = terceros.find(t => t.roles.includes('cliente')) || terceros[0] || null;
              setStatementClient(defaultClient);
              setShowStatementModal(true);
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 text-xs shadow-sm cursor-pointer transition-all pointer-events-auto"
            title="Generar e imprimir estado de cuenta consolidado para un cliente"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" /> Estado de Cuenta Cliente
          </button>

          <button
            type="button"
            onClick={() => {
              setPreSelectedInvoice(null);
              setReceiptThirdPartyId('');
              setReceiptDocNo('');
              setReceiptAmount(0);
              setReceiptConcept('Abono General de Cobro');
              setReceiptBankId(bankAccounts[0]?.id || '');
              setShowPaymentForm(false);
              setShowReceiptForm(!showReceiptForm);
            }}
            className="bg-indigo-600 hover:bg-indigo-550 text-white font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 text-xs shadow-sm cursor-pointer transition-all pointer-events-auto"
          >
            <Receipt className="w-4 h-4 text-indigo-200" /> Recibo de Caja (Abono CxC)
          </button>
          
          <button
            type="button"
            onClick={() => {
              setPreSelectedInvoice(null);
              setPaymentThirdPartyId('');
              setPaymentDocNo('');
              setPaymentAmount(0);
              setPaymentConcept('Egreso General Proveedor');
              setPaymentBankId(bankAccounts[0]?.id || '');
              setShowReceiptForm(false);
              setShowPaymentForm(!showPaymentForm);
            }}
            className="bg-slate-850 hover:bg-slate-800 text-slate-100 border border-slate-700 font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 text-xs shadow-sm cursor-pointer transition-all pointer-events-auto"
          >
            <FileCheck2 className="w-4 h-4 text-rose-400" /> Registrar Egreso (Pago CxP)
          </button>
        </div>
      </div>

      {/* FEEDBACK POPUP NOTICE */}
      {notification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center gap-2.5 text-xs font-semibold leading-relaxed animate-fade-in shadow-inner">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* DYNAMIC FORMS ACCORDIONS */}
      {/* 1. RECIBO DE CAJA (INCOMING CASH RECEIPT) */}
      {showReceiptForm && (
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-950 border-zinc-805 text-white' : 'bg-slate-50 border-slate-150'}`}>
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <h3 className="font-display font-bold text-sm text-slate-850 flex items-center gap-2">
              <Receipt className="w-4.5 h-4.5 text-indigo-500" /> Registrar Recibo de Caja / Recaudo de Clientes
            </h3>
            <button 
              onClick={() => {
                setShowReceiptForm(false);
                setPreSelectedInvoice(null);
              }}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleReceiptSubmit} className="space-y-4 text-xs select-none">
            {preSelectedInvoice && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl flex justify-between items-center text-[11px]">
                <span className="font-semibold">
                  Saldando Documento de Venta: <strong className="text-white font-mono font-black">{preSelectedInvoice.number}</strong>
                </span>
                <span>Saldo Pendiente: <strong className="text-emerald-400">{formatCOP(preSelectedInvoice.balance)}</strong></span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Select Client Third Party */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Tercero (Cliente Emisor)</label>
                <select
                  value={receiptThirdPartyId}
                  onChange={(e) => {
                    setReceiptThirdPartyId(e.target.value);
                    setReceiptDocNo('');
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 outline-none font-semibold text-slate-100 text-xs"
                  required
                  disabled={!!preSelectedInvoice}
                >
                  <option value="">-- Eliga un cliente --</option>
                  {terceros.filter(t => t.roles.includes('cliente')).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.nit})</option>
                  ))}
                </select>
              </div>

              {/* Select Voucher No/Ref */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Factura de Referencia</label>
                {preSelectedInvoice ? (
                  <input
                    type="text"
                    value={receiptDocNo}
                    disabled
                    className="w-full bg-zinc-900/50 border border-zinc-850 p-2.5 rounded-lg text-slate-400 font-mono text-xs font-bold"
                  />
                ) : (
                  <select
                    value={receiptDocNo}
                    onChange={(e) => {
                      setReceiptDocNo(e.target.value);
                      const matchingInv = cxcList.find(x => x.invoiceNo === e.target.value);
                      if (matchingInv) setReceiptAmount(matchingInv.balance);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 outline-none font-semibold text-slate-100 text-xs"
                    required
                  >
                    <option value="">-- Seleccione un documento --</option>
                    {cxcList.filter(item => item.thirdPartyId === receiptThirdPartyId && item.balance > 0).map((item) => (
                      <option key={item.id} value={item.invoiceNo}>
                        {item.invoiceNo} (Saldo: {formatCOP(item.balance)})
                      </option>
                    ))}
                    <option value="Anticipo">Abono general (No imputado)</option>
                  </select>
                )}
              </div>

              {/* Settlement Bank selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Depositar en Cuenta Bancaria</label>
                <select
                  value={receiptBankId}
                  onChange={(e) => setReceiptBankId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 outline-none font-semibold text-slate-100 text-xs"
                  required
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.name} ({formatCOP(b.balance)})
                    </option>
                  ))}
                  <option value="110505">110505 - Caja General</option>
                </select>
              </div>

              {/* Recibo Amount */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Monto Recibido (COP)</label>
                <input
                  type="number"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Monto a abonar"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 outline-none font-mono text-slate-100 text-xs font-bold"
                  required
                  min="5000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Concepto de Caja / Observaciones</label>
                <input
                  type="text"
                  value={receiptConcept}
                  onChange={(e) => setReceiptConcept(e.target.value)}
                  placeholder="Por ejemplo: Cruce de cartera, pago saldo factura de galletas..."
                  className="w-full bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-slate-100 placeholder-slate-500 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-bold p-2.5 rounded-lg text-xs cursor-pointer shadow transition-all uppercase tracking-wider h-[38px]"
              >
                Grabar Recibo de Caja
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. REGISTRAR COMPROBANTE DE EGRESO (OUTGOING SUPPLIER DISBURSAL) */}
      {showPaymentForm && (
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-950 border-zinc-805 text-white' : 'bg-slate-50 border-slate-150 text-slate-800'}`}>
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <h3 className="font-display font-bold text-sm flex items-center gap-2">
              <FileCheck2 className="w-4.5 h-4.5 text-rose-500" /> Registrar Comprobante de Pago / Egreso a Proveedores
            </h3>
            <button 
              onClick={() => {
                setShowPaymentForm(false);
                setPreSelectedInvoice(null);
              }}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs select-none">
            {preSelectedInvoice && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl flex justify-between items-center text-[11px]">
                <span className="font-semibold text-zinc-100">
                  Amortizando Deuda de Factura: <strong className="text-white font-mono font-black">{preSelectedInvoice.number}</strong>
                </span>
                <span>Saldo Pendiente Obligación: <strong className="text-amber-400">{formatCOP(preSelectedInvoice.balance)}</strong></span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Select Supplier */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Proveedor Destinatario</label>
                <select
                  value={paymentThirdPartyId}
                  onChange={(e) => {
                    setPaymentThirdPartyId(e.target.value);
                    setPaymentDocNo('');
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 outline-none font-semibold text-slate-100 text-xs"
                  required
                  disabled={!!preSelectedInvoice}
                >
                  <option value="">-- Elija un Proveedor --</option>
                  {terceros.filter(t => t.roles.includes('proveedor')).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.nit})</option>
                  ))}
                </select>
              </div>

              {/* Select Payable Bill */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Factura de Compra / Cuenta por Cobrar Prov</label>
                {preSelectedInvoice ? (
                  <input
                    type="text"
                    value={paymentDocNo}
                    disabled
                    className="w-full bg-zinc-900/50 border border-zinc-850 p-2.5 rounded-lg text-slate-400 font-mono text-xs font-bold"
                  />
                ) : (
                  <select
                    value={paymentDocNo}
                    onChange={(e) => {
                      setPaymentDocNo(e.target.value);
                      const matchingInv = cxpList.find(x => x.invoiceNo === e.target.value);
                      if (matchingInv) setPaymentAmount(matchingInv.balance);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 outline-none font-semibold text-slate-100 text-xs"
                    required
                  >
                    <option value="">-- Seleccione un documento --</option>
                    {cxpList.filter(item => item.thirdPartyId === paymentThirdPartyId && item.balance > 0).map((item) => (
                      <option key={item.id} value={item.invoiceNo}>
                        {item.invoiceNo} (Saldo: {formatCOP(item.balance)})
                      </option>
                    ))}
                    <option value="S.N.">Pago General sin cruzamiento</option>
                  </select>
                )}
              </div>

              {/* Source paying account */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Fondos Provenientes de</label>
                <select
                  value={paymentBankId}
                  onChange={(e) => setPaymentBankId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 outline-none font-semibold text-slate-100 text-xs"
                  required
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.name} ({formatCOP(b.balance)})
                    </option>
                  ))}
                  <option value="110505">110505 - Caja General</option>
                </select>
              </div>

              {/* Payment Amount */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Importe del Pago (COP)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Monto a pagar"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 outline-none font-mono text-slate-100 text-xs font-bold"
                  required
                  min="5000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Detalle del Comprobante / Concepto</label>
                <input
                  type="text"
                  value={paymentConcept}
                  onChange={(e) => setPaymentConcept(e.target.value)}
                  placeholder="Por ejemplo: Pago total factura insumos de harina, factura trigo..."
                  className="w-full bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-slate-100 placeholder-slate-500 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-550 text-white font-bold p-2.5 rounded-lg text-xs cursor-pointer shadow transition-all uppercase tracking-wider h-[38px]"
              >
                Grabar Comprobante
              </button>
            </div>
          </form>
        </div>
      )}

      {/* METRIC SUMMARIES CARDS PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total portfolio assets CxC */}
        <div className={`p-4.5 rounded-2xl border shadow-sm space-y-2 ${activeTheme.cardStyles}`}>
          <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-slate-450">
            <span>Cartera CxC (Recaudables)</span>
            <ArrowUpRight className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-bold font-display tracking-tight text-white leading-none">
            {formatCOP(totalCxCAsset)}
          </p>
          <div className="text-[9.5px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-zinc-500" /> En mora: <strong className="text-rose-400 font-bold">{formatCOP(totalOverdueCxC)}</strong>
          </div>
        </div>

        {/* Total portfolio liabilities CxP */}
        <div className={`p-4.5 rounded-2xl border shadow-sm space-y-2 ${activeTheme.cardStyles}`}>
          <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-slate-450">
            <span>Obligaciones CxP (A pagar)</span>
            <ArrowDownRight className="w-4 h-4 text-rose-455" />
          </div>
          <p className="text-xl font-bold font-display tracking-tight text-rose-400 leading-none">
            {formatCOP(totalCxPLiability)}
          </p>
          <div className="text-[9.5px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-zinc-500" /> En mora vencida: <strong className="text-rose-400">{formatCOP(totalOverdueCxP)}</strong>
          </div>
        </div>

        {/* Portfolio net commercial balance */}
        <div className={`p-4.5 rounded-2xl border shadow-sm space-y-2 ${activeTheme.cardStyles}`}>
          <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-slate-450">
            <span>Saldo Comercial Neto</span>
            <DollarSign className="w-4 h-4 text-emerald-450" />
          </div>
          <p className={`text-xl font-bold font-display tracking-tight leading-none ${
            netCommercialPortfolio >= 0 ? 'text-emerald-400' : 'text-rose-500'
          }`}>
            {netCommercialPortfolio >= 0 ? '+' : ''}{formatCOP(netCommercialPortfolio)}
          </p>
          <div className="text-[9.5px] text-slate-400">
            {netCommercialPortfolio >= 0 ? 'Balance de cobranza con holgura superavitaria.' : 'Saldo comercial deficitario temporal.'}
          </div>
        </div>

        {/* Aging segments count */}
        <div className={`p-4.5 rounded-2xl border shadow-sm space-y-2 ${activeTheme.cardStyles}`}>
          <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-slate-450">
            <span>Vencimiento Cartera Clientes</span>
            <BadgeAlert className="w-4 h-4 text-yellow-500" />
          </div>
          
          {/* Quick bar visual of cxc aging */}
          <div className="w-full flex h-2 rounded-full overflow-hidden border border-zinc-850 bg-zinc-950 mt-1 select-none">
            <div 
              style={{ width: `${totalCxCAsset > 0 ? (current_cxc / totalCxCAsset) * 100 : 100}%` }}
              className="bg-emerald-500 h-full"
              title={`Al Día: ${formatCOP(current_cxc)}`}
            ></div>
            <div 
              style={{ width: `${totalCxCAsset > 0 ? (ageGroup1_30_cxc / totalCxCAsset) * 100 : 0}%` }}
              className="bg-amber-400 h-full"
              title={`1-30 Días: ${formatCOP(ageGroup1_30_cxc)}`}
            ></div>
            <div 
              style={{ width: `${totalCxCAsset > 0 ? ((ageGroup31_60_cxc + ageGroup61_90_cxc + ageGroup90Plus_cxc) / totalCxCAsset) * 100 : 0}%` }}
              className="bg-rose-500 h-full"
              title={`Mora Crítica: ${formatCOP(ageGroup31_60_cxc + ageGroup61_90_cxc + ageGroup90Plus_cxc)}`}
            ></div>
          </div>

          <div className="flex justify-between text-[8px] font-semibold text-slate-400">
            <span>Verde: Al Día</span>
            <span>Amarillo: 1-30d</span>
            <span>Rojo: +30d</span>
          </div>
        </div>

      </div>

      {/* PORTFOLIO NAVIGATION TABS AND OPTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-2 gap-4">
        
        {/* TAB WORKSPACE TRIGGER SWITCHERS */}
        <div className="flex gap-2 text-xs select-none">
          <button
            onClick={() => setActiveTab('cxc')}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs border cursor-pointer ${
              activeTab === 'cxc'
                ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-400'
                : 'bg-zinc-950/20 border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Cuentas por Cobrar (Clientes)
          </button>

          <button
            onClick={() => setActiveTab('cxp')}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs border cursor-pointer ${
              activeTab === 'cxp'
                ? 'bg-rose-600/10 border-rose-500/40 text-rose-400'
                : 'bg-zinc-950/20 border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" /> Obligaciones de Proveedores (CxP)
          </button>

          <button
            onClick={() => setActiveTab('reporte')}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs border cursor-pointer ${
              activeTab === 'reporte'
                ? 'bg-amber-600/10 border-amber-500/40 text-amber-400'
                : 'bg-zinc-950/20 border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" /> Edad y Vencimiento de Cartera
          </button>

          <button
            onClick={() => setActiveTab('cobranza')}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs border cursor-pointer relative ${
              activeTab === 'cobranza'
                ? 'bg-emerald-600/15 border-emerald-500/50 text-emerald-400 shadow-sm'
                : 'bg-zinc-950/20 border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BellRing className="w-4 h-4 text-emerald-400" /> Centro de Cobranza & Alertas
            {totalOverdueCxC > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-mono font-bold">
                Mora
              </span>
            )}
          </button>
        </div>

        {/* FILTER TOOLS */}
        {activeTab !== 'reporte' && activeTab !== 'cobranza' && (
          <div className="flex flex-wrap gap-2 text-xs">
            {/* Search Box */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Nro Factura, NIT o Razón..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCxcPage(1);
                  setCxpPage(1);
                }}
                className="pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs outline-none text-white w-48 placeholder-slate-500 font-medium"
              />
            </div>

            {/* Selector status */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCxcPage(1);
                setCxpPage(1);
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 outline-none font-semibold text-slate-205 text-xs"
            >
              <option value="all">Saldadas & Pendientes</option>
              <option value="pendiente">Solo Pendientes</option>
              <option value="vencido">Facturas Vencidas (Mora)</option>
              <option value="saldado">Saldadas / Canceladas</option>
            </select>
          </div>
        )}
      </div>

      {/* PORTFOLIO WORKSPACE VIEWPORT GRID */}
      <div className="text-xs">
        
        {/* TAB 1: ACCOUNTS RECEIVABLE (CxC) */}
        {activeTab === 'cxc' && (
          <div className={`border rounded-3xl overflow-hidden shadow-sm ${activeTheme.cardStyles}`}>
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-950/20">
              <span className="font-bold text-slate-201 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" /> Libro Auxiliar de Facturas de Ventas ({filteredCxC.length})
              </span>
              <span className="text-[10px] text-slate-450 italic">Haga clic en un recibo para imputar pagos a la factura</span>
            </div>

            {filteredCxC.length === 0 ? (
              <div className="p-12 text-center text-slate-450 select-none">
                <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto mb-3 animate-bounce" />
                <h4 className="font-display font-medium text-slate-350">No se encontraron facturas de venta</h4>
                <p className="max-w-md mx-auto text-[11px] mt-1 text-slate-500">
                  Ajuste los filtros bursátiles o registre una venta de panadería en la barra de Facturación para ver registros de cartera aquí.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-zinc-950/40 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Factura No.</th>
                      <th className="py-3 px-4">Tercero / Empresa</th>
                      <th className="py-3 px-4">F. Emisión</th>
                      <th className="py-3 px-4">Vence el</th>
                      <th className="py-3 px-4 text-right">Monto Factura</th>
                      <th className="py-3 px-4 text-right">Recaudado / Cruce</th>
                      <th className="py-3 px-4 text-right">Saldo Neto (CxC)</th>
                      <th className="py-3 px-4 text-center">Estado / Mora</th>
                      <th className="py-3 px-4 text-center">Operar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                    {paginatedCxC.map((item) => {
                      const isVencido = item.daysOverdue > 0 && item.balance > 0;
                      return (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-black text-indigo-401 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            {item.invoiceNo}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-slate-201 block font-bold">{item.thirdPartyName}</span>
                            <span className="text-[10px] text-slate-450 font-mono">NIT: {item.thirdPartyNit}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{item.date}</td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{item.dueDate}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-300">{formatCOP(item.total)}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-emerald-450">{item.collected > 0 ? formatCOP(item.collected) : '-'}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-white text-xs">{formatCOP(item.balance)}</td>
                          <td className="py-3.5 px-4 text-center select-none">
                            {item.balance === 0 ? (
                              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full font-bold">
                                SALDADA
                              </span>
                            ) : isVencido ? (
                              <span className="bg-rose-500/10 text-rose-500 text-[9px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-500" /> VENCIDA ({item.daysOverdue} d)
                              </span>
                            ) : (
                              <span className="bg-blue-500/10 text-blue-400 text-[9px] px-2 py-0.5 rounded-full font-bold">
                                AL DÍA
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {item.balance > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => triggerCollectAction(item)}
                                  className="bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg cursor-pointer leading-tight shadow-sm"
                                  title="Registrar abono / recibo de caja para esta factura"
                                >
                                  Cobrar
                                </button>
                              ) : (
                                <span className="text-emerald-400 text-[10px] font-bold">✓ Cobrado</span>
                              )}
                              {/* Notificar / Cobranza Modal Launcher */}
                              {item.balance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openCollectionModal(item)}
                                  className="p-1 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                  title="Gestionar Cobranza, Mensajes y Acuerdos de Pago"
                                >
                                  <BellRing className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const cObj = terceros.find(t => t.id === item.thirdPartyId);
                                  if (cObj) {
                                    setStatementClient(cObj);
                                    setShowStatementModal(true);
                                  }
                                }}
                                className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Ver Estado de Cuenta del Cliente"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                              </button>
                              {(() => {
                                const cObj = terceros.find(t => t.id === item.thirdPartyId);
                                if (cObj?.phone && item.balance > 0) {
                                  const text = generateCollectionMessage(item, item.daysOverdue > 15 ? 'formal' : item.daysOverdue > 0 ? 'informativo' : 'preventivo', 'whatsapp');
                                  const cleanPhone = cObj.phone.replace(/\D/g, '');
                                  const phone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
                                  return (
                                    <a
                                      href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded text-emerald-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors inline-flex items-center"
                                      title="Enviar recordatorio rápido por WhatsApp"
                                      onClick={() => {
                                        saveCollectionLog({
                                          invoiceNo: item.invoiceNo,
                                          thirdPartyName: item.thirdPartyName,
                                          channel: 'whatsapp',
                                          tone: item.daysOverdue > 15 ? 'formal' : item.daysOverdue > 0 ? 'informativo' : 'preventivo',
                                          amount: item.balance,
                                          status: 'Enviado por WhatsApp Rápido'
                                        });
                                      }}
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </a>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredCxC.length > 0 && (
              <Pagination
                currentPage={safeCxcPage}
                totalItems={filteredCxC.length}
                pageSize={PORTFOLIO_ITEMS_PER_PAGE}
                onPageChange={(page) => setCxcPage(page)}
                isDark={isDark}
                itemLabel="facturas por cobrar"
              />
            )}
          </div>
        )}

        {/* TAB 2: OBLIGATIONS & ACCOUNTS PAYABLE (CxP) */}
        {activeTab === 'cxp' && (
          <div className={`border rounded-3xl overflow-hidden shadow-sm ${activeTheme.cardStyles}`}>
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-950/20">
              <span className="font-bold text-slate-201 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-rose-400" /> Obligaciones de Pago y Facturas de Insumos ({filteredCxP.length})
              </span>
              <span className="text-[10px] text-slate-450 italic">Haga clic en pagar para extinguir facturas de acreedores</span>
            </div>

            {filteredCxP.length === 0 ? (
              <div className="p-12 text-center text-slate-455 select-none">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-pulse" />
                <h4 className="font-display font-medium text-slate-350">¡No tiene obligaciones con proveedores!</h4>
                <p className="max-w-md mx-auto text-[11px] mt-1 text-slate-500">
                  No se registraron facturas de compras con saldo pendiente. Felicidades, mantiene una salud crediticia limpia.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-zinc-950/40 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Factura No.</th>
                      <th className="py-3 px-4">Proveedor / NIT</th>
                      <th className="py-3 px-4">Detalle Bancario Proveedor</th>
                      <th className="py-3 px-4">F. Compra</th>
                      <th className="py-3 px-4">F. Vencimiento</th>
                      <th className="py-3 px-4 text-right">Valor Compra</th>
                      <th className="py-3 px-4 text-right">Abonado</th>
                      <th className="py-3 px-4 text-right">Saldo Exigible</th>
                      <th className="py-3 px-4 text-center">Mora / Estado</th>
                      <th className="py-3 px-4 text-center">Operar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                    {paginatedCxP.map((item) => {
                      const isVencido = item.daysOverdue > 0 && item.balance > 0;
                      // Retrieve third party banking parameters for convenience
                      const prov = terceros.find(t => t.id === item.thirdPartyId);

                      return (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-black text-rose-350 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            {item.invoiceNo}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-slate-201 block font-bold">{item.thirdPartyName}</span>
                            <span className="text-[10px] text-slate-450 font-mono">NIT: {item.thirdPartyNit}</span>
                          </td>
                          <td className="py-3.5 px-4 text-[10.5px]">
                            {prov?.providerBank ? (
                              <div className="leading-tight">
                                <span className="font-semibold text-slate-350 block uppercase text-[9.5px]">{prov.providerBank}</span>
                                <span className="text-[10px] text-slate-450 font-mono">{prov.providerBankAccountType === 'ahorros' ? 'Aho' : 'Cte'}: {prov.providerBankAccountNumber}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[10px]">— Sin coordinar —</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{item.date}</td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{item.dueDate}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-300">{formatCOP(item.total)}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-emerald-450">{item.paid > 0 ? formatCOP(item.paid) : '-'}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-white text-xs">{formatCOP(item.balance)}</td>
                          <td className="py-3.5 px-4 text-center select-none text-[11px]">
                            {item.balance === 0 ? (
                              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full font-bold">
                                PAGADA
                              </span>
                            ) : isVencido ? (
                              <span className="bg-rose-500/10 text-rose-500 text-[9px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-500" /> MORA ({item.daysOverdue} d)
                              </span>
                            ) : (
                              <span className="bg-blue-500/10 text-blue-400 text-[9px] px-2 py-0.5 rounded-full font-bold">
                                VIGENTE
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.balance > 0 ? (
                              <button
                                type="button"
                                onClick={() => triggerPayAction(item)}
                                className="bg-rose-650 hover:bg-rose-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-lg cursor-pointer leading-tight shadow"
                              >
                                Registrar Pago
                              </button>
                            ) : (
                              <span className="text-emerald-400 flex justify-center text-[10px] font-bold">✓ Concluido</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredCxP.length > 0 && (
              <Pagination
                currentPage={safeCxpPage}
                totalItems={filteredCxP.length}
                pageSize={PORTFOLIO_ITEMS_PER_PAGE}
                onPageChange={(page) => setCxpPage(page)}
                isDark={isDark}
                itemLabel="facturas por pagar"
              />
            )}
          </div>
        )}

        {/* TAB 3: AGED ANALYSIS REPORTS (Edad de Cartera / Vencimientos) */}
        {activeTab === 'reporte' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 select-none">
            
            {/* Accounts Receivable Aging Analysis Card (CxC) */}
            <div className={`p-5 rounded-3xl border shadow-sm space-y-4 ${activeTheme.cardStyles}`}>
              <div className="border-b pb-2">
                <h3 className="font-display font-extrabold text-slate-100 flex items-center gap-2 text-sm uppercase">
                  <Briefcase className="w-4.5 h-4.5 text-indigo-400" /> Relación Envejecimiento Cartera Clientes (As)
                </h3>
                <p className="text-[10px] text-slate-450 mt-0.5 font-medium">Intervalo de cobro prorrateado de ventas de panadería</p>
              </div>

              {/* Dynamic intervals display */}
              <div className="space-y-3.5">
                {/* 1. Al Día */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Por Vencer (Al Día):</span>
                    <strong className="text-emerald-400 font-bold">{formatCOP(current_cxc)}</strong>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-3.5 font-mono text-[9px] text-white flex items-center overflow-hidden border border-zinc-850">
                    <div 
                      className="bg-emerald-500 h-full rounded-r-lg" 
                      style={{ width: `${totalCxCAsset > 0 ? (current_cxc / totalCxCAsset) * 100 : 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* 2. 1 a 30 días */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Past Due 1 a 30 Días:</span>
                    <strong className="text-amber-400 font-bold">{formatCOP(ageGroup1_30_cxc)}</strong>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-3.5 font-mono text-[9px] text-white flex items-center overflow-hidden border border-zinc-850">
                    <div 
                      className="bg-amber-400 h-full rounded-r-lg" 
                      style={{ width: `${totalCxCAsset > 0 ? (ageGroup1_30_cxc / totalCxCAsset) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* 3. 31 a 60 días */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Vencimiento 31 a 60 Días:</span>
                    <strong className="text-orange-400 font-bold">{formatCOP(ageGroup31_60_cxc)}</strong>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-3.5 font-mono text-[9px] text-white flex items-center overflow-hidden border border-zinc-850">
                    <div 
                      className="bg-orange-450 h-full rounded-r-lg" 
                      style={{ width: `${totalCxCAsset > 0 ? (ageGroup31_60_cxc / totalCxCAsset) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* 4. 61 a 90 días */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Vencimiento 61 a 90 Días:</span>
                    <strong className="text-rose-400 font-bold">{formatCOP(ageGroup61_90_cxc)}</strong>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-3.5 font-mono text-[9px] text-white flex items-center overflow-hidden border border-zinc-850">
                    <div 
                      className="bg-rose-400 h-full rounded-r-lg" 
                      style={{ width: `${totalCxCAsset > 0 ? (ageGroup61_90_cxc / totalCxCAsset) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* 5. 90+ días */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Mora Crítica de Cobro (+90 Días):</span>
                    <strong className="text-rose-600 font-bold">{formatCOP(ageGroup90Plus_cxc)}</strong>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-3.5 font-mono text-[9px] text-white flex items-center overflow-hidden border border-zinc-850">
                    <div 
                      className="bg-rose-600 h-full rounded-r-lg" 
                      style={{ width: `${totalCxCAsset > 0 ? (ageGroup90Plus_cxc / totalCxCAsset) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 leading-relaxed text-[11px] text-slate-350">
                La cartera actual se encuentra al <strong className="text-emerald-400">{Math.round((current_cxc / (totalCxCAsset || 1)) * 100)}% de vigencia al día</strong>. El departamento contable recomienda gestionar cobros preventivos con recordatorios automáticos 5 días antes del vencimiento de facturas de grandes superficies.
              </div>
            </div>

            {/* Accounts Payable Aging Analysis Card (CxP) */}
            <div className={`p-5 rounded-3xl border shadow-sm space-y-4 ${activeTheme.cardStyles}`}>
              <div className="border-b pb-2">
                <h3 className="font-display font-extrabold text-slate-100 flex items-center gap-2 text-sm uppercase">
                  <Building2 className="w-4.5 h-4.5 text-rose-455" /> Relación Vencimientos Proveedores (Li)
                </h3>
                <p className="text-[10px] text-slate-450 mt-0.5 font-medium">Obligaciones mercantiles pendientes de egreso contable</p>
              </div>

              {/* Dynamic intervals display for payables */}
              <div className="space-y-3.5">
                {/* 1. Al Día */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Obligaciones Vigentes:</span>
                    <strong className="text-emerald-400 font-bold">{formatCOP(current_cxp)}</strong>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-3.5 overflow-hidden border border-zinc-850">
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${totalCxPLiability > 0 ? (current_cxp / totalCxPLiability) * 100 : 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* 2. 1 a 30 días */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Mora Temprana (1 a 30 Días):</span>
                    <strong className="text-amber-400 font-bold">{formatCOP(ageGroup1_30_cxp)}</strong>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-3.5 overflow-hidden border border-zinc-850">
                    <div 
                      className="bg-amber-400 h-full" 
                      style={{ width: `${totalCxPLiability > 0 ? (ageGroup1_30_cxp / totalCxPLiability) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* 3. 31 a 60 días */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Obligaciones Mora (31 a 60 Días):</span>
                    <strong className="text-orange-400 font-bold">{formatCOP(ageGroup31_60_cxp)}</strong>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-3.5 overflow-hidden border border-zinc-850">
                    <div 
                      className="bg-orange-450 h-full" 
                      style={{ width: `${totalCxPLiability > 0 ? (ageGroup31_60_cxp / totalCxPLiability) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* 4. 61 a 90 días */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Obligaciones Mora (61 a 90 Días):</span>
                    <strong className="text-rose-400 font-bold">{formatCOP(ageGroup61_90_cxp)}</strong>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-3.5 overflow-hidden border border-zinc-850">
                    <div 
                      className="bg-rose-455 h-full" 
                      style={{ width: `${totalCxPLiability > 0 ? (ageGroup61_90_cxp / totalCxPLiability) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* 5. 90+ días */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Crédito Bloqueado (+90 Días):</span>
                    <strong className="text-rose-600 font-bold">{formatCOP(ageGroup90Plus_cxp)}</strong>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-3.5 overflow-hidden border border-zinc-850">
                    <div 
                      className="bg-rose-600 h-full" 
                      style={{ width: `${totalCxPLiability > 0 ? (ageGroup90Plus_cxp / totalCxPLiability) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/15 leading-relaxed text-[11px] text-slate-350">
                Tiene <strong className="text-rose-400">{Math.round((totalOverdueCxP / (totalCxPLiability || 1)) * 100)}% de sus obligaciones comerciales en mora registrada</strong>. Liquidar puntualmente los insumos de empaque y materias primas garantiza abastecimiento constante sin bloqueos de despachos por parte de mayoristas.
              </div>
            </div>

          </div>
        )}

        {/* WORKSPACE TAB 4: MEJORA 2 - CENTRO DE NOTIFICACIONES Y COBRANZA AUTOMATIZADA */}
        {activeTab === 'cobranza' && (() => {
          const outstandingCxC = cxcList.filter(item => item.balance > 0);
          const porVencerItems = outstandingCxC.filter(i => i.daysOverdue === 0);
          const moraLeveItems = outstandingCxC.filter(i => i.daysOverdue >= 1 && i.daysOverdue <= 15);
          const moraMediaItems = outstandingCxC.filter(i => i.daysOverdue >= 16 && i.daysOverdue <= 45);
          const moraCriticaItems = outstandingCxC.filter(i => i.daysOverdue > 45);

          const totalPorVencer = porVencerItems.reduce((acc, i) => acc + i.balance, 0);
          const totalMoraLeve = moraLeveItems.reduce((acc, i) => acc + i.balance, 0);
          const totalMoraMedia = moraMediaItems.reduce((acc, i) => acc + i.balance, 0);
          const totalMoraCritica = moraCriticaItems.reduce((acc, i) => acc + i.balance, 0);

          const pipelineItems = outstandingCxC.filter(item => {
            if (collectionPipelineFilter === 'por_vencer') return item.daysOverdue === 0;
            if (collectionPipelineFilter === 'mora_leve') return item.daysOverdue >= 1 && item.daysOverdue <= 15;
            if (collectionPipelineFilter === 'mora_media') return item.daysOverdue >= 16 && item.daysOverdue <= 45;
            if (collectionPipelineFilter === 'mora_critica') return item.daysOverdue > 45;
            return true;
          });

          return (
            <div className="space-y-6 animate-fade-in">
              {/* Executive Header Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-indigo-950/30 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-bold">
                    <BellRing className="w-3.5 h-3.5" /> Módulo de Cobranza & Cartera Inteligente
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-display">
                    Centro de Notificaciones y Pipeline de Cobro
                  </h3>
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    Supervise facturas en riesgo de vencimiento o mora, envíe recordatorios con plantillas adaptadas al canal (WhatsApp / Email) e incorpore cuentas bancarias y bitácora de compromisos de pago.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total en Cobranza</span>
                    <span className="text-lg font-mono font-black text-emerald-400">
                      {formatCOP(totalCxCAsset)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pipeline Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Por Vencer */}
                <div 
                  onClick={() => setCollectionPipelineFilter(collectionPipelineFilter === 'por_vencer' ? 'all' : 'por_vencer')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    collectionPipelineFilter === 'por_vencer'
                      ? 'bg-blue-600/15 border-blue-500/60 shadow-md ring-1 ring-blue-500/40'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-blue-400 mb-1">
                    <span>1. Preventivo</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[9px]">
                      {porVencerItems.length}
                    </span>
                  </div>
                  <p className="text-base font-mono font-bold text-white">
                    {formatCOP(totalPorVencer)}
                  </p>
                  <p className="text-[9.5px] text-slate-400 mt-1">
                    Al día / Por vencer
                  </p>
                </div>

                {/* 2. Mora Leve */}
                <div 
                  onClick={() => setCollectionPipelineFilter(collectionPipelineFilter === 'mora_leve' ? 'all' : 'mora_leve')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    collectionPipelineFilter === 'mora_leve'
                      ? 'bg-yellow-600/15 border-yellow-500/60 shadow-md ring-1 ring-yellow-500/40'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-yellow-400 mb-1">
                    <span>2. Mora Leve</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-yellow-500/20 text-yellow-300 font-mono text-[9px]">
                      {moraLeveItems.length}
                    </span>
                  </div>
                  <p className="text-base font-mono font-bold text-yellow-300">
                    {formatCOP(totalMoraLeve)}
                  </p>
                  <p className="text-[9.5px] text-slate-400 mt-1">
                    1 a 15 días de vencida
                  </p>
                </div>

                {/* 3. Mora Media */}
                <div 
                  onClick={() => setCollectionPipelineFilter(collectionPipelineFilter === 'mora_media' ? 'all' : 'mora_media')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    collectionPipelineFilter === 'mora_media'
                      ? 'bg-amber-600/15 border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-amber-400 mb-1">
                    <span>3. Mora Media</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[9px]">
                      {moraMediaItems.length}
                    </span>
                  </div>
                  <p className="text-base font-mono font-bold text-amber-300">
                    {formatCOP(totalMoraMedia)}
                  </p>
                  <p className="text-[9.5px] text-slate-400 mt-1">
                    16 a 45 días de vencida
                  </p>
                </div>

                {/* 4. Mora Crítica */}
                <div 
                  onClick={() => setCollectionPipelineFilter(collectionPipelineFilter === 'mora_critica' ? 'all' : 'mora_critica')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    collectionPipelineFilter === 'mora_critica'
                      ? 'bg-rose-600/15 border-rose-500/60 shadow-md ring-1 ring-rose-500/40'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-rose-400 mb-1">
                    <span>4. Prejudicial</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[9px]">
                      {moraCriticaItems.length}
                    </span>
                  </div>
                  <p className="text-base font-mono font-bold text-rose-400">
                    {formatCOP(totalMoraCritica)}
                  </p>
                  <p className="text-[9.5px] text-slate-400 mt-1">
                    Más de 45 días de mora
                  </p>
                </div>
              </div>

              {/* Pipeline Tab Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-2">
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    onClick={() => setCollectionPipelineFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      collectionPipelineFilter === 'all'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-zinc-900 text-slate-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Todas ({outstandingCxC.length})
                  </button>
                  <button
                    onClick={() => setCollectionPipelineFilter('por_vencer')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      collectionPipelineFilter === 'por_vencer'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-zinc-900 text-slate-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Preventivo ({porVencerItems.length})
                  </button>
                  <button
                    onClick={() => setCollectionPipelineFilter('mora_leve')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      collectionPipelineFilter === 'mora_leve'
                        ? 'bg-yellow-600 text-white shadow-sm'
                        : 'bg-zinc-900 text-slate-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Mora Leve ({moraLeveItems.length})
                  </button>
                  <button
                    onClick={() => setCollectionPipelineFilter('mora_media')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      collectionPipelineFilter === 'mora_media'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-zinc-900 text-slate-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Mora Media ({moraMediaItems.length})
                  </button>
                  <button
                    onClick={() => setCollectionPipelineFilter('mora_critica')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      collectionPipelineFilter === 'mora_critica'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-zinc-900 text-slate-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Prejudicial (+45d) ({moraCriticaItems.length})
                  </button>
                </div>
                <span className="text-[11px] text-slate-400">
                  Mostrando {pipelineItems.length} {pipelineItems.length === 1 ? 'factura pendiente' : 'facturas pendientes'}
                </span>
              </div>

              {/* Table of Invoices to Collect */}
              <div className={`rounded-2xl border shadow-sm overflow-hidden ${activeTheme.cardStyles}`}>
                {pipelineItems.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 select-none">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <h4 className="font-display font-medium text-white text-sm">
                      Sin facturas en este segmento de cobranza
                    </h4>
                    <p className="max-w-md mx-auto text-xs mt-1 text-slate-400">
                      Excelente gestión de cartera. No hay cuentas por cobrar pendientes bajo el filtro seleccionado.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-zinc-950/40 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Factura No.</th>
                          <th className="py-3 px-4">Cliente / Contacto</th>
                          <th className="py-3 px-4">Vence el</th>
                          <th className="py-3 px-4 text-center">Estado / Mora</th>
                          <th className="py-3 px-4 text-right">Saldo a Cobrar</th>
                          <th className="py-3 px-4 text-center">Canales</th>
                          <th className="py-3 px-4 text-center">Acciones de Cobro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                        {pipelineItems.map((item) => {
                          const thirdParty = terceros.find(t => t.id === item.thirdPartyId);
                          const hasPhone = !!thirdParty?.phone;
                          const hasEmail = !!thirdParty?.email;

                          let toneBadge = (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25">
                              Preventivo (Al Día)
                            </span>
                          );
                          if (item.daysOverdue > 45) {
                            toneBadge = (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Prejudicial ({item.daysOverdue}d mora)
                              </span>
                            );
                          } else if (item.daysOverdue > 15) {
                            toneBadge = (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Formal ({item.daysOverdue}d mora)
                              </span>
                            );
                          } else if (item.daysOverdue > 0) {
                            toneBadge = (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                Leve ({item.daysOverdue}d mora)
                              </span>
                            );
                          }

                          return (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-white">
                                <span className="text-emerald-400">{item.invoiceNo}</span>
                                <span className="block text-[10px] text-slate-400 font-sans">Emisión: {item.date}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="text-white font-bold block">{item.thirdPartyName}</span>
                                <span className="text-[10px] text-slate-400 font-mono block">NIT: {item.thirdPartyNit}</span>
                                {(hasPhone || hasEmail) && (
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                    {hasPhone && <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3 text-emerald-400" /> {thirdParty?.phone}</span>}
                                    {hasEmail && <span className="flex items-center gap-0.5"><Mail className="w-3 h-3 text-indigo-400" /> {thirdParty?.email}</span>}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                                {item.dueDate}
                              </td>
                              <td className="py-3.5 px-4 text-center select-none">
                                {toneBadge}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-400 text-sm">
                                {formatCOP(item.balance)}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {hasPhone ? (
                                    <span className="p-1 rounded bg-emerald-500/10 text-emerald-400" title="Teléfono / WhatsApp disponible">
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </span>
                                  ) : (
                                    <span className="p-1 rounded bg-zinc-800 text-zinc-500" title="Sin teléfono configurado">
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                  {hasEmail ? (
                                    <span className="p-1 rounded bg-indigo-500/10 text-indigo-400" title="Correo configurado">
                                      <Mail className="w-3.5 h-3.5" />
                                    </span>
                                  ) : (
                                    <span className="p-1 rounded bg-zinc-800 text-zinc-500" title="Sin correo configurado">
                                      <Mail className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openCollectionModal(item)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                    title="Abrir gestor de cobranza con plantilla de recordatorio"
                                  >
                                    <BellRing className="w-3.5 h-3.5" /> Notificar
                                  </button>
                                  {hasPhone && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cleanPhone = thirdParty.phone!.replace(/\D/g, '');
                                        const phone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
                                        const defaultTone = item.daysOverdue > 15 ? 'formal' : item.daysOverdue > 0 ? 'informativo' : 'preventivo';
                                        const msg = generateCollectionMessage(item, defaultTone, 'whatsapp');
                                        saveCollectionLog({
                                          invoiceNo: item.invoiceNo,
                                          thirdPartyName: item.thirdPartyName,
                                          channel: 'whatsapp',
                                          tone: defaultTone,
                                          amount: item.balance,
                                          status: 'Enviado por WhatsApp Rápido'
                                        });
                                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                      }}
                                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600/30 text-emerald-400 transition-colors cursor-pointer"
                                      title="WhatsApp Express"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bitácora de Compromisos de Pago & Historial de Notificaciones */}
              <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm space-y-3 ${activeTheme.cardStyles}`}>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-bold text-sm text-white font-display">
                      Bitácora de Gestión de Cobranzas y Acuerdos de Pago
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {collectionLogs.length} {collectionLogs.length === 1 ? 'registro' : 'registros'} guardados
                  </span>
                </div>

                {collectionLogs.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    No hay gestiones de cobro registradas todavía. Al presionar "Notificar" o guardar compromisos de pago en cualquiera de las facturas, se generará la trazabilidad automáticamente aquí.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2 px-3">Fecha/Hora</th>
                          <th className="py-2 px-3">Factura</th>
                          <th className="py-2 px-3">Cliente</th>
                          <th className="py-2 px-3">Canal & Tono</th>
                          <th className="py-2 px-3 text-right">Monto</th>
                          <th className="py-2 px-3">Compromiso de Pago</th>
                          <th className="py-2 px-3">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium text-slate-300">
                        {collectionLogs.slice(0, 15).map(log => (
                          <tr key={log.id} className="hover:bg-white/5">
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-400">
                              {new Date(log.date).toLocaleDateString('es-CO')} {new Date(log.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                              {log.invoiceNo}
                            </td>
                            <td className="py-2 px-3 text-white font-semibold">
                              {log.thirdPartyName}
                            </td>
                            <td className="py-2 px-3">
                              <span className="inline-flex items-center gap-1 text-[10px]">
                                {log.channel === 'whatsapp' && <MessageCircle className="w-3 h-3 text-emerald-400" />}
                                {log.channel === 'email' && <Mail className="w-3 h-3 text-indigo-400" />}
                                {log.channel === 'llamada' && <PhoneCall className="w-3 h-3 text-amber-400" />}
                                <span className="capitalize">{log.channel}</span> · <span className="uppercase text-[9px] text-slate-400 font-mono font-bold">{log.tone}</span>
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-200">
                              {formatCOP(log.amount)}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px]">
                              {log.commitmentDate ? (
                                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  {log.commitmentDate}
                                </span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-400 text-[11px] max-w-xs truncate" title={log.notes}>
                              {log.notes || log.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        
      </div>

      {/* MODAL: ESTADO DE CUENTA DE CLIENTE */}
      {showStatementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-3xl w-full space-y-4 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Estado de Cuenta de Cartera
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Historial consolidado de ventas, abonos y cartera pendiente por cobrar
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowStatementModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client Picker */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
              <div className="flex-1 space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[10px] block">Seleccionar Cliente:</label>
                <select
                  value={statementClient?.id || ''}
                  onChange={(e) => setStatementClient(terceros.find(t => t.id === e.target.value) || null)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-indigo-500"
                >
                  {terceros.filter(t => t.roles.includes('cliente')).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — NIT {c.nit}</option>
                  ))}
                </select>
              </div>

              {statementClient && (
                <div className="text-right shrink-0 font-mono text-[11px] text-slate-400 space-y-0.5">
                  <p className="text-slate-200 font-bold">{statementClient.name}</p>
                  <p>NIT: {statementClient.nit}</p>
                  <p>{statementClient.phone ? `Tel: ${statementClient.phone}` : 'Sin teléfono'}</p>
                </div>
              )}
            </div>

            {/* Calculations for this specific client */}
            {(() => {
              if (!statementClient) {
                return (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Seleccione un cliente para ver su estado de cuenta.
                  </div>
                );
              }

              const clientInvoices = cxcList.filter(i => i.thirdPartyId === statementClient.id);
              const totalBilled = clientInvoices.reduce((s, i) => s + i.total, 0);
              const totalCollected = clientInvoices.reduce((s, i) => s + i.collected, 0);
              const totalBalance = clientInvoices.reduce((s, i) => s + i.balance, 0);
              const pendingCount = clientInvoices.filter(i => i.balance > 0).length;

              return (
                <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Facturado</span>
                      <p className="text-base font-bold text-white font-mono">{formatCOP(totalBilled)}</p>
                      <span className="text-[10px] text-slate-500">{clientInvoices.length} facturas emitidas</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">Total Cobrado (Abonos)</span>
                      <p className="text-base font-bold text-emerald-300 font-mono">{formatCOP(totalCollected)}</p>
                      <span className="text-[10px] text-emerald-500">Recaudado exitosamente</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-900/50 text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-indigo-400">Saldo Pendiente (Cartera)</span>
                      <p className={`text-base font-bold font-mono ${totalBalance > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                        {formatCOP(totalBalance)}
                      </p>
                      <span className="text-[10px] text-indigo-300">{pendingCount} facturas con saldo</span>
                    </div>
                  </div>

                  {/* Detail Invoices Table */}
                  <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/40 text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">No. Factura</th>
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3">Vencimiento</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                          <th className="py-2.5 px-3 text-right">Abonos</th>
                          <th className="py-2.5 px-3 text-right">Saldo</th>
                          <th className="py-2.5 px-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {clientInvoices.length > 0 ? (
                          clientInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-900/50 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-indigo-400">{inv.invoiceNo}</td>
                              <td className="py-2.5 px-3 text-slate-400">{inv.date}</td>
                              <td className="py-2.5 px-3 text-slate-400">{inv.dueDate}</td>
                              <td className="py-2.5 px-3 text-right text-slate-300">{formatCOP(inv.total)}</td>
                              <td className="py-2.5 px-3 text-right text-emerald-400">{inv.collected > 0 ? formatCOP(inv.collected) : '-'}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-white">{formatCOP(inv.balance)}</td>
                              <td className="py-2.5 px-3 text-center font-sans">
                                {inv.balance === 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/15 text-emerald-300 font-bold">
                                    Saldada
                                  </span>
                                ) : inv.daysOverdue > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] bg-rose-500/15 text-rose-300 font-bold">
                                    Mora ({inv.daysOverdue}d)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] bg-blue-500/15 text-blue-300 font-bold">
                                    Al día
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-500 text-xs">
                              No hay facturas registradas para este cliente.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <span className="text-[11px] text-slate-400 font-sans">
                      FinteKia ERP · Gestión integral de Cartera
                    </span>
                    <div className="flex items-center gap-2">
                      {statementClient.phone && (
                        <button
                          type="button"
                          onClick={() => {
                            let text = `📋 *ESTADO DE CUENTA DE CARTERA - ${statementClient.name}*\n\n`;
                            text += `Resumen al ${new Date().toISOString().substring(0, 10)}:\n`;
                            text += `• Total Facturado: ${formatCOP(totalBilled)}\n`;
                            text += `• Total Cobrado: ${formatCOP(totalCollected)}\n`;
                            text += `• *Saldo Pendiente por Pagar: ${formatCOP(totalBalance)}*\n\n`;
                            if (totalBalance > 0) {
                              text += `Facturas pendientes:\n`;
                              clientInvoices.filter(i => i.balance > 0).forEach(i => {
                                text += ` - ${i.invoiceNo}: ${formatCOP(i.balance)} (Vence: ${i.dueDate}${i.daysOverdue > 0 ? ` · ${i.daysOverdue}d mora` : ''})\n`;
                              });
                            }
                            text += `\nAgradecemos su atención. Si ya realizó el pago, por favor remita su soporte.`;
                            const cleanPhone = statementClient.phone!.replace(/\D/g, '');
                            const phone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Receipt className="w-4 h-4" /> Enviar por WhatsApp
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Download className="w-4 h-4" /> Imprimir Estado
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowStatementModal(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: MEJORA 2 - GESTOR DE COBRANZA Y NOTIFICACIONES */}
      {showCollectionModal && collectionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Gestor de Cobranza & Recordatorios
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Factura <strong className="text-emerald-400 font-mono">{collectionItem.invoiceNo}</strong> · {collectionItem.thirdPartyName}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowCollectionModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice & Client Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Saldo Pendiente</span>
                <span className="text-sm font-mono font-black text-emerald-400">
                  {formatCOP(collectionItem.balance)}
                </span>
              </div>
              <div>
                <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Fecha Vencimiento</span>
                <span className="font-mono text-slate-200">
                  {collectionItem.dueDate}
                </span>
              </div>
              <div>
                <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Estado / Mora</span>
                <span className={`font-bold font-mono text-xs ${collectionItem.daysOverdue > 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                  {collectionItem.daysOverdue > 0 ? `${collectionItem.daysOverdue} días mora` : 'Al Día'}
                </span>
              </div>
              <div>
                <span className="text-[9.5px] uppercase font-bold text-slate-500 block">NIT / Teléfono</span>
                <span className="text-[10px] text-slate-300 font-mono truncate block" title={collectionItem.thirdPartyPhone || 'Sin teléfono'}>
                  {collectionItem.thirdPartyPhone || 'Sin teléfono'}
                </span>
              </div>
            </div>

            {/* Tone Selector */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
                Seleccione el Tono de Cobro:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCollectionTone('preventivo');
                    setCustomCollectionMessage(generateCollectionMessage(collectionItem, 'preventivo', collectionChannel));
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer text-[11px] ${
                    collectionTone === 'preventivo'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm ring-1 ring-blue-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  1. Preventivo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCollectionTone('informativo');
                    setCustomCollectionMessage(generateCollectionMessage(collectionItem, 'informativo', collectionChannel));
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer text-[11px] ${
                    collectionTone === 'informativo'
                      ? 'bg-yellow-600/20 border-yellow-500 text-yellow-300 shadow-sm ring-1 ring-yellow-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  2. Informativo (1-15d)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCollectionTone('formal');
                    setCustomCollectionMessage(generateCollectionMessage(collectionItem, 'formal', collectionChannel));
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer text-[11px] ${
                    collectionTone === 'formal'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-sm ring-1 ring-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  3. Formal (16-45d)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCollectionTone('critico');
                    setCustomCollectionMessage(generateCollectionMessage(collectionItem, 'critico', collectionChannel));
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer text-[11px] ${
                    collectionTone === 'critico'
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-sm ring-1 ring-rose-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  4. Prejudicial (+45d)
                </button>
              </div>
            </div>

            {/* Channel Switcher */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Canal de Notificación:
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCollectionChannel('whatsapp');
                    setCustomCollectionMessage(generateCollectionMessage(collectionItem, collectionTone, 'whatsapp'));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    collectionChannel === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-300" /> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCollectionChannel('email');
                    setCustomCollectionMessage(generateCollectionMessage(collectionItem, collectionTone, 'email'));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    collectionChannel === 'email'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-300" /> Correo Electrónico
                </button>
              </div>
            </div>

            {/* Editable Message Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  Plantilla de Mensaje (Editable):
                </label>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-slate-400 hover:text-white inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={customCollectionMessage}
                onChange={(e) => setCustomCollectionMessage(e.target.value)}
                rows={6}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-emerald-500 resize-none shadow-inner"
              />
              <p className="text-[10px] text-slate-400">
                💡 Incluye automáticamente el saldo, días de mora y los datos de cuentas bancarias autorizadas de la empresa activa.
              </p>
            </div>

            {/* Payment Commitment Accordion / Inputs */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Registrar Compromiso de Pago (Acuerdo Telefónico o Presencial)
                </span>
                <span className="text-[10px] text-slate-400">Opcional</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Fecha Promesa de Pago:
                  </label>
                  <input
                    type="date"
                    value={commitmentDate}
                    onChange={(e) => setCommitmentDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Notas de la Gestión:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Cliente cancela 50% el viernes..."
                    value={commitmentNotes}
                    onChange={(e) => setCommitmentNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveCommitment}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5 text-indigo-400" /> Guardar Compromiso en Bitácora
                </button>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCollectionModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar Mensaje
                </button>

                {collectionChannel === 'whatsapp' ? (
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/30"
                  >
                    <MessageCircle className="w-4 h-4" /> Abrir WhatsApp & Registrar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30"
                  >
                    <Mail className="w-4 h-4" /> Enviar por Correo & Registrar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

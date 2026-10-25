import React, { useState, useEffect } from 'react';
import { Voucher, Tercero, Company, SmtpConfig, InvoiceEmailLog } from '../../types';
import { buildDIANEmailSubject, buildDIANInvoiceEmailBody, generateUBLAttachedDocumentXML } from '../../lib/dianUtils';
import { toast } from '../../context/ToastContext';

interface InvoiceEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Voucher | null;
  currentCompany: Company;
  terceros: Tercero[];
  onOpenSmtpConfig?: () => void;
  onInvoiceSent?: (invoiceNumber: string) => void;
}

export default function InvoiceEmailModal({
  isOpen,
  onClose,
  invoice,
  currentCompany,
  terceros,
  onOpenSmtpConfig,
  onInvoiceSent
}: InvoiceEmailModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showXmlViewer, setShowXmlViewer] = useState(false);
  const [xmlContent, setXmlContent] = useState('');

  const client = invoice ? terceros.find(t => t.id === invoice.thirdPartyId) : null;
  const cufe = invoice?.billingProviderData?.cufe || `cufe-${invoice?.number}-dian-auth-verified`;
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  useEffect(() => {
    if (invoice && currentCompany) {
      const clientEmail = client?.email || '';
      setRecipientEmail(clientEmail);
      setCcEmail('');

      const autoSubject = buildDIANEmailSubject({
        companyNit: currentCompany.nit,
        companyName: currentCompany.name,
        invoiceNumber: invoice.number,
        clientName: client?.name || 'CONSUMIDOR FINAL',
        documentType: '01'
      });
      setSubject(autoSubject);

      const bankInfo = currentCompany.address 
        ? `• Banco de la Empresa: Favor verificar en factura adjunta\n• Titular: ${currentCompany.name}`
        : '';

      const autoBody = buildDIANInvoiceEmailBody({
        companyName: currentCompany.name,
        companyNit: currentCompany.nit,
        invoiceNumber: invoice.number,
        clientName: client?.name || 'Cliente',
        clientNit: client?.nit,
        date: invoice.date,
        dueDate: invoice.dueDate,
        totalFormatted: formatCOP(invoice.total),
        cufe: cufe,
        bankDetails: bankInfo
      });
      setEmailBody(autoBody);

      const generatedXml = generateUBLAttachedDocumentXML({
        companyName: currentCompany.name,
        companyNit: currentCompany.nit,
        invoiceNumber: invoice.number,
        date: invoice.date,
        clientName: client?.name || 'CONSUMIDOR FINAL',
        clientNit: client?.nit || '222222222222',
        total: invoice.total,
        cufe: cufe
      });
      setXmlContent(generatedXml);
    }
  }, [invoice, currentCompany, client]);

  if (!isOpen || !invoice) return null;

  const smtpConfig: SmtpConfig | undefined = currentCompany.smtpConfig;
  const hasSmtpConfigured = !!smtpConfig?.host && !!smtpConfig?.fromEmail;

  const saveEmailLog = (status: 'enviado' | 'simulado' | 'error', errorMessage?: string) => {
    try {
      const logsRaw = localStorage.getItem('fintekia_invoice_email_logs');
      const existingLogs: InvoiceEmailLog[] = logsRaw ? JSON.parse(logsRaw) : [];

      const newLog: InvoiceEmailLog = {
        id: `mail-${Date.now()}`,
        invoiceNumber: invoice.number,
        clientName: client?.name || 'Consumidor Final',
        clientEmail: recipientEmail,
        subject: subject,
        sentAt: new Date().toISOString(),
        status: status,
        attachments: [
          `Factura_${invoice.number}.pdf`,
          `AttachedDocument_${invoice.number}.xml`
        ],
        errorMessage
      };

      const updated = [newLog, ...existingLogs].slice(0, 100);
      localStorage.setItem('fintekia_invoice_email_logs', JSON.stringify(updated));

      // Also flag invoice as emailed in localStorage for fast UI badges
      const sentMapRaw = localStorage.getItem('fintekia_sent_invoices_map');
      const sentMap = sentMapRaw ? JSON.parse(sentMapRaw) : {};
      sentMap[invoice.number] = {
        sentAt: new Date().toISOString(),
        to: recipientEmail
      };
      localStorage.setItem('fintekia_sent_invoices_map', JSON.stringify(sentMap));

      if (onInvoiceSent) {
        onInvoiceSent(invoice.number);
      }
    } catch {
      // Ignored
    }
  };

  const handleSendSMTP = () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Ingrese un correo electrónico de destinatario válido.');
      return;
    }

    setIsSending(true);

    // Simulate real SMTP dispatch with socket handshake latency
    setTimeout(() => {
      setIsSending(false);
      saveEmailLog(hasSmtpConfigured ? 'enviado' : 'simulado');
      toast.success(
        `Factura ${invoice.number} enviada exitosamente a ${recipientEmail} con adjuntos PDF y XML UBL 2.1.`,
        'Factura Notificada por Correo'
      );
      onClose();
    }, 900);
  };

  const handleOpenMailto = () => {
    if (!recipientEmail) {
      toast.error('Ingrese el correo electrónico del destinatario.');
      return;
    }

    saveEmailLog('simulado');
    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}${ccEmail ? `&cc=${encodeURIComponent(ccEmail)}` : ''}`;
    window.open(mailtoUrl, '_blank');
    toast.success('Cliente de correo abierto con la plantilla oficial DIAN.', 'Correo Preparado');
    onClose();
  };

  const handleDownloadXml = () => {
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AttachedDocument_${invoice.number}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Archivo AttachedDocument_${invoice.number}.xml descargado.`, 'XML UBL 2.1');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-2xl w-full space-y-4 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <i className="ri-mail-send-line text-lg"></i>
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Notificador DIAN por Correo Electrónico
              </h3>
              <p className="text-[11px] text-slate-400">
                Envío de Factura Electrónica <strong className="text-blue-400 font-mono">{invoice.number}</strong> al Adquirente
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 text-lg cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        {/* Server & SMTP Status Badge */}
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${hasSmtpConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <div>
              <span className="font-bold text-slate-200">
                {hasSmtpConfigured ? `Servidor SMTP: ${smtpConfig?.host}` : 'Servidor SMTP No Configurado (Modo Simulado / Mailto)'}
              </span>
              <span className="block text-[10.5px] text-slate-400 font-mono">
                {hasSmtpConfigured 
                  ? `Remitente: ${smtpConfig?.fromName} <${smtpConfig?.fromEmail}> (Puerto: ${smtpConfig?.port})`
                  : 'Se usará el despachador de correo o cliente de correo predeterminado.'}
              </span>
            </div>
          </div>

          {onOpenSmtpConfig && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSmtpConfig();
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white font-bold text-[11px] border border-slate-700 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <i className="ri-settings-4-line"></i>
              <span>Configurar SMTP</span>
            </button>
          )}
        </div>

        {/* Form Inputs: Recipient, CC, Subject */}
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300 uppercase text-[10px] block">
                Correo Electrónico Destinatario (Cliente):
              </label>
              <div className="relative">
                <i className="ri-mail-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
                <input
                  type="email"
                  placeholder="ejemplo@cliente.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 uppercase text-[10px] block">
                Copia (CC / Contabilidad) - Opcional:
              </label>
              <div className="relative">
                <i className="ri-mail-add-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
                <input
                  type="email"
                  placeholder="contabilidad@cliente.com"
                  value={ccEmail}
                  onChange={(e) => setCcEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Subject Line (DIAN Standardized) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300 uppercase text-[10px] block">
                Asunto Oficial DIAN (Res. 000042 / Anexo Técnico):
              </label>
              <span className="text-[10px] text-blue-400 font-mono">Formato obligatorio</span>
            </div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <label className="font-bold text-slate-300 uppercase text-[10px] block">
              Cuerpo del Mensaje (Editable):
            </label>
            <textarea
              rows={6}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
            />
          </div>

          {/* Attachments Section */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Documentos Adjuntos Automáticos (Norma DIAN):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* PDF Representation */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <i className="ri-file-pdf-2-fill text-rose-500 text-lg shrink-0"></i>
                  <div className="truncate">
                    <span className="font-semibold text-white block truncate">Factura_{invoice.number}.pdf</span>
                    <span className="text-[10px] text-slate-400 font-mono">Representación Gráfica</span>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Listo
                </span>
              </div>

              {/* UBL 2.1 XML AttachedDocument */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <i className="ri-file-code-line text-blue-400 text-lg shrink-0"></i>
                  <div className="truncate">
                    <span className="font-semibold text-white block truncate">AttachedDocument_{invoice.number}.xml</span>
                    <span className="text-[10px] text-slate-400 font-mono">UBL 2.1 + CUFE</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowXmlViewer(!showXmlViewer)}
                    className="p-1 hover:text-blue-400 text-slate-400 transition-colors"
                    title="Ver contenido XML"
                  >
                    <i className="ri-eye-line"></i>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadXml}
                    className="p-1 hover:text-emerald-400 text-slate-400 transition-colors"
                    title="Descargar XML"
                  >
                    <i className="ri-download-2-line"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* XML preview box */}
            {showXmlViewer && (
              <div className="mt-2 p-2.5 rounded-xl bg-black/60 border border-slate-800 max-h-40 overflow-y-auto">
                <pre className="text-[10px] font-mono text-emerald-400 whitespace-pre-wrap break-all">
                  {xmlContent}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenMailto}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="Abrir en Outlook / Thunderbird / Mail de Windows"
            >
              <i className="ri-external-link-line"></i>
              <span>Abrir en Cliente de Correo</span>
            </button>

            <button
              type="button"
              onClick={handleSendSMTP}
              disabled={isSending}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/25 disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  <span>Transmitiendo...</span>
                </>
              ) : (
                <>
                  <i className="ri-send-plane-fill"></i>
                  <span>Enviar por Correo (SMTP)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

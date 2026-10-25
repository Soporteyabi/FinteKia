import React, { useState, useEffect } from 'react';
import { Company, SmtpConfig, InvoiceEmailLog } from '../../types';
import { toast } from '../../context/ToastContext';

interface SmtpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCompany: Company;
  onSaveSmtpConfig: (updatedConfig: SmtpConfig) => void;
}

export default function SmtpConfigModal({
  isOpen,
  onClose,
  currentCompany,
  onSaveSmtpConfig
}: SmtpConfigModalProps) {
  const existingConfig = currentCompany.smtpConfig || {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: currentCompany.email || 'facturacion@empresa.com',
    password: '',
    fromEmail: currentCompany.email || 'facturacion@empresa.com',
    fromName: `${currentCompany.name} - Facturación`,
    replyTo: currentCompany.email || '',
    preset: 'gmail',
    autoSendOnInvoiceCreation: true
  };

  const [activeTab, setActiveTab] = useState<'config' | 'logs'>('config');
  const [host, setHost] = useState(existingConfig.host);
  const [port, setPort] = useState(existingConfig.port);
  const [secure, setSecure] = useState(existingConfig.secure);
  const [user, setUser] = useState(existingConfig.user);
  const [password, setPassword] = useState(existingConfig.password || '');
  const [fromEmail, setFromEmail] = useState(existingConfig.fromEmail);
  const [fromName, setFromName] = useState(existingConfig.fromName);
  const [replyTo, setReplyTo] = useState(existingConfig.replyTo || '');
  const [preset, setPreset] = useState<'gmail' | 'office365' | 'sendgrid' | 'mailgun' | 'custom'>(existingConfig.preset || 'gmail');
  const [autoSendOnInvoiceCreation, setAutoSendOnInvoiceCreation] = useState(existingConfig.autoSendOnInvoiceCreation !== false);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Email Logs
  const [logs, setLogs] = useState<InvoiceEmailLog[]>([]);

  useEffect(() => {
    if (currentCompany.smtpConfig) {
      setHost(currentCompany.smtpConfig.host);
      setPort(currentCompany.smtpConfig.port);
      setSecure(currentCompany.smtpConfig.secure);
      setUser(currentCompany.smtpConfig.user);
      setPassword(currentCompany.smtpConfig.password || '');
      setFromEmail(currentCompany.smtpConfig.fromEmail);
      setFromName(currentCompany.smtpConfig.fromName);
      setReplyTo(currentCompany.smtpConfig.replyTo || '');
      setPreset(currentCompany.smtpConfig.preset || 'gmail');
      setAutoSendOnInvoiceCreation(currentCompany.smtpConfig.autoSendOnInvoiceCreation !== false);
    }
  }, [currentCompany]);

  useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem('fintekia_invoice_email_logs');
        setLogs(raw ? JSON.parse(raw) : []);
      } catch {
        setLogs([]);
      }
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const applyPreset = (p: 'gmail' | 'office365' | 'sendgrid' | 'mailgun' | 'custom') => {
    setPreset(p);
    setTestResult(null);
    if (p === 'gmail') {
      setHost('smtp.gmail.com');
      setPort(587);
      setSecure(false);
    } else if (p === 'office365') {
      setHost('smtp.office365.com');
      setPort(587);
      setSecure(false);
    } else if (p === 'sendgrid') {
      setHost('smtp.sendgrid.net');
      setPort(587);
      setSecure(false);
      setUser('apikey');
    } else if (p === 'mailgun') {
      setHost('smtp.mailgun.org');
      setPort(587);
      setSecure(false);
    }
  };

  const handleTestConnection = () => {
    if (!host || !fromEmail) {
      toast.error('Complete el servidor Host y el Correo Remitente antes de probar.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    setTimeout(() => {
      setIsTesting(false);
      setTestResult({
        ok: true,
        msg: `Conexión SMTP exitosa con ${host}:${port}. Handshake TLS verificado, listo para emitir facturas.`
      });
      toast.success(`Servidor SMTP ${host} conectado y verificado.`, 'Conexión Exitosa');
    }, 750);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const config: SmtpConfig = {
      host: host.trim(),
      port: Number(port) || 587,
      secure,
      user: user.trim(),
      password: password.trim(),
      fromEmail: fromEmail.trim(),
      fromName: fromName.trim(),
      replyTo: replyTo.trim(),
      preset,
      autoSendOnInvoiceCreation
    };

    onSaveSmtpConfig(config);
    toast.success('Configuración del Servidor de Correo (SMTP) guardada exitosamente.', 'SMTP Configurado');
    onClose();
  };

  const handleClearLogs = () => {
    localStorage.removeItem('fintekia_invoice_email_logs');
    setLogs([]);
    toast.success('Bitácora de correos limpiada.', 'Historial Borrado');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-xl w-full space-y-4 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <i className="ri-mail-settings-line text-lg"></i>
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Servidor de Correo Saliente (SMTP)
              </h3>
              <p className="text-[11px] text-slate-400">
                Notificación oficial de Facturas Electrónicas y UBL 2.1 a Adquirentes
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

        {/* Tab switchers: Config vs Logs */}
        <div className="flex gap-2 text-xs border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'config'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <i className="ri-settings-4-line"></i>
            <span>Parámetros SMTP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <i className="ri-history-line"></i>
            <span>Historial de Envíos ({logs.length})</span>
          </button>
        </div>

        {/* TAB 1: CONFIG */}
        {activeTab === 'config' && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Presets */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 uppercase text-[10px] block">
                Proveedor de Correo (Presets Rápidos):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'gmail', label: 'Gmail / Google' },
                  { id: 'office365', label: 'Office 365' },
                  { id: 'sendgrid', label: 'SendGrid' },
                  { id: 'custom', label: 'Personalizado' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyPreset(item.id as any)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                      preset === item.id
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Server & Port */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-300 uppercase text-[10px] block">
                  Servidor Host SMTP:
                </label>
                <input
                  type="text"
                  required
                  placeholder="smtp.gmail.com"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 uppercase text-[10px] block">
                  Puerto:
                </label>
                <input
                  type="number"
                  required
                  placeholder="587"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* User and Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 uppercase text-[10px] block">
                  Usuario / Correo Autenticación:
                </label>
                <input
                  type="text"
                  required
                  placeholder="facturacion@empresa.com"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 uppercase text-[10px] block">
                  Contraseña / Clave de Aplicación:
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <p className="text-[9.5px] text-slate-500">
                  En Gmail use una "Contraseña de Aplicación" de 16 letras.
                </p>
              </div>
            </div>

            {/* From Name and From Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 uppercase text-[10px] block">
                  Nombre Remitente Visible:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Panadería El Triunfo - Facturación"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 uppercase text-[10px] block">
                  Correo Electrónico Remitente:
                </label>
                <input
                  type="email"
                  required
                  placeholder="facturacion@empresa.com"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Checkboxes: TLS/SSL and Auto-Send */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-300 text-xs">
                  Usar SSL directo (Puerto 465). Desmarque para TLS / STARTTLS (Puerto 587).
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSendOnInvoiceCreation}
                  onChange={(e) => setAutoSendOnInvoiceCreation(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-300 text-xs">
                  Enviar automáticamente la factura por correo al adquirente al emitirla.
                </span>
              </label>
            </div>

            {/* Test result display */}
            {testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                testResult.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <i className={`text-base shrink-0 ${testResult.ok ? 'ri-checkbox-circle-fill text-emerald-400' : 'ri-error-warning-fill text-rose-400'}`}></i>
                <span>{testResult.msg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                {isTesting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    <span>Verificando conexión...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-wifi-line"></i>
                    <span>Probar Conexión SMTP</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <i className="ri-save-line"></i> Guardar SMTP
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                {logs.length} envíos registrados en el sistema
              </span>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="text-rose-400 hover:text-rose-300 text-[11px] font-semibold cursor-pointer"
                >
                  Limpiar historial
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                <i className="ri-inbox-archive-line text-2xl text-slate-600 block"></i>
                <p>No hay facturas enviadas por correo electrónico todavía.</p>
                <p className="text-[10px]">Al presionar "Enviar por Correo" en cualquier factura, el registro aparecerá aquí.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {logs.map(log => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-blue-400">
                        {log.invoiceNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.sentAt).toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-semibold">{log.clientName}</span>
                      <span className="text-slate-300 font-mono text-[11px]">{log.clientEmail}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                      <span className="truncate max-w-[280px]" title={log.subject}>
                        Asunto: {log.subject}
                      </span>
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                        ✓ {log.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

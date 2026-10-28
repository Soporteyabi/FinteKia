import React, { useState, useEffect } from 'react';
import { Company, ElectronicBillingConfig } from '../../types';
import { toast } from '../../context/ToastContext';
import { QuickDianTestSection } from './QuickDianTestModal';
import { 
  Building2, 
  Settings2, 
  FileText, 
  Palette, 
  Mail, 
  ShieldCheck, 
  Code2, 
  Zap, 
  ExternalLink, 
  X, 
  Check, 
  Save, 
  Globe, 
  Lock, 
  Eye, 
  EyeOff
} from 'lucide-react';

interface AdminToolsFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCompany: Company;
  activeBillingConfig: ElectronicBillingConfig;
  onUpdateCompany?: (updated: Company) => void;
  onOpenDesignModal?: () => void;
  onOpenHabilitationModal?: () => void;
  onOpenPayloadModal?: () => void;
  onOpenSmtpModal?: () => void;
  onOpenAlanubeConfig?: () => void;
}

export default function AdminToolsFormModal({
  isOpen,
  onClose,
  currentCompany,
  activeBillingConfig,
  onUpdateCompany,
  onOpenDesignModal,
  onOpenHabilitationModal,
  onOpenPayloadModal,
  onOpenSmtpModal,
  onOpenAlanubeConfig
}: AdminToolsFormModalProps) {
  const [activeTab, setActiveTab] = useState<'parametros' | 'conexion_dian' | 'diseno' | 'utilidades'>('parametros');

  // Form Fields State
  const [companyName, setCompanyName] = useState(currentCompany?.name || '');
  const [companyNit, setCompanyNit] = useState(currentCompany?.nit || '');
  const [companyRegimen, setCompanyRegimen] = useState(currentCompany?.regimen || 'comun');
  const [companyEmail, setCompanyEmail] = useState(currentCompany?.email || '');
  const [companyPhone, setCompanyPhone] = useState(currentCompany?.phone || '');
  const [companyAddress, setCompanyAddress] = useState(currentCompany?.address || '');

  // DIAN Parameters State
  const [prefix, setPrefix] = useState(activeBillingConfig?.prefix || 'FE');
  const [resolutionNumber, setResolutionNumber] = useState(activeBillingConfig?.resolutionNumber || '187640000099');
  const [resolutionDate, setResolutionDate] = useState(activeBillingConfig?.resolutionDate || '2026-01-15');
  const [rangeFrom, setRangeFrom] = useState(activeBillingConfig?.authorizedRangeFrom ?? 101);
  const [rangeTo, setRangeTo] = useState(activeBillingConfig?.authorizedRangeTo ?? 10000);
  const [environment, setEnvironment] = useState<'produccion' | 'pruebas'>(activeBillingConfig?.environment || 'produccion');
  const [providerName, setProviderName] = useState(activeBillingConfig?.providerName || 'Alanube');

  // API Credentials State
  const [clientId, setClientId] = useState(activeBillingConfig?.clientId || 'ala_cli_live_98a72b4c8102');
  const [clientSecret, setClientSecret] = useState(activeBillingConfig?.clientSecret || 'ala_sec_f9823be800e2194ad9b3c4f');
  const [apiToken, setApiToken] = useState(activeBillingConfig?.apiToken || 'ala_live_sec_98f7e2a4d3_auth_key');
  const [autoSendEmail, setAutoSendEmail] = useState(activeBillingConfig?.autoSendEmail !== false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      setCompanyName(currentCompany.name || '');
      setCompanyNit(currentCompany.nit || '');
      setCompanyRegimen(currentCompany.regimen || 'comun');
      setCompanyEmail(currentCompany.email || '');
      setCompanyPhone(currentCompany.phone || '');
      setCompanyAddress(currentCompany.address || '');
    }
    if (activeBillingConfig) {
      setPrefix(activeBillingConfig.prefix || 'FE');
      setResolutionNumber(activeBillingConfig.resolutionNumber || '187640000099');
      setResolutionDate(activeBillingConfig.resolutionDate || '2026-01-15');
      setRangeFrom(activeBillingConfig.authorizedRangeFrom ?? 101);
      setRangeTo(activeBillingConfig.authorizedRangeTo ?? 10000);
      setEnvironment(activeBillingConfig.environment || 'produccion');
      setProviderName(activeBillingConfig.providerName || 'Alanube');
      setClientId(activeBillingConfig.clientId || 'ala_cli_live_98a72b4c8102');
      setClientSecret(activeBillingConfig.clientSecret || 'ala_sec_f9823be800e2194ad9b3c4f');
      setApiToken(activeBillingConfig.apiToken || 'ala_live_sec_98f7e2a4d3_auth_key');
      setAutoSendEmail(activeBillingConfig.autoSendEmail !== false);
    }
  }, [currentCompany, activeBillingConfig, isOpen]);

  if (!isOpen) return null;

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const updatedBilling: ElectronicBillingConfig = {
      ...activeBillingConfig,
      providerType: 'tercero_proveedor',
      providerName: providerName as any,
      prefix: prefix.trim().toUpperCase() || 'FE',
      resolutionNumber: resolutionNumber.trim(),
      resolutionDate: resolutionDate.trim(),
      authorizedRangeFrom: Number(rangeFrom) || 1,
      authorizedRangeTo: Number(rangeTo) || 10000,
      environment,
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      apiToken: apiToken.trim(),
      autoSendEmail,
      apiEndpoint: environment === 'produccion'
        ? (providerName === 'Alanube' ? 'https://api.alanube.co/dian/v1/invoices' : 'https://api.factus.com.co/v1/bills')
        : (providerName === 'Alanube' ? 'https://sandbox-api.alanube.co/dian/v1/invoices' : 'https://sandbox-api.factus.com.co/v1/bills')
    };

    const updatedCompany: Company = {
      ...currentCompany,
      name: companyName.trim() || currentCompany.name,
      nit: companyNit.trim() || currentCompany.nit,
      regimen: companyRegimen as any,
      email: companyEmail.trim() || currentCompany.email,
      phone: companyPhone.trim() || currentCompany.phone,
      address: companyAddress.trim() || currentCompany.address,
      billingConfig: updatedBilling
    };

    if (onUpdateCompany) {
      onUpdateCompany(updatedCompany);
    }

    toast.success('Parámetros de empresa y configuración DIAN guardados correctamente.', 'Formulario Actualizado');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full shadow-2xl text-slate-100 my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Form Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl shrink-0">
              <Settings2 className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                  Herramientas y Parámetros de Administración
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Panel Formulario
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configure los parámetros fiscales de empresa, resolución DIAN, credenciales de conexión y diseño.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Cerrar formulario"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Form Bar */}
        <div className="flex items-center gap-1.5 px-4 sm:px-5 pt-3 border-b border-slate-800 bg-slate-950/40 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('parametros')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === 'parametros'
                ? 'bg-slate-900 text-indigo-400 border-indigo-500'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>1. Empresa & Resolución</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('conexion_dian')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === 'conexion_dian'
                ? 'bg-slate-900 text-indigo-400 border-indigo-500'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>2. Conexión DIAN & Alanube</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diseno')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === 'diseno'
                ? 'bg-slate-900 text-indigo-400 border-indigo-500'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-purple-400" />
            <span>3. Formato & Impresión</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('utilidades')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === 'utilidades'
                ? 'bg-slate-900 text-indigo-400 border-indigo-500'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
            <span>4. Utilidades & Envíos</span>
          </button>
        </div>

        {/* Form Body - Scrollable content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: DATOS DE EMPRESA Y RESOLUCIÓN */}
          {activeTab === 'parametros' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <h4 className="font-extrabold text-sm text-white">Datos de la Empresa Emisora</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Razón Social o Nombre Comercial:</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-semibold focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">NIT (con Dígito de Verificación):</label>
                    <input
                      type="text"
                      value={companyNit}
                      onChange={(e) => setCompanyNit(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Régimen Fiscal DIAN:</label>
                    <select
                      value={companyRegimen}
                      onChange={(e) => setCompanyRegimen(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-semibold focus:border-indigo-500 outline-none"
                    >
                      <option value="comun">Responsable de IVA (Régimen Común)</option>
                      <option value="simplificado">No Responsable de IVA (Simplificado)</option>
                      <option value="simple">Régimen Simple de Tributación (RST)</option>
                      <option value="gran_contribuyente">Gran Contribuyente</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Correo Electrónico de Facturación:</label>
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold text-slate-300 block">Dirección Fiscal / Sede Principal:</label>
                    <input
                      type="text"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Resolution Parameters */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h4 className="font-extrabold text-sm text-white">Resolución DIAN de Facturación Electrónica</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Prefijo Autorizado:</label>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold focus:border-indigo-500 outline-none"
                      placeholder="FE"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">No. Resolución Formulario 1876:</label>
                    <input
                      type="text"
                      value={resolutionNumber}
                      onChange={(e) => setResolutionNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Fecha de Resolución:</label>
                    <input
                      type="date"
                      value={resolutionDate}
                      onChange={(e) => setResolutionDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Rango Autorizado Desde:</label>
                    <input
                      type="number"
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Rango Autorizado Hasta:</label>
                    <input
                      type="number"
                      value={rangeTo}
                      onChange={(e) => setRangeTo(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Proveedor Tecnológico:</label>
                    <select
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-semibold focus:border-indigo-500 outline-none"
                    >
                      <option value="Alanube">Alanube Cloud API</option>
                      <option value="Factus">Factus API REST</option>
                      <option value="Siigo">Siigo Nube</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONEXIÓN DIAN & TEST EXPRESS */}
          {activeTab === 'conexion_dian' && (
            <div className="space-y-5">
              {/* Embedded Fast Connection Test Section */}
              <QuickDianTestSection
                currentCompany={currentCompany}
                billingConfig={{
                  ...activeBillingConfig,
                  clientId,
                  clientSecret,
                  apiToken,
                  environment,
                  prefix,
                  resolutionNumber
                }}
                onUpdateConfig={(cfg) => {
                  if (onUpdateCompany) {
                    onUpdateCompany({
                      ...currentCompany,
                      billingConfig: cfg
                    });
                  }
                }}
                isInline={true}
              />

              {/* Credentials Fields */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <h4 className="font-extrabold text-sm text-white">Credenciales API Alanube</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEnvironment('produccion')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        environment === 'produccion' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Producción
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnvironment('pruebas')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        environment === 'pruebas' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Sandbox
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">ID de Cliente (Client ID):</label>
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-xs focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-300 block">Clave Secreta (Client Secret):</label>
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showSecret ? 'Ocultar' : 'Ver'}</span>
                      </button>
                    </div>
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-xs focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold text-slate-300 block">Bearer Token / API Key:</label>
                    <input
                      type="password"
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-xs focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-300">Transmitir factura y enviar copia XML con validación previa al correo del cliente</span>
                  <input
                    type="checkbox"
                    checked={autoSendEmail}
                    onChange={(e) => setAutoSendEmail(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DISEÑO & FORMATO */}
          {activeTab === 'diseno' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <h4 className="font-extrabold text-sm text-white">Configuración del Formato de Impresión</h4>
                </div>
                <p className="text-xs text-slate-400">
                  Personalice el aspecto de sus facturas electrónicas para formato Carta empresarial o tirilla POS térmica (80mm/58mm).
                </p>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDesignModal?.();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all"
                  >
                    <Palette className="w-4 h-4" />
                    <span>Abrir Diseñador Visual de Factura</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: UTILIDADES TÉCNICAS */}
          {activeTab === 'utilidades' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white">Habilitación DIAN (8 Facturas)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ejecutar el set de pruebas oficial de la DIAN para pasar a producción.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenHabilitationModal?.();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all mt-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Lanzar Asistente de 8 Facturas</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-teal-400" />
                  <span className="font-bold text-white">Servidor de Correo (SMTP)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Configuración de host, credenciales y plantillas de correo para notificaciones.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSmtpModal?.();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all mt-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Configurar SMTP</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-white">Estructura JSON Oficial</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Inspeccionar el payload UBL 2.1 que se envía a la API del proveedor tecnológico.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPayloadModal?.();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all mt-2"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Ver Payload JSON</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-white">Consola Alanube Producción</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Acceder directamente al portal web en la nube oficial de Alanube.
                </p>
                <a
                  href="https://app.alanube.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all mt-2"
                >
                  <span>Abrir app.alanube.co</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-xs font-semibold"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => handleSaveAll()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Parámetros y Configuración</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Company } from '../../types';
import { toast } from '../../context/ToastContext';

interface CompanyParamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  onSaveCompany: (updatedCompany: Company) => void;
}

export default function CompanyParamsModal({
  isOpen,
  onClose,
  company,
  onSaveCompany
}: CompanyParamsModalProps) {
  const [activeTab, setActiveTab] = useState<'fiscal' | 'dian' | 'recaudo' | 'pagos'>('fiscal');

  // Tab 1: Datos Básicos & Fiscales
  const [name, setName] = useState('');
  const [nit, setNit] = useState('');
  const [slogan, setSlogan] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [regimen, setRegimen] = useState<Company['regimen']>('no_responsable');
  const [currency, setCurrency] = useState<Company['currency']>('COP');
  const [period, setPeriod] = useState<number>(2026);
  const [businessType, setBusinessType] = useState<Company['businessType']>('tecnologia_servicios');

  // Tab 2: Parámetros Facturación DIAN
  const [prefix, setPrefix] = useState('FE');
  const [resolutionNumber, setResolutionNumber] = useState('187640000099');
  const [resolutionDate, setResolutionDate] = useState('2026-01-15');
  const [rangeFrom, setRangeFrom] = useState(101);
  const [rangeTo, setRangeTo] = useState(10000);
  const [providerName, setProviderName] = useState('Factus');
  const [billingEnv, setBillingEnv] = useState<'produccion' | 'pruebas'>('produccion');
  const [autoSendEmail, setAutoSendEmail] = useState(true);

  // Tab 3: Cuentas Bancarias & Notas de Pie
  const [bankAccountDetails, setBankAccountDetails] = useState('');
  const [termsAndNotes, setTermsAndNotes] = useState('');
  const [showBankAccounts, setShowBankAccounts] = useState(true);
  const [showResolutionBox, setShowResolutionBox] = useState(true);

  // Tab 4: Datáfono & Pasarela
  const [terminalId, setTerminalId] = useState('FINTEKIA-POS-01');
  const [datafonoProvider, setDatafonoProvider] = useState('wompi_pos');
  const [wompiEnv, setWompiEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [wompiPublicKey, setWompiPublicKey] = useState('pub_test_Q5yDA9xoKdePzhSGeVe9HAez7HgGObCi');

  // Sync state when company prop changes
  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setNit(company.nit || '');
      setSlogan(company.slogan || '');
      setAddress(company.address || '');
      setCity(company.city || 'Bogotá, D.C.');
      setPhone(company.phone || '');
      setEmail(company.email || '');
      setRegimen(company.regimen || 'no_responsable');
      setCurrency(company.currency || 'COP');
      setPeriod(company.period || 2026);
      setBusinessType(company.businessType || 'tecnologia_servicios');

      // DIAN Billing Config
      if (company.billingConfig) {
        setPrefix(company.billingConfig.prefix || 'FE');
        setResolutionNumber(company.billingConfig.resolutionNumber || '187640000099');
        setResolutionDate(company.billingConfig.resolutionDate || '2026-01-15');
        setRangeFrom(company.billingConfig.authorizedRangeFrom || 101);
        setRangeTo(company.billingConfig.authorizedRangeTo || 10000);
        setProviderName(company.billingConfig.providerName || 'Factus');
        setBillingEnv(company.billingConfig.environment || 'produccion');
        setAutoSendEmail(company.billingConfig.autoSendEmail !== false);
      }

      // Invoice Design & Accounts
      if (company.invoiceDesign) {
        setBankAccountDetails(company.invoiceDesign.bankAccountDetails || '');
        setTermsAndNotes(company.invoiceDesign.termsAndNotes || '');
        setShowBankAccounts(company.invoiceDesign.showBankAccounts !== false);
        setShowResolutionBox(company.invoiceDesign.showResolutionBox !== false);
      } else {
        setBankAccountDetails('Bancolombia Cta Ahorros No. 892-004312-55 (NIT 87942146-5)');
        setTermsAndNotes('Esta factura de venta se asimila en sus efectos legales a una letra de cambio según la Ley 1231 de 2008.');
      }

      // Datáfono & Wompi
      if (company.datafonoConfig) {
        setTerminalId(company.datafonoConfig.terminalId || 'FINTEKIA-POS-01');
        setDatafonoProvider(company.datafonoConfig.provider || 'wompi_pos');
      }
      if (company.wompiConfig) {
        setWompiEnv(company.wompiConfig.environment || 'sandbox');
        setWompiPublicKey(company.wompiConfig.publicKey || 'pub_test_Q5yDA9xoKdePzhSGeVe9HAez7HgGObCi');
      }
    }
  }, [company, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.warning('Por favor ingrese la razón social o nombre de la empresa.', 'Nombre Requerido');
      return;
    }
    if (!nit.trim()) {
      toast.warning('Por favor ingrese el NIT de la empresa.', 'NIT Requerido');
      return;
    }

    const updatedCompany: Company = {
      ...company,
      name: name.trim(),
      nit: nit.trim(),
      slogan: slogan.trim(),
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      email: email.trim(),
      regimen,
      currency,
      period: Number(period) || 2026,
      businessType,
      billingConfig: {
        ...(company.billingConfig || {
          providerType: 'tercero_proveedor',
          providerName: 'Factus',
          providerNit: '901.324.558-1',
          apiEndpoint: 'https://api.factus.com.co/v1/bills',
          apiToken: 'fk_live_9a87d6e5c4b3a2_token_auth',
          testSetId: 'f7c81a2e-4b3d-4950-8912-78d1e2a3b4c5'
        }),
        prefix: prefix.trim().toUpperCase(),
        resolutionNumber: resolutionNumber.trim(),
        resolutionDate: resolutionDate.trim(),
        authorizedRangeFrom: Number(rangeFrom) || 1,
        authorizedRangeTo: Number(rangeTo) || 99999,
        providerName,
        environment: billingEnv,
        autoSendEmail
      },
      invoiceDesign: {
        ...(company.invoiceDesign || {
          logoPosition: 'left',
          logoSize: 'md',
          logoStyle: 'rounded',
          accentColor: '#10b981',
          showSlogan: true,
          showSignatures: true
        }),
        bankAccountDetails: bankAccountDetails.trim(),
        termsAndNotes: termsAndNotes.trim(),
        showBankAccounts,
        showResolutionBox
      },
      datafonoConfig: {
        ...(company.datafonoConfig || {
          enabled: true,
          provider: 'wompi_pos' as const,
          autoReceipt: true
        }),
        enabled: true,
        terminalId: terminalId.trim(),
        provider: datafonoProvider as any,
        autoReceipt: company.datafonoConfig?.autoReceipt ?? true
      },
      wompiConfig: {
        ...(company.wompiConfig || {
          enabled: true,
          privateKey: '',
          integritySecret: 'test_integrity_4XG9Nsm2j1Qz8hP54gH6xL7zK1a',
          autoCreateReceipt: true,
          acceptedPaymentMethods: ['CARD', 'NEQUI', 'BANCOLOMBIA_TRANSFER', 'PSE'] as const,
          pasarelaAccountCode: '111005',
          commissionAccountCode: '530515'
        }),
        environment: wompiEnv,
        publicKey: wompiPublicKey.trim()
      }
    };

    onSaveCompany(updatedCompany);
    toast.success('Parámetros de empresa actualizados correctamente. Continúe con su digitación.', 'Parámetros Guardados');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl shrink-0">
              <i className="ri-building-line"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Parámetros de la Empresa Facturadora
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {company.name}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ajuste datos fiscales, resolución DIAN y cuentas de recaudo sin salir de facturación.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-1 overflow-x-auto scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveTab('fiscal')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'fiscal'
                ? 'border-blue-500 text-blue-400 bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="ri-government-line text-sm"></i>
            <span>Datos Fiscales & Básicos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dian')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'dian'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="ri-file-shield-2-line text-sm"></i>
            <span>Resolución & Prefijo DIAN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recaudo')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'recaudo'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="ri-bank-card-line text-sm"></i>
            <span>Cuentas & Pie de Factura</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pagos')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'pagos'
                ? 'border-purple-500 text-purple-400 bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="ri-device-line text-sm"></i>
            <span>Datáfono & Wompi</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          
          {/* TAB 1: DATOS FISCALES & BÁSICOS */}
          {activeTab === 'fiscal' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Razón Social / Nombre Comercial <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ej. DIGITAL YA'BI S.A.S."
                    className="w-full text-xs font-semibold rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    NIT / Identificación Tributaria <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                    placeholder="ej. 87942146-5"
                    className="w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Lema Comercial / Slogan
                  </label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="ej. ALEGRIA QUE SE EXPANDE"
                    className="w-full text-xs rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Régimen Tributario DIAN
                  </label>
                  <select
                    value={regimen}
                    onChange={(e) => setRegimen(e.target.value as any)}
                    className="w-full text-xs font-medium rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                  >
                    <option value="no_responsable">No Responsable de IVA (Antiguo Simplificado)</option>
                    <option value="responsable">Responsable de IVA (Común)</option>
                    <option value="simple">Régimen Simple de Tributación (RST)</option>
                    <option value="gran_contribuyente">Gran Contribuyente</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Giro / Tipo de Empresa
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as any)}
                    className="w-full text-xs font-medium rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                  >
                    <option value="comercial">Comercial (Compra y Venta)</option>
                    <option value="tecnologia_servicios">Tecnología & Servicios TI</option>
                    <option value="produccion">Producción & Manufactura MRP</option>
                    <option value="mixto">Mixto (Servicios + Manufactura)</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Dirección Fiscal Principal
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ej. CR 28H 41 - 50"
                    className="w-full text-xs rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Ciudad / Municipio
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="ej. Bogotá, D.C."
                    className="w-full text-xs rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="ej. (601) 745-9900 o 3101234567"
                    className="w-full text-xs rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    E-mail Facturación Electrónica
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="facturacion@empresa.com"
                    className="w-full text-xs rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Moneda Operativa
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="w-full text-xs font-semibold rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                  >
                    <option value="COP">COP - Peso Colombiano ($)</option>
                    <option value="USD">USD - Dólar Estadounidense ($)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESOLUCIÓN & PREFIJO DIAN */}
          {activeTab === 'dian' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs flex items-center gap-3">
                <i className="ri-shield-keyhole-line text-indigo-400 text-xl shrink-0"></i>
                <div>
                  <span className="font-bold text-indigo-300 block">Autorización de Facturación Electrónica DIAN</span>
                  <span className="text-slate-400 text-[11px]">
                    Estos datos se reflejan automáticamente en el encabezado de todas las facturas y en la validación previa del XML ante la DIAN.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Prefijo Autorizado <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                    placeholder="ej. FE o POS"
                    className="w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">Comúnmente FE, SETT, o POS.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Número de Resolución DIAN <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={resolutionNumber}
                    onChange={(e) => setResolutionNumber(e.target.value)}
                    placeholder="ej. 187640000099"
                    className="w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Fecha de Resolución DIAN
                  </label>
                  <input
                    type="date"
                    required
                    value={resolutionDate}
                    onChange={(e) => setResolutionDate(e.target.value)}
                    className="w-full text-xs rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Proveedor Tecnológico DIAN
                  </label>
                  <select
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    className="w-full text-xs font-medium rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="Factus">Factus (API REST Colombia)</option>
                    <option value="Alanube">Alanube (Cloud DIAN)</option>
                    <option value="Carvajal">Carvajal Tecnología y Servicios</option>
                    <option value="Directo_DIAN">Software Propio / Directo DIAN</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Rango Desde
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(parseInt(e.target.value) || 1)}
                    className="w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Rango Hasta
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(parseInt(e.target.value) || 10000)}
                    className="w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Ambiente de Emisión
                  </label>
                  <select
                    value={billingEnv}
                    onChange={(e) => setBillingEnv(e.target.value as any)}
                    className="w-full text-xs font-medium rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="produccion">🟢 Producción (Validez Fiscal Oficial DIAN)</option>
                    <option value="pruebas">🟡 Habilitación / Pruebas (TestSetId)</option>
                  </select>
                </div>

                <div className="space-y-1 flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Envío Automático de Correo
                    </label>
                    <span className="text-[10px] text-slate-500">Enviar factura al cliente al emitir</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSendEmail}
                    onChange={(e) => setAutoSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUENTAS BANCARIAS & PIE DE FACTURA */}
          {activeTab === 'recaudo' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Cuentas Bancarias para Recaudo (Impresas en Factura)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBankAccounts}
                      onChange={(e) => setShowBankAccounts(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-900 border-slate-700"
                    />
                    <span>Mostrar en formato impreso</span>
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={bankAccountDetails}
                  onChange={(e) => setBankAccountDetails(e.target.value)}
                  placeholder="ej. Bancolombia Cta Ahorros No. 892-004312-55 (NIT 87942146-5) · Davivienda Cta Cte 0040-5441-3200"
                  className="w-full text-xs rounded-xl p-3 bg-slate-950 border border-slate-700 text-white outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 block">
                  Estas cuentas aparecerán en el bloque de recaudo bancario en el PDF carta y tirilla POS para facilitar transferencias de sus clientes.
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Notas Legales al Pie & Términos
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showResolutionBox}
                      onChange={(e) => setShowResolutionBox(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-900 border-slate-700"
                    />
                    <span>Mostrar cuadro de resolución DIAN</span>
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={termsAndNotes}
                  onChange={(e) => setTermsAndNotes(e.target.value)}
                  placeholder="ej. Esta factura de venta se asimila en sus efectos legales a una letra de cambio según la Ley 1231 de 2008. Autorizo el tratamiento de mis datos de acuerdo a la Ley 1581 de 2012."
                  className="w-full text-xs rounded-xl p-3 bg-slate-950 border border-slate-700 text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* TAB 4: DATÁFONO & WOMPI */}
          {activeTab === 'pagos' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs flex items-center gap-3">
                <i className="ri-device-line text-purple-400 text-xl shrink-0"></i>
                <div>
                  <span className="font-bold text-purple-300 block">Dispositivos POS & Pasarela de Pagos</span>
                  <span className="text-slate-400 text-[11px]">
                    Parametrice el código del datáfono de mostrador y la integración con Wompi Bancolombia.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    ID Terminal Datáfono Físico
                  </label>
                  <input
                    type="text"
                    value={terminalId}
                    onChange={(e) => setTerminalId(e.target.value.toUpperCase())}
                    placeholder="ej. FINTEKIA-POS-01"
                    className="w-full text-xs font-mono font-bold rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-slate-500">Aparece en los registros de váucher.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Proveedor Datáfono
                  </label>
                  <select
                    value={datafonoProvider}
                    onChange={(e) => setDatafonoProvider(e.target.value)}
                    className="w-full text-xs font-medium rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-purple-500"
                  >
                    <option value="wompi_pos">Wompi / Bancolombia POS</option>
                    <option value="redeban">Redeban Multicolor</option>
                    <option value="credibanco">Credibanco POS</option>
                    <option value="bold">Bold Smart POS</option>
                    <option value="treinta">Treinta / Datáfono Independiente</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Ambiente Wompi Bancolombia
                  </label>
                  <select
                    value={wompiEnv}
                    onChange={(e) => setWompiEnv(e.target.value as any)}
                    className="w-full text-xs font-semibold rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-purple-500"
                  >
                    <option value="sandbox">🧪 Sandbox / Pruebas (Tarjetas de test)</option>
                    <option value="production">🚀 Producción Oficial (Cobros reales)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Llave Pública Wompi (Public Key)
                  </label>
                  <input
                    type="text"
                    value={wompiPublicKey}
                    onChange={(e) => setWompiPublicKey(e.target.value)}
                    placeholder="pub_test_..."
                    className="w-full text-xs font-mono rounded-xl px-3 py-2.5 bg-slate-950 border border-slate-700 text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">
              <i className="ri-information-line text-blue-400 mr-1"></i>
              Los cambios se aplicarán de inmediato a esta empresa.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <i className="ri-save-line text-sm"></i>
                <span>Guardar Parámetros</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}

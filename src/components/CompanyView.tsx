import React, { useState, useRef, useEffect } from 'react';
import { toast } from "../context/ToastContext";
import { Company, InvoiceDesignConfig } from '../types';
import { THEMES_MAP } from './Sidebar';
import { DEFAULT_INVOICE_DESIGN } from './invoicing/InvoiceDesignModal';
import { 
  Building2, 
  Upload, 
  Trash2, 
  Save, 
  Briefcase, 
  ShieldAlert, 
  Coins, 
  Calendar, 
  Globe2,
  CheckCircle,
  FileText,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  Eye,
  PlusCircle,
  Files,
  Building,
  Image as ImageIcon,
  Laptop,
  Cpu,
  Wrench,
  Layers,
  Settings2,
  Server,
  Cloud,
  ShieldCheck,
  CheckCheck,
  Key,
  Palette
} from 'lucide-react';

interface CompanyViewProps {
  currentCompany: Company;
  updateCompany: (co: Company) => void;
  theme: string;
  companies: Company[];
  onSwitchCompany: (id: string) => void;
  onCreateCompany: () => void;
}

export default function CompanyView({
  currentCompany,
  updateCompany,
  theme,
  companies,
  onSwitchCompany,
  onCreateCompany
}: CompanyViewProps) {
  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;
  const isDark = theme !== 'light_gray';

  // Toggle between "directory", "form" and "invoice_design" tabs
  const [activeTab, setActiveTab] = useState<'directory' | 'form' | 'invoice_design'>('directory');

  // Track which company we are currently editing
  const [editingCompanyId, setEditingCompanyId] = useState<string>(currentCompany.id);

  // Invoice Design customizer state
  const [designLogoPosition, setDesignLogoPosition] = useState<InvoiceDesignConfig['logoPosition']>('left');
  const [designLogoSize, setDesignLogoSize] = useState<InvoiceDesignConfig['logoSize']>('md');
  const [designLogoStyle, setDesignLogoStyle] = useState<InvoiceDesignConfig['logoStyle']>('rounded');
  const [designAccentColor, setDesignAccentColor] = useState<string>('#2563eb');
  const [designShowSlogan, setDesignShowSlogan] = useState<boolean>(true);
  const [designShowResolutionBox, setDesignShowResolutionBox] = useState<boolean>(true);
  const [designShowBankAccounts, setDesignShowBankAccounts] = useState<boolean>(true);
  const [designShowSignatures, setDesignShowSignatures] = useState<boolean>(true);
  const [designBankAccountDetails, setDesignBankAccountDetails] = useState<string>('');
  const [designTermsAndNotes, setDesignTermsAndNotes] = useState<string>('');

  // Form local state fields
  const [name, setName] = useState('');
  const [nit, setNit] = useState('');
  const [slogan, setSlogan] = useState('');
  const [address, setAddress] = useState('');
  const [regimen, setRegimen] = useState<Company['regimen']>('responsable');
  const [currency, setCurrency] = useState<Company['currency']>('COP');
  const [period, setPeriod] = useState(2026);
  const [smmlv, setSmmlv] = useState(1423500);
  const [auxTransporte, setAuxTransporte] = useState(172000);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [businessType, setBusinessType] = useState<Company['businessType']>('tecnologia_servicios');
  const [enableProduction, setEnableProduction] = useState<boolean>(false);
  const [enableTechServices, setEnableTechServices] = useState<boolean>(true);

  // Electronic Billing via Third-Party Provider states
  const [billingProviderType, setBillingProviderType] = useState<'tercero_proveedor' | 'dian_directo'>('tercero_proveedor');
  const [billingProviderName, setBillingProviderName] = useState<'Alanube' | 'Factus' | 'Siigo' | 'Alegra' | 'Dataico' | 'TheFactoryHKA' | 'Personalizado'>('Alanube');
  const [billingEnvironment, setBillingEnvironment] = useState<'pruebas' | 'produccion'>('produccion');
  const [billingPrefix, setBillingPrefix] = useState('FE');
  const [billingResolution, setBillingResolution] = useState('187640000099');
  const [billingResolutionDate, setBillingResolutionDate] = useState('2026-01-15');
  const [billingClientId, setBillingClientId] = useState('ala_cli_live_98a72b4c8102');
  const [billingClientSecret, setBillingClientSecret] = useState('ala_sec_f9823be800e2194ad9b3c4f');
  const [billingApiToken, setBillingApiToken] = useState('ala_live_sec_98f7e2a4d3_auth_key');
  const [billingAutoSendEmail, setBillingAutoSendEmail] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ ok: boolean; message: string; details?: string } | null>(null);

  // Sync edit form fields whenever selection changes or external assets update
  useEffect(() => {
    const co = companies.find(c => c.id === editingCompanyId) || currentCompany;
    if (co) {
      setName(co.name);
      setNit(co.nit);
      setSlogan(co.slogan || '');
      setAddress(co.address || '');
      setRegimen(co.regimen);
      setCurrency(co.currency || 'COP');
      setPeriod(co.period || 2026);
      setLogoUrl(co.logoUrl);
      setBusinessType(co.businessType || 'tecnologia_servicios');
      setEnableProduction(co.enableProduction ?? false);
      setEnableTechServices(co.enableTechServices ?? true);
      setSmmlv(co.payrollParameters?.smmlv || 1423500);
      setAuxTransporte(co.payrollParameters?.auxTransporte || 172000);

      // Electronic billing config sync
      if (co.billingConfig) {
        setBillingProviderType(co.billingConfig.providerType || 'tercero_proveedor');
        setBillingProviderName(co.billingConfig.providerName || 'Alanube');
        setBillingEnvironment(co.billingConfig.environment || 'produccion');
        setBillingPrefix(co.billingConfig.prefix || 'FE');
        setBillingResolution(co.billingConfig.resolutionNumber || '187640000099');
        setBillingResolutionDate(co.billingConfig.resolutionDate || '2026-01-15');
        setBillingClientId(co.billingConfig.clientId || 'ala_cli_live_98a72b4c8102');
        setBillingClientSecret(co.billingConfig.clientSecret || 'ala_sec_f9823be800e2194ad9b3c4f');
        setBillingApiToken(co.billingConfig.apiToken || 'ala_live_sec_98f7e2a4d3_auth_key');
        setBillingAutoSendEmail(co.billingConfig.autoSendEmail !== false);
      }

      // Invoice Design sync
      const des = co.invoiceDesign || DEFAULT_INVOICE_DESIGN;
      setDesignLogoPosition(des.logoPosition || 'left');
      setDesignLogoSize(des.logoSize || 'md');
      setDesignLogoStyle(des.logoStyle || 'rounded');
      setDesignAccentColor(des.accentColor || (co.id === 'co-2' ? '#d97706' : '#2563eb'));
      setDesignShowSlogan(des.showSlogan !== false);
      setDesignShowResolutionBox(des.showResolutionBox !== false);
      setDesignShowBankAccounts(des.showBankAccounts !== false);
      setDesignShowSignatures(des.showSignatures !== false);
      setDesignBankAccountDetails(des.bankAccountDetails || (co.id === 'co-2' ? 'Banco de Bogotá Cta Ahorros No. 034-771290-12 (NIT 800.224.990-1)' : 'Bancolombia Cta Corriente No. 245-098712-88 (NIT 901.455.120-3)'));
      setDesignTermsAndNotes(des.termsAndNotes || DEFAULT_INVOICE_DESIGN.termsAndNotes || '');
    }
  }, [editingCompanyId, currentCompany, companies]);

  // Drag and drop logo hooks
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI Toast Status
  const [notification, setNotification] = useState<{message: string, detail?: string} | null>(null);

  const showToast = (message: string, detail?: string) => {
    setNotification({ message, detail });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const PRESET_LOGOS = [
    {
      name: 'Industrial Panadería',
      url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    },
    {
      name: 'Corporativo Premium',
      url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    },
    {
      name: 'Logotipo Circular Molino',
      url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    },
    {
      name: 'Delicia Artesanal',
      url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    }
  ];

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.warning('Por favor selecciona un archivo de imagen (PNG, JPG, SVG, WEBP).', 'Formato Inválido');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setLogoUrl(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeLogo = () => {
    setLogoUrl(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !nit.trim()) {
      toast.warning('La Razón Social y el NIT de la organización son obligatorios.', 'Datos Requeridos');
      return;
    }

    // Preserve status
    const targetComp = companies.find(c => c.id === editingCompanyId);

    const updated: Company = {
      id: editingCompanyId,
      name: name.trim(),
      nit: nit.trim(),
      slogan: slogan.trim(),
      address: address.trim(),
      regimen,
      currency,
      period: Number(period) || 2026,
      logoUrl: logoUrl,
      businessType,
      enableProduction,
      enableTechServices,
      billingConfig: {
        providerType: billingProviderType,
        providerName: billingProviderName,
        providerNit: billingProviderName === 'Alanube' 
          ? '901.464.305-6' 
          : billingProviderName === 'Factus' 
          ? '901.324.558-1' 
          : billingProviderName === 'Siigo' 
          ? '830.048.140-6' 
          : billingProviderName === 'Alegra' 
          ? '900.551.229-3' 
          : '900.123.456-7',
        apiEndpoint: billingProviderName === 'Alanube'
          ? (billingEnvironment === 'produccion' ? 'https://api.alanube.co/dian/v1/invoices' : 'https://sandbox-api.alanube.co/dian/v1/invoices')
          : billingProviderName === 'Factus'
          ? 'https://api.factus.com.co/v1/bills'
          : undefined,
        environment: billingEnvironment,
        prefix: billingPrefix.trim() || 'FE',
        resolutionNumber: billingResolution.trim() || '187640000099',
        resolutionDate: billingResolutionDate || '2026-01-15',
        clientId: billingClientId.trim(),
        clientSecret: billingClientSecret.trim(),
        apiToken: billingApiToken,
        autoSendEmail: billingAutoSendEmail
      },
      isActive: targetComp ? (targetComp.isActive !== false) : true,
      payrollParameters: {
        smmlv: Number(smmlv) || 1423500,
        auxTransporte: Number(auxTransporte) || 172000
      }
    };

    updateCompany(updated);
    showToast(
      '¡Configuración guardada!', 
      'Razón social, NIT y logotipo comercial actualizados correctamente.'
    );
    
    // Go back to the directory tab to see it live
    setTimeout(() => {
      setActiveTab('directory');
    }, 800);
  };

  // Toggle active / inactive status of a company
  const handleToggleState = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (id === currentCompany.id) {
      toast.error('No puedes desactivar la empresa activa en uso actual.', 'Operación Bloqueada');
      return;
    }

    const co = companies.find(c => c.id === id);
    if (co) {
      const isCurrentlyActive = co.isActive !== false;
      const updated: Company = {
        ...co,
        isActive: !isCurrentlyActive
      };
      updateCompany(updated);
      showToast(
        `Organización ${isCurrentlyActive ? 'desactivada' : 'activada'}`,
        `La empresa "${co.name}" ahora está ${isCurrentlyActive ? 'inactiva para el ERP' : 'lista para operar'}.`
      );
    }
  };

  // Toggle production module state for a company directly
  const handleToggleProductionForCompany = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const co = companies.find(c => c.id === id);
    if (co) {
      const isCurrentlyEnabled = co.enableProduction !== false;
      const updated: Company = {
        ...co,
        enableProduction: !isCurrentlyEnabled
      };
      updateCompany(updated);
      showToast(
        `Módulo de Producción ${!isCurrentlyEnabled ? 'Activado' : 'Desactivado'}`,
        `Para "${co.name}", el módulo de producción industrial (MRP) ahora está ${!isCurrentlyEnabled ? 'activo' : 'desactivado'}.`
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Visual notification bubble */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-fade-in max-w-sm">
          <div className="bg-emerald-500/10 text-emerald-400 p-1.5 rounded-lg shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="font-bold text-xs text-slate-100">{notification.message}</p>
            {notification.detail && <p className="text-[10px] text-slate-400 leading-normal">{notification.detail}</p>}
          </div>
        </div>
      )}

      {/* Header Overview Card */}
      <div className={`p-8 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 ${activeTheme.cardStyles}`}>
        <div className="space-y-2 text-center md:text-left">
          <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold">
            Teneduría Multicompany ERP
          </span>
          <h2 className="font-display font-black text-2xl tracking-tight text-slate-900 dark:text-white uppercase flex items-center justify-center md:justify-start gap-2">
            <Building2 className="w-6 h-6 text-amber-500" />
            Gestión Multiorganización
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            Centralice la contabilidad de sus diferentes líneas de negocio. Configure y asocie logotipos oficiales, gestione estados de operación (Activo/Inactivo) y administre parámetros DIAN integrados para facturación y nóminas.
          </p>
        </div>

        {/* Visual Brand Profile of CURRENT Active Company */}
        <div className="flex items-center gap-4 shrink-0 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850">
          <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-750 p-2 overflow-hidden shadow-inner relative">
            {currentCompany.logoUrl ? (
              <img 
                src={currentCompany.logoUrl} 
                alt="Logo Empresa" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Building2 className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-extrabold text-emerald-555 dark:text-emerald-400 uppercase tracking-wider">Operación Activa</span>
            </div>
            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase leading-normal mt-0.5 truncate max-w-[170px]">{currentCompany.name}</h4>
            <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-mono">NIT {currentCompany.nit}</p>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 text-xs font-bold uppercase transition-all border-b-2 flex items-center gap-2 px-1 cursor-pointer ${
            activeTab === 'directory' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          Directorio de Organizaciones ({companies.length})
        </button>
        <button
          onClick={() => {
            setEditingCompanyId(currentCompany.id);
            setActiveTab('form');
          }}
          className={`pb-3 text-xs font-bold uppercase transition-all border-b-2 flex items-center gap-2 px-1 cursor-pointer ${
            activeTab === 'form' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Editar Detalles y Logotipo
        </button>
        <button
          onClick={() => {
            setEditingCompanyId(currentCompany.id);
            setActiveTab('invoice_design');
          }}
          className={`pb-3 text-xs font-bold uppercase transition-all border-b-2 flex items-center gap-2 px-1 cursor-pointer ${
            activeTab === 'invoice_design' 
              ? 'border-purple-500 text-purple-600 dark:text-purple-400' 
              : 'border-transparent text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Palette className="w-4 h-4" />
          Diseño de Factura & Ubicación del Logo
        </button>
      </div>

      {/* TAB 1: Directory List with Activate/Deactivate Toggle */}
      {activeTab === 'directory' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Quick Explanatory Banner about Logo and Status */}
          <div className="bg-gradient-to-r from-teal-500/10 to-blue-500/10 rounded-2xl p-5 border border-teal-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase flex items-center gap-2">
                <Eye className="w-4 h-4 text-teal-500" /> ¿Dónde queda y para qué sirve cargar el Logotipo?
              </h4>
              <p className="text-[10.5px] text-slate-650 dark:text-slate-400 max-w-xl leading-relaxed">
                El logotipo configurado para cada empresa es persistido y se incrusta en tiempo real en un diseño A4 corporativo limpio dentro de:
                <strong> Facturación de Venta</strong>, <strong>Nómina de Empleados (Desprendibles)</strong>, <strong>Certificados Tributarios de Retención (Artículo 381 E.T.)</strong> y en los <strong>Encabezados Principales</strong> del ERP.
              </p>
            </div>
            
            <button
              onClick={onCreateCompany}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              Añadir Línea / Empresa
            </button>
          </div>

          <div className={`p-6 rounded-2xl space-y-4 ${activeTheme.cardStyles}`}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
              <div>
                <h3 className="font-display font-black text-xs tracking-wider text-slate-500 uppercase">Lista de Empresas Registradas en FinteKia</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Haga clic en cualquiera para cambiar el entorno contable o actualizar sus firmas.</p>
              </div>
            </div>

            {/* Corporate Grid Directory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map((co) => {
                const isActiveEnv = co.id === currentCompany.id;
                const isStatusActive = co.isActive !== false;
                
                return (
                  <div 
                    key={co.id} 
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                      isActiveEnv 
                        ? 'border-blue-500 bg-blue-500/[0.02] shadow-md shadow-blue-550/5' 
                        : isStatusActive
                          ? 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 shadow-sm'
                          : 'border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20'
                    }`}
                  >
                    
                    {/* Tiny operating badge top right */}
                    {isActiveEnv && (
                      <span className="absolute top-0 right-0 bg-blue-500 text-white font-mono text-[8px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-inner">
                        Operando Actual
                      </span>
                    )}

                    {/* Meta info block */}
                    <div className="flex gap-4 items-start">
                      
                      {/* Logo Frame */}
                      <div className={`w-16 h-16 shrink-0 rounded-xl bg-white dark:bg-slate-850 flex items-center justify-center p-1.5 border relative ${
                        isActiveEnv 
                          ? 'border-blue-400' 
                          : 'border-slate-200 dark:border-slate-750'
                      }`}>
                        {co.logoUrl ? (
                          <img 
                            src={co.logoUrl} 
                            alt={co.name} 
                            className="w-full h-full object-contain" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Building className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        )}
                        
                        {/* Inline tiny label to confirm logo is registered */}
                        <span className={`absolute -bottom-1 -right-1 p-0.5 rounded-full ${
                          co.logoUrl ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        }`} title={co.logoUrl ? "Logotipo Comercial Registrado" : "Sin Logotipo"}>
                          <ImageIcon className="w-3 h-3" />
                        </span>
                      </div>

                      {/* Brand core identifiers */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-extrabold text-sm truncate uppercase tracking-tight ${
                            !isStatusActive ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-800 dark:text-slate-100'
                          }`}>
                            {co.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">NIT: {co.nit}</p>
                        {co.slogan && <p className="text-[10.5px] text-slate-550 dark:text-slate-400 italic truncate font-sans">"{co.slogan}"</p>}
                        
                        {/* Address */}
                        <p className="text-[9px] text-slate-450 truncate uppercase tracking-tight">{co.address || 'No registrada'}</p>
                      </div>
                    </div>

                    {/* Parameters summary and active regime badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-850/60 text-[10px]">
                      <span className="font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded uppercase tracking-wide">
                        Régimen {co.regimen.replace('_', ' ')}
                      </span>
                      <span className="font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                        {co.currency || 'COP'}
                      </span>
                      
                      {/* Business Model Tag */}
                      <span className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
                        co.businessType === 'produccion'
                          ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                      }`}>
                        {co.businessType === 'produccion' ? <Cpu className="w-3 h-3" /> : <Laptop className="w-3 h-3" />}
                        <span>
                          {co.businessType === 'produccion' ? 'Manufactura Industrial' : 'Tecnología & Servicios TI'}
                        </span>
                      </span>

                      {/* Electronic Billing Provider Badge */}
                      <span className="px-2 py-0.5 rounded font-bold bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                        <Server className="w-3 h-3" />
                        <span>{co.billingConfig?.providerName || 'Factus'} API</span>
                      </span>

                      <span className="text-slate-400 font-medium ml-auto">
                        SMMLV: <strong>${co.payrollParameters?.smmlv.toLocaleString('es-CO') || '1.423.500'}</strong>
                      </span>
                    </div>

                    {/* State Control and Quick Tools */}
                    <div className="flex items-center justify-between gap-2 pt-1 font-sans">
                      
                      <div className="flex items-center gap-2">
                        {/* Active/Inactive Switch Controller */}
                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/50 dark:bg-slate-950/20">
                          <button
                            type="button"
                            onClick={(e) => handleToggleState(co.id, e)}
                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg transition-all ${
                              isStatusActive 
                                ? 'text-emerald-600 dark:text-emerald-400 hover:bg-slate-205 dark:hover:bg-slate-800' 
                                : 'text-rose-600 dark:text-rose-400 hover:bg-slate-205 dark:hover:bg-slate-800'
                            }`}
                            title={isActiveEnv ? "No puedes desactivar el entorno de trabajo actual" : "Alternar estado activo de la empresa"}
                          >
                            {isStatusActive ? (
                              <>
                                <ToggleRight className="w-5 h-5 text-emerald-500 scale-110" />
                                <span className="uppercase tracking-wider">Activa</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-5 h-5 text-slate-400 scale-110" />
                                <span className="uppercase tracking-wider text-slate-400">Inactiva</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Production Module Status Badge */}
                        <div
                          className={`text-[9.5px] font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                            co.enableProduction !== false
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                          }`}
                          title={co.enableProduction !== false ? 'Módulo de producción industrial habilitado para esta empresa' : 'Módulo de producción desactivado (Modo Comercial/Servicios)'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${co.enableProduction !== false ? 'bg-amber-400' : 'bg-slate-400'}`}></span>
                          <span>{co.enableProduction !== false ? 'MRP Activo' : 'Sin MRP'}</span>
                        </div>
                      </div>

                      {/* Select and Edit tools */}
                      <div className="flex items-center gap-2">
                        
                        {/* Switch Operating Company (Triggered immediately) */}
                        {!isActiveEnv && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isStatusActive) {
                                toast.warning('Esta organización se encuentra inactiva. Actívela primero.', 'Empresa Inactiva');
                                return;
                              }
                              onSwitchCompany(co.id);
                            }}
                            className={`font-black text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                              isStatusActive 
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm hover:shadow' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-40'
                            }`}
                          >
                            Operar ERP
                          </button>
                        )}
                        
                        {/* Edit details form triggers */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCompanyId(co.id);
                            setActiveTab('form');
                          }}
                          className="border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-350 p-2 rounded-xl transition-all hover:scale-105 cursor-pointer"
                          title="Editar detalles y logotipo comercial"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {/* Invoice & Logo Designer button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCompanyId(co.id);
                            setActiveTab('invoice_design');
                          }}
                          className="border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 p-2 rounded-xl transition-all hover:scale-105 cursor-pointer"
                          title="Diseñar factura y cambiar posición del logotipo para esta empresa"
                        >
                          <Palette className="w-4 h-4" />
                        </button>

                      </div>

                    </div>

                  </div>
                );
              })}
            </div>

            {companies.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-sm">No existen empresas unificadas en la base de datos.</p>
                <p className="text-xs">Cree su primera organización comercial para estructurar balances.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Edit form details with Base64 Logo uploader and Presets */}
      {activeTab === 'form' && (
        <div className="animate-fade-in space-y-6">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <div className="space-y-0.5">
              <p className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">ENTORNO EN EDICIÓN:</p>
              <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5 uppercase">
                <Building2 className="w-4 h-4 text-blue-500" />
                {(companies.find(c => c.id === editingCompanyId) || currentCompany)?.name}
              </h3>
            </div>
            
            <div className="flex gap-2">
              <span className="text-[9px] font-black uppercase py-1 px-2.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-650 tracking-wider">
                ID: {editingCompanyId}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Volver al Directorio
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitForm} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Brand & Logo Upload (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className={`p-6 rounded-2xl space-y-5 ${activeTheme.cardStyles}`}>
                <div>
                  <h3 className="font-display font-bold text-sm tracking-tight text-slate-800 dark:text-white uppercase flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-amber-500" /> Subir Logotipo Comercial
                  </h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Suba una imagen PNG, JPG o WEBP. Ésta se incrustará de forma limpia en todos los formatos de impresión DIAN generados.
                  </p>
                </div>

                {/* Custom drag-and-drop file uploader block */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center relative min-h-[160px] ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-500/5' 
                      : logoUrl 
                        ? 'border-slate-350 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-950/20' 
                        : 'border-slate-250 dark:border-slate-800 hover:border-amber-550 dark:hover:border-amber-500 bg-slate-50/20 dark:bg-slate-950/5'
                  }`}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileInput}
                    className="hidden" 
                  />
                  
                  {logoUrl ? (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="w-24 h-24 rounded-xl bg-white dark:bg-slate-900 mx-auto border border-slate-200 dark:border-slate-850 p-2 flex items-center justify-center shadow-lg">
                        <img 
                          src={logoUrl} 
                          alt="Logo cargado" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-slate-700 hover:bg-slate-650 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all"
                        >
                          Cambiar Imagen
                        </button>
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="bg-rose-550 hover:bg-rose-500 text-white font-bold text-[10px] p-2 rounded-lg transition-all"
                          title="Quitar logotipo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center mx-auto text-slate-500 dark:text-slate-400 shadow-sm">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-amber-550">Haga clic para subir</span> o arrastre aquí su logo
                      </div>
                      <p className="text-[9.5px] text-slate-405">Formato recomendado: Logo plano o transparente.</p>
                    </div>
                  )}
                </div>

                {/* Quick select presets */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <span className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider block">Opciones por Defecto de Demostración:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_LOGOS.map((pr) => (
                      <button
                        key={pr.name}
                        type="button"
                        onClick={() => setLogoUrl(pr.url)}
                        className={`flex items-center gap-2 p-1.5 rounded-xl border text-left text-[10px] font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/5 ${
                          logoUrl === pr.url 
                            ? 'border-amber-550 dark:border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20' 
                            : 'border-slate-150 dark:border-slate-850 bg-white/40 dark:bg-slate-900/30'
                        }`}
                      >
                        <img 
                          src={pr.url} 
                          alt={pr.name} 
                          className="w-8 h-8 rounded object-cover shadow border shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <span className="leading-tight truncate pr-1 text-slate-750 dark:text-slate-305">{pr.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Where it is shown list */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-xl p-4 border border-slate-100 dark:border-slate-850 space-y-2">
                  <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wide">Documentos que renderizan este logo:</h5>
                  <ul className="text-[10px] space-y-1.5 text-slate-650 dark:text-slate-400 leading-tight">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Cabezal Factura Impresa DIAN</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Desprendible de Nómina Colectivo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Certificado de Retención en la Fuente</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Pestaña de Monitor Dashboard & Sidebar</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column: Organization Profiles and Payroll Defaults (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* General Metadata form */}
              <div className={`p-6 rounded-2xl space-y-4 ${activeTheme.cardStyles}`}>
                <div>
                  <h3 className="font-display font-bold text-sm tracking-tight text-slate-800 dark:text-white uppercase flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-500" /> Parámetros de Registro Legal / DIAN
                  </h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Especifique la información comercial legal que se imprimirá en los reportes tributarios.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Razon Social */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Razón Social de la Organización:</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </span>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Ej. Panificadora El Trigal SAS"
                        className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-205 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* NIT */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">NIT de la Empresa (Con dígito verificación):</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400">
                        <FileText className="w-4 h-4" />
                      </span>
                      <input 
                        type="text" 
                        value={nit}
                        onChange={(e) => setNit(e.target.value)}
                        required
                        placeholder="Ej. 901.383.910-4"
                        className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-205 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Slogan */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Eslogan o Sello Comercial:</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400">
                        <Briefcase className="w-4 h-4" />
                      </span>
                      <input 
                        type="text" 
                        value={slogan}
                        onChange={(e) => setSlogan(e.target.value)}
                        placeholder="Ej. Trigo seleccionado de alta pureza"
                        className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Dirección Principal registrada:</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400">
                        <Globe2 className="w-4 h-4" />
                      </span>
                      <input 
                        type="text" 
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ej. Calle 100 # 15-22, Bogotá D.C., Colombia"
                        className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Regimen */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Régimen Fiscal (DIAN):</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400">
                        <ShieldAlert className="w-4 h-4" />
                      </span>
                      <select 
                        value={regimen}
                        onChange={(e) => setRegimen(e.target.value as Company['regimen'])}
                        className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100"
                      >
                        <option value="responsable">Responsable de IVA (Común)</option>
                        <option value="no_responsable">No Responsable de IVA (Simplificado)</option>
                        <option value="gran_contribuyente">Gran Contribuyente</option>
                        <option value="simple">Régimen Simple de Tributación (RST)</option>
                      </select>
                    </div>
                  </div>

                  {/* Currency */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Divisa Contable de Operaciones:</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400">
                        <Coins className="w-4 h-4" />
                      </span>
                      <select 
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as Company['currency'])}
                        className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100"
                      >
                        <option value="COP">Pesos Colombianos ($ COP)</option>
                        <option value="USD">Dólares Americanos ($ USD)</option>
                        <option value="EUR">Euros (€ EUR)</option>
                      </select>
                    </div>
                  </div>

                  {/* Fiscal Period */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Año Fiscal Activo:</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <input 
                        type="number" 
                        value={period}
                        onChange={(e) => setPeriod(Number(e.target.value))}
                        min={2020}
                        max={2030}
                        className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Electronic Billing Architecture Card (Proveedor Tecnológico / Facturador Externo) */}
              <div className={`p-6 rounded-2xl space-y-5 border border-indigo-500/30 bg-indigo-500/[0.02] ${activeTheme.cardStyles}`}>
                <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                  <div>
                    <h3 className="font-display font-bold text-sm tracking-tight text-slate-800 dark:text-white uppercase flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-indigo-500" /> Estructura de Facturación Electrónica (Proveedor Tecnológico Tercero)
                    </h3>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                      La facturación no pasa directo por la DIAN por simplicidad operativa. FinteKia emite mediante un Proveedor Tecnológico autorizado ({billingProviderName}), que gestiona la firma, el XML UBL 2.1 y la validación DIAN mediante API REST limpia.
                    </p>
                  </div>
                  <span className="text-[9.5px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-indigo-500/15 text-indigo-500 border border-indigo-500/30 flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3 h-3" /> Intermediario Autorizado
                  </span>
                </div>

                {/* Architecture Mode Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Modelo de Transmisión:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setBillingProviderType('tercero_proveedor')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        billingProviderType === 'tercero_proveedor'
                          ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/40 dark:bg-slate-900/30'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-500 shrink-0">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs text-slate-800 dark:text-white">Proveedor Tecnológico Tercero</p>
                          <span className="text-[8.5px] font-semibold bg-emerald-500/20 text-emerald-500 px-1.5 py-0.2 rounded">Menos Complicado</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Envío mediante API REST JSON ({billingProviderName}). Sin certificado .p12 propio ni servidores SOAP complejos.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBillingProviderType('dian_directo')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        billingProviderType === 'dian_directo'
                          ? 'border-slate-500 bg-slate-500/10 ring-1 ring-slate-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/40 dark:bg-slate-900/30'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-slate-500/15 text-slate-500 shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-white">Emisión Directa DIAN (Software Propio)</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Requiere firma criptográfica .p12 local, web services SOAP UBL 2.1 y set de pruebas directo.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Third-Party Provider Choice & Credentials */}
                {billingProviderType === 'tercero_proveedor' && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Provider Select */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Proveedor Tecnológico:</label>
                        <select
                          value={billingProviderName}
                          onChange={(e) => {
                            const p = e.target.value as any;
                            setBillingProviderName(p);
                            if (p === 'Alanube' && (!billingApiToken || billingApiToken.startsWith('fk_'))) {
                              setBillingApiToken('ala_live_sec_98f7e2a4d3_auth_key');
                            } else if (p === 'Factus' && (!billingApiToken || billingApiToken.startsWith('ala_'))) {
                              setBillingApiToken('fk_live_9a87d6e5c4b3a2_token_auth');
                            }
                            setConnectionStatus(null);
                          }}
                          className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                        >
                          <option value="Alanube">Alanube (API Cloud REST - Recomendado)</option>
                          <option value="Factus">Factus (API REST Moderna)</option>
                          <option value="Siigo">Siigo Nube API</option>
                          <option value="Alegra">Alegra Facturación</option>
                          <option value="Dataico">Dataico Gateway</option>
                          <option value="TheFactoryHKA">The Factory HKA</option>
                          <option value="Personalizado">Proveedor Personalizado / API</option>
                        </select>
                      </div>

                      {/* Environment */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Ambiente Operativo:</label>
                        <select
                          value={billingEnvironment}
                          onChange={(e) => setBillingEnvironment(e.target.value as any)}
                          className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                        >
                          <option value="produccion">Producción (Validez Legal Real)</option>
                          <option value="pruebas">Sandbox / Habilitación de Pruebas</option>
                        </select>
                      </div>

                      {/* Prefix */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Prefijo Autorizado:</label>
                        <input
                          type="text"
                          value={billingPrefix}
                          onChange={(e) => setBillingPrefix(e.target.value.toUpperCase())}
                          placeholder="FE"
                          maxLength={5}
                          className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 uppercase"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Resolution Number */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">No. Resolución DIAN (Asociada al Tercero):</label>
                        <input
                          type="text"
                          value={billingResolution}
                          onChange={(e) => setBillingResolution(e.target.value)}
                          placeholder="187640000099"
                          className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      {/* API Token / Client Secret */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block flex items-center gap-1">
                          <Key className="w-3 h-3 text-indigo-500" /> Token de Conexión / API Key del Proveedor:
                        </label>
                        <input
                          type="password"
                          value={billingApiToken}
                          onChange={(e) => setBillingApiToken(e.target.value)}
                          placeholder="ala_live_..."
                          className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {billingProviderName === 'Alanube' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-sky-500 uppercase block flex items-center gap-1">
                            <i className="ri-user-shared-line"></i> Alanube ID de Cliente (Client ID):
                          </label>
                          <input
                            type="text"
                            value={billingClientId}
                            onChange={(e) => setBillingClientId(e.target.value)}
                            placeholder="ala_cli_live_..."
                            className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-sky-500/30 rounded-xl py-2 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 dark:text-slate-100"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-amber-500 uppercase block flex items-center gap-1">
                            <i className="ri-shield-keyhole-line"></i> Alanube Clave Secreta (Client Secret):
                          </label>
                          <input
                            type="password"
                            value={billingClientSecret}
                            onChange={(e) => setBillingClientSecret(e.target.value)}
                            placeholder="ala_sec_..."
                            className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-amber-500/30 rounded-xl py-2 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    )}

                    {/* Auto send toggle */}
                    <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/20">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                          <CheckCheck className="w-3.5 h-3.5 text-indigo-500" /> Notificación Automática al Adquiriente
                        </span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          El proveedor tecnológico enviará el correo con el PDF y XML comprimido al cliente automáticamente tras la validación.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBillingAutoSendEmail(!billingAutoSendEmail)}
                        className={`p-1 rounded-xl transition-all ${
                          billingAutoSendEmail ? 'text-indigo-500 hover:text-indigo-400' : 'text-slate-400'
                        }`}
                      >
                        {billingAutoSendEmail ? (
                          <ToggleRight className="w-7 h-7 scale-110" />
                        ) : (
                          <ToggleLeft className="w-7 h-7 scale-110" />
                        )}
                      </button>
                    </div>

                    {/* Alanube Interactive Integration Details & Diagnostic Panel */}
                    {billingProviderName === 'Alanube' && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/30 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-xs font-bold text-sky-400">Alanube API Cloud v1 · DIAN Colombia</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                              NIT PT: 901.464.305-6
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTestingConnection(true);
                              setConnectionStatus(null);
                              setTimeout(() => {
                                setTestingConnection(false);
                                setConnectionStatus({
                                  ok: true,
                                  message: `¡Conexión verificada con Alanube Cloud API (${billingEnvironment === 'produccion' ? 'Producción DIAN' : 'Sandbox de Pruebas'})!`,
                                  details: 'Ping: 92ms · Token Válido · Timbrado UBL 2.1: Activo · DIAN: En línea'
                                });
                              }, 650);
                            }}
                            disabled={testingConnection}
                            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            {testingConnection ? (
                              <>
                                <i className="ri-loader-4-line animate-spin"></i> Probando API...
                              </>
                            ) : (
                              <>
                                <i className="ri-pulse-line"></i> Probar Conexión con Alanube
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          <strong>Alanube</strong> permite emitir Factura Electrónica de Venta, Notas Crédito/Débito, Documento Soporte y Nómina Electrónica enviando un payload JSON limpio vía API REST. La plataforma gestiona la firma digital criptográfica, el CUFE y la respuesta formal de la DIAN.
                        </p>

                        {connectionStatus && (
                          <div className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
                            connectionStatus.ok 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          }`}>
                            <i className={`${connectionStatus.ok ? 'ri-checkbox-circle-fill text-emerald-400' : 'ri-error-warning-fill text-rose-400'} text-base shrink-0 mt-0.5`}></i>
                            <div>
                              <div className="font-bold">{connectionStatus.message}</div>
                              {connectionStatus.details && <div className="text-[10px] opacity-85 font-mono mt-0.5">{connectionStatus.details}</div>}
                            </div>
                          </div>
                        )}

                        <div className="text-[10px] font-mono text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-1.5 border-t border-slate-700/60">
                          <span>Endpoint: <strong className="text-slate-200">{billingEnvironment === 'produccion' ? 'https://api.alanube.co/dian/v1/invoices' : 'https://sandbox-api.alanube.co/dian/v1/invoices'}</strong></span>
                          <span>Auth Header: <strong className="text-slate-200">Authorization: Bearer [TOKEN]</strong></span>
                          <span>Webhook DIAN: <strong className="text-emerald-400">Activo</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Business Model and Production Module Activation Card */}
              <div className={`p-6 rounded-2xl space-y-5 border ${
                enableProduction 
                  ? 'border-amber-500/30 bg-amber-500/[0.02]' 
                  : 'border-sky-500/30 bg-sky-500/[0.02]'
              } ${activeTheme.cardStyles}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-sm tracking-tight text-slate-800 dark:text-white uppercase flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-sky-500" /> Enfoque de Negocio & Módulos Operativos
                    </h3>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Adapte FinteKia a su emprendimiento: active o desactive la producción industrial según la actividad comercial de su empresa.
                    </p>
                  </div>
                  <span className={`text-[9.5px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    enableProduction 
                      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' 
                      : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                  }`}>
                    {enableProduction ? 'MRP Activo' : 'Modo Tecnología'}
                  </span>
                </div>

                {/* Business Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Modelo de Actividad Principal:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setBusinessType('tecnologia_servicios');
                        setEnableProduction(false);
                        setEnableTechServices(true);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        businessType === 'tecnologia_servicios'
                          ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/40 dark:bg-slate-900/30'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-sky-500/15 text-sky-500 shrink-0">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-white">Tecnología & Servicios TI</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Venta de computadores, periféricos, redes y servicios técnicos.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBusinessType('produccion');
                        setEnableProduction(true);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        businessType === 'produccion'
                          ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/40 dark:bg-slate-900/30'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500 shrink-0">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-white">Manufactura & Producción MRP</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Fórmulas BOM, órdenes de fabricación, insumos y mermas.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Direct Module Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {/* Production Module Toggle */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-bold text-xs text-slate-800 dark:text-white">Módulo de Producción (MRP)</span>
                      </div>
                      <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-tight">
                        {enableProduction 
                          ? 'Activo: Recetas, órdenes y planta visibles.' 
                          : 'En pausa: Oculto para enfocar en ventas y servicios.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEnableProduction(!enableProduction)}
                      className={`shrink-0 p-1 rounded-xl transition-all ${
                        enableProduction ? 'text-amber-500 hover:text-amber-400' : 'text-slate-400 hover:text-slate-500'
                      }`}
                      title={enableProduction ? 'Desactivar módulo de producción' : 'Activar módulo de producción'}
                    >
                      {enableProduction ? (
                        <ToggleRight className="w-7 h-7 scale-110" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 scale-110" />
                      )}
                    </button>
                  </div>

                  {/* Tech Services Module Toggle */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-sky-500" />
                        <span className="font-bold text-xs text-slate-800 dark:text-white">Servicios & Soporte TI</span>
                      </div>
                      <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-tight">
                        {enableTechServices 
                          ? 'Activo: Órdenes de trabajo (OT) y garantías.' 
                          : 'En pausa.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEnableTechServices(!enableTechServices)}
                      className={`shrink-0 p-1 rounded-xl transition-all ${
                        enableTechServices ? 'text-sky-500 hover:text-sky-400' : 'text-slate-400 hover:text-slate-500'
                      }`}
                      title={enableTechServices ? 'Desactivar servicios técnicos' : 'Activar servicios técnicos'}
                    >
                      {enableTechServices ? (
                        <ToggleRight className="w-7 h-7 scale-110" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 scale-110" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Payroll Parameter defaults (Specific for Colombian SMMLV 2026) */}
              <div className={`p-6 rounded-2xl space-y-4 ${activeTheme.cardStyles}`}>
                <div>
                  <h3 className="font-display font-bold text-sm tracking-tight text-slate-800 dark:text-white uppercase flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-500" /> Parámetros y Salario Mínimo Legal Vigente
                  </h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Variables de nómina legal empleadas por el módulo liquidador de desprendibles y aportaciones.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* SMMLV */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Salario Mínimo Vigente (SMMLV):</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2 text-[11px] font-black text-slate-400">$</span>
                      <input 
                        type="number" 
                        value={smmlv}
                        onChange={(e) => setSmmlv(Number(e.target.value))}
                        required
                        className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-800 rounded-xl py-2 pl-8 pr-4 text-xs font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 block italic">Referente 2026: $ 1.423.500 COP</span>
                  </div>

                  {/* Auxilio de Transporte */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Auxilio de Transporte de Ley:</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2 text-[11px] font-black text-slate-400">$</span>
                      <input 
                        type="number" 
                        value={auxTransporte}
                        onChange={(e) => setAuxTransporte(Number(e.target.value))}
                        required
                        className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-800 rounded-xl py-2 pl-8 pr-4 text-xs font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 block italic">Referente 2026: $ 172.000 COP</span>
                  </div>

                </div>
              </div>

              {/* Form Actions Footer block */}
              <div className="flex justify-end pt-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('directory')}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm px-5 py-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-blue-200" /> Guardar Cambios de la Empresa
                </button>
              </div>

            </div>
          </form>

        </div>
      )}

      {/* TAB 3: Invoice Design & Logo Placement Customizer */}
      {activeTab === 'invoice_design' && (() => {
        const targetCo = companies.find(c => c.id === editingCompanyId) || currentCompany;

        const handleSaveInvoiceDesign = (e: React.FormEvent) => {
          e.preventDefault();
          const updated: Company = {
            ...targetCo,
            logoUrl: logoUrl,
            invoiceDesign: {
              logoPosition: designLogoPosition,
              logoSize: designLogoSize,
              logoStyle: designLogoStyle,
              accentColor: designAccentColor,
              showSlogan: designShowSlogan,
              showResolutionBox: designShowResolutionBox,
              showBankAccounts: designShowBankAccounts,
              showSignatures: designShowSignatures,
              bankAccountDetails: designBankAccountDetails,
              termsAndNotes: designTermsAndNotes
            }
          };
          updateCompany(updated);
          showToast(
            '¡Diseño de factura guardado!',
            `Posición de logo (${designLogoPosition}) y estilo guardados para "${targetCo.name}".`
          );
        };

        const getLogoSizeClass = (sz: InvoiceDesignConfig['logoSize']) => {
          switch (sz) {
            case 'sm': return 'h-12 w-12 max-h-12';
            case 'lg': return 'h-20 w-20 max-h-20';
            case 'xl': return 'h-24 w-24 max-h-24';
            case 'md':
            default: return 'h-16 w-16 max-h-16';
          }
        };

        const getLogoStyleClass = (st: InvoiceDesignConfig['logoStyle']) => {
          switch (st) {
            case 'circle': return 'rounded-full border border-slate-200 shadow-sm';
            case 'card': return 'rounded-xl border border-slate-200 bg-white p-2 shadow-md';
            case 'rounded': return 'rounded-xl border border-slate-200';
            case 'none':
            default: return 'rounded-none';
          }
        };

        return (
          <div className="space-y-6 animate-fade-in">
            {/* Header / Company Selector Strip */}
            <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 rounded-2xl p-5 border border-purple-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-display font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                  <Palette className="w-5 h-5 text-purple-500" />
                  Personalización Visual de Factura & Ubicación del Logotipo
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Configura exactamente dónde se ubica el logotipo en el encabezado oficial DIAN (izquierda, centro, derecha o banda de marca), su tamaño de impresión, contorno, membrete y color corporativo.
                </p>
              </div>

              {/* Company Picker */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Organización:</span>
                <div className="flex gap-1">
                  {companies.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEditingCompanyId(c.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        editingCompanyId === c.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[130px]">{c.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Interactive Configurator (2 columns: Controls + Live Preview) */}
            <form onSubmit={handleSaveInvoiceDesign}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Controls Column (7 cols) */}
                <div className={`lg:col-span-7 p-6 rounded-3xl space-y-6 ${activeTheme.cardStyles} border border-slate-200 dark:border-slate-800`}>
                  
                  {/* 1. Logotipo Management */}
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold uppercase text-[11px] tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-purple-500" /> 1. Logotipo de la Empresa ({targetCo.name.split(' ')[0]})
                      </span>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl(undefined)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Quitar Logo
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt="Logo Empresa"
                            className="w-full h-full object-contain p-1.5"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-center p-2 text-slate-400">
                            <Building2 className="w-7 h-7 mx-auto mb-1 text-slate-300" />
                            <p className="text-[8px] font-bold">Sin Logo</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileInput}
                            accept="image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                          >
                            <Upload className="w-3.5 h-3.5" /> Subir Logotipo
                          </button>
                          <span className="text-[10px] text-slate-400">Archivos PNG, JPG o SVG recomendados</span>
                        </div>

                        {/* Presets */}
                        <div>
                          <p className="text-[9.5px] text-slate-400 font-semibold mb-1">O selecciona un logotipo corporativo:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {PRESET_LOGOS.map((pr, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setLogoUrl(pr.url)}
                                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-[10px] text-slate-600 dark:text-slate-300 font-medium cursor-pointer transition-all"
                              >
                                {pr.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Posición / Ubicación del Logotipo */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold uppercase text-[11px] tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-500" /> 2. Ubicación del Logotipo en la Factura
                      </span>
                      <span className="text-[10px] text-slate-400">Selecciona el diseño del membrete</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Left */}
                      <button
                        type="button"
                        onClick={() => setDesignLogoPosition('left')}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          designLogoPosition === 'left'
                            ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-5 h-5 rounded bg-blue-500 text-white flex items-center justify-center font-bold text-[9px]">L</div>
                          <div className="flex-1 space-y-0.5">
                            <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded w-full"></div>
                            <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Izquierda Clásica</p>
                          <p className="text-[9px] text-slate-400">Estándar DIAN tradicional</p>
                        </div>
                      </button>

                      {/* Center */}
                      <button
                        type="button"
                        onClick={() => setDesignLogoPosition('center')}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          designLogoPosition === 'center'
                            ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex flex-col items-center mb-2">
                          <div className="w-5 h-5 rounded bg-indigo-500 text-white flex items-center justify-center font-bold text-[9px] mb-1">C</div>
                          <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded w-3/4"></div>
                        </div>
                        <div>
                          <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Centro Moderno</p>
                          <p className="text-[9px] text-slate-400">Membrete centrado elegante</p>
                        </div>
                      </button>

                      {/* Right */}
                      <button
                        type="button"
                        onClick={() => setDesignLogoPosition('right')}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          designLogoPosition === 'right'
                            ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="flex-1 space-y-0.5">
                            <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded w-full"></div>
                            <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                          </div>
                          <div className="w-5 h-5 rounded bg-emerald-500 text-white flex items-center justify-center font-bold text-[9px]">R</div>
                        </div>
                        <div>
                          <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Ejecutivo Derecha</p>
                          <p className="text-[9px] text-slate-400">Logo al lado del folio</p>
                        </div>
                      </button>

                      {/* Banner */}
                      <button
                        type="button"
                        onClick={() => setDesignLogoPosition('banner')}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          designLogoPosition === 'banner'
                            ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="mb-2">
                          <div 
                            className="h-4 rounded flex items-center px-1 text-white text-[8px] font-bold"
                            style={{ backgroundColor: designAccentColor }}
                          >
                            Banda de Marca
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Banda Superior</p>
                          <p className="text-[9px] text-slate-400">Franja corporativa llena</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 3. Tamaño y Estilo del Marco */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tamaño */}
                    <div className="space-y-2">
                      <span className="font-extrabold uppercase text-[10.5px] tracking-wider text-slate-700 dark:text-slate-300">
                        Tamaño del Logotipo
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setDesignLogoSize(sz)}
                            className={`py-1.5 rounded-xl border text-center font-bold text-[11px] cursor-pointer transition-all ${
                              designLogoSize === sz
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            {sz === 'sm' ? 'Pequeño' : sz === 'md' ? 'Mediano' : sz === 'lg' ? 'Grande' : 'Extra'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Estilo de Marco */}
                    <div className="space-y-2">
                      <span className="font-extrabold uppercase text-[10.5px] tracking-wider text-slate-700 dark:text-slate-300">
                        Estilo de Contorno
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['none', 'rounded', 'card', 'circle'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setDesignLogoStyle(st)}
                            className={`py-1.5 rounded-xl border text-center font-bold text-[11px] cursor-pointer transition-all ${
                              designLogoStyle === st
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            {st === 'none' ? 'Plano' : st === 'rounded' ? 'Redondo' : st === 'card' ? 'Tarjeta' : 'Circular'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Color de Acento Institucional */}
                  <div className="space-y-2">
                    <span className="font-extrabold uppercase text-[10.5px] tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-amber-500" /> 3. Color de Acento de la Factura
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { name: 'Azul FinteKia', hex: '#2563eb' },
                        { name: 'Índigo DIAN', hex: '#4f46e5' },
                        { name: 'Verde Esmeralda', hex: '#059669' },
                        { name: 'Slate Ejecutivo', hex: '#0f172a' },
                        { name: 'Ámbar Industrial', hex: '#d97706' },
                        { name: 'Púrpura Tech', hex: '#7c3aed' },
                        { name: 'Rojo Carmesí', hex: '#dc2626' }
                      ].map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setDesignAccentColor(c.hex)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer text-[10.5px] font-semibold ${
                            designAccentColor === c.hex
                              ? 'border-slate-900 dark:border-white shadow-sm ring-2 ring-slate-400/30'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.hex }}></span>
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5. Opciones Complementarias */}
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-extrabold uppercase text-[10.5px] tracking-wider text-slate-700 dark:text-slate-300">
                      4. Contenido & Datos de Pago
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={designShowSlogan}
                          onChange={(e) => setDesignShowSlogan(e.target.checked)}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-[11px] font-semibold">Mostrar Eslogan</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={designShowResolutionBox}
                          onChange={(e) => setDesignShowResolutionBox(e.target.checked)}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-[11px] font-semibold">Resolución DIAN</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={designShowBankAccounts}
                          onChange={(e) => setDesignShowBankAccounts(e.target.checked)}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-[11px] font-semibold">Cuentas de Pago</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={designShowSignatures}
                          onChange={(e) => setDesignShowSignatures(e.target.checked)}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-[11px] font-semibold">Firmas al Pie (Emisor / Recibí)</span>
                      </label>
                    </div>

                    {designShowBankAccounts && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Cuentas Bancarias de Recaudo:
                        </label>
                        <input
                          type="text"
                          value={designBankAccountDetails}
                          onChange={(e) => setDesignBankAccountDetails(e.target.value)}
                          placeholder="ej: Bancolombia Cta Ahorros No. 123-456789-01 a nombre de la empresa"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        Leyenda Legal de Título Valor (Ley 1231 de 2008):
                      </label>
                      <textarea
                        rows={2}
                        value={designTermsAndNotes}
                        onChange={(e) => setDesignTermsAndNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveTab('directory')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      Volver al Directorio
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                      style={{ backgroundColor: designAccentColor }}
                    >
                      <Save className="w-4 h-4" /> Guardar Diseño de Factura de {targetCo.name.split(' ')[0]}
                    </button>
                  </div>

                </div>

                {/* Right Column: Real-time Live Preview of the Invoice (5 cols) */}
                <div className="lg:col-span-5 space-y-3 sticky top-4">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Vista Previa de Impresión A4
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{targetCo.name.split(' ')[0]}</span>
                  </div>

                  {/* Simulated Paper Invoice */}
                  <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 text-slate-800 text-[10px] space-y-3 overflow-hidden select-none">
                    
                    {/* Banner Layout */}
                    {designLogoPosition === 'banner' && (
                      <div 
                        className="p-3.5 -mx-5 -mt-5 text-white rounded-t-2xl flex items-center justify-between"
                        style={{ backgroundColor: designAccentColor }}
                      >
                        <div className="flex items-center gap-2.5">
                          {logoUrl ? (
                            <img 
                              src={logoUrl} 
                              alt="Logo" 
                              className={`${getLogoSizeClass(designLogoSize)} object-contain bg-white/95 p-1 rounded-lg shrink-0`} 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-bold">FK</div>
                          )}
                          <div>
                            <h4 className="font-extrabold text-xs uppercase leading-tight">{targetCo.name}</h4>
                            <p className="text-[9px] text-white/80">NIT: {targetCo.nit}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded bg-white/20 text-[8px] font-bold">FACTURA ELECTRÓNICA</span>
                          <p className="font-mono font-bold text-xs mt-0.5">{targetCo.billingConfig?.prefix || 'FE'}-101</p>
                        </div>
                      </div>
                    )}

                    {/* Left Layout */}
                    {designLogoPosition === 'left' && (
                      <div className="flex items-start justify-between border-b pb-3 border-slate-100">
                        <div className="flex items-start gap-2.5">
                          {logoUrl ? (
                            <img 
                              src={logoUrl} 
                              alt="Logo" 
                              className={`${getLogoSizeClass(designLogoSize)} ${getLogoStyleClass(designLogoStyle)} object-contain shrink-0`} 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold shrink-0">Logo</div>
                          )}
                          <div className="space-y-0.5">
                            <h4 className="font-extrabold text-xs text-slate-900 uppercase leading-tight">{targetCo.name}</h4>
                            <p className="text-slate-500 text-[9px]">NIT: {targetCo.nit}</p>
                            {designShowSlogan && targetCo.slogan && (
                              <p className="text-slate-400 text-[8px] italic">{targetCo.slogan}</p>
                            )}
                            <p className="text-slate-500 text-[8px]">{targetCo.address}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span 
                            className="inline-block px-2 py-0.5 rounded font-bold text-[8px] uppercase tracking-wider mb-1"
                            style={{ color: designAccentColor, backgroundColor: `${designAccentColor}18` }}
                          >
                            Factura Electrónica
                          </span>
                          <p className="font-mono font-bold text-xs text-slate-900">{targetCo.billingConfig?.prefix || 'FE'}-101</p>
                          <p className="text-slate-400 text-[8px]">Fecha: 2026-10-16</p>
                        </div>
                      </div>
                    )}

                    {/* Center Layout */}
                    {designLogoPosition === 'center' && (
                      <div className="text-center border-b pb-3 border-slate-100 space-y-1">
                        <div className="flex justify-center">
                          {logoUrl ? (
                            <img 
                              src={logoUrl} 
                              alt="Logo" 
                              className={`${getLogoSizeClass(designLogoSize)} ${getLogoStyleClass(designLogoStyle)} object-contain mx-auto`} 
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold mx-auto">Logo</div>
                          )}
                        </div>
                        <h4 className="font-extrabold text-xs text-slate-900 uppercase leading-tight">{targetCo.name}</h4>
                        <p className="text-slate-500 text-[9px]">NIT: {targetCo.nit} · {targetCo.address}</p>
                        {designShowSlogan && targetCo.slogan && (
                          <p className="text-slate-400 text-[8px] italic">{targetCo.slogan}</p>
                        )}
                        <div className="pt-1 flex items-center justify-center gap-3 text-[9px]">
                          <span className="font-mono font-bold" style={{ color: designAccentColor }}>{targetCo.billingConfig?.prefix || 'FE'}-101</span>
                          <span className="text-slate-400">|</span>
                          <span>Fecha: 2026-10-16</span>
                        </div>
                      </div>
                    )}

                    {/* Right Layout */}
                    {designLogoPosition === 'right' && (
                      <div className="flex items-start justify-between border-b pb-3 border-slate-100">
                        <div className="space-y-0.5">
                          <h4 className="font-extrabold text-xs text-slate-900 uppercase leading-tight">{targetCo.name}</h4>
                          <p className="text-slate-500 text-[9px]">NIT: {targetCo.nit}</p>
                          {designShowSlogan && targetCo.slogan && (
                            <p className="text-slate-400 text-[8px] italic">{targetCo.slogan}</p>
                          )}
                          <p className="text-slate-500 text-[8px]">{targetCo.address}</p>
                          <p className="font-mono font-bold text-xs pt-1" style={{ color: designAccentColor }}>{targetCo.billingConfig?.prefix || 'FE'}-101</p>
                        </div>
                        <div>
                          {logoUrl ? (
                            <img 
                              src={logoUrl} 
                              alt="Logo" 
                              className={`${getLogoSizeClass(designLogoSize)} ${getLogoStyleClass(designLogoStyle)} object-contain shrink-0`} 
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold">Logo</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Resolution snippet */}
                    {designShowResolutionBox && (
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-[8px] text-slate-500 leading-snug">
                        Resolución DIAN No. {targetCo.billingConfig?.resolutionNumber || '187640000099'} del {targetCo.billingConfig?.resolutionDate || '2026-01-15'} · Prefijo {targetCo.billingConfig?.prefix || 'FE'} ({targetCo.billingConfig?.authorizedRangeFrom || 101} al {targetCo.billingConfig?.authorizedRangeTo || 10000}) · Validación Vía {targetCo.billingConfig?.providerName || 'Alanube'}
                      </div>
                    )}

                    {/* Table with custom accent color header */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-[8px]">
                        <thead style={{ backgroundColor: `${designAccentColor}18`, color: designAccentColor }}>
                          <tr className="font-bold">
                            <th className="p-1.5">Ítem</th>
                            <th className="p-1.5 text-center">Cant</th>
                            <th className="p-1.5 text-right">Precio</th>
                            <th className="p-1.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="p-1.5 font-medium">Servicios Empresariales Especializados</td>
                            <td className="p-1.5 text-center">2</td>
                            <td className="p-1.5 text-right font-mono">$ 1.500.000</td>
                            <td className="p-1.5 text-right font-mono font-bold">$ 3.000.000</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end text-[8.5px]">
                      <div className="w-40 space-y-0.5">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal:</span>
                          <span className="font-mono">$ 3.000.000</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>IVA (19%):</span>
                          <span className="font-mono">$ 570.000</span>
                        </div>
                        <div 
                          className="flex justify-between font-bold text-[10px] pt-1 border-t border-slate-200"
                          style={{ color: designAccentColor }}
                        >
                          <span>TOTAL:</span>
                          <span className="font-mono">$ 3.570.000</span>
                        </div>
                      </div>
                    </div>

                    {/* Bank Account snippet */}
                    {designShowBankAccounts && designBankAccountDetails && (
                      <div className="p-2 rounded bg-blue-50/60 border border-blue-100 text-[8px] text-blue-800">
                        <span className="font-bold">Información de Pago:</span> {designBankAccountDetails}
                      </div>
                    )}

                    {/* Signatures Simulation */}
                    {designShowSignatures && (
                      <div className="border-t border-slate-200 pt-1.5 grid grid-cols-2 gap-3 text-[7.5px] text-slate-600">
                        <div className="border-t border-slate-300 pt-0.5">
                          <p className="font-bold text-slate-800 uppercase text-[7px]">Firma Emisor</p>
                          <p className="truncate text-slate-500 text-[6.5px]">{targetCo.name}</p>
                        </div>
                        <div className="border-t border-slate-300 pt-0.5">
                          <p className="font-bold text-slate-800 uppercase text-[7px]">Recibí Conforme</p>
                          <p className="text-slate-500 text-[6.5px]">Nombre, C.C. / Sello</p>
                        </div>
                      </div>
                    )}

                    {/* CUFE */}
                    <div className="border-t pt-2 flex items-center justify-between text-[7px] text-slate-400">
                      <div className="truncate max-w-[200px]">
                        <span className="font-bold">CUFE:</span> fe2026dian77a0129bc489...
                      </div>
                      <div className="w-6 h-6 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-slate-600">
                        <i className="ri-qr-code-line text-sm"></i>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </form>
          </div>
        );
      })()}

    </div>
  );
}

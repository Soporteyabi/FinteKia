import React, { useState, useMemo } from 'react';
import { toast } from "../context/ToastContext";
import { Tercero } from '../types';
import { THEMES_MAP } from './Sidebar';
import { ConfirmModal } from './ConfirmModal';
import Pagination from './Pagination';
import { calculateDIANDV, formatNITWithDV } from '../lib/dianUtils';
import { exportTercerosToExcel } from '../utils/excelExport';

interface TercerosViewProps {
  currentCompany: any;
  terceros: Tercero[];
  addTercero: (t: Omit<Tercero, 'id'>) => void;
  updateTercero: (t: Tercero) => void;
  deleteTercero: (id: string) => void;
  theme: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
}

export default function TercerosView({
  currentCompany,
  terceros,
  addTercero,
  updateTercero,
  deleteTercero,
  theme
}: TercerosViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'cliente' | 'proveedor' | 'empleado'>('all');
  const isDark = theme !== 'light_gray';

  // Pagination for terceros (15 per page)
  const [tercerosPage, setTercerosPage] = useState(1);
  const TERCEROS_PER_PAGE = 15;
  
  // Modals / Drawer Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTercero, setEditingTercero] = useState<Tercero | null>(null);
  const [selectedTerceroDetail, setSelectedTerceroDetail] = useState<Tercero | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Tercero | null>(null);

  // Form Field States
  const [formName, setFormName] = useState('');
  const [formNit, setFormNit] = useState('');
  const [formType, setFormType] = useState<'juridica' | 'natural'>('juridica');
  const [formRoles, setFormRoles] = useState<Array<'cliente' | 'proveedor' | 'empleado'>>(['cliente']);
  const [formCity, setFormCity] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formRegimen, setFormRegimen] = useState<'responsable' | 'no_responsable' | 'exento' | 'simple'>('no_responsable');
  const [formResponsabilidadFiscal, setFormResponsabilidadFiscal] = useState<string>('R-99-PN');
  
  // Computed DV for the form
  const computedDV = useMemo(() => {
    return calculateDIANDV(formNit);
  }, [formNit]);
  
  // Custom Role specific fields
  const [formEmployeeCargo, setFormEmployeeCargo] = useState('');
  const [formEmployeeSalary, setFormEmployeeSalary] = useState(0);
  const [formEmployeeEmergency, setFormEmployeeEmergency] = useState('');
  const [formProviderBank, setFormProviderBank] = useState('');

  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;

  // Format utility
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Open Form for Create
  const handleOpenCreateForm = () => {
    setEditingTercero(null);
    setFormName('');
    setFormNit('');
    setFormType('juridica');
    setFormRoles(['cliente']);
    setFormCity('Bogotá, D.C.');
    setFormAddress('');
    setFormPhone('');
    setFormEmail('');
    setFormContact('');
    setFormRegimen('no_responsable');
    setFormResponsabilidadFiscal('R-99-PN');
    setFormEmployeeCargo('');
    setFormEmployeeSalary(0);
    setFormEmployeeEmergency('');
    setFormProviderBank('');
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEditForm = (ter: Tercero) => {
    setEditingTercero(ter);
    setFormName(ter.name);
    setFormNit(ter.nit);
    setFormType(ter.type);
    setFormRoles(ter.roles);
    setFormCity(ter.city);
    setFormAddress(ter.address);
    setFormPhone(ter.phone || '');
    setFormEmail(ter.email || '');
    setFormContact(ter.contact || '');
    setFormRegimen(ter.regimen || 'no_responsable');
    setFormResponsabilidadFiscal(ter.responsabilidadFiscal || 'R-99-PN');
    setFormEmployeeCargo(ter.employeeCargo || '');
    setFormEmployeeSalary(ter.employeeSalary || 0);
    setFormEmployeeEmergency(ter.employeeEmergencyContact || '');
    setFormProviderBank(ter.providerBank || '');
    setIsFormOpen(true);
  };

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formNit.trim()) {
      toast.warning("Por favor ingrese razón social o nombre y el NIT/identificación.", "Datos Requeridos");
      return;
    }

    const payload = {
      name: formName,
      nit: formNit,
      dv: String(calculateDIANDV(formNit)),
      type: formType,
      roles: formRoles,
      city: formCity,
      address: formAddress,
      phone: formPhone || undefined,
      email: formEmail || undefined,
      contact: formContact || undefined,
      regimen: formRegimen,
      responsabilidadFiscal: formResponsabilidadFiscal,
      employeeCargo: formRoles.includes('empleado') ? formEmployeeCargo : undefined,
      employeeSalary: formRoles.includes('empleado') ? formEmployeeSalary : undefined,
      employeeEmergencyContact: formRoles.includes('empleado') ? formEmployeeEmergency : undefined,
      providerBank: formRoles.includes('proveedor') ? formProviderBank : undefined,
    };

    if (editingTercero) {
      updateTercero({
        ...payload,
        id: editingTercero.id
      });
      toast.success(`Tercero ${formName} actualizado con éxito.`, "Actualizado");
    } else {
      addTercero(payload);
      toast.success(`Nuevo Tercero ${formName} registrado con éxito.`, "Registrado");
    }

    setIsFormOpen(false);
    setEditingTercero(null);
  };

  // Toggle role selection in multi-select check
  const handleToggleFormRole = (role: 'cliente' | 'proveedor' | 'empleado') => {
    if (formRoles.includes(role)) {
      if (formRoles.length > 1) {
        setFormRoles(formRoles.filter(r => r !== role));
      }
    } else {
      setFormRoles([...formRoles, role]);
    }
  };

  const handleDeleteClick = (ter: Tercero) => {
    setDeleteConfirm(ter);
  };

  // Filtering Logic
  const filteredTerceros = terceros.filter((t) => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.nit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = 
      selectedRoleFilter === 'all' || 
      t.roles.includes(selectedRoleFilter);

    return matchesSearch && matchesRole;
  });

  // Paginated terceros (15 per page)
  const totalTercerosPages = Math.max(1, Math.ceil(filteredTerceros.length / TERCEROS_PER_PAGE));
  const safeTercerosPage = Math.min(tercerosPage, totalTercerosPages);
  const paginatedTerceros = filteredTerceros.slice(
    (safeTercerosPage - 1) * TERCEROS_PER_PAGE,
    safeTercerosPage * TERCEROS_PER_PAGE
  );

  // Calculate Metrics
  const totalPartners = terceros.length;
  const totalClients = terceros.filter(t => t.roles.includes('cliente')).length;
  const totalSuppliers = terceros.filter(t => t.roles.includes('proveedor')).length;
  const totalPayrollCost = terceros
    .filter(t => t.roles.includes('empleado') && t.employeeSalary)
    .reduce((acc, current) => acc + (current.employeeSalary || 0), 0);

  return (
    <div className="space-y-6">

      {/* Audit Detail View Panel overlay */}
      {selectedTerceroDetail && (
        <div className={`p-8 rounded-2xl shadow-lg max-w-2xl mx-auto space-y-6 animate-fade-in relative printable-area ${
          isDark ? 'bg-slate-900 border border-slate-800 text-slate-100' : 'bg-white border border-slate-100 text-slate-800'
        }`}>
          <div className={`flex justify-between items-start border-b pb-5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div>
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-1">Ficha Técnica Auditoría</span>
              <h2 className={`font-display font-bold text-xl tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <i className="ri-profile-line text-blue-500"></i>
                {selectedTerceroDetail.name}
              </h2>
              <p className={`text-xs mt-1 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ID Contable: {selectedTerceroDetail.id}</p>
            </div>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 font-bold text-xs rounded-full uppercase tracking-wider mb-2 ${
                isDark ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-slate-100 border border-slate-200 text-slate-700'
              }`}>
                {selectedTerceroDetail.type === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'}
              </span>
              <p className="text-xs text-slate-400 mt-1">Dian RUTA ÚNICA</p>
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-6 p-5 rounded-xl text-xs ${isDark ? 'bg-slate-950/60' : 'bg-slate-50'}`}>
            <div className="space-y-2">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Información Fiscal</p>
              <p className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>NIT / Cédula: <span className={`font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedTerceroDetail.nit}</span></p>
              <p className={`font-medium ${isDark ? 'text-slate-300' : 'text-[#1e293b]'}`}>Régimen: <span className="capitalize font-bold">{selectedTerceroDetail.regimen ? selectedTerceroDetail.regimen.replace('_', ' ') : 'Simplificado'}</span></p>
              <p className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Entidad: <span className="capitalize">{selectedTerceroDetail.type}</span></p>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Dirección y Ciudad</p>
              <p className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Ciudad: <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedTerceroDetail.city}</span></p>
              <p className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Dirección: <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedTerceroDetail.address}</span></p>
              <p className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Teléfono: <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedTerceroDetail.phone || 'S/N'}</span></p>
            </div>
          </div>

          {/* Roles section */}
          <div className="space-y-2">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Roles Activos en ERP</p>
            <div className="flex gap-2">
              {selectedTerceroDetail.roles.map((r, i) => (
                <span key={i} className={`inline-block font-black uppercase tracking-wider text-[9px] border px-3 py-1 rounded-lg ${
                  isDark ? 'bg-blue-950 text-blue-400 border-blue-900' : 'bg-blue-50 text-blue-700 border-blue-100'
                }`}>
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* Custom Role Specs */}
          {selectedTerceroDetail.roles.includes('empleado') && (
            <div className={`border p-4 rounded-xl space-y-3 ${
              isDark ? 'border-slate-800 bg-slate-950/40 text-slate-300' : 'border-slate-150 bg-amber-500/10'
            }`}>
              <p className="font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5 text-amber-600">
                <i className="ri-heart-pulse-line text-xs"></i> Parámetros de Nómina Interna
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Cargo / Ocupación:</span>
                  <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedTerceroDetail.employeeCargo || 'Operario general'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Salario Convenido:</span>
                  <span className={`font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{formatCOP(selectedTerceroDetail.employeeSalary || 1300000)} / Mes</span>
                </div>
                {selectedTerceroDetail.employeeEmergencyContact && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block">Contacto de Emergencia:</span>
                    <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedTerceroDetail.employeeEmergencyContact}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTerceroDetail.roles.includes('proveedor') && selectedTerceroDetail.providerBank && (
            <div className={`border p-4 rounded-xl space-y-2 ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-150 bg-slate-50'
            }`}>
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Información de Dispersión Contable</p>
              <p className="text-xs">
                <span className="text-slate-500">Cuenta Bancaria para Transferencias:</span>
                <span className={`font-bold font-mono block mt-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedTerceroDetail.providerBank}</span>
              </p>
            </div>
          )}

          <div className={`flex justify-end gap-3 pt-6 border-t no-print ${isDark ? 'border-slate-850' : 'border-slate-100'}`}>
            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <i className="ri-printer-line"></i> Imprimir Ficha
            </button>
            <button
              onClick={() => setSelectedTerceroDetail(null)}
              className={`font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
              }`}
            >
              Cerrar Ficha
            </button>
          </div>
        </div>
      )}

      {/* Main Index Workspace View */}
      {!selectedTerceroDetail && (
        <div className="space-y-6">
          
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in font-sans">
            {/* Metric 1 */}
            <div className={`${activeTheme.cardStyles} p-5 flex items-center gap-4`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                isDark ? 'bg-indigo-950/40 border border-indigo-900/40 text-indigo-400' : 'bg-indigo-50 border border-indigo-100 text-indigo-600'
              }`}>
                <i className="ri-group-line"></i>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Asociados</span>
                <p className={`font-display font-black text-2xl mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalPartners}</p>
                <span className="text-[9px] text-slate-500 font-medium">NITs unificados</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className={`${activeTheme.cardStyles} p-5 flex items-center gap-4`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                isDark ? 'bg-emerald-950/40 border border-emerald-900/40 text-emerald-400' : 'bg-green-50 border border-green-100 text-green-600'
              }`}>
                <i className="ri-money-dollar-box-line"></i>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Clientes Activos</span>
                <p className={`font-display font-black text-2xl mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalClients}</p>
                <span className="text-[9px] text-emerald-600 font-bold">Generadores de Ingresos</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className={`${activeTheme.cardStyles} p-5 flex items-center gap-4`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                isDark ? 'bg-blue-950/40 border border-blue-900/40 text-blue-400' : 'bg-blue-50 border border-blue-100 text-blue-600'
              }`}>
                <i className="ri-store-3-line"></i>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Proveedores Logística</span>
                <p className={`font-display font-black text-2xl mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalSuppliers}</p>
                <span className="text-[9px] text-slate-500 font-medium">Insumos y Logística</span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className={`${activeTheme.cardStyles} p-5 flex items-center gap-4`}>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center text-xl shrink-0">
                <i className="ri-heart-pulse-fill"></i>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nómina Salarial</span>
                <p className="font-display font-black text-lg text-amber-600 font-mono mt-1.5">{formatCOP(totalPayrollCost)}</p>
                <span className="text-[9px] text-slate-500 font-medium">Carga operaria activa</span>
              </div>
            </div>
          </div>

          {/* Quick Filter, Search Actions Bar */}
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl shadow-sm ${activeTheme.cardStyles}`}>
            {/* Role filter segmented buttons */}
            <div className={`flex flex-wrap gap-1 items-center p-1 rounded-xl w-full sm:w-auto ${isDark ? 'bg-slate-950/60' : 'bg-slate-50'}`}>
              <button
                onClick={() => {
                  setSelectedRoleFilter('all');
                  setTercerosPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedRoleFilter === 'all'
                    ? (isDark ? 'bg-blue-600 text-white shadow-sm font-black' : 'bg-white text-slate-900 shadow-sm font-black')
                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
                }`}
              >
                Todos ({totalPartners})
              </button>
              <button
                onClick={() => {
                  setSelectedRoleFilter('cliente');
                  setTercerosPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedRoleFilter === 'cliente'
                    ? (isDark ? 'bg-blue-600 text-white shadow-sm font-black' : 'bg-white text-slate-900 shadow-sm font-black')
                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
                }`}
              >
                Clientes ({totalClients})
              </button>
              <button
                onClick={() => {
                  setSelectedRoleFilter('proveedor');
                  setTercerosPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedRoleFilter === 'proveedor'
                    ? (isDark ? 'bg-blue-600 text-white shadow-sm font-black' : 'bg-white text-slate-900 shadow-sm font-black')
                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
                }`}
              >
                Proveedores ({totalSuppliers})
              </button>
              <button
                onClick={() => {
                  setSelectedRoleFilter('empleado');
                  setTercerosPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedRoleFilter === 'empleado'
                    ? (isDark ? 'bg-blue-600 text-white shadow-sm font-black' : 'bg-white text-slate-900 shadow-sm font-black')
                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
                }`}
              >
                Empleados
              </button>
            </div>

            {/* Live searching */}
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <i className="ri-search-line text-slate-400"></i>
                </span>
                <input
                  type="text"
                  placeholder="Buscar por Nombre, NIT o Ciudad..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setTercerosPage(1);
                  }}
                  className={`w-full text-xs pl-9 pr-4 py-2 rounded-xl font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => exportTercerosToExcel(terceros, currentCompany?.name)}
                className="bg-emerald-600 hover:bg-emerald-550 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Descargar directorio de clientes, proveedores y empleados en Excel (.xlsx)"
                id="export-terceros-excel-btn"
              >
                <i className="ri-file-excel-2-line text-emerald-200"></i> Exportar a Excel
              </button>

              <button
                onClick={handleOpenCreateForm}
                className="bg-blue-650 hover:bg-blue-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <i className="ri-add-line text-sm"></i> Registrar Tercero
              </button>
            </div>
          </div>

          {/* Grid View Table */}
          <div className={`${activeTheme.cardStyles} overflow-hidden shadow-sm`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead>
                  <tr className={`border-b font-bold uppercase tracking-wider text-[9px] ${
                    isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-450'
                  }`}>
                    <th className="py-3.5 px-4">Tercero / Razón Social</th>
                    <th className="py-3.5 px-4">Identificación NIT / C.C.</th>
                    <th className="py-3.5 px-4">Tipo Entidad</th>
                    <th className="py-3.5 px-4 text-center">Foco de Roles</th>
                    <th className="py-3.5 px-4">Ubicación y Contacto</th>
                    <th className="py-3.5 px-4 text-center">Régimen Fiscal</th>
                    <th className="py-3.5 px-4 text-center no-print w-36">Acciones</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-slate-700 ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-100'}`}>
                  {filteredTerceros.length > 0 ? (
                    paginatedTerceros.map((ter) => (
                      <tr key={ter.id} className={`transition-all font-sans ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50/50'}`}>
                        <td className="py-3.5 px-4 font-semibold">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border select-none shrink-0 ${
                              isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-650'
                            }`}>
                              {ter.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-bold text-xs truncate max-w-[200px] ${isDark ? 'text-slate-100' : 'text-slate-850'}`}>{ter.name}</p>
                              <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-450'}`}>{ter.email || 'Sin correo registrado'}</span>
                            </div>
                          </div>
                        </td>
                        <td className={`py-3.5 px-4 font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{ter.nit}</td>
                        <td className={`py-3.5 px-4 capitalize ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{ter.type}</td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex gap-1 justify-center flex-wrap">
                            {ter.roles.map((role, idx) => {
                              const bStyles = isDark
                                ? (role === 'cliente' 
                                  ? 'bg-emerald-55/15 text-emerald-400 border-emerald-500/30' 
                                  : role === 'proveedor' 
                                    ? 'bg-blue-55/15 text-blue-400 border-blue-500/30' 
                                    : 'bg-amber-55/15 text-amber-400 border-amber-55/35')
                                : (role === 'cliente' 
                                  ? 'bg-green-55/35 text-emerald-800 border-emerald-200' 
                                  : role === 'proveedor' 
                                    ? 'bg-blue-55/35 text-blue-800 border-blue-200' 
                                    : 'bg-amber-55/35 text-amber-800 border-amber-200');
                              return (
                                <span key={idx} className={`inline-block font-black uppercase tracking-wider text-[8px] border px-1.5 py-0.5 rounded ${bStyles}`}>
                                  {role}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className={`font-semibold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{ter.city}</p>
                          <p className={`text-[10px] capitalize truncate max-w-[140px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ter.address}</p>
                          {ter.phone && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-slate-400 font-mono">{ter.phone}</span>
                              <a
                                href={`https://wa.me/${ter.phone.replace(/\D/g, '').startsWith('57') ? ter.phone.replace(/\D/g, '') : `57${ter.phone.replace(/\D/g, '')}`}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-emerald-500 hover:text-emerald-400 font-semibold inline-flex items-center gap-0.5"
                                title="Enviar mensaje por WhatsApp"
                              >
                                <i className="ri-whatsapp-line"></i> Chat
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block border font-bold text-[9px] uppercase px-2 py-0.5 rounded-full ${
                            isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}>
                            {ter.regimen ? ter.regimen.replace('_', ' ') : 'Simplificado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedTerceroDetail(ter)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isDark ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-450 hover:text-blue-600 hover:bg-slate-100'
                              }`}
                              title="Ver ficha de auditoría"
                            >
                              <i className="ri-file-list-3-line text-sm"></i>
                            </button>
                            <button
                              onClick={() => handleOpenEditForm(ter)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isDark ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800' : 'text-slate-450 hover:text-indigo-600 hover:bg-slate-100'
                              }`}
                              title="Editar tercero"
                            >
                              <i className="ri-edit-box-line text-sm"></i>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(ter)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isDark ? 'text-slate-400 hover:text-rose-450 hover:bg-slate-800' : 'text-slate-450 hover:text-rose-500 hover:bg-slate-100'
                              }`}
                              title="Eliminar del catálogo"
                            >
                              <i className="ri-delete-bin-line text-sm"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <i className="ri-group-line text-4xl block opacity-20 mb-2"></i>
                        <p className="text-sm font-semibold">No se encontraron Terceros asociados.</p>
                        <p className="text-xs text-slate-400 mt-1">Intente cambiando los términos de búsqueda o filtros.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredTerceros.length > 0 && (
              <Pagination
                currentPage={safeTercerosPage}
                totalItems={filteredTerceros.length}
                pageSize={TERCEROS_PER_PAGE}
                onPageChange={(page) => setTercerosPage(page)}
                isDark={isDark}
                itemLabel="terceros registrados"
              />
            )}
          </div>
        </div>
      )}

      {/* Slide-over Overlay Drawer / Modal Form workspace */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base flex items-center gap-2">
                  <i className="ri-user-add-line text-amber-500"></i>
                  {editingTercero ? 'Modificar Registro de Tercero' : 'Inscribir Nuevo Tercero en el ERP'}
                </h3>
                <p className="text-[10px] text-slate-450 tracking-wide mt-1 uppercase font-semibold">Sincronización unificada de base de datos contable</p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-850">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Name / Razon Social */}
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Razón Social / Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Distribuidora Central de Harinas S.A.S o Carlos Vélez"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 font-semibold text-slate-900"
                  />
                </div>

                {/* Identification NIT/Cedula with live DV calculator */}
                <div className="space-y-1.5 block">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      NIT / Identificación
                    </label>
                    {formNit.trim() && (
                      <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-bold">
                        DV DIAN: -{computedDV}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="ej. 901482394"
                      value={formNit}
                      onChange={(e) => setFormNit(e.target.value)}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 font-mono font-extrabold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setFormNit(formatNITWithDV(formNit))}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 cursor-pointer transition-colors shrink-0"
                      title="Aplicar formato estándar con Dígito de Verificación"
                    >
                      + Aplicar DV
                    </button>
                  </div>
                </div>

                {/* Type of partner */}
                <div className="space-y-1.5 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estructura Legal</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 font-semibold text-slate-800"
                  >
                    <option value="juridica">Persona Jurídica (S.A.S, Limitada, S.A.)</option>
                    <option value="natural">Persona Natural (Independiente / Colaborador)</option>
                  </select>
                </div>

                {/* Fiscal Tax Regime */}
                <div className="space-y-1.5 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Régimen de Tributación DIAN</label>
                  <select
                    value={formRegimen}
                    onChange={(e) => setFormRegimen(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 font-semibold text-slate-800"
                  >
                    <option value="no_responsable">No Responsable de IVA (antiguo Régimen Simplificado)</option>
                    <option value="responsable">Responsable de IVA (antiguo Régimen Común)</option>
                    <option value="simple">Régimen Simple de Tributación (RST)</option>
                    <option value="exento">Exento / Entidad Estatal Sin Ánimo de Lucro</option>
                  </select>
                </div>

                {/* Fiscal Responsibilities DIAN */}
                <div className="space-y-1.5 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Responsabilidad Fiscal DIAN</label>
                  <select
                    value={formResponsabilidadFiscal}
                    onChange={(e) => setFormResponsabilidadFiscal(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 font-semibold text-slate-800"
                  >
                    <option value="R-99-PN">R-99-PN - No responsable</option>
                    <option value="O-13">O-13 - Gran Contribuyente</option>
                    <option value="O-15">O-15 - Autorretenedor</option>
                    <option value="O-23">O-23 - Agente de Retención IVA</option>
                    <option value="O-47">O-47 - Régimen Simple de Tributación (RST)</option>
                  </select>
                </div>

                {/* Location City */}
                <div className="space-y-1.5 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Municipio Contable / Ciudad</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Bogotá, D.C."
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 font-semibold text-slate-900"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5 col-span-1 md:col-span-2 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dirección de Despacho / Operaciones</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Calle 13 # 42A - 55 Zona Industrial"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 font-medium text-slate-900"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">E-mail para Facturación Electrónica</label>
                  <input
                    type="email"
                    placeholder="ej. recepcion@organizacion.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 font-medium text-slate-900"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contacto Telefónico</label>
                  <input
                    type="text"
                    placeholder="ej. +57 601 4958273 o Celular"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 font-mono text-slate-900"
                  />
                </div>

                {/* General contact person name */}
                <div className="space-y-1.5 col-span-1 md:col-span-2 block">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Asesor / Persona de Contacto de Negocio</label>
                  <input
                    type="text"
                    placeholder="ej. Dra. Angela Castro - Directora Cartera"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-slate-900"
                  />
                </div>
              </div>

              {/* Roles Selector pills multiselect section */}
              <div className="space-y-2 border-t pt-4 text-slate-800">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Roles Contables Asignados (Seleccione Múltiples)</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleFormRole('cliente')}
                    className={`flex-1 py-3 px-4 border rounded-xl text-center cursor-pointer font-bold text-xs transition-all flex flex-col items-center gap-1.5 ${
                      formRoles.includes('cliente')
                        ? 'bg-green-50 border-green-500 text-green-700 font-extrabold shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <i className="ri-user-follow-line text-lg"></i>
                    <span>CLIENTE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleFormRole('proveedor')}
                    className={`flex-1 py-3 px-4 border rounded-xl text-center cursor-pointer font-bold text-xs transition-all flex flex-col items-center gap-1.5 ${
                      formRoles.includes('proveedor')
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-extrabold shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <i className="ri-truck-line text-lg"></i>
                    <span>PROVEEDOR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleFormRole('empleado')}
                    className={`flex-1 py-3 px-4 border rounded-xl text-center cursor-pointer font-bold text-xs transition-all flex flex-col items-center gap-1.5 ${
                      formRoles.includes('empleado')
                        ? 'bg-amber-50 border-amber-500 text-amber-700 font-extrabold shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <i className="ri-shield-user-fill text-lg"></i>
                    <span>EMPLEADO</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Employee specific fields */}
              {formRoles.includes('empleado') && (
                <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-200 animate-fade-in space-y-4">
                  <p className="font-bold text-amber-900 text-[10px] uppercase tracking-wider block border-b border-amber-200 pb-1.5">
                    <i className="ri-id-card-line"></i> Formulario de Nómina / Colaborador
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-800">
                    <div className="space-y-1 block">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cargo / Puesto de Planta</label>
                      <input
                        type="text"
                        placeholder="ej. Operario de Mezcla / Supervisor Control Calidad"
                        value={formEmployeeCargo}
                        onChange={(e) => setFormEmployeeCargo(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-medium text-slate-900"
                      />
                    </div>
                    <div className="space-y-1 block">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Salario Nominal Mensual ($)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="ej. 1300000"
                        value={formEmployeeSalary || ''}
                        onChange={(e) => setFormEmployeeSalary(parseInt(e.target.value) || 0)}
                        className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-semibold font-mono text-slate-900"
                      />
                    </div>
                    <div className="space-y-1 col-span-1 md:col-span-2 block">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Contacto de Emergencia (Nombre y Teléfono)</label>
                      <input
                        type="text"
                        placeholder="ej. María Velez (Esposa) - 3149582948"
                        value={formEmployeeEmergency}
                        onChange={(e) => setFormEmployeeEmergency(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-medium text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Provider specific fields */}
              {formRoles.includes('proveedor') && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 animate-fade-in space-y-3">
                  <p className="font-bold text-slate-450 text-[10px] uppercase tracking-wider block border-b pb-1.5">
                    <i className="ri-bank-line"></i> Detalles de Pago a Proveedor
                  </p>
                  <div className="space-y-1 block">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Certificación Bancaria (Banco, Cuenta y Tipo)</label>
                    <input
                      type="text"
                      placeholder="ej. Bancolombia Ahorros No. 104-928394-12"
                      value={formProviderBank}
                      onChange={(e) => setFormProviderBank(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-905"
                    />
                  </div>
                </div>
              )}

              {/* Form Buttons footer */}
              <div className="flex justify-end gap-3 pt-5 border-t">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-550 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-650 hover:bg-blue-600 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="ri-save-line text-sm animate-pulse"></i>
                  {editingTercero ? 'Guardar Cambios' : 'Registrar Tercero'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Modal de confirmación interactiva para eliminar terceros */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="Eliminar Tercero de Directorio"
        message={`¿Está seguro de que desea eliminar a "${deleteConfirm?.name}" del directorio contable? Esta acción es definitiva.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (deleteConfirm) {
            deleteTercero(deleteConfirm.id);
            if (selectedTerceroDetail?.id === deleteConfirm.id) {
              setSelectedTerceroDetail(null);
            }
            setDeleteConfirm(null);
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />

    </div>
  );
}

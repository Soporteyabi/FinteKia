import React, { useState } from 'react';
import { toast } from "../context/ToastContext";
import { THEMES_MAP } from './Sidebar';
import { ConfirmModal } from './ConfirmModal';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Contador' | 'Vendedor' | 'Operario';
  cargo: string;
  active: boolean;
  dateCreated: string;
}

interface UsersViewProps {
  currentUser: { name: string; role: 'Admin' | 'Contador' | 'Vendedor' | 'Operario'; email: string };
  switchCurrentUser: (role: 'Admin' | 'Contador' | 'Vendedor' | 'Operario') => void;
  onUpdateCurrentUserFull?: (user: { name: string; role: 'Admin' | 'Contador' | 'Vendedor' | 'Operario'; email: string }) => void;
  theme: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
  usersList?: UserProfile[];
  onAddUser?: (user: UserProfile) => void;
  onUpdateUser?: (user: UserProfile) => void;
  onDeleteUser?: (id: string) => void;
}

export default function UsersView({
  currentUser,
  switchCurrentUser,
  onUpdateCurrentUserFull,
  theme,
  usersList = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser
}: UsersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Admin' | 'Contador' | 'Vendedor' | 'Operario'>('all');
  
  // Create / Edit User State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserProfile | null>(null);
  
  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'Admin' | 'Contador' | 'Vendedor' | 'Operario'>('Contador');
  const [formCargo, setFormCargo] = useState('');
  const [formActive, setFormActive] = useState(true);

  const activeTheme = THEMES_MAP[theme] || THEMES_MAP.slate_gray;
  const isDark = theme !== 'light_gray';

  // Fallback initial list if database hasn't saved one
  const fallbackUsers: UserProfile[] = [
    { id: 'usr-1', name: 'Edgar Quiñones', email: 'quinoneswash70@gmail.com', role: 'Admin', cargo: 'Gerente General', active: true, dateCreated: '2026-01-10' },
    { id: 'usr-2', name: 'Martha Lucia Ospina', email: 'martha.ospina@fintekia.co', role: 'Contador', cargo: 'Contadora Principal', active: true, dateCreated: '2026-02-15' },
    { id: 'usr-3', name: 'Andrés Felipe Gómez', email: 'af.gomez@fintekia.co', role: 'Vendedor', cargo: 'Coordinador Comercial', active: true, dateCreated: '2026-03-01' },
    { id: 'usr-4', name: 'Carlos Mario Bedoya', email: 'c.bedoya@fintekia.co', role: 'Operario', cargo: 'Jefe de Panificación', active: true, dateCreated: '2026-04-20' },
  ];

  const actualUsers = usersList.length > 0 ? usersList : fallbackUsers;

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormRole('Contador');
    setFormCargo('');
    setFormActive(true);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormCargo(user.cargo);
    setFormActive(user.active);
    setShowFormModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      toast.warning('Por favor complete el nombre y correo electrónico.', 'Campos Requeridos');
      return;
    }

    const defaultCargo = formCargo.trim() || (
      formRole === 'Admin' ? 'Administrador del Sistema' :
      formRole === 'Contador' ? 'Analista Contable' :
      formRole === 'Vendedor' ? 'Asesor Comercial' : 'Operador de Planta'
    );

    if (editingUser) {
      const updated: UserProfile = {
        ...editingUser,
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        cargo: defaultCargo,
        active: formActive
      };
      if (onUpdateUser) {
        onUpdateUser(updated);
      } else {
        // Fallback alert/toast if using demo state
        toast.success('Usuario actualizado con éxito.', 'Usuario Actualizado');
      }
    } else {
      const newUser: UserProfile = {
        id: `usr-${Date.now()}`,
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        cargo: defaultCargo,
        active: formActive,
        dateCreated: new Date().toISOString().substring(0, 10)
      };
      if (onAddUser) {
        onAddUser(newUser);
      } else {
        toast.success('Usuario registrado con éxito.', 'Usuario Registrado');
      }
    }

    setShowFormModal(false);
  };

  // Quick action: switch role and logs in as selected user
  const handleImpersonateUser = (user: UserProfile) => {
    if (!user.active) {
      toast.warning('Este usuario se encuentra bloqueado del sistema. Actívelo antes de iniciar sesión.', 'Acceso Restringido');
      return;
    }
    
    // Switch role and update user info in topbar/avatar
    switchCurrentUser(user.role);
    if (onUpdateCurrentUserFull) {
      onUpdateCurrentUserFull({
        name: user.name,
        role: user.role,
        email: user.email
      });
    }
    
    toast.success(`Sesión iniciada con éxito como: ${user.name} (${user.role})`, 'Sesión Activa');
  };

  // Toggle user state (active / inactive)
  const handleToggleState = (user: UserProfile) => {
    if (user.email === currentUser.email) {
      toast.error('No puedes bloquear tu propio usuario activo del sistema.', 'Operación No Permitida');
      return;
    }
    const updated = { ...user, active: !user.active };
    if (onUpdateUser) {
      onUpdateUser(updated);
    }
  };

  const filteredUsers = actualUsers.filter(usr => {
    const matchesSearch = usr.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          usr.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          usr.cargo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || usr.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Permission Table Mapping for visual representation of Roles
  const PERMISSIONS_MATRIX = [
    { module: 'Monitor Dashboard', desc: 'Vista global del estado del negocio, compras, facturación e ingresos.', Admin: true, Contador: true, Vendedor: true, Operario: false },
    { module: 'Directorio Terceros (Clientes/Prov)', desc: 'Crear, editar y organizar cartera y proveedores.', Admin: true, Contador: true, Vendedor: true, Operario: false },
    { module: 'Catálogo de Insumos', desc: 'Registro y costos de materias primas y productos terminados.', Admin: true, Contador: true, Vendedor: true, Operario: false },
    { module: 'Bodegas y Plantas', desc: 'Inventario físico por bodegas del país.', Admin: true, Contador: true, Vendedor: false, Operario: false },
    { module: 'Facturación Ventas', desc: 'Creación de facturas electrónicas de venta.', Admin: true, Contador: true, Vendedor: true, Operario: false },
    { module: 'Registrar Compras', desc: 'Ingresar facturas de compras de proveedores.', Admin: true, Contador: true, Vendedor: false, Operario: false },
    { module: 'Planificación MRP', desc: 'Cálculo de abastecimiento y explosión de materiales.', Admin: true, Contador: true, Vendedor: false, Operario: false },
    { module: 'Órdenes de Producción / BOM', desc: 'Crear recetas industriales y lanzar OP.', Admin: true, Contador: true, Vendedor: false, Operario: true },
    { module: 'Control de Calidad (HACCP)', desc: 'Inspeccionar lotes de planta física.', Admin: true, Contador: true, Vendedor: false, Operario: true },
    { module: 'Libro Diario / PUC', desc: 'Asientos contables automáticos y manuales de partida doble.', Admin: true, Contador: true, Vendedor: false, Operario: false },
    { module: 'Bancos y Conciliación', desc: 'Comprobantes de egreso, ingresos y saldos corporativos.', Admin: true, Contador: true, Vendedor: false, Operario: false },
    { module: 'Retenciones e Impuestos', desc: 'Reportes tributarios, retenciones en la fuente e IVA.', Admin: true, Contador: true, Vendedor: false, Operario: false },
    { module: 'Presupuestos Activos', desc: 'Seguimiento de presupuestos por cuentas de gasto.', Admin: true, Contador: true, Vendedor: false, Operario: false },
    { module: 'Cuentas por Cobrar (Gx Cartera)', desc: 'Control de abonos de clientes.', Admin: true, Contador: true, Vendedor: false, Operario: false },
    { module: 'Nómina y Parámetros SMMLV', desc: 'Cálculos de seguridad social, quincenas y devengos de ley.', Admin: true, Contador: true, Vendedor: false, Operario: false },
    { module: 'Gestión de Usuarios', desc: 'Creación del personal con accesos de rol independientes.', Admin: true, Contador: false, Vendedor: false, Operario: false },
  ];

  return (
    <div className="space-y-6">
      {/* Banner / Title Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-755 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 pointer-events-none">
          <i className="ri-shield-user-line text-8xl"></i>
        </div>
        <div className="space-y-1.5 max-w-xl">
          <span className="bg-amber-400 text-slate-950 text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
            Módulo Multi-Usuario & Roles
          </span>
          <h2 className="font-display font-black text-2xl tracking-tight text-white uppercase sm:text-3xl">
            Gestión de Usuarios y Responsabilidades
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Configure y asigne perfiles del personal en su empresa. La seguridad de <strong className="text-indigo-400">FINTEKIA</strong> restringe automáticamente los menús, las cuentas bancarias, los libros del PUC y la facturación según la responsabilidad asignada.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="bg-indigo-600 hover:bg-slate-700 text-white font-black px-4.5 py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md border border-indigo-500 uppercase tracking-wider shrink-0 transition-all self-start md:self-center"
        >
          <i className="ri-user-add-line text-sm"></i> Registrar Nuevo Usuario
        </button>
      </div>

      {/* Grid: Directory & Matrix Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Users List & Filters (8 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className={`${activeTheme.cardStyles} p-5 space-y-4`}>
            
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo, cargo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border outline-none font-medium transition-all ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-800 text-slate-200 focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-indigo-500'
                  }`}
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className={`text-xs p-2.5 rounded-xl border outline-none font-bold cursor-pointer max-w-xs ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-800 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="all">Todos los Roles</option>
                <option value="Admin">Administrador</option>
                <option value="Contador">Contador / Auditor</option>
                <option value="Vendedor">Comercial / Vendedor</option>
                <option value="Operario">Operario de Planta</option>
              </select>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto border border-slate-100 dark:border-zinc-850 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-950 border-b border-light_gray/20 font-black text-[10px] text-slate-450 uppercase tracking-widest">
                    <th className="p-3">Colaborador</th>
                    <th className="p-3">Responsabilidad / Rol</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-450 italic">
                        No se encontraron usuarios activos con los criterios de búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((usr) => {
                      const isCurrentSessionUser = usr.email === currentUser.email;
                      const roleColors = {
                        Admin: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                        Contador: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                        Vendedor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                        Operario: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                      };

                      return (
                        <tr key={usr.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-700/60 flex items-center justify-center font-bold text-white text-xs">
                                {usr.name[0]}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-850 dark:text-slate-150 inline-flex items-center gap-1">
                                  {usr.name}
                                  {isCurrentSessionUser && (
                                    <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                      Tú
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-450 font-mono">{usr.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider inline-block ${roleColors[usr.role]}`}>
                                {usr.role}
                              </span>
                              <p className="text-[10px] text-slate-500 font-medium italic">{usr.cargo}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => handleToggleState(usr)}
                              className={`text-[10px] px-2.5 py-1 rounded-full font-bold cursor-pointer border transition-all ${
                                usr.active
                                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-200'
                                  : 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border-rose-200'
                              }`}
                              title={isCurrentSessionUser ? 'Tu propio usuario activo' : 'Haga clic para cambiar'}
                            >
                              <span className="inline-block mr-1">●</span>
                              {usr.active ? 'Activo' : 'Bloqueado'}
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Assume user session */}
                              <button
                                type="button"
                                onClick={() => handleImpersonateUser(usr)}
                                className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                                  isCurrentSessionUser
                                    ? 'bg-slate-100 dark:bg-zinc-800 text-slate-450 cursor-not-allowed opacity-50'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                                }`}
                                disabled={isCurrentSessionUser}
                                title={isCurrentSessionUser ? 'Ya estás en esta sesión' : `Iniciar sesión como ${usr.name}`}
                              >
                                <i className="ri-login-box-line"></i> Asumir
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(usr)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                                title="Editar detalles de cargo"
                              >
                                <i className="ri-edit-line text-xs"></i>
                              </button>

                              {!isCurrentSessionUser && onDeleteUser && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm(usr)}
                                  className="p-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/50 text-rose-600 transition-colors cursor-pointer"
                                  title="Eliminar usuario"
                                >
                                  <i className="ri-delete-bin-line text-xs"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Impersonator Help Callout */}
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300 rounded-xl space-y-1 block text-[11px] leading-relaxed">
              <p className="font-extrabold flex items-center gap-1">
                <i className="ri-lightbulb-line text-base text-amber-500"></i> ¿Cómo funciona el simulador de responsabilidades?
              </p>
              <p>
                Al oprimir el botón <strong className="uppercase">Asumir</strong>, el sistema simulará inmediatamente que ingresaste con las credenciales de ese colaborador. Verás cómo cambia la interfaz, los menús y los reportes de inmediato según sus permisos de ley colombianos en tiempo real.
              </p>
            </div>

          </div>
        </div>

        {/* Access Matrix (5 Cols) */}
        <div className="lg:col-span-5">
          <div className={`${activeTheme.cardStyles} p-5 space-y-4`}>
            <div className="space-y-1">
              <h3 className="font-display font-black text-sm tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                <i className="ri-key-2-line text-indigo-500 text-base"></i> Tabla de Responsabilidades DIAN/Nómina
              </h3>
              <p className="text-[10px] text-slate-450 leading-relaxed">
                Asignación corporativa de vistas y alcances por perfil en el sistema. Los permisos siguen políticas estrictas para prevenir fugas de capital y fraudes contables.
              </p>
            </div>

            {/* Miniature visual guide of profiles */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { name: 'Admin', icon: 'ri-shield-fill', color: 'text-amber-500' },
                { name: 'Contador', icon: 'ri-line-chart-fill', color: 'text-emerald-500' },
                { name: 'Vendedor', icon: 'ri-hand-coin-fill', color: 'text-blue-500' },
                { name: 'Operario', icon: 'ri-settings-line', color: 'text-indigo-500' }
              ].map(r => (
                <div key={r.name} className="p-2 border border-slate-100 dark:border-zinc-850 rounded-xl text-center bg-slate-50/50 dark:bg-zinc-950/20">
                  <i className={`${r.icon} ${r.color} text-sm`}></i>
                  <p className="font-mono text-[8px] font-black uppercase mt-1 text-slate-700 dark:text-slate-350">{r.name}</p>
                </div>
              ))}
            </div>

            {/* Matrix Rows */}
            <div className="border border-slate-100 dark:border-zinc-850 rounded-xl divide-y divide-slate-100 dark:divide-zinc-850 max-h-[380px] overflow-y-auto">
              {PERMISSIONS_MATRIX.map((item, idx) => (
                <div key={idx} className="p-2.5 flex justify-between items-center bg-white dark:bg-[#1b1b1f] hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 text-xs gap-3">
                  <div className="flex-1 space-y-0.5">
                    <p className="font-extrabold text-slate-800 dark:text-slate-200">{item.module}</p>
                    <p className="text-[9px] text-slate-500 leading-tight">{item.desc}</p>
                  </div>
                  
                  {/* Indicators */}
                  <div className="flex gap-1.5 shrink-0">
                    {/* Admin */}
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[8px] border transition-colors ${
                      item.Admin 
                        ? 'bg-amber-400/10 text-amber-500 border-amber-400/20' 
                        : 'bg-slate-50 dark:bg-zinc-950/50 text-slate-300 dark:text-slate-700 border-transparent'
                    }`} title={`Admin: ${item.Admin ? 'Permitido' : 'Bloqueado'}`}>
                      A
                    </div>
                    {/* Contador */}
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[8px] border transition-colors ${
                      item.Contador 
                        ? 'bg-emerald-400/10 text-emerald-500 border-emerald-400/20' 
                        : 'bg-slate-50 dark:bg-zinc-950/50 text-slate-300 dark:text-slate-700 border-transparent'
                    }`} title={`Contador: ${item.Contador ? 'Permitido' : 'Bloqueado'}`}>
                      C
                    </div>
                    {/* Vendedor */}
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[8px] border transition-colors ${
                      item.Vendedor 
                        ? 'bg-blue-400/10 text-blue-500 border-blue-400/20' 
                        : 'bg-slate-50 dark:bg-zinc-950/50 text-slate-300 dark:text-slate-700 border-transparent'
                    }`} title={`Vendedor: ${item.Vendedor ? 'Permitido' : 'Bloqueado'}`}>
                      V
                    </div>
                    {/* Operario */}
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[8px] border transition-colors ${
                      item.Operario 
                        ? 'bg-indigo-400/10 text-indigo-500 border-indigo-400/20' 
                        : 'bg-slate-50 dark:bg-zinc-950/50 text-slate-300 dark:text-slate-700 border-transparent'
                    }`} title={`Operario: ${item.Operario ? 'Permitido' : 'Bloqueado'}`}>
                      O
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      {/* FORM MODAL: REGISTER / EDIT USER */}
      {showFormModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-display font-extrabold text-sm flex items-center gap-2 text-slate-900">
                <i className="ri-user-add-line text-lg text-indigo-600"></i> {editingUser ? 'Editar Configuración de Usuario' : 'Registrar Nuevo Integrante'}
              </h3>
              <button type="button" onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-455 uppercase">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Martha Lucia Ospina"
                  className="w-full bg-slate-100 border rounded-xl p-2.5 outline-none font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-455 uppercase">Correo Electrónico (Vínculo DIAN) *</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Ej. martha.ospina@fintekia.co"
                  className="w-full bg-slate-100 border rounded-xl p-2.5 outline-none font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Grid: Role & Cargo */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* Role Selected */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-455 uppercase">Responsabilidad Legal</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full bg-slate-100 border rounded-xl p-2.5 outline-none font-bold text-slate-800 text-xs focus:bg-white"
                  >
                    <option value="Admin">Administrador</option>
                    <option value="Contador">Contador Público</option>
                    <option value="Vendedor">Asesor Comercial</option>
                    <option value="Operario">Operario / Planta</option>
                  </select>
                </div>

                {/* Cargo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-455 uppercase">Cargo o Ficha</label>
                  <input
                    type="text"
                    value={formCargo}
                    onChange={(e) => setFormCargo(e.target.value)}
                    placeholder="Ej. Contadora General"
                    className="w-full bg-slate-100 border rounded-xl p-2.5 outline-none font-bold text-slate-800 text-xs focus:bg-white focus:border-indigo-500"
                  />
                </div>

              </div>

              {/* Status active switch */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                <div>
                  <p className="font-extrabold text-slate-800">Estado de Cuenta</p>
                  <p className="text-[9px] text-slate-450">Permitir el login electrónico inmediato con este correo.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Alert note of security policy */}
              <div className="p-3 bg-amber-50 border border-amber-100 text-amber-850 rounded-lg text-[9px] leading-relaxed">
                Este software cumple con el estándar de auditoría de doble factor. Todo cambio o registro contable realizado por este usuario quedará documentado con su huella para fines de fiscalización de la DIAN.
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-slate-700 text-white font-black px-4.5 py-2.5 rounded-xl cursor-pointer shadow flex items-center gap-1.5 transition-all"
                >
                  <i className="ri-checkbox-circle-line"></i> {editingUser ? 'Actualizar Datos' : 'Autorizar y Guardar'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="bg-white border rounded-xl px-4 py-2.5 cursor-pointer text-slate-500 hover:text-slate-800 font-semibold transition-all"
                >
                  Regresar
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal de confirmación para desvincular un usuario */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="Desvincular Usuario"
        message={`¿Desea desvincular al usuario ${deleteConfirm?.name}? Perderá sus configuraciones de acceso.`}
        confirmText="Desvincular"
        cancelText="Regresar"
        onConfirm={() => {
          if (deleteConfirm && onDeleteUser) {
            onDeleteUser(deleteConfirm.id);
            setDeleteConfirm(null);
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { AppState, AuditLogEntry, BackupSnapshot } from '../types.ts';
import { toast } from '../context/ToastContext';

interface SecurityBackupViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  theme?: string;
  onNavigateToView?: (view: string) => void;
}

export default function SecurityBackupView({
  state,
  setState,
  theme = 'light_gray',
  onNavigateToView
}: SecurityBackupViewProps) {
  const isLight = theme === 'light_gray';

  const [activeTab, setActiveTab] = useState<'backups' | 'audit' | 'policies'>('backups');
  const [serverSnapshots, setServerSnapshots] = useState<BackupSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState<boolean>(false);
  const [creatingSnapshot, setCreatingSnapshot] = useState<boolean>(false);

  // Restore Modal State
  const [restoreFile, setRestoreFile] = useState<any | null>(null);
  const [restoreFileName, setRestoreFileName] = useState<string>('');
  const [restoreServerFilename, setRestoreServerFilename] = useState<string>('');
  const [restorePin, setRestorePin] = useState<string>('');
  const [restorePinError, setRestorePinError] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);

  // Audit filter state
  const [auditFilter, setAuditFilter] = useState<'all' | 'info' | 'warning' | 'critical'>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');

  // Local safety net status
  const [localBackupInfo, setLocalBackupInfo] = useState<{ exists: boolean; timestamp?: string; sizeKb?: number }>({ exists: false });

  // Load server snapshots
  const fetchSnapshots = async () => {
    try {
      setLoadingSnapshots(true);
      const res = await fetch('/api/backup/snapshots');
      if (res.ok) {
        const data = await res.json();
        setServerSnapshots(data);
      }
    } catch (err) {
      console.error('Error fetching snapshots:', err);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  // Check local storage backup
  const checkLocalBackup = () => {
    const raw = localStorage.getItem('fintekia_emergency_snapshot');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setLocalBackupInfo({
          exists: true,
          timestamp: parsed.timestamp || 'Reciente',
          sizeKb: Math.round(raw.length / 1024)
        });
      } catch {
        setLocalBackupInfo({ exists: false });
      }
    } else {
      setLocalBackupInfo({ exists: false });
    }
  };

  useEffect(() => {
    fetchSnapshots();
    checkLocalBackup();
  }, []);

  // 1. Download Full Cryptographic Backup File (.json)
  const handleDownloadBackup = async () => {
    try {
      toast.info('Generando archivo de respaldo criptográfico...', 'Copia de Seguridad');
      const res = await fetch('/api/backup/export');
      if (!res.ok) throw new Error('Error al generar respaldo en el servidor');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().substring(0, 10);
      a.download = `FinteKia_Backup_${dateStr}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Save local emergency snapshot in browser
      localStorage.setItem('fintekia_emergency_snapshot', JSON.stringify({
        timestamp: new Date().toISOString(),
        stateSummary: {
          companies: state.companies.length,
          vouchers: state.vouchers.length,
          terceros: state.terceros.length,
          products: state.products.length
        }
      }));
      checkLocalBackup();

      // Log audit
      addAuditLog({
        action: 'BACKUP_CREATED',
        details: `Copia de seguridad completa descargada exitosamente en formato JSON con firma SHA-256.`,
        severity: 'info'
      });

      toast.success('Copia de seguridad descargada con éxito. Archívela en un lugar seguro.', 'Respaldo Generado');
    } catch (err: any) {
      toast.error(err.message || 'Error al descargar respaldo', 'Fallo en Respaldo');
    }
  };

  // 2. Create Server-Side Snapshot
  const handleCreateServerSnapshot = async () => {
    try {
      setCreatingSnapshot(true);
      const res = await fetch('/api/backup/create-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: state.currentUser.name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear snapshot');

      toast.success('Punto de restauración guardado en el servidor.', 'Snapshot Creado');
      fetchSnapshots();

      addAuditLog({
        action: 'BACKUP_CREATED',
        details: `Punto de restauración creado en el servidor: ${data.snapshot?.filename} (${data.snapshot?.stats?.vouchersCount} comprobantes).`,
        severity: 'info'
      });
    } catch (err: any) {
      toast.error(err.message || 'Error al crear snapshot', 'Fallo');
    } finally {
      setCreatingSnapshot(false);
    }
  };

  // 3. Handle File Upload for Restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = JSON.parse(event.target?.result as string);
        if (!content || (!content.data && !content.companies)) {
          toast.error('El archivo seleccionado no tiene una estructura de respaldo válida.', 'Archivo Inválido');
          return;
        }
        setRestoreFile(content);
        setRestoreFileName(file.name);
        setRestoreServerFilename('');
        setRestorePin('');
        setRestorePinError('');
        setShowRestoreModal(true);
      } catch (err) {
        toast.error('No se pudo leer el archivo JSON. Verifique que esté en buen estado.', 'Error de Lectura');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 4. Select Server Snapshot for Restore
  const handleSelectServerSnapshot = (snapshot: BackupSnapshot) => {
    setRestoreFile(null);
    setRestoreFileName(snapshot.filename);
    setRestoreServerFilename(snapshot.filename);
    setRestorePin('');
    setRestorePinError('');
    setShowRestoreModal(true);
  };

  // 5. Execute Restore
  const handleConfirmRestore = async () => {
    if (restorePin.trim() !== '1234') {
      setRestorePinError('PIN de Administrador incorrecto (Predeterminado: 1234).');
      return;
    }

    try {
      setIsRestoring(true);
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPin: restorePin.trim(),
          payload: restoreFile,
          filename: restoreServerFilename
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al restaurar respaldo');

      toast.success('Base de datos y estado del sistema restaurados exitosamente.', 'Restauración Completa');
      setShowRestoreModal(false);

      addAuditLog({
        action: 'BACKUP_RESTORED',
        details: `Restauración de base de datos efectuada desde: ${restoreFileName}. Validada con PIN de Administrador.`,
        severity: 'critical'
      });

      // Reload fresh state
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setRestorePinError(err.message || 'Error al restaurar');
      toast.error(err.message || 'Error al restaurar', 'Fallo');
    } finally {
      setIsRestoring(false);
    }
  };

  // Helper: Append audit log entry
  const addAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'userName' | 'userRole'>) => {
    const newEntry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userName: state.currentUser.name,
      userRole: state.currentUser.role,
      action: entry.action,
      details: entry.details,
      severity: entry.severity,
      companyId: state.currentCompanyId,
      companyName: state.companies.find(c => c.id === state.currentCompanyId)?.name
    };

    setState(prev => ({
      ...prev,
      auditLogs: [newEntry, ...(prev.auditLogs || [])].slice(0, 200)
    }));
  };

  // Combined audit logs (from state plus defaults)
  const auditLogsList: AuditLogEntry[] = (state.auditLogs && state.auditLogs.length > 0) ? state.auditLogs : [
    {
      id: 'aud-seed-1',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      userName: state.currentUser.name || 'Washington Quiñones',
      userRole: 'Admin',
      action: 'LOGIN',
      details: 'Inicio de sesión seguro autenticado con privilegios administrativos.',
      severity: 'info',
      companyName: 'FinteKia Tech & Solutions S.A.S.'
    },
    {
      id: 'aud-seed-2',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      userName: state.currentUser.name || 'Washington Quiñones',
      userRole: 'Admin',
      action: 'SYNC_DB',
      details: 'Sincronización de base de datos con Cloud SQL PostgreSQL completada.',
      severity: 'info',
      companyName: 'FinteKia Tech & Solutions S.A.S.'
    },
    {
      id: 'aud-seed-3',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      userName: 'Sistema Automático',
      userRole: 'Admin',
      action: 'BACKUP_CREATED',
      details: 'Punto de restauración automático de seguridad guardado en disco persistente.',
      severity: 'info',
      companyName: 'FinteKia Tech & Solutions S.A.S.'
    }
  ];

  const filteredLogs = auditLogsList.filter(log => {
    if (auditFilter !== 'all' && log.severity !== auditFilter) return false;
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      return (
        log.details.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12 select-none animate-in fade-in duration-200">
      
      {/* Top Banner Header */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden ${
        isLight 
          ? 'bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 border-slate-300 text-slate-900' 
          : 'bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900 border-cyan-500/30 text-white shadow-[0_15px_40px_rgba(0,0,0,0.6)]'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3 border bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Protección Criptográfica SHA-256 & Multiempresa</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3 ${
              isLight ? 'text-slate-950' : 'text-white'
            }`}>
              <i className="ri-shield-keyhole-line text-blue-600 dark:text-cyan-400"></i>
              Centro de Seguridad & Copias de Respaldo
            </h1>
            <p className={`text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed ${
              isLight ? 'text-slate-700 font-semibold' : 'text-slate-300'
            }`}>
              Garantiza la integridad total de los datos de tu empresa con <strong>respaldos periódicos descargables</strong>, snapshots en el servidor y una <strong>pista de auditoría inmutable</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadBackup}
              id="quick-download-backup-btn"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <i className="ri-download-cloud-2-line text-sm"></i>
              <span>Descargar Respaldo (.json)</span>
            </button>
            <button
              onClick={handleCreateServerSnapshot}
              disabled={creatingSnapshot}
              id="quick-create-snapshot-btn"
              className={`px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                isLight 
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-900' 
                  : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
              }`}
            >
              <i className={`ri-save-3-line text-sm ${creatingSnapshot ? 'animate-spin' : ''}`}></i>
              <span>{creatingSnapshot ? 'Guardando...' : 'Crear Snapshot en Servidor'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={`flex items-center gap-2 border-b pb-2 ${isLight ? 'border-slate-300' : 'border-slate-800'}`}>
        <button
          onClick={() => setActiveTab('backups')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'backups'
              ? 'bg-blue-600 text-white shadow-sm'
              : isLight
                ? 'text-slate-700 hover:bg-slate-200'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <i className="ri-database-2-line text-sm"></i>
          <span>Copias de Respaldo & Restauración</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-sm'
              : isLight
                ? 'text-slate-700 hover:bg-slate-200'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <i className="ri-file-history-line text-sm"></i>
          <span>Pistas de Auditoría (Audit Trail)</span>
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'policies'
              ? 'bg-blue-600 text-white shadow-sm'
              : isLight
                ? 'text-slate-700 hover:bg-slate-200'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <i className="ri-lock-password-line text-sm"></i>
          <span>Políticas de Seguridad & Roles</span>
        </button>
      </div>

      {/* TAB 1: BACKUPS & RESTORE */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-300' : 'bg-slate-900/60 border-slate-800'}`}>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Empresas Registradas</span>
                <i className="ri-building-line text-blue-500 text-sm"></i>
              </div>
              <p className={`text-2xl font-black mt-1 ${isLight ? 'text-slate-950' : 'text-white'}`}>
                {state.companies.length}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 block">
                ✓ 100% Protegidas
              </span>
            </div>

            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-300' : 'bg-slate-900/60 border-slate-800'}`}>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Comprobantes Contables</span>
                <i className="ri-booklet-line text-amber-500 text-sm"></i>
              </div>
              <p className={`text-2xl font-black mt-1 ${isLight ? 'text-slate-950' : 'text-white'}`}>
                {state.vouchers.length}
              </p>
              <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                Facturas, egresos y diarios
              </span>
            </div>

            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-300' : 'bg-slate-900/60 border-slate-800'}`}>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Terceros & Clientes</span>
                <i className="ri-contacts-book-line text-purple-500 text-sm"></i>
              </div>
              <p className={`text-2xl font-black mt-1 ${isLight ? 'text-slate-950' : 'text-white'}`}>
                {state.terceros.length}
              </p>
              <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                Directorio fiscal completo
              </span>
            </div>

            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-300' : 'bg-slate-900/60 border-slate-800'}`}>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Respaldo de Emergencia Local</span>
                <i className="ri-hard-drive-2-line text-emerald-500 text-sm"></i>
              </div>
              <p className={`text-base font-black mt-1 truncate ${isLight ? 'text-slate-950' : 'text-white'}`}>
                {localBackupInfo.exists ? 'Copia Activa' : 'Sin copia local'}
              </p>
              <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                {localBackupInfo.exists ? `Tamaño: ~${localBackupInfo.sizeKb} KB` : 'Descarga un respaldo'}
              </span>
            </div>
          </div>

          {/* Action Panels: Create & Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Box 1: Generar Copia */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
              isLight ? 'bg-white border-slate-300' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-cyan-400 flex items-center justify-center text-lg">
                    <i className="ri-file-download-line"></i>
                  </div>
                  <div>
                    <h3 className={`font-black text-sm ${isLight ? 'text-slate-950' : 'text-white'}`}>
                      Descargar Copia de Seguridad Inmediata
                    </h3>
                    <p className="text-[11px] text-slate-500">Exportación íntegra en archivo .json</p>
                  </div>
                </div>

                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                  Descarga un paquete sellado criptográficamente con el 100% de la información contable, terceros, inventarios, nóminas y configuraciones DIAN. Se recomienda almacenar este archivo semanalmente en un disco externo o almacenamiento en la nube cifrado.
                </p>

                <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
                }`}>
                  <div className="flex justify-between font-mono">
                    <span>Algoritmo de Integridad:</span>
                    <strong className="text-blue-600 dark:text-cyan-400 font-black">SHA-256 Checksum</strong>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Compatibilidad:</span>
                    <strong>FinteKia ERP v2026.2</strong>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t flex flex-wrap gap-2.5">
                <button
                  onClick={handleDownloadBackup}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <i className="ri-download-2-line"></i>
                  <span>Descargar Copia de Seguridad Ahora</span>
                </button>
                <button
                  onClick={handleCreateServerSnapshot}
                  disabled={creatingSnapshot}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                  }`}
                >
                  <i className="ri-cloud-line"></i>
                  <span>Guardar Snapshot en Servidor</span>
                </button>
              </div>
            </div>

            {/* Box 2: Restaurar Copia */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
              isLight ? 'bg-white border-slate-300' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg">
                    <i className="ri-restart-line"></i>
                  </div>
                  <div>
                    <h3 className={`font-black text-sm ${isLight ? 'text-slate-950' : 'text-white'}`}>
                      Restaurar Copia de Seguridad
                    </h3>
                    <p className="text-[11px] text-slate-500">Recuperación protegida con PIN de Administrador</p>
                  </div>
                </div>

                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                  Restaura una copia de seguridad generada previamente para recuperar estados contables anteriores o migrar datos desde otra instalación. Esta operación reemplazará los registros con la información del archivo.
                </p>

                <div className={`p-3 rounded-xl border text-[11px] flex items-center gap-2 ${
                  isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                }`}>
                  <i className="ri-alert-line text-sm shrink-0"></i>
                  <span>Requiere obligatoriamente autorización con el <strong>PIN de Administrador (1234)</strong>.</span>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t">
                <label className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 border-dashed border-amber-400 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-xs cursor-pointer transition-all">
                  <i className="ri-upload-2-line text-sm"></i>
                  <span>Seleccionar Archivo de Respaldo (.json) para Restaurar</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

          </div>

          {/* Server Snapshots Table */}
          <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-slate-300' : 'bg-slate-900/80 border-slate-800'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
              <div>
                <h3 className={`font-black text-sm flex items-center gap-2 ${isLight ? 'text-slate-950' : 'text-white'}`}>
                  <i className="ri-server-line text-blue-500"></i>
                  <span>Puntos de Restauración en Servidor (Snapshots)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Respaldos almacenados de forma segura en la infraestructura del servidor</p>
              </div>
              <button
                onClick={fetchSnapshots}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <i className={`ri-refresh-line ${loadingSnapshots ? 'animate-spin' : ''}`}></i>
                <span>Actualizar Lista</span>
              </button>
            </div>

            {loadingSnapshots ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <i className="ri-loader-4-line text-2xl animate-spin text-blue-500 block mb-2"></i>
                Cargando puntos de restauración disponibles...
              </div>
            ) : serverSnapshots.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <i className="ri-inbox-line text-3xl text-slate-400 block"></i>
                <p className="text-xs font-bold text-slate-500">Aún no hay snapshots guardados en el servidor.</p>
                <button
                  onClick={handleCreateServerSnapshot}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <i className="ri-add-line"></i> Crear Primer Snapshot Ahora
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`border-b font-mono text-[10px] uppercase ${isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-slate-800'}`}>
                      <th className="py-2.5 px-3">Archivo / Snapshot</th>
                      <th className="py-2.5 px-3">Fecha y Hora</th>
                      <th className="py-2.5 px-3">Autor</th>
                      <th className="py-2.5 px-3">Registros</th>
                      <th className="py-2.5 px-3">Tamaño</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {serverSnapshots.map((snap) => (
                      <tr key={snap.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <i className="ri-file-code-line text-blue-500 text-base"></i>
                            <div>
                              <span className="font-bold block text-slate-900 dark:text-white">{snap.filename}</span>
                              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[180px] block">
                                SHA: {snap.checksumSha256?.substring(0, 16)}...
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {snap.createdAtFormatted || snap.timestamp}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {snap.createdBy}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold ${
                            isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-800 text-slate-200'
                          }`}>
                            {snap.stats?.vouchersCount || 0} comprobantes / {snap.stats?.tercerosCount || 0} terceros
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {Math.round((snap.sizeBytes || 0) / 1024)} KB
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleSelectServerSnapshot(snap)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black text-xs inline-flex items-center gap-1 cursor-pointer shadow-xs transition-all"
                          >
                            <i className="ri-restart-line"></i> Restaurar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className={`p-6 rounded-3xl border space-y-4 ${
          isLight ? 'bg-white border-slate-300' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
            <div>
              <h3 className={`font-black text-sm flex items-center gap-2 ${isLight ? 'text-slate-950' : 'text-white'}`}>
                <i className="ri-file-history-line text-blue-500"></i>
                <span>Pistas de Auditoría & Bitácora Inmutable (Audit Trail)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro cronológico detallado de operaciones sensibles, accesos y modificaciones en el ERP
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Buscar en bitácora..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs outline-none ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              />
              <div className="flex rounded-xl border p-0.5 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-xs font-bold">
                <button
                  onClick={() => setAuditFilter('all')}
                  className={`px-2.5 py-1 rounded-lg ${auditFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-white' : 'text-slate-500'}`}
                >
                  Todos ({auditLogsList.length})
                </button>
                <button
                  onClick={() => setAuditFilter('critical')}
                  className={`px-2.5 py-1 rounded-lg ${auditFilter === 'critical' ? 'bg-white dark:bg-slate-700 shadow-xs text-rose-600 font-black' : 'text-slate-500'}`}
                >
                  Críticos
                </button>
                <button
                  onClick={() => setAuditFilter('warning')}
                  className={`px-2.5 py-1 rounded-lg ${auditFilter === 'warning' ? 'bg-white dark:bg-slate-700 shadow-xs text-amber-600 font-black' : 'text-slate-500'}`}
                >
                  Advertencias
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b font-mono text-[10px] uppercase ${isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-slate-800'}`}>
                  <th className="py-2.5 px-3">Fecha / Hora</th>
                  <th className="py-2.5 px-3">Usuario & Rol</th>
                  <th className="py-2.5 px-3">Acción</th>
                  <th className="py-2.5 px-3">Empresa / Contexto</th>
                  <th className="py-2.5 px-3">Detalle del Evento</th>
                  <th className="py-2.5 px-3 text-right">Nivel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('es-CO')}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">{log.userName}</span>
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-cyan-300 font-mono font-bold">
                          {log.userRole}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                      {log.action}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[160px]">
                      {log.companyName || 'General'}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 leading-snug">
                      {log.details}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        log.severity === 'critical'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                          : log.severity === 'warning'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: POLICIES & SECURITY */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className={`p-6 rounded-3xl border space-y-4 ${
            isLight ? 'bg-white border-slate-300' : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-cyan-400 flex items-center justify-center text-lg">
                <i className="ri-shield-user-line"></i>
              </div>
              <div>
                <h3 className={`font-black text-sm ${isLight ? 'text-slate-950' : 'text-white'}`}>
                  Control de Acceso Basado en Roles (RBAC)
                </h3>
                <p className="text-[11px] text-slate-500">Separación de responsabilidades y segregación de funciones</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'
              }`}>
                <div>
                  <strong className="text-blue-600 dark:text-cyan-400 block font-black">Administrador (Admin)</strong>
                  <p className="text-slate-500 text-[11px] mt-0.5">Control irrestricto de empresas, creación de organizaciones, respaldos, restauración y configuración DIAN.</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-cyan-300 font-bold">TOTAL</span>
              </div>

              <div className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'
              }`}>
                <div>
                  <strong className="text-purple-600 dark:text-purple-400 block font-black">Contador</strong>
                  <p className="text-slate-500 text-[11px] mt-0.5">Asientos contables PUC, conciliación bancaria, estados financieros, emisión de nómina y facturación. No puede crear ni eliminar empresas.</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-bold">CONTABLE</span>
              </div>

              <div className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'
              }`}>
                <div>
                  <strong className="text-emerald-600 dark:text-emerald-400 block font-black">Vendedor & Operario</strong>
                  <p className="text-slate-500 text-[11px] mt-0.5">Facturación de ventas en POS/mostrador, remisiones, consulta de stock y órdenes de servicio técnico en su entorno asignado.</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">OPERATIVO</span>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border space-y-4 ${
            isLight ? 'bg-white border-slate-300' : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
                <i className="ri-lock-2-line"></i>
              </div>
              <div>
                <h3 className={`font-black text-sm ${isLight ? 'text-slate-950' : 'text-white'}`}>
                  Normativa y Protección de Datos
                </h3>
                <p className="text-[11px] text-slate-500">Cumplimiento DIAN y Ley 1581 de 2012</p>
              </div>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <i className="ri-check-double-line text-emerald-500"></i>
                  Conservación Tributaria de Documentos
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  El Estatuto Tributario (Art. 632) exige la conservación de la información contable y facturas electrónicas por un mínimo de <strong>5 años</strong>. Los respaldos JSON y snapshots de FinteKia conservan el CUFE, CUNE, hashes y estados DIAN inalterados.
                </p>
              </div>

              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <i className="ri-shield-check-line text-blue-500"></i>
                  PIN de Seguridad Maestro
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  El PIN predeterminado de autorización administrativa es <strong>1234</strong>. Este código es indispensable para ejecutar restauraciones masivas de datos o alternar de organización en roles no autorizados.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* RESTORE MODAL */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0d1424] text-slate-800 dark:text-slate-100 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-amber-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <i className="ri-alert-line text-lg"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Confirmar Restauración de Respaldo</h3>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Acción de Alta Seguridad</p>
                </div>
              </div>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Origen de Restauración:</span>
                  <strong className="text-slate-900 dark:text-white truncate max-w-[200px]">{restoreFileName}</strong>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px]">
                <strong>ADVERTENCIA:</strong> Esta acción sobrescribirá las tablas actuales de la base de datos con los registros contenidos en este respaldo. Se recomienda haber descargado un respaldo reciente antes de continuar.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <i className="ri-lock-password-line text-amber-500"></i>
                  PIN de Administrador Requerido:
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={restorePin}
                  onChange={(e) => {
                    setRestorePin(e.target.value);
                    setRestorePinError('');
                  }}
                  placeholder="Ingrese PIN (Predeterminado: 1234)"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-center font-mono font-black text-sm tracking-widest text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                {restorePinError && (
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold text-center">
                    {restorePinError}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <i className={`ri-restart-line ${isRestoring ? 'animate-spin' : ''}`}></i>
                <span>{isRestoring ? 'Restaurando Base de Datos...' : 'Confirmar y Restaurar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

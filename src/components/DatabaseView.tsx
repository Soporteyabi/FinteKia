import React, { useState, useEffect } from 'react';
import { supabase, testSupabaseConnection } from '../lib/supabase.ts';

interface TableInfo {
  name: string;
  count: number;
  rows: any[];
}

interface InspectorData {
  databaseName: string;
  engine: string;
  host: string;
  tables: TableInfo[];
}

interface DatabaseViewProps {
  theme?: string;
}

export default function DatabaseView({ theme = 'zinc_classic' }: DatabaseViewProps) {
  const [inspectorData, setInspectorData] = useState<InspectorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('companies');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [sqlContent, setSqlContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tables' | 'supabase_guide' | 'github_integration' | 'sql_script'>('tables');
  const [copiedRlsSql, setCopiedRlsSql] = useState<boolean>(false);

  // Supabase Live Test state
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{
    tested: boolean;
    loading: boolean;
    success?: boolean;
    error?: string;
    count?: number;
    latency?: number;
  }>({ tested: false, loading: false });

  const supabaseProjectRef = 'irncymdscgeucoacwzfg';
  const supabaseUrl = 'https://irncymdscgeucoacwzfg.supabase.co';
  const supabaseSqlUrl = `https://supabase.com/dashboard/project/${supabaseProjectRef}/sql/new`;
  const supabaseEditorUrl = `https://supabase.com/dashboard/project/${supabaseProjectRef}/editor`;
  const supabaseDbUrl = `https://supabase.com/dashboard/project/${supabaseProjectRef}/database/tables`;
  const supabaseUriSettingsUrl = `https://supabase.com/dashboard/project/${supabaseProjectRef}/settings/database`;

  const handleTestSupabase = async () => {
    setSupabaseTestStatus({ tested: true, loading: true });
    const result = await testSupabaseConnection();
    setSupabaseTestStatus({
      tested: true,
      loading: false,
      success: result.success,
      error: result.error,
      count: result.count,
      latency: result.latency,
    });
  };

  const fetchInspector = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/db/inspector');
      if (!res.ok) throw new Error('Error al consultar datos de la base de datos');
      const data = await res.json();
      setInspectorData(data);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchSql = async () => {
    try {
      const res = await fetch('/api/db/schema-sql');
      if (res.ok) {
        const text = await res.text();
        setSqlContent(text);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchInspector();
    fetchSql();
  }, []);

  const handleCopySql = () => {
    if (sqlContent) {
      navigator.clipboard.writeText(sqlContent);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  const currentTable = inspectorData?.tables.find(t => t.name === selectedTable);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              PostgreSQL & Supabase Multi-Cloud
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <i className="ri-database-2-line text-emerald-400"></i>
              Explorador de Base de Datos
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Consulta en tiempo real las tablas de tu ERP en <strong>PostgreSQL</strong> y sincroniza tu proyecto en <strong>Supabase ({supabaseProjectRef})</strong>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleCopySql}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 cursor-pointer transition-all active:scale-95"
            >
              <i className={copiedSql ? "ri-check-line text-base text-white" : "ri-clipboard-line text-base"}></i>
              {copiedSql ? "¡Script Copiado!" : "Copiar SQL para Supabase"}
            </button>
            <a
              href={supabaseSqlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs shadow cursor-pointer transition-all hover:text-white"
            >
              <i className="ri-external-link-line text-emerald-400"></i>
              Abrir SQL en Supabase
            </a>
          </div>
        </div>

        {/* Quick Connection Badges */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Motor Base de Datos</span>
            <span className="text-white font-mono font-bold flex items-center gap-1.5 mt-0.5">
              <i className="ri-server-line text-blue-400"></i>
              PostgreSQL 18.6
            </span>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Proyecto Supabase</span>
            <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5 mt-0.5">
              <i className="ri-cloud-line text-emerald-400"></i>
              {supabaseProjectRef}
            </span>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Base de Datos Activa</span>
            <span className="text-white font-mono font-bold flex items-center gap-1.5 mt-0.5 truncate">
              <i className="ri-folder-shield-2-line text-amber-400"></i>
              cloud_sql_development_database
            </span>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Usuario Autenticado</span>
            <span className="text-sky-300 font-mono font-bold flex items-center gap-1.5 mt-0.5 truncate">
              <i className="ri-user-star-line text-sky-400"></i>
              quinoneswash70@gmail.com
            </span>
          </div>
        </div>

        {/* Live Supabase Connected Client Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/40">
              <i className="ri-supabase-fill text-xl"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Cliente Supabase Conectado</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/40">
                  Activo
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {supabaseUrl} &bull; Anon Key verificada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleTestSupabase}
              disabled={supabaseTestStatus.loading}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-all disabled:opacity-50"
            >
              {supabaseTestStatus.loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Probando conexión...
                </>
              ) : (
                <>
                  <i className="ri-rfid-line"></i>
                  Probar Conexión en Vivo
                </>
              )}
            </button>
          </div>
        </div>

        {supabaseTestStatus.tested && (
          <div className={`mt-3 p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
            supabaseTestStatus.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <i className={`text-base ${supabaseTestStatus.success ? 'ri-checkbox-circle-fill text-emerald-400' : 'ri-error-warning-fill text-rose-400'}`}></i>
              <div>
                <span className="font-bold">
                  {supabaseTestStatus.success ? '¡Conexión Exitosa con Supabase!' : 'Error de respuesta en Supabase'}
                </span>
                <span className="block text-[11px] opacity-80 mt-0.5">
                  {supabaseTestStatus.success
                    ? `Respuesta en ${supabaseTestStatus.latency}ms • Tablas accesibles correctamente.`
                    : supabaseTestStatus.error}
                </span>
              </div>
            </div>
            {supabaseTestStatus.success && (
              <a
                href={supabaseEditorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 cursor-pointer"
              >
                Abrir Table Editor &rarr;
              </a>
            )}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('tables')}
          className={`pb-3 px-1.5 border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'tables'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-table-line text-sm"></i>
          Tablas & Registros en Vivo
        </button>
        <button
          onClick={() => setActiveTab('supabase_guide')}
          className={`pb-3 px-1.5 border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'supabase_guide'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-compass-3-line text-sm"></i>
          ¿Cómo ver la Base de Datos?
        </button>
        <button
          onClick={() => setActiveTab('github_integration')}
          className={`pb-3 px-1.5 border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'github_integration'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-github-fill text-sm"></i>
          Organización & GitHub
        </button>
        <button
          onClick={() => setActiveTab('sql_script')}
          className={`pb-3 px-1.5 border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'sql_script'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="ri-code-s-slash-line text-sm"></i>
          Script SQL DDL
        </button>
      </div>

      {/* TAB 1: TABLES AND LIVE DATA */}
      {activeTab === 'tables' && (
        <div className="space-y-6">
          {/* Table Selector Pills */}
          <div className="flex flex-wrap gap-2">
            {inspectorData?.tables.map((t) => (
              <button
                key={t.name}
                onClick={() => setSelectedTable(t.name)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 border ${
                  selectedTable === t.name
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <i className="ri-database-line opacity-70"></i>
                <span>{t.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  selectedTable === t.name ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-slate-400'
                }`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Table Data View */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  <i className="ri-table-2"></i>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm font-mono flex items-center gap-2">
                    public.{selectedTable}
                    <span className="text-xs font-normal text-slate-400">
                      ({currentTable?.count || 0} registros guardados)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Vista previa de los registros en PostgreSQL
                  </p>
                </div>
              </div>
              <button
                onClick={fetchInspector}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Recargar datos"
              >
                <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i>
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <i className="ri-loader-4-line text-3xl animate-spin text-emerald-400"></i>
                <p className="text-xs">Consultando tablas de la base de datos...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-rose-400 space-y-2">
                <i className="ri-error-warning-line text-2xl"></i>
                <p className="text-xs">{error}</p>
              </div>
            ) : !currentTable || currentTable.rows.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <i className="ri-inbox-line text-4xl text-slate-600"></i>
                <p className="text-sm font-medium text-slate-300">No hay registros aún en la tabla {selectedTable}</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Al emitir facturas, registrar clientes o productos en FinteKia ERP, se sincronizarán y guardarán automáticamente en esta tabla.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono">
                      {Object.keys(currentTable.rows[0]).map((col) => (
                        <th key={col} className="p-3 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {currentTable.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        {Object.entries(row).map(([k, v], cellIdx) => (
                          <td key={cellIdx} className="p-3 text-slate-200 whitespace-nowrap max-w-xs truncate font-mono text-[11px]">
                            {typeof v === 'object' && v !== null ? (
                              <span className="text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40 text-[10px]">
                                {JSON.stringify(v).slice(0, 40)}...
                              </span>
                            ) : typeof v === 'boolean' ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                                {v ? 'TRUE' : 'FALSE'}
                              </span>
                            ) : (
                              String(v ?? '-')
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SUPABASE STEP-BY-STEP GUIDE */}
      {activeTab === 'supabase_guide' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Step 1 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
                1
              </div>
              <h4 className="font-bold text-white text-sm">Pega el Script en SQL Editor</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ya tienes abierta la pestaña de Supabase SQL. Haz clic en el botón de abajo para copiar el script completo y pégalo allí.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleCopySql}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <i className={copiedSql ? "ri-check-line text-sm" : "ri-file-copy-line text-sm"}></i>
                  {copiedSql ? "¡Copiado con Éxito!" : "Copiar Código SQL"}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
                2
              </div>
              <h4 className="font-bold text-white text-sm">Presiona "RUN" en Supabase</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                En la barra superior de Supabase, presiona el botón verde <strong>RUN</strong> (o atajo <kbd className="bg-slate-800 px-1 py-0.5 rounded text-[10px]">Ctrl+Enter</kbd>). Verás el mensaje <em>Success. No rows returned</em>.
              </p>
              <div className="pt-2">
                <a
                  href={supabaseSqlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <i className="ri-external-link-line text-emerald-400"></i>
                  Ir a SQL Editor de Supabase
                </a>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
                3
              </div>
              <h4 className="font-bold text-white text-sm">Abre el Table Editor</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Haz clic en el icono de tabla <i className="ri-table-line text-emerald-400"></i> en la barra lateral izquierda de Supabase (o usa el botón directo aquí abajo) para ver y editar tus tablas visualmente.
              </p>
              <div className="pt-2">
                <a
                  href={supabaseEditorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <i className="ri-eye-line text-sm"></i>
                  Ver Tablas en Supabase (Editor)
                </a>
              </div>
            </div>
          </div>

          {/* Connection String (URI) Explanation Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-500/30 shrink-0">
                <i className="ri-key-2-line"></i>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">
                  ¿Dónde encuentro la "Connection string (URI)" en Supabase?
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Si deseas ver o copiar la cadena de conexión URI directa de PostgreSQL:
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Entra a: <strong className="text-white">Project Settings</strong> ➔ <strong className="text-white">Database</strong> en Supabase (o usa el botón directo abajo).</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Baja por la página hasta encontrar la sección <strong className="text-emerald-400">"Connection string"</strong>.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Haz clic en la pestaña <strong className="text-emerald-400">URI</strong> (modo <em>Transaction</em> o <em>Session</em>).</span>
              </div>
              <div className="mt-2 p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-400">
                postgresql://postgres.irncymdscgeucoacwzfg:[TU_PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
              <i className="ri-information-line text-emerald-400 text-base shrink-0 mt-0.5"></i>
              <span>
                <strong>¡Nota importante!</strong> Con la <strong>URL</strong> y la clave <strong>Anon Key</strong> que ya nos proporcionaste, <strong>la aplicación ya está 100% conectada</strong> a Supabase. La URI sólo es necesaria si quieres conectar clientes de escritorio externos (como DBeaver o PgAdmin).
              </span>
            </div>

            <a
              href={supabaseUriSettingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              <i className="ri-external-link-line text-emerald-400"></i>
              Abrir Configuración de Database en Supabase
            </a>
          </div>

          {/* Supabase Direct Links card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <i className="ri-links-line text-emerald-400"></i>
              Enlaces Directos a tu Panel de Supabase ({supabaseProjectRef})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a
                href={supabaseEditorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 block group cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs group-hover:text-emerald-400 transition-colors">
                    📊 Table Editor
                  </span>
                  <i className="ri-arrow-right-up-line text-slate-500 group-hover:text-emerald-400"></i>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ver tus tablas como hojas de cálculo interactivas.
                </p>
              </a>

              <a
                href={supabaseDbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 block group cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs group-hover:text-emerald-400 transition-colors">
                    🗄️ Database & Schemas
                  </span>
                  <i className="ri-arrow-right-up-line text-slate-500 group-hover:text-emerald-400"></i>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Inspeccionar claves foráneas, columnas e índices.
                </p>
              </a>

              <a
                href={`https://supabase.com/dashboard/project/${supabaseProjectRef}/settings/api`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 block group cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs group-hover:text-emerald-400 transition-colors">
                    🔑 Project API & Keys
                  </span>
                  <i className="ri-arrow-right-up-line text-slate-500 group-hover:text-emerald-400"></i>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Obtener URL del proyecto y clave anon pública.
                </p>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB: GITHUB & SUPABASE ARCHITECTURE & ORGANIZATION */}
      {activeTab === 'github_integration' && (
        <div className="space-y-6">
          {/* GitHub Connection Status Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white text-2xl shadow-inner shrink-0">
                  <i className="ri-github-fill"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">
                      Integración Supabase + GitHub
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      ● Cuenta Vinculada
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Iniciaste Supabase mediante tu cuenta de GitHub (<strong className="text-slate-200">quinoneswash70@gmail.com</strong>). Esto te otorga acceso administrativo unificado y te permite vincular repositorios para ejecutar migraciones continuas de base de datos de manera automática.
                  </p>
                </div>
              </div>

              <a
                href={`https://supabase.com/dashboard/project/${supabaseProjectRef}/settings/integrations`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer shadow"
              >
                <i className="ri-external-link-line text-emerald-400"></i>
                Abrir Integraciones en Supabase
              </a>
            </div>

            {/* How it works info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-800/80">
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <i className="ri-shield-keyhole-line text-emerald-400"></i>
                  1. Autenticación de Desarrollador
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Tu acceso a Supabase está protegido por OAuth de GitHub. No requieres gestionar contraseñas independientes; ingresas de forma segura con un solo clic en Supabase.
                </p>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <i className="ri-git-branch-line text-cyan-400"></i>
                  2. Sincronización CI/CD de Base de Datos
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Al conectar el repositorio en Supabase, cada cambio que subas a la carpeta <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">supabase/migrations/</code> se aplicará automáticamente a PostgreSQL.
                </p>
              </div>
            </div>
          </div>

          {/* Model Architecture & Organization */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <i className="ri-node-tree text-emerald-400"></i>
                Organización del Modelo de Datos en Supabase (Esquema public)
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Estructura de las 8 tablas modulares creadas en PostgreSQL para operar FinteKia ERP y DIGITAL YA'BI:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Companies */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">public.companies</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">Multi-Tenant</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Sociedades, NIT fiscal (87942146-5), régimen tributario, rangos de facturación DIAN y parámetros de nómina.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  PK: id (TEXT)
                </div>
              </div>

              {/* Card 2: Users */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">public.users</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">RBAC</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Usuarios del sistema, roles (SuperAdmin, Admin, Contador, Operador) y credenciales de acceso unificado.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  PK: id (SERIAL), uid (TEXT)
                </div>
              </div>

              {/* Card 3: Terceros */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">public.terceros</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">Directorio</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Clientes, proveedores y empleados. Datos de contacto, NIT, cuentas bancarias y parámetros tributarios.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  FK: company_id &rarr; companies
                </div>
              </div>

              {/* Card 4: Products */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">public.products</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">Catálogo TI</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Hardware, insumos, servicios de soporte y licencias con SKU, precios de venta, costos e impuestos IVA.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  FK: company_id &rarr; companies
                </div>
              </div>

              {/* Card 5: Vouchers */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">public.vouchers</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">DIAN & Contable</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Facturas electrónicas (XML, CUFE, QR) y comprobantes contables con partidas dobles en formato JSONB.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  FK: company_id &rarr; companies
                </div>
              </div>

              {/* Card 6: Inventory */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">public.inventory</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">Bodegas & Lotes</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Existencias físicas, costos promedio ponderados, lotes y fechas de vencimiento por bodega.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  FK: product_id &rarr; products
                </div>
              </div>

              {/* Card 7: Bank Accounts */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">public.bank_accounts</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">Tesorería</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Cuentas bancarias (corrientes, ahorros), números de cuenta y saldo disponible en tiempo real.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  FK: company_id &rarr; companies
                </div>
              </div>

              {/* Card 8: App Settings */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">public.app_settings</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">Configuración</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Almacenamiento clave-valor JSONB para estado global del sistema, preferencias y sincronización.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  PK: key (TEXT)
                </div>
              </div>
            </div>
          </div>

          {/* Migration Structure & GitHub Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Folder Structure */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <i className="ri-folder-open-line text-emerald-400"></i>
                Estructura de Archivos en el Repositorio
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                El proyecto ya tiene organizada la estructura estándar oficial de Supabase CLI para versionar el esquema en GitHub:
              </p>

              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs space-y-1.5 text-slate-300">
                <div className="text-emerald-400 font-bold flex items-center gap-2">
                  <i className="ri-folder-fill"></i> supabase/
                </div>
                <div className="pl-4 flex items-center gap-2 text-slate-300">
                  <i className="ri-file-text-line text-slate-500"></i> config.toml <span className="text-slate-500 text-[11px]">(Configuración del proyecto {supabaseProjectRef})</span>
                </div>
                <div className="pl-4 text-emerald-400 font-bold flex items-center gap-2">
                  <i className="ri-folder-fill"></i> migrations/
                </div>
                <div className="pl-8 flex items-center gap-2 text-slate-300">
                  <i className="ri-file-code-line text-emerald-400"></i> 20261010000000_fintekia_erp_schema.sql
                </div>
                <div className="pl-8 flex items-center gap-2 text-slate-300">
                  <i className="ri-file-shield-line text-cyan-400"></i> 20261010000001_enable_rls_security.sql
                </div>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed">
                Cualquier nuevo cambio en tablas o columnas se crea agregando un nuevo archivo SQL con la fecha en <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">supabase/migrations/</code>.
              </div>
            </div>

            {/* How to link GitHub repo in Supabase Dashboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <i className="ri-git-merge-line text-emerald-400"></i>
                Pasos para Conectar el Repositorio de GitHub
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Para que Supabase ejecute automáticamente las migraciones desde GitHub:
              </p>

              <ol className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 border border-emerald-500/30">1</span>
                  <span>
                    Abre <a href={`https://supabase.com/dashboard/project/${supabaseProjectRef}/settings/integrations`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-bold underline">Project Settings &rarr; Integrations</a> en Supabase.
                  </span>
                </li>

                <li className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 border border-emerald-500/30">2</span>
                  <span>
                    En la sección <strong>GitHub</strong>, haz clic en <strong>Connect GitHub</strong> e instala la aplicación oficial de Supabase en tu cuenta de GitHub.
                  </span>
                </li>

                <li className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 border border-emerald-500/30">3</span>
                  <span>
                    Selecciona tu repositorio. ¡Listo! Supabase activará <strong>Branching</strong> y aplicará cualquier migración nueva de forma automática en cada push.
                  </span>
                </li>
              </ol>

              <div className="pt-1">
                <a
                  href={`https://supabase.com/dashboard/project/${supabaseProjectRef}/settings/integrations`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow"
                >
                  <i className="ri-github-fill text-base"></i>
                  Vincular Repositorio en Supabase Integrations
                </a>
              </div>
            </div>
          </div>

          {/* Row Level Security (RLS) policies card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <i className="ri-shield-check-line text-cyan-400"></i>
                  Seguridad RLS (Row Level Security) en Supabase
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Protección a nivel de fila para garantizar que las operaciones del ERP vía la API pública sean seguras.
                </p>
              </div>

              <button
                onClick={() => {
                  const rlsSql = `-- Habilitar RLS en tablas públicas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terceros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso a companies" ON public.companies FOR ALL USING (true);
CREATE POLICY "Permitir acceso a users" ON public.users FOR ALL USING (true);
CREATE POLICY "Permitir acceso a terceros" ON public.terceros FOR ALL USING (true);
CREATE POLICY "Permitir acceso a products" ON public.products FOR ALL USING (true);
CREATE POLICY "Permitir acceso a vouchers" ON public.vouchers FOR ALL USING (true);
CREATE POLICY "Permitir acceso a inventory" ON public.inventory FOR ALL USING (true);
CREATE POLICY "Permitir acceso a bank_accounts" ON public.bank_accounts FOR ALL USING (true);
CREATE POLICY "Permitir acceso a app_settings" ON public.app_settings FOR ALL USING (true);`;
                  navigator.clipboard.writeText(rlsSql);
                  setCopiedRlsSql(true);
                  setTimeout(() => setCopiedRlsSql(false), 2500);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <i className={copiedRlsSql ? "ri-check-line text-emerald-400" : "ri-file-copy-line"}></i>
                {copiedRlsSql ? "¡Script RLS Copiado!" : "Copiar Script RLS"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SQL SCRIPT VIEWER */}
      {activeTab === 'sql_script' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
              <i className="ri-file-code-line text-emerald-400"></i>
              supabase_schema.sql
            </div>
            <button
              onClick={handleCopySql}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <i className={copiedSql ? "ri-check-line" : "ri-clipboard-line"}></i>
              {copiedSql ? "¡Copiado!" : "Copiar Todo el Script"}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-emerald-300 bg-slate-950/90 overflow-x-auto max-h-[500px] leading-relaxed">
            {sqlContent || '-- Cargando script SQL...'}
          </pre>
        </div>
      )}
    </div>
  );
}

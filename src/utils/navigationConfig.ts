export interface ConnectedModule {
  view: string;
  label: string;
  icon: string;
  color?: string;
}

export interface ViewMetadata {
  title: string;
  shortTitle: string;
  icon: string;
  category: 'Comercial' | 'Operaciones' | 'Financiero' | 'Configuración' | 'General';
}

export const VIEW_METADATA_MAP: Record<string, ViewMetadata> = {
  dashboard: {
    title: 'Portal Principal de Módulos',
    shortTitle: 'Portal Principal',
    icon: 'ri-layout-grid-line',
    category: 'General'
  },
  facturacion: {
    title: 'Facturación Electrónica DIAN',
    shortTitle: 'Facturación',
    icon: 'ri-file-text-line',
    category: 'Comercial'
  },
  cartera: {
    title: 'Cartera & Cobranzas (CxC)',
    shortTitle: 'Cartera CxC',
    icon: 'ri-wallet-3-line',
    category: 'Comercial'
  },
  terceros: {
    title: 'Gestión de Terceros (Clientes / Proveedores)',
    shortTitle: 'Terceros',
    icon: 'ri-team-line',
    category: 'Comercial'
  },
  compras: {
    title: 'Compras & Abastecimiento (CxP)',
    shortTitle: 'Compras CxP',
    icon: 'ri-shopping-cart-2-line',
    category: 'Operaciones'
  },
  bodegas: {
    title: 'Bodegas, Plantas & Kardex',
    shortTitle: 'Bodegas & Kardex',
    icon: 'ri-archive-line',
    category: 'Operaciones'
  },
  productos: {
    title: 'Catálogo de Artículos & Precios',
    shortTitle: 'Productos',
    icon: 'ri-price-tag-3-line',
    category: 'Operaciones'
  },
  ordenes_prod: {
    title: 'Producción Industrial (MRP)',
    shortTitle: 'Producción OP',
    icon: 'ri-tools-fill',
    category: 'Operaciones'
  },
  mrp: {
    title: 'Planificación de Materiales (MRP)',
    shortTitle: 'Planificación MRP',
    icon: 'ri-cpu-line',
    category: 'Operaciones'
  },
  calidad: {
    title: 'Control de Calidad de Lotes',
    shortTitle: 'Calidad',
    icon: 'ri-shield-check-line',
    category: 'Operaciones'
  },
  servicios_tech: {
    title: 'Servicios Técnicos TI & Garantías',
    shortTitle: 'Servicios TI',
    icon: 'ri-computer-line',
    category: 'Operaciones'
  },
  comprobantes: {
    title: 'Contabilidad Integral & Libro Diario PUC',
    shortTitle: 'Contabilidad PUC',
    icon: 'ri-booklet-line',
    category: 'Financiero'
  },
  cierre_periodos: {
    title: 'Cierre & Bloqueo de Periodos Fiscales',
    shortTitle: 'Cierre Fiscal',
    icon: 'ri-lock-2-line',
    category: 'Financiero'
  },
  bancos: {
    title: 'Bancos, Cuentas & Tesorería',
    shortTitle: 'Bancos & Tesorería',
    icon: 'ri-bank-line',
    category: 'Financiero'
  },
  impuestos: {
    title: 'Liquidación de Impuestos (IVA / Retenciones)',
    shortTitle: 'Impuestos DIAN',
    icon: 'ri-percent-line',
    category: 'Financiero'
  },
  presupuestos: {
    title: 'Presupuestos & Centros de Costos',
    shortTitle: 'Presupuestos',
    icon: 'ri-funds-line',
    category: 'Financiero'
  },
  nomina: {
    title: 'Nómina Electrónica & Recursos Humanos',
    shortTitle: 'Nómina',
    icon: 'ri-user-shared-line',
    category: 'Financiero'
  },
  ai_advisor: {
    title: 'Asesor Contable & Financiero',
    shortTitle: 'Asesor IA',
    icon: 'ri-sparkling-fill',
    category: 'General'
  },
  empresa: {
    title: 'Configuración de Empresa & Giros',
    shortTitle: 'Empresa',
    icon: 'ri-building-line',
    category: 'Configuración'
  },
  alanube_config: {
    title: 'Configuración DIAN & Proveedor Alanube',
    shortTitle: 'Alanube DIAN',
    icon: 'ri-cloud-line',
    category: 'Configuración'
  },
  usuarios: {
    title: 'Gestión de Usuarios & Roles de Acceso',
    shortTitle: 'Usuarios & Roles',
    icon: 'ri-shield-user-line',
    category: 'Configuración'
  },
  seguridad: {
    title: 'Seguridad, Respaldos & Auditoría',
    shortTitle: 'Respaldos & Seguridad',
    icon: 'ri-shield-flash-line',
    category: 'Configuración'
  },
  database: {
    title: 'Consola Base de Datos Cloud SQL',
    shortTitle: 'Base de Datos',
    icon: 'ri-database-2-line',
    category: 'Configuración'
  }
};

export const CONNECTED_MODULES_MAP: Record<string, ConnectedModule[]> = {
  facturacion: [
    { view: 'cartera', label: 'Cartera (CxC)', icon: 'ri-wallet-3-line', color: 'emerald' },
    { view: 'productos', label: 'Catálogo Artículos', icon: 'ri-price-tag-3-line', color: 'blue' },
    { view: 'bodegas', label: 'Bodegas & Stock', icon: 'ri-archive-line', color: 'amber' },
    { view: 'terceros', label: 'Clientes (Terceros)', icon: 'ri-user-star-line', color: 'indigo' },
    { view: 'alanube_config', label: 'Alanube DIAN', icon: 'ri-cloud-line', color: 'cyan' },
  ],
  cartera: [
    { view: 'facturacion', label: 'Emitir Factura FE', icon: 'ri-file-text-line', color: 'indigo' },
    { view: 'bancos', label: 'Bancos & Recaudos', icon: 'ri-bank-line', color: 'emerald' },
    { view: 'terceros', label: 'Fichas de Clientes', icon: 'ri-user-star-line', color: 'blue' },
    { view: 'comprobantes', label: 'Recibos de Caja', icon: 'ri-booklet-line', color: 'purple' },
  ],
  compras: [
    { view: 'bodegas', label: 'Bodegas & Kardex', icon: 'ri-archive-line', color: 'amber' },
    { view: 'terceros', label: 'Proveedores', icon: 'ri-truck-line', color: 'indigo' },
    { view: 'productos', label: 'Catálogo Insumos', icon: 'ri-price-tag-3-line', color: 'blue' },
    { view: 'comprobantes', label: 'Asientos Contables', icon: 'ri-booklet-line', color: 'purple' },
  ],
  bodegas: [
    { view: 'productos', label: 'Catálogo Artículos', icon: 'ri-price-tag-3-line', color: 'blue' },
    { view: 'compras', label: 'Registrar Compra', icon: 'ri-shopping-cart-2-line', color: 'emerald' },
    { view: 'ordenes_prod', label: 'Producción MRP', icon: 'ri-tools-line', color: 'amber' },
    { view: 'facturacion', label: 'Facturación / Salidas', icon: 'ri-file-text-line', color: 'indigo' },
  ],
  productos: [
    { view: 'bodegas', label: 'Existencias & Bodegas', icon: 'ri-archive-line', color: 'amber' },
    { view: 'facturacion', label: 'Facturar Productos', icon: 'ri-file-text-line', color: 'indigo' },
    { view: 'compras', label: 'Abastecimiento', icon: 'ri-shopping-cart-line', color: 'emerald' },
    { view: 'ordenes_prod', label: 'Recetas / Fórmulas', icon: 'ri-flask-line', color: 'purple' },
  ],
  comprobantes: [
    { view: 'bancos', label: 'Bancos & Tesorería', icon: 'ri-bank-line', color: 'emerald' },
    { view: 'impuestos', label: 'Impuestos (IVA / Retención)', icon: 'ri-percent-line', color: 'amber' },
    { view: 'cierre_periodos', label: 'Cierre de Periodos', icon: 'ri-lock-2-line', color: 'rose' },
    { view: 'cartera', label: 'Cartera Clientes', icon: 'ri-wallet-3-line', color: 'blue' },
  ],
  cierre_periodos: [
    { view: 'comprobantes', label: 'Libro Diario & Asientos', icon: 'ri-booklet-line', color: 'purple' },
    { view: 'impuestos', label: 'Liquidación Impuestos', icon: 'ri-percent-line', color: 'amber' },
    { view: 'bancos', label: 'Conciliación Bancaria', icon: 'ri-bank-line', color: 'emerald' },
  ],
  bancos: [
    { view: 'comprobantes', label: 'Comprobantes Contables', icon: 'ri-booklet-line', color: 'purple' },
    { view: 'cartera', label: 'Cobranza / Recaudos', icon: 'ri-wallet-3-line', color: 'blue' },
    { view: 'nomina', label: 'Dispersión de Nómina', icon: 'ri-user-shared-line', color: 'indigo' },
  ],
  terceros: [
    { view: 'facturacion', label: 'Facturar a Cliente', icon: 'ri-file-text-line', color: 'indigo' },
    { view: 'compras', label: 'Comprar a Proveedor', icon: 'ri-shopping-cart-line', color: 'emerald' },
    { view: 'cartera', label: 'Estado de Cuenta / Cartera', icon: 'ri-wallet-3-line', color: 'blue' },
  ],
  ordenes_prod: [
    { view: 'bodegas', label: 'Bodegas / Materias Primas', icon: 'ri-archive-line', color: 'amber' },
    { view: 'productos', label: 'Catálogo & Costos', icon: 'ri-price-tag-3-line', color: 'blue' },
    { view: 'calidad', label: 'Inspección de Calidad', icon: 'ri-shield-check-line', color: 'emerald' },
    { view: 'mrp', label: 'Explosión de Materiales', icon: 'ri-cpu-line', color: 'purple' },
  ],
  mrp: [
    { view: 'ordenes_prod', label: 'Órdenes de Producción', icon: 'ri-tools-line', color: 'amber' },
    { view: 'bodegas', label: 'Inventario Disponible', icon: 'ri-archive-line', color: 'blue' },
    { view: 'compras', label: 'Generar Requisición Compra', icon: 'ri-shopping-cart-line', color: 'emerald' },
  ],
  calidad: [
    { view: 'ordenes_prod', label: 'Órdenes de Producción', icon: 'ri-tools-line', color: 'amber' },
    { view: 'bodegas', label: 'Bodega Producto Terminado', icon: 'ri-archive-line', color: 'blue' },
  ],
  servicios_tech: [
    { view: 'facturacion', label: 'Facturar Servicio Técnico', icon: 'ri-file-text-line', color: 'indigo' },
    { view: 'bodegas', label: 'Repuestos & Accesorios', icon: 'ri-archive-line', color: 'amber' },
    { view: 'terceros', label: 'Clientes de Servicio', icon: 'ri-user-star-line', color: 'blue' },
  ],
  nomina: [
    { view: 'bancos', label: 'Cuentas & Dispersión', icon: 'ri-bank-line', color: 'emerald' },
    { view: 'comprobantes', label: 'Causación Contable', icon: 'ri-booklet-line', color: 'purple' },
    { view: 'terceros', label: 'Colaboradores / Empleados', icon: 'ri-team-line', color: 'blue' },
  ],
  impuestos: [
    { view: 'comprobantes', label: 'Libros Contables', icon: 'ri-booklet-line', color: 'purple' },
    { view: 'cierre_periodos', label: 'Cierre Fiscal', icon: 'ri-lock-2-line', color: 'rose' },
    { view: 'facturacion', label: 'Facturación / IVA', icon: 'ri-file-text-line', color: 'indigo' },
  ],
  presupuestos: [
    { view: 'comprobantes', label: 'Comprobantes Ejecutados', icon: 'ri-booklet-line', color: 'purple' },
    { view: 'compras', label: 'Gastos & Compras', icon: 'ri-shopping-cart-line', color: 'emerald' },
  ],
  alanube_config: [
    { view: 'facturacion', label: 'Ir a Facturación Electrónica', icon: 'ri-file-text-line', color: 'indigo' },
    { view: 'empresa', label: 'Datos Fiscales Empresa', icon: 'ri-building-line', color: 'blue' },
  ],
  empresa: [
    { view: 'alanube_config', label: 'Configuración DIAN Alanube', icon: 'ri-cloud-line', color: 'cyan' },
    { view: 'usuarios', label: 'Usuarios y Permisos', icon: 'ri-team-line', color: 'purple' },
    { view: 'seguridad', label: 'Respaldos de Datos', icon: 'ri-shield-flash-line', color: 'emerald' },
  ],
  usuarios: [
    { view: 'empresa', label: 'Empresas & Sucursales', icon: 'ri-building-line', color: 'blue' },
    { view: 'seguridad', label: 'Auditoría & Respaldos', icon: 'ri-shield-keyhole-line', color: 'emerald' },
  ],
  seguridad: [
    { view: 'database', label: 'Consola Base de Datos', icon: 'ri-database-2-line', color: 'cyan' },
    { view: 'usuarios', label: 'Usuarios & Auditoría', icon: 'ri-team-line', color: 'purple' },
  ],
  database: [
    { view: 'seguridad', label: 'Copias de Seguridad', icon: 'ri-shield-flash-line', color: 'emerald' },
    { view: 'empresa', label: 'Datos de Empresa', icon: 'ri-building-line', color: 'blue' },
  ]
};

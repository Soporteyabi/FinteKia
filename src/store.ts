import { AppState, Company, Tercero, Product, InventoryItem, InventoryMovement, Warehouse, Asset, PucAccount, CostCenter, Voucher, BankAccount, BankTransaction, BOM, ProductionOrder, QualityInspection, PackagingLog, PayrollLog, Budget, TechServiceOrder } from './types';

// Initial default Colombian PUC Accounts
export const DEFAULT_PUC: PucAccount[] = [
  { code: '110505', name: 'Caja General', nature: 'debito', type: 'activo' },
  { code: '111005', name: 'Bancos - Cuenta Corriente Nal.', nature: 'debito', type: 'activo' },
  { code: '130505', name: 'Clientes Nacionales', nature: 'debito', type: 'activo' },
  { code: '140501', name: 'Inventario de Materias Primas', nature: 'debito', type: 'activo' },
  { code: '143501', name: 'Inventario de Productos Terminados', nature: 'debito', type: 'activo' },
  { code: '220505', name: 'Proveedores Nacionales', nature: 'credito', type: 'pasivo' },
  { code: '236540', name: 'Retención en la Fuente - Compras 2.5%', nature: 'credito', type: 'pasivo' },
  { code: '240805', name: 'Impuesto sobre las Ventas por Pagar (IVA 19%)', nature: 'credito', type: 'pasivo' },
  { code: '311505', name: 'Aportes Sociales', nature: 'credito', type: 'patrimonio' },
  { code: '413501', name: 'Ventas de Productos de Panadería', nature: 'credito', type: 'ingreso' },
  { code: '510506', name: 'Gastos de Personal - Sueldos', nature: 'debito', type: 'gasto' },
  { code: '510527', name: 'Gastos - Auxilio de Transporte', nature: 'debito', type: 'gasto' },
  { code: '513505', name: 'Gastos - Servicios Públicos', nature: 'debito', type: 'gasto' },
  { code: '613501', name: 'Costo de Ventas', nature: 'debito', type: 'costo' },
];

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'co-1',
    name: 'FinteKia Tech & Solutions S.A.S.',
    nit: '901.455.120-3',
    slogan: 'Tecnología, Hardware, Servicios TI & Facturación Electrónica',
    address: 'Cl. 93 # 12-40 Of. 501, Bogotá D.C.',
    regimen: 'responsable',
    currency: 'COP',
    period: 2026,
    businessType: 'tecnologia_servicios',
    enableProduction: false, // Production module starts DEACTIVATED by default for the tech enterprise!
    enableTechServices: true,
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%232563eb"/><stop offset="100%" stop-color="%234f46e5"/></linearGradient></defs><rect width="200" height="200" rx="44" fill="url(%23g1)"/><path d="M60 55 L140 55 L140 80 L95 80 L95 95 L130 95 L130 120 L95 120 L95 145 L60 145 Z" fill="%23ffffff"/><circle cx="150" cy="140" r="14" fill="%2338bdf8"/></svg>',
    billingConfig: {
      providerType: 'tercero_proveedor',
      providerName: 'Alanube',
      providerNit: '901.464.305-6',
      clientId: 'ala_cli_live_98a72b4c8102',
      clientSecret: 'ala_sec_f9823be800e2194ad9b3c4f',
      apiEndpoint: 'https://api.alanube.co/dian/v1/invoices',
      apiToken: 'ala_live_sec_98f7e2a4d3_auth_key',
      environment: 'produccion',
      prefix: 'FE',
      resolutionNumber: '187640000099',
      resolutionDate: '2026-01-15',
      authorizedRangeFrom: 101,
      authorizedRangeTo: 10000,
      technicalKey: 'ala8eac822301a1d2e1f4b',
      softwareId: '6b2d189f-299f-4318-8f81-591741ac4e82',
      pin: '75421',
      testSetId: '',
      autoSendEmail: true,
      lastTestStatus: 'success',
      lastTestTimestamp: '2026-03-28T14:32:00Z',
      lastTestMessage: 'Conexión DIAN validada exitosamente vía Alanube Cloud API. Certificado y folios activos.',
      availableCredits: 4850
    },
    invoiceDesign: {
      logoPosition: 'left',
      logoSize: 'md',
      logoStyle: 'rounded',
      accentColor: '#2563eb',
      showSlogan: true,
      showResolutionBox: true,
      showBankAccounts: true,
      bankAccountDetails: 'Bancolombia Cta Corriente No. 245-098712-88 (NIT 901.455.120-3)',
      termsAndNotes: 'Esta factura de venta se asimila en sus efectos legales a una letra de cambio según la Ley 1231 de 2008. Autorizo el tratamiento de datos personales para fines contables y comerciales.'
    },
    payrollParameters: { smmlv: 1423500, auxTransporte: 172000 },
  },
  {
    id: 'co-2',
    name: 'Alimentos del Norte Limitada',
    nit: '800.224.990-1',
    slogan: 'Manufactura Industrial de Harinas y Panificación (MRP)',
    address: 'Av. Cero # 85-30, Cúcuta',
    regimen: 'simple',
    currency: 'COP',
    period: 2026,
    businessType: 'produccion',
    enableProduction: true, // Production module activated for manufacturing
    enableTechServices: false,
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23d97706"/><stop offset="100%" stop-color="%23b45309"/></linearGradient></defs><rect width="200" height="200" rx="44" fill="url(%23g2)"/><path d="M100 40 C75 70 70 110 100 150 C130 110 125 70 100 40 Z" fill="%23fef3c7"/><path d="M100 65 C85 85 85 110 100 135 C115 110 115 85 100 65 Z" fill="%23d97706"/><circle cx="100" cy="98" r="8" fill="%23fef3c7"/></svg>',
    billingConfig: {
      providerType: 'tercero_proveedor',
      providerName: 'Factus',
      providerNit: '901.324.558-1',
      environment: 'produccion',
      prefix: 'FE',
      resolutionNumber: '1876000021',
      resolutionDate: '2026-01-01',
      authorizedRangeFrom: 1,
      authorizedRangeTo: 5000,
      autoSendEmail: true
    },
    invoiceDesign: {
      logoPosition: 'banner',
      logoSize: 'md',
      logoStyle: 'rounded',
      accentColor: '#d97706',
      showSlogan: true,
      showResolutionBox: true,
      showBankAccounts: true,
      bankAccountDetails: 'Banco de Bogotá Cta Ahorros No. 034-771290-12 (NIT 800.224.990-1)',
      termsAndNotes: 'Esta factura de venta se asimila en sus efectos legales a una letra de cambio según la Ley 1231 de 2008. Alimentos del Norte Ltda.'
    },
    payrollParameters: { smmlv: 1423500, auxTransporte: 172000 },
  }
];

export const INITIAL_TERCEROS: Tercero[] = [
  {
    id: 'ter-1',
    name: 'Harineras del Valle S.A.',
    nit: '890.300.412-5',
    type: 'juridica',
    roles: ['proveedor'],
    city: 'Cali',
    address: 'Vía Panorama Km 2',
    phone: '3157001222',
    email: 'contacto@harineras.com',
    regimen: 'responsable',
    companyId: 'co-2'
  },
  {
    id: 'ter-2',
    name: 'Supermercados Éxito S.A.',
    nit: '890.900.608-9',
    type: 'juridica',
    roles: ['cliente'],
    city: 'Bogotá',
    address: 'Cra 48 # 32-10',
    phone: '6013445000',
    email: 'facturacion@exito.com.co',
    regimen: 'responsable',
    companyId: 'co-1'
  },
  {
    id: 'ter-3',
    name: 'Carlos Mario Ruiz',
    nit: '1.020.455.789',
    type: 'natural',
    roles: ['empleado'],
    city: 'Bogotá',
    address: 'Cl. 80 # 24-12 Apt 201',
    phone: '3104558830',
    email: 'carlos.mario@outlook.com',
    employeeCargo: 'Panadero Jefe de Turno',
    employeeSalary: 1800000,
    employeeEmergencyContact: 'Nohora Salazar (Esposa) 3125004030',
    companyId: 'co-2'
  },
  {
    id: 'ter-4',
    name: 'Distribuidora Granel Co',
    nit: '900.122.333-8',
    type: 'juridica',
    roles: ['proveedor', 'cliente'],
    city: 'Medellín',
    address: 'Cl. 10 Sur # 50-20',
    phone: '3203004050',
    email: 'ventas@granelco.com',
    regimen: 'responsable',
    companyId: 'co-1'
  },
  {
    id: 'ter-5',
    name: 'Diana Patricia Gomez',
    nit: '52.448.990',
    type: 'natural',
    roles: ['empleado'],
    city: 'Bogotá',
    address: 'Tv. 50 # 12-45',
    phone: '3146002010',
    email: 'diana.gomez@fintekia.com',
    employeeCargo: 'Auxiliar Operario de Empaque',
    employeeSalary: 1423500, // 1 SMMLV
    employeeEmergencyContact: 'Alberto Gomez (Padre) 3004005060',
    companyId: 'co-1'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  // Tecnología & Hardware (FinteKia co-1)
  { id: 'p-t1', name: 'Laptop Corporativo Lenovo ThinkPad T14 Core i7 16GB SSD 512GB', sku: 'TECH-LAP-T14', barcode: '7709001000012', cost: 2450000, price: 3450000, tax: 19, type: 'tecnologia', lotTracking: false, brand: 'Lenovo', model: 'ThinkPad T14 Gen 3', warrantyMonths: 12, minStock: 3, category: 'Laptops & Cómputo', unitOfMeasure: 'UND', companyId: 'co-1' },
  { id: 'p-t2', name: 'Router Gigabit Wi-Fi 6 Mikrotik hEX S Dual-Band RouterBOARD', sku: 'TECH-ROU-MIK', barcode: '7709001000029', cost: 195000, price: 295000, tax: 19, type: 'tecnologia', lotTracking: false, brand: 'MikroTik', model: 'hEX S', warrantyMonths: 12, minStock: 5, category: 'Redes & Conectividad', unitOfMeasure: 'UND', companyId: 'co-1' },
  { id: 'p-t3', name: 'Disco Estado Sólido SSD NVMe 1TB Kingston KC3000 PCIe 4.0', sku: 'TECH-SSD-1TB', barcode: '7709001000036', cost: 230000, price: 360000, tax: 19, type: 'tecnologia', lotTracking: false, brand: 'Kingston', model: 'KC3000', warrantyMonths: 24, minStock: 6, category: 'Almacenamiento & Repuestos', unitOfMeasure: 'UND', companyId: 'co-1' },
  { id: 'p-t4', name: 'Monitor Profesional Dell 27" UltraSharp IPS FHD HDMI/DP', sku: 'TECH-MON-27', barcode: '7709001000043', cost: 580000, price: 840000, tax: 19, type: 'tecnologia', lotTracking: false, brand: 'Dell', model: 'P2722H', warrantyMonths: 36, minStock: 2, category: 'Monitores & Pantallas', unitOfMeasure: 'UND', companyId: 'co-1' },
  { id: 'p-t5', name: 'Memoria RAM DDR4 16GB 3200MHz Corsair Vengeance para Laptop', sku: 'TECH-RAM-16', barcode: '7709001000050', cost: 110000, price: 175000, tax: 19, type: 'tecnologia', lotTracking: false, brand: 'Corsair', model: 'Vengeance SO-DIMM', warrantyMonths: 12, minStock: 5, category: 'Memorias & Repuestos', unitOfMeasure: 'UND', companyId: 'co-1' },
  // Servicios Profesionales & Soporte TI (FinteKia co-1)
  { id: 'p-s1', name: 'Servicio de Mantenimiento Preventivo y Limpieza de Cómputo', sku: 'SRV-MANT-PC', barcode: '7709002000019', cost: 0, price: 120000, tax: 19, type: 'servicio', lotTracking: false, warrantyMonths: 3, category: 'Servicios TI', unitOfMeasure: 'SRV', companyId: 'co-1' },
  { id: 'p-s2', name: 'Diagnóstico, Reparación y Actualización de Hardware (Por Equipo)', sku: 'SRV-REP-HW', barcode: '7709002000026', cost: 0, price: 160000, tax: 19, type: 'servicio', lotTracking: false, warrantyMonths: 3, category: 'Servicios TI', unitOfMeasure: 'SRV', companyId: 'co-1' },
  { id: 'p-s3', name: 'Instalación y Configuración de Redes Wi-Fi / Cableado Estructurado (Punto)', sku: 'SRV-RED-PT', barcode: '7709002000033', cost: 0, price: 95000, tax: 19, type: 'servicio', lotTracking: false, warrantyMonths: 6, category: 'Servicios TI', unitOfMeasure: 'SRV', companyId: 'co-1' },
  { id: 'p-s4', name: 'Póliza Mensual de Soporte Técnico Remoto y Presencial para Empresas', sku: 'SRV-POL-SOP', barcode: '7709002000040', cost: 0, price: 850000, tax: 19, type: 'servicio', lotTracking: false, category: 'Pólizas & Contratos', unitOfMeasure: 'MES', companyId: 'co-1' },
  { id: 'p-s5', name: 'Licencia Anual y Parametrización Software Contable FinteKia Cloud', sku: 'SRV-LIC-FIN', barcode: '7709002000057', cost: 0, price: 680000, tax: 19, type: 'servicio', lotTracking: false, category: 'Software & Licencias', unitOfMeasure: 'LIC', companyId: 'co-1' },
  // Materias Primas & Panadería (Alimentos del Norte co-2)
  { id: 'p-1', name: 'Harina de Trigo Industrial (Kg)', sku: 'MP-HAR-01', barcode: '7701001000018', cost: 3200, price: 0, tax: 0, type: 'materia_prima', lotTracking: true, minStock: 100, category: 'Materias Primas', unitOfMeasure: 'KG', companyId: 'co-2' },
  { id: 'p-2', name: 'Azúcar Blanca Refinada (Kg)', sku: 'MP-AZU-01', barcode: '7701001000025', cost: 2800, price: 0, tax: 0, type: 'materia_prima', lotTracking: true, minStock: 80, category: 'Materias Primas', unitOfMeasure: 'KG', companyId: 'co-2' },
  { id: 'p-3', name: 'Mantequilla Premium (Kg)', sku: 'MP-MAN-01', barcode: '7701001000032', cost: 12000, price: 0, tax: 19, type: 'materia_prima', lotTracking: true, minStock: 25, category: 'Materias Primas', unitOfMeasure: 'KG', companyId: 'co-2' },
  { id: 'p-4', name: 'Esencia de Vainilla (L/Botella)', sku: 'MP-VAI-01', barcode: '7701001000049', cost: 15000, price: 0, tax: 0, type: 'materia_prima', lotTracking: false, minStock: 5, category: 'Insumos Líquidos', unitOfMeasure: 'L', companyId: 'co-2' },
  { id: 'p-5', name: 'Cajas de Cartón Galletas (Unidades)', sku: 'MP-CAJ-01', barcode: '7701001000056', cost: 450, price: 0, tax: 19, type: 'materia_prima', lotTracking: false, minStock: 200, category: 'Empaques', unitOfMeasure: 'UND', companyId: 'co-2' },
  // Productos Terminados (Alimentos del Norte co-2)
  { id: 'p-6', name: 'Caja Galletas de Vainilla x 12', sku: 'PT-GAL-VAI', barcode: '7702001000062', cost: 6500, price: 16500, tax: 19, type: 'terminado', lotTracking: true, shelfLifeDays: 90, minStock: 30, category: 'Productos Terminados', unitOfMeasure: 'CAJA', companyId: 'co-2' },
  { id: 'p-7', name: 'Pan de Avena Familiar 500g', sku: 'PT-PAN-AVE', barcode: '7702001000079', cost: 3200, price: 7800, tax: 5, type: 'terminado', lotTracking: true, shelfLifeDays: 12, minStock: 15, category: 'Productos Terminados', unitOfMeasure: 'UND', companyId: 'co-2' }
];

export const INITIAL_TECH_ORDERS: TechServiceOrder[] = [
  {
    id: 'ot-1',
    code: 'OT-101',
    clientId: 'ter-2',
    clientName: 'Supermercados Éxito S.A.',
    clientPhone: '3104567890',
    clientEmail: 'soporte.ti@exito.com',
    device: 'Laptop Lenovo ThinkPad T14 Gen 3 (Core i7 / 16GB)',
    brand: 'Lenovo',
    model: 'ThinkPad T14 Gen 3',
    serial: 'PF-28XYZ90',
    accessoriesReceived: 'Cargador original USB-C 65W y estuche protector negro.',
    physicalCondition: 'Buen estado general. Pequeño desgaste estético en esquina inferior izquierda.',
    devicePassword: 'PIN: 4820 (Usuario Admin)',
    reportedIssue: 'Recalentamiento severo y apagados intermitentes. Solicita mantenimiento preventivo y ampliación a SSD 1TB.',
    diagnosis: 'Pasta térmica degradada y ventilador bloqueado con polvo. Requiere cambio de pasta térmica e instalación de SSD NVMe.',
    solutionApplied: 'Mantenimiento térmico profundo con pasta Arctic MX-4, limpieza por ultrasonido e instalación de SSD Kingston 1TB NVMe.',
    status: 'en_proceso',
    priority: 'alta',
    estimatedCost: 280000,
    laborCost: 120000,
    partsUsed: [
      { id: 'part-1', name: 'SSD NVMe M.2 Kingston 1TB PCIe 4.0', quantity: 1, unitPrice: 220000 },
      { id: 'part-2', name: 'Pasta Térmica Arctic MX-4 (Dosis)', quantity: 1, unitPrice: 25000 }
    ],
    finalCost: 365000,
    warrantyDays: 90,
    createdAt: '2026-10-02',
    deliveryDate: '2026-10-08',
    technician: 'Washington Quiñones',
    receivedBy: 'Washington Quiñones',
    notes: 'Cliente requiere copia de seguridad previa de documentos.',
    timeline: [
      { date: '2026-10-02 09:30', status: 'Recibido', note: 'Equipo recibido en mostrador con cargador.', user: 'Washington Quiñones' },
      { date: '2026-10-02 14:15', status: 'En Diagnóstico', note: 'Pruebas térmicas alcanzaron 94°C. Ventilador obstruido.', user: 'Washington Quiñones' },
      { date: '2026-10-03 10:00', status: 'En Proceso', note: 'Presupuesto aprobado por cliente vía WhatsApp. Procediendo al cambio de SSD y pasta térmica.', user: 'Washington Quiñones' }
    ],
    companyId: 'co-1'
  },
  {
    id: 'ot-2',
    code: 'OT-102',
    clientId: 'ter-4',
    clientName: 'Distribuidora Granel Co',
    clientPhone: '3187654321',
    clientEmail: 'sistemas@granelco.com.co',
    device: 'Servidor Torre Dell PowerEdge T150 Xeon 32GB RAM',
    brand: 'Dell',
    model: 'PowerEdge T150',
    serial: 'SVC-TAG-88J20',
    accessoriesReceived: 'Cable de poder trifásico blindado, llaves de chasis frontal.',
    physicalCondition: 'Excelente estado cosmético. Sin golpes.',
    devicePassword: 'iDRAC root / Servidor sin clave de BIOS',
    reportedIssue: 'Configuración de arreglo RAID 1, servidor VPN corporativo y sistema de copias de seguridad en nube.',
    diagnosis: 'Controlador PERC sin inicializar. Requiere aprovisionamiento de 2 discos SAS de 4TB en espejo y parametrización de OpenVPN.',
    solutionApplied: 'Inicialización de RAID 1, instalación y configuración de Ubuntu Server 24.04 LTS, OpenVPN con certificados SSL y script de sincronización a bucket Cloud.',
    status: 'completado',
    priority: 'urgente',
    estimatedCost: 650000,
    laborCost: 450000,
    partsUsed: [
      { id: 'part-3', name: 'Disco Servidor SAS 4TB Seagate Enterprise 7200RPM', quantity: 2, unitPrice: 380000 }
    ],
    finalCost: 1210000,
    warrantyDays: 180,
    createdAt: '2026-09-28',
    deliveryDate: '2026-10-05',
    technician: 'Washington Quiñones',
    receivedBy: 'Washington Quiñones',
    notes: 'Servicio entregado a entera satisfacción y firmado.',
    timeline: [
      { date: '2026-09-28 08:00', status: 'Recibido', note: 'Servidor recibido para puesta en marcha.', user: 'Washington Quiñones' },
      { date: '2026-09-29 11:30', status: 'En Proceso', note: 'Discos instalados y RAID 1 sincronizado al 100%.', user: 'Washington Quiñones' },
      { date: '2026-10-01 16:40', status: 'Listo para Entrega', note: 'Pruebas de contingencia y failover validadas con éxito.', user: 'Washington Quiñones' }
    ],
    companyId: 'co-1'
  },
  {
    id: 'ot-3',
    code: 'OT-103',
    clientId: 'ter-1',
    clientName: 'Harineras del Valle S.A.',
    clientPhone: '3159988776',
    clientEmail: 'infraestructura@harineras.com',
    device: 'Infraestructura de Red Wi-Fi 6 (3 Access Points UniFi U6 Pro)',
    brand: 'Ubiquiti / UniFi',
    model: 'U6 Pro',
    serial: 'NET-U6-0922',
    accessoriesReceived: '3 Fuentes PoE Gigabit 48V, soportes de techo metálicos.',
    physicalCondition: 'Equipos con rastros de polvo industrial.',
    reportedIssue: 'Baja cobertura y caídas de señal en áreas de bodega y despachos. Requiere certificación y balanceo.',
    diagnosis: 'Interferencia electromagnética en 2.4GHz y cableado defectuoso. Se cotiza recableado a Cat6A y segmentación de VLAN.',
    status: 'en_diagnostico',
    priority: 'media',
    estimatedCost: 450000,
    laborCost: 350000,
    partsUsed: [
      { id: 'part-4', name: 'Bobina Cable UTP Cat6A Panduit LSZH (Metros)', quantity: 120, unitPrice: 2800 }
    ],
    finalCost: 686000,
    warrantyDays: 60,
    createdAt: '2026-10-04',
    technician: 'Andrés Felipe Gómez',
    receivedBy: 'Andrés Felipe Gómez',
    notes: 'Esperando confirmación de presupuesto por gerencia.',
    timeline: [
      { date: '2026-10-04 10:15', status: 'Recibido', note: 'Equipos y fuentes ingresados para test de laboratorio.', user: 'Andrés Felipe Gómez' },
      { date: '2026-10-05 09:00', status: 'En Diagnóstico', note: 'Mediciones de atenuación y pérdida de paquetes realizadas.', user: 'Andrés Felipe Gómez' }
    ],
    companyId: 'co-1'
  }
];

export const INITIAL_BOMS: BOM[] = [
  {
    id: 'bom-1',
    finishedProductId: 'p-6', // Galletas de Vainilla
    version: 'V1.2',
    items: [
      { id: 'bi-1', productId: 'p-1', quantity: 0.4 },  // 0.4 Kg harina
      { id: 'bi-2', productId: 'p-2', quantity: 0.15 }, // 0.15 Kg azúcar
      { id: 'bi-3', productId: 'p-3', quantity: 0.1 },  // 0.1 Kg mantequilla
      { id: 'bi-4', productId: 'p-4', quantity: 0.015 }, // 0.015 L vainilla
      { id: 'bi-5', productId: 'p-5', quantity: 1 }      // 1 caja de empaque
    ],
    standards: { param: 'Humedad final del horneado', target: 4.5, tolerance: 0.5 }
  },
  {
    id: 'bom-2',
    finishedProductId: 'p-7', // Pan de Avena
    version: 'V1.0',
    items: [
      { id: 'bi-6', productId: 'p-1', quantity: 0.35 },
      { id: 'bi-7', productId: 'p-2', quantity: 0.05 },
      { id: 'bi-8', productId: 'p-3', quantity: 0.04 }
    ],
    standards: { param: 'Temperatura interna de miga', target: 92, tolerance: 2 }
  }
];

export const INITIAL_WAREHOUSES: Warehouse[] = [
  { id: 'wh-1', name: 'Bodega de Materia Prima', address: 'Almacén 1, Planta Central Bogotá', companyId: 'co-2' },
  { id: 'wh-2', name: 'Bodega de Despachos y Terminados', address: 'Dique de Despachos, Planta Bogotá', companyId: 'co-2' },
  { id: 'wh-3', name: 'Bodega Principal de Hardware & Equipos', address: 'Sede Principal Norte, Bogotá D.C.', companyId: 'co-1' },
  { id: 'wh-4', name: 'Bodega de Repuestos & Taller TI', address: 'Laboratorio de Soporte, Bogotá D.C.', companyId: 'co-1' }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  // Hardware y Tecnología en Bodegas (co-1)
  { id: 'inv-item-t1', productId: 'p-t1', lotNumber: 'SN-LN-2026-A1', warehouseId: 'wh-3', quantity: 8, avgCost: 2450000, companyId: 'co-1' },
  { id: 'inv-item-t2', productId: 'p-t2', lotNumber: 'SN-MK-2026-B4', warehouseId: 'wh-3', quantity: 14, avgCost: 195000, companyId: 'co-1' },
  { id: 'inv-item-t3', productId: 'p-t3', lotNumber: 'LOT-SSD-KC30', warehouseId: 'wh-4', quantity: 22, avgCost: 230000, companyId: 'co-1' },
  { id: 'inv-item-t4', productId: 'p-t4', lotNumber: 'SN-DL-MON-09', warehouseId: 'wh-3', quantity: 6, avgCost: 580000, companyId: 'co-1' },
  { id: 'inv-item-t5', productId: 'p-t5', lotNumber: 'LOT-RAM-COR16', warehouseId: 'wh-4', quantity: 18, avgCost: 110000, companyId: 'co-1' },
  // Materias primas y alimentos (co-2)
  { id: 'inv-item-1', productId: 'p-1', lotNumber: 'L-HARI-005', expirationDate: '2026-11-30', warehouseId: 'wh-1', quantity: 550, avgCost: 3200, companyId: 'co-2' },
  { id: 'inv-item-2', productId: 'p-2', lotNumber: 'L-AZUC-012', expirationDate: '2027-04-15', warehouseId: 'wh-1', quantity: 300, avgCost: 2800, companyId: 'co-2' },
  { id: 'inv-item-3', productId: 'p-3', lotNumber: 'L-MANT-990', expirationDate: '2026-08-30', warehouseId: 'wh-1', quantity: 120, avgCost: 12000, companyId: 'co-2' },
  { id: 'inv-item-4', productId: 'p-4', lotNumber: undefined, expirationDate: undefined, warehouseId: 'wh-1', quantity: 25, avgCost: 15000, companyId: 'co-2' },
  { id: 'inv-item-5', productId: 'p-5', lotNumber: undefined, expirationDate: undefined, warehouseId: 'wh-1', quantity: 1000, avgCost: 450, companyId: 'co-2' },
  { id: 'inv-item-6', productId: 'p-6', lotNumber: 'L-GVAL-001', expirationDate: '2026-09-09', warehouseId: 'wh-2', quantity: 150, avgCost: 6500, companyId: 'co-2' },
  { id: 'inv-item-7', productId: 'p-7', lotNumber: 'L-PAVE-044', expirationDate: '2026-06-21', warehouseId: 'wh-2', quantity: 40, avgCost: 3200, companyId: 'co-2' }
];

export const INITIAL_ASSETS: Asset[] = [
  { id: 'as-1', name: 'Horno Rotatorio Industrial Masamar', serial: 'HRM-240-BOG', type: 'Maquinaria', value: 45000000, location: 'Planta Horneado A', purchaseDate: '2025-01-15', depreciationPeriodMonths: 120 },
  { id: 'as-2', name: 'Mezcladora Batidora Industrial de Doble Brazo', serial: 'MBI-60L-04', type: 'Maquinaria', value: 18000000, location: 'Planta Amasado', purchaseDate: '2025-03-10', depreciationPeriodMonths: 120 }
];

export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  { id: 'ba-1', name: 'Corriente Bancolombia Ppal', bankName: 'Bancolombia', accountNumber: '243-900540-12', balance: 34500000, companyId: 'co-1' },
  { id: 'ba-2', name: 'Ahorros Davivienda Recaudos', bankName: 'Davivienda', accountNumber: '0040-5441-3200', balance: 9800000, companyId: 'co-2' }
];

export const INITIAL_COST_CENTERS: CostCenter[] = [
  { id: 'cc-1', code: 'PROD-PAN', name: 'Amasado y Horneado', manager: 'Carlos Mario Ruiz', active: true },
  { id: 'cc-2', code: 'PROD-EMP', name: 'Empaque y Alistamiento', manager: 'Diana Patricia Gomez', active: true },
  { id: 'cc-3', code: 'COM-DIST', name: 'Comercialización y Ventas', manager: 'Alejandra Moreno', active: true },
  { id: 'cc-4', code: 'ADM-GRL', name: 'Administración General', manager: 'Edgar Quiñones', active: true }
];

export const INITIAL_BUDGETS: Budget[] = [
  { id: 'bu-1', targetType: 'account', targetId: '513505', period: '2026', amount: 4500000 },
  { id: 'bu-2', targetType: 'costcenter', targetId: 'cc-1', period: '2026', amount: 15000000 }
];

export const INITIAL_VOUCHERS: Voucher[] = [
  {
    id: 'v-1',
    number: 'CD-0001',
    type: 'diario',
    date: '2026-06-01',
    concept: 'Aporte de Capital Inicial Suscrito',
    thirdPartyId: 'ter-4',
    status: 'procesado',
    total: 30000000,
    companyId: 'co-1',
    lines: [
      { accountCode: '110505', description: 'Caja - Capital de Aporte', debit: 30000000, credit: 0 },
      { accountCode: '311505', description: 'Capital Social Registrado', debit: 0, credit: 30000000 }
    ]
  },
  {
    id: 'v-2',
    number: 'FE-101',
    type: 'venta',
    date: '2026-06-05',
    concept: 'Factura Electrónica de Venta No. FE-101 a Éxito (Vía Factus)',
    thirdPartyId: 'ter-2',
    status: 'procesado',
    total: 2475000,
    companyId: 'co-1',
    lines: [
      { accountCode: '130505', description: 'Clientes Nal - Éxito venta FE-101', debit: 2475000, credit: 0 },
      { accountCode: '240805', description: 'IVA Generado del 19%', debit: 0, credit: 395126 },
      { accountCode: '413501', description: 'Venta de 150 cajas galletas', debit: 0, credit: 2079874 }
    ],
    billingProviderData: {
      providerName: 'Factus',
      transactionId: 'fac_tx_8841295-FE101',
      cufe: 'ff2d810caFE101e890c00122ffb76251410bc300450adffe7e900cca2348ff112e',
      providerStatus: 'procesado_exitoso',
      dianValidationStatus: 'aprobado_dian',
      receivedAt: '2026-06-05T10:15:32-05:00',
      qrCodeUrl: 'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=ff2d810caFE101'
    }
  },
  {
    id: 'v-3',
    number: 'CE-555',
    type: 'compra',
    date: '2026-06-06',
    concept: 'Registro de Compra de Materias Primas Ref: F-993',
    thirdPartyId: 'ter-1',
    status: 'procesado',
    total: 1600000,
    companyId: 'co-2',
    lines: [
      { accountCode: '140501', description: 'Compra 500Kg Trigo industrial', debit: 1600000, credit: 0 },
      { accountCode: '220505', description: 'Proveedores - Harineras del Valle', debit: 0, credit: 1600000 }
    ]
  }
];

export const INITIAL_PRODUCTION_ORDERS: ProductionOrder[] = [
  {
    id: 'po-1',
    orderNumber: 'OP-1001',
    bomId: 'bom-1', // Galletas Vainilla
    quantity: 100, // 100 cajas
    startDate: '2026-06-08',
    dueDate: '2026-06-11',
    status: 'proceso',
    costEstimates: { materials: 350000, labor: 150000, overhead: 100000 },
    generatedLot: 'LOT-2606-B1',
    companyId: 'co-2'
  },
  {
    id: 'po-2',
    orderNumber: 'OP-1002',
    bomId: 'bom-2', // Pan Avena
    quantity: 50,
    startDate: '2026-06-09',
    dueDate: '2026-06-10',
    status: 'pendiente',
    costEstimates: { materials: 140000, labor: 450000, overhead: 20000 },
    generatedLot: 'LOT-2606-B2',
    companyId: 'co-2'
  }
];

export const INITIAL_BANK_TRANSACTIONS: BankTransaction[] = [
  { id: 'bt-1', bankAccountId: 'ba-1', date: '2026-06-01', type: 'Ingreso', amount: 30000000, concept: 'Consignación Capital Inicial', reconciled: true },
  { id: 'bt-2', bankAccountId: 'ba-1', date: '2026-06-05', type: 'Ingreso', amount: 2475000, concept: 'Transferencia Cobro Éxito FE-101', reconciled: false },
  { id: 'bt-3', bankAccountId: 'ba-1', date: '2026-06-08', type: 'Egreso', amount: 450000, concept: 'Pago de Servicios Públicos Acueducto', reconciled: false }
];

export const INITIAL_INTEGRATION_LOGS = [
  { date: '2026-06-09 21:00 CEST', user: 'Admin', action: 'BOOT', detail: 'Fintekia sistema iniciado.' }
];

export const getInitialState = (): AppState => {
    // Check localStorage
    const savedState = localStorage.getItem('fintekia_app_state_v1');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Verify parsed.companies is fine
        if (parsed.companies && parsed.companies.length > 0) {
          if (!parsed.techServiceOrders) {
            parsed.techServiceOrders = INITIAL_TECH_ORDERS;
          }
          // Ensure tech products exist in products array
          const hasTech = parsed.products?.some((p: Product) => p.type === 'tecnologia' || p.type === 'servicio');
          if (!hasTech) {
            const techItems = INITIAL_PRODUCTS.filter(p => p.type === 'tecnologia' || p.type === 'servicio');
            parsed.products = [...techItems, ...(parsed.products || [])];
          }
          // Ensure first company has tech/services and enableProduction configured
          if (parsed.companies[0].enableProduction === undefined) {
            parsed.companies[0].enableProduction = false;
            parsed.companies[0].businessType = 'tecnologia_servicios';
            parsed.companies[0].name = 'FinteKia Tech & Solutions S.A.S.';
            parsed.companies[0].slogan = 'Tecnología, Hardware, Servicios TI & Facturación Electrónica';
          }
          // Ensure all companies have third-party electronic billing configured
          parsed.companies.forEach((co: any) => {
            if (!co.billingConfig) {
              co.billingConfig = {
                providerType: 'tercero_proveedor',
                providerName: 'Alanube',
                providerNit: '901.464.305-6',
                clientId: 'ala_cli_live_98a72b4c8102',
                clientSecret: 'ala_sec_f9823be800e2194ad9b3c4f',
                apiEndpoint: 'https://api.alanube.co/dian/v1/invoices',
                apiToken: 'ala_live_sec_98f7e2a4d3_auth_key',
                environment: 'produccion',
                prefix: 'FE',
                resolutionNumber: '187640000099',
                resolutionDate: '2026-01-15',
                authorizedRangeFrom: 101,
                authorizedRangeTo: 10000,
                technicalKey: 'ala8eac822301a1d2e1f4b',
                softwareId: '6b2d189f-299f-4318-8f81-591741ac4e82',
                pin: '75421',
                autoSendEmail: true,
                lastTestStatus: 'success',
                lastTestTimestamp: '2026-03-28T14:32:00Z',
                availableCredits: 4850
              };
            } else {
              if (co.billingConfig.providerName === 'Alanube') {
                if (!co.billingConfig.clientId) co.billingConfig.clientId = 'ala_cli_live_98a72b4c8102';
                if (!co.billingConfig.clientSecret) co.billingConfig.clientSecret = 'ala_sec_f9823be800e2194ad9b3c4f';
                if (!co.billingConfig.softwareId) co.billingConfig.softwareId = '6b2d189f-299f-4318-8f81-591741ac4e82';
                if (!co.billingConfig.pin) co.billingConfig.pin = '75421';
                if (!co.billingConfig.lastTestStatus) co.billingConfig.lastTestStatus = 'success';
              }
            }

            // Ensure company logo and invoice design exist
            if (!co.logoUrl) {
              co.logoUrl = co.id === 'co-2' 
                ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23d97706"/><stop offset="100%" stop-color="%23b45309"/></linearGradient></defs><rect width="200" height="200" rx="44" fill="url(%23g2)"/><path d="M100 40 C75 70 70 110 100 150 C130 110 125 70 100 40 Z" fill="%23fef3c7"/><path d="M100 65 C85 85 85 110 100 135 C115 110 115 85 100 65 Z" fill="%23d97706"/><circle cx="100" cy="98" r="8" fill="%23fef3c7"/></svg>'
                : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%232563eb"/><stop offset="100%" stop-color="%234f46e5"/></linearGradient></defs><rect width="200" height="200" rx="44" fill="url(%23g1)"/><path d="M60 55 L140 55 L140 80 L95 80 L95 95 L130 95 L130 120 L95 120 L95 145 L60 145 Z" fill="%23ffffff"/><circle cx="150" cy="140" r="14" fill="%2338bdf8"/></svg>';
            }
            if (!co.invoiceDesign) {
              co.invoiceDesign = {
                logoPosition: co.id === 'co-2' ? 'banner' : 'left',
                logoSize: 'md',
                logoStyle: 'rounded',
                accentColor: co.id === 'co-2' ? '#d97706' : '#2563eb',
                showSlogan: true,
                showResolutionBox: true,
                showBankAccounts: true,
                bankAccountDetails: co.id === 'co-2' 
                  ? 'Banco de Bogotá Cta Ahorros No. 034-771290-12 (NIT 800.224.990-1)' 
                  : 'Bancolombia Cta Corriente No. 245-098712-88 (NIT 901.455.120-3)',
                termsAndNotes: 'Esta factura de venta se asimila en sus efectos legales a una letra de cambio según la Ley 1231 de 2008.'
              };
            }
          });

          // Ensure vouchers have companyId
          if (parsed.vouchers) {
            parsed.vouchers.forEach((v: any) => {
              if (!v.companyId) {
                v.companyId = v.number === 'CE-555' ? 'co-2' : 'co-1';
              }
            });
          }

          // Ensure products, warehouses, and orders have companyId backfilled
          if (parsed.products) {
            parsed.products.forEach((p: any) => {
              if (!p.companyId) {
                p.companyId = (p.id.startsWith('p-t') || p.id.startsWith('p-s')) ? 'co-1' : 'co-2';
              }
            });
          }
          if (parsed.warehouses) {
            parsed.warehouses.forEach((w: any) => {
              if (!w.companyId) {
                w.companyId = (w.id === 'wh-3' || w.id === 'wh-4') ? 'co-1' : 'co-2';
              }
            });
          }
          if (parsed.bankAccounts) {
            parsed.bankAccounts.forEach((ba: any) => {
              if (!ba.companyId) {
                ba.companyId = ba.id === 'ba-2' ? 'co-2' : 'co-1';
              }
            });
          }
          if (parsed.techServiceOrders) {
            parsed.techServiceOrders.forEach((o: any) => {
              if (!o.companyId) o.companyId = 'co-1';
            });
          }
          if (parsed.productionOrders) {
            parsed.productionOrders.forEach((po: any) => {
              if (!po.companyId) po.companyId = 'co-2';
            });
          }

          if (!parsed.users) {
            parsed.users = [
              { id: 'usr-1', name: 'Washington Quiñones', email: 'quinoneswash70@gmail.com', role: 'Admin', cargo: 'Gerente General', active: true, dateCreated: '2026-01-10' },
              { id: 'usr-2', name: 'Martha Lucia Ospina', email: 'martha.ospina@fintekia.co', role: 'Contador', cargo: 'Contadora Principal', active: true, dateCreated: '2026-02-15' },
              { id: 'usr-3', name: 'Andrés Felipe Gómez', email: 'af.gomez@fintekia.co', role: 'Vendedor', cargo: 'Coordinador Comercial', active: true, dateCreated: '2026-03-01' },
              { id: 'usr-4', name: 'Carlos Mario Bedoya', email: 'c.bedoya@fintekia.co', role: 'Operario', cargo: 'Jefe de Operaciones', active: true, dateCreated: '2026-04-20' },
            ];
          }
          return parsed as AppState;
        }
      } catch (e) {
        console.warn("Failed to retrieve stored app state, reverting to initial templates", e);
      }
    }

    return {
      currentCompanyId: 'co-1',
      companies: INITIAL_COMPANIES,
      terceros: INITIAL_TERCEROS,
      products: INITIAL_PRODUCTS,
      inventory: INITIAL_INVENTORY,
      inventoryMovements: [],
      warehouses: INITIAL_WAREHOUSES,
      assets: INITIAL_ASSETS,
      puc: DEFAULT_PUC,
      costCenters: INITIAL_COST_CENTERS,
      vouchers: INITIAL_VOUCHERS,
      bankAccounts: INITIAL_BANK_ACCOUNTS,
      bankTransactions: INITIAL_BANK_TRANSACTIONS,
      boms: INITIAL_BOMS,
      productionOrders: INITIAL_PRODUCTION_ORDERS,
      qualityInspections: [],
      packagingLogs: [],
      payrollLogs: [],
      budgets: INITIAL_BUDGETS,
      techServiceOrders: INITIAL_TECH_ORDERS,
      activeView: 'dashboard',
    currentUser: {
      name: 'Washington Quiñones',
      role: 'Admin',
      email: 'quinoneswash70@gmail.com'
    },
    users: [
      { id: 'usr-1', name: 'Washington Quiñones', email: 'quinoneswash70@gmail.com', role: 'Admin', cargo: 'Administrador General', active: true, dateCreated: '2026-01-10' },
      { id: 'usr-2', name: 'Martha Lucia Ospina', email: 'martha.ospina@fintekia.co', role: 'Contador', cargo: 'Contadora Principal', active: true, dateCreated: '2026-02-15' },
      { id: 'usr-3', name: 'Andrés Felipe Gómez', email: 'af.gomez@fintekia.co', role: 'Vendedor', cargo: 'Coordinador Comercial', active: true, dateCreated: '2026-03-01' },
      { id: 'usr-4', name: 'Carlos Mario Bedoya', email: 'c.bedoya@fintekia.co', role: 'Operario', cargo: 'Jefe de Panificación', active: true, dateCreated: '2026-04-20' },
    ],
    kioskMode: false,
    theme: 'navy_dark'
  };
};

export const saveStateToLocalStorage = (state: AppState) => {
  localStorage.setItem('fintekia_app_state_v1', JSON.stringify(state));
};

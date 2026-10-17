export interface ElectronicBillingConfig {
  providerType: 'tercero_proveedor' | 'dian_directo'; // Default: 'tercero_proveedor' (intermedio menos complicado)
  providerName: 'Alanube' | 'Factus' | 'Siigo' | 'Alegra' | 'Dataico' | 'TheFactoryHKA' | 'Personalizado';
  providerNit?: string; // NIT del Proveedor Tecnológico Autorizado (ej. Alanube: 901.464.305-6, Factus: 901.324.558-1)
  clientId?: string; // ID de Cliente de API Alanube (ej: ala_cli_live_98a72b4c)
  clientSecret?: string; // Clave Secreta de API Alanube
  apiToken?: string;
  apiEndpoint?: string;
  environment: 'pruebas' | 'produccion';
  prefix: string; // ej: "FE", "SETP"
  resolutionNumber: string; // ej: "187640000099"
  resolutionDate: string; // ej: "2026-01-15"
  authorizedRangeFrom?: number;
  authorizedRangeTo?: number;
  technicalKey?: string;
  softwareId?: string; // ID de Software DIAN
  pin?: string; // PIN DIAN
  testSetId?: string; // Test Set ID para ambiente de pruebas / habilitación
  autoSendEmail?: boolean;
  syncWithDianDirect?: boolean;
  lastTestStatus?: 'success' | 'failed' | 'untested';
  lastTestTimestamp?: string;
  lastTestMessage?: string;
  availableCredits?: number;
  dianHabilitationStatus?: 'pendiente' | 'en_proceso' | 'habilitado';
  dianTestSetCompletedAt?: string;
  dianTestInvoicesCount?: number;
}

export interface InvoiceDesignConfig {
  logoPosition: 'left' | 'center' | 'right' | 'banner';
  logoSize: 'sm' | 'md' | 'lg' | 'xl'; // sm: 48px, md: 64px, lg: 84px, xl: 110px
  logoStyle: 'none' | 'rounded' | 'card' | 'circle';
  accentColor: string; // e.g. '#2563eb', '#059669', '#4f46e5', '#0f172a', '#d97706', '#7c3aed'
  showSlogan: boolean;
  showResolutionBox: boolean;
  showBankAccounts: boolean;
  bankAccountDetails?: string;
  termsAndNotes?: string;
  watermarkText?: string;
  headerLayout?: 'classic' | 'modern' | 'minimal' | 'executive';
  showSignatures?: boolean; // Firmas al pie: Emisor (Firma autorizada) y Aceptación (Recibí conforme)
}

export interface Company {
  id: string;
  name: string;
  nit: string;
  slogan: string;
  address: string;
  city?: string;
  phone?: string;
  email?: string;
  regimen: 'responsable' | 'no_responsable' | 'gran_contribuyente' | 'simple';
  currency: 'COP' | 'USD' | 'EUR';
  period: number;
  logoUrl?: string;
  isActive?: boolean;
  businessType?: 'tecnologia_servicios' | 'produccion' | 'comercial' | 'mixto';
  enableProduction?: boolean; // Toggle production MRP on/off dynamically
  enableTechServices?: boolean;
  billingConfig?: ElectronicBillingConfig; // Configuración de Facturación Electrónica vía Tercero
  invoiceDesign?: InvoiceDesignConfig; // Configuración visual personalizada de Factura y Logotipo
  payrollParameters: {
    smmlv: number;
    auxTransporte: number;
  };
}

export interface Tercero {
  id: string;
  name: string;
  nit: string;
  dv?: string;
  type: 'juridica' | 'natural';
  roles: ('cliente' | 'proveedor' | 'empleado')[];
  city: string;
  address: string;
  phone?: string;
  email?: string;
  contact?: string;
  parentId?: string; // linkage to corporate mother company
  regimen?: 'responsable' | 'no_responsable' | 'exento' | 'simple';
  responsabilidadFiscal?: string;
  // Employee roles
  employeeCargo?: string;
  employeeSalary?: number;
  employeeEmergencyContact?: string;
  employeeContractType?: 'termino_indefinido' | 'termino_fijo' | 'obra_labor' | 'aprendizaje';
  employeeStartDate?: string;
  employeeBank?: string;
  employeeAccountType?: 'ahorros' | 'corriente';
  employeeAccountNumber?: string;
  employeeEps?: string;
  employeeAfp?: string;
  employeeArlRisk?: 1 | 2 | 3 | 4 | 5;
  // Provider roles
  providerBank?: string;
  providerBankAccountType?: 'ahorros' | 'corriente';
  providerBankAccountNumber?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  cost: number;
  price: number;
  tax: 0 | 5 | 19; // IVA percentage
  type: 'materia_prima' | 'wip' | 'terminado' | 'servicio' | 'tecnologia';
  lotTracking: boolean;
  shelfLifeDays?: number;
  serialNumber?: string;
  warrantyMonths?: number;
  brand?: string;
  model?: string;
  minStock?: number;
  category?: string;
  unitOfMeasure?: string;
}

export interface TechServicePartItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface TechServiceTimelineEvent {
  date: string;
  status: string;
  note: string;
  user?: string;
}

export interface TechServiceOrder {
  id: string;
  code: string; // OT-101
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  device: string; // e.g., "Laptop Lenovo ThinkPad T14"
  brand?: string;
  model?: string;
  serial?: string;
  accessoriesReceived?: string; // Cargador, cable, estuche, memoria
  physicalCondition?: string; // Rayones, pantalla intacta, tornillos faltantes
  devicePassword?: string; // Para pruebas técnicas
  reportedIssue: string;
  diagnosis?: string;
  solutionApplied?: string;
  status: 'recibido' | 'en_diagnostico' | 'esperando_repuesto' | 'en_proceso' | 'completado' | 'entregado' | 'cancelado';
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  estimatedCost: number;
  laborCost?: number;
  partsUsed?: TechServicePartItem[];
  finalCost?: number;
  warrantyDays?: number; // Ej: 30, 60, 90 días
  createdAt: string;
  deliveryDate?: string;
  technician?: string;
  receivedBy?: string;
  notes?: string;
  deliveryNotes?: string;
  timeline?: TechServiceTimelineEvent[];
}

export interface InventoryItem {
  id: string; // SKU or SKU_Lot
  productId: string;
  lotNumber?: string;
  expirationDate?: string;
  warehouseId: string;
  quantity: number;
  avgCost: number;
}

export interface InventoryMovement {
  id: string;
  date: string;
  productId: string;
  lotNumber?: string;
  type: 'entrada_compra' | 'salida_venta' | 'produccion_entrada' | 'consumo_materia_prima' | 'traslado_traslado';
  originWarehouseId?: string;
  destWarehouseId?: string;
  quantity: number;
  cost: number;
  userId: string;
  notes?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  manager?: string;
}

export interface Asset {
  id: string;
  name: string;
  serial: string;
  type: 'Maquinaria' | 'Muebles' | 'Vehículo' | 'Computo';
  value: number;
  location: string;
  purchaseDate: string;
  depreciationPeriodMonths: number;
}

export interface PucAccount {
  code: string;
  name: string;
  nature: 'debito' | 'credito'; // Natural balance
  type: 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'gasto' | 'costo';
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  manager: string;
  active: boolean;
}

export interface VoucherLine {
  accountCode: string;
  description: string;
  costCenterId?: string;
  debit: number;
  credit: number;
}

export interface VoucherItem {
  productId: string;
  qty: number;
  unitPrice: number;
  lotNumber?: string;
  expirationDate?: string;
}

export interface Voucher {
  id: string;
  number: string; // FE-0001, CE-0001, etc.
  type: 'ingreso' | 'egreso' | 'diario' | 'ajuste' | 'venta' | 'compra';
  date: string;
  concept: string;
  thirdPartyId: string;
  lines: VoucherLine[];
  status: 'borrador' | 'aprobado' | 'procesado';
  total: number;
  companyId?: string; // ID de la empresa a la que pertenece el comprobante/factura
  items?: VoucherItem[];
  paymentTerm?: 'contado' | 'credito';
  dueDate?: string;
  discountTotal?: number;
  retenciones?: {
    retefuente?: number;
    reteiva?: number;
    reteica?: number;
  };
  notes?: string;
  isCreditNote?: boolean;
  relatedVoucherNumber?: string;
  billingProviderData?: {
    providerName: string; // e.g. 'Factus', 'Siigo', 'Alegra', 'Dataico'
    transactionId: string; // External transaction UUID from the provider
    cufe: string;
    qrCodeUrl?: string;
    providerStatus: 'procesado_exitoso' | 'en_cola_tercero' | 'rechazado';
    dianValidationStatus: 'aprobado_dian' | 'en_verificacion';
    receivedAt: string;
    rawPayloadSent?: any;
  };
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  balance: number;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  date: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  concept: string;
  voucherId?: string;
  reconciled: boolean;
}

export interface BOMItem {
  id: string;
  productId: string; // Raw material or WIP
  quantity: number; // needed for 1 unit of target finished product
}

export interface BOM {
  id: string;
  finishedProductId: string;
  version: string;
  items: BOMItem[];
  standards: {
    param: string;
    target: number;
    tolerance: number;
  };
}

export interface ProductionOrder {
  id: string;
  orderNumber: string; // OP-0001
  bomId: string;
  quantity: number; // to produce
  startDate: string;
  dueDate: string;
  completedDate?: string;
  status: 'pendiente' | 'proceso' | 'calidad' | 'empaque' | 'completada' | 'rechazada';
  costEstimates: {
    materials: number;
    labor: number;
    overhead: number;
  };
  costsReal?: {
    materials: number;
    labor: number;
    overhead: number;
  };
  generatedLot?: string;
  rawWarehouseId?: string;
  finishedWarehouseId?: string;
  productionHours?: number;
  laborHourlyRate?: number;
  overheadHourlyRate?: number;
}

export interface QualityInspection {
  id: string;
  date: string;
  productionOrderId: string;
  loteNumber: string;
  inspector: string;
  paramInspected: string;
  valueMeasured: number;
  result: 'Aprobado' | 'Rechazado' | 'Observación' | 'Pendiente';
  notes?: string;
}

export interface PackagingLog {
  id: string;
  date: string;
  productionOrderId: string;
  finishedProductId: string;
  quantity: number;
  lotGenerated: string;
  operatorId: string;
}

export interface PayrollProvisions {
  cesantias: number;
  interesesCesantias: number;
  primaServicios: number;
  vacaciones: number;
  saludPatronal: number;
  pensionPatronal: number;
  arl: number;
  sena: number;
  icbf: number;
  cajaCompensacion: number;
  totalProvisiones: number;
}

export interface PayrollLog {
  id: string;
  employeeId: string;
  period: string; // e.g. "2026-06"
  daysWorked: number;
  baseSalary: number;
  overtimePay: number;
  bonusPay: number;
  auxTransporte: number;
  deduccionesSalud: number;
  deduccionesPension: number;
  fspDeduction?: number; // Fondo Solidaridad Pensional (> 4 SMMLV)
  netPay: number;
  consignedBankAccountId?: string;
  consignedDate?: string;
  status: 'calculado' | 'pagado';
  hedHours?: number;
  henHours?: number;
  rnHours?: number;
  hedfHours?: number;
  henfHours?: number;
  rdfHours?: number;
  bonusNonWagePay?: number;
  otherDeductionsPay?: number;
  // DIAN Electronic Payroll
  cune?: string;
  dianStatus?: 'pendiente' | 'emitido' | 'aprobado_dian';
  electronicConsecutive?: string;
  dianIssuedAt?: string;
  qrCodeUrl?: string;
  voucherId?: string;
  provisions?: PayrollProvisions;
}

export interface Budget {
  id: string;
  targetType: 'account' | 'costcenter';
  targetId: string; // accountCode or costCenterId
  period: string; // e.g., "2026"
  amount: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Contador' | 'Vendedor' | 'Operario';
  cargo: string;
  active: boolean;
  dateCreated: string;
}

export interface AppState {
  currentCompanyId: string;
  companies: Company[];
  terceros: Tercero[];
  products: Product[];
  inventory: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  warehouses: Warehouse[];
  assets: Asset[];
  puc: PucAccount[];
  costCenters: CostCenter[];
  vouchers: Voucher[];
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  boms: BOM[];
  productionOrders: ProductionOrder[];
  qualityInspections: QualityInspection[];
  packagingLogs: PackagingLog[];
  payrollLogs: PayrollLog[];
  budgets: Budget[];
  techServiceOrders?: TechServiceOrder[];
  activeView: string;
  currentUser: {
    name: string;
    role: 'Admin' | 'Contador' | 'Vendedor' | 'Operario';
    email: string;
  };
  users?: UserProfile[];
  kioskMode: boolean;
  theme?: 'slate_gray' | 'zinc_classic' | 'navy_dark' | 'steel_sage' | 'light_gray';
}

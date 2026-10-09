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
}

export interface Company {
  id: string;
  name: string;
  nit: string;
  slogan: string;
  address: string;
  regimen: 'responsable' | 'no_responsable' | 'gran_contribuyente' | 'simple';
  currency: 'COP' | 'USD' | 'EUR';
  period: number;
  logoUrl?: string;
  isActive?: boolean;
  businessType?: 'tecnologia_servicios' | 'produccion' | 'comercial' | 'mixto';
  enableProduction?: boolean; // Toggle production MRP on/off dynamically
  enableTechServices?: boolean;
  billingConfig?: ElectronicBillingConfig; // Configuración de Facturación Electrónica vía Tercero
  payrollParameters: {
    smmlv: number;
    auxTransporte: number;
  };
}

export interface Tercero {
  id: string;
  name: string;
  nit: string;
  type: 'juridica' | 'natural';
  roles: ('cliente' | 'proveedor' | 'empleado')[];
  city: string;
  address: string;
  phone?: string;
  email?: string;
  contact?: string;
  parentId?: string; // linkage to corporate mother company
  regimen?: 'responsable' | 'no_responsable' | 'exento';
  // Employee roles
  employeeCargo?: string;
  employeeSalary?: number;
  employeeEmergencyContact?: string;
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
}

export interface TechServiceOrder {
  id: string;
  code: string; // OT-101
  clientId: string;
  clientName: string;
  device: string; // e.g., "Laptop Lenovo ThinkPad T14"
  serial?: string;
  reportedIssue: string;
  diagnosis?: string;
  status: 'recibido' | 'en_diagnostico' | 'en_proceso' | 'completado' | 'entregado';
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  estimatedCost: number;
  createdAt: string;
  deliveryDate?: string;
  technician?: string;
  notes?: string;
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
  items?: VoucherItem[];
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

import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table managed with Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('Admin'),
  cargo: text('cargo'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Empresas / Sociedades
export const companies = pgTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nit: text('nit').notNull(),
  slogan: text('slogan'),
  address: text('address'),
  regimen: text('regimen').default('responsable'),
  currency: text('currency').default('COP'),
  period: integer('period').default(2026),
  businessType: text('business_type').default('tecnologia_servicios'),
  enableProduction: boolean('enable_production').default(false),
  enableTechServices: boolean('enable_tech_services').default(true),
  billingConfig: jsonb('billing_config'), // Alanube DIAN configuration
  payrollParameters: jsonb('payroll_parameters'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Terceros (Clientes, Proveedores, Empleados)
export const terceros = pgTable('terceros', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id),
  name: text('name').notNull(),
  nit: text('nit').notNull(),
  type: text('type').default('natural'),
  roles: jsonb('roles'),
  city: text('city'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  contact: text('contact'),
  regimen: text('regimen'),
  employeeCargo: text('employee_cargo'),
  employeeSalary: numeric('employee_salary'),
  providerBank: text('provider_bank'),
  providerBankAccountType: text('provider_bank_account_type'),
  providerBankAccountNumber: text('provider_bank_account_number'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Catálogo de Productos y Servicios
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id),
  name: text('name').notNull(),
  sku: text('sku').notNull(),
  barcode: text('barcode'),
  cost: numeric('cost').notNull().default('0'),
  price: numeric('price').notNull().default('0'),
  tax: integer('tax').notNull().default(19),
  type: text('type').notNull().default('terminado'),
  lotTracking: boolean('lot_tracking').default(false),
  shelfLifeDays: integer('shelf_life_days'),
  brand: text('brand'),
  model: text('model'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Comprobantes Contables y Facturación Electrónica DIAN
export const vouchers = pgTable('vouchers', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id),
  number: text('number').notNull(),
  type: text('type').notNull(),
  date: text('date').notNull(),
  concept: text('concept').notNull(),
  thirdPartyId: text('third_party_id'),
  status: text('status').notNull().default('borrador'),
  total: numeric('total').notNull().default('0'),
  lines: jsonb('lines').notNull(),
  items: jsonb('items'),
  billingProviderData: jsonb('billing_provider_data'), // Alanube CUFE, QR, DIAN status
  createdAt: timestamp('created_at').defaultNow(),
});

// Stock e Inventario
export const inventory = pgTable('inventory', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id),
  productId: text('product_id').references(() => products.id),
  lotNumber: text('lot_number'),
  expirationDate: text('expiration_date'),
  warehouseId: text('warehouse_id'),
  quantity: numeric('quantity').notNull().default('0'),
  avgCost: numeric('avg_cost').notNull().default('0'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Cuentas Bancarias y Tesorería
export const bankAccounts = pgTable('bank_accounts', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id),
  name: text('name').notNull(),
  bankName: text('bank_name').notNull(),
  accountNumber: text('account_number').notNull(),
  balance: numeric('balance').notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Estado Global / Configuración de la App
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  terceros: many(terceros),
  products: many(products),
  vouchers: many(vouchers),
  inventory: many(inventory),
  bankAccounts: many(bankAccounts),
}));

export const tercerosRelations = relations(terceros, ({ one }) => ({
  company: one(companies, {
    fields: [terceros.companyId],
    references: [companies.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
  inventory: many(inventory),
}));

export const vouchersRelations = relations(vouchers, ({ one }) => ({
  company: one(companies, {
    fields: [vouchers.companyId],
    references: [companies.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  company: one(companies, {
    fields: [inventory.companyId],
    references: [companies.id],
  }),
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
}));

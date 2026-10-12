-- ==============================================================================
-- FINTEKIA ERP - MIGRACIÓN INICIAL PARA SUPABASE & GITHUB CI/CD
-- Archivo: 20261010000000_fintekia_erp_schema.sql
-- Proyecto Supabase: irncymdscgeucoacwzfg
-- Administrador: quinoneswash70@gmail.com
-- ==============================================================================

-- 1. Habilitar extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabla de Empresas / Sociedades (Multi-tenant)
CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nit TEXT NOT NULL,
  slogan TEXT,
  address TEXT,
  regimen TEXT DEFAULT 'responsable',
  currency TEXT DEFAULT 'COP',
  period INTEGER DEFAULT 2026,
  business_type TEXT DEFAULT 'tecnologia_servicios',
  enable_production BOOLEAN DEFAULT false,
  enable_tech_services BOOLEAN DEFAULT true,
  billing_config JSONB,
  payroll_parameters JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Usuarios del Sistema ERP
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'Admin',
  cargo TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Terceros (Clientes, Proveedores, Empleados)
CREATE TABLE IF NOT EXISTS public.terceros (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nit TEXT NOT NULL,
  type TEXT DEFAULT 'natural',
  roles JSONB,
  city TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  contact TEXT,
  regimen TEXT,
  employee_cargo TEXT,
  employee_salary NUMERIC,
  provider_bank TEXT,
  provider_bank_account_type TEXT,
  provider_bank_account_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Catálogo de Productos, Hardware y Servicios TI
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  cost NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  tax INTEGER NOT NULL DEFAULT 19,
  type TEXT NOT NULL DEFAULT 'terminado',
  lot_tracking BOOLEAN DEFAULT false,
  shelf_life_days INTEGER,
  brand TEXT,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de Comprobantes Contables y Facturación Electrónica DIAN
CREATE TABLE IF NOT EXISTS public.vouchers (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  concept TEXT NOT NULL,
  third_party_id TEXT,
  status TEXT NOT NULL DEFAULT 'borrador',
  total NUMERIC NOT NULL DEFAULT 0,
  lines JSONB NOT NULL,
  items JSONB,
  billing_provider_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabla de Inventario y Lotes
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
  lot_number TEXT,
  expiration_date TEXT,
  warehouse_id TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  avg_cost NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabla de Cuentas Bancarias y Tesorería
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Tabla de Configuración y Estado Global
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Índices para Alto Rendimiento
CREATE INDEX IF NOT EXISTS idx_terceros_company ON public.terceros(company_id);
CREATE INDEX IF NOT EXISTS idx_terceros_nit ON public.terceros(nit);
CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_vouchers_company ON public.vouchers(company_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_number ON public.vouchers(number);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON public.inventory(product_id);

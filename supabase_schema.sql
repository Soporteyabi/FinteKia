-- ==============================================================================
-- FINTEKIA ERP - ESQUEMA DE BASE DE DATOS PARA SUPABASE (POSTGRESQL)
-- Proyecto Supabase: irncymdscgeucoacwzfg
-- Generado para: quinoneswash70@gmail.com
-- Instrucciones:
-- 1. Copia todo este código SQL.
-- 2. Pégalo en tu SQL Editor: https://supabase.com/dashboard/project/irncymdscgeucoacwzfg/sql/new
-- 3. Haz clic en el botón verde "RUN" (o presiona Ctrl + Enter).
-- 4. ¡Listo! Podrás ver tus tablas inmediatamente en:
--    https://supabase.com/dashboard/project/irncymdscgeucoacwzfg/editor
-- ==============================================================================

-- 1. Habilitar extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabla de Empresas / Sociedades
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

-- 5. Tabla de Catálogo de Productos y Servicios
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

-- ==============================================================================
-- 11. DATOS INICIALES (SEED DATA): EMPRESAS Y USUARIO
-- ==============================================================================

-- Insertar Empresa Principal DIGITAL YA'BI y empresas de ejemplo
INSERT INTO public.companies (id, name, nit, slogan, address, regimen, currency, period, business_type, enable_production, enable_tech_services, billing_config, payroll_parameters)
VALUES 
(
  'co-1781210729382',
  'DIGITAL YA''BI',
  '87942146-5',
  'ALEGRIA QUE SE EXPANDE',
  'CR 28H 41 - 50',
  'no_responsable',
  'COP',
  2026,
  'tecnologia_servicios',
  false,
  true,
  '{"prefix": "FE", "apiToken": "fk_live_9a87d6e5c4b3a2_token_auth", "environment": "produccion", "providerNit": "901.324.558-1", "providerName": "Factus", "providerType": "tercero_proveedor", "autoSendEmail": true, "resolutionDate": "2026-01-15", "resolutionNumber": "187640000099", "authorizedRangeTo": 10000, "authorizedRangeFrom": 101}',
  '{"smmlv": 1750905, "auxTransporte": 249095}'
),
(
  'co-1',
  'FinteKia Tech & Solutions S.A.S.',
  '901.455.120-3',
  'Tecnología, Hardware, Servicios TI & Facturación Electrónica',
  'Cl. 13 # 44-50, Bogotá D.C.',
  'responsable',
  'COP',
  2026,
  'tecnologia_servicios',
  false,
  true,
  '{"prefix": "FE", "apiToken": "fk_live_9a87d6e5c4b3a2_token_auth", "environment": "produccion", "providerNit": "901.324.558-1", "providerName": "Factus", "providerType": "tercero_proveedor", "autoSendEmail": true, "resolutionDate": "2026-01-15", "resolutionNumber": "187640000099", "authorizedRangeTo": 10000, "authorizedRangeFrom": 101}',
  '{"smmlv": 1423500, "auxTransporte": 172000}'
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  nit = EXCLUDED.nit,
  slogan = EXCLUDED.slogan;

-- Insertar Usuario Administrador
INSERT INTO public.users (email, name, role, cargo, active)
VALUES ('quinoneswash70@gmail.com', 'Washington Quiñones', 'SuperAdmin', 'Director General & Auditor', true)
ON CONFLICT (uid) DO NOTHING;

-- Insertar Productos Tecnológicos de Base
INSERT INTO public.products (id, company_id, name, sku, cost, price, tax, type, brand, model)
VALUES
('prod-1', 'co-1781210729382', 'Servicio de Consultoría y Soporte Digital Ya''bi', 'SRV-YABI-01', 50000, 180000, 19, 'servicio', 'Ya''bi', 'Cloud 2026'),
('prod-2', 'co-1781210729382', 'Mantenimiento Preventivo & Correctivo de Equipos', 'SRV-MANT-01', 40000, 120000, 19, 'servicio', 'FinteKia', 'Pro'),
('prod-3', 'co-1', 'Licencia FinteKia ERP Cloud Anual', 'LIC-FK-01', 100000, 450000, 19, 'servicio', 'FinteKia', 'Enterprise')
ON CONFLICT (id) DO NOTHING;

-- Verificación de tablas creadas
SELECT table_name, (SELECT count(*) FROM information_schema.columns WHERE table_name=t.table_name) as num_columns
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

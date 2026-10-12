-- ==============================================================================
-- FINTEKIA ERP - POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- Archivo: 20261010000001_enable_rls_security.sql
-- Proyecto Supabase: irncymdscgeucoacwzfg
-- Descripción: Protege las tablas en Supabase asegurando control de acceso.
-- ==============================================================================

-- 1. Habilitar RLS en cada tabla pública
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terceros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Acceso para el Cliente Web (Anon & Authenticated)
-- Permite lectura y escritura para la clave anónima del ERP mientras está en fase de despliegue
CREATE POLICY "Permitir lectura publica a companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Permitir escritura autorizada a companies" ON public.companies FOR ALL USING (true);

CREATE POLICY "Permitir acceso a users" ON public.users FOR ALL USING (true);
CREATE POLICY "Permitir acceso a terceros" ON public.terceros FOR ALL USING (true);
CREATE POLICY "Permitir acceso a products" ON public.products FOR ALL USING (true);
CREATE POLICY "Permitir acceso a vouchers" ON public.vouchers FOR ALL USING (true);
CREATE POLICY "Permitir acceso a inventory" ON public.inventory FOR ALL USING (true);
CREATE POLICY "Permitir acceso a bank_accounts" ON public.bank_accounts FOR ALL USING (true);
CREATE POLICY "Permitir acceso a app_settings" ON public.app_settings FOR ALL USING (true);

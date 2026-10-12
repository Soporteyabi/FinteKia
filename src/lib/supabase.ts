import { createClient } from '@supabase/supabase-js';

// Supabase project credentials for irncymdscgeucoacwzfg
export const SUPABASE_URL = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || 'https://irncymdscgeucoacwzfg.supabase.co';
export const SUPABASE_ANON_KEY = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybmN5bWRzY2dldWNvYWN3emZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NTY4MjQsImV4cCI6MjEwNzEzMjgyNH0.7H0wXKnYtxx_DGQy3n-S6Kh95GBKhUSAiVRERUzVbE8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Health check / test connection with Supabase
 */
export async function testSupabaseConnection() {
  try {
    const start = performance.now();
    const { data, error, count } = await supabase
      .from('companies')
      .select('*', { count: 'exact' })
      .limit(5);

    const latency = Math.round(performance.now() - start);

    if (error) {
      return {
        success: false,
        error: error.message,
        latency,
      };
    }

    return {
      success: true,
      data,
      count: count ?? data?.length ?? 0,
      latency,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error de conexión a Supabase',
      latency: 0,
    };
  }
}

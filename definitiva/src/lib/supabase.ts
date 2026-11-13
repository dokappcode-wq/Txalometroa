import { createClient } from '@supabase/supabase-js';
const variables = (import.meta as unknown as { env: Record<string,string> }).env;
export const googleHabilitado = variables.VITE_GOOGLE_AUTH_ENABLED === 'true';
export const gestionDatosHabilitada = variables.VITE_ACCOUNT_FUNCTION_ENABLED === 'true';
if (variables.VITE_SUPABASE_ANON_KEY?.startsWith('sb_secret_')) throw new Error('La app requiere la clave pública de Supabase.');
export const supabase = variables.VITE_SUPABASE_URL && variables.VITE_SUPABASE_ANON_KEY
  ? createClient(variables.VITE_SUPABASE_URL, variables.VITE_SUPABASE_ANON_KEY, {auth:{flowType:'pkce',detectSessionInUrl:true}}) : null;

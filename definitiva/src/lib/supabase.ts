import { createClient } from '@supabase/supabase-js';
const variables = (import.meta as unknown as { env: Record<string,string> }).env;
export const supabase = variables.VITE_SUPABASE_URL && variables.VITE_SUPABASE_ANON_KEY
  ? createClient(variables.VITE_SUPABASE_URL, variables.VITE_SUPABASE_ANON_KEY) : null;

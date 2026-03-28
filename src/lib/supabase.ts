import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ SUPABASE ERROR: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas no Vercel.');
}

// Ensure the client is created even with empty strings to avoid crashing the whole bundle,
// errors will be caught when trying to actually use the client.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

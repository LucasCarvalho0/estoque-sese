import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ SUPABASE ERROR: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas no Vercel.');
}

// Ensure the client is created even with empty strings to avoid crashing the whole bundle,
// errors will be caught when trying to actually use the client.
let supabaseInstance;
try {
  // Use a dummy valid URL to prevent library internal crashes on boot
  supabaseInstance = createClient(
    supabaseUrl || 'https://placeholder-v1.supabase.co', 
    supabaseAnonKey || 'placeholder'
  );
} catch (e) {
  console.error('CRITICAL: Erro ao criar cliente Supabase:', e);
  // Last resort dummy client to keep React alive
  supabaseInstance = { 
    auth: { signInWithPassword: async () => ({ error: { message: 'DB Indisponível' } }), signOut: async () => {} }, 
    from: () => ({ select: () => ({ order: () => ({ single: () => ({ data: null, error: null }) }) }) }) 
  } as any;
}

export const supabase = supabaseInstance;

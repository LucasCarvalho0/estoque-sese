import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || supabaseUrl === 'https://placeholder-v1.supabase.co' || !supabaseAnonKey || supabaseAnonKey === 'placeholder') {
  console.warn('⚠️ CONFIGURAÇÃO SUPABASE INCOMPLETA: Verifique as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
}

let supabaseInstance;
try {
  // Use the actual values or placeholders if absolutely necessary to prevent the app from crashing on start,
  // but log a clear error if we are using placeholders.
  const finalUrl = supabaseUrl || 'https://placeholder-v1.supabase.co';
  const finalKey = supabaseAnonKey || 'placeholder';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ ERRO CRÍTICO: Cliente Supabase inicializado SEM credenciais válidas. Todas as requisições irão falhar (Failed to fetch).');
  }

  supabaseInstance = createClient(finalUrl, finalKey);
} catch (e) {
  console.error('CRITICAL: Erro ao criar cliente Supabase:', e);
  // Last resort dummy client to keep React alive
  supabaseInstance = { 
    auth: { getUser: async () => ({ data: { user: null } }), signInWithPassword: async () => ({ error: { message: 'DB Indisponível' } }), signOut: async () => {} }, 
    from: () => ({ 
      select: () => ({ order: () => ({ single: () => ({ data: null, error: null }), range: () => ({ data: [], error: null }) }), gte: () => ({ order: () => ({ range: () => ({ data: [], error: null }) }) }), in: () => ({ order: () => ({ data: [], error: null }) }) }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: { message: 'DB Indisponível' } }) }) }),
      update: () => ({ eq: () => ({ error: { message: 'DB Indisponível' } }) }),
      delete: () => ({ eq: () => ({ error: { message: 'DB Indisponível' } }) })
    }) 
  } as any;
}

export const supabase = supabaseInstance;

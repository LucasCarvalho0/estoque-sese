import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Testando conexão com Supabase...');
console.log('URL:', supabaseUrl);
console.log('Key (prefixo):', supabaseAnonKey.substring(0, 15) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  try {
    console.log('Tentando inserir funcionário de teste...');
    const { data, error } = await supabase
      .from('employees')
      .insert({ name: 'Teste Antigravity', matricula: '99999', shift: '1', active: true })
      .select()
      .single();
      
    if (error) {
      console.error('Erro na inserção:', error.message);
      console.error('Código do erro:', error.code);
    } else {
      console.log('Inserção bem-sucedida! ID:', data.id);
      
      // Agora deleta para limpar
      await supabase.from('employees').delete().eq('id', data.id);
      console.log('Funcionário de teste removido.');
    }
  } catch (e) {
    console.error('Erro catastrófico:', e);
  }
}

test();

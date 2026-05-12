import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMovement() {
  try {
    console.log('1. Buscando um funcionário e uma ferramenta...');
    const { data: employees, error: empErr } = await supabase.from('employees').select('id').limit(1);
    const { data: tools, error: toolErr } = await supabase.from('tools').select('id').limit(1);

    if (empErr) { console.error('Erro ao buscar funcionários:', empErr); return; }
    if (toolErr) { console.error('Erro ao buscar ferramentas:', toolErr); return; }

    if (!employees?.length || !tools?.length) {
      console.error('ERRO: Preciso de pelo menos um funcionário e uma ferramenta no banco para o teste.');
      return;
    }

    const empId = employees[0].id;
    const toolId = tools[0].id;

    console.log(`2. Tentando inserir movimentação (Retirada) para Emp: ${empId}, Tool: ${toolId}...`);
    const { data, error } = await supabase
      .from('movements')
      .insert({
        employee_id: empId,
        tool_id: toolId,
        quantity: 1,
        shift: '1',
        status: 'retirada',
        signature: 'TEST_SIGNATURE_DATA_REPEATED_FOR_SIZE_'.repeat(10)
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro na inserção de movimentação:', error.message);
      console.error('Código:', error.code);
    } else {
      console.log('✅ Inserção de movimentação bem-sucedida! ID:', data.id);
      
      console.log('3. Limpando teste...');
      await supabase.from('movements').delete().eq('id', data.id);
      console.log('Teste limpo.');
    }
  } catch (e) {
    console.error('Erro catastrófico no teste:', e);
  }
}

testMovement();

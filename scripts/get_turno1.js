import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: movements, error } = await supabase
    .from('movements')
    .select('id, date, quantity, status, employees(name), tools(name, code)')
    .eq('shift', '1')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  let md = '# Movimentações do 1º Turno\n\n';
  md += '| Data | Funcionário | Ferramenta | Cód. | Qtd | Status |\n';
  md += '| --- | --- | --- | --- | --- | --- |\n';

  // Format the date using simple string manips to avoid timezone weirdness
  movements.forEach(m => {
    const d = new Date(m.date);
    const dateStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR');
    const empName = m.employees?.name || '---';
    const toolName = m.tools?.name || '---';
    const toolCode = m.tools?.code || '---';
    md += `| ${dateStr} | ${empName} | ${toolName} | ${toolCode} | ${m.quantity} | ${m.status} |\n`;
  });

  fs.writeFileSync('turno1_results.md', md);
  console.log('Saved to turno1_results.md');
}

run();

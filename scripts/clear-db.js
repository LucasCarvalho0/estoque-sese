import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearHistory() {
  console.log('Clearing movements and inventories...');
  
  const { error: errorMovements } = await supabase
    .from('movements')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
    
  if (errorMovements) {
    console.error('Error clearing movements:', errorMovements);
  } else {
    console.log('Movements cleared successfully.');
  }

  const { error: errorInventories } = await supabase
    .from('inventories')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
    
  if (errorInventories) {
    console.error('Error clearing inventories:', errorInventories);
  } else {
    console.log('Inventories cleared successfully.');
  }
}

clearHistory();

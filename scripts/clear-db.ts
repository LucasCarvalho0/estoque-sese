import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in .env.local');
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

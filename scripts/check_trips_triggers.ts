import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function run() {
  // Check RLS policies on trips
  const { data, error } = await supabase.rpc('get_trips_diagnostics' as any).catch(() => ({ data: null, error: null }));
  console.log('Trips diag:', data, error);
}

run();


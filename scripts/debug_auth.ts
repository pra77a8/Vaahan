import * as dotenv from 'dotenv';
dotenv.config();

import { getSupabaseConfigDiagnostics, isSupabaseConfigured } from '../src/lib/supabase';

console.log('Diagnostics:', getSupabaseConfigDiagnostics());
console.log('process.env.VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);

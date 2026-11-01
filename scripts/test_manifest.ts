import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';
import { getJourneyStudentManifest } from '../src/services/tripService';

async function testManifestService() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
  
  // Sign in as driver
  const { data: auth, error: aErr } = await supabase.auth.signInWithPassword({
    email: 'pranitadhangle908@gmail.com',
    password: 'password123',
  });

  console.log('Driver Login:', auth.user?.id, aErr?.message || 'Success');

  // Route 1 Morning ID: 71ef9ab8-1aec-479e-86f7-6bdeba5dd13e
  // Shift Morning ID: b7742e2d-ea82-48b4-8ff4-b6e7272a950c
  const manifest = await getJourneyStudentManifest('71ef9ab8-1aec-479e-86f7-6bdeba5dd13e', 'b7742e2d-ea82-48b4-8ff4-b6e7272a950c');
  console.log('Fetched manifest count for driver:', manifest.length);
  console.log('Manifest:', JSON.stringify(manifest, null, 2));
}

testManifestService().catch(console.error);

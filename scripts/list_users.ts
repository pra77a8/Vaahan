import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6YnJhbmNsdmhheHF5cGxic3JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDQ3NTEzNywiZXhwIjoyMDQ2MDUxMTM3fQ.0uC1PZ8jF2mN6P7lQ_4YxZ1a9C4c8w7B5X2r1V_9Y3k';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function listAll() {
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) {
    console.error('listUsers error:', error);
    return;
  }
  console.log('Total auth users:', data.users.length);
  for (const u of data.users) {
    console.log(`User: ${u.id} | ${u.email}`);
  }
}

listAll().catch(console.error);


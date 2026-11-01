import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fzbranclvhaxqyplbsrj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6YnJhbmNsdmhheHF5cGxic3JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDQ3NTEzNywiZXhwIjoyMDQ2MDUxMTM3fQ.0uC1PZ8jF2mN6P7lQ_4YxZ1a9C4c8w7B5X2r1V_9Y3k';

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspect() {
  const { data: stuckTrips, error: err1 } = await adminSupabase
    .from('trips')
    .select('*')
    .eq('status', 'IN_PROGRESS');
  console.log('Stuck in-progress trips:', stuckTrips, err1);
}

inspect().catch(console.error);

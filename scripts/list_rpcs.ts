import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function listRpc() {
  // Let's test calling some known RPCs or query schema
  const knownRpcs = [
    'start_driver_trip',
    'admin_approve_student',
    'admin_reject_student',
    'is_admin',
    'get_trips_diagnostics',
    'exec_sql',
    'run_sql',
    'execute_sql',
    'admin_assign_driver_bus',
  ];

  for (const fn of knownRpcs) {
    try {
      const { data, error } = await supabase.rpc(fn, {} as any);
      console.log(`RPC ${fn}:`, error ? `Error: ${error.message} (${error.code})` : 'Success:', data);
    } catch (e: any) {
      console.log(`RPC ${fn} exception:`, e.message);
    }
  }
}

listRpc();


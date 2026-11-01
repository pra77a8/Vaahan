import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function testRpc() {
  const { data, error } = await supabase.rpc('check_and_notify_expiring_passes');
  console.log('check_and_notify_expiring_passes response:', data, error);
}

testRpc().catch(console.error);


import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function checkNotifs() {
  await supabase.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });

  const { data: notifs, error } = await supabase.from('notifications').select('*');
  console.log('NOTIFICATIONS COUNT:', notifs?.length, error);
  for (const n of notifs || []) {
    console.log(`[${n.id}] User: ${n.user_id}, Title: ${n.title}, Msg: ${n.message}, Route: ${n.route_id}`);
  }
}

checkNotifs().catch(console.error);


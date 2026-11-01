import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function testDirectInsert() {
  await supabase.auth.signInWithPassword({ email: 'pranitadhangle908@gmail.com', password: 'password123' });
  const { data, error } = await supabase.from('notifications').insert({
    user_id: 'f93d8f92-67fa-4bec-a538-c486bfaf33d2',
    title: 'Direct Insert Test',
    message: 'Testing direct client insert with new policy',
    category: 'ROUTE_ALERT',
    route_id: '71ef9ab8-1aec-479e-86f7-6bdeba5dd13e',
    is_read: false
  }).select();
  console.log('Direct Insert result:', data, error);
}
testDirectInsert().catch(console.error);


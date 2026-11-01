import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function testStudentNotifs() {
  console.log('--- TESTING STUDENT NOTIFICATIONS RETRIEVAL & ACTIONS ---');
  // 1. Sign in as Priyanka Shinde
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'priyanka.shinde@kkwagh.edu.in',
    password: 'password123',
  });
  console.log('Priyanka signed in:', auth?.user?.id, authErr);

  // 2. Fetch notifications
  const { data: notifs, error: fetchErr } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  console.log('Fetched notifs count:', notifs?.length, fetchErr);
  if (notifs && notifs.length > 0) {
    console.log('Latest notif:', notifs[0].title, notifs[0].message, notifs[0].category, notifs[0].is_read);
  }

  // 3. Mark all read via RPC
  const { data: markRes, error: markErr } = await supabase.rpc('mark_all_user_notifications_read');
  console.log('mark_all_user_notifications_read RPC:', markRes, markErr);

  // 4. Verify is_read is true
  const { data: notifsAfter } = await supabase.from('notifications').select('id, is_read');
  console.log('After mark read:', notifsAfter);

  // 5. Test clear_user_notifications RPC
  const { data: clearRes, error: clearErr } = await supabase.rpc('clear_user_notifications');
  console.log('clear_user_notifications RPC:', clearRes, clearErr);

  const { data: notifsFinal } = await supabase.from('notifications').select('count');
  console.log('Final notifs count for Priyanka:', notifsFinal);
}

testStudentNotifs().catch(console.error);


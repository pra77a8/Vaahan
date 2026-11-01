import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function check() {
  const emails = [
    'varad@kkwagh.edu.in',
    'akash@kkwagh.edu.in',
    'pradhangle370125@kkwagh.edu.in',
    'priyanka.shinde@kkwagh.edu.in',
  ];

  for (const email of emails) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'password123',
    });
    console.log(`Login ${email}:`, data?.user ? 'SUCCESS' : `FAILED: ${error?.message}`);
    if (data?.user) {
      await supabase.auth.signOut();
    }
  }
}

check().catch(console.error);


import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function checkDriversAuth() {
  const drivers = [
    'ramesh.patil.driver@kkwagh.edu.in',
    'sanjay.deshmukh.driver@kkwagh.edu.in',
    'prakash.jadhav.driver@kkwagh.edu.in',
    'sachin.shinde.driver@kkwagh.edu.in',
    'ganesh.gaikwad.driver@kkwagh.edu.in',
    'balasaheb.sonawane.driver@kkwagh.edu.in',
    'pranitadhangle908@gmail.com',
  ];

  for (const d of drivers) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: d,
      password: 'password123',
    });
    console.log(`Driver ${d}:`, data?.user ? `SUCCESS (${data.user.id})` : `FAILED: ${error?.message}`);
    if (data?.user) {
      await supabase.auth.signOut();
    }
  }
}

checkDriversAuth().catch(console.error);


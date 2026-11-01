import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function testCreateOrder() {
  const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: { studentId: 'f93d8f92-67fa-4bec-a538-c486bfaf33d2' },
  });

  console.log('create-razorpay-order result:', data, error);
}

testCreateOrder().catch(console.error);


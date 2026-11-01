import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';
import * as crypto from 'crypto';

async function testVerification() {
  console.log('1. Testing invalid signature rejection...');
  const { data: invalidRes, error: invErr } = await supabase.functions.invoke('verify-razorpay-payment', {
    body: {
      razorpay_order_id: 'order_test_123',
      razorpay_payment_id: 'pay_fake_999',
      razorpay_signature: 'fake_signature_hex_1234567890abcdef',
      student_id: 'f93d8f92-67fa-4bec-a538-c486bfaf33d2',
    },
  });
  console.log('Invalid signature rejection response:', invalidRes, invErr);
}

testVerification().catch(console.error);


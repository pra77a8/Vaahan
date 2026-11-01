// =============================================================================
// SUPABASE EDGE FUNCTION: verify-razorpay-payment
// Location: supabase/functions/verify-razorpay-payment/index.ts
// Verifies HMAC-SHA256 signature and executes complete_pass_renewal RPC
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const text = `${orderId}|${paymentId}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(text));
  const hex = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.toLowerCase() === signature.toLowerCase();
}

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method Not Allowed. Expected POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!supabaseUrl || !serviceRoleKey || !keySecret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error (missing SUPABASE_URL, SERVICE_ROLE_KEY, or RAZORPAY_KEY_SECRET).',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      student_id,
      amount = 1.00,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !student_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, razorpay_signature, student_id.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Cryptographic HMAC-SHA256 signature verification
    const isValid = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      keySecret
    );

    if (!isValid) {
      console.error('Invalid Razorpay signature for payment:', razorpay_payment_id);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cryptographic signature verification failed. Transaction cannot be validated.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Signature is valid! Call complete_pass_renewal RPC via Supabase Service Client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('complete_pass_renewal', {
      p_student_id: student_id,
      p_order_id: razorpay_order_id,
      p_payment_id: razorpay_payment_id,
      p_signature: razorpay_signature,
      p_amount: amount,
    });

    if (rpcError) {
      console.error('complete_pass_renewal RPC error:', rpcError);
      return new Response(
        JSON.stringify({
          success: false,
          error: rpcError.message || 'Failed to update pass expiry in institutional database.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        data: rpcData,
        message: 'Payment verified and pass renewal completed successfully.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in verify-razorpay-payment:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal server error while verifying payment.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


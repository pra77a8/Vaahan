// =============================================================================
// SUPABASE EDGE FUNCTION: create-razorpay-order
// Location: supabase/functions/create-razorpay-order/index.ts
// Creates a ₹1.00 Razorpay order for Student Bus Pass Renewal (Test Mode)
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // 1. CORS Preflight
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
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Razorpay configuration missing on server (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET).',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const studentId = body.studentId || body.student_id;
    const notes = body.notes || {};

    // In Test Mode, the fee is fixed at ₹1.00 (100 paise)
    const amountInPaise = 100;
    const currency = 'INR';
    const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const authString = btoa(`${keyId}:${keySecret}`);

    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt,
        notes: {
          student_id: studentId || '',
          purpose: 'VAAHAN Bus Pass Renewal',
          ...notes,
        },
      }),
    });

    const orderData = await razorpayRes.json();

    if (!razorpayRes.ok) {
      console.error('Razorpay Order API error:', orderData);
      return new Response(
        JSON.stringify({
          success: false,
          error: orderData.error?.description || 'Failed to create Razorpay order.',
          details: orderData,
        }),
        { status: razorpayRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderData.id,
        amount: orderData.amount, // 100 paise (₹1)
        currency: orderData.currency,
        key_id: keyId,
        receipt: orderData.receipt,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in create-razorpay-order:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal server error while initiating Razorpay order.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


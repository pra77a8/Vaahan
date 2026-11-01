// =============================================================================
// SUPABASE EDGE FUNCTION: create-driver-account
// Location: supabase/functions/create-driver-account/index.ts
// Secure Driver Credential Provisioning by Transport Administrators
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateDriverPayload {
  fullName: string;
  email: string;
  phone: string;
  licenseNumber?: string;
  status?: 'active' | 'disabled';
  sendEmail?: boolean;
}

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method Not Allowed. Expected HTTP POST.',
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Supabase server configuration missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in Edge Function secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Authenticate the caller using their Bearer JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Authorization header. Admin authentication required.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bearer token missing from Authorization header.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reject if caller simply passed the anon key as the bearer token
    if (anonKey && token === anonKey.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Anonymous token provided. An active administrative user session token is required.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Privileged admin client to verify caller and execute secure admin auth operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Explicit server-side JWT verification against Supabase Auth
    const {
      data: { user: callingUser },
      error: userAuthError,
    } = await adminClient.auth.getUser(token);

    if (userAuthError || !callingUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unauthorized: ${userAuthError?.message || 'Invalid or expired administrative session token.'}`,
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify caller has 'admin' role in public.profiles (never trust client-supplied body roles)
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role, status')
      .eq('id', callingUser.id)
      .single();

    if (
      profileErr ||
      !callerProfile ||
      callerProfile.role !== 'admin' ||
      !['approved', 'active'].includes(callerProfile.status)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Forbidden: Access restricted to authorized Transport Cell administrators only.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Parse and validate payload
    let body: CreateDriverPayload;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Malformed request body. Valid JSON payload required.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fullName, email, phone, licenseNumber, status = 'active' } = body;

    if (!fullName?.trim() || !email?.trim() || !phone?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Driver Full Name, Email Address, and Mobile Phone are required fields.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please enter a valid driver email format.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Prevent duplicate driver accounts
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, email, role')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `An account with email "${cleanEmail}" is already registered (Role: ${existingProfile.role}). Duplicate driver creation is rejected.`,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Securely provision driver auth account via Supabase Auth Admin API
    let driverUserId: string | null = null;
    let invitationSent = false;
    let invitationLink: string | null = null;
    let emailWarning: string | null = null;

    if (body.sendEmail === false) {
      // Direct credential provisioning mode (generates invitation setup link without dispatching SMTP email)
      const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: false,
        user_metadata: {
          full_name: fullName.trim(),
          role: 'driver',
          phone: phone.trim(),
        },
      });

      if (createErr || !createData?.user) {
        const createErrMsg = createErr?.message || '';
        if (createErrMsg.toLowerCase().includes('already') || createErrMsg.toLowerCase().includes('exists')) {
          const { data: usersList } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 100 });
          const existingAuth = usersList?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (existingAuth) {
            driverUserId = existingAuth.id;
          } else {
            return new Response(
              JSON.stringify({
                success: false,
                error: `An authentication user with email "${cleanEmail}" already exists.`,
              }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to create driver authentication record: ${createErrMsg || 'Unknown Auth error'}`,
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        driverUserId = createData.user.id;
      }
    } else {
      // Attempt invitation email via Supabase Auth inviteUserByEmail
      const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        cleanEmail,
        {
          data: {
            full_name: fullName.trim(),
            role: 'driver',
            phone: phone.trim(),
          },
        }
      );

      if (!inviteErr && inviteData?.user) {
        driverUserId = inviteData.user.id;
        invitationSent = true;
      } else {
        const inviteErrMsg = inviteErr?.message || '';
        console.warn('inviteUserByEmail notice:', inviteErrMsg);

        if (inviteErrMsg.toLowerCase().includes('already') || inviteErrMsg.toLowerCase().includes('exists')) {
          // User already in auth.users table
          const { data: usersList } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 100 });
          const existingAuth = usersList?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (existingAuth) {
            driverUserId = existingAuth.id;
          } else {
            return new Response(
              JSON.stringify({
                success: false,
                error: `An authentication user with email "${cleanEmail}" already exists.`,
              }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          // SMTP unconfigured, rate-limited, or college domain rejection
          emailWarning = inviteErrMsg || 'Transactional email delivery unconfigured on Supabase SMTP.';

          const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
            email: cleanEmail,
            email_confirm: false,
            user_metadata: {
              full_name: fullName.trim(),
              role: 'driver',
              phone: phone.trim(),
            },
          });

          if (createErr || !createData?.user) {
            return new Response(
              JSON.stringify({
                success: false,
                error: `Failed to create driver authentication record: ${createErr?.message || 'Unknown Auth error'}`,
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          driverUserId = createData.user.id;
        }
      }
    }

    // Try generating an action link for credential setup without showing or storing passwords
    try {
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: 'invite',
        email: cleanEmail,
      });
      if (!linkErr && linkData?.properties?.action_link) {
        invitationLink = linkData.properties.action_link;
      }
    } catch (linkEx: any) {
      console.warn('generateLink notice:', linkEx?.message);
    }

    // 7. Insert or update public.profiles
    const badgeNumber = `KKW-DRV-${Math.floor(10 + Math.random() * 90)}`;
    const nowIso = new Date().toISOString();

    const { error: profileUpsertErr } = await adminClient.from('profiles').upsert({
      id: driverUserId,
      email: cleanEmail,
      full_name: fullName.trim(),
      phone: phone.trim(),
      role: 'driver',
      status: status,
      avatar_seed: fullName.trim().toLowerCase().replace(/\s+/g, '-'),
      avatar_bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (profileUpsertErr) {
      console.error('Profile upsert failure, rolling back auth user:', profileUpsertErr.message);
      await adminClient.auth.admin.deleteUser(driverUserId).catch(() => {});
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database profile synchronization failed: ${profileUpsertErr.message}`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Insert or update public.drivers
    const { error: driverUpsertErr } = await adminClient.from('drivers').upsert({
      id: driverUserId,
      license_number: licenseNumber?.trim() || null,
      badge_number: badgeNumber,
      experience_years: 5,
      rating: 4.9,
      created_at: nowIso,
    });

    if (driverUpsertErr) {
      console.error('Driver upsert failure, rolling back:', driverUpsertErr.message);
      await adminClient.from('profiles').delete().eq('id', driverUserId).catch(() => {});
      await adminClient.auth.admin.deleteUser(driverUserId).catch(() => {});
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database driver table synchronization failed: ${driverUpsertErr.message}`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Driver account provisioned successfully.',
        driver: {
          id: driverUserId,
          email: cleanEmail,
          fullName: fullName.trim(),
          phone: phone.trim(),
          role: 'driver',
          status: status,
          licenseNumber: licenseNumber?.trim() || undefined,
          badgeNumber: badgeNumber,
          experienceYears: 5,
          rating: 4.9,
          createdAt: nowIso,
        },
        invitationSent,
        invitationLink,
        emailWarning,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unexpected server error: ${err.message || String(err)}`,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

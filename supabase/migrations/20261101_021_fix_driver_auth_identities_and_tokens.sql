-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - MIGRATION 021
-- Comprehensive Fix for GoTrue Identity & Token Scan Requirements
-- 1. Updates admin_create_driver_with_password to insert auth.identities & non-null Go strings
-- 2. Updates admin_reset_driver_password with identity guarantee
-- 3. Backfills any missing identities and token defaults for all auth.users
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. BACKFILL ALL EXISTING AUTH.USERS TO SATISFY GOTRUE NON-NULL STRING SCANS
UPDATE auth.users
SET confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change IS NULL;

-- 2. BACKFILL ANY MISSING AUTH.IDENTITIES (Note: email is a generated column, do NOT insert into email)
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    u.id,
    jsonb_build_object(
        'sub', u.id::text,
        'email', LOWER(u.email),
        'email_verified', true,
        'full_name', COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', 'User'),
        'role', COALESCE(p.role, u.raw_user_meta_data->>'role', 'student')
    ),
    'email',
    u.id::text,
    NOW(),
    NOW(),
    NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'email'
WHERE i.id IS NULL AND u.email IS NOT NULL
ON CONFLICT (provider_id, provider) DO NOTHING;

-- 3. RECREATE admin_create_driver_with_password WITH FULL IDENTITY & TOKEN SPECIFICATION
CREATE OR REPLACE FUNCTION public.admin_create_driver_with_password(
    p_email TEXT,
    p_full_name TEXT,
    p_phone TEXT,
    p_license_number TEXT DEFAULT NULL,
    p_password TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_role TEXT;
    v_user_id UUID;
    v_encrypted_pw TEXT;
    v_badge_num TEXT;
    v_clean_email TEXT;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Forbidden: Administrative authorization required.');
    END IF;

    IF p_email IS NULL OR TRIM(p_email) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email address is required.');
    END IF;

    v_clean_email := LOWER(TRIM(p_email));

    IF p_password IS NOT NULL AND LENGTH(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters long.');
    END IF;

    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_clean_email;

    IF p_password IS NOT NULL AND LENGTH(p_password) >= 6 THEN
        v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));
    ELSE
        v_encrypted_pw := extensions.crypt('password123', extensions.gen_salt('bf'));
    END IF;

    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            email_change_token_current,
            phone_change,
            phone_change_token,
            reauthentication_token,
            raw_app_meta_data,
            raw_user_meta_data,
            is_sso_user,
            is_anonymous,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            v_clean_email,
            v_encrypted_pw,
            v_now,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('full_name', TRIM(p_full_name), 'role', 'driver'),
            false,
            false,
            v_now,
            v_now
        );
    ELSE
        IF p_password IS NOT NULL AND LENGTH(p_password) >= 6 THEN
            UPDATE auth.users
            SET encrypted_password = v_encrypted_pw,
                email_confirmed_at = COALESCE(email_confirmed_at, v_now),
                confirmation_token = COALESCE(confirmation_token, ''),
                recovery_token = COALESCE(recovery_token, ''),
                email_change_token_new = COALESCE(email_change_token_new, ''),
                email_change = COALESCE(email_change, ''),
                email_change_token_current = COALESCE(email_change_token_current, ''),
                phone_change = COALESCE(phone_change, ''),
                phone_change_token = COALESCE(phone_change_token, ''),
                reauthentication_token = COALESCE(reauthentication_token, ''),
                updated_at = v_now
            WHERE id = v_user_id;
        END IF;
    END IF;

    -- Upsert auth.identities (GoTrue requires this for grant_type=password)
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        jsonb_build_object(
            'sub', v_user_id::text,
            'email', v_clean_email,
            'email_verified', true,
            'full_name', TRIM(p_full_name),
            'role', 'driver'
        ),
        'email',
        v_user_id::text,
        v_now,
        v_now,
        v_now
    )
    ON CONFLICT (provider_id, provider) DO UPDATE SET
        identity_data = EXCLUDED.identity_data,
        updated_at = v_now;

    -- Upsert profile
    INSERT INTO public.profiles (
        id, email, full_name, phone, role, status, created_at, updated_at
    ) VALUES (
        v_user_id,
        v_clean_email,
        TRIM(p_full_name),
        TRIM(p_phone),
        'driver',
        COALESCE(p_status, 'active'),
        v_now,
        v_now
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        status = EXCLUDED.status,
        updated_at = v_now;

    -- Upsert driver
    v_badge_num := 'KKW-DRV-' || FLOOR(10 + RANDOM() * 90)::TEXT;
    INSERT INTO public.drivers (
        id, license_number, badge_number, experience_years, rating, created_at
    ) VALUES (
        v_user_id,
        TRIM(p_license_number),
        v_badge_num,
        5,
        4.9,
        v_now
    )
    ON CONFLICT (id) DO UPDATE SET
        license_number = COALESCE(EXCLUDED.license_number, public.drivers.license_number),
        badge_number = COALESCE(public.drivers.badge_number, EXCLUDED.badge_number);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Driver account created and credentials provisioned successfully.',
        'driver_id', v_user_id
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_create_driver_with_password(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 4. RECREATE admin_reset_driver_password WITH FULL IDENTITY & TOKEN SPECIFICATION
CREATE OR REPLACE FUNCTION public.admin_reset_driver_password(
    p_driver_id UUID,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_role TEXT;
    v_user_email TEXT;
    v_full_name TEXT;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Forbidden: Administrative authorization required.');
    END IF;

    IF LENGTH(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters long.');
    END IF;

    SELECT email, full_name INTO v_user_email, v_full_name FROM public.profiles WHERE id = p_driver_id;
    IF v_user_email IS NULL THEN
        SELECT email INTO v_user_email FROM auth.users WHERE id = p_driver_id;
    END IF;

    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, v_now),
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        phone_change = COALESCE(phone_change, ''),
        phone_change_token = COALESCE(phone_change_token, ''),
        reauthentication_token = COALESCE(reauthentication_token, ''),
        updated_at = v_now
    WHERE id = p_driver_id;

    IF v_user_email IS NOT NULL THEN
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            p_driver_id,
            jsonb_build_object(
                'sub', p_driver_id::text,
                'email', LOWER(v_user_email),
                'email_verified', true,
                'full_name', COALESCE(v_full_name, 'Driver'),
                'role', 'driver'
            ),
            'email',
            p_driver_id::text,
            v_now,
            v_now,
            v_now
        )
        ON CONFLICT (provider_id, provider) DO UPDATE SET
            identity_data = EXCLUDED.identity_data,
            updated_at = v_now;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Driver password updated successfully.');
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_reset_driver_password(UUID, TEXT) TO authenticated;

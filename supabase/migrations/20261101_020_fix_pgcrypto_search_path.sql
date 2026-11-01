-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - MIGRATION 020
-- Fix pgcrypto search_path in admin_create_driver_with_password and admin_reset_driver_password
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DROP FUNCTION IF EXISTS public.admin_create_driver_with_password(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_reset_driver_password(UUID, TEXT);

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
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Forbidden: Administrative authorization required.');
    END IF;

    IF p_email IS NULL OR TRIM(p_email) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email address is required.');
    END IF;

    IF p_password IS NOT NULL AND LENGTH(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters long.');
    END IF;

    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(TRIM(p_email));

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
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            LOWER(TRIM(p_email)),
            v_encrypted_pw,
            v_now,
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('full_name', TRIM(p_full_name), 'role', 'driver'),
            v_now,
            v_now
        );
    ELSE
        IF p_password IS NOT NULL AND LENGTH(p_password) >= 6 THEN
            UPDATE auth.users
            SET encrypted_password = v_encrypted_pw,
                email_confirmed_at = COALESCE(email_confirmed_at, v_now),
                updated_at = v_now
            WHERE id = v_user_id;
        END IF;
    END IF;

    -- Upsert profile
    INSERT INTO public.profiles (
        id, email, full_name, phone, role, status, created_at, updated_at
    ) VALUES (
        v_user_id,
        LOWER(TRIM(p_email)),
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
        license_number = COALESCE(EXCLUDED.license_number, public.drivers.license_number);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Driver account created and password provisioned successfully.',
        'driver_id', v_user_id
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_create_driver_with_password(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;


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
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Forbidden: Administrative authorization required.');
    END IF;

    IF LENGTH(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters long.');
    END IF;

    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, v_now),
        updated_at = v_now
    WHERE id = p_driver_id;

    RETURN jsonb_build_object('success', true, 'message', 'Driver password updated successfully.');
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_reset_driver_password(UUID, TEXT) TO authenticated;

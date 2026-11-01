-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - MIGRATION 009: SEED INSTITUTIONAL DRIVERS & FIXES
-- K. K. Wagh Institute of Engineering Education & Research, Nashik
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Ensure handle_new_user_role_safety recognizes postgres/superuser/service_role
CREATE OR REPLACE FUNCTION public.handle_new_user_role_safety()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_email TEXT;
    v_requested_role TEXT;
    v_clean_role TEXT;
    v_status TEXT;
    v_shift_id UUID;
    v_route_id UUID;
    v_pickup_stop_id UUID;
    v_raw_shift TEXT;
    v_raw_route TEXT;
    v_raw_stop TEXT;
    v_receipt_size BIGINT;
    v_academic_year TEXT;
    v_gender TEXT;
    v_clean_prn TEXT;
BEGIN
    v_email := LOWER(TRIM(NEW.email));
    v_requested_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));

    -- Guard: Allow 'driver' and 'admin' when created by postgres, service_role or admin
    IF v_requested_role IN ('admin', 'driver') THEN
        IF current_user IN ('postgres', 'service_role', 'supabase_admin') OR auth.role() IN ('service_role', 'supabase_admin') THEN
            v_clean_role := v_requested_role;
            v_status := CASE WHEN v_clean_role = 'driver' THEN 'active' ELSE 'approved' END;
        ELSE
            -- Force to student with pending approval to prevent public privilege escalation
            v_clean_role := 'student';
            v_status := 'pending_approval';
        END IF;
    ELSE
        v_clean_role := 'student';
        v_status := 'pending_approval';
    END IF;

    -- 1. Create or Update public.profiles
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        status,
        avatar_seed,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_email,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'User'),
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), '+91 00000 00000'),
        v_clean_role,
        v_status,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_seed'), ''), LOWER(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', 'user'), '[^a-zA-Z0-9]', '-', 'g'))),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        status = CASE 
            WHEN public.profiles.status = 'approved' THEN 'approved'
            WHEN public.profiles.status = 'active' THEN 'active'
            ELSE EXCLUDED.status 
        END,
        updated_at = NOW();

    -- 2. If student role, create or update public.students
    IF v_clean_role = 'student' THEN
        v_academic_year := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'academic_year', 'FE')));
        IF v_academic_year NOT IN ('FE', 'SE', 'TE', 'BE') THEN
            v_academic_year := CASE 
                WHEN v_academic_year LIKE '%FIRST%' OR v_academic_year = '1' THEN 'FE'
                WHEN v_academic_year LIKE '%SECOND%' OR v_academic_year = '2' THEN 'SE'
                WHEN v_academic_year LIKE '%THIRD%' OR v_academic_year = '3' THEN 'TE'
                WHEN v_academic_year LIKE '%FINAL%' OR v_academic_year LIKE '%FOURTH%' OR v_academic_year = '4' THEN 'BE'
                ELSE 'FE'
            END;
        END IF;

        v_gender := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'gender', 'other')));
        IF v_gender NOT IN ('female', 'male', 'other') THEN
            v_gender := 'other';
        END IF;

        v_clean_prn := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'prn', '')));
        IF v_clean_prn = '' THEN
            v_clean_prn := 'PRN-' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8);
        ELSIF EXISTS (SELECT 1 FROM public.students WHERE prn = v_clean_prn AND id <> NEW.id) THEN
            v_clean_prn := v_clean_prn || '-DUP-' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 4);
        END IF;

        BEGIN
            v_receipt_size := (NEW.raw_user_meta_data->>'fee_receipt_size')::BIGINT;
        EXCEPTION WHEN OTHERS THEN
            v_receipt_size := NULL;
        END;

        INSERT INTO public.students (
            id,
            prn,
            department,
            academic_year,
            division,
            gender,
            fee_receipt_path,
            fee_receipt_name,
            fee_receipt_size,
            fee_receipt_type,
            approval_status,
            registration_date,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            v_clean_prn,
            COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''), 'Engineering'),
            v_academic_year,
            COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'division'), ''), 'A'),
            v_gender,
            NEW.raw_user_meta_data->>'fee_receipt_path',
            NEW.raw_user_meta_data->>'fee_receipt_name',
            v_receipt_size,
            NEW.raw_user_meta_data->>'fee_receipt_type',
            'pending_approval',
            CURRENT_DATE,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            prn = EXCLUDED.prn,
            department = EXCLUDED.department,
            academic_year = EXCLUDED.academic_year,
            division = EXCLUDED.division,
            gender = EXCLUDED.gender,
            fee_receipt_path = COALESCE(EXCLUDED.fee_receipt_path, public.students.fee_receipt_path),
            fee_receipt_name = COALESCE(EXCLUDED.fee_receipt_name, public.students.fee_receipt_name),
            fee_receipt_size = COALESCE(EXCLUDED.fee_receipt_size, public.students.fee_receipt_size),
            fee_receipt_type = COALESCE(EXCLUDED.fee_receipt_type, public.students.fee_receipt_type),
            updated_at = NOW();

        -- Student transport assignment resolution
        v_raw_shift := TRIM(COALESCE(NEW.raw_user_meta_data->>'shift_id', ''));
        v_raw_route := TRIM(COALESCE(NEW.raw_user_meta_data->>'route_id', ''));
        v_raw_stop := TRIM(COALESCE(NEW.raw_user_meta_data->>'pickup_stop_id', ''));

        IF v_raw_shift ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            SELECT id INTO v_shift_id FROM public.shifts WHERE id = v_raw_shift::UUID;
        END IF;
        IF v_shift_id IS NULL AND v_raw_shift <> '' THEN
            SELECT id INTO v_shift_id FROM public.shifts 
            WHERE code = UPPER(v_raw_shift) OR name ILIKE '%' || v_raw_shift || '%' LIMIT 1;
        END IF;
        IF v_shift_id IS NULL THEN
            SELECT id INTO v_shift_id FROM public.shifts WHERE code = 'MORNING' LIMIT 1;
        END IF;

        IF v_raw_route ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            SELECT id INTO v_route_id FROM public.routes WHERE id = v_raw_route::UUID;
        END IF;
        IF v_route_id IS NULL AND v_raw_route <> '' THEN
            SELECT id INTO v_route_id FROM public.routes 
            WHERE (route_number = UPPER(v_raw_route) OR name ILIKE '%' || v_raw_route || '%')
              AND (v_shift_id IS NULL OR shift_id = v_shift_id)
            LIMIT 1;
        END IF;
        IF v_route_id IS NULL THEN
            SELECT id INTO v_route_id FROM public.routes 
            WHERE (v_shift_id IS NULL OR shift_id = v_shift_id) AND is_active = true 
            ORDER BY route_number ASC LIMIT 1;
        END IF;

        IF v_raw_stop ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            SELECT id INTO v_pickup_stop_id FROM public.stops WHERE id = v_raw_stop::UUID;
        END IF;
        IF v_pickup_stop_id IS NULL AND v_raw_stop <> '' THEN
            SELECT id INTO v_pickup_stop_id FROM public.stops 
            WHERE name ILIKE '%' || v_raw_stop || '%' LIMIT 1;
        END IF;
        IF v_pickup_stop_id IS NULL AND v_route_id IS NOT NULL THEN
            SELECT rs.stop_id INTO v_pickup_stop_id FROM public.route_stops rs 
            WHERE rs.route_id = v_route_id AND rs.is_pickup_eligible = true
            ORDER BY rs.sequence_number ASC LIMIT 1;
        END IF;
        IF v_pickup_stop_id IS NULL THEN
            SELECT id INTO v_pickup_stop_id FROM public.stops LIMIT 1;
        END IF;

        INSERT INTO public.student_transport (
            student_id,
            shift_id,
            route_id,
            pickup_stop_id,
            status,
            fee_receipt_path,
            fee_receipt_name,
            fee_receipt_size,
            fee_receipt_type,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            v_shift_id,
            v_route_id,
            v_pickup_stop_id,
            'pending_approval',
            NEW.raw_user_meta_data->>'fee_receipt_path',
            NEW.raw_user_meta_data->>'fee_receipt_name',
            v_receipt_size,
            NEW.raw_user_meta_data->>'fee_receipt_type',
            NOW(),
            NOW()
        )
        ON CONFLICT (student_id) DO UPDATE SET
            shift_id = EXCLUDED.shift_id,
            route_id = EXCLUDED.route_id,
            pickup_stop_id = EXCLUDED.pickup_stop_id,
            fee_receipt_path = COALESCE(EXCLUDED.fee_receipt_path, public.student_transport.fee_receipt_path),
            fee_receipt_name = COALESCE(EXCLUDED.fee_receipt_name, public.student_transport.fee_receipt_name),
            fee_receipt_size = COALESCE(EXCLUDED.fee_receipt_size, public.student_transport.fee_receipt_size),
            fee_receipt_type = COALESCE(EXCLUDED.fee_receipt_type, public.student_transport.fee_receipt_type),
            updated_at = NOW();
    END IF;

    -- 3. If driver role, ensure record in public.drivers exists
    IF v_clean_role = 'driver' THEN
        INSERT INTO public.drivers (id, experience_years, rating)
        VALUES (NEW.id, 5, 4.9)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Seed 6 Official Institutional Drivers into auth.users, public.profiles, and public.drivers
DO $$
DECLARE
    v_bus1 UUID;
    v_bus2 UUID;
    v_bus3 UUID;
    v_bus4 UUID;
    v_bus5 UUID;
    v_bus6 UUID;
BEGIN
    SELECT id INTO v_bus1 FROM public.buses WHERE bus_number = 'Bus 01' LIMIT 1;
    SELECT id INTO v_bus2 FROM public.buses WHERE bus_number = 'Bus 02' LIMIT 1;
    SELECT id INTO v_bus3 FROM public.buses WHERE bus_number = 'Bus 03' LIMIT 1;
    SELECT id INTO v_bus4 FROM public.buses WHERE bus_number = 'Bus 04' LIMIT 1;
    SELECT id INTO v_bus5 FROM public.buses WHERE bus_number = 'Bus 05' LIMIT 1;
    SELECT id INTO v_bus6 FROM public.buses WHERE bus_number = 'Bus 06' LIMIT 1;

    -- Driver 1: Ramesh Balu Patil
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, is_super_admin,
        confirmation_token, recovery_token, email_change, email_change_token_new,
        created_at, updated_at
    ) VALUES (
        'd0000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000000',
        'ramesh.patil.driver@kkwagh.edu.in',
        crypt('password123', gen_salt('bf', 10)),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Ramesh Balu Patil","role":"driver","phone":"+91 98231 45872"}'::jsonb,
        'authenticated', 'authenticated', false, '', '', '', '', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        encrypted_password = EXCLUDED.encrypted_password,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        is_super_admin = false,
        confirmation_token = '',
        recovery_token = '',
        email_change = '',
        email_change_token_new = '',
        email_confirmed_at = NOW(),
        updated_at = NOW();

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
        'd0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        jsonb_build_object('sub', 'd0000000-0000-0000-0000-000000000001', 'email', 'ramesh.patil.driver@kkwagh.edu.in', 'email_verified', true),
        'email', 'd0000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

    INSERT INTO public.profiles (id, email, full_name, phone, role, status, avatar_seed, avatar_bg, created_at, updated_at)
    VALUES (
        'd0000000-0000-0000-0000-000000000001',
        'ramesh.patil.driver@kkwagh.edu.in',
        'Ramesh Balu Patil',
        '+91 98231 45872',
        'driver',
        'active',
        'ramesh-patil',
        'bg-blue-100 text-blue-800 border-blue-300',
        NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'driver', status = 'active', full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

    INSERT INTO public.drivers (id, license_number, badge_number, experience_years, assigned_bus_id, rating)
    VALUES ('d0000000-0000-0000-0000-000000000001', 'MH-15-2012-0048192', 'KKW-DRV-04', 14, v_bus1, 4.9)
    ON CONFLICT (id) DO UPDATE SET
        license_number = EXCLUDED.license_number,
        badge_number = EXCLUDED.badge_number,
        experience_years = EXCLUDED.experience_years,
        assigned_bus_id = EXCLUDED.assigned_bus_id;

    -- Driver 2: Sanjay Vishwanath Deshmukh
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, is_super_admin,
        confirmation_token, recovery_token, email_change, email_change_token_new,
        created_at, updated_at
    ) VALUES (
        'd0000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000000',
        'sanjay.deshmukh.driver@kkwagh.edu.in',
        crypt('password123', gen_salt('bf', 10)),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Sanjay Vishwanath Deshmukh","role":"driver","phone":"+91 94222 19834"}'::jsonb,
        'authenticated', 'authenticated', false, '', '', '', '', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        encrypted_password = EXCLUDED.encrypted_password,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        is_super_admin = false,
        confirmation_token = '',
        recovery_token = '',
        email_change = '',
        email_change_token_new = '',
        email_confirmed_at = NOW(),
        updated_at = NOW();

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
        'd0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000002',
        jsonb_build_object('sub', 'd0000000-0000-0000-0000-000000000002', 'email', 'sanjay.deshmukh.driver@kkwagh.edu.in', 'email_verified', true),
        'email', 'd0000000-0000-0000-0000-000000000002', NOW(), NOW(), NOW()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

    INSERT INTO public.profiles (id, email, full_name, phone, role, status, avatar_seed, avatar_bg, created_at, updated_at)
    VALUES (
        'd0000000-0000-0000-0000-000000000002',
        'sanjay.deshmukh.driver@kkwagh.edu.in',
        'Sanjay Vishwanath Deshmukh',
        '+91 94222 19834',
        'driver',
        'active',
        'sanjay-deshmukh',
        'bg-emerald-100 text-emerald-800 border-emerald-300',
        NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'driver', status = 'active', full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

    INSERT INTO public.drivers (id, license_number, badge_number, experience_years, assigned_bus_id, rating)
    VALUES ('d0000000-0000-0000-0000-000000000002', 'MH-15-2014-0091823', 'KKW-DRV-07', 11, v_bus2, 4.8)
    ON CONFLICT (id) DO UPDATE SET
        license_number = EXCLUDED.license_number,
        badge_number = EXCLUDED.badge_number,
        experience_years = EXCLUDED.experience_years,
        assigned_bus_id = EXCLUDED.assigned_bus_id;

    -- Driver 3: Prakash Sudam Jadhav
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, is_super_admin,
        confirmation_token, recovery_token, email_change, email_change_token_new,
        created_at, updated_at
    ) VALUES (
        'd0000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000000',
        'prakash.jadhav.driver@kkwagh.edu.in',
        crypt('password123', gen_salt('bf', 10)),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Prakash Sudam Jadhav","role":"driver","phone":"+91 97654 32189"}'::jsonb,
        'authenticated', 'authenticated', false, '', '', '', '', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        encrypted_password = EXCLUDED.encrypted_password,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        is_super_admin = false,
        confirmation_token = '',
        recovery_token = '',
        email_change = '',
        email_change_token_new = '',
        email_confirmed_at = NOW(),
        updated_at = NOW();

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
        'd0000000-0000-0000-0000-000000000003',
        'd0000000-0000-0000-0000-000000000003',
        jsonb_build_object('sub', 'd0000000-0000-0000-0000-000000000003', 'email', 'prakash.jadhav.driver@kkwagh.edu.in', 'email_verified', true),
        'email', 'd0000000-0000-0000-0000-000000000003', NOW(), NOW(), NOW()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

    INSERT INTO public.profiles (id, email, full_name, phone, role, status, avatar_seed, avatar_bg, created_at, updated_at)
    VALUES (
        'd0000000-0000-0000-0000-000000000003',
        'prakash.jadhav.driver@kkwagh.edu.in',
        'Prakash Sudam Jadhav',
        '+91 97654 32189',
        'driver',
        'active',
        'prakash-jadhav',
        'bg-amber-100 text-amber-800 border-amber-300',
        NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'driver', status = 'active', full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

    INSERT INTO public.drivers (id, license_number, badge_number, experience_years, assigned_bus_id, rating)
    VALUES ('d0000000-0000-0000-0000-000000000003', 'MH-15-2010-0012984', 'KKW-DRV-09', 16, v_bus3, 4.9)
    ON CONFLICT (id) DO UPDATE SET
        license_number = EXCLUDED.license_number,
        badge_number = EXCLUDED.badge_number,
        experience_years = EXCLUDED.experience_years,
        assigned_bus_id = EXCLUDED.assigned_bus_id;

    -- Driver 4: Sachin Dattatray Shinde
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, is_super_admin,
        confirmation_token, recovery_token, email_change, email_change_token_new,
        created_at, updated_at
    ) VALUES (
        'd0000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000000',
        'sachin.shinde.driver@kkwagh.edu.in',
        crypt('password123', gen_salt('bf', 10)),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Sachin Dattatray Shinde","role":"driver","phone":"+91 98811 76543"}'::jsonb,
        'authenticated', 'authenticated', false, '', '', '', '', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        encrypted_password = EXCLUDED.encrypted_password,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        is_super_admin = false,
        confirmation_token = '',
        recovery_token = '',
        email_change = '',
        email_change_token_new = '',
        email_confirmed_at = NOW(),
        updated_at = NOW();

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
        'd0000000-0000-0000-0000-000000000004',
        'd0000000-0000-0000-0000-000000000004',
        jsonb_build_object('sub', 'd0000000-0000-0000-0000-000000000004', 'email', 'sachin.shinde.driver@kkwagh.edu.in', 'email_verified', true),
        'email', 'd0000000-0000-0000-0000-000000000004', NOW(), NOW(), NOW()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

    INSERT INTO public.profiles (id, email, full_name, phone, role, status, avatar_seed, avatar_bg, created_at, updated_at)
    VALUES (
        'd0000000-0000-0000-0000-000000000004',
        'sachin.shinde.driver@kkwagh.edu.in',
        'Sachin Dattatray Shinde',
        '+91 98811 76543',
        'driver',
        'active',
        'sachin-shinde',
        'bg-indigo-100 text-indigo-800 border-indigo-300',
        NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'driver', status = 'active', full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

    INSERT INTO public.drivers (id, license_number, badge_number, experience_years, assigned_bus_id, rating)
    VALUES ('d0000000-0000-0000-0000-000000000004', 'MH-15-2016-0078341', 'KKW-DRV-12', 9, v_bus4, 4.7)
    ON CONFLICT (id) DO UPDATE SET
        license_number = EXCLUDED.license_number,
        badge_number = EXCLUDED.badge_number,
        experience_years = EXCLUDED.experience_years,
        assigned_bus_id = EXCLUDED.assigned_bus_id;

    -- Driver 5: Ganesh Kisan Gaikwad
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, is_super_admin,
        confirmation_token, recovery_token, email_change, email_change_token_new,
        created_at, updated_at
    ) VALUES (
        'd0000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000000',
        'ganesh.gaikwad.driver@kkwagh.edu.in',
        crypt('password123', gen_salt('bf', 10)),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Ganesh Kisan Gaikwad","role":"driver","phone":"+91 95034 56712"}'::jsonb,
        'authenticated', 'authenticated', false, '', '', '', '', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        encrypted_password = EXCLUDED.encrypted_password,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        is_super_admin = false,
        confirmation_token = '',
        recovery_token = '',
        email_change = '',
        email_change_token_new = '',
        email_confirmed_at = NOW(),
        updated_at = NOW();

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
        'd0000000-0000-0000-0000-000000000005',
        'd0000000-0000-0000-0000-000000000005',
        jsonb_build_object('sub', 'd0000000-0000-0000-0000-000000000005', 'email', 'ganesh.gaikwad.driver@kkwagh.edu.in', 'email_verified', true),
        'email', 'd0000000-0000-0000-0000-000000000005', NOW(), NOW(), NOW()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

    INSERT INTO public.profiles (id, email, full_name, phone, role, status, avatar_seed, avatar_bg, created_at, updated_at)
    VALUES (
        'd0000000-0000-0000-0000-000000000005',
        'ganesh.gaikwad.driver@kkwagh.edu.in',
        'Ganesh Kisan Gaikwad',
        '+91 95034 56712',
        'driver',
        'active',
        'ganesh-gaikwad',
        'bg-teal-100 text-teal-800 border-teal-300',
        NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'driver', status = 'active', full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

    INSERT INTO public.drivers (id, license_number, badge_number, experience_years, assigned_bus_id, rating)
    VALUES ('d0000000-0000-0000-0000-000000000005', 'MH-15-2015-0065432', 'KKW-DRV-15', 10, v_bus5, 4.8)
    ON CONFLICT (id) DO UPDATE SET
        license_number = EXCLUDED.license_number,
        badge_number = EXCLUDED.badge_number,
        experience_years = EXCLUDED.experience_years,
        assigned_bus_id = EXCLUDED.assigned_bus_id;

    -- Driver 6: Balasaheb Eknath Sonawane
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, is_super_admin,
        confirmation_token, recovery_token, email_change, email_change_token_new,
        created_at, updated_at
    ) VALUES (
        'd0000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000000',
        'balasaheb.sonawane.driver@kkwagh.edu.in',
        crypt('password123', gen_salt('bf', 10)),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Balasaheb Eknath Sonawane","role":"driver","phone":"+91 99228 90123"}'::jsonb,
        'authenticated', 'authenticated', false, '', '', '', '', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        encrypted_password = EXCLUDED.encrypted_password,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        is_super_admin = false,
        confirmation_token = '',
        recovery_token = '',
        email_change = '',
        email_change_token_new = '',
        email_confirmed_at = NOW(),
        updated_at = NOW();

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
        'd0000000-0000-0000-0000-000000000006',
        'd0000000-0000-0000-0000-000000000006',
        jsonb_build_object('sub', 'd0000000-0000-0000-0000-000000000006', 'email', 'balasaheb.sonawane.driver@kkwagh.edu.in', 'email_verified', true),
        'email', 'd0000000-0000-0000-0000-000000000006', NOW(), NOW(), NOW()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

    INSERT INTO public.profiles (id, email, full_name, phone, role, status, avatar_seed, avatar_bg, created_at, updated_at)
    VALUES (
        'd0000000-0000-0000-0000-000000000006',
        'balasaheb.sonawane.driver@kkwagh.edu.in',
        'Balasaheb Eknath Sonawane',
        '+91 99228 90123',
        'driver',
        'active',
        'balasaheb-sonawane',
        'bg-rose-100 text-rose-800 border-rose-300',
        NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'driver', status = 'active', full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

    INSERT INTO public.drivers (id, license_number, badge_number, experience_years, assigned_bus_id, rating)
    VALUES ('d0000000-0000-0000-0000-000000000006', 'MH-15-2009-0034125', 'KKW-DRV-18', 18, v_bus6, 5.0)
    ON CONFLICT (id) DO UPDATE SET
        license_number = EXCLUDED.license_number,
        badge_number = EXCLUDED.badge_number,
        experience_years = EXCLUDED.experience_years,
        assigned_bus_id = EXCLUDED.assigned_bus_id;

END $$;

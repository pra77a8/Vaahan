-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - MIGRATION 007: ROBUST ATOMIC REGISTRATION TRIGGER
-- K. K. Wagh Institute of Engineering Education & Research, Nashik
--
-- Fixes:
-- 1. Updates validate_kkwagh_email() to be case-insensitive (prevents P0001 failures)
-- 2. Alters fee_receipt_size to BIGINT in students and student_transport (prevents integer overflow)
-- 3. In handle_new_user_role_safety():
--    - Normalizes email, role, academic_year, and gender to valid schema check constraints
--    - Handles PRN unique constraint safely (prevents 23505 unique violation crashes)
--    - Validates shift_id, route_id, pickup_stop_id exist in DB before insertion (prevents 23503 FK errors)
--    - Guarantees 100% atomic creation of profiles, students, and student_transport records
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 1. EXPAND RECEIPT SIZE TO BIGINT
-- -----------------------------------------------------------------------------
ALTER TABLE public.students 
    ALTER COLUMN fee_receipt_size TYPE BIGINT;

ALTER TABLE public.student_transport 
    ALTER COLUMN fee_receipt_size TYPE BIGINT;

-- -----------------------------------------------------------------------------
-- 2. CASE-INSENSITIVE COLLEGE EMAIL VALIDATION TRIGGER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_kkwagh_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NEW.role = 'student' THEN
        IF LOWER(TRIM(NEW.email)) NOT LIKE '%@kkwagh.edu.in' THEN
            RAISE EXCEPTION 'Student registration requires an official college email ending with @kkwagh.edu.in';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. ROBUST ATOMIC USER ONBOARDING TRIGGER
-- -----------------------------------------------------------------------------
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

    -- Guard: Only allow 'student' from public signups unless created by service-role
    IF v_requested_role IN ('admin', 'driver') THEN
        IF current_user = 'service_role' OR auth.role() = 'service_role' THEN
            v_clean_role := v_requested_role;
            v_status := CASE WHEN v_clean_role = 'driver' THEN 'active' ELSE 'approved' END;
        ELSE
            -- Force to student with pending approval to prevent privilege escalation
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
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(v_email, '@', 1)),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
        v_clean_role,
        v_status,
        LOWER(REPLACE(COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'student'), ' ', '-')),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        status = CASE 
            WHEN public.profiles.status = 'approved' THEN 'approved'
            ELSE EXCLUDED.status 
        END,
        updated_at = NOW();

    -- 2. If student role, create or update public.students
    IF v_clean_role = 'student' THEN
        -- Normalize academic year to schema constraint ('FE', 'SE', 'TE', 'BE')
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

        -- Normalize gender to schema constraint ('female', 'male', 'other')
        v_gender := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'gender', 'other')));
        IF v_gender NOT IN ('female', 'male', 'other') THEN
            v_gender := 'other';
        END IF;

        -- Normalize PRN and prevent 23505 unique constraint violation crash
        v_clean_prn := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'prn', '')));
        IF v_clean_prn = '' THEN
            v_clean_prn := 'PRN-' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8);
        ELSIF EXISTS (SELECT 1 FROM public.students WHERE prn = v_clean_prn AND id <> NEW.id) THEN
            -- In case of collision with another student's PRN, add safe suffix to preserve uniqueness
            v_clean_prn := v_clean_prn || '-DUP-' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 4);
        END IF;

        -- Parse receipt size safely
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
            NOW(),
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

        -- 3. Resolve shift, route, and stop foreign keys safely and verify existence
        v_raw_shift := NEW.raw_user_meta_data->>'shift_id';
        v_raw_route := NEW.raw_user_meta_data->>'route_id';
        v_raw_stop := NEW.raw_user_meta_data->>'pickup_stop_id';

        -- A. Shift resolution & validation (must be valid shifts.id)
        IF v_raw_shift IS NOT NULL AND v_raw_shift ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            SELECT id INTO v_shift_id FROM public.shifts WHERE id = v_raw_shift::UUID;
        END IF;
        IF v_shift_id IS NULL AND v_raw_shift IS NOT NULL THEN
            SELECT id INTO v_shift_id FROM public.shifts 
            WHERE code = CASE WHEN LOWER(v_raw_shift) LIKE '%general%' THEN 'GENERAL' ELSE 'MORNING' END
            LIMIT 1;
        END IF;
        IF v_shift_id IS NULL THEN
            SELECT id INTO v_shift_id FROM public.shifts ORDER BY start_time ASC LIMIT 1;
        END IF;

        -- B. Route resolution & validation (must be valid routes.id)
        IF v_raw_route IS NOT NULL AND v_raw_route ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            SELECT id INTO v_route_id FROM public.routes WHERE id = v_raw_route::UUID;
        END IF;
        IF v_route_id IS NULL AND v_raw_route IS NOT NULL THEN
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

        -- C. Pickup stop resolution & validation (must be valid stops.id)
        IF v_raw_stop IS NOT NULL AND v_raw_stop ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            SELECT id INTO v_pickup_stop_id FROM public.stops WHERE id = v_raw_stop::UUID;
        END IF;
        IF v_pickup_stop_id IS NULL AND v_raw_stop IS NOT NULL THEN
            SELECT id INTO v_pickup_stop_id FROM public.stops 
            WHERE name ILIKE '%' || v_raw_stop || '%'
            LIMIT 1;
        END IF;
        IF v_pickup_stop_id IS NULL AND v_route_id IS NOT NULL THEN
            SELECT rs.stop_id INTO v_pickup_stop_id FROM public.route_stops rs 
            WHERE rs.route_id = v_route_id AND rs.is_pickup_eligible = true
            ORDER BY rs.sequence_number ASC LIMIT 1;
        END IF;
        IF v_pickup_stop_id IS NULL THEN
            SELECT id INTO v_pickup_stop_id FROM public.stops LIMIT 1;
        END IF;

        -- D. Atomic insert/update into public.student_transport
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

    -- 4. If driver role, ensure record in public.drivers exists
    IF v_clean_role = 'driver' THEN
        INSERT INTO public.drivers (id, experience_years)
        VALUES (NEW.id, 5)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role_safety();

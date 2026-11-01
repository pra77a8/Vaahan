-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - MIGRATION 006: COMPLETE STUDENT REGISTRATION & RLS FIX
-- K. K. Wagh Institute of Engineering Education & Research, Nashik
--
-- Fixes:
-- 1. Prevents infinite RLS recursion by using SECURITY DEFINER role check functions
-- 2. Implements atomic AFTER INSERT trigger on auth.users for student onboarding
-- 3. Restricts role escalation (blocks public signup from claiming admin/driver)
-- 4. Enables safe onboarding fee receipt storage uploads
-- 5. Enables full admin visibility for student verifications
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 1. SECURITY DEFINER ROLE CHECK HELPERS (AVOID RLS INFINITE RECURSION)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND status IN ('approved', 'active')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_driver()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'driver' AND status IN ('approved', 'active')
    );
$$;

-- -----------------------------------------------------------------------------
-- 2. PROFILES RLS POLICIES (NON-RECURSIVE)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated 
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins full access to profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. STUDENTS RLS POLICIES (NON-RECURSIVE)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins full access to students" ON public.students;
DROP POLICY IF EXISTS "Students can view own record" ON public.students;
DROP POLICY IF EXISTS "Students can insert own record" ON public.students;
DROP POLICY IF EXISTS "Students can update own record" ON public.students;

CREATE POLICY "Students can view own record" ON public.students
    FOR SELECT TO authenticated 
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Students can insert own record" ON public.students
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Students can update own record" ON public.students
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins full access to students" ON public.students
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. STUDENT_TRANSPORT RLS POLICIES (NON-RECURSIVE)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins full access to student_transport" ON public.student_transport;
DROP POLICY IF EXISTS "Students can view own transport" ON public.student_transport;
DROP POLICY IF EXISTS "Students can insert own transport registration" ON public.student_transport;

CREATE POLICY "Students can view own transport" ON public.student_transport
    FOR SELECT TO authenticated 
    USING (auth.uid() = student_id OR public.is_admin());

CREATE POLICY "Students can insert own transport registration" ON public.student_transport
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = student_id OR public.is_admin());

CREATE POLICY "Admins full access to student_transport" ON public.student_transport
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 5. DRIVERS RLS POLICIES (NON-RECURSIVE)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins full access to drivers" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can view own profile" ON public.drivers;

CREATE POLICY "Drivers can view own profile" ON public.drivers
    FOR SELECT TO authenticated 
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins full access to drivers" ON public.drivers
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 6. ATOMIC BACKEND TRIGGER: handle_new_user_role_safety()
-- Creates profiles, students, and student_transport atomically with SECURITY DEFINER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_role_safety()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
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
BEGIN
    v_requested_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));

    -- Guard: Only allow 'student' from public signups unless created by service-role or admin
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
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'phone',
        v_clean_role,
        v_status,
        LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', 'student'), ' ', '-')),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        status = CASE 
            WHEN public.profiles.status = 'approved' THEN 'approved'
            ELSE EXCLUDED.status 
        END,
        updated_at = NOW();

    -- 2. If student role, create or update public.students
    IF v_clean_role = 'student' THEN
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
            COALESCE(NEW.raw_user_meta_data->>'prn', 'PRN-' || SUBSTRING(NEW.id::text, 1, 8)),
            COALESCE(NEW.raw_user_meta_data->>'department', 'Engineering'),
            COALESCE(NEW.raw_user_meta_data->>'academic_year', 'FE'),
            COALESCE(NEW.raw_user_meta_data->>'division', 'A'),
            COALESCE(NEW.raw_user_meta_data->>'gender', 'other'),
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

        -- 3. Resolve shift, route, and stop foreign keys for public.student_transport
        v_raw_shift := NEW.raw_user_meta_data->>'shift_id';
        v_raw_route := NEW.raw_user_meta_data->>'route_id';
        v_raw_stop := NEW.raw_user_meta_data->>'pickup_stop_id';

        IF v_raw_shift IS NOT NULL THEN
            IF v_raw_shift ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                v_shift_id := v_raw_shift::UUID;
            ELSE
                SELECT id INTO v_shift_id FROM public.shifts 
                WHERE code = CASE WHEN LOWER(v_raw_shift) LIKE '%morning%' THEN 'MORNING' ELSE 'GENERAL' END
                LIMIT 1;
            END IF;
        END IF;

        IF v_raw_route IS NOT NULL THEN
            IF v_raw_route ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                v_route_id := v_raw_route::UUID;
            ELSE
                SELECT id INTO v_route_id FROM public.routes 
                WHERE route_number = UPPER(v_raw_route) 
                   OR name ILIKE '%' || v_raw_route || '%'
                LIMIT 1;
            END IF;
        END IF;

        IF v_raw_stop IS NOT NULL THEN
            IF v_raw_stop ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                v_pickup_stop_id := v_raw_stop::UUID;
            ELSE
                SELECT id INTO v_pickup_stop_id FROM public.stops 
                WHERE name ILIKE '%' || v_raw_stop || '%'
                LIMIT 1;
            END IF;
        END IF;

        -- If all 3 keys resolved, insert into public.student_transport
        IF v_shift_id IS NOT NULL AND v_route_id IS NOT NULL AND v_pickup_stop_id IS NOT NULL THEN
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

-- -----------------------------------------------------------------------------
-- 7. FEE RECEIPTS STORAGE POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow registration upload to fee-receipts" ON storage.objects;
CREATE POLICY "Allow registration upload to fee-receipts"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'fee-receipts');

DROP POLICY IF EXISTS "Allow registration update to fee-receipts" ON storage.objects;
CREATE POLICY "Allow registration update to fee-receipts"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'fee-receipts')
WITH CHECK (bucket_id = 'fee-receipts');

DROP POLICY IF EXISTS "Allow registration select to fee-receipts" ON storage.objects;
CREATE POLICY "Allow registration select to fee-receipts"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'fee-receipts');

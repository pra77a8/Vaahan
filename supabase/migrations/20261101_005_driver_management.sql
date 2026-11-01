-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - DRIVER MANAGEMENT & ROLE ENFORCEMENT MIGRATION
-- K. K. Wagh Institute of Engineering Education & Research, Nashik
-- Migration: 20261101_005_driver_management.sql
-- =============================================================================

-- 1. Extend public.profiles status constraint to support 'active' and 'disabled'
ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_status_check 
    CHECK (status IN ('pending_approval', 'approved', 'rejected', 'blocked', 'active', 'disabled'));

-- 2. Allow optional license_number & auto-generated badge_number in public.drivers
ALTER TABLE public.drivers 
    ALTER COLUMN license_number DROP NOT NULL;

ALTER TABLE public.drivers 
    ALTER COLUMN badge_number DROP NOT NULL;

-- 3. Enhance RLS Policies for Driver Management by Transport Admins
-- Drop existing policies if need to recreate cleanly
DROP POLICY IF EXISTS "Admins full access to drivers" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can view own profile" ON public.drivers;

-- Driver can only view their own driver profile record
CREATE POLICY "Drivers can view own profile" ON public.drivers
    FOR SELECT TO authenticated 
    USING (auth.uid() = id);

-- Admin has full access to drivers table
CREATE POLICY "Admins full access to drivers" ON public.drivers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin' AND status IN ('approved', 'active')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin' AND status IN ('approved', 'active')
        )
    );

-- Admin can manage driver profiles in public.profiles table
DROP POLICY IF EXISTS "Admins full access to profiles" ON public.profiles;
CREATE POLICY "Admins full access to profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin' AND status IN ('approved', 'active')
        )
    );

-- 4. Enforce that Disabled Drivers cannot start trips or insert live locations
CREATE OR REPLACE FUNCTION public.check_driver_active_before_trip()
RETURNS TRIGGER AS $$
DECLARE
    v_driver_status TEXT;
BEGIN
    SELECT status INTO v_driver_status
    FROM public.profiles
    WHERE id = NEW.driver_id;

    IF v_driver_status IS NULL THEN
        RAISE EXCEPTION 'Driver account not found.';
    END IF;

    IF v_driver_status IN ('disabled', 'blocked', 'rejected') THEN
        RAISE EXCEPTION 'Driver account is % and cannot start or operate transit trips.', v_driver_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_driver_active_before_trip ON public.trips;
CREATE TRIGGER trg_check_driver_active_before_trip
    BEFORE INSERT OR UPDATE ON public.trips
    FOR EACH ROW
    WHEN (NEW.status IN ('IN_PROGRESS', 'NOT_STARTED'))
    EXECUTE FUNCTION public.check_driver_active_before_trip();

-- 5. Security Guard: Prevent Public Registration from claiming 'driver' or 'admin' roles
CREATE OR REPLACE FUNCTION public.handle_new_user_role_safety()
RETURNS TRIGGER AS $$
DECLARE
    v_requested_role TEXT;
    v_clean_role TEXT;
    v_status TEXT;
BEGIN
    v_requested_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));

    -- Only allow 'student' from public signups unless created by service-role or admin
    IF v_requested_role IN ('admin', 'driver') THEN
        -- If current auth role is service_role or created by admin, allow
        IF current_user = 'service_role' OR auth.role() = 'service_role' THEN
            v_clean_role := v_requested_role;
            v_status := CASE WHEN v_clean_role = 'driver' THEN 'active' ELSE 'approved' END;
        ELSE
            -- Force to student with pending approval
            v_clean_role := 'student';
            v_status := 'pending_approval';
        END IF;
    ELSE
        v_clean_role := 'student';
        v_status := 'pending_approval';
    END IF;

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
        LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', 'user'), ' ', '-')),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        updated_at = NOW();

    -- If driver role was granted via service_role, ensure record in public.drivers exists
    IF v_clean_role = 'driver' THEN
        INSERT INTO public.drivers (id, experience_years)
        VALUES (NEW.id, 5)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users if not already attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role_safety();

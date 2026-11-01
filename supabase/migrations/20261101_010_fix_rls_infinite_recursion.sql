-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - MIGRATION 010: FIX RLS INFINITE RECURSION ON TRIPS & LOCATIONS
-- K. K. Wagh Institute of Engineering Education & Research, Nashik
-- =============================================================================

-- 1. Helper security definer functions to bypass RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_driver_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('driver', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_trip(p_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.trips
        WHERE id = p_trip_id AND (
            driver_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role IN ('driver', 'admin')
            )
        )
    );
$$;

-- 2. Clean up conflicting and recursive policies on trips, trip_stops, and live_locations
DROP POLICY IF EXISTS "Drivers can manage own trips" ON public.trips;
DROP POLICY IF EXISTS "Admins full access to trips and locations" ON public.trips;
DROP POLICY IF EXISTS "Students can view eligible active trips" ON public.trips;
DROP POLICY IF EXISTS "Anyone authenticated can view trips" ON public.trips;
DROP POLICY IF EXISTS "Drivers and admins can insert trips" ON public.trips;
DROP POLICY IF EXISTS "Drivers and admins can update trips" ON public.trips;
DROP POLICY IF EXISTS "Drivers and admins can delete trips" ON public.trips;

-- Clean, non-recursive policies on trips:
-- A. SELECT: All authenticated users (drivers, students, admins) and public can view trips
CREATE POLICY "Anyone can view trips"
ON public.trips FOR SELECT
USING (true);

-- B. INSERT: Authenticated driver for their own driver_id or admin
CREATE POLICY "Drivers and admins can insert trips"
ON public.trips FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = driver_id OR public.is_driver_or_admin()
);

-- C. UPDATE: Driver for their own trip or admin
CREATE POLICY "Drivers and admins can update trips"
ON public.trips FOR UPDATE
TO authenticated
USING (
    auth.uid() = driver_id OR public.is_driver_or_admin()
)
WITH CHECK (
    auth.uid() = driver_id OR public.is_driver_or_admin()
);

-- D. DELETE: Admin or assigned driver
CREATE POLICY "Drivers and admins can delete trips"
ON public.trips FOR DELETE
TO authenticated
USING (
    auth.uid() = driver_id OR public.is_admin()
);

-- 3. Clean policies on trip_stops
DROP POLICY IF EXISTS "Drivers can manage trip_stops" ON public.trip_stops;
DROP POLICY IF EXISTS "Anyone authenticated can view trip stops" ON public.trip_stops;
DROP POLICY IF EXISTS "Drivers and admins can manage trip stops" ON public.trip_stops;

CREATE POLICY "Anyone can view trip stops"
ON public.trip_stops FOR SELECT
USING (true);

CREATE POLICY "Authorized can insert trip stops"
ON public.trip_stops FOR INSERT
TO authenticated
WITH CHECK (
    public.can_manage_trip(trip_id)
);

CREATE POLICY "Authorized can update trip stops"
ON public.trip_stops FOR UPDATE
TO authenticated
USING (
    public.can_manage_trip(trip_id)
)
WITH CHECK (
    public.can_manage_trip(trip_id)
);

CREATE POLICY "Authorized can delete trip stops"
ON public.trip_stops FOR DELETE
TO authenticated
USING (
    public.can_manage_trip(trip_id)
);

-- 4. Clean policies on live_locations
DROP POLICY IF EXISTS "Drivers can insert live locations" ON public.live_locations;
DROP POLICY IF EXISTS "Students can view eligible trip locations" ON public.live_locations;
DROP POLICY IF EXISTS "Anyone can read live locations" ON public.live_locations;
DROP POLICY IF EXISTS "Drivers and admins can insert live locations" ON public.live_locations;

CREATE POLICY "Anyone can read live locations"
ON public.live_locations FOR SELECT
USING (true);

CREATE POLICY "Authorized can insert live locations"
ON public.live_locations FOR INSERT
TO authenticated
WITH CHECK (
    public.can_manage_trip(trip_id)
);

CREATE POLICY "Authorized can delete live locations"
ON public.live_locations FOR DELETE
TO authenticated
USING (
    public.can_manage_trip(trip_id)
);

-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - RLS POLICIES & SECURITY DEFINER FUNCTIONS
-- =============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. PUBLIC / SHARED REFERENCE DATA POLICIES
-- Shifts, Routes, Stops & Route_Stops must be readable for registration & timetable
-- -----------------------------------------------------------------------------
CREATE POLICY "Public read access for shifts" ON public.shifts
    FOR SELECT TO public USING (true);

CREATE POLICY "Public read access for active routes" ON public.routes
    FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Public read access for stops" ON public.stops
    FOR SELECT TO public USING (true);

CREATE POLICY "Public read access for route_stops" ON public.route_stops
    FOR SELECT TO public USING (true);

CREATE POLICY "Public read access for buses" ON public.buses
    FOR SELECT TO authenticated USING (true);

-- -----------------------------------------------------------------------------
-- 2. PROFILES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins have full access to profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
        )
    );

-- -----------------------------------------------------------------------------
-- 3. STUDENTS & TRANSPORT ASSIGNMENT POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Students can view own record" ON public.students
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Students can insert own record" ON public.students
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Students can update own record" ON public.students
    FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins full access to students" ON public.students
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
        )
    );

CREATE POLICY "Students can view own transport" ON public.student_transport
    FOR SELECT TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own transport registration" ON public.student_transport
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins full access to student_transport" ON public.student_transport
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
        )
    );

-- -----------------------------------------------------------------------------
-- 4. DRIVER POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Drivers can view own profile" ON public.drivers
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins full access to drivers" ON public.drivers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
        )
    );

-- -----------------------------------------------------------------------------
-- 5. TRIPS & TRIP_STOPS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Drivers can manage own trips" ON public.trips
    FOR ALL TO authenticated
    USING (auth.uid() = driver_id)
    WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can manage trip_stops" ON public.trip_stops
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.trips 
            WHERE trips.id = trip_stops.trip_id AND trips.driver_id = auth.uid()
        )
    );

CREATE POLICY "Drivers can insert live locations" ON public.live_locations
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.trips 
            WHERE trips.id = live_locations.trip_id AND trips.driver_id = auth.uid()
        )
    );

CREATE POLICY "Admins full access to trips and locations" ON public.trips
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
        )
    );

-- -----------------------------------------------------------------------------
-- 6. STUDENT-SPECIFIC TRIP & LOCATION VISIBILITY (ROW LEVEL SECURITY)
-- Approved students can ONLY view trips if:
--   1. The student is approved.
--   2. The trip is in status 'IN_PROGRESS'.
--   3. The trip matches the student's approved shift and route.
--   4. The student's pickup stop is in the trip's stops and has not been passed yet.
-- -----------------------------------------------------------------------------
CREATE POLICY "Students can view eligible active trips" ON public.trips
    FOR SELECT TO authenticated
    USING (
        status = 'IN_PROGRESS'
        AND EXISTS (
            SELECT 1 
            FROM public.student_transport st
            JOIN public.profiles p ON p.id = st.student_id
            JOIN public.trip_stops ts ON ts.trip_id = trips.id
            WHERE st.student_id = auth.uid()
              AND p.status = 'approved'
              AND st.status = 'approved'
              AND st.shift_id = trips.shift_id
              AND st.route_id = trips.route_id
              AND ts.stop_id = st.pickup_stop_id
              AND ts.status = 'PENDING'
        )
    );

CREATE POLICY "Students can view eligible trip locations" ON public.live_locations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.trips t
            JOIN public.student_transport st ON st.shift_id = t.shift_id AND st.route_id = t.route_id
            JOIN public.profiles p ON p.id = st.student_id
            JOIN public.trip_stops ts ON ts.trip_id = t.id AND ts.stop_id = st.pickup_stop_id
            WHERE t.id = live_locations.trip_id
              AND t.status = 'IN_PROGRESS'
              AND st.student_id = auth.uid()
              AND p.status = 'approved'
              AND st.status = 'approved'
              AND ts.status = 'PENDING'
        )
    );

-- -----------------------------------------------------------------------------
-- 7. BUS PASSES & PAYMENTS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Students can view own bus pass" ON public.bus_passes
    FOR SELECT TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "Students can view own payments" ON public.payments
    FOR SELECT TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read" ON public.notifications
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 8. SECURITY DEFINER HELPER: GET ELIGIBLE ACTIVE TRIP FOR STUDENT
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_student_eligible_trip(p_student_id UUID)
RETURNS TABLE (
    trip_id UUID,
    route_name TEXT,
    route_number TEXT,
    shift_name TEXT,
    bus_number TEXT,
    bus_plate TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    started_at TIMESTAMPTZ,
    pickup_stop_name TEXT,
    pickup_stop_status TEXT,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    current_speed DOUBLE PRECISION
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id AS trip_id,
        r.name AS route_name,
        r.route_number AS route_number,
        s.name AS shift_name,
        b.bus_number AS bus_number,
        b.plate_number AS bus_plate,
        p_drv.full_name AS driver_name,
        p_drv.phone AS driver_phone,
        t.started_at,
        st_stop.name AS pickup_stop_name,
        ts.status AS pickup_stop_status,
        loc.latitude AS current_lat,
        loc.longitude AS current_lng,
        loc.speed_kmh AS current_speed
    FROM public.trips t
    JOIN public.routes r ON r.id = t.route_id
    JOIN public.shifts s ON s.id = t.shift_id
    JOIN public.buses b ON b.id = t.bus_id
    JOIN public.profiles p_drv ON p_drv.id = t.driver_id
    JOIN public.student_transport st ON st.shift_id = t.shift_id AND st.route_id = t.route_id
    JOIN public.profiles p_std ON p_std.id = st.student_id
    JOIN public.stops st_stop ON st_stop.id = st.pickup_stop_id
    JOIN public.trip_stops ts ON ts.trip_id = t.id AND ts.stop_id = st.pickup_stop_id
    LEFT JOIN LATERAL (
        SELECT latitude, longitude, speed_kmh
        FROM public.live_locations ll
        WHERE ll.trip_id = t.id
        ORDER BY ll.recorded_at DESC
        LIMIT 1
    ) loc ON true
    WHERE st.student_id = p_student_id
      AND p_std.status = 'approved'
      AND st.status = 'approved'
      AND t.status = 'IN_PROGRESS'
      AND ts.status = 'PENDING'
    LIMIT 1;
END;
$$;

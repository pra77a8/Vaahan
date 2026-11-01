-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - ENHANCEMENT MIGRATION 008
-- Route-Based Bus Tracking, Directional Journeys, Trip Management, and Fleet Records
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENHANCE TRIPS TABLE
-- -----------------------------------------------------------------------------
ALTER TABLE public.trips 
    ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'TO_COLLEGE' CHECK (direction IN ('TO_COLLEGE', 'RETURNING_HOME')),
    ADD COLUMN IF NOT EXISTS trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'LIVE_GPS' CHECK (mode IN ('LIVE_GPS', 'SIMULATION')),
    ADD COLUMN IF NOT EXISTS assigned_student_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS boarded_student_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Make source_stop_id and destination_stop_id optional if directional journey defaults are used
ALTER TABLE public.trips ALTER COLUMN source_stop_id DROP NOT NULL;
ALTER TABLE public.trips ALTER COLUMN destination_stop_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trips_bus_status ON public.trips(bus_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_route_shift_status ON public.trips(route_id, shift_id, direction, status);
CREATE INDEX IF NOT EXISTS idx_trips_driver_status ON public.trips(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_date ON public.trips(trip_date);

-- -----------------------------------------------------------------------------
-- 2. CREATE DIRECTIONAL ROUTE STOPS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.route_direction_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('TO_COLLEGE', 'RETURNING_HOME')),
    sequence_number INTEGER NOT NULL,
    stop_id UUID NOT NULL REFERENCES public.stops(id) ON DELETE RESTRICT,
    pickup_time TEXT,
    drop_time TEXT,
    is_student_stop BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_route_direction_seq UNIQUE (route_id, direction, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_route_direction_stops_query ON public.route_direction_stops(route_id, direction, sequence_number);

-- -----------------------------------------------------------------------------
-- 3. ENHANCE BUSES TABLE (VEHICLE MAINTENANCE & DOCUMENTS, ZERO FUEL)
-- -----------------------------------------------------------------------------
ALTER TABLE public.buses
    ADD COLUMN IF NOT EXISTS rc_expiry DATE,
    ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
    ADD COLUMN IF NOT EXISTS fitness_expiry DATE,
    ADD COLUMN IF NOT EXISTS permit_expiry DATE,
    ADD COLUMN IF NOT EXISTS puc_expiry DATE,
    ADD COLUMN IF NOT EXISTS last_service_date DATE,
    ADD COLUMN IF NOT EXISTS maintenance_remarks TEXT;

-- -----------------------------------------------------------------------------
-- 4. CREATE VEHICLE MAINTENANCE RECORDS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bus_maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
    maintenance_type TEXT NOT NULL,
    description TEXT NOT NULL,
    serviced_at DATE NOT NULL,
    next_service_due DATE,
    cost NUMERIC(10,2),
    service_center TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 5. POPULATE OFFICIAL DIRECTIONAL STOPS FOR MORNING AND GENERAL SHIFTS
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    -- Morning Routes
    v_m_r1 UUID;
    v_m_r2 UUID;
    v_m_r3 UUID;
    v_m_r4 UUID;
    v_m_r5 UUID;

    -- General Routes
    v_g_r1 UUID;
    v_g_r2 UUID;
    v_g_r3 UUID;
    v_g_r4 UUID;

    -- Helper
    v_kkwagh UUID;
BEGIN
    -- Resolve Stop ID for College Campus
    SELECT id INTO v_kkwagh FROM public.stops WHERE name = 'K K Wagh Education Society' LIMIT 1;

    -- Resolve Morning Shift Route IDs
    SELECT r.id INTO v_m_r1 FROM public.routes r JOIN public.shifts s ON r.shift_id = s.id WHERE s.code = 'MORNING' AND r.route_number = 'ROUTE 1';
    SELECT r.id INTO v_m_r2 FROM public.routes r JOIN public.shifts s ON r.shift_id = s.id WHERE s.code = 'MORNING' AND r.route_number = 'ROUTE 2';
    SELECT r.id INTO v_m_r3 FROM public.routes r JOIN public.shifts s ON r.shift_id = s.id WHERE s.code = 'MORNING' AND r.route_number = 'ROUTE 3';
    SELECT r.id INTO v_m_r4 FROM public.routes r JOIN public.shifts s ON r.shift_id = s.id WHERE s.code = 'MORNING' AND r.route_number = 'ROUTE 4';
    SELECT r.id INTO v_m_r5 FROM public.routes r JOIN public.shifts s ON r.shift_id = s.id WHERE s.code = 'MORNING' AND r.route_number = 'ROUTE 5';

    -- Resolve General Shift Route IDs
    SELECT r.id INTO v_g_r1 FROM public.routes r JOIN public.shifts s ON r.shift_id = s.id WHERE s.code = 'GENERAL' AND r.route_number = 'ROUTE 1';
    SELECT r.id INTO v_g_r2 FROM public.routes r JOIN public.shifts s ON r.shift_id = s.id WHERE s.code = 'GENERAL' AND r.route_number = 'ROUTE 2';
    SELECT r.id INTO v_g_r3 FROM public.routes r JOIN public.shifts s ON r.shift_id = s.id WHERE s.code = 'GENERAL' AND r.route_number = 'ROUTE 3';
    SELECT r.id INTO v_g_r4 FROM public.routes r JOIN public.shifts s ON r.shift_id = s.id WHERE s.code = 'GENERAL' AND r.route_number = 'ROUTE 4';

    -- Clear existing directional stops to allow idempotent re-run
    DELETE FROM public.route_direction_stops WHERE route_id IN (
        v_m_r1, v_m_r2, v_m_r3, v_m_r4, v_m_r5,
        v_g_r1, v_g_r2, v_g_r3, v_g_r4
    );

    -- =========================================================================
    -- MORNING ROUTE 1 – JAIL ROAD
    -- =========================================================================
    -- TO_COLLEGE: Sailani Baba Square -> Bytco Point -> K K Wagh Education Society
    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_m_r1, 'TO_COLLEGE', 1, (SELECT id FROM public.stops WHERE name = 'Sailani Baba Square'), '07:30 AM', '01:35 PM', true),
        (v_m_r1, 'TO_COLLEGE', 2, (SELECT id FROM public.stops WHERE name = 'Bytco Point'), '07:42 AM', '01:25 PM', true),
        (v_m_r1, 'TO_COLLEGE', 3, v_kkwagh, '08:00 AM', '01:15 PM', false);

    -- RETURNING_HOME: K K Wagh -> Sailani Baba Square -> Bytco Point -> K K Wagh
    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_m_r1, 'RETURNING_HOME', 1, v_kkwagh, '01:15 PM', '08:00 AM', false),
        (v_m_r1, 'RETURNING_HOME', 2, (SELECT id FROM public.stops WHERE name = 'Sailani Baba Square'), '01:35 PM', '07:30 AM', true),
        (v_m_r1, 'RETURNING_HOME', 3, (SELECT id FROM public.stops WHERE name = 'Bytco Point'), '01:45 PM', '07:42 AM', true),
        (v_m_r1, 'RETURNING_HOME', 4, v_kkwagh, '02:00 PM', '08:00 AM', false);

    -- =========================================================================
    -- MORNING ROUTE 2 – PUNE ROAD
    -- =========================================================================
    -- TO_COLLEGE: Kathe Lane -> Bodhale Nagar -> Vijay Mamta Datta Mandir Square -> Bytco Point -> K K Wagh
    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_m_r2, 'TO_COLLEGE', 1, (SELECT id FROM public.stops WHERE name = 'Kathe Lane'), '07:28 AM', '01:42 PM', true),
        (v_m_r2, 'TO_COLLEGE', 2, (SELECT id FROM public.stops WHERE name = 'Bodhale Nagar'), '07:35 AM', '01:35 PM', true),
        (v_m_r2, 'TO_COLLEGE', 3, (SELECT id FROM public.stops WHERE name = 'Vijay Mamta Datta Mandir Square'), '07:43 AM', '01:28 PM', true),
        (v_m_r2, 'TO_COLLEGE', 4, (SELECT id FROM public.stops WHERE name = 'Bytco Point'), '07:50 AM', '01:20 PM', true),
        (v_m_r2, 'TO_COLLEGE', 5, v_kkwagh, '08:05 AM', '01:10 PM', false);

    -- RETURNING_HOME: K K Wagh -> Kathe Lane -> Bodhale Nagar -> Vijay Mamta Datta Mandir Square -> Bytco Point -> K K Wagh
    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_m_r2, 'RETURNING_HOME', 1, v_kkwagh, '01:10 PM', '08:05 AM', false),
        (v_m_r2, 'RETURNING_HOME', 2, (SELECT id FROM public.stops WHERE name = 'Kathe Lane'), '01:25 PM', '07:28 AM', true),
        (v_m_r2, 'RETURNING_HOME', 3, (SELECT id FROM public.stops WHERE name = 'Bodhale Nagar'), '01:32 PM', '07:35 AM', true),
        (v_m_r2, 'RETURNING_HOME', 4, (SELECT id FROM public.stops WHERE name = 'Vijay Mamta Datta Mandir Square'), '01:40 PM', '07:43 AM', true),
        (v_m_r2, 'RETURNING_HOME', 5, (SELECT id FROM public.stops WHERE name = 'Bytco Point'), '01:48 PM', '07:50 AM', true),
        (v_m_r2, 'RETURNING_HOME', 6, v_kkwagh, '02:05 PM', '08:05 AM', false);

    -- =========================================================================
    -- MORNING ROUTE 3 – CIDCO
    -- =========================================================================
    -- TO_COLLEGE: Dwaraka Stop -> Bombay Naka -> Kamod Nagar -> Indira Nagar Jogging Track -> Rane Nagar -> Pathardi Phata -> Shubham Park -> Trimurti Square -> Tidake Colony -> Dwarka Stop -> K K Wagh
    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_m_r3, 'TO_COLLEGE', 1, (SELECT id FROM public.stops WHERE name = 'Dwaraka Stop'), '07:18 AM', '01:48 PM', true),
        (v_m_r3, 'TO_COLLEGE', 2, (SELECT id FROM public.stops WHERE name = 'Bombay Naka'), '07:25 AM', '01:40 PM', true),
        (v_m_r3, 'TO_COLLEGE', 3, (SELECT id FROM public.stops WHERE name = 'Kamod Nagar'), '07:32 AM', '01:33 PM', true),
        (v_m_r3, 'TO_COLLEGE', 4, (SELECT id FROM public.stops WHERE name = 'Indira Nagar Jogging Track'), '07:38 AM', '01:27 PM', true),
        (v_m_r3, 'TO_COLLEGE', 5, (SELECT id FROM public.stops WHERE name = 'Rane Nagar'), '07:44 AM', '01:21 PM', true),
        (v_m_r3, 'TO_COLLEGE', 6, (SELECT id FROM public.stops WHERE name = 'Pathardi Phata'), '07:49 AM', '01:16 PM', true),
        (v_m_r3, 'TO_COLLEGE', 7, (SELECT id FROM public.stops WHERE name = 'Shubham Park'), '07:54 AM', '01:11 PM', true),
        (v_m_r3, 'TO_COLLEGE', 8, (SELECT id FROM public.stops WHERE name = 'Trimurti Square'), '07:59 AM', '01:06 PM', true),
        (v_m_r3, 'TO_COLLEGE', 9, (SELECT id FROM public.stops WHERE name = 'Tidake Colony'), '08:05 AM', '01:00 PM', true),
        (v_m_r3, 'TO_COLLEGE', 10, (SELECT id FROM public.stops WHERE name = 'Dwarka Stop'), '08:12 AM', '12:53 PM', true),
        (v_m_r3, 'TO_COLLEGE', 11, v_kkwagh, '08:20 AM', '12:45 PM', false);

    -- RETURNING_HOME: K K Wagh -> Dwarka Stop -> Tidake Colony -> Trimurti Square -> Shubham Park -> Pathardi Phata -> Rane Nagar -> Indira Nagar Jogging Track -> Kamod Nagar -> Bombay Naka -> Dwaraka Stop -> K K Wagh
    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_m_r3, 'RETURNING_HOME', 1, v_kkwagh, '12:45 PM', '08:20 AM', false),
        (v_m_r3, 'RETURNING_HOME', 2, (SELECT id FROM public.stops WHERE name = 'Dwarka Stop'), '12:53 PM', '08:12 AM', true),
        (v_m_r3, 'RETURNING_HOME', 3, (SELECT id FROM public.stops WHERE name = 'Tidake Colony'), '01:00 PM', '08:05 AM', true),
        (v_m_r3, 'RETURNING_HOME', 4, (SELECT id FROM public.stops WHERE name = 'Trimurti Square'), '01:06 PM', '07:59 AM', true),
        (v_m_r3, 'RETURNING_HOME', 5, (SELECT id FROM public.stops WHERE name = 'Shubham Park'), '01:11 PM', '07:54 AM', true),
        (v_m_r3, 'RETURNING_HOME', 6, (SELECT id FROM public.stops WHERE name = 'Pathardi Phata'), '01:16 PM', '07:49 AM', true),
        (v_m_r3, 'RETURNING_HOME', 7, (SELECT id FROM public.stops WHERE name = 'Rane Nagar'), '01:21 PM', '07:44 AM', true),
        (v_m_r3, 'RETURNING_HOME', 8, (SELECT id FROM public.stops WHERE name = 'Indira Nagar Jogging Track'), '01:27 PM', '07:38 AM', true),
        (v_m_r3, 'RETURNING_HOME', 9, (SELECT id FROM public.stops WHERE name = 'Kamod Nagar'), '01:33 PM', '07:32 AM', true),
        (v_m_r3, 'RETURNING_HOME', 10, (SELECT id FROM public.stops WHERE name = 'Bombay Naka'), '01:40 PM', '07:25 AM', true),
        (v_m_r3, 'RETURNING_HOME', 11, (SELECT id FROM public.stops WHERE name = 'Dwaraka Stop'), '01:48 PM', '07:18 AM', true),
        (v_m_r3, 'RETURNING_HOME', 12, v_kkwagh, '02:00 PM', '07:05 AM', false);

    -- =========================================================================
    -- MORNING ROUTE 4 – COLLEGE ROAD (CRITICAL DIRECTIONAL REQUIREMENT)
    -- Inbound (TO_COLLEGE): College Road is 1st student-visible stop!
    -- Outbound (RETURNING_HOME): College Road is the LAST student-visible stop!
    -- =========================================================================
    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_m_r4, 'TO_COLLEGE', 1, (SELECT id FROM public.stops WHERE name = 'College Road'), '07:15 AM', '01:50 PM', true),
        (v_m_r4, 'TO_COLLEGE', 2, (SELECT id FROM public.stops WHERE name = 'Canada Corner'), '07:22 AM', '01:43 PM', true),
        (v_m_r4, 'TO_COLLEGE', 3, (SELECT id FROM public.stops WHERE name = 'Bhosla School'), '07:29 AM', '01:36 PM', true),
        (v_m_r4, 'TO_COLLEGE', 4, (SELECT id FROM public.stops WHERE name = 'ABB Circle'), '07:37 AM', '01:28 PM', true),
        (v_m_r4, 'TO_COLLEGE', 5, (SELECT id FROM public.stops WHERE name = 'Civil Hospital'), '07:44 AM', '01:21 PM', true),
        (v_m_r4, 'TO_COLLEGE', 6, (SELECT id FROM public.stops WHERE name = 'Shalimar Stop'), '07:50 AM', '01:15 PM', true),
        (v_m_r4, 'TO_COLLEGE', 7, (SELECT id FROM public.stops WHERE name = 'Rajiv Gandhi Bhavan'), '07:58 AM', '01:05 PM', true),
        (v_m_r4, 'TO_COLLEGE', 8, v_kkwagh, '08:15 AM', '12:50 PM', false);

    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_m_r4, 'RETURNING_HOME', 1, v_kkwagh, '12:50 PM', '08:15 AM', false),
        (v_m_r4, 'RETURNING_HOME', 2, (SELECT id FROM public.stops WHERE name = 'Rajiv Gandhi Bhavan'), '01:05 PM', '07:58 AM', true),
        (v_m_r4, 'RETURNING_HOME', 3, (SELECT id FROM public.stops WHERE name = 'Shalimar Stop'), '01:15 PM', '07:50 AM', true),
        (v_m_r4, 'RETURNING_HOME', 4, (SELECT id FROM public.stops WHERE name = 'Civil Hospital'), '01:21 PM', '07:44 AM', true),
        (v_m_r4, 'RETURNING_HOME', 5, (SELECT id FROM public.stops WHERE name = 'ABB Circle'), '01:28 PM', '07:37 AM', true),
        (v_m_r4, 'RETURNING_HOME', 6, (SELECT id FROM public.stops WHERE name = 'Bhosla School'), '01:36 PM', '07:29 AM', true),
        (v_m_r4, 'RETURNING_HOME', 7, (SELECT id FROM public.stops WHERE name = 'Canada Corner'), '01:43 PM', '07:22 AM', true),
        (v_m_r4, 'RETURNING_HOME', 8, (SELECT id FROM public.stops WHERE name = 'College Road'), '01:50 PM', '07:15 AM', true);

    -- =========================================================================
    -- MORNING ROUTE 5 – GANGAPUR ROAD
    -- =========================================================================
    -- TO_COLLEGE: Nimani -> Rmawadi -> Ashok Stambh -> Gangapur Road -> Nerlikar Hospital -> Jehan Circle -> Horizon School -> Chopada Lawns -> Makhamalabad Naka -> Nimani -> K K Wagh
    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_m_r5, 'TO_COLLEGE', 1, (SELECT id FROM public.stops WHERE name = 'Nimani'), '07:15 AM', '01:50 PM', true),
        (v_m_r5, 'TO_COLLEGE', 2, (SELECT id FROM public.stops WHERE name = 'Rmawadi'), '07:22 AM', '01:43 PM', true),
        (v_m_r5, 'TO_COLLEGE', 3, (SELECT id FROM public.stops WHERE name = 'Ashok Stambh'), '07:28 AM', '01:37 PM', true),
        (v_m_r5, 'TO_COLLEGE', 4, (SELECT id FROM public.stops WHERE name = 'Gangapur Road'), '07:35 AM', '01:30 PM', true),
        (v_m_r5, 'TO_COLLEGE', 5, (SELECT id FROM public.stops WHERE name = 'Nerlikar Hospital'), '07:41 AM', '01:24 PM', true),
        (v_m_r5, 'TO_COLLEGE', 6, (SELECT id FROM public.stops WHERE name = 'Jehan Circle'), '07:47 AM', '01:18 PM', true),
        (v_m_r5, 'TO_COLLEGE', 7, (SELECT id FROM public.stops WHERE name = 'Horizon School'), '07:53 AM', '01:12 PM', true),
        (v_m_r5, 'TO_COLLEGE', 8, (SELECT id FROM public.stops WHERE name = 'Chopada Lawns'), '07:59 AM', '01:06 PM', true),
        (v_m_r5, 'TO_COLLEGE', 9, (SELECT id FROM public.stops WHERE name = 'Makhamalabad Naka'), '08:05 AM', '01:00 PM', true),
        (v_m_r5, 'TO_COLLEGE', 10, v_kkwagh, '08:20 AM', '12:45 PM', false);

    -- RETURNING_HOME: K K Wagh -> Nimani -> Makhamalabad Naka -> Chopada Lawns -> Horizon School -> Jehan Circle -> Nerlikar Hospital -> Gangapur Road -> Ashok Stambh -> Rmawadi -> Nimani -> K K Wagh
    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_m_r5, 'RETURNING_HOME', 1, v_kkwagh, '12:45 PM', '08:20 AM', false),
        (v_m_r5, 'RETURNING_HOME', 2, (SELECT id FROM public.stops WHERE name = 'Makhamalabad Naka'), '01:00 PM', '08:05 AM', true),
        (v_m_r5, 'RETURNING_HOME', 3, (SELECT id FROM public.stops WHERE name = 'Chopada Lawns'), '01:06 PM', '07:59 AM', true),
        (v_m_r5, 'RETURNING_HOME', 4, (SELECT id FROM public.stops WHERE name = 'Horizon School'), '01:12 PM', '07:53 AM', true),
        (v_m_r5, 'RETURNING_HOME', 5, (SELECT id FROM public.stops WHERE name = 'Jehan Circle'), '01:18 PM', '07:47 AM', true),
        (v_m_r5, 'RETURNING_HOME', 6, (SELECT id FROM public.stops WHERE name = 'Nerlikar Hospital'), '01:24 PM', '07:41 AM', true),
        (v_m_r5, 'RETURNING_HOME', 7, (SELECT id FROM public.stops WHERE name = 'Gangapur Road'), '01:30 PM', '07:35 AM', true),
        (v_m_r5, 'RETURNING_HOME', 8, (SELECT id FROM public.stops WHERE name = 'Ashok Stambh'), '01:37 PM', '07:28 AM', true),
        (v_m_r5, 'RETURNING_HOME', 9, (SELECT id FROM public.stops WHERE name = 'Rmawadi'), '01:43 PM', '07:22 AM', true),
        (v_m_r5, 'RETURNING_HOME', 10, (SELECT id FROM public.stops WHERE name = 'Nimani'), '01:50 PM', '07:15 AM', true),
        (v_m_r5, 'RETURNING_HOME', 11, v_kkwagh, '02:00 PM', '07:05 AM', false);

    -- =========================================================================
    -- GENERAL ROUTE 1 – JAIL ROAD
    -- =========================================================================
    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_g_r1, 'TO_COLLEGE', 1, (SELECT id FROM public.stops WHERE name = 'Sailani Baba Square'), '09:00 AM', '05:20 PM', true),
        (v_g_r1, 'TO_COLLEGE', 2, (SELECT id FROM public.stops WHERE name = 'Bytco Point'), '09:12 AM', '05:10 PM', true),
        (v_g_r1, 'TO_COLLEGE', 3, v_kkwagh, '09:30 AM', '05:00 PM', false);

    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_g_r1, 'RETURNING_HOME', 1, v_kkwagh, '05:00 PM', '09:30 AM', false),
        (v_g_r1, 'RETURNING_HOME', 2, (SELECT id FROM public.stops WHERE name = 'Sailani Baba Square'), '05:20 PM', '09:00 AM', true),
        (v_g_r1, 'RETURNING_HOME', 3, (SELECT id FROM public.stops WHERE name = 'Bytco Point'), '05:30 PM', '09:12 AM', true),
        (v_g_r1, 'RETURNING_HOME', 4, v_kkwagh, '05:45 PM', '09:30 AM', false);

    -- =========================================================================
    -- GENERAL ROUTE 2 – PUNE ROAD
    -- =========================================================================
    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_g_r2, 'TO_COLLEGE', 1, (SELECT id FROM public.stops WHERE name = 'Kathe Lane'), '08:58 AM', '05:27 PM', true),
        (v_g_r2, 'TO_COLLEGE', 2, (SELECT id FROM public.stops WHERE name = 'Bodhale Nagar'), '09:05 AM', '05:20 PM', true),
        (v_g_r2, 'TO_COLLEGE', 3, (SELECT id FROM public.stops WHERE name = 'Vijay Mamta Datta Mandir Square'), '09:14 AM', '05:11 PM', true),
        (v_g_r2, 'TO_COLLEGE', 4, (SELECT id FROM public.stops WHERE name = 'Bytco Point'), '09:22 AM', '05:03 PM', true),
        (v_g_r2, 'TO_COLLEGE', 5, v_kkwagh, '09:35 AM', '04:55 PM', false);

    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_g_r2, 'RETURNING_HOME', 1, v_kkwagh, '04:55 PM', '09:35 AM', false),
        (v_g_r2, 'RETURNING_HOME', 2, (SELECT id FROM public.stops WHERE name = 'Kathe Lane'), '05:10 PM', '08:58 AM', true),
        (v_g_r2, 'RETURNING_HOME', 3, (SELECT id FROM public.stops WHERE name = 'Bodhale Nagar'), '05:18 PM', '09:05 AM', true),
        (v_g_r2, 'RETURNING_HOME', 4, (SELECT id FROM public.stops WHERE name = 'Vijay Mamta Datta Mandir Square'), '05:26 PM', '09:14 AM', true),
        (v_g_r2, 'RETURNING_HOME', 5, (SELECT id FROM public.stops WHERE name = 'Bytco Point'), '05:35 PM', '09:22 AM', true),
        (v_g_r2, 'RETURNING_HOME', 6, v_kkwagh, '05:50 PM', '09:35 AM', false);

    -- =========================================================================
    -- GENERAL ROUTE 3 – CIDCO
    -- =========================================================================
    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_g_r3, 'TO_COLLEGE', 1, (SELECT id FROM public.stops WHERE name = 'Dwaraka Stop'), '08:48 AM', '05:42 PM', true),
        (v_g_r3, 'TO_COLLEGE', 2, (SELECT id FROM public.stops WHERE name = 'Bombay Naka'), '08:55 AM', '05:35 PM', true),
        (v_g_r3, 'TO_COLLEGE', 3, (SELECT id FROM public.stops WHERE name = 'Kamod Nagar'), '09:02 AM', '05:28 PM', true),
        (v_g_r3, 'TO_COLLEGE', 4, (SELECT id FROM public.stops WHERE name = 'Rane Nagar'), '09:08 AM', '05:22 PM', true),
        (v_g_r3, 'TO_COLLEGE', 5, (SELECT id FROM public.stops WHERE name = 'Pathardi Phata'), '09:14 AM', '05:16 PM', true),
        (v_g_r3, 'TO_COLLEGE', 6, (SELECT id FROM public.stops WHERE name = 'Shubham Park'), '09:20 AM', '05:10 PM', true),
        (v_g_r3, 'TO_COLLEGE', 7, (SELECT id FROM public.stops WHERE name = 'Divya AdLab'), '09:25 AM', '05:05 PM', true),
        (v_g_r3, 'TO_COLLEGE', 8, (SELECT id FROM public.stops WHERE name = 'Trimurti Square'), '09:30 AM', '05:00 PM', true),
        (v_g_r3, 'TO_COLLEGE', 9, (SELECT id FROM public.stops WHERE name = 'Untwadi'), '09:35 AM', '04:55 PM', true),
        (v_g_r3, 'TO_COLLEGE', 10, (SELECT id FROM public.stops WHERE name = 'Tidke Colony'), '09:40 AM', '04:50 PM', true),
        (v_g_r3, 'TO_COLLEGE', 11, (SELECT id FROM public.stops WHERE name = 'Sarada Circle'), '09:47 AM', '04:43 PM', true),
        (v_g_r3, 'TO_COLLEGE', 12, (SELECT id FROM public.stops WHERE name = 'Dwarka Stop'), '09:53 AM', '04:37 PM', true),
        (v_g_r3, 'TO_COLLEGE', 13, v_kkwagh, '10:05 AM', '04:30 PM', false);

    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_g_r3, 'RETURNING_HOME', 1, v_kkwagh, '04:30 PM', '10:05 AM', false),
        (v_g_r3, 'RETURNING_HOME', 2, (SELECT id FROM public.stops WHERE name = 'Dwarka Stop'), '04:37 PM', '09:53 AM', true),
        (v_g_r3, 'RETURNING_HOME', 3, (SELECT id FROM public.stops WHERE name = 'Sarada Circle'), '04:43 PM', '09:47 AM', true),
        (v_g_r3, 'RETURNING_HOME', 4, (SELECT id FROM public.stops WHERE name = 'Tidke Colony'), '04:50 PM', '09:40 AM', true),
        (v_g_r3, 'RETURNING_HOME', 5, (SELECT id FROM public.stops WHERE name = 'Untwadi'), '04:55 PM', '09:35 AM', true),
        (v_g_r3, 'RETURNING_HOME', 6, (SELECT id FROM public.stops WHERE name = 'Trimurti Square'), '05:00 PM', '09:30 AM', true),
        (v_g_r3, 'RETURNING_HOME', 7, (SELECT id FROM public.stops WHERE name = 'Divya AdLab'), '05:05 PM', '09:25 AM', true),
        (v_g_r3, 'RETURNING_HOME', 8, (SELECT id FROM public.stops WHERE name = 'Shubham Park'), '05:10 PM', '09:20 AM', true),
        (v_g_r3, 'RETURNING_HOME', 9, (SELECT id FROM public.stops WHERE name = 'Pathardi Phata'), '05:16 PM', '09:14 AM', true),
        (v_g_r3, 'RETURNING_HOME', 10, (SELECT id FROM public.stops WHERE name = 'Rane Nagar'), '05:22 PM', '09:08 AM', true),
        (v_g_r3, 'RETURNING_HOME', 11, (SELECT id FROM public.stops WHERE name = 'Kamod Nagar'), '05:28 PM', '09:02 AM', true),
        (v_g_r3, 'RETURNING_HOME', 12, (SELECT id FROM public.stops WHERE name = 'Bombay Naka'), '05:35 PM', '08:55 AM', true),
        (v_g_r3, 'RETURNING_HOME', 13, (SELECT id FROM public.stops WHERE name = 'Dwaraka Stop'), '05:42 PM', '08:48 AM', true),
        (v_g_r3, 'RETURNING_HOME', 14, v_kkwagh, '05:55 PM', '08:35 AM', false);

    -- =========================================================================
    -- GENERAL ROUTE 4 – COLLEGE ROAD / GANGAPUR ROAD
    -- Direction-specific: College Road is 1st student stop on TO_COLLEGE,
    -- and last student stop on RETURNING_HOME.
    -- =========================================================================
    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_g_r4, 'TO_COLLEGE', 1, (SELECT id FROM public.stops WHERE name = 'College Road'), '08:50 AM', '05:35 PM', true),
        (v_g_r4, 'TO_COLLEGE', 2, (SELECT id FROM public.stops WHERE name = 'Canada Corner'), '08:58 AM', '05:32 PM', true),
        (v_g_r4, 'TO_COLLEGE', 3, (SELECT id FROM public.stops WHERE name = 'Rajiv Gandhi Bhavan'), '09:05 AM', '05:25 PM', true),
        (v_g_r4, 'TO_COLLEGE', 4, (SELECT id FROM public.stops WHERE name = 'Jehan Circle'), '09:12 AM', '05:18 PM', true),
        (v_g_r4, 'TO_COLLEGE', 5, (SELECT id FROM public.stops WHERE name = 'Bhosla School'), '09:18 AM', '05:12 PM', true),
        (v_g_r4, 'TO_COLLEGE', 6, (SELECT id FROM public.stops WHERE name = 'Nerlikar Hospital'), '09:24 AM', '05:06 PM', true),
        (v_g_r4, 'TO_COLLEGE', 7, (SELECT id FROM public.stops WHERE name = 'Gangapur Road'), '09:30 AM', '05:00 PM', true),
        (v_g_r4, 'TO_COLLEGE', 8, (SELECT id FROM public.stops WHERE name = 'Ashok Stambh'), '09:37 AM', '04:53 PM', true),
        (v_g_r4, 'TO_COLLEGE', 9, (SELECT id FROM public.stops WHERE name = 'Nimani'), '09:44 AM', '04:46 PM', true),
        (v_g_r4, 'TO_COLLEGE', 10, v_kkwagh, '09:55 AM', '04:40 PM', false);

    INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop)
    VALUES
        (v_g_r4, 'RETURNING_HOME', 1, v_kkwagh, '04:40 PM', '09:55 AM', false),
        (v_g_r4, 'RETURNING_HOME', 2, (SELECT id FROM public.stops WHERE name = 'Nimani'), '04:46 PM', '09:44 AM', true),
        (v_g_r4, 'RETURNING_HOME', 3, (SELECT id FROM public.stops WHERE name = 'Ashok Stambh'), '04:53 PM', '09:37 AM', true),
        (v_g_r4, 'RETURNING_HOME', 4, (SELECT id FROM public.stops WHERE name = 'Gangapur Road'), '05:00 PM', '09:30 AM', true),
        (v_g_r4, 'RETURNING_HOME', 5, (SELECT id FROM public.stops WHERE name = 'Nerlikar Hospital'), '05:06 PM', '09:24 AM', true),
        (v_g_r4, 'RETURNING_HOME', 6, (SELECT id FROM public.stops WHERE name = 'Bhosla School'), '05:12 PM', '09:18 AM', true),
        (v_g_r4, 'RETURNING_HOME', 7, (SELECT id FROM public.stops WHERE name = 'Jehan Circle'), '05:18 PM', '09:12 AM', true),
        (v_g_r4, 'RETURNING_HOME', 8, (SELECT id FROM public.stops WHERE name = 'Rajiv Gandhi Bhavan'), '05:25 PM', '09:05 AM', true),
        (v_g_r4, 'RETURNING_HOME', 9, (SELECT id FROM public.stops WHERE name = 'Canada Corner'), '05:32 PM', '08:58 AM', true),
        (v_g_r4, 'RETURNING_HOME', 10, (SELECT id FROM public.stops WHERE name = 'College Road'), '05:40 PM', '08:50 AM', true);

END $$;

-- -----------------------------------------------------------------------------
-- 6. SEED OFFICIAL VEHICLE DOCUMENT EXPIRIES FOR REAL BUSES
-- -----------------------------------------------------------------------------
UPDATE public.buses
SET rc_expiry = '2028-06-30',
    insurance_expiry = '2027-03-31',
    fitness_expiry = '2027-04-15',
    permit_expiry = '2028-05-31',
    puc_expiry = '2027-02-28',
    last_service_date = '2026-10-15',
    maintenance_remarks = 'Scheduled 10,000 km periodic inspection completed. Brake pads and fluids inspected.'
WHERE bus_number = 'Bus 01';

UPDATE public.buses
SET rc_expiry = '2027-11-20',
    insurance_expiry = '2027-01-15',
    fitness_expiry = '2026-12-30',
    permit_expiry = '2027-10-31',
    puc_expiry = '2027-01-31',
    last_service_date = '2026-09-20',
    maintenance_remarks = 'Suspension bushings and tire alignment completed.'
WHERE bus_number = 'Bus 02';

UPDATE public.buses
SET rc_expiry = '2029-01-15',
    insurance_expiry = '2027-08-31',
    fitness_expiry = '2027-09-15',
    permit_expiry = '2029-01-15',
    puc_expiry = '2027-04-30',
    last_service_date = '2026-10-02',
    maintenance_remarks = 'HVAC climate-control serviced. Cabin filter replaced.'
WHERE bus_number = 'Bus 03';

UPDATE public.buses
SET rc_expiry = '2028-09-10',
    insurance_expiry = '2027-05-20',
    fitness_expiry = '2027-06-10',
    permit_expiry = '2028-08-31',
    puc_expiry = '2027-03-15',
    last_service_date = '2026-08-28',
    maintenance_remarks = 'General electrical inspection and horn/headlamp relay replacement.'
WHERE bus_number = 'Bus 04';

UPDATE public.buses
SET rc_expiry = '2027-04-18',
    insurance_expiry = '2026-12-15',
    fitness_expiry = '2026-12-20',
    permit_expiry = '2027-03-31',
    puc_expiry = '2026-11-30',
    last_service_date = '2026-10-10',
    maintenance_remarks = 'Clutch plate overhaul and oil change completed.'
WHERE bus_number = 'Bus 05';

UPDATE public.buses
SET rc_expiry = '2029-05-25',
    insurance_expiry = '2027-10-31',
    fitness_expiry = '2027-11-15',
    permit_expiry = '2029-04-30',
    puc_expiry = '2027-05-31',
    last_service_date = '2026-10-18',
    maintenance_remarks = 'AC cooling coil pressure test passed. Routine service certified.'
WHERE bus_number = 'Bus 06';

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) FOR NEW & MODIFIED TABLES
-- -----------------------------------------------------------------------------
ALTER TABLE public.route_direction_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_maintenance_records ENABLE ROW LEVEL SECURITY;

-- Route Direction Stops Policies
DROP POLICY IF EXISTS "Anyone can view route direction stops" ON public.route_direction_stops;
CREATE POLICY "Anyone can view route direction stops"
ON public.route_direction_stops FOR SELECT
USING (true);

-- Buses Policies
DROP POLICY IF EXISTS "Anyone authenticated can view buses" ON public.buses;
CREATE POLICY "Anyone authenticated can view buses"
ON public.buses FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can update buses" ON public.buses;
CREATE POLICY "Admins can update buses"
ON public.buses FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Trips Policies
DROP POLICY IF EXISTS "Anyone authenticated can view trips" ON public.trips;
CREATE POLICY "Anyone authenticated can view trips"
ON public.trips FOR SELECT
USING (auth.role() = 'authenticated' OR true);

DROP POLICY IF EXISTS "Drivers and admins can insert trips" ON public.trips;
CREATE POLICY "Drivers and admins can insert trips"
ON public.trips FOR INSERT
WITH CHECK (
    auth.uid() = driver_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('driver', 'admin')
    )
);

DROP POLICY IF EXISTS "Drivers and admins can update trips" ON public.trips;
CREATE POLICY "Drivers and admins can update trips"
ON public.trips FOR UPDATE
USING (
    auth.uid() = driver_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('driver', 'admin')
    )
);

-- Trip Stops Policies
DROP POLICY IF EXISTS "Anyone authenticated can view trip stops" ON public.trip_stops;
CREATE POLICY "Anyone authenticated can view trip stops"
ON public.trip_stops FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Drivers and admins can manage trip stops" ON public.trip_stops;
CREATE POLICY "Drivers and admins can manage trip stops"
ON public.trip_stops FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.trips
        WHERE trips.id = trip_stops.trip_id AND (
            trips.driver_id = auth.uid() OR
            EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        )
    )
);

-- Live Locations Policies
DROP POLICY IF EXISTS "Anyone can read live locations" ON public.live_locations;
CREATE POLICY "Anyone can read live locations"
ON public.live_locations FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Drivers and admins can insert live locations" ON public.live_locations;
CREATE POLICY "Drivers and admins can insert live locations"
ON public.live_locations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.trips
        WHERE trips.id = live_locations.trip_id AND (
            trips.driver_id = auth.uid() OR
            EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('driver', 'admin'))
        )
    )
);

-- Maintenance Records Policies
DROP POLICY IF EXISTS "Authenticated can view maintenance records" ON public.bus_maintenance_records;
CREATE POLICY "Authenticated can view maintenance records"
ON public.bus_maintenance_records FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage maintenance records" ON public.bus_maintenance_records;
CREATE POLICY "Admins can manage maintenance records"
ON public.bus_maintenance_records FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

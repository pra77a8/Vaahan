-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - MIGRATION 019
-- 1. Authoritative 5-Corridor Route Sequences (TO_COLLEGE and TO_HOME exact reversals)
-- 2. Student Transport RLS Policy & Manifest RPC (Clean Driver Manifest Access)
-- 3. Admin Driver Provisioning with Direct Password & Password Reset Functions
-- =============================================================================

-- Ensure Shalimar is in stops
INSERT INTO public.stops (name, landmark, latitude, longitude)
VALUES 
    ('Shalimar', 'CBS Shalimar Central Chowk', 19.9970, 73.7890),
    ('Shalimar Stop', 'CBS Shalimar Central Chowk', 19.9970, 73.7890)
ON CONFLICT (name) DO UPDATE 
SET landmark = EXCLUDED.landmark,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude;

-- 1. REBUILD ROUTE DIRECTION STOPS AND ROUTE STOPS WITH AUTHORITATIVE SEQUENCES
DO $$
DECLARE
    -- Shifts
    v_morning UUID;
    v_general UUID;

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

    -- Stops
    s_kkw UUID;
    s_jail_road UUID;
    s_sailani UUID;
    s_bytco UUID;
    s_pune_road UUID;
    s_datta_mandir UUID;
    s_vijay_mamta UUID;
    s_bodhale_nagar UUID;
    s_kathe_lane UUID;
    s_cidco UUID;
    s_dwarka UUID;
    s_tidake_colony UUID;
    s_trimurti UUID;
    s_shubham_park UUID;
    s_pathardi_phata UUID;
    s_rane_nagar UUID;
    s_indira_jogging UUID;
    s_bombay_naka UUID;
    s_college_road UUID;
    s_rajiv_bhavan UUID;
    s_canada_corner UUID;
    s_bhosla UUID;
    s_abb_circle UUID;
    s_civil_hosp UUID;
    s_shalimar UUID;
    s_gangapur_road UUID;
    s_nimani UUID;
    s_makhamalabad UUID;
    s_chopada UUID;
    s_horizon UUID;
    s_jehan UUID;
    s_nerlikar UUID;
    s_ashok_stambh UUID;
    s_ramwadi UUID;
BEGIN
    SELECT id INTO v_morning FROM public.shifts WHERE code = 'MORNING' LIMIT 1;
    SELECT id INTO v_general FROM public.shifts WHERE code = 'GENERAL' LIMIT 1;

    -- Resolve Routes
    SELECT id INTO v_m_r1 FROM public.routes WHERE shift_id = v_morning AND route_number = 'ROUTE 1';
    SELECT id INTO v_m_r2 FROM public.routes WHERE shift_id = v_morning AND route_number = 'ROUTE 2';
    SELECT id INTO v_m_r3 FROM public.routes WHERE shift_id = v_morning AND route_number = 'ROUTE 3';
    SELECT id INTO v_m_r4 FROM public.routes WHERE shift_id = v_morning AND route_number = 'ROUTE 4';
    SELECT id INTO v_m_r5 FROM public.routes WHERE shift_id = v_morning AND route_number = 'ROUTE 5';

    SELECT id INTO v_g_r1 FROM public.routes WHERE shift_id = v_general AND route_number = 'ROUTE 1';
    SELECT id INTO v_g_r2 FROM public.routes WHERE shift_id = v_general AND route_number = 'ROUTE 2';
    SELECT id INTO v_g_r3 FROM public.routes WHERE shift_id = v_general AND route_number = 'ROUTE 3';
    SELECT id INTO v_g_r4 FROM public.routes WHERE shift_id = v_general AND (route_number = 'ROUTE 4' OR name ILIKE '%COLLEGE%');

    -- Resolve Stops
    SELECT id INTO s_kkw FROM public.stops WHERE name = 'K K Wagh Education Society' LIMIT 1;
    SELECT id INTO s_jail_road FROM public.stops WHERE name = 'Jail Road' LIMIT 1;
    SELECT id INTO s_sailani FROM public.stops WHERE name = 'Sailani Baba Square' LIMIT 1;
    SELECT id INTO s_bytco FROM public.stops WHERE name = 'Bytco Point' LIMIT 1;
    SELECT id INTO s_pune_road FROM public.stops WHERE name = 'Pune Road' LIMIT 1;
    SELECT id INTO s_datta_mandir FROM public.stops WHERE name = 'Datta Mandir Square' LIMIT 1;
    SELECT id INTO s_vijay_mamta FROM public.stops WHERE name = 'Vijay Mamta' LIMIT 1;
    SELECT id INTO s_bodhale_nagar FROM public.stops WHERE name = 'Bodhale Nagar' LIMIT 1;
    SELECT id INTO s_kathe_lane FROM public.stops WHERE name = 'Kathe Lane' LIMIT 1;
    SELECT id INTO s_cidco FROM public.stops WHERE name = 'CIDCO' LIMIT 1;
    SELECT id INTO s_dwarka FROM public.stops WHERE name = 'Dwarka Stop' LIMIT 1;
    SELECT id INTO s_tidake_colony FROM public.stops WHERE name = 'Tidake Colony' LIMIT 1;
    SELECT id INTO s_trimurti FROM public.stops WHERE name = 'Trimurti Square' LIMIT 1;
    SELECT id INTO s_shubham_park FROM public.stops WHERE name = 'Shubham Park' LIMIT 1;
    SELECT id INTO s_pathardi_phata FROM public.stops WHERE name = 'Pathardi Phata' LIMIT 1;
    SELECT id INTO s_rane_nagar FROM public.stops WHERE name = 'Rane Nagar' LIMIT 1;
    SELECT id INTO s_indira_jogging FROM public.stops WHERE name = 'Indira Nagar Jogging Track' LIMIT 1;
    SELECT id INTO s_bombay_naka FROM public.stops WHERE name = 'Bombay Naka' LIMIT 1;
    SELECT id INTO s_college_road FROM public.stops WHERE name = 'College Road' LIMIT 1;
    SELECT id INTO s_rajiv_bhavan FROM public.stops WHERE name = 'Rajiv Gandhi Bhavan' LIMIT 1;
    SELECT id INTO s_canada_corner FROM public.stops WHERE name = 'Canada Corner' LIMIT 1;
    SELECT id INTO s_bhosla FROM public.stops WHERE name = 'Bhosla School' LIMIT 1;
    SELECT id INTO s_abb_circle FROM public.stops WHERE name = 'ABB Circle' LIMIT 1;
    SELECT id INTO s_civil_hosp FROM public.stops WHERE name = 'Civil Hospital' LIMIT 1;
    SELECT id INTO s_shalimar FROM public.stops WHERE name = 'Shalimar' OR name = 'Shalimar Stop' ORDER BY name LIMIT 1;
    SELECT id INTO s_gangapur_road FROM public.stops WHERE name = 'Gangapur Road' LIMIT 1;
    SELECT id INTO s_nimani FROM public.stops WHERE name = 'Nimani' LIMIT 1;
    SELECT id INTO s_makhamalabad FROM public.stops WHERE name = 'Makhamalabad Naka' LIMIT 1;
    SELECT id INTO s_chopada FROM public.stops WHERE name = 'Chopada Lawns' LIMIT 1;
    SELECT id INTO s_horizon FROM public.stops WHERE name = 'Horizon School' LIMIT 1;
    SELECT id INTO s_jehan FROM public.stops WHERE name = 'Jehan Circle' LIMIT 1;
    SELECT id INTO s_nerlikar FROM public.stops WHERE name = 'Nerlikar Hospital' LIMIT 1;
    SELECT id INTO s_ashok_stambh FROM public.stops WHERE name = 'Ashok Stambh' LIMIT 1;
    SELECT id INTO s_ramwadi FROM public.stops WHERE name = 'Ramwadi' LIMIT 1;

    -- Reset route_direction_stops completely
    DELETE FROM public.route_direction_stops;

    -- =========================================================================
    -- ROUTE 1: JAIL ROAD (Morning & General)
    -- TO_COLLEGE: Jail Road (1) -> Sailani Baba Square (2) -> Bytco Point (3) -> K.K. Wagh (4)
    -- TO_HOME: K.K. Wagh (1) -> Bytco Point (2) -> Sailani Baba Square (3) -> Jail Road (4)
    -- =========================================================================
    FOR v_m_r1 IN SELECT id FROM public.routes WHERE route_number = 'ROUTE 1' LOOP
        -- TO_COLLEGE
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r1, 'TO_COLLEGE', 1, s_jail_road, '07:15 AM', '01:50 PM', true),
            (v_m_r1, 'TO_COLLEGE', 2, s_sailani, '07:30 AM', '01:35 PM', true),
            (v_m_r1, 'TO_COLLEGE', 3, s_bytco, '07:42 AM', '01:25 PM', true),
            (v_m_r1, 'TO_COLLEGE', 4, s_kkw, '08:00 AM', '01:15 PM', false);

        -- TO_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r1, 'TO_HOME', 1, s_kkw, '01:15 PM', '08:00 AM', false),
            (v_m_r1, 'TO_HOME', 2, s_bytco, '01:25 PM', '07:42 AM', true),
            (v_m_r1, 'TO_HOME', 3, s_sailani, '01:35 PM', '07:30 AM', true),
            (v_m_r1, 'TO_HOME', 4, s_jail_road, '01:50 PM', '07:15 AM', true);

        -- RETURNING_HOME (Alias)
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r1, 'RETURNING_HOME', 1, s_kkw, '01:15 PM', '08:00 AM', false),
            (v_m_r1, 'RETURNING_HOME', 2, s_bytco, '01:25 PM', '07:42 AM', true),
            (v_m_r1, 'RETURNING_HOME', 3, s_sailani, '01:35 PM', '07:30 AM', true),
            (v_m_r1, 'RETURNING_HOME', 4, s_jail_road, '01:50 PM', '07:15 AM', true);

        -- Sync route_stops (inbound baseline)
        DELETE FROM public.route_stops WHERE route_id = v_m_r1;
        INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible) VALUES
            (v_m_r1, s_jail_road, 1, '07:15 AM', '01:50 PM', true),
            (v_m_r1, s_sailani, 2, '07:30 AM', '01:35 PM', true),
            (v_m_r1, s_bytco, 3, '07:42 AM', '01:25 PM', true),
            (v_m_r1, s_kkw, 4, '08:00 AM', '01:15 PM', false);
    END LOOP;

    -- =========================================================================
    -- ROUTE 2: PUNE ROAD (Morning & General)
    -- TO_COLLEGE: Pune Road (1) -> Bytco Point (2) -> Datta Mandir Square (3) -> Vijay Mamta (4) -> Bodhale Nagar (5) -> Kathe Lane (6) -> K.K. Wagh (7)
    -- TO_HOME: K.K. Wagh (1) -> Kathe Lane (2) -> Bodhale Nagar (3) -> Vijay Mamta (4) -> Datta Mandir Square (5) -> Bytco Point (6) -> Pune Road (7)
    -- =========================================================================
    FOR v_m_r2 IN SELECT id FROM public.routes WHERE route_number = 'ROUTE 2' LOOP
        -- TO_COLLEGE
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r2, 'TO_COLLEGE', 1, s_pune_road, '07:15 AM', '01:55 PM', true),
            (v_m_r2, 'TO_COLLEGE', 2, s_bytco, '07:25 AM', '01:45 PM', true),
            (v_m_r2, 'TO_COLLEGE', 3, s_datta_mandir, '07:32 AM', '01:38 PM', true),
            (v_m_r2, 'TO_COLLEGE', 4, s_vijay_mamta, '07:38 AM', '01:32 PM', true),
            (v_m_r2, 'TO_COLLEGE', 5, s_bodhale_nagar, '07:45 AM', '01:25 PM', true),
            (v_m_r2, 'TO_COLLEGE', 6, s_kathe_lane, '07:52 AM', '01:18 PM', true),
            (v_m_r2, 'TO_COLLEGE', 7, s_kkw, '08:05 AM', '01:10 PM', false);

        -- TO_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r2, 'TO_HOME', 1, s_kkw, '01:10 PM', '08:05 AM', false),
            (v_m_r2, 'TO_HOME', 2, s_kathe_lane, '01:18 PM', '07:52 AM', true),
            (v_m_r2, 'TO_HOME', 3, s_bodhale_nagar, '01:25 PM', '07:45 AM', true),
            (v_m_r2, 'TO_HOME', 4, s_vijay_mamta, '01:32 PM', '07:38 AM', true),
            (v_m_r2, 'TO_HOME', 5, s_datta_mandir, '01:38 PM', '07:32 AM', true),
            (v_m_r2, 'TO_HOME', 6, s_bytco, '01:45 PM', '07:25 AM', true),
            (v_m_r2, 'TO_HOME', 7, s_pune_road, '01:55 PM', '07:15 AM', true);

        -- RETURNING_HOME (Alias)
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r2, 'RETURNING_HOME', 1, s_kkw, '01:10 PM', '08:05 AM', false),
            (v_m_r2, 'RETURNING_HOME', 2, s_kathe_lane, '01:18 PM', '07:52 AM', true),
            (v_m_r2, 'RETURNING_HOME', 3, s_bodhale_nagar, '01:25 PM', '07:45 AM', true),
            (v_m_r2, 'RETURNING_HOME', 4, s_vijay_mamta, '01:32 PM', '07:38 AM', true),
            (v_m_r2, 'RETURNING_HOME', 5, s_datta_mandir, '01:38 PM', '07:32 AM', true),
            (v_m_r2, 'RETURNING_HOME', 6, s_bytco, '01:45 PM', '07:25 AM', true),
            (v_m_r2, 'RETURNING_HOME', 7, s_pune_road, '01:55 PM', '07:15 AM', true);

        DELETE FROM public.route_stops WHERE route_id = v_m_r2;
        INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible) VALUES
            (v_m_r2, s_pune_road, 1, '07:15 AM', '01:55 PM', true),
            (v_m_r2, s_bytco, 2, '07:25 AM', '01:45 PM', true),
            (v_m_r2, s_datta_mandir, 3, '07:32 AM', '01:38 PM', true),
            (v_m_r2, s_vijay_mamta, 4, '07:38 AM', '01:32 PM', true),
            (v_m_r2, s_bodhale_nagar, 5, '07:45 AM', '01:25 PM', true),
            (v_m_r2, s_kathe_lane, 6, '07:52 AM', '01:18 PM', true),
            (v_m_r2, s_kkw, 7, '08:05 AM', '01:10 PM', false);
    END LOOP;

    -- =========================================================================
    -- ROUTE 3: CIDCO (Morning & General)
    -- TO_COLLEGE: CIDCO (1) -> Dwarka Stop (2) -> Tidake Colony (3) -> Trimurti Square (4) -> Shubham Park (5) -> Pathardi Phata (6) -> Rane Nagar (7) -> Indira Nagar Jogging Track (8) -> Bombay Naka (9) -> Dwarka Stop (10) -> K.K. Wagh (11)
    -- TO_HOME: K.K. Wagh (1) -> Dwarka Stop (2) -> Bombay Naka (3) -> Indira Nagar Jogging Track (4) -> Rane Nagar (5) -> Pathardi Phata (6) -> Shubham Park (7) -> Trimurti Square (8) -> Tidake Colony (9) -> Dwarka Stop (10) -> CIDCO (11)
    -- =========================================================================
    FOR v_m_r3 IN SELECT id FROM public.routes WHERE route_number = 'ROUTE 3' LOOP
        -- TO_COLLEGE
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r3, 'TO_COLLEGE', 1, s_cidco, '07:05 AM', '02:00 PM', true),
            (v_m_r3, 'TO_COLLEGE', 2, s_dwarka, '07:18 AM', '01:48 PM', true),
            (v_m_r3, 'TO_COLLEGE', 3, s_tidake_colony, '07:25 AM', '01:40 PM', true),
            (v_m_r3, 'TO_COLLEGE', 4, s_trimurti, '07:32 AM', '01:33 PM', true),
            (v_m_r3, 'TO_COLLEGE', 5, s_shubham_park, '07:38 AM', '01:27 PM', true),
            (v_m_r3, 'TO_COLLEGE', 6, s_pathardi_phata, '07:44 AM', '01:21 PM', true),
            (v_m_r3, 'TO_COLLEGE', 7, s_rane_nagar, '07:49 AM', '01:16 PM', true),
            (v_m_r3, 'TO_COLLEGE', 8, s_indira_jogging, '07:54 AM', '01:11 PM', true),
            (v_m_r3, 'TO_COLLEGE', 9, s_bombay_naka, '07:59 AM', '01:06 PM', true),
            (v_m_r3, 'TO_COLLEGE', 10, s_dwarka, '08:05 AM', '01:00 PM', true),
            (v_m_r3, 'TO_COLLEGE', 11, s_kkw, '08:20 AM', '12:45 PM', false);

        -- TO_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r3, 'TO_HOME', 1, s_kkw, '12:45 PM', '08:20 AM', false),
            (v_m_r3, 'TO_HOME', 2, s_dwarka, '01:00 PM', '08:05 AM', true),
            (v_m_r3, 'TO_HOME', 3, s_bombay_naka, '01:06 PM', '07:59 AM', true),
            (v_m_r3, 'TO_HOME', 4, s_indira_jogging, '01:11 PM', '07:54 AM', true),
            (v_m_r3, 'TO_HOME', 5, s_rane_nagar, '01:16 PM', '07:49 AM', true),
            (v_m_r3, 'TO_HOME', 6, s_pathardi_phata, '01:21 PM', '07:44 AM', true),
            (v_m_r3, 'TO_HOME', 7, s_shubham_park, '01:27 PM', '07:38 AM', true),
            (v_m_r3, 'TO_HOME', 8, s_trimurti, '01:33 PM', '07:32 AM', true),
            (v_m_r3, 'TO_HOME', 9, s_tidake_colony, '01:40 PM', '07:25 AM', true),
            (v_m_r3, 'TO_HOME', 10, s_dwarka, '01:48 PM', '07:18 AM', true),
            (v_m_r3, 'TO_HOME', 11, s_cidco, '02:00 PM', '07:05 AM', true);

        -- RETURNING_HOME (Alias)
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r3, 'RETURNING_HOME', 1, s_kkw, '12:45 PM', '08:20 AM', false),
            (v_m_r3, 'RETURNING_HOME', 2, s_dwarka, '01:00 PM', '08:05 AM', true),
            (v_m_r3, 'RETURNING_HOME', 3, s_bombay_naka, '01:06 PM', '07:59 AM', true),
            (v_m_r3, 'RETURNING_HOME', 4, s_indira_jogging, '01:11 PM', '07:54 AM', true),
            (v_m_r3, 'RETURNING_HOME', 5, s_rane_nagar, '01:16 PM', '07:49 AM', true),
            (v_m_r3, 'RETURNING_HOME', 6, s_pathardi_phata, '01:21 PM', '07:44 AM', true),
            (v_m_r3, 'RETURNING_HOME', 7, s_shubham_park, '01:27 PM', '07:38 AM', true),
            (v_m_r3, 'RETURNING_HOME', 8, s_trimurti, '01:33 PM', '07:32 AM', true),
            (v_m_r3, 'RETURNING_HOME', 9, s_tidake_colony, '01:40 PM', '07:25 AM', true),
            (v_m_r3, 'RETURNING_HOME', 10, s_dwarka, '01:48 PM', '07:18 AM', true),
            (v_m_r3, 'RETURNING_HOME', 11, s_cidco, '02:00 PM', '07:05 AM', true);

        DELETE FROM public.route_stops WHERE route_id = v_m_r3;
        INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible) VALUES
            (v_m_r3, s_cidco, 1, '07:05 AM', '02:00 PM', true),
            (v_m_r3, s_dwarka, 2, '07:18 AM', '01:48 PM', true),
            (v_m_r3, s_tidake_colony, 3, '07:25 AM', '01:40 PM', true),
            (v_m_r3, s_trimurti, 4, '07:32 AM', '01:33 PM', true),
            (v_m_r3, s_shubham_park, 5, '07:38 AM', '01:27 PM', true),
            (v_m_r3, s_pathardi_phata, 6, '07:44 AM', '01:21 PM', true),
            (v_m_r3, s_rane_nagar, 7, '07:49 AM', '01:16 PM', true),
            (v_m_r3, s_indira_jogging, 8, '07:54 AM', '01:11 PM', true),
            (v_m_r3, s_bombay_naka, 9, '07:59 AM', '01:06 PM', true),
            (v_m_r3, s_dwarka, 10, '08:05 AM', '01:00 PM', true),
            (v_m_r3, s_kkw, 11, '08:20 AM', '12:45 PM', false);
    END LOOP;

    -- =========================================================================
    -- ROUTE 4: COLLEGE ROAD (Morning & General)
    -- TO_COLLEGE: College Road (1) -> Rajiv Gandhi Bhavan (2) -> Canada Corner (3) -> Bhosla School (4) -> ABB Circle (5) -> Civil Hospital (6) -> Shalimar (7) -> K.K. Wagh (8)
    -- TO_HOME: K.K. Wagh (1) -> Shalimar (2) -> Civil Hospital (3) -> ABB Circle (4) -> Bhosla School (5) -> Canada Corner (6) -> Rajiv Gandhi Bhavan (7) -> College Road (8)
    -- =========================================================================
    FOR v_m_r4 IN SELECT id FROM public.routes WHERE route_number = 'ROUTE 4' OR name ILIKE '%COLLEGE%' LOOP
        -- TO_COLLEGE
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r4, 'TO_COLLEGE', 1, s_college_road, '07:10 AM', '01:55 PM', true),
            (v_m_r4, 'TO_COLLEGE', 2, s_rajiv_bhavan, '07:22 AM', '01:43 PM', true),
            (v_m_r4, 'TO_COLLEGE', 3, s_canada_corner, '07:29 AM', '01:36 PM', true),
            (v_m_r4, 'TO_COLLEGE', 4, s_bhosla, '07:37 AM', '01:28 PM', true),
            (v_m_r4, 'TO_COLLEGE', 5, s_abb_circle, '07:44 AM', '01:21 PM', true),
            (v_m_r4, 'TO_COLLEGE', 6, s_civil_hosp, '07:50 AM', '01:15 PM', true),
            (v_m_r4, 'TO_COLLEGE', 7, s_shalimar, '07:56 AM', '01:09 PM', true),
            (v_m_r4, 'TO_COLLEGE', 8, s_kkw, '08:15 AM', '12:50 PM', false);

        -- TO_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r4, 'TO_HOME', 1, s_kkw, '12:50 PM', '08:15 AM', false),
            (v_m_r4, 'TO_HOME', 2, s_shalimar, '01:09 PM', '07:56 AM', true),
            (v_m_r4, 'TO_HOME', 3, s_civil_hosp, '01:15 PM', '07:50 AM', true),
            (v_m_r4, 'TO_HOME', 4, s_abb_circle, '01:21 PM', '07:44 AM', true),
            (v_m_r4, 'TO_HOME', 5, s_bhosla, '01:28 PM', '07:37 AM', true),
            (v_m_r4, 'TO_HOME', 6, s_canada_corner, '01:36 PM', '07:29 AM', true),
            (v_m_r4, 'TO_HOME', 7, s_rajiv_bhavan, '01:43 PM', '07:22 AM', true),
            (v_m_r4, 'TO_HOME', 8, s_college_road, '01:55 PM', '07:10 AM', true);

        -- RETURNING_HOME (Alias)
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r4, 'RETURNING_HOME', 1, s_kkw, '12:50 PM', '08:15 AM', false),
            (v_m_r4, 'RETURNING_HOME', 2, s_shalimar, '01:09 PM', '07:56 AM', true),
            (v_m_r4, 'RETURNING_HOME', 3, s_civil_hosp, '01:15 PM', '07:50 AM', true),
            (v_m_r4, 'RETURNING_HOME', 4, s_abb_circle, '01:21 PM', '07:44 AM', true),
            (v_m_r4, 'RETURNING_HOME', 5, s_bhosla, '01:28 PM', '07:37 AM', true),
            (v_m_r4, 'RETURNING_HOME', 6, s_canada_corner, '01:36 PM', '07:29 AM', true),
            (v_m_r4, 'RETURNING_HOME', 7, s_rajiv_bhavan, '01:43 PM', '07:22 AM', true),
            (v_m_r4, 'RETURNING_HOME', 8, s_college_road, '01:55 PM', '07:10 AM', true);

        DELETE FROM public.route_stops WHERE route_id = v_m_r4;
        INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible) VALUES
            (v_m_r4, s_college_road, 1, '07:10 AM', '01:55 PM', true),
            (v_m_r4, s_rajiv_bhavan, 2, '07:22 AM', '01:43 PM', true),
            (v_m_r4, s_canada_corner, 3, '07:29 AM', '01:36 PM', true),
            (v_m_r4, s_bhosla, 4, '07:37 AM', '01:28 PM', true),
            (v_m_r4, s_abb_circle, 5, '07:44 AM', '01:21 PM', true),
            (v_m_r4, s_civil_hosp, 6, '07:50 AM', '01:15 PM', true),
            (v_m_r4, s_shalimar, 7, '07:56 AM', '01:09 PM', true),
            (v_m_r4, s_kkw, 8, '08:15 AM', '12:50 PM', false);
    END LOOP;

    -- =========================================================================
    -- ROUTE 5: GANGAPUR ROAD (Morning Shift)
    -- TO_COLLEGE: Gangapur Road (1) -> Nimani (2) -> Makhamalabad Naka (3) -> Chopada Lawns (4) -> Horizon School (5) -> Jehan Circle (6) -> Nerlikar Hospital (7) -> Gangapur Road (8) -> Ashok Stambh (9) -> Ramwadi (10) -> Nimani (11)
    -- TO_HOME: Nimani (1) -> Ramwadi (2) -> Ashok Stambh (3) -> Gangapur Road (4) -> Nerlikar Hospital (5) -> Jehan Circle (6) -> Horizon School (7) -> Chopada Lawns (8) -> Makhamalabad Naka (9) -> Nimani (10) -> Gangapur Road (11)
    -- =========================================================================
    FOR v_m_r5 IN SELECT id FROM public.routes WHERE route_number = 'ROUTE 5' LOOP
        -- TO_COLLEGE
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r5, 'TO_COLLEGE', 1, s_gangapur_road, '07:05 AM', '02:00 PM', true),
            (v_m_r5, 'TO_COLLEGE', 2, s_nimani, '07:15 AM', '01:50 PM', true),
            (v_m_r5, 'TO_COLLEGE', 3, s_makhamalabad, '07:22 AM', '01:43 PM', true),
            (v_m_r5, 'TO_COLLEGE', 4, s_chopada, '07:28 AM', '01:37 PM', true),
            (v_m_r5, 'TO_COLLEGE', 5, s_horizon, '07:35 AM', '01:30 PM', true),
            (v_m_r5, 'TO_COLLEGE', 6, s_jehan, '07:41 AM', '01:24 PM', true),
            (v_m_r5, 'TO_COLLEGE', 7, s_nerlikar, '07:47 AM', '01:18 PM', true),
            (v_m_r5, 'TO_COLLEGE', 8, s_gangapur_road, '07:53 AM', '01:12 PM', true),
            (v_m_r5, 'TO_COLLEGE', 9, s_ashok_stambh, '07:59 AM', '01:06 PM', true),
            (v_m_r5, 'TO_COLLEGE', 10, s_ramwadi, '08:05 AM', '01:00 PM', true),
            (v_m_r5, 'TO_COLLEGE', 11, s_nimani, '08:15 AM', '12:50 PM', false);

        -- TO_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r5, 'TO_HOME', 1, s_nimani, '12:50 PM', '08:15 AM', false),
            (v_m_r5, 'TO_HOME', 2, s_ramwadi, '01:00 PM', '08:05 AM', true),
            (v_m_r5, 'TO_HOME', 3, s_ashok_stambh, '01:06 PM', '07:59 AM', true),
            (v_m_r5, 'TO_HOME', 4, s_gangapur_road, '01:12 PM', '07:53 AM', true),
            (v_m_r5, 'TO_HOME', 5, s_nerlikar, '01:18 PM', '07:47 AM', true),
            (v_m_r5, 'TO_HOME', 6, s_jehan, '01:24 PM', '07:41 AM', true),
            (v_m_r5, 'TO_HOME', 7, s_horizon, '01:30 PM', '07:35 AM', true),
            (v_m_r5, 'TO_HOME', 8, s_chopada, '01:37 PM', '07:28 AM', true),
            (v_m_r5, 'TO_HOME', 9, s_makhamalabad, '01:43 PM', '07:22 AM', true),
            (v_m_r5, 'TO_HOME', 10, s_nimani, '01:50 PM', '07:15 AM', true),
            (v_m_r5, 'TO_HOME', 11, s_gangapur_road, '02:00 PM', '07:05 AM', true);

        -- RETURNING_HOME (Alias)
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r5, 'RETURNING_HOME', 1, s_nimani, '12:50 PM', '08:15 AM', false),
            (v_m_r5, 'RETURNING_HOME', 2, s_ramwadi, '01:00 PM', '08:05 AM', true),
            (v_m_r5, 'RETURNING_HOME', 3, s_ashok_stambh, '01:06 PM', '07:59 AM', true),
            (v_m_r5, 'RETURNING_HOME', 4, s_gangapur_road, '01:12 PM', '07:53 AM', true),
            (v_m_r5, 'RETURNING_HOME', 5, s_nerlikar, '01:18 PM', '07:47 AM', true),
            (v_m_r5, 'RETURNING_HOME', 6, s_jehan, '01:24 PM', '07:41 AM', true),
            (v_m_r5, 'RETURNING_HOME', 7, s_horizon, '01:30 PM', '07:35 AM', true),
            (v_m_r5, 'RETURNING_HOME', 8, s_chopada, '01:37 PM', '07:28 AM', true),
            (v_m_r5, 'RETURNING_HOME', 9, s_makhamalabad, '01:43 PM', '07:22 AM', true),
            (v_m_r5, 'RETURNING_HOME', 10, s_nimani, '01:50 PM', '07:15 AM', true),
            (v_m_r5, 'RETURNING_HOME', 11, s_gangapur_road, '02:00 PM', '07:05 AM', true);

        DELETE FROM public.route_stops WHERE route_id = v_m_r5;
        INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible) VALUES
            (v_m_r5, s_gangapur_road, 1, '07:05 AM', '02:00 PM', true),
            (v_m_r5, s_nimani, 2, '07:15 AM', '01:50 PM', true),
            (v_m_r5, s_makhamalabad, 3, '07:22 AM', '01:43 PM', true),
            (v_m_r5, s_chopada, 4, '07:28 AM', '01:37 PM', true),
            (v_m_r5, s_horizon, 5, '07:35 AM', '01:30 PM', true),
            (v_m_r5, s_jehan, 6, '07:41 AM', '01:24 PM', true),
            (v_m_r5, s_nerlikar, 7, '07:47 AM', '01:18 PM', true),
            (v_m_r5, s_gangapur_road, 8, '07:53 AM', '01:12 PM', true),
            (v_m_r5, s_ashok_stambh, 9, '07:59 AM', '01:06 PM', true),
            (v_m_r5, s_ramwadi, 10, '08:05 AM', '01:00 PM', true),
            (v_m_r5, s_nimani, 11, '08:15 AM', '12:50 PM', false);
    END LOOP;
END $$;

-- 2. STUDENT TRANSPORT RLS: ALLOW DRIVERS AND ADMINS TO VIEW APPROVED PASSENGERS
DROP POLICY IF EXISTS "Drivers can view approved student transports" ON public.student_transport;
CREATE POLICY "Drivers can view approved student transports"
ON public.student_transport
FOR SELECT
TO authenticated
USING (
    status = 'approved' OR
    auth.uid() = student_id OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'driver')
    )
);

-- 3. RPC: GET JOURNEY STUDENT MANIFEST (CLEAN RELIABLE RPC FOR DRIVERS)
CREATE OR REPLACE FUNCTION public.get_journey_student_manifest(
    p_route_id UUID,
    p_shift_id UUID
)
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    prn TEXT,
    phone TEXT,
    pickup_stop_id UUID,
    pickup_stop_name TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.student_id,
        COALESCE(p.full_name, 'Student Rider')::TEXT AS full_name,
        COALESCE(s.prn, 'N/A')::TEXT AS prn,
        COALESCE(p.phone, '')::TEXT AS phone,
        st.pickup_stop_id,
        COALESCE(stp.name, 'Designated Stop')::TEXT AS pickup_stop_name,
        st.status::TEXT AS status
    FROM public.student_transport st
    JOIN public.profiles p ON p.id = st.student_id
    LEFT JOIN public.students s ON s.id = st.student_id
    LEFT JOIN public.stops stp ON stp.id = st.pickup_stop_id
    WHERE st.route_id = p_route_id
      AND st.shift_id = p_shift_id
      AND st.status = 'approved'
    ORDER BY p.full_name;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_journey_student_manifest(UUID, UUID) TO authenticated, anon;

-- 4. RPC: ADMIN CREATE DRIVER WITH DIRECT PASSWORD (NO PLAINTEXT STORAGE)
CREATE OR REPLACE FUNCTION public.admin_create_driver_with_password(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_phone TEXT,
    p_license_number TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_role TEXT;
    v_clean_email TEXT;
    v_user_id UUID;
    v_now TIMESTAMPTZ := NOW();
    v_encrypted_pwd TEXT;
    v_badge_num TEXT;
BEGIN
    -- Verify caller is admin
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Forbidden: Administrative authorization required.');
    END IF;

    -- Validate input
    v_clean_email := LOWER(TRIM(p_email));
    IF v_clean_email IS NULL OR v_clean_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Driver email address is required.');
    END IF;

    IF LENGTH(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters long.');
    END IF;

    v_encrypted_pwd := crypt(p_password, gen_salt('bf'));

    -- Check if user already exists in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_clean_email;

    IF v_user_id IS NOT NULL THEN
        -- Check if profile exists and has role other than driver
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND role <> 'driver') THEN
            RETURN jsonb_build_object('success', false, 'error', 'An account with this email already exists under another institutional role.');
        END IF;

        -- Update existing auth user password and confirm email
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pwd,
            email_confirmed_at = COALESCE(email_confirmed_at, v_now),
            updated_at = v_now,
            raw_user_meta_data = jsonb_build_object(
                'full_name', TRIM(p_full_name),
                'role', 'driver',
                'phone', TRIM(p_phone)
            )
        WHERE id = v_user_id;

        -- Also ensure auth.identities has valid entry
        IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email') THEN
            INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
            VALUES (gen_random_uuid(), v_clean_email, v_user_id, jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email), 'email', v_now, v_now, v_now);
        END IF;
    ELSE
        -- Create new user in auth.users
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
            updated_at,
            is_sso_user,
            is_anonymous
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            v_clean_email,
            v_encrypted_pwd,
            v_now,
            jsonb_build_object('provider', 'email', 'providers', array['email']),
            jsonb_build_object('full_name', TRIM(p_full_name), 'role', 'driver', 'phone', TRIM(p_phone)),
            v_now,
            v_now,
            false,
            false
        );

        INSERT INTO auth.identities (
            id,
            provider_id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_clean_email,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email),
            'email',
            v_now,
            v_now,
            v_now
        );
    END IF;

    -- Upsert profile
    INSERT INTO public.profiles (
        id, email, full_name, phone, role, status, avatar_seed, avatar_bg, created_at, updated_at
    ) VALUES (
        v_user_id,
        v_clean_email,
        TRIM(p_full_name),
        TRIM(p_phone),
        'driver',
        p_status,
        LOWER(REGEXP_REPLACE(TRIM(p_full_name), '\s+', '-', 'g')),
        'bg-emerald-100 text-emerald-800 border-emerald-300',
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

-- 5. RPC: ADMIN RESET DRIVER PASSWORD
CREATE OR REPLACE FUNCTION public.admin_reset_driver_password(
    p_driver_id UUID,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, v_now),
        updated_at = v_now
    WHERE id = p_driver_id;

    RETURN jsonb_build_object('success', true, 'message', 'Driver password updated successfully.');
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_reset_driver_password(UUID, TEXT) TO authenticated;


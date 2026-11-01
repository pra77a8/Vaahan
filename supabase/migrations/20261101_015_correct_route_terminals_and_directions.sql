-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - MIGRATION 015
-- Complete Route Direction Correction, Route Terminals, Directional Stops,
-- Route Assignments, and Student Assignment Notification Architecture
-- =============================================================================

-- 1. UPDATE CHECK CONSTRAINTS TO SUPPORT TO_COLLEGE, TO_HOME, AND RETURNING_HOME
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_direction_check;
ALTER TABLE public.trips ADD CONSTRAINT trips_direction_check CHECK (direction IN ('TO_COLLEGE', 'TO_HOME', 'RETURNING_HOME'));

ALTER TABLE public.route_direction_stops DROP CONSTRAINT IF EXISTS route_direction_stops_direction_check;
ALTER TABLE public.route_direction_stops ADD CONSTRAINT route_direction_stops_direction_check CHECK (direction IN ('TO_COLLEGE', 'TO_HOME', 'RETURNING_HOME'));

-- 2. INSERT OR UPDATE OFFICIAL PHYSICAL STOPS (VERIFIED COORDINATES)
INSERT INTO public.stops (name, landmark, latitude, longitude)
VALUES
    ('K K Wagh Education Society', 'Amrutdham Campus Gate', 20.0258, 73.8268),
    ('Jail Road', 'Jail Road Terminal / Nashik Road', 19.9480, 73.8410),
    ('Pune Road', 'Pune Road Highway Terminal', 19.9450, 73.8050),
    ('CIDCO', 'CIDCO Bus Stand / Trimurti Chowk', 19.9650, 73.7550),
    ('College Road', 'KTHM / BYK College Belt', 20.0050, 73.7620),
    ('Gangapur Road', 'Gangapur Road Main Avenue', 20.0130, 73.7700),
    ('Bytco Point', 'Nashik Road Bytco Hospital Circle', 19.9634, 73.8291),
    ('Sailani Baba Square', 'Jail Road Junction', 19.9540, 73.8390),
    ('Datta Mandir Square', 'Datta Mandir Road', 19.9660, 73.8270),
    ('Vijay Mamta', 'Vijay Mamta Chowk', 19.9710, 73.8220),
    ('Vijay Mamta Datta Mandir Square', 'Datta Mandir Road', 19.9688, 73.8242),
    ('Bodhale Nagar', 'Pune Highway Junction', 19.9790, 73.8150),
    ('Kathe Lane', 'Dwarka-Kathe Galli Corridor', 19.9931, 73.8098),
    ('Dwarka Stop', 'Dwarka Circle Underpass', 19.9880, 73.8050),
    ('Dwaraka Stop', 'Dwarka Circle Flyover Pillar', 19.9882, 73.8054),
    ('Bombay Naka', 'Near Old Agra Road Crossing', 19.9860, 73.7880),
    ('Kamod Nagar', 'Indira Nagar Approach', 19.9720, 73.7780),
    ('Bombay Naka / Kamod Nagar', 'Bombay Naka Corridor', 19.9790, 73.7830),
    ('Indira Nagar Jogging Track', 'Jogging Track Corner', 19.9670, 73.7740),
    ('Rane Nagar', 'Highway Service Road Cross', 19.9590, 73.7690),
    ('Pathardi Phata', 'Mumbai-Agra Highway Junction', 19.9480, 73.7620),
    ('Shubham Park', 'CIDCO Sector 4 Corner', 19.9620, 73.7580),
    ('Trimurti Square', 'Trimurti Chowk CIDCO', 19.9720, 73.7590),
    ('Tidake Colony', 'Near Tidke Colony Chowk', 19.9840, 73.7720),
    ('Tidke Colony', 'Tidke Colony Central Square', 19.9845, 73.7725),
    ('Divya AdLab', 'CIDCO Multiplex Square', 19.9770, 73.7610),
    ('Untwadi', 'Untwadi Road Bridge', 19.9790, 73.7690),
    ('Sarada Circle', 'Sharda Kanya Vidyalaya', 19.9920, 73.7950),
    ('Rajiv Gandhi Bhavan', 'NMC Headquarters', 20.0040, 73.7790),
    ('Canada Corner', 'Canada Corner Signal Junction', 20.0030, 73.7740),
    ('Bhosla School', 'Bhosla Military Campus Crossing', 19.9980, 73.7680),
    ('ABB Circle', 'Trimbak Road Signal', 19.9890, 73.7660),
    ('Civil Hospital', 'District Civil Hospital Gate', 20.0010, 73.7860),
    ('Shalimar Stop', 'CBS Shalimar Central Chowk', 19.9970, 73.7890),
    ('Nimani', 'Nimani Bus Stand Panchavati', 20.0120, 73.8010),
    ('Makhamalabad Naka', 'Panchavati Extension Crossing', 20.0270, 73.7850),
    ('Chopada Lawns', 'Near Godavari River Bank', 20.0240, 73.7670),
    ('Horizon School', 'Gangapur Shivar', 20.0210, 73.7580),
    ('Jehan Circle', 'Gangapur Naka Circle', 20.0160, 73.7630),
    ('Nerlikar Hospital', 'Nerlikar Chowk', 20.0100, 73.7780),
    ('Ashok Stambh', 'Central Commercial Hub', 20.0030, 73.7890),
    ('Ramwadi', 'Ramwadi Police Chowky', 20.0070, 73.7990),
    ('Rmawadi', 'Ramwadi Police Chowky', 20.0070, 73.7990)
ON CONFLICT (name) DO UPDATE 
SET landmark = EXCLUDED.landmark,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude;

-- 3. REPOPULATE ROUTE_STOPS & ROUTE_DIRECTION_STOPS WITH ACCURATE DIRECTION SEQUENCES
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

    -- Stop ID helpers
    s_kkw UUID;
    s_jail_road UUID;
    s_pune_road UUID;
    s_cidco UUID;
    s_college_road UUID;
    s_gangapur_road UUID;
    s_bytco UUID;
    s_sailani UUID;
    s_datta_mandir UUID;
    s_vijay_mamta UUID;
    s_bodhale_nagar UUID;
    s_kathe_lane UUID;
    s_dwarka UUID;
    s_dwaraka UUID;
    s_bombay_naka UUID;
    s_kamod_nagar UUID;
    s_bombay_kamod UUID;
    s_indira_jogging UUID;
    s_rane_nagar UUID;
    s_pathardi_phata UUID;
    s_shubham_park UUID;
    s_trimurti UUID;
    s_tidake_colony UUID;
    s_tidke_colony UUID;
    s_divya_adlab UUID;
    s_untwadi UUID;
    s_rajiv_bhavan UUID;
    s_canada_corner UUID;
    s_bhosla UUID;
    s_abb_circle UUID;
    s_civil_hosp UUID;
    s_shalimar UUID;
    s_nimani UUID;
    s_makhamalabad UUID;
    s_chopada UUID;
    s_horizon UUID;
    s_jehan UUID;
    s_nerlikar UUID;
    s_ashok_stambh UUID;
    s_ramwadi UUID;
    s_sarada_circle UUID;
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
    SELECT id INTO s_pune_road FROM public.stops WHERE name = 'Pune Road' LIMIT 1;
    SELECT id INTO s_cidco FROM public.stops WHERE name = 'CIDCO' LIMIT 1;
    SELECT id INTO s_college_road FROM public.stops WHERE name = 'College Road' LIMIT 1;
    SELECT id INTO s_gangapur_road FROM public.stops WHERE name = 'Gangapur Road' LIMIT 1;
    SELECT id INTO s_bytco FROM public.stops WHERE name = 'Bytco Point' LIMIT 1;
    SELECT id INTO s_sailani FROM public.stops WHERE name = 'Sailani Baba Square' LIMIT 1;
    SELECT id INTO s_datta_mandir FROM public.stops WHERE name = 'Datta Mandir Square' LIMIT 1;
    SELECT id INTO s_vijay_mamta FROM public.stops WHERE name = 'Vijay Mamta' LIMIT 1;
    SELECT id INTO s_bodhale_nagar FROM public.stops WHERE name = 'Bodhale Nagar' LIMIT 1;
    SELECT id INTO s_kathe_lane FROM public.stops WHERE name = 'Kathe Lane' LIMIT 1;
    SELECT id INTO s_dwarka FROM public.stops WHERE name = 'Dwarka Stop' LIMIT 1;
    SELECT id INTO s_dwaraka FROM public.stops WHERE name = 'Dwaraka Stop' LIMIT 1;
    SELECT id INTO s_bombay_naka FROM public.stops WHERE name = 'Bombay Naka' LIMIT 1;
    SELECT id INTO s_kamod_nagar FROM public.stops WHERE name = 'Kamod Nagar' LIMIT 1;
    SELECT id INTO s_bombay_kamod FROM public.stops WHERE name = 'Bombay Naka / Kamod Nagar' LIMIT 1;
    SELECT id INTO s_indira_jogging FROM public.stops WHERE name = 'Indira Nagar Jogging Track' LIMIT 1;
    SELECT id INTO s_rane_nagar FROM public.stops WHERE name = 'Rane Nagar' LIMIT 1;
    SELECT id INTO s_pathardi_phata FROM public.stops WHERE name = 'Pathardi Phata' LIMIT 1;
    SELECT id INTO s_shubham_park FROM public.stops WHERE name = 'Shubham Park' LIMIT 1;
    SELECT id INTO s_trimurti FROM public.stops WHERE name = 'Trimurti Square' LIMIT 1;
    SELECT id INTO s_tidake_colony FROM public.stops WHERE name = 'Tidake Colony' LIMIT 1;
    SELECT id INTO s_tidke_colony FROM public.stops WHERE name = 'Tidke Colony' LIMIT 1;
    SELECT id INTO s_divya_adlab FROM public.stops WHERE name = 'Divya AdLab' LIMIT 1;
    SELECT id INTO s_untwadi FROM public.stops WHERE name = 'Untwadi' LIMIT 1;
    SELECT id INTO s_rajiv_bhavan FROM public.stops WHERE name = 'Rajiv Gandhi Bhavan' LIMIT 1;
    SELECT id INTO s_canada_corner FROM public.stops WHERE name = 'Canada Corner' LIMIT 1;
    SELECT id INTO s_bhosla FROM public.stops WHERE name = 'Bhosla School' LIMIT 1;
    SELECT id INTO s_abb_circle FROM public.stops WHERE name = 'ABB Circle' LIMIT 1;
    SELECT id INTO s_civil_hosp FROM public.stops WHERE name = 'Civil Hospital' LIMIT 1;
    SELECT id INTO s_shalimar FROM public.stops WHERE name = 'Shalimar Stop' LIMIT 1;
    SELECT id INTO s_nimani FROM public.stops WHERE name = 'Nimani' LIMIT 1;
    SELECT id INTO s_makhamalabad FROM public.stops WHERE name = 'Makhamalabad Naka' LIMIT 1;
    SELECT id INTO s_chopada FROM public.stops WHERE name = 'Chopada Lawns' LIMIT 1;
    SELECT id INTO s_horizon FROM public.stops WHERE name = 'Horizon School' LIMIT 1;
    SELECT id INTO s_jehan FROM public.stops WHERE name = 'Jehan Circle' LIMIT 1;
    SELECT id INTO s_nerlikar FROM public.stops WHERE name = 'Nerlikar Hospital' LIMIT 1;
    SELECT id INTO s_ashok_stambh FROM public.stops WHERE name = 'Ashok Stambh' LIMIT 1;
    SELECT id INTO s_ramwadi FROM public.stops WHERE name = 'Ramwadi' LIMIT 1;
    SELECT id INTO s_sarada_circle FROM public.stops WHERE name = 'Sarada Circle' LIMIT 1;

    -- Clear existing directional stops to cleanly rebuild with exact sequences
    DELETE FROM public.route_direction_stops;

    -- =========================================================================
    -- ROUTE 1: JAIL ROAD (Morning & General)
    -- TO_COLLEGE: Jail Road -> Bytco Point -> Sailani Baba Square -> K K Wagh Education Society
    -- TO_HOME: K K Wagh Education Society -> Sailani Baba Square -> Bytco Point -> Jail Road
    -- =========================================================================
    FOR v_m_r1 IN SELECT id FROM public.routes WHERE route_number = 'ROUTE 1' LOOP
        -- TO_COLLEGE
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r1, 'TO_COLLEGE', 1, s_jail_road, '07:15 AM', '01:50 PM', true),
            (v_m_r1, 'TO_COLLEGE', 2, s_bytco, '07:30 AM', '01:35 PM', true),
            (v_m_r1, 'TO_COLLEGE', 3, s_sailani, '07:42 AM', '01:25 PM', true),
            (v_m_r1, 'TO_COLLEGE', 4, s_kkw, '08:00 AM', '01:15 PM', false);

        -- TO_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r1, 'TO_HOME', 1, s_kkw, '01:15 PM', '08:00 AM', false),
            (v_m_r1, 'TO_HOME', 2, s_sailani, '01:25 PM', '07:42 AM', true),
            (v_m_r1, 'TO_HOME', 3, s_bytco, '01:35 PM', '07:30 AM', true),
            (v_m_r1, 'TO_HOME', 4, s_jail_road, '01:50 PM', '07:15 AM', true);

        -- RETURNING_HOME (Alias for backward compatibility)
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r1, 'RETURNING_HOME', 1, s_kkw, '01:15 PM', '08:00 AM', false),
            (v_m_r1, 'RETURNING_HOME', 2, s_sailani, '01:25 PM', '07:42 AM', true),
            (v_m_r1, 'RETURNING_HOME', 3, s_bytco, '01:35 PM', '07:30 AM', true),
            (v_m_r1, 'RETURNING_HOME', 4, s_jail_road, '01:50 PM', '07:15 AM', true);
    END LOOP;

    -- =========================================================================
    -- ROUTE 2: PUNE ROAD (Morning & General)
    -- TO_COLLEGE: Pune Road -> Bytco Point -> Datta Mandir Square -> Vijay Mamta -> Bodhale Nagar -> Kathe Lane -> K K Wagh Education Society
    -- TO_HOME: K K Wagh Education Society -> Kathe Lane -> Bodhale Nagar -> Vijay Mamta -> Datta Mandir Square -> Bytco Point -> Pune Road
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

        -- RETURNING_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r2, 'RETURNING_HOME', 1, s_kkw, '01:10 PM', '08:05 AM', false),
            (v_m_r2, 'RETURNING_HOME', 2, s_kathe_lane, '01:18 PM', '07:52 AM', true),
            (v_m_r2, 'RETURNING_HOME', 3, s_bodhale_nagar, '01:25 PM', '07:45 AM', true),
            (v_m_r2, 'RETURNING_HOME', 4, s_vijay_mamta, '01:32 PM', '07:38 AM', true),
            (v_m_r2, 'RETURNING_HOME', 5, s_datta_mandir, '01:38 PM', '07:32 AM', true),
            (v_m_r2, 'RETURNING_HOME', 6, s_bytco, '01:45 PM', '07:25 AM', true),
            (v_m_r2, 'RETURNING_HOME', 7, s_pune_road, '01:55 PM', '07:15 AM', true);
    END LOOP;

    -- =========================================================================
    -- ROUTE 3: CIDCO (Morning Shift)
    -- TO_COLLEGE: CIDCO -> Dwarka Stop -> Tidake Colony -> Trimurti Square -> Shubham Park -> Pathardi Phata -> Rane Nagar -> Indira Nagar Jogging Track -> Bombay Naka / Kamod Nagar -> Dwaraka Stop -> K K Wagh Education Society
    -- TO_HOME: K K Wagh Education Society -> Dwaraka Stop -> Bombay Naka / Kamod Nagar -> Indira Nagar Jogging Track -> Rane Nagar -> Pathardi Phata -> Shubham Park -> Trimurti Square -> Tidake Colony -> Dwarka Stop -> CIDCO
    -- =========================================================================
    IF v_m_r3 IS NOT NULL THEN
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
            (v_m_r3, 'TO_COLLEGE', 9, s_bombay_kamod, '07:59 AM', '01:06 PM', true),
            (v_m_r3, 'TO_COLLEGE', 10, s_dwaraka, '08:05 AM', '01:00 PM', true),
            (v_m_r3, 'TO_COLLEGE', 11, s_kkw, '08:20 AM', '12:45 PM', false);

        -- TO_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r3, 'TO_HOME', 1, s_kkw, '12:45 PM', '08:20 AM', false),
            (v_m_r3, 'TO_HOME', 2, s_dwaraka, '01:00 PM', '08:05 AM', true),
            (v_m_r3, 'TO_HOME', 3, s_bombay_kamod, '01:06 PM', '07:59 AM', true),
            (v_m_r3, 'TO_HOME', 4, s_indira_jogging, '01:11 PM', '07:54 AM', true),
            (v_m_r3, 'TO_HOME', 5, s_rane_nagar, '01:16 PM', '07:49 AM', true),
            (v_m_r3, 'TO_HOME', 6, s_pathardi_phata, '01:21 PM', '07:44 AM', true),
            (v_m_r3, 'TO_HOME', 7, s_shubham_park, '01:27 PM', '07:38 AM', true),
            (v_m_r3, 'TO_HOME', 8, s_trimurti, '01:33 PM', '07:32 AM', true),
            (v_m_r3, 'TO_HOME', 9, s_tidake_colony, '01:40 PM', '07:25 AM', true),
            (v_m_r3, 'TO_HOME', 10, s_dwarka, '01:48 PM', '07:18 AM', true),
            (v_m_r3, 'TO_HOME', 11, s_cidco, '02:00 PM', '07:05 AM', true);

        -- RETURNING_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r3, 'RETURNING_HOME', 1, s_kkw, '12:45 PM', '08:20 AM', false),
            (v_m_r3, 'RETURNING_HOME', 2, s_dwaraka, '01:00 PM', '08:05 AM', true),
            (v_m_r3, 'RETURNING_HOME', 3, s_bombay_kamod, '01:06 PM', '07:59 AM', true),
            (v_m_r3, 'RETURNING_HOME', 4, s_indira_jogging, '01:11 PM', '07:54 AM', true),
            (v_m_r3, 'RETURNING_HOME', 5, s_rane_nagar, '01:16 PM', '07:49 AM', true),
            (v_m_r3, 'RETURNING_HOME', 6, s_pathardi_phata, '01:21 PM', '07:44 AM', true),
            (v_m_r3, 'RETURNING_HOME', 7, s_shubham_park, '01:27 PM', '07:38 AM', true),
            (v_m_r3, 'RETURNING_HOME', 8, s_trimurti, '01:33 PM', '07:32 AM', true),
            (v_m_r3, 'RETURNING_HOME', 9, s_tidake_colony, '01:40 PM', '07:25 AM', true),
            (v_m_r3, 'RETURNING_HOME', 10, s_dwarka, '01:48 PM', '07:18 AM', true),
            (v_m_r3, 'RETURNING_HOME', 11, s_cidco, '02:00 PM', '07:05 AM', true);
    END IF;

    -- ROUTE 3: CIDCO (General Shift)
    IF v_g_r3 IS NOT NULL THEN
        -- TO_COLLEGE
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_g_r3, 'TO_COLLEGE', 1, s_cidco, '08:35 AM', '05:55 PM', true),
            (v_g_r3, 'TO_COLLEGE', 2, s_dwarka, '08:48 AM', '05:42 PM', true),
            (v_g_r3, 'TO_COLLEGE', 3, s_divya_adlab, '08:55 AM', '05:35 PM', true),
            (v_g_r3, 'TO_COLLEGE', 4, s_untwadi, '09:02 AM', '05:28 PM', true),
            (v_g_r3, 'TO_COLLEGE', 5, s_tidke_colony, '09:08 AM', '05:22 PM', true),
            (v_g_r3, 'TO_COLLEGE', 6, s_trimurti, '09:14 AM', '05:16 PM', true),
            (v_g_r3, 'TO_COLLEGE', 7, s_shubham_park, '09:20 AM', '05:10 PM', true),
            (v_g_r3, 'TO_COLLEGE', 8, s_pathardi_phata, '09:25 AM', '05:05 PM', true),
            (v_g_r3, 'TO_COLLEGE', 9, s_rane_nagar, '09:30 AM', '05:00 PM', true),
            (v_g_r3, 'TO_COLLEGE', 10, s_kamod_nagar, '09:35 AM', '04:55 PM', true),
            (v_g_r3, 'TO_COLLEGE', 11, s_bombay_naka, '09:40 AM', '04:50 PM', true),
            (v_g_r3, 'TO_COLLEGE', 12, s_dwaraka, '09:47 AM', '04:43 PM', true),
            (v_g_r3, 'TO_COLLEGE', 13, s_kkw, '10:05 AM', '04:30 PM', false);

        -- TO_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_g_r3, 'TO_HOME', 1, s_kkw, '04:30 PM', '10:05 AM', false),
            (v_g_r3, 'TO_HOME', 2, s_dwaraka, '04:43 PM', '09:47 AM', true),
            (v_g_r3, 'TO_HOME', 3, s_bombay_naka, '04:50 PM', '09:40 AM', true),
            (v_g_r3, 'TO_HOME', 4, s_kamod_nagar, '04:55 PM', '09:35 AM', true),
            (v_g_r3, 'TO_HOME', 5, s_rane_nagar, '05:00 PM', '09:30 AM', true),
            (v_g_r3, 'TO_HOME', 6, s_pathardi_phata, '05:05 PM', '09:25 AM', true),
            (v_g_r3, 'TO_HOME', 7, s_shubham_park, '05:10 PM', '09:20 AM', true),
            (v_g_r3, 'TO_HOME', 8, s_trimurti, '05:16 PM', '09:14 AM', true),
            (v_g_r3, 'TO_HOME', 9, s_tidke_colony, '05:22 PM', '09:08 AM', true),
            (v_g_r3, 'TO_HOME', 10, s_untwadi, '05:28 PM', '09:02 AM', true),
            (v_g_r3, 'TO_HOME', 11, s_divya_adlab, '05:35 PM', '08:55 AM', true),
            (v_g_r3, 'TO_HOME', 12, s_dwarka, '05:42 PM', '08:48 AM', true),
            (v_g_r3, 'TO_HOME', 13, s_cidco, '05:55 PM', '08:35 AM', true);

        -- RETURNING_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_g_r3, 'RETURNING_HOME', 1, s_kkw, '04:30 PM', '10:05 AM', false),
            (v_g_r3, 'RETURNING_HOME', 2, s_dwaraka, '04:43 PM', '09:47 AM', true),
            (v_g_r3, 'RETURNING_HOME', 3, s_bombay_naka, '04:50 PM', '09:40 AM', true),
            (v_g_r3, 'RETURNING_HOME', 4, s_kamod_nagar, '04:55 PM', '09:35 AM', true),
            (v_g_r3, 'RETURNING_HOME', 5, s_rane_nagar, '05:00 PM', '09:30 AM', true),
            (v_g_r3, 'RETURNING_HOME', 6, s_pathardi_phata, '05:05 PM', '09:25 AM', true),
            (v_g_r3, 'RETURNING_HOME', 7, s_shubham_park, '05:10 PM', '09:20 AM', true),
            (v_g_r3, 'RETURNING_HOME', 8, s_trimurti, '05:16 PM', '09:14 AM', true),
            (v_g_r3, 'RETURNING_HOME', 9, s_tidke_colony, '05:22 PM', '09:08 AM', true),
            (v_g_r3, 'RETURNING_HOME', 10, s_untwadi, '05:28 PM', '09:02 AM', true),
            (v_g_r3, 'RETURNING_HOME', 11, s_divya_adlab, '05:35 PM', '08:55 AM', true),
            (v_g_r3, 'RETURNING_HOME', 12, s_dwarka, '05:42 PM', '08:48 AM', true),
            (v_g_r3, 'RETURNING_HOME', 13, s_cidco, '05:55 PM', '08:35 AM', true);
    END IF;

    -- =========================================================================
    -- ROUTE 4: COLLEGE ROAD (Morning Shift)
    -- TO_COLLEGE: College Road -> Rajiv Gandhi Bhavan -> Canada Corner -> Bhosla School -> ABB Circle -> Civil Hospital -> Shalimar Stop -> K K Wagh Education Society
    -- TO_HOME: K K Wagh Education Society -> Shalimar Stop -> Civil Hospital -> ABB Circle -> Bhosla School -> Canada Corner -> Rajiv Gandhi Bhavan -> College Road
    -- =========================================================================
    IF v_m_r4 IS NOT NULL THEN
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

        -- RETURNING_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r4, 'RETURNING_HOME', 1, s_kkw, '12:50 PM', '08:15 AM', false),
            (v_m_r4, 'RETURNING_HOME', 2, s_shalimar, '01:09 PM', '07:56 AM', true),
            (v_m_r4, 'RETURNING_HOME', 3, s_civil_hosp, '01:15 PM', '07:50 AM', true),
            (v_m_r4, 'RETURNING_HOME', 4, s_abb_circle, '01:21 PM', '07:44 AM', true),
            (v_m_r4, 'RETURNING_HOME', 5, s_bhosla, '01:28 PM', '07:37 AM', true),
            (v_m_r4, 'RETURNING_HOME', 6, s_canada_corner, '01:36 PM', '07:29 AM', true),
            (v_m_r4, 'RETURNING_HOME', 7, s_rajiv_bhavan, '01:43 PM', '07:22 AM', true),
            (v_m_r4, 'RETURNING_HOME', 8, s_college_road, '01:55 PM', '07:10 AM', true);
    END IF;

    -- ROUTE 4: COLLEGE ROAD / GANGAPUR ROAD (General Shift)
    IF v_g_r4 IS NOT NULL THEN
        -- TO_COLLEGE
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_g_r4, 'TO_COLLEGE', 1, s_college_road, '08:40 AM', '05:50 PM', true),
            (v_g_r4, 'TO_COLLEGE', 2, s_rajiv_bhavan, '08:52 AM', '05:38 PM', true),
            (v_g_r4, 'TO_COLLEGE', 3, s_canada_corner, '08:58 AM', '05:32 PM', true),
            (v_g_r4, 'TO_COLLEGE', 4, s_jehan, '09:05 AM', '05:25 PM', true),
            (v_g_r4, 'TO_COLLEGE', 5, s_bhosla, '09:12 AM', '05:18 PM', true),
            (v_g_r4, 'TO_COLLEGE', 6, s_nerlikar, '09:18 AM', '05:12 PM', true),
            (v_g_r4, 'TO_COLLEGE', 7, s_gangapur_road, '09:24 AM', '05:06 PM', true),
            (v_g_r4, 'TO_COLLEGE', 8, s_ashok_stambh, '09:30 AM', '05:00 PM', true),
            (v_g_r4, 'TO_COLLEGE', 9, s_nimani, '09:37 AM', '04:53 PM', true),
            (v_g_r4, 'TO_COLLEGE', 10, s_kkw, '09:55 AM', '04:40 PM', false);

        -- TO_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_g_r4, 'TO_HOME', 1, s_kkw, '04:40 PM', '09:55 AM', false),
            (v_g_r4, 'TO_HOME', 2, s_nimani, '04:53 PM', '09:37 AM', true),
            (v_g_r4, 'TO_HOME', 3, s_ashok_stambh, '05:00 PM', '09:30 AM', true),
            (v_g_r4, 'TO_HOME', 4, s_gangapur_road, '05:06 PM', '09:24 AM', true),
            (v_g_r4, 'TO_HOME', 5, s_nerlikar, '05:12 PM', '09:18 AM', true),
            (v_g_r4, 'TO_HOME', 6, s_bhosla, '05:18 PM', '09:12 AM', true),
            (v_g_r4, 'TO_HOME', 7, s_jehan, '05:25 PM', '09:05 AM', true),
            (v_g_r4, 'TO_HOME', 8, s_canada_corner, '05:32 PM', '08:58 AM', true),
            (v_g_r4, 'TO_HOME', 9, s_rajiv_bhavan, '05:38 PM', '08:52 AM', true),
            (v_g_r4, 'TO_HOME', 10, s_college_road, '05:50 PM', '08:40 AM', true);

        -- RETURNING_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_g_r4, 'RETURNING_HOME', 1, s_kkw, '04:40 PM', '09:55 AM', false),
            (v_g_r4, 'RETURNING_HOME', 2, s_nimani, '04:53 PM', '09:37 AM', true),
            (v_g_r4, 'RETURNING_HOME', 3, s_ashok_stambh, '05:00 PM', '09:30 AM', true),
            (v_g_r4, 'RETURNING_HOME', 4, s_gangapur_road, '05:06 PM', '09:24 AM', true),
            (v_g_r4, 'RETURNING_HOME', 5, s_nerlikar, '05:12 PM', '09:18 AM', true),
            (v_g_r4, 'RETURNING_HOME', 6, s_bhosla, '05:18 PM', '09:12 AM', true),
            (v_g_r4, 'RETURNING_HOME', 7, s_jehan, '05:25 PM', '09:05 AM', true),
            (v_g_r4, 'RETURNING_HOME', 8, s_canada_corner, '05:32 PM', '08:58 AM', true),
            (v_g_r4, 'RETURNING_HOME', 9, s_rajiv_bhavan, '05:38 PM', '08:52 AM', true),
            (v_g_r4, 'RETURNING_HOME', 10, s_college_road, '05:50 PM', '08:40 AM', true);
    END IF;

    -- =========================================================================
    -- ROUTE 5: GANGAPUR ROAD (Morning Shift)
    -- TO_COLLEGE: Gangapur Road -> Nimani -> Makhamalabad Naka -> Chopada Lawns -> Horizon School -> Jehan Circle -> Nerlikar Hospital -> Ashok Stambh -> Ramwadi -> K K Wagh Education Society
    -- TO_HOME: K K Wagh Education Society -> Ramwadi -> Ashok Stambh -> Nerlikar Hospital -> Jehan Circle -> Horizon School -> Chopada Lawns -> Makhamalabad Naka -> Nimani -> Gangapur Road
    -- =========================================================================
    IF v_m_r5 IS NOT NULL THEN
        -- TO_COLLEGE
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r5, 'TO_COLLEGE', 1, s_gangapur_road, '07:05 AM', '02:00 PM', true),
            (v_m_r5, 'TO_COLLEGE', 2, s_nimani, '07:15 AM', '01:50 PM', true),
            (v_m_r5, 'TO_COLLEGE', 3, s_makhamalabad, '07:22 AM', '01:43 PM', true),
            (v_m_r5, 'TO_COLLEGE', 4, s_chopada, '07:28 AM', '01:37 PM', true),
            (v_m_r5, 'TO_COLLEGE', 5, s_horizon, '07:35 AM', '01:30 PM', true),
            (v_m_r5, 'TO_COLLEGE', 6, s_jehan, '07:41 AM', '01:24 PM', true),
            (v_m_r5, 'TO_COLLEGE', 7, s_nerlikar, '07:47 AM', '01:18 PM', true),
            (v_m_r5, 'TO_COLLEGE', 8, s_ashok_stambh, '07:53 AM', '01:12 PM', true),
            (v_m_r5, 'TO_COLLEGE', 9, s_ramwadi, '07:59 AM', '01:06 PM', true),
            (v_m_r5, 'TO_COLLEGE', 10, s_kkw, '08:20 AM', '12:45 PM', false);

        -- TO_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r5, 'TO_HOME', 1, s_kkw, '12:45 PM', '08:20 AM', false),
            (v_m_r5, 'TO_HOME', 2, s_ramwadi, '01:06 PM', '07:59 AM', true),
            (v_m_r5, 'TO_HOME', 3, s_ashok_stambh, '01:12 PM', '07:53 AM', true),
            (v_m_r5, 'TO_HOME', 4, s_nerlikar, '01:18 PM', '07:47 AM', true),
            (v_m_r5, 'TO_HOME', 5, s_jehan, '01:24 PM', '07:41 AM', true),
            (v_m_r5, 'TO_HOME', 6, s_horizon, '01:30 PM', '07:35 AM', true),
            (v_m_r5, 'TO_HOME', 7, s_chopada, '01:37 PM', '07:28 AM', true),
            (v_m_r5, 'TO_HOME', 8, s_makhamalabad, '01:43 PM', '07:22 AM', true),
            (v_m_r5, 'TO_HOME', 9, s_nimani, '01:50 PM', '07:15 AM', true),
            (v_m_r5, 'TO_HOME', 10, s_gangapur_road, '02:00 PM', '07:05 AM', true);

        -- RETURNING_HOME
        INSERT INTO public.route_direction_stops (route_id, direction, sequence_number, stop_id, pickup_time, drop_time, is_student_stop) VALUES
            (v_m_r5, 'RETURNING_HOME', 1, s_kkw, '12:45 PM', '08:20 AM', false),
            (v_m_r5, 'RETURNING_HOME', 2, s_ramwadi, '01:06 PM', '07:59 AM', true),
            (v_m_r5, 'RETURNING_HOME', 3, s_ashok_stambh, '01:12 PM', '07:53 AM', true),
            (v_m_r5, 'RETURNING_HOME', 4, s_nerlikar, '01:18 PM', '07:47 AM', true),
            (v_m_r5, 'RETURNING_HOME', 5, s_jehan, '01:24 PM', '07:41 AM', true),
            (v_m_r5, 'RETURNING_HOME', 6, s_horizon, '01:30 PM', '07:35 AM', true),
            (v_m_r5, 'RETURNING_HOME', 7, s_chopada, '01:37 PM', '07:28 AM', true),
            (v_m_r5, 'RETURNING_HOME', 8, s_makhamalabad, '01:43 PM', '07:22 AM', true),
            (v_m_r5, 'RETURNING_HOME', 9, s_nimani, '01:50 PM', '07:15 AM', true),
            (v_m_r5, 'RETURNING_HOME', 10, s_gangapur_road, '02:00 PM', '07:05 AM', true);
    END IF;

    -- =========================================================================
    -- REPOPULATE BASE ROUTE_STOPS (Sequence 1 = Route Terminal with is_pickup_eligible = true)
    -- =========================================================================
    DELETE FROM public.route_stops;

    -- Route 1 (Morning & General)
    FOR v_m_r1 IN SELECT id FROM public.routes WHERE route_number = 'ROUTE 1' LOOP
        INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible) VALUES
            (v_m_r1, s_jail_road, 1, '07:15 AM', '01:50 PM', true),
            (v_m_r1, s_bytco, 2, '07:30 AM', '01:35 PM', true),
            (v_m_r1, s_sailani, 3, '07:42 AM', '01:25 PM', true),
            (v_m_r1, s_kkw, 4, '08:00 AM', '01:15 PM', false);
    END LOOP;

    -- Route 2 (Morning & General)
    FOR v_m_r2 IN SELECT id FROM public.routes WHERE route_number = 'ROUTE 2' LOOP
        INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible) VALUES
            (v_m_r2, s_pune_road, 1, '07:15 AM', '01:55 PM', true),
            (v_m_r2, s_bytco, 2, '07:25 AM', '01:45 PM', true),
            (v_m_r2, s_datta_mandir, 3, '07:32 AM', '01:38 PM', true),
            (v_m_r2, s_vijay_mamta, 4, '07:38 AM', '01:32 PM', true),
            (v_m_r2, s_bodhale_nagar, 5, '07:45 AM', '01:25 PM', true),
            (v_m_r2, s_kathe_lane, 6, '07:52 AM', '01:18 PM', true),
            (v_m_r2, s_kkw, 7, '08:05 AM', '01:10 PM', false);
    END LOOP;

    -- Route 3 (Morning)
    IF v_m_r3 IS NOT NULL THEN
        INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible) VALUES
            (v_m_r3, s_cidco, 1, '07:05 AM', '02:00 PM', true),
            (v_m_r3, s_dwarka, 2, '07:18 AM', '01:48 PM', true),
            (v_m_r3, s_tidake_colony, 3, '07:25 AM', '01:40 PM', true),
            (v_m_r3, s_trimurti, 4, '07:32 AM', '01:33 PM', true),
            (v_m_r3, s_shubham_park, 5, '07:38 AM', '01:27 PM', true),
            (v_m_r3, s_pathardi_phata, 6, '07:44 AM', '01:21 PM', true),
            (v_m_r3, s_rane_nagar, 7, '07:49 AM', '01:16 PM', true),
            (v_m_r3, s_indira_jogging, 8, '07:54 AM', '01:11 PM', true),
            (v_m_r3, s_bombay_kamod, 9, '07:59 AM', '01:06 PM', true),
            (v_m_r3, s_dwaraka, 10, '08:05 AM', '01:00 PM', true),
            (v_m_r3, s_kkw, 11, '08:20 AM', '12:45 PM', false);
    END IF;

    -- Route 3 (General)
    IF v_g_r3 IS NOT NULL THEN
        INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible) VALUES
            (v_g_r3, s_cidco, 1, '08:35 AM', '05:55 PM', true),
            (v_g_r3, s_dwarka, 2, '08:48 AM', '05:42 PM', true),
            (v_g_r3, s_divya_adlab, 3, '08:55 AM', '05:35 PM', true),
            (v_g_r3, s_untwadi, 4, '09:02 AM', '05:28 PM', true),
            (v_g_r3, s_tidke_colony, 5, '09:08 AM', '05:22 PM', true),
            (v_g_r3, s_trimurti, 6, '09:14 AM', '05:16 PM', true),
            (v_g_r3, s_shubham_park, 7, '09:20 AM', '05:10 PM', true),
            (v_g_r3, s_pathardi_phata, 8, '09:25 AM', '05:05 PM', true),
            (v_g_r3, s_rane_nagar, 9, '09:30 AM', '05:00 PM', true),
            (v_g_r3, s_kamod_nagar, 10, '09:35 AM', '04:55 PM', true),
            (v_g_r3, s_bombay_naka, 11, '09:40 AM', '04:50 PM', true),
            (v_g_r3, s_dwaraka, 12, '09:47 AM', '04:43 PM', true),
            (v_g_r3, s_kkw, 13, '10:05 AM', '04:30 PM', false);
    END IF;

    -- Route 4 (Morning)
    IF v_m_r4 IS NOT NULL THEN
        INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible) VALUES
            (v_m_r4, s_college_road, 1, '07:10 AM', '01:55 PM', true),
            (v_m_r4, s_rajiv_bhavan, 2, '07:22 AM', '01:43 PM', true),
            (v_m_r4, s_canada_corner, 3, '07:29 AM', '01:36 PM', true),
            (v_m_r4, s_bhosla, 4, '07:37 AM', '01:28 PM', true),
            (v_m_r4, s_abb_circle, 5, '07:44 AM', '01:21 PM', true),
            (v_m_r4, s_civil_hosp, 6, '07:50 AM', '01:15 PM', true),
            (v_m_r4, s_shalimar, 7, '07:56 AM', '01:09 PM', true),
            (v_m_r4, s_kkw, 8, '08:15 AM', '12:50 PM', false);
    END IF;

    -- Route 4 (General)
    IF v_g_r4 IS NOT NULL THEN
        INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible) VALUES
            (v_g_r4, s_college_road, 1, '08:40 AM', '05:50 PM', true),
            (v_g_r4, s_rajiv_bhavan, 2, '08:52 AM', '05:38 PM', true),
            (v_g_r4, s_canada_corner, 3, '08:58 AM', '05:32 PM', true),
            (v_g_r4, s_jehan, 4, '09:05 AM', '05:25 PM', true),
            (v_g_r4, s_bhosla, 5, '09:12 AM', '05:18 PM', true),
            (v_g_r4, s_nerlikar, 6, '09:18 AM', '05:12 PM', true),
            (v_g_r4, s_gangapur_road, 7, '09:24 AM', '05:06 PM', true),
            (v_g_r4, s_ashok_stambh, 8, '09:30 AM', '05:00 PM', true),
            (v_g_r4, s_nimani, 9, '09:37 AM', '04:53 PM', true),
            (v_g_r4, s_kkw, 10, '09:55 AM', '04:40 PM', false);
    END IF;

    -- Route 5 (Morning)
    IF v_m_r5 IS NOT NULL THEN
        INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible) VALUES
            (v_m_r5, s_gangapur_road, 1, '07:05 AM', '02:00 PM', true),
            (v_m_r5, s_nimani, 2, '07:15 AM', '01:50 PM', true),
            (v_m_r5, s_makhamalabad, 3, '07:22 AM', '01:43 PM', true),
            (v_m_r5, s_chopada, 4, '07:28 AM', '01:37 PM', true),
            (v_m_r5, s_horizon, 5, '07:35 AM', '01:30 PM', true),
            (v_m_r5, s_jehan, 6, '07:41 AM', '01:24 PM', true),
            (v_m_r5, s_nerlikar, 7, '07:47 AM', '01:18 PM', true),
            (v_m_r5, s_ashok_stambh, 8, '07:53 AM', '01:12 PM', true),
            (v_m_r5, s_ramwadi, 9, '07:59 AM', '01:06 PM', true),
            (v_m_r5, s_kkw, 10, '08:20 AM', '12:45 PM', false);
    END IF;

END $$;

-- 4. CREATE ROUTE_ASSIGNMENTS TABLE FOR ADMIN DRIVER/BUS ALLOCATIONS
CREATE TABLE IF NOT EXISTS public.route_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_route_shift_assignment UNIQUE (route_id, shift_id)
);

CREATE INDEX IF NOT EXISTS idx_route_assignments_route_shift ON public.route_assignments(route_id, shift_id);

ALTER TABLE public.route_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view route assignments" ON public.route_assignments;
CREATE POLICY "Anyone authenticated can view route assignments"
ON public.route_assignments FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage route assignments" ON public.route_assignments;
CREATE POLICY "Admins can manage route assignments"
ON public.route_assignments FOR ALL TO authenticated
USING (public.is_admin());

-- 5. ADMIN ASSIGNMENT RPC WITH STUDENT NOTIFICATION AUTOMATION
CREATE OR REPLACE FUNCTION public.admin_assign_driver_bus(
    p_route_id UUID,
    p_shift_id UUID,
    p_bus_id UUID,
    p_driver_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_existing RECORD;
    v_driver_name TEXT;
    v_bus_plate TEXT;
    v_bus_number TEXT;
    v_route_name TEXT;
    v_shift_name TEXT;
    v_student RECORD;
    v_notif_count INTEGER := 0;
    v_notif_message TEXT;
BEGIN
    -- Guard: Caller must be admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only transport administrators can assign buses and drivers to routes.';
    END IF;

    -- Fetch Driver and Bus details
    SELECT full_name INTO v_driver_name FROM public.drivers WHERE id = p_driver_id;
    IF v_driver_name IS NULL THEN
        SELECT full_name INTO v_driver_name FROM public.profiles WHERE id = p_driver_id;
    END IF;

    SELECT bus_number, plate_number INTO v_bus_number, v_bus_plate FROM public.buses WHERE id = p_bus_id;
    SELECT name INTO v_route_name FROM public.routes WHERE id = p_route_id;
    SELECT name INTO v_shift_name FROM public.shifts WHERE id = p_shift_id;

    -- Check existing assignment
    SELECT bus_id, driver_id INTO v_existing FROM public.route_assignments 
    WHERE route_id = p_route_id AND shift_id = p_shift_id;

    -- If assignment has not changed, avoid duplicate notifications
    IF v_existing IS NOT NULL AND v_existing.bus_id = p_bus_id AND v_existing.driver_id = p_driver_id THEN
        RETURN jsonb_build_object(
            'success', true,
            'updated', false,
            'message', 'Assignment is unchanged; duplicate notifications skipped.'
        );
    END IF;

    -- Upsert route assignment
    INSERT INTO public.route_assignments (route_id, shift_id, bus_id, driver_id, assigned_by, updated_at)
    VALUES (p_route_id, p_shift_id, p_bus_id, p_driver_id, auth.uid(), NOW())
    ON CONFLICT (route_id, shift_id) DO UPDATE
    SET bus_id = EXCLUDED.bus_id,
        driver_id = EXCLUDED.driver_id,
        assigned_by = EXCLUDED.assigned_by,
        updated_at = NOW();

    -- Notify only approved students assigned to this route and shift
    FOR v_student IN 
        SELECT st.student_id, s.name AS pickup_name
        FROM public.student_transport st
        LEFT JOIN public.stops s ON st.pickup_stop_id = s.id
        WHERE st.route_id = p_route_id 
          AND st.shift_id = p_shift_id 
          AND st.status = 'approved'
    LOOP
        v_notif_message := 'Your transport assignment has been updated. Driver: ' || COALESCE(v_driver_name, 'Assigned Driver') || 
                           '. Bus: ' || COALESCE(v_bus_plate, v_bus_number, 'Assigned Bus') || 
                           '. Route: ' || COALESCE(v_route_name, 'Route') || 
                           '. Shift: ' || COALESCE(v_shift_name, 'Shift') || 
                           '. Pickup: ' || COALESCE(v_student.pickup_name, 'Your Stop') || '.';

        INSERT INTO public.notifications (user_id, title, message, category, route_id, is_read, created_at)
        VALUES (
            v_student.student_id,
            'Transport Assignment Updated',
            v_notif_message,
            'ROUTE_ALERT',
            p_route_id,
            false,
            NOW()
        );
        v_notif_count := v_notif_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'updated', true,
        'driver_name', v_driver_name,
        'bus_plate', v_bus_plate,
        'route_name', v_route_name,
        'notified_count', v_notif_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_assign_driver_bus TO authenticated;

-- 6. GRANT ADMIN POLICIES FOR STOPS AND ROUTES MANAGEMENT
DROP POLICY IF EXISTS "Admins can manage stops" ON public.stops;
CREATE POLICY "Admins can manage stops" ON public.stops FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage route_stops" ON public.route_stops;
CREATE POLICY "Admins can manage route_stops" ON public.route_stops FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage route_direction_stops" ON public.route_direction_stops;
CREATE POLICY "Admins can manage route_direction_stops" ON public.route_direction_stops FOR ALL TO authenticated USING (public.is_admin());


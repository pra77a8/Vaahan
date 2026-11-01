-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - OFFICIAL ROUTES & STOPS SEED DATA
-- K. K. Wagh Institute of Engineering Education & Research, Nashik
-- Idempotent Migration: Safe to re-run multiple times
-- =============================================================================

DO $$
DECLARE
    -- Shift IDs
    v_morning_shift_id UUID;
    v_general_shift_id UUID;

    -- Route IDs (Morning)
    v_m_r1 UUID;
    v_m_r2 UUID;
    v_m_r3 UUID;
    v_m_r4 UUID;
    v_m_r5 UUID;

    -- Route IDs (General)
    v_g_r1 UUID;
    v_g_r2 UUID;
    v_g_r3 UUID;
    v_g_r4 UUID;

    -- Stop ID helper
    FUNCTION_GET_OR_CREATE_STOP UUID;
BEGIN

    -- -------------------------------------------------------------------------
    -- 1. SEED SHIFTS
    -- -------------------------------------------------------------------------
    INSERT INTO public.shifts (code, name, start_time, end_time)
    VALUES 
        ('MORNING', 'Morning Shift', '07:15:00', '13:30:00'),
        ('GENERAL', 'General Shift', '08:45:00', '17:15:00')
    ON CONFLICT (code) DO UPDATE 
        SET name = EXCLUDED.name,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time;

    SELECT id INTO v_morning_shift_id FROM public.shifts WHERE code = 'MORNING';
    SELECT id INTO v_general_shift_id FROM public.shifts WHERE code = 'GENERAL';

    -- -------------------------------------------------------------------------
    -- 2. SEED REUSABLE PHYSICAL STOPS (PRESERVING EXACT SUPPLIED SPELLINGS)
    -- -------------------------------------------------------------------------
    -- Note: Spellings such as "Rmawadi", "Dwaraka Stop", "Dwarka Stop", 
    -- "Bytco Point", "Tidake Colony", "Tidke Colony" are preserved verbatim.

    INSERT INTO public.stops (name, landmark, latitude, longitude)
    VALUES
        ('K K Wagh Education Society', 'Amrutdham Campus Gate', 20.0258, 73.8268),
        ('Sailani Baba Square', 'Jail Road Junction', 19.9540, 73.8390),
        ('Bytco Point', 'Nashik Road Bytco Hospital Circle', 19.9634, 73.8291),
        ('Kathe Lane', 'Dwarka-Kathe Galli Corridor', 19.9931, 73.8098),
        ('Bodhale Nagar', 'Pune Highway Junction', 19.9790, 73.8150),
        ('Vijay Mamta Datta Mandir Square', 'Datta Mandir Road', 19.9688, 73.8242),
        ('Dwaraka Stop', 'Dwarka Circle Flyover Pillar', 19.9882, 73.8054),
        ('Dwarka Stop', 'Dwarka Circle Underpass', 19.9880, 73.8050),
        ('Bombay Naka', 'Near Old Agra Road Crossing', 19.9860, 73.7880),
        ('Kamod Nagar', 'Indira Nagar Approach', 19.9720, 73.7780),
        ('Indira Nagar Jogging Track', 'Jogging Track Corner', 19.9670, 73.7740),
        ('Rane Nagar', 'Highway Service Road Cross', 19.9590, 73.7690),
        ('Pathardi Phata', 'Mumbai-Agra Highway Junction', 19.9480, 73.7620),
        ('Shubham Park', 'CIDCO Sector 4 Corner', 19.9620, 73.7580),
        ('Divya AdLab', 'CIDCO Multiplex Square', 19.9770, 73.7610),
        ('Trimurti Square', 'Trimurti Chowk CIDCO', 19.9720, 73.7590),
        ('Untwadi', 'Untwadi Road Bridge', 19.9790, 73.7690),
        ('Tidake Colony', 'Near Tidke Colony Chowk', 19.9840, 73.7720),
        ('Tidke Colony', 'Tidke Colony Central Square', 19.9845, 73.7725),
        ('Sarada Circle', 'Sharda Kanya Vidyalaya', 19.9920, 73.7950),
        ('Shalimar Stop', 'CBS Shalimar Central Chowk', 19.9970, 73.7890),
        ('Civil Hospital', 'District Civil Hospital Gate', 20.0010, 73.7860),
        ('ABB Circle', 'Trimbak Road Signal', 19.9890, 73.7660),
        ('Bhosla School', 'Bhosla Military Campus Crossing', 19.9980, 73.7680),
        ('Canada Corner', 'Canada Corner Signal Junction', 20.0030, 73.7740),
        ('College Road', 'KTHM / BYK College Belt', 20.0050, 73.7620),
        ('Rajiv Gandhi Bhavan', 'NMC Headquarters', 20.0040, 73.7790),
        ('Nimani', 'Nimani Bus Stand Panchavati', 20.0120, 73.8010),
        ('Rmawadi', 'Ramwadi Police Chowky', 20.0070, 73.7990),
        ('Ashok Stambh', 'Central Commercial Hub', 20.0030, 73.7890),
        ('Gangapur Road', 'Gangapur Road Main Avenue', 20.0130, 73.7700),
        ('Nerlikar Hospital', 'Nerlikar Chowk', 20.0100, 73.7780),
        ('Jehan Circle', 'Gangapur Naka Circle', 20.0160, 73.7630),
        ('Horizon School', 'Gangapur Shivar', 20.0210, 73.7580),
        ('Chopada Lawns', 'Near Godavari River Bank', 20.0240, 73.7670),
        ('Makhamalabad Naka', 'Panchavati Extension Crossing', 20.0270, 73.7850)
    ON CONFLICT (name) DO UPDATE 
        SET landmark = EXCLUDED.landmark,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude;

    -- -------------------------------------------------------------------------
    -- 3. SEED MORNING SHIFT ROUTES (5 ROUTES)
    -- -------------------------------------------------------------------------

    -- Morning Route 1 - JAIL ROAD
    INSERT INTO public.routes (shift_id, route_number, name, description)
    VALUES (v_morning_shift_id, 'ROUTE 1', 'ROUTE 1 – JAIL ROAD', 'Morning Shift Jail Road & Bytco Corridor')
    ON CONFLICT (shift_id, route_number) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
    RETURNING id INTO v_m_r1;

    -- Morning Route 2 - PUNE ROAD
    INSERT INTO public.routes (shift_id, route_number, name, description)
    VALUES (v_morning_shift_id, 'ROUTE 2', 'ROUTE 2 – PUNE ROAD', 'Morning Shift Kathe Lane & Pune Road Corridor')
    ON CONFLICT (shift_id, route_number) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
    RETURNING id INTO v_m_r2;

    -- Morning Route 3 - CIDCO
    INSERT INTO public.routes (shift_id, route_number, name, description)
    VALUES (v_morning_shift_id, 'ROUTE 3', 'ROUTE 3 – CIDCO', 'Morning Shift CIDCO, Indira Nagar, Rane Nagar & Pathardi Phata')
    ON CONFLICT (shift_id, route_number) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
    RETURNING id INTO v_m_r3;

    -- Morning Route 4 - COLLEGE ROAD
    INSERT INTO public.routes (shift_id, route_number, name, description)
    VALUES (v_morning_shift_id, 'ROUTE 4', 'ROUTE 4 – COLLEGE ROAD', 'Morning Shift Shalimar, Civil Hospital, ABB Circle & College Road')
    ON CONFLICT (shift_id, route_number) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
    RETURNING id INTO v_m_r4;

    -- Morning Route 5 - GANGAPUR ROAD
    INSERT INTO public.routes (shift_id, route_number, name, description)
    VALUES (v_morning_shift_id, 'ROUTE 5', 'ROUTE 5 – GANGAPUR ROAD', 'Morning Shift Nimani, Ashok Stambh, Gangapur Road, Jehan Circle & Makhamalabad')
    ON CONFLICT (shift_id, route_number) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
    RETURNING id INTO v_m_r5;

    -- -------------------------------------------------------------------------
    -- 4. SEED GENERAL SHIFT ROUTES (4 ROUTES)
    -- -------------------------------------------------------------------------

    -- General Route 1 - JAIL ROAD
    INSERT INTO public.routes (shift_id, route_number, name, description)
    VALUES (v_general_shift_id, 'ROUTE 1', 'ROUTE 1 – JAIL ROAD', 'General Shift Jail Road & Bytco Point')
    ON CONFLICT (shift_id, route_number) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
    RETURNING id INTO v_g_r1;

    -- General Route 2 - PUNE ROAD
    INSERT INTO public.routes (shift_id, route_number, name, description)
    VALUES (v_general_shift_id, 'ROUTE 2', 'ROUTE 2 – PUNE ROAD', 'General Shift Pune Road, Bodhale Nagar & Datta Mandir')
    ON CONFLICT (shift_id, route_number) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
    RETURNING id INTO v_g_r2;

    -- General Route 3 - CIDCO
    INSERT INTO public.routes (shift_id, route_number, name, description)
    VALUES (v_general_shift_id, 'ROUTE 3', 'ROUTE 3 – CIDCO', 'General Shift CIDCO, Divya AdLab, Untwadi, Tidke Colony & Sarada Circle')
    ON CONFLICT (shift_id, route_number) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
    RETURNING id INTO v_g_r3;

    -- General Route 4 - COLLEGE ROAD / GANGAPUR ROAD
    INSERT INTO public.routes (shift_id, route_number, name, description)
    VALUES (v_general_shift_id, 'ROUTE 4', 'ROUTE 4 – COLLEGE ROAD / GANGAPUR ROAD', 'General Shift Rajiv Gandhi Bhavan, College Road, Jehan Circle & Gangapur Road')
    ON CONFLICT (shift_id, route_number) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
    RETURNING id INTO v_g_r4;

    -- -------------------------------------------------------------------------
    -- 5. SEED ROUTE_STOPS ASSOCIATIONS
    -- -------------------------------------------------------------------------
    -- Clear existing associations to ensure idempotent regeneration
    DELETE FROM public.route_stops WHERE route_id IN (
        v_m_r1, v_m_r2, v_m_r3, v_m_r4, v_m_r5,
        v_g_r1, v_g_r2, v_g_r3, v_g_r4
    );

    -- -------------------------------------------------------------------------
    -- MORNING SHIFT – ROUTE 1 – JAIL ROAD
    -- 1. K K Wagh Education Society (seq 1)
    -- 2. Sailani Baba Square (seq 2)
    -- 3. Bytco Point (seq 3)
    -- 4. K K Wagh Education Society (seq 4)
    -- -------------------------------------------------------------------------
    INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible)
    VALUES
        (v_m_r1, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 1, '07:15 AM', '01:50 PM', false),
        (v_m_r1, (SELECT id FROM public.stops WHERE name = 'Sailani Baba Square'), 2, '07:30 AM', '01:35 PM', true),
        (v_m_r1, (SELECT id FROM public.stops WHERE name = 'Bytco Point'), 3, '07:42 AM', '01:25 PM', true),
        (v_m_r1, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 4, '08:00 AM', '01:15 PM', false);

    -- -------------------------------------------------------------------------
    -- MORNING SHIFT – ROUTE 2 – PUNE ROAD
    -- 1. K K Wagh Education Society
    -- 2. Kathe Lane
    -- 3. Bodhale Nagar
    -- 4. Vijay Mamta Datta Mandir Square
    -- 5. Bytco Point
    -- 6. K K Wagh Education Society
    -- -------------------------------------------------------------------------
    INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible)
    VALUES
        (v_m_r2, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 1, '07:15 AM', '01:55 PM', false),
        (v_m_r2, (SELECT id FROM public.stops WHERE name = 'Kathe Lane'), 2, '07:28 AM', '01:42 PM', true),
        (v_m_r2, (SELECT id FROM public.stops WHERE name = 'Bodhale Nagar'), 3, '07:35 AM', '01:35 PM', true),
        (v_m_r2, (SELECT id FROM public.stops WHERE name = 'Vijay Mamta Datta Mandir Square'), 4, '07:43 AM', '01:28 PM', true),
        (v_m_r2, (SELECT id FROM public.stops WHERE name = 'Bytco Point'), 5, '07:50 AM', '01:20 PM', true),
        (v_m_r2, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 6, '08:05 AM', '01:10 PM', false);

    -- -------------------------------------------------------------------------
    -- MORNING SHIFT – ROUTE 3 – CIDCO
    -- 1. K K Wagh Education Society
    -- 2. Dwaraka Stop
    -- 3. Bombay Naka
    -- 4. Kamod Nagar
    -- 5. Indira Nagar Jogging Track
    -- 6. Rane Nagar
    -- 7. Pathardi Phata
    -- 8. Shubham Park
    -- 9. Trimurti Square
    -- 10. Tidake Colony
    -- 11. Dwarka Stop
    -- 12. K K Wagh Education Society
    -- -------------------------------------------------------------------------
    INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible)
    VALUES
        (v_m_r3, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 1, '07:05 AM', '02:00 PM', false),
        (v_m_r3, (SELECT id FROM public.stops WHERE name = 'Dwaraka Stop'), 2, '07:18 AM', '01:48 PM', true),
        (v_m_r3, (SELECT id FROM public.stops WHERE name = 'Bombay Naka'), 3, '07:25 AM', '01:40 PM', true),
        (v_m_r3, (SELECT id FROM public.stops WHERE name = 'Kamod Nagar'), 4, '07:32 AM', '01:33 PM', true),
        (v_m_r3, (SELECT id FROM public.stops WHERE name = 'Indira Nagar Jogging Track'), 5, '07:38 AM', '01:27 PM', true),
        (v_m_r3, (SELECT id FROM public.stops WHERE name = 'Rane Nagar'), 6, '07:44 AM', '01:21 PM', true),
        (v_m_r3, (SELECT id FROM public.stops WHERE name = 'Pathardi Phata'), 7, '07:49 AM', '01:16 PM', true),
        (v_m_r3, (SELECT id FROM public.stops WHERE name = 'Shubham Park'), 8, '07:54 AM', '01:11 PM', true),
        (v_m_r3, (SELECT id FROM public.stops WHERE name = 'Trimurti Square'), 9, '07:59 AM', '01:06 PM', true),
        (v_m_r3, (SELECT id FROM public.stops WHERE name = 'Tidake Colony'), 10, '08:05 AM', '01:00 PM', true),
        (v_m_r3, (SELECT id FROM public.stops WHERE name = 'Dwarka Stop'), 11, '08:12 AM', '12:53 PM', true),
        (v_m_r3, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 12, '08:20 AM', '12:45 PM', false);

    -- -------------------------------------------------------------------------
    -- MORNING SHIFT – ROUTE 4 – COLLEGE ROAD
    -- 1. K K Wagh Education Society
    -- 2. Shalimar Stop
    -- 3. Civil Hospital
    -- 4. ABB Circle
    -- 5. Bhosla School
    -- 6. Canada Corner
    -- 7. College Road
    -- 8. Rajiv Gandhi Bhavan
    -- 9. K K Wagh Education Society
    -- -------------------------------------------------------------------------
    INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible)
    VALUES
        (v_m_r4, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 1, '07:10 AM', '01:55 PM', false),
        (v_m_r4, (SELECT id FROM public.stops WHERE name = 'Shalimar Stop'), 2, '07:22 AM', '01:43 PM', true),
        (v_m_r4, (SELECT id FROM public.stops WHERE name = 'Civil Hospital'), 3, '07:29 AM', '01:36 PM', true),
        (v_m_r4, (SELECT id FROM public.stops WHERE name = 'ABB Circle'), 4, '07:37 AM', '01:28 PM', true),
        (v_m_r4, (SELECT id FROM public.stops WHERE name = 'Bhosla School'), 5, '07:44 AM', '01:21 PM', true),
        (v_m_r4, (SELECT id FROM public.stops WHERE name = 'Canada Corner'), 6, '07:50 AM', '01:15 PM', true),
        (v_m_r4, (SELECT id FROM public.stops WHERE name = 'College Road'), 7, '07:56 AM', '01:09 PM', true),
        (v_m_r4, (SELECT id FROM public.stops WHERE name = 'Rajiv Gandhi Bhavan'), 8, '08:02 AM', '01:03 PM', true),
        (v_m_r4, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 9, '08:15 AM', '12:50 PM', false);

    -- -------------------------------------------------------------------------
    -- MORNING SHIFT – ROUTE 5 – GANGAPUR ROAD
    -- 1. K K Wagh Education Society
    -- 2. Nimani
    -- 3. Rmawadi
    -- 4. Ashok Stambh
    -- 5. Gangapur Road
    -- 6. Nerlikar Hospital
    -- 7. Jehan Circle
    -- 8. Horizon School
    -- 9. Chopada Lawns
    -- 10. Makhamalabad Naka
    -- 11. Nimani
    -- 12. K K Wagh Education Society
    -- -------------------------------------------------------------------------
    INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible)
    VALUES
        (v_m_r5, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 1, '07:05 AM', '02:00 PM', false),
        (v_m_r5, (SELECT id FROM public.stops WHERE name = 'Nimani'), 2, '07:15 AM', '01:50 PM', true),
        (v_m_r5, (SELECT id FROM public.stops WHERE name = 'Rmawadi'), 3, '07:22 AM', '01:43 PM', true),
        (v_m_r5, (SELECT id FROM public.stops WHERE name = 'Ashok Stambh'), 4, '07:28 AM', '01:37 PM', true),
        (v_m_r5, (SELECT id FROM public.stops WHERE name = 'Gangapur Road'), 5, '07:35 AM', '01:30 PM', true),
        (v_m_r5, (SELECT id FROM public.stops WHERE name = 'Nerlikar Hospital'), 6, '07:41 AM', '01:24 PM', true),
        (v_m_r5, (SELECT id FROM public.stops WHERE name = 'Jehan Circle'), 7, '07:47 AM', '01:18 PM', true),
        (v_m_r5, (SELECT id FROM public.stops WHERE name = 'Horizon School'), 8, '07:53 AM', '01:12 PM', true),
        (v_m_r5, (SELECT id FROM public.stops WHERE name = 'Chopada Lawns'), 9, '07:59 AM', '01:06 PM', true),
        (v_m_r5, (SELECT id FROM public.stops WHERE name = 'Makhamalabad Naka'), 10, '08:05 AM', '01:00 PM', true),
        (v_m_r5, (SELECT id FROM public.stops WHERE name = 'Nimani'), 11, '08:12 AM', '12:53 PM', true),
        (v_m_r5, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 12, '08:20 AM', '12:45 PM', false);

    -- -------------------------------------------------------------------------
    -- GENERAL SHIFT – ROUTE 1 – JAIL ROAD
    -- 1. K K Wagh Education Society
    -- 2. Sailani Baba Square
    -- 3. Bytco Point
    -- 4. K K Wagh Education Society
    -- -------------------------------------------------------------------------
    INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible)
    VALUES
        (v_g_r1, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 1, '08:45 AM', '05:35 PM', false),
        (v_g_r1, (SELECT id FROM public.stops WHERE name = 'Sailani Baba Square'), 2, '09:00 AM', '05:20 PM', true),
        (v_g_r1, (SELECT id FROM public.stops WHERE name = 'Bytco Point'), 3, '09:12 AM', '05:10 PM', true),
        (v_g_r1, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 4, '09:30 AM', '05:00 PM', false);

    -- -------------------------------------------------------------------------
    -- GENERAL SHIFT – ROUTE 2 – PUNE ROAD
    -- 1. K K Wagh Education Society
    -- 2. Kathe Lane
    -- 3. Bodhale Nagar
    -- 4. Vijay Mamta Datta Mandir Square
    -- 5. Bytco Point
    -- 6. K K Wagh Education Society
    -- -------------------------------------------------------------------------
    INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible)
    VALUES
        (v_g_r2, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 1, '08:45 AM', '05:40 PM', false),
        (v_g_r2, (SELECT id FROM public.stops WHERE name = 'Kathe Lane'), 2, '08:58 AM', '05:27 PM', true),
        (v_g_r2, (SELECT id FROM public.stops WHERE name = 'Bodhale Nagar'), 3, '09:05 AM', '05:20 PM', true),
        (v_g_r2, (SELECT id FROM public.stops WHERE name = 'Vijay Mamta Datta Mandir Square'), 4, '09:14 AM', '05:11 PM', true),
        (v_g_r2, (SELECT id FROM public.stops WHERE name = 'Bytco Point'), 5, '09:22 AM', '05:03 PM', true),
        (v_g_r2, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 6, '09:35 AM', '04:55 PM', false);

    -- -------------------------------------------------------------------------
    -- GENERAL SHIFT – ROUTE 3 – CIDCO
    -- 1. K K Wagh Education Society
    -- 2. Dwaraka Stop
    -- 3. Bombay Naka
    -- 4. Kamod Nagar
    -- 5. Rane Nagar
    -- 6. Pathardi Phata
    -- 7. Shubham Park
    -- 8. Divya AdLab
    -- 9. Trimurti Square
    -- 10. Untwadi
    -- 11. Tidke Colony
    -- 12. Sarada Circle
    -- 13. Dwarka Stop
    -- 14. K K Wagh Education Society
    -- -------------------------------------------------------------------------
    INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible)
    VALUES
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 1, '08:35 AM', '05:55 PM', false),
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'Dwaraka Stop'), 2, '08:48 AM', '05:42 PM', true),
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'Bombay Naka'), 3, '08:55 AM', '05:35 PM', true),
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'Kamod Nagar'), 4, '09:02 AM', '05:28 PM', true),
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'Rane Nagar'), 5, '09:08 AM', '05:22 PM', true),
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'Pathardi Phata'), 6, '09:14 AM', '05:16 PM', true),
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'Shubham Park'), 7, '09:20 AM', '05:10 PM', true),
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'Divya AdLab'), 8, '09:25 AM', '05:05 PM', true),
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'Trimurti Square'), 9, '09:30 AM', '05:00 PM', true),
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'Untwadi'), 10, '09:35 AM', '04:55 PM', true),
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'Tidke Colony'), 11, '09:40 AM', '04:50 PM', true),
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'Sarada Circle'), 12, '09:47 AM', '04:43 PM', true),
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'Dwarka Stop'), 13, '09:53 AM', '04:37 PM', true),
        (v_g_r3, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 14, '10:05 AM', '04:30 PM', false);

    -- -------------------------------------------------------------------------
    -- GENERAL SHIFT – ROUTE 4 – COLLEGE ROAD / GANGAPUR ROAD
    -- 1. K K Wagh Education Society
    -- 2. Rajiv Gandhi Bhavan
    -- 3. Canada Corner
    -- 4. College Road
    -- 5. Jehan Circle
    -- 6. Bhosla School
    -- 7. Nerlikar Hospital
    -- 8. Gangapur Road
    -- 9. Ashok Stambh
    -- 10. Nimani
    -- 11. K K Wagh Education Society
    -- -------------------------------------------------------------------------
    INSERT INTO public.route_stops (route_id, stop_id, sequence_number, morning_pickup_time, drop_time, is_pickup_eligible)
    VALUES
        (v_g_r4, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 1, '08:40 AM', '05:50 PM', false),
        (v_g_r4, (SELECT id FROM public.stops WHERE name = 'Rajiv Gandhi Bhavan'), 2, '08:52 AM', '05:38 PM', true),
        (v_g_r4, (SELECT id FROM public.stops WHERE name = 'Canada Corner'), 3, '08:58 AM', '05:32 PM', true),
        (v_g_r4, (SELECT id FROM public.stops WHERE name = 'College Road'), 4, '09:05 AM', '05:25 PM', true),
        (v_g_r4, (SELECT id FROM public.stops WHERE name = 'Jehan Circle'), 5, '09:12 AM', '05:18 PM', true),
        (v_g_r4, (SELECT id FROM public.stops WHERE name = 'Bhosla School'), 6, '09:18 AM', '05:12 PM', true),
        (v_g_r4, (SELECT id FROM public.stops WHERE name = 'Nerlikar Hospital'), 7, '09:24 AM', '05:06 PM', true),
        (v_g_r4, (SELECT id FROM public.stops WHERE name = 'Gangapur Road'), 8, '09:30 AM', '05:00 PM', true),
        (v_g_r4, (SELECT id FROM public.stops WHERE name = 'Ashok Stambh'), 9, '09:37 AM', '04:53 PM', true),
        (v_g_r4, (SELECT id FROM public.stops WHERE name = 'Nimani'), 10, '09:44 AM', '04:46 PM', true),
        (v_g_r4, (SELECT id FROM public.stops WHERE name = 'K K Wagh Education Society'), 11, '09:55 AM', '04:40 PM', false);

    -- -------------------------------------------------------------------------
    -- 6. SEED INITIAL COLLEGE BUSES
    -- -------------------------------------------------------------------------
    INSERT INTO public.buses (bus_number, plate_number, model, capacity, status, is_ac)
    VALUES
        ('Bus 01', 'MH-15-EG-4001', 'Tata Starbus Ultra 48S', 48, 'IDLE', false),
        ('Bus 02', 'MH-15-FG-2890', 'Ashok Leyland Sunshine 44S', 44, 'IDLE', false),
        ('Bus 03', 'MH-15-HH-6104', 'Tata Marcopolo 52S', 52, 'IDLE', true),
        ('Bus 04', 'MH-15-JK-1188', 'Eicher Skyline Pro 40S', 40, 'IDLE', false),
        ('Bus 05', 'MH-15-KL-9345', 'Tata Starbus 48S', 48, 'IDLE', false),
        ('Bus 06', 'MH-15-MN-5502', 'Force Traveller Executive 32S', 32, 'IDLE', true)
    ON CONFLICT (bus_number) DO UPDATE
        SET plate_number = EXCLUDED.plate_number,
            model = EXCLUDED.model,
            capacity = EXCLUDED.capacity;

END $$;

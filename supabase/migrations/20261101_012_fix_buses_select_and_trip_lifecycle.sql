-- =============================================================================
-- Migration 012: Fix Buses Select, Trip Atomic Lifecycle & Strict UUID Guarantees
-- =============================================================================

-- 1. Ensure all users (including unauthenticated visitors on routes/tracking view) can view buses
DROP POLICY IF EXISTS "Anyone authenticated can view buses" ON public.buses;
DROP POLICY IF EXISTS "Anyone can view buses" ON public.buses;

CREATE POLICY "Anyone can view buses" ON public.buses
FOR SELECT
USING (true);

-- 2. Atomic Trip Creation Function (ensures no partial trips or orphaned state)
CREATE OR REPLACE FUNCTION public.start_driver_trip(
    p_trip_id UUID,
    p_route_id UUID,
    p_driver_id UUID,
    p_bus_id UUID,
    p_shift_id UUID,
    p_direction TEXT,
    p_trip_date DATE,
    p_mode TEXT,
    p_remarks TEXT,
    p_source_stop_id UUID,
    p_destination_stop_id UUID,
    p_assigned_student_count INTEGER,
    p_trip_stops JSONB,
    p_initial_lat DOUBLE PRECISION DEFAULT NULL,
    p_initial_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bus_status TEXT;
    v_active_bus_trip UUID;
    v_active_driver_trip UUID;
    v_stop JSONB;
BEGIN
    -- Guard: Caller must be the driver or an admin
    IF auth.uid() <> p_driver_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Caller cannot start a trip for another driver.';
    END IF;

    -- Validate Bus Status
    SELECT status INTO v_bus_status FROM public.buses WHERE id = p_bus_id;
    IF v_bus_status IS NULL THEN
        RAISE EXCEPTION 'Invalid Bus ID: Vehicle not found in fleet.';
    END IF;
    IF v_bus_status = 'MAINTENANCE' THEN
        RAISE EXCEPTION 'Bus is under maintenance and cannot operate trips.';
    END IF;

    -- Check for existing active trip on this bus
    SELECT id INTO v_active_bus_trip FROM public.trips 
    WHERE bus_id = p_bus_id AND status = 'IN_PROGRESS' 
    LIMIT 1;
    IF v_active_bus_trip IS NOT NULL THEN
        RAISE EXCEPTION 'Bus already has an active trip in progress (Trip ID: %).', v_active_bus_trip;
    END IF;

    -- Check for existing active trip for this driver
    SELECT id INTO v_active_driver_trip FROM public.trips 
    WHERE driver_id = p_driver_id AND status = 'IN_PROGRESS' 
    LIMIT 1;
    IF v_active_driver_trip IS NOT NULL THEN
        RAISE EXCEPTION 'Driver already has an active trip in progress (Trip ID: %). Please complete it first.', v_active_driver_trip;
    END IF;

    -- Insert Trip
    INSERT INTO public.trips (
        id,
        route_id,
        driver_id,
        bus_id,
        shift_id,
        direction,
        trip_date,
        mode,
        remarks,
        source_stop_id,
        destination_stop_id,
        assigned_student_count,
        status,
        started_at,
        current_stop_index
    ) VALUES (
        p_trip_id,
        p_route_id,
        p_driver_id,
        p_bus_id,
        p_shift_id,
        p_direction,
        p_trip_date,
        p_mode,
        p_remarks,
        p_source_stop_id,
        p_destination_stop_id,
        p_assigned_student_count,
        'IN_PROGRESS',
        NOW(),
        0
    );

    -- Insert Trip Stops from JSONB array
    IF p_trip_stops IS NOT NULL AND jsonb_array_length(p_trip_stops) > 0 THEN
        FOR v_stop IN SELECT * FROM jsonb_array_elements(p_trip_stops)
        LOOP
            INSERT INTO public.trip_stops (
                trip_id,
                stop_id,
                sequence_number,
                status,
                reached_at
            ) VALUES (
                p_trip_id,
                (v_stop->>'stop_id')::UUID,
                (v_stop->>'sequence_number')::INTEGER,
                COALESCE(v_stop->>'status', 'PENDING'),
                CASE WHEN v_stop->>'reached_at' IS NOT NULL THEN (v_stop->>'reached_at')::TIMESTAMPTZ ELSE NULL END
            );
        END LOOP;
    END IF;

    -- Insert Initial Live Location if coordinates provided
    IF p_initial_lat IS NOT NULL AND p_initial_lng IS NOT NULL THEN
        INSERT INTO public.live_locations (
            trip_id,
            latitude,
            longitude,
            speed_kmh,
            heading,
            recorded_at
        ) VALUES (
            p_trip_id,
            p_initial_lat,
            p_initial_lng,
            0,
            0,
            NOW()
        );
    END IF;

    -- Update Bus Status to ON_ROUTE
    UPDATE public.buses 
    SET status = 'ON_ROUTE' 
    WHERE id = p_bus_id;

    RETURN jsonb_build_object(
        'success', true,
        'trip_id', p_trip_id
    );
END;
$$;

-- 3. Atomic Trip Completion Function
CREATE OR REPLACE FUNCTION public.end_driver_trip(p_trip_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bus_id UUID;
    v_driver_id UUID;
BEGIN
    SELECT bus_id, driver_id INTO v_bus_id, v_driver_id 
    FROM public.trips 
    WHERE id = p_trip_id;

    IF v_bus_id IS NULL THEN
        RAISE EXCEPTION 'Trip not found: %', p_trip_id;
    END IF;

    IF auth.uid() <> v_driver_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Caller cannot end this trip.';
    END IF;

    -- Mark trip completed
    UPDATE public.trips
    SET status = 'COMPLETED',
        ended_at = NOW()
    WHERE id = p_trip_id;

    -- Set bus status back to IDLE
    UPDATE public.buses
    SET status = 'IDLE'
    WHERE id = v_bus_id;

    RETURN jsonb_build_object(
        'success', true,
        'trip_id', p_trip_id
    );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.start_driver_trip TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_driver_trip TO authenticated;

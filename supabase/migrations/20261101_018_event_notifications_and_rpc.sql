-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - MIGRATION 018
-- Event-Based Notifications Architecture, Driver Readiness, and RLS Permissions
-- Supports Events A (Driver Ready), B (Trip Started), C (Approaching Stop),
-- D (Stop Reached), and E (Trip Completed) with Real-Time Persistence
-- =============================================================================

-- 0. UPDATE NOTIFICATIONS CATEGORY CHECK CONSTRAINT TO SUPPORT TRANSIT EVENTS
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_category_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_category_check
CHECK (category IN (
    'DELAY',
    'ROUTE_ALERT',
    'FEE_REMINDER',
    'ANNOUNCEMENT',
    'EMERGENCY',
    'DRIVER_READY',
    'TRIP_STARTED',
    'APPROACHING_STOP',
    'STOP_REACHED',
    'TRIP_COMPLETED'
));

-- 1. ALLOW AUTHENTICATED USERS (DRIVERS, PASSENGERS, ADMINS) TO INSERT NOTIFICATIONS
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

-- 2. ENSURE USERS CAN VIEW OWN NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 3. ENSURE USERS CAN UPDATE (MARK READ) OWN NOTIFICATIONS
DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
CREATE POLICY "Users can mark own notifications read"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- 4. ENSURE USERS CAN DELETE OWN NOTIFICATIONS
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 5. RPC: DISPATCH TRANSIT EVENT NOTIFICATIONS
-- Atomically broadcasts Event A, B, C, D, or E to assigned students
CREATE OR REPLACE FUNCTION public.dispatch_transit_event_notification(
    p_trip_id UUID DEFAULT NULL,
    p_event_type TEXT DEFAULT 'GENERAL',
    p_route_id UUID DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL,
    p_bus_id UUID DEFAULT NULL,
    p_driver_id UUID DEFAULT NULL,
    p_stop_id UUID DEFAULT NULL,
    p_custom_title TEXT DEFAULT NULL,
    p_custom_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trip RECORD;
    v_route RECORD;
    v_bus RECORD;
    v_stop RECORD;
    v_student RECORD;
    v_route_id UUID := p_route_id;
    v_shift_id UUID := p_shift_id;
    v_bus_id UUID := p_bus_id;
    v_driver_id UUID := p_driver_id;
    v_stop_id UUID := p_stop_id;
    v_title TEXT := p_custom_title;
    v_message TEXT := p_custom_message;
    v_bus_name TEXT := 'Bus';
    v_plate_name TEXT := '';
    v_route_name TEXT := 'Campus Route';
    v_driver_name TEXT := 'Driver';
    v_stop_name TEXT := 'Scheduled Stop';
    v_category TEXT := p_event_type;
    v_inserted_count INT := 0;
BEGIN
    -- If trip_id is provided, resolve missing identifiers from the trip record
    IF p_trip_id IS NOT NULL THEN
        SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
        IF v_trip.id IS NOT NULL THEN
            v_route_id := COALESCE(v_route_id, v_trip.route_id);
            v_shift_id := COALESCE(v_shift_id, v_trip.shift_id);
            v_bus_id := COALESCE(v_bus_id, v_trip.bus_id);
            v_driver_id := COALESCE(v_driver_id, v_trip.driver_id);
        END IF;
    END IF;

    -- Resolve vehicle info
    IF v_bus_id IS NOT NULL THEN
        SELECT * INTO v_bus FROM public.buses WHERE id = v_bus_id;
        IF v_bus.id IS NOT NULL THEN
            v_bus_name := v_bus.bus_number;
            v_plate_name := COALESCE(v_bus.plate_number, '');
        END IF;
    END IF;

    -- Resolve route info
    IF v_route_id IS NOT NULL THEN
        SELECT * INTO v_route FROM public.routes WHERE id = v_route_id;
        IF v_route.id IS NOT NULL THEN
            v_route_name := v_route.name;
        END IF;
    END IF;

    -- Resolve driver name
    IF v_driver_id IS NOT NULL THEN
        SELECT p.full_name INTO v_driver_name
        FROM public.profiles p
        WHERE p.id = v_driver_id;
        
        IF v_driver_name IS NULL THEN
            SELECT p.full_name INTO v_driver_name
            FROM public.drivers d
            JOIN public.profiles p ON p.id = d.user_id
            WHERE d.id = v_driver_id;
        END IF;
    END IF;

    -- Resolve stop name
    IF v_stop_id IS NOT NULL THEN
        SELECT * INTO v_stop FROM public.stops WHERE id = v_stop_id;
        IF v_stop.id IS NOT NULL THEN
            v_stop_name := v_stop.name;
        END IF;
    END IF;

    -- Normalize category
    IF v_category NOT IN ('DRIVER_READY', 'TRIP_STARTED', 'APPROACHING_STOP', 'STOP_REACHED', 'TRIP_COMPLETED', 'DELAY', 'ROUTE_ALERT', 'FEE_REMINDER', 'ANNOUNCEMENT', 'EMERGENCY') THEN
        v_category := 'ROUTE_ALERT';
    END IF;

    -- Auto-generate notification title and message based on event type
    IF p_event_type = 'DRIVER_READY' THEN
        v_title := COALESCE(v_title, 'Driver Ready: ' || v_route_name);
        v_message := COALESCE(v_message, 'Your bus driver ' || COALESCE(v_driver_name, 'Assigned Driver') || ' is ready with ' || v_bus_name || ' (' || v_plate_name || ') on ' || v_route_name || '. Trip will start shortly.');
    ELSIF p_event_type = 'TRIP_STARTED' THEN
        v_title := COALESCE(v_title, 'Trip Started: ' || v_bus_name || ' on ' || v_route_name);
        v_message := COALESCE(v_message, 'Your bus ' || v_bus_name || ' (' || v_plate_name || ') has departed on ' || v_route_name || '. Real-time GPS tracking is active.');
    ELSIF p_event_type = 'APPROACHING_STOP' THEN
        v_title := COALESCE(v_title, 'Bus Approaching: ' || v_stop_name);
        v_message := COALESCE(v_message, 'Your bus ' || v_bus_name || ' is approaching ' || v_stop_name || '. Please be ready at your pickup point.');
    ELSIF p_event_type = 'STOP_REACHED' THEN
        v_title := COALESCE(v_title, 'Stop Reached: ' || v_stop_name);
        v_message := COALESCE(v_message, 'Your bus ' || v_bus_name || ' has arrived at ' || v_stop_name || '. Boarding is in progress.');
    ELSIF p_event_type = 'TRIP_COMPLETED' THEN
        v_title := COALESCE(v_title, 'Journey Completed: ' || v_route_name);
        v_message := COALESCE(v_message, 'Your bus ' || v_bus_name || ' has completed its scheduled journey at ' || v_stop_name || '.');
    ELSE
        v_title := COALESCE(v_title, 'Transit Notice: ' || v_route_name);
        v_message := COALESCE(v_message, 'Transit service update for ' || v_route_name || '.');
    END IF;

    -- Query approved students assigned to this route and shift
    -- If stop-specific (APPROACHING_STOP or STOP_REACHED), only notify students at that stop
    -- Otherwise (DRIVER_READY, TRIP_STARTED, TRIP_COMPLETED), notify ALL students on the route
    FOR v_student IN
        SELECT DISTINCT st.student_id
        FROM public.student_transport st
        WHERE st.route_id = v_route_id
          AND st.shift_id = v_shift_id
          AND st.status = 'approved'
          AND (
              p_event_type IN ('DRIVER_READY', 'TRIP_STARTED', 'TRIP_COMPLETED', 'GENERAL')
              OR v_stop_id IS NULL
              OR st.pickup_stop_id = v_stop_id
          )
    LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            category,
            route_id,
            is_read,
            created_at
        ) VALUES (
            v_student.student_id,
            v_title,
            v_message,
            v_category,
            v_route_id,
            false,
            NOW()
        );
        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'event_type', p_event_type,
        'inserted_count', v_inserted_count,
        'title', v_title,
        'message', v_message
    );
END;
$$;

-- 6. RPC: ATOMIC CLEAR ALL NOTIFICATIONS FOR AUTHENTICATED USER
CREATE OR REPLACE FUNCTION public.clear_user_notifications()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.notifications WHERE user_id = auth.uid();
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. RPC: ATOMIC MARK ALL READ FOR AUTHENTICATED USER
CREATE OR REPLACE FUNCTION public.mark_all_user_notifications_read()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications SET is_read = true WHERE user_id = auth.uid();
    RETURN jsonb_build_object('success', true);
END;
$$;

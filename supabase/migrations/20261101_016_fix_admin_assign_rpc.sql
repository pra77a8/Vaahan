-- Fix admin_assign_driver_bus RPC to query driver name from profiles table
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

    -- Fetch Driver name from profiles
    SELECT full_name INTO v_driver_name FROM public.profiles WHERE id = p_driver_id;
    IF v_driver_name IS NULL THEN
        v_driver_name := 'Assigned Driver';
    END IF;

    -- Fetch Bus details
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


-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - MIGRATION 024
-- Driver SOS Emergency Alert System with Real-Time Notification & Persistence
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sos_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    driver_name TEXT NOT NULL,
    driver_phone TEXT,
    bus_number TEXT,
    bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    route_name TEXT,
    direction TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_description TEXT,
    emergency_type TEXT NOT NULL DEFAULT 'GENERAL_EMERGENCY',
    remarks TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    acknowledged_by_name TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_by_name TEXT,
    resolution_notes TEXT
);

-- Optimization indexes for high-frequency polling and real-time filters
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON public.sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_driver_id ON public.sos_alerts(driver_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at ON public.sos_alerts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent conflicts on rerun
DROP POLICY IF EXISTS "Drivers can view their own SOS alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Admins can view all SOS alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Drivers and Admins can insert SOS alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Admins can update SOS alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Drivers can update their active SOS alerts" ON public.sos_alerts;

-- Policy 1: Drivers can view their own alerts, Admins can view all alerts
CREATE POLICY "Drivers can view their own SOS alerts"
    ON public.sos_alerts FOR SELECT
    TO authenticated
    USING (
        driver_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Policy 2: Drivers and Admins can insert SOS alerts
CREATE POLICY "Drivers and Admins can insert SOS alerts"
    ON public.sos_alerts FOR INSERT
    TO authenticated
    WITH CHECK (
        driver_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Policy 3: Admins can update any SOS alerts (acknowledge or resolve)
CREATE POLICY "Admins can update SOS alerts"
    ON public.sos_alerts FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Function 1: RPC to create driver SOS alert with validation
CREATE OR REPLACE FUNCTION public.create_driver_sos_alert(
    p_driver_id UUID,
    p_driver_name TEXT,
    p_driver_phone TEXT DEFAULT NULL,
    p_bus_number TEXT DEFAULT NULL,
    p_bus_id UUID DEFAULT NULL,
    p_trip_id UUID DEFAULT NULL,
    p_route_name TEXT DEFAULT NULL,
    p_direction TEXT DEFAULT NULL,
    p_latitude DOUBLE PRECISION DEFAULT NULL,
    p_longitude DOUBLE PRECISION DEFAULT NULL,
    p_location_description TEXT DEFAULT NULL,
    p_emergency_type TEXT DEFAULT 'GENERAL_EMERGENCY',
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_alert_id UUID;
    v_alert_row public.sos_alerts;
BEGIN
    INSERT INTO public.sos_alerts (
        driver_id,
        driver_name,
        driver_phone,
        bus_number,
        bus_id,
        trip_id,
        route_name,
        direction,
        latitude,
        longitude,
        location_description,
        emergency_type,
        remarks,
        status,
        created_at
    ) VALUES (
        p_driver_id,
        p_driver_name,
        p_driver_phone,
        p_bus_number,
        p_bus_id,
        p_trip_id,
        p_route_name,
        p_direction,
        p_latitude,
        p_longitude,
        p_location_description,
        COALESCE(p_emergency_type, 'GENERAL_EMERGENCY'),
        p_remarks,
        'ACTIVE',
        timezone('utc'::text, now())
    )
    RETURNING * INTO v_alert_row;

    RETURN to_jsonb(v_alert_row);
END;
$$;

-- Function 2: RPC to acknowledge an SOS alert
CREATE OR REPLACE FUNCTION public.acknowledge_sos_alert(
    p_alert_id UUID,
    p_admin_id UUID,
    p_admin_name TEXT DEFAULT 'Transport Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_alert_row public.sos_alerts;
BEGIN
    UPDATE public.sos_alerts
    SET
        status = 'ACKNOWLEDGED',
        acknowledged_at = timezone('utc'::text, now()),
        acknowledged_by = p_admin_id,
        acknowledged_by_name = p_admin_name
    WHERE id = p_alert_id
    RETURNING * INTO v_alert_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SOS alert with ID % not found', p_alert_id;
    END IF;

    RETURN to_jsonb(v_alert_row);
END;
$$;

-- Function 3: RPC to resolve an SOS alert
CREATE OR REPLACE FUNCTION public.resolve_sos_alert(
    p_alert_id UUID,
    p_admin_id UUID,
    p_admin_name TEXT DEFAULT 'Transport Admin',
    p_resolution_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_alert_row public.sos_alerts;
BEGIN
    UPDATE public.sos_alerts
    SET
        status = 'RESOLVED',
        resolved_at = timezone('utc'::text, now()),
        resolved_by = p_admin_id,
        resolved_by_name = p_admin_name,
        resolution_notes = p_resolution_notes
    WHERE id = p_alert_id
    RETURNING * INTO v_alert_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SOS alert with ID % not found', p_alert_id;
    END IF;

    RETURN to_jsonb(v_alert_row);
END;
$$;

-- Function 4: Fetch active SOS alerts for admin
CREATE OR REPLACE FUNCTION public.get_active_sos_alerts()
RETURNS SETOF public.sos_alerts
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT * FROM public.sos_alerts
    WHERE status IN ('ACTIVE', 'ACKNOWLEDGED')
    ORDER BY created_at DESC;
$$;

-- Enable Realtime for sos_alerts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sos_alerts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
    END IF;
END $$;

-- Table Grants
GRANT ALL ON public.sos_alerts TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_driver_sos_alert TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.acknowledge_sos_alert TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_sos_alert TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_sos_alerts TO authenticated, service_role;


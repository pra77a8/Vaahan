-- =============================================================================
-- Migration 011: Allow Drivers & Admins to Update Bus Status & Enhance RLS
-- =============================================================================

-- 1. Buses RLS: allow authenticated drivers or admins to update bus status
DROP POLICY IF EXISTS "Admins can update buses" ON public.buses;
DROP POLICY IF EXISTS "buses_update_driver_or_admin" ON public.buses;

CREATE POLICY "buses_update_driver_or_admin" ON public.buses
FOR UPDATE
TO authenticated
USING (
  public.is_driver_or_admin()
)
WITH CHECK (
  public.is_driver_or_admin()
);

-- 2. Ensure anyone authenticated can read buses
DROP POLICY IF EXISTS "Anyone authenticated can view buses" ON public.buses;
CREATE POLICY "Anyone authenticated can view buses" ON public.buses
FOR SELECT
TO authenticated
USING (true);

-- 3. Ensure trips can be updated by driver who owns the trip or admin
DROP POLICY IF EXISTS "trips_driver_update" ON public.trips;
CREATE POLICY "trips_driver_update" ON public.trips
FOR UPDATE
TO authenticated
USING (
  public.can_manage_trip(id)
)
WITH CHECK (
  public.can_manage_trip(id)
);

-- 4. Ensure trip_stops can be updated by driver or admin
DROP POLICY IF EXISTS "trip_stops_driver_update" ON public.trip_stops;
CREATE POLICY "trip_stops_driver_update" ON public.trip_stops
FOR UPDATE
TO authenticated
USING (
  public.can_manage_trip(trip_id)
)
WITH CHECK (
  public.can_manage_trip(trip_id)
);

-- 5. Ensure indexes for high performance queries
CREATE INDEX IF NOT EXISTS idx_trips_driver_status ON public.trips(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_bus_status ON public.trips(bus_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_route_date ON public.trips(route_id, trip_date);

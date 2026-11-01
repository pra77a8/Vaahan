-- Relax foreign key constraints on sos_alerts to ensure emergency alerts can always be recorded under all network and authentication states
ALTER TABLE public.sos_alerts DROP CONSTRAINT IF EXISTS sos_alerts_driver_id_fkey;
ALTER TABLE public.sos_alerts DROP CONSTRAINT IF EXISTS sos_alerts_acknowledged_by_fkey;
ALTER TABLE public.sos_alerts DROP CONSTRAINT IF EXISTS sos_alerts_resolved_by_fkey;
ALTER TABLE public.sos_alerts ALTER COLUMN driver_id DROP NOT NULL;

-- Allow anon and authenticated to execute SOS RPCs and select/insert
GRANT ALL ON public.sos_alerts TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_driver_sos_alert TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.acknowledge_sos_alert TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_sos_alert TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_sos_alerts TO anon, authenticated, service_role;

-- Allow anon to select and insert for emergency beacon transmission in case of session refresh
DROP POLICY IF EXISTS "Allow anon emergency beacon insert" ON public.sos_alerts;
CREATE POLICY "Allow anon emergency beacon insert"
    ON public.sos_alerts FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon emergency beacon select" ON public.sos_alerts;
CREATE POLICY "Allow anon emergency beacon select"
    ON public.sos_alerts FOR SELECT
    TO anon
    USING (true);


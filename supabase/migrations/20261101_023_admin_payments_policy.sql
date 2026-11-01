-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - MIGRATION 023
-- Allow Administrators to view all records in public.payments and public.bus_passes
-- =============================================================================

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments" ON public.payments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can view all bus passes" ON public.bus_passes;
CREATE POLICY "Admins can view all bus passes" ON public.bus_passes
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

GRANT SELECT ON public.payments TO authenticated, service_role;
GRANT SELECT ON public.bus_passes TO authenticated, service_role;


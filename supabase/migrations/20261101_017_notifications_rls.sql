-- Enable Admin management and user deletion on notifications table
DROP POLICY IF EXISTS "Admins can view and manage all notifications" ON public.notifications;
CREATE POLICY "Admins can view and manage all notifications"
ON public.notifications FOR ALL TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (auth.uid() = user_id);


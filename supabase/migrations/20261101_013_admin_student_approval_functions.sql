-- =============================================================================
-- Migration 013: Admin Student Approval & Auto-Email-Confirmation Functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_approve_student(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_status TEXT;
  v_user_email TEXT;
BEGIN
  -- 1. Verify caller is an active approved admin
  SELECT role, status INTO v_caller_role, v_caller_status
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' OR v_caller_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Unauthorized: Only active transport administrators can approve student registrations.';
  END IF;

  -- 2. Update profiles status
  UPDATE public.profiles
  SET 
    status = 'approved',
    updated_at = NOW()
  WHERE id = p_student_id;

  -- 3. Update students approval_status
  UPDATE public.students
  SET 
    approval_status = 'approved',
    updated_at = NOW()
  WHERE id = p_student_id;

  -- 4. Update student_transport status
  UPDATE public.student_transport
  SET 
    status = 'approved',
    updated_at = NOW()
  WHERE student_id = p_student_id;

  -- 5. Auto-confirm student email in auth.users so student can immediately log in
  UPDATE auth.users
  SET 
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
  WHERE id = p_student_id
  RETURNING email INTO v_user_email;

  RETURN jsonb_build_object(
    'success', true,
    'student_id', p_student_id,
    'email', v_user_email,
    'status', 'approved'
  );
END;
$$;

-- Grant execution to authenticated users (internal check verifies admin)
GRANT EXECUTE ON FUNCTION public.admin_approve_student(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_student(p_student_id UUID, p_reason TEXT DEFAULT 'Application rejected by administrator')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_status TEXT;
BEGIN
  -- 1. Verify caller is an active approved admin
  SELECT role, status INTO v_caller_role, v_caller_status
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' OR v_caller_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Unauthorized: Only active transport administrators can reject student registrations.';
  END IF;

  -- 2. Update profiles status
  UPDATE public.profiles
  SET 
    status = 'rejected',
    updated_at = NOW()
  WHERE id = p_student_id;

  -- 3. Update students approval_status
  UPDATE public.students
  SET 
    approval_status = 'rejected',
    updated_at = NOW()
  WHERE id = p_student_id;

  -- 4. Update student_transport status
  UPDATE public.student_transport
  SET 
    status = 'rejected',
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE student_id = p_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'student_id', p_student_id,
    'status', 'rejected',
    'reason', p_reason
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_reject_student(UUID, TEXT) TO authenticated;

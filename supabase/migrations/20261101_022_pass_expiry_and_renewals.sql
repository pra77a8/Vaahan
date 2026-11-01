-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - MIGRATION 022
-- Student Pass Expiry Management & Razorpay Renewal Integration
-- 1. Adds pass_expiry_date and pass_issue_date to public.student_transport
-- 2. Creates public.pass_renewals table with full audit trail and RLS
-- 3. Updates public.payments payment_mode constraint to allow Razorpay modes
-- 4. Updates public.notifications category check to allow 'PASS_EXPIRY'
-- 5. Updates handle_new_user_role_safety() to record pass_expiry_date in student_transport & bus_passes
-- 6. Implements check_and_notify_expiring_passes() RPC for automated 7-day alerts
-- 7. Implements complete_pass_renewal() RPC for verified Razorpay pass renewal
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. ADD PASS EXPIRY & ISSUE COLUMNS TO STUDENT_TRANSPORT
ALTER TABLE public.student_transport 
    ADD COLUMN IF NOT EXISTS pass_expiry_date DATE,
    ADD COLUMN IF NOT EXISTS pass_issue_date DATE DEFAULT CURRENT_DATE;

-- 2. UPDATE NOTIFICATIONS CATEGORY CONSTRAINT
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
    'TRIP_COMPLETED',
    'PASS_EXPIRY'
));

-- 3. UPDATE PAYMENTS PAYMENT_MODE CONSTRAINT
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_mode_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_mode_check
CHECK (payment_mode IN (
    'UPI',
    'NET_BANKING',
    'CREDIT_DEBIT_CARD',
    'COLLEGE_CHALLAN',
    'RAZORPAY_TEST',
    'RAZORPAY'
));

-- 4. CREATE PASS_RENEWALS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.pass_renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    previous_expiry_date DATE,
    new_expiry_date DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    currency TEXT NOT NULL DEFAULT 'INR',
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT NOT NULL UNIQUE,
    razorpay_signature TEXT,
    payment_status TEXT NOT NULL DEFAULT 'captured',
    term TEXT NOT NULL DEFAULT 'Semester Renewal (180 Days)',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on pass_renewals
ALTER TABLE public.pass_renewals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own pass renewals" ON public.pass_renewals;
CREATE POLICY "Students can view own pass renewals"
    ON public.pass_renewals FOR SELECT
    USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins can view all pass renewals" ON public.pass_renewals;
CREATE POLICY "Admins can view all pass renewals"
    ON public.pass_renewals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Authenticated users can insert renewals" ON public.pass_renewals;
CREATE POLICY "Authenticated users can insert renewals"
    ON public.pass_renewals FOR INSERT
    WITH CHECK (auth.uid() = student_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- Grant permissions
GRANT SELECT, INSERT ON public.pass_renewals TO authenticated, service_role;
GRANT SELECT ON public.pass_renewals TO anon;

-- 5. UPDATE ATOMIC TRIGGER FUNCTION FOR USER REGISTRATION
CREATE OR REPLACE FUNCTION public.handle_new_user_role_safety()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_email TEXT;
    v_requested_role TEXT;
    v_clean_role TEXT;
    v_status TEXT;
    v_shift_id UUID;
    v_route_id UUID;
    v_pickup_stop_id UUID;
    v_raw_shift TEXT;
    v_raw_route TEXT;
    v_raw_stop TEXT;
    v_receipt_size BIGINT;
    v_academic_year TEXT;
    v_gender TEXT;
    v_clean_prn TEXT;
    v_pass_expiry_date DATE := NULL;
    v_pass_issue_date DATE := CURRENT_DATE;
BEGIN
    v_email := LOWER(TRIM(NEW.email));
    v_requested_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));

    -- Guard: Allow 'driver' and 'admin' when created by postgres, service_role or admin
    IF v_requested_role IN ('admin', 'driver') THEN
        IF current_user IN ('postgres', 'service_role', 'supabase_admin') OR auth.role() IN ('service_role', 'supabase_admin') THEN
            v_clean_role := v_requested_role;
            v_status := CASE WHEN v_clean_role = 'driver' THEN 'active' ELSE 'approved' END;
        ELSE
            v_clean_role := 'student';
            v_status := 'pending_approval';
        END IF;
    ELSE
        v_clean_role := 'student';
        v_status := 'pending_approval';
    END IF;

    -- 1. Create or Update public.profiles
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        status,
        avatar_seed,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_email,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'User'),
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), '+91 00000 00000'),
        v_clean_role,
        v_status,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_seed'), ''), LOWER(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', 'user'), '[^a-zA-Z0-9]', '-', 'g'))),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        status = CASE 
            WHEN public.profiles.status = 'approved' THEN 'approved'
            WHEN public.profiles.status = 'active' THEN 'active'
            ELSE EXCLUDED.status 
        END,
        updated_at = NOW();

    -- 2. If student role, create or update public.students & public.student_transport
    IF v_clean_role = 'student' THEN
        v_academic_year := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'academic_year', 'FE')));
        IF v_academic_year NOT IN ('FE', 'SE', 'TE', 'BE') THEN
            v_academic_year := CASE 
                WHEN v_academic_year LIKE '%FIRST%' OR v_academic_year = '1' THEN 'FE'
                WHEN v_academic_year LIKE '%SECOND%' OR v_academic_year = '2' THEN 'SE'
                WHEN v_academic_year LIKE '%THIRD%' OR v_academic_year = '3' THEN 'TE'
                WHEN v_academic_year LIKE '%FINAL%' OR v_academic_year LIKE '%FOURTH%' OR v_academic_year = '4' THEN 'BE'
                ELSE 'FE'
            END;
        END IF;

        v_gender := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'gender', 'other')));
        IF v_gender NOT IN ('female', 'male', 'other') THEN
            v_gender := 'other';
        END IF;

        v_clean_prn := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'prn', '')));
        IF v_clean_prn = '' THEN
            v_clean_prn := 'PRN-' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8);
        ELSIF EXISTS (SELECT 1 FROM public.students WHERE prn = v_clean_prn AND id <> NEW.id) THEN
            v_clean_prn := v_clean_prn || '-DUP-' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 4);
        END IF;

        BEGIN
            v_receipt_size := (NEW.raw_user_meta_data->>'fee_receipt_size')::BIGINT;
        EXCEPTION WHEN OTHERS THEN
            v_receipt_size := NULL;
        END;

        -- Extract pass_expiry_date safely
        IF NEW.raw_user_meta_data->>'pass_expiry_date' IS NOT NULL AND TRIM(NEW.raw_user_meta_data->>'pass_expiry_date') <> '' THEN
            BEGIN
                v_pass_expiry_date := (NEW.raw_user_meta_data->>'pass_expiry_date')::DATE;
            EXCEPTION WHEN OTHERS THEN
                v_pass_expiry_date := NULL;
            END;
        END IF;

        INSERT INTO public.students (
            id,
            prn,
            department,
            academic_year,
            division,
            gender,
            fee_receipt_path,
            fee_receipt_name,
            fee_receipt_size,
            fee_receipt_type,
            approval_status,
            registration_date,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            v_clean_prn,
            COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''), 'Engineering'),
            v_academic_year,
            COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'division'), ''), 'A'),
            v_gender,
            NEW.raw_user_meta_data->>'fee_receipt_path',
            NEW.raw_user_meta_data->>'fee_receipt_name',
            v_receipt_size,
            NEW.raw_user_meta_data->>'fee_receipt_type',
            'pending_approval',
            CURRENT_DATE,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            prn = EXCLUDED.prn,
            department = EXCLUDED.department,
            academic_year = EXCLUDED.academic_year,
            division = EXCLUDED.division,
            gender = EXCLUDED.gender,
            fee_receipt_path = COALESCE(EXCLUDED.fee_receipt_path, public.students.fee_receipt_path),
            fee_receipt_name = COALESCE(EXCLUDED.fee_receipt_name, public.students.fee_receipt_name),
            fee_receipt_size = COALESCE(EXCLUDED.fee_receipt_size, public.students.fee_receipt_size),
            fee_receipt_type = COALESCE(EXCLUDED.fee_receipt_type, public.students.fee_receipt_type),
            updated_at = NOW();

        -- Student transport assignment resolution
        v_raw_shift := TRIM(COALESCE(NEW.raw_user_meta_data->>'shift_id', ''));
        v_raw_route := TRIM(COALESCE(NEW.raw_user_meta_data->>'route_id', ''));
        v_raw_stop := TRIM(COALESCE(NEW.raw_user_meta_data->>'pickup_stop_id', ''));

        IF v_raw_shift ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            SELECT id INTO v_shift_id FROM public.shifts WHERE id = v_raw_shift::UUID;
        END IF;
        IF v_shift_id IS NULL AND v_raw_shift <> '' THEN
            SELECT id INTO v_shift_id FROM public.shifts 
            WHERE code = UPPER(v_raw_shift) OR name ILIKE '%' || v_raw_shift || '%' LIMIT 1;
        END IF;
        IF v_shift_id IS NULL THEN
            SELECT id INTO v_shift_id FROM public.shifts WHERE code = 'MORNING' LIMIT 1;
        END IF;

        IF v_raw_route ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            SELECT id INTO v_route_id FROM public.routes WHERE id = v_raw_route::UUID;
        END IF;
        IF v_route_id IS NULL AND v_raw_route <> '' THEN
            SELECT id INTO v_route_id FROM public.routes 
            WHERE (route_number = UPPER(v_raw_route) OR name ILIKE '%' || v_raw_route || '%')
              AND (v_shift_id IS NULL OR shift_id = v_shift_id)
            LIMIT 1;
        END IF;
        IF v_route_id IS NULL THEN
            SELECT id INTO v_route_id FROM public.routes 
            WHERE (v_shift_id IS NULL OR shift_id = v_shift_id) AND is_active = true 
            ORDER BY route_number ASC LIMIT 1;
        END IF;

        IF v_raw_stop ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            SELECT id INTO v_pickup_stop_id FROM public.stops WHERE id = v_raw_stop::UUID;
        END IF;
        IF v_pickup_stop_id IS NULL AND v_raw_stop <> '' THEN
            SELECT id INTO v_pickup_stop_id FROM public.stops 
            WHERE name ILIKE '%' || v_raw_stop || '%' LIMIT 1;
        END IF;
        IF v_pickup_stop_id IS NULL AND v_route_id IS NOT NULL THEN
            SELECT rs.stop_id INTO v_pickup_stop_id FROM public.route_stops rs 
            WHERE rs.route_id = v_route_id AND rs.is_pickup_eligible = true
            ORDER BY rs.sequence_number ASC LIMIT 1;
        END IF;
        IF v_pickup_stop_id IS NULL THEN
            SELECT id INTO v_pickup_stop_id FROM public.stops LIMIT 1;
        END IF;

        INSERT INTO public.student_transport (
            student_id,
            shift_id,
            route_id,
            pickup_stop_id,
            status,
            fee_receipt_path,
            fee_receipt_name,
            fee_receipt_size,
            fee_receipt_type,
            pass_expiry_date,
            pass_issue_date,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            v_shift_id,
            v_route_id,
            v_pickup_stop_id,
            'pending_approval',
            NEW.raw_user_meta_data->>'fee_receipt_path',
            NEW.raw_user_meta_data->>'fee_receipt_name',
            v_receipt_size,
            NEW.raw_user_meta_data->>'fee_receipt_type',
            v_pass_expiry_date,
            v_pass_issue_date,
            NOW(),
            NOW()
        )
        ON CONFLICT (student_id) DO UPDATE SET
            shift_id = EXCLUDED.shift_id,
            route_id = EXCLUDED.route_id,
            pickup_stop_id = EXCLUDED.pickup_stop_id,
            fee_receipt_path = COALESCE(EXCLUDED.fee_receipt_path, public.student_transport.fee_receipt_path),
            fee_receipt_name = COALESCE(EXCLUDED.fee_receipt_name, public.student_transport.fee_receipt_name),
            fee_receipt_size = COALESCE(EXCLUDED.fee_receipt_size, public.student_transport.fee_receipt_size),
            fee_receipt_type = COALESCE(EXCLUDED.fee_receipt_type, public.student_transport.fee_receipt_type),
            pass_expiry_date = COALESCE(EXCLUDED.pass_expiry_date, public.student_transport.pass_expiry_date),
            updated_at = NOW();

        -- Also record in bus_passes if expiry date is present
        IF v_pass_expiry_date IS NOT NULL THEN
            INSERT INTO public.bus_passes (
                student_id,
                pass_number,
                academic_year,
                valid_from,
                valid_till,
                term,
                qr_data,
                fee_paid,
                status
            ) VALUES (
                NEW.id,
                'PASS-' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8),
                v_academic_year || ' 2026-27',
                v_pass_issue_date,
                v_pass_expiry_date,
                'Annual Term',
                'VAAHAN-PASS:' || NEW.id || ':' || v_clean_prn,
                18500,
                'ACTIVE'
            )
            ON CONFLICT (pass_number) DO UPDATE SET
                valid_till = EXCLUDED.valid_till;
        END IF;
    END IF;

    -- 3. If driver role, ensure record in public.drivers exists
    IF v_clean_role = 'driver' THEN
        INSERT INTO public.drivers (id, experience_years, rating)
        VALUES (NEW.id, 5, 4.9)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- 6. RPC: AUTOMATED EXPIRY ALERTS (7 DAYS BEFORE EXPIRATION)
CREATE OR REPLACE FUNCTION public.check_and_notify_expiring_passes()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_rec RECORD;
    v_student_notifs INT := 0;
    v_admin_notifs INT := 0;
    v_days_left INT;
    v_admin RECORD;
    v_notif_exists BOOLEAN;
BEGIN
    FOR v_rec IN 
        SELECT 
            st.student_id,
            st.pass_expiry_date,
            st.route_id,
            s.prn,
            p.full_name,
            p.email
        FROM public.student_transport st
        JOIN public.students s ON s.id = st.student_id
        JOIN public.profiles p ON p.id = st.student_id
        WHERE st.pass_expiry_date IS NOT NULL
          AND st.pass_expiry_date >= CURRENT_DATE
          AND st.pass_expiry_date <= CURRENT_DATE + INTERVAL '7 days'
    LOOP
        v_days_left := (v_rec.pass_expiry_date - CURRENT_DATE);

        -- Check deduplication for this student, category PASS_EXPIRY, and this expiry date
        SELECT EXISTS (
            SELECT 1 FROM public.notifications
            WHERE user_id = v_rec.student_id
              AND category = 'PASS_EXPIRY'
              AND message LIKE '%' || to_char(v_rec.pass_expiry_date, 'YYYY-MM-DD') || '%'
        ) INTO v_notif_exists;

        IF NOT v_notif_exists THEN
            -- Insert Student Notification
            INSERT INTO public.notifications (
                user_id,
                title,
                message,
                category,
                route_id,
                is_read,
                created_at
            ) VALUES (
                v_rec.student_id,
                CASE 
                    WHEN v_days_left = 0 THEN 'Bus Pass Expires Today!'
                    WHEN v_days_left = 1 THEN 'Bus Pass Expires Tomorrow!'
                    ELSE 'Bus Pass Expiring in ' || v_days_left || ' Days'
                END,
                'Your college bus pass is valid until ' || to_char(v_rec.pass_expiry_date, 'DD Mon YYYY') || ' (' || to_char(v_rec.pass_expiry_date, 'YYYY-MM-DD') || '). Please use the student portal to renew your pass for uninterrupted transit.',
                'PASS_EXPIRY',
                v_rec.route_id,
                false,
                NOW()
            );
            v_student_notifs := v_student_notifs + 1;

            -- Insert Admin Notifications for every active admin profile
            FOR v_admin IN 
                SELECT id FROM public.profiles WHERE role = 'admin'
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
                    v_admin.id,
                    'Pass Expiring: ' || v_rec.full_name || ' (PRN: ' || v_rec.prn || ')',
                    'Student ' || v_rec.full_name || ' (PRN: ' || v_rec.prn || ') bus pass expires on ' || to_char(v_rec.pass_expiry_date, 'DD Mon YYYY') || ' (' || to_char(v_rec.pass_expiry_date, 'YYYY-MM-DD') || ') - ' || v_days_left || ' day(s) remaining.',
                    'PASS_EXPIRY',
                    v_rec.route_id,
                    false,
                    NOW()
                );
                v_admin_notifs := v_admin_notifs + 1;
            END LOOP;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'student_notifications_sent', v_student_notifs,
        'admin_notifications_sent', v_admin_notifs,
        'checked_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_notify_expiring_passes() TO authenticated, service_role, anon;

-- 7. RPC: COMPLETE PASS RENEWAL (CALLED AFTER VERIFIED RAZORPAY PAYMENT)
CREATE OR REPLACE FUNCTION public.complete_pass_renewal(
    p_student_id UUID,
    p_order_id TEXT,
    p_payment_id TEXT,
    p_signature TEXT DEFAULT NULL,
    p_amount NUMERIC DEFAULT 1.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_current_expiry DATE;
    v_new_expiry DATE;
    v_receipt_no TEXT;
    v_renewal_id UUID;
    v_student_name TEXT;
    v_prn TEXT;
    v_route_id UUID;
    v_academic_year TEXT;
    v_existing_renewal UUID;
BEGIN
    -- Authorization check: caller must be the student or an admin
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_student_id THEN
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
            RAISE EXCEPTION 'Access denied. You can only renew your own bus pass.';
        END IF;
    END IF;

    -- Idempotency check: if payment_id was already recorded, return existing record
    SELECT id, new_expiry_date INTO v_existing_renewal, v_new_expiry 
    FROM public.pass_renewals 
    WHERE razorpay_payment_id = p_payment_id;

    IF v_existing_renewal IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'idempotent', true,
            'renewal_id', v_existing_renewal,
            'new_expiry_date', v_new_expiry,
            'message', 'Payment was already processed and verified.'
        );
    END IF;

    -- Fetch student transit record
    SELECT 
        st.pass_expiry_date,
        st.route_id,
        p.full_name,
        s.prn,
        s.academic_year
    INTO 
        v_current_expiry,
        v_route_id,
        v_student_name,
        v_prn,
        v_academic_year
    FROM public.student_transport st
    JOIN public.students s ON s.id = st.student_id
    JOIN public.profiles p ON p.id = st.student_id
    WHERE st.student_id = p_student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student transport record not found for ID: %', p_student_id;
    END IF;

    -- Calculate new expiry:
    -- If current expiry date is in future, extend by 180 days from current expiry
    -- If expired or missing/null, extend by 180 days from today
    IF v_current_expiry IS NOT NULL AND v_current_expiry >= CURRENT_DATE THEN
        v_new_expiry := v_current_expiry + INTERVAL '180 days';
    ELSE
        v_new_expiry := CURRENT_DATE + INTERVAL '180 days';
    END IF;

    -- Generate receipt number
    v_receipt_no := 'REC-RP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6);

    -- 1. Insert into pass_renewals
    INSERT INTO public.pass_renewals (
        student_id,
        previous_expiry_date,
        new_expiry_date,
        amount,
        currency,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_status,
        term
    ) VALUES (
        p_student_id,
        v_current_expiry,
        v_new_expiry,
        p_amount,
        'INR',
        p_order_id,
        p_payment_id,
        p_signature,
        'captured',
        'Semester Term (180 Days)'
    ) RETURNING id INTO v_renewal_id;

    -- 2. Update student_transport pass_expiry_date
    UPDATE public.student_transport
    SET 
        pass_expiry_date = v_new_expiry,
        status = 'approved',
        updated_at = NOW()
    WHERE student_id = p_student_id;

    -- 3. Update public.students approval status if needed
    UPDATE public.students
    SET 
        approval_status = 'approved',
        updated_at = NOW()
    WHERE id = p_student_id;

    -- 4. Insert or Update public.bus_passes
    INSERT INTO public.bus_passes (
        student_id,
        pass_number,
        academic_year,
        valid_from,
        valid_till,
        term,
        qr_data,
        fee_paid,
        status
    ) VALUES (
        p_student_id,
        'PASS-' || SUBSTRING(REPLACE(p_student_id::text, '-', ''), 1, 8),
        COALESCE(v_academic_year, 'TE') || ' 2026-27',
        CURRENT_DATE,
        v_new_expiry,
        'Semester Renewal',
        'VAAHAN-PASS:' || p_student_id || ':' || v_prn,
        p_amount,
        'ACTIVE'
    )
    ON CONFLICT (pass_number) DO UPDATE SET
        valid_till = EXCLUDED.valid_till,
        status = 'ACTIVE';

    -- 5. Record in public.payments table
    INSERT INTO public.payments (
        student_id,
        receipt_number,
        amount,
        payment_mode,
        status,
        term,
        transaction_ref
    ) VALUES (
        p_student_id,
        v_receipt_no,
        p_amount,
        'RAZORPAY_TEST',
        'SUCCESS',
        'Semester Renewal (180 Days)',
        p_payment_id
    ) ON CONFLICT (receipt_number) DO NOTHING;

    -- 6. Insert student confirmation notification
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        category,
        route_id,
        is_read,
        created_at
    ) VALUES (
        p_student_id,
        'Bus Pass Renewed Successfully!',
        'Your payment of ₹' || TRIM(TO_CHAR(p_amount, '999990.00')) || ' (Ref: ' || p_payment_id || ') was verified. Your pass has been extended until ' || TO_CHAR(v_new_expiry, 'DD Mon YYYY') || '.',
        'PASS_EXPIRY',
        v_route_id,
        false,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'renewal_id', v_renewal_id,
        'receipt_number', v_receipt_no,
        'previous_expiry_date', v_current_expiry,
        'new_expiry_date', v_new_expiry,
        'amount', p_amount,
        'payment_id', p_payment_id,
        'message', 'Bus pass successfully renewed and validity extended.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_pass_renewal(UUID, TEXT, TEXT, TEXT, NUMERIC) TO authenticated, service_role;


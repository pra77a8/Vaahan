-- =============================================================================
-- VAAHAN TRANSIT SYSTEM - SCHEMA DEFINITION (SUPABASE POSTGRESQL)
-- K. K. Wagh Institute of Engineering Education & Research, Nashik
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. PROFILES TABLE (Extends Supabase auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('student', 'driver', 'admin')),
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'blocked')),
    avatar_seed TEXT DEFAULT 'student',
    avatar_bg TEXT DEFAULT 'bg-sky-100 text-sky-800 border-sky-300',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 2. SHIFTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE CHECK (code IN ('MORNING', 'GENERAL')),
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 3. STOPS TABLE (Reusable physical bus stops across Nashik)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    landmark TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_stop_name UNIQUE (name)
);

-- -----------------------------------------------------------------------------
-- 4. ROUTES TABLE (Specific to Shift)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
    route_number TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_route_per_shift UNIQUE (shift_id, route_number)
);

-- -----------------------------------------------------------------------------
-- 5. ROUTE_STOPS TABLE (Ordered sequence of stops for a specific route)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    stop_id UUID NOT NULL REFERENCES public.stops(id) ON DELETE RESTRICT,
    sequence_number INTEGER NOT NULL,
    morning_pickup_time TEXT,
    drop_time TEXT,
    is_pickup_eligible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_route_stop_sequence UNIQUE (route_id, sequence_number)
);

-- -----------------------------------------------------------------------------
-- 6. STUDENTS TABLE (Academic Information)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    prn TEXT NOT NULL UNIQUE,
    roll_no TEXT,
    department TEXT NOT NULL,
    academic_year TEXT NOT NULL CHECK (academic_year IN ('FE', 'SE', 'TE', 'BE')),
    division TEXT NOT NULL,
    gender TEXT DEFAULT 'other' CHECK (gender IN ('female', 'male', 'other')),
    blood_group TEXT,
    emergency_contact_name TEXT,
    emergency_contact_relation TEXT,
    emergency_contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 7. STUDENT_TRANSPORT TABLE (Approved shift, route, and pickup stop assignment)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_transport (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE RESTRICT,
    pickup_stop_id UUID NOT NULL REFERENCES public.stops(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 8. BUSES TABLE (Campus Vehicle Fleet)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_number TEXT NOT NULL UNIQUE,
    plate_number TEXT NOT NULL UNIQUE,
    model TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 48,
    status TEXT NOT NULL DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'ON_ROUTE', 'AT_STOP', 'AT_CAMPUS', 'MAINTENANCE')),
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    is_ac BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 9. DRIVERS TABLE (Driver Profile Extension)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    license_number TEXT NOT NULL UNIQUE,
    badge_number TEXT NOT NULL UNIQUE,
    experience_years INTEGER NOT NULL DEFAULT 5,
    assigned_bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    rating DOUBLE PRECISION DEFAULT 4.9,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 10. TRIPS TABLE (Dynamic Daily Trips)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
    bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE RESTRICT,
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
    source_stop_id UUID NOT NULL REFERENCES public.stops(id) ON DELETE RESTRICT,
    destination_stop_id UUID NOT NULL REFERENCES public.stops(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    current_stop_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 11. TRIP_STOPS TABLE (Generated slice of stops for the active journey)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    stop_id UUID NOT NULL REFERENCES public.stops(id) ON DELETE RESTRICT,
    sequence_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REACHED', 'SKIPPED')),
    reached_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_trip_stop_sequence UNIQUE (trip_id, sequence_number)
);

-- -----------------------------------------------------------------------------
-- 12. LIVE_LOCATIONS TABLE (Breadcrumb GPS Telemetry)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_locations (
    id BIGSERIAL PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed_kmh DOUBLE PRECISION DEFAULT 0,
    heading DOUBLE PRECISION DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_live_locations_trip_time ON public.live_locations(trip_id, recorded_at DESC);

-- -----------------------------------------------------------------------------
-- 13. BUS_PASSES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bus_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    pass_number TEXT NOT NULL UNIQUE,
    academic_year TEXT NOT NULL,
    valid_from DATE NOT NULL,
    valid_till DATE NOT NULL,
    term TEXT NOT NULL,
    qr_data TEXT NOT NULL,
    fee_paid NUMERIC(10, 2) NOT NULL DEFAULT 18500,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING_RENEWAL', 'EXPIRED', 'BLOCKED')),
    approved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 14. PAYMENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('UPI', 'NET_BANKING', 'CREDIT_DEBIT_CARD', 'COLLEGE_CHALLAN')),
    status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'PENDING', 'FAILED')),
    term TEXT NOT NULL,
    transaction_ref TEXT NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 15. NOTIFICATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('DELAY', 'ROUTE_ALERT', 'FEE_REMINDER', 'ANNOUNCEMENT', 'EMERGENCY')),
    route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- SERVER-SIDE EMAIL VALIDATION FOR STUDENTS TRIGGER
-- Rejects any student registration that does NOT end in @kkwagh.edu.in
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_kkwagh_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'student' THEN
        IF NEW.email NOT LIKE '%@kkwagh.edu.in' THEN
            RAISE EXCEPTION 'Student registration requires an official college email ending with @kkwagh.edu.in';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_validate_kkwagh_email ON public.profiles;
CREATE TRIGGER trigger_validate_kkwagh_email
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_kkwagh_email();

-- =============================================================================
-- VAAHAN: MIGRATION 004 - FEE RECEIPTS STORAGE & STUDENT COLUMNS
-- Adds fee receipt tracking to students and student_transport,
-- and configures Supabase Storage bucket for private receipts.
-- =============================================================================

-- 1. Add Fee Receipt Columns to public.students and public.student_transport
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS fee_receipt_path TEXT,
ADD COLUMN IF NOT EXISTS fee_receipt_name TEXT,
ADD COLUMN IF NOT EXISTS fee_receipt_size INTEGER,
ADD COLUMN IF NOT EXISTS fee_receipt_type TEXT,
ADD COLUMN IF NOT EXISTS fee_receipt_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS registration_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (approval_status IN ('pending_approval', 'approved', 'rejected'));

ALTER TABLE public.student_transport
ADD COLUMN IF NOT EXISTS fee_receipt_path TEXT,
ADD COLUMN IF NOT EXISTS fee_receipt_name TEXT,
ADD COLUMN IF NOT EXISTS fee_receipt_size INTEGER,
ADD COLUMN IF NOT EXISTS fee_receipt_type TEXT;

-- 2. Create Storage Bucket for Private Fee Receipts (if storage extension is available)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'fee-receipts',
    'fee-receipts',
    false,
    5242880, -- 5 MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

-- 3. Storage RLS Policies for fee-receipts Bucket
-- Drop existing policies if any
DROP POLICY IF EXISTS "Students can upload their own fee receipt" ON storage.objects;
DROP POLICY IF EXISTS "Students can read their own fee receipt" ON storage.objects;
DROP POLICY IF EXISTS "Administrators can read all fee receipts" ON storage.objects;

-- Policy: Students can upload only to their folder: {student_id}/*
CREATE POLICY "Students can upload their own fee receipt"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'fee-receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Students can view/read only their own receipt
CREATE POLICY "Students can read their own fee receipt"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'fee-receipts' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
);

-- Policy: Administrators can read and download all fee receipts
CREATE POLICY "Administrators can read all fee receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'fee-receipts' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

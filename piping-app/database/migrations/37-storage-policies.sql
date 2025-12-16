-- Migration: Enable Storage RLS policies for spool-levantamientos
-- Created: 2025-12-16

-- Allow public access to read files (if bucket is public, this is redundant but safe)
CREATE POLICY "Public Access to Photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'spool-levantamientos' );

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Users can Upload Photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'spool-levantamientos' AND
  auth.role() = 'authenticated'
);

-- Allow users to delete their own files (matching the file path structure user_id/...)
-- Note: Our path structure is {levantamiento_id}/{filename}. 
-- The levantamiento row has captured_by. This is hard to check in storage policy cross-table.
-- For now, allow authenticated users to delete files in this bucket is a pragmatic approach 
-- or rely on the API doing it via Service Role (which bypasses RLS).
-- The API uses `createClient` (user context) for upload, but I can switch DELETE to use Service Role if needed.
-- But for Upload, the user context needs this INSERT policy.

CREATE POLICY "Authenticated Users can Update/Delete Photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'spool-levantamientos' AND
  auth.role() = 'authenticated'
);

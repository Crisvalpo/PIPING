-- Storage bucket configuration for spool levantamientos
-- NOTE: This should be run in Supabase Dashboard SQL Editor with appropriate permissions

-- Create storage bucket for spool photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'spool-levantamientos',
  'spool-levantamientos',
  false, -- Not public, requires auth
  5242880, -- 5MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage.objects
DROP POLICY IF EXISTS "Users can view levantamiento photos for their project" ON storage.objects;
CREATE POLICY "Users can view levantamiento photos for their project"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'spool-levantamientos' AND
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can upload levantamiento photos" ON storage.objects;
CREATE POLICY "Users can upload levantamiento photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'spool-levantamientos' AND
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can delete their own levantamiento photos" ON storage.objects;
CREATE POLICY "Users can delete their own levantamiento photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'spool-levantamientos' AND
  auth.uid() IS NOT NULL
);

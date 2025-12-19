-- Migration: Add thumbnail_path to spool_levantamiento_photos
-- Created: 2025-12-18
-- Description: Add column to store the path of the optimized thumbnail image

ALTER TABLE spool_levantamiento_photos 
ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

COMMENT ON COLUMN spool_levantamiento_photos.thumbnail_path IS 'Supabase Storage path to optimized thumbnail image (150x150)';

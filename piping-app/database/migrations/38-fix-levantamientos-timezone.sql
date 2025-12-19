-- Migration: Fix timezone for levantamientos
-- Created: 2025-12-18
-- Description: Convert TIMESTAMP columns to TIMESTAMPTZ to correctly store UTC time and prevent +3h UI offset

-- Fix spool_levantamientos table
ALTER TABLE spool_levantamientos 
  ALTER COLUMN captured_at TYPE TIMESTAMPTZ USING captured_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- Fix spool_levantamiento_photos table
ALTER TABLE spool_levantamiento_photos
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

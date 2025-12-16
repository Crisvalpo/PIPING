-- Migration: Change captured_at to TIMESTAMPTZ for correct timezone handling
-- Created: 2025-12-16

ALTER TABLE spool_levantamientos 
ALTER COLUMN captured_at TYPE TIMESTAMP WITH TIME ZONE 
USING captured_at AT TIME ZONE 'UTC';

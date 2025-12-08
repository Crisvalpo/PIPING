-- CLEANUP SCRIPT
-- WARNING: This will delete ALL assignments, attendance, and cuadrillas for the project.
-- Run this in Supabase SQL Editor.

-- 1. Clean up assignments (Child tables first)
TRUNCATE TABLE maestros_asignaciones CASCADE;
TRUNCATE TABLE soldadores_asignaciones CASCADE;

-- 2. Clean up attendance and overrides
TRUNCATE TABLE asistencia_diaria CASCADE;
TRUNCATE TABLE project_daily_overrides CASCADE;

-- 3. Clean up Cuadrillas (but keep the table structure)
-- We use DELETE instead of TRUNCATE for cuadrillas to handle potential foreign key constraints carefully if needed,
-- but since we truncated children, we can try TRUNCATE here too or delete.
DELETE FROM cuadrillas;

-- 4. Optional: Reset Project Shifts (Uncomment if you want to wipe shifts too, but usually we keep defaults)
-- DELETE FROM project_shifts;

SELECT 'Cleanup completed successfully' as status;

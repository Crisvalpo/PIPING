-- ===================================================================
-- MIGRATION 25: Refactor Shift System - Move to Cuadrilla Level
-- Instead of assigning shifts per worker, assign at cuadrilla level
-- All workers in a cuadrilla inherit the cuadrilla's shift
-- ===================================================================

-- 1. Add shift_id to cuadrillas table
ALTER TABLE cuadrillas
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES project_shifts(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_cuadrillas_shift_id ON cuadrillas(shift_id);

-- 3. Backfill: Set cuadrilla shift_id based on existing worker assignments
-- For each cuadrilla, look at the most common shift_id from its workers
WITH cuadrilla_shifts AS (
    SELECT 
        c.id as cuadrilla_id,
        COALESCE(
            -- Try to get most common shift from maestros
            (SELECT ma.shift_id 
             FROM maestros_asignaciones ma 
             WHERE ma.cuadrilla_id = c.id 
               AND ma.shift_id IS NOT NULL 
             GROUP BY ma.shift_id 
             ORDER BY COUNT(*) DESC 
             LIMIT 1),
            -- If no maestros with shift, try soldadores
            (SELECT sa.shift_id 
             FROM soldadores_asignaciones sa 
             WHERE sa.cuadrilla_id = c.id 
               AND sa.shift_id IS NOT NULL 
             GROUP BY sa.shift_id 
             ORDER BY COUNT(*) DESC 
             LIMIT 1),
            -- If still null, use project default
            get_default_shift(c.proyecto_id)
        ) as assigned_shift_id
    FROM cuadrillas c
    WHERE c.active = true
)
UPDATE cuadrillas c
SET shift_id = cs.assigned_shift_id
FROM cuadrilla_shifts cs
WHERE c.id = cs.cuadrilla_id;

-- 4. Drop shift_id from assignment tables (no longer needed)
-- Keep the columns for now but they'll be deprecated
-- ALTER TABLE maestros_asignaciones DROP COLUMN IF EXISTS shift_id;
-- ALTER TABLE soldadores_asignaciones DROP COLUMN IF EXISTS shift_id;

-- NOTE: We keep shift_id in assignment tables for historical data
-- but going forward, all shift logic uses cuadrillas.shift_id

-- 5. Update RPC functions to ignore shift_id parameter
-- (They'll be updated to NOT use p_shift_id anymore)

SELECT 'Migration 25: Shift system refactored to cuadrilla level' as status;

-- ===================================================================
-- MIGRATION 23: Multi-Shift System Support
-- Enables projects to have multiple concurrent shifts (Day/Night)
-- Workers can be assigned to different shifts daily
-- ===================================================================

-- 1. Add default shift flag to project_shifts
ALTER TABLE project_shifts 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- 2. Add shift reference to maestros_asignaciones
ALTER TABLE maestros_asignaciones 
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES project_shifts(id) ON DELETE SET NULL;

-- 3. Add shift reference to soldadores_asignaciones
ALTER TABLE soldadores_asignaciones 
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES project_shifts(id) ON DELETE SET NULL;

-- 4. Create unique constraint: only one default shift per project
DROP INDEX IF EXISTS unique_default_shift_per_project;
CREATE UNIQUE INDEX unique_default_shift_per_project 
ON project_shifts (proyecto_id) 
WHERE is_default = true;

-- 5. Backfill: Set first/only shift of each project as default
WITH first_shifts AS (
    SELECT DISTINCT ON (proyecto_id) 
        id, proyecto_id
    FROM project_shifts
    ORDER BY proyecto_id, created_at ASC
)
UPDATE project_shifts ps
SET is_default = true
FROM first_shifts fs
WHERE ps.id = fs.id
  AND ps.is_default = false;

-- 6. Backfill: Assign default shift to existing maestros assignments
UPDATE maestros_asignaciones ma
SET shift_id = (
    SELECT ps.id 
    FROM project_shifts ps
    JOIN cuadrillas c ON c.proyecto_id = ps.proyecto_id
    WHERE c.id = ma.cuadrilla_id
      AND ps.is_default = true
    LIMIT 1
)
WHERE ma.shift_id IS NULL;

-- 7. Backfill: Assign default shift to existing soldadores assignments
UPDATE soldadores_asignaciones sa
SET shift_id = (
    SELECT ps.id 
    FROM project_shifts ps
    JOIN cuadrillas c ON c.proyecto_id = ps.proyecto_id
    WHERE c.id = sa.cuadrilla_id
      AND ps.is_default = true
    LIMIT 1
)
WHERE sa.shift_id IS NULL;

-- 8. Create helper function to get active shifts for a project
CREATE OR REPLACE FUNCTION get_project_shifts(p_proyecto_id UUID)
RETURNS TABLE (
    id UUID,
    shift_name TEXT,
    start_time TIME,
    end_time TIME,
    lunch_break_minutes INTEGER,
    is_default BOOLEAN,
    active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.shift_name,
        ps.start_time,
        ps.end_time,
        ps.lunch_break_minutes,
        ps.is_default,
        ps.active
    FROM project_shifts ps
    WHERE ps.proyecto_id = p_proyecto_id
      AND ps.active = true
    ORDER BY ps.is_default DESC, ps.shift_name ASC;
END;
$$ LANGUAGE plpgsql;

-- 9. Create helper function to get default shift for a project
CREATE OR REPLACE FUNCTION get_default_shift(p_proyecto_id UUID)
RETURNS UUID AS $$
DECLARE
    v_shift_id UUID;
BEGIN
    SELECT id INTO v_shift_id
    FROM project_shifts
    WHERE proyecto_id = p_proyecto_id
      AND is_default = true
      AND active = true
    LIMIT 1;
    
    RETURN v_shift_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Add comment documentation
COMMENT ON COLUMN project_shifts.is_default IS 'Indicates the default shift for new worker assignments. Only one per project can be true.';
COMMENT ON COLUMN maestros_asignaciones.shift_id IS 'References the shift this maestro is working for this assignment.';
COMMENT ON COLUMN soldadores_asignaciones.shift_id IS 'References the shift this soldador is working for this assignment.';

SELECT 'Migration 23: Multi-Shift System - Completed Successfully' as status;

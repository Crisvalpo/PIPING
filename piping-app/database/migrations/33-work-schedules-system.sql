-- ===================================================================
-- MIGRATION 33: Work Schedules System
-- Manages worker schedules (5x2, 14x14, etc.) and rest days
-- ===================================================================

-- 1. Create work_schedules table (catalog of schedules per project)
CREATE TABLE IF NOT EXISTS work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL, -- "5x2", "14x14 A", "7x7", etc.
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('FIXED_WEEKLY', 'ROTATING')),
    
    -- Schedule parameters
    dias_trabajo INTEGER NOT NULL CHECK (dias_trabajo > 0),
    dias_descanso INTEGER NOT NULL CHECK (dias_descanso >= 0),
    
    -- For rotating schedules (14x14 A/B)
    fecha_inicio_grupo DATE, -- When this group started their rotation
    grupo VARCHAR(10), -- 'A', 'B', 'C', etc.
    
    -- Configuration
    configuracion_horas JSONB DEFAULT '{}', -- Future: special rules like "viernes -2h"
    
    -- Metadata
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique schedule name per project
    CONSTRAINT unique_schedule_name_per_project UNIQUE(proyecto_id, nombre)
);

-- 2. Add columns to personal table
ALTER TABLE personal
ADD COLUMN IF NOT EXISTS codigo_trabajador VARCHAR(50), -- Employee code: "EMP-001"
ADD COLUMN IF NOT EXISTS work_schedule_id UUID REFERENCES work_schedules(id) ON DELETE SET NULL;

-- 3. Create personal_override_diario table (manual overrides)
CREATE TABLE IF NOT EXISTS personal_override_diario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personal_rut VARCHAR(12) NOT NULL,
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('DIA_EXTRA', 'DIA_DESCANSO_FORZADO')),
    
    -- DIA_EXTRA: Worker comes on their rest day
    -- DIA_DESCANSO_FORZADO: Worker doesn't come on a work day (beyond normal absence)
    
    motivo TEXT,
    aprobado_por VARCHAR(255), -- Admin who approved
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- One override per worker per day
    CONSTRAINT unique_override_per_worker_per_day UNIQUE(personal_rut, fecha)
);

-- 4. Function to check if worker should be working on a given date
CREATE OR REPLACE FUNCTION is_worker_on_duty(
    p_personal_rut VARCHAR(12),
    p_fecha DATE DEFAULT CURRENT_DATE
) RETURNS BOOLEAN AS $$
DECLARE
    v_schedule RECORD;
    v_dias_desde_inicio INTEGER;
    v_posicion_en_ciclo INTEGER;
    v_dia_semana INTEGER;
    v_override_tipo VARCHAR(30);
BEGIN
    -- Check for manual override first
    SELECT tipo INTO v_override_tipo
    FROM personal_override_diario
    WHERE personal_rut = p_personal_rut
      AND fecha = p_fecha;
    
    IF FOUND THEN
        -- DIA_EXTRA = should work (even if schedule says rest)
        -- DIA_DESCANSO_FORZADO = should not work (even if schedule says work)
        RETURN v_override_tipo = 'DIA_EXTRA';
    END IF;
    
    -- Get worker's schedule
    SELECT ws.* INTO v_schedule
    FROM personal p
    JOIN work_schedules ws ON p.work_schedule_id = ws.id
    WHERE p.rut = p_personal_rut
      AND ws.activo = true;
    
    -- No schedule assigned = assume should work (default behavior)
    IF NOT FOUND THEN
        RETURN true;
    END IF;
    
    -- CASE 1: Fixed weekly schedule (5x2, 4x3)
    IF v_schedule.tipo = 'FIXED_WEEKLY' THEN
        v_dia_semana = EXTRACT(ISODOW FROM p_fecha); -- 1=Monday, 7=Sunday
        
        -- 5x2: work Monday-Friday (1-5)
        IF v_schedule.dias_trabajo = 5 AND v_schedule.dias_descanso = 2 THEN
            RETURN v_dia_semana <= 5;
        END IF;
        
        -- 4x3: work Monday-Thursday (1-4)
        IF v_schedule.dias_trabajo = 4 AND v_schedule.dias_descanso = 3 THEN
            RETURN v_dia_semana <= 4;
        END IF;
        
        -- 6x1: work Monday-Saturday (1-6)
        IF v_schedule.dias_trabajo = 6 AND v_schedule.dias_descanso = 1 THEN
            RETURN v_dia_semana <= 6;
        END IF;
        
        -- Default for other FIXED_WEEKLY: work weekdays
        RETURN v_dia_semana <= 5;
    END IF;
    
    -- CASE 2: Rotating schedule (14x14, 7x7)
    IF v_schedule.tipo = 'ROTATING' THEN
        -- Must have start date for rotation
        IF v_schedule.fecha_inicio_grupo IS NULL THEN
            RETURN true; -- Fallback: assume should work
        END IF;
        
        v_dias_desde_inicio = p_fecha - v_schedule.fecha_inicio_grupo;
        
        -- If before start date, not on duty
        IF v_dias_desde_inicio < 0 THEN
            RETURN false;
        END IF;
        
        -- Calculate position in rotation cycle
        v_posicion_en_ciclo = MOD(v_dias_desde_inicio, 
                                  v_schedule.dias_trabajo + v_schedule.dias_descanso);
        
        -- In work days (0 to dias_trabajo-1)
        RETURN v_posicion_en_ciclo < v_schedule.dias_trabajo;
    END IF;
    
    -- Default fallback
    RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Function to get all schedules for a project
CREATE OR REPLACE FUNCTION get_project_schedules(p_proyecto_id UUID)
RETURNS TABLE (
    id UUID,
    nombre VARCHAR(50),
    tipo VARCHAR(20),
    dias_trabajo INTEGER,
    dias_descanso INTEGER,
    grupo VARCHAR(10),
    workers_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ws.id,
        ws.nombre,
        ws.tipo,
        ws.dias_trabajo,
        ws.dias_descanso,
        ws.grupo,
        COUNT(p.rut) as workers_count
    FROM work_schedules ws
    LEFT JOIN personal p ON p.work_schedule_id = ws.id
    WHERE ws.proyecto_id = p_proyecto_id
      AND ws.activo = true
    GROUP BY ws.id, ws.nombre, ws.tipo, ws.dias_trabajo, ws.dias_descanso, ws.grupo
    ORDER BY ws.nombre;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. View for workers with schedule info
CREATE OR REPLACE VIEW view_personal_with_schedule AS
SELECT 
    p.rut,
    p.nombre,
    p.cargo,
    p.codigo_trabajador,
    p.proyecto_id,
    ws.id as work_schedule_id,
    ws.nombre as jornada,
    ws.tipo as tipo_jornada,
    ws.dias_trabajo,
    ws.dias_descanso,
    ws.grupo as grupo_jornada,
    is_worker_on_duty(p.rut, CURRENT_DATE) as debe_trabajar_hoy
FROM personal p
LEFT JOIN work_schedules ws ON p.work_schedule_id = ws.id;

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_personal_work_schedule ON personal(work_schedule_id);
CREATE INDEX IF NOT EXISTS idx_personal_codigo ON personal(codigo_trabajador);
CREATE INDEX IF NOT EXISTS idx_work_schedules_proyecto ON work_schedules(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_override_diario_lookup ON personal_override_diario(personal_rut, fecha);

-- 8. Add comments for documentation
COMMENT ON TABLE work_schedules IS 'Catálogo de jornadas laborales por proyecto (5x2, 14x14, etc.)';
COMMENT ON TABLE personal_override_diario IS 'Excepciones manuales: días extra o descansos forzados';
COMMENT ON COLUMN personal.codigo_trabajador IS 'Código interno del trabajador usado por la empresa';
COMMENT ON COLUMN personal.work_schedule_id IS 'Régimen de trabajo asignado (5x2, 14x14 A, etc.)';
COMMENT ON FUNCTION is_worker_on_duty IS 'Determina si un trabajador debe trabajar en una fecha específica según su régimen';

-- Success message
SELECT 'Migration 33: Work Schedules System - Completed Successfully' as status;

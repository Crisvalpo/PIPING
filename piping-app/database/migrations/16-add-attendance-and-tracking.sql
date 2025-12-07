-- ===================================================================
-- MIGRATION: 16-add-attendance-and-tracking.sql
-- ===================================================================

-- 1. Create Attendance Table
CREATE TABLE IF NOT EXISTS asistencia_diaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personal_rut VARCHAR(12) NOT NULL REFERENCES personal(rut) ON DELETE CASCADE,
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    fecha DATE DEFAULT CURRENT_DATE,
    presente BOOLEAN DEFAULT TRUE,
    motivo_ausencia TEXT,
    hora_entrada TIME DEFAULT '08:00:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_asistencia_diaria UNIQUE(personal_rut, fecha)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_asistencia_fecha_proyecto ON asistencia_diaria(fecha, proyecto_id);

-- 2. Update Maestros Assignments for Time Tracking
-- Add time columns if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maestros_asignaciones' AND column_name = 'hora_inicio') THEN
        ALTER TABLE maestros_asignaciones ADD COLUMN hora_inicio TIME DEFAULT '08:00:00';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maestros_asignaciones' AND column_name = 'hora_fin') THEN
        ALTER TABLE maestros_asignaciones ADD COLUMN hora_fin TIME;
    END IF;
END $$;

-- 3. Function to Register/Update Attendance
CREATE OR REPLACE FUNCTION registrar_asistencia(
    p_personal_rut VARCHAR(12),
    p_proyecto_id UUID,
    p_presente BOOLEAN,
    p_motivo TEXT DEFAULT NULL,
    p_hora_entrada TIME DEFAULT '08:00:00'
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO asistencia_diaria (personal_rut, proyecto_id, fecha, presente, motivo_ausencia, hora_entrada)
    VALUES (p_personal_rut, p_proyecto_id, CURRENT_DATE, p_presente, p_motivo, p_hora_entrada)
    ON CONFLICT (personal_rut, fecha) 
    DO UPDATE SET 
        presente = EXCLUDED.presente,
        motivo_ausencia = EXCLUDED.motivo_ausencia,
        hora_entrada = EXCLUDED.hora_entrada,
        updated_at = NOW()
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Update Assign Maestro Function (To support time tracking)
-- Replaces previous logic: now closes strict time intervals
CREATE OR REPLACE FUNCTION asignar_maestro_a_cuadrilla(
    p_maestro_rut VARCHAR(12),
    p_cuadrilla_id UUID,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_asignacion_id UUID;
BEGIN
    -- 1. Cerrar asignación actual si existe (mismo día)
    -- Si existe una activa del mismo día, la cerramos con hora actual.
    -- Si es de un día anterior, ya debería estar "inactiva" o se marca inactiva ahora.
    
    UPDATE maestros_asignaciones
    SET activo = FALSE,
        fecha_desasignacion = CURRENT_DATE,
        hora_fin = CURRENT_TIME,
        observaciones = COALESCE(observaciones, '') || ' | Movido a otra cuadrilla'
    WHERE maestro_rut = p_maestro_rut 
      AND activo = TRUE;
      
    -- 2. Crear nueva asignación
    INSERT INTO maestros_asignaciones (
        maestro_rut, 
        cuadrilla_id, 
        fecha_asignacion, 
        hora_inicio, 
        activo, 
        observaciones
    )
    VALUES (
        p_maestro_rut, 
        p_cuadrilla_id, 
        CURRENT_DATE, 
        CURRENT_TIME, -- Hora real del movimiento
        TRUE, 
        p_observaciones
    )
    RETURNING id INTO v_asignacion_id;
    
    RETURN v_asignacion_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Helper View for Attendance Status
CREATE OR REPLACE VIEW view_asistencia_hoy AS
SELECT 
    p.rut,
    p.nombre,
    p.cargo as rol, -- FIX: Changed from p.rol to p.cargo
    a.proyecto_id,
    COALESCE(a.presente, true) as presente, -- Default to true if no record exists? (Assume present until marked absent)
    a.motivo_ausencia,
    a.hora_entrada
FROM personal p
LEFT JOIN asistencia_diaria a ON p.rut = a.personal_rut AND a.fecha = CURRENT_DATE;

COMMENT ON TABLE asistencia_diaria IS 'Registro de asistencia diaria y motivos de ausencia';

-- ===================================================================
-- TABLAS: Sistema de Asignaciones de Personal
-- ===================================================================
-- Trackea asignaciones de maestros (estables) y soldadores (flexibles)
-- ===================================================================

-- 1. Tabla de asignaciones de maestros (estables)
CREATE TABLE IF NOT EXISTS maestros_asignaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maestro_rut VARCHAR(12) NOT NULL REFERENCES personal(rut) ON DELETE CASCADE,
    cuadrilla_id UUID NOT NULL REFERENCES cuadrillas(id) ON DELETE CASCADE,
    fecha_asignacion DATE DEFAULT CURRENT_DATE,
    fecha_desasignacion DATE,
    activo BOOLEAN DEFAULT TRUE,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Solo una asignación activa por maestro
    CONSTRAINT unique_maestro_activo UNIQUE(maestro_rut) WHERE (activo = TRUE)
);

-- 2. Tabla de asignaciones de soldadores (flexibles, diarias)
CREATE TABLE IF NOT EXISTS soldadores_asignaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    soldador_rut VARCHAR(12) NOT NULL REFERENCES soldadores(rut) ON DELETE CASCADE,
    cuadrilla_id UUID NOT NULL REFERENCES cuadrillas(id) ON DELETE CASCADE,
    fecha DATE DEFAULT CURRENT_DATE,
    hora_inicio TIME DEFAULT CURRENT_TIME,
    hora_fin TIME,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Validar que hora_fin >= hora_inicio
    CONSTRAINT check_horas CHECK (hora_fin IS NULL OR hora_fin >= hora_inicio)
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_maestros_cuadrilla ON maestros_asignaciones(cuadrilla_id) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_maestros_rut ON maestros_asignaciones(maestro_rut);
CREATE INDEX IF NOT EXISTS idx_soldadores_cuadrilla ON soldadores_asignaciones(cuadrilla_id, fecha);
CREATE INDEX IF NOT EXISTS idx_soldadores_rut_fecha ON soldadores_asignaciones(soldador_rut, fecha);
CREATE INDEX IF NOT EXISTS idx_soldadores_activos ON soldadores_asignaciones(soldador_rut, fecha) WHERE hora_fin IS NULL;

-- 4. Función para obtener soldadores activos en una cuadrilla
CREATE OR REPLACE FUNCTION get_soldadores_activos_cuadrilla(
    p_cuadrilla_id UUID,
    p_fecha DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    soldador_rut VARCHAR(12),
    nombre VARCHAR(255),
    estampa VARCHAR(20),
    hora_inicio TIME
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.soldador_rut,
        p.nombre,
        s.estampa,
        sa.hora_inicio
    FROM soldadores_asignaciones sa
    JOIN personal p ON sa.soldador_rut = p.rut
    JOIN soldadores s ON sa.soldador_rut = s.rut
    WHERE sa.cuadrilla_id = p_cuadrilla_id
      AND sa.fecha = p_fecha
      AND sa.hora_fin IS NULL
    ORDER BY sa.hora_inicio;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para asignar soldador a cuadrilla
CREATE OR REPLACE FUNCTION asignar_soldador_a_cuadrilla(
    p_soldador_rut VARCHAR(12),
    p_cuadrilla_id UUID,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_asignacion_id UUID;
BEGIN
    -- Cerrar asignación actual del soldador si existe
    UPDATE soldadores_asignaciones
    SET hora_fin = CURRENT_TIME,
        observaciones = COALESCE(observaciones, '') || ' | Auto-cerrada al cambiar de cuadrilla'
    WHERE soldador_rut = p_soldador_rut 
      AND fecha = CURRENT_DATE 
      AND hora_fin IS NULL;
    
    -- Crear nueva asignación
    INSERT INTO soldadores_asignaciones (
        soldador_rut,
        cuadrilla_id,
        observaciones
    )
    VALUES (
        p_soldador_rut,
        p_cuadrilla_id,
        p_observaciones
    )
    RETURNING id INTO v_asignacion_id;
    
    RETURN v_asignacion_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Función para obtener historial de un soldador
CREATE OR REPLACE FUNCTION get_historial_soldador(
    p_soldador_rut VARCHAR(12),
    p_dias_atras INTEGER DEFAULT 7
)
RETURNS TABLE (
    fecha DATE,
    cuadrilla_nombre VARCHAR(255),
    hora_inicio TIME,
    hora_fin TIME,
    horas_trabajadas NUMERIC,
    capataz_nombre VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.fecha,
        c.nombre as cuadrilla_nombre,
        sa.hora_inicio,
        sa.hora_fin,
        CASE 
            WHEN sa.hora_fin IS NOT NULL THEN
                EXTRACT(EPOCH FROM (sa.hora_fin - sa.hora_inicio)) / 3600
            ELSE NULL
        END as horas_trabajadas,
        p.nombre as capataz_nombre
    FROM soldadores_asignaciones sa
    JOIN cuadrillas c ON sa.cuadrilla_id = c.id
    LEFT JOIN personal p ON c.capataz_rut = p.rut
    WHERE sa.soldador_rut = p_soldador_rut
      AND sa.fecha >= CURRENT_DATE - p_dias_atras
    ORDER BY sa.fecha DESC, sa.hora_inicio DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION update_maestros_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_maestros_timestamp
    BEFORE UPDATE ON maestros_asignaciones
    FOR EACH ROW
    EXECUTE FUNCTION update_maestros_timestamp();

-- 8. Comentarios de documentación
COMMENT ON TABLE maestros_asignaciones IS 'Asignaciones estables de maestros a cuadrillas';
COMMENT ON TABLE soldadores_asignaciones IS 'Asignaciones flexibles de soldadores con tracking diario y por hora';
COMMENT ON FUNCTION asignar_soldador_a_cuadrilla IS 'Reasigna soldador a nueva cuadrilla, cerrando asignación anterior automáticamente';
COMMENT ON FUNCTION get_soldadores_activos_cuadrilla IS 'Obtiene soldadores actualmente trabajando en una cuadrilla';
COMMENT ON FUNCTION get_historial_soldador IS 'Obtiene historial de movimientos de un soldador';

-- Verificar tablas creadas
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('maestros_asignaciones', 'soldadores_asignaciones')
ORDER BY table_name;

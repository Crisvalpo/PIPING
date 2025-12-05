-- ===================================================================
-- PASO 4: Crear Funciones de Utilidad
-- ===================================================================

CREATE OR REPLACE FUNCTION asignar_soldador_a_cuadrilla(
    p_soldador_rut VARCHAR(12),
    p_cuadrilla_id UUID,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_asignacion_id UUID;
BEGIN
    UPDATE soldadores_asignaciones
    SET hora_fin = CURRENT_TIME
    WHERE soldador_rut = p_soldador_rut 
      AND fecha = CURRENT_DATE 
      AND hora_fin IS NULL;
    
    INSERT INTO soldadores_asignaciones (soldador_rut, cuadrilla_id, observaciones)
    VALUES (p_soldador_rut, p_cuadrilla_id, p_observaciones)
    RETURNING id INTO v_asignacion_id;
    
    RETURN v_asignacion_id;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION get_historial_soldador(
    p_soldador_rut VARCHAR(12),
    p_dias_atras INTEGER DEFAULT 7
)
RETURNS TABLE (
    fecha DATE,
    cuadrilla_nombre VARCHAR(255),
    hora_inicio TIME,
    hora_fin TIME,
    horas_trabajadas NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.fecha,
        c.nombre,
        sa.hora_inicio,
        sa.hora_fin,
        CASE 
            WHEN sa.hora_fin IS NOT NULL THEN
                EXTRACT(EPOCH FROM (sa.hora_fin - sa.hora_inicio)) / 3600
            ELSE NULL
        END as horas_trabajadas
    FROM soldadores_asignaciones sa
    JOIN cuadrillas c ON sa.cuadrilla_id = c.id
    WHERE sa.soldador_rut = p_soldador_rut
      AND sa.fecha >= CURRENT_DATE - p_dias_atras
    ORDER BY sa.fecha DESC, sa.hora_inicio DESC;
END;
$$ LANGUAGE plpgsql;

SELECT 'Funciones creadas' as status;

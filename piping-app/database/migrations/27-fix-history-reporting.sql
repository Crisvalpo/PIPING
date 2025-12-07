-- Update function to include BOTH Maestros and Soldadores in history report
-- Added SECURITY DEFINER to bypass RLS and avoid permission errors
-- Added robust NULL handling for time calculations

CREATE OR REPLACE FUNCTION get_cuadrilla_hours_history(
  p_proyecto_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  fecha DATE,
  cuadrilla_nombre TEXT,
  rut TEXT,
  nombre TEXT,
  cargo TEXT,
  hora_inicio TIME,
  hora_fin TIME,
  horas_trabajadas NUMERIC
) 
SECURITY DEFINER -- Run with privileges of the creator (usually admin/postgres)
AS $$
BEGIN
  RETURN QUERY
  
  -- MAESTROS
  SELECT
    (ma.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE as fecha,
    c.nombre::TEXT as cuadrilla_nombre, -- Cast to TEXT
    p.rut::TEXT, 
    p.nombre::TEXT, -- Cast to TEXT
    COALESCE(p.cargo, 'MAESTRO')::TEXT as cargo, -- Cast to TEXT
    COALESCE(ma.hora_inicio, '08:00:00'::TIME) as hora_inicio,
    
    -- Hora Fin Calculation
    COALESCE(
        ma.hora_fin, 
        CASE 
            WHEN (ma.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE = CURRENT_DATE THEN 
                (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::TIME
            ELSE 
                '18:00:00'::TIME
        END
    ) as hora_fin,

    -- Hours Calculation
    ROUND(
        (EXTRACT(EPOCH FROM (
            COALESCE(
                ma.hora_fin, 
                CASE 
                    WHEN (ma.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE = CURRENT_DATE THEN 
                        (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::TIME
                    ELSE 
                        '18:00:00'::TIME
                END
            ) - COALESCE(ma.hora_inicio, '08:00:00'::TIME)
        )) / 3600)::numeric, 
        2
    ) as horas_trabajadas

  FROM maestros_asignaciones ma
  JOIN cuadrillas c ON ma.cuadrilla_id = c.id
  JOIN personal p ON ma.maestro_rut = p.rut
  LEFT JOIN asistencia_diaria ad ON 
    ad.personal_rut = ma.maestro_rut AND 
    ad.fecha = (ma.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE
  WHERE 
    c.proyecto_id = p_proyecto_id
    AND (ma.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE BETWEEN p_start_date AND p_end_date
    AND (ad.presente IS NULL OR ad.presente = TRUE)

  UNION ALL

  -- SOLDADORES
  SELECT
    (sa.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE as fecha,
    c.nombre::TEXT as cuadrilla_nombre, -- Cast to TEXT
    p.rut::TEXT, 
    p.nombre::TEXT, -- Cast to TEXT
    COALESCE(p.cargo, 'SOLDADOR')::TEXT as cargo, -- Cast to TEXT
    COALESCE(sa.hora_inicio, '08:00:00'::TIME) as hora_inicio,

    -- Hora Fin Calculation
    COALESCE(
        sa.hora_fin, 
        CASE 
            WHEN (sa.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE = CURRENT_DATE THEN 
                (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::TIME
            ELSE 
                '18:00:00'::TIME
        END
    ) as hora_fin,

    -- Hours Calculation
    ROUND(
        (EXTRACT(EPOCH FROM (
            COALESCE(
                sa.hora_fin, 
                CASE 
                    WHEN (sa.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE = CURRENT_DATE THEN 
                        (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::TIME
                    ELSE 
                        '18:00:00'::TIME
                END
            ) - COALESCE(sa.hora_inicio, '08:00:00'::TIME)
        )) / 3600)::numeric, 
        2
    ) as horas_trabajadas

  FROM soldadores_asignaciones sa
  JOIN cuadrillas c ON sa.cuadrilla_id = c.id
  JOIN personal p ON sa.soldador_rut = p.rut
  LEFT JOIN asistencia_diaria ad ON 
    ad.personal_rut = sa.soldador_rut AND 
    ad.fecha = (sa.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE
  WHERE 
    c.proyecto_id = p_proyecto_id
    AND (sa.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE BETWEEN p_start_date AND p_end_date
    AND (ad.presente IS NULL OR ad.presente = TRUE)
    
  ORDER BY fecha DESC, cuadrilla_nombre, nombre;
END;
$$ LANGUAGE plpgsql;

-- Function to get historical hours per worker/cuadrilla
-- Calculates hours based on assignment duration
-- Excludes days where the worker was marked ABSENT

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
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Date of the record (from assignment or split if spans multiple days? simplified to start date for now)
    (ma.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE as fecha,
    c.nombre as cuadrilla_nombre,
    p.rut,
    p.nombre,
    p.cargo,
    -- Start Time (use created_at or explicitly stored hora_inicio if available/reliable)
    -- We'll use the stored hora_inicio/fin which are TIME columns
    ma.hora_inicio,
    
    -- End Time: If null (still active), use current time if today, or 18:00:00 if past date
    COALESCE(
        ma.hora_fin, 
        CASE 
            WHEN (ma.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE = CURRENT_DATE THEN 
                (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::TIME
            ELSE 
                '18:00:00'::TIME
        END
    ) as hora_fin,

    -- Calculate Hours
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
            ) - ma.hora_inicio
        )) / 3600)::numeric, 
        2
    ) as horas_trabajadas

  FROM maestros_asignaciones ma
  JOIN cuadrillas c ON ma.cuadrilla_id = c.id
  JOIN personal p ON ma.maestro_rut = p.rut
  -- Ensure not absent
  LEFT JOIN asistencia_diaria ad ON 
    ad.personal_rut = ma.maestro_rut AND 
    ad.fecha = (ma.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE
    
  WHERE 
    c.proyecto_id = p_proyecto_id
    AND (ma.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::DATE BETWEEN p_start_date AND p_end_date
    AND ma.activo = false -- Only count completed segments? Or active too? Let's count all.
    -- If active, end time is calculated above.
    
    -- Exclude if absent is explicitly false (which matches 'presente' = false in our schema logic? wait)
    -- In schema: presente is BOOLEAN. TRUE = Present, FALSE = Absent.
    -- So we exclude if ad.presente IS FALSE.
    AND (ad.presente IS NULL OR ad.presente = TRUE)
    
  ORDER BY fecha DESC, cuadrilla_nombre, p.nombre;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- MIGRATION 32: Project Week Configuration
-- Adds project start date and week-end day configuration
-- ===================================================================

-- 1. Add columns to proyectos table
ALTER TABLE proyectos
ADD COLUMN IF NOT EXISTS fecha_inicio_proyecto DATE,
ADD COLUMN IF NOT EXISTS dia_cierre_semanal INTEGER DEFAULT 0; -- 0=Domingo, 6=Sábado

-- 2. Function to calculate project week number
CREATE OR REPLACE FUNCTION calcular_semana_proyecto(
  p_proyecto_id UUID,
  p_fecha DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER AS $$
DECLARE
  v_fecha_inicio DATE;
  v_dias_transcurridos INTEGER;
BEGIN
  -- Get project start date
  SELECT fecha_inicio_proyecto INTO v_fecha_inicio
  FROM proyectos
  WHERE id = p_proyecto_id;
  
  -- If no start date configured, return NULL
  IF v_fecha_inicio IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calculate days elapsed
  v_dias_transcurridos = p_fecha - v_fecha_inicio;
  
  -- If negative (date before project start), return NULL
  IF v_dias_transcurridos < 0 THEN
    RETURN NULL;
  END IF;
  
  -- Week 1 = days 0-6, Week 2 = days 7-13, etc.
  RETURN FLOOR(v_dias_transcurridos / 7) + 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Function to get start date of a specific week
CREATE OR REPLACE FUNCTION fecha_inicio_semana(
  p_proyecto_id UUID,
  p_numero_semana INTEGER
) RETURNS DATE AS $$
DECLARE
  v_fecha_inicio DATE;
BEGIN
  SELECT fecha_inicio_proyecto INTO v_fecha_inicio
  FROM proyectos
  WHERE id = p_proyecto_id;
  
  IF v_fecha_inicio IS NULL OR p_numero_semana < 1 THEN
    RETURN NULL;
  END IF;
  
  -- Week N starts at (N-1) * 7 days from project start
  RETURN v_fecha_inicio + ((p_numero_semana - 1) * 7);
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Function to get end date of a specific week
CREATE OR REPLACE FUNCTION fecha_fin_semana(
  p_proyecto_id UUID,
  p_numero_semana INTEGER
) RETURNS DATE AS $$
BEGIN
  RETURN fecha_inicio_semana(p_proyecto_id, p_numero_semana) + 6;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Helper view for current project week info
CREATE OR REPLACE VIEW view_proyectos_semana_actual AS
SELECT 
  p.id,
  p.nombre,
  p.codigo,
  p.fecha_inicio_proyecto,
  p.dia_cierre_semanal,
  calcular_semana_proyecto(p.id, CURRENT_DATE) as semana_actual,
  CASE 
    WHEN p.fecha_inicio_proyecto IS NOT NULL 
    THEN CURRENT_DATE - p.fecha_inicio_proyecto
    ELSE NULL
  END as dia_proyecto,
  CASE p.dia_cierre_semanal
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Lunes'
    WHEN 2 THEN 'Martes'
    WHEN 3 THEN 'Miércoles'
    WHEN 4 THEN 'Jueves'
    WHEN 5 THEN 'Viernes'
    WHEN 6 THEN 'Sábado'
  END as dia_cierre_nombre
FROM proyectos p;

-- 6. Add comments for documentation
COMMENT ON COLUMN proyectos.fecha_inicio_proyecto IS 'Fecha oficial de inicio del proyecto para cálculo de semanas';
COMMENT ON COLUMN proyectos.dia_cierre_semanal IS 'Día de la semana considerado como cierre semanal (0=Domingo, 6=Sábado)';
COMMENT ON FUNCTION calcular_semana_proyecto IS 'Calcula el número de semana del proyecto basado en fecha_inicio_proyecto';

-- Success message
SELECT 'Migration 32: Project Week Configuration - Completed Successfully' as status;

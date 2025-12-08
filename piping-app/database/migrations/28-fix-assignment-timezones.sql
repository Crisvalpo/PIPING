-- ===================================================================
-- MIGRATION 28: Fix Assignment Timezones
-- Updates assignment RPCs to use 'America/Santiago' time instead of UTC defaults
-- ===================================================================

-- 1. Update asignar_soldador_a_cuadrilla with Timezone Fix
CREATE OR REPLACE FUNCTION asignar_soldador_a_cuadrilla(
    p_soldador_rut VARCHAR(12),
    p_cuadrilla_id UUID,
    p_observaciones TEXT DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_asignacion_id UUID;
    v_exists BOOLEAN;
    v_rut_clean VARCHAR;
    v_shift_id UUID;
    v_proyecto_id UUID;
    v_now_time TIME;
    v_now_date DATE;
BEGIN
    -- Set Timezone Variables
    v_now_time := (now() AT TIME ZONE 'America/Santiago')::TIME;
    v_now_date := (now() AT TIME ZONE 'America/Santiago')::DATE;

    -- 1. Verify if soldador exists in soldadores table
    SELECT EXISTS(SELECT 1 FROM soldadores WHERE rut = p_soldador_rut) INTO v_exists;
    
    -- 2. If shift_id not provided, get default shift for project
    IF p_shift_id IS NULL THEN
        SELECT proyecto_id INTO v_proyecto_id
        FROM cuadrillas
        WHERE id = p_cuadrilla_id;
        
        v_shift_id := get_default_shift(v_proyecto_id);
    ELSE
        v_shift_id := p_shift_id;
    END IF;

    -- 3. If soldador doesn't exist, auto-register
    IF NOT v_exists THEN
        v_rut_clean := REGEXP_REPLACE(p_soldador_rut, '[^0-9Kk]', '', 'g');
        
        INSERT INTO soldadores (rut, estampa, certificacion_actual, observaciones)
        VALUES (
            p_soldador_rut, 
            'S-' || v_rut_clean,
            'PENDIENTE',
            'Auto-registrado al asignar a cuadrilla'
        );
    END IF;

    -- 4. Close existing open session if exists
    UPDATE soldadores_asignaciones
    SET hora_fin = v_now_time
    WHERE soldador_rut = p_soldador_rut 
      AND fecha = v_now_date 
      AND hora_fin IS NULL;
    
    -- 5. Create new assignment with shift and explicit time
    INSERT INTO soldadores_asignaciones (
        soldador_rut, 
        cuadrilla_id, 
        observaciones, 
        shift_id,
        hora_inicio, -- Explicitly set start time
        fecha        -- Explicitly set date
    )
    VALUES (
        p_soldador_rut, 
        p_cuadrilla_id, 
        p_observaciones, 
        v_shift_id,
        v_now_time,
        v_now_date
    )
    RETURNING id INTO v_asignacion_id;
    
    RETURN v_asignacion_id;
EXCEPTION
    WHEN unique_violation THEN
        IF NOT v_exists THEN
            -- Retry logic for auto-register race condition
            v_rut_clean := REGEXP_REPLACE(p_soldador_rut, '[^0-9Kk]', '', 'g');
            INSERT INTO soldadores (rut, estampa, certificacion_actual, observaciones)
            VALUES (
                p_soldador_rut, 
                'S-' || v_rut_clean || '-' || floor(random() * 1000)::text,
                'PENDIENTE',
                'Auto-registrado (retry)'
            );
            
            UPDATE soldadores_asignaciones
            SET hora_fin = v_now_time
            WHERE soldador_rut = p_soldador_rut 
              AND fecha = v_now_date 
              AND hora_fin IS NULL;
            
            INSERT INTO soldadores_asignaciones (soldador_rut, cuadrilla_id, observaciones, shift_id, hora_inicio, fecha)
            VALUES (p_soldador_rut, p_cuadrilla_id, p_observaciones, v_shift_id, v_now_time, v_now_date)
            RETURNING id INTO v_asignacion_id;
            
            RETURN v_asignacion_id;
        ELSE
            RAISE;
        END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Update asignar_maestro_a_cuadrilla with Timezone Fix
CREATE OR REPLACE FUNCTION asignar_maestro_a_cuadrilla(
    p_maestro_rut VARCHAR(12),
    p_cuadrilla_id UUID,
    p_observaciones TEXT DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_asignacion_id UUID;
    v_shift_id UUID;
    v_proyecto_id UUID;
    v_now_time TIME;
    v_now_date DATE;
BEGIN
    -- Set Timezone Variables
    v_now_time := (now() AT TIME ZONE 'America/Santiago')::TIME;
    v_now_date := (now() AT TIME ZONE 'America/Santiago')::DATE;

    -- 1. If shift_id not provided, get default shift for project
    IF p_shift_id IS NULL THEN
        SELECT proyecto_id INTO v_proyecto_id
        FROM cuadrillas
        WHERE id = p_cuadrilla_id;
        
        v_shift_id := get_default_shift(v_proyecto_id);
    ELSE
        v_shift_id := p_shift_id;
    END IF;

    -- 2. Close existing active assignment
    UPDATE maestros_asignaciones
    SET activo = FALSE,
        fecha_desasignacion = v_now_date,
        hora_fin = v_now_time,
        observaciones = COALESCE(observaciones, '') || ' | Movido a otra cuadrilla'
    WHERE maestro_rut = p_maestro_rut 
      AND activo = TRUE;
      
    -- 3. Create new assignment with shift and explicit time
    INSERT INTO maestros_asignaciones (
        maestro_rut, 
        cuadrilla_id, 
        fecha_asignacion, 
        hora_inicio, 
        activo, 
        observaciones,
        shift_id
    )
    VALUES (
        p_maestro_rut, 
        p_cuadrilla_id, 
        v_now_date, 
        v_now_time, 
        TRUE, 
        p_observaciones,
        v_shift_id
    )
    RETURNING id INTO v_asignacion_id;
    
    RETURN v_asignacion_id;
END;
$$ LANGUAGE plpgsql;

SELECT 'Migration 28: Fixed timezone handling for Chilean time (America/Santiago)' as status;

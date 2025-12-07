-- ===================================================================
-- MIGRATION 24: Update Assignment RPCs for Multi-Shift Support
-- Modifies asignar_soldador_a_cuadrilla and asignar_maestro_a_cuadrilla
-- to accept optional shift_id parameter
-- ===================================================================

-- 1. Update asignar_soldador_a_cuadrilla to support shift_id
CREATE OR REPLACE FUNCTION asignar_soldador_a_cuadrilla(
    p_soldador_rut VARCHAR(12),
    p_cuadrilla_id UUID,
    p_observaciones TEXT DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL  -- NEW: Optional shift parameter
)
RETURNS UUID AS $$
DECLARE
    v_asignacion_id UUID;
    v_exists BOOLEAN;
    v_rut_clean VARCHAR;
    v_shift_id UUID;
    v_proyecto_id UUID;
BEGIN
    -- 1. Verify if soldador exists in soldadores table
    SELECT EXISTS(SELECT 1 FROM soldadores WHERE rut = p_soldador_rut) INTO v_exists;
    
    -- 2. If shift_id not provided, get default shift for project
    IF p_shift_id IS NULL THEN
        -- Get proyecto_id from cuadrilla
        SELECT proyecto_id INTO v_proyecto_id
        FROM cuadrillas
        WHERE id = p_cuadrilla_id;
        
        -- Get default shift
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
    SET hora_fin = CURRENT_TIME
    WHERE soldador_rut = p_soldador_rut 
      AND fecha = CURRENT_DATE 
      AND hora_fin IS NULL;
    
    -- 5. Create new assignment with shift
    INSERT INTO soldadores_asignaciones (soldador_rut, cuadrilla_id, observaciones, shift_id)
    VALUES (p_soldador_rut, p_cuadrilla_id, p_observaciones, v_shift_id)
    RETURNING id INTO v_asignacion_id;
    
    RETURN v_asignacion_id;
EXCEPTION
    WHEN unique_violation THEN
        IF NOT v_exists THEN
            v_rut_clean := REGEXP_REPLACE(p_soldador_rut, '[^0-9Kk]', '', 'g');
            INSERT INTO soldadores (rut, estampa, certificacion_actual, observaciones)
            VALUES (
                p_soldador_rut, 
                'S-' || v_rut_clean || '-' || floor(random() * 1000)::text,
                'PENDIENTE',
                'Auto-registrado (retry)'
            );
            
            UPDATE soldadores_asignaciones
            SET hora_fin = CURRENT_TIME
            WHERE soldador_rut = p_soldador_rut 
              AND fecha = CURRENT_DATE 
              AND hora_fin IS NULL;
            
            INSERT INTO soldadores_asignaciones (soldador_rut, cuadrilla_id, observaciones, shift_id)
            VALUES (p_soldador_rut, p_cuadrilla_id, p_observaciones, v_shift_id)
            RETURNING id INTO v_asignacion_id;
            
            RETURN v_asignacion_id;
        ELSE
            RAISE;
        END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Update asignar_maestro_a_cuadrilla to support shift_id  
CREATE OR REPLACE FUNCTION asignar_maestro_a_cuadrilla(
    p_maestro_rut VARCHAR(12),
    p_cuadrilla_id UUID,
    p_observaciones TEXT DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL  -- NEW: Optional shift parameter
)
RETURNS UUID AS $$
DECLARE
    v_asignacion_id UUID;
    v_shift_id UUID;
    v_proyecto_id UUID;
BEGIN
    -- 1. If shift_id not provided, get default shift for project
    IF p_shift_id IS NULL THEN
        -- Get proyecto_id from cuadrilla
        SELECT proyecto_id INTO v_proyecto_id
        FROM cuadrillas
        WHERE id = p_cuadrilla_id;
        
        -- Get default shift
        v_shift_id := get_default_shift(v_proyecto_id);
    ELSE
        v_shift_id := p_shift_id;
    END IF;

    -- 2. Close existing active assignment
    UPDATE maestros_asignaciones
    SET activo = FALSE,
        fecha_desasignacion = CURRENT_DATE,
        hora_fin = CURRENT_TIME,
        observaciones = COALESCE(observaciones, '') || ' | Movido a otra cuadrilla'
    WHERE maestro_rut = p_maestro_rut 
      AND activo = TRUE;
      
    -- 3. Create new assignment with shift
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
        CURRENT_DATE, 
        CURRENT_TIME, 
        TRUE, 
        p_observaciones,
        v_shift_id
    )
    RETURNING id INTO v_asignacion_id;
    
    RETURN v_asignacion_id;
END;
$$ LANGUAGE plpgsql;

SELECT 'Migration 24: Updated assignment RPCs for multi-shift support' as status;

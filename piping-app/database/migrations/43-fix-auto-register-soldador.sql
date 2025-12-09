-- ===================================================================
-- MIGRATION 43: Fix auto-register soldador without bad estampa
-- ===================================================================
-- Previously, when a soldador was assigned to a cuadrilla but didn't exist
-- in the soldadores table, the system auto-registered them with an invalid
-- estampa format like 'S-' + cleaned RUT.
--
-- This migration fixes the function to NOT auto-generate estampa.
-- The estampa should be assigned properly via the personal management UI.
-- ===================================================================

-- Update asignar_soldador_a_cuadrilla to NOT auto-generate estampa
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

    -- 3. If soldador doesn't exist in soldadores table, auto-register WITHOUT estampa
    --    The estampa will be assigned later via the execution report modal
    IF NOT v_exists THEN
        INSERT INTO soldadores (rut, estampa, certificacion_actual, observaciones)
        VALUES (
            p_soldador_rut, 
            NULL,  -- No auto-generate estampa
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
        hora_inicio,
        fecha
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
            INSERT INTO soldadores (rut, estampa, certificacion_actual, observaciones)
            VALUES (
                p_soldador_rut, 
                NULL,  -- No auto-generate estampa
                'PENDIENTE',
                'Auto-registrado (retry)'
            )
            ON CONFLICT (rut) DO NOTHING;
            
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

SELECT 'Migration 43: Fixed auto-register to NOT generate invalid estampa' as status;

-- ===================================================================
-- PASO 15: Fix Asignación Soldador (Auto-registro en tabla soldadores)
-- ===================================================================

CREATE OR REPLACE FUNCTION asignar_soldador_a_cuadrilla(
    p_soldador_rut VARCHAR(12),
    p_cuadrilla_id UUID,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_asignacion_id UUID;
    v_exists BOOLEAN;
    v_rut_clean VARCHAR;
BEGIN
    -- 1. Verificar si el soldador existe en la tabla soldadores
    SELECT EXISTS(SELECT 1 FROM soldadores WHERE rut = p_soldador_rut) INTO v_exists;

    -- 2. Si no existe, insertarlo automáticamente (Auto-register)
    IF NOT v_exists THEN
        -- Limpiar RUT para usar como estampa base (quitar puntos y guión)
        v_rut_clean := REGEXP_REPLACE(p_soldador_rut, '[^0-9Kk]', '', 'g');
        
        -- Insertar en soldadores con estampa generada
        INSERT INTO soldadores (rut, estampa, certificacion_actual, observaciones)
        VALUES (
            p_soldador_rut, 
            'S-' || v_rut_clean, -- Estampa generada: S-12345678K
            'PENDIENTE',
            'Auto-registrado al asignar a cuadrilla'
        );
    END IF;

    -- 3. Cerrar sesión abierta si existe (lógica existente)
    UPDATE soldadores_asignaciones
    SET hora_fin = CURRENT_TIME
    WHERE soldador_rut = p_soldador_rut 
      AND fecha = CURRENT_DATE 
      AND hora_fin IS NULL;
    
    -- 4. Crear nueva asignación
    INSERT INTO soldadores_asignaciones (soldador_rut, cuadrilla_id, observaciones)
    VALUES (p_soldador_rut, p_cuadrilla_id, p_observaciones)
    RETURNING id INTO v_asignacion_id;
    
    RETURN v_asignacion_id;
EXCEPTION
    WHEN unique_violation THEN
        -- Si falla por estampa duplicada (raro pero posible), intentar con sufijo random
        IF NOT v_exists THEN
            v_rut_clean := REGEXP_REPLACE(p_soldador_rut, '[^0-9Kk]', '', 'g');
            INSERT INTO soldadores (rut, estampa, certificacion_actual, observaciones)
            VALUES (
                p_soldador_rut, 
                'S-' || v_rut_clean || '-' || floor(random() * 1000)::text,
                'PENDIENTE',
                'Auto-registrado (retry)'
            );
            
            -- Reintentar asignación
            UPDATE soldadores_asignaciones
            SET hora_fin = CURRENT_TIME
            WHERE soldador_rut = p_soldador_rut 
              AND fecha = CURRENT_DATE 
              AND hora_fin IS NULL;
            
            INSERT INTO soldadores_asignaciones (soldador_rut, cuadrilla_id, observaciones)
            VALUES (p_soldador_rut, p_cuadrilla_id, p_observaciones)
            RETURNING id INTO v_asignacion_id;
            
            RETURN v_asignacion_id;
        ELSE
            RAISE;
        END IF;
END;
$$ LANGUAGE plpgsql;

SELECT 'Función asignar_soldador_a_cuadrilla actualizada con auto-registro' as status;

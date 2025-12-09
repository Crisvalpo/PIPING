-- ===================================================================
-- Migration 40: Functions for Execution Personnel (FIXED v4)
-- ===================================================================
-- Creates functions to get capataces and soldadores for execution reporting
-- Based on personal table with cargo field containing role names
-- ===================================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_capataces_by_proyecto(UUID);
DROP FUNCTION IF EXISTS get_soldadores_by_cuadrilla(UUID);
DROP FUNCTION IF EXISTS get_all_soldadores_by_proyecto(UUID);

-- Function: Get all capataces from a project
-- Capataces are: personal with cargo containing 'CAPATAZ'
CREATE OR REPLACE FUNCTION get_capataces_by_proyecto(p_proyecto_id UUID)
RETURNS TABLE (
    rut TEXT,
    nombre TEXT,
    codigo_trabajador TEXT,
    cargo TEXT,
    cuadrilla_id UUID,
    cuadrilla_nombre TEXT,
    cuadrilla_codigo TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.rut::TEXT,
        p.nombre::TEXT,
        p.codigo_trabajador::TEXT,
        p.cargo::TEXT,
        c.id as cuadrilla_id,
        c.nombre::TEXT as cuadrilla_nombre,
        c.codigo::TEXT as cuadrilla_codigo
    FROM personal p
    LEFT JOIN cuadrillas c ON c.capataz_rut = p.rut AND c.active = TRUE
    WHERE p.proyecto_id = p_proyecto_id
      AND p.activo = TRUE
      AND UPPER(p.cargo) LIKE '%CAPATAZ%'
    ORDER BY p.nombre;
END;
$$ LANGUAGE plpgsql;

-- Function: Get soldadores assigned to a specific cuadrilla
CREATE OR REPLACE FUNCTION get_soldadores_by_cuadrilla(p_cuadrilla_id UUID)
RETURNS TABLE (
    rut TEXT,
    nombre TEXT,
    codigo_trabajador TEXT,
    cargo TEXT,
    estampa TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Get soldadores from soldadores_asignaciones (daily assignments)
    SELECT DISTINCT
        p.rut::TEXT,
        p.nombre::TEXT,
        p.codigo_trabajador::TEXT,
        p.cargo::TEXT,
        s.estampa::TEXT
    FROM soldadores_asignaciones sa
    JOIN personal p ON sa.soldador_rut = p.rut
    LEFT JOIN soldadores s ON sa.soldador_rut = s.rut
    WHERE sa.cuadrilla_id = p_cuadrilla_id
      AND sa.fecha = CURRENT_DATE
      AND sa.hora_fin IS NULL
    
    UNION
    
    -- Also include maestros with SOLDADOR in cargo
    SELECT DISTINCT
        p.rut::TEXT,
        p.nombre::TEXT,
        p.codigo_trabajador::TEXT,
        p.cargo::TEXT,
        s.estampa::TEXT
    FROM maestros_asignaciones ma
    JOIN personal p ON ma.maestro_rut = p.rut
    LEFT JOIN soldadores s ON ma.maestro_rut = s.rut
    WHERE ma.cuadrilla_id = p_cuadrilla_id
      AND ma.activo = TRUE
      AND UPPER(p.cargo) LIKE '%SOLDADOR%'
    
    ORDER BY nombre;
END;
$$ LANGUAGE plpgsql;

-- Function: Get all soldadores from a project
-- Soldadores are: personal with cargo containing 'SOLDADOR'
CREATE OR REPLACE FUNCTION get_all_soldadores_by_proyecto(p_proyecto_id UUID)
RETURNS TABLE (
    rut TEXT,
    nombre TEXT,
    codigo_trabajador TEXT,
    cargo TEXT,
    estampa TEXT,
    cuadrilla_id UUID,
    cuadrilla_nombre TEXT,
    cuadrilla_codigo TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- All personal with SOLDADOR in cargo, with their cuadrilla if assigned
    SELECT DISTINCT
        p.rut::TEXT,
        p.nombre::TEXT,
        p.codigo_trabajador::TEXT,
        p.cargo::TEXT,
        s.estampa::TEXT,
        ma.cuadrilla_id,
        c.nombre::TEXT as cuadrilla_nombre,
        c.codigo::TEXT as cuadrilla_codigo
    FROM personal p
    LEFT JOIN soldadores s ON p.rut = s.rut
    LEFT JOIN maestros_asignaciones ma ON p.rut = ma.maestro_rut AND ma.activo = TRUE
    LEFT JOIN cuadrillas c ON ma.cuadrilla_id = c.id AND c.active = TRUE
    WHERE p.proyecto_id = p_proyecto_id
      AND p.activo = TRUE
      AND UPPER(p.cargo) LIKE '%SOLDADOR%'
    ORDER BY cuadrilla_nombre NULLS LAST, nombre;
END;
$$ LANGUAGE plpgsql;

-- Verify functions were created
SELECT 'Funciones de personal para ejecución creadas exitosamente (v4)' as status;

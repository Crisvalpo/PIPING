-- ===================================================================
-- MIGRATION 29: Update cuadrillas_full to sync implicit supervisor
-- If cuadrilla.supervisor_rut is NULL, use capataz.jefe_directo_rut
-- ===================================================================

-- Drop existing view
DROP VIEW IF EXISTS cuadrillas_full CASCADE;

-- Recreate view with implicit supervisor fallback
CREATE OR REPLACE VIEW cuadrillas_full AS
SELECT 
    c.id,
    c.proyecto_id,
    c.nombre,
    c.codigo,
    c.descripcion,
    c.tipo,
    -- Use stored supervisor OR fallback to Capataz's boss
    COALESCE(c.supervisor_rut, cap.jefe_directo_rut) as supervisor_rut,
    c.capataz_rut,
    c.shift_id,
    c.active AS activo,
    c.created_at,
    c.updated_at,
    
    -- Supervisor details (Join on the resolving RUT)
    sup.nombre AS supervisor_nombre,
    sup.email AS supervisor_email,
    
    -- Capataz details
    cap.nombre AS capataz_nombre,
    cap.email AS capataz_email,
    
    -- Active maestros (JSON aggregation)
    COALESCE(
        (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
                'rut', p.rut,
                'nombre', p.nombre,
                'cargo', p.cargo,
                'email', p.email,
                'fecha_asignacion', ma.created_at,
                'tipo', 'maestro'
            )
        )
        FROM maestros_asignaciones ma
        JOIN personal p ON p.rut = ma.maestro_rut
       WHERE ma.cuadrilla_id = c.id
            AND ma.activo = true
        ),
        '[]'::json
    ) AS maestros,
    
    -- Active soldadores (JSON aggregation)
    COALESCE(
        (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
                'rut', p.rut,
                'nombre', p.nombre,
                'cargo', p.cargo,
                'email', p.email,
                'fecha_asignacion', sa.created_at,
                'tipo', 'soldador'
            )
        )
        FROM soldadores_asignaciones sa
        JOIN personal p ON p.rut = sa.soldador_rut
        WHERE sa.cuadrilla_id = c.id
            AND sa.fecha = CURRENT_DATE
            AND sa.hora_fin IS NULL
        ),
        '[]'::json
    ) AS soldadores,
    
    -- Total member count
    (
        SELECT COUNT(*)
        FROM (
            SELECT ma.maestro_rut AS rut
            FROM maestros_asignaciones ma
            WHERE ma.cuadrilla_id = c.id AND ma.activo = true
            
            UNION
            
            SELECT sa.soldador_rut AS rut
            FROM soldadores_asignaciones sa
            WHERE sa.cuadrilla_id = c.id
                AND sa.fecha = CURRENT_DATE
                AND sa.hora_fin IS NULL
        ) workers
    ) AS total_members
    
FROM cuadrillas c
LEFT JOIN personal cap ON cap.rut = c.capataz_rut
LEFT JOIN personal sup ON sup.rut = COALESCE(c.supervisor_rut, cap.jefe_directo_rut)
ORDER BY c.codigo;

-- Grant permissions
GRANT SELECT ON cuadrillas_full TO authenticated;

SELECT 'Migration 29: cuadrillas_full view updated with implicit supervisor sync' as status;

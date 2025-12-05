-- ===================================================================
-- PASO 5: Crear Vista Cuadrillas Full (ACTUALIZADA)
-- ===================================================================

DROP VIEW IF EXISTS cuadrillas_full;

CREATE VIEW cuadrillas_full AS
SELECT 
    c.id,
    c.proyecto_id,
    c.nombre,
    c.codigo,
    c.descripcion,
    c.tipo,
    c.supervisor_rut,
    c.capataz_rut,
    c.active as activo,
    c.created_at,
    c.updated_at,
    
    COUNT(*) FILTER (WHERE cm.role = 'SOLDADOR') as soldadores_count,
    COUNT(*) FILTER (WHERE cm.role = 'CAPATAZ') as capataces_count,
    COUNT(*) FILTER (WHERE cm.role = 'MAESTRO') as maestros_count,
    COUNT(cm.id) as total_members,
    
    CASE 
        WHEN COUNT(cm.id) > 0 THEN
            ARRAY_AGG(
                jsonb_build_object(
                    'rut', cm.rut,
                    'nombre', p.nombre,
                    'email', p.email,
                    'rol', cm.role,
                    'estampa', s.estampa,
                    'certificacion', s.certificacion_actual
                ) ORDER BY cm.role, p.nombre
            )
        ELSE
            ARRAY[]::jsonb[]
    END as members
    
FROM cuadrillas c
LEFT JOIN cuadrilla_members cm ON c.id = cm.cuadrilla_id
LEFT JOIN personal p ON cm.rut = p.rut
LEFT JOIN soldadores s ON cm.rut = s.rut
GROUP BY c.id;

SELECT 'Vista cuadrillas_full creada' as status;

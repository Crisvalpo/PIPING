-- ===================================================================
-- Migration 38: Add codigo_trabajador to cuadrillas_full view
-- ===================================================================
-- Actualiza la vista cuadrillas_full para incluir el código del trabajador
-- en los datos de miembros (maestros y soldadores)
-- ===================================================================

-- Eliminar vista existente
DROP VIEW IF EXISTS cuadrillas_full;

CREATE VIEW cuadrillas_full AS
WITH maestros_agg AS (
    SELECT 
        ma.cuadrilla_id,
        count(*) as count,
        jsonb_agg(
            jsonb_build_object(
                'rut', ma.maestro_rut,
                'nombre', p.nombre,
                'email', p.email,
                'cargo', p.cargo,
                'codigo', p.codigo_trabajador,
                'rol', 'MAESTRO',
                'fecha_asignacion', ma.fecha_asignacion,
                'tipo_asignacion', 'ESTABLE'
            )
        ) as members
    FROM maestros_asignaciones ma
    JOIN personal p ON ma.maestro_rut = p.rut
    WHERE ma.activo = TRUE
    GROUP BY ma.cuadrilla_id
),
soldadores_agg AS (
    SELECT 
        sa.cuadrilla_id,
        count(*) as count,
        jsonb_agg(
            jsonb_build_object(
                'rut', sa.soldador_rut,
                'nombre', p.nombre,
                'email', p.email,
                'cargo', p.cargo,
                'codigo', COALESCE(s.estampa, p.codigo_trabajador),
                'estampa', s.estampa,
                'rol', 'SOLDADOR',
                'certificacion', s.certificacion_actual,
                'fecha', sa.fecha,
                'hora_inicio', sa.hora_inicio,
                'tipo_asignacion', 'FLEXIBLE'
            )
        ) as members
    FROM soldadores_asignaciones sa
    JOIN personal p ON sa.soldador_rut = p.rut
    LEFT JOIN soldadores s ON sa.soldador_rut = s.rut
    WHERE sa.fecha = CURRENT_DATE AND sa.hora_fin IS NULL
    GROUP BY sa.cuadrilla_id
)
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
    c.created_by,
    
    -- Shift info
    c.shift_id,
    sh.name as shift_name,
    sh.start_time as shift_start_time,
    sh.end_time as shift_end_time,
    
    -- Datos del supervisor
    sup.nombre as supervisor_nombre,
    sup.email as supervisor_email,
    
    -- Datos del capataz
    cap.nombre as capataz_nombre,
    cap.email as capataz_email,
    
    -- Contadores
    COALESCE(sa.count, 0) as soldadores_activos_count,
    COALESCE(ma.count, 0) as maestros_activos_count,
    (COALESCE(sa.count, 0) + COALESCE(ma.count, 0)) as total_members,
    
    -- Arrays de miembros
    COALESCE(ma.members, '[]'::jsonb) as maestros,
    COALESCE(sa.members, '[]'::jsonb) as soldadores,
    
    -- Array combinado (concatenación de JSONB arrays)
    (COALESCE(ma.members, '[]'::jsonb) || COALESCE(sa.members, '[]'::jsonb)) as members
    
FROM cuadrillas c
LEFT JOIN work_shifts sh ON c.shift_id = sh.id
LEFT JOIN personal sup ON c.supervisor_rut = sup.rut
LEFT JOIN personal cap ON c.capataz_rut = cap.rut
LEFT JOIN maestros_agg ma ON c.id = ma.cuadrilla_id
LEFT JOIN soldadores_agg sa ON c.id = sa.cuadrilla_id;

-- Verificar que la vista se creó correctamente
SELECT 'Vista cuadrillas_full actualizada con codigo_trabajador' as status;

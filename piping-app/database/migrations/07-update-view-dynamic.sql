-- Reemplazar la vista 'cuadrillas_full' para agregar soporte
-- a las nuevas tablas de asignaciones dinámicas (soldadores_asignaciones, maestros_asignaciones)

DROP VIEW IF EXISTS cuadrillas_full;

CREATE VIEW cuadrillas_full AS
WITH soldadores_activos AS (
    SELECT 
        sa.cuadrilla_id,
        sa.soldador_rut as rut,
        p.nombre,
        p.email,
        'SOLDADOR' as role,
        s.estampa,
        s.certificacion_actual,
        sa.fecha as fecha_asignacion
    FROM soldadores_asignaciones sa
    JOIN personal p ON sa.soldador_rut = p.rut
    LEFT JOIN soldadores s ON sa.soldador_rut = s.rut
    WHERE sa.fecha = CURRENT_DATE 
    AND sa.hora_fin IS NULL
),
maestros_activos AS (
    SELECT 
        ma.cuadrilla_id,
        ma.maestro_rut as rut,
        p.nombre,
        p.email,
        'MAESTRO' as role,
        NULL::text as estampa,
        NULL::text as certificacion_actual,
        ma.created_at as fecha_asignacion
    FROM maestros_asignaciones ma
    JOIN personal p ON ma.maestro_rut = p.rut
    WHERE ma.activo = true
),
supervisores_capataces AS (
    SELECT 
        c.id as cuadrilla_id,
        c.supervisor_rut,
        ps.nombre as supervisor_nombre,
        ps.email as supervisor_email,
        c.capataz_rut,
        pc.nombre as capataz_nombre,
        pc.email as capataz_email
    FROM cuadrillas c
    LEFT JOIN personal ps ON c.supervisor_rut = ps.rut
    LEFT JOIN personal pc ON c.capataz_rut = pc.rut
)
SELECT 
    c.id,
    c.proyecto_id,
    c.nombre,
    c.codigo,
    c.descripcion,
    c.tipo,
    c.active as activo,
    c.created_at,
    c.updated_at,
    
    -- Info Supervisor y Capataz
    sc.supervisor_rut,
    sc.supervisor_nombre,
    sc.supervisor_email,
    sc.capataz_rut,
    sc.capataz_nombre,
    sc.capataz_email,
    
    -- Agregaciones de Soldadores
    (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'rut', sa.rut,
                'nombre', sa.nombre,
                'email', sa.email,
                'rol', sa.role,
                'estampa', sa.estampa,
                'certificacion', sa.certificacion_actual,
                'tipo_asignacion', 'FLEXIBLE'
            ) ORDER BY sa.nombre
        ), '[]'::jsonb)
        FROM soldadores_activos sa
        WHERE sa.cuadrilla_id = c.id
    ) as soldadores,
    
    -- Agregaciones de Maestros
    (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'rut', ma.rut,
                'nombre', ma.nombre,
                'email', ma.email,
                'rol', ma.role,
                'tipo_asignacion', 'ESTABLE'
            ) ORDER BY ma.nombre
        ), '[]'::jsonb)
        FROM maestros_activos ma
        WHERE ma.cuadrilla_id = c.id
    ) as maestros,

    -- Totales
    (
        COALESCE((SELECT COUNT(*) FROM soldadores_activos sa WHERE sa.cuadrilla_id = c.id), 0) +
        COALESCE((SELECT COUNT(*) FROM maestros_activos ma WHERE ma.cuadrilla_id = c.id), 0) +
        (CASE WHEN c.supervisor_rut IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN c.capataz_rut IS NOT NULL THEN 1 ELSE 0 END)
    ) as total_members
    
FROM cuadrillas c
LEFT JOIN supervisores_capataces sc ON c.id = sc.cuadrilla_id;

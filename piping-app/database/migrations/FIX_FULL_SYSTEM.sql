-- ===================================================================
-- SCRIPT DE REPARACIÓN COMPLETA DEL SISTEMA DE CUADRILLAS
-- Ejecuta todo este script en el editor SQL de Supabase
-- ===================================================================

-- 1. CREAR TABLAS DE ASIGNACIONES (Si no existen)
CREATE TABLE IF NOT EXISTS maestros_asignaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maestro_rut VARCHAR(12) NOT NULL REFERENCES personal(rut) ON DELETE CASCADE,
    cuadrilla_id UUID NOT NULL REFERENCES cuadrillas(id) ON DELETE CASCADE,
    fecha_asignacion DATE DEFAULT CURRENT_DATE,
    fecha_desasignacion DATE,
    activo BOOLEAN DEFAULT TRUE,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_maestro_activo 
ON maestros_asignaciones(maestro_rut) 
WHERE activo = TRUE;

CREATE TABLE IF NOT EXISTS soldadores_asignaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    soldador_rut VARCHAR(12) NOT NULL REFERENCES soldadores(rut) ON DELETE CASCADE,
    cuadrilla_id UUID NOT NULL REFERENCES cuadrillas(id) ON DELETE CASCADE,
    fecha DATE DEFAULT CURRENT_DATE,
    hora_inicio TIME DEFAULT CURRENT_TIME,
    hora_fin TIME,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_horas CHECK (hora_fin IS NULL OR hora_fin >= hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_maestros_cuadrilla ON maestros_asignaciones(cuadrilla_id) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_soldadores_cuadrilla ON soldadores_asignaciones(cuadrilla_id, fecha);
CREATE INDEX IF NOT EXISTS idx_soldadores_activos ON soldadores_asignaciones(soldador_rut, fecha) WHERE hora_fin IS NULL;

-- 2. CREAR FUNCIONES DE LÓGICA DE NEGOCIO
CREATE OR REPLACE FUNCTION asignar_soldador_a_cuadrilla(
    p_soldador_rut VARCHAR(12),
    p_cuadrilla_id UUID,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_asignacion_id UUID;
BEGIN
    -- Cerrar sesión abierta si existe
    UPDATE soldadores_asignaciones
    SET hora_fin = CURRENT_TIME
    WHERE soldador_rut = p_soldador_rut 
      AND fecha = CURRENT_DATE 
      AND hora_fin IS NULL;
    
    -- Crear nueva asignación
    INSERT INTO soldadores_asignaciones (soldador_rut, cuadrilla_id, observaciones)
    VALUES (p_soldador_rut, p_cuadrilla_id, p_observaciones)
    RETURNING id INTO v_asignacion_id;
    
    RETURN v_asignacion_id;
END;
$$ LANGUAGE plpgsql;

-- 3. RECREAR VISTA CUADRILLAS_FULL (Usando las tablas nuevas)
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

SELECT 'Base de datos reparada exitosamente' as status;

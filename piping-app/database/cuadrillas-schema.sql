-- ======================================================
-- MÓDULO: Gestión de Cuadrillas (Work Crews)
-- ======================================================
-- Permite crear cuadrillas de trabajo con soldadores y capataces
-- para asignarlos fácilmente a las ejecuciones
-- ======================================================

-- 1. Tabla de Cuadrillas
CREATE TABLE IF NOT EXISTS cuadrillas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    
    -- Información básica
    nombre TEXT NOT NULL,
    codigo TEXT NOT NULL, -- ej: "CUAD-001"
    descripcion TEXT,
    
    -- Estado
    activo BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: código único por proyecto
    UNIQUE(proyecto_id, codigo)
);

-- 2. Tabla de Miembros de Cuadrilla
CREATE TABLE IF NOT EXISTS cuadrilla_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cuadrilla_id UUID NOT NULL REFERENCES cuadrillas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Rol en la cuadrilla
    rol TEXT NOT NULL CHECK (rol IN ('SOLDADOR', 'CAPATAZ', 'AYUDANTE')),
    
    -- Estado
    activo BOOLEAN DEFAULT TRUE,
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    fecha_salida DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: un usuario solo puede estar una vez en una cuadrilla activa
    UNIQUE(cuadrilla_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cuadrillas_proyecto ON cuadrillas(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_cuadrillas_activo ON cuadrillas(activo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_cuadrilla_members_cuadrilla ON cuadrilla_members(cuadrilla_id);
CREATE INDEX IF NOT EXISTS idx_cuadrilla_members_user ON cuadrilla_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cuadrilla_members_rol ON cuadrilla_members(rol);

-- 3. Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_cuadrillas_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cuadrillas_timestamp
    BEFORE UPDATE ON cuadrillas
    FOR EACH ROW
    EXECUTE FUNCTION update_cuadrillas_timestamp();

-- 4. Vista con información completa de cuadrillas
CREATE OR REPLACE VIEW cuadrillas_full AS
SELECT 
    c.id,
    c.proyecto_id,
    c.nombre,
    c.codigo,
    c.descripcion,
    c.activo,
    c.created_at,
    c.updated_at,
    
    -- Conteo de miembros por rol
    COUNT(*) FILTER (WHERE cm.rol = 'SOLDADOR' AND cm.activo = TRUE) as soldadores_count,
    COUNT(*) FILTER (WHERE cm.rol = 'CAPATAZ' AND cm.activo = TRUE) as capataces_count,
    COUNT(*) FILTER (WHERE cm.rol = 'AYUDANTE' AND cm.activo = TRUE) as ayudantes_count,
    COUNT(*) FILTER (WHERE cm.activo = TRUE) as total_members,
    
    -- Arrays de miembros
    ARRAY_AGG(
        DISTINCT jsonb_build_object(
            'user_id', cm.user_id,
            'email', u.email,
            'nombre', u.raw_user_meta_data->>'full_name',
            'rol', cm.rol,
            'activo', cm.activo
        ) ORDER BY cm.rol, u.email
    ) FILTER (WHERE cm.id IS NOT NULL) as members
    
FROM cuadrillas c
LEFT JOIN cuadrilla_members cm ON c.id = cm.cuadrilla_id
LEFT JOIN auth.users u ON cm.user_id = u.id
GROUP BY c.id, c.proyecto_id, c.nombre, c.codigo, c.descripcion, c.activo, c.created_at, c.updated_at;

-- 5. Vista de miembros con información completa
CREATE OR REPLACE VIEW cuadrilla_members_full AS
SELECT 
    cm.id,
    cm.cuadrilla_id,
    cm.user_id,
    cm.rol,
    cm.activo,
    cm.fecha_ingreso,
    cm.fecha_salida,
    
    -- Info de usuario
    u.email,
    u.raw_user_meta_data->>'full_name' as nombre_completo,
    u.raw_user_meta_data->>'phone' as telefono,
    
    -- Info de cuadrilla
    c.nombre as cuadrilla_nombre,
    c.codigo as cuadrilla_codigo,
    c.proyecto_id
    
FROM cuadrilla_members cm
JOIN auth.users u ON cm.user_id = u.id
JOIN cuadrillas c ON cm.cuadrilla_id = c.id;

-- 6. Función para agregar miembro a cuadrilla
CREATE OR REPLACE FUNCTION add_member_to_cuadrilla(
    p_cuadrilla_id UUID,
    p_user_id UUID,
    p_rol TEXT
)
RETURNS UUID AS $$
DECLARE
    v_member_id UUID;
BEGIN
    -- Validar que el rol sea válido
    IF p_rol NOT IN ('SOLDADOR', 'CAPATAZ', 'AYUDANTE') THEN
        RAISE EXCEPTION 'Rol inválido: %. Debe ser SOLDADOR, CAPATAZ o AYUDANTE', p_rol;
    END IF;
    
    -- Insertar miembro
    INSERT INTO cuadrilla_members (cuadrilla_id, user_id, rol)
    VALUES (p_cuadrilla_id, p_user_id, p_rol)
    RETURNING id INTO v_member_id;
    
    RETURN v_member_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Función para remover miembro de cuadrilla (soft delete)
CREATE OR REPLACE FUNCTION remove_member_from_cuadrilla(
    p_member_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE cuadrilla_members
    SET 
        activo = FALSE,
        fecha_salida = CURRENT_DATE
    WHERE id = p_member_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Miembro no encontrado';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Función para obtener soldadores de un proyecto
CREATE OR REPLACE FUNCTION get_soldadores_by_proyecto(p_proyecto_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    nombre_completo TEXT,
    cuadrilla_nombre TEXT,
    cuadrilla_codigo TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cmf.user_id,
        cmf.email,
        cmf.nombre_completo,
        cmf.cuadrilla_nombre,
        cmf.cuadrilla_codigo
    FROM cuadrilla_members_full cmf
    WHERE cmf.proyecto_id = p_proyecto_id
      AND cmf.rol = 'SOLDADOR'
      AND cmf.activo = TRUE
    ORDER BY cmf.nombre_completo;
END;
$$ LANGUAGE plpgsql;

-- 9. Función para obtener capataces de un proyecto
CREATE OR REPLACE FUNCTION get_capataces_by_proyecto(p_proyecto_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    nombre_completo TEXT,
    cuadrilla_nombre TEXT,
    cuadrilla_codigo TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cmf.user_id,
        cmf.email,
        cmf.nombre_completo,
        cmf.cuadrilla_nombre,
        cmf.cuadrilla_codigo
    FROM cuadrilla_members_full cmf
    WHERE cmf.proyecto_id = p_proyecto_id
      AND cmf.rol = 'CAPATAZ'
      AND cmf.activo = TRUE
    ORDER BY cmf.nombre_completo;
END;
$$ LANGUAGE plpgsql;

-- Comentarios de documentación
COMMENT ON TABLE cuadrillas IS 'Cuadrillas de trabajo para el proyecto';
COMMENT ON TABLE cuadrilla_members IS 'Miembros de las cuadrillas con sus roles';
COMMENT ON COLUMN cuadrilla_members.rol IS 'SOLDADOR, CAPATAZ o AYUDANTE';
COMMENT ON VIEW cuadrillas_full IS 'Vista completa de cuadrillas con conteo de miembros';
COMMENT ON VIEW cuadrilla_members_full IS 'Vista completa de miembros con información de usuario y cuadrilla';

-- ======================================================
-- DATOS DE EJEMPLO (OPCIONAL - Para Testing)
-- ======================================================

-- Ejemplo de uso:

-- 1. Crear una cuadrilla:
-- INSERT INTO cuadrillas (proyecto_id, nombre, codigo, descripcion)
-- VALUES ('proyecto-uuid', 'Cuadrilla A', 'CUAD-A', 'Cuadrilla principal de soldadura');

-- 2. Agregar miembros:
-- SELECT add_member_to_cuadrilla(
--     'cuadrilla-uuid',
--     'user-uuid',
--     'SOLDADOR'
-- );

-- 3. Ver cuadrillas con miembros:
-- SELECT * FROM cuadrillas_full WHERE proyecto_id = 'proyecto-uuid';

-- 4. Ver soldadores disponibles:
-- SELECT * FROM get_soldadores_by_proyecto('proyecto-uuid');

-- 5. Ver capataces disponibles:
-- SELECT * FROM get_capataces_by_proyecto('proyecto-uuid');

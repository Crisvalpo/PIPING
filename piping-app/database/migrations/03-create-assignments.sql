-- ===================================================================
-- PASO 3: Crear Tablas de Asignaciones
-- ===================================================================

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

-- Crear índice único con filtro (no se puede hacer dentro de CREATE TABLE)
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

SELECT 'Tablas de asignaciones creadas' as status;

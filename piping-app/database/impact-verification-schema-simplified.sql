-- ==============================================================================
-- IMPACT VERIFICATION MODULE - SCHEMA SIMPLIFICADO
-- Compatible con estructura actual de base de datos
-- ==============================================================================

-- 1. TABLA DE IMPACTOS DETECTADOS
-- Registra todos los cambios detectados entre revisiones
CREATE TABLE IF NOT EXISTS revision_impacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    new_revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    old_revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    
    -- Tipo de impacto (ej: WELD_ADDED, WELD_REMOVED, MTO_INCREASED)
    impact_type TEXT NOT NULL,
    
    -- Tipo de entidad afectada (WELD, MTO, BOLTED_JOINT, SPOOL)
    entity_type TEXT NOT NULL,
    
    -- ID del elemento específico afectado (puede ser NULL si es un cambio general)
    entity_id UUID,
    
    -- Valores anterior y nuevo (JSONB para flexibilidad)
    old_value JSONB,
    new_value JSONB,
    
    -- Descripción del impacto
    impact_summary TEXT,
    
    -- Si este impacto bloquea la migración automática
    is_blocking BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para búsqueda rápida
    CONSTRAINT valid_impact_type CHECK (impact_type IN (
        'WELD_ADDED', 'WELD_REMOVED', 'WELD_MODIFIED',
        'MTO_INCREASED', 'MTO_DECREASED', 'MTO_ITEM_ADDED', 'MTO_ITEM_REMOVED',
        'BOLTED_JOINT_ADDED', 'BOLTED_JOINT_REMOVED', 'BOLTED_JOINT_MODIFIED',
        'SPOOL_ADDED', 'SPOOL_REMOVED'
    ))
);

CREATE INDEX IF NOT EXISTS idx_revision_impacts_new_revision ON revision_impacts(new_revision_id);
CREATE INDEX IF NOT EXISTS idx_revision_impacts_old_revision ON revision_impacts(old_revision_id);
CREATE INDEX IF NOT EXISTS idx_revision_impacts_type ON revision_impacts(impact_type);
CREATE INDEX IF NOT EXISTS idx_revision_impacts_blocking ON revision_impacts(is_blocking) WHERE is_blocking = TRUE;

-- 2. LOG DE MIGRACIONES APROBADAS
-- Auditoría de aprobaciones de migración de impactos
CREATE TABLE IF NOT EXISTS impact_migration_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    impact_id UUID REFERENCES revision_impacts(id) ON DELETE SET NULL,
    
    migration_approved BOOLEAN NOT NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migration_log_approved_by ON impact_migration_log(approved_by);
CREATE INDEX IF NOT EXISTS idx_migration_log_approved_at ON impact_migration_log(approved_at);

-- 3. TABLA DE CUADRILLAS (EQUIPOS DE TRABAJO)
-- Gestión de equipos de trabajo por proyecto
CREATE TABLE IF NOT EXISTS cuadrillas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    
    nombre TEXT NOT NULL,
    tipo TEXT DEFAULT 'PRINCIPAL', -- PRINCIPAL, SECUNDARIA
    
    -- Jerarquía del equipo
    supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    capataz_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT valid_cuadrilla_tipo CHECK (tipo IN ('PRINCIPAL', 'SECUNDARIA')),
    UNIQUE(proyecto_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_cuadrillas_proyecto ON cuadrillas(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_cuadrillas_supervisor ON cuadrillas(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_cuadrillas_capataz ON cuadrillas(capataz_id);
CREATE INDEX IF NOT EXISTS idx_cuadrillas_active ON cuadrillas(active) WHERE active = TRUE;

-- 4. MIEMBROS DE CUADRILLA
-- Asignación de trabajadores a equipos con roles
CREATE TABLE IF NOT EXISTS cuadrilla_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cuadrilla_id UUID NOT NULL REFERENCES cuadrillas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    role TEXT NOT NULL, -- SUPERVISOR, CAPATAZ, MAESTRO, SOLDADOR
    
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE, -- NULL = actualmente activo
    
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT valid_member_role CHECK (role IN ('SUPERVISOR', 'CAPATAZ', 'MAESTRO', 'SOLDADOR')),
    -- Un usuario solo puede estar activo en una cuadrilla a la vez
    UNIQUE(cuadrilla_id, user_id, left_at)
);

CREATE INDEX IF NOT EXISTS idx_cuadrilla_members_cuadrilla ON cuadrilla_members(cuadrilla_id);
CREATE INDEX IF NOT EXISTS idx_cuadrilla_members_user ON cuadrilla_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cuadrilla_members_active ON cuadrilla_members(cuadrilla_id) WHERE left_at IS NULL;

-- 5. TABLA DE EJECUCIONES DE SOLDADURAS
-- Registro detallado de cada soldadura ejecutada (lo más importante)
CREATE TABLE IF NOT EXISTS weld_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    weld_id UUID NOT NULL REFERENCES spools_welds(id) ON DELETE CASCADE,
    revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    
    -- Quién ejecutó y con qué equipo
    executed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    cuadrilla_id UUID REFERENCES cuadrillas(id) ON DELETE SET NULL,
    
    execution_date DATE NOT NULL,
    
    -- Estado de calidad
    quality_status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, REWORK
    inspected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    inspection_date DATE,
    
    -- Migración de revisiones anteriores
    migrated_from_revision_id UUID REFERENCES isometric_revisions(id) ON DELETE SET NULL,
    auto_migrated BOOLEAN DEFAULT FALSE,
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_quality_status CHECK (quality_status IN ('PENDING', 'APPROVED', 'REJECTED', 'REWORK'))
);

CREATE INDEX IF NOT EXISTS idx_weld_executions_weld ON weld_executions(weld_id);
CREATE INDEX IF NOT EXISTS idx_weld_executions_revision ON weld_executions(revision_id);
CREATE INDEX IF NOT EXISTS idx_weld_executions_executor ON weld_executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_weld_executions_cuadrilla ON weld_executions(cuadrilla_id);
CREATE INDEX IF NOT EXISTS idx_weld_executions_date ON weld_executions(execution_date);
CREATE INDEX IF NOT EXISTS idx_weld_executions_migrated ON weld_executions(migrated_from_revision_id) WHERE migrated_from_revision_id IS NOT NULL;

-- 6. TABLA DE EJECUCIONES DE JUNTAS EMPERNADAS
-- Similar a weld_executions pero para juntas empernadas
CREATE TABLE IF NOT EXISTS bolted_joint_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bolted_joint_id UUID NOT NULL REFERENCES bolted_joints(id) ON DELETE CASCADE,
    revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    
    -- Quién ejecutó y con qué equipo
    executed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    cuadrilla_id UUID REFERENCES cuadrillas(id) ON DELETE SET NULL,
    
    execution_date DATE NOT NULL,
    
    -- Estado de calidad
    quality_status TEXT DEFAULT 'PENDING',
    inspected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    inspection_date DATE,
    
    -- Migración de revisiones anteriores
    migrated_from_revision_id UUID REFERENCES isometric_revisions(id) ON DELETE SET NULL,
    auto_migrated BOOLEAN DEFAULT FALSE,
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_bolted_quality_status CHECK (quality_status IN ('PENDING', 'APPROVED', 'REJECTED', 'REWORK'))
);

CREATE INDEX IF NOT EXISTS idx_bolted_executions_joint ON bolted_joint_executions(bolted_joint_id);
CREATE INDEX IF NOT EXISTS idx_bolted_executions_revision ON bolted_joint_executions(revision_id);
CREATE INDEX IF NOT EXISTS idx_bolted_executions_executor ON bolted_joint_executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_bolted_executions_cuadrilla ON bolted_joint_executions(cuadrilla_id);

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a las tablas que tienen updated_at
DROP TRIGGER IF EXISTS update_cuadrillas_updated_at ON cuadrillas;
CREATE TRIGGER update_cuadrillas_updated_at 
    BEFORE UPDATE ON cuadrillas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_weld_executions_updated_at ON weld_executions;
CREATE TRIGGER update_weld_executions_updated_at 
    BEFORE UPDATE ON weld_executions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bolted_executions_updated_at ON bolted_joint_executions;
CREATE TRIGGER update_bolted_executions_updated_at 
    BEFORE UPDATE ON bolted_joint_executions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Habilitar RLS en todas las tablas nuevas
ALTER TABLE revision_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_migration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuadrillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuadrilla_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE weld_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bolted_joint_executions ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS SIMPLIFICADAS (Todos los usuarios autenticados)
-- Puedes refinarlas más tarde según tus necesidades específicas

-- Políticas para revision_impacts
DROP POLICY IF EXISTS "Users can view impacts" ON revision_impacts;
CREATE POLICY "Users can view impacts" ON revision_impacts 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert impacts" ON revision_impacts;
CREATE POLICY "Users can insert impacts" ON revision_impacts 
    FOR INSERT TO authenticated WITH CHECK (true);

-- Políticas para impact_migration_log
DROP POLICY IF EXISTS "Users can view migration log" ON impact_migration_log;
CREATE POLICY "Users can view migration log" ON impact_migration_log 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert migration log" ON impact_migration_log;
CREATE POLICY "Users can insert migration log" ON impact_migration_log 
    FOR INSERT TO authenticated WITH CHECK (true);

-- Políticas para cuadrillas
DROP POLICY IF EXISTS "Users can view cuadrillas" ON cuadrillas;
CREATE POLICY "Users can view cuadrillas" ON cuadrillas 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage cuadrillas" ON cuadrillas;
CREATE POLICY "Users can manage cuadrillas" ON cuadrillas 
    FOR ALL TO authenticated USING (true);

-- Políticas para cuadrilla_members
DROP POLICY IF EXISTS "Users can view members" ON cuadrilla_members;
CREATE POLICY "Users can view members" ON cuadrilla_members 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage members" ON cuadrilla_members;
CREATE POLICY "Users can manage members" ON cuadrilla_members 
    FOR ALL TO authenticated USING (true);

-- Políticas para weld_executions
DROP POLICY IF EXISTS "Users can view weld executions" ON weld_executions;
CREATE POLICY "Users can view weld executions" ON weld_executions 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert weld executions" ON weld_executions;
CREATE POLICY "Users can insert weld executions" ON weld_executions 
    FOR INSERT TO authenticated WITH CHECK (executed_by = auth.uid());

DROP POLICY IF EXISTS "Users can update own weld executions" ON weld_executions;
CREATE POLICY "Users can update own weld executions" ON weld_executions 
    FOR UPDATE TO authenticated USING (true);

-- Políticas para bolted_joint_executions
DROP POLICY IF EXISTS "Users can view bolted executions" ON bolted_joint_executions;
CREATE POLICY "Users can view bolted executions" ON bolted_joint_executions 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert bolted executions" ON bolted_joint_executions;
CREATE POLICY "Users can insert bolted executions" ON bolted_joint_executions 
    FOR INSERT TO authenticated WITH CHECK (executed_by = auth.uid());

DROP POLICY IF EXISTS "Users can update own bolted executions" ON bolted_joint_executions;
CREATE POLICY "Users can update own bolted executions" ON bolted_joint_executions 
    FOR UPDATE TO authenticated USING (true);

-- ==============================================================================
-- FIN DEL SCHEMA
-- ==============================================================================

-- Comentario final
COMMENT ON TABLE revision_impacts IS 'Registro de impactos detectados entre revisiones de isométricos';
COMMENT ON TABLE impact_migration_log IS 'Auditoría de aprobaciones de migración de avances entre revisiones';
COMMENT ON TABLE cuadrillas IS 'Equipos de trabajo (cuadrillas) por proyecto';
COMMENT ON TABLE cuadrilla_members IS 'Miembros asignados a cada cuadrilla con roles específicos';
COMMENT ON TABLE weld_executions IS 'Registro detallado de ejecuciones de soldaduras con trazabilidad completa';
COMMENT ON TABLE bolted_joint_executions IS 'Registro detallado de ejecuciones de juntas empernadas con trazabilidad completa';

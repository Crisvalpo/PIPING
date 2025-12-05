-- FASE 2: MOTOR DE COMPARACIÓN E IMPACTOS
-- Este script crea la estructura para almacenar los cambios detectados entre revisiones.

-- 1. Enum para tipos de cambio
CREATE TYPE impact_type AS ENUM ('NEW', 'DELETE', 'MODIFY', 'RENAME');
CREATE TYPE impact_status AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'MITIGADO');

-- 2. Tabla de Impactos
-- Se asocia a la revisión NUEVA (la que introduce el cambio)
CREATE TABLE IF NOT EXISTS isometric_impacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    
    entity_type TEXT NOT NULL, -- 'SPOOL', 'JOINT', 'MATERIAL'
    entity_identifier TEXT NOT NULL, -- El nombre del Spool o Tag de la Junta
    
    change_type impact_type NOT NULL,
    
    -- Detalles técnicos del cambio (JSON)
    -- Ej: { "campo": "diametro", "valor_anterior": 4, "valor_nuevo": 6 }
    changes_json JSONB DEFAULT '{}'::jsonb,
    
    -- Gestión del cambio (Workflow del Cubicador)
    status impact_status DEFAULT 'PENDIENTE',
    action_required TEXT, -- Ej: "Rehacer soldadura", "Cortar spool"
    comments TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_impacts_revision ON isometric_impacts(revision_id);
CREATE INDEX IF NOT EXISTS idx_impacts_status ON isometric_impacts(status);

-- 4. RLS
ALTER TABLE isometric_impacts ENABLE ROW LEVEL SECURITY;

-- Políticas (Permisivas por ahora para desarrollo)
CREATE POLICY "Usuarios autenticados pueden ver impactos" ON isometric_impacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden gestionar impactos" ON isometric_impacts FOR ALL TO authenticated USING (true);

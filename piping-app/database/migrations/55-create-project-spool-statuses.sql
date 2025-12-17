-- Migration 55: Create Project Spool Statuses
-- Allows each project to define custom spool statuses for tracking lifecycle

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create project_spool_statuses table
CREATE TABLE IF NOT EXISTS project_spool_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    
    -- Status information
    name TEXT NOT NULL,
    code TEXT,  -- Short code: "ACO", "LEV", "INS", "LIB"
    description TEXT,
    color TEXT DEFAULT '#6B7280',  -- Hex color for UI display
    icon TEXT,  -- Icon name or emoji
    
    -- Status workflow
    order_index INTEGER DEFAULT 0,  -- For ordering statuses in workflow
    is_initial BOOLEAN DEFAULT false,  -- Can be initial status for new spools
    is_final BOOLEAN DEFAULT false,    -- Represents completion/final state
    requires_photo BOOLEAN DEFAULT false,  -- If photo is required to set this status
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Status control
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_status_name_per_project UNIQUE(project_id, name),
    CONSTRAINT unique_status_code_per_project UNIQUE(project_id, code),
    CONSTRAINT valid_hex_color CHECK (color ~* '^#[0-9A-F]{6}$')
);

-- Create indexes
CREATE INDEX idx_project_spool_statuses_project_id ON project_spool_statuses(project_id);
CREATE INDEX idx_project_spool_statuses_order ON project_spool_statuses(project_id, order_index);
CREATE INDEX idx_project_spool_statuses_active ON project_spool_statuses(project_id, is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_project_spool_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_spool_statuses_updated_at
    BEFORE UPDATE ON project_spool_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_project_spool_statuses_updated_at();

-- Enable Row Level Security
ALTER TABLE project_spool_statuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view statuses for their project
CREATE POLICY "Users can view statuses for their project" ON project_spool_statuses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.proyecto_id = project_spool_statuses.project_id
        )
    );

-- Only admins can manage statuses
CREATE POLICY "Admins can manage statuses" ON project_spool_statuses
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.proyecto_id = project_spool_statuses.project_id
            AND users.rol = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.proyecto_id = project_spool_statuses.project_id
            AND users.rol = 'ADMIN'
        )
    );

-- Seed default statuses for existing projects
-- This will run for each existing project
DO $$
DECLARE
    proyecto_record RECORD;
BEGIN
    FOR proyecto_record IN SELECT id FROM proyectos LOOP
        INSERT INTO project_spool_statuses (project_id, name, code, description, color, icon, order_index, is_initial, is_final, requires_photo)
        VALUES
            -- Initial status
            (proyecto_record.id, 'Acopiado', 'ACO', 'Spool recibido en bodega y acopiado', '#3B82F6', '📦', 1, true, false, false),
            
            -- In progress statuses
            (proyecto_record.id, 'En Levantamiento', 'LEV', 'Spool siendo levantado en terreno', '#F59E0B', '📸', 2, false, false, true),
            (proyecto_record.id, 'Inspeccionado', 'INS', 'Spool inspeccionado y verificado', '#8B5CF6', '🔍', 3, false, false, false),
            
            -- Final status
            (proyecto_record.id, 'Liberado', 'LIB', 'Spool liberado para instalación', '#10B981', '✅', 4, false, true, false)
        ON CONFLICT (project_id, name) DO NOTHING;
    END LOOP;
END $$;

-- Seed default statuses for new projects (trigger)
CREATE OR REPLACE FUNCTION seed_default_spool_statuses()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO project_spool_statuses (project_id, name, code, description, color, icon, order_index, is_initial, is_final, requires_photo)
    VALUES
        (NEW.id, 'Acopiado', 'ACO', 'Spool recibido en bodega y acopiado', '#3B82F6', '📦', 1, true, false, false),
        (NEW.id, 'En Levantamiento', 'LEV', 'Spool siendo levantado en terreno', '#F59E0B', '📸', 2, false, false, true),
        (NEW.id, 'Inspeccionado', 'INS', 'Spool inspeccionado y verificado', '#8B5CF6', '🔍', 3, false, false, false),
        (NEW.id, 'Liberado', 'LIB', 'Spool liberado para instalación', '#10B981', '✅', 4, false, true, false)
    ON CONFLICT (project_id, name) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_seed_default_spool_statuses
    AFTER INSERT ON proyectos
    FOR EACH ROW
    EXECUTE FUNCTION seed_default_spool_statuses();

-- Comments
COMMENT ON TABLE project_spool_statuses IS 'Configurable spool statuses per project for lifecycle tracking';
COMMENT ON COLUMN project_spool_statuses.order_index IS 'Defines the order of statuses in the workflow (lower = earlier)';
COMMENT ON COLUMN project_spool_statuses.is_initial IS 'Status can be assigned to new spools';
COMMENT ON COLUMN project_spool_statuses.is_final IS 'Status represents completion/final state';
COMMENT ON COLUMN project_spool_statuses.requires_photo IS 'Photo evidence required when setting this status';

-- Migration: Create project_locations table for configurable locations
-- This allows each project to define its own locations (workshops, storage, field sites, etc.)

-- Create table
CREATE TABLE IF NOT EXISTS project_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    
    -- Basic information
    name TEXT NOT NULL,
    code TEXT, -- Short code: "BDE", "TSA", etc.
    type TEXT NOT NULL DEFAULT 'other', -- 'workshop', 'storage', 'field', 'transit', 'installed', 'other'
    description TEXT,
    
    -- Hierarchy support (optional)
    parent_location_id UUID REFERENCES project_locations(id) ON DELETE SET NULL,
    
    -- Additional metadata
    capacity INTEGER, -- Optional: max spools capacity
    gps_coords JSONB, -- {lat: number, lng: number}
    metadata JSONB DEFAULT '{}'::jsonb, -- For any additional custom data
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_location_name_per_project UNIQUE(project_id, name),
    CONSTRAINT unique_location_code_per_project UNIQUE(project_id, code),
    CONSTRAINT valid_location_type CHECK (type IN ('workshop', 'storage', 'field', 'transit', 'installed', 'other'))
);

-- Indexes for performance
CREATE INDEX idx_project_locations_project ON project_locations(project_id);
CREATE INDEX idx_project_locations_type ON project_locations(type);
CREATE INDEX idx_project_locations_parent ON project_locations(parent_location_id) WHERE parent_location_id IS NOT NULL;
CREATE INDEX idx_project_locations_active ON project_locations(is_active) WHERE is_active = true;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_project_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_locations_updated_at ON project_locations;
CREATE TRIGGER trigger_update_project_locations_updated_at
    BEFORE UPDATE ON project_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_project_locations_updated_at();

-- Enable RLS
ALTER TABLE project_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view locations for their project
DROP POLICY IF EXISTS "Users can view locations for their project" ON project_locations;
CREATE POLICY "Users can view locations for their project" ON project_locations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.proyecto_id = project_locations.project_id
        )
    );

-- Only admins can create/update/delete locations
DROP POLICY IF EXISTS "Admins can manage locations" ON project_locations;
CREATE POLICY "Admins can manage locations" ON project_locations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.proyecto_id = project_locations.project_id
            AND users.rol = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.proyecto_id = project_locations.project_id
            AND users.rol = 'ADMIN'
        )
    );

-- Comments
COMMENT ON TABLE project_locations IS 'Configurable locations for each project (workshops, storage areas, field sites, etc.)';
COMMENT ON COLUMN project_locations.type IS 'Type of location: workshop, storage, field, transit, installed, other';
COMMENT ON COLUMN project_locations.parent_location_id IS 'For hierarchical locations (e.g., Bodega → Sector A → Rack 15)';
COMMENT ON COLUMN project_locations.gps_coords IS 'GPS coordinates as JSON: {lat: number, lng: number}';
COMMENT ON COLUMN project_locations.capacity IS 'Optional maximum capacity of spools for this location';

-- Seed default locations for existing projects (optional)
-- This will add basic locations to help projects get started

DO $$
DECLARE
    project_record RECORD;
BEGIN
    -- Loop through all existing projects
    FOR project_record IN SELECT id FROM proyectos LOOP
        -- Check if project already has locations
        IF NOT EXISTS (SELECT 1 FROM project_locations WHERE project_id = project_record.id) THEN
            -- Insert default locations
            INSERT INTO project_locations (project_id, name, type, code, description) VALUES
            (project_record.id, 'Bodega Central', 'storage', 'BC', 'Bodega principal de almacenamiento'),
            (project_record.id, 'Terreno', 'field', 'TER', 'Área de montaje en terreno'),
            (project_record.id, 'En Tránsito', 'transit', 'TRAN', 'Spools en tránsito'),
            (project_record.id, 'Instalado', 'installed', 'INST', 'Spools montados y liberados');
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Default locations seeded for all projects without locations';
END $$;

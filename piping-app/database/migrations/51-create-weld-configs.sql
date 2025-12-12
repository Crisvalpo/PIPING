-- Create table for project weld configurations
CREATE TABLE IF NOT EXISTS project_weld_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    weld_type_code TEXT NOT NULL,
    requires_welder BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure unique weld type per project
    UNIQUE(project_id, weld_type_code)
);

-- Enable RLS
ALTER TABLE project_weld_configs ENABLE ROW LEVEL SECURITY;

-- Policies

-- View: All authenticated users can view configs (needed for Master Views)
CREATE POLICY "Users can view weld configs" ON project_weld_configs
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Admin: Project admins and super admins are verified at API level
-- Allow all operations for authenticated users, API handles authorization
CREATE POLICY "Authenticated users can manage weld configs" ON project_weld_configs
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at (uses existing function if available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_modified_column') THEN
        CREATE TRIGGER update_project_weld_configs_modtime
            BEFORE UPDATE ON project_weld_configs
            FOR EACH ROW
            EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;


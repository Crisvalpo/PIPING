-- Migration: Create weld_executions table for tracking rework history
-- Date: 2024-12-10

-- 1. Create enum for rework responsibility
DO $$ BEGIN
    CREATE TYPE rework_responsibility AS ENUM ('TERRENO', 'INGENIERIA', 'RECHAZO_END');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add rework_count to spools_welds FIRST (before creating table that references it)
ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS rework_count INT NOT NULL DEFAULT 0;

-- 3. Create weld_executions table
CREATE TABLE IF NOT EXISTS weld_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weld_id UUID NOT NULL REFERENCES spools_welds(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    
    -- Execution data
    execution_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    welder_id TEXT, -- RUT del soldador
    foreman_id TEXT, -- RUT del capataz
    
    -- Status
    status TEXT NOT NULL DEFAULT 'VIGENTE' CHECK (status IN ('VIGENTE', 'RETRABAJO')),
    is_rework BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Rework details (only when is_rework = true or status = RETRABAJO)
    rework_reason TEXT, -- Motivo libre
    rework_responsibility rework_responsibility, -- TERRENO / INGENIERIA / RECHAZO_END
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Ensure version uniqueness per weld
    UNIQUE(weld_id, version)
);

-- 4. Add current_execution_id to spools_welds (after table creation)
ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS current_execution_id UUID REFERENCES weld_executions(id);

-- 5. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_weld_executions_weld_id ON weld_executions(weld_id);
CREATE INDEX IF NOT EXISTS idx_weld_executions_status ON weld_executions(status);

-- 6. Add RLS policies (drop first if they exist)
ALTER TABLE weld_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weld_executions_select_policy" ON weld_executions;
CREATE POLICY "weld_executions_select_policy" ON weld_executions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "weld_executions_insert_policy" ON weld_executions;
CREATE POLICY "weld_executions_insert_policy" ON weld_executions
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "weld_executions_update_policy" ON weld_executions;
CREATE POLICY "weld_executions_update_policy" ON weld_executions
    FOR UPDATE TO authenticated USING (true);

-- 7. Comment on table
COMMENT ON TABLE weld_executions IS 'Historial de ejecuciones de uniones soldadas, incluyendo retrabajos';
COMMENT ON COLUMN weld_executions.rework_responsibility IS 'TERRENO=error construcción, INGENIERIA=interferencias/cambios, RECHAZO_END=rechazo por QC';

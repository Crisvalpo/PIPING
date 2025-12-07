-- FIX FINAL: Project Shifts 406 Error
-- 1. Create the missing function 'update_modified_column' if it doesn't exist
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Ensure table has the column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'project_shifts' 
        AND column_name = 'lunch_break_minutes'
    ) THEN
        ALTER TABLE project_shifts 
        ADD COLUMN lunch_break_minutes INTEGER DEFAULT 60;
    END IF;
END $$;

-- 3. Fix Triggers
-- Drop potential duplicate/broken triggers
DROP TRIGGER IF EXISTS update_project_shifts_modtime ON project_shifts;

-- Recreate trigger properly
CREATE TRIGGER update_project_shifts_modtime
    BEFORE UPDATE ON project_shifts
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 4. Fix RLS (Nuclear option for development)
ALTER TABLE project_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access to authenticated users" ON project_shifts;
DROP POLICY IF EXISTS "Allow authenticated users to view shifts" ON project_shifts;
DROP POLICY IF EXISTS "Allow authenticated users to manage shifts" ON project_shifts;
DROP POLICY IF EXISTS "Allow authenticated users to view overrides" ON project_daily_overrides;
DROP POLICY IF EXISTS "Allow authenticated users to manage overrides" ON project_daily_overrides;

-- Permissive policies for shifts
CREATE POLICY "Enable all access to authenticated users"
ON project_shifts FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Permissive policies for overrides
CREATE POLICY "Enable all access to authenticated users overrides"
ON project_daily_overrides FOR ALL TO authenticated
USING (true) WITH CHECK (true);

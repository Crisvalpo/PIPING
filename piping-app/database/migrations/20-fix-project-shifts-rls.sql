-- FIX RLS Policies for project_shifts
-- The previous policies might have issues with specific operations returning data
-- We will drop and recreate them to be explicitly permissive for ALL operations

-- 1. Ensure RLS is enabled
ALTER TABLE project_shifts ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to view shifts" ON project_shifts;
DROP POLICY IF EXISTS "Allow authenticated users to manage shifts" ON project_shifts;
DROP POLICY IF EXISTS "Enable all access to authenticated users" ON project_shifts;

-- 3. Create a single, simple, permissive policy for authenticated users
-- "FOR ALL" covers SELECT, INSERT, UPDATE, DELETE
-- "USING (true)" allows access to all existing rows
-- "WITH CHECK (true)" allows creating/updating rows to any state
CREATE POLICY "Enable all access to authenticated users"
ON project_shifts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Verify the column exists (just in case)
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

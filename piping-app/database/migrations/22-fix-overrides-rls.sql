-- Fix RLS Policies for project_daily_overrides
-- Apply same permissive policies as project_shifts for development

-- 1. Ensure RLS is enabled
ALTER TABLE project_daily_overrides ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to view overrides" ON project_daily_overrides;
DROP POLICY IF EXISTS "Allow authenticated users to manage overrides" ON project_daily_overrides;
DROP POLICY IF EXISTS "Enable all access to authenticated users overrides" ON project_daily_overrides;

-- 3. Create permissive policy for authenticated users
CREATE POLICY "Enable all access to authenticated users"
ON project_daily_overrides
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

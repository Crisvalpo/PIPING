-- ===================================================================
-- FIX: Allow public access to personal and related tables (Dev Mode)
-- ===================================================================

-- 1. Enable RLS (just to be safe)
ALTER TABLE personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE soldadores ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow public to view personal" ON personal;
DROP POLICY IF EXISTS "Allow public to insert personal" ON personal;
DROP POLICY IF EXISTS "Allow public to update personal" ON personal;
DROP POLICY IF EXISTS "Allow public to delete personal" ON personal;

-- 3. Create permissive policies for personal
CREATE POLICY "Allow public to view personal" ON personal FOR SELECT TO public USING (true);
CREATE POLICY "Allow public to insert personal" ON personal FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public to update personal" ON personal FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public to delete personal" ON personal FOR DELETE TO public USING (true);

-- 4. Create permissive policies for soldadores (if exists)
CREATE POLICY "Allow public to all soldadores" ON soldadores FOR ALL TO public USING (true) WITH CHECK (true);

SELECT 'RLS policies updated for personal table' as status;

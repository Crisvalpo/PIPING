-- Migration: Disable RLS for spool fabrication tracking
-- Created: 2025-12-15
-- Description: Disable Row Level Security as requested to unblock development

-- Drop policies if they exist (cleanup)
DROP POLICY IF EXISTS "Supervisors can manage fabrication tracking" ON spool_fabrication_tracking;
DROP POLICY IF EXISTS "Project members can manage fabrication tracking" ON spool_fabrication_tracking;
DROP POLICY IF EXISTS "Manage fabrication tracking" ON spool_fabrication_tracking;
DROP POLICY IF EXISTS "Users can view fabrication tracking for their projects" ON spool_fabrication_tracking;

-- Disable RLS on the table
ALTER TABLE spool_fabrication_tracking DISABLE ROW LEVEL SECURITY;

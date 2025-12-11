-- Migration: Add user audit trail to weld actions
-- Track who performs each action: report, delete, rework, undo

-- Add reported_by to spools_welds (who reported the execution)
ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES auth.users(id);

-- Add reported_at timestamp
ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ;

-- Add rework columns for audit
ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS rework_by UUID REFERENCES auth.users(id);

ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS rework_at TIMESTAMPTZ;

-- deleted_by already exists from previous migration

-- Add undo tracking columns
ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS undone_by UUID REFERENCES auth.users(id);

ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS undone_at TIMESTAMPTZ;

ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS undo_reason TEXT;

-- Add reported_by_user to weld_executions (who clicked the button in app)
ALTER TABLE weld_executions 
ADD COLUMN IF NOT EXISTS reported_by_user UUID REFERENCES auth.users(id);

-- Add comments for documentation
COMMENT ON COLUMN spools_welds.reported_by IS 'App user who clicked report execution button';
COMMENT ON COLUMN spools_welds.reported_at IS 'Timestamp when execution was reported';
COMMENT ON COLUMN spools_welds.rework_by IS 'App user who marked the weld for rework';
COMMENT ON COLUMN spools_welds.rework_at IS 'Timestamp when rework was marked';
COMMENT ON COLUMN spools_welds.undone_by IS 'App user who undid a false execution report';
COMMENT ON COLUMN spools_welds.undone_at IS 'Timestamp when execution was undone';
COMMENT ON COLUMN spools_welds.undo_reason IS 'Reason provided for undoing execution';
COMMENT ON COLUMN weld_executions.reported_by_user IS 'App user who reported this execution';

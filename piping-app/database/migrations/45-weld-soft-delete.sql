-- Migration: Add soft-delete columns to spools_welds
-- This allows welds to be marked as deleted without removing them from the database
-- Deleted welds don't count in totals but their execution history is preserved

-- Add deleted flag
ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Add deletion reason
ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Add deleted_at timestamp
ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_by (user who deleted)
ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create index for faster filtering of active welds
CREATE INDEX IF NOT EXISTS idx_spools_welds_deleted 
ON spools_welds(deleted) 
WHERE deleted = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN spools_welds.deleted IS 'Soft delete flag - weld is hidden from totals but history preserved';
COMMENT ON COLUMN spools_welds.deletion_reason IS 'Reason provided when marking weld as deleted';

-- Migration: Add weld creation tracking columns
-- Date: 2024-12-11
-- Tracks whether weld was created from INGENIERIA (planned) or TERRENO (field)

-- Add creation type column
ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS creation_type TEXT DEFAULT 'INGENIERIA' 
    CHECK (creation_type IN ('INGENIERIA', 'TERRENO'));

-- Add creation reason column (why it was created in field)
ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS creation_reason TEXT;

-- Comment
COMMENT ON COLUMN spools_welds.creation_type IS 'INGENIERIA=planned weld, TERRENO=field opportunity weld';
COMMENT ON COLUMN spools_welds.creation_reason IS 'Reason for creating field weld (only for TERRENO type)';

-- Migration: Add display_order column for custom weld ordering
-- Allows drag & drop ordering independent of weld_number

-- Add display_order column
ALTER TABLE spools_welds 
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Initialize display_order based on current weld_number alphabetical order
-- Group by revision_id to ensure unique ordering per isometric
WITH ordered_welds AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY revision_id ORDER BY weld_number) as order_num
    FROM spools_welds
)
UPDATE spools_welds
SET display_order = ordered_welds.order_num
FROM ordered_welds
WHERE spools_welds.id = ordered_welds.id;

-- Set NOT NULL after initialization
ALTER TABLE spools_welds 
ALTER COLUMN display_order SET NOT NULL;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_spools_welds_display_order 
ON spools_welds(revision_id, display_order);

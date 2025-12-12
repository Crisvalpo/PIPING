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

-- Function to increment display_order for welds >= start_order
-- Used when inserting a new weld in the middle
CREATE OR REPLACE FUNCTION increment_weld_orders(p_revision_id UUID, p_start_order INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE spools_welds
  SET display_order = display_order + 1
  WHERE revision_id = p_revision_id
    AND display_order >= p_start_order;
END;
$$ LANGUAGE plpgsql;

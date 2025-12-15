-- Migration: Fix shop welding auto-completion trigger
-- Description: Improve trigger to handle auth context issues and ensure shop/field welding status updates correctly

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_shop_welding_on_weld_change ON spools_welds;
DROP FUNCTION IF EXISTS update_shop_welding_status();

-- Improved function to update shop welding status
CREATE OR REPLACE FUNCTION update_shop_welding_status()
RETURNS TRIGGER AS $$
DECLARE
  total_shop_welds INT;
  completed_shop_welds INT;
  total_field_welds INT;
  completed_field_welds INT;
  current_user_id UUID;
BEGIN
  -- Try to get current user, but don't fail if not authenticated
  current_user_id := auth.uid();
  
  -- Count shop welds for this spool
  SELECT 
    COUNT(*) FILTER (WHERE destination = 'S' AND NOT deleted),
    COUNT(*) FILTER (WHERE destination = 'S' AND executed AND NOT deleted)
  INTO total_shop_welds, completed_shop_welds
  FROM spools_welds
  WHERE spool_number = NEW.spool_number
  AND revision_id = NEW.revision_id;
  
  -- Count field welds for this spool
  SELECT 
    COUNT(*) FILTER (WHERE destination = 'F' AND NOT deleted),
    COUNT(*) FILTER (WHERE destination = 'F' AND executed AND NOT deleted)
  INTO total_field_welds, completed_field_welds
  FROM spools_welds
  WHERE spool_number = NEW.spool_number
  AND revision_id = NEW.revision_id;
  
  -- Update shop welding status
  IF total_shop_welds > 0 AND completed_shop_welds = total_shop_welds THEN
    UPDATE spool_fabrication_tracking
    SET 
      shop_welding_status = 'COMPLETED',
      shop_welding_completed_at = COALESCE(shop_welding_completed_at, NOW()),
      shop_welding_completed_by = COALESCE(shop_welding_completed_by, current_user_id)
    WHERE spool_number = NEW.spool_number
    AND revision_id = NEW.revision_id
    AND shop_welding_status != 'COMPLETED';
  ELSIF completed_shop_welds > 0 THEN
    UPDATE spool_fabrication_tracking
    SET shop_welding_status = 'IN_PROGRESS'
    WHERE spool_number = NEW.spool_number
    AND revision_id = NEW.revision_id
    AND shop_welding_status = 'PENDING';
  ELSIF total_shop_welds > 0 AND completed_shop_welds = 0 THEN
    UPDATE spool_fabrication_tracking
    SET shop_welding_status = 'PENDING'
    WHERE spool_number = NEW.spool_number
    AND revision_id = NEW.revision_id;
  END IF;
  
  -- Update field welding status
  IF total_field_welds > 0 AND completed_field_welds = total_field_welds THEN
    UPDATE spool_fabrication_tracking
    SET 
      field_welding_status = 'COMPLETED',
      field_welding_completed_at = COALESCE(field_welding_completed_at, NOW()),
      field_welding_completed_by = COALESCE(field_welding_completed_by, current_user_id)
    WHERE spool_number = NEW.spool_number
    AND revision_id = NEW.revision_id
    AND field_welding_status != 'COMPLETED';
  ELSIF completed_field_welds > 0 THEN
    UPDATE spool_fabrication_tracking
    SET field_welding_status = 'IN_PROGRESS'
    WHERE spool_number = NEW.spool_number
    AND revision_id = NEW.revision_id
    AND field_welding_status = 'PENDING';
  ELSIF total_field_welds > 0 AND completed_field_welds = 0 THEN
    UPDATE spool_fabrication_tracking
    SET field_welding_status = 'PENDING'
    WHERE spool_number = NEW.spool_number
    AND revision_id = NEW.revision_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER update_shop_welding_on_weld_change
  AFTER INSERT OR UPDATE OF executed, deleted ON spools_welds
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_welding_status();

COMMENT ON FUNCTION update_shop_welding_status() IS 'Auto-updates shop and field welding status based on executed welds';

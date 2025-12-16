-- Migration: Allow users to delete their own levantamientos
-- Created: 2025-12-16

-- Policy for deletion of levantamientos
DROP POLICY IF EXISTS "Users can delete their own levantamientos" ON spool_levantamientos;
CREATE POLICY "Users can delete their own levantamientos"
  ON spool_levantamientos
  FOR DELETE
  USING (
    captured_by = auth.uid() OR 
    (SELECT rol FROM users WHERE id = auth.uid()) IN ('ADMINISTRADOR', 'SUPERADMIN')
  );

-- Policy for deletion of photos (implicitly via cascade, but good to have explicit)
DROP POLICY IF EXISTS "Users can delete photos of their levantamientos" ON spool_levantamiento_photos;
CREATE POLICY "Users can delete photos of their levantamientos"
  ON spool_levantamiento_photos
  FOR DELETE
  USING (
    levantamiento_id IN (
      SELECT id FROM spool_levantamientos
      WHERE captured_by = auth.uid() OR
      (SELECT rol FROM users WHERE id = auth.uid()) IN ('ADMINISTRADOR', 'SUPERADMIN')
    )
  );

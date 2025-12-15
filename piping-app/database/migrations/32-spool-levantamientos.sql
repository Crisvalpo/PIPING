-- Migration: Add spool levantamientos (photographic documentation)
-- Created: 2025-12-15
-- Description: Tables for storing spool location and photographic history in field

-- Create levantamientos table
CREATE TABLE IF NOT EXISTS spool_levantamientos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spool_number TEXT NOT NULL,
  revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  
  -- Storage location
  storage_location TEXT,
  
  -- Metadata
  captured_at TIMESTAMP DEFAULT NOW(),
  captured_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create photos table
CREATE TABLE IF NOT EXISTS spool_levantamiento_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  levantamiento_id UUID NOT NULL REFERENCES spool_levantamientos(id) ON DELETE CASCADE,
  
  -- Supabase Storage paths
  storage_path TEXT NOT NULL,
  
  -- Metadata
  file_name TEXT NOT NULL,
  file_size_bytes INT,
  mime_type TEXT,
  description TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_levantamiento_spool ON spool_levantamientos(spool_number, revision_id);
CREATE INDEX IF NOT EXISTS idx_levantamiento_project ON spool_levantamientos(project_id);
CREATE INDEX IF NOT EXISTS idx_levantamiento_captured_at ON spool_levantamientos(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_levantamiento ON spool_levantamiento_photos(levantamiento_id);

-- RLS Policies for spool_levantamientos
ALTER TABLE spool_levantamientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view levantamientos for their project" ON spool_levantamientos;
CREATE POLICY "Users can view levantamientos for their project"
  ON spool_levantamientos
  FOR SELECT
  USING (
    project_id = (SELECT proyecto_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create levantamientos" ON spool_levantamientos;
CREATE POLICY "Users can create levantamientos"
  ON spool_levantamientos
  FOR INSERT
  WITH CHECK (
    project_id = (SELECT proyecto_id FROM users WHERE id = auth.uid())
    AND captured_by = auth.uid()
  );

-- RLS Policies for spool_levantamiento_photos
ALTER TABLE spool_levantamiento_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view photos for their project levantamientos" ON spool_levantamiento_photos;
CREATE POLICY "Users can view photos for their project levantamientos"
  ON spool_levantamiento_photos
  FOR SELECT
  USING (
    levantamiento_id IN (
      SELECT id FROM spool_levantamientos
      WHERE project_id = (SELECT proyecto_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert photos for their levantamientos" ON spool_levantamiento_photos;
CREATE POLICY "Users can insert photos for their levantamientos"
  ON spool_levantamiento_photos
  FOR INSERT
  WITH CHECK (
    levantamiento_id IN (
      SELECT id FROM spool_levantamientos
      WHERE captured_by = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE spool_levantamientos IS 'Photographic documentation of spools in field (location and photos)';
COMMENT ON TABLE spool_levantamiento_photos IS 'Individual photos for each levantamiento record';
COMMENT ON COLUMN spool_levantamientos.storage_location IS 'Physical storage location in field (e.g., "Acopio Principal - Zona A")';
COMMENT ON COLUMN spool_levantamiento_photos.storage_path IS 'Supabase Storage path to image file';

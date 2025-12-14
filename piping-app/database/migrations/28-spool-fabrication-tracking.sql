-- Migration: Add spool fabrication tracking
-- Created: 2025-12-14
-- Description: Table to track fabrication lifecycle of spools through 7 phases

-- Create enum types for statuses
CREATE TYPE fabrication_phase_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'N/A');
CREATE TYPE surface_treatment_type AS ENUM ('PAINT', 'GALVANIZED', 'NONE', 'OTHER');

-- Create spool fabrication tracking table
CREATE TABLE IF NOT EXISTS spool_fabrication_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spool_number TEXT NOT NULL,
  revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  
  -- Spool Information
  length_meters DECIMAL(10,2),
  weight_kg DECIMAL(10,2),
  length_requested_by UUID REFERENCES auth.users(id),
  length_requested_at TIMESTAMP,
  
  -- Phase 1: Shop Welding (Auto from welds)
  shop_welding_status fabrication_phase_status DEFAULT 'PENDING',
  shop_welding_completed_at TIMESTAMP,
  shop_welding_completed_by UUID REFERENCES auth.users(id),
  
  -- Phase 2: NDT/NDE
  ndt_status fabrication_phase_status DEFAULT 'PENDING',
  ndt_completed_at TIMESTAMP,
  ndt_completed_by UUID REFERENCES auth.users(id),
  ndt_notes TEXT,
  
  -- Phase 3: PWHT (Post Weld Heat Treatment)
  pwht_status fabrication_phase_status DEFAULT 'N/A',
  pwht_completed_at TIMESTAMP,
  pwht_completed_by UUID REFERENCES auth.users(id),
  pwht_notes TEXT,
  
  -- Phase 4: Surface Treatment
  surface_treatment_status fabrication_phase_status DEFAULT 'PENDING',
  surface_treatment_type surface_treatment_type DEFAULT 'NONE',
  surface_treatment_completed_at TIMESTAMP,
  surface_treatment_completed_by UUID REFERENCES auth.users(id),
  surface_treatment_notes TEXT,
  
  -- Phase 5: Dispatch
  dispatch_status fabrication_phase_status DEFAULT 'PENDING',
  dispatch_completed_at TIMESTAMP,
  dispatch_completed_by UUID REFERENCES auth.users(id),
  dispatch_notes TEXT,
  dispatch_tracking_number TEXT,
  
  -- Phase 6: Field Erection
  field_erection_status fabrication_phase_status DEFAULT 'PENDING',
  field_erection_completed_at TIMESTAMP,
  field_erection_completed_by UUID REFERENCES auth.users(id),
  
  -- Phase 7: Field Welding (Auto from welds)
  field_welding_status fabrication_phase_status DEFAULT 'PENDING',
  field_welding_completed_at TIMESTAMP,
  field_welding_completed_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(spool_number, revision_id)
);

-- Create indexes
CREATE INDEX idx_spool_fab_tracking_revision ON spool_fabrication_tracking(revision_id);
CREATE INDEX idx_spool_fab_tracking_project ON spool_fabrication_tracking(project_id);
CREATE INDEX idx_spool_fab_tracking_spool ON spool_fabrication_tracking(spool_number);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_spool_fabrication_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_spool_fabrication_tracking_updated_at
  BEFORE UPDATE ON spool_fabrication_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_spool_fabrication_timestamp();

-- RLS Policies
ALTER TABLE spool_fabrication_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view fabrication tracking for their project
CREATE POLICY "Users can view fabrication tracking for their projects"
  ON spool_fabrication_tracking
  FOR SELECT
  USING (
    project_id = (SELECT proyecto_id FROM users WHERE id = auth.uid())
  );

-- Supervisors and admins can insert/update
CREATE POLICY "Supervisors can manage fabrication tracking"
  ON spool_fabrication_tracking
  FOR ALL
  USING (
    project_id = (SELECT proyecto_id FROM users WHERE id = auth.uid())
    AND (
      SELECT rol FROM users WHERE id = auth.uid()
    ) IN ('Admin', 'Supervisor', 'QC Inspector')
  );

-- Function to auto-initialize tracking when spool is created
CREATE OR REPLACE FUNCTION initialize_spool_fabrication_tracking()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO spool_fabrication_tracking (
    spool_number,
    revision_id,
    project_id
  )
  SELECT DISTINCT
    NEW.spool_number,
    NEW.revision_id,
    NEW.proyecto_id
  WHERE NOT EXISTS (
    SELECT 1 FROM spool_fabrication_tracking
    WHERE spool_number = NEW.spool_number
    AND revision_id = NEW.revision_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create tracking record when weld is created
CREATE TRIGGER auto_init_spool_fabrication_tracking
  AFTER INSERT ON spools_welds
  FOR EACH ROW
  EXECUTE FUNCTION initialize_spool_fabrication_tracking();

-- Function to update shop welding status based on welds
CREATE OR REPLACE FUNCTION update_shop_welding_status()
RETURNS TRIGGER AS $$
DECLARE
  total_shop_welds INT;
  completed_shop_welds INT;
BEGIN
  -- Count shop welds for this spool
  SELECT 
    COUNT(*) FILTER (WHERE destination = 'S' AND NOT deleted),
    COUNT(*) FILTER (WHERE destination = 'S' AND executed AND NOT deleted)
  INTO total_shop_welds, completed_shop_welds
  FROM spools_welds
  WHERE spool_number = NEW.spool_number
  AND revision_id = NEW.revision_id;
  
  -- Update tracking
  IF total_shop_welds > 0 AND completed_shop_welds = total_shop_welds THEN
    UPDATE spool_fabrication_tracking
    SET 
      shop_welding_status = 'COMPLETED',
      shop_welding_completed_at = NOW(),
      shop_welding_completed_by = auth.uid()
    WHERE spool_number = NEW.spool_number
    AND revision_id = NEW.revision_id
    AND shop_welding_status != 'COMPLETED';
  ELSIF completed_shop_welds > 0 THEN
    UPDATE spool_fabrication_tracking
    SET shop_welding_status = 'IN_PROGRESS'
    WHERE spool_number = NEW.spool_number
    AND revision_id = NEW.revision_id
    AND shop_welding_status = 'PENDING';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update shop welding status when welds change
CREATE TRIGGER update_shop_welding_on_weld_change
  AFTER INSERT OR UPDATE OF executed ON spools_welds
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_welding_status();

COMMENT ON TABLE spool_fabrication_tracking IS 'Tracks the fabrication lifecycle of spools through 7 phases: shop welding, NDT, PWHT, surface treatment, dispatch, field erection, and field welding';

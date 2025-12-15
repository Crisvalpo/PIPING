-- Migration: Add fabrication tracking history
-- Created: 2025-12-15
-- Description: Track all status changes for fabrication phases with full audit trail

-- Create history table
CREATE TABLE IF NOT EXISTS spool_fabrication_tracking_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id UUID NOT NULL REFERENCES spool_fabrication_tracking(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('ndt', 'pwht', 'surface_treatment', 'dispatch', 'field_erection')),
  
  -- Status change tracking
  old_status fabrication_phase_status,
  new_status fabrication_phase_status NOT NULL,
  
  -- User and timestamp
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  
  -- Additional notes and metadata
  notes TEXT,
  metadata JSONB, -- For phase-specific data (surface_treatment_type, dispatch_tracking_number, etc.)
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_history_tracking ON spool_fabrication_tracking_history(tracking_id);
CREATE INDEX IF NOT EXISTS idx_history_phase ON spool_fabrication_tracking_history(phase);
CREATE INDEX IF NOT EXISTS idx_history_changed_at ON spool_fabrication_tracking_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_tracking_phase ON spool_fabrication_tracking_history(tracking_id, phase);

-- Add comment to table
COMMENT ON TABLE spool_fabrication_tracking_history IS 'Audit trail for all fabrication phase status changes';
COMMENT ON COLUMN spool_fabrication_tracking_history.metadata IS 'JSON object containing phase-specific data like surface_treatment_type, dispatch_tracking_number';

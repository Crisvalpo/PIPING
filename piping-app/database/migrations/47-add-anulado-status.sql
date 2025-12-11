-- Migration: Add ANULADO status to weld_executions
-- Date: 2024-12-11

-- Drop the CHECK constraint and recreate with ANULADO
ALTER TABLE weld_executions DROP CONSTRAINT IF EXISTS weld_executions_status_check;

-- Add new CHECK constraint that includes ANULADO
ALTER TABLE weld_executions ADD CONSTRAINT weld_executions_status_check 
    CHECK (status IN ('VIGENTE', 'RETRABAJO', 'ANULADO'));

-- Add comment
COMMENT ON COLUMN weld_executions.status IS 'VIGENTE=ejecución activa, RETRABAJO=requiere retrabajo, ANULADO=reporte falso anulado';

-- Schema actualizado para soportar gestión de cuadrillas
-- Las ejecuciones se asocian directamente a usuarios (que serán miembros de cuadrillas)

-- Agregar columnas de ejecución referenciando a usuarios
ALTER TABLE spools_welds
ADD COLUMN IF NOT EXISTS executed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS execution_date DATE,
ADD COLUMN IF NOT EXISTS executed_by UUID REFERENCES auth.users(id), -- Soldador que ejecutó
ADD COLUMN IF NOT EXISTS supervised_by UUID REFERENCES auth.users(id); -- Capataz responsable

-- Agregar índices para mejorar performance en consultas
CREATE INDEX IF NOT EXISTS idx_spools_welds_executed ON spools_welds(executed);
CREATE INDEX IF NOT EXISTS idx_spools_welds_spool ON spools_welds(spool_number);
CREATE INDEX IF NOT EXISTS idx_spools_welds_destination ON spools_welds(destination);

-- Agregar columnas de ejecución a juntas empernadas
ALTER TABLE bolted_joints
ADD COLUMN IF NOT EXISTS executed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS execution_date DATE,
ADD COLUMN IF NOT EXISTS executed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS supervised_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_bolted_joints_executed ON bolted_joints(executed);

-- Comentarios para documentación
COMMENT ON COLUMN spools_welds.executed IS 'Indica si la soldadura fue ejecutada';
COMMENT ON COLUMN spools_welds.execution_date IS 'Fecha en que se ejecutó la soldadura';
COMMENT ON COLUMN spools_welds.executed_by IS 'Usuario (soldador) que ejecutó la soldadura';
COMMENT ON COLUMN spools_welds.supervised_by IS 'Usuario (capataz) que supervisó la ejecución';
COMMENT ON COLUMN spools_welds.destination IS 'S = Shop/Taller, F = Field/Campo';

-- Vista para estadísticas de spools
-- Un spool se considera "FABRICADO" cuando todas sus soldaduras de taller (destination='S') están ejecutadas
CREATE OR REPLACE VIEW spool_fabrication_status AS
SELECT 
    sw.revision_id,
    sw.spool_number,
    COUNT(*) FILTER (WHERE sw.destination = 'S') as shop_welds_total,
    COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.executed = TRUE) as shop_welds_executed,
    COUNT(*) FILTER (WHERE sw.destination = 'F') as field_welds_total,
    COUNT(*) FILTER (WHERE sw.destination = 'F' AND sw.executed = TRUE) as field_welds_executed,
    CASE 
        WHEN COUNT(*) FILTER (WHERE sw.destination = 'S') > 0 
             AND COUNT(*) FILTER (WHERE sw.destination = 'S') = COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.executed = TRUE)
        THEN TRUE
        ELSE FALSE
    END as is_fabricated,
    CASE
        WHEN COUNT(*) FILTER (WHERE sw.destination = 'S') = 0 THEN 'N/A'
        WHEN COUNT(*) FILTER (WHERE sw.destination = 'S') = COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.executed = TRUE) THEN 'FABRICADO'
        WHEN COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.executed = TRUE) > 0 THEN 'EN PROCESO'
        ELSE 'PENDIENTE'
    END as fabrication_status
FROM spools_welds sw
GROUP BY sw.revision_id, sw.spool_number;

COMMENT ON VIEW spool_fabrication_status IS 'Vista que calcula el estado de fabricación de cada spool basado en soldaduras de taller ejecutadas';

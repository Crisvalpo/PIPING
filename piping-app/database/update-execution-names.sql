-- Actualizar schema de ejecución para usar nombres en lugar de IDs
-- Esto permite mayor flexibilidad ya que no todos los proyectos tienen tablas centralizadas de soldadores/capataces

-- Renombrar columnas existentes o agregar las nuevas
ALTER TABLE spools_welds
ADD COLUMN IF NOT EXISTS welder_name TEXT,
ADD COLUMN IF NOT EXISTS foreman_name TEXT;

-- Si existen las columnas antiguas (welder_id, foreman_id), las mantenemos por compatibilidad
-- pero priorizamos el uso de welder_name y foreman_name

COMMENT ON COLUMN spools_welds.welder_name IS 'Nombre del soldador que ejecutó la soldadura';
COMMENT ON COLUMN spools_welds.foreman_name IS 'Nombre del capataz responsable de la ejecución';
COMMENT ON COLUMN spools_welds.execution_date IS 'Fecha en que se ejecutó la soldadura';
COMMENT ON COLUMN spools_welds.executed IS 'Indica si la soldadura fue ejecutada';

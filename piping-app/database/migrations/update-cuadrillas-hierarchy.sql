-- ===================================================================
-- ACTUALIZACIÓN: Sistema Jerárquico de Cuadrillas
-- ===================================================================
-- Agrega jerarquía: Supervisor -> Capataz -> Cuadrilla
-- ===================================================================

-- 1. Agregar columnas a tabla cuadrillas
ALTER TABLE cuadrillas 
ADD COLUMN IF NOT EXISTS supervisor_rut VARCHAR(12) REFERENCES personal(rut),
ADD COLUMN IF NOT EXISTS capataz_rut VARCHAR(12) REFERENCES personal(rut);

-- 2. Crear constraint único: un capataz = una cuadrilla
ALTER TABLE cuadrillas
DROP CONSTRAINT IF EXISTS unique_capataz_cuadrilla;

ALTER TABLE cuadrillas
ADD CONSTRAINT unique_capataz_cuadrilla UNIQUE(capataz_rut);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_cuadrillas_supervisor ON cuadrillas(supervisor_rut);
CREATE INDEX IF NOT EXISTS idx_cuadrillas_capataz ON cuadrillas(capataz_rut);

-- 4. Comentarios de documentación
COMMENT ON COLUMN cuadrillas.supervisor_rut IS 'Supervisor responsable de la cuadrilla';
COMMENT ON COLUMN cuadrillas.capataz_rut IS 'Capataz líder - relación 1:1 con cuadrilla';

-- Verificar estructura
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'cuadrillas'
  AND column_name IN ('supervisor_rut', 'capataz_rut')
ORDER BY ordinal_position;

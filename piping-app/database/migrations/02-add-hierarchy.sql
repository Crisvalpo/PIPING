-- ===================================================================
-- PASO 2: Actualizar Cuadrillas con Jerarquía
-- ===================================================================

ALTER TABLE cuadrillas 
ADD COLUMN IF NOT EXISTS supervisor_rut VARCHAR(12) REFERENCES personal(rut),
ADD COLUMN IF NOT EXISTS capataz_rut VARCHAR(12) REFERENCES personal(rut);

ALTER TABLE cuadrillas
DROP CONSTRAINT IF EXISTS unique_capataz_cuadrilla;

ALTER TABLE cuadrillas
ADD CONSTRAINT unique_capataz_cuadrilla UNIQUE(capataz_rut);

CREATE INDEX IF NOT EXISTS idx_cuadrillas_supervisor ON cuadrillas(supervisor_rut);
CREATE INDEX IF NOT EXISTS idx_cuadrillas_capataz ON cuadrillas(capataz_rut);

SELECT 'Jerarquía agregada a cuadrillas' as status;

-- Make unique constraints on cuadrillas partial (only for active = true)
-- This allows reusing names/codes if previous ones were soft-deleted

-- 1. Drop existing constraints/indexes
DROP INDEX IF EXISTS idx_cuadrillas_nombre_unique;
DROP INDEX IF EXISTS idx_cuadrillas_codigo_unique;
ALTER TABLE cuadrillas DROP CONSTRAINT IF EXISTS cuadrillas_nombre_key;
ALTER TABLE cuadrillas DROP CONSTRAINT IF EXISTS cuadrillas_codigo_key;
ALTER TABLE cuadrillas DROP CONSTRAINT IF EXISTS cuadrillas_nombre_proyecto_id_key;
ALTER TABLE cuadrillas DROP CONSTRAINT IF EXISTS cuadrillas_codigo_proyecto_id_key;

-- 2. Create new partial unique indexes
CREATE UNIQUE INDEX idx_cuadrillas_nombre_active ON cuadrillas(proyecto_id, nombre) WHERE active = true;
CREATE UNIQUE INDEX idx_cuadrillas_codigo_active ON cuadrillas(proyecto_id, codigo) WHERE active = true;

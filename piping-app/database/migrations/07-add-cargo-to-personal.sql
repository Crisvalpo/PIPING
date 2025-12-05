-- Agregar columna cargo a la tabla personal
-- Esta columna almacena el rol/cargo del trabajador del Excel importado

ALTER TABLE personal 
ADD COLUMN IF NOT EXISTS cargo VARCHAR(100);

-- Crear índice para búsquedas por cargo
CREATE INDEX IF NOT EXISTS idx_personal_cargo ON personal(cargo);

COMMENT ON COLUMN personal.cargo IS 'Cargo o rol del trabajador (ej: SOLDADOR, CAPATAZ, SUPERVISOR, MAESTRO)';

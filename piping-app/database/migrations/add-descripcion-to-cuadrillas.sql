-- Agregar columna descripcion si no existe
ALTER TABLE cuadrillas 
ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- Verificar
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cuadrillas' 
AND column_name = 'descripcion';

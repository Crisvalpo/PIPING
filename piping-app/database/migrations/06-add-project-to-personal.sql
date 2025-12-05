-- ===================================================================
-- PASO 6: Asociar Personal a Proyectos
-- ===================================================================

-- 1. Agregar columna proyecto_id a la tabla personal
ALTER TABLE personal 
ADD COLUMN IF NOT EXISTS proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE;

-- 2. Crear índice para mejorar performance de búsquedas por proyecto
CREATE INDEX IF NOT EXISTS idx_personal_proyecto ON personal(proyecto_id);

-- 3. Actualizar la vista cuadrillas_full (opcional, ya que personal se une por rut)
-- Pero es bueno verificar que la integridad se mantenga.

-- 4. Verificar
SELECT 'Columna proyecto_id agregada a personal' as status;

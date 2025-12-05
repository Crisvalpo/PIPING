-- Eliminar columnas redundantes o no utilizadas en isometric_revisions
ALTER TABLE public.isometric_revisions 
DROP COLUMN IF EXISTS comentarios,
DROP COLUMN IF EXISTS archivo_url;

-- Nota: 'spooling_status' es TEXT, así que no necesitamos crear un TYPE ENUM.
-- Los valores 'N/A' y 'SPOOLEADO - ELIMINADA' se guardarán como texto sin problemas.

-- Opcional: Si quieres asegurar la integridad de datos en el futuro, podrías agregar un CHECK constraint:
-- ALTER TABLE public.isometric_revisions 
-- ADD CONSTRAINT check_spooling_status 
-- CHECK (spooling_status IN ('PENDIENTE', 'EN_PROCESO', 'SPOOLEADO', 'ENVIADO', 'APROBADO', 'N/A', 'SPOOLEADO - ELIMINADA'));

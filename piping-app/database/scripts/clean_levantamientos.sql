-- ⚠️ PELIGRO: ESTE SCRIPT BORRA TODOS LOS LEVANTAMIENTOS Y FOTOS ⚠️
-- Úsalo solo para resetear el entorno de pruebas.

BEGIN;

-- 1. Limpiar tablas de datos (Cascade borra las dependencias)
TRUNCATE TABLE public.spool_levantamientos CASCADE;
TRUNCATE TABLE public.spool_levantamiento_photos CASCADE;

-- 2. Limpiar Storage (Archivos físicos)
-- Borra todos los objetos dentro del bucket 'spool-levantamientos'
DELETE FROM storage.objects 
WHERE bucket_id = 'spool-levantamientos';

COMMIT;

-- Verificación
SELECT count(*) as lev_count FROM public.spool_levantamientos;
SELECT count(*) as photo_count FROM public.spool_levantamiento_photos;
SELECT count(*) as storage_count FROM storage.objects WHERE bucket_id = 'spool-levantamientos';

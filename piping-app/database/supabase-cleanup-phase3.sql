-- LIMPIEZA FINAL Y DEFINITIVA
-- Este script fuerza la eliminación de las tablas antiguas y sus dependencias.

-- 1. Eliminar explícitamente la restricción que está causando el bloqueo
ALTER TABLE IF EXISTS public.spools DROP CONSTRAINT IF EXISTS spools_isometrico_id_fkey;

-- 2. Eliminar tablas antiguas usando CASCADE
-- CASCADE asegura que si algo depende de estas tablas (como una FK olvidada), esa dependencia también se borre.
DROP TABLE IF EXISTS public.uniones_enflanchadas CASCADE;
DROP TABLE IF EXISTS public.valvulas CASCADE;
DROP TABLE IF EXISTS public.soportes CASCADE;
DROP TABLE IF EXISTS public.juntas CASCADE;
DROP TABLE IF EXISTS public.materiales CASCADE;
DROP TABLE IF EXISTS public.isometricos CASCADE;

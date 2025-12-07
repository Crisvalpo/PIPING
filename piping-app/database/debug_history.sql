-- DIAGNOSTICO DE ERROR EN HISTORIAL
-- Ejecuta este script paso a paso en Supabase SQL Editor para ver cuál falla.

-- 1. Verificar si existen las columnas de hora en maestros
SELECT 'Verificando maestros' as test, count(*) 
FROM maestros_asignaciones 
WHERE hora_inicio IS NOT NULL OR hora_fin IS NOT NULL 
LIMIT 1;

-- 2. Verificar si existen las columnas de hora en soldadores
SELECT 'Verificando soldadores' as test, count(*) 
FROM soldadores_asignaciones 
WHERE hora_inicio IS NOT NULL OR hora_fin IS NOT NULL 
LIMIT 1;

-- 3. Probar la función directamente con el ID de tu proyecto
-- Si esto falla, Supabase te mostrará el mensaje de error EXACTO.
SELECT * FROM get_cuadrilla_hours_history(
    'f2579cfe-5d45-435e-8016-b6a87cbb9725', 
    '2025-11-30', 
    '2025-12-07'
) LIMIT 5;

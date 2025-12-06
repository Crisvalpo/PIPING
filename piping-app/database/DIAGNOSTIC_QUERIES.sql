-- ===================================================================
-- DIAGNOSTIC QUERIES - Run in Supabase SQL Editor
-- ===================================================================

-- 1. Ver TODAS las cuadrillas (con detalles completos)
SELECT 
    id,
    proyecto_id,
    nombre,
    codigo,
    tipo,
    supervisor_rut,
    capataz_rut,
    active,
    created_at,
    updated_at
FROM cuadrillas
ORDER BY created_at DESC;

-- 2. Ver TODO el personal del proyecto
SELECT 
    rut,
    nombre,
    email,
    cargo,
    proyecto_id,
    activo
    -- jefe_directo_rut  (Add this after running migration 08)
FROM personal
WHERE activo = true
ORDER BY nombre;

-- 3. Ver soldadores registrados
SELECT 
    s.rut,
    p.nombre,
    s.estampa,
    s.certificacion_actual
FROM soldadores s
JOIN personal p ON s.rut = p.rut
ORDER BY p.nombre;

-- 4. Ver asignaciones de soldadores (últimas 50)
SELECT 
    sa.id,
    sa.soldador_rut,
    p.nombre as soldador_nombre,
    c.nombre as cuadrilla_nombre,
    sa.fecha,
    sa.hora_inicio,
    sa.hora_fin,
    sa.observaciones
FROM soldadores_asignaciones sa
LEFT JOIN personal p ON sa.soldador_rut = p.rut
LEFT JOIN cuadrillas c ON sa.cuadrilla_id = c.id
ORDER BY sa.created_at DESC
LIMIT 50;

-- 5. Ver asignaciones de maestros activas
SELECT 
    ma.id,
    ma.maestro_rut,
    p.nombre as maestro_nombre,
    c.nombre as cuadrilla_nombre,
    ma.fecha_asignacion,
    ma.activo,
    ma.observaciones
FROM maestros_asignaciones ma
LEFT JOIN personal p ON ma.maestro_rut = p.rut
LEFT JOIN cuadrillas c ON ma.cuadrilla_id = c.id
WHERE ma.activo = true
ORDER BY ma.created_at DESC;

-- 6. Verificar políticas RLS de la tabla cuadrillas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'cuadrillas';

-- 7. Ver estructura de la tabla cuadrillas
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cuadrillas'
ORDER BY ordinal_position;

-- 8. PRUEBA DIRECTA: Intentar UPDATE manual
-- (Reemplaza los valores con IDs reales de tu proyecto)
-- NOTA: Ejecuta esto SOLO si quieres probar manualmente
/*
UPDATE cuadrillas
SET capataz_rut = '17.221.810-5'  -- RUT del capataz que intentaste asignar
WHERE id = '06b1f44f-1f61-4d0f-8c08-6db958557427';  -- ID de la cuadrilla

-- Verificar si funcionó
SELECT id, nombre, capataz_rut FROM cuadrillas 
WHERE id = '06b1f44f-1f61-4d0f-8c08-6db958557427';
*/

-- 9. Ver logs de la vista cuadrillas_full
SELECT * FROM cuadrillas_full
ORDER BY created_at DESC;

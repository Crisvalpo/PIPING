-- Script de diagnóstico para isometric_revisions
-- Ejecutar en Supabase SQL Editor

-- 1. Ver estructura de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'isometric_revisions'
ORDER BY ordinal_position;

-- 2. Ver una muestra de datos (primeras 5 revisiones)
SELECT 
    id,
    isometric_id,
    codigo,
    estado,
    fecha_emision
FROM isometric_revisions
LIMIT 5;

-- 3. Buscar el isométrico específico del usuario
SELECT 
    i.id as isometric_id,
    i.codigo as iso_codigo,
    i.proyecto_id,
    r.id as revision_id,
    r.codigo as rev_codigo,
    r.estado
FROM isometrics i
LEFT JOIN isometric_revisions r ON r.isometric_id = i.id
WHERE i.codigo = '3800PR-BFW-380-5202-1'
ORDER BY r.codigo;

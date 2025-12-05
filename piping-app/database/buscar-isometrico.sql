-- Búsqueda exhaustiva de isométrico
-- Ejecutar en Supabase SQL Editor

-- 1. Buscar isométricos que se parezcan (case insensitive, con LIKE)
SELECT 
    id,
    codigo,
    proyecto_id,
    created_at,
    LENGTH(codigo) as codigo_length,
    ENCODE(codigo::bytea, 'hex') as codigo_hex
FROM isometrics
WHERE codigo ILIKE '%3800PR-CWR-380-2002-1%'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Buscar en el proyecto específico (exact match)
SELECT 
    id,
    codigo,
    proyecto_id,
    created_at,
    LENGTH(codigo) as codigo_length
FROM isometrics
WHERE proyecto_id = 'f2579cfe-5d45-435e-8016-b6a87cbb9725'
  AND codigo = '3800PR-CWR-380-2002-1';

-- 3. Buscar en todos los proyectos (exact match)
SELECT 
    id,
    codigo,
    proyecto_id,
    p.nombre as proyecto_nombre,
    created_at
FROM isometrics i
LEFT JOIN proyectos p ON p.id = i.proyecto_id
WHERE codigo = '3800PR-CWR-380-2002-1';

-- 4. Listar TODOS los isométricos del proyecto (para ver si hay alguno similar)
SELECT 
    codigo,
    created_at
FROM isometrics
WHERE proyecto_id = 'f2579cfe-5d45-435e-8016-b6a87cbb9725'
  AND codigo LIKE '%CWR%'
ORDER BY created_at DESC;

-- 5. Verificar si hay espacios o caracteres especiales
SELECT 
    codigo,
    LENGTH(codigo) as length,
    REPLACE(codigo, ' ', '[SPACE]') as codigo_with_spaces,
    ASCII(SUBSTRING(codigo FROM 1 FOR 1)) as first_char_ascii
FROM isometrics
WHERE proyecto_id = 'f2579cfe-5d45-435e-8016-b6a87cbb9725'
  AND codigo LIKE '%CWR%';

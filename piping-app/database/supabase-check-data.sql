-- 1. Contar cuántas filas tienen datos en las columnas que vamos a borrar
SELECT 
    COUNT(comentarios) as filas_con_comentarios,
    COUNT(archivo_url) as filas_con_archivo_url
FROM public.isometric_revisions;

-- 2. Ver una muestra de los datos (si existen) para decidir si son importantes
SELECT id, codigo, comentarios, archivo_url 
FROM public.isometric_revisions 
WHERE comentarios IS NOT NULL OR archivo_url IS NOT NULL
LIMIT 20;

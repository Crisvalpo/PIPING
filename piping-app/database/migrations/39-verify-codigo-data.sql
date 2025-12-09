-- Verificar si codigo_trabajador tiene datos en personal
SELECT 
    rut, 
    nombre, 
    codigo_trabajador,
    cargo
FROM personal 
WHERE codigo_trabajador IS NOT NULL 
LIMIT 10;

-- Contar cuántos tienen código vs cuántos no
SELECT 
    COUNT(*) FILTER (WHERE codigo_trabajador IS NOT NULL) as con_codigo,
    COUNT(*) FILTER (WHERE codigo_trabajador IS NULL) as sin_codigo,
    COUNT(*) as total
FROM personal;

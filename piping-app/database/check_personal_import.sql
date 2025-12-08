-- DIAGNOSTICO IMPORTACION PERSONAL
-- 1. Ver si existen las funciones de RUT
SELECT proname, prosrc FROM pg_proc WHERE proname IN ('formatear_rut', 'validar_rut');

-- 2. Probar las funciones con el RUT del usuario
SELECT formatear_rut('12.345.678-9') as rut_formateado;
-- SELECT validar_rut('12.345.678-9') as es_valido; -- Si existe

-- 3. Buscar el registro "perdido"
SELECT * FROM personal WHERE rut LIKE '%12.345.678-9%' OR rut LIKE '%12345678%';

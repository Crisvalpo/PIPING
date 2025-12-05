-- ===================================================================
-- IMPORT HELPER: Carga desde CSV/Excel
-- ===================================================================
-- Script alternativo si tienes los datos en formato CSV
-- ===================================================================

-- Opción 1: COPY desde archivo CSV (requiere permisos de superuser)
/*
COPY personal(rut, nombre)
FROM '/path/to/trabajadores.csv'
DELIMITER ','
CSV HEADER;
*/

-- Opción 2: INSERT dinámico desde tabla temporal si ya tienes los datos cargados
-- Paso 1: Crear tabla temporal
CREATE TEMP TABLE temp_trabajadores (
    rut_sin_formato VARCHAR(20),
    nombre_completo TEXT,
    cargo TEXT
);

-- Paso 2: Insertar datos (ejemplo, reemplazar con tus datos reales)
INSERT INTO temp_trabajadores VALUES
('8935849-3', 'NAVARRO PAVEZ ROBERTO NARCISO', 'SUPERVISOR PIPING'),
('16486752-8', 'VIDAL MARTINEZ ALEXANDER EDUARDO', 'CUBICADOR PIPING');
-- ... más registros

-- Paso 3: Formatear e insertar en personal
INSERT INTO personal (rut, nombre, activo)
SELECT 
    formatear_rut(rut_sin_formato) as rut,
    nombre_completo as nombre,
    TRUE as activo
FROM temp_trabajadores
ON CONFLICT (rut) DO NOTHING;

-- Verificar
SELECT * FROM personal ORDER BY nombre;

-- Opción 3: Mapeo automático de cargos a roles para cuadrilla_members
-- Identificar maestros y capataces para asignarlos automáticamente

SELECT 
    'Maestros detectados:' as tipo,
    COUNT(*) as cantidad
FROM temp_trabajadores
WHERE cargo LIKE '%MAESTRO%';

SELECT 
    'Capataces detectados:' as tipo,
    COUNT(*) as cantidad
FROM temp_trabajadores
WHERE cargo LIKE '%CAPATAZ%';

SELECT 
    'Supervisores detectados:' as tipo,
    COUNT(*) as cantidad
FROM temp_trabajadores
WHERE cargo LIKE '%SUPERVISOR%';

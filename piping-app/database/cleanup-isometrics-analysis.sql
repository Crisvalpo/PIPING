-- ========================================
-- ANÁLISIS DE COLUMNAS EN TABLA ISOMETRICS
-- ========================================
-- Este script documenta el uso actual de columnas y propone 
-- optimizaciones para la tabla isometrics

-- COLUMNAS ANALIZADAS:
-- 1. descripcion: NO SE USA en el código de ingeniería
-- 2. linea: NO SE USA (tenemos line_number que es la correcta)
-- 3. current_revision_id: SE USA pero NO SE ACTUALIZA correctamente

-- ========================================
-- HALLAZGOS DETALLADOS:
-- ========================================

/*
1. COLUMNA 'descripcion'
   - Definida como: text null
   - Uso en isometrics: NINGUNO
   - Uso en otros contextos: Sí (empresas, proyectos, etc.)
   - Conclusión: NO se usa para isométricos
   - Acción recomendada: ELIMINAR

2. COLUMNA 'linea'
   - Definida como: text null
   - Uso en código: NINGUNO
   - Columna alternativa: line_number (SÍ se usa)
   - Conclusión: Columna obsoleta/duplicada
   - Acción recomendada: ELIMINAR

3. COLUMNA 'current_revision_id'
   - Definida como: uuid null
   - Uso en código: SÍ (revision-announcement.ts línea 380, 410, 414)
   - Problema: Se actualiza en revision-announcement pero NO en otros flujos
   - Conclusión: Útil pero implementación incompleta
   - Acción recomendada: MANTENER Y COMPLETAR IMPLEMENTACIÓN
*/

-- ========================================
-- OPCIÓN 1: LIMPIEZA CONSERVADORA
-- ========================================
-- Solo elimina columnas claramente no usadas
-- Mantiene current_revision_id para uso futuro

-- Paso 1: Verificar que no hay datos importantes
SELECT 
    COUNT(*) as total_isometrics,
    COUNT(descripcion) as con_descripcion,
    COUNT(linea) as con_linea,
    COUNT(current_revision_id) as con_current_revision
FROM isometrics;

-- Paso 2: Eliminar índice obsoleto si existe
DROP INDEX IF EXISTS idx_isometrics_current_rev;

-- Paso 3: Eliminar columnas no usadas
ALTER TABLE isometrics 
    DROP COLUMN IF EXISTS descripcion,
    DROP COLUMN IF EXISTS linea;

-- Paso 4: Recrear índice para current_revision_id
CREATE INDEX IF NOT EXISTS idx_isometrics_current_rev 
ON isometrics(current_revision_id) 
WHERE current_revision_id IS NOT NULL;

-- Paso 5: Poblar current_revision_id con la revisión VIGENTE actual
UPDATE isometrics i
SET current_revision_id = (
    SELECT r.id 
    FROM isometric_revisions r 
    WHERE r.isometric_id = i.id 
      AND r.estado = 'VIGENTE'
    ORDER BY r.created_at DESC 
    LIMIT 1
)
WHERE current_revision_id IS NULL;

-- ========================================
-- OPCIÓN 2: LIMPIEZA AGRESIVA
-- ========================================
-- Elimina TODAS las columnas no usadas activamente
-- Incluye current_revision_id si decides no usarla

/*
-- Paso 1: Eliminar constraint foreign key
ALTER TABLE isometrics 
    DROP CONSTRAINT IF EXISTS isometrics_current_revision_id_fkey;

-- Paso 2: Eliminar índice
DROP INDEX IF EXISTS idx_isometrics_current_rev;

-- Paso 3: Eliminar todas las columnas no usadas
ALTER TABLE isometrics 
    DROP COLUMN IF EXISTS descripcion,
    DROP COLUMN IF EXISTS linea,
    DROP COLUMN IF EXISTS current_revision_id;
*/

-- ========================================
-- OPCIÓN 3: SOLO LIMPIAR DATOS
-- ========================================
-- Mantiene las columnas pero limpia datos basura
-- Útil si quieres mantener flexibilidad para el futuro

/*
UPDATE isometrics 
SET 
    descripcion = NULL,
    linea = NULL
WHERE descripcion IS NOT NULL OR linea IS NOT NULL;
*/

-- ========================================
-- VERIFICACIÓN POST-LIMPIEZA
-- ========================================
-- Ejecutar después de cualquier opción para verificar

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'isometrics'
ORDER BY ordinal_position;

-- Ver estructura de índices después de limpieza
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'isometrics'
  AND schemaname = 'public';

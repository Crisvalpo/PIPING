-- ========================================
-- LIMPIEZA RECOMENDADA: TABLA ISOMETRICS
-- ========================================
-- Este script elimina columnas no usadas y mejora current_revision_id
-- Ejecutar en Supabase SQL Editor

-- IMPORTANTE: Hacer backup antes de ejecutar
-- Supabase Dashboard > Settings > Database > Backups

BEGIN;

-- ========================================
-- Paso 1: Verificar estado actual
-- ========================================
DO $$
DECLARE
    total_count INTEGER;
    desc_count INTEGER;
    linea_count INTEGER;
    curr_rev_count INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(descripcion),
        COUNT(linea),
        COUNT(current_revision_id)
    INTO total_count, desc_count, linea_count, curr_rev_count
    FROM isometrics;
    
    RAISE NOTICE '=== Estado actual de isometrics ===';
    RAISE NOTICE 'Total isométricos: %', total_count;
    RAISE NOTICE 'Con descripcion: % (%.1f%%)', desc_count, (desc_count::FLOAT / NULLIF(total_count, 0) * 100);
    RAISE NOTICE 'Con linea: % (%.1f%%)', linea_count, (linea_count::FLOAT / NULLIF(total_count, 0) * 100);
    RAISE NOTICE 'Con current_revision_id: % (%.1f%%)', curr_rev_count, (curr_rev_count::FLOAT / NULLIF(total_count, 0) * 100);
    RAISE NOTICE '';
END $$;

-- ========================================
-- Paso 2: Poblar current_revision_id
-- ========================================
UPDATE isometrics i
SET current_revision_id = (
    SELECT r.id 
    FROM isometric_revisions r 
    WHERE r.isometric_id = i.id 
      AND r.estado = 'VIGENTE'
    ORDER BY r.created_at DESC 
    LIMIT 1
)
WHERE current_revision_id IS NULL
  AND EXISTS (
      SELECT 1 
      FROM isometric_revisions r 
      WHERE r.isometric_id = i.id 
        AND r.estado = 'VIGENTE'
  );

-- Verificar actualización
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO updated_count
    FROM isometrics
    WHERE current_revision_id IS NOT NULL;
    
    RAISE NOTICE '=== Actualización de current_revision_id ===';
    RAISE NOTICE 'Isométricos con current_revision_id: %', updated_count;
    RAISE NOTICE '';
END $$;

-- ========================================
-- Paso 3: Eliminar vista dependiente
-- ========================================

-- La vista v_revision_engineering_details usa descripcion y linea
-- Debemos eliminarla antes de borrar las columnas
DROP VIEW IF EXISTS v_revision_engineering_details CASCADE;

-- ========================================
-- Paso 4: Eliminar columnas no usadas
-- ========================================

-- Eliminar 'descripcion'
ALTER TABLE isometrics 
    DROP COLUMN IF EXISTS descripcion;

-- Eliminar 'linea'
ALTER TABLE isometrics 
    DROP COLUMN IF EXISTS linea;

-- ========================================
-- Paso 5: Recrear vista sin columnas obsoletas
-- ========================================

CREATE OR REPLACE VIEW public.v_revision_engineering_details AS
SELECT 
    ir.id AS revision_id,
    ir.codigo AS revision_code,
    i.codigo AS iso_number,
    i.proyecto_id,
    ir.estado,
    ir.spooling_status,
    
    -- Contadores de detalles
    (SELECT COUNT(*) FROM spools_welds WHERE revision_id = ir.id) AS total_welds,
    (SELECT COUNT(*) FROM material_take_off WHERE revision_id = ir.id) AS total_materials,
    (SELECT COUNT(*) FROM bolted_joints WHERE revision_id = ir.id) AS total_bolted_joints,
    
    -- Metadatos (SIN descripcion ni linea)
    ir.created_at,
    ir.spooling_date,
    i.area,
    i.line_number,
    i.sub_area,
    i.line_type
    
FROM isometric_revisions ir
JOIN isometrics i ON ir.isometric_id = i.id;

COMMENT ON VIEW public.v_revision_engineering_details IS 
'Vista consolidada de detalles de ingeniería por revisión con contadores (actualizada sin descripcion/linea)';

-- ========================================
-- Paso 6: Optimizar índice
-- ========================================

-- Eliminar índice antiguo si existe
DROP INDEX IF EXISTS idx_isometrics_current_rev;

-- Crear índice parcial (más eficiente)
CREATE INDEX IF NOT EXISTS idx_isometrics_current_rev 
ON isometrics(current_revision_id) 
WHERE current_revision_id IS NOT NULL;

-- ========================================
-- Paso 7: Verificación final
-- ========================================
DO $$
DECLARE
    col_count INTEGER;
    col_rec RECORD;
BEGIN
    -- Contar columnas restantes
    SELECT COUNT(*)
    INTO col_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'isometrics';
    
    RAISE NOTICE '=== Limpieza completada ===';
    RAISE NOTICE 'Total de columnas en isometrics: %', col_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Columnas restantes:';
    
    FOR col_rec IN (
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'isometrics'
        ORDER BY ordinal_position
    ) LOOP
        RAISE NOTICE '  - % (%)', col_rec.column_name, col_rec.data_type;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✓ Script ejecutado exitosamente';
END $$;

-- Si todo está bien, hacer commit
COMMIT;

-- ========================================
-- VERIFICACIÓN POST-LIMPIEZA
-- ========================================
-- Ejecutar estas queries por separado DESPUÉS del COMMIT

-- Ver estructura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'isometrics'
ORDER BY ordinal_position;

-- Ver índices finales
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'isometrics'
  AND schemaname = 'public'
ORDER BY indexname;

-- Verificar integridad de current_revision_id
SELECT 
    'Total isométricos' as descripcion,
    COUNT(*) as cantidad
FROM isometrics
UNION ALL
SELECT 
    'Con revisión vigente',
    COUNT(*)
FROM isometrics i
WHERE EXISTS (
    SELECT 1 FROM isometric_revisions r 
    WHERE r.isometric_id = i.id AND r.estado = 'VIGENTE'
)
UNION ALL
SELECT 
    'Con current_revision_id poblado',
    COUNT(*)
FROM isometrics
WHERE current_revision_id IS NOT NULL;

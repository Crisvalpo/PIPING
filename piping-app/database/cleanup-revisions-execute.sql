-- ========================================
-- LIMPIEZA DE TABLA ISOMETRIC_REVISIONS
-- ========================================
-- Este script elimina columnas redundantes o no usadas
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
    comment_count INTEGER;
    rev_num_count INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(description),
        COUNT(comment),
        COUNT(revision_number)
    INTO total_count, desc_count, comment_count, rev_num_count
    FROM isometric_revisions;
    
    RAISE NOTICE '=== Estado actual de isometric_revisions ===';
    RAISE NOTICE 'Total revisiones: %', total_count;
    RAISE NOTICE 'Con description: %', desc_count;
    RAISE NOTICE 'Con comment: %', comment_count;
    RAISE NOTICE 'Con revision_number: %', rev_num_count;
    
    -- Verificar transmittal_number
    SELECT COUNT(*) INTO rev_num_count FROM isometric_revisions WHERE transmittal_number IS NOT NULL AND transmittal_number != '';
    RAISE NOTICE 'Con transmittal_number: %', rev_num_count;
    
    SELECT COUNT(*) INTO rev_num_count FROM isometric_revisions WHERE transmittal_number != transmittal_code;
    RAISE NOTICE 'Diferentes a transmittal_code: %', rev_num_count;
    
    RAISE NOTICE '';
END $$;

-- ========================================
-- Paso 2: Eliminar columnas no usadas
-- ========================================

-- Eliminar 'description' (No usada)
ALTER TABLE isometric_revisions 
    DROP COLUMN IF EXISTS description;

-- Eliminar 'comment' (Solicitado por usuario)
ALTER TABLE isometric_revisions 
    DROP COLUMN IF EXISTS comment;

-- Eliminar 'has_pdf' y 'has_idf' (Solicitado por usuario)
ALTER TABLE isometric_revisions 
    DROP COLUMN IF EXISTS has_pdf,
    DROP COLUMN IF EXISTS has_idf;

-- Eliminar 'transmittal_number' (Reemplazada por transmittal_code)
ALTER TABLE isometric_revisions 
    DROP COLUMN IF EXISTS transmittal_number;

-- Eliminar 'revision_number' (Redundante con 'codigo')
-- Primero verificamos que 'codigo' tenga los datos
DO $$
DECLARE
    mismatch_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO mismatch_count
    FROM isometric_revisions
    WHERE codigo != revision_number;
    
    IF mismatch_count > 0 THEN
        RAISE WARNING 'Hay % filas donde codigo != revision_number. Se perderá el valor de revision_number.', mismatch_count;
    ELSE
        RAISE NOTICE 'codigo y revision_number son idénticos en todas las filas. Seguro de eliminar.';
    END IF;
END $$;

ALTER TABLE isometric_revisions 
    DROP COLUMN IF EXISTS revision_number;

-- ========================================
-- Paso 3: Verificación final
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
      AND table_name = 'isometric_revisions';
    
    RAISE NOTICE '=== Limpieza completada ===';
    RAISE NOTICE 'Total de columnas en isometric_revisions: %', col_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Columnas restantes:';
    
    FOR col_rec IN (
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'isometric_revisions'
        ORDER BY ordinal_position
    ) LOOP
        RAISE NOTICE '  - % (%)', col_rec.column_name, col_rec.data_type;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✓ Script ejecutado exitosamente';
END $$;

-- Si todo está bien, hacer commit
COMMIT;

-- =====================================================
-- SCRIPT DE LIMPIEZA COMPLETO - DATOS DE DESARROLLO
-- =====================================================
-- ⚠️ SOLO PARA DESARROLLO - Borra TODOS los datos de ingeniería y fabricación
-- Este script elimina:
-- 1. Reportes de Ejecución (weld_execution_reports) - si existe
-- 2. Tracking de Uniones Nuevas (new_welds_tracking) - si existe
-- 3. Tracking de Uniones Eliminadas (deleted_welds_tracking) - si existe
-- 4. Soldaduras (spools_welds)
-- 5. Material Take-Off (material_take_off)
-- 6. Juntas Empernadas (bolted_joints)
-- 7. Resetea spooling_status a PENDIENTE
-- =====================================================

DO $$
DECLARE
    exec_count INTEGER := 0;
    new_welds_count INTEGER := 0;
    deleted_welds_count INTEGER := 0;
    welds_count INTEGER;
    materials_count INTEGER;
    joints_count INTEGER;
    pending_revisions INTEGER;
    table_exists BOOLEAN;
BEGIN
    -- 1. Eliminar reportes de ejecución de soldaduras (si existe la tabla)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'weld_execution_reports'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM weld_execution_reports;
        GET DIAGNOSTICS exec_count = ROW_COUNT;
        RAISE NOTICE '✓ Reportes de ejecución eliminados: %', exec_count;
    ELSE
        RAISE NOTICE '⊘ Tabla weld_execution_reports no existe (omitiendo)';
    END IF;

    -- 2. Eliminar tracking de uniones nuevas (si existe la tabla)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'new_welds_tracking'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM new_welds_tracking;
        GET DIAGNOSTICS new_welds_count = ROW_COUNT;
        RAISE NOTICE '✓ Tracking de uniones nuevas eliminado: %', new_welds_count;
    ELSE
        RAISE NOTICE '⊘ Tabla new_welds_tracking no existe (omitiendo)';
    END IF;

    -- 3. Eliminar tracking de uniones eliminadas (si existe la tabla)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'deleted_welds_tracking'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM deleted_welds_tracking;
        GET DIAGNOSTICS deleted_welds_count = ROW_COUNT;
        RAISE NOTICE '✓ Tracking de uniones eliminadas eliminado: %', deleted_welds_count;
    ELSE
        RAISE NOTICE '⊘ Tabla deleted_welds_tracking no existe (omitiendo)';
    END IF;

    -- 4. Eliminar tracking de fabricación de spools (si existe la tabla)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'spool_fabrication_tracking'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM spool_fabrication_tracking;
        RAISE NOTICE '✓ Tracking de fabricación de spools eliminado';
    ELSE
        RAISE NOTICE '⊘ Tabla spool_fabrication_tracking no existe (omitiendo)';
    END IF;

    -- 5. Eliminar todas las soldaduras
    DELETE FROM spools_welds;
    GET DIAGNOSTICS welds_count = ROW_COUNT;
    RAISE NOTICE '✓ Soldaduras eliminadas: %', welds_count;

    -- 6. Eliminar todos los materiales
    DELETE FROM material_take_off;
    GET DIAGNOSTICS materials_count = ROW_COUNT;
    RAISE NOTICE '✓ Materiales eliminados: %', materials_count;

    -- 7. Eliminar todas las juntas empernadas
    DELETE FROM bolted_joints;
    GET DIAGNOSTICS joints_count = ROW_COUNT;
    RAISE NOTICE '✓ Juntas empernadas eliminadas: %', joints_count;

    -- 8. Resetear spooling_status de todas las revisiones a PENDIENTE
    UPDATE isometric_revisions
    SET spooling_status = 'PENDIENTE'
    WHERE spooling_status IN ('SPOOLEADO', 'OK', 'ENVIADO');
    GET DIAGNOSTICS pending_revisions = ROW_COUNT;
    RAISE NOTICE '✓ Revisiones reseteadas a PENDIENTE: %', pending_revisions;

    -- 8. Mostrar resumen final
    RAISE NOTICE '========================================';
    RAISE NOTICE 'LIMPIEZA COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total eliminado:';
    RAISE NOTICE '  - Reportes de ejecución: %', exec_count;
    RAISE NOTICE '  - Uniones nuevas tracking: %', new_welds_count;
    RAISE NOTICE '  - Uniones eliminadas tracking: %', deleted_welds_count;
    RAISE NOTICE '  - Tracking de spools eliminado';
    RAISE NOTICE '  - Soldaduras: %', welds_count;
    RAISE NOTICE '  - Materiales: %', materials_count;
    RAISE NOTICE '  - Juntas empernadas: %', joints_count;
    RAISE NOTICE '  - Revisiones actualizadas: %', pending_revisions;
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- NOTAS:
-- =====================================================
-- - Este script NO elimina isométricos ni revisiones
-- - Solo limpia los datos de ingeniería de detalle y fabricación
-- - Verifica si las tablas existen antes de intentar eliminar
-- - Para ejecutar: Copia y pega en el SQL Editor de Supabase
-- - ⚠️ NO USAR EN PRODUCCIÓN
-- =====================================================

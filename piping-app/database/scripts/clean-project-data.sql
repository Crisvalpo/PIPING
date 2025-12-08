-- ===================================================================
-- Script para limpiar datos de personal y cuadrillas
-- Simula un proyecto desde cero
-- ===================================================================

-- IMPORTANTE: Reemplazar 'tu-proyecto-id' con el UUID real del proyecto

DO $$
DECLARE
    v_proyecto_id UUID := 'f2579cfe-5d45-435e-8016-b6a87cbb9725'; -- CAMBIAR ESTE ID
BEGIN
    RAISE NOTICE 'Limpiando datos del proyecto %...', v_proyecto_id;

    -- 1. Borrar asignaciones de soldadores
    DELETE FROM soldadores_asignaciones 
    WHERE cuadrilla_id IN (
        SELECT id FROM cuadrillas WHERE proyecto_id = v_proyecto_id
    );
    RAISE NOTICE '✓ Soldadores asignaciones eliminadas';

    -- 2. Borrar asignaciones de maestros
    DELETE FROM maestros_asignaciones 
    WHERE cuadrilla_id IN (
        SELECT id FROM cuadrillas WHERE proyecto_id = v_proyecto_id
    );
    RAISE NOTICE '✓ Maestros asignaciones eliminadas';

    -- 3. Borrar cuadrillas
    DELETE FROM cuadrillas WHERE proyecto_id = v_proyecto_id;
    RAISE NOTICE '✓ Cuadrillas eliminadas';

    -- 4. Borrar asistencia diaria
    DELETE FROM asistencia_diaria WHERE proyecto_id = v_proyecto_id;
    RAISE NOTICE '✓ Asistencia diaria eliminada';

    -- 5. Borrar overrides de jornadas
    DELETE FROM personal_override_diario WHERE proyecto_id = v_proyecto_id;
    RAISE NOTICE '✓ Overrides de jornadas eliminados';

    -- 6. Borrar personal
    DELETE FROM personal WHERE proyecto_id = v_proyecto_id;
    RAISE NOTICE '✓ Personal eliminado';

    -- 7. Opcional: Borrar jornadas configuradas
    -- Descomentar si también quieres empezar sin jornadas
    -- DELETE FROM work_schedules WHERE proyecto_id = v_proyecto_id;
    -- RAISE NOTICE '✓ Jornadas eliminadas';

    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Limpieza completada exitosamente';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Proyecto listo para:';
    RAISE NOTICE '1. Configurar jornadas en /admin/proyecto';
    RAISE NOTICE '2. Importar personal via CSV';
    RAISE NOTICE '3. Crear cuadrillas';
    RAISE NOTICE '';
END $$;

-- Verificar limpieza
SELECT 
    'Personal' as tabla,
    COUNT(*) as registros
FROM personal 
WHERE proyecto_id = 'f2579cfe-5d45-435e-8016-b6a87cbb9725'
UNION ALL
SELECT 
    'Cuadrillas' as tabla,
    COUNT(*) as registros
FROM cuadrillas 
WHERE proyecto_id = 'f2579cfe-5d45-435e-8016-b6a87cbb9725'
UNION ALL
SELECT 
    'Work Schedules' as tabla,
    COUNT(*) as registros
FROM work_schedules 
WHERE proyecto_id = 'f2579cfe-5d45-435e-8016-b6a87cbb9725';

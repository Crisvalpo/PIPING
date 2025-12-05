-- ===================================================================
-- SCRIPT DE LIMPIEZA COMPLETA
-- ===================================================================
-- Elimina TODAS las tablas y vistas relacionadas con personal/cuadrillas
-- Ejecutar SOLO si quieres empezar de cero
-- ===================================================================

-- 1. Eliminar vistas
DROP VIEW IF EXISTS personal_jerarquia CASCADE;
DROP VIEW IF EXISTS cuadrilla_members_full CASCADE;
DROP VIEW IF EXISTS cuadrillas_full CASCADE;

-- 2. Eliminar tablas de asignaciones
DROP TABLE IF EXISTS soldadores_asignaciones CASCADE;
DROP TABLE IF EXISTS maestros_asignaciones CASCADE;

-- 3. Eliminar tablas de personal
DROP TABLE IF EXISTS soldadores CASCADE;
DROP TABLE IF EXISTS cuadrilla_members CASCADE;
DROP TABLE IF EXISTS personal CASCADE;

-- 4. Eliminar funciones
DROP FUNCTION IF EXISTS asignar_soldador_a_cuadrilla CASCADE;
DROP FUNCTION IF EXISTS get_soldadores_activos_cuadrilla CASCADE;
DROP FUNCTION IF EXISTS get_historial_soldador CASCADE;
DROP FUNCTION IF EXISTS validar_rut CASCADE;
DROP FUNCTION IF EXISTS formatear_rut CASCADE;
DROP FUNCTION IF EXISTS update_personal_timestamp CASCADE;
DROP FUNCTION IF EXISTS update_maestros_timestamp CASCADE;

-- 5. NO eliminar tabla cuadrillas (tiene otros datos)
-- Solo resetear columnas si existen
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cuadrillas' AND column_name = 'supervisor_rut') THEN
        ALTER TABLE cuadrillas DROP COLUMN supervisor_rut;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cuadrillas' AND column_name = 'capataz_rut') THEN
        ALTER TABLE cuadrillas DROP COLUMN capataz_rut;
    END IF;
END $$;

-- Verificar limpieza
SELECT 
    'Tablas eliminadas' as status,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_name IN ('personal', 'soldadores', 'cuadrilla_members', 'maestros_asignaciones', 'soldadores_asignaciones');

SELECT 
    'Vistas eliminadas' as status,
    COUNT(*) as count
FROM information_schema.views
WHERE table_name IN ('personal_jerarquia', 'cuadrilla_members_full', 'cuadrillas_full');

-- Listo para empezar de cero
SELECT 'Limpieza completada. Listo para ejecutar scripts en orden.' as mensaje;

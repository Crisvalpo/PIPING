-- ======================================================
-- GUÍA: Obtener UUIDs de Usuarios para Testing
-- ======================================================

-- 1. Ver todos los usuarios del proyecto actual
SELECT 
    u.id as user_uuid,
    u.email,
    u.raw_user_meta_data->>'full_name' as nombre_completo,
    up.rol,
    p.nombre as proyecto
FROM auth.users u
LEFT JOIN user_projects up ON u.id = up.user_id
LEFT JOIN proyectos p ON up.proyecto_id = p.id
WHERE p.id = 'TU_PROYECTO_ID_AQUI'  -- Reemplazar con el ID del proyecto
ORDER BY up.rol, u.email;

-- 2. Ver solo usuarios que pueden ser soldadores/capataces
SELECT 
    u.id as user_uuid,
    u.email,
    u.raw_user_meta_data->>'full_name' as nombre_completo,
    up.rol
FROM auth.users u
LEFT JOIN user_projects up ON u.id = up.user_id
WHERE up.rol IN ('MEMBER', 'ADMIN')  -- Ajustar según tus roles
ORDER BY u.email;

-- 3. Crear usuarios de prueba para soldadores/capataces (SOLO PARA DESARROLLO)
-- NOTA: Estos usuarios necesitarán confirmar su email para activarse
-- Es mejor crearlos desde el panel de Supabase o tu aplicación

-- 4. Query rápido para copiar/pegar UUIDs durante testing
SELECT 
    'SOLDADOR: ' || u.email || ' → ' || u.id as info
FROM auth.users u
WHERE u.email LIKE '%soldador%' OR u.email LIKE '%welder%'
UNION ALL
SELECT 
    'CAPATAZ: ' || u.email || ' → ' || u.id as info
FROM auth.users u
WHERE u.email LIKE '%capataz%' OR u.email LIKE '%foreman%';

-- ======================================================
-- TESTING: Reportar Ejecución Manualmente
-- ======================================================

-- Ejemplo de UPDATE directo para testing
-- Reemplazar los UUIDs con los obtenidos de las queries anteriores

UPDATE spools_welds
SET 
    executed = TRUE,
    execution_date = '2024-12-03',
    executed_by = '123e4567-e89b-12d3-a456-426614174000',  -- UUID del soldador
    supervised_by = '987e6543-e21b-32d1-b654-321654987000' -- UUID del capataz
WHERE id = 'WELD_ID_AQUI';

-- ======================================================
-- VERIFICACIÓN: Ver Soldaduras Ejecutadas
-- ======================================================

SELECT 
    sw.weld_number,
    sw.spool_number,
    sw.destination,
    sw.executed,
    sw.execution_date,
    soldador.email as soldador_email,
    soldador.raw_user_meta_data->>'full_name' as soldador_nombre,
    capataz.email as capataz_email,
    capataz.raw_user_meta_data->>'full_name' as capataz_nombre
FROM spools_welds sw
LEFT JOIN auth.users soldador ON sw.executed_by = soldador.id
LEFT JOIN auth.users capataz ON sw.supervised_by = capataz.id
WHERE sw.executed = TRUE
ORDER BY sw.execution_date DESC, sw.spool_number;

-- ======================================================
-- ESTADÍSTICAS: Estado de Fabricación por Spool
-- ======================================================

SELECT 
    sw.spool_number,
    COUNT(*) FILTER (WHERE sw.destination = 'S') as soldaduras_taller_total,
    COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.executed = TRUE) as soldaduras_taller_ejecutadas,
    COUNT(*) FILTER (WHERE sw.destination = 'F') as soldaduras_campo_total,
    COUNT(*) FILTER (WHERE sw.destination = 'F' AND sw.executed = TRUE) as soldaduras_campo_ejecutadas,
    CASE 
        WHEN COUNT(*) FILTER (WHERE sw.destination = 'S') = 0 THEN 'N/A'
        WHEN COUNT(*) FILTER (WHERE sw.destination = 'S') = COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.executed = TRUE) THEN 'FABRICADO ✓'
        WHEN COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.executed = TRUE) > 0 THEN 'EN PROCESO 🚧'
        ELSE 'PENDIENTE ⏳'
    END as estado_fabricacion
FROM spools_welds sw
GROUP BY sw.spool_number
ORDER BY sw.spool_number;

-- ======================================================
-- CLEANUP: Resetear Ejecuciones (SOLO PARA TESTING)
-- ======================================================

-- ADVERTENCIA: Esto borrará todos los datos de ejecución
-- Usar solo en ambiente de desarrollo

-- UPDATE spools_welds
-- SET 
--     executed = FALSE,
--     execution_date = NULL,
--     executed_by = NULL,
--     supervised_by = NULL
-- WHERE revision_id = 'REVISION_ID_AQUI';

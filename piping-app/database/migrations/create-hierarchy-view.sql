-- ===================================================================
-- VISTA: Jerarquía de Personal
-- ===================================================================
-- Vista completa de la estructura organizacional
-- ===================================================================

CREATE OR REPLACE VIEW personal_jerarquia AS
SELECT 
    p.rut,
    p.nombre,
    p.email,
    p.telefono,
    p.activo,
    
    -- Determinar rol actual
    CASE 
        WHEN EXISTS(SELECT 1 FROM cuadrillas WHERE supervisor_rut = p.rut) THEN 'SUPERVISOR'
        WHEN EXISTS(SELECT 1 FROM cuadrillas WHERE capataz_rut = p.rut) THEN 'CAPATAZ'
        WHEN EXISTS(SELECT 1 FROM maestros_asignaciones WHERE maestro_rut = p.rut AND activo = TRUE) THEN 'MAESTRO'
        WHEN EXISTS(SELECT 1 FROM soldadores WHERE rut = p.rut) THEN 'SOLDADOR'
        ELSE 'SIN_ROL'
    END as rol_actual,
    
    -- Cuadrilla asignada
    COALESCE(
        (SELECT id FROM cuadrillas WHERE capataz_rut = p.rut),
        (SELECT cuadrilla_id FROM maestros_asignaciones WHERE maestro_rut = p.rut AND activo = TRUE LIMIT 1),
        (SELECT cuadrilla_id FROM soldadores_asignaciones 
         WHERE soldador_rut = p.rut AND fecha = CURRENT_DATE AND hora_fin IS NULL 
         ORDER BY hora_inicio DESC LIMIT 1)
    ) as cuadrilla_id,
    
    -- Nombre de cuadrilla
    (SELECT c.nombre FROM cuadrillas c WHERE c.id = COALESCE(
        (SELECT id FROM cuadrillas WHERE capataz_rut = p.rut),
        (SELECT cuadrilla_id FROM maestros_asignaciones WHERE maestro_rut = p.rut AND activo = TRUE LIMIT 1),
        (SELECT cuadrilla_id FROM soldadores_asignaciones 
         WHERE soldador_rut = p.rut AND fecha = CURRENT_DATE AND hora_fin IS NULL 
         ORDER BY hora_inicio DESC LIMIT 1)
    )) as cuadrilla_nombre,
    
    -- Supervisor responsable
    (SELECT supervisor_rut FROM cuadrillas c 
     WHERE c.capataz_rut = p.rut 
        OR c.id IN (SELECT cuadrilla_id FROM maestros_asignaciones WHERE maestro_rut = p.rut AND activo = TRUE)
        OR c.id IN (SELECT cuadrilla_id FROM soldadores_asignaciones 
                    WHERE soldador_rut = p.rut AND fecha = CURRENT_DATE AND hora_fin IS NULL)
     LIMIT 1) as supervisor_rut,
    
    -- Capataz responsable
    (SELECT c.capataz_rut FROM cuadrillas c
     WHERE c.id IN (SELECT cuadrilla_id FROM maestros_asignaciones WHERE maestro_rut = p.rut AND activo = TRUE)
        OR c.id IN (SELECT cuadrilla_id FROM soldadores_asignaciones 
                    WHERE soldador_rut = p.rut AND fecha = CURRENT_DATE AND hora_fin IS NULL)
     LIMIT 1) as capataz_rut,
    
    -- Estampa si es soldador
    (SELECT estampa FROM soldadores WHERE rut = p.rut) as estampa,
    
    -- Certificación si es soldador
    (SELECT certificacion_actual FROM soldadores WHERE rut = p.rut) as certificacion
    
FROM personal p
WHERE p.activo = TRUE;

-- Índice materializado para mejorar performance (opcional)
-- CREATE MATERIALIZED VIEW personal_jerarquia_mat AS SELECT * FROM personal_jerarquia;
-- CREATE UNIQUE INDEX ON personal_jerarquia_mat (rut);

COMMENT ON VIEW personal_jerarquia IS 'Vista completa de la jerarquía organizacional con roles y asignaciones actuales';

-- Verificar vista
SELECT * FROM personal_jerarquia LIMIT 5;

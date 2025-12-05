-- ======================================================
-- ACTUALIZACIÓN: Gestión de Spools como Unidad Base
-- ======================================================
-- 
-- CONTEXTO:
-- - Algunos spools son solo tramos de cañería sin uniones de taller
-- - El spool es la unidad fundamental, no las uniones
-- - Se debe poder agregar/eliminar uniones en campo por ajustes
-- ======================================================

-- 1. Agregar tabla para gestión de estado de spools
CREATE TABLE IF NOT EXISTS spool_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    spool_number TEXT NOT NULL,
    
    -- Estado del spool (independiente de las uniones)
    fabrication_status TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, FABRICADO, EN_PROCESO
    fabrication_date DATE,
    fabricated_by UUID REFERENCES auth.users(id),
    
    -- Notas y observaciones
    notes TEXT,
    has_shop_welds BOOLEAN DEFAULT TRUE, -- FALSE si es solo tramo de cañería
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: un spool por revisión
    UNIQUE(revision_id, spool_number)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_spool_status_revision ON spool_status(revision_id);
CREATE INDEX IF NOT EXISTS idx_spool_status_fabrication ON spool_status(fabrication_status);

-- 2. Función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION update_spool_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_spool_status_timestamp
    BEFORE UPDATE ON spool_status
    FOR EACH ROW
    EXECUTE FUNCTION update_spool_status_timestamp();

-- 3. Agregar campo de tracking a spools_welds para marcar si fue agregada en campo
ALTER TABLE spools_welds
ADD COLUMN IF NOT EXISTS added_in_field BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Índice para filtrar soldaduras activas
CREATE INDEX IF NOT EXISTS idx_spools_welds_active ON spools_welds(id) WHERE deleted_at IS NULL;

-- 4. Vista mejorada de estado de fabricación considerando spools sin uniones
CREATE OR REPLACE VIEW spool_fabrication_status_v2 AS
SELECT 
    COALESCE(ss.revision_id, sw.revision_id) as revision_id,
    COALESCE(ss.spool_number, sw.spool_number) as spool_number,
    
    -- Estado manual del spool
    ss.fabrication_status as manual_status,
    ss.fabrication_date,
    ss.has_shop_welds,
    ss.notes,
    
    -- Conteo de soldaduras
    COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.deleted_at IS NULL) as shop_welds_total,
    COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.executed = TRUE AND sw.deleted_at IS NULL) as shop_welds_executed,
    COUNT(*) FILTER (WHERE sw.destination = 'F' AND sw.deleted_at IS NULL) as field_welds_total,
    COUNT(*) FILTER (WHERE sw.destination = 'F' AND sw.executed = TRUE AND sw.deleted_at IS NULL) as field_welds_executed,
    COUNT(*) FILTER (WHERE sw.added_in_field = TRUE AND sw.deleted_at IS NULL) as welds_added_in_field,
    
    -- Estado calculado (basado en soldaduras)
    CASE 
        -- Si hay estado manual, usarlo
        WHEN ss.fabrication_status IS NOT NULL THEN ss.fabrication_status
        -- Si no hay soldaduras de taller, puede marcarse como fabricado
        WHEN COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.deleted_at IS NULL) = 0 THEN 'SIN_SOLDADURAS_TALLER'
        -- Si todas las soldaduras de taller están ejecutadas
        WHEN COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.deleted_at IS NULL) = 
             COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.executed = TRUE AND sw.deleted_at IS NULL) 
             AND COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.deleted_at IS NULL) > 0
        THEN 'FABRICADO'
        -- Si hay algunas ejecutadas
        WHEN COUNT(*) FILTER (WHERE sw.destination = 'S' AND sw.executed = TRUE AND sw.deleted_at IS NULL) > 0 
        THEN 'EN_PROCESO'
        ELSE 'PENDIENTE'
    END as calculated_status,
    
    -- Fecha de actualización
    GREATEST(ss.updated_at, MAX(sw.updated_at)) as last_updated
    
FROM spool_status ss
FULL OUTER JOIN spools_welds sw ON ss.revision_id = sw.revision_id AND ss.spool_number = sw.spool_number
GROUP BY ss.id, ss.revision_id, ss.spool_number, ss.fabrication_status, ss.fabrication_date, 
         ss.has_shop_welds, ss.notes, ss.updated_at, sw.revision_id, sw.spool_number;

COMMENT ON VIEW spool_fabrication_status_v2 IS 'Vista mejorada que considera spools sin soldaduras de taller y permite estado manual';

-- 5. Función para marcar spool como fabricado
CREATE OR REPLACE FUNCTION mark_spool_as_fabricated(
    p_revision_id UUID,
    p_spool_number TEXT,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO spool_status (revision_id, spool_number, fabrication_status, fabrication_date, fabricated_by, notes)
    VALUES (p_revision_id, p_spool_number, 'FABRICADO', CURRENT_DATE, p_user_id, p_notes)
    ON CONFLICT (revision_id, spool_number) 
    DO UPDATE SET 
        fabrication_status = 'FABRICADO',
        fabrication_date = CURRENT_DATE,
        fabricated_by = p_user_id,
        notes = COALESCE(p_notes, spool_status.notes),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. Función para soft-delete de soldaduras (no elimina, marca como eliminada)
CREATE OR REPLACE FUNCTION soft_delete_weld(
    p_weld_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE spools_welds
    SET 
        deleted_at = NOW(),
        deleted_by = p_user_id,
        deletion_reason = p_reason
    WHERE id = p_weld_id AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Soldadura no encontrada o ya eliminada';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Función para restaurar soldadura eliminada
CREATE OR REPLACE FUNCTION restore_weld(p_weld_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE spools_welds
    SET 
        deleted_at = NULL,
        deleted_by = NULL,
        deletion_reason = NULL
    WHERE id = p_weld_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Soldadura no encontrada';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Comentarios de documentación
COMMENT ON TABLE spool_status IS 'Gestión del estado de fabricación de spools independiente de las soldaduras';
COMMENT ON COLUMN spool_status.has_shop_welds IS 'FALSE si el spool es solo tramo de cañería sin soldaduras de taller';
COMMENT ON COLUMN spools_welds.added_in_field IS 'TRUE si la soldadura fue agregada en campo por ajustes';
COMMENT ON COLUMN spools_welds.deleted_at IS 'Soft delete: fecha de eliminación de la soldadura';

-- Ejemplos de uso:
-- ==================

-- Marcar spool sin soldaduras como fabricado:
-- SELECT mark_spool_as_fabricated(
--     'revision-uuid',
--     'SP101',
--     'user-uuid',
--     'Spool de cañería simple, sin soldaduras de taller'
-- );

-- Eliminar soldadura (soft delete):
-- SELECT soft_delete_weld(
--     'weld-uuid',
--     'user-uuid',
--     'Ajuste en campo: soldadura no necesaria'
-- );

-- Ver estado de todos los spools:
-- SELECT * FROM spool_fabrication_status_v2 ORDER BY spool_number;

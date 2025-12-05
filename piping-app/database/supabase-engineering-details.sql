-- =====================================================
-- DETALLES DE INGENIERÍA: SPOOLS, WELDS, MATERIAL y BOLTED JOINTS
-- =====================================================
-- Este script crea las tablas para almacenar los detalles de ingeniería
-- de cada revisión spooleada, incluyendo:
-- 1. spools_welds: Información de soldaduras por spool
-- 2. material_take_off: Listado de materiales por spool
-- 3. bolted_joints: Juntas empernadas del isométrico
-- =====================================================

-- =====================================================
-- 1. TABLA: spools_welds
-- =====================================================
-- Almacena las soldaduras asociadas a cada spool de una revisión
-- Columnas según plantilla:
-- "ISO NUMBER	REV	LINE NUMBER	SPOOL NUMBER	SHEET	WELD NUMBER	
--  DESTINATION	TYPE WELD	NPS	SCH	THICKNESS	PIPING CLASS	MATERIAL"

CREATE TABLE IF NOT EXISTS public.spools_welds (
    id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
    revision_id UUID NOT NULL,
    proyecto_id UUID NOT NULL, -- Desnormalizado para facilitar búsquedas
    
    -- Datos del Excel
    iso_number TEXT NOT NULL,
    rev TEXT NOT NULL,
    line_number TEXT NULL,
    spool_number TEXT NOT NULL,
    sheet TEXT NULL,
    weld_number TEXT NOT NULL, -- Identificador de la soldadura
    destination TEXT NULL, -- Destino de la soldadura (ej: FIELD, SHOP)
    type_weld TEXT NULL, -- Tipo de soldadura (BW, SW, etc)
    nps TEXT NULL, -- Tamaño nominal (pulgadas)
    sch TEXT NULL, -- Schedule
    thickness TEXT NULL, -- Espesor
    piping_class TEXT NULL, -- Clase de tubería
    material TEXT NULL, -- Material
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    created_by UUID NULL,
    
    CONSTRAINT spools_welds_pkey PRIMARY KEY (id),
    CONSTRAINT spools_welds_revision_id_fkey FOREIGN KEY (revision_id) 
        REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    CONSTRAINT spools_welds_proyecto_id_fkey FOREIGN KEY (proyecto_id) 
        REFERENCES proyectos(id) ON DELETE CASCADE,
    CONSTRAINT spools_welds_created_by_fkey FOREIGN KEY (created_by) 
        REFERENCES auth.users(id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Índices para spools_welds
CREATE INDEX IF NOT EXISTS idx_spools_welds_revision 
ON public.spools_welds USING btree (revision_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_spools_welds_proyecto 
ON public.spools_welds USING btree (proyecto_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_spools_welds_spool_number 
ON public.spools_welds USING btree (spool_number) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_spools_welds_weld_number 
ON public.spools_welds USING btree (weld_number) TABLESPACE pg_default;

-- Comentarios
COMMENT ON TABLE public.spools_welds IS 'Detalles de soldaduras asociadas a spools de una revisión específica';
COMMENT ON COLUMN public.spools_welds.weld_number IS 'Número identificador de la soldadura (ej: W-01, W-02)';
COMMENT ON COLUMN public.spools_welds.destination IS 'Destino: SHOP (taller) o FIELD (campo)';
COMMENT ON COLUMN public.spools_welds.type_weld IS 'Tipo de soldadura: BW (Butt Weld), SW (Socket Weld), etc.';

-- =====================================================
-- 2. TABLA: material_take_off
-- =====================================================
-- Almacena el listado de materiales por spool
-- Columnas según plantilla:
-- "LINE NUMBER	AREA	SHEET	SPOOL NUMBER	SPOOL-ID	PIPING CLASS	REV	
--  QTY	QTY UNIT	ITEM CODE	FAB"

CREATE TABLE IF NOT EXISTS public.material_take_off (
    id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
    revision_id UUID NOT NULL,
    proyecto_id UUID NOT NULL,
    
    -- Datos del Excel
    line_number TEXT NULL,
    area TEXT NULL,
    sheet TEXT NULL,
    spool_number TEXT NOT NULL,
    spool_id TEXT NULL, -- SPOOL-ID del Excel
    piping_class TEXT NULL,
    rev TEXT NOT NULL,
    qty DECIMAL(10,2) NULL, -- Cantidad
    qty_unit TEXT NULL, -- Unidad de medida (m, kg, EA, etc)
    item_code TEXT NULL, -- Código del material/ítem
    fab TEXT NULL, -- Fabricación (Shop/Field)
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    created_by UUID NULL,
    
    CONSTRAINT material_take_off_pkey PRIMARY KEY (id),
    CONSTRAINT material_take_off_revision_id_fkey FOREIGN KEY (revision_id) 
        REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    CONSTRAINT material_take_off_proyecto_id_fkey FOREIGN KEY (proyecto_id) 
        REFERENCES proyectos(id) ON DELETE CASCADE,
    CONSTRAINT material_take_off_created_by_fkey FOREIGN KEY (created_by) 
        REFERENCES auth.users(id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Índices para material_take_off
CREATE INDEX IF NOT EXISTS idx_material_take_off_revision 
ON public.material_take_off USING btree (revision_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_material_take_off_proyecto 
ON public.material_take_off USING btree (proyecto_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_material_take_off_spool_number 
ON public.material_take_off USING btree (spool_number) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_material_take_off_item_code 
ON public.material_take_off USING btree (item_code) TABLESPACE pg_default;

-- Comentarios
COMMENT ON TABLE public.material_take_off IS 'Listado de materiales (Material Take-Off) por spool de una revisión';
COMMENT ON COLUMN public.material_take_off.item_code IS 'Código del ítem/material según catálogo';
COMMENT ON COLUMN public.material_take_off.qty_unit IS 'Unidad de medida: EA (each), m (metros), kg, etc.';
COMMENT ON COLUMN public.material_take_off.fab IS 'Fabricación: SHOP (taller) o FIELD (campo)';

-- =====================================================
-- 3. TABLA: bolted_joints
-- =====================================================
-- Almacena las juntas empernadas del isométrico
-- Columnas según plantilla:
-- "ISO NUMBER	REV	LINE NUMBER	SHEET	FLANGED JOINT NUMBER	
--  PIPING CLASS	MATERIAL	RATING	NPS	BOLT SIZE"

CREATE TABLE IF NOT EXISTS public.bolted_joints (
    id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
    revision_id UUID NOT NULL,
    proyecto_id UUID NOT NULL,
    
    -- Datos del Excel
    iso_number TEXT NOT NULL,
    rev TEXT NOT NULL,
    line_number TEXT NULL,
    sheet TEXT NULL,
    flanged_joint_number TEXT NOT NULL, -- Número de la junta empernada
    piping_class TEXT NULL,
    material TEXT NULL,
    rating TEXT NULL, -- Clasificación de presión (150#, 300#, etc)
    nps TEXT NULL, -- Tamaño nominal
    bolt_size TEXT NULL, -- Tamaño de pernos
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    created_by UUID NULL,
    
    CONSTRAINT bolted_joints_pkey PRIMARY KEY (id),
    CONSTRAINT bolted_joints_revision_id_fkey FOREIGN KEY (revision_id) 
        REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    CONSTRAINT bolted_joints_proyecto_id_fkey FOREIGN KEY (proyecto_id) 
        REFERENCES proyectos(id) ON DELETE CASCADE,
    CONSTRAINT bolted_joints_created_by_fkey FOREIGN KEY (created_by) 
        REFERENCES auth.users(id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Índices para bolted_joints
CREATE INDEX IF NOT EXISTS idx_bolted_joints_revision 
ON public.bolted_joints USING btree (revision_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_bolted_joints_proyecto 
ON public.bolted_joints USING btree (proyecto_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_bolted_joints_joint_number 
ON public.bolted_joints USING btree (flanged_joint_number) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_bolted_joints_iso_number 
ON public.bolted_joints USING btree (iso_number) TABLESPACE pg_default;

-- Comentarios
COMMENT ON TABLE public.bolted_joints IS 'Juntas empernadas (flanged joints) del isométrico';
COMMENT ON COLUMN public.bolted_joints.flanged_joint_number IS 'Número identificador de la junta empernada';
COMMENT ON COLUMN public.bolted_joints.rating IS 'Clasificación de presión: 150#, 300#, 600#, etc.';
COMMENT ON COLUMN public.bolted_joints.bolt_size IS 'Tamaño de los pernos (ej: 5/8", 3/4")';

-- =====================================================
-- 4. POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.spools_welds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_take_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bolted_joints ENABLE ROW LEVEL SECURITY;

-- Políticas para spools_welds
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver spools_welds" ON public.spools_welds;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar spools_welds" ON public.spools_welds;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar spools_welds" ON public.spools_welds;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar spools_welds" ON public.spools_welds;

CREATE POLICY "Usuarios autenticados pueden ver spools_welds"
ON public.spools_welds FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Usuarios autenticados pueden insertar spools_welds"
ON public.spools_welds FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Usuarios autenticados pueden actualizar spools_welds"
ON public.spools_welds FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Usuarios autenticados pueden eliminar spools_welds"
ON public.spools_welds FOR DELETE TO authenticated USING (TRUE);

-- Políticas para material_take_off
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver material_take_off" ON public.material_take_off;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar material_take_off" ON public.material_take_off;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar material_take_off" ON public.material_take_off;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar material_take_off" ON public.material_take_off;

CREATE POLICY "Usuarios autenticados pueden ver material_take_off"
ON public.material_take_off FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Usuarios autenticados pueden insertar material_take_off"
ON public.material_take_off FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Usuarios autenticados pueden actualizar material_take_off"
ON public.material_take_off FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Usuarios autenticados pueden eliminar material_take_off"
ON public.material_take_off FOR DELETE TO authenticated USING (TRUE);

-- Políticas para bolted_joints
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver bolted_joints" ON public.bolted_joints;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar bolted_joints" ON public.bolted_joints;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar bolted_joints" ON public.bolted_joints;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar bolted_joints" ON public.bolted_joints;

CREATE POLICY "Usuarios autenticados pueden ver bolted_joints"
ON public.bolted_joints FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Usuarios autenticados pueden insertar bolted_joints"
ON public.bolted_joints FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Usuarios autenticados pueden actualizar bolted_joints"
ON public.bolted_joints FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Usuarios autenticados pueden eliminar bolted_joints"
ON public.bolted_joints FOR DELETE TO authenticated USING (TRUE);

-- =====================================================
-- 5. FUNCIÓN: Verificar si una revisión debe ser spooleada automáticamente
-- =====================================================
-- Esta función verifica si existe una revisión anterior spooleada.
-- Si no existe, retorna TRUE (debe spoolearse automáticamente)
-- Si existe, retorna FALSE (requiere evaluación de impactos)

CREATE OR REPLACE FUNCTION public.should_auto_spool_revision(
    p_revision_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_isometric_id UUID;
    v_current_rev_code TEXT;
    v_previous_spooled_count INTEGER;
BEGIN
    -- Obtener el isométrico y código de la revisión actual
    SELECT isometric_id, codigo 
    INTO v_isometric_id, v_current_rev_code
    FROM isometric_revisions
    WHERE id = p_revision_id;
    
    IF v_isometric_id IS NULL THEN
        RAISE EXCEPTION 'Revisión no encontrada: %', p_revision_id;
    END IF;
    
    -- Contar revisiones anteriores que estén spooleadas
    SELECT COUNT(*)
    INTO v_previous_spooled_count
    FROM isometric_revisions
    WHERE isometric_id = v_isometric_id
        AND id != p_revision_id
        AND (spooling_status = 'SPOOLEADO' OR spooling_status LIKE '%SPOOLEADO%');
    
    -- Si no hay revisiones spooleadas anteriormente, auto-spool
    RETURN (v_previous_spooled_count = 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.should_auto_spool_revision IS 
'Determina si una revisión debe marcarse como SPOOLEADO automáticamente (sin evaluación de impactos)';

-- =====================================================
-- 6. FUNCIÓN: Marcar revisión como spooleada
-- =====================================================
-- Marca una revisión como SPOOLEADO y actualiza la fecha

CREATE OR REPLACE FUNCTION public.mark_revision_as_spooled(
    p_revision_id UUID,
    p_user_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE isometric_revisions
    SET 
        spooling_status = 'SPOOLEADO',
        spooling_date = NOW(),
        updated_at = NOW()
    WHERE id = p_revision_id;
    
    -- Log opcional: podríamos crear una tabla de auditoría aquí
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.mark_revision_as_spooled IS 
'Marca una revisión como SPOOLEADO y actualiza las fechas correspondientes';

-- =====================================================
-- 7. VISTA: Detalles de ingeniería completos por revisión
-- =====================================================
-- Vista que consolida todos los detalles de una revisión

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
    
    -- Metadatos del isométrico
    ir.created_at,
    ir.spooling_date,
    i.area,
    i.line_number,
    i.sub_area,
    i.line_type
    
FROM isometric_revisions ir
JOIN isometrics i ON ir.isometric_id = i.id;

COMMENT ON VIEW public.v_revision_engineering_details IS 
'Vista consolidada de detalles de ingeniería por revisión con contadores';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

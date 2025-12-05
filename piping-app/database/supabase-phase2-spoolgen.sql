-- FASE 2.1: AJUSTE A MODELO SPOOLGEN
-- Adaptamos la BD para recibir la estructura exacta del JSON de SpoolGen.

-- 1. Tabla de Materiales (MTO)
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    spool_id UUID REFERENCES spools(id) ON DELETE CASCADE, -- Vinculado al spool
    
    item_code TEXT, -- "CODO90-6-A1P6"
    descripcion TEXT,
    qty DECIMAL(10,2),
    qty_unit TEXT, -- "EA", "M"
    
    piping_class TEXT, -- "A1P6"
    traceability_code TEXT, -- Colada / Heat Number (Futuro)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enriquecer Tabla SPOOLS
-- Agregamos campos detectados en el JSON
ALTER TABLE spools 
ADD COLUMN IF NOT EXISTS sheet INTEGER, -- "sheet": 1
ADD COLUMN IF NOT EXISTS piping_class TEXT, -- "A1P6"
ADD COLUMN IF NOT EXISTS fab_location TEXT; -- "TALLER-01"

-- 3. Enriquecer Tabla JOINTS
-- Debe soportar tanto Welds como Bolted Joints
ALTER TABLE joints 
ADD COLUMN IF NOT EXISTS sheet INTEGER,
ADD COLUMN IF NOT EXISTS joint_category TEXT DEFAULT 'WELD', -- 'WELD' o 'BOLT'
ADD COLUMN IF NOT EXISTS thickness DECIMAL(8,2), -- "7.11"
ADD COLUMN IF NOT EXISTS sch TEXT, -- "STD"
ADD COLUMN IF NOT EXISTS rating TEXT, -- "150" (Para bridas)
ADD COLUMN IF NOT EXISTS bolt_size TEXT; -- "M20" (Para bridas)

-- 4. Índices para MTO
CREATE INDEX IF NOT EXISTS idx_materials_revision ON materials(revision_id);
CREATE INDEX IF NOT EXISTS idx_materials_spool ON materials(spool_id);

-- 5. RLS para Materiales
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados pueden ver materials" ON materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden insertar materials" ON materials FOR INSERT TO authenticated WITH CHECK (true);

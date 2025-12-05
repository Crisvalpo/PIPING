-- FASE 1: NÚCLEO DE INGENIERÍA Y VERSIONADO
-- Este script establece las bases para el manejo de Isométricos, Revisiones, Spools y Juntas.

-- 1. Actualizar tabla de Proyectos para soportar configuración de módulos (ej: PWHT)
ALTER TABLE proyectos 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"pwht": false, "material_control": true}'::jsonb;

-- 2. Tabla de Isométricos (El documento padre)
CREATE TABLE IF NOT EXISTS isometrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL, -- Ej: "ISO-100-01"
    descripcion TEXT,
    area TEXT,
    linea TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un isométrico es único por proyecto
    UNIQUE(proyecto_id, codigo)
);

-- 3. Tabla de Revisiones (La "foto" en el tiempo)
DO $$ BEGIN
    CREATE TYPE revision_status AS ENUM ('PENDIENTE', 'VIGENTE', 'OBSOLETA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS isometric_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    isometric_id UUID NOT NULL REFERENCES isometrics(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL, -- Ej: "0", "A", "1"
    estado revision_status DEFAULT 'PENDIENTE',
    fecha_emision DATE,
    archivo_url TEXT, -- Link al PDF en Storage
    comentarios TEXT,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- No pueden existir dos revisiones con el mismo código para el mismo isométrico
    UNIQUE(isometric_id, codigo)
);

-- 4. Tabla de Spools (Asociados a una REVISIÓN específica)
CREATE TABLE IF NOT EXISTS spools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    
    nombre TEXT NOT NULL, -- Ej: "SP-01"
    diametro_pulg DECIMAL(5,2),
    material TEXT,
    cedula TEXT, -- Schedule
    peso DECIMAL(10,2),
    
    -- Flags críticos de ingeniería
    requiere_pwht BOOLEAN DEFAULT false,
    requiere_pintura BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Juntas / Joints (Asociados a una REVISIÓN específica)
CREATE TABLE IF NOT EXISTS joints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    spool_id UUID REFERENCES spools(id) ON DELETE SET NULL, -- Puede pertenecer a un spool o ser de campo (field)
    
    tag TEXT NOT NULL, -- Ej: "W-01"
    tipo TEXT, -- BW, SW, SO, TH
    diametro_pulg DECIMAL(5,2),
    cedula TEXT,
    material TEXT,
    
    -- Clasificación
    categoria TEXT DEFAULT 'SHOP', -- SHOP (Taller) o FIELD (Campo)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_isometrics_proyecto ON isometrics(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_revisions_isometric ON isometric_revisions(isometric_id);
CREATE INDEX IF NOT EXISTS idx_spools_revision ON spools(revision_id);
CREATE INDEX IF NOT EXISTS idx_joints_revision ON joints(revision_id);

-- 7. Políticas RLS (Seguridad)
-- Habilitar RLS
ALTER TABLE isometrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE isometric_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spools ENABLE ROW LEVEL SECURITY;
ALTER TABLE joints ENABLE ROW LEVEL SECURITY;

-- Políticas simples: Si tienes acceso al proyecto (via empresa), puedes ver/editar.
-- Por ahora, usaremos una política permisiva para usuarios autenticados para facilitar el desarrollo,
-- pero idealmente deberíamos validar contra la tabla 'miembros_proyecto' o similar.

-- Lectura para todos los autenticados (Refinar luego)
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver isométricos" ON isometrics;
CREATE POLICY "Usuarios autenticados pueden ver isométricos" ON isometrics FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver revisiones" ON isometric_revisions;
CREATE POLICY "Usuarios autenticados pueden ver revisiones" ON isometric_revisions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver spools" ON spools;
CREATE POLICY "Usuarios autenticados pueden ver spools" ON spools FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver joints" ON joints;
CREATE POLICY "Usuarios autenticados pueden ver joints" ON joints FOR SELECT TO authenticated USING (true);

-- Escritura (Refinar luego para solo Admins/Ingeniería)
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar isométricos" ON isometrics;
CREATE POLICY "Usuarios autenticados pueden insertar isométricos" ON isometrics FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar revisiones" ON isometric_revisions;
CREATE POLICY "Usuarios autenticados pueden insertar revisiones" ON isometric_revisions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar spools" ON spools;
CREATE POLICY "Usuarios autenticados pueden insertar spools" ON spools FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar joints" ON joints;
CREATE POLICY "Usuarios autenticados pueden insertar joints" ON joints FOR INSERT TO authenticated WITH CHECK (true);

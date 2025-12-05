-- CORRECCIÓN FASE 1: Adaptar tablas existentes
-- Este script detecta si las tablas ya existen y agrega las columnas necesarias para la nueva arquitectura.

-- 1. Asegurar que existan las tablas padre
CREATE TABLE IF NOT EXISTS isometrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    descripcion TEXT,
    area TEXT,
    linea TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(proyecto_id, codigo)
);

CREATE TYPE revision_status AS ENUM ('PENDIENTE', 'VIGENTE', 'OBSOLETA');

CREATE TABLE IF NOT EXISTS isometric_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    isometric_id UUID NOT NULL REFERENCES isometrics(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    estado revision_status DEFAULT 'PENDIENTE',
    fecha_emision DATE,
    archivo_url TEXT,
    comentarios TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(isometric_id, codigo)
);

-- 2. Modificar tabla SPOOLS si ya existe
DO $$
BEGIN
    -- Si la tabla existe pero no tiene revision_id, agregarlo
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'spools') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'spools' AND column_name = 'revision_id') THEN
            ALTER TABLE spools ADD COLUMN revision_id UUID REFERENCES isometric_revisions(id) ON DELETE CASCADE;
        END IF;
        
        -- Agregar otras columnas si faltan
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'spools' AND column_name = 'requiere_pwht') THEN
            ALTER TABLE spools ADD COLUMN requiere_pwht BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'spools' AND column_name = 'requiere_pintura') THEN
            ALTER TABLE spools ADD COLUMN requiere_pintura BOOLEAN DEFAULT false;
        END IF;
    ELSE
        -- Si no existe, crearla completa
        CREATE TABLE spools (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
            nombre TEXT NOT NULL,
            diametro_pulg DECIMAL(5,2),
            material TEXT,
            cedula TEXT,
            peso DECIMAL(10,2),
            requiere_pwht BOOLEAN DEFAULT false,
            requiere_pintura BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 3. Modificar tabla JOINTS si ya existe
DO $$
BEGIN
    -- Si la tabla existe pero no tiene revision_id, agregarlo
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'joints') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'joints' AND column_name = 'revision_id') THEN
            ALTER TABLE joints ADD COLUMN revision_id UUID REFERENCES isometric_revisions(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'joints' AND column_name = 'categoria') THEN
            ALTER TABLE joints ADD COLUMN categoria TEXT DEFAULT 'SHOP';
        END IF;
    ELSE
        -- Si no existe, crearla completa
        CREATE TABLE joints (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
            spool_id UUID REFERENCES spools(id) ON DELETE SET NULL,
            tag TEXT NOT NULL,
            tipo TEXT,
            diametro_pulg DECIMAL(5,2),
            cedula TEXT,
            material TEXT,
            categoria TEXT DEFAULT 'SHOP',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 4. Re-intentar creación de índices (ahora que las columnas existen seguro)
CREATE INDEX IF NOT EXISTS idx_isometrics_proyecto ON isometrics(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_revisions_isometric ON isometric_revisions(isometric_id);
CREATE INDEX IF NOT EXISTS idx_spools_revision ON spools(revision_id);
CREATE INDEX IF NOT EXISTS idx_joints_revision ON joints(revision_id);

-- 5. Actualizar permisos RLS
ALTER TABLE isometrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE isometric_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spools ENABLE ROW LEVEL SECURITY;
ALTER TABLE joints ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura (idempotentes)
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver isométricos" ON isometrics;
CREATE POLICY "Usuarios autenticados pueden ver isométricos" ON isometrics FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver revisiones" ON isometric_revisions;
CREATE POLICY "Usuarios autenticados pueden ver revisiones" ON isometric_revisions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver spools" ON spools;
CREATE POLICY "Usuarios autenticados pueden ver spools" ON spools FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver joints" ON joints;
CREATE POLICY "Usuarios autenticados pueden ver joints" ON joints FOR SELECT TO authenticated USING (true);

-- Políticas de escritura
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar isométricos" ON isometrics;
CREATE POLICY "Usuarios autenticados pueden insertar isométricos" ON isometrics FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar revisiones" ON isometric_revisions;
CREATE POLICY "Usuarios autenticados pueden insertar revisiones" ON isometric_revisions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar spools" ON spools;
CREATE POLICY "Usuarios autenticados pueden insertar spools" ON spools FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar joints" ON joints;
CREATE POLICY "Usuarios autenticados pueden insertar joints" ON joints FOR INSERT TO authenticated WITH CHECK (true);

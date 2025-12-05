-- =====================================================
-- FASE 3 REFINADA: ANUNCIO DE REVISIONES NORMALIZADO
-- =====================================================
-- Modelo completo con trazabilidad TML y múltiples PDFs
-- Fecha: 2025-11-28
-- =====================================================

-- 1. ENRIQUECER TABLA ISOMETRICS
-- Agregar campos del modelo de negocio EPC
ALTER TABLE isometrics
ADD COLUMN IF NOT EXISTS line_number TEXT,
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS sub_area TEXT,
ADD COLUMN IF NOT EXISTS line_type TEXT,
ADD COLUMN IF NOT EXISTS current_revision_id UUID REFERENCES isometric_revisions(id);

-- 2. ENRIQUECER TABLA ISOMETRIC_REVISIONS
-- Campos de trazabilidad y transmittals
ALTER TABLE isometric_revisions
ADD COLUMN IF NOT EXISTS revision_number TEXT, -- Número normalizado de revisión
ADD COLUMN IF NOT EXISTS client_file_code TEXT, -- ARCHIVO (código del cliente)
ADD COLUMN IF NOT EXISTS client_revision_code TEXT, -- REV. ARCHIVO
ADD COLUMN IF NOT EXISTS transmittal_code TEXT, -- TML
ADD COLUMN IF NOT EXISTS transmittal_number TEXT, -- N° TML
ADD COLUMN IF NOT EXISTS transmittal_date DATE, -- FECHA

-- Campos de spooling
ADD COLUMN IF NOT EXISTS spooling_status TEXT, -- ESTADO SPOOLING
ADD COLUMN IF NOT EXISTS spooling_date DATE, -- FECHA SPOOLING
ADD COLUMN IF NOT EXISTS spooling_sent_date DATE, -- FECHA DE ENVIO

-- Campos de progreso (opcional, útil para dashboards)
ADD COLUMN IF NOT EXISTS total_joints_count INTEGER, -- TOTAL
ADD COLUMN IF NOT EXISTS executed_joints_count INTEGER, -- EJECUTADO
ADD COLUMN IF NOT EXISTS pending_joints_count INTEGER, -- FALTANTES

-- Comentarios
ADD COLUMN IF NOT EXISTS comment TEXT, -- COMENTARIO

-- Deprecar pdf_url (ahora usamos revision_files)
ADD COLUMN IF NOT EXISTS description TEXT; -- Descripción general

-- 3. CREAR TABLA REVISION_FILES
-- Permite múltiples PDFs/IDFs por revisión
CREATE TABLE IF NOT EXISTS revision_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_id UUID NOT NULL REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    
    file_url TEXT NOT NULL, -- URL del archivo (Supabase Storage o externa)
    file_type TEXT DEFAULT 'pdf', -- 'pdf', 'idf', 'dwg', etc.
    file_name TEXT, -- Nombre original del archivo
    version_number INTEGER DEFAULT 1, -- Versión del archivo (1, 2, 3...)
    
    uploaded_by UUID REFERENCES auth.users(id), -- Quién lo subió
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    is_primary BOOLEAN DEFAULT false, -- Si es el archivo principal
    file_size_bytes BIGINT, -- Tamaño del archivo
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ÍNDICES PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_isometrics_current_rev ON isometrics(current_revision_id);
CREATE INDEX IF NOT EXISTS idx_isometrics_line ON isometrics(line_number);
CREATE INDEX IF NOT EXISTS idx_isometrics_area ON isometrics(area);

CREATE INDEX IF NOT EXISTS idx_revisions_iso ON isometric_revisions(isometric_id);
CREATE INDEX IF NOT EXISTS idx_revisions_status ON isometric_revisions(estado);
CREATE INDEX IF NOT EXISTS idx_revisions_spooling ON isometric_revisions(spooling_status);

CREATE INDEX IF NOT EXISTS idx_revision_files_revision ON revision_files(revision_id);
CREATE INDEX IF NOT EXISTS idx_revision_files_type ON revision_files(file_type);

-- 5. ROW LEVEL SECURITY
ALTER TABLE revision_files ENABLE ROW LEVEL SECURITY;

-- Permitir lectura a usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver archivos" ON revision_files;
CREATE POLICY "Usuarios autenticados pueden ver archivos" 
ON revision_files FOR SELECT 
TO authenticated 
USING (true);

-- Permitir inserción a usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir archivos" ON revision_files;
CREATE POLICY "Usuarios autenticados pueden subir archivos" 
ON revision_files FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Permitir actualización al dueño o admin
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus archivos" ON revision_files;
CREATE POLICY "Usuarios pueden actualizar sus archivos" 
ON revision_files FOR UPDATE 
TO authenticated 
USING (uploaded_by = auth.uid() OR auth.jwt() ->> 'role' = 'ADMIN');

-- Permitir eliminación al dueño o admin
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus archivos" ON revision_files;
CREATE POLICY "Usuarios pueden eliminar sus archivos" 
ON revision_files FOR DELETE 
TO authenticated 
USING (uploaded_by = auth.uid() OR auth.jwt() ->> 'role' = 'ADMIN');

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================
-- Ejecuta estas queries para verificar:

-- 1. Verificar columnas de isometrics
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'isometrics'
  AND column_name IN ('line_number', 'area', 'sub_area', 'line_type', 'current_revision_id')
ORDER BY column_name;

-- 2. Verificar columnas de isometric_revisions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'isometric_revisions'
  AND column_name IN (
    'revision_number', 'client_file_code', 'client_revision_code',
    'transmittal_code', 'transmittal_number', 'transmittal_date',
    'spooling_status', 'spooling_date', 'spooling_sent_date',
    'total_joints_count', 'executed_joints_count', 'pending_joints_count',
    'comment', 'description'
  )
ORDER BY column_name;

-- 3. Verificar tabla revision_files
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'revision_files'
ORDER BY ordinal_position;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- isometrics: 5 nuevas columnas
-- isometric_revisions: 14 nuevas columnas
-- revision_files: tabla completa creada
-- =====================================================

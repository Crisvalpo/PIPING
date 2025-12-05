-- =====================================================
-- ACTUALIZACIÓN DE ESQUEMA: ANUNCIO DE REVISIONES
-- =====================================================
-- Este script actualiza las tablas isometric_revisions y 
-- crea revision_files para soportar la funcionalidad completa
-- de Anuncio de Revisiones con carga de PDFs
-- =====================================================

-- 1. Agregar columnas faltantes a isometric_revisions
-- =====================================================

-- Columnas de trazabilidad de recepción de documentos
ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS client_file_code TEXT NULL;

ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS client_revision_code TEXT NULL;

ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS transmittal_code TEXT NULL;

ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS transmittal_number TEXT NULL;

ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS transmittal_date TIMESTAMP WITH TIME ZONE NULL;

-- Columnas de estado de spooling
ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS spooling_status TEXT NULL DEFAULT 'PENDIENTE';

ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS spooling_date TIMESTAMP WITH TIME ZONE NULL;

ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS spooling_sent_date TIMESTAMP WITH TIME ZONE NULL;

-- Columnas de conteo de juntas
ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS total_joints_count INTEGER NULL DEFAULT 0;

ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS executed_joints_count INTEGER NULL DEFAULT 0;

ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS pending_joints_count INTEGER NULL DEFAULT 0;

-- Columna de comentarios
ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS comment TEXT NULL;

-- Flags de formato disponible
ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS has_pdf BOOLEAN NULL DEFAULT FALSE;

ALTER TABLE public.isometric_revisions 
ADD COLUMN IF NOT EXISTS has_idf BOOLEAN NULL DEFAULT FALSE;

-- 2. Crear tabla revision_files para almacenar PDFs y otros archivos
-- =====================================================

CREATE TABLE IF NOT EXISTS public.revision_files (
    id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
    revision_id UUID NOT NULL,
    file_url TEXT NOT NULL, -- Path en Supabase Storage
    file_type TEXT NOT NULL DEFAULT 'pdf', -- 'pdf', 'idf', 'dwg', 'other'
    file_name TEXT NULL,
    file_size_bytes BIGINT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by UUID NULL,
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    
    CONSTRAINT revision_files_pkey PRIMARY KEY (id),
    CONSTRAINT revision_files_revision_id_fkey FOREIGN KEY (revision_id) 
        REFERENCES isometric_revisions(id) ON DELETE CASCADE,
    CONSTRAINT revision_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) 
        REFERENCES auth.users(id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Índices para revision_files
CREATE INDEX IF NOT EXISTS idx_revision_files_revision 
ON public.revision_files USING btree (revision_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_revision_files_type 
ON public.revision_files USING btree (file_type) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_revision_files_primary 
ON public.revision_files USING btree (is_primary) 
TABLESPACE pg_default
WHERE is_primary = TRUE;

-- 3. Políticas RLS para revision_files
-- =====================================================

ALTER TABLE public.revision_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver archivos de revisión" ON public.revision_files;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar archivos de revisión" ON public.revision_files;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar archivos de revisión" ON public.revision_files;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar archivos de revisión" ON public.revision_files;

-- Políticas nuevas
CREATE POLICY "Usuarios autenticados pueden ver archivos de revisión"
ON public.revision_files FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Usuarios autenticados pueden insertar archivos de revisión"
ON public.revision_files FOR INSERT
TO authenticated
WITH CHECK (TRUE);

CREATE POLICY "Usuarios autenticados pueden actualizar archivos de revisión"
ON public.revision_files FOR UPDATE
TO authenticated
USING (TRUE);

CREATE POLICY "Usuarios autenticados pueden eliminar archivos de revisión"
ON public.revision_files FOR DELETE
TO authenticated
USING (TRUE);

-- 4. Índices adicionales para optimización
-- =====================================================

-- Índice para búsquedas por transmittal
CREATE INDEX IF NOT EXISTS idx_isometric_revisions_transmittal 
ON public.isometric_revisions USING btree (transmittal_code) TABLESPACE pg_default;

-- Índice para búsquedas por estado de spooling
CREATE INDEX IF NOT EXISTS idx_isometric_revisions_spooling_status 
ON public.isometric_revisions USING btree (spooling_status) TABLESPACE pg_default;

-- Índice compuesto para búsquedas comunes (isométrico + estado)
CREATE INDEX IF NOT EXISTS idx_isometric_revisions_iso_estado 
ON public.isometric_revisions USING btree (isometric_id, estado) TABLESPACE pg_default;

-- 5. Comentarios para documentación
-- =====================================================

COMMENT ON COLUMN public.isometric_revisions.client_file_code IS 'Código del archivo del cliente (columna ARCHIVO del Excel)';
COMMENT ON COLUMN public.isometric_revisions.client_revision_code IS 'Código de revisión del archivo del cliente (columna REV. ARCHIVO)';
COMMENT ON COLUMN public.isometric_revisions.transmittal_code IS 'Código de transmittal (columna TML)';
COMMENT ON COLUMN public.isometric_revisions.transmittal_number IS 'Número de transmittal (columna N° TML)';
COMMENT ON COLUMN public.isometric_revisions.transmittal_date IS 'Fecha del transmittal (columna FECHA)';
COMMENT ON COLUMN public.isometric_revisions.spooling_status IS 'Estado del spooling: PENDIENTE, EN PROCESO, OK';
COMMENT ON COLUMN public.isometric_revisions.spooling_date IS 'Fecha de spooling completado';
COMMENT ON COLUMN public.isometric_revisions.spooling_sent_date IS 'Fecha de envío del spooling al cliente';
COMMENT ON COLUMN public.isometric_revisions.has_pdf IS 'Indica si se recibió el formato PDF (1 en Excel)';
COMMENT ON COLUMN public.isometric_revisions.has_idf IS 'Indica si se recibió el formato IDF (1 en Excel)';

COMMENT ON TABLE public.revision_files IS 'Almacena referencias a archivos PDF, IDF, DWG subidos para cada revisión';
COMMENT ON COLUMN public.revision_files.file_url IS 'Path del archivo en Supabase Storage (ej: revisions/{revision_id}/pdf/...)';
COMMENT ON COLUMN public.revision_files.version_number IS 'Número de versión del archivo (permite múltiples versiones del mismo tipo)';
COMMENT ON COLUMN public.revision_files.is_primary IS 'Indica si este es el archivo principal para mostrar por defecto';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- Ejecutar este script en Supabase SQL Editor
-- =====================================================

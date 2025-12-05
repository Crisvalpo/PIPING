-- Crear tabla de solicitudes de acceso a empresas
CREATE TABLE IF NOT EXISTS public.solicitudes_acceso_empresa (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    mensaje text,
    estado text NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
    proyecto_asignado_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    aprobada_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    aprobada_en timestamptz,
    UNIQUE(usuario_id, empresa_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario ON public.solicitudes_acceso_empresa(usuario_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_empresa ON public.solicitudes_acceso_empresa(usuario_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON public.solicitudes_acceso_empresa(estado);

-- Habilitar RLS
ALTER TABLE public.solicitudes_acceso_empresa ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden crear sus propias solicitudes
CREATE POLICY "Users can create their own requests"
ON public.solicitudes_acceso_empresa
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_id);

-- Política: Los usuarios pueden ver sus propias solicitudes
CREATE POLICY "Users can view their own requests"
ON public.solicitudes_acceso_empresa
FOR SELECT
TO authenticated
USING (auth.uid() = usuario_id);

-- Política: Los super admins pueden ver todas las solicitudes
CREATE POLICY "Super admins can view all requests"
ON public.solicitudes_acceso_empresa
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND UPPER(rol) = 'SUPER_ADMIN'
        AND estado_usuario = 'ACTIVO'
    )
);

-- Política: Los admins de proyecto pueden ver solicitudes de su empresa
CREATE POLICY "Project admins can view requests for their company"
ON public.solicitudes_acceso_empresa
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND (es_admin_proyecto = true OR rol = 'ADMIN_PROYECTO')
        AND estado_usuario = 'ACTIVO'
        AND empresa_id = solicitudes_acceso_empresa.empresa_id
    )
);

-- Política: Los super admins pueden actualizar solicitudes
CREATE POLICY "Super admins can update requests"
ON public.solicitudes_acceso_empresa
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND UPPER(rol) = 'SUPER_ADMIN'
        AND estado_usuario = 'ACTIVO'
    )
);

-- Política: Los admins de proyecto pueden actualizar solicitudes de su empresa
CREATE POLICY "Project admins can update requests for their company"
ON public.solicitudes_acceso_empresa
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND (es_admin_proyecto = true OR rol = 'ADMIN_PROYECTO')
        AND estado_usuario = 'ACTIVO'
        AND empresa_id = solicitudes_acceso_empresa.empresa_id
    )
);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_solicitudes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_solicitudes_updated_at ON public.solicitudes_acceso_empresa;
CREATE TRIGGER trigger_update_solicitudes_updated_at
    BEFORE UPDATE ON public.solicitudes_acceso_empresa
    FOR EACH ROW
    EXECUTE FUNCTION update_solicitudes_updated_at();

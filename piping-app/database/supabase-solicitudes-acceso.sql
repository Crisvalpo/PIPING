-- ============================================
-- TABLA: solicitudes_acceso_empresa
-- Para rastrear cuando un usuario solicita unirse a una empresa existente
-- ============================================

CREATE TABLE IF NOT EXISTS public.solicitudes_acceso_empresa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    mensaje TEXT,
    estado VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE, APROBADA, RECHAZADA
    created_at TIMESTAMP DEFAULT NOW(),
    revisado_por UUID REFERENCES public.users(id),
    revisado_at TIMESTAMP,
    
    CONSTRAINT unique_solicitud UNIQUE(usuario_id, empresa_id)
);

CREATE INDEX idx_solicitudes_empresa ON public.solicitudes_acceso_empresa(empresa_id);
CREATE INDEX idx_solicitudes_usuario ON public.solicitudes_acceso_empresa(usuario_id);
CREATE INDEX idx_solicitudes_estado ON public.solicitudes_acceso_empresa(estado);

-- Habilitar RLS
ALTER TABLE public.solicitudes_acceso_empresa ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver sus propias solicitudes
CREATE POLICY "Usuarios ven sus solicitudes" 
ON public.solicitudes_acceso_empresa
FOR SELECT
USING (usuario_id = auth.uid());

-- Política: Los admins de la empresa pueden ver solicitudes
CREATE POLICY "Admins ven solicitudes de su empresa"
ON public.solicitudes_acceso_empresa
FOR SELECT
USING (
    empresa_id IN (
        SELECT empresa_id FROM public.users 
        WHERE id = auth.uid() 
        AND (es_admin_proyecto = true OR rol = 'SUPER_ADMIN')
    )
);

-- Política: Los usuarios pueden crear solicitudes
CREATE POLICY "Usuarios crean solicitudes"
ON public.solicitudes_acceso_empresa
FOR INSERT
WITH CHECK (usuario_id = auth.uid());

-- Política: Los admins pueden actualizar solicitudes
CREATE POLICY "Admins actualizan solicitudes"
ON public.solicitudes_acceso_empresa
FOR UPDATE
USING (
    empresa_id IN (
        SELECT empresa_id FROM public.users 
        WHERE id = auth.uid() 
        AND (es_admin_proyecto = true OR rol = 'SUPER_ADMIN')
    )
);

-- Verificar
SELECT 'Tabla solicitudes_acceso_empresa creada' as resultado;

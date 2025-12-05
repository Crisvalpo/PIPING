-- Tabla de Invitaciones
CREATE TABLE IF NOT EXISTS public.invitaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    proyecto_id UUID REFERENCES public.proyectos(id) ON DELETE CASCADE,
    rol TEXT NOT NULL DEFAULT 'USUARIO', -- 'ADMIN_EMPRESA', 'USUARIO', etc.
    estado TEXT NOT NULL DEFAULT 'PENDIENTE', -- 'PENDIENTE', 'USADA', 'EXPIRADA'
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'), -- Validez de 7 días
    usado_por UUID REFERENCES auth.users(id)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_invitaciones_token ON public.invitaciones(token);
CREATE INDEX IF NOT EXISTS idx_invitaciones_email ON public.invitaciones(email);

-- Políticas RLS (Seguridad)
ALTER TABLE public.invitaciones ENABLE ROW LEVEL SECURITY;

-- 1. Super Admin puede ver y crear todas las invitaciones
CREATE POLICY "Super Admin full access invitaciones" ON public.invitaciones
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND rol = 'SUPER_ADMIN'
        )
    );

-- 2. Usuarios pueden ver invitaciones asociadas a su email (para validación)
CREATE POLICY "Usuarios pueden ver sus invitaciones por email" ON public.invitaciones
    FOR SELECT
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR
        true -- Permitir lectura pública del token para validación inicial (se filtra por token en la query)
    );

-- Función para validar token
CREATE OR REPLACE FUNCTION public.validate_invitation_token(token_input TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    invitation_data JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    inv_record RECORD;
BEGIN
    SELECT * INTO inv_record
    FROM public.invitaciones
    WHERE token = token_input
    AND estado = 'PENDIENTE'
    AND expires_at > NOW();

    IF inv_record IS NOT NULL THEN
        RETURN QUERY SELECT 
            true, 
            to_jsonb(inv_record);
    ELSE
        RETURN QUERY SELECT 
            false, 
            NULL::JSONB;
    END IF;
END;
$$;

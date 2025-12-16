-- ========================================
-- RLS POLICIES PARA ACTUALIZACIÓN DE REVISIONES
-- Sistema PIPING - Roles autorizados
-- VERSIÓN FINAL CORREGIDA
-- ========================================

-- Solo estos roles pueden actualizar:
-- - OFICINA TECNICA
-- - CONTROL DOCUMENT  
-- - ADMIN
-- - SUPER_ADMIN

-- ========================================
-- POLÍTICA 1: isometric_revisions UPDATE
-- ========================================

DROP POLICY IF EXISTS "Roles autorizados pueden actualizar revisiones" ON public.isometric_revisions;

CREATE POLICY "Roles autorizados pueden actualizar revisiones"
ON public.isometric_revisions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.users u
    INNER JOIN public.isometrics iso ON iso.id = isometric_revisions.isometric_id
    WHERE u.id = auth.uid()
    AND (u.proyecto_id = iso.proyecto_id OR UPPER(u.rol) = 'SUPER_ADMIN')
    AND UPPER(u.rol) IN ('OFICINA TECNICA', 'CONTROL DOCUMENT', 'ADMIN', 'SUPER_ADMIN')
  )
)
WITH CHECK (true);

-- ========================================
-- POLÍTICA 2: isometrics UPDATE
-- ========================================

DROP POLICY IF EXISTS "Roles autorizados pueden actualizar isometricos" ON public.isometrics;

CREATE POLICY "Roles autorizados pueden actualizar isometricos"
ON public.isometrics
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.users u
    WHERE u.id = auth.uid()
    AND (u.proyecto_id = isometrics.proyecto_id OR UPPER(u.rol) = 'SUPER_ADMIN')
    AND UPPER(u.rol) IN ('OFICINA TECNICA', 'CONTROL DOCUMENT', 'ADMIN', 'SUPER_ADMIN')
  )
)
WITH CHECK (true);

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Ver políticas actuales de isometric_revisions
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'isometric_revisions';

-- Ver políticas actuales de isometrics
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'isometrics';

-- Verificar que tu usuario tiene el rol correcto
SELECT id, correo, rol, proyecto_id 
FROM public.users 
WHERE id = auth.uid();

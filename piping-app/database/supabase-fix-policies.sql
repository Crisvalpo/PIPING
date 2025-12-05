-- =====================================================
-- FIX POLICIES: Habilitar UPDATE y DELETE en tablas principales
-- =====================================================

-- 1. Políticas para isometric_revisions
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar revisiones" ON public.isometric_revisions;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar revisiones" ON public.isometric_revisions;

CREATE POLICY "Usuarios autenticados pueden actualizar revisiones"
ON public.isometric_revisions FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Usuarios autenticados pueden eliminar revisiones"
ON public.isometric_revisions FOR DELETE TO authenticated USING (TRUE);

-- 2. Políticas para isometrics (por si acaso)
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar isométricos" ON public.isometrics;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar isométricos" ON public.isometrics;

CREATE POLICY "Usuarios autenticados pueden actualizar isométricos"
ON public.isometrics FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Usuarios autenticados pueden eliminar isométricos"
ON public.isometrics FOR DELETE TO authenticated USING (TRUE);

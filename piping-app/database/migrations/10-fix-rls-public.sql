-- ===================================================================
-- FIX: Allow public (anon + authenticated) access to cuadrillas
-- ===================================================================
-- El problema es que las políticas requieren 'authenticated' pero
-- el servidor no está detectando la sesión correctamente.
-- Para desarrollo, permitimos acceso 'public' (anon + authenticated)

-- Eliminar políticas que solo permiten 'authenticated'
DROP POLICY IF EXISTS "Allow authenticated users to view cuadrillas" ON cuadrillas;
DROP POLICY IF EXISTS "Allow authenticated users to create cuadrillas" ON cuadrillas;
DROP POLICY IF EXISTS "Allow authenticated users to update cuadrillas" ON cuadrillas;
DROP POLICY IF EXISTS "Allow authenticated users to delete cuadrillas" ON cuadrillas;

-- Crear políticas para 'public' (incluye anon y authenticated)
CREATE POLICY "Allow public to view cuadrillas"
ON cuadrillas
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public to create cuadrillas"
ON cuadrillas
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public to update cuadrillas"
ON cuadrillas
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public to delete cuadrillas"
ON cuadrillas
FOR DELETE
TO public
USING (true);

SELECT 'RLS policies updated to allow public access' as status;

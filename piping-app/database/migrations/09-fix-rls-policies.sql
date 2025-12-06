-- ===================================================================
-- FIX RLS POLICIES FOR CUADRILLAS
-- ===================================================================
-- Este script corrige las políticas de seguridad (RLS) que están
-- bloqueando las operaciones de lectura/escritura en la tabla cuadrillas

-- 1. Eliminar políticas existentes que puedan estar causando conflicto
DROP POLICY IF EXISTS "Users can view cuadrillas from their projects" ON cuadrillas;
DROP POLICY IF EXISTS "Users can update cuadrillas" ON cuadrillas;
DROP POLICY IF EXISTS "Users can create cuadrillas" ON cuadrillas;
DROP POLICY IF EXISTS "Users can delete cuadrillas" ON cuadrillas;

-- 2. Habilitar RLS en la tabla (si no está habilitado)
ALTER TABLE cuadrillas ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas permisivas para usuarios autenticados
-- IMPORTANTE: En producción, estas políticas deben ser más restrictivas
-- basándose en membresía del proyecto, pero para desarrollo permitimos todo

-- Política de SELECT (lectura)
CREATE POLICY "Allow authenticated users to view cuadrillas"
ON cuadrillas
FOR SELECT
TO authenticated
USING (true);

-- Política de INSERT (creación)
CREATE POLICY "Allow authenticated users to create cuadrillas"
ON cuadrillas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política de UPDATE (edición)
CREATE POLICY "Allow authenticated users to update cuadrillas"
ON cuadrillas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política de DELETE (eliminación)
CREATE POLICY "Allow authenticated users to delete cuadrillas"
ON cuadrillas
FOR DELETE
TO authenticated
USING (true);

-- 4. Verificar que las políticas se crearon correctamente
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'cuadrillas';

SELECT 'RLS policies successfully created for cuadrillas table' as status;

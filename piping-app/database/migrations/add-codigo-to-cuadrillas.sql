-- ===================================================================
-- SCRIPT DE ACTUALIZACIÓN: Agregar columna 'codigo' a tabla cuadrillas
-- ===================================================================
-- IMPORTANTE: Ejecutar este script en el SQL Editor de Supabase
-- ===================================================================

-- Paso 1: Agregar la columna codigo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cuadrillas' 
        AND column_name = 'codigo'
    ) THEN
        -- Agregar la columna codigo
        ALTER TABLE cuadrillas 
        ADD COLUMN codigo TEXT NOT NULL DEFAULT 'CUAD-' || LPAD(FLOOR(RANDOM() * 999 + 1)::TEXT, 3, '0');
        
        RAISE NOTICE 'Columna codigo agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna codigo ya existe';
    END IF;
END $$;

-- Paso 2: Crear constraint único si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'cuadrillas_proyecto_id_codigo_key'
    ) THEN
        ALTER TABLE cuadrillas 
        ADD CONSTRAINT cuadrillas_proyecto_id_codigo_key UNIQUE(proyecto_id, codigo);
        
        RAISE NOTICE 'Constraint UNIQUE agregado exitosamente';
    ELSE
        RAISE NOTICE 'El constraint UNIQUE ya existe';
    END IF;
END $$;

-- Paso 3: Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_cuadrillas_codigo ON cuadrillas(codigo);

-- Paso 4: Verificar el resultado
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cuadrillas'
ORDER BY ordinal_position;


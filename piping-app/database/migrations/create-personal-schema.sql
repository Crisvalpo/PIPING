-- ===================================================================
-- MÓDULO: Gestión de Personal
-- ===================================================================
-- Sistema de personal con RUT, estampas de soldadores y trazabilidad
-- ===================================================================

-- 1. Tabla de Personal (Base)
CREATE TABLE IF NOT EXISTS personal (
    rut VARCHAR(12) PRIMARY KEY,  -- Formato: "12.345.678-9"
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Validación básica de RUT
    CONSTRAINT check_rut_format CHECK (rut ~ '^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9Kk]$')
);

-- 2. Tabla de Soldadores
CREATE TABLE IF NOT EXISTS soldadores (
    rut VARCHAR(12) PRIMARY KEY REFERENCES personal(rut) ON DELETE CASCADE,
    estampa VARCHAR(20) UNIQUE NOT NULL,  -- Código único del soldador
    certificacion_actual VARCHAR(100),
    fecha_vencimiento_cert DATE,
    calificaciones JSONB DEFAULT '[]',  -- WPS aprobadas
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índice para búsquedas por estampa
    CONSTRAINT check_estampa_not_empty CHECK (LENGTH(TRIM(estampa)) > 0)
);

-- 3. Modificar tabla cuadrilla_members
-- IMPORTANTE: Primero eliminar la vista que depende de user_id
DROP VIEW IF EXISTS cuadrillas_full CASCADE;

-- Ahora modificar la tabla
DO $$
BEGIN
    -- Eliminar constraint de foreign key si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'cuadrilla_members' 
        AND constraint_name LIKE '%user_id%'
    ) THEN
        ALTER TABLE cuadrilla_members DROP CONSTRAINT IF EXISTS cuadrilla_members_user_id_fkey;
    END IF;
    
    -- Eliminar columna user_id si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cuadrilla_members' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE cuadrilla_members DROP COLUMN user_id;
    END IF;
    
    -- Agregar columna rut si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cuadrilla_members' 
        AND column_name = 'rut'
    ) THEN
        ALTER TABLE cuadrilla_members ADD COLUMN rut VARCHAR(12) REFERENCES personal(rut) ON DELETE CASCADE;
    END IF;
END $$;

-- Agregar constraint único
ALTER TABLE cuadrilla_members DROP CONSTRAINT IF EXISTS unique_member_per_cuadrilla;
ALTER TABLE cuadrilla_members 
ADD CONSTRAINT unique_member_per_cuadrilla UNIQUE(cuadrilla_id, rut);

-- 4. Modificar tabla spools_welds para incluir estampa
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'spools_welds' 
        AND column_name = 'soldador_estampa'
    ) THEN
        ALTER TABLE spools_welds 
        ADD COLUMN soldador_estampa VARCHAR(20) REFERENCES soldadores(estampa);
    END IF;
END $$;

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_personal_nombre ON personal(nombre);
CREATE INDEX IF NOT EXISTS idx_personal_activo ON personal(activo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_soldadores_estampa ON soldadores(estampa);
CREATE INDEX IF NOT EXISTS idx_soldadores_cert_venc ON soldadores(fecha_vencimiento_cert);
CREATE INDEX IF NOT EXISTS idx_cuadrilla_members_rut ON cuadrilla_members(rut);
CREATE INDEX IF NOT EXISTS idx_welds_soldador_estampa ON spools_welds(soldador_estampa);

-- 6. Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION update_personal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_personal_timestamp
    BEFORE UPDATE ON personal
    FOR EACH ROW
    EXECUTE FUNCTION update_personal_timestamp();

-- 7. Vista completa de miembros con información de personal
CREATE OR REPLACE VIEW cuadrilla_members_full AS
SELECT 
    cm.id,
    cm.cuadrilla_id,
    cm.rut,
    cm.role,
    cm.fecha_ingreso,
    cm.fecha_salida,
    
    -- Info de personal
    p.nombre,
    p.email,
    p.telefono,
    p.activo as personal_activo,
    
    -- Info de soldador (si aplica)
    s.estampa,
    s.certificacion_actual,
    s.fecha_vencimiento_cert,
    
    -- Info de cuadrilla
    c.nombre as cuadrilla_nombre,
    c.codigo as cuadrilla_codigo,
    c.proyecto_id
    
FROM cuadrilla_members cm
LEFT JOIN personal p ON cm.rut = p.rut
LEFT JOIN soldadores s ON cm.rut = s.rut
LEFT JOIN cuadrillas c ON cm.cuadrilla_id = c.id;

-- 8. Función para validar RUT chileno (algoritmo módulo 11)
CREATE OR REPLACE FUNCTION validar_rut(rut_input VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    rut_limpio VARCHAR;
    cuerpo VARCHAR;
    dv_calculado CHAR;
    dv_ingresado CHAR;
    suma INT := 0;
    multiplicador INT := 2;
    i INT;
    resto INT;
BEGIN
    -- Limpiar RUT (remover puntos y guión)
    rut_limpio := REGEXP_REPLACE(rut_input, '[^0-9Kk]', '', 'g');
    
    -- Validar largo (mínimo 8 caracteres, máximo 9)
    IF LENGTH(rut_limpio) < 8 OR LENGTH(rut_limpio) > 9 THEN
        RETURN FALSE;
    END IF;
    
    -- Separar cuerpo y DV
    cuerpo := LEFT(rut_limpio, LENGTH(rut_limpio) - 1);
    dv_ingresado := UPPER(RIGHT(rut_limpio, 1));
    
    -- Calcular DV usando módulo 11
    FOR i IN REVERSE LENGTH(cuerpo)..1 LOOP
        suma := suma + (SUBSTRING(cuerpo, i, 1)::INT * multiplicador);
        multiplicador := multiplicador + 1;
        IF multiplicador > 7 THEN
            multiplicador := 2;
        END IF;
    END LOOP;
    
    resto := suma % 11;
    
    IF resto = 0 THEN
        dv_calculado := '0';
    ELSIF resto = 1 THEN
        dv_calculado := 'K';
    ELSE
        dv_calculado := (11 - resto)::CHAR;
    END IF;
    
    RETURN dv_calculado = dv_ingresado;
END;
$$ LANGUAGE plpgsql;

-- 9. Función para formatear RUT
CREATE OR REPLACE FUNCTION formatear_rut(rut_input VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    rut_limpio VARCHAR;
    cuerpo VARCHAR;
    dv CHAR;
    resultado VARCHAR;
BEGIN
    -- Limpiar RUT
    rut_limpio := REGEXP_REPLACE(rut_input, '[^0-9Kk]', '', 'g');
    
    -- Separar cuerpo y DV
    cuerpo := LEFT(rut_limpio, LENGTH(rut_limpio) - 1);
    dv := UPPER(RIGHT(rut_limpio, 1));
    
    -- Formatear con puntos y guión
    resultado := REVERSE(cuerpo);
    resultado := REGEXP_REPLACE(resultado, '([0-9]{3})', '\1.', 'g');
    resultado := TRIM(TRAILING '.' FROM resultado);
    resultado := REVERSE(resultado) || '-' || dv;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- 10. Comentarios de documentación
COMMENT ON TABLE personal IS 'Personal del proyecto identificado por RUT';
COMMENT ON TABLE soldadores IS 'Soldadores con estampas para trazabilidad';
COMMENT ON COLUMN soldadores.estampa IS 'Código único que identifica las soldaduras del soldador';
COMMENT ON COLUMN soldadores.calificaciones IS 'WPS aprobadas en formato JSON';
COMMENT ON VIEW cuadrilla_members_full IS 'Vista completa de miembros con datos de personal y soldadores';
COMMENT ON FUNCTION validar_rut IS 'Valida RUT chileno usando algoritmo módulo 11';
COMMENT ON FUNCTION formatear_rut IS 'Formatea RUT al formato XX.XXX.XXX-X';

-- Verificar estructura creada
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('personal', 'soldadores', 'cuadrilla_members')
ORDER BY table_name, ordinal_position;

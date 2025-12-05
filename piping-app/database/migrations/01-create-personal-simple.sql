-- ===================================================================
-- PASO 1: Crear Schema de Personal (SIMPLIFICADO)
-- ===================================================================
-- Crea tablas básicas sin dependencias complejas
-- ===================================================================

-- Habilitar extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Personal (Base)
CREATE TABLE IF NOT EXISTS personal (
    rut VARCHAR(12) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_rut_format CHECK (rut ~ '^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9Kk]$')
);

-- 2. Tabla de Soldadores
CREATE TABLE IF NOT EXISTS soldadores (
    rut VARCHAR(12) PRIMARY KEY REFERENCES personal(rut) ON DELETE CASCADE,
    estampa VARCHAR(20) UNIQUE NOT NULL,
    certificacion_actual VARCHAR(100),
    fecha_vencimiento_cert DATE,
    calificaciones JSONB DEFAULT '[]',
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_estampa_not_empty CHECK (LENGTH(TRIM(estampa)) > 0)
);

-- 3. Tabla cuadrilla_members (SIMPLIFICADA)
CREATE TABLE IF NOT EXISTS cuadrilla_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cuadrilla_id UUID NOT NULL REFERENCES cuadrillas(id) ON DELETE CASCADE,
    rut VARCHAR(12) NOT NULL REFERENCES personal(rut) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SOLDADOR', 'CAPATAZ', 'MAESTRO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_member_per_cuadrilla UNIQUE(cuadrilla_id, rut)
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_personal_nombre ON personal(nombre);
CREATE INDEX IF NOT EXISTS idx_personal_activo ON personal(activo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_soldadores_estampa ON soldadores(estampa);
CREATE INDEX IF NOT EXISTS idx_cuadrilla_members_rut ON cuadrilla_members(rut);
CREATE INDEX IF NOT EXISTS idx_cuadrilla_members_cuadrilla ON cuadrilla_members(cuadrilla_id);

-- 5. Función para validar RUT chileno (módulo 11)
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
    rut_limpio := REGEXP_REPLACE(rut_input, '[^0-9Kk]', '', 'g');
    
    IF LENGTH(rut_limpio) < 8 OR LENGTH(rut_limpio) > 9 THEN
        RETURN FALSE;
    END IF;
    
    cuerpo := LEFT(rut_limpio, LENGTH(rut_limpio) - 1);
    dv_ingresado := UPPER(RIGHT(rut_limpio, 1));
    
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

-- 6. Función para formatear RUT
CREATE OR REPLACE FUNCTION formatear_rut(rut_input VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    rut_limpio VARCHAR;
    cuerpo VARCHAR;
    dv CHAR;
    resultado VARCHAR;
BEGIN
    rut_limpio := REGEXP_REPLACE(rut_input, '[^0-9Kk]', '', 'g');
    cuerpo := LEFT(rut_limpio, LENGTH(rut_limpio) - 1);
    dv := UPPER(RIGHT(rut_limpio, 1));
    
    resultado := REVERSE(cuerpo);
    resultado := REGEXP_REPLACE(resultado, '([0-9]{3})', '\1.', 'g');
    resultado := TRIM(TRAILING '.' FROM resultado);
    resultado := REVERSE(resultado) || '-' || dv;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para actualizar timestamp
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

-- Verificar
SELECT 'Personal schema creado exitosamente' as status;
SELECT COUNT(*) as personal_count FROM personal;

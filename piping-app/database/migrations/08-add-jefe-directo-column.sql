-- Agregar columna jefe_directo_rut a la tabla personal
-- Esta columna permite vincular a cada trabajador con su supervisor directo

ALTER TABLE personal 
ADD COLUMN IF NOT EXISTS jefe_directo_rut VARCHAR(12);

-- Crear índice para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_personal_jefe_directo 
ON personal(jefe_directo_rut);

-- Agregar foreign key (opcional, comentado por si hay datos inconsistentes)
-- ALTER TABLE personal
-- ADD CONSTRAINT fk_personal_jefe_directo
-- FOREIGN KEY (jefe_directo_rut) REFERENCES personal(rut);

SELECT 'Columna jefe_directo_rut agregada exitosamente' as status;

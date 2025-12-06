-- Migración: Agregar campo 'jefe_directo_rut' a tabla 'personal'

ALTER TABLE personal ADD COLUMN IF NOT EXISTS jefe_directo_rut VARCHAR(12) REFERENCES personal(rut);

-- Crear índice para búsqueda rápida de subordinados
CREATE INDEX IF NOT EXISTS idx_personal_jefe_directo ON personal(jefe_directo_rut);

-- Actualizar la vista cuadrillas_full para (opcionalmente) usar esta información en el futuro
-- Por ahora no es necesario tocar la vista si solo se usa en lógica de asignación.

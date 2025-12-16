-- Agrega el valor 'ELIMINADA' al enum revision_status si no existe
ALTER TYPE revision_status ADD VALUE IF NOT EXISTS 'ELIMINADA';

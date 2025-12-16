-- Agrega nuevos valores al enum spooling_status
ALTER TYPE spooling_status ADD VALUE IF NOT EXISTS 'N/A';
ALTER TYPE spooling_status ADD VALUE IF NOT EXISTS 'SPOOLEADO - ELIMINADA';

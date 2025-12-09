-- ===================================================================
-- Migration 42: Clean up invalid estampas
-- ===================================================================
-- Removes estampas that were incorrectly generated from RUT numbers
-- Valid estampas should be short codes like S01, S02, S03, etc.
-- ===================================================================

-- First, remove the NOT NULL constraint from estampa column
ALTER TABLE soldadores ALTER COLUMN estampa DROP NOT NULL;

-- Set invalid estampas to NULL - they can be properly assigned later
UPDATE soldadores
SET estampa = NULL
WHERE estampa ~ '^S-[0-9]{8,}';

SELECT 'Estampas inválidas limpiadas exitosamente' as status;

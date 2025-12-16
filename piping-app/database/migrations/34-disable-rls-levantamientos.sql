-- Deshabilitar RLS temporalmente para evitar errores de permisos
-- Se reactivará cuando se definan los roles finales

ALTER TABLE spool_levantamientos DISABLE ROW LEVEL SECURITY;
ALTER TABLE spool_levantamiento_photos DISABLE ROW LEVEL SECURITY;

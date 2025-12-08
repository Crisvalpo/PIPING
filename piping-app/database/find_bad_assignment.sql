-- Buscar asignaciones de Mauricio Luke
-- El RUT en la imagen es 16.970.661-1
SELECT id, maestro_rut, hora_inicio, hora_fin, activo
FROM maestros_asignaciones
WHERE maestro_rut LIKE '%16.970.661-1%';

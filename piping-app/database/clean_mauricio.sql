-- Borrar la asignación corrupta para Mauricio Luke (la que tiene hora incorrecta)
DELETE FROM maestros_asignaciones 
WHERE maestro_rut LIKE '%16.970.661-1%'
  AND (hora_fin > '21:00' OR hora_inicio > '21:00');

-- Opcional: Borrar todo de él y que re-asigne limpio
-- DELETE FROM maestros_asignaciones WHERE maestro_rut LIKE '%16.970.661-1%';

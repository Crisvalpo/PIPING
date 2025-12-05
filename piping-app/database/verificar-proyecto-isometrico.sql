-- Verificar proyecto del isométrico objetivo
SELECT i.id, i.codigo, i.proyecto_id, p.nombre AS proyecto_nombre, i.created_at
FROM isometrics i
LEFT JOIN proyectos p ON p.id = i.proyecto_id
WHERE i.codigo = '3800PR-CWR-380-2002-1';

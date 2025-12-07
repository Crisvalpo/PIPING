-- VERIFICACION DE FUNCION
-- Ejecuta esto para ver si la función se actualizó correctamente.

SELECT proname, prorettype::regtype, proargtypes::regtype[]
FROM pg_proc
WHERE proname = 'get_cuadrilla_hours_history';

-- Prueba de ejecución simple (sin datos, solo para ver si crashea)
SELECT * FROM get_cuadrilla_hours_history(
    '00000000-0000-0000-0000-000000000000', 
    '2025-01-01', 
    '2025-01-01'
);

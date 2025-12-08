-- Migration: Add missing 'email' column to view_personal_with_schedule
-- This view is used by AttendanceModal.tsx

DROP VIEW IF EXISTS view_personal_with_schedule;

CREATE OR REPLACE VIEW view_personal_with_schedule AS
SELECT 
    p.rut,
    p.nombre,
    p.email, -- Added email
    p.cargo,
    p.codigo_trabajador,
    p.proyecto_id,
    ws.id as work_schedule_id,
    ws.nombre as jornada,
    ws.tipo as tipo_jornada,
    ws.dias_trabajo,
    ws.dias_descanso,
    ws.grupo as grupo_jornada,
    is_worker_on_duty(p.rut, CURRENT_DATE) as debe_trabajar_hoy
FROM personal p
LEFT JOIN work_schedules ws ON p.work_schedule_id = ws.id;

SELECT 'Migration 34: View Updated Successfully' as status;

import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Helper: Round time string "HH:MM:SS" to nearest 30 min block (HH:00 or HH:30)
function roundToNearest30Min(timeStr: string, type: 'start' | 'end'): string {
    if (!timeStr) return timeStr
    const [hours, minutes] = timeStr.split(':').map(Number)

    let newHours = hours
    let newMinutes = 0

    if (minutes < 15) {
        newMinutes = 0
    } else if (minutes < 45) {
        newMinutes = 30
    } else {
        newMinutes = 0
        newHours += 1
    }

    const h = newHours.toString().padStart(2, '0')
    const m = newMinutes.toString().padStart(2, '0')
    return `${h}:${m}:00`
}

// Helper: Calculate number of 30-min blocks between start and end
function calculateBlocks(start: string, end: string): number {
    const [h1, m1] = start.split(':').map(Number)
    const [h2, m2] = end.split(':').map(Number)
    let startMin = h1 * 60 + m1
    let endMin = h2 * 60 + m2

    // Handle overnight shifts (e.g., 20:00 to 06:00)
    if (endMin < startMin) {
        endMin += 24 * 60 // Add 24 hours
    }

    let diff = endMin - startMin
    if (diff < 0) diff = 0

    return Math.floor(diff / 30)
}

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    const projectId = params.id
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    try {
        // 1. Fetch all active shifts for this project
        let { data: shifts, error: shiftsError } = await supabase
            .from('project_shifts')
            .select('*')
            .eq('proyecto_id', projectId)
            .eq('active', true)
            .order('is_default', { ascending: false })

        if (shiftsError) throw shiftsError

        // Auto-create or Recover default shift if none exist (Fix for 404 error)
        if (!shifts || shifts.length === 0) {
            console.log('No active shifts found for project:', projectId, '- Attempting recovery...')

            // Use Admin Client to bypass RLS and handle hidden/inactive records
            const supabaseAdmin = createAdminClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            // 1. Check if there is already a DEFAULT shift (even if inactive/hidden)
            // This avoids unique constraint violation "unique_default_shift_per_project"
            const { data: existingDefault } = await supabaseAdmin
                .from('project_shifts')
                .select('*')
                .eq('proyecto_id', projectId)
                .eq('is_default', true)
                .limit(1)
                .single()

            if (existingDefault) {
                console.log('Found existing (inactive) default shift, reactivating:', existingDefault.id)
                const { data: reactivated, error: updateError } = await supabaseAdmin
                    .from('project_shifts')
                    .update({
                        active: true,
                    })
                    .eq('id', existingDefault.id)
                    .select()
                    .single()

                if (updateError) throw updateError
                shifts = [reactivated]
            } else {
                // 2. If NO default shift exists, check if ANY shift exists to promote
                const { data: anyShift } = await supabaseAdmin
                    .from('project_shifts')
                    .select('*')
                    .eq('proyecto_id', projectId)
                    .order('created_at', { ascending: true })
                    .limit(1)
                    .single()

                if (anyShift) {
                    console.log('No default shift found, but found other shift. Promoting:', anyShift.id)
                    const { data: promoted, error: updateError } = await supabaseAdmin
                        .from('project_shifts')
                        .update({
                            active: true,
                            is_default: true,
                            shift_name: anyShift.shift_name || 'Turno Base'
                        })
                        .eq('id', anyShift.id)
                        .select()
                        .single()

                    if (updateError) {
                        console.error('Error promoting shift:', updateError)
                        throw updateError
                    }
                    shifts = [promoted]
                } else {
                    console.log('No shifts exist at all. Creating new default shift.')
                    // 3. Create new default shift
                    const { data: newShift, error: createError } = await supabaseAdmin
                        .from('project_shifts')
                        .insert({
                            proyecto_id: projectId,
                            shift_name: 'Turno Base',
                            start_time: '08:00:00',
                            end_time: '18:00:00',
                            lunch_break_minutes: 60,
                            is_default: true,
                            active: true
                        })
                        .select()
                        .single()

                    if (createError) {
                        console.error('Error creating default shift:', createError)
                        return NextResponse.json({
                            success: false,
                            error: `Failed to auto-create default shift: ${createError.message}`
                        }, { status: 500 })
                    }
                    shifts = [newShift]
                }
            }
        }

        // 2. Fetch daily overrides for this date
        const { data: overrides } = await supabase
            .from('project_daily_overrides')
            .select('*')
            .eq('proyecto_id', projectId)
            .eq('date', date)
            .eq('active', true)

        const overrideMap = new Map(
            overrides?.map(o => [o.shift_id || shifts![0].id, o.new_end_time]) || []
        )

        // 3. Fetch attendance to filter absent workers
        const { data: attendance } = await supabase
            .from('asistencia_diaria')
            .select('personal_rut, presente')
            .eq('proyecto_id', projectId)
            .eq('fecha', date)
            .eq('presente', false)

        const absentSet = new Set(attendance?.map(a => a.personal_rut) || [])

        // 4. Fetch maestros assignments for this date
        const { data: maestros } = await supabase
            .from('maestros_asignaciones')
            .select(`
                id,
                cuadrilla_id,
                maestro_rut,
                hora_inicio,
                hora_fin,
                cuadrillas ( id, nombre, codigo, proyecto_id, shift_id ),
                personal:maestro_rut ( rut, nombre, cargo )
            `)
            .eq('activo', true)

        // 5. Fetch soldadores assignments for this date
        const { data: soldadores } = await supabase
            .from('soldadores_asignaciones')
            .select(`
                id,
                cuadrilla_id,
                soldador_rut,
                hora_inicio,
                hora_fin,
                cuadrillas ( id, nombre, codigo, proyecto_id, shift_id ),
                personal:soldador_rut ( rut, nombre, cargo )
            `)
            .eq('activo', true)

        // 6. Combine and filter by project
        const allAssignments = [
            ...(maestros || [])
                .map((a: any) => {
                    const c = Array.isArray(a.cuadrillas) ? a.cuadrillas[0] : a.cuadrillas
                    const p = Array.isArray(a.personal) ? a.personal[0] : a.personal
                    return { ...a, cuadrillas: c, personal: p, rut: a.maestro_rut, type: 'maestro' }
                })
                .filter(a => a.cuadrillas?.proyecto_id === projectId),
            ...(soldadores || [])
                .map((a: any) => {
                    const c = Array.isArray(a.cuadrillas) ? a.cuadrillas[0] : a.cuadrillas
                    const p = Array.isArray(a.personal) ? a.personal[0] : a.personal
                    return { ...a, cuadrillas: c, personal: p, rut: a.soldador_rut, type: 'soldador' }
                })
                .filter(a => a.cuadrillas?.proyecto_id === projectId)
        ]

        // 7. Process data grouped by shift
        const shiftResults = []

        for (const shift of shifts!) {
            // Get effective shift times (with override if exists)
            let shiftEnd = shift.end_time
            const hasOverride = overrideMap.has(shift.id)
            if (hasOverride) {
                shiftEnd = overrideMap.get(shift.id)!
            }

            // Filter assignments for this shift (read shift from cuadrilla)
            const shiftAssignments = allAssignments.filter(a => {
                const cuadrillaShift = a.cuadrillas?.shift_id
                return cuadrillaShift === shift.id || (!cuadrillaShift && shift.is_default)
            })

            const processedWorkers = []

            for (const a of shiftAssignments) {
                // Determine effective hours (worker specific or shift default)
                // Use assignment timestamps if available (e.g. late arrival / early leave stored in assignment)
                // For now we assume assignments cover the full shift unless marked otherwise

                // Logic:
                // Start = Max(ShiftStart, AssignmentStart)
                // End = Min(ShiftEnd, AssignmentEnd)

                const shiftStart = shift.start_time
                const start = a.hora_inicio || shiftStart
                const end = a.hora_fin || shiftEnd

                const roundedStart = roundToNearest30Min(start, 'start')
                const roundedEnd = roundToNearest30Min(end, 'end')

                const blocks = calculateBlocks(roundedStart, roundedEnd) // 30 min blocks
                const hours = blocks * 0.5

                processedWorkers.push({
                    rut: a.rut,
                    nombre: a.personal?.nombre || 'Desconocido',
                    cargo: a.personal?.cargo || a.type.toUpperCase(),
                    cuadrilla: a.cuadrillas?.nombre || a.cuadrillas?.codigo || 'Sin Cuadrilla',
                    raw_start: start,
                    raw_end: end,
                    rounded_start: roundedStart,
                    rounded_end: roundedEnd,
                    blocks,
                    hours
                })
            }

            // Calculate shift stats
            const activeCrews = new Set(shiftAssignments.map(a => a.cuadrilla_id)).size
            // Filter absent workers
            const presentWorkersList = processedWorkers.filter(w => !absentSet.has(w.rut))
            const totalHoursShift = presentWorkersList.reduce((sum, w) => sum + w.hours, 0)

            shiftResults.push({
                id: shift.id,
                name: shift.shift_name,
                start: shift.start_time,
                end: shiftEnd,
                lunch_minutes: shift.lunch_break_minutes,
                is_default: shift.is_default,
                override: hasOverride,
                stats: {
                    activeCrews,
                    presentWorkers: presentWorkersList.length,
                    totalHours: totalHoursShift,
                    avgHours: presentWorkersList.length ? (totalHoursShift / presentWorkersList.length).toFixed(1) : '0'
                },
                data: [] as any[]
            })

            // Re-group workers by Cuadrilla for the "data" field
            const workersByCuadrilla = new Map()

            presentWorkersList.forEach(w => {
                if (!workersByCuadrilla.has(w.cuadrilla)) {
                    workersByCuadrilla.set(w.cuadrilla, {
                        id: w.cuadrilla,
                        nombre: w.cuadrilla,
                        personas: 0,
                        horas: 0,
                        workers: []
                    })
                }
                const c = workersByCuadrilla.get(w.cuadrilla)
                c.workers.push(w)
                c.personas += 1
                c.horas += w.hours
            })

            shiftResults[shiftResults.length - 1].data = Array.from(workersByCuadrilla.values())
        }

        // Global stats
        const globalStats = {
            activeCrews: shiftResults.reduce((acc, s) => acc + s.stats.activeCrews, 0),
            presentWorkers: shiftResults.reduce((acc, s) => acc + s.stats.presentWorkers, 0),
            totalHours: shiftResults.reduce((acc, s) => acc + s.stats.totalHours, 0),
            totalShifts: shiftResults.length
        }

        return NextResponse.json({
            success: true,
            meta: { date, project_id: projectId, semana_proyecto: null, dia_proyecto: null },
            stats: globalStats,
            shifts: shiftResults
        })

    } catch (error: any) {
        console.error('Error generating daily report:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}

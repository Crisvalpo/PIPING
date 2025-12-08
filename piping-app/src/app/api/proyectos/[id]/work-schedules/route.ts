import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    const projectId = params.id
    const supabase = await createClient()

    try {
        // Get all work schedules for this project
        const { data, error } = await supabase
            .rpc('get_project_schedules', { p_proyecto_id: projectId })

        if (error) throw error

        return NextResponse.json({
            success: true,
            data: data || []
        })
    } catch (error: any) {
        console.error('[GET /api/proyectos/[id]/work-schedules] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Error al obtener jornadas' },
            { status: 500 }
        )
    }
}

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    const projectId = params.id
    const supabase = await createClient()

    try {
        const body = await request.json()
        const { nombre, tipo, dias_trabajo, dias_descanso, fecha_inicio_grupo, grupo } = body

        // Validate required fields
        if (!nombre || !tipo || !dias_trabajo || dias_trabajo < 1) {
            return NextResponse.json(
                { success: false, error: 'Campos requeridos: nombre, tipo, dias_trabajo' },
                { status: 400 }
            )
        }

        // Validate tipo
        if (!['FIXED_WEEKLY', 'ROTATING'].includes(tipo)) {
            return NextResponse.json(
                { success: false, error: 'Tipo debe ser FIXED_WEEKLY o ROTATING' },
                { status: 400 }
            )
        }

        // For ROTATING schedules, require fecha_inicio_grupo
        if (tipo === 'ROTATING' && !fecha_inicio_grupo) {
            return NextResponse.json(
                { success: false, error: 'Jornadas rotativas requieren fecha_inicio_grupo' },
                { status: 400 }
            )
        }

        // Create schedule
        const { data, error } = await supabase
            .from('work_schedules')
            .insert({
                proyecto_id: projectId,
                nombre,
                tipo,
                dias_trabajo,
                dias_descanso: dias_descanso || 0,
                fecha_inicio_grupo: tipo === 'ROTATING' ? fecha_inicio_grupo : null,
                grupo: grupo || null
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return NextResponse.json(
                    { success: false, error: `Ya existe una jornada con el nombre "${nombre}"` },
                    { status: 400 }
                )
            }
            throw error
        }

        return NextResponse.json({
            success: true,
            message: 'Jornada creada exitosamente',
            data
        })
    } catch (error: any) {
        console.error('[POST /api/proyectos/[id]/work-schedules] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Error al crear jornada' },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    const projectId = params.id
    const supabase = await createClient()

    try {
        const body = await request.json()
        const { schedule_id, nombre, dias_trabajo, dias_descanso, fecha_inicio_grupo, grupo } = body

        if (!schedule_id) {
            return NextResponse.json(
                { success: false, error: 'schedule_id es requerido' },
                { status: 400 }
            )
        }

        // Update schedule
        const updateData: any = {}
        if (nombre) updateData.nombre = nombre
        if (dias_trabajo) updateData.dias_trabajo = dias_trabajo
        if (dias_descanso !== undefined) updateData.dias_descanso = dias_descanso
        if (fecha_inicio_grupo) updateData.fecha_inicio_grupo = fecha_inicio_grupo
        if (grupo !== undefined) updateData.grupo = grupo
        updateData.updated_at = new Date().toISOString()

        const { data, error } = await supabase
            .from('work_schedules')
            .update(updateData)
            .eq('id', schedule_id)
            .eq('proyecto_id', projectId) // Ensure it belongs to this project
            .select()
            .single()

        if (error) throw error

        if (!data) {
            return NextResponse.json(
                { success: false, error: 'Jornada no encontrada' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Jornada actualizada exitosamente',
            data
        })
    } catch (error: any) {
        console.error('[PUT /api/proyectos/[id]/work-schedules] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Error al actualizar jornada' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    const projectId = params.id
    const supabase = await createClient()

    try {
        const { searchParams } = new URL(request.url)
        const scheduleId = searchParams.get('schedule_id')

        if (!scheduleId) {
            return NextResponse.json(
                { success: false, error: 'schedule_id es requerido' },
                { status: 400 }
            )
        }

        // Check if any workers are using this schedule
        const { count } = await supabase
            .from('personal')
            .select('rut', { count: 'exact', head: true })
            .eq('work_schedule_id', scheduleId)

        if (count && count > 0) {
            return NextResponse.json(
                { success: false, error: `No se puede eliminar: ${count} trabajadores usan esta jornada` },
                { status: 400 }
            )
        }

        // Soft delete (set activo = false) instead of hard delete
        const { error } = await supabase
            .from('work_schedules')
            .update({ activo: false })
            .eq('id', scheduleId)
            .eq('proyecto_id', projectId)

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: 'Jornada eliminada exitosamente'
        })
    } catch (error: any) {
        console.error('[DELETE /api/proyectos/[id]/work-schedules] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Error al eliminar jornada' },
            { status: 500 }
        )
    }
}

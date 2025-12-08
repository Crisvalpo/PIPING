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
        // Get project configuration
        const { data: proyecto, error } = await supabase
            .from('proyectos')
            .select('fecha_inicio_proyecto, dia_cierre_semanal')
            .eq('id', projectId)
            .single()

        if (error) throw error

        // Calculate current week if start date is set
        let semanaActual = null
        let diaProyecto = null

        if (proyecto.fecha_inicio_proyecto) {
            const { data: semanaData } = await supabase
                .rpc('calcular_semana_proyecto', {
                    p_proyecto_id: projectId,
                    p_fecha: new Date().toISOString().split('T')[0]
                })

            semanaActual = semanaData

            // Calculate days elapsed
            const fechaInicio = new Date(proyecto.fecha_inicio_proyecto)
            const hoy = new Date()
            diaProyecto = Math.floor((hoy.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24))
        }

        return NextResponse.json({
            success: true,
            data: {
                fecha_inicio_proyecto: proyecto.fecha_inicio_proyecto,
                dia_cierre_semanal: proyecto.dia_cierre_semanal,
                semana_actual: semanaActual,
                dia_proyecto: diaProyecto
            }
        })
    } catch (error: any) {
        console.error('[GET /api/proyectos/[id]/config-semanas] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Error al obtener configuración' },
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
        const { fecha_inicio_proyecto, dia_cierre_semanal } = body

        // Validate inputs
        if (fecha_inicio_proyecto) {
            const fecha = new Date(fecha_inicio_proyecto)
            if (isNaN(fecha.getTime())) {
                return NextResponse.json(
                    { success: false, error: 'Fecha de inicio inválida' },
                    { status: 400 }
                )
            }
        }

        if (dia_cierre_semanal !== undefined && (dia_cierre_semanal < 0 || dia_cierre_semanal > 6)) {
            return NextResponse.json(
                { success: false, error: 'Día de cierre debe estar entre 0 y 6' },
                { status: 400 }
            )
        }

        // Update project
        const { data, error } = await supabase
            .from('proyectos')
            .update({
                fecha_inicio_proyecto,
                dia_cierre_semanal
            })
            .eq('id', projectId)
            .select('fecha_inicio_proyecto, dia_cierre_semanal')
            .single()

        if (error) throw error

        // Calculate new week number
        let semanaActual = null
        if (data.fecha_inicio_proyecto) {
            const { data: semanaData } = await supabase
                .rpc('calcular_semana_proyecto', {
                    p_proyecto_id: projectId,
                    p_fecha: new Date().toISOString().split('T')[0]
                })
            semanaActual = semanaData
        }

        return NextResponse.json({
            success: true,
            message: 'Configuración actualizada exitosamente',
            data: {
                ...data,
                semana_actual: semanaActual
            }
        })
    } catch (error: any) {
        console.error('[PUT /api/proyectos/[id]/config-semanas] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Error al actualizar configuración' },
            { status: 500 }
        )
    }
}

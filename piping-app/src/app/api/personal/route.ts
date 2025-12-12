import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * GET /api/personal?proyectoId=xxx
 * Obtiene todo el personal activo con información de asignación
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const activo = searchParams.get('activo') !== 'false'
        const proyectoId = searchParams.get('proyectoId')

        if (!proyectoId) {
            return NextResponse.json({
                success: false,
                error: 'proyectoId requerido'
            }, { status: 400 })
        }

        let query = supabase
            .from('personal')
            .select('rut, nombre, email, telefono, cargo, jefe_directo_rut, codigo_trabajador, work_schedule_id, proyecto_id, work_schedules(nombre), soldadores(estampa)')
            .eq('proyecto_id', proyectoId)
            .order('nombre')

        if (search) {
            query = query.or(`nombre.ilike.%${search}%,rut.ilike.%${search}%,email.ilike.%${search}%`)
        }

        const { data: personal, error } = await query

        if (error) throw error

        // Para cada trabajador, verificar si está asignado a alguna cuadrilla
        const personalConAsignacion = await Promise.all(
            (personal || []).map(async (p) => {
                // Verificar si es supervisor
                const { data: esSupervisor } = await supabase
                    .from('cuadrillas')
                    .select('id, nombre, project_shifts(shift_name)')
                    .eq('supervisor_rut', p.rut)
                    .eq('proyecto_id', proyectoId)
                    .limit(1)
                    .single()

                // Verificar si es capataz
                const { data: esCapataz } = await supabase
                    .from('cuadrillas')
                    .select('id, nombre, project_shifts(shift_name)')
                    .eq('capataz_rut', p.rut)
                    .eq('proyecto_id', proyectoId)
                    .limit(1)
                    .single()

                // Verificar si es maestro asignado
                const { data: esMaestro } = await supabase
                    .from('maestros_asignaciones')
                    .select('cuadrilla_id, cuadrillas(nombre, project_shifts(shift_name))')
                    .eq('maestro_rut', p.rut)
                    .eq('activo', true)
                    .limit(1)
                    .single()

                // Verificar si es soldador asignado
                const { data: esSoldador } = await supabase
                    .from('soldadores_asignaciones')
                    .select('cuadrilla_id, cuadrillas(nombre, project_shifts(shift_name))')
                    .eq('soldador_rut', p.rut)
                    .eq('activo', true)
                    .limit(1)
                    .single()

                let rol = p.cargo?.toUpperCase() || 'SIN CARGO'
                let asignado = false
                let cuadrilla = null
                let shift_name = null

                if (esSupervisor) {
                    // Keep original cargo as rol - just mark as assigned
                    asignado = true
                    cuadrilla = esSupervisor.nombre
                    shift_name = (esSupervisor as any).project_shifts?.shift_name
                } else if (esCapataz) {
                    asignado = true
                    cuadrilla = esCapataz.nombre
                    shift_name = (esCapataz as any).project_shifts?.shift_name
                } else if (esMaestro) {
                    asignado = true
                    cuadrilla = (esMaestro as any).cuadrillas?.nombre
                    shift_name = (esMaestro as any).cuadrillas?.project_shifts?.shift_name
                } else if (esSoldador) {
                    asignado = true
                    cuadrilla = (esSoldador as any).cuadrillas?.nombre
                    shift_name = (esSoldador as any).cuadrillas?.project_shifts?.shift_name
                }

                // Verificar asistencia de hoy
                const today = new Date().toISOString().split('T')[0]
                const { data: attendance } = await supabase
                    .from('asistencia_diaria')
                    .select('presente, motivo_ausencia')
                    .eq('personal_rut', p.rut)
                    .eq('proyecto_id', proyectoId)
                    .eq('fecha', today)
                    .limit(1)
                    .single()

                return {
                    ...p,
                    rol,
                    asignado,
                    cuadrilla,
                    shift_name,
                    activo: true,
                    presente: attendance?.presente !== false, // Default to true if no record
                    motivo_ausencia: attendance?.motivo_ausencia || null,
                    estampa: (p as any).soldadores?.estampa || null // Extract estampa from joined soldadores table
                }
            })
        )

        return NextResponse.json({
            success: true,
            data: personalConAsignacion
        })
    } catch (error: any) {
        console.error('[GET /api/personal] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al obtener personal' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/personal
 * Crea un nuevo trabajador
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { rut, nombre, email, telefono } = body

        if (!rut || !nombre) {
            return NextResponse.json(
                { error: 'RUT y nombre son requeridos' },
                { status: 400 }
            )
        }

        // Formatear RUT
        const { data: rutFormateado, error: formatError } = await supabase
            .rpc('formatear_rut', { rut_input: rut })

        if (formatError) {
            return NextResponse.json(
                { error: 'Error al formatear RUT' },
                { status: 400 }
            )
        }

        // Validar RUT
        const { data: esValido, error: validError } = await supabase
            .rpc('validar_rut', { rut_input: rutFormateado })

        if (validError || !esValido) {
            return NextResponse.json(
                { error: 'RUT inválido' },
                { status: 400 }
            )
        }

        // Crear personal
        const { data, error } = await supabase
            .from('personal')
            .insert({
                rut: rutFormateado,
                nombre,
                email,
                telefono
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: 'Este RUT ya está registrado' },
                    { status: 400 }
                )
            }
            throw error
        }

        return NextResponse.json({
            success: true,
            message: 'Personal creado exitosamente',
            data
        })
    } catch (error: any) {
        console.error('[POST /api/personal] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al crear personal' },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/personal
 * Actualiza información de un trabajador
 */
export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { rut, nombre, email, telefono, activo } = body

        if (!rut) {
            return NextResponse.json(
                { error: 'RUT es requerido' },
                { status: 400 }
            )
        }

        const updates: any = {}
        if (nombre !== undefined) updates.nombre = nombre
        if (email !== undefined) updates.email = email
        if (telefono !== undefined) updates.telefono = telefono
        if (activo !== undefined) updates.activo = activo

        const { data, error } = await supabase
            .from('personal')
            .update(updates)
            .eq('rut', rut)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: 'Personal actualizado exitosamente',
            data
        })
    } catch (error: any) {
        console.error('[PUT /api/personal] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al actualizar personal' },
            { status: 500 }
        )
    }
}

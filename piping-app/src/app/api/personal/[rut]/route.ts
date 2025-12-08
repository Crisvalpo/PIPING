import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * DELETE /api/personal/[rut]
 * Elimina un trabajador por su RUT
 */
export async function DELETE(
    request: Request,
    context: { params: Promise<{ rut: string }> }
) {
    try {
        const params = await context.params
        const rut = params.rut

        if (!rut) {
            return NextResponse.json(
                { error: 'RUT es requerido' },
                { status: 400 }
            )
        }

        // Verificar si el trabajador existe
        const { data: exists } = await supabase
            .from('personal')
            .select('rut')
            .eq('rut', rut)
            .single()

        if (!exists) {
            return NextResponse.json(
                { error: 'Trabajador no encontrado' },
                { status: 404 }
            )
        }

        // Eliminar el trabajador
        const { error } = await supabase
            .from('personal')
            .delete()
            .eq('rut', rut)

        if (error) {
            throw error
        }

        return NextResponse.json({
            success: true,
            message: 'Trabajador eliminado exitosamente'
        })

    } catch (error: any) {
        console.error('[DELETE /api/personal/[rut]] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al eliminar trabajador' },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/personal/[rut]
 * Actualiza información de un trabajador (excepto el RUT)
 */
export async function PUT(
    request: Request,
    context: { params: Promise<{ rut: string }> }
) {
    try {
        const params = await context.params
        console.log('[PUT /api/personal/[rut]] Params received:', params)
        const rut = params.rut
        const body = await request.json()
        const { nombre, email, telefono, cargo, jefe_directo_rut, codigo_trabajador, work_schedule_id } = body

        console.log('[PUT /api/personal/[rut]] Processing:', { rut, nombre, email, telefono, cargo, jefe_directo_rut, codigo_trabajador, work_schedule_id })

        if (!rut) {
            console.error('[PUT /api/personal/[rut]] RUT is missing!')
            return NextResponse.json(
                { error: 'RUT es requerido' },
                { status: 400 }
            )
        }

        // Construir objeto de actualización solo con campos proporcionados
        const updates: any = {}
        if (nombre !== undefined) updates.nombre = nombre.toUpperCase()
        if (email !== undefined) updates.email = email
        if (telefono !== undefined) updates.telefono = telefono
        if (cargo !== undefined) updates.cargo = cargo.toUpperCase()
        if (jefe_directo_rut !== undefined) updates.jefe_directo_rut = jefe_directo_rut
        if (codigo_trabajador !== undefined) updates.codigo_trabajador = codigo_trabajador
        if (work_schedule_id !== undefined) updates.work_schedule_id = work_schedule_id


        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: 'No hay campos para actualizar' },
                { status: 400 }
            )
        }

        // Actualizar en la base de datos
        const { data, error } = await supabase
            .from('personal')
            .update(updates)
            .eq('rut', rut)
            .select()
            .single()

        if (error) {
            throw error
        }

        if (!data) {
            return NextResponse.json(
                { error: 'Trabajador no encontrado' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Trabajador actualizado exitosamente',
            data
        })

    } catch (error: any) {
        console.error('[PUT /api/personal/[rut]] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al actualizar trabajador' },
            { status: 500 }
        )
    }
}

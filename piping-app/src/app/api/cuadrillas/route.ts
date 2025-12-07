import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Inicializar cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * GET /api/cuadrillas?proyecto_id=xxx
 * Obtiene todas las cuadrillas de un proyecto
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const proyectoId = searchParams.get('proyecto_id')

        if (!proyectoId) {
            return NextResponse.json(
                { error: 'proyecto_id es requerido' },
                { status: 400 }
            )
        }

        // Obtener cuadrillas completas usando la vista
        const { data, error } = await supabase
            .from('cuadrillas_full')
            .select('*')
            .eq('proyecto_id', proyectoId)
            .order('codigo')

        if (error) throw error

        return NextResponse.json({
            success: true,
            data: data || []
        })
    } catch (error: any) {
        console.error('[GET /api/cuadrillas] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al obtener cuadrillas' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/cuadrillas
 * Crea una nueva cuadrilla
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { proyecto_id, nombre, codigo, descripcion, shift_id } = body

        if (!proyecto_id || !nombre || !codigo) {
            return NextResponse.json(
                { error: 'proyecto_id, nombre y codigo son requeridos' },
                { status: 400 }
            )
        }

        // 1. Check if exists (active or inactive)
        const { data: existing } = await supabase
            .from('cuadrillas')
            .select('id, active')
            .eq('proyecto_id', proyecto_id)
            .or(`nombre.eq.${nombre},codigo.eq.${codigo}`)
            .maybeSingle()

        let result;
        let error;

        if (existing) {
            if (existing.active) {
                return NextResponse.json(
                    { error: 'Ya existe una cuadrilla activa con este nombre o código' },
                    { status: 409 }
                )
            } else {
                // 2. If inactive, reactivate and update
                console.log(`♻️ Reactivating cuadrilla ${existing.id}`);
                const { data, error: updateError } = await supabase
                    .from('cuadrillas')
                    .update({
                        nombre,
                        codigo,
                        descripcion,
                        shift_id: shift_id || null,
                        active: true, // Reactivate
                        // Clear old assignments just in case
                        supervisor_rut: null,
                        capataz_rut: null
                    })
                    .eq('id', existing.id)
                    .select()
                    .single()

                result = data;
                error = updateError;
            }
        } else {
            // 3. Create new
            const { data, error: insertError } = await supabase
                .from('cuadrillas')
                .insert({
                    proyecto_id,
                    nombre,
                    codigo,
                    descripcion,
                    shift_id: shift_id || null,
                    active: true
                })
                .select()
                .single()

            result = data;
            error = insertError;
        }

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: existing ? 'Cuadrilla restaurada exitosamente' : 'Cuadrilla creada exitosamente',
            data: result
        })

    } catch (error: any) {
        console.error('[POST /api/cuadrillas] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al procesar cuadrilla' },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/cuadrillas
 * Actualiza una cuadrilla existente
 */
export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, nombre, descripcion, activo } = body

        if (!id) {
            return NextResponse.json(
                { error: 'id es requerido' },
                { status: 400 }
            )
        }

        const updates: any = {}
        if (nombre !== undefined) updates.nombre = nombre
        if (descripcion !== undefined) updates.descripcion = descripcion
        if (activo !== undefined) updates.activo = activo

        const { data, error } = await supabase
            .from('cuadrillas')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: 'Cuadrilla actualizada exitosamente',
            data
        })
    } catch (error: any) {
        console.error('[PUT /api/cuadrillas] Error:', error)

        // Handle duplicate key error (Postgres code 23505)
        if (error.code === '23505') {
            if (error.message?.includes('nombre')) {
                return NextResponse.json(
                    { error: 'Ya existe otra cuadrilla con este nombre en el proyecto' },
                    { status: 409 }
                )
            }
            if (error.message?.includes('codigo')) {
                return NextResponse.json(
                    { error: 'Ya existe otra cuadrilla con este código en el proyecto' },
                    { status: 409 }
                )
            }
            return NextResponse.json(
                { error: 'Ya existe una cuadrilla con estos datos (nombre o código duplicado)' },
                { status: 409 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Error al actualizar cuadrilla' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/cuadrillas?id=xxx
 * Desactiva una cuadrilla (soft delete)
 */
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'id es requerido' },
                { status: 400 }
            )
        }

        // Soft delete: marcar como inactiva
        const { data, error } = await supabase
            .from('cuadrillas')
            .update({ activo: false })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: 'Cuadrilla desactivada exitosamente',
            data
        })
    } catch (error: any) {
        console.error('[DELETE /api/cuadrillas] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al desactivar cuadrilla' },
            { status: 500 }
        )
    }
}


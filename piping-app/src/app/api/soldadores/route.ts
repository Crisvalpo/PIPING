import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * GET /api/soldadores
 * Obtiene todos los soldadores
 */
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('soldadores')
            .select(`
                *,
                personal:rut (
                    rut,
                    nombre,
                    email,
                    activo
                )
            `)
            .order('estampa')

        if (error) throw error

        return NextResponse.json({
            success: true,
            data: data || []
        })
    } catch (error: any) {
        console.error('[GET /api/soldadores] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al obtener soldadores' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/soldadores
 * Registra un soldador con su estampa
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { rut, estampa, certificacion_actual, fecha_vencimiento_cert, calificaciones } = body

        if (!rut || !estampa) {
            return NextResponse.json(
                { error: 'RUT y estampa son requeridos' },
                { status: 400 }
            )
        }

        // Verificar que exista el personal
        const { data: personal, error: personalError } = await supabase
            .from('personal')
            .select('rut')
            .eq('rut', rut)
            .single()

        if (personalError || !personal) {
            return NextResponse.json(
                { error: 'El RUT no está registrado en personal. Créelo primero.' },
                { status: 400 }
            )
        }

        // Crear soldador
        const { data, error } = await supabase
            .from('soldadores')
            .insert({
                rut,
                estampa,
                certificacion_actual,
                fecha_vencimiento_cert,
                calificaciones: calificaciones || []
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                // Unique constraint violation
                if (error.message.includes('estampa')) {
                    return NextResponse.json(
                        { error: 'Esta estampa ya está registrada' },
                        { status: 400 }
                    )
                }
                return NextResponse.json(
                    { error: 'Este trabajador ya está registrado como soldador' },
                    { status: 400 }
                )
            }
            throw error
        }

        return NextResponse.json({
            success: true,
            message: 'Soldador registrado exitosamente',
            data
        })
    } catch (error: any) {
        console.error('[POST /api/soldadores] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al registrar soldador' },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/soldadores
 * Actualiza información de un soldador
 */
export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { rut, estampa, certificacion_actual, fecha_vencimiento_cert, calificaciones } = body

        if (!rut) {
            return NextResponse.json(
                { error: 'RUT es requerido' },
                { status: 400 }
            )
        }

        const updates: any = {}
        if (estampa !== undefined) updates.estampa = estampa
        if (certificacion_actual !== undefined) updates.certificacion_actual = certificacion_actual
        if (fecha_vencimiento_cert !== undefined) updates.fecha_vencimiento_cert = fecha_vencimiento_cert
        if (calificaciones !== undefined) updates.calificaciones = calificaciones

        const { data, error } = await supabase
            .from('soldadores')
            .update(updates)
            .eq('rut', rut)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: 'Soldador actualizado exitosamente',
            data
        })
    } catch (error: any) {
        console.error('[PUT /api/soldadores] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al actualizar soldador' },
            { status: 500 }
        )
    }
}

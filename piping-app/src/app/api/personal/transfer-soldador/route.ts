import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * POST /api/personal/transfer-soldador
 * Transfiere un soldador de una cuadrilla a otra
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { soldador_rut, cuadrilla_destino_id, observaciones } = body

        if (!soldador_rut || !cuadrilla_destino_id) {
            return NextResponse.json(
                { error: 'soldador_rut y cuadrilla_destino_id son requeridos' },
                { status: 400 }
            )
        }

        // Verificar que el soldador existe
        const { data: soldador, error: soldadorError } = await supabase
            .from('soldadores')
            .select('rut')
            .eq('rut', soldador_rut)
            .single()

        if (soldadorError || !soldador) {
            return NextResponse.json(
                { error: 'Soldador no encontrado o no está registrado como soldador' },
                { status: 404 }
            )
        }

        // Verificar que la cuadrilla destino existe
        const { data: cuadrilla, error: cuadrillaError } = await supabase
            .from('cuadrillas')
            .select('id, nombre')
            .eq('id', cuadrilla_destino_id)
            .single()

        if (cuadrillaError || !cuadrilla) {
            return NextResponse.json(
                { error: 'Cuadrilla destino no encontrada' },
                { status: 404 }
            )
        }

        // Usar la función de base de datos para hacer la transferencia
        const { data: asignacionId, error: transferError } = await supabase
            .rpc('asignar_soldador_a_cuadrilla', {
                p_soldador_rut: soldador_rut,
                p_cuadrilla_id: cuadrilla_destino_id,
                p_observaciones: observaciones || `Transferido a ${cuadrilla.nombre}`
            })

        if (transferError) throw transferError

        return NextResponse.json({
            success: true,
            message: `Soldador transferido exitosamente a ${cuadrilla.nombre}`,
            asignacion_id: asignacionId
        })

    } catch (error: any) {
        console.error('[POST /api/personal/transfer-soldador] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al transferir soldador' },
            { status: 500 }
        )
    }
}

/**
 * GET /api/personal/transfer-soldador?soldador_rut=XXX
 * Obtiene el historial de transferencias de un soldador
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const soldador_rut = searchParams.get('soldador_rut')
        const dias_atras = parseInt(searchParams.get('dias_atras') || '7')

        if (!soldador_rut) {
            return NextResponse.json(
                { error: 'soldador_rut es requerido' },
                { status: 400 }
            )
        }

        // Obtener historial usando la función de base de datos
        const { data: historial, error } = await supabase
            .rpc('get_historial_soldador', {
                p_soldador_rut: soldador_rut,
                p_dias_atras: dias_atras
            })

        if (error) throw error

        return NextResponse.json({
            success: true,
            data: historial || []
        })

    } catch (error: any) {
        console.error('[GET /api/personal/transfer-soldador] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al obtener historial' },
            { status: 500 }
        )
    }
}

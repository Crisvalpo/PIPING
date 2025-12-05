import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Inicializar cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * GET /api/proyectos/[id]/personnel?role=SOLDADOR|CAPATAZ
 * Obtiene soldadores o capataces disponibles de un proyecto
 */
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const proyectoId = params.id
        const { searchParams } = new URL(request.url)
        const role = searchParams.get('role') || 'SOLDADOR'

        if (!['SOLDADOR', 'CAPATAZ'].includes(role)) {
            return NextResponse.json(
                { error: 'role debe ser SOLDADOR o CAPATAZ' },
                { status: 400 }
            )
        }

        // Usar las funciones SQL optimizadas
        const functionName = role === 'SOLDADOR'
            ? 'get_soldadores_by_proyecto'
            : 'get_capataces_by_proyecto'

        const { data, error } = await supabase.rpc(functionName, {
            p_proyecto_id: proyectoId
        })

        if (error) throw error

        return NextResponse.json({
            success: true,
            data: data || []
        })
    } catch (error: any) {
        console.error('[GET /api/proyectos/[id]/personnel] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al obtener personal' },
            { status: 500 }
        )
    }
}

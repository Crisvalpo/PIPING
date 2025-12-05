import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * GET /api/proyectos
 * Obtiene la lista de todos los proyectos activos
 */
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('proyectos')
            .select('id, nombre, codigo, estado')
            .eq('estado', 'ACTIVO') // Asumiendo que queremos solo activos, o podemos quitar esto para todos
            .order('nombre')

        if (error) {
            console.error('Error fetching projects:', error)
            return NextResponse.json(
                { error: 'Error al obtener proyectos' },
                { status: 500 }
            )
        }

        return NextResponse.json(data)

    } catch (error: any) {
        console.error('[GET /api/proyectos] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error desconocido' },
            { status: 500 }
        )
    }
}

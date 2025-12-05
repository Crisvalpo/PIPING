import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Inicializar cliente de Supabase (Admin para poder buscar todas las empresas)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
    console.error('[API Search] Missing SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(request: Request) {
    if (!supabaseServiceKey) {
        return NextResponse.json({ error: 'Server configuration error: Missing Service Key' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
        return NextResponse.json({ error: 'El término de búsqueda es muy corto' }, { status: 400 })
    }

    try {
        console.log(`[API Search] Searching for: ${query}`)

        // Buscar empresas que coincidan con el nombre
        const { data, error } = await supabase
            .from('empresas')
            .select('id, nombre, descripcion, created_at')
            .ilike('nombre', `%${query}%`)
            .limit(10)

        if (error) {
            console.error('[API Search] Error:', error)
            throw error
        }

        console.log(`[API Search] Found ${data?.length || 0} results`)
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('[API Search] Critical Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

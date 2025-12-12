import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Inicializar cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * GET /api/cuadrillas/[id]/members
 * Obtiene todos los miembros de una cuadrilla
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: cuadrillaId } = await params

        const { data, error } = await supabase
            .from('cuadrilla_members_full')
            .select('*')
            .eq('cuadrilla_id', cuadrillaId)
            .order('role')
            .order('nombre')

        if (error) throw error

        return NextResponse.json({
            success: true,
            data: data || []
        })
    } catch (error: any) {
        console.error('[GET /api/cuadrillas/[id]/members] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al obtener miembros' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/cuadrillas/[id]/members
 * Agrega un miembro a una cuadrilla
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: cuadrillaId } = await params
        const body = await request.json()
        const { rut, role } = body

        if (!rut || !role) {
            return NextResponse.json(
                { error: 'rut y role son requeridos' },
                { status: 400 }
            )
        }

        if (!['SOLDADOR', 'CAPATAZ', 'MAESTRO'].includes(role)) {
            return NextResponse.json(
                { error: 'Rol inválido. Debe ser SOLDADOR, CAPATAZ o MAESTRO' },
                { status: 400 }
            )
        }

        // Verificar que el personal existe
        const { data: personal, error: personalError } = await supabase
            .from('personal')
            .select('rut')
            .eq('rut', rut)
            .single()

        if (personalError || !personal) {
            return NextResponse.json(
                { error: 'RUT no encontrado en personal' },
                { status: 400 }
            )
        }

        // Insertar miembro
        const { data, error } = await supabase
            .from('cuadrilla_members')
            .insert({
                cuadrilla_id: cuadrillaId,
                rut: rut,
                role: role
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: 'Miembro agregado exitosamente',
            data
        })
    } catch (error: any) {
        console.error('[POST /api/cuadrillas/[id]/members] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al agregar miembro' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/cuadrillas/[id]/members?user_id=xxx
 * Remueve un miembro de una cuadrilla (soft delete)
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: cuadrillaId } = await params
        const { searchParams } = new URL(request.url)
        const rut = searchParams.get('rut')

        if (!rut) {
            return NextResponse.json(
                { error: 'rut es requerido' },
                { status: 400 }
            )
        }

        // Obtener el member_id
        const { data: member, error: fetchError } = await supabase
            .from('cuadrilla_members')
            .select('id')
            .eq('cuadrilla_id', cuadrillaId)
            .eq('rut', rut)
            .single()

        if (fetchError) throw fetchError
        if (!member) {
            return NextResponse.json(
                { error: 'Miembro no encontrado' },
                { status: 404 }
            )
        }

        // Usar la función SQL para remover miembro
        const { error } = await supabase.rpc('remove_member_from_cuadrilla', {
            p_member_id: member.id
        })

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: 'Miembro removido exitosamente'
        })
    } catch (error: any) {
        console.error('[DELETE /api/cuadrillas/[id]/members] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al remover miembro' },
            { status: 500 }
        )
    }
}


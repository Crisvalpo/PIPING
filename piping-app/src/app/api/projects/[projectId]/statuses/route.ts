import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * GET /api/projects/[projectId]/statuses
 * Get all spool statuses for a specific project
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params

        console.log('[GET statuses] Request for projectId:', projectId)

        const { data, error } = await supabase
            .from('project_spool_statuses')
            .select('*')
            .eq('project_id', projectId)
            .order('order_index', { ascending: true })
            .order('name', { ascending: true })

        if (error) {
            console.error('[GET statuses] Supabase error:', error)
            return NextResponse.json(
                { error: `Error al obtener estados: ${error.message || error.code || 'Error desconocido'}`, details: error },
                { status: 500 }
            )
        }

        console.log('[GET statuses] Success, found', data?.length || 0, 'statuses')
        return NextResponse.json(data || [])

    } catch (error: any) {
        console.error('[GET statuses] Exception:', error)
        return NextResponse.json(
            { error: error.message || 'Error desconocido' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/projects/[projectId]/statuses
 * Create a new spool status for a project
 * Body: { name, code?, description?, color?, icon?, order_index?, is_initial?, is_final?, requires_photo? }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params
        const body = await request.json()

        const {
            name,
            code,
            description,
            color,
            icon,
            order_index,
            is_initial,
            is_final,
            requires_photo,
            metadata
        } = body

        // Validation
        if (!name) {
            return NextResponse.json(
                { error: 'name es requerido' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('project_spool_statuses')
            .insert({
                project_id: projectId,
                name,
                code,
                description,
                color: color || '#6B7280',
                icon,
                order_index: order_index || 0,
                is_initial: is_initial || false,
                is_final: is_final || false,
                requires_photo: requires_photo || false,
                metadata: metadata || {},
            })
            .select()
            .single()

        if (error) {
            console.error('[POST status] Error:', error)

            // Handle unique constraint violations
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: 'Ya existe un estado con ese nombre o código' },
                    { status: 409 }
                )
            }

            return NextResponse.json(
                { error: `Error al crear estado: ${error.message || error.code || 'Error desconocido'}`, details: error },
                { status: 500 }
            )
        }

        return NextResponse.json(data, { status: 201 })

    } catch (error: any) {
        console.error('[POST status] Exception:', error)
        return NextResponse.json(
            { error: error.message || 'Error desconocido' },
            { status: 500 }
        )
    }
}

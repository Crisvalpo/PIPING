import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * GET /api/projects/[projectId]/locations
 * Get all locations for a specific project
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { projectId: string } }
) {
    try {
        const { projectId } = params

        const { data, error } = await supabase
            .from('project_locations')
            .select('*')
            .eq('project_id', projectId)
            .order('type', { ascending: true })
            .order('name', { ascending: true })

        if (error) {
            console.error('[GET locations] Error:', error)
            return NextResponse.json(
                { error: 'Error al obtener ubicaciones' },
                { status: 500 }
            )
        }

        return NextResponse.json(data || [])

    } catch (error: any) {
        console.error('[GET locations] Exception:', error)
        return NextResponse.json(
            { error: error.message || 'Error desconocido' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/projects/[projectId]/locations
 * Create a new location for a project
 * Body: { name, code?, type, description?, parent_location_id?, capacity?, gps_coords? }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { projectId: string } }
) {
    try {
        const { projectId } = params
        const body = await request.json()

        const {
            name,
            code,
            type,
            description,
            parent_location_id,
            capacity,
            gps_coords,
            metadata
        } = body

        // Validation
        if (!name || !type) {
            return NextResponse.json(
                { error: 'name y type son requeridos' },
                { status: 400 }
            )
        }

        // Get current user from auth header (simplified - should use proper auth)
        const authHeader = request.headers.get('authorization')
        // TODO: Properly verify user and check if they're admin

        const { data, error } = await supabase
            .from('project_locations')
            .insert({
                project_id: projectId,
                name,
                code,
                type,
                description,
                parent_location_id,
                capacity,
                gps_coords,
                metadata: metadata || {},
                // created_by: userId, // TODO: Add when auth is implemented
            })
            .select()
            .single()

        if (error) {
            console.error('[POST location] Error:', error)

            // Handle unique constraint violations
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: 'Ya existe una ubicación con ese nombre o código' },
                    { status: 409 }
                )
            }

            return NextResponse.json(
                { error: 'Error al crear ubicación' },
                { status: 500 }
            )
        }

        return NextResponse.json(data, { status: 201 })

    } catch (error: any) {
        console.error('[POST location] Exception:', error)
        return NextResponse.json(
            { error: error.message || 'Error desconocido' },
            { status: 500 }
        )
    }
}

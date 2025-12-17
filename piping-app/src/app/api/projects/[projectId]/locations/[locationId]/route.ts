import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * PUT /api/projects/[projectId]/locations/[locationId]
 * Update a location
 * Body: { name?, code?, type?, description?, parent_location_id?, capacity?, gps_coords?, is_active? }
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { projectId: string; locationId: string } }
) {
    try {
        const { projectId, locationId } = params
        const body = await request.json()

        const {
            name,
            code,
            type,
            description,
            parent_location_id,
            capacity,
            gps_coords,
            metadata,
            is_active
        } = body

        // Build update object (only include fields that were provided)
        const updateData: any = {}
        if (name !== undefined) updateData.name = name
        if (code !== undefined) updateData.code = code
        if (type !== undefined) updateData.type = type
        if (description !== undefined) updateData.description = description
        if (parent_location_id !== undefined) updateData.parent_location_id = parent_location_id
        if (capacity !== undefined) updateData.capacity = capacity
        if (gps_coords !== undefined) updateData.gps_coords = gps_coords
        if (metadata !== undefined) updateData.metadata = metadata
        if (is_active !== undefined) updateData.is_active = is_active
        // updated_by: userId, // TODO: Add when auth is implemented

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'No se proporcionaron campos para actualizar' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('project_locations')
            .update(updateData)
            .eq('id', locationId)
            .eq('project_id', projectId) // Security: ensure location belongs to project
            .select()
            .single()

        if (error) {
            console.error('[PUT location] Error:', error)

            if (error.code === '23505') {
                return NextResponse.json(
                    { error: 'Ya existe una ubicación con ese nombre o código' },
                    { status: 409 }
                )
            }

            return NextResponse.json(
                { error: 'Error al actualizar ubicación' },
                { status: 500 }
            )
        }

        if (!data) {
            return NextResponse.json(
                { error: 'Ubicación no encontrada' },
                { status: 404 }
            )
        }

        return NextResponse.json(data)

    } catch (error: any) {
        console.error('[PUT location] Exception:', error)
        return NextResponse.json(
            { error: error.message || 'Error desconocido' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/projects/[projectId]/locations/[locationId]
 * Delete (or deactivate) a location
 * Use soft delete (is_active = false) to preserve history
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { projectId: string; locationId: string } }
) {
    try {
        const { projectId, locationId } = params
        const { searchParams } = new URL(request.url)
        const hardDelete = searchParams.get('hard') === 'true'

        // Check if location is being used by any spools
        const { count: spoolCount } = await supabase
            .from('spools')
            .select('id', { count: 'exact', head: true })
            .eq('current_location_id', locationId)

        if (spoolCount && spoolCount > 0 && hardDelete) {
            return NextResponse.json(
                {
                    error: `No se puede eliminar: ${spoolCount} spool(s) están en esta ubicación`,
                    count: spoolCount
                },
                { status: 409 }
            )
        }

        if (hardDelete) {
            // Hard delete (only if no spools)
            const { error } = await supabase
                .from('project_locations')
                .delete()
                .eq('id', locationId)
                .eq('project_id', projectId)

            if (error) {
                console.error('[DELETE location] Error:', error)
                return NextResponse.json(
                    { error: 'Error al eliminar ubicación' },
                    { status: 500 }
                )
            }
        } else {
            // Soft delete (recommended)
            const { error } = await supabase
                .from('project_locations')
                .update({ is_active: false })
                .eq('id', locationId)
                .eq('project_id', projectId)

            if (error) {
                console.error('[DELETE location] Error:', error)
                return NextResponse.json(
                    { error: 'Error al desactivar ubicación' },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('[DELETE location] Exception:', error)
        return NextResponse.json(
            { error: error.message || 'Error desconocido' },
            { status: 500 }
        )
    }
}

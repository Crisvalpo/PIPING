import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * PUT /api/projects/[projectId]/statuses/[statusId]
 * Update a spool status
 * Body: { name?, code?, description?, color?, icon?, order_index?, is_initial?, is_final?, requires_photo?, is_active? }
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; statusId: string }> }
) {
    try {
        const { projectId, statusId } = await params
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
            metadata,
            is_active
        } = body

        // Build update object (only include fields that were provided)
        const updateData: any = {}
        if (name !== undefined) updateData.name = name
        if (code !== undefined) updateData.code = code
        if (description !== undefined) updateData.description = description
        if (color !== undefined) updateData.color = color
        if (icon !== undefined) updateData.icon = icon
        if (order_index !== undefined) updateData.order_index = order_index
        if (is_initial !== undefined) updateData.is_initial = is_initial
        if (is_final !== undefined) updateData.is_final = is_final
        if (requires_photo !== undefined) updateData.requires_photo = requires_photo
        if (metadata !== undefined) updateData.metadata = metadata
        if (is_active !== undefined) updateData.is_active = is_active

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'No se proporcionaron campos para actualizar' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('project_spool_statuses')
            .update(updateData)
            .eq('id', statusId)
            .eq('project_id', projectId) // Security: ensure status belongs to project
            .select()
            .single()

        if (error) {
            console.error('[PUT status] Error:', error)

            if (error.code === '23505') {
                return NextResponse.json(
                    { error: 'Ya existe un estado con ese nombre o código' },
                    { status: 409 }
                )
            }

            return NextResponse.json(
                { error: `Error al actualizar estado: ${error.message || error.code}` },
                { status: 500 }
            )
        }

        if (!data) {
            return NextResponse.json(
                { error: 'Estado no encontrado' },
                { status: 404 }
            )
        }

        return NextResponse.json(data)

    } catch (error: any) {
        console.error('[PUT status] Exception:', error)
        return NextResponse.json(
            { error: error.message || 'Error desconocido' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/projects/[projectId]/statuses/[statusId]
 * Delete (or deactivate) a spool status
 * Use soft delete (is_active = false) to preserve history
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; statusId: string }> }
) {
    try {
        const { projectId, statusId } = await params
        const { searchParams } = new URL(request.url)
        const hardDelete = searchParams.get('hard') === 'true'

        // Check if status is being used by any spools
        const { count: spoolCount } = await supabase
            .from('spools')
            .select('id', { count: 'exact', head: true })
            .eq('current_status_id', statusId)

        if (spoolCount && spoolCount > 0 && hardDelete) {
            return NextResponse.json(
                {
                    error: `No se puede eliminar: ${spoolCount} spool(s) tienen este estado`,
                    count: spoolCount
                },
                { status: 409 }
            )
        }

        if (hardDelete) {
            // Hard delete (only if no spools)
            const { error } = await supabase
                .from('project_spool_statuses')
                .delete()
                .eq('id', statusId)
                .eq('project_id', projectId)

            if (error) {
                console.error('[DELETE status] Error:', error)
                return NextResponse.json(
                    { error: 'Error al eliminar estado' },
                    { status: 500 }
                )
            }
        } else {
            // Soft delete (recommended)
            const { error } = await supabase
                .from('project_spool_statuses')
                .update({ is_active: false })
                .eq('id', statusId)
                .eq('project_id', projectId)

            if (error) {
                console.error('[DELETE status] Error:', error)
                return NextResponse.json(
                    { error: 'Error al desactivar estado' },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('[DELETE status] Exception:', error)
        return NextResponse.json(
            { error: error.message || 'Error desconocido' },
            { status: 500 }
        )
    }
}

import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/spools/[spoolNumber]/request-info
export async function POST(
    request: NextRequest,
    paramsObj: { params: Promise<{ spoolNumber: string }> }
) {
    try {
        const params = await paramsObj.params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { revisionId, lengthMeters, weightKg } = body

        if (!revisionId) {
            return NextResponse.json({ error: 'revisionId requerido' }, { status: 400 })
        }

        const spoolNumber = decodeURIComponent(params.spoolNumber)

        // Get project_id from revision
        const { data: revisionData } = await supabase
            .from('isometric_revisions')
            .select('isometric_id, isometricos(project_id)')
            .eq('id', revisionId)
            .single()

        if (!revisionData) {
            return NextResponse.json({ error: 'Revisión no encontrada' }, { status: 404 })
        }

        const projectId = (revisionData.isometricos as any).project_id

        // Update or create tracking record
        const updateData: any = {
            spool_number: spoolNumber,
            revision_id: revisionId,
            project_id: projectId,
            length_requested_by: user.id,
            length_requested_at: new Date().toISOString()
        }

        if (lengthMeters !== undefined) updateData.length_meters = lengthMeters
        if (weightKg !== undefined) updateData.weight_kg = weightKg

        const { data, error } = await supabase
            .from('spool_fabrication_tracking')
            .upsert(updateData, {
                onConflict: 'spool_number,revision_id'
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error requesting spool info:', error)
        return NextResponse.json(
            { error: error.message || 'Error al solicitar información del spool' },
            { status: 500 }
        )
    }
}

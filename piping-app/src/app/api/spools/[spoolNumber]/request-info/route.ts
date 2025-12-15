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
        let { data: { user } } = await supabase.auth.getUser()

        // Fallback: Check for Bearer token if cookie auth fails
        if (!user) {
            const authHeader = request.headers.get('authorization')
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1]
                const { data } = await supabase.auth.getUser(token)
                user = data.user
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { revisionId, projectId, lengthMeters, weightKg } = body

        if (!revisionId) {
            return NextResponse.json({ error: 'revisionId requerido' }, { status: 400 })
        }

        // Use provided projectId or fail (client must provide it now)
        if (!projectId) {
            return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })
        }

        const spoolNumber = decodeURIComponent(params.spoolNumber)

        console.log('[DEBUG] Request Info - Spool Number:', spoolNumber)
        console.log('[DEBUG] Request Info - Revision ID:', revisionId)
        console.log('[DEBUG] Request Info - Project ID:', projectId)

        // Update or create tracking record - NO server-side lookup needed!
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

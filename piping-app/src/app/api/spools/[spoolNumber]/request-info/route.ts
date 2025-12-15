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
        const { revisionId, lengthMeters, weightKg } = body

        if (!revisionId) {
            return NextResponse.json({ error: 'revisionId requerido' }, { status: 400 })
        }

        const spoolNumber = decodeURIComponent(params.spoolNumber)

        console.log('[DEBUG] Request Info - Spool Number:', spoolNumber)
        console.log('[DEBUG] Request Info - Revision ID:', revisionId)

        // Get project_id from existing welds for this spool/revision
        const { data: weldData, error: weldError } = await supabase
            .from('spools_welds')
            .select('proyecto_id, spool_number, revision_id')
            .eq('revision_id', revisionId)
            .eq('spool_number', spoolNumber)
            .limit(1)
            .maybeSingle()

        console.log('[DEBUG] Weld Query Result:', weldData)
        console.log('[DEBUG] Weld Query Error:', weldError)

        // Try case-insensitive search if exact match fails
        if (!weldData?.proyecto_id) {
            console.log('[DEBUG] Trying case-insensitive search...')
            const { data: allWelds } = await supabase
                .from('spools_welds')
                .select('proyecto_id, spool_number, revision_id')
                .eq('revision_id', revisionId)
                .limit(10)

            console.log('[DEBUG] All welds for this revision (first 10):', allWelds)

            return NextResponse.json({
                error: 'No se encontraron soldaduras para este spool en la revisión especificada',
                debug: {
                    requestedSpool: spoolNumber,
                    requestedRevision: revisionId,
                    availableSpools: allWelds?.map(w => w.spool_number) || []
                }
            }, { status: 404 })
        }

        const projectId = weldData.proyecto_id

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

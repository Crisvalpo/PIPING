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

        // Step 1: Get isometric_id from revision first
        const { data: revData, error: revError } = await supabase
            .from('isometric_revisions')
            .select('isometric_id')
            .eq('id', revisionId)
            .single()

        if (revError || !revData) {
            console.log('[DEBUG] Revision Error:', revError)
            return NextResponse.json({
                error: 'Revisión no encontrada',
                debug: revError
            }, { status: 404 })
        }

        // Step 2: Get proyecto_id from isometric
        const { data: isoData, error: isoError } = await supabase
            .from('isometrics')
            .select('proyecto_id')
            .eq('id', revData.isometric_id)
            .single()

        if (isoError || !isoData) {
            console.log('[DEBUG] Isometric Error:', isoError)
            return NextResponse.json({
                error: 'Isométrico no encontrado',
                debug: isoError
            }, { status: 404 })
        }

        const projectId = isoData.proyecto_id
        console.log('[DEBUG] Found Project ID:', projectId)

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

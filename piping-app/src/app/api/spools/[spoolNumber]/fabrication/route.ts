import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/spools/[spoolNumber]/fabrication?revisionId=xxx
export async function GET(
    request: NextRequest,
    paramsObj: { params: Promise<{ spoolNumber: string }> }
) {
    try {
        const params = await paramsObj.params
        const supabase = await createClient()
        let { data: { user }, error: authError } = await supabase.auth.getUser()

        // Fallback: Check for Bearer token if cookie auth fails
        if (!user) {
            const authHeader = request.headers.get('authorization')
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1]
                const { data } = await supabase.auth.getUser(token)
                user = data.user
            }
        }

        console.log('[API Debug] Auth Error:', authError)
        console.log('[API Debug] User ID:', user?.id)

        if (!user) {
            console.log('[API Debug] No session found (Cookie + Bearer failed)')
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const revisionId = searchParams.get('revisionId')

        if (!revisionId) {
            return NextResponse.json({ error: 'revisionId requerido' }, { status: 400 })
        }

        const spoolNumber = decodeURIComponent(params.spoolNumber)

        // Get fabrication tracking
        const { data, error } = await supabase
            .from('spool_fabrication_tracking')
            .select(`
                *,
                shop_welding_user:shop_welding_completed_by(email, full_name),
                ndt_user:ndt_completed_by(email, full_name),
                pwht_user:pwht_completed_by(email, full_name),
                surface_treatment_user:surface_treatment_completed_by(email, full_name),
                dispatch_user:dispatch_completed_by(email, full_name),
                field_erection_user:field_erection_completed_by(email, full_name),
                field_welding_user:field_welding_completed_by(email, full_name),
                length_requested_user:length_requested_by(email, full_name)
            `)
            .eq('spool_number', spoolNumber)
            .eq('revision_id', revisionId)
            .single()

        if (error) {
            // If no tracking record exists, return default
            if (error.code === 'PGRST116') {
                return NextResponse.json({
                    spool_number: spoolNumber,
                    revision_id: revisionId,
                    shop_welding_status: 'PENDING',
                    ndt_status: 'PENDING',
                    pwht_status: 'N/A',
                    surface_treatment_status: 'PENDING',
                    dispatch_status: 'PENDING',
                    field_erection_status: 'PENDING',
                    field_welding_status: 'PENDING'
                })
            }
            throw error
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error fetching spool fabrication:', error)
        return NextResponse.json(
            { error: error.message || 'Error al obtener tracking de fabricación' },
            { status: 500 }
        )
    }
}

// PUT /api/spools/[spoolNumber]/fabrication
export async function PUT(
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
        const {
            revisionId,
            phase,
            status,
            notes,
            surfaceTreatmentType,
            dispatchTrackingNumber
        } = body

        if (!revisionId || !phase || !status) {
            return NextResponse.json(
                { error: 'revisionId, phase y status son requeridos' },
                { status: 400 }
            )
        }

        const spoolNumber = decodeURIComponent(params.spoolNumber)

        // Build update object based on phase
        const updateData: any = {}

        switch (phase) {
            case 'ndt':
                updateData.ndt_status = status
                if (status === 'COMPLETED') {
                    updateData.ndt_completed_at = new Date().toISOString()
                    updateData.ndt_completed_by = user.id
                }
                if (notes) updateData.ndt_notes = notes
                break

            case 'pwht':
                updateData.pwht_status = status
                if (status === 'COMPLETED') {
                    updateData.pwht_completed_at = new Date().toISOString()
                    updateData.pwht_completed_by = user.id
                }
                if (notes) updateData.pwht_notes = notes
                break

            case 'surface_treatment':
                updateData.surface_treatment_status = status
                if (status === 'COMPLETED') {
                    updateData.surface_treatment_completed_at = new Date().toISOString()
                    updateData.surface_treatment_completed_by = user.id
                }
                if (surfaceTreatmentType) updateData.surface_treatment_type = surfaceTreatmentType
                if (notes) updateData.surface_treatment_notes = notes
                break

            case 'dispatch':
                updateData.dispatch_status = status
                if (status === 'COMPLETED') {
                    updateData.dispatch_completed_at = new Date().toISOString()
                    updateData.dispatch_completed_by = user.id
                }
                if (dispatchTrackingNumber) updateData.dispatch_tracking_number = dispatchTrackingNumber
                if (notes) updateData.dispatch_notes = notes
                break

            case 'field_erection':
                updateData.field_erection_status = status
                if (status === 'COMPLETED') {
                    updateData.field_erection_completed_at = new Date().toISOString()
                    updateData.field_erection_completed_by = user.id
                }
                break

            default:
                return NextResponse.json({ error: 'Fase inválida' }, { status: 400 })
        }

        // Fetch project_id for new records (2-step fetch)
        // Step 1: Get isometric_id
        const { data: revData, error: revError } = await supabase
            .from('isometric_revisions')
            .select('isometric_id')
            .eq('id', revisionId)
            .single()

        if (revError || !revData) {
            return NextResponse.json({ error: 'Revisión no válida o no encontrada' }, { status: 400 })
        }

        // Step 2: Get proyecto_id
        const { data: isoData, error: isoError } = await supabase
            .from('isometrics')
            .select('proyecto_id')
            .eq('id', revData.isometric_id)
            .single()

        if (isoError || !isoData) {
            return NextResponse.json({ error: 'Isométrico asociado no encontrado' }, { status: 400 })
        }

        const projectId = isoData.proyecto_id

        // Upsert the tracking record
        const { data, error } = await supabase
            .from('spool_fabrication_tracking')
            .upsert({
                spool_number: spoolNumber,
                revision_id: revisionId,
                project_id: projectId,
                ...updateData
            }, {
                onConflict: 'spool_number,revision_id'
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error updating spool fabrication:', error)
        return NextResponse.json(
            { error: error.message || 'Error al actualizar tracking de fabricación' },
            { status: 500 }
        )
    }
}

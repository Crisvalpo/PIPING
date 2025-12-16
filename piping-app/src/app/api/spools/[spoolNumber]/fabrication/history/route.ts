import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/spools/[spoolNumber]/fabrication/history?revisionId=xxx&phase=ndt
export async function GET(
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

        const searchParams = request.nextUrl.searchParams
        const revisionId = searchParams.get('revisionId')
        const phase = searchParams.get('phase') // Optional filter

        if (!revisionId) {
            return NextResponse.json({ error: 'revisionId requerido' }, { status: 400 })
        }

        const spoolNumber = decodeURIComponent(params.spoolNumber)

        // First get the tracking record
        const { data: tracking, error: trackingError } = await supabase
            .from('spool_fabrication_tracking')
            .select('id')
            .eq('spool_number', spoolNumber)
            .eq('revision_id', revisionId)
            .maybeSingle()

        if (trackingError) throw trackingError

        // If no tracking exists, return empty history
        if (!tracking) {
            return NextResponse.json({ history: [] })
        }

        // Build query for history
        let query = supabase
            .from('spool_fabrication_tracking_history')
            .select(`
                id,
                phase,
                old_status,
                new_status,
                changed_at,
                notes,
                metadata,
                changed_by
            `)
            .eq('tracking_id', tracking.id)
            .order('changed_at', { ascending: false }) // Most recent first

        // Optional phase filter
        if (phase) {
            query = query.eq('phase', phase)
        }

        const { data: history, error: historyError } = await query

        if (historyError) throw historyError

        // Initialize Admin Client for resolving users reliably
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Fetch user details separately to avoid PostgREST relationship issues
        const historyWithUsers = await Promise.all(
            (history || []).map(async (item) => {
                let userInfo = {
                    id: item.changed_by,
                    email: 'unknown',
                    full_name: null as string | null
                }

                if (item.changed_by) {
                    // 1. Try public.users with Admin privileges
                    const { data: publicUser } = await supabaseAdmin
                        .from('users')
                        .select('correo, nombre')
                        .eq('id', item.changed_by)
                        .single()

                    if (publicUser) {
                        userInfo.email = publicUser.correo || 'unknown'
                        userInfo.full_name = publicUser.nombre
                    }

                    // If still no full_name, try auth.users (expanded fallback)
                    if (!userInfo.full_name) {
                        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(item.changed_by)
                        if (authUser?.user) {
                            userInfo.email = userInfo.email !== 'unknown' ? userInfo.email : (authUser.user.email || 'unknown')

                            // Try multiple metadata fields
                            const meta = authUser.user.user_metadata || {}
                            userInfo.full_name = meta.full_name || meta.name || meta.firstName || meta.first_name
                                ? `${meta.first_name || meta.firstName || ''} ${meta.last_name || meta.lastName || ''}`.trim() || meta.name || meta.full_name
                                : null

                            // Last resort: extract from email
                            if (!userInfo.full_name && userInfo.email && userInfo.email !== 'unknown') {
                                const namePart = userInfo.email.split('@')[0]
                                userInfo.full_name = namePart
                                    .split(/[._-]/)
                                    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
                                    .join(' ')
                            }
                        }
                    }
                }

                return {
                    ...item,
                    changed_by_user: userInfo
                }
            })
        )

        return NextResponse.json({ history: historyWithUsers })
    } catch (error: any) {
        console.error('Error fetching fabrication history:', error)
        return NextResponse.json(
            { error: error.message || 'Error al obtener historial de fabricación' },
            { status: 500 }
        )
    }
}

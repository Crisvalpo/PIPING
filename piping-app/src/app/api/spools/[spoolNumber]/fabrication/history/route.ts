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

        // Fetch user details separately to avoid PostgREST relationship issues
        const historyWithUsers = await Promise.all(
            (history || []).map(async (item) => {
                // Try to get user data from users table
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id, email, full_name')
                    .eq('id', item.changed_by)
                    .single()

                if (userError) {
                    console.error(`[History] Error fetching user ${item.changed_by}:`, userError)
                }

                // Fallback: try auth.users if users table fails
                if (!userData && item.changed_by) {
                    const { data: authUser } = await supabase.auth.admin.getUserById(item.changed_by)
                    if (authUser?.user) {
                        return {
                            ...item,
                            changed_by_user: {
                                id: authUser.user.id,
                                email: authUser.user.email || 'unknown',
                                full_name: authUser.user.user_metadata?.full_name || null
                            }
                        }
                    }
                }

                return {
                    ...item,
                    changed_by_user: userData || {
                        id: item.changed_by,
                        email: 'unknown',
                        full_name: null
                    }
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

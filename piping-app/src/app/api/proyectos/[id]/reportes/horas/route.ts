import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    const id = params.id
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Default to last 7 days if not provided
    const today = new Date().toISOString().split('T')[0]
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const from = searchParams.get('from') || lastWeek
    const to = searchParams.get('to') || today

    try {
        const { data, error } = await supabase
            .rpc('get_cuadrilla_hours_history', {
                p_proyecto_id: id,
                p_start_date: from,
                p_end_date: to
            })

        if (error) throw error

        return NextResponse.json({
            success: true,
            data
        })

    } catch (error: any) {
        console.error('Error getting history report:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Internal Server Error',
                details: error.details || error.hint || JSON.stringify(error)
            },
            { status: 500 }
        )
    }
}

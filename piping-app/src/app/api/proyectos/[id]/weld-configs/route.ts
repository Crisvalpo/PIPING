import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function getAuthenticatedUser(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return null

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    return user
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params

    try {
        const { data, error } = await supabase
            .from('project_weld_configs')
            .select('*')
            .eq('project_id', projectId)
            .order('weld_type_code')

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        console.error('Error fetching weld configs:', error)
        return NextResponse.json({ success: false, error: error?.message || 'Error loading configurations' }, { status: 500 })
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params

    try {
        const user = await getAuthenticatedUser(request)
        if (!user) {
            return NextResponse.json({ success: false, error: 'No autorizado - Inicia sesión' }, { status: 401 })
        }

        const body = await request.json()
        const { weld_type_code, requires_welder } = body

        if (!weld_type_code) {
            return NextResponse.json({ success: false, error: 'Código requerido' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('project_weld_configs')
            .upsert({
                project_id: projectId,
                weld_type_code: weld_type_code.toUpperCase(),
                requires_welder: requires_welder
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })

    } catch (error: any) {
        console.error('Error saving weld config:', error)
        return NextResponse.json({ success: false, error: error?.message || 'Error saving configuration' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const typeCode = searchParams.get('code')

    if (!typeCode) {
        return NextResponse.json({ success: false, error: 'Código requerido' }, { status: 400 })
    }

    try {
        const user = await getAuthenticatedUser(request)
        if (!user) {
            return NextResponse.json({ success: false, error: 'No autorizado - Inicia sesión' }, { status: 401 })
        }

        const { error } = await supabase
            .from('project_weld_configs')
            .delete()
            .eq('project_id', projectId)
            .eq('weld_type_code', typeCode)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting weld config:', error)
        return NextResponse.json({ success: false, error: error?.message || 'Error deleting configuration' }, { status: 500 })
    }
}


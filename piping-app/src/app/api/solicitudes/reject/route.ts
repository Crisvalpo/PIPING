import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
    try {
        // 1. Verificar autenticación
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
        }

        const { solicitudId } = await request.json()
        if (!solicitudId) {
            return NextResponse.json({ error: 'ID de solicitud requerido' }, { status: 400 })
        }

        // 2. Obtener la solicitud
        const { data: solicitud, error: fetchError } = await supabase
            .from('solicitudes_acceso_empresa')
            .select('*')
            .eq('id', solicitudId)
            .single()

        if (fetchError || !solicitud) {
            return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
        }

        // 3. Verificar permisos
        const { data: adminUser } = await supabase
            .from('users')
            .select('rol, empresa_id, es_admin_proyecto')
            .eq('id', user.id)
            .single()

        const esSuperAdmin = adminUser?.rol?.toUpperCase() === 'SUPER_ADMIN'
        const esAdminEmpresa = (adminUser?.es_admin_proyecto || adminUser?.rol === 'ADMIN_PROYECTO') &&
            adminUser?.empresa_id === solicitud.empresa_id

        if (!esSuperAdmin && !esAdminEmpresa) {
            return NextResponse.json({ error: 'No tienes permisos para rechazar esta solicitud' }, { status: 403 })
        }

        // 4. Marcar solicitud como rechazada
        const { error: solicitudUpdateError } = await supabase
            .from('solicitudes_acceso_empresa')
            .update({
                estado: 'RECHAZADA',
                aprobada_por: user.id, // Usamos el mismo campo para quien revisó
                aprobada_en: new Date().toISOString()
            })
            .eq('id', solicitudId)

        if (solicitudUpdateError) {
            throw new Error('Error actualizando solicitud: ' + solicitudUpdateError.message)
        }

        return NextResponse.json({ success: true, message: 'Solicitud rechazada correctamente' })

    } catch (error: any) {
        console.error('[API Reject] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

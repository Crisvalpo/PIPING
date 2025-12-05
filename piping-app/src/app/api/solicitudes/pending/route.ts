import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
    try {
        // Obtener el token del usuario desde el header
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')

        // Verificar el usuario con el token
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
        }

        // Obtener datos del usuario
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('empresa_id, rol, es_admin_proyecto')
            .eq('id', user.id)
            .single()

        if (userError || !userData) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
        }

        // 1. Obtener las solicitudes primero (sin joins)
        let query = supabase
            .from('solicitudes_acceso_empresa')
            .select('*')
            .eq('estado', 'PENDIENTE')

        // Filtrar por empresa si no es Super Admin
        if (userData.rol?.toUpperCase() !== 'SUPER_ADMIN') {
            if (!userData.empresa_id) {
                return NextResponse.json([])
            }
            query = query.eq('empresa_id', userData.empresa_id)
        }

        const { data: solicitudes, error } = await query.order('created_at', { ascending: false })

        if (error) {
            console.error('[API Solicitudes] Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!solicitudes || solicitudes.length === 0) {
            return NextResponse.json([])
        }

        // 2. Obtener manualmente los datos de usuarios y empresas relacionados
        const userIds = [...new Set(solicitudes.map(s => s.usuario_id))]
        const empresaIds = [...new Set(solicitudes.map(s => s.empresa_id))]

        const [usersResponse, empresasResponse] = await Promise.all([
            supabase.from('users').select('id, nombre, correo').in('id', userIds),
            supabase.from('empresas').select('id, nombre').in('id', empresaIds)
        ])

        const usersMap = new Map(usersResponse.data?.map(u => [u.id, u]) || [])
        const empresasMap = new Map(empresasResponse.data?.map(e => [e.id, e]) || [])

        // 3. Combinar los datos
        const enrichedData = solicitudes.map(s => ({
            ...s,
            usuario: usersMap.get(s.usuario_id) || { nombre: 'Desconocido', correo: 'No disponible' },
            empresa: empresasMap.get(s.empresa_id) || { nombre: 'Desconocida' }
        }))

        return NextResponse.json(enrichedData)
    } catch (error: any) {
        console.error('[API Solicitudes] Critical Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

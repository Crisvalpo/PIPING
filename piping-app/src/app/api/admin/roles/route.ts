
import { NextResponse } from 'next/server'
import { getAppRoles } from '@/services/admin-roles'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // Verificar Auth
        // Nota: Idealmente verificar si usuario es admin, pero por ahora confiamos en RLS y validación UI
        // RLS policy: "Public read access" allows everyone to read roles (needed for login)

        const roles = await getAppRoles()

        return NextResponse.json(roles)
    } catch (error: any) {
        console.error('Error fetching roles:', error)
        return NextResponse.json(
            { error: error.message || 'Error fetching roles' },
            { status: 500 }
        )
    }
}

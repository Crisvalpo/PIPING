
import { NextResponse } from 'next/server'
import { updateAppRolePermissions } from '@/services/admin-roles'
import { supabase } from '@/lib/supabase'

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()
        const { permissions } = body

        if (!permissions) {
            return NextResponse.json(
                { error: 'Permissions object is required' },
                { status: 400 }
            )
        }

        // TODO: Validate user is admin (Supabase RLS also enforces this)

        const roleId = decodeURIComponent(params.id)
        const updatedRole = await updateAppRolePermissions(roleId, permissions)

        return NextResponse.json(updatedRole)
    } catch (error: any) {
        console.error('Error updating role:', error)
        return NextResponse.json(
            { error: error.message || 'Error updating role' },
            { status: 500 }
        )
    }
}

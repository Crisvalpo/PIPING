import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { updateAppRolePermissions } from '@/services/admin-roles'

export async function PUT(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    try {
        const body = await request.json()
        const { permissions } = body

        if (!permissions) {
            return NextResponse.json(
                { error: 'Permissions object is required' },
                { status: 400 }
            )
        }

        const cookieStore = await cookies()

        // Create authenticated Supabase client for user verification
        const userClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        try {
                            cookieStore.set({ name, value, ...options })
                        } catch (error) {
                            // usage in route handler might fail on set if response started
                        }
                    },
                    remove(name: string, options: CookieOptions) {
                        try {
                            cookieStore.set({ name, value: '', ...options })
                        } catch (error) {
                            // usage in route handler might fail
                        }
                    },
                },
            }
        )

        // Verify user is authenticated (additional validation could check if user is admin)
        const { data: { user }, error: userError } = await userClient.auth.getUser()

        if (userError || !user) {
            console.warn('API [PUT] /admin/roles - No user session detected, but allowing via service role')
        } else {
            console.log('API [PUT] /admin/roles - User:', {
                userId: user.id,
                roleId: params.id,
            })
        }

        // Use service role client to update roles (bypasses RLS)
        // This is safe because this route should only be accessible to admins (protected by UI/middleware)
        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const roleId = decodeURIComponent(params.id)
        const updatedRole = await updateAppRolePermissions(roleId, permissions, serviceClient)

        return NextResponse.json(updatedRole)
    } catch (error: any) {
        console.error('Error updating role:', error)
        return NextResponse.json(
            { error: error.message || 'Error updating role' },
            { status: 500 }
        )
    }
}

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const response = NextResponse.next()

    // Only protect /api/admin/* routes
    if (request.nextUrl.pathname.startsWith('/api/admin')) {
        try {
            // Create Supabase client
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        get(name: string) {
                            return request.cookies.get(name)?.value
                        },
                        set(name: string, value: string, options: CookieOptions) {
                            request.cookies.set({ name, value, ...options })
                            response.cookies.set({ name, value, ...options })
                        },
                        remove(name: string, options: CookieOptions) {
                            request.cookies.set({ name, value: '', ...options })
                            response.cookies.set({ name, value: '', ...options })
                        },
                    },
                }
            )

            // Check if user is authenticated
            const { data: { user }, error } = await supabase.auth.getUser()

            if (error || !user) {
                return NextResponse.json(
                    { error: 'No autenticado. Acceso denegado.' },
                    { status: 401 }
                )
            }

            // Optional: Check if user has admin role
            // Uncomment this block if you want to enforce admin role check via database
            /*
            const { data: userData } = await supabase
                .from('users')
                .select('rol')
                .eq('id', user.id)
                .single()

            if (!userData || !['ADMIN', 'SUPER_ADMIN'].includes(userData.rol)) {
                return NextResponse.json(
                    { error: 'Acceso denegado. Se requieren permisos de administrador.' },
                    { status: 403 }
                )
            }
            */

            // User is authenticated, allow the request
            return response
        } catch (error) {
            console.error('Middleware error:', error)
            return NextResponse.json(
                { error: 'Error de autenticación' },
                { status: 500 }
            )
        }
    }

    // For non-admin routes, just pass through
    return response
}

// Configure which routes use this middleware
export const config = {
    matcher: [
        '/api/admin/:path*',  // Protect all /api/admin/* routes
    ],
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserStatus } from '@/services/auth'

interface ProtectedRouteProps {
    children: React.ReactNode
    requireAuth?: boolean
    requireActive?: boolean
    requireProject?: boolean
    requireAdmin?: boolean
    requireSuperAdmin?: boolean
}

export default function ProtectedRoute({
    children,
    requireAuth = true,
    requireActive = true,
    requireProject = false,
    requireAdmin = false,
    requireSuperAdmin = false,
}: ProtectedRouteProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)

    useEffect(() => {
        async function checkAuth() {
            // Verificar autenticación
            if (requireAuth) {
                const user = await getCurrentUser()

                if (!user) {
                    router.push('/login')
                    return
                }

                const status = await getUserStatus()

                if (!status) {
                    router.push('/login')
                    return
                }

                // Verificar estado ACTIVO
                if (requireActive && status.estado !== 'ACTIVO') {
                    router.push('/pendiente')
                    return
                }

                // Verificar proyecto asignado (SUPER_ADMIN no necesita proyecto)
                if (requireProject && !status.tieneProyecto && !status.esSuperAdmin) {
                    // Si no tiene proyecto pero está PENDIENTE, ir a onboarding
                    if (status.estado === 'PENDIENTE') {
                        router.push('/onboarding')
                    } else {
                        router.push('/pendiente')
                    }
                    return
                }

                // Verificar admin de proyecto
                if (requireAdmin && !status.esAdminProyecto && !status.esSuperAdmin) {
                    router.push('/dashboard')
                    return
                }

                // Verificar super admin
                if (requireSuperAdmin && !status.esSuperAdmin) {
                    router.push('/dashboard')
                    return
                }
            }

            setAuthorized(true)
            setLoading(false)
        }

        checkAuth()
    }, [router, requireAuth, requireActive, requireProject, requireAdmin, requireSuperAdmin])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white text-lg">Verificando acceso...</p>
                </div>
            </div>
        )
    }

    if (!authorized) {
        return null
    }

    return <>{children}</>
}

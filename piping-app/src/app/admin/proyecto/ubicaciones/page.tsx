'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/services/auth'
import { useRouter } from 'next/navigation'
import LocationsManager from '@/components/spools/LocationsManager'
import type { User } from '@/types'

function UbicacionesContent() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadUser() {
            const currentUser = await getCurrentUser()
            setUser(currentUser)
            setLoading(false)
        }
        loadUser()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!user || !user.proyecto_id) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">No tienes un proyecto asignado</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Breadcrumb */}
            <div className="mb-6">
                <button
                    onClick={() => router.push('/admin/proyecto')}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                    ← Volver a Panel de Administración
                </button>
            </div>

            {/* Locations Manager */}
            <LocationsManager
                projectId={user.proyecto_id}
                userRole={user.rol}
            />
        </div>
    )
}

export default function UbicacionesPage() {
    return (
        <ProtectedRoute requireAuth requireActive requireProject>
            <UbicacionesContent />
        </ProtectedRoute>
    )
}

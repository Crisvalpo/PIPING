'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import MasterViewsManager from '@/components/master-views/MasterViewsManager'
import { useState, useEffect } from 'react'
import { getMyProyecto } from '@/services/proyectos'
import type { ProyectoWithEmpresa } from '@/types'

export default function MasterViewsPage() {
    const [proyecto, setProyecto] = useState<ProyectoWithEmpresa | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const p = await getMyProyecto()
                setProyecto(p)
            } catch (error) {
                console.error("Error loading project:", error)
            }
        }
        load()
    }, [])

    return (
        <ProtectedRoute requireAuth requireActive>
            <div className="min-h-screen bg-gray-50 p-4 md:p-6">
                <div className="max-w-7xl mx-auto">
                    {proyecto ? (
                        <MasterViewsManager projectId={proyecto.id} />
                    ) : (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    )
}

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
            {/* Full-screen white background for mobile field use - with top padding for navbar */}
            <div className="fixed inset-0 top-16 bg-white overflow-auto px-3 py-4 min-h-screen">
                {proyecto ? (
                    <MasterViewsManager projectId={proyecto.id} />
                ) : (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    )
}

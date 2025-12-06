'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, ArrowLeft } from 'lucide-react'
import KanbanBoard from '@/components/cuadrillas/KanbanBoard'
import { supabase } from '@/lib/supabase'

interface PageProps {
    params: Promise<{ id: string }>
}

export default function CuadrillasManagePage({ params }: PageProps) {
    // Unwrap the params Promise (Next.js 15 requirement)
    const { id: proyectoId } = use(params)

    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [proyecto, setProyecto] = useState<any>(null)
    const [cuadrillas, setCuadrillas] = useState<any[]>([])
    const [personalDisponible, setPersonalDisponible] = useState<any[]>([])
    const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0])
    const [isSuperAdminUser, setIsSuperAdminUser] = useState(false)

    useEffect(() => {
        loadData()
    }, [proyectoId])

    async function loadData() {
        try {
            // Check authentication
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // Check if super admin for navigation purposes
            const { isSuperAdmin } = await import('@/services/auth')
            const superAdmin = await isSuperAdmin()
            setIsSuperAdminUser(superAdmin)

            // Fetch project details
            const { data: proyectoData, error: proyectoError } = await supabase
                .from('proyectos')
                .select('id, nombre, codigo')
                .eq('id', proyectoId)
                .single()

            if (proyectoError || !proyectoData) {
                console.error('Error fetching proyecto:', proyectoError)
                console.error('ProyectoId:', proyectoId)
                console.error('ProyectoData:', proyectoData)
                setError('No se pudo cargar el proyecto. ' + (proyectoError?.message || 'Proyecto no encontrado'))
                setLoading(false)
                return
            }

            setProyecto(proyectoData)

            // Fetch daily cuadrillas status
            const response = await fetch(`/api/proyectos/${proyectoId}/cuadrillas/daily`, {
                cache: 'no-store'
            })

            const result = await response.json()

            if (result.success) {
                setCuadrillas(result.data.cuadrillas)
                setPersonalDisponible(result.data.personal_disponible)
                setFecha(result.data.fecha)
            }

        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
                <div className="max-w-md w-full backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
                    <div className="text-red-400 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Error al Cargar Proyecto</h2>
                    <p className="text-white/70 mb-6">{error}</p>
                    <button
                        onClick={() => router.push(isSuperAdminUser ? '/admin/cuadrillas' : '/dashboard')}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Volver
                    </button>
                </div>
            </div>
        )
    }

    if (!proyecto) {
        return null
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
            {/* Header */}
            <div className="bg-white/5 backdrop-blur-md border-b border-white/10">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    if (isSuperAdminUser) {
                                        router.push('/admin/cuadrillas')
                                    } else {
                                        router.push('/dashboard')
                                    }
                                }}
                                className="text-white/60 hover:text-white transition-colors cursor-pointer"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white">
                                    Gestión Diaria de Cuadrillas
                                </h1>
                                <p className="text-white/60 text-sm">
                                    {proyecto.nombre} ({proyecto.codigo})
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
                {/* Instructions */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                    <h3 className="text-blue-300 font-semibold mb-2">💡 Cómo usar</h3>
                    <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
                        <li>Arrastra trabajadores entre cuadrillas para reasignarlos</li>
                        <li>Arrastra desde "Disponibles" para asignar personal a una cuadrilla</li>
                        <li>Arrastra a "Disponibles" para desasignar de una cuadrilla</li>
                        <li>Los movimientos se registran con fecha y hora para tracking completo</li>
                    </ul>
                </div>

                {/* Kanban Board */}
                <KanbanBoard
                    proyectoId={proyectoId}
                    initialCuadrillas={cuadrillas}
                    initialPersonalDisponible={personalDisponible}
                    fecha={fecha}
                />
            </div>
        </div>
    )
}

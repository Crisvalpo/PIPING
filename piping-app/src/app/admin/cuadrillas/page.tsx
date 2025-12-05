'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllProyectos } from '@/services/proyectos'
import { Users, Search, ArrowRight, Calendar } from 'lucide-react'

interface ProyectoWithEmpresa {
    id?: string
    nombre: string
    codigo: string
    descripcion?: string
    estado: 'ACTIVO' | 'PAUSADO' | 'FINALIZADO'
    empresa?: {
        nombre: string
    }
}

export default function CuadrillasPage() {
    const router = useRouter()
    const [proyectos, setProyectos] = useState<ProyectoWithEmpresa[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        loadProyectos()
    }, [])

    async function loadProyectos() {
        try {
            const { isSuperAdmin } = await import('@/services/auth')
            const { getMyProyecto } = await import('@/services/proyectos')

            // Check if user is super admin
            const superAdmin = await isSuperAdmin()

            if (superAdmin) {
                // Super admin sees all active projects
                const data = await getAllProyectos()
                const activeProjects = data.filter((p: any) => p.estado === 'ACTIVO')
                setProyectos(activeProjects)
            } else {
                // Regular users see only their project (NO auto-redirect)
                const userProject = await getMyProyecto()
                if (userProject && userProject.estado === 'ACTIVO') {
                    setProyectos([userProject])
                } else {
                    setProyectos([])
                }
            }
        } catch (error) {
            console.error('Error loading proyectos:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredProyectos = proyectos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.empresa?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">
                                Gestión de Cuadrillas
                            </h1>
                            <p className="text-white/70 text-lg">
                                Selecciona un proyecto para gestionar sus cuadrillas diarias
                            </p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl">
                            <Users className="w-10 h-10 text-white" />
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, código o empresa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                        />
                    </div>
                </div>

                {/* Projects Grid */}
                {filteredProyectos.length === 0 ? (
                    <div className="backdrop-blur-xl bg-white/5 rounded-3xl shadow-xl border border-white/10 p-12 text-center">
                        <Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">
                            {searchTerm ? 'No se encontraron proyectos' : 'No hay proyectos activos'}
                        </h3>
                        <p className="text-white/60">
                            {searchTerm
                                ? 'Intenta con otro término de búsqueda'
                                : 'Los proyectos activos aparecerán aquí'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProyectos.map((proyecto) => (
                            <div
                                key={proyecto.id}
                                onClick={() => router.push(`/proyectos/${proyecto.id}/cuadrillas/manage`)}
                                className="group cursor-pointer backdrop-blur-xl bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/40 rounded-2xl p-6 transition-all duration-200 hover:scale-105 hover:shadow-2xl"
                            >
                                {/* Project Icon & Status */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl group-hover:from-blue-500 group-hover:to-purple-500 transition-all">
                                        <Users className="w-8 h-8 text-blue-300 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="px-3 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded-full text-xs font-bold">
                                        {proyecto.estado}
                                    </span>
                                </div>

                                {/* Project Info */}
                                <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">
                                    {proyecto.nombre}
                                </h3>

                                {proyecto.empresa && (
                                    <p className="text-purple-300 text-sm font-medium mb-3">
                                        {proyecto.empresa.nombre}
                                    </p>
                                )}

                                {proyecto.descripcion && (
                                    <p className="text-white/60 text-sm mb-4 line-clamp-2">
                                        {proyecto.descripcion}
                                    </p>
                                )}

                                {/* Footer */}
                                <div className="border-t border-white/10 pt-4 mt-4 flex items-center justify-between">
                                    <span className="font-mono bg-black/30 px-3 py-1 rounded text-xs text-white/80">
                                        {proyecto.codigo}
                                    </span>
                                    <div className="flex items-center gap-2 text-blue-300 text-sm font-medium group-hover:text-white transition-colors">
                                        <span>Gestionar</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info Card */}
                <div className="mt-8 backdrop-blur-xl bg-blue-500/10 border border-blue-400/30 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-xl flex-shrink-0">
                            <Calendar className="w-6 h-6 text-blue-300" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-2">💡 ¿Qué es la gestión de cuadrillas?</h3>
                            <p className="text-blue-100 text-sm">
                                El sistema Kanban te permite gestionar diariamente la asignación de personal a cada cuadrilla.
                                Arrastra y suelta trabajadores entre cuadrillas, visualiza el estado actual y mantén un historial
                                completo de todas las asignaciones.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

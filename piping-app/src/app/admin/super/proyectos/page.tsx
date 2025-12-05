'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllProyectosWithDetails, updateProyectoStatus, deleteProyecto } from '@/services/super-admin'
import ProtectedRoute from '@/components/ProtectedRoute'
import type { Proyecto } from '@/types'

// Tipo extendido
interface ProyectoWithStats extends Proyecto {
    empresa: { nombre: string }
    users: { count: number }[]
}

function GestionProyectosContent() {
    const router = useRouter()
    const [proyectos, setProyectos] = useState<ProyectoWithStats[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        const data = await getAllProyectosWithDetails()
        // Mapear para simplificar
        const formatted = (data as any[]).map(p => ({
            ...p,
            users: p.users || []
        }))
        setProyectos(formatted)
        setLoading(false)
    }

    async function handleStatusChange(id: string, currentStatus: string) {
        // Ciclo de estados: ACTIVO -> PAUSADO -> FINALIZADO -> ACTIVO
        let newStatus: 'ACTIVO' | 'PAUSADO' | 'FINALIZADO'
        if (currentStatus === 'ACTIVO') newStatus = 'PAUSADO'
        else if (currentStatus === 'PAUSADO') newStatus = 'FINALIZADO'
        else newStatus = 'ACTIVO'

        if (!confirm(`¿Cambiar estado del proyecto a ${newStatus}?`)) return

        setProcessing(id)
        const result = await updateProyectoStatus(id, newStatus)

        if (result.success) {
            setProyectos(proyectos.map(p => p.id === id ? { ...p, estado: newStatus } : p))
        } else {
            alert('Error: ' + result.message)
        }
        setProcessing(null)
    }

    async function handleDelete(id: string) {
        const proyecto = proyectos.find(p => p.id === id)
        if (!proyecto) return

        const usersCount = proyecto.users[0]?.count || 0

        // Verificación previa: Mostrar advertencia clara si hay usuarios
        if (usersCount > 0) {
            const confirmMessage = `⚠️ ADVERTENCIA: Este proyecto tiene ${usersCount} usuario(s) asociado(s).\n\n` +
                `No se puede eliminar hasta que reasignes estos usuarios a otro proyecto.\n\n` +
                `¿Deseas ver la lista de usuarios?`

            if (confirm(confirmMessage)) {
                // TODO: Aquí podrías abrir un modal con la lista de usuarios
                alert(`Funcionalidad de lista de usuarios en desarrollo.\n\nPor ahora, ve a "Gestión de Usuarios" para reasignar los ${usersCount} usuario(s).`)
            }
            return
        }

        // Si no hay usuarios, pedir confirmación final
        const confirmDelete = `¿Estás seguro de ELIMINAR el proyecto "${proyecto.nombre}"?\n\n` +
            `Código: ${proyecto.codigo}\n` +
            `Empresa: ${proyecto.empresa?.nombre}\n\n` +
            `⚠️ Esta acción NO se puede deshacer.\n` +
            `Las invitaciones pendientes también se eliminarán.`

        if (!confirm(confirmDelete)) return

        setProcessing(id)
        const result = await deleteProyecto(id)

        if (result.success) {
            setProyectos(proyectos.filter(p => p.id !== id))
            alert('✅ ' + result.message)
        } else {
            alert('❌ ' + result.message)
        }
        setProcessing(null)
    }


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <button
                            onClick={() => router.push('/admin/super')}
                            className="text-gray-300 hover:text-white mb-2 flex items-center text-sm"
                        >
                            ← Volver al Panel
                        </button>
                        <h1 className="text-3xl font-bold text-white">Gestión de Proyectos</h1>
                        <p className="text-gray-400">Listado de todos los proyectos activos</p>
                    </div>
                </div>

                {/* Lista de Proyectos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {proyectos.map((proyecto) => (
                        <div
                            key={proyecto.id}
                            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-green-500/20 rounded-xl group-hover:bg-green-500 transition-colors">
                                    <svg className="w-8 h-8 text-green-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-bold border ${proyecto.estado === 'ACTIVO'
                                    ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                    : proyecto.estado === 'PAUSADO'
                                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                        : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                                    }`}>
                                    {proyecto.estado}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1">{proyecto.nombre}</h3>
                            <p className="text-purple-300 text-sm font-medium mb-2">{proyecto.empresa?.nombre}</p>
                            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                {proyecto.descripcion || 'Sin descripción'}
                            </p>

                            <div className="border-t border-white/10 pt-4 mt-4 mb-4 flex justify-between items-center text-sm text-gray-300">
                                <span className="font-mono bg-black/20 px-2 py-1 rounded text-xs">
                                    {proyecto.codigo}
                                </span>
                                <div className={`flex items-center gap-2 px-2 py-1 rounded ${(proyecto.users[0]?.count || 0) > 0
                                        ? 'bg-orange-500/20 border border-orange-500/30'
                                        : 'bg-white/5'
                                    }`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <span className={`font-bold ${(proyecto.users[0]?.count || 0) > 0 ? 'text-orange-300' : 'text-white'
                                        }`}>
                                        {proyecto.users[0]?.count || 0}
                                    </span>
                                    {(proyecto.users[0]?.count || 0) > 0 && (
                                        <span className="text-xs text-orange-300">⚠️</span>
                                    )}
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleStatusChange(proyecto.id!, proyecto.estado)}
                                    disabled={processing === proyecto.id}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${proyecto.estado === 'ACTIVO'
                                        ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/30'
                                        : proyecto.estado === 'PAUSADO'
                                            ? 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 border border-gray-500/30'
                                            : 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {processing === proyecto.id ? '...' :
                                        proyecto.estado === 'ACTIVO' ? 'Pausar' :
                                            proyecto.estado === 'PAUSADO' ? 'Finalizar' : 'Reactivar'}
                                </button>
                                <button
                                    onClick={() => handleDelete(proyecto.id!)}
                                    disabled={processing === proyecto.id}
                                    className="px-3 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing === proyecto.id ? '...' : 'Eliminar'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function GestionProyectosPage() {
    return (
        <ProtectedRoute requireAuth requireActive requireSuperAdmin>
            <GestionProyectosContent />
        </ProtectedRoute>
    )
}

'use client'

import { useState, useEffect } from 'react'
import StatusCard from './StatusCard'
import StatusForm from './StatusForm'

interface Status {
    id: string
    project_id: string
    name: string
    code: string | null
    description: string | null
    color: string
    icon: string | null
    order_index: number
    is_initial: boolean
    is_final: boolean
    requires_photo: boolean
    is_active: boolean
}

interface StatusesManagerProps {
    projectId: string
    userRole?: string
}

export default function StatusesManager({ projectId, userRole }: StatusesManagerProps) {
    const [statuses, setStatuses] = useState<Status[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('active')
    const [showForm, setShowForm] = useState(false)
    const [editingStatus, setEditingStatus] = useState<Status | null>(null)

    const isAdmin = userRole === 'ADMIN'

    useEffect(() => {
        loadStatuses()
    }, [projectId])

    const loadStatuses = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/projects/${projectId}/statuses`)

            if (!response.ok) {
                throw new Error('Error al cargar estados')
            }

            const data = await response.json()
            setStatuses(data)
        } catch (error: any) {
            console.error('Error loading statuses:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = () => {
        setEditingStatus(null)
        setShowForm(true)
    }

    const handleEdit = (status: Status) => {
        setEditingStatus(status)
        setShowForm(true)
    }

    const handleDelete = async (statusId: string) => {
        if (!confirm('¿Estás seguro de desactivar este estado?')) return

        try {
            const response = await fetch(`/api/projects/${projectId}/statuses/${statusId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Error al desactivar estado')
            }

            await loadStatuses()
        } catch (error: any) {
            console.error('Error deleting status:', error)
            alert(error.message)
        }
    }

    const handleFormClose = () => {
        setShowForm(false)
        setEditingStatus(null)
    }

    const handleFormSuccess = () => {
        setShowForm(false)
        setEditingStatus(null)
        loadStatuses()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        )
    }

    const filteredStatuses = statuses.filter(status => {
        if (filter === 'active') return status.is_active
        if (filter === 'inactive') return !status.is_active
        return true
    })

    return (
        <div className="space-y-6">
            {/* Header - Enhanced */}
            <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-white">Estados de Spools</h2>
                        </div>
                        <p className="text-purple-200 ml-14">
                            Gestiona los estados del ciclo de vida de spools
                        </p>
                    </div>

                    {isAdmin && (
                        <button
                            onClick={handleCreate}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Nuevo Estado
                        </button>
                    )}
                </div>
            </div>

            {/* Filters - Enhanced */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${filter === 'active'
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                                : 'bg-white/10 text-purple-100 hover:bg-white/20 border border-white/20'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${filter === 'active' ? 'bg-white' : 'bg-green-400'}`}></span>
                            Activos ({statuses.filter(s => s.is_active).length})
                        </span>
                    </button>
                    <button
                        onClick={() => setFilter('inactive')}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${filter === 'inactive'
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                                : 'bg-white/10 text-purple-100 hover:bg-white/20 border border-white/20'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${filter === 'inactive' ? 'bg-white' : 'bg-gray-400'}`}></span>
                            Inactivos ({statuses.filter(s => !s.is_active).length})
                        </span>
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${filter === 'all'
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                                : 'bg-white/10 text-purple-100 hover:bg-white/20 border border-white/20'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${filter === 'all' ? 'bg-white' : 'bg-blue-400'}`}></span>
                            Todos ({statuses.length})
                        </span>
                    </button>
                </div>
            </div>

            {/* Statuses list */}
            <div className="space-y-6">
                {filteredStatuses.length > 0 && (
                    <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-xl border border-white/20 p-6">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
                            <span className="text-3xl">📊</span>
                            <span>Estados ({filteredStatuses.length})</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStatuses.map(status => (
                                <StatusCard
                                    key={status.id}
                                    status={status}
                                    onEdit={isAdmin ? handleEdit : undefined}
                                    onDelete={isAdmin ? handleDelete : undefined}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state - Enhanced */}
                {filteredStatuses.length === 0 && (
                    <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-12">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-2xl mb-6">
                                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                No hay estados {filter === 'active' ? 'activos' : filter === 'inactive' ? 'inactivos' : ''}
                            </h3>
                            <p className="text-purple-200 mb-6">
                                {isAdmin
                                    ? filter === 'active'
                                        ? 'Comienza creando el primer estado para el ciclo de vida de spools'
                                        : 'No tienes estados inactivos en este momento'
                                    : 'No hay estados disponibles para mostrar'
                                }
                            </p>
                            {isAdmin && filter === 'active' && (
                                <button
                                    onClick={handleCreate}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Crear Primer Estado
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <StatusForm
                    projectId={projectId}
                    status={editingStatus}
                    onClose={handleFormClose}
                    onSuccess={handleFormSuccess}
                />
            )}
        </div>
    )
}

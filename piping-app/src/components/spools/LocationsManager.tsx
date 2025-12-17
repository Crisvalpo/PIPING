'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import LocationCard from './LocationCard'
import LocationForm from './LocationForm'

interface Location {
    id: string
    project_id: string
    name: string
    code: string | null
    type: string
    description: string | null
    parent_location_id: string | null
    capacity: number | null
    gps_coords: { lat: number; lng: number } | null
    is_active: boolean
    created_at: string
    updated_at: string
}

interface LocationsManagerProps {
    projectId: string
    userRole?: string
}

export default function LocationsManager({ projectId, userRole }: LocationsManagerProps) {
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingLocation, setEditingLocation] = useState<Location | null>(null)
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active')

    useEffect(() => {
        loadLocations()
    }, [projectId])

    const loadLocations = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/projects/${projectId}/locations`)

            if (!response.ok) {
                throw new Error('Error al cargar ubicaciones')
            }

            const data = await response.json()
            setLocations(data)
        } catch (error) {
            console.error('Error loading locations:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = () => {
        setEditingLocation(null)
        setShowForm(true)
    }

    const handleEdit = (location: Location) => {
        setEditingLocation(location)
        setShowForm(true)
    }

    const handleDelete = async (locationId: string) => {
        if (!confirm('¿Estás seguro de desactivar esta ubicación?')) {
            return
        }

        try {
            const response = await fetch(`/api/projects/${projectId}/locations/${locationId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al eliminar')
            }

            await loadLocations()
        } catch (error: any) {
            alert(error.message)
        }
    }

    const handleFormClose = () => {
        setShowForm(false)
        setEditingLocation(null)
    }

    const handleFormSuccess = () => {
        loadLocations()
        handleFormClose()
    }

    const filteredLocations = locations.filter(loc => {
        if (filter === 'active') return loc.is_active
        if (filter === 'inactive') return !loc.is_active
        return true
    })

    const locationsByType = filteredLocations.reduce((acc, loc) => {
        if (!acc[loc.type]) acc[loc.type] = []
        acc[loc.type].push(loc)
        return acc
    }, {} as Record<string, Location[]>)

    const typeLabels: Record<string, string> = {
        workshop: '🏭 Maestranzas',
        storage: '📦 Bodegas/Acopios',
        field: '🔧 Terreno',
        transit: '🚛 En Tránsito',
        installed: '✅ Instalados',
        other: '📍 Otros'
    }

    const isAdmin = userRole === 'ADMIN'

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header - Enhanced */}
            <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-white">Ubicaciones</h2>
                        </div>
                        <p className="text-purple-200 ml-14">
                            Gestiona las ubicaciones de spools para este proyecto
                        </p>
                    </div>

                    {isAdmin && (
                        <button
                            onClick={handleCreate}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Nueva Ubicación
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
                            Activas ({locations.filter(l => l.is_active).length})
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
                            Inactivas ({locations.filter(l => !l.is_active).length})
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
                            Todas ({locations.length})
                        </span>
                    </button>
                </div>
            </div>

            {/* Locations grouped by type */}
            <div className="space-y-6">
                {Object.entries(locationsByType).map(([type, locs]) => (
                    <div key={type} className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-xl border border-white/20 p-6">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
                            <span className="text-3xl">{typeLabels[type]?.split(' ')[0]}</span>
                            <span>{typeLabels[type]?.substring(typeLabels[type].indexOf(' ') + 1)}</span>
                            <span className="px-3 py-1 bg-white/20 rounded-full text-lg">
                                {locs.length}
                            </span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {locs.map(location => (
                                <LocationCard
                                    key={location.id}
                                    location={location}
                                    onEdit={isAdmin ? handleEdit : undefined}
                                    onDelete={isAdmin ? handleDelete : undefined}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {/* Empty state - Enhanced */}
                {filteredLocations.length === 0 && (
                    <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-12">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-2xl mb-6">
                                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                No hay ubicaciones {filter === 'active' ? 'activas' : filter === 'inactive' ? 'inactivas' : ''}
                            </h3>
                            <p className="text-purple-200 mb-6">
                                {isAdmin
                                    ? filter === 'active'
                                        ? 'Comienza creando tu primera ubicación para organizar tus spools'
                                        : 'No tienes ubicaciones inactivas en este momento'
                                    : 'No hay ubicaciones disponibles para mostrar'
                                }
                            </p>
                            {isAdmin && filter === 'active' && (
                                <button
                                    onClick={handleCreate}
                                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Crear Primera Ubicación
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <LocationForm
                    projectId={projectId}
                    location={editingLocation}
                    onClose={handleFormClose}
                    onSuccess={handleFormSuccess}
                />
            )}
        </div>
    )
}

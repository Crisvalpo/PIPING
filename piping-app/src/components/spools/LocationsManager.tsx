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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Ubicaciones</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Gestiona las ubicaciones de spools para este proyecto
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        + Nueva Ubicación
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                <button
                    onClick={() => setFilter('active')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'active'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Activas ({locations.filter(l => l.is_active).length})
                </button>
                <button
                    onClick={() => setFilter('inactive')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'inactive'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Inactivas ({locations.filter(l => !l.is_active).length})
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Todas ({locations.length})
                </button>
            </div>

            {/* Locations grouped by type */}
            <div className="space-y-6">
                {Object.entries(locationsByType).map(([type, locs]) => (
                    <div key={type} className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            {typeLabels[type] || type}
                            <span className="text-sm font-normal text-gray-500">
                                ({locs.length})
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

                {filteredLocations.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <p className="text-lg">No hay ubicaciones {filter === 'active' ? 'activas' : filter === 'inactive' ? 'inactivas' : ''}</p>
                        {isAdmin && filter === 'active' && (
                            <button
                                onClick={handleCreate}
                                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                            >
                                + Crear primera ubicación
                            </button>
                        )}
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

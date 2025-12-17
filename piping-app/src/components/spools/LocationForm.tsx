'use client'

import { useState, useEffect } from 'react'

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
}

interface LocationFormProps {
    projectId: string
    location?: Location | null
    onClose: () => void
    onSuccess: () => void
}

export default function LocationForm({ projectId, location, onClose, onSuccess }: LocationFormProps) {
    const [formData, setFormData] = useState({
        name: location?.name || '',
        code: location?.code || '',
        type: location?.type || 'storage',
        description: location?.description || '',
        capacity: location?.capacity?.toString() || '',
        is_active: location?.is_active ?? true
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSaving(true)

        try {
            const payload = {
                name: formData.name.trim(),
                code: formData.code.trim() || null,
                type: formData.type,
                description: formData.description.trim() || null,
                capacity: formData.capacity ? parseInt(formData.capacity) : null,
                is_active: formData.is_active
            }

            const url = location
                ? `/api/projects/${projectId}/locations/${location.id}`
                : `/api/projects/${projectId}/locations`

            const method = location ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al guardar')
            }

            onSuccess()
        } catch (error: any) {
            setError(error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-xl">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {location ? 'Editar Ubicación' : 'Nueva Ubicación'}
                    </h2>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            placeholder="Bodega Central, Terreno Sector A, etc."
                            required
                        />
                    </div>

                    {/* Code */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Código (opcional)
                        </label>
                        <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-gray-900"
                            placeholder="BC, TSA, etc."
                            maxLength={10}
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) => handleChange('type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            required
                        >
                            <option value="workshop">🏭 Maestranza</option>
                            <option value="storage">📦 Bodega/Acopio</option>
                            <option value="field">🔧 Terreno</option>
                            <option value="transit">🚛 En Tránsito</option>
                            <option value="installed">✅ Instalado</option>
                            <option value="other">📍 Otro</option>
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción (opcional)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            placeholder="Descripción de la ubicación..."
                            rows={3}
                        />
                    </div>

                    {/* Capacity */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Capacidad (opcional)
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={formData.capacity}
                                onChange={(e) => handleChange('capacity', e.target.value)}
                                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                placeholder="100"
                                min="0"
                            />
                            <span className="text-sm text-gray-600">spools máximo</span>
                        </div>
                    </div>

                    {/* Status (only for edit) */}
                    {location && (
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => handleChange('is_active', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                                Ubicación activa
                            </label>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : location ? 'Guardar Cambios' : 'Crear Ubicación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

'use client'

import { useState } from 'react'

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

interface StatusFormProps {
    projectId: string
    status?: Status | null
    onClose: () => void
    onSuccess: () => void
}

export default function StatusForm({ projectId, status, onClose, onSuccess }: StatusFormProps) {
    const [formData, setFormData] = useState({
        name: status?.name || '',
        code: status?.code || '',
        description: status?.description || '',
        color: status?.color || '#6B7280',
        icon: status?.icon || '',
        order_index: status?.order_index?.toString() || '0',
        is_initial: status?.is_initial ?? false,
        is_final: status?.is_final ?? false,
        requires_photo: status?.requires_photo ?? false,
        is_active: status?.is_active ?? true
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
                description: formData.description.trim() || null,
                color: formData.color,
                icon: formData.icon.trim() || null,
                order_index: parseInt(formData.order_index),
                is_initial: formData.is_initial,
                is_final: formData.is_final,
                requires_photo: formData.requires_photo,
                is_active: formData.is_active
            }

            const url = status
                ? `/api/projects/${projectId}/statuses/${status.id}`
                : `/api/projects/${projectId}/statuses`

            const method = status ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || `Error ${response.status}`)
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

    // Preset colors
    const presetColors = [
        { name: 'Gris', value: '#6B7280' },
        { name: 'Azul', value: '#3B82F6' },
        { name: 'Verde', value: '#10B981' },
        { name: 'Amarillo', value: '#F59E0B' },
        { name: 'Naranja', value: '#F97316' },
        { name: 'Rojo', value: '#EF4444' },
        { name: 'Púrpura', value: '#8B5CF6' },
        { name: 'Rosa', value: '#EC4899' },
    ]

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-xl">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {status ? 'Editar Estado' : 'Nuevo Estado'}
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                            placeholder="Acopiado, En Levantamiento, etc."
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-gray-900"
                            placeholder="ACO, LEV, INS, LIB"
                            maxLength={10}
                        />
                    </div>

                    {/* Icon */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ícono/Emoji (opcional)
                        </label>
                        <input
                            type="text"
                            value={formData.icon}
                            onChange={(e) => handleChange('icon', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                            placeholder="📦 🔍 ✅"
                            maxLength={5}
                        />
                    </div>

                    {/* Color with presets */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Color <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2 mb-2">
                            {presetColors.map(preset => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => handleChange('color', preset.value)}
                                    className={`w-10 h-10 rounded-lg border-2 transition-all ${formData.color === preset.value
                                            ? 'border-gray-900 scale-110'
                                            : 'border-gray-300 hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: preset.value }}
                                    title={preset.name}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => handleChange('color', e.target.value)}
                                className="w-20 h-10 rounded border border-gray-300"
                            />
                            <input
                                type="text"
                                value={formData.color}
                                onChange={(e) => handleChange('color', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-gray-900"
                                placeholder="#6B7280"
                                pattern="^#[0-9A-Fa-f]{6}$"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción (opcional)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                            placeholder="Descripción del estado..."
                            rows={3}
                        />
                    </div>

                    {/* Order Index */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Orden en el flujo
                        </label>
                        <input
                            type="number"
                            value={formData.order_index}
                            onChange={(e) => handleChange('order_index', e.target.value)}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                            min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Menor número = estado más temprano</p>
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_initial"
                                checked={formData.is_initial}
                                onChange={(e) => handleChange('is_initial', e.target.checked)}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <label htmlFor="is_initial" className="text-sm font-medium text-gray-700">
                                🚀 Puede ser estado inicial (para spools nuevos)
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_final"
                                checked={formData.is_final}
                                onChange={(e) => handleChange('is_final', e.target.checked)}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <label htmlFor="is_final" className="text-sm font-medium text-gray-700">
                                ✅ Es estado final (completado)
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="requires_photo"
                                checked={formData.requires_photo}
                                onChange={(e) => handleChange('requires_photo', e.target.checked)}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <label htmlFor="requires_photo" className="text-sm font-medium text-gray-700">
                                📸 Requiere foto de evidencia
                            </label>
                        </div>

                        {status && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => handleChange('is_active', e.target.checked)}
                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                                    Estado activo
                                </label>
                            </div>
                        )}
                    </div>

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
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : status ? 'Guardar Cambios' : 'Crear Estado'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

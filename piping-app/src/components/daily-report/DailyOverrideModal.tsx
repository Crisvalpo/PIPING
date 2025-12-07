'use client'

import { useState, useEffect } from 'react'
import { X, Save, Calendar, Trash2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Override {
    id: string
    date: string
    new_end_time: string
    reason: string | null
    active: boolean
}

interface DailyOverrideModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    currentDate?: string // If provided, pre-fill form with this date
    onSave?: () => void
}

export default function DailyOverrideModal({ isOpen, onClose, projectId, currentDate, onSave }: DailyOverrideModalProps) {
    const [loading, setLoading] = useState(false)
    const [overrides, setOverrides] = useState<Override[]>([])
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({
        date: currentDate || new Date().toISOString().split('T')[0],
        new_end_time: '14:00',
        reason: ''
    })

    useEffect(() => {
        if (isOpen && projectId) {
            loadOverrides()
        }
    }, [isOpen, projectId])

    async function loadOverrides() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('project_daily_overrides')
                .select('*')
                .eq('proyecto_id', projectId)
                .order('date', { ascending: false })
                .limit(20)

            if (error) throw error
            setOverrides(data || [])
        } catch (error) {
            console.error('Error loading overrides:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        try {
            setLoading(true)

            const { error } = await supabase
                .from('project_daily_overrides')
                .insert({
                    proyecto_id: projectId,
                    date: formData.date,
                    new_end_time: formData.new_end_time,
                    reason: formData.reason || null,
                    active: true
                })

            if (error) throw error

            await loadOverrides()
            setShowForm(false)
            setFormData({
                date: new Date().toISOString().split('T')[0],
                new_end_time: '14:00',
                reason: ''
            })
            if (onSave) onSave()
            alert('Excepción creada correctamente')
        } catch (error: any) {
            console.error('Error saving override:', error)
            alert(`Error al guardar: ${error?.message || 'Error desconocido'}`)
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar esta excepción?')) return

        try {
            setLoading(true)
            const { error } = await supabase
                .from('project_daily_overrides')
                .delete()
                .eq('id', id)

            if (error) throw error

            await loadOverrides()
            if (onSave) onSave()
            alert('Excepción eliminada')
        } catch (error: any) {
            console.error('Error deleting override:', error)
            alert(`Error al eliminar: ${error?.message || 'Error desconocido'}`)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-orange-100 p-2 text-orange-600">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Excepciones de Jornada</h3>
                            <p className="text-sm text-gray-500">Días con horarios especiales</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Add Button */}
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors font-medium"
                        >
                            + Agregar Excepción
                        </button>
                    )}

                    {/* Form */}
                    {showForm && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Fecha</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Nueva Hora Término</label>
                                    <input
                                        type="time"
                                        value={formData.new_end_time}
                                        onChange={(e) => setFormData({ ...formData, new_end_time: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Motivo (opcional)</label>
                                <input
                                    type="text"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Ej: Nochebuena - Media jornada"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    Guardar Excepción
                                </button>
                            </div>
                        </div>
                    )}

                    {/* List of Overrides */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">Excepciones Registradas</h4>
                        {loading && overrides.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">Cargando...</div>
                        ) : overrides.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">No hay excepciones registradas</div>
                        ) : (
                            <div className="space-y-2">
                                {overrides.map((override) => (
                                    <div key={override.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-orange-600" />
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {new Date(override.date + 'T00:00:00').toLocaleDateString('es-CL', {
                                                        weekday: 'short',
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Termina a las {override.new_end_time.substring(0, 5)}
                                                    {override.reason && ` • ${override.reason}`}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(override.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}

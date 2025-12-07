'use client'

import { useState, useEffect } from 'react'
import { X, Save, Clock, Plus, Trash2, Check, Edit2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Shift {
    id: string
    shift_name: string
    start_time: string
    end_time: string
    lunch_break_minutes: number
    is_default: boolean
    active: boolean
}

interface ShiftConfigurationModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    onSave?: () => void
}

export default function ShiftConfigurationModal({ isOpen, onClose, projectId, onSave }: ShiftConfigurationModalProps) {
    const [loading, setLoading] = useState(false)
    const [shifts, setShifts] = useState<Shift[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({
        shift_name: '',
        start_time: '08:00',
        end_time: '20:00',
        lunch_break_minutes: 60
    })

    useEffect(() => {
        if (isOpen && projectId) {
            loadShifts()
        }
    }, [isOpen, projectId])

    async function loadShifts() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('project_shifts')
                .select('*')
                .eq('proyecto_id', projectId)
                .eq('active', true)
                .order('is_default', { ascending: false })

            if (error) throw error
            setShifts(data || [])
        } catch (error) {
            console.error('Error loading shifts:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        try {
            setLoading(true)

            if (editingId) {
                // Update existing shift
                const { error } = await supabase
                    .from('project_shifts')
                    .update({
                        shift_name: formData.shift_name,
                        start_time: formData.start_time,
                        end_time: formData.end_time,
                        lunch_break_minutes: formData.lunch_break_minutes,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingId)

                if (error) throw error
                alert('Turno actualizado correctamente')
            } else {
                // Create new shift
                const isFirstShift = shifts.length === 0

                const { error } = await supabase
                    .from('project_shifts')
                    .insert({
                        proyecto_id: projectId,
                        shift_name: formData.shift_name,
                        start_time: formData.start_time,
                        end_time: formData.end_time,
                        lunch_break_minutes: formData.lunch_break_minutes,
                        is_default: isFirstShift, // First shift is auto-default
                        active: true
                    })

                if (error) throw error
                alert('Turno creado correctamente')
            }

            await loadShifts()
            resetForm()
            if (onSave) onSave()
        } catch (error: any) {
            console.error('Error saving shift:', error)
            alert(`Error al guardar: ${error?.message || 'Error desconocido'}`)
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id: string, shiftName: string) {
        if (shifts.length === 1) {
            alert('No puedes eliminar el último turno. El proyecto debe tener al menos un turno activo.')
            return
        }

        if (!confirm(`¿Eliminar el turno "${shiftName}"?\n\nLos trabajadores asignados a este turno perderán la referencia.`)) {
            return
        }

        try {
            setLoading(true)
            const { error } = await supabase
                .from('project_shifts')
                .update({ active: false })
                .eq('id', id)

            if (error) throw error

            await loadShifts()
            alert('Turno eliminado')
            if (onSave) onSave()
        } catch (error: any) {
            console.error('Error deleting shift:', error)
            alert(`Error al eliminar: ${error?.message || 'Error desconocido'}`)
        } finally {
            setLoading(false)
        }
    }

    async function handleSetDefault(id: string) {
        try {
            setLoading(true)

            // Remove default from all shifts
            await supabase
                .from('project_shifts')
                .update({ is_default: false })
                .eq('proyecto_id', projectId)

            // Set new default
            const { error } = await supabase
                .from('project_shifts')
                .update({ is_default: true })
                .eq('id', id)

            if (error) throw error

            await loadShifts()
            alert('Turno por defecto actualizado')
            if (onSave) onSave()
        } catch (error: any) {
            console.error('Error setting default:', error)
            alert(`Error: ${error?.message || 'Error desconocido'}`)
        } finally {
            setLoading(false)
        }
    }

    function startEdit(shift: Shift) {
        setEditingId(shift.id)
        setFormData({
            shift_name: shift.shift_name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            lunch_break_minutes: shift.lunch_break_minutes
        })
        setShowForm(true)
    }

    function resetForm() {
        setEditingId(null)
        setShowForm(false)
        setFormData({
            shift_name: '',
            start_time: '08:00',
            end_time: '20:00',
            lunch_break_minutes: 60
        })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-purple-100 p-2 text-purple-600">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Gestión de Turnos</h3>
                            <p className="text-sm text-gray-500">Configurar múltiples turnos para el proyecto</p>
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
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Add New Button */}
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Agregar Turno
                        </button>
                    )}

                    {/* Form */}
                    {showForm && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900">
                                    {editingId ? 'Editar Turno' : 'Nuevo Turno'}
                                </h4>
                                <button
                                    onClick={resetForm}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Nombre del Turno</label>
                                <input
                                    type="text"
                                    value={formData.shift_name}
                                    onChange={(e) => setFormData({ ...formData, shift_name: e.target.value })}
                                    placeholder="ej: Turno Día, Turno Noche"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Hora Inicio</label>
                                    <input
                                        type="time"
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Hora Término</label>
                                    <input
                                        type="time"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Tiempo de Colación (minutos)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="180"
                                    value={formData.lunch_break_minutes}
                                    onChange={(e) => setFormData({ ...formData, lunch_break_minutes: parseInt(e.target.value) || 0 })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={resetForm}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading || !formData.shift_name}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingId ? 'Actualizar' : 'Crear'} Turno
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Shifts List */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">Turnos Configurados</h4>
                        {loading && shifts.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">Cargando...</div>
                        ) : shifts.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">No hay turnos configurados</div>
                        ) : (
                            <div className="space-y-2">
                                {shifts.map((shift) => (
                                    <div
                                        key={shift.id}
                                        className={`flex items-center justify-between rounded-lg p-4 border-2 transition-all ${shift.is_default
                                                ? 'bg-purple-50 border-purple-300'
                                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h5 className="font-semibold text-gray-900">{shift.shift_name}</h5>
                                                {shift.is_default && (
                                                    <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                                        <Check className="w-3 h-3" />
                                                        Por Defecto
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)} • Colación: {shift.lunch_break_minutes} min
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {!shift.is_default && (
                                                <button
                                                    onClick={() => handleSetDefault(shift.id)}
                                                    className="px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                                    title="Establecer como predeterminado"
                                                >
                                                    Hacer Default
                                                </button>
                                            )}
                                            <button
                                                onClick={() => startEdit(shift)}
                                                className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(shift.id, shift.shift_name)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar"
                                                disabled={shifts.length === 1}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
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

'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Calendar, Users, Trash2, Edit2, AlertCircle } from 'lucide-react'

interface WorkSchedule {
    id: string
    nombre: string
    tipo: 'FIXED_WEEKLY' | 'ROTATING'
    dias_trabajo: number
    dias_descanso: number
    fecha_inicio_grupo?: string
    grupo?: string
    workers_count: number
}

interface WorkScheduleManagerProps {
    isOpen: boolean
    onClose: () => void
    proyectoId: string
    onSave?: () => void
}

export default function WorkScheduleManager({ isOpen, onClose, proyectoId, onSave }: WorkScheduleManagerProps) {
    const [schedules, setSchedules] = useState<WorkSchedule[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        nombre: '',
        tipo: 'FIXED_WEEKLY' as 'FIXED_WEEKLY' | 'ROTATING',
        dias_trabajo: 5,
        dias_descanso: 2,
        fecha_inicio_grupo: '',
        grupo: ''
    })

    useEffect(() => {
        if (isOpen) {
            loadSchedules()
        }
    }, [isOpen, proyectoId])

    async function loadSchedules() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/work-schedules`)
            const json = await res.json()

            if (json.success) {
                setSchedules(json.data || [])
            } else {
                setError(json.error)
            }
        } catch (err) {
            console.error('Error loading schedules:', err)
            setError('Error al cargar jornadas')
        } finally {
            setLoading(false)
        }
    }

    function handleEdit(schedule: WorkSchedule) {
        setEditingSchedule(schedule)
        setFormData({
            nombre: schedule.nombre,
            tipo: schedule.tipo,
            dias_trabajo: schedule.dias_trabajo,
            dias_descanso: schedule.dias_descanso,
            fecha_inicio_grupo: schedule.fecha_inicio_grupo || '',
            grupo: schedule.grupo || ''
        })
        setShowForm(true)
    }

    async function handleDelete(schedule: WorkSchedule) {
        if (!confirm(`¿Eliminar jornada "${schedule.nombre}"?`)) return

        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/work-schedules?schedule_id=${schedule.id}`, {
                method: 'DELETE'
            })
            const json = await res.json()

            if (json.success) {
                await loadSchedules()
                if (onSave) onSave()
            } else {
                alert(json.error || 'Error al eliminar')
            }
        } catch (err) {
            console.error('Error deleting:', err)
            alert('Error al eliminar jornada')
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        try {
            const url = `/api/proyectos/${proyectoId}/work-schedules`
            const method = editingSchedule ? 'PUT' : 'POST'
            const body = editingSchedule
                ? { ...formData, schedule_id: editingSchedule.id }
                : formData

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const json = await res.json()

            if (json.success) {
                setShowForm(false)
                setEditingSchedule(null)
                resetForm()
                await loadSchedules()
                if (onSave) onSave()
            } else {
                setError(json.error || 'Error al guardar')
            }
        } catch (err) {
            console.error('Error saving:', err)
            setError('Error al guardar jornada')
        }
    }

    function resetForm() {
        setFormData({
            nombre: '',
            tipo: 'FIXED_WEEKLY',
            dias_trabajo: 5,
            dias_descanso: 2,
            fecha_inicio_grupo: '',
            grupo: ''
        })
    }

    function cancelForm() {
        setShowForm(false)
        setEditingSchedule(null)
        resetForm()
        setError(null)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-amber-400" />
                            Gestión de Jornadas Laborales
                        </h2>
                        <p className="text-sm text-white/60 mt-1">
                            Define los regímenes de trabajo del proyecto (5x2, 14x14, etc.)
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                        </div>
                    ) : showForm ? (
                        /* Form */
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <h3 className="text-lg font-semibold text-white mb-4">
                                {editingSchedule ? 'Editar Jornada' : 'Nueva Jornada'}
                            </h3>

                            {error && (
                                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                                    <p className="text-red-200 text-sm">{error}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white font-medium mb-2">Nombre</label>
                                    <input
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        placeholder="Ej: 5x2, 14x14 A"
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-white font-medium mb-2">Tipo</label>
                                    <select
                                        value={formData.tipo}
                                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="FIXED_WEEKLY">Semanal Fijo</option>
                                        <option value="ROTATING">Rotativo</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-white font-medium mb-2">Días de Trabajo</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.dias_trabajo}
                                        onChange={(e) => setFormData({ ...formData, dias_trabajo: parseInt(e.target.value) })}
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-white font-medium mb-2">Días de Descanso</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.dias_descanso}
                                        onChange={(e) => setFormData({ ...formData, dias_descanso: parseInt(e.target.value) })}
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                {formData.tipo === 'ROTATING' && (
                                    <>
                                        <div>
                                            <label className="block text-white font-medium mb-2">Fecha Inicio Grupo</label>
                                            <input
                                                type="date"
                                                value={formData.fecha_inicio_grupo}
                                                onChange={(e) => setFormData({ ...formData, fecha_inicio_grupo: e.target.value })}
                                                required={formData.tipo === 'ROTATING'}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-white font-medium mb-2">Grupo</label>
                                            <input
                                                type="text"
                                                value={formData.grupo}
                                                onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                                                placeholder="A, B, C..."
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={cancelForm}
                                    className="px-4 py-2 text-white/70 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium shadow-lg shadow-purple-500/20"
                                >
                                    {editingSchedule ? 'Actualizar' : 'Crear'} Jornada
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* List */
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-white">
                                    Jornadas Configuradas ({schedules.length})
                                </h3>
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium shadow-lg shadow-green-500/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nueva Jornada
                                </button>
                            </div>

                            {schedules.length === 0 ? (
                                <div className="text-center py-12 text-white/50">
                                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>No hay jornadas configuradas</p>
                                    <p className="text-sm mt-2">Crea la primera jornada para comenzar</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {schedules.map((schedule) => (
                                        <div
                                            key={schedule.id}
                                            className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h4 className="text-lg font-semibold text-white mb-1">
                                                        {schedule.nombre}
                                                        {schedule.grupo && (
                                                            <span className="ml-2 text-sm text-purple-400">Grupo {schedule.grupo}</span>
                                                        )}
                                                    </h4>
                                                    <div className="flex items-center gap-4 text-sm text-white/60">
                                                        <span className="px-2 py-1 bg-purple-500/20 rounded text-purple-300">
                                                            {schedule.tipo === 'FIXED_WEEKLY' ? 'Semanal Fijo' : 'Rotativo'}
                                                        </span>
                                                        <span>{schedule.dias_trabajo} días trabajo</span>
                                                        <span>{schedule.dias_descanso} días descanso</span>
                                                        {schedule.fecha_inicio_grupo && (
                                                            <span>Inicio: {new Date(schedule.fecha_inicio_grupo).toLocaleDateString('es-CL')}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-2 text-white/50 text-sm">
                                                        <Users className="w-4 h-4" />
                                                        <span>{schedule.workers_count} trabajadores asignados</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(schedule)}
                                                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(schedule)}
                                                        disabled={schedule.workers_count > 0}
                                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={schedule.workers_count > 0 ? 'No se puede eliminar (trabajadores asignados)' : 'Eliminar'}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!showForm && (
                    <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

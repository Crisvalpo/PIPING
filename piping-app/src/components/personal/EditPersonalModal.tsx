'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Save, AlertCircle } from 'lucide-react'

interface EditPersonalModalProps {
    worker: {
        rut: string
        nombre: string
        email?: string
        telefono?: string
        rol?: string
        jefe_directo_rut?: string | null
        codigo_trabajador?: string | null
        work_schedule_id?: string | null
        proyecto_id?: string
    }
    allPersonal: any[]
    onClose: () => void
    onSuccess: () => void
}

export default function EditPersonalModal({ worker, allPersonal, onClose, onSuccess }: EditPersonalModalProps) {
    const [formData, setFormData] = useState({
        nombre: worker.nombre,
        email: worker.email || '',
        telefono: worker.telefono || '+56',
        cargo: worker.rol || '',
        jefe_directo_rut: worker.jefe_directo_rut || null,
        codigo_trabajador: worker.codigo_trabajador || '',
        work_schedule_id: worker.work_schedule_id || null,
        estampa: '' // Will be loaded from soldadores table if exists
    })
    const [workSchedules, setWorkSchedules] = useState<any[]>([])
    const [loadingEstampa, setLoadingEstampa] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Extraer cargos únicos de todo el personal
    const cargosUnicos = Array.from(new Set(allPersonal.map(p => p.rol).filter(Boolean))).sort()

    // Load work schedules
    useEffect(() => {
        if (worker.proyecto_id) {
            fetch(`/api/proyectos/${worker.proyecto_id}/work-schedules`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setWorkSchedules(data.data)
                    }
                })
                .catch(err => console.error('Error loading schedules:', err))
        }
    }, [worker.proyecto_id])

    // Check if current cargo is soldador
    const isSoldador = formData.cargo.toUpperCase().includes('SOLDADOR')

    // Load existing estampa if soldador
    useEffect(() => {
        if (isSoldador) {
            setLoadingEstampa(true)
            fetch(`/api/personal/${encodeURIComponent(worker.rut)}/estampa`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.estampa) {
                        setFormData(prev => ({ ...prev, estampa: data.estampa }))
                    }
                })
                .catch(err => console.error('Error loading estampa:', err))
                .finally(() => setLoadingEstampa(false))
        }
    }, [isSoldador, worker.rut])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validar teléfono: debe ser +56 seguido de 9 dígitos
        const phoneRegex = /^\+56\d{9}$/
        if (formData.telefono && formData.telefono.trim() !== '' && formData.telefono !== '+56') {
            if (!phoneRegex.test(formData.telefono)) {
                setError('El teléfono debe tener el formato +56 seguido de 9 dígitos (ej: +56912345678)')
                setLoading(false)
                return
            }
        }

        try {
            // Asegurar que el RUT esté correctamente codificado
            const encodedRut = encodeURIComponent(worker.rut)
            console.log('Editing worker:', {
                rut: worker.rut,
                encodedRut,
                url: `/api/personal/${encodedRut}`,
                formData
            })

            const res = await fetch(`/api/personal/${encodedRut}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await res.json()
            console.log('Response:', { status: res.status, data })

            if (res.ok && data.success) {
                // If soldador, also save estampa
                if (isSoldador && formData.estampa.trim()) {
                    try {
                        const estampaRes = await fetch(`/api/personal/${encodedRut}/estampa`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ estampa: formData.estampa.trim() })
                        })
                        const estampaData = await estampaRes.json()
                        if (!estampaData.success) {
                            console.warn('Failed to save estampa:', estampaData.error)
                        }
                    } catch (err) {
                        console.error('Error saving estampa:', err)
                    }
                }
                onSuccess()
                onClose()
            } else {
                setError(data.error || `Error al actualizar (${res.status})`)
            }
        } catch (err: any) {
            console.error('Error updating worker:', err)
            setError('Error de conexión: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    if (!mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/5 pointer-events-none"></div>

                {/* Header */}
                <div className="relative p-6 border-b border-white/10 flex justify-between items-center bg-white/5 flex-shrink-0">
                    <h3 className="text-lg font-bold text-white">Editar Trabajador</h3>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <form onSubmit={handleSubmit} className="relative flex flex-col min-h-0 flex-1">
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                        {/* RUT (read-only) */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-1">
                                RUT
                            </label>
                            <input
                                type="text"
                                value={worker.rut}
                                disabled
                                className="w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white/50 cursor-not-allowed"
                            />
                            <p className="text-xs text-white/40 mt-1">
                                ⚠️ El RUT no puede ser modificado. Si está incorrecto, elimina el registro y vuelve a importar.
                            </p>
                        </div>

                        {/* Código y Jornada (Grid) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Código Trabajador */}
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-1">
                                    Código Interno
                                </label>
                                <input
                                    type="text"
                                    value={formData.codigo_trabajador}
                                    onChange={(e) => setFormData({ ...formData, codigo_trabajador: e.target.value })}
                                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-black/20 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-white/20"
                                    placeholder="Ej: EMP-001"
                                />
                            </div>

                            {/* Jornada / Régimen */}
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-1">
                                    Régimen de Trabajo
                                </label>
                                <select
                                    value={formData.work_schedule_id || ''}
                                    onChange={(e) => setFormData({ ...formData, work_schedule_id: e.target.value || null })}
                                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-black/20 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 [&>option]:bg-gray-900"
                                >
                                    <option value="">-- Sin asignar --</option>
                                    {workSchedules.map(schedule => (
                                        <option key={schedule.id} value={schedule.id}>
                                            {schedule.nombre} ({schedule.tipo === 'FIXED_WEEKLY' ? 'Semanal' : 'Rotativo'}{schedule.grupo ? ` - Grupo ${schedule.grupo}` : ''})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-1">
                                Nombre Completo <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                className="w-full px-3 py-2 border border-white/20 rounded-lg bg-black/20 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                                required
                            />
                        </div>

                        {/* Cargo/Rol */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-1">
                                Cargo/Rol
                            </label>
                            <input
                                type="text"
                                list="cargo-options"
                                value={formData.cargo}
                                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                                className="w-full px-3 py-2 border border-white/20 rounded-lg bg-black/20 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-white/20"
                                placeholder="Ej: Soldador, Maestro, Inspector..."
                            />
                            <datalist id="cargo-options">
                                {cargosUnicos.map(cargo => (
                                    <option key={cargo} value={cargo} />
                                ))}
                            </datalist>
                            <p className="text-xs text-white/40 mt-1">
                                💡 Puedes escribir cualquier cargo. Las sugerencias son de cargos ya registrados.
                            </p>
                        </div>

                        {/* Estampa (solo para soldadores) */}
                        {isSoldador && (
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-1">
                                    Estampa del Soldador <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.estampa}
                                    onChange={(e) => setFormData({ ...formData, estampa: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2 border border-orange-500/30 rounded-lg bg-orange-500/5 text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 placeholder:text-white/30 font-mono"
                                    placeholder="S01, S02, S03..."
                                    required={isSoldador}
                                    disabled={loadingEstampa}
                                />
                                <p className="text-xs text-orange-300/60 mt-1">
                                    🔥 Estampa única del soldador (ej: S01, S02, S03). Este identificador se usa en las certificaciones y registros.
                                </p>
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-white/20 rounded-lg bg-black/20 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-white/20"
                                placeholder="ejemplo@correo.com"
                            />
                        </div>

                        {/* Jefe Directo (solo para CAPATAZ) */}
                        {formData.cargo.toUpperCase().includes('CAPATAZ') && (
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-1">
                                    Jefe Directo (Supervisor) <span className="text-purple-400">*</span>
                                </label>
                                <select
                                    value={formData.jefe_directo_rut || ''}
                                    onChange={(e) => setFormData({ ...formData, jefe_directo_rut: e.target.value || null })}
                                    className="w-full px-3 py-2 border border-purple-500/30 rounded-lg bg-purple-500/5 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 [&>option]:bg-gray-900"
                                    required
                                >
                                    <option value="">-- Seleccionar Supervisor --</option>
                                    {allPersonal
                                        .filter(p => {
                                            // Defensive checks
                                            if (!p || p.rut === worker.rut) return false
                                            const rol = p.rol || p.cargo || ''
                                            return rol.toUpperCase().includes('SUPERVISOR')
                                        })
                                        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
                                        .map(p => (
                                            <option key={p.rut} value={p.rut}>
                                                {p.nombre}
                                            </option>
                                        ))
                                    }
                                </select>
                                <p className="text-xs text-purple-300/60 mt-1">
                                    ⚡ Cuando arrastres este capataz a una cuadrilla, su supervisor se asignará automáticamente.
                                </p>
                            </div>
                        )}

                        {/* Teléfono */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-1">
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                value={formData.telefono}
                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                className="w-full px-3 py-2 border border-white/20 rounded-lg bg-black/20 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-white/20"
                                placeholder="+56912345678"
                            />
                        </div>
                    </div>

                    {/* Actions - Fixed Footer */}
                    <div className="relative p-6 border-t border-white/10 bg-white/5 flex-shrink-0">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2 mb-4">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-200">{error}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Guardar Cambios
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

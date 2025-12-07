import { useState, useEffect } from 'react'
import { X, Check, Save, AlertCircle, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Worker {
    rut: string
    nombre: string
    cargo: string
    email: string
    // Estado local para el modal
    presente: boolean
    motivo?: string
    justificado?: boolean
    dirty?: boolean // Si se ha modificado
}

interface AttendanceModalProps {
    isOpen: boolean
    onClose: () => void
    proyectoId: string
    onSave?: () => void
}

export default function AttendanceModal({ isOpen, onClose, proyectoId, onSave }: AttendanceModalProps) {
    const [workers, setWorkers] = useState<Worker[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [showOnlyAbsent, setShowOnlyAbsent] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadPersonnel()
        }
    }, [isOpen, proyectoId])

    async function loadPersonnel() {
        setLoading(true)
        try {
            // 1. Obtener personal del proyecto
            const { data: personal, error: personalError } = await supabase
                .from('personal')
                .select('rut, nombre, cargo, email')
                .order('nombre')

            if (personalError) throw personalError

            // 2. Obtener asistencia de HOY
            const today = new Date().toISOString().split('T')[0]
            const { data: attendance, error: attendanceError } = await supabase
                .from('asistencia_diaria')
                .select('*')
                .eq('proyecto_id', proyectoId)
                .eq('fecha', today)

            if (attendanceError) throw attendanceError

            // 3. Combinar datos
            const combined: Worker[] = personal.map(p => {
                const record = attendance?.find(a => a.personal_rut === p.rut)
                return {
                    ...p,
                    presente: record ? record.presente : true, // Default to Present
                    motivo: record?.motivo_ausencia || '',
                    dirty: false
                }
            })

            setWorkers(combined)
        } catch (error) {
            console.error('Error loading attendance data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleTogglePresence = (rut: string) => {
        setWorkers(prev => prev.map(w => {
            if (w.rut === rut) {
                return {
                    ...w,
                    presente: !w.presente,
                    dirty: true,
                    // Si se marca presente, limpiar motivo
                    motivo: !w.presente ? '' : w.motivo
                }
            }
            return w
        }))
    }

    const handleMotivoChange = (rut: string, motivo: string) => {
        setWorkers(prev => prev.map(w => {
            if (w.rut === rut) {
                return { ...w, motivo, dirty: true }
            }
            return w
        }))
    }

    async function handleSave() {
        setSaving(true)
        try {
            // Filtrar solo los modificados
            const changed = workers.filter(w => w.dirty)

            if (changed.length === 0) {
                onClose()
                return
            }

            // Enviar actualizaciones en paralelo
            const promises = changed.map(w =>
                fetch('/api/cuadrillas/asistencia', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        rut: w.rut,
                        proyecto_id: proyectoId,
                        presente: w.presente,
                        motivo: w.motivo,
                        hora_entrada: '08:00:00' // Default
                    })
                })
            )

            await Promise.all(promises)

            // Recargar datos para refrescar el estado
            await loadPersonnel()

            if (onSave) onSave()

        } catch (error) {
            console.error('Error saving attendance:', error)
            alert('Error al guardar asistencia')
        } finally {
            setSaving(false)
        }
    }

    // Filtrar visualmente
    const filteredWorkers = workers.filter(w => {
        const matchesSearch = w.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.cargo.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = showOnlyAbsent ? !w.presente : true
        return matchesSearch && matchesFilter
    })

    const absentsCount = workers.filter(w => !w.presente).length

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            📋 Control de Asistencia Diaria
                            <span className="text-sm font-normal text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
                                {new Date().toLocaleDateString()}
                            </span>
                        </h2>
                        <p className="text-sm text-white/60">
                            Marca a los trabajadores ausentes. Por defecto todos asumen Presente.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 flex gap-4 bg-gray-900/50">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o rol..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowOnlyAbsent(!showOnlyAbsent)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${showOnlyAbsent
                            ? 'bg-red-500/20 border-red-500 text-red-200'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                            }`}
                    >
                        {showOnlyAbsent ? 'Mostrar Todos' : `Ver Ausentes (${absentsCount})`}
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredWorkers.map(worker => (
                                <div
                                    key={worker.rut}
                                    className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${worker.presente
                                        ? 'bg-white/5 border-white/5 hover:bg-white/10'
                                        : 'bg-red-900/20 border-red-500/30'
                                        }`}
                                >
                                    {/* Avatar/Name */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                                        {worker.nombre.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">{worker.nombre}</div>
                                        <div className="text-xs text-white/50 flex items-center gap-2">
                                            <span className="bg-white/10 px-1.5 rounded">{worker.cargo}</span>
                                            <span>{worker.rut}</span>
                                        </div>
                                    </div>

                                    {/* Status Toggle */}
                                    <div className="flex items-center gap-4">
                                        {!worker.presente && (
                                            <input
                                                type="text"
                                                placeholder="Motivo (ej. Licencia)"
                                                className="bg-black/40 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:border-red-500 w-48"
                                                value={worker.motivo}
                                                onChange={(e) => handleMotivoChange(worker.rut, e.target.value)}
                                                autoFocus
                                            />
                                        )}

                                        <button
                                            onClick={() => handleTogglePresence(worker.rut)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${worker.presente
                                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20'
                                                }`}
                                        >
                                            {worker.presente ? (
                                                <>
                                                    <Check size={18} /> Presente
                                                </>
                                            ) : (
                                                <>
                                                    <X size={18} /> Ausente
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredWorkers.length === 0 && (
                                <div className="text-center text-white/40 py-10">
                                    No se encontraron trabajadores
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-between items-center bg-white/5 rounded-b-xl">
                    <div className="text-sm text-white/50">
                        {workers.filter(w => w.dirty).length} cambios pendientes
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-white/70 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                        >
                            {saving ? (
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></span>
                            ) : (
                                <Save size={18} />
                            )}
                            Guardar Asistencia
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}

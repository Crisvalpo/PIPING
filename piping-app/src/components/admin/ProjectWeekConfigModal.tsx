import { useState, useEffect } from 'react'
import { X, Calendar, Save, AlertCircle } from 'lucide-react'

interface ProjectWeekConfigModalProps {
    isOpen: boolean
    onClose: () => void
    proyectoId: string
    onSave?: () => void
}

const DIAS_SEMANA = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' }
]

export default function ProjectWeekConfigModal({ isOpen, onClose, proyectoId, onSave }: ProjectWeekConfigModalProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [configMode, setConfigMode] = useState<'fecha' | 'semana'>('fecha') // NEW: modo de configuración
    const [fechaInicio, setFechaInicio] = useState('')
    const [semanaActualInput, setSemanaActualInput] = useState<string>('') // NEW: input de semana
    const [diaCierre, setDiaCierre] = useState(6) // Default: Sábado
    const [semanaCalculada, setSemanaCalculada] = useState<number | null>(null)
    const [diaCalculado, setDiaCalculado] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            loadConfig()
        }
    }, [isOpen, proyectoId])

    // Recalcular semana cuando cambia la fecha (modo fecha)
    useEffect(() => {
        if (configMode === 'fecha' && fechaInicio) {
            calcularSemana()
        } else if (configMode === 'fecha') {
            setSemanaCalculada(null)
            setDiaCalculado(null)
        }
    }, [fechaInicio, configMode])

    // Recalcular fecha cuando cambia la semana (modo semana)
    useEffect(() => {
        if (configMode === 'semana' && semanaActualInput) {
            calcularFechaDesdeSemanа()
        } else if (configMode === 'semana') {
            setFechaInicio('')
        }
    }, [semanaActualInput, configMode])

    async function loadConfig() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/config-semanas`)
            const json = await res.json()

            if (json.success) {
                setFechaInicio(json.data.fecha_inicio_proyecto || '')
                setDiaCierre(json.data.dia_cierre_semanal ?? 6)
                setSemanaCalculada(json.data.semana_actual)
                setDiaCalculado(json.data.dia_proyecto)
            } else {
                setError(json.error)
            }
        } catch (err) {
            console.error('Error loading config:', err)
            setError('Error al cargar configuración')
        } finally {
            setLoading(false)
        }
    }

    function calcularSemana() {
        if (!fechaInicio) {
            setSemanaCalculada(null)
            setDiaCalculado(null)
            return
        }

        const inicio = new Date(fechaInicio)
        const hoy = new Date()
        const diffTime = hoy.getTime() - inicio.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            setSemanaCalculada(null)
            setDiaCalculado(null)
        } else {
            const semana = Math.floor(diffDays / 7) + 1
            setSemanaCalculada(semana)
            setDiaCalculado(diffDays)
        }
    }

    function calcularFechaDesdeSemanа() {
        const semanaNum = parseInt(semanaActualInput)

        if (!semanaNum || semanaNum < 1) {
            setFechaInicio('')
            setSemanaCalculada(null)
            setDiaCalculado(null)
            return
        }

        // Calcular hacia atrás: hoy - ((semana - 1) * 7 días)
        const hoy = new Date()
        const diasARestar = (semanaNum - 1) * 7
        const fechaCalculada = new Date(hoy.getTime() - (diasARestar * 24 * 60 * 60 * 1000))

        // Formatear a YYYY-MM-DD
        const year = fechaCalculada.getFullYear()
        const month = String(fechaCalculada.getMonth() + 1).padStart(2, '0')
        const day = String(fechaCalculada.getDate()).padStart(2, '0')

        setFechaInicio(`${year}-${month}-${day}`)
        setSemanaCalculada(semanaNum)
        setDiaCalculado(diasARestar)
    }

    async function handleSave() {
        if (!fechaInicio) {
            setError('Debe especificar la fecha de inicio del proyecto')
            return
        }

        setSaving(true)
        setError(null)

        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/config-semanas`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha_inicio_proyecto: fechaInicio,
                    dia_cierre_semanal: diaCierre
                })
            })

            const json = await res.json()

            if (json.success) {
                if (onSave) onSave()
                onClose()
            } else {
                setError(json.error || 'Error al guardar')
            }
        } catch (err) {
            console.error('Error saving config:', err)
            setError('Error al guardar configuración')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5 rounded-t-xl">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-purple-400" />
                            Configuración de Semanas del Proyecto
                        </h2>
                        <p className="text-sm text-white/60 mt-1">
                            Define cuándo comenzó el proyecto y el ciclo semanal
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {error && (
                                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                                    <p className="text-red-200 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Modo de Configuración Toggle */}
                            <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setConfigMode('fecha')}
                                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${configMode === 'fecha'
                                            ? 'bg-purple-600 text-white shadow-lg'
                                            : 'text-white/60 hover:text-white/80'
                                        }`}
                                >
                                    📅 Fecha de Inicio
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfigMode('semana')}
                                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${configMode === 'semana'
                                            ? 'bg-purple-600 text-white shadow-lg'
                                            : 'text-white/60 hover:text-white/80'
                                        }`}
                                >
                                    🔢 Semana Actual
                                </button>
                            </div>

                            {/* Modo: Fecha de Inicio */}
                            {configMode === 'fecha' && (
                                <div>
                                    <label className="block text-white font-medium mb-2">
                                        📅 Fecha de Inicio del Proyecto
                                    </label>
                                    <input
                                        type="date"
                                        value={fechaInicio}
                                        onChange={(e) => setFechaInicio(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                    />
                                    <p className="text-white/50 text-xs mt-2">
                                        Fecha en que oficialmente comenzó el proyecto
                                    </p>
                                </div>
                            )}

                            {/* Modo: Semana Actual */}
                            {configMode === 'semana' && (
                                <div>
                                    <label className="block text-white font-medium mb-2">
                                        🔢 ¿En qué semana están actualmente?
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Ej: 90"
                                        value={semanaActualInput}
                                        onChange={(e) => setSemanaActualInput(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                    />
                                    <p className="text-white/50 text-xs mt-2">
                                        El sistema calculará automáticamente la fecha de inicio
                                    </p>
                                    {fechaInicio && (
                                        <div className="mt-3 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                                            <p className="text-purple-200 text-sm">
                                                📅 Fecha de inicio calculada: <span className="font-semibold">{new Date(fechaInicio).toLocaleDateString('es-CL')}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Día de Cierre Semanal */}
                            <div>
                                <label className="block text-white font-medium mb-2">
                                    🗓️ Día de Cierre Semanal
                                </label>
                                <select
                                    value={diaCierre}
                                    onChange={(e) => setDiaCierre(parseInt(e.target.value))}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                                >
                                    {DIAS_SEMANA.map(dia => (
                                        <option key={dia.value} value={dia.value} className="bg-gray-900">
                                            {dia.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-white/50 text-xs mt-2">
                                    Día que considera como cierre de semana (para reportes semanales)
                                </p>
                            </div>

                            {/* Información Calculada */}
                            {fechaInicio && (
                                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-purple-400" />
                                        Información Calculada
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-purple-200 text-sm mb-1">Semana Actual</p>
                                            <p className="text-white text-2xl font-bold">
                                                {semanaCalculada !== null ? `Semana ${semanaCalculada}` : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-purple-200 text-sm mb-1">Días Transcurridos</p>
                                            <p className="text-white text-2xl font-bold">
                                                {diaCalculado !== null ? `Día ${diaCalculado}` : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/5 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-white/70 hover:text-white transition-colors"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !fechaInicio}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                    >
                        {saving ? (
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></span>
                        ) : (
                            <Save size={18} />
                        )}
                        Guardar Configuración
                    </button>
                </div>
            </div>
        </div>
    )
}

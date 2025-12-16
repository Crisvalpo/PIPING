import { useState, useEffect } from 'react'
import { useUIStore } from '@/store/ui-store'

interface ExecutionReportModalProps {
    weld: any
    projectId: string
    requiresWelder: (type: string) => boolean
    onClose: () => void
    onSubmit: (data: { fecha: string; ejecutadoPor: string; supervisadoPor: string }) => void
}

export default function ExecutionReportModal({ weld, projectId, requiresWelder, onClose, onSubmit }: ExecutionReportModalProps) {
    const isWelderRequired = requiresWelder(weld.type_weld || '')
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
    const [ejecutadoPor, setEjecutadoPor] = useState('')
    const [supervisadoPor, setSupervisadoPor] = useState('')
    const [selectedCapataz, setSelectedCapataz] = useState<any | null>(null)
    const [selectedSoldador, setSelectedSoldador] = useState<any | null>(null)

    const [soldadores, setSoldadores] = useState<any[]>([])
    const [allSoldadores, setAllSoldadores] = useState<any[]>([])
    const [capataces, setCapataces] = useState<any[]>([])

    const [loading, setLoading] = useState(true)
    const [loadingSoldadores, setLoadingSoldadores] = useState(false)
    const [showAllSoldadores, setShowAllSoldadores] = useState(false)
    const [errors, setErrors] = useState({ ejecutadoPor: '', supervisadoPor: '' })

    // Estampa state - shown when selected soldador has no estampa
    const [estampaInput, setEstampaInput] = useState('')
    const [needsEstampa, setNeedsEstampa] = useState(false)
    const [savingEstampa, setSavingEstampa] = useState(false)
    const setFocusMode = useUIStore((state) => state.setFocusMode)

    // Handle Focus Mode using UI Store
    useEffect(() => {
        setFocusMode(true)
        return () => setFocusMode(false)
    }, [setFocusMode])

    // Load capataces on mount
    useEffect(() => {
        if (projectId) {
            loadCapataces()
        }
    }, [projectId])

    // Load soldadores when capataz changes
    useEffect(() => {
        if (selectedCapataz?.cuadrilla_id) {
            loadSoldadoresByCuadrilla(selectedCapataz.cuadrilla_id)
        } else {
            setSoldadores([])
        }
    }, [selectedCapataz])

    const loadCapataces = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/proyectos/${projectId}/personnel?role=CAPATAZ`)
            const data = await res.json()
            if (data.success) {
                setCapataces(data.data || [])
            }

            // Also preload all soldadores for "show all" option
            const allRes = await fetch(`/api/proyectos/${projectId}/personnel?role=SOLDADOR&all=true`)
            const allData = await allRes.json()
            if (allData.success) {
                setAllSoldadores(allData.data || [])
            }
        } catch (error) {
            console.error('Error loading capataces:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadSoldadoresByCuadrilla = async (cuadrillaId: string) => {
        try {
            setLoadingSoldadores(true)
            const res = await fetch(`/api/proyectos/${projectId}/personnel?role=SOLDADOR&cuadrilla_id=${cuadrillaId}`)
            const data = await res.json()
            if (data.success) {
                setSoldadores(data.data || [])
            }
        } catch (error) {
            console.error('Error loading soldadores:', error)
        } finally {
            setLoadingSoldadores(false)
        }
    }

    const handleCapatazChange = (rut: string) => {
        setSupervisadoPor(rut)
        setEjecutadoPor('') // Reset soldador selection
        setSelectedSoldador(null)
        setNeedsEstampa(false)
        setEstampaInput('')
        setShowAllSoldadores(false)

        const capataz = capataces.find(c => c.rut === rut)
        setSelectedCapataz(capataz || null)
    }

    const handleSoldadorChange = (rut: string) => {
        setEjecutadoPor(rut)
        setErrors({ ...errors, ejecutadoPor: '' })

        // Find the selected soldador
        const allList = [...soldadores, ...allSoldadores]
        const soldador = allList.find(s => s.rut === rut)
        setSelectedSoldador(soldador || null)

        // Check if soldador needs estampa
        if (isWelderRequired && soldador && !soldador.estampa) {
            setNeedsEstampa(true)
            setEstampaInput('')
        } else {
            setNeedsEstampa(false)
            setEstampaInput(soldador?.estampa || '')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrors({ ejecutadoPor: '', supervisadoPor: '' })

        // For non-welded types, only require fecha and supervisadoPor
        if (!fecha || !supervisadoPor) {
            alert('La fecha y el capataz son obligatorios')
            return
        }

        // For welded types, also require ejecutadoPor (soldador)
        if (isWelderRequired && !ejecutadoPor) {
            alert('El soldador es obligatorio para este tipo de unión')
            return
        }

        // If soldador needs estampa, validate and save it first
        if (isWelderRequired && needsEstampa) {
            if (!estampaInput.trim()) {
                alert('La estampa del soldador es obligatoria')
                return
            }

            try {
                setSavingEstampa(true)
                const estampaRes = await fetch(`/api/personal/${encodeURIComponent(ejecutadoPor)}/estampa`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estampa: estampaInput.trim() })
                })
                const estampaData = await estampaRes.json()

                if (!estampaData.success) {
                    alert(`Error al guardar estampa: ${estampaData.error}`)
                    return
                }
            } catch (err) {
                console.error('Error saving estampa:', err)
                alert('Error al guardar la estampa')
                return
            } finally {
                setSavingEstampa(false)
            }
        }

        onSubmit({ fecha, ejecutadoPor, supervisadoPor })
        onClose()
    }

    // Group soldadores for display
    const displaySoldadores = showAllSoldadores ? allSoldadores : soldadores

    // Group all soldadores by cuadrilla for better visualization
    const groupedSoldadores = showAllSoldadores
        ? allSoldadores.reduce((acc, s) => {
            const key = s.cuadrilla_nombre || 'Sin Cuadrilla'
            if (!acc[key]) acc[key] = []
            acc[key].push(s)
            return acc
        }, {} as Record<string, any[]>)
        : null

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex justify-center items-center p-4">

            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

                {/* 1️⃣ Fixed Header */}
                <div className="shrink-0 p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
                    <h3 className="text-lg font-bold text-gray-900">Reportar Ejecución</h3>
                    <p className="text-sm text-gray-700 font-medium">{weld.weld_number}</p>
                </div>

                {/* 2️⃣ Scrollable Body */}
                <div className="flex-1 overflow-y-auto">

                    {/* 📝 The Form */}
                    <form id="execution-report-form" onSubmit={handleSubmit} className="p-6 space-y-4">

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                                <p className="text-sm text-gray-600 mt-2">Cargando personal...</p>
                            </div>
                        ) : (
                            <>
                                {/* Fecha */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-1">Fecha de Ejecución *</label>
                                    <input
                                        type="date"
                                        value={fecha}
                                        readOnly
                                        disabled
                                        className="w-full border border-gray-200 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed focus:outline-none"
                                    />
                                </div>

                                {/* PASO 1: Seleccionar Capataz */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-1">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs mr-2">PASO 1</span>
                                        Supervisado Por (Capataz) *
                                    </label>
                                    <select
                                        value={supervisadoPor}
                                        onChange={(e) => handleCapatazChange(e.target.value)}
                                        className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none ${errors.supervisadoPor ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                    >
                                        <option value="">Seleccionar capataz</option>
                                        {capataces.map((c) => (
                                            <option key={c.rut} value={c.rut}>
                                                {c.nombre}
                                                {c.cuadrilla_codigo && ` [${c.cuadrilla_codigo}]`}
                                            </option>
                                        ))}
                                    </select>
                                    {capataces.length === 0 && (
                                        <p className="text-xs text-orange-600 font-medium mt-1">
                                            ⚠️ No hay capataces asignados a cuadrillas activas.
                                        </p>
                                    )}
                                    {selectedCapataz && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            📋 Cuadrilla: {selectedCapataz.cuadrilla_nombre}
                                        </p>
                                    )}
                                </div>

                                {/* PASO 2: Seleccionar Soldador (Solo si hay capataz seleccionado Y requiere soldador) */}
                                {supervisadoPor && isWelderRequired && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-800 mb-1">
                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs mr-2">PASO 2</span>
                                            Ejecutado Por (Soldador) *
                                        </label>

                                        {loadingSoldadores ? (
                                            <div className="flex items-center gap-2 py-2 text-sm text-gray-700">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                                Cargando soldadores...
                                            </div>
                                        ) : (
                                            <>
                                                <select
                                                    value={ejecutadoPor}
                                                    onChange={(e) => handleSoldadorChange(e.target.value)}
                                                    className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none ${errors.ejecutadoPor ? 'border-red-500' : 'border-gray-300'
                                                        }`}
                                                >
                                                    <option value="">Seleccionar soldador</option>

                                                    {showAllSoldadores && groupedSoldadores ? (
                                                        // Grouped display when showing all
                                                        Object.entries(groupedSoldadores).map(([cuadrillaName, cuadrillaSoldadores]) => (
                                                            <optgroup key={cuadrillaName} label={`── ${cuadrillaName} ──`}>
                                                                {(cuadrillaSoldadores as any[]).map((s: any) => (
                                                                    <option key={s.rut} value={s.rut}>
                                                                        {s.estampa ? `[${s.estampa}] ` : s.codigo_trabajador ? `[${s.codigo_trabajador}] ` : '⚠️ '}
                                                                        {s.nombre}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        ))
                                                    ) : (
                                                        // Simple list for cuadrilla soldadores
                                                        displaySoldadores.map((s) => (
                                                            <option key={s.rut} value={s.rut}>
                                                                {s.estampa ? `[${s.estampa}] ` : s.codigo_trabajador ? `[${s.codigo_trabajador}] ` : '⚠️ '}
                                                                {s.nombre}
                                                            </option>
                                                        ))
                                                    )}
                                                </select>

                                                {/* Info and toggle */}
                                                <div className="flex items-center justify-between mt-1">
                                                    <p className="text-xs text-gray-700">
                                                        {showAllSoldadores
                                                            ? `${allSoldadores.length} soldadores en el proyecto`
                                                            : `${soldadores.length} soldadores en esta cuadrilla`
                                                        }
                                                    </p>

                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAllSoldadores(!showAllSoldadores)}
                                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                    >
                                                        {showAllSoldadores ? '← Solo cuadrilla' : 'Ver todos →'}
                                                    </button>
                                                </div>

                                                {soldadores.length === 0 && !showAllSoldadores && (
                                                    <p className="text-xs text-orange-600 font-medium mt-1">
                                                        ⚠️ Esta cuadrilla no tiene soldadores asignados hoy.
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* PASO 3: Ingresar Estampa (Solo si soldador no tiene) */}
                                {needsEstampa && ejecutadoPor && (
                                    <>
                                        {/* Helpful tip directing to centralized management */}
                                        <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-3">
                                            <p className="text-sm text-blue-800 flex items-start gap-2">
                                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>
                                                    <strong className="font-bold">Tip:</strong> Para evitar este paso en futuras ejecuciones,
                                                    asigna la estampa desde{' '}
                                                    <a
                                                        href="/settings/personal"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="underline font-bold hover:text-blue-900"
                                                    >
                                                        Configuración → Personal
                                                    </a>
                                                </span>
                                            </p>
                                        </div>

                                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                            <label className="block text-sm font-bold text-orange-800 mb-1">
                                                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs mr-2">PASO 3</span>
                                                Estampa del Soldador *
                                            </label>
                                            <input
                                                type="text"
                                                value={estampaInput}
                                                onChange={(e) => setEstampaInput(e.target.value.toUpperCase())}
                                                placeholder="Ej: S01, S02, S03..."
                                                className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                                            />
                                            <p className="text-xs text-orange-600 mt-1">
                                                ⚠️ Este soldador no tiene estampa registrada. Ingresa una para continuar.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </form>

                </div>

                {/* 3️⃣ Fixed Footer */}
                <div className="shrink-0 p-4 border-t bg-white flex justify-end gap-3 z-10 pb-safe">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={savingEstampa}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="execution-report-form"
                        disabled={loading || savingEstampa || (isWelderRequired && !ejecutadoPor) || !supervisadoPor || (needsEstampa && !estampaInput.trim())}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {savingEstampa ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Guardando estampa...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Reportar Ejecución
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { useUIStore } from '@/store/ui-store'
import type { ReworkResponsibility } from '@/services/master-views'

interface ReworkModalProps {
    weld: any
    projectId: string
    requiresWelder: (type: string) => boolean
    onClose: () => void
    onSubmit: (responsibility: ReworkResponsibility, reason: string, executionData?: { fecha: string; welderId: string | null; foremanId: string }) => Promise<void>
}

const REWORK_OPTIONS: { value: ReworkResponsibility; label: string; description: string }[] = [
    { value: 'TERRENO', label: 'Terreno', description: 'Error al construir (incluye nueva ejecución)' },
    { value: 'INGENIERIA', label: 'Ingeniería', description: 'Interferencias / Cambios de revisión' },
    { value: 'RECHAZO_END', label: 'Rechazo', description: 'Rechazo por parte de Calidad' },
]

export default function ReworkModal({ weld, projectId, requiresWelder, onClose, onSubmit }: ReworkModalProps) {
    const [responsibility, setResponsibility] = useState<ReworkResponsibility>('TERRENO')
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Execution fields for TERRENO
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
    const [capataces, setCapataces] = useState<any[]>([])
    const [soldadores, setSoldadores] = useState<any[]>([])
    const [allSoldadores, setAllSoldadores] = useState<any[]>([])
    const [selectedCapataz, setSelectedCapataz] = useState('')
    const [selectedSoldador, setSelectedSoldador] = useState('')
    const [loadingPersonnel, setLoadingPersonnel] = useState(false)
    const [showAllSoldadores, setShowAllSoldadores] = useState(false)

    // Estampa state - shown when selected soldador has no estampa
    const [needsEstampa, setNeedsEstampa] = useState(false)
    const [estampaInput, setEstampaInput] = useState('')
    const [savingEstampa, setSavingEstampa] = useState(false)

    // Check if welder is required based on weld type
    const isWelderRequired = requiresWelder(weld.type_weld || '')

    const setFocusMode = useUIStore((state) => state.setFocusMode)

    // Handle Focus Mode
    useEffect(() => {
        setFocusMode(true)
        return () => setFocusMode(false)
    }, [setFocusMode])

    // Load personnel when modal opens (TERRENO is default)
    useEffect(() => {
        if (responsibility === 'TERRENO') {
            loadCapataces()
            loadAllSoldadores()
        }
    }, [responsibility, projectId])

    const loadCapataces = async () => {
        setLoadingPersonnel(true)
        try {
            const res = await fetch(`/api/proyectos/${projectId}/personnel?role=CAPATAZ`)
            const data = await res.json()
            setCapataces(data.data || [])
        } catch (error) {
            console.error('Error loading capataces:', error)
        }
        setLoadingPersonnel(false)
    }

    const loadAllSoldadores = async () => {
        try {
            const res = await fetch(`/api/proyectos/${projectId}/personnel?role=SOLDADOR`)
            const data = await res.json()
            setAllSoldadores(data.data || [])
        } catch (error) {
            console.error('Error loading all soldadores:', error)
        }
    }

    const loadSoldadores = async (cuadrillaId?: string) => {
        try {
            const url = cuadrillaId
                ? `/api/proyectos/${projectId}/personnel?role=SOLDADOR&cuadrilla_id=${cuadrillaId}`
                : `/api/proyectos/${projectId}/personnel?role=SOLDADOR`
            const res = await fetch(url)
            const data = await res.json()
            setSoldadores(data.data || [])
        } catch (error) {
            console.error('Error loading soldadores:', error)
        }
    }

    const handleCapatazChange = (capatazRut: string) => {
        setSelectedCapataz(capatazRut)
        setSelectedSoldador('')
        setShowAllSoldadores(false)

        const capataz = capataces.find(c => c.rut === capatazRut)
        if (capataz?.cuadrilla_id) {
            loadSoldadores(capataz.cuadrilla_id)
        } else {
            loadSoldadores()
        }
    }

    const handleSoldadorChange = (soldadorRut: string) => {
        setSelectedSoldador(soldadorRut)

        // Check if soldador needs estampa
        const allList = showAllSoldadores ? allSoldadores : soldadores
        const soldador = allList.find(s => s.rut === soldadorRut)
        if (soldador && !soldador.estampa) {
            setNeedsEstampa(true)
            setEstampaInput('')
        } else {
            setNeedsEstampa(false)
            setEstampaInput(soldador?.estampa || '')
        }
    }

    const handleSubmit = async () => {
        // Validate execution fields if TERRENO
        if (responsibility === 'TERRENO') {
            if (!selectedCapataz) {
                alert('Para Retrabajo por Terreno, debes seleccionar un capataz')
                return
            }
            if (isWelderRequired && !selectedSoldador) {
                alert('Para Retrabajo por Terreno en soldaduras, debes seleccionar un soldador')
                return
            }
        }

        setSubmitting(true)
        try {
            // If soldador needs estampa, validate and save it first
            if (responsibility === 'TERRENO' && needsEstampa) {
                if (!estampaInput.trim()) {
                    alert('La estampa del soldador es obligatoria')
                    setSubmitting(false)
                    return
                }
                setSavingEstampa(true)
                try {
                    const estampaRes = await fetch(`/api/personal/${encodeURIComponent(selectedSoldador)}/estampa`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ estampa: estampaInput.trim() })
                    })
                    const estampaData = await estampaRes.json()
                    setSavingEstampa(false)
                    if (!estampaData.success) {
                        alert(`Error al guardar estampa: ${estampaData.error}`)
                        setSubmitting(false)
                        return
                    }
                } catch (err) {
                    console.error('Error saving estampa:', err)
                    alert('Error al guardar la estampa')
                    setSavingEstampa(false)
                    setSubmitting(false)
                    return
                }
            }

            // If isWelderRequired is false, we can skip welderId (or pass null/undefined)
            const executionData = responsibility === 'TERRENO'
                ? {
                    fecha,
                    welderId: isWelderRequired ? selectedSoldador : null,
                    foremanId: selectedCapataz
                }
                : undefined
            await onSubmit(responsibility, reason, executionData)
            onClose()
        } catch (error) {
            console.error('Error marking rework:', error)
            alert('Error al marcar retrabajo')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                {/* 1. Fixed Header */}
                <div className="shrink-0 p-6 border-b border-gray-200 sticky top-0 bg-white shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg shrink-0">
                            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Marcar Retrabajo</h3>
                            <p className="text-gray-600 text-sm">Unión: <strong>{weld.weld_number}</strong></p>
                        </div>
                    </div>
                </div>

                {/* 2. Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Responsabilidad */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Responsabilidad del Retrabajo *
                        </label>
                        <div className="space-y-2">
                            {REWORK_OPTIONS.map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${responsibility === option.value
                                        ? 'border-orange-500 bg-orange-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="responsibility"
                                        value={option.value}
                                        checked={responsibility === option.value}
                                        onChange={(e) => setResponsibility(e.target.value as ReworkResponsibility)}
                                        className="mt-0.5"
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">{option.label}</div>
                                        <div className="text-sm text-gray-500">{option.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Execution fields for TERRENO */}
                    {responsibility === 'TERRENO' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                            <p className="text-sm font-bold text-green-800 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Nueva Ejecución
                            </p>

                            {/* Fecha */}
                            <div>
                                <label className="block text-xs font-medium text-green-800 mb-1">Fecha de Ejecución</label>
                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="w-full border border-green-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                                />
                            </div>

                            {/* Capataz */}
                            <div>
                                <label className="block text-xs font-medium text-green-800 mb-1">Capataz *</label>
                                <select
                                    value={selectedCapataz}
                                    onChange={(e) => handleCapatazChange(e.target.value)}
                                    disabled={loadingPersonnel}
                                    className="w-full border border-green-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                                >
                                    <option value="">Seleccionar capataz...</option>
                                    {capataces.map((c) => (
                                        <option key={c.rut} value={c.rut}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>


                            {/* Soldador - Only if required */}
                            {isWelderRequired && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-green-800 mb-1">Soldador *</label>
                                        <select
                                            value={selectedSoldador}
                                            onChange={(e) => handleSoldadorChange(e.target.value)}
                                            disabled={!selectedCapataz}
                                            className="w-full border border-green-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        >
                                            <option value="">Seleccionar soldador...</option>
                                            {(showAllSoldadores ? allSoldadores : soldadores).map((s) => (
                                                <option key={s.rut} value={s.rut}>
                                                    {s.estampa ? `[${s.estampa}] ` : s.codigo_trabajador ? `[${s.codigo_trabajador}] ` : '⚠️ '}
                                                    {s.nombre}
                                                    {showAllSoldadores && s.cuadrilla_codigo ? ` (${s.cuadrilla_codigo})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Toggle and info */}
                                    {selectedCapataz && (
                                        <div className="flex items-center justify-between mt-1">
                                            <p className="text-xs text-green-700">
                                                {showAllSoldadores
                                                    ? `${allSoldadores.length} soldadores en proyecto`
                                                    : `${soldadores.length} soldadores en cuadrilla`
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
                                    )}

                                    {!selectedCapataz && (
                                        <p className="text-xs text-green-600 mt-1">Selecciona un capataz primero</p>
                                    )}
                                </>
                            )}

                            {/* Estampa input - only shown when selected soldador has no estampa */}
                            {needsEstampa && isWelderRequired && (
                                <>
                                    {/* Helpful tip directing to centralized management */}
                                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-3">
                                        <p className="text-xs text-blue-800 flex items-start gap-2">
                                            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>
                                                <strong className="font-bold">Tip:</strong> Para evitar este paso en futuros retrabajos,
                                                asigna la estampa desde{' '}
                                                <a
                                                    href="/settings/personal"
                                                    target="_blank"
                                                    className="underline font-bold hover:text-blue-900"
                                                >
                                                    Configuración → Personal
                                                </a>
                                            </span>
                                        </p>
                                    </div>

                                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                                        <label className="block text-xs font-medium text-yellow-800 mb-1">
                                            Estampa del Soldador *
                                        </label>
                                        <input
                                            type="text"
                                            value={estampaInput}
                                            onChange={(e) => setEstampaInput(e.target.value.toUpperCase())}
                                            placeholder="Ej: S01"
                                            className="w-full border border-yellow-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                                        />
                                        <p className="text-xs text-yellow-700 mt-1">
                                            ⚠️ Este soldador no tiene estampa registrada. Ingresa una para continuar.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Motivo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Motivo / Observación (opcional)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Describe el motivo del retrabajo..."
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                    </div >
                </div >

                {/* 3. Sticky Footer */}
                < div className="shrink-0 p-6 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white pb-safe z-10" >
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || savingEstampa || (responsibility === 'TERRENO' && ((isWelderRequired && !selectedSoldador) || !selectedCapataz || (needsEstampa && !estampaInput.trim())))}
                        className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {responsibility === 'TERRENO' ? 'Registrar y Ejecutar' : 'Confirmar Retrabajo'}
                            </>
                        )}
                    </button>
                </div >
            </div >
        </div >
    )
}

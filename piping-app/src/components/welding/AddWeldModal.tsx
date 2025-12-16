import { useState, useEffect } from 'react'
import { useUIStore } from '@/store/ui-store'
import { supabase } from '@/lib/supabase'
import { createFieldWeld, checkWeldNumberExists } from '@/services/master-views'

interface AddWeldModalProps {
    adjacentWelds: { prev?: any; next?: any }
    revisionId: string
    projectId: string
    isoNumber: string
    rev: string
    requiresWelder: (type: string) => boolean
    onClose: () => void
    onSubmit: (weld: any) => void
}

export default function AddWeldModal({ adjacentWelds, revisionId, projectId, isoNumber, rev, requiresWelder, onClose, onSubmit }: AddWeldModalProps) {
    // Suggest values from adjacent welds
    const suggestedWeld = adjacentWelds.prev || adjacentWelds.next || {}

    const [creationType, setCreationType] = useState<'TERRENO' | 'INGENIERIA'>('TERRENO')
    const [submitting, setSubmitting] = useState(false)
    const [weldNumberError, setWeldNumberError] = useState<string | null>(null)

    // Weld data fields
    const [weldNumber, setWeldNumber] = useState('')
    const [spoolNumber, setSpoolNumber] = useState(suggestedWeld.spool_number || '')
    const [lineNumber, setLineNumber] = useState(suggestedWeld.line_number || '')
    const [sheet, setSheet] = useState(suggestedWeld.sheet || '')
    const [destination, setDestination] = useState(suggestedWeld.destination || 'F')
    const [typeWeld, setTypeWeld] = useState(suggestedWeld.type_weld || '')
    const isWelderRequired = requiresWelder(typeWeld || '')
    const [nps, setNps] = useState(suggestedWeld.nps || '')
    const [sch, setSch] = useState(suggestedWeld.sch || '')
    const [thickness, setThickness] = useState(suggestedWeld.thickness || '')
    const [material, setMaterial] = useState(suggestedWeld.material || '')
    const [pipingClass, setPipingClass] = useState(suggestedWeld.piping_class || '')
    const [creationReason, setCreationReason] = useState('')

    // Execution fields for TERRENO
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
    const [capataces, setCapataces] = useState<any[]>([])
    const [soldadores, setSoldadores] = useState<any[]>([])
    const [allSoldadores, setAllSoldadores] = useState<any[]>([])
    const [selectedCapataz, setSelectedCapataz] = useState('')
    const [selectedSoldador, setSelectedSoldador] = useState('')
    const [loadingPersonnel, setLoadingPersonnel] = useState(false)
    const [showAllSoldadores, setShowAllSoldadores] = useState(false)
    const [needsEstampa, setNeedsEstampa] = useState(false)
    const [estampaInput, setEstampaInput] = useState('')
    const [savingEstampa, setSavingEstampa] = useState(false)

    const setFocusMode = useUIStore((state) => state.setFocusMode)

    // Handle Focus Mode using UI Store
    useEffect(() => {
        setFocusMode(true)
        return () => setFocusMode(false)
    }, [setFocusMode])

    // Load personnel when TERRENO is selected
    useEffect(() => {
        if (creationType === 'TERRENO') {
            loadCapataces()
            loadAllSoldadores()
        }
    }, [creationType, projectId])

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
            console.error('Error loading soldadores:', error)
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
        setNeedsEstampa(false)

        const capataz = capataces.find(c => c.rut === capatazRut)
        if (capataz?.cuadrilla_id) {
            loadSoldadores(capataz.cuadrilla_id)
        } else {
            loadSoldadores()
        }
    }

    const handleSoldadorChange = (soldadorRut: string) => {
        setSelectedSoldador(soldadorRut)
        const allList = showAllSoldadores ? allSoldadores : soldadores
        const soldador = allList.find(s => s.rut === soldadorRut)
        if (isWelderRequired && soldador && !soldador.estampa) {
            setNeedsEstampa(true)
            setEstampaInput('')
        } else {
            setNeedsEstampa(false)
            setEstampaInput(soldador?.estampa || '')
        }
    }

    // Validate weld number on change
    useEffect(() => {
        const validateWeldNumber = async () => {
            if (!weldNumber.trim()) {
                setWeldNumberError(null)
                return
            }
            try {
                const exists = await checkWeldNumberExists(revisionId, weldNumber.trim())
                if (exists) {
                    setWeldNumberError('Este número ya existe en la isométrica')
                } else {
                    setWeldNumberError(null)
                }
            } catch {
                setWeldNumberError(null)
            }
        }
        const debounce = setTimeout(validateWeldNumber, 500)
        return () => clearTimeout(debounce)
    }, [weldNumber, revisionId])

    const handleSubmit = async () => {
        if (!weldNumber.trim() || !spoolNumber.trim()) {
            alert('El número de unión y spool son obligatorios')
            return
        }

        if (weldNumberError) {
            alert('El número de unión ya existe')
            return
        }

        // For TERRENO, always require capataz, but soldador only if weld type requires it
        if (creationType === 'TERRENO' && !selectedCapataz) {
            alert('Para Terreno, debes seleccionar un capataz')
            return
        }

        if (creationType === 'TERRENO' && isWelderRequired && !selectedSoldador) {
            alert('Para este tipo de soldadura, debes seleccionar un soldador')
            return
        }

        setSubmitting(true)
        try {
            // If soldador needs estampa, save it first
            if (creationType === 'TERRENO' && isWelderRequired && needsEstampa) {
                if (!estampaInput.trim()) {
                    alert('La estampa del soldador es obligatoria')
                    setSubmitting(false)
                    return
                }
                setSavingEstampa(true)
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
            }

            const { data: { user } } = await supabase.auth.getUser()

            const weldData = {
                revision_id: revisionId,
                proyecto_id: projectId,
                iso_number: isoNumber,
                rev: rev,
                line_number: lineNumber || undefined,
                spool_number: spoolNumber,
                sheet: sheet || undefined,
                weld_number: weldNumber.trim().toUpperCase(),
                destination: destination || undefined,
                type_weld: typeWeld || undefined,
                nps: nps || undefined,
                sch: sch || undefined,
                thickness: thickness || undefined,
                piping_class: pipingClass || undefined,
                material: material || undefined
            }

            const executionData = creationType === 'TERRENO' ? {
                fecha,
                welderId: isWelderRequired ? selectedSoldador : null,
                foremanId: selectedCapataz
            } : undefined

            // Determine display order
            let displayOrder: number | undefined
            if (adjacentWelds.prev) {
                // If previous exists, go after it
                displayOrder = (adjacentWelds.prev.display_order || 0) + 1
            } else if (adjacentWelds.next) {
                // If no previous but next exists (start of list), take its spot
                displayOrder = adjacentWelds.next.display_order || 1
            } else {
                // Empty list
                displayOrder = 1
            }

            const newWeld = await createFieldWeld(
                weldData,
                creationType,
                creationReason,
                user?.id,
                executionData,
                displayOrder
            )

            onSubmit(newWeld)
            onClose()
            alert(creationType === 'TERRENO' ? '✅ Unión creada y ejecutada' : '✅ Unión creada como pendiente')
        } catch (error: any) {
            console.error('Error creating weld:', error)
            alert(`❌ Error: ${error.message || 'Error al crear la unión'}`)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* 1️⃣ Fixed Header */}
                <div className="shrink-0 p-6 border-b border-gray-200 bg-white z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Nueva Unión</h3>
                            <p className="text-sm text-gray-600">
                                Entre {adjacentWelds.prev?.weld_number || '(inicio)'} y {adjacentWelds.next?.weld_number || '(final)'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2️⃣ Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Creación</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setCreationType('TERRENO')}
                                className={`p-3 rounded-xl border-2 transition-all text-left ${creationType === 'TERRENO' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                                <span className="font-bold text-green-700">🔧 Terreno</span>
                                <p className="text-xs text-gray-600 mt-1">Crear y ejecutar inmediatamente</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreationType('INGENIERIA')}
                                className={`p-3 rounded-xl border-2 transition-all text-left ${creationType === 'INGENIERIA' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                                <span className="font-bold text-blue-700">📐 Ingeniería</span>
                                <p className="text-xs text-gray-600 mt-1">Crear como pendiente</p>
                            </button>
                        </div>
                    </div>

                    {/* Weld Number - Required & Validated */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Número de Unión *</label>
                        <input
                            type="text"
                            value={weldNumber}
                            onChange={(e) => setWeldNumber(e.target.value.toUpperCase())}
                            placeholder="Ej: F036A"
                            className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:outline-none ${weldNumberError ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                        />
                        {weldNumberError && (
                            <p className="text-xs text-red-600 mt-1">⚠️ {weldNumberError}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Spool *</label>
                            <input type="text" value={spoolNumber} onChange={(e) => setSpoolNumber(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                            <select value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900">
                                <option value="F">Campo (Field)</option>
                                <option value="S">Taller (Shop)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">NPS</label>
                            <input type="text" value={nps} onChange={(e) => setNps(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SCH</label>
                            <input type="text" value={sch} onChange={(e) => setSch(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Espesor</label>
                            <input type="text" value={thickness} onChange={(e) => setThickness(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Soldadura</label>
                        <input type="text" value={typeWeld} onChange={(e) => setTypeWeld(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                        <input type="text" value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Creación</label>
                        <textarea
                            value={creationReason}
                            onChange={(e) => setCreationReason(e.target.value)}
                            placeholder="¿Por qué se necesita esta unión?"
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                        />
                    </div>

                    {/* TERRENO Execution Fields */}
                    {creationType === 'TERRENO' && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                            <h4 className="text-sm font-bold text-green-800">Datos de Ejecución</h4>

                            <div>
                                <label className="block text-xs font-medium text-green-800 mb-1">Fecha *</label>
                                <input
                                    type="date"
                                    value={fecha}
                                    readOnly
                                    disabled
                                    className="w-full border border-gray-200 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-green-800 mb-1">Capataz *</label>
                                <select value={selectedCapataz} onChange={(e) => handleCapatazChange(e.target.value)} disabled={loadingPersonnel} className="w-full border border-green-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                                    <option value="">Seleccionar capataz...</option>
                                    {capataces.map((c) => (<option key={c.rut} value={c.rut}>{c.nombre}</option>))}
                                </select>
                            </div>

                            {isWelderRequired ? (
                                <div>
                                    <label className="block text-xs font-medium text-green-800 mb-1">Soldador *</label>
                                    <select value={selectedSoldador} onChange={(e) => handleSoldadorChange(e.target.value)} disabled={!selectedCapataz} className="w-full border border-green-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                                        <option value="">Seleccionar soldador...</option>
                                        {(showAllSoldadores ? allSoldadores : soldadores).map((s) => (
                                            <option key={s.rut} value={s.rut}>
                                                {s.estampa ? `[${s.estampa}] ` : s.codigo_trabajador ? `[${s.codigo_trabajador}] ` : '⚠️ '}
                                                {s.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedCapataz && (
                                        <button type="button" onClick={() => setShowAllSoldadores(!showAllSoldadores)} className="text-xs text-blue-600 hover:text-blue-800 mt-1">
                                            {showAllSoldadores ? '← Solo cuadrilla' : 'Ver todos →'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs text-blue-800">
                                        ℹ️ Este tipo de unión no requiere soldador
                                    </p>
                                </div>
                            )}

                            {needsEstampa && (
                                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                                    <label className="block text-xs font-medium text-yellow-800 mb-1">Estampa del Soldador *</label>
                                    <input type="text" value={estampaInput} onChange={(e) => setEstampaInput(e.target.value.toUpperCase())} placeholder="Ej: S01" className="w-full border border-yellow-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                                    <p className="text-xs text-yellow-700 mt-1">⚠️ Soldador sin estampa. Ingresa una para continuar.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3️⃣ Fixed Footer */}
                <div className="shrink-0 p-6 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white z-10">
                    <button onClick={onClose} disabled={submitting} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className={`flex-1 px-4 py-3 rounded-xl font-medium text-white shadow-lg transition-all ${creationType === 'TERRENO'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-200'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-200'
                            }`}
                    >
                        {submitting ? 'Creando...' : (creationType === 'TERRENO' ? 'Crear y Ejecutar' : 'Crear Pendiente')}
                    </button>
                </div>
            </div>
        </div>
    )
}

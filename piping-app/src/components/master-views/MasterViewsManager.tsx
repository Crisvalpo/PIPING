'use client'

import { useState, useEffect, useRef } from 'react'
import { searchIsometrics } from '@/services/engineering'
import {
    getIsometricDetails,
    updateWeldExecution,
    updateJointExecution,
    getWeldExecutions,
    markWeldForRework,
    registerWeldExecution,
    deleteWeld,
    restoreWeld,
    undoWeldExecution,
    type ReworkResponsibility,
    type WeldExecution
} from '@/services/master-views'
import type { IsometricDetails } from '@/services/master-views'
import { supabase } from '@/lib/supabase'

interface MasterViewsManagerProps {
    projectId: string
}

interface WeldDetailModal {
    weld: any
    projectId: string
    onClose: () => void
    onUpdate: (weldId: string, updates: any) => void
    onRework: (weld: any) => void
    onDelete: (weld: any) => void
    onRestore: (weld: any) => void
    onUndo: (weld: any) => void
    onRefresh: () => void
}

interface ExecutionReportModal {
    weld: any
    projectId: string
    onClose: () => void
    onSubmit: (data: { fecha: string; ejecutadoPor: string; supervisadoPor: string }) => void
}

interface WeldsBySpool {
    spool_number: string
    welds: any[]
    shop_welds_total: number
    shop_welds_executed: number
    field_welds_total: number
    field_welds_executed: number
    is_fabricated: boolean
    fabrication_status: 'FABRICADO' | 'EN PROCESO' | 'PENDIENTE' | 'N/A'
}

// Modal de Detalles de Soldadura con Edición
function WeldDetailModal({ weld, projectId, onClose, onUpdate, onRework, onDelete, onRestore, onUndo, onRefresh }: WeldDetailModal) {
    const [editMode, setEditMode] = useState(false)
    const [formData, setFormData] = useState({
        weld_number: weld.weld_number,
        spool_number: weld.spool_number,
        type_weld: weld.type_weld || '',
        nps: weld.nps || '',
        sch: weld.sch || '',
        thickness: weld.thickness || '',
        material: weld.material || '',
        destination: weld.destination || ''
    })

    // Personnel names for executed welds
    const [welderInfo, setWelderInfo] = useState<{ nombre: string; estampa: string } | null>(null)
    const [foremanInfo, setForemanInfo] = useState<{ nombre: string } | null>(null)
    const [reporterInfo, setReporterInfo] = useState<{ email: string } | null>(null)

    // Execution history
    const [executionHistory, setExecutionHistory] = useState<WeldExecution[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    // Load personnel names and execution history when modal opens
    useEffect(() => {
        const loadData = async () => {
            // Load execution history
            setLoadingHistory(true)
            try {
                const history = await getWeldExecutions(weld.id)
                setExecutionHistory(history)

                // Load reporter info from latest VIGENTE execution
                const currentExecution = history.find(e => e.status === 'VIGENTE')
                if (currentExecution?.reported_by_user) {
                    const { data: reporter } = await supabase
                        .from('users')
                        .select('correo, nombre')
                        .eq('id', currentExecution.reported_by_user)
                        .single()

                    if (reporter) {
                        setReporterInfo({ email: reporter.nombre })
                    }
                }
            } catch (error) {
                console.error('Error loading execution history:', error)
            }
            setLoadingHistory(false)

            // Load personnel names if executed
            if (!weld.executed) return

            const welderRut = weld.welder_id || weld.executed_by
            const foremanRut = weld.foreman_id || weld.supervised_by

            if (welderRut) {
                const { data: welder } = await supabase
                    .from('personal')
                    .select('rut, nombre')
                    .eq('rut', welderRut)
                    .single()

                if (welder) {
                    const { data: soldador } = await supabase
                        .from('soldadores')
                        .select('estampa')
                        .eq('rut', welderRut)
                        .single()

                    setWelderInfo({
                        nombre: welder.nombre,
                        estampa: soldador?.estampa || '-'
                    })
                }
            }

            if (foremanRut) {
                const { data: foreman } = await supabase
                    .from('personal')
                    .select('nombre')
                    .eq('rut', foremanRut)
                    .single()

                if (foreman) {
                    setForemanInfo({ nombre: foreman.nombre })
                }
            }
        }

        loadData()
    }, [weld])

    const handleSave = async () => {
        onUpdate(weld.id, formData)
        setEditMode(false)
    }

    const getDestinationText = (dest: string) => {
        if (dest === 'S') return 'Taller (Shop)'
        if (dest === 'F') return 'Campo (Field)'
        return dest || '-'
    }

    const getResponsibilityLabel = (resp: string) => {
        switch (resp) {
            case 'TERRENO': return 'Terreno'
            case 'INGENIERIA': return 'Ingeniería'
            case 'RECHAZO_END': return 'Rechazo'
            default: return resp
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-gray-300 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Detalle de Unión</h3>
                            <p className="text-sm text-gray-600">{formData.weld_number}</p>
                        </div>
                        {/* Rework count badge */}
                        {weld.rework_count > 0 && (
                            <span className="px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                R{weld.rework_count}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-700 hover:text-gray-700 text-2xl font-bold">
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {editMode ? (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-1">Número de Unión</label>
                                <input
                                    type="text"
                                    value={formData.weld_number}
                                    onChange={(e) => setFormData({ ...formData, weld_number: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-1">Spool</label>
                                <input
                                    type="text"
                                    value={formData.spool_number}
                                    onChange={(e) => setFormData({ ...formData, spool_number: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-1">Tipo de Soldadura</label>
                                    <input
                                        type="text"
                                        value={formData.type_weld}
                                        onChange={(e) => setFormData({ ...formData, type_weld: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-1">NPS</label>
                                    <input
                                        type="text"
                                        value={formData.nps}
                                        onChange={(e) => setFormData({ ...formData, nps: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-1">SCH</label>
                                    <input
                                        type="text"
                                        value={formData.sch}
                                        onChange={(e) => setFormData({ ...formData, sch: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-1">Espesor</label>
                                    <input
                                        type="text"
                                        value={formData.thickness}
                                        onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-1">Material</label>
                                <input
                                    type="text"
                                    value={formData.material}
                                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-1">Destino</label>
                                <select
                                    value={formData.destination}
                                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="S">Taller (Shop)</option>
                                    <option value="F">Campo (Field)</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {/* Engineering Data Section */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Datos Ingeniería</h4>
                                <DetailRow label="Spool" value={formData.spool_number} />
                                <DetailRow label="Tipo de Soldadura" value={formData.type_weld} />
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailRow label="NPS" value={formData.nps} />
                                    <DetailRow label="SCH" value={formData.sch} />
                                </div>
                                <DetailRow label="Espesor" value={formData.thickness} />
                                <DetailRow label="Material" value={formData.material} />
                                <DetailRow label="Destino" value={getDestinationText(formData.destination)} />
                            </div>

                            {/* Field Execution Data Section - Only show if executed OR has history */}
                            {(weld.executed || executionHistory.length > 0) && (
                                <div className="mt-4 pt-4 border-t border-gray-300 space-y-3">
                                    <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                        Datos Terreno
                                    </h4>

                                    {/* Current Execution (if executed) */}
                                    {weld.executed && (
                                        <div className="bg-green-100 border border-green-300 rounded-lg p-3 space-y-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-green-700">Ejecución Actual</span>
                                                <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded font-bold">VIGENTE</span>
                                            </div>
                                            <DetailRow
                                                label="Fecha Ejecución"
                                                value={weld.execution_date ? new Date(weld.execution_date).toLocaleDateString('es-CL') : '-'}
                                            />
                                            <DetailRow
                                                label="Soldador"
                                                value={welderInfo ? `[${welderInfo.estampa}] ${welderInfo.nombre}` : 'Cargando...'}
                                            />
                                            <DetailRow
                                                label="Capataz"
                                                value={foremanInfo?.nombre || 'Cargando...'}
                                            />
                                            {reporterInfo && (
                                                <DetailRow
                                                    label="Reportado por"
                                                    value={reporterInfo.email}
                                                />
                                            )}
                                        </div>
                                    )}

                                    {/* Execution History */}
                                    {executionHistory.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-xs font-semibold text-gray-600 mb-2">Historial de Ejecuciones</p>
                                            <div className="space-y-2">
                                                {executionHistory.filter(e => e.status === 'RETRABAJO' || e.status === 'ANULADO').map((execution) => (
                                                    <ExecutionHistoryCard
                                                        key={execution.id}
                                                        execution={execution}
                                                        getResponsibilityLabel={getResponsibilityLabel}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Not Executed Badge */}
                            {!weld.executed && executionHistory.length === 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-300">
                                    <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 text-center">
                                        <span className="text-sm text-gray-600 font-medium">⏳ Pendiente de Ejecución</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-300 bg-gray-50 flex justify-between gap-3">
                    {editMode ? (
                        <>
                            <button
                                onClick={() => setEditMode(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Guardar Cambios
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                >
                                    <span>✏️</span>
                                    <span>Editar</span>
                                </button>
                                {/* Rework button - only for executed welds (not deleted) */}
                                {weld.executed && !weld.deleted && (
                                    <button
                                        onClick={() => onRework(weld)}
                                        className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>Retrabajo</span>
                                    </button>
                                )}
                                {/* Delete button - only for non-deleted welds */}
                                {!weld.deleted && (
                                    <button
                                        onClick={() => onDelete(weld)}
                                        className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>Eliminar</span>
                                    </button>
                                )}
                                {/* Restore button - only for deleted welds */}
                                {weld.deleted && (
                                    <button
                                        onClick={() => onRestore(weld)}
                                        className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>Restaurar</span>
                                    </button>
                                )}
                                {/* Undo execution button - only for executed welds (not deleted) */}
                                {weld.executed && !weld.deleted && (
                                    <button
                                        onClick={() => onUndo(weld)}
                                        className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                                        </svg>
                                        <span>Deshacer</span>
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// Modal de Reporte de Ejecución - Con selección en cascada Capataz -> Soldadores
function ExecutionReportModal({ weld, projectId, onClose, onSubmit }: ExecutionReportModal) {
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
        if (soldador && !soldador.estampa) {
            setNeedsEstampa(true)
            setEstampaInput('')
        } else {
            setNeedsEstampa(false)
            setEstampaInput(soldador?.estampa || '')
        }
    }

    const handleSubmit = async () => {
        setErrors({ ejecutadoPor: '', supervisadoPor: '' })

        if (!fecha || !ejecutadoPor || !supervisadoPor) {
            alert('Todos los campos son obligatorios')
            return
        }

        // If soldador needs estampa, validate and save it first
        if (needsEstampa) {
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-300 bg-gradient-to-r from-green-50 to-emerald-50">
                    <h3 className="text-lg font-bold text-gray-900">Reportar Ejecución</h3>
                    <p className="text-sm text-gray-700 font-medium">{weld.weld_number}</p>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"
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

                            {/* PASO 2: Seleccionar Soldador (Solo si hay capataz seleccionado) */}
                            {supervisadoPor && (
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
                            )}
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-gray-300 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={savingEstampa}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || savingEstampa || !ejecutadoPor || !supervisadoPor || (needsEstampa && !estampaInput.trim())}
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

// Helper component for detail rows
function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{label}</span>
            <div className="text-sm text-gray-900 font-semibold mt-0.5">{value || '-'}</div>
        </div>
    )
}

// Component for execution history cards with personnel loading
interface ExecutionHistoryCardProps {
    execution: WeldExecution
    getResponsibilityLabel: (resp: string) => string
}

function ExecutionHistoryCard({ execution, getResponsibilityLabel }: ExecutionHistoryCardProps) {
    const [welderName, setWelderName] = useState<string>('...')
    const [foremanName, setForemanName] = useState<string>('...')
    const [reporterName, setReporterName] = useState<string | null>(null)

    useEffect(() => {
        const loadPersonnel = async () => {
            // Load welder name
            if (execution.welder_id) {
                const { data: welder } = await supabase
                    .from('personal')
                    .select('nombre')
                    .eq('rut', execution.welder_id)
                    .single()
                if (welder) setWelderName(welder.nombre)
            }

            // Load foreman name
            if (execution.foreman_id) {
                const { data: foreman } = await supabase
                    .from('personal')
                    .select('nombre')
                    .eq('rut', execution.foreman_id)
                    .single()
                if (foreman) setForemanName(foreman.nombre)
            }

            // Load reporter name
            if (execution.reported_by_user) {
                const { data: reporter } = await supabase
                    .from('users')
                    .select('nombre')
                    .eq('id', execution.reported_by_user)
                    .single()
                if (reporter) setReporterName(reporter.nombre)
            }
        }
        loadPersonnel()
    }, [execution])

    const isAnulado = execution.status === 'ANULADO'
    const bgColor = isAnulado ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
    const textColor = isAnulado ? 'text-red-800' : 'text-orange-800'
    const subTextColor = isAnulado ? 'text-red-600' : 'text-orange-600'
    const badgeColor = isAnulado ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'

    return (
        <div className={`${bgColor} border rounded-lg p-3 text-sm space-y-1`}>
            <div className="flex justify-between items-center">
                <span className={`font-medium ${textColor}`}>
                    v{execution.version} - {new Date(execution.execution_date).toLocaleDateString('es-CL')}
                </span>
                <span className={`px-2 py-0.5 ${badgeColor} text-xs rounded font-bold`}>
                    {execution.status}
                </span>
            </div>
            <p className={`text-xs ${subTextColor}`}>
                <strong>Soldador:</strong> {welderName}
            </p>
            <p className={`text-xs ${subTextColor}`}>
                <strong>Capataz:</strong> {foremanName}
            </p>
            {reporterName && (
                <p className={`text-xs ${subTextColor}`}>
                    <strong>Reportado por:</strong> {reporterName}
                </p>
            )}
            {execution.rework_responsibility && (
                <p className={`text-xs ${subTextColor}`}>
                    <strong>Motivo:</strong> {getResponsibilityLabel(execution.rework_responsibility)}
                    {execution.rework_reason && ` - ${execution.rework_reason}`}
                </p>
            )}
        </div>
    )
}

// Modal de Retrabajo
interface ReworkModalProps {
    weld: any
    projectId: string
    onClose: () => void
    onSubmit: (responsibility: ReworkResponsibility, reason: string, executionData?: { fecha: string; welderId: string; foremanId: string }) => Promise<void>
}

const REWORK_OPTIONS: { value: ReworkResponsibility; label: string; description: string }[] = [
    { value: 'TERRENO', label: 'Terreno', description: 'Error al construir (incluye nueva ejecución)' },
    { value: 'INGENIERIA', label: 'Ingeniería', description: 'Interferencias / Cambios de revisión' },
    { value: 'RECHAZO_END', label: 'Rechazo', description: 'Rechazo por parte de Calidad' },
]

function ReworkModal({ weld, projectId, onClose, onSubmit }: ReworkModalProps) {
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
        if (responsibility === 'TERRENO' && (!selectedSoldador || !selectedCapataz)) {
            alert('Para Retrabajo por Terreno, debes seleccionar soldador y capataz')
            return
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

            const executionData = responsibility === 'TERRENO'
                ? { fecha, welderId: selectedSoldador, foremanId: selectedCapataz }
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
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

                {/* Body */}
                <div className="p-6 space-y-4">
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

                            {/* Soldador */}
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
                            </div>

                            {/* Estampa input - only shown when selected soldador has no estampa */}
                            {needsEstampa && (
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
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || savingEstampa || (responsibility === 'TERRENO' && (!selectedSoldador || !selectedCapataz || (needsEstampa && !estampaInput.trim())))}
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
                </div>
            </div>
        </div>
    )
}

// Delete Weld Modal (soft delete with reason)
interface DeleteWeldModalProps {
    weld: any
    onClose: () => void
    onSubmit: (reason: string) => Promise<void>
}

function DeleteWeldModal({ weld, onClose, onSubmit }: DeleteWeldModalProps) {
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!reason.trim()) {
            alert('Por favor ingresa un motivo para la eliminación')
            return
        }

        setSubmitting(true)
        try {
            await onSubmit(reason)
            onClose()
        } catch (error) {
            console.error('Error deleting weld:', error)
            alert('❌ Error al eliminar la unión')
        }
        setSubmitting(false)
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-gray-300 bg-gradient-to-r from-red-50 to-rose-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar Unión
                    </h3>
                    <p className="text-sm text-gray-700 font-medium">{weld.weld_number}</p>
                </div>

                <div className="p-6 space-y-4">
                    {/* Warning */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                            <strong>⚠️ Nota:</strong> La unión será marcada como eliminada pero no se borrará permanentemente.
                            El historial de ejecuciones se conservará y podrás restaurarla si fue un error.
                        </p>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Motivo de eliminación *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Describe por qué se elimina esta unión..."
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !reason.trim()}
                        className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Eliminar Unión
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Undo Execution Modal (for false reports)
interface UndoExecutionModalProps {
    weld: any
    onClose: () => void
    onSubmit: (reason: string) => Promise<void>
}

function UndoExecutionModal({ weld, onClose, onSubmit }: UndoExecutionModalProps) {
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!reason.trim()) {
            alert('Por favor ingresa un motivo para deshacer el reporte')
            return
        }

        setSubmitting(true)
        try {
            await onSubmit(reason)
            onClose()
        } catch (error) {
            console.error('Error undoing execution:', error)
            alert('❌ Error al deshacer el reporte')
        }
        setSubmitting(false)
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-gray-300 bg-gradient-to-r from-amber-50 to-yellow-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                        </svg>
                        Deshacer Reporte
                    </h3>
                    <p className="text-sm text-gray-700 font-medium">{weld.weld_number}</p>
                </div>

                <div className="p-6 space-y-4">
                    {/* Warning */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800">
                            <strong>⚠️ Atención:</strong> Esta acción anulará el reporte de ejecución actual y la unión
                            volverá a estado PENDIENTE. El historial de ejecuciones se conservará marcado como ANULADO.
                        </p>
                    </div>

                    {/* Current execution info */}
                    {weld.execution_date && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700">
                                <strong>Ejecución actual:</strong> {new Date(weld.execution_date).toLocaleDateString('es-CL')}
                            </p>
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Motivo del error *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Describe por qué este reporte fue un error..."
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !reason.trim()}
                        className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                                </svg>
                                Deshacer Reporte
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Función para agrupar soldaduras por spool y calcular estado de fabricación
function groupWeldsBySpool(welds: any[]): WeldsBySpool[] {
    const spoolMap = new Map<string, WeldsBySpool>()

    welds.forEach(weld => {
        const spoolNumber = weld.spool_number
        if (!spoolMap.has(spoolNumber)) {
            spoolMap.set(spoolNumber, {
                spool_number: spoolNumber,
                welds: [],
                shop_welds_total: 0,
                shop_welds_executed: 0,
                field_welds_total: 0,
                field_welds_executed: 0,
                is_fabricated: false,
                fabrication_status: 'PENDIENTE'
            })
        }

        const spool = spoolMap.get(spoolNumber)!
        spool.welds.push(weld)

        // Skip deleted welds from counts
        if (weld.deleted) return

        // Contar soldaduras de taller (S = Shop)
        if (weld.destination === 'S') {
            spool.shop_welds_total++
            if (weld.executed) {
                spool.shop_welds_executed++
            }
        }

        // Contar soldaduras de campo (F = Field)
        if (weld.destination === 'F') {
            spool.field_welds_total++
            if (weld.executed) {
                spool.field_welds_executed++
            }
        }
    })

    // Calcular estado de fabricación para cada spool
    spoolMap.forEach(spool => {
        if (spool.shop_welds_total === 0) {
            spool.fabrication_status = 'N/A'
            spool.is_fabricated = false
        } else if (spool.shop_welds_total === spool.shop_welds_executed) {
            spool.fabrication_status = 'FABRICADO'
            spool.is_fabricated = true
        } else if (spool.shop_welds_executed > 0) {
            spool.fabrication_status = 'EN PROCESO'
            spool.is_fabricated = false
        } else {
            spool.fabrication_status = 'PENDIENTE'
            spool.is_fabricated = false
        }
    })

    return Array.from(spoolMap.values()).sort((a, b) => a.spool_number.localeCompare(b.spool_number))
}

export default function MasterViewsManager({ projectId }: MasterViewsManagerProps) {
    const [isometrics, setIsometrics] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedIso, setSelectedIso] = useState<any | null>(null)
    const [details, setDetails] = useState<IsometricDetails | null>(null)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [activeTab, setActiveTab] = useState<'MATERIALS' | 'UNIONS' | 'SPOOLS' | 'TORQUES'>('UNIONS')
    const [showRevisionHistory, setShowRevisionHistory] = useState(false)
    const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null)
    const [revisionFiles, setRevisionFiles] = useState<any[]>([])
    const [showPdfViewer, setShowPdfViewer] = useState(false)
    const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null)
    const [bottomNavTab, setBottomNavTab] = useState<'home' | 'stats' | 'settings'>('home')
    const [showSettingsMenu, setShowSettingsMenu] = useState(false)

    // Estados para modales
    const [selectedWeld, setSelectedWeld] = useState<any | null>(null)
    const [showExecutionModal, setShowExecutionModal] = useState(false)
    const [weldForExecution, setWeldForExecution] = useState<any | null>(null)

    // Rework modal state
    const [showReworkModal, setShowReworkModal] = useState(false)
    const [weldForRework, setWeldForRework] = useState<any | null>(null)

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [weldForDelete, setWeldForDelete] = useState<any | null>(null)

    // Undo execution modal state
    const [showUndoModal, setShowUndoModal] = useState(false)
    const [weldForUndo, setWeldForUndo] = useState<any | null>(null)

    // Estado para spools agrupados
    const [weldsBySpool, setWeldsBySpool] = useState<WeldsBySpool[]>([])
    const [expandedSpools, setExpandedSpools] = useState<Set<string>>(new Set())

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploadingRevisionId, setUploadingRevisionId] = useState<string | null>(null)

    // User role for conditional rendering
    const [userRole, setUserRole] = useState<string>('')

    // Fetch user role on mount
    useEffect(() => {
        async function fetchUserRole() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('users')
                    .select('rol')
                    .eq('id', user.id)
                    .single()
                if (data?.rol) setUserRole(data.rol.toUpperCase())
            }
        }
        fetchUserRole()
    }, [])

    useEffect(() => {
        loadIsometrics()
    }, [projectId, searchTerm])

    // Agrupar soldaduras cuando cambian los detalles
    useEffect(() => {
        if (details) {
            const grouped = groupWeldsBySpool(details.welds)
            setWeldsBySpool(grouped)
        }
    }, [details])

    async function loadIsometrics() {
        setLoading(true)
        try {
            const result = await searchIsometrics(projectId, searchTerm, 0, 50, { status: 'ALL' })
            setIsometrics(result.data)
        } catch (error) {
            console.error('Error loading isometrics:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSelectIso(iso: any) {
        if (selectedIso?.id === iso.id) {
            setSelectedIso(null)
            setDetails(null)
            return
        }
        setSelectedIso(iso)
        setLoadingDetails(true)
        const activeRev = iso.revisions?.find((r: any) => r.estado === 'VIGENTE') || iso.revisions?.[0]
        if (activeRev) {
            try {
                const data = await getIsometricDetails(activeRev.id)
                setDetails(data)
                setSelectedRevisionId(activeRev.id)
                const allRevisionIds = iso.revisions?.map((r: any) => r.id) || []
                await loadAllRevisionFiles(allRevisionIds)
            } catch (error) {
                console.error('Error loading details:', error)
            }
        }
        setLoadingDetails(false)
    }

    const handleWeldUpdate = async (weldId: string, updates: any) => {
        try {
            const { error } = await supabase
                .from('spools_welds')
                .update(updates)
                .eq('id', weldId)

            if (error) throw error

            setDetails(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    welds: prev.welds.map(w => (w.id === weldId ? { ...w, ...updates } : w))
                }
            })

            alert('✅ Soldadura actualizada correctamente')
        } catch (error) {
            console.error('Error updating weld:', error)
            alert('❌ Error al actualizar la soldadura')
        }
    }

    const handleExecutionReport = async (data: { fecha: string; ejecutadoPor: string; supervisadoPor: string }) => {
        if (!weldForExecution) return

        try {
            // Get current user for audit
            const { data: { user } } = await supabase.auth.getUser()

            // Use registerWeldExecution to create proper execution record with audit
            await registerWeldExecution(
                weldForExecution.id,
                data.ejecutadoPor,     // RUT del soldador
                data.supervisadoPor,   // RUT del capataz
                data.fecha,
                user?.id               // ID del usuario que reporta
            )

            setDetails(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    welds: prev.welds.map(w =>
                        w.id === weldForExecution.id
                            ? { ...w, executed: true, execution_date: data.fecha, welder_id: data.ejecutadoPor, foreman_id: data.supervisadoPor }
                            : w
                    )
                }
            })

            alert('✅ Ejecución reportada correctamente')
        } catch (error) {
            console.error('Error reporting execution:', error)
            alert('❌ Error al reportar la ejecución')
        }
    }

    // Handle marking a weld for rework
    const handleRework = async (
        responsibility: ReworkResponsibility,
        reason: string,
        executionData?: { fecha: string; welderId: string; foremanId: string }
    ) => {
        if (!weldForRework) return

        try {
            // First, mark the old execution as rework
            await markWeldForRework(weldForRework.id, responsibility, reason)

            // If TERRENO, also register the new execution immediately
            if (responsibility === 'TERRENO' && executionData) {
                // Get current user for audit
                const { data: { user } } = await supabase.auth.getUser()

                await registerWeldExecution(
                    weldForRework.id,
                    executionData.welderId,
                    executionData.foremanId,
                    executionData.fecha,
                    user?.id  // ID del usuario que reporta
                )

                // Update local state - weld is now executed again
                setDetails(prev => {
                    if (!prev) return null
                    return {
                        ...prev,
                        welds: prev.welds.map(w =>
                            w.id === weldForRework.id
                                ? {
                                    ...w,
                                    executed: true,
                                    execution_date: executionData.fecha,
                                    welder_id: executionData.welderId,
                                    foreman_id: executionData.foremanId,
                                    rework_count: (w.rework_count || 0) + 1
                                }
                                : w
                        )
                    }
                })

                setShowReworkModal(false)
                setWeldForRework(null)
                alert('✅ Retrabajo registrado y nueva ejecución guardada.')
            } else {
                // For INGENIERIA and RECHAZO_END, weld goes back to pending
                setDetails(prev => {
                    if (!prev) return null
                    return {
                        ...prev,
                        welds: prev.welds.map(w =>
                            w.id === weldForRework.id
                                ? {
                                    ...w,
                                    executed: false,
                                    execution_date: null,
                                    welder_id: null,
                                    foreman_id: null,
                                    rework_count: (w.rework_count || 0) + 1
                                }
                                : w
                        )
                    }
                })

                setShowReworkModal(false)
                setWeldForRework(null)
                alert('✅ Retrabajo registrado. La unión vuelve a estado PENDIENTE.')
            }
        } catch (error) {
            console.error('Error marking rework:', error)
            throw error
        }
    }

    // Handle soft delete of a weld
    const handleDeleteWeld = async (reason: string) => {
        if (!weldForDelete) return

        try {
            await deleteWeld(weldForDelete.id, reason)

            // Update local state
            setDetails(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    welds: prev.welds.map(w =>
                        w.id === weldForDelete.id
                            ? { ...w, deleted: true, deletion_reason: reason }
                            : w
                    )
                }
            })

            setShowDeleteModal(false)
            setWeldForDelete(null)
            setSelectedWeld(null)
            alert('✅ Unión eliminada correctamente.')
        } catch (error) {
            console.error('Error deleting weld:', error)
            throw error
        }
    }

    // Handle restore of a deleted weld
    const handleRestoreWeld = async (weld: any) => {
        try {
            await restoreWeld(weld.id)

            // Update local state
            setDetails(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    welds: prev.welds.map(w =>
                        w.id === weld.id
                            ? { ...w, deleted: false, deletion_reason: null }
                            : w
                    )
                }
            })

            alert('✅ Unión restaurada correctamente.')
        } catch (error) {
            console.error('Error restoring weld:', error)
            alert('❌ Error al restaurar la unión')
        }
    }

    // Handle undo false execution report
    const handleUndoExecution = async (reason: string) => {
        if (!weldForUndo) return

        try {
            await undoWeldExecution(weldForUndo.id, reason)

            // Update local state
            setDetails(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    welds: prev.welds.map(w =>
                        w.id === weldForUndo.id
                            ? {
                                ...w,
                                executed: false,
                                execution_date: null,
                                welder_id: null,
                                foreman_id: null
                            }
                            : w
                    )
                }
            })

            setShowUndoModal(false)
            setWeldForUndo(null)
            setSelectedWeld(null)
            alert('✅ Reporte deshecho. La unión vuelve a estado PENDIENTE.')
        } catch (error) {
            console.error('Error undoing execution:', error)
            throw error
        }
    }

    const handleJointToggle = async (jointId: string, currentStatus: boolean) => {
        try {
            setDetails(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    joints: prev.joints.map(j => (j.id === jointId ? { ...j, executed: !currentStatus } : j))
                }
            })
            await updateJointExecution(jointId, !currentStatus)
        } catch (error) {
            console.error('Error updating joint:', error)
        }
    }

    const toggleSpoolExpanded = (spoolNumber: string) => {
        setExpandedSpools(prev => {
            const newSet = new Set(prev)
            if (newSet.has(spoolNumber)) {
                newSet.delete(spoolNumber)
            } else {
                newSet.add(spoolNumber)
            }
            return newSet
        })
    }

    const loadAllRevisionFiles = async (revisionIds: string[]) => {
        if (!revisionIds.length) {
            setRevisionFiles([])
            return
        }
        try {
            const { data, error } = await supabase
                .from('revision_files')
                .select('*')
                .in('revision_id', revisionIds)
                .order('version_number', { ascending: false })

            if (error) throw error
            setRevisionFiles(data || [])
        } catch (error) {
            console.error('Error loading revision files:', error)
            setRevisionFiles([])
        }
    }

    const handleViewPdf = async (fileUrl: string) => {
        let urlToView = fileUrl
        if (!fileUrl.startsWith('http')) {
            const { data, error } = await supabase.storage
                .from('revision-files')
                .createSignedUrl(fileUrl, 3600)

            if (error || !data) {
                console.error('Error getting signed URL:', error)
                alert('Error al abrir el archivo. Verifique que el archivo exista.')
                return
            }
            urlToView = data.signedUrl
        }
        setSelectedPdfUrl(urlToView)
        setShowPdfViewer(true)
    }

    const handleUploadClick = (revisionId: string) => {
        setUploadingRevisionId(revisionId)
        fileInputRef.current?.click()
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file || !uploadingRevisionId) return

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `${uploadingRevisionId}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('revision-files')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { error: dbError } = await supabase
                .from('revision_files')
                .insert({
                    revision_id: uploadingRevisionId,
                    file_name: file.name,
                    file_type: 'pdf',
                    file_url: filePath,
                    version_number: 1,
                    uploaded_at: new Date().toISOString(),
                    is_primary: false
                })

            if (dbError) throw dbError

            if (selectedIso) {
                const allRevisionIds = selectedIso.revisions?.map((r: any) => r.id) || []
                await loadAllRevisionFiles(allRevisionIds)
            }
            alert('Archivo subido correctamente')
        } catch (error) {
            console.error('Error uploading file:', error)
            alert('Error al subir el archivo')
        } finally {
            setUploadingRevisionId(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleRevisionChange = async (revisionId: string) => {
        setSelectedRevisionId(revisionId)
        setLoadingDetails(true)
        try {
            const data = await getIsometricDetails(revisionId)
            setDetails(data)
        } catch (error) {
            console.error('Error loading revision details:', error)
        }
        setLoadingDetails(false)
    }

    return (
        <div className="relative min-h-screen pb-20">
            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-300 sticky top-0 z-10 mb-6">
                <input
                    type="text"
                    placeholder="Buscar isométrico..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
            </div>

            {/* Isometric List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-700">Cargando...</div>
                ) : isometrics.length === 0 ? (
                    <div className="text-center py-8 text-gray-700">No se encontraron isométricos.</div>
                ) : (
                    isometrics.map(iso => {
                        const activeRev = iso.revisions?.find((r: any) => r.estado === 'VIGENTE') || iso.revisions?.[0]
                        const isSelected = selectedIso?.id === iso.id
                        const allRevisions = iso.revisions || []

                        return (
                            <div
                                key={iso.id}
                                className={`bg-white rounded-xl shadow-sm border transition-all overflow-hidden ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-300 hover:border-blue-300'
                                    }`}
                            >
                                {/* Header Card */}
                                <div onClick={() => handleSelectIso(iso)} className="p-4 cursor-pointer flex justify-between items-center bg-white">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900">{iso.codigo}</h3>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-sm text-gray-700">{iso.area}</span>
                                            {activeRev && (
                                                <span
                                                    className={`px-2 py-0.5 rounded text-xs font-bold ${activeRev.estado === 'VIGENTE' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                                        }`}
                                                >
                                                    Rev {activeRev.codigo}
                                                </span>
                                            )}
                                            {allRevisions.length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setShowRevisionHistory(!showRevisionHistory)
                                                    }}
                                                    className="p-1.5 rounded-full hover:bg-blue-50 text-blue-600 hover:text-blue-800 transition-all"
                                                    title="Ver historial de revisiones"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-gray-600">{isSelected ? '▲' : '▼'}</div>
                                </div>

                                {/* Revision History Panel */}
                                {showRevisionHistory && isSelected && (
                                    <div className="border-t border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Historial de Revisiones
                                        </h4>
                                        <div className="space-y-2">
                                            {allRevisions.map((rev: any) => {
                                                const revFiles = revisionFiles.filter(f => f.revision_id === rev.id)
                                                const isActiveRevision = selectedRevisionId === rev.id

                                                return (
                                                    <div
                                                        key={rev.id}
                                                        className={`bg-white rounded-lg border-2 transition-all shadow-sm overflow-hidden ${isActiveRevision
                                                            ? 'border-blue-500 ring-2 ring-blue-200'
                                                            : 'border-gray-300 hover:border-blue-300'
                                                            }`}
                                                    >
                                                        {/* Revision Header */}
                                                        <div
                                                            onClick={() => handleRevisionChange(rev.id)}
                                                            className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-gray-900">Rev {rev.codigo}</span>
                                                                    <span
                                                                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${rev.estado === 'VIGENTE'
                                                                            ? 'bg-green-100 text-green-700 border border-green-200'
                                                                            : 'bg-gray-200 text-gray-600 border border-gray-300'
                                                                            }`}
                                                                    >
                                                                        {rev.estado}
                                                                    </span>
                                                                    {isActiveRevision && (
                                                                        <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                            </svg>
                                                                            Viendo
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs text-gray-700">
                                                                    {rev.fecha_emision ? new Date(rev.fecha_emision).toLocaleDateString('es-ES') : 'Sin fecha'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Files Section */}
                                                        {revFiles.length > 0 && (
                                                            <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
                                                                <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                    </svg>
                                                                    Archivos ({revFiles.length})
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {revFiles.map(file => (
                                                                        <div
                                                                            key={file.id}
                                                                            className="flex items-center justify-between bg-white rounded border border-gray-300 px-2 py-1.5 hover:border-blue-300 transition-colors"
                                                                        >
                                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                                                </svg>
                                                                                <span className="text-xs text-gray-700 truncate font-medium">
                                                                                    {file.file_name}
                                                                                </span>
                                                                            </div>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    handleViewPdf(file.file_url)
                                                                                }}
                                                                                className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                                                                            >
                                                                                Ver PDF
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Upload Button */}
                                                        <div className="border-t border-gray-100 bg-white px-3 py-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleUploadClick(rev.id)
                                                                }}
                                                                className="w-full px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-xs font-semibold hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-2 shadow-sm"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                                </svg>
                                                                Subir Archivo
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Expanded Details */}
                                {isSelected && (
                                    <div className="border-t border-gray-100 bg-gray-50">
                                        {loadingDetails ? (
                                            <div className="p-8 text-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                            </div>
                                        ) : details ? (
                                            <div>
                                                {/* Tabs */}
                                                <div className="flex overflow-x-auto border-b border-gray-300 bg-white sticky top-0">
                                                    <button
                                                        onClick={() => setActiveTab('MATERIALS')}
                                                        className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'MATERIALS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-700 hover:text-gray-700'
                                                            }`}
                                                    >
                                                        Materiales ({details.materials.length})
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('UNIONS')}
                                                        className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'UNIONS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-700 hover:text-gray-700'
                                                            }`}
                                                    >
                                                        Uniones ({details.welds.length})
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('SPOOLS')}
                                                        className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'SPOOLS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-700 hover:text-gray-700'
                                                            }`}
                                                    >
                                                        Spools ({details.spools.length})
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('TORQUES')}
                                                        className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'TORQUES' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-700 hover:text-gray-700'
                                                            }`}
                                                    >
                                                        Torques ({details.joints.length})
                                                    </button>
                                                </div>

                                                {/* Content */}
                                                <div className="p-4">
                                                    {activeTab === 'MATERIALS' && (
                                                        <div className="space-y-3">
                                                            {details.materials.map(mat => (
                                                                <div key={mat.id} className="bg-white p-3 rounded-lg border border-gray-300 shadow-sm text-sm">
                                                                    <div className="font-bold text-gray-800 mb-1">{mat.item_code}</div>
                                                                    <div className="text-gray-600 mb-1">{mat.description || 'Sin descripción'}</div>
                                                                    <div className="flex justify-between items-center text-xs text-gray-700">
                                                                        <span>Cant: {mat.qty} {mat.qty_unit}</span>
                                                                        <button className="text-blue-600 hover:text-blue-800 font-medium">+ Solicitar</button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {activeTab === 'UNIONS' && (
                                                        <div className="space-y-4">
                                                            {weldsBySpool.map(spool => {
                                                                const isExpanded = expandedSpools.has(spool.spool_number)
                                                                return (
                                                                    <div key={spool.spool_number} className="bg-white rounded-lg border border-gray-300 shadow-sm overflow-hidden">
                                                                        {/* Spool Header */}
                                                                        <div
                                                                            onClick={() => toggleSpoolExpanded(spool.spool_number)}
                                                                            className="p-3 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                                                                        >
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="font-bold text-gray-900">Spool: {spool.spool_number}</span>
                                                                                    <span
                                                                                        className={`px-2 py-0.5 rounded text-xs font-bold ${spool.fabrication_status === 'FABRICADO'
                                                                                            ? 'bg-green-100 text-green-700'
                                                                                            : spool.fabrication_status === 'EN PROCESO'
                                                                                                ? 'bg-yellow-100 text-yellow-700'
                                                                                                : spool.fabrication_status === 'N/A'
                                                                                                    ? 'bg-gray-200 text-gray-700'
                                                                                                    : 'bg-orange-100 text-orange-700'
                                                                                            }`}
                                                                                    >
                                                                                        {spool.fabrication_status}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-xs text-gray-700 mt-1">
                                                                                    Taller: {spool.shop_welds_executed}/{spool.shop_welds_total} •
                                                                                    Campo: {spool.field_welds_executed}/{spool.field_welds_total} •
                                                                                    Total: {spool.welds.length} uniones
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-gray-600">{isExpanded ? '▲' : '▼'}</div>
                                                                        </div>

                                                                        {/* Welds List */}
                                                                        {isExpanded && (
                                                                            <div className="border-t border-gray-300 bg-gray-50 p-2 space-y-2">
                                                                                {spool.welds.map(weld => {
                                                                                    // Determine card background color
                                                                                    const getCardBgClass = () => {
                                                                                        if (weld.deleted) return 'bg-red-50 border-red-200'
                                                                                        if (weld.executed) return 'bg-green-50 border-green-200'
                                                                                        if (weld.rework_count > 0) return 'bg-orange-50 border-orange-200'
                                                                                        return 'bg-white border-gray-300'
                                                                                    }

                                                                                    return (
                                                                                        <div
                                                                                            key={weld.id}
                                                                                            onClick={() => setSelectedWeld(weld)}
                                                                                            className={`p-3 rounded-lg border flex justify-between items-center shadow-sm cursor-pointer hover:shadow-md transition-all ${getCardBgClass()}`}
                                                                                        >
                                                                                            <div>
                                                                                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                                                                                    {weld.weld_number}
                                                                                                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${weld.destination === 'S' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                                                                        }`}>
                                                                                                        {weld.destination === 'S' ? 'Taller' : 'Campo'}
                                                                                                    </span>
                                                                                                    {/* Rework Badge */}
                                                                                                    {weld.rework_count > 0 && (
                                                                                                        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                                                                            R{weld.rework_count}
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {/* Deleted Badge */}
                                                                                                    {weld.deleted && (
                                                                                                        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                                                                            ELIMINADA
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="text-xs text-gray-600">{weld.type_weld} - {weld.nps}"</div>
                                                                                            </div>
                                                                                            <div className="flex flex-col items-end gap-2">
                                                                                                <span
                                                                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${weld.deleted
                                                                                                        ? 'bg-red-100 text-red-700 border border-red-200'
                                                                                                        : weld.executed
                                                                                                            ? 'bg-green-100 text-green-700 border border-green-200'
                                                                                                            : 'bg-gray-200 text-gray-700 border border-gray-300'
                                                                                                        }`}
                                                                                                >
                                                                                                    {weld.deleted ? 'ELIMINADA' : weld.executed ? 'EJECUTADO' : 'PENDIENTE'}
                                                                                                </span>
                                                                                                {/* Reportar button for pending welds (not deleted) */}
                                                                                                {!weld.executed && !weld.deleted && (
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation()
                                                                                                            setWeldForExecution(weld)
                                                                                                            setShowExecutionModal(true)
                                                                                                        }}
                                                                                                        className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                                                                                                    >
                                                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                                                        </svg>
                                                                                                        Reportar
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}

                                                    {activeTab === 'SPOOLS' && (
                                                        <div className="space-y-3">
                                                            {details.spools.map(spool => (
                                                                <div key={spool.spool_number} className="bg-white p-3 rounded-lg border border-gray-300 shadow-sm">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <span className="font-bold text-gray-800">{spool.spool_number}</span>
                                                                        <span
                                                                            className={`text-xs font-bold px-2 py-1 rounded ${spool.status === 'COMPLETE'
                                                                                ? 'bg-green-100 text-green-700'
                                                                                : spool.status === 'PARTIAL'
                                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                                    : 'bg-gray-200 text-gray-700'
                                                                                }`}
                                                                        >
                                                                            {spool.status === 'COMPLETE'
                                                                                ? 'COMPLETO'
                                                                                : spool.status === 'PARTIAL'
                                                                                    ? 'PARCIAL'
                                                                                    : 'PENDIENTE'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                                        <div
                                                                            className="bg-blue-600 h-2 rounded-full transition-all"
                                                                            style={{ width: `${(spool.welds_executed / spool.welds_count) * 100}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <div className="flex justify-between mt-1 text-xs text-gray-700">
                                                                        <span>Progreso</span>
                                                                        <span>{spool.welds_executed} / {spool.welds_count} soldaduras</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {activeTab === 'TORQUES' && (
                                                        <div className="space-y-3">
                                                            {details.joints.map(joint => (
                                                                <div key={joint.id} className="bg-white p-3 rounded-lg border border-gray-300 flex justify-between items-center shadow-sm">
                                                                    <div>
                                                                        <div className="font-bold text-gray-800">{joint.flanged_joint_number}</div>
                                                                        <div className="text-xs text-gray-700">Rating: {joint.rating}</div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleJointToggle(joint.id, joint.executed)}
                                                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${joint.executed ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-200'
                                                                            }`}
                                                                    >
                                                                        {joint.executed ? 'TORQUEADO' : 'PENDIENTE'}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-gray-700">No hay detalles cargados para esta revisión.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* Modales */}
            {selectedWeld && (
                <WeldDetailModal
                    weld={selectedWeld}
                    projectId={projectId}
                    onClose={() => setSelectedWeld(null)}
                    onUpdate={handleWeldUpdate}
                    onRework={(weld) => {
                        setSelectedWeld(null) // Close detail modal
                        setWeldForRework(weld)
                        setShowReworkModal(true)
                    }}
                    onDelete={(weld) => {
                        setSelectedWeld(null) // Close detail modal
                        setWeldForDelete(weld)
                        setShowDeleteModal(true)
                    }}
                    onRestore={handleRestoreWeld}
                    onUndo={(weld) => {
                        setSelectedWeld(null) // Close detail modal
                        setWeldForUndo(weld)
                        setShowUndoModal(true)
                    }}
                    onRefresh={async () => {
                        // Reload isometric details
                        if (selectedRevisionId) {
                            const refreshedDetails = await getIsometricDetails(selectedRevisionId)
                            setDetails(refreshedDetails)
                        }
                    }}
                />
            )}

            {showExecutionModal && weldForExecution && (
                <ExecutionReportModal
                    weld={weldForExecution}
                    projectId={projectId}
                    onClose={() => {
                        setShowExecutionModal(false)
                        setWeldForExecution(null)
                    }}
                    onSubmit={handleExecutionReport}
                />
            )}

            {/* Rework Modal */}
            {showReworkModal && weldForRework && (
                <ReworkModal
                    weld={weldForRework}
                    projectId={projectId}
                    onClose={() => {
                        setShowReworkModal(false)
                        setWeldForRework(null)
                    }}
                    onSubmit={handleRework}
                />
            )}

            {/* Delete Weld Modal */}
            {showDeleteModal && weldForDelete && (
                <DeleteWeldModal
                    weld={weldForDelete}
                    onClose={() => {
                        setShowDeleteModal(false)
                        setWeldForDelete(null)
                    }}
                    onSubmit={handleDeleteWeld}
                />
            )}

            {/* Undo Execution Modal */}
            {showUndoModal && weldForUndo && (
                <UndoExecutionModal
                    weld={weldForUndo}
                    onClose={() => {
                        setShowUndoModal(false)
                        setWeldForUndo(null)
                    }}
                    onSubmit={handleUndoExecution}
                />
            )}

            {/* PDF Viewer Modal */}
            {showPdfViewer && selectedPdfUrl && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-bold text-gray-900">Visor de PDF</h3>
                            <button
                                onClick={() => {
                                    setShowPdfViewer(false)
                                    setSelectedPdfUrl(null)
                                }}
                                className="text-gray-700 hover:text-gray-700 text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <iframe
                                src={selectedPdfUrl}
                                className="w-full h-full"
                                title="PDF Viewer"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40">
                <div className="flex items-center justify-around border-t border-gray-300/80 bg-white/90 px-2 pb-4 pt-2 backdrop-blur-lg dark:border-gray-800/80 dark:bg-gray-900/90">
                    {/* Home Button */}
                    <a
                        href="/dashboard/master-views"
                        className={`flex flex-1 flex-col items-center justify-end gap-1.5 pt-1 transition-all ${bottomNavTab === 'home' ? 'text-blue-600' : 'text-gray-700 dark:text-gray-600'}`}
                    >
                        <svg
                            className="w-6 h-6"
                            fill={bottomNavTab === 'home' ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <p className="text-xs font-medium tracking-wide">Inicio</p>
                    </a>

                    {/* Stats Button */}
                    <button
                        onClick={() => setBottomNavTab('stats')}
                        className={`flex flex-1 flex-col items-center justify-end gap-1.5 pt-1 transition-all ${bottomNavTab === 'stats' ? 'text-blue-600' : 'text-gray-700 dark:text-gray-600'}`}
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-xs font-medium tracking-wide">Estadísticas</p>
                    </button>

                    {/* Settings Button with Dropdown - Hidden for USUARIO role */}
                    {userRole !== 'USUARIO' && (
                        <div className="relative flex flex-1">
                            <button
                                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                                className={`flex flex-1 flex-col items-center justify-end gap-1.5 pt-1 transition-all ${bottomNavTab === 'settings' || showSettingsMenu ? 'text-blue-600' : 'text-gray-700 dark:text-gray-600'}`}
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <p className="text-xs font-medium tracking-wide">Ajustes</p>
                            </button>

                            {/* Settings Dropdown Menu */}
                            {showSettingsMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-300 overflow-hidden min-w-[200px]">
                                    <a
                                        href={`/proyectos/${projectId}/cuadrillas/manage`}
                                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                        onClick={() => setShowSettingsMenu(false)}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span className="font-medium">Cuadrillas</span>
                                    </a>
                                    <button
                                        onClick={() => {
                                            setBottomNavTab('settings')
                                            setShowSettingsMenu(false)
                                            alert('Función de ayuda próximamente...')
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-t border-gray-100"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium">Ayuda</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
            />
        </div>
    )
}

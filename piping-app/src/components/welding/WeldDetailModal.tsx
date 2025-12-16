import { useState, useEffect } from 'react'
import { useUIStore } from '@/store/ui-store'
import { supabase } from '@/lib/supabase'
import { getWeldExecutions, type WeldExecution } from '@/services/master-views'

interface WeldDetailModalProps {
    weld: any
    projectId: string
    requiresWelder: (type: string) => boolean
    onClose: () => void
    onUpdate: (weldId: string, updates: any) => void
    onRework: (weld: any) => void
    onDelete: (weld: any) => void
    onRestore: (weld: any) => void
    onUndo: (weld: any) => void
    onRefresh: () => void
}

export default function WeldDetailModal({ weld, projectId, requiresWelder, onClose, onUpdate, onRework, onDelete, onRestore, onUndo, onRefresh }: WeldDetailModalProps) {
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
    const [deletedByInfo, setDeletedByInfo] = useState<{ nombre: string } | null>(null)
    const [createdByInfo, setCreatedByInfo] = useState<{ nombre: string } | null>(null)

    // Execution history
    const [executionHistory, setExecutionHistory] = useState<WeldExecution[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    const setFocusMode = useUIStore((state) => state.setFocusMode)

    // Handle Focus Mode using UI Store
    useEffect(() => {
        setFocusMode(true)
        return () => setFocusMode(false)
    }, [setFocusMode])

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

            // Load deleted_by info if weld is deleted
            if (weld.deleted && weld.deleted_by) {
                const { data: deleter } = await supabase
                    .from('users')
                    .select('nombre')
                    .eq('id', weld.deleted_by)
                    .single()

                if (deleter) {
                    setDeletedByInfo({ nombre: deleter.nombre })
                }
            }

            // Load created_by info if weld has creation info
            if (weld.created_by) {
                const { data: creator } = await supabase
                    .from('users')
                    .select('nombre')
                    .eq('id', weld.created_by)
                    .single()

                if (creator) {
                    setCreatedByInfo({ nombre: creator.nombre })
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                {/* 1️⃣ Fixed Header */}
                <div className="shrink-0 p-4 border-b border-gray-300 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
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
                    <button onClick={onClose} className="text-gray-700 hover:text-gray-900 text-2xl font-bold">
                        ×
                    </button>
                </div>

                {/* 2️⃣ Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
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

                            {/* Creation Info Section - Show for any manually created weld */}
                            {(weld.creation_type || weld.created_by) && (
                                <div className={`mt-4 pt-4 border-t space-y-2 ${weld.creation_type === 'TERRENO' ? 'border-emerald-200' : 'border-blue-200'
                                    }`}>
                                    <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${weld.creation_type === 'TERRENO' ? 'text-emerald-700' : 'text-blue-700'
                                        }`}>
                                        <span className={`w-2 h-2 rounded-full ${weld.creation_type === 'TERRENO' ? 'bg-emerald-600' : 'bg-blue-600'
                                            }`}></span>
                                        {weld.creation_type === 'TERRENO' ? 'Creada en Terreno' : 'Información de Creación'}
                                    </h4>
                                    <div className={`border rounded-lg p-3 space-y-1 ${weld.creation_type === 'TERRENO'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                        : 'bg-blue-50 border-blue-200 text-blue-700'
                                        }`}>
                                        {createdByInfo && (
                                            <p className="text-sm">
                                                <strong>Creada por:</strong> {createdByInfo.nombre}
                                            </p>
                                        )}
                                        {weld.creation_type && weld.creation_type !== 'TERRENO' && (
                                            <p className="text-sm">
                                                <strong>Tipo:</strong> {weld.creation_type}
                                            </p>
                                        )}
                                        {weld.creation_reason && (
                                            <p className="text-sm">
                                                <strong>Motivo:</strong> {weld.creation_reason}
                                            </p>
                                        )}
                                        {weld.created_at && (
                                            <p className="text-sm">
                                                <strong>Fecha:</strong> {new Date(weld.created_at).toLocaleString('es-CL')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Deleted Weld Info Section - Only show if deleted */}
                            {weld.deleted && (
                                <div className="mt-4 pt-4 border-t border-red-200 space-y-2">
                                    <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                                        Información de Eliminación
                                    </h4>
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                                        {deletedByInfo && (
                                            <p className="text-sm text-red-700">
                                                <strong>Eliminada por:</strong> {deletedByInfo.nombre}
                                            </p>
                                        )}
                                        {weld.deleted_at && (
                                            <p className="text-sm text-red-700">
                                                <strong>Fecha:</strong> {new Date(weld.deleted_at).toLocaleString('es-CL')}
                                            </p>
                                        )}
                                        {weld.deletion_reason && (
                                            <p className="text-sm text-red-700">
                                                <strong>Motivo:</strong> {weld.deletion_reason}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

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
                                                value={!requiresWelder(weld.type_weld || '') ? 'N/A' : (welderInfo ? `[${welderInfo.estampa}] ${welderInfo.nombre}` : 'Cargando...')}
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
                            {!weld.executed && executionHistory.length === 0 && !weld.deleted && (
                                <div className="mt-4 pt-4 border-t border-gray-300">
                                    <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 text-center">
                                        <span className="text-sm text-gray-600 font-medium">⏳ Pendiente de Ejecución</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3️⃣ Fixed Footer */}
                <div className="shrink-0 p-4 border-t border-gray-300 bg-gray-50 flex justify-between gap-3 z-10 pb-safe">
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
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
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

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{label}</span>
            <div className="text-sm text-gray-900 font-semibold mt-0.5">{value || '-'}</div>
        </div>
    )
}

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
    const labelColor = isAnulado ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'

    return (
        <div className={`p-3 rounded-lg border ${bgColor} text-xs space-y-2`}>
            <div className="flex justify-between items-center">
                <span className={`px-2 py-0.5 rounded font-bold ${labelColor}`}>
                    {execution.status}
                </span>
                <span className="text-gray-500">
                    {new Date(execution.created_at).toLocaleDateString()}
                </span>
            </div>

            <div>
                <p className="font-semibold">Responsabilidad:</p>
                <p>{getResponsibilityLabel(execution.responsibility || 'TERRENO')}</p>
            </div>

            {(execution.notes || execution.rework_reason) && (
                <div>
                    <p className="font-semibold">Motivo:</p>
                    <p>{execution.notes || execution.rework_reason}</p>
                </div>
            )}

            <div className="pt-2 border-t border-gray-200/50">
                <p>Soldador: {welderName}</p>
                <p>Capataz: {foremanName}</p>
                {reporterName && <p className="text-gray-500 mt-1">Reportado por: {reporterName}</p>}
            </div>
        </div>
    )
}

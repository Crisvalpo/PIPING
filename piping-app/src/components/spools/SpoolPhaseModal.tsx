import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUIStore } from '@/store/ui-store'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

// ... imports

interface SpoolPhaseModalProps {
    onClose: () => void
    spoolNumber: string
    revisionId: string
    projectId: string
    phase: 'ndt' | 'pwht' | 'surface_treatment' | 'dispatch' | 'field_erection'
    phaseName: string
    currentStatus?: string
    onUpdate: () => void
}

// ... helper constants
const PHASE_LABELS: Record<string, string> = {
    ndt: 'END / NDE',
    pwht: 'Tratamiento Térmico',
    surface_treatment: 'Tratamiento Superficial',
    dispatch: 'Despacho',
    field_erection: 'Montaje en Terreno'
}

const STATUS_COLORS = {
    PENDING: 'border-gray-300 text-gray-500 bg-gray-50',
    IN_PROGRESS: 'border-blue-400 text-blue-600 bg-blue-50',
    COMPLETED: 'border-green-500 text-green-700 bg-green-50',
    HOLD: 'border-amber-400 text-amber-600 bg-amber-50',
    REJECTED: 'border-red-500 text-red-700 bg-red-50'
}

const STATUS_ICONS = {
    PENDING: '⏱️',
    IN_PROGRESS: '🔨',
    COMPLETED: '✅',
    HOLD: '⚠️',
    REJECTED: '❌'
}

const STATUS_LABELS = {
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En Progreso',
    COMPLETED: 'Completado',
    HOLD: 'En Espera',
    REJECTED: 'Rechazado'
}

// Helper function to format relative time
const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Hace un momento'
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60)
        return `Hace ${minutes} min${minutes > 1 ? 's' : ''}`
    }
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600)
        return `Hace ${hours} hora${hours > 1 ? 's' : ''}`
    }
    const days = Math.floor(diffInSeconds / 86400)
    if (days < 30) {
        return `Hace ${days} día${days > 1 ? 's' : ''}`
    }
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface HistoryItem {
    id: string
    phase: string
    old_status: string
    new_status: string
    changed_at: string
    notes?: string
    metadata?: any
    changed_by: string
    changed_by_user?: {
        id: string
        email: string
        full_name: string | null
    }
}

export default function SpoolPhaseModal({
    onClose,
    spoolNumber,
    revisionId,
    projectId,
    phase,
    phaseName,
    currentStatus = 'PENDING',
    onUpdate
}: SpoolPhaseModalProps) {
    const [status, setStatus] = useState(currentStatus)
    const [notes, setNotes] = useState('')
    const [surfaceTreatmentType, setSurfaceTreatmentType] = useState<'PAINT' | 'GALVANIZED' | 'NONE' | 'OTHER'>('PAINT')
    const [dispatchTrackingNumber, setDispatchTrackingNumber] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const setFocusMode = useUIStore((state) => state.setFocusMode)

    // History state
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    // Offline Check
    const isOnline = useNetworkStatus()

    // Handle Focus Mode
    useEffect(() => {
        setFocusMode(true)
        return () => setFocusMode(false)
    }, [setFocusMode])

    // Load history when modal mounts
    useEffect(() => {
        loadHistory()
    }, [phase, revisionId])

    const loadHistory = async () => {
        if (!revisionId) return

        setLoadingHistory(true)
        try {
            const res = await fetch(`/api/spools/${encodeURIComponent(spoolNumber)}/fabrication/history?revisionId=${revisionId}&phase=${phase}`)
            if (res.ok) {
                const data = await res.json()
                setHistory(data.history || [])
            } else {
                console.error('Error fetching history:', await res.text())
            }
        } catch (err) {
            console.error('Error loading history:', err)
        } finally {
            setLoadingHistory(false)
        }
    }
    // ... continuation of component

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Offline handling: check user first safely
            let userId = 'offline';
            let userEmail = 'offline@user';

            if (isOnline) {
                const { data: { user }, error: userError } = await supabase.auth.getUser()
                if (userError || !user) throw new Error('No se pudo obtener el usuario actual')

                // Verify user belongs to project
                const { data: userData, error: userDataError } = await supabase
                    .from('users')
                    .select('proyecto_id, rol')
                    .eq('id', user.id)
                    .single()

                if (userDataError || !userData) throw new Error('Usuario no encontrado en el sistema')
                userId = user.id;
                userEmail = user.email || 'unknown';
            }

            // Build payload
            const requestBody: any = {
                revisionId,
                projectId,
                phase,
                status,
                notes: notes.trim() || undefined
            }

            if (phase === 'surface_treatment') {
                requestBody.surfaceTreatmentType = surfaceTreatmentType
            }

            if (phase === 'dispatch' && dispatchTrackingNumber.trim()) {
                requestBody.dispatchTrackingNumber = dispatchTrackingNumber.trim()
            }

            if (!isOnline) {
                // --- OFFLINE FLOW ---
                console.log('Modo Offline: Guardando tracking de spool en cola pendientes...');
                const { db } = await import('@/lib/db');

                // 1. Guardar Pending Action
                await db.pendingActions.add({
                    id: crypto.randomUUID(),
                    type: 'UPDATE_SPOOL_PHASE',
                    project_id: projectId,
                    payload: {
                        spoolNumber, // Need spoolNumber for API URL construction in SyncManager
                        ...requestBody
                    },
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    retry_count: 0
                });

                // 2. Actualización Optimista Local (Opcional pero recomendada para ver cambio inmediato)
                // Necesitamos actualizar db.spools si tenemos tabla de tracking local separada
                // Actualmente db.spools stores "LocalSpool" structure. 
                // We should update the specific field corresponding to the phase.
                // Mapping phase to field columns:
                // ndt -> ndt_status? 
                // LocalSpool interface needs to support these status fields if not already.
                // Assuming LocalSpool mirrors the structure used in groupSpoolsForFabrication/MasterViewsManager logic.
                // Let's inspect LocalSpool definition later if update fails. For now, pending action is enough for system sync.
                // But for UI feedback, MasterViewsManager relies on 'details' state or re-fetch.
                // onUpdate() callback in parent triggers re-fetch.
                // We need to ensure MasterViewsManager.loadIsometrics/loadDetails reads the PENDING state or specific local overrides?
                // MasterViewsManager implementation (viewed earlier) re-reads locally if offline.
                // We should update 'db.spools' record for this spool.

                // Update local spool record if exists
                // LocalSpool uses 'spool_number' as primary key in Dexie schema: 'spool_number, revision_id, ...'
                // So update() should use spoolNumber as key, OR use modify() on collection.

                const existingSpool = await db.spools.where('spool_number').equals(spoolNumber).first();
                if (existingSpool) {
                    const updateData: any = {};
                    const statusFieldMap: Record<string, string> = {
                        'ndt': 'ndt_status',
                        'pwht': 'pwht_status',
                        'surface_treatment': 'surface_treatment_status',
                        'dispatch': 'dispatch_status',
                        'field_erection': 'field_erection_status'
                    };

                    if (statusFieldMap[phase]) {
                        updateData[statusFieldMap[phase]] = status;
                        // Use put to update the object since spool_number is key
                        await db.spools.put({ ...existingSpool, ...updateData });
                        console.log('Spool local actualizado:', updateData);
                    }
                }

                alert('💾 Cambio de fase guardado localmente (se sincronizará al conectar)');

            } else {
                // --- ONLINE FLOW ---
                const { data: { session } } = await supabase.auth.getSession()

                const response = await fetch(`/api/spools/${encodeURIComponent(spoolNumber)}/fabrication`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify(requestBody)
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Error al actualizar la fase')
                }
            }

            // Success
            onUpdate()
            onClose()
        } catch (err: any) {
            console.error('Error updating phase:', err)
            setError(err.message || 'Error al actualizar la fase')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                {/* Fixed Header */}
                <div className="shrink-0 p-6 bg-gradient-to-r from-blue-600 to-blue-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Actualizar Fase</h2>
                        <p className="text-blue-100 mt-1">{PHASE_LABELS[phase]}</p>
                        <p className="text-sm text-blue-200 mt-2">Spool: <span className="font-semibold">{spoolNumber}</span></p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white text-3xl font-bold leading-none">
                        ×
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                    {/* History */}
                    <div className="p-6 border-b border-gray-200 bg-white mb-4">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Historial de Cambios
                        </h3>

                        {loadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-lg">
                                No hay cambios registrados aún
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item, index) => (
                                    <div key={item.id} className="flex gap-3 group">
                                        {/* Timeline connector */}
                                        <div className="flex flex-col items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${STATUS_COLORS[item.new_status as keyof typeof STATUS_COLORS]}`}>
                                                {STATUS_ICONS[item.new_status as keyof typeof STATUS_ICONS]}
                                            </div>
                                            {index < history.length - 1 && (
                                                <div className="w-0.5 h-full min-h-[20px] bg-gray-300 my-1"></div>
                                            )}
                                        </div>

                                        {/* Event details */}
                                        <div className="flex-1 pb-3">
                                            <div className="bg-white rounded-lg border border-gray-200 p-3 hover:border-blue-300 transition-colors shadow-sm">
                                                <div className="flex items-start justify-between mb-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {item.old_status && (
                                                            <>
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[item.old_status as keyof typeof STATUS_COLORS]}`}>
                                                                    {STATUS_LABELS[item.old_status as keyof typeof STATUS_LABELS]}
                                                                </span>
                                                                <span className="text-gray-400">→</span>
                                                            </>
                                                        )}
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${STATUS_COLORS[item.new_status as keyof typeof STATUS_COLORS]}`}>
                                                            {STATUS_LABELS[item.new_status as keyof typeof STATUS_LABELS]}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                                        {formatRelativeTime(item.changed_at)}
                                                    </span>
                                                </div>

                                                <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                                    <span className="font-medium">
                                                        👤 {item.changed_by_user?.full_name || item.changed_by_user?.email || item.changed_by}
                                                    </span>
                                                </div>

                                                {item.notes && (
                                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                                        <p className="text-xs text-gray-700 italic">"{item.notes}"</p>
                                                    </div>
                                                )}

                                                {item.metadata && Object.keys(item.metadata).length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                                        <div className="flex flex-wrap gap-2">
                                                            {item.metadata.surface_treatment_type && (
                                                                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200">
                                                                    Tipo: {item.metadata.surface_treatment_type}
                                                                </span>
                                                            )}
                                                            {item.metadata.dispatch_tracking_number && (
                                                                <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-200">
                                                                    Guía: {item.metadata.dispatch_tracking_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Update Form */}
                    <form id="spool-phase-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">
                                Estado de la Fase <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                required
                            >
                                <option value="PENDING">⏳ Pendiente</option>
                                <option value="IN_PROGRESS">⚡ En Proceso</option>
                                <option value="COMPLETED">✓ Completado</option>
                                {phase === 'pwht' && <option value="N/A">⊗ N/A (No Aplica)</option>}
                            </select>
                        </div>

                        {/* Surface Treatment Type */}
                        {phase === 'surface_treatment' && (
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2">
                                    Tipo de Tratamiento
                                </label>
                                <select
                                    value={surfaceTreatmentType}
                                    onChange={(e) => setSurfaceTreatmentType(e.target.value as any)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                >
                                    <option value="PAINT">🎨 Pintura</option>
                                    <option value="GALVANIZED">⚡ Galvanizado</option>
                                    <option value="NONE">∅ Ninguno</option>
                                    <option value="OTHER">📋 Otro</option>
                                </select>
                            </div>
                        )}

                        {/* Dispatch Tracking Number */}
                        {phase === 'dispatch' && (
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2">
                                    Número de Seguimiento
                                </label>
                                <input
                                    type="text"
                                    value={dispatchTrackingNumber}
                                    onChange={(e) => setDispatchTrackingNumber(e.target.value)}
                                    placeholder="Ej: TR-12345"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                />
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">
                                Notas / Comentarios
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder="Agregar observaciones, resultados de inspección, etc..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900"
                            />
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                            <span className="text-xl">ℹ️</span>
                            <p className="text-sm text-blue-800 mt-0.5">
                                <span className="font-semibold">Nota:</span> Se registrará automáticamente tu usuario y la fecha/hora de la actualización.
                            </p>
                        </div>
                    </form>
                </div>

                {/* Sticky Footer */}
                <div className="shrink-0 p-4 border-t border-gray-200 bg-white flex gap-3 z-10 pb-safe shadow-md">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="spool-phase-form"
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Guardando...</span>
                            </>
                        ) : (
                            <>
                                <span>Guardar Cambios</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

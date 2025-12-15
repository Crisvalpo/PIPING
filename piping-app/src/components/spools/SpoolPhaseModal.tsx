import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SpoolPhaseModalProps {
    isOpen: boolean
    onClose: () => void
    spoolNumber: string
    revisionId: string
    projectId: string
    phase: 'ndt' | 'pwht' | 'surface_treatment' | 'dispatch' | 'field_erection'
    phaseName: string
    currentStatus?: string
    onUpdate: () => void
}

interface HistoryItem {
    id: string
    phase: string
    old_status: string | null
    new_status: string
    changed_at: string
    notes: string | null
    metadata: any
    changed_by_user: {
        id: string
        email: string
        full_name: string | null
    }
}

const PHASE_LABELS = {
    ndt: 'END/NDE - Ensayos No Destructivos',
    pwht: 'PWHT - Tratamiento Térmico Post-Soldadura',
    surface_treatment: 'Tratamiento Superficial',
    dispatch: 'Despacho y Logística',
    field_erection: 'Montaje en Campo'
}

const STATUS_LABELS = {
    'PENDING': 'Pendiente',
    'IN_PROGRESS': 'En Proceso',
    'COMPLETED': 'Completado',
    'N/A': 'N/A'
}

const STATUS_ICONS = {
    'PENDING': '⏳',
    'IN_PROGRESS': '⚡',
    'COMPLETED': '✓',
    'N/A': '—'
}

const STATUS_COLORS = {
    'PENDING': 'bg-gray-100 text-gray-700 border-gray-200',
    'IN_PROGRESS': 'bg-amber-100 text-amber-700 border-amber-200',
    'COMPLETED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'N/A': 'bg-gray-50 text-gray-500 border-gray-200'
}

export default function SpoolPhaseModal({
    isOpen,
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

    // History state
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    // Load history when modal opens
    useEffect(() => {
        if (isOpen) {
            loadHistory()
        }
    }, [isOpen, phase, revisionId])

    const loadHistory = async () => {
        setLoadingHistory(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const response = await fetch(
                `/api/spools/${encodeURIComponent(spoolNumber)}/fabrication/history?revisionId=${revisionId}&phase=${phase}`,
                {
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`
                    }
                }
            )

            if (response.ok) {
                const data = await response.json()
                setHistory(data.history || [])
            }
        } catch (err) {
            console.error('Error loading history:', err)
        } finally {
            setLoadingHistory(false)
        }
    }

    const formatRelativeTime = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 1) return 'hace un momento'
        if (diffMins < 60) return `hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`
        if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
        if (diffDays < 7) return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) {
                throw new Error('No se pudo obtener el usuario actual')
            }

            // Verify user belongs to project
            const { data: userData, error: userDataError } = await supabase
                .from('users')
                .select('proyecto_id, rol')
                .eq('id', user.id)
                .single()

            if (userDataError || !userData) {
                throw new Error('Usuario no encontrado en el sistema')
            }

            // Build request body
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

            // Get current session for token
            const { data: { session } } = await supabase.auth.getSession()

            // Call API to update phase
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl">
                    <h2 className="text-2xl font-bold text-white">Actualizar Fase</h2>
                    <p className="text-blue-100 mt-1">{PHASE_LABELS[phase]}</p>
                    <p className="text-sm text-blue-200 mt-2">Spool: <span className="font-semibold">{spoolNumber}</span></p>
                </div>

                {/* History Timeline */}
                <div className="border-b border-gray-200 bg-gray-50 p-6">
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
                        <div className="text-center py-6 text-sm text-gray-500">
                            No hay cambios registrados aún
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto">
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
                                        <div className="bg-white rounded-lg border border-gray-200 p-3 group-hover:border-blue-300 transition-colors">
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="flex items-center gap-2">
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
                                                <span className="text-xs text-gray-500">
                                                    {formatRelativeTime(item.changed_at)}
                                                </span>
                                            </div>

                                            <div className="text-xs text-gray-600 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                </svg>
                                                <span className="font-medium">
                                                    {item.changed_by_user.full_name || item.changed_by_user.email}
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

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Estado de la Fase *
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Tratamiento
                            </label>
                            <select
                                value={surfaceTreatmentType}
                                onChange={(e) => setSurfaceTreatmentType(e.target.value as any)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Número de Seguimiento
                            </label>
                            <input
                                type="text"
                                value={dispatchTrackingNumber}
                                onChange={(e) => setDispatchTrackingNumber(e.target.value)}
                                placeholder="Ej: TR-12345"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notas / Comentarios
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            placeholder="Agregar observaciones, resultados de inspección, etc..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900"
                        />
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                            <span className="font-semibold">ℹ️ Nota:</span> Se registrará automáticamente tu usuario y la fecha/hora de la actualización.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SpoolPhaseModalProps {
    isOpen: boolean
    onClose: () => void
    spoolNumber: string
    revisionId: string
    phase: 'ndt' | 'pwht' | 'surface_treatment' | 'dispatch' | 'field_erection'
    phaseName: string
    currentStatus?: string
    onUpdate: () => void
}

const PHASE_LABELS = {
    ndt: 'END/NDE - Ensayos No Destructivos',
    pwht: 'PWHT - Tratamiento Térmico Post-Soldadura',
    surface_treatment: 'Tratamiento Superficial',
    dispatch: 'Despacho y Logística',
    field_erection: 'Montaje en Campo'
}

export default function SpoolPhaseModal({
    isOpen,
    onClose,
    spoolNumber,
    revisionId,
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

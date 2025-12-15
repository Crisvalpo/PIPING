import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SpoolInfoModalProps {
    isOpen: boolean
    onClose: () => void
    spoolNumber: string
    revisionId: string
    currentLength?: number
    currentWeight?: number
    onUpdate: () => void
}

export default function SpoolInfoModal({
    isOpen,
    onClose,
    spoolNumber,
    revisionId,
    currentLength,
    currentWeight,
    onUpdate
}: SpoolInfoModalProps) {
    const [lengthMeters, setLengthMeters] = useState(currentLength?.toString() || '')
    const [weightKg, setWeightKg] = useState(currentWeight?.toString() || '')
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
                revisionId
            }

            if (lengthMeters.trim()) {
                const parsedLength = parseFloat(lengthMeters)
                if (isNaN(parsedLength) || parsedLength <= 0) {
                    throw new Error('El largo debe ser un número positivo')
                }
                requestBody.lengthMeters = parsedLength
            }

            if (weightKg.trim()) {
                const parsedWeight = parseFloat(weightKg)
                if (isNaN(parsedWeight) || parsedWeight <= 0) {
                    throw new Error('El peso debe ser un número positivo')
                }
                requestBody.weightKg = parsedWeight
            }

            if (!requestBody.lengthMeters && !requestBody.weightKg) {
                throw new Error('Debes ingresar al menos el largo o el peso')
            }

            // Get current session for token
            const { data: { session } } = await supabase.auth.getSession()

            // Call API to update spool info
            const response = await fetch(`/api/spools/${encodeURIComponent(spoolNumber)}/request-info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error al actualizar información del spool')
            }

            // Success
            onUpdate()
            onClose()
        } catch (err: any) {
            console.error('Error updating spool info:', err)
            setError(err.message || 'Error al actualizar información')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 rounded-t-xl">
                    <h2 className="text-2xl font-bold text-white">Información del Spool</h2>
                    <p className="text-sm text-emerald-100 mt-2">Spool: <span className="font-semibold">{spoolNumber}</span></p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Length */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📏 Largo (metros)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={lengthMeters}
                            onChange={(e) => setLengthMeters(e.target.value)}
                            placeholder="Ej: 12.5"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                        />
                        <p className="text-xs text-gray-500 mt-1">Longitud total del spool en metros</p>
                    </div>

                    {/* Weight */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ⚖️ Peso (kilogramos)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={weightKg}
                            onChange={(e) => setWeightKg(e.target.value)}
                            placeholder="Ej: 450.5"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                        />
                        <p className="text-xs text-gray-500 mt-1">Peso estimado o medido en kg</p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <p className="text-sm text-emerald-800">
                            <span className="font-semibold">ℹ️ Nota:</span> Se registrará que solicitaste esta información el {new Date().toLocaleDateString('es-CL')}.
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
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

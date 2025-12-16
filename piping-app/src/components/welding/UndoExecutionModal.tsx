import { useState, useEffect } from 'react'
import { useUIStore } from '@/store/ui-store'

interface UndoExecutionModalProps {
    weld: any
    onClose: () => void
    onSubmit: (reason: string) => Promise<void>
}

export default function UndoExecutionModal({ weld, onClose, onSubmit }: UndoExecutionModalProps) {
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const setFocusMode = useUIStore((state) => state.setFocusMode)

    // Handle Focus Mode
    useEffect(() => {
        setFocusMode(true)
        return () => setFocusMode(false)
    }, [setFocusMode])

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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* 1. Header */}
                <div className="shrink-0 p-4 border-b border-gray-300 bg-gradient-to-r from-amber-50 to-yellow-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                        </svg>
                        Deshacer Reporte
                    </h3>
                    <p className="text-sm text-gray-700 font-medium">{weld.weld_number}</p>
                </div>

                {/* 2. Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
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

                {/* 3. Sticky Footer */}
                <div className="shrink-0 p-6 border-t border-gray-200 flex gap-3 bg-white pb-safe z-10">
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

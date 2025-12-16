import { useState, useEffect } from 'react'
import { useUIStore } from '@/store/ui-store'

interface DeleteWeldModalProps {
    weld: any
    onClose: () => void
    onSubmit: (reason: string) => Promise<void>
}

export default function DeleteWeldModal({ weld, onClose, onSubmit }: DeleteWeldModalProps) {
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                {/* Fixed Header */}
                <div className="shrink-0 p-4 border-b border-gray-300 bg-gradient-to-r from-red-50 to-rose-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Eliminar Unión</h3>
                            <p className="text-sm text-gray-700 font-medium">{weld.weld_number}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-700 hover:text-gray-900 text-2xl font-bold">
                        ×
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Warning */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <p className="text-sm font-bold text-yellow-800 mb-1">Confirmación de Eliminación</p>
                            <p className="text-sm text-yellow-800">
                                La unión será marcada como eliminada pero no se borrará permanentemente de la base de datos.
                                El historial de ejecuciones se conservará y podrás restaurarla si fue un error.
                            </p>
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                            Motivo de eliminación <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Describe por qué se elimina esta unión..."
                            rows={4}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Sticky Footer */}
                <div className="shrink-0 p-4 border-t border-gray-300 bg-gray-50 flex gap-3 z-10 pb-safe">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !reason.trim()}
                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                        {submitting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Eliminar Unión</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

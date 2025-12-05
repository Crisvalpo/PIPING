'use client'

import { useState } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'

interface DeleteConfirmModalProps {
    worker: {
        rut: string
        nombre: string
    }
    onClose: () => void
    onSuccess: () => void
}

export default function DeleteConfirmModal({ worker, onClose, onSuccess }: DeleteConfirmModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleDelete = async () => {
        setLoading(true)
        setError('')

        try {
            const res = await fetch(`/api/personal/${encodeURIComponent(worker.rut)}`, {
                method: 'DELETE'
            })

            const data = await res.json()

            if (data.success) {
                onSuccess()
                onClose()
            } else {
                setError(data.error || 'Error al eliminar')
            }
        } catch (err) {
            setError('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>

                {/* Header */}
                <div className="relative p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Eliminar Trabajador</h3>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="relative p-6 space-y-4">
                    <p className="text-white/80">
                        ¿Estás seguro que deseas eliminar a <span className="font-bold text-white">{worker.nombre}</span>?
                    </p>

                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <p className="text-sm text-red-300 font-medium mb-2">⚠️ Esta acción no se puede deshacer</p>
                        <p className="text-xs text-red-200/80">
                            Se eliminará permanentemente el registro con RUT <span className="font-mono font-bold">{worker.rut}</span>.
                            Si necesitas volver a agregarlo, deberás importarlo nuevamente.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

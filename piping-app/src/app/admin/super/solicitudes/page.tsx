'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPendingSolicitudes, approveSolicitud, rejectSolicitud, SolicitudAcceso } from '@/services/solicitudes'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function SolicitudesPage() {
    const router = useRouter()
    const [solicitudes, setSolicitudes] = useState<SolicitudAcceso[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        loadSolicitudes()
    }, [])

    async function loadSolicitudes() {
        setLoading(true)
        const data = await getPendingSolicitudes()
        setSolicitudes(data)
        setLoading(false)
    }

    const handleApprove = async (id: string) => {
        setProcessingId(id)
        setMessage(null)
        const result = await approveSolicitud(id)

        if (result.success) {
            setMessage({ type: 'success', text: result.message! })
            // Recargar lista
            setSolicitudes(prev => prev.filter(s => s.id !== id))
        } else {
            setMessage({ type: 'error', text: result.message! })
        }
        setProcessingId(null)
    }

    const handleReject = async (id: string) => {
        if (!confirm('¿Estás seguro de rechazar esta solicitud?')) return

        setProcessingId(id)
        setMessage(null)
        const result = await rejectSolicitud(id)

        if (result.success) {
            setMessage({ type: 'success', text: result.message! })
            setSolicitudes(prev => prev.filter(s => s.id !== id))
        } else {
            setMessage({ type: 'error', text: result.message! })
        }
        setProcessingId(null)
    }

    return (
        <ProtectedRoute requireSuperAdmin>
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Solicitudes de Acceso</h1>
                            <p className="text-gray-500 mt-1">Gestiona las peticiones de usuarios para unirse a empresas existentes</p>
                        </div>
                        <button
                            onClick={() => router.push('/admin/super')}
                            className="px-4 py-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            ← Volver al Panel
                        </button>
                    </div>

                    {/* Mensajes */}
                    {message && (
                        <div className={`mb-6 p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            <span className="mr-2 text-xl">{message.type === 'success' ? '✅' : '❌'}</span>
                            {message.text}
                        </div>
                    )}

                    {/* Lista */}
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : solicitudes.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                            <div className="text-6xl mb-4">📭</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No hay solicitudes pendientes</h3>
                            <p className="text-gray-500">Todo está al día. ¡Buen trabajo!</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {solicitudes.map((solicitud) => (
                                <div key={solicitud.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition-shadow">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                                Solicitud de Ingreso
                                            </span>
                                            <span className="text-sm text-gray-400">
                                                {new Date(solicitud.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    {solicitud.usuario?.nombre || 'Usuario Desconocido'}
                                                </h3>
                                                <p className="text-gray-500 text-sm mb-1">
                                                    {solicitud.usuario?.correo}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-gray-600 text-sm">Quiere unirse a:</span>
                                                    <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                                        🏢 {solicitud.empresa?.nombre}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <button
                                            onClick={() => handleReject(solicitud.id)}
                                            disabled={!!processingId}
                                            className="flex-1 md:flex-none px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                        >
                                            Rechazar
                                        </button>
                                        <button
                                            onClick={() => handleApprove(solicitud.id)}
                                            disabled={!!processingId}
                                            className="flex-1 md:flex-none px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {processingId === solicitud.id ? (
                                                <>
                                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                    Procesando...
                                                </>
                                            ) : (
                                                'Aprobar Acceso'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    )
}

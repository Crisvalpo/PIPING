'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/services/auth'
import { getPendingSolicitudes, approveSolicitud, rejectSolicitud, type SolicitudAcceso } from '@/services/solicitudes'
import ProtectedRoute from '@/components/ProtectedRoute'

function SolicitudesContent() {
    const router = useRouter()
    const [solicitudes, setSolicitudes] = useState<SolicitudAcceso[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        const data = await getPendingSolicitudes()
        setSolicitudes(data)
        setLoading(false)
    }

    async function handleApprove(solicitudId: string) {
        if (!confirm('¿Aprobar esta solicitud de acceso?')) return

        setProcessing(solicitudId)
        const result = await approveSolicitud(solicitudId)

        if (result.success) {
            alert('✅ ' + result.message)
            await loadData()
        } else {
            alert('❌ ' + result.message)
        }

        setProcessing(null)
    }

    async function handleReject(solicitudId: string) {
        if (!confirm('¿Rechazar esta solicitud de acceso?')) return

        setProcessing(solicitudId)
        const result = await rejectSolicitud(solicitudId)

        if (result.success) {
            alert('Solicitud rechazada')
            await loadData()
        } else {
            alert('Error: ' + result.message)
        }

        setProcessing(null)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4">
            <div className="max-w-6xl mx-auto py-12">
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <button
                            onClick={() => router.push('/admin/proyecto')}
                            className="text-purple-200 hover:text-white mb-4 flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Volver
                        </button>
                        <h1 className="text-4xl font-bold text-white mb-2">Solicitudes de Acceso</h1>
                        <p className="text-purple-200">Gestiona las solicitudes de usuarios que quieren unirse a tu empresa</p>
                    </div>

                    {/* Lista de Solicitudes */}
                    <div className="space-y-4">
                        {solicitudes.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                                <svg className="w-16 h-16 text-purple-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-purple-200 text-lg">No hay solicitudes pendientes</p>
                            </div>
                        ) : (
                            solicitudes.map((solicitud) => (
                                <div
                                    key={solicitud.id}
                                    className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        {/* Info del Usuario */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                                    <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-semibold text-white">{solicitud.usuario.nombre}</h3>
                                                    <p className="text-purple-200 text-sm">{solicitud.usuario.correo}</p>
                                                </div>
                                            </div>

                                            <div className="mt-3 space-y-1">
                                                <p className="text-sm text-purple-300">
                                                    <strong>Empresa:</strong> {solicitud.empresa.nombre}
                                                </p>
                                                <p className="text-sm text-purple-300">
                                                    <strong>Fecha:</strong> {new Date(solicitud.created_at).toLocaleDateString('es-ES', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                                {solicitud.mensaje && (
                                                    <p className="text-sm text-purple-300 mt-2">
                                                        <strong>Mensaje:</strong> {solicitud.mensaje}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Acciones */}
                                        <div className="flex flex-col gap-2 md:w-48">
                                            <button
                                                onClick={() => handleApprove(solicitud.id)}
                                                disabled={processing === solicitud.id}
                                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {processing === solicitud.id ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Aprobar
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                onClick={() => handleReject(solicitud.id)}
                                                disabled={processing === solicitud.id}
                                                className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Rechazar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function SolicitudesPage() {
    return (
        <ProtectedRoute requireAuth requireActive requireAdmin>
            <SolicitudesContent />
        </ProtectedRoute>
    )
}

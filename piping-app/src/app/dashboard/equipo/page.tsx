'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/services/auth'
import { createInvitacion } from '@/services/invitaciones'
import ProtectedRoute from '@/components/ProtectedRoute'
import type { User } from '@/types'

export default function GestionEquipoPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteLink, setInviteLink] = useState<string | null>(null)
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        async function load() {
            const user = await getCurrentUser()
            setCurrentUser(user)
            setLoading(false)
        }
        load()
    }, [])

    async function handleInvite() {
        if (!currentUser || !inviteEmail) return

        setProcessing(true)

        // Si es Admin de Proyecto, el proyecto ID es fijo
        // Si es Admin de Empresa, idealmente debería poder elegir, pero por simplicidad inicial
        // usaremos el proyecto actual si tiene uno, o requeriremos lógica extra.
        // Asumiremos el flujo de Admin de Proyecto por ahora.

        const empresaId = currentUser.empresa_id
        const proyectoId = currentUser.proyecto_id

        if (!empresaId || !proyectoId) {
            alert('Error: No tienes una empresa o proyecto asignado para invitar usuarios.')
            setProcessing(false)
            return
        }

        const result = await createInvitacion(inviteEmail, empresaId, 'USUARIO', proyectoId)

        if (result.success && result.data) {
            setInviteLink(result.data.link)
        } else {
            alert('Error: ' + result.message)
        }
        setProcessing(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
        )
    }

    return (
        <ProtectedRoute requireAuth requireActive>
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-slate-900 p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Gestión de Equipo</h1>
                        <p className="text-gray-400">Invita a nuevos miembros a tu proyecto.</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                                <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Invitar Nuevo Usuario</h2>
                                <p className="text-sm text-gray-400">
                                    El usuario será agregado al proyecto <strong>{currentUser?.proyecto?.nombre || 'Actual'}</strong>
                                </p>
                            </div>
                        </div>

                        {inviteLink ? (
                            <div className="bg-green-500/20 border border-green-500/30 p-6 rounded-xl animate-fade-in">
                                <h3 className="text-green-300 font-bold mb-2">¡Enlace Generado!</h3>
                                <p className="text-sm text-gray-300 mb-4">Comparte este enlace con el nuevo miembro del equipo:</p>

                                <div className="flex items-center gap-2 bg-black/30 p-3 rounded-lg border border-white/10 mb-4">
                                    <code className="text-sm text-blue-300 break-all flex-1">{inviteLink}</code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(inviteLink)
                                            alert('Copiado!')
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                        title="Copiar"
                                    >
                                        📋
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        setInviteLink(null)
                                        setInviteEmail('')
                                    }}
                                    className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                                >
                                    Generar otra invitación
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="ejemplo@correo.com"
                                        className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <button
                                    onClick={handleInvite}
                                    disabled={!inviteEmail || processing}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Generando...
                                        </>
                                    ) : (
                                        'Generar Invitación'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}

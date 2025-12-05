'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/services/auth'
import { searchEmpresas, requestAccessToEmpresa, hasPendingRequest } from '@/services/empresas'
import type { User, Empresa } from '@/types'

export default function OnboardingPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    // Estados para búsqueda
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Empresa[]>([])
    const [searching, setSearching] = useState(false)
    const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null)
    const [hasPending, setHasPending] = useState(false)

    useEffect(() => {
        async function loadUser() {
            const user = await getCurrentUser()

            if (!user) {
                router.push('/login')
                return
            }

            if (user.proyecto_id) {
                router.push('/dashboard')
                return
            }

            if (user.estado_usuario !== 'PENDIENTE') {
                router.push('/dashboard')
                return
            }

            setCurrentUser(user)
            setLoading(false)
        }

        loadUser()
    }, [router])

    // Buscar empresas
    const handleSearch = async (query: string) => {
        setSearchQuery(query)
        if (query.length < 2) {
            setSearchResults([])
            return
        }

        setSearching(true)
        try {
            const results = await searchEmpresas(query)
            setSearchResults(results)
        } catch (error) {
            console.error(error)
        } finally {
            setSearching(false)
        }
    }

    // Manejar selección de empresa
    const handleSelectEmpresa = async (empresa: Empresa) => {
        setSelectedEmpresa(empresa)
        // Verificar si ya tiene solicitud pendiente
        const pending = await hasPendingRequest(empresa.id!)
        setHasPending(pending)
    }

    // Solicitar acceso
    const handleRequestAccess = async () => {
        if (!selectedEmpresa) return

        setSubmitting(true)
        try {
            const result = await requestAccessToEmpresa(selectedEmpresa.id!)
            if (result.success) {
                setSuccessMessage(result.message || 'Solicitud enviada')
                setHasPending(true)
            } else {
                setError(result.message || 'Error al enviar solicitud')
                setSubmitting(false)
            }
        } catch (error) {
            setError('Error inesperado')
            setSubmitting(false)
        }
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
            <div className="max-w-3xl mx-auto py-12">
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-white mb-2">Bienvenido, {currentUser?.nombre}!</h1>
                        <p className="text-purple-200">
                            Busca tu empresa para solicitar acceso a los proyectos.
                        </p>
                    </div>

                    {/* BUSCADOR Y SOLICITUD */}
                    <div className="space-y-6">

                        {successMessage ? (
                            <div className="bg-green-500/20 border border-green-500/50 p-6 rounded-xl text-center animate-fade-in">
                                <div className="text-5xl mb-4">✅</div>
                                <h3 className="text-2xl font-bold text-white mb-2">¡Solicitud Enviada!</h3>
                                <p className="text-green-200">{successMessage}</p>
                                <p className="text-sm text-gray-400 mt-4">Te notificaremos cuando sea aprobada.</p>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-purple-100 mb-2">Buscar Empresa</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            placeholder="Escribe el nombre de tu empresa..."
                                            className="w-full px-4 py-4 pl-12 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-purple-300/50"
                                        />
                                        <svg className="w-6 h-6 text-purple-300 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {searching && <p className="text-purple-300 text-sm text-center">Buscando...</p>}

                                    {searchResults.map(empresa => (
                                        <div
                                            key={empresa.id}
                                            onClick={() => handleSelectEmpresa(empresa)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center group ${selectedEmpresa?.id === empresa.id
                                                ? 'bg-purple-500/30 border-purple-400 shadow-lg shadow-purple-500/20'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30'
                                                }`}
                                        >
                                            <div>
                                                <h4 className="font-bold text-white text-lg">{empresa.nombre}</h4>
                                                {empresa.descripcion && <p className="text-sm text-gray-400">{empresa.descripcion}</p>}
                                            </div>
                                            {selectedEmpresa?.id === empresa.id && (
                                                <div className="bg-purple-500 text-white p-1 rounded-full">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {searchQuery.length > 2 && searchResults.length === 0 && !searching && (
                                        <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10 border-dashed">
                                            <p className="text-gray-300 mb-2">No encontramos empresas con ese nombre.</p>
                                            <p className="text-sm text-purple-300">
                                                ¿Tu empresa es nueva en LukeAPP? <br />
                                                Contacta a administración para darla de alta.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {selectedEmpresa && (
                                    <div className="mt-6 pt-6 border-t border-white/10 animate-fade-in-up">
                                        {hasPending ? (
                                            <div className="bg-yellow-500/20 border border-yellow-500/50 p-6 rounded-xl text-center">
                                                <div className="text-5xl mb-4">⏳</div>
                                                <h3 className="text-2xl font-bold text-white mb-2">Solicitud Pendiente</h3>
                                                <p className="text-yellow-200">
                                                    Ya tienes una solicitud pendiente para <strong>{selectedEmpresa.nombre}</strong>.
                                                </p>
                                                <p className="text-sm text-gray-400 mt-4">
                                                    Los administradores la revisarán pronto. Te notificaremos cuando sea aprobada.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl mb-4">
                                                    <p className="text-blue-200 text-sm">
                                                        ℹ️ Al enviar esta solicitud, los administradores de <strong>{selectedEmpresa.nombre}</strong> recibirán una notificación para aprobar tu acceso.
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleRequestAccess}
                                                    disabled={submitting}
                                                    className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-purple-500/40 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {submitting ? (
                                                        <span className="flex items-center justify-center gap-2">
                                                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                                            Enviando solicitud...
                                                        </span>
                                                    ) : (
                                                        'Enviar Solicitud de Acceso'
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="mt-8 text-center border-t border-white/10 pt-6">
                        <p className="text-xs text-gray-400">
                            ¿Necesitas registrar una nueva empresa? <br />
                            <a href="mailto:soporte@lukeapp.com" className="text-purple-300 hover:text-white underline">Contacta a Soporte</a>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    )
}

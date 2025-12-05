'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut } from '@/services/auth'
import type { User } from '@/types'

export default function PendientePage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadUser() {
            const user = await getCurrentUser()

            if (!user) {
                router.push('/login')
                return
            }

            // Si ya está activo, redirigir al dashboard
            // (El dashboard manejará si tiene proyecto o no)
            if (user.estado_usuario === 'ACTIVO') {
                router.push('/dashboard')
                return
            }

            setCurrentUser(user)
            setLoading(false)
        }

        loadUser()
    }, [router])

    const handleLogout = async () => {
        await signOut()
        router.push('/')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
            </div>
        )
    }

    const isRejected = currentUser?.estado_usuario === 'RECHAZADO'

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8 text-center">
                    {/* Icono */}
                    <div className={`inline-block p-6 rounded-full mb-6 ${isRejected
                        ? 'bg-red-500/20'
                        : 'bg-yellow-500/20'
                        }`}>
                        {isRejected ? (
                            <svg className="w-16 h-16 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-16 h-16 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </div>

                    {/* Título */}
                    <h1 className="text-4xl font-bold text-white mb-4">
                        {isRejected ? 'Solicitud Rechazada' : 'Esperando Aprobación'}
                    </h1>

                    {/* Mensaje */}
                    <div className="mb-8">
                        {isRejected ? (
                            <div className="space-y-4">
                                <p className="text-lg text-purple-200">
                                    Lo sentimos, tu solicitud de acceso ha sido rechazada.
                                </p>
                                <p className="text-purple-300">
                                    Si crees que esto es un error, por favor contacta al administrador del sistema.
                                </p>
                                <div className="bg-blue-500/20 border border-blue-400/50 text-blue-200 px-4 py-3 rounded-xl mt-6">
                                    <p className="text-sm">
                                        💡 Puedes volver a solicitar acceso creando una nueva cuenta o contactando a un administrador para que te envíe una invitación.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-lg text-purple-200">
                                    Tu cuenta ha sido creada exitosamente, pero está pendiente de aprobación.
                                </p>
                                <p className="text-purple-300">
                                    Un administrador revisará tu solicitud y te asignará a un proyecto pronto.
                                </p>

                                {/* Info del usuario */}
                                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-6 text-left">
                                    <h3 className="text-white font-semibold mb-4">Información de tu cuenta:</h3>
                                    <div className="space-y-2 text-purple-200">
                                        <p><strong className="text-white">Nombre:</strong> {currentUser?.nombre}</p>
                                        <p><strong className="text-white">Email:</strong> {currentUser?.correo}</p>
                                        <p><strong className="text-white">Teléfono:</strong> {currentUser?.telefono}</p>
                                        <p><strong className="text-white">Estado:</strong>
                                            <span className="ml-2 px-3 py-1 bg-yellow-500/20 border border-yellow-400/50 text-yellow-200 rounded-lg text-sm">
                                                PENDIENTE
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-blue-500/20 border border-blue-400/50 text-blue-200 px-4 py-3 rounded-xl mt-6">
                                    <p className="text-sm">
                                        ℹ️ Recibirás un correo electrónico cuando tu cuenta sea aprobada. Mientras tanto, puedes cerrar sesión y volver más tarde.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={handleLogout}
                            className="px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transform hover:scale-105 transition-all duration-200"
                        >
                            Cerrar Sesión
                        </button>

                        {isRejected && (
                            <button
                                onClick={() => router.push('/registro')}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-purple-500/50 transform hover:scale-105 transition-all duration-200"
                            >
                                Crear Nueva Cuenta
                            </button>
                        )}
                    </div>

                    {/* Contacto */}
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <p className="text-purple-300 text-sm">
                            ¿Necesitas ayuda? Contacta al administrador del sistema
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

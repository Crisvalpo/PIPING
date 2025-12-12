'use client'

import { useEffect, useState } from 'react'

export default function OfflinePage() {
    const [isOnline, setIsOnline] = useState(false)

    useEffect(() => {
        // Check initial online status
        setIsOnline(navigator.onLine)

        // Listen for online/offline events
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const handleRetry = () => {
        if (navigator.onLine) {
            window.location.reload()
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                {/* Icon */}
                <div className="mb-6">
                    <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                        {isOnline ? (
                            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M9.172 9.172a4 4 0 015.656 0M6.343 6.343a8 8 0 0111.314 0M3.515 3.515a12 12 0 0116.97 0" />
                            </svg>
                        )}
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {isOnline ? '¡Conectado!' : 'Sin Conexión'}
                </h1>

                {/* Description */}
                <p className="text-gray-600 mb-6">
                    {isOnline
                        ? 'Tu conexión a internet se ha restablecido. Puedes continuar navegando.'
                        : 'No tienes conexión a internet. Por favor verifica tu conexión y vuelve a intentarlo.'}
                </p>

                {/* Status Indicator */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-sm font-medium">
                        {isOnline ? 'En línea' : 'Fuera de línea'}
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handleRetry}
                        className={`w-full px-6 py-3 rounded-xl font-medium transition-colors ${isOnline
                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        disabled={!isOnline}
                    >
                        {isOnline ? 'Reintentar' : 'Esperando conexión...'}
                    </button>

                    <button
                        onClick={() => window.history.back()}
                        className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                        Volver
                    </button>
                </div>

                {/* Help Text */}
                <p className="text-xs text-gray-500 mt-6">
                    Algunas funciones pueden no estar disponibles sin conexión a internet.
                </p>
            </div>
        </div>
    )
}

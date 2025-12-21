'use client'

import { usePathname } from 'next/navigation'
import { useUIStore } from '@/store/ui-store'
import { QrCode } from 'lucide-react'

export default function BottomNavigation() {
    const pathname = usePathname()
    const isFocusMode = useUIStore((state) => state.isFocusMode)

    // Detectar páginas activas
    const isHome = pathname?.includes('/master-views')
    const isStats = pathname?.includes('stats') || pathname?.includes('estadisticas')

    // Check full width pages to hide spacer
    const isFullWidth = pathname?.includes('/cuadrillas/manage') || pathname?.includes('/reporte-diario') || pathname?.includes('/settings/personal') || pathname?.includes('/reportes') || pathname?.includes('/admin/roles')

    return (
        <>
            {/* Bottom Navigation Bar */}
            <div className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-in-out md:bottom-6 md:left-1/2 md:right-auto md:w-auto md:-translate-x-1/2 ${isFocusMode ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
                }`}>

                {/* QR Scanner Button (Desktop Floating / Mobile Center Pop) */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
                    <button
                        onClick={() => alert('Escáner QR próximamente...')}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 border-4 border-gray-50 dark:border-gray-900"
                    >
                        <QrCode className="w-6 h-6" />
                    </button>
                </div>

                <div className="relative flex h-16 items-center justify-between border-t border-gray-200/80 bg-white/95 px-8 pb-safe pt-2 backdrop-blur-lg dark:border-gray-800/80 dark:bg-gray-900/95 md:h-auto md:justify-around md:gap-8 md:rounded-full md:border md:pb-2 md:pt-2 md:px-8 md:shadow-xl">

                    {/* Home Button */}
                    <a
                        href="/dashboard/master-views"
                        className={`flex flex-col items-center justify-center gap-1 transition-all hover:opacity-80 ${isHome ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        <svg
                            className="w-6 h-6"
                            fill={isHome ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-[10px] font-medium">Inicio</span>
                    </a>

                    {/* Spacer for Center QR Button (Mobile Only) */}
                    <div className="w-12 md:hidden"></div>

                    {/* Desktop QR Button (Inline) */}
                    <button
                        onClick={() => alert('Escáner QR próximamente...')}
                        className="hidden md:flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-blue-600 transition-all dark:text-gray-400"
                    >
                        <QrCode className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Escanear</span>
                    </button>

                    {/* Stats Button */}
                    <button
                        onClick={() => alert('Estadísticas próximamente...')}
                        className={`flex flex-col items-center justify-center gap-1 transition-all hover:opacity-80 ${isStats ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-[10px] font-medium">Reportes</span>
                    </button>
                </div>
            </div>

            {/* Spacer to prevent content from being hidden behind fixed nav */}
            {!isFullWidth && <div className="h-20"></div>}
        </>
    )
}

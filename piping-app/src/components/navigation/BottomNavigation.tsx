'use client'

import { usePathname } from 'next/navigation'
import { useUIStore } from '@/store/ui-store'

export default function BottomNavigation() {
    const pathname = usePathname()
    const isFocusMode = useUIStore((state) => state.isFocusMode)

    // Detectar páginas activas
    const isHome = pathname?.includes('/master-views')
    const isStats = pathname?.includes('stats') || pathname?.includes('estadisticas')

    return (
        <>
            {/* Bottom Navigation Bar */}
            <div className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-in-out ${isFocusMode ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
                }`}>
                <div className="flex items-center justify-around border-t border-gray-200/80 bg-white/90 px-2 pb-4 pt-2 backdrop-blur-lg dark:border-gray-800/80 dark:bg-gray-900/90">
                    {/* Home Button */}
                    <a
                        href="/dashboard/master-views"
                        className={`flex flex-1 flex-col items-center justify-end gap-1.5 pt-1 transition-all ${isHome ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        <svg
                            className="w-6 h-6"
                            fill={isHome ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <p className="text-xs font-medium tracking-wide">Inicio</p>
                    </a>

                    {/* Stats Button */}
                    <button
                        onClick={() => alert('Estadísticas próximamente...')}
                        className={`flex flex-1 flex-col items-center justify-end gap-1.5 pt-1 transition-all ${isStats ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-xs font-medium tracking-wide">Estadísticas</p>
                    </button>
                </div>
            </div>

            {/* Spacer to prevent content from being hidden behind fixed nav */}
            <div className="h-20"></div>
        </>
    )
}

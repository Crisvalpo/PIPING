'use client'

import { usePathname } from 'next/navigation'
import AppNavbar from '@/components/layout/AppNavbar'
import BottomNavigation from '@/components/navigation/BottomNavigation'

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    // Identificar si estamos en la vista de gestión de cuadrillas o reporte diario para usar full-width
    const isFullWidth = pathname?.includes('/cuadrillas/manage') || pathname?.includes('/reporte-diario') || pathname?.includes('/settings/personal') || pathname?.includes('/reportes')

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 pb-20">
            <AppNavbar />
            <main className={`${isFullWidth
                ? 'w-full px-0 mx-0 max-w-none' // Full width override
                : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' // Default mobile-first contained
                } py-8`}>
                {children}
            </main>
            <BottomNavigation />
        </div>
    )
}

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AppNavbar from '@/components/layout/AppNavbar'
import BottomNavigation from '@/components/navigation/BottomNavigation'
import { useRolesStore } from '@/store/roles-store'

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const fetchRoles = useRolesStore(state => state.fetchRoles)

    useEffect(() => {
        // Hydrate dynamic roles on startup
        fetchRoles()
    }, [fetchRoles])
    // Identificar si estamos en la vista de gestión de cuadrillas o reporte diario para usar full-width
    const isFullWidth = pathname?.includes('/cuadrillas/manage') || pathname?.includes('/reporte-diario') || pathname?.includes('/settings/personal') || pathname?.includes('/reportes') || pathname?.includes('/admin/roles')

    return (
        <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 ${isFullWidth ? '' : 'pb-20'}`}>
            <AppNavbar />
            <main className={`${isFullWidth
                ? 'w-full px-0 mx-0 max-w-none' // Full width override
                : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' // Default mobile-first contained
                }`}>
                {children}
            </main>
            <BottomNavigation />
        </div>
    )
}

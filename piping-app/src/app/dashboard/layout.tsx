'use client'

import AppNavbar from '@/components/layout/AppNavbar'
import BottomNavigation from '@/components/navigation/BottomNavigation'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 pb-20">
            <AppNavbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
            <BottomNavigation />
        </div>
    )
}

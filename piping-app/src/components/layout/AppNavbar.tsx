'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, FolderKanban, Settings, Menu, X, LogOut } from 'lucide-react'
import { useState } from 'react'

export default function AppNavbar() {
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Proyectos', href: '/proyectos', icon: FolderKanban },
        { name: 'Configuración', href: '/settings/personal', icon: Settings },
    ]

    // Hide Proyectos and Configuración on mobile field views
    const isMobileFieldView = pathname.includes('/master-views')
    const filteredNavigation = isMobileFieldView
        ? navigation.filter(item => item.name === 'Dashboard')
        : navigation

    const isActive = (path: string) => pathname.startsWith(path)

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo y nombre */}
                    <div className="flex items-center">
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">LP</span>
                            </div>
                            <span className="hidden sm:block text-xl font-bold text-gray-900">LukeAPP Piping</span>
                        </Link>
                    </div>

                    {/* Navegación desktop */}
                    <div className="hidden md:flex md:items-center md:gap-1">
                        {filteredNavigation.map((item) => {
                            const Icon = item.icon
                            const active = isActive(item.href)
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </div>

                    {/* Botón logout desktop */}
                    <div className="hidden md:flex md:items-center">
                        <button
                            onClick={() => {
                                // TODO: Implementar logout
                                window.location.href = '/login'
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Salir
                        </button>
                    </div>

                    {/* Botón menú móvil */}
                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <Menu className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Menú móvil */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-gray-200 bg-white">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {filteredNavigation.map((item) => {
                            const Icon = item.icon
                            const active = isActive(item.href)
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${active
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            )
                        })}
                        <button
                            onClick={() => {
                                // TODO: Implementar logout
                                window.location.href = '/login'
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-50"
                        >
                            <LogOut className="w-5 h-5" />
                            Salir
                        </button>
                    </div>
                </div>
            )}
        </nav>
    )
}

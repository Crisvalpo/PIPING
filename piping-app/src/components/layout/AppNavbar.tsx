'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Menu, X, LogOut, Settings, Users } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useUIStore } from '@/store/ui-store'
import { supabase } from '@/lib/supabase'

export default function AppNavbar() {
    const pathname = usePathname()
    const router = useRouter()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [showSettingsMenu, setShowSettingsMenu] = useState(false)
    const [userProjectId, setUserProjectId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string>('')
    const isFocusMode = useUIStore((state) => state.isFocusMode)

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
    ]

    const isActive = (path: string) => pathname.startsWith(path)

    // Get user's project and role on mount
    useEffect(() => {
        async function getUserData() {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: userData } = await supabase
                    .from('users')
                    .select('proyecto_id, rol')
                    .eq('id', user.id)
                    .single()

                if (userData?.proyecto_id) {
                    setUserProjectId(userData.proyecto_id)
                }
                if (userData?.rol) {
                    setUserRole(userData.rol.toUpperCase())
                    console.log('✅ User role loaded:', userData.rol.toUpperCase())
                } else {
                    console.log('⚠️ No role found for user')
                }
            } catch (error) {
                console.error('Error getting user data:', error)
            }
        }
        getUserData()
    }, [])

    const handleCuadrillasClick = (e: React.MouseEvent) => {
        e.preventDefault()
        setShowSettingsMenu(false)

        if (userProjectId) {
            router.push(`/proyectos/${userProjectId}/cuadrillas/manage`)
        } else {
            router.push('/admin/cuadrillas')
        }
    }

    return (
        <nav className={`bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm transition-all duration-300 ease-in-out ${isFocusMode ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
            }`}>
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
                        {navigation.map((item) => {
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

                        {/* Settings Dropdown - Hidden for USUARIO role */}
                        {(() => {
                            const shouldShow = userRole !== 'USUARIO'
                            console.log('🔍 Settings menu check:', { userRole, shouldShow })
                            return shouldShow
                        })() && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showSettingsMenu || pathname.includes('/settings')
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                            }`}
                                    >
                                        <Settings className="w-4 h-4" />
                                        Configuración
                                    </button>

                                    {/* Settings Dropdown Menu */}
                                    {showSettingsMenu && (
                                        <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-[220px] z-50">
                                            <button
                                                onClick={handleCuadrillasClick}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                <span className="font-medium">Cuadrillas</span>
                                            </button>
                                            <Link
                                                href="/settings/personal"
                                                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-t border-gray-100 text-sm"
                                                onClick={() => setShowSettingsMenu(false)}
                                            >
                                                <Users className="w-4 h-4" />
                                                <span className="font-medium">Personal</span>
                                            </Link>
                                            {userProjectId && (
                                                <Link
                                                    href={`/proyectos/${userProjectId}/reportes`}
                                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-t border-gray-100 text-sm"
                                                    onClick={() => setShowSettingsMenu(false)}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span className="font-medium">Historial</span>
                                                </Link>
                                            )}
                                            {userProjectId && (
                                                <Link
                                                    href={`/proyectos/${userProjectId}/reporte-diario`}
                                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-t border-gray-100 text-sm"
                                                    onClick={() => setShowSettingsMenu(false)}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                                    </svg>
                                                    <span className="font-medium">Reporte Diario</span>
                                                </Link>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setShowSettingsMenu(false)
                                                    alert('Función de ayuda próximamente...')
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-t border-gray-100 text-sm"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="font-medium">Ayuda</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
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
                        {navigation.map((item) => {
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

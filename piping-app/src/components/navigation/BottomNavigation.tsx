'use client'

import { useState, useEffect } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function BottomNavigation() {
    const params = useParams()
    const pathname = usePathname()
    const router = useRouter()
    const [showSettingsMenu, setShowSettingsMenu] = useState(false)
    const [userProjectId, setUserProjectId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string>('')

    // Detectar páginas activas
    const isHome = pathname?.includes('/master-views')
    const isStats = pathname?.includes('stats') || pathname?.includes('estadisticas')
    const isSettings = pathname?.includes('/settings') || showSettingsMenu
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

        console.log('🔍 User Project ID:', userProjectId)

        if (userProjectId) {
            const targetUrl = `/proyectos/${userProjectId}/cuadrillas/manage`
            console.log('✅ Redirecting to:', targetUrl)
            router.push(targetUrl)
        } else {
            console.log('⚠️ No project ID, redirecting to admin')
            router.push('/admin/cuadrillas')
        }
    }

    return (
        <>
            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40">
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

                    {/* Settings Button with Dropdown - Hidden for USUARIO role */}
                    {userRole !== 'USUARIO' && (
                        <div className="relative flex flex-1">
                            <button
                                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                                className={`flex flex-1 flex-col items-center justify-end gap-1.5 pt-1 transition-all ${isSettings ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
                                    }`}
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <p className="text-xs font-medium tracking-wide">Ajustes</p>
                            </button>

                            {/* Settings Dropdown Menu */}
                            {showSettingsMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-[200px]">
                                    <button
                                        onClick={handleCuadrillasClick}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span className="font-medium">Cuadrillas</span>
                                    </button>
                                    <a
                                        href="/settings/personal"
                                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-t border-gray-100"
                                        onClick={() => setShowSettingsMenu(false)}
                                    >
                                        <Users className="w-5 h-5" />
                                        <span className="font-medium">Personal</span>
                                    </a>
                                    {userProjectId && (
                                        <a
                                            href={`/proyectos/${userProjectId}/reportes`}
                                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-t border-gray-100"
                                            onClick={() => setShowSettingsMenu(false)}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="font-medium">Historial</span>
                                        </a>
                                    )}
                                    {userProjectId && (
                                        <a
                                            href={`/proyectos/${userProjectId}/reporte-diario`}
                                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-t border-gray-100"
                                            onClick={() => setShowSettingsMenu(false)}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                            </svg>
                                            <span className="font-medium">Reporte Diario</span>
                                        </a>
                                    )}
                                    <button
                                        onClick={() => {
                                            setShowSettingsMenu(false)
                                            alert('Función de ayuda próximamente...')
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-t border-gray-100"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium">Ayuda</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Spacer to prevent content from being hidden behind fixed nav */}
            <div className="h-20"></div>
        </>
    )
}

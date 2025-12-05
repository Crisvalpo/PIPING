'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSystemStats, type SystemStats } from '@/services/super-admin'
import ProtectedRoute from '@/components/ProtectedRoute'
import Link from 'next/link'

function SuperAdminDashboardContent() {
    const router = useRouter()
    const [stats, setStats] = useState<SystemStats>({
        totalUsuarios: 0,
        totalEmpresas: 0,
        totalProyectos: 0,
        usuariosPendientes: 0,
        solicitudesPendientes: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadStats() {
            const data = await getSystemStats()
            setStats(data)
            setLoading(false)
        }
        loadStats()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-6 mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="px-3 py-1 bg-yellow-500 text-black font-bold rounded-lg text-xs">SUPER ADMIN</span>
                                <h1 className="text-3xl font-bold text-white">Panel de Control Global</h1>
                            </div>
                            <p className="text-gray-300">Visión general de todo el sistema LukeAPP</p>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-200"
                        >
                            ← Volver al Dashboard
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Solicitudes de Acceso (NUEVO) */}
                    <div className="backdrop-blur-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-2xl shadow-xl border border-white/20 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-pink-200 text-sm font-medium mb-1">Solicitudes Acceso</p>
                                <h3 className="text-4xl font-bold text-white">{stats.solicitudesPendientes}</h3>
                            </div>
                            <div className="p-3 bg-pink-500 rounded-xl">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                        </div>
                        {stats.solicitudesPendientes > 0 && (
                            <div className="mt-4">
                                <Link href="/admin/super/solicitudes" className="text-sm text-pink-300 hover:text-white flex items-center font-bold">
                                    Gestionar solicitudes →
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Usuarios Pendientes */}
                    <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl shadow-xl border border-white/20 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-orange-200 text-sm font-medium mb-1">Usuarios Nuevos</p>
                                <h3 className="text-4xl font-bold text-white">{stats.usuariosPendientes}</h3>
                            </div>
                            <div className="p-3 bg-orange-500 rounded-xl">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                        </div>
                        {stats.usuariosPendientes > 0 && (
                            <div className="mt-4">
                                <Link href="/admin/super/usuarios" className="text-sm text-orange-300 hover:text-white flex items-center">
                                    Revisar nuevos →
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Total Usuarios */}
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-300 text-sm font-medium mb-1">Total Usuarios</p>
                                <h3 className="text-4xl font-bold text-white">{stats.totalUsuarios}</h3>
                            </div>
                            <div className="p-3 bg-blue-500 rounded-xl">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Total Empresas */}
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-300 text-sm font-medium mb-1">Empresas</p>
                                <h3 className="text-4xl font-bold text-white">{stats.totalEmpresas}</h3>
                            </div>
                            <div className="p-3 bg-purple-500 rounded-xl">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menú de Gestión */}
                <h2 className="text-2xl font-bold text-white mb-6">Gestión del Sistema</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Gestión de Solicitudes (NUEVO) */}
                    <Link href="/admin/super/solicitudes">
                        <div className="group backdrop-blur-xl bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 p-8 transition-all duration-300 hover:-translate-y-1">
                            <div className="p-4 bg-pink-500/20 rounded-xl w-fit mb-4 group-hover:bg-pink-500 transition-colors">
                                <svg className="w-8 h-8 text-pink-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Solicitudes de Acceso</h3>
                            <p className="text-gray-400 text-sm">Aprobar usuarios que quieren unirse a empresas existentes.</p>
                        </div>
                    </Link>

                    {/* Gestión de Usuarios */}
                    <Link href="/admin/super/usuarios">
                        <div className="group backdrop-blur-xl bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 p-8 transition-all duration-300 hover:-translate-y-1">
                            <div className="p-4 bg-blue-500/20 rounded-xl w-fit mb-4 group-hover:bg-blue-500 transition-colors">
                                <svg className="w-8 h-8 text-blue-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Usuarios</h3>
                            <p className="text-gray-400 text-sm">Gestionar roles, permisos y usuarios nuevos.</p>
                        </div>
                    </Link>

                    {/* Gestión de Empresas */}
                    <Link href="/admin/super/empresas">
                        <div className="group backdrop-blur-xl bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 p-8 transition-all duration-300 hover:-translate-y-1">
                            <div className="p-4 bg-purple-500/20 rounded-xl w-fit mb-4 group-hover:bg-purple-500 transition-colors">
                                <svg className="w-8 h-8 text-purple-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Empresas</h3>
                            <p className="text-gray-400 text-sm">Ver todas las empresas registradas y sus proyectos.</p>
                        </div>
                    </Link>

                    {/* Gestión de Proyectos */}
                    <Link href="/admin/super/proyectos">
                        <div className="group backdrop-blur-xl bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 p-8 transition-all duration-300 hover:-translate-y-1">
                            <div className="p-4 bg-green-500/20 rounded-xl w-fit mb-4 group-hover:bg-green-500 transition-colors">
                                <svg className="w-8 h-8 text-green-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Proyectos</h3>
                            <p className="text-gray-400 text-sm">Supervisar todos los proyectos activos en el sistema.</p>
                        </div>
                    </Link>

                    {/* Carga Masiva */}
                    <Link href="/admin/super/carga-masiva">
                        <div className="group backdrop-blur-xl bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 p-8 transition-all duration-300 hover:-translate-y-1">
                            <div className="p-4 bg-orange-500/20 rounded-xl w-fit mb-4 group-hover:bg-orange-500 transition-colors">
                                <svg className="w-8 h-8 text-orange-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Carga Masiva</h3>
                            <p className="text-gray-400 text-sm">Importar datos desde archivos Excel de SpoolGen.</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function SuperAdminDashboardPage() {
    return (
        <ProtectedRoute requireAuth requireActive requireSuperAdmin>
            <SuperAdminDashboardContent />
        </ProtectedRoute>
    )
}

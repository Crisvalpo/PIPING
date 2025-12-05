'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, isProjectAdmin, isSuperAdmin } from '@/services/auth'
import { getMyProyecto, getProyectoStats } from '@/services/proyectos'
import { getPendingSolicitudes } from '@/services/solicitudes'
import ProtectedRoute from '@/components/ProtectedRoute'
import type { User, ProyectoWithEmpresa } from '@/types'
import Link from 'next/link'

function AdminProyectoContent() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [proyecto, setProyecto] = useState<ProyectoWithEmpresa | null>(null)
    const [stats, setStats] = useState({
        totalUsuarios: 0,
        totalAdmins: 0,
        invitacionesPendientes: 0,
        solicitudesPendientes: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadData() {
            const currentUser = await getCurrentUser()
            if (!currentUser) {
                router.push('/login')
                return
            }

            // Verificar que sea admin de proyecto o super admin
            const esAdmin = await isProjectAdmin()
            const esSuperAdmin = await isSuperAdmin()

            if (!esAdmin && !esSuperAdmin) {
                router.push('/dashboard')
                return
            }

            setUser(currentUser)

            // Cargar proyecto
            const proyectoData = await getMyProyecto()
            if (proyectoData) {
                setProyecto(proyectoData)

                // Cargar estadísticas
                const statsData = await getProyectoStats(proyectoData.id!)

                // Cargar solicitudes pendientes
                const solicitudes = await getPendingSolicitudes()

                setStats({
                    ...statsData,
                    solicitudesPendientes: solicitudes.length
                })
            }

            setLoading(false)
        }

        loadData()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1">Panel de Administración</h1>
                            <p className="text-purple-200">Gestiona tu proyecto y equipo</p>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-200"
                        >
                            ← Volver al Dashboard
                        </button>
                    </div>
                </div>

                {/* Proyecto Info */}
                {proyecto && (
                    <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-6 mb-6">
                        <h2 className="text-2xl font-bold text-white mb-4">Información del Proyecto</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-purple-200 text-sm">Empresa</p>
                                <p className="text-white text-xl font-semibold">{proyecto.empresa?.nombre}</p>
                            </div>
                            <div>
                                <p className="text-purple-200 text-sm">Proyecto</p>
                                <p className="text-white text-xl font-semibold">{proyecto.nombre}</p>
                            </div>
                            <div>
                                <p className="text-purple-200 text-sm">Código</p>
                                <p className="text-white text-lg font-mono">{proyecto.codigo}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Total Usuarios */}
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-200 text-sm mb-1">Total Usuarios</p>
                                <p className="text-white text-4xl font-bold">{stats.totalUsuarios}</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Admins */}
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-200 text-sm mb-1">Administradores</p>
                                <p className="text-white text-4xl font-bold">{stats.totalAdmins}</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Invitaciones Pendientes */}
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-200 text-sm mb-1">Invitaciones Pendientes</p>
                                <p className="text-white text-4xl font-bold">{stats.invitacionesPendientes}</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Acciones Rápidas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Invitar Usuario */}
                    <Link href="/admin/proyecto/invitar">
                        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl shadow-xl border border-white/20 p-8 hover:scale-105 transition-all duration-200 cursor-pointer">
                            <div className="flex items-center space-x-4">
                                <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">Invitar Usuario</h3>
                                    <p className="text-purple-200">Genera un link de invitación para nuevos miembros</p>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Gestionar Equipo */}
                    <Link href="/admin/proyecto/equipo">
                        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl shadow-xl border border-white/20 p-8 hover:scale-105 transition-all duration-200 cursor-pointer">
                            <div className="flex items-center space-x-4">
                                <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">Gestionar Equipo</h3>
                                    <p className="text-purple-200">Ver y administrar los miembros del proyecto</p>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Solicitudes de Acceso */}
                    <Link href="/admin/proyecto/solicitudes">
                        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-2xl shadow-xl border border-white/20 p-8 hover:scale-105 transition-all duration-200 cursor-pointer relative">
                            {stats.solicitudesPendientes > 0 && (
                                <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg">
                                    {stats.solicitudesPendientes}
                                </div>
                            )}
                            <div className="flex items-center space-x-4">
                                <div className="p-4 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">Solicitudes</h3>
                                    <p className="text-purple-200">Aprobar usuarios que quieren unirse</p>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Carga Masiva */}
                    {/* Ingeniería e Importación */}
                    <Link href={`/admin/proyecto/${proyecto?.id}/ingenieria`}>
                        <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl shadow-xl border border-white/20 p-8 hover:scale-105 transition-all duration-200 cursor-pointer">
                            <div className="flex items-center space-x-4">
                                <div className="p-4 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">Ingeniería</h3>
                                    <p className="text-purple-200">Carga de Isométricos y Control de Cambios</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function AdminProyectoPage() {
    return (
        <ProtectedRoute requireAuth requireActive requireProject requireAdmin>
            <AdminProyectoContent />
        </ProtectedRoute>
    )
}

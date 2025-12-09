'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut, isSuperAdmin, isProjectAdmin } from '@/services/auth'
import { getMyProyecto } from '@/services/proyectos'
import ProtectedRoute from '@/components/ProtectedRoute'
import type { User, ProyectoWithEmpresa } from '@/types'

function DashboardContent() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [proyecto, setProyecto] = useState<ProyectoWithEmpresa | null>(null)
    const [esSuperAdmin, setEsSuperAdmin] = useState(false)
    const [esAdminProyecto, setEsAdminProyecto] = useState(false)
    const [loading, setLoading] = useState(true)
    const [semanaProyecto, setSemanaProyecto] = useState<number | null>(null)
    const [diaProyecto, setDiaProyecto] = useState<number | null>(null)

    useEffect(() => {
        async function loadData() {
            const currentUser = await getCurrentUser()
            if (currentUser) {
                setUser(currentUser)

                // Verificar permisos
                const superAdmin = await isSuperAdmin()
                const adminProyecto = await isProjectAdmin()
                setEsSuperAdmin(superAdmin)
                setEsAdminProyecto(adminProyecto)

                // Cargar proyecto si no es super admin
                if (!superAdmin && currentUser.proyecto_id) {
                    const proyectoData = await getMyProyecto()
                    setProyecto(proyectoData)

                    // Load project week info
                    if (proyectoData?.id) {
                        try {
                            const weekRes = await fetch(`/api/proyectos/${proyectoData.id}/config-semanas`)
                            const weekData = await weekRes.json()
                            if (weekData.success) {
                                setSemanaProyecto(weekData.data.semana_actual)
                                setDiaProyecto(weekData.data.dia_proyecto)
                            }
                        } catch (err) {
                            console.error('Error loading week info:', err)
                        }
                    }
                }
            }
            setLoading(false)
        }
        loadData()
    }, [])

    const handleSignOut = async () => {
        await signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {semanaProyecto !== null ? `Semana ${semanaProyecto}` : 'Dashboard'}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-gray-600">Bienvenido de vuelta, {user.nombre}</p>
                            {semanaProyecto !== null && diaProyecto !== null && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Día {diaProyecto}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {esSuperAdmin && (
                            <button
                                onClick={() => router.push('/admin/super')}
                                className="px-4 py-2 bg-yellow-50 hover:bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-lg transition-colors"
                            >
                                ⚡ Super Admin
                            </button>
                        )}
                        {esAdminProyecto && !esSuperAdmin && (
                            <button
                                onClick={() => router.push('/admin/proyecto')}
                                className="px-4 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-700 rounded-lg transition-colors"
                            >
                                👨‍💼 Gestionar Proyecto
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mensaje para usuarios sin proyecto */}
            {!esSuperAdmin && !proyecto && (
                <div className="backdrop-blur-xl bg-blue-500/10 rounded-3xl shadow-2xl border border-blue-400/20 p-6 mb-6 animate-fade-in">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">¡Bienvenido a la empresa!</h2>
                            <p className="text-blue-100 mb-2">
                                Tu cuenta ha sido aprobada y vinculada a la empresa correctamente.
                            </p>
                            <p className="text-blue-200 text-sm">
                                Actualmente no tienes un proyecto asignado. Un administrador te asignará a uno pronto.
                                Mientras tanto, puedes revisar tu perfil.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Proyecto Info (solo si no es super admin) */}
            {!esSuperAdmin && proyecto && (
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-6 mb-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Tu Proyecto</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div>
                            <p className="text-purple-200 text-sm">Estado</p>
                            <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${proyecto.estado === 'ACTIVO'
                                ? 'bg-green-500/20 border border-green-400/50 text-green-200'
                                : proyecto.estado === 'PAUSADO'
                                    ? 'bg-yellow-500/20 border border-yellow-400/50 text-yellow-200'
                                    : 'bg-gray-500/20 border border-gray-400/50 text-gray-200'
                                }`}>
                                {proyecto.estado}
                            </span>
                        </div>
                    </div>
                </div>
            )}



            {/* Acciones Rápidas para Admin de Proyecto */}
            {esAdminProyecto && !esSuperAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div
                        onClick={() => router.push('/admin/proyecto/invitar')}
                        className="cursor-pointer backdrop-blur-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-3xl shadow-xl border border-blue-400/30 p-6 transform transition-all duration-200 hover:scale-[1.02] group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500 rounded-xl group-hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/30">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-200 rounded-full text-xs font-medium">Acción Rápida</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Invitar Miembros</h3>
                        <p className="text-blue-100">Agrega nuevos usuarios a tu equipo de trabajo y asigna sus roles.</p>
                    </div>

                    <div
                        onClick={() => router.push('/admin/proyecto/equipo')}
                        className="cursor-pointer backdrop-blur-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-3xl shadow-xl border border-purple-400/30 p-6 transform transition-all duration-200 hover:scale-[1.02] group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500 rounded-xl group-hover:bg-purple-400 transition-colors shadow-lg shadow-purple-500/30">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <span className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 text-purple-200 rounded-full text-xs font-medium">Gestión</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Gestionar Equipo</h3>
                        <p className="text-purple-100">Administra los roles, permisos y acceso de los miembros de tu equipo.</p>
                    </div>
                </div>
            )}

            {/* User Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Nombre Card */}
                <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6 transform transition-all duration-200 hover:scale-105">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-purple-200 text-sm">Nombre</p>
                            <p className="text-white text-xl font-semibold">{user.nombre}</p>
                        </div>
                    </div>
                </div>

                {/* Email Card */}
                <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6 transform transition-all duration-200 hover:scale-105">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-purple-200 text-sm">Correo</p>
                            <p className="text-white text-lg font-semibold">{user.correo}</p>
                        </div>
                    </div>
                </div>

                {/* Teléfono Card */}
                <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6 transform transition-all duration-200 hover:scale-105">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-purple-200 text-sm">Teléfono</p>
                            <p className="text-white text-lg font-semibold">{user.telefono}</p>
                        </div>
                    </div>
                </div>

                {/* Rol Card */}
                <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6 transform transition-all duration-200 hover:scale-105">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-purple-200 text-sm">Rol</p>
                            <p className="text-white text-lg font-semibold">{user.rol}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Información adicional */}
            <div className="mt-6 backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8">
                <h2 className="text-2xl font-bold text-white mb-4">Información de la Cuenta</h2>
                <div className="space-y-3 text-purple-100">
                    <p>✨ Tu cuenta está activa y verificada</p>
                    <p>🔒 Todos tus datos están protegidos con encriptación de nivel empresarial</p>
                    {esAdminProyecto && <p>👨‍💼 Tienes permisos de administrador de proyecto</p>}
                    {esSuperAdmin && <p>⚡ Tienes permisos de super administrador</p>}
                </div>
            </div>
        </div>
    )
}

export default function DashboardPage() {
    return (
        <ProtectedRoute requireAuth requireActive requireProject={false}>
            <DashboardContent />
        </ProtectedRoute>
    )
}

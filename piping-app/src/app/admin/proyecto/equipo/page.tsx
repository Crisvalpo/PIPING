'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/services/auth'
import { supabase } from '@/lib/supabase'
import { getMyProyecto } from '@/services/proyectos'
import ProtectedRoute from '@/components/ProtectedRoute'
import type { User, ProyectoWithEmpresa } from '@/types'

function GestionarEquipoContent() {
    const router = useRouter()
    const [proyecto, setProyecto] = useState<ProyectoWithEmpresa | null>(null)
    const [usuarios, setUsuarios] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
            router.push('/login')
            return
        }

        const proyectoData = await getMyProyecto()
        if (proyectoData) {
            setProyecto(proyectoData)
            await loadUsuarios(proyectoData.id!)
        }

        setLoading(false)
    }

    async function loadUsuarios(proyectoId: string) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('proyecto_id', proyectoId)
            .eq('estado_usuario', 'ACTIVO')
            .order('nombre', { ascending: true })

        if (!error && data) {
            setUsuarios(data)
        }
    }

    async function handleRoleChange(userId: string, newRole: string) {
        setUpdating(userId)

        const { error } = await supabase
            .from('users')
            .update({ rol: newRole })
            .eq('id', userId)

        if (error) {
            alert('Error al actualizar rol: ' + error.message)
        } else {
            // Actualizar la lista
            setUsuarios(usuarios.map(u =>
                u.id === userId ? { ...u, rol: newRole } : u
            ))
        }

        setUpdating(null)
    }

    async function toggleAdmin(userId: string, currentStatus: boolean) {
        setUpdating(userId)

        const { error } = await supabase
            .from('users')
            .update({ es_admin_proyecto: !currentStatus })
            .eq('id', userId)

        if (error) {
            alert('Error al actualizar permisos: ' + error.message)
        } else {
            // Actualizar la lista
            setUsuarios(usuarios.map(u =>
                u.id === userId ? { ...u, es_admin_proyecto: !currentStatus } : u
            ))
        }

        setUpdating(null)
    }

    async function removeUser(userId: string) {
        if (!confirm('¿Estás seguro de que quieres remover a este usuario del proyecto?')) {
            return
        }

        setUpdating(userId)

        const { error } = await supabase
            .from('users')
            .update({
                proyecto_id: null,
                empresa_id: null,
                estado_usuario: 'PENDIENTE',
                es_admin_proyecto: false
            })
            .eq('id', userId)

        if (error) {
            alert('Error al remover usuario: ' + error.message)
        } else {
            // Remover de la lista local
            setUsuarios(usuarios.filter(u => u.id !== userId))
        }

        setUpdating(null)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4">
            <div className="max-w-6xl mx-auto py-12">
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <button
                            onClick={() => router.push('/admin/proyecto')}
                            className="text-purple-200 hover:text-white mb-4 flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Volver
                        </button>
                        <h1 className="text-4xl font-bold text-white mb-2">Gestionar Equipo</h1>
                        <p className="text-purple-200">Administra los miembros de tu proyecto</p>
                    </div>

                    {/* Proyecto Info */}
                    {proyecto && (
                        <div className="mb-6 bg-blue-500/20 border border-blue-400/50 text-blue-200 px-4 py-3 rounded-xl">
                            <p className="text-sm">
                                <strong>Proyecto:</strong> {proyecto.nombre} ({proyecto.codigo}) - <strong>Total miembros:</strong> {usuarios.length}
                            </p>
                        </div>
                    )}

                    {/* Lista de Usuarios */}
                    <div className="space-y-4">
                        {usuarios.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-purple-200 text-lg">No hay usuarios en este proyecto aún</p>
                                <button
                                    onClick={() => router.push('/admin/proyecto/invitar')}
                                    className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                                >
                                    Invitar Primer Usuario
                                </button>
                            </div>
                        ) : (
                            usuarios.map((usuario) => (
                                <div
                                    key={usuario.id}
                                    className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        {/* Info del Usuario */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-semibold text-white">{usuario.nombre}</h3>
                                                {usuario.es_admin_proyecto && (
                                                    <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-400/50 text-yellow-200 rounded-lg text-xs font-medium">
                                                        ADMIN
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-purple-200 text-sm">{usuario.correo}</p>
                                            <p className="text-purple-300 text-sm">{usuario.telefono}</p>
                                        </div>

                                        {/* Rol Selector */}
                                        <div className="flex-1">
                                            <label className="block text-sm text-purple-200 mb-2">Rol:</label>
                                            <select
                                                value={usuario.rol}
                                                onChange={(e) => handleRoleChange(usuario.id!, e.target.value)}
                                                disabled={updating === usuario.id}
                                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                                            >
                                                <optgroup label="Supervisión" className="bg-gray-900 text-white">
                                                    <option value="GERENCIA / JEFE DE PROYECTO" className="bg-gray-900 text-white">Gerencia / Jefe de Proyecto</option>
                                                    <option value="P&C (PLANIFICACIÓN)" className="bg-gray-900 text-white">P&C (Planificación)</option>
                                                </optgroup>
                                                <optgroup label="Cliente" className="bg-gray-900 text-white">
                                                    <option value="CLIENTE / ITO" className="bg-gray-900 text-white">Cliente / ITO</option>
                                                </optgroup>
                                                <optgroup label="Ingeniería" className="bg-gray-900 text-white">
                                                    <option value="OFICINA TECNICA" className="bg-gray-900 text-white">Oficina Técnica</option>
                                                    <option value="CONTROL DOCUMENT" className="bg-gray-900 text-white">Control Document</option>
                                                </optgroup>
                                                <optgroup label="Producción" className="bg-gray-900 text-white">
                                                    <option value="TALLER / PREFABRICACIÓN" className="bg-gray-900 text-white">Taller / Prefabricación</option>
                                                    <option value="LOGISTICA" className="bg-gray-900 text-white">Logística</option>
                                                    <option value="EXPEDITOR" className="bg-gray-900 text-white">Expeditor</option>
                                                </optgroup>
                                                <optgroup label="Campo" className="bg-gray-900 text-white">
                                                    <option value="SUPERVISOR TERRENO" className="bg-gray-900 text-white">Supervisor Terreno</option>
                                                    <option value="CALIDAD / QA" className="bg-gray-900 text-white">Calidad / QA</option>
                                                </optgroup>
                                                <optgroup label="Gestión de Datos" className="bg-gray-900 text-white">
                                                    <option value="SECRETARIO PIPING" className="bg-gray-900 text-white">Secretario Piping</option>
                                                    <option value="SECRETARIO PRECOM" className="bg-gray-900 text-white">Secretario Precom</option>
                                                </optgroup>
                                                <optgroup label="Acceso General" className="bg-gray-900 text-white">
                                                    <option value="SOLO LECTURA" className="bg-gray-900 text-white">Solo Lectura</option>
                                                </optgroup>
                                            </select>
                                        </div>

                                        {/* Permisos de Admin y Eliminar */}
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => toggleAdmin(usuario.id!, usuario.es_admin_proyecto || false)}
                                                disabled={updating === usuario.id}
                                                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${usuario.es_admin_proyecto
                                                    ? 'bg-yellow-500/20 border border-yellow-400/50 text-yellow-200 hover:bg-yellow-500/30'
                                                    : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                                                    } disabled:opacity-50`}
                                            >
                                                {usuario.es_admin_proyecto ? '⭐ Quitar Admin' : '👤 Hacer Admin'}
                                            </button>

                                            <button
                                                onClick={() => removeUser(usuario.id!)}
                                                disabled={updating === usuario.id}
                                                className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Remover
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function GestionarEquipoPage() {
    return (
        <ProtectedRoute requireAuth requireActive requireProject requireAdmin>
            <GestionarEquipoContent />
        </ProtectedRoute>
    )
}

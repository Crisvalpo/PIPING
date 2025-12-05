'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllUsers, approveUser, rejectUser, deleteUser } from '@/services/super-admin'
import ProtectedRoute from '@/components/ProtectedRoute'
import type { User } from '@/types'

function GestionUsuariosContent() {
    const router = useRouter()
    const [usuarios, setUsuarios] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const [filter, setFilter] = useState<'TODOS' | 'PENDIENTE' | 'ACTIVO' | 'RECHAZADO'>('TODOS')

    useEffect(() => {
        loadUsers()
    }, [])

    async function loadUsers() {
        const data = await getAllUsers()
        setUsuarios(data)
        setLoading(false)
    }

    async function handleApprove(userId: string) {
        if (!confirm('¿Estás seguro de aprobar a este usuario?')) return

        setProcessing(userId)
        const result = await approveUser(userId)

        if (result.success) {
            // Actualizar lista localmente
            setUsuarios(usuarios.map(u =>
                u.id === userId ? { ...u, estado_usuario: 'ACTIVO' } : u
            ))
        } else {
            alert('Error: ' + result.message)
        }
        setProcessing(null)
    }

    async function handleReject(userId: string) {
        if (!confirm('¿Estás seguro de rechazar a este usuario?')) return

        setProcessing(userId)
        const result = await rejectUser(userId)

        if (result.success) {
            setUsuarios(usuarios.map(u =>
                u.id === userId ? { ...u, estado_usuario: 'RECHAZADO' } : u
            ))
        } else {
            alert('Error: ' + result.message)
        }
        setProcessing(null)
    }

    async function handleDelete(userId: string) {
        if (!confirm('¿Estás seguro de ELIMINAR permanentemente a este usuario? Esta acción no se puede deshacer.')) return

        setProcessing(userId)
        const result = await deleteUser(userId)

        if (result.success) {
            setUsuarios(usuarios.filter(u => u.id !== userId))
        } else {
            alert('Error: ' + result.message)
        }
        setProcessing(null)
    }

    const filteredUsers = usuarios.filter(u =>
        filter === 'TODOS' ? true : u.estado_usuario === filter
    )

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
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <button
                            onClick={() => router.push('/admin/super')}
                            className="text-gray-300 hover:text-white mb-2 flex items-center text-sm"
                        >
                            ← Volver al Panel
                        </button>
                        <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
                        <p className="text-gray-400">Administra todos los usuarios del sistema</p>
                    </div>

                    {/* Filtros */}
                    <div className="flex bg-white/10 rounded-lg p-1">
                        {(['TODOS', 'PENDIENTE', 'ACTIVO', 'RECHAZADO'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === f
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lista de Usuarios */}
                <div className="space-y-4">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-gray-400">No se encontraron usuarios con este filtro.</p>
                        </div>
                    ) : (
                        filteredUsers.map((usuario) => (
                            <div
                                key={usuario.id}
                                className={`backdrop-blur-xl bg-white/5 border rounded-xl p-6 transition-all ${usuario.estado_usuario === 'PENDIENTE'
                                    ? 'border-orange-500/50 bg-orange-500/5'
                                    : 'border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    {/* Info Usuario */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-xl font-bold text-white">{usuario.nombre}</h3>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${usuario.estado_usuario === 'ACTIVO' ? 'bg-green-500/20 text-green-300' :
                                                usuario.estado_usuario === 'PENDIENTE' ? 'bg-orange-500/20 text-orange-300' :
                                                    'bg-red-500/20 text-red-300'
                                                }`}>
                                                {usuario.estado_usuario}
                                            </span>
                                            {usuario.rol === 'SUPER_ADMIN' && (
                                                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded text-xs font-bold border border-yellow-500/50">
                                                    SUPER ADMIN
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400 mt-2">
                                            <p className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                {usuario.correo}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                {usuario.empresa?.nombre || 'Sin Empresa'}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                                </svg>
                                                {usuario.proyecto?.nombre || 'Sin Proyecto'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    {usuario.estado_usuario === 'PENDIENTE' && (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleReject(usuario.id!)}
                                                disabled={processing === usuario.id}
                                                className="px-4 py-2 bg-red-500/10 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                            >
                                                Rechazar
                                            </button>
                                            <button
                                                onClick={() => handleApprove(usuario.id!)}
                                                disabled={processing === usuario.id}
                                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-lg shadow-green-500/20 transition-all disabled:opacity-50"
                                            >
                                                {processing === usuario.id ? 'Procesando...' : '✅ Aprobar'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Botón Eliminar */}
                                    <button
                                        onClick={() => handleDelete(usuario.id!)}
                                        disabled={processing === usuario.id}
                                        className="ml-4 p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="Eliminar usuario permanentemente"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

export default function GestionUsuariosPage() {
    return (
        <ProtectedRoute requireAuth requireActive requireSuperAdmin>
            <GestionUsuariosContent />
        </ProtectedRoute>
    )
}

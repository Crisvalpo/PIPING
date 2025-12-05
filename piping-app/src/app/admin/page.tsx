'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/services/auth'
import { getAllUsers, updateUserRole, isAdmin, deleteUser } from '@/services/admin'
import { User } from '@/types/user'
import { getRoleColor } from '@/config/roles'

export default function AdminPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    useEffect(() => {
        async function loadData() {
            // Verificar autenticación
            const user = await getCurrentUser()
            if (!user) {
                router.push('/login')
                return
            }

            // Verificar si es admin
            const adminStatus = await isAdmin()
            if (!adminStatus) {
                router.push('/dashboard')
                return
            }

            setCurrentUser(user)

            // Cargar todos los usuarios
            const allUsers = await getAllUsers()
            setUsers(allUsers)
            setLoading(false)
        }

        loadData()
    }, [router])

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        setUpdating(userId)
        setMessage(null)

        const result = await updateUserRole(userId, newRole)

        if (result.success) {
            // Actualizar la lista local
            setUsers(users.map(u => u.id === userId ? { ...u, rol: newRole } : u))
            setMessage({ type: 'success', text: result.message })
        } else {
            setMessage({ type: 'error', text: result.message })
        }

        setUpdating(null)

        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setMessage(null), 3000)
    }

    const handleDelete = async (userId: string, userName: string) => {
        // Confirmación doble para evitar eliminaciones accidentales
        const confirmFirst = window.confirm(
            `⚠️ ¿Estás seguro de que deseas eliminar a "${userName}"?\n\nEsta acción NO se puede deshacer.`
        )

        if (!confirmFirst) return

        const confirmSecond = window.confirm(
            `⚠️ CONFIRMACIÓN FINAL\n\n¿Realmente deseas eliminar a "${userName}" del sistema?\n\nSe perderá todo su acceso y datos asociados.`
        )

        if (!confirmSecond) return

        setUpdating(userId)
        setMessage(null)

        const result = await deleteUser(userId)

        if (result.success) {
            // Eliminar de la lista local
            setUsers(users.filter(u => u.id !== userId))
            setMessage({ type: 'success', text: `Usuario "${userName}" eliminado exitosamente` })
        } else {
            setMessage({ type: 'error', text: result.message })
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

    // Estadísticas por categoría
    const stats = {
        total: users.length,
        soloLectura: users.filter(u => u.rol === 'SOLO LECTURA').length,
        operadores: users.filter(u => ['TALLER / PREFABRICACIÓN', 'LOGISTICA', 'EXPEDITOR', 'SUPERVISOR TERRENO', 'CALIDAD / QA'].includes(u.rol)).length,
        admins: users.filter(u => u.rol === 'ADMIN').length,
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1">Panel de Administración</h1>
                            <p className="text-purple-200">Gestiona usuarios y asigna roles del proyecto PIPING</p>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 text-purple-200 rounded-xl transition-all duration-200"
                        >
                            ← Volver al Dashboard
                        </button>
                    </div>
                </div>

                {/* Mensaje de éxito/error */}
                {message && (
                    <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success'
                        ? 'bg-green-500/20 border-green-400/50 text-green-200'
                        : 'bg-red-500/20 border-red-400/50 text-red-200'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
                        <p className="text-purple-200 text-sm mb-1">Total Usuarios</p>
                        <p className="text-white text-3xl font-bold">{stats.total}</p>
                    </div>
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
                        <p className="text-purple-200 text-sm mb-1">Solo Lectura</p>
                        <p className="text-white text-3xl font-bold">{stats.soloLectura}</p>
                    </div>
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
                        <p className="text-purple-200 text-sm mb-1">Operadores</p>
                        <p className="text-white text-3xl font-bold">{stats.operadores}</p>
                    </div>
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
                        <p className="text-purple-200 text-sm mb-1">Admins</p>
                        <p className="text-white text-3xl font-bold">{stats.admins}</p>
                    </div>
                </div>

                {/* Tabla de usuarios */}
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/20">
                                    <th className="text-left p-4 text-purple-200 font-semibold">Nombre</th>
                                    <th className="text-left p-4 text-purple-200 font-semibold">Correo</th>
                                    <th className="text-left p-4 text-purple-200 font-semibold">Teléfono</th>
                                    <th className="text-left p-4 text-purple-200 font-semibold">Rol Actual</th>
                                    <th className="text-left p-4 text-purple-200 font-semibold">Cambiar Rol</th>
                                    <th className="text-left p-4 text-purple-200 font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-white">{user.nombre}</td>
                                        <td className="p-4 text-purple-200">{user.correo}</td>
                                        <td className="p-4 text-purple-200">{user.telefono}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-lg border text-sm font-medium ${getRoleColor(user.rol)}`}>
                                                {user.rol}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {currentUser?.id === user.id ? (
                                                <span className="text-purple-300 text-sm">Tú mismo</span>
                                            ) : (
                                                <select
                                                    value={user.rol}
                                                    onChange={(e) => handleRoleUpdate(user.id!, e.target.value)}
                                                    disabled={updating === user.id}
                                                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                                                >
                                                    <optgroup label="Acceso General" className="bg-gray-900">
                                                        <option value="SOLO LECTURA" className="bg-gray-900">Solo Lectura</option>
                                                        <option value="ADMIN" className="bg-gray-900">Admin</option>
                                                    </optgroup>
                                                    <optgroup label="Supervisión" className="bg-gray-900">
                                                        <option value="GERENCIA / JEFE DE PROYECTO" className="bg-gray-900">Gerencia / Jefe de Proyecto</option>
                                                        <option value="P&C (PLANIFICACIÓN)" className="bg-gray-900">P&C (Planificación)</option>
                                                    </optgroup>
                                                    <optgroup label="Cliente" className="bg-gray-900">
                                                        <option value="CLIENTE / ITO" className="bg-gray-900">Cliente / ITO</option>
                                                    </optgroup>
                                                    <optgroup label="Ingeniería" className="bg-gray-900">
                                                        <option value="OFICINA TECNICA" className="bg-gray-900">Oficina Técnica</option>
                                                        <option value="CONTROL DOCUMENT" className="bg-gray-900">Control Document</option>
                                                    </optgroup>
                                                    <optgroup label="Producción" className="bg-gray-900">
                                                        <option value="TALLER / PREFABRICACIÓN" className="bg-gray-900">Taller / Prefabricación</option>
                                                        <option value="LOGISTICA" className="bg-gray-900">Logística</option>
                                                        <option value="EXPEDITOR" className="bg-gray-900">Expeditor</option>
                                                    </optgroup>
                                                    <optgroup label="Campo" className="bg-gray-900">
                                                        <option value="SUPERVISOR TERRENO" className="bg-gray-900">Supervisor Terreno</option>
                                                        <option value="CALIDAD / QA" className="bg-gray-900">Calidad / QA</option>
                                                    </optgroup>
                                                    <optgroup label="Gestión de Datos" className="bg-gray-900">
                                                        <option value="SECRETARIO PIPING" className="bg-gray-900">Secretario Piping</option>
                                                        <option value="SECRETARIO PRECOM" className="bg-gray-900">Secretario Precom</option>
                                                    </optgroup>
                                                </select>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {currentUser?.id === user.id ? (
                                                <span className="text-purple-300 text-sm">-</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleDelete(user.id!, user.nombre)}
                                                    disabled={updating === user.id}
                                                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 text-red-200 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm font-medium"
                                                    title="Eliminar usuario"
                                                >
                                                    🗑️ Eliminar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {users.length === 0 && (
                        <div className="p-8 text-center text-purple-300">
                            No hay usuarios registrados todavía.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

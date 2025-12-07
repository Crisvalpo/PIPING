'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllUsers, approveUser, rejectUser, deleteUser, getAllEmpresasWithStats, getAllProyectosWithDetails, updateUser } from '@/services/super-admin'
import ProtectedRoute from '@/components/ProtectedRoute'
import type { User, Empresa, Proyecto } from '@/types'
import { Pencil, X, Check, Trash2, StopCircle, Building2 } from 'lucide-react'

function GestionUsuariosContent() {
    const router = useRouter()
    const [usuarios, setUsuarios] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const [filter, setFilter] = useState<'TODOS' | 'PENDIENTE' | 'ACTIVO' | 'RECHAZADO'>('TODOS')

    // Edit states
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [empresas, setEmpresas] = useState<any[]>([])
    const [proyectos, setProyectos] = useState<any[]>([])
    const [editForm, setEditForm] = useState({
        empresa_id: '',
        proyecto_id: '',
        rol: 'USER',
        es_admin_proyecto: false
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const [usersData, empresasData, proyectosData] = await Promise.all([
            getAllUsers(),
            getAllEmpresasWithStats(),
            getAllProyectosWithDetails()
        ])
        setUsuarios(usersData)
        setEmpresas(empresasData)
        setProyectos(proyectosData)
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

    // Edit Handlers
    function openEditModal(user: User) {
        setEditingUser(user)
        setEditForm({
            empresa_id: user.empresa_id || '',
            proyecto_id: user.proyecto_id || '',
            rol: user.rol || 'USER',
            es_admin_proyecto: user.es_admin_proyecto || false
        })
    }

    async function handleSaveEdit(e: React.FormEvent) {
        e.preventDefault()
        if (!editingUser || !editingUser.id) return

        setProcessing(editingUser.id)

        // Fix logic: if empty string, send null
        const updatePayload = {
            empresa_id: editForm.empresa_id || null,
            proyecto_id: editForm.proyecto_id || null,
            rol: editForm.rol,
            es_admin_proyecto: editForm.es_admin_proyecto
        }

        const res = await updateUser(editingUser.id, updatePayload)

        if (res.success) {
            // Update local state is tricky because we need full objects for empresa/proyecto
            // Let's just reload users to be safe and simple
            const updatedUsers = await getAllUsers()
            setUsuarios(updatedUsers)
            setEditingUser(null)
        } else {
            alert('Error actualizando usuario: ' + res.message)
        }
        setProcessing(null)
    }

    const filteredUsers = usuarios.filter(u =>
        filter === 'TODOS' ? true : u.estado_usuario === filter
    )

    // Filter projects based on selected company in modal
    const availableProjects = editForm.empresa_id
        ? proyectos.filter(p => p.empresa_id === editForm.empresa_id)
        : []

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
                                            {usuario.rol === 'ADMIN' && (
                                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-bold border border-purple-500/50">
                                                    ADMIN
                                                </span>
                                            )}
                                            {usuario.es_admin_proyecto && (
                                                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-xs font-bold border border-cyan-500/50">
                                                    ADMIN PROYECTO
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
                                                <Building2 className="w-4 h-4" />
                                                {usuario.empresa?.nombre || 'Sin Empresa'}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <span className="font-bold">P</span>
                                                {usuario.proyecto?.nombre || 'Sin Proyecto'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex items-center gap-2">
                                        {usuario.estado_usuario === 'PENDIENTE' && (
                                            <>
                                                <button
                                                    onClick={() => handleReject(usuario.id!)}
                                                    disabled={!!processing}
                                                    className="p-2 bg-red-500/10 text-red-300 rounded-lg hover:bg-red-500/20 transition-colors"
                                                    title="Rechazar"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(usuario.id!)}
                                                    disabled={!!processing}
                                                    className="p-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors"
                                                    title="Aprobar"
                                                >
                                                    <Check className="w-5 h-5" />
                                                </button>
                                            </>
                                        )}

                                        <button
                                            onClick={() => openEditModal(usuario)}
                                            disabled={!!processing}
                                            className="p-2 bg-blue-500/10 text-blue-300 rounded-lg hover:bg-blue-500/20 transition-colors"
                                            title="Editar Usuario"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </button>

                                        <button
                                            onClick={() => handleDelete(usuario.id!)}
                                            disabled={!!processing}
                                            className="p-2 hover:bg-white/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Edit Modal */}
                {editingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Editar Usuario</h3>
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                                <div>
                                    <h4 className="text-white font-medium mb-1">{editingUser.nombre}</h4>
                                    <p className="text-sm text-gray-400 mb-4">{editingUser.correo}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Rol del Sistema</label>
                                        <select
                                            value={editForm.rol}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, rol: e.target.value }))}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                        >
                                            <option value="USER">Usuario (User)</option>
                                            <option value="ADMIN">Administrador (Admin)</option>
                                            <option value="SUPER_ADMIN">Super Admin</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end pb-2">
                                        <label className="flex items-center gap-2 cursor-pointer text-gray-300 select-none">
                                            <input
                                                type="checkbox"
                                                checked={editForm.es_admin_proyecto}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, es_admin_proyecto: e.target.checked }))}
                                                className="w-4 h-4 rounded border-white/20 bg-black/40 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                                            />
                                            <span className="text-sm">Es Admin de Proyecto</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Empresa</label>
                                    <select
                                        value={editForm.empresa_id}
                                        onChange={(e) => setEditForm(prev => ({
                                            ...prev,
                                            empresa_id: e.target.value,
                                            proyecto_id: '' // Reset project when company changes
                                        }))}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        <option value="">-- Sin Empresa --</option>
                                        {empresas.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Proyecto</label>
                                    <select
                                        value={editForm.proyecto_id}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, proyecto_id: e.target.value }))}
                                        disabled={!editForm.empresa_id}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
                                    >
                                        <option value="">-- Sin Proyecto --</option>
                                        {availableProjects.map(proj => (
                                            <option key={proj.id} value={proj.id}>{proj.nombre} ({proj.codigo})</option>
                                        ))}
                                    </select>
                                    {!editForm.empresa_id && (
                                        <p className="text-xs text-gray-500 mt-1">Selecciona una empresa primero</p>
                                    )}
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditingUser(null)}
                                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!!processing}
                                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-purple-500/20"
                                    >
                                        {processing === editingUser.id ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
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

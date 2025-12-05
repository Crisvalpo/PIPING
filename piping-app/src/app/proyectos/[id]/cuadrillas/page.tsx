'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import BottomNavigation from '@/components/navigation/BottomNavigation'

export default function CuadrillasPage() {
    const params = useParams()
    const projectId = params.id as string

    const [cuadrillas, setCuadrillas] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [selectedCuadrilla, setSelectedCuadrilla] = useState<any>(null)
    const [showMembersModal, setShowMembersModal] = useState(false)

    useEffect(() => {
        loadCuadrillas()
        loadUsers()
    }, [projectId])

    const loadCuadrillas = async () => {
        try {
            const res = await fetch(`/api/cuadrillas?proyecto_id=${projectId}`)
            const data = await res.json()
            if (data.success) {
                setCuadrillas(data.data)
            }
        } catch (error) {
            console.error('Error loading cuadrillas:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadUsers = async () => {
        // TODO: Implementar endpoint para obtener usuarios del proyecto
        // Por ahora, mock data
        setUsers([])
    }

    const createCuadrilla = async (formData: any) => {
        try {
            const res = await fetch('/api/cuadrillas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proyecto_id: projectId,
                    ...formData
                })
            })
            const data = await res.json()
            if (data.success) {
                alert('✅ Cuadrilla creada')
                loadCuadrillas()
                setShowCreateModal(false)
            } else {
                alert('❌ Error: ' + data.error)
            }
        } catch (error) {
            console.error('Error creating cuadrilla:', error)
            alert('❌ Error al crear cuadrilla')
        }
    }

    const addMember = async (rut: string, role: string) => {
        if (!selectedCuadrilla) return
        try {
            const res = await fetch(`/api/cuadrillas/${selectedCuadrilla.id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rut, role })
            })
            const data = await res.json()
            if (data.success) {
                alert('✅ Miembro agregado')
                loadCuadrillas()
            } else {
                alert('❌ Error: ' + data.error)
            }
        } catch (error) {
            console.error('Error adding member:', error)
            alert('❌ Error al agregar miembro')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Cuadrillas</h1>
                    <p className="text-gray-600 mt-2">Administra las cuadrillas de trabajo del proyecto</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva Cuadrilla
                </button>
            </div>

            {cuadrillas.length === 0 ? (
                <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay cuadrillas</h3>
                    <p className="text-gray-600 mb-4">Crea la primera cuadrilla para comenzar</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Crear Cuadrilla
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cuadrillas.map(cuadrilla => (
                        <div key={cuadrilla.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{cuadrilla.nombre}</h3>
                                    <p className="text-sm text-gray-600">{cuadrilla.codigo}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${cuadrilla.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {cuadrilla.activo ? 'Activa' : 'Inactiva'}
                                </span>
                            </div>

                            {cuadrilla.descripcion && (
                                <p className="text-sm text-gray-600 mb-4">{cuadrilla.descripcion}</p>
                            )}

                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="text-center p-2 bg-blue-50 rounded">
                                    <div className="text-2xl font-bold text-blue-600">{cuadrilla.soldadores_count || 0}</div>
                                    <div className="text-xs text-gray-600">Soldadores</div>
                                </div>
                                <div className="text-center p-2 bg-purple-50 rounded">
                                    <div className="text-2xl font-bold text-purple-600">{cuadrilla.capataces_count || 0}</div>
                                    <div className="text-xs text-gray-600">Capataces</div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded">
                                    <div className="text-2xl font-bold text-gray-600">{cuadrilla.maestros_count || 0}</div>
                                    <div className="text-xs text-gray-600">Maestros</div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedCuadrilla(cuadrilla)
                                    setShowMembersModal(true)
                                }}
                                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Ver Miembros
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Crear Cuadrilla */}
            {showCreateModal && (
                <CreateCuadrillaModal
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={createCuadrilla}
                />
            )}

            {/* Modal Miembros */}
            {showMembersModal && selectedCuadrilla && (
                <MembersModal
                    cuadrilla={selectedCuadrilla}
                    onClose={() => {
                        setShowMembersModal(false)
                        setSelectedCuadrilla(null)
                    }}
                    onAddMember={addMember}
                />
            )}

            {/* Bottom Navigation */}
            <BottomNavigation />
        </div>
    )
}

function CreateCuadrillaModal({ onClose, onSubmit }: any) {
    const [formData, setFormData] = useState({
        nombre: '',
        codigo: '',
        descripcion: ''
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.nombre || !formData.codigo) {
            alert('Nombre y código son requeridos')
            return
        }
        onSubmit(formData)
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Nueva Cuadrilla</h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1">Nombre *</label>
                        <input
                            type="text"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Cuadrilla Principal"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1">Código *</label>
                        <input
                            type="text"
                            value={formData.codigo}
                            onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="CUAD-A"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1">Descripción</label>
                        <textarea
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={3}
                            placeholder="Descripción opcional"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Crear Cuadrilla
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}


function MembersModal({ cuadrilla, onClose, onAddMember }: any) {
    const [showAddForm, setShowAddForm] = useState(false)
    const [newMember, setNewMember] = useState({ rut: '', role: 'SOLDADOR' })
    const [searchTerm, setSearchTerm] = useState('')
    const [personalResults, setPersonalResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)

    const members = cuadrilla.members || []

    const handleAddMember = () => {
        if (!newMember.rut) {
            alert('Seleccione un trabajador')
            return
        }
        onAddMember(newMember.rut, newMember.role)
        setNewMember({ rut: '', role: 'SOLDADOR' })
        setSearchTerm('')
        setPersonalResults([])
        setShowAddForm(false)
    }

    const searchPersonal = async (search: string) => {
        if (search.length < 2) {
            setPersonalResults([])
            return
        }
        setSearching(true)
        try {
            const res = await fetch(`/api/personal?search=${encodeURIComponent(search)}`)
            const data = await res.json()
            if (data.success) {
                setPersonalResults(data.data)
            }
        } catch (error) {
            console.error('Error searching personal:', error)
        } finally {
            setSearching(false)
        }
    }

    const selectPersonal = (personal: any) => {
        setNewMember({ ...newMember, rut: personal.rut })
        setSearchTerm(personal.nombre)
        setPersonalResults([])
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Miembros de {cuadrilla.nombre}</h3>
                    <p className="text-sm text-gray-600">{cuadrilla.codigo}</p>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
                    {members.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>No hay miembros en esta cuadrilla</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {members.map((member: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900">{member.nombre || 'Sin nombre'}</div>
                                        <div className="text-sm text-gray-600">{member.rut}</div>
                                        {member.estampa && (
                                            <div className="text-xs text-blue-600 font-medium mt-1">
                                                🔖 Estampa: {member.estampa}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${member.rol === 'SOLDADOR' ? 'bg-blue-100 text-blue-700' :
                                        member.rol === 'CAPATAZ' ? 'bg-purple-100 text-purple-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        {member.rol}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {showAddForm && (
                        <div className="mt-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                            <h4 className="font-semibold text-gray-900 mb-3">Agregar Miembro</h4>
                            <div className="space-y-3">
                                {/* Búsqueda de personal */}
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Personal por RUT o Nombre</label>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value)
                                            searchPersonal(e.target.value)
                                        }}
                                        placeholder="Ej: 12.345.678-9 o Juan Pérez"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {searching && <div className="absolute right-3 top-9 text-xs text-gray-500">Buscando...</div>}

                                    {/* Resultados de búsqueda */}
                                    {personalResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {personalResults.map((p: any) => (
                                                <div
                                                    key={p.rut}
                                                    onClick={() => selectPersonal(p)}
                                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                                >
                                                    <div className="font-medium text-gray-900">{p.nombre}</div>
                                                    <div className="text-sm text-gray-600">{p.rut}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol en Cuadrilla</label>
                                    <select
                                        value={newMember.role}
                                        onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="SOLDADOR">Soldador</option>
                                        <option value="CAPATAZ">Capataz</option>
                                        <option value="MAESTRO">Maestro</option>
                                    </select>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setShowAddForm(false)
                                            setSearchTerm('')
                                            setPersonalResults([])
                                            setNewMember({ rut: '', role: 'SOLDADOR' })
                                        }}
                                        className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAddMember}
                                        disabled={!newMember.rut}
                                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Agregar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between">
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                        + Agregar Miembro
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}

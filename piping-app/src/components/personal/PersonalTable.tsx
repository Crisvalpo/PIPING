'use client'

import { useState } from 'react'
import { Search, Filter, Edit2, Trash2, CheckCircle, XCircle, MessageCircle, Mail } from 'lucide-react'
import EditPersonalModal from './EditPersonalModal'
import DeleteConfirmModal from './DeleteConfirmModal'

interface PersonalTableProps {
    personal: any[]
    loading: boolean
    onReload: () => void
}

export default function PersonalTable({ personal, loading, onReload }: PersonalTableProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterRole, setFilterRole] = useState('ALL')
    const [editingWorker, setEditingWorker] = useState<any>(null)
    const [deletingWorker, setDeletingWorker] = useState<any>(null)

    const filteredPersonal = personal.filter(p => {
        const matchesSearch =
            p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.rut?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesRole = filterRole === 'ALL' || filterRole === 'ASIGNADOS'
            ? (filterRole === 'ASIGNADOS' ? p.asignado : true)
            : p.rol === filterRole

        return matchesSearch && matchesRole
    })

    const asignados = personal.filter(p => p.asignado).length
    const sinAsignar = personal.length - asignados

    // Obtener roles únicos de los datos
    const rolesUnicos = Array.from(new Set(personal.map(p => p.rol).filter(Boolean)))
    const roleCounts = rolesUnicos.reduce((acc, rol) => {
        acc[rol] = personal.filter(p => p.rol === rol).length
        return acc
    }, {} as Record<string, number>)

    const handleWhatsApp = (telefono?: string) => {
        if (!telefono) {
            alert('Este trabajador no tiene teléfono registrado')
            return
        }

        // Limpiar el teléfono y formatear para WhatsApp
        const cleaned = telefono.replace(/[\s\-\(\)]/g, '')
        let whatsappNumber = cleaned

        if (cleaned.startsWith('+56')) {
            whatsappNumber = cleaned.substring(1)
        } else if (cleaned.startsWith('56')) {
            whatsappNumber = cleaned
        } else if (cleaned.startsWith('9')) {
            whatsappNumber = '56' + cleaned
        }

        window.open(`https://wa.me/${whatsappNumber}`, '_blank')
    }

    return (
        <>
            <div className="flex flex-col">
                {/* Toolbar */}
                <div className="w-full p-4 border-b border-white/10 flex justify-between items-center bg-white/5 gap-4">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-200 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o RUT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-white/30 bg-white/10 backdrop-blur-sm rounded-lg text-sm text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="text-purple-200 w-4 h-4" />
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="border border-white/30 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50"
                        >
                            <option value="ALL" className="bg-gray-800">Todos ({personal.length})</option>
                            <option value="ASIGNADOS" className="bg-gray-800">Asignados ({asignados})</option>
                            <option value="SIN ASIGNAR" className="bg-gray-800">Sin Asignar ({sinAsignar})</option>
                            {rolesUnicos.sort().map(rol => (
                                <option key={rol} value={rol} className="bg-gray-800">
                                    {rol.charAt(0) + rol.slice(1).toLowerCase()}s ({roleCounts[rol]})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-purple-100 uppercase tracking-wider">Nombre / RUT</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-purple-100 uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-purple-100 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-purple-100 uppercase tracking-wider">Cuadrilla</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-purple-100 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/5 divide-y divide-white/10">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50 mx-auto"></div>
                                        <p className="mt-2 text-white/50 text-sm">Cargando personal...</p>
                                    </td>
                                </tr>
                            ) : filteredPersonal.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-white/50">
                                        {searchTerm || filterRole !== 'ALL'
                                            ? 'No se encontraron trabajadores con los filtros aplicados'
                                            : 'No se encontraron trabajadores'}
                                    </td>
                                </tr>
                            ) : (
                                filteredPersonal.map((worker) => (
                                    <tr key={worker.rut} className={`transition-colors ${worker.presente === false
                                        ? 'bg-red-900/10 hover:bg-red-900/20 opacity-70'
                                        : 'hover:bg-white/5'}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold border ${worker.presente === false
                                                    ? 'bg-red-900/40 border-red-500/50'
                                                    : 'bg-white/10 border-white/10'}`}>
                                                    {worker.nombre.charAt(0)}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-white">{worker.nombre}</div>
                                                    <div className="text-sm text-white/60">{worker.rut}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-white/80">{worker.email || '-'}</span>
                                                {worker.email && (
                                                    <a
                                                        href={`mailto:${worker.email}`}
                                                        className="text-blue-300 hover:text-blue-200 hover:bg-white/10 p-1 rounded transition-colors"
                                                        title="Enviar correo"
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-white/60">{worker.telefono || '-'}</span>
                                                {worker.telefono && (
                                                    <button
                                                        onClick={() => handleWhatsApp(worker.telefono)}
                                                        className="text-green-400 hover:text-green-300 hover:bg-white/10 p-1 rounded transition-colors"
                                                        title="Abrir WhatsApp"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${worker.rol === 'SUPERVISOR' ? 'bg-purple-500/20 text-purple-200 border-purple-500/30' :
                                                worker.rol === 'CAPATAZ' ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30' :
                                                    worker.rol === 'MAESTRO' ? 'bg-blue-500/20 text-blue-200 border-blue-500/30' :
                                                        worker.rol === 'SOLDADOR' ? 'bg-orange-500/20 text-orange-200 border-orange-500/30' :
                                                            'bg-gray-500/20 text-gray-300 border-gray-500/30'
                                                }`}>
                                                {worker.rol}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {worker.asignado ? (
                                                <div className="flex items-center text-green-400">
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    <span className="text-sm mr-2">{worker.cuadrilla || 'Asignado'}</span>
                                                    {worker.shift_name && (
                                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border flex items-center gap-1 ${worker.shift_name.toLowerCase().includes('noche')
                                                            ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50'
                                                            : 'bg-amber-900/40 text-amber-300 border-amber-700/50'
                                                            }`}>
                                                            {worker.shift_name.toLowerCase().includes('noche') ? '🌙' : '☀️'}
                                                            {worker.shift_name}
                                                        </span>
                                                    )}
                                                    {worker.presente === false && (
                                                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-red-900/60 text-red-300 border border-red-700/50 flex items-center gap-1">
                                                            ⚠️ Ausente
                                                            {worker.motivo_ausencia && (
                                                                <span className="text-[9px] normal-case font-normal">({worker.motivo_ausencia})</span>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center text-amber-400">
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    <span className="text-sm">Sin asignar</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => setEditingWorker(worker)}
                                                    className="text-blue-400 hover:text-blue-300 p-2 hover:bg-white/10 rounded-full transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeletingWorker(worker)}
                                                    className="text-red-400 hover:text-red-300 p-2 hover:bg-white/10 rounded-full transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-2 border-t border-white/10 bg-black/20 text-xs text-white/50 flex justify-between">
                    <span>Total: {filteredPersonal.length} trabajadores</span>
                    <span className="flex gap-4">
                        <span className="text-green-400">✓ {asignados} asignados</span>
                        <span className="text-amber-400">⚠ {sinAsignar} sin asignar</span>
                    </span>
                </div>
            </div>

            {/* Edit Modal */}
            {editingWorker && (
                <EditPersonalModal
                    worker={editingWorker}
                    allPersonal={personal}
                    onClose={() => setEditingWorker(null)}
                    onSuccess={() => {
                        onReload()
                        setEditingWorker(null)
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingWorker && (
                <DeleteConfirmModal
                    worker={deletingWorker}
                    onClose={() => setDeletingWorker(null)}
                    onSuccess={() => {
                        onReload()
                        setDeletingWorker(null)
                    }}
                />
            )}
        </>
    )
}

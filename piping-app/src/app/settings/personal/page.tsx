'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Building2 } from 'lucide-react'
import PersonalTable from '@/components/personal/PersonalTable'
import ImportCSVModal from '@/components/personal/ImportCSVModal'
import TransferSoldadorModal from '@/components/personal/TransferSoldadorModal'

export default function PersonalPage() {
    const router = useRouter()
    const [showImportModal, setShowImportModal] = useState(false)
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [selectedSoldador, setSelectedSoldador] = useState<any>(null)
    const [personal, setPersonal] = useState([])
    const [loading, setLoading] = useState(false)

    // Super Admin states
    const [isSuperAdminUser, setIsSuperAdminUser] = useState(false)
    const [proyectos, setProyectos] = useState<any[]>([])
    const [selectedProyectoId, setSelectedProyectoId] = useState<string>('')

    const loadData = async () => {
        setLoading(true)
        try {
            const { getCurrentUser, isSuperAdmin } = await import('@/services/auth')
            const user = await getCurrentUser()
            const superAdmin = await isSuperAdmin()

            setIsSuperAdminUser(superAdmin)

            if (superAdmin) {
                // Fetch all projects for selector
                const res = await fetch('/api/proyectos')
                const allProjects = await res.json()
                setProyectos(allProjects.filter((p: any) => p.estado === 'ACTIVO'))

                // Don't load personal yet unless a project is already selected (which it isn't initially)
            } else {
                // Regular user: use their assigned project
                if (user?.proyecto_id) {
                    setSelectedProyectoId(user.proyecto_id)
                } else {
                    console.log('User has no project assigned')
                    setPersonal([])
                }
            }
        } catch (error) {
            console.error('Error initializing:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadPersonal = async (proyectoId: string) => {
        if (!proyectoId) return

        setLoading(true)
        try {
            const res = await fetch(`/api/personal?proyectoId=${proyectoId}`)
            const data = await res.json()
            if (data.success) {
                setPersonal(data.data || [])
            } else {
                console.error('Error loading personal:', data.error)
                setPersonal([])
            }
        } catch (error) {
            console.error('Error loading personal:', error)
            setPersonal([])
        } finally {
            setLoading(false)
        }
    }

    // Initial load
    useEffect(() => {
        loadData()
    }, [])

    // Load personal when project changes
    useEffect(() => {
        if (selectedProyectoId) {
            loadPersonal(selectedProyectoId)
        } else {
            setPersonal([])
        }
    }, [selectedProyectoId])

    const handleTransferClick = (soldador: any) => {
        setSelectedSoldador(soldador)
        setShowTransferModal(true)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-white">Gestión de Personal</h1>
                        <p className="text-white/60 mt-1 mb-4">Administra el personal del proyecto y sus roles</p>

                        {/* Project Selector for Super Admin */}
                        {isSuperAdminUser && (
                            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg border border-white/10 w-full md:w-auto md:max-w-md backdrop-blur-md transition-all hover:bg-white/15">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Building2 className="w-5 h-5 text-blue-300" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-blue-200 font-medium mb-1">
                                        Proyecto Seleccionado
                                    </label>
                                    <select
                                        value={selectedProyectoId}
                                        onChange={(e) => setSelectedProyectoId(e.target.value)}
                                        className="w-full bg-transparent text-white border-0 p-0 focus:ring-0 text-sm font-semibold cursor-pointer [&>option]:bg-gray-900"
                                    >
                                        <option value="">-- Seleccionar Proyecto --</option>
                                        {proyectos.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.nombre} ({p.codigo})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowImportModal(true)}
                            disabled={!selectedProyectoId}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${selectedProyectoId
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30'
                                : 'bg-white/10 text-white/40 cursor-not-allowed'
                                }`}
                        >
                            <Upload className="w-4 h-4" />
                            Importar
                        </button>
                    </div>
                </div>

                {/* Content */}
                {!selectedProyectoId ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <Building2 className="w-8 h-8 text-white/40" />
                        </div>
                        <h3 className="text-xl font-medium text-white mb-2">Selecciona un Proyecto</h3>
                        <p className="text-white/60 max-w-sm">
                            {isSuperAdminUser
                                ? "Selecciona un proyecto del menú superior para ver y gestionar su personal."
                                : "No tienes un proyecto asignado. Contacta al administrador."}
                        </p>
                    </div>
                ) : (
                    <PersonalTable
                        personal={personal}
                        loading={loading}
                        onReload={() => loadPersonal(selectedProyectoId)}
                    />
                )}

                {/* Modals */}
                {showImportModal && (
                    <ImportCSVModal
                        onClose={() => setShowImportModal(false)}
                        onSuccess={() => {
                            setShowImportModal(false)
                            if (selectedProyectoId) loadPersonal(selectedProyectoId)
                        }}
                    />
                )}

                {showTransferModal && selectedSoldador && (
                    <TransferSoldadorModal
                        soldador={selectedSoldador}
                        onClose={() => {
                            setShowTransferModal(false)
                            setSelectedSoldador(null)
                        }}
                        onSuccess={() => {
                            setShowTransferModal(false)
                            setSelectedSoldador(null)
                            if (selectedProyectoId) loadPersonal(selectedProyectoId)
                        }}
                    />
                )}
            </div>
        </div>
    )
}

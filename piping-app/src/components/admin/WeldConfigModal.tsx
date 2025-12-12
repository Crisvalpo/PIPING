import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface WeldConfig {
    id?: string
    weld_type_code: string
    requires_welder: boolean
}

interface WeldConfigModalProps {
    isOpen: boolean
    onClose: () => void
    proyectoId: string
    onSave?: () => void
}

export default function WeldConfigModal({ isOpen, onClose, proyectoId, onSave }: WeldConfigModalProps) {
    const [configs, setConfigs] = useState<WeldConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [newCode, setNewCode] = useState('')
    const [adding, setAdding] = useState(false)

    useEffect(() => {
        if (isOpen && proyectoId) {
            loadConfigs()
        }
    }, [isOpen, proyectoId])

    const loadConfigs = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/weld-configs`)
            const data = await res.json()
            if (data.success) {
                setConfigs(data.data)
            }
        } catch (error) {
            console.error('Error loading weld configs:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAdd = async () => {
        if (!newCode.trim()) return

        setAdding(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token

            const res = await fetch(`/api/proyectos/${proyectoId}/weld-configs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    weld_type_code: newCode.trim(),
                    requires_welder: false  // Always false - this is an exclusion list
                })
            })
            const data = await res.json()
            if (data.success) {
                await loadConfigs()
                setNewCode('')
                if (onSave) onSave()
            } else {
                alert(data.error || 'Error adding config')
            }
        } catch (error) {
            console.error('Error adding config:', error)
        } finally {
            setAdding(false)
        }
    }

    const handleDelete = async (code: string) => {
        if (!confirm('¿Estás seguro de eliminar esta configuración?')) return

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token

            const res = await fetch(`/api/proyectos/${proyectoId}/weld-configs?code=${encodeURIComponent(code)}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
            if (res.ok) {
                await loadConfigs()
                if (onSave) onSave()
            }
        } catch (error) {
            console.error('Error deleting config:', error)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-700">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">Uniones Sin Soldador</h2>
                        <p className="text-sm text-slate-400">Define las uniones que NO requieren soldador. Todo tipo que no esté en esta lista será considerado como unión soldada.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Add New */}
                    <div className="bg-slate-700/50 p-4 rounded-xl border border-slate-600 space-y-3">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Agregar Nuevo Tipo</h3>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Código (ej: THRD, SC)</label>
                                <input
                                    type="text"
                                    value={newCode}
                                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-500 bg-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                                    placeholder="CÓDIGO"
                                />
                            </div>
                            <button
                                onClick={handleAdd}
                                disabled={!newCode.trim() || adding}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {adding ? '...' : 'Agregar'}
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Tipos Excluidos</h3>
                        {loading ? (
                            <div className="text-center py-8 text-slate-400">Cargando...</div>
                        ) : configs.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-600 rounded-xl">
                                No hay exclusiones. Todas las uniones requieren soldador.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {configs.map((config) => (
                                    <div key={config.weld_type_code} className="flex items-center justify-between p-3 bg-slate-700 border border-slate-600 rounded-lg hover:border-blue-400 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-white bg-slate-600 px-3 py-1 rounded">
                                                {config.weld_type_code}
                                            </span>
                                            <span className="text-sm text-slate-400">No requiere soldador</span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(config.weld_type_code)}
                                            className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Eliminar configuración"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-600 font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}

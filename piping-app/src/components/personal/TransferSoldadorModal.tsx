'use client'

import { useState, useEffect } from 'react'
import { X, ArrowRightLeft, AlertTriangle } from 'lucide-react'

interface TransferSoldadorModalProps {
    soldador: any
    onClose: () => void
    onSuccess: () => void
}

export default function TransferSoldadorModal({ soldador, onClose, onSuccess }: TransferSoldadorModalProps) {
    const [cuadrillas, setCuadrillas] = useState<any[]>([])
    const [selectedCuadrilla, setSelectedCuadrilla] = useState('')
    const [observaciones, setObservaciones] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingCuadrillas, setLoadingCuadrillas] = useState(true)

    useEffect(() => {
        // Cargar cuadrillas disponibles (simplificado, idealmente filtrar por activas)
        const loadCuadrillas = async () => {
            try {
                // Usamos el endpoint de jerarquía para sacar las cuadrillas
                // O podríamos usar /api/cuadrillas si existiera uno simple
                const res = await fetch('/api/personal/hierarchy')
                const data = await res.json()
                if (data.success) {
                    const allCuadrillas: any[] = []
                    data.data.forEach((sup: any) => {
                        sup.cuadrillas.forEach((c: any) => {
                            allCuadrillas.push({
                                id: c.id,
                                nombre: c.nombre,
                                supervisor: sup.nombre
                            })
                        })
                    })
                    setCuadrillas(allCuadrillas)
                }
            } catch (error) {
                console.error('Error loading cuadrillas:', error)
            } finally {
                setLoadingCuadrillas(false)
            }
        }
        loadCuadrillas()
    }, [])

    const handleTransfer = async () => {
        if (!selectedCuadrilla) return

        setLoading(true)
        try {
            const res = await fetch('/api/personal/transfer-soldador', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    soldador_rut: soldador.soldador_rut || soldador.rut,
                    cuadrilla_destino_id: selectedCuadrilla,
                    observaciones: observaciones
                })
            })

            const data = await res.json()
            if (data.success) {
                onSuccess()
                onClose()
            } else {
                alert('Error: ' + data.error)
            }
        } catch (error) {
            console.error('Error transferring:', error)
            alert('Error al transferir soldador')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-md overflow-hidden relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="absolute inset-0 bg-orange-500/5 pointer-events-none"></div>

                {/* Header */}
                <div className="relative p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-orange-400" />
                        Transferir Soldador
                    </h3>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative p-6 space-y-4">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="text-xs text-white/60 uppercase font-bold mb-1">Soldador</div>
                        <div className="font-medium text-white">{soldador.nombre}</div>
                        <div className="text-sm text-gray-400 flex gap-2">
                            <span>RUT: {soldador.soldador_rut || soldador.rut}</span>
                            <span className="text-orange-400 font-bold">Estampa: {soldador.estampa}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">Cuadrilla Destino</label>
                        <select
                            value={selectedCuadrilla}
                            onChange={(e) => setSelectedCuadrilla(e.target.value)}
                            className="w-full bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                            disabled={loadingCuadrillas}
                        >
                            <option value="" className="bg-gray-800">Seleccione una cuadrilla...</option>
                            {cuadrillas.map(c => (
                                <option key={c.id} value={c.id} className="bg-gray-800">
                                    {c.nombre} (Sup: {c.supervisor})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">Observaciones</label>
                        <textarea
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            className="w-full bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 resize-none"
                            rows={3}
                            placeholder="Motivo del cambio..."
                        />
                    </div>

                    <div className="bg-blue-500/10 p-3 rounded-lg flex gap-2 text-sm text-blue-200 border border-blue-500/20">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                        <p>Al transferir, se cerrará automáticamente la asignación actual y se creará una nueva con la hora actual.</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="relative p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleTransfer}
                        disabled={!selectedCuadrilla || loading}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Transfiriendo...' : 'Confirmar Transferencia'}
                    </button>
                </div>
            </div>
        </div>
    )
}

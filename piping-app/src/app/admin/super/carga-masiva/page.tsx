'use client'

import { useState, useEffect } from 'react'
import { getAllProyectos } from '@/services/proyectos'
import EngineeringManager from '@/components/engineering/EngineeringManager'
import type { ProyectoWithEmpresa } from '@/types'

export default function CargaMasivaSuperAdminPage() {
    const [proyectos, setProyectos] = useState<ProyectoWithEmpresa[]>([])
    const [selectedProjectId, setSelectedProjectId] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadProyectos()
    }, [])

    async function loadProyectos() {
        try {
            const data = await getAllProyectos()
            setProyectos(data || [])
        } catch (error) {
            console.error("Error cargando proyectos:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto text-white">
            <h1 className="text-3xl font-bold mb-6">Administración Central de Carga de Datos</h1>

            <div className="bg-white/5 p-6 rounded-xl border border-white/10 mb-8">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                    Seleccionar Proyecto Destino
                </label>
                <div className="flex gap-4">
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        disabled={isLoading}
                    >
                        <option value="">-- Seleccione un proyecto --</option>
                        {proyectos.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.empresa?.nombre} - {p.nombre} ({p.codigo})
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={loadProyectos}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300"
                        title="Recargar lista"
                    >
                        ↻
                    </button>
                </div>
                {isLoading && <p className="text-xs text-gray-500 mt-2">Cargando proyectos...</p>}
            </div>

            {selectedProjectId ? (
                <div className="animate-fade-in">
                    <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-3">
                        <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="font-medium text-blue-200">Proyecto Seleccionado</p>
                            <p className="text-sm text-blue-300/80">
                                Estás gestionando la ingeniería para: <strong>{proyectos.find(p => p.id === selectedProjectId)?.nombre}</strong>
                            </p>
                        </div>
                    </div>

                    <EngineeringManager projectId={selectedProjectId} />
                </div>
            ) : (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10 border-dashed">
                    <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="text-xl font-medium text-gray-400">Selecciona un proyecto para comenzar</h3>
                    <p className="text-gray-500 mt-2">Debes elegir un proyecto destino para cargar o visualizar datos de ingeniería.</p>
                </div>
            )}
        </div>
    )
}

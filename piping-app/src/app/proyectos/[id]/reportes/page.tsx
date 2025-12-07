'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Download, RefreshCw, Clock, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: proyectoId } = use(params)
    const router = useRouter()

    // State
    const [loading, setLoading] = useState(true)
    const [reportData, setReportData] = useState<any[]>([])
    const [dateFrom, setDateFrom] = useState(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    )
    const [dateTo, setDateTo] = useState(
        new Date().toISOString().split('T')[0]
    )

    useEffect(() => {
        loadReport()
    }, [proyectoId]) // Load initially, then manual refresh

    async function loadReport() {
        setLoading(true)
        try {
            const query = new URLSearchParams({
                from: dateFrom,
                to: dateTo
            })

            const response = await fetch(`/api/proyectos/${proyectoId}/reportes/horas?${query}`)
            const result = await response.json()

            if (result.success) {
                setReportData(result.data)
            }
        } catch (error) {
            console.error('Error loading report:', error)
        } finally {
            setLoading(false)
        }
    }

    const downloadCSV = () => {
        if (!reportData.length) return

        const headers = ['Fecha', 'Cuadrilla', 'RUT', 'Nombre', 'Cargo', 'Inicio', 'Fin', 'Horas']
        const rows = reportData.map(d => [
            d.fecha,
            d.cuadrilla_nombre,
            d.rut,
            d.nombre,
            d.cargo,
            d.hora_inicio,
            d.hora_fin,
            d.horas_trabajadas
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte_horas_${dateFrom}_${dateTo}.csv`
        a.click()
    }

    // Calculations
    const totalHours = reportData.reduce((acc, curr) => acc + (parseFloat(curr.horas_trabajadas) || 0), 0)
    const uniqueWorkers = new Set(reportData.map(d => d.rut)).size

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6 pb-24">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/proyectos/${proyectoId}/cuadrillas`}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Reporte de Horas</h1>
                            <p className="text-white/60 text-sm">Historial de asignaciones y productividad</p>
                        </div>
                    </div>
                </div>

                {/* Filters & Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Filters */}
                    <div className="md:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                        <div className="flex gap-4 mb-4">
                            <div className="flex-1">
                                <label className="block text-xs text-white/50 mb-1">Desde</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-white/50 mb-1">Hasta</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={loadReport}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} /> Generar
                            </button>
                            <button
                                onClick={downloadCSV}
                                disabled={!reportData.length}
                                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Download size={16} /> Exportar
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-blue-200 text-sm font-medium mb-1">Total Horas</p>
                            <h3 className="text-3xl font-bold text-white">{totalHours.toFixed(1)}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Clock className="text-blue-400 w-8 h-8" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-purple-200 text-sm font-medium mb-1">Personal Activo</p>
                            <h3 className="text-3xl font-bold text-white">{uniqueWorkers}</h3>
                        </div>
                        <div className="p-3 bg-purple-500/20 rounded-lg">
                            <Users className="text-purple-400 w-8 h-8" />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-white/70">
                            <thead className="bg-white/5 text-white/90 font-semibold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Cuadrilla</th>
                                    <th className="px-4 py-3">Trabajador</th>
                                    <th className="px-4 py-3 text-center">Horario</th>
                                    <th className="px-4 py-3 text-right">Horas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8">
                                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                        </td>
                                    </tr>
                                ) : reportData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-white/40">
                                            No hay datos para el período seleccionado
                                        </td>
                                    </tr>
                                ) : (
                                    reportData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-white">{new Date(row.fecha).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 font-medium text-blue-300">{row.cuadrilla_nombre}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-white">{row.nombre}</div>
                                                <div className="text-xs opacity-60">{row.cargo}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-xs">
                                                {row.hora_inicio?.substring(0, 5)} - {row.hora_fin?.substring(0, 5)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-white">
                                                {row.horas_trabajadas}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    )
}

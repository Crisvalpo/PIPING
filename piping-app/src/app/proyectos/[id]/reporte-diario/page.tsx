'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import ShiftConfigurationModal from '@/components/daily-report/ShiftConfigurationModal'
import DailyOverrideModal from '@/components/daily-report/DailyOverrideModal'
import { ArrowLeft, Calendar, Download, RefreshCw, Clock, Users, Briefcase, AlertCircle, ChevronDown, ChevronRight, Info, Settings, Sun, Moon } from 'lucide-react'

// Interfaces
interface WorkerDetail {
    rut: string
    nombre: string
    cargo: string
    cuadrilla: string
    raw_start: string
    raw_end: string
    rounded_start: string
    rounded_end: string
    blocks: number
    hours: number
}

interface CuadrillaData {
    id: string
    nombre: string
    personas: number
    horas: number
    workers: WorkerDetail[]
}

interface ShiftStats {
    activeCrews: number
    presentWorkers: number
    totalHours: number
    avgHours: string
}

interface ShiftData {
    id: string
    name: string
    start: string
    end: string
    lunch_minutes: number
    is_default: boolean
    override: boolean
    stats: ShiftStats
    data: CuadrillaData[]
}

interface GlobalStats {
    activeCrews: number
    presentWorkers: number
    totalHours: number
    totalShifts: number
}

interface ApiResponse {
    success: boolean
    meta: { date: string; project_id: string }
    stats: GlobalStats
    shifts: ShiftData[]
}

export default function DailyReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: proyectoId } = use(params)
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [report, setReport] = useState<ApiResponse | null>(null)
    const [selectedShiftId, setSelectedShiftId] = useState<string | 'all'>('all')
    const [expandedCuadrillas, setExpandedCuadrillas] = useState<Set<string>>(new Set())
    const [showShiftModal, setShowShiftModal] = useState(false)
    const [showOverrideModal, setShowOverrideModal] = useState(false)

    useEffect(() => {
        loadReport()
    }, [proyectoId, date])

    async function loadReport() {
        setLoading(true)
        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/reportes/diario?date=${date}`)
            const json = await res.json()
            if (json.success) {
                setReport(json)
                // Auto-select first shift if only one exists
                if (json.shifts.length === 1) {
                    setSelectedShiftId(json.shifts[0].id)
                }
            } else {
                console.error('Report error:', json.error)
            }
        } catch (error) {
            console.error('Error loading daily report:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleCuadrilla = (id: string) => {
        const newSet = new Set(expandedCuadrillas)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setExpandedCuadrillas(newSet)
    }

    const exportExcel = () => {
        if (!report) return

        const wb = XLSX.utils.book_new()

        // Sheet 1: Resumen Global
        const summaryData = [
            ['Reporte Diario de Cuadrillas - Multi-Turno'],
            ['Fecha:', report.meta.date],
            ['Turnos Activos:', report.stats.totalShifts],
            [''],
            ['Totales Globales'],
            ['Cuadrillas Activas:', report.stats.activeCrews],
            ['Trabajadores Presentes:', report.stats.presentWorkers],
            ['Horas Totales:', report.stats.totalHours.toFixed(1)]
        ]
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen')

        // Sheet per Shift
        report.shifts.forEach(shift => {
            const shiftData = [
                [shift.name, `${shift.start} - ${shift.end}`],
                ['Override Activo:', shift.override ? 'Sí' : 'No'],
                ['Colación (min):', shift.lunch_minutes],
                [''],
                ['Cuadrilla', 'Personas', 'Horas Totales'],
                ...shift.data.map(c => [c.nombre, c.personas, c.horas.toFixed(1)]),
                [''],
                ['Nombre', 'RUT', 'Cargo', 'Cuadrilla', 'Inicio', 'Fin', 'Bloques', 'Horas'],
                ...shift.data.flatMap(c =>
                    c.workers.map(w => [
                        w.nombre, w.rut, w.cargo, c.nombre,
                        w.rounded_start.substring(0, 5),
                        w.rounded_end.substring(0, 5),
                        w.blocks, w.hours
                    ])
                )
            ]
            const ws = XLSX.utils.aoa_to_sheet(shiftData)
            XLSX.utils.book_append_sheet(wb, ws, shift.name.substring(0, 31)) // Excel limit
        })

        XLSX.writeFile(wb, `Reporte_Diario_${date}.xlsx`)
    }

    const renderBlocks = (blocks: number) => {
        return (
            <div className="flex gap-0.5 h-3 w-32 bg-gray-800 rounded overflow-hidden" title={`${blocks} bloques`}>
                {Array.from({ length: Math.min(blocks, 24) }).map((_, i) => (
                    <div key={i} className="flex-1 bg-green-500 rounded-sm"></div>
                ))}
            </div>
        )
    }

    const getShiftIcon = (shiftName: string) => {
        if (shiftName.toLowerCase().includes('noche') || shiftName.toLowerCase().includes('night')) {
            return <Moon className="w-5 h-5" />
        }
        return <Sun className="w-5 h-5" />
    }

    const shiftsToDisplay = selectedShiftId === 'all'
        ? report?.shifts || []
        : report?.shifts.filter(s => s.id === selectedShiftId) || []

    return (
        <div className="min-h-screen p-6 w-full text-white space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <Link href={`/proyectos/${proyectoId}/cuadrillas`} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                            Reporte Diario de Cuadrillas
                        </h1>
                        <div className="flex items-center gap-2 text-white/50 text-sm mt-1">
                            <span>{report?.stats.totalShifts || 0} turno(s) activo(s)</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    <button
                        onClick={() => setShowOverrideModal(true)}
                        className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-orange-900/20 transition-all active:scale-95"
                    >
                        <AlertCircle size={18} /> Excepciones
                    </button>
                    <button
                        onClick={() => setShowShiftModal(true)}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-purple-900/20 transition-all active:scale-95"
                    >
                        <Settings size={18} /> Configurar Turnos
                    </button>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
                        />
                    </div>
                    <button
                        onClick={exportExcel}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-green-900/20 transition-all active:scale-95"
                    >
                        <Download size={18} /> Exportar Excel
                    </button>
                    <button
                        onClick={loadReport}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        title="Recargar"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Shift Tabs */}
            {report && report.shifts.length > 1 && (
                <div className="flex gap-2 bg-white/5 p-2 rounded-xl border border-white/10">
                    <button
                        onClick={() => setSelectedShiftId('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${selectedShiftId === 'all'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        Todos los Turnos
                    </button>
                    {report.shifts.map(shift => (
                        <button
                            key={shift.id}
                            onClick={() => setSelectedShiftId(shift.id)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${selectedShiftId === shift.id
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {getShiftIcon(shift.name)}
                            {shift.name}
                            {shift.override && <AlertCircle className="w-4 h-4 text-orange-400" />}
                        </button>
                    ))}
                </div>
            )}

            {/* Global Stats (only if showing all) */}
            {selectedShiftId === 'all' && report && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Cuadrillas Activas (Global)"
                        value={report.stats.activeCrews}
                        icon={<Briefcase className="text-blue-400" />}
                        color="blue"
                    />
                    <StatCard
                        title="Trabajadores Presentes"
                        value={report.stats.presentWorkers}
                        icon={<Users className="text-purple-400" />}
                        color="purple"
                    />
                    <StatCard
                        title="Horas Totales"
                        value={report.stats.totalHours.toFixed(1)}
                        icon={<Clock className="text-green-400" />}
                        color="green"
                    />
                    <StatCard
                        title="Turnos Activos"
                        value={report.stats.totalShifts}
                        icon={<Info className="text-orange-400" />}
                        color="orange"
                    />
                </div>
            )}

            {/* Shifts Content */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : shiftsToDisplay.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-white/40">
                    No hay datos para esta fecha
                </div>
            ) : (
                shiftsToDisplay.map((shift) => (
                    <div key={shift.id} className="space-y-4">
                        {/* Shift Header */}
                        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {getShiftIcon(shift.name)}
                                <div>
                                    <h2 className="text-xl font-bold text-white">{shift.name}</h2>
                                    <p className="text-sm text-white/60">
                                        {shift.start.substring(0, 5)} - {shift.end.substring(0, 5)}
                                        {shift.override && ' (Excepción Activa)'}
                                        {' • Colación: '}{shift.lunch_minutes} min
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-blue-400">{shift.stats.activeCrews}</div>
                                    <div className="text-xs text-white/50">Cuadrillas</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-green-400">{shift.stats.presentWorkers}</div>
                                    <div className="text-xs text-white/50">Trabajadores</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-purple-400">{shift.stats.totalHours.toFixed(1)}h</div>
                                    <div className="text-xs text-white/50">Total</div>
                                </div>
                            </div>
                        </div>

                        {/* Cuadrillas Table */}
                        <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-white/5 text-xs font-bold uppercase text-white/60 tracking-wider">
                                <div className="col-span-1"></div>
                                <div className="col-span-4">Cuadrilla</div>
                                <div className="col-span-2 text-center">Personas</div>
                                <div className="col-span-2 text-center">Horas Totales</div>
                                <div className="col-span-3 text-right">Detalles</div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-white/5">
                                {shift.data.length === 0 ? (
                                    <div className="p-8 text-center text-white/40">
                                        No hay cuadrillas asignadas a este turno
                                    </div>
                                ) : (
                                    shift.data.map((cuadrilla) => (
                                        <div key={cuadrilla.id} className="group transition-colors hover:bg-white/5">
                                            {/* Row Summary */}
                                            <div
                                                className="grid grid-cols-12 gap-4 p-4 items-center cursor-pointer"
                                                onClick={() => toggleCuadrilla(cuadrilla.id)}
                                            >
                                                <div className="col-span-1 flex justify-center">
                                                    {expandedCuadrillas.has(cuadrilla.id) ? (
                                                        <ChevronDown size={20} className="text-white/60" />
                                                    ) : (
                                                        <ChevronRight size={20} className="text-white/40 group-hover:text-white/80" />
                                                    )}
                                                </div>
                                                <div className="col-span-4 font-medium text-lg text-white">
                                                    {cuadrilla.nombre}
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    <span className="bg-white/10 px-3 py-1 rounded-full text-sm font-bold">
                                                        {cuadrilla.personas}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 text-center font-mono text-blue-300 font-bold text-lg">
                                                    {cuadrilla.horas.toFixed(1)}
                                                </div>
                                                <div className="col-span-3 text-right text-sm text-white/50">
                                                    {shift.start.substring(0, 5)} - {shift.end.substring(0, 5)}
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            {expandedCuadrillas.has(cuadrilla.id) && (
                                                <div className="bg-black/20 border-y border-black/40 p-4 pl-12">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="text-xs text-white/40 uppercase font-semibold border-b border-white/5">
                                                            <tr>
                                                                <th className="pb-2">Trabajador</th>
                                                                <th className="pb-2">Cargo</th>
                                                                <th className="pb-2 text-center">Bloques</th>
                                                                <th className="pb-2 text-center">Inicio / Fin</th>
                                                                <th className="pb-2 text-right">Horas</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {cuadrilla.workers.map((worker, idx) => (
                                                                <tr key={idx} className="hover:bg-white/5">
                                                                    <td className="py-3 pr-4 font-medium">{worker.nombre}</td>
                                                                    <td className="py-3 text-white/60 text-xs">{worker.cargo}</td>
                                                                    <td className="py-3 flex justify-center">
                                                                        {renderBlocks(worker.blocks)}
                                                                    </td>
                                                                    <td className="py-3 text-center font-mono text-xs text-white/70">
                                                                        {worker.rounded_start.substring(0, 5)} - {worker.rounded_end.substring(0, 5)}
                                                                    </td>
                                                                    <td className="py-3 text-right font-bold text-green-400">
                                                                        {worker.hours.toFixed(1)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}

            <ShiftConfigurationModal
                isOpen={showShiftModal}
                onClose={() => setShowShiftModal(false)}
                projectId={proyectoId}
                onSave={loadReport}
            />

            <DailyOverrideModal
                isOpen={showOverrideModal}
                onClose={() => setShowOverrideModal(false)}
                projectId={proyectoId}
                currentDate={date}
                onSave={loadReport}
            />
        </div>
    )
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
    const colorClasses = {
        blue: 'from-blue-500/10 to-blue-900/10 border-blue-500/20 text-blue-400',
        purple: 'from-purple-500/10 to-purple-900/10 border-purple-500/20 text-purple-400',
        green: 'from-green-500/10 to-green-900/10 border-green-500/20 text-green-400',
        orange: 'from-orange-500/10 to-orange-900/10 border-orange-500/20 text-orange-400',
    }

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} border rounded-xl p-5 flex items-center justify-between`}>
            <div>
                <p className="text-white/60 text-sm font-medium mb-1 uppercase tracking-wide">{title}</p>
                <h3 className="text-3xl font-bold text-white">{value}</h3>
            </div>
            <div className="p-3 bg-white/5 rounded-xl backdrop-blur-sm">
                {icon}
            </div>
        </div>
    )
}

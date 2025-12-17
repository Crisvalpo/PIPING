'use client'

import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { processSpoolGenImport, getProjectStats, getProjectAreas, searchIsometrics } from '@/services/engineering'
import { processRevisionAnnouncement, uploadPDFToRevision, softDeleteRevision, hardDeleteRevision, getRevisionFiles, getFileUrl } from '@/services/revision-announcement'
import { getImpactsByRevision, approveImpact, rejectImpact } from '@/services/impacts'
import ImpactCard from '@/components/engineering/ImpactCard'
import UploadEngineeringDetails from '@/components/engineering/UploadEngineeringDetails'
import ImpactVerificationView from '@/components/engineering/ImpactVerificationView'
import type { Impacto } from '@/types/impacts'
import type { AnnouncementExcelRow } from '@/types/engineering'

type UploadMode = 'ANNOUNCEMENT' | 'SPOOLGEN'

interface EngineeringManagerProps {
    projectId: string
}

export default function EngineeringManager({ projectId }: EngineeringManagerProps) {
    const [uploadMode, setUploadMode] = useState<UploadMode>('ANNOUNCEMENT')
    const [isUploading, setIsUploading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState<string | null>(null)
    const [logs, setLogs] = useState<string[]>([])

    const [impacts, setImpacts] = useState<Impacto[]>([])

    // Estados Optimizado
    const [isometrics, setIsometrics] = useState<any[]>([]) // Datos mostrados en tabla (paginados)
    const [counts, setCounts] = useState({ total: 0, vigentes: 0, eliminados: 0, pendientesSpooling: 0 })
    const [availableAreas, setAvailableAreas] = useState<string[]>([])

    // Filtros y Paginación
    const [searchTerm, setSearchTerm] = useState('')
    // ... lines 35-200 unchanged ...
    async function handleDeleteRevision(revisionId: string, estado: string) {
        if (estado !== 'VIGENTE') {
            alert('Solo se pueden eliminar revisiones VIGENTES.')
            return
        }
        if (!confirm('¿Estás seguro de eliminar esta revisión? Pasará a estado ELIMINADA.')) return
        try {
            const success = await softDeleteRevision(revisionId)
            if (success) {
                addLog('✅ Revisión eliminada correctamente')
                await loadIsometricsTable()
                await loadDashboardMetrics()
            } else {
                alert('No se pudo eliminar la revisión')
            }
        } catch (error) {
            console.error(error)
            alert('Error al eliminar')
        }
    }

    async function handleHardDeleteRevision(revisionId: string, isoCode: string) {
        if (!confirm(`⚠️ PELIGRO:\n\nEstás a punto de borrar DE DEFINITIVAMENTE la revisión del isométrico ${isoCode}.\n\nSe eliminarán:\n- El registro de base de datos\n- Archivos PDF subidos\n- Spools y uniones asociadas\n\n¿Estás realmente seguro?`)) return

        try {
            const success = await hardDeleteRevision(revisionId)
            if (success) {
                alert('🗑️ Revisión eliminada del sistema permanentemente.')
                addLog(`🗑️ Revisión de ${isoCode} eliminada físicamente`)
                await loadIsometricsTable()
                await loadDashboardMetrics()
            } else {
                alert('Hubo un error al eliminar la revisión.')
            }
        } catch (error) {
            console.error(error)
            alert('Error crítico al eliminar')
        }
    }
    const [areaFilter, setAreaFilter] = useState('ALL')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [showOnlyPendingSpooling, setShowOnlyPendingSpooling] = useState(false)
    const [page, setPage] = useState(0)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 50

    const [currentRevisionId, setCurrentRevisionId] = useState<string | null>(null)
    const [viewingHistory, setViewingHistory] = useState<any | null>(null)

    // Estado para carga de PDF
    const [uploadingPDF, setUploadingPDF] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Estado para verificación de impactos
    const [showImpactVerification, setShowImpactVerification] = useState(false)
    const [impactVerificationData, setImpactVerificationData] = useState<{
        oldRevisionId: string;
        newRevisionId: string;
        isoNumber: string;
    } | null>(null)

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

    // Carga inicial de métricas y áreas
    useEffect(() => {
        if (projectId) {
            loadDashboardMetrics()
        }
    }, [projectId])

    // Efecto para cargar tabla cuando cambian filtros o página
    useEffect(() => {
        if (projectId) {
            loadIsometricsTable()
        }
    }, [projectId, page, searchTerm, areaFilter, statusFilter, showOnlyPendingSpooling])

    // Efecto para mantener el modal de historial sincronizado con los cambios en la tabla
    useEffect(() => {
        if (viewingHistory) {
            const updatedIso = isometrics.find(i => i.id === viewingHistory.id)
            if (updatedIso) {
                setViewingHistory(updatedIso)
            }
        }
    }, [isometrics])

    async function loadDashboardMetrics() {
        try {
            const [stats, areas] = await Promise.all([
                getProjectStats(projectId),
                getProjectAreas(projectId)
            ])
            setCounts(stats)
            setAvailableAreas(areas)
        } catch (error) {
            console.error("Error loading metrics:", error)
        }
    }

    async function loadIsometricsTable() {
        try {
            const result = await searchIsometrics(
                projectId,
                searchTerm,
                page,
                pageSize,
                {
                    area: areaFilter,
                    status: statusFilter,
                    showPending: showOnlyPendingSpooling
                }
            )
            setIsometrics(result.data)
            setTotalCount(result.count)
        } catch (error) {
            console.error("Error loading table:", error)
        }
    }

    // --- Handlers ---

    function handleSearch(term: string) {
        setSearchTerm(term)
        setPage(0)
    }

    async function handleApproveImpact(id: string) {
        try {
            await approveImpact(id)
            setImpacts(prev => prev.map(i => i.id === id ? { ...i, status: 'APROBADO' } : i))
        } catch (error) {
            console.error(error)
            alert("Error al aprobar impacto")
        }
    }

    async function handleRejectImpact(id: string) {
        const reason = prompt("Razón del rechazo:")
        if (!reason) return
        try {
            await rejectImpact(id, reason)
            setImpacts(prev => prev.map(i => i.id === id ? { ...i, status: 'RECHAZADO' } : i))
        } catch (error) {
            console.error(error)
            alert("Error al rechazar impacto")
        }
    }

    async function handlePDFUpload(revisionId: string, isoCode: string, revisionCode: string) {
        if (!fileInputRef.current) return

        fileInputRef.current.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement
            const file = target.files?.[0]
            if (!file) return

            setUploadingPDF(revisionId)

            try {
                // Pasamos isoCode y revisionCode para el renombrado automático
                const result = await uploadPDFToRevision(revisionId, file, 'pdf', true, isoCode, revisionCode)

                if (result.success) {
                    alert(`✅ PDF subido exitosamente para ${isoCode}`)
                    await loadIsometricsTable() // Recargar tabla
                } else {
                    alert(`❌ Error: ${result.message}`)
                }
            } catch (error: any) {
                alert(`❌ Error al subir PDF: ${error.message}`)
            } finally {
                setUploadingPDF(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
            }
        }

        fileInputRef.current.click()
    }

    async function handleViewFile(revisionId: string, fileId?: string) {
        try {
            let url: string | null = null

            if (fileId) {
                url = await getFileUrl(fileId)
            } else {
                const files = await getRevisionFiles(revisionId)
                if (files && files.length > 0) {
                    const pdf = files.find(f => f.file_type === 'pdf' && f.is_primary) || files.find(f => f.file_type === 'pdf')
                    url = pdf?.signed_url || null
                }
            }

            if (url) {
                window.open(url, '_blank')
            } else {
                alert('No se pudo generar el enlace del archivo')
            }
        } catch (error) {
            console.error(error)
            alert('Error al abrir archivo')
        }
    }

    async function handleDeleteRevision(revisionId: string, estado: string) {
        if (estado !== 'VIGENTE') {
            alert('Solo se pueden eliminar revisiones VIGENTES.')
            return
        }
        if (!confirm('¿Estás seguro de eliminar esta revisión? Pasará a estado ELIMINADA.')) return
        try {
            const success = await softDeleteRevision(revisionId)
            if (success) {
                addLog('✅ Revisión eliminada correctamente')
                await loadIsometricsTable()
                await loadDashboardMetrics()
            } else {
                alert('No se pudo eliminar la revisión')
            }
        } catch (error) {
            console.error(error)
            alert('Error al eliminar')
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        setLogs([])
        setImpacts([])
        addLog(`Iniciando carga (${uploadMode}): ${file.name}`)

        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data)
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(firstSheet)

            if (uploadMode === 'ANNOUNCEMENT') {
                addLog(`Procesando ${jsonData.length} filas de anuncio...`)

                if (!projectId) throw new Error('Project ID no está disponible')

                const result = await processRevisionAnnouncement(projectId, jsonData as AnnouncementExcelRow[])

                addLog(`Procesados: ${result.processed}, Errores: ${result.errors}`)
                result.details.forEach(d => addLog(d))

                if (result.errors === 0) {
                    addLog('✅ Anuncio procesado correctamente.')
                    setUploadStatus('success')
                    await loadIsometricsTable()
                    await loadDashboardMetrics()
                } else {
                    setUploadStatus('error')
                }

            }
        } catch (error: any) {
            console.error(error)
            addLog(`❌ Error crítico: ${error.message}`)
            setUploadStatus('error')
        } finally {
            setIsUploading(false)
        }
    }

    const handleDownloadTemplate = () => {
        const wb = XLSX.utils.book_new()
        if (uploadMode === 'ANNOUNCEMENT') {
            const data = [{
                "N°ISOMÉTRICO": "3900AE-O-390-1107-2",
                "N° LÍNEA": "390-1107-2",
                "REV. ISO": "0",
                "TIPO LÍNEA": "PROCESO",
                "ÁREA": "AREA-390",
                "SUB-ÁREA": "SUB-390-A",
                "ARCHIVO": "3900AE-O-390-1107-2-ISO",
                "REV. ARCHIVO": "0",
                "TML": "TML-2024-001",
                "FECHA": "2024-12-03"
            }]
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Anuncios")
            XLSX.writeFile(wb, "Template_Anuncio.xlsx")
        }
    }

    const handleEngineeringUploadComplete = async (result: any) => {
        if (result.success) {
            await loadIsometricsTable()
            await loadDashboardMetrics()

            if (result.requires_impact_evaluation && result.revision_id) {
                // Aquí podríamos cargar los impactos si el backend los devolviera o disparar una búsqueda
                const fetchedImpacts = await getImpactsByRevision(result.revision_id)
                setImpacts(fetchedImpacts)
            }
        }
    }

    // Función para mostrar verificación de impactos
    function handleShowImpactVerification(newRevisionId: string, isoNumber: string) {
        // Buscar la revisión anterior SPOOLEADA del mismo isométrico
        const iso = isometrics.find(i => i.codigo === isoNumber)
        if (!iso || !iso.revisions) {
            alert('No se pudo encontrar el isométrico')
            return
        }

        // Encontrar la revisión OBSOLETA más reciente (que era la anterior VIGENTE/SPOOLEADA)
        const oldRevision = iso.revisions
            .filter((r: any) => r.estado === 'OBSOLETA')
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

        if (!oldRevision) {
            alert('No se encontró una revisión anterior para comparar')
            return
        }

        setImpactVerificationData({
            oldRevisionId: oldRevision.id,
            newRevisionId,
            isoNumber
        })
        setShowImpactVerification(true)
    }

    return (
        <div className="space-y-6">
            <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} />

            {/* Header y Botones de Carga */}
            <div className="flex space-x-4 mb-6">
                <button onClick={() => setUploadMode('ANNOUNCEMENT')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${uploadMode === 'ANNOUNCEMENT' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>1. Anuncio de Revisiones</button>
                <button onClick={() => setUploadMode('SPOOLGEN')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${uploadMode === 'SPOOLGEN' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>2. Ingeniería de Detalle (SpoolGen)</button>

                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-gray-400 font-medium mr-2">3. + Elementos:</span>
                    {['Válvulas', 'Soportes', 'Instrumentos', 'Aislación'].map((item) => (
                        <div key={item} className="relative group">
                            <button disabled className="px-3 py-1 text-sm rounded bg-black/20 text-gray-500 cursor-not-allowed border border-white/5">
                                {item}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Próximamente
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Panel de Carga */}
            <div className="mb-8">
                {uploadMode === 'ANNOUNCEMENT' ? (
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all border border-white/20">Descargar Plantilla</button>
                            <label className={`px-4 py-2 rounded-lg font-medium cursor-pointer transition-all flex items-center gap-2 ${isUploading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                {isUploading ? 'Procesando...' : 'Subir Excel'}
                                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
                            </label>
                            {uploadStatus === 'success' && <span className="text-green-400 font-bold">¡Carga Completa!</span>}
                            {uploadStatus === 'error' && <span className="text-red-400 font-bold">Error</span>}
                        </div>
                        {logs.length > 0 && (
                            <div className="bg-black/50 p-4 rounded-lg font-mono text-xs h-32 overflow-y-auto border border-white/10">
                                {logs.map((log, i) => <div key={i} className="mb-1 border-b border-white/5 pb-1 last:border-0">{log}</div>)}
                            </div>
                        )}
                    </div>
                ) : (
                    <UploadEngineeringDetails
                        proyectoId={projectId}
                        onUploadComplete={handleEngineeringUploadComplete}
                    />
                )}
            </div>

            {/* --- DASHBOARD CARDS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                {/* Card 1: Métricas Globales (Grid 2x2) */}
                <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 p-5 rounded-xl border border-blue-500/20">
                    <div className="grid grid-cols-2 gap-4 h-full">
                        <div className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-lg">
                            <span className="text-3xl font-bold text-white">{counts.total}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Total</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-lg">
                            <span className="text-3xl font-bold text-red-400">{counts.eliminados}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Eliminados</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-lg">
                            <span className="text-3xl font-bold text-green-400">{counts.vigentes}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Vigentes</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-lg">
                            <span className="text-3xl font-bold text-yellow-400">{counts.pendientesSpooling}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Pend. Spooling</span>
                        </div>
                    </div>
                </div>

                {/* Card 2: Búsqueda y Filtros */}
                <div className="bg-white/5 p-5 rounded-xl border border-white/10 flex flex-col gap-3">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Filtros</h3>

                    <input
                        type="text"
                        placeholder="Buscar por código..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />

                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={areaFilter}
                            onChange={(e) => { setAreaFilter(e.target.value); setPage(0); }}
                            className="bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:outline-none"
                        >
                            <option value="ALL">Todas las Áreas</option>
                            {availableAreas.map(area => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                            className="bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:outline-none"
                        >
                            <option value="ALL">Todos los Estados</option>
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="SPOOLEADO">Spooleado</option>
                            <option value="OK">OK</option>
                        </select>
                    </div>
                    <div className="text-xs text-gray-500 text-right mt-1">
                        Mostrando {totalCount} resultados
                    </div>
                </div>

                {/* Card 3: Navegación (Grid 1x2) */}
                <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                    <div className="grid grid-cols-2 gap-4 h-full items-center">

                        {/* Columna 1: Paginación Simple */}
                        <div className="flex flex-col items-center justify-center gap-2">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="w-10 h-10 flex items-center justify-center bg-blue-600 disabled:bg-gray-700 rounded-lg text-white font-bold transition-colors"
                                >
                                    ←
                                </button>
                                <span className="text-sm font-mono text-gray-300">
                                    {page + 1} / {Math.max(1, Math.ceil(totalCount / pageSize))}
                                </span>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={(page + 1) * pageSize >= totalCount}
                                    className="w-10 h-10 flex items-center justify-center bg-blue-600 disabled:bg-gray-700 rounded-lg text-white font-bold transition-colors"
                                >
                                    →
                                </button>
                            </div>
                        </div>

                        {/* Columna 2: Botón Alerta Spooling */}
                        <button
                            onClick={() => { setShowOnlyPendingSpooling(!showOnlyPendingSpooling); setPage(0); }}
                            className={`h-full w-full rounded-xl flex flex-col items-center justify-center transition-all border-2 ${showOnlyPendingSpooling
                                ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20'
                                }`}
                        >
                            <span className="text-2xl font-bold">⚠️</span>
                            <span className="text-xs font-bold uppercase tracking-wider mt-1">Por Spoolear</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* TABLA DE ISOMÉTRICOS */}
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold mb-4">Listado Maestro</h3>

                {isometrics.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-black/20 rounded-lg">No hay resultados.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-gray-400 border-b border-white/10 text-xs uppercase tracking-wider">
                                    <th className="p-3">Isométrico</th>
                                    <th className="p-3">Rev</th>
                                    <th className="p-3">Estado</th>
                                    <th className="p-3">Fecha Emisión</th>
                                    <th className="p-3">TML / Transmittal</th>
                                    <th className="p-3">Spooling</th>
                                    <th className="p-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {isometrics.map((iso) => {
                                    const activeRev = iso.revisions?.find((r: any) => r.estado === 'VIGENTE') || iso.revisions?.[0]
                                    const isVigente = activeRev?.estado === 'VIGENTE'
                                    const hasFiles = activeRev?.files && activeRev.files.length > 0

                                    return (
                                        <tr key={iso.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${!isVigente ? 'opacity-60' : ''}`}>
                                            <td className="p-3 font-mono font-medium text-white">
                                                {iso.codigo}
                                                <div className="text-xs text-gray-500">{iso.area} {iso.sub_area ? `- ${iso.sub_area}` : ''}</div>
                                            </td>
                                            <td className="p-3">
                                                <span className="font-bold text-white">{activeRev?.codigo || '-'}</span>
                                            </td>
                                            <td className="p-3">
                                                {activeRev ? (
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold border ${isVigente
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                        {activeRev.estado}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-3 text-gray-300">
                                                {activeRev?.fecha_emision ? new Date(activeRev.fecha_emision).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-3 text-gray-300">
                                                <div className="flex flex-col">
                                                    <span>{activeRev?.transmittal_code || '-'}</span>
                                                    {activeRev?.transmittal_date && (
                                                        <span className="text-xs text-gray-500">{new Date(activeRev.transmittal_date).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {activeRev?.spooling_status ? (
                                                    <div className="flex flex-col">
                                                        <span className={`text-xs font-bold ${activeRev.spooling_status === 'OK' || activeRev.spooling_status === 'SPOOLEADO'
                                                            ? 'text-blue-400'
                                                            : 'text-yellow-400'
                                                            }`}>
                                                            {activeRev.spooling_status}
                                                        </span>
                                                        {activeRev.spooling_sent_date && (
                                                            <span className="text-[10px] text-gray-500">
                                                                Env: {new Date(activeRev.spooling_sent_date).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Botón Verificar Impactos */}
                                                    {(() => {
                                                        // Solo mostrar si:
                                                        // 1. La revisión actual es VIGENTE
                                                        // 2. El estado de spooling es PENDIENTE
                                                        // 3. Existe al menos una revisión anterior SPOOLEADA o OK
                                                        const shouldShowImpactBtn = isVigente &&
                                                            activeRev.spooling_status === 'PENDIENTE' &&
                                                            iso.revisions?.some((r: any) =>
                                                                r.id !== activeRev.id &&
                                                                (r.spooling_status === 'SPOOLEADO' ||
                                                                    r.spooling_status === 'OK' ||
                                                                    r.spooling_status === 'ENVIADO')
                                                            )

                                                        return shouldShowImpactBtn ? (
                                                            <button
                                                                onClick={() => handleShowImpactVerification(activeRev.id, iso.codigo)}
                                                                className="p-2 hover:bg-yellow-500/20 rounded transition-colors text-yellow-400 border border-yellow-500/30"
                                                                title="Verificar Impactos"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                </svg>
                                                            </button>
                                                        ) : null
                                                    })()}

                                                    {/* Botón Subir PDF */}
                                                    {(() => {
                                                        const showUploadBtn = isVigente && activeRev.spooling_status === 'PENDIENTE'

                                                        return showUploadBtn ? (
                                                            <button
                                                                onClick={() => handlePDFUpload(activeRev.id, iso.codigo, activeRev.codigo)}
                                                                className="p-2 hover:bg-blue-500/20 rounded transition-colors text-blue-400 border border-blue-500/30"
                                                                title="Subir PDF"
                                                            >
                                                                {isUploading ? (
                                                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        ) : null
                                                    })()}

                                                    {/* Botón Historial */}
                                                    <button
                                                        onClick={() => setViewingHistory(iso)}
                                                        className="p-2 hover:bg-white/10 rounded transition-colors text-blue-400"
                                                        title="Ver Historial de Revisiones"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>

                                                    <button
                                                        className={`p-2 hover:bg-white/10 rounded transition-colors ${!hasFiles ? 'opacity-30 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
                                                        onClick={() => hasFiles && handleViewFile(activeRev.id)}
                                                        disabled={!hasFiles}
                                                        title="Ver PDF Vigente"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className="p-2 hover:bg-white/10 rounded transition-colors text-green-400 hover:text-green-300"
                                                        onClick={() => activeRev && handlePDFUpload(activeRev.id, iso.codigo, activeRev.codigo)}
                                                        title="Subir PDF"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                        </svg>
                                                    </button>
                                                    {/* Botón Eliminar (Soft o Hard) */}
                                                    {/* Botón Eliminar (Soft o Hard) */}
                                                    {hasPermission(userRole, 'isometricos', 'delete') && (
                                                        <button
                                                            className={`p-2 hover:bg-white/10 rounded transition-colors ${isVigente || (activeRev.estado === 'ELIMINADA' && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'))
                                                                ? 'text-red-400 hover:bg-red-500/20'
                                                                : 'opacity-30 cursor-not-allowed text-gray-500'
                                                                }`}
                                                            onClick={() => {
                                                                if (activeRev.estado === 'ELIMINADA') {
                                                                    // Hard Delete - Solo Admin
                                                                    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
                                                                        handleHardDeleteRevision(activeRev.id, iso.codigo)
                                                                    }
                                                                } else if (isVigente) {
                                                                    // Soft Delete
                                                                    handleDeleteRevision(activeRev.id, activeRev.estado)
                                                                }
                                                            }}
                                                            disabled={
                                                                (!isVigente && activeRev.estado !== 'ELIMINADA') ||
                                                                (activeRev.estado === 'ELIMINADA' && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')
                                                            }
                                                            title={activeRev.estado === 'ELIMINADA' ? "☠️ ELIMINAR PARA SIEMPRE (Solo Admin)" : "Eliminar Revisión"}
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL DE HISTORIAL */}
            {viewingHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div>
                                <h3 className="text-xl font-bold text-white">Historial de Revisiones</h3>
                                <p className="text-sm text-gray-400 font-mono mt-1">{viewingHistory.codigo}</p>
                            </div>
                            <button
                                onClick={() => setViewingHistory(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-gray-500 border-b border-white/10 text-xs uppercase tracking-wider">
                                        <th className="p-3">Revisión</th>
                                        <th className="p-3">Estado</th>
                                        <th className="p-3">Fecha Emisión</th>
                                        <th className="p-3">Transmittal</th>
                                        <th className="p-3">Spooling</th>
                                        <th className="p-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {viewingHistory.revisions?.map((rev: any) => {
                                        const hasFiles = rev.files && rev.files.length > 0
                                        return (
                                            <tr key={rev.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-3 font-bold text-white">{rev.codigo}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold border ${rev.estado === 'VIGENTE' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                        rev.estado === 'OBSOLETA' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                            'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                        {rev.estado}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-gray-300">
                                                    {rev.fecha_emision ? new Date(rev.fecha_emision).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="p-3 text-gray-300">
                                                    {rev.transmittal_code || '-'}
                                                </td>
                                                <td className="p-3">
                                                    {rev.spooling_status ? (
                                                        <span className={`text-xs font-bold ${rev.spooling_status === 'OK' || rev.spooling_status === 'SPOOLEADO' ? 'text-blue-400' : 'text-yellow-400'
                                                            }`}>
                                                            {rev.spooling_status}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            className={`p-2 hover:bg-white/10 rounded transition-colors ${!hasFiles ? 'opacity-30 cursor-not-allowed' : 'text-blue-400 hover:text-white'}`}
                                                            onClick={() => hasFiles && handleViewFile(rev.id)}
                                                            disabled={!hasFiles}
                                                            title="Ver PDF"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            className="p-2 hover:bg-white/10 rounded transition-colors text-green-400 hover:text-green-300"
                                                            onClick={() => handlePDFUpload(rev.id, viewingHistory.codigo)}
                                                            title="Subir PDF"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                            </svg>
                                                        </button>
                                                        {rev.estado === 'VIGENTE' && (
                                                            <button
                                                                className="p-2 hover:bg-white/10 rounded transition-colors text-red-400 hover:text-red-300"
                                                                onClick={() => handleDeleteRevision(rev.id, rev.estado)}
                                                                title="Eliminar Revisión"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
                            <button
                                onClick={() => setViewingHistory(null)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE IMPACTOS (Si existe) */}
            {impacts.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-white/10 bg-white/5">
                            <h3 className="text-xl font-bold text-white">Análisis de Impactos Detectados</h3>
                            <p className="text-gray-400 text-sm mt-1">Se han detectado cambios respecto a la revisión anterior.</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {impacts.map(impact => (
                                <ImpactCard
                                    key={impact.id}
                                    impact={impact}
                                    onApprove={handleApproveImpact}
                                    onReject={handleRejectImpact}
                                />
                            ))}
                        </div>
                        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
                            <button
                                onClick={() => setImpacts([])}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-bold"
                            >
                                Finalizar Revisión
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE VERIFICACIÓN DE IMPACTOS */}
            {showImpactVerification && impactVerificationData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 flex justify-between items-center">
                            <div>                                <h3 className="text-2xl font-bold text-white">Verificación de Impactos</h3>
                                <p className="text-sm text-blue-200 mt-1">
                                    Comparando revisión <span className="font-mono font-bold">{impactVerificationData.isoNumber}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowImpactVerification(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                                title="Cerrar"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <ImpactVerificationView
                                oldRevisionId={impactVerificationData.oldRevisionId}
                                newRevisionId={impactVerificationData.newRevisionId}
                                isoNumber={impactVerificationData.isoNumber}
                                onMigrationComplete={async () => {
                                    setShowImpactVerification(false)
                                    setImpactVerificationData(null)
                                    await loadIsometricsTable()
                                    await loadDashboardMetrics()
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

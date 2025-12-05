'use client'

import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { processSpoolGenImport, getIsometrics } from '@/services/engineering'
import { processRevisionAnnouncement, uploadPDFToRevision } from '@/services/revision-announcement'
import { getImpactsByRevision, approveImpact, rejectImpact } from '@/services/impacts'
import ImpactCard from '@/components/engineering/ImpactCard'
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
    const [isometrics, setIsometrics] = useState<any[]>([])
    const [currentRevisionId, setCurrentRevisionId] = useState<string | null>(null)

    // Estado para carga de PDF
    const [uploadingPDF, setUploadingPDF] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

    useEffect(() => {
        if (projectId) {
            loadIsometrics()
        }
    }, [projectId])

    async function loadIsometrics() {
        try {
            const data = await getIsometrics(projectId)
            setIsometrics(data || [])
        } catch (error) {
            console.error("Error loading isometrics:", error)
        }
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

    async function handlePDFUpload(revisionId: string, isoCode: string) {
        if (!fileInputRef.current) return

        fileInputRef.current.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement
            const file = target.files?.[0]
            if (!file) return

            setUploadingPDF(revisionId)

            try {
                const result = await uploadPDFToRevision(revisionId, file, 'pdf', true)

                if (result.success) {
                    alert(`✅ PDF subido exitosamente para ${isoCode}`)
                    await loadIsometrics()
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

                if (!projectId) {
                    throw new Error('Project ID no está disponible')
                }

                console.log('Processing announcement for project:', projectId)
                addLog(`Project ID: ${projectId}`)

                const result = await processRevisionAnnouncement(projectId, jsonData as AnnouncementExcelRow[])

                addLog(`Procesados: ${result.processed}, Errores: ${result.errors}`)
                result.details.forEach(d => addLog(d))

                if (result.errors === 0) {
                    addLog('✅ Anuncio procesado correctamente.')
                    setUploadStatus('success')
                    await loadIsometrics()
                } else {
                    setUploadStatus('error')
                }

            } else {
                const requiredSheets = ['bolted_joints', 'spools_welds', 'material_take_off']
                const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet))

                if (missingSheets.length > 0) {
                    throw new Error(`Faltan hojas requeridas: ${missingSheets.join(', ')}`)
                }

                const boltedJoints = XLSX.utils.sheet_to_json(workbook.Sheets['bolted_joints'])
                const spoolsWelds = XLSX.utils.sheet_to_json(workbook.Sheets['spools_welds'])
                const materialTakeOff = XLSX.utils.sheet_to_json(workbook.Sheets['material_take_off'])

                const firstRecord = (spoolsWelds[0] || boltedJoints[0] || materialTakeOff[0]) as any
                if (!firstRecord) throw new Error("El archivo parece estar vacío")

                const isoCode = firstRecord['iso_number'] || firstRecord['ISO_NUMBER']
                const revCode = firstRecord['revision'] || firstRecord['REVISION']

                if (!isoCode) throw new Error("No se pudo detectar 'iso_number' en los datos")

                addLog(`Detectado Isométrico: ${isoCode} - Revisión: ${revCode}`)
                addLog('Validando contra revisión VIGENTE...')

                const result = await processSpoolGenImport(projectId, {
                    isometricCode: String(isoCode),
                    revisionCode: String(revCode || '0'),
                    bolted_joints: boltedJoints,
                    spools_welds: spoolsWelds,
                    material_take_off: materialTakeOff
                })

                if (result.success) {
                    addLog('✅ Importación exitosa!')
                    await loadIsometrics()
                    if (result.impactsDetected && result.revisionId) {
                        addLog('⚠️ Se han detectado cambios. Cargando análisis de impactos...')
                        const fetchedImpacts = await getImpactsByRevision(result.revisionId)
                        setImpacts(fetchedImpacts)
                        setCurrentRevisionId(result.revisionId)
                    }
                    setUploadStatus('success')
                } else {
                    addLog(`❌ Error: ${result.message}`)
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
                "N° LÍNEA": "O-390-1107-2",
                "REV. ISO": 6,
                "TIPO LÍNEA": "PROCESO",
                "ÁREA": "SWS 3",
                "SUB-ÁREA": "TANK FARM",
                "ARCHIVO": "3900AE-O-390-1107-2-R6",
                "REV. ARCHIVO": "R6",
                "TML": "TML-2024-001",
                "FECHA": "2024-01-15",
                "FORMATO PDF": 1,
                "FORMATO IDF": 1,
                "ESTADO SPOOLING": "PENDIENTE",
                "FECHA SPOOLING": "",
                "FECHA DE ENVIO": "",
                "N° TML": "001",
                "TOTAL": 45,
                "EJECUTADO": 0,
                "FALTANTES": 45,
                "COMENTARIO": "Primera revisión sin spooleo"
            }]
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Anuncios")
            XLSX.writeFile(wb, "Template_Anuncio_Revisiones.xlsx")
        } else {
            const boltedData = [{
                iso_number: "3900AE-O-390-1107-2", revision: 6, line_number: "O-390-1107-2",
                sheet: 1, flanged_joint_number: "BT01", piping_class: "A1P6",
                material: "A1P6", rating: "150", nps: '6"', bolt_size: "M20"
            }]
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(boltedData), "bolted_joints")

            const weldsData = [{
                iso_number: "3900AE-O-390-1107-2", revision: 6, line_number: "O-390-1107-2",
                spool_number: "SP02", sheet: 1, weld_number: "S005", destination: "CAMPO",
                weld_type: "BW", nps: '6"', sch: "STD", thickness: "7.11",
                piping_class: "A1P6", material: "CS"
            }]
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(weldsData), "spools_welds")

            const mtoData = [{
                line_number: "OPW-390-0703", area: "SWS 3", sheet: 1, spool_number: "SP02",
                spool_id: "SP02-001", piping_class: "A1P6", revision: 4, qty: 1,
                qty_unit: "EA", item_code: "CODO90-6-A1P6", fab: "TALLER-01"
            }]
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mtoData), "material_take_off")

            XLSX.writeFile(wb, "Template_SpoolGen.xlsx")
        }
    }

    return (
        <div className="space-y-6">
            {/* Input oculto para seleccionar archivos PDF */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
            />

            <div className="flex space-x-4 mb-6">
                <button
                    onClick={() => setUploadMode('ANNOUNCEMENT')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${uploadMode === 'ANNOUNCEMENT'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                >
                    1. Anuncio de Revisiones
                </button>
                <button
                    onClick={() => setUploadMode('SPOOLGEN')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${uploadMode === 'SPOOLGEN'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                >
                    2. Ingeniería de Detalle (SpoolGen)
                </button>
            </div>

            <div className="bg-white/5 p-6 rounded-xl border border-white/10 mb-8">
                <h2 className="text-xl font-semibold mb-2">
                    {uploadMode === 'ANNOUNCEMENT' ? 'Carga de Listado Maestro' : 'Importar Datos SpoolGen'}
                </h2>
                <p className="text-gray-400 mb-4 text-sm">
                    {uploadMode === 'ANNOUNCEMENT'
                        ? 'Sube el Excel con el listado de isométricos y sus revisiones.'
                        : 'Sube el archivo SpoolGen para cargar spools, juntas y materiales.'}
                </p>

                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={handleDownloadTemplate}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all flex items-center gap-2 border border-white/20"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar Plantilla
                    </button>

                    <label className={`px-4 py-2 rounded-lg font-medium cursor-pointer transition-all flex items-center gap-2 ${isUploading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        {isUploading ? 'Procesando...' : 'Subir Excel'}
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
                    </label>

                    {uploadStatus === 'success' && <span className="text-green-400 font-bold flex items-center gap-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ¡Carga Completa!
                    </span>}
                    {uploadStatus === 'error' && <span className="text-red-400 font-bold flex items-center gap-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        Error
                    </span>}
                </div>

                <div className="bg-black/50 p-4 rounded-lg font-mono text-xs h-64 overflow-y-auto border border-white/10">
                    {logs.length === 0 ? (
                        <span className="text-gray-600">Esperando archivo...</span>
                    ) : (
                        logs.map((log, i) => <div key={i} className="mb-1 border-b border-white/5 pb-1 last:border-0">{log}</div>)
                    )}
                </div>
            </div>

            {uploadMode === 'SPOOLGEN' && impacts.length > 0 && (
                <div className="mt-8 mb-12">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold">
                            <span className="bg-yellow-500/20 text-yellow-300 p-2 rounded-lg mr-3">⚠️ Impactos</span>
                            <span className="text-gray-400 text-sm">Cambios detectados</span>
                        </h3>
                        <span className="bg-white/10 px-3 py-1 rounded-full text-sm">{impacts.length} cambios</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-purple-300">Spools & Materiales</h4>
                            {impacts.filter(i => i.entity_type !== 'JOINT').map(impact => (
                                <ImpactCard key={impact.id} impact={impact} onApprove={handleApproveImpact} onReject={handleRejectImpact} />
                            ))}
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-cyan-300">Juntas & Soldaduras</h4>
                            {impacts.filter(i => i.entity_type === 'JOINT').map(impact => (
                                <ImpactCard key={impact.id} impact={impact} onApprove={handleApproveImpact} onReject={handleRejectImpact} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold mb-4">Listado Maestro de Isométricos</h3>

                {isometrics.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-black/20 rounded-lg">No hay isométricos cargados.</div>
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
                                    <th className="p-3">Archivos</th>
                                    <th className="p-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {isometrics.map((iso) => {
                                    const activeRev = iso.revisions?.find((r: any) => r.estado === 'VIGENTE') || iso.revisions?.[0]
                                    const isVigente = activeRev?.estado === 'VIGENTE'

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
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    {activeRev?.has_pdf && (
                                                        <span className="text-red-400" title="PDF Disponible">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                        </span>
                                                    )}
                                                    {activeRev?.has_idf && (
                                                        <span className="text-blue-400" title="IDF Disponible">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 text-right">
                                                <button
                                                    className={`text-blue-400 hover:text-blue-300 text-xs underline ${uploadingPDF === activeRev?.id ? 'opacity-50 cursor-wait' : ''}`}
                                                    onClick={() => activeRev?.id && handlePDFUpload(activeRev.id, iso.codigo)}
                                                    disabled={uploadingPDF === activeRev?.id}
                                                >
                                                    {uploadingPDF === activeRev?.id ? '⏳' : '+ PDF'}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

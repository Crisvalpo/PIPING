'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, X, AlertCircle, CheckCircle, FileSpreadsheet, Download, Building2, Lock } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { getCurrentUser } from '@/services/auth'

interface ImportCSVModalProps {
    onClose: () => void
    onSuccess: () => void
}

export default function ImportCSVModal({ onClose, onSuccess }: ImportCSVModalProps) {
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload')
    const [file, setFile] = useState<File | null>(null)
    const [parsedData, setParsedData] = useState<any[]>([])
    const [importResult, setImportResult] = useState<any>(null)
    const [projects, setProjects] = useState<any[]>([])
    const [selectedProject, setSelectedProject] = useState<string>('')
    const [loadingProjects, setLoadingProjects] = useState(true)
    const [isProjectLocked, setIsProjectLocked] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const init = async () => {
            setLoadingProjects(true)
            try {
                // 1. Cargar proyectos disponibles
                const res = await fetch('/api/proyectos')
                const projectsData = await res.json()
                if (Array.isArray(projectsData)) {
                    setProjects(projectsData)
                }

                // 2. Obtener usuario actual para pre-seleccionar proyecto
                const user = await getCurrentUser()
                if (user && user.proyecto_id) {
                    setSelectedProject(user.proyecto_id)
                    setIsProjectLocked(true)
                }
            } catch (error) {
                console.error('Error initializing modal:', error)
            } finally {
                setLoadingProjects(false)
            }
        }

        init()
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            if (selectedFile.name.endsWith('.csv')) {
                parseCSV(selectedFile)
            } else {
                parseExcel(selectedFile)
            }
        }
    }

    const parseCSV = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setParsedData(results.data)
                setStep('preview')
            },
            error: (error) => {
                console.error('Error parsing CSV:', error)
                alert('Error al leer el archivo CSV')
            }
        })
    }

    const parseExcel = (file: File) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = e.target?.result
                const workbook = XLSX.read(data, { type: 'binary' })
                const sheetName = workbook.SheetNames[0]
                const sheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(sheet)
                setParsedData(jsonData)
                setStep('preview')
            } catch (error) {
                console.error('Error parsing Excel:', error)
                alert('Error al leer el archivo Excel')
            }
        }
        reader.readAsBinaryString(file)
    }

    const downloadTemplate = () => {
        const templateData = [
            {
                RUT: '12.345.678-9',
                NOMBRE: 'JUAN PEREZ',
                EMAIL: 'juan@empresa.com',
                TELEFONO: '+56912345678',
                CARGO: 'SOLDADOR',
                CODIGO: 'EMP-001',
                JORNADA: '5x2'
            },
            {
                RUT: '98.765.432-1',
                NOMBRE: 'MARIA GONZALEZ',
                EMAIL: 'maria@empresa.com',
                TELEFONO: '+56987654321',
                CARGO: 'CAPATAZ',
                CODIGO: 'EMP-024',
                JORNADA: '14x14 A'
            }
        ]

        const ws = XLSX.utils.json_to_sheet(templateData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla Personal")
        XLSX.writeFile(wb, "plantilla_importacion_personal.xlsx")
    }

    const handleImport = async () => {
        if (!selectedProject) {
            alert('Por favor seleccione un proyecto')
            return
        }

        setStep('importing')
        try {
            const workers = parsedData.map((row: any) => {
                // Normalizar keys a mayúsculas para búsqueda
                const normalizedRow: any = {}
                Object.keys(row).forEach(key => {
                    normalizedRow[key.toUpperCase().trim()] = row[key]
                })

                return {
                    rut: normalizedRow['RUT'] || normalizedRow['RUT_TRABAJADOR'],
                    nombre: normalizedRow['NOMBRE'] || normalizedRow['NOMBRES'] || normalizedRow['NOMBRE_COMPLETO'],
                    email: normalizedRow['EMAIL'] || normalizedRow['CORREO'],
                    telefono: normalizedRow['TELEFONO'] || normalizedRow['CELULAR'],
                    cargo: normalizedRow['CARGO'] || normalizedRow['ROL'],
                    codigo: normalizedRow['CODIGO'] || normalizedRow['COD_TRABAJADOR'],  // NEW
                    jornada: normalizedRow['JORNADA'] || normalizedRow['REGIMEN']        // NEW
                }
            }).filter(w => w.rut && w.nombre)

            const res = await fetch('/api/personal/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workers,
                    proyectoId: selectedProject
                })
            })

            const data = await res.json()
            setImportResult(data)
            setStep('result')
            if (data.success) {
                onSuccess()
            }
        } catch (error) {
            console.error('Error importing:', error)
            setImportResult({ error: 'Error de conexión al importar' })
            setStep('result')
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="absolute inset-0 bg-blue-500/5 pointer-events-none"></div>

                {/* Header */}
                <div className="relative p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-lg font-bold text-white">Importar Personal</h3>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="relative p-6 overflow-y-auto flex-1">

                    {step === 'upload' && (
                        <div className="text-center py-4 space-y-6">

                            {/* Project Selector */}
                            <div className="max-w-md mx-auto text-left">
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Proyecto Destino
                                </label>
                                {loadingProjects ? (
                                    <div className="h-10 bg-white/5 rounded animate-pulse"></div>
                                ) : (
                                    <div className="relative">
                                        {isProjectLocked ? (
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                        ) : (
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                        )}
                                        <select
                                            value={selectedProject}
                                            onChange={(e) => setSelectedProject(e.target.value)}
                                            disabled={isProjectLocked}
                                            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 bg-black/20 text-white ${isProjectLocked
                                                ? 'border-white/5 text-white/40 cursor-not-allowed'
                                                : 'border-white/20'
                                                }`}
                                        >
                                            <option value="" className="bg-gray-800">Seleccione un proyecto...</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id} className="bg-gray-800">
                                                    {p.nombre} ({p.codigo})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {isProjectLocked && (
                                    <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                                        <Lock className="w-3 h-3" />
                                        Proyecto asignado automáticamente según tu usuario
                                    </p>
                                )}
                                {!selectedProject && !loadingProjects && (
                                    <p className="text-xs text-amber-400 mt-1">
                                        * Debe seleccionar un proyecto antes de cargar el archivo.
                                    </p>
                                )}
                            </div>

                            <div
                                className={`border-2 border-dashed rounded-xl p-10 transition-colors ${selectedProject
                                    ? 'border-white/20 hover:bg-white/5 cursor-pointer'
                                    : 'border-white/10 bg-white/5 opacity-60 cursor-not-allowed'
                                    }`}
                                onClick={() => selectedProject && fileInputRef.current?.click()}
                            >
                                <FileSpreadsheet className={`w-12 h-12 mx-auto mb-4 ${selectedProject ? 'text-green-500' : 'text-white/20'}`} />
                                <p className="text-white font-medium">Click para seleccionar archivo Excel o CSV</p>
                                <p className="text-xs text-white/40 mt-2">Formatos soportados: .xlsx, .xls, .csv</p>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileChange}
                                disabled={!selectedProject}
                            />

                            <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20 text-left">
                                <h4 className="text-sm font-bold text-blue-300 mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Instrucciones
                                </h4>
                                <p className="text-xs text-blue-200/80 mb-3">
                                    El archivo debe contener al menos las columnas <strong>RUT</strong> y <strong>NOMBRE</strong>.
                                    Opcionalmente puede incluir EMAIL, TELEFONO, CARGO, <strong>CODIGO</strong> y <strong>JORNADA</strong>.
                                </p>
                                <button
                                    onClick={downloadTemplate}
                                    className="text-xs flex items-center gap-1 text-blue-400 font-semibold hover:underline"
                                >
                                    <Download className="w-3 h-3" />
                                    Descargar Plantilla Excel
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div>
                            <div className="mb-4 flex items-center justify-between">
                                <h4 className="font-semibold text-white">Vista Previa ({parsedData.length} registros)</h4>
                                <button
                                    onClick={() => setStep('upload')}
                                    className="text-sm text-blue-400 hover:underline"
                                >
                                    Cambiar archivo
                                </button>
                            </div>
                            <div className="border border-white/10 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                <table className="min-w-full divide-y divide-white/10 text-sm">
                                    <thead className="bg-white/5">
                                        <tr>
                                            {parsedData.length > 0 && Object.keys(parsedData[0]).slice(0, 5).map((header) => (
                                                <th key={header} className="px-4 py-2 text-left text-xs font-medium text-white/60 uppercase">{header}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-black/20 divide-y divide-white/10 text-white/80">
                                        {parsedData.slice(0, 5).map((row, idx) => (
                                            <tr key={idx}>
                                                {Object.values(row).slice(0, 5).map((val: any, i) => (
                                                    <td key={i} className="px-4 py-2 truncate max-w-[150px]">{val}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {parsedData.length > 5 && (
                                <p className="text-xs text-white/40 mt-2 text-center">... y {parsedData.length - 5} más</p>
                            )}
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p className="text-white/60">Procesando e importando datos...</p>
                        </div>
                    )}

                    {step === 'result' && importResult && (
                        <div className="text-center">
                            {importResult.success ? (
                                <div className="mb-6">
                                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">Importación Completada</h4>
                                    <p className="text-white/80">
                                        Se importaron <span className="font-bold text-green-400">{importResult.imported}</span> registros correctamente.
                                    </p>
                                    {importResult.skipped > 0 && (
                                        <p className="text-white/50 mt-1">
                                            {importResult.skipped} registros omitidos (duplicados o errores).
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="mb-6">
                                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <AlertCircle className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">Error en Importación</h4>
                                    <p className="text-red-400">{importResult.error}</p>
                                </div>
                            )}

                            {importResult.errors && importResult.errors.length > 0 && (
                                <div className="mt-4 text-left bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                                    <h5 className="font-bold text-red-300 text-sm mb-2">Detalle de Errores:</h5>
                                    <ul className="list-disc list-inside text-xs text-red-200 max-h-40 overflow-y-auto">
                                        {importResult.errors.map((err: any, idx: number) => (
                                            <li key={idx}>
                                                <span className="font-medium">{err.rut}:</span> {err.error}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="relative p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                    {step === 'result' ? (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
                        >
                            Cerrar
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                                disabled={step === 'importing'}
                            >
                                Cancelar
                            </button>
                            {step === 'preview' && (
                                <button
                                    onClick={handleImport}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    Importar {parsedData.length} Registros
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

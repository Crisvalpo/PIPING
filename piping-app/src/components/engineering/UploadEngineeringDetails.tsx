/**
 * UploadEngineeringDetails Component
 * 
 * Componente para cargar detalles de ingeniería de una revisión:
 * - Spools Welds
 * - Material Take-Off  
 * - Bolted Joints
 * 
 * Validaciones:
 * 1. Verifica que el isométrico y revisión existan
 * 2. Marca automáticamente como SPOOLEADO si no hay revisión anterior spooleada
 * 3. Solicita evaluación de impactos si ya existe una revisión spooleada
 */

'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Clock, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { searchIsometrics, getIsometricCodes } from '@/services/engineering';
import type {
    SpoolsWeldsExcelRow,
    MaterialTakeOffExcelRow,
    BoltedJointsExcelRow
} from '@/types/engineering';

interface UploadEngineeringDetailsProps {
    proyectoId: string;
    onUploadComplete?: (result: any) => void;
}

type DetailType = 'spools_welds' | 'material_take_off' | 'bolted_joints';

interface ParsedData {
    spoolsWelds: SpoolsWeldsExcelRow[];
    materialTakeOff: MaterialTakeOffExcelRow[];
    boltedJoints: BoltedJointsExcelRow[];
}

export default function UploadEngineeringDetails({
    proyectoId,
    onUploadComplete
}: UploadEngineeringDetailsProps) {
    const [isoNumber, setIsoNumber] = useState('');
    const [revisionCode, setRevisionCode] = useState('');
    const [selectedType, setSelectedType] = useState<DetailType>('spools_welds');
    const [parsedData, setParsedData] = useState<ParsedData>({
        spoolsWelds: [],
        materialTakeOff: [],
        boltedJoints: []
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [availableIsometrics, setAvailableIsometrics] = useState<any[]>([]);

    useEffect(() => {
        if (proyectoId) {
            loadIsometrics();
        }
    }, [proyectoId]);

    async function loadIsometrics() {
        try {
            // Cargar solo códigos para el datalist (mucho más rápido y completo)
            const codes = await getIsometricCodes(proyectoId);
            setAvailableIsometrics(codes);
        } catch (error) {
            console.error("Error loading isometrics:", error);
        }
    }

    const handleIsoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedIsoCode = e.target.value;
        setIsoNumber(selectedIsoCode);

        // Verificar si es un isométrico válido de la lista
        const isoExists = availableIsometrics.find(i => i.codigo === selectedIsoCode);

        if (isoExists) {
            // Si existe, cargar sus detalles (revisiones) para obtener la vigente
            try {
                const result = await searchIsometrics(proyectoId, selectedIsoCode, 0, 1, { status: 'ALL' });
                if (result.data && result.data.length > 0) {
                    const fullIso = result.data[0];
                    if (fullIso.revisions) {
                        const activeRev = fullIso.revisions.find((r: any) => r.estado === 'VIGENTE');
                        if (activeRev) {
                            setRevisionCode(activeRev.codigo);
                        } else {
                            setRevisionCode('');
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching iso details:", error);
            }
        } else {
            setRevisionCode('');
        }
    };

    const handleDownloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        const headers = expectedColumns[selectedType];
        const ws = XLSX.utils.json_to_sheet([], { header: headers });
        XLSX.utils.book_append_sheet(wb, ws, selectedType);
        XLSX.writeFile(wb, `Template_${selectedType}.xlsx`);
    };

    // Mapeo de tipo a columnas esperadas
    const expectedColumns: Record<DetailType, string[]> = {
        spools_welds: [
            'ISO NUMBER', 'REV', 'LINE NUMBER', 'SPOOL NUMBER', 'SHEET',
            'WELD NUMBER', 'DESTINATION', 'TYPE WELD', 'NPS', 'SCH',
            'THICKNESS', 'PIPING CLASS', 'MATERIAL'
        ],
        material_take_off: [
            'LINE NUMBER', 'AREA', 'SHEET', 'SPOOL NUMBER', 'SPOOL-ID',
            'PIPING CLASS', 'REV', 'QTY', 'QTY UNIT', 'ITEM CODE', 'FAB'
        ],
        bolted_joints: [
            'ISO NUMBER', 'REV', 'LINE NUMBER', 'SHEET', 'FLANGED JOINT NUMBER',
            'PIPING CLASS', 'MATERIAL', 'RATING', 'NPS', 'BOLT SIZE'
        ]
    };

    /**
     * Maneja la carga del archivo Excel
     */
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            // Validar columnas
            if (jsonData.length === 0) {
                alert('El archivo no contiene datos');
                return;
            }

            const firstRow = jsonData[0] as any;
            const actualColumns = Object.keys(firstRow);
            const expected = expectedColumns[selectedType];

            // Verificar que al menos algunas columnas clave estén presentes
            const hasRequiredColumns = expected.some(col => actualColumns.includes(col));

            if (!hasRequiredColumns) {
                alert(`El archivo no parece contener las columnas esperadas para ${selectedType}. 
                       Columnas esperadas: ${expected.join(', ')}`);
                return;
            }

            // Auto-detectar ISO NUMBER y REV si existen en el Excel
            if (selectedType === 'spools_welds' || selectedType === 'bolted_joints') {
                const firstDataRow = jsonData[0] as any;
                if (firstDataRow['ISO NUMBER'] && !isoNumber) {
                    setIsoNumber(String(firstDataRow['ISO NUMBER']));
                }
                if (firstDataRow['REV'] && !revisionCode) {
                    setRevisionCode(String(firstDataRow['REV']));
                }
            } else if (selectedType === 'material_take_off') {
                const firstDataRow = jsonData[0] as any;
                if (firstDataRow['REV'] && !revisionCode) {
                    setRevisionCode(String(firstDataRow['REV']));
                }
            }

            // Guardar datos parseados
            const newData = { ...parsedData };

            switch (selectedType) {
                case 'spools_welds':
                    newData.spoolsWelds = jsonData as SpoolsWeldsExcelRow[];
                    break;
                case 'material_take_off':
                    newData.materialTakeOff = jsonData as MaterialTakeOffExcelRow[];
                    break;
                case 'bolted_joints':
                    newData.boltedJoints = jsonData as BoltedJointsExcelRow[];
                    break;
            }

            setParsedData(newData);
            setResult(null);
        } catch (error) {
            console.error('Error al leer el archivo:', error);
            alert('Error al procesar el archivo Excel');
        }
    };

    /**
     * Envía los datos al servidor
     */
    const handleUpload = async () => {
        if (!isoNumber || !revisionCode) {
            alert('Debe ingresar el número de isométrico y código de revisión');
            return;
        }

        const hasData =
            parsedData.spoolsWelds.length > 0 ||
            parsedData.materialTakeOff.length > 0 ||
            parsedData.boltedJoints.length > 0;

        if (!hasData) {
            alert('Debe cargar al menos un archivo Excel antes de enviar');
            return;
        }

        setIsProcessing(true);
        setResult(null);

        try {
            // Obtener token de autenticación
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setResult({
                    success: false,
                    message: 'No hay sesión activa. Por favor, inicia sesión nuevamente.'
                });
                setIsProcessing(false);
                return;
            }

            const response = await fetch('/api/engineering/upload-details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    iso_number: isoNumber,
                    revision_code: revisionCode,
                    proyecto_id: proyectoId,
                    details: {
                        spoolsWelds: parsedData.spoolsWelds.length > 0 ? parsedData.spoolsWelds : undefined,
                        materialTakeOff: parsedData.materialTakeOff.length > 0 ? parsedData.materialTakeOff : undefined,
                        boltedJoints: parsedData.boltedJoints.length > 0 ? parsedData.boltedJoints : undefined
                    }
                })
            });

            const result = await response.json();
            setResult(result);

            if (result.success && onUploadComplete) {
                onUploadComplete(result);
            }
        } catch (error) {
            console.error('Error al cargar detalles:', error);
            setResult({
                success: false,
                message: 'Error de conexión al servidor'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Limpia el formulario
     */
    const handleReset = () => {
        setIsoNumber('');
        setRevisionCode('');
        setParsedData({
            spoolsWelds: [],
            materialTakeOff: [],
            boltedJoints: []
        });
        setResult(null);
    };

    const dataCounts = {
        spoolsWelds: parsedData.spoolsWelds.length,
        materialTakeOff: parsedData.materialTakeOff.length,
        boltedJoints: parsedData.boltedJoints.length
    };

    const totalRows = dataCounts.spoolsWelds + dataCounts.materialTakeOff + dataCounts.boltedJoints;

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
                <Upload className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">
                    Cargar Detalles de Ingeniería
                </h2>
            </div>

            {/* Paso 1: Identificación de la revisión */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                    1. Identificar Revisión
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Número de Isométrico *
                        </label>
                        <input
                            type="text"
                            list="isometrics-list"
                            value={isoNumber}
                            onChange={handleIsoChange}
                            placeholder="Buscar Isométrico..."
                            className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 
                                     rounded-lg text-white placeholder-gray-500
                                     focus:outline-none focus:border-blue-500"
                        />
                        <datalist id="isometrics-list">
                            {availableIsometrics.map(iso => (
                                <option key={iso.id} value={iso.codigo} />
                            ))}
                        </datalist>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Código de Revisión *
                        </label>
                        <input
                            type="text"
                            value={revisionCode}
                            onChange={(e) => setRevisionCode(e.target.value)}
                            placeholder="Ej: 0, A, 1"
                            className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 
                                     rounded-lg text-white placeholder-gray-500
                                     focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Paso 2: Selección de tipo de detalle */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                    2. Seleccionar Tipo de Detalle
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => setSelectedType('spools_welds')}
                        className={`px-4 py-3 rounded-lg font-medium transition-all ${selectedType === 'spools_welds'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        <FileSpreadsheet className="w-5 h-5 inline-block mr-2" />
                        Spools Welds
                        {dataCounts.spoolsWelds > 0 && (
                            <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                                {dataCounts.spoolsWelds}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setSelectedType('material_take_off')}
                        className={`px-4 py-3 rounded-lg font-medium transition-all ${selectedType === 'material_take_off'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        <FileSpreadsheet className="w-5 h-5 inline-block mr-2" />
                        Material Take-Off
                        {dataCounts.materialTakeOff > 0 && (
                            <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                                {dataCounts.materialTakeOff}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setSelectedType('bolted_joints')}
                        className={`px-4 py-3 rounded-lg font-medium transition-all ${selectedType === 'bolted_joints'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        <FileSpreadsheet className="w-5 h-5 inline-block mr-2" />
                        Bolted Joints
                        {dataCounts.boltedJoints > 0 && (
                            <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                                {dataCounts.boltedJoints}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Paso 3: Cargar archivo */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                    3. Cargar Archivo Excel
                </h3>
                <div className="bg-gray-900/30 border-2 border-dashed border-gray-600 rounded-lg p-8">
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="excel-upload"
                    />
                    <label
                        htmlFor="excel-upload"
                        className="flex flex-col items-center cursor-pointer"
                    >
                        <Upload className="w-12 h-12 text-gray-400 mb-3" />
                        <span className="text-gray-300 font-medium mb-1">
                            Haz clic para seleccionar un archivo Excel
                        </span>
                        <span className="text-sm text-gray-500">
                            Tipo seleccionado: {selectedType.replace('_', ' ').toUpperCase()}
                        </span>
                    </label>
                </div>

                {/* Mostrar columnas esperadas y botón de descarga */}
                <div className="mt-3 flex justify-between items-start gap-4">
                    <div className="bg-gray-900/20 rounded-lg p-4 flex-1">
                        <p className="text-sm text-gray-400 mb-2">
                            <strong>Columnas esperadas:</strong>
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {expectedColumns[selectedType].map(col => (
                                <span
                                    key={col}
                                    className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
                                >
                                    {col}
                                </span>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleDownloadTemplate}
                        className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap"
                    >
                        <Download className="w-4 h-4" />
                        Descargar Plantilla
                    </button>
                </div>
            </div>

            {/* Resumen de datos cargados */}
            {totalRows > 0 && (
                <div className="mb-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2">
                        📊 Datos Cargados
                    </h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                        {dataCounts.spoolsWelds > 0 && (
                            <li>✓ Spools Welds: {dataCounts.spoolsWelds} filas</li>
                        )}
                        {dataCounts.materialTakeOff > 0 && (
                            <li>✓ Material Take-Off: {dataCounts.materialTakeOff} filas</li>
                        )}
                        {dataCounts.boltedJoints > 0 && (
                            <li>✓ Bolted Joints: {dataCounts.boltedJoints} filas</li>
                        )}
                    </ul>
                </div>
            )}

            {/* Resultado */}
            {result && (
                <div
                    className={`mb-6 rounded-lg p-4 ${result.success
                        ? 'bg-green-900/20 border border-green-500/30'
                        : 'bg-red-900/20 border border-red-500/30'
                        }`}
                >
                    <div className="flex items-start gap-3">
                        {result.success ? (
                            <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                            <p className={`font-semibold mb-1 ${result.success ? 'text-green-300' : 'text-red-300'
                                }`}>
                                {result.message}
                            </p>

                            {result.success && result.was_auto_spooled && (
                                <p className="text-sm text-blue-300 flex items-center gap-2 mt-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    La revisión se marcó automáticamente como SPOOLEADO
                                </p>
                            )}

                            {result.success && result.requires_impact_evaluation && (
                                <p className="text-sm text-yellow-300 flex items-center gap-2 mt-2">
                                    <Clock className="w-4 h-4" />
                                    Se requiere evaluación de impactos (existe revisión anterior spooleada)
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-3">
                <button
                    onClick={handleUpload}
                    disabled={isProcessing || !isoNumber || !revisionCode || totalRows === 0}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 
                             disabled:bg-gray-600 disabled:cursor-not-allowed
                             text-white font-semibold rounded-lg transition-colors
                             flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Procesando...
                        </>
                    ) : (
                        <>
                            <Upload className="w-5 h-5" />
                            Cargar Detalles
                        </>
                    )}
                </button>

                <button
                    onClick={handleReset}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 
                             disabled:bg-gray-800 disabled:cursor-not-allowed
                             text-white font-semibold rounded-lg transition-colors"
                >
                    Limpiar
                </button>
            </div>
        </div>
    );
}

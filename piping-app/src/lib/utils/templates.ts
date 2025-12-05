import * as XLSX from 'xlsx';

export const TEMPLATES = {
    isometricos: [
        'ISO NUMBER', 'LINE NUMBER', 'REV', 'SHEET', 'AREA'
    ],
    spools: [
        'SPOOL NUMBER', 'ISO NUMBER', 'LINE NUMBER', 'REV', 'WEIGHT', 'DIAMETER'
    ],
    welds: [
        'WELD NUMBER', 'SPOOL NUMBER', 'TYPE WELD', 'NPS', 'SCH', 'THICKNESS',
        'PIPING CLASS', 'MATERIAL', 'DESTINATION', 'SHEET'
    ],
    mto: [
        'ITEM CODE', 'QTY', 'QTY UNIT', 'PIPING CLASS', 'FAB',
        'SHEET', 'LINE NUMBER', 'AREA', 'SPOOL-ID',
        'SPOOL NUMBER', 'REV'
    ],
    flanges: [
        'FLANGED JOINT NUMBER', 'PIPING CLASS', 'MATERIAL', 'RATING',
        'NPS', 'BOLT SIZE', 'SHEET', 'LINE NUMBER',
        'ISO NUMBER', 'REV'
    ],
    valvulas: [
        'ID_Valvula', 'Descripcion', 'TYPE', 'Tipo Conexión',
        'PIPING CLASS', 'MATERIAL', 'NPS', 'RATING',
        'SHEET', 'REV', 'ID_IsoNumber'
    ],
    soportes: [
        'Tag Soporte', 'Marca Soporte', 'Modelo Soporte', 'Tipo Soporte',
        'Ø', 'Material Cañeria', 'Peso Unitario', 'AREA',
        'Sub-Área', 'Hoja', 'Rev.', 'N° Línea', 'N° Isométrico'
    ]
};

export function downloadTemplate(type: string) {
    const headers = TEMPLATES[type as keyof typeof TEMPLATES];
    if (!headers) return;

    // Crear un libro de trabajo y una hoja con los encabezados
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    // Ajustar ancho de columnas
    const wscols = headers.map(h => ({ wch: h.length + 5 }));
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    // Generar nombre de archivo
    const fileName = `template_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, fileName);
}

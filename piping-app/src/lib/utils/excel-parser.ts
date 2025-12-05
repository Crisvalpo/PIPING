import * as XLSX from 'xlsx';

export interface ParsedData {
    isometricos: any[];
    spools: any[];
    juntas: any[];
    materiales: any[];
    uniones_enflanchadas: any[];
    valvulas: any[];
    soportes: any[];
}

/**
 * Parsea un archivo Excel y extrae los datos según el tipo de reporte
 */
export async function parseExcelFile(file: File, reportType: string): Promise<any[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // Asumimos que los datos están en la primera hoja
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);

    return data;
}

/**
 * Normaliza los datos de Isométricos
 */
export function normalizeIsometricos(rawData: any[], projectId: string): any[] {
    return rawData.map(row => ({
        proyecto_id: projectId,
        iso_number: row['ISO NUMBER'],
        line_number: row['LINE NUMBER'],
        revision: row['REV'],
        sheet: row['SHEET'],
        area: row['AREA']
    }));
}

/**
 * Normaliza los datos de Spools
 */
export function normalizeSpools(rawData: any[], projectId: string): any[] {
    return rawData.map(row => ({
        proyecto_id: projectId,
        spool_tag: row['SPOOL NUMBER'],
        iso_number: row['ISO NUMBER'], // Para buscar el isométrico
        line_number: row['LINE NUMBER'],
        revision: row['REV'],
        weight: parseFloat(row['WEIGHT']) || null,
        diameter: row['DIAMETER']
    }));
}

/**
 * Normaliza los datos de Welds (Juntas) desde el formato SpoolGen
 */
export function normalizeWelds(rawData: any[], projectId: string): any[] {
    return rawData.map(row => ({
        proyecto_id: projectId,
        weld_number: row['WELD NUMBER'],
        spool_number: row['SPOOL NUMBER'], // Para buscar el spool
        type_weld: row['TYPE WELD'],
        nps: row['NPS'],
        sch: row['SCH'],
        thickness: parseFloat(row['THICKNESS']) || null,
        piping_class: row['PIPING CLASS'],
        material: row['MATERIAL'],
        destination: row['DESTINATION'],
        sheet: row['SHEET']
    }));
}

/**
 * Normaliza los datos de MTO (Materiales)
 */
export function normalizeMTO(rawData: any[], projectId: string): any[] {
    return rawData.map(row => ({
        proyecto_id: projectId,
        item_code: row['ITEM CODE'],
        qty: parseFloat(row['QTY']) || 0,
        qty_unit: row['QTY UNIT'],
        piping_class: row['PIPING CLASS'],
        fab: row['FAB'],
        sheet: row['SHEET'],
        line_number: row['LINE NUMBER'],
        area: row['AREA'],
        // Datos del spool
        spool_full_id: row['SPOOL-ID'],
        spool_number: row['SPOOL NUMBER'],
        revision: row['REV']
    }));
}

/**
 * Normaliza los datos de Flanged Joints (Uniones Enflanchadas)
 */
export function normalizeFlangedJoints(rawData: any[], projectId: string): any[] {
    return rawData.map(row => ({
        proyecto_id: projectId,
        tag: row['FLANGED JOINT NUMBER'],
        piping_class: row['PIPING CLASS'],
        material: row['MATERIAL'],
        rating: row['RATING'],
        nps: row['NPS'],
        bolt_size: row['BOLT SIZE'],
        sheet: row['SHEET'],
        line_number: row['LINE NUMBER'],
        // Datos del isométrico
        iso_number: row['ISO NUMBER'],
        revision: row['REV']
    }));
}

/**
 * Normaliza los datos de Válvulas
 */
export function normalizeValvulas(rawData: any[], projectId: string): any[] {
    return rawData.map(row => ({
        proyecto_id: projectId,
        tag: row['ID_Valvula'],
        descripcion: row['Descripcion'],
        tipo_valvula: row['TYPE'],
        tipo_conexion: row['Tipo Conexión'],
        piping_class: row['PIPING CLASS'],
        material: row['MATERIAL'],
        nps: row['NPS'],
        rating: row['RAITING'] || row['RATING'], // Soportar ambas variantes
        sheet: row['SHEET'],
        revision: row['REV'],
        // Datos del isométrico
        iso_number: row['ID_IsoNumber']
    }));
}

/**
 * Normaliza los datos de Soportes
 */
export function normalizeSoportes(rawData: any[], projectId: string): any[] {
    return rawData.map(row => ({
        proyecto_id: projectId,
        tag: row['Tag Soporte'],
        marca: row['Marca Soporte'],
        modelo: row['Modelo Soporte'],
        tipo: row['Tipo Soporte'],
        nps: row['Ø'],
        material_caneria: row['Material Cañeria'],
        peso_unitario_kg: parseFloat(row['Peso Unitario']) || null,
        area: row['AREA'],
        sub_area: row['Sub-Área'],
        sheet: row['Hoja'],
        revision: row['Rev.'],
        line_number: row['N° Línea'],
        // Datos del isométrico
        iso_number: row['N° Isométrico']
    }));
}

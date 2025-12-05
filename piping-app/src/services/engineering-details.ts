/**
 * Engineering Details Service
 * 
 * Servicio para cargar los detalles de ingeniería de una revisión:
 * 1. Spools Welds (soldaduras por spool)
 * 2. Material Take-Off (materiales por spool)  
 * 3. Bolted Joints (juntas empernadas)
 * 
 * Lógica de negocio:
```typescript
/**
 * Engineering Details Service
 * 
 * Servicio para cargar los detalles de ingeniería de una revisión:
 * 1. Spools Welds (soldaduras por spool)
 * 2. Material Take-Off (materiales por spool)  
 * 3. Bolted Joints (juntas empernadas)
 * 
 * Lógica de negocio:
 * - Al cargar detalles, primero verifica que el isométrico y revisión existan
 * - Si la revisión está en estado VIGENTE, procede con la carga
 * - Si no existe una revisión anterior SPOOLEADA, marca automáticamente como SPOOLEADO
 * - Si existe una revisión SPOOLEADA anterior, requiere evaluación de impactos
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
    SpoolWeld,
    MaterialTakeOff,
    BoltedJoint,
    SpoolsWeldsExcelRow,
    MaterialTakeOffExcelRow,
    BoltedJointsExcelRow
} from '@/types/engineering';

// =====================================================
// Tipos de respuesta
// =====================================================

export interface UploadDetailsResult {
    success: boolean;
    message: string;
    revision_id?: string;
    was_auto_spooled: boolean; // Si se marcó automáticamente como spooleado
    requires_impact_evaluation: boolean; // Si requiere evaluación de impactos
    details: {
        welds_inserted?: number;
        materials_inserted?: number;
        bolted_joints_inserted?: number;
    };
    errors?: string[];
}

export interface RevisionValidation {
    exists: boolean;
    is_vigente: boolean;
    iso_number?: string;
    revision_code?: string;
    isometric_id?: string;
    proyecto_id?: string;
}

// =====================================================
// Validación de revisión
// =====================================================

/**
 * Verifica que el isométrico y revisión existan y estén en estado VIGENTE
 */
export async function validateRevisionForDetails(
    isoNumber: string,
    revisionCode: string,
    proyectoId: string,
    supabase: SupabaseClient
): Promise<RevisionValidation> {
    console.log('[validateRevision] Buscando:', {
        isoNumber,
        revisionCode,
        proyectoId
    });

    // Buscar el isométrico (tomar el más reciente si hay duplicados)
    const { data: isometrics, error: isoError } = await supabase
        .from('isometrics')
        .select('id, codigo')
        .eq('proyecto_id', proyectoId)
        .eq('codigo', isoNumber)
        .order('created_at', { ascending: false })
        .limit(1);

    const isometric = isometrics?.[0];

    console.log('[validateRevision] Resultado isometrics:', {
        found: !!isometric,
        error: isoError?.message,
        isometric,
        totalFound: isometrics?.length
    });

    if (isoError || !isometric) {
        console.warn('[validateRevision] No se encontró isométrico:', isoNumber);
        return {
            exists: false,
            is_vigente: false
        };
    }

    // Buscar la revisión (tomar la más reciente si hay duplicados)
    const { data: revisions, error: revError } = await supabase
        .from('isometric_revisions')
        .select('id, codigo, estado')
        .eq('isometric_id', isometric.id)
        .eq('codigo', revisionCode)
        .order('created_at', { ascending: false })
        .limit(1);

    const revision = revisions?.[0];

    console.log('[validateRevision] Resultado revisions:', {
        found: !!revision,
        error: revError?.message,
        revision,
        totalFound: revisions?.length
    });

    if (revError || !revision) {
        console.warn('[validateRevision] No se encontró revisión:', revisionCode, 'para isométrico:', isometric.id);
        return {
            exists: false,
            is_vigente: false,
            iso_number: isoNumber
        };
    }

    if (revisions && revisions.length > 1) {
        console.warn(`[validateRevision] ⚠️ DUPLICADO: Se encontraron ${revisions.length} revisiones con código "${revisionCode}". Usando la más reciente.`);
    }

    return {
        exists: true,
        is_vigente: revision.estado === 'VIGENTE',
        iso_number: isoNumber,
        revision_code: revisionCode,
        isometric_id: isometric.id,
        proyecto_id: proyectoId
    };
}

/**
 * Verifica si una revisión debe ser marcada automáticamente como SPOOLEADO.
 * Esto ocurre si no hay ninguna revisión anterior para el mismo isométrico que ya tenga trabajo spooleado.
 */
export async function shouldAutoSpoolRevision(revisionId: string, supabase: SupabaseClient): Promise<boolean> {
    // 1. Get the isometric_id for the current revision
    const { data: currentRevision, error: currentRevError } = await supabase
        .from('isometric_revisions')
        .select('isometric_id')
        .eq('id', revisionId)
        .single();

    if (currentRevError || !currentRevision) {
        console.error('[shouldAutoSpoolRevision] Error fetching current revision:', currentRevError?.message);
        return false; // Cannot determine, so don't auto-spool
    }

    // 2. Check for any *other* revision for the same isometric that has work already spooled
    // We check spooling_status instead of estado (VIGENTE/OBSOLETA/ELIMINADA)
    const { data: spooledRevisions, error: spooledRevError } = await supabase
        .from('isometric_revisions')
        .select('id, spooling_status')
        .eq('isometric_id', currentRevision.isometric_id)
        .neq('id', revisionId) // Exclude the current revision itself
        .in('spooling_status', ['SPOOLEADO', 'OK', 'ENVIADO'])
        .limit(1);

    if (spooledRevError) {
        console.error('[shouldAutoSpoolRevision] Error checking for previous spooled revisions:', spooledRevError.message);
        return false; // Cannot determine, so don't auto-spool
    }

    // If no previous spooled revisions are found, then this one should be auto-spooled.
    const shouldAuto = spooledRevisions?.length === 0;
    console.log(`[shouldAutoSpoolRevision] Found ${spooledRevisions?.length || 0} previous spooled revisions. Should auto-spool: ${shouldAuto}`);
    return shouldAuto;
}

/**
 * Marca una revisión como SPOOLEADO
 */
export async function markRevisionAsSpooled(
    revisionId: string,
    supabase: SupabaseClient,
    userId?: string
): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
        .rpc('mark_revision_as_spooled', {
            p_revision_id: revisionId,
            p_user_id: userId || null
        });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

// =====================================================
// Mapeo de datos desde Excel a DB
// =====================================================

function mapSpoolWeldRow(
    excelRow: SpoolsWeldsExcelRow,
    revisionId: string,
    proyectoId: string,
    userId?: string
): Omit<SpoolWeld, 'id' | 'created_at'> {
    return {
        revision_id: revisionId,
        proyecto_id: proyectoId,
        iso_number: String(excelRow['ISO NUMBER'] || ''),
        rev: String(excelRow['REV'] || ''),
        line_number: excelRow['LINE NUMBER'] ? String(excelRow['LINE NUMBER']) : undefined,
        spool_number: String(excelRow['SPOOL NUMBER'] || ''),
        sheet: excelRow['SHEET'] ? String(excelRow['SHEET']) : undefined,
        weld_number: String(excelRow['WELD NUMBER'] || ''),
        destination: excelRow['DESTINATION'] ? String(excelRow['DESTINATION']) : undefined,
        type_weld: excelRow['TYPE WELD'] ? String(excelRow['TYPE WELD']) : undefined,
        nps: excelRow['NPS'] ? String(excelRow['NPS']) : undefined,
        sch: excelRow['SCH'] ? String(excelRow['SCH']) : undefined,
        thickness: excelRow['THICKNESS'] ? String(excelRow['THICKNESS']) : undefined,
        piping_class: excelRow['PIPING CLASS'] ? String(excelRow['PIPING CLASS']) : undefined,
        material: excelRow['MATERIAL'] ? String(excelRow['MATERIAL']) : undefined,
        created_by: userId
    };
}

function mapMaterialTakeOffRow(
    excelRow: MaterialTakeOffExcelRow,
    revisionId: string,
    proyectoId: string,
    userId?: string
): Omit<MaterialTakeOff, 'id' | 'created_at'> {
    return {
        revision_id: revisionId,
        proyecto_id: proyectoId,
        line_number: excelRow['LINE NUMBER'] ? String(excelRow['LINE NUMBER']) : undefined,
        area: excelRow['AREA'] ? String(excelRow['AREA']) : undefined,
        sheet: excelRow['SHEET'] ? String(excelRow['SHEET']) : undefined,
        spool_number: String(excelRow['SPOOL NUMBER'] || ''),
        spool_id: excelRow['SPOOL-ID'] ? String(excelRow['SPOOL-ID']) : undefined,
        piping_class: excelRow['PIPING CLASS'] ? String(excelRow['PIPING CLASS']) : undefined,
        rev: String(excelRow['REV'] || ''),
        qty: excelRow['QTY'] ? Number(excelRow['QTY']) : undefined,
        qty_unit: excelRow['QTY UNIT'] ? String(excelRow['QTY UNIT']) : undefined,
        item_code: excelRow['ITEM CODE'] ? String(excelRow['ITEM CODE']) : undefined,
        fab: excelRow['FAB'] ? String(excelRow['FAB']) : undefined,
        created_by: userId
    };
}

function mapBoltedJointRow(
    excelRow: BoltedJointsExcelRow,
    revisionId: string,
    proyectoId: string,
    userId?: string
): Omit<BoltedJoint, 'id' | 'created_at'> {
    return {
        revision_id: revisionId,
        proyecto_id: proyectoId,
        iso_number: String(excelRow['ISO NUMBER'] || ''),
        rev: String(excelRow['REV'] || ''),
        line_number: excelRow['LINE NUMBER'] ? String(excelRow['LINE NUMBER']) : undefined,
        sheet: excelRow['SHEET'] ? String(excelRow['SHEET']) : undefined,
        flanged_joint_number: String(excelRow['FLANGED JOINT NUMBER'] || ''),
        piping_class: excelRow['PIPING CLASS'] ? String(excelRow['PIPING CLASS']) : undefined,
        material: excelRow['MATERIAL'] ? String(excelRow['MATERIAL']) : undefined,
        rating: excelRow['RATING'] ? String(excelRow['RATING']) : undefined,
        nps: excelRow['NPS'] ? String(excelRow['NPS']) : undefined,
        bolt_size: excelRow['BOLT SIZE'] ? String(excelRow['BOLT SIZE']) : undefined,
        created_by: userId
    };
}

// =====================================================
// Funciones principales de carga
// =====================================================

/**
 * Carga detalles de Spools Welds desde un array de filas Excel
 */
export async function uploadSpoolsWelds(
    isoNumber: string,
    revisionCode: string,
    proyectoId: string,
    excelRows: SpoolsWeldsExcelRow[],
    supabase: SupabaseClient,
    userId?: string
): Promise<UploadDetailsResult> {
    // 1. Validar que exista el isométrico y revisión
    const validation = await validateRevisionForDetails(isoNumber, revisionCode, proyectoId, supabase);

    if (!validation.exists) {
        return {
            success: false,
            message: `No se encontró el isométrico "${isoNumber}" con revisión "${revisionCode}" en el sistema`,
            was_auto_spooled: false,
            requires_impact_evaluation: false,
            details: {},
            errors: ['Revisión no existe']
        };
    }

    if (!validation.is_vigente) {
        return {
            success: false,
            message: `La revisión "${revisionCode}" del isométrico "${isoNumber}" no está en estado VIGENTE`,
            was_auto_spooled: false,
            requires_impact_evaluation: false,
            details: {},
            errors: ['Revisión no vigente']
        };
    }

    // 2. Obtener el revision_id
    const { data: revision } = await supabase
        .from('isometric_revisions')
        .select('id')
        .eq('isometric_id', validation.isometric_id!)
        .eq('codigo', revisionCode)
        .single();

    if (!revision) {
        return {
            success: false,
            message: 'Error al obtener la revisión',
            was_auto_spooled: false,
            requires_impact_evaluation: false,
            details: {}
        };
    }

    const revisionId = revision.id;

    // 3. Mapear y validar filas
    const mappedRows = excelRows
        .filter(row => row['WELD NUMBER']) // Solo filas con weld number
        .map(row => mapSpoolWeldRow(row, revisionId, proyectoId, userId));

    if (mappedRows.length === 0) {
        return {
            success: false,
            message: 'No se encontraron filas válidas en el Excel',
            was_auto_spooled: false,
            requires_impact_evaluation: false,
            details: { welds_inserted: 0 }
        };
    }

    // 4. Insertar en la base de datos
    const { data: inserted, error: insertError } = await supabase
        .from('spools_welds')
        .insert(mappedRows)
        .select();

    if (insertError) {
        return {
            success: false,
            message: `Error al insertar soldaduras: ${insertError.message}`,
            was_auto_spooled: false,
            requires_impact_evaluation: false,
            details: {},
            errors: [insertError.message]
        };
    }

    // 5. Verificar si debe spoolearse automáticamente
    const shouldAutoSpool = await shouldAutoSpoolRevision(revisionId, supabase);
    let wasAutoSpooled = false;

    if (shouldAutoSpool) {
        const spoolResult = await markRevisionAsSpooled(revisionId, supabase, userId);
        wasAutoSpooled = spoolResult.success;
    }

    return {
        success: true,
        message: `Se cargaron ${inserted?.length || 0} soldaduras exitosamente`,
        revision_id: revisionId,
        was_auto_spooled: wasAutoSpooled,
        requires_impact_evaluation: !shouldAutoSpool,
        details: {
            welds_inserted: inserted?.length || 0
        }
    };
}

/**
 * Carga detalles de Material Take-Off desde un array de filas Excel
 */
export async function uploadMaterialTakeOff(
    isoNumber: string,
    revisionCode: string,
    proyectoId: string,
    excelRows: MaterialTakeOffExcelRow[],
    supabase: SupabaseClient,
    userId?: string
): Promise<UploadDetailsResult> {
    const validation = await validateRevisionForDetails(isoNumber, revisionCode, proyectoId, supabase);

    if (!validation.exists || !validation.is_vigente) {
        return {
            success: false,
            message: `Isométrico o revisión no válidos`,
            was_auto_spooled: false,
            requires_impact_evaluation: false,
            details: {}
        };
    }

    const { data: revision } = await supabase
        .from('isometric_revisions')
        .select('id')
        .eq('isometric_id', validation.isometric_id!)
        .eq('codigo', revisionCode)
        .single();

    if (!revision) {
        return {
            success: false,
            message: 'Error al obtener la revisión',
            was_auto_spooled: false,
            requires_impact_evaluation: false,
            details: {}
        };
    }

    const revisionId = revision.id;

    const mappedRows = excelRows
        .map(row => mapMaterialTakeOffRow(row, revisionId, proyectoId, userId));

    if (mappedRows.length === 0) {
        return {
            success: false,
            message: 'No se encontraron materiales válidos',
            was_auto_spooled: false,
            requires_impact_evaluation: false,
            details: { materials_inserted: 0 }
        };
    }

    const { data: inserted, error: insertError } = await supabase
        .from('material_take_off')
        .insert(mappedRows)
        .select();

    if (insertError) {
        return {
            success: false,
            message: `Error al insertar materiales: ${insertError.message}`,
            was_auto_spooled: false,
            requires_impact_evaluation: false,
            details: {},
            errors: [insertError.message]
        };
    }

    const shouldAutoSpool = await shouldAutoSpoolRevision(revisionId, supabase);
    let wasAutoSpooled = false;

    if (shouldAutoSpool) {
        const spoolResult = await markRevisionAsSpooled(revisionId, supabase, userId);
        wasAutoSpooled = spoolResult.success;
    }

    return {
        success: true,
        message: `Se cargaron ${inserted?.length || 0} materiales exitosamente`,
        revision_id: revisionId,
        was_auto_spooled: wasAutoSpooled,
        requires_impact_evaluation: !shouldAutoSpool,
        details: {
            materials_inserted: inserted?.length || 0
        }
    };
}

/**
 * Carga detalles de Bolted Joints desde un array de filas Excel
 */
export async function uploadBoltedJoints(
    isoNumber: string,
    revisionCode: string,
    proyectoId: string,
    excelRows: BoltedJointsExcelRow[],
    supabase: SupabaseClient,
    userId?: string
): Promise<UploadDetailsResult> {
    // Similar a uploadSpoolsWelds pero para bolted_joints

    const validation = await validateRevisionForDetails(isoNumber, revisionCode, proyectoId, supabase);

    if (!validation.exists || !validation.is_vigente) {
        return {
            success: false,
            message: `Isométrico o revisión no válidos`,
            was_auto_spooled: false,
            requires_impact_evaluation: false,
            details: {}
        };
    }

    const { data: revision } = await supabase
        .from('isometric_revisions')
        .select('id')
        .eq('isometric_id', validation.isometric_id!)
        .eq('codigo', revisionCode)
        .single();

    if (!revision) {
        return {
            success: false,
            message: 'Error al obtener la revisión',
            was_auto_spooled: false,
            requires_impact_evaluation: false,
            details: {}
        };
    }

    const revisionId = revision.id;

    const mappedRows = excelRows
        .filter(row => row['FLANGED JOINT NUMBER'])
        .map(row => mapBoltedJointRow(row, revisionId, proyectoId, userId));

    if (mappedRows.length === 0) {
        return {
            success: false,
            message: 'No se encontraron juntas empernadas válidas',
            was_auto_spooled: false,
            requires_impact_evaluation: false,
            details: { bolted_joints_inserted: 0 }
        };
    }

    const { data: inserted, error: insertError } = await supabase
        .from('bolted_joints')
        .insert(mappedRows)
        .select();

    if (insertError) {
        return {
            success: false,
            message: `Error al insertar juntas: ${insertError.message}`,
            was_auto_spooled: false,
            requires_impact_evaluation: false,
            details: {},
            errors: [insertError.message]
        };
    }

    const shouldAutoSpool = await shouldAutoSpoolRevision(revisionId, supabase);
    let wasAutoSpooled = false;

    if (shouldAutoSpool) {
        const spoolResult = await markRevisionAsSpooled(revisionId, supabase, userId);
        wasAutoSpooled = spoolResult.success;
    }

    return {
        success: true,
        message: `Se cargaron ${inserted?.length || 0} juntas empernadas exitosamente`,
        revision_id: revisionId,
        was_auto_spooled: wasAutoSpooled,
        requires_impact_evaluation: !shouldAutoSpool,
        details: {
            bolted_joints_inserted: inserted?.length || 0
        }
    };
}

/**
 * Función unificada para cargar todos los detalles de una revisión
 * Esta es la función principal que debería usarse desde el frontend
 */
export async function uploadEngineeringDetails(
    isoNumber: string,
    revisionCode: string,
    proyectoId: string,
    details: {
        spoolsWelds?: SpoolsWeldsExcelRow[];
        materialTakeOff?: MaterialTakeOffExcelRow[];
        boltedJoints?: BoltedJointsExcelRow[];
    },
    supabase: SupabaseClient,
    userId?: string
): Promise<UploadDetailsResult> {
    const results: UploadDetailsResult = {
        success: true,
        message: '',
        was_auto_spooled: false,
        requires_impact_evaluation: false,
        details: {},
        errors: []
    };

    // Cargar cada tipo de detalle si existe
    if (details.spoolsWelds && details.spoolsWelds.length > 0) {
        const weldsResult = await uploadSpoolsWelds(
            isoNumber,
            revisionCode,
            proyectoId,
            details.spoolsWelds,
            supabase,
            userId
        );

        results.details.welds_inserted = weldsResult.details.welds_inserted;
        // Only update if true, don't overwrite true with false from another upload
        results.was_auto_spooled = weldsResult.was_auto_spooled || results.was_auto_spooled;
        results.requires_impact_evaluation = weldsResult.requires_impact_evaluation || results.requires_impact_evaluation;

        if (!weldsResult.success) {
            results.success = false;
            results.errors?.push(...(weldsResult.errors || []));
        }
    }

    if (details.materialTakeOff && details.materialTakeOff.length > 0) {
        const materialsResult = await uploadMaterialTakeOff(
            isoNumber,
            revisionCode,
            proyectoId,
            details.materialTakeOff,
            supabase,
            userId
        );

        results.details.materials_inserted = materialsResult.details.materials_inserted;
        results.was_auto_spooled = materialsResult.was_auto_spooled || results.was_auto_spooled;
        results.requires_impact_evaluation = materialsResult.requires_impact_evaluation || results.requires_impact_evaluation;

        if (!materialsResult.success) {
            results.success = false;
            results.errors?.push(...(materialsResult.errors || []));
        }
    }

    if (details.boltedJoints && details.boltedJoints.length > 0) {
        const jointsResult = await uploadBoltedJoints(
            isoNumber,
            revisionCode,
            proyectoId,
            details.boltedJoints,
            supabase,
            userId
        );

        results.details.bolted_joints_inserted = jointsResult.details.bolted_joints_inserted;
        results.was_auto_spooled = jointsResult.was_auto_spooled || results.was_auto_spooled;
        results.requires_impact_evaluation = jointsResult.requires_impact_evaluation || results.requires_impact_evaluation;

        if (!jointsResult.success) {
            results.success = false;
            results.errors?.push(...(jointsResult.errors || []));
        }
    }

    // Generar mensaje resumen
    const insertedCounts = [];
    if (results.details.welds_inserted) {
        insertedCounts.push(`${results.details.welds_inserted} soldaduras`);
    }
    if (results.details.materials_inserted) {
        insertedCounts.push(`${results.details.materials_inserted} materiales`);
    }
    if (results.details.bolted_joints_inserted) {
        insertedCounts.push(`${results.details.bolted_joints_inserted} juntas empernadas`);
    }

    results.message = results.success
        ? `Detalles cargados exitosamente: ${insertedCounts.join(', ')}`
        : `Error al cargar algunos detalles: ${results.errors?.join(', ')}`;

    return results;
}

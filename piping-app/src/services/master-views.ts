import { supabase } from '@/lib/supabase';

export interface IsometricDetails {
    welds: any[];
    spools: any[];
    materials: any[];
    joints: any[];
}

export async function getIsometricDetails(revisionId: string): Promise<IsometricDetails> {
    // supabase is already imported


    // Fetch Welds
    const { data: welds, error: weldsError } = await supabase
        .from('spools_welds')
        .select('*')
        .eq('revision_id', revisionId)
        .order('weld_number', { ascending: true });

    if (weldsError) throw weldsError;

    // Fetch Materials
    const { data: materials, error: materialsError } = await supabase
        .from('material_take_off')
        .select('*')
        .eq('revision_id', revisionId)
        .order('item_code', { ascending: true });

    if (materialsError) throw materialsError;

    // Fetch Bolted Joints
    const { data: joints, error: jointsError } = await supabase
        .from('bolted_joints')
        .select('*')
        .eq('revision_id', revisionId)
        .order('flanged_joint_number', { ascending: true });

    if (jointsError) throw jointsError;

    // Derive Spools from Welds (group by spool_number)
    // Note: This is a simplification. Ideally we should have a 'spools' table if we want to track spool status independently.
    // But based on current schema, spools are implicit in spools_welds or material_take_off.
    // We can group welds by spool_number to get a list of spools.
    const spoolsMap = new Map();
    welds?.forEach(w => {
        if (w.spool_number) {
            if (!spoolsMap.has(w.spool_number)) {
                spoolsMap.set(w.spool_number, {
                    spool_number: w.spool_number,
                    welds_count: 0,
                    welds_executed: 0,
                    status: 'PENDING' // PENDING, PARTIAL, COMPLETE
                });
            }
            const spool = spoolsMap.get(w.spool_number);
            spool.welds_count++;
            if (w.executed) spool.welds_executed++;
        }
    });

    const spools = Array.from(spoolsMap.values()).map(s => ({
        ...s,
        status: s.welds_executed === 0 ? 'PENDING' : (s.welds_executed === s.welds_count ? 'COMPLETE' : 'PARTIAL')
    }));

    return {
        welds: welds || [],
        spools,
        materials: materials || [],
        joints: joints || []
    };
}

export async function updateWeldExecution(
    weldId: string,
    executed: boolean,
    date?: string,
    welderId?: string,
    foremanId?: string
) {
    // supabase is imported
    const { error } = await supabase
        .from('spools_welds')
        .update({
            executed,
            execution_date: executed ? (date || new Date().toISOString()) : null,
            welder_id: executed ? welderId : null,
            foreman_id: executed ? foremanId : null
        })
        .eq('id', weldId);

    if (error) throw error;
}

export async function updateJointExecution(
    jointId: string,
    executed: boolean,
    date?: string
) {
    // supabase is imported
    const { error } = await supabase
        .from('bolted_joints')
        .update({
            executed,
            execution_date: executed ? (date || new Date().toISOString()) : null
        })
        .eq('id', jointId);

    if (error) throw error;
}

// ============================================
// REWORK (RETRABAJO) FUNCTIONS
// ============================================

export type ReworkResponsibility = 'TERRENO' | 'INGENIERIA' | 'RECHAZO_END';

export interface WeldExecution {
    id: string;
    weld_id: string;
    version: number;
    execution_date: string;
    welder_id: string | null;
    foreman_id: string | null;
    status: 'VIGENTE' | 'RETRABAJO' | 'ANULADO';
    is_rework: boolean;
    rework_reason: string | null;
    rework_responsibility: ReworkResponsibility | null;
    created_at: string;
    reported_by_user: string | null;
}

/**
 * Get execution history for a weld
 */
export async function getWeldExecutions(weldId: string): Promise<WeldExecution[]> {
    const { data, error } = await supabase
        .from('weld_executions')
        .select('*')
        .eq('weld_id', weldId)
        .order('version', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Mark a weld for rework - sets current execution to RETRABAJO and resets weld to pending
 */
export async function markWeldForRework(
    weldId: string,
    responsibility: ReworkResponsibility,
    reason?: string
) {
    // 1. Get current execution
    const { data: currentExecution } = await supabase
        .from('weld_executions')
        .select('*')
        .eq('weld_id', weldId)
        .eq('status', 'VIGENTE')
        .single();

    // 2. If there's a current execution, mark it as RETRABAJO
    if (currentExecution) {
        await supabase
            .from('weld_executions')
            .update({
                status: 'RETRABAJO',
                rework_reason: reason,
                rework_responsibility: responsibility
            })
            .eq('id', currentExecution.id);
    }

    // 3. Increment rework count and reset weld to pending
    const { data: weld } = await supabase
        .from('spools_welds')
        .select('rework_count')
        .eq('id', weldId)
        .single();

    const newCount = (weld?.rework_count || 0) + 1;

    const { error } = await supabase
        .from('spools_welds')
        .update({
            executed: false,
            execution_date: null,
            welder_id: null,
            foreman_id: null,
            rework_count: newCount,
            current_execution_id: null
        })
        .eq('id', weldId);

    if (error) throw error;
}

/**
 * Register a new weld execution (handles versioning automatically)
 */
export async function registerWeldExecution(
    weldId: string,
    welderId: string,
    foremanId: string,
    executionDate?: string,
    reportedByUserId?: string
) {
    // 1. Get the latest version for this weld
    const { data: latestExecution } = await supabase
        .from('weld_executions')
        .select('version')
        .eq('weld_id', weldId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

    const newVersion = (latestExecution?.version || 0) + 1;
    const isRework = newVersion > 1;

    // 2. Create new execution record
    const { data: newExecution, error: insertError } = await supabase
        .from('weld_executions')
        .insert({
            weld_id: weldId,
            version: newVersion,
            execution_date: executionDate || new Date().toISOString(),
            welder_id: welderId,
            foreman_id: foremanId,
            status: 'VIGENTE',
            is_rework: isRework,
            reported_by_user: reportedByUserId || null
        })
        .select()
        .single();

    if (insertError) throw insertError;

    // 3. Update the main weld record
    const { error: updateError } = await supabase
        .from('spools_welds')
        .update({
            executed: true,
            execution_date: executionDate || new Date().toISOString(),
            welder_id: welderId,
            foreman_id: foremanId,
            current_execution_id: newExecution.id
        })
        .eq('id', weldId);

    if (updateError) throw updateError;

    return newExecution;
}

/**
 * Soft delete a weld (marks as deleted but keeps all history)
 */
export async function deleteWeld(weldId: string, reason: string, userId?: string) {
    const { error } = await supabase
        .from('spools_welds')
        .update({
            deleted: true,
            deletion_reason: reason,
            deleted_at: new Date().toISOString(),
            deleted_by: userId || null
        })
        .eq('id', weldId);

    if (error) throw error;
}

/**
 * Restore a deleted weld
 */
export async function restoreWeld(weldId: string) {
    const { error } = await supabase
        .from('spools_welds')
        .update({
            deleted: false,
            deletion_reason: null,
            deleted_at: null,
            deleted_by: null
        })
        .eq('id', weldId);

    if (error) throw error;
}

/**
 * Undo a false execution report - removes the execution and resets weld to pending
 */
export async function undoWeldExecution(weldId: string, reason: string, userId?: string) {
    // 1. Get current execution (may not exist)
    const { data: currentExecution } = await supabase
        .from('weld_executions')
        .select('*')
        .eq('weld_id', weldId)
        .eq('status', 'VIGENTE')
        .maybeSingle();

    // 2. If there's a current execution, mark it as ANULADO (voided)
    if (currentExecution) {
        await supabase
            .from('weld_executions')
            .update({
                status: 'ANULADO',
                rework_reason: reason
            })
            .eq('id', currentExecution.id);
    }

    // 3. Reset weld to pending state
    const { error } = await supabase
        .from('spools_welds')
        .update({
            executed: false,
            execution_date: null,
            welder_id: null,
            foreman_id: null,
            current_execution_id: null,
            undone_by: userId || null,
            undone_at: new Date().toISOString(),
            undo_reason: reason
        })
        .eq('id', weldId);

    if (error) throw error;
}

/**
 * Check if a weld number already exists in a revision
 */
export async function checkWeldNumberExists(revisionId: string, weldNumber: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('spools_welds')
        .select('id')
        .eq('revision_id', revisionId)
        .eq('weld_number', weldNumber)
        .limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
}

export type CreationType = 'TERRENO' | 'INGENIERIA';

export interface NewWeldData {
    revision_id: string;
    proyecto_id: string;
    iso_number: string;
    rev: string;
    line_number?: string;
    spool_number: string;
    sheet?: string;
    weld_number: string;
    destination?: string;
    type_weld?: string;
    nps?: string;
    sch?: string;
    thickness?: string;
    piping_class?: string;
    material?: string;
}

export interface FieldExecutionData {
    fecha: string;
    welderId: string;
    foremanId: string;
}

/**
 * Create a new weld from the field
 * For TERRENO: creates weld and immediately registers execution
 * For INGENIERIA: creates weld as pending
 */
export async function createFieldWeld(
    weldData: NewWeldData,
    creationType: CreationType,
    creationReason: string,
    userId?: string,
    executionData?: FieldExecutionData
) {
    // 1. Validate weld_number is unique
    const exists = await checkWeldNumberExists(weldData.revision_id, weldData.weld_number);
    if (exists) {
        throw new Error(`El número de unión ${weldData.weld_number} ya existe en esta isométrica`);
    }

    // 2. Create the weld
    const { data: newWeld, error: createError } = await supabase
        .from('spools_welds')
        .insert({
            ...weldData,
            created_by: userId || null,
            creation_type: creationType,
            creation_reason: creationReason,
            executed: false
        })
        .select()
        .single();

    if (createError) throw createError;

    // 3. If TERRENO, register execution immediately
    if (creationType === 'TERRENO' && executionData) {
        await registerWeldExecution(
            newWeld.id,
            executionData.welderId,
            executionData.foremanId,
            executionData.fecha,
            userId
        );

        // Return updated weld with execution
        return {
            ...newWeld,
            executed: true,
            execution_date: executionData.fecha,
            welder_id: executionData.welderId,
            foreman_id: executionData.foremanId
        };
    }

    return newWeld;
}

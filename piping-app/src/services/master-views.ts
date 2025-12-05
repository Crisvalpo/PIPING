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

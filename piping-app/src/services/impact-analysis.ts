import { supabase } from '@/lib/supabase'
import type { Spool, Joint } from '@/types/engineering'
import type { DiffResult, Impacto } from '@/types/impacts'

/**
 * Compara dos conjuntos de datos (Old vs New) y detecta cambios.
 * Esta función es PURA: no guarda en BD, solo retorna el análisis.
 */
export function calculateDiff(
    oldSpools: Spool[],
    newSpools: Partial<Spool>[],
    oldJoints: Joint[],
    newJoints: Partial<Joint>[]
): DiffResult {
    const result: DiffResult = {
        spools: { added: [], removed: [], modified: [] },
        joints: { added: [], removed: [], modified: [] }
    }

    // --- 1. ANALIZAR SPOOLS ---
    const oldSpoolMap = new Map(oldSpools.map(s => [s.nombre, s]))
    const newSpoolMap = new Map(newSpools.map(s => [s.nombre, s]))

    // Detectar NEW y MODIFY
    newSpools.forEach(newS => {
        const oldS = oldSpoolMap.get(newS.nombre!)

        if (!oldS) {
            result.spools.added.push(newS)
        } else {
            // Comparar campos críticos
            const changes = []
            if (newS.diametro_pulg !== oldS.diametro_pulg) changes.push({ field: 'diametro', old: oldS.diametro_pulg, new: newS.diametro_pulg })
            if (newS.material !== oldS.material) changes.push({ field: 'material', old: oldS.material, new: newS.material })
            if (newS.requiere_pwht !== oldS.requiere_pwht) changes.push({ field: 'pwht', old: oldS.requiere_pwht, new: newS.requiere_pwht })

            if (changes.length > 0) {
                result.spools.modified.push({ item: newS, changes })
            }
        }
    })

    // Detectar DELETE
    oldSpools.forEach(oldS => {
        if (!newSpoolMap.has(oldS.nombre)) {
            result.spools.removed.push(oldS)
        }
    })

    // --- 2. ANALIZAR JOINTS ---
    const oldJointMap = new Map(oldJoints.map(j => [j.tag, j]))
    const newJointMap = new Map(newJoints.map(j => [j.tag, j]))

    // Detectar NEW y MODIFY
    newJoints.forEach(newJ => {
        const oldJ = oldJointMap.get(newJ.tag!)

        if (!oldJ) {
            result.joints.added.push(newJ)
        } else {
            const changes = []
            if (newJ.tipo !== oldJ.tipo) changes.push({ field: 'tipo', old: oldJ.tipo, new: newJ.tipo })
            if (newJ.diametro_pulg !== oldJ.diametro_pulg) changes.push({ field: 'diametro', old: oldJ.diametro_pulg, new: newJ.diametro_pulg })
            if (newJ.categoria !== oldJ.categoria) changes.push({ field: 'categoria', old: oldJ.categoria, new: newJ.categoria })

            if (changes.length > 0) {
                result.joints.modified.push({ item: newJ, changes })
            }
        }
    })

    // Detectar DELETE
    oldJoints.forEach(oldJ => {
        if (!newJointMap.has(oldJ.tag)) {
            result.joints.removed.push(oldJ)
        }
    })

    return result
}

/**
 * Guarda los resultados del análisis en la tabla isometric_impacts
 */
export async function saveImpacts(revisionId: string, diff: DiffResult) {
    const impactsToInsert: Partial<Impacto>[] = []

    // Spools Impacts
    diff.spools.added.forEach(s => impactsToInsert.push({
        revision_id: revisionId,
        entity_type: 'SPOOL',
        entity_identifier: s.nombre,
        change_type: 'NEW',
        changes_json: {}
    }))
    diff.spools.removed.forEach(s => impactsToInsert.push({
        revision_id: revisionId,
        entity_type: 'SPOOL',
        entity_identifier: s.nombre,
        change_type: 'DELETE',
        changes_json: {}
    }))
    diff.spools.modified.forEach(m => impactsToInsert.push({
        revision_id: revisionId,
        entity_type: 'SPOOL',
        entity_identifier: m.item.nombre,
        change_type: 'MODIFY',
        changes_json: { changes: m.changes }
    }))

    // Joints Impacts
    diff.joints.added.forEach(j => impactsToInsert.push({
        revision_id: revisionId,
        entity_type: 'JOINT',
        entity_identifier: j.tag,
        change_type: 'NEW',
        changes_json: {}
    }))
    diff.joints.removed.forEach(j => impactsToInsert.push({
        revision_id: revisionId,
        entity_type: 'JOINT',
        entity_identifier: j.tag,
        change_type: 'DELETE',
        changes_json: {}
    }))
    diff.joints.modified.forEach(m => impactsToInsert.push({
        revision_id: revisionId,
        entity_type: 'JOINT',
        entity_identifier: m.item.tag,
        change_type: 'MODIFY',
        changes_json: { changes: m.changes }
    }))

    if (impactsToInsert.length === 0) return

    const { error } = await supabase
        .from('isometric_impacts')
        .insert(impactsToInsert)

    if (error) throw error
}

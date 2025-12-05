/**
 * IMPACT COMPARISON SERVICE
 * 
 * Servicio para comparar dos revisiones de un isométrico y detectar impactos,
 * determinar qué avances pueden migrarse, y ejecutar migraciones aprobadas.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
    ImpactComparisonResult,
    ImpactSummary,
    RevisionImpact,
    WeldWithExecution,
    MaterialWithStatus,
    BoltedJointWithExecution,
    MigrationStatus,
    ImpactType,
    WeldMigrationCriteria
} from '@/types/impact-verification';
import type { SpoolWeld, MaterialTakeOff, BoltedJoint } from '@/types/engineering';

// =====================================================
// CONFIGURACIÓN DE CRITERIOS DE MIGRACIÓN
// =====================================================

const DEFAULT_MIGRATION_CRITERIA: WeldMigrationCriteria = {
    spool_must_match: true,          // El spool debe ser el mismo
    type_must_match: true,            // El tipo de soldadura debe ser el mismo
    nps_tolerance: 1,                 // Tolerancia de ±1 pulgada en diámetro
    allow_schedule_change: false,     // No permitir cambios en schedule
    allow_material_upgrade: true      // Permitir upgrade de material (ej. A106B → A335P11)
};

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

/**
 * Parsea un valor NPS (puede ser string o number)
 */
function parseNPS(nps: any): number {
    if (typeof nps === 'number') return nps;
    if (typeof nps === 'string') {
        // Remover comillas y parsear
        const cleaned = nps.replace(/["']/g, '').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

/**
 * Compara dos valores considerando null/undefined como equivalentes
 */
function safeEquals(a: any, b: any): boolean {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    // Convertir a string para comparación (maneja números y strings)
    return String(a).toUpperCase().trim() === String(b).toUpperCase().trim();
}

/**
 * Genera un resumen legible de las diferencias
 */
function generateDifferenceSummary(field: string, oldValue: any, newValue: any): string {
    return `${field}: "${oldValue}" → "${newValue}"`;
}

// =====================================================
// COMPARACIÓN DE WELDS (SOLDADURAS)
// =====================================================

/**
 * Determina si una soldadura puede migrarse basándose en criterios
 */
function canMigrateWeld(
    oldWeld: SpoolWeld,
    newWeld: SpoolWeld,
    criteria: WeldMigrationCriteria = DEFAULT_MIGRATION_CRITERIA
): { canMigrate: boolean; reason?: string; changes: any[] } {
    const changes: any[] = [];

    // 1. Verificar spool_number
    if (criteria.spool_must_match && !safeEquals(oldWeld.spool_number, newWeld.spool_number)) {
        changes.push({
            field: 'spool_number',
            old_value: oldWeld.spool_number,
            new_value: newWeld.spool_number
        });
        return {
            canMigrate: false,
            reason: `Cambió de spool: ${oldWeld.spool_number} → ${newWeld.spool_number}`,
            changes
        };
    }

    // 2. Verificar type_weld
    if (criteria.type_must_match && !safeEquals(oldWeld.type_weld, newWeld.type_weld)) {
        changes.push({
            field: 'type_weld',
            old_value: oldWeld.type_weld,
            new_value: newWeld.type_weld
        });
        return {
            canMigrate: false,
            reason: `Cambió tipo de soldadura: ${oldWeld.type_weld} → ${newWeld.type_weld}`,
            changes
        };
    }

    // 3. Verificar NPS (con tolerancia)
    const oldNPS = parseNPS(oldWeld.nps);
    const newNPS = parseNPS(newWeld.nps);
    const npsDelta = Math.abs(oldNPS - newNPS);

    if (npsDelta > criteria.nps_tolerance) {
        changes.push({
            field: 'nps',
            old_value: oldWeld.nps,
            new_value: newWeld.nps
        });
        return {
            canMigrate: false,
            reason: `Cambió diámetro significativamente: ${oldWeld.nps}" → ${newWeld.nps}"`,
            changes
        };
    } else if (npsDelta > 0) {
        changes.push({
            field: 'nps',
            old_value: oldWeld.nps,
            new_value: newWeld.nps
        });
    }

    // 4. Verificar Schedule
    if (!criteria.allow_schedule_change && !safeEquals(oldWeld.sch, newWeld.sch)) {
        changes.push({
            field: 'sch',
            old_value: oldWeld.sch,
            new_value: newWeld.sch
        });
        return {
            canMigrate: false,
            reason: `Cambió schedule: ${oldWeld.sch} → ${newWeld.sch}`,
            changes
        };
    } else if (!safeEquals(oldWeld.sch, newWeld.sch)) {
        changes.push({
            field: 'sch',
            old_value: oldWeld.sch,
            new_value: newWeld.sch
        });
    }

    // 5. Verificar Material
    if (!safeEquals(oldWeld.material, newWeld.material)) {
        changes.push({
            field: 'material',
            old_value: oldWeld.material,
            new_value: newWeld.material
        });

        // Si no se permite upgrade, bloquear
        if (!criteria.allow_material_upgrade) {
            return {
                canMigrate: false,
                reason: `Cambió material: ${oldWeld.material} → ${newWeld.material}`,
                changes
            };
        }
    }

    // 6. Verificar otros campos informativos (no bloquean, solo informan)
    const infoFields = ['destination', 'thickness', 'piping_class', 'sheet'];
    infoFields.forEach(field => {
        const oldVal = (oldWeld as any)[field];
        const newVal = (newWeld as any)[field];
        if (!safeEquals(oldVal, newVal)) {
            changes.push({
                field,
                old_value: oldVal,
                new_value: newVal
            });
        }
    });

    // Si hay cambios pero ninguno es bloqueante
    if (changes.length > 0) {
        return {
            canMigrate: true,
            reason: `Cambios menores: ${changes.map(c => c.field).join(', ')}`,
            changes
        };
    }

    // Sin cambios
    return { canMigrate: true, changes: [] };
}

/**
 * Detecta impactos en soldaduras entre dos revisiones
 */
async function detectWeldImpacts(
    supabase: SupabaseClient,
    oldRevisionId: string,
    newRevisionId: string
): Promise<{
    oldWelds: WeldWithExecution[];
    newWelds: WeldWithExecution[];
    impacts: RevisionImpact[];
}> {
    // 1. Obtener soldaduras de la revisión antigua CON estado de ejecución
    const { data: oldWeldsData, error: oldWeldsError } = await supabase
        .from('spools_welds')
        .select(`
            *,
            weld_executions (
                id,
                executed_by,
                execution_date,
                quality_status,
                cuadrilla_id
            )
        `)
        .eq('revision_id', oldRevisionId);

    if (oldWeldsError) throw oldWeldsError;

    // 2. Obtener soldaduras de la revisión nueva
    const { data: newWeldsData, error: newWeldsError } = await supabase
        .from('spools_welds')
        .select('*')
        .eq('revision_id', newRevisionId);

    if (newWeldsError) throw newWeldsError;

    // 3. Mapear a WeldWithExecution
    const oldWelds: WeldWithExecution[] = (oldWeldsData || []).map(w => ({
        ...w,
        executed: !!w.weld_executions && w.weld_executions.length > 0,
        execution: w.weld_executions?.[0] || undefined
    }));

    const newWelds: WeldWithExecution[] = (newWeldsData || []).map(w => ({
        ...w,
        executed: false, // En la nueva revisión aún no hay ejecuciones
        execution: undefined
    }));

    // 4. Crear mapas por weld_number para búsqueda rápida
    const oldWeldsMap = new Map<string, WeldWithExecution>();
    oldWelds.forEach(w => oldWeldsMap.set(w.weld_number, w));

    const newWeldsMap = new Map<string, WeldWithExecution>();
    newWelds.forEach(w => newWeldsMap.set(w.weld_number, w));

    const impacts: RevisionImpact[] = [];

    // 5. Analizar cada soldadura de la revisión nueva
    for (const newWeld of newWelds) {
        const oldWeld = oldWeldsMap.get(newWeld.weld_number);

        if (!oldWeld) {
            // WELD ADDED: Soldadura nueva que no existía antes
            newWeld.migration_status = 'NEW';
            newWeld.can_migrate = false;

            impacts.push({
                id: crypto.randomUUID(),
                new_revision_id: newRevisionId,
                old_revision_id: oldRevisionId,
                impact_type: 'WELD_ADDED',
                entity_type: 'WELD',
                entity_id: newWeld.id,
                old_value: null,
                new_value: {
                    weld_number: newWeld.weld_number,
                    spool_number: newWeld.spool_number,
                    type_weld: newWeld.type_weld,
                    nps: newWeld.nps
                },
                impact_summary: `Nueva soldadura añadida: ${newWeld.weld_number} (Spool: ${newWeld.spool_number})`,
                is_blocking: false,
                created_at: new Date().toISOString()
            });
        } else {
            // WELD EXISTS: Verificar si puede migrarse
            const migrationCheck = canMigrateWeld(oldWeld, newWeld);

            newWeld.changes = migrationCheck.changes;
            newWeld.can_migrate = migrationCheck.canMigrate && oldWeld.executed;
            newWeld.impact_reason = migrationCheck.reason;

            if (migrationCheck.canMigrate) {
                if (oldWeld.executed) {
                    // Puede migrarse
                    newWeld.migration_status = 'CAN_MIGRATE';
                } else {
                    // No estaba ejecutada en la anterior
                    newWeld.migration_status = 'NEW';
                }
            } else {
                // Tiene cambios bloqueantes
                newWeld.migration_status = 'BLOCKED';

                impacts.push({
                    id: crypto.randomUUID(),
                    new_revision_id: newRevisionId,
                    old_revision_id: oldRevisionId,
                    impact_type: 'WELD_MODIFIED',
                    entity_type: 'WELD',
                    entity_id: newWeld.id,
                    old_value: {
                        spool_number: oldWeld.spool_number,
                        type_weld: oldWeld.type_weld,
                        nps: oldWeld.nps,
                        sch: oldWeld.sch,
                        material: oldWeld.material
                    },
                    new_value: {
                        spool_number: newWeld.spool_number,
                        type_weld: newWeld.type_weld,
                        nps: newWeld.nps,
                        sch: newWeld.sch,
                        material: newWeld.material
                    },
                    impact_summary: `Soldadura modificada (IMPACTADA): ${newWeld.weld_number} - ${migrationCheck.reason}`,
                    is_blocking: true,
                    created_at: new Date().toISOString()
                });
            }
        }
    }

    // 6. Detectar soldaduras REMOVIDAS
    for (const oldWeld of oldWelds) {
        const newWeld = newWeldsMap.get(oldWeld.weld_number);

        if (!newWeld && oldWeld.executed) {
            impacts.push({
                id: crypto.randomUUID(),
                new_revision_id: newRevisionId,
                old_revision_id: oldRevisionId,
                impact_type: 'WELD_REMOVED',
                entity_type: 'WELD',
                entity_id: oldWeld.id,
                old_value: {
                    weld_number: oldWeld.weld_number,
                    spool_number: oldWeld.spool_number,
                    executed: true
                },
                new_value: null,
                impact_summary: `⚠️ Soldadura ELIMINADA que estaba ejecutada: ${oldWeld.weld_number} (Spool: ${oldWeld.spool_number})`,
                is_blocking: true,
                created_at: new Date().toISOString()
            });
        }
    }

    return { oldWelds, newWelds, impacts };
}

// =====================================================
// COMPARACIÓN DE MATERIAL TAKE-OFF
// =====================================================

async function detectMaterialImpacts(
    supabase: SupabaseClient,
    oldRevisionId: string,
    newRevisionId: string
): Promise<{
    oldMaterials: MaterialWithStatus[];
    newMaterials: MaterialWithStatus[];
    impacts: RevisionImpact[];
}> {
    // 1. Obtener materiales de ambas revisiones
    const { data: oldMaterialsData } = await supabase
        .from('material_take_off')
        .select('*')
        .eq('revision_id', oldRevisionId);

    const { data: newMaterialsData } = await supabase
        .from('material_take_off')
        .select('*')
        .eq('revision_id', newRevisionId);

    const oldMaterials: MaterialWithStatus[] = oldMaterialsData || [];
    const newMaterials: MaterialWithStatus[] = newMaterialsData || [];

    // 2. Agrupar por item_code
    const oldByItemCode = new Map<string, MaterialTakeOff[]>();
    const newByItemCode = new Map<string, MaterialTakeOff[]>();

    oldMaterials.forEach(m => {
        const key = m.item_code || 'UNKNOWN';
        if (!oldByItemCode.has(key)) oldByItemCode.set(key, []);
        oldByItemCode.get(key)!.push(m);
    });

    newMaterials.forEach(m => {
        const key = m.item_code || 'UNKNOWN';
        if (!newByItemCode.has(key)) newByItemCode.set(key, []);
        newByItemCode.get(key)!.push(m);
    });

    const impacts: RevisionImpact[] = [];

    // 3. Comparar totales por item_code
    const allItemCodes = new Set([...oldByItemCode.keys(), ...newByItemCode.keys()]);

    for (const itemCode of allItemCodes) {
        const oldItems = oldByItemCode.get(itemCode) || [];
        const newItems = newByItemCode.get(itemCode) || [];

        const oldTotalQty = oldItems.reduce((sum, item) => sum + (item.qty || 0), 0);
        const newTotalQty = newItems.reduce((sum, item) => sum + (item.qty || 0), 0);
        const delta = newTotalQty - oldTotalQty;

        // Marcar los materiales nuevos con su delta
        newItems.forEach(item => {
            const materialWithStatus = item as MaterialWithStatus;
            materialWithStatus.old_qty = oldTotalQty;
            materialWithStatus.delta = delta;

            if (delta > 0) {
                materialWithStatus.impact_type = 'INCREASED';
            } else if (delta < 0) {
                materialWithStatus.impact_type = 'DECREASED';
            } else {
                materialWithStatus.impact_type = 'UNCHANGED';
            }
        });

        // Generar impactos si hay cambios
        if (delta !== 0) {
            const impactType: ImpactType = delta > 0 ? 'MTO_INCREASED' : 'MTO_DECREASED';

            impacts.push({
                id: crypto.randomUUID(),
                new_revision_id: newRevisionId,
                old_revision_id: oldRevisionId,
                impact_type: impactType,
                entity_type: 'MTO',
                entity_id: newItems[0]?.id,
                old_value: { item_code: itemCode, qty: oldTotalQty },
                new_value: { item_code: itemCode, qty: newTotalQty },
                impact_summary: `Material ${itemCode}: ${oldTotalQty} → ${newTotalQty} (Δ ${delta > 0 ? '+' : ''}${delta})`,
                is_blocking: delta > 0, // Aumento bloquea (falta material)
                created_at: new Date().toISOString()
            });
        }

        // Items nuevos
        if (oldItems.length === 0 && newItems.length > 0) {
            impacts.push({
                id: crypto.randomUUID(),
                new_revision_id: newRevisionId,
                old_revision_id: oldRevisionId,
                impact_type: 'MTO_ITEM_ADDED',
                entity_type: 'MTO',
                entity_id: newItems[0].id,
                old_value: null,
                new_value: { item_code: itemCode, qty: newTotalQty },
                impact_summary: `Nuevo material añadido: ${itemCode} (Qty: ${newTotalQty})`,
                is_blocking: true,
                created_at: new Date().toISOString()
            });
        }

        // Items removidos
        if (oldItems.length > 0 && newItems.length === 0) {
            impacts.push({
                id: crypto.randomUUID(),
                new_revision_id: newRevisionId,
                old_revision_id: oldRevisionId,
                impact_type: 'MTO_ITEM_REMOVED',
                entity_type: 'MTO',
                entity_id: undefined,
                old_value: { item_code: itemCode, qty: oldTotalQty },
                new_value: null,
                impact_summary: `Material eliminado: ${itemCode} (Qty anterior: ${oldTotalQty})`,
                is_blocking: false,
                created_at: new Date().toISOString()
            });
        }
    }

    return { oldMaterials, newMaterials, impacts };
}

// =====================================================
// COMPARACIÓN DE BOLTED JOINTS
// =====================================================

async function detectBoltedJointImpacts(
    supabase: SupabaseClient,
    oldRevisionId: string,
    newRevisionId: string
): Promise<{
    oldJoints: BoltedJointWithExecution[];
    newJoints: BoltedJointWithExecution[];
    impacts: RevisionImpact[];
}> {
    // Lógica similar a detectWeldImpacts pero para bolted_joints
    const { data: oldJointsData } = await supabase
        .from('bolted_joints')
        .select(`
            *,
            bolted_joint_executions (
                id,
                executed_by,
                execution_date,
                quality_status
            )
        `)
        .eq('revision_id', oldRevisionId);

    const { data: newJointsData } = await supabase
        .from('bolted_joints')
        .select('*')
        .eq('revision_id', newRevisionId);

    const oldJoints: BoltedJointWithExecution[] = (oldJointsData || []).map(j => ({
        ...j,
        executed: !!j.bolted_joint_executions && j.bolted_joint_executions.length > 0,
        execution: j.bolted_joint_executions?.[0]
    }));

    const newJoints: BoltedJointWithExecution[] = (newJointsData || []).map(j => ({
        ...j,
        executed: false
    }));

    const oldJointsMap = new Map<string, BoltedJointWithExecution>();
    oldJoints.forEach(j => oldJointsMap.set(j.flanged_joint_number, j));

    const newJointsMap = new Map<string, BoltedJointWithExecution>();
    newJoints.forEach(j => newJointsMap.set(j.flanged_joint_number, j));

    const impacts: RevisionImpact[] = [];

    // Detectar añadidos, modificados, removidos (lógica similar a welds)
    for (const newJoint of newJoints) {
        const oldJoint = oldJointsMap.get(newJoint.flanged_joint_number);

        if (!oldJoint) {
            newJoint.migration_status = 'NEW';
            newJoint.can_migrate = false;

            impacts.push({
                id: crypto.randomUUID(),
                new_revision_id: newRevisionId,
                old_revision_id: oldRevisionId,
                impact_type: 'BOLTED_JOINT_ADDED',
                entity_type: 'BOLTED_JOINT',
                entity_id: newJoint.id,
                old_value: null,
                new_value: { flanged_joint_number: newJoint.flanged_joint_number },
                impact_summary: `Nueva junta empernada: ${newJoint.flanged_joint_number}`,
                is_blocking: false,
                created_at: new Date().toISOString()
            });
        } else {
            // Comparar propiedades críticas
            const hasChanges =
                !safeEquals(oldJoint.nps, newJoint.nps) ||
                !safeEquals(oldJoint.rating, newJoint.rating) ||
                !safeEquals(oldJoint.material, newJoint.material);

            if (hasChanges) {
                newJoint.migration_status = 'BLOCKED';
                newJoint.can_migrate = false;

                impacts.push({
                    id: crypto.randomUUID(),
                    new_revision_id: newRevisionId,
                    old_revision_id: oldRevisionId,
                    impact_type: 'BOLTED_JOINT_MODIFIED',
                    entity_type: 'BOLTED_JOINT',
                    entity_id: newJoint.id,
                    old_value: {
                        nps: oldJoint.nps,
                        rating: oldJoint.rating,
                        material: oldJoint.material
                    },
                    new_value: {
                        nps: newJoint.nps,
                        rating: newJoint.rating,
                        material: newJoint.material
                    },
                    impact_summary: `Junta empernada modificada: ${newJoint.flanged_joint_number}`,
                    is_blocking: true,
                    created_at: new Date().toISOString()
                });
            } else if (oldJoint.executed) {
                newJoint.migration_status = 'CAN_MIGRATE';
                newJoint.can_migrate = true;
            }
        }
    }

    // Detectar removidos
    for (const oldJoint of oldJoints) {
        if (!newJointsMap.has(oldJoint.flanged_joint_number) && oldJoint.executed) {
            impacts.push({
                id: crypto.randomUUID(),
                new_revision_id: newRevisionId,
                old_revision_id: oldRevisionId,
                impact_type: 'BOLTED_JOINT_REMOVED',
                entity_type: 'BOLTED_JOINT',
                entity_id: oldJoint.id,
                old_value: { flanged_joint_number: oldJoint.flanged_joint_number, executed: true },
                new_value: null,
                impact_summary: `⚠️ Junta empernada ELIMINADA que estaba ejecutada: ${oldJoint.flanged_joint_number}`,
                is_blocking: true,
                created_at: new Date().toISOString()
            });
        }
    }

    return { oldJoints, newJoints, impacts };
}

// =====================================================
// FUNCIÓN PRINCIPAL DE COMPARACIÓN
// =====================================================

export async function compareRevisions(
    supabase: SupabaseClient,
    oldRevisionId: string,
    newRevisionId: string
): Promise<ImpactComparisonResult> {
    console.log('[compareRevisions] Starting comparison...', { oldRevisionId, newRevisionId });

    // 1. Obtener información de las revisiones
    const { data: revisions } = await supabase
        .from('isometric_revisions')
        .select('id, codigo, estado, fecha_emision')
        .in('id', [oldRevisionId, newRevisionId]);

    if (!revisions || revisions.length !== 2) {
        throw new Error('No se encontraron las revisiones especificadas');
    }

    const oldRev = revisions.find(r => r.id === oldRevisionId);
    const newRev = revisions.find(r => r.id === newRevisionId);

    if (!oldRev || !newRev) {
        throw new Error('Error al identificar las revisiones');
    }

    // 2. Detectar impactos en cada categoría
    const weldComparison = await detectWeldImpacts(supabase, oldRevisionId, newRevisionId);
    const materialComparison = await detectMaterialImpacts(supabase, oldRevisionId, newRevisionId);
    const boltedComparison = await detectBoltedJointImpacts(supabase, oldRevisionId, newRevisionId);

    // 3. Consolidar todos los impactos
    const allImpacts = [
        ...weldComparison.impacts,
        ...materialComparison.impacts,
        ...boltedComparison.impacts
    ];

    // 4. Calcular resumen
    const summary: ImpactSummary = {
        welds: {
            total_old: weldComparison.oldWelds.length,
            total_new: weldComparison.newWelds.length,
            can_migrate: weldComparison.newWelds.filter(w => w.migration_status === 'CAN_MIGRATE').length,
            needs_review: weldComparison.newWelds.filter(w => w.migration_status === 'NEEDS_REVIEW').length,
            blocked: weldComparison.newWelds.filter(w => w.migration_status === 'BLOCKED').length,
            added: weldComparison.impacts.filter(i => i.impact_type === 'WELD_ADDED').length,
            removed: weldComparison.impacts.filter(i => i.impact_type === 'WELD_REMOVED').length,
            modified: weldComparison.impacts.filter(i => i.impact_type === 'WELD_MODIFIED').length,
            executed_old: weldComparison.oldWelds.filter(w => w.executed).length
        },
        materials: {
            total_old_items: materialComparison.oldMaterials.length,
            total_new_items: materialComparison.newMaterials.length,
            items_added: materialComparison.impacts.filter(i => i.impact_type === 'MTO_ITEM_ADDED').length,
            items_removed: materialComparison.impacts.filter(i => i.impact_type === 'MTO_ITEM_REMOVED').length,
            items_with_delta: materialComparison.impacts.filter(i =>
                i.impact_type === 'MTO_INCREASED' || i.impact_type === 'MTO_DECREASED'
            ).length,
            total_qty_increase: materialComparison.impacts
                .filter(i => i.impact_type === 'MTO_INCREASED')
                .reduce((sum, i) => sum + ((i.new_value?.qty || 0) - (i.old_value?.qty || 0)), 0),
            total_qty_decrease: Math.abs(materialComparison.impacts
                .filter(i => i.impact_type === 'MTO_DECREASED')
                .reduce((sum, i) => sum + ((i.new_value?.qty || 0) - (i.old_value?.qty || 0)), 0)),
            delta_by_item: {}
        },
        bolted_joints: {
            total_old: boltedComparison.oldJoints.length,
            total_new: boltedComparison.newJoints.length,
            can_migrate: boltedComparison.newJoints.filter(j => j.migration_status === 'CAN_MIGRATE').length,
            needs_review: boltedComparison.newJoints.filter(j => j.migration_status === 'NEEDS_REVIEW').length,
            blocked: boltedComparison.newJoints.filter(j => j.migration_status === 'BLOCKED').length,
            added: boltedComparison.impacts.filter(i => i.impact_type === 'BOLTED_JOINT_ADDED').length,
            removed: boltedComparison.impacts.filter(i => i.impact_type === 'BOLTED_JOINT_REMOVED').length,
            modified: boltedComparison.impacts.filter(i => i.impact_type === 'BOLTED_JOINT_MODIFIED').length,
            executed_old: boltedComparison.oldJoints.filter(j => j.executed).length
        },
        has_blocking_impacts: allImpacts.some(i => i.is_blocking),
        requires_manual_approval: allImpacts.length > 0,
        auto_migration_possible: !allImpacts.some(i => i.is_blocking)
    };

    // 5. Construir resultado final
    const result: ImpactComparisonResult = {
        comparison_id: crypto.randomUUID(),
        old_revision: {
            id: oldRev.id,
            codigo: oldRev.codigo,
            estado: oldRev.estado,
            fecha_emision: oldRev.fecha_emision,
            welds: weldComparison.oldWelds,
            materials: materialComparison.oldMaterials,
            bolted_joints: boltedComparison.oldJoints
        },
        new_revision: {
            id: newRev.id,
            codigo: newRev.codigo,
            estado: newRev.estado,
            fecha_emision: newRev.fecha_emision,
            welds: weldComparison.newWelds,
            materials: materialComparison.newMaterials,
            bolted_joints: boltedComparison.newJoints
        },
        impacts: allImpacts,
        summary,
        compared_at: new Date().toISOString()
    };

    console.log('[compareRevisions] Comparison complete:', {
        total_impacts: allImpacts.length,
        blocking_impacts: allImpacts.filter(i => i.is_blocking).length,
        can_auto_migrate: result.summary.auto_migration_possible
    });

    return result;
}

// =====================================================
// MIGRACIÓN DE AVANCES
// =====================================================

export async function migrateApprovedExecutions(
    supabase: SupabaseClient,
    oldRevisionId: string,
    newRevisionId: string,
    approvedWeldIds: string[],
    approvedBoltedJointIds: string[],
    userId: string
): Promise<{ weldsMigrated: number; boltedJointsMigrated: number }> {
    let weldsMigrated = 0;
    let boltedJointsMigrated = 0;

    // 1. Migrar ejecuciones de soldaduras aprobadas
    for (const oldWeldId of approvedWeldIds) {
        // Obtener la ejecución de la soldadura antigua
        const { data: oldExecution } = await supabase
            .from('weld_executions')
            .select('*')
            .eq('weld_id', oldWeldId)
            .eq('revision_id', oldRevisionId)
            .single();

        if (!oldExecution) continue;

        // Obtener el weld_number de la soldadura antigua
        const { data: oldWeld } = await supabase
            .from('spools_welds')
            .select('weld_number')
            .eq('id', oldWeldId)
            .single();

        if (!oldWeld) continue;

        // Buscar la soldadura equivalente en la nueva revisión
        const { data: newWeld } = await supabase
            .from('spools_welds')
            .select('id')
            .eq('revision_id', newRevisionId)
            .eq('weld_number', oldWeld.weld_number)
            .single();

        if (!newWeld) continue;

        // Crear nueva ejecución en la nueva revisión
        const { error } = await supabase
            .from('weld_executions')
            .insert({
                weld_id: newWeld.id,
                revision_id: newRevisionId,
                executed_by: oldExecution.executed_by,
                cuadrilla_id: oldExecution.cuadrilla_id,
                execution_date: oldExecution.execution_date,
                quality_status: oldExecution.quality_status,
                migrated_from_revision_id: oldRevisionId,
                auto_migrated: false, // Fue aprobado manualmente
                notes: `Migrado desde revisión anterior por usuario ${userId}`
            });

        if (!error) weldsMigrated++;
    }

    // 2. Migrar ejecuciones de juntas empernadas
    for (const oldJointId of approvedBoltedJointIds) {
        const { data: oldExecution } = await supabase
            .from('bolted_joint_executions')
            .select('*')
            .eq('bolted_joint_id', oldJointId)
            .eq('revision_id', oldRevisionId)
            .single();

        if (!oldExecution) continue;

        const { data: oldJoint } = await supabase
            .from('bolted_joints')
            .select('flanged_joint_number')
            .eq('id', oldJointId)
            .single();

        if (!oldJoint) continue;

        const { data: newJoint } = await supabase
            .from('bolted_joints')
            .select('id')
            .eq('revision_id', newRevisionId)
            .eq('flanged_joint_number', oldJoint.flanged_joint_number)
            .single();

        if (!newJoint) continue;

        const { error } = await supabase
            .from('bolted_joint_executions')
            .insert({
                bolted_joint_id: newJoint.id,
                revision_id: newRevisionId,
                executed_by: oldExecution.executed_by,
                cuadrilla_id: oldExecution.cuadrilla_id,
                execution_date: oldExecution.execution_date,
                quality_status: oldExecution.quality_status,
                migrated_from_revision_id: oldRevisionId,
                auto_migrated: false,
                notes: `Migrado desde revisión anterior por usuario ${userId}`
            });

        if (!error) boltedJointsMigrated++;
    }

    return { weldsMigrated, boltedJointsMigrated };
}

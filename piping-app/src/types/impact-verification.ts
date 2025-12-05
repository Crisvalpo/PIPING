/**
 * IMPACT VERIFICATION MODULE - TYPESCRIPT TYPES
 * 
 * Tipos para el sistema de verificación de impactos entre revisiones,
 * gestión de cuadrillas y seguimiento de ejecución de soldaduras.
 */

import type { SpoolWeld, MaterialTakeOff, BoltedJoint } from './engineering';

// =====================================================
// ENUMS Y TIPOS BÁSICOS
// =====================================================

export type ImpactType =
    | 'WELD_ADDED'
    | 'WELD_REMOVED'
    | 'WELD_MODIFIED'
    | 'MTO_INCREASED'
    | 'MTO_DECREASED'
    | 'MTO_ITEM_ADDED'
    | 'MTO_ITEM_REMOVED'
    | 'BOLTED_JOINT_ADDED'
    | 'BOLTED_JOINT_REMOVED'
    | 'BOLTED_JOINT_MODIFIED'
    | 'SPOOL_ADDED'
    | 'SPOOL_REMOVED'
    | 'SPOOL_MODIFIED';

export type EntityType = 'WELD' | 'MTO' | 'BOLTED_JOINT' | 'SPOOL';

export type QualityStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REWORK';

export type CuadrillaTipo = 'PRINCIPAL' | 'SECUNDARIA';

export type MemberRole = 'SUPERVISOR' | 'CAPATAZ' | 'MAESTRO' | 'SOLDADOR';

export type MigrationStatus =
    | 'CAN_MIGRATE'    // Puede migrarse automáticamente
    | 'NEEDS_REVIEW'   // Requiere revisión manual
    | 'BLOCKED'        // Impactado, no puede migrarse
    | 'NEW'            // Elemento nuevo en la revisión
    | 'REMOVED';       // Elemento eliminado en la nueva revisión

// =====================================================
// REVISION IMPACTS
// =====================================================

export interface RevisionImpact {
    id: string;
    new_revision_id: string;
    old_revision_id: string;
    impact_type: ImpactType;
    entity_type: EntityType;
    entity_id?: string;
    old_value?: any; // JSONB
    new_value?: any; // JSONB
    impact_summary: string;
    is_blocking: boolean;
    created_at: string;
}

export interface ImpactMigrationLog {
    id: string;
    impact_id: string;
    migration_approved: boolean;
    approved_by?: string;
    approved_at: string;
    reason?: string;
    created_at: string;
}

// =====================================================
// CUADRILLAS (CREWS)
// =====================================================

export interface Cuadrilla {
    id: string;
    proyecto_id: string;
    nombre: string;
    codigo?: string;
    descripcion?: string;
    tipo: CuadrillaTipo;
    supervisor_rut?: string;
    capataz_rut?: string;
    active: boolean;
    created_at: string;
    updated_at?: string;
    created_by?: string;

    // Relaciones
    supervisor?: PersonalSummary;
    capataz?: PersonalSummary;
    members?: CuadrillaMember[];
    soldadores_asignados?: SoldadorAsignacion[];
    maestros_asignados?: MaestroAsignacion[];
}

export interface CuadrillaMember {
    id: string;
    cuadrilla_id: string;
    rut: string; // Changed from user_id to rut matches DB
    role: MemberRole;
    fecha_ingreso?: string; // from cuadrilla_members view
    fecha_salida?: string;

    // Legacy fields for backward compatibility/types
    joined_at?: string;
    left_at?: string;

    // Relaciones
    personal?: PersonalSummary;
    soldador?: SoldadorSummary;
}

export interface MaestroAsignacion {
    id: string;
    maestro_rut: string;
    cuadrilla_id: string;
    fecha_asignacion: string;
    fecha_desasignacion?: string;
    active: boolean;
    observaciones?: string;
    created_at: string;

    // Relations
    personal?: PersonalSummary;
}

export interface SoldadorAsignacion {
    id: string;
    soldador_rut: string;
    cuadrilla_id: string;
    fecha: string;
    hora_inicio: string;
    hora_fin?: string;
    observaciones?: string;
    created_at: string;

    // Relations
    personal?: PersonalSummary;
    soldador?: SoldadorSummary;
}

export interface PersonalSummary {
    rut: string;
    nombre: string;
    email?: string;
    cargo?: string;
}

export interface SoldadorSummary {
    rut: string;
    estampa: string;
    certificacion_actual?: string;
}

export interface UserSummary {
    id: string;
    email: string;
    nombre?: string;
    apellido?: string;
    role?: string;
}

// =====================================================
// WELD & BOLTED JOINT EXECUTIONS
// =====================================================

export interface WeldExecution {
    id: string;
    weld_id: string;
    revision_id: string;
    executed_by: string;
    cuadrilla_id?: string;
    execution_date: string;
    quality_status: QualityStatus;
    migrated_from_revision_id?: string;
    auto_migrated: boolean;
    notes?: string;
    created_at: string;
    updated_at?: string;

    // Relaciones
    executor?: UserSummary;
    cuadrilla?: Cuadrilla;
}

export interface BoltedJointExecution {
    id: string;
    bolted_joint_id: string;
    revision_id: string;
    executed_by: string;
    cuadrilla_id?: string;
    execution_date: string;
    quality_status: QualityStatus;
    migrated_from_revision_id?: string;
    auto_migrated: boolean;
    notes?: string;
    created_at: string;
    updated_at?: string;

    // Relaciones
    executor?: UserSummary;
    cuadrilla?: Cuadrilla;
}

// =====================================================
// EXTENDED TYPES WITH EXECUTION STATUS
// =====================================================

/**
 * Soldadura con información de ejecución y estado de migración
 */
export interface WeldWithExecution extends SpoolWeld {
    // Estado de ejecución
    executed: boolean;
    execution?: WeldExecution;

    // Estado de migración (calculado durante comparación)
    migration_status?: MigrationStatus;
    can_migrate?: boolean;
    impact_reason?: string;

    // Diferencias detectadas (si aplica)
    changes?: {
        field: string;
        old_value: any;
        new_value: any;
    }[];
}

/**
 * Material con información de delta y estado
 */
export interface MaterialWithStatus extends MaterialTakeOff {
    // Delta con revisión anterior
    delta?: number;
    impact_type?: 'INCREASED' | 'DECREASED' | 'NEW' | 'REMOVED' | 'UNCHANGED';

    // Cantidad en revisión anterior
    old_qty?: number;

    // Estado de disponibilidad
    availability_status?: 'AVAILABLE' | 'INSUFFICIENT' | 'NOT_REQUESTED' | 'PENDING';
}

/**
 * Junta empernada con información de ejecución
 */
export interface BoltedJointWithExecution extends BoltedJoint {
    // Estado de ejecución
    executed: boolean;
    execution?: BoltedJointExecution;

    // Estado de migración
    migration_status?: MigrationStatus;
    can_migrate?: boolean;
    impact_reason?: string;

    // Diferencias detectadas
    changes?: {
        field: string;
        old_value: any;
        new_value: any;
    }[];
}

// =====================================================
// COMPARISON RESULTS
// =====================================================

/**
 * Resultado completo de la comparación entre dos revisiones
 */
export interface ImpactComparisonResult {
    comparison_id: string; // ID único de esta comparación

    old_revision: {
        id: string;
        codigo: string;
        estado: string;
        fecha_emision: string;
        welds: WeldWithExecution[];
        materials: MaterialWithStatus[];
        bolted_joints: BoltedJointWithExecution[];
    };

    new_revision: {
        id: string;
        codigo: string;
        estado: string;
        fecha_emision: string;
        welds: WeldWithExecution[];
        materials: MaterialWithStatus[];
        bolted_joints: BoltedJointWithExecution[];
    };

    // Impactos detectados
    impacts: RevisionImpact[];

    // Resumen ejecutivo
    summary: ImpactSummary;

    // Timestamp de la comparación
    compared_at: string;
}

export interface ImpactSummary {
    // Soldaduras
    welds: {
        total_old: number;
        total_new: number;
        can_migrate: number;
        needs_review: number;
        blocked: number;
        added: number;
        removed: number;
        modified: number;
        executed_old: number; // Cuántas estaban ejecutadas en la anterior
    };

    // Materiales
    materials: {
        total_old_items: number;
        total_new_items: number;
        items_added: number;
        items_removed: number;
        items_with_delta: number;
        total_qty_increase: number;
        total_qty_decrease: number;
        delta_by_item: {
            [item_code: string]: {
                old_qty: number;
                new_qty: number;
                delta: number;
            };
        };
    };

    // Juntas empernadas
    bolted_joints: {
        total_old: number;
        total_new: number;
        can_migrate: number;
        needs_review: number;
        blocked: number;
        added: number;
        removed: number;
        modified: number;
        executed_old: number;
    };

    // Estadísticas generales
    has_blocking_impacts: boolean;
    requires_manual_approval: boolean;
    auto_migration_possible: boolean;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CompareRevisionsRequest {
    old_revision_id: string;
    new_revision_id: string;
}

export interface CompareRevisionsResponse {
    success: boolean;
    message: string;
    data?: ImpactComparisonResult;
    error?: string;
}

export interface ApproveMigrationRequest {
    new_revision_id: string;
    old_revision_id: string;

    // IDs de elementos aprobados para migración
    approved_weld_ids: string[];
    approved_bolted_joint_ids: string[];

    // Notas del aprobador
    approval_notes?: string;
}

export interface ApproveMigrationResponse {
    success: boolean;
    message: string;
    data?: {
        migrated_welds: number;
        migrated_bolted_joints: number;
        revision_marked_as_spooled: boolean;
    };
    error?: string;
}

export interface CreateCuadrillaRequest {
    proyecto_id: string;
    nombre: string;
    codigo?: string;
    tipo: CuadrillaTipo;
    supervisor_rut?: string;
    capataz_rut?: string;
}

export interface UpdateCuadrillaRequest {
    nombre?: string;
    codigo?: string;
    tipo?: CuadrillaTipo;
    supervisor_rut?: string;
    capataz_rut?: string;
    active?: boolean;
}

export interface AssignMemberRequest {
    cuadrilla_id: string;
    rut: string;
    role: MemberRole;
    observaciones?: string;
}

export interface RecordExecutionRequest {
    weld_id?: string;
    bolted_joint_id?: string;
    revision_id: string;
    execution_date: string;
    cuadrilla_id?: string;
    notes?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Criterios para determinar si un weld puede migrarse
 */
export interface WeldMigrationCriteria {
    spool_must_match: boolean;
    type_must_match: boolean;
    nps_tolerance: number; // ej. 1 pulgada
    allow_schedule_change: boolean;
    allow_material_upgrade: boolean;
}

/**
 * Configuración de auto-migración
 */
export interface AutoMigrationConfig {
    enabled: boolean;
    criteria: WeldMigrationCriteria;
    require_manual_approval_for: ImpactType[];
}

/**
 * Performance de cuadrilla
 */
export interface CuadrillaPerformance {
    cuadrilla_id: string;
    periodo: {
        desde: string;
        hasta: string;
    };
    welds_executed: number;
    bolted_joints_executed: number;
    quality_stats: {
        approved: number;
        rejected: number;
        rework: number;
    };
    efficiency_score: number; // 0-100
}

/**
 * Histórico de migración para auditoría
 */
export interface MigrationHistory {
    migration_id: string;
    from_revision: {
        id: string;
        codigo: string;
    };
    to_revision: {
        id: string;
        codigo: string;
    };
    migrated_at: string;
    migrated_by: string;
    items_migrated: {
        welds: number;
        bolted_joints: number;
    };
    approval_notes?: string;
}

import Dexie, { Table } from 'dexie';

// Interfaces for Local DB
export interface LocalIsometric {
    id: string; // UUID
    project_id: string;
    code: string;
    revision: string;
    status: string;
    spool_count: number;
    pdf_url?: string; // Blob URL or base64
    created_at: string;
    updated_at: string;
    synced_at?: string;
}

export interface LocalSpool {
    spool_number: string;
    revision_id: string;
    project_id: string;
    status: string; // Fabricación status
    // Tracking phases
    shop_welding_status: string;
    ndt_status: string;
    pwht_status: string;
    surface_treatment_status: string;
    dispatch_status: string;
    field_erection_status: string;
    field_welding_status: string;
    // Metadata
    length_meters?: number;
    weight_kg?: number;
    updated_at: string;
    synced_at?: string;
}

export interface LocalWeld {
    id: string; // UUID
    spool_number: string;
    weld_number: string;
    revision_id: string;
    project_id: string;
    sample_number?: string;
    // Execution
    executed: boolean;
    executed_at?: string;
    executed_by?: string;
    // Metadata
    destination?: string; // 'S' | 'F'
    type: string;
    diameter: string;
    schedule?: string;
    material?: string;
    updated_at: string;
    synced_at?: string;
}

export interface LocalLevantamiento {
    id: string; // UUID
    spool_number: string;
    revision_id: string;
    project_id: string;
    storage_location: string;
    notes?: string;
    captured_at: string;
    captured_by: string;
    synced_at?: string;
    synced: boolean;
}

export interface LocalPhoto {
    id: string; // UUID
    levantamiento_id: string;
    file_name: string;
    thumbnail_blob: Blob; // Tiny thumbnail for grids (150x150 @ 30%)
    preview_blob: Blob;   // Medium preview for viewer (800x600 @ 40%)
    description?: string;
    synced: boolean;
    storage_path?: string; // Remote path after sync
    created_at: string;
}

export interface PendingAction {
    id: string; // UUID
    type: 'EXECUTE_WELD' | 'CREATE_LEVANTAMIENTO' | 'UPDATE_SPOOL_PHASE' | 'UPDATE_SPOOL_GLOBAL' | 'OTHER';
    payload: any;
    created_at: string;
    status: 'PENDING' | 'SYNCING' | 'ERROR';
    error_message?: string;
    retry_count: number;
    next_retry_at?: string; // ISO timestamp for next retry attempt
    last_error_at?: string; // ISO timestamp of last error
    project_id: string; // To allow sync by project
}

export interface LocalMetadata {
    key: string; // e.g., 'last_sync_project_UUID', 'last_sync_personal_UUID'
    value: any;
    updated_at: string;
}

// ============================================
// NUEVAS INTERFACES PARA MÓDULOS ADICIONALES
// ============================================

export interface LocalPersonal {
    rut: string; // Primary key - formato: "12.345.678-9"
    nombre: string;
    email?: string;
    telefono?: string;
    activo: boolean;
    project_id: string; // Para multi-tenancy
    // Soldador info (si aplica)
    estampa?: string;
    certificacion_actual?: string;
    fecha_vencimiento_cert?: string;
    calificaciones?: string; // JSON string
    // Timestamps
    created_at: string;
    updated_at: string;
    synced_at?: string;
    local_modified_at?: string; // For conflict detection
    server_modified_at?: string;
}

export interface LocalCuadrilla {
    id: string; // UUID
    project_id: string;
    nombre: string;
    codigo: string;
    activo: boolean;
    turno?: string;
    supervisor_rut?: string;
    // Timestamps
    created_at: string;
    updated_at: string;
    synced_at?: string;
    local_modified_at?: string;
    server_modified_at?: string;
}

export interface LocalCuadrillaMember {
    id: string; // UUID
    cuadrilla_id: string;
    rut: string; // References LocalPersonal
    role: string; // 'Capataz', 'Soldador', 'Ayudante', etc.
    fecha_ingreso: string;
    fecha_salida?: string;
    activo: boolean;
    // Timestamps
    created_at: string;
    synced_at?: string;
}

export interface LocalProjectShift {
    id: string; // UUID
    project_id: string;
    shift_name: string;
    start_time: string; // TIME format "HH:MM"
    end_time: string;
    active: boolean;
    valid_from: string; // DATE
    valid_to?: string;
    created_at: string;
    updated_at: string;
    synced_at?: string;
}

export interface LocalWeldConfig {
    id: string; // UUID
    project_id: string;
    name: string;
    requires_welder: boolean;
    requires_sample: boolean;
    color: string;
    active: boolean;
    created_at: string;
    updated_at: string;
    synced_at?: string;
}

export interface LocalProjectLocation {
    id: string; // UUID
    project_id: string;
    name: string;
    code: string;
    active: boolean;
    created_at: string;
    synced_at?: string;
}

export interface LocalSpoolStatus {
    id: string; // UUID
    project_id: string;
    name: string;
    color: string;
    order_index: number;
    active: boolean;
    created_at: string;
    synced_at?: string;
}

export interface LocalDailyReport {
    id: string; // UUID
    project_id: string;
    cuadrilla_id: string;
    date: string; // DATE
    shift_id: string;
    horas_trabajadas: number;
    observaciones?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    synced_at?: string;
    synced: boolean;
}

export interface LocalConflict {
    id: string; // UUID
    table_name: string;
    record_id: string;
    local_data: any; // JSON object
    server_data: any;
    conflict_fields: string[]; // Array of field names that differ
    detected_at: string;
    resolved: boolean;
    resolution_strategy?: 'SERVER_WINS' | 'LOCAL_WINS' | 'MANUAL';
    resolved_at?: string;
    project_id: string;
}

class PipingDB extends Dexie {
    isometrics!: Table<LocalIsometric>;
    spools!: Table<LocalSpool>;
    welds!: Table<LocalWeld>;
    levantamientos!: Table<LocalLevantamiento>;
    photos!: Table<LocalPhoto>;
    pendingActions!: Table<PendingAction>;
    metadata!: Table<LocalMetadata>;
    // New tables for expanded offline support
    personal!: Table<LocalPersonal>;
    cuadrillas!: Table<LocalCuadrilla>;
    cuadrillaMembers!: Table<LocalCuadrillaMember>;
    projectShifts!: Table<LocalProjectShift>;
    weldConfigs!: Table<LocalWeldConfig>;
    projectLocations!: Table<LocalProjectLocation>;
    spoolStatuses!: Table<LocalSpoolStatus>;
    dailyReports!: Table<LocalDailyReport>;
    conflicts!: Table<LocalConflict>;

    constructor() {
        super('PipingDB');

        // Versión 1 de la base de datos
        // NOTA: Multi-Tenancy estricto. Todas las queries deben filtrar por project_id.
        this.version(1).stores({
            isometrics: 'id, project_id, code, [project_id+code]',
            spools: 'spool_number, revision_id, project_id, [revision_id+spool_number]',
            welds: 'id, spool_number, revision_id, project_id, [spool_number+weld_number]',
            levantamientos: 'id, spool_number, project_id, synced',
            photos: 'id, levantamiento_id, synced',
            pendingActions: 'id, type, status, created_at, project_id',
            metadata: 'key'
        });

        // Versión 2: Añadir índice revision_id a levantamientos
        this.version(2).stores({
            levantamientos: 'id, spool_number, revision_id, project_id, synced'
        });

        // Versión 3: Expandir con módulos adicionales offline
        // Personal, Cuadrillas, Daily Reports, Project Configs, Conflicts
        this.version(3).stores({
            // Existing tables - mantener definiciones para compatibilidad
            isometrics: 'id, project_id, code, [project_id+code]',
            spools: 'spool_number, revision_id, project_id, [revision_id+spool_number], [project_id+status]',
            welds: 'id, spool_number, revision_id, project_id, [spool_number+weld_number], [project_id+executed]',
            levantamientos: 'id, spool_number, revision_id, project_id, synced, [project_id+synced]',
            photos: 'id, levantamiento_id, synced',
            pendingActions: 'id, type, status, created_at, project_id, [project_id+status]',
            metadata: 'key',
            // New tables
            personal: 'rut, project_id, activo, estampa, [project_id+activo]',
            cuadrillas: 'id, project_id, codigo, activo, [project_id+activo]',
            cuadrillaMembers: 'id, cuadrilla_id, rut, activo, [cuadrilla_id+activo]',
            projectShifts: 'id, project_id, active, [project_id+active]',
            weldConfigs: 'id, project_id, active, [project_id+active]',
            projectLocations: 'id, project_id, code, active, [project_id+active]',
            spoolStatuses: 'id, project_id, active, order_index, [project_id+active]',
            dailyReports: 'id, project_id, cuadrilla_id, date, synced, [project_id+date], [project_id+synced]',
            conflicts: 'id, table_name, record_id, resolved, project_id, [project_id+resolved]'
        });

        // Versión 4: Agregar índice compuesto para levantamientos query performance
        this.version(4).stores({
            levantamientos: 'id, spool_number, revision_id, project_id, synced, [spool_number+project_id], [project_id+synced]'
        });
    }
}

export const db = new PipingDB();

export type ImpactType = 'NEW' | 'DELETE' | 'MODIFY' | 'RENAME';
export type ImpactStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'MITIGADO';

export interface Impacto {
    id: string;
    revision_id: string;
    entity_type: 'SPOOL' | 'JOINT' | 'MATERIAL';
    entity_identifier: string; // Spool Name or Joint Tag
    change_type: ImpactType;
    changes_json: Record<string, any>; // { field: string, old: any, new: any }[]
    status: ImpactStatus;
    action_required?: string;
    comments?: string;
    created_at: string;
}

export interface DiffResult {
    spools: {
        added: any[];
        removed: any[];
        modified: { item: any, changes: any[] }[];
    };
    joints: {
        added: any[];
        removed: any[];
        modified: { item: any, changes: any[] }[];
    };
}

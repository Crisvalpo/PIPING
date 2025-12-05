export interface Empresa {
    id?: string
    nombre: string
    descripcion?: string
    logo_url?: string
    created_at?: string
    created_by?: string
    estado?: 'ACTIVA' | 'INACTIVA'
    // Fase 2: Multi-Data Source
    tipo_datos?: 'sharepoint' | 'google' | 'lukeapp'
    data_config?: Record<string, any>
}

export interface EmpresaCreateInput {
    nombre: string
    descripcion?: string
    logo_url?: string
}

export interface EmpresaUpdateInput {
    nombre?: string
    descripcion?: string
    logo_url?: string
    estado?: 'ACTIVA' | 'INACTIVA'
}


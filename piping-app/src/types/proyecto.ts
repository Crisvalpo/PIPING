export type EstadoProyecto = 'ACTIVO' | 'PAUSADO' | 'FINALIZADO'

export interface Proyecto {
    id?: string
    empresa_id: string
    nombre: string
    codigo: string
    descripcion?: string
    estado: EstadoProyecto
    fecha_inicio?: string
    fecha_fin_estimada?: string
    created_at?: string
    created_by?: string
    // Fase 2: Multi-Data Source
    config_origen?: Record<string, any>
}

export interface ProyectoCreateInput {
    empresa_id: string
    nombre: string
    descripcion?: string
    fecha_inicio?: string
    fecha_fin_estimada?: string
    // Fase 2: Configuración de origen de datos
    tipo_datos?: 'sharepoint' | 'google' | 'lukeapp'
    config_origen?: Record<string, any>
}

export interface ProyectoUpdateInput {
    nombre?: string
    descripcion?: string
    estado?: EstadoProyecto
    fecha_inicio?: string
    fecha_fin_estimada?: string
}

export interface ProyectoWithEmpresa extends Proyecto {
    empresa?: {
        id: string
        nombre: string
    }
}

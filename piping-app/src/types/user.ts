export type EstadoUsuario = 'PENDIENTE' | 'ACTIVO' | 'INACTIVO' | 'RECHAZADO'

export interface User {
    id?: string
    nombre: string
    rol: string
    telefono: string
    correo: string
    password?: string
    created_at?: string
    // Campos multi-tenant
    empresa_id?: string | null
    proyecto_id?: string | null
    es_admin_proyecto?: boolean
    estado_usuario?: EstadoUsuario
    invitado_por?: string | null
    token_invitacion?: string | null
    // Relaciones opcionales (cuando se hace join en Supabase)
    empresa?: {
        id: string
        nombre: string
    }
    proyecto?: {
        id: string
        nombre: string
        codigo?: string
    }
}


export interface AuthResponse {
    success: boolean
    message: string
    user?: User
}

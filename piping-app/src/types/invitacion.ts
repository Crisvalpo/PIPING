export interface Invitacion {
    id?: string
    proyecto_id: string
    email: string
    rol: string
    token: string
    creado_por: string
    usado: boolean
    usado_por?: string | null
    fecha_creacion?: string
    fecha_uso?: string | null
}

export interface InvitacionCreateInput {
    proyecto_id: string
    email: string
    rol: string
}

export interface InvitacionWithDetails extends Invitacion {
    proyecto?: {
        id: string
        nombre: string
        codigo: string
        empresa_id: string
    }
    creador?: {
        id: string
        nombre: string
    }
}

export interface ValidarInvitacionResponse {
    valida: boolean
    invitacion?: InvitacionWithDetails
    mensaje: string
}

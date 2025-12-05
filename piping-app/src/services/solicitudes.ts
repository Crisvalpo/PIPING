import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/types'

export interface SolicitudAcceso {
    id: string
    usuario_id: string
    empresa_id: string
    mensaje: string | null
    estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'
    created_at: string
    usuario: {
        nombre: string
        correo: string
    }
    empresa: {
        nombre: string
    }
}

/**
 * Obtener solicitudes pendientes
 * - Super Admin: ve todas las solicitudes
 * - Admin de Proyecto: ve solo las de su empresa
 */
export async function getPendingSolicitudes(): Promise<SolicitudAcceso[]> {
    try {
        // Obtener el token de sesión
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return []

        // Llamar a la API route que bypasea RLS
        const response = await fetch('/api/solicitudes/pending', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        })

        if (!response.ok) {
            console.error('Error fetching solicitudes:', await response.text())
            return []
        }

        const data = await response.json()
        return data as SolicitudAcceso[]
    } catch (error) {
        console.error('Error crítico en getPendingSolicitudes:', error)
        return []
    }
}

/**
 * Aprobar una solicitud de acceso (Vía API)
 */
export async function approveSolicitud(solicitudId: string): Promise<ApiResponse> {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return { success: false, message: 'No hay sesión activa' }

        const response = await fetch('/api/solicitudes/approve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ solicitudId })
        })

        const data = await response.json()

        if (!response.ok) {
            return { success: false, message: data.error || 'Error al aprobar solicitud' }
        }

        return { success: true, message: data.message }
    } catch (error: any) {
        return { success: false, message: error.message || 'Error inesperado' }
    }
}

/**
 * Rechazar una solicitud (Vía API)
 */
export async function rejectSolicitud(solicitudId: string): Promise<ApiResponse> {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return { success: false, message: 'No hay sesión activa' }

        const response = await fetch('/api/solicitudes/reject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ solicitudId })
        })

        const data = await response.json()

        if (!response.ok) {
            return { success: false, message: data.error || 'Error al rechazar solicitud' }
        }

        return { success: true, message: data.message }
    } catch (error: any) {
        return { success: false, message: error.message || 'Error inesperado' }
    }
}

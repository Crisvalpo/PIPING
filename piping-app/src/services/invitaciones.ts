import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export interface Invitacion {
    id: string
    email: string
    token: string
    empresa_id: string
    proyecto_id?: string
    rol: string
    estado: 'PENDIENTE' | 'USADA' | 'EXPIRADA'
    expires_at: string
    created_at: string
    empresa?: { nombre: string }
}

/**
 * Crear una nueva invitación (Solo Admins)
 */
export async function createInvitacion(
    emailOrParams: string | { email: string; proyecto_id: string; rol: string; empresa_id?: string },
    empresaId?: string,
    rol: string = 'USUARIO',
    proyectoId?: string
): Promise<ApiResponse<{ token: string, link: string }>> {
    try {
        // Soportar ambos formatos: objeto o parámetros individuales
        let email: string
        let finalEmpresaId: string | undefined
        let finalRol: string
        let finalProyectoId: string | undefined

        if (typeof emailOrParams === 'object') {
            // Formato objeto
            email = emailOrParams.email
            finalProyectoId = emailOrParams.proyecto_id
            finalRol = emailOrParams.rol
            finalEmpresaId = emailOrParams.empresa_id

            // Si no se proporciona empresa_id, obtenerla del proyecto
            if (!finalEmpresaId && finalProyectoId) {
                const { data: proyecto } = await supabase
                    .from('proyectos')
                    .select('empresa_id')
                    .eq('id', finalProyectoId)
                    .single()

                finalEmpresaId = proyecto?.empresa_id
            }
        } else {
            // Formato parámetros individuales (backward compatibility)
            email = emailOrParams
            finalEmpresaId = empresaId
            finalRol = rol
            finalProyectoId = proyectoId
        }

        if (!finalEmpresaId) {
            return { success: false, message: 'No se pudo determinar la empresa' }
        }

        // 1. Generar token único
        const token = uuidv4()

        // Obtener usuario actual para 'creado_por'
        const { data: { user } } = await supabase.auth.getUser()

        // 2. Insertar en BD
        const { data, error } = await supabase
            .from('invitaciones')
            .insert({
                email,
                token,
                empresa_id: finalEmpresaId,
                proyecto_id: finalProyectoId,
                rol: finalRol,
                estado: 'PENDIENTE',
                creado_por: user?.id // Guardar quién creó la invitación
            })
            .select()
            .single()

        if (error) throw error

        // 3. Generar Link
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        const link = `${baseUrl}/registro?token=${token}`

        return {
            success: true,
            message: 'Invitación creada exitosamente',
            data: { token, link }
        }

    } catch (error: any) {
        console.error('Error creando invitación:', error)
        return { success: false, message: error.message || 'Error al crear invitación' }
    }
}

/**
 * Generar link de invitación desde un token
 */
export function generarLinkInvitacion(token: string): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    return `${baseUrl}/registro?token=${token}`
}

/**
 * Validar un token de invitación
 */
export async function validateToken(token: string): Promise<ApiResponse<Invitacion>> {
    try {
        // Usamos la función RPC segura o consulta directa si las políticas lo permiten
        // Por simplicidad y seguridad, consultamos directo filtrando por token
        const { data, error } = await supabase
            .from('invitaciones')
            .select(`
                *,
                empresa:empresas(nombre)
            `)
            .eq('token', token)
            .eq('estado', 'PENDIENTE')
            .gt('expires_at', new Date().toISOString()) // Que no haya expirado
            .single()

        if (error || !data) {
            return { success: false, message: 'Invitación inválida o expirada' }
        }

        return { success: true, message: 'Invitación válida', data: data as any }

    } catch (error) {
        return { success: false, message: 'Error validando invitación' }
    }
}

/**
 * Marcar invitación como usada
 */
export async function markInvitacionAsUsed(token: string, userId: string): Promise<ApiResponse> {
    const { error } = await supabase
        .from('invitaciones')
        .update({
            estado: 'USADA',
            usado_por: userId
        })
        .eq('token', token)

    if (error) return { success: false, message: error.message }
    return { success: true, message: 'Invitación marcada como usada' }
}

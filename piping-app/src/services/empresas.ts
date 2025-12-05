import { supabase } from '@/lib/supabase'
import type { Empresa, EmpresaCreateInput, EmpresaUpdateInput, ApiResponse } from '@/types'

/**
 * Obtener todas las empresas (solo SUPER_ADMIN)
 */
export async function getAllEmpresas(): Promise<Empresa[]> {
    try {
        const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .order('nombre', { ascending: true })

        if (error) {
            console.error('Error fetching empresas:', error)
            return []
        }

        return data || []
    } catch (error) {
        console.error('Error crítico en getAllEmpresas:', error)
        return []
    }
}

/**
 * Obtener empresa por ID
 */
export async function getEmpresaById(id: string): Promise<Empresa | null> {
    try {
        const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching empresa:', error)
            return null
        }

        return data
    } catch (error) {
        console.error('Error crítico en getEmpresaById:', error)
        return null
    }
}

/**
 * Obtener empresa del usuario autenticado
 */
export async function getMyEmpresa(): Promise<Empresa | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        // Obtener empresa_id del usuario
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('empresa_id')
            .eq('id', user.id)
            .single()

        if (userError || !userData?.empresa_id) {
            return null
        }

        return getEmpresaById(userData.empresa_id)
    } catch (error) {
        console.error('Error crítico en getMyEmpresa:', error)
        return null
    }
}

/**
 * Crear nueva empresa
 */
export async function createEmpresa(input: EmpresaCreateInput): Promise<ApiResponse<Empresa>> {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return {
                success: false,
                message: 'Usuario no autenticado'
            }
        }

        // Verificar que el nombre no exista
        const { data: existing } = await supabase
            .from('empresas')
            .select('id')
            .eq('nombre', input.nombre)
            .single()

        if (existing) {
            return {
                success: false,
                message: 'Ya existe una empresa con ese nombre'
            }
        }

        const { data, error } = await supabase
            .from('empresas')
            .insert({
                ...input,
                created_by: user.id
            })
            .select()
            .single()

        if (error) {
            return {
                success: false,
                message: error.message
            }
        }

        return {
            success: true,
            message: 'Empresa creada exitosamente',
            data
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error al crear empresa'
        }
    }
}

/**
 * Actualizar empresa
 */
export async function updateEmpresa(
    id: string,
    input: EmpresaUpdateInput
): Promise<ApiResponse<Empresa>> {
    try {
        // Si se está actualizando el nombre, verificar que no exista
        if (input.nombre) {
            const { data: existing } = await supabase
                .from('empresas')
                .select('id')
                .eq('nombre', input.nombre)
                .neq('id', id)
                .single()

            if (existing) {
                return {
                    success: false,
                    message: 'Ya existe una empresa con ese nombre'
                }
            }
        }

        const { data, error } = await supabase
            .from('empresas')
            .update(input)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            return {
                success: false,
                message: error.message
            }
        }

        return {
            success: true,
            message: 'Empresa actualizada exitosamente',
            data
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error al actualizar empresa'
        }
    }
}

/**
 * Eliminar empresa (solo SUPER_ADMIN)
 */
export async function deleteEmpresa(id: string): Promise<ApiResponse> {
    try {
        const { error } = await supabase
            .from('empresas')
            .delete()
            .eq('id', id)

        if (error) {
            return {
                success: false,
                message: error.message
            }
        }

        return {
            success: true,
            message: 'Empresa eliminada exitosamente'
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error al eliminar empresa'
        }
    }
}

/**
 * Buscar empresas por nombre (usa API Route para bypass RLS)
 */
export async function searchEmpresas(query: string): Promise<Empresa[]> {
    try {
        const response = await fetch(`/api/empresas/search?q=${encodeURIComponent(query)}`)
        if (!response.ok) {
            throw new Error('Error en la búsqueda')
        }
        return await response.json()
    } catch (error) {
        console.error('Error en searchEmpresas:', error)
        return []
    }
}

/**
 * Verificar si el usuario tiene una solicitud pendiente para una empresa
 */
export async function hasPendingRequest(empresaId: string): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return false

        const { data, error } = await supabase
            .from('solicitudes_acceso_empresa')
            .select('id')
            .eq('usuario_id', user.id)
            .eq('empresa_id', empresaId)
            .eq('estado', 'PENDIENTE')
            .single()

        return !!data && !error
    } catch (error) {
        return false
    }
}

/**
 * Solicitar acceso a una empresa existente
 */
export async function requestAccessToEmpresa(empresaId: string, mensaje?: string): Promise<ApiResponse> {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuario no autenticado')

        const { error } = await supabase
            .from('solicitudes_acceso_empresa')
            .insert({
                usuario_id: user.id,
                empresa_id: empresaId,
                mensaje: mensaje,
                estado: 'PENDIENTE'
            })

        if (error) {
            if (error.code === '23505') { // Unique violation
                return {
                    success: false,
                    message: 'Ya tienes una solicitud pendiente para esta empresa'
                }
            }
            throw error
        }

        return {
            success: true,
            message: 'Solicitud enviada exitosamente. Un administrador revisará tu petición.'
        }
    } catch (error: any) {
        return {
            success: false,
            message: error.message || 'Error al enviar solicitud'
        }
    }
}

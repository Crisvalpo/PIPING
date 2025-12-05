import { supabase } from '@/lib/supabase'
import type {
    Proyecto,
    ProyectoCreateInput,
    ProyectoUpdateInput,
    ProyectoWithEmpresa,
    ApiResponse
} from '@/types'

/**
 * Obtener todos los proyectos (solo SUPER_ADMIN)
 */
export async function getAllProyectos(): Promise<ProyectoWithEmpresa[]> {
    try {
        const { data, error } = await supabase
            .from('proyectos')
            .select(`
        *,
        empresa:empresas(id, nombre, tipo_datos)
      `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching proyectos:', error)
            return []
        }

        return data || []
    } catch (error) {
        console.error('Error crítico en getAllProyectos:', error)
        return []
    }
}

/**
 * Obtener proyectos de una empresa
 */
export async function getProyectosByEmpresa(empresaId: string): Promise<Proyecto[]> {
    try {
        const { data, error } = await supabase
            .from('proyectos')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('nombre', { ascending: true })

        if (error) {
            console.error('Error fetching proyectos by empresa:', error)
            return []
        }

        return data || []
    } catch (error) {
        console.error('Error crítico en getProyectosByEmpresa:', error)
        return []
    }
}

/**
 * Obtener proyecto por ID
 */
export async function getProyectoById(id: string): Promise<ProyectoWithEmpresa | null> {
    try {
        const { data, error } = await supabase
            .from('proyectos')
            .select(`
        *,
        empresa:empresas(id, nombre, tipo_datos)
      `)
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching proyecto:', error)
            return null
        }

        return data
    } catch (error) {
        console.error('Error crítico en getProyectoById:', error)
        return null
    }
}

/**
 * Obtener proyecto del usuario autenticado
 */
export async function getMyProyecto(): Promise<ProyectoWithEmpresa | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        // Obtener proyecto_id del usuario
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('proyecto_id')
            .eq('id', user.id)
            .single()

        if (userError || !userData?.proyecto_id) {
            return null
        }

        return getProyectoById(userData.proyecto_id)
    } catch (error) {
        console.error('Error crítico en getMyProyecto:', error)
        return null
    }
}

/**
 * Crear nuevo proyecto
 */
export async function createProyecto(input: ProyectoCreateInput): Promise<ApiResponse<Proyecto>> {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return {
                success: false,
                message: 'Usuario no autenticado'
            }
        }

        // Verificar que el nombre no exista en la empresa
        const { data: existing } = await supabase
            .from('proyectos')
            .select('id')
            .eq('empresa_id', input.empresa_id)
            .eq('nombre', input.nombre)
            .single()

        if (existing) {
            return {
                success: false,
                message: 'Ya existe un proyecto con ese nombre en esta empresa'
            }
        }

        // Generar código único usando la función de Supabase
        const { data: codigoData, error: codigoError } = await supabase
            .rpc('generar_codigo_proyecto')

        if (codigoError) {
            return {
                success: false,
                message: 'Error al generar código de proyecto'
            }
        }

        // Crear el proyecto
        const { data, error } = await supabase
            .from('proyectos')
            .insert({
                empresa_id: input.empresa_id,
                nombre: input.nombre,
                descripcion: input.descripcion,
                fecha_inicio: input.fecha_inicio,
                fecha_fin_estimada: input.fecha_fin_estimada,
                config_origen: input.config_origen,
                codigo: codigoData,
                estado: 'ACTIVO',
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

        // Si se especificó tipo_datos, actualizar la empresa
        if (input.tipo_datos) {
            await supabase
                .from('empresas')
                .update({ tipo_datos: input.tipo_datos })
                .eq('id', input.empresa_id)
        }

        return {
            success: true,
            data,
            message: 'Proyecto creado exitosamente'
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error al crear proyecto'
        }
    }
}

/**
 * Actualizar proyecto
 */
export async function updateProyecto(
    id: string,
    input: ProyectoUpdateInput
): Promise<ApiResponse<Proyecto>> {
    try {
        // Si se está actualizando el nombre, verificar que no exista en la empresa
        if (input.nombre) {
            const { data: proyecto } = await supabase
                .from('proyectos')
                .select('empresa_id')
                .eq('id', id)
                .single()

            if (proyecto) {
                const { data: existing } = await supabase
                    .from('proyectos')
                    .select('id')
                    .eq('empresa_id', proyecto.empresa_id)
                    .eq('nombre', input.nombre)
                    .neq('id', id)
                    .single()

                if (existing) {
                    return {
                        success: false,
                        message: 'Ya existe un proyecto con ese nombre en esta empresa'
                    }
                }
            }
        }

        const { data, error } = await supabase
            .from('proyectos')
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
            message: 'Proyecto actualizado exitosamente',
            data
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error al actualizar proyecto'
        }
    }
}

/**
 * Eliminar proyecto (solo SUPER_ADMIN)
 */
export async function deleteProyecto(id: string): Promise<ApiResponse> {
    try {
        const { error } = await supabase
            .from('proyectos')
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
            message: 'Proyecto eliminado exitosamente'
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error al eliminar proyecto'
        }
    }
}

/**
 * Obtener estadísticas del proyecto
 */
export async function getProyectoStats(proyectoId: string) {
    try {
        // Contar usuarios del proyecto
        const { count: totalUsuarios } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('proyecto_id', proyectoId)
            .eq('estado_usuario', 'ACTIVO')

        // Contar admins del proyecto
        const { count: totalAdmins } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('proyecto_id', proyectoId)
            .eq('es_admin_proyecto', true)
            .eq('estado_usuario', 'ACTIVO')

        // Contar invitaciones pendientes
        const { count: invitacionesPendientes } = await supabase
            .from('invitaciones')
            .select('*', { count: 'exact', head: true })
            .eq('proyecto_id', proyectoId)
            .eq('usado', false)

        return {
            totalUsuarios: totalUsuarios || 0,
            totalAdmins: totalAdmins || 0,
            invitacionesPendientes: invitacionesPendientes || 0
        }
    } catch (error) {
        console.error('Error en getProyectoStats:', error)
        return {
            totalUsuarios: 0,
            totalAdmins: 0,
            invitacionesPendientes: 0
        }
    }
}

import { supabase } from '@/lib/supabase'
import type { User, Empresa, Proyecto, ApiResponse } from '@/types'

export interface SystemStats {
    totalUsuarios: number
    totalEmpresas: number
    totalProyectos: number
    usuariosPendientes: number
    solicitudesPendientes: number
}

/**
 * Obtener estadísticas globales del sistema
 */
export async function getSystemStats(): Promise<SystemStats> {
    try {
        // Total usuarios
        const { count: totalUsuarios } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })

        // Usuarios pendientes
        const { count: usuariosPendientes } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('estado_usuario', 'PENDIENTE')

        // Solicitudes de acceso pendientes
        const { count: solicitudesPendientes } = await supabase
            .from('solicitudes_acceso_empresa')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'PENDIENTE')

        // Total empresas
        const { count: totalEmpresas } = await supabase
            .from('empresas')
            .select('*', { count: 'exact', head: true })

        // Total proyectos
        const { count: totalProyectos } = await supabase
            .from('proyectos')
            .select('*', { count: 'exact', head: true })

        return {
            totalUsuarios: totalUsuarios || 0,
            totalEmpresas: totalEmpresas || 0,
            totalProyectos: totalProyectos || 0,
            usuariosPendientes: usuariosPendientes || 0,
            solicitudesPendientes: solicitudesPendientes || 0
        }
    } catch (error) {
        console.error('Error getting system stats:', error)
        return {
            totalUsuarios: 0,
            totalEmpresas: 0,
            totalProyectos: 0,
            usuariosPendientes: 0,
            solicitudesPendientes: 0
        }
    }
}

/**
 * Obtener todos los usuarios del sistema
 */
export async function getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select(`
            *,
            empresa:empresas(id, nombre),
            proyecto:proyectos(id, nombre, codigo)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching all users:', error)
        return []
    }

    return data || []
}

/**
 * Aprobar usuario pendiente
 */
export async function approveUser(userId: string): Promise<ApiResponse> {
    const { error } = await supabase
        .from('users')
        .update({ estado_usuario: 'ACTIVO' })
        .eq('id', userId)

    if (error) {
        return { success: false, message: error.message }
    }

    return { success: true, message: 'Usuario aprobado exitosamente' }
}

/**
 * Rechazar usuario pendiente
 */
export async function rejectUser(userId: string): Promise<ApiResponse> {
    const { error } = await supabase
        .from('users')
        .update({ estado_usuario: 'RECHAZADO' })
        .eq('id', userId)

    if (error) {
        return { success: false, message: error.message }
    }

    return { success: true, message: 'Usuario rechazado exitosamente' }
}

/**
 * Eliminar usuario permanentemente
 */
export async function deleteUser(userId: string): Promise<ApiResponse> {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

    if (error) {
        return { success: false, message: error.message }
    }

    return { success: true, message: 'Usuario eliminado exitosamente' }
}

/**
 * Obtener todas las empresas con conteo de proyectos
 */
/**
 * Obtener todas las empresas con conteo de proyectos
 */
export async function getAllEmpresasWithStats() {
    const { data, error } = await supabase
        .from('empresas')
        .select(`
            *,
            proyectos:proyectos(id, nombre)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching empresas:', error)
        return []
    }

    // Transformar para mantener compatibilidad con la interfaz que espera count
    // pero ahora también tendremos los detalles en el array
    return data?.map(empresa => ({
        ...empresa,
        proyectos: empresa.proyectos.map((p: any) => ({ ...p, count: 1 })) // Hack temporal para mantener compatibilidad de tipos si es necesario, o mejor ajustar el frontend
    })) || []
}

/**
 * Obtener todos los proyectos con detalles
 */
export async function getAllProyectosWithDetails() {
    const { data, error } = await supabase
        .from('proyectos')
        .select(`
            *,
            empresa:empresas(nombre),
            users:users(count)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching proyectos:', error)
        return []
    }

    return data || []
}

/**
 * Actualizar estado de empresa
 */
export async function updateEmpresaStatus(id: string, status: 'ACTIVA' | 'INACTIVA'): Promise<ApiResponse> {
    const { error } = await supabase
        .from('empresas')
        .update({ estado: status })
        .eq('id', id)

    if (error) return { success: false, message: error.message }
    return { success: true, message: 'Estado de empresa actualizado' }
}

/**
 * Eliminar empresa (solo SUPER_ADMIN)
 * Verifica que no haya proyectos ni usuarios asociados antes de eliminar
 */
export async function deleteEmpresa(id: string): Promise<ApiResponse> {
    try {
        // 1. Verificar si hay proyectos asociados
        const { count: proyectosCount, error: proyectosError } = await supabase
            .from('proyectos')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', id)

        if (proyectosError) {
            return {
                success: false,
                message: 'Error al verificar proyectos asociados: ' + proyectosError.message
            }
        }

        if (proyectosCount && proyectosCount > 0) {
            return {
                success: false,
                message: `No se puede eliminar la empresa. Tiene ${proyectosCount} proyecto(s) asociado(s). Por favor, elimínalos primero.`
            }
        }

        // 2. Verificar si hay usuarios asociados
        const { count: usersCount, error: usersError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', id)

        if (usersError) {
            return {
                success: false,
                message: 'Error al verificar usuarios asociados: ' + usersError.message
            }
        }

        if (usersCount && usersCount > 0) {
            return {
                success: false,
                message: `No se puede eliminar la empresa. Tiene ${usersCount} usuario(s) asociado(s). Por favor, reasígnalos primero.`
            }
        }

        // 3. Si no hay dependencias, proceder con la eliminación
        const { error } = await supabase
            .from('empresas')
            .delete()
            .eq('id', id)

        if (error) return { success: false, message: error.message }
        return { success: true, message: 'Empresa eliminada exitosamente' }

    } catch (error) {
        return {
            success: false,
            message: 'Error al eliminar empresa'
        }
    }
}


/**
 * Actualizar estado de proyecto
 */
export async function updateProyectoStatus(id: string, status: 'ACTIVO' | 'PAUSADO' | 'FINALIZADO'): Promise<ApiResponse> {
    const { error } = await supabase
        .from('proyectos')
        .update({ estado: status })
        .eq('id', id)

    if (error) return { success: false, message: error.message }
    return { success: true, message: 'Estado de proyecto actualizado' }
}

/**
 * Eliminar proyecto (solo SUPER_ADMIN)
 * Verifica que no haya usuarios asociados antes de eliminar
 */
export async function deleteProyecto(id: string): Promise<ApiResponse> {
    try {
        // 1. Verificar si hay usuarios asociados al proyecto
        const { count: usersCount, error: countError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('proyecto_id', id)

        if (countError) {
            return {
                success: false,
                message: 'Error al verificar usuarios asociados: ' + countError.message
            }
        }

        // 2. Si hay usuarios, no permitir eliminación
        if (usersCount && usersCount > 0) {
            return {
                success: false,
                message: `No se puede eliminar el proyecto. Tiene ${usersCount} usuario(s) asociado(s). Por favor, reasígnalos a otro proyecto primero.`
            }
        }

        // 3. Verificar si hay invitaciones pendientes
        const { count: invitacionesCount } = await supabase
            .from('invitaciones')
            .select('*', { count: 'exact', head: true })
            .eq('proyecto_id', id)
            .eq('usado', false)

        // 4. Si no hay usuarios, proceder con la eliminación
        const { error } = await supabase
            .from('proyectos')
            .delete()
            .eq('id', id)

        if (error) return { success: false, message: error.message }

        // 5. Mensaje de éxito con información adicional
        let message = 'Proyecto eliminado exitosamente'
        if (invitacionesCount && invitacionesCount > 0) {
            message += `. Se eliminaron también ${invitacionesCount} invitación(es) pendiente(s).`
        }

        return { success: true, message }

    } catch (error) {
        return {
            success: false,
            message: 'Error al eliminar proyecto'
        }
    }
}

/**
 * Crear nueva empresa (y opcionalmente un proyecto inicial)
 */
export async function createEmpresaAdmin(data: {
    nombre: string
    descripcion?: string
    crearProyecto?: boolean
    proyectoNombre?: string
    tipoDatos?: 'lukeapp' | 'google' | 'sharepoint'
    dataConfig?: Record<string, any>
}): Promise<ApiResponse> {
    try {
        // 1. Crear Empresa
        const { data: empresa, error: empresaError } = await supabase
            .from('empresas')
            .insert({
                nombre: data.nombre,
                descripcion: data.descripcion,
                tipo_datos: data.tipoDatos || 'lukeapp',
                data_config: data.dataConfig || {},
                estado: 'ACTIVA' // Las creadas por admin nacen activas
            })
            .select()
            .single()

        if (empresaError) throw empresaError

        // 2. Crear Proyecto (si se solicitó)
        if (data.crearProyecto && data.proyectoNombre) {
            // Generar código simple (ej: EMP-001) - Por ahora aleatorio corto
            const codigo = data.proyectoNombre.substring(0, 3).toUpperCase() + '-' + Math.floor(Math.random() * 1000)

            const { error: proyectoError } = await supabase
                .from('proyectos')
                .insert({
                    empresa_id: empresa.id,
                    nombre: data.proyectoNombre,
                    codigo: codigo,
                    descripcion: 'Proyecto inicial',
                    estado: 'ACTIVO',
                    config_origen: {} // Configuración vacía por defecto
                })

            if (proyectoError) {
                // Si falla el proyecto, avisamos pero no borramos la empresa (se puede crear manual)
                return {
                    success: true,
                    message: 'Empresa creada, pero error al crear proyecto: ' + proyectoError.message
                }
            }
        }

        return { success: true, message: 'Empresa creada exitosamente' }

    } catch (error: any) {
        return { success: false, message: error.message || 'Error al crear empresa' }
    }
}

/**
 * Crear nuevo proyecto en empresa existente
 */
export async function createProyecto(data: {
    empresaId: string
    nombre: string
    descripcion?: string
    configOrigen?: Record<string, any>
}): Promise<ApiResponse> {
    try {
        // Generar código simple
        const codigo = data.nombre.substring(0, 3).toUpperCase() + '-' + Math.floor(Math.random() * 1000)

        const { error } = await supabase
            .from('proyectos')
            .insert({
                empresa_id: data.empresaId,
                nombre: data.nombre,
                codigo: codigo,
                descripcion: data.descripcion,
                estado: 'ACTIVO',
                config_origen: data.configOrigen || {}
            })

        if (error) throw error

        return { success: true, message: 'Proyecto creado exitosamente' }

    } catch (error: any) {
        return { success: false, message: error.message || 'Error al crear proyecto' }
    }
}

/**
 * CUADRILLAS SERVICE
 * 
 * Servicio para gestionar cuadrillas (equipos de trabajo) y sus miembros.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
    Cuadrilla,
    CuadrillaMember,
    CreateCuadrillaRequest,
    UpdateCuadrillaRequest,
    AssignMemberRequest,
    CuadrillaPerformance
} from '@/types/impact-verification';

// =====================================================
// CRUD DE CUADRILLAS
// =====================================================

/**
 * Obtiene todas las cuadrillas de un proyecto
 */
export async function getCuadrillas(
    supabase: SupabaseClient,
    proyectoId: string,
    activeOnly: boolean = true
): Promise<Cuadrilla[]> {
    let query = supabase
        .from('cuadrillas')
        .select('*')
        .eq('proyecto_id', proyectoId);

    if (activeOnly) {
        query = query.eq('active', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return data as Cuadrilla[];
}

/**
 * Obtiene una cuadrilla específica por ID
 */
export async function getCuadrillaById(
    supabase: SupabaseClient,
    cuadrillaId: string
): Promise<Cuadrilla | null> {
    const { data, error } = await supabase
        .from('cuadrillas')
        .select('*')
        .eq('id', cuadrillaId)
        .single();

    if (error) throw error;

    return data as Cuadrilla;
}

/**
 * Crea una nueva cuadrilla
 */
export async function createCuadrilla(
    supabase: SupabaseClient,
    data: CreateCuadrillaRequest,
    userId: string
): Promise<Cuadrilla> {
    const { data: cuadrilla, error } = await supabase
        .from('cuadrillas')
        .insert({
            proyecto_id: data.proyecto_id,
            nombre: data.nombre,
            codigo: data.codigo,
            tipo: data.tipo || 'PRINCIPAL',
            supervisor_rut: data.supervisor_rut || null,
            capataz_rut: data.capataz_rut || null,
            created_by: userId,
            active: true
        })
        .select('*')
        .single();

    if (error) throw error;

    return cuadrilla as Cuadrilla;
}

/**
 * Actualiza una cuadrilla existente
 */
export async function updateCuadrilla(
    supabase: SupabaseClient,
    cuadrillaId: string,
    updates: UpdateCuadrillaRequest
): Promise<Cuadrilla> {
    const { data, error } = await supabase
        .from('cuadrillas')
        .update(updates)
        .eq('id', cuadrillaId)
        .select('*')
        .single();

    if (error) throw error;

    return data as Cuadrilla;
}

/**
 * Desactiva una cuadrilla (soft delete)
 */
export async function deactivateCuadrilla(
    supabase: SupabaseClient,
    cuadrillaId: string
): Promise<void> {
    const { error } = await supabase
        .from('cuadrillas')
        .update({ active: false })
        .eq('id', cuadrillaId);

    if (error) throw error;
}

/**
 * Elimina permanentemente una cuadrilla (hard delete)
 */
export async function deleteCuadrilla(
    supabase: SupabaseClient,
    cuadrillaId: string
): Promise<void> {
    const { error } = await supabase
        .from('cuadrillas')
        .delete()
        .eq('id', cuadrillaId);

    if (error) throw error;
}

// =====================================================
// GESTIÓN DE MIEMBROS
// =====================================================

/**
 * Obtiene los miembros de una cuadrilla
 * DEPRECATED: Se debe usar la vista cuadrillas_full en su lugar
 */
export async function getCuadrillaMembers(
    supabase: SupabaseClient,
    cuadrillaId: string,
    activeOnly: boolean = true
): Promise<CuadrillaMember[]> {
    // Get members from combined view which aggregates from assignment tables
    // For now, return empty array - UI should query assignment tables directly
    // or use cuadrillas_full view
    return [];
}

/**
 * Asigna un miembro a una cuadrilla
 * - SOLDADOR: va a soldadores_asignaciones (flexible, diario)
 * - MAESTRO/AYUDANTE: va a maestros_asignaciones (estable)
 * - SUPERVISOR/CAPATAZ: actualiza directamente la tabla cuadrillas
 */
export async function assignMemberToCuadrilla(
    supabase: SupabaseClient,
    data: AssignMemberRequest,
    assignedBy: string
): Promise<any> {
    // Si es supervisor o capataz, actualizar directamente la tabla cuadrillas
    if (data.role === 'SUPERVISOR') {
        const { error } = await supabase
            .from('cuadrillas')
            .update({ supervisor_rut: data.rut })
            .eq('id', data.cuadrilla_id);

        if (error) throw error;

        return {
            cuadrilla_id: data.cuadrilla_id,
            rut: data.rut,
            role: data.role,
            tipo_asignacion: 'JERARQUIA'
        };
    } else if (data.role === 'CAPATAZ') {
        const { error } = await supabase
            .from('cuadrillas')
            .update({ capataz_rut: data.rut })
            .eq('id', data.cuadrilla_id);

        if (error) throw error;

        return {
            cuadrilla_id: data.cuadrilla_id,
            rut: data.rut,
            role: data.role,
            tipo_asignacion: 'JERARQUIA'
        };
    } else if (data.role === 'SOLDADOR') {
        // Usa la función de la base de datos que cierra automáticamente asignaciones previas
        const { data: assignment, error } = await supabase
            .rpc('asignar_soldador_a_cuadrilla', {
                p_soldador_rut: data.rut,
                p_cuadrilla_id: data.cuadrilla_id,
                p_observaciones: data.observaciones || null
            });

        if (error) throw error;

        // Retornar información de la asignación
        return {
            id: assignment,
            soldador_rut: data.rut,
            cuadrilla_id: data.cuadrilla_id,
            role: data.role,
            tipo_asignacion: 'FLEXIBLE',
            fecha: new Date().toISOString().split('T')[0]
        };
    } else if (data.role === 'MAESTRO') {
        // Para maestros, primero desactivar asignación anterior si existe
        await supabase
            .from('maestros_asignaciones')
            .update({
                activo: false,
                fecha_desasignacion: new Date().toISOString().split('T')[0]
            })
            .eq('maestro_rut', data.rut)
            .eq('activo', true);

        // Crear nueva asignación
        const { data: assignment, error } = await supabase
            .from('maestros_asignaciones')
            .insert({
                maestro_rut: data.rut,
                cuadrilla_id: data.cuadrilla_id,
                observaciones: data.observaciones,
                activo: true
            })
            .select()
            .single();

        if (error) throw error;

        return {
            ...assignment,
            role: data.role,
            tipo_asignacion: 'ESTABLE'
        };
    }

    throw new Error(`Role ${data.role} no reconocido`);
}

/**
 * Remueve un miembro de una cuadrilla
 * Cierra la asignación en la tabla correspondiente según el rol
 */
export async function removeMemberFromCuadrilla(
    supabase: SupabaseClient,
    cuadrillaId: string,
    rut: string,
    role?: string
): Promise<void> {
    // Si no se proporciona el rol, intentar detectarlo
    if (!role) {
        // Verificar si es supervisor o capataz
        const { data: cuadrilla } = await supabase
            .from('cuadrillas')
            .select('supervisor_rut, capataz_rut')
            .eq('id', cuadrillaId)
            .single();

        if (cuadrilla?.supervisor_rut === rut) {
            role = 'SUPERVISOR';
        } else if (cuadrilla?.capataz_rut === rut) {
            role = 'CAPATAZ';
        } else {
            // Verificar en maestros
            const { data: maestro } = await supabase
                .from('maestros_asignaciones')
                .select('id')
                .eq('cuadrilla_id', cuadrillaId)
                .eq('maestro_rut', rut)
                .eq('activo', true)
                .single();

            if (maestro) {
                role = 'MAESTRO';
            } else {
                role = 'SOLDADOR'; // Por defecto
            }
        }
    }

    // Según el rol, cerrar asignación
    if (role === 'SUPERVISOR') {
        await supabase
            .from('cuadrillas')
            .update({ supervisor_rut: null })
            .eq('id', cuadrillaId)
            .eq('supervisor_rut', rut);
    } else if (role === 'CAPATAZ') {
        await supabase
            .from('cuadrillas')
            .update({ capataz_rut: null })
            .eq('id', cuadrillaId)
            .eq('capataz_rut', rut);
    } else if (role === 'MAESTRO') {
        const { error } = await supabase
            .from('maestros_asignaciones')
            .update({
                activo: false,
                fecha_desasignacion: new Date().toISOString().split('T')[0]
            })
            .eq('cuadrilla_id', cuadrillaId)
            .eq('maestro_rut', rut)
            .eq('activo', true);

        if (error) throw error;
    } else if (role === 'SOLDADOR') {
        // Cerrar asignación actual (hoy)
        const { error } = await supabase
            .from('soldadores_asignaciones')
            .update({ hora_fin: new Date().toTimeString().split(' ')[0] })
            .eq('cuadrilla_id', cuadrillaId)
            .eq('soldador_rut', rut)
            .eq('fecha', new Date().toISOString().split('T')[0])
            .is('hora_fin', null);

        if (error) throw error;
    }
}

// =====================================================
// PERFORMANCE Y ESTADÍSTICAS
// =====================================================

/**
 * Obtiene estadísticas de performance de una cuadrilla
 */
export async function getCuadrillaPerformance(
    supabase: SupabaseClient,
    cuadrillaId: string,
    fromDate: string,
    toDate: string
): Promise<CuadrillaPerformance> {
    // Obtener ejecuciones de soldaduras
    const { data: weldExecutions } = await supabase
        .from('weld_executions')
        .select('id, quality_status')
        .eq('cuadrilla_id', cuadrillaId)
        .gte('execution_date', fromDate)
        .lte('execution_date', toDate);

    // Obtener ejecuciones de juntas empernadas
    const { data: boltedJointExecutions } = await supabase
        .from('bolted_joint_executions')
        .select('id, quality_status')
        .eq('cuadrilla_id', cuadrillaId)
        .gte('execution_date', fromDate)
        .lte('execution_date', toDate);

    const weldsExecuted = weldExecutions?.length || 0;
    const boltedJointsExecuted = boltedJointExecutions?.length || 0;

    // Calcular estadísticas de calidad
    const allExecutions = [
        ...(weldExecutions || []),
        ...(boltedJointExecutions || [])
    ];

    const approved = allExecutions.filter(e => e.quality_status === 'APPROVED').length;
    const rejected = allExecutions.filter(e => e.quality_status === 'REJECTED').length;
    const rework = allExecutions.filter(e => e.quality_status === 'REWORK').length;

    // Calcular efficiency score (porcentaje de aprobados vs total)
    const total = allExecutions.length;
    const efficiencyScore = total > 0 ? Math.round((approved / total) * 100) : 0;

    return {
        cuadrilla_id: cuadrillaId,
        periodo: {
            desde: fromDate,
            hasta: toDate
        },
        welds_executed: weldsExecuted,
        bolted_joints_executed: boltedJointsExecuted,
        quality_stats: {
            approved,
            rejected,
            rework
        },
        efficiency_score: efficiencyScore
    };
}

/**
 * Obtiene el rendimiento de todas las cuadrillas de un proyecto
 */
export async function getProjectCuadrillasPerformance(
    supabase: SupabaseClient,
    proyectoId: string,
    fromDate: string,
    toDate: string
): Promise<CuadrillaPerformance[]> {
    // Obtener todas las cuadrillas activas del proyecto
    const { data: cuadrillas } = await supabase
        .from('cuadrillas')
        .select('id')
        .eq('proyecto_id', proyectoId)
        .eq('active', true);

    if (!cuadrillas || cuadrillas.length === 0) {
        return [];
    }

    // Obtener performance de cada cuadrilla
    const performances = await Promise.all(
        cuadrillas.map(c => getCuadrillaPerformance(supabase, c.id, fromDate, toDate))
    );

    return performances;
}

/**
 * Obtiene los soldadores disponibles para asignar (usuarios con rol WORKER o similar)
 */
export async function getAvailableWorkers(
    supabase: SupabaseClient,
    proyectoId: string
): Promise<any[]> {
    // TODO: Implementar búsqueda real cuando exista tabla de miembros de proyecto
    // Por ahora retornamos vacío ya que no podemos filtrar por rol sin user_projects
    console.warn('getAvailableWorkers: user_projects table not available in simplified schema');
    return [];
}

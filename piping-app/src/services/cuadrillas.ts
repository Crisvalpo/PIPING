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
    // Normalizar rol para manejar variantes (ej: "CAPATAZ PIPING", "MAESTRO MAYOR")
    const roleUpper = data.role.toUpperCase();

    // Si es supervisor o capataz, actualizar directamente la tabla cuadrillas
    if (roleUpper.includes('SUPERVISOR')) {
        console.log('🔵 Assigning SUPERVISOR:', { rut: data.rut, cuadrilla_id: data.cuadrilla_id, role: data.role });

        const { data: updatedCuadrilla, error } = await supabase
            .from('cuadrillas')
            .update({ supervisor_rut: data.rut })
            .eq('id', data.cuadrilla_id)
            .select('id, nombre, supervisor_rut')
            .single();

        console.log('✅ SUPERVISOR UPDATE result:', { updatedCuadrilla, error });

        if (error) throw error;

        if (!updatedCuadrilla || updatedCuadrilla.supervisor_rut !== data.rut) {
            throw new Error('Supervisor assignment failed - value not persisted');
        }

        return {
            cuadrilla_id: data.cuadrilla_id,
            rut: data.rut,
            role: data.role, // Mantener el rol original para display
            tipo_asignacion: 'JERARQUIA'
        };
    } else if (roleUpper.includes('CAPATAZ')) {
        console.log('🔵 Assigning CAPATAZ:', { rut: data.rut, cuadrilla_id: data.cuadrilla_id, role: data.role });

        const updates: any = { capataz_rut: data.rut };

        // AUTO-ASIGNACIÓN DE SUPERVISOR
        // Buscar quién es el supervisor habitual de este capataz en base al historial
        const { data: historial } = await supabase
            .from('cuadrillas')
            .select('supervisor_rut')
            .eq('capataz_rut', data.rut)
            .neq('supervisor_rut', null)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (historial?.supervisor_rut) {
            const { data: cuadrillaActual } = await supabase
                .from('cuadrillas')
                .select('supervisor_rut')
                .eq('id', data.cuadrilla_id)
                .single();

            if (!cuadrillaActual?.supervisor_rut) {
                updates.supervisor_rut = historial.supervisor_rut;
                console.log('📌 Auto-assigning supervisor from history:', historial.supervisor_rut);
            }
        }

        // También intentar buscar el "Jefe Directo" configurado en la tabla personal
        if (!updates.supervisor_rut) {
            const { data: personalData } = await supabase
                .from('personal')
                .select('jefe_directo_rut')
                .eq('rut', data.rut)
                .single();

            if (personalData?.jefe_directo_rut) {
                const { data: cuadrillaActual } = await supabase
                    .from('cuadrillas')
                    .select('supervisor_rut')
                    .eq('id', data.cuadrilla_id)
                    .single();

                if (!cuadrillaActual?.supervisor_rut) {
                    updates.supervisor_rut = personalData.jefe_directo_rut;
                    console.log('📌 Auto-assigning supervisor from jefe_directo:', personalData.jefe_directo_rut);
                }
            }
        }

        console.log('📝 About to UPDATE cuadrillas with:', updates);

        // CRITICAL: Select the updated row to verify persistence
        const { data: updatedCuadrilla, error } = await supabase
            .from('cuadrillas')
            .update(updates)
            .eq('id', data.cuadrilla_id)
            .select('id, nombre, codigo, capataz_rut, supervisor_rut')
            .single();

        console.log('✅ UPDATE completed:', { updatedCuadrilla, error });

        if (error) {
            console.error('❌ UPDATE failed:', error);
            throw error;
        }

        if (!updatedCuadrilla) {
            console.error('❌ UPDATE returned no data - likely RLS policy blocking');
            throw new Error('Failed to update cuadrilla - no rows returned (check RLS policies)');
        }

        if (updatedCuadrilla.capataz_rut !== data.rut) {
            console.error('❌ UPDATE succeeded but capataz_rut not set:', updatedCuadrilla);
            throw new Error('Capataz assignment failed - value not persisted');
        }

        console.log('✅ Capataz successfully assigned and verified');

        return {
            cuadrilla_id: data.cuadrilla_id,
            rut: data.rut,
            role: data.role,
            tipo_asignacion: 'JERARQUIA',
            supervisor_auto_assigned: !!updates.supervisor_rut
        };
    } else if (roleUpper.includes('SOLDADOR')) {
        const { data: assignment, error } = await supabase
            .rpc('asignar_soldador_a_cuadrilla', {
                p_soldador_rut: data.rut,
                p_cuadrilla_id: data.cuadrilla_id,
                p_observaciones: data.observaciones || null,
                p_shift_id: data.shift_id || null
            });

        if (error) throw error;

        return {
            id: assignment,
            soldador_rut: data.rut,
            cuadrilla_id: data.cuadrilla_id,
            role: data.role,
            tipo_asignacion: 'FLEXIBLE',
            fecha: new Date().toISOString().split('T')[0]
        };
    } else {
        // Por defecto MAESTRO/AYUDANTE
        // Usar función RPC para manejar tracking de tiempo correctamente
        const { data: assignmentId, error } = await supabase
            .rpc('asignar_maestro_a_cuadrilla', {
                p_maestro_rut: data.rut,
                p_cuadrilla_id: data.cuadrilla_id,
                p_observaciones: data.observaciones || null,
                p_shift_id: data.shift_id || null
            });

        if (error) throw error;

        return {
            id: assignmentId,
            rut: data.rut,
            cuadrilla_id: data.cuadrilla_id,
            role: data.role,
            tipo_asignacion: 'ESTABLE',
            fecha: new Date().toISOString().split('T')[0]
        };
    }
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
    if (!role) {
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
                role = 'SOLDADOR';
            }
        }
    }

    const roleUpper = role.toUpperCase();

    if (roleUpper.includes('SUPERVISOR')) {
        await supabase
            .from('cuadrillas')
            .update({ supervisor_rut: null })
            .eq('id', cuadrillaId)
            .eq('supervisor_rut', rut);
    } else if (roleUpper.includes('CAPATAZ')) {
        await supabase
            .from('cuadrillas')
            .update({ capataz_rut: null })
            .eq('id', cuadrillaId)
            .eq('capataz_rut', rut);
    } else if (roleUpper.includes('SOLDADOR')) {
        const { error } = await supabase
            .from('soldadores_asignaciones')
            .update({ hora_fin: new Date().toTimeString().split(' ')[0] })
            .eq('cuadrilla_id', cuadrillaId)
            .eq('soldador_rut', rut)
            .eq('fecha', new Date().toISOString().split('T')[0])
            .is('hora_fin', null);

        if (error) throw error;
    } else {
        // Asumimos maestro/ayudante para el resto
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

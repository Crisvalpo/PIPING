/**
 * API ROUTE: Approve Migration
 * 
 * POST /api/impact-verification/approve-migration
 * 
 * Aprueba la migración de avances seleccionados desde una revisión obsoleta
 * a una nueva revisión, y marca la nueva revisión como SPOOLEADO.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { migrateApprovedExecutions } from '@/services/impact-comparison';
import type { ApproveMigrationRequest, ApproveMigrationResponse } from '@/types/impact-verification';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'No autorizado',
                    error: 'Usuario no autenticado'
                } as ApproveMigrationResponse,
                { status: 401 }
            );
        }

        // 2. Parsear body
        const body: ApproveMigrationRequest = await request.json();
        const {
            new_revision_id,
            old_revision_id,
            approved_weld_ids,
            approved_bolted_joint_ids,
            approval_notes
        } = body;

        // 3. Validación de entrada
        if (!new_revision_id || !old_revision_id) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Parámetros inválidos',
                    error: 'Se requieren new_revision_id y old_revision_id'
                } as ApproveMigrationResponse,
                { status: 400 }
            );
        }

        // 4. Verificar permisos del usuario (debe ser ADMIN o PROJECT_MANAGER)
        // 4. Verificar permisos del usuario
        // Como no tenemos tabla de roles por proyecto, verificamos si el usuario tiene acceso a la revisión
        const { data: revisionAccess } = await supabase
            .from('isometric_revisions')
            .select('id')
            .eq('id', new_revision_id)
            .single();

        if (!revisionAccess) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Acceso denegado',
                    error: 'No tienes acceso a esta revisión'
                } as ApproveMigrationResponse,
                { status: 403 }
            );
        }

        // TODO: Implementar verificación de roles real cuando exista la tabla de miembros
        // Por ahora permitimos a cualquier usuario autenticado con acceso al proyecto
        const userRole = 'PROJECT_MANAGER'; // Placeholder para permitir la operación

        console.log('[approve-migration] Starting migration...', {
            user_id: user.id,
            user_role: userRole,
            new_revision_id,
            old_revision_id,
            welds_to_migrate: approved_weld_ids?.length || 0,
            bolted_joints_to_migrate: approved_bolted_joint_ids?.length || 0
        });

        // 5. Ejecutar migración de ejecuciones aprobadas
        const migrationResult = await migrateApprovedExecutions(
            supabase,
            old_revision_id,
            new_revision_id,
            approved_weld_ids || [],
            approved_bolted_joint_ids || [],
            user.id
        );

        console.log('[approve-migration] Migration complete:', migrationResult);

        // 6. Marcar la nueva revisión como SPOOLEADO
        const { error: updateError } = await supabase
            .from('isometric_revisions')
            .update({
                spooling_status: 'SPOOLEADO',
                spooling_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', new_revision_id);

        if (updateError) {
            console.error('[approve-migration] Error updating spooling status:', updateError);
            // No falla la migración por esto, solo advertir
        }

        // 7. Registrar la aprobación en el log de migraciones
        const { error: logError } = await supabase
            .from('impact_migration_log')
            .insert({
                impact_id: null, // Si quieres asociarlo a impactos específicos, actualiza esto
                migration_approved: true,
                approved_by: user.id,
                reason: approval_notes || `Migración manual aprobada: ${migrationResult.weldsMigrated} welds, ${migrationResult.boltedJointsMigrated} bolted joints`
            });

        if (logError) {
            console.error('[approve-migration] Error logging migration:', logError);
        }

        // 8. Actualizar el estado de la revisión anterior a OBSOLETA
        const { error: obsoleteError } = await supabase
            .from('isometric_revisions')
            .update({
                estado: 'OBSOLETA'
            })
            .eq('id', old_revision_id)
            .neq('estado', 'ELIMINADA'); // No cambiar si ya está eliminada

        if (obsoleteError) {
            console.error('[approve-migration] Error marking old revision as obsolete:', obsoleteError);
        }

        // 9. Retornar resultado
        return NextResponse.json(
            {
                success: true,
                message: `Migración completada: ${migrationResult.weldsMigrated} soldaduras y ${migrationResult.boltedJointsMigrated} juntas empernadas migradas`,
                data: {
                    migrated_welds: migrationResult.weldsMigrated,
                    migrated_bolted_joints: migrationResult.boltedJointsMigrated,
                    revision_marked_as_spooled: !updateError
                }
            } as ApproveMigrationResponse,
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[approve-migration] Error:', error);

        return NextResponse.json(
            {
                success: false,
                message: 'Error al aprobar migración',
                error: error.message || 'Error interno del servidor'
            } as ApproveMigrationResponse,
            { status: 500 }
        );
    }
}

/**
 * GET method para obtener historial de migraciones
 */
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'No autorizado' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const revisionId = searchParams.get('revision_id');
        const proyectoId = searchParams.get('proyecto_id');

        let query = supabase
            .from('impact_migration_log')
            .select(`
                *,
                approved_by_user:auth.users!impact_migration_log_approved_by_fkey (
                    id,
                    email
                )
            `)
            .order('created_at', { ascending: false });

        // Filtrar por revisión si se especifica
        // Nota: Necesitarías agregar campos a impact_migration_log para esto

        const { data: logs, error } = await query;

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: logs || []
        });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}

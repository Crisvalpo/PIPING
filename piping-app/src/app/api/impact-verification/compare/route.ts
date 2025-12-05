/**
 * API ROUTE: Compare Revisions
 * 
 * POST /api/impact-verification/compare
 * 
 * Compara dos revisiones de un isométrico y detecta todos los impactos,
 * determinando qué avances pueden migrarse automáticamente.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { compareRevisions } from '@/services/impact-comparison';
import type { CompareRevisionsRequest, CompareRevisionsResponse } from '@/types/impact-verification';

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
                } as CompareRevisionsResponse,
                { status: 401 }
            );
        }

        // 2. Parsear body
        const body: CompareRevisionsRequest = await request.json();
        const { old_revision_id, new_revision_id } = body;

        // 3. Validación de entrada
        if (!old_revision_id || !new_revision_id) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Parámetros inválidos',
                    error: 'Se requieren old_revision_id y new_revision_id'
                } as CompareRevisionsResponse,
                { status: 400 }
            );
        }

        if (old_revision_id === new_revision_id) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Error de validación',
                    error: 'Las revisiones deben ser diferentes'
                } as CompareRevisionsResponse,
                { status: 400 }
            );
        }

        // 4. Verificar que el usuario tiene acceso a las revisiones
        const { data: revisionsCheck } = await supabase
            .from('isometric_revisions')
            .select(`
                id,
                codigo,
                isometric_id,
                isometrics!inner (
                    id,
                    proyecto_id
                )
            `)
            .in('id', [old_revision_id, new_revision_id]);

        if (!revisionsCheck || revisionsCheck.length !== 2) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Acceso denegado',
                    error: 'No tienes acceso a estas revisiones o no existen'
                } as CompareRevisionsResponse,
                { status: 403 }
            );
        }

        // 5. Verificar que ambas revisiones pertenecen al mismo isométrico
        const iso1 = (revisionsCheck[0] as any).isometrics?.id;
        const iso2 = (revisionsCheck[1] as any).isometrics?.id;

        if (iso1 !== iso2) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Error de validación',
                    error: 'Las revisiones deben pertenecer al mismo isométrico'
                } as CompareRevisionsResponse,
                { status: 400 }
            );
        }

        console.log('[compare-revisions] Starting comparison...', {
            user_id: user.id,
            old_revision_id,
            new_revision_id
        });

        // 6. Ejecutar comparación
        const comparisonResult = await compareRevisions(
            supabase,
            old_revision_id,
            new_revision_id
        );

        console.log('[compare-revisions] Comparison complete:', {
            total_impacts: comparisonResult.impacts.length,
            blocking_impacts: comparisonResult.impacts.filter(i => i.is_blocking).length,
            can_auto_migrate: comparisonResult.summary.auto_migration_possible
        });

        // 7. Opcional: Guardar los impactos en la base de datos para histórico
        // (Puedes descomentar esto si quieres persistir cada comparación)
        /*
        if (comparisonResult.impacts.length > 0) {
            const impactsToInsert = comparisonResult.impacts.map(impact => ({
                new_revision_id: impact.new_revision_id,
                old_revision_id: impact.old_revision_id,
                impact_type: impact.impact_type,
                entity_type: impact.entity_type,
                entity_id: impact.entity_id,
                old_value: impact.old_value,
                new_value: impact.new_value,
                impact_summary: impact.impact_summary,
                is_blocking: impact.is_blocking
            }));
            
            await supabase.from('revision_impacts').insert(impactsToInsert);
        }
        */

        // 8. Retornar resultado
        return NextResponse.json(
            {
                success: true,
                message: `Comparación completada: ${comparisonResult.impacts.length} impactos detectados`,
                data: comparisonResult
            } as CompareRevisionsResponse,
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[compare-revisions] Error:', error);

        return NextResponse.json(
            {
                success: false,
                message: 'Error al comparar revisiones',
                error: error.message || 'Error interno del servidor'
            } as CompareRevisionsResponse,
            { status: 500 }
        );
    }
}

/**
 * GET method para obtener comparaciones históricas (opcional)
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

        // Obtener parámetros de query
        const { searchParams } = new URL(request.url);
        const revisionId = searchParams.get('revision_id');

        if (!revisionId) {
            return NextResponse.json(
                { success: false, message: 'revision_id es requerido' },
                { status: 400 }
            );
        }

        // Obtener impactos históricos para esta revisión
        const { data: impacts, error } = await supabase
            .from('revision_impacts')
            .select('*')
            .eq('new_revision_id', revisionId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: impacts || []
        });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}

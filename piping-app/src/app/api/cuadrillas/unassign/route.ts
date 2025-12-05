/**
 * API Route: POST /api/cuadrillas/unassign
 * 
 * Removes a worker from a cuadrilla
 * Closes their current assignment
 */

import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { removeMemberFromCuadrilla } from '@/services/cuadrillas';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'No autenticado' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { rut, cuadrilla_id, role } = body;

        // Validate required fields
        if (!rut || !cuadrilla_id) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Faltan campos requeridos: rut, cuadrilla_id'
                },
                { status: 400 }
            );
        }

        // Remove member (closes their assignment)
        await removeMemberFromCuadrilla(
            supabase,
            cuadrilla_id,
            rut,
            role
        );

        return NextResponse.json({
            success: true,
            message: 'Personal removido exitosamente'
        });

    } catch (error: any) {
        console.error('Error removing from cuadrilla:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Error al remover personal'
            },
            { status: 500 }
        );
    }
}

/**
 * API Route: POST /api/cuadrillas/assign
 * 
 * Assigns or moves a worker to a cuadrilla
 * Automatically closes previous assignment if exists
 */

import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { assignMemberToCuadrilla } from '@/services/cuadrillas';

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
        const { rut, cuadrilla_id, role, observaciones } = body;

        // Validate required fields
        if (!rut || !cuadrilla_id || !role) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Faltan campos requeridos: rut, cuadrilla_id, role'
                },
                { status: 400 }
            );
        }

        // Assign member (this will auto-close previous assignment)
        const result = await assignMemberToCuadrilla(
            supabase,
            {
                cuadrilla_id,
                rut,
                role,
                observaciones
            },
            user.id
        );

        return NextResponse.json({
            success: true,
            message: 'Personal asignado exitosamente',
            data: result
        });

    } catch (error: any) {
        console.error('Error assigning to cuadrilla:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Error al asignar personal'
            },
            { status: 500 }
        );
    }
}

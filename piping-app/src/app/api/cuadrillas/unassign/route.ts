/**
 * API Route: POST /api/cuadrillas/unassign
 * 
 * Removes a worker from a cuadrilla
 * Closes their current assignment
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { removeMemberFromCuadrilla } from '@/services/cuadrillas';

// Initialize Supabase client with Service Role Key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Fallback to Anon key if Service key is missing (though Service key is preferred for admin tasks)
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(request: NextRequest) {
    try {
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

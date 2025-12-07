/**
 * API Route: POST /api/cuadrillas/asistencia
 * 
 * Registers attendance for a worker
 */

import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Auth check...

        const body = await request.json();
        const { rut, proyecto_id, presente, motivo, hora_entrada } = body;

        if (!rut || !proyecto_id) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabase
            .rpc('registrar_asistencia', {
                p_personal_rut: rut,
                p_proyecto_id: proyecto_id,
                p_presente: presente,
                p_motivo: motivo || null,
                p_hora_entrada: hora_entrada || '08:00:00'
            });

        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('Error registering attendance:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

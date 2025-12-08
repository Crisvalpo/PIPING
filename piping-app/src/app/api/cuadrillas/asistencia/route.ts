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
        const { rut, proyecto_id, presente, motivo, hora_entrada, es_dia_extra } = body;

        if (!rut || !proyecto_id) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Manejar Override de Día Extra
        if (es_dia_extra) {
            const today = new Date().toISOString().split('T')[0];

            if (presente) {
                // Crear/Actualizar override
                const { error: overrideError } = await supabase
                    .from('personal_override_diario')
                    .upsert({
                        personal_rut: rut,
                        proyecto_id: proyecto_id,
                        fecha: today,
                        tipo: 'DIA_EXTRA',
                        motivo: motivo || 'Día extra autorizado'
                    }, { onConflict: 'personal_rut, fecha' });

                if (overrideError) {
                    console.error('Error creando override DIA_EXTRA:', overrideError);
                    // No bloqueamos, pero logueamos
                }
            } else {
                // Si se marca ausente, eliminar el override si existe
                const { error: deleteError } = await supabase
                    .from('personal_override_diario')
                    .delete()
                    .eq('personal_rut', rut)
                    .eq('fecha', today)
                    .eq('tipo', 'DIA_EXTRA');

                if (deleteError) {
                    console.error('Error eliminando override DIA_EXTRA:', deleteError);
                }
            }
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

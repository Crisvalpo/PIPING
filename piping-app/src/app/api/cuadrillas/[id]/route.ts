/**
 * API Route: DELETE and PUT for /api/cuadrillas/[id]
 */

import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const cuadrillaId = params.id;
        const supabase = await createClient();

        console.log(`🗑️ Deleting cuadrilla: ${cuadrillaId}`);

        // 1. Close all active sold assignments for this cuadrilla
        const { error: soldadoresError } = await supabase
            .from('soldadores_asignaciones')
            .update({ hora_fin: new Date().toTimeString().split(' ')[0] })
            .eq('cuadrilla_id', cuadrillaId)
            .is('hora_fin', null);

        if (soldadoresError) {
            console.error('Error closing soldadores:', soldadoresError);
        }

        // 2. Close all active maestro assignments for this cuadrilla
        const { error: maestrosError } = await supabase
            .from('maestros_asignaciones')
            .update({
                fecha_desasignacion: new Date().toISOString().split('T')[0],
                activo: false
            })
            .eq('cuadrilla_id', cuadrillaId)
            .eq('activo', true);

        if (maestrosError) {
            console.error('Error closing maestros:', maestrosError);
        }

        // 3. Clear supervisor and capataz from cuadrillas table
        const { error: clearError } = await supabase
            .from('cuadrillas')
            .update({
                supervisor_rut: null,
                capataz_rut: null
            })
            .eq('id', cuadrillaId);

        if (clearError) {
            console.error('Error clearing supervisor/capataz:', clearError);
        }

        // 4. Mark cuadrilla as inactive (soft delete)
        const { error: deleteError } = await supabase
            .from('cuadrillas')
            .update({ active: false })
            .eq('id', cuadrillaId);

        if (deleteError) throw deleteError;

        console.log(`✅ Cuadrilla ${cuadrillaId} deleted successfully`);

        return NextResponse.json({
            success: true,
            message: 'Cuadrilla eliminada. Todos los miembros están ahora disponibles.'
        });

    } catch (error: any) {
        console.error('Error deleting cuadrilla:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Error al eliminar cuadrilla'
            },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const cuadrillaId = params.id;
        const supabase = await createClient();
        const body = await request.json();

        const { nombre, codigo, tipo, descripcion } = body;

        console.log(`✏️ Updating cuadrilla ${cuadrillaId}`, body);

        if (!nombre || !codigo) {
            return NextResponse.json(
                { success: false, error: 'Nombre y código son requeridos' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('cuadrillas')
            .update({
                nombre,
                codigo,
                tipo: tipo || 'PRINCIPAL',
                descripcion: descripcion || ''
            })
            .eq('id', cuadrillaId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Cuadrilla actualizada exitosamente',
            data
        });

    } catch (error: any) {
        console.error('Error updating cuadrilla:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Error al actualizar cuadrilla'
            },
            { status: 500 }
        );
    }
}

/**
 * API Route: GET /api/proyectos/[id]/cuadrillas/daily
 * 
 * Returns daily crew status including:
 * - All cuadrillas with current workers
 * - Available personnel (not assigned today)
 */

import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const proyectoId = params.id;
        const supabase = await createClient();

        // Get all active cuadrillas for this project with their current assignments
        const { data: cuadrillasData, error: cuadrillasError } = await supabase
            .from('cuadrillas_full')
            .select('*')
            .eq('proyecto_id', proyectoId)
            .eq('activo', true);

        if (cuadrillasError) {
            console.error('❌ Error fetching cuadrillas_full:', cuadrillasError);
            throw cuadrillasError;
        }

        console.log('📊 Raw Cuadrillas Data from View:', JSON.stringify(cuadrillasData, null, 2));

        // Transform the data to match UI expectations
        const cuadrillas = cuadrillasData?.map((c: any) => ({
            id: c.id,
            nombre: c.nombre,
            codigo: c.codigo,
            tipo: c.tipo,
            supervisor: c.supervisor_rut ? {
                rut: c.supervisor_rut,
                nombre: c.supervisor_nombre,
                email: c.supervisor_email
            } : null,
            capataz: c.capataz_rut ? {
                rut: c.capataz_rut,
                nombre: c.capataz_nombre,
                email: c.capataz_email
            } : null,
            trabajadores_actuales: [
                ...(c.maestros || []),
                ...(c.soldadores || [])
            ],
            total_members: c.total_members || 0
        })) || [];

        // Get all personal from this project who are not currently assigned
        // First get all personal in the project
        const { data: allPersonal, error: personalError } = await supabase
            .from('personal')
            .select('rut, nombre, email, cargo')
            .eq('proyecto_id', proyectoId)
            .eq('activo', true);

        if (personalError) throw personalError;

        // Get RUTs of currently assigned workers
        const assignedRuts = new Set<string>();

        cuadrillas.forEach(c => {
            c.trabajadores_actuales.forEach((t: any) => {
                assignedRuts.add(t.rut);
            });
        });

        // Also add supervisors and capataces
        cuadrillas.forEach(c => {
            if (c.supervisor?.rut) assignedRuts.add(c.supervisor.rut);
            if (c.capataz?.rut) assignedRuts.add(c.capataz.rut);
        });

        // Filter out assigned personnel
        const personal_disponible = allPersonal?.filter(p => !assignedRuts.has(p.rut)) || [];

        return NextResponse.json({
            success: true,
            data: {
                cuadrillas,
                personal_disponible,
                fecha: new Date().toISOString().split('T')[0]
            }
        });

    } catch (error: any) {
        console.error('Error fetching daily cuadrillas:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Error al obtener estado de cuadrillas'
            },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * GET /api/proyectos/[id]/personnel
 * 
 * Query params:
 * - role: 'CAPATAZ' | 'SOLDADOR' (required)
 * - cuadrilla_id: UUID (optional, for SOLDADOR - filters by specific cuadrilla)
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Await params for Next.js 16+
        const { id: proyectoId } = await params
        const { searchParams } = new URL(request.url)
        const role = searchParams.get('role') || 'SOLDADOR'
        const cuadrillaId = searchParams.get('cuadrilla_id')

        if (!['SOLDADOR', 'CAPATAZ'].includes(role)) {
            return NextResponse.json(
                { error: 'role debe ser SOLDADOR o CAPATAZ' },
                { status: 400 }
            )
        }

        let data: any[] = []

        if (role === 'CAPATAZ') {
            // Get capataces: personal with cargo containing 'CAPATAZ'
            const { data: capataces, error } = await supabase
                .from('personal')
                .select('rut, nombre, codigo_trabajador, cargo')
                .eq('proyecto_id', proyectoId)
                .eq('activo', true)
                .ilike('cargo', '%CAPATAZ%')
                .order('nombre')

            if (error) throw error

            // Get cuadrilla assignments for these capataces
            const rutsCapataces = capataces?.map(c => c.rut) || []

            if (rutsCapataces.length > 0) {
                const { data: cuadrillas } = await supabase
                    .from('cuadrillas')
                    .select('id, nombre, codigo, capataz_rut')
                    .in('capataz_rut', rutsCapataces)
                    .eq('active', true)

                // Merge cuadrilla info into capataces
                data = (capataces || []).map(c => {
                    const cuadrilla = cuadrillas?.find(cua => cua.capataz_rut === c.rut)
                    return {
                        ...c,
                        cuadrilla_id: cuadrilla?.id || null,
                        cuadrilla_nombre: cuadrilla?.nombre || null,
                        cuadrilla_codigo: cuadrilla?.codigo || null
                    }
                })
            } else {
                data = capataces || []
            }

        } else if (role === 'SOLDADOR') {
            if (cuadrillaId) {
                // Get cuadrilla members from cuadrillas_full view
                const { data: cuadrillaData, error: cError } = await supabase
                    .from('cuadrillas_full')
                    .select('members')
                    .eq('id', cuadrillaId)
                    .single()

                if (cError) {
                    console.error('cuadrillas_full error:', cError)
                }

                // Filter members that have SOLDADOR in their rol OR cargo
                const members = cuadrillaData?.members || []
                data = (members as any[])
                    .filter((m: any) =>
                        m.rol?.toUpperCase() === 'SOLDADOR' ||
                        m.cargo?.toUpperCase().includes('SOLDADOR')
                    )
                    .map((m: any) => ({
                        rut: m.rut,
                        nombre: m.nombre,
                        codigo_trabajador: m.codigo || m.codigo_trabajador || null,
                        cargo: m.cargo,
                        estampa: m.estampa || null
                    }))
                    .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

            } else {
                // Get all soldadores from project
                const { data: soldadores, error } = await supabase
                    .from('personal')
                    .select('rut, nombre, codigo_trabajador, cargo')
                    .eq('proyecto_id', proyectoId)
                    .eq('activo', true)
                    .ilike('cargo', '%SOLDADOR%')
                    .order('nombre')

                if (error) throw error

                // Get cuadrilla assignments via maestros_asignaciones
                const rutsSoldadores = soldadores?.map(s => s.rut) || []

                if (rutsSoldadores.length > 0) {
                    const { data: asignaciones } = await supabase
                        .from('maestros_asignaciones')
                        .select(`
                            maestro_rut,
                            cuadrilla_id,
                            cuadrillas:cuadrilla_id (
                                id,
                                nombre,
                                codigo
                            )
                        `)
                        .in('maestro_rut', rutsSoldadores)
                        .eq('activo', true)

                    // Merge cuadrilla info
                    data = (soldadores || []).map((s: any) => {
                        const asig = asignaciones?.find((a: any) => a.maestro_rut === s.rut)
                        const cuad = asig?.cuadrillas as any
                        return {
                            ...s,
                            estampa: null,
                            cuadrilla_id: cuad?.id || null,
                            cuadrilla_nombre: cuad?.nombre || null,
                            cuadrilla_codigo: cuad?.codigo || null
                        }
                    })
                } else {
                    data = soldadores || []
                }
            }
        }

        return NextResponse.json({
            success: true,
            data
        })
    } catch (error: any) {
        console.error('[GET /api/proyectos/[id]/personnel] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al obtener personal' },
            { status: 500 }
        )
    }
}

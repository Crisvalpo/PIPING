import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * GET /api/personal/hierarchy?proyectoId=xxx
 * Obtiene la jerarquía organizacional completa filtrada por el proyecto del usuario
 */
export async function GET(request: NextRequest) {
    try {
        // Get proyecto ID from query params
        const searchParams = request.nextUrl.searchParams
        const proyectoId = searchParams.get('proyectoId')

        if (!proyectoId) {
            return NextResponse.json({
                success: true,
                data: []
            })
        }

        // Obtener todos los supervisores del proyecto
        const { data: cuadrillasProyecto } = await supabase
            .from('cuadrillas')
            .select('supervisor_rut')
            .eq('proyecto_id', proyectoId)
            .eq('activo', true)

        if (!cuadrillasProyecto || cuadrillasProyecto.length === 0) {
            return NextResponse.json({
                success: true,
                data: []
            })
        }

        const supervisorRuts = [...new Set(cuadrillasProyecto.map(c => c.supervisor_rut).filter(Boolean))]

        // Obtener datos de supervisores
        const { data: supervisores, error: supError } = await supabase
            .from('personal')
            .select('rut, nombre, email')
            .in('rut', supervisorRuts)
            .eq('proyecto_id', proyectoId)

        if (supError) throw supError

        // Para cada supervisor, obtener sus cuadrillas
        const jerarquia = []

        for (const supervisor of supervisores || []) {
            // Obtener cuadrillas del supervisor en este proyecto
            const { data: cuadrillas, error: cuadError } = await supabase
                .from('cuadrillas')
                .select(`
                    id,
                    nombre,
                    codigo,
                    capataz_rut,
                    activo
                `)
                .eq('supervisor_rut', supervisor.rut)
                .eq('proyecto_id', proyectoId)
                .eq('activo', true)

            if (cuadError) {
                console.error('Error fetching cuadrillas:', cuadError)
                continue
            }

            const cuadrillasConDetalles = await Promise.all(
                (cuadrillas || []).map(async (cuadrilla) => {
                    // Obtener capataz
                    let capataz = null
                    if (cuadrilla.capataz_rut) {
                        const { data } = await supabase
                            .from('personal')
                            .select('rut, nombre')
                            .eq('rut', cuadrilla.capataz_rut)
                            .eq('proyecto_id', proyectoId)
                            .single()
                        capataz = data
                    }

                    // Obtener maestros
                    const { data: maestros } = await supabase
                        .from('maestros_asignaciones')
                        .select(`
                            maestro_rut,
                            personal:maestro_rut (
                                rut,
                                nombre
                            ),
                            soldadores:maestro_rut (
                                estampa,
                                certificacion_actual
                            )
                        `)
                        .eq('cuadrilla_id', cuadrilla.id)
                        .eq('activo', true)

                    // Obtener soldadores activos
                    const { data: soldadoresActivos } = await supabase
                        .rpc('get_soldadores_activos_cuadrilla', {
                            p_cuadrilla_id: cuadrilla.id
                        })

                    return {
                        id: cuadrilla.id,
                        nombre: cuadrilla.nombre,
                        codigo: cuadrilla.codigo,
                        activo: cuadrilla.activo,
                        capataz,
                        maestros: (maestros || []).map((m: any) => ({
                            rut: m.personal?.rut,
                            nombre: m.personal?.nombre,
                            estampa: m.soldadores?.estampa,
                            certificacion: m.soldadores?.certificacion_actual
                        })),
                        soldadores_actuales: soldadoresActivos || []
                    }
                })
            )

            jerarquia.push({
                rut: supervisor.rut,
                nombre: supervisor.nombre,
                email: supervisor.email,
                cuadrillas: cuadrillasConDetalles
            })
        }

        return NextResponse.json({
            success: true,
            data: jerarquia
        })

    } catch (error: any) {
        console.error('[GET /api/personal/hierarchy] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al obtener jerarquía' },
            { status: 500 }
        )
    }
}

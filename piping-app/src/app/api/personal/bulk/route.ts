import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface BulkWorker {
    rut: string
    nombre: string
    cargo?: string
    email?: string
    telefono?: string
}

/**
 * POST /api/personal/bulk
 * Carga masiva de personal desde CSV/Excel
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { workers, proyectoId } = body as { workers: BulkWorker[], proyectoId: string }

        if (!proyectoId) {
            return NextResponse.json(
                { error: 'Se requiere seleccionar un proyecto' },
                { status: 400 }
            )
        }

        if (!workers || !Array.isArray(workers) || workers.length === 0) {
            return NextResponse.json(
                { error: 'Se requiere un array de trabajadores' },
                { status: 400 }
            )
        }

        const results = {
            imported: 0,
            skipped: 0,
            errors: [] as Array<{ rut: string; error: string }>
        }

        for (const worker of workers) {
            try {
                // Validar RUT requerido
                if (!worker.rut || !worker.nombre) {
                    results.errors.push({
                        rut: worker.rut || 'DESCONOCIDO',
                        error: 'RUT y nombre son requeridos'
                    })
                    results.skipped++
                    continue
                }

                // Formatear RUT usando la función de base de datos
                const { data: rutFormateado, error: formatError } = await supabase
                    .rpc('formatear_rut', { rut_input: worker.rut })

                if (formatError) {
                    results.errors.push({
                        rut: worker.rut,
                        error: `Error al formatear RUT: ${formatError.message}`
                    })
                    results.skipped++
                    continue
                }

                // Validar RUT
                const { data: esValido, error: validError } = await supabase
                    .rpc('validar_rut', { rut_input: rutFormateado })

                if (validError || !esValido) {
                    results.errors.push({
                        rut: worker.rut,
                        error: 'RUT inválido (no pasa validación módulo 11)'
                    })
                    results.skipped++
                    continue
                }

                // Insertar en personal
                const insertData = {
                    rut: rutFormateado,
                    nombre: worker.nombre.toUpperCase(),
                    email: worker.email,
                    telefono: worker.telefono,
                    cargo: worker.cargo?.toUpperCase(),
                    activo: true,
                    proyecto_id: proyectoId
                };

                console.log(`👤 Inserting worker: ${rutFormateado}`, insertData);

                const { error: insertError } = await supabase
                    .from('personal')
                    .insert(insertData)

                if (insertError) {
                    console.error(`❌ Insert Error for ${rutFormateado}:`, insertError);
                    if (insertError.code === '23505') {
                        // Ya existe, contar como skipped con mensaje claro
                        results.errors.push({
                            rut: worker.rut,
                            error: 'Este RUT ya existe en el sistema'
                        })
                        results.skipped++
                    } else {
                        results.errors.push({
                            rut: worker.rut,
                            error: `Error BD: ${insertError.message}`
                        })
                        results.skipped++
                    }
                } else {
                    console.log(`✅ Worker ${rutFormateado} inserted successfully`);
                    results.imported++
                }

            } catch (error: any) {
                results.errors.push({
                    rut: worker.rut,
                    error: error.message || 'Error desconocido'
                })
                results.skipped++
            }
        }

        return NextResponse.json({
            success: true,
            message: `Importación completada: ${results.imported} importados, ${results.skipped} omitidos`,
            ...results
        })

    } catch (error: any) {
        console.error('[POST /api/personal/bulk] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al importar personal masivamente' },
            { status: 500 }
        )
    }
}

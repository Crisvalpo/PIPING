/**
 * API Route: GET/PUT /api/personal/[rut]/estampa
 * 
 * Manages welder stamps (estampa) for personnel
 */

import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Retrieve welder stamp
export async function GET(
    request: NextRequest,
    { params }: { params: { rut: string } }
) {
    try {
        const supabase = await createClient()
        const rut = decodeURIComponent(params.rut)

        const { data, error } = await supabase
            .from('soldadores')
            .select('estampa, certificacion_actual, fecha_vencimiento_cert')
            .eq('rut', rut)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                // Not found - worker is not registered as soldador yet
                return NextResponse.json({
                    success: true,
                    estampa: null,
                    message: 'Worker not registered as welder yet'
                })
            }
            throw error
        }

        return NextResponse.json({
            success: true,
            estampa: data.estampa,
            certificacion_actual: data.certificacion_actual,
            fecha_vencimiento_cert: data.fecha_vencimiento_cert
        })

    } catch (error: any) {
        console.error('Error fetching estampa:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// PUT - Create or update welder stamp
export async function PUT(
    request: NextRequest,
    { params }: { params: { rut: string } }
) {
    try {
        const supabase = await createClient()
        const rut = decodeURIComponent(params.rut)
        const body = await request.json()
        const { estampa } = body

        if (!estampa || estampa.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Estampa is required' },
                { status: 400 }
            )
        }

        // Check if welder already exists
        const { data: existing } = await supabase
            .from('soldadores')
            .select('rut')
            .eq('rut', rut)
            .single()

        if (existing) {
            // Update existing
            const { error } = await supabase
                .from('soldadores')
                .update({ estampa: estampa.trim().toUpperCase() })
                .eq('rut', rut)

            if (error) {
                if (error.code === '23505') {
                    // Unique constraint violation
                    return NextResponse.json(
                        { success: false, error: 'Esta estampa ya está en uso por otro soldador' },
                        { status: 400 }
                    )
                }
                throw error
            }

            return NextResponse.json({
                success: true,
                message: 'Estampa actualizada exitosamente'
            })
        } else {
            // Create new soldador entry
            const { error } = await supabase
                .from('soldadores')
                .insert({
                    rut,
                    estampa: estampa.trim().toUpperCase(),
                    certificacion_actual: 'PENDIENTE',
                    observaciones: 'Registrado desde gestión de personal'
                })

            if (error) {
                if (error.code === '23505') {
                    return NextResponse.json(
                        { success: false, error: 'Esta estampa ya está en uso por otro soldador' },
                        { status: 400 }
                    )
                }
                throw error
            }

            return NextResponse.json({
                success: true,
                message: 'Estampa creada exitosamente'
            })
        }

    } catch (error: any) {
        console.error('Error saving estampa:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

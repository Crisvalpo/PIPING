import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/spools/[spoolNumber]/levantamientos?revisionId=xxx
export async function GET(
    request: NextRequest,
    paramsObj: { params: Promise<{ spoolNumber: string }> }
) {
    try {
        const params = await paramsObj.params
        const supabase = await createClient()
        let { data: { user } } = await supabase.auth.getUser()

        // Fallback: Check for Bearer token
        if (!user) {
            const authHeader = request.headers.get('authorization')
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1]
                const { data } = await supabase.auth.getUser(token)
                user = data.user
            }
        }

        const searchParams = request.nextUrl.searchParams
        const revisionId = searchParams.get('revisionId')

        if (!revisionId) {
            return NextResponse.json({ error: 'revisionId requerido' }, { status: 400 })
        }

        const spoolNumber = decodeURIComponent(params.spoolNumber)

        // Get levantamientos for this spool
        const { data: levantamientos, error } = await supabase
            .from('spool_levantamientos')
            .select('*')
            .eq('spool_number', spoolNumber)
            .eq('revision_id', revisionId)
            .order('captured_at', { ascending: false })

        if (error) throw error

        // Initialize Admin Client for resolving users reliably
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // For each levantamiento, fetch photos and user info
        const levantamientosWithDetails = await Promise.all(
            (levantamientos || []).map(async (lev) => {
                // Fetch photos
                const { data: photos } = await supabase
                    .from('spool_levantamiento_photos')
                    .select('*')
                    .eq('levantamiento_id', lev.id)
                    .order('created_at', { ascending: true })

                // Fetch user info using Admin Client to bypass RLS and access auth
                let userInfo = {
                    id: lev.captured_by,
                    email: 'unknown',
                    full_name: null as string | null
                }

                if (lev.captured_by) {
                    // 1. Try public.users with Admin privileges
                    const { data: publicUser } = await supabaseAdmin
                        .from('users')
                        .select('correo, nombre')
                        .eq('id', lev.captured_by)
                        .single()

                    if (publicUser) {
                        userInfo.email = publicUser.correo || 'unknown'
                        userInfo.full_name = publicUser.nombre
                    }

                    // If still no full_name, try auth.users (expanded fallback)
                    if (!userInfo.full_name) {
                        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(lev.captured_by)
                        if (authUser?.user) {
                            userInfo.email = userInfo.email !== 'unknown' ? userInfo.email : (authUser.user.email || 'unknown')

                            // Try multiple metadata fields
                            const meta = authUser.user.user_metadata || {}
                            userInfo.full_name = meta.full_name || meta.name || meta.firstName || meta.first_name
                                ? `${meta.first_name || meta.firstName || ''} ${meta.last_name || meta.lastName || ''}`.trim() || meta.name || meta.full_name
                                : null

                            // Last resort: extract from email
                            if (!userInfo.full_name && userInfo.email && userInfo.email !== 'unknown') {
                                const namePart = userInfo.email.split('@')[0]
                                userInfo.full_name = namePart
                                    .split(/[._-]/)
                                    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
                                    .join(' ')
                            }
                        }
                    }
                }

                // Generate signed URLs for photos
                const photosWithUrls = await Promise.all(
                    (photos || []).map(async (photo) => {
                        const { data: urlData } = await supabase.storage
                            .from('spool-levantamientos')
                            .createSignedUrl(photo.storage_path, 3600) // 1 hour expiry

                        return {
                            ...photo,
                            storage_url: urlData?.signedUrl || null
                        }
                    })
                )

                return {
                    ...lev,
                    photos: photosWithUrls,
                    captured_by_user: userInfo
                }
            })
        )

        return NextResponse.json({ levantamientos: levantamientosWithDetails })
    } catch (error: any) {
        console.error('Error fetching levantamientos:', error)
        return NextResponse.json(
            { error: error.message || 'Error al obtener levantamientos' },
            { status: 500 }
        )
    }
}

// POST /api/spools/[spoolNumber]/levantamientos
export async function POST(
    request: NextRequest,
    paramsObj: { params: Promise<{ spoolNumber: string }> }
) {
    try {
        const params = await paramsObj.params
        const supabase = await createClient()
        let { data: { user } } = await supabase.auth.getUser()

        // Fallback: Check for Bearer token
        if (!user) {
            const authHeader = request.headers.get('authorization')
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1]
                const { data } = await supabase.auth.getUser(token)
                user = data.user
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { revisionId, projectId, storageLocation, notes, photos } = body

        if (!revisionId || !projectId) {
            return NextResponse.json(
                { error: 'revisionId y projectId son requeridos' },
                { status: 400 }
            )
        }

        if (!photos || photos.length === 0) {
            return NextResponse.json(
                { error: 'Debe incluir al menos una foto' },
                { status: 400 }
            )
        }

        const spoolNumber = decodeURIComponent(params.spoolNumber)

        // Create levantamiento record
        const { data: levantamiento, error: levError } = await supabase
            .from('spool_levantamientos')
            .insert({
                spool_number: spoolNumber,
                revision_id: revisionId,
                project_id: projectId,
                storage_location: storageLocation || null,
                notes: notes || null,
                captured_by: user.id
            })
            .select()
            .single()

        if (levError) throw levError

        // Upload photos to storage and create records
        const uploadedPhotos = []
        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i]
            const fileName = `${Date.now()}_${i}_${photo.fileName}`
            const storagePath = `${levantamiento.id}/${fileName}`

            // Convert base64 to buffer
            const base64Data = photo.fileData.replace(/^data:image\/\w+;base64,/, '')
            const buffer = Buffer.from(base64Data, 'base64')

            // Upload to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('spool-levantamientos')
                .upload(storagePath, buffer, {
                    contentType: photo.mimeType || 'image/jpeg',
                    upsert: false
                })

            if (uploadError) {
                console.error('Error uploading photo:', uploadError)
                continue
            }

            // Create photo record
            const { data: photoRecord, error: photoError } = await supabase
                .from('spool_levantamiento_photos')
                .insert({
                    levantamiento_id: levantamiento.id,
                    storage_path: storagePath,
                    file_name: photo.fileName,
                    file_size_bytes: photo.fileSize || null,
                    mime_type: photo.mimeType || 'image/jpeg',
                    description: photo.description || null
                })
                .select()
                .single()

            if (!photoRecord) {
                uploadedPhotos.push(photoRecord)
            }
        }

        return NextResponse.json({
            levantamiento: {
                ...levantamiento,
                photos: uploadedPhotos
            }
        })
    } catch (error: any) {
        console.error('Error creating levantamiento:', error)
        return NextResponse.json(
            { error: error.message || 'Error al crear levantamiento' },
            { status: 500 }
        )
    }
}

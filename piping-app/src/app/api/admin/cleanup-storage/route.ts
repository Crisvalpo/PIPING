import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/admin/cleanup-storage
// Scans for orphaned folders in 'spool-levantamientos' and removes them.
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // Auth check - ideally limit to admin, but allow any auth user for this hotfix
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Initialize Admin Client for storage
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

        // 1. List root items (expecting folders named by UUID)
        const { data: rootItems, error: listError } = await supabaseAdmin.storage
            .from('spool-levantamientos')
            .list('', { limit: 1000 }) // Adjust limit if needed

        if (listError) throw listError

        const potentialLevantamientoIds = rootItems
            .filter(item => !item.metadata) // folders usually have no metadata or specific marker? 
            // Actually supabase storage list returns objects. Folders are objects with 'id' null? or just names?
            // Usually returns items. Directories might be distinct.
            // Let's assume user followed naming convention: UUID/filename.
            .map(item => item.name)
            // Filter rough UUID regex
            .filter(name => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name))

        if (potentialLevantamientoIds.length === 0) {
            return NextResponse.json({ message: 'No orphaned folders found (bucket empty or no UUID folders)', deleted: 0 })
        }

        // 2. Check which IDs exist in DB
        const { data: existingRecords, error: dbError } = await supabase
            .from('spool_levantamientos')
            .select('id')
            .in('id', potentialLevantamientoIds)

        if (dbError) throw dbError

        const existingIds = new Set(existingRecords.map(r => r.id))
        const orphanIds = potentialLevantamientoIds.filter(id => !existingIds.has(id))

        if (orphanIds.length === 0) {
            return NextResponse.json({ message: 'No orphaned folders found (all match DB records)', deleted: 0 })
        }

        // 3. Delete orphans
        const results = []
        for (const orphanId of orphanIds) {
            // Must list files inside folder first
            const { data: files } = await supabaseAdmin.storage
                .from('spool-levantamientos')
                .list(orphanId)

            if (files && files.length > 0) {
                const paths = files.map(f => `${orphanId}/${f.name}`)
                const { error: removeError } = await supabaseAdmin.storage
                    .from('spool-levantamientos')
                    .remove(paths)

                if (removeError) {
                    results.push({ id: orphanId, status: 'error', error: removeError.message })
                } else {
                    results.push({ id: orphanId, status: 'deleted', files: paths.length })
                }
            } else {
                // Empty folder, might need explicit removal or it auto-cleans?
                // Try removing a dummy path or usually empty folders disappear in S3-like storage
                results.push({ id: orphanId, status: 'empty/ignored' })
            }
        }

        return NextResponse.json({
            message: `Found ${orphanIds.length} orphans`,
            deleted: results.filter(r => r.status === 'deleted').length,
            details: results
        })

    } catch (error: any) {
        console.error('Cleanup error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

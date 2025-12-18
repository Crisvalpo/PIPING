import { db, LocalConflict } from '@/lib/db';

/**
 * Calcula el uso de almacenamiento por tabla en IndexedDB
 */
export async function calculateStorageUsage(projectId: string): Promise<{
    tableName: string;
    recordCount: number;
    estimatedSizeKB: number;
}[]> {
    const tables = [
        { name: 'isometrics', table: db.isometrics },
        { name: 'spools', table: db.spools },
        { name: 'welds', table: db.welds },
        { name: 'levantamientos', table: db.levantamientos },
        { name: 'photos', table: db.photos },
        { name: 'personal', table: db.personal },
        { name: 'cuadrillas', table: db.cuadrillas },
        { name: 'cuadrillaMembers', table: db.cuadrillaMembers },
        { name: 'dailyReports', table: db.dailyReports },
        { name: 'pendingActions', table: db.pendingActions },
        { name: 'conflicts', table: db.conflicts }
    ];

    const results = await Promise.all(
        tables.map(async ({ name, table }) => {
            // Count records for this project
            let recordCount = 0;
            if (name === 'photos' || name === 'metadata' || name === 'cuadrillaMembers') {
                // These tables don't have project_id, count all
                recordCount = await table.count();
            } else {
                recordCount = await table.where('project_id').equals(projectId).count();
            }

            // Estimate size (rough approximation)
            // Average record size varies by table
            const avgSizes: Record<string, number> = {
                isometrics: 0.5,      // ~500 bytes
                spools: 0.3,          // ~300 bytes
                welds: 0.2,           // ~200 bytes
                levantamientos: 0.3,  // ~300 bytes
                photos: 150,          // ~150KB (compressed blobs)
                personal: 0.4,        // ~400 bytes
                cuadrillas: 0.3,      // ~300 bytes
                cuadrillaMembers: 0.2, // ~200 bytes
                dailyReports: 0.5,    // ~500 bytes
                pendingActions: 1,    // ~1KB (payload varies)
                conflicts: 2          // ~2KB (includes data copies)
            };

            const estimatedSizeKB = recordCount * (avgSizes[name] || 0.5);

            return {
                tableName: name,
                recordCount,
                estimatedSizeKB
            };
        })
    );

    return results.sort((a, b) => b.estimatedSizeKB - a.estimatedSizeKB);
}

/**
 * Estima cuántos registros faltan por sincronizar
 */
export async function estimateRemaining(projectId: string): Promise<{
    pendingActions: number;
    unsyncedLevantamientos: number;
    unsyncedPhotos: number;
    unresolvedConflicts: number;
    total: number;
}> {
    const [
        pendingActions,
        unsyncedLevantamientos,
        unsyncedPhotos,
        unresolvedConflicts
    ] = await Promise.all([
        db.pendingActions.where('project_id').equals(projectId).count(),
        db.levantamientos.where('project_id').equals(projectId).filter(l => !l.synced).count(),
        db.photos.toArray().then(photos => photos.filter(p => !p.synced).length),
        db.conflicts.where('project_id').equals(projectId).filter(c => !c.resolved).count()
    ]);

    return {
        pendingActions,
        unsyncedLevantamientos,
        unsyncedPhotos,
        unresolvedConflicts,
        total: pendingActions + unsyncedLevantamientos + unsyncedPhotos + unresolvedConflicts
    };
}

/**
 * Detecta conflictos entre datos locales y del servidor
 */
export function detectConflicts<T extends Record<string, any>>(
    local: T,
    server: T,
    ignoreFields: string[] = ['synced_at', 'local_modified_at', 'server_modified_at']
): string[] {
    const conflictFields: string[] = [];

    const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);

    for (const key of allKeys) {
        if (ignoreFields.includes(key)) continue;

        const localValue = local[key];
        const serverValue = server[key];

        // Deep comparison for objects
        if (typeof localValue === 'object' && typeof serverValue === 'object') {
            if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
                conflictFields.push(key);
            }
        } else if (localValue !== serverValue) {
            conflictFields.push(key);
        }
    }

    return conflictFields;
}

/**
 * Fusiona datos según la estrategia de resolución de conflictos
 */
export function mergeConflicts<T extends Record<string, any>>(
    local: T,
    server: T,
    strategy: 'SERVER_WINS' | 'LOCAL_WINS' | 'MANUAL',
    manualResolution?: Partial<T>
): T {
    switch (strategy) {
        case 'SERVER_WINS':
            return { ...server };

        case 'LOCAL_WINS':
            return { ...local };

        case 'MANUAL':
            if (!manualResolution) {
                throw new Error('Manual resolution data required for MANUAL strategy');
            }
            // Merge: prefer manual resolution, fallback to server, then local
            return {
                ...local,
                ...server,
                ...manualResolution
            };

        default:
            return { ...server }; // Default to server wins
    }
}

/**
 * Genera un reporte de estado de sincronización
 */
export async function generateSyncReport(projectId: string): Promise<{
    lastSync: string | null;
    storageUsage: Awaited<ReturnType<typeof calculateStorageUsage>>;
    pendingSync: Awaited<ReturnType<typeof estimateRemaining>>;
    conflicts: LocalConflict[];
    healthStatus: 'healthy' | 'warning' | 'critical';
}> {
    // Get last sync time from metadata
    const lastSyncMeta = await db.metadata.get(`last_sync_${projectId}`);
    const lastSync = lastSyncMeta?.value || null;

    // Calculate storage usage
    const storageUsage = await calculateStorageUsage(projectId);

    // Get pending sync items
    const pendingSync = await estimateRemaining(projectId);

    // Get unresolved conflicts
    const conflicts = await db.conflicts
        .where('project_id')
        .equals(projectId)
        .filter(c => !c.resolved)
        .toArray();

    // Determine health status
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (conflicts.length > 0 || pendingSync.total > 100) {
        healthStatus = 'critical';
    } else if (pendingSync.total > 20) {
        healthStatus = 'warning';
    }

    // Check staleness (>24 hours since last sync)
    if (lastSync) {
        const hoursSinceSync = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60);
        if (hoursSinceSync > 24) {
            healthStatus = healthStatus === 'healthy' ? 'warning' : healthStatus;
        }
    }

    return {
        lastSync,
        storageUsage,
        pendingSync,
        conflicts,
        healthStatus
    };
}

/**
 * Limpia datos antiguos según política de retención
 */
export async function cleanupOldData(
    projectId: string,
    retentionPolicies: {
        levantamientos?: number; // days
        dailyReports?: number;
        photos?: number;
        isometrics?: number;
    } = {
            levantamientos: 30,
            dailyReports: 30,
            photos: 30,
            isometrics: 90
        }
): Promise<{
    deletedLevantamientos: number;
    deletedDailyReports: number;
    deletedPhotos: number;
    deletedIsometrics: number;
}> {
    const results = {
        deletedLevantamientos: 0,
        deletedDailyReports: 0,
        deletedPhotos: 0,
        deletedIsometrics: 0
    };

    const now = Date.now();

    // Clean levantamientos
    if (retentionPolicies.levantamientos) {
        const cutoffDate = new Date(now - retentionPolicies.levantamientos * 24 * 60 * 60 * 1000).toISOString();
        const oldLevs = await db.levantamientos
            .where('project_id')
            .equals(projectId)
            .filter(l => l.synced && l.captured_at < cutoffDate)
            .toArray();

        for (const lev of oldLevs) {
            // Delete associated photos first
            const photos = await db.photos.where('levantamiento_id').equals(lev.id).toArray();
            await db.photos.bulkDelete(photos.map(p => p.id));
            results.deletedPhotos += photos.length;

            // Delete levantamiento
            await db.levantamientos.delete(lev.id);
            results.deletedLevantamientos++;
        }
    }

    // Clean daily reports
    if (retentionPolicies.dailyReports) {
        const cutoffDate = new Date(now - retentionPolicies.dailyReports * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const oldReports = await db.dailyReports
            .where('project_id')
            .equals(projectId)
            .filter(r => r.synced && r.date < cutoffDate)
            .toArray();

        await db.dailyReports.bulkDelete(oldReports.map(r => r.id));
        results.deletedDailyReports = oldReports.length;
    }

    // Clean isometrics (less aggressive)
    if (retentionPolicies.isometrics) {
        const cutoffDate = new Date(now - retentionPolicies.isometrics * 24 * 60 * 60 * 1000).toISOString();
        const oldIsos = await db.isometrics
            .where('project_id')
            .equals(projectId)
            .toArray()
            .then(isos => isos.filter(i => i.synced_at && i.synced_at < cutoffDate && i.status === 'OBSOLETE'));

        await db.isometrics.bulkDelete(oldIsos.map(i => i.id));
        results.deletedIsometrics = oldIsos.length;
    }

    console.log('[SyncUtils] Cleanup completed:', results);
    return results;
}

/**
 * Migra datos entre versiones de esquema (si necesario)
 */
export async function migrateLocalData(fromVersion: number, toVersion: number): Promise<void> {
    console.log(`[SyncUtils] Migrating data from v${fromVersion} to v${toVersion}`);

    // Dexie handles schema migrations automatically via version() definitions
    // This function can be used for custom data transformations if needed

    if (fromVersion === 2 && toVersion === 3) {
        // Example: Ensure all existing records have the new timestamp fields
        console.log('[SyncUtils] Migration 2->3: Schema expanded with new tables');
        // Dexie will automatically create the new tables
        // No data transformation needed
    }

    console.log('[SyncUtils] Migration completed successfully');
}

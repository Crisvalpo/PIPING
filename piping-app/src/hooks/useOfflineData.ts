'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalIsometric, LocalSpool, LocalWeld, LocalLevantamiento } from '@/lib/db';

/**
 * Hook para obtener isométricos locales de un proyecto
 */
export function useLocalIsometrics(projectId: string) {
    return useLiveQuery(
        () => db.isometrics
            .where('project_id')
            .equals(projectId)
            .toArray(),
        [projectId]
    );
}

/**
 * Hook para obtener spools locales de un proyecto
 */
export function useLocalSpools(projectId: string) {
    return useLiveQuery(
        () => db.spools
            .where('project_id')
            .equals(projectId)
            .toArray(),
        [projectId]
    );
}

/**
 * Hook para obtener un spool específico
 */
export function useLocalSpool(spoolNumber: string, revisionId: string) {
    return useLiveQuery(
        () => db.spools
            .where({ spool_number: spoolNumber, revision_id: revisionId })
            .first(),
        [spoolNumber, revisionId]
    );
}

/**
 * Hook para obtener soldaduras de un spool
 * Nota: Filtra en memoria si el índice compuesto no es suficiente, 
 * aunque Dexie soporta índices compuestos [spool_number+weld_number].
 * Aquí queremos todas las del spool.
 */
export function useLocalWelds(spoolNumber: string, revisionId: string) {
    return useLiveQuery(
        async () => {
            // Como welds tiene muchas entradas, idealmente tendríamos un índice [spool_number+revision_id]
            // Pero nuestro índice actual es [spool_number+weld_number].
            // Podemos filtrar usando 'spool_number' y luego refinar.
            const welds = await db.welds
                .where('spool_number')
                .equals(spoolNumber)
                .toArray();

            return welds.filter(w => w.revision_id === revisionId);
        },
        [spoolNumber, revisionId]
    );
}

/**
 * Hook para obtener levantamientos de un spool
 */
export function useLocalLevantamientos(spoolNumber: string, revisionId: string) {
    return useLiveQuery(
        async () => {
            const levs = await db.levantamientos
                .where('spool_number')
                .equals(spoolNumber)
                .toArray();

            return levs.filter(l => l.revision_id === revisionId)
                .sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime());
        },
        [spoolNumber, revisionId]
    );
}

/**
 * Hook para obtener personal de un proyecto
 */
export function useLocalPersonal(projectId: string, activeOnly: boolean = true) {
    return useLiveQuery(
        () => {
            let query = db.personal.where('project_id').equals(projectId);
            if (activeOnly) {
                return query.filter(p => p.activo).toArray();
            }
            return query.toArray();
        },
        [projectId, activeOnly]
    );
}

/**
 * Hook para obtener soldadores de un proyecto (personal con estampa)
 */
export function useLocalSoldadores(projectId: string) {
    return useLiveQuery(
        () => db.personal
            .where('project_id')
            .equals(projectId)
            .filter(p => p.activo && p.estampa !== null && p.estampa !== undefined)
            .toArray(),
        [projectId]
    );
}

/**
 * Hook para obtener cuadrillas de un proyecto
 */
export function useLocalCuadrillas(projectId: string, activeOnly: boolean = true) {
    return useLiveQuery(
        () => {
            let query = db.cuadrillas.where('project_id').equals(projectId);
            if (activeOnly) {
                return query.filter(c => c.activo).toArray();
            }
            return query.toArray();
        },
        [projectId, activeOnly]
    );
}

/**
 * Hook para obtener miembros de una cuadrilla
 */
export function useLocalCuadrillaMembers(cuadrillaId: string) {
    return useLiveQuery(
        async () => {
            const members = await db.cuadrillaMembers
                .where('cuadrilla_id')
                .equals(cuadrillaId)
                .filter(m => m.activo)
                .toArray();

            // Enrich with personal data
            const enriched = await Promise.all(
                members.map(async (member) => {
                    const personal = await db.personal.get(member.rut);
                    return { ...member, personal };
                })
            );

            return enriched;
        },
        [cuadrillaId]
    );
}

/**
 * Hook para obtener configuraciones de soldadura de un proyecto
 */
export function useLocalWeldConfigs(projectId: string) {
    return useLiveQuery(
        () => db.weldConfigs
            .where('project_id')
            .equals(projectId)
            .filter(wc => wc.active)
            .toArray(),
        [projectId]
    );
}

/**
 * Hook para obtener turnos de un proyecto
 */
export function useLocalProjectShifts(projectId: string) {
    return useLiveQuery(
        () => db.projectShifts
            .where('project_id')
            .equals(projectId)
            .filter(s => s.active)
            .toArray(),
        [projectId]
    );
}

/**
 * Hook para obtener locations de un proyecto
 */
export function useLocalProjectLocations(projectId: string) {
    return useLiveQuery(
        () => db.projectLocations
            .where('project_id')
            .equals(projectId)
            .filter(l => l.active)
            .toArray(),
        [projectId]
    );
}

/**
 * Hook para obtener statuses de un proyecto
 */
export function useLocalSpoolStatuses(projectId: string) {
    return useLiveQuery(
        async () => {
            const statuses = await db.spoolStatuses
                .where('project_id')
                .equals(projectId)
                .filter(s => s.active)
                .toArray();

            return statuses.sort((a, b) => a.order_index - b.order_index);
        },
        [projectId]
    );
}

/**
 * Hook para obtener reportes diarios de un proyecto en un rango de fechas
 */
export function useLocalDailyReports(projectId: string, startDate?: string, endDate?: string) {
    return useLiveQuery(
        () => {
            let query = db.dailyReports.where('project_id').equals(projectId);
            return query.toArray().then(reports => {
                let filtered = reports;
                if (startDate) {
                    filtered = filtered.filter(r => r.date >= startDate);
                }
                if (endDate) {
                    filtered = filtered.filter(r => r.date <= endDate);
                }
                return filtered.sort((a, b) => b.date.localeCompare(a.date));
            });
        },
        [projectId, startDate, endDate]
    );
}

/**
 * Hook para obtener conflictos no resueltos
 */
export function useLocalConflicts(projectId: string) {
    return useLiveQuery(
        () => db.conflicts
            .where('project_id')
            .equals(projectId)
            .filter(c => !c.resolved)
            .toArray(),
        [projectId]
    );
}

/**
 * Hook para obtener estado general de datos offline
 */
export function useOfflineStatus(projectId: string) {
    return useLiveQuery(
        async () => {
            const [
                isometricsCount,
                spoolsCount,
                weldsCount,
                levantamientosCount,
                personalCount,
                cuadrillasCount,
                pendingCount,
                conflictsCount
            ] = await Promise.all([
                db.isometrics.where('project_id').equals(projectId).count(),
                db.spools.where('project_id').equals(projectId).count(),
                db.welds.where('project_id').equals(projectId).count(),
                db.levantamientos.where('project_id').equals(projectId).count(),
                db.personal.where('project_id').equals(projectId).count(),
                db.cuadrillas.where('project_id').equals(projectId).count(),
                db.pendingActions.where('project_id').equals(projectId).count(),
                db.conflicts.where('project_id').equals(projectId).filter(c => !c.resolved).count()
            ]);

            return {
                isometricsCount,
                spoolsCount,
                weldsCount,
                levantamientosCount,
                personalCount,
                cuadrillasCount,
                pendingCount,
                conflictsCount,
                totalRecords: isometricsCount + spoolsCount + weldsCount + levantamientosCount + personalCount + cuadrillasCount
            };
        },
        [projectId]
    );
}


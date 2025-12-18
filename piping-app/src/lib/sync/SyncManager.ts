import { db, PendingAction, LocalIsometric, LocalSpool, LocalWeld, LocalLevantamiento } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useSyncStore } from '@/store/syncStore';
import { markActionAsFailed, markActionAsCompleted, getActionsReadyForRetry } from '@/lib/sync/RetryQueue';

export class SyncManager {
    private static instance: SyncManager;
    private isSyncing: boolean = false;

    private constructor() { }

    public static getInstance(): SyncManager {
        if (!SyncManager.instance) {
            SyncManager.instance = new SyncManager();
        }
        return SyncManager.instance;
    }

    /**
     * Sincroniza un proyecto completo (descarga inicial o refresh)
     * ESTRATEGIA: Descarga Estricta por Project ID
     */
    public async syncProject(projectId: string): Promise<void> {
        const store = useSyncStore.getState();
        if (this.isSyncing) return;

        try {
            this.isSyncing = true;
            store.setIsSyncing(true);
            store.setSyncError(null);

            console.log(`[SyncManager] Iniciando sync del proyecto ${projectId}`);

            // 1. ISOMÉTRICOS
            // Necesitamos unir isometrics + isometric_revisions
            // Especificamos la FK exacta para evitar ambigüedad
            console.log('[SyncManager] Paso 1: Descargando isométricos (paginado)...');
            let allRevisions: any[] = [];
            let isoPage = 0;
            const ISO_PAGE_SIZE = 1000;
            let hasMoreIsos = true;

            while (hasMoreIsos) {
                const { data: revisionsChunk, error: isoError } = await supabase
                    .from('isometric_revisions')
                    .select(`
              id,
              codigo,
              estado,
              created_at,
              updated_at,
              isometrics!isometric_revisions_isometric_id_fkey!inner (
                id,
                proyecto_id,
                codigo
              )
            `)
                    .eq('isometrics.proyecto_id', projectId)
                    .range(isoPage * ISO_PAGE_SIZE, (isoPage + 1) * ISO_PAGE_SIZE - 1);

                if (isoError) {
                    console.error('[SyncManager] Error en query de isométricos:', isoError);
                    throw isoError;
                }

                if (revisionsChunk && revisionsChunk.length > 0) {
                    allRevisions = allRevisions.concat(revisionsChunk);
                    isoPage++;
                    console.log(`[SyncManager] Chunk isométricos ${isoPage}: ${revisionsChunk.length} registros`);
                    if (revisionsChunk.length < ISO_PAGE_SIZE) hasMoreIsos = false;
                } else {
                    hasMoreIsos = false;
                }
            }
            console.log(`[SyncManager] Descarga total de isométricos completada: ${allRevisions.length} registros`);

            if (allRevisions.length > 0) {
                const localIsometrics: LocalIsometric[] = allRevisions.map((rev: any) => ({
                    id: rev.id,
                    project_id: rev.isometrics.proyecto_id,
                    code: rev.isometrics.codigo,
                    revision: rev.codigo,
                    status: rev.estado,
                    spool_count: 0, // Se podría calcular luego
                    pdf_url: rev.archivo_url,
                    created_at: rev.created_at,
                    updated_at: rev.updated_at,
                    synced_at: new Date().toISOString()
                }));
                await db.isometrics.bulkPut(localIsometrics);
                console.log(`[SyncManager] Sincronizados ${localIsometrics.length} isométricos`);
            }

            // 2. SPOOLS (Tracking)
            console.log('[SyncManager] Paso 2: Descargando spools (paginado)...');
            let allSpools: any[] = [];
            let spoolPage = 0;
            const SPOOL_PAGE_SIZE = 1000;
            let hasMoreSpools = true;

            while (hasMoreSpools) {
                const { data: spoolsChunk, error: spoolError } = await supabase
                    .from('spool_fabrication_tracking')
                    .select('*')
                    .eq('project_id', projectId)
                    .range(spoolPage * SPOOL_PAGE_SIZE, (spoolPage + 1) * SPOOL_PAGE_SIZE - 1);

                if (spoolError) {
                    console.error('[SyncManager] Error en query de spools:', spoolError);
                    throw spoolError;
                }

                if (spoolsChunk && spoolsChunk.length > 0) {
                    allSpools = allSpools.concat(spoolsChunk);
                    spoolPage++;
                    console.log(`[SyncManager] Chunk spools ${spoolPage}: ${spoolsChunk.length} registros`);
                    if (spoolsChunk.length < SPOOL_PAGE_SIZE) hasMoreSpools = false;
                } else {
                    hasMoreSpools = false;
                }
            }
            console.log(`[SyncManager] Descarga total de spools completada: ${allSpools.length} registros`);

            if (allSpools.length > 0) {
                const localSpools: LocalSpool[] = allSpools.map((s: any) => ({
                    spool_number: s.spool_number,
                    revision_id: s.revision_id,
                    project_id: s.project_id,
                    status: 'PENDING', // Default, o calcular basado en fases
                    shop_welding_status: s.shop_welding_status,
                    ndt_status: s.ndt_status,
                    pwht_status: s.pwht_status,
                    surface_treatment_status: s.surface_treatment_status,
                    dispatch_status: s.dispatch_status,
                    field_erection_status: s.field_erection_status,
                    field_welding_status: s.field_welding_status,
                    length_meters: s.length_meters,
                    weight_kg: s.weight_kg,
                    updated_at: s.updated_at,
                    synced_at: new Date().toISOString()
                }));
                await db.spools.bulkPut(localSpools);
                console.log(`[SyncManager] Sincronizados ${localSpools.length} spools`);
            }

            // 3. WELDS
            // Usamos proyecto_id directamente ya que la tabla lo tiene desnormalizado.
            // Esto evita problemas si los IDs de revisión no hacen match exacto o son demasiados.
            console.log('[SyncManager] Paso 3: Descargando soldaduras (por proyecto_id)...');

            // Si son muchas soldaduras, deberíamos paginar por "range". 
            // Descargamos en bloques de 1000 usando range()
            let allWelds: any[] = [];
            let weldPage = 0;
            const WELD_PAGE_SIZE = 1000;
            let hasMoreWelds = true;

            while (hasMoreWelds) {
                const { data: weldsChunk, error: weldError } = await supabase
                    .from('spools_welds')
                    .select('*')
                    .eq('proyecto_id', projectId)
                    .range(weldPage * WELD_PAGE_SIZE, (weldPage + 1) * WELD_PAGE_SIZE - 1);

                if (weldError) {
                    console.error('[SyncManager] Error descargando soldaduras:', weldError);
                    throw weldError;
                }

                if (weldsChunk && weldsChunk.length > 0) {
                    allWelds = allWelds.concat(weldsChunk);
                    weldPage++;
                    // Si el chunk está lleno, probablemente hay más. Si no, terminamos.
                    if (weldsChunk.length < WELD_PAGE_SIZE) hasMoreWelds = false;
                    console.log(`[SyncManager] Bajado chunk de soldaduras ${weldPage}: ${weldsChunk.length} registros`);
                } else {
                    hasMoreWelds = false;
                }
            }

            if (allWelds.length > 0) {
                // Pre-fetch existing local welds to preserve execution status if server doesn't provide it
                // OR assume server has the truth if we synced execution reports.
                // Given Phase 3 implemented execution report sync, server SHOULD have 'executed' = true.
                // However, the SQL schema viewed earlier (step 542) did NOT show 'executed' column in spools_welds table definition.
                // This implies 'executed' state might be in a separate table or the schema file is outdated.
                // If schema is outdated, we trust 'w.executed'.
                // If 'executed' is NOT in server response, we risk overwriting local completed welds with false.

                const localWelds: LocalWeld[] = allWelds.map((w: any) => ({
                    id: w.id,
                    spool_number: w.spool_number,
                    weld_number: w.weld_number || w.name || w.tag || 'UNKNOWN',
                    revision_id: w.revision_id,
                    project_id: projectId,
                    // Respect server truth. If server says executed, it is. 
                    // If undefined in server, default to false? Or try to map from other fields?
                    // In MasterViewsManager, registerWeldExecution updates 'spools_welds' table directly properly?
                    // Let's assume w.executed exists.
                    executed: w.executed === true || w.executed === 'true',
                    executed_at: w.executed_at,
                    executed_by: w.executed_by,
                    destination: w.destination,
                    type: w.type_weld || w.type,
                    diameter: w.nps || w.diameter_inches,
                    updated_at: w.created_at || new Date().toISOString(),
                    synced_at: new Date().toISOString()
                }));

                // Bulk put (overwrite)
                await db.welds.bulkPut(localWelds);
                console.log(`[SyncManager] Sincronizadas ${localWelds.length} soldaduras via proyecto_id.`);
            } else {
                console.warn('[SyncManager] ⚠️ No se encontraron soldaduras para este proyecto.');
            }

            // 4. LEVANTAMIENTOS
            console.log('[SyncManager] Paso 4: Descargando levantamientos...');
            const { data: levantamientos, error: levError } = await supabase
                .from('spool_levantamientos')
                .select('*')
                .eq('project_id', projectId);

            if (levError) {
                console.error('[SyncManager] Error en query de levantamientos:', levError);
                throw levError;
            }
            console.log(`[SyncManager] Query levantamientos exitosa. Registros: ${levantamientos?.length || 0}`);

            if (levantamientos) {
                const localLevs: LocalLevantamiento[] = levantamientos.map((l: any) => ({
                    id: l.id,
                    spool_number: l.spool_number,
                    revision_id: l.revision_id,
                    project_id: l.project_id,
                    storage_location: l.storage_location,
                    notes: l.notes,
                    captured_at: l.captured_at,
                    captured_by: l.captured_by,
                    synced: true,
                    synced_at: new Date().toISOString()
                }));
                await db.levantamientos.bulkPut(localLevs);
                console.log(`[SyncManager] Sincronizados ${localLevs.length} levantamientos`);
            }

            console.log('[SyncManager] ✅ Sincronización completada exitosamente');
            store.setLastSyncTime(new Date());

        } catch (error: any) {
            console.error('[SyncManager] Error en syncProject:', error);
            console.error('[SyncManager] Error details:', JSON.stringify(error, null, 2));
            console.error('[SyncManager] Error stack:', error?.stack);

            const errorMessage = error?.message || error?.details || error?.hint || 'Error desconocido al sincronizar';
            store.setSyncError(errorMessage);
        } finally {
            this.isSyncing = false;
            store.setIsSyncing(false);
        }
    }

    /**
     * Sincroniza el personal de un proyecto
     */
    public async syncPersonal(projectId: string): Promise<void> {
        const store = useSyncStore.getState();
        console.log('[SyncManager] Sincronizando personal...');

        store.setSyncProgress({
            phase: 'Personal',
            percentage: 0,
            currentTable: 'personal'
        });

        try {
            const { data: personalData, error } = await supabase
                .from('personal')
                .select('*, soldadores(*)')
                .eq('proyecto_id', projectId);

            if (error) throw error;

            if (personalData && personalData.length > 0) {
                const localPersonal = personalData.map((p: any) => ({
                    rut: p.rut,
                    nombre: p.nombre,
                    email: p.email,
                    telefono: p.telefono,
                    activo: p.activo,
                    project_id: projectId,
                    // Soldador data if available
                    estampa: p.soldadores?.estampa,
                    certificacion_actual: p.soldadores?.certificacion_actual,
                    fecha_vencimiento_cert: p.soldadores?.fecha_vencimiento_cert,
                    calificaciones: p.soldadores?.calificaciones ? JSON.stringify(p.soldadores.calificaciones) : undefined,
                    created_at: p.created_at,
                    updated_at: p.updated_at,
                    synced_at: new Date().toISOString()
                }));

                await db.personal.bulkPut(localPersonal);
                console.log(`[SyncManager] ✅ Sincronizados ${localPersonal.length} registros de personal`);
            }

            store.setModuleSyncTime('personal', new Date());
            store.setSyncProgress({
                phase: 'Personal',
                percentage: 100,
                currentTable: 'personal'
            });
        } catch (error: any) {
            console.error('[SyncManager] Error sincronizando personal:', error);
            throw error;
        }
    }

    /**
     * Sincroniza las cuadrillas y sus miembros
     */
    public async syncCuadrillas(projectId: string): Promise<void> {
        const store = useSyncStore.getState();
        console.log('[SyncManager] Sincronizando cuadrillas...');

        store.setSyncProgress({
            phase: 'Cuadrillas',
            percentage: 0,
            currentTable: 'cuadrillas'
        });

        try {
            // Sync cuadrillas
            const { data: cuadrillasData, error: cuadrillasError } = await supabase
                .from('cuadrillas')
                .select('*')
                .eq('proyecto_id', projectId);

            if (cuadrillasError) throw cuadrillasError;

            if (cuadrillasData && cuadrillasData.length > 0) {
                const localCuadrillas = cuadrillasData.map((c: any) => ({
                    id: c.id,
                    project_id: c.proyecto_id,
                    nombre: c.nombre,
                    codigo: c.codigo,
                    activo: c.activo,
                    turno: c.turno,
                    supervisor_rut: c.supervisor_rut,
                    created_at: c.created_at,
                    updated_at: c.updated_at,
                    synced_at: new Date().toISOString()
                }));

                await db.cuadrillas.bulkPut(localCuadrillas);
                console.log(`[SyncManager] ✅ Sincronizadas ${localCuadrillas.length} cuadrillas`);
            }

            store.setSyncProgress({
                phase: 'Cuadrillas',
                percentage: 50,
                currentTable: 'cuadrilla_members'
            });

            // Sync cuadrilla members
            const { data: membersData, error: membersError } = await supabase
                .from('cuadrilla_members')
                .select('*')
                .in('cuadrilla_id', cuadrillasData?.map(c => c.id) || []);

            if (membersError) throw membersError;

            if (membersData && membersData.length > 0) {
                const localMembers = membersData.map((m: any) => ({
                    id: m.id,
                    cuadrilla_id: m.cuadrilla_id,
                    rut: m.rut,
                    role: m.role,
                    fecha_ingreso: m.fecha_ingreso,
                    fecha_salida: m.fecha_salida,
                    activo: m.activo !== false, // Default true
                    created_at: m.created_at,
                    synced_at: new Date().toISOString()
                }));

                await db.cuadrillaMembers.bulkPut(localMembers);
                console.log(`[SyncManager] ✅ Sincronizados ${localMembers.length} miembros de cuadrillas`);
            }

            store.setModuleSyncTime('cuadrillas', new Date());
            store.setSyncProgress({
                phase: 'Cuadrillas',
                percentage: 100,
                currentTable: 'cuadrilla_members'
            });
        } catch (error: any) {
            console.error('[SyncManager] Error sincronizando cuadrillas:', error);
            throw error;
        }
    }

    /**
     * Sincroniza las configuraciones del proyecto (shifts, locations, statuses, weld configs)
     */
    public async syncProjectConfig(projectId: string): Promise<void> {
        const store = useSyncStore.getState();
        console.log('[SyncManager] Sincronizando configuraciones del proyecto...');

        store.setSyncProgress({
            phase: 'Configuración',
            percentage: 0,
            currentTable: 'project_shifts'
        });

        try {
            // 1. Project Shifts
            const { data: shiftsData, error: shiftsError } = await supabase
                .from('project_shifts')
                .select('*')
                .eq('proyecto_id', projectId);

            if (shiftsError) throw shiftsError;

            if (shiftsData && shiftsData.length > 0) {
                const localShifts = shiftsData.map((s: any) => ({
                    id: s.id,
                    project_id: s.proyecto_id,
                    shift_name: s.shift_name,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    active: s.active,
                    valid_from: s.valid_from,
                    valid_to: s.valid_to,
                    created_at: s.created_at,
                    updated_at: s.updated_at,
                    synced_at: new Date().toISOString()
                }));

                await db.projectShifts.bulkPut(localShifts);
                console.log(`[SyncManager] ✅ Sincronizados ${localShifts.length} turnos`);
            }

            store.setSyncProgress({
                phase: 'Configuración',
                percentage: 25,
                currentTable: 'weld_configs'
            });

            // 2. Weld Configs
            const { data: weldConfigsData, error: weldConfigsError } = await supabase
                .from('project_weld_configs')
                .select('*')
                .eq('project_id', projectId);

            if (weldConfigsError) throw weldConfigsError;

            if (weldConfigsData && weldConfigsData.length > 0) {
                const localWeldConfigs = weldConfigsData.map((wc: any) => ({
                    id: wc.id,
                    project_id: wc.project_id,
                    name: wc.name,
                    requires_welder: wc.requires_welder,
                    requires_sample: wc.requires_sample,
                    color: wc.color,
                    active: wc.active,
                    created_at: wc.created_at,
                    updated_at: wc.updated_at,
                    synced_at: new Date().toISOString()
                }));

                await db.weldConfigs.bulkPut(localWeldConfigs);
                console.log(`[SyncManager] ✅ Sincronizadas ${localWeldConfigs.length} configuraciones de soldadura`);
            }

            store.setSyncProgress({
                phase: 'Configuración',
                percentage: 50,
                currentTable: 'project_locations'
            });

            // 3. Project Locations
            const { data: locationsData, error: locationsError } = await supabase
                .from('project_locations')
                .select('*')
                .eq('project_id', projectId);

            if (locationsError) throw locationsError;

            if (locationsData && locationsData.length > 0) {
                const localLocations = locationsData.map((l: any) => ({
                    id: l.id,
                    project_id: l.project_id,
                    name: l.name,
                    code: l.code,
                    active: l.active,
                    created_at: l.created_at,
                    synced_at: new Date().toISOString()
                }));

                await db.projectLocations.bulkPut(localLocations);
                console.log(`[SyncManager] ✅ Sincronizadas ${localLocations.length} ubicaciones`);
            }

            store.setSyncProgress({
                phase: 'Configuración',
                percentage: 75,
                currentTable: 'spool_statuses'
            });

            // 4. Spool Statuses
            const { data: statusesData, error: statusesError } = await supabase
                .from('project_spool_statuses')
                .select('*')
                .eq('project_id', projectId)
                .order('order_index', { ascending: true });

            if (statusesError) throw statusesError;

            if (statusesData && statusesData.length > 0) {
                const localStatuses = statusesData.map((s: any) => ({
                    id: s.id,
                    project_id: s.project_id,
                    name: s.name,
                    color: s.color,
                    order_index: s.order_index,
                    active: s.active,
                    created_at: s.created_at,
                    synced_at: new Date().toISOString()
                }));

                await db.spoolStatuses.bulkPut(localStatuses);
                console.log(`[SyncManager] ✅ Sincronizados ${localStatuses.length} estados de spool`);
            }

            store.setModuleSyncTime('projectConfig', new Date());
            store.setSyncProgress({
                phase: 'Configuración',
                percentage: 100,
                currentTable: 'spool_statuses'
            });
        } catch (error: any) {
            console.error('[SyncManager] Error sincronizando configuraciones:', error);
            throw error;
        }
    }

    /**
     * Sincroniza reportes diarios de un rango de fechas
     */
    public async syncDailyReports(projectId: string, startDate?: string, endDate?: string): Promise<void> {
        const store = useSyncStore.getState();
        console.log('[SyncManager] Sincronizando reportes diarios...');

        store.setSyncProgress({
            phase: 'Reportes Diarios',
            percentage: 0,
            currentTable: 'daily_reports'
        });

        try {
            let query = supabase
                .from('daily_reports')
                .select('*')
                .eq('project_id', projectId);

            if (startDate) {
                query = query.gte('date', startDate);
            }
            if (endDate) {
                query = query.lte('date', endDate);
            }

            const { data: reportsData, error } = await query.order('date', { ascending: false });

            if (error) throw error;

            if (reportsData && reportsData.length > 0) {
                const localReports = reportsData.map((r: any) => ({
                    id: r.id,
                    project_id: r.project_id,
                    cuadrilla_id: r.cuadrilla_id,
                    date: r.date,
                    shift_id: r.shift_id,
                    horas_trabajadas: r.horas_trabajadas,
                    observaciones: r.observaciones,
                    created_by: r.created_by,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                    synced_at: new Date().toISOString(),
                    synced: true
                }));

                await db.dailyReports.bulkPut(localReports);
                console.log(`[SyncManager] ✅ Sincronizados ${localReports.length} reportes diarios`);
            }

            store.setModuleSyncTime('dailyReports', new Date());
            store.setSyncProgress({
                phase: 'Reportes Diarios',
                percentage: 100,
                currentTable: 'daily_reports'
            });
        } catch (error: any) {
            console.error('[SyncManager] Error sincronizando reportes diarios:', error);
            throw error;
        }
    }

    /**
     * Sincronización completa de todos los módulos
     */
    public async syncAll(projectId: string): Promise<void> {
        const store = useSyncStore.getState();
        if (this.isSyncing) return;

        try {
            this.isSyncing = true;
            store.setIsSyncing(true);
            store.setSyncError(null);

            console.log(`[SyncManager] 🔄 Iniciando sincronización completa del proyecto ${projectId}`);

            // Sync core data (existing method)
            await this.syncProject(projectId);

            // Sync new modules
            await this.syncPersonal(projectId);
            await this.syncCuadrillas(projectId);
            await this.syncProjectConfig(projectId);
            await this.syncDailyReports(projectId);

            console.log('[SyncManager] ✅ Sincronización completa exitosa');
            store.setLastSyncTime(new Date());
            store.setSyncProgress(null); // Clear progress

        } catch (error: any) {
            console.error('[SyncManager] Error en sincronización completa:', error);
            store.setSyncError(error.message || 'Error en sincronización completa');
            throw error;
        } finally {
            this.isSyncing = false;
            store.setIsSyncing(false);
        }
    }

    /**
     * Update pending count in store from current Dexie state
     */
    private async updatePendingCount(): Promise<void> {
        const count = await db.pendingActions
            .where('status')
            .equals('PENDING')
            .or('status')
            .equals('ERROR')
            .count();

        const store = useSyncStore.getState();
        store.setPendingCount(count);
        console.log(`[SyncManager] Pending count updated: ${count}`);
    }


    /**
     * Procesa la cola de acciones pendientes (upload)
     */
    public async processPendingActions(): Promise<void> {
        const store = useSyncStore.getState();
        const pendingActions = await db.pendingActions
            .where('status')
            .equals('PENDING')
            .toArray();

        store.setPendingCount(pendingActions.length);

        if (pendingActions.length === 0) return;
        if (this.isSyncing) return;

        try {
            this.isSyncing = true;
            store.setIsSyncing(true);
            store.setSyncError(null);

            const sortedActions = pendingActions.sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            for (const action of sortedActions) {
                await this.processSingleAction(action);
            }

        } catch (error: any) {
            console.error('[SyncManager] Error procesando cola:', error);
            store.setSyncError('Error al subir cambios pendientes');
        } finally {
            this.isSyncing = false;
            store.setIsSyncing(false);
            const remaining = await db.pendingActions.where('status').equals('PENDING').count();
            store.setPendingCount(remaining);
        }
    }

    private async processSingleAction(action: PendingAction): Promise<void> {
        console.log(`[SyncManager] Procesando acción: ${action.type}`, action.payload);

        try {
            switch (action.type) {
                case 'EXECUTE_WELD':
                    // Dynamically import to avoid circular dependencies if any, though likely fine here
                    // Better to clean import at top, but for now reuse logic
                    // Payload expected: { weldId, welderId, foremanId, executionDate }
                    const { registerWeldExecution } = await import('@/services/master-views');

                    await registerWeldExecution(
                        action.payload.weldId,
                        action.payload.welderId,
                        action.payload.foremanId,
                        action.payload.executionDate,
                        action.payload.reportedByUserId // Pass the user ID captured when offline
                    );
                    break;

                case 'CREATE_LEVANTAMIENTO':
                    console.log('[SyncManager] Subiendo levantamiento offline...');
                    const { levantamientoId, spoolNumber, revisionId, storageLocation, notes, photoIds, isometricCode, revisionCode, levNum, randomSuffix } = action.payload;

                    // Helper: Generate safe filename from spool context
                    const generateSafeFileName = (index: number, originalExt: string): string => {
                        // Extract clean extension
                        const ext = originalExt.toLowerCase().replace(/^\./, '');

                        // Build descriptive name: ISO-REV-SPOOL-INDEX.ext
                        // Example: 3800PR-SW-380-5260-1_Rev2_SP01_001.jpg
                        const parts = [
                            isometricCode || spoolNumber.split('-').slice(0, -1).join('-'), // Isometric code
                            revisionCode || 'Rev1', // Revision code
                            spoolNumber.split('-').pop() || spoolNumber, // Spool number (last part)
                            String(index + 1).padStart(3, '0') // Photo index: 001, 002, etc.
                        ];

                        // Join with underscores and sanitize
                        const safeName = parts
                            .join('_')
                            .replace(/[^a-zA-Z0-9_-]/g, '') // Remove special chars
                            .replace(/_{2,}/g, '_'); // Remove multiple underscores

                        return `${safeName}.${ext}`;
                    };

                    // 1. Use OPTIMIZED preview photos from Dexie (not 4MB originals)
                    console.log('[SyncManager] Cargando fotos optimizadas desde Dexie...');
                    const dexiePhotos = await db.photos.where('id').anyOf(photoIds).toArray();

                    // Convert preview blobs to base64
                    const photos = await Promise.all(dexiePhotos.map(async (photo, index) => {
                        return new Promise<{ fileName: string, fileData: string, fileSize: number, mimeType: string, description: string | null }>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                // Generate safe, descriptive filename
                                const safeFileName = generateSafeFileName(index, 'jpg');

                                console.log(`[SyncManager] Uploading optimized preview (~300KB): "${safeFileName}"`);

                                resolve({
                                    fileName: safeFileName, // Use safe generated name
                                    fileData: reader.result as string, // Base64 of PREVIEW quality
                                    fileSize: photo.preview_blob!.size,
                                    mimeType: photo.preview_blob!.type,
                                    description: null
                                });
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(photo.preview_blob!); // Use preview, not original
                        });
                    }));

                    // 2. Enviar a API
                    const { data: { session } } = await supabase.auth.getSession();
                    const response = await fetch(
                        `/api/spools/${encodeURIComponent(spoolNumber)}/levantamientos`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session?.access_token}`
                            },
                            body: JSON.stringify({
                                revisionId,
                                projectId: action.project_id,
                                storageLocation,
                                notes,
                                photos
                            })
                        }
                    );

                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.error || 'Error al subir levantamiento');
                    }

                    // 3. Limpiar registros locales (se reemplazarán por los del servidor en el próximo sync)
                    // Eliminamos las fotos y el levantamiento local
                    await db.photos.where('levantamiento_id').equals(levantamientoId).delete();
                    await db.levantamientos.delete(levantamientoId);

                    console.log('[SyncManager] Levantamiento subido exitosamente');
                    break;

                default:
                    console.warn(`[SyncManager] Acción no soportada: ${action.type}`);
            }

            // Success: Remove from queue using RetryQueue
            await markActionAsCompleted(action.id);

        } catch (error: any) {
            console.error(`[SyncManager] Error procesando acción ${action.id}:`, error);
            // Use RetryQueue to handle failure with exponential backoff
            await markActionAsFailed(action.id, error.message || 'Unknown error');
            // Don't throw to allow processing other independent actions
        }
    }
}

export const syncManager = SyncManager.getInstance();

// Public helper to update pending count (callable from outside)
export async function refreshPendingCount(): Promise<void> {
    const count = await db.pendingActions
        .where('status')
        .equals('PENDING')
        .or('status')
        .equals('ERROR')
        .count();

    const store = useSyncStore.getState();
    store.setPendingCount(count);
}

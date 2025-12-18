'use client'

import { useState, useEffect, useRef } from 'react'
import { searchIsometrics } from '@/services/engineering'
import { uploadPDFToRevision, deleteRevisionFile } from '@/services/revision-announcement'
import {
    getIsometricDetails,
    updateWeldExecution,
    updateJointExecution,
    getWeldExecutions,
    markWeldForRework,
    registerWeldExecution,
    deleteWeld,
    restoreWeld,
    undoWeldExecution,
    createFieldWeld,
    checkWeldNumberExists,
    reorderWelds,
    type ReworkResponsibility,
    type WeldExecution
} from '@/services/master-views'
import type { IsometricDetails } from '@/services/master-views'
import { supabase } from '@/lib/supabase'
import { hasPermission } from '@/config/roles'
import { useRolesStore } from '@/store/roles-store'
import SpoolPhaseModal from '@/components/spools/SpoolPhaseModal'
import SpoolInfoModal from '@/components/spools/SpoolInfoModal'
import LevantamientoModal from '@/components/spools/LevantamientoModal'
import ExecutionReportModal from '@/components/welding/ExecutionReportModal'
import AddWeldModal from '@/components/welding/AddWeldModal'
import WeldDetailModal from '@/components/welding/WeldDetailModal'
import DeleteWeldModal from '@/components/welding/DeleteWeldModal'

// Offline imports
import { db } from '@/lib/db'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { syncManager } from '@/lib/sync/SyncManager'
import { useSyncStore } from '@/store/syncStore'
import { Wifi, WifiOff, RefreshCw, Smartphone } from 'lucide-react'

interface MasterViewsManagerProps {
    projectId: string
}



interface WeldsBySpool {
    spool_number: string
    welds: any[]
    shop_welds_total: number
    shop_welds_executed: number
    field_welds_total: number
    field_welds_executed: number
    is_fabricated: boolean
    fabrication_status: 'COMPLETO' | 'FABRICADO' | 'EN PROCESO' | 'PENDIENTE' | 'N/A'
}

// Modal de Reporte de Ejecución - Con selección en cascada Capataz -> Soldadores




// ... imports
import ReworkModal from '@/components/welding/ReworkModal'



// ... imports
import UndoExecutionModal from '@/components/welding/UndoExecutionModal'



// Función para agrupar soldaduras por spool y calcular estado de fabricación
function groupWeldsBySpool(welds: any[] = []): WeldsBySpool[] {
    const spoolMap = new Map<string, WeldsBySpool>()

    if (!welds) return [];

    welds.forEach(weld => {
        const spoolNumber = weld.spool_number
        if (!spoolMap.has(spoolNumber)) {
            spoolMap.set(spoolNumber, {
                spool_number: spoolNumber,
                welds: [],
                shop_welds_total: 0,
                shop_welds_executed: 0,
                field_welds_total: 0,
                field_welds_executed: 0,
                is_fabricated: false,
                fabrication_status: 'PENDIENTE'
            })
        }

        const spool = spoolMap.get(spoolNumber)!
        spool.welds.push(weld)

        // Skip deleted welds from counts
        if (weld.deleted) return

        // Contar soldaduras de taller (S = Shop)
        if (weld.destination === 'S') {
            spool.shop_welds_total++
            if (weld.executed) {
                spool.shop_welds_executed++
            }
        }

        // Contar soldaduras de campo (F = Field)
        if (weld.destination === 'F') {
            spool.field_welds_total++
            if (weld.executed) {
                spool.field_welds_executed++
            }
        }
    })

    // Calcular estado de fabricación para cada spool
    // En la vista de UNIONES, el estado debe reflejar TODAS las uniones (taller + campo)
    spoolMap.forEach(spool => {
        const totalWelds = spool.shop_welds_total + spool.field_welds_total
        const totalExecuted = spool.shop_welds_executed + spool.field_welds_executed

        if (totalWelds === 0) {
            spool.fabrication_status = 'N/A'
            spool.is_fabricated = false
        } else if (totalWelds === totalExecuted) {
            // TODAS las uniones (taller + campo) ejecutadas
            spool.fabrication_status = 'COMPLETO'
            spool.is_fabricated = true
        } else if (totalExecuted > 0) {
            // Algunas uniones ejecutadas pero no todas
            spool.fabrication_status = 'EN PROCESO'
            spool.is_fabricated = false
        } else {
            // Ninguna unión ejecutada
            spool.fabrication_status = 'PENDIENTE'
            spool.is_fabricated = false
        }
    })

    return Array.from(spoolMap.values()).sort((a, b) => a.spool_number.localeCompare(b.spool_number))
}

// Function to group spools for the Spools tab (fabrication-focused)
function groupSpoolsForFabrication(welds: any[] = [], fabricationTracking: any[] = [], levantamientos: any[] = []) {
    const spoolMap = new Map<string, any>()

    // Safety check just in case
    if (!welds) welds = [];
    if (!fabricationTracking) fabricationTracking = [];
    if (!levantamientos) levantamientos = [];

    welds.forEach(weld => {
        const spoolNumber = weld.spool_number
        if (!spoolMap.has(spoolNumber)) {
            spoolMap.set(spoolNumber, {
                spool_number: spoolNumber,
                shop_welds_total: 0,
                shop_welds_executed: 0,
                field_welds_total: 0,
                field_welds_executed: 0,
                welds_count: 0,
                welds_executed: 0
            })
        }

        const spool = spoolMap.get(spoolNumber)!

        // Skip deleted welds from counts
        if (weld.deleted) return

        // Count all welds for total progress
        spool.welds_count++
        if (weld.executed) {
            spool.welds_executed++
        }

        // Count shop/field separately
        if (weld.destination === 'S') {
            spool.shop_welds_total++
            if (weld.executed) {
                spool.shop_welds_executed++
            }
        }

        if (weld.destination === 'F') {
            spool.field_welds_total++
            if (weld.executed) {
                spool.field_welds_executed++
            }
        }
    })

    const spools = Array.from(spoolMap.values()).map(spool => {
        let status = 'PENDING'
        if (spool.shop_welds_total === 0) {
            status = 'N/A' // No shop welds
        } else if (spool.shop_welds_executed === spool.shop_welds_total) {
            status = 'COMPLETED'
        } else if (spool.shop_welds_executed > 0) {
            // Some shop welds executed
            status = 'PARTIAL'
        }

        // Merge with real tracking data if available
        const tracking = fabricationTracking.find(t => t.spool_number === spool.spool_number)

        // Merge with latest levantamiento data
        // levantamientos is sorted by captured_at desc in backend, so find() gets the latest
        const latestLev = levantamientos ? levantamientos.find(l => l.spool_number === spool.spool_number) : null

        return {
            ...spool,
            status,
            // Use tracking data or defaults
            length_meters: tracking?.length_meters,
            weight_kg: tracking?.weight_kg,

            // Phase statuses
            // Phase statuses - Welding is derived from actual welds, others are tracked
            shop_welding_status: status === 'N/A' ? 'N/A' :
                (status === 'COMPLETED' ? 'COMPLETED' :
                    (status === 'PARTIAL' ? 'IN_PROGRESS' : 'PENDING')),
            ndt_status: tracking?.ndt_status || 'PENDING',
            pwht_status: tracking?.pwht_status || 'N/A',
            surface_treatment_status: tracking?.surface_treatment_status || 'PENDING',
            dispatch_status: tracking?.dispatch_status || 'PENDING',
            field_erection_status: tracking?.field_erection_status || 'PENDING',
            field_welding_status: tracking?.field_welding_status || 'PENDING',

            // Levantamiento Info
            levantamiento_photo_url: latestLev?.latest_photo_url,
            levantamiento_location: latestLev?.storage_location,
            levantamiento_date: latestLev ? new Date(latestLev.captured_at).toLocaleDateString('es-CL') : null,
            levantamiento_user: latestLev?.captured_by_user || 'Desconocido',
            levantamiento_notes: latestLev?.notes,
            levantamiento_photos_count: latestLev?.photos_count || 0,
            photos: latestLev?.photos || [],
            levantamiento_raw: latestLev,

            // User info for tooltips/display if needed
            tracking_data: tracking
        }
    })

    return spools.sort((a, b) => a.spool_number.localeCompare(b.spool_number))
}

// NON_WELDED_TYPES constant removed in favor of dynamic config

export default function MasterViewsManager({ projectId }: MasterViewsManagerProps) {
    const [isometrics, setIsometrics] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedIso, setSelectedIso] = useState<any | null>(null)
    const [details, setDetails] = useState<IsometricDetails | null>(null)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [activeTab, setActiveTab] = useState<'MATERIALS' | 'UNIONS' | 'SPOOLS' | 'TORQUES'>('UNIONS')

    // Dynamic Weld Configuration
    const [weldConfigs, setWeldConfigs] = useState<any[]>([])
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loadingConfigs, setLoadingConfigs] = useState(false)

    // Offline State
    const isOnline = useNetworkStatus()
    const { isSyncing, lastSyncTime } = useSyncStore()

    // Sync Effect: Auto-upload pending actions when online
    useEffect(() => {
        if (isOnline && projectId) {
            console.log('[MasterViews] Online detectado: Procesando cola de cambios pendientes...');
            syncManager.processPendingActions().catch(console.error);
        }
    }, [isOnline, projectId])

    // User role state for permission checks
    const [userRole, setUserRole] = useState<string | null>(null)

    // Fetch roles from database on mount for dynamic permissions
    const fetchRolesFromStore = useRolesStore(state => state.fetchRoles)

    // Consolidated initialization: Fetch user role and roles store in parallel
    useEffect(() => {
        async function initialize() {
            // Load user role and roles store in parallel for better performance
            const [userRoleResult] = await Promise.all([
                (async () => {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return null

                    const { data } = await supabase
                        .from('users')
                        .select('rol')
                        .eq('id', user.id)
                        .single()

                    return data?.rol?.toUpperCase() || null
                })(),
                fetchRolesFromStore()
            ])

            if (userRoleResult) {
                setUserRole(userRoleResult)
            }
        }

        initialize()
    }, [fetchRolesFromStore])


    // Load configs on mount
    useEffect(() => {
        const loadWeldConfigs = async () => {
            if (!projectId) return
            setLoadingConfigs(true)
            try {
                const res = await fetch(`/api/proyectos/${projectId}/weld-configs`)
                const data = await res.json()
                if (data.success && data.data) {
                    setWeldConfigs(data.data)
                }
            } catch (error) {
                console.error('Error loading weld configs:', error)
            } finally {
                setLoadingConfigs(false)
            }
        }
        loadWeldConfigs()
    }, [projectId])

    // Helper to check if type requires welder
    // Types in the exclusion list (project_weld_configs) DO NOT require welder
    const requiresWelder = (type: string) => {
        if (!type) return true
        const isExcluded = weldConfigs.some(c => c.weld_type_code === type.toUpperCase())
        return !isExcluded  // If in exclusion list, doesn't require welder
    }
    const [showRevisionHistory, setShowRevisionHistory] = useState(false)
    const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null)
    const [revisionFiles, setRevisionFiles] = useState<any[]>([])
    const [showPdfViewer, setShowPdfViewer] = useState(false)
    const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null)


    // Drag & drop ordering states
    const [isDragDropEnabled, setIsDragDropEnabled] = useState(false)
    const [draggedWeldId, setDraggedWeldId] = useState<string | null>(null)

    // Estados para modales
    const [selectedWeld, setSelectedWeld] = useState<any | null>(null)
    const [showExecutionModal, setShowExecutionModal] = useState(false)
    const [weldForExecution, setWeldForExecution] = useState<any | null>(null)

    // Rework modal state
    const [showReworkModal, setShowReworkModal] = useState(false)
    const [weldForRework, setWeldForRework] = useState<any | null>(null)

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [weldForDelete, setWeldForDelete] = useState<any | null>(null)

    // Undo execution modal state
    const [showUndoModal, setShowUndoModal] = useState(false)
    const [weldForUndo, setWeldForUndo] = useState<any | null>(null)

    // Add weld modal state
    const [showAddWeldModal, setShowAddWeldModal] = useState(false)
    const [addWeldAdjacentWelds, setAddWeldAdjacentWelds] = useState<{ prev?: any; next?: any }>({})
    const [addWeldContext, setAddWeldContext] = useState<{ revisionId: string; projectId: string; isoNumber: string; rev: string } | null>(null)

    // Levantamiento modal state
    const [levantamientoModal, setLevantamientoModal] = useState<{
        isOpen: boolean
        spoolNumber: string
        revisionId: string
        projectId: string
    } | null>(null)

    // Photo viewer modal state
    const [photoViewer, setPhotoViewer] = useState<{
        isOpen: boolean
        spool: any
        currentPhotoIndex?: number
    } | null>(null)

    // Derived state for dependency array
    const isPhotoViewerOpen = !!photoViewer

    // Handle browser back button for Photo Viewer
    useEffect(() => {
        if (isPhotoViewerOpen) {
            // Push state to history stack so "Back" button works
            window.history.pushState({ modal: 'photoViewer' }, '', window.location.href)

            const handlePopState = () => {
                setPhotoViewer(null)
            }

            window.addEventListener('popstate', handlePopState)

            return () => {
                window.removeEventListener('popstate', handlePopState)
            }
        }
    }, [isPhotoViewerOpen])

    // Estado para spools agrupados
    const [weldsBySpool, setWeldsBySpool] = useState<WeldsBySpool[]>([])
    const [fabricationSpools, setFabricationSpools] = useState<any[]>([])
    const [expandedSpools, setExpandedSpools] = useState<Set<string>>(new Set())
    const [expandedSpoolsInSpoolsView, setExpandedSpoolsInSpoolsView] = useState<Set<string>>(new Set())
    const [draggedSpoolNumber, setDraggedSpoolNumber] = useState<string | null>(null)

    // Spool modal states
    const [showSpoolPhaseModal, setShowSpoolPhaseModal] = useState(false)
    const [showSpoolInfoModal, setShowSpoolInfoModal] = useState(false)
    const [selectedSpoolForModal, setSelectedSpoolForModal] = useState<{
        spoolNumber: string
        revisionId: string
        phase?: 'ndt' | 'pwht' | 'surface_treatment' | 'dispatch' | 'field_erection'
        phaseName?: string
        currentStatus?: string
        lengthMeters?: number
        weightKg?: number
    } | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploadingContext, setUploadingContext] = useState<{ revisionId: string; isoCode: string; revCode: string } | null>(null)

    useEffect(() => {
        loadIsometrics()
    }, [projectId, searchTerm])

    // Agrupar soldaduras cuando cambian los detalles
    useEffect(() => {
        if (details) {
            const grouped = groupWeldsBySpool(details.welds)
            setWeldsBySpool(grouped)

            // Also calculate fabrication-focused data for Spools tab
            const fabrication = groupSpoolsForFabrication(details.welds, details.fabricationTracking, details.levantamientos)
            setFabricationSpools(fabrication)
        }
    }, [details])

    async function loadIsometrics() {
        setLoading(true)
        try {
            if (isOnline) {
                const result = await searchIsometrics(projectId, searchTerm, 0, 10, { status: 'ALL' })
                setIsometrics(result.data)
            } else {
                // Offline fallback - Read from Dexie
                console.log('Modo Offline: Leyendo isométricos locales...')

                // Usamos toArray() y filtramos en JS porque Dexie where() con strings es case-sensitive y exacto por defecto
                // A menos que usemos startsWithIgnoreCase, pero para búsqueda parcial 'includes' es mejor hacerlo en memoria
                const allProjectIsos = await db.isometrics
                    .where('project_id')
                    .equals(projectId)
                    .toArray();

                console.log(`[Offline] Encontrados ${allProjectIsos.length} isométricos locales para el proyecto ${projectId}`);

                if (searchTerm && searchTerm.trim() !== '') {
                    const term = searchTerm.toLowerCase().trim();
                    const filtered = allProjectIsos.filter(iso =>
                        iso.code.toLowerCase().includes(term) ||
                        (iso.revision && iso.revision.toLowerCase().includes(term))
                    );

                    // Helper function to group by code and select active revision
                    const groupIsometrics = (items: any[]) => {
                        const groupedMap = new Map<string, any[]>();

                        // 1. Group raw items by code
                        items.forEach(item => {
                            const key = item.code;
                            if (!groupedMap.has(key)) {
                                groupedMap.set(key, []);
                            }
                            groupedMap.get(key)?.push(item);
                        });

                        // 2. Build Isometric objects with logic
                        return Array.from(groupedMap.entries()).map(([code, groupItems]) => {
                            // Sort revisions: VIGENTE first, then by revision number desc
                            // Assuming revision is a string number like "0", "1", "2"
                            groupItems.sort((a, b) => {
                                if (a.status === 'VIGENTE') return -1;
                                if (b.status === 'VIGENTE') return 1;
                                // Parse ints for correct sort: "10" > "2"
                                const revA = parseInt(a.revision) || 0;
                                const revB = parseInt(b.revision) || 0;
                                return revB - revA;
                            });

                            const activeItem = groupItems[0]; // The winner after sort

                            // Map revisions structure
                            const revisions = groupItems.map(item => ({
                                id: item.id,
                                codigo: item.revision || '0',
                                estado: item.status || (item.id === activeItem.id ? 'VIGENTE' : 'OBSOLETA'),
                                fecha_emision: item.created_at
                            }));

                            // Return flattened Isometric interface
                            return {
                                id: activeItem.id, // ID of the active revision becomes the main card ID
                                codigo: code,
                                area: 'Offline',
                                spool_count: activeItem.spool_count,
                                revisions: revisions
                            };
                        });
                    };

                    const mappedIsos = groupIsometrics(filtered);

                    console.log(`[Offline] Filtrados y agrupados ${mappedIsos.length} isométricos únicos`);
                    setIsometrics(mappedIsos);
                } else {
                    // Si no hay término, mostramos los primeros 50 (pero agrupados podría ser menos)
                    const paged = allProjectIsos.slice(0, 100); // Increase slice to allow grouping

                    const groupIsometrics = (items: any[]) => {
                        const groupedMap = new Map<string, any[]>();
                        items.forEach(item => {
                            const key = item.code;
                            if (!groupedMap.has(key)) groupedMap.set(key, []);
                            groupedMap.get(key)?.push(item);
                        });

                        return Array.from(groupedMap.entries()).map(([code, groupItems]) => {
                            groupItems.sort((a, b) => {
                                if (a.status === 'VIGENTE') return -1;
                                if (b.status === 'VIGENTE') return 1;
                                const revA = parseInt(a.revision) || 0;
                                const revB = parseInt(b.revision) || 0;
                                return revB - revA;
                            });
                            const activeItem = groupItems[0];
                            const revisions = groupItems.map(item => ({
                                id: item.id,
                                codigo: item.revision || '0',
                                estado: item.status || (item.id === activeItem.id ? 'VIGENTE' : 'OBSOLETA'),
                                fecha_emision: item.created_at
                            }));
                            return {
                                id: activeItem.id,
                                codigo: code,
                                area: 'Offline',
                                spool_count: activeItem.spool_count,
                                revisions: revisions
                            };
                        });
                    };

                    const mappedIsos = groupIsometrics(paged);
                    setIsometrics(mappedIsos);
                }
            }
        } catch (error) {
            console.error('Error loading isometrics:', error)
            // Fallback retry local if API failed despite being "online"
            try {
                const localIsos = await db.isometrics.where('project_id').equals(projectId).toArray()
                if (localIsos.length > 0) setIsometrics(localIsos)
            } catch (e) { console.error(e) }
        } finally {
            setLoading(false)
        }
    }

    const handleManualSync = async () => {
        if (!projectId || !isOnline) return
        try {
            // 1. Upload pending changes first
            await syncManager.processPendingActions()
            // 2. Download latest data
            await syncManager.syncProject(projectId)
            // 3. Refresh local view
            await loadIsometrics()
        } catch (error) {
            console.error("Sync failed:", error)
        }
    }

    async function handleSelectIso(iso: any) {
        if (selectedIso?.id === iso.id) {
            setSelectedIso(null)
            setDetails(null)
            return
        }
        setSelectedIso(iso)
        setLoadingDetails(true)
        // Find active rev logic same as before, but ensure structure matches local/remote
        // Local isos might need to be adapted if structure differs slightly
        const activeRev = iso.revisions?.find((r: any) => r.estado === 'VIGENTE') || iso.revisions?.[0] || { id: iso.id } // Fallback for specific local structure if needed

        // If we are relying on local iso object which might be flat (LocalIsometric), handle accordingly
        // LocalIsometric has 'id' which is likely the revision ID if synchronized from revisions view?
        // Wait, in syncManager: id: rev.id. So iso.id IS the revision id in local DB?
        // Actually localIsometrics has 'id' = rev.id. And 'code' = iso code.
        const targetRevisionId = isOnline ? activeRev.id : iso.id

        if (targetRevisionId) {
            try {
                if (isOnline) {
                    const data = await getIsometricDetails(targetRevisionId)
                    setDetails(data)
                    setSelectedRevisionId(targetRevisionId)
                    const allRevisionIds = iso.revisions?.map((r: any) => r.id) || []
                    await loadAllRevisionFiles(allRevisionIds)
                } else {
                    // Offline construction of details
                    console.log('Modo Offline: Construyendo detalles desde Dexie...')

                    // 1. Get Welds
                    // LocalWeld has 'revision_id'
                    const localWelds = await db.welds.where('revision_id').equals(targetRevisionId).toArray()

                    // 2. Get Spool Tracking
                    // LocalSpool has 'revision_id'
                    const localSpools = await db.spools.where('revision_id').equals(targetRevisionId).toArray()

                    // 3. Get Levantamientos
                    const localLevs = await db.levantamientos.where('revision_id').equals(targetRevisionId).toArray()

                    // Construct details object compatible with MasterViewsManager
                    // Note: Adapting data shapes might be needed if Local types differ from API response
                    const offlineDetails: any = {
                        welds: localWelds.map(w => ({
                            ...w,
                            diameter_inches: w.diameter, // Mapping
                            name: w.weld_number,
                            destination: w.destination || (w.type?.includes('SHOP') ? 'S' : 'F') // Use stored destination or fallback
                        })) || [],
                        materials: [], // TODO: Sync materials offline if needed
                        boltedJoints: [],
                        spools: localSpools || [], // Usamos localSpools como base para la lista plana de spools
                        fabricationTracking: localSpools || [],
                        levantamientos: localLevs.map(l => ({
                            ...l,
                            latest_photo_url: null, // Blobs handling needed for photos
                            captured_by_user: 'Usuario Local'
                        })) || []
                    }

                    setDetails(offlineDetails)
                    setSelectedRevisionId(targetRevisionId)
                }

            } catch (error) {
                console.error('Error loading details:', error)
            }
        }
        setLoadingDetails(false)
    }

    const handleWeldUpdate = async (weldId: string, updates: any) => {
        try {
            const { error } = await supabase
                .from('spools_welds')
                .update(updates)
                .eq('id', weldId)

            if (error) throw error

            setDetails(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    welds: prev.welds.map(w => (w.id === weldId ? { ...w, ...updates } : w))
                }
            })

            alert('✅ Soldadura actualizada correctamente')
        } catch (error) {
            console.error('Error updating weld:', error)
            alert('❌ Error al actualizar la soldadura')
        }
    }

    const handleExecutionReport = async (data: { fecha: string; ejecutadoPor: string; supervisadoPor: string }) => {
        if (!weldForExecution) return

        try {
            // Get current user for audit
            const { data: { user } } = await supabase.auth.getUser()

            if (isOnline) {
                // Modo Online: Ejecutar directamente contra Supabase
                await registerWeldExecution(
                    weldForExecution.id,
                    data.ejecutadoPor,     // RUT del soldador
                    data.supervisadoPor,   // RUT del capataz
                    data.fecha,
                    user?.id               // ID del usuario que reporta
                )
            } else {
                // Modo Offline: Guardar en cola de acciones pendientes
                console.log('Modo Offline: Guardando reporte en cola local...')

                // 1. Guardar acción pendiente
                await db.pendingActions.add({
                    id: crypto.randomUUID(),
                    project_id: projectId,
                    type: 'EXECUTE_WELD',
                    payload: {
                        weldId: weldForExecution.id,
                        welderId: data.ejecutadoPor,
                        foremanId: data.supervisadoPor,
                        executionDate: data.fecha,
                        reportedByUserId: user?.id
                    },
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    retry_count: 0
                })

                // 2. Actualizar DB Local (Dexie) para consistencia offline
                await db.welds.update(weldForExecution.id, {
                    executed: true,
                    executed_at: data.fecha,
                    executed_by: data.ejecutadoPor,
                    updated_at: new Date().toISOString()
                })
            }

            // Optimistic Update (Shared for Online/Offline)
            setDetails(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    welds: prev.welds.map(w =>
                        w.id === weldForExecution.id
                            ? { ...w, executed: true, execution_date: data.fecha, welder_id: data.ejecutadoPor, foreman_id: data.supervisadoPor }
                            : w
                    )
                }
            })

            const message = isOnline ? '✅ Ejecución reportada correctamente' : '💾 Ejecución guardada localmente (Pendiente de sync)'
            alert(message)
        } catch (error) {
            console.error('Error reporting execution:', error)
            alert('❌ Error al reportar la ejecución')
        }
    }

    // Handle marking a weld for rework
    const handleRework = async (
        responsibility: ReworkResponsibility,
        reason: string,
        executionData?: { fecha: string; welderId: string | null; foremanId: string }
    ) => {
        if (!weldForRework) return

        try {
            // First, mark the old execution as rework
            await markWeldForRework(weldForRework.id, responsibility, reason)

            // If TERRENO, also register the new execution immediately
            if (responsibility === 'TERRENO' && executionData) {
                // Get current user for audit
                const { data: { user } } = await supabase.auth.getUser()

                await registerWeldExecution(
                    weldForRework.id,
                    executionData.welderId,
                    executionData.foremanId,
                    executionData.fecha,
                    user?.id  // ID del usuario que reporta
                )

                // Update local state - weld is now executed again
                setDetails(prev => {
                    if (!prev) return null
                    return {
                        ...prev,
                        welds: prev.welds.map(w =>
                            w.id === weldForRework.id
                                ? {
                                    ...w,
                                    executed: true,
                                    execution_date: executionData.fecha,
                                    welder_id: executionData.welderId,
                                    foreman_id: executionData.foremanId,
                                    rework_count: (w.rework_count || 0) + 1
                                }
                                : w
                        )
                    }
                })

                setShowReworkModal(false)
                setWeldForRework(null)
                alert('✅ Retrabajo registrado y nueva ejecución guardada.')
            } else {
                // For INGENIERIA and RECHAZO_END, weld goes back to pending
                setDetails(prev => {
                    if (!prev) return null
                    return {
                        ...prev,
                        welds: prev.welds.map(w =>
                            w.id === weldForRework.id
                                ? {
                                    ...w,
                                    executed: false,
                                    execution_date: null,
                                    welder_id: null,
                                    foreman_id: null,
                                    rework_count: (w.rework_count || 0) + 1
                                }
                                : w
                        )
                    }
                })

                setShowReworkModal(false)
                setWeldForRework(null)
                alert('✅ Retrabajo registrado. La unión vuelve a estado PENDIENTE.')
            }
        } catch (error) {
            console.error('Error marking rework:', error)
            throw error
        }
    }

    // Handle soft delete of a weld
    const handleDeleteWeld = async (reason: string) => {
        if (!weldForDelete) return

        try {
            // Get current user for audit
            const { data: { user } } = await supabase.auth.getUser()
            await deleteWeld(weldForDelete.id, reason, user?.id)

            // Update local state
            setDetails(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    welds: prev.welds.map(w =>
                        w.id === weldForDelete.id
                            ? { ...w, deleted: true, deletion_reason: reason }
                            : w
                    )
                }
            })

            setShowDeleteModal(false)
            setWeldForDelete(null)
            setSelectedWeld(null)
            alert('✅ Unión eliminada correctamente.')
        } catch (error) {
            console.error('Error deleting weld:', error)
            throw error
        }
    }

    // Handle restore of a deleted weld
    const handleRestoreWeld = async (weld: any) => {
        try {
            await restoreWeld(weld.id)

            // Update local state
            setDetails(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    welds: prev.welds.map(w =>
                        w.id === weld.id
                            ? { ...w, deleted: false, deletion_reason: null }
                            : w
                    )
                }
            })

            alert('✅ Unión restaurada correctamente.')
        } catch (error) {
            console.error('Error restoring weld:', error)
            alert('❌ Error al restaurar la unión')
        }
    }

    // Handle undo false execution report
    const handleUndoExecution = async (reason: string) => {
        if (!weldForUndo) return

        try {
            await undoWeldExecution(weldForUndo.id, reason)

            // Update local state
            setDetails(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    welds: prev.welds.map(w =>
                        w.id === weldForUndo.id
                            ? {
                                ...w,
                                executed: false,
                                execution_date: null,
                                welder_id: null,
                                foreman_id: null
                            }
                            : w
                    )
                }
            })

            setShowUndoModal(false)
            setWeldForUndo(null)
            setSelectedWeld(null)
            alert('✅ Reporte deshecho. La unión vuelve a estado PENDIENTE.')
        } catch (error) {
            console.error('Error undoing execution:', error)
            throw error
        }
    }

    // Handle opening add weld modal
    const handleAddWeld = (prevWeld: any | null, nextWeld: any | null, revisionId: string, isoNumber: string, rev: string) => {
        setAddWeldAdjacentWelds({ prev: prevWeld || undefined, next: nextWeld || undefined })
        setAddWeldContext({ revisionId, projectId, isoNumber, rev })
        setShowAddWeldModal(true)
    }

    // Handle when new weld is created
    const handleNewWeldCreated = (newWeld: any) => {
        setDetails(prev => {
            if (!prev) return null

            let updatedWelds = [...prev.welds]

            // If newWeld has display_order, might need to shift local welds
            // (Only strictly necessary if we want to avoid refresh, but good for UX)
            if (newWeld.display_order) {
                updatedWelds = updatedWelds.map(w => {
                    if ((w.display_order || 0) >= newWeld.display_order) {
                        return { ...w, display_order: (w.display_order || 0) + 1 }
                    }
                    return w
                })
            }

            return {
                ...prev,
                welds: [...updatedWelds, newWeld].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
            }
        })
        setShowAddWeldModal(false)
        setAddWeldContext(null)
    }

    // Drag & drop handlers for weld reordering
    const handleWeldDragStart = (e: React.DragEvent, weldId: string) => {
        if (!isDragDropEnabled) return
        setDraggedWeldId(weldId)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleWeldDragOver = (e: React.DragEvent) => {
        if (!isDragDropEnabled || !draggedWeldId) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleWeldDrop = async (e: React.DragEvent, targetWeldId: string, spoolWelds: any[]) => {
        e.preventDefault()
        if (!isDragDropEnabled || !draggedWeldId || draggedWeldId === targetWeldId) {
            setDraggedWeldId(null)
            return
        }

        try {
            // Find indices
            const draggedIndex = spoolWelds.findIndex(w => w.id === draggedWeldId)
            const targetIndex = spoolWelds.findIndex(w => w.id === targetWeldId)

            if (draggedIndex === -1 || targetIndex === -1) return

            // Reorder array
            const reordered = [...spoolWelds]
            const [removed] = reordered.splice(draggedIndex, 1)
            reordered.splice(targetIndex, 0, removed)

            // Get weld IDs in new order
            const weldIds = reordered.map(w => w.id)

            // Update backend
            const revisionId = spoolWelds[0]?.revision_id
            if (revisionId) {
                await reorderWelds(revisionId, weldIds)

                // Refresh details
                const refreshedDetails = await getIsometricDetails(revisionId)
                setDetails(refreshedDetails)
            }
        } catch (error) {
            console.error('Error reordering welds:', error)
            alert('Error al reordenar las uniones')
        } finally {
            setDraggedWeldId(null)
        }
    }

    const handleJointToggle = async (jointId: string, currentStatus: boolean) => {
        try {
            setDetails(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    joints: prev.joints.map(j => (j.id === jointId ? { ...j, executed: !currentStatus } : j))
                }
            })
            await updateJointExecution(jointId, !currentStatus)
        } catch (error) {
            console.error('Error updating joint:', error)
        }
    }

    const loadAllRevisionFiles = async (revisionIds: string[]) => {
        if (!revisionIds.length) {
            setRevisionFiles([])
            return
        }
        try {
            const { data, error } = await supabase
                .from('revision_files')
                .select('*')
                .in('revision_id', revisionIds)
                .order('version_number', { ascending: false })

            if (error) throw error
            setRevisionFiles(data || [])
        } catch (error) {
            console.error('Error loading revision files:', error)
            setRevisionFiles([])
        }
    }

    const handleViewPdf = async (fileUrl: string) => {
        let urlToView = fileUrl
        if (!fileUrl.startsWith('http')) {
            const { data, error } = await supabase.storage
                .from('revision-files')
                .createSignedUrl(fileUrl, 3600)

            if (error || !data) {
                console.error('Error getting signed URL:', error)
                alert('Error al abrir el archivo. Verifique que el archivo exista.')
                return
            }
            urlToView = data.signedUrl
        }
        setSelectedPdfUrl(urlToView)
        setShowPdfViewer(true)
    }

    const handleUploadClick = (revisionId: string, isoCode: string, revCode: string) => {
        setUploadingContext({ revisionId, isoCode, revCode })
        fileInputRef.current?.click()
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file || !uploadingContext) return

        try {
            await uploadPDFToRevision(
                uploadingContext.revisionId,
                file,
                'pdf',
                true,
                uploadingContext.isoCode,
                uploadingContext.revCode
            )

            if (selectedIso) {
                const allRevisionIds = selectedIso.revisions?.map((r: any) => r.id) || []
                await loadAllRevisionFiles(allRevisionIds)
            }
            alert('Archivo subido correctamente')
        } catch (error) {
            console.error('Error uploading file:', error)
            alert('Error al subir el archivo')
        } finally {
            setUploadingContext(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDeleteFile = async (fileId: string, fileUrl: string, fileName: string) => {
        if (!confirm(`¿Estás seguro de eliminar el archivo "${fileName}"? Esta acción no se puede deshacer.`)) return

        try {
            const success = await deleteRevisionFile(fileId, fileUrl)
            if (success) {
                alert('Archivo eliminado correctamente')
                if (selectedIso) {
                    const allRevisionIds = selectedIso.revisions?.map((r: any) => r.id) || []
                    await loadAllRevisionFiles(allRevisionIds)
                }
            } else {
                alert('No se pudo eliminar el archivo')
            }
        } catch (error) {
            console.error('Error deleting file:', error)
            alert('Error al eliminar archivo')
        }
    }

    const handleRevisionChange = async (revisionId: string) => {
        setSelectedRevisionId(revisionId)
        setLoadingDetails(true)
        try {
            const data = await getIsometricDetails(revisionId)
            setDetails(data)
        } catch (error) {
            console.error('Error loading revision details:', error)
        }
        setLoadingDetails(false)
    }

    // Levantamiento and photo viewer handlers
    const handleOpenLevantamientoModal = (spool: any) => {
        if (!selectedRevisionId) return

        setLevantamientoModal({
            isOpen: true,
            spoolNumber: spool.spool_number,
            revisionId: selectedRevisionId,
            projectId: projectId
        })
    }

    const handleCloseLevantamientoModal = () => {
        setLevantamientoModal(null)
    }

    const handleOpenPhotoViewer = (spool: any) => {
        setPhotoViewer({
            isOpen: true,
            spool: spool
        })
    }

    // Toggle spool expansion in Unions view
    const toggleSpoolExpanded = (spoolNumber: string) => {
        setExpandedSpools(prev => {
            const newSet = new Set(prev)
            if (newSet.has(spoolNumber)) {
                newSet.delete(spoolNumber)
            } else {
                newSet.add(spoolNumber)
            }
            return newSet
        })
    }

    // Toggle spool expansion in Spools view
    const toggleSpoolInSpoolsView = (spoolNumber: string) => {
        setExpandedSpoolsInSpoolsView(prev => {
            const newSet = new Set(prev)
            if (newSet.has(spoolNumber)) {
                newSet.delete(spoolNumber)
            } else {
                newSet.add(spoolNumber)
            }
            return newSet
        })
    }

    // Spool modal handlers
    const handleOpenSpoolInfoModal = (spool: any) => {
        if (!selectedRevisionId) return
        setSelectedSpoolForModal({
            spoolNumber: spool.spool_number,
            revisionId: selectedRevisionId,
            lengthMeters: spool.length_meters,
            weightKg: spool.weight_kg
        })
        setShowSpoolInfoModal(true)
    }

    const handleOpenPhaseModal = (spool: any, phase: 'ndt' | 'pwht' | 'surface_treatment' | 'dispatch' | 'field_erection', phaseName: string, currentStatus?: string) => {
        if (!selectedRevisionId) return
        setSelectedSpoolForModal({
            spoolNumber: spool.spool_number,
            revisionId: selectedRevisionId,
            phase,
            phaseName,
            currentStatus
        })
        setShowSpoolPhaseModal(true)
    }

    const handleModalUpdate = async () => {
        // Reload details to refresh spool data
        if (details && selectedRevisionId) {
            try {
                if (isOnline) {
                    const freshData = await getIsometricDetails(selectedRevisionId)
                    setDetails(freshData)
                } else {
                    // Modo Offline: Refrescando detalles desde Dexie
                    console.log('Modo Offline: Refrescando detalles desde Dexie...')

                    const localWelds = await db.welds.where('revision_id').equals(selectedRevisionId).toArray()
                    const localSpools = await db.spools.where('revision_id').equals(selectedRevisionId).toArray()
                    const localLevs = await db.levantamientos.where('revision_id').equals(selectedRevisionId).toArray()

                    // Construct details object compatible with MasterViewsManager
                    const offlineDetails: any = {
                        welds: localWelds.map(w => ({
                            ...w,
                            diameter_inches: w.diameter,
                            name: w.weld_number,
                            destination: w.destination || (w.type?.includes('SHOP') ? 'S' : 'F')
                        })) || [],
                        materials: [],
                        boltedJoints: details.joints || [], // Mantener joints previos si existen
                        spools: localSpools || [],
                        fabricationTracking: localSpools || [],
                        levantamientos: await Promise.all(localLevs.map(async (l) => {
                            // Load photos for this levantamiento from Dexie
                            const photos = await db.photos.where('levantamiento_id').equals(l.id).toArray()

                            // Create Object URLs for photos to display in UI
                            const photosWithUrls = photos.map(p => ({
                                storage_path: p.id, // Use ID as identifier
                                created_at: p.created_at,
                                url: URL.createObjectURL(p.preview_blob), // Use preview for photo viewer
                                thumbnail_url: URL.createObjectURL(p.thumbnail_blob) // Use thumbnail for spool cards
                            }))

                            return {
                                ...l,
                                latest_photo_url: photosWithUrls[0]?.url || null,
                                photos_count: photosWithUrls.length,
                                photos: photosWithUrls,
                                captured_by_user: 'Usuario Local'
                            }
                        })) || []
                    }

                    setDetails(offlineDetails)
                }
            } catch (error) {
                console.error('Error refreshing data:', error)
            }
        }
    }

    // Handlers for spool drag & drop in Spools view
    const handleSpoolDragStart = (e: React.DragEvent, spoolNumber: string) => {
        if (!isDragDropEnabled) return
        setDraggedSpoolNumber(spoolNumber)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleSpoolDragOver = (e: React.DragEvent) => {
        if (!isDragDropEnabled || !draggedSpoolNumber) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleSpoolDrop = (e: React.DragEvent, targetSpoolNumber: string) => {
        e.preventDefault()
        if (!isDragDropEnabled || !draggedSpoolNumber || draggedSpoolNumber === targetSpoolNumber) {
            setDraggedSpoolNumber(null)
            return
        }

        // Reorder the fabrication spools array
        const draggedIndex = fabricationSpools.findIndex(s => s.spool_number === draggedSpoolNumber)
        const targetIndex = fabricationSpools.findIndex(s => s.spool_number === targetSpoolNumber)

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedSpoolNumber(null)
            return
        }

        const reordered = [...fabricationSpools]
        const [removed] = reordered.splice(draggedIndex, 1)
        reordered.splice(targetIndex, 0, removed)

        setFabricationSpools(reordered)
        setDraggedSpoolNumber(null)
    }

    return (
        <div className="relative min-h-screen pb-20 max-w-4xl mx-auto w-full">
            {/* Search Bar */}
            < div className="bg-white p-4 rounded-xl shadow-sm border border-gray-300 sticky top-0 z-10 mb-6" >
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Buscar isométrico..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>
            </div >

            {/* Isometric List */}
            < div className="grid grid-cols-1 gap-4" >
                {
                    loading ? (
                        // Skeleton loader matching exact dimensions of real cards to prevent CLS
                        <div className="space-y-4" >
                            {[...Array(3)].map((_, i) => (
                                <div
                                    key={i}
                                    className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden animate-pulse"
                                    style={{ minHeight: '76px' }} // Match real card height
                                >
                                    <div className="p-4 flex justify-between items-center">
                                        <div className="flex-1">
                                            {/* Skeleton for h3 title - text-lg font-bold = ~28px height */}
                                            <div className="h-7 bg-gray-200 rounded w-32 mb-2"></div>
                                            {/* Skeleton for metadata - text-sm = ~20px height */}
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-5 bg-gray-200 rounded w-24"></div>
                                                <div className="h-5 bg-gray-200 rounded w-16"></div>
                                            </div>
                                        </div>
                                        <div className="text-gray-300 text-sm">▼</div>
                                    </div>
                                </div>
                            ))
                            }
                        </div >
                    ) : isometrics.length === 0 ? (
                        <div className="text-center py-8 text-gray-700">No se encontraron isométricos.</div>
                    ) : (
                        isometrics.map(iso => {
                            const activeRev = iso.revisions?.find((r: any) => r.estado === 'VIGENTE') || iso.revisions?.[0]
                            const isSelected = selectedIso?.id === iso.id
                            const allRevisions = iso.revisions || []

                            return (
                                <div
                                    key={iso.id}
                                    className={`bg-white rounded-xl shadow-sm border transition-all overflow-hidden ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-300 hover:border-blue-300'
                                        }`}
                                >
                                    {/* Header Card */}
                                    <div onClick={() => handleSelectIso(iso)} className="p-4 cursor-pointer flex justify-between items-center bg-white">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-900">{iso.codigo || 'Sin Código'}</h3>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span className="text-sm text-gray-700">{iso.area || 'N/A'}</span>
                                                {activeRev && (
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-xs font-bold ${activeRev.estado === 'VIGENTE' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                                            }`}
                                                    >
                                                        Rev {activeRev.codigo}
                                                    </span>
                                                )}
                                                {allRevisions?.length > 1 && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setShowRevisionHistory(!showRevisionHistory)
                                                        }}
                                                        className="p-1.5 rounded-full hover:bg-blue-50 text-blue-600 hover:text-blue-800 transition-all"
                                                        title="Ver historial de revisiones"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-gray-600">{isSelected ? '▲' : '▼'}</div>
                                    </div>

                                    {/* Revision History Panel */}
                                    {showRevisionHistory && isSelected && (
                                        <div className="border-t border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Historial de Revisiones
                                            </h4>
                                            <div className="space-y-2">
                                                {allRevisions.map((rev: any) => {
                                                    const revFiles = (revisionFiles || []).filter(f => f.revision_id === rev.id)
                                                    const isActiveRevision = selectedRevisionId === rev.id

                                                    return (
                                                        <div
                                                            key={rev.id}
                                                            className={`bg-white rounded-lg border-2 transition-all shadow-sm overflow-hidden ${isActiveRevision
                                                                ? 'border-blue-500 ring-2 ring-blue-200'
                                                                : 'border-gray-300 hover:border-blue-300'
                                                                }`}
                                                        >
                                                            {/* Revision Header */}
                                                            <div
                                                                onClick={() => handleRevisionChange(rev.id)}
                                                                className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-gray-900">Rev {rev.codigo}</span>
                                                                        <span
                                                                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${rev.estado === 'VIGENTE'
                                                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                                                : 'bg-gray-200 text-gray-600 border border-gray-300'
                                                                                }`}
                                                                        >
                                                                            {rev.estado}
                                                                        </span>
                                                                        {isActiveRevision && (
                                                                            <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                                </svg>
                                                                                Viendo
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-xs text-gray-700">
                                                                        {rev.fecha_emision ? new Date(rev.fecha_emision).toLocaleDateString('es-ES') : 'Sin fecha'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Files Section */}
                                                            {(revFiles || []).length > 0 && (
                                                                <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
                                                                    <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                        </svg>
                                                                        Archivos ({(revFiles || []).length})
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        {revFiles.map(file => (
                                                                            <div
                                                                                key={file.id}
                                                                                className="flex items-center justify-between bg-white rounded border border-gray-300 px-2 py-1.5 hover:border-blue-300 transition-colors"
                                                                            >
                                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                                                    </svg>
                                                                                    <span className="text-xs text-gray-700 truncate font-medium">
                                                                                        {file.file_name}
                                                                                    </span>
                                                                                </div>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation()
                                                                                        handleViewPdf(file.file_url)
                                                                                    }}
                                                                                    className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                                                                                >
                                                                                    Ver PDF
                                                                                </button>
                                                                                {/* Delete button - only show if user has delete permission */}
                                                                                {userRole && hasPermission(userRole, 'isometricos', 'delete') && (
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation()
                                                                                            handleDeleteFile(file.id, file.file_url, file.file_name)
                                                                                        }}
                                                                                        className="ml-2 px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors flex-shrink-0"
                                                                                        title="Eliminar archivo"
                                                                                    >
                                                                                        ✕
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Upload Button - only show if user has create permission */}
                                                            {userRole && hasPermission(userRole, 'isometricos', 'create') && (
                                                                <div className="border-t border-gray-100 bg-white px-3 py-2">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            handleUploadClick(rev.id, iso.codigo, rev.codigo)
                                                                        }}
                                                                        className="w-full px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-xs font-semibold hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-2 shadow-sm"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                                        </svg>
                                                                        Subir Archivo
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Expanded Details */}
                                    {isSelected && (
                                        <div className="border-t border-gray-100 bg-gray-50">
                                            {loadingDetails ? (
                                                <div className="p-8 text-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                                </div>
                                            ) : details ? (
                                                <div>
                                                    {/* Tabs */}
                                                    <div className="flex overflow-x-auto border-b border-gray-300 bg-white sticky top-0">
                                                        <button
                                                            onClick={() => setActiveTab('MATERIALS')}
                                                            className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'MATERIALS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-700 hover:text-gray-700'
                                                                }`}
                                                        >
                                                            Materiales ({details.materials?.length || 0})
                                                        </button>
                                                        {/* Unions tab - Only show if user has read permission */}
                                                        {userRole && hasPermission(userRole, 'juntas', 'read') && (
                                                            <button
                                                                onClick={() => setActiveTab('UNIONS')}
                                                                className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'UNIONS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-700 hover:text-gray-700'
                                                                    }`}
                                                            >
                                                                Uniones ({details.welds?.length || 0})
                                                            </button>
                                                        )}
                                                        {/* Spools tab - Only show if user has read permission */}
                                                        {userRole && hasPermission(userRole, 'spools', 'read') && (
                                                            <button
                                                                onClick={() => setActiveTab('SPOOLS')}
                                                                className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'SPOOLS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-700 hover:text-gray-700'
                                                                    }`}
                                                            >
                                                                Spools ({details.spools?.length || details.fabricationTracking?.length || 0})
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setActiveTab('TORQUES')}
                                                            className={`flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'TORQUES' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-700 hover:text-gray-700'
                                                                }`}
                                                        >
                                                            Torques ({(details.joints || []).length})
                                                        </button>
                                                    </div>

                                                    {/* Reordenar Toggle - visible para UNIONS y SPOOLS */}
                                                    {(activeTab === 'UNIONS' || activeTab === 'SPOOLS') && (
                                                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
                                                            <span className="text-sm text-gray-700 font-medium">Modo Reordenar</span>
                                                            <button
                                                                onClick={() => setIsDragDropEnabled(!isDragDropEnabled)}
                                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDragDropEnabled ? 'bg-emerald-500' : 'bg-gray-300'
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${isDragDropEnabled ? 'translate-x-6' : 'translate-x-1'
                                                                        }`}
                                                                />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Content */}
                                                    <div className="p-4">
                                                        {activeTab === 'MATERIALS' && (
                                                            <div className="space-y-3">
                                                                {(details.materials || []).map(mat => (
                                                                    <div key={mat.id} className="bg-white p-3 rounded-lg border border-gray-300 shadow-sm text-sm">
                                                                        <div className="font-bold text-gray-800 mb-1">{mat.item_code}</div>
                                                                        <div className="text-gray-600 mb-1">{mat.description || 'Sin descripción'}</div>
                                                                        <div className="flex justify-between items-center text-xs text-gray-700">
                                                                            <span>Cant: {mat.qty} {mat.qty_unit}</span>
                                                                            <button className="text-blue-600 hover:text-blue-800 font-medium">+ Solicitar</button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {activeTab === 'UNIONS' && (
                                                            userRole && hasPermission(userRole, 'juntas', 'read') ? (
                                                                <div className="space-y-4">
                                                                    {(weldsBySpool || []).map(spool => {
                                                                        const isExpanded = expandedSpools.has(spool.spool_number)
                                                                        return (
                                                                            <div key={spool.spool_number} className="bg-white rounded-lg border border-gray-300 shadow-sm overflow-hidden">
                                                                                {/* Spool Header */}
                                                                                <div
                                                                                    onClick={() => toggleSpoolExpanded(spool.spool_number)}
                                                                                    className="p-3 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                                                                                >
                                                                                    <div className="flex-1">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="font-bold text-gray-900">Spool: {spool.spool_number}</span>
                                                                                            <span
                                                                                                className={`px-2 py-0.5 rounded text-xs font-bold ${spool.fabrication_status === 'COMPLETO'
                                                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                                                    : spool.fabrication_status === 'FABRICADO'
                                                                                                        ? 'bg-green-100 text-green-700'
                                                                                                        : spool.fabrication_status === 'EN PROCESO'
                                                                                                            ? 'bg-yellow-100 text-yellow-700'
                                                                                                            : spool.fabrication_status === 'N/A'
                                                                                                                ? 'bg-gray-200 text-gray-700'
                                                                                                                : 'bg-orange-100 text-orange-700'
                                                                                                    }`}
                                                                                            >
                                                                                                {spool.fabrication_status}
                                                                                            </span>
                                                                                        </div>
                                                                                        <span className="text-gray-500 font-normal ml-2">
                                                                                            Taller: {spool.welds?.filter((w: any) => w.destination === 'S' && w.executed).length || 0}/{spool.welds?.filter((w: any) => w.destination === 'S').length || 0} •
                                                                                            Campo: {spool.welds?.filter((w: any) => w.destination === 'F' && w.executed).length || 0}/{spool.welds?.filter((w: any) => w.destination === 'F').length || 0} •
                                                                                            Total: {(spool.welds || []).length} uniones
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="text-gray-600">{isExpanded ? '▲' : '▼'}</div>
                                                                                </div>

                                                                                {/* Welds List */}
                                                                                {isExpanded && (
                                                                                    <div className="border-t border-gray-300 bg-gray-50 p-2">
                                                                                        {(spool.welds || []).map((weld, weldIndex) => {
                                                                                            // Get adjacent welds for add button
                                                                                            const safeWelds = spool.welds || []
                                                                                            const prevWeld = weldIndex > 0 ? safeWelds[weldIndex - 1] : null
                                                                                            const nextWeld = weld

                                                                                            // Determine card background color
                                                                                            const getCardBgClass = () => {
                                                                                                if (weld.deleted) return 'bg-red-50 border-red-200'
                                                                                                if (weld.executed) return 'bg-green-50 border-green-200'
                                                                                                if (weld.rework_count > 0) return 'bg-orange-50 border-orange-200'
                                                                                                return 'bg-white border-gray-300'
                                                                                            }

                                                                                            return (
                                                                                                <div key={weld.id} className="relative group/weld">
                                                                                                    {/* Invisible hover zone for add button - between cards */}
                                                                                                    <div className="relative h-2 -mt-1 mb-1 first:mt-0 group/add">
                                                                                                        <button
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation()
                                                                                                                const firstWeld = spool.welds[0]
                                                                                                                handleAddWeld(prevWeld, nextWeld, firstWeld?.revision_id || '', firstWeld?.iso_number || '', firstWeld?.rev || '')
                                                                                                            }}
                                                                                                            className="absolute inset-x-0 -top-1 h-5 z-0 flex justify-center items-center transition-opacity"
                                                                                                        >
                                                                                                            <div className="w-6 h-6 rounded-full bg-white border border-gray-300 opacity-30 hover:opacity-70 shadow-sm flex items-center justify-center transition-all">
                                                                                                                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                                                                                </svg>
                                                                                                            </div>
                                                                                                        </button>
                                                                                                    </div>

                                                                                                    {/* Weld Card */}
                                                                                                    <div
                                                                                                        draggable={isDragDropEnabled}
                                                                                                        onDragStart={(e) => handleWeldDragStart(e, weld.id)}
                                                                                                        onDragOver={handleWeldDragOver}
                                                                                                        onDrop={(e) => handleWeldDrop(e, weld.id, spool.welds)}
                                                                                                        onClick={() => !isDragDropEnabled && setSelectedWeld(weld)}
                                                                                                        className={`p-3 rounded-lg border flex justify-between items-center shadow-sm transition-all ${getCardBgClass()} ${isDragDropEnabled
                                                                                                            ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02]'
                                                                                                            : 'cursor-pointer hover:shadow-md'
                                                                                                            } ${draggedWeldId === weld.id ? 'opacity-50' : ''}`}
                                                                                                    >
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            {/* Drag Handle - Only visible when draggable */}
                                                                                                            {isDragDropEnabled && (
                                                                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                                                                                                                </svg>
                                                                                                            )}
                                                                                                            <div>
                                                                                                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                                                                                                    {weld.weld_number}
                                                                                                                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${weld.destination === 'S' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                                                                                        }`}>
                                                                                                                        {weld.destination === 'S' ? 'Taller' : 'Campo'}
                                                                                                                    </span>
                                                                                                                    {/* Rework Badge */}
                                                                                                                    {weld.rework_count > 0 && (
                                                                                                                        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                                                                                            R{weld.rework_count}
                                                                                                                        </span>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                                <div className="text-xs text-gray-600 flex items-center gap-1">
                                                                                                                    {weld.type_weld}
                                                                                                                    {!requiresWelder(weld.type_weld || '') && (
                                                                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 border border-gray-200" title="No requiere soldador">
                                                                                                                            No Soldada
                                                                                                                        </span>
                                                                                                                    )}
                                                                                                                    - {weld.nps}"
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        <div className="flex flex-col items-end gap-2">
                                                                                                            <span
                                                                                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${weld.deleted
                                                                                                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                                                                                                    : weld.executed
                                                                                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                                                                                        : 'bg-gray-200 text-gray-700 border border-gray-300'
                                                                                                                    }`}
                                                                                                            >
                                                                                                                {weld.deleted ? 'ELIMINADA' : weld.executed ? 'EJECUTADO' : 'PENDIENTE'}
                                                                                                            </span>
                                                                                                            {/* Reportar button for pending welds (not  deleted) - Only show if user has create permission */}
                                                                                                            {!weld.executed && !weld.deleted && userRole && hasPermission(userRole, 'juntas', 'create') && (
                                                                                                                <button
                                                                                                                    onClick={(e) => {
                                                                                                                        e.stopPropagation()
                                                                                                                        setWeldForExecution(weld)
                                                                                                                        setShowExecutionModal(true)
                                                                                                                    }}
                                                                                                                    className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                                                                                                                >
                                                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                                                                    </svg>
                                                                                                                    Reportar
                                                                                                                </button>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )
                                                                                        })}

                                                                                        {/* Add Button at the end - appears on hover near bottom */}
                                                                                        <div className="relative h-3 mt-1 group/add">
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation()
                                                                                                    const lastWeld = spool.welds[spool.welds.length - 1]
                                                                                                    const firstWeld = spool.welds[0]
                                                                                                    handleAddWeld(lastWeld || null, null, firstWeld?.revision_id || '', firstWeld?.iso_number || '', firstWeld?.rev || '')
                                                                                                }}
                                                                                                className="absolute inset-x-0 top-0 h-5 z-0 flex justify-center items-center transition-opacity"
                                                                                            >
                                                                                                <div className="w-6 h-6 rounded-full bg-white border border-gray-300 opacity-30 hover:opacity-70 shadow-sm flex items-center justify-center transition-all">
                                                                                                    <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                                                                    </svg>
                                                                                                </div>
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    })
                                                                    }</div>
                                                            ) : (
                                                                <div className="p-8 text-center">
                                                                    <p className="text-gray-600">No tienes permisos para ver uniones.</p>
                                                                </div>
                                                            )
                                                        )}

                                                        {activeTab === 'SPOOLS' && (
                                                            <div className="space-y-3">
                                                                {(fabricationSpools || []).map((spool: any) => {
                                                                    const isExpanded = expandedSpoolsInSpoolsView.has(spool.spool_number)

                                                                    // Configuration for phases
                                                                    const phasesConfig = [
                                                                        {
                                                                            id: 'shop',
                                                                            index: 1,
                                                                            label: 'Soldadura Taller',
                                                                            sub: `${spool.shop_welds_executed}/${spool.shop_welds_total} uniones`,
                                                                            status: spool.shop_welding_status,
                                                                            click: null
                                                                        },
                                                                        {
                                                                            id: 'ndt',
                                                                            index: 2,
                                                                            label: 'END/NDE',
                                                                            sub: 'Ensayos No Destructivos',
                                                                            status: spool.ndt_status,
                                                                            click: () => handleOpenPhaseModal(spool, 'ndt', 'END/NDE', spool.ndt_status)
                                                                        },
                                                                        {
                                                                            id: 'pwht',
                                                                            index: 3,
                                                                            label: 'PWHT',
                                                                            sub: 'Tratamiento Térmico',
                                                                            status: spool.pwht_status,
                                                                            click: () => handleOpenPhaseModal(spool, 'pwht', 'PWHT', spool.pwht_status)
                                                                        },
                                                                        {
                                                                            id: 'surface',
                                                                            index: 4,
                                                                            label: 'Tratamiento Superficial',
                                                                            sub: 'Pintura/Galvanizado',
                                                                            status: spool.surface_treatment_status,
                                                                            click: () => handleOpenPhaseModal(spool, 'surface_treatment', 'Tratamiento Superficial', spool.surface_treatment_status)
                                                                        },
                                                                        {
                                                                            id: 'dispatch',
                                                                            index: 5,
                                                                            label: 'Despacho',
                                                                            sub: 'Logística y Transporte',
                                                                            status: spool.dispatch_status,
                                                                            click: () => handleOpenPhaseModal(spool, 'dispatch', 'Despacho', spool.dispatch_status)
                                                                        },
                                                                        {
                                                                            id: 'erection',
                                                                            index: 6,
                                                                            label: 'Montaje Campo',
                                                                            sub: 'Erección',
                                                                            status: spool.field_erection_status,
                                                                            click: () => handleOpenPhaseModal(spool, 'field_erection', 'Montaje Campo', spool.field_erection_status)
                                                                        },
                                                                        {
                                                                            id: 'field_weld',
                                                                            index: 7,
                                                                            label: 'Soldadura Campo',
                                                                            sub: `${spool.field_welds_executed}/${spool.field_welds_total} uniones`,
                                                                            status: spool.field_welding_status,
                                                                            click: null
                                                                        }
                                                                    ]

                                                                    const completedCount = phasesConfig.filter(p => p.status === 'COMPLETED' || p.status === 'N/A').length
                                                                    const progressPercent = Math.round((completedCount / 7) * 100)

                                                                    const getStatusColor = (status: string) => {
                                                                        switch (status) {
                                                                            case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200'
                                                                            case 'IN_PROGRESS': return 'bg-amber-100 text-amber-700 border-amber-200'
                                                                            case 'N/A': return 'bg-gray-100 text-gray-500 border-gray-200'
                                                                            default: return 'bg-gray-50 text-gray-600 border-gray-200'
                                                                        }
                                                                    }

                                                                    const getStatusLabel = (status: string) => {
                                                                        switch (status) {
                                                                            case 'COMPLETED': return 'COMPLETADO'
                                                                            case 'IN_PROGRESS': return 'EN PROCESO'
                                                                            case 'N/A': return 'N/A'
                                                                            default: return 'PENDIENTE'
                                                                        }
                                                                    }

                                                                    return (
                                                                        <div
                                                                            key={spool.spool_number}
                                                                            draggable={isDragDropEnabled}
                                                                            onDragStart={(e) => handleSpoolDragStart(e, spool.spool_number)}
                                                                            onDragOver={handleSpoolDragOver}
                                                                            onDrop={(e) => handleSpoolDrop(e, spool.spool_number)}
                                                                            className={`relative rounded-lg shadow-md hover:shadow-lg transition-shadow bg-white overflow-hidden p-[2px] ${isDragDropEnabled ? 'cursor-grab active:cursor-grabbing hover:scale-[1.01]' : ''} ${draggedSpoolNumber === spool.spool_number ? 'opacity-50' : ''}`}
                                                                            style={{
                                                                                background: `linear-gradient(to right, 
                                                                                #22c55e 0%, 
                                                                                #22c55e ${progressPercent}%, 
                                                                                #e5e7eb ${progressPercent}%, 
                                                                                #e5e7eb 100%)`
                                                                            }}
                                                                        >
                                                                            <div className="bg-white rounded overflow-hidden h-full">
                                                                                {/* Header with spool number and chevron */}
                                                                                <div
                                                                                    onClick={() => toggleSpoolInSpoolsView(spool.spool_number)}
                                                                                    className="p-3 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center border-b border-gray-200"
                                                                                >
                                                                                    <div className="flex items-center gap-3">
                                                                                        {isDragDropEnabled && (
                                                                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                                                                                            </svg>
                                                                                        )}
                                                                                        <span className="font-bold text-lg text-gray-900">{spool.spool_number}</span>
                                                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${progressPercent === 100 ? 'bg-green-100 text-green-700' : progressPercent > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>
                                                                                            {progressPercent}%
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="text-xs text-gray-600">
                                                                                            Largo: {spool.length_meters || '--'}m | Peso: {spool.weight_kg || '--'}kg
                                                                                        </div>
                                                                                        <div className="text-gray-600">{isExpanded ? '▲' : '▼'}</div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Photo section (if image exists) */}
                                                                                {spool.levantamiento_photo_url && (
                                                                                    <div
                                                                                        className="relative h-48 bg-gray-100 group cursor-pointer"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation()
                                                                                            setPhotoViewer({ isOpen: true, spool })
                                                                                        }}
                                                                                    >
                                                                                        <img
                                                                                            src={spool.levantamiento_photo_url}
                                                                                            alt={`Levantamiento ${spool.spool_number}`}
                                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                                        />
                                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                            <div className="absolute bottom-3 left-3 right-3 text-white">
                                                                                                <div className="text-sm font-medium">{spool.levantamiento_location || 'Sin ubicación'}</div>
                                                                                                <div className="text-xs text-gray-200 mt-1">
                                                                                                    {spool.levantamiento_date} por {spool.levantamiento_user}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="absolute top-3 right-3 bg-purple-600 text-white px-2 py-1 rounded-lg text-xs font-medium shadow-lg">
                                                                                            📷 {spool.levantamiento_photos_count || 1} fotos
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {/* Expanded content with phases */}
                                                                                {isExpanded && (
                                                                                    <div className="p-4 space-y-3 bg-gray-50">
                                                                                        {phasesConfig.map((phase) => (
                                                                                            <div
                                                                                                key={phase.id}
                                                                                                className="flex items-center gap-3 py-2 px-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                                                                                            >
                                                                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${phase.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : phase.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'}`}>
                                                                                                    {phase.status === 'COMPLETED' ? '✓' : phase.index}
                                                                                                </div>
                                                                                                <div className="flex-1">
                                                                                                    <div className="font-medium text-sm text-gray-900">{phase.label}</div>
                                                                                                    <div className="text-xs text-gray-600">{phase.sub}</div>
                                                                                                    {phase.id === 'dispatch' && spool.tracking_data?.dispatch_tracking_number && (
                                                                                                        <div className="text-xs text-blue-600 mt-1">Guía: {spool.tracking_data.dispatch_tracking_number}</div>
                                                                                                    )}
                                                                                                </div>
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        if (phase.click && userRole && hasPermission(userRole, 'spools', 'update')) {
                                                                                                            e.stopPropagation()
                                                                                                            phase.click()
                                                                                                        }
                                                                                                    }}
                                                                                                    disabled={!userRole || !hasPermission(userRole, 'spools', 'update')}
                                                                                                    className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(phase.status)} ${!userRole || !hasPermission(userRole, 'spools', 'update')
                                                                                                        ? 'opacity-50 cursor-not-allowed'
                                                                                                        : (phase.click ? 'hover:brightness-95 cursor-pointer' : 'cursor-default')
                                                                                                        }`}
                                                                                                >
                                                                                                    {getStatusLabel(phase.status)}
                                                                                                </button>
                                                                                            </div>
                                                                                        ))}

                                                                                        {/* Action Buttons */}
                                                                                        <div className="mt-4 pt-3 border-t border-gray-300 flex gap-2">
                                                                                            {/* Edit Info - requires UPDATE permission */}
                                                                                            {userRole && hasPermission(userRole, 'spools', 'update') && (
                                                                                                <button
                                                                                                    onClick={() => handleOpenSpoolInfoModal(spool)}
                                                                                                    className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                                                                >
                                                                                                    📏 Información del Spool
                                                                                                </button>
                                                                                            )}
                                                                                            {/* Levantamiento - requires CREATE permission */}
                                                                                            {userRole && hasPermission(userRole, 'spools', 'create') && (
                                                                                                <button
                                                                                                    onClick={() => handleOpenLevantamientoModal(spool)}
                                                                                                    className="flex-1 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                                                                                                >
                                                                                                    📷 Levantamiento
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )
                                                        }

                                                        {
                                                            activeTab === 'TORQUES' && (
                                                                <div className="space-y-3">
                                                                    {(details.joints || []).map(joint => (
                                                                        <div key={joint.id} className="bg-white p-3 rounded-lg border border-gray-300 flex justify-between items-center shadow-sm">
                                                                            <div>
                                                                                <div className="font-bold text-gray-800">{joint.flanged_joint_number}</div>
                                                                                <div className="text-xs text-gray-700">Rating: {joint.rating}</div>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => handleJointToggle(joint.id, joint.executed)}
                                                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${joint.executed ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-200'
                                                                                    }`}
                                                                            >
                                                                                {joint.executed ? 'TORQUEADO' : 'PENDIENTE'}
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )
                                                        }
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-8 text-center text-gray-700">No hay detalles cargados para esta revisión.</div>
                                            )}
                                        </div>
                                    )
                                    }
                                </div>
                            )
                        })
                    )
                }
            </div >

            {/* Modales */}
            {
                selectedWeld && (
                    <WeldDetailModal
                        weld={selectedWeld}
                        projectId={projectId}
                        requiresWelder={requiresWelder}
                        userRole={userRole}
                        onClose={() => setSelectedWeld(null)}
                        onUpdate={handleWeldUpdate}
                        onRework={(weld) => {
                            setSelectedWeld(null) // Close detail modal
                            setWeldForRework(weld)
                            setShowReworkModal(true)
                        }}
                        onDelete={(weld) => {
                            setSelectedWeld(null) // Close detail modal
                            setWeldForDelete(weld)
                            setShowDeleteModal(true)
                        }}
                        onRestore={handleRestoreWeld}
                        onUndo={(weld) => {
                            setSelectedWeld(null) // Close detail modal
                            setWeldForUndo(weld)
                            setShowUndoModal(true)
                        }}
                        onRefresh={async () => {
                            // Reload isometric details
                            if (selectedRevisionId) {
                                const refreshedDetails = await getIsometricDetails(selectedRevisionId)
                                setDetails(refreshedDetails)
                            }
                        }}
                    />
                )
            }

            {
                showExecutionModal && weldForExecution && (
                    <ExecutionReportModal
                        weld={weldForExecution}
                        projectId={projectId}
                        requiresWelder={requiresWelder}
                        onClose={() => {
                            setShowExecutionModal(false)
                            setWeldForExecution(null)
                        }}
                        onSubmit={handleExecutionReport}
                    />
                )
            }

            {/* Rework Modal */}
            {
                showReworkModal && weldForRework && (
                    <ReworkModal
                        weld={weldForRework}
                        projectId={projectId}
                        requiresWelder={requiresWelder}
                        onClose={() => {
                            setShowReworkModal(false)
                            setWeldForRework(null)
                        }}
                        onSubmit={handleRework}
                    />
                )
            }

            {/* Delete Weld Modal */}
            {
                showDeleteModal && weldForDelete && (
                    <DeleteWeldModal
                        weld={weldForDelete}
                        onClose={() => {
                            setShowDeleteModal(false)
                            setWeldForDelete(null)
                        }}
                        onSubmit={handleDeleteWeld}
                    />
                )
            }

            {/* Undo Execution Modal */}
            {
                showUndoModal && weldForUndo && (
                    <UndoExecutionModal
                        weld={weldForUndo}
                        onClose={() => {
                            setShowUndoModal(false)
                            setWeldForUndo(null)
                        }}
                        onSubmit={handleUndoExecution}
                    />
                )
            }

            {/* Add Weld Modal */}
            {
                showAddWeldModal && addWeldContext && (
                    <AddWeldModal
                        adjacentWelds={addWeldAdjacentWelds}
                        revisionId={addWeldContext.revisionId}
                        projectId={addWeldContext.projectId}
                        isoNumber={addWeldContext.isoNumber}
                        rev={addWeldContext.rev}
                        requiresWelder={requiresWelder}
                        onClose={() => {
                            setShowAddWeldModal(false)
                            setAddWeldContext(null)
                        }}
                        onSubmit={handleNewWeldCreated}
                    />
                )
            }

            {/* PDF Viewer Modal */}
            {
                showPdfViewer && selectedPdfUrl && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-4 border-b">
                                <h3 className="text-lg font-bold text-gray-900">Visor de PDF</h3>
                                <button
                                    onClick={() => {
                                        setShowPdfViewer(false)
                                        setSelectedPdfUrl(null)
                                    }}
                                    className="text-gray-700 hover:text-gray-700 text-2xl font-bold"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <iframe
                                    src={selectedPdfUrl}
                                    className="w-full h-full"
                                    title="PDF Viewer"
                                />
                            </div>
                        </div>
                    </div>
                )
            }



            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
            />

            {/* Spool Modals */}
            {
                selectedSpoolForModal && showSpoolPhaseModal && (
                    <SpoolPhaseModal
                        onClose={() => {
                            setShowSpoolPhaseModal(false)
                            setSelectedSpoolForModal(null)
                        }}
                        spoolNumber={selectedSpoolForModal.spoolNumber}
                        revisionId={selectedSpoolForModal.revisionId}
                        projectId={projectId}
                        phase={selectedSpoolForModal.phase!}
                        phaseName={selectedSpoolForModal.phaseName || ''}
                        currentStatus={selectedSpoolForModal.currentStatus}
                        onUpdate={handleModalUpdate}
                    />
                )
            }
            {
                selectedSpoolForModal && showSpoolInfoModal && (
                    <SpoolInfoModal
                        onClose={() => {
                            setShowSpoolInfoModal(false)
                            setSelectedSpoolForModal(null)
                        }}
                        spoolNumber={selectedSpoolForModal.spoolNumber}
                        revisionId={selectedSpoolForModal.revisionId}
                        projectId={projectId}
                        currentLength={selectedSpoolForModal.lengthMeters}
                        currentWeight={selectedSpoolForModal.weightKg}
                        onUpdate={handleModalUpdate}
                    />
                )
            }

            {/* Levantamiento Modal */}
            {
                levantamientoModal && (
                    <LevantamientoModal
                        isOpen={levantamientoModal.isOpen}
                        onClose={handleCloseLevantamientoModal}
                        spoolNumber={levantamientoModal.spoolNumber}
                        revisionId={levantamientoModal.revisionId}
                        projectId={levantamientoModal.projectId}
                        onUpdate={handleModalUpdate}
                    />
                )
            }

            {/* Photo Viewer Modal */}
            {
                photoViewer && photoViewer.spool && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60]"
                        onClick={() => setPhotoViewer(null)}
                    >
                        {/* Mobile Back Button - Increased touch target and moved down for status bar safety */}
                        <button
                            className="absolute top-8 left-6 text-white z-[70] flex items-center gap-2 bg-black/60 px-5 py-2.5 rounded-full backdrop-blur-md hover:bg-black/80 transition-all border border-white/20 shadow-lg active:scale-95"
                            onClick={(e) => {
                                e.stopPropagation()
                                setPhotoViewer(null)
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span className="font-semibold text-base">Volver</span>
                        </button>

                        <button
                            className="absolute top-8 right-6 text-white z-[70] w-12 h-12 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md hover:bg-black/80 transition-all border border-white/20 shadow-lg active:scale-95"
                            onClick={(e) => {
                                e.stopPropagation()
                                setPhotoViewer(null)
                            }}
                        >
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div
                            className="relative max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center p-8"
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content background
                        >
                            {/* Navigation Buttons */}
                            {photoViewer.spool.photos && photoViewer.spool.photos.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setPhotoViewer(prev => {
                                                if (!prev) return null
                                                const newIndex = (prev.currentPhotoIndex || 0) > 0
                                                    ? (prev.currentPhotoIndex || 0) - 1
                                                    : prev.spool.photos.length - 1
                                                return { ...prev, currentPhotoIndex: newIndex }
                                            })
                                        }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-20 transition-colors"
                                    >
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setPhotoViewer(prev => {
                                                if (!prev) return null
                                                const newIndex = (prev.currentPhotoIndex || 0) < prev.spool.photos.length - 1
                                                    ? (prev.currentPhotoIndex || 0) + 1
                                                    : 0
                                                return { ...prev, currentPhotoIndex: newIndex }
                                            })
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-20 transition-colors"
                                    >
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </>
                            )}

                            {/* Current Photo */}
                            {(photoViewer.spool.photos && photoViewer.spool.photos[(photoViewer.currentPhotoIndex || 0)]) ? (
                                <img
                                    src={photoViewer.spool.photos[(photoViewer.currentPhotoIndex || 0)].url}
                                    alt={`Levantamiento ${photoViewer.spool.spool_number}`}
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                />
                            ) : (
                                <img
                                    src={photoViewer.spool.levantamiento_photo_url}
                                    alt={`Levantamiento ${photoViewer.spool.spool_number}`}
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                />
                            )}

                            {/* Data overlay */}
                            <div className="absolute bottom-8 left-8 right-8 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 rounded-lg text-white backdrop-blur-sm pointer-events-none">
                                <div className="flex items-start justify-between">
                                    <div className="pointer-events-auto">
                                        <div className="text-2xl font-bold mb-2">{photoViewer.spool.spool_number}</div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                </svg>
                                                <span className="text-lg">{photoViewer.spool.levantamiento_location || 'Sin ubicación'}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-300">
                                                <div className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                    </svg>
                                                    {photoViewer.spool.photos
                                                        ? new Date(photoViewer.spool.photos[(photoViewer.currentPhotoIndex || 0)].created_at).toLocaleString('es-CL', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            hour12: true,
                                                            timeZone: 'America/Santiago'
                                                        })
                                                        : photoViewer.spool.levantamiento_date}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                    </svg>
                                                    {photoViewer.spool.levantamiento_user}
                                                </div>
                                            </div>
                                            {photoViewer.spool.levantamiento_notes && (
                                                <div className="mt-3 pt-3 border-t border-gray-600 text-gray-200 italic">
                                                    "{photoViewer.spool.levantamiento_notes}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right pointer-events-auto">
                                        <div className="text-sm text-gray-300 mb-1">Foto</div>
                                        <div className="text-3xl font-bold">
                                            {(photoViewer.currentPhotoIndex || 0) + 1}
                                            <span className="text-lg text-gray-400 font-normal"> / {photoViewer.spool.levantamiento_photos_count || 1}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}

import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '@/lib/supabase'
import PhotoEditorModal from './PhotoEditorModal'
import { useUIStore } from '@/store/ui-store'
import { useSyncStore } from '@/store/syncStore'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { compressImageForOffline } from '@/lib/imageCompression'
import SyncStatusBadge from '@/components/sync/SyncStatusBadge'
import { refreshPendingCount } from '@/lib/sync/SyncManager'
import { generateLevantamientoFileName, getLevantamientoNumber, generateRandomSuffix } from '@/lib/sync/levantamientoNaming'
import { db } from '@/lib/db'

interface LevantamientoModalProps {
    isOpen: boolean
    onClose: () => void
    spoolNumber: string
    isometricCode: string
    revisionCode: string
    revisionId: string
    projectId: string
    onUpdate: () => void
}

interface LevantamientoItem {
    id: string
    storage_location: string | null
    captured_at: string
    notes: string | null
    captured_by_user: {
        id: string
        email: string
        full_name: string | null
    }
    photos: Array<{
        id: string
        storage_url: string | null
        thumbnail_url?: string | null
        file_name: string
        description: string | null
    }>
}

export default function LevantamientoModal({
    isOpen,
    onClose,
    spoolNumber,
    isometricCode,
    revisionCode,
    revisionId,
    projectId,
    onUpdate
}: LevantamientoModalProps) {
    const [levantamientos, setLevantamientos] = useState<LevantamientoItem[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [storageLocation, setStorageLocation] = useState('')
    const [showCustomLocation, setShowCustomLocation] = useState(false)


    // Reactive locations from Dexie
    const projectLocations = useLiveQuery(
        () => db.projectLocations
            .where('project_id').equals(projectId || '')
            .filter(l => l.active)
            .toArray(),
        [projectId]
    ) ?? []

    const existingLocations = projectLocations
        .map(l => l.name)
        .sort((a, b) => a.localeCompare(b))
    const [notes, setNotes] = useState('')
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])

    // Editor state
    const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null)

    // Fullscreen photo viewer
    const [fullscreenPhoto, setFullscreenPhoto] = useState<{ url: string, lev: LevantamientoItem } | null>(null)

    // Global UI state
    const setFocusMode = useUIStore((state) => state.setFocusMode)
    const pendingCount = useSyncStore((state) => state.pendingCount)

    useEffect(() => {
        if (isOpen) {
            loadLevantamientos()
            setFocusMode(true)
        } else {
            setFocusMode(false)
        }

        return () => setFocusMode(false)
    }, [isOpen, spoolNumber, revisionId, setFocusMode])

    // Reload levantamientos when pending count changes (indicates sync completion)
    useEffect(() => {
        if (isOpen) {
            loadLevantamientos()
        }
    }, [pendingCount])



    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este levantamiento y todas sus fotos? Esta acción no se puede deshacer.')) {
            return
        }

        try {
            // Check if it's a local item
            const itemToDelete = levantamientos.find(l => l.id === id);
            const isLocalItem = (itemToDelete as any)?.isLocal;

            if (isLocalItem) {
                // --- OFFLINE/LOCAL DELETION ---
                const { db } = await import('@/lib/db')

                // 1. Delete associated photos from Dexie
                const photos = await db.photos.where('levantamiento_id').equals(id).toArray();
                await db.photos.bulkDelete(photos.map(p => p.id));

                // 2. Delete the levantamiento from Dexie
                await db.levantamientos.delete(id);

                // 3. Remove from pending actions if it exists
                // We need to find the action with payload.levantamientoId === id
                const pendingActions = await db.pendingActions
                    .where('type').equals('CREATE_LEVANTAMIENTO')
                    .toArray();

                const actionToDelete = pendingActions.find(a => a.payload?.levantamientoId === id);

                if (actionToDelete) {
                    await db.pendingActions.delete(actionToDelete.id);
                    await refreshPendingCount();
                }

                loadLevantamientos();
                alert('🗑️ Levantamiento local eliminado');
                return;
            }

            // --- ONLINE DELETION (For synced items) ---
            if (!isOnline) {
                alert('⚠️ No puedes eliminar levantamientos sincronizados mientras estás offline.');
                return;
            }

            const { data: { session } } = await supabase.auth.getSession()
            const response = await fetch(
                `/api/spools/${encodeURIComponent(spoolNumber)}/levantamientos/${id}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${session?.access_token}` }
                }
            )

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Error al eliminar')
            }

            // Reload list
            loadLevantamientos()
            // Optional: call onUpdate() if needed to refresh parent, but levantamientos are separate list.
        } catch (err: any) {
            console.error('Error deleting levantamiento:', err)
            alert(err.message || 'Error al eliminar el levantamiento')
        }
    }

    const isOnline = useNetworkStatus() // Auto-import needed? No, assuming hook usage. 
    // Wait, useNetworkStatus is not imported in the file. Will add import in next step or use verify.

    const loadLevantamientos = async () => {
        setLoadingHistory(true)
        try {
            // 1. Cargar datos remotos (si online)
            let remoteLevantamientos: LevantamientoItem[] = []
            if (isOnline) {
                const { data: { session } } = await supabase.auth.getSession()
                const response = await fetch(
                    `/api/spools/${encodeURIComponent(spoolNumber)}/levantamientos?revisionId=${revisionId}&projectId=${projectId}`,
                    { headers: { 'Authorization': `Bearer ${session?.access_token}` } }
                )
                if (response.ok) {
                    const data = await response.json()
                    remoteLevantamientos = data.levantamientos || []


                }

            }


            // 2. Cargar datos locales (offline/pendientes)


            // Get pending actions to determine status (Pending vs Error vs Local)
            const pendingActions = await db.pendingActions
                .where('project_id').equals(projectId || '') // Optimization if project_id available
                .filter(a => a.type === 'CREATE_LEVANTAMIENTO')
                .toArray();

            const pendingMap = new Map(pendingActions.map(a => [a.payload.levantamientoId, a]));

            const localLevs = await db.levantamientos
                .where({ spool_number: spoolNumber, project_id: projectId })
                .toArray()

            // Map local levs to UI format
            let currentUser = { id: 'offline', email: 'offline', full_name: 'Usuario Local' };
            try {
                // Try to get cached session first (works offline usually)
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    // Extract name specifically; prefer metadata name
                    const fullName = session.user.user_metadata?.full_name || 'Usuario';
                    currentUser = {
                        id: session.user.id,
                        email: session.user.email || 'unknown',
                        full_name: fullName
                    };
                }
            } catch (e) {
                console.warn('Auth check failed:', e);
            }

            const localLevsUI = await Promise.all(localLevs.map(async (l) => {
                const photos = await db.photos.where('levantamiento_id').equals(l.id).toArray()
                const pendingAction = pendingMap.get(l.id);

                let syncStatus: 'local' | 'pending' | 'error' = 'local';
                let errorMessage: string | undefined = undefined;

                if (pendingAction) {
                    if (pendingAction.status === 'ERROR') {
                        syncStatus = 'error';
                        errorMessage = pendingAction.error_message;
                    } else if (pendingAction.status === 'PENDING') {
                        syncStatus = 'pending';
                    }
                }

                // Determine effective user name
                // If it's my creation (offline user matched), use my current session name.
                // Otherwise fallback to what's stored or 'Usuario Local'.
                const isMyCreation = l.captured_by === currentUser.id || l.captured_by === 'offline-user';
                const displayUserName = isMyCreation
                    ? currentUser.full_name
                    : (l.captured_by === 'offline' ? 'Usuario Local' : 'Usuario Desconocido');

                return {
                    id: l.id,
                    storage_location: l.storage_location,
                    captured_at: l.captured_at,
                    notes: l.notes || null,
                    captured_by_user: {
                        id: l.captured_by || currentUser.id,
                        email: 'offline',
                        full_name: displayUserName
                    },
                    photos: photos.map(p => ({
                        id: p.id,
                        storage_url: URL.createObjectURL(p.thumbnail_blob), // Use thumbnail for grid display
                        preview_url: URL.createObjectURL(p.preview_blob),   // Use preview for full-screen viewer
                        file_name: p.file_name,
                        description: p.description
                    })),
                    isLocal: true, // Siempre true si viene de Dexie
                    syncStatus,    // Nuevo campo para badge
                    errorMessage   // Mensaje de error si existe
                } as LevantamientoItem & { isLocal?: boolean, syncStatus?: string, errorMessage?: string }
            }))

            // Merge: Deduplicate by ID
            // If an item exists in both (Synced), prefer Remote (better metadata like user info)
            // But keep Local if it's pending or not in remote yet
            const remoteIds = new Set(remoteLevantamientos.map(r => r.id))
            const uniqueLocal = localLevsUI.filter(l => !remoteIds.has(l.id))

            setLevantamientos([...uniqueLocal, ...remoteLevantamientos])

        } catch (err) {
            console.error('Error loading levantamientos:', err)
        } finally {
            setLoadingHistory(false)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        setSelectedFiles(prev => [...prev, ...files])

        // Generate previews
        files.forEach(file => {
            const reader = new FileReader()
            reader.onloadend = () => {
                setPreviews(prev => [...prev, reader.result as string])
            }
            reader.readAsDataURL(file)
        })
    }

    const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length > 0) {
            handleFileSelect(e)
        }
    }

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index))
        setPreviews(prev => prev.filter((_, i) => i !== index))
    }

    const handleSaveEditedPhoto = (newUrl: string) => {
        if (editingPhotoIndex !== null) {
            setPreviews(prev => {
                const newPreviews = [...prev]
                newPreviews[editingPhotoIndex] = newUrl
                return newPreviews
            })
            setEditingPhotoIndex(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!storageLocation.trim()) {
            setError('Debe indicar la ubicación de acopio')
            return
        }

        if (selectedFiles.length === 0) {
            setError('Debe seleccionar al menos una foto')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const finalLocation = storageLocation.trim().toUpperCase()
            // Auth session retrieval moved inside online/offline blocks or wrapped

            if (!isOnline) {
                // --- OFFLINE FLOW ---
                console.log('Modo Offline: Guardando levantamiento localmente...')
                const { db } = await import('@/lib/db')

                // Try to identify user safely from cache
                let userId = 'offline';
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user?.id) userId = session.user.id;
                } catch (e) { console.warn('Offline auth check failed', e) }

                const levantamientoId = crypto.randomUUID()
                const photoIds: string[] = []
                const originalFiles: File[] = [] // Keep originals for sync

                // 1. Guardar Fotos (Thumbnails + Previews para Offline, Originales para Sync)
                console.log('[Offline] Generando thumbnails y previews...')
                await Promise.all(selectedFiles.map(async (file) => {
                    const photoId = crypto.randomUUID()

                    // Compress image - generates both thumbnail and preview
                    const { thumbnailBlob, previewBlob, thumbnailRatio, previewRatio } = await compressImageForOffline(file)

                    console.log(`[Offline] ${file.name}:`)
                    console.log(`  • Thumbnail: ${thumbnailRatio.toFixed(1)}% reducción`)
                    console.log(`  • Preview: ${previewRatio.toFixed(1)}% reducción`)

                    // Store BOTH thumbnail and preview in Dexie
                    await db.photos.add({
                        id: photoId,
                        levantamiento_id: levantamientoId,
                        file_name: file.name,
                        thumbnail_blob: thumbnailBlob, // For grids/history
                        preview_blob: previewBlob,     // For full-screen viewer
                        synced: false,
                        created_at: new Date().toISOString()
                    })

                    photoIds.push(photoId)
                    originalFiles.push(file) // Keep original for sync
                }))

                // 2. Guardar Levantamiento
                await db.levantamientos.add({
                    id: levantamientoId,
                    spool_number: spoolNumber,
                    revision_id: revisionId,
                    project_id: projectId,
                    storage_location: finalLocation,
                    notes: notes.trim() || undefined,
                    captured_at: new Date().toISOString(),
                    captured_by: userId,
                    synced: false
                })

                // 3. Cola de pendientes (con imágenes ORIGINALES para calidad HD en sync)
                // Store original files as Blobs in pending action for upload
                const originalPhotoBlobs = await Promise.all(originalFiles.map(async (file) => {
                    return new Promise<{ fileName: string, blob: Blob }>((resolve) => {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                            // Convert back to Blob for storage
                            fetch(reader.result as string)
                                .then(res => res.blob())
                                .then(blob => resolve({ fileName: file.name, blob }))
                        }
                        reader.readAsDataURL(file)
                    })
                }))

                // Use isometric code from prop or fallback to spool extraction
                const finalIsometricCode = isometricCode || spoolNumber.split('-').slice(0, -1).join('-') || spoolNumber;
                const spoolCode = spoolNumber.split('-').pop() || spoolNumber;
                // For revision code, we'll use a simple fallback since we only have revisionId (UUID)
                const revisionCode = 'Rev1'; // TODO: Get actual revision code from revision data if available

                await db.pendingActions.add({
                    id: crypto.randomUUID(),
                    type: 'CREATE_LEVANTAMIENTO',
                    project_id: projectId,
                    payload: {
                        levantamientoId,
                        spoolNumber,
                        revisionId,
                        storageLocation: finalLocation,
                        notes: notes.trim() || null,
                        photoIds: photoIds, // IDs to fetch optimized photos from Dexie during sync
                        isometricCode: finalIsometricCode, // For safe filename generation
                        spoolCode, // Spool code (last part)
                        levNum: await getLevantamientoNumber(spoolNumber, projectId, db),
                        randomSuffix: generateRandomSuffix(),
                        revisionCode // For safe filename generation
                    },
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    retry_count: 0
                })

                // Update pending count in NetworkStatusBar
                await refreshPendingCount()

                alert('💾 Levantamiento guardado localmente (se subirá al conectar)')

            } else {
                // --- ONLINE FLOW (NOW UNIFIED WITH OFFLINE) ---
                const { data: { session } } = await supabase.auth.getSession()

                // Extract isometric code and revision code for naming
                const finalIsometricCode = isometricCode || spoolNumber.split('-').slice(0, -1).join('-') || spoolNumber;

                // Get naming parameters
                const levNum = await getLevantamientoNumber(spoolNumber, projectId, db);
                const randomSuffix = generateRandomSuffix();
                const spoolCode = spoolNumber.split('-').pop() || spoolNumber;

                // Helper: Generate safe filename using centralized logic
                const generateSafeFileName = (index: number): string => {
                    return generateLevantamientoFileName({
                        isometricCode: finalIsometricCode,
                        revisionCode,
                        spoolCode,
                        levNum,
                        photoIndex: index,
                        randomSuffix
                    });
                };

                // Compress images and generate safe names
                const photoPromises = selectedFiles.map(async (file, index) => {
                    // Compress to preview quality + thumbnail
                    const { previewBlob, thumbnailBlob } = await compressImageForOffline(file);

                    // Helper to convert blob to base64
                    const blobToBase64 = (blob: Blob): Promise<string> => {
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                    };

                    const fileData = await blobToBase64(previewBlob);
                    const thumbnailData = thumbnailBlob ? await blobToBase64(thumbnailBlob) : undefined;

                    // Generate safe filename
                    const safeFileName = generateSafeFileName(index);
                    console.log(`[Online Upload] Compressed: ${file.name} → ${safeFileName} (${(previewBlob.size / 1024).toFixed(0)}KB)`);

                    return {
                        fileName: safeFileName,
                        fileData: fileData,
                        thumbnailData: thumbnailData,
                        fileSize: previewBlob.size,
                        mimeType: 'image/jpeg',
                        description: null
                    };
                });

                const photos = await Promise.all(photoPromises)

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
                            projectId,
                            storageLocation: finalLocation,
                            notes: notes.trim() || null,
                            photos
                        })
                    }
                )

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Error al crear levantamiento')
                }
            }

            // Reset form
            setStorageLocation('')
            setShowCustomLocation(false)
            setNotes('')
            setSelectedFiles([])
            setPreviews([])

            // Reload levantamientos
            await loadLevantamientos()
            onUpdate()
            onClose() // Close modal
        } catch (err: any) {
            console.error('Error creating levantamiento:', err)
            setError(err.message || 'Error al crear levantamiento')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Santiago'
        })
    }

    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[100] sm:p-4">
                <div className="bg-white w-full h-full sm:h-auto rounded-none sm:rounded-xl shadow-2xl sm:max-w-3xl sm:max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-t-xl">
                        <h2 className="text-2xl font-bold text-white">📷 Levantamiento Fotográfico</h2>
                        <p className="text-purple-100 mt-1">Spool: <span className="font-semibold">{spoolNumber}</span></p>
                    </div>

                    {/* Main Content (Scrollable) */}
                    <div className="flex-1 overflow-y-auto">
                        {/* History Timeline */}
                        <div className="border-b border-gray-200 bg-gray-50 p-6">
                            <h3 className="text-sm font-bold text-gray-700 mb-4">Historial de Levantamientos</h3>

                            {loadingHistory ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                                </div>
                            ) : levantamientos.length === 0 ? (
                                <div className="text-center py-6 text-sm text-gray-500">
                                    No hay levantamientos registrados aún
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {levantamientos.map((lev) => (
                                        <div key={lev.id} className="bg-white rounded-lg border border-gray-200 p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="font-medium text-gray-900">{lev.storage_location || 'Sin ubicación'}</div>
                                                        <SyncStatusBadge
                                                            status={(lev as any).syncStatus || ((lev as any).isLocal ? 'local' : 'synced')}
                                                            size="sm"
                                                            showLabel={false}
                                                            errorMessage={(lev as any).errorMessage}
                                                        />
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">{formatDate(lev.captured_at)}</div>
                                                    <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                        </svg>
                                                        {lev.captured_by_user.full_name || lev.captured_by_user.email}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium px-2 py-1 rounded bg-purple-100 text-purple-700">
                                                        {lev.photos.length} {lev.photos.length === 1 ? 'foto' : 'fotos'}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDelete(lev.id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                        title="Eliminar levantamiento"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            {lev.notes && (
                                                <p className="text-sm text-gray-700 mb-3 italic">"{lev.notes}"</p>
                                            )}

                                            {/* Photo thumbnails */}
                                            <div className={`grid gap-2 ${lev.photos.length === 1 ? 'grid-cols-1 max-w-[50%]' :
                                                lev.photos.length === 2 ? 'grid-cols-2' :
                                                    lev.photos.length === 3 ? 'grid-cols-3' :
                                                        'grid-cols-4'
                                                }`}>
                                                {lev.photos.map((photo) => (
                                                    <div
                                                        key={photo.id}
                                                        onClick={() => setFullscreenPhoto({ url: photo.storage_url!, lev })}
                                                        className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                                                    >
                                                        {photo.storage_url ? (
                                                            <img
                                                                src={photo.thumbnail_url || photo.storage_url}
                                                                alt={photo.file_name}
                                                                loading="lazy"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                                <span className="text-gray-400 text-xs">No disponible</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* New Levantamiento Form */}
                        <form id="levantamiento-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                            <h3 className="text-sm font-bold text-gray-700">Nuevo Levantamiento</h3>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Ubicación de Acopio *
                                </label>

                                <div className="space-y-2">
                                    <select
                                        value={storageLocation}
                                        onChange={(e) => setStorageLocation(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                                        required
                                    >
                                        <option value="">Seleccionar ubicación...</option>
                                        {existingLocations.map((loc, idx) => (
                                            <option key={idx} value={loc}>{loc}</option>
                                        ))}
                                    </select>
                                    {existingLocations.length === 0 && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            No hay ubicaciones configuradas para este proyecto. Contacta al administrador.
                                        </p>
                                    )}
                                </div>

                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Observaciones
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Notas adicionales sobre el levantamiento..."
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fotografías *
                                </label>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Camera capture button */}
                                    <div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleCameraCapture}
                                            className="hidden"
                                            id="camera-capture"
                                        />
                                        <label
                                            htmlFor="camera-capture"
                                            className="block w-full py-3 px-4 bg-purple-600 text-white rounded-lg text-center cursor-pointer hover:bg-purple-700 transition-colors font-medium"
                                        >
                                            📸 Tomar Foto
                                        </label>
                                    </div>

                                    {/* Gallery select button */}
                                    <div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            id="photo-upload"
                                        />
                                        <label
                                            htmlFor="photo-upload"
                                            className="block w-full py-3 px-4 border-2 border-purple-600 text-purple-600 rounded-lg text-center cursor-pointer hover:bg-purple-50 transition-colors font-medium"
                                        >
                                            🖼️ Galería
                                        </label>
                                    </div>
                                </div>

                                {/* Preview selected photos */}
                                {previews.length > 0 && (
                                    <div className="mt-3 grid grid-cols-4 gap-2">
                                        {previews.map((preview, index) => (
                                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden group border border-gray-200 shadow-sm">
                                                <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />

                                                {/* Edit Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingPhotoIndex(index)}
                                                    className="absolute top-1 left-1 bg-yellow-400 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity z-10 shadow-md"
                                                    title="Editar / Rayar"
                                                >
                                                    <svg className="w-4 h-4 text-yellow-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity z-10 shadow-md"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </form>
                    </div>

                    {/* Footer Actions - Fixed */}
                    <div className="p-4 bg-white border-t border-gray-200 flex gap-3 shrink-0 z-10 pb-safe">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="levantamiento-form"
                            disabled={loading || selectedFiles.length === 0 || !storageLocation.trim()}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>📷 Guardar Levantamiento</>
                            )}
                        </button>
                    </div>
                </div>
            </div >

            {/* Photo Editor Modal */}
            < PhotoEditorModal
                isOpen={editingPhotoIndex !== null
                }
                onClose={() => setEditingPhotoIndex(null)}
                imageUrl={editingPhotoIndex !== null ? previews[editingPhotoIndex] : ''}
                onSave={handleSaveEditedPhoto}
            />

            {/* Fullscreen Photo Viewer */}
            {
                fullscreenPhoto && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60]"
                        onClick={() => setFullscreenPhoto(null)}
                    >
                        <button
                            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
                            onClick={() => setFullscreenPhoto(null)}
                        >
                            ×
                        </button>

                        <div className="relative max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center p-8">
                            <img
                                src={fullscreenPhoto.url}
                                alt="Fullscreen"
                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            />

                            {/* Data overlay */}
                            <div className="absolute bottom-8 left-8 right-8 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-lg text-white">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-xl font-bold">{fullscreenPhoto.lev.storage_location || 'Sin ubicación'}</div>
                                        <div className="text-sm text-gray-300 mt-1">{formatDate(fullscreenPhoto.lev.captured_at)}</div>
                                        <div className="text-sm text-gray-300 mt-1">
                                            Por: {fullscreenPhoto.lev.captured_by_user.full_name || fullscreenPhoto.lev.captured_by_user.email}
                                        </div>
                                        {fullscreenPhoto.lev.notes && (
                                            <div className="text-sm text-gray-200 mt-3 italic">"{fullscreenPhoto.lev.notes}"</div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-300">{fullscreenPhoto.lev.photos.length} fotos</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    )
}

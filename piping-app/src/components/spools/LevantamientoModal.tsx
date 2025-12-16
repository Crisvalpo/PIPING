import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PhotoEditorModal from './PhotoEditorModal'
import { useUIStore } from '@/store/ui-store'

interface LevantamientoModalProps {
    isOpen: boolean
    onClose: () => void
    spoolNumber: string
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
        file_name: string
        description: string | null
    }>
}

export default function LevantamientoModal({
    isOpen,
    onClose,
    spoolNumber,
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
    const [existingLocations, setExistingLocations] = useState<string[]>([])
    const [notes, setNotes] = useState('')
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])

    // Editor state
    const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null)

    // Fullscreen photo viewer
    const [fullscreenPhoto, setFullscreenPhoto] = useState<{ url: string, lev: LevantamientoItem } | null>(null)

    // Global UI state
    const setFocusMode = useUIStore((state) => state.setFocusMode)

    useEffect(() => {
        if (isOpen) {
            loadLevantamientos()
            setFocusMode(true)
        } else {
            setFocusMode(false)
        }

        return () => setFocusMode(false)
    }, [isOpen, spoolNumber, revisionId, setFocusMode])

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este levantamiento y todas sus fotos? Esta acción no se puede deshacer.')) {
            return
        }

        try {
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

    const loadLevantamientos = async () => {
        setLoadingHistory(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const response = await fetch(
                `/api/spools/${encodeURIComponent(spoolNumber)}/levantamientos?revisionId=${revisionId}&projectId=${projectId}`,
                { headers: { 'Authorization': `Bearer ${session?.access_token}` } }
            )

            if (response.ok) {
                const data = await response.json()
                setLevantamientos(data.levantamientos || [])

                // Use locations from API (project-wide) or extract from current history fallback
                let locations = data.uniqueLocations || []

                if (locations.length === 0 && data.levantamientos) {
                    // Fallback to local history extraction if API didn't return any (e.g. backward compat)
                    const localLocations = data.levantamientos
                        .map((lev: LevantamientoItem) => lev.storage_location)
                        .filter((loc: string | null) => loc && loc.trim() !== '')
                    locations = Array.from(new Set(localLocations))
                }

                setExistingLocations(locations as string[])
            }
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
            const { data: { session } } = await supabase.auth.getSession()

            // Convert files to base64
            const photoPromises = selectedFiles.map(async (file, index) => {
                const base64 = previews[index]
                return {
                    fileName: file.name,
                    fileData: base64,
                    fileSize: file.size,
                    mimeType: file.type,
                    description: null
                }
            })

            const photos = await Promise.all(photoPromises)

            // Convert location to uppercase
            const finalLocation = storageLocation.trim().toUpperCase()

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

            // Reset form
            setStorageLocation('')
            setShowCustomLocation(false)
            setNotes('')
            setSelectedFiles([])
            setPreviews([])

            // Reload levantamientos
            await loadLevantamientos()
            onUpdate()
            onClose() // Close modal after successful save
        } catch (err: any) {
            console.error('Error creating levantamiento:', err)
            setError(err.message || 'Error al crear levantamiento')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
                                                <div>
                                                    <div className="font-medium text-gray-900">{lev.storage_location || 'Sin ubicación'}</div>
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
                                            <div className="grid grid-cols-4 gap-2">
                                                {lev.photos.map((photo) => (
                                                    <div
                                                        key={photo.id}
                                                        onClick={() => setFullscreenPhoto({ url: photo.storage_url!, lev })}
                                                        className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                                                    >
                                                        {photo.storage_url ? (
                                                            <img
                                                                src={photo.storage_url}
                                                                alt={photo.file_name}
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

                                {!showCustomLocation ? (
                                    <div className="space-y-2">
                                        <select
                                            value={storageLocation}
                                            onChange={(e) => {
                                                if (e.target.value === '__CUSTOM__') {
                                                    setShowCustomLocation(true)
                                                    setStorageLocation('')
                                                } else {
                                                    setStorageLocation(e.target.value)
                                                }
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                                        >
                                            <option value="">Seleccionar ubicación...</option>
                                            {existingLocations.map((loc, idx) => (
                                                <option key={idx} value={loc}>{loc}</option>
                                            ))}
                                            <option value="__CUSTOM__">+ Nueva ubicación...</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={storageLocation}
                                            onChange={(e) => setStorageLocation(e.target.value.toUpperCase())}
                                            placeholder="Ej: ACOPIO PRINCIPAL - ZONA A"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 uppercase text-gray-900 placeholder-gray-500"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowCustomLocation(false)
                                                setStorageLocation('')
                                            }}
                                            className="text-sm text-gray-600 hover:text-gray-800 underline"
                                        >
                                            ← Volver a seleccionar
                                        </button>
                                    </div>
                                )}
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

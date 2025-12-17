interface Location {
    id: string
    project_id: string
    name: string
    code: string | null
    type: string
    description: string | null
    parent_location_id: string | null
    capacity: number | null
    gps_coords: { lat: number; lng: number } | null
    is_active: boolean
    created_at: string
    updated_at: string
}

interface LocationCardProps {
    location: Location
    onEdit?: (location: Location) => void
    onDelete?: (locationId: string) => void
}

export default function LocationCard({ location, onEdit, onDelete }: LocationCardProps) {
    const typeIcons: Record<string, string> = {
        workshop: '🏭',
        storage: '📦',
        field: '🔧',
        transit: '🚛',
        installed: '✅',
        other: '📍'
    }

    const typeColors: Record<string, string> = {
        workshop: 'bg-purple-50 border-purple-200 text-purple-700',
        storage: 'bg-blue-50 border-blue-200 text-blue-700',
        field: 'bg-green-50 border-green-200 text-green-700',
        transit: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        installed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        other: 'bg-gray-50 border-gray-200 text-gray-700'
    }

    return (
        <div className={`rounded-lg border-2 p-4 transition-all hover:shadow-md ${location.is_active
                ? typeColors[location.type] || typeColors.other
                : 'bg-gray-50 border-gray-300 text-gray-500 opacity-60'
            }`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{typeIcons[location.type] || '📍'}</span>
                    <div>
                        <h4 className="font-bold text-lg">{location.name}</h4>
                        {location.code && (
                            <span className="text-xs font-mono opacity-75">
                                {location.code}
                            </span>
                        )}
                    </div>
                </div>

                {!location.is_active && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded font-medium">
                        Inactiva
                    </span>
                )}
            </div>

            {/* Description */}
            {location.description && (
                <p className="text-sm mb-3 line-clamp-2">
                    {location.description}
                </p>
            )}

            {/* Metadata */}
            <div className="space-y-1 text-xs">
                {location.capacity && (
                    <div className="flex items-center gap-1">
                        <span className="opacity-75">Capacidad:</span>
                        <span className="font-semibold">{location.capacity} spools</span>
                    </div>
                )}

                {location.gps_coords && (
                    <div className="flex items-center gap-1">
                        <span className="opacity-75">📍 GPS:</span>
                        <span className="font-mono text-xs">
                            {location.gps_coords.lat.toFixed(4)}, {location.gps_coords.lng.toFixed(4)}
                        </span>
                    </div>
                )}
            </div>

            {/* Actions */}
            {(onEdit || onDelete) && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-current border-opacity-20">
                    {onEdit && (
                        <button
                            onClick={() => onEdit(location)}
                            className="flex-1 px-3 py-1.5 text-sm font-medium rounded hover:bg-black hover:bg-opacity-5 transition-colors"
                        >
                            ✏️ Editar
                        </button>
                    )}
                    {onDelete && location.is_active && (
                        <button
                            onClick={() => onDelete(location.id)}
                            className="flex-1 px-3 py-1.5 text-sm font-medium rounded hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                            🗑️ Desactivar
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

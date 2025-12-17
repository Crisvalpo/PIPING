interface Location {
    id: string
    name: string
    code: string | null
    type: string
    is_active: boolean
}

interface LocationBadgeProps {
    location?: Location | null
    size?: 'sm' | 'md' | 'lg'
    showIcon?: boolean
    showCode?: boolean
}

export default function LocationBadge({
    location,
    size = 'md',
    showIcon = true,
    showCode = false
}: LocationBadgeProps) {
    if (!location) {
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-500 ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
                }`}>
                Sin ubicación
            </span>
        )
    }

    const typeIcons: Record<string, string> = {
        workshop: '🏭',
        storage: '📦',
        field: '🔧',
        transit: '🚛',
        installed: '✅',
        other: '📍'
    }

    const typeColors: Record<string, string> = {
        workshop: 'bg-purple-100 text-purple-700 border-purple-200',
        storage: 'bg-blue-100 text-blue-700 border-blue-200',
        field: 'bg-green-100 text-green-700 border-green-200',
        transit: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        installed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        other: 'bg-gray-100 text-gray-700 border-gray-200'
    }

    const colorClass = location.is_active
        ? typeColors[location.type] || typeColors.other
        : 'bg-gray-100 text-gray-500 border-gray-300'

    const sizeClasses = {
        sm: 'text-xs px-1.5 py-0.5',
        md: 'text-sm px-2 py-1',
        lg: 'text-base px-3 py-1.5'
    }

    return (
        <span
            className={`inline-flex items-center gap-1 rounded border font-medium ${colorClass} ${sizeClasses[size]}`}
            title={location.is_active ? undefined : 'Ubicación inactiva'}
        >
            {showIcon && <span>{typeIcons[location.type] || '📍'}</span>}
            <span>{location.name}</span>
            {showCode && location.code && (
                <span className="font-mono opacity-75">({location.code})</span>
            )}
            {!location.is_active && <span className="opacity-60">⚠️</span>}
        </span>
    )
}

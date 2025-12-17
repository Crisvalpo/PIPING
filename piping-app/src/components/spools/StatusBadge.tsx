interface Status {
    id: string
    name: string
    code: string | null
    color: string
    icon: string | null
    is_active: boolean
}

interface StatusBadgeProps {
    status?: Status | null
    size?: 'sm' | 'md' | 'lg'
    showIcon?: boolean
    showCode?: boolean
}

export default function StatusBadge({
    status,
    size = 'md',
    showIcon = true,
    showCode = false
}: StatusBadgeProps) {
    if (!status) {
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-500 ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
                }`}>
                Sin estado
            </span>
        )
    }

    const sizeClasses = {
        sm: 'text-xs px-1.5 py-0.5',
        md: 'text-sm px-2 py-1',
        lg: 'text-base px-3 py-1.5'
    }

    const opacity = status.is_active ? '100' : '60'

    return (
        <span
            className={`inline-flex items-center gap-1 rounded font-medium ${sizeClasses[size]}`}
            style={{
                backgroundColor: `${status.color}20`,
                color: status.color,
                borderColor: status.color,
                borderWidth: '1px',
                opacity: status.is_active ? 1 : 0.6
            }}
            title={status.is_active ? undefined : 'Estado inactivo'}
        >
            {showIcon && status.icon && <span>{status.icon}</span>}
            <span>{status.name}</span>
            {showCode && status.code && (
                <span className="font-mono opacity-75">({status.code})</span>
            )}
            {!status.is_active && <span className="opacity-60">⚠️</span>}
        </span>
    )
}

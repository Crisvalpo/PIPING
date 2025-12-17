interface Status {
    id: string
    name: string
    code: string | null
    description: string | null
    color: string
    icon: string | null
    order_index: number
    is_initial: boolean
    is_final: boolean
    requires_photo: boolean
    is_active: boolean
}

interface StatusCardProps {
    status: Status
    onEdit?: (status: Status) => void
    onDelete?: (statusId: string) => void
}

export default function StatusCard({ status, onEdit, onDelete }: StatusCardProps) {
    return (
        <div
            className={`rounded-lg border-2 p-5 transition-all duration-200 hover:scale-105 ${status.is_active
                    ? 'bg-white shadow-md hover:shadow-xl'
                    : 'bg-gray-100 opacity-60'
                }`}
            style={{
                borderColor: status.is_active ? status.color : '#D1D5DB'
            }}
        >
            {/* Header with icon, name, code */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                    {status.icon && (
                        <span className="text-3xl">{status.icon}</span>
                    )}
                    <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                            {status.name}
                            {status.code && (
                                <span
                                    className="px-2 py-0.5 text-xs font-mono rounded"
                                    style={{
                                        backgroundColor: `${status.color}20`,
                                        color: status.color
                                    }}
                                >
                                    {status.code}
                                </span>
                            )}
                        </h4>
                        <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-gray-600">
                                Orden: {status.order_index}
                            </span>
                        </div>
                    </div>
                </div>

                {!status.is_active && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded font-medium">
                        Inactivo
                    </span>
                )}
            </div>

            {/* Color preview */}
            <div className="mb-3">
                <div className="flex items-center gap-2">
                    <div
                        className="w-full h-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                    ></div>
                    <span className="text-xs font-mono text-gray-500">{status.color}</span>
                </div>
            </div>

            {/* Description */}
            {status.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {status.description}
                </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                {status.is_initial && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        🚀 Inicial
                    </span>
                )}
                {status.is_final && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        ✅ Final
                    </span>
                )}
                {status.requires_photo && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                        📸 Requiere foto
                    </span>
                )}
            </div>

            {/* Actions */}
            {(onEdit || onDelete) && status.is_active && (
                <div className="flex gap-2 pt-3 border-t">
                    {onEdit && (
                        <button
                            onClick={() => onEdit(status)}
                            className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={() => onDelete(status.id)}
                            className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Desactivar
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

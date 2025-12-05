import { Impacto } from '@/types/impacts'

interface ImpactCardProps {
    impact: Impacto
    onApprove?: (id: string) => void
    onReject?: (id: string) => void
}

export default function ImpactCard({ impact, onApprove, onReject }: ImpactCardProps) {
    const getBadgeColor = (type: string) => {
        switch (type) {
            case 'NEW': return 'bg-green-500/20 text-green-300 border-green-500/50'
            case 'DELETE': return 'bg-red-500/20 text-red-300 border-red-500/50'
            case 'MODIFY': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
            default: return 'bg-gray-500/20 text-gray-300'
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'NEW': return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            )
            case 'DELETE': return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            )
            case 'MODIFY': return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            )
            default: return null
        }
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3 hover:bg-white/10 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg border ${getBadgeColor(impact.change_type)}`}>
                        {getIcon(impact.change_type)}
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{impact.entity_type}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-white font-mono bg-black/30 px-2 py-0.5 rounded text-sm">
                                {impact.entity_identifier}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                            {impact.change_type === 'NEW' && 'Elemento agregado en esta revisión'}
                            {impact.change_type === 'DELETE' && 'Elemento eliminado en esta revisión'}
                            {impact.change_type === 'MODIFY' && 'Propiedades modificadas'}
                        </p>

                        {/* Detalles de Cambios (Solo MODIFY) */}
                        {impact.change_type === 'MODIFY' && impact.changes_json?.changes && (
                            <div className="mt-2 space-y-1">
                                {impact.changes_json.changes.map((change: any, idx: number) => (
                                    <div key={idx} className="text-xs flex items-center space-x-2 bg-black/20 p-1.5 rounded">
                                        <span className="text-purple-300 font-semibold uppercase">{change.field}:</span>
                                        <span className="text-red-300 line-through">{change.old}</span>
                                        <span className="text-gray-500">→</span>
                                        <span className="text-green-300">{change.new}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${impact.status === 'PENDIENTE' ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' :
                            impact.status === 'APROBADO' ? 'border-green-500/50 text-green-500 bg-green-500/10' :
                                'border-red-500/50 text-red-500 bg-red-500/10'
                        }`}>
                        {impact.status}
                    </div>

                    {impact.status === 'PENDIENTE' && onApprove && onReject && (
                        <div className="flex items-center gap-2 mt-1">
                            <button
                                onClick={() => onApprove(impact.id)}
                                className="p-1 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                                title="Aprobar"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onReject(impact.id)}
                                className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                title="Rechazar"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import type { PendingAction } from '@/lib/db';
import { syncManager } from '@/lib/sync/SyncManager';
import { resetRetryCount, formatTimeUntilRetry } from '@/lib/sync/RetryQueue';
import { X, RefreshCw, Trash2, Image, Hammer, AlertCircle, Clock } from 'lucide-react';

interface PendingChangesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ACTION_LABELS = {
    'EXECUTE_WELD': { label: 'Ejecución de Soldadura', icon: Hammer, color: 'blue' },
    'CREATE_LEVANTAMIENTO': { label: 'Levantamiento Fotográfico', icon: Image, color: 'purple' },
    'WELD_REWORK': { label: 'Reporte de Rework', icon: AlertCircle, color: 'amber' },
};

export default function PendingChangesModal({ isOpen, onClose }: PendingChangesModalProps) {
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            loadPendingActions();
        }
    }, [isOpen]);

    const loadPendingActions = async () => {
        setLoading(true);
        try {
            const actions = await db.pendingActions
                .where('status')
                .equals('PENDING')
                .or('status')
                .equals('ERROR')
                .toArray();

            setPendingActions(actions.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ));
        } catch (error) {
            console.error('Error loading pending actions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async (actionId: string) => {
        setRetryingIds(prev => new Set(prev).add(actionId));
        try {
            // Reset retry count for clean retry
            await resetRetryCount(actionId);
            // Trigger a full pending actions process
            await syncManager.processPendingActions();
            // Reload the list
            await loadPendingActions();
        } catch (error) {
            console.error('Error retrying action:', error);
        } finally {
            setRetryingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(actionId);
                return newSet;
            });
        }
    };

    const handleDiscard = async (actionId: string) => {
        if (!confirm('¿Estás seguro de descartar este cambio? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await db.pendingActions.delete(actionId);
            await loadPendingActions();
        } catch (error) {
            console.error('Error discarding action:', error);
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Hace un momento';
        if (minutes < 60) return `Hace ${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours}h`;
        const days = Math.floor(hours / 24);
        return `Hace ${days}d`;
    };

    const getActionSize = (action: PendingAction): string => {
        if (action.type === 'CREATE_LEVANTAMIENTO') {
            const photoCount = action.payload.originalPhotos?.length || 0;
            const estimatedSize = photoCount * 2; // ~2 MB per photo
            return `${photoCount} fotos (~${estimatedSize} MB)`;
        }
        return '< 1 KB';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-xl flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">📋 Cambios Pendientes</h2>
                        <p className="text-indigo-100 text-sm mt-1">
                            {pendingActions.length} {pendingActions.length === 1 ? 'acción' : 'acciones'} esperando sincronización
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : pendingActions.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">✅</div>
                            <p className="text-gray-600 text-lg font-medium">
                                No hay cambios pendientes
                            </p>
                            <p className="text-gray-500 text-sm mt-2">
                                Todos tus datos están sincronizados
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingActions.map((action) => {
                                const config = ACTION_LABELS[action.type as keyof typeof ACTION_LABELS] || {
                                    label: action.type,
                                    icon: AlertCircle,
                                    color: 'gray'
                                };
                                const Icon = config.icon;
                                const isRetrying = retryingIds.has(action.id);

                                return (
                                    <div
                                        key={action.id}
                                        className={`
                                            border rounded-lg p-4 hover:shadow-md transition-shadow
                                            ${action.status === 'ERROR' ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}
                                        `}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Icon */}
                                            <div className={`
                                                p-2 rounded-lg flex-shrink-0
                                                ${action.status === 'ERROR' ? 'bg-red-100' : `bg-${config.color}-100`}
                                            `}>
                                                <Icon className={`
                                                    w-5 h-5
                                                    ${action.status === 'ERROR' ? 'text-red-600' : `text-${config.color}-600`}
                                                `} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">
                                                            {config.label}
                                                        </h3>
                                                        <p className="text-sm text-gray-600 mt-0.5">
                                                            {action.type === 'EXECUTE_WELD' && (
                                                                <>Soldadura: {action.payload.weldNumber}</>
                                                            )}
                                                            {action.type === 'CREATE_LEVANTAMIENTO' && (
                                                                <>Spool: {action.payload.spoolNumber} • {action.payload.storageLocation}</>
                                                            )}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                                            <span>{formatTimestamp(action.created_at)}</span>
                                                            <span>•</span>
                                                            <span>{getActionSize(action)}</span>
                                                        </div>
                                                        {action.status === 'ERROR' && action.error_message && (
                                                            <div className="mt-2 space-y-1">
                                                                <div className="text-xs text-red-700 bg-red-100 rounded px-2 py-1">
                                                                    ⚠️ {action.error_message}
                                                                </div>
                                                                {action.next_retry_at && (
                                                                    <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        <span>
                                                                            Próximo intento: {formatTimeUntilRetry(action.next_retry_at)}
                                                                            {action.retry_count > 0 && ` (Intento ${action.retry_count + 1}/5)`}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleRetry(action.id)}
                                                            disabled={isRetrying}
                                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                                            title="Reintentar"
                                                        >
                                                            <RefreshCw className={`w-4 h-4 text-blue-600 ${isRetrying ? 'animate-spin' : ''}`} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDiscard(action.id)}
                                                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                                            title="Descartar"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {pendingActions.length > 0 && (
                    <div className="border-t bg-gray-50 px-6 py-4 rounded-b-xl">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

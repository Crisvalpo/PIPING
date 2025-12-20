'use client';

import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSyncStore } from '@/store/syncStore';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CloudUpload, CheckCircle } from 'lucide-react';
import { syncManager } from '@/lib/sync/SyncManager';
import PendingChangesModal from '@/components/sync/PendingChangesModal';

interface NetworkStatusBarProps {
    projectId?: string; // Optional: pass directly, otherwise extract from URL
}

export default function NetworkStatusBar({ projectId: propProjectId }: NetworkStatusBarProps = {}) {
    const [hasMounted, setHasMounted] = useState(false);
    const [isManuallySyncing, setIsManuallySyncing] = useState(false);
    const [showPendingModal, setShowPendingModal] = useState(false);
    const isOnline = useNetworkStatus();
    const {
        isSyncing,
        pendingCount,
        syncError,
        syncProgress,
        lastSyncTime,
        conflictCount
    } = useSyncStore();

    useEffect(() => {
        setHasMounted(true);
    }, []);

    // Avoid hydration mismatch by not rendering until mounted on client
    if (!hasMounted) {
        return null;
    }

    const handleManualSync = async () => {
        setIsManuallySyncing(true);
        try {
            // Use provided projectId or extract from URL
            let projectId = propProjectId || window.location.pathname.match(/proyectos\/([^/]+)/)?.[1];

            // If not found in URL and we're in dashboard/master-views, try to get from localStorage
            if (!projectId && window.location.pathname.includes('/dashboard')) {
                // Try to get from user's active project in localStorage
                const userData = localStorage.getItem('userProject');
                if (userData) {
                    try {
                        const parsed = JSON.parse(userData);
                        projectId = parsed?.id;
                    } catch (e) {
                        console.warn('[NetworkStatusBar] Could not parse userProject from localStorage');
                    }
                }
            }

            if (projectId && isOnline) {
                console.log('[NetworkStatusBar] Starting manual sync for project:', projectId);
                // Use the same sync logic as MasterViewsManager:
                // 1. Upload pending changes first
                await syncManager.processPendingActions();
                // 2. Download latest data (isométricos, spools, welds, levantamientos)
                await syncManager.syncProject(projectId);

                // 3. Optionally sync new modules if they've been implemented
                // Note: Only run if the tables exist and backend is ready
                try {
                    await syncManager.syncPersonal(projectId);
                    await syncManager.syncCuadrillas(projectId);
                    await syncManager.syncProjectConfig(projectId);
                } catch (err) {
                    // Silently fail if new modules aren't ready yet
                    console.log('[NetworkStatusBar] New modules not yet available:', err);
                }
                console.log('[NetworkStatusBar] Sync completed successfully');
            } else {
                console.warn('[NetworkStatusBar] Cannot sync: projectId =', projectId, ', isOnline =', isOnline);
            }
        } catch (error) {
            console.error('Error al sincronizar manualmente:', error);
        } finally {
            setIsManuallySyncing(false);
        }
    };

    const formatLastSync = (date: Date | null) => {
        if (!date) return 'Nunca';
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Hace un momento';
        if (minutes < 60) return `Hace ${minutes}m`;
        const hours = Math.floor(minutes / 60);
        return `Hace ${hours}h`;
    };

    // Offline state
    if (!isOnline) {
        return (
            <>
                <div className="bg-red-500 text-white px-4 py-2 text-sm font-medium flex items-center justify-between shadow-sm z-50">
                    <div className="flex items-center gap-2">
                        <WifiOff className="w-4 h-4" />
                        <span>Sin conexión a internet - Modo offline</span>
                    </div>
                    {pendingCount > 0 && (
                        <button
                            onClick={() => setShowPendingModal(true)}
                            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs transition-colors"
                        >
                            <CloudUpload className="w-3 h-3" />
                            <span>{pendingCount} cambios pendientes</span>
                        </button>
                    )}
                </div>
                {/* Pending Changes Modal - Rendered here for Offline state catch */}
                <PendingChangesModal
                    isOpen={showPendingModal}
                    onClose={() => setShowPendingModal(false)}
                />
            </>
        );
    }

    // Error state
    if (syncError) {
        return (
            <div className="bg-amber-100 text-amber-800 px-4 py-2 text-sm font-medium flex items-center justify-between border-b border-amber-200 z-50">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Error de sincronización: {syncError}</span>
                </div>
                <button
                    className="text-xs bg-amber-200 hover:bg-amber-300 px-3 py-1 rounded transition-colors font-medium"
                    onClick={handleManualSync}
                    disabled={isManuallySyncing}
                >
                    {isManuallySyncing ? 'Reintentando...' : 'Reintentar'}
                </button>
            </div>
        );
    }

    // Syncing state with progress
    if (isSyncing && syncProgress) {
        return (
            <div className="bg-blue-500 text-white px-4 py-2 text-sm z-50">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="font-medium">
                            Sincronizando {syncProgress.phase}...
                        </span>
                    </div>
                    <span className="text-xs opacity-90">
                        {syncProgress.percentage}%
                    </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-blue-600 rounded-full h-1.5 overflow-hidden">
                    <div
                        className="bg-white h-full transition-all duration-300 ease-out"
                        style={{ width: `${syncProgress.percentage}%` }}
                    />
                </div>
                <div className="text-xs opacity-75 mt-1">
                    {syncProgress.currentTable}
                    {syncProgress.recordsProcessed && syncProgress.totalRecords && (
                        <span className="ml-2">
                            ({syncProgress.recordsProcessed}/{syncProgress.totalRecords})
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // Normal syncing without detailed progress
    if (isSyncing) {
        return (
            <div className="bg-blue-500 text-white px-4 py-1 text-sm font-medium flex items-center justify-center gap-2 z-50">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sincronizando cambios...</span>
            </div>
        );
    }

    // Normal state (Online + Synced)
    return (
        <>
            <div className="bg-emerald-600 text-white px-4 py-1 text-sm font-medium flex items-center justify-between shadow-sm z-50">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        <span>En línea</span>
                    </div>

                    {lastSyncTime && (
                        <span className="text-xs opacity-75">
                            • Sincronizado {formatLastSync(lastSyncTime)}
                        </span>
                    )}

                    {conflictCount > 0 && (
                        <div className="flex items-center gap-1 bg-amber-500 px-2 py-0.5 rounded text-xs">
                            <AlertCircle className="w-3 h-3" />
                            <span>{conflictCount} conflictos</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {pendingCount > 0 && (
                        <button
                            onClick={() => setShowPendingModal(true)}
                            className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 px-2 py-0.5 rounded text-xs transition-colors cursor-pointer"
                            title="Ver cambios pendientes"
                        >
                            <CloudUpload className="w-3 h-3" />
                            <span>{pendingCount}</span>
                        </button>
                    )}

                    <button
                        onClick={handleManualSync}
                        disabled={isManuallySyncing}
                        className="text-xs bg-emerald-700 hover:bg-emerald-800 px-2 py-1 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Sincronizar ahora"
                    >
                        <RefreshCw className={`w-3 h-3 ${isManuallySyncing ? 'animate-spin' : ''}`} />
                        <span>Sincronizar</span>
                    </button>
                </div>
            </div>

            {/* Pending Changes Modal */}
            <PendingChangesModal
                isOpen={showPendingModal}
                onClose={() => setShowPendingModal(false)}
            />
        </>
    );
}

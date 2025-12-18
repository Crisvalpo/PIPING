import { create } from 'zustand';
import { LocalConflict } from '../lib/db';

export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'offline';

export interface SyncProgress {
    phase: string; // e.g., 'Isometrics', 'Spools', 'Personal'
    percentage: number; // 0-100
    currentTable: string;
    recordsProcessed?: number;
    totalRecords?: number;
}

interface SyncState {
    isSyncing: boolean;
    pendingCount: number;
    lastSyncTime: Date | null;
    syncError: string | null;

    // New detailed tracking fields
    syncProgress: SyncProgress | null;
    lastSyncByModule: Record<string, Date>;
    conflictCount: number;
    conflicts: LocalConflict[];
    networkQuality: NetworkQuality;

    // Actions
    setIsSyncing: (isSyncing: boolean) => void;
    setPendingCount: (count: number) => void;
    incrementPendingCount: () => void;
    decrementPendingCount: () => void;
    setLastSyncTime: (date: Date) => void;
    setSyncError: (error: string | null) => void;

    // New actions
    setSyncProgress: (progress: SyncProgress | null) => void;
    setModuleSyncTime: (module: string, date: Date) => void;
    setConflicts: (conflicts: LocalConflict[]) => void;
    setNetworkQuality: (quality: NetworkQuality) => void;
    addConflict: (conflict: LocalConflict) => void;
    resolveConflict: (conflictId: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    syncError: null,
    syncProgress: null,
    lastSyncByModule: {},
    conflictCount: 0,
    conflicts: [],
    networkQuality: 'excellent',

    setIsSyncing: (isSyncing) => set({ isSyncing }),
    setPendingCount: (count) => set({ pendingCount: count }),
    incrementPendingCount: () => set((state) => ({ pendingCount: state.pendingCount + 1 })),
    decrementPendingCount: () => set((state) => ({ pendingCount: Math.max(0, state.pendingCount - 1) })),
    setLastSyncTime: (date) => set({ lastSyncTime: date }),
    setSyncError: (error) => set({ syncError: error }),

    setSyncProgress: (progress) => set({ syncProgress: progress }),
    setModuleSyncTime: (module, date) => set((state) => ({
        lastSyncByModule: { ...state.lastSyncByModule, [module]: date }
    })),
    setConflicts: (conflicts) => set({
        conflicts,
        conflictCount: conflicts.length
    }),
    setNetworkQuality: (quality) => set({ networkQuality: quality }),
    addConflict: (conflict) => set((state) => ({
        conflicts: [...state.conflicts, conflict],
        conflictCount: state.conflictCount + 1
    })),
    resolveConflict: (conflictId) => set((state) => ({
        conflicts: state.conflicts.filter(c => c.id !== conflictId),
        conflictCount: Math.max(0, state.conflictCount - 1)
    })),
}));


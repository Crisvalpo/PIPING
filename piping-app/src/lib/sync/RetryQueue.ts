/**
 * RetryQueue - Intelligent retry system with exponential backoff
 * 
 * Retry Schedule:
 * - Attempt 1: Immediate
 * - Attempt 2: +5 seconds
 * - Attempt 3: +30 seconds
 * - Attempt 4: +2 minutes
 * - Attempt 5: +10 minutes
 * - After 5 attempts: Mark as "requires attention"
 */

import { db, PendingAction } from '@/lib/db';
import { refreshPendingCount } from '@/lib/sync/SyncManager';

const MAX_RETRY_ATTEMPTS = 5;

// Backoff delays in milliseconds
const RETRY_DELAYS = [
    0,           // Attempt 1: Immediate
    5000,        // Attempt 2: 5 seconds
    30000,       // Attempt 3: 30 seconds
    120000,      // Attempt 4: 2 minutes
    600000,      // Attempt 5: 10 minutes
];

/**
 * Calculate the next retry time based on retry count
 */
export function calculateNextRetryTime(retryCount: number): Date | null {
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
        return null; // No more retries
    }

    const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    return new Date(Date.now() + delay);
}

/**
 * Check if an action should be retried now
 */
export function shouldRetryNow(action: PendingAction): boolean {
    // Always retry PENDING actions
    if (action.status === 'PENDING') {
        return true;
    }

    // Don't retry if max attempts reached
    if (action.retry_count >= MAX_RETRY_ATTEMPTS) {
        return false;
    }

    // Don't retry if no next_retry_at is set
    if (!action.next_retry_at) {
        return false;
    }

    // Check if it's time to retry
    const nextRetryTime = new Date(action.next_retry_at);
    return new Date() >= nextRetryTime;
}

/**
 * Mark an action as failed and schedule next retry
 */
export async function markActionAsFailed(
    actionId: string,
    errorMessage: string
): Promise<void> {
    const action = await db.pendingActions.get(actionId);
    if (!action) return;

    const newRetryCount = action.retry_count + 1;
    const nextRetryAt = calculateNextRetryTime(newRetryCount);

    await db.pendingActions.update(actionId, {
        status: 'ERROR',
        error_message: errorMessage,
        retry_count: newRetryCount,
        next_retry_at: nextRetryAt?.toISOString(),
        last_error_at: new Date().toISOString()
    });

    if (newRetryCount >= MAX_RETRY_ATTEMPTS) {
        console.warn(`[RetryQueue] Action ${actionId} exceeded max retries (${MAX_RETRY_ATTEMPTS}). Requires manual attention.`);
    } else {
        console.log(`[RetryQueue] Action ${actionId} will retry at ${nextRetryAt?.toLocaleString('es-CL')}`);
    }

    // Update pending count in UI
    await refreshPendingCount();
}

/**
 * Mark an action as successful (completed)
 */
export async function markActionAsCompleted(actionId: string): Promise<void> {
    await db.pendingActions.delete(actionId);
    console.log(`[RetryQueue] Action ${actionId} completed and removed from queue`);

    // Update pending count in UI
    await refreshPendingCount();
}

/**
 * Get all actions that are ready to retry
 */
export async function getActionsReadyForRetry(projectId?: string): Promise<PendingAction[]> {
    let query = db.pendingActions.toCollection();

    if (projectId) {
        query = db.pendingActions.where('project_id').equals(projectId);
    }

    const allActions = await query.toArray();

    return allActions.filter(action => shouldRetryNow(action));
}

/**
 * Reset retry count for manual retry
 */
export async function resetRetryCount(actionId: string): Promise<void> {
    await db.pendingActions.update(actionId, {
        status: 'PENDING',
        retry_count: 0,
        next_retry_at: undefined,
        error_message: undefined
    });
    console.log(`[RetryQueue] Action ${actionId} retry count reset`);
}

/**
 * Get retry stats for monitoring
 */
export async function getRetryStats(projectId: string): Promise<{
    total: number;
    pending: number;
    error: number;
    maxRetriesReached: number;
    readyForRetry: number;
}> {
    const actions = await db.pendingActions
        .where('project_id')
        .equals(projectId)
        .toArray();

    const stats = {
        total: actions.length,
        pending: actions.filter(a => a.status === 'PENDING').length,
        error: actions.filter(a => a.status === 'ERROR').length,
        maxRetriesReached: actions.filter(a => a.retry_count >= MAX_RETRY_ATTEMPTS).length,
        readyForRetry: actions.filter(a => shouldRetryNow(a)).length
    };

    return stats;
}

/**
 * Format time until next retry
 */
export function formatTimeUntilRetry(nextRetryAt: string): string {
    const now = new Date();
    const retry = new Date(nextRetryAt);
    const diff = retry.getTime() - now.getTime();

    if (diff <= 0) return 'Ahora';

    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Menos de 1 minuto';
    if (minutes < 60) return `En ${minutes}m`;

    const hours = Math.floor(minutes / 60);
    return `En ${hours}h ${minutes % 60}m`;
}

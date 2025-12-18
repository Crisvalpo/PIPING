'use client';

import { CheckCircle, CloudOff, Clock, AlertCircle } from 'lucide-react';

export type SyncStatus = 'synced' | 'local' | 'pending' | 'error';

interface SyncStatusBadgeProps {
    status: SyncStatus;
    className?: string;
    size?: 'sm' | 'md';
    showLabel?: boolean;
    errorMessage?: string;
    lastSyncDate?: Date | string;
}

const STATUS_CONFIG = {
    synced: {
        icon: CheckCircle,
        label: 'Sincronizado',
        bgColor: 'bg-emerald-100',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-300',
        emoji: '✅'
    },
    local: {
        icon: CloudOff,
        label: 'Local',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-300',
        emoji: '💾'
    },
    pending: {
        icon: Clock,
        label: 'Pendiente',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-300',
        emoji: '⏳'
    },
    error: {
        icon: AlertCircle,
        label: 'Error',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        borderColor: 'border-red-300',
        emoji: '⚠️'
    }
};

export default function SyncStatusBadge({
    status,
    className = '',
    size = 'sm',
    showLabel = true,
    errorMessage,
    lastSyncDate
}: SyncStatusBadgeProps) {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1'
    };

    const iconSize = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4'
    };

    const formatDate = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'hace un momento';
        if (minutes < 60) return `hace ${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours}h`;
        const days = Math.floor(hours / 24);
        return `hace ${days}d`;
    };

    const getTooltipContent = () => {
        switch (status) {
            case 'synced':
                return lastSyncDate
                    ? `Sincronizado ${formatDate(lastSyncDate)}`
                    : 'Sincronizado con el servidor';
            case 'local':
                return 'Guardado solo en este dispositivo';
            case 'pending':
                return 'En cola para sincronizar';
            case 'error':
                return errorMessage || 'Error al sincronizar - Click para reintentar';
        }
    };

    return (
        <div
            className={`
                inline-flex items-center gap-1 rounded-full border
                ${config.bgColor} ${config.textColor} ${config.borderColor}
                ${sizeClasses[size]}
                ${className}
                transition-all hover:shadow-sm
            `}
            title={getTooltipContent()}
        >
            <Icon className={`${iconSize[size]} flex-shrink-0`} />
            {showLabel && (
                <span className="font-medium whitespace-nowrap">
                    {config.label}
                </span>
            )}
        </div>
    );
}

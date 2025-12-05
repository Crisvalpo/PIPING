/**
 * PersonalCard Component
 * Draggable card representing a worker in the Kanban board
 */

'use client';

import React from 'react';
import { GripVertical, User, Award } from 'lucide-react';

interface PersonalCardProps {
    rut: string;
    nombre: string;
    cargo?: string;
    estampa?: string;
    hora_inicio?: string;
    tipo_asignacion?: 'SOLDADOR' | 'MAESTRO' | 'ESTABLE' | 'FLEXIBLE';
    onDragStart?: (e: React.DragEvent, rut: string, role: string) => void;
    draggable?: boolean;
}

export default function PersonalCard({
    rut,
    nombre,
    cargo,
    estampa,
    hora_inicio,
    tipo_asignacion,
    onDragStart,
    draggable = true
}: PersonalCardProps) {

    const handleDragStart = (e: React.DragEvent) => {
        if (onDragStart) {
            // Determine role from cargo or tipo_asignacion
            const role = tipo_asignacion === 'FLEXIBLE' || cargo === 'SOLDADOR'
                ? 'SOLDADOR'
                : 'MAESTRO';
            onDragStart(e, rut, role);
        }
    };

    const getTimeSinceAssignment = () => {
        if (!hora_inicio) return null;

        const now = new Date();
        const start = new Date();
        const [hours, minutes] = hora_inicio.split(':');
        start.setHours(parseInt(hours), parseInt(minutes), 0);

        const diff = now.getTime() - start.getTime();
        const hoursDiff = Math.floor(diff / (1000 * 60 * 60));
        const minutesDiff = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${hoursDiff}h ${minutesDiff}m`;
    };

    const timeInCuadrilla = getTimeSinceAssignment();

    return (
        <div
            draggable={draggable}
            onDragStart={handleDragStart}
            className={`
                group relative bg-white/10 backdrop-blur-md border border-white/20 
                rounded-lg p-3 mb-2
                hover:bg-white/20 hover:border-white/30 hover:shadow-lg
                transition-all duration-200
                ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
            `}
        >
            {/* Drag Handle */}
            {draggable && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 text-white/40 group-hover:text-white/60">
                    <GripVertical className="w-4 h-4" />
                </div>
            )}

            <div className="pl-5">
                {/* Header: Name + Badge */}
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <User className="w-4 h-4 text-white/60 flex-shrink-0" />
                        <span className="font-medium text-white text-sm truncate">
                            {nombre}
                        </span>
                    </div>

                    {cargo && (
                        <span className={`
                            text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0
                            ${cargo === 'SOLDADOR' ? 'bg-blue-500/30 text-blue-200' :
                                cargo === 'MAESTRO' ? 'bg-purple-500/30 text-purple-200' :
                                    'bg-gray-500/30 text-gray-200'}
                        `}>
                            {cargo}
                        </span>
                    )}
                </div>

                {/* RUT */}
                <div className="text-white/50 text-xs mb-1">
                    RUT: {rut}
                </div>

                {/* Estampa (if soldador) */}
                {estampa && (
                    <div className="flex items-center gap-1 text-xs text-yellow-300/80 mb-1">
                        <Award className="w-3 h-3" />
                        <span>Estampa: {estampa}</span>
                    </div>
                )}

                {/* Time in cuadrilla */}
                {timeInCuadrilla && (
                    <div className="text-[10px] text-white/40 mt-1">
                        En cuadrilla: {timeInCuadrilla}
                    </div>
                )}
            </div>
        </div>
    );
}

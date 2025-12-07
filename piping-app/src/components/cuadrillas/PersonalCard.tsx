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
    isAbsent?: boolean;
}

export default function PersonalCard({
    rut,
    nombre,
    cargo,
    estampa,
    hora_inicio,
    tipo_asignacion,
    onDragStart,
    draggable = true,
    isAbsent = false
}: PersonalCardProps) {

    const handleDragStart = (e: React.DragEvent) => {
        if (onDragStart) {
            // Determine role from cargo or tipo_asignacion
            let role = tipo_asignacion === 'FLEXIBLE' || cargo === 'SOLDADOR'
                ? 'SOLDADOR'
                : (cargo || 'MAESTRO');

            if (role.toUpperCase().includes('SOLDADOR')) role = 'SOLDADOR';

            onDragStart(e, rut, role);
        }
    };

    return (
        <div
            draggable={draggable && !isAbsent}
            onDragStart={handleDragStart}
            className={`
                group relative backdrop-blur-md border
                rounded-md p-2 
                transition-all duration-200
                ${isAbsent
                    ? 'bg-gray-800/50 border-gray-600/50 opacity-60 cursor-not-allowed'
                    : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/30 hover:shadow-lg'
                }
                ${draggable && !isAbsent ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
                overflow-hidden
            `}
        >
            {/* Drag Handle */}
            {draggable && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 text-white/40 group-hover:text-white/60">
                    <GripVertical className="w-3 h-3" />
                </div>
            )}

            <div className="pl-4 flex items-center gap-2">
                {/* Absent Badge */}
                {isAbsent && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 uppercase bg-red-600/80 text-white border border-red-500">
                        AUSENTE
                    </span>
                )}

                {/* Role Badge */}
                {cargo && !isAbsent && (
                    <span className={`
                        text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 uppercase
                        ${cargo.toUpperCase().includes('SOLDADOR') ? 'bg-orange-500/30 text-orange-200 border border-orange-500/50' :
                            cargo.toUpperCase().includes('MAESTRO') ? 'bg-green-500/30 text-green-200 border border-green-500/50' :
                                cargo.toUpperCase().includes('CAPATAZ') ? 'bg-blue-500/30 text-blue-200 border border-blue-500/50' :
                                    'bg-gray-500/30 text-gray-200 border border-gray-500/50'}
                    `}>
                        {cargo.split(' ')[0]}
                    </span>
                )}

                {/* Name */}
                <span className="font-medium text-white text-xs truncate flex-1">
                    {nombre}
                </span>
            </div>
        </div>
    );
}

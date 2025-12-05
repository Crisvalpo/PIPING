/**
 * CuadrillaColumn Component
 * Column in Kanban board representing one cuadrilla
 */

'use client';

import React from 'react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import PersonalCard from './PersonalCard';

interface Trabajador {
    rut: string;
    nombre: string;
    cargo?: string;
    estampa?: string;
    hora_inicio?: string;
    tipo_asignacion?: 'SOLDADOR' | 'MAESTRO' | 'ESTABLE' | 'FLEXIBLE';
    rol?: string;
}

interface CuadrillaColumnProps {
    cuadrilla: {
        id: string;
        nombre: string;
        codigo?: string;
        supervisor?: { rut: string; nombre: string; email?: string } | null;
        capataz?: { rut: string; nombre: string; email?: string } | null;
        trabajadores_actuales: Trabajador[];
        total_members: number;
    };
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, cuadrillaId: string) => void;
    onDragStart: (e: React.DragEvent, rut: string, role: string, fromCuadrillaId: string) => void;
}

export default function CuadrillaColumn({
    cuadrilla,
    onDragOver,
    onDrop,
    onDragStart
}: CuadrillaColumnProps) {
    const [collapsed, setCollapsed] = React.useState(false);

    const handleDragStart = (e: React.DragEvent, rut: string, role: string) => {
        onDragStart(e, rut, role, cuadrilla.id);
    };

    const handleDrop = (e: React.DragEvent) => {
        onDrop(e, cuadrilla.id);
    };

    // Build descriptive name
    const displayName = cuadrilla.nombre ||
        (cuadrilla.supervisor && cuadrilla.capataz
            ? `Sup. ${cuadrilla.supervisor.nombre} - Cap. ${cuadrilla.capataz.nombre}`
            : cuadrilla.codigo || 'Sin nombre');

    return (
        <div className="flex-shrink-0 w-80 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            {/* Column Header */}
            <div className="mb-4">
                <div
                    className="flex items-center justify-between mb-2 cursor-pointer"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-white/80" />
                        <h3 className="font-semibold text-white text-lg truncate max-w-[200px]">
                            {displayName}
                        </h3>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="bg-blue-500/20 text-blue-300 text-sm font-bold px-2 py-1 rounded-full">
                            {cuadrilla.total_members}
                        </span>
                        {collapsed ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronUp className="w-4 h-4 text-white/60" />}
                    </div>
                </div>

                {/* Supervisor & Capataz info */}
                {!collapsed && (
                    <div className="text-xs text-white/50 space-y-1 ml-7">
                        {cuadrilla.supervisor && (
                            <div>Sup: {cuadrilla.supervisor.nombre}</div>
                        )}
                        {cuadrilla.capataz && (
                            <div>Cap: {cuadrilla.capataz.nombre}</div>
                        )}
                        {cuadrilla.codigo && (
                            <div className="text-white/40">Código: {cuadrilla.codigo}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Drop Zone */}
            {!collapsed && (
                <div
                    onDragOver={onDragOver}
                    onDrop={handleDrop}
                    className={`
                        min-h-[400px] max-h-[600px] overflow-y-auto
                        border-2 border-dashed border-white/10 rounded-lg p-2
                        transition-colors duration-200
                        hover:border-white/30 hover:bg-white/5
                    `}
                >
                    {cuadrilla.trabajadores_actuales.length === 0 ? (
                        <div className="text-center text-white/30 py-8">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Sin personal asignado</p>
                            <p className="text-xs mt-1">Arrastra tarjetas aquí</p>
                        </div>
                    ) : (
                        cuadrilla.trabajadores_actuales.map((trabajador) => (
                            <PersonalCard
                                key={trabajador.rut}
                                rut={trabajador.rut}
                                nombre={trabajador.nombre}
                                cargo={trabajador.cargo || trabajador.rol}
                                estampa={trabajador.estampa}
                                hora_inicio={trabajador.hora_inicio}
                                tipo_asignacion={trabajador.tipo_asignacion}
                                onDragStart={handleDragStart}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

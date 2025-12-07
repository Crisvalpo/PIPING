/**
 * CuadrillaColumn Component
 * Column in Kanban board representing one cuadrilla
 */

'use client';

import React from 'react';
import { Users, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';
import PersonalCard from './PersonalCard';

interface Trabajador {
    rut: string;
    nombre: string;
    cargo?: string;
    estampa?: string;
    hora_inicio?: string;
    tipo?: string; // Changed from tipo_asignacion to match View
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
    onEdit: (cuadrillaId: string) => void;
    onDelete: (cuadrillaId: string) => void;
    absentWorkers?: Set<string>;
    compact?: boolean;
}

export default function CuadrillaColumn({
    cuadrilla,
    onDragOver,
    onDrop,
    onDragStart,
    onEdit,
    onDelete,
    absentWorkers = new Set(),
    compact = false
}: CuadrillaColumnProps) {
    const [collapsed, setCollapsed] = React.useState(true); // Start collapsed by default

    const handleDragStart = (e: React.DragEvent, rut: string, role: string) => {
        onDragStart(e, rut, role, cuadrilla.id);
    };

    const handleDrop = (e: React.DragEvent) => {
        onDrop(e, cuadrilla.id);
    };

    return (
        <div className="flex-shrink-0 w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 overflow-hidden">
            {/* Column Header */}
            <div className="mb-2">
                <div
                    className="flex flex-col gap-2 cursor-pointer pb-2"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {/* Row 1: Icon + Name */}
                    <div className="flex items-center gap-2 min-w-0">
                        <Users className="w-5 h-5 text-white/90 flex-shrink-0" />
                        <h3 className="font-bold text-white text-base truncate tracking-tight">
                            {cuadrilla.nombre || cuadrilla.codigo || 'Sin nombre'}
                        </h3>
                    </div>

                    {/* Row 2: Actions aligned right */}
                    <div className="flex items-center justify-end gap-1.5">
                        <span className="bg-blue-600 shadow-lg shadow-blue-500/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full mr-1 flex items-center justify-center min-w-[20px]">
                            {(() => {
                                let count = 0;
                                if (cuadrilla.supervisor && !absentWorkers.has(cuadrilla.supervisor.rut)) count++;
                                if (cuadrilla.capataz && !absentWorkers.has(cuadrilla.capataz.rut)) count++;
                                count += cuadrilla.trabajadores_actuales.filter((t: any) => !absentWorkers.has(t.rut)).length;
                                return count;
                            })()}
                        </span>
                        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/5">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(cuadrilla.id);
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-md transition-colors group"
                                title="Editar"
                            >
                                <Edit className="w-3.5 h-3.5 text-blue-300 group-hover:text-blue-200" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('¿Eliminar cuadrilla?')) {
                                        onDelete(cuadrilla.id);
                                    }
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-md transition-colors group"
                                title="Eliminar"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:text-red-300" />
                            </button>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCollapsed(!collapsed);
                            }}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors ml-1"
                        >
                            {collapsed ?
                                <ChevronDown className="w-4 h-4 text-white/60" /> :
                                <ChevronUp className="w-4 h-4 text-white/60" />
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* Drop Zone */}
            {!collapsed && (
                <div
                    onDragOver={onDragOver}
                    onDrop={handleDrop}
                    className={`
                        min-h-[100px]
                        border-2 border-dashed border-white/10 rounded-lg p-2
                        transition-colors duration-200
                        hover:border-white/30 hover:bg-white/5
                    `}
                >
                    {/* Supervisor Section */}
                    {cuadrilla.supervisor && (
                        <div className="mb-2 pb-2 border-b border-white/10">
                            <div className="text-[10px] text-purple-300 font-semibold mb-1 flex items-center gap-1">
                                <span>👤</span>
                                <span>SUPERVISOR</span>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded px-2 py-1">
                                <div className="text-white font-medium text-xs truncate">{cuadrilla.supervisor.nombre}</div>
                            </div>
                        </div>
                    )}

                    {/* Capataz Section */}
                    {cuadrilla.capataz && (
                        <div className="mb-2 pb-2 border-b border-white/10">
                            <div className="text-[10px] text-blue-300 font-semibold mb-1 flex items-center gap-1">
                                <span>⚡</span>
                                <span>CAPATAZ</span>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded px-2 py-1">
                                <div className="text-white font-medium text-xs truncate">{cuadrilla.capataz.nombre}</div>
                            </div>
                        </div>
                    )}

                    {/* Soldadores Section */}
                    {(() => {
                        const soldadores = cuadrilla.trabajadores_actuales.filter((t: any) =>
                            t.tipo === 'soldador' || t.cargo?.toUpperCase().includes('SOLDADOR')
                        );
                        return soldadores.length > 0 && (
                            <div className="mb-3 pb-3 border-b border-white/10">
                                <div className="text-xs text-orange-300 font-semibold mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <span>🔥</span>
                                        <span>SOLDADORES</span>
                                    </div>
                                    <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {soldadores.filter((t: any) => !absentWorkers.has(t.rut)).length}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {soldadores.map((trabajador: any) => (
                                        <PersonalCard
                                            key={trabajador.rut}
                                            rut={trabajador.rut}
                                            nombre={trabajador.nombre}
                                            cargo={trabajador.cargo || trabajador.rol}
                                            estampa={trabajador.estampa}
                                            hora_inicio={trabajador.hora_inicio}
                                            tipo_asignacion={trabajador.tipo} // Updated
                                            onDragStart={handleDragStart}
                                            isAbsent={absentWorkers.has(trabajador.rut)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Maestros Section */}
                    {(() => {
                        const maestros = cuadrilla.trabajadores_actuales.filter((t: any) => {
                            const isSoldador = t.tipo === 'soldador' || t.cargo?.toUpperCase().includes('SOLDADOR');
                            if (isSoldador) return false;

                            const r = t.cargo?.toUpperCase() || '';
                            return r.includes('MAESTRO') || r.includes('TUBERO') || r.includes('CAÑERIA');
                        });

                        return maestros.length > 0 && (
                            <div className="mb-3">
                                <div className="text-xs text-green-300 font-semibold mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <span>🛠️</span>
                                        <span>MAESTROS</span>
                                    </div>
                                    <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {maestros.filter((t: any) => !absentWorkers.has(t.rut)).length}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {maestros.map((trabajador: any) => (
                                        <PersonalCard
                                            key={trabajador.rut}
                                            rut={trabajador.rut}
                                            nombre={trabajador.nombre}
                                            cargo={trabajador.cargo || trabajador.rol}
                                            estampa={trabajador.estampa}
                                            hora_inicio={trabajador.hora_inicio}
                                            tipo_asignacion={trabajador.tipo} // Updated
                                            onDragStart={handleDragStart}
                                            isAbsent={absentWorkers.has(trabajador.rut)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Otros / Ayudantes Section */}
                    {(() => {
                        const otros = cuadrilla.trabajadores_actuales.filter((t: any) => {
                            const isSoldador = t.tipo === 'soldador' || t.cargo?.toUpperCase().includes('SOLDADOR');
                            if (isSoldador) return false;

                            const r = t.cargo?.toUpperCase() || '';
                            const isMaestro = r.includes('MAESTRO') || r.includes('TUBERO') || r.includes('CAÑERIA');
                            if (isMaestro) return false;

                            return true;
                        });

                        return otros.length > 0 && (
                            <div className="mb-3">
                                <div className="text-xs text-gray-400 font-semibold mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <span>📋</span>
                                        <span>OTROS</span>
                                    </div>
                                    <span className="bg-gray-500/20 text-gray-300 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {otros.length}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {otros.map((trabajador: any) => (
                                        <PersonalCard
                                            key={trabajador.rut}
                                            rut={trabajador.rut}
                                            nombre={trabajador.nombre}
                                            cargo={trabajador.cargo || trabajador.rol}
                                            estampa={trabajador.estampa}
                                            hora_inicio={trabajador.hora_inicio}
                                            tipo_asignacion={trabajador.tipo} // Updated
                                            onDragStart={handleDragStart}
                                            isAbsent={absentWorkers.has(trabajador.rut)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Empty State */}
                    {cuadrilla.trabajadores_actuales.length === 0 && !cuadrilla.supervisor && !cuadrilla.capataz && (
                        <div className="text-center text-white/30 py-8">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Sin personal asignado</p>
                            <p className="text-xs mt-1">Arrastra tarjetas aquí</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

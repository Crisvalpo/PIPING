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
    availableSupervisors?: Array<{ rut: string; nombre: string }>;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, cuadrillaId: string) => void;
    onDragStart: (e: React.DragEvent, rut: string, role: string, fromCuadrillaId: string) => void;
    onEdit: (cuadrillaId: string) => void;
    onDelete: (cuadrillaId: string) => void;
    onAssignSupervisor: (cuadrillaId: string, supervisorRut: string) => void;
}

export default function CuadrillaColumn({
    cuadrilla,
    availableSupervisors = [],
    onDragOver,
    onDrop,
    onDragStart,
    onEdit,
    onDelete,
    onAssignSupervisor
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
                    className="flex items-center justify-between mb-2"
                >
                    <div
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        <Users className="w-5 h-5 text-white/80" />
                        <h3 className="font-semibold text-white text-lg truncate max-w-[150px]">
                            {displayName}
                        </h3>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="bg-blue-500/20 text-blue-300 text-sm font-bold px-2 py-1 rounded-full">
                            {cuadrilla.total_members}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(cuadrilla.id);
                            }}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="Editar cuadrilla"
                        >
                            <Edit className="w-4 h-4 text-blue-300 hover:text-blue-400" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('¿Eliminar esta cuadrilla? Todos los miembros quedarán disponibles.')) {
                                    onDelete(cuadrilla.id);
                                }
                            }}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="Eliminar cuadrilla"
                        >
                            <Trash2 className="w-4 h-4 text-red-400 hover:text-red-500" />
                        </button>
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                            {collapsed ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronUp className="w-4 h-4 text-white/60" />}
                        </button>
                    </div>
                </div>

                {/* Supervisor Select & Info */}
                {!collapsed && (
                    <div className="space-y-2 ml-7">
                        {/* Supervisor Selector */}
                        {availableSupervisors.length > 0 && (
                            <div>
                                <label className="block text-xs text-white/40 mb-1">Supervisor:</label>
                                <select
                                    value={cuadrilla.supervisor?.rut || ''}
                                    onChange={(e) => onAssignSupervisor(cuadrilla.id, e.target.value)}
                                    className="w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                >
                                    <option value="" className="text-gray-900">Sin supervisor</option>
                                    {availableSupervisors.map((sup) => (
                                        <option key={sup.rut} value={sup.rut} className="text-gray-900">
                                            {sup.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Info básica */}
                        <div className="text-xs text-white/50 space-y-1">
                            {cuadrilla.capataz && (
                                <div>Cap: {cuadrilla.capataz.nombre}</div>
                            )}
                            {cuadrilla.codigo && (
                                <div className="text-white/40">Código: {cuadrilla.codigo}</div>
                            )}
                        </div>
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
                        border-2 border-dashed border-white/10 rounded-lg p-3
                        transition-colors duration-200
                        hover:border-white/30 hover:bg-white/5
                    `}
                >
                    {/* Supervisor Section */}
                    {cuadrilla.supervisor && (
                        <div className="mb-3 pb-3 border-b border-white/10">
                            <div className="text-xs text-purple-300 font-semibold mb-1 flex items-center gap-1">
                                <span>👤</span>
                                <span>SUPERVISOR</span>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2">
                                <div className="text-white font-medium text-sm">{cuadrilla.supervisor.nombre}</div>
                                {cuadrilla.supervisor.email && (
                                    <div className="text-white/50 text-xs">{cuadrilla.supervisor.email}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Capataz Section */}
                    {cuadrilla.capataz && (
                        <div className="mb-3 pb-3 border-b border-white/10">
                            <div className="text-xs text-blue-300 font-semibold mb-1 flex items-center gap-1">
                                <span>⚡</span>
                                <span>CAPATAZ</span>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                                <div className="text-white font-medium text-sm">{cuadrilla.capataz.nombre}</div>
                                {cuadrilla.capataz.email && (
                                    <div className="text-white/50 text-xs">{cuadrilla.capataz.email}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Soldadores Section */}
                    {(() => {
                        const soldadores = cuadrilla.trabajadores_actuales.filter((t: any) =>
                            t.tipo_asignacion === 'FLEXIBLE' || t.rol?.toUpperCase().includes('SOLDADOR')
                        );
                        return soldadores.length > 0 && (
                            <div className="mb-3 pb-3 border-b border-white/10">
                                <div className="text-xs text-orange-300 font-semibold mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <span>🔥</span>
                                        <span>SOLDADORES</span>
                                    </div>
                                    <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {soldadores.length}
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
                                            tipo_asignacion={trabajador.tipo_asignacion}
                                            onDragStart={handleDragStart}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Maestros Section */}
                    {(() => {
                        const maestros = cuadrilla.trabajadores_actuales.filter((t: any) =>
                            t.tipo_asignacion === 'ESTABLE' ||
                            (t.rol && !t.rol.toUpperCase().includes('SOLDADOR'))
                        );
                        return maestros.length > 0 && (
                            <div className="mb-3">
                                <div className="text-xs text-green-300 font-semibold mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <span>🛠️</span>
                                        <span>MAESTROS</span>
                                    </div>
                                    <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {maestros.length}
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
                                            tipo_asignacion={trabajador.tipo_asignacion}
                                            onDragStart={handleDragStart}
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

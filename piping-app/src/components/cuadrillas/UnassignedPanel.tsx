/**
 * UnassignedPanel Component
 * Sidebar showing available personnel not assigned to any cuadrilla
 */

'use client';

import React from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import PersonalCard from './PersonalCard';

interface Personal {
    rut: string;
    nombre: string;
    email?: string;
    cargo?: string;
}

interface UnassignedPanelProps {
    personalDisponible: Personal[];
    onDragStart: (e: React.DragEvent, rut: string, role: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    isOpen: boolean;
    onToggle: () => void;
}

export default function UnassignedPanel({
    personalDisponible,
    onDragStart,
    onDragOver,
    onDrop,
    isOpen,
    onToggle
}: UnassignedPanelProps) {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterCargo, setFilterCargo] = React.useState<string>('');

    // Filter personal
    const filteredPersonal = personalDisponible.filter(p => {
        const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.rut.includes(searchTerm);
        const matchesCargo = !filterCargo || p.cargo === filterCargo;
        return matchesSearch && matchesCargo;
    });

    // Get unique cargos for filter
    const cargos = Array.from(new Set(personalDisponible.map(p => p.cargo).filter(Boolean)));

    return (
        <>
            {/* Toggle Button (when closed) */}
            {!isOpen && (
                <button
                    onClick={onToggle}
                    className="fixed right-4 top-24 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 rounded-l-xl shadow-lg transition-all duration-200 z-40"
                >
                    <div className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        <span className="font-medium">Disponibles ({personalDisponible.length})</span>
                    </div>
                </button>
            )}

            {/* Panel */}
            <div
                className={`
                    fixed right-0 top-0 h-full w-96 bg-gray-900/95 backdrop-blur-lg border-l border-white/20 
                    shadow-2xl transition-transform duration-300 z-50
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                `}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <UserPlus className="w-6 h-6 text-white" />
                            <h2 className="text-xl font-bold text-white">Personal Disponible</h2>
                        </div>
                        <button
                            onClick={onToggle}
                            className="text-white/60 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="text-sm text-white/60 mb-3">
                        {filteredPersonal.length} de {personalDisponible.length} trabajadores
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o RUT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>

                    {/* Cargo Filter */}
                    {cargos.length > 0 && (
                        <select
                            value={filterCargo}
                            onChange={(e) => setFilterCargo(e.target.value)}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            <option value="" className="text-gray-900">Todos los cargos</option>
                            {cargos.map(cargo => (
                                <option key={cargo} value={cargo} className="text-gray-900">{cargo}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Drop Zone for unassigning */}
                <div
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    className="p-4 border-b border-white/10 bg-red-500/10"
                >
                    <div className="text-center text-white/60 text-sm py-2">
                        <span className="font-medium">Arrastra aquí para quitar de la cuadrilla</span>
                    </div>
                </div>

                {/* Personnel List */}
                <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 280px)' }}>
                    {filteredPersonal.length === 0 ? (
                        <div className="text-center text-white/40 py-8">
                            <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No hay personal disponible</p>
                            {searchTerm && (
                                <p className="text-xs mt-2">Intenta con otro término de búsqueda</p>
                            )}
                        </div>
                    ) : (
                        filteredPersonal.map((personal) => (
                            <PersonalCard
                                key={personal.rut}
                                rut={personal.rut}
                                nombre={personal.nombre}
                                cargo={personal.cargo}
                                onDragStart={onDragStart}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Overlay removido para permitir drag & drop */
                /* Si se desea cerrar al hacer click fuera, se debe manejar en el contenedor padre o con un listener global, 
                   pero para D&D necesitamos que el fondo sea interactivo. */
            }
        </>
    );
}

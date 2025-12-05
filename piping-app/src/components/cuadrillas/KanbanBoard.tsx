/**
 * KanbanBoard Component
 * Main container for the Kanban board managing drag & drop logic
 */

'use client';

import React from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
import CuadrillaColumn from './CuadrillaColumn';
import UnassignedPanel from './UnassignedPanel';

interface Cuadrilla {
    id: string;
    nombre: string;
    codigo?: string;
    supervisor?: { rut: string; nombre: string; email?: string } | null;
    capataz?: { rut: string; nombre: string; email?: string } | null;
    trabajadores_actuales: any[];
    total_members: number;
}

interface Personal {
    rut: string;
    nombre: string;
    email?: string;
    cargo?: string;
}

interface KanbanBoardProps {
    proyectoId: string;
    initialCuadrillas: Cuadrilla[];
    initialPersonalDisponible: Personal[];
    fecha: string;
}

export default function KanbanBoard({
    proyectoId,
    initialCuadrillas,
    initialPersonalDisponible,
    fecha
}: KanbanBoardProps) {
    const [cuadrillas, setCuadrillas] = React.useState<Cuadrilla[]>(initialCuadrillas);
    const [personalDisponible, setPersonalDisponible] = React.useState<Personal[]>(initialPersonalDisponible);
    const [draggedItem, setDraggedItem] = React.useState<{
        rut: string;
        role: string;
        fromCuadrillaId?: string;
    } | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [panelOpen, setPanelOpen] = React.useState(false);

    // Refresh data
    const refreshData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/proyectos/${proyectoId}/cuadrillas/daily`);
            const result = await response.json();

            if (result.success) {
                setCuadrillas(result.data.cuadrillas);
                setPersonalDisponible(result.data.personal_disponible);
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle drag start
    const handleDragStart = (e: React.DragEvent, rut: string, role: string, fromCuadrillaId?: string) => {
        setDraggedItem({ rut, role, fromCuadrillaId });
        e.dataTransfer.effectAllowed = 'move';
    };

    // Handle drag over
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // Handle drop on cuadrilla
    const handleDropOnCuadrilla = async (e: React.DragEvent, toCuadrillaId: string) => {
        e.preventDefault();

        if (!draggedItem) return;

        // Don't do anything if dropping on same cuadrilla
        if (draggedItem.fromCuadrillaId === toCuadrillaId) {
            setDraggedItem(null);
            return;
        }

        setLoading(true);

        try {
            // Assign to new cuadrilla (this auto-closes previous assignment)
            const response = await fetch('/api/cuadrillas/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rut: draggedItem.rut,
                    cuadrilla_id: toCuadrillaId,
                    role: draggedItem.role,
                    observaciones: draggedItem.fromCuadrillaId
                        ? `Movido desde otra cuadrilla`
                        : 'Asignado desde disponibles'
                })
            });

            const result = await response.json();

            if (result.success) {
                // Refresh to show updated state
                await refreshData();
            } else {
                alert(result.error || 'Error al asignar personal');
            }
        } catch (error) {
            console.error('Error assigning:', error);
            alert('Error al asignar personal');
        } finally {
            setLoading(false);
            setDraggedItem(null);
        }
    };

    // Handle drop on unassigned (remove from cuadrilla)
    const handleDropOnUnassigned = async (e: React.DragEvent) => {
        e.preventDefault();

        if (!draggedItem || !draggedItem.fromCuadrillaId) {
            setDraggedItem(null);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/cuadrillas/unassign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rut: draggedItem.rut,
                    cuadrilla_id: draggedItem.fromCuadrillaId,
                    role: draggedItem.role
                })
            });

            const result = await response.json();

            if (result.success) {
                await refreshData();
            } else {
                alert(result.error || 'Error al remover personal');
            }
        } catch (error) {
            console.error('Error unassigning:', error);
            alert('Error al remover personal');
        } finally {
            setLoading(false);
            setDraggedItem(null);
        }
    };

    return (
        <div className="relative">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-white/80">
                        <Calendar className="w-5 h-5" />
                        <span className="font-medium">{new Date(fecha).toLocaleDateString('es-CL')}</span>
                    </div>

                    <div className="text-white/60 text-sm">
                        {cuadrillas.length} cuadrillas activas
                    </div>
                </div>

                <button
                    onClick={refreshData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Actualizar</span>
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-4">
                {cuadrillas.map((cuadrilla) => (
                    <CuadrillaColumn
                        key={cuadrilla.id}
                        cuadrilla={cuadrilla}
                        onDragOver={handleDragOver}
                        onDrop={handleDropOnCuadrilla}
                        onDragStart={handleDragStart}
                    />
                ))}

                {cuadrillas.length === 0 && (
                    <div className="flex-1 flex items-center justify-center py-20">
                        <div className="text-center text-white/40">
                            <p className="text-lg">No hay cuadrillas activas</p>
                            <p className="text-sm mt-2">Crea cuadrillas primero para gestionar personal</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Unassigned Panel */}
            <UnassignedPanel
                personalDisponible={personalDisponible}
                onDragStart={(e, rut, role) => handleDragStart(e, rut, role)}
                onDragOver={handleDragOver}
                onDrop={handleDropOnUnassigned}
                isOpen={panelOpen}
                onToggle={() => setPanelOpen(!panelOpen)}
            />

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                        <RefreshCw className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                        <p className="text-white">Procesando...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

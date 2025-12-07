/**
 * KanbanBoard Component
 * Main container for the Kanban board managing drag & drop logic
 */

'use client';

import React from 'react';
import CuadrillaColumn from './CuadrillaColumn';
import UnassignedPanel from './UnassignedPanel';
import CreateCuadrillaModal from './CreateCuadrillaModal';
import EditCuadrillaModal from './EditCuadrillaModal';
import AttendanceModal from './AttendanceModal';
import { RefreshCw, Calendar, Plus, ChevronUp, ChevronDown, Info, Users, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Cuadrilla {
    id: string;
    nombre: string;
    codigo?: string;
    supervisor?: { rut: string; nombre: string; email?: string } | null;
    capataz?: { rut: string; nombre: string; email?: string } | null;
    trabajadores_actuales: any[];
    total_members: number;
    shift_id?: string; // Added for multi-shift
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
    const [showCreateModal, setShowCreateModal] = React.useState(false);
    const [editingCuadrilla, setEditingCuadrilla] = React.useState<Cuadrilla | null>(null);
    const [showAttendanceModal, setShowAttendanceModal] = React.useState(false);
    const [headerCollapsed, setHeaderCollapsed] = React.useState(false);
    const [leftCuadrilla, setLeftCuadrilla] = React.useState<Cuadrilla | null>(null);
    const [rightCuadrilla, setRightCuadrilla] = React.useState<Cuadrilla | null>(null);
    const [absentWorkers, setAbsentWorkers] = React.useState<Set<string>>(new Set());

    // Refresh data
    const refreshData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/proyectos/${proyectoId}/cuadrillas/daily`);
            const result = await response.json();

            if (result.success) {
                const newCuadrillas = result.data.cuadrillas as Cuadrilla[];
                setCuadrillas(newCuadrillas);
                setPersonalDisponible(result.data.personal_disponible);

                // Update selected panels with fresh data
                setLeftCuadrilla(prev => prev ? newCuadrillas.find(c => c.id === prev.id) || null : null);
                setRightCuadrilla(prev => prev ? newCuadrillas.find(c => c.id === prev.id) || null : null);
            }

            // Fetch today's attendance
            const { data: attendance } = await supabase
                .from('asistencia_diaria')
                .select('personal_rut, presente')
                .eq('proyecto_id', proyectoId)
                .eq('fecha', fecha) // Use selected date
                .eq('presente', false);

            if (attendance) {
                setAbsentWorkers(new Set(attendance.map(a => a.personal_rut)));
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

    const handleEdit = (cuadrilla: Cuadrilla) => {
        setEditingCuadrilla(cuadrilla);
    };

    const handleDelete = async (cuadrillaId: string) => {
        if (!confirm('¿Estás seguro de desactivar esta cuadrilla?')) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/cuadrillas?id=${cuadrillaId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await refreshData();
            } else {
                alert('Error al desactivar cuadrilla');
            }
        } catch (error) {
            console.error('Error deleting cuadrilla:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            {/* Header - Collapsible */}
            <div className={`flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${headerCollapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
                <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-md border-b border-white/10 p-4">
                    <div className="flex items-center justify-between container mx-auto">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-1">Gestión Diaria de Cuadrillas</h1>
                            <div className="flex flex-col gap-1 text-sm text-white/60">
                                <div className="flex items-center gap-2">
                                    <Info className="w-4 h-4 text-blue-400" />
                                    <span>Cómo usar</span>
                                </div>
                                <ul className="list-disc list-inside pl-6 space-y-0.5 text-xs">
                                    <li>Haz clic en una cuadrilla para verla en detalle</li>
                                    <li>Arrastra trabajadores entre cuadrillas para reasignarlos</li>
                                    <li>Arrastra desde/hacia "Disponibles" para asignar/desasignar personal</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <button
                                onClick={() => setHeaderCollapsed(true)}
                                className="text-white/40 hover:text-white transition-colors p-1"
                                title="Ocultar encabezado"
                            >
                                <ChevronUp className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Collapsed Header Expand Button */}
            <div className={`flex-shrink-0 relative ${!headerCollapsed ? 'hidden' : 'block'}`}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                    <button
                        onClick={() => setHeaderCollapsed(false)}
                        className="bg-purple-900/80 backdrop-blur-sm px-4 py-1 rounded-b-lg border-x border-b border-white/10 text-white/60 hover:text-white text-xs flex items-center gap-1 transition-all hover:pt-3"
                    >
                        <span>Mostrar Instrucciones</span>
                        <ChevronDown className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Toolbar - Always visible */}
            <div className="flex-shrink-0 bg-gray-900/60 backdrop-blur-sm border-b border-white/10 px-4 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-white/80 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">{new Date(fecha).toLocaleDateString('es-CL')}</span>
                        </div>
                        <div className="text-white/50 text-xs">
                            {cuadrillas.length} cuadrillas
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva
                        </button>
                        <button
                            onClick={() => setShowAttendanceModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <ClipboardList className="w-4 h-4" />
                            Asistencia
                        </button>
                        <button
                            onClick={refreshData}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            <span>Actualizar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Kanban Board - Split Layout */}
            <div className="flex-1 flex gap-2 items-start px-3 py-2 overflow-hidden">
                {/* LEFT PANEL: First selected cuadrilla */}
                {leftCuadrilla && (
                    <div className="w-80 flex-shrink-0 h-full overflow-y-auto custom-scrollbar">
                        <div className="relative">
                            <button
                                onClick={() => setLeftCuadrilla(null)}
                                className="absolute -top-1 -right-1 z-10 p-1 bg-red-500/80 hover:bg-red-600 rounded-full text-white text-xs"
                                title="Cerrar"
                            >
                                ✕
                            </button>
                            <CuadrillaColumn
                                key={leftCuadrilla.id}
                                cuadrilla={leftCuadrilla}
                                onDragOver={handleDragOver}
                                onDrop={handleDropOnCuadrilla}
                                onDragStart={handleDragStart}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                absentWorkers={absentWorkers}
                            />
                        </div>
                    </div>
                )}

                {/* MIDDLE PANEL: Second selected cuadrilla */}
                {rightCuadrilla && (
                    <div className="w-80 flex-shrink-0 h-full overflow-y-auto custom-scrollbar">
                        <div className="relative">
                            <button
                                onClick={() => setRightCuadrilla(null)}
                                className="absolute -top-1 -right-1 z-10 p-1 bg-red-500/80 hover:bg-red-600 rounded-full text-xs text-white"
                                title="Cerrar"
                            >
                                ✕
                            </button>
                            <CuadrillaColumn
                                key={rightCuadrilla.id}
                                cuadrilla={rightCuadrilla}
                                onDragOver={handleDragOver}
                                onDrop={handleDropOnCuadrilla}
                                onDragStart={handleDragStart}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                absentWorkers={absentWorkers}
                            />
                        </div>
                    </div>
                )}

                {/* RIGHT PANEL: Grid of remaining cuadrillas */}
                <div className="flex-1 pr-1 h-full overflow-y-auto custom-scrollbar">
                    {(leftCuadrilla || rightCuadrilla) && (
                        <div className="text-xs text-white/50 mb-2 px-1 sticky top-0 bg-[#0f172a] z-10 py-1">
                            {!leftCuadrilla || !rightCuadrilla
                                ? 'Selecciona otra cuadrilla para comparar'
                                : 'Trabajadores mostrados en las dos cuadrillas seleccionadas'}
                        </div>
                    )}

                    {!leftCuadrilla && !rightCuadrilla && (
                        <div className="text-xs text-white/50 mb-2 px-1 sticky top-0 bg-[#0f172a] z-10 py-1">
                            Selecciona hasta 2 cuadrillas para ver detalles
                        </div>
                    )}

                    {/* RESPONSIVE GRID - UP TO 5 COLUMNS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-20">
                        {cuadrillas
                            .filter(c => c.id !== leftCuadrilla?.id && c.id !== rightCuadrilla?.id)
                            .map((cuadrilla) => (
                                <div
                                    key={cuadrilla.id}
                                    onClick={() => {
                                        // Smart selection: fill left first, then right
                                        if (!leftCuadrilla) {
                                            setLeftCuadrilla(cuadrilla);
                                        } else if (!rightCuadrilla) {
                                            setRightCuadrilla(cuadrilla);
                                        } else {
                                            // Both filled, replace the left one
                                            setLeftCuadrilla(cuadrilla);
                                        }
                                    }}
                                    className="cursor-pointer hover:scale-[1.02] transition-transform"
                                >
                                    <CuadrillaColumn
                                        cuadrilla={cuadrilla}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDropOnCuadrilla}
                                        onDragStart={handleDragStart}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        absentWorkers={absentWorkers}
                                        compact={true} // New prop to make cards more compact in grid
                                    />
                                </div>
                            ))}
                    </div>

                    {cuadrillas.length === 0 && (
                        <div className="text-center py-12 text-white/40">
                            <Users className="w-16 h-16 mx-auto mb-3 opacity-30" />
                            <p className="text-lg">No hay cuadrillas activas</p>
                            <p className="text-sm mt-2">Crea cuadrillas primero para gestionar personal</p>
                        </div>
                    )}
                </div>
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

            {/* Edit Cuadrilla Modal */}
            {editingCuadrilla && (
                <EditCuadrillaModal
                    cuadrilla={editingCuadrilla}
                    onClose={() => setEditingCuadrilla(null)}
                    onSuccess={() => {
                        refreshData();
                        setEditingCuadrilla(null);
                    }}
                />
            )}

            {/* Create Cuadrilla Modal */}
            {showCreateModal && (
                <CreateCuadrillaModal
                    proyectoId={proyectoId}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={refreshData}
                />
            )}

            {/* Attendance Modal */}
            <AttendanceModal
                isOpen={showAttendanceModal}
                onClose={() => setShowAttendanceModal(false)}
                proyectoId={proyectoId}
                onSave={refreshData}
            />
        </div>
    );
}

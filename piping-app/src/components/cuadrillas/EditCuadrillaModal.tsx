/**
 * EditCuadrillaModal Component
 * Modal form to edit an existing cuadrilla
 */

'use client';

import React from 'react';
import { X, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EditCuadrillaModalProps {
    cuadrilla: {
        id: string;
        nombre: string;
        codigo?: string;
        tipo?: string;
        descripcion?: string;
        shift_id?: string;
        proyecto_id: string; // Required for loading shifts
    };
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditCuadrillaModal({
    cuadrilla,
    onClose,
    onSuccess
}: EditCuadrillaModalProps) {
    const [loading, setLoading] = React.useState(false);
    const [shifts, setShifts] = React.useState<Array<{ id: string; shift_name: string; is_default: boolean }>>([]);
    const [formData, setFormData] = React.useState({
        nombre: cuadrilla.nombre || '',
        codigo: cuadrilla.codigo || '',
        tipo: cuadrilla.tipo || 'PRINCIPAL',
        descripcion: cuadrilla.descripcion || '',
        shift_id: cuadrilla.shift_id || ''
    });

    React.useEffect(() => {
        loadShifts();
    }, [cuadrilla.proyecto_id]);

    const loadShifts = async () => {
        try {
            const { data, error } = await supabase
                .from('project_shifts')
                .select('id, shift_name, is_default')
                .eq('proyecto_id', cuadrilla.proyecto_id)
                .eq('active', true)
                .order('is_default', { ascending: false });

            if (error) throw error;
            setShifts(data || []);
        } catch (error) {
            console.error('Error loading shifts:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        console.log('📝 Submitting edit for cuadrilla:', cuadrilla);

        if (!cuadrilla.id) {
            alert('Error interno: ID de cuadrilla no encontrado');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`/api/cuadrillas/${cuadrilla.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                onSuccess();
                onClose();
            } else {
                alert('Error: ' + (result.error || 'No se pudo actualizar la cuadrilla'));
            }
        } catch (error: any) {
            console.error('Error updating cuadrilla:', error);
            alert('Error de conexión: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-2xl font-bold text-white">Editar Cuadrilla</h2>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Nombre <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ej: Cuadrilla Principal A"
                        />
                    </div>

                    {/* Código */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Código <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.codigo}
                            onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ej: 03"
                        />
                    </div>

                    {/* Tipo */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Tipo <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={formData.tipo}
                            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="PRINCIPAL" className="bg-purple-900">Principal</option>
                            <option value="APOYO" className="bg-purple-900">Apoyo</option>
                        </select>
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Descripción (opcional)
                        </label>
                        <textarea
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Detalles adicionales..."
                            rows={3}
                        />
                    </div>

                    {/* Turno */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Turno <span className="text-red-400">*</span>
                        </label>
                        {shifts.length === 0 ? (
                            <div className="text-sm text-white/40 italic">
                                Cargando turnos...
                            </div>
                        ) : (
                            <select
                                value={formData.shift_id}
                                onChange={(e) => setFormData({ ...formData, shift_id: e.target.value })}
                                required
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="" className="bg-purple-900">Seleccionar turno...</option>
                                {shifts.map(shift => (
                                    <option key={shift.id} value={shift.id} className="bg-purple-900">
                                        {shift.shift_name} {shift.is_default ? '(Default)' : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

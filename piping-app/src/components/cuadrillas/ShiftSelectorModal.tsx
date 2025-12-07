'use client'

import { useState, useEffect } from 'react'
import { X, Sun, Moon, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Shift {
    id: string
    shift_name: string
    start_time: string
    end_time: string
    is_default: boolean
}

interface ShiftSelectorModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    onSelect: (shiftId: string) => void
    workerName?: string
}

export default function ShiftSelectorModal({ isOpen, onClose, projectId, onSelect, workerName }: ShiftSelectorModalProps) {
    const [loading, setLoading] = useState(false)
    const [shifts, setShifts] = useState<Shift[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && projectId) {
            loadShifts()
        }
    }, [isOpen, projectId])

    async function loadShifts() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('project_shifts')
                .select('id, shift_name, start_time, end_time, is_default')
                .eq('proyecto_id', projectId)
                .eq('active', true)
                .order('is_default', { ascending: false })

            if (error) throw error

            setShifts(data || [])

            // Auto-select default shift
            const defaultShift = data?.find(s => s.is_default)
            if (defaultShift) {
                setSelectedId(defaultShift.id)
            }
        } catch (error) {
            console.error('Error loading shifts:', error)
        } finally {
            setLoading(false)
        }
    }

    function handleConfirm() {
        if (selectedId) {
            onSelect(selectedId)
            onClose()
        }
    }

    const getShiftIcon = (shiftName: string) => {
        const nameLower = shiftName.toLowerCase()
        if (nameLower.includes('noche') || nameLower.includes('night')) {
            return <Moon className="w-5 h-5" />
        }
        return <Sun className="w-5 h-5" />
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-purple-100 p-2 text-purple-600">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Seleccionar Turno</h3>
                            {workerName && (
                                <p className="text-sm text-gray-600">{workerName}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-400 hover:bg-white/50 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                        </div>
                    ) : shifts.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            No hay turnos configurados para este proyecto
                        </div>
                    ) : (
                        shifts.map((shift) => (
                            <button
                                key={shift.id}
                                onClick={() => setSelectedId(shift.id)}
                                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${selectedId === shift.id
                                        ? 'border-purple-500 bg-purple-50 shadow-md'
                                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`rounded-lg p-2 ${selectedId === shift.id
                                            ? 'bg-purple-100 text-purple-600'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {getShiftIcon(shift.shift_name)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-gray-900">{shift.shift_name}</h4>
                                            {shift.is_default && (
                                                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-0.5">
                                            {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                        </p>
                                    </div>
                                    {selectedId === shift.id && (
                                        <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-white"></div>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedId || loading}
                        className="rounded-lg px-6 py-2 text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    )
}

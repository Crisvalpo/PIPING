/**
 * IMPACT VERIFICATION VIEW
 * 
 * Vista principal para comparar dos revisiones de un isométrico,
 * visualizar impactos y aprobar migración de avances.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { ImpactComparisonResult, WeldWithExecution } from '@/types/impact-verification';
import ImpactSummaryCards from './ImpactSummaryCards';

interface ImpactVerificationViewProps {
    oldRevisionId: string;
    newRevisionId: string;
    isoNumber: string;
    onMigrationComplete?: () => void;
}

export default function ImpactVerificationView({
    oldRevisionId,
    newRevisionId,
    isoNumber,
    onMigrationComplete
}: ImpactVerificationViewProps) {
    const [comparison, setComparison] = useState<ImpactComparisonResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'welds' | 'materials' | 'bolted_joints'>('welds');

    // Estados para selección de elementos a migrar
    const [selectedWeldIds, setSelectedWeldIds] = useState<Set<string>>(new Set());
    const [selectedBoltedJointIds, setSelectedBoltedJointIds] = useState<Set<string>>(new Set());

    // Estado de aprobación
    const [isApproving, setIsApproving] = useState(false);
    const [approvalNotes, setApprovalNotes] = useState('');

    // Cargar comparación al montar
    useEffect(() => {
        loadComparison();
    }, [oldRevisionId, newRevisionId]);

    // Pre-seleccionar elementos que pueden migrarse automáticamente
    useEffect(() => {
        if (!comparison) return;

        // Pre-seleccionar welds que pueden migrarse
        const canMigrateWeldIds = comparison.new_revision.welds
            .filter(w => w.can_migrate)
            .map(w => w.id);
        setSelectedWeldIds(new Set(canMigrateWeldIds));

        // Pre-seleccionar bolted joints que pueden migrarse
        const canMigrateBoltedIds = comparison.new_revision.bolted_joints
            .filter(j => j.can_migrate)
            .map(j => j.id);
        setSelectedBoltedJointIds(new Set(canMigrateBoltedIds));
    }, [comparison]);

    async function loadComparison() {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/impact-verification/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    old_revision_id: oldRevisionId,
                    new_revision_id: newRevisionId
                })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Error al comparar revisiones');
            }

            setComparison(result.data);
        } catch (err: any) {
            console.error('Error loading comparison:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleApproveMigration() {
        if (!comparison) return;

        if (selectedWeldIds.size === 0 && selectedBoltedJointIds.size === 0) {
            alert('Debes seleccionar al menos un elemento para migrar');
            return;
        }

        const confirmMessage = `¿Confirmas migrar ${selectedWeldIds.size} soldaduras y ${selectedBoltedJointIds.size} juntas empernadas?\n\nEsto marcará la nueva revisión como SPOOLEADO.`;

        if (!confirm(confirmMessage)) return;

        try {
            setIsApproving(true);

            const response = await fetch('/api/impact-verification/approve-migration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    old_revision_id: oldRevisionId,
                    new_revision_id: newRevisionId,
                    approved_weld_ids: Array.from(selectedWeldIds),
                    approved_bolted_joint_ids: Array.from(selectedBoltedJointIds),
                    approval_notes: approvalNotes || undefined
                })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Error al aprobar migración');
            }

            alert(`✅ Migración completada:\n- ${result.data.migrated_welds} soldaduras migradas\n- ${result.data.migrated_bolted_joints} juntas empernadas migradas`);

            if (onMigrationComplete) {
                onMigrationComplete();
            }
        } catch (err: any) {
            console.error('Error approving migration:', err);
            alert(`Error: ${err.message}`);
        } finally {
            setIsApproving(false);
        }
    }

    function toggleWeldSelection(weldId: string) {
        const newSet = new Set(selectedWeldIds);
        if (newSet.has(weldId)) {
            newSet.delete(weldId);
        } else {
            newSet.add(weldId);
        }
        setSelectedWeldIds(newSet);
    }

    function toggleBoltedJointSelection(jointId: string) {
        const newSet = new Set(selectedBoltedJointIds);
        if (newSet.has(jointId)) {
            newSet.delete(jointId);
        } else {
            newSet.add(jointId);
        }
        setSelectedBoltedJointIds(newSet);
    }

    function selectAllMigrable(type: 'welds' | 'bolted_joints') {
        if (!comparison) return;

        if (type === 'welds') {
            const allMigrable = comparison.new_revision.welds
                .filter(w => w.can_migrate)
                .map(w => w.id);
            setSelectedWeldIds(new Set(allMigrable));
        } else {
            const allMigrable = comparison.new_revision.bolted_joints
                .filter(j => j.can_migrate)
                .map(j => j.id);
            setSelectedBoltedJointIds(new Set(allMigrable));
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Comparando revisiones...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-red-800 font-semibold mb-2">Error al Comparar Revisiones</h3>
                <p className="text-red-700">{error}</p>
                <button
                    onClick={loadComparison}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    if (!comparison) {
        return <div>No se pudo cargar la comparación</div>;
    }

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-2">Verificación de Impactos</h2>
                <p className="text-blue-100">
                    Isométrico: <span className="font-semibold">{isoNumber}</span>
                </p>
                <div className="mt-4 flex gap-6 text-sm">
                    <div>
                        <span className="text-blue-200">Revisión Anterior:</span>
                        <span className="font-semibold ml-2">{comparison.old_revision.codigo}</span>
                        <span className="ml-3 text-xs bg-gray-700 px-2 py-1 rounded">OBSOLETA</span>
                    </div>
                    <div>
                        <span className="text-blue-200">Nueva Revisión:</span>
                        <span className="font-semibold ml-2">{comparison.new_revision.codigo}</span>
                        <span className="ml-3 text-xs bg-blue-500 px-2 py-1 rounded">VIGENTE</span>
                    </div>
                </div>
            </div>

            {/* SUMMARY CARDS */}
            <ImpactSummaryCards summary={comparison.summary} />

            {/* TABS */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="border-b border-gray-200">
                    <div className="flex gap-2 px-6 pt-4">
                        <button
                            onClick={() => setActiveTab('welds')}
                            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${activeTab === 'welds'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Soldaduras ({comparison.new_revision.welds.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('materials')}
                            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${activeTab === 'materials'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Material Take-Off ({comparison.new_revision.materials.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('bolted_joints')}
                            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${activeTab === 'bolted_joints'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Juntas Empernadas ({comparison.new_revision.bolted_joints.length})
                        </button>
                    </div>
                </div>

                {/* TAB CONTENT */}
                <div className="p-6">
                    {activeTab === 'welds' && (
                        <WeldsComparisonTab
                            welds={comparison.new_revision.welds}
                            selectedIds={selectedWeldIds}
                            onToggleSelection={toggleWeldSelection}
                            onSelectAllMigrable={() => selectAllMigrable('welds')}
                        />
                    )}

                    {activeTab === 'materials' && (
                        <MaterialsComparisonTab
                            materials={comparison.new_revision.materials}
                        />
                    )}

                    {activeTab === 'bolted_joints' && (
                        <BoltedJointsComparisonTab
                            joints={comparison.new_revision.bolted_joints}
                            selectedIds={selectedBoltedJointIds}
                            onToggleSelection={toggleBoltedJointSelection}
                            onSelectAllMigrable={() => selectAllMigrable('bolted_joints')}
                        />
                    )}
                </div>
            </div>

            {/* APPROVAL SECTION */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Aprobar Migración</h3>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notas de Aprobación (opcional)
                    </label>
                    <textarea
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Comentarios sobre la aprobación..."
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        <p>Elementos seleccionados para migrar:</p>
                        <ul className="mt-2 space-y-1">
                            <li>• {selectedWeldIds.size} soldaduras</li>
                            <li>• {selectedBoltedJointIds.size} juntas empernadas</li>
                        </ul>
                    </div>

                    <button
                        onClick={handleApproveMigration}
                        disabled={isApproving || (selectedWeldIds.size === 0 && selectedBoltedJointIds.size === 0)}
                        className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isApproving ? 'Procesando...' : '✓ Aprobar y Marcar como SPOOLEADO'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =====================================================
// SUB-COMPONENTS (Tabs)
// =====================================================

function WeldsComparisonTab({
    welds,
    selectedIds,
    onToggleSelection,
    onSelectAllMigrable
}: {
    welds: WeldWithExecution[];
    selectedIds: Set<string>;
    onToggleSelection: (id: string) => void;
    onSelectAllMigrable: () => void;
}) {
    const [filter, setFilter] = useState<'all' | 'can_migrate' | 'blocked' | 'new'>('all');

    const filteredWelds = welds.filter(w => {
        if (filter === 'all') return true;
        if (filter === 'can_migrate') return w.can_migrate;
        if (filter === 'blocked') return w.migration_status === 'BLOCKED';
        if (filter === 'new') return w.migration_status === 'NEW';
        return true;
    });

    return (
        <div>
            {/* Filters and Actions */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                        Todos ({welds.length})
                    </button>
                    <button
                        onClick={() => setFilter('can_migrate')}
                        className={`px-4 py-2 rounded ${filter === 'can_migrate' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
                    >
                        Migrables ({welds.filter(w => w.can_migrate).length})
                    </button>
                    <button
                        onClick={() => setFilter('blocked')}
                        className={`px-4 py-2 rounded ${filter === 'blocked' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
                    >
                        Impactados ({welds.filter(w => w.migration_status === 'BLOCKED').length})
                    </button>
                    <button
                        onClick={() => setFilter('new')}
                        className={`px-4 py-2 rounded ${filter === 'new' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    >
                        Nuevos ({welds.filter(w => w.migration_status === 'NEW').length})
                    </button>
                </div>

                <button
                    onClick={onSelectAllMigrable}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Seleccionar Todos los Migrables
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seleccionar</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weld #</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Spool</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NPS</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Migración</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredWelds.map((weld) => (
                            <tr key={weld.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(weld.id)}
                                        onChange={() => onToggleSelection(weld.id)}
                                        disabled={!weld.can_migrate}
                                        className="w-4 h-4"
                                    />
                                </td>
                                <td className="px-4 py-3 text-sm font-medium">{weld.weld_number}</td>
                                <td className="px-4 py-3 text-sm">{weld.spool_number}</td>
                                <td className="px-4 py-3 text-sm">{weld.type_weld}</td>
                                <td className="px-4 py-3 text-sm">{weld.nps}"</td>
                                <td className="px-4 py-3">
                                    {weld.executed && (
                                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Ejecutado</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {weld.can_migrate && (
                                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">✓ Migrable</span>
                                    )}
                                    {weld.migration_status === 'BLOCKED' && (
                                        <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">✗ Impactado</span>
                                    )}
                                    {weld.migration_status === 'NEW' && (
                                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">🆕 Nuevo</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MaterialsComparisonTab({ materials }: { materials: any[] }) {
    return (
        <div>
            <p className="text-gray-600 mb-4">Comparación detallada de Material Take-Off</p>
            {/* TODO: Implementar tabla de materiales */}
            <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600">Vista de materiales en desarrollo...</p>
            </div>
        </div>
    );
}

function BoltedJointsComparisonTab({
    joints,
    selectedIds,
    onToggleSelection,
    onSelectAllMigrable
}: {
    joints: any[];
    selectedIds: Set<string>;
    onToggleSelection: (id: string) => void;
    onSelectAllMigrable: () => void;
}) {
    return (
        <div>
            <p className="text-gray-600 mb-4">Comparación de juntas empernadas</p>
            {/* TODO: Implementar tabla similar a welds */}
            <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600">Vista de juntas empernadas en desarrollo...</p>
                <p className="text-xs text-gray-500 mt-2">Total: {joints.length} juntas</p>
            </div>
        </div>
    );
}

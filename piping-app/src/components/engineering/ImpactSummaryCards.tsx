/**
 * IMPACT SUMMARY CARDS
 * 
 * Componente para mostrar cards con resumen de impactos detectados
 * entre dos revisiones de un isométrico.
 */

'use client';

import React from 'react';
import type { ImpactSummary } from '@/types/impact-verification';

interface ImpactSummaryCardsProps {
    summary: ImpactSummary;
}

export default function ImpactSummaryCards({ summary }: ImpactSummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* WELDS SUMMARY */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Soldaduras (Welds)</h3>
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Revisión Anterior:</span>
                        <span className="text-sm font-medium">{summary.welds.total_old}</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Nueva Revisión:</span>
                        <span className="text-sm font-medium">{summary.welds.total_new}</span>
                    </div>

                    <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Ejecutadas (anterior):</span>
                            <span className="text-sm font-medium text-blue-600">{summary.welds.executed_old}</span>
                        </div>

                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-green-600 flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                Pueden migrarse:
                            </span>
                            <span className="text-sm font-semibold text-green-600">{summary.welds.can_migrate}</span>
                        </div>

                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-red-600 flex items-center">
                                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                Impactadas:
                            </span>
                            <span className="text-sm font-semibold text-red-600">{summary.welds.blocked}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-blue-600 flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                Nuevas:
                            </span>
                            <span className="text-sm font-medium text-blue-600">{summary.welds.added}</span>
                        </div>

                        {summary.welds.removed > 0 && (
                            <div className="flex justify-between items-center mt-2 p-2 bg-yellow-50 rounded">
                                <span className="text-sm text-yellow-700 font-medium">⚠️ Eliminadas:</span>
                                <span className="text-sm font-semibold text-yellow-700">{summary.welds.removed}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MATERIALS SUMMARY */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Material Take-Off</h3>
                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Items Anteriores:</span>
                        <span className="text-sm font-medium">{summary.materials.total_old_items}</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Items Nuevos:</span>
                        <span className="text-sm font-medium">{summary.materials.total_new_items}</span>
                    </div>

                    <div className="border-t pt-3 mt-3">
                        {summary.materials.total_qty_increase > 0 && (
                            <div className="flex justify-between items-center mb-2 p-2 bg-red-50 rounded">
                                <span className="text-sm text-red-600 font-medium">📈 Aumento Total:</span>
                                <span className="text-sm font-semibold text-red-600">+{summary.materials.total_qty_increase.toFixed(2)}</span>
                            </div>
                        )}

                        {summary.materials.total_qty_decrease > 0 && (
                            <div className="flex justify-between items-center mb-2 p-2 bg-green-50 rounded">
                                <span className="text-sm text-green-600 font-medium">📉 Reducción Total:</span>
                                <span className="text-sm font-semibold text-green-600">-{summary.materials.total_qty_decrease.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-purple-600">Items con cambios:</span>
                            <span className="text-sm font-medium text-purple-600">{summary.materials.items_with_delta}</span>
                        </div>

                        {summary.materials.items_added > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-blue-600">Items añadidos:</span>
                                <span className="text-sm font-medium text-blue-600">{summary.materials.items_added}</span>
                            </div>
                        )}

                        {summary.materials.items_removed > 0 && (
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-sm text-gray-600">Items eliminados:</span>
                                <span className="text-sm font-medium text-gray-600">{summary.materials.items_removed}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BOLTED JOINTS SUMMARY */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-amber-500">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Juntas Empernadas</h3>
                    <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Revisión Anterior:</span>
                        <span className="text-sm font-medium">{summary.bolted_joints.total_old}</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Nueva Revisión:</span>
                        <span className="text-sm font-medium">{summary.bolted_joints.total_new}</span>
                    </div>

                    <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Ejecutadas (anterior):</span>
                            <span className="text-sm font-medium text-amber-600">{summary.bolted_joints.executed_old}</span>
                        </div>

                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-green-600 flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                Pueden migrarse:
                            </span>
                            <span className="text-sm font-semibold text-green-600">{summary.bolted_joints.can_migrate}</span>
                        </div>

                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-red-600 flex items-center">
                                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                Impactadas:
                            </span>
                            <span className="text-sm font-semibold text-red-600">{summary.bolted_joints.blocked}</span>
                        </div>

                        {summary.bolted_joints.removed > 0 && (
                            <div className="flex justify-between items-center mt-2 p-2 bg-yellow-50 rounded">
                                <span className="text-sm text-yellow-700 font-medium">⚠️ Eliminadas:</span>
                                <span className="text-sm font-semibold text-yellow-700">{summary.bolted_joints.removed}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* OVERALL STATUS BADGE */}
            {summary.has_blocking_impacts && (
                <div className="col-span-full">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                        <div className="flex items-center">
                            <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <h4 className="text-red-800 font-semibold">Impactos Bloqueantes Detectados</h4>
                                <p className="text-red-700 text-sm mt-1">
                                    Esta revisión tiene cambios críticos que requieren aprobación manual antes de marcarla como SPOOLEADO.
                                    Revisa los elementos impactados y decide cuáles pueden migrarse.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!summary.has_blocking_impacts && summary.welds.can_migrate > 0 && (
                <div className="col-span-full">
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                        <div className="flex items-center">
                            <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h4 className="text-green-800 font-semibold">Migración Automática Disponible</h4>
                                <p className="text-green-700 text-sm mt-1">
                                    Los avances de la revisión anterior pueden migrarse automáticamente.
                                    Puedes aprobar la migración y marcar como SPOOLEADO.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

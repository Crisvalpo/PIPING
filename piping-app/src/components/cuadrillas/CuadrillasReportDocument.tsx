'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Styles - Darker colors for better print visibility
const styles = StyleSheet.create({
    page: {
        padding: 30,
        backgroundColor: '#ffffff',
    },
    header: {
        backgroundColor: '#1e3a5f',
        borderRadius: 8,
        padding: 20,
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 10,
        color: '#cbd5e1',
        textAlign: 'center',
    },
    // Summary Section
    summarySection: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    summaryTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 10,
        textAlign: 'center',
    },
    summaryTable: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    summaryItem: {
        width: '25%',
        padding: 8,
        alignItems: 'center',
    },
    summaryCount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e40af',
    },
    summaryLabel: {
        fontSize: 8,
        color: '#64748b',
        textAlign: 'center',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#cbd5e1',
    },
    totalLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    totalCount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#059669',
        marginLeft: 8,
    },
    // Supervisor Section
    supervisorSection: {
        marginBottom: 16,
    },
    supervisorHeader: {
        backgroundColor: '#2563eb',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        padding: 10,
    },
    supervisorName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    supervisorCount: {
        fontSize: 9,
        color: '#bfdbfe',
        marginTop: 2,
    },
    // Cuadrilla Card - Darker colors, with minPresenceAhead
    cuadrillaCard: {
        backgroundColor: '#e2e8f0',
        borderRadius: 6,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#94a3b8',
        overflow: 'hidden',
    },
    cuadrillaHeader: {
        backgroundColor: '#334155',
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cuadrillaHeaderLeft: {
        flexDirection: 'column',
        flex: 1,
    },
    cuadrillaName: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    cuadrillaSubtotals: {
        fontSize: 8,
        color: '#cbd5e1',
        marginTop: 2,
    },
    cuadrillaCodigo: {
        fontSize: 9,
        color: '#e2e8f0',
        backgroundColor: '#1e293b',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    // Cargo Group Section
    cargoGroupHeader: {
        backgroundColor: '#94a3b8',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#64748b',
    },
    cargoGroupTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    cargoGroupCount: {
        fontSize: 8,
        color: '#475569',
    },
    // Member Row
    memberRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1',
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: '#f8fafc',
    },
    memberRowAlt: {
        backgroundColor: '#e2e8f0',
    },
    memberCode: {
        width: '20%',
        fontSize: 8,
        color: '#475569',
    },
    memberName: {
        width: '60%',
        fontSize: 9,
        color: '#1e293b',
    },
    memberAbsent: {
        color: '#991b1b',
        textDecoration: 'line-through',
    },
    absentTag: {
        fontSize: 7,
        color: '#ffffff',
        backgroundColor: '#dc2626',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 3,
        marginLeft: 4,
    },
    absentRow: {
        backgroundColor: '#fef2f2',
        borderLeftWidth: 3,
        borderLeftColor: '#dc2626',
    },
    absentSummary: {
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    absentCount: {
        fontSize: 10,
        color: '#dc2626',
        fontWeight: 'bold',
    },
    footer: {
        marginTop: 30,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#cbd5e1',
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 8,
        color: '#64748b',
    },
    noMembers: {
        padding: 10,
        fontSize: 9,
        color: '#64748b',
        fontStyle: 'italic',
        textAlign: 'center',
    },
});

interface Member {
    rut: string;
    nombre: string;
    cargo?: string;
    rol?: string;
    estampa?: string;
    codigo?: string;
}

interface Cuadrilla {
    id: string;
    nombre: string;
    codigo?: string;
    supervisor?: { rut: string; nombre: string } | null;
    capataz?: { rut: string; nombre: string } | null;
    trabajadores_actuales?: Member[];
}

interface CuadrillasReportProps {
    cuadrillas: Cuadrilla[];
    projectName: string;
    date: string;
    absentWorkers?: string[]; // Array of RUTs that are absent
}

// Group cuadrillas by supervisor
function groupBySupervisor(cuadrillas: Cuadrilla[]): Map<string, { supervisor: string; cuadrillas: Cuadrilla[]; totalMembers: number }> {
    const groups = new Map<string, { supervisor: string; cuadrillas: Cuadrilla[]; totalMembers: number }>();

    cuadrillas.forEach(c => {
        const supervisorKey = c.supervisor?.rut || 'sin-supervisor';
        const supervisorName = c.supervisor?.nombre || 'Sin Supervisor Asignado';

        if (!groups.has(supervisorKey)) {
            groups.set(supervisorKey, { supervisor: supervisorName, cuadrillas: [], totalMembers: 0 });
        }
        const group = groups.get(supervisorKey)!;
        group.cuadrillas.push(c);
        group.totalMembers += (c.trabajadores_actuales?.length || 0);
    });

    return groups;
}

// Count members by cargo (global summary) - excludes absents
function countByCargo(cuadrillas: Cuadrilla[], absentSet: Set<string>): { counts: Map<string, number>; totalAbsent: number } {
    const counts = new Map<string, number>();
    let totalAbsent = 0;

    cuadrillas.forEach(c => {
        c.trabajadores_actuales?.forEach(member => {
            if (absentSet.has(member.rut)) {
                totalAbsent++;
                return; // Don't count absents
            }
            const cargo = member.cargo || member.rol || 'Sin Cargo';
            counts.set(cargo, (counts.get(cargo) || 0) + 1);
        });
    });

    return { counts, totalAbsent };
}

// Group members by cargo within a cuadrilla
function groupMembersByCargo(members: Member[]): Map<string, Member[]> {
    const groups = new Map<string, Member[]>();

    members.forEach(member => {
        const cargo = member.cargo || member.rol || 'Sin Cargo';
        if (!groups.has(cargo)) {
            groups.set(cargo, []);
        }
        groups.get(cargo)!.push(member);
    });

    return groups;
}

// Get subtotals string for cuadrilla header - excludes absents
function getCuadrillaSubtotals(members: Member[], absentSet: Set<string>): { subtotals: string; presentCount: number; absentCount: number } {
    const presentMembers = members.filter(m => !absentSet.has(m.rut));
    const absentCount = members.length - presentMembers.length;
    const cargoGroups = groupMembersByCargo(presentMembers);
    const parts: string[] = [];

    cargoGroups.forEach((memberList, cargo) => {
        const shortCargo = cargo.replace('PIPING', '').trim();
        parts.push(`${memberList.length} ${shortCargo}`);
    });

    return {
        subtotals: parts.join(' | '),
        presentCount: presentMembers.length,
        absentCount
    };
}

// Get member code - prioritize estampa for soldadores, then codigo, fallback to RUT prefix
function getMemberCode(member: Member): string {
    if (member.estampa) return member.estampa;
    if (member.codigo) return member.codigo;
    // Fallback: use RUT without formatting
    return member.rut.replace(/\./g, '').replace(/-/g, '').substring(0, 8);
}

export default function CuadrillasReportDocument({ cuadrillas, projectName, date, absentWorkers = [] }: CuadrillasReportProps) {
    // Create a Set for quick lookup of absent workers
    const absentSet = new Set(absentWorkers);

    const supervisorGroups = groupBySupervisor(cuadrillas);
    const { counts: cargoCounts, totalAbsent } = countByCargo(cuadrillas, absentSet);
    const totalMembers = Array.from(cargoCounts.values()).reduce((a: number, b: number) => a + b, 0);

    // Sort cargo counts for display
    const sortedCargos = Array.from(cargoCounts.entries()).sort((a, b) => b[1] - a[1]);

    // Calculate dynamic page height based on content
    // Base: header(80) + summary(150) + margins(60) + footer(40)
    // Per supervisor: header(40)
    // Per cuadrilla: header(50) + per cargo group(25) + per member(22)
    let estimatedHeight = 330; // Base height

    cuadrillas.forEach(c => {
        const members = c.trabajadores_actuales || [];
        const cargoGroups = groupMembersByCargo(members);
        estimatedHeight += 50; // Cuadrilla header
        estimatedHeight += cargoGroups.size * 25; // Cargo group headers
        estimatedHeight += members.length * 22; // Member rows
    });

    // Add supervisor headers
    estimatedHeight += supervisorGroups.size * 50;

    // Ensure minimum height and add buffer
    const pageHeight = Math.max(estimatedHeight + 100, 600);

    // Letter width in points (8.5 inches * 72)
    const pageWidth = 612;

    return (
        <Document>
            <Page size={{ width: pageWidth, height: pageHeight }} style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>DISTRIBUCIÓN DE CUADRILLAS</Text>
                    <Text style={styles.headerSubtitle}>
                        Proyecto: {projectName} | Fecha: {date}
                    </Text>
                </View>

                {/* Summary by Cargo */}
                <View style={styles.summarySection}>
                    <Text style={styles.summaryTitle}>RESUMEN POR CARGO</Text>
                    <View style={styles.summaryTable}>
                        {sortedCargos.slice(0, 8).map(([cargo, count], idx) => (
                            <View key={idx} style={styles.summaryItem}>
                                <Text style={styles.summaryCount}>{count}</Text>
                                <Text style={styles.summaryLabel}>{cargo.replace('PIPING', '').trim()}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>TOTAL PRESENTES:</Text>
                        <Text style={styles.totalCount}>{totalMembers}</Text>
                    </View>
                    {totalAbsent > 0 && (
                        <View style={styles.absentSummary}>
                            <Text style={styles.absentCount}>⚠ {totalAbsent} AUSENTE(S) HOY</Text>
                        </View>
                    )}
                </View>

                {/* Content by Supervisor */}
                {Array.from(supervisorGroups.values()).map((group, groupIndex) => (
                    <View key={groupIndex} style={styles.supervisorSection}>
                        {/* Supervisor Header */}
                        <View style={styles.supervisorHeader}>
                            <Text style={styles.supervisorName}>SUPERVISOR: {group.supervisor}</Text>
                            <Text style={styles.supervisorCount}>
                                {group.cuadrillas.length} cuadrillas | {group.totalMembers} trabajadores
                            </Text>
                        </View>

                        {/* Cuadrillas */}
                        {group.cuadrillas.map((cuadrilla) => {
                            const members = cuadrilla.trabajadores_actuales || [];
                            const cargoGroups = groupMembersByCargo(members);
                            const { subtotals, absentCount } = getCuadrillaSubtotals(members, absentSet);

                            return (
                                <View key={cuadrilla.id} style={styles.cuadrillaCard} minPresenceAhead={100}>
                                    {/* Cuadrilla Header with Subtotals */}
                                    <View style={styles.cuadrillaHeader}>
                                        <View style={styles.cuadrillaHeaderLeft}>
                                            <Text style={styles.cuadrillaName}>
                                                {cuadrilla.nombre}
                                                {absentCount > 0 ? ` (${absentCount} ausente${absentCount > 1 ? 's' : ''})` : ''}
                                            </Text>
                                            {subtotals && (
                                                <Text style={styles.cuadrillaSubtotals}>{subtotals}</Text>
                                            )}
                                        </View>
                                        <Text style={styles.cuadrillaCodigo}>{cuadrilla.codigo || 'S/C'}</Text>
                                    </View>

                                    {/* Members Grouped by Cargo */}
                                    {members.length > 0 ? (
                                        Array.from(cargoGroups.entries()).map(([cargo, cargoMembers], cargoIdx) => (
                                            <View key={cargoIdx}>
                                                {/* Cargo Group Header */}
                                                <View style={styles.cargoGroupHeader}>
                                                    <Text style={styles.cargoGroupTitle}>
                                                        {cargo.replace('PIPING', '').trim()} ({cargoMembers.length})
                                                    </Text>
                                                </View>

                                                {/* Members in this cargo */}
                                                {cargoMembers.map((member, mIdx) => {
                                                    const isAbsent = absentSet.has(member.rut);
                                                    const baseStyle = mIdx % 2 === 1 ? [styles.memberRow, styles.memberRowAlt] : [styles.memberRow];
                                                    const rowStyle = isAbsent ? [...baseStyle, styles.absentRow] : baseStyle;

                                                    return (
                                                        <View key={member.rut} style={rowStyle}>
                                                            <Text style={styles.memberCode}>{getMemberCode(member)}</Text>
                                                            <Text style={isAbsent ? [styles.memberName, styles.memberAbsent] : styles.memberName}>
                                                                {member.nombre}
                                                            </Text>
                                                            {isAbsent && (
                                                                <Text style={styles.absentTag}>AUSENTE</Text>
                                                            )}
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.noMembers}>Sin miembros asignados</Text>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                ))}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Generado automáticamente por LukeAPP</Text>
                    <Text>{date}</Text>
                </View>
            </Page>
        </Document>
    );
}

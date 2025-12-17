'use client'

import { useState, useEffect } from 'react'
import type { AppRole } from '@/services/admin-roles'
import type { Permission } from '@/config/roles'
import { PERMISSION_MODULES } from '@/config/roles' // Need to export this or define locally
import { getRoleColor } from '@/config/roles'

// TODO: Move PERMISSION_MODULES to @/config/roles or define here temporarily
// Matching keys in RoleConfig['permisos']
const MODULES = [
    { key: 'lineas', label: 'Líneas' },
    { key: 'isometricos', label: 'Isométricos' },
    { key: 'spools', label: 'Spools' },
    { key: 'materiales', label: 'Materiales' },
    { key: 'testPacks', label: 'Test Packs' },
    { key: 'juntas', label: 'Juntas / Welds' },
    { key: 'usuarios', label: 'Usuarios' },
    { key: 'configuracion', label: 'Configuración' },
    { key: 'reportes', label: 'Reportes' },
]

export default function AdminRolesClient() {
    const [roles, setRoles] = useState<AppRole[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null) // role.id being saved
    const [selectedRole, setSelectedRole] = useState<AppRole | null>(null)

    useEffect(() => {
        loadRoles()
    }, [])

    async function loadRoles() {
        try {
            const res = await fetch('/api/admin/roles')
            const data = await res.json()
            if (res.ok) {
                setRoles(data)
                if (data.length > 0 && !selectedRole) {
                    setSelectedRole(data[0])
                }
            } else {
                console.error(data.error)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // Helper: Check if permission string includes a char
    const hasRight = (permString: string | undefined, char: string) => {
        if (!permString) return false
        return permString.includes(char) || permString.includes('CRUD')
    }

    // Helper: Toggle permission char
    const toggleRight = async (moduleKey: string, char: string) => {
        if (!selectedRole) return

        const currentPerm = (selectedRole.permissions as any)[moduleKey] || ''
        let newPerm = ''

        if (char === 'CRUD') {
            // Toggle FULL access
            newPerm = currentPerm === 'CRUD' ? '' : 'CRUD'
        } else {
            // Toggle granular access (C, R, U, D)
            // If currently CRUD, break it down first
            let parts = currentPerm === 'CRUD' ? ['C', 'R', 'U', 'D'] : currentPerm.split('')

            if (parts.includes(char)) {
                parts = parts.filter((p: string) => p !== char)
            } else {
                parts.push(char)
            }

            // Re-assemble (clean up CRUD shortcut if partial)
            // Check if full C,R,U,D is present -> make it CRUD for cleanliness? Or generic string
            // Let's keep it simple: string concatenation of unique chars
            newPerm = parts.join('')

            // Optional: normalize 'CRUD' if all letters exist?
            // if (['C','R','U','D'].every(c => parts.includes(c))) newPerm = 'CRUD'
        }

        // Optimistic update locally
        const updatedPermissions = {
            ...selectedRole.permissions,
            [moduleKey]: newPerm
        }

        const updatedRole = { ...selectedRole, permissions: updatedPermissions }
        setSelectedRole(updatedRole)

        // Update in global list too
        setRoles(prev => prev.map(r => r.id === selectedRole.id ? updatedRole : r))

        // Trigger save (debounce could be better, but direct save for now)
        await savePermissions(selectedRole.id, updatedPermissions)
    }

    async function savePermissions(roleId: string, permissions: any) {
        setSaving(roleId)
        try {
            const res = await fetch(`/api/admin/roles/${encodeURIComponent(roleId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permissions })
            })

            if (!res.ok) {
                const data = await res.json()
                alert(`Error al guardar: ${data.error}`)
                // Revert? (Not implemented for simplicity)
            }
        } catch (error) {
            console.error(error)
            alert('Error al guardar cambios')
        } finally {
            setSaving(null)
        }
    }

    // Role Categories based on existing UI
    const ROLE_GROUPS = [
        { label: 'Supervisión', roles: ['GERENCIA / JEFE DE PROYECTO', 'P&C (PLANIFICACIÓN)'] },
        { label: 'Cliente', roles: ['CLIENTE / ITO'] },
        { label: 'Ingeniería', roles: ['OFICINA TECNICA', 'CONTROL DOCUMENT'] },
        { label: 'Producción', roles: ['TALLER / PREFABRICACIÓN', 'LOGISTICA', 'EXPEDITOR'] },
        { label: 'Campo', roles: ['SUPERVISOR TERRENO', 'CALIDAD / QA'] },
        { label: 'Gestión de Datos', roles: ['SECRETARIO PIPING', 'SECRETARIO PRECOM'] },
        { label: 'Acceso General', roles: ['SOLO LECTURA', 'USUARIO', 'ADMIN'] },
    ]

    // Helper to find category for a role
    const getRoleCategory = (roleId: string) => {
        for (const group of ROLE_GROUPS) {
            if (group.roles.includes(roleId)) return group.label
        }
        return 'Otros'
    }

    // Skeleton loader that matches the final layout structure
    const LoadingSkeleton = () => (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] gap-6 pb-20 lg:pb-0">
            {/* Sidebar Skeleton */}
            <div className="w-full lg:w-1/4 bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/10 bg-white/5">
                    <div className="h-5 bg-white/10 rounded w-32 mb-2 animate-pulse"></div>
                    <div className="h-3 bg-white/5 rounded w-40 animate-pulse"></div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {/* Role group skeleton */}
                    {[1, 2, 3].map(group => (
                        <div key={group}>
                            <div className="px-4 py-2 bg-white/5">
                                <div className="h-3 bg-white/10 rounded w-24 animate-pulse"></div>
                            </div>
                            {/* Role items skeleton */}
                            {[1, 2, 3].map(item => (
                                <div key={item} className="p-4 border-b border-white/5">
                                    <div className="h-4 bg-white/10 rounded w-48 mb-2 animate-pulse"></div>
                                    <div className="h-4 bg-white/5 rounded w-16 animate-pulse"></div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Panel Skeleton */}
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl flex flex-col overflow-hidden">
                {/* Header Skeleton */}
                <div className="p-6 border-b border-white/10 bg-white/5">
                    <div className="h-6 bg-white/10 rounded w-56 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-white/5 rounded w-72 animate-pulse"></div>
                </div>

                {/* Table Skeleton */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="w-full">
                        {/* Table Header */}
                        <div className="flex border-b border-white/10 pb-3 mb-3">
                            <div className="w-1/3 px-4">
                                <div className="h-3 bg-white/10 rounded w-20 animate-pulse"></div>
                            </div>
                            {[1, 2, 3, 4, 5].map(col => (
                                <div key={col} className="flex-1 px-4 text-center">
                                    <div className="h-3 bg-white/10 rounded w-12 mx-auto animate-pulse"></div>
                                </div>
                            ))}
                        </div>
                        {/* Table Rows */}
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(row => (
                            <div key={row} className="flex border-b border-white/5 py-3">
                                <div className="w-1/3 px-4">
                                    <div className="h-4 bg-white/10 rounded w-32 animate-pulse"></div>
                                </div>
                                {[1, 2, 3, 4].map(col => (
                                    <div key={col} className="flex-1 px-4 flex justify-center">
                                        <div className="h-4 w-4 bg-white/10 rounded animate-pulse"></div>
                                    </div>
                                ))}
                                <div className="flex-1 px-4 flex justify-center">
                                    <div className="h-6 bg-white/10 rounded w-20 animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )

    if (loading) return <LoadingSkeleton />

    // Group roles for display
    const rolesByGroup = ROLE_GROUPS.map(group => ({
        ...group,
        items: roles.filter(r => group.roles.includes(r.id))
    })).filter(g => g.items.length > 0)

    // Add "Otros" group for any role not in the hardcoded list
    const otherRoles = roles.filter(r => !ROLE_GROUPS.some(g => g.roles.includes(r.id)))
    if (otherRoles.length > 0) {
        rolesByGroup.push({ label: 'Otros / Sistema', roles: [], items: otherRoles })
    }

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] gap-6 pb-20 lg:pb-0">

            {/* Sidebar: Lista de Roles */}
            <div className="w-full lg:w-1/4 bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/10 bg-white/5">
                    <h2 className="font-bold text-white">Roles del Sistema</h2>
                    <p className="text-xs text-gray-400 mt-1">Selecciona un rol para editar</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {rolesByGroup.map(group => (
                        <div key={group.label}>
                            <div className="px-4 py-2 bg-white/5 text-xs font-bold text-gray-400 uppercase tracking-wider sticky top-0 backdrop-blur-sm">
                                {group.label}
                            </div>
                            {group.items.map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => setSelectedRole(role)}
                                    className={`w-full text-left p-4 border-b border-white/5 transition-colors hover:bg-white/5 ${selectedRole?.id === role.id ? 'bg-blue-600/20 border-l-4 border-l-blue-500' : 'text-gray-400'
                                        }`}
                                >
                                    <div className="font-bold text-sm text-white mb-1">{role.nombre}</div>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${getRoleColor(role.id)}`}>
                                            Nivel {role.level}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Panel Principal: Matriz de Permisos */}
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl flex flex-col overflow-hidden">
                {selectedRole ? (
                    <>
                        <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1">{selectedRole.nombre}</h2>
                                <p className="text-sm text-gray-400">{selectedRole.descripcion}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {saving === selectedRole.id ? (
                                    <span className="text-xs text-yellow-400 animate-pulse">Guardando...</span>
                                ) : (
                                    <span className="text-xs text-green-400">Sincronizado</span>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                                        <th className="py-3 px-4 w-1/3">Módulo</th>
                                        <th className="py-3 px-4 text-center" title="Create">Crear (C)</th>
                                        <th className="py-3 px-4 text-center" title="Read">Leer (R)</th>
                                        <th className="py-3 px-4 text-center" title="Update">Editar (U)</th>
                                        <th className="py-3 px-4 text-center" title="Delete">Borrar (D)</th>
                                        <th className="py-3 px-4 text-center text-blue-400">TOTAL (CRUD)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-white/5">
                                    {MODULES.map(module => {
                                        const perms = (selectedRole.permissions as any)[module.key]
                                        const canC = hasRight(perms, 'C')
                                        const canR = hasRight(perms, 'R')
                                        const canU = hasRight(perms, 'U')
                                        const canD = hasRight(perms, 'D')
                                        const isFull = perms === 'CRUD'

                                        return (
                                            <tr key={module.key} className="hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-4 font-medium text-gray-200">
                                                    {module.label}
                                                </td>
                                                {/* Checkboxes Granulares */}
                                                {['C', 'R', 'U', 'D'].map(char => {
                                                    const isActive = hasRight(perms, char)
                                                    return (
                                                        <td key={char} className="py-3 px-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isActive}
                                                                onChange={() => toggleRight(module.key, char)}
                                                                className="rounded bg-black/30 border-white/20 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                                                            />
                                                        </td>
                                                    )
                                                })}
                                                {/* Botón Full Access */}
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        onClick={() => toggleRight(module.key, 'CRUD')}
                                                        className={`text-xs px-2 py-1 rounded border transition-colors ${isFull
                                                            ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                                            : 'border-white/10 text-gray-500 hover:border-white/30'
                                                            }`}
                                                    >
                                                        {isFull ? 'FULL ACCESS' : 'Custom'}
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        Selecciona un rol para ver sus permisos
                    </div>
                )}
            </div>
        </div>
    )
}

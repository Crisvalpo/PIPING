
import { create } from 'zustand'
import { getAppRoles, type AppRole } from '@/services/admin-roles'
import { ROLES, type RoleConfig } from '@/config/roles'

interface RolesState {
    roles: Record<string, RoleConfig>
    isLoading: boolean
    error: string | null
    fetchRoles: () => Promise<void>
    getPermission: (roleId: string, module: string) => string
}

export const useRolesStore = create<RolesState>((set, get) => ({
    roles: ROLES, // Initial state: fallback to hardcoded roles
    isLoading: false,
    error: null,

    fetchRoles: async () => {
        set({ isLoading: true, error: null })
        try {
            const appRoles = await getAppRoles()

            // Convert array to Record for easy lookup
            const rolesMap: Record<string, RoleConfig> = { ...ROLES } // Start with defaults

            appRoles.forEach(role => {
                // Merge DB role into map, overriding hardcoded if exists
                rolesMap[role.id] = {
                    ...role,
                    // Ensure permissions object exists
                    permisos: role.permissions || {}
                }
            })

            set({ roles: rolesMap, isLoading: false })
        } catch (error) {
            console.error('Failed to fetch roles:', error)
            set({ error: 'Failed to load roles configuration', isLoading: false })
        }
    },

    getPermission: (roleId: string, module: string) => {
        const role = get().roles[roleId]
        if (!role) return ''
        return (role.permisos as any)[module] || ''
    }
}))

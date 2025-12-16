import { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultSupabase } from '@/lib/supabase'
import type { RoleConfig } from '@/config/roles'

export interface AppRole extends RoleConfig {
    created_at?: string
    updated_at?: string
}

/**
 * Obtiene todos los roles configurados en la base de datos
 */
export async function getAppRoles(client?: SupabaseClient): Promise<AppRole[]> {
    const supabase = client || defaultSupabase
    const { data, error } = await supabase
        .from('app_roles')
        .select('*')
        .order('level', { ascending: true })

    if (error) throw error

    // Parse permissions jsonb strictly if needed, but TS handles it as any/json in Supabase types usually
    // Map DB 'name' to 'nombre' to match RoleConfig interface
    return data?.map(role => ({
        ...role,
        nombre: role.name
    })) as AppRole[]
}

/**
 * Actualiza los permisos de un rol específico
 */
export async function updateAppRolePermissions(roleId: string, permissions: RoleConfig['permisos'], client?: SupabaseClient) {
    const supabase = client || defaultSupabase
    const { data, error } = await supabase
        .from('app_roles')
        .update({
            permissions,
            updated_at: new Date().toISOString()
        })
        .eq('id', roleId)
        .select()
        .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('No se pudo actualizar el rol. Verifique permisos (RLS) o si el ID es correcto.')

    return data as AppRole
}

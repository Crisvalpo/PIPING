import { supabase } from '@/lib/supabase'
import { User } from '@/types/user'

// Obtener todos los usuarios (solo admins)
export async function getAllUsers(): Promise<User[]> {
    try {
        console.log('Intentando obtener usuarios vía RPC...')
        // Intento 1: Usar función RPC que bypas RLS para admins
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_users_admin')

        if (!rpcError && rpcData) {
            console.log('Usuarios obtenidos vía RPC:', rpcData.length)
            return rpcData
        }

        console.warn('RPC falló o no existe, intentando SELECT directo...', rpcError)

        // Intento 2: Select directo (funciona si las políticas RLS están bien)
        const { data: selectData, error: selectError } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

        if (selectError) {
            console.error('Error fetching users (Direct Select):', selectError)
            return []
        }

        console.log('Usuarios obtenidos vía SELECT:', selectData?.length)
        return selectData || []
    } catch (error) {
        console.error('Error crítico en getAllUsers:', error)
        return []
    }
}

// Actualizar el rol de un usuario
export async function updateUserRole(userId: string, newRole: string): Promise<{ success: boolean; message: string }> {
    try {
        const { error } = await supabase
            .from('users')
            .update({ rol: newRole })
            .eq('id', userId)

        if (error) {
            return {
                success: false,
                message: error.message,
            }
        }

        return {
            success: true,
            message: 'Rol actualizado exitosamente',
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error al actualizar el rol',
        }
    }
}

// Verificar si el usuario actual es admin
export async function isAdmin(): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return false

        const { data: userData } = await supabase
            .from('users')
            .select('rol')
            .eq('id', user.id)
            .single()

        // Verificación insensible a mayúsculas/minúsculas
        return userData?.rol?.toUpperCase() === 'ADMIN'
    } catch (error) {
        return false
    }
}

// Eliminar un usuario del sistema (Auth + Public)
export async function deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
        console.log('Intentando eliminar usuario vía RPC:', userId)

        const { error } = await supabase.rpc('delete_user_complete', {
            target_user_id: userId
        })

        if (error) {
            console.error('Error RPC delete_user_complete:', error)
            return {
                success: false,
                message: `Error al eliminar: ${error.message}`,
            }
        }

        return {
            success: true,
            message: 'Usuario eliminado completamente del sistema',
        }
    } catch (error) {
        console.error('Error crítico en deleteUser:', error)
        return {
            success: false,
            message: 'Error inesperado al eliminar usuario',
        }
    }
}

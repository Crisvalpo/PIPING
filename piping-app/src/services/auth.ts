import { supabase } from '@/lib/supabase'
import { User, AuthResponse } from '@/types/user'

/**
 * Traducir errores de autenticación a español casual
 */
function translateAuthError(message: string): string {
    const msg = message.toLowerCase()

    if (msg.includes('email not confirmed')) return '¡Ups! Aún no has confirmado tu correo. Revisa tu bandeja de entrada (y spam por si acaso) 📧'
    if (msg.includes('invalid login credentials')) return 'Correo o contraseña incorrectos. ¡Inténtalo de nuevo! 🤔'
    if (msg.includes('user already registered')) return 'Este correo ya está registrado. ¿Quizás querías iniciar sesión? 🤓'
    if (msg.includes('password should be at least')) return 'La contraseña es muy corta. Necesitamos al menos 6 caracteres para mantenerte seguro 🔒'
    if (msg.includes('rate limit exceeded')) return '¡Wow, vas muy rápido! Espera un momento antes de intentar de nuevo 🚦'

    return 'Algo salió mal. Por favor inténtalo de nuevo más tarde 😅'
}

export async function signUp(userData: User): Promise<AuthResponse> {
    try {
        // 1. Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.correo,
            password: userData.password!,
        })

        if (authError) {
            return {
                success: false,
                message: translateAuthError(authError.message),
            }
        }

        if (!authData.user) {
            return {
                success: false,
                message: 'No pudimos crear tu usuario. Inténtalo de nuevo 😓',
            }
        }

        // 2. Usar función de base de datos que bypasea RLS
        const { error: profileError } = await supabase.rpc('handle_new_user_profile', {
            user_id: authData.user.id,
            user_nombre: userData.nombre,
            user_rol: userData.rol,
            user_telefono: userData.telefono,
            user_correo: userData.correo,
            user_empresa_id: userData.empresa_id || null,
            user_proyecto_id: userData.proyecto_id || null,
            user_es_admin_proyecto: userData.es_admin_proyecto || false,
            user_estado_usuario: userData.estado_usuario || 'PENDIENTE',
            user_invitado_por: userData.invitado_por || null,
            user_token_invitacion: userData.token_invitacion || null,
        })

        if (profileError) {
            return {
                success: false,
                message: 'Hubo un problema creando tu perfil: ' + profileError.message,
            }
        }

        return {
            success: true,
            message: '¡Bienvenido a bordo! Usuario registrado exitosamente 🚀',
            user: {
                id: authData.user.id,
                nombre: userData.nombre,
                rol: userData.rol,
                telefono: userData.telefono,
                correo: userData.correo,
                empresa_id: userData.empresa_id,
                proyecto_id: userData.proyecto_id,
                es_admin_proyecto: userData.es_admin_proyecto,
                estado_usuario: userData.estado_usuario,
            },
        }
    } catch (error) {
        return {
            success: false,
            message: 'Ocurrió un error inesperado al registrarte 😵',
        }
    }
}

export async function signIn(correo: string, password: string): Promise<AuthResponse> {
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: correo,
            password: password,
        })

        if (authError) {
            return {
                success: false,
                message: translateAuthError(authError.message),
            }
        }

        // Obtener datos del perfil
        const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single()

        if (profileError) {
            return {
                success: false,
                message: 'No pudimos cargar tu perfil. Contacta a soporte 🛠️',
            }
        }

        return {
            success: true,
            message: '¡Qué bueno verte de nuevo! 👋',
            user: profileData,
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error al iniciar sesión. Inténtalo más tarde 😅',
        }
    }
}

export async function signOut(): Promise<AuthResponse> {
    try {
        const { error } = await supabase.auth.signOut()

        if (error) {
            return {
                success: false,
                message: error.message,
            }
        }

        return {
            success: true,
            message: 'Sesión cerrada exitosamente',
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error al cerrar sesión',
        }
    }
}

export async function getCurrentUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return null
        }

        const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

        return profileData
    } catch (error) {
        return null
    }
}

/**
 * Verificar si el usuario actual es SUPER_ADMIN
 */
export async function isSuperAdmin(): Promise<boolean> {
    try {
        const user = await getCurrentUser()
        return user?.rol?.toUpperCase() === 'SUPER_ADMIN' && user?.estado_usuario === 'ACTIVO'
    } catch (error) {
        return false
    }
}

/**
 * Verificar si el usuario actual es admin de su proyecto
 */
export async function isProjectAdmin(): Promise<boolean> {
    try {
        const user = await getCurrentUser()
        return (user?.es_admin_proyecto === true || user?.rol === 'ADMIN_PROYECTO' || user?.rol === 'ADMIN_EMPRESA') && user?.estado_usuario === 'ACTIVO'
    } catch (error) {
        return false
    }
}

/**
 * Obtener el estado del usuario actual
 */
export async function getUserStatus() {
    try {
        const user = await getCurrentUser()
        if (!user) return null

        return {
            estado: user.estado_usuario,
            tieneEmpresa: !!user.empresa_id,
            tieneProyecto: !!user.proyecto_id,
            esAdminProyecto: user.es_admin_proyecto || user.rol === 'ADMIN_PROYECTO' || user.rol === 'ADMIN_EMPRESA',
            esSuperAdmin: user.rol?.toUpperCase() === 'SUPER_ADMIN'
        }
    } catch (error) {
        return null
    }
}

/**
 * Actualizar estado de usuario (solo SUPER_ADMIN)
 */
export async function updateUserStatus(
    userId: string,
    nuevoEstado: 'PENDIENTE' | 'ACTIVO' | 'INACTIVO' | 'RECHAZADO'
): Promise<AuthResponse> {
    try {
        const { error } = await supabase
            .from('users')
            .update({ estado_usuario: nuevoEstado })
            .eq('id', userId)

        if (error) {
            return {
                success: false,
                message: error.message
            }
        }

        return {
            success: true,
            message: 'Estado de usuario actualizado exitosamente'
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error al actualizar estado de usuario'
        }
    }
}

/**
 * Asignar usuario a empresa y proyecto
 */
export async function assignUserToProject(
    userId: string,
    empresaId: string,
    proyectoId: string,
    rol: string,
    esAdminProyecto: boolean = false
): Promise<AuthResponse> {
    try {
        const { error } = await supabase
            .from('users')
            .update({
                empresa_id: empresaId,
                proyecto_id: proyectoId,
                rol: rol,
                es_admin_proyecto: esAdminProyecto,
                estado_usuario: 'ACTIVO'
            })
            .eq('id', userId)

        if (error) {
            return {
                success: false,
                message: error.message
            }
        }

        return {
            success: true,
            message: 'Usuario asignado al proyecto exitosamente'
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error al asignar usuario al proyecto'
        }
    }
}

/**
 * Verificar si el usuario puede acceder al dashboard
 */
export async function canAccessDashboard(): Promise<boolean> {
    try {
        const user = await getCurrentUser()
        if (!user) return false

        // SUPER_ADMIN siempre puede acceder
        if (user.rol?.toUpperCase() === 'SUPER_ADMIN') {
            return user.estado_usuario === 'ACTIVO'
        }

        // Usuarios normales necesitan estar activos y tener proyecto asignado
        return user.estado_usuario === 'ACTIVO' && !!user.proyecto_id
    } catch (error) {
        return false
    }
}

/**
 * Obtener usuarios pendientes de aprobación (solo SUPER_ADMIN)
 */
export async function getPendingUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('estado_usuario', 'PENDIENTE')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching pending users:', error)
            return []
        }

        return data || []
    } catch (error) {
        console.error('Error crítico en getPendingUsers:', error)
        return []
    }
}


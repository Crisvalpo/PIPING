// Configuración de roles y permisos del sistema PIPING

export interface RoleConfig {
    id: string
    nombre: string
    descripcion: string
    nivel: number // 1=más alto (admin), 5=más bajo (solo lectura)
    permisos: {
        lineas?: Permission
        isometricos?: Permission
        spools?: Permission
        materiales?: Permission
        testPacks?: Permission
        juntas?: Permission
        usuarios?: Permission
        configuracion?: Permission
        reportes?: Permission
    }
}

export type Permission = 'CRUD' | 'CRU' | 'CR' | 'R' | 'RU' | 'NONE'

export const ROLES: Record<string, RoleConfig> = {
    ADMIN: {
        id: 'ADMIN',
        nombre: 'Administrador',
        descripcion: 'Superusuario. Configuración total del sistema y la plantilla.',
        nivel: 1,
        permisos: {
            lineas: 'CRUD',
            isometricos: 'CRUD',
            spools: 'CRUD',
            materiales: 'CRUD',
            testPacks: 'CRUD',
            juntas: 'CRUD',
            usuarios: 'CRUD',
            configuracion: 'CRUD',
            reportes: 'CRUD',
        },
    },

    'GERENCIA / JEFE DE PROYECTO': {
        id: 'GERENCIA / JEFE DE PROYECTO',
        nombre: 'Gerencia / Jefe de Proyecto',
        descripcion: 'Lector de alto nivel. Necesita ver el panorama general.',
        nivel: 2,
        permisos: {
            lineas: 'R',
            isometricos: 'R',
            spools: 'R',
            materiales: 'R',
            testPacks: 'R',
            juntas: 'R',
            reportes: 'R',
        },
    },

    'P&C (PLANIFICACIÓN)': {
        id: 'P&C (PLANIFICACIÓN)',
        nombre: 'P&C (Planificación)',
        descripcion: 'Lector enfocado en el avance programado vs. real.',
        nivel: 3,
        permisos: {
            lineas: 'R',
            isometricos: 'R',
            spools: 'R',
            reportes: 'R',
        },
    },

    'CLIENTE / ITO': {
        id: 'CLIENTE / ITO',
        nombre: 'Cliente / ITO',
        descripcion: 'Lector externo. Valida el avance y la calidad.',
        nivel: 3,
        permisos: {
            testPacks: 'RU', // Puede aprobar/rechazar
            juntas: 'R',
            reportes: 'R',
        },
    },

    'SOLO LECTURA': {
        id: 'SOLO LECTURA',
        nombre: 'Solo Lectura',
        descripcion: 'Rol genérico para consulta interna.',
        nivel: 5,
        permisos: {
            lineas: 'R',
            isometricos: 'R',
            spools: 'R',
            reportes: 'R',
        },
    },

    'OFICINA TECNICA': {
        id: 'OFICINA TECNICA',
        nombre: 'Oficina Técnica',
        descripcion: 'Editor inicial. Carga la ingeniería base del proyecto.',
        nivel: 3,
        permisos: {
            lineas: 'CRU',
            isometricos: 'CRU',
            materiales: 'CRU',
        },
    },

    'CONTROL DOCUMENT': {
        id: 'CONTROL DOCUMENT',
        nombre: 'Control Document',
        descripcion: 'Especialista de O.T. Mantiene vigentes los planos.',
        nivel: 3,
        permisos: {
            isometricos: 'CRU', // Específ. Pestaña de Revisiones
        },
    },

    'TALLER / PREFABRICACIÓN': {
        id: 'TALLER / PREFABRICACIÓN',
        nombre: 'Taller / Prefabricación',
        descripcion: 'Editor de estado. Reporta el avance en taller.',
        nivel: 4,
        permisos: {
            spools: 'RU',
        },
    },

    LOGISTICA: {
        id: 'LOGISTICA',
        nombre: 'Logística',
        descripcion: 'Editor de estado. Control de patio, bodega y despachos.',
        nivel: 4,
        permisos: {
            spools: 'RU',
            materiales: 'RU',
        },
    },

    EXPEDITOR: {
        id: 'EXPEDITOR',
        nombre: 'Expeditor',
        descripcion: 'Sigue el material antes de que llegue a obra.',
        nivel: 4,
        permisos: {
            materiales: 'RU',
        },
    },

    'SUPERVISOR TERRENO': {
        id: 'SUPERVISOR TERRENO',
        nombre: 'Supervisor Terreno',
        descripcion: 'Editor en campo. Reporta el montaje físico.',
        nivel: 4,
        permisos: {
            spools: 'RU',
            juntas: 'RU',
        },
    },

    'CALIDAD / QA': {
        id: 'CALIDAD / QA',
        nombre: 'Calidad / QA',
        descripcion: 'Editor en campo. Registra inspecciones y liberaciones.',
        nivel: 4,
        permisos: {
            juntas: 'RU',
            testPacks: 'RU',
        },
    },

    'SECRETARIO PIPING': {
        id: 'SECRETARIO PIPING',
        nombre: 'Secretario Piping',
        descripcion: 'Gestor de datos. Mantiene el "maestro de spools" actualizado.',
        nivel: 3,
        permisos: {
            lineas: 'CRUD',
            isometricos: 'CRUD',
            spools: 'CRUD',
        },
    },

    'SECRETARIO PRECOM': {
        id: 'SECRETARIO PRECOM',
        nombre: 'Secretario Precom',
        descripcion: 'Gestor de datos. Arma y gestiona los circuitos de prueba.',
        nivel: 3,
        permisos: {
            testPacks: 'CRUD',
            juntas: 'CRU',
            isometricos: 'R',
        },
    },
}

// Array de roles para selectores
export const ROLES_LIST = Object.values(ROLES)

// Función helper para verificar permisos
export function hasPermission(
    userRole: string,
    module: keyof RoleConfig['permisos'],
    action: 'create' | 'read' | 'update' | 'delete'
): boolean {
    const role = ROLES[userRole]
    if (!role) return false

    const permission = role.permisos[module]
    if (!permission) return false

    const actionMap = {
        create: ['C', 'CRUD', 'CRU', 'CR'],
        read: ['R', 'CRUD', 'CRU', 'CR', 'RU'],
        update: ['U', 'CRUD', 'CRU', 'RU'],
        delete: ['D', 'CRUD'],
    }

    return actionMap[action].some(char => permission.includes(char))
}

// Helper para obtener color del badge según el rol
export function getRoleColor(rol: string): string {
    const role = ROLES[rol]
    if (!role) return 'bg-gray-500/20 border-gray-400/50 text-gray-200'

    switch (role.nivel) {
        case 1: // Admin
            return 'bg-red-500/20 border-red-400/50 text-red-200'
        case 2: // Gerencia
            return 'bg-purple-500/20 border-purple-400/50 text-purple-200'
        case 3: // Editores
            return 'bg-blue-500/20 border-blue-400/50 text-blue-200'
        case 4: // Operadores
            return 'bg-green-500/20 border-green-400/50 text-green-200'
        case 5: // Solo lectura
            return 'bg-gray-500/20 border-gray-400/50 text-gray-200'
        default:
            return 'bg-gray-500/20 border-gray-400/50 text-gray-200'
    }
}

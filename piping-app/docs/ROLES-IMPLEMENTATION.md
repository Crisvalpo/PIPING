# Sistema de Roles PIPING - Instrucciones de Implementación

## 📋 Resumen

Se ha creado un sistema completo de roles para gestión de proyectos PIPING con **14 roles específicos** de la industria.

## ✅ Archivos Creados

1. **`src/config/roles.ts`** - Configuración completa de roles y permisos
2. **`supabase-update-roles.sql`** - Script para actualizar BD
3. **Documentation actualizada** en `walkthrough.md`

## 🔧 Pasos para Implementar

### PASO 1: Ejecutar SQL en Supabase

Ve a: https://supabase.com/dashboard/project/xjawohulhckhckufxwlk/sql/new

Ejecuta este SQL:

```sql
-- Actualizar rol por defecto
ALTER TABLE public.users 
ALTER COLUMN rol SET DEFAULT 'SOLO LECTURA';

-- Migrar usuarios existentes
UPDATE public.users 
SET rol = 'SOLO LECTURA' 
WHERE rol = 'por asignar';

-- Verificar
SELECT id, nombre, rol, correo FROM users;
```

### PASO 2: Actualizar Panel Admin

El archivo `src/app/admin/page.tsx` necesita actualizarse para incluir TODOS los roles.

**REEMPLAZAR** las líneas 170-173 con:

```tsx
<option value="SOLO LECTURA" className="bg-gray-900">Solo Lectura</option>
<option value="ADMIN" className="bg-gray-900">Admin</option>
<option value="GERENCIA / JEFE DE PROYECTO" className="bg-gray-900">Gerencia / Jefe de Proyecto</option>
<option value="P&C (PLANIFICACIÓN)" className="bg-gray-900">P&C (Planificación)</option>
<option value="CLIENTE / ITO" className="bg-gray-900">Cliente / ITO</option>
<option value="OFICINA TECNICA" className="bg-gray-900">Oficina Técnica</option>
<option value="CONTROL DOCUMENT" className="bg-gray-900">Control Document</option>
<option value="TALLER / PREFABRICACIÓN" className="bg-gray-900">Taller / Prefabricación</option>
<option value="LOGISTICA" className="bg-gray-900">Logística</option>
<option value="EXPEDITOR" className="bg-gray-900">Expeditor</option>
<option value="SUPERVISOR TERRENO" className="bg-gray-900">Supervisor Terreno</option>
<option value="CALIDAD / QA" className="bg-gray-900">Calidad / QA</option>
<option value="SECRETARIO PIPING" className="bg-gray-900">Secretario Piping</option>
<option value="SECRETARIO PRECOM" className="bg-gray-900">Secretario Precom</option>
```

### PASO 3: Actualizar Función getRoleBadgeColor

En `src/app/admin/page.tsx`, **REEMPLAZAR** la función `getRoleBadgeColor` (líneas 64-77):

```tsx
const getRoleBadgeColor = (rol: string) => {
    // Admin - Rojo
    if (rol === 'ADMIN') return 'bg-red-500/20 border-red-400/50 text-red-200'
    
    // Gerencia - Púrpura
    if (rol === 'GERENCIA / JEFE DE PROYECTO') return 'bg-purple-500/20 border-purple-400/50 text-purple-200'
    
    // Editores  -Azul
    if (['P&C (PLANIFICACIÓN)', 'OFICINA TECNICA', 'CONTROL DOCUMENT', 'SECRETARIO PIPING', 'SECRETARIO PRECOM'].includes(rol)) {
        return 'bg-blue-500/20 border-blue-400/50 text-blue-200'
    }
    
    // Operadores - Verde
    if (['TALLER / PREFABRICACIÓN', 'LOGISTICA', 'EXPEDITOR', 'SUPERVISOR TERRENO', 'CALIDAD / QA'].includes(rol)) {
        return 'bg-green-500/20 border-green-400/50 text-green-200'
    }
    
    // Cliente/Solo Lectura - Gris
    return 'bg-gray-500/20 border-gray-400/50 text-gray-200'
}
```

### PASO 4: Actualizar Estadísticas

En `src/app/admin/page.tsx`, **REEMPLAZAR** las estadísticas (líneas 117-134):

```tsx
<div className="grid grid-cols-1 md:grid-cols- gap-4 mb-6">
    <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
        <p className="text-purple-200 text-sm mb-1">Total Usuarios</p>
        <p className="text-white text-3xl font-bold">{users.length}</p>
    </div>
    <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
        <p className="text-purple-200 text-sm mb-1">Solo Lectura</p>
        <p className="text-white text-3xl font-bold">{users.filter(u => u.rol === 'SOLO LECTURA').length}</p>
    </div>
    <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
        <p className="text-purple-200 text-sm mb-1">Operadores</p>
        <p className="text-white text-3xl font-bold">{users.filter(u => ['TALLER / PREFABRICACIÓN', 'LOGISTICA', 'EXPEDITOR', 'SUPERVISOR TERRENO', 'CALIDAD / QA'].includes(u.rol)).length}</p>
    </div>
    <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
        <p className="text-purple-200 text-sm mb-1">Admins</p>
        <p className="text-white text-3xl font-bold">{users.filter(u => u.rol === 'ADMIN').length}</p>
    </div>
</div>
```

## 🎨 Sistema de Colores por Rol

- 🔴 **Rojo**: ADMIN
- 🟣 **Púrpura**: GERENCIA
- 🔵 **Azul**: Editores (Ingeniería, Secretarios)
- 🟢 **Verde**: Operadores (Campo, Taller)
- ⚪ **Gris**: Cliente y Solo Lectura

## 📊 14 Roles del Sistema

1. **ADMIN** - Acceso total
2. **GERENCIA / JEFE DE PROYECTO** - Vista general
3. **P&C (PLANIFICACIÓN)** - Seguimiento
4. **CLIENTE / ITO** - Validación externa
5. **SOLO LECTURA** - Consulta
6. **OFICINA TECNICA** - Ingeniería
7. **CONTROL DOCUMENT** - Revisiones
8. **TALLER / PREFABRICACIÓN** - Producción
9. **LOGISTICA** - Bodega
10. **EXPEDITOR** - Materiales
11. **SUPERVISOR TERRENO** - Montaje
12. **CALIDAD / QA** - Inspecciones
13. **SECRETARIO PIPING** - Spools
14. **SECRETARIO PRECOM** - Test Packs

## ✅ Verificación

Después de implementar:

1. Refresca el panel admin: http://localhost:3000/admin
2. Verifica que el selector muestra los 14 roles
3. Cambia el rol de un usuario
4. Verifica que el color del badge cambia correctamente
5. Verifica que las estadísticas se actualizan

## 🚀 Uso de Permisos

La configuración en `src/config/roles.ts` incluye helpers para verificar permisos:

```typescript
import { hasPermission, ROLES } from '@/config/roles'

// Verificar si un usuario puede crear líneas
if (hasPermission(user.rol, 'lineas', 'create')) {
  // Permitir acción
}

// Obtener descripción del rol
const roleInfo = ROLES[user.rol]
console.log(roleInfo.descripcion)
```

---

¿Necesitas ayuda con algún paso específico?

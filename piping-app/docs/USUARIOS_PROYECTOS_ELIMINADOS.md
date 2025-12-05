# 🚨 Gestión de Usuarios al Eliminar Proyectos

## Situación Actual

### ⚠️ Problema Identificado

Cuando intentas **eliminar un proyecto** que tiene usuarios asociados, la operación **FALLARÁ** con un error de restricción de clave foránea.

### 📋 Configuración Actual de la Base de Datos

```sql
-- En la tabla users (línea 60 de supabase-phase1-tables.sql)
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS proyecto_id UUID REFERENCES public.proyectos(id);
  -- ⚠️ NO tiene ON DELETE especificado = ON DELETE RESTRICT (por defecto)
```

**Esto significa:**
- ❌ No puedes eliminar un proyecto si tiene usuarios asociados
- ❌ La operación de eliminación fallará con error de FK constraint
- ✅ Esto es **BUENO** para integridad de datos (previene pérdida accidental)

---

## 🎯 Opciones de Solución

### Opción 1: **SET NULL** (Recomendado para este caso)

Los usuarios quedan "huérfanos" pero siguen existiendo en el sistema.

```sql
-- Modificar la FK para que establezca NULL al eliminar el proyecto
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_proyecto_id_fkey;

ALTER TABLE public.users 
  ADD CONSTRAINT users_proyecto_id_fkey 
  FOREIGN KEY (proyecto_id) 
  REFERENCES public.proyectos(id) 
  ON DELETE SET NULL;
```

**Ventajas:**
- ✅ Los usuarios NO se eliminan
- ✅ Puedes reasignarlos a otro proyecto después
- ✅ Mantiene el historial de usuarios
- ✅ Seguro para auditoría

**Desventajas:**
- ⚠️ Usuarios quedan sin proyecto (necesitas manejar este caso en la UI)
- ⚠️ Necesitas lógica para identificar usuarios huérfanos

---

### Opción 2: **CASCADE** (Más agresivo)

Elimina automáticamente todos los usuarios asociados al proyecto.

```sql
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_proyecto_id_fkey;

ALTER TABLE public.users 
  ADD CONSTRAINT users_proyecto_id_fkey 
  FOREIGN KEY (proyecto_id) 
  REFERENCES public.proyectos(id) 
  ON DELETE CASCADE;
```

**Ventajas:**
- ✅ Limpieza automática
- ✅ No quedan datos huérfanos

**Desventajas:**
- ❌ **PELIGROSO**: Elimina usuarios permanentemente
- ❌ Pérdida de datos irreversible
- ❌ Problemas si el usuario está en auth.users (conflicto)

---

### Opción 3: **RESTRICT** (Actual - Más seguro)

Previene la eliminación si hay usuarios asociados.

```sql
-- Ya está así por defecto
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_proyecto_id_fkey;

ALTER TABLE public.users 
  ADD CONSTRAINT users_proyecto_id_fkey 
  FOREIGN KEY (proyecto_id) 
  REFERENCES public.proyectos(id) 
  ON DELETE RESTRICT;
```

**Ventajas:**
- ✅ **MÁS SEGURO**: No permite eliminaciones accidentales
- ✅ Fuerza al admin a tomar decisiones conscientes
- ✅ Protege la integridad de datos

**Desventajas:**
- ⚠️ Requiere reasignar usuarios manualmente antes de eliminar
- ⚠️ Proceso de eliminación en dos pasos

---

## 💡 Recomendación: Enfoque Híbrido

### Implementar un proceso de eliminación en dos pasos:

#### 1. **Verificación Previa**
```typescript
async function canDeleteProyecto(proyectoId: string): Promise<{
    canDelete: boolean
    usersCount: number
    message: string
}> {
    const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('proyecto_id', proyectoId)
    
    if (count && count > 0) {
        return {
            canDelete: false,
            usersCount: count,
            message: `No se puede eliminar. Hay ${count} usuario(s) asociado(s).`
        }
    }
    
    return {
        canDelete: true,
        usersCount: 0,
        message: 'Proyecto puede ser eliminado.'
    }
}
```

#### 2. **Opciones para el Admin**
```typescript
async function deleteProyectoWithOptions(
    proyectoId: string, 
    option: 'reassign' | 'orphan' | 'force'
) {
    const check = await canDeleteProyecto(proyectoId)
    
    if (!check.canDelete) {
        if (option === 'reassign') {
            // Mostrar UI para reasignar usuarios a otro proyecto
            return { success: false, needsReassignment: true }
        }
        
        if (option === 'orphan') {
            // Establecer proyecto_id = NULL para todos los usuarios
            await supabase
                .from('users')
                .update({ proyecto_id: null })
                .eq('proyecto_id', proyectoId)
        }
        
        // option === 'force' requiere permisos especiales
    }
    
    // Ahora sí eliminar el proyecto
    return await deleteProyecto(proyectoId)
}
```

---

## 🔧 Implementación Recomendada

### Paso 1: Modificar la FK a SET NULL

```sql
-- Archivo: supabase-fix-proyecto-fk.sql
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_proyecto_id_fkey;

ALTER TABLE public.users 
  ADD CONSTRAINT users_proyecto_id_fkey 
  FOREIGN KEY (proyecto_id) 
  REFERENCES public.proyectos(id) 
  ON DELETE SET NULL;

-- También para empresa_id
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_empresa_id_fkey;

ALTER TABLE public.users 
  ADD CONSTRAINT users_empresa_id_fkey 
  FOREIGN KEY (empresa_id) 
  REFERENCES public.empresas(id) 
  ON DELETE SET NULL;
```

### Paso 2: Actualizar el servicio de eliminación

```typescript
// src/services/super-admin.ts
export async function deleteProyectoSafe(id: string): Promise<ApiResponse> {
    try {
        // 1. Verificar usuarios asociados
        const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('proyecto_id', id)
        
        if (count && count > 0) {
            return {
                success: false,
                message: `No se puede eliminar. Hay ${count} usuario(s) asociado(s). Por favor, reasígnalos primero.`
            }
        }
        
        // 2. Si no hay usuarios, proceder con la eliminación
        const { error } = await supabase
            .from('proyectos')
            .delete()
            .eq('id', id)
        
        if (error) return { success: false, message: error.message }
        return { success: true, message: 'Proyecto eliminado exitosamente' }
        
    } catch (error) {
        return {
            success: false,
            message: 'Error al eliminar proyecto'
        }
    }
}
```

### Paso 3: Mejorar la UI con advertencias

```tsx
// En el componente de gestión de proyectos
async function handleDelete(id: string) {
    // Verificar usuarios primero
    const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('proyecto_id', id)
    
    if (count && count > 0) {
        alert(`⚠️ Este proyecto tiene ${count} usuario(s) asociado(s).\n\nPor favor, reasígnalos a otro proyecto antes de eliminarlo.`)
        return
    }
    
    if (!confirm('¿Estás seguro de eliminar este proyecto?')) return
    
    // Proceder con la eliminación...
}
```

---

## 📊 Resumen de Comportamientos

| Acción | ON DELETE RESTRICT | ON DELETE SET NULL | ON DELETE CASCADE |
|--------|-------------------|-------------------|-------------------|
| Eliminar proyecto con usuarios | ❌ Error | ✅ Usuarios quedan con `proyecto_id = NULL` | ⚠️ Usuarios eliminados |
| Seguridad de datos | ✅ Alta | ✅ Media | ❌ Baja |
| Requiere intervención manual | ✅ Sí | ⚠️ Opcional | ❌ No |
| Recomendado para producción | ✅ Sí (con UI) | ✅ Sí | ❌ No |

---

## ✅ Acción Inmediata Recomendada

1. **Mantener RESTRICT** (actual) para máxima seguridad
2. **Mejorar la UI** para mostrar advertencias claras
3. **Agregar verificación previa** antes de permitir eliminación
4. **Crear funcionalidad de reasignación** de usuarios entre proyectos

Esto protege los datos y da control total al administrador.

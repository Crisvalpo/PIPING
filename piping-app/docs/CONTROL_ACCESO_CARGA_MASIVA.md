# 🔐 Control de Acceso: Carga Masiva de Datos

## Roles y Permisos

### 1. Super Admin
**Acceso**: ✅ Completo

**Puede**:
- Cargar datos a **cualquier proyecto**
- Especificar manualmente el `projectId`
- Acceder desde `/admin/super/carga-masiva`
- Ver todos los proyectos del sistema

**Flujo**:
1. Entra al Panel de Super Admin
2. Click en "Carga Masiva"
3. Selecciona tipo de reporte
4. **Ingresa manualmente el UUID del proyecto**
5. Sube el archivo Excel
6. Los datos se cargan al proyecto especificado

---

### 2. Admin de Proyecto
**Acceso**: ✅ Limitado a su proyecto

**Puede**:
- Cargar datos **solo a su proyecto asignado**
- El `projectId` se toma automáticamente de su perfil
- Acceder desde `/admin/proyecto` → "Carga Masiva"
- No puede ver ni modificar otros proyectos

**Flujo**:
1. Entra al Panel de Admin de Proyecto
2. Click en "Carga Masiva"
3. Selecciona tipo de reporte
4. **El proyecto ya está pre-seleccionado** (campo bloqueado)
5. Sube el archivo Excel
6. Los datos se cargan automáticamente a su proyecto

**Restricciones**:
- No puede cambiar el `projectId`
- Si no tiene proyecto asignado, verá un mensaje de error

---

### 3. Usuario Regular
**Acceso**: ❌ Denegado

**No puede**:
- Acceder a la página de carga masiva
- Cargar datos de ningún tipo
- Solo puede ver/editar datos individuales (si tiene permisos)

---

## Implementación Técnica

### Protección de Rutas
```typescript
// Super Admin: Acceso sin restricciones
<ProtectedRoute requireAuth requireActive>
  <CargaMasivaContent />
</ProtectedRoute>

// La lógica interna detecta el rol y adapta la UI
```

### Lógica Adaptativa
```typescript
const isSuperAdmin = userRole === 'SUPER_ADMIN'

// Si es Super Admin:
// - Campo projectId editable
// - Puede especificar cualquier UUID

// Si es Admin de Proyecto:
// - Campo projectId bloqueado
// - Se usa user.proyecto_id automáticamente
```

### Validación en Backend
```typescript
// TODO: Agregar validación en /api/upload-data
// Verificar que el usuario tenga permiso para cargar al proyecto especificado
```

---

## Mejoras Futuras Recomendadas

### 1. Validación de Permisos en Backend
Actualmente, la API `/api/upload-data` **no valida** si el usuario tiene permiso para cargar al proyecto especificado.

**Implementar**:
```typescript
// En /api/upload-data/route.ts
const user = await getCurrentUser()

if (user.rol !== 'SUPER_ADMIN') {
  // Verificar que projectId coincida con user.proyecto_id
  if (projectId !== user.proyecto_id) {
    return NextResponse.json(
      { error: 'No tienes permiso para cargar datos a este proyecto' },
      { status: 403 }
    )
  }
}
```

### 2. Selector de Proyecto para Super Admin
En lugar de pedir el UUID manualmente, mostrar un dropdown con todos los proyectos disponibles.

### 3. Historial de Cargas
Crear una tabla `cargas_masivas` para auditar:
- Quién cargó
- Qué archivo
- Cuándo
- Cuántos registros
- Estado (exitosa/fallida)

### 4. Permisos Granulares
Permitir que un Admin de Proyecto pueda delegar permisos de carga a usuarios específicos.

---

## Resumen Visual

| Rol | Acceso | Proyecto | Restricción |
|-----|--------|----------|-------------|
| **Super Admin** | ✅ | Cualquiera | Ninguna |
| **Admin Proyecto** | ✅ | Solo el suyo | Campo bloqueado |
| **Usuario Regular** | ❌ | N/A | Sin acceso |

---

## Estado Actual

✅ **Implementado**:
- UI adaptativa según rol
- Pre-carga de `projectId` para Admins de Proyecto
- Campo bloqueado para no Super Admins
- Acceso desde ambos paneles (Super Admin y Admin Proyecto)

⏳ **Pendiente**:
- Validación de permisos en backend
- Selector de proyecto para Super Admin
- Historial de cargas
- Permisos granulares

# 🏗️ Arquitectura LukeAPP - Sistema Multi-Tenant

## 📋 Reglas de Negocio

### Restricciones Principales
1. ✅ **Un usuario pertenece a UN SOLO proyecto** (relación 1:1)
2. ✅ **Roles asignados por usuario** (campo `rol` en tabla `users`)
3. ✅ **Sistema híbrido de registro:**
   - **Con invitación**: Usuario pre-asignado a empresa/proyecto con rol definido
   - **Sin invitación**: Usuario pendiente de aprobación por SUPER_ADMIN
4. ✅ **Aislamiento total de datos** por `proyecto_id` (RLS estricto)
5. ✅ **Flujo de onboarding claro** post-registro

### Configuraciones
- **SUPER_ADMIN**: Solo asignado manualmente en la base de datos
- **Invitaciones**: Sin fecha de expiración
- **Usuarios rechazados**: Pueden volver a solicitar acceso
- **Nombres únicos**: Empresas y proyectos no pueden repetirse globalmente

---

## 📊 Modelo de Datos

### Tabla: `empresas`
```sql
CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255) UNIQUE NOT NULL,
  descripcion TEXT,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

**Campos:**
- `nombre`: Único globalmente
- `created_by`: Usuario que creó la empresa (puede ser SUPER_ADMIN o primer usuario)

---

### Tabla: `proyectos`
```sql
CREATE TABLE proyectos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  estado VARCHAR(50) DEFAULT 'ACTIVO',
  fecha_inicio DATE,
  fecha_fin_estimada DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(empresa_id, nombre)
);
```

**Campos:**
- `codigo`: Único globalmente (ej: "PROJ-001", "PROJ-002")
- `nombre`: Único dentro de la empresa
- `estado`: ACTIVO | PAUSADO | FINALIZADO

---

### Tabla: `users` (MODIFICADA)
```sql
ALTER TABLE users 
  ADD COLUMN empresa_id UUID REFERENCES empresas(id),
  ADD COLUMN proyecto_id UUID REFERENCES proyectos(id),
  ADD COLUMN es_admin_proyecto BOOLEAN DEFAULT FALSE,
  ADD COLUMN estado_usuario VARCHAR(50) DEFAULT 'PENDIENTE',
  ADD COLUMN invitado_por UUID REFERENCES auth.users(id),
  ADD COLUMN token_invitacion VARCHAR(255) UNIQUE;
```

**Nuevos Campos:**
- `empresa_id`: FK a empresa (NULL si pendiente)
- `proyecto_id`: FK a proyecto (NULL si pendiente)
- `es_admin_proyecto`: TRUE si puede gestionar el proyecto
- `estado_usuario`: PENDIENTE | ACTIVO | INACTIVO | RECHAZADO
- `invitado_por`: Usuario que generó la invitación (NULL si auto-registro)
- `token_invitacion`: Token usado al registrarse (NULL si auto-registro)

**Estados de Usuario:**
- `PENDIENTE`: Esperando aprobación de SUPER_ADMIN
- `ACTIVO`: Puede acceder al sistema
- `INACTIVO`: Temporalmente deshabilitado
- `RECHAZADO`: Solicitud rechazada (puede volver a solicitar)

---

### Tabla: `invitaciones`
```sql
CREATE TABLE invitaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  rol VARCHAR(100) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  creado_por UUID REFERENCES auth.users(id),
  usado BOOLEAN DEFAULT FALSE,
  usado_por UUID REFERENCES auth.users(id),
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_uso TIMESTAMP
);
```

**Campos:**
- `token`: Token único para la invitación (sin expiración)
- `usado`: TRUE cuando el usuario se registra con el token
- `rol`: Rol pre-asignado para el usuario invitado

---

## 🔄 Flujos de Usuario

### Flujo 1: Registro CON Invitación
```
1. Admin de Proyecto genera invitación
   → Crea registro en tabla `invitaciones`
   → Genera token único
   → Envía link: /registro?token=ABC123

2. Usuario hace clic en link
   → Sistema valida token
   → Pre-llena: empresa, proyecto, rol
   → Muestra formulario de registro

3. Usuario completa registro
   → Crea usuario en auth.users
   → Crea registro en public.users con:
     - empresa_id (de la invitación)
     - proyecto_id (de la invitación)
     - rol (de la invitación)
     - estado_usuario = 'ACTIVO'
     - invitado_por (creador de la invitación)
     - token_invitacion (token usado)
   → Marca invitación como usada
   → Redirige a /dashboard

Estado final: Usuario ACTIVO con acceso inmediato
```

### Flujo 2: Registro SIN Invitación (Solicitud)
```
1. Usuario va a /registro (sin token)
   → Completa formulario básico
   → Crea usuario en auth.users
   → Crea registro en public.users con:
     - empresa_id = NULL
     - proyecto_id = NULL
     - rol = 'SOLO LECTURA' (temporal)
     - estado_usuario = 'PENDIENTE'

2. Redirige a /onboarding
   → Usuario indica:
     - Nombre de empresa (nueva o existente)
     - Nombre de proyecto (nuevo o existente)
     - Rol solicitado
   → Guarda en metadata temporal

3. Usuario ve pantalla /pendiente
   → "Tu solicitud está siendo revisada"
   → No puede acceder a /dashboard

4. SUPER_ADMIN revisa en /admin/super
   → Ve solicitudes pendientes
   → Puede:
     a) APROBAR: Asigna empresa/proyecto, cambia estado a ACTIVO
     b) RECHAZAR: Cambia estado a RECHAZADO
     c) IGNORAR: Deja en PENDIENTE

Estado final: Usuario ACTIVO (si aprobado) o RECHAZADO
```

### Flujo 3: Primer Usuario (Fundador)
```
1. Usuario se registra sin invitación
2. En /onboarding selecciona: "Crear nueva empresa y proyecto"
3. Sistema automáticamente:
   → Crea empresa (nombre único)
   → Crea proyecto (código auto-generado)
   → Asigna usuario:
     - empresa_id
     - proyecto_id
     - es_admin_proyecto = TRUE
     - rol = 'GERENCIA / JEFE DE PROYECTO'
     - estado_usuario = 'ACTIVO'
4. Redirige a /dashboard

Estado final: Usuario ACTIVO como Admin de Proyecto
```

---

## 🔐 Sistema de Permisos

### Niveles de Acceso

#### 1. SUPER_ADMIN (Rol Global)
- **Asignación**: Manual en base de datos
- **Acceso**:
  - ✅ Ver todas las empresas
  - ✅ Ver todos los proyectos
  - ✅ Aprobar/rechazar solicitudes pendientes
  - ✅ Crear empresas/proyectos manualmente
  - ✅ Asignar/cambiar roles de cualquier usuario
  - ✅ Ver panel /admin/super

**Identificación en código:**
```typescript
const isSuperAdmin = user.rol === 'SUPER_ADMIN'
```

#### 2. Admin de Proyecto
- **Asignación**: `es_admin_proyecto = TRUE`
- **Acceso**:
  - ✅ Ver todos los datos de SU proyecto
  - ✅ Invitar usuarios a SU proyecto
  - ✅ Cambiar roles de usuarios en SU proyecto
  - ✅ Ver panel /admin/proyecto
  - ❌ No puede ver otros proyectos
  - ❌ No puede aprobar solicitudes globales

**Identificación en código:**
```typescript
const isProjectAdmin = user.es_admin_proyecto === true
```

#### 3. Usuario Normal
- **Asignación**: `es_admin_proyecto = FALSE`
- **Acceso**:
  - ✅ Ver datos según su rol específico
  - ✅ Solo accede a SU proyecto
  - ❌ No puede invitar usuarios
  - ❌ No puede cambiar roles

---

### Row Level Security (RLS)

**Regla Principal:**
> Todos los datos están filtrados por `proyecto_id` del usuario autenticado

```sql
-- Ejemplo: Política para tabla de datos del proyecto
CREATE POLICY "usuarios_solo_ven_su_proyecto" 
ON tabla_datos
FOR SELECT 
USING (
  -- SUPER_ADMIN ve todo
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND rol = 'SUPER_ADMIN'
  )
  OR
  -- Usuarios normales solo ven su proyecto
  proyecto_id IN (
    SELECT proyecto_id 
    FROM users 
    WHERE id = auth.uid()
    AND estado_usuario = 'ACTIVO'
  )
);
```

---

## 📱 Pantallas y Rutas

### Públicas
- `/` - Landing page
- `/login` - Inicio de sesión
- `/registro` - Registro (con o sin token)
- `/registro?token=ABC123` - Registro con invitación

### Autenticadas
- `/dashboard` - Dashboard principal (filtrado por proyecto)
- `/perfil` - Perfil del usuario
- `/onboarding` - Completar información (solo PENDIENTE)
- `/pendiente` - Pantalla de espera (solo PENDIENTE)

### Admin de Proyecto
- `/admin/proyecto` - Panel de gestión del proyecto
- `/admin/proyecto/invitar` - Generar invitaciones
- `/admin/proyecto/equipo` - Ver y gestionar equipo

### Super Admin
- `/admin/super` - Panel global
- `/admin/super/solicitudes` - Aprobar solicitudes pendientes
- `/admin/super/empresas` - Gestionar empresas
- `/admin/super/proyectos` - Gestionar proyectos
- `/admin/super/usuarios` - Ver todos los usuarios

---

## 🎨 Componentes Clave

### 1. ProtectedRoute
```typescript
// Verifica estado_usuario y redirige según corresponda
- PENDIENTE → /pendiente
- RECHAZADO → /login (con mensaje)
- ACTIVO → Permite acceso
```

### 2. ProjectGuard
```typescript
// Verifica que el usuario tenga proyecto_id asignado
// Si no tiene → Redirige a /onboarding
```

### 3. AdminGuard
```typescript
// Verifica es_admin_proyecto = TRUE
// Si no es admin → Redirige a /dashboard
```

### 4. SuperAdminGuard
```typescript
// Verifica rol = 'SUPER_ADMIN'
// Si no es super admin → Redirige a /dashboard
```

---

## 📝 Plan de Implementación

### Fase 1: Base de Datos ✅ PRÓXIMA
1. Crear tabla `empresas`
2. Crear tabla `proyectos`
3. Crear tabla `invitaciones`
4. Modificar tabla `users` (agregar columnas)
5. Crear políticas RLS básicas
6. Crear funciones helper (generar tokens, validar invitaciones)

### Fase 2: Autenticación y Estados
1. Actualizar servicio de auth para manejar estados
2. Crear middleware de rutas protegidas
3. Implementar guards (ProtectedRoute, ProjectGuard, etc.)

### Fase 3: Flujo de Registro
1. Actualizar `/registro` para detectar tokens
2. Crear `/onboarding` para usuarios sin invitación
3. Crear `/pendiente` para usuarios en espera
4. Implementar lógica de estados de usuario

### Fase 4: Panel de Admin de Proyecto
1. Crear `/admin/proyecto`
2. Implementar sistema de invitaciones
3. Permitir cambio de roles dentro del proyecto
4. Mostrar equipo del proyecto

### Fase 5: Panel de Super Admin
1. Crear `/admin/super`
2. Implementar aprobación de solicitudes
3. Gestión de empresas y proyectos
4. Vista global de usuarios

### Fase 6: Dashboard y Aislamiento
1. Actualizar `/dashboard` con filtro de proyecto
2. Implementar RLS en todas las tablas de datos
3. Testing de aislamiento de datos
4. Verificar que usuarios solo vean su proyecto

---

## 🔍 Testing Checklist

### Aislamiento de Datos
- [ ] Usuario A no puede ver datos de Proyecto B
- [ ] Admin de Proyecto A no puede gestionar Proyecto B
- [ ] SUPER_ADMIN puede ver todos los proyectos

### Flujos de Registro
- [ ] Registro con invitación válida → ACTIVO inmediato
- [ ] Registro sin invitación → PENDIENTE
- [ ] Primer usuario crea empresa → Admin de Proyecto

### Permisos
- [ ] Usuario PENDIENTE no accede a /dashboard
- [ ] Usuario RECHAZADO puede volver a solicitar
- [ ] Admin de Proyecto puede invitar usuarios
- [ ] Solo SUPER_ADMIN aprueba solicitudes globales

---

## 📌 Notas Importantes

1. **Nombres únicos**: Empresas y proyectos tienen nombres únicos globalmente
2. **Sin expiración**: Las invitaciones no expiran
3. **SUPER_ADMIN manual**: Solo se asigna directamente en la base de datos
4. **Un proyecto por usuario**: No hay selector de proyectos, el usuario está fijo en uno
5. **Aislamiento estricto**: RLS debe garantizar que no se filtren datos entre proyectos

---

## 🚀 Próximo Paso

**Comenzar con Fase 1: Crear las tablas en Supabase**

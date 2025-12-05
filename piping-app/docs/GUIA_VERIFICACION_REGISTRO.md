# ✅ Checklist: Flujo de Registro y Onboarding

## Pasos del Flujo Correcto

1. **Usuario va a `/registro`**
2. Llena el formulario (nombre, email, password)
3. Click en "Registrarse"
4. Se crea en `auth.users` y `public.users` automáticamente
5. Redirección a `/onboarding`
6. Crea empresa
7. Crea primer proyecto
8. Redirección a `/dashboard`

---

## ⚠️ Posibles Errores y Soluciones

### Error 1: "No pudimos crear tu usuario"
**Causa**: Fallo en `auth.signUp()`
**Revisar**:
- Email ya existe
- Password muy corta (mínimo 6 caracteres)
- Supabase caído

### Error 2: "Hubo un problema creando tu perfil"
**Causa**: Fallo en `handle_new_user_profile()`
**Solución SQL**:
```sql
-- Verificar que la función existe
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_profile';

-- Si NO existe, crearla:
-- (ejecutar el script supabase-fix-user-profile.sql)
```

### Error 3: "No pudimos cargar tu perfil" (al hacer login)
**Causa**: Usuario existe en `auth.users` pero NO en `public.users`
**Solución SQL**:
```sql
-- Verificar discrepancia
SELECT 
    'auth.users' as tabla,
    COUNT(*) as total
FROM auth.users
UNION ALL
SELECT 
    'public.users' as tabla,
    COUNT(*) as total
FROM public.users;

-- Si hay más usuarios en auth que en public, hay un problema
```

### Error 4: El usuario se crea pero queda PENDIENTE
**Esperado**: Esto es normal si el usuario se registra normalmente.
**Solución**: El Super Admin debe aprobar desde `/admin/super/usuarios`

---

## Verificación Post-Registro

Ejecuta este SQL después de registrar un usuario para verificar que todo está bien:

```sql
-- Reemplaza 'email@nuevo.com' con el email que registraste
SELECT 
    'auth.users' as fuente,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'email@nuevo.com'

UNION ALL

SELECT 
    'public.users' as fuente,
    id::TEXT,
    correo,
    NULL as email_confirmed_at,
    created_at
FROM public.users 
WHERE correo = 'email@nuevo.com';
```

**Resultado esperado**: 2 filas (una de cada tabla) con el mismo `id`

---

## Verificación de Empresa y Proyecto

Después del onboarding, verifica:

```sql
-- Ver empresa creada
SELECT 
    e.id,
    e.nombre,
    e.created_by,
    u.nombre as creador
FROM empresas e
JOIN users u ON e.created_by = u.id
ORDER BY e.created_at DESC
LIMIT 1;

-- Ver proyecto creado
SELECT 
    p.id,
    p.nombre,
    p.codigo,
    p.empresa_id,
    e.nombre as empresa
FROM proyectos p
JOIN empresas e ON p.empresa_id = e.id
ORDER BY p.created_at DESC
LIMIT 1;

-- Ver usuario vinculado
SELECT 
    u.nombre,
    u.correo,
    u.estado_usuario,
    e.nombre as empresa,
    p.nombre as proyecto
FROM users u
LEFT JOIN empresas e ON u.empresa_id = e.id
LEFT JOIN proyectos p ON u.proyecto_id = p.id
WHERE u.correo = 'email@nuevo.com';
```

---

## 🐛 Debugging en Tiempo Real

Si algo falla, abre la consola del navegador (F12) y busca:

### En Network tab:
- `POST /auth/v1/signup` → Debería retornar 200
- `POST /api/empresas` → Debería retornar 200
- `POST /api/proyectos` → Debería retornar 200

### En Console tab:
Busca errores rojos. Los más comunes:
- `Error al crear perfil` → Problema con `handle_new_user_profile`
- `Foreign key violation` → Problema con las relaciones
- `RLS policy violation` → Problema con permisos

---

## Estado Esperado del Nuevo Usuario

✅ En `auth.users`:
- `email_confirmed_at`: NULL (hasta que confirme el email)
- `created_at`: Fecha actual

✅ En `public.users`:
- `estado_usuario`: 'PENDIENTE'
- `empresa_id`: NULL (hasta onboarding)
- `proyecto_id`: NULL (hasta onboarding)

✅ Después del onboarding:
- `empresa_id`: UUID de la empresa creada
- `proyecto_id`: UUID del proyecto creado
- `estado_usuario`: Sigue 'PENDIENTE' (debe ser aprobado por Super Admin)

---

## Flujo Ideal Completo

```
1. Registro → Usuario creado en auth + public
   └─ Estado: PENDIENTE
   
2. Onboarding → Empresa y proyecto creados
   └─ Usuario.empresa_id = Empresa.id
   └─ Usuario.proyecto_id = Proyecto.id
   
3. Aprobación Super Admin → Estado cambia a ACTIVO
   └─ Puede acceder al dashboard
```

---

## Si TODO Falla...

Ejecuta este script de diagnóstico:

```sql
-- DIAGNÓSTICO COMPLETO
SELECT 'Total usuarios auth' as metrica, COUNT(*)::TEXT as valor FROM auth.users
UNION ALL
SELECT 'Total usuarios public', COUNT(*)::TEXT FROM public.users
UNION ALL
SELECT 'Discrepancia', (
    (SELECT COUNT(*) FROM auth.users) - 
    (SELECT COUNT(*) FROM public.users)
)::TEXT
UNION ALL
SELECT 'Función existe', 
    CASE WHEN EXISTS(
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'handle_new_user_profile'
    ) THEN 'SÍ ✅' ELSE 'NO ❌' END;
```

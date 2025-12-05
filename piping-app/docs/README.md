# PIPING - Sistema de Autenticación

Sistema de autenticación moderno construido con Next.js 15, Supabase y Tailwind CSS.

## 🚀 Características

- ✅ Autenticación completa (Registro, Login, Logout)
- ✅ Dashboard de usuario protegido
- ✅ Diseño moderno con glassmorphism y gradientes
- ✅ Responsive y optimizado para todos los dispositivos
- ✅ Row Level Security (RLS) en Supabase
- ✅ TypeScript para type safety
- ✅ Tailwind CSS para estilos

## 📋 Requisitos Previos

- Node.js 18+ instalado
- Cuenta de Supabase
- npm o yarn

## 🛠️ Configuración

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

El archivo `.env.local` ya está configurado con:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xjawohulhckhckufxwlk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

### 3. Configurar Base de Datos en Supabase

1. Ve a tu proyecto en Supabase: https://xjawohulhckhckufxwlk.supabase.co
2. Navega a **SQL Editor**
3. Ejecuta el script `supabase-setup.sql` que se encuentra en la raíz del proyecto

El script creará:
- Tabla `users` con columnas: id, nombre, rol, telefono, correo, created_at
- Políticas de Row Level Security (RLS) para proteger los datos
- Índices para optimizar consultas

### 4. Ejecutar el Proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
piping-app/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── login/
│   │   │   └── page.tsx       # Página de login
│   │   ├── registro/
│   │   │   └── page.tsx       # Página de registro
│   │   └── dashboard/
│   │       └── page.tsx       # Dashboard protegido
│   ├── lib/
│   │   └── supabase.ts        # Cliente de Supabase
│   ├── services/
│   │   └── auth.ts            # Servicios de autenticación
│   └── types/
│       └── user.ts            # Tipos TypeScript
├── .env.local                 # Variables de entorno
└── supabase-setup.sql         # Script SQL de configuración
```

## 🎨 Páginas

### Landing Page (`/`)
- Presentación del proyecto
- Botones para Login y Registro
- Cards con características principales

### Login (`/login`)
- Formulario de inicio de sesión
- Validación de errores
- Diseño glassmorphism con gradientes

### Registro (`/registro`)
- Formulario de registro completo
- Campos: Nombre, Teléfono, Email, Rol, Contraseña
- Validación de contraseñas coincidentes

### Dashboard (`/dashboard`)
- Página protegida que requiere autenticación
- Muestra información del usuario
- Botón de cerrar sesión

## 🔐 Seguridad

- Las contraseñas se almacenan de forma segura usando Supabase Auth
- Row Level Security (RLS) habilitado en todas las tablas
- Políticas que aseguran que los usuarios solo pueden ver/editar sus propios datos

## 🎯 Próximos Pasos

- [ ] Implementar middleware para protección de rutas
- [ ] Agregar recuperación de contraseña
- [ ] Implementar edición de perfil
- [ ] Agregar roles y permisos avanzados
- [ ] Deployment en Vercel

## 📝 Notas

- El proyecto usa Next.js 15 con App Router
- Supabase maneja toda la autenticación y base de datos
- El diseño está optimizado para una experiencia premium

## 🤝 Contribuir

Este proyecto está en desarrollo activo. Las contribuciones son bienvenidas.

## 📄 Licencia

MIT

# 🚀 Capacidades Funcionales de la Aplicación

Este documento resume las capacidades actuales del sistema, destacando los flujos de usuario, la estructura organizativa y las herramientas de administración.

---

## 1. 👥 Gestión de Usuarios y Onboarding

La aplicación cuenta con un sistema robusto para recibir y gestionar usuarios, con dos flujos principales de entrada:

### A. Registro por Invitación (Flujo Seguro)
Es la forma principal de agregar usuarios a proyectos específicos.
1.  **Generación de Invitación**: Un administrador genera un link único asociado a un Proyecto y un Rol específico.
2.  **Recepción**: El usuario recibe el link (por correo o directo).
3.  **Validación**: El sistema valida el token único.
4.  **Registro Simplificado**: El usuario completa sus datos (nombre, password). El correo y el rol ya vienen pre-cargados y bloqueados por seguridad.
5.  **Acceso Inmediato**: Al registrarse vía invitación, el usuario entra con estado **ACTIVO** y acceso directo a su dashboard.

### B. Auto-Registro (Flujo de Solicitud)
Para usuarios que llegan por su cuenta a la plataforma.
1.  **Registro Abierto**: El usuario se registra desde la página pública.
2.  **Estado Pendiente**: La cuenta se crea con estado **PENDIENTE**.
3.  **Onboarding**: El usuario es redirigido a una pantalla de espera (`/onboarding`) donde se le informa que debe esperar aprobación.
4.  **Aprobación Admin**: Un Super Admin debe revisar y aprobar la solicitud para dar acceso.

---

## 2. 🏢 Estructura Organizativa (Multi-Tenant)

La aplicación organiza la información en una jerarquía clara para soportar múltiples clientes:

### Empresas
- Entidad de nivel superior.
- Puede tener múltiples **Proyectos**.
- Tiene estados: **ACTIVA** o **INACTIVA**.
- Si una empresa se desactiva, se restringe el acceso a sus recursos.

### Proyectos
- Pertenecen a una Empresa.
- Tienen un **Código Único** (ej: `PROJ-001`) generado automáticamente.
- Ciclo de vida gestionable:
  - 🟢 **ACTIVO**: Operativo normal.
  - 🟡 **PAUSADO**: Operaciones detenidas temporalmente.
  - ⚪ **FINALIZADO**: Proyecto cerrado (histórico).

### Usuarios
- Pertenecen a una Empresa y (opcionalmente) a un Proyecto específico.
- Roles diferenciados:
  - **Super Admin**: Control total del sistema.
  - **Admin de Proyecto**: Gestión dentro de su proyecto.
  - **Usuario / Solo Lectura**: Acceso limitado según funciones.

---

## 3. 🛠️ Panel de Super Administración

El "Centro de Comando" para los administradores globales (`/admin/super`).

### Dashboard General
- Estadísticas en tiempo real:
  - Total de Usuarios, Empresas y Proyectos.
  - Usuarios pendientes de aprobación.
  - Accesos rápidos a funciones críticas.

### Gestión de Empresas
- **Visualización**: Lista de todas las empresas con indicadores de actividad.
- **Control**: Activar/Desactivar empresas con un clic.
- **Seguridad**: Eliminación protegida (no permite borrar empresas con proyectos activos).

### Gestión de Proyectos
- **Supervisión**: Vista global de todos los proyectos de todas las empresas.
- **Control de Estado**: Pausar, reactivar o finalizar proyectos.
- **Seguridad**: Eliminación protegida (no permite borrar proyectos con usuarios activos).
- **Indicadores**: Alertas visuales si un proyecto tiene usuarios o invitaciones pendientes.

### Gestión de Usuarios Global
- **Control de Acceso**: Aprobar o Rechazar usuarios que se auto-registraron.
- **Auditoría**: Ver a qué empresa/proyecto pertenece cada usuario.
- **Limpieza**: Eliminar usuarios del sistema.
- **Filtros**: Ver rápidamente usuarios Pendientes, Activos o Rechazados.

---

## 4. 🛡️ Seguridad y Control

La aplicación implementa múltiples capas de seguridad:

- **Rutas Protegidas**: Middleware y componentes HOC (`ProtectedRoute`) que verifican autenticación y roles.
- **Integridad de Datos**: Base de datos con restricciones (`Foreign Keys`) que impiden dejar datos corruptos o huérfanos.
- **Validaciones**: Verificaciones tanto en Frontend (UI) como en Backend antes de realizar acciones críticas.
- **Feedback**: Sistema de alertas y confirmaciones para evitar errores humanos (ej: borrar un proyecto por accidente).

---

## 5. 📧 Sistema de Invitaciones

- **Tokens Únicos**: Cada invitación genera un token criptográfico único.
- **Un solo uso**: Una vez usada, la invitación se marca como tal y no puede reutilizarse.
- **Pre-asignación**: Los roles y proyectos se definen al crear la invitación, asegurando que el usuario tenga los permisos correctos desde el primer segundo.

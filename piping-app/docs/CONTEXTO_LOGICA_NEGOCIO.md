# Contexto Maestro de Lógica de Negocio - Sistema PIPING

> **Propósito:** Este archivo sirve como fuente de verdad y contexto rápido para cambios de sesión. Define las reglas de negocio, arquitectura y estado actual del sistema.

---

## 1. Arquitectura del Sistema

### Modelo "Offline-First" (En Implementación)
La aplicación opera bajo un modelo de **prioridad local**:
- **Lectura:** UI lee de `IndexedDB` (Dexie) mediante hooks reactivos.
- **Escritura:** Cambios se guardan en local y se encolan en `pendingActions`.
- **Sincronización:** `SyncManager` procesa la cola en segundo plano hacia Supabase.
- **Estado de Red:** Indicadores visuales obligatorios (Online/Offline/Syncing).

### Arquitectura Multi-Tenant (CRÍTICO) 🔐
La aplicación es estrictamente **Multi-Tenant**.
- **Segregación:** TODOS los datos deben estar asociados a un `project_id`.
- **Aislamiento:** Un usuario NUNCA debe ver datos de un proyecto al que no pertenece.
- **Offline:** La base de datos local `PipingDB` almacena múltiples proyectos, pero las queries SIEMPRE deben filtrar por `project_id`.
- **Sync:** La sincronización se realiza POR PROYECTO (`syncProject(projectId)`).

### Despliegue en Faena (Edge Computing) 🏗️
- **Infraestructura:** La app se autoaloja en un **Mini-PC** en la obra.
- **Conectividad:** 
  - "Online" = Conexión a la red LAN/WiFi del Mini-PC (Intranet).
  - No se requiere salida a Internet global para operar y sincronizar.
- **Sincronización:** Los dispositivos móviles sincronizan contra el Mini-PC cuando entran en su rango WiFi.
- **Offline-First:** Esencial para trabajo en terreno fuera del rango del Mini-PC.

### Stack Tecnológico
- **Frontend:** Next.js 14+ (App Router), React 19, TailwindCSS.
- **Estado:** Zustand (Global), Dexie (Persistente Local).
- **Backend:** Supabase (PostgreSQL + RLS + Storage).
- **PWA:** @ducanh2912/next-pwa.

---

## 2. Entidades Principales

### Jerarquía
`Empresa` → `Proyecto` → `Cuadrilla` → `Usuario`

### Spools (Unidad Fundamental)
El spool es la unidad atómica de seguimiento, no la soldadura.
- **Ciclo de Vida (7 Fases):**
  1. **Soldadura Taller** (Automático por `spools_welds`)
  2. **END/NDE** (Manual - Inspector)
  3. **PWHT** (Manual/NA)
  4. **Tratamiento Superficial** (Manual)
  5. **Despacho/Logística** (Manual - Crítico para transporte) 🚛
  6. **Montaje Campo** (Manual)
  7. **Soldadura Campo** (Automático)

### Levantamientos Fotográficos
- Documentación visual de ubicación física.
- Almacenamiento: Blob local → Sync → Supabase Storage.
- Relación 1:N con Spools.

---

## 3. Lógica de Sincronización

### Estrategia "Optimistic UI"
1. Usuario ejecuta acción (ej: soldar).
2. Se actualiza DB Local (`welds`, `spool_status`).
3. Se actualiza Store de Sincronización (`pendingCount++`).
4. UI refleja cambio inmediatamente (Check verde).
5. Background Worker intenta subir.
   - **Éxito:** Elimina de cola, marca `synced: true`.
   - **Fallo:** Reintenta con backoff exponencial.

### Manejo de Conflictos
- **Last Write Wins:** Basado en timestamp del servidor vs local.
- **Resolución:** El servidor tiene la verdad final en caso de divergencia crítica.

---

## 4. Roles y Permisos (RLS)

- **ADMIN:** Acceso total. Gestión de config y ubicaciones.
- **LOGISTICA:** Read/Update en Spools (Fase Despacho) y Materiales.
- **CALIDAD (QC):** Read/Update en fases NDT, PWHT, Liberación.
- **SUPERVISOR:** Gestión de avance, asignación de cuadrillas.
- **SOLDADOR:** Solo visualización de trabajo asignado (Filtrado por estampa).

---

## 5. Estado Actual del Desarrollo

### Módulos Completados
- [x] Gestión de Usuarios y Roles Base.
- [x] Carga de Ingeniería (SpoolGen/Excel).
- [x] Tracking de Fabricación (7 Fases).
- [x] Levantamientos Fotográficos (Online).
- [x] Infraestructura Base Offline (Dexie, SyncStore).

### En Progreso (Transición Offline)
- [ ] Migración de Hooks de lectura a Dexie.
- [ ] Implementación de cola de escritura (`SyncManager`).
- [ ] Adaptación de UI para feedback local.

---

## 6. Referencias de Código Clave

- **DB Local:** `src/lib/db/index.ts`
- **Sync Manager:** `src/lib/sync/SyncManager.ts`
- **Estado Sync:** `src/store/syncStore.ts`
- **Lógica Spools:** `database/migrations/28-spool-fabrication-tracking.sql`

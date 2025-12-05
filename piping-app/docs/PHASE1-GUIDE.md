# FASE 1: Ingeniería y Versionado - Guía de Implementación

## 1. Base de Datos (SQL)
El archivo `supabase-phase1-engineering.sql` contiene la estructura necesaria.
**Acción requerida**: Ejecuta este script en tu Editor SQL de Supabase.

Esto creará las tablas:
- `isometrics`
- `isometric_revisions`
- `spools`
- `joints`
- Y actualizará `proyectos` con configuración JSONB.

## 2. Código (Ya implementado)
- **Tipos**: `src/types/engineering.ts`
- **Servicio**: `src/services/engineering.ts` (Incluye lógica de importación masiva)

## 3. Próximos Pasos (UI)
Una vez ejecutado el SQL, construiremos:

1.  **Página de Ingeniería**: `/admin/proyecto/[id]/ingenieria`
    - Listado de Isométricos.
    - Botón "Importar Revisión".

2.  **Detalle de Revisión**: `/admin/proyecto/[id]/ingenieria/iso/[isoId]/rev/[revId]`
    - Ver Spools y Joints de esa versión específica.

## 4. Prueba de Concepto
Podremos subir un JSON/Excel simulado y ver cómo se crea la estructura relacional automáticamente.

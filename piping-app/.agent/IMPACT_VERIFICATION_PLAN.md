# 🎯 Plan de Implementación: Módulo de Verificación de Impacto

## Objetivo General
Desarrollar un sistema completo de verificación de impactos entre revisiones de isométricos que:
- Detecte automáticamente cambios entre revisiones
- Preserve la producción ya realizada cuando sea posible
- Documente impactos y diferencias de manera clara
- Permita gestión de cuadrillas y seguimiento de avances

---

## 📊 Estado de Revisión: Nuevo Flujo

### Estados Actuales
- `PENDIENTE`: Revisión anunciada pero sin detalles cargados
- `VIGENTE`: Revisión actual activa
- `OBSOLETA`: Revisión superada por una nueva
- `ELIMINADA`: Revisión marcada como eliminada (soft delete)

### Nuevo Estado a Implementar
- `VERIFICAR_IMPACTO`: Estado intermedio para revisiones que requieren análisis de impacto antes de ser marcadas como `SPOOLEADO`

### Flujo de Estados Propuesto

```
1. Nueva Revisión Cargada → VIGENTE
2. Se cargan detalles (Welds, MTO, Bolted Joints)
3. Sistema verifica si hay revisión anterior SPOOLEADA:
   - NO existe anterior SPOOLEADA → Auto marca como SPOOLEADO ✅
   - SÍ existe anterior SPOOLEADA → Estado = VERIFICAR_IMPACTO ⚠️
4. En VERIFICAR_IMPACTO:
   - Usuario visualiza comparación lado a lado
   - Sistema detecta automáticamente impactos
   - Usuario valida qué avances se migran
   - Usuario aprueba → SPOOLEADO
```

---

## 🧩 Módulos a Desarrollar

### ✅ Módulo 1: Base de Datos - Tablas de Impacto

**Archivo:** `database/impact-verification-schema.sql`

**Tablas Nuevas:**

1. **`revision_impacts`** - Log de impactos detectados
   - `id` (UUID)
   - `new_revision_id` (UUID) → Revisión nueva
   - `old_revision_id` (UUID) → Revisión anterior
   - `impact_type` (ENUM: 'WELD_ADDED', 'WELD_REMOVED', 'WELD_MODIFIED', 'MTO_CHANGED', 'SPOOL_CHANGED')
   - `entity_type` (ENUM: 'WELD', 'MTO', 'BOLTED_JOINT', 'SPOOL')
   - `entity_id` (UUID) → ID del elemento impactado
   - `old_value` (JSONB) → Valor anterior
   - `new_value` (JSONB) → Valor nuevo
   - `impact_summary` (TEXT) → Descripción legible
   - `is_blocking` (BOOLEAN) → Si impide migración automática
   - `created_at`

2. **`cuadrillas`** - Equipos de trabajo
   - `id` (UUID)
   - `proyecto_id` (UUID)
   - `nombre` (TEXT)
   - `tipo` (ENUM: 'PRINCIPAL', 'SECUNDARIA')
   - `supervisor_id` (UUID) → FK a users
   - `capataz_id` (UUID) → FK a users
   - `active` (BOOLEAN)
   - `created_at`

3. **`cuadrilla_members`** - Miembros de cuadrilla
   - `id` (UUID)
   - `cuadrilla_id` (UUID)
   - `user_id` (UUID)
   - `role` (ENUM: 'SUPERVISOR', 'CAPATAZ', 'MAESTRO', 'SOLDADOR')
   - `joined_at`
   - `left_at` (nullable)

4. **`weld_executions`** - Registro detallado de soldaduras ejecutadas
   - `id` (UUID)
   - `weld_id` (UUID) → FK a spools_welds
   - `revision_id` (UUID)
   - `executed_by` (UUID) → Soldador
   - `cuadrilla_id` (UUID)
   - `execution_date` (DATE)
   - `quality_status` (ENUM: 'PENDING', 'APPROVED', 'REJECTED', 'REWORK')
   - `migrated_from_revision_id` (UUID, nullable) → Si fue migrado
   - `notes` (TEXT)
   - `created_at`

5. **`impact_migration_log`** - Log de migraciones aprobadas
   - `id` (UUID)
   - `impact_id` (UUID) → FK a revision_impacts
   - `migration_approved` (BOOLEAN)
   - `approved_by` (UUID)
   - `approved_at`
   - `reason` (TEXT)

---

### ✅ Módulo 2: Tipos TypeScript

**Archivo:** `src/types/impact-verification.ts`

**Interfaces:**

```typescript
export type ImpactType = 
  | 'WELD_ADDED' 
  | 'WELD_REMOVED' 
  | 'WELD_MODIFIED'
  | 'MTO_INCREASED'
  | 'MTO_DECREASED'
  | 'MTO_ITEM_ADDED'
  | 'MTO_ITEM_REMOVED'
  | 'BOLTED_JOINT_ADDED'
  | 'BOLTED_JOINT_REMOVED';

export type EntityType = 'WELD' | 'MTO' | 'BOLTED_JOINT' | 'SPOOL';

export interface RevisionImpact {
  id: string;
  new_revision_id: string;
  old_revision_id: string;
  impact_type: ImpactType;
  entity_type: EntityType;
  entity_id: string;
  old_value: any;
  new_value: any;
  impact_summary: string;
  is_blocking: boolean;
  created_at: string;
}

export interface Cuadrilla {
  id: string;
  proyecto_id: string;
  nombre: string;
  tipo: 'PRINCIPAL' | 'SECUNDARIA';
  supervisor_id?: string;
  capataz_id?: string;
  active: boolean;
  created_at: string;
}

export interface CuadrillaMember {
  id: string;
  cuadrilla_id: string;
  user_id: string;
  role: 'SUPERVISOR' | 'CAPATAZ' | 'MAESTRO' | 'SOLDADOR';
  joined_at: string;
  left_at?: string;
}

export interface WeldExecution {
  id: string;
  weld_id: string;
  revision_id: string;
  executed_by: string;
  cuadrilla_id: string;
  execution_date: string;
  quality_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REWORK';
  migrated_from_revision_id?: string;
  notes?: string;
  created_at: string;
}

export interface ImpactComparisonResult {
  old_revision: {
    id: string;
    codigo: string;
    welds: WeldWithExecution[];
    materials: MaterialWithStatus[];
    bolted_joints: BoltedJointWithStatus[];
  };
  new_revision: {
    id: string;
    codigo: string;
    welds: WeldWithExecution[];
    materials: MaterialWithStatus[];
    bolted_joints: BoltedJointWithStatus[];
  };
  impacts: RevisionImpact[];
  summary: {
    welds_can_migrate: number;
    welds_impacted: number;
    welds_new: number;
    materials_delta: { [item_code: string]: number };
    bolted_joints_can_migrate: number;
    bolted_joints_impacted: number;
  };
}

export interface WeldWithExecution extends SpoolWeld {
  executed: boolean;
  execution_date?: string;
  executed_by?: string;
  can_migrate?: boolean; // Calculado durante comparación
  impact_reason?: string; // Razón del impacto
}

export interface MaterialWithStatus extends MaterialTakeOff {
  delta?: number; // Diferencia con revisión anterior
  impact_type?: 'INCREASED' | 'DECREASED' | 'NEW' | 'REMOVED';
}

export interface BoltedJointWithStatus extends BoltedJoint {
  executed: boolean;
  execution_date?: string;
  can_migrate?: boolean;
  impact_reason?: string;
}
```

---

### ✅ Módulo 3: Servicio de Comparación de Impactos

**Archivo:** `src/services/impact-comparison.ts`

**Funciones Principales:**

1. `compareRevisions(oldRevisionId, newRevisionId)`: Compara dos revisiones y detecta impactos
2. `detectWeldImpacts()`: Analiza soldaduras
3. `detectMaterialImpacts()`: Analiza MTO
4. `detectBoltedJointImpacts()`: Analiza juntas empernadas
5. `canMigrateWeld(oldWeld, newWeld)`: Determina si una soldadura puede migrarse
6. `approveMigration(impactId, userId)`: Aprueba la migración de un avance
7. `migrateExecutions(oldRevisionId, newRevisionId, approvedWeldIds)`: Migra avances aprobados

**Lógica de Detección de Impactos (Welds):**

```typescript
// Una soldadura puede migrarse SI:
// 1. Existe en ambas revisiones con el mismo weld_number
// 2. Los campos críticos no cambiaron:
//    - spool_number
//    - type_weld
//    - nps (tolerancia ±1)
//    - sch
//    - material (mismo o compatible)
// 3. Ya estaba ejecutada en la revisión anterior

// Una soldadura está IMPACTADA SI:
// - Cambió de spool
// - Cambió el tipo de soldadura
// - Cambió el diámetro significativamente
// - Cambió el material de manera incompatible
```

---

### ✅ Módulo 4: API Routes

**Archivo:** `src/app/api/impact-verification/compare/route.ts`

```typescript
POST /api/impact-verification/compare
Body: { old_revision_id, new_revision_id }
Response: ImpactComparisonResult
```

**Archivo:** `src/app/api/impact-verification/approve-migration/route.ts`

```typescript
POST /api/impact-verification/approve-migration
Body: { 
  new_revision_id, 
  old_revision_id,
  approved_weld_ids: string[],
  approved_bolted_joint_ids: string[]
}
Response: { success: boolean, migrated_count: number }
```

**Archivo:** `src/app/api/cuadrillas/route.ts`

```typescript
GET /api/cuadrillas?proyecto_id=xxx
POST /api/cuadrillas
PUT /api/cuadrillas/:id
DELETE /api/cuadrillas/:id
```

---

### ✅ Módulo 5: Componente UI - Vista de Comparación

**Archivo:** `src/components/engineering/ImpactVerificationView.tsx`

**Características:**
- Layout dividido 50/50 (Obsoleta | Nueva)
- Tabs para: Welds | MTO | Bolted Joints
- Indicadores visuales:
  - ✅ Verde: Puede migrarse automáticamente
  - ⚠️ Amarillo: Requiere revisión
  - ❌ Rojo: Impactado, no puede migrarse
  - 🆕 Azul: Nuevo elemento
- Checkbox para seleccionar elementos a migrar
- Botón "Aprobar y Marcar como SPOOLEADO"
- Resumen de impactos en cards superiores

**Archivo:** `src/components/engineering/WeldsComparison.tsx`
- Tabla comparativa de soldaduras
- Filtros por estado (Ejecutadas, Pendientes, Impactadas)
- Detalles al hacer hover sobre diferencias

**Archivo:** `src/components/engineering/MTOComparison.tsx`
- Lista de materiales con deltas
- Resaltado de aumentos/disminuciones
- Alertas para materiales no disponibles

**Archivo:** `src/components/engineering/BoltedJointsComparison.tsx`
- Similar a WeldsComparison pero para juntas empernadas

---

### ✅ Módulo 6: Gestión de Cuadrillas

**Archivo:** `src/components/production/CuadrillasManager.tsx`

**Características:**
- CRUD de cuadrillas
- Asignación de supervisor/capataz
- Agregar/remover maestros
- Lista de soldadores disponibles (transversal)
- Vista de rendimiento por cuadrilla

**Archivo:** `src/services/cuadrillas.ts`

Funciones:
- `createCuadrilla()`
- `assignMemberstoCuadrilla()`
- `getCuadrillaMembers()`
- `getCuadrillaPerformance()`

---

### ✅ Módulo 7: Actualización del EngineeringManager

**Modificaciones en:** `src/components/engineering/EngineeringManager.tsx`

- Detectar cuando una revisión tiene estado `VERIFICAR_IMPACTO`
- Mostrar botón/badge "⚠️ Verificar Impactos"
- Al hacer click, navegar a la vista de comparación
- Después de aprobar, marcar como `SPOOLEADO` y actualizar estado

---

## 🗓️ Cronograma de Implementación

### Fase 1: Base de Datos (1-2 horas)
- [x] Crear schema de tablas de impacto
- [x] Crear schema de cuadrillas
- [x] Agregar RLS policies
- [x] Crear índices de performance

### Fase 2: Backend (3-4 horas)
- [ ] Tipos TypeScript en `impact-verification.ts`
- [ ] Servicio `impact-comparison.ts` con lógica de detección
- [ ] API routes para comparación y aprobación
- [ ] Servicio `cuadrillas.ts`
- [ ] API routes para cuadrillas

### Fase 3: Frontend - Componentes Base (2-3 horas)
- [ ] `ImpactVerificationView.tsx` (layout principal)
- [ ] `WeldsComparison.tsx`
- [ ] `MTOComparison.tsx`
- [ ] `BoltedJointsComparison.tsx`

### Fase 4: Frontend - Gestión de Cuadrillas (2 horas)
- [ ] `CuadrillasManager.tsx`
- [ ] Integración con producción

### Fase 5: Integración (1-2 horas)
- [ ] Actualizar `EngineeringManager.tsx`
- [ ] Actualizar flujo de carga de detalles
- [ ] Testing end-to-end

### Fase 6: Pulido y Documentación (1 hora)
- [ ] Mensajes de usuario
- [ ] Validaciones
- [ ] Documentación de uso

---

## 🎨 Consideraciones de UX

1. **Códigos de Color Consistentes:**
   - Verde (`#10b981`): Migrable, OK
   - Amarillo (`#f59e0b`): Requiere atención
   - Rojo (`#ef4444`): Impactado, no migrable
   - Azul (`#3b82f6`): Nuevo elemento

2. **Iconografía:**
   - ✅ Check: Aprobado
   - ⚠️ Warning: Requiere revisión
   - ❌ X: Rechazado/Impactado
   - 🆕 New: Elemento nuevo
   - 🔄 Sync: En proceso de migración
   - 📊 Chart: Ver detalles

3. **Tooltips Informativos:**
   - Mostrar razón exacta del impacto al hacer hover
   - Valores antes/después en formato comparativo

4. **Confirmaciones:**
   - Antes de aprobar migración masiva
   - Antes de marcar como SPOOLEADO

---

## 📝 Notas Técnicas

### Performance
- Usar React Query para cacheo de comparaciones
- Paginación en tablas con >100 elementos
- Lazy loading de detalles

### Seguridad
- Solo usuarios con rol `ADMIN` o `PROJECT_MANAGER` pueden aprobar migraciones
- RLS policies verifican proyecto_id en todas las tablas

### Auditoría
- Todas las aprobaciones quedan registradas en `impact_migration_log`
- Migraciones automáticas registran `migrated_from_revision_id`

---

## 🚀 Próximos Pasos Inmediatos

1. ✅ Crear schema de base de datos
2. ✅ Definir tipos TypeScript
3. ✅ Implementar servicio de comparación
4. ✅ Crear API routes
5. ✅ Desarrollar componentes UI

**Comenzar con Fase 1: Base de Datos**

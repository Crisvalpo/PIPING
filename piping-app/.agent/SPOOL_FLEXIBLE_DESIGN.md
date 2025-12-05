# 🏗️ DISEÑO: Gestión Flexible de Spools

## 📋 Requisitos de Negocio

### 1. **Spools sin Uniones de Taller**
- Algunos spools son solo tramos de cañería cortados a medida
- No tienen soldaduras en taller (solo dimensionado)
- Se unirán en campo con soldaduras F (Field)
- Deben poder marcarse como "FABRICADO" directamente

### 2. **Spool como Unidad Base**
- El spool es la unidad fundamental del proceso
- Las uniones pueden variar, el spool permanece
- Control de fabricación a nivel de spool, no de uniones

### 3. **Flexibilidad en Campo**
- Agregar nuevas uniones durante instalación
- Eliminar uniones que ya no se necesitan
- Tracking de cambios realizados

---

## 🎨 UI/UX Propuesto

### Vista de Spool (Header Mejorado)

```
┌─────────────────────────────────────────────────────────────┐
│ Spool: SPI01             [FABRICADO ✓]      [⋮ Acciones]   │
│ Taller: 5/5 • Campo: 0/3 • Total: 8 uniones                │
│ ▼ Expandir                                                  │
├─────────────────────────────────────────────────────────────┤
│                         UNIONES                              │
│  ┌────────────────────────────────────────────┐             │
│  │ F003 [Taller] - EJECUTADO ✓                │             │
│  └────────────────────────────────────────────┘             │
│  ┌────────────────────────────────────────────┐             │
│  │ F010 [Taller] - PENDIENTE   [✓ Reportar]   │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
│  [➕ Agregar Unión en Campo]                                │
└─────────────────────────────────────────────────────────────┘
```

### Menú de Acciones del Spool (Botón ⋮)

1. **Marcar como Fabricado** (para spools sin soldaduras de taller)
2. **Ver Historial de Cambios**
3. **Agregar Notas**
4. **Descargar Reporte**

### Modal: Agregar Unión en Campo

```
┌──────────────────────────────────────┐
│ ➕ Agregar Unión en Campo            │
├──────────────────────────────────────┤
│                                      │
│ Spool: [SPI01      ▼]               │
│                                      │
│ Número de Unión: [F-NEW-001]        │
│                                      │
│ Tipo: [BW         ▼]                │
│                                      │
│ NPS: [4          ▼]                 │
│                                      │
│ Destino: ⦿ Taller  ⭘ Campo          │
│                                      │
│ Razón del Ajuste:                   │
│ ┌──────────────────────────────────┐ │
│ │ Ajuste por instalación...        │ │
│ └──────────────────────────────────┘ │
│                                      │
│    [Cancelar]  [Agregar Unión]      │
└──────────────────────────────────────┘
```

### Modal: Eliminar Unión

```
┌──────────────────────────────────────┐
│ ⚠️ Eliminar Unión                    │
├──────────────────────────────────────┤
│                                      │
│ ¿Eliminar unión F010?                │
│                                      │
│ Motivo de Eliminación *:             │
│ ┌──────────────────────────────────┐ │
│ │ Cambio en diseño de campo...     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ⚠️ Esta acción no eliminará la       │
│    unión permanentemente, solo       │
│    la marcará como inactiva.         │
│                                      │
│    [Cancelar]  [Eliminar Unión]     │
└──────────────────────────────────────┘
```

### Modal: Marcar Spool como Fabricado

```
┌──────────────────────────────────────┐
│ ✅ Marcar como Fabricado              │
├──────────────────────────────────────┤
│                                      │
│ Spool: SPI01                         │
│                                      │
│ Este spool:                          │
│ ⦿ Es solo tramo de cañería           │
│ ⭘ Tiene soldaduras completadas       │
│                                      │
│ Fecha de Fabricación:                │
│ [2024-12-03      ]                  │
│                                      │
│ Notas (opcional):                    │
│ ┌──────────────────────────────────┐ │
│ │ Tramo simple cortado a 2.5m...   │ │
│ └──────────────────────────────────┘ │
│                                      │
│    [Cancelar]  [Marcar Fabricado]   │
└──────────────────────────────────────┘
```

---

## 🗄️ Modelo de Datos

### Tabla: `spool_status`
```typescript
{
  id: UUID
  revision_id: UUID
  spool_number: string
  fabrication_status: 'PENDIENTE' | 'FABRICADO' | 'EN_PROCESO'
  fabrication_date: Date | null
  fabricated_by: UUID | null
  notes: string | null
  has_shop_welds: boolean  // FALSE = solo tramo de cañería
  created_at: Timestamp
  updated_at: Timestamp
}
```

### Tabla: `spools_welds` (campos adicionales)
```typescript
{
  // ... campos existentes
  added_in_field: boolean  // TRUE = agregada en campo
  deleted_at: Timestamp | null  // Soft delete
  deleted_by: UUID | null
  deletion_reason: string | null
}
```

---

## 🔄 Flujos de Usuario

### Flujo 1: Spool sin Soldaduras de Taller

```mermaid
1. Cargar detalles de ingeniería
2. Spool detectado sin soldaduras "S"
3. Estado: "SIN_SOLDADURAS_TALLER"
4. Usuario: Click "Marcar como Fabricado"
5. Modal: Confirmar + agregar notas
6. Estado: "FABRICADO" ✓
7. Spool listo para instalación en campo
```

### Flujo 2: Agregar Unión en Campo

```mermaid
1. Instalación en campo
2. Necesidad de nueva unión
3. Click "➕ Agregar Unión en Campo"
4. Llenar formulario
5. Guardar con flag added_in_field=TRUE
6. Unión visible en lista con badge "Campo"
7. Puede reportarse ejecución normalmente
```

### Flujo 3: Eliminar Unión

```mermaid
1. Cambio en diseño detectado
2. Click en unión → Menú → "Eliminar"
3. Modal: Ingresar motivo
4. Soft delete (deleted_at = NOW())
5. Unión oculta de la lista principal
6. Visible en "Historial" con motivo
7. Reversible si se necesita
```

---

## 🎯 Estados del Spool

### 1. **FABRICADO** 🟢
- Todas las soldaduras de taller ejecutadas
- O marcado manualmente (tramo de cañería)
- Listo para instalación

### 2. **EN_PROCESO** 🟡
- Algunas soldaduras ejecutadas
- Trabajo en progreso

### 3. **PENDIENTE** 🟠
- Sin trabajo ejecutado
- Recién anunciado

### 4. **SIN_SOLDADURAS_TALLER** ⚪
- No tiene soldaduras tipo "S"
- Solo dimensionado
- Puede marcarse fabricado directamente

---

## 📊 Queries Principales

### Ver spools sin soldaduras de taller:
```sql
SELECT * FROM spool_fabrication_status_v2
WHERE shop_welds_total = 0;
```

### Ver uniones agregadas en campo:
```sql
SELECT * FROM spools_welds
WHERE added_in_field = TRUE
AND deleted_at IS NULL;
```

### Ver uniones eliminadas (con motivo):
```sql
SELECT 
    weld_number,
    deleted_at,
    u.email as eliminado_por,
    deletion_reason
FROM spools_welds sw
LEFT JOIN auth.users u ON sw.deleted_by = u.id
WHERE deleted_at IS NOT NULL;
```

---

## 🚀 Implementación en Fases

### Fase 1: Backend (Base de Datos) ✅
- [x] Crear tabla `spool_status`
- [x] Agregar campos a `spools_welds`
- [x] Crear funciones SQL
- [x] Crear vista mejorada

### Fase 2: API Routes (Next.js)
- [ ] POST `/api/spools/mark-fabricated`
- [ ] POST `/api/spools/welds` (agregar unión)
- [ ] DELETE `/api/spools/welds/[id]` (soft delete)
- [ ] GET `/api/spools/[id]/history`

### Fase 3: UI Components
- [ ] Menú de acciones del spool
- [ ] Modal "Marcar como Fabricado"
- [ ] Modal "Agregar Unión"
- [ ] Modal "Eliminar Unión"
- [ ] Badge "Agregada en Campo"
- [ ] Vista de historial

### Fase 4: Testing
- [ ] Marcar spool sin uniones como fabricado
- [ ] Agregar unión en campo
- [ ] Eliminar unión con motivo
- [ ] Verificar soft delete reversible

---

## 📝 Próximos Pasos Inmediatos

1. **Ejecutar SQL:** `spool-management-flexible.sql`
2. **Crear API Routes** para las operaciones
3. **Actualizar MasterViewsManager.tsx** con nuevos modales
4. **Testing** con casos reales

¿Procedemos con la implementación? 🚀

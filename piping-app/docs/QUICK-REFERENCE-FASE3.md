# 🚀 Quick Reference - Fase 3: Anuncio de Revisiones

## 📌 Servicios Principales

### 1. `processRevisionAnnouncement`
**Ubicación:** `src/services/revision-announcement.ts`

**Propósito:** Procesa el Excel de anuncios y registra isométricos y revisiones.

**Parámetros:**
```typescript
processRevisionAnnouncement(
  projectId: string,
  rows: AnnouncementRow[]
)
```

**Lógica:**
1. Agrupa por isométrico
2. Crea/obtiene isométrico
3. Crea/actualiza revisiones
4. Determina cuál es VIGENTE (mayor número)
5. Marca anteriores como OBSOLETA
6. Actualiza `current_revision_id`

---

### 2. `processSpoolGenImport` (Modificado)
**Ubicación:** `src/services/engineering.ts`

**Cambios:**
- ❌ Ya NO crea nuevas revisiones automáticamente
- ✅ Valida que el isométrico exista
- ✅ Valida que haya revisión VIGENTE
- ✅ Valida que el archivo coincida con la revisión VIGENTE

**Errores Posibles:**
```
"El Isométrico [CODIGO] no existe. Debe cargarse primero en el Anuncio de Revisiones."
"El Isométrico [CODIGO] no tiene una revisión VIGENTE activa."
"La revisión del archivo SpoolGen ([REV]) no coincide con la revisión VIGENTE del sistema ([REV])."
```

---

## 🎯 Componentes Frontend

### Engineering Page
**Ubicación:** `src/app/admin/proyecto/[id]/ingenieria/page.tsx`

**Estados:**
```typescript
uploadMode: 'ANNOUNCEMENT' | 'SPOOLGEN'  // Modo actual
isometrics: any[]                         // Lista de isométricos
impacts: Impacto[]                        // Impactos detectados
```

**Funciones:**
- `handleFileUpload` - Procesa ambos tipos de Excel
- `handleDownloadTemplate` - Genera template según el modo
- `loadIsometrics` - Recarga la lista tras cambios
- `handleApproveImpact` / `handleRejectImpact` - Gestión de impactos

---

## 📊 Tipos TypeScript

### Isometrico
```typescript
interface Isometrico {
  id: string
  proyecto_id: string
  codigo: string
  current_revision_id?: string  // 🆕 Nuevo campo
  // ... otros campos
}
```

### IsometricoRevision
```typescript
interface IsometricoRevision {
  id: string
  isometric_id: string
  codigo: string
  estado: 'PENDIENTE' | 'VIGENTE' | 'OBSOLETA'
  fecha_emision: string
  pdf_url?: string          // 🆕 Nuevo campo
  fecha_anuncio?: string    // 🆕 Nuevo campo
  description?: string      // 🆕 Nuevo campo
}
```

---

## 🔄 Flujo de Datos

### Modo ANNOUNCEMENT
```
Excel → Parse JSON → processRevisionAnnouncement() → DB
                                                    ↓
                                          Determina VIGENTE
                                                    ↓
                                          Actualiza current_revision_id
```

### Modo SPOOLGEN
```
Excel → Parse JSON → Validar Isométrico Existe
                              ↓
                    Validar Revisión VIGENTE
                              ↓
                    Validar Coincidencia de Rev
                              ↓
                    processSpoolGenImport()
                              ↓
                    Cargar Spools/Joints/Materials
                              ↓
                    Detectar Impactos (si aplica)
```

---

## 🛠️ Comandos Útiles

### Desarrollo
```bash
npm run dev        # Inicia dev server
npm run build      # Build de producción
npm run lint       # Verifica errores
```

### Base de Datos
```powershell
# Aplicar migración (desde Supabase SQL Editor)
# Copiar contenido de: EJECUTAR-FASE3-MIGRACION.sql
```

---

## 📝 Logging

### En consola del servidor:
```
[06:45:00] Iniciando carga (ANNOUNCEMENT): archivo.xlsx
[06:45:01] Procesando 25 filas de anuncio...
[06:45:02] Procesados: 25, Errores: 0
[06:45:02] ✅ Anuncio procesado correctamente.
```

### En consola del cliente:
```
Using existing VIGENTE revision: 2 (uuid-here)
```

---

## 🔍 Debugging

### Ver revisiones de un isométrico:
```sql
SELECT i.codigo AS iso, r.codigo AS rev, r.estado
FROM isometrics i
JOIN isometric_revisions r ON r.isometric_id = i.id
WHERE i.proyecto_id = 'YOUR_PROJECT_ID'
ORDER BY i.codigo, r.codigo;
```

### Ver qué revisión es VIGENTE:
```sql
SELECT 
  i.codigo AS isometrico,
  i.current_revision_id,
  r.codigo AS revision_vigente,
  r.pdf_url
FROM isometrics i
LEFT JOIN isometric_revisions r ON r.id = i.current_revision_id
WHERE i.proyecto_id = 'YOUR_PROJECT_ID';
```

---

## 🎨 UI Components

### Tabs de Modo
```tsx
<button onClick={() => setUploadMode('ANNOUNCEMENT')}>
  1. Anuncio de Revisiones
</button>
<button onClick={() => setUploadMode('SPOOLGEN')}>
  2. Ingeniería de Detalle (SpoolGen)
</button>
```

### Badge de Revisión
```tsx
<span className={activeRev.estado === 'VIGENTE' 
  ? 'bg-green-500/20 text-green-300' 
  : 'bg-gray-500/20 text-gray-400'
}>
  Rev {activeRev.codigo}
</span>
```

---

## 🚨 Mensajes de Error Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "No se pudo detectar 'iso_number'" | Formato de Excel incorrecto | Usar template oficial |
| "El Isométrico no existe" | No se cargó el anuncio primero | Cargar Anuncio antes de SpoolGen |
| "La revisión no coincide" | SpoolGen tiene rev diferente | Verificar que coincida con VIGENTE |
| "Faltan hojas requeridas" | Excel SpoolGen incompleto | Incluir las 3 hojas requeridas |

---

**Última actualización:** 2025-11-28  
**Versión:** Phase 3

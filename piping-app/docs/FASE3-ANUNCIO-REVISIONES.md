# 🎯 Fase 3: Anuncio de Revisiones - Implementación Completa

## 📋 Resumen

Se ha implementado el flujo de **"Anuncio de Revisiones"** como fuente de verdad para el control documental de isométricos. Este sistema separa la gestión de revisiones del proceso de spooleo, permitiendo que el cliente anuncie nuevas revisiones antes de cargar los datos técnicos.

---

## 🔄 Flujo de Negocio

### 1. **Anuncio de Revisiones** (Primero)
- El cliente envía un Excel con el historial de revisiones de cada isométrico
- El sistema registra:
  - Isométricos
  - Revisiones
  - PDFs asociados
  - Cuál es la revisión VIGENTE (la más reciente)

### 2. **Carga SpoolGen** (Después)
- Se valida que el archivo SpoolGen corresponda a una revisión VIGENTE existente
- Si no existe la revisión anunciada, se rechaza la carga
- Si existe, se cargan spools, joints y materiales a esa revisión

---

## 🗂️ Archivos Creados/Modificados

### **Backend**
1. ✅ `supabase-phase3-announcements.sql` - Migración de base de datos
2. ✅ `src/services/revision-announcement.ts` - Servicio para procesar anuncios
3. ✅ `src/services/engineering.ts` - Modificado para validar revisiones
4. ✅ `src/types/engineering.ts` - Tipos actualizados

### **Frontend**
5. ✅ `src/app/admin/proyecto/[id]/ingenieria/page.tsx` - UI con tabs para ambos modos

---

## 🛠️ Instrucciones de Despliegue

### Paso 1: Aplicar Migración SQL

**Opción A: Desde Supabase Dashboard**
1. Ve a tu proyecto en Supabase
2. Navega a `SQL Editor`
3. Crea una nueva query
4. Copia y pega el contenido de `supabase-phase3-announcements.sql`
5. Ejecuta la query

**Opción B: Desde línea de comandos (si tienes psql instalado)**
```powershell
Get-Content supabase-phase3-announcements.sql | psql "TU_CONNECTION_STRING"
```

### Paso 2: Verificar la Aplicación

La aplicación ya está compilando con los nuevos cambios. Verifica:

```powershell
npm run dev
```

---

## 📊 Estructura de Datos

### **Tablas Modificadas**

#### `isometric_revisions`
```sql
- pdf_url (TEXT) - URL del PDF de la revisión
- fecha_anuncio (DATE) - Fecha en que se anunció la revisión
- description (TEXT) - Descripción opcional
```

#### `isometrics`
```sql
- current_revision_id (UUID) - Puntero a la revisión vigente actual
```

---

## 📁 Templates de Excel

### **Template 1: Anuncio de Revisiones**
Columnas requeridas:
- `N° ISOMÉTRICO` - Código del isométrico (e.g., "ISO-001")
- `N° LÍNEA` - Número de línea (opcional)
- `REV. ISO` - Número de revisión (e.g., "0", "1", "A")
- `ARCHIVO` - URL o nombre del PDF
- `FECHA` - Fecha de emisión

### **Template 2: SpoolGen** (Sin cambios)
Hojas requeridas:
- `bolted_joints`
- `spools_welds`
- `material_take_off`

---

## 🎨 Interfaz de Usuario

### **Tabs Implementados**

1. **"Anuncio de Revisiones"**
   - Carga el listado maestro de isométricos
   - Determina la revisión VIGENTE automáticamente
   - Registra PDFs y fechas

2. **"Ingeniería de Detalle (SpoolGen)"**
   - Valida contra la revisión VIGENTE
   - Carga spools, joints y materiales
   - Detecta impactos si ya existían datos

### **Tabla de Isométricos**
Muestra:
- Código del isométrico
- Revisión actual (con badge verde si es VIGENTE)
- Fecha de emisión
- Link al PDF (si existe)
- Botón "Ver Detalle" (a implementar en el futuro)

---

## 🔐 Reglas de Validación

### **Al cargar Anuncio:**
- ✅ Crea isométricos si no existen
- ✅ Crea o actualiza revisiones
- ✅ La revisión con número más alto pasa a VIGENTE
- ✅ Las anteriores pasan a OBSOLETA
- ✅ Actualiza `current_revision_id` del isométrico

### **Al cargar SpoolGen:**
- ❌ Rechaza si el isométrico no existe
- ❌ Rechaza si no hay revisión VIGENTE
- ❌ Rechaza si la revisión del archivo no coincide con la VIGENTE
- ✅ Carga datos solo si pasa todas las validaciones

---

## 🧪 Testing Manual

1. **Cargar Anuncio:**
   ```
   - Descarga template "Anuncio de Revisiones"
   - Llena con datos de prueba (al menos 2 isométricos con 2 revisiones cada uno)
   - Sube el archivo → Verifica que se marquen las revisiones correctas como VIGENTE
   ```

2. **Cargar SpoolGen:**
   ```
   - Descarga template "SpoolGen"
   - Llena con datos que coincidan con un isométrico y revisión ya anunciados
   - Sube el archivo → Verifica que se carguen spools/joints/materiales
   ```

3. **Validación de Errores:**
   ```
   - Intenta cargar SpoolGen de un isométrico NO anunciado → Debe fallar
   - Intenta cargar SpoolGen con revisión diferente a la VIGENTE → Debe fallar
   ```

---

## 🚀 Próximos Pasos Sugeridos

1. **Vista de Detalle:** Implementar la página individual de cada isométrico
2. **Historial de Revisiones:** Mostrar todas las revisiones (no solo la vigente)
3. **Upload de PDFs:** Permitir subir PDFs directamente desde la UI
4. **Diff Visual:** Mejorar la visualización de cambios entre revisiones
5. **Notificaciones:** Alertar a usuarios cuando hay nuevas revisiones

---

## 🐛 Posibles Problemas y Soluciones

### Problema: "El isométrico no existe"
**Solución:** Cargar primero el Anuncio de Revisiones antes de SpoolGen

### Problema: "La revisión no coincide"
**Solución:** Verificar que el número de revisión en SpoolGen sea exactamente igual al de la revisión VIGENTE

### Problema: No se ve el PDF
**Solución:** Verificar que el campo `ARCHIVO` en el Excel contenga una URL válida

---

## 📞 Contacto Técnico

Para dudas sobre esta implementación, contactar al equipo de desarrollo.

**Fecha de Implementación:** 2025-11-28
**Versión:** Phase 3 - Announcement Workflow

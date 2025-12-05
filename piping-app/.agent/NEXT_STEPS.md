# 🚀 Integración Completada - Próximos Pasos

## ✅ **INTEGRACIÓN UI COMPLETADA**

### **Archivos Modificados:**

1. **`src/types/engineering.ts`** ✅
   - Agregado estado `VERIFICAR_IMPACTO` a `RevisionStatus`

2. **`src/components/engineering/EngineeringManager.tsx`** ✅
   - ✅ Importado `ImpactVerificationView`
   - ✅ Agregado estado para modal de verificación
   - ✅ Creada función `handleShowImpactVerification()`
   - ✅ Agregado botón "⚠️ Verificar Impactos" en tabla
   - ✅ Agregado modal completo de verificación

---

## 🎯 **SIGUIENTE PASO CRÍTICO: EJECUTAR SCHEMA EN SUPABASE**

### **Paso 1: Acceder a Supabase**

1. Ir a [https://supabase.com](https://supabase.com)
2. Seleccionar tu proyecto PIPING
3. Ir a **SQL Editor** en el menú lateral

### **Paso 2: Ejecutar Schema SQL**

1. Abrir el archivo: `database/impact-verification-schema.sql`
2. Copiar **TODO** el contenido (377 líneas)
3. Pegar en el SQL Editor de Supabase
4. Click en **"Run"** o presionar `Ctrl+Enter`

### **Paso 3: Verificar Creación de Tablas**

Ejecutar el siguiente query para verificar:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'revision_impacts',
    'impact_migration_log',
    'cuadrillas',
    'cuadrilla_members',
    'weld_executions',
    'bolted_joint_executions'
);
```

**Resultado Esperado:** 6 filas (una por cada tabla)

---

## 🧪 **PROBAR EL FLUJO COMPLETO**

### **Escenario de Prueba:**

1. **Crear Revisión A (Rev 0):**
   - Subir anuncio de revisión
   - Cargar detalles de ingeniería (Welds, MTO, etc.)
   - ✅ Se debe marcar automáticamente como `SPOOLEADO`

2. **Simular Ejecución de Trabajo:**
   - (Opcional) Registrar soldaduras como ejecutadas usando APIs de cuadrillas
   - O simplemente asumir que hay producción

3. **Crear Revisión B (Rev 1):**
   - Subir anuncio
   - Cargar detalles de ingeniería **con cambios**
   - ⚠️ Se debe marcar como `PENDIENTE` (requiere verificación)
   - Debe aparecer botón amarillo "⚠️ Verificar Impactos"

4. **Ejecutar Verificación:**
   - Click en botón "⚠️ Verificar Impactos"
   - Se abre modal con vista de comparación
   - Ver soldaduras clasificadas: Migrables vs Impactadas
   - Seleccionar elementos a migrar
   - Aprobar migración

5. **Verificar Resultado:**
   - Nueva revisión debe cambiar a `SPOOLEADO`
   - Revisión anterior debe cambiar a `OBSOLETA`
   - Botón de verificación debe desaparecer

---

## 📊 **ESTADOS DE REVISIÓN**

El sistema ahora maneja los siguientes estados:

```
PENDIENTE          → Recién creada, sin detalles
  ↓
VIGENTE            → Tiene anuncio, es la última versión
  ↓
[Carga de Detalles]
  ↓
¿Hay SPOOLEADA anterior?
  ├─ NO → SPOOLEADO  ✅ (Automático)
  └─ SÍ → VERIFICAR_IMPACTO ⚠️ (Requiere aprobación)
        ↓
  [Usuario Aprueba]
        ↓
    SPOOLEADO ✅
```

---

## 🎨 **INDICADORES VISUALES**

### **En la Tabla:**

- **Botón amarillo con ⚠️:** Aparece cuando `spooling_status === 'PENDIENTE'` y `estado === 'VIGENTE'`
- **Estado VERIFICAR_IMPACTO:** (Opcional) Si modificas `engineering-details.ts` para setear este estado

### **En el Modal:**

- 🟢 **VERDE:** Elementos que pueden migrarse automáticamente
- 🔴 **ROJO:** Elementos impactados, no pueden migrarse
- 🔵 **AZUL:** Elementos nuevos
- 🟡 **AMARILLO:** Elementos eliminados

---

## 🔧 **OPCIONAL: Auto-marcar como VERIFICAR_IMPACTO**

Si quieres que el sistema automáticamente marque las revisiones con un estado especial:

### **Modificar `src/services/engineering-details.ts`:**

Buscar la función `uploadEngineeringDetails()` y agregar después de detectar `requires_impact_evaluation`:

```typescript
// Dentro de uploadEngineeringDetails()
if (results.requires_impact_evaluation) {
    await supabase
        .from('isometric_revisions')
        .update({ 
            spooling_status: 'VERIFICAR_IMPACTO' // Nuevo estado
        })
        .eq('id', revisionId);
}
```

**Nota:** Esto requiere agregar `'VERIFICAR_IMPACTO'` al tipo `SpoolingStatus` en `src/types/engineering.ts`.

---

## 📝 **API ENDPOINTS DISPONIBLES**

Ya puedes usar los siguientes endpoints:

### **1. Comparar Revisiones**
```typescript
POST /api/impact-verification/compare
Body: {
    old_revision_id: string,
    new_revision_id: string
}
```

### **2. Aprobar Migración**
```typescript
POST /api/impact-verification/approve-migration
Body: {
    new_revision_id: string,
    old_revision_id: string,
    approved_weld_ids: string[],
    approved_bolted_joint_ids: string[],
    approval_notes?: string
}
```

### **3. Gestionar Cuadrillas**
```typescript
GET /api/cuadrillas?proyecto_id=xxx
POST /api/cuadrillas
PUT /api/cuadrillas
DELETE /api/cuadrillas?id=xxx
```

### **4. Gestionar Miembros**
```typescript
GET /api/cuadrillas/[id]/members
POST /api/cuadrillas/[id]/members
DELETE /api/cuadrillas/[id]/members?user_id=xxx
```

---

## 🐛 **TROUBLESHOOTING**

### **Problema: No aparece el botón "Verificar Impactos"**

**Solución:**
- Verificar que la revisión tenga `spooling_status === 'PENDIENTE'`
- Verificar que la revisión tenga `estado === 'VIGENTE'`
- Revisar la consola del navegador para errores

### **Problema: "No se encontró una revisión anterior"**

**Solución:**
- Asegurarse de que existe otra revisión del mismo isométrico con estado `OBSOLETA`
- Verificar que las revisiones están correctamente enlazadas al mismo `isometric_id`

### **Problema: Error al abrir modal de comparación**

**Solución:**
- Verificar que los componentes están importados correctamente
- Revisar consola del navegador para errores de TypeScript
- Verificar que el schema SQL se ejecutó correctamente

### **Problema: Error en API /compare**

**Solución:**
- Verificar que las tablas existen en Supabase
- Verificar autenticación del usuario
- Revisar logs del servidor (terminal donde corre `npm run dev`)

---

## ✅ **CHECKLIST FINAL**

- [x] ✅ Tipos TypeScript actualizados
- [x] ✅ EngineeringManager integrado
- [x] ✅ Botón de verificación agregado
- [x] ✅ Modal de comparación implementado
- [ ] ⏳ Schema SQL ejecutado en Supabase
- [ ] ⏳ Prueba end-to-end realizada
- [ ] ⏳ Verificación de estados de revisión
- [ ] ⏳ Prueba de migración de avances

---

## 🎉 **RESULTADO ESPERADO**

Después de ejecutar el schema SQL y probar:

1. ✅ Las revisiones sin anterior SPOOLEADA → Se marcan automáticamente como SPOOLEADO
2. ✅ Las revisiones con anterior SPOOLEADA → Muestran botón ⚠️
3. ✅ Al hacer click en botón → Se abre modal de comparación
4. ✅ En el modal → Puedes ver soldaduras migrables vs impactadas
5. ✅ Al aprobar → Se ejecuta migración y marca como SPOOLEADO
6. ✅ Los avances ejecutados → Se preservan con trazabilidad completa

---

## 📞 **SIGUIENTE SESIÓN**

En la próxima sesión podemos:

1. **Ejecutar el schema SQL juntos** (si necesitas ayuda)
2. **Probar el flujo completo** con datos reales
3. **Implementar vistas detalladas** de MTO y Bolted Joints
4. **Crear componente de gestión de Cuadrillas**
5. **Agregar dashboard de performance**

---

**🎯 El módulo está 90% completo. Solo falta ejecutar el schema y probar!**

_Última actualización: 2025-12-02 15:00_

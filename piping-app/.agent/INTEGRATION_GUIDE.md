# 🚀 Guía de Integración - Módulo de Verificación de Impacto

## ✅ Estado Actual del Módulo

**Fecha:** 2025-12-02  
**Progreso:** 75% completado  
**Archivos creados:** 14  
**Líneas de código:** ~3,500+

---

## 📦 Archivos Implementados

### 🗄️ Base de Datos
- ✅ `database/impact-verification-schema.sql` (377 líneas)
  - 6 tablas nuevas con RLS completo
  - Triggers e índices optimizados
  - **ACCIÓN REQUERIDA:** Ejecutar en Supabase

### 🔷 TypeScript Types
- ✅ `src/types/impact-verification.ts` (420 líneas)
  - 25+ interfaces y tipos
  - Request/Response types para APIs

### ⚙️ Servicios Backend
- ✅ `src/services/impact-comparison.ts` (1,000+ líneas)
  - Lógica completa de comparación
  - Detección automática de impactos
  - Migración de avances
- ✅ `src/services/cuadrillas.ts` (300+ líneas)
  - CRUD de cuadrillas
  - Gestión de miembros
  - Performance tracking

### 🌐 API Routes
- ✅ `src/app/api/impact-verification/compare/route.ts`
- ✅ `src/app/api/impact-verification/approve-migration/route.ts`
- ✅ `src/app/api/cuadrillas/route.ts`
- ✅ `src/app/api/cuadrillas/[id]/members/route.ts`

### 🎨 Componentes UI
- ✅ `src/components/engineering/ImpactSummaryCards.tsx`
- ✅ `src/components/engineering/ImpactVerificationView.tsx`

### 📋 Documentación
- ✅ `.agent/IMPACT_VERIFICATION_PLAN.md` - Plan maestro
- ✅ `.agent/IMPACT_MODULE_STATUS.md` - Estado actualizado
- ✅ `.agent/INTEGRATION_GUIDE.md` - Esta guía

---

## 🔧 Pasos de Integración

### **Paso 1: Ejecutar Migración de Base de Datos**

```bash
# Copiar el contenido de database/impact-verification-schema.sql
# y ejecutarlo en el SQL Editor de Supabase
```

**Verificación:**
```sql
-- Verificar que las tablas se crearon correctamente
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

**Resultado esperado:** 6 filas

---

### **Paso 2: Actualizar RevisionStatus Type**

Agregar el nuevo estado `VERIFICAR_IMPACTO` a los tipos:

```typescript
// En src/types/engineering.ts
export type RevisionStatus = 'PENDIENTE' | 'VIGENTE' | 'OBSOLETA' | 'ELIMINADA' | 'VERIFICAR_IMPACTO';
```

---

### **Paso 3: Integrar en EngineeringManager**

Modificar `src/components/engineering/EngineeringManager.tsx` para detectar revisiones que requieren verificación:

```typescript
// Agregar import
import ImpactVerificationView from './ImpactVerificationView';

// Dentro del componente, agregar estado
const [showImpactVerification, setShowImpactVerification] = useState(false);
const [impactVerificationData, setImpactVerificationData] = useState<{
    oldRevisionId: string;
    newRevisionId: string;
    isoNumber: string;
} | null>(null);

// Función para mostrar verificación de impactos
function handleShowImpactVerification(newRevision: IsometricoRevision, oldRevision: IsometricoRevision, iso: Isometrico) {
    setImpactVerificationData({
        oldRevisionId: oldRevision.id,
        newRevisionId: newRevision.id,
        isoNumber: iso.codigo
    });
    setShowImpactVerification(true);
}

// En el render, detectar cuando una revisión necesita verificación
// (cuando engineering-details.ts retorna requires_impact_evaluation: true)
// Mostrar un botón:
{revision.spooling_status === 'PENDIENTE' && (
    <button
        onClick={() => handleShowImpactVerification(revision, previousRevision, isometric)}
        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 flex items-center gap-2"
    >
        <svg /* warning icon */ />
        ⚠️ Verificar Impactos
    </button>
)}

// Renderizar el modal/vista de verificación
{showImpactVerification && impactVerificationData && (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Verificación de Impactos</h2>
                    <button
                        onClick={() => setShowImpactVerification(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕ Cerrar
                    </button>
                </div>
                
                <ImpactVerificationView
                    oldRevisionId={impactVerificationData.oldRevisionId}
                    newRevisionId={impactVerificationData.newRevisionId}
                    isoNumber={impactVerificationData.isoNumber}
                    onMigrationComplete={() => {
                        setShowImpactVerification(false);
                        // Recargar datos
                        fetchData();
                    }}
                />
            </div>
        </div>
    </div>
)}
```

---

### **Paso 4: Actualizar Lógica de Carga de Detalles**

En `src/services/engineering-details.ts`, ya está implementado el retorno de `requires_impact_evaluation`.

**Opcional:** Modificar para que automáticamente marque el estado como `VERIFICAR_IMPACTO`:

```typescript
// En uploadEngineeringDetails()
if (results.requires_impact_evaluation) {
    await supabase
        .from('isometric_revisions')
        .update({ 
            spooling_status: 'VERIFICAR_IMPACTO' // Estado intermedio
        })
        .eq('id', revisionId);
}
```

---

### **Paso 5: Probar el Flujo End-to-End**

#### **Escenario de Prueba:**

1. **Crear dos revisiones del mismo isométrico:**
   - Revisión A (0): Cargar detalles → Se marca como SPOOLEADO automáticamente
   - Registrar algunas soldaduras como ejecutadas

2. **Crear Revisión B (1):**
   - Cargar detalles → Sistema detecta revisión anterior SPOOLEADA
   - Retorna `requires_impact_evaluation: true`
   - Estado: `VERIFICAR_IMPACTO`

3. **Verificar Impactos:**
   - Click en botón "⚠️ Verificar Impactos"
   - Se abre la vista de comparación
   - Ver soldaduras migrables vs impactadas
   - Seleccionar elementos a migrar
   - Aprobar migración

4. **Resultado Esperado:**
   - Nueva revisión marcada como SPOOLEADO
   - Ejecuciones migradas con `migrated_from_revision_id` seteado
   - Revisión A marcada como OBSOLETA

---

## 🎨 Personalización de UI

### Colores y Estilos

Los componentes usan Tailwind CSS. Puedes personalizar los colores editando:

```typescript
// ImpactSummaryCards.tsx
// Cambiar colores de borders:
border-blue-500 → border-[tu-color]
border-purple-500 → border-[tu-color]
border-amber-500 → border-[tu-color]
```

### Iconografía

Los componentes usan SVG icons de Heroicons. Puedes reemplazarlos con tu librería de iconos preferida.

---

## 🔐 Permisos y Seguridad

### Roles Requeridos

- **Ver comparaciones:** Cualquier usuario del proyecto
- **Aprobar migraciones:** Solo `ADMIN` o `PROJECT_MANAGER`
- **Gestionar cuadrillas:** Solo `ADMIN` o `PROJECT_MANAGER`
- **Registrar ejecuciones:** Todos los miembros de proyecto

### Verificación en API Routes

Todos los endpoints verifican:
1. ✅ Usuario autenticado
2. ✅ Acceso al proyecto vía RLS
3. ✅ Rol apropiado para la acción

---

## 📊 Monitoreo y Logs

### Logs en Backend

Todos los servicios loguean eventos importantes:

```typescript
console.log('[compareRevisions] Starting comparison...', { oldRevisionId, newRevisionId });
console.log('[approve-migration] Migration complete:', migrationResult);
```

### Auditoría en Base de Datos

- Todas las migraciones quedan registradas en `impact_migration_log`
- Todas las ejecuciones tienen `created_at`, `updated_at`
- Los impactos se pueden persistir en `revision_impacts` (opcional)

---

## 🚨 Troubleshooting

### Problema: "No se encontraron las revisiones"

**Solución:**
- Verificar que ambas revisiones existen en `isometric_revisions`
- Verificar que pertenecen al mismo `isometric_id`
- Verificar que el usuario tiene acceso al proyecto

### Problema: "Error al migrar ejecuciones"

**Solución:**
- Verificar que las tablas `weld_executions` y `bolted_joint_executions` existen
- Verificar que los IDs de welds/joints son correctos
- Revisar logs del servidor para detalles del error

### Problema: "Comparación muy lenta"

**Solución:**
- Verificar que los índices se crearon correctamente
- Para isométricos con >500 welds, considerar paginación
- Revisar queries en el servicio de comparación

---

## 🎯 Próximos Desarrollos Sugeridos

### Corto Plazo
- [ ] Implementar vista detallada de Material Take-Off en el tab
- [ ] Implementar vista detallada de Bolted Joints en el tab
- [ ] Agregar filtros avanzados por spool, tipo, etc.
- [ ] Exportar comparación a PDF/Excel

### Mediano Plazo
- [ ] Componente completo de gestión de Cuadrillas
- [ ] Dashboard de performance de cuadrillas
- [ ] Registro de ejecuciones desde mobile
- [ ] Notificaciones push cuando hay nueva revisión

### Largo Plazo
- [ ] Machine Learning para predecir impactos
- [ ] Sugerencias automáticas de migraciones
- [ ] Integración con sistema ERP
- [ ] Reportes avanzados de productividad

---

## 📞 Soporte y Contacto

Si encuentras bugs o tienes preguntas sobre la implementación:

1. Revisar los logs en consola del navegador
2. Revisar logs del servidor en terminal
3. Consultar la documentación en `.agent/IMPACT_VERIFICATION_PLAN.md`
4. Revisar el código fuente con comentarios detallados

---

## ✅ Checklist de Integración

- [ ] Ejecutar schema SQL en Supabase
- [ ] Verificar que las 6 tablas se crearon
- [ ] Actualizar `RevisionStatus` type
- [ ] Integrar botón "Verificar Impactos" en EngineeringManager
- [ ] Integrar componente `ImpactVerificationView`
- [ ] Probar escenario completo con datos reales
- [ ] Verificar que migraciones se registran correctamente
- [ ] Verificar que estados de revisión se actualizan
- [ ] Probar con diferentes roles de usuario
- [ ] Documentar proceso para el equipo

---

## 🎉 Features Implementados

### ✅ Comparación Automática
- Detecta añadidos, removidos, modificados
- Compara 7 campos críticos en soldaduras
- Calcula deltas de materiales
- Identifica impactos bloqueantes

### ✅ Migración Inteligente
- Pre-selecciona elementos migrables
- Preserva ejecutor, cuadrilla, fecha
- Registra trazabilidad completa
- Actualiza estados automáticamente

### ✅ Interfaz Visual
- Cards de resumen con estadísticas
- Tabs para diferentes tipos de elementos
- Filtros por estado de migración
- Selección masiva de elementos

### ✅ Gestión de Cuadrillas
- CRUD completo de cuadrillas
- Asignación de miembros con roles
- Tracking de performance
- Soft delete y auditoría

---

**¡El módulo está listo para integración! 🚀**

_Última actualización: 2025-12-02 14:00_

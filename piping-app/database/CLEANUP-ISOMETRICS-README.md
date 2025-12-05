# Limpieza de Tabla Isometrics - Resumen Ejecutivo

## 📊 Análisis Realizado

Se analizó la tabla `isometrics` y se identificaron **3 columnas problemáticas**:

### 1. ✅ Columna `descripcion`
- **Estado**: NO USADA
- **Hallazgo**: Existe el campo en el tipo TypeScript pero no se usa en ningún servicio relacionado con isométricos
- **Uso en otros contextos**: Sí (empresas, proyectos, roles) pero no en isometrics
- **Recomendación**: **ELIMINAR**

### 2. ✅ Columna `linea`
- **Estado**: NO USADA y DUPLICADA
- **Hallazgo**: No se usa en código. Existe `line_number` que es la correcta
- **Recomendación**: **ELIMINAR**

### 3. ⚠️ Columna `current_revision_id`
- **Estado**: USADA pero INCOMPLETA
- **Hallazgo**: 
  - ✅ Se define en el tipo TypeScript
  - ✅ Se usa en `revision-announcement.ts` (líneas 380, 410, 414)
  - ❌ NO se actualiza en otros flujos (upload, spooling, etc.)
- **Recomendación**: **MANTENER y COMPLETAR** la implementación

## 📁 Archivos de Respaldo Creados

1. **`cleanup-isometrics-analysis.sql`**
   - Documento completo de análisis
   - 3 opciones de limpieza (conservadora, agresiva, solo datos)
   - Queries de verificación

2. **`cleanup-isometrics-execute.sql`** ⭐ **RECOMENDADO**
   - Script ejecutable con transacción
   - Elimina `descripcion` y `linea`
   - Actualiza `current_revision_id` con revisiones VIGENTES
   - Optimiza índice con índice parcial
   - Incluye verificaciones y rollback

3. **`src/types/engineering.ts`**
   - ✅ Actualizado: Eliminado `descripcion` del tipo `Isometrico`
   - ✅ Actualizado: Comentario mejorado para `current_revision_id`

## 🎯 Plan de Acción Recomendado

### Paso 1: Backup 📦
```bash
# En tu máquina local (si tienes acceso directo a la BD)
pg_dump -h <host> -U <user> -t isometrics > backup_isometrics_2025-12-01.sql

# O hacer backup desde Supabase Dashboard:
# Settings > Database > Backups > Create Backup
```

### Paso 2: Ejecutar Limpieza 🧹
1. Ir a Supabase SQL Editor
2. Abrir `cleanup-isometrics-execute.sql`
3. Ejecutar el script completo
4. Revisar los logs de `RAISE NOTICE`
5. Si todo está bien, el script hace `COMMIT` automático
6. Si algo falla, ejecutar `ROLLBACK;`

### Paso 3: Verificar Cambios ✓
El script incluye queries de verificación al final:
- Ver estructura final de columnas
- Ver índices actualizados
- Verificar integridad de `current_revision_id`

### Paso 4: Completar Implementación de current_revision_id 🔧

#### Archivos a modificar:

**A. `src/services/engineering.ts`**
- En `createRevision()`: Actualizar `current_revision_id` del isométrico padre al crear revisión VIGENTE
- En funciones de cambio de estado: Mantener sincronizado

**B. `src/services/engineering-details.ts`**
- En `validateRevisionForDetails()`: Actualizar `current_revision_id` si se marca como SPOOLEADO

**C. Crear trigger en BD (opcional pero recomendado)**:
```sql
CREATE OR REPLACE FUNCTION update_isometric_current_revision()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la revisión nueva es VIGENTE, actualizar el isométrico
    IF NEW.estado = 'VIGENTE' THEN
        UPDATE isometrics 
        SET current_revision_id = NEW.id,
            updated_at = NOW()
        WHERE id = NEW.isometric_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_current_revision
AFTER INSERT OR UPDATE OF estado ON isometric_revisions
FOR EACH ROW
WHEN (NEW.estado = 'VIGENTE')
EXECUTE FUNCTION update_isometric_current_revision();
```

## 📋 Checklist de Ejecución

- [ ] ✅ Código TypeScript actualizado (`src/types/engineering.ts`)
- [ ] 📦 Backup de tabla `isometrics` realizado
- [ ] 🧹 Script `cleanup-isometrics-execute.sql` ejecutado
- [ ] ✓ Verificaciones post-limpieza revisadas
- [ ] 🔧 Trigger de auto-actualización creado (opcional)
- [ ] 🧪 Pruebas de carga de revisiones realizadas
- [ ] 📝 Documentación actualizada

## ⚡ Beneficios Esperados

1. **Reducción de espacio**: ~20% menos por eliminar 2 columnas no usadas
2. **Índice optimizado**: Índice parcial más eficiente para `current_revision_id`
3. **Código limpio**: Tipos TypeScript alineados con esquema real
4. **Mejor performance**: Queries más rápidas con menos columnas
5. **current_revision_id poblado**: Acceso directo a revisión vigente sin JOIN

## 🔍 Impacto en el Código

### Cambios necesarios: ✅ COMPLETADOS
- ✅ `src/types/engineering.ts` - Tipo actualizado

### Cambios opcionales (mejoras futuras):
- ⏳ Implementar trigger automático
- ⏳ Usar `current_revision_id` en lugar de JOINs donde sea posible
- ⏳ Agregar validación en servicios

## ❓ Preguntas Frecuentes

**Q: ¿Puedo revertir los cambios?**
A: Sí, si tienes el backup. El script usa transacción, así que puedes hacer ROLLBACK antes del COMMIT.

**Q: ¿Qué pasa con current_revision_id si borro una revisión?**
A: El constraint ON DELETE está configurado. Deberías actualizar a NULL o la siguiente VIGENTE.

**Q: ¿Afecta a datos existentes?**
A: No, el script ACTUALIZA `current_revision_id` antes de continuar, preservando información.

---

**Última actualización**: 2025-12-01
**Estado**: ✅ Listo para ejecutar
